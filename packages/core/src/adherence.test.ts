import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreDay, currentStreak } from "./adherence.js";
import type { MacroTargets, DayTotals } from "./types.js";

const targets: MacroTargets = { kcal: 3000, proteinG: 139, fatG: 70, carbsG: 431, waterMl: 3050 };

test("Zieltreffer gibt volle Punktzahl", () => {
  const totals: DayTotals = { kcal: 3000, proteinG: 139, fatG: 70, carbsG: 431, waterMl: 3050 };
  const s = scoreDay(totals, targets);
  assert.equal(s.total, 100);
  assert.equal(s.verdict, "on_track");
});

test("starkes Defizit bei Kalorien und Protein senkt den Score", () => {
  const totals: DayTotals = { kcal: 1500, proteinG: 60, fatG: 40, carbsG: 150, waterMl: 1000 };
  const s = scoreDay(totals, targets);
  assert.ok(s.total < 50, `Score zu hoch: ${s.total}`);
  assert.equal(s.verdict, "off_track");
});

test("mehr Protein als geplant wird nicht bestraft", () => {
  const totals: DayTotals = { kcal: 3000, proteinG: 200, fatG: 70, carbsG: 380, waterMl: 3050 };
  assert.equal(scoreDay(totals, targets).protein, 100);
});

test("Streak zaehlt zusammenhaengende Tage", () => {
  assert.equal(currentStreak({ daysWithLog: ["2026-09-01", "2026-09-02", "2026-09-03"], today: "2026-09-03" }), 3);
});

test("Streak bleibt am Morgen erhalten, wenn gestern geloggt wurde", () => {
  assert.equal(currentStreak({ daysWithLog: ["2026-09-01", "2026-09-02"], today: "2026-09-03" }), 2);
});

test("Luecke bricht die Streak", () => {
  assert.equal(currentStreak({ daysWithLog: ["2026-08-28", "2026-09-03"], today: "2026-09-03" }), 1);
});
