import { test } from "node:test";
import assert from "node:assert/strict";
import {
  periodeBeginnen, periodeBeenden, symptomUmschalten, vorhersageText, zyklusEmpfehlung, zyklusStand, zyklusText,
  type ZyklusDaten,
} from "./zyklus.js";

const daten: ZyklusDaten = {
  an: true,
  perioden: [
    { beginn: "2026-07-11", ende: "2026-07-15" },
    { beginn: "2026-08-08", ende: "2026-08-12" },
    { beginn: "2026-09-08", ende: "2026-09-12" },
    { beginn: "2026-10-07", ende: "2026-10-11" },
  ],
};

test("Phase und Vorhersage kommen aus den eigenen Zyklen", () => {
  const s = zyklusStand(daten, "2026-10-20");
  assert.equal(s.tag, 14);
  assert.deepEqual(s.laengen, [28, 31, 29]);
  assert.equal(s.laenge, 29);
  assert.equal(s.periodenDauer, 5);
  assert.equal(s.phase, "eisprung");
  assert.equal(zyklusStand(daten, "2026-10-18").phase, "follikel");
  assert.equal(s.naechste, "2026-11-05");
  assert.equal(s.spanne, 2);
  assert.equal(zyklusStand(daten, "2026-10-09").phase, "periode");
  assert.equal(zyklusStand(daten, "2026-10-22").phase, "eisprung");
  assert.equal(zyklusStand(daten, "2026-10-23").phase, "luteal");
  assert.equal(zyklusStand(daten, "2026-10-30").phase, "luteal");
  assert.equal(vorhersageText(s, (d) => d), "Periode etwa am 2026-11-05, ±2 Tage");
});

test("ohne Einträge gibt es keinen Stand, mit hormoneller Verhütung keine Phasen", () => {
  assert.equal(zyklusStand({ an: true }, "2026-10-20").bekannt, false);
  const h = zyklusStand({ ...daten, verhuetung: "hormonell" }, "2026-10-20");
  assert.equal(h.phase, null);
  assert.equal(h.naechste, null);
  assert.match(vorhersageText(h, (d) => d), /keine natürlichen Phasen/);
});

test("die Phase allein ändert nichts, die Symptome schon", () => {
  const s = zyklusStand(daten, "2026-10-08");
  assert.equal(zyklusEmpfehlung(s, []).stufe, "normal");
  assert.match(zyklusEmpfehlung(s, []).training, /Phase allein ist kein Grund/);
  assert.equal(zyklusEmpfehlung(s, ["stimmung", "blaehbauch"]).stufe, "normal");
  const r = zyklusEmpfehlung(s, ["muede"]);
  assert.equal(r.stufe, "reduziert");
  assert.match(r.training, /wegen müde mit drei Vierteln der Sätze/);
  const l = zyklusEmpfehlung(s, ["kraempfe", "muede"], "stark");
  assert.equal(l.stufe, "leicht");
  assert.match(l.training, /Krämpfe bei vielen Frauen/);
  assert.match(l.essen ?? "", /eisenreich/);
});

test("eine lange ausbleibende Periode und ungewöhnliche Zyklen werden angesprochen", () => {
  const s = zyklusStand(daten, "2027-01-10");
  assert.equal(s.ausgeblieben, 95);
  assert.match(zyklusEmpfehlung(s).hinweis ?? "", /Ärztin oder einem Arzt/);
  const kurz = zyklusStand({ perioden: [{ beginn: "2026-08-01" }, { beginn: "2026-08-19" }, { beginn: "2026-09-06" }, { beginn: "2026-09-24" }] }, "2026-09-30");
  assert.equal(kurz.ausserhalbUeblich, true);
});

test("Eintragen, Beenden und Symptome", () => {
  let d = periodeBeginnen({}, "2026-11-04");
  assert.equal(d.an, true);
  d = periodeBeginnen(d, "2026-11-06");
  assert.equal(d.perioden?.length, 1);
  d = periodeBeenden(d, "2026-11-08");
  assert.equal(d.perioden?.[0]?.ende, "2026-11-08");
  d = symptomUmschalten(d, "2026-11-05", "kraempfe");
  d = symptomUmschalten(d, "2026-11-05", "muede");
  d = symptomUmschalten(d, "2026-11-05", "kraempfe");
  assert.deepEqual(d.symptome?.["2026-11-05"], ["muede"]);
  assert.deepEqual(symptomUmschalten(d, "2026-11-05", "keine").symptome?.["2026-11-05"], []);
  assert.match(zyklusText(d, "2026-11-05", (x) => x), /^Zyklustag 2, Periode\./);
});

test("Blutungstage aus Apple Health werden Perioden, eigene Einträge gewinnen", async () => {
  const { zyklusAusHealth } = await import("./zyklus.js");
  const health = [
    { tag: "2026-09-08", staerke: "mittel" as const }, { tag: "2026-09-09", staerke: "stark" as const },
    { tag: "2026-09-11", staerke: "leicht" as const },
    { tag: "2026-10-07", staerke: "mittel" as const }, { tag: "2026-10-08", staerke: "mittel" as const },
  ];
  const d = zyklusAusHealth({ perioden: [{ beginn: "2026-10-06" }], blutung: { "2026-10-07": "leicht" } }, health, { anschalten: true });
  assert.equal(d.an, true);
  assert.deepEqual(d.perioden, [{ beginn: "2026-09-08", ende: "2026-09-11" }, { beginn: "2026-10-06", ende: "2026-10-08" }]);
  assert.equal(d.blutung?.["2026-10-07"], "leicht");
  assert.equal(d.blutung?.["2026-09-09"], "stark");
  assert.equal(zyklusAusHealth({}, []).perioden, undefined);
});
