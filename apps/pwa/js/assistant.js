import { Agent, AnthropicProvider, Coach } from "@daevo/coach";
import {
  buildDailyReminders,
  currentStreak,
  energyBreakdown,
  macroTargets,
  remainingBudget,
  scoreDay,
  waterTargetMl,
} from "@daevo/core";
import { brain } from "./brain.js";
import { newId, nowTime, store, todayIso } from "./storage.js";

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function provider() {
  const settings = store.getSettings();
  return new AnthropicProvider({
    apiKey: settings.apiKey || undefined,
    model: settings.model || "claude-opus-5",
    browserAccess: true,
    timeoutMs: 60000,
  });
}

/* ---------- Zahlen des Tages ---------- */

export function dayNumbers(day = todayIso()) {
  const profile = store.getProfile();
  const weekday = new Date(`${day}T12:00:00`).getDay();
  const trainingMinutes = (profile.sessions || [])
    .filter((s) => s.weekday === weekday)
    .reduce((sum, s) => sum + s.minutes, 0);
  const targets = { ...macroTargets(profile), waterMl: waterTargetMl(profile, trainingMinutes) };

  const data = store.getDay(day);
  const totals = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, waterMl: data.waterMl || 0 };
  for (const meal of data.meals) {
    for (const entry of meal.entries) {
      totals.kcal += entry.kcal;
      totals.proteinG += entry.proteinG;
      totals.fatG += entry.fatG;
      totals.carbsG += entry.carbsG;
    }
  }
  for (const key of ["kcal", "proteinG", "fatG", "carbsG"]) totals[key] = Math.round(totals[key]);

  return {
    day,
    weekday,
    trainingMinutes,
    profile,
    targets,
    totals,
    data,
    rest: remainingBudget(totals, targets),
    score: scoreDay(totals, targets),
    streak: currentStreak({
      daysWithLog: store.allDays().filter((d) => store.getDay(d).meals.length > 0),
      today: day,
    }),
  };
}

function daySummaryText(n) {
  const sessions = (n.profile.sessions || []).filter((s) => s.weekday === n.weekday);
  const training = sessions.length
    ? sessions.map((s) => `${s.startsAt} Uhr, ${s.minutes} Minuten`).join(" und ")
    : "kein Training geplant";
  return [
    `Kalorien ${n.totals.kcal} von ${n.targets.kcal}, offen ${n.rest.kcal}.`,
    `Protein ${n.totals.proteinG} von ${n.targets.proteinG} g, offen ${n.rest.proteinG} g.`,
    `Fett ${n.totals.fatG} von ${n.targets.fatG} g, Kohlenhydrate ${n.totals.carbsG} von ${n.targets.carbsG} g.`,
    `Wasser ${n.totals.waterMl} von ${n.targets.waterMl} ml.`,
    `Mahlzeiten heute: ${n.data.meals.length}. Serie: ${n.streak} ${n.streak === 1 ? "Tag" : "Tage"}. Heute ${training}.`,
  ].join(" ");
}

function profileText(profile) {
  const energy = energyBreakdown(profile);
  const goal = { fat_loss: "Fett verlieren", maintain: "Gewicht halten", lean_bulk: "Muskeln aufbauen" }[profile.goal];
  return [
    `${profile.name || "Der Nutzer"}, ${profile.ageYears} Jahre, ${profile.heightCm} cm, ${profile.weightKg} kg.`,
    `Ziel: ${goal}. Geschaetzter Bedarf ${energy.tdeeKcal} kcal, Zielwert ${macroTargets(profile).kcal} kcal.`,
    `Etwa ${profile.dailySteps} Schritte am Tag. Steht gegen ${profile.wakeTime} auf, geht gegen ${profile.sleepTime} ins Bett.`,
  ].join(" ");
}

/* ---------- Was der Assistent tun darf ---------- */

