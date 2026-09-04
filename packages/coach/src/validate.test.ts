import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEntries } from "./validate.js";

test("korrigiert falsch gerechnete Kalorien", () => {
  const result = validateEntries([
    { name: "Hähnchenbrust", quantity: "200 g", kcal: 500, proteinG: 46, fatG: 5.2, carbsG: 0 },
  ]);
  assert.equal(result.entries[0]!.kcal, 231);
  assert.equal(result.warnings.length, 1);
});

test("akzeptiert Werte innerhalb der Toleranz", () => {
  const result = validateEntries([
    { name: "Reis", quantity: "150 g", kcal: 195, proteinG: 4, fatG: 0.5, carbsG: 42 },
  ]);
  assert.equal(result.warnings.length, 0);
  assert.equal(result.entries[0]!.kcal, 195);
});

test("negative und fehlende Werte werden auf null gesetzt", () => {
  const result = validateEntries([{ name: "Test", quantity: "1", kcal: -5, proteinG: null, fatG: "x", carbsG: 10 }]);
  assert.equal(result.entries[0]!.proteinG, 0);
  assert.equal(result.entries[0]!.fatG, 0);
  assert.equal(result.entries[0]!.kcal, 40);
});

test("Einträge ohne Namen werden verworfen", () => {
  assert.equal(validateEntries([{ quantity: "200 g", kcal: 100 }]).entries.length, 0);
});

test("nicht Listen ergeben eine Warnung", () => {
  assert.equal(validateEntries({} as unknown).warnings.length, 1);
});
