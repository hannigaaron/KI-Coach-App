import test from "node:test";
import assert from "node:assert/strict";

/** Derselbe Speicherersatz wie in assistant.test.js. */
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
const { MAX_TAGE, healthDateiLesen, healthSchreiben, istExport, schreibBericht } = await import("./gesundheit.js");

const HEUTE = "2026-09-29";
const PROFIL = {
  name: "Aaron", sex: "male", ageYears: 23, heightCm: 184, weightKg: 87,
  goal: "maintain", dailySteps: 12000, wakeTime: "07:00", sleepTime: "23:00", sessions: [],
};

function frisch() {
  localStorage.clear();
  store.setProfile(PROFIL);
}

function xml(...zeilen) {
  return `<HealthData locale="de_DE">${zeilen.join("")}</HealthData>`;
}
const schritte = (tag, wert) =>
  `<Record type="HKQuantityTypeIdentifierStepCount" unit="count" startDate="${tag} 08:00:00 +0200" endDate="${tag} 08:10:00 +0200" value="${wert}"/>`;
const gewicht = (tag, kg) =>
  `<Record type="HKQuantityTypeIdentifierBodyMass" unit="kg" startDate="${tag} 07:00:00 +0200" endDate="${tag} 07:00:00 +0200" value="${kg}"/>`;
const schlaf = (vonTag, von, bisTag, bis) =>
  `<Record type="HKCategoryTypeIdentifierSleepAnalysis" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="${vonTag} ${von} +0200" endDate="${bisTag} ${bis} +0200"/>`;

test("Eine XML Datei wird gelesen, ohne dass etwas gespeichert wird", async () => {
  frisch();
  const e = await healthDateiLesen(new Blob([xml(schritte("2026-09-28", 9000))]));
  assert.equal(e.tage.length, 1);
  assert.equal(store.getDay("2026-09-28").steps, 0, "Lesen darf nichts schreiben");
});

test("Der Fortschritt wird gemeldet", async () => {
  const stand = [];
  await healthDateiLesen(new Blob([xml(schritte("2026-09-28", 9000))]), {
    aufFortschritt: (n) => stand.push(n),
  });
  assert.ok(stand.length >= 1);
  assert.ok(stand[stand.length - 1] > 0);
});

test("Schritte, Schlaf und Gewicht landen im Tag", async () => {
  frisch();
  const e = await healthDateiLesen(new Blob([xml(
    schritte("2026-09-28", 11500),
    schlaf("2026-09-27", "23:00:00", "2026-09-28", "06:30:00"),
    gewicht("2026-09-28", 86.2),
  )]));
  const bericht = healthSchreiben(e, { store, heute: HEUTE });

  const tag = store.getDay("2026-09-28");
  assert.equal(tag.steps, 11500);
  assert.equal(tag.gesundheit.schlafMinuten, 450);
  assert.equal(tag.weightKg, 86.2);
  assert.equal(bericht.tage, 1);
});

test("Ein selbst eingetragenes Gewicht wird nicht überschrieben", async () => {
  frisch();
  store.setWeight("2026-09-28", 88.4);
  const e = await healthDateiLesen(new Blob([xml(gewicht("2026-09-28", 86.2))]));
  healthSchreiben(e, { store, heute: HEUTE });
  assert.equal(store.getDay("2026-09-28").weightKg, 88.4);
});

test("Das Profilgewicht zieht nach, denn alle Ziele rechnen dagegen", async () => {
  frisch();
  const e = await healthDateiLesen(new Blob([xml(gewicht("2026-09-20", 90), gewicht("2026-09-28", 86.2))]));
  healthSchreiben(e, { store, heute: HEUTE });
  assert.equal(store.getProfile().weightKg, 86.2, "der jüngste Wert gilt");
});

test("Ein unmögliches Gewicht lässt das Profil in Ruhe", async () => {
  frisch();
  const e = await healthDateiLesen(new Blob([xml(gewicht("2026-09-28", 4))]));
  healthSchreiben(e, { store, heute: HEUTE });
  assert.equal(store.getProfile().weightKg, 87);
});

test("Tage ausserhalb des Fensters bleiben draussen", async () => {
  frisch();
  const alt = new Date(Date.parse(`${HEUTE}T00:00:00Z`) - (MAX_TAGE + 10) * 86400000)
    .toISOString().slice(0, 10);
  const e = await healthDateiLesen(new Blob([xml(schritte(alt, 5000), schritte("2026-09-28", 9000))]));
  const bericht = healthSchreiben(e, { store, heute: HEUTE });
  assert.equal(bericht.tage, 1);
  assert.equal(bericht.uebersprungen, 1);
  assert.equal(store.getDay(alt).steps, 0);
});