export function buildActions({ onChange } = {}) {
  const changed = () => onChange?.();
  const coach = new Coach(provider());

  return {
    async mahlzeitErfassen(beschreibung) {
      const day = todayIso();
      const parsed = await coach.parseMeal(beschreibung);
      if (parsed.entries.length === 0) {
        return `Konnte nichts zuordnen. ${parsed.followUpQuestion || "Nenn mir bitte die Mengen."}`;
      }
      store.addMeal(day, {
        id: newId(),
        text: beschreibung,
        at: nowTime(),
        source: parsed.source,
        entries: parsed.entries,
        feeling: null,
      });
      changed();
      const kcal = Math.round(parsed.entries.reduce((s, e) => s + e.kcal, 0));
      const protein = Math.round(parsed.entries.reduce((s, e) => s + e.proteinG, 0));
      const posten = parsed.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
      const warnung = parsed.warnings.length ? ` ${parsed.warnings.join(" ")}` : "";
      const n = dayNumbers();
      return `Eingetragen: ${posten}. Zusammen ${kcal} kcal und ${protein} g Protein. ` +
        `Offen sind noch ${n.rest.kcal} kcal und ${Math.max(0, n.rest.proteinG)} g Protein.${warnung}`;
    },

    async wasserEintragen(ml) {
      const day = todayIso();
      store.addWater(day, ml);
      changed();
      const n = dayNumbers(day);
      return `${ml} ml eingetragen. Heute ${n.totals.waterMl} von ${n.targets.waterMl} ml.`;
    },

    async tagesstandAbrufen() {
      return daySummaryText(dayNumbers());
    },

    async mahlzeitVorschlagen(wunsch) {
      const n = dayNumbers();
      const suggestion = await coach.suggestMeal({
        fridge: store.getFridge(),
        targets: n.targets,
        consumed: n.data.meals.flatMap((m) => m.entries),
        waterMl: n.totals.waterMl,
      });
      const zutaten = suggestion.ingredients.map((i) => `${i.quantity} ${i.name}`).join(", ");
      return [
        suggestion.title,
        suggestion.reason,
        zutaten ? `Zutaten: ${zutaten}.` : "",
        suggestion.steps.join(" "),
        `Restbudget ${n.rest.kcal} kcal und ${n.rest.proteinG} g Protein.`,
        wunsch ? `Wunsch war: ${wunsch}.` : "",
      ].filter(Boolean).join(" ");
    },

    async checkinSpeichern({ energie, schlaf, stimmung, notiz }) {
      const day = todayIso();
      const hour = new Date().getHours();
      store.addCheckin(day, {
        kind: hour < 12 ? "morning" : hour >= 19 ? "evening" : "adhoc",
        at: nowTime(),
        note: notiz,
        energy: energie ?? null,
        sleepQuality: schlaf ?? null,
        mood: stimmung ?? null,
      });
      changed();
      return "Check-in gespeichert.";
    },

    async merken({ text, art, wichtigkeit, schlagworte }) {
      const result = brain.add({ text, art, wichtigkeit, schlagworte, quelle: "coach" });
      changed();
      if (result.action === "verworfen") return "Zu wenig Inhalt, nicht gespeichert.";
      return result.action === "aktualisiert"
        ? "Wusste ich schon, ich habe die Notiz aufgefrischt."
        : "Habe ich mir gemerkt.";
    },

    async gedaechtnisDurchsuchen(frage) {
      const hits = brain.search(frage, 6);
      if (hits.length === 0) return "Dazu habe ich nichts notiert.";
      return hits.map((h) => `- ${h.entry.text} (${h.entry.at.slice(0, 10)})`).join("\n");
    },
  };
}

/* ---------- Gespraech ---------- */

export async function ask(nachricht, { onChange } = {}) {
  const agent = new Agent(provider());
  const n = dayNumbers();
  const now = new Date();

  const reply = await agent.respond({
    nachricht,
    verlauf: store.getChat().slice(-12).map((m) => ({ role: m.role, content: m.text })),
    kontext: {
      profil: profileText(n.profile),
      tag: daySummaryText(n),
      gedaechtnis: brain.contextFor(nachricht),
      zeit: `${WEEKDAYS[now.getDay()]}, ${now.getDate()}. ${now.toLocaleString("de-DE", { month: "long" })}, ${nowTime()} Uhr.`,
    },
    aktionen: buildActions({ onChange }),
  });

  const chat = store.getChat();
  chat.push({ role: "user", text: nachricht, at: new Date().toISOString() });
  chat.push({ role: "assistant", text: reply.text, at: new Date().toISOString(), ausgefuehrt: reply.ausgefuehrt });
  store.setChat(chat);
  return reply;
}

/**
 * Begruessung beim Oeffnen der App.
 *
 * Bewusst ohne Modellaufruf. Wer die App oeffnet, soll sofort etwas sehen und
 * nicht auf eine Antwort warten, die Geld kostet.
 */
