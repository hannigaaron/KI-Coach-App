/**
 * Das Restbudget auf die Mahlzeiten aufteilen, die heute noch kommen.
 *
 * Bisher schlug die App eine Mahlzeit für das gesamte Restbudget vor. Wer um
 * 15 Uhr fragt und noch 1400 Kalorien offen hat, bekommt damit einen Vorschlag
 * über 1400 Kalorien, obwohl er danach noch zweimal isst. Das Ergebnis ist
 * entweder ein unrealistisches Essen oder ein Tag, der am Abend aus dem Ruder
 * läuft.
 *
 * Der eigentliche Wert liegt in der Aufteilung, nicht im Rezept.
 */
import type { MacroTargets } from "./types.js";

export type MahlzeitArt = "fruehstueck" | "mittagessen" | "abendessen" | "snack";

export interface MahlzeitInfo {
  art: MahlzeitArt;
  name: string;
  /**
   * Anteil am Tag, wenn alle vier Mahlzeiten vorkommen. Die Werte ergeben
   * zusammen eins und werden auf die tatsächlich verbleibenden Mahlzeiten
   * hochgerechnet.
   *
   * Die Verteilung ist eine übliche Aufteilung und keine medizinische Vorgabe.
   * Sie steht hier, damit ein Abendessen nicht denselben Umfang bekommt wie ein
   * Snack, und ist bewusst grob.
   */
  anteil: number;
  /** Übliche Tageszeit als Stunde, für die Reihenfolge und den Vorschlag. */
  stunde: number;
}

export const MAHLZEITEN: MahlzeitInfo[] = [
  { art: "fruehstueck", name: "Frühstück", anteil: 0.25, stunde: 8 },
  { art: "mittagessen", name: "Mittagessen", anteil: 0.32, stunde: 13 },
  { art: "abendessen", name: "Abendessen", anteil: 0.31, stunde: 19 },
  { art: "snack", name: "Snack", anteil: 0.12, stunde: 16 },
];

export function mahlzeitInfo(art: MahlzeitArt): MahlzeitInfo {
  return MAHLZEITEN.find((m) => m.art === art) ?? MAHLZEITEN[3]!;
}

