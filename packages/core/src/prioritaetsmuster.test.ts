import { test } from "node:test";
import assert from "node:assert/strict";
import { anheben, bereichDerAufgabe, familienNamenAus, vernachlaessigteBereiche } from "./prioritaetsmuster.js";
import type { BereichStand } from "./balance.js";

const stand = (bereich: BereichStand["bereich"], anteil: number): BereichStand =>
  ({ bereich, name: bereich === "beziehung" ? "Familie und Beziehung" : bereich, minuten: 0, zielMinuten: 600, anteil, anteilAmTag: 0 });

test("ein Bereich unter 40 Prozent zählt als vernachlässigt, Karriere nie", () => {
  const l = vernachlaessigteBereiche([stand("karriere", 0.1), stand("fitness", 1.2), stand("beziehung", 0.05)], 6);
  assert.deepEqual(l.map((x) => x.bereich), ["beziehung"]);
});

test("ohne genug gemessene Tage wird nichts behauptet", () => {
  assert.deepEqual(vernachlaessigteBereiche([stand("beziehung", 0)], 3), []);
});

test("Familie kam zu kurz: Stufe 3 wird 2, Stufe 2 wird nur bei fast null 1, Stufe 1 bleibt", () => {
  const l = vernachlaessigteBereiche([stand("beziehung", 0.05)], 7);
  assert.equal(anheben(3, "beziehung", l)?.stufe, 2);
  assert.equal(anheben(2, "beziehung", l)?.stufe, 1);
  assert.equal(anheben(1, "beziehung", l), null);
  assert.equal(anheben(3, "fitness", l), null);
  assert.match(anheben(3, "beziehung", l)!.grund, /zu kurz/);
  const knapp = vernachlaessigteBereiche([stand("beziehung", 0.3)], 7);
  assert.equal(anheben(2, "beziehung", knapp), null);
  assert.equal(anheben(3, "beziehung", knapp)?.stufe, 2);
});

test("Namen aus den Notizen machen aus Lydi schreiben eine Familienaufgabe", () => {
  const namen = familienNamenAus(["Meine Schwester Lydi hat Ängste", "Mama Petra ist gestresst", "Chef David"]);
  assert.deepEqual(namen.sort(), ["Lydi", "Petra"]);
  assert.equal(bereichDerAufgabe("Lydi schreiben", { beziehung: namen }), "beziehung");
  assert.equal(bereichDerAufgabe("Lydia schreiben", { beziehung: namen }), null);
  assert.equal(bereichDerAufgabe("Reel schneiden", { beziehung: namen }), "karriere");
});
