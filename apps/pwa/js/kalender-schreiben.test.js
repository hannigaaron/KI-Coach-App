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
const { kalenderTermin, kalenderAenderungen } = await import("./kalender-schreiben.js");

/** Morgen, Ortszeit, um hh:mm. */
const morgen = (hhmm, plusTage = 1) => {
  const d = new Date(); d.setDate(d.getDate() + plusTage);
  const [h, m] = hhmm.split(":").map(Number); d.setHours(h, m, 0, 0);
  return d.getTime();
};

let aufrufe = [];
function hulle() {
  aufrufe = [];
  globalThis.Capacitor = {
    isNativePlatform: () => true,
    nativePromise: async (plugin, methode, daten) => {
      aufrufe.push({ plugin, methode, daten });
      if (methode === "termine") return { termine: [] };
      if (methode === "anlegen") return { eid: "neu-1", kalender: "iCloud" };
      return { ok: true };
    },
  };
}

function lage(termine, { nativ = true } = {}) {
  localStorage.clear();
  store.setProfile({ ...store.getProfile(), wakeTime: "07:00", sleepTime: "23:00",
    sessions: [{ type: "strength", minutes: 75, weekday: new Date(morgen("12:00")).getDay(), startsAt: "18:00" }] });
  store.setSettings({ appleKalender: nativ });
  store.setKalender({ quellen: [], termine });
  if (nativ) hulle(); else delete globalThis.Capacitor;
}

test("eigenes Training wandert ohne Rückfrage auf den nächsten Tag zur selben Zeit", async () => {
  lage([{ uid: "t1", titel: "Training", von: morgen("18:00"), bis: morgen("19:00"), eid: "e1", daevo: true, schreibbar: true }]);
  const text = await kalenderTermin({ aktion: "verschieben", suche: "training" });
  assert.match(text, /^Verschoben/);
  const v = aufrufe.find((a) => a.methode === "verschieben");
  assert.equal(v.daten.von, morgen("18:00", 2));
  assert.equal(kalenderAenderungen().length, 1);
  const zurueck = await kalenderTermin({ aktion: "rueckgaengig" });
  assert.match(zurueck, /^Zurückgenommen/);
  assert.equal(aufrufe.filter((a) => a.methode === "verschieben").at(-1).daten.von, morgen("18:00"));
  assert.equal(kalenderAenderungen().length, 0);
});

test("fremder Termin nur nach einem Ja", async () => {
  lage([{ uid: "t2", titel: "Volleyball Verein", von: morgen("20:00"), bis: morgen("22:00"), eid: "e2", daevo: false, schreibbar: true }]);
  const frage = await kalenderTermin({ aktion: "verschieben", suche: "volleyball" });
  assert.match(frage, /^Noch nicht gespeichert\..*Sag ja/);
  assert.equal(aufrufe.filter((a) => a.methode === "verschieben").length, 0);
  const ja = await kalenderTermin({ aktion: "verschieben", suche: "volleyball", bestaetigt: true });
  assert.match(ja, /^Verschoben/);
});

test("Eintragen: feste Uhrzeit nur wenn frei, sonst Vorschlag", async () => {
  lage([{ uid: "k", titel: "Kunde Alina", von: morgen("17:30"), bis: morgen("19:00") }]);
  const tag = new Date(morgen("12:00")); const iso = `${tag.getFullYear()}-${String(tag.getMonth() + 1).padStart(2, "0")}-${String(tag.getDate()).padStart(2, "0")}`;
  const besetzt = await kalenderTermin({ aktion: "eintragen", tag: iso, uhrzeit: "18:00", titel: "Training" });
  assert.match(besetzt, /^Noch nicht gespeichert\. Um 18:00 liegt schon/);
  const frei = await kalenderTermin({ aktion: "eintragen", tag: iso, uhrzeit: "07:30", titel: "Training" });
  assert.match(frei, /^Eingetragen/);
  assert.equal(aufrufe.find((a) => a.methode === "anlegen").daten.von, morgen("07:30"));
});

test("im Browser wird nur vorgeschlagen", async () => {
  lage([], { nativ: false });
  const text = await kalenderTermin({ aktion: "eintragen", titel: "Training" });
  assert.match(text, /^Noch nicht gespeichert\. Frei wäre .*iPhone App/);
});
