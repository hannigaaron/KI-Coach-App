import { test } from "node:test";
import assert from "node:assert/strict";
import { planAendern, planAenderungAus, trainingsplanText } from "./wochentraining.js";
import type { TrainingSession } from "./types.js";

// Dienstag und Freitag Volleyball, Montag und Donnerstag Kraft.
const PLAN: TrainingSession[] = [
  { type: "strength", minutes: 75, weekday: 1, startsAt: "07:00" },
  { type: "team_sport", minutes: 120, weekday: 2, startsAt: "19:00" },
  { type: "strength", minutes: 75, weekday: 4, startsAt: "07:00" },
  { type: "team_sport", minutes: 120, weekday: 5, startsAt: "19:00" },
];

test("eine verschobene Volleyballeinheit lässt das Krafttraining stehen", () => {
  const a = planAenderungAus("Volleyball ist ab jetzt donnerstags statt dienstags");
  assert.ok(a);
  const r = planAendern(PLAN, a);
  assert.equal(r.fehler, "");
  const volleyball = r.sessions.filter((s) => s.type === "team_sport").map((s) => s.weekday);
  assert.deepEqual(volleyball, [4]);
  // Kraft bleibt vollständig, Uhrzeit und Dauer kommen aus der alten Einheit.
  assert.equal(r.sessions.filter((s) => s.type === "strength").length, 2);
  assert.equal(r.sessions.find((s) => s.type === "team_sport")?.startsAt, "19:00");
  assert.equal(r.sessions.find((s) => s.type === "team_sport")?.minutes, 120);
  assert.ok(r.angenommen.length > 0);
});

test("ein neuer Plan für alle Tage ersetzt den alten", () => {
  const a = planAenderungAus("Ich trainiere ab sofort montags, mittwochs und freitags um 18 Uhr, je 60 Minuten");
  assert.ok(a);
  assert.equal(a.modus, "ersetzen");
  const r = planAendern(PLAN, a);
  assert.deepEqual(r.sessions.map((s) => `${s.weekday}@${s.startsAt}/${s.minutes}`), ["1@18:00/60", "3@18:00/60", "5@18:00/60"]);
});

test("ein Tag fällt weg", () => {
  const a = planAenderungAus("Freitags fällt das Training ab jetzt weg");
  assert.ok(a);
  assert.equal(a.modus, "entfernen");
  const r = planAendern(PLAN, a);
  assert.equal(r.sessions.some((s) => s.weekday === 5), false);
  assert.equal(r.sessions.length, 3);
});

test("ohne Uhrzeit und ohne Vorbild wird gefragt statt geraten", () => {
  const r = planAendern([], { modus: "ersetzen", einheiten: [{ wochentag: 2 }] });
  assert.match(r.fehler, /Uhr/);
  assert.deepEqual(r.sessions, []);
});

test("kein neuer Plan aus einem erzählten Training", () => {
  assert.equal(planAenderungAus("Volleyball am Donnerstag war super"), null);
  assert.equal(planAenderungAus("Hab heute 60 Minuten Krafttraining gemacht"), null);
  assert.equal(planAenderungAus("Soll ich heute trainieren, ich bin müde"), null);
});

test("der Plan wird in Wochenreihenfolge gesagt, Montag zuerst", () => {
  const text = trainingsplanText([
    { type: "cardio", minutes: 30, weekday: 0, startsAt: "09:00" },
    { type: "strength", minutes: 60, weekday: 1, startsAt: "07:00" },
  ]);
  assert.match(text, /Sonntag/);
});

test("was vor ab jetzt steht, ist der alte Tag", () => {
  const a = planAenderungAus("Volleyball spiele ich dienstags um 19 Uhr für 2 Stunden, das ist ab jetzt donnerstags");
  assert.ok(a);
  assert.deepEqual(a!.einheiten.map((e) => [e.wochentag, e.uhrzeit, e.minuten]), [[4, "19:00", 120]]);
  const alt = [{ type: "team_sport", minutes: 120, weekday: 2, startsAt: "19:00" }, { type: "strength", minutes: 75, weekday: 1, startsAt: "18:00" }] as never;
  const r = planAendern(alt, a!);
  assert.deepEqual(r.sessions.map((s) => [s.weekday, s.type]), [[1, "strength"], [4, "team_sport"]]);
});
