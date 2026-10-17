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
  // Für die Rezepte aus den Guides von Personal Coach Aaron.
  kiwi: { name: "Kiwi", per100: { kcal: 61, proteinG: 1.1, fatG: 0.5, carbsG: 14.7 }, unvertraeglich: ["Histamin"], stueckG: 75, stueckName: ["Kiwi", "Kiwis"] },
  mozzarella: { name: "Mozzarella light", per100: { kcal: 165, proteinG: 19, fatG: 9.5, carbsG: 1 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  gouda: { name: "Gouda light, gerieben", per100: { kcal: 270, proteinG: 30, fatG: 16.5, carbsG: 0 }, allergene: ["Milch"], unvertraeglich: ["Histamin"], herkunft: "milch" },
  kochsahne: { name: "Kochsahne 15 %", per100: { kcal: 160, proteinG: 2.8, fatG: 15, carbsG: 3.5 }, allergene: ["Milch"], unvertraeglich: ["Laktose"], herkunft: "milch" },
  dinkelnudeln: { name: "Dinkelnudeln, roh", per100: { kcal: 350, proteinG: 13, fatG: 2, carbsG: 68 }, allergene: ["Gluten"] },
  dinkelmehl: { name: "Dinkelmehl", per100: { kcal: 340, proteinG: 12, fatG: 1.8, carbsG: 68 }, allergene: ["Gluten"] },
  quinoa: { name: "Quinoa, roh", per100: { kcal: 368, proteinG: 14, fatG: 6, carbsG: 64 } },
  roteLinsen: { name: "Rote Linsen, roh", per100: { kcal: 340, proteinG: 24, fatG: 1.5, carbsG: 52 } },
  mais: { name: "Mais aus der Dose", per100: { kcal: 80, proteinG: 2.9, fatG: 1.2, carbsG: 15 } },
  kabeljau: { name: "Kabeljau", per100: { kcal: 82, proteinG: 18, fatG: 0.7, carbsG: 0 }, allergene: ["Fisch"], herkunft: "fisch" },
  raeucherlachs: { name: "Räucherlachs", per100: { kcal: 180, proteinG: 21, fatG: 11, carbsG: 0 }, allergene: ["Fisch"], unvertraeglich: ["Histamin"], herkunft: "fisch" },
  kochschinken: { name: "Kochschinken", per100: { kcal: 110, proteinG: 20, fatG: 3, carbsG: 1 }, herkunft: "fleisch", sorte: "schwein" },
  aubergine: { name: "Aubergine", per100: { kcal: 25, proteinG: 1, fatG: 0.2, carbsG: 5.9 } },
  radieschen: { name: "Radieschen", per100: { kcal: 16, proteinG: 1, fatG: 0.1, carbsG: 3.4 } },
  karotte: { name: "Karotte", per100: { kcal: 39, proteinG: 0.9, fatG: 0.2, carbsG: 8 } },
  champignons: { name: "Champignons", per100: { kcal: 22, proteinG: 3.1, fatG: 0.3, carbsG: 3.3 } },
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
  /** Es gibt ein Foto unter `img/rezepte/<id>.jpg`. Ohne Foto trägt die Karte ein Zeichen. */
  foto?: boolean;
}

export const REZEPTE: Rezept[] = [
  // Frühstück
  {
    id: "protein-porridge", foto: true, name: "Protein Porridge mit Beeren", art: "fruehstueck", minuten: 10, geraete: ["Herd", "Mikrowelle"],
    zutaten: [{ z: "haferflocken", g: 60 }, { z: "milch", g: 250 }, { z: "whey", g: 30 }, { z: "beeren", g: 100 }],
    schritte: ["Haferflocken mit der Milch aufkochen und vier Minuten quellen lassen.", "Vom Herd nehmen und das Whey einrühren, sonst klumpt es.", "Beeren darauf geben."],
  },
  {
    id: "quark-bowl", foto: true, name: "Quark Bowl mit Beeren und Hafer", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "magerquark", g: 250 }, { z: "beeren", g: 125 }, { z: "haferflocken", g: 30 }, { z: "honig", g: 10 }],
    schritte: ["Quark glatt rühren, bei Bedarf mit einem Schluck Wasser.", "Beeren und Haferflocken darauf verteilen.", "Mit Honig abrunden."],
  },
  {
    id: "skyr-erdnuss", foto: true, name: "Skyr mit Banane und Erdnussbutter", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "skyr", g: 250 }, { z: "banane", g: 120 }, { z: "erdnussbutter", g: 15 }, { z: "haferflocken", g: 20 }],
    schritte: ["Skyr in eine Schale geben.", "Banane in Scheiben schneiden und darauf legen.", "Erdnussbutter darüber ziehen, Haferflocken darüber streuen."],
  },
  {
    id: "ruehrei-brot", foto: true, name: "Rührei mit Vollkornbrot und Tomate", art: "fruehstueck", minuten: 10, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 174 }, { z: "vollkornbrot", g: 90 }, { z: "tomate", g: 100 }, { z: "olivenoel", g: 5 }],
    schritte: ["Eier verquirlen, salzen und pfeffern.", "In wenig Öl bei mittlerer Hitze langsam stocken lassen.", "Mit Brot und geschnittener Tomate anrichten."],
  },
  {
    id: "overnight-oats-vegan", foto: true, name: "Overnight Oats mit Chia", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "haferflocken", g: 60 }, { z: "sojajoghurt", g: 200 }, { z: "haferdrink", g: 100 }, { z: "chiasamen", g: 15 }, { z: "beeren", g: 100 }],
    schritte: ["Haferflocken, Chiasamen, Sojajoghurt und Haferdrink verrühren.", "Abgedeckt über Nacht in den Kühlschrank stellen.", "Morgens mit Beeren essen."],
  },
  {
    id: "tofu-ruehrei", foto: true, name: "Tofu Rührei mit Spinat", art: "fruehstueck", minuten: 12, geraete: ["Herd"],
    zutaten: [{ z: "tofu", g: 200 }, { z: "spinat", g: 60 }, { z: "tomate", g: 100 }, { z: "vollkornbrot", g: 90 }, { z: "olivenoel", g: 5 }],
    schritte: ["Tofu mit einer Gabel grob zerdrücken.", "In Öl anbraten, mit Salz, Pfeffer und etwas Kurkuma würzen.", "Spinat unterheben, bis er zusammenfällt.", "Mit Brot und Tomate servieren."],
  },
  {
    id: "joghurt-apfel", foto: true, name: "Griechischer Joghurt mit Apfel und Mandeln", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "joghurt", g: 250 }, { z: "apfel", g: 150 }, { z: "mandeln", g: 15 }],
    schritte: ["Apfel in Würfel schneiden.", "Mit dem Joghurt mischen.", "Mandeln grob hacken und darüber geben."],
  },
  {
    id: "protein-pancakes", foto: true, name: "Protein Pancakes mit Banane", art: "fruehstueck", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "haferflocken", g: 60 }, { z: "ei", g: 116 }, { z: "magerquark", g: 125 }, { z: "banane", g: 120 }, { z: "olivenoel", g: 5 }],
    schritte: ["Haferflocken, Eier, Quark und die halbe Banane zu einem Teig pürieren oder zerdrücken.", "In einer leicht geölten Pfanne kleine Pancakes von beiden Seiten backen.", "Mit der restlichen Banane servieren."],
  },

  // Hauptmahlzeiten
  {
    id: "haehnchen-reis-brokkoli", foto: true, name: "Hähnchen mit Reis und Brokkoli", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "haehnchen", g: 180 }, { z: "reis", g: 80 }, { z: "brokkoli", g: 200 }, { z: "olivenoel", g: 10 }, { z: "sojasauce", g: 15 }],
    schritte: ["Reis nach Packung kochen.", "Hähnchen in Streifen schneiden und in Öl rundum anbraten.", "Brokkoli in Röschen dazugeben und fünf Minuten mitgaren.", "Mit Sojasauce ablöschen und mit dem Reis servieren."],
  },
  {
    id: "lachs-kartoffeln", foto: true, name: "Ofenlachs mit Kartoffeln und Spinat", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen", "Airfryer"],
    zutaten: [{ z: "lachs", g: 150 }, { z: "kartoffeln", g: 300 }, { z: "spinat", g: 150 }, { z: "olivenoel", g: 5 }],
    schritte: ["Kartoffeln halbieren, mit Öl und Salz bei 200 Grad 15 Minuten backen.", "Lachs dazulegen und weitere 12 bis 15 Minuten garen.", "Spinat in einer Pfanne zusammenfallen lassen und dazu servieren."],
  },
  {
    id: "chili", foto: true, name: "Chili con Carne mit Reis", art: "hauptmahlzeit", minuten: 35, geraete: ["Herd"],
    zutaten: [{ z: "rinderhack", g: 150 }, { z: "kidneybohnen", g: 120 }, { z: "passata", g: 200 }, { z: "paprika", g: 100 }, { z: "zwiebel", g: 60 }, { z: "reis", g: 70 }, { z: "olivenoel", g: 5 }],
    schritte: ["Zwiebel und Paprika würfeln und in Öl anschwitzen.", "Hack dazugeben und krümelig braten.", "Passierte Tomaten und Bohnen dazu, mit Kreuzkümmel, Paprika und Chili würzen und 20 Minuten köcheln.", "Reis nach Packung kochen und dazu servieren."],
  },
  {
    id: "puten-wrap", foto: true, name: "Puten Wraps mit Joghurtsauce", art: "hauptmahlzeit", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "pute", g: 150 }, { z: "wrap", g: 130 }, { z: "salat", g: 50 }, { z: "tomate", g: 100 }, { z: "joghurt", g: 50 }, { z: "olivenoel", g: 5 }],
    schritte: ["Pute in Streifen schneiden und in Öl durchbraten.", "Joghurt mit Salz, Pfeffer und etwas Knoblauch verrühren.", "Wraps mit Salat, Tomate, Pute und Sauce füllen und einrollen."],
  },
  {
    id: "thunfisch-nudelsalat", foto: true, name: "Nudelsalat mit Thunfisch", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "nudeln", g: 90 }, { z: "thunfisch", g: 120 }, { z: "gurke", g: 150 }, { z: "tomate", g: 100 }, { z: "joghurt", g: 60 }],
    schritte: ["Nudeln kochen und kalt abschrecken.", "Gurke und Tomaten würfeln, Thunfisch abtropfen lassen.", "Alles mit Joghurt, Salz, Pfeffer und etwas Zitrone mischen."],
  },
  {
    id: "couscous-mediterran", foto: true, name: "Mediterraner Couscous mit Kichererbsen und Feta", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "couscous", g: 80 }, { z: "kichererbsen", g: 150 }, { z: "zucchini", g: 150 }, { z: "paprika", g: 100 }, { z: "feta", g: 50 }, { z: "olivenoel", g: 10 }],
    schritte: ["Couscous mit der gleichen Menge kochendem Wasser übergießen und fünf Minuten quellen lassen.", "Zucchini und Paprika würfeln und in Öl anbraten.", "Kichererbsen dazugeben und mitwärmen.", "Mit dem Couscous mischen und den Feta darüber bröseln."],
  },
  {
    id: "linsen-curry", foto: true, name: "Linsen Curry mit Spinat", art: "hauptmahlzeit", minuten: 30, geraete: ["Herd"],
    zutaten: [{ z: "linsen", g: 250 }, { z: "passata", g: 150 }, { z: "spinat", g: 100 }, { z: "zwiebel", g: 60 }, { z: "reis", g: 70 }, { z: "olivenoel", g: 10 }],
    schritte: ["Zwiebel würfeln und in Öl mit Currypulver anschwitzen.", "Linsen und passierte Tomaten dazugeben und zehn Minuten köcheln.", "Spinat unterrühren, bis er zusammenfällt.", "Mit gekochtem Reis servieren."],
  },
  {
    id: "tofu-pfanne", foto: true, name: "Tofu Gemüsepfanne mit Reis", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "tofu", g: 200 }, { z: "gemuese", g: 300 }, { z: "reis", g: 80 }, { z: "sojasauce", g: 20 }, { z: "olivenoel", g: 10 }],
    schritte: ["Reis nach Packung kochen.", "Tofu würfeln und in Öl knusprig braten.", "Gemüse dazugeben und sechs Minuten mitbraten.", "Mit Sojasauce ablöschen und mit Reis servieren."],
  },
  {
    id: "garnelen-nudeln", foto: true, name: "Vollkornnudeln mit Garnelen und Zucchini", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "garnelen", g: 180 }, { z: "nudeln", g: 90 }, { z: "zucchini", g: 200 }, { z: "tomate", g: 150 }, { z: "olivenoel", g: 10 }],
    schritte: ["Nudeln kochen.", "Zucchini in Scheiben in Öl anbraten, Tomaten halbieren und dazugeben.", "Garnelen zwei bis drei Minuten mitbraten, bis sie rosa sind.", "Mit den Nudeln mischen, salzen und pfeffern."],
  },
  {
    id: "suesskartoffel-bowl", foto: true, name: "Süßkartoffel Bowl mit Hähnchen und Avocado", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen", "Airfryer"],
    zutaten: [{ z: "haehnchen", g: 150 }, { z: "suesskartoffel", g: 250 }, { z: "brokkoli", g: 150 }, { z: "avocado", g: 50 }, { z: "olivenoel", g: 5 }],
    schritte: ["Süßkartoffel würfeln, mit Öl und Salz bei 200 Grad 20 Minuten rösten.", "Hähnchen würzen und in den letzten 15 Minuten mitgaren.", "Brokkoli dämpfen oder mitrösten.", "In einer Schale mit Avocado anrichten."],
  },
  {
    id: "gemuese-omelett", foto: true, name: "Gemüse Omelett mit Feta", art: "hauptmahlzeit", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 232 }, { z: "paprika", g: 100 }, { z: "spinat", g: 80 }, { z: "feta", g: 40 }, { z: "vollkornbrot", g: 45 }],
    schritte: ["Paprika würfeln und kurz anbraten, Spinat dazu.", "Verquirlte Eier darüber gießen und bei kleiner Hitze stocken lassen.", "Feta darüber bröseln, zuklappen und mit Brot servieren."],
  },
  {
    id: "hack-kartoffel-pfanne", foto: true, name: "Hackfleisch Kartoffel Pfanne", art: "hauptmahlzeit", minuten: 30, geraete: ["Herd"],
    zutaten: [{ z: "rinderhack", g: 150 }, { z: "kartoffeln", g: 300 }, { z: "paprika", g: 150 }, { z: "zwiebel", g: 60 }, { z: "olivenoel", g: 10 }],
    schritte: ["Kartoffeln würfeln und in Öl zehn Minuten braten.", "Zwiebel und Paprika dazugeben.", "Hack mitbraten, bis es durch ist, kräftig würzen."],
  },
  {
    id: "lachs-reis-bowl", foto: true, name: "Lachs Reis Bowl mit Gurke und Avocado", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "lachs", g: 130 }, { z: "reis", g: 80 }, { z: "gurke", g: 100 }, { z: "avocado", g: 50 }, { z: "sojasauce", g: 15 }],
    schritte: ["Reis kochen.", "Lachs in der Pfanne von beiden Seiten braten.", "Gurke und Avocado in Scheiben schneiden.", "Alles auf dem Reis anrichten und mit Sojasauce beträufeln."],
  },
  {
    id: "kichererbsen-pfanne", foto: true, name: "Kichererbsen Spinat Pfanne", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "kichererbsen", g: 250 }, { z: "spinat", g: 150 }, { z: "passata", g: 150 }, { z: "zwiebel", g: 50 }, { z: "vollkornbrot", g: 90 }, { z: "olivenoel", g: 10 }],
    schritte: ["Zwiebel in Öl anschwitzen, mit Kreuzkümmel und Paprika würzen.", "Kichererbsen und passierte Tomaten dazu und fünf Minuten köcheln.", "Spinat unterheben und mit Brot servieren."],
  },
  {
    id: "airfryer-haehnchen", foto: true, name: "Knuspriges Hähnchen mit Kartoffeln und Gurkensalat", art: "hauptmahlzeit", minuten: 30, geraete: ["Airfryer", "Backofen"],
    zutaten: [{ z: "haehnchen", g: 180 }, { z: "kartoffeln", g: 300 }, { z: "gurke", g: 150 }, { z: "joghurt", g: 80 }, { z: "olivenoel", g: 10 }],
    schritte: ["Kartoffeln in Spalten schneiden, mit der Hälfte des Öls und Salz bei 200 Grad 15 Minuten garen.", "Hähnchen würzen, mit dem restlichen Öl einreiben und 15 Minuten mitgaren.", "Gurke hobeln und mit Joghurt, Salz und Dill mischen."],
  },
  {
    id: "tomaten-pasta-haehnchen", foto: true, name: "Tomaten Pasta mit Hähnchen und Parmesan", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "nudeln", g: 100 }, { z: "haehnchen", g: 150 }, { z: "passata", g: 200 }, { z: "zwiebel", g: 50 }, { z: "parmesan", g: 15 }, { z: "olivenoel", g: 5 }],
    schritte: ["Nudeln kochen.", "Hähnchen würfeln und mit der Zwiebel in Öl anbraten.", "Passierte Tomaten dazu, würzen und zehn Minuten köcheln.", "Mit den Nudeln mischen und Parmesan darüber reiben."],
  },

  // Snacks
  {
    id: "quark-beeren", foto: true, name: "Magerquark mit Beeren", art: "snack", minuten: 3, geraete: [],
    zutaten: [{ z: "magerquark", g: 250 }, { z: "beeren", g: 100 }],
    schritte: ["Quark glatt rühren.", "Beeren darauf geben."],
  },
  {
    id: "huettenkaese-reiswaffeln", foto: true, name: "Hüttenkäse auf Reiswaffeln mit Gurke", art: "snack", minuten: 3, geraete: [],
    zutaten: [{ z: "huettenkaese", g: 200 }, { z: "reiswaffeln", g: 32 }, { z: "gurke", g: 100 }],
    schritte: ["Hüttenkäse auf die Reiswaffeln streichen.", "Gurke in Scheiben darauf legen, mit Pfeffer würzen."],
  },
  {
    id: "whey-shake", foto: true, name: "Whey Shake mit Banane", art: "snack", minuten: 2, geraete: [],
    zutaten: [{ z: "whey", g: 30 }, { z: "milch", g: 300 }, { z: "banane", g: 120 }],
    schritte: ["Whey mit Milch im Shaker mischen.", "Banane dazu essen oder mit in den Mixer geben."],
  },
  {
    id: "apfel-erdnuss", foto: true, name: "Apfel mit Erdnussbutter", art: "snack", minuten: 2, geraete: [],
    zutaten: [{ z: "apfel", g: 180 }, { z: "erdnussbutter", g: 20 }],
    schritte: ["Apfel in Spalten schneiden.", "Mit Erdnussbutter zum Dippen essen."],
  },
  {
    id: "hummus-gemuese", foto: true, name: "Hummus mit Gemüsesticks und Brot", art: "snack", minuten: 5, geraete: [],
    zutaten: [{ z: "hummus", g: 100 }, { z: "paprika", g: 150 }, { z: "gurke", g: 150 }, { z: "vollkornbrot", g: 45 }],
    schritte: ["Paprika und Gurke in Sticks schneiden.", "Mit Hummus und Brot essen."],
  },
  {
    id: "sojajoghurt-beeren", foto: true, name: "Sojajoghurt mit Beeren und Chia", art: "snack", minuten: 3, geraete: [],
    zutaten: [{ z: "sojajoghurt", g: 250 }, { z: "beeren", g: 100 }, { z: "chiasamen", g: 10 }],
    schritte: ["Sojajoghurt in eine Schale geben.", "Beeren und Chiasamen darüber streuen."],
  },
  {
    id: "eier-brot", foto: true, name: "Gekochte Eier mit Brot und Gurke", art: "snack", minuten: 10, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 116 }, { z: "vollkornbrot", g: 45 }, { z: "gurke", g: 100 }],
    schritte: ["Eier acht bis neun Minuten kochen und abschrecken.", "Mit Brot und Gurke essen."],
  },
  // Aus den Guides von Personal Coach Aaron: Top 10 Lieblingsrezepte, 5 Meal
  // Prep Rezepte, High Protein Low Calorie, Käse und Gemüse, Muskelaufbau. Die
  // Mengen der Meal Prep Rezepte sind auf eine Portion geteilt. Die Kalorien
  // aus den Guides werden nicht übernommen: sie stehen dort als "ca." und
  // kommen hier wie überall aus der Zutatentabelle.
  {
    id: "aarons-overnight-oats", foto: true, name: "Aarons High Protein Overnight Oats", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "haferflocken", g: 80 }, { z: "milch", g: 200 }, { z: "whey", g: 30 }, { z: "beeren", g: 50 }, { z: "erdnussbutter", g: 10 }],
    schritte: ["Whey in der Milch auflösen und über die Haferflocken geben, gut verrühren.", "Beeren darauf geben und über Nacht in den Kühlschrank stellen.", "Morgens mit Zimt oder einem Löffel Erdnussbutter essen."],
  },
  {
    id: "skyr-overnight-oats", foto: true, name: "Overnight Oats mit Skyr und Beeren", art: "fruehstueck", minuten: 8, geraete: [],
    zutaten: [{ z: "haferflocken", g: 80 }, { z: "skyr", g: 150 }, { z: "milch", g: 100 }, { z: "beeren", g: 50 }, { z: "honig", g: 8 }],
    schritte: ["Haferflocken, Skyr, Milch, Honig und Zimt verrühren.", "In ein verschliessbares Glas füllen, Beeren obenauf.", "Mindestens vier Stunden kalt stellen. Hält drei bis vier Tage, gut zum Vorbereiten am Sonntag."],
  },
  {
    id: "spiegelei-paprika-kiwi", foto: true, name: "Spiegeleier mit Paprika und Kiwi", art: "fruehstueck", minuten: 10, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 232 }, { z: "paprika", g: 150 }, { z: "olivenoel", g: 5 }, { z: "kiwi", g: 75 }],
    schritte: ["Paprika in Streifen schneiden und in der Pfanne anbraten.", "Eier daneben aufschlagen, salzen und pfeffern.", "Deckel auflegen, Hitze runter, drei bis vier Minuten stocken lassen.", "Mit der Kiwi servieren."],
  },
  {
    id: "whey-quark-bowl", foto: true, name: "Quark Bowl mit Whey, Beeren und Mandeln", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "magerquark", g: 250 }, { z: "whey", g: 30 }, { z: "beeren", g: 50 }, { z: "mandeln", g: 10 }],
    schritte: ["Quark mit dem Whey glatt rühren, bei Bedarf mit einem Schluck Wasser.", "Beeren und Mandeln darauf geben.", "Mit Zimt abrunden."],
  },
  {
    id: "huettenkaese-gurke", foto: true, name: "Hüttenkäse Bowl mit Gurke und Radieschen", art: "fruehstueck", minuten: 5, geraete: [],
    zutaten: [{ z: "huettenkaese", g: 200 }, { z: "gurke", g: 150 }, { z: "tomate", g: 100 }, { z: "radieschen", g: 50 }, { z: "olivenoel", g: 5 }],
    schritte: ["Gurke würfeln, Tomaten halbieren, Radieschen in Scheiben schneiden.", "Hüttenkäse in eine Schale, Gemüse darauf.", "Mit Öl, Salz, Pfeffer und Kräutern abschmecken."],
  },
  {
    id: "shakshuka", foto: true, name: "Shakshuka", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 290 }, { z: "tomate", g: 300 }, { z: "paprika", g: 80 }, { z: "zwiebel", g: 50 }, { z: "olivenoel", g: 5 }],
    schritte: ["Tomaten in Stücke schneiden und in Öl köcheln lassen.", "Paprika, Zwiebel und Knoblauch klein geschnitten dazugeben.", "Mulden in die Sauce drücken und die Eier hineinschlagen.", "Deckel auf, Hitze runter, drei bis vier Minuten ziehen lassen."],
  },
  {
    id: "haehnchen-mozzarella-airfryer", foto: true, name: "Hähnchen mit Mozzarella und Tomate aus dem Airfryer", art: "hauptmahlzeit", minuten: 25, geraete: ["Airfryer", "Backofen"],
    zutaten: [{ z: "haehnchen", g: 200 }, { z: "mozzarella", g: 50 }, { z: "tomate", g: 100 }, { z: "salat", g: 80 }],
    schritte: ["Hähnchenbrust der Länge nach einschneiden, salzen und pfeffern.", "Tomatenscheiben und Mozzarella in die Tasche legen.", "Im Airfryer bei 190 Grad etwa 18 Minuten garen, bis das Fleisch innen durch ist.", "Mit dem Salat servieren."],
  },
  {
    id: "pute-mediterran-reis", foto: true, name: "Putenbrust mit mediterranem Gemüse und Reis", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "pute", g: 200 }, { z: "gemuese", g: 150 }, { z: "reis", g: 80 }, { z: "olivenoel", g: 5 }],
    schritte: ["Reis nach Packung kochen.", "Pute würzen und in Öl anbraten.", "Das Gemüse dazugeben und mitbraten, bis es weich ist.", "Alles zusammen anrichten."],
  },
  {
    id: "mexican-beef-bowl", foto: true, name: "Mexican Beef Bowl", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "reis", g: 80 }, { z: "rinderhack", g: 200 }, { z: "kidneybohnen", g: 100 }, { z: "mais", g: 50 }, { z: "tomate", g: 100 }, { z: "paprika", g: 100 }, { z: "zwiebel", g: 50 }],
    schritte: ["Reis kochen.", "Hack mit der Zwiebel krümelig anbraten, mit Kreuzkümmel, Paprika und Chili würzen.", "Paprika, Tomate, Bohnen und Mais dazugeben und warm werden lassen.", "In eine Schale geben, Sauce nach Wahl darüber."],
  },
  {
    id: "mexikanische-haehnchen-bowl", foto: true, name: "Mexikanische Protein Bowl mit Hähnchen", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "haehnchen", g: 200 }, { z: "reis", g: 70 }, { z: "kidneybohnen", g: 100 }, { z: "mais", g: 50 }, { z: "tomate", g: 100 }, { z: "paprika", g: 100 }, { z: "olivenoel", g: 5 }],
    schritte: ["Reis kochen.", "Hähnchen in Würfeln mit Öl anbraten, mit Paprika, Kreuzkümmel und Chili würzen.", "Bohnen und Mais kurz mit in die Pfanne geben.", "Alles in eine Schale, mit Paprika, Tomaten und etwas Limette toppen."],
  },
  {
    id: "lachs-zitronen-pasta", foto: true, name: "Lachs Zitronen Pasta mit Dinkelnudeln", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "lachs", g: 150 }, { z: "dinkelnudeln", g: 100 }, { z: "kochsahne", g: 80 }, { z: "spinat", g: 50 }],
    schritte: ["Nudeln kochen.", "Lachs in Würfeln von allen Seiten anbraten.", "Kochsahne mit dem Saft einer halben Zitrone erhitzen, Spinat darin zusammenfallen lassen.", "Nudeln und Lachs unterheben, mit Knoblauch, Oregano und Basilikum würzen."],
  },
  {
    id: "high-protein-pizza", foto: true, name: "High Protein Pizza", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen"],
    zutaten: [{ z: "dinkelmehl", g: 100 }, { z: "ei", g: 116 }, { z: "passata", g: 100 }, { z: "tomate", g: 100 }, { z: "mozzarella", g: 60 }, { z: "olivenoel", g: 5 }],
    schritte: ["Mehl, Eier, einen Schuss Wasser und Salz zu einem Teig kneten.", "Dünn auf dem Blech ausrollen.", "Mit Passata, Tomatenstücken, Knoblauch und Öl belegen, Mozzarella darauf.", "Bei 220 Grad 14 bis 20 Minuten backen."],
  },
  {
    id: "zucchini-mozzarella-ei", foto: true, name: "Zucchini Pfanne mit Ei und Mozzarella", art: "hauptmahlzeit", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "ei", g: 116 }, { z: "mozzarella", g: 125 }, { z: "zucchini", g: 150 }, { z: "tomate", g: 100 }, { z: "olivenoel", g: 5 }],
    schritte: ["Zucchini in Scheiben schneiden und in Öl drei bis vier Minuten anbraten.", "Eier verquirlen, darüber giessen und stocken lassen.", "Tomaten halbiert und Mozzarella in Stücken darauf, Deckel auf, bis der Käse schmilzt.", "Mit Basilikum, Salz und Pfeffer servieren."],
  },
  {
    id: "caprese-haehnchen", foto: true, name: "Caprese Salat mit Hähnchen", art: "hauptmahlzeit", minuten: 10, geraete: [],
    zutaten: [{ z: "haehnchen", g: 150 }, { z: "mozzarella", g: 125 }, { z: "tomate", g: 150 }, { z: "salat", g: 60 }, { z: "olivenoel", g: 5 }],
    schritte: ["Gegartes Hähnchen in Streifen schneiden, Reste vom Vortag passen.", "Tomaten und Mozzarella in Scheiben abwechselnd auf den Salat legen.", "Hähnchen darüber, mit Balsamico, Öl, Salz und Pfeffer anmachen."],
  },
  {
    id: "huettenkaese-gemuesepfanne", foto: true, name: "Warme Gemüsepfanne mit Hüttenkäse", art: "hauptmahlzeit", minuten: 15, geraete: ["Herd"],
    zutaten: [{ z: "huettenkaese", g: 200 }, { z: "paprika", g: 150 }, { z: "zucchini", g: 150 }, { z: "spinat", g: 80 }, { z: "parmesan", g: 30 }],
    schritte: ["Paprika, Zucchini und Knoblauch klein schneiden und fünf Minuten anbraten.", "Spinat dazugeben und zwei Minuten zusammenfallen lassen.", "Hüttenkäse einrühren und kurz warm werden lassen, er wird dabei cremig.", "Mit Parmesan bestreuen und abschmecken."],
  },
  {
    id: "auberginen-pizza", foto: true, name: "Auberginen Pizza mit Schinken und Mozzarella", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen"],
    zutaten: [{ z: "aubergine", g: 300 }, { z: "passata", g: 150 }, { z: "kochschinken", g: 50 }, { z: "mozzarella", g: 125 }],
    schritte: ["Aubergine in zentimeterdicke Scheiben schneiden, salzen, fünf Minuten ziehen lassen und abtupfen.", "Bei 200 Grad zehn Minuten vorbacken.", "Passata mit Knoblauch darauf streichen, Schinken und Mozzarella darüber.", "Weitere acht bis zehn Minuten backen, bis der Käse Farbe hat."],
  },
  {
    id: "suesskartoffel-pommes-dip", foto: true, name: "Süßkartoffel Pommes mit Quark Dip", art: "hauptmahlzeit", minuten: 35, geraete: ["Backofen", "Airfryer"],
    zutaten: [{ z: "suesskartoffel", g: 300 }, { z: "olivenoel", g: 5 }, { z: "magerquark", g: 150 }],
    schritte: ["Süßkartoffeln schälen und in Stifte schneiden.", "Mit Öl, Paprika und Salz mischen und bei 220 Grad 25 bis 30 Minuten backen, nach der Hälfte wenden.", "Quark mit Knoblauch, Salz, Pfeffer und Schnittlauch verrühren und dazu servieren."],
  },
  {
    id: "rinderhack-paprika", foto: true, name: "Rinderhack Paprika Pfanne", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "rinderhack", g: 200 }, { z: "paprika", g: 300 }, { z: "tomate", g: 400 }, { z: "olivenoel", g: 5 }],
    schritte: ["Hack in Öl krümelig anbraten, bis es Farbe hat.", "Paprika in Streifen und Knoblauch dazu, fünf Minuten mitbraten.", "Gehackte Tomaten aus der Dose dazu, mit Kreuzkümmel und Paprika würzen und zehn Minuten köcheln."],
  },
  {
    id: "kabeljau-ofenkartoffeln", foto: true, name: "Kabeljau mit Ofenkartoffeln und Tomaten", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen"],
    zutaten: [{ z: "kabeljau", g: 200 }, { z: "kartoffeln", g: 200 }, { z: "tomate", g: 150 }, { z: "olivenoel", g: 5 }],
    schritte: ["Kartoffeln würfeln und mit Öl und Rosmarin bei 200 Grad 15 Minuten vorbacken.", "Fisch mit Zitronensaft, Salz und Pfeffer würzen.", "Tomaten aufs Blech, Fisch darauf legen und 12 bis 15 Minuten fertig backen."],
  },
  {
    id: "hack-zucchini-auflauf", foto: true, name: "Hack Zucchini Auflauf", art: "hauptmahlzeit", minuten: 35, geraete: ["Backofen"],
    zutaten: [{ z: "rinderhack", g: 200 }, { z: "zucchini", g: 300 }, { z: "passata", g: 150 }, { z: "gouda", g: 50 }],
    schritte: ["Hack mit Knoblauch krümelig anbraten, mit Passata und Oregano fünf Minuten köcheln.", "Zucchinischeiben und Hack abwechselnd in eine Form schichten.", "Mit Käse bestreuen und bei 180 Grad etwa 20 Minuten backen."],
  },
  {
    id: "kartoffeln-quark-lachs", foto: true, name: "Pellkartoffeln mit Quark und Räucherlachs", art: "hauptmahlzeit", minuten: 25, geraete: ["Herd"],
    zutaten: [{ z: "kartoffeln", g: 200 }, { z: "magerquark", g: 150 }, { z: "raeucherlachs", g: 80 }, { z: "gurke", g: 50 }],
    schritte: ["Kartoffeln in Salzwasser etwa 20 Minuten garen.", "Quark mit Dill, fein gewürfelter Gurke, Salz, Pfeffer und Zitrone verrühren.", "Kartoffeln aufschneiden, Quark darauf, Lachs dazu legen."],
  },
  {
    id: "linsen-bolognese", foto: true, name: "Linsen Bolognese mit Vollkornnudeln", art: "hauptmahlzeit", minuten: 30, geraete: ["Herd"],
    zutaten: [{ z: "roteLinsen", g: 60 }, { z: "nudeln", g: 80 }, { z: "passata", g: 175 }, { z: "karotte", g: 60 }, { z: "zwiebel", g: 40 }, { z: "olivenoel", g: 5 }],
    schritte: ["Zwiebel, Karotte und Knoblauch fein würfeln und in Öl andünsten.", "Etwas Tomatenmark mitrösten, Linsen, Passata und einen Schluck Wasser dazu.", "Würzen und 18 bis 20 Minuten köcheln, bis die Linsen weich sind.", "Nudeln getrennt kochen. Die Sauce lässt sich gut einfrieren."],
  },
  {
    id: "putengeschnetzeltes-suesskartoffel", foto: true, name: "Putengeschnetzeltes mit Ofensüßkartoffeln", art: "hauptmahlzeit", minuten: 30, geraete: ["Backofen"],
    zutaten: [{ z: "pute", g: 150 }, { z: "suesskartoffel", g: 200 }, { z: "champignons", g: 50 }, { z: "zwiebel", g: 30 }, { z: "olivenoel", g: 7 }],
    schritte: ["Süßkartoffeln würfeln, mit Öl, Salz und Paprika bei 200 Grad 20 bis 25 Minuten backen.", "Pute in Streifen scharf anbraten und herausnehmen.", "Zwiebel und Champignons andünsten, mit Gemüsebrühe ablöschen.", "Pute zurück in die Pfanne, kurz ziehen lassen und mit den Süßkartoffeln anrichten."],
  },
  {
    id: "thunfisch-quinoa-feta", foto: true, name: "Thunfisch Quinoa Salat mit Feta", art: "hauptmahlzeit", minuten: 20, geraete: ["Herd"],
    zutaten: [{ z: "quinoa", g: 60 }, { z: "thunfisch", g: 120 }, { z: "feta", g: 35 }, { z: "gurke", g: 100 }, { z: "tomate", g: 60 }, { z: "olivenoel", g: 7 }],
    schritte: ["Quinoa nach Packung kochen und abkühlen lassen.", "Gurke, Tomaten und etwas rote Zwiebel klein schneiden.", "Thunfisch abtropfen und mit Quinoa und Gemüse mischen.", "Feta darüber bröckeln, mit Öl, Zitrone, Salz und Pfeffer anmachen. Kalt essbar, gut fürs Büro."],
  },
];
