import { test } from "node:test";
import assert from "node:assert/strict";
import { MAHLZEITEN, offeneMahlzeiten, verteileRest, verteilungText, restText } from "./verteilung.js";

const REST = { kcal: 1447, proteinG: 119, fatG: 16, carbsG: 200 };

test("die Grundgewichtung ergibt zusammen eins", () => {
  const summe = MAHLZEITEN.reduce((s, m) => s + m.anteil, 0);
  assert.ok(Math.abs(summe - 1) < 0.001, `Summe ist ${summe}`);
});

test("verteilt das Restbudget vollstaendig", () => {
  const v = verteileRest(REST, ["abendessen", "snack"]);
  const kcal = v.anteile.reduce((s, a) => s + a.kcal, 0);
  // Rundung je Mahlzeit, deshalb ein paar Kalorien Toleranz.
  assert.ok(Math.abs(kcal - REST.kcal) <= 2, `verteilt ${kcal} von ${REST.kcal}`);
});

test("das Abendessen bekommt mehr als der Snack", () => {
  const v = verteileRest(REST, ["abendessen", "snack"]);
  const abend = v.anteile.find((a) => a.art === "abendessen")!;
  const snack = v.anteile.find((a) => a.art === "snack")!;
  assert.ok(abend.kcal > snack.kcal * 2, `${abend.kcal} gegen ${snack.kcal}`);
});

test("Protein wird gleichmaessiger verteilt als Kalorien", () => {
  // Sonst waere ein Snack ein Keks und braechte niemanden ans Proteinziel.
  const v = verteileRest(REST, ["abendessen", "snack"]);
  const snack = v.anteile.find((a) => a.art === "snack")!;
  const kcalAnteil = snack.kcal / REST.kcal;
  const proteinAnteil = snack.proteinG / REST.proteinG;
  assert.ok(proteinAnteil > kcalAnteil, `Protein ${proteinAnteil} gegen Kalorien ${kcalAnteil}`);
});

test("eine einzige Mahlzeit bekommt alles", () => {
  const v = verteileRest(REST, ["abendessen"]);
  assert.equal(v.anteile.length, 1);
  assert.equal(v.anteile[0]?.kcal, REST.kcal);
  assert.equal(v.anteile[0]?.proteinG, REST.proteinG);
});

test("ueber dem Ziel wird nichts verteilt", () => {
  const v = verteileRest({ kcal: -320, proteinG: -10, fatG: -5, carbsG: -20 }, ["abendessen"]);
  assert.deepEqual(v.anteile, []);
  assert.match(v.hinweise[0]!, /320 kcal darüber/);
});

test("zu kleine Portionen werden gemeldet", () => {
  const v = verteileRest({ kcal: 400, proteinG: 40, fatG: 10, carbsG: 30 },
    ["fruehstueck", "mittagessen", "abendessen", "snack"]);
  assert.ok(v.hinweise.some((h) => h.includes("realistischer")), v.hinweise.join(" "));
});

test("zu viel Protein in einer Mahlzeit wird gemeldet", () => {
  const v = verteileRest({ kcal: 1200, proteinG: 140, fatG: 20, carbsG: 100 }, ["abendessen"]);
  assert.ok(v.hinweise.some((h) => h.includes("60 g Protein")), v.hinweise.join(" "));
});

test("ohne Mahlzeit gibt es keine Verteilung", () => {
  const v = verteileRest(REST, []);
  assert.deepEqual(v.anteile, []);
  assert.match(v.hinweise[0]!, /Keine Mahlzeit/);
});

test("offene Mahlzeiten richten sich nach der Uhrzeit", () => {
  assert.deepEqual(offeneMahlzeiten(7), ["fruehstueck", "mittagessen", "snack", "abendessen"]);
  // Um 21 Uhr ist kein Fruehstueck mehr plausibel.
  assert.deepEqual(offeneMahlzeiten(21), []);
  assert.ok(offeneMahlzeiten(18).includes("abendessen"));
  assert.ok(!offeneMahlzeiten(18).includes("fruehstueck"));
});

test("bereits gegessene Mahlzeiten fallen raus", () => {
  const offen = offeneMahlzeiten(12, ["fruehstueck"]);
  assert.ok(!offen.includes("fruehstueck"));
  assert.ok(offen.includes("mittagessen"));
});

test("der Text nennt jede Mahlzeit mit ihren Werten", () => {
  const t = verteilungText(verteileRest(REST, ["abendessen", "snack"]));
  assert.match(t, /1447 kcal/);
  assert.match(t, /Abendessen: rund \d+ kcal/);
  assert.match(t, /Snack: rund \d+ kcal/);
});

test("eine zu grosse Mahlzeit wird gemeldet", () => {
  const v = verteileRest({ kcal: 1459, proteinG: 45, fatG: 43, carbsG: 227 }, ["abendessen"]);
  assert.ok(v.hinweise.some((h) => h.includes("1200 kcal")), v.hinweise.join(" "));
});

test("auf zwei Mahlzeiten verteilt faellt der Hinweis weg", () => {
  const v = verteileRest({ kcal: 1459, proteinG: 45, fatG: 43, carbsG: 227 }, ["abendessen", "snack"]);
  assert.ok(!v.hinweise.some((h) => h.includes("1200 kcal")), v.hinweise.join(" "));
});

test("Über dem Ziel steht drüber und nicht eine Zahl mit Minus", () => {
  // Der echte Fall aus dem Betrieb: "Offen sind noch -244 kcal und 0 g Protein."
  const text = restText({ kcal: -244, proteinG: 0 });
  assert.ok(!text.includes("-"), `im Text steht ein Minus: ${text}`);
  assert.match(text, /244 kcal über deinem Tagesziel/);
});

test("Über den Kalorien und trotzdem Protein offen wird getrennt genannt", () => {
  const text = restText({ kcal: -300, proteinG: 40 });
  assert.match(text, /300 kcal über/);
  assert.match(text, /40 g/);
});

test("Alles erreicht wird als erreicht gemeldet", () => {
  assert.match(restText({ kcal: 0, proteinG: 0 }), /erreicht/);
  assert.match(restText({ kcal: 500, proteinG: 0 }), /500 kcal.*Protein ist erreicht/);
});

test("Der Normalfall bleibt unverändert", () => {
  assert.equal(restText({ kcal: 800, proteinG: 60 }), "Offen sind noch 800 kcal und 60 g Protein.");
});
