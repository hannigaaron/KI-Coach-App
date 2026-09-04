import { test } from "node:test";
import assert from "node:assert/strict";
import { bmrMifflinStJeor, activityFactor, energyBreakdown, macroTargets, waterTargetMl } from "./energy.js";
import type { UserProfile } from "./types.js";

const aaron: UserProfile = {
  sex: "male",
  ageYears: 23,
  heightCm: 184,
  weightKg: 87,
  goal: "maintain",
  dailySteps: 12000,
  wakeTime: "07:00",
  sleepTime: "23:00",
  sessions: [
    { type: "team_sport", minutes: 120, weekday: 2, startsAt: "19:00" },
    { type: "team_sport", minutes: 120, weekday: 4, startsAt: "19:00" },
    { type: "strength", minutes: 75, weekday: 1, startsAt: "17:00" },
    { type: "strength", minutes: 75, weekday: 3, startsAt: "17:00" },
    { type: "strength", minutes: 75, weekday: 5, startsAt: "17:00" },
  ],
};

test("BMR nach Mifflin-St Jeor, Handrechnung", () => {
  // 10*87 + 6.25*184 - 5*23 + 5 = 870 + 1150 - 115 + 5 = 1910
  assert.equal(bmrMifflinStJeor({ sex: "male", weightKg: 87, heightCm: 184, ageYears: 23 }), 1910);
});

test("BMR Frau liegt 166 kcal unter dem Mann bei gleichen Werten", () => {
  const m = bmrMifflinStJeor({ sex: "male", weightKg: 70, heightCm: 170, ageYears: 30 });
  const f = bmrMifflinStJeor({ sex: "female", weightKg: 70, heightCm: 170, ageYears: 30 });
  assert.equal(m - f, 166);
});

test("Aktivitätsfaktor bleibt in der PAL Spanne", () => {
  // Ohne Angaben gilt sitzende Arbeit und gemischte Freizeit, das ergibt den
  // Freizeitaufschlag von 0.02 auf den Grundwert.
  assert.equal(activityFactor({ dailySteps: 0, weeklyTrainingMinutes: 0, leisure: "ruhig" }), 1.2);
  const high = activityFactor({ dailySteps: 30000, weeklyTrainingMinutes: 900, occupation: "koerperlich", leisure: "aktiv" });
  assert.ok(high <= 1.9 && high > 1.5, `unerwartet: ${high}`);
});

test("körperliche Arbeit hebt den Faktor, Sitzen nicht", () => {
  const sitzend = activityFactor({ dailySteps: 8000, weeklyTrainingMinutes: 180, occupation: "sitzend", leisure: "ruhig" });
  const koerperlich = activityFactor({ dailySteps: 8000, weeklyTrainingMinutes: 180, occupation: "koerperlich", leisure: "ruhig" });
  assert.ok(koerperlich - sitzend > 0.09 && koerperlich - sitzend < 0.11);
});

test("Protein rechnet auf die fettfreie Masse, wenn der Körperfettanteil bekannt ist", () => {
  const basis = { ...aaron, goal: "fat_loss" as const };
  const ohne = macroTargets(basis).proteinG;
  const mit = macroTargets({ ...basis, bodyFatPercent: 30 }).proteinG;
  // 87 kg mal 1.8 sind 157 g. Bei 30 Prozent Fett bleiben 60.9 kg fettfreie
  // Masse, mal 2.4 sind 146 g.
  assert.equal(ohne, 157);
  assert.equal(mit, 146);
});

test("unsinnige Körperfettwerte werden ignoriert", () => {
  const ohne = macroTargets(aaron).proteinG;
  assert.equal(macroTargets({ ...aaron, bodyFatPercent: 0 }).proteinG, ohne);
  assert.equal(macroTargets({ ...aaron, bodyFatPercent: 95 }).proteinG, ohne);
});

test("Zielkalorien im Erhalt entsprechen dem TDEE", () => {
  const e = energyBreakdown(aaron);
  assert.equal(e.goalAdjustmentKcal, 0);
  assert.equal(e.targetKcal, e.tdeeKcal);
  assert.ok(e.tdeeKcal > 2600 && e.tdeeKcal < 3400, `TDEE ausserhalb der Erwartung: ${e.tdeeKcal}`);
});

test("Defizit senkt die Zielkalorien um 18 Prozent", () => {
  const e = energyBreakdown({ ...aaron, goal: "fat_loss" });
  assert.equal(e.targetKcal, e.tdeeKcal + e.goalAdjustmentKcal);
  assert.ok(Math.abs(e.goalAdjustmentKcal / e.tdeeKcal + 0.18) < 0.001);
});

test("Manüller TDEE Wert überschreibt die Schätzung", () => {
  const e = energyBreakdown({ ...aaron, tdeeOverrideKcal: 3000 });
  assert.equal(e.tdeeKcal, 3000);
  assert.equal(e.targetKcal, 3000);
});

test("Makros ergeben in Summe die Zielkalorien", () => {
  const t = macroTargets({ ...aaron, tdeeOverrideKcal: 3000 });
  const fromMacros = t.proteinG * 4 + t.fatG * 9 + t.carbsG * 4;
  assert.ok(Math.abs(fromMacros - t.kcal) <= 4, `Abweichung ${fromMacros - t.kcal} kcal`);
  assert.equal(t.proteinG, Math.round(87 * 1.6));
  assert.equal(t.fatG, Math.round(87 * 0.8));
});

test("Protein steigt im Defizit auf 1.8 g pro kg", () => {
  const t = macroTargets({ ...aaron, goal: "fat_loss" });
  assert.equal(t.proteinG, Math.round(87 * 1.8));
});

test("Trinkmenge steigt mit Trainingsdauer", () => {
  const base = waterTargetMl(aaron, 0);
  const withTraining = waterTargetMl(aaron, 120);
  assert.equal(withTraining - base, 1200);
});
