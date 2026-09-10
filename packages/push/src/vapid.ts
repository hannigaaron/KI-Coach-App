import { ausB64Url, textZuB64Url, zuB64Url, type Bytes } from "./b64.js";
import { jwkAus } from "./verschluesselung.js";

/**
 * VAPID nach RFC 8292.
 *
 * Der Push Dienst des Browsers nimmt keine anonymen Nachrichten an. Er
 * verlangt einen signierten JWT und den öffentlichen Schlüssel, mit dem sich
 * die Signatur prüfen lässt. Derselbe öffentliche Schlüssel steht im Browser
 * beim Anlegen des Abos. Damit ist sichergestellt, dass nur der Absender
 * schickt, für den der Nutzer zugestimmt hat.
 *
 * Kurve ist P-256, Signatur ES256. Alles andere lehnen die Push Dienste ab.
 */

export interface VapidSchluessel {
  /** Der öffentliche Punkt, unkomprimiert, 65 Byte, base64url. */
  oeffentlich: string;
  /** Der private Skalar, 32 Byte, base64url. */
  privat: string;
}

const ECDSA = { name: "ECDSA", namedCurve: "P-256" } as const;
const SIGNATUR = { name: "ECDSA", hash: "SHA-256" } as const;

export async function vapidSchluesselErzeugen(): Promise<VapidSchluessel> {
  const paar = (await crypto.subtle.generateKey(ECDSA, true, ["sign", "verify"])) as CryptoKeyPair;
  const punkt = new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey)) as Bytes;
  const jwk = (await crypto.subtle.exportKey("jwk", paar.privateKey)) as JsonWebKey;
  return { oeffentlich: zuB64Url(punkt), privat: jwk.d as string };
}

/**
 * Der Authorization Header für eine Anfrage an den Push Dienst.
 *
 * `aud` ist der Ursprung des Endpunkts, nicht der ganze Endpunkt. Steht dort
 * der volle Pfad, lehnt Firefox mit 401 ab.
 * Die Laufzeit liegt bei zwölf Stunden. RFC 8292 erlaubt höchstens 24, und
 * mehrere Dienste weisen alles darüber zurück.
 */
export async function vapidHeader(params: {
  endpunkt: string;
  schluessel: VapidSchluessel;
  kontakt: string;
  jetzt?: number;
}): Promise<string> {
  const jetzt = params.jetzt ?? Math.floor(Date.now() / 1000);
  const aud = new URL(params.endpunkt).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp: jetzt + 12 * 60 * 60, sub: params.kontakt };
  const daten = `${textZuB64Url(JSON.stringify(header))}.${textZuB64Url(JSON.stringify(payload))}`;

  // WebCrypto gibt bei ECDSA r und s als je 32 Byte aus, also genau das
  // Format, das RFC 7515 für ES256 verlangt. Die DER Kodierung, die manche
  // Bibliotheken liefern, weisen die Push Dienste zurück.
  const key = await privatenSchluesselLesen(params.schluessel);
  const signatur = new Uint8Array(await crypto.subtle.sign(SIGNATUR, key, new TextEncoder().encode(daten))) as Bytes;
  return `vapid t=${daten}.${zuB64Url(signatur)}, k=${params.schluessel.oeffentlich}`;
}

/**
 * Prüft ein Schlüsselpaar auf Form und Zusammengehörigkeit.
 *
 * Zwei Wege, weil die Laufzeiten sich unterscheiden. Node weist ein JWK, in
 * dem d nicht zum Punkt aus x und y passt, schon beim Import zurück. Ob jede
 * andere Laufzeit das auch tut, ist nicht zugesichert, deshalb wird danach
 * signiert und gegen den öffentlichen Schlüssel nachgeprüft. Passt d nicht,
 * scheitert spätestens diese Prüfung.
 *
 * Beide Fälle ergeben dieselbe Meldung, weil sich am Fehler beim Import nicht
 * ablesen lässt, welcher der beiden vorliegt. Eine Meldung, die sich auf einen
 * festlegt, wäre in der Hälfte der Fälle falsch.
 */
export async function vapidPruefen(schluessel: VapidSchluessel): Promise<void> {
  const pub = ausB64Url(schluessel.oeffentlich);
  const priv = ausB64Url(schluessel.privat);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("Der öffentliche VAPID Schlüssel muss 65 Byte lang sein und mit 0x04 beginnen.");
  }
  if (priv.length !== 32) throw new Error("Der private VAPID Schlüssel muss 32 Byte lang sein.");

  const probe = new TextEncoder().encode("daevo push") as Bytes;
  let passt = false;
  try {
    const signatur = await crypto.subtle.sign(SIGNATUR, await privatenSchluesselLesen(schluessel), probe);
    const oeffentlich = await crypto.subtle.importKey("raw", pub, ECDSA, false, ["verify"]);
    passt = await crypto.subtle.verify(SIGNATUR, oeffentlich, signatur, probe);
  } catch {
    passt = false;
  }
  if (!passt) {
    throw new Error(
      "Öffentlicher und privater VAPID Schlüssel gehören nicht zusammen, " +
        "oder der private ist kein gültiger Wert auf der Kurve P-256.",
    );
  }
}

function privatenSchluesselLesen(schluessel: VapidSchluessel): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { ...jwkAus(ausB64Url(schluessel.oeffentlich), ausB64Url(schluessel.privat)), key_ops: ["sign"] },
    ECDSA,
    false,
    ["sign"],
  );
}
