import { test } from "node:test";
import assert from "node:assert/strict";
import { produktAusOff, pruefeProdukt, naehrwerteFuer, portionsVorschlag, portionInGramm, produktText } from "./produkt.js";

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
