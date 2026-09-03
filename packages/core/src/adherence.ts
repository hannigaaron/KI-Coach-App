import type { DayTotals, MacroTargets } from "./types.js";

export interface AdherenceScore {
  /** 0 bis 100. */
  total: number;
  kcal: number;
  protein: number;
  water: number;
  /** Klartext fuer den Coach. */
  verdict: "on_track" | "slightly_off" | "off_track";
}

/**
 * Bewertet einen Tag gegen die Zielwerte.
 *
 * Gewichtung: Kalorien 50 Prozent, Protein 30 Prozent, Wasser 20 Prozent.
 * Diese Gewichtung ist eine Produktentscheidung, keine wissenschaftliche Konstante.
 * Kalorien steuern die Gewichtsveraenderung, Protein schuetzt die Muskelmasse.
 */
export function scoreDay(totals: DayTotals, targets: MacroTargets): AdherenceScore {
  const kcal = bandScore(totals.kcal, targets.kcal, 0.1);
  const protein = atLeastScore(totals.proteinG, targets.proteinG, 0.15);
  const water = atLeastScore(totals.waterMl, targets.waterMl, 0.2);
  const total = Math.round(kcal * 0.5 + protein * 0.3 + water * 0.2);
  return {
    total,
    kcal,
    protein,
    water,
    verdict: total >= 85 ? "on_track" : total >= 65 ? "slightly_off" : "off_track",
  };
}

/** Volle Punktzahl innerhalb der Toleranz, danach linearer Abfall. */
function bandScore(actual: number, target: number, tolerance: number): number {
  if (target <= 0) return 0;
  const deviation = Math.abs(actual - target) / target;
  if (deviation <= tolerance) return 100;
  const score = 100 - ((deviation - tolerance) / tolerance) * 50;
  return Math.max(0, Math.round(score));
}

/** Ziel erreicht gibt 100, darunter linearer Abfall bis zur Untergrenze. */
function atLeastScore(actual: number, target: number, tolerance: number): number {
  if (target <= 0) return 0;
  if (actual >= target) return 100;
  const shortfall = (target - actual) / target;
  if (shortfall <= tolerance) return 100;
  return Math.max(0, Math.round(100 - (shortfall - tolerance) * 200));
}

export interface StreakInput {
  /** Datumsstrings im Format YYYY-MM-DD, aufsteigend sortiert. */
  daysWithLog: string[];
  /** Heutiges Datum YYYY-MM-DD. */
  today: string;
}

/** Zaehlt zusammenhaengende Tage mit Eintrag bis heute oder gestern. */
export function currentStreak(input: StreakInput): number {
  const set = new Set(input.daysWithLog);
  let cursor = new Date(`${input.today}T00:00:00Z`);
  if (!set.has(input.today)) {
    cursor = addDays(cursor, -1);
    if (!set.has(toIso(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(toIso(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
