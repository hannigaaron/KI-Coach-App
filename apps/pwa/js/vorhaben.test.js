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