export interface Rest {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface Anteil {
  art: MahlzeitArt;
  name: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface Verteilung {
  anteile: Anteil[];
  /** Was gegen den Plan spricht. Leer, wenn nichts dagegen spricht. */
  hinweise: string[];
  rest: Rest;
}

/**
 * Verteilt das Restbudget auf die gewählten Mahlzeiten.
 *
 * Kalorien folgen der Gewichtung, Protein wird gleichmässiger verteilt. Der
 * Grund ist praktisch und nicht medizinisch: ein Snack mit 12 Prozent der
 * Kalorien und 12 Prozent des Proteins wäre ein Keks, und der bringt niemanden
 * an sein Proteinziel. Ein Quark mit 30 Gramm Protein passt in dieselben
 * Kalorien und schliesst die Lücke.
 */
export function verteileRest(rest: Rest, arten: MahlzeitArt[]): Verteilung {
  const hinweise: string[] = [];
  const gewaehlt = arten.map(mahlzeitInfo);

  if (gewaehlt.length === 0) {
    return { anteile: [], hinweise: ["Keine Mahlzeit gewählt."], rest };
  }

  // Über dem Ziel: aufteilen hilft nicht mehr, das gehört gesagt.
  if (rest.kcal <= 0) {
    return {
      anteile: [],
      hinweise: [
        `Dein Tagesziel ist erreicht, sogar ${Math.abs(Math.round(rest.kcal))} kcal darüber. `
        + "Zum Aufteilen ist nichts mehr da.",
      ],
      rest,
    };
  }

  const summe = gewaehlt.reduce((s, m) => s + m.anteil, 0);
  // Gleichmässiger als die Kalorien, aber nicht gleich: die Hälfte des Weges
  // zwischen der Kaloriengewichtung und einer Gleichverteilung.
  const gleich = 1 / gewaehlt.length;

  const anteile: Anteil[] = gewaehlt.map((m) => {
    const kcalAnteil = m.anteil / summe;
    const proteinAnteil = (kcalAnteil + gleich) / 2;
    return {
      art: m.art,
      name: m.name,
      kcal: Math.round(rest.kcal * kcalAnteil),
      proteinG: Math.round(rest.proteinG * proteinAnteil),
      fatG: Math.round(rest.fatG * kcalAnteil),
      carbsG: Math.round(rest.carbsG * kcalAnteil),
    };
  });

  // Eine Mahlzeit unter 200 Kalorien ist kein Essen, sondern eine Zwischenmahlzeit
  // im Wortsinn. Bei drei geplanten Mahlzeiten und 400 offenen Kalorien stimmt
  // die Planung nicht, und das ist ein Hinweis wert.
  const kleinste = Math.min(...anteile.map((a) => a.kcal));
  if (kleinste < 200 && anteile.length > 1) {
    hinweise.push(
      `Auf ${anteile.length} Mahlzeiten verteilt bleiben für die kleinste nur ${kleinste} kcal. `
      + "Weniger Mahlzeiten wären realistischer.",
    );
  }

  // Andersherum genauso: über 1200 Kalorien in einer Mahlzeit isst kaum jemand
  // in einem Zug. Wer das zugeteilt bekommt, hat entweder zu wenig gegessen
  // oder plant zu wenige Mahlzeiten ein, und beides gehört gesagt statt in
  // einem Vorschlag versteckt.
  const gross = anteile.filter((a) => a.kcal > 1200);
  if (gross.length > 0) {
    hinweise.push(
      `${gross.map((a) => a.name).join(" und ")} käme auf über 1200 kcal. `
      + "Das isst kaum jemand in einer Mahlzeit. Plan eher noch einen Snack dazu.",
    );
  }

  // Protein je Mahlzeit über 60 Gramm ist in einer Portion schwer zu essen.
  const grosse = anteile.filter((a) => a.proteinG > 60);
  if (grosse.length > 0) {
    hinweise.push(
      `${grosse.map((a) => a.name).join(" und ")} kommt auf über 60 g Protein. `
      + "Das ist viel für eine Mahlzeit, plan einen Shake oder Quark mit ein.",
    );
  }

  return { anteile, hinweise, rest };
}

/**
 * Welche Mahlzeiten zur aktuellen Uhrzeit noch plausibel sind.
 *
 * Um 21 Uhr ein Frühstück vorzuschlagen ist Unsinn. Eine Stunde Vorlauf, damit
 * eine Mahlzeit nicht in der Minute verschwindet, in der ihre Zeit vorbei ist.
 */
export function offeneMahlzeiten(stunde: number, bereitsGegessen: MahlzeitArt[] = []): MahlzeitArt[] {
  return MAHLZEITEN
    .filter((m) => !bereitsGegessen.includes(m.art))
    .filter((m) => m.stunde + 1 >= stunde)
    .sort((a, b) => a.stunde - b.stunde)
    .map((m) => m.art);
}

/** Ein Satz je Mahlzeit, den der Coach als Auftrag bekommt. */
export function verteilungText(v: Verteilung): string {
  if (v.anteile.length === 0) return v.hinweise.join(" ");
  const zeilen = v.anteile.map(
    (a) => `- ${a.name}: rund ${a.kcal} kcal, ${a.proteinG} g Protein, ${a.fatG} g Fett, ${a.carbsG} g Kohlenhydrate.`,
  );
  const kopf = `Offen sind noch ${Math.round(v.rest.kcal)} kcal und ${Math.round(v.rest.proteinG)} g Protein. `
    + `Aufgeteilt auf ${v.anteile.length} ${v.anteile.length === 1 ? "Mahlzeit" : "Mahlzeiten"}:`;
  return [kopf, ...zeilen, ...v.hinweise].join("\n");
}
