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

test("Kunde auf Freitag 14 Uhr: die Bitte ist das Ja, das Training dort wandert mit, ein Satz nimmt beides zurück", async () => {
  const kunde = { uid: "k1", titel: "PT Müller", von: morgen("10:00"), bis: morgen("11:00"), eid: "ek", daevo: false, schreibbar: true };
  const training = { uid: "tr", titel: "Training", von: morgen("14:00", 2), bis: morgen("15:00", 2), eid: "et", daevo: true, schreibbar: true };
  lage([kunde, training]);
  const d = new Date(morgen("12:00", 2));
  const zielTag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const text = await kalenderTermin({ aktion: "verschieben", suche: "mueller", zielTag, zielUhrzeit: "14:00", bestaetigt: true });
  assert.match(text, /^Verschoben: „PT Müller“/);
  assert.match(text, /Training“ lag dort und steht jetzt/);
  const bewegt = aufrufe.filter((a) => a.methode === "verschieben");
  assert.equal(bewegt.length, 2);
  assert.equal(bewegt[0].daten.von, morgen("14:00", 2));
  assert.equal(bewegt[0].daten.bestaetigt, true);
  assert.ok(bewegt[1].daten.von >= morgen("15:15", 2) || bewegt[1].daten.bis <= morgen("13:45", 2), "Training nicht im Kundentermin");
  assert.equal(kalenderAenderungen().length, 2);
  const zurueck = await kalenderTermin({ aktion: "rueckgaengig" });
  assert.equal((zurueck.match(/Zurückgenommen/g) || []).length, 2);
  assert.equal(kalenderAenderungen().length, 0);
});

test("ohne Bitte bleibt ein fremder Termin liegen, am Ziel liegt ein anderer Kunde: nichts geschrieben", async () => {
  const kunde = { uid: "k1", titel: "PT Müller", von: morgen("10:00"), bis: morgen("11:00"), eid: "ek", daevo: false, schreibbar: true };
  const anderer = { uid: "k2", titel: "PT Alina", von: morgen("14:00"), bis: morgen("15:00"), eid: "ea", daevo: false, schreibbar: true };
  lage([kunde, anderer]);
  const besetzt = await kalenderTermin({ aktion: "verschieben", suche: "mueller", zielUhrzeit: "14:00", bestaetigt: true });
  assert.match(besetzt, /^Noch nicht gespeichert\. Um 14:00 liegt schon „PT Alina“/);
  const ohneJa = await kalenderTermin({ aktion: "verschieben", suche: "mueller", zielUhrzeit: "16:00" });
  assert.match(ohneJa, /Sag ja/);
  assert.equal(aufrufe.filter((a) => a.methode === "verschieben").length, 0);
});

test("Umplanen aus der Mitteilung: am selben Tag ausweichen, und nichts tun, wenn der Konflikt weg ist", async () => {
  const { konfliktUmplanen } = await import("./kalender-schreiben.js");
  const training = { uid: "tr", titel: "Training", von: morgen("18:00"), bis: morgen("19:00"), eid: "et", daevo: true, schreibbar: true };
  const kunde = { uid: "k", titel: "PT Alina", von: morgen("17:30"), bis: morgen("18:30") };
  lage([training, kunde]);
  // Der Abgleich liest über das Plugin neu, die Attrappe liefert dieselben Termine.
  const roh = [training, kunde].map((t) => ({ ...t }));
  globalThis.Capacitor.nativePromise = async (plugin, methode, daten) => {
    aufrufe.push({ plugin, methode, daten });
    if (methode === "termine") return { termine: roh };
    return { ok: true };
  };
  const text = await konfliktUmplanen({ eid: "et", von: training.von });
  assert.match(text, /^Verschoben/);
  const v = aufrufe.find((a) => a.methode === "verschieben");
  assert.equal(new Date(v.daten.von).getDate(), new Date(training.von).getDate(), "derselbe Tag");
  assert.ok(v.daten.von >= morgen("18:45"), "nach dem Kunden mit Luft");

  lage([training]);
  globalThis.Capacitor.nativePromise = async (plugin, methode) => (methode === "termine" ? { termine: [{ ...training }] } : { ok: true });
  assert.match(await konfliktUmplanen({ eid: "et", von: training.von }), /überschneidet sich nicht mehr/);
});

test("eine geänderte Einheit im Profil nimmt die eigenen Termine mit", async () => {
  const { einheitImKalenderAnpassen } = await import("./kalender-schreiben.js");
  const mo = new Date(); mo.setDate(mo.getDate() + ((8 - mo.getDay()) % 7 || 7)); mo.setHours(17, 0, 0, 0);
  const t = { uid: "m", titel: "Krafttraining", von: mo.getTime(), bis: mo.getTime() + 3600000, eid: "em", daevo: true, schreibbar: true };
  const fremd = { ...t, uid: "f", eid: "ef", daevo: false };
  lage([t, fremd]);
  const r = await einheitImKalenderAnpassen({ weekday: 1, startsAt: "17:00" }, { weekday: 2, startsAt: "18:00", minutes: 75 });
  assert.equal(r.anzahl, 1);
  const v = aufrufe.find((a) => a.methode === "verschieben");
  const di = new Date(mo); di.setDate(di.getDate() + 1); di.setHours(18, 0, 0, 0);
  assert.equal(v.daten.eid, "em");
  assert.equal(v.daten.von, di.getTime());
  assert.equal(v.daten.bis - v.daten.von, 75 * 60000);
});
