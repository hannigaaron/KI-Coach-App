import { test } from "node:test";
import assert from "node:assert/strict";
import {
  standardStatus,
  standardZumNachhaken,
  standardsStatus,
  suggestStandards,
  type Standard,
  type StandardTag,
} from "./standards.js";
import type { UserProfile } from "./types.js";

const profile: UserProfile = {
  sex: "male",
  ageYears: 23,
  heightCm: 184,
  weightKg: 87,
  goal: "maintain",
  dailySteps: 12000,
  wakeTime: "07:00",
  sleepTime: "23:00",
  sessions: [
    { type: "strength", minutes: 60, weekday: 1, startsAt: "17:00" },
    { type: "strength", minutes: 60, weekday: 3, startsAt: "17:00" },
    { type: "strength", minutes: 60, weekday: 5, startsAt: "17:00" },
    { type: "team_sport", minutes: 120, weekday: 2, startsAt: "20:00" },
  ],
};

function tag(overrides: Partial<StandardTag> = {}): StandardTag {
  return { day: "2026-09-04", proteinG: 0, waterMl: 0, steps: 0, meals: 0, trainings: 0, ...overrides };
}

test("Vorschläge bleiben bei höchstens vier Standards", () => {
  const standards = suggestStandards({
    profile,
    bereiche: ["ernaehrung", "kraft", "schlaf", "trinken", "ausdauer", "gewicht"],
    proteinTargetG: 163,
    waterTargetMl: 3050,
  });
  assert.ok(standards.length <= 4, `waren ${standards.length}`);
  assert.equal(new Set(standards.map((s) => s.id)).size, standards.length);
});

test("Der Erfassungsstandard steht immer drin", () => {
  const ohneBereiche = suggestStandards({ profile, proteinTargetG: 163, waterTargetMl: 3050 });
  assert.ok(ohneBereiche.some((s) => s.kind === "erfassen"));
});

test("Der Proteinstandard liegt unter dem Ziel, nicht darauf", () => {
  const standards = suggestStandards({ profile, bereiche: ["ernaehrung"], proteinTargetG: 163, waterTargetMl: 3050 });
  const protein = standards.find((s) => s.kind === "protein");
  assert.ok(protein);
  assert.ok(protein.ziel < 163, "ein Standard auf Zielhöhe ist kein Mindeststandard");
  assert.equal(protein.ziel, 130);
});

test("Der Trainingsstandard liegt unter dem Wochenplan und nie unter zwei", () => {
  const standards = suggestStandards({ profile, bereiche: ["kraft"], proteinTargetG: 163, waterTargetMl: 3050 });
  const training = standards.find((s) => s.kind === "training");
  assert.ok(training);
  assert.ok(training.ziel >= 2 && training.ziel < profile.sessions.length);
});

test("Täglicher Standard zählt Tage und Serie", () => {
  const standard: Standard = {
    id: "std_protein", kind: "protein", text: "Mindestens 130 g Protein",
    kadenz: "taeglich", ziel: 130, aktiv: true, seit: "2026-08-01",
  };
  const tage = [
    tag({ proteinG: 140 }), tag({ proteinG: 150 }), tag({ proteinG: 100 }), tag({ proteinG: 160 }),
  ];
  const status = standardStatus(standard, tage);
  assert.equal(status.gehalten, 3);
  assert.equal(status.moeglich, 4);
  assert.equal(status.serie, 2);
  assert.equal(status.aktuell, true);
  assert.ok(status.zahlen.includes("3 von 4"));
  // Der kurze Text darf den Standard nicht wiederholen, sonst steht er doppelt.
  assert.equal(status.zahlen.includes(standard.text), false);
});