test("Ein Tag in der Zukunft wird übersprungen", async () => {
  frisch();
  const e = await healthDateiLesen(new Blob([xml(schritte("2027-01-01", 9000))]));
  assert.equal(healthSchreiben(e, { store, heute: HEUTE }).tage, 0);
});

test("Der Import wird in den Einstellungen vermerkt", async () => {
  frisch();
  const e = await healthDateiLesen(new Blob([xml(schritte("2026-09-28", 9000))]));
  healthSchreiben(e, { store, heute: HEUTE });
  assert.ok(store.getSettings().healthImport.at);
  assert.equal(store.getSettings().healthImport.tage, 1);
});

test("Der Bericht nennt Zahlen und die Grenze", async () => {
  frisch();
  const e = await healthDateiLesen(new Blob([xml(schritte("2026-09-28", 9000), gewicht("2026-09-28", 86))]));
  const text = schreibBericht(healthSchreiben(e, { store, heute: HEUTE }), e);
  assert.match(text, /Übernommen: 1 Tage/);
  assert.match(text, /Kopie und kein Abo/);
  assert.match(text, /bleibt stehen/);
});

test("Eine Datei, die kein Health Export ist, wird gemeldet", async () => {
  const e = await healthDateiLesen(new Blob(["<html><body>nichts</body></html>"]));
  assert.equal(e.tage.length, 0);
});

test("Ein ZIP, wie es aus der Health App kommt, geht auch", async () => {
  // Der Übergang zwischen ZIP Leser und Parser ist die Stelle, an der es im
  // Betrieb bricht. Beide einzeln zu testen reicht dafür nicht.
  frisch();
  const zip = await zipBauen("apple_health_export/export.xml", xml(schritte("2026-09-28", 12345)));
  const e = await healthDateiLesen(zip);
  healthSchreiben(e, { store, heute: HEUTE });
  assert.equal(store.getDay("2026-09-28").steps, 12345);
});

test("Export.xml mit grossem E wird gefunden, wie es ein deutsches iPhone liefert", async () => {
  frisch();
  const zip = await zipBauen("apple_health_export/Export.xml", xml(schritte("2026-09-28", 9876)));
  const e = await healthDateiLesen(zip);
  healthSchreiben(e, { store, heute: HEUTE });
  assert.equal(store.getDay("2026-09-28").steps, 9876);
});

test("die CDA Datei daneben zählt weiterhin nicht als Export", () => {
  assert.equal(istExport("apple_health_export/export_cda.xml"), false);
  assert.equal(istExport("apple_health_export/Export_CDA.xml"), false);
  assert.equal(istExport("apple_health_export/EXPORT.XML"), true);
});

test("Ein ZIP ohne export.xml sagt, was stattdessen drin liegt", async () => {
  const zip = await zipBauen("apple_health_export/export_cda.xml", "<falsch/>");
  await assert.rejects(() => healthDateiLesen(zip), /export_cda\.xml/);
});

/** Baut ein ZIP mit genau einer gepackten Datei. */
async function zipBauen(name, inhalt) {
  const geber = new TextEncoder();
  const roh = geber.encode(inhalt);
  const daten = new Uint8Array(
    await new Response(new Blob([roh]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer(),
  );
  const nameBytes = geber.encode(name);

  const kopf = new DataView(new ArrayBuffer(30));
  kopf.setUint32(0, 0x04034b50, true);
  kopf.setUint16(8, 8, true);
  kopf.setUint32(18, daten.length, true);
  kopf.setUint32(22, roh.length, true);
  kopf.setUint16(26, nameBytes.length, true);

  const z = new DataView(new ArrayBuffer(46));
  z.setUint32(0, 0x02014b50, true);
  z.setUint16(10, 8, true);
  z.setUint32(20, daten.length, true);
  z.setUint32(24, roh.length, true);
  z.setUint16(28, nameBytes.length, true);
  z.setUint32(42, 0, true);

  const versatz = 30 + nameBytes.length + daten.length;
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, 1, true);
  ende.setUint16(10, 1, true);
  ende.setUint32(12, 46 + nameBytes.length, true);
  ende.setUint32(16, versatz, true);

  return new Blob([
    new Uint8Array(kopf.buffer), nameBytes, daten,
    new Uint8Array(z.buffer), nameBytes, new Uint8Array(ende.buffer),
  ]);
}
