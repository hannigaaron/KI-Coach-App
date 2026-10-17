/**
 * Woher die Zahlen eines Tages kommen.
 *
 * Ein Balken mit 184 von 150 Gramm Protein sagt, dass das Ziel erreicht ist.
 * Er sagt nicht, ob das am Shake lag oder am Abendessen, und genau das ist
 * die Frage, die jemand stellt, der morgen etwas ändern will. Diese Rechnung
 * zerlegt den Tag in Mahlzeiten und in Lebensmittel.
 *
 * Gerechnet wird nur aus den eingetragenen Posten. Es gibt keine Schätzung und
 * keine Rundung vor dem Ende, damit die Summe der Zeilen die Zahl im Balken
 * trifft. Ein Unterschied von einem Gramm zwischen Liste und Balken fällt beim
 * Nachrechnen sofort auf und kostet Vertrauen.
 */

import type { MahlzeitArt } from "./verteilung.js";

export type Makro = "kcal" | "proteinG" | "fatG" | "carbsG";

export interface HerkunftPosten {
  name: string;
  quantity?: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface HerkunftMahlzeit {
  id?: string;
  at?: string;
  text?: string;
  entries: HerkunftPosten[];
}

export interface MahlzeitZeile {
  id?: string;
  at: string;
  art: MahlzeitArt | null;
  titel: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  /** Anteil am Tageswert des gewählten Makros, 0 bis 1. */
  anteil: number;
}

export interface LebensmittelZeile {
  name: string;
  /** Wie oft das Lebensmittel heute vorkam. */
  mal: number;
  wert: number;
  anteil: number;
}

export interface MakroHerkunft {
  makro: Makro;
  gesamt: number;
  mahlzeiten: MahlzeitZeile[];
  lebensmittel: LebensmittelZeile[];
  /** Was nach den angezeigten Lebensmitteln übrig bleibt, zusammengefasst. */
  rest: { anzahl: number; wert: number; anteil: number } | null;
}

/**
 * Die Mahlzeit zu einer Uhrzeit. Dieselben Fenster wie beim Aufteilen des
 * Rests: wer um 13 Uhr isst, isst zu Mittag, egal wie er es nennt.
 */
export function artZurUhrzeit(at: string | undefined): MahlzeitArt | null {
  const stunde = Number(String(at || "").slice(0, 2));
  if (!/^\d{2}/.test(String(at || "")) || !Number.isFinite(stunde)) return null;
  if (stunde < 11) return "fruehstueck";
  if (stunde < 15) return "mittagessen";
  if (stunde < 17) return "snack";
  return "abendessen";
}

/**
 * @param mahlzeiten die Mahlzeiten eines Tages
 * @param makro der Wert, nach dem zerlegt wird
 * @param maxLebensmittel so viele Lebensmittel stehen einzeln da, der Rest zusammen
 */
export function makroHerkunft(mahlzeiten: HerkunftMahlzeit[], makro: Makro, maxLebensmittel = 8): MakroHerkunft {
  const liste = Array.isArray(mahlzeiten) ? mahlzeiten : [];
  const zahl = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

  let gesamt = 0;
  for (const m of liste) for (const e of m.entries || []) gesamt += zahl(e[makro]);
  const anteil = (wert: number) => (gesamt > 0 ? wert / gesamt : 0);

  const zeilen: MahlzeitZeile[] = liste
    .map((m) => {
      const summe = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
      for (const e of m.entries || []) {
        summe.kcal += zahl(e.kcal);
        summe.proteinG += zahl(e.proteinG);
        summe.fatG += zahl(e.fatG);
        summe.carbsG += zahl(e.carbsG);
      }
      const posten = (m.entries || []).map((e) => e.name).filter(Boolean);
      return {
        id: m.id,
        at: String(m.at || ""),
        art: artZurUhrzeit(m.at),
        titel: posten.length ? posten.join(", ") : String(m.text || "Mahlzeit"),
        ...summe,
        anteil: anteil(summe[makro]),
      };
    })
    // In der Reihenfolge des Tages. Die Liste liest man als Ablauf, die
    // Rangfolge steht bei den Lebensmitteln darunter.
    .sort((a, b) => a.at.localeCompare(b.at));

  // Gleiches Lebensmittel, gleicher Name: zusammen. Verglichen wird ohne
  // Gross und Klein und ohne Leerzeichen am Rand, nicht über Ähnlichkeit.
  // Eine erfundene Gleichheit wäre schlimmer als eine übersehene, dieselbe
  // Abwägung wie in doppelt.ts.
  const nachName = new Map<string, LebensmittelZeile>();
  for (const m of liste) {
    for (const e of m.entries || []) {
      const schluessel = String(e.name || "").trim().toLowerCase();
      if (!schluessel) continue;
      const da = nachName.get(schluessel);
      if (da) { da.wert += zahl(e[makro]); da.mal += 1; }
      else nachName.set(schluessel, { name: String(e.name).trim(), mal: 1, wert: zahl(e[makro]), anteil: 0 });
    }
  }
  const alle = [...nachName.values()]
    .filter((l) => l.wert > 0)
    .sort((a, b) => b.wert - a.wert)
    .map((l) => ({ ...l, anteil: anteil(l.wert) }));

  const gezeigt = alle.slice(0, maxLebensmittel);
  const uebrig = alle.slice(maxLebensmittel);
  const restWert = uebrig.reduce((s, l) => s + l.wert, 0);

  return {
    makro,
    gesamt,
    mahlzeiten: zeilen,
    lebensmittel: gezeigt,
    rest: uebrig.length ? { anzahl: uebrig.length, wert: restWert, anteil: anteil(restWert) } : null,
  };
}
