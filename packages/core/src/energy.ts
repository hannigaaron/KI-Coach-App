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
    targetKcal: round(tdee + adjustment + korrektur(profile, "kcal", KORREKTUR_GRENZE.kcal)),
  };
}

export interface AktivitaetsAbgleich {
  /** Aktive Kalorien, mit denen das Ziel schon rechnet. */
  geplantKcal: number;
  /** Aktive Kalorien laut Apple Health an diesem Tag. */
  gemessenKcal: number;
  /** Was auf das Tagesziel kommt. Null, solange die Messung unter der Planung liegt. */
  zuschlagKcal: number;
}

/**
 * Was die Uhr über dem eingeplanten Verbrauch misst.
 *
 * Das Ziel rechnet schon mit Bewegung: der Aktivitätsfaktor trägt Schritte
 * und Trainingsminuten der Woche, gleichmässig auf jeden Tag verteilt. Die
 * aktiven Kalorien der Uhr einfach dazuzuzählen hiesse, das Training
 * zweimal zu essen. Eingeplant sind deshalb der Verbrauch ohne Grundumsatz
 * und ohne die Verdauung, die rund zehn Prozent des Gesamtverbrauchs
 * ausmacht (Westerterp, Nutrition and Metabolism 2004). Was die Uhr darüber
 * misst, kommt dazu, im Defizit und im Aufbau mit demselben Anteil wie das
 * Ziel selbst. Gesenkt wird nie: der Tag läuft noch, und morgens hat
 * niemand schon seinen Verbrauch erreicht.
 *
 * Die aktiven Kalorien der Apple Watch sind eine Schätzung aus Puls und
 * Bewegung, keine Messung im Labor. Höchstens 1500 kcal Zuschlag, damit ein
 * falscher Wert das Ziel nicht verdoppelt. Eine Regel der App.
 */
export function aktivitaetsZuschlag(profile: UserProfile, aktivKcal: number): AktivitaetsAbgleich | null {
  if (!Number.isFinite(aktivKcal) || aktivKcal <= 0) return null;
  const e = energyBreakdown(profile);
  const geplant = Math.max(0, round(e.tdeeKcal * 0.9 - e.bmrKcal));
  const gemessen = round(aktivKcal);
  const ueber = Math.max(0, gemessen - geplant);
  const zuschlag = Math.min(1500, round(ueber * (1 + GOAL_FACTOR[profile.goal])));
  return { geplantKcal: geplant, gemessenKcal: gemessen, zuschlagKcal: zuschlag };
}

/**
 * Makroverteilung.
 *
 * Protein: 2.0 g pro kg Körpergewicht im Defizit, 1.6 g sonst, nie darunter.
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
  // Eine Korrektur nach unten endet an der Untergrenze, nie darunter.
  const proteinG = Math.max(
    round(profile.weightKg * PROTEIN_MIN_G_JE_KG),
    proteinTarget(profile) + korrektur(profile, "proteinG", KORREKTUR_GRENZE.proteinG),
  );
  const fatG = Math.max(0, round(profile.weightKg * 0.8) + korrektur(profile, "fatG", KORREKTUR_GRENZE.fatG));
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
 * Wie weit der Nutzer vom Vorschlag abweichen darf.
 *
 * Die Grenzen sind eine Regel und keine Messung. Sie fangen einen Tippfehler
 * oder ein festgeklemmtes Plus ab, bevor daraus ein Tagesziel von 6000 kcal
 * wird. Kohlenhydrate haben keine eigene Korrektur: sie füllen den Rest, damit
 * kcal = Protein*4 + Fett*9 + Kohlenhydrate*4 immer aufgeht.
 */
export const KORREKTUR_GRENZE = { kcal: 1000, proteinG: 100, fatG: 60 } as const;

function korrektur(profile: UserProfile, feld: "kcal" | "proteinG" | "fatG", grenze: number): number {
  const wert = profile.zielKorrektur?.[feld];
  if (wert === null || wert === undefined || !Number.isFinite(wert)) return 0;
  return Math.max(-grenze, Math.min(grenze, Math.round(wert)));
}

/**
 * Proteinziel in Gramm.
 *
 * Ohne Angabe zum Körperfett wird auf das Gesamtgewicht gerechnet, 2.0 g je kg
 * im Defizit und 1.6 g sonst. Ist der Körperfettanteil bekannt, zählt
 * zusätzlich die fettfreie Masse, 2.4 g je kg im Defizit und 2.2 g sonst, und
 * der höhere Wert gilt. Unter die Werte je kg Körpergewicht fällt das Ziel nie.
 *
 * Der zweite Weg ist bei höherem Körperfettanteil der sinnvollere: Fettgewebe
 * braucht kein Protein. Bei einem schlanken Menschen liefern beide Wege fast
 * dasselbe Ergebnis, bei 35 Prozent Körperfett spart der zweite Weg rund ein
 * Fünftel der Menge ein.
 */
export function proteinTarget(profile: UserProfile): number {
  const cutting = profile.goal === "fat_loss";
  const gesamt = profile.weightKg * (cutting ? PROTEIN_DIAET_G_JE_KG : PROTEIN_MIN_G_JE_KG);
  const bodyFat = profile.bodyFatPercent;
  if (typeof bodyFat === "number" && bodyFat > 3 && bodyFat < 60) {
    const leanMass = profile.weightKg * (1 - bodyFat / 100);
    return round(Math.max(gesamt, leanMass * (cutting ? 2.4 : 2.2)));
  }
  return round(gesamt);
}

/**
 * Untergrenze für Protein, in jedem Ziel und nach jeder Korrektur: 1,6 g je kg
 * Körpergewicht. Eine Regel von Coach Aaron, gestützt auf Morton und andere
 * 2018, wo der Zugewinn an Muskelmasse um diesen Wert abflacht. Vorher konnte
 * die Rechnung über die fettfreie Masse oder eine Minuskorrektur darunter
 * fallen.
 */
export const PROTEIN_MIN_G_JE_KG = 1.6;

/**
 * Protein in der Diät, 2,0 g je kg Körpergewicht. Im Defizit schützt mehr
 * Protein die Muskelmasse: Helms und andere 2014 nennen für schlanke
 * Trainierende 2,3 bis 3,1 g je kg fettfreier Masse, das ISSN Positionspapier
 * (Jäger und andere 2017) 1,4 bis 2,0 g je kg und im Defizit eher mehr. Die
 * 2,0 sind eine Regel von Coach Aaron innerhalb dieser Spanne.
 */
export const PROTEIN_DIAET_G_JE_KG = 2.0;

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
