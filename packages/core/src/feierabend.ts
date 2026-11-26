/**
 * Feierabend: ab wann daevo nichts mehr aufträgt.
 *
 * Das Ziel der App ist Entlastung. Im Betrieb stand im Briefing trotzdem ein
 * Termin um 23 Uhr, und um 22 Uhr hatte die Abendroutine schon gesagt: Handy
 * weg. Zwei Aussagen derselben App, die sich widersprechen, und die zweite
 * macht aus einem Coach einen Antreiber.
 *
 * Feierabend ist 13,5 Stunden nach dem Aufstehen, also 20 Uhr bei 6:30. Wer
 * später aufsteht, hat später Feierabend. Nie vor 19 Uhr, und nie weniger als
 * zwei Stunden vor der Schlafenszeit: wer um 21:30 schläft, hat um 19:30
 * Feierabend und nicht um 20 Uhr. Die 13,5 Stunden sind eine Regel der App und
 * keine Studie.
 *
 * Danach kommt keine Aufgabe mehr auf den Plan, ausser sie ist so wichtig,
 * dass sie nicht warten darf: höchste Wichtigkeit oder echtes Geld.
 */

const STUNDE = 3600_000;
export const FEIERABEND_NACH_AUFSTEHEN_H = 13.5;
export const FEIERABEND_FRUEHESTENS_H = 19;
export const FEIERABEND_VOR_SCHLAF_H = 2;
/** Die Abendroutine beginnt so lange vor der Schlafenszeit, siehe `schlafplan.ts`. */
export const ABENDROUTINE_VOR_SCHLAF_MIN = 90;

/** Feierabend als Zeitpunkt. `wachVon` und `wachBis` kommen aus dem Tagesablauf. */
export function feierabendZeitpunkt(wachVon: number, wachBis: number): number {
  const tagBeginn = new Date(wachVon);
  tagBeginn.setHours(0, 0, 0, 0);
  const frueh = tagBeginn.getTime() + FEIERABEND_FRUEHESTENS_H * STUNDE;
  const wunsch = wachVon + FEIERABEND_NACH_AUFSTEHEN_H * STUNDE;
  const spaetestens = wachBis - FEIERABEND_VOR_SCHLAF_H * STUNDE;
  // Wer sehr früh oder sehr spät schläft: die Grenze zur Schlafenszeit gewinnt.
  return Math.min(Math.max(wunsch, frueh), Math.max(spaetestens, wachVon));
}

/** Ab hier gilt die Abendroutine, nichts Neues beginnt mehr. */
export function abendroutineBeginn(wachBis: number): number {
  return wachBis - ABENDROUTINE_VOR_SCHLAF_MIN * 60000;
}

const GELD = /\b(geld|euro|rechnung|steuer|steuern|zahlung|zahlen|ueberweis\w*|miete|kredit|mahnung|finanzamt|gehalt|lohn|versicherung|konto|bank|frist|rueckerstattung|erstattung|abschlag|nachzahlung)\b|€|\d\s?(eur|euro)\b|\d{3,}\s?(k\b|tsd)/;

function falte(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/**
 * Darf eine Aufgabe nach Feierabend noch auf den Plan? Nur die höchste
 * Wichtigkeit, oder wenn es um Geld geht. Alles andere hat bis morgen Zeit.
 */
export function darfNachFeierabend(a: { text: string; wichtigkeit?: number }): boolean {
  return (a.wichtigkeit ?? 0) >= 3 || GELD.test(falte(a.text));
}
