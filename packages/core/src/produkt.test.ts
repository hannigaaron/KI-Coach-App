import { test } from "node:test";
import assert from "node:assert/strict";
import { produktAusOff, pruefeProdukt, naehrwerteFuer, portionsVorschlag, portionInGramm, produktText, offBild, produktBereinigen, trefferWerten, type Produkt } from "./produkt.js";

/**
 * Der echte Datensatz von Open Food Facts, abgerufen am 07.09.2026.
 * Gekuerzt auf die Felder, die wir lesen. Barcode 4255719307476.
 */
const GRIESSPUDDING = {
  code: "4255719307476",
  product_name: "Protein Grießpudding Chocolate Base",
  brands: "More Nutrition",
  quantity: "60g",
  serving_size: "60 g",
  nutriments: {
    "energy-kcal_100g": 346,
    "energy-kcal_serving": 208,
    proteins_100g: 57,
    proteins_serving: 34.2,
    fat_100g: 1.8,
    carbohydrates_100g: 23,
    fiber_100g: 4.1,
  },
};

test("liest den echten Datensatz vollstaendig", () => {
  const p = produktAusOff(GRIESSPUDDING);
  assert.ok(p);
  assert.equal(p.barcode, "4255719307476");
  assert.equal(p.marke, "More Nutrition");
  assert.deepEqual(p.per100, { kcal: 346, proteinG: 57, fatG: 1.8, carbsG: 23 });
  assert.equal(p.portionG, 60);
  assert.equal(p.ballaststoffeG, 4.1);
});

test("nimmt nur die Werte je 100 Gramm, nie die je Portion", () => {
  // proteins_serving steht bei 34.2. Wer das liest, rechnet jede Menge falsch.
  const p = produktAusOff(GRIESSPUDDING);
  assert.equal(p?.per100.proteinG, 57);
});

test("der deutsche Name gewinnt, wenn er da ist", () => {
  const p = produktAusOff({ ...GRIESSPUDDING, product_name_de: "Protein Grießpudding Schoko" });
  assert.equal(p?.name, "Protein Grießpudding Schoko");
});

test("ein Etikett mit Ballaststoffen gilt als stimmig", () => {
  // 57*4 + 1.8*9 + 23*4 = 336, plus 4.1 Gramm Ballaststoffe mal 2 sind 344.
  // Deklariert sind 346. Der Hersteller hat recht, nicht die einfache Formel.
  const p = produktAusOff(GRIESSPUDDING)!;
  const pr = pruefeProdukt(p);
  assert.equal(pr.gerechnetKcal, 344);
  assert.equal(pr.ok, true);
  assert.deepEqual(pr.einwaende, []);
});

test("ein kaputter Datensatz faellt auf", () => {
  const p = produktAusOff({
    code: "1234567890123",
    product_name: "Unsinn",
    nutriments: { "energy-kcal_100g": 800, proteins_100g: 60, fat_100g: 60, carbohydrates_100g: 60 },
  })!;
  const pr = pruefeProdukt(p);
  assert.equal(pr.ok, false);
  assert.ok(pr.einwaende.some((e) => e.includes("100 Gramm je 100 Gramm")));
});

test("Energie und Makros, die nicht zusammenpassen, werden gemeldet", () => {
  const p = produktAusOff({
    code: "1234567890123",
    product_name: "Falsch erfasst",
    nutriments: { "energy-kcal_100g": 90, proteins_100g: 10, fat_100g: 20, carbohydrates_100g: 10 },
  })!;
  const pr = pruefeProdukt(p);
  assert.equal(pr.ok, false);
  assert.ok(pr.einwaende.some((e) => e.includes("passen nicht zusammen")));
});

test("ohne Energie wird sie aus den Makros gerechnet", () => {
  const p = produktAusOff({
    code: "1234567890123",
    product_name: "Ohne kcal",
    nutriments: { proteins_100g: 10, fat_100g: 5, carbohydrates_100g: 20 },
  });
  assert.equal(p?.per100.kcal, 165);
});

test("ein Datensatz ganz ohne Naehrwerte wird verworfen", () => {
  assert.equal(produktAusOff({ code: "1234567890123", product_name: "Nur ein Name", nutriments: {} }), null);
});

test("ohne Barcode oder Namen gibt es kein Produkt", () => {
  assert.equal(produktAusOff({ product_name: "Kein Code", nutriments: { proteins_100g: 5 } }), null);
  assert.equal(produktAusOff({ code: "123", nutriments: { proteins_100g: 5 } }), null);
  assert.equal(produktAusOff(null), null);
});

test("rechnet auf eine Menge um", () => {
  const p = produktAusOff(GRIESSPUDDING)!;
  assert.deepEqual(naehrwerteFuer(p, 60), { kcal: 208, proteinG: 34.2, fatG: 1.1, carbsG: 13.8 });
  assert.deepEqual(naehrwerteFuer(p, 0), { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 });
});

test("die Portion des Herstellers schlaegt die Packung", () => {
  const p = produktAusOff(GRIESSPUDDING)!;
  assert.deepEqual(portionsVorschlag(p), { gramm: 60, grund: "Portion laut Hersteller" });
});

