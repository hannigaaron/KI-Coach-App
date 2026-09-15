import test from "node:test";
import assert from "node:assert/strict";
import { plausibelPruefen, plausibelText, MAX_KCAL_JE_GRAMM } from "./plausibel.js";
import type { FoodEntry } from "./types.js";

function posten(p: Partial<FoodEntry>): FoodEntry {
  return { name: "Test", quantity: "100 g", kcal: 100, proteinG: 5, fatG: 2, carbsG: 10, ...p };
}

test("ein normaler Tag hat keine Befunde", () => {
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Magerquark", quantity: "250 g", kcal: 168, proteinG: 30, fatG: 0.5, carbsG: 10 })],
    zielKcal: 3000, gewichtKg: 87, waterMl: 2000, jetzt: "12:00", schlafen: "23:00",
  });
  assert.deepEqual(befunde, []);
  assert.equal(plausibelText(befunde), "");
});

test("mehr als neun Kalorien je Gramm sind unmöglich", () => {
  // Reines Fett liegt bei 9 kcal je Gramm, mehr geht nicht.
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Reis", quantity: "150 g", kcal: 1800, proteinG: 4, fatG: 1, carbsG: 30 })],
  });
  assert.equal(befunde.length, 1);
  assert.equal(befunde[0]!.schwere, "hart");
  assert.match(befunde[0]!.text, /je Gramm/);
});

test("Öl mit 900 kcal je 100 Gramm löst keinen Fehlalarm aus", () => {
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Olivenöl", quantity: "20 g", kcal: 180, proteinG: 0, fatG: 20, carbsG: 0 })],
  });
  assert.deepEqual(befunde, []);
  assert.equal(MAX_KCAL_JE_GRAMM > 9, true);
});

test("Makros dürfen nicht mehr wiegen als der Posten selbst", () => {
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Shake", quantity: "30 g", kcal: 120, proteinG: 60, fatG: 5, carbsG: 8 })],
  });
  assert.equal(befunde.some((b) => b.schwere === "hart" && /wiegen mehr/.test(b.text)), true);
});

test("eine Menge ohne Gewicht wird nicht geprüft", () => {
  // "2 Eier" sagt über die Masse nichts, und ein geratener Faktor erfindet einen PlausibelBefund.
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Eier", quantity: "2 Stück", kcal: 160, proteinG: 13, fatG: 11, carbsG: 1 })],
  });
  assert.deepEqual(befunde, []);
});

test("mehr als das Doppelte des Ziels fällt auf", () => {
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Tag", quantity: "3000 g", kcal: 6400, proteinG: 250, fatG: 200, carbsG: 700 })],
    zielKcal: 3000,
  });
  assert.equal(befunde.some((b) => /mehr als das Doppelte/.test(b.text)), true);
});

test("der Tag aus dem Betrieb wird gemeldet", () => {
  // 15. September, 16 Uhr: 5172 kcal gegen ein Ziel von 3000, weil das Modell
  // die halbe Tagesliste ein zweites Mal geschickt hatte.
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Tag", quantity: "3000 g", kcal: 5172, proteinG: 250, fatG: 150, carbsG: 600 })],
    zielKcal: 3000, jetzt: "16:00", schlafen: "23:00",
  });
  assert.equal(befunde.length > 0, true, "so ein Tag darf nicht unbemerkt durchgehen");
  assert.match(plausibelText(befunde), /über dem Ziel/);
});

test("über dem Ziel am frühen Nachmittag fällt auf, am späten Abend nicht", () => {
  const lage = {
    posten: [posten({ name: "Tag", quantity: "1000 g", kcal: 3400, proteinG: 200, fatG: 100, carbsG: 300 })],
    zielKcal: 3000, schlafen: "23:00",
  };
  const frueh = plausibelPruefen({ ...lage, jetzt: "16:00" });
  assert.equal(frueh.some((b) => /bis zum Schlafen/.test(b.text)), true);

  const spaet = plausibelPruefen({ ...lage, jetzt: "22:00" });
  assert.equal(spaet.some((b) => /bis zum Schlafen/.test(b.text)), false);
});

test("ohne Ziel entfällt jeder PlausibelBefund, der am Ziel hängt", () => {
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Tag", quantity: "3000 g", kcal: 8000, proteinG: 200, fatG: 300, carbsG: 800 })],
  });
  assert.deepEqual(befunde, []);
});

test("vier Gramm Protein je Kilo fallen auf", () => {
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Tag", quantity: "2000 g", kcal: 2500, proteinG: 400, fatG: 50, carbsG: 200 })],
    gewichtKg: 87,
  });
  assert.equal(befunde.some((b) => /je Kilo/.test(b.text)), true);
});

test("dreissig Gramm Protein je Kilo Körpergewicht fallen nicht auf", () => {
  const befunde = plausibelPruefen({
    posten: [posten({ name: "Tag", quantity: "2000 g", kcal: 2500, proteinG: 200, fatG: 50, carbsG: 200 })],
    gewichtKg: 87,
  });
  assert.deepEqual(befunde, []);
});

test("sieben Liter Wasser fallen auf", () => {
  const befunde = plausibelPruefen({ posten: [], waterMl: 7000 });
  assert.equal(befunde.length, 1);
  assert.match(befunde[0]!.text, /7\.0 Liter/);
});

test("harte Befunde stehen im Text vor den auffälligen", () => {
  const text = plausibelText([
    { schwere: "auffaellig", text: "zweiter" },
    { schwere: "hart", text: "erster" },
  ]);
  assert.equal(text.indexOf("erster") < text.indexOf("zweiter"), true);
  assert.match(text, /kann so nicht stimmen/);
});
