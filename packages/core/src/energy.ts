import type { EnergyBreakdown, Goal, MacroTargets, UserProfile } from "./types.js";

/**
 * Grundumsatz nach Mifflin-St Jeor.
 * Quelle: Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.
 * A new predictive equation for resting energy expenditure in healthy individuals.
 * Am J Clin Nutr. 1990;51(2):241-247.
 */
export function bmrMifflinStJeor(params: {
  sex: "male" | "female";
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const base = 10 * params.weightKg + 6.25 * params.heightCm - 5 * params.ageYears;
  return round(params.sex === "male" ? base + 5 : base - 161);
}

/**
 * Aktivitaetsfaktor aus Schritten und Trainingsvolumen.
 *
 * Die Basis folgt den gebraeuchlichen PAL Stufen 1.2 bis 1.9. Die Zuordnung von
 * Schrittzahl und Trainingsminuten zu einer PAL Stufe ist eine praktische
 * Naeherung, keine validierte Gleichung. Fuer exakte Werte braucht es
 * indirekte Kalorimetrie oder einen Abgleich ueber vier Wochen Gewichtsverlauf.
 */
export function activityFactor(params: { dailySteps: number; weeklyTrainingMinutes: number }): number {
  const stepComponent = clamp(params.dailySteps / 10000, 0, 2) * 0.2;
  const trainingComponent = clamp(params.weeklyTrainingMinutes / 300, 0, 2) * 0.18;
  return round(clamp(1.2 + stepComponent + trainingComponent, 1.2, 1.9), 3);
}

const GOAL_FACTOR: Record<Goal, number> = {
  fat_loss: -0.18,
  maintain: 0,
  lean_bulk: 0.1,
};

/**
 * Zielkalorien. Defizit 18 Prozent, Aufbau 10 Prozent Ueberschuss.
 * Diese Spannen sind gaengige Praxis in der Ernaehrungsberatung und halten den
 * Verlust an fettfreier Masse gering. Sie sind keine medizinische Vorgabe.
 */
export function energyBreakdown(profile: UserProfile): EnergyBreakdown {
  const bmr = bmrMifflinStJeor({
    sex: profile.sex,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    ageYears: profile.ageYears,
  });
  const weeklyTrainingMinutes = profile.sessions.reduce((sum, s) => sum + s.minutes, 0);
  const factor = activityFactor({ dailySteps: profile.dailySteps, weeklyTrainingMinutes });
  const tdee = profile.tdeeOverrideKcal && profile.tdeeOverrideKcal > 0
    ? profile.tdeeOverrideKcal
    : round(bmr * factor);
  const adjustment = round(tdee * GOAL_FACTOR[profile.goal]);
  return {
    bmrKcal: bmr,
    activityFactor: factor,
    tdeeKcal: tdee,
    goalAdjustmentKcal: adjustment,
    targetKcal: round(tdee + adjustment),
  };
}

/**
 * Makroverteilung.
 *
 * Protein: 1.8 g pro kg Koerpergewicht im Defizit, 1.6 g sonst.
 * Quelle: Morton RW et al. A systematic review, meta-analysis and meta-regression
 * of the effect of protein supplementation on resistance training-induced gains in
 * muscle mass and strength. Br J Sports Med. 2018;52(6):376-384. Der Zugewinn
 * flacht dort ab etwa 1.6 g/kg ab. Im Defizit liegt der Bedarf hoeher.
 *
 * Fett: 0.8 g pro kg als untere Grenze fuer Hormonproduktion und Aufnahme
 * fettloeslicher Vitamine. Praxiswert, keine harte Evidenzgrenze.
 *
 * Kohlenhydrate: der Rest der Kalorien.
 */
export function macroTargets(profile: UserProfile): MacroTargets {
  const energy = energyBreakdown(profile);
  const proteinPerKg = profile.goal === "fat_loss" ? 1.8 : 1.6;
  const proteinG = round(profile.weightKg * proteinPerKg);
  const fatG = round(profile.weightKg * 0.8);
  const remainingKcal = energy.targetKcal - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, round(remainingKcal / 4));
  return {
    kcal: energy.targetKcal,
    proteinG,
    fatG,
    carbsG,
    waterMl: waterTargetMl(profile),
  };
}

/**
 * Trinkmenge. 35 ml pro kg Koerpergewicht plus 600 ml je Trainingsstunde am Tag.
 * Praxisrichtwert. Die DGE nennt fuer Erwachsene rund 1.5 Liter Getraenke pro Tag
 * bei normaler Aktivitaet, Sportler liegen darueber. Das ist eine Naeherung,
 * kein individueller Messwert.
 */
export function waterTargetMl(profile: UserProfile, trainingMinutesToday = 0): number {
  const base = profile.weightKg * 35;
  const training = (trainingMinutesToday / 60) * 600;
  return Math.round((base + training) / 50) * 50;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
