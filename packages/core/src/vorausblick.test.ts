import { test } from "node:test";
import assert from "node:assert/strict";
import { tagesablauf } from "./tagesablauf.js";
import { vorausblick, vorausblickText, vorausblickUhrzeit } from "./vorausblick.js";
import type { Termin } from "./ical.js";
import type { MacroTargets, UserProfile } from "./types.js";

// Montag. Krafttraining montags um 18:15, Volleyball montags um 19:30.
const TAG = "2026-09-07";
const PROFIL: UserProfile = {
  sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000,
  sessions: [{ type: "strength", minutes: 60, weekday: 1, startsAt: "18:15" }],
  wakeTime: "07:00", sleepTime: "23:00",
};
const ZIELE: MacroTargets = { kcal: 3000, proteinG: 180, fatG: 90, carbsG: 340, waterMl: 3500 };

function t(von: string, bis: string, titel: string): Termin {
  return { uid: `${titel}-${von}`, titel, ort: "", von: new Date(`${TAG}T${von}:00`).getTime(), bis: new Date(`${TAG}T${bis}:00`).getTime(), ganztags: false };
}

function blick(termine: Termin[], profile = PROFIL) {
  const morgen = tagesablauf({ tag: TAG, termine, profile, ziele: ZIELE });
  return vorausblick({ morgen, termine, profile });
}

test("ein ruhiger Tag bringt keine Meldung, ein leerer auch nicht", () => {
  assert.equal(blick([]), null);
  assert.equal(blick([t("09:00", "10:00", "Kunde"), t("15:00", "16:00", "Kunde")]), null);
});

test("keine Mittagslücke: heute eine Portion mehr kochen", () => {
  const v = blick([t("07:30", "17:30", "Kunden am Stück")]);
  assert.ok(v);
  const vorkochen = v.punkte.find((p) => p.art === "vorkochen");
  assert.match(vorkochen!.text, /zwischen 11 und 15 Uhr keine 20 Minuten frei/);
  assert.equal(v.titel, "Für morgen vorkochen");
  // Ein voller Tag steht als Einleitung davor, mit gerechneten Zahlen.
  assert.equal(v.punkte[0]!.art, "voll");
  assert.match(v.punkte[0]!.text, /10 Stunden von 16 Stunden/);
});

test("weder mittags noch abends Platz: doppelt kochen", () => {
  const v = blick([t("08:00", "21:30", "Messe")]);
  assert.match(vorausblickText(v), /doppelt/);
});

test("das Training aus dem Profil liegt auf einem Termin: Ausweichplatz am selben Tag", () => {
  const v = blick([t("18:00", "19:00", "Kunde Müller")]);
  const tr = v!.punkte.find((p) => p.art === "training")!;
  assert.match(tr.text, /Krafttraining um 18:15 liegt morgen auf „Kunde Müller“/);
  // 15 Minuten Luft nach dem Kunden, Raster Viertelstunde: 19:15 bis 20:15.
  assert.match(tr.text, /Frei wäre 19:15 bis 20:15/);
});

test("kein Platz für die volle Einheit: eine halbe Stunde, sonst ein anderer Tag", () => {
  const voll = [t("07:00", "12:00", "A"), t("12:30", "18:00", "B"), t("18:15", "21:00", "C")];
  const v = blick(voll);
  assert.match(vorausblickText(v), /Für 30 Minuten wäre 12:30|kein Platz/);
  const ganz = blick([t("07:00", "22:00", "Lehrgang")]);
  assert.match(vorausblickText(ganz), /auch keine halbe Stunde/);
});

test("Mannschaftstraining und Training im Kalender werden nicht verschoben", () => {
  const profil = { ...PROFIL, sessions: [{ type: "team_sport" as const, minutes: 100, weekday: 1, startsAt: "19:30" }] };
  assert.equal(blick([t("19:00", "20:00", "Kunde")], profil)?.punkte.some((p) => p.art === "training") ?? false, false);
  // Steht ein Krafttraining im Kalender, gilt das und nicht das Profil.
  const v = blick([t("18:00", "19:00", "Krafttraining")]);
  assert.equal(v?.punkte.some((p) => p.art === "training") ?? false, false);
});

test("früher Start: Frühstück am Abend vorher bereitlegen", () => {
  assert.match(vorausblickText(blick([t("07:30", "08:30", "Frühkunde")])), /07:30, eine Stunde nach dem Aufstehen/);
  assert.match(vorausblickText(blick([t("06:15", "07:00", "Frühkunde")])), /vor deiner Aufstehzeit 07:00/);
});

test("die Mitteilung kommt um 20 Uhr, spätestens 90 Minuten vor dem Schlafen", () => {
  assert.equal(vorausblickUhrzeit(PROFIL, TAG), "20:00");
  assert.equal(vorausblickUhrzeit({ ...PROFIL, sleepTime: "21:00" }, TAG), "19:30");
  assert.equal(vorausblickUhrzeit({ ...PROFIL, sleepTime: "01:00" }, TAG), "20:00");
});
