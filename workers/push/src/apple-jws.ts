/**
 * Prüft signierte Daten aus dem App Store, JWS mit Zertifikatskette.
 *
 * StoreKit 2 liefert jeden Kauf als JWS. Im Kopf steht die Kette aus drei
 * Zertifikaten: das Blatt, mit dem signiert wurde, das Zwischenzertifikat von
 * Apple und die Wurzel. Geprüft wird hier:
 *
 * 1. Die Wurzel ist byteweise die Apple Root CA G3, festgelegt über ihren
 *    SHA-256 Fingerabdruck. Abgerufen und nachgerechnet am 26. Oktober 2026
 *    von apple.com/certificateauthority.
 * 2. Die Wurzel hat das Zwischenzertifikat signiert, das Zwischenzertifikat
 *    das Blatt.
 * 3. Das Blatt trägt die Kennung von Apple für den App Store Empfang
 *    (1.2.840.113635.100.6.11.1), das Zwischenzertifikat die für die
 *    Entwicklerzertifikate (1.2.840.113635.100.6.2.1).
 * 4. Das Blatt hat die JWS signiert.
 *
 * Ohne diese Prüfung könnte jeder einen Kauf behaupten, denn den Inhalt
 * einer JWS kann jeder schreiben. Ein Paket dafür wäre die erste
 * Abhängigkeit des Workers, deshalb ein kleiner DER Leser, der genau das
 * liest, was die Prüfung braucht.
 */

export const APPLE_ROOT_G3_SHA256 = "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179";

const OID_P256 = "2a8648ce3d030107";
const OID_P384 = "2b81040022";
const OID_ECDSA_SHA256 = "2a8648ce3d040302";
const OID_ECDSA_SHA384 = "2a8648ce3d040303";
const OID_APPSTORE_BLATT = "2a864886f76364060b01";
const OID_APPLE_ZWISCHEN = "2a864886f76364060201";

interface Tlv { tag: number; start: number; inhalt: number; ende: number }

function lies(b: Uint8Array, pos: number): Tlv {
  const tag = b[pos]!;
  let len = b[pos + 1]!;
  let kopf = 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[pos + 2 + i]!;
    kopf += n;
  }
  const ende = pos + kopf + len;
  if (ende > b.length) throw new Error("DER zu kurz.");
  return { tag, start: pos, inhalt: pos + kopf, ende };
}

function kinder(b: Uint8Array, t: Tlv): Tlv[] {
  const aus: Tlv[] = [];
  for (let p = t.inhalt; p < t.ende; ) {
    const k = lies(b, p);
    aus.push(k);
    p = k.ende;
  }
  return aus;
}

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const enthaelt = (b: Uint8Array, nadelHex: string) => hex(b).includes(nadelHex);

interface Zertifikat { roh: Uint8Array; tbs: Uint8Array; spki: Uint8Array; kurve: "P-256" | "P-384"; hash: "SHA-256" | "SHA-384"; signatur: Uint8Array }

export function zertifikatLesen(roh: Uint8Array): Zertifikat {
  const cert = lies(roh, 0);
  const [tbs, alg, sig] = kinder(roh, cert);
  if (!tbs || !alg || !sig) throw new Error("Zertifikat unvollständig.");
  const felder = kinder(roh, tbs);
  // Mit Version steht vorn [0], dann Serie, Verfahren, Aussteller, Gültigkeit, Inhaber, Schlüssel.
  const versatz = felder[0]!.tag === 0xa0 ? 1 : 0;
  const spki = felder[versatz + 5]!;
  const spkiRoh = roh.slice(spki.start, spki.ende);
  const kurve = enthaelt(spkiRoh, OID_P384) ? "P-384" : enthaelt(spkiRoh, OID_P256) ? "P-256" : null;
  if (!kurve) throw new Error("Unbekannte Kurve.");
  const algRoh = roh.slice(alg.start, alg.ende);
  const hash = enthaelt(algRoh, OID_ECDSA_SHA384) ? "SHA-384" : enthaelt(algRoh, OID_ECDSA_SHA256) ? "SHA-256" : null;
  if (!hash) throw new Error("Unbekanntes Signaturverfahren.");
  // BIT STRING: das erste Byte zählt ungenutzte Bits und ist hier 0.
  return { roh, tbs: roh.slice(tbs.start, tbs.ende), spki: spkiRoh, kurve, hash, signatur: roh.slice(sig.inhalt + 1, sig.ende) };
}

