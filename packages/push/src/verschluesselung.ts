import { createCipheriv, createECDH, createHmac, randomBytes } from "node:crypto";

/**
 * Die Verschlüsselung der Push Nutzlast.
 *
 * RFC 8291 für den Schlüsselaustausch, RFC 8188 für das Format des Körpers.
 * Der Push Dienst sieht den Inhalt nie: der Schlüssel entsteht aus dem
 * öffentlichen Schlüssel des Browsers und einem Geheimnis, das nur Browser
 * und Absender kennen. Genau deshalb lässt sich Push nicht ohne diesen
 * Schritt verschicken, auch nicht für eine Zeile Text.
 *
 * Ohne Abhängigkeit gebaut. Alles Nötige steht in node:crypto.
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

/**
 * Verschlüsselt die Nutzlast für ein Abo.
 *
 * Das Ergebnis ist der komplette Körper der Anfrage im Format aes128gcm:
 * Salt, Satzgrösse, Länge des Schlüssels, der Schlüssel selbst, dann der
 * verschlüsselte Teil.
 */
export function nutzlastVerschluesseln(
  abo: PushAbo,
  nutzlast: string,
  /**
   * Salz und flüchtiger Schlüssel des Absenders. Beides entsteht sonst
   * zufällig. Vorgeben lässt es sich nur, damit der Testvektor aus RFC 8291
   * Abschnitt 5 nachgerechnet werden kann. Im Betrieb bleibt das Feld leer.
   */
  fuerTest?: { salz: Buffer; asPrivat: Buffer },
): Buffer {
  const uaPublic = Buffer.from(abo.keys.p256dh, "base64url");
  const authSecret = Buffer.from(abo.keys.auth, "base64url");
  if (uaPublic.length !== 65) throw new Error("p256dh muss 65 Byte lang sein.");
  if (authSecret.length !== 16) throw new Error("auth muss 16 Byte lang sein.");

  const ecdh = createECDH("prime256v1");
  if (fuerTest) ecdh.setPrivateKey(fuerTest.asPrivat);
  else ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey();
  const gemeinsam = ecdh.computeSecret(uaPublic);

  // Erst aus dem gemeinsamen Geheimnis und dem auth Geheimnis das
  // Ausgangsmaterial, dabei gehen beide öffentlichen Schlüssel mit ein.
  // Ohne sie liesse sich eine Nachricht auf ein anderes Abo umbiegen.
  const info = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    uaPublic,
    asPublic,
  ]);
  const ikm = hkdf(authSecret, gemeinsam, info, 32);

  const salt = fuerTest?.salz ?? randomBytes(16);
  const cek = hkdf(salt, ikm, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16);
  const nonce = hkdf(salt, ikm, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12);

  const klartext = Buffer.from(nutzlast, "utf8");
  const nutzMax = RECORD_SIZE - 16 - 1;
  if (klartext.length > nutzMax) {
    throw new Error(`Nutzlast zu gross: ${klartext.length} Byte, erlaubt sind ${nutzMax}.`);
  }

  // 0x02 schliesst den letzten Satz ab. Ohne dieses Byte verwirft der Browser
  // die Nachricht ohne Fehlermeldung.
  const mitEnde = Buffer.concat([klartext, Buffer.from([0x02])]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const geheim = Buffer.concat([cipher.update(mitEnde), cipher.final(), cipher.getAuthTag()]);

  const kopf = Buffer.alloc(5);
  kopf.writeUInt32BE(RECORD_SIZE, 0);
  kopf.writeUInt8(asPublic.length, 4);
  return Buffer.concat([salt, kopf, asPublic, geheim]);
}

/** HKDF nach RFC 5869, auf eine Runde beschränkt. Mehr braucht Web Push nicht. */
function hkdf(salt: Buffer, ikm: Buffer, info: Buffer, laenge: number): Buffer {
  if (laenge > 32) throw new Error("HKDF hier nur bis 32 Byte.");
  const prk = createHmac("sha256", salt).update(ikm).digest();
  const okm = createHmac("sha256", prk).update(info).update(Buffer.from([0x01])).digest();
  return okm.subarray(0, laenge);
}
