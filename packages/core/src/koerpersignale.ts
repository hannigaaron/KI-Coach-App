/**
 * Körpersignale aus Apple Health gegen den eigenen Schnitt: HRV, Ruhepuls,
 * Atemfrequenz, Hauttemperatur in der Nacht, dazu Puls über den Tag und
 * Sauerstoff.
 *
 * Ein Stresswert steht in Apple Health nicht. Garmin, Oura und Whoop rechnen
 * ihren eigenen und geben ihn nicht an Health weiter. Die Lage hier ist eine
 * Ableitung und keine Messung: eine HRV unter dem eigenen Schnitt und ein
 * Ruhepuls darüber sind die zwei Zeichen, die unter Belastung, schlechtem
 * Schlaf oder einem beginnenden Infekt am häufigsten auftreten (HRV und
 * Stress: Kim und andere, Psychiatry Investigation 2018, Ruhepuls und
 * Erholung: Buchheit, Frontiers in Physiology 2014). Verglichen wird nur mit
 * dem eigenen Schnitt, denn zwischen zwei Menschen sagen HRV Werte wenig.
 *
 * Die Schwellen sind Regeln der App: HRV 7 und 15 Prozent unter dem Schnitt,
 * Ruhepuls 3 und 5 Schläge darüber, Temperatur 0,5 Grad, Atmung 1,5 Atemzüge.
 */

export interface SignalTag {
  tag: string;
  hrv?: number | null;
  ruhepuls?: number | null;
  atemfrequenz?: number | null;
  handgelenkTemp?: number | null;
}

export type SignalArt = "hrv" | "ruhepuls" | "atemfrequenz" | "handgelenkTemp";

export interface Signal {
  art: SignalArt;
  /** Der jüngste Wert, heute oder gestern. */
  wert: number;
  tag: string;
  /** Median der 28 Tage davor, null bei weniger als sieben Werten. */
  basis: number | null;
  /** Wert minus Basis, in der Einheit des Signals. */
  abweichung: number | null;
  /** Belastet heisst: in die Richtung, die auf Belastung deutet. */
  richtung: "belastet" | "erholt" | "im_rahmen" | "offen";
  /** Die letzten 14 Tage für die Linie, null ohne Wert. */
  verlauf: Array<number | null>;
}

export interface Koerperlage {
  stufe: "entspannt" | "im_rahmen" | "angespannt" | "offen";
  punkte: number;
  signale: Signal[];
  text: string;
}

const MIN_BASIS = 7;

