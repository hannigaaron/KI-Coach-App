/**
 * Wörter, die die Spracherkennung kennen soll, und Korrekturen für das, was
 * sie trotzdem falsch schreibt.
 *
 * Die Wortliste geht in der iPhone App an `DiktatPlugin.swift`, dort als
 * `contextualStrings` an die Erkennung von Apple. Sie macht seltene Wörter
 * wahrscheinlicher, sie erzwingt keines. Apple nimmt höchstens 100 Einträge,
 * deshalb stehen die Wörter vorn, die im Betrieb falsch kamen.
 *
 * Die Korrekturen laufen auf jedem Weg, auch im Browser. Jede Zeile stammt
 * aus einer echten Ausgabe des Geräts, nicht aus einer Vermutung: "zwei
 * Sitze breite Umzüge" für "zwei Sätze breite Klimmzüge". Jede greift nur im
 * Zusammenhang, denn "Sitze" allein kann ein Sitz sein, und eine Korrektur,
 * die einen richtigen Satz verdirbt, ist schlimmer als keine.
 */
import { UEBUNGEN } from "./uebungen-daten.js";

const FEST = [
  "Sätze", "Satz", "Wiederholungen", "RIR", "Reps in Reserve", "Klimmzüge", "enge Klimmzüge", "breite Klimmzüge",
  "Seal Row", "Kabelrudern", "Seitheben", "Latzug", "Bankdrücken", "Kreuzheben", "Rumänisches Kreuzheben",
  "Hip Thrust", "Beinpresse", "Face Pull", "Magerquark", "Skyr", "Whey", "Proteinpulver", "Haferflocken",
  "Erdnussbutter", "Hafermilch", "Flexpresso", "daevo",
];

const MAX_WOERTER = 100;

/** Die Wortliste für die Erkennung, feste Wörter zuerst, dann die Übungen ohne Klammerzusatz. */
export function diktatWoerter(uebungen = UEBUNGEN) {
  const namen = uebungen.map((u) => String(u.name ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim()).filter(Boolean);
  const gesehen = new Set();
  const aus = [];
  for (const w of [...FEST, ...namen]) {
    const k = w.toLowerCase();
    if (gesehen.has(k)) continue;
    gesehen.add(k);
    aus.push(w);
  }
  return aus.slice(0, MAX_WOERTER);
}

const ZAHL = "(?:\\d+|ein|einen|eine|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn)";

/** [Muster, Ersatz]. Gross und klein egal, Wortgrenzen über Leerzeichen und Satzzeichen. */
const KORREKTUREN = [
  // "zwei Sitze", "3 Sitze": nach einer Zahl ist es ein Satz im Training.
  [new RegExp(`\\b(${ZAHL})\\s+(?:sitze|sätzen?|setze|sitzer)\\b`, "gi"), "$1 Sätze"],
  // "Engel Klimmzüge", "engen Umzüge".
  [/\bengel?\s+(?:klimmzüge|umzüge|klimm züge)\b/gi, "enge Klimmzüge"],
  [/\b(breite|breiten|enge|engen)\s+(?:umzüge|klimm züge|kimmzüge)\b/gi, "$1 Klimmzüge"],
  [/\b(?:sigal|siegel|sigel|seel|seal|sil)\s+(?:ro|row|roh|rau|rov)\b/gi, "Seal Row"],
  // "und seit eben": Seitheben zerfällt in zwei Wörter.
  [/\b(?:seit|seid)\s+(?:eben|heben)\b/gi, "Seitheben"],
  [/\bkabel\s+rudern\b/gi, "Kabelrudern"],
  [/\b(?:r\s?i\s?r|er\s+ihr\s+er)\b/gi, "RIR"],
];

/** Korrigiert, was die Erkennung im Training regelmässig falsch schreibt. */
export function diktatKorrektur(text) {
  let t = String(text ?? "");
  for (const [muster, ersatz] of KORREKTUREN) t = t.replace(muster, ersatz);
  return t;
}
