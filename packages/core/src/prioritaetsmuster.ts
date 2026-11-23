import { BEREICH_NAME, bereichVon } from "./balance.js";
import type { Bereich, BereichStand } from "./balance.js";
import { foldUmlauts } from "./memory.js";
import type { SortierStufe } from "./sortierung.js";

/**
 * Wenn ein Lebensbereich in der letzten Woche zu kurz kam, rückt eine Aufgabe
 * aus genau diesem Bereich eine Stufe nach vorn.
 *
 * Der Nutzer hat es so verlangt: wer eine Woche lang nichts mit der Familie
 * gemacht hat, dem sagt daevo bei "Lydi schreiben" nicht "kann warten",
 * sondern "kam diese Woche zu kurz, heute zählt es". Das Muster entscheidet,
 * nicht die Frist.
 *
 * Grenzen, die jede Fehlmeldung verhindern:
 * - Karriere nie. Arbeit fällt selten aus, und sie braucht keinen Schub.
 * - Nur mit genug gemessener Zeit. Ein Bereich ohne Eintrag ist vergessen und
 *   kein Bereich ohne Zeit, siehe "Was nicht eingetragen ist, ist vergessen".
 * - Unter 40 Prozent des Wochenziels, dieselbe Schwelle wie `schieflageFinden`.
 */

/** Mindestens so viele der letzten sieben Tage brauchen gemessene Zeit. */
export const MIN_TAGE_WOCHE = 4;
/** Darunter ist ein Bereich vernachlässigt. */
export const KURZ_GEKOMMEN = 0.4;
/** Darunter rückt eine Aufgabe von Stufe 2 auf Stufe 1, sonst nur von 3 auf 2. */
export const GANZ_VERGESSEN = 0.2;

export interface Vernachlaessigt {
  bereich: Bereich;
  name: string;
  anteil: number;
  /** Ganze Zahl in Prozent, für den Satz. */
  prozent: number;
}

/** Findet die Bereiche, die in der letzten Woche zu kurz kamen. */
export function vernachlaessigteBereiche(bereiche: BereichStand[], tageMitZeit: number): Vernachlaessigt[] {
  if (tageMitZeit < MIN_TAGE_WOCHE) return [];
  return bereiche
    .filter((b) => b.bereich !== "karriere" && b.zielMinuten > 0 && b.anteil < KURZ_GEKOMMEN)
    .sort((a, b) => a.anteil - b.anteil)
    .map((b) => ({ bereich: b.bereich, name: b.name, anteil: b.anteil, prozent: Math.round(b.anteil * 100) }));
}

/**
 * Der Bereich einer Aufgabe: die Wortliste des Balance Boards, dazu die Namen,
 * die der Nutzer selbst einem Bereich zugeordnet hat ("Lydi" ist Familie).
 * Gesucht wird auf Wortgrenzen, "Ly" steckt sonst in jedem zweiten Wort.
 */
export function bereichDerAufgabe(text: string, namen: Partial<Record<Bereich, string[]>> = {}): Bereich | null {
  const t = foldUmlauts(text.toLowerCase());
  for (const [bereich, liste] of Object.entries(namen) as Array<[Bereich, string[]]>) {
    for (const n of liste ?? []) {
      const w = foldUmlauts(String(n).toLowerCase()).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (w.length >= 2 && new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(t)) return bereich;
    }
  }
  return bereichVon(text);
}

/**
 * Familiennamen aus den Notizen des Gedächtnisses: "meine Schwester Zoe",
 * "Mama Petra". Nur mit einem Wort für die Beziehung davor, ein Name allein
 * sagt nichts, und eine falsch erkannte Person verschöbe fremde Aufgaben.
 */
export function familienNamenAus(notizen: string[]): string[] {
  const gefunden = new Set<string>();
  const re = /\b(?:[Ss]chwester|[Bb]ruder|[Mm]utter|[Mm]ama|[Vv]ater|[Pp]apa|[Oo]ma|[Oo]pa|[Tt]ante|[Oo]nkel|[Cc]ousine|[Cc]ousin|[Ff]reundin|[Nn]effe|[Nn]ichte)\s+([A-ZÄÖÜ][a-zäöüß]{1,14})\b/g;
  for (const n of notizen) {
    for (const m of String(n).matchAll(re)) gefunden.add(m[1]!);
  }
  return [...gefunden];
}

export interface Anhebung {
  stufe: SortierStufe;
  grund: string;
}

/**
 * Hebt eine Einstufung an, wenn ihr Bereich zu kurz kam. Gibt null zurück,
 * wenn nichts zu tun ist: Stufe 1 bleibt, was sie ist, und eine Aufgabe aus
 * einem Bereich, der gut dasteht, bleibt unberührt.
 */
export function anheben(
  stufe: SortierStufe,
  bereich: Bereich | null,
  luecken: Vernachlaessigt[],
): Anhebung | null {
  if (!bereich || stufe === 1) return null;
  const l = luecken.find((x) => x.bereich === bereich);
  if (!l) return null;
  // Nur ein fast leerer Bereich schlägt eine wichtige Aufgabe auf Stufe 2.
  if (stufe === 2 && l.anteil >= GANZ_VERGESSEN) return null;
  const neu: SortierStufe = stufe === 3 ? 2 : 1;
  return {
    stufe: neu,
    grund: `${BEREICH_NAME[bereich]} kam diese Woche zu kurz, ${l.prozent} Prozent vom Ziel`,
  };
}
