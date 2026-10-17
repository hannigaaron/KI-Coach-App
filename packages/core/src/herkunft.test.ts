import { test } from "node:test";
import assert from "node:assert/strict";
import { artZurUhrzeit, makroHerkunft } from "./herkunft.js";

const tag = [
  { id: "a", at: "19:10", entries: [
    { name: "Hähnchenbrust", kcal: 330, proteinG: 62, fatG: 7, carbsG: 0 },
    { name: "Reis", kcal: 260, proteinG: 5, fatG: 1, carbsG: 57 },
  ] },
  { id: "b", at: "07:45", entries: [
    { name: "Magerquark", kcal: 165, proteinG: 30, fatG: 1, carbsG: 9 },
    { name: "Haferflocken", kcal: 186, proteinG: 7, fatG: 3, carbsG: 30 },
  ] },
  { id: "c", at: "16:00", entries: [
    { name: "Magerquark", kcal: 165, proteinG: 30, fatG: 1, carbsG: 9 },
  ] },
];

test("Mahlzeiten stehen in der Reihenfolge des Tages, mit Art aus der Uhrzeit", () => {
  const h = makroHerkunft(tag, "proteinG");
  assert.deepEqual(h.mahlzeiten.map((m) => [m.at, m.art]), [["07:45", "fruehstueck"], ["16:00", "snack"], ["19:10", "abendessen"]]);
  assert.equal(h.mahlzeiten[0]!.proteinG, 37);
  assert.equal(h.mahlzeiten[0]!.kcal, 351);
});

test("die Summe der Zeilen trifft den Tageswert", () => {
  for (const makro of ["kcal", "proteinG", "fatG", "carbsG"] as const) {
    const h = makroHerkunft(tag, makro);
    const summe = h.mahlzeiten.reduce((s, m) => s + m[makro], 0);
    assert.equal(summe, h.gesamt);
    const anteile = h.mahlzeiten.reduce((s, m) => s + m.anteil, 0);
    assert.ok(Math.abs(anteile - 1) < 1e-9);
  }
});

test("gleiches Lebensmittel wird zusammengefasst und nach Wert sortiert", () => {
  const h = makroHerkunft(tag, "proteinG");
  assert.equal(h.lebensmittel[0]!.name, "Hähnchenbrust");
  assert.deepEqual(h.lebensmittel[1], { name: "Magerquark", mal: 2, wert: 60, anteil: 60 / 134 });
});

test("ohne Beitrag kein Eintrag, und der Rest wird zusammengefasst", () => {
  const h = makroHerkunft(tag, "carbsG", 2);
  assert.ok(!h.lebensmittel.some((l) => l.name === "Hähnchenbrust"));
  assert.equal(h.lebensmittel.length, 2);
  assert.deepEqual(h.rest, { anzahl: 1, wert: 18, anteil: 18 / 105 });
});

test("leerer Tag teilt nicht durch null", () => {
  const h = makroHerkunft([], "kcal");
  assert.equal(h.gesamt, 0);
  assert.deepEqual(h.mahlzeiten, []);
  assert.equal(h.rest, null);
});

test("Uhrzeit zu Mahlzeit", () => {
  assert.equal(artZurUhrzeit("10:59"), "fruehstueck");
  assert.equal(artZurUhrzeit("11:00"), "mittagessen");
  assert.equal(artZurUhrzeit("15:30"), "snack");
  assert.equal(artZurUhrzeit("17:00"), "abendessen");
  assert.equal(artZurUhrzeit(""), null);
});
