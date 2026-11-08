import { strict as assert } from "node:assert";
import { test } from "node:test";
import { essenszeitAus } from "./essenszeit.js";
import { artZurUhrzeit } from "./herkunft.js";

test("Heute Morgen ist Frühstück, nicht die Uhrzeit des Eintragens", () => {
  assert.deepEqual(essenszeitAus("Heute Morgen hatte ich 3 Eier und Toast"), { tageZurueck: 0, uhrzeit: "08:00", grund: "morgens" });
  assert.equal(essenszeitAus("zum Frühstück 200 g Skyr")?.uhrzeit, "08:00");
});

test("Gestern Abend und vorgestern Mittag", () => {
  assert.deepEqual(essenszeitAus("gestern Abend Pizza gegessen"), { tageZurueck: 1, uhrzeit: "19:00", grund: "abends" });
  assert.deepEqual(essenszeitAus("vorgestern mittags 300 g Reis"), { tageZurueck: 2, uhrzeit: "12:30", grund: "mittags" });
});

test("Eine genannte Uhrzeit gilt genau, abends wird sie zur Abendzeit", () => {
  assert.equal(essenszeitAus("um 13:30 Uhr Hähnchen mit Reis")?.uhrzeit, "13:30");
  assert.equal(essenszeitAus("um 8 abends noch einen Shake")?.uhrzeit, "20:00");
  assert.equal(essenszeitAus("um halb 8 Haferflocken")?.uhrzeit, "07:30");
  assert.equal(essenszeitAus("gestern 7 Uhr Müsli")?.uhrzeit, "07:00");
});

test("Ohne Zeitangabe gilt jetzt, und Mengen sind keine Uhrzeit", () => {
  assert.equal(essenszeitAus("200 g Magerquark"), null);
  assert.equal(essenszeitAus("um 200 g Quark ergänzt"), null);
  assert.equal(essenszeitAus("Nachtisch war ein Eis"), null);
});

test("Nur gestern ohne Zeit trägt den Tag, aber keine Uhrzeit", () => {
  assert.deepEqual(essenszeitAus("gestern noch 2 Bananen"), { tageZurueck: 1, uhrzeit: null, grund: null });
});

test("Die festen Zeiten fallen in das Fenster ihrer Mahlzeit", () => {
  assert.equal(artZurUhrzeit(essenszeitAus("morgens")!.uhrzeit!), "fruehstueck");
  assert.equal(artZurUhrzeit(essenszeitAus("mittags")!.uhrzeit!), "mittagessen");
  assert.equal(artZurUhrzeit(essenszeitAus("nachmittags")!.uhrzeit!), "snack");
  assert.equal(artZurUhrzeit(essenszeitAus("zum Abendessen")!.uhrzeit!), "abendessen");
});
