import type { FoodEntry } from "@daevo/core";
import { findFood, normalize } from "./foods.js";

// Zahl, dann optional ein Beiwort wie "gehäuft", dann die Einheit. Das
// Beiwort steht beim Löffel fast immer dazwischen: "1 gehäufter Teelöffel".
const QUANTITY = /(\d+(?:[.,]\d+)?)\s*(gehaeuft\w*|gestrichen\w*)?\s*(g|gr|gramm|kg|kilo|ml|milliliter|l|liter|stk|stueck|scheiben?|el|essloeffeln?|tl|teeloeffeln?|messloeffeln?|scoops?|portionen?)?\b/;

// Haushaltsmasse sind Faustwerte und keine Messung. Ein Teelöffel fasst
// rund 5 Gramm, ein Esslöffel rund 15, gehäuft etwa das Doppelte. Bei
// Erdnussbutter ist ein gehäufter Teelöffel damit eher 10 als 5 Gramm.
const UNIT_TO_GRAM: Record<string, number> = {
  g: 1,
  gr: 1,
  gramm: 1,
  kg: 1000,
  kilo: 1000,
  ml: 1,
  milliliter: 1,
  l: 1000,
  liter: 1000,
  el: 15,
  essloeffel: 15,
  tl: 5,
  teeloeffel: 5,
  // Ein Messlöffel Proteinpulver liegt bei den gängigen Dosen bei 30 Gramm.
  messloeffel: 30,
  scoop: 30,
};

const LOEFFEL = new Set(["el", "essloeffel", "tl", "teeloeffel"]);

// "einen Teelöffel" ist dieselbe Angabe wie "1 Teelöffel". Spracherkennung
// schreibt kleine Zahlen meist als Wort.
const ZAHLWORT: Record<string, string> = {
  ein: "1", eine: "1", einen: "1", einem: "1", einer: "1",
  zwei: "2", drei: "3", vier: "4", fuenf: "5", sechs: "6", halben: "0.5", halbe: "0.5",
};

/**
 * Regelbasierter Parser für Mahlzeitentexte.
 *
 * Er ersetzt kein Sprachmodell. Er dient zwei Zwecken:
 * 1. Die App bleibt ohne API Key nutzbar und testbar.
 * 2. Er liefert eine unabhängige Zweitmeinung, gegen die Modellantworten
 *    auf grobe Ausreisser geprueft werden können.
 */
export function parseMealOffline(text: string): { entries: FoodEntry[]; unresolved: string[] } {
  const entries: FoodEntry[] = [];
  const unresolved: string[] = [];
  // Komma trennt nur, wenn es nicht zwischen zwei Ziffern steht. Sonst
  // würde "1,5 EL" in zwei Teile zerfallen.
  const chunks = text
    .split(/(?<!\d),(?!\d)| und | mit |\+|\n/i)
    .map((c) => c.trim())
    .filter(Boolean);

  const treffer: { key: string; explizit: boolean; entry: FoodEntry }[] = [];
  for (const chunk of chunks) {
    const food = findFood(chunk);
    if (!food) {
      if (normalize(chunk).length > 2) unresolved.push(chunk);
      continue;
    }
    const menge = extractGrams(chunk, food.pieceG);
    if (menge === null) {
      unresolved.push(chunk);
      continue;
    }
    const grams = menge.grams;
    const factor = grams / 100;
    treffer.push({ key: food.key, explizit: menge.explizit, entry: {
      name: food.label,
      // Flüssiges bleibt in Milliliter, so wie es gesagt wurde. Gerechnet wird
      // mit 1 ml gleich 1 g, für Milch und Haferdrink weicht das um wenige
      // Prozent ab.
      quantity: `${Math.round(grams)} ${menge.ml || food.fluessig ? "ml" : "g"}`,
      kcal: Math.round(food.per100.kcal * factor),
      proteinG: round1(food.per100.proteinG * factor),
      fatG: round1(food.per100.fatG * factor),
      carbsG: round1(food.per100.carbsG * factor),
    } });
  }
  // "Einen Shake mit 30 Gramm Proteinpulver" nennt dasselbe Pulver zweimal:
  // einmal als Behälter ohne Menge, einmal mit Menge. Ohne diese Regel
  // standen 60 Gramm Pulver im Tag. Wo dasselbe Lebensmittel mit einer
  // ausdrücklichen Menge vorkommt, fällt der Treffer ohne Menge weg.
  const mitMenge = new Set(treffer.filter((t) => t.explizit).map((t) => t.key));
  for (const t of treffer) {
    if (!t.explizit && mitMenge.has(t.key)) continue;
    entries.push(t.entry);
  }
  return { entries, unresolved };
}

/** Text, auf dem die Mengensuche läuft: gefaltet, Zahlwörter als Ziffern, Kommazahlen erhalten. */
function mengenText(chunk: string): string {
  const gefaltet = chunk
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  return gefaltet.replace(/\b[a-z]+\b/g, (w) => ZAHLWORT[w] ?? w);
}

const FLUESSIG = new Set(["ml", "milliliter", "l", "liter"]);

export function extractGrams(chunk: string, pieceG?: number): { grams: number; explizit: boolean; ml?: boolean } | null {
  const match = QUANTITY.exec(mengenText(chunk));
  if (!match) return pieceG ? { grams: pieceG, explizit: false } : null;
  const amount = Number((match[1] ?? "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return pieceG ? { grams: pieceG, explizit: false } : null;
  const unit = (match[3] ?? "").replace(/n$/, "").replace(/s$/, "");
  const einheit = unit in UNIT_TO_GRAM ? unit : (match[3] ?? "");
  if (einheit && einheit in UNIT_TO_GRAM) {
    const gehaeuft = Boolean(match[2]?.startsWith("gehaeuft")) && LOEFFEL.has(einheit);
    return {
      grams: amount * (UNIT_TO_GRAM[einheit] as number) * (gehaeuft ? 2 : 1),
      explizit: true,
      ml: FLUESSIG.has(einheit),
    };
  }
  if (!pieceG) return null;
  // Eine Stückzahl ohne Einheit gilt nicht als ausdrückliche Menge. "Einen
  // Shake" ist der Becher, das Pulver darin steht mit Gramm daneben.
  return { grams: amount * pieceG, explizit: false };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
