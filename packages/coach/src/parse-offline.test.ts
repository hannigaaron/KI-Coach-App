import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMealOffline } from "./parse-offline.js";

test("erkennt Grammangaben", () => {
  const { entries } = parseMealOffline("200g Haehnchenbrust und 150g Reis");
  assert.equal(entries.length, 2);
  const chicken = entries[0]!;
  assert.equal(chicken.name, "Haehnchenbrust");
  assert.equal(chicken.kcal, 240);
  assert.equal(chicken.proteinG, 46);
});

test("rechnet Stueckangaben ueber das Stueckgewicht", () => {
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

test("meldet unbekannte Angaben zurueck statt zu raten", () => {
  const { entries, unresolved } = parseMealOffline("200g Haehnchenbrust und ein Stueck Omas Kuchen");
  assert.equal(entries.length, 1);
  assert.equal(unresolved.length, 1);
});

test("leerer Text ergibt keine Eintraege", () => {
  const result = parseMealOffline("");
  assert.equal(result.entries.length, 0);
  assert.equal(result.unresolved.length, 0);
});
