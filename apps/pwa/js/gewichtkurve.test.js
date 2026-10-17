import { test } from "node:test";
import assert from "node:assert/strict";
import { gewichtsKurve, gewichtsSpanne } from "./gewichtkurve.js";

function tage(n, wiegungen) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(2026, 8, 1 + i));
    out.push({ day: d.toISOString().slice(0, 10), weightKg: wiegungen[i] ?? null });
  }
  return out;
}

const OHNE = { belastbar: false, aktuellKg: null, kgProWoche: 0, spanneTage: 0 };

test("ohne Wiegung keine Kurve", () => {
  assert.equal(gewichtsKurve(tage(30, {}), OHNE), "");
  assert.equal(gewichtsKurve([], OHNE), "");
});

test("eine Wiegung ist ein Punkt ohne Linie", () => {
  const svg = gewichtsKurve(tage(30, { 29: 84.2 }), OHNE);
  assert.match(svg, /<circle/);
  assert.doesNotMatch(svg, /gk-linie/);
  assert.match(svg, /aria-label="1 Wiegung, zuletzt 84,2 kg/);
  assert.doesNotMatch(svg, /NaN/);
});

test("ein Tag ohne Wiegung ist keine Wiegung von null Kilo", () => {
  const svg = gewichtsKurve(tage(10, { 0: 85, 9: 84 }), OHNE);
  assert.equal((svg.match(/<circle/g) || []).length, 2);
  assert.doesNotMatch(svg, /NaN/);
});

test("Trendgerade nur, wenn der Kern sie belastbar nennt", () => {
  const punkte = tage(28, { 0: 86, 7: 85.6, 14: 85.1, 21: 84.8, 27: 84.4 });
  assert.doesNotMatch(gewichtsKurve(punkte, OHNE), /gk-trend/);
  const svg = gewichtsKurve(punkte, { belastbar: true, aktuellKg: 84.4, kgProWoche: -0.41, spanneTage: 27 });
  assert.match(svg, /gk-trend/);
});

test("die Achse hat mindestens zwei Kilo Höhe", () => {
  const svg = gewichtsKurve(tage(5, { 0: 84.1, 4: 84.3 }), OHNE);
  const zahlen = [...svg.matchAll(/text-anchor="end">(\d+,\d)</g)].map((m) => Number(m[1].replace(",", ".")));
  assert.ok(Math.max(...zahlen) - Math.min(...zahlen) >= 2);
});

test("die Zeitachse beginnt bei der ersten Wiegung", () => {
  const svg = gewichtsKurve(tage(90, { 76: 85, 89: 84 }), OHNE);
  assert.match(svg, />16\. Nov</);
  const xs = [...svg.matchAll(/<circle[^>]*cx="([\d.]+)"/g)].map((m) => Number(m[1]));
  assert.equal(xs[0], 38);
});

test("Spanne nennt Strecke, nicht Schnitt", () => {
  assert.deepEqual(gewichtsSpanne(tage(10, { 0: 85.4, 9: 84.0 })), { kg: "84,0 kg", zusatz: "minus 1,4 kg seit 1. Sep" });
  assert.deepEqual(gewichtsSpanne(tage(10, { 3: 84 })), { kg: "84,0 kg", zusatz: "gewogen am 4. Sep" });
  assert.equal(gewichtsSpanne(tage(10, {})), null);
});
