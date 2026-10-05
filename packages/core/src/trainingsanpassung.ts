/**
 * Das Training an den Tag anpassen, statt den Tag ans Training.
 *
 * Ein Plan wird geschrieben, wenn man ausgeschlafen ist. Trainiert wird an
 * dem Tag, den man dann hat. Nach fünf Stunden Schlaf, mit voller Woche und
 * einem Kalender ohne Lücke denselben Plan durchzuziehen, ist kein Ehrgeiz,
 * sondern Planlosigkeit mit Hantel.
 *
 * Drei Signale kommen aus dem, was die App wirklich hat:
 *
 * Schlaf. Unter sechs Stunden oder eine Qualität von höchstens 4 von 10. Die
 * Schwelle von sechs Stunden ist die Definition von akutem Schlafverlust in
 * Craven und anderen, Sports Medicine 2022, einer Meta-Analyse über 69
 * Arbeiten. Dort sanken Kraft, anaerobe Leistung, Ausdauer und Technik, und
 * der Verlust wuchs mit jeder weiteren wachen Stunde um rund 0,4 Prozent.
 *
 * Stress. Ab 65 von 100 im Check-in. Dieselbe Schwelle wie in
 * `braucheZeitsparend`, damit die App an zwei Stellen nicht zwei Meinungen
 * hat. Stults-Kolehmainen und Bartholomew, Medicine and Science in Sports and
 * Exercise 2012, fanden, dass Menschen mit mehr Stress sich nach schwerem
 * Krafttraining langsamer erholten.
 *
 * Bereitschaft auf "runterfahren". Das ist kein eigenes Signal, sondern die
 * Zusammenfassung der beiden anderen plus Belastung. Gezählt wird es nur,
 * wenn keines der anderen beiden schon zählt, sonst stünde derselbe schlechte
 * Schlaf zweimal in der Rechnung.
 *
 * Der volle Tag ist eine andere Achse. Er sagt nichts über die Erholung, nur
 * über die Zeit. Deshalb kürzt er die Dauer und nicht die Intensität.
 *
 * Wie stark angepasst wird, ist eine Regel und keine Messung. Die Quellen
 * stützen die Richtung, nicht die genauen Zahlen. Gesteuert wird über
 * Wiederholungen in Reserve nach Zourdos und anderen 2016 und Helms und
 * anderen 2016: wer zwei Wiederholungen vor dem Versagen aufhört statt einer,
 * passt die Last an den Tag an, ohne ein Gewicht vorschreiben zu müssen, das
 * die App nicht kennt.
 */

import type { Bereitschaft } from "./bereitschaft.js";
import type { TrainingType } from "./types.js";

/** Unter so vielen Stunden Schlaf gilt die Nacht als kurz. Craven und andere 2022. */
export const SCHLAF_KURZ_STUNDEN = 6;
/** Bis zu dieser Qualität auf der Skala von 1 bis 10 gilt die Nacht als schlecht. */
export const SCHLAF_SCHLECHT_QUALITAET = 4;
/** Ab diesem Stress von 100 gilt der Tag als belastet. */
export const STRESS_HOCH = 65;
/** Unter so vielen freien Minuten lohnt keine eigene Einheit. */
export const MIN_EINHEIT_MINUTEN = 20;

export type Stufe = "normal" | "reduziert" | "leicht";

export interface GeplanteEinheit {
  art: TrainingType;
  minuten: number;
  /** Woher die Einheit kommt, für die Begründung. */
  quelle: string;
}

export interface AnpassungsEingabe {
  schlafMinuten?: number | null;
  schlafQualitaet?: number | null;
  stress?: number | null;
  bereitschaft?: Bereitschaft | null;
  /** Freie Minuten heute laut Kalender, oder null ohne Kalender. */
  freieMinuten?: number | null;
  geplant?: GeplanteEinheit | null;
  /**
   * Was der Nutzer im Gespräch gesagt hat. "Ich hab schlecht geschlafen" ist
   * ein Signal, aber keine Zahl, und eine Zahl dafür zu erfinden wäre genau
   * der Fehler, den diese App nicht machen darf. Deshalb als Ja oder Nein.
   */
  angaben?: { schlechtGeschlafen?: boolean; gestresst?: boolean };
}

