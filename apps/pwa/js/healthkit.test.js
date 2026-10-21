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
const { healthkitAbgleichen, healthkitSchreiben, workoutsSchreiben } = await import("./healthkit.js");
const { brauchtWiederherstellung, schnappschuss } = await import("./nativ.js");

const HEUTE = "2026-10-19";

function frisch() {
  localStorage.clear();
  store.setProfile({ name: "A", sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000, wakeTime: "07:00", sleepTime: "23:00", sessions: [] });
}

test("Tageswerte aus HealthKit landen in den Tagen, nach denselben Regeln wie der Export", () => {
  frisch();
  const b = healthkitSchreiben({ tage: [{ tag: "2026-10-18", schritte: 11840, schlafMinuten: 465, ruhepuls: 54, hrv: 62, aktivKcal: 640 }] }, { store, heute: HEUTE });
  assert.equal(b.schritte, 1);
  const d = store.getDay("2026-10-18");
  assert.equal(d.steps, 11840);
  assert.equal(d.gesundheit.schlafMinuten, 465);
  assert.ok(store.getSettings().healthNativ);
});

test("ein Workout aus Apple Fitness wird ein Training, beim zweiten Lesen nicht noch einmal", () => {
  frisch();
  const w = [{ id: "A1", tag: "2026-10-18", uhrzeit: "17:30", minuten: 52, art: "strength" }];
  assert.equal(workoutsSchreiben(w, { store, heute: HEUTE }), 1);
  assert.equal(workoutsSchreiben(w, { store, heute: HEUTE }), 0);
  const t = store.getDay("2026-10-18").trainings;
  assert.equal(t.length, 1);
  assert.equal(t[0].minutes, 52);
});

test("was der Nutzer selbst eingetragen hat, wird nicht durch die Uhr verdoppelt", () => {
  frisch();
  store.addTraining("2026-10-18", { id: "x", type: "strength", minutes: 60, at: "17:45", note: "" });
  const w = [
    { id: "A1", tag: "2026-10-18", uhrzeit: "17:30", minuten: 52, art: "strength" },
    { id: "A2", tag: "2026-10-18", uhrzeit: "20:00", minuten: 120, art: "team_sport" },
  ];
  assert.equal(workoutsSchreiben(w, { store, heute: HEUTE }), 1);
  assert.equal(store.getDay("2026-10-18").trainings.length, 2);
});

test("Kurze Aufzeichnungen und Tage in der Zukunft fallen weg", () => {
  frisch();
  const w = [
    { id: "B1", tag: "2026-10-18", uhrzeit: "08:00", minuten: 3, art: "cardio" },
    { id: "B2", tag: "2026-10-20", uhrzeit: "08:00", minuten: 40, art: "cardio" },
  ];
  assert.equal(workoutsSchreiben(w, { store, heute: HEUTE }), 0);
});

test("der erste Abgleich fragt nach der Erlaubnis und liest zwei Jahre, danach zwei Wochen", async () => {
  frisch();
  const aufrufe = [];
  const aufruf = async (plugin, methode, daten) => { aufrufe.push([methode, daten?.tage]); return { tage: [{ tag: "2026-10-18", schritte: 9000 }], workouts: [] }; };
  await healthkitAbgleichen({ aufruf, store, heute: HEUTE });
  await healthkitAbgleichen({ aufruf, store, heute: HEUTE });
  assert.deepEqual(aufrufe, [["berechtigen", undefined], ["lesen", 730], ["lesen", 14]]);
});

test("die Kopie kommt nur zurück, wenn der Speicher der Web Ansicht wirklich leer ist", () => {
  localStorage.clear();
  localStorage.setItem("daevo.v1.migrated", "1");
  const kopie = { "daevo.v1.profile": "{}", "daevo.v1.migrated": "1" };
  assert.equal(brauchtWiederherstellung(localStorage, kopie), true);
  localStorage.setItem("daevo.v1.profile", "{}");
  assert.equal(brauchtWiederherstellung(localStorage, kopie), false);
  assert.equal(brauchtWiederherstellung(localStorage, null), false);
  localStorage.setItem("fremd", "x");
  assert.deepEqual(Object.keys(schnappschuss(localStorage)).sort(), ["daevo.v1.migrated", "daevo.v1.profile"]);
});

test("der Plan der Mitteilungen: Impulse, Runterfahren zur eigenen Schlafenszeit, nichts aus der Vergangenheit", async () => {
  frisch();
  const { mitteilungsPlan, MAX_GEPLANT } = await import("./mitteilungen.js");
  const plan = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "12:00" } });
  assert.ok(plan.length <= MAX_GEPLANT);
  const heute = plan.filter((m) => m.tag === HEUTE);
  assert.ok(heute.every((m) => m.uhrzeit > "12:00"), "nichts vor jetzt");
  const runter = plan.find((m) => m.art === "runterfahren" && m.tag === HEUTE);
  assert.equal(runter.uhrzeit, "22:15", "45 Minuten vor 23:00");
  assert.ok(plan.some((m) => m.tag > HEUTE && m.art === "protein"));
});

