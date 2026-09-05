import type { Verbrauch } from "./provider.js";

/**
 * Was ein Aufruf kostet.
 *
 * Die Preise stehen hier als Tabelle, weil eine App, die Geld ausgibt, sagen
 * können muss, wie viel. Sie sind ein Stand, kein Naturgesetz: Anthropic ändert
 * Preise, und dann stimmt diese Datei nicht mehr. Deshalb trägt jede Anzeige
 * das Datum mit, und die App nennt die Zahl eine Schätzung.
 *
 * Stand: 24. Juni 2026, Preise der Anthropic API in Dollar je Million Token.
 *
 * Zwischenspeichern:
 * Ein Lesen aus dem Zwischenspeicher kostet ein Zehntel des Eingabepreises.
 * Ein Schreiben kostet das 1,25 fache, bei fünf Minuten Haltbarkeit.
 * Ab dem zweiten Aufruf mit demselben Anfang lohnt es sich also schon:
 * 1,25 plus 0,1 ist 1,35 gegen 2,0 ohne Zwischenspeicher.
 */

export interface Preis {
  /** Dollar je Million Eingabetoken. */
  input: number;
  /** Dollar je Million Ausgabetoken. */
  output: number;
}

export const PREISE_STAND = "24. Juni 2026";

export const MODELL_PREISE: Record<string, Preis> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** Wenn das Modell unbekannt ist, wird mit dem teuersten gerechnet. */
const RUECKFALL: Preis = { input: 5, output: 25 };

const CACHE_LESEN = 0.1;
const CACHE_SCHREIBEN = 1.25;

/** Kosten eines einzelnen Aufrufs in Dollar. */
export function kostenVon(verbrauch: Verbrauch): number {
  const preis = MODELL_PREISE[verbrauch.modell] ?? RUECKFALL;
  const eingabe =
    verbrauch.inputTokens * preis.input +
    verbrauch.cacheReadTokens * preis.input * CACHE_LESEN +
    verbrauch.cacheWriteTokens * preis.input * CACHE_SCHREIBEN;
  return (eingabe + verbrauch.outputTokens * preis.output) / 1_000_000;
}

/**
 * Was derselbe Aufruf ohne Zwischenspeicher gekostet hätte.
 *
 * Nur so lässt sich zeigen, ob das Zwischenspeichern etwas bringt. Ohne diesen
 * Vergleich sieht man eine Zahl und weiss nicht, ob sie gut ist.
 */
export function kostenOhneCache(verbrauch: Verbrauch): number {
  const preis = MODELL_PREISE[verbrauch.modell] ?? RUECKFALL;
  const alleEingaben = verbrauch.inputTokens + verbrauch.cacheReadTokens + verbrauch.cacheWriteTokens;
  return (alleEingaben * preis.input + verbrauch.outputTokens * preis.output) / 1_000_000;
}

export interface Summe {
  anfragen: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** Kosten in Dollar. */
  dollar: number;
  /** Was es ohne Zwischenspeicher gekostet hätte. */
  dollarOhneCache: number;
}

export function leereSumme(): Summe {
  return {
    anfragen: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    dollar: 0,
    dollarOhneCache: 0,
  };
}

/** Zählt einen Aufruf zu einer laufenden Summe dazu. */
export function addiere(summe: Summe, verbrauch: Verbrauch): Summe {
  return {
    anfragen: summe.anfragen + 1,
    inputTokens: summe.inputTokens + verbrauch.inputTokens,
    outputTokens: summe.outputTokens + verbrauch.outputTokens,
    cacheReadTokens: summe.cacheReadTokens + verbrauch.cacheReadTokens,
    cacheWriteTokens: summe.cacheWriteTokens + verbrauch.cacheWriteTokens,
    dollar: summe.dollar + kostenVon(verbrauch),
    dollarOhneCache: summe.dollarOhneCache + kostenOhneCache(verbrauch),
  };
}

/** Addiert mehrere Tagessummen. */
export function summiere(summen: Summe[]): Summe {
  return summen.reduce<Summe>((gesamt, s) => ({
    anfragen: gesamt.anfragen + s.anfragen,
    inputTokens: gesamt.inputTokens + s.inputTokens,
    outputTokens: gesamt.outputTokens + s.outputTokens,
    cacheReadTokens: gesamt.cacheReadTokens + s.cacheReadTokens,
    cacheWriteTokens: gesamt.cacheWriteTokens + s.cacheWriteTokens,
    dollar: gesamt.dollar + s.dollar,
    dollarOhneCache: gesamt.dollarOhneCache + s.dollarOhneCache,
  }), leereSumme());
}

/**
 * Wie viel der Eingabe aus dem Zwischenspeicher kam, zwischen 0 und 1.
 *
 * Bleibt der Wert über mehrere Tage bei null, greift das Zwischenspeichern
 * nicht. Dann hat sich etwas im vorderen Teil des Prompts geändert, und das
 * kostet echtes Geld, ohne dass es irgendwo eine Fehlermeldung gäbe.
 */
export function cacheQuote(summe: Summe): number {
  const gesamt = summe.inputTokens + summe.cacheReadTokens + summe.cacheWriteTokens;
  return gesamt === 0 ? 0 : summe.cacheReadTokens / gesamt;
}

/** Was gespart wurde, in Prozent. */
export function ersparnis(summe: Summe): number {
  if (summe.dollarOhneCache === 0) return 0;
  return (1 - summe.dollar / summe.dollarOhneCache) * 100;
}

/**
 * Hochrechnung auf einen Monat.
 *
 * Aus wenigen Tagen auf einen Monat zu schliessen ist grob. Deshalb liefert
 * die Funktion mit, auf wie vielen Tagen sie beruht, und die Anzeige nennt
 * das. Eine Hochrechnung aus einem einzigen Tag ist eine Behauptung.
 */
export function hochrechnung(summen: Summe[]): { dollarProMonat: number; tage: number } {
  const tage = summen.filter((s) => s.anfragen > 0).length;
  if (tage === 0) return { dollarProMonat: 0, tage: 0 };
  const gesamt = summiere(summen);
  return { dollarProMonat: (gesamt.dollar / tage) * 30, tage };
}

/** Dollar so schreiben, dass auch kleine Beträge lesbar sind. */
export function dollarText(betrag: number): string {
  if (betrag === 0) return "0";
  if (betrag < 0.01) return `${(betrag * 100).toFixed(2)} Cent`;
  if (betrag < 1) return `${(betrag * 100).toFixed(0)} Cent`;
  return `${betrag.toFixed(2)} Dollar`;
}
