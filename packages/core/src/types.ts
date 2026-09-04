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

/** Wie der Alltag außerhalb von Sport aussieht. Beeinflusst den Grundverbrauch. */
export type Occupation = "sitzend" | "gemischt" | "stehend" | "koerperlich";
export type Leisure = "ruhig" | "gemischt" | "aktiv";

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
  /** Optionaler manueller Überschreibwert für den Kalorienbedarf. */
  tdeeOverrideKcal?: number | null;
  /** Wie der Arbeitstag aussieht. Ohne Angabe wird sitzend angenommen. */
  occupation?: Occupation;
  /** Wie die Freizeit aussieht. Ohne Angabe wird gemischt angenommen. */
  leisure?: Leisure;
  /**
   * Geschätzter Körperfettanteil in Prozent. Nur gesetzt, wenn der Nutzer ihn
   * angegeben hat. Wird genutzt, um Protein auf die fettfreie Masse zu
   * beziehen statt auf das Gesamtgewicht.
   */
  bodyFatPercent?: number | null;
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