test("ohne Portionsangabe gilt eine kleine Packung als Portion", () => {
  const p = produktAusOff({ ...GRIESSPUDDING, serving_size: "" })!;
  assert.deepEqual(portionsVorschlag(p), { gramm: 60, grund: "ganze Packung" });
});

test("ein Kilo Haferflocken ist keine Portion", () => {
  const p = produktAusOff({ ...GRIESSPUDDING, serving_size: "", quantity: "1 kg" })!;
  assert.equal(portionsVorschlag(p), null);
});

test("liest Mengenangaben in allen ueblichen Schreibweisen", () => {
  assert.equal(portionInGramm("60g"), 60);
  assert.equal(portionInGramm("1 Beutel (60 g)"), 60);
  assert.equal(portionInGramm("500 ml"), 500);
  assert.equal(portionInGramm("0,33 l"), 330);
  assert.equal(portionInGramm("1 kg"), 1000);
  assert.equal(portionInGramm("33 cl"), 330);
  assert.equal(portionInGramm("1pcs"), null);
  assert.equal(portionInGramm(""), null);
});

test("der Text nennt Herkunft und Barcode", () => {
  const p = produktAusOff(GRIESSPUDDING)!;
  const t = produktText(p, 60);
  assert.ok(t.includes("More Nutrition"));
  assert.ok(t.includes("346 kcal"));
  assert.ok(t.includes("Auf 60 g: 208 kcal"));
  assert.ok(t.includes("4255719307476"));
  assert.ok(t.includes("Open Food Facts"));
});

test("ein Bild kommt nur von Open Food Facts selbst", () => {
  const gut = "https://images.openfoodfacts.org/images/products/400/123/456/7890/front_de.4.200.jpg";
  assert.equal(offBild(gut), gut);
  assert.equal(offBild("https://example.com/bild.jpg"), undefined);
  assert.equal(offBild("http://images.openfoodfacts.org/images/a.jpg"), undefined);
  assert.equal(offBild("javascript:alert(1)"), undefined);
  assert.equal(offBild(""), undefined);
  const p = produktAusOff({ code: "4001234567890", product_name: "Skyr", nutriments: { "energy-kcal_100g": 63 }, image_front_small_url: gut });
  assert.equal(p?.bild, gut);
});

const prod = (marke: string, name: string, barcode: string, per100 = { kcal: 373, proteinG: 7.7, fatG: 0.7, carbsG: 83 }): Produkt => ({
  barcode, name, marke, menge: "", per100, quelle: "openfoodfacts",
});

test("ein fremder Milchreis passt nicht zu ESN Instant Rice Pudding", () => {
  const liste = [
    prod("Milsani", "Milchreis Rhabarber", "1", { kcal: 114, proteinG: 2.9, fatG: 2, carbsG: 21 }),
    prod("Asda", "Rice Pudding", "2", { kcal: 81, proteinG: 2.3, fatG: 1, carbsG: 16 }),
    prod("Vayu ESN", "Instant Rice Pudding", "3"),
    prod("ESN", "Designer Rice Pudding", "4"),
    prod("ESN", "Designer Whey Protein", "5", { kcal: 375, proteinG: 73, fatG: 5.2, carbsG: 9.2 }),
  ];
  const w = trefferWerten("ESN Instant Rice Pudding", liste);
  assert.deepEqual(w.map((x) => x.produkt.barcode), ["3", "4"]);
  assert.ok(w.every((x) => x.markeStimmt));
});

test("eine zweite Marke im Suchtext nimmt dem Namen nicht die Wörter", () => {
  const liste = [
    prod("Alpro", "Skyr Alternative Vanille", "1", { kcal: 77, proteinG: 5.1, fatG: 3, carbsG: 6.8 }),
    prod("Alpro", "Kokosnussdrink Barista", "2", { kcal: 33, proteinG: 1.5, fatG: 1.4, carbsG: 3.3 }),
    prod("Skyr", "Natur", "3", { kcal: 62, proteinG: 11, fatG: 0.2, carbsG: 4 }),
  ];
  assert.deepEqual(trefferWerten("Alpro Skyr", liste).map((x) => x.produkt.barcode), ["1"]);
});

test("Kalorien, die nicht zu den Makros passen, werden aus den Makros gerechnet", () => {
  const whey = prod("ESN", "Designer Whey", "1", { kcal: 523, proteinG: 73, fatG: 5.2, carbsG: 9.2 });
  const b = produktBereinigen(whey);
  assert.equal(b?.per100.kcal, 376);
  assert.equal(b?.kcalGerechnet, true);
  assert.match(produktText(b!, 45), /aus den Makros gerechnet/);
  assert.equal(produktBereinigen(prod("X", "Kaputt", "2", { kcal: 300, proteinG: 80, fatG: 20, carbsG: 30 })), null);
  const sauber = prod("ESN", "Rice Pudding", "3");
  assert.equal(produktBereinigen(sauber), sauber);
});
