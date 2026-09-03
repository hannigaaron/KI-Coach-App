import { randomUUID } from "node:crypto";
import type { FoodEntry, TrainingSession, UserProfile } from "@kicoach/core";
import type { Db } from "./db.js";

export interface ProfileRow {
  sex: string;
  age_years: number;
  height_cm: number;
  weight_kg: number;
  goal: string;
  daily_steps: number;
  wake_time: string;
  sleep_time: string;
  tdee_override_kcal: number | null;
  sessions_json: string;
}

export function toProfile(row: ProfileRow): UserProfile {
  return {
    sex: row.sex as UserProfile["sex"],
    ageYears: row.age_years,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    goal: row.goal as UserProfile["goal"],
    dailySteps: row.daily_steps,
    wakeTime: row.wake_time,
    sleepTime: row.sleep_time,
    tdeeOverrideKcal: row.tdee_override_kcal,
    sessions: JSON.parse(row.sessions_json) as TrainingSession[],
  };
}

export function getProfile(db: Db, userId: string): UserProfile | null {
  const row = db
    .prepare(
      `SELECT sex, age_years, height_cm, weight_kg, goal, daily_steps, wake_time, sleep_time,
              tdee_override_kcal, sessions_json
       FROM profiles WHERE user_id = ?`,
    )
    .get(userId) as ProfileRow | undefined;
  return row ? toProfile(row) : null;
}

export function saveProfile(db: Db, userId: string, profile: UserProfile): void {
  db.prepare(
    `INSERT INTO profiles (user_id, sex, age_years, height_cm, weight_kg, goal, daily_steps,
                           wake_time, sleep_time, tdee_override_kcal, sessions_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       sex = excluded.sex, age_years = excluded.age_years, height_cm = excluded.height_cm,
       weight_kg = excluded.weight_kg, goal = excluded.goal, daily_steps = excluded.daily_steps,
       wake_time = excluded.wake_time, sleep_time = excluded.sleep_time,
       tdee_override_kcal = excluded.tdee_override_kcal, sessions_json = excluded.sessions_json,
       updated_at = excluded.updated_at`,
  ).run(
    userId,
    profile.sex,
    profile.ageYears,
    profile.heightCm,
    profile.weightKg,
    profile.goal,
    profile.dailySteps,
    profile.wakeTime,
    profile.sleepTime,
    profile.tdeeOverrideKcal ?? null,
    JSON.stringify(profile.sessions),
    new Date().toISOString(),
  );
}

export interface MealRow {
  id: string;
  day: string;
  logged_at: string;
  raw_text: string;
  source: string;
  entries_json: string;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  feeling: string | null;
}

export function insertMeal(
  db: Db,
  params: { userId: string; day: string; text: string; source: string; entries: FoodEntry[] },
): string {
  const id = randomUUID();
  const totals = params.entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      proteinG: acc.proteinG + e.proteinG,
      fatG: acc.fatG + e.fatG,
      carbsG: acc.carbsG + e.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  );
  db.prepare(
    `INSERT INTO meals (id, user_id, day, logged_at, raw_text, source, entries_json, kcal, protein_g, fat_g, carbs_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    params.userId,
    params.day,
    new Date().toISOString(),
    params.text,
    params.source,
    JSON.stringify(params.entries),
    totals.kcal,
    totals.proteinG,
    totals.fatG,
    totals.carbsG,
  );
  return id;
}

export function getMeals(db: Db, userId: string, day: string): MealRow[] {
  return db
    .prepare(
      `SELECT id, day, logged_at, raw_text, source, entries_json, kcal, protein_g, fat_g, carbs_g, feeling
       FROM meals WHERE user_id = ? AND day = ? ORDER BY logged_at ASC`,
    )
    .all(userId, day) as unknown as MealRow[];
}

export function getWaterMl(db: Db, userId: string, day: string): number {
  const row = db
    .prepare("SELECT COALESCE(SUM(ml), 0) AS total FROM water_log WHERE user_id = ? AND day = ?")
    .get(userId, day) as { total: number };
  return row.total;
}

export function addWater(db: Db, userId: string, day: string, ml: number): void {
  db.prepare("INSERT INTO water_log (id, user_id, day, ml, logged_at) VALUES (?, ?, ?, ?, ?)").run(
    randomUUID(),
    userId,
    day,
    ml,
    new Date().toISOString(),
  );
}

export function getFridge(db: Db, userId: string): string[] {
  const rows = db
    .prepare("SELECT name FROM fridge_items WHERE user_id = ? ORDER BY name")
    .all(userId) as Array<{ name: string }>;
  return rows.map((r) => r.name);
}

export function replaceFridge(db: Db, userId: string, items: string[]): void {
  db.prepare("DELETE FROM fridge_items WHERE user_id = ?").run(userId);
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO fridge_items (id, user_id, name, updated_at) VALUES (?, ?, ?, ?)",
  );
  const now = new Date().toISOString();
  for (const item of items) stmt.run(randomUUID(), userId, item, now);
}

export function daysWithLog(db: Db, userId: string, limit = 400): string[] {
  const rows = db
    .prepare("SELECT DISTINCT day FROM meals WHERE user_id = ? ORDER BY day DESC LIMIT ?")
    .all(userId, limit) as Array<{ day: string }>;
  return rows.map((r) => r.day);
}
