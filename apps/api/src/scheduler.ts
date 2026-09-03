import { randomUUID } from "node:crypto";
import { buildDailyReminders, waterTargetMl } from "@kicoach/core";
import type { Coach } from "@kicoach/coach";
import type { Db } from "./db.js";
import { getMeals, getProfile, getWaterMl } from "./store.js";
import type { Notifier } from "./notifier.js";
import { today, weekdayOf } from "./http.js";

export interface SchedulerDeps {
  db: Db;
  coach: Coach;
  notifier: Notifier;
  /** Aktuelle lokale Uhrzeit HH:MM. Fuer Tests injizierbar. */
  clock?: () => { day: string; time: string };
}

/**
 * Prueft einmal pro Aufruf, welche Erinnerungen faellig sind, und verschickt sie.
 *
 * Eine Erinnerung gilt als faellig, wenn ihre Uhrzeit erreicht oder bis zu
 * 15 Minuten ueberschritten ist und sie an diesem Tag noch nicht raus ist.
 * Die Sperre laeuft ueber den UNIQUE Index auf reminder_log.
 */
export async function runSchedulerTick(deps: SchedulerDeps): Promise<number> {
  const clock = deps.clock ?? defaultClock;
  const { day, time } = clock();
  const users = deps.db.prepare("SELECT user_id FROM profiles").all() as Array<{ user_id: string }>;
  let sent = 0;

  for (const { user_id: userId } of users) {
    const profile = getProfile(deps.db, userId);
    if (!profile) continue;

    const trainingMinutes = profile.sessions
      .filter((s) => s.weekday === weekdayOf(day))
      .reduce((sum, s) => sum + s.minutes, 0);
    const checkins = deps.db
      .prepare("SELECT kind FROM checkins WHERE user_id = ? AND day = ?")
      .all(userId, day) as Array<{ kind: string }>;

    const reminders = buildDailyReminders({
      profile,
      weekday: weekdayOf(day),
      state: {
        mealsLogged: getMeals(deps.db, userId, day).length,
        waterMl: getWaterMl(deps.db, userId, day),
        waterTargetMl: waterTargetMl(profile, trainingMinutes),
        morningCheckinDone: checkins.some((c) => c.kind === "morning"),
        eveningReviewDone: checkins.some((c) => c.kind === "evening"),
      },
    });

    for (const reminder of reminders) {
      if (!isDue(reminder.at, time)) continue;
      const claimed = claim(deps.db, userId, day, reminder.kind, reminder.at);
      if (!claimed) continue;

      const body = await deps.coach.checkInMessage({
        reminderKind: reminder.kind,
        fallback: reminder.body,
        context: `Datum ${day}, Uhrzeit ${time}`,
      });
      const tokens = deps.db
        .prepare("SELECT push_token FROM devices WHERE user_id = ?")
        .all(userId) as Array<{ push_token: string }>;
      await deps.notifier.send(
        { userId, title: reminder.title, body, kind: reminder.kind },
        tokens.map((t) => t.push_token),
      );
      deps.db
        .prepare("UPDATE reminder_log SET sent_at = ? WHERE user_id = ? AND day = ? AND kind = ? AND scheduled_at = ?")
        .run(new Date().toISOString(), userId, day, reminder.kind, reminder.at);
      sent++;
    }
  }
  return sent;
}

const GRACE_MINUTES = 15;

function isDue(scheduledAt: string, nowTime: string): boolean {
  const diff = toMinutes(nowTime) - toMinutes(scheduledAt);
  return diff >= 0 && diff <= GRACE_MINUTES;
}

/** Legt den Log Eintrag an. Gibt false zurueck, wenn er schon existiert. */
function claim(db: Db, userId: string, day: string, kind: string, scheduledAt: string): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO reminder_log (id, user_id, day, kind, scheduled_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), userId, day, kind, scheduledAt);
  return result.changes > 0;
}

function toMinutes(hhmm: string): number {
  const parts = hhmm.split(":");
  return Number(parts[0] ?? 0) * 60 + Number(parts[1] ?? 0);
}

function defaultClock(): { day: string; time: string } {
  const time = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return { day: today(), time };
}
