import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildDailyReminders,
  currentStreak,
  energyBreakdown,
  macroTargets,
  remainingBudget,
  scoreDay,
  waterTargetMl,
  type FoodEntry,
  type TrainingSession,
  type UserProfile,
} from "@kicoach/core";
import { Coach } from "@kicoach/coach";
import { authenticate, createToken, type AuthUser } from "./auth.js";
import type { Db } from "./db.js";
import {
  HttpError,
  optionalNumber,
  parseDate,
  readJson,
  requireNumber,
  requireString,
  sendJson,
  today,
  weekdayOf,
} from "./http.js";
import {
  addWater,
  daysWithLog,
  getFridge,
  getMeals,
  getProfile,
  getWaterMl,
  insertMeal,
  replaceFridge,
  saveProfile,
} from "./store.js";

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

export interface AppDeps {
  db: Db;
  coach: Coach;
  /** Erlaubt Tests, das Datum festzunageln. */
  now?: () => string;
}

export function createApp(deps: AppDeps): Server {
  const now = deps.now ?? (() => today());

  return createServer((req, res) => {
    handle(req, res, deps, now).catch((error) => {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: error.message });
        return;
      }
      console.error("Unerwarteter Fehler", error);
      sendJson(res, 500, { error: "Interner Serverfehler" });
    });
  });
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  now: () => string,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method ?? "GET";

  if (method === "GET" && path === "/health") {
    return sendJson(res, 200, { status: "ok", date: now() });
  }

  if (method === "GET" && (path === "/" || path === "/index.html")) {
    return serveConsole(res);
  }

  if (method === "POST" && path === "/api/users") {
    return registerUser(req, res, deps);
  }

  if (!path.startsWith("/api/")) {
    return sendJson(res, 404, { error: "Nicht gefunden" });
  }

  const user = authenticate(deps.db, req.headers.authorization);
  if (!user) {
    res.setHeader("www-authenticate", "Bearer");
    return sendJson(res, 401, { error: "Kein gueltiges Token" });
  }

  const day = parseDate(url.searchParams.get("date"), now());

  switch (`${method} ${path}`) {
    case "GET /api/me":
      return sendJson(res, 200, { user });
    case "PUT /api/me/profile":
      return updateProfile(req, res, deps, user);
    case "GET /api/me/targets":
      return sendTargets(res, deps, user, day);
    case "POST /api/me/meals":
      return logMeal(req, res, deps, user, day);
    case "GET /api/me/day":
      return sendDay(res, deps, user, day);
    case "POST /api/me/water":
      return logWater(req, res, deps, user, day);
    case "POST /api/me/checkins":
      return logCheckin(req, res, deps, user, day);
    case "GET /api/me/reminders":
      return sendReminders(res, deps, user, day);
    case "GET /api/me/fridge":
      return sendJson(res, 200, { items: getFridge(deps.db, user.id) });
    case "PUT /api/me/fridge":
      return updateFridge(req, res, deps, user);
    case "POST /api/me/suggest-meal":
      return suggestMeal(res, deps, user, day);
    case "POST /api/me/health":
      return syncHealth(req, res, deps, user);
    case "POST /api/me/devices":
      return registerDevice(req, res, deps, user);
    default:
      return sendJson(res, 404, { error: "Nicht gefunden" });
  }
}

async function serveConsole(res: ServerResponse): Promise<void> {
  try {
    const html = await readFile(join(PUBLIC_DIR, "index.html"), "utf8");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  } catch {
    sendJson(res, 404, { error: "Konsole nicht gefunden" });
  }
}

