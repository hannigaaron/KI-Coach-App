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
const { mitteilungsPlan } = await import("./mitteilungen.js");

const HEUTE = "2026-11-23";
const profil = (wakeTime, sleepTime) => ({ name: "A", sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000, wakeTime, sleepTime, sessions: [] });

test("Impulse kommen nur in der Wachzeit des Tages", () => {
  localStorage.clear();
  // Wer um 11 aufsteht, braucht um 9 keinen Eiweiss Impuls.
  store.setProfile(profil("11:00", "23:59"));
  const plan = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "05:00" } });
  const frueh = plan.filter((m) => m.art !== "eigene" && m.uhrzeit < "11:00");
  assert.deepEqual(frueh.map((m) => m.uhrzeit), []);
  assert.ok(plan.some((m) => m.uhrzeit >= "11:00"));
});

test("nach der Schlafenszeit kommt nichts, eine eigene Erinnerung aber schon", () => {
  localStorage.clear();
  store.setProfile(profil("06:30", "20:30"));
  store.setSettings({ ...store.getSettings(), eigeneErinnerungen: [{ id: "t1", text: "Tablette", uhrzeit: "22:00", tage: [] }] });
  const plan = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "05:00" } });
  const spaet = plan.filter((m) => m.tag === HEUTE && m.uhrzeit > "20:30");
  assert.deepEqual(spaet.map((m) => m.art), ["eigene"]);
});
