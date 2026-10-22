import test from "node:test";
import assert from "node:assert/strict";
import { diktatKorrektur, diktatWoerter } from "./diktat.js";

test("Korrekturen aus echten Ausgaben der Erkennung", () => {
  assert.equal(diktatKorrektur("zwei Sitze breite Umzüge"), "zwei Sätze breite Klimmzüge");
  assert.equal(diktatKorrektur("3 Sitze Engel Klimmzüge"), "3 Sätze enge Klimmzüge");
  assert.equal(diktatKorrektur("dann Sigal Ro und seit eben"), "dann Seal Row und Seitheben");
  assert.equal(diktatKorrektur("Kabel rudern mit 2 R I R"), "Kabelrudern mit 2 RIR");
});

test("Korrekturen greifen nur im Zusammenhang", () => {
  // Ohne Zahl davor sind Sitze Sitze, und seit gestern bleibt seit gestern.
  assert.equal(diktatKorrektur("die Sitze im Auto"), "die Sitze im Auto");
  assert.equal(diktatKorrektur("seit gestern Umzüge geplant"), "seit gestern Umzüge geplant");
  assert.equal(diktatKorrektur(""), "");
});

test("Wortliste: feste Wörter vorn, Übungen ohne Klammern, höchstens 100, keine doppelten", () => {
  const w = diktatWoerter();
  assert.ok(w.length <= 100);
  assert.equal(w[0], "Sätze");
  assert.ok(w.includes("Seal Row"));
  assert.ok(!w.some((x) => x.includes("(")));
  assert.equal(new Set(w.map((x) => x.toLowerCase())).size, w.length);
  assert.deepEqual(diktatWoerter([{ name: "Kniebeuge (Langhantel)" }, { name: "Kniebeuge (Frontal)" }]).slice(-1), ["Kniebeuge"]);
});
