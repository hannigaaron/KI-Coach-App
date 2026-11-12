import { test } from "node:test";
import assert from "node:assert/strict";
import { bestellteEinheit } from "./vorhaben.js";

const einheit = { fokus: "Rücken, Bizeps", dauerMin: 58, positionen: [] };

test("eine für morgen bestellte Einheit gilt morgen, die von heute bleibt", () => {
  const s = {
    heuteTraining: { tag: "2026-11-02", gruppen: ["brust"], einheit },
    heuteVerlauf: [{ tag: "2026-11-03", gruppen: ["ruecken", "bizeps"], uhrzeit: "14:00", geplant: true, einheit }],
  };
  assert.equal(bestellteEinheit(s, "2026-11-02")?.gruppen[0], "brust");
  assert.equal(bestellteEinheit(s, "2026-11-03")?.uhrzeit, "14:00");
  assert.equal(bestellteEinheit(s, "2026-11-04"), null);
});

test("eine alte Einheit im Verlauf ohne Vormerkung ist keine Bestellung", () => {
  assert.equal(bestellteEinheit({ heuteVerlauf: [{ tag: "2026-11-03", einheit }] }, "2026-11-03"), null);
  assert.equal(bestellteEinheit({}, "2026-11-03"), null);
});

test("Die Einheit für einen Tag folgt dem Protokoll und in der stressigen Woche dem Kurzplan", async () => {
  const { planEinheitFuer, naechsteEinheit } = await import("./vorhaben.js");
  const e = (t) => ({ titel: t, fokus: "", positionen: [], dauerMin: 60 });
  const plan = { einheiten: [e("A"), e("B"), e("C")] };
  const kurz = { einheiten: [e("A, kurz"), e("B, kurz")] };
  // Mo 2026-11-09, Mi 11, Fr 13. Krafttage Mo, Mi, Fr.
  const profil = { sessions: [1, 3, 5].map((weekday) => ({ type: "strength", weekday })) };
  const log = [{ datum: "2026-11-06", uebung: "x", einheit: "A", saetze: [] }];
  const s = { plan, trainingslog: log };
  assert.equal(naechsteEinheit(plan, log), 1);
  assert.equal(planEinheitFuer(s, profil, "2026-11-09", "2026-11-09").titel, "B");
  // Mittwoch: Montag liegt dazwischen und noch nicht trainiert.
  assert.equal(planEinheitFuer(s, profil, "2026-11-11", "2026-11-09").titel, "C");
  // Heute schon B gemacht: morgen ist C, nicht D.
  const s2 = { plan, trainingslog: [...log, { datum: "2026-11-09", uebung: "x", einheit: "B", saetze: [] }] };
  assert.equal(planEinheitFuer(s2, profil, "2026-11-09", "2026-11-09").titel, "B");
  assert.equal(planEinheitFuer(s2, profil, "2026-11-11", "2026-11-09").titel, "C");
  const s3 = { ...s, planKurz: kurz, planWoche: { art: "kurz", bis: "2026-11-15" } };
  assert.equal(planEinheitFuer(s3, profil, "2026-11-09", "2026-11-09").titel, "A, kurz");
  assert.equal(planEinheitFuer({ trainingslog: [] }, profil, "2026-11-09", "2026-11-09"), null);
});
