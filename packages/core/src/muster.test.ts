import { test } from "node:test";
import assert from "node:assert/strict";
import { MIND_TAGE, muster, musterText, pearson, type MusterTag } from "./muster.js";

function tag(i: number, teile: Partial<MusterTag> = {}): MusterTag {
  const d = new Date(2026, 7, 1 + i);
  return {
    tag: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    kcal: null, proteinG: null, wasserMl: null, schlaf: null, energie: null,
    konzentration: null, stimmung: null, training: null, terminMinuten: null,
    ...teile,
  };
}

test("Pearson rechnet richtig", () => {
  assert.equal(pearson([1, 2, 3], [2, 4, 6]), 1);
  assert.equal(pearson([1, 2, 3], [6, 4, 2]), -1);
  assert.ok(Number.isNaN(pearson([1, 1, 1], [1, 2, 3])));
  assert.ok(Number.isNaN(pearson([1], [1])));
});

test("unter zehn gemeinsamen Tagen wird nichts behauptet", () => {
  const tage = Array.from({ length: 9 }, (_, i) => tag(i, { schlaf: i + 1, energie: i + 1 }));
  assert.deepEqual(muster(tage), []);
});

test("ein starker Zusammenhang wird gefunden und benannt", () => {
  const tage = Array.from({ length: 20 }, (_, i) => tag(i, { schlaf: (i % 10) + 1, energie: (i % 10) + 1 }));
  const funde = muster(tage);
  const schlaf = funde.find((f) => f.treiber === "Schlafqualität" && f.ziel === "Energie");
  assert.ok(schlaf);
  assert.equal(schlaf!.r, 1);
  assert.ok(schlaf!.oben > schlaf!.unten);
});

test("jeder Befund sagt dazu, dass es keine Ursache ist", () => {
  const tage = Array.from({ length: 20 }, (_, i) => tag(i, { schlaf: (i % 10) + 1, energie: (i % 10) + 1 }));
  for (const f of muster(tage)) assert.ok(f.satz.includes("keine Ursache"));
});

test("ein schwacher Zusammenhang wird nicht gemeldet", () => {
  // Zufällig wirkende Zahlen ohne Muster.
  const werte = [5, 2, 8, 3, 7, 4, 6, 1, 9, 5, 3, 8];
  const tage = werte.map((w, i) => tag(i, { schlaf: w, energie: [5, 5, 4, 6, 5, 5, 6, 4, 5, 5, 6, 5][i]! }));
  const funde = muster(tage).filter((f) => f.treiber === "Schlafqualität");
  assert.equal(funde.length, 0);
});

test("ein negativer Zusammenhang kommt mit der richtigen Richtung", () => {
  const tage = Array.from({ length: 15 }, (_, i) => tag(i, { terminMinuten: i * 40, energie: 10 - Math.floor(i / 2) }));
  const fund = muster(tage).find((f) => f.treiber === "verplante Zeit" && f.ziel === "Energie");
  assert.ok(fund);
  assert.ok(fund!.r < 0);
  assert.ok(fund!.oben < fund!.unten);
  assert.ok(fund!.satz.includes("läuft gegen"));
});

test("der Versatz vergleicht das Training von gestern mit dem Schlaf von heute", () => {
  // Training an geraden Tagen, am Folgetag schlechter Schlaf.
  const tage = Array.from({ length: 20 }, (_, i) => tag(i, {
    training: i % 2 === 0 ? 1 : 0,
    schlaf: i % 2 === 1 ? 4 : 8,
  }));
  const fund = muster(tage).find((f) => f.treiber === "Training am Vortag");
  assert.ok(fund);
  assert.ok(fund!.r < 0);
});

test("Tage ohne Wert fallen aus der Rechnung, nicht als Null hinein", () => {
  const tage = [
    ...Array.from({ length: 12 }, (_, i) => tag(i, { schlaf: (i % 6) + 3, energie: (i % 6) + 3 })),
    ...Array.from({ length: 8 }, (_, i) => tag(20 + i, { schlaf: null, energie: null })),
  ];
  const fund = muster(tage).find((f) => f.treiber === "Schlafqualität" && f.ziel === "Energie");
  assert.equal(fund!.tage, 12);
});

test("ohne Befund sagt der Text, dass die Daten nichts hergeben", () => {
  const text = musterText([], 21);
  assert.ok(text.includes("21 Tagen"));
  assert.ok(text.includes("nicht hergeben"));
});

test("die Mindestzahl an Tagen ist zehn", () => {
  assert.equal(MIND_TAGE, 10);
});
