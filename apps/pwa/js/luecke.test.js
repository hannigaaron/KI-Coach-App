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

/* ---------- Die Schieflage ---------- */

function balanceAttrappe(bereiche) {
  return () => ({ bereiche });
}
const bereich = (b, name, minuten, ziel) => ({
  bereich: b, name, minuten, zielMinuten: ziel,
  anteil: ziel > 0 ? minuten / ziel : 0, anteilAmTag: 0,
});
const SCHIEF = [
  bereich("karriere", "Karriere", 3900, 2400),
  bereich("me_time", "Me Time", 125, 420),
];

/** Ein Speicher mit genug Tagen gemessener Zeit. */
function speicherMitZeit(tage = 14, settings = {}) {
  const heute = Date.parse("2026-09-29T00:00:00Z");
  const zeiten = Array.from({ length: tage }, (_, i) => ({
    tag: new Date(heute - i * 86400000).toISOString().slice(0, 10), minuten: 60,
  }));
  let einstellungen = { ...settings };
  return {
    allDays: () => [],
    getDay: () => ({ trainings: [] }),
    getZeiten: () => zeiten,
    getKalender: () => ({ termine: [] }),
    getProfile: () => ({ sessions: [] }),
    getSettings: () => einstellungen,
    setSettings: (s) => { einstellungen = s; },
  };
}

test("Die Schieflage kommt aus dem Board und den gemessenen Tagen", async () => {
  const { schieflageAusSpeicher } = await import("./luecke.js");
  const s = schieflageAusSpeicher(speicherMitZeit(), balanceAttrappe(SCHIEF), "2026-09-29");
  assert.ok(s);
  assert.equal(s.fehlt.bereich, "me_time");
  assert.equal(s.frisst.bereich, "karriere");
});

test("Zu wenige Tage mit gemessener Zeit melden nichts", async () => {
  const { schieflageAusSpeicher } = await import("./luecke.js");
  assert.equal(schieflageAusSpeicher(speicherMitZeit(6), balanceAttrappe(SCHIEF), "2026-09-29"), null);
});

test("Kalendertermine zählen als gemessene Zeit", async () => {
  // Wer seine ganze Zeit im Kalender hat und nichts von Hand einträgt, käme
  // sonst nie über die Schwelle.
  const { schieflageAusSpeicher } = await import("./luecke.js");
  const heute = Date.parse("2026-09-29T12:00:00Z");
  const store = speicherMitZeit(0);
  store.getKalender = () => ({
    termine: Array.from({ length: 12 }, (_, i) => ({ von: heute - i * 86400000, bis: heute })),
  });
  assert.ok(schieflageAusSpeicher(store, balanceAttrappe(SCHIEF), "2026-09-29"));
});

test("Gemeldet wird die Kennung des Bereichs, nicht sein Name", async () => {
  const { schieflageAusSpeicher, schieflageMelden } = await import("./luecke.js");
  const store = speicherMitZeit();
  let gesendet = null;
  await schieflageMelden({
    store,
    worker: "https://w.example",
    endpoint: "https://web.push.apple.com/AB12",
    schieflage: schieflageAusSpeicher(store, balanceAttrappe(SCHIEF), "2026-09-29"),
    jetzt: new Date("2026-09-29T09:00:00"),
    holen: async (url, o) => { gesendet = JSON.parse(o.body); return { ok: true, json: async () => ({}) }; },
  });
  assert.equal(gesendet.art, "schieflage");
  assert.equal(gesendet.bereich, "me_time");
  assert.equal(gesendet.gegenBereich, "karriere");
  assert.equal(gesendet.prozent, 30);
  assert.equal("titel" in gesendet, false);
  assert.equal("name" in gesendet, false);
  assert.equal(store.getSettings().schieflageGemeldet, "2026-09-29");
});

test("Eine gemeldete Schieflage sperrt die nächsten drei Tage", async () => {
  const { schieflageAusSpeicher } = await import("./luecke.js");
  const store = speicherMitZeit(14, { schieflageGemeldet: "2026-09-28" });
  assert.equal(schieflageAusSpeicher(store, balanceAttrappe(SCHIEF), "2026-09-29"), null);
});
