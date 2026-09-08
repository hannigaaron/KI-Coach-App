/**
 * Mehrere Gespräche statt eines endlosen Verlaufs.
 *
 * Ein einziger Chat hat zwei Probleme. Das eine ist praktisch: was vor drei
 * Wochen besprochen wurde, findet niemand wieder, weil Scrollen keine Suche
 * ist. Das andere kostet Geld und Qualität: geht der gesamte Verlauf bei jeder
 * Nachricht mit, zahlt der Nutzer für Kontext, der nichts zur Frage beiträgt,
 * und das Modell muss zwischen einem Gespräch über Kalorien und einem über
 * Schuldgefühle selbst trennen.
 *
 * Deshalb: getrennte Gespräche, ein Thema je Gespräch, automatisch einsortiert.
 * Die Zuordnung passiert über Wortlisten und nicht über das Modell. Ein Ordner,
 * für den erst eine Anfrage rausgeht, wird bei jedem zweiten Gespräch falsch
 * gesetzt, weil die Anfrage scheitert oder Geld kostet. Das Modell darf die
 * Zuordnung überschreiben, wenn es besser weiss, und der Nutzer auch.
 */
import { foldUmlauts, tokenize } from "./memory.js";

export type Ordner = "ernaehrung" | "training" | "regeneration" | "planung" | "aengste" | "sonstiges";

export interface OrdnerInfo {
  id: Ordner;
  name: string;
  /** Für die Farbe der Kachel, dieselben Töne wie im Balance Board. */
  farbe: string;
}

export const ORDNER: OrdnerInfo[] = [
  { id: "ernaehrung", name: "Ernährung", farbe: "#3FB950" },
  { id: "training", name: "Training", farbe: "#F85149" },
  { id: "regeneration", name: "Regeneration", farbe: "#2EA8E0" },
  { id: "planung", name: "Planung", farbe: "#E3B341" },
  { id: "aengste", name: "Ängste", farbe: "#A371F7" },
  { id: "sonstiges", name: "Sonstiges", farbe: "#8B949E" },
];

export function ordnerName(id: Ordner): string {
  return ORDNER.find((o) => o.id === id)?.name ?? "Sonstiges";
}

/**
 * Wortlisten je Ordner.
 *
 * Kurz und eindeutig gehalten. Ein Wort, das in zwei Ordnern vorkommen könnte,
 * gehört in keinen: eine falsche Zuordnung ist schlimmer als eine fehlende,
 * weil das Gespräch dann dort liegt, wo niemand danach sucht.
 *
 * "Ängste" ist der heikelste Ordner. Er fängt nur, was eindeutig zum inneren
 * Erleben gehört. Wer über Angst vor einem verpassten Training redet, landet
 * nicht hier, und das ist richtig so.
 */
const WOERTER: Record<Exclude<Ordner, "sonstiges">, string[]> = {
  ernaehrung: [
    "essen", "gegessen", "mahlzeit", "kalorien", "kcal", "protein", "eiweiss",
    "kohlenhydrate", "fett", "makros", "abnehmen", "zunehmen", "diaet", "defizit",
    "ueberschuss", "fruehstueck", "mittagessen", "abendessen", "snack", "rezept",
    "kochen", "einkauf", "supplement", "kreatin", "shake", "hunger", "satt",
  ],
  training: [
    "training", "trainiert", "workout", "krafttraining", "satz", "saetze",
    "wiederholungen", "kniebeuge", "bankdruecken", "kreuzheben", "klimmzug",
    "volleyball", "cardio", "laufen", "plan", "split", "progression", "gewicht",
    "muskel", "muskeln", "hypertrophie", "technik", "warmup",
  ],
  regeneration: [
    "schlaf", "geschlafen", "muede", "erschoepft", "erholung", "regeneration",
    "pause", "ruhetag", "sauna", "massage", "dehnen", "mobility", "stress",
    "cortisol", "testosteron", "libido", "energie", "energielos", "burnout",
    "krank", "verletzt", "schmerzen", "physio",
  ],
  planung: [
    "aufgabe", "aufgaben", "todo", "termin", "kalender", "woche", "planen",
    "geplant", "prioritaet", "prioritaeten", "deadline", "frist", "ziel", "ziele",
    "business", "kunden", "umsatz", "geld", "gehalt", "investieren", "etf",
    "selbststaendig", "franchise", "content", "struktur", "zeitmanagement",
  ],
  aengste: [
    "angst", "aengste", "panik", "sorge", "sorgen", "schuld", "schuldgefuehl",
    "scham", "schaeme", "traurig", "depressiv", "einsam", "wertlos", "versagen",
    "therapie", "therapeut", "psychisch", "grubeln", "gedankenkreisen",
    "selbstwert", "selbsthass", "ueberfordert", "verzweifelt", "trauer",
  ],
};

/** Wortgrenzen, damit "plan" nicht in "Planet" trifft. */
function enthaeltWort(text: string, wort: string): boolean {
  const w = foldUmlauts(wort).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(text);
}

/**
 * Der passende Ordner für einen Text.
 *
 * Gezählt wird, wie viele verschiedene Wörter je Ordner treffen, nicht wie oft.
 * Sonst gewinnt ein Gespräch, in dem zwanzig Mal "Essen" steht, gegen eines,
 * das inhaltlich breiter zum Thema gehört.
 *
 * Ängste schlägt bei Gleichstand alles andere. Wer über Scham redet und dabei
 * sein Training erwähnt, führt kein Trainingsgespräch.
 */