/** ECDSA Signatur von DER (SEQUENCE aus r und s) in r||s fester Länge, wie WebCrypto sie will. */
export function derZuRoh(der: Uint8Array, laenge: number): Uint8Array {
  const seq = lies(der, 0);
  const [r, s] = kinder(der, seq);
  const aus = new Uint8Array(laenge * 2);
  for (const [i, t] of [r!, s!].entries()) {
    let wert = der.slice(t.inhalt, t.ende);
    while (wert.length > laenge && wert[0] === 0) wert = wert.slice(1);
    aus.set(wert, i * laenge + (laenge - wert.length));
  }
  return aus;
}

async function schluessel(z: Zertifikat): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", z.spki as Uint8Array<ArrayBuffer>, { name: "ECDSA", namedCurve: z.kurve }, false, ["verify"]);
}

async function signiertVon(kind: Zertifikat, eltern: Zertifikat): Promise<boolean> {
  const laenge = eltern.kurve === "P-384" ? 48 : 32;
  return crypto.subtle.verify(
    { name: "ECDSA", hash: kind.hash },
    await schluessel(eltern),
    derZuRoh(kind.signatur, laenge) as Uint8Array<ArrayBuffer>,
    kind.tbs as Uint8Array<ArrayBuffer>,
  );
}

const b64 = (t: string) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
const b64url = (t: string) => b64(t.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(t.length / 4) * 4, "="));

/**
 * Prüft eine JWS aus dem App Store und gibt ihren Inhalt zurück.
 * `wurzel` lässt sich für Tests ersetzen, im Betrieb gilt Apple Root CA G3.
 */
export async function appleJwsPruefen(
  jws: string,
  { wurzel = APPLE_ROOT_G3_SHA256, oidsPruefen = true }: { wurzel?: string; oidsPruefen?: boolean } = {},
): Promise<{ inhalt: Record<string, unknown> } | { fehler: string }> {
  try {
    const teile = String(jws || "").split(".");
    if (teile.length !== 3) return { fehler: "Keine JWS." };
    const kopf = JSON.parse(new TextDecoder().decode(b64url(teile[0]!))) as { alg?: string; x5c?: string[] };
    if (kopf.alg !== "ES256" || !Array.isArray(kopf.x5c) || kopf.x5c.length !== 3) return { fehler: "Kopf unvollständig." };
    const [blatt, zwischen, wurzelZ] = kopf.x5c.map((c) => zertifikatLesen(b64(c)));
    const fingerabdruck = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", wurzelZ!.roh as Uint8Array<ArrayBuffer>)));
    if (fingerabdruck !== wurzel) return { fehler: "Die Wurzel ist nicht die von Apple." };
    if (oidsPruefen && (!enthaelt(blatt!.tbs, OID_APPSTORE_BLATT) || !enthaelt(zwischen!.tbs, OID_APPLE_ZWISCHEN))) {
      return { fehler: "Das Zertifikat ist nicht für den App Store." };
    }
    if (!(await signiertVon(zwischen!, wurzelZ!)) || !(await signiertVon(blatt!, zwischen!))) {
      return { fehler: "Die Zertifikatskette ist nicht gültig." };
    }
    const echt = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      await schluessel(blatt!),
      b64url(teile[2]!) as Uint8Array<ArrayBuffer>,
      new TextEncoder().encode(`${teile[0]}.${teile[1]}`),
    );
    if (!echt) return { fehler: "Signatur ungültig." };
    return { inhalt: JSON.parse(new TextDecoder().decode(b64url(teile[1]!))) as Record<string, unknown> };
  } catch (e) {
    return { fehler: `Nicht lesbar: ${e instanceof Error ? e.message : String(e)}` };
  }
}
