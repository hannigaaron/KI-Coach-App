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
const { abendplanFuer, abendHtml, abendStand, schlafWocheFuer, schlafWocheHtml, schrittUmschalten, zuBettMerken } = await import("./abend.js");

const HEUTE = "2026-11-16";

function frisch() {
  localStorage.clear();
  store.setProfile({ name: "A", sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000, wakeTime: "06:30", sleepTime: "23:00", sessions: [] });
}

test("der Abend rechnet mit der Schlafenszeit des Tages und dem Wecker am Morgen danach", () => {
  frisch();
  store.setProfile({ ...store.getProfile(), tagesausnahmen: { "2026-11-17": { wakeTime: "08:00" } } });
  const p = abendplanFuer(store, HEUTE);
  assert.equal(p.start, "21:30");
  assert.equal(p.wecker, "08:00");
  assert.equal(p.schlafMinuten, 540);
  assert.match(abendHtml(p, { erledigt: [] }), /9 h/);
});

test("Abhaken und Zubettgehen werden je Abend gemerkt", () => {
  frisch();
  schrittUmschalten(store, HEUTE, "handy");
  schrittUmschalten(store, HEUTE, "lueften");
  schrittUmschalten(store, HEUTE, "handy");
  zuBettMerken(store, HEUTE, "23:40");
  assert.deepEqual(abendStand(store, HEUTE), { erledigt: ["lueften"], zuBett: "23:40" });
});

test("die Woche nimmt Apple Health vor der Zeit im Bett und nennt den Tipp", () => {
  frisch();
  // Nacht 15. auf 16.: Health sagt 6 h. Nacht 14. auf 15.: nur Zubettgehen und Morgen Check-in.
  store.setDay("2026-11-16", { ...store.getDay("2026-11-16"), gesundheit: { schlafMinuten: 360 } });
  zuBettMerken(store, "2026-11-14", "23:45");
  store.setDay("2026-11-15", { ...store.getDay("2026-11-15"), checkins: [{ kind: "morning", morgen: { schlaf: 3 }, at: "06:45" }] });
  const w = schlafWocheFuer(store, HEUTE);
  assert.equal(w.naechte.length, 7);
  assert.equal(w.gemessen, 2);
  const health = w.naechte.find((n) => n.tag === "2026-11-15");
  assert.equal(health.quelle, "health");
  assert.equal(health.tatsaechlichMin, 360);
  const app = w.naechte.find((n) => n.tag === "2026-11-14");
  assert.equal(app.quelle, "app");
  assert.equal(app.tatsaechlichMin, 420);
  assert.equal(app.spaeterMin, 45);
  assert.equal(w.geplantSchnitt, 450);
  assert.ok(w.abweichung < 0);
  assert.match(schlafWocheHtml(w), /letzte 7 Nächte/);
});
