/**
 * Liest EAN-13, EAN-8 und UPC-A aus einem Kamerabild, ohne Bibliothek.
 *
 * Der Scanner benutzte nur `BarcodeDetector`. Den gibt es auf dem iPhone
 * weder in Safari noch in der Web Ansicht der App, und dort passierte beim
 * Tippen auf den Scanner im Betrieb schlicht nichts. Eine Kamerabibliothek
 * wäre die erste Laufzeitabhängigkeit der App. Ein Strichcode auf einer
 * Lebensmittelpackung ist dagegen ein einfaches Format: 95 Module, schwarz
 * und weiss, und jede Ziffer sind vier Breiten.
 *
 * Gelesen wird zeilenweise. Eine Zeile Grauwerte wird an einer Schwelle in
 * Striche und Lücken geteilt, und jede Folge aus Breiten wird gegen die
 * Muster der Norm (ISO/IEC 15420) verglichen, auch rückwärts, falls die
 * Packung kopfüber gehalten wird. Ein Ergebnis zählt nur mit gültiger
 * Prüfziffer, und `eanAusBild` verlangt, dass zwei Zeilen dasselbe lesen:
 * ein falsch gelesener Barcode bringt ein fremdes Produkt in den Tag, und
 * das ist schlimmer als ein zweiter Versuch.
 *
 * Kein `document`, kein `window`: die Tests laufen ohne Browser.
 */

// Breiten je Ziffer im Zeichensatz L, als Lücke, Strich, Lücke, Strich.
// Satz R hat dieselben Breiten mit vertauschten Farben, Satz G ist L rückwärts.
const L = ["3211", "2221", "2122", "1411", "1132", "1231", "1114", "1312", "1213", "3112"].map((s) => [...s].map(Number));
const G = L.map((m) => [...m].reverse());
// Welche der ersten sechs Ziffern im Satz G stehen, kodiert die erste Ziffer.
const PARITAET = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

/** Prüfziffer nach GS1: von rechts abwechselnd mal 3 und mal 1. */
export function pruefzifferStimmt(code) {
  if (!/^\d{8}$|^\d{12,13}$/.test(code)) return false;
  const z = [...code].map(Number);
  const pruef = z.pop();
  const summe = z.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (summe % 10)) % 10 === pruef;
}

/** Die passende Ziffer zu vier Breiten, mit dem Fehler des besten Musters. */
function ziffer(breiten, saetze) {
  const summe = breiten[0] + breiten[1] + breiten[2] + breiten[3];
  const norm = breiten.map((b) => (b * 7) / summe);
  let best = null;
  for (const [name, satz] of saetze) {
    for (let d = 0; d < 10; d++) {
      const m = satz[d];
      const fehler = Math.abs(norm[0] - m[0]) + Math.abs(norm[1] - m[1]) + Math.abs(norm[2] - m[2]) + Math.abs(norm[3] - m[3]);
      if (!best || fehler < best.fehler) best = { d, satz: name, fehler };
    }
  }
  return best;
}

// Ab dieser Summe der Abweichungen in Modulen gilt eine Ziffer als unlesbar.
const GRENZE = 1.6;

/** Prüft, ob die Läufe ab `i` wie ein Randmuster aus Breiten 1:1:1 aussehen. */
function rand(laeufe, i, anzahl, modul) {
  for (let k = 0; k < anzahl; k++) {
    const b = laeufe[i + k] / modul;
    if (b < 0.3 || b > 2.2) return false;
  }
  return true;
}

function ean13(laeufe, i) {
  if (i + 59 > laeufe.length) return null;
  let breite = 0;
  for (let k = 0; k < 59; k++) breite += laeufe[i + k];
  const modul = breite / 95;
  if (!rand(laeufe, i, 3, modul) || !rand(laeufe, i + 27, 5, modul) || !rand(laeufe, i + 56, 3, modul)) return null;
  // Vor dem Code muss eine helle Ruhezone liegen, sonst ist es die Mitte
  // eines anderen Musters.
  if (i > 0 && laeufe[i - 1] < modul * 3) return null;
  let paritaet = "";
  const ziffern = [];
  for (let n = 0; n < 6; n++) {
    const z = ziffer(laeufe.slice(i + 3 + n * 4, i + 7 + n * 4), [["L", L], ["G", G]]);
    if (z.fehler > GRENZE) return null;
    paritaet += z.satz;
    ziffern.push(z.d);
  }
  for (let n = 0; n < 6; n++) {
    const z = ziffer(laeufe.slice(i + 32 + n * 4, i + 36 + n * 4), [["R", L]]);
    if (z.fehler > GRENZE) return null;
    ziffern.push(z.d);
  }
  const erste = PARITAET.indexOf(paritaet);
  if (erste < 0) return null;
  const code = `${erste}${ziffern.join("")}`;
  return pruefzifferStimmt(code) ? code : null;
}

