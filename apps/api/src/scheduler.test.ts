import { test } from "node:test";
import assert from "node:assert/strict";
import { Coach, type CoachProvider } from "@kicoach/coach";
import { openDb } from "./db.js";
import { runSchedulerTick } from "./scheduler.js";
import { ConsoleNotifier } from "./notifier.js";
import { saveProfile } from "./store.js";
import { createToken } from "./auth.js";

class OfflineProvider implements CoachProvider {
  readonly name = "offline";
  readonly available = false;
  async generateJson<T>(): Promise<T> {
    throw new Error("nicht verfuegbar");
  }
}

function setup() {
  const db = openDb(":memory:");
  const { hash } = createToken();
  db.prepare("INSERT INTO users (id, email, name, token_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
    "u1",
    "a@b.de",
    "Aaron",
    hash,
    new Date().toISOString(),
  );
  saveProfile(db, "u1", {
    sex: "male",
    ageYears: 23,
    heightCm: 184,
    weightKg: 87,
    goal: "maintain",
    dailySteps: 12000,
    wakeTime: "07:00",
    sleepTime: "23:00",
    tdeeOverrideKcal: 3000,
    sessions: [],
  });
  return { db, coach: new Coach(new OfflineProvider()), notifier: new ConsoleNotifier() };
}

test("verschickt eine faellige Erinnerung genau einmal", async () => {
  const deps = { ...setup(), clock: () => ({ day: "2026-09-03", time: "07:35" }) };
  assert.equal(await runSchedulerTick(deps), 1);
  assert.equal(await runSchedulerTick(deps), 0);
  assert.equal(deps.notifier.sent[0]!.kind, "morning_checkin");
  deps.db.close();
});

test("verschickt nichts ausserhalb des Zeitfensters", async () => {
  const deps = { ...setup(), clock: () => ({ day: "2026-09-03", time: "07:20" }) };
  assert.equal(await runSchedulerTick(deps), 0);
  deps.db.close();
});

test("verpasste Erinnerungen laufen innerhalb der Nachfrist noch raus", async () => {
  const deps = { ...setup(), clock: () => ({ day: "2026-09-03", time: "07:44" }) };
  assert.equal(await runSchedulerTick(deps), 1);
  deps.db.close();
});

test("nach der Nachfrist wird nichts mehr verschickt", async () => {
  const deps = { ...setup(), clock: () => ({ day: "2026-09-03", time: "07:46" }) };
  assert.equal(await runSchedulerTick(deps), 0);
  deps.db.close();
});

test("Nutzer ohne Profil blockieren den Lauf nicht", async () => {
  const deps = { ...setup(), clock: () => ({ day: "2026-09-03", time: "07:35" }) };
  deps.db.prepare("INSERT INTO users (id, email, name, token_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
    "u2",
    "c@d.de",
    "Ohne Profil",
    "hash",
    new Date().toISOString(),
  );
  assert.equal(await runSchedulerTick(deps), 1);
  deps.db.close();
});
