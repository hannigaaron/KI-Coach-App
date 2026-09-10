import { ausB64Url, verbinde, zuB64Url, type Bytes } from "./b64.js";

/**
 * Die Verschlüsselung der Push Nutzlast.
 *
 * RFC 8291 für den Schlüsselaustausch, RFC 8188 für das Format des Körpers.
 * Der Push Dienst sieht den Inhalt nie: der Schlüssel entsteht aus dem
 * öffentlichen Schlüssel des Browsers und einem Geheimnis, das nur Browser
 * und Absender kennen. Genau deshalb lässt sich Push nicht ohne diesen
 * Schritt verschicken, auch nicht für eine Zeile Text.
 *
 * Gebaut auf WebCrypto statt auf node:crypto. Damit läuft dieselbe
 * Implementierung in Node, in einem Cloudflare Worker und im Browser. Alles
 * Nötige ist überall vorhanden: ECDH auf P-256, HMAC, AES-GCM.
 */

export interface PushAbo {
  endpoint: string;
  keys: {
    /** Der öffentliche Schlüssel des Browsers, unkomprimiert, 65 Byte, base64url. */
    p256dh: string;
    /** Das gemeinsame Geheimnis, 16 Byte, base64url. */
    auth: string;
  };
}

/** Die Satzgrösse aus RFC 8188. 4096 nehmen alle Push Dienste an. */
const RECORD_SIZE = 4096;

const KURVE = { name: "ECDH", namedCurve: "P-256" } as const;

/**
 * Verschlüsselt die Nutzlast für ein Abo.
 *
 * Das Ergebnis ist der komplette Körper der Anfrage im Format aes128gcm:
 * Salt, Satzgrösse, Länge des Schlüssels, der Schlüssel selbst, dann der
 * verschlüsselte Teil.
 */
export async function nutzlastVerschluesseln(
  abo: PushAbo,
  nutzlast: string,
  /**
   * Salz und flüchtiger Schlüssel des Absenders. Beides entsteht sonst
   * zufällig. Vorgeben lässt es sich nur, damit der Testvektor aus RFC 8291
   * Abschnitt 5 nachgerechnet werden kann. Im Betrieb bleibt das Feld leer.
   */
  fuerTest?: { salz: Bytes; asPrivat: Bytes; asOeffentlich: Bytes },
): Promise<Bytes> {
  const uaPublic = ausB64Url(abo.keys.p256dh);
  const authSecret = ausB64Url(abo.keys.auth);
  if (uaPublic.length !== 65) throw new Error("p256dh muss 65 Byte lang sein.");
  if (authSecret.length !== 16) throw new Error("auth muss 16 Byte lang sein.");

  const { asPublic, gemeinsam } = fuerTest
    ? await gemeinsamesGeheimnisAusTest(fuerTest, uaPublic)
    : await gemeinsamesGeheimnis(uaPublic);

  // Erst aus dem gemeinsamen Geheimnis und dem auth Geheimnis das
  // Ausgangsmaterial, dabei gehen beide öffentlichen Schlüssel mit ein.
  // Ohne sie liesse sich eine Nachricht auf ein anderes Abo umbiegen.
  const info = verbinde(new TextEncoder().encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, gemeinsam, info, 32);

  const salt = fuerTest?.salz ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: aes128gcm\0") as Bytes, 16);
  const nonce = await hkdf(salt, ikm, new TextEncoder().encode("Content-Encoding: nonce\0") as Bytes, 12);

  const klartext = new TextEncoder().encode(nutzlast) as Bytes;
  const nutzMax = RECORD_SIZE - 16 - 1;
  if (klartext.length > nutzMax) {
    throw new Error(`Nutzlast zu gross: ${klartext.length} Byte, erlaubt sind ${nutzMax}.`);
  }

  // 0x02 schliesst den letzten Satz ab. Ohne dieses Byte verwirft der Browser
  // die Nachricht ohne Fehlermeldung.
  const mitEnde = verbinde(klartext, new Uint8Array([0x02]));
  const schluessel = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const geheim = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, schluessel, mitEnde),
  ) as Bytes;

  const kopf = new Uint8Array(5);
  new DataView(kopf.buffer).setUint32(0, RECORD_SIZE);
  kopf[4] = asPublic.length;
  return verbinde(salt, kopf, asPublic, geheim);
}

async function gemeinsamesGeheimnis(uaPublic: Bytes) {
  const paar = (await crypto.subtle.generateKey(KURVE, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", paar.publicKey)) as Bytes;
  return { asPublic, gemeinsam: await ableiten(paar.privateKey, uaPublic) };
}

async function gemeinsamesGeheimnisAusTest(
  test: { asPrivat: Bytes; asOeffentlich: Bytes },
  uaPublic: Bytes,
) {
  const privat = await crypto.subtle.importKey("jwk", jwkAus(test.asOeffentlich, test.asPrivat), KURVE, false, [
    "deriveBits",
  ]);
  return { asPublic: test.asOeffentlich, gemeinsam: await ableiten(privat, uaPublic) };
}

async function ableiten(privat: CryptoKey, uaPublic: Bytes): Promise<Bytes> {
  const fremd = await crypto.subtle.importKey("raw", uaPublic, KURVE, false, []);
  // deriveBits mit ECDH liefert genau die X Koordinate des gemeinsamen
  // Punktes, also das, was RFC 8291 als ecdh_secret bezeichnet.
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: fremd }, privat, 256)) as Bytes;
}

/** Ein JWK für P-256 aus dem unkomprimierten Punkt und dem privaten Skalar. */
export function jwkAus(punkt: Bytes, privat?: Bytes): JsonWebKey {
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: zuB64Url(punkt.subarray(1, 33)),
    y: zuB64Url(punkt.subarray(33, 65)),
    ext: true,
  };
  if (privat) jwk.d = zuB64Url(privat);
  return jwk;
}

/** HKDF nach RFC 5869, auf eine Runde beschränkt. Mehr braucht Web Push nicht. */
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, laenge: number): Promise<Bytes> {
  if (laenge > 32) throw new Error("HKDF hier nur bis 32 Byte.");
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, verbinde(info, new Uint8Array([0x01])));
  return okm.subarray(0, laenge) as Bytes;
}

async function hmac(schluessel: Bytes, daten: Bytes): Promise<Bytes> {
  const key = await crypto.subtle.importKey("raw", schluessel, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, daten)) as Bytes;
}
