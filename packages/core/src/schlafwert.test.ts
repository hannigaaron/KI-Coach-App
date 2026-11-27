import { test } from "node:test";
import assert from "node:assert/strict";
import { schlafwert, schlafZiel, phasenUrteil, PHASEN_SPANNE, schlafUrteil, schlafSatz, schlafwertSchnitt } from "./schlafwert.js";

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

test("die Teile ergeben genau den Wert und bleiben unter ihrem Höchstwert", () => {
  for (const [min, tief, rem, wach] of [[480, 80, 110, 18], [362, 61, 67, 40], [300, 30, 40, 120], [455, 50, 95, 25]] as const) {
    const w = schlafwert(nacht(min, tief, rem, wach), 480)!;
    const t = w.teile;
    assert.equal(t.dauer + t.ruhe + t.tief + t.rem, w.wert);
    assert.ok(t.dauer <= 50 && t.ruhe <= 20 && t.tief <= 15 && t.rem <= 15);
  }
});

test("Urteil und Satz nennen, was am meisten kostet", () => {
  assert.equal(schlafUrteil(100), "Sehr hoch");
  assert.equal(schlafUrteil(62), "Mittel");
  const kurz = schlafwert(nacht(362, 61, 90), 480)!;
  assert.match(schlafSatz(kurz), /Dauer: diese Nacht 1 h 58 min unter deinem Ziel/);
  assert.match(schlafSatz(schlafwert(nacht(480, 80, 110), 480)!), /sehr gut geschlafen/);
});

test("der Schnitt der Woche braucht drei Nächte", () => {
  const a = schlafwert(nacht(480, 80, 110), 480);
  const b = schlafwert(nacht(362, 61, 67), 480);
  assert.equal(schlafwertSchnitt([a, b, null]), null);
  const s = schlafwertSchnitt([a, b, a])!;
  assert.equal(s.naechte, 3);
  assert.equal(s.teile.dauer + s.teile.ruhe + s.teile.tief + s.teile.rem, s.wert);
  assert.match(schlafSatz(s, { woche: true }), /im Schnitt|diese Woche/);
});
