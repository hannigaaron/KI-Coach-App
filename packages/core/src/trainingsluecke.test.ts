import assert from "node:assert/strict";
import test from "node:test";
import {
  LUECKEN_ANTWORTEN,
  lueckenText,
  trainingslueckeFinden,
  type LueckenLage,
} from "./trainingsluecke.js";

function lage(teil: Partial<LueckenLage> = {}): LueckenLage {
  return {
    tage: {},
    heute: "2026-09-26",
    geplanteEinheiten: 4,
    ...teil,
  };
}

const einheit = { trainings: [{ art: "strength", minuten: 60 }] };

test("drei Tage Pause sind noch keine Lücke", () => {
  const gefunden = trainingslueckeFinden(lage({ tage: { "2026-09-23": einheit } }));
  assert.equal(gefunden, null);
});

test("ab vier Tagen wird gefragt", () => {
  const gefunden = trainingslueckeFinden(lage({ tage: { "2026-09-22": einheit } }));
  assert.ok(gefunden);
  assert.equal(gefunden.tageOhne, 4);
  assert.equal(gefunden.letztesTraining, "2026-09-22");
  assert.match(gefunden.titel, /4 Tage ohne Training/);
  assert.equal(gefunden.antworten.length, LUECKEN_ANTWORTEN.length);
});

test("ein Tag mit leerer Trainingsliste zählt nicht als Training", () => {
  const gefunden = trainingslueckeFinden(
    lage({ tage: { "2026-09-22": einheit, "2026-09-25": { trainings: [] } } }),
  );
  assert.ok(gefunden);
  assert.equal(gefunden.tageOhne, 4);
});

test("ohne ein einziges Training im Rückblick wird nichts behauptet", () => {
  // Wer nie ein Training eingetragen hat, hat keine Lücke, sondern keine
  // Daten. Eine Frage nach der Lücke wäre eine Behauptung ohne Grundlage.
  assert.equal(trainingslueckeFinden(lage()), null);
});

test("ein Training älter als der Rückblick zählt nicht mehr", () => {
  const gefunden = trainingslueckeFinden(lage({ tage: { "2026-01-01": einheit } }));
  assert.equal(gefunden, null);
});

test("ohne Plan im Profil wird nicht gefragt", () => {
  const gefunden = trainingslueckeFinden(
    lage({ tage: { "2026-09-22": einheit }, geplanteEinheiten: 0 }),
  );
  assert.equal(gefunden, null);
});

test("nach einer Frage bleibt es drei Tage still", () => {
  const tage = { "2026-09-15": einheit };
  assert.equal(trainingslueckeFinden(lage({ tage, zuletztGefragt: "2026-09-25" })), null);
  assert.equal(trainingslueckeFinden(lage({ tage, zuletztGefragt: "2026-09-24" })), null);
  assert.ok(trainingslueckeFinden(lage({ tage, zuletztGefragt: "2026-09-23" })));
});

test("derselbe Tag ergibt denselben Text", () => {
  const a = lueckenText(5, 4, 20000);
  const b = lueckenText(5, 4, 20000);
  assert.deepEqual(a, b);
  assert.equal(a.titel, "5 Tage ohne Training");
});

test("die Formulierung wechselt über die Tage", () => {
  const texte = new Set([0, 1, 2].map((i) => lueckenText(5, 4, 20000 + i).text));
  assert.equal(texte.size, 3);
});

test("jede Schnellantwort hat eine ASCII Kennung und einen ganzen Satz", () => {
  for (const a of LUECKEN_ANTWORTEN) {
    assert.match(a.id, /^[a-z_]+$/);
    assert.ok(a.label.length <= 20, `${a.label} ist zu lang für einen Knopf`);
    assert.match(a.satz, /\.$/);
  }
});

test("ein Training aus Kalender, Protokoll oder Health verhindert die Frage", () => {
  // Ein Training im Kalender oder im Protokoll zählt wie ein eingetragenes.
  assert.equal(trainingslueckeFinden(lage({ tage: { "2026-09-10": einheit }, trainingsTage: ["2026-09-24"] })), null);
});

test("höchstens zweimal je Woche gefragt, Montag bis Sonntag", () => {
  const alt = { tage: { "2026-09-01": einheit } };
  // 2026-09-26 ist ein Samstag. Montag und Mittwoch schon gefragt: Schluss.
  assert.equal(trainingslueckeFinden(lage({ ...alt, gefragt: ["2026-09-21", "2026-09-23"] })), null);
  // Einmal in der Woche gefragt, vier Tage her: ein zweites Mal geht.
  assert.ok(trainingslueckeFinden(lage({ ...alt, gefragt: ["2026-09-22"] })));
  // Gestern gefragt: nicht schon wieder.
  assert.equal(trainingslueckeFinden(lage({ ...alt, gefragt: ["2026-09-25"] })), null);
});
