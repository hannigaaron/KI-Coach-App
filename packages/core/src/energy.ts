import type { EnergyBreakdown, Goal, Leisure, MacroTargets, Occupation, UserProfile } from "./types.js";

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
 * Aktivitätsfaktor aus Schritten und Trainingsvolumen.
 *
 * Die Basis folgt den gebräuchlichen PAL Stufen 1.2 bis 1.9. Die Zuordnung von
 * Schrittzahl und Trainingsminuten zu einer PAL Stufe ist eine praktische
 * Näherung, keine validierte Gleichung. Für exakte Werte braucht es
 * indirekte Kalorimetrie oder einen Abgleich über vier Wochen Gewichtsverlauf.
 */
/**
 * Aufschläge für Arbeit und Freizeit.
 *
 * Sie bilden den Anteil ab, den Schritte nicht erfassen: Stehen, Tragen,
 * Treppen, Werkzeug halten. Die Werte sind praktische Näherungen, keine
 * gemessenen Größen. Wer es genau will, gleicht vier Wochen Gewichtsverlauf
 * gegen die geschätzte Zufuhr ab und korrigiert den Wert von Hand.
 */
const OCCUPATION_BONUS: Record<Occupation, number> = {
  sitzend: 0,
  gemischt: 0.03,
  stehend: 0.06,
  koerperlich: 0.1,
};

const LEISURE_BONUS: Record<Leisure, number> = {
  ruhig: 0,
  gemischt: 0.02,
  aktiv: 0.05,
};

export function activityFactor(params: {
  dailySteps: number;
  weeklyTrainingMinutes: number;
  occupation?: Occupation;
  leisure?: Leisure;
}): number {
  const stepComponent = clamp(params.dailySteps / 10000, 0, 2) * 0.2;
  const trainingComponent = clamp(params.weeklyTrainingMinutes / 300, 0, 2) * 0.18;
  const occupation = OCCUPATION_BONUS[params.occupation ?? "sitzend"];
  const leisure = LEISURE_BONUS[params.leisure ?? "gemischt"];
  return round(clamp(1.2 + stepComponent + trainingComponent + occupation + leisure, 1.2, 1.9), 3);
}

const GOAL_FACTOR: Record<Goal, number> = {
  fat_loss: -0.18,
  maintain: 0,
  lean_bulk: 0.1,
};

/**
 * Zielkalorien. Defizit 18 Prozent, Aufbau 10 Prozent Überschuss.
 * Diese Spannen sind gängige Praxis in der Ernährungsberatung und halten den
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
  const factor = activityFactor({
    dailySteps: profile.dailySteps,
    weeklyTrainingMinutes,
    occupation: profile.occupation,
    leisure: profile.leisure,
  });
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
 * Protein: 1.8 g pro kg Körpergewicht im Defizit, 1.6 g sonst.
 * Quelle: Morton RW et al. A systematic review, meta-analysis and meta-regression
 * of the effect of protein supplementation on resistance training-induced gains in
 * muscle mass and strength. Br J Sports Med. 2018;52(6):376-384. Der Zugewinn
 * flacht dort ab etwa 1.6 g/kg ab. Im Defizit liegt der Bedarf höher.
 *
 * Fett: 0.8 g pro kg als untere Grenze für Hormonproduktion und Aufnahme
 * fettlöslicher Vitamine. Praxiswert, keine harte Evidenzgrenze.
 *
 * Kohlenhydrate: der Rest der Kalorien.
 */
export function macroTargets(profile: UserProfile): MacroTargets {
  const energy = energyBreakdown(profile);
  const proteinG = proteinTarget(profile);
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
 * Proteinziel in Gramm.
 *
 * Ohne Angabe zum Körperfett wird auf das Gesamtgewicht gerechnet, 1.8 g je kg
 * im Defizit und 1.6 g sonst. Ist der Körperfettanteil bekannt, wird auf die
 * fettfreie Masse gerechnet, 2.4 g je kg im Defizit und 2.2 g sonst.
 *
 * Der zweite Weg ist bei höherem Körperfettanteil der sinnvollere: Fettgewebe
 * braucht kein Protein. Bei einem schlanken Menschen liefern beide Wege fast
 * dasselbe Ergebnis, bei 35 Prozent Körperfett spart der zweite Weg rund ein
 * Fünftel der Menge ein.
 */
export function proteinTarget(profile: UserProfile): number {
  const cutting = profile.goal === "fat_loss";
  const bodyFat = profile.bodyFatPercent;
  if (typeof bodyFat === "number" && bodyFat > 3 && bodyFat < 60) {
    const leanMass = profile.weightKg * (1 - bodyFat / 100);
    return round(leanMass * (cutting ? 2.4 : 2.2));
  }
  return round(profile.weightKg * (cutting ? 1.8 : 1.6));
}

/**
 * Trinkmenge. 35 ml pro kg Körpergewicht plus 600 ml je Trainingsstunde am Tag.
 * Praxisrichtwert. Die DGE nennt für Erwachsene rund 1.5 Liter Getränke pro Tag
 * bei normaler Aktivität, Sportler liegen darüber. Das ist eine Näherung,
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
