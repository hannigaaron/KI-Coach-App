import { test } from "node:test";
import assert from "node:assert/strict";
import { abendroutineBeginn, darfNachFeierabend, feierabendZeitpunkt } from "./feierabend.js";
import { zeitplan } from "./zeitplan.js";
import { tagesablauf } from "./tagesablauf.js";
import { tagesbriefing } from "./tagesbriefing.js";
import { uhrzeit } from "./ical.js";
import type { Termin } from "./ical.js";
import type { UserProfile } from "./types.js";

const TAG = "2026-11-24";
const t0 = new Date(`${TAG}T00:00:00`).getTime();
const h = (x: number) => t0 + x * 3600_000;
const PROFIL: UserProfile = { sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000, sessions: [], wakeTime: "06:30", sleepTime: "23:00" };
const ZIELE = { kcal: 3000, proteinG: 180, fatG: 90, carbsG: 340, waterMl: 3500 };
const termin = (titel: string, von: number, bis: number): Termin => ({ uid: titel, titel, ort: "", von, bis, ganztags: false });

test("Feierabend ist 13,5 Stunden nach dem Aufstehen, nie vor 19 Uhr und zwei Stunden vor dem Schlafen", () => {
  assert.equal(uhrzeit(feierabendZeitpunkt(h(6.5), h(23))), "20:00");
  // Wer um 11 aufsteht und um 1 schläft: nicht 20 Uhr, sondern 22 Uhr, die Grenze zum Schlafen.
  assert.equal(uhrzeit(feierabendZeitpunkt(h(11), h(25))), "23:00");
  // Wer um 4 aufsteht: nicht vor 19 Uhr.
  assert.equal(uhrzeit(feierabendZeitpunkt(h(4), h(22))), "19:00");
  // Wer um 21:30 schläft: zwei Stunden davor.
  assert.equal(uhrzeit(feierabendZeitpunkt(h(6.5), h(21.5))), "19:30");
  assert.equal(uhrzeit(abendroutineBeginn(h(23))), "21:30");
});

test("nach Feierabend nur, was nicht warten darf: höchste Wichtigkeit oder Geld", () => {
  assert.equal(darfNachFeierabend({ text: "Reel schneiden", wichtigkeit: 2 }), false);
  assert.equal(darfNachFeierabend({ text: "Kundenangebot", wichtigkeit: 3 }), true);
  assert.equal(darfNachFeierabend({ text: "Steuer an das Finanzamt zahlen", wichtigkeit: 1 }), true);
  assert.equal(darfNachFeierabend({ text: "Rechnung 1.200 € überweisen", wichtigkeit: 1 }), true);
  assert.equal(darfNachFeierabend({ text: "Mails sortieren", wichtigkeit: 1 }), false);
});

const aufgabe = (text: string, wichtigkeit: number) => ({ id: text, text, minuten: 30, wichtigkeit, erstellt: "", erledigt: false } as never);

test("der Zeitplan legt nichts nach Feierabend, ausser es darf nicht warten", () => {
  const luecken = [{ von: h(19), bis: h(23), minuten: 240 }];
  const z = zeitplan({
    aufgaben: [aufgabe("Reel schneiden", 2), aufgabe("Angebot", 3)], luecken, ab: h(19),
    spaetestens: h(20), ausnahme: (a) => darfNachFeierabend({ text: a.text, wichtigkeit: (a as { wichtigkeit?: number }).wichtigkeit }),
  });
  assert.deepEqual(z.bloecke.map((b) => b.aufgabe.text), ["Reel schneiden", "Angebot"]);
  // Beginnt der freie Block erst nach Feierabend, bekommt nur das Angebot einen Platz.
  const spaet = zeitplan({
    aufgaben: [aufgabe("Reel schneiden", 2), aufgabe("Angebot", 3)], luecken: [{ von: h(20.5), bis: h(23), minuten: 150 }], ab: h(20.5),
    spaetestens: h(20), ausnahme: (a) => darfNachFeierabend({ text: a.text, wichtigkeit: (a as { wichtigkeit?: number }).wichtigkeit }),
  });
  assert.deepEqual(spaet.bloecke.map((b) => b.aufgabe.text), ["Angebot"]);
  assert.deepEqual(spaet.passtNicht.map((a) => a.text), ["Reel schneiden"]);
});

test("im Briefing steht nach der Abendroutine kein Termin, nach Feierabend nur Wichtiges", () => {
  const termine = [termin("Kunde", h(9), h(10)), termin("Essen mit Freunden", h(20), h(21.5)), termin("Call Übersee", h(23), h(23.5))];
  const ablauf = tagesablauf({ tag: TAG, termine, profile: PROFIL, ziele: ZIELE });
  const b = tagesbriefing({
    art: "morgen", datum: "Dienstag", ablauf, essen: null, vorausblick: null, training: null,
    aufgaben: [
      { id: "1", text: "Reel schneiden", um: "20:30" },
      { id: "2", text: "Angebot senden", um: "20:30", wichtig: true },
      { id: "3", text: "Steuer zahlen", um: "21:00" },
      { id: "4", text: "Mails", um: "10:00" },
    ],
    ziele: { kcal: 3000, proteinG: 180 }, standards: [],
  } as never);
  const text = b.text;
  assert.ok(!text.includes("Call Übersee"));
  assert.match(text, /Essen mit Freunden/);
  assert.ok(!text.includes("Reel schneiden"));
  assert.match(text, /Angebot senden/);
  assert.match(text, /Steuer zahlen/);
  assert.match(text, /Mails/);
  assert.match(text, /Ab 20:00 ist Feierabend/);
  assert.ok(b.punkte.some((p) => p.art === "feierabend" && uhrzeit(p.um!) === "20:00"));
  assert.ok(!b.punkte.some((p) => p.titel === "Call Übersee"));
});
