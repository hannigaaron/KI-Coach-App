import { test } from "node:test";
import assert from "node:assert/strict";
import { koerperlage, signalVon, koerperlageText } from "./koerpersignale.js";

const HEUTE = "2026-11-24";
function tage(n: number, f: (i: number) => Record<string, number>) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${HEUTE}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - i);
    return { tag: d.toISOString().slice(0, 10), ...f(i) };
  });
}

test("ohne sieben Tage eigenen Schnitt gibt es keine Lage", () => {
  assert.equal(koerperlage(tage(4, () => ({ hrv: 60, ruhepuls: 55 })), HEUTE).stufe, "offen");
});

test("HRV deutlich unter und Ruhepuls über dem Schnitt heisst angespannt", () => {
  const t = tage(20, (i) => (i === 0 ? { hrv: 45, ruhepuls: 62 } : { hrv: 60, ruhepuls: 55 }));
  const l = koerperlage(t, HEUTE);
  assert.equal(l.stufe, "angespannt");
  assert.equal(signalVon(t, "ruhepuls", HEUTE)!.abweichung, 7);
  assert.match(koerperlageText(l), /keine Stressmessung/);
});

test("HRV über dem Schnitt heisst entspannt, gleich heisst im Rahmen", () => {
  assert.equal(koerperlage(tage(20, (i) => (i === 0 ? { hrv: 70, ruhepuls: 54 } : { hrv: 60, ruhepuls: 55 })), HEUTE).stufe, "entspannt");
  assert.equal(koerperlage(tage(20, () => ({ hrv: 60, ruhepuls: 55 })), HEUTE).stufe, "im_rahmen");
});

test("ein Wert von gestern zählt, wenn heute noch keiner da ist", () => {
  const t = tage(20, (i) => (i === 0 ? ({} as Record<string, number>) : { hrv: 60 }));
  assert.equal(signalVon(t, "hrv", HEUTE)!.tag, "2026-11-23");
});