export function ordnerVon(text: string): { ordner: Ordner; treffer: number } {
  const t = foldUmlauts(text.toLowerCase());
  let bester: Ordner = "sonstiges";
  let hoechste = 0;

  for (const [ordner, liste] of Object.entries(WOERTER) as [Exclude<Ordner, "sonstiges">, string[]][]) {
    let treffer = 0;
    for (const wort of liste) if (enthaeltWort(t, wort)) treffer++;
    const gewinnt = ordner === "aengste" ? treffer >= hoechste : treffer > hoechste;
    if (treffer > 0 && gewinnt) {
      hoechste = treffer;
      bester = ordner;
    }
  }
  return { ordner: bester, treffer: hoechste };
}

export interface Nachricht {
  role: "user" | "assistant";
  text: string;
  at: string;
}

export interface Gespraech {
  id: string;
  titel: string;
  ordner: Ordner;
  nachrichten: Nachricht[];
  erstellt: string;
  zuletzt: string;
  /** Der Nutzer hat den Ordner selbst gesetzt. Dann wird nicht mehr umsortiert. */
  ordnerFest?: boolean;
}

/**
 * Ordner aus dem ganzen Gespräch bestimmen.
 *
 * Gewertet werden nur die Nachrichten des Nutzers. Was der Coach schreibt, ist
 * seine Antwort und nicht das Thema: eine Frage nach Schlaf, auf die eine
 * Antwort über Protein folgt, bleibt eine Frage nach Schlaf.
 */
export function ordnerFuerGespraech(g: Pick<Gespraech, "nachrichten">): Ordner {
  const text = g.nachrichten.filter((m) => m.role === "user").map((m) => m.text).join(" ");
  return ordnerVon(text).ordner;
}

/**
 * Ein Titel aus der ersten Frage.
 *
 * Der erste Satz des Nutzers, gekürzt. Kein Modellaufruf: ein Titel ist die
 * Beschriftung einer Zeile in einer Liste, und dafür lohnt keine Anfrage.
 * Setzt der Coach später einen besseren, ersetzt der ihn.
 */
export function titelVon(nachrichten: Nachricht[]): string {
  const erste = nachrichten.find((m) => m.role === "user" && m.text.trim().length > 0);
  if (!erste) return "Neues Gespräch";

  const satz = erste.text.trim().split(/(?<=[.!?])\s|\n/)[0] ?? erste.text.trim();
  const sauber = satz.replace(/\s+/g, " ").trim();
  if (sauber.length <= 48) return sauber;
  // An der letzten Wortgrenze vor der Grenze kürzen, nicht mitten im Wort.
  const kurz = sauber.slice(0, 48);
  const schnitt = kurz.lastIndexOf(" ");
  return `${(schnitt > 24 ? kurz.slice(0, schnitt) : kurz).trim()}…`;
}

export interface Fund {
  gespraech: Gespraech;
  score: number;
  /** Die Stelle, an der es passt, für die Vorschau in der Liste. */
  stelle: string;
}

/**
 * Suche über alle Gespräche.
 *
 * Dasselbe Verfahren wie im Gedächtnis: Wortüberlappung gewichtet mit inverser
 * Dokumenthäufigkeit. Ein seltenes Wort wie "Grießpudding" wiegt damit schwerer
 * als "ich", ohne dass eine Stoppwortliste gepflegt werden muss.
 */
export function sucheGespraeche(alle: Gespraech[], frage: string, grenze = 20): Fund[] {
  const gesucht = tokenize(frage);
  if (gesucht.length === 0) return [];

  // Dokumenthäufigkeit über alle Gespräche.
  const df = new Map<string, number>();
  const tokenJe = new Map<string, Set<string>>();
  for (const g of alle) {
    const tokens = new Set(tokenize(`${g.titel} ${g.nachrichten.map((m) => m.text).join(" ")}`));
    tokenJe.set(g.id, tokens);
    for (const t of tokens) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const gesamt = Math.max(1, alle.length);

  const funde: Fund[] = [];
  for (const g of alle) {
    const tokens = tokenJe.get(g.id) ?? new Set();
    let score = 0;
    for (const t of gesucht) {
      if (!tokens.has(t)) continue;
      score += Math.log(1 + gesamt / (df.get(t) ?? 1));
    }
    if (score <= 0) continue;
    // Ein Treffer im Titel wiegt schwerer: wer den Titel trifft, meint das Gespräch.
    const imTitel = tokenize(g.titel).some((t) => gesucht.includes(t));
    funde.push({
      gespraech: g,
      score: Math.round(score * (imTitel ? 1.6 : 1) * 1000) / 1000,
      stelle: stelleFinden(g, gesucht),
    });
  }
  return funde.sort((a, b) => b.score - a.score || b.gespraech.zuletzt.localeCompare(a.gespraech.zuletzt))
    .slice(0, grenze);
}

/** Die erste Nachricht, in der ein gesuchtes Wort vorkommt, gekürzt. */
function stelleFinden(g: Gespraech, gesucht: string[]): string {
  for (const m of g.nachrichten) {
    const tokens = new Set(tokenize(m.text));
    if (!gesucht.some((t) => tokens.has(t))) continue;
    const text = m.text.replace(/\s+/g, " ").trim();
    return text.length <= 110 ? text : `${text.slice(0, 110).trim()}…`;
  }
  return "";
}

/** Gespräche je Ordner, neueste zuerst. Leere Ordner fallen raus. */
export function nachOrdnern(alle: Gespraech[]): { ordner: OrdnerInfo; gespraeche: Gespraech[] }[] {
  return ORDNER
    .map((ordner) => ({
      ordner,
      gespraeche: alle.filter((g) => g.ordner === ordner.id)
        .sort((a, b) => b.zuletzt.localeCompare(a.zuletzt)),
    }))
    .filter((x) => x.gespraeche.length > 0);
}
