import type { FoodEntry } from "./types.js";
import { foldUmlauts } from "./memory.js";

/**
 * Der Schutz gegen doppelt eingetragenes Essen.
 *
 * Der Anlass ist ein echter Tag aus dem Betrieb. Um 15:58 waren Mousse und
 * Whey eingetragen, um 15:59 eine Mahlzeit aus fünf Posten, und direkt danach
 * eine Mahlzeit, die alles davon nochmal enthielt. Am Ende standen 5172 statt
 * rund 1700 Kalorien da. Der Nutzer hat das nicht zweimal gesagt.
 *
 * Die Ursache liegt beim Modell. Es sieht die Zahlen des Tages im Kontext und
 * schickt beim nächsten Eintrag die ganze bisherige Liste erneut mit, weil es
 * "was ich heute gegessen habe" als eine Mahlzeit versteht. Ein Prompt hilft
 * dagegen nur so lange, bis er einmal nicht greift, und dann rechnet die App
 * einen ganzen Tag falsch.
 *
 * Deshalb steht der Riegel hier, deterministisch und geprüft: was innerhalb
 * des Fensters schon dasteht, kommt nicht nochmal rein. Verworfenes wird
 * gemeldet und nicht still geschluckt, denn wer wirklich zweimal dasselbe
 * gegessen hat, muss das sagen können.
 */

/**
 * Wie lange ein Posten als schon eingetragen gilt.
 *
 * Zwei Stunden. Wer denselben Artikel in derselben Menge innerhalb von zwei
 * Stunden nochmal einträgt, hat ihn fast immer nicht zweimal gegessen.
 * Darüber wird es normal: Magerquark morgens und abends ist bei diesem Nutzer
 * der Regelfall, und ein Filter, der das verschluckt, wäre schlimmer als das
 * Problem.
 */
export const DOPPELT_FENSTER_MIN = 120;

export interface BestehenderPosten {
  eintrag: FoodEntry;
  /** Uhrzeit der Mahlzeit als HH:MM. */
  at: string;
}

export interface DoppeltErgebnis {
  /** Was wirklich neu ist und eingetragen wird. */
  behalten: FoodEntry[];
  /** Was schon dastand. Gehört in die Antwort, nicht in den Papierkorb. */
  verworfen: FoodEntry[];
}

/**
 * Trennt neue Posten von solchen, die schon im Tag stehen.
 *
 * Verglichen wird über Name und Menge, beide durch `schluessel` vereinheitlicht.
 * Nicht über die Kalorien: dieselbe Speise kommt je nach Quelle mit 148 oder
 * 150 kcal zurück, und ein Vergleich auf die Zahl würde genau dann durchfallen,
 * wenn er gebraucht wird.
 *
 * Doppelte innerhalb derselben Liste fallen ebenfalls raus. Das Modell hat in
 * einem Aufruf schon "150 g Haferflocken" zweimal geschickt.
 */
export function ohneDoppelte(
  bestehend: BestehenderPosten[],
  neu: FoodEntry[],
  jetzt: string,
  fensterMin: number = DOPPELT_FENSTER_MIN,
): DoppeltErgebnis {
  const grenze = minuten(jetzt) - fensterMin;
  const gesehen = new Set<string>();
  for (const p of bestehend) {
    if (minuten(p.at) >= grenze) gesehen.add(schluessel(p.eintrag));
  }

  const behalten: FoodEntry[] = [];
  const verworfen: FoodEntry[] = [];
  for (const e of neu) {
    const k = schluessel(e);
    if (gesehen.has(k)) {
      verworfen.push(e);
      continue;
    }
    gesehen.add(k);
    behalten.push(e);
  }
  return { behalten, verworfen };
}

/**
 * Der Vergleichsschlüssel aus Name und Menge.
 *
 * Umlaute gefaltet, Kleinschreibung, mehrfache Leerzeichen zusammengezogen.
 * "150 g Haferflocken" und "150g Haferflocken" sind derselbe Posten, und
 * "Gekochter Reis" und "Reis, gekocht" sind es leider nicht. Die zweite Lücke
 * bleibt bewusst offen: eine Ähnlichkeitssuche würde irgendwann zwei wirklich
 * verschiedene Speisen zusammenwerfen, und eine erfundene Gleichheit ist
 * schlimmer als eine übersehene.
 */
export function schluessel(e: FoodEntry): string {
  // Im Namen bleiben Wortgrenzen erhalten, sonst würden "Reis Salat" und
  // "Reissalat" gleich. In der Menge fallen sie ganz weg: "100 g" und "100g"
  // sind dieselbe Menge, und genau so schwankt die Schreibweise zwischen
  // zwei Antworten des Modells.
  const name = foldUmlauts(String(e.name ?? "").toLowerCase()).replace(/[^a-z0-9]+/g, " ").trim();
  const menge = foldUmlauts(String(e.quantity ?? "").toLowerCase()).replace(/,/g, ".").replace(/[^a-z0-9.]+/g, "");
  return `${menge}|${name}`;
}

/**
 * Wie der Coach das Verworfene nennt.
 *
 * Es muss in der Antwort stehen. Ein stiller Filter, der Essen verschluckt,
 * ist genau derselbe Fehler nochmal, nur in die andere Richtung: dann fehlen
 * Kalorien, und niemand weiss warum.
 */
export function doppeltText(verworfen: FoodEntry[]): string {
  if (verworfen.length === 0) return "";
  const namen = verworfen.map((e) => `${e.quantity} ${e.name}`.trim()).join(", ");
  const eins = verworfen.length === 1;
  return `Das stand schon drin: ${namen}. `
    + `${eins ? "Ich habe es nicht doppelt gezählt." : "Ich habe die nicht doppelt gezählt."} `
    + "Hast du das wirklich zweimal gegessen, sag es mir, dann trage ich es nach.";
}

function minuten(hhmm: string): number {
  const teile = String(hhmm ?? "").split(":");
  const h = Number(teile[0]);
  const m = Number(teile[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}
