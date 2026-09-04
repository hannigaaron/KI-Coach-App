import type { Goal, MacroTargets } from "@daevo/core";
import { FOODS, normalize, type FoodRef } from "./foods.js";

/**
 * Einkaufsliste aus den Tageszielen.
 *
 * Der Gedanke dahinter: eine Einkaufsliste ist nichts anderes als das
 * Tagesziel mal die Anzahl der Tage, umgerechnet in Ware. Wer 163 g Protein
 * am Tag braucht und für sieben Tage einkauft, braucht 1141 g Protein im
 * Einkaufswagen. Das ist eine Rechnung, keine Meinung, deshalb läuft sie
 * ohne Sprachmodell.
 *
 * Alle Nährwerte kommen aus FOODS in foods.ts. Hier steht keine einzige
 * eigene Nährwertangabe, sonst gäbe es zwei Wahrheiten.
 *
 * Zwei Dinge sind bewusst nicht abgedeckt:
 * - Preise. Die schwanken je Laden und Woche, jede Zahl wäre erfunden.
 * - Vollständigkeit. Gewürze, Kaffee, Putzmittel gehören auf deine Liste,
 *   aber nicht in eine Rechnung aus Makrozielen.
 */

export type Kategorie = "protein" | "kohlenhydrate" | "gemuese" | "obst" | "fett" | "sonstiges";

export interface ShoppingItem {
  /** Schlüssel aus FOODS, oder ein eigener für Posten ohne Nährwertbezug. */
  key: string;
  name: string;
  /** Menge in Gramm oder Millilitern, gerundet auf eine sinnvolle Packung. */
  gramm: number;
  /** Dieselbe Menge als Text, wie man sie im Laden liest. */
  menge: string;
  kategorie: Kategorie;
  /** Warum der Posten auf der Liste steht. Jede Zeile muss sich erklären. */
  grund: string;
}

export interface ShoppingList {
  /** Für wie viele Tage gerechnet wurde. */
  tage: number;
  items: ShoppingItem[];
  /** Was aus der Auswahl gefallen ist, weil der Nutzer es nicht verträgt. */
  gemieden: string[];
  hinweis: string;
}

/**
 * Anteil des Tagesziels, der über gekaufte Grundnahrungsmittel geplant wird.
 *
 * Nicht 100 Prozent, weil ein Teil der Makros nebenbei anfällt: Protein steckt
 * auch in Brot und Milch, Fett auch im Fleisch. Wer auf 100 Prozent plant,
 * kauft regelmässig zu viel und wirft weg.
 */
const ANTEIL = { protein: 0.72, kohlenhydrate: 0.6, fett: 0.35 };

/** Gemüse pro Tag in Gramm. Die WHO empfiehlt mindestens 400 g Obst und Gemüse täglich. */
const GEMUESE_G_PRO_TAG = 400;
/** Davon als Obst, der Rest als Gemüse. */
const OBST_ANTEIL = 0.4;

interface Staple {
  /** Schlüssel in FOODS. Von dort kommen die Nährwerte. */
  key: string;
  kategorie: Kategorie;
  /**
   * Umrechnung vom Zustand in FOODS auf die Ware im Laden.
   * Reis und Nudeln stehen in FOODS gekocht, gekauft werden sie trocken.
   * Trockenware nimmt beim Kochen etwa das Zweieinhalbfache an Gewicht auf,
   * deshalb 0.4 beziehungsweise 0.42.
   */
  kaufFaktor: number;
  /** Auf dieses Vielfache aufrunden, damit die Menge einer Packung entspricht. */
  packung: number;
  /** Für welche Ziele der Posten passt. Leer heisst: für alle. */
  ziele?: Goal[];
}

/**
 * Die Grundausstattung. Die Reihenfolge ist die Rangfolge: was oben steht,
 * wird zuerst genommen. Sortiert nach Protein je Kalorie beziehungsweise
 * nach Alltagstauglichkeit.
 */
