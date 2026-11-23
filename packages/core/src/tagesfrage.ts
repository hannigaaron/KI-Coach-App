import { foldUmlauts } from "./memory.js";
import { tagAusText } from "./tagwahl.js";

/**
 * Die alltäglichen Fragen nach einem Tag, ohne Modell erkannt.
 *
 * "Briefing für morgen", "was steht am Freitag an", "was soll ich morgen
 * essen", "wann trainiere ich morgen". Das sind die einfachsten Fragen, die
 * ein Nutzer stellt, und sie müssen jedes Mal den richtigen Tag treffen. Im
 * Betrieb lieferte "Kurzes Briefing für morgen" den heutigen Tag. Wer nach
 * morgen fragt, bekommt morgen: Kalender und Aufgaben dieses Tages.
 *
 * Erkannt wird nur eine Frage, nie ein Eintrag oder Befehl. "Morgen um 5
 * aufstehen", "erinnere mich morgen an die Tablette" und "ich muss morgen
 * noch zum Amt" gehören anderen Wegen und bleiben hier unberührt.
 */

export type TagesfrageArt = "tag" | "essen" | "training";

export interface Tagesfrage {
  art: TagesfrageArt;
  /** JJJJ-MM-TT. */
  tag: string;
  /** heute, morgen, übermorgen oder Wochentag mit Datum. */
  wort: string;
}

const FRAGEWORT = /^(hab(e)? ich|sind|gibt es|was|wie|wann|welche[rsmn]?|wo|wer|wieviel|soll|sollte|kann|kannst|koenntest|gib|gibt|zeig\w*|erstell\w*|bau\w*|plan\w*|brief\w*|empfiehl\w*|schlag\w*|muss|steht|ist|liegt|brauch\w*|kurz\w*|mach\w*|sag\w*|nenn\w*|check\w*|lies|fass\w*)\b/;

/** Befehle und Einträge, die zufällig einen Tag nennen. */
const KEIN_FRAGE = /\b(erinner\w*|wecker|verschieb\w*|verleg\w*|trag\s+\w+.*\bein|eintragen|lege?\s+.*\ban\b|loesch\w*|streich\w*|abhaken|erledigt|gegessen|getrunken|hatte|ich\s+(esse|trainiere|muss\s+noch|mach|gehe|fahre|habe\s+vor))\b/;

export function tagesfrageAus(nachricht: string, heute: string): Tagesfrage | null {
  const t = foldUmlauts(String(nachricht ?? "").toLowerCase()).replace(/\s+/g, " ").trim();
  const tw = tagAusText(t, heute);
  if (!tw) return null;
  // Vergangenes beantwortet der Verlauf, heute die bestehenden Wege.
  if (tw.tag < heute) return null;

  const frage = t.includes("?") || FRAGEWORT.test(t.replace(/^(hey|hi|hallo|bitte|ok|okay|und)[ ,]+/, "").replace(/^daevo[ ,]+/, ""));
  if (!frage || KEIN_FRAGE.test(t)) return null;

  const essen = /\b(essen|esse|koch\w*|mahlzeit\w*|fruehstueck\w*|mittagessen|abendessen|snack\w*|kalorien|protein\w*|rezept\w*|menue)\b/.test(t);
  const training = /\b(trainier\w*|training\w*|workout|gym|sport|einheit|krafttraining|laufen|joggen)\b/.test(t);

  // Essen und Training nur für spätere Tage. Heute haben eigene Wege, die den
  // Stand des Tages und die Tagesform kennen.
  // "Wann soll ich heute trainieren" ist die Frage nach der Uhrzeit und gilt auch für heute.
  if (training && !essen && (tw.tag > heute || /\bwann\b/.test(t))) return { art: "training", tag: tw.tag, wort: tw.wort };
  if (tw.tag > heute) {
    if (essen && !training) return { art: "essen", tag: tw.tag, wort: tw.wort };
  }

  // Heute kennen die bestehenden Wege, ausser dem Briefing selbst.
  const allgemein = /\b(briefing|uebersicht|ablauf|ueberblick|tagesplan|to[ -]?do\w*|aufgaben|zu tun|erledigen|termin\w*|kalender|steht\b|stehen\b|los\b|vor mir|wie sieht|was habe|was hab|was muss|was mach|was ist|was liegt|was gibt|plan\b|tag\b|wann|zeit\b|frei\b|aufsteh\w*|frueh|raus|voll|erste[rnms]?\b|letzte[rnms]?\b|schicht|dienst|arbeit\w*|meeting\w*|stress\w*|beschaeftigt|ausgelastet|busy)/.test(t);
  if (!allgemein) return null;
  if (tw.tag === heute && !/\b(briefing|uebersicht|ueberblick)\b/.test(t)) return null;
  return { art: "tag", tag: tw.tag, wort: tw.wort };
}
