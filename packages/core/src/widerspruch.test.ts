import { test } from "node:test";
import assert from "node:assert/strict";
import { widersprueche, widerspruchText, type WiderspruchEingabe } from "./widerspruch.js";
import type { Aufgabe } from "./aufgaben.js";
import type { MacroTargets, UserProfile } from "./types.js";

const HEUTE = "2026-09-07";

const PROFIL: UserProfile = {
  sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain",
  dailySteps: 12000, sessions: [], wakeTime: "07:00", sleepTime: "23:00",
};

const ZIELE: MacroTargets = { kcal: 3000, proteinG: 180, fatG: 90, carbsG: 340, waterMl: 3500 };

function tage(anzahl: number, teile: Partial<WiderspruchEingabe["tage"][number]> = {}) {
  return Array.from({ length: anzahl }, (_, i) => {
    const d = new Date(2026, 7, 10 + i);
    return {
      tag: d.toISOString().slice(0, 10),
      kcal: 3000, proteinG: 180, mahlzeiten: 3, trainings: 0, terminMinuten: 300,
      ...teile,
    };
  });
}

function basis(teile: Partial<WiderspruchEingabe> = {}): WiderspruchEingabe {
  return { profile: PROFIL, ziele: ZIELE, tage: tage(28), aufgaben: [], heute: HEUTE, ...teile };
}

test("wer seine Ziele trifft, bekommt keinen Widerspruch vorgehalten", () => {
  assert.deepEqual(widersprueche(basis()), []);
});

test("zu wenig Protein wird mit beiden Zahlen benannt", () => {
  const w = widersprueche(basis({ tage: tage(28, { proteinG: 120 }) }));
  const protein = w.find((x) => x.thema === "Protein");
  assert.ok(protein);
  assert.ok(protein!.anspruch.includes("180 g"));
  assert.ok(protein!.wirklichkeit.includes("120 g"));
  assert.ok(protein!.frage.includes("oder ist das Ziel zu hoch"));
});

test("eine Abweichung innerhalb der Toleranz wird nicht gemeldet", () => {
  // 165 g gegen 180 g Ziel sind 8 Prozent, unter der Toleranz von 15.
  const w = widersprueche(basis({ tage: tage(28, { proteinG: 165 }) }));
  assert.equal(w.some((x) => x.thema === "Protein"), false);
});

test("eine schlechte Erfassungsquote steht ganz oben", () => {
  const gemischt = tage(28).map((t, i) => (i % 3 === 0 ? t : { ...t, mahlzeiten: 0, kcal: null, proteinG: null }));
  const w = widersprueche(basis({ tage: gemischt }));
  const erfassung = w.find((x) => x.thema === "Erfassung");
  assert.ok(erfassung);
  assert.ok(erfassung!.wirklichkeit.includes("Prozent"));
});

test("ausgefallenes Training wird an der Zahl im Profil gemessen", () => {
  const profile = {
    ...PROFIL,
    sessions: [
      { type: "strength" as const, minutes: 75, weekday: 1, startsAt: "17:00" },
      { type: "strength" as const, minutes: 75, weekday: 3, startsAt: "17:00" },
      { type: "team_sport" as const, minutes: 120, weekday: 5, startsAt: "19:00" },
    ],
  };
  const w = widersprueche(basis({ profile, tage: tage(28, { trainings: 0 }) }));
  const training = w.find((x) => x.thema === "Training");
  assert.ok(training);
  assert.ok(training!.frage.includes("Trägst du sie nur nicht ein"));
});

test("eine wichtige Aufgabe, die seit Wochen liegt, wird angesprochen", () => {
  const alt: Aufgabe = {
    id: "1", text: "Franchise Konzept schreiben", minuten: 180, wichtigkeit: 3,
    erledigt: false, erstellt: "2026-08-01T09:00:00.000Z", faellig: null,
  };
  const w = widersprueche(basis({ aufgaben: [alt] }));
  const geschoben = w.find((x) => x.thema === "Geschobenes");
  assert.ok(geschoben);
  assert.ok(geschoben!.wirklichkeit.includes("37 Tagen"));
  assert.ok(geschoben!.frage.includes("war nicht wichtig"));
});

test("eine frische wichtige Aufgabe ist kein Widerspruch", () => {
  const frisch: Aufgabe = {
    id: "1", text: "Angebot schreiben", minuten: 45, wichtigkeit: 3,
    erledigt: false, erstellt: "2026-09-06T09:00:00.000Z", faellig: null,
  };
  assert.equal(widersprueche(basis({ aufgaben: [frisch] })).some((x) => x.thema === "Geschobenes"), false);
});

test("die Zeitverteilung vergleicht Kundenarbeit mit Aufbau", () => {
  const w = widersprueche(basis({
    terminTitel: [
      { titel: "Kunde Anna", minuten: 1200 },
      { titel: "Kundin Lisa", minuten: 1200 },
      { titel: "Content drehen", minuten: 60 },
    ],
  }));
  const zeit = w.find((x) => x.thema === "Zeitverteilung");
  assert.ok(zeit);
  assert.ok(zeit!.wirklichkeit.includes("40 Stunden"));
  assert.ok(zeit!.wirklichkeit.includes("1 Stunde"));
});

test("genug Aufbauzeit erzeugt keinen Widerspruch", () => {
  const w = widersprueche(basis({
    terminTitel: [
      { titel: "Kunde Anna", minuten: 1200 },
      { titel: "Content drehen", minuten: 600 },
    ],
  }));
  assert.equal(w.some((x) => x.thema === "Zeitverteilung"), false);
});

test("ein voller Kalender wird gegen die eigene Schlafenszeit gehalten", () => {
  const w = widersprueche(basis({ tage: tage(28, { terminMinuten: 600 }) }));
  const auslastung = w.find((x) => x.thema === "Auslastung");
  assert.ok(auslastung);
  assert.ok(auslastung!.anspruch.includes("23:00"));
});

test("ohne Daten wird nichts behauptet", () => {
  assert.deepEqual(widersprueche(basis({ tage: [] })), []);
});

test("der Text sagt es auch, wenn nichts gefunden wurde", () => {
  assert.ok(widerspruchText([]).includes("keinen Widerspruch"));
});
