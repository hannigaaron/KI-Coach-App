import { test } from "node:test";
import assert from "node:assert/strict";
import { tagesablauf } from "./tagesablauf.js";
import { tagesessen, trainingAusProfil } from "./tagesessen.js";
import { naechsterPunkt, tagesbriefing } from "./tagesbriefing.js";
import { vorausblick } from "./vorausblick.js";
import type { Termin } from "./ical.js";
import type { MacroTargets, UserProfile } from "./types.js";

const TAG = "2026-09-07"; // Montag
const PROFIL: UserProfile = {
  sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000,
  sessions: [{ type: "strength", minutes: 60, weekday: 1, startsAt: "18:15" }], wakeTime: "07:00", sleepTime: "23:00",
};
const ZIELE: MacroTargets = { kcal: 3000, proteinG: 175, fatG: 70, carbsG: 420, waterMl: 3500 };
const t = (von: string, bis: string, titel: string): Termin => ({ uid: titel + von, titel, ort: "", von: new Date(`${TAG}T${von}:00`).getTime(), bis: new Date(`${TAG}T${bis}:00`).getTime(), ganztags: false });
const ganz = (titel: string): Termin => ({ uid: titel, titel, ort: "", von: new Date(`${TAG}T00:00:00`).getTime(), bis: new Date(`${TAG}T23:59:00`).getTime(), ganztags: true });

function briefing(art: "morgen" | "abend", termine: Termin[], aufgaben: Array<{ text: string; um?: string; wichtig?: boolean }> = []) {
  const ablauf = tagesablauf({ tag: TAG, termine, profile: PROFIL, ziele: ZIELE });
  const essen = tagesessen({ ablauf, ziele: ZIELE, trainings: trainingAusProfil(PROFIL.sessions, TAG) });
  return tagesbriefing({
    art, datum: "Montag, 7. September", ablauf, essen,
    vorausblick: vorausblick({ morgen: ablauf, termine, profile: PROFIL, fuer: art === "morgen" ? "heute" : "morgen" }),
    training: { titel: "Krafttraining", um: "18:15", minuten: 60 }, aufgaben, ziele: ZIELE,
    heute: art === "abend" ? { kcal: 2100, zielKcal: 3000, proteinG: 120, zielProteinG: 175, erledigt: 2 } : undefined,
    standards: [],
  });
}

test("morgens: Tag, Fokus, Zu tun, Essen mit Rezepten", () => {
  const b = briefing("morgen", [t("09:00", "12:00", "Kunde Müller"), t("14:00", "16:00", "Athletiktraining")], [{ text: "Angebot schreiben", wichtig: true }]);
  const titel = b.abschnitte.map((a) => a.titel);
  assert.deepEqual(titel.slice(0, 2), ["Dein Tag", "Fokus"]);
  assert.ok(titel.includes("Zu tun") && titel.includes("Essen"));
  assert.match(b.abschnitte[1]!.zeilen[0]!, /Angebot schreiben/);
  assert.match(b.kurz, /2 Termine, der erste um 09:00/);
  const essen = b.abschnitte.find((a) => a.titel === "Essen")!;
  assert.ok(essen.zeilen.slice(1).every((z) => /^\d\d:\d\d .+: .+, \d+ kcal/.test(z)), essen.zeilen.join("\n"));
  assert.doesNotMatch(b.text, /—|–/);
});

test("abends: zuerst der heutige Stand, Protein fehlt wird gesagt", () => {
  const b = briefing("abend", [t("07:30", "08:00", "Kunde früh")]);
  assert.equal(b.abschnitte[0]!.titel, "Heute");
  assert.match(b.abschnitte[0]!.zeilen.join(" "), /fehlen noch 55 g/);
  assert.ok(b.abschnitte.some((a) => a.titel === "Heute Abend vorbereiten"));
  assert.match(b.kurz, /Frühstück und Tasche/);
});

test("doppelte Feiertage und Schlaftermine stehen nicht im Briefing", () => {
  const b = briefing("morgen", [ganz("Allerheiligen"), ganz("Allerheiligen"), t("10:00", "11:00", "Kunde"), t("22:30", "23:00", "SLEEP")]);
  const tag = b.abschnitte.find((a) => a.titel === "Dein Tag")!.zeilen.join("\n");
  assert.equal((tag.match(/Allerheiligen/g) ?? []).length, 1);
  assert.doesNotMatch(tag, /SLEEP/);
  assert.match(tag, /1 Termin,/);
});

test("ohne Kalender sagt das Briefing das", () => {
  const b = tagesbriefing({
    art: "morgen", datum: "Montag", ablauf: null, essen: null, vorausblick: null, training: null,
    aufgaben: [], ziele: ZIELE, standards: [],
  });
  assert.match(b.text, /Kein Kalender verbunden/);
  assert.ok(b.kurz.length > 0);
});

test("die Punkte stehen nach Uhrzeit, und das Nächste ist das erste, das noch nicht vorbei ist", () => {
  const b = briefing("morgen", [t("09:00", "12:00", "Kunde Müller")], [{ text: "Angebot schreiben", um: "13:30", wichtig: true }, { text: "Steuer" }]);
  const zeiten = b.punkte.map((p) => p.um);
  const mitZeit = zeiten.filter((z) => z !== null) as number[];
  assert.deepEqual(mitZeit, [...mitZeit].sort((a, c) => a - c));
  assert.equal(b.punkte[b.punkte.length - 1]!.titel, "Steuer");
  assert.ok(b.punkte.some((p) => p.art === "essen" && p.rezeptId));
  assert.ok(b.punkte.some((p) => p.art === "training"));
  const um10 = new Date(`${TAG}T10:00:00`).getTime();
  assert.equal(b.punkte[naechsterPunkt(b.punkte, um10)]!.titel, "Kunde Müller");
  const um13 = new Date(`${TAG}T13:20:00`).getTime();
  assert.notEqual(b.punkte[naechsterPunkt(b.punkte, um13)]!.titel, "Kunde Müller");
});

test("der Fokus sagt nur 'zuerst', wenn die Aufgabe wirklich als erste dran ist", () => {
  const spaeter = briefing("morgen", [t("12:30", "14:45", "Mittagessen")], [
    { text: "Slide schreiben", um: "11:00", wichtig: true },
    { text: "Denise antworten", um: "08:45" },
  ]);
  const fokus = spaeter.abschnitte.find((a) => a.titel === "Fokus")!.zeilen[0]!;
  assert.doesNotMatch(fokus, /zuerst/);
  assert.match(fokus, /Slide schreiben um 11:00\. Das ist heute das Wichtigste\./);
  const frueh = briefing("morgen", [], [{ text: "Slide schreiben", um: "08:45", wichtig: true }, { text: "Denise antworten", um: "11:00" }]);
  assert.match(frueh.abschnitte.find((a) => a.titel === "Fokus")!.zeilen[0]!, /eingeplant um 08:45\. Das zuerst/);
});
