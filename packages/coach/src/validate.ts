import type { FoodEntry } from "@daevo/core";

export interface ValidationResult {
  entries: FoodEntry[];
  warnings: string[];
}

const MAX_KCAL_PER_ENTRY = 3000;

/**
 * Prüft Modellantworten auf Rechenfehler und Ausreisser.
 *
 * Sprachmodelle rechnen Kalorien häufig falsch. Deshalb gilt hier die
 * Makrorechnung als Wahrheit: kcal = Protein*4 + Fett*9 + Kohlenhydrate*4.
 * Weicht der gelieferte Wert um mehr als 10 Prozent ab, wird er korrigiert.
 */
export function validateEntries(raw: unknown): ValidationResult {
  const warnings: string[] = [];
  const entries: FoodEntry[] = [];
  if (!Array.isArray(raw)) return { entries, warnings: ["Antwort enthielt keine Liste von Einträgen."] };

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) continue;

    const proteinG = nonNegative(rec.proteinG);
    const fatG = nonNegative(rec.fatG);
    const carbsG = nonNegative(rec.carbsG);
    const claimedKcal = nonNegative(rec.kcal);
    const derivedKcal = Math.round(proteinG * 4 + fatG * 9 + carbsG * 4);

    let kcal = Math.round(claimedKcal);
    if (derivedKcal > 0 && Math.abs(claimedKcal - derivedKcal) > derivedKcal * 0.1) {
      warnings.push(`${name}: Kalorien auf ${derivedKcal} kcal korrigiert, geliefert waren ${Math.round(claimedKcal)} kcal.`);
      kcal = derivedKcal;
    }
    if (kcal > MAX_KCAL_PER_ENTRY) {
      warnings.push(`${name}: ${kcal} kcal für einen Posten ist unplausibel. Bitte Menge prüfen.`);
    }

    entries.push({
      name,
      quantity: typeof rec.quantity === "string" ? rec.quantity : "unbekannt",
      kcal,
      proteinG: round1(proteinG),
      fatG: round1(fatG),
      carbsG: round1(carbsG),
    });
  }
  return { entries, warnings };
}

function nonNegative(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
