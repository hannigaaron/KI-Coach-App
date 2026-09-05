import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDailyReminders, type DayState } from "./reminders.js";
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
  sessions: [{ type: "strength", minutes: 75, weekday: 1, startsAt: "17:00" }],
};

const emptyState: DayState = {
  mealsLogged: 0,
  waterMl: 0,
  waterTargetMl: 3050,
  morningCheckinDone: false,
  eveningReviewDone: false,
};

test("nie mehr als acht Erinnerungen pro Tag", () => {
  // Acht statt sechs, seit der Mittagsblock dazugekommen ist. Mehr wird nicht
  // angezeigt: ab einer bestimmten Zahl wischt man alles weg.
  const r = buildDailyReminders({ profile, weekday: 1, state: emptyState });
  assert.ok(r.length <= 8, `zu viele: ${r.length}`);
});

test("der Mittagsblock steht um 14:00, 14:30 und 15:00", () => {
  const r = buildDailyReminders({
    profile, weekday: 1,
    state: { ...emptyState, offeneAufgaben: 3 },
  });
  assert.equal(r.find((x) => x.kind === "midday_meal")?.at, "14:00");
  assert.equal(r.find((x) => x.kind === "midday_challenge")?.at, "14:30");
  assert.equal(r.find((x) => x.kind === "midday_priorities")?.at, "15:00");
});

test("ohne offene Aufgaben gibt es keine Prioritätenfrage", () => {
  const r = buildDailyReminders({ profile, weekday: 1, state: { ...emptyState, offeneAufgaben: 0 } });
  assert.equal(r.some((x) => x.kind === "midday_priorities"), false);
});

test("ein beantworteter Mittags Check-in erinnert nicht noch einmal", () => {
  const r = buildDailyReminders({
    profile, weekday: 1,
    state: { ...emptyState, middayCheckinDone: true, middayChallengeDone: true },
  });
  assert.equal(r.some((x) => x.kind === "midday_meal"), false);
  assert.equal(r.some((x) => x.kind === "midday_challenge"), false);
});

test("Erinnerungen sind zeitlich sortiert", () => {
  const r = buildDailyReminders({ profile, weekday: 1, state: emptyState });
  const times = r.map((x) => x.at);
  assert.deepEqual(times, [...times].sort());
});

test("erledigte Aufgaben erzeugen keine Erinnerung", () => {
  const r = buildDailyReminders({
    profile,
    weekday: 0,
    state: { ...emptyState, morningCheckinDone: true, eveningReviewDone: true, waterMl: 3050, mealsLogged: 3 },
  });
  assert.equal(r.some((x) => x.kind === "morning_checkin"), false);
  assert.equal(r.some((x) => x.kind === "hydration"), false);
  assert.equal(r.some((x) => x.kind === "meal_log"), false);
});

test("Trainingstag erzeugt Erinnerung vor und nach der Einheit", () => {
  const r = buildDailyReminders({ profile, weekday: 1, state: emptyState });
  const pre = r.find((x) => x.kind === "pre_training");
  const post = r.find((x) => x.kind === "post_training");
  assert.equal(pre?.at, "15:30");
  assert.equal(post?.at, "18:45");
});

test("an trainingsfreien Tagen gibt es keine Trainingserinnerung", () => {
  const r = buildDailyReminders({ profile, weekday: 0, state: emptyState });
  assert.equal(r.some((x) => x.kind.includes("training")), false);
});
