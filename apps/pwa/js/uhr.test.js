import test from "node:test";
import assert from "node:assert/strict";
import { planFuer } from "./plaene.js";
import { alsPropertyList, uhrAufgaben, uhrEreignisseAnwenden, uhrMeldung, uhrPaket, uhrTermine } from "./uhr.js";

const HEUTE = "2026-11-02";

function speicher(settings = {}) {
  let s = settings;
  const tage = {};
  return {
    getSettings: () => s,
    setSettings: (n) => { s = n; },
    addWater: (tag, ml) => { tage[tag] = { ...(tage[tag] || {}), waterMl: ((tage[tag] || {}).waterMl || 0) + ml }; },
    addTraining: (tag, t) => { tage[tag] = { ...(tage[tag] || {}), trainings: [...((tage[tag] || {}).trainings || []), t] }; },
    tage,
  };
}

test("das Paket für die Uhr trägt den Tag und die Trainings mit den Werten vom letzten Mal", () => {
  const plan = planFuer({ tage: 3, minuten: 45, erfahrung: "fortgeschritten", ziel: "muskelaufbau" });
  const erste = plan.einheiten[0].positionen[0];
  const log = [{ datum: "2026-10-30", uebung: erste.id, einheit: plan.einheiten[0].titel, saetze: [{ kg: 80, wdh: 8, rir: 2 }] }];
  const p = uhrPaket({
    settings: { plan, trainingslog: log },
    zahlen: { targets: { kcal: 2900, proteinG: 170, waterMl: 3500 }, totals: { kcal: 1234.4, proteinG: 88, waterMl: 1500 } },
    heute: HEUTE,
  });
  assert.deepEqual(p.stand, { kcal: 1234, kcalZiel: 2900, protein: 88, proteinZiel: 170, wasserMl: 1500, wasserZiel: 3500 });
  assert.equal(p.trainings.length, plan.einheiten.length);
  const u = p.trainings[0].entwurf.uebungen[0];
  assert.equal(u.id, erste.id);
  assert.equal(u.saetze[0].kg, 80);
  assert.ok(u.pauseSek > 0);
  assert.ok(JSON.stringify(p).length < 20000, "Das Paket muss klein bleiben, es geht über Bluetooth");
});

test("ein Training von der Uhr landet im Protokoll und im Tag, doppelt zugestellt zählt es einmal", () => {
  const st = speicher({ trainingslog: [] });
  const training = {
    id: "u1", art: "training", titel: "Ganzkörper A", datum: HEUTE, start: "2026-11-02T17:00:00.000Z", ende: "2026-11-02T17:52:00.000Z",
    uebungen: [
      { id: "kniebeuge", name: "Kniebeuge", saetze: [{ kg: 100, wdh: 6, rir: 2, fertig: true }, { kg: 100, wdh: 5, rir: 1, fertig: true }, { kg: 100, wdh: 0, rir: null, fertig: false }] },
      { id: "latzug", name: "Latzug", saetze: [{ kg: 60, wdh: 10, rir: 2, fertig: false }] },
    ],
  };
  const e = uhrEreignisseAnwenden([training, { id: "w1", art: "wasser", ml: 250 }, training], { store: st, heute: HEUTE, neueId: () => "t1" });
  assert.deepEqual(e.trainings.map(({ titel, saetze, minuten }) => ({ titel, saetze, minuten })), [{ titel: "Ganzkörper A", saetze: 2, minuten: 52 }]);
  assert.equal(e.trainings[0].datum, "2026-11-02");
  assert.equal(e.wasserMl, 250);
  const log = st.getSettings().trainingslog;
  assert.equal(log.length, 1);
  assert.equal(log[0].uebung, "kniebeuge");
  assert.equal(st.tage[HEUTE].trainings.length, 1);
  assert.match(uhrMeldung(e), /Ganzkörper A von der Uhr gespeichert, 2 Sätze in 52 Minuten\. 250 ml Wasser von der Uhr/);
  const nochmal = uhrEreignisseAnwenden([training], { store: st, heute: HEUTE, neueId: () => "t2" });
  assert.equal(nochmal.trainings.length, 0);
});

