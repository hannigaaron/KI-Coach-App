import test from "node:test";
import assert from "node:assert/strict";
import { einheitHaeltZns } from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";
import { aktualisierungHtml, planFuer, planPruefen } from "./plaene.js";
import {
  entwurfAbschliessen, entwurfBegonnen, entwurfNeu, entwurfTauschen, ersatzVorschlaege, satzAbhaken, satzDazu, satzSetzen,
  trainingHtml, zahlAus,
} from "./training.js";

const HEUTE = "2026-10-21";
const plan = { ...planFuer({ tage: 3, minuten: 60, niveau: "intermediate", ziel: "muskel" }), gespeichertAm: "2026-08-01T10:00:00Z" };
const nachId = new Map(UEBUNGEN.map((u) => [u.id, u]));

test("Zahlen mit Komma werden gelesen, leer bleibt leer", () => {
  assert.equal(zahlAus("62,5"), 62.5);
  assert.equal(zahlAus(""), null);
  assert.equal(zahlAus("abc"), null);
  assert.equal(zahlAus("0"), 0);
});

test("Der Entwurf übernimmt die Werte vom letzten Mal", () => {
  const id = plan.einheiten[0].positionen[0].id;
  const log = [{ datum: "2026-10-14", uebung: id, einheit: "Ganzkörper A", saetze: [{ kg: 60, wdh: 7, rir: 2 }, { kg: 50, wdh: 6, rir: 3 }] }];
  const e = entwurfNeu(plan, 0, log, HEUTE, "2026-10-21T17:00:00Z");
  const s = e.uebungen[0].saetze;
  assert.equal(s[0].kg, 60);
  assert.equal(s[1].kg, 50);
  assert.equal(s[0].rir, plan.einheiten[0].positionen[0].reserve);
  assert.ok(!entwurfBegonnen(e));
  const html = trainingHtml(e, log);
  assert.ok(html.includes("RIR") && !html.includes("10RM"));
  assert.ok(html.includes(">60<") || html.includes('value="60"'));
});

test("Nur abgehakte Sätze gehen ins Protokoll, und doppeltes Beenden zählt einmal", () => {
  let e = entwurfNeu(plan, 0, [], HEUTE, "2026-10-21T17:00:00Z");
  e = satzSetzen(e, 0, 0, "kg", 62.5);
  e = satzSetzen(e, 0, 0, "wdh", 8);
  e = satzSetzen(e, 0, 0, "rir", 2);
  e = satzAbhaken(e, 0, 0);
  e = satzDazu(e, 0);
  assert.equal(e.uebungen[0].saetze.length, plan.einheiten[0].positionen[0].saetze + 1);
  assert.ok(entwurfBegonnen(e));
  const r = entwurfAbschliessen(e, [], Date.parse("2026-10-21T18:05:00Z"));
  assert.equal(r.eintraege.length, 1);
  assert.deepEqual(r.eintraege[0].saetze, [{ kg: 62.5, wdh: 8, rir: 2 }]);
  assert.equal(r.minuten, 65);
  const zweimal = entwurfAbschliessen(e, r.log, Date.parse("2026-10-21T18:05:00Z"));
  assert.equal(zweimal.log.length, 1);
});

test("Ersetzen schlägt dieselbe Bewegung vor und ändert den Plan", () => {
  const p = plan.einheiten[0].positionen[0];
  const vorschlaege = ersatzVorschlaege(plan, 0, p.id);
  assert.ok(vorschlaege.length > 0 && vorschlaege.length <= 3);
  for (const v of vorschlaege) assert.equal(v.pattern, nachId.get(p.id).pattern);
  const e = entwurfNeu(plan, 0, [], HEUTE);
  const r = entwurfTauschen(e, plan, 0, vorschlaege[0].id, []);
  assert.equal(r.entwurf.uebungen[0].id, vorschlaege[0].id);
  assert.equal(r.plan.einheiten[0].positionen[0].id, vorschlaege[0].id);
  assert.equal(r.plan.einheiten[0].positionen[0].saetze, p.saetze);
});

test("Nach acht Wochen tauscht der Plan Festgefahrenes und bietet den alten Stand an", () => {
  const ids = plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  const log = [];
  for (let w = 0; w < 8; w++) {
    const datum = new Date(Date.UTC(2026, 7, 3 + w * 7)).toISOString().slice(0, 10);
    log.push({ datum, uebung: ids[0], saetze: [{ kg: 60 + w * 2.5, wdh: 8, rir: 2 }] });
    log.push({ datum, uebung: ids[1], saetze: [{ kg: 50, wdh: 8, rir: 2 }] });
  }
  const neu = planPruefen(plan, log, HEUTE);
  assert.ok(neu);
  const neueIds = neu.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  assert.ok(neueIds.includes(ids[0]));
  assert.ok(!neu.einheiten[0].positionen.some((p) => p.id === ids[1]));
  assert.ok(neu.aktualisierung.vorher);
  for (const e of neu.einheiten) assert.ok(einheitHaeltZns(e.positionen.map((p) => p.id)));
  assert.ok(aktualisierungHtml(neu, HEUTE).includes("Alten Plan behalten"));
  assert.equal(planPruefen({ ...plan, gespeichertAm: "2026-10-01T10:00:00Z" }, log, HEUTE), null);
});

test("Kein echter Plan stellt schweres Kreuzheben und schwere Kniebeugen in eine Einheit", () => {
  for (const tage of [1, 2, 3, 4, 5]) for (const minuten of [30, 45, 60, 75, 90]) for (const niveau of ["beginner", "intermediate", "advanced"]) {
    for (let variante = 0; variante < 4; variante++) {
      for (const e of planFuer({ tage, minuten, niveau, ziel: "kraft", variante }).einheiten) {
        assert.ok(einheitHaeltZns(e.positionen.map((p) => p.id)), `${tage}/${minuten}/${niveau} ${e.titel}`);
      }
    }
  }
});
