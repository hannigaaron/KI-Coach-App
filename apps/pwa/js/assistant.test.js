import test from "node:test";
import assert from "node:assert/strict";

/**
 * Die Werkzeuge, die in die Tagesdaten schreiben.
 *
 * Diese Datei gibt es, weil jeder Fehler aus dem ersten Betriebswochenende in
 * genau dieser Schicht lag: doppelt gezählte Kalorien, ein Tagesplan als
 * Mahlzeit erfasst, eine Kalenderantwort, die an der Frage vorbeiging. Der
 * Rechenkern hatte über fünfhundert Tests, `assistant.js` mit 2300 Zeilen
 * hatte keinen einzigen.
 *
 * Getestet wird ohne Browser. `storage.js` und `assistant.js` fassen weder
 * `document` noch `window` an, sie brauchen nur `localStorage`. Der Ersatz
 * unten reicht deshalb aus, und damit läuft die Schicht, die die Daten des
 * Nutzers verändert, bei jedem `npm test` mit.
 *
 * Es gibt keinen API Schlüssel in dieser Umgebung. Alle Aufrufe laufen also
 * über den Regelweg, und genau der ist hier gemeint: er ist der Weg, der bei
 * jedem Fehler des Modells einspringt, und er ist die kostenlose Stufe des
 * Produkts.
 */

/** Ein Schlüsselspeicher im Arbeitsspeicher, mit demselben Verhalten. */
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
const { buildActions, dayNumbers, kalenderStandText, plausibelHinweis } = await import("./assistant.js");

const PROFIL = {
  name: "Aaron", sex: "male", ageYears: 23, heightCm: 184, weightKg: 87,
  goal: "maintain", dailySteps: 12000, wakeTime: "07:00", sleepTime: "23:00",
  sessions: [],
};

function frischerTag() {
  localStorage.clear();
  store.setProfile(PROFIL);
  return todayIso();
}

function postenVon(tag) {
  return store.getDay(tag).meals.flatMap((m) => (m.entries || []).map((e) => `${e.quantity} ${e.name}`));
}

function kcalVon(tag) {
  return Math.round(
    store.getDay(tag).meals.reduce((s, m) => s + (m.entries || []).reduce((t, e) => t + e.kcal, 0), 0),
  );
}

/* ---------- Mahlzeiten ---------- */

test("eine erfasste Mahlzeit landet mit Menge und Kalorien im Tag", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  const antwort = await aktionen.mahlzeitErfassen("200 g Magerquark");
  assert.match(antwort, /Eingetragen/);
  assert.deepEqual(postenVon(tag), ["200 g Magerquark"]);
  assert.ok(kcalVon(tag) > 0, "die Mahlzeit muss Kalorien tragen");
});

test("derselbe Posten wird innerhalb von zwei Stunden nicht zweimal gezählt", async () => {
  // Der Fehler aus dem Betrieb: das Modell schickt beim nächsten Eintrag die
  // ganze bisherige Liste nochmal mit, und aus 1700 wurden 5172 Kalorien.
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.mahlzeitErfassen("200 g Magerquark");
  const einmal = kcalVon(tag);

  const antwort = await aktionen.mahlzeitErfassen("200 g Magerquark und 150 g Reis");
  assert.equal(kcalVon(tag) > einmal, true, "der Reis muss dazukommen");
  assert.equal(postenVon(tag).filter((p) => p.includes("Magerquark")).length, 1);
  assert.match(antwort, /stand schon drin/);
});

test("wer wirklich zweimal dasselbe isst, erfährt warum es fehlt", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.mahlzeitErfassen("200 g Magerquark");
  const antwort = await aktionen.mahlzeitErfassen("200 g Magerquark");
  // Ein stiller Filter, der Essen verschluckt, wäre derselbe Fehler nochmal.
  assert.match(antwort, /zweimal/);
  assert.equal(postenVon(tag).length, 1);
});

