import { createECDH, createPrivateKey, generateKeyPairSync, sign } from "node:crypto";

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

export function vapidSchluesselErzeugen(): VapidSchluessel {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = privateKey.export({ format: "jwk" }) as { x: string; y: string; d: string };
  return { oeffentlich: punktAusJwk(jwk.x, jwk.y), privat: jwk.d };
}

/**
 * Der Authorization Header für eine Anfrage an den Push Dienst.
 *
 * `aud` ist der Ursprung des Endpunkts, nicht der ganze Endpunkt. Steht dort
 * der volle Pfad, lehnt Firefox mit 401 ab.
 * Die Laufzeit liegt bei zwölf Stunden. RFC 8292 erlaubt höchstens 24, und
 * mehrere Dienste weisen alles darüber zurück.
 */
export function vapidHeader(params: { endpunkt: string; schluessel: VapidSchluessel; kontakt: string; jetzt?: number }): string {
  const jetzt = params.jetzt ?? Math.floor(Date.now() / 1000);
  const aud = new URL(params.endpunkt).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp: jetzt + 12 * 60 * 60, sub: params.kontakt };
  const daten = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  // ieee-p1363 liefert r und s als je 32 Byte. Die DER Kodierung, die Node
  // sonst ausgibt, weisen die Push Dienste zurück.
  const signatur = sign("sha256", Buffer.from(daten), {
    key: privatenSchluesselLesen(params.schluessel),
    dsaEncoding: "ieee-p1363",
  });
  const jwt = `${daten}.${signatur.toString("base64url")}`;
  return `vapid t=${jwt}, k=${params.schluessel.oeffentlich}`;
}

/** Prüft ein Schlüsselpaar auf die richtige Länge und auf Zusammengehörigkeit. */
export function vapidPruefen(schluessel: VapidSchluessel): void {
  const pub = Buffer.from(schluessel.oeffentlich, "base64url");
  const priv = Buffer.from(schluessel.privat, "base64url");
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("Der öffentliche VAPID Schlüssel muss 65 Byte lang sein und mit 0x04 beginnen.");
  }
  if (priv.length !== 32) throw new Error("Der private VAPID Schlüssel muss 32 Byte lang sein.");
  // Der Punkt wird aus dem privaten Skalar neu gerechnet. Ein JWK mit x, y
  // und d nimmt Node hin, ohne die drei gegeneinander zu prüfen: dort käme
  // immer der mitgegebene Punkt zurück und der Vergleich ginge nie schief.
  const ecdh = createECDH("prime256v1");
  try {
    ecdh.setPrivateKey(priv);
  } catch {
    throw new Error("Der private VAPID Schlüssel ist kein gültiger Wert auf der Kurve P-256.");
  }
  if (!ecdh.getPublicKey().equals(pub)) {
    throw new Error("Öffentlicher und privater VAPID Schlüssel gehören nicht zusammen.");
  }
}

function privatenSchluesselLesen(schluessel: VapidSchluessel) {
  const pub = Buffer.from(schluessel.oeffentlich, "base64url");
  return createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: pub.subarray(1, 33).toString("base64url"),
      y: pub.subarray(33, 65).toString("base64url"),
      d: schluessel.privat,
    },
    format: "jwk",
  });
}

function punktAusJwk(x: string, y: string): string {
  return Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(x, "base64url"),
    Buffer.from(y, "base64url"),
  ]).toString("base64url");
}

function b64url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}
