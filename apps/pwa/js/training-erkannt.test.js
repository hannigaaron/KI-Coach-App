import test from "node:test";
import assert from "node:assert/strict";
import { antwortAufFrage, nochGeplant, trainingErkannt } from "./training-erkannt.js";

const HEUTE = "2026-11-10"; // ein Dienstag
const profil = { sessions: [{ weekday: 2, startsAt: "18:00", minutes: 75, type: "strength" }, { weekday: 2, startsAt: "20:00", minutes: 120, type: "team_sport" }] };

test("ein Training von der Uhr wird gelobt und fragt nach dem geplanten derselben Art", () => {
  const r = trainingErkannt({ neue: [{ id: "a", tag: HEUTE, uhrzeit: "16:10", minuten: 52, art: "strength" }], heute: HEUTE, profil });
  assert.match(r.text, /^Mega stark, dass du heute schon trainiert hast: 52 Minuten Krafttraining um 16:10\./);
  assert.match(r.text, /Krafttraining um 18:00 im Plan\. Hast du das vorgezogen, oder trainierst du heute zweimal\?/);
  assert.equal(r.naechstes.um, 18 * 60);
});

test("Volleyball am Abend nach Kraft ist kein vorgezogenes Training", () => {
  const r = trainingErkannt({ neue: [{ id: "b", tag: HEUTE, uhrzeit: "18:05", minuten: 70, art: "strength" }], heute: HEUTE, profil });
  assert.equal(r.naechstes, null);
  assert.doesNotMatch(r.text, /vorgezogen/);
});

test("schon gemeldete und alte Trainings melden sich nicht", () => {
  assert.equal(trainingErkannt({ neue: [{ id: "a", tag: HEUTE, uhrzeit: "16:10", minuten: 52, art: "strength" }], heute: HEUTE, profil, gemeldet: ["a"] }), null);
  assert.equal(trainingErkannt({ neue: [{ id: "c", tag: "2026-11-09", uhrzeit: "16:10", minuten: 52, art: "strength" }], heute: HEUTE, profil }), null);
});

test("ein Training im Kalender schlägt das Profil zur selben Zeit", () => {
  const beginn = new Date(`${HEUTE}T00:00:00`).getTime();
  const termine = [{ von: beginn + 18.5 * 3600000, bis: beginn + 19.5 * 3600000, titel: "Training: Push", daevo: true, eid: "e1" }];
  const g = nochGeplant({ heute: HEUTE, abMinute: 17 * 60, profil, termine });
  assert.equal(g[0].eid, "e1");
  assert.equal(g.filter((x) => x.um === 18 * 60).length, 0);
});

test("die Antwort wird gelesen", () => {
  assert.equal(antwortAufFrage("Hab ich vorgezogen"), "vorgezogen");
  assert.equal(antwortAufFrage("nein, ich geh heute abend noch"), "zweimal");
  assert.equal(antwortAufFrage("wie viel Protein brauche ich"), null);
});
