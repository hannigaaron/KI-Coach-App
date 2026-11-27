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
  /** Die Punkte je Teil, gerundet. Zusammen ergeben sie `wert`. */
  teile: SchlafTeile;
}

/** Punkte je Teil. Die Höchstwerte stehen in `SCHLAF_TEILE`. */
export interface SchlafTeile { dauer: number; ruhe: number; tief: number; rem: number }

/** Reihenfolge, Name und Höchstwert je Teil, für Ring und Legende. */
export const SCHLAF_TEILE = [
  { id: "dauer", name: "Dauer", max: 50 },
  { id: "ruhe", name: "Ruhe", max: 20 },
  { id: "tief", name: "Tiefschlaf", max: 15 },
  { id: "rem", name: "REM", max: 15 },
] as const;

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
  const roh = {
    dauer: 50 * Math.min(1, schlafMin / zielMin),
    ruhe: 20 * linear(effizienz, 65, 85),
    tief: 15 * linear(anteil.tief, PHASEN_SPANNE.tief[0] / 2, PHASEN_SPANNE.tief[0]),
    rem: 15 * linear(anteil.rem, PHASEN_SPANNE.rem[0] / 2, PHASEN_SPANNE.rem[0]),
  };
  const wert = Math.round(roh.dauer + roh.ruhe + roh.tief + roh.rem);
  return { wert, schlafMin, imBettMin, effizienz, anteil, zielMin, teile: teileRunden(roh, wert) };
}

/**
 * Rundet die Teile so, dass ihre Summe genau den Wert trifft. Einzeln
 * gerundet ergeben 49,6 und 19,6 und 14,6 und 14,6 zusammen 100 statt 99,
 * und eine Legende, deren Zeilen nicht die Zahl im Ring ergeben, glaubt
 * niemand. Der Rest geht an die Teile mit dem grössten Nachkommaanteil.
 */
function teileRunden(roh: SchlafTeile, wert: number): SchlafTeile {
  const ids = SCHLAF_TEILE.map((t) => t.id);
  const unten = Object.fromEntries(ids.map((k) => [k, Math.floor(roh[k])])) as unknown as SchlafTeile;
  let rest = wert - ids.reduce((s, k) => s + unten[k], 0);
  for (const k of [...ids].sort((a, b) => (roh[b] - Math.floor(roh[b])) - (roh[a] - Math.floor(roh[a])))) {
    if (rest <= 0) break;
    unten[k]++;
    rest--;
  }
  return unten;
}

/** Ein Wort für den Wert, wie auf dem Ring. Die Stufen sind eine Regel der App. */
export function schlafUrteil(wert: number): string {
  return wert >= 90 ? "Sehr hoch" : wert >= 75 ? "Hoch" : wert >= 60 ? "Mittel" : wert >= 40 ? "Niedrig" : "Sehr niedrig";
}

/**
 * Ein Satz unter dem Ring. Er nennt den Teil, der am meisten Punkte
 * gekostet hat, mit der Zahl dahinter. "Schlechter Schlaf" ohne Grund hilft
 * niemandem, "48 Minuten unter deinem Ziel" schon.
 */
export function schlafSatz(w: Schlafwert, { woche = false }: { woche?: boolean } = {}): string {
  const fehlt = SCHLAF_TEILE.map((t) => ({ id: t.id, fehlt: t.max - w.teile[t.id] }))
    .sort((a, b) => b.fehlt - a.fehlt)[0];
  const nacht = woche ? "im Schnitt" : "diese Nacht";
  if (!fehlt || fehlt.fehlt <= 2) return woche ? "Du hast diese Woche sehr gut geschlafen." : "Du hast diese Nacht sehr gut geschlafen.";
  const dauer = (min: number) => {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
  };
  switch (fehlt.id) {
    case "dauer": return `Am meisten kostet die Dauer: ${nacht} ${dauer(w.zielMin - w.schlafMin)} unter deinem Ziel.`;
    case "ruhe": return `Am meisten kostet die Ruhe: ${nacht} ${dauer(w.imBettMin - w.schlafMin)} wach im Bett.`;
    case "tief": return `Am meisten kostet der Tiefschlaf: ${nacht} ${w.anteil.tief} Prozent, üblich sind ab ${PHASEN_SPANNE.tief[0]}.`;
    default: return `Am meisten kostet der REM Schlaf: ${nacht} ${w.anteil.rem} Prozent, üblich sind ab ${PHASEN_SPANNE.rem[0]}.`;
  }
}

/**
 * Der Schnitt über mehrere Nächte, für den Rückblick der Woche. Erst ab drei
 * Nächten: zwei Nächte beschreiben die zwei Nächte und nicht die Woche.
 * Gemittelt werden Wert, Teile und die Minuten, damit `schlafSatz` mit
 * denselben Zahlen arbeitet wie für eine Nacht.
 */
export function schlafwertSchnitt(werte: Array<Schlafwert | null | undefined>): (Schlafwert & { naechte: number }) | null {
  const da = werte.filter((w): w is Schlafwert => !!w);
  if (da.length < 3) return null;
  const mittel = (f: (w: Schlafwert) => number) => da.reduce((s, w) => s + f(w), 0) / da.length;
  const roh = {
    dauer: mittel((w) => w.teile.dauer), ruhe: mittel((w) => w.teile.ruhe),
    tief: mittel((w) => w.teile.tief), rem: mittel((w) => w.teile.rem),
  };
  const wert = Math.round(mittel((w) => w.wert));
  return {
    wert, naechte: da.length,
    schlafMin: Math.round(mittel((w) => w.schlafMin)),
    imBettMin: Math.round(mittel((w) => w.imBettMin)),
    effizienz: Math.round(mittel((w) => w.effizienz)),
    zielMin: Math.round(mittel((w) => w.zielMin)),
    anteil: { tief: Math.round(mittel((w) => w.anteil.tief)), rem: Math.round(mittel((w) => w.anteil.rem)), kern: Math.round(mittel((w) => w.anteil.kern)) },
    teile: teileRunden(roh, wert),
  };
}

/** Ein Satz zur Phase gegen ihre Spanne. */
export function phasenUrteil(anteil: number, [von, bis]: readonly [number, number]): string {
  if (anteil < von) return "unter der üblichen Spanne";
  if (anteil > bis) return "über der üblichen Spanne";
  return "in der üblichen Spanne";
}

export interface SchlafIndex {
  wert: number;
  urteil: string;
  satz: string;
  teile: Array<{ id: keyof SchlafTeile; name: string; max: number; wert: number }>;
  naechte?: number;
}

/** Alles, was Ring und Legende zeigen, in einer Form für Nacht und Woche. */
export function schlafIndex(w: Schlafwert & { naechte?: number }, { woche = false }: { woche?: boolean } = {}): SchlafIndex {
  return {
    wert: w.wert, urteil: schlafUrteil(w.wert), satz: schlafSatz(w, { woche }),
    teile: SCHLAF_TEILE.map((t) => ({ id: t.id, name: t.name, max: t.max, wert: w.teile[t.id] })),
    ...(w.naechte ? { naechte: w.naechte } : {}),
  };
}