function median(werte: number[]): number {
  const s = [...werte].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function zahl(x: unknown): number | null {
  return x === null || x === undefined || !Number.isFinite(Number(x)) || Number(x) <= 0 ? null : Number(x);
}

function tagMinus(tag: string, n: number): string {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Ein Signal gegen die 28 Tage vor seinem jüngsten Wert. */
export function signalVon(tage: SignalTag[], art: SignalArt, heute: string): Signal | null {
  const nachTag = new Map(tage.map((t) => [t.tag, t]));
  const jung = [heute, tagMinus(heute, 1)].find((t) => zahl(nachTag.get(t)?.[art]) !== null);
  if (!jung) return null;
  const wert = zahl(nachTag.get(jung)![art])!;
  const davor: number[] = [];
  for (let i = 1; i <= 28; i++) {
    const v = zahl(nachTag.get(tagMinus(jung, i))?.[art]);
    if (v !== null) davor.push(v);
  }
  const basis = davor.length >= MIN_BASIS ? median(davor) : null;
  const abweichung = basis === null ? null : Math.round((wert - basis) * 100) / 100;
  let richtung: Signal["richtung"] = "offen";
  if (basis !== null && abweichung !== null) {
    const g = GRENZE[art];
    const belastet = art === "hrv" ? -abweichung / basis * 100 : abweichung;
    richtung = belastet >= g.leicht ? "belastet" : belastet <= -g.leicht ? "erholt" : "im_rahmen";
  }
  const verlauf = Array.from({ length: 14 }, (_, i) => zahl(nachTag.get(tagMinus(heute, 13 - i))?.[art]));
  return { art, wert, tag: jung, basis, abweichung, richtung, verlauf };
}

/** Ab wann ein Signal leicht und deutlich auf Belastung deutet. HRV in Prozent. */
const GRENZE: Record<SignalArt, { leicht: number; deutlich: number }> = {
  hrv: { leicht: 7, deutlich: 15 },
  ruhepuls: { leicht: 3, deutlich: 5 },
  atemfrequenz: { leicht: 1, deutlich: 1.5 },
  handgelenkTemp: { leicht: 0.3, deutlich: 0.5 },
};

/**
 * Die Lage aus allen Signalen mit eigenem Schnitt. HRV und Ruhepuls zählen
 * bis zwei Punkte, Atmung und Temperatur einen, weil sie seltener gemessen
 * werden und öfter aus anderen Gründen schwanken. Ab drei Punkten
 * angespannt, null heisst entspannt.
 */
export function koerperlage(tage: SignalTag[], heute: string): Koerperlage {
  const signale = (["hrv", "ruhepuls", "atemfrequenz", "handgelenkTemp"] as SignalArt[])
    .map((a) => signalVon(tage, a, heute)).filter((s): s is Signal => s !== null);
  const mitBasis = signale.filter((s) => s.basis !== null);
  if (!mitBasis.some((s) => s.art === "hrv" || s.art === "ruhepuls")) {
    return { stufe: "offen", punkte: 0, signale, text: "Für eine Einschätzung braucht daevo HRV oder Ruhepuls an mindestens sieben der letzten 28 Tage." };
  }
  let punkte = 0;
  for (const s of mitBasis) {
    const g = GRENZE[s.art];
    const belastet = s.art === "hrv" ? -(s.abweichung! / s.basis!) * 100 : s.abweichung!;
    const max = s.art === "hrv" || s.art === "ruhepuls" ? 2 : 1;
    if (belastet >= g.deutlich) punkte += max;
    else if (belastet >= g.leicht) punkte += max === 2 ? 1 : 0;
  }
  const erholt = mitBasis.filter((s) => s.richtung === "erholt").length;
  const stufe = punkte >= 3 ? "angespannt" : punkte === 0 && erholt >= 1 ? "entspannt" : "im_rahmen";
  const text = stufe === "angespannt"
    ? "Dein Körper zeigt Zeichen von Belastung: weniger HRV oder mehr Ruhepuls als sonst. Das kommt von Stress, wenig Schlaf, viel Training oder einem beginnenden Infekt. Heute eher leichter trainieren und früher ins Bett."
    : stufe === "entspannt"
      ? "Deine Werte liegen auf der erholten Seite deines Schnitts. Ein guter Tag für Fortschritt im Training."
      : "Deine Werte liegen im Rahmen deines eigenen Schnitts.";
  return { stufe, punkte, signale, text };
}

/** Kurztext für den Coach. */
export function koerperlageText(l: Koerperlage): string {
  const name: Record<SignalArt, string> = { hrv: "HRV", ruhepuls: "Ruhepuls", atemfrequenz: "Atemfrequenz", handgelenkTemp: "Hauttemperatur nachts" };
  const einheit: Record<SignalArt, string> = { hrv: "ms", ruhepuls: "bpm", atemfrequenz: "Atemzüge/min", handgelenkTemp: "°C" };
  const zeilen = l.signale.map((s) => {
    const abw = s.abweichung === null ? "noch kein eigener Schnitt" : `${s.abweichung > 0 ? "+" : ""}${String(s.abweichung).replace(".", ",")} gegen deinen Schnitt von ${String(Math.round(s.basis! * 10) / 10).replace(".", ",")}`;
    return `${name[s.art]} ${String(s.wert).replace(".", ",")} ${einheit[s.art]}, ${abw}`;
  });
  const stufe = { entspannt: "entspannt", im_rahmen: "im Rahmen", angespannt: "angespannt", offen: "offen" }[l.stufe];
  return [`Körperlage aus Apple Health, abgeleitet und keine Stressmessung: ${stufe}.`, ...zeilen].join("\n");
}