const STAPLES: Staple[] = [
  { key: "haehnchenbrust", kategorie: "protein", kaufFaktor: 1, packung: 100 },
  { key: "magerquark", kategorie: "protein", kaufFaktor: 1, packung: 250 },
  { key: "skyr", kategorie: "protein", kaufFaktor: 1, packung: 150 },
  { key: "ei", kategorie: "protein", kaufFaktor: 1, packung: 58 },
  { key: "putenbrust", kategorie: "protein", kaufFaktor: 1, packung: 100 },
  { key: "rinderhack", kategorie: "protein", kaufFaktor: 1, packung: 250, ziele: ["maintain", "lean_bulk"] },
  { key: "lachs", kategorie: "protein", kaufFaktor: 1, packung: 125, ziele: ["maintain", "lean_bulk"] },
  { key: "huettenkaese", kategorie: "protein", kaufFaktor: 1, packung: 200 },
  { key: "tofu", kategorie: "protein", kaufFaktor: 1, packung: 200 },
  { key: "whey", kategorie: "protein", kaufFaktor: 1, packung: 30 },

  { key: "haferflocken", kategorie: "kohlenhydrate", kaufFaktor: 1, packung: 100 },
  { key: "reis_gekocht", kategorie: "kohlenhydrate", kaufFaktor: 0.4, packung: 100 },
  { key: "kartoffeln", kategorie: "kohlenhydrate", kaufFaktor: 1, packung: 250 },
  { key: "nudeln_gekocht", kategorie: "kohlenhydrate", kaufFaktor: 0.42, packung: 100 },
  { key: "vollkornbrot", kategorie: "kohlenhydrate", kaufFaktor: 1, packung: 45 },
  { key: "suesskartoffel", kategorie: "kohlenhydrate", kaufFaktor: 1, packung: 250 },

  { key: "olivenoel", kategorie: "fett", kaufFaktor: 1, packung: 50 },
  { key: "mandeln", kategorie: "fett", kaufFaktor: 1, packung: 50 },
  { key: "erdnussbutter", kategorie: "fett", kaufFaktor: 1, packung: 50 },
  { key: "avocado", kategorie: "fett", kaufFaktor: 1, packung: 150 },

  { key: "brokkoli", kategorie: "gemuese", kaufFaktor: 1, packung: 250 },
  { key: "paprika", kategorie: "gemuese", kaufFaktor: 1, packung: 150 },
  { key: "tomate", kategorie: "gemuese", kaufFaktor: 1, packung: 100 },
  { key: "gurke", kategorie: "gemuese", kaufFaktor: 1, packung: 300 },
  { key: "zwiebel", kategorie: "gemuese", kaufFaktor: 1, packung: 80 },

  { key: "banane", kategorie: "obst", kaufFaktor: 1, packung: 120 },
  { key: "beeren", kategorie: "obst", kaufFaktor: 1, packung: 125 },
  { key: "apfel", kategorie: "obst", kaufFaktor: 1, packung: 180 },
];

/**
 * Was hinter einer Unverträglichkeit steckt.
 *
 * "Laktose" ist kein Lebensmittel, sondern ein Grund, bestimmte wegzulassen.
 * Ohne diese Zuordnung landet Magerquark auf der Liste eines Menschen, der
 * keine Milch verträgt. Die Zuordnung ist bewusst grob und lässt lieber ein
 * Lebensmittel zu viel weg als eines zu wenig.
 */
const UNVERTRAEGLICHKEIT: Array<{ woerter: string[]; keys: string[] }> = [
  {
    woerter: ["laktose", "milchzucker", "milcheiweiss", "milch", "kuhmilch", "milchprodukte"],
    keys: ["magerquark", "skyr", "huettenkaese", "griechischer_joghurt", "milch", "gouda", "butter", "whey"],
  },
  {
    woerter: ["gluten", "weizen", "zoeliakie", "getreide"],
    keys: ["haferflocken", "nudeln_gekocht", "vollkornbrot"],
  },
  { woerter: ["nuesse", "nuss", "baumnuesse", "mandel", "mandeln"], keys: ["mandeln"] },
  { woerter: ["erdnuss", "erdnuesse"], keys: ["erdnussbutter"] },
  { woerter: ["ei", "eier", "hühnerei", "huehnerei"], keys: ["ei"] },
  { woerter: ["fisch", "meeresfruechte", "schalentiere"], keys: ["lachs", "thunfisch"] },
  { woerter: ["soja", "sojaeiweiss"], keys: ["tofu"] },
  { woerter: ["fleisch", "vegetarisch", "vegan"], keys: ["haehnchenbrust", "putenbrust", "rinderhack", "lachs", "thunfisch"] },
  { woerter: ["fruktose", "fruchtzucker"], keys: ["apfel", "banane", "beeren"] },
  { woerter: ["histamin"], keys: ["thunfisch", "gouda", "tomate"] },
];