test("aus einem Satz ohne Essen wird keine Mahlzeit", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  const antwort = await aktionen.mahlzeitErfassen("ich möchte heute zwei gute Mahlzeiten essen");
  assert.equal(store.getDay(tag).meals.length, 0);
  // Und die Antwort fragt nicht nach Mengen, sondern sagt, was los ist.
  assert.equal(/Wie viel war das ungefähr/.test(antwort), false, antwort);
});

/* ---------- Wasser, Gewicht, Training ---------- */

test("Wasser summiert sich und geht nicht ins Minus", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.wasserEintragen(500);
  await aktionen.wasserEintragen(300);
  assert.equal(store.getDay(tag).waterMl, 800);
  await aktionen.wasserEintragen(-5000);
  assert.equal(store.getDay(tag).waterMl >= 0, true, "eine negative Menge darf nichts kaputtmachen");
});

test("ein Gewicht landet im Tag und im Profil", async () => {
  // Beides ist nötig. Der Tag trägt den Verlauf, das Profil trägt die Ziele:
  // Grundumsatz, Protein, Fett und Wasser rechnen gegen `profile.weightKg`.
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.gewichtEintragen(86.4);
  assert.equal(store.getDay(tag).weightKg, 86.4);
  assert.equal(store.getProfile().weightKg, 86.4);
});

test("ein neues Gewicht verschiebt die Tagesziele", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  const vorher = dayNumbers(tag).targets;
  await aktionen.gewichtEintragen(78);
  const nachher = dayNumbers(tag).targets;
  assert.notEqual(nachher.kcal, vorher.kcal, "neun Kilo weniger müssen das Kalorienziel bewegen");
  assert.ok(nachher.kcal < vorher.kcal, "weniger Gewicht heisst weniger Grundumsatz");
});

test("ein unmögliches Gewicht lässt das Profil in Ruhe", async () => {
  frischerTag();
  const aktionen = buildActions({});
  await aktionen.gewichtEintragen(870);
  assert.equal(store.getProfile().weightKg, 87, "ein Tippfehler darf die Ziele nicht kippen");
});

test("ein Training landet mit Dauer im Tag", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.trainingEintragen({ art: "Krafttraining", minuten: 75 });
  const trainings = store.getDay(tag).trainings || [];
  assert.equal(trainings.length, 1);
  assert.equal(trainings[0].minutes, 75);
});

/* ---------- Aufgaben ---------- */

test("eine Aufgabe wird angelegt und lässt sich abhaken", async () => {
  frischerTag();
  const aktionen = buildActions({});
  await aktionen.aufgabeAnlegen({ text: "Angebot für YAN schreiben" });
  const offen = store.getAufgaben().filter((a) => !a.erledigt);
  assert.equal(offen.length, 1);
  assert.match(offen[0].text, /Angebot/);

  await aktionen.aufgabeAbhaken({ text: "Angebot" });
  assert.equal(store.getAufgaben().filter((a) => !a.erledigt).length, 0);
});

/* ---------- Die Zahlen des Tages ---------- */

test("die Tageszahlen zählen jede Mahlzeit genau einmal", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.mahlzeitErfassen("200 g Magerquark");
  await aktionen.mahlzeitErfassen("150 g Reis");
  const n = dayNumbers(tag);
  assert.equal(n.totals.kcal, kcalVon(tag), "Tageszahl und Summe der Posten müssen gleich sein");
  assert.ok(n.targets.kcal > 0, "ohne Ziel lässt sich kein Rest rechnen");
});

test("ein leerer Tag meldet null und nicht undefined", () => {
  const tag = frischerTag();
  const n = dayNumbers(tag);
  assert.equal(n.totals.kcal, 0);
  assert.equal(Number.isFinite(n.rest.kcal), true);
});

/* ---------- Kalender ---------- */

test("ohne Kalender sagt der Stand das, statt Termine zu erfinden", () => {
  frischerTag();
  const text = kalenderStandText();
  assert.match(text, /kein Kalender verbunden/i);
  assert.equal(/Termine liegen hier/.test(text), false);
});

