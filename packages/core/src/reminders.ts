import type { UserProfile } from "./types.js";

export type ReminderKind =
  | "morning_checkin"
  | "hydration"
  | "meal_log"
  | "pre_training"
  | "post_training"
  | "evening_review"
  | "wind_down"
  | "shopping"
  | "standards_check";

export interface Reminder {
  kind: ReminderKind;
  /** Lokale Uhrzeit HH:MM. */
  at: string;
  title: string;
  body: string;
  /** Höhere Zahl bedeutet wichtiger. Wird zum Ausdünnen genutzt. */
  priority: number;
}

export interface DayState {
  /** Anzahl bereits geloggter Mahlzeiten. */
  mealsLogged: number;
  /** Bereits getrunkene Menge in ml. */
  waterMl: number;
  /** Zielmenge in ml. */
  waterTargetMl: number;
  /** Morgen Check-in schon beantwortet. */
  morningCheckinDone: boolean;
  /** Abend Review schon beantwortet. */
  eveningReviewDone: boolean;
  /** Offene Posten auf der Einkaufsliste. Ohne Liste 0. */
  offeneEinkaeufe?: number;
  /**
   * Der Mindeststandard, bei dem Nachhaken gerade am meisten bringt.
   * Kommt aus standardZumNachhaken. Ohne Wert wird nicht nachgehakt.
   */
  standardHinweis?: { id: string; frage: string } | null;
}

const MAX_REMINDERS_PER_DAY = 6;

/**
 * Erzeugt den Erinnerungsplan für einen Tag.
 *
 * Regeln:
 * - Es gibt nie mehr als sechs Push Nachrichten pro Tag. Mehr führt zu
 *   Benachrichtigungsblindheit und Deinstallation.
 * - Erledigte Aufgaben erzeugen keine Erinnerung mehr.
 * - Trainingsbezogene Erinnerungen hängen am Kalender des Nutzers.
 */
export function buildDailyReminders(params: {
  profile: UserProfile;
  weekday: number;
  state: DayState;
}): Reminder[] {
  const { profile, weekday, state } = params;
  const out: Reminder[] = [];
  const wake = parseTime(profile.wakeTime);
  const sleep = parseTime(profile.sleepTime);

  if (!state.morningCheckinDone) {
    out.push({
      kind: "morning_checkin",
      at: formatTime(wake + 30),
      title: "Kurzer Check-in",
      body: "Wie hast du geschlafen und wie ist deine Energie von 1 bis 10?",
      priority: 80,
    });
  }

  const waterGap = state.waterTargetMl - state.waterMl;
  if (waterGap > 400) {
    const slots = waterGap > 1500 ? 2 : 1;
    for (let i = 0; i < slots; i++) {
      const at = wake + 5 * 60 + i * 4 * 60;
      if (at < sleep - 60) {
        out.push({
          kind: "hydration",
          at: formatTime(at),
          title: i === 0 ? "Trinken" : "Nachlegen",
          body:
            i === 0
              ? `Dir fehlen noch etwa ${waterGap} ml bis zu deinem Tagesziel.`
              : "Zweite Flasche. Danach bist du für heute durch.",
          priority: 40,
        });
      }
    }
  }

  if (state.mealsLogged < 2) {
    out.push({
      kind: "meal_log",
      at: formatTime(clampMinutes(13 * 60, wake + 120, sleep - 120)),
      title: "Was gab es heute zu essen?",
      body: "Sag es mir einfach per Sprachnachricht. Ich rechne es aus.",
      priority: 70,
    });
  }

  for (const session of profile.sessions.filter((s) => s.weekday === weekday)) {
    const start = parseTime(session.startsAt);
    out.push({
      kind: "pre_training",
      at: formatTime(start - 90),
      title: "Training in 90 Minuten",
      body: "Letzte Mahlzeit sollte jetzt sitzen. Trinkflasche gefüllt?",
      priority: 90,
    });
    out.push({
      kind: "post_training",
      at: formatTime(start + session.minutes + 30),
      title: "Nach dem Training",
      body: "Wie lief die Einheit und was hast du danach gegessen?",
      priority: 85,
    });
  }

  if (!state.eveningReviewDone) {
    out.push({
      kind: "evening_review",
      at: formatTime(sleep - 120),
      title: "Tagesabschluss",
      body: "Zwei Fragen: Wie war der Tag und was nimmst du dir für morgen vor?",
      priority: 75,
    });
  }

  // Einkaufen wird am Vorabend erinnert, nicht am Morgen. Wer morgens von
  // einer Liste liest, kauft trotzdem erst nach der Arbeit.
  if ((state.offeneEinkaeufe ?? 0) > 0) {
    out.push({
      kind: "shopping",
      at: formatTime(clampMinutes(17 * 60, wake + 240, sleep - 90)),
      title: "Einkaufen",
      body: `${state.offeneEinkaeufe} Posten stehen noch offen. Sag mir, was du davon noch zu Hause hast.`,
      priority: 55,
    });
  }

  // Nachhaken auf einen Mindeststandard. Nur einer pro Tag, sonst wird aus
  // der Untergrenze eine Nörgelei und die Nachricht wird weggewischt.
  if (state.standardHinweis) {
    out.push({
      kind: "standards_check",
      at: formatTime(clampMinutes(sleep - 180, wake + 300, sleep - 60)),
      title: "Dein Mindeststandard",
      body: state.standardHinweis.frage,
      priority: 78,
    });
  }

  out.push({
    kind: "wind_down",
    at: formatTime(sleep - 45),
    title: "Runterfahren",
    body: "Handy weg. Dein Schlaf entscheidet über die Energie von morgen.",
    priority: 30,
  });

  return out
    .filter((r) => withinDay(r.at))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_REMINDERS_PER_DAY)
    .sort((a, b) => a.at.localeCompare(b.at));
}

function parseTime(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error(`Ungültige Zeit: ${hhmm}`);
  return h * 60 + m;
}

function formatTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clampMinutes(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function withinDay(hhmm: string): boolean {
  return hhmm >= "05:00" && hhmm <= "23:30";
}
