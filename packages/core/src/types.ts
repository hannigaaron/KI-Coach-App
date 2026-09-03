export type Sex = "male" | "female";

export type Goal = "fat_loss" | "maintain" | "lean_bulk";

export type TrainingType = "strength" | "team_sport" | "cardio" | "mobility";

export interface TrainingSession {
  type: TrainingType;
  /** Dauer in Minuten. */
  minutes: number;
  /** Wochentag 0 = Sonntag bis 6 = Samstag. */
  weekday: number;
  /** Startzeit lokal im Format HH:MM. */
  startsAt: string;
}

export interface UserProfile {
  sex: Sex;
  ageYears: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  /** Durchschnittliche Schritte pro Tag. */
  dailySteps: number;
  sessions: TrainingSession[];
  /** Lokale Aufstehzeit HH:MM. */
  wakeTime: string;
  /** Lokale Schlafenszeit HH:MM. */
  sleepTime: string;
  /** Optionaler manueller Ueberschreibwert fuer den Kalorienbedarf. */
  tdeeOverrideKcal?: number | null;
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
}

export interface EnergyBreakdown {
  bmrKcal: number;
  activityFactor: number;
  tdeeKcal: number;
  goalAdjustmentKcal: number;
  targetKcal: number;
}

export interface FoodEntry {
  name: string;
  quantity: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface DayTotals {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  waterMl: number;
}
