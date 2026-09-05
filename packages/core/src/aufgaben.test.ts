import { test } from "node:test";
import assert from "node:assert/strict";
import { ARBEITSGRENZE_MINUTEN, planText, priorisiere, type Aufgabe } from "./aufgaben.js";

const HEUTE = "2026-09-07";

function a(teile: Partial<Aufgabe> & { text: string }): Aufgabe {
  return {
    id: teile.text, minuten: 30, wichtigkeit: 2, erledigt: false,
    erstellt: `${HEUTE}T08:00:00.000Z`, faellig: null, ...teile,
  };
}

const BASIS = { tag: HEUTE, freieMinuten: 240, bereitsGearbeitet: 120 };

test("eine Frist heute schlägt jede Wichtigkeit", () => {
  const plan = priorisiere({
    ...BASIS,
    aufgaben: [
      a({ text: "Wichtig ohne Frist", wichtigkeit: 3 }),
      a({ text: "Mittel mit Frist heute", wichtigkeit: 2, faellig: HEUTE }),
    ],
  });
  assert.equal(plan.heute[0]!.text, "Mittel mit Frist heute");
});

test("unter gleicher Frist entscheidet die Wichtigkeit", () => {
  const plan = priorisiere({
    ...BASIS,
    aufgaben: [
      a({ text: "Nebensache", wichtigkeit: 1, faellig: HEUTE }),
      a({ text: "Hauptsache", wichtigkeit: 3, faellig: HEUTE }),
    ],
  });
  assert.equal(plan.heute[0]!.text, "Hauptsache");
});

test("was nicht mehr in die freie Zeit passt, wandert auf morgen", () => {
  const plan = priorisiere({
    ...BASIS, freieMinuten: 60, bereitsGearbeitet: 0,
    aufgaben: [
      a({ text: "Erste", minuten: 45, wichtigkeit: 3 }),
      a({ text: "Zweite", minuten: 45, wichtigkeit: 3 }),
    ],
  });
  assert.deepEqual(plan.heute.map((x) => x.text), ["Erste"]);
  assert.deepEqual(plan.morgen.map((x) => x.text), ["Zweite"]);
  assert.equal(plan.geplanteMinuten, 45);
});

test("über der Arbeitsgrenze kommt nichts mehr dazu", () => {
  const plan = priorisiere({
    tag: HEUTE, freieMinuten: 300, bereitsGearbeitet: ARBEITSGRENZE_MINUTEN + 30,
    aufgaben: [a({ text: "Noch was", wichtigkeit: 3, faellig: HEUTE })],
  });
  assert.equal(plan.heute.length, 0);
  assert.equal(plan.morgen.length, 1);
  assert.ok(plan.begruendung.some((b) => b.includes("über deiner Grenze")));
});

test("die Grenze schlägt den Kalender, auch wenn noch Zeit frei wäre", () => {
  // Neun Stunden gearbeitet, vier Stunden Kalender frei. Rechnerisch passt
  // viel, tatsächlich nur noch eine Stunde bis zur Grenze.
  const plan = priorisiere({
    tag: HEUTE, freieMinuten: 240, bereitsGearbeitet: 540,
    aufgaben: [
      a({ text: "A", minuten: 60, wichtigkeit: 3 }),
      a({ text: "B", minuten: 60, wichtigkeit: 3 }),
    ],
  });
  assert.equal(plan.geplanteMinuten, 60);
});

test("erledigte Aufgaben tauchen nirgends auf", () => {
  const plan = priorisiere({ ...BASIS, aufgaben: [a({ text: "Fertig", erledigt: true })] });
  assert.equal(plan.heute.length + plan.morgen.length + plan.spaeter.length, 0);
});

test("Nebensächliches ohne Frist landet nicht auf morgen, sondern auf später", () => {
  const plan = priorisiere({
    ...BASIS, freieMinuten: 0, bereitsGearbeitet: 0,
    aufgaben: [a({ text: "Irgendwann", wichtigkeit: 1 })],
  });
  assert.equal(plan.spaeter.length, 1);
  assert.equal(plan.morgen.length, 0);
});

test("jede Begründung nennt eine Zahl", () => {
  const plan = priorisiere({ ...BASIS, aufgaben: [a({ text: "A" })] });
  assert.ok(plan.begruendung.length > 0);
  for (const b of plan.begruendung) assert.ok(/\d/.test(b), b);
});

test("der Text trennt heute von morgen", () => {
  const text = planText(priorisiere({
    ...BASIS, freieMinuten: 30, bereitsGearbeitet: 0,
    aufgaben: [a({ text: "Jetzt", minuten: 30, wichtigkeit: 3 }), a({ text: "Später", minuten: 60, wichtigkeit: 3 })],
  }));
  assert.ok(text.includes("Heute noch"));
  assert.ok(text.includes("Das kann bis morgen warten"));
  assert.ok(text.includes("Jetzt"));
});

test("ohne Aufgaben sagt der Text das auch", () => {
  assert.equal(planText(priorisiere({ ...BASIS, aufgaben: [] })), "Keine offenen Aufgaben.");
});