export function greeting() {
  const n = dayNumbers();
  const hour = new Date().getHours();
  const name = n.profile.name ? `, ${n.profile.name}` : "";
  const gruss = hour < 11 ? `Guten Morgen${name}` : hour < 18 ? `Hallo${name}` : `Guten Abend${name}`;

  if (n.data.meals.length === 0) {
    return `${gruss}. Noch nichts eingetragen heute. Sag mir, was du gegessen hast, oder frag mich was.`;
  }
  if (n.rest.kcal < 0) {
    return `${gruss}. Du bist ${Math.abs(n.rest.kcal)} kcal ueber deinem Ziel. Kein Drama, aber gut zu wissen.`;
  }
  return `${gruss}. Du hast noch ${n.rest.kcal} kcal und ${Math.max(0, n.rest.proteinG)} g Protein offen.`;
}

/**
 * Empfehlungen aus den eigenen Daten, ohne Modell.
 *
 * Jede Regel nennt die Zahl, auf der sie beruht. Ein Hinweis ohne Zahl ist
 * geraten und gehoert nicht in eine Coaching App.
 */
export function recommendations() {
  const n = dayNumbers();
  const out = [];
  const now = new Date();

  if (n.rest.proteinG > 40 && now.getHours() >= 17) {
    out.push({
      titel: "Protein nachlegen",
      text: `Dir fehlen noch ${n.rest.proteinG} g Protein und der Tag ist fast rum. 250 g Magerquark bringen 30 g.`,
      grund: `Ziel ${n.targets.proteinG} g, bisher ${n.totals.proteinG} g.`,
    });
  }
  if (n.targets.waterMl - n.totals.waterMl > 1000 && now.getHours() >= 15) {
    out.push({
      titel: "Trinken nachholen",
      text: `Dir fehlen ${n.targets.waterMl - n.totals.waterMl} ml. Zwei grosse Glaeser jetzt, dann liegst du wieder richtig.`,
      grund: `Ziel ${n.targets.waterMl} ml, bisher ${n.totals.waterMl} ml.`,
    });
  }
  if (n.data.meals.length === 0 && now.getHours() >= 14) {
    out.push({
      titel: "Noch nichts erfasst",
      text: "Ohne Eintraege kann ich nicht rechnen. Sag mir in einem Satz, was du heute hattest.",
      grund: "Null Mahlzeiten bis jetzt.",
    });
  }

  const letzteWoche = letzteTage(7);
  const schnitt = mittelwert(letzteWoche.map((d) => d.totals.kcal));
  if (letzteWoche.length >= 4) {
    const abweichung = Math.round(schnitt - n.targets.kcal);
    if (Math.abs(abweichung) > 250) {
      out.push({
        titel: abweichung > 0 ? "Du liegst ueber deinem Schnitt" : "Du liegst unter deinem Schnitt",
        text:
          abweichung > 0
            ? `Im Schnitt ${abweichung} kcal ueber dem Ziel. Bei Gewicht halten wandert das nach oben.`
            : `Im Schnitt ${Math.abs(abweichung)} kcal unter dem Ziel. Dauerhaft kostet das Kraft und Schlaf.`,
        grund: `Schnitt der letzten ${letzteWoche.length} Tage: ${Math.round(schnitt)} kcal.`,
      });
    }
  }

  const energien = letzteWoche.flatMap((d) => d.data.checkins.map((c) => c.energy).filter((e) => typeof e === "number"));
  if (energien.length >= 3 && mittelwert(energien) < 5) {
    out.push({
      titel: "Deine Energie ist unten",
      text: "Drei oder mehr Check-ins unter fuenf. Das ist ein Muster, kein Ausrutscher. Schlaf und Essenszeiten zuerst.",
      grund: `Schnitt der Energie: ${mittelwert(energien).toFixed(1)} von 10.`,
    });
  }

  if (out.length === 0) {
    out.push({
      titel: "Nichts Auffaelliges",
      text: "Deine Zahlen liegen im Rahmen. Weiter so, ich melde mich, wenn sich etwas dreht.",
      grund: `Tagesscore ${n.score.total} von 100.`,
    });
  }
  return out;
}

function letzteTage(anzahl) {
  const heute = todayIso();
  const out = [];
  for (let i = 0; i < anzahl; i++) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const data = store.getDay(iso);
    if (data.meals.length > 0 || data.checkins.length > 0) out.push(dayNumbers(iso));
  }
  return out;
}

function mittelwert(werte) {
  if (werte.length === 0) return 0;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}

export { buildDailyReminders, daySummaryText, profileText };