test("die Lücke steht mit Antwortknöpfen im Plan und geht vor, wenn gekürzt wird", async () => {
  frisch();
  const { mitteilungsPlan } = await import("./mitteilungen.js");
  const plan = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "19:00" }, luecke: { titel: "5 Tage ohne Training", text: "Was ist dazwischen gekommen?" } });
  const l = plan.find((m) => m.art === "luecke");
  assert.equal(l.tag, "2026-10-20", "nach 18 Uhr erst morgen");
  assert.equal(l.kategorie, "luecke");
});

test("wer selbst ausgeschaltet hat, bekommt nichts geplant", async () => {
  frisch();
  store.setSettings({ ...store.getSettings(), mitteilungenAus: { impulse: true, runterfahren: true, morgen: true } });
  const { mitteilungsPlan } = await import("./mitteilungen.js");
  assert.equal(mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "06:00" } }).length, 0);
});

test("eigene Erinnerungen: feste Uhrzeit, vor dem Schlafen, und sie gehen beim Kürzen vor", async () => {
  frisch();
  const { mitteilungsPlan, MAX_GEPLANT } = await import("./mitteilungen.js");
  store.setSettings({ ...store.getSettings(), eigeneErinnerungen: [
    { id: "tab", text: "Schilddrüsentablette", uhrzeit: "07:30", tage: [1, 2, 3, 4, 5] },
    { id: "sup", text: "Abendliche Supplemente", bezug: "schlafen", versatz: -60, tage: [] },
  ] });
  const plan = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "06:00" } });
  const sup = plan.filter((m) => m.id.startsWith("eigene-sup-"));
  assert.equal(sup.length, 7);
  assert.ok(sup.every((m) => m.uhrzeit === "22:00" && m.text === "Abendliche Supplemente"), "eine Stunde vor 23:00");
  const tab = plan.filter((m) => m.id.startsWith("eigene-tab-"));
  assert.equal(tab.length, 5, "nur werktags");

  // Sechs tägliche Erinnerungen ergeben 42, dazu die Impulse: dann wird
  // gekürzt, und keine eigene darf dabei verloren gehen.
  store.setSettings({ ...store.getSettings(), eigeneErinnerungen: Array.from({ length: 6 }, (_, i) =>
    ({ id: `e${i}`, text: `Punkt ${i}`, uhrzeit: `0${i + 1}:15`, tage: [] })) });
  const voll = mitteilungsPlan({ store, jetzt: { tag: HEUTE, uhrzeit: "00:00" } });
  assert.equal(voll.length, MAX_GEPLANT);
  assert.equal(voll.filter((m) => m.art === "eigene").length, 42);
});

/* ---------- Ernährung aus Apple Health ---------- */

const { ernaehrungSchreiben, nahrungZusammenlegen, NAHRUNG_GLEICH_MINUTEN } = await import("./healthkit.js");
const wert = (feld, w, extra = {}) => ({ id: `${feld}${Math.random()}`, feld, wert: w, tag: "2026-10-18", uhrzeit: "12:30", quelle: "YAZIO", ...extra });

test("Einzelne Nährwerte werden zu einer Mahlzeit, je App und Minute", () => {
  const m = nahrungZusammenlegen([
    wert("kcal", 640), wert("proteinG", 42), wert("fatG", 18), wert("carbsG", 72),
    wert("kcal", 120, { uhrzeit: "16:00" }),
    wert("kcal", 300, { quelle: "MyFitnessPal" }),
  ]);
  assert.equal(m.length, 3);
  const mittag = m.find((x) => x.quelle === "YAZIO" && x.uhrzeit === "12:30");
  assert.deepEqual([mittag.kcal, mittag.proteinG, mittag.fatG, mittag.carbsG], [640, 42, 18, 72]);
});

test("Eine Mahlzeit als Korrelation gehört zusammen und trägt ihren Namen", () => {
  const m = nahrungZusammenlegen([
    wert("kcal", 400, { mahlzeit: "A", name: "Haferflocken", uhrzeit: "08:00" }),
    wert("proteinG", 20, { mahlzeit: "A", uhrzeit: "08:01" }),
  ]);
  assert.equal(m.length, 1);
  assert.equal(m[0].name, "Haferflocken");
});

test("Ohne Kalorien wird aus den Makros gerechnet", () => {
  const [m] = nahrungZusammenlegen([wert("proteinG", 10), wert("fatG", 10), wert("carbsG", 10)]);
  assert.equal(m.kcal, 170);
});

