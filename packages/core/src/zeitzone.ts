/**
 * Berliner Zeit ohne Zeitzonendatenbank.
 *
 * `Intl` mit einer benannten Zeitzone gibt es in Node und im Browser. Für die
 * Laufzeit eines Cloudflare Workers ist das nicht zugesichert, und eine
 * Erinnerung, die im Winter eine Stunde falsch geht, merkt niemand sofort.
 * Deshalb wird die Verschiebung hier aus der Regel gerechnet.
 *
 * Regel nach Richtlinie 2000/84/EG: Sommerzeit beginnt am letzten Sonntag im
 * März um 01:00 UTC und endet am letzten Sonntag im Oktober um 01:00 UTC. In
 * dieser Zeit liegt Berlin zwei Stunden vor UTC, sonst eine.
 *
 * Die Regel gilt seit 1996 unverändert für die gesamte EU. Sollte sie fallen,
 * schlägt der Test an, der jedes Ergebnis gegen `Intl` prüft: dort steckt die
 * echte Zeitzonendatenbank dahinter.
 */

export interface Zeitpunkt {
  /** Datum in Berlin, JJJJ-MM-TT. */
  tag: string;
  /** Uhrzeit in Berlin, HH:MM. */
  zeit: string;
  /** Verschiebung gegenüber UTC in Stunden, 1 oder 2. */
  versatz: number;
}

export function berlinZeit(jetzt: Date = new Date()): Zeitpunkt {
  const versatz = sommerzeit(jetzt) ? 2 : 1;
  const ortszeit = new Date(jetzt.getTime() + versatz * 3600_000);
  const tag = ortszeit.toISOString().slice(0, 10);
  const zeit = ortszeit.toISOString().slice(11, 16);
  return { tag, zeit, versatz };
}

/** Gilt zu diesem Zeitpunkt die mitteleuropäische Sommerzeit. */
export function sommerzeit(jetzt: Date): boolean {
  const jahr = jetzt.getUTCFullYear();
  const beginn = letzterSonntagUm01Uhr(jahr, 2);
  const ende = letzterSonntagUm01Uhr(jahr, 9);
  const t = jetzt.getTime();
  return t >= beginn && t < ende;
}

/**
 * Der letzte Sonntag eines Monats, 01:00 UTC, als Zeitstempel.
 *
 * Der Monat kommt nullbasiert herein, wie bei Date. Gerechnet wird vom
 * ersten Tag des Folgemonats rückwärts: den letzten Tag eines Monats direkt
 * zu treffen verlangt sonst eine Tabelle mit Schaltjahren.
 */
function letzterSonntagUm01Uhr(jahr: number, monat: number): number {
  const ersterDesFolgemonats = Date.UTC(jahr, monat + 1, 1);
  const letzter = new Date(ersterDesFolgemonats - 86_400_000);
  const tag = letzter.getUTCDate() - letzter.getUTCDay();
  return Date.UTC(jahr, monat, tag, 1, 0, 0, 0);
}
