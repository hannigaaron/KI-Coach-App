import assert from "node:assert/strict";
import test from "node:test";
import { healthBericht, healthLesen, healthSammler } from "./health.js";

function rec(attrs: Record<string, string>): string {
  const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ");
  return `<Record ${a}/>`;
}

const schritte = (tag: string, wert: number) =>
  rec({
    type: "HKQuantityTypeIdentifierStepCount",
    sourceName: "Aarons Apple Watch",
    unit: "count",
    startDate: `${tag} 08:00:00 +0200`,
    endDate: `${tag} 08:10:00 +0200`,
    value: String(wert),
  });

test("Schritte werden über den Tag summiert", () => {
  const e = healthLesen([schritte("2026-09-28", 1200), schritte("2026-09-28", 800)].join("\n"));
  assert.equal(e.tage.length, 1);
  assert.equal(e.tage[0]?.schritte, 2000);
  assert.equal(e.verwertet, 2);
});

test("Puls und HRV werden gemittelt, nicht summiert", () => {
  const puls = (wert: number) =>
    rec({
      type: "HKQuantityTypeIdentifierRestingHeartRate",
      unit: "count/min",
      startDate: "2026-09-28 08:00:00 +0200",
      endDate: "2026-09-28 08:00:00 +0200",
      value: String(wert),
    });
  const e = healthLesen([puls(50), puls(60), puls(58)].join(""));
  assert.equal(e.tage[0]?.ruhepuls, 56);
});

test("Gewicht in Pfund wird umgerechnet", () => {
  const e = healthLesen(
    rec({
      type: "HKQuantityTypeIdentifierBodyMass",
      unit: "lb",
      startDate: "2026-09-28 07:00:00 +0200",
      endDate: "2026-09-28 07:00:00 +0200",
      value: "191.8",
    }),
  );
  assert.equal(e.tage[0]?.gewichtKg, 87);
});

test("Schlaf zählt nur echten Schlaf, nicht die Liegezeit", () => {
  const bett = rec({
    type: "HKCategoryTypeIdentifierSleepAnalysis",
    value: "HKCategoryValueSleepAnalysisInBed",
    startDate: "2026-09-27 22:00:00 +0200",
    endDate: "2026-09-28 07:00:00 +0200",
  });
  const kern = rec({
    type: "HKCategoryTypeIdentifierSleepAnalysis",
    value: "HKCategoryValueSleepAnalysisAsleepCore",
    startDate: "2026-09-27 23:00:00 +0200",
    endDate: "2026-09-28 06:00:00 +0200",
  });
  const e = healthLesen(bett + kern);
  assert.equal(e.tage.length, 1);
  assert.equal(e.tage[0]?.schlafMinuten, 420, "sieben Stunden, nicht neun");
});

test("Eine Nacht zählt auf den Aufwachtag", () => {
  const e = healthLesen(
    rec({
      type: "HKCategoryTypeIdentifierSleepAnalysis",
      value: "HKCategoryValueSleepAnalysisAsleepDeep",
      startDate: "2026-09-27 23:30:00 +0200",
      endDate: "2026-09-28 06:30:00 +0200",
    }),
  );
  assert.equal(e.tage[0]?.tag, "2026-09-28");
});

test("Mehrere Schlafphasen einer Nacht werden addiert", () => {
  const phase = (von: string, bis: string) =>
    rec({
      type: "HKCategoryTypeIdentifierSleepAnalysis",
      value: "HKCategoryValueSleepAnalysisAsleepREM",
      startDate: `2026-09-28 ${von} +0200`,
      endDate: `2026-09-28 ${bis} +0200`,
    });
  const e = healthLesen(phase("01:00:00", "02:00:00") + phase("03:00:00", "03:30:00"));
  assert.equal(e.tage[0]?.schlafMinuten, 90);
});

test("Unbekannte Typen werden gezählt und übersprungen", () => {
  const e = healthLesen(
    rec({ type: "HKQuantityTypeIdentifierDietaryWater", startDate: "2026-09-28 08:00:00 +0200", value: "500" })
    + schritte("2026-09-28", 100),
  );
  assert.equal(e.gelesen, 2);
  assert.equal(e.verwertet, 1);
});

test("Ein Datensatz an der Stückgrenze geht nicht verloren", () => {
  // Genau der Fehler, den ein Test finden muss: bei einer Datei mit einer
  // Million Einträgen fällt ein fehlender pro Stück niemandem auf.
  const ganz = [schritte("2026-09-28", 1000), schritte("2026-09-28", 2000), schritte("2026-09-28", 3000)].join("");
  for (const schnitt of [5, 30, 77, 120, ganz.length - 3]) {
    const s = healthSammler();
    s.fuettern(ganz.slice(0, schnitt));
    s.fuettern(ganz.slice(schnitt));
    assert.equal(s.ergebnis().tage[0]?.schritte, 6000, `Schnitt bei ${schnitt}`);
  }
});

test("Ein kaputtes Datum wird übersprungen, statt einen Tag zu erfinden", () => {
  const e = healthLesen(
    rec({ type: "HKQuantityTypeIdentifierStepCount", startDate: "kein datum", value: "500" }),
  );
  assert.equal(e.tage.length, 0);
  assert.equal(e.gelesen, 1);
});

test("Ein leerer Export sagt das, statt still nichts zu tun", () => {
  const e = healthLesen("<HealthData locale=\"de_DE\"></HealthData>");
  assert.equal(e.tage.length, 0);
  assert.match(healthBericht(e), /export\.xml/);
});

test("Der Bericht nennt Zeitraum, Abdeckung und die Grenze", () => {
  const e = healthLesen([schritte("2026-09-20", 900), schritte("2026-09-28", 1100)].join(""));
  const text = healthBericht(e);
  assert.match(text, /2 Tage von 2026-09-20 bis 2026-09-28/);
  assert.match(text, /2 Tage mit Schritten/);
  assert.match(text, /Kopie und kein Abo/);
});
