/**
 * Wann der Tag anfängt und aufhört.
 *
 * Eine feste Aufstehzeit im Profil setzt einen geregelten Alltag voraus. Wer im
 * Schichtdienst arbeitet oder wie dieser Nutzer wechselnde Termine hat, bekommt
 * damit dauerhaft falsche Zahlen: der Erinnerungsplan feuert zur falschen Zeit,
 * die freie Zeit im Tagesablauf stimmt nicht, und die Wachzeit ist der Nenner
 * im Balance Board. Eine falsche Zahl im Nenner verfälscht jeden Anteil.
 *
 * Drei Ebenen, von grob nach fein. Die feinere schlägt immer die gröbere:
 *
 * 1. Standard. Gilt, wenn nichts anderes gesetzt ist.
 * 2. Wochentag. Für regelmässig unterschiedliche Tage, etwa Training am
 *    Dienstag und Donnerstag.
 * 3. Einzelner Tag. Für alles, was sich nicht wiederholt. Bei echtem
 *    Schichtdienst rotiert die Schicht, dann sagt der Wochentag nichts.
 *
 * Ebene 3 ist der Grund, warum es die Ausnahmen überhaupt gibt: ein Nutzer, der
 * seine Zeiten nur je Wochentag pflegen kann, pflegt sie nach zwei Wochen gar
 * nicht mehr.
 */
import type { UserProfile } from "./types.js";

export interface Tagesrand {
  /** Lokale Aufstehzeit HH:MM. */
  wakeTime: string;
  /** Lokale Schlafenszeit HH:MM. */
  sleepTime: string;
  /** Wann das Handy abends weglegt wird. Optional. */
  handyAus?: string;
  /** Wann morgens das erste Mal aufs Handy geschaut wird. Optional. */
  handyMorgens?: string;
}

/**
 * Woher die Zeiten für einen Tag kommen.
 *
 * "gleich" heisst jeden Tag dieselben Zeiten. "wochentag" heisst je Wochentag
 * eigene Zeiten, mit dem Standard als Rückfall für Tage ohne Eintrag.
 */
export type RandModus = "gleich" | "wochentag";

/** Wochentage in der Reihenfolge, die `Date.getDay()` liefert. */
export const WOCHENTAGE = [
  { nr: 1, kurz: "Mo", name: "Montag" },
  { nr: 2, kurz: "Di", name: "Dienstag" },
  { nr: 3, kurz: "Mi", name: "Mittwoch" },
  { nr: 4, kurz: "Do", name: "Donnerstag" },
  { nr: 5, kurz: "Fr", name: "Freitag" },
  { nr: 6, kurz: "Sa", name: "Samstag" },
  { nr: 0, kurz: "So", name: "Sonntag" },
] as const;

/**
 * Die Zeiten für einen bestimmten Tag.
 *
 * `tagIso` ist ein Datum als JJJJ-MM-TT. Ohne Angabe gilt der Standard, denn
 * ohne Datum lässt sich weder ein Wochentag noch eine Ausnahme bestimmen.
 */
export function tagesrandFuer(profile: UserProfile, tagIso?: string): Tagesrand {
  const standard: Tagesrand = {
    wakeTime: gueltig(profile.wakeTime) ?? "07:00",
    sleepTime: gueltig(profile.sleepTime) ?? "23:00",
    handyAus: gueltig(profile.handyAus),
    handyMorgens: gueltig(profile.handyMorgens),
  };
  if (!tagIso) return standard;

  // Die Ausnahme für genau diesen Tag schlägt alles andere.
  const ausnahme = profile.tagesausnahmen?.[tagIso];
  if (ausnahme) return zusammen(standard, ausnahme);

  if (profile.randModus !== "wochentag") return standard;

  const tag = wochentagVon(tagIso);
  if (tag === null) return standard;
  const jeTag = profile.wochenraender?.[String(tag)];
  return jeTag ? zusammen(standard, jeTag) : standard;
}

/**
 * Wie viele Minuten dieser Tag wach ist.
 *
 * Über Mitternacht wird durchgerechnet: wer um 01:00 schlafen geht und um 07:00
 * aufsteht, ist 18 Stunden wach, nicht minus 6.
 */
