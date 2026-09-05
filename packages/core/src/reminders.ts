import type { UserProfile } from "./types.js";

export type ReminderKind =
  | "morning_checkin"
  | "hydration"
  | "meal_log"
  | "midday_meal"
  | "midday_challenge"
  | "midday_priorities"
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
  /** Der Mittags Check-in ist schon beantwortet. */
  middayCheckinDone?: boolean;
  /** Die Frage nach der Herausforderung ist schon beantwortet. */
  middayChallengeDone?: boolean;
  /** Offene Aufgaben. Ohne offene Aufgaben gibt es nichts zu priorisieren. */
  offeneAufgaben?: number;
  /**
   * Der Mindeststandard, bei dem Nachhaken gerade am meisten bringt.
   * Kommt aus standardZumNachhaken. Ohne Wert wird nicht nachgehakt.
   */
  standardHinweis?: { id: string; frage: string } | null;
}

const MAX_REMINDERS_PER_DAY = 8;

/**
 * Die drei festen Punkte am Nachmittag.
 *
 * 14:00, weil ein Einbruch nach dem Mittagessen dann da ist und der Tag noch
 * zu drehen ist. 14:30 für die Herausforderung, damit zwei Fragen nicht in
 * einer Nachricht stehen. 15:00 für die Prioritäten, weil eine Entscheidung
 * über den Rest des Tages vor dem letzten Drittel fallen muss und nicht um 18
 * Uhr, wenn nichts mehr geht.
 */
const MITTAG_ESSEN = 14 * 60;
const MITTAG_HERAUSFORDERUNG = 14 * 60 + 30;
const MITTAG_PRIORITAETEN = 15 * 60;

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

  // Der Mittagsblock. Diese drei sind der Kern des Tagescoachings und stehen
  // deshalb oben in der Rangfolge: sie ändern noch etwas am laufenden Tag.
  if (!state.middayCheckinDone && MITTAG_ESSEN > wake + 60 && MITTAG_ESSEN < sleep - 120) {
    out.push({
      kind: "midday_meal",
      at: formatTime(MITTAG_ESSEN),
      title: "Kurz nach dem Mittag",
      body: "Was gab es zu essen, und wie sind Energie, Konzentration und Sättigung von 1 bis 10?",
      priority: 95,
    });
  }

  if (!state.middayChallengeDone && MITTAG_HERAUSFORDERUNG < sleep - 120) {
    out.push({
      kind: "midday_challenge",
      at: formatTime(MITTAG_HERAUSFORDERUNG),
      title: "Was war bisher das Schwierigste",
      body: "Sag mir die grösste Herausforderung von heute. Ich sag dir, was ich dagegen machen würde.",
      priority: 88,
    });
  }

  if ((state.offeneAufgaben ?? 0) > 0 && MITTAG_PRIORITAETEN < sleep - 90) {
    out.push({
      kind: "midday_priorities",
      at: formatTime(MITTAG_PRIORITAETEN),
      title: "Der Rest des Tages",
      body: `${state.offeneAufgaben} offene Aufgaben. Ich sortiere sie und sage dir, was bis morgen warten kann.`,
      priority: 92,
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
