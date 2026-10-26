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
const { KONFIG } = await import("./konfig.js");
const { aboDienst, aboEntfernen, aboHinzufuegen, appleTermine, kalenderAbgleichen, kalenderAbos } = await import("./kalender-sync.js");

const GOOGLE = "https://calendar.google.com/calendar/ical/x%40gmail.com/private-abc/basic.ics";

test("Abo Adressen: Dienst erkennen, webcal umschreiben, Namen eindeutig", () => {
  assert.equal(aboDienst(GOOGLE), "Google Kalender");
  assert.equal(aboDienst("webcal://p12-caldav.icloud.com/published/2/x"), "iCloud Kalender");
  assert.equal(aboDienst("https://example.com/x.ics"), null);
  let s = aboHinzufuegen({}, GOOGLE).settings;
  s = aboHinzufuegen(s, "webcal://p12-caldav.icloud.com/published/2/x").settings;
  s = aboHinzufuegen(s, "https://calendar.google.com/calendar/ical/b/basic.ics").settings;
  assert.deepEqual(kalenderAbos(s).map((a) => a.name), ["Google Kalender", "iCloud Kalender", "Google Kalender 2"]);
  assert.ok(kalenderAbos(s)[1].url.startsWith("https://"));
  // Dieselbe Adresse ersetzt.
  assert.equal(kalenderAbos(aboHinzufuegen(s, GOOGLE, "Arbeit").settings).length, 3);
  assert.match(aboHinzufuegen(s, "https://evil.example/a.ics").fehler, /keine Kalenderadresse/);
  assert.equal(kalenderAbos(aboEntfernen(s, "iCloud Kalender")).length, 2);
});

test("Apple Termine: Ungültiges fällt raus", () => {
  const t = appleTermine([{ uid: "a", titel: "PT", von: 1000, bis: 2000 }, { von: 5, bis: 1 }, null]);
  assert.equal(t.length, 1);
  assert.deepEqual(t[0], { uid: "a", titel: "PT", ort: "", von: 1000, bis: 2000, ganztags: false });
});

test("Abgleich holt über den Worker, ersetzt nur die eigene Quelle, wartet 30 Minuten", async () => {
  const jetzt = Date.now();
  const tag = new Date(jetzt + 86400000);
  const z = (d) => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ics = `BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:1\nSUMMARY:Kunde\nDTSTART:${z(tag)}\nDTEND:${z(new Date(+tag + 3600000))}\nEND:VEVENT\nEND:VCALENDAR`;
  KONFIG.chatUrl = "https://w.dev";
  store.setSettings({ kontoToken: "t".repeat(30), kalenderAbos: [{ name: "Google Kalender", url: GOOGLE }] });
  store.setKalender({ quellen: [{ name: "Datei" }], termine: [{ uid: "d", titel: "Alt", von: jetzt + 1000, bis: jetzt + 2000, quelle: "Datei" }] });
  const aufrufe = [];
  const holen = async (url, init) => { aufrufe.push([url, init.headers.authorization]); return new Response(ics, { status: 200 }); };
  const r = await kalenderAbgleichen({ holen, jetzt });
  assert.deepEqual(r.ergebnisse, [{ name: "Google Kalender", anzahl: 1 }]);
  assert.equal(aufrufe[0][0], "https://w.dev/kalender");
  assert.match(aufrufe[0][1], /^Bearer t+/);
  const k = store.getKalender();
  assert.deepEqual(k.termine.map((t) => t.quelle).sort(), ["Datei", "Google Kalender"]);
  assert.equal(k.quellen.find((q) => q.name === "Google Kalender").art, "abo");
  assert.equal((await kalenderAbgleichen({ holen, jetzt: jetzt + 60000 })).uebersprungen, true);
  // Ein Fehler lässt die alten Termine stehen.
  const kaputt = async () => new Response(JSON.stringify({ fehler: "weg" }), { status: 502 });
  const f = await kalenderAbgleichen({ holen: kaputt, zwang: true, jetzt });
  assert.equal(f.ergebnisse[0].fehler, "weg");
  assert.equal(store.getKalender().termine.length, 2);
  KONFIG.chatUrl = "";
});
