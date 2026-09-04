/**
 * Kleine Lebensmitteltabelle für den Offline Modus.
 *
 * WICHTIG: Das ist keine Nährwertdatenbank. Die Werte sind gerundete
 * Richtwerte aus gängigen Nährwerttabellen und dienen nur als Fallback,
 * wenn kein Sprachmodell erreichbar ist, sowie als Plausibilitätsprüfung
 * für Modellantworten.
 *
 * Für die Produktion gehört hier eine echte Datenquelle hin. Kandidaten:
 * Open Food Facts (offene Lizenz, Barcode Suche) oder der
 * Bundeslebensmittelschlüssel des Max Rubner-Instituts.
 * Siehe docs/ARCHITEKTUR.md, Abschnitt Nährwertdaten.
 */
export interface FoodRef {
  key: string;
  /** Name für die Anzeige. Der Schlüssel ist technisch und gehört nie in die Oberfläche. */
  label: string;
  /** Synonyme für die Texterkennung, klein geschrieben. */
  aliases: string[];
  /** Nährwerte je 100 g beziehungsweise 100 ml. */
  per100: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  /** Typisches Stückgewicht in Gramm, falls zählbar. */
  pieceG?: number;
  /** Zustand der Angabe, damit roh und gekocht nicht vermischt werden. */
  state?: "roh" | "gekocht" | "zubereitet";
}

