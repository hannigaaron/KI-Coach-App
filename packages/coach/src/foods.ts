/**
 * Kleine Lebensmitteltabelle für den Offline Modus.
 *
 * WICHTIG: Das ist keine Nährwertdatenbank. Die Werte sind gerundete
 * Richtwerte und dienen nur als Fallback,
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
  /** Ein Getränk. Die Menge steht dann in Milliliter, auch bei "eine Tasse". */
  fluessig?: boolean;
  /** Zustand der Angabe, damit roh und gekocht nicht vermischt werden. */
  state?: "roh" | "gekocht" | "zubereitet";
}

export const FOODS: FoodRef[] = [
  { key: "haehnchenbrust", label: "Hähnchenbrust", aliases: ["hähnchenbrust", "hähnchen", "hühnerbrust", "chicken", "hähnchengeschnetzeltes", "hähnchenstreifen", "hähnchenbrustfilet"], per100: { kcal: 120, proteinG: 23, fatG: 2.6, carbsG: 0 }, state: "roh" },
  { key: "putenbrust", label: "Putenbrust", aliases: ["putenbrust", "pute", "truthahn", "putengeschnetzeltes", "putengeschnetzeltem", "putenstreifen", "putenfleisch", "putenbrustfilet"], per100: { kcal: 110, proteinG: 24, fatG: 1, carbsG: 0 }, state: "roh" },
  { key: "rinderhack", label: "Rinderhack", aliases: ["rinderhack", "hackfleisch", "hack"], per100: { kcal: 137, proteinG: 21.5, fatG: 5, carbsG: 0 }, state: "roh" },
  { key: "lachs", label: "Lachs", aliases: ["lachs", "salmon"], per100: { kcal: 208, proteinG: 20, fatG: 13, carbsG: 0 }, state: "roh" },
  { key: "thunfisch", label: "Thunfisch", aliases: ["thunfisch", "tuna"], per100: { kcal: 116, proteinG: 26, fatG: 1, carbsG: 0 }, state: "zubereitet" },
  { key: "ei", label: "Ei", aliases: ["ei", "eier", "spiegelei", "rührei", "rührei"], per100: { kcal: 143, proteinG: 12.6, fatG: 9.5, carbsG: 0.7 }, pieceG: 58 },
  { key: "magerquark", label: "Magerquark", aliases: ["magerquark", "quark"], per100: { kcal: 67, proteinG: 12, fatG: 0.3, carbsG: 4.1 } },
  { key: "skyr", label: "Skyr", aliases: ["skyr"], per100: { kcal: 63, proteinG: 11, fatG: 0.2, carbsG: 4 } },
  { key: "huettenkaese", label: "Hüttenkäse", aliases: ["hüttenkäse", "hüttenkäse", "körnigerfrischkäse"], per100: { kcal: 98, proteinG: 11, fatG: 4.3, carbsG: 3.4 } },
  { key: "griechischer_joghurt", label: "Griechischer Joghurt", aliases: ["griechischer joghurt", "joghurt", "jogurt"], per100: { kcal: 73, proteinG: 9, fatG: 2, carbsG: 4 } },
  // Haferdrink ohne Zucker, gerundet aus gängigen Etiketten. Eigener Eintrag,
  // weil "Hafermilch" ein Wort ist und sonst auf nichts trifft.
  { key: "honig", label: "Honig", aliases: ["honig"], per100: { kcal: 306, proteinG: 0.4, fatG: 0, carbsG: 75.1 } },
  { key: "kaffee", label: "Kaffee, schwarz", aliases: ["kaffee", "espresso", "americano", "filterkaffee"], per100: { kcal: 2, proteinG: 0.1, fatG: 0, carbsG: 0 }, pieceG: 150, fluessig: true },
  { key: "haferdrink", label: "Hafermilch", aliases: ["hafermilch", "haferdrink", "hafer drink", "oatly"], per100: { kcal: 44, proteinG: 1, fatG: 1.5, carbsG: 6.5 } },
  { key: "milch", label: "Milch", aliases: ["milch", "vollmilch"], per100: { kcal: 47, proteinG: 3.4, fatG: 1.5, carbsG: 4.9 } },
  // BLS 4.0 M402600, Gouda 48 % Fett i. Tr. Eine Scheibe sind 25 g, eine Annahme der App.
  { key: "gouda", label: "Gouda", aliases: ["gouda", "käse", "scheibe käse"], per100: { kcal: 379, proteinG: 22.5, fatG: 31.6, carbsG: 0 }, pieceG: 25 },
  { key: "haferflocken", label: "Haferflocken", aliases: ["haferflocken", "oats", "porridge"], per100: { kcal: 372, proteinG: 13.5, fatG: 7, carbsG: 58.7 }, state: "roh" },
  { key: "reis_gekocht", label: "Reis", aliases: ["reis", "reis gekocht", "basmati"], per100: { kcal: 130, proteinG: 2.7, fatG: 0.3, carbsG: 28 }, state: "gekocht" },
  { key: "nudeln_gekocht", label: "Nudeln", aliases: ["nudeln", "pasta", "spaghetti", "penne"], per100: { kcal: 158, proteinG: 5.8, fatG: 0.9, carbsG: 30.9 }, state: "gekocht" },
  { key: "kartoffeln", label: "Kartoffeln", aliases: ["kartoffeln", "kartoffel", "salzkartoffeln"], per100: { kcal: 77, proteinG: 2, fatG: 0.1, carbsG: 17 }, state: "gekocht" },
  { key: "suesskartoffel", label: "Süßkartoffel", aliases: ["süsskartoffel", "süßkartoffel", "sweet potato"], per100: { kcal: 86, proteinG: 1.6, fatG: 0.1, carbsG: 20 }, state: "gekocht" },
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
  // BLS 4.0 Q611000. 5 g sind die Butter auf einem Brötchen, eine Annahme der App.
  { key: "butter", label: "Butter", aliases: ["butter"], per100: { kcal: 747, proteinG: 1.2, fatG: 82.2, carbsG: 0.6 }, pieceG: 5 },
  { key: "mandeln", label: "Mandeln", aliases: ["mandeln", "nüsse", "nüsse"], per100: { kcal: 579, proteinG: 21, fatG: 50, carbsG: 22 } },
  { key: "erdnussbutter", label: "Erdnussbutter", aliases: ["erdnussbutter", "peanutbutter", "erdnussmus"], per100: { kcal: 588, proteinG: 25, fatG: 50, carbsG: 20 } },
  { key: "avocado", label: "Avocado", aliases: ["avocado"], per100: { kcal: 160, proteinG: 2, fatG: 15, carbsG: 9 }, pieceG: 150 },
  { key: "linsen", label: "Linsen", aliases: ["linsen"], per100: { kcal: 116, proteinG: 9, fatG: 0.4, carbsG: 20 }, state: "gekocht" },
  { key: "kichererbsen", label: "Kichererbsen", aliases: ["kichererbsen"], per100: { kcal: 119, proteinG: 7.5, fatG: 2.6, carbsG: 16 }, state: "gekocht" },
  { key: "tofu", label: "Tofu", aliases: ["tofu"], per100: { kcal: 76, proteinG: 8, fatG: 4.8, carbsG: 1.9 } },
  { key: "whey", label: "Proteinpulver", aliases: ["whey", "whey protein", "proteinpulver", "eiweisspulver", "eiweißpulver", "proteinshake", "shake"], per100: { kcal: 380, proteinG: 78, fatG: 5, carbsG: 8 }, pieceG: 30 },
  // Gerichte, Imbiss, Brot und Belag. Die Nährwerte je 100 g stammen aus dem
  // Bundeslebensmittelschlüssel 4.0 des Max Rubner-Instituts, seit Dezember
  // 2025 kostenfrei unter blsdb.de, der Code steht über jeder Zeile. Ohne sie
  // fiel "ein Döner" im Regelweg durch, und genau diese Mahlzeiten trägt
  // jemand ohne KI am häufigsten ein.
  //
  // Die Portionsgrössen in pieceG sind keine Werte aus dem BLS, sondern eine
  // Annahme der App: ein Döner 350 g, eine Pizza 400 g, eine Portion Pommes
  // 150 g. Die Antwort nennt die Menge, damit sie sich korrigieren lässt,
  // und eine Angabe in Gramm schlägt sie immer. Belegte Brötchen und Brote
  // gibt es im BLS nicht als Gericht, sie sind aus BLS Zutaten gerechnet.
  // BLS 4.0 Y921062
  { key: "doener", label: "Döner", aliases: ["döner", "doener", "döner kebab", "kebab", "dönerkebab"], per100: { kcal: 177, proteinG: 11.2, fatG: 5.3, carbsG: 20.0 }, pieceG: 350, state: "zubereitet" },
  // BLS 4.0 Y921162
  { key: "doener_haehnchen", label: "Döner mit Hähnchen", aliases: ["hähnchendöner", "chicken döner", "geflügeldöner", "hähnchen döner"], per100: { kcal: 199, proteinG: 13.1, fatG: 7.9, carbsG: 18.0 }, pieceG: 350, state: "zubereitet" },
  // BLS 4.0 Y9A1040
  { key: "doener_veg", label: "Vegetarischer Döner", aliases: ["vegetarischer döner", "veggie döner", "gemüsedöner", "gemüse döner"], per100: { kcal: 145, proteinG: 4.3, fatG: 7.8, carbsG: 13.0 }, pieceG: 350, state: "zubereitet" },
  // BLS 4.0 Y9A1080
  { key: "lahmacun", label: "Lahmacun", aliases: ["lahmacun", "türkische pizza"], per100: { kcal: 186, proteinG: 9.1, fatG: 8.5, carbsG: 17.0 }, pieceG: 250, state: "zubereitet" },
  // BLS 4.0 Y9A1060
  { key: "falafel_fladenbrot", label: "Falafel im Fladenbrot", aliases: ["falafel im fladenbrot", "falafel sandwich", "falafelsandwich", "falafel dürüm"], per100: { kcal: 156, proteinG: 5.4, fatG: 7.8, carbsG: 14.0 }, pieceG: 300, state: "zubereitet" },
  // BLS 4.0 Y9A1050
  { key: "falafel", label: "Falafel", aliases: ["falafel", "falafelbällchen"], per100: { kcal: 193, proteinG: 8.9, fatG: 8.0, carbsG: 17.0 }, pieceG: 25, state: "zubereitet" },
  // BLS 4.0 X912033
  { key: "pizza", label: "Pizza Margherita", aliases: ["pizza", "pizza margherita", "margherita"], per100: { kcal: 238, proteinG: 7.8, fatG: 13.6, carbsG: 20.0 }, pieceG: 400, state: "zubereitet" },
  // BLS 4.0 X912233
  { key: "pizza_4formaggi", label: "Pizza Quattro Formaggi", aliases: ["pizza quattro formaggi", "quattro formaggi", "pizza vier käse", "vier käse pizza"], per100: { kcal: 354, proteinG: 14.7, fatG: 20.6, carbsG: 26.0 }, pieceG: 400, state: "zubereitet" },
  // BLS 4.0 X914233
  { key: "pizza_4stagioni", label: "Pizza Quattro Stagioni", aliases: ["pizza quattro stagioni", "quattro stagioni", "pizza vier jahreszeiten"], per100: { kcal: 146, proteinG: 5.7, fatG: 6.1, carbsG: 15.0 }, pieceG: 400, state: "zubereitet" },
  // BLS 4.0 K130492
  { key: "pommes", label: "Pommes", aliases: ["pommes", "pommes frites", "fritten", "portion pommes"], per100: { kcal: 203, proteinG: 2.9, fatG: 9.0, carbsG: 25.9 }, pieceG: 150, state: "zubereitet" },
  // BLS 4.0 Q991000
  { key: "mayonnaise", label: "Mayonnaise", aliases: ["mayo", "mayonnaise"], per100: { kcal: 750, proteinG: 1.5, fatG: 81.2, carbsG: 2.3 }, pieceG: 20 },
  // BLS 4.0 R141100
  { key: "ketchup", label: "Ketchup", aliases: ["ketchup", "tomatenketchup"], per100: { kcal: 98, proteinG: 1.4, fatG: 0.1, carbsG: 21.2 }, pieceG: 20 },
  // BLS 4.0 Y943032
  { key: "currywurst", label: "Currywurst", aliases: ["currywurst"], per100: { kcal: 202, proteinG: 8.8, fatG: 14.7, carbsG: 8.2 }, pieceG: 200, state: "zubereitet" },
  // BLS 4.0 W222682
  { key: "bratwurst", label: "Bratwurst", aliases: ["bratwurst", "rostbratwurst", "thüringer"], per100: { kcal: 216, proteinG: 19.7, fatG: 15.2, carbsG: 0.1 }, pieceG: 100, state: "zubereitet" },
  // BLS 4.0 W211132
  { key: "bockwurst", label: "Bockwurst", aliases: ["bockwurst"], per100: { kcal: 249, proteinG: 12.6, fatG: 22.1, carbsG: 0.0 }, pieceG: 100, state: "zubereitet" },
  // BLS 4.0 W211200
  { key: "wiener", label: "Wiener Würstchen", aliases: ["wiener", "wiener würstchen", "würstchen", "wienerle"], per100: { kcal: 289, proteinG: 12.9, fatG: 26.1, carbsG: 0.0 }, pieceG: 50 },
  // BLS 4.0 Y911060
  { key: "hamburger", label: "Hamburger", aliases: ["hamburger"], per100: { kcal: 190, proteinG: 10.0, fatG: 7.3, carbsG: 19.7 }, pieceG: 110, state: "zubereitet" },
  // BLS 4.0 Y911160
  { key: "cheeseburger", label: "Cheeseburger", aliases: ["cheeseburger"], per100: { kcal: 202, proteinG: 10.6, fatG: 9.1, carbsG: 18.1 }, pieceG: 120, state: "zubereitet" },
  // BLS 4.0 Y911060, Hamburger. 250 g für einen Burger aus dem Restaurant sind eine Annahme der App
  { key: "burger", label: "Burger", aliases: ["burger"], per100: { kcal: 190, proteinG: 10.0, fatG: 7.3, carbsG: 19.7 }, pieceG: 250, state: "zubereitet" },
  // BLS 4.0 Y384112
  { key: "gyros", label: "Gyros", aliases: ["gyros"], per100: { kcal: 230, proteinG: 24.4, fatG: 14.5, carbsG: 0.5 }, pieceG: 200, state: "zubereitet" },
  // BLS 4.0 Y026022
  { key: "leberkaese", label: "Leberkäse", aliases: ["leberkäse", "fleischkäse", "leberkäs"], per100: { kcal: 328, proteinG: 12.5, fatG: 30.8, carbsG: 0.2 }, pieceG: 100, state: "zubereitet" },
  // BLS 4.0 Y396512
  { key: "frikadelle", label: "Frikadelle", aliases: ["frikadelle", "frikadellen", "bulette", "buletten", "fleischpflanzerl"], per100: { kcal: 297, proteinG: 17.2, fatG: 21.4, carbsG: 8.4 }, pieceG: 100, state: "zubereitet" },
  // BLS 4.0 Y332132
  { key: "schnitzel", label: "Schnitzel paniert", aliases: ["schnitzel", "wiener schnitzel", "schnitzel wiener art", "paniertes schnitzel"], per100: { kcal: 220, proteinG: 22.6, fatG: 10.6, carbsG: 7.6 }, pieceG: 180, state: "zubereitet" },
  // BLS 4.0 Y332532
  { key: "jaegerschnitzel", label: "Jägerschnitzel", aliases: ["jägerschnitzel"], per100: { kcal: 118, proteinG: 18.1, fatG: 3.8, carbsG: 2.5 }, pieceG: 300, state: "zubereitet" },
  // BLS 4.0 X730033
  { key: "lasagne", label: "Lasagne", aliases: ["lasagne"], per100: { kcal: 197, proteinG: 9.7, fatG: 13.3, carbsG: 8.9 }, pieceG: 350, state: "zubereitet" },
  // BLS 4.0 X1A2010
  { key: "kartoffelsalat", label: "Kartoffelsalat", aliases: ["kartoffelsalat"], per100: { kcal: 83, proteinG: 1.5, fatG: 3.0, carbsG: 11.4 }, pieceG: 200, state: "zubereitet" },
  // BLS 4.0 Y627112
  { key: "sushi", label: "Sushi mit Lachs", aliases: ["sushi", "maki", "nigiri"], per100: { kcal: 126, proteinG: 7.3, fatG: 3.2, carbsG: 16.4 }, pieceG: 30, state: "zubereitet" },
  // BLS 4.0 Y599112
  { key: "wrap", label: "Wrap mit Hähnchen", aliases: ["wrap", "chicken wrap", "hähnchen wrap"], per100: { kcal: 153, proteinG: 12.2, fatG: 4.2, carbsG: 15.9 }, pieceG: 250, state: "zubereitet" },
  // BLS 4.0 X081743
  { key: "toast_hawaii", label: "Toast Hawaii", aliases: ["toast hawaii"], per100: { kcal: 206, proteinG: 13.5, fatG: 10.4, carbsG: 13.2 }, pieceG: 150, state: "zubereitet" },
  // BLS 4.0 B511000
  { key: "broetchen", label: "Brötchen", aliases: ["brötchen", "semmel", "schrippe", "weizenbrötchen", "weckle", "weck"], per100: { kcal: 280, proteinG: 10.1, fatG: 1.8, carbsG: 54.0 }, pieceG: 55 },
  // BLS 4.0 B271000
  { key: "mischbrot", label: "Mischbrot", aliases: ["mischbrot", "graubrot", "roggenmischbrot", "scheibe mischbrot"], per100: { kcal: 218, proteinG: 7.4, fatG: 1.0, carbsG: 42.0 }, pieceG: 45 },
  // BLS 4.0 B314000
  { key: "toast", label: "Toastbrot", aliases: ["toast", "toastbrot", "scheibe toast", "buttertoast"], per100: { kcal: 261, proteinG: 8.3, fatG: 3.6, carbsG: 46.8 }, pieceG: 25 },
  // BLS 4.0 B723000
  { key: "brezel", label: "Brezel", aliases: ["brezel", "breze", "brezn", "laugenbrezel", "laugenbrötchen", "laugenstange"], per100: { kcal: 282, proteinG: 9.1, fatG: 4.1, carbsG: 50.0 }, pieceG: 85 },
  // BLS 4.0 X061410
  { key: "butterbrezel", label: "Butterbrezel", aliases: ["butterbrezel", "butterbreze", "butterbrezn"], per100: { kcal: 403, proteinG: 7.0, fatG: 24.9, carbsG: 36.0 }, pieceG: 95 },
  // BLS 4.0 D771600
  { key: "croissant", label: "Croissant", aliases: ["croissant", "croissants", "hörnchen"], per100: { kcal: 426, proteinG: 8.0, fatG: 23.6, carbsG: 44.0 }, pieceG: 60 },
  // BLS 4.0 W424000
  { key: "kochschinken", label: "Kochschinken", aliases: ["schinken", "kochschinken"], per100: { kcal: 130, proteinG: 22.5, fatG: 3.7, carbsG: 0.7 }, pieceG: 20 },
  // BLS 4.0 W140000
  { key: "salami", label: "Salami", aliases: ["salami"], per100: { kcal: 374, proteinG: 23.5, fatG: 30.9, carbsG: 0.0 }, pieceG: 10 },
  // BLS 4.0 X0A3000
  { key: "muesli", label: "Knuspermüsli", aliases: ["müsli", "knuspermüsli", "granola", "crunchy müsli"], per100: { kcal: 416, proteinG: 12.3, fatG: 18.0, carbsG: 46.6 }, pieceG: 50 },
  // BLS 4.0 N330000
  { key: "cola", label: "Cola", aliases: ["cola", "coca cola", "coke"], per100: { kcal: 41, proteinG: 0.0, fatG: 0.0, carbsG: 10.3 }, pieceG: 330, fluessig: true },
  // BLS 4.0 N331000
  { key: "cola_zero", label: "Cola Zero", aliases: ["cola zero", "coke zero", "cola light", "pepsi max"], per100: { kcal: 0, proteinG: 0.0, fatG: 0.0, carbsG: 0.0 }, pieceG: 330, fluessig: true },
  // Zusammengesetzt aus BLS 4.0: 55 g B511000, 5 g Q611000, 25 g M402600. Mengen sind eine Annahme der App
  { key: "kaesebroetchen", label: "Käsebrötchen", aliases: ["käsebrötchen", "käsesemmel"], per100: { kcal: 337, proteinG: 13.2, fatG: 15.3, carbsG: 35.0 }, pieceG: 85 },
  // Zusammengesetzt aus BLS 4.0: 55 g B511000, 5 g Q611000, 25 g W424000. Mengen sind eine Annahme der App
  { key: "schinkenbroetchen", label: "Schinkenbrötchen", aliases: ["schinkenbrötchen", "schinkensemmel"], per100: { kcal: 263, proteinG: 13.2, fatG: 7.1, carbsG: 35.2 }, pieceG: 85 },
  // Zusammengesetzt aus BLS 4.0: 55 g B511000, 5 g Q611000, 20 g W140000. Mengen sind eine Annahme der App
  { key: "salamibroetchen", label: "Salamibrötchen", aliases: ["salamibrötchen", "salamisemmel"], per100: { kcal: 333, proteinG: 12.9, fatG: 14.1, carbsG: 37.1 }, pieceG: 80 },
  // Zusammengesetzt aus BLS 4.0: 55 g B511000, 5 g Q611000, 15 g M402600, 15 g W424000. Mengen sind eine Annahme der App
  { key: "belegtes_broetchen", label: "Belegtes Brötchen", aliases: ["belegtes brötchen", "belegte brötchen", "belegte semmel", "brötchen belegt"], per100: { kcal: 297, proteinG: 13.7, fatG: 11.6, carbsG: 33.1 }, pieceG: 90 },
  // Zusammengesetzt aus BLS 4.0: 50 g B271000, 5 g Q611000, 25 g M402600. Mengen sind eine Annahme der App
  { key: "kaesebrot", label: "Käsebrot", aliases: ["käsebrot", "käsebrote"], per100: { kcal: 301, proteinG: 11.7, fatG: 15.6, carbsG: 26.3 }, pieceG: 80 },
  // Zusammengesetzt aus BLS 4.0: 50 g B271000, 5 g Q611000, 15 g W140000. Mengen sind eine Annahme der App
  { key: "wurstbrot", label: "Wurstbrot", aliases: ["wurstbrot", "wurstbrote", "salamibrot", "schinkenbrot"], per100: { kcal: 289, proteinG: 10.4, fatG: 13.2, carbsG: 30.0 }, pieceG: 70 },
  // Zusammengesetzt aus BLS 4.0: 50 g B271000, 10 g Q611000. Mengen sind eine Annahme der App
  { key: "butterbrot", label: "Butterbrot", aliases: ["butterbrot", "butterbrote", "stulle"], per100: { kcal: 306, proteinG: 6.3, fatG: 14.5, carbsG: 35.1 }, pieceG: 60 },
  // Zusammengesetzt aus BLS 4.0: 55 g B511000, 100 g Y026022. Mengen sind eine Annahme der App
  { key: "leberkaesebroetchen", label: "Leberkäsebrötchen", aliases: ["leberkäsebrötchen", "leberkässemmel", "leberkäswecken", "fleischkäsebrötchen"], per100: { kcal: 311, proteinG: 11.7, fatG: 20.5, carbsG: 19.3 }, pieceG: 155 },
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
