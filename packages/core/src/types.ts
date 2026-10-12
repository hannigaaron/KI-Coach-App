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
  /** Wann das Handy abends weggelegt wird. HH:MM. */
  handyAus?: string;
  /** Wann morgens das erste Mal aufs Handy geschaut wird. HH:MM. */
  handyMorgens?: string;
  /**
   * Woher die Tagesränder kommen. Ohne Angabe gilt "gleich", damit bestehende
   * Profile ohne dieses Feld unverändert weiterlaufen.
   */
  randModus?: "gleich" | "wochentag";
  /**
   * Der Nutzer hat gesagt, dass seine Tage wechseln, etwa im Schichtdienst.
   * Die Standardzeiten sind dann eine Schätzung und keine Zusage. Der Coach
   * fragt danach, statt sie als gegeben zu nehmen, und trägt die Antwort als
   * Ausnahme für den Tag ein.
   */
  wechselndeZeiten?: boolean;
  /**
   * Zeiten je Wochentag. Schlüssel ist der Wochentag als Zahl wie bei
   * `Date.getDay()`, Sonntag ist 0. Fehlt ein Tag, gilt der Standard.
   */
  wochenraender?: Record<string, { wakeTime?: string; sleepTime?: string; handyAus?: string; handyMorgens?: string }>;
  /**
   * Zeiten für einzelne Tage, Schlüssel JJJJ-MM-TT. Schlagen Wochentag und
   * Standard. Für Schichten, die nicht am Wochentag hängen.
   */
  tagesausnahmen?: Record<string, { wakeTime: string; sleepTime: string; handyAus?: string; handyMorgens?: string }>;
  /** Optionaler manueller Überschreibwert für den Kalorienbedarf. */
  tdeeOverrideKcal?: number | null;
  /**
   * Was der Nutzer am Vorschlag nachgestellt hat, als Abstand und nicht als
   * fester Wert. Ein fester Wert bliebe stehen, wenn sich das Gewicht ändert
   * oder der gemessene Verbrauch die Formel ablöst. Ein Abstand wandert mit:
   * wer 200 kcal mehr wollte, bekommt auch nach der Messung 200 mehr.
   */
  zielKorrektur?: { kcal?: number; proteinG?: number; fatG?: number } | null;
  /**
   * Was nie vorgeschlagen werden darf und wie sich jemand ernährt. Als Listen
   * und nicht nur als Notiz im Gedächtnis: ein Rezeptfilter muss prüfen
   * können, ob Soja drin ist, und das geht gegen eine Liste zuverlässig und
   * gegen einen Satz nicht.
   */
  ernaehrung?: {
    form?: "omnivor" | "flexitarisch" | "vegetarisch" | "pescetarisch" | "vegan";
    allergien?: string[];
    unvertraeglichkeiten?: string[];
    ausschluesse?: string[];
  };
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
