import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Coach, type CoachProvider } from "@kicoach/coach";
import { createApp } from "./app.js";
import { openDb, type Db } from "./db.js";

class OfflineProvider implements CoachProvider {
  readonly name = "offline";
  readonly available = false;
  async generateJson<T>(): Promise<T> {
    throw new Error("nicht verfuegbar");
  }
}

const DAY = "2026-09-03";
let server: Server;
let base: string;
let db: Db;
let token: string;

const profileBody = {
  sex: "male",
  ageYears: 23,
  heightCm: 184,
  weightKg: 87,
  goal: "maintain",
  dailySteps: 12000,
  wakeTime: "07:00",
  sleepTime: "23:00",
  tdeeOverrideKcal: 3000,
  sessions: [{ type: "strength", minutes: 75, weekday: 4, startsAt: "17:00" }],
};

before(async () => {
  db = openDb(":memory:");
  server = createApp({ db, coach: new Coach(new OfflineProvider()), now: () => DAY });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const created = await call("POST", "/api/users", { email: "test@example.com", name: "Aaron" });
  assert.equal(created.status, 201);
  token = created.body.token as string;
});

after(() => {
  server.close();
  db.close();
});

async function call(
  method: string,
  path: string,
  body?: unknown,
  auth = false,
): Promise<{ status: number; body: Record<string, any> }> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: (await response.json()) as Record<string, any> };
}

test("Health Endpoint antwortet ohne Token", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
});

test("geschuetzte Routen brauchen ein Token", async () => {
  assert.equal((await call("GET", "/api/me")).status, 401);
});

test("doppelte Registrierung wird abgelehnt", async () => {
  const res = await call("POST", "/api/users", { email: "test@example.com", name: "Zweit" });
  assert.equal(res.status, 409);
});

test("Registrierung ohne E-Mail gibt 400", async () => {
  assert.equal((await call("POST", "/api/users", { name: "X" })).status, 400);
});

test("Tagesabfrage ohne Profil gibt 409", async () => {
  assert.equal((await call("GET", "/api/me/day", undefined, true)).status, 409);
});

test("Profil speichern liefert Ziele zurueck", async () => {
  const res = await call("PUT", "/api/me/profile", profileBody, true);
  assert.equal(res.status, 200);
  assert.equal(res.body.targets.kcal, 3000);
  assert.equal(res.body.targets.proteinG, 139);
});

test("unplausible Profilwerte werden abgelehnt", async () => {
  const res = await call("PUT", "/api/me/profile", { ...profileBody, weightKg: 900 }, true);
  assert.equal(res.status, 400);
});

test("Mahlzeit wird geparst und gespeichert", async () => {
  const res = await call("POST", `/api/me/meals?date=${DAY}`, { text: "200g Haehnchenbrust und 150g Reis" }, true);
  assert.equal(res.status, 201);
  assert.equal(res.body.source, "offline");
  assert.equal(res.body.entries.length, 2);
});

test("unverstaendliche Mahlzeit gibt 422 mit Rueckfrage", async () => {
  const res = await call("POST", `/api/me/meals?date=${DAY}`, { text: "irgendwas komisches" }, true);
  assert.equal(res.status, 422);
  assert.ok(res.body.followUpQuestion.length > 0);
});

test("Tagesuebersicht rechnet Summen und Restbudget", async () => {
  await call("POST", `/api/me/water?date=${DAY}`, { ml: 1000 }, true);
  const res = await call("GET", `/api/me/day?date=${DAY}`, undefined, true);
  assert.equal(res.status, 200);
  assert.equal(res.body.totals.kcal, 435);
  assert.equal(res.body.totals.waterMl, 1000);
  assert.equal(res.body.remaining.kcal, 2565);
  assert.equal(res.body.streakDays, 1);
});

test("ungueltiges Datum wird abgelehnt", async () => {
  assert.equal((await call("GET", "/api/me/day?date=03.09.2026", undefined, true)).status, 400);
});

test("Erinnerungen richten sich nach dem Trainingstag", async () => {
  const res = await call("GET", `/api/me/reminders?date=2026-09-03`, undefined, true);
  assert.equal(res.status, 200);
  const kinds = res.body.reminders.map((r: { kind: string }) => r.kind);
  assert.ok(kinds.includes("morning_checkin"));
  assert.ok(res.body.reminders.length <= 6);
});

test("Kuehlschrank laesst sich setzen und lesen", async () => {
  const put = await call("PUT", "/api/me/fridge", { items: ["Eier", "Reis", "Brokkoli", ""] }, true);
  assert.deepEqual(put.body.items, ["Brokkoli", "Eier", "Reis"]);
  const get = await call("GET", "/api/me/fridge", undefined, true);
  assert.equal(get.body.items.length, 3);
});

test("Vorschlag nennt das Restbudget", async () => {
  const res = await call("POST", `/api/me/suggest-meal?date=${DAY}`, {}, true);
  assert.equal(res.status, 200);
  assert.equal(res.body.suggestion.source, "offline");
  assert.equal(res.body.remaining.kcal, 2565);
});

test("HealthKit Daten werden idempotent gespeichert", async () => {
  const payload = { source: "healthkit", samples: [{ day: DAY, steps: 12500, sleepMinutes: 400, weightKg: 87 }] };
  assert.equal((await call("POST", "/api/me/health", payload, true)).body.written, 1);
  await call("POST", "/api/me/health", payload, true);
  const rows = db.prepare("SELECT COUNT(*) AS c FROM health_samples").get() as { c: number };
  assert.equal(rows.c, 1);
});

test("Check-in wird gespeichert und entfernt die Erinnerung", async () => {
  await call("POST", `/api/me/checkins?date=${DAY}`, { kind: "morning", energy: 5, sleepQuality: 4 }, true);
  const res = await call("GET", `/api/me/reminders?date=${DAY}`, undefined, true);
  const kinds = res.body.reminders.map((r: { kind: string }) => r.kind);
  assert.equal(kinds.includes("morning_checkin"), false);
});

test("unbekannte Route gibt 404", async () => {
  assert.equal((await call("GET", "/api/gibtsnicht", undefined, true)).status, 404);
});
