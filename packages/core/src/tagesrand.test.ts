import { test } from "node:test";
import assert from "node:assert/strict";
import { tagesrandFuer, wachMinutenAus, wachMinutenAm, setzeAusnahme, weichtAb, wochentagVon } from "./tagesrand.js";
import type { UserProfile } from "./types.js";

const BASIS: UserProfile = {
  sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain",
  dailySteps: 12000, sessions: [], wakeTime: "07:00", sleepTime: "23:00",
};

// Der 08.09.2026 ist ein Dienstag, der 12.09.2026 ein Samstag.
const DIENSTAG = "2026-09-08";
const SAMSTAG = "2026-09-12";

test("ohne Angaben gilt der Standard", () => {
  const r = tagesrandFuer(BASIS, DIENSTAG);
  assert.equal(r.wakeTime, "07:00");
  assert.equal(r.sleepTime, "23:00");
});

test("ein alter Profilstand ohne die neuen Felder laeuft unveraendert weiter", () => {
  assert.deepEqual(tagesrandFuer(BASIS), { wakeTime: "07:00", sleepTime: "23:00", handyAus: undefined, handyMorgens: undefined });
});

test("je Wochentag schlaegt den Standard", () => {
  const p: UserProfile = {
    ...BASIS,
    randModus: "wochentag",
    wochenraender: { "2": { wakeTime: "05:30" } },
  };
  assert.equal(tagesrandFuer(p, DIENSTAG).wakeTime, "05:30");
  // Die Schlafenszeit war für den Dienstag nicht gesetzt, also gilt der Standard.
  assert.equal(tagesrandFuer(p, DIENSTAG).sleepTime, "23:00");
  assert.equal(tagesrandFuer(p, SAMSTAG).wakeTime, "07:00");
});

test("Wochenzeiten wirken nur im passenden Modus", () => {
  const p: UserProfile = { ...BASIS, randModus: "gleich", wochenraender: { "2": { wakeTime: "05:30" } } };
  assert.equal(tagesrandFuer(p, DIENSTAG).wakeTime, "07:00");
});

test("die Ausnahme fuer einen Tag schlaegt alles", () => {
  const p: UserProfile = {
    ...BASIS,
    randModus: "wochentag",
    wochenraender: { "2": { wakeTime: "05:30" } },
    tagesausnahmen: { [DIENSTAG]: { wakeTime: "04:30", sleepTime: "21:30" } },
  };
  assert.equal(tagesrandFuer(p, DIENSTAG).wakeTime, "04:30");
  assert.equal(tagesrandFuer(p, DIENSTAG).sleepTime, "21:30");
});

test("ohne Datum gibt es weder Wochentag noch Ausnahme", () => {
  const p: UserProfile = { ...BASIS, randModus: "wochentag", wochenraender: { "2": { wakeTime: "05:30" } } };
  assert.equal(tagesrandFuer(p).wakeTime, "07:00");
});

test("kaputte Zeiten werden ignoriert statt uebernommen", () => {
  const p = { ...BASIS, wakeTime: "25:99", sleepTime: "" } as unknown as UserProfile;
  assert.equal(tagesrandFuer(p).wakeTime, "07:00");
  assert.equal(tagesrandFuer(p).sleepTime, "23:00");
});

test("Wachzeit rechnet ueber Mitternacht", () => {
  assert.equal(wachMinutenAus("07:00", "23:00"), 16 * 60);
  // Wer um 01:00 ins Bett geht und um 07:00 aufsteht, ist 18 Stunden wach.
  assert.equal(wachMinutenAus("07:00", "01:00"), 18 * 60);
  assert.equal(wachMinutenAus("04:30", "21:30"), 17 * 60);
});

test("unsinnige Spannen fallen auf den Standardwert zurueck", () => {
  // Zwei Stunden wach ist kein Tag, sondern ein Vertipper.
  assert.equal(wachMinutenAus("07:00", "09:00"), 16 * 60);
  assert.equal(wachMinutenAus("kaputt", "23:00"), 16 * 60);
});

test("die Wachzeit richtet sich nach dem Tag", () => {
  const p: UserProfile = {
    ...BASIS,
    tagesausnahmen: { [DIENSTAG]: { wakeTime: "04:30", sleepTime: "21:30" } },
  };
  assert.equal(wachMinutenAm(p, DIENSTAG), 17 * 60);
  assert.equal(wachMinutenAm(p, SAMSTAG), 16 * 60);
});

test("eine Ausnahme ergaenzt, statt den Rest zu loeschen", () => {
  const ausnahmen = setzeAusnahme(BASIS, DIENSTAG, { wakeTime: "04:30" }, DIENSTAG);
  assert.equal(ausnahmen[DIENSTAG]?.wakeTime, "04:30");
  // Die Schlafenszeit stand nicht in der Aenderung und bleibt der Standard.
  assert.equal(ausnahmen[DIENSTAG]?.sleepTime, "23:00");
});

test("alte Ausnahmen werden aufgeraeumt", () => {
  const p: UserProfile = { ...BASIS, tagesausnahmen: { "2026-01-01": { wakeTime: "05:00", sleepTime: "22:00" } } };
  const ausnahmen = setzeAusnahme(p, DIENSTAG, { wakeTime: "04:30" }, DIENSTAG);
  assert.equal(ausnahmen["2026-01-01"], undefined, "acht Monate alt, fliegt raus");
  assert.ok(ausnahmen[DIENSTAG]);
});

test("junge Ausnahmen bleiben stehen", () => {
  const p: UserProfile = { ...BASIS, tagesausnahmen: { "2026-09-01": { wakeTime: "05:00", sleepTime: "22:00" } } };
  const ausnahmen = setzeAusnahme(p, DIENSTAG, { wakeTime: "04:30" }, DIENSTAG);
  assert.ok(ausnahmen["2026-09-01"], "eine Woche alt, bleibt");
});

test("weichtAb erkennt einen abweichenden Tag", () => {
  const p: UserProfile = { ...BASIS, tagesausnahmen: { [DIENSTAG]: { wakeTime: "04:30", sleepTime: "21:30" } } };
  assert.equal(weichtAb(p, DIENSTAG), true);
  assert.equal(weichtAb(p, SAMSTAG), false);
});

test("Wochentage werden richtig bestimmt", () => {
  assert.equal(wochentagVon(DIENSTAG), 2);
  assert.equal(wochentagVon(SAMSTAG), 6);
  assert.equal(wochentagVon("2026-09-13"), 0, "Sonntag ist 0");
  assert.equal(wochentagVon("kein Datum"), null);
});
