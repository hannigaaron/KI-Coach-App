import assert from "node:assert/strict";
import test from "node:test";
import type { Aufgabe } from "./aufgaben.js";
import { PLANUNGSQUOTE, wochenplan, wochenplanText, type WochenTagEingabe } from "./wochenplan.js";

const WOCHE = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];

function tage(frei: number[], belegt = 0): WochenTagEingabe[] {
  return WOCHE.map((tag, i) => ({ tag, freieMinuten: frei[i] ?? 0, belegtMinuten: belegt }));
}

function aufgabe(text: string, minuten: number, extra: Partial<Aufgabe> = {}): Aufgabe {
  return { id: text, text, minuten, wichtigkeit: 2, erledigt: false, erstellt: "2026-10-05T08:00:00", ...extra };
}

test("nur ein Teil der freien Zeit wird verplant", () => {
  const plan = wochenplan({ aufgaben: [], tage: tage([300, 300, 300, 300, 300, 300, 300]) });
  assert.equal(plan.tage[0]!.budgetMinuten, Math.floor(300 * PLANUNGSQUOTE));
});

test("die Arbeitsgrenze schlägt die freie Zeit", () => {
  const plan = wochenplan({ aufgaben: [], tage: tage([600, 600, 600, 600, 600, 600, 600], 560), grenzeMinuten: 600 });
  assert.equal(plan.tage[0]!.budgetMinuten, 40);
});

test("das Wichtige mit Frist kommt zuerst und an den frühesten Tag", () => {
  const plan = wochenplan({
    aufgaben: [
      aufgabe("Ablage", 60),
      aufgabe("Angebot", 90, { wichtigkeit: 3, faellig: "2026-10-06" }),
    ],
    tage: tage([150, 150, 150, 150, 150, 150, 150]),
  });
  // 150 Minuten frei ergeben 100 Minuten Budget: das Angebot passt, die Ablage nicht mehr daneben.
  assert.deepEqual(plan.tage[0]!.aufgaben.map((a) => a.text), ["Angebot"]);
  assert.deepEqual(plan.tage[1]!.aufgaben.map((a) => a.text), ["Ablage"]);
});

test("eine Aufgabe landet nie hinter ihrer Frist", () => {
  const plan = wochenplan({
    aufgaben: [aufgabe("Steuer", 120, { faellig: "2026-10-06" })],
    tage: tage([0, 0, 600, 600, 600, 600, 600]),
  });
  assert.equal(plan.tage.some((t) => t.aufgaben.length > 0), false);
  assert.deepEqual(plan.fristGerissen.map((a) => a.text), ["Steuer"]);
  assert.match(wochenplanText(plan), /^Passt vor der Frist nicht mehr: Steuer \(bis Di 6\. Okt\)/);
});

test("eine Frist nach dieser Woche ist kein gerissener Termin", () => {
  const plan = wochenplan({
    aufgaben: [aufgabe("Umzug planen", 600, { faellig: "2026-11-30" })],
    tage: tage([60, 60, 60, 60, 60, 60, 60]),
  });
  assert.equal(plan.fristGerissen.length, 0);
  assert.deepEqual(plan.naechsteWoche.map((a) => a.text), ["Umzug planen"]);
});

test("erledigte Aufgaben fallen raus", () => {
  const plan = wochenplan({
    aufgaben: [aufgabe("Erledigt", 30, { erledigt: true })],
    tage: tage([300, 300, 300, 300, 300, 300, 300]),
  });
  assert.equal(plan.tage.flatMap((t) => t.aufgaben).length, 0);
});

test("der Text nennt die Quote als Regel und zählt leere Tage", () => {
  const text = wochenplanText(wochenplan({
    aufgaben: [aufgabe("Angebot", 60)],
    tage: tage([300, 300, 300, 300, 300, 300, 300]),
  }));
  assert.match(text, /Mo 5\. Okt: Angebot \(60 min\)/);
  assert.match(text, /6 Tage bleiben ohne Aufgaben/);
  assert.match(text, /Regel und keine Messung/);
});

test("volle Kalendertage werden genannt", () => {
  const plan = wochenplan({ aufgaben: [], tage: tage([0, 300, 300, 300, 300, 300, 300]) });
  assert.match(plan.hinweise.join(" "), /An 1 Tag ist keine Zeit für Aufgaben/);
});
