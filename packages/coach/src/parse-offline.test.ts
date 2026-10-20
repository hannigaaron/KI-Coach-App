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

// Der Satz aus dem Betrieb, diktiert und wörtlich übernommen. Vorher kamen
// davon 30 g Pulver doppelt und 1 g Erdnussbutter an, der Rest fiel still weg.
const DIKTAT = "Ich habe 80 Gramm Instant Rice Pudding, 30 Gramm ESN Flexpresso und 1 gehäuften Teelöffel Erdnussbutter "
  + "und einen Shake mit 600 Milliliter Hafermilch und 30 Gramm Proteinpulver auf Whey-Protein-Basis gegessen";

test("Diktat: Löffel, Milliliter und ein Shake ohne doppeltes Pulver", () => {
  const { entries, unresolved } = parseMealOffline(DIKTAT);
  const namen = entries.map((e) => `${e.quantity} ${e.name}`);
  assert.deepEqual(namen, ["10 g Erdnussbutter", "600 ml Hafermilch", "30 g Proteinpulver"]);
  assert.equal(unresolved.length, 2);
  assert.match(unresolved.join(" | "), /Rice Pudding/);
  assert.match(unresolved.join(" | "), /Flexpresso/);
});

test("ein Shake allein bleibt ein Messlöffel Pulver", () => {
  const { entries } = parseMealOffline("nach dem Training einen Shake");
  assert.equal(entries.length, 1);
  assert.equal(entries[0]!.quantity, "30 g");
});

test("Esslöffel gestrichen und gehäuft", () => {
  assert.equal(parseMealOffline("2 Esslöffel Olivenöl").entries[0]!.quantity, "30 g");
  assert.equal(parseMealOffline("ein gehäufter EL Erdnussbutter").entries[0]!.quantity, "30 g");
  assert.equal(parseMealOffline("0,5 Liter Milch").entries[0]!.quantity, "500 ml");
});
