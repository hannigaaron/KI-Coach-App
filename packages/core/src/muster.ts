/**
 * Zusammenhänge über Wochen.
 *
 * Die App hat Zahlen zu Schlaf, Energie, Essen, Training, Wasser und seit dem
 * Kalender auch zur verplanten Zeit. Einzeln sagt jede wenig. Nebeneinander
 * gelegt zeigen sie, woran die Energie wirklich hängt.
 *
 * Zwei Regeln, die hier nicht verhandelbar sind.
 *
 * Erstens: ein Zusammenhang ist keine Ursache. Wer schlecht schläft und wenig
 * Energie hat, hat vielleicht beides wegen Stress. Jeder Befund sagt das dazu.
 *
 * Zweitens: unter zehn gemeinsamen Tagen wird nichts behauptet. Aus fünf Tagen
 * lässt sich alles herauslesen, und genau deshalb nichts.
 *
 * Gerechnet wird der Korrelationskoeffizient nach Pearson. Er misst nur
 * geradlinige Zusammenhänge. Ein Zusammenhang, der erst ab einer Schwelle
 * einsetzt, bleibt unsichtbar. Deshalb steht neben dem Wert immer der
 * Vergleich der Gruppen: das obere Drittel gegen das untere. Der ist auch für
 * jemanden lesbar, der mit einem r nichts anfangen kann.
 */

export interface MusterTag {
  tag: string;
  kcal: number | null;
  proteinG: number | null;
  wasserMl: number | null;
  /** Schlafqualität aus dem Morgen Check-in, 1 bis 10. */
  schlaf: number | null;
  /** Energie aus einem Check-in, 1 bis 10. */
  energie: number | null;
  /** Konzentration aus dem Mittags Check-in, 1 bis 10. */
  konzentration: number | null;
  stimmung: number | null;
  /** Absolvierte Trainingseinheiten. */
  training: number | null;
  /** Im Kalender verplante Minuten. */
  terminMinuten: number | null;
}

export interface Befund {
  /** Was verglichen wurde. */
  treiber: string;
  ziel: string;
  /** Korrelationskoeffizient nach Pearson, zwischen minus 1 und 1. */
  r: number;
  /** Auf wie vielen gemeinsamen Tagen der Wert beruht. */
  tage: number;
  /** Mittelwert des Ziels im oberen und im unteren Drittel des Treibers. */
  oben: number;
  unten: number;
  /** Ein Satz, der beides enthält: die Zahlen und die Einschränkung. */
  satz: string;
}

/** Unter dieser Zahl gemeinsamer Tage wird nichts gesagt. */
export const MIND_TAGE = 10;
/** Unter diesem Betrag ist der Zusammenhang zu schwach, um ihn zu nennen. */
export const MIND_R = 0.4;

type Feld = keyof Omit<MusterTag, "tag">;

interface Paar {
  treiber: Feld;
  ziel: Feld;
  /** Verschiebung in Tagen. 1 heisst: der Treiber von gestern gegen heute. */
  versatz?: number;
  treiberName: string;
  zielName: string;
  einheitTreiber: string;
  einheitZiel: string;
}

/**
 * Welche Paare geprüft werden.
 *
 * Nicht alle gegen alle. Bei genug Kombinationen findet sich immer irgendwo
 * ein Zusammenhang, der nichts bedeutet. Geprüft wird nur, wofür es eine
 * plausible Richtung gibt, und die Richtung steht im Namen: der Treiber steht
 * zeitlich oder sachlich vorne.
 */
const PAARE: Paar[] = [
  { treiber: "schlaf", ziel: "energie", treiberName: "Schlafqualität", zielName: "Energie", einheitTreiber: "von 10", einheitZiel: "von 10" },
  { treiber: "terminMinuten", ziel: "energie", treiberName: "verplante Zeit", zielName: "Energie", einheitTreiber: "Minuten", einheitZiel: "von 10" },
  { treiber: "terminMinuten", ziel: "stimmung", treiberName: "verplante Zeit", zielName: "Stimmung", einheitTreiber: "Minuten", einheitZiel: "von 10" },
  { treiber: "kcal", ziel: "energie", treiberName: "Kalorienaufnahme", zielName: "Energie", einheitTreiber: "kcal", einheitZiel: "von 10" },
  { treiber: "proteinG", ziel: "energie", treiberName: "Protein", zielName: "Energie", einheitTreiber: "g", einheitZiel: "von 10" },
  { treiber: "wasserMl", ziel: "konzentration", treiberName: "Trinkmenge", zielName: "Konzentration", einheitTreiber: "ml", einheitZiel: "von 10" },
  { treiber: "schlaf", ziel: "konzentration", treiberName: "Schlafqualität", zielName: "Konzentration", einheitTreiber: "von 10", einheitZiel: "von 10" },
  { treiber: "training", ziel: "schlaf", versatz: 1, treiberName: "Training am Vortag", zielName: "Schlafqualität", einheitTreiber: "Einheiten", einheitZiel: "von 10" },
  { treiber: "terminMinuten", ziel: "kcal", treiberName: "verplante Zeit", zielName: "Kalorienaufnahme", einheitTreiber: "Minuten", einheitZiel: "kcal" },
];