export interface Anpassung {
  stufe: Stufe;
  /** Anteil der geplanten Sätze oder Dauer, 0 bis 1. */
  volumenFaktor: number;
  /** Wie viele Wiederholungen mehr in Reserve bleiben sollen. */
  reserveZusatz: number;
  /** Obergrenze für die Dauer, wenn der Kalender sie setzt. */
  maxMinuten: number | null;
  /** Jede Zeile mit der Zahl, auf der sie beruht. */
  gruende: string[];
  /** Konkrete Anweisungen für die geplante Einheit. */
  anweisungen: string[];
}

/** Volumen und Reserve je Stufe. Regel, keine Messung. */
const STUFEN: Record<Stufe, { volumen: number; reserve: number }> = {
  normal: { volumen: 1, reserve: 0 },
  reduziert: { volumen: 0.75, reserve: 1 },
  leicht: { volumen: 0.5, reserve: 2 },
};

export function trainingAnpassen(e: AnpassungsEingabe): Anpassung {
  const gruende: string[] = [];
  let signale = 0;

  const schlafMin = zahl(e.schlafMinuten);
  const qualitaet = zahl(e.schlafQualitaet);
  const kurz = schlafMin !== null && schlafMin > 0 && schlafMin < SCHLAF_KURZ_STUNDEN * 60;
  const schlecht = qualitaet !== null && qualitaet >= 1 && qualitaet <= SCHLAF_SCHLECHT_QUALITAET;
  const gesagtSchlaf = e.angaben?.schlechtGeschlafen === true;
  if (kurz || schlecht || gesagtSchlaf) {
    signale += 1;
    const teile: string[] = [];
    if (kurz) teile.push(`${dauer(schlafMin!)} Schlaf`);
    if (schlecht) teile.push(`Schlafqualität ${qualitaet} von 10`);
    if (gesagtSchlaf && !kurz && !schlecht) teile.push("Du hast gesagt, dass du schlecht geschlafen hast");
    gruende.push(`${teile.join(", ")}. Nach kurzem Schlaf sinkt die Leistung messbar, Craven und andere 2022.`);
  }

  const stress = zahl(e.stress);
  const hoch = stress !== null && stress >= STRESS_HOCH && stress <= 100;
  if (hoch || e.angaben?.gestresst === true) {
    signale += 1;
    const wert = hoch ? `Stress ${Math.round(stress!)} von 100` : "Du hast gesagt, dass du gestresst bist";
    gruende.push(`${wert}. Mit hohem Stress erholt sich die Muskulatur langsamer, Stults-Kolehmainen und Bartholomew 2012.`);
  }

  if (signale === 0 && e.bereitschaft?.urteil === "runterfahren") {
    signale += 1;
    gruende.push(`Bereitschaft ${e.bereitschaft.wert} von 100, am schwächsten: ${e.bereitschaft.schwaechster.name}.`);
  }

  const stufe: Stufe = signale >= 2 ? "leicht" : signale === 1 ? "reduziert" : "normal";
  const { volumen, reserve } = STUFEN[stufe];

  // Der Kalender setzt eine Obergrenze für die Dauer, nicht für die
  // Intensität. Fünfzehn Minuten bleiben für Umziehen und Weg.
  const frei = zahl(e.freieMinuten);
  let maxMinuten: number | null = null;
  if (frei !== null && e.geplant && frei - 15 < e.geplant.minuten * volumen) {
    maxMinuten = Math.max(0, Math.floor((frei - 15) / 5) * 5);
    gruende.push(`Laut Kalender sind heute noch ${frei} Minuten frei, geplant waren ${e.geplant.minuten}.`);
  }

  return {
    stufe,
    volumenFaktor: volumen,
    reserveZusatz: reserve,
    maxMinuten,
    gruende,
    anweisungen: anweisungen(stufe, e.geplant ?? null, maxMinuten),
  };
}

