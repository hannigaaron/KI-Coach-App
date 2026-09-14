import { test } from "node:test";
import assert from "node:assert/strict";
import { DOPPELT_FENSTER_MIN, doppeltText, ohneDoppelte, schluessel } from "./doppelt.js";
import type { FoodEntry } from "./types.js";

function e(name: string, quantity: string, kcal = 100): FoodEntry {
  return { name, quantity, kcal, proteinG: 10, fatG: 3, carbsG: 8 };
}

/**
 * Der Fall aus dem Betrieb, an dem das Modul hängt.
 *
 * Um 15:58 standen Mousse und Whey im Tag, um 15:59 kam eine Mahlzeit, die
 * beide nochmal enthielt. Am Ende zeigte die App 5172 statt rund 1700
 * Kalorien.
 */
test("was schon im Tag steht, wird nicht nochmal gezählt", () => {
  const bestehend = [
    { eintrag: e("Ehrmann High Protein Chocolate Mousse", "200 g", 148), at: "15:58" },
    { eintrag: e("ESN Designer Whey Protein Cinnamon Cereal", "30 g", 157), at: "15:58" },
  ];
  const neu = [
    e("Ehrmann High Protein Chocolate Mousse", "200 g", 148),
    e("ESN Designer Whey Protein Cinnamon Cereal", "30 g", 157),
    e("Haferflocken", "150 g", 561),
  ];
  const { behalten, verworfen } = ohneDoppelte(bestehend, neu, "15:59");
  assert.deepEqual(behalten.map((x) => x.name), ["Haferflocken"]);
  assert.equal(verworfen.length, 2);
});

test("doppelte innerhalb einer einzigen Liste fallen auch raus", () => {
  // Das Modell hat in einem Aufruf schon denselben Posten zweimal geschickt.
  const neu = [e("Haferflocken", "150 g"), e("Haferflocken", "150 g"), e("Reis", "150 g")];
  const { behalten, verworfen } = ohneDoppelte([], neu, "12:00");
  assert.equal(behalten.length, 2);
  assert.equal(verworfen.length, 1);
});

test("nach dem Fenster gilt derselbe Posten wieder als neu", () => {
  // Magerquark morgens und abends ist bei diesem Nutzer der Regelfall. Ein
  // Filter, der das verschluckt, wäre schlimmer als das Problem.
  const bestehend = [{ eintrag: e("Magerquark", "250 g"), at: "08:00" }];
  const { behalten, verworfen } = ohneDoppelte(bestehend, [e("Magerquark", "250 g")], "20:00");
  assert.equal(behalten.length, 1);
  assert.equal(verworfen.length, 0);
});

test("knapp innerhalb des Fensters wird verworfen, knapp ausserhalb nicht", () => {
  const bestehend = [{ eintrag: e("Reis", "150 g"), at: "12:00" }];
  const drin = ohneDoppelte(bestehend, [e("Reis", "150 g")], `14:${String(0).padStart(2, "0")}`);
  assert.equal(drin.verworfen.length, 1, "genau am Fensterrand zählt als doppelt");

  const draussen = ohneDoppelte(bestehend, [e("Reis", "150 g")], "14:01");
  assert.equal(draussen.behalten.length, 1);
  assert.equal(DOPPELT_FENSTER_MIN, 120);
});

test("eine andere Menge ist ein anderer Posten", () => {
  const bestehend = [{ eintrag: e("Haferflocken", "150 g"), at: "12:00" }];
  const { behalten } = ohneDoppelte(bestehend, [e("Haferflocken", "80 g")], "12:30");
  assert.equal(behalten.length, 1);
});

test("Schreibweise und Umlaute machen keinen Unterschied", () => {
  assert.equal(schluessel(e("Paniertes Hähnchen", "100 g")), schluessel(e("paniertes haehnchen", "100g")));
  assert.equal(schluessel(e("Haferflocken", "150 g")), schluessel(e("  HAFERFLOCKEN ", "150   g")));
});

test("das Verworfene steht in der Antwort, statt still zu verschwinden", () => {
  const text = doppeltText([e("Haferflocken", "150 g")]);
  assert.match(text, /Haferflocken/);
  assert.match(text, /nicht doppelt/);
  // Wer wirklich zweimal gegessen hat, muss das sagen können.
  assert.match(text, /zweimal/);
});

test("ohne Verworfenes bleibt die Antwort leer", () => {
  assert.equal(doppeltText([]), "");
});
