import assert from "node:assert/strict";
import test from "node:test";
import { abendplan, schlafDauer, schlafWoche, spaeterAls, stundenText, type Nacht } from "./schlafplan.js";

test("Die Mitteilung kommt 90 Minuten vor der Schlafenszeit", () => {
  const p = abendplan("23:00", "06:30");
  assert.equal(p.start, "21:30");
  assert.equal(p.schritte[0]?.id, "fruehstueck");
  assert.equal(p.schritte[0]?.uhrzeit, "21:45");
  assert.equal(p.schritte.find((x) => x.id === "handy")?.uhrzeit, "22:00");
  assert.equal(p.schritte.at(-1)?.uhrzeit, "23:00");
  assert.equal(p.schlafMinuten, 450);
});

test("Über Mitternacht wird durchgerechnet", () => {
  assert.equal(schlafDauer("00:30", "07:00"), 390);
  assert.equal(abendplan("00:30", "07:00").start, "23:00");
  assert.equal(spaeterAls("23:30", "00:10"), 40);
  assert.equal(spaeterAls("23:30", "23:00"), -30);
});

test("Stunden werden gesagt", () => {
  assert.equal(stundenText(465), "7 h 45");
  assert.equal(stundenText(480), "8 h");
  assert.equal(stundenText(31), "31 min");
});

const nacht = (geplant: number, ist: number | null, spaeter: number | null = null): Nacht => ({
  tag: "2026-11-10", geplantMin: geplant, tatsaechlichMin: ist, quelle: ist === null ? null : "health", spaeterMin: spaeter,
});

test("Ohne gemessene Nacht gibt es keinen Vergleich", () => {
  const w = schlafWoche([nacht(480, null), nacht(480, null)]);
  assert.equal(w.tatsaechlichSchnitt, null);
  assert.equal(w.abweichung, null);
  assert.match(w.tipp, /kein Schlaf gemessen/);
});

test("Ein Plan unter sieben Stunden kommt vor allem anderen", () => {
  assert.match(schlafWoche([nacht(390, 380)]).tipp, /mindestens 7 Stunden/);
});

test("Spätes Zubettgehen bekommt den Tipp mit dem Handy", () => {
  const w = schlafWoche([nacht(480, 420, 40), nacht(480, 430, 30)]);
  assert.equal(w.abweichung, -55);
  assert.match(w.tipp, /später ins Bett/);
});

test("Wer schläft wie geplant, bekommt keinen Vorwurf", () => {
  assert.match(schlafWoche([nacht(480, 470), nacht(480, 490)]).tipp, /so, wie du es dir vorgenommen hast/);
});