function anweisungen(stufe: Stufe, geplant: GeplanteEinheit | null, maxMinuten: number | null): string[] {
  const a: string[] = [];
  const { volumen, reserve } = STUFEN[stufe];
  const prozent = Math.round(volumen * 100);

  if (maxMinuten !== null && maxMinuten < MIN_EINHEIT_MINUTEN) {
    a.push(`Für eine eigene Einheit reicht die Zeit heute nicht, es bleiben ${maxMinuten} Minuten. Zehn Minuten Mobilität oder ein Spaziergang zählen trotzdem.`);
    return a;
  }

  const art = geplant?.art ?? "strength";
  if (stufe === "normal") {
    a.push(geplant ? `Trainier wie geplant, ${geplant.minuten} Minuten.` : "Nichts spricht heute gegen dein normales Training.");
  } else if (art === "strength") {
    a.push(`Sätze je Übung auf etwa ${prozent} Prozent, bei vier Sätzen also ${Math.max(1, Math.round(4 * volumen))}.`);
    a.push(`Jeden Satz ${reserve} ${reserve === 1 ? "Wiederholung" : "Wiederholungen"} früher beenden als sonst. Das Gewicht wählst du danach, nicht nach dem Plan.`);
    a.push("Heute keine neuen Bestwerte und keine Maximalversuche.");
  } else if (art === "cardio") {
    a.push(`Dauer auf etwa ${prozent} Prozent.`);
    a.push("Tempo so, dass du dich noch in ganzen Sätzen unterhalten kannst. Intervalle verschieben.");
  } else if (art === "team_sport") {
    a.push("Mannschaftstraining lässt sich schwer kürzen. Wenn du hingehst, steuer die Intensität selbst und lass Zusatzeinheiten danach weg.");
  } else {
    a.push("Mobilität passt heute gut. Ruhig ausführen, nichts erzwingen.");
  }

  if (stufe === "leicht") {
    a.push("Eine Pause ist heute ebenfalls vertretbar. Die Entscheidung liegt bei dir, nicht bei der Zahl.");
  }
  if (maxMinuten !== null) {
    a.push(`Zeitlich gedeckelt auf ${maxMinuten} Minuten. Lieber weniger Übungen als alle im Eiltempo.`);
  }
  return a;
}

/** Die Anpassung in Worten. Der Hinweis auf die Regel steht immer dabei. */
export function anpassungText(an: Anpassung, geplant?: GeplanteEinheit | null): string {
  const zeilen: string[] = [];
  const titel = { normal: "Heute ohne Anpassung.", reduziert: "Heute etwas zurücknehmen.", leicht: "Heute deutlich leichter." }[an.stufe];
  zeilen.push(titel);
  if (geplant) zeilen.push(`Geplant: ${ARTNAME[geplant.art]}, ${geplant.minuten} Minuten, aus ${geplant.quelle}.`);
  if (an.gruende.length) {
    zeilen.push("Warum:");
    for (const g of an.gruende) zeilen.push(`- ${g}`);
  } else {
    zeilen.push("Weder Schlaf noch Stress noch Kalender sprechen heute dagegen.");
  }
  zeilen.push("Was du anders machst:");
  for (const a of an.anweisungen) zeilen.push(`- ${a}`);
  if (an.stufe !== "normal") {
    zeilen.push("Wie stark angepasst wird, ist eine Regel der App und keine Messung. Fühlst du dich beim Aufwärmen gut, darfst du hochgehen.");
  }
  return zeilen.join("\n");
}

const ARTNAME: Record<TrainingType, string> = {
  strength: "Krafttraining",
  team_sport: "Mannschaftssport",
  cardio: "Ausdauer",
  mobility: "Mobilität",
};

function dauer(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  return m === 0 ? `${h} Stunden` : `${h} Stunden ${m} Minuten`;
}

/** `Number(null)` ist 0. Ein fehlendes Feld darf nicht als Null zählen. */
function zahl(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