export function wachMinutenAm(profile: UserProfile, tagIso?: string): number {
  const r = tagesrandFuer(profile, tagIso);
  return wachMinutenAus(r.wakeTime, r.sleepTime);
}

export function wachMinutenAus(wake: string, sleep: string): number {
  const von = minuten(wake);
  const bis = minuten(sleep);
  if (von === null || bis === null) return 16 * 60;
  const spanne = bis > von ? bis - von : bis + 24 * 60 - von;
  // Unter vier und über zweiundzwanzig Stunden ist keine Wachzeit, sondern ein
  // Tippfehler. Der Standardwert ist dann ehrlicher als eine absurde Zahl.
  return spanne >= 4 * 60 && spanne <= 22 * 60 ? spanne : 16 * 60;
}

/** Ob für diesen Tag etwas anderes gilt als der Standard. */
export function weichtAb(profile: UserProfile, tagIso: string): boolean {
  const s = tagesrandFuer(profile);
  const t = tagesrandFuer(profile, tagIso);
  return s.wakeTime !== t.wakeTime || s.sleepTime !== t.sleepTime;
}

/** Ein Satz für den Chat, der die Zeiten dieses Tages nennt. */
export function tagesrandText(profile: UserProfile, tagIso: string): string {
  const r = tagesrandFuer(profile, tagIso);
  const stunden = Math.floor(wachMinutenAus(r.wakeTime, r.sleepTime) / 60);
  const quelle = profile.tagesausnahmen?.[tagIso]
    ? "für diesen Tag eingetragen"
    : profile.randModus === "wochentag" && profile.wochenraender?.[String(wochentagVon(tagIso) ?? -1)]
      ? "dein üblicher Wert für diesen Wochentag"
      : "dein Standardwert";
  return `Auf ${r.wakeTime} bis ${r.sleepTime}, also rund ${stunden} Stunden wach. Das ist ${quelle}.`;
}

/**
 * Setzt eine Ausnahme für einen einzelnen Tag und räumt alte Ausnahmen weg.
 *
 * Ohne das Aufräumen wächst die Liste unbegrenzt: jeder Tag, an dem der Nutzer
 * einmal früher aufsteht, bleibt für immer im Profil, und das Profil geht bei
 * jeder Nachricht an das Modell.
 */
export function setzeAusnahme(
  profile: UserProfile,
  tagIso: string,
  rand: Partial<Tagesrand>,
  heute: string,
): Record<string, Tagesrand> {
  const alt = profile.tagesausnahmen ?? {};
  const bestand = alt[tagIso] ?? tagesrandFuer(profile);
  const neu: Record<string, Tagesrand> = { ...alt, [tagIso]: zusammen(bestand, rand) };

  // Vergangenheit über 60 Tage hinaus fliegt raus. So weit zurück rechnet
  // nichts in der App, und der Verlauf bleibt trotzdem lange genug erhalten.
  const grenze = new Date(`${heute}T12:00:00`);
  grenze.setDate(grenze.getDate() - 60);
  const grenzIso = grenze.toISOString().slice(0, 10);
  for (const schluessel of Object.keys(neu)) {
    if (schluessel < grenzIso) delete neu[schluessel];
  }
  return neu;
}

/* ---------- Hilfen ---------- */

/** Wochentag als Zahl wie bei `Date.getDay()`, Sonntag ist 0. */
export function wochentagVon(tagIso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tagIso)) return null;
  // Mittags, damit die Zeitzone den Tag nicht kippt.
  const d = new Date(`${tagIso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

function zusammen(basis: Tagesrand, oben: Partial<Tagesrand>): Tagesrand {
  return {
    wakeTime: gueltig(oben.wakeTime) ?? basis.wakeTime,
    sleepTime: gueltig(oben.sleepTime) ?? basis.sleepTime,
    handyAus: gueltig(oben.handyAus) ?? basis.handyAus,
    handyMorgens: gueltig(oben.handyMorgens) ?? basis.handyMorgens,
  };
}

function gueltig(wert: unknown): string | undefined {
  return typeof wert === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(wert) ? wert : undefined;
}

function minuten(hhmm: string): number | null {
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return t ? Number(t[1]) * 60 + Number(t[2]) : null;
}
