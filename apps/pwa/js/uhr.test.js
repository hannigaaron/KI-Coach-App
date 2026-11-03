import test from "node:test";
import assert from "node:assert/strict";
import { planFuer } from "./plaene.js";
import { alsPropertyList, uhrEreignisseAnwenden, uhrMeldung, uhrPaket } from "./uhr.js";

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
  assert.deepEqual(e.trainings, [{ titel: "Ganzkörper A", saetze: 2, minuten: 52 }]);
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
