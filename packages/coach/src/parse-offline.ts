import type { FoodEntry } from "@daevo/core";
import { findFood, normalize } from "./foods.js";

const QUANTITY = /(\d+(?:[.,]\d+)?)\s*(g|gramm|kg|ml|l|stk|stueck|stück|scheiben?|el|tl|portionen?)?/i;

const UNIT_TO_GRAM: Record<string, number> = {
  g: 1,
  gramm: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  el: 15,
  tl: 5,
};

/**
 * Regelbasierter Parser fuer Mahlzeitentexte.
 *
 * Er ersetzt kein Sprachmodell. Er dient zwei Zwecken:
 * 1. Die App bleibt ohne API Key nutzbar und testbar.
 * 2. Er liefert eine unabhaengige Zweitmeinung, gegen die Modellantworten
 *    auf grobe Ausreisser geprueft werden koennen.
 */
export function parseMealOffline(text: string): { entries: FoodEntry[]; unresolved: string[] } {
  const entries: FoodEntry[] = [];
  const unresolved: string[] = [];
  // Komma trennt nur, wenn es nicht zwischen zwei Ziffern steht. Sonst
  // wuerde "1,5 EL" in zwei Teile zerfallen.
  const chunks = text
    .split(/(?<!\d),(?!\d)| und | mit |\+|\n/i)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const food = findFood(chunk);
    if (!food) {
      if (normalize(chunk).length > 2) unresolved.push(chunk);
      continue;
    }
    const grams = extractGrams(chunk, food.pieceG);
    if (grams === null) {
      unresolved.push(chunk);
      continue;
    }
    const factor = grams / 100;
    entries.push({
      name: food.label,
      quantity: `${Math.round(grams)} g`,
      kcal: Math.round(food.per100.kcal * factor),
      proteinG: round1(food.per100.proteinG * factor),
      fatG: round1(food.per100.fatG * factor),
      carbsG: round1(food.per100.carbsG * factor),
    });
  }
  return { entries, unresolved };
}

function extractGrams(chunk: string, pieceG?: number): number | null {
  const match = QUANTITY.exec(chunk);
  if (!match) return pieceG ?? null;
  const amount = Number((match[1] ?? "").replace(",", "."));
  if (!Number.isFinite(amount)) return pieceG ?? null;
  const unit = normalize(match[2] ?? "");
  if (unit && unit in UNIT_TO_GRAM) return amount * (UNIT_TO_GRAM[unit] as number);
  if (!pieceG) return null;
  return amount * pieceG;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
