import { test } from "node:test";
import assert from "node:assert/strict";
import { eintragAus100g, je100gAus, mengeLesen, mengeSchreiben, mengeSetzen, skalierbar } from "./portion.js";
import type { FoodEntry } from "./types.js";

function e(name: string, quantity: string, kcal: number, p: number, f: number, k: number): FoodEntry {
  return { name, quantity, kcal, proteinG: p, fatG: f, carbsG: k };
}

test("die Menge wird mit Einheit gelesen, auch ohne Leerzeichen", () => {
  assert.deepEqual(mengeLesen("150 g"), { zahl: 150, einheit: "g" });
  assert.deepEqual(mengeLesen("150g"), { zahl: 150, einheit: "g" });
  assert.deepEqual(mengeLesen("0,33 l"), { zahl: 0.33, einheit: "l" });
  // Ohne Einheit lässt sich trotzdem verdoppeln, das Verhältnis zählt.
  assert.deepEqual(mengeLesen("2 Eier"), { zahl: 2, einheit: "eier" });
});

test("ohne Zahl gibt es nichts zu skalieren", () => {
  assert.equal(mengeLesen("eine Handvoll"), null);
  assert.equal(mengeLesen(""), null);
  assert.equal(skalierbar(e("Nüsse", "eine Handvoll", 200, 5, 18, 4)), false);
  assert.equal(skalierbar(e("Reis", "150 g", 200, 4, 1, 45)), true);
});

test("die Nährwerte folgen der Menge im Verhältnis", () => {
  // 300 g Reis haben genau das Anderthalbfache von 200 g.
  const alt = e("Reis gekocht", "200 g", 260, 5.4, 0.6, 56);
  const neu = mengeSetzen(alt, 300);
  assert.equal(neu.quantity, "300 g");
  assert.equal(neu.kcal, 390);
  assert.equal(neu.proteinG, 8.1);
  assert.equal(neu.fatG, 0.9);
  assert.equal(neu.carbsG, 84);
});

test("kleiner geht genauso", () => {
  const neu = mengeSetzen(e("Hähnchen", "180 g", 300, 56, 7, 0), 150);
  assert.equal(neu.quantity, "150 g");
  assert.equal(neu.kcal, 250);
  assert.equal(neu.proteinG, 46.7);
});

test("die Einheit bleibt erhalten, die Nachkommastelle verschwindet", () => {
  assert.equal(mengeSetzen(e("Milch", "0,5 l", 250, 17, 8, 24), 1).quantity, "1 l");
  assert.equal(mengeSchreiben(150, "g"), "150 g");
  assert.equal(mengeSchreiben(150.0, "g"), "150 g");
  assert.equal(mengeSchreiben(2, ""), "2");
});

test("eine unsinnige Menge ändert nichts", () => {
  const alt = e("Reis", "150 g", 200, 4, 1, 45);
  assert.deepEqual(mengeSetzen(alt, 0), alt);
  assert.deepEqual(mengeSetzen(alt, -50), alt);
  assert.deepEqual(mengeSetzen(alt, Number.NaN), alt);
  // Ohne lesbare Menge bleibt der Posten ebenfalls stehen.
  const ohne = e("Nüsse", "eine Handvoll", 200, 5, 18, 4);
  assert.deepEqual(mengeSetzen(ohne, 100), ohne);
});

test("aus Werten je 100 Gramm wird ein Posten", () => {
  const eintrag = eintragAus100g("Magerquark", 250, { kcal: 67, proteinG: 12, fatG: 0.3, carbsG: 4.1 });
  assert.equal(eintrag.quantity, "250 g");
  assert.equal(eintrag.kcal, 168);
  assert.equal(eintrag.proteinG, 30);
  assert.equal(eintrag.carbsG, 10.3);
});

test("ein Posten ohne Namen bekommt einen, statt leer zu bleiben", () => {
  assert.equal(eintragAus100g("  ", 100, { kcal: 10, proteinG: 1, fatG: 0, carbsG: 1 }).name, "Unbenannt");
});

test("aus einem Posten kommen die Werte je 100 Gramm zurück", () => {
  const werte = je100gAus(e("Magerquark", "250 g", 168, 30, 0.8, 10.3));
  assert.deepEqual(werte, { kcal: 67, proteinG: 12, fatG: 0.3, carbsG: 4.1 });
});

test("ohne Gewichtsangabe gibt es keine Basis je 100 Gramm", () => {
  // "2 Eier" hat keine 100 Gramm Basis, und eine geratene wäre schlimmer als
  // keine: die App würde danach mit einer erfundenen Zahl weiterrechnen.
  assert.equal(je100gAus(e("Eier", "2 Stück", 160, 14, 11, 1)), null);
});

test("hin und zurück ergibt wieder dasselbe", () => {
  const alt = e("Reis gekocht", "200 g", 260, 5.4, 0.6, 56);
  const zurueck = mengeSetzen(mengeSetzen(alt, 350), 200);
  assert.equal(zurueck.quantity, alt.quantity);
  assert.equal(zurueck.kcal, alt.kcal);
});
