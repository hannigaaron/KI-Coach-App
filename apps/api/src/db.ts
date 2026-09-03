import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Db = DatabaseSync;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex TEXT NOT NULL,
  age_years INTEGER NOT NULL,
  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  goal TEXT NOT NULL,
  daily_steps INTEGER NOT NULL,
  wake_time TEXT NOT NULL,
  sleep_time TEXT NOT NULL,
  tdee_override_kcal INTEGER,
  sessions_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  logged_at TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  source TEXT NOT NULL,
  entries_json TEXT NOT NULL,
  kcal REAL NOT NULL,
  protein_g REAL NOT NULL,
  fat_g REAL NOT NULL,
  carbs_g REAL NOT NULL,
  feeling TEXT
);
CREATE INDEX IF NOT EXISTS idx_meals_user_day ON meals(user_id, day);

CREATE TABLE IF NOT EXISTS water_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  ml INTEGER NOT NULL,
  logged_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_water_user_day ON water_log(user_id, day);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  energy INTEGER,
  mood INTEGER,
  sleep_quality INTEGER,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checkins_user_day ON checkins(user_id, day);

CREATE TABLE IF NOT EXISTS health_samples (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  steps INTEGER,
  resting_hr INTEGER,
  sleep_minutes INTEGER,
  weight_kg REAL,
  active_kcal INTEGER,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, day, source)
);

CREATE TABLE IF NOT EXISTS fridge_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  push_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, push_token)
);

CREATE TABLE IF NOT EXISTS reminder_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  kind TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  sent_at TEXT,
  UNIQUE(user_id, day, kind, scheduled_at)
);
`;

export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}
