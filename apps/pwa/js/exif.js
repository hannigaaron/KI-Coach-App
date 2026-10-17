/**
 * Aufnahmezeit aus einem JPEG.
 *
 * Wer ein Foto aus der Mediathek nachträgt, hat meistens Stunden vorher
 * gegessen. Ohne die Aufnahmezeit landet das Mittagessen um 21 Uhr im Tag,
 * und alles, was an der Uhrzeit hängt, rechnet falsch: welche Mahlzeit schon
 * gegessen ist, der Abstand zur letzten Mahlzeit beim Energiecheck, die
 * Aufteilung des Rests.
 *
 * Gelesen wird nur DateTimeOriginal (0x9003) und ersatzweise DateTime
 * (0x0132), nach der Exif Spezifikation 2.32 der CIPA, Abschnitt 4.6. Beide
 * tragen die Wandzeit der Kamera ohne Zone, und genau die ist gemeint: wer um
 * 13 Uhr fotografiert, hat um 13 Uhr gegessen.
 *
 * Nicht jedes Bild trägt die Zeit. Ein Screenshot nicht, ein weitergeleitetes
 * Bild aus einem Messenger meist auch nicht. Dann kommt `null`, und die App
 * nimmt die aktuelle Zeit, die der Nutzer im Blatt ändern kann. Eine geratene
 * Zeit wäre schlimmer als die jetzige, denn die jetzige sieht man.
 *
 * Kein Zugriff auf `document` oder `window`, damit der Test ohne Browser läuft.
 */

/** So weit wird gelesen. Der Exif Block steht am Anfang und ist höchstens 64 KB gross. */
export const EXIF_LESEN_BYTES = 128 * 1024;

/**
 * @param {ArrayBuffer|Uint8Array} puffer Anfang der Datei
 * @returns {{ tag: string, uhrzeit: string } | null}
 */
export function aufnahmezeit(puffer) {
  const bytes = puffer instanceof Uint8Array ? puffer : new Uint8Array(puffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return null;

  let pos = 2;
  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return null;
    const marker = bytes[pos + 1];
    // Start of Scan: danach kommen nur noch Bilddaten, kein Exif mehr.
    if (marker === 0xda || marker === 0xd9) return null;
    const laenge = view.getUint16(pos + 2);
    if (laenge < 2) return null;
    if (marker === 0xe1 && kennung(bytes, pos + 4) === "Exif\0\0") {
      return ausTiff(view, pos + 10, Math.min(bytes.length, pos + 2 + laenge));
    }
    pos += 2 + laenge;
  }
  return null;
}

function kennung(bytes, start) {
  let s = "";
  for (let i = 0; i < 6 && start + i < bytes.length; i++) s += String.fromCharCode(bytes[start + i]);
  return s;
}

function ausTiff(view, basis, ende) {
  if (basis + 8 > ende) return null;
  const ordnung = view.getUint16(basis);
  if (ordnung !== 0x4949 && ordnung !== 0x4d4d) return null;
  const klein = ordnung === 0x4949;
  const u16 = (o) => view.getUint16(basis + o, klein);
  const u32 = (o) => view.getUint32(basis + o, klein);
  if (u16(2) !== 42) return null;

  const ifd0 = eintraege(view, basis, ende, u32(4), klein);
  if (!ifd0) return null;
  let zeit = null;
  const exifZeiger = ifd0.get(0x8769);
  if (exifZeiger) {
    const exif = eintraege(view, basis, ende, exifZeiger.wert, klein);
    zeit = exif?.get(0x9003) ?? null;
  }
  zeit = zeit ?? ifd0.get(0x0132) ?? null;
  if (!zeit || zeit.typ !== 2) return null;
  return zeitLesen(text(view, basis, ende, zeit));
}

/** Liest ein IFD als Karte von Tag auf Typ, Anzahl und Wert oder Versatz. */
function eintraege(view, basis, ende, versatz, klein) {
  const start = basis + versatz;
  if (versatz <= 0 || start + 2 > ende) return null;
  const anzahl = view.getUint16(start, klein);
  const karte = new Map();
  for (let i = 0; i < anzahl; i++) {
    const p = start + 2 + i * 12;
    if (p + 12 > ende) break;
    karte.set(view.getUint16(p, klein), {
      typ: view.getUint16(p + 2, klein),
      anzahl: view.getUint32(p + 4, klein),
      wert: view.getUint32(p + 8, klein),
      feld: p + 8,
    });
  }
  return karte;
}

function text(view, basis, ende, eintrag) {
  // Bis vier Zeichen stehen im Feld selbst, längere hinter dem Versatz.
  const start = eintrag.anzahl <= 4 ? eintrag.feld : basis + eintrag.wert;
  let s = "";
  for (let i = 0; i < eintrag.anzahl && start + i < ende; i++) {
    const c = view.getUint8(start + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/** "2026:10:17 13:05:42" wird zu Tag und Uhrzeit. Alles andere ist keine Zeit. */
export function zeitLesen(s) {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s || "").trim());
  if (!m) return null;
  const [, j, mo, t, h, mi] = m.map(Number);
  if (j < 2000 || mo < 1 || mo > 12 || t < 1 || t > 31 || h > 23 || mi > 59) return null;
  return {
    tag: `${m[1]}-${m[2]}-${m[3]}`,
    uhrzeit: `${m[4]}:${m[5]}`,
  };
}

/**
 * Die Zeit, mit der das Blatt startet.
 *
 * Die Aufnahmezeit zählt nur, wenn sie in den letzten zwei Tagen liegt und
 * nicht in der Zukunft. Ein Foto von letzter Woche ist fast nie ein
 * Nachtrag, sondern ein altes Bild, das jemand als Beispiel wählt, und eine
 * Zeit in der Zukunft heisst, dass die Uhr der Kamera falsch geht. Weiter
 * zurück bietet das Blatt auch nicht an: ein Tag, den niemand mehr genau
 * weiss, wird durch ein Foto nicht genauer.
 *
 * @param {{ tag: string, uhrzeit: string } | null} exif
 * @param {Date} jetzt
 * @returns {{ tag: string, uhrzeit: string, ausFoto: boolean }}
 */
export function zeitVorschlag(exif, jetzt = new Date()) {
  const heute = isoTag(jetzt);
  const jetztZeit = `${zwei(jetzt.getHours())}:${zwei(jetzt.getMinutes())}`;
  if (exif && NACHTRAG_TAGE.includes(tageZurueck(exif.tag, heute))) {
    const zukunft = exif.tag === heute && exif.uhrzeit > jetztZeit;
    if (!zukunft) return { ...exif, ausFoto: true };
  }
  return { tag: heute, uhrzeit: jetztZeit, ausFoto: false };
}

/** Heute, gestern, vorgestern. */
export const NACHTRAG_TAGE = [0, 1, 2];

/** Wie viele Tage `tag` vor `heute` liegt, beide als JJJJ-MM-TT. */
export function tageZurueck(tag, heute) {
  const a = Date.parse(`${tag}T12:00:00Z`);
  const b = Date.parse(`${heute}T12:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  return Math.round((b - a) / 86400000);
}

/** Der Tag `n` Tage vor `heute`. */
export function tagVor(heute, n) {
  const d = new Date(`${heute}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function isoTag(d) {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

function zwei(n) {
  return String(n).padStart(2, "0");
}