function ean8(laeufe, i) {
  if (i + 43 > laeufe.length) return null;
  let breite = 0;
  for (let k = 0; k < 43; k++) breite += laeufe[i + k];
  const modul = breite / 67;
  if (!rand(laeufe, i, 3, modul) || !rand(laeufe, i + 19, 5, modul) || !rand(laeufe, i + 40, 3, modul)) return null;
  if (i > 0 && laeufe[i - 1] < modul * 3) return null;
  const ziffern = [];
  for (let n = 0; n < 8; n++) {
    const start = n < 4 ? i + 3 + n * 4 : i + 24 + (n - 4) * 4;
    const z = ziffer(laeufe.slice(start, start + 4), [["L", L]]);
    if (z.fehler > GRENZE) return null;
    ziffern.push(z.d);
  }
  const code = ziffern.join("");
  return pruefzifferStimmt(code) ? code : null;
}

/**
 * Teilt eine Zeile Grauwerte in Läufe. Der erste Lauf ist immer hell, damit
 * jeder Strich auf einem geraden Index beginnt, wenn man ab 1 zählt.
 */
export function laeufeAus(zeile) {
  const n = zeile.length;
  if (n < 40) return [];
  // Die Schwelle ist die Mitte zwischen dem hellsten und dunkelsten Wert in
  // der Nähe. Eine Packung ist selten gleich hell ausgeleuchtet, und eine
  // feste Schwelle verliert die dunklere Hälfte. Ein örtliches Mittel wäre
  // am Rand des Codes falsch: dort liegt viel Weiss im Fenster, die Schwelle
  // steigt, und der äussere Strich wird breiter, als er ist.
  const fenster = Math.max(12, Math.round(n / 12));
  let min = 255; let max = 0;
  for (let x = 0; x < n; x++) { if (zeile[x] < min) min = zeile[x]; if (zeile[x] > max) max = zeile[x]; }
  if (max - min < 40) return [];
  const schwelle = new Float32Array(n);
  for (let x = 0; x < n; x++) {
    let lo = 255; let hi = 0;
    for (let j = Math.max(0, x - fenster); j < Math.min(n, x + fenster); j++) { const v = zeile[j]; if (v < lo) lo = v; if (v > hi) hi = v; }
    // Wo das Fenster kaum Kontrast hat, liegt kein Code. Dort gilt die
    // Mitte der ganzen Zeile, sonst wird Rauschen in weissen Flächen zu Strichen.
    schwelle[x] = hi - lo < (max - min) / 3 ? (min + max) / 2 : (lo + hi) / 2;
  }
  const laeufe = [];
  let dunkel = false;
  let lauf = 0;
  for (let x = 0; x < n; x++) {
    const d = zeile[x] < schwelle[x];
    if (d !== dunkel) { laeufe.push(lauf); lauf = 0; dunkel = d; }
    lauf++;
  }
  laeufe.push(lauf);
  return laeufe;
}

/** Sucht einen Code in einer Zeile, vorwärts und rückwärts. */
export function eanAusZeile(zeile) {
  for (const z of [zeile, [...zeile].reverse()]) {
    const laeufe = laeufeAus(z);
    // Läufe mit ungeradem Index sind Striche.
    for (let i = 1; i < laeufe.length; i += 2) {
      const code = ean13(laeufe, i) ?? ean8(laeufe, i);
      if (code) return code;
    }
  }
  return null;
}

/**
 * Liest ein Bild aus `getImageData`. Abgetastet werden waagerechte Zeilen
 * um die Mitte, dort hält man den Code hin. Ein Ergebnis zählt, sobald zwei
 * Zeilen dasselbe lesen.
 */
export function eanAusBild({ data, width, height }, { zeilen = 15 } = {}) {
  const gesehen = new Map();
  for (let k = 0; k < zeilen; k++) {
    const y = Math.round(height * (0.3 + (0.4 * k) / Math.max(1, zeilen - 1)));
    const zeile = new Uint8Array(width);
    const basis = y * width * 4;
    for (let x = 0; x < width; x++) {
      const p = basis + x * 4;
      zeile[x] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
    }
    const code = eanAusZeile(zeile);
    if (!code) continue;
    const n = (gesehen.get(code) ?? 0) + 1;
    if (n >= 2) return code;
    gesehen.set(code, n);
  }
  return null;
}

/* ---------- Für die Tests: einen Code zeichnen ---------- */

/** Die Module eines EAN-13 als Folge aus 0 und 1, mit Ruhezone. */
export function ean13Module(code) {
  const z = [...code].map(Number);
  const par = PARITAET[z[0]];
  const breitenZuModul = (breiten, startDunkel) => {
    let farbe = startDunkel; const aus = [];
    for (const b of breiten) { for (let i = 0; i < b; i++) aus.push(farbe ? 1 : 0); farbe = !farbe; }
    return aus;
  };
  const m = [...Array(11).fill(0), 1, 0, 1];
  for (let n = 1; n <= 6; n++) m.push(...breitenZuModul((par[n - 1] === "G" ? G : L)[z[n]], false));
  m.push(0, 1, 0, 1, 0);
  for (let n = 7; n <= 12; n++) m.push(...breitenZuModul(L[z[n]], true));
  m.push(1, 0, 1, ...Array(11).fill(0));
  return m;
}
