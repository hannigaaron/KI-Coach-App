/**
 * Zutaten und Rezepte für die Empfehlungen.
 *
 * Die Nährwerte sind gerundete Richtwerte je 100 g aus gängigen Nährwerttabellen,
 * abgestimmt mit der Tabelle in `packages/coach/src/foods.ts`, damit dieselbe
 * Zutat in beiden Wegen dieselbe Zahl trägt. Für Markenprodukte weichen sie ab,
 * am stärksten bei Whey und Wraps. Eine echte Datenquelle wie der
 * Bundeslebensmittelschlüssel ersetzt sie, sobald es eine gibt.
 *
 * Allergene und Unverträglichkeiten hängen an der Zutat und nicht am Rezept.
 * Ein Rezept, das jemand von Hand als "sojafrei" markiert, ist es so lange, bis
 * jemand Sojasauce hineinschreibt. Ein Rezept, dessen Allergene aus den Zutaten
 * kommen, kann nicht falsch markiert sein.
 *
 * Die Namen der Allergene sind dieselben wie in `ALLERGENE_EU` im Fragebogen,
 * also die 14 nach Verordnung (EU) Nr. 1169/2011, Anhang II. Hafer zählt dort
 * zu den glutenhaltigen Getreiden. Die Unverträglichkeiten sind eine grobe
 * Liste nach gängigen Ernährungsempfehlungen. Gerade bei Histamin verträgt
 * jeder Mensch anderes, und das sagt die App auch so.
 */

export type Allergen =
  | "Gluten" | "Krebstiere" | "Eier" | "Fisch" | "Erdnüsse" | "Soja" | "Milch"
  | "Schalenfrüchte" | "Sellerie" | "Senf" | "Sesam" | "Sulfite" | "Lupinen" | "Weichtiere";

export type Unvertraeglichkeit = "Laktose" | "Histamin" | "Fruktose" | "Sorbit";

/** Was eine Ernährungsform oder ein Ausschluss treffen kann. */
export type Herkunft = "fleisch" | "fisch" | "meeresfrucht" | "ei" | "milch" | "honig";

export interface Zutat {
  name: string;
  per100: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  allergene?: Allergen[];
  unvertraeglich?: Unvertraeglichkeit[];
  herkunft?: Herkunft;
  /** Für die Ausschlüsse aus dem Fragebogen. */
  sorte?: "schwein" | "rind" | "gefluegel";
  /** Gewicht eines Stücks, damit "3 Eier" statt "174 g Ei" dasteht. */
  stueckG?: number;
  stueckName?: [string, string];
}

