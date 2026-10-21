import test from "node:test";
import assert from "node:assert/strict";

class SpeicherAttrappe {
  constructor() { this.inhalt = new Map(); }
  get length() { return this.inhalt.size; }
  key(i) { return [...this.inhalt.keys()][i] ?? null; }
  getItem(k) { return this.inhalt.has(k) ? this.inhalt.get(k) : null; }
  setItem(k, v) { this.inhalt.set(String(k), String(v)); }
  removeItem(k) { this.inhalt.delete(k); }
  clear() { this.inhalt.clear(); }
}
globalThis.localStorage = new SpeicherAttrappe();

const { store } = await import("./storage.js");
const { ergebnisHtml, fragenHtml, morgenFaellig, morgenSpeichern, morgenVonHeute, nachfrageFaellig, nachfrageSpeichern, trainingGestrichen, trainingHeute } = await import("./morgen.js");
const { mitteilungsPlan } = await import("./mitteilungen.js");

// Ein Mittwoch.
const HEUTE = "2026-10-21";

function frisch() {
  localStorage.clear();
  store.setProfile({
    name: "A", sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000,
    wakeTime: "06:30", sleepTime: "23:00",
    sessions: [{ type: "strength", weekday: 1, minutes: 60, startsAt: "18:00" }, { type: "strength", weekday: 3, minutes: 60, startsAt: "18:00" }],
  });
  store.setSettings({ ...store.getSettings(), plan: { einheiten: [{ titel: "Ganzkörper A", positionen: [] }, { titel: "Ganzkörper B", positionen: [] }] } });
}

const alle = (v) => ({ schlaf: v, einschlafen: v, erholt: v, gesund: v });

test("Fällig ab einer halben Stunde nach dem Aufstehen und bis mittags", () => {
  frisch();
  assert.equal(morgenFaellig(store, { tag: HEUTE, uhrzeit: "06:50" }), false);
  assert.equal(morgenFaellig(store, { tag: HEUTE, uhrzeit: "07:00" }), true);
  assert.equal(morgenFaellig(store, { tag: HEUTE, uhrzeit: "12:30" }), false);
  store.setSettings({ ...store.getSettings(), morgenAngeboten: HEUTE });
  assert.equal(morgenFaellig(store, { tag: HEUTE, uhrzeit: "08:00" }), false, "einmal am Tag");
});

test("Das Training von heute kommt mit dem Titel aus dem Plan", () => {
  frisch();
  const t = trainingHeute(store, HEUTE);
  assert.equal(t.length, 1);
  assert.equal(t[0].titel, "Ganzkörper B");
  assert.equal(t[0].uhrzeit, "18:00");
});

test("Speichern legt einen Morgen Check-in an, ein zweiter ersetzt den ersten", () => {
  frisch();
  const r = morgenSpeichern(store, HEUTE, { schlaf: 2, einschlafen: 1, erholt: 2, gesund: 4 });
  assert.equal(r.belastbarkeit, "niedrig");
  assert.ok(r.training[0].includes("Ganzkörper B") && r.training[0].includes("fit genug"));
  assert.ok(r.tipps.some((x) => x.includes("14:00")));
  const c = morgenVonHeute(store, HEUTE);
  assert.equal(c.kind, "morning");
  assert.equal(c.sleepQuality, 3);
  assert.equal(c.energy, 3);
  morgenSpeichern(store, HEUTE, alle(5));
  assert.equal(store.getDay(HEUTE).checkins.filter((x) => x.kind === "morning").length, 1);
  assert.equal(morgenFaellig(store, { tag: HEUTE, uhrzeit: "08:00" }), false);
  assert.equal(morgenSpeichern(store, HEUTE, { schlaf: 3 }), null);
});

test("Die Anzeige hat fünf Punkte je Frage und das Ergebnis die Grenze der Aussage", () => {
  assert.equal((fragenHtml({}).match(/data-mg-wert/g) || []).length, 20);
  frisch();
  const html = ergebnisHtml(morgenSpeichern(store, HEUTE, alle(4)));
  assert.ok(html.includes("keine Messung") && html.includes("Belastbarkeit"));
});

test("Die Mitteilung kommt zur Aufstehzeit plus 30 Minuten, nicht nach einem erledigten Check-in", () => {
  frisch();
  const plan = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "05:00" } });
  const m = plan.find((x) => x.art === "morgen" && x.tag === HEUTE);
  assert.equal(m.uhrzeit, "07:00");
  morgenSpeichern(store, HEUTE, alle(4));
  const danach = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "05:00" } });
  assert.ok(!danach.some((x) => x.art === "morgen" && x.tag === HEUTE));
  assert.ok(danach.some((x) => x.art === "morgen" && x.tag === "2026-10-22"));
});

test("Nach Fitheit 2 kommt mittags die Nachfrage, und weiter 2 streicht das Training", () => {
  frisch();
  morgenSpeichern(store, HEUTE, { schlaf: 4, einschlafen: 4, erholt: 4, gesund: 2 });
  assert.equal(nachfrageFaellig(store, { tag: HEUTE, uhrzeit: "11:00" }), false);
  assert.equal(nachfrageFaellig(store, { tag: HEUTE, uhrzeit: "12:30" }), true);
  assert.equal(nachfrageFaellig(store, { tag: HEUTE, uhrzeit: "20:30" }), false);
  const m = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "09:00" } }).find((x) => x.art === "nachfrage");
  assert.equal(m.uhrzeit, "12:30");
  const r = nachfrageSpeichern(store, HEUTE, 2);
  assert.equal(r.gestrichen, true);
  assert.ok(trainingGestrichen(store, HEUTE));
  assert.equal(nachfrageFaellig(store, { tag: HEUTE, uhrzeit: "13:00" }), false);
  assert.ok(!mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "09:00" } }).some((x) => x.art === "nachfrage"));
  // Besser geworden: wieder frei.
  assert.equal(nachfrageSpeichern(store, HEUTE, 4).gestrichen, false);
  assert.ok(!trainingGestrichen(store, HEUTE));
});

test("Ohne schwachen Morgen keine Nachfrage", () => {
  frisch();
  morgenSpeichern(store, HEUTE, { schlaf: 4, einschlafen: 4, erholt: 4, gesund: 3 });
  assert.equal(nachfrageFaellig(store, { tag: HEUTE, uhrzeit: "13:00" }), false);
  assert.ok(!mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "09:00" } }).some((x) => x.art === "nachfrage"));
});