test("Wöchentlicher Standard rechnet in Wochenblöcken", () => {
  const standard: Standard = {
    id: "std_erfassen", kind: "erfassen", text: "An fünf Tagen erfassen",
    kadenz: "woechentlich", ziel: 5, aktiv: true, seit: "2026-08-01",
  };
  // Erste Woche sechs Tage mit Eintrag, zweite Woche zwei.
  const woche1 = [1, 1, 1, 1, 1, 1, 0].map((m) => tag({ meals: m }));
  const woche2 = [1, 1, 0, 0, 0, 0, 0].map((m) => tag({ meals: m }));
  const status = standardStatus(standard, [...woche1, ...woche2]);
  assert.equal(status.moeglich, 2);
  assert.equal(status.gehalten, 1);
  assert.equal(status.aktuell, true);
});

test("Ein Standard ohne Messung zählt nur, was der Nutzer bestätigt", () => {
  const standard: Standard = {
    id: "std_bett", kind: "schlafenszeit", text: "Vor 23 Uhr im Bett",
    kadenz: "taeglich", ziel: 1, aktiv: true, seit: "2026-08-01",
  };
  // Volle Tageswerte helfen nicht, wenn der Standard nicht messbar ist.
  const tage = [tag({ proteinG: 300, meals: 5 }), tag({ bestaetigt: { std_bett: true } })];
  const status = standardStatus(standard, tage);
  assert.equal(status.aktuell, false);
  assert.equal(status.gehalten, 1);
});

test("Training gilt nicht als gemessen, solange keine Uhr angebunden ist", () => {
  const standard: Standard = {
    id: "std_training", kind: "training", text: "Zwei Einheiten die Woche",
    kadenz: "woechentlich", ziel: 2, aktiv: true, seit: "2026-08-01",
  };
  const tage = Array.from({ length: 7 }, () => tag({ trainings: 1 }));
  const status = standardStatus(standard, tage);
  assert.equal(status.aktuell, false, "ein Kalendereintrag ist kein Trainingsnachweis");
});

test("Inaktive Standards tauchen in der Uebersicht nicht auf", () => {
  const standards: Standard[] = [
    { id: "a", kind: "protein", text: "A", kadenz: "taeglich", ziel: 100, aktiv: true, seit: "2026-08-01" },
    { id: "b", kind: "wasser", text: "B", kadenz: "taeglich", ziel: 2000, aktiv: false, seit: "2026-08-01" },
  ];
  assert.equal(standardsStatus(standards, [tag()]).length, 1);
});

test("Nachgehakt wird beim schlechtesten Standard, der noch zu retten ist", () => {
  const standards: Standard[] = [
    { id: "tot", kind: "protein", text: "Tot", kadenz: "taeglich", ziel: 500, aktiv: true, seit: "2026-08-01" },
    { id: "wackelt", kind: "wasser", text: "Wackelt", kadenz: "taeglich", ziel: 2000, aktiv: true, seit: "2026-08-01" },
  ];
  // Der erste ist an keinem Tag gehalten, der zweite an der Hälfte.
  const tage = [
    tag({ waterMl: 0 }), tag({ waterMl: 2500 }), tag({ waterMl: 2500 }), tag({ waterMl: 0 }),
  ];
  const offen = standardZumNachhaken(standardsStatus(standards, tage));
  assert.ok(offen);
  assert.equal(offen.standard.id, "wackelt");
});

test("Ohne offenen Standard wird nicht nachgehakt", () => {
  const standards: Standard[] = [
    { id: "a", kind: "wasser", text: "A", kadenz: "taeglich", ziel: 2000, aktiv: true, seit: "2026-08-01" },
  ];
  assert.equal(standardZumNachhaken(standardsStatus(standards, [tag({ waterMl: 2500 })])), null);
});

test("Ohne Daten gibt es keine Quote und keinen erfundenen Satz", () => {
  const standard: Standard = {
    id: "a", kind: "protein", text: "A", kadenz: "taeglich", ziel: 130, aktiv: true, seit: "2026-08-01",
  };
  const status = standardStatus(standard, []);
  assert.equal(status.quote, 0);
  assert.equal(status.moeglich, 0);
  assert.match(status.zahlen, /keine Daten/);
});
