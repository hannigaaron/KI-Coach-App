/**
 * Eine Nacht aus Apple Health: Phasen, Effizienz und ein Schlafwert.
 *
 * Die Phasen kommen von der Uhr oder dem Ring, nicht aus einem Schlaflabor.
 * Wearables erkennen Schlaf und Wachsein recht gut, die einzelnen Phasen
 * deutlich schlechter (de Zambotti und andere, Med Sci Sports Exerc 2019,
 * Chinoy und andere, Sleep 2021). Der Wert ist deshalb eine Zusammenfassung
 * und keine Diagnose, und das steht in jeder Ausgabe.
 *
 * Gewichtung, eine Regel der App: Dauer gegen das Ziel 50, Effizienz 20,
 * Tiefschlaf 15, REM 15. Die Dauer wiegt am meisten, weil sie die einzige
 * Grösse ist, für die es einen Konsens gibt: mindestens sieben Stunden für
 * Erwachsene (Watson und andere, Konsens von AASM und SRS, Sleep 2015).
 * Die Spannen der Phasen sind übliche Richtwerte für junge Erwachsene nach
 * Ohayon und andere, Sleep 2004, mit grosser Streuung von Mensch zu Mensch.
 */

export type Phase = "d" | "r" | "c" | "w";

export interface SchlafNacht {
  tag: string;
  /** Beginn und Ende in Millisekunden. */
  beginn: number;
  ende: number;
  tiefMin: number;
  remMin: number;
  kernMin: number;
  wachMin: number;
  wachPhasen: number;
  /** Name der App, aus der die Phasen stammen. */
  quelle?: string;
  /** [Minuten seit Beginn, Dauer in Minuten, Phase] */
  phasen?: Array<[number, number, Phase]>;
}

export interface Schlafwert {
  wert: number;
  schlafMin: number;
  imBettMin: number;
  /** 0 bis 100. */
  effizienz: number;
  anteil: { tief: number; rem: number; kern: number };
  zielMin: number;
}

/** Richtwerte je Phase in Prozent der Schlafzeit, siehe oben. */
export const PHASEN_SPANNE = { kern: [50, 60], tief: [13, 23], rem: [20, 25] } as const;

/** Das Schlafziel: der eigene Plan aus Schlafens und Aufstehzeit, nie unter sieben Stunden. */
export function schlafZiel(sleepTime?: string, wakeTime?: string): number {
  const min = (x?: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(x ?? ""));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const s = min(sleepTime);
  const w = min(wakeTime);
  if (s === null || w === null) return 480;
  const plan = (w - s + 1440) % 1440;
  return Math.max(420, Math.min(600, plan || 480));
}

function linear(x: number, null0: number, voll: number): number {
  if (voll === null0) return x >= voll ? 1 : 0;
  return Math.max(0, Math.min(1, (x - null0) / (voll - null0)));
}

export function schlafwert(n: SchlafNacht, zielMin = 480): Schlafwert | null {
  const schlafMin = Math.round((n.tiefMin || 0) + (n.remMin || 0) + (n.kernMin || 0));
  const imBettMin = Math.round((n.ende - n.beginn) / 60000);
  if (!(schlafMin > 60) || !(imBettMin > 0)) return null;
  const effizienz = Math.min(100, Math.round((schlafMin / imBettMin) * 100));
  const anteil = {
    tief: Math.round((n.tiefMin / schlafMin) * 100),
    rem: Math.round((n.remMin / schlafMin) * 100),
    kern: Math.round((n.kernMin / schlafMin) * 100),
  };
  // Effizienz ab 85 Prozent voll, die übliche Grenze für gesunden Schlaf,
  // unter 65 Prozent null. Die Phasen voll ab dem unteren Rand der Spanne,
  // null bei der Hälfte davon.
  const teile =
    50 * Math.min(1, schlafMin / zielMin)
    + 20 * linear(effizienz, 65, 85)
    + 15 * linear(anteil.tief, PHASEN_SPANNE.tief[0] / 2, PHASEN_SPANNE.tief[0])
    + 15 * linear(anteil.rem, PHASEN_SPANNE.rem[0] / 2, PHASEN_SPANNE.rem[0]);
  return { wert: Math.round(teile), schlafMin, imBettMin, effizienz, anteil, zielMin };
}

/** Ein Satz zur Phase gegen ihre Spanne. */
export function phasenUrteil(anteil: number, [von, bis]: readonly [number, number]): string {
  if (anteil < von) return "unter der üblichen Spanne";
  if (anteil > bis) return "über der üblichen Spanne";
  return "in der üblichen Spanne";
}