test("mit Kalender nennt der Stand Anzahl und Quelle", () => {
  frischerTag();
  const jetzt = Date.now();
  store.setKalender({
    quellen: [{ name: "Google", anzahl: 2, stand: new Date().toISOString() }],
    termine: [
      { titel: "Kunde", von: jetzt + 3600000, bis: jetzt + 7200000, quelle: "Google" },
      { titel: "Training", von: jetzt + 86400000, bis: jetzt + 90000000, quelle: "Google" },
    ],
    stand: new Date().toISOString(),
  });
  const text = kalenderStandText();
  assert.match(text, /verbunden/);
  assert.match(text, /2 Termine/);
  assert.match(text, /Google/);
  // Der Grund, warum sich ein Kalender falsch anfühlt, gehört in die Antwort.
  assert.match(text, /Kopie und kein Abo/);
});

/* ---------- Zurücknehmen ---------- */

test("die letzte Mahlzeit lässt sich im Gespräch zurücknehmen", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.mahlzeitErfassen("200 g Magerquark");
  await aktionen.mahlzeitErfassen("150 g Reis");
  const antwort = await aktionen.eintragZuruecknehmen({});
  // Was weg ist, steht mit seinen Zahlen da, damit es sich neu eintragen lässt.
  assert.match(antwort, /Reis/);
  assert.match(antwort, /kcal/);
  assert.deepEqual(postenVon(tag), ["200 g Magerquark"]);
});

test("zurückgenommen wird genau ein Eintrag, nicht alles", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.mahlzeitErfassen("200 g Magerquark");
  await aktionen.mahlzeitErfassen("150 g Reis");
  await aktionen.mahlzeitErfassen("100 g Hähnchen");
  await aktionen.eintragZuruecknehmen({});
  assert.equal(store.getDay(tag).meals.length, 2, "ein Satz darf nicht den halben Tag löschen");
});

test("ein genannter Posten wird gezielt entfernt", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.mahlzeitErfassen("200 g Magerquark");
  await aktionen.mahlzeitErfassen("150 g Reis");
  await aktionen.eintragZuruecknehmen({ suche: "magerquark" });
  assert.equal(postenVon(tag).some((p) => p.includes("Magerquark")), false);
  assert.equal(postenVon(tag).some((p) => p.includes("Reis")), true);
});

test("ohne Eintrag wird nichts behauptet", async () => {
  frischerTag();
  const aktionen = buildActions({});
  const antwort = await aktionen.eintragZuruecknehmen({});
  assert.match(antwort, /keine Mahlzeit/);
});

test("ein Training lässt sich zurücknehmen", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.trainingEintragen({ art: "strength", minuten: 75 });
  await aktionen.eintragZuruecknehmen({ art: "training" });
  assert.equal((store.getDay(tag).trainings || []).length, 0);
});

/* ---------- Plausibilität ---------- */

test("ein normaler Tag bekommt keinen Hinweis", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  await aktionen.mahlzeitErfassen("200 g Magerquark");
  assert.equal(plausibelHinweis(tag), "");
});

test("ein unmöglicher Posten wird beim Eintragen gemeldet", async () => {
  const tag = frischerTag();
  const aktionen = buildActions({});
  // Von Hand gesetzt, weil der Regelweg solche Werte gar nicht erst erzeugt.
  // Geprüft wird die zweite Ebene: was passiert, wenn trotzdem so etwas steht.
  store.addMeal(tag, {
    id: "x1", text: "Reis", at: "16:00", source: "test", feeling: null,
    entries: [{ name: "Reis", quantity: "150 g", kcal: 1800, proteinG: 4, fatG: 1, carbsG: 30 }],
  });
  const hinweis = plausibelHinweis(tag);
  assert.match(hinweis, /kann so nicht stimmen/);
  assert.match(hinweis, /je Gramm/);
});
