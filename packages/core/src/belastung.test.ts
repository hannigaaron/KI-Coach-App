import assert from "node:assert/strict";
import test from "node:test";
import { belastung, belastungText, MIN_EINHEITEN, type BelastungsEingabe } from "./belastung.js";

const HEUTE = "2026-09-29";

/** Baut Tage rückwärts ab heute. `plan[i]` sind die Minuten am Tag i zurück. */
function tageAus(plan: Array<number | null>): BelastungsEingabe["tage"] {
  const basis = Math.floor(Date.parse(`${HEUTE}T00:00:00Z`) / 86400000);
  const tage: BelastungsEingabe["tage"] = {};
  plan.forEach((minuten, zurueck) => {
    const tag = new Date((basis - zurueck) * 86400000).toISOString().slice(0, 10);
    tage[tag] = minuten === null ? { trainings: [] } : { trainings: [{ minutes: minuten, type: "strength" }] };
  });
  return tage;
}

/** Eine gleichmässige Woche über vier Wochen: jeden zweiten Tag 60 Minuten. */
function gleichmaessig(): Array<number | null> {
  return Array.from({ length: 28 }, (_, i) => (i % 2 === 0 ? 60 : null));
}

test("unter vier Einheiten wird nichts behauptet", () => {
  const plan: Array<number | null> = Array.from({ length: 28 }, () => null);
  plan[0] = 60;
  plan[3] = 60;
  plan[9] = 60;
  assert.equal(belastung({ tage: tageAus(plan), heute: HEUTE }), null);
});

test("die Meldung bei zu wenig Daten nennt die Schwelle", () => {
  const text = belastungText(null);
  assert.match(text, new RegExp(String(MIN_EINHEITEN)));
  assert.match(text, /28 Tagen/);
});

test("eine gleichmässige Woche liegt bei rund 100 Prozent", () => {
  const b = belastung({ tage: tageAus(gleichmaessig()), heute: HEUTE });
  assert.ok(b);
  assert.equal(b.lage, "stabil");
  assert.ok(Math.abs(b.verhaeltnis - 1) < 0.15, `Verhältnis war ${b.verhaeltnis}`);
});

test("beide Fenster werden auf dieselbe Länge gebracht", () => {
  // Ohne die Umrechnung käme hier rund 0,25 heraus, weil vier Wochen gegen
  // eine verglichen würden.
  const b = belastung({ tage: tageAus(gleichmaessig()), heute: HEUTE });
  assert.ok(b);
  assert.equal(b.akutMinuten, 240);
  assert.equal(b.chronischMinuten, 210);
});

test("eine harte Woche über dem Schnitt gilt als Sprung", () => {
  const plan = gleichmaessig();
  for (let i = 0; i < 7; i++) plan[i] = 120;
  const b = belastung({ tage: tageAus(plan), heute: HEUTE });
  assert.ok(b);
  assert.equal(b.lage, "sprung");
  assert.ok(b.verhaeltnis > 1.5);
  assert.match(belastungText(b), /umstritten/);
});

test("eine leere Woche über einem vollen Monat gilt als Rückgang", () => {
  const plan = gleichmaessig();
  for (let i = 0; i < 7; i++) plan[i] = null;
  const b = belastung({ tage: tageAus(plan), heute: HEUTE });
  assert.ok(b);
  assert.equal(b.lage, "rueckgang");
  assert.equal(b.akutMinuten, 0);
  assert.match(belastungText(b), /fehlen auf eine normale Woche/);
});

test("eine Einheit ohne Dauer zählt als Einheit mit null Minuten", () => {
  const basis = Math.floor(Date.parse(`${HEUTE}T00:00:00Z`) / 86400000);
  const tage: BelastungsEingabe["tage"] = {};
  for (let i = 0; i < 8; i++) {
    const tag = new Date((basis - i * 3) * 86400000).toISOString().slice(0, 10);
    tage[tag] = { trainings: [{ minutes: 60, type: "strength" }] };
  }
  const ohne = new Date((basis - 1) * 86400000).toISOString().slice(0, 10);
  tage[ohne] = { trainings: [{ type: "strength" }] };

  const b = belastung({ tage, heute: HEUTE });
  assert.ok(b);
  // Die Einheit ohne Dauer wird gezählt, ihre Minuten nicht geraten.
  assert.equal(b.einheitenAkut, 4);
  assert.equal(b.akutMinuten, 180);
});

test("der Text nennt immer die Zahlen, aus denen er kommt", () => {
  const b = belastung({ tage: tageAus(gleichmaessig()), heute: HEUTE });
  assert.ok(b);
  const text = belastungText(b);
  assert.match(text, new RegExp(String(b.akutMinuten)));
  assert.match(text, new RegExp(String(b.chronischMinuten)));
  assert.match(text, /Prozent/);
});

test("ein ungültiges Datum wirft, statt still falsch zu rechnen", () => {
  assert.throws(() => belastung({ tage: {}, heute: "gestern" }), /Ungültiges Datum/);
});
