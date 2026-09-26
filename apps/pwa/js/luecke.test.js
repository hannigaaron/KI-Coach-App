import test from "node:test";
import assert from "node:assert/strict";

/**
 * Die Trainingslücke, auf Seite der App.
 *
 * Getestet wird ohne Browser. `luecke.js` fasst weder `document` noch
 * `window` an, und den Cache Speicher bekommt sie als Parameter. Der Ersatz
 * unten hat dasselbe Verhalten wie die Cache API: Anfragen als Schlüssel,
 * Antworten als Wert.
 */

class CacheAttrappe {
  constructor() { this.inhalt = new Map(); }
  async open() { return this; }
  async keys() { return [...this.inhalt.keys()]; }
  async match(k) { return this.inhalt.get(k) ?? undefined; }
  async delete(k) { return this.inhalt.delete(k); }
  /** Legt einen Eintrag ab, wie es der Service Worker tut. */
  legeAb(name, objekt) {
    this.inhalt.set(name, { json: async () => objekt });
  }
}

function storeAttrappe({ tage = {}, sessions = 4, settings = {} } = {}) {
  let einstellungen = { ...settings };
  let profil = { sessions: Array.from({ length: sessions }, () => ({ type: "strength" })) };
  return {
    allDays: () => Object.keys(tage),
    getDay: (t) => tage[t] ?? { trainings: [] },
    getProfile: () => profil,
    getSettings: () => einstellungen,
    setSettings: (s) => { einstellungen = s; },
  };
}

const einheit = { trainings: [{ art: "strength", minuten: 60 }] };

const { antwortVerarbeiten, antwortenAbholen, lueckeAusSpeicher, lueckeMelden, naechsterZeitpunkt } =
  await import("./luecke.js");

test("die Lücke kommt aus den gespeicherten Tagen", () => {
  const store = storeAttrappe({ tage: { "2026-09-22": einheit, "2026-09-24": { trainings: [] } } });
  const luecke = lueckeAusSpeicher(store, "2026-09-26");
  assert.ok(luecke);
  assert.equal(luecke.tageOhne, 4);
});

test("ohne Trainingsplan im Profil gibt es keine Lücke", () => {
  const store = storeAttrappe({ tage: { "2026-09-22": einheit }, sessions: 0 });
  assert.equal(lueckeAusSpeicher(store, "2026-09-26"), null);
});

test("die Frage geht auf 18 Uhr, und nach 18 Uhr auf morgen", () => {
  const vormittag = new Date("2026-09-26T09:00:00");
  const abends = new Date("2026-09-26T21:00:00");
  assert.equal(new Date(naechsterZeitpunkt(vormittag)).getDate(), 26);
  assert.equal(new Date(naechsterZeitpunkt(vormittag)).getHours(), 18);
  assert.equal(new Date(naechsterZeitpunkt(abends)).getDate(), 27);
});

test("gemeldet wird die Zahl, nicht der Text", async () => {
  const store = storeAttrappe({ tage: { "2026-09-22": einheit } });
  const luecke = lueckeAusSpeicher(store, "2026-09-26");
  let gesendet = null;
  await lueckeMelden({
    store,
    worker: "https://w.example/",
    endpoint: "https://web.push.apple.com/AB12",
    luecke,
    jetzt: new Date("2026-09-26T09:00:00"),
    holen: async (url, optionen) => {
      gesendet = { url, koerper: JSON.parse(optionen.body) };
      return { ok: true, json: async () => ({ ok: true }) };
    },
  });
  assert.equal(gesendet.url, "https://w.example/auftrag");
  assert.equal(gesendet.koerper.art, "trainingsluecke");
  assert.equal(gesendet.koerper.tageOhne, 4);
  assert.equal(gesendet.koerper.geplanteEinheiten, 4);
  assert.equal("titel" in gesendet.koerper, false);
  assert.equal("text" in gesendet.koerper, false);
});

test("erst wenn der Worker annimmt, gilt die Frage als gestellt", async () => {
  const store = storeAttrappe({ tage: { "2026-09-22": einheit } });
  const luecke = lueckeAusSpeicher(store, "2026-09-26");
  await assert.rejects(
    () =>
      lueckeMelden({
        store,
        worker: "https://w.example",
        endpoint: "https://web.push.apple.com/AB12",
        luecke,
        holen: async () => ({ ok: false, status: 500, json: async () => ({ fehler: "kaputt" }) }),
      }),
    /kaputt/,
  );
  assert.equal(store.getSettings().lueckeGefragt, undefined);
});

test("eine angenommene Frage sperrt die nächsten drei Tage", async () => {
  const store = storeAttrappe({ tage: { "2026-09-22": einheit } });
  await lueckeMelden({
    store,
    worker: "https://w.example",
    endpoint: "https://web.push.apple.com/AB12",
    luecke: lueckeAusSpeicher(store, "2026-09-26"),
    jetzt: new Date("2026-09-26T09:00:00"),
    holen: async () => ({ ok: true, json: async () => ({ ok: true }) }),
  });
  assert.equal(store.getSettings().lueckeGefragt, "2026-09-26");
  assert.equal(lueckeAusSpeicher(store, "2026-09-27"), null);
});

test("ohne Worker oder Endpunkt passiert nichts", async () => {
  const store = storeAttrappe({ tage: { "2026-09-22": einheit } });
  const luecke = lueckeAusSpeicher(store, "2026-09-26");
  assert.equal(await lueckeMelden({ store, worker: "", endpoint: "x", luecke }), null);
  assert.equal(await lueckeMelden({ store, worker: "https://w", endpoint: "", luecke }), null);
});

test("die Antworten werden gelesen und dabei weggeräumt", async () => {
  const cache = new CacheAttrappe();
  cache.legeAb("a", { aktion: "platt", at: 2 });
  cache.legeAb("b", { aktion: "keine_zeit", at: 1 });
  const raus = await antwortenAbholen(cache);
  assert.deepEqual(raus.map((a) => a.aktion), ["keine_zeit", "platt"]);
  assert.equal(cache.inhalt.size, 0);
  assert.deepEqual(await antwortenAbholen(cache), []);
});

test("ohne Cache Speicher gibt es keine Antworten und keinen Fehler", async () => {
  assert.deepEqual(await antwortenAbholen(undefined), []);
});

test("eine Antwort landet als Muster im Gedächtnis", () => {
  const store = storeAttrappe();
  const notizen = [];
  const satz = antwortVerarbeiten(
    { aktion: "keine_zeit", at: Date.parse("2026-09-26T18:04:00Z") },
    { store, brain: { add: (n) => notizen.push(n) } },
  );
  assert.equal(satz, "Es hat zeitlich nicht gereicht.");
  assert.equal(notizen.length, 1);
  assert.equal(notizen[0].art, "muster");
  assert.equal(notizen[0].wichtigkeit, 4);
  assert.match(notizen[0].text, /2026-09-26/);
  assert.equal(store.getSettings().lueckeAntwort.id, "keine_zeit");
});

test("eine unbekannte Aktion schreibt nichts", () => {
  const store = storeAttrappe();
  const notizen = [];
  assert.equal(antwortVerarbeiten({ aktion: "quatsch" }, { store, brain: { add: (n) => notizen.push(n) } }), null);
  assert.equal(notizen.length, 0);
});
