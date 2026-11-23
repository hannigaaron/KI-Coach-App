import { test } from "node:test";
import assert from "node:assert/strict";
import { schlafwert, schlafZiel, phasenUrteil, PHASEN_SPANNE } from "./schlafwert.js";

const B = Date.parse("2026-11-23T23:00:00Z");
const nacht = (min: number, tief: number, rem: number, wach = 18) => ({
  tag: "2026-11-24", beginn: B, ende: B + (min + wach) * 60000,
  tiefMin: tief, remMin: rem, kernMin: min - tief - rem, wachMin: wach, wachPhasen: 9,
});

test("eine gute lange Nacht liegt hoch, eine kurze tiefer", () => {
  const gut = schlafwert(nacht(480, 80, 110), 480)!;
  const kurz = schlafwert(nacht(362, 61, 67), 480)!;
  assert.ok(gut.wert >= 95);
  assert.ok(kurz.wert < gut.wert);
  assert.equal(kurz.schlafMin, 362);
  assert.equal(kurz.anteil.tief, 17);
  assert.equal(kurz.effizienz, 95);
});

test("ohne genug Schlaf gibt es keinen Wert", () => {
  assert.equal(schlafwert(nacht(40, 5, 5), 480), null);
});

test("das Ziel folgt dem eigenen Plan, nie unter sieben Stunden", () => {
  assert.equal(schlafZiel("23:00", "07:00"), 480);
  assert.equal(schlafZiel("00:30", "06:00"), 420);
  assert.equal(schlafZiel(), 480);
});

test("Phasen gegen ihre Spanne", () => {
  assert.equal(phasenUrteil(17, PHASEN_SPANNE.tief), "in der üblichen Spanne");
  assert.equal(phasenUrteil(9, PHASEN_SPANNE.tief), "unter der üblichen Spanne");
});