export const ZUTATEN = {
  haferflocken: { name: "Haferflocken", per100: { kcal: 372, proteinG: 13.5, fatG: 7, carbsG: 58.7 }, allergene: ["Gluten"] },
  milch: { name: "Milch 1,5 %", per100: { kcal: 47, proteinG: 3.4, fatG: 1.5, carbsG: 4.9 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  haferdrink: { name: "Haferdrink", per100: { kcal: 46, proteinG: 0.3, fatG: 1.5, carbsG: 7 }, allergene: ["Gluten"] },
  magerquark: { name: "Magerquark", per100: { kcal: 67, proteinG: 12, fatG: 0.3, carbsG: 4.1 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  skyr: { name: "Skyr", per100: { kcal: 63, proteinG: 11, fatG: 0.2, carbsG: 4 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  joghurt: { name: "Griechischer Joghurt 2 %", per100: { kcal: 73, proteinG: 9, fatG: 2, carbsG: 4 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  sojajoghurt: { name: "Sojajoghurt natur", per100: { kcal: 50, proteinG: 4, fatG: 2.3, carbsG: 2.1 }, allergene: ["Soja"] },
  huettenkaese: { name: "Hüttenkäse", per100: { kcal: 98, proteinG: 11, fatG: 4.3, carbsG: 3.4 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  feta: { name: "Feta", per100: { kcal: 264, proteinG: 14, fatG: 21, carbsG: 4 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  parmesan: { name: "Parmesan", per100: { kcal: 431, proteinG: 38, fatG: 29, carbsG: 4 }, allergene: ["Milch"], unvertraeglich: ["Histamin"], herkunft: "milch" },
  whey: { name: "Whey Protein", per100: { kcal: 380, proteinG: 75, fatG: 6, carbsG: 8 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  ei: { name: "Ei", per100: { kcal: 143, proteinG: 12.6, fatG: 9.5, carbsG: 0.7 }, allergene: ["Eier"], herkunft: "ei", stueckG: 58, stueckName: ["Ei", "Eier"] },

  banane: { name: "Banane", per100: { kcal: 89, proteinG: 1.1, fatG: 0.3, carbsG: 23 } },
  beeren: { name: "Beeren", per100: { kcal: 45, proteinG: 1, fatG: 0.4, carbsG: 8 } },
  apfel: { name: "Apfel", per100: { kcal: 52, proteinG: 0.3, fatG: 0.2, carbsG: 14 }, unvertraeglich: ["Fruktose"] },
  honig: { name: "Honig", per100: { kcal: 304, proteinG: 0.3, fatG: 0, carbsG: 82 }, unvertraeglich: ["Fruktose"], herkunft: "honig" },
  erdnussbutter: { name: "Erdnussbutter", per100: { kcal: 588, proteinG: 25, fatG: 50, carbsG: 20 }, allergene: ["Erdnüsse"] },
  mandeln: { name: "Mandeln", per100: { kcal: 579, proteinG: 21, fatG: 50, carbsG: 22 }, allergene: ["Schalenfrüchte"] },
  chiasamen: { name: "Chiasamen", per100: { kcal: 486, proteinG: 16.5, fatG: 30.7, carbsG: 42.1 } },

  vollkornbrot: { name: "Vollkornbrot", per100: { kcal: 210, proteinG: 7, fatG: 1.2, carbsG: 40 }, allergene: ["Gluten"], stueckG: 45, stueckName: ["Scheibe Vollkornbrot", "Scheiben Vollkornbrot"] },
  wrap: { name: "Weizenwrap", per100: { kcal: 310, proteinG: 8, fatG: 7, carbsG: 52 }, allergene: ["Gluten"], stueckG: 65, stueckName: ["Wrap", "Wraps"] },
  reiswaffeln: { name: "Reiswaffeln", per100: { kcal: 387, proteinG: 8, fatG: 3, carbsG: 81 }, stueckG: 8, stueckName: ["Reiswaffel", "Reiswaffeln"] },
  reis: { name: "Reis, roh", per100: { kcal: 350, proteinG: 7, fatG: 0.6, carbsG: 78 } },
  nudeln: { name: "Vollkornnudeln, roh", per100: { kcal: 345, proteinG: 13, fatG: 2.5, carbsG: 64 }, allergene: ["Gluten"] },
  couscous: { name: "Couscous, roh", per100: { kcal: 365, proteinG: 12.5, fatG: 1, carbsG: 74 }, allergene: ["Gluten"] },
  kartoffeln: { name: "Kartoffeln", per100: { kcal: 77, proteinG: 2, fatG: 0.1, carbsG: 17 } },
  suesskartoffel: { name: "Süßkartoffel", per100: { kcal: 86, proteinG: 1.6, fatG: 0.1, carbsG: 20 } },

  haehnchen: { name: "Hähnchenbrust", per100: { kcal: 120, proteinG: 23, fatG: 2.6, carbsG: 0 }, herkunft: "fleisch", sorte: "gefluegel" },
  pute: { name: "Putenbrust", per100: { kcal: 110, proteinG: 24, fatG: 1, carbsG: 0 }, herkunft: "fleisch", sorte: "gefluegel" },
  rinderhack: { name: "Rinderhack 5 %", per100: { kcal: 137, proteinG: 21.5, fatG: 5, carbsG: 0 }, herkunft: "fleisch", sorte: "rind" },
  lachs: { name: "Lachs", per100: { kcal: 208, proteinG: 20, fatG: 13, carbsG: 0 }, allergene: ["Fisch"], herkunft: "fisch" },
  thunfisch: { name: "Thunfisch im eigenen Saft", per100: { kcal: 116, proteinG: 26, fatG: 1, carbsG: 0 }, allergene: ["Fisch"], unvertraeglich: ["Histamin"], herkunft: "fisch" },
  garnelen: { name: "Garnelen", per100: { kcal: 85, proteinG: 20, fatG: 0.5, carbsG: 0 }, allergene: ["Krebstiere"], herkunft: "meeresfrucht" },
  tofu: { name: "Tofu natur", per100: { kcal: 130, proteinG: 13.5, fatG: 7.5, carbsG: 1.7 }, allergene: ["Soja"] },
  kichererbsen: { name: "Kichererbsen, gegart", per100: { kcal: 164, proteinG: 8.9, fatG: 2.6, carbsG: 27.4 } },
  kidneybohnen: { name: "Kidneybohnen, gegart", per100: { kcal: 127, proteinG: 8.7, fatG: 0.5, carbsG: 22.8 } },
  linsen: { name: "Linsen, gegart", per100: { kcal: 116, proteinG: 9, fatG: 0.4, carbsG: 20 } },
  hummus: { name: "Hummus", per100: { kcal: 166, proteinG: 7.9, fatG: 9.6, carbsG: 14.3 }, allergene: ["Sesam"] },

  brokkoli: { name: "Brokkoli", per100: { kcal: 34, proteinG: 2.8, fatG: 0.4, carbsG: 7 } },
  paprika: { name: "Paprika", per100: { kcal: 31, proteinG: 1, fatG: 0.3, carbsG: 6 } },
  zucchini: { name: "Zucchini", per100: { kcal: 17, proteinG: 1.2, fatG: 0.3, carbsG: 3.1 } },
  tomate: { name: "Tomaten", per100: { kcal: 18, proteinG: 0.9, fatG: 0.2, carbsG: 3.9 }, unvertraeglich: ["Histamin"] },
  passata: { name: "Passierte Tomaten", per100: { kcal: 32, proteinG: 1.4, fatG: 0.2, carbsG: 5.5 }, unvertraeglich: ["Histamin"] },
  zwiebel: { name: "Zwiebel", per100: { kcal: 40, proteinG: 1.1, fatG: 0.1, carbsG: 9.3 } },
  spinat: { name: "Spinat", per100: { kcal: 23, proteinG: 2.9, fatG: 0.4, carbsG: 3.6 }, unvertraeglich: ["Histamin"] },
  gurke: { name: "Gurke", per100: { kcal: 15, proteinG: 0.7, fatG: 0.1, carbsG: 3.6 } },
  salat: { name: "Blattsalat", per100: { kcal: 15, proteinG: 1.4, fatG: 0.2, carbsG: 2.9 } },
  gemuese: { name: "Pfannengemüse, tiefgekühlt", per100: { kcal: 40, proteinG: 2.5, fatG: 0.4, carbsG: 6 } },
  avocado: { name: "Avocado", per100: { kcal: 160, proteinG: 2, fatG: 15, carbsG: 9 } },
  olivenoel: { name: "Olivenöl", per100: { kcal: 884, proteinG: 0, fatG: 100, carbsG: 0 } },
  sojasauce: { name: "Sojasauce", per100: { kcal: 53, proteinG: 8, fatG: 0.6, carbsG: 4.9 }, allergene: ["Soja", "Gluten"] },
} satisfies Record<string, Zutat>;

export type ZutatKey = keyof typeof ZUTATEN;

export type RezeptArt = "fruehstueck" | "hauptmahlzeit" | "snack";

export interface Rezept {
  id: string;
  name: string;
  art: RezeptArt;
  minuten: number;
  /** Mengen für eine Portion, aus der die App hoch oder runter rechnet. */
  zutaten: Array<{ z: ZutatKey; g: number }>;
  schritte: string[];
  /** Mindestens eines davon muss da sein. Leer heisst: geht ohne Gerät. */
  geraete: string[];
}

export const REZEPTE: Rezept[] = [
  // Frühstück
  {
    id: "protein-porridge", name: "Protein Porridge mit Beeren", art: "fruehstueck", minuten: 10, geraete: ["Herd", "Mikrowelle"],
    zutaten: [{ z: "haferflocken", g: 60 }, { z: "milch", g: 250 }, { z: "whey", g: 30 }, { z: "beeren", g: 100 }],
    schritte: ["Haferflocken mit der Milch aufkochen und vier Minuten quellen lassen.", "Vom Herd nehmen und das Whey einrühren, sonst klumpt es.", "Beeren darauf geben."],
  },
  {
    id: "quark-bowl", name: "Quark Bowl mit Beeren und Hafer", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "magerquark", g: 250 }, { z: "beeren", g: 125 }, { z: "haferflocken", g: 30 }, { z: "honig", g: 10 }],
    schritte: ["Quark glatt rühren, bei Bedarf mit einem Schluck Wasser.", "Beeren und Haferflocken darauf verteilen.", "Mit Honig abrunden."],
  },
  {
    id: "skyr-erdnuss", name: "Skyr mit Banane und Erdnussbutter", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "skyr", g: 250 }, { z: "banane", g: 120 }, { z: "erdnussbutter", g: 15 }, { z: "haferflocken", g: 20 }],
    schritte: ["Skyr in eine Schale geben.", "Banane in Scheiben schneiden und darauf legen.", "Erdnussbutter darüber ziehen, Haferflocken darüber streuen."],
  },
  {
    id: "ruehrei-brot", name: "Rührei mit Vollkornbrot und Tomate", art: "fruehstueck", minuten: 10, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 174 }, { z: "vollkornbrot", g: 90 }, { z: "tomate", g: 100 }, { z: "olivenoel", g: 5 }],
    schritte: ["Eier verquirlen, salzen und pfeffern.", "In wenig Öl bei mittlerer Hitze langsam stocken lassen.", "Mit Brot und geschnittener Tomate anrichten."],
  },
  {
    id: "overnight-oats-vegan", name: "Overnight Oats mit Chia", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "haferflocken", g: 60 }, { z: "sojajoghurt", g: 200 }, { z: "haferdrink", g: 100 }, { z: "chiasamen", g: 15 }, { z: "beeren", g: 100 }],
    schritte: ["Haferflocken, Chiasamen, Sojajoghurt und Haferdrink verrühren.", "Abgedeckt über Nacht in den Kühlschrank stellen.", "Morgens mit Beeren essen."],
  },
  {
    id: "tofu-ruehrei", name: "Tofu Rührei mit Spinat", art: "fruehstueck", minuten: 12, geraete: ["Herd"],
    zutaten: [{ z: "tofu", g: 200 }, { z: "spinat", g: 60 }, { z: "tomate", g: 100 }, { z: "vollkornbrot", g: 90 }, { z: "olivenoel", g: 5 }],
    schritte: ["Tofu mit einer Gabel grob zerdrücken.", "In Öl anbraten, mit Salz, Pfeffer und etwas Kurkuma würzen.", "Spinat unterheben, bis er zusammenfällt.", "Mit Brot und Tomate servieren."],
  },
  {
    id: "joghurt-apfel", name: "Griechischer Joghurt mit Apfel und Mandeln", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "joghurt", g: 250 }, { z: "apfel", g: 150 }, { z: "mandeln", g: 15 }],
    schritte: ["Apfel in Würfel schneiden.", "Mit dem Joghurt mischen.", "Mandeln grob hacken und darüber geben."],
  },
  {
    id: "protein-pancakes", name: "Protein Pancakes mit Banane", art: "fruehstueck", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "haferflocken", g: 60 }, { z: "ei", g: 116 }, { z: "magerquark", g: 125 }, { z: "banane", g: 120 }, { z: "olivenoel", g: 5 }],
    schritte: ["Haferflocken, Eier, Quark und die halbe Banane zu einem Teig pürieren oder zerdrücken.", "In einer leicht geölten Pfanne kleine Pancakes von beiden Seiten backen.", "Mit der restlichen Banane servieren."],
  },

  // Hauptmahlzeiten
  {
    id: "haehnchen-reis-brokkoli", name: "Hähnchen mit Reis und Brokkoli", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "haehnchen", g: 180 }, { z: "reis", g: 80 }, { z: "brokkoli", g: 200 }, { z: "olivenoel", g: 10 }, { z: "sojasauce", g: 15 }],
    schritte: ["Reis nach Packung kochen.", "Hähnchen in Streifen schneiden und in Öl rundum anbraten.", "Brokkoli in Röschen dazugeben und fünf Minuten mitgaren.", "Mit Sojasauce ablöschen und mit dem Reis servieren."],
  },
  {
    id: "lachs-kartoffeln", name: "Ofenlachs mit Kartoffeln und Spinat", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen", "Airfryer"],
    zutaten: [{ z: "lachs", g: 150 }, { z: "kartoffeln", g: 300 }, { z: "spinat", g: 150 }, { z: "olivenoel", g: 5 }],
    schritte: ["Kartoffeln halbieren, mit Öl und Salz bei 200 Grad 15 Minuten backen.", "Lachs dazulegen und weitere 12 bis 15 Minuten garen.", "Spinat in einer Pfanne zusammenfallen lassen und dazu servieren."],
  },
  {
    id: "chili", name: "Chili con Carne mit Reis", art: "hauptmahlzeit", minuten: 35, geraete: ["Herd"],
    zutaten: [{ z: "rinderhack", g: 150 }, { z: "kidneybohnen", g: 120 }, { z: "passata", g: 200 }, { z: "paprika", g: 100 }, { z: "zwiebel", g: 60 }, { z: "reis", g: 70 }, { z: "olivenoel", g: 5 }],
    schritte: ["Zwiebel und Paprika würfeln und in Öl anschwitzen.", "Hack dazugeben und krümelig braten.", "Passierte Tomaten und Bohnen dazu, mit Kreuzkümmel, Paprika und Chili würzen und 20 Minuten köcheln.", "Reis nach Packung kochen und dazu servieren."],
  },
  {
    id: "puten-wrap", name: "Puten Wraps mit Joghurtsauce", art: "hauptmahlzeit", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "pute", g: 150 }, { z: "wrap", g: 130 }, { z: "salat", g: 50 }, { z: "tomate", g: 100 }, { z: "joghurt", g: 50 }, { z: "olivenoel", g: 5 }],
    schritte: ["Pute in Streifen schneiden und in Öl durchbraten.", "Joghurt mit Salz, Pfeffer und etwas Knoblauch verrühren.", "Wraps mit Salat, Tomate, Pute und Sauce füllen und einrollen."],
  },
  {
    id: "thunfisch-nudelsalat", name: "Nudelsalat mit Thunfisch", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "nudeln", g: 90 }, { z: "thunfisch", g: 120 }, { z: "gurke", g: 150 }, { z: "tomate", g: 100 }, { z: "joghurt", g: 60 }],
    schritte: ["Nudeln kochen und kalt abschrecken.", "Gurke und Tomaten würfeln, Thunfisch abtropfen lassen.", "Alles mit Joghurt, Salz, Pfeffer und etwas Zitrone mischen."],
  },
  {
    id: "couscous-mediterran", name: "Mediterraner Couscous mit Kichererbsen und Feta", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "couscous", g: 80 }, { z: "kichererbsen", g: 150 }, { z: "zucchini", g: 150 }, { z: "paprika", g: 100 }, { z: "feta", g: 50 }, { z: "olivenoel", g: 10 }],
    schritte: ["Couscous mit der gleichen Menge kochendem Wasser übergießen und fünf Minuten quellen lassen.", "Zucchini und Paprika würfeln und in Öl anbraten.", "Kichererbsen dazugeben und mitwärmen.", "Mit dem Couscous mischen und den Feta darüber bröseln."],
  },
  {
    id: "linsen-curry", name: "Linsen Curry mit Spinat", art: "hauptmahlzeit", minuten: 30, geraete: ["Herd"],
    zutaten: [{ z: "linsen", g: 250 }, { z: "passata", g: 150 }, { z: "spinat", g: 100 }, { z: "zwiebel", g: 60 }, { z: "reis", g: 70 }, { z: "olivenoel", g: 10 }],
    schritte: ["Zwiebel würfeln und in Öl mit Currypulver anschwitzen.", "Linsen und passierte Tomaten dazugeben und zehn Minuten köcheln.", "Spinat unterrühren, bis er zusammenfällt.", "Mit gekochtem Reis servieren."],
  },
  {
    id: "tofu-pfanne", name: "Tofu Gemüsepfanne mit Reis", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "tofu", g: 200 }, { z: "gemuese", g: 300 }, { z: "reis", g: 80 }, { z: "sojasauce", g: 20 }, { z: "olivenoel", g: 10 }],
    schritte: ["Reis nach Packung kochen.", "Tofu würfeln und in Öl knusprig braten.", "Gemüse dazugeben und sechs Minuten mitbraten.", "Mit Sojasauce ablöschen und mit Reis servieren."],
  },
  {
    id: "garnelen-nudeln", name: "Vollkornnudeln mit Garnelen und Zucchini", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "garnelen", g: 180 }, { z: "nudeln", g: 90 }, { z: "zucchini", g: 200 }, { z: "tomate", g: 150 }, { z: "olivenoel", g: 10 }],
    schritte: ["Nudeln kochen.", "Zucchini in Scheiben in Öl anbraten, Tomaten halbieren und dazugeben.", "Garnelen zwei bis drei Minuten mitbraten, bis sie rosa sind.", "Mit den Nudeln mischen, salzen und pfeffern."],
  },
  {
    id: "suesskartoffel-bowl", name: "Süßkartoffel Bowl mit Hähnchen und Avocado", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen", "Airfryer"],
    zutaten: [{ z: "haehnchen", g: 150 }, { z: "suesskartoffel", g: 250 }, { z: "brokkoli", g: 150 }, { z: "avocado", g: 50 }, { z: "olivenoel", g: 5 }],
    schritte: ["Süßkartoffel würfeln, mit Öl und Salz bei 200 Grad 20 Minuten rösten.", "Hähnchen würzen und in den letzten 15 Minuten mitgaren.", "Brokkoli dämpfen oder mitrösten.", "In einer Schale mit Avocado anrichten."],
  },
  {
    id: "gemuese-omelett", name: "Gemüse Omelett mit Feta", art: "hauptmahlzeit", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 232 }, { z: "paprika", g: 100 }, { z: "spinat", g: 80 }, { z: "feta", g: 40 }, { z: "vollkornbrot", g: 45 }],
    schritte: ["Paprika würfeln und kurz anbraten, Spinat dazu.", "Verquirlte Eier darüber gießen und bei kleiner Hitze stocken lassen.", "Feta darüber bröseln, zuklappen und mit Brot servieren."],
  },
  {
    id: "hack-kartoffel-pfanne", name: "Hackfleisch Kartoffel Pfanne", art: "hauptmahlzeit", minuten: 30, geraete: ["Herd"],
    zutaten: [{ z: "rinderhack", g: 150 }, { z: "kartoffeln", g: 300 }, { z: "paprika", g: 150 }, { z: "zwiebel", g: 60 }, { z: "olivenoel", g: 10 }],
    schritte: ["Kartoffeln würfeln und in Öl zehn Minuten braten.", "Zwiebel und Paprika dazugeben.", "Hack mitbraten, bis es durch ist, kräftig würzen."],
  },
  {
    id: "lachs-reis-bowl", name: "Lachs Reis Bowl mit Gurke und Avocado", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "lachs", g: 130 }, { z: "reis", g: 80 }, { z: "gurke", g: 100 }, { z: "avocado", g: 50 }, { z: "sojasauce", g: 15 }],
    schritte: ["Reis kochen.", "Lachs in der Pfanne von beiden Seiten braten.", "Gurke und Avocado in Scheiben schneiden.", "Alles auf dem Reis anrichten und mit Sojasauce beträufeln."],
  },
  {
    id: "kichererbsen-pfanne", name: "Kichererbsen Spinat Pfanne", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "kichererbsen", g: 250 }, { z: "spinat", g: 150 }, { z: "passata", g: 150 }, { z: "zwiebel", g: 50 }, { z: "vollkornbrot", g: 90 }, { z: "olivenoel", g: 10 }],
    schritte: ["Zwiebel in Öl anschwitzen, mit Kreuzkümmel und Paprika würzen.", "Kichererbsen und passierte Tomaten dazu und fünf Minuten köcheln.", "Spinat unterheben und mit Brot servieren."],
  },
  {
    id: "airfryer-haehnchen", name: "Knuspriges Hähnchen mit Kartoffeln und Gurkensalat", art: "hauptmahlzeit", minuten: 30, geraete: ["Airfryer", "Backofen"],
    zutaten: [{ z: "haehnchen", g: 180 }, { z: "kartoffeln", g: 300 }, { z: "gurke", g: 150 }, { z: "joghurt", g: 80 }, { z: "olivenoel", g: 10 }],
    schritte: ["Kartoffeln in Spalten schneiden, mit der Hälfte des Öls und Salz bei 200 Grad 15 Minuten garen.", "Hähnchen würzen, mit dem restlichen Öl einreiben und 15 Minuten mitgaren.", "Gurke hobeln und mit Joghurt, Salz und Dill mischen."],
  },
  {
    id: "tomaten-pasta-haehnchen", name: "Tomaten Pasta mit Hähnchen und Parmesan", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "nudeln", g: 100 }, { z: "haehnchen", g: 150 }, { z: "passata", g: 200 }, { z: "zwiebel", g: 50 }, { z: "parmesan", g: 15 }, { z: "olivenoel", g: 5 }],
    schritte: ["Nudeln kochen.", "Hähnchen würfeln und mit der Zwiebel in Öl anbraten.", "Passierte Tomaten dazu, würzen und zehn Minuten köcheln.", "Mit den Nudeln mischen und Parmesan darüber reiben."],
  },

  // Snacks
  {
    id: "quark-beeren", name: "Magerquark mit Beeren", art: "snack", minuten: 3, geraete: [],
    zutaten: [{ z: "magerquark", g: 250 }, { z: "beeren", g: 100 }],
    schritte: ["Quark glatt rühren.", "Beeren darauf geben."],
  },
  {
    id: "huettenkaese-reiswaffeln", name: "Hüttenkäse auf Reiswaffeln mit Gurke", art: "snack", minuten: 3, geraete: [],
    zutaten: [{ z: "huettenkaese", g: 200 }, { z: "reiswaffeln", g: 32 }, { z: "gurke", g: 100 }],
    schritte: ["Hüttenkäse auf die Reiswaffeln streichen.", "Gurke in Scheiben darauf legen, mit Pfeffer würzen."],
  },
  {
    id: "whey-shake", name: "Whey Shake mit Banane", art: "snack", minuten: 2, geraete: [],
    zutaten: [{ z: "whey", g: 30 }, { z: "milch", g: 300 }, { z: "banane", g: 120 }],
    schritte: ["Whey mit Milch im Shaker mischen.", "Banane dazu essen oder mit in den Mixer geben."],
  },
  {
    id: "apfel-erdnuss", name: "Apfel mit Erdnussbutter", art: "snack", minuten: 2, geraete: [],
    zutaten: [{ z: "apfel", g: 180 }, { z: "erdnussbutter", g: 20 }],
    schritte: ["Apfel in Spalten schneiden.", "Mit Erdnussbutter zum Dippen essen."],
  },
  {
    id: "hummus-gemuese", name: "Hummus mit Gemüsesticks und Brot", art: "snack", minuten: 5, geraete: [],
    zutaten: [{ z: "hummus", g: 100 }, { z: "paprika", g: 150 }, { z: "gurke", g: 150 }, { z: "vollkornbrot", g: 45 }],
    schritte: ["Paprika und Gurke in Sticks schneiden.", "Mit Hummus und Brot essen."],
  },
  {
    id: "sojajoghurt-beeren", name: "Sojajoghurt mit Beeren und Chia", art: "snack", minuten: 3, geraete: [],
    zutaten: [{ z: "sojajoghurt", g: 250 }, { z: "beeren", g: 100 }, { z: "chiasamen", g: 10 }],
    schritte: ["Sojajoghurt in eine Schale geben.", "Beeren und Chiasamen darüber streuen."],
  },
  {
    id: "eier-brot", name: "Gekochte Eier mit Brot und Gurke", art: "snack", minuten: 10, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 116 }, { z: "vollkornbrot", g: 45 }, { z: "gurke", g: 100 }],
    schritte: ["Eier acht bis neun Minuten kochen und abschrecken.", "Mit Brot und Gurke essen."],
  },
];
