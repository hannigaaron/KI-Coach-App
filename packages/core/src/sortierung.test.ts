import { test } from "node:test";
import assert from "node:assert/strict";
import { aufgabeStufe } from "./sortierung.js";
import { tagesablauf } from "./tagesablauf.js";
import { tagesbriefing } from "./tagesbriefing.js";
import type { Termin } from "./ical.js";
import type { UserProfile } from "./types.js";

const TAG = "2026-11-24";
const t0 = new Date(`${TAG}T00:00:00`).getTime();
const h = (x: number) => t0 + x * 3600_000;
const PROFIL: UserProfile = { sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000, sessions: [], wakeTime: "06:30", sleepTime: "23:00" };
const ZIELE = { kcal: 3000, proteinG: 180, fatG: 90, carbsG: 340, waterMl: 3500 };
const termin = (titel: string, von: number, bis: number): Termin => ({ uid: titel, titel, ort: "", von, bis, ganztags: false });

test("Umsatz, Geld und Frist heute sind Stufe 1, wichtig ohne Frist Stufe 2, der Rest wartet", () => {
  assert.equal(aufgabeStufe({ text: "Angebot für Kunde Müller senden", wichtigkeit: 1 }, TAG).stufe, 1);
  assert.equal(aufgabeStufe({ text: "Steuer zahlen", wichtigkeit: 1 }, TAG).stufe, 1);
  assert.equal(aufgabeStufe({ text: "Reel schneiden", wichtigkeit: 1, faellig: TAG }, TAG).grund, "Frist heute");
  assert.equal(aufgabeStufe({ text: "Reel schneiden", wichtigkeit: 2 }, TAG).stufe, 2);
  assert.equal(aufgabeStufe({ text: "Mails sortieren", wichtigkeit: 1 }, TAG).stufe, 3);
  assert.equal(aufgabeStufe({ text: "Mails sortieren", wichtigkeit: 1, faellig: "2026-11-20" }, TAG).grund, "überfällig");
});

test("das Briefing sortiert: Stufe 1 vor 2, Wartendes getrennt, Abendtermine nach Feierabend extra", () => {
  const termine = [termin("Kunde", h(9), h(10)), termin("Essen mit Freunden", h(20.5), h(21.5))];
  const ablauf = tagesablauf({ tag: TAG, termine, profile: PROFIL, ziele: ZIELE });
  const b = tagesbriefing({
    art: "morgen", datum: "Dienstag", ablauf, essen: null, vorausblick: null, training: null,
    aufgaben: [
      { id: "2", text: "Reel schneiden", um: "11:00", stufe: 2, grund: "wichtig" },
      { id: "1", text: "Angebot senden", um: "10:30", stufe: 1, grund: "Umsatz" },
      { id: "3", text: "Mails", stufe: 3, grund: "kann warten" },
    ],
    warten: [{ id: "4", text: "Ablage" }],
    ziele: { kcal: 3000, proteinG: 180 }, standards: [],
  } as never);
  const ids = b.reihenfolge.map((g) => g.id);
  assert.deepEqual(ids, ["zuerst", "danach", "dazwischen", "warten", "abends"]);
  assert.equal(b.reihenfolge[0]!.punkte[0]!.titel, "Angebot senden");
  assert.equal(b.reihenfolge[0]!.punkte[0]!.grund, "Umsatz");
  assert.deepEqual(b.reihenfolge[3]!.punkte.map((p) => p.titel), ["Mails", "Ablage"]);
  // Ein Termin nach Feierabend steht unter Abends und nicht im Tag.
  assert.deepEqual(b.reihenfolge[4]!.punkte.map((p) => p.titel), ["Essen mit Freunden"]);
  assert.ok(!b.reihenfolge[2]!.punkte.some((p) => p.titel === "Essen mit Freunden"));
  assert.match(b.text, /Abends, nach Feierabend/);
  assert.match(b.text, /Zuerst: 10:30 Angebot senden \(Umsatz\)/);
});

test("leere Gruppen fallen weg", () => {
  const b = tagesbriefing({
    art: "morgen", datum: "Dienstag", ablauf: null, essen: null, vorausblick: null, training: null,
    aufgaben: [], ziele: { kcal: 3000, proteinG: 180 }, standards: [],
  } as never);
  assert.deepEqual(b.reihenfolge, []);
});
