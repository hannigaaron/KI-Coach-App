import type { DayTotals, FoodEntry, MacroTargets } from "./types.js";

export interface RemainingBudget {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
}

export function sumEntries(entries: FoodEntry[], waterMl = 0): DayTotals {
  return entries.reduce<DayTotals>(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      proteinG: acc.proteinG + e.proteinG,
      fatG: acc.fatG + e.fatG,
      carbsG: acc.carbsG + e.carbsG,
      waterMl: acc.waterMl,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, waterMl },
  );
}

/** Was heute noch uebrig ist. Negative Werte bedeuten Ueberschreitung. */
export function remainingBudget(totals: DayTotals, targets: MacroTargets): RemainingBudget {
  return {
    kcal: Math.round(targets.kcal - totals.kcal),
    proteinG: Math.round(targets.proteinG - totals.proteinG),
    fatG: Math.round(targets.fatG - totals.fatG),
    carbsG: Math.round(targets.carbsG - totals.carbsG),
    waterMl: Math.round(targets.waterMl - totals.waterMl),
  };
}

/**
 * Prueft, ob eine geplante Mahlzeit in das Restbudget passt.
 * Toleranz: 10 Prozent der Zielkalorien des Tages.
 */
export function fitsBudget(meal: FoodEntry[], remaining: RemainingBudget, dailyKcalTarget: number): boolean {
  const mealTotals = sumEntries(meal);
  const tolerance = dailyKcalTarget * 0.1;
  return mealTotals.kcal <= remaining.kcal + tolerance;
}

/** Kalorien aus Makros. Alkohol wird hier nicht beruecksichtigt. */
export function kcalFromMacros(proteinG: number, fatG: number, carbsG: number): number {
  return Math.round(proteinG * 4 + fatG * 9 + carbsG * 4);
}