/** Sucht die Zusammenhänge, die stark genug und breit genug belegt sind. */
export function muster(tage: MusterTag[], mindTage = MIND_TAGE): Befund[] {
  const out: Befund[] = [];
  for (const paar of PAARE) {
    const punkte = paare(tage, paar);
    if (punkte.length < mindTage) continue;
    const r = pearson(punkte.map((p) => p.x), punkte.map((p) => p.y));
    if (!Number.isFinite(r) || Math.abs(r) < MIND_R) continue;

    const sortiert = punkte.slice().sort((a, b) => a.x - b.x);
    const drittel = Math.max(1, Math.floor(sortiert.length / 3));
    const unten = mittel(sortiert.slice(0, drittel).map((p) => p.y));
    const oben = mittel(sortiert.slice(-drittel).map((p) => p.y));

    out.push({
      treiber: paar.treiberName,
      ziel: paar.zielName,
      r: Math.round(r * 100) / 100,
      tage: punkte.length,
      oben: runde(oben),
      unten: runde(unten),
      satz: satzVon(paar, r, punkte.length, runde(oben), runde(unten), sortiert, drittel),
    });
  }
  return out.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
}

function satzVon(
  paar: Paar, r: number, tage: number, oben: number, unten: number,
  sortiert: { x: number; y: number }[], drittel: number,
): string {
  const xUnten = runde(mittel(sortiert.slice(0, drittel).map((p) => p.x)));
  const xOben = runde(mittel(sortiert.slice(-drittel).map((p) => p.x)));
  const richtung = r > 0 ? "mit" : "gegen";
  return (
    `An den ${drittel} Tagen mit der höchsten ${paar.treiberName}, im Schnitt ${xOben} ${paar.einheitTreiber}, ` +
    `lag deine ${paar.zielName} bei ${oben} ${paar.einheitZiel}. An den ${drittel} Tagen mit der niedrigsten, ` +
    `im Schnitt ${xUnten} ${paar.einheitTreiber}, bei ${unten} ${paar.einheitZiel}. ` +
    `Der Zusammenhang läuft ${richtung} und ist über ${tage} Tage gerechnet, r gleich ${Math.round(r * 100) / 100}. ` +
    "Das ist ein Zusammenhang, keine Ursache."
  );
}

function paare(tage: MusterTag[], paar: Paar): { x: number; y: number }[] {
  const versatz = paar.versatz ?? 0;
  const nachTag = new Map(tage.map((t) => [t.tag, t]));
  const out: { x: number; y: number }[] = [];
  for (const t of tage) {
    const quelle = versatz === 0 ? t : nachTag.get(minusTage(t.tag, versatz));
    if (!quelle) continue;
    const x = quelle[paar.treiber];
    const y = t[paar.ziel];
    if (typeof x !== "number" || typeof y !== "number") continue;
    out.push({ x, y });
  }
  return out;
}

function minusTage(tagIso: string, tage: number): string {
  const d = new Date(`${tagIso}T12:00:00`);
  d.setDate(d.getDate() - tage);
  return d.toISOString().slice(0, 10);
}

/** Korrelationskoeffizient nach Pearson. Ohne Streuung gibt es keinen Wert. */
export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return NaN;
  const mx = mittel(x.slice(0, n));
  const my = mittel(y.slice(0, n));
  let oben = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx;
    const dy = y[i]! - my;
    oben += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  if (sx === 0 || sy === 0) return NaN;
  return oben / Math.sqrt(sx * sy);
}

function mittel(werte: number[]): number {
  return werte.length === 0 ? 0 : werte.reduce((s, w) => s + w, 0) / werte.length;
}

function runde(wert: number): number {
  return Math.abs(wert) >= 100 ? Math.round(wert) : Math.round(wert * 10) / 10;
}

/** Die Befunde in Worten. Ohne Befund wird das auch gesagt. */
export function musterText(befunde: Befund[], tage: number): string {
  if (befunde.length === 0) {
    return (
      `Aus den letzten ${tage} Tagen sehe ich keinen Zusammenhang, der stark genug ist, um ihn zu nennen. ` +
      "Das heisst nicht, dass es keinen gibt. Es heisst, dass die Daten ihn nicht hergeben."
    );
  }
  const zeilen = [`Aus den letzten ${tage} Tagen, sortiert nach Stärke. Je Zeile steht dabei, auf wie vielen Tagen mit beiden Werten sie beruht:`];
  for (const b of befunde) zeilen.push(`- ${b.treiber} und ${b.ziel}: ${b.satz}`);
  return zeilen.join("\n");
}