async function registerUser(req: IncomingMessage, res: ServerResponse, deps: AppDeps): Promise<void> {
  const body = await readJson(req);
  const email = requireString(body, "email", 200).toLowerCase();
  const name = requireString(body, "name", 100);
  const existing = deps.db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new HttpError(409, "E-Mail ist bereits registriert");

  const { token, hash } = createToken();
  const id = randomUUID();
  deps.db
    .prepare("INSERT INTO users (id, email, name, token_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, email, name, hash, new Date().toISOString());
  sendJson(res, 201, { id, email, name, token });
}

async function updateProfile(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
): Promise<void> {
  const body = await readJson(req);
  const profile: UserProfile = {
    sex: enumValue(body, "sex", ["male", "female"]) as UserProfile["sex"],
    ageYears: requireNumber(body, "ageYears", 14, 100),
    heightCm: requireNumber(body, "heightCm", 120, 230),
    weightKg: requireNumber(body, "weightKg", 35, 300),
    goal: enumValue(body, "goal", ["fat_loss", "maintain", "lean_bulk"]) as UserProfile["goal"],
    dailySteps: requireNumber(body, "dailySteps", 0, 60000),
    wakeTime: timeValue(body, "wakeTime"),
    sleepTime: timeValue(body, "sleepTime"),
    tdeeOverrideKcal: optionalNumber(body, "tdeeOverrideKcal", 1000, 8000),
    sessions: parseSessions(body.sessions),
  };
  saveProfile(deps.db, user.id, profile);
  sendJson(res, 200, { profile, targets: macroTargets(profile), energy: energyBreakdown(profile) });
}

function sendTargets(res: ServerResponse, deps: AppDeps, user: AuthUser, day: string): void {
  const profile = requireProfile(deps, user);
  const trainingMinutes = trainingMinutesOn(profile, day);
  const targets = { ...macroTargets(profile), waterMl: waterTargetMl(profile, trainingMinutes) };
  sendJson(res, 200, { targets, energy: energyBreakdown(profile), trainingMinutesToday: trainingMinutes });
}

async function logMeal(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
  day: string,
): Promise<void> {
  const body = await readJson(req);
  const text = requireString(body, "text", 1500);
  const parsed = await deps.coach.parseMeal(text);
  if (parsed.entries.length === 0) {
    return sendJson(res, 422, {
      error: "Konnte nichts zuordnen",
      followUpQuestion: parsed.followUpQuestion,
      source: parsed.source,
    });
  }
  const id = insertMeal(deps.db, { userId: user.id, day, text, source: parsed.source, entries: parsed.entries });
  sendJson(res, 201, { id, ...parsed, day });
}

function sendDay(res: ServerResponse, deps: AppDeps, user: AuthUser, day: string): void {
  sendJson(res, 200, buildDaySummary(deps, user, day));
}

async function logWater(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
  day: string,
): Promise<void> {
  const body = await readJson(req);
  const ml = requireNumber(body, "ml", 1, 5000);
  addWater(deps.db, user.id, day, Math.round(ml));
  sendJson(res, 201, { day, waterMl: getWaterMl(deps.db, user.id, day) });
}

async function logCheckin(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
  day: string,
): Promise<void> {
  const body = await readJson(req);
  const kind = enumValue(body, "kind", ["morning", "evening", "post_training", "adhoc"]);
  deps.db
    .prepare(
      `INSERT INTO checkins (id, user_id, day, kind, energy, mood, sleep_quality, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      user.id,
      day,
      kind,
      optionalNumber(body, "energy", 1, 10),
      optionalNumber(body, "mood", 1, 10),
      optionalNumber(body, "sleepQuality", 1, 10),
      typeof body.note === "string" ? body.note.slice(0, 2000) : null,
      new Date().toISOString(),
    );
  sendJson(res, 201, { day, kind });
}

function sendReminders(res: ServerResponse, deps: AppDeps, user: AuthUser, day: string): void {
  const profile = requireProfile(deps, user);
  const meals = getMeals(deps.db, user.id, day);
  const water = getWaterMl(deps.db, user.id, day);
  const checkins = deps.db
    .prepare("SELECT kind FROM checkins WHERE user_id = ? AND day = ?")
    .all(user.id, day) as Array<{ kind: string }>;

  const reminders = buildDailyReminders({
    profile,
    weekday: weekdayOf(day),
    state: {
      mealsLogged: meals.length,
      waterMl: water,
      waterTargetMl: waterTargetMl(profile, trainingMinutesOn(profile, day)),
      morningCheckinDone: checkins.some((c) => c.kind === "morning"),
      eveningReviewDone: checkins.some((c) => c.kind === "evening"),
    },
  });
  sendJson(res, 200, { day, reminders });
}

async function updateFridge(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
): Promise<void> {
  const body = await readJson(req);
  if (!Array.isArray(body.items)) throw new HttpError(400, "Feld items muss eine Liste sein");
  const items = body.items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 100);
  replaceFridge(deps.db, user.id, items);
  sendJson(res, 200, { items: getFridge(deps.db, user.id) });
}

async function suggestMeal(
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
  day: string,
): Promise<void> {
  const profile = requireProfile(deps, user);
  const summary = buildDaySummary(deps, user, day);
  const suggestion = await deps.coach.suggestMeal({
    fridge: getFridge(deps.db, user.id),
    targets: summary.targets,
    consumed: summary.entries,
    waterMl: summary.totals.waterMl,
  });
  sendJson(res, 200, { day, suggestion, remaining: summary.remaining, goal: profile.goal });
}

async function syncHealth(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
): Promise<void> {
  const body = await readJson(req);
  if (!Array.isArray(body.samples)) throw new HttpError(400, "Feld samples muss eine Liste sein");
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : "healthkit";
  const stmt = deps.db.prepare(
    `INSERT INTO health_samples (id, user_id, day, steps, resting_hr, sleep_minutes, weight_kg, active_kcal, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, day, source) DO UPDATE SET
       steps = excluded.steps, resting_hr = excluded.resting_hr, sleep_minutes = excluded.sleep_minutes,
       weight_kg = excluded.weight_kg, active_kcal = excluded.active_kcal`,
  );
  let written = 0;
  for (const raw of body.samples.slice(0, 400)) {
    if (typeof raw !== "object" || raw === null) continue;
    const sample = raw as Record<string, unknown>;
    const day = parseDate(typeof sample.day === "string" ? sample.day : null, "");
    if (!day) continue;
    stmt.run(
      randomUUID(),
      user.id,
      day,
      optionalNumber(sample, "steps", 0, 100000),
      optionalNumber(sample, "restingHeartRate", 25, 150),
      optionalNumber(sample, "sleepMinutes", 0, 1200),
      optionalNumber(sample, "weightKg", 35, 300),
      optionalNumber(sample, "activeKcal", 0, 8000),
      source,
      new Date().toISOString(),
    );
    written++;
  }
  sendJson(res, 200, { written });
}

async function registerDevice(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AppDeps,
  user: AuthUser,
): Promise<void> {
  const body = await readJson(req);
  const platform = enumValue(body, "platform", ["ios", "android", "web"]);
  const pushToken = requireString(body, "pushToken", 500);
  deps.db
    .prepare(
      `INSERT INTO devices (id, user_id, platform, push_token, created_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, push_token) DO NOTHING`,
    )
    .run(randomUUID(), user.id, platform, pushToken, new Date().toISOString());
  sendJson(res, 201, { platform });
}

export interface DaySummary {
  day: string;
  targets: ReturnType<typeof macroTargets>;
  totals: { kcal: number; proteinG: number; fatG: number; carbsG: number; waterMl: number };
  remaining: ReturnType<typeof remainingBudget>;
  score: ReturnType<typeof scoreDay>;
  meals: Array<{ id: string; text: string; source: string; kcal: number; entries: FoodEntry[] }>;
  entries: FoodEntry[];
  streakDays: number;
}

function buildDaySummary(deps: AppDeps, user: AuthUser, day: string): DaySummary {
  const profile = requireProfile(deps, user);
  const targets = {
    ...macroTargets(profile),
    waterMl: waterTargetMl(profile, trainingMinutesOn(profile, day)),
  };
  const mealRows = getMeals(deps.db, user.id, day);
  const entries = mealRows.flatMap((row) => JSON.parse(row.entries_json) as FoodEntry[]);
  const waterMl = getWaterMl(deps.db, user.id, day);
  const totals = {
    kcal: round(mealRows.reduce((s, r) => s + r.kcal, 0)),
    proteinG: round(mealRows.reduce((s, r) => s + r.protein_g, 0)),
    fatG: round(mealRows.reduce((s, r) => s + r.fat_g, 0)),
    carbsG: round(mealRows.reduce((s, r) => s + r.carbs_g, 0)),
    waterMl,
  };
  return {
    day,
    targets,
    totals,
    remaining: remainingBudget(totals, targets),
    score: scoreDay(totals, targets),
    meals: mealRows.map((row) => ({
      id: row.id,
      text: row.raw_text,
      source: row.source,
      kcal: round(row.kcal),
      entries: JSON.parse(row.entries_json) as FoodEntry[],
    })),
    entries,
    streakDays: currentStreak({ daysWithLog: daysWithLog(deps.db, user.id), today: day }),
  };
}

function requireProfile(deps: AppDeps, user: AuthUser): UserProfile {
  const profile = getProfile(deps.db, user.id);
  if (!profile) throw new HttpError(409, "Profil fehlt. Zuerst PUT /api/me/profile aufrufen.");
  return profile;
}

function trainingMinutesOn(profile: UserProfile, day: string): number {
  const weekday = weekdayOf(day);
  return profile.sessions.filter((s) => s.weekday === weekday).reduce((sum, s) => sum + s.minutes, 0);
}

function parseSessions(value: unknown): TrainingSession[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, "Feld sessions muss eine Liste sein");
  return value.slice(0, 21).map((raw) => {
    if (typeof raw !== "object" || raw === null) throw new HttpError(400, "Ungueltige Einheit");
    const session = raw as Record<string, unknown>;
    return {
      type: enumValue(session, "type", ["strength", "team_sport", "cardio", "mobility"]) as TrainingSession["type"],
      minutes: requireNumber(session, "minutes", 5, 480),
      weekday: requireNumber(session, "weekday", 0, 6),
      startsAt: timeValue(session, "startsAt"),
    };
  });
}

function enumValue(body: Record<string, unknown>, key: string, allowed: string[]): string {
  const value = body[key];
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new HttpError(400, `Feld ${key} muss einer dieser Werte sein: ${allowed.join(", ")}`);
  }
  return value;
}

function timeValue(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new HttpError(400, `Feld ${key} muss eine Uhrzeit im Format HH:MM sein`);
  }
  return value;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