export const FOODS: FoodRef[] = [
  { key: "haehnchenbrust", label: "Hähnchenbrust", aliases: ["hähnchenbrust", "hähnchenbrust", "hähnchen", "hühnerbrust", "chicken"], per100: { kcal: 120, proteinG: 23, fatG: 2.6, carbsG: 0 }, state: "roh" },
  { key: "putenbrust", label: "Putenbrust", aliases: ["putenbrust", "pute", "truthahn"], per100: { kcal: 110, proteinG: 24, fatG: 1, carbsG: 0 }, state: "roh" },
  { key: "rinderhack", label: "Rinderhack", aliases: ["rinderhack", "hackfleisch", "hack"], per100: { kcal: 137, proteinG: 21.5, fatG: 5, carbsG: 0 }, state: "roh" },
  { key: "lachs", label: "Lachs", aliases: ["lachs", "salmon"], per100: { kcal: 208, proteinG: 20, fatG: 13, carbsG: 0 }, state: "roh" },
  { key: "thunfisch", label: "Thunfisch", aliases: ["thunfisch", "tuna"], per100: { kcal: 116, proteinG: 26, fatG: 1, carbsG: 0 }, state: "zubereitet" },
  { key: "ei", label: "Ei", aliases: ["ei", "eier", "spiegelei", "rührei", "rührei"], per100: { kcal: 143, proteinG: 12.6, fatG: 9.5, carbsG: 0.7 }, pieceG: 58 },
  { key: "magerquark", label: "Magerquark", aliases: ["magerquark", "quark"], per100: { kcal: 67, proteinG: 12, fatG: 0.3, carbsG: 4.1 } },
  { key: "skyr", label: "Skyr", aliases: ["skyr"], per100: { kcal: 63, proteinG: 11, fatG: 0.2, carbsG: 4 } },
  { key: "huettenkaese", label: "Hüttenkäse", aliases: ["hüttenkäse", "hüttenkäse", "körnigerfrischkäse"], per100: { kcal: 98, proteinG: 11, fatG: 4.3, carbsG: 3.4 } },
  { key: "griechischer_joghurt", label: "Griechischer Joghurt", aliases: ["griechischer joghurt", "joghurt", "jogurt"], per100: { kcal: 73, proteinG: 9, fatG: 2, carbsG: 4 } },
  { key: "milch", label: "Milch", aliases: ["milch", "vollmilch"], per100: { kcal: 47, proteinG: 3.4, fatG: 1.5, carbsG: 4.9 } },
  { key: "gouda", label: "Gouda", aliases: ["gouda", "käse", "käse"], per100: { kcal: 356, proteinG: 25, fatG: 28, carbsG: 0 } },
  { key: "haferflocken", label: "Haferflocken", aliases: ["haferflocken", "oats", "porridge"], per100: { kcal: 372, proteinG: 13.5, fatG: 7, carbsG: 58.7 }, state: "roh" },
  { key: "reis_gekocht", label: "Reis", aliases: ["reis", "reis gekocht", "basmati"], per100: { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28 }, state: "gekocht" },
  { key: "nudeln_gekocht", label: "Nudeln", aliases: ["nudeln", "pasta", "spaghetti", "penne"], per100: { kcal: 158, proteinG: 5.8, fatG: 0.9, carbsG: 30.9 }, state: "gekocht" },
  { key: "kartoffeln", label: "Kartoffeln", aliases: ["kartoffeln", "kartoffel", "salzkartoffeln"], per100: { kcal: 77, proteinG: 2, fatG: 0.1, carbsG: 17 }, state: "gekocht" },
  { key: "suesskartoffel", label: "Süsskartoffel", aliases: ["süsskartoffel", "süßkartoffel", "sweet potato"], per100: { kcal: 86, proteinG: 1.6, fatG: 0.1, carbsG: 20 }, state: "gekocht" },
  { key: "vollkornbrot", label: "Vollkornbrot", aliases: ["vollkornbrot", "brot", "scheibe brot"], per100: { kcal: 210, proteinG: 7, fatG: 1.2, carbsG: 40 }, pieceG: 45 },
  { key: "banane", label: "Banane", aliases: ["banane", "bananen"], per100: { kcal: 89, proteinG: 1.1, fatG: 0.3, carbsG: 23 }, pieceG: 120 },
  { key: "apfel", label: "Apfel", aliases: ["apfel", "äpfel", "äpfel"], per100: { kcal: 52, proteinG: 0.3, fatG: 0.2, carbsG: 14 }, pieceG: 180 },
  { key: "beeren", label: "Beeren", aliases: ["beeren", "himbeeren", "blaubeeren", "erdbeeren"], per100: { kcal: 45, proteinG: 1, fatG: 0.4, carbsG: 8 } },
  { key: "brokkoli", label: "Brokkoli", aliases: ["brokkoli", "broccoli"], per100: { kcal: 34, proteinG: 2.8, fatG: 0.4, carbsG: 7 } },
  { key: "tomate", label: "Tomate", aliases: ["tomate", "tomaten"], per100: { kcal: 18, proteinG: 0.9, fatG: 0.2, carbsG: 3.9 }, pieceG: 100 },
  { key: "gurke", label: "Gurke", aliases: ["gurke", "salatgurke"], per100: { kcal: 15, proteinG: 0.7, fatG: 0.1, carbsG: 3.6 } },
  { key: "paprika", label: "Paprika", aliases: ["paprika"], per100: { kcal: 31, proteinG: 1, fatG: 0.3, carbsG: 6 }, pieceG: 150 },
  { key: "zwiebel", label: "Zwiebel", aliases: ["zwiebel", "zwiebeln"], per100: { kcal: 40, proteinG: 1.1, fatG: 0.1, carbsG: 9.3 }, pieceG: 80 },
  { key: "olivenoel", label: "Olivenöl", aliases: ["olivenöl", "olivenöl", "öl", "öl"], per100: { kcal: 884, proteinG: 0, fatG: 100, carbsG: 0 } },
  { key: "butter", label: "Butter", aliases: ["butter"], per100: { kcal: 717, proteinG: 0.9, fatG: 81, carbsG: 0.1 } },
  { key: "mandeln", label: "Mandeln", aliases: ["mandeln", "nüsse", "nüsse"], per100: { kcal: 579, proteinG: 21, fatG: 50, carbsG: 22 } },
  { key: "erdnussbutter", label: "Erdnussbutter", aliases: ["erdnussbutter", "peanutbutter", "erdnussmus"], per100: { kcal: 588, proteinG: 25, fatG: 50, carbsG: 20 } },
  { key: "avocado", label: "Avocado", aliases: ["avocado"], per100: { kcal: 160, proteinG: 2, fatG: 15, carbsG: 9 }, pieceG: 150 },
  { key: "linsen", label: "Linsen", aliases: ["linsen"], per100: { kcal: 116, proteinG: 9, fatG: 0.4, carbsG: 20 }, state: "gekocht" },
  { key: "kichererbsen", label: "Kichererbsen", aliases: ["kichererbsen"], per100: { kcal: 119, proteinG: 7.5, fatG: 2.6, carbsG: 16 }, state: "gekocht" },
  { key: "tofu", label: "Tofu", aliases: ["tofu"], per100: { kcal: 76, proteinG: 8, fatG: 4.8, carbsG: 1.9 } },
  { key: "whey", label: "Proteinpulver", aliases: ["whey", "proteinpulver", "eiweisspulver", "shake"], per100: { kcal: 380, proteinG: 78, fatG: 5, carbsG: 8 }, pieceG: 30 },
  { key: "pizza", label: "Pizza", aliases: ["pizza"], per100: { kcal: 266, proteinG: 11, fatG: 10, carbsG: 33 }, state: "zubereitet" },
  { key: "doener", label: "Döner", aliases: ["doener", "döner", "kebab"], per100: { kcal: 215, proteinG: 14, fatG: 10, carbsG: 17 }, state: "zubereitet" },
  { key: "pommes", label: "Pommes", aliases: ["pommes", "fritten"], per100: { kcal: 312, proteinG: 3.4, fatG: 15, carbsG: 41 }, state: "zubereitet" },
];

const INDEX = new Map<string, FoodRef>();
for (const food of FOODS) {
  for (const alias of food.aliases) INDEX.set(normalize(alias), food);
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Findet das Lebensmittel mit der längsten passenden Bezeichnung im Text.
 * Der Abgleich läuft über ganze Wörter. Sonst würde das Alias "ei"
 * in Wörtern wie "ein" oder "Eis" treffen.
 */
export function findFood(text: string): FoodRef | null {
  const words = normalize(text).split(" ").filter(Boolean);
  if (words.length === 0) return null;
  let best: FoodRef | null = null;
  let bestLength = 0;
  for (const [alias, food] of INDEX) {
    const aliasWords = alias.split(" ");
    if (containsSequence(words, aliasWords) && alias.length > bestLength) {
      best = food;
      bestLength = alias.length;
    }
  }
  return best;
}

function containsSequence(words: string[], sequence: string[]): boolean {
  if (sequence.length === 0) return false;
  for (let i = 0; i + sequence.length <= words.length; i++) {
    let match = true;
    for (let j = 0; j < sequence.length; j++) {
      if (words[i + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}