test("ein Training ohne abgehakten Satz wird nicht gespeichert", () => {
  const st = speicher();
  const e = uhrEreignisseAnwenden([{ id: "u2", art: "training", titel: "Push", uebungen: [{ id: "bankdruecken", saetze: [{ kg: 80, wdh: 8, fertig: false }] }] }], { store: st, heute: HEUTE, neueId: () => "x" });
  assert.equal(e.trainings.length, 0);
  assert.equal(st.tage[HEUTE], undefined);
});

test("das Paket enthält kein null, sonst lehnt iOS den ganzen Application Context ab", () => {
  // Ein Plan ohne Protokoll: jedes Gewicht ist leer, genau der Fall, der vorher null schickte.
  const plan = planFuer({ tage: 3, minuten: 60, erfahrung: "einsteiger", ziel: "muskelaufbau" });
  const p = uhrPaket({ settings: { plan, trainingslog: [] }, zahlen: {}, heute: HEUTE });
  assert.ok(p.trainings.length > 0);
  assert.ok(alsPropertyList(p), JSON.stringify(p).slice(0, 300));
  const satz = p.trainings[0].entwurf.uebungen[0].saetze[0];
  assert.equal("kg" in satz, false);
  assert.equal(satz.fertig, false);
  assert.equal(alsPropertyList({ a: [1, { b: null }] }), false);
});

test("der Zugang zur KI geht mit, wenn er da ist, und ohne null", () => {
  const zahlen = { targets: { kcal: 2900, proteinG: 170, waterMl: 3500 }, totals: { kcal: 0, proteinG: 0, waterMl: 0 } };
  const ki = { url: "https://worker.example/chat", token: "t", modell: "claude-sonnet-5-5", system: "Du bist daevo.", sprechen: true };
  const mit = uhrPaket({ settings: {}, zahlen, heute: HEUTE, ki });
  assert.deepEqual(mit.ki, ki);
  assert.equal(alsPropertyList(mit), true);
  const ohne = uhrPaket({ settings: {}, zahlen, heute: HEUTE, ki: null });
  assert.equal("ki" in ohne, false);
});

test("Vorgemerktes und Gespräche von der Uhr kommen getrennt zurück, doppelt zugestellt einmal", () => {
  const st = speicher({});
  const ereignisse = [
    { id: "s1", art: "satz", text: "200 g Magerquark gegessen" },
    { id: "s1", art: "satz", text: "200 g Magerquark gegessen" },
    { id: "g1", art: "gespraech", frage: "Wie viel Eiweiß fehlt noch?", antwort: "Noch 82 Gramm.", at: "2026-11-02T10:00:00Z" },
    { id: "g2", art: "gespraech", frage: "", antwort: "leer" },
  ];
  const e = uhrEreignisseAnwenden(ereignisse, { store: st, heute: HEUTE, neueId: () => "x" });
  assert.deepEqual(e.saetze, ["200 g Magerquark gegessen"]);
  assert.equal(e.gespraech.length, 1);
  assert.equal(e.gespraech[0].antwort, "Noch 82 Gramm.");
});

test("Termine für die Uhr: nur ab jetzt, ohne Schlafmarker, derselbe Termin einmal", () => {
  const jetzt = new Date(`${HEUTE}T10:00:00`).getTime();
  const h = 3_600_000;
  const t = uhrTermine([
    { titel: "Vorbei", von: jetzt - 3 * h, bis: jetzt - 2 * h },
    { titel: "Läuft", von: jetzt - h / 2, bis: jetzt + h / 2 },
    { titel: "Kunde Müller", von: jetzt + 2 * h, bis: jetzt + 3 * h, ort: "Studio" },
    { titel: "Kunde Müller", von: jetzt + 2 * h, bis: jetzt + 3 * h },
    { titel: "SLEEP", von: jetzt + 12 * h, bis: jetzt + 20 * h },
    { titel: "In drei Wochen", von: jetzt + 21 * 24 * h, bis: jetzt + 21 * 24 * h + h },
  ], jetzt);
  assert.deepEqual(t.map((x) => x.titel), ["Läuft", "Kunde Müller"]);
  assert.equal(t[1].ort, "Studio");
  assert.ok(alsPropertyList(t));
});