test("Mahlzeiten aus Health landen im Tag, neben einer eigenen in der Nähe zählen sie nicht", () => {
  frisch();
  store.addMeal("2026-10-18", { id: "eigen", text: "Reis", at: "12:50", source: "llm", entries: [{ name: "Reis", quantity: "200 g", kcal: 260, proteinG: 5, fatG: 1, carbsG: 56 }], feeling: null });
  const r = ernaehrungSchreiben([wert("kcal", 640), wert("kcal", 300, { uhrzeit: "19:00" })], { store, heute: HEUTE, von: "2026-10-10" });
  assert.equal(r.mahlzeiten, 1);
  assert.equal(r.uebersprungen, 1);
  const d = store.getDay("2026-10-18");
  assert.equal(d.meals.length, 2);
  const health = d.meals.find((m) => m.source === "health");
  assert.equal(health.quelle, "YAZIO");
  assert.equal(health.entries[0].kcal, 300);
  assert.equal(d.healthUebersprungen[0].kcal, 640);
  assert.equal(d.healthUebersprungen[0].eigeneUm, "12:50");
  assert.ok(NAHRUNG_GLEICH_MINUTEN >= 20);
});

test("Ein zweiter Abgleich legt nichts doppelt an und übernimmt Änderungen und Löschungen", () => {
  frisch();
  ernaehrungSchreiben([wert("kcal", 500), wert("kcal", 200, { uhrzeit: "18:00" })], { store, heute: HEUTE, von: "2026-10-10" });
  ernaehrungSchreiben([wert("kcal", 550)], { store, heute: HEUTE, von: "2026-10-10" });
  const d = store.getDay("2026-10-18");
  assert.equal(d.meals.length, 1, "die gelöschte Mahlzeit von 18 Uhr ist weg");
  assert.equal(d.meals[0].entries[0].kcal, 550);
});

test("Hier gelöscht bleibt gelöscht, hier korrigiert bleibt korrigiert", () => {
  frisch();
  ernaehrungSchreiben([wert("kcal", 500), wert("kcal", 200, { uhrzeit: "18:00" })], { store, heute: HEUTE, von: "2026-10-10" });
  const [a, b] = store.getDay("2026-10-18").meals;
  store.removeMeal("2026-10-18", a.id);
  const day = store.getDay("2026-10-18");
  day.meals = day.meals.map((m) => (m.id === b.id ? { ...m, korrigiert: true, entries: [{ ...m.entries[0], kcal: 150 }] } : m));
  store.setDay("2026-10-18", day);
  ernaehrungSchreiben([wert("kcal", 500), wert("kcal", 200, { uhrzeit: "18:00" })], { store, heute: HEUTE, von: "2026-10-10" });
  const danach = store.getDay("2026-10-18").meals;
  assert.equal(danach.length, 1);
  assert.equal(danach[0].entries[0].kcal, 150);
});

test("Ausgeschaltet entfernt die Mahlzeiten aus Health, eigene bleiben", () => {
  frisch();
  store.addMeal("2026-10-18", { id: "eigen", text: "Quark", at: "08:00", source: "llm", entries: [{ name: "Quark", quantity: "250 g", kcal: 170, proteinG: 30, fatG: 1, carbsG: 10 }], feeling: null });
  ernaehrungSchreiben([wert("kcal", 640)], { store, heute: HEUTE, von: "2026-10-10" });
  assert.equal(store.getDay("2026-10-18").meals.length, 2);
  store.setSettings({ ...store.getSettings(), healthErnaehrungAus: true });
  ernaehrungSchreiben([wert("kcal", 640)], { store, heute: HEUTE, von: "2026-10-10" });
  const d = store.getDay("2026-10-18");
  assert.deepEqual(d.meals.map((m) => m.id), ["eigen"]);
});

test("Eine ältere Hülle ohne Ernährung lässt Mahlzeiten aus Health stehen", () => {
  frisch();
  ernaehrungSchreiben([wert("kcal", 640)], { store, heute: HEUTE, von: "2026-10-10" });
  healthkitSchreiben({ tage: [], workouts: [] }, { store, heute: HEUTE });
  assert.equal(store.getDay("2026-10-18").meals.length, 1);
});

test("Wer vor der Ernährung schon zugestimmt hat, wird für die neuen Typen noch einmal gefragt", async () => {
  frisch();
  store.setSettings({ ...store.getSettings(), healthNativGefragt: true });
  const aufrufe = [];
  const aufruf = async (plugin, methode) => { aufrufe.push(methode); return methode === "lesen" ? { tage: [], workouts: [], nahrung: [] } : {}; };
  await healthkitAbgleichen({ aufruf, store, heute: HEUTE });
  await healthkitAbgleichen({ aufruf, store, heute: HEUTE });
  assert.deepEqual(aufrufe, ["berechtigen", "lesen", "lesen"]);
});
