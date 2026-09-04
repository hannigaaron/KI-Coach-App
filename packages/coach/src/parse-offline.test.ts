import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMealOffline } from "./parse-offline.js";

test("erkennt Grammangaben", () => {
  const { entries } = parseMealOffline("200g Hähnchenbrust und 150g Reis");
  assert.equal(entries.length, 2);
  const chicken = entries[0]!;
  assert.equal(chicken.name, "Hähnchenbrust");
  assert.equal(chicken.kcal, 240);
  assert.equal(chicken.proteinG, 46);
});

test("rechnet Stückangaben über das Stückgewicht", () => {
  const { entries } = parseMealOffline("3 Eier");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.quantity, "174 g");
  assert.equal(entries[0]!.kcal, 249);
});

test("versteht Umlaute und Kommazahlen", () => {
  const { entries } = parseMealOffline("1,5 EL Olivenöl");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.kcal, 199);
});

test("meldet unbekannte Angaben zurück statt zu raten", () => {
  const { entries, unresolved } = parseMealOffline("200g Hähnchenbrust und ein Stück Omas Kuchen");
  assert.equal(entries.length, 1);
  assert.equal(unresolved.length, 1);
});

test("leerer Text ergibt keine Einträge", () => {
  const result = parseMealOffline("");
  assert.equal(result.entries.length, 0);
  assert.equal(result.unresolved.length, 0);
});
