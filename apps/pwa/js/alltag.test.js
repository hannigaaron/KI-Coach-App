import test from "node:test";
import assert from "node:assert/strict";

/**
 * Die Fragen, die jeder Nutzer an jedem Tag stellt.
 *
 * Anlass: "Kurzes Briefing für morgen" lieferte den heutigen Tag. Eine
 * Nutzerin, die nach morgen fragt, bekommt morgen: Kalender und Aufgaben
 * dieses Tages, mit Wochentag und Datum, und nichts von heute.
 *
 * Gefragt wird hier über den Regelweg mit den echten Aktionen der App und
 * einem Kalender, in dem heute und morgen verschiedene Termine stehen.
 * Jede Antwort muss den richtigen Tag treffen: Termin von morgen drin,
 * Termin von heute nicht.
 */

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

const { store, todayIso } = await import("./storage.js");
const { buildActions } = await import("./assistant.js");
const { runOffline } = await import("@daevo/coach");
const { tagLang } = await import("@daevo/core");

function plus(tag, n) {
  const d = new Date(`${tag}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const um = (tag, uhr) => new Date(`${tag}T${uhr}:00`).getTime();

let heute, morgen, uebermorgen;

async function einrichten() {
  localStorage.clear();
  heute = todayIso();
  morgen = plus(heute, 1);
  uebermorgen = plus(heute, 2);
  const wochentag = (t) => new Date(`${t}T12:00:00`).getDay();
  store.setProfile({
    name: "Aaron", sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain",
    dailySteps: 12000, wakeTime: "06:30", sleepTime: "23:00",
    sessions: [{ weekday: wochentag(morgen), type: "strength", startsAt: "17:30", minutes: 60 }],
  });
  const t = (titel, tag, von, bis, uid) => ({ uid, titel, von: um(tag, von), bis: um(tag, bis), quelle: "Google" });
  store.setKalender({
    quellen: [{ name: "Google", anzahl: 5, stand: new Date().toISOString() }],
    stand: new Date().toISOString(),
    termine: [
      t("Heute Kundentermin Lena", heute, "10:00", "11:00", "h1"),
      t("Heute Papiermüll raus", heute, "20:00", "20:15", "h2"),
      t("Morgen Studio Frühschicht", morgen, "06:00", "14:00", "m1"),
      t("Morgen Call Silke", morgen, "15:00", "15:30", "m2"),
      t("Übermorgen Zahnarzt", uebermorgen, "09:00", "10:00", "u1"),
    ],
  });
  const a = buildActions({});
  await a.aufgabeAnlegen({ text: "Angebot für Denise schreiben", minuten: 45, faellig: morgen, wichtigkeit: 3 });
  await a.aufgabeAnlegen({ text: "Rechnung Müller verschicken", minuten: 15, faellig: morgen });
  await a.aufgabeAnlegen({ text: "Heute Reel schneiden", minuten: 30, faellig: heute });
}

async function frage(satz) {
  const r = await runOffline(satz, buildActions({}));
  return r.text;
}

const MORGEN_TREFFER = [/Studio Frühschicht/, /Call Silke/];
const HEUTE_TREFFER = [/Kundentermin Lena/, /Papiermüll/];

async function pruefeMorgen(satz, { mitAufgaben = true } = {}) {
  await einrichten();
  const t = await frage(satz);
  const lang = tagLang(morgen);
  assert.match(t, new RegExp(lang.split(",")[0]), `${satz}: der Wochentag von morgen fehlt\n${t}`);
  for (const re of MORGEN_TREFFER) assert.match(t, re, `${satz}: Termin von morgen fehlt\n${t}`);
  for (const re of HEUTE_TREFFER) assert.doesNotMatch(t, re, `${satz}: Termin von heute steht drin\n${t}`);
  if (mitAufgaben) {
    assert.match(t, /Angebot für Denise/, `${satz}: Aufgabe von morgen fehlt\n${t}`);
    assert.match(t, /Rechnung Müller/, `${satz}: Aufgabe von morgen fehlt\n${t}`);
  }
  return t;
}

for (const satz of [
  "Kurzes Briefing für morgen, bitte.",
  "Briefing für morgen",
  "Gib mir ein Briefing für morgen",
  "Was steht morgen an?",
  "Was steht morgen an",
  "Wie sieht morgen aus?",
  "Wie sieht mein Morgen aus?",
  "Was habe ich morgen?",
  "Was hab ich morgen vor?",
  "Was muss ich morgen machen?",
  "Was muss ich morgen alles erledigen?",
  "Was ist morgen los?",
  "Welche Termine habe ich morgen?",
  "Was steht morgen im Kalender?",
  "Zeig mir meinen Kalender für morgen",
  "Gib mir eine Übersicht für morgen",
  "Was sind meine To-Dos für morgen?",
  "Welche Aufgaben habe ich morgen?",
  "Hey daevo, was ist morgen?",
  "Wie ist morgen mein Tag?",
  "Plan mir meinen Tag für morgen",
  "Erstelle einen Tagesplan für morgen",
]) {
  test(`Alltag: "${satz}" liefert morgen mit Kalender und Aufgaben`, async () => {
    await pruefeMorgen(satz);
  });
}

test("Alltag: übermorgen liefert übermorgen und nichts von morgen", async () => {
  await einrichten();
  const t = await frage("Was steht übermorgen an?");
  assert.match(t, /Zahnarzt/);
  assert.doesNotMatch(t, /Studio Frühschicht|Kundentermin/);
});

test("Alltag: ein Wochentag liefert genau diesen Tag", async () => {
  await einrichten();
  const name = tagLang(uebermorgen).split(",")[0];
  const t = await frage(`Was steht am ${name} an?`);
  assert.match(t, /Zahnarzt/);
});

test("Alltag: Briefing für heute zeigt heute und nicht morgen", async () => {
  await einrichten();
  const t = await frage("Kurzes Briefing für heute");
  assert.match(t, /Kundentermin Lena/);
  assert.doesNotMatch(t, /Studio Frühschicht/);
});

test("Alltag: Guten Morgen ist keine Frage nach morgen", async () => {
  await einrichten();
  const t = await frage("Guten Morgen");
  assert.doesNotMatch(t, /Studio Frühschicht/);
});

test("Alltag: was soll ich morgen essen nennt morgen", async () => {
  await einrichten();
  const t = await frage("Was würdest du mir morgen zu essen empfehlen?");
  assert.ok(t.length > 40, t);
  assert.doesNotMatch(t, /Kundentermin Lena/, t);
});

test("Alltag: wann soll ich morgen trainieren nennt die Uhrzeit von morgen", async () => {
  await einrichten();
  const t = await frage("Wann soll ich morgen trainieren?");
  assert.match(t, /17:30/, t);
});

test("Alltag: was trainiere ich morgen kommt aus dem Plan", async () => {
  await einrichten();
  const t = await frage("Was trainiere ich morgen?");
  assert.match(t, /17:30|Krafttraining/, t);
});

test("Alltag: ein Befehl mit morgen bleibt ein Befehl", async () => {
  await einrichten();
  const t = await frage("Erinnere mich morgen um 9 Uhr an die Tablette");
  assert.doesNotMatch(t, /Studio Frühschicht/, t);
});

/* ---------- Der Weg über das Modell: die Werkzeuge selbst ---------- */

test("Werkzeug briefing_erstellen mit tag morgen liefert morgen, auch mit art morgen", async () => {
  await einrichten();
  const a = buildActions({});
  // Genau so rief das Modell es auf: art morgen und der Satz "für morgen".
  const t = await a.briefingErstellen({ art: "morgen", tag: "morgen" });
  assert.match(t, /Studio Frühschicht/);
  assert.match(t, new RegExp(tagLang(morgen).split(",")[0]));
  assert.doesNotMatch(t, /Kundentermin Lena/);
});

test("Werkzeug briefing_erstellen ohne tag bleibt das Briefing von heute", async () => {
  await einrichten();
  const t = await buildActions({}).briefingErstellen({ art: "morgen" });
  assert.match(t, /Kundentermin Lena/);
  assert.doesNotMatch(t, /Studio Frühschicht/);
});

test("Werkzeug briefing_erstellen mit unlesbarem Tag fragt nach, statt heute zu nehmen", async () => {
  await einrichten();
  const t = await buildActions({}).briefingErstellen({ tag: "irgendwann" });
  assert.match(t, /Welchen Tag/);
});

test("Werkzeug kalender_abrufen mit tag liefert nur diesen Tag", async () => {
  await einrichten();
  const t = await buildActions({}).kalenderAbrufen({ tag: "morgen" });
  assert.match(t, /Studio Frühschicht/);
  assert.match(t, /Call Silke/);
  assert.doesNotMatch(t, /Kundentermin Lena|Zahnarzt/);
});

test("Werkzeug tagesablauf_planen versteht morgen als Wort", async () => {
  await einrichten();
  const t = await buildActions({}).tagesablaufPlanen({ tag: "morgen" });
  assert.match(t, /Studio Frühschicht/);
  assert.doesNotMatch(t, /Kundentermin Lena/);
});

test("Werkzeug trainingZeit nennt Uhrzeit und Konflikt von morgen", async () => {
  await einrichten();
  const t = await buildActions({}).trainingZeit({ tag: "morgen" });
  assert.match(t, /17:30/);
});

test("Ein Tag ohne Training im Plan bekommt einen freien Platz statt einer Erfindung", async () => {
  await einrichten();
  const t = await buildActions({}).trainingZeit({ tag: "übermorgen" });
  assert.match(t, /kein Training/);
  assert.match(t, /frei/);
});
