import { test } from "node:test";
import assert from "node:assert/strict";
import { tagesablauf } from "./tagesablauf.js";
import { tagesessen, tagesessenText, trainingAusProfil } from "./tagesessen.js";
import { uhrzeit, type Termin } from "./ical.js";
import type { MacroTargets, UserProfile } from "./types.js";

const TAG = "2026-09-07"; // Montag
const PROFIL: UserProfile = {
  sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000,
  sessions: [{ type: "strength", minutes: 60, weekday: 1, startsAt: "18:15" }], wakeTime: "07:00", sleepTime: "23:00",
};
const ZIELE: MacroTargets = { kcal: 3000, proteinG: 175, fatG: 70, carbsG: 420, waterMl: 3500 };
const t = (von: string, bis: string, titel: string): Termin => ({ uid: titel + von, titel, ort: "", von: new Date(`${TAG}T${von}:00`).getTime(), bis: new Date(`${TAG}T${bis}:00`).getTime(), ganztags: false });

function plan(termine: Termin[], extra: Partial<Parameters<typeof tagesessen>[0]> = {}) {
  const ablauf = tagesablauf({ tag: TAG, termine, profile: PROFIL, ziele: ZIELE });
  return tagesessen({ ablauf, ziele: ZIELE, trainings: trainingAusProfil(PROFIL.sessions, TAG), ...extra });
}

test("die Mahlzeiten sind verschieden gross und haben ein Rezept", () => {
  const p = plan([t("09:00", "12:00", "Kunden"), t("13:00", "17:00", "Kunden")]);
  const kcal = p.mahlzeiten.map((m) => m.kcal);
  assert.ok(new Set(kcal).size > 1, `alle gleich: ${kcal}`);
  assert.ok(p.mahlzeiten.every((m) => m.rezept), "jede Mahlzeit hat ein Rezept");
  assert.equal(new Set(p.mahlzeiten.map((m) => m.rezept!.id)).size, p.mahlzeiten.length, "kein Rezept doppelt");
  const summe = p.mahlzeiten.reduce((s, m) => s + m.kcal, 0);
  assert.ok(Math.abs(summe - ZIELE.kcal) / ZIELE.kcal < 0.2, `Summe ${summe}`);
});

test("die Zeiten liegen in den Lücken des Kalenders, auf der Viertelstunde", () => {
  const termine = [t("09:00", "12:00", "Kunden"), t("12:30", "17:00", "Kunden")];
  const p = plan(termine);
  for (const m of p.mahlzeiten.filter((x) => !x.mitnehmen)) {
    assert.ok(!termine.some((x) => m.um >= x.von && m.um < x.bis), `${m.name} um ${uhrzeit(m.um)} liegt in einem Termin`);
    assert.equal(new Date(m.um).getMinutes() % 5, 0);
  }
  const mittag = p.mahlzeiten.find((m) => m.art === "mittagessen")!;
  assert.equal(uhrzeit(mittag.um), "12:00");
});

test("kein Platz im Fenster: zum Mitnehmen", () => {
  const p = plan([t("11:00", "15:30", "Lehrgang")]);
  const mittag = p.mahlzeiten.find((m) => m.art === "mittagessen")!;
  assert.equal(mittag.mitnehmen, true);
  assert.match(mittag.grund, /kein Platz/);
  assert.match(tagesessenText(p), /zum Mitnehmen/);
});

test("Training: davor Kohlenhydrate, danach mehr Protein", () => {
  const p = plan([]);
  const davor = p.mahlzeiten.find((m) => m.training === "davor");
  const danach = p.mahlzeiten.find((m) => m.training === "danach");
  assert.ok(davor && danach);
  assert.ok(davor.um <= new Date(`${TAG}T17:45:00`).getTime(), `davor um ${uhrzeit(davor.um)}`);
  assert.ok(danach.um >= new Date(`${TAG}T19:15:00`).getTime(), `danach um ${uhrzeit(danach.um)}`);
  assert.match(davor.grund, /vor Krafttraining um 18:15/);
});

test("schon Gegessenes zählt, vorbei ist vorbei", () => {
  const jetzt = new Date(`${TAG}T13:30:00`).getTime();
  const p = plan([], { jetzt, gegessen: [{ at: "07:30", kcal: 700, proteinG: 40, fatG: 20, carbsG: 90 }] });
  assert.ok(!p.mahlzeiten.some((m) => m.art === "fruehstueck"));
  assert.ok(p.mahlzeiten.every((m) => m.um >= jetzt));
  const voll = plan([], { gegessen: [{ at: "20:00", kcal: 3000, proteinG: 175, fatG: 70, carbsG: 420 }] });
  assert.equal(voll.mahlzeiten.length, 0);
});

test("Ausschlüsse gelten auch hier", () => {
  const p = plan([], { ernaehrung: { form: "vegan" } });
  assert.ok(p.mahlzeiten.length > 0);
  assert.ok(p.mahlzeiten.every((m) => !m.rezept || !/Hähnchen|Quark|Ei|Lachs|Rind/.test(m.rezept.name)), p.mahlzeiten.map((m) => m.rezept?.name).join());
});

test("eine Einheit aus dem Profil blockiert ihre Zeit, um das letzte Training wird gegessen", () => {
  const profil = { ...PROFIL, sessions: [{ type: "strength" as const, minutes: 60, weekday: 1, startsAt: "12:00" }] };
  const ablauf = tagesablauf({ tag: TAG, termine: [t("19:30", "21:10", "Volleyball")], profile: profil, ziele: ZIELE });
  const p = tagesessen({ ablauf, ziele: ZIELE, trainings: trainingAusProfil(profil.sessions, TAG) });
  const mittag = p.mahlzeiten.find((m) => m.art === "mittagessen")!;
  const krafVon = new Date(`${TAG}T11:45:00`).getTime();
  const krafBis = new Date(`${TAG}T13:15:00`).getTime();
  assert.ok(mittag.um < krafVon || mittag.um >= krafBis, `Mittag um ${uhrzeit(mittag.um)} im Training`);
  assert.equal(p.mahlzeiten.find((m) => m.training === "danach")?.art, "abendessen");
});

test("abends mit viel Rest: Abendessen und ein später Snack statt eines Riesentellers", () => {
  const ablauf = tagesablauf({ tag: TAG, termine: [], profile: { ...PROFIL, sessions: [] }, ziele: ZIELE });
  const p = tagesessen({
    ablauf, ziele: ZIELE, jetzt: new Date(`${TAG}T18:00:00`).getTime(),
    gegessen: [{ at: "08:00", kcal: 900, proteinG: 50, fatG: 30, carbsG: 110 }, { at: "13:00", kcal: 800, proteinG: 45, fatG: 25, carbsG: 100 }],
  });
  const namen = p.mahlzeiten.map((m) => m.name);
  assert.deepEqual(namen, ["Abendessen", "Später Snack"]);
  assert.ok(p.mahlzeiten.every((m) => m.kcal < 1000), p.mahlzeiten.map((m) => m.kcal).join(", "));
  assert.ok(p.mahlzeiten[1]!.um <= new Date(`${TAG}T22:30:00`).getTime());
});