/**
 * Höchstmenge je Lebensmittel und Tag, in Gramm der gekauften Ware.
 *
 * Ohne Deckel landen bei hohen Zielen 270 g Haferflocken am Tag auf der
 * Liste. Die Rechnung stimmt, gegessen wird das trotzdem nicht. Was durch
 * den Deckel wegfällt, geht an die anderen Posten derselben Gruppe.
 */
const MAX_PRO_TAG: Record<string, number> = {
  haehnchenbrust: 300, putenbrust: 300, rinderhack: 250, lachs: 200, thunfisch: 200,
  magerquark: 400, skyr: 350, huettenkaese: 250, griechischer_joghurt: 300,
  tofu: 250, whey: 60, ei: 180,
  haferflocken: 120, reis_gekocht: 150, nudeln_gekocht: 150, kartoffeln: 500,
  suesskartoffel: 400, vollkornbrot: 200,
  olivenoel: 30, mandeln: 50, erdnussbutter: 40, avocado: 150,
};

const FOOD_BY_KEY = new Map<string, FoodRef>(FOODS.map((f) => [f.key, f]));

export function buildShoppingList(params: {
  targets: MacroTargets;
  goal: Goal;
  /** Für wie viele Tage eingekauft wird. Ueblich sind drei bis sieben. */
  tage?: number;
  /** Was schon zu Hause ist. Diese Posten fallen weg oder werden kleiner. */
  vorrat?: string[];
  /** Was der Nutzer nicht verträgt oder nicht will, als freie Wörter. */
  meiden?: string[];
}): ShoppingList {
  const tage = clamp(Math.round(params.tage ?? 7), 1, 14);
  const vorrat = (params.vorrat ?? []).map(normalize).filter(Boolean);
  const meidenRoh = (params.meiden ?? []).map((m) => m.trim()).filter(Boolean);
  const meidenNorm = meidenRoh.map(normalize).filter(Boolean);

  const erlaubt = STAPLES.filter((s) => {
    if (s.ziele && !s.ziele.includes(params.goal)) return false;
    const food = FOOD_BY_KEY.get(s.key);
    if (!food) return false;
    return !istGemieden(food, meidenNorm);
  });

  const items: ShoppingItem[] = [];

  // Protein zuerst. Es ist der Makro, der am ehesten fehlt, und der teuerste.
  const proteinBedarf = params.targets.proteinG * tage * ANTEIL.protein;
  items.push(...verteile(erlaubt.filter((s) => s.kategorie === "protein"), 4, proteinBedarf, "proteinG", tage, vorrat));

  const kohlenhydratBedarf = params.targets.carbsG * tage * ANTEIL.kohlenhydrate;
  items.push(...verteile(erlaubt.filter((s) => s.kategorie === "kohlenhydrate"), 4, kohlenhydratBedarf, "carbsG", tage, vorrat));

  const fettBedarf = params.targets.fatG * tage * ANTEIL.fett;
  items.push(...verteile(erlaubt.filter((s) => s.kategorie === "fett"), 2, fettBedarf, "fatG", tage, vorrat));

  // Gemüse und Obst laufen über Menge, nicht über Makros. Sie liefern zu
  // wenig Kalorien, als dass eine Makrorechnung sinnvolle Mengen ergäbe.
  const obstGramm = GEMUESE_G_PRO_TAG * OBST_ANTEIL * tage;
  const gemueseGramm = GEMUESE_G_PRO_TAG * (1 - OBST_ANTEIL) * tage;
  items.push(...nachMenge(erlaubt.filter((s) => s.kategorie === "gemuese"), 3, gemueseGramm, tage, vorrat, "Gemüse"));
  items.push(...nachMenge(erlaubt.filter((s) => s.kategorie === "obst"), 2, obstGramm, tage, vorrat, "Obst"));

  return {
    tage,
    items: items.filter((i) => i.gramm > 0),
    gemieden: meidenRoh,
    hinweis:
      `Gerechnet für ${tage} ${tage === 1 ? "Tag" : "Tage"} aus deinen Tageszielen: ` +
      `${params.targets.kcal} kcal, ${params.targets.proteinG} g Protein, ` +
      `${params.targets.carbsG} g Kohlenhydrate, ${params.targets.fatG} g Fett. ` +
      "Gewürze, Getränke und alles ausserhalb der Makros stehen nicht drauf.",
  };
}