test("Aufgaben für die Uhr in der Reihenfolge des Plans, mit Uhrzeit aus dem Tagesplan", () => {
  const von = new Date(`${HEUTE}T14:30:00`).getTime();
  const a = uhrAufgaben({
    plan: {
      heute: [{ id: "a1", text: "Angebot schreiben", wichtigkeit: 3, quelle: "nutzer" }, { id: "td-9", text: "Rechnung", wichtigkeit: 2, quelle: "todoist" }],
      morgen: [{ id: "a3", text: "Steuer", wichtigkeit: 2, faellig: "2026-11-05" }],
    },
    zeiten: { bloecke: [{ aufgabe: { id: "a1" }, von, bis: von + 3_600_000 }] },
  });
  assert.deepEqual(a.map((x) => [x.id, x.wann, x.uhrzeit ?? null, x.wichtig, x.todoist]), [
    ["a1", "heute", "14:30", true, false],
    ["td-9", "heute", null, false, true],
    ["a3", "spaeter", null, false, false],
  ]);
  assert.ok(alsPropertyList(a));
});

test("auf der Uhr abgehakte Aufgaben kommen als Kennungen zurück, doppelt zugestellt einmal", () => {
  const store = speicher({});
  const e = { id: "u1", art: "aufgabe", aufgabeId: "a1" };
  const r = uhrEreignisseAnwenden([e, e, { id: "u2", art: "aufgabe", aufgabeId: "a1" }], { store, heute: HEUTE, neueId: () => "x" });
  assert.deepEqual(r.erledigt, ["a1"]);
});

import { entwurfMitUhr, uhrPaket as paketFuer } from "./uhr.js";

test("ein Training auf der Uhr läuft am iPhone mit, neue Übungen kommen dazu", () => {
  const am = { ei: -1, frei: true, titel: "Pull", datum: "2026-11-15", start: "2026-11-15T13:00:00Z", aktiv: 0, uebungen: [
    { id: "a", name: "A", ziel: { saetze: 2, wdh: "8-12", reserve: 2, pauseSek: 90 }, saetze: [{ kg: 50, wdh: 10, rir: 2, fertig: true }, { kg: 50, wdh: 10, rir: 2, fertig: false }] },
  ] };
  const stand = { titel: "Pull", datum: "2026-11-15", start: null, uebungen: [
    { id: "a", name: "A", saetze: [{ kg: 40, wdh: 8, rir: 2, fertig: true }, { kg: 52.5, wdh: 9, rir: 1, fertig: true }] },
    { id: "b", name: "B", saetze: [{ kg: 20, wdh: 12, rir: 2, fertig: false }] },
  ] };
  const neu = entwurfMitUhr(am, stand);
  assert.equal(neu.uebungen[0].saetze[0].kg, 50, "hier Abgehaktes bleibt");
  assert.equal(neu.uebungen[0].saetze[1].kg, 52.5, "auf der Uhr Abgehaktes kommt");
  assert.equal(neu.uebungen[1].id, "b");
  assert.equal(neu.aktiv, 1);
  assert.equal(entwurfMitUhr(null, stand).titel, "Pull", "ohne Training am iPhone wird der Stand der Uhr eins");
});

test("ein laufendes Training für heute steht auf der Uhr nur einmal, mit Pause", () => {
  const settings = { trainingslog: [], trainingEntwurf: { titel: "Training für heute", datum: "2026-11-15", start: "2026-11-15T13:00:00Z", aktiv: 0, uebungen: [
    { id: "x", name: "X", ziel: { wdh: "8-12", pauseSek: 90 }, saetze: [{ kg: 10, wdh: 10, fertig: false }] },
  ] }, trainingPause: { bis: Date.now() + 60000 } };
  const p = paketFuer({ settings, zahlen: {}, heute: "2026-11-15" });
  const offen = p.trainings.filter((t) => t.titel === "Training für heute");
  assert.equal(offen.length, 1);
  assert.equal(offen[0].quelle, "offen");
  assert.ok(offen[0].pauseBis > Date.now());
  assert.ok(alsPropertyList(p));
});