/**
 * Verteilt einen Makrobedarf auf mehrere Lebensmittel.
 *
 * Nicht alles auf eine Karte: wer sieben Tage lang nur Hähnchen kauft, isst
 * am vierten Tag kein Hähnchen mehr. Deshalb wird der Bedarf auf bis zu
 * `anzahl` Posten verteilt, absteigend gewichtet.
 */
function verteile(
  staples: Staple[],
  anzahl: number,
  bedarf: number,
  makro: "proteinG" | "carbsG" | "fatG",
  tage: number,
  vorrat: string[],
): ShoppingItem[] {
  const gewaehlt = staples.slice(0, anzahl);
  if (gewaehlt.length === 0 || bedarf <= 0) return [];

  // Absteigende Gewichte, aber flach. 1 zu 0.67 zu 0.5 statt 1 zu 0.5 zu 0.33.
  // Steile Gewichte packen fast alles auf den ersten Posten, und dann steht
  // dort eine Menge, die niemand isst.
  const gewichte = gewaehlt.map((_, i) => 1 / (i * 0.5 + 1));
  const summe = gewichte.reduce((a, b) => a + b, 0);

  // Rohmengen rechnen, dann deckeln, dann den Ueberhang auf die Posten mit
  // Luft verteilen. Ein Durchgang reicht, mehr wäre Scheingenauigkeit.
  const roh = gewaehlt.map((staple, i) => {
    const food = FOOD_BY_KEY.get(staple.key);
    if (!food || food.per100[makro] <= 0) return null;
    const anteil = bedarf * ((gewichte[i] ?? 0) / summe);
    return {
      staple,
      food,
      proHundert: food.per100[makro],
      gramm: (anteil / food.per100[makro]) * 100 * staple.kaufFaktor,
      deckel: (MAX_PRO_TAG[staple.key] ?? Infinity) * tage,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  let ueberhang = 0;
  for (const eintrag of roh) {
    if (eintrag.gramm > eintrag.deckel) {
      ueberhang += eintrag.gramm - eintrag.deckel;
      eintrag.gramm = eintrag.deckel;
    }
  }
  if (ueberhang > 0) {
    const luftGesamt = roh.reduce((sum, e) => sum + Math.max(0, e.deckel - e.gramm), 0);
    if (luftGesamt > 0) {
      for (const eintrag of roh) {
        const luft = Math.max(0, eintrag.deckel - eintrag.gramm);
        eintrag.gramm += ueberhang * (luft / luftGesamt);
      }
    }
  }

  const out: ShoppingItem[] = [];
  for (const eintrag of roh) {
    const gramm = aufPackung(kuerzeUmVorrat(eintrag.gramm, eintrag.food, vorrat), eintrag.staple.packung);
    if (gramm <= 0) continue;
    out.push({
      key: eintrag.food.key,
      name: eintrag.food.label,
      gramm,
      menge: mengeText(gramm, eintrag.food),
      kategorie: eintrag.staple.kategorie,
      grund: `deckt etwa ${Math.round((gramm / eintrag.staple.kaufFaktor / 100) * eintrag.proHundert)} g ${makroName(makro)} über ${tage} Tage`,
    });
  }
  return out;
}

/** Gemüse und Obst nach Gewicht, gleichmässig verteilt. */
function nachMenge(
  staples: Staple[],
  anzahl: number,
  gesamt: number,
  tage: number,
  vorrat: string[],
  label: string,
): ShoppingItem[] {
  const gewaehlt = staples.slice(0, anzahl);
  if (gewaehlt.length === 0 || gesamt <= 0) return [];
  const out: ShoppingItem[] = [];
  for (const staple of gewaehlt) {
    const food = FOOD_BY_KEY.get(staple.key);
    if (!food) continue;
    const gramm = aufPackung(kuerzeUmVorrat(gesamt / gewaehlt.length, food, vorrat), staple.packung);
    if (gramm <= 0) continue;
    out.push({
      key: food.key,
      name: food.label,
      gramm,
      menge: mengeText(gramm, food),
      kategorie: staple.kategorie,
      grund: `${label} über ${tage} Tage, Ziel sind 400 g Obst und Gemüse am Tag`,
    });
  }
  return out;
}

/**
 * Was schon zu Hause ist, muss nicht gekauft werden.
 *
 * Der Vorrat kennt keine Mengen, nur Namen. Deshalb wird pauschal um die
 * Hälfte gekürzt statt auf null gesetzt: eine angebrochene Packung reicht
 * selten für eine ganze Woche.
 */
function kuerzeUmVorrat(gramm: number, food: FoodRef, vorrat: string[]): number {
  if (vorrat.length === 0) return gramm;
  const treffer = vorrat.some((eintrag) =>
    food.aliases.some((alias) => {
      const a = normalize(alias);
      return a.length > 2 && (eintrag.includes(a) || a.includes(eintrag));
    }),
  );
  return treffer ? gramm * 0.5 : gramm;
}

/** Rundet auf ganze Packungen auf. Niemand kauft 137 g Quark. */
function aufPackung(gramm: number, packung: number): number {
  if (gramm <= 0) return 0;
  return Math.max(packung, Math.ceil(gramm / packung) * packung);
}

/** Schreibt eine Menge so, wie sie im Laden steht. */
function mengeText(gramm: number, food: FoodRef): string {
  if (food.key === "ei") return `${Math.round(gramm / (food.pieceG ?? 58))} Stück`;
  if (food.key === "whey") return `${Math.round(gramm / 30)} Portionen à 30 g`;
  if (food.key === "olivenoel") return `${Math.round(gramm)} ml`;
  if (food.pieceG && gramm / food.pieceG >= 1) {
    const stueck = Math.round(gramm / food.pieceG);
    if (stueck >= 1 && stueck <= 30) return `${stueck} Stück, etwa ${kiloText(gramm)}`;
  }
  return kiloText(gramm);
}

function kiloText(gramm: number): string {
  if (gramm >= 1000) return `${(gramm / 1000).toFixed(gramm % 1000 === 0 ? 0 : 1).replace(".", ",")} kg`;
  return `${Math.round(gramm)} g`;
}

function makroName(makro: "proteinG" | "carbsG" | "fatG"): string {
  return makro === "proteinG" ? "Protein" : makro === "carbsG" ? "Kohlenhydrate" : "Fett";
}

function istGemieden(food: FoodRef, meiden: string[]): boolean {
  if (meiden.length === 0) return false;
  const namen = [normalize(food.label), ...food.aliases.map(normalize)];
  if (meiden.some((wort) => wort.length > 2 && namen.some((n) => n.includes(wort) || wort.includes(n)))) return true;
  // Auch der Grund zählt, nicht nur der Name. Wer keine Laktose verträgt,
  // nennt selten Magerquark, meint ihn aber mit.
  return UNVERTRAEGLICHKEIT.some(
    (regel) => regel.keys.includes(food.key) && regel.woerter.some((w) => meiden.some((m) => m.includes(normalize(w)))),
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Fasst eine Liste in einem vorlesbaren Satz zusammen. */
export function shoppingListText(liste: ShoppingList): string {
  if (liste.items.length === 0) return "Die Liste ist leer.";
  const nachKategorie = new Map<Kategorie, ShoppingItem[]>();
  for (const item of liste.items) {
    const bisher = nachKategorie.get(item.kategorie) ?? [];
    bisher.push(item);
    nachKategorie.set(item.kategorie, bisher);
  }
  const titel: Record<Kategorie, string> = {
    protein: "Protein",
    kohlenhydrate: "Kohlenhydrate",
    gemuese: "Gemüse",
    obst: "Obst",
    fett: "Fett",
    sonstiges: "Sonstiges",
  };
  const teile: string[] = [];
  for (const [kategorie, items] of nachKategorie) {
    teile.push(`${titel[kategorie]}: ${items.map((i) => `${i.name} ${i.menge}`).join(", ")}.`);
  }
  return teile.join(" ");
}
