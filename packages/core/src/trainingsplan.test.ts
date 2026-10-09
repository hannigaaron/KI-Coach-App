import assert from "node:assert/strict";
import test from "node:test";
import { pauseText, uebungsplanBauen, uebungsplanText, type PlanUebung, type PlanWunsch } from "./trainingsplan.js";

const u = (id: string, pattern: string, gruppe: string, level: PlanUebung["level"], mechanics: PlanUebung["mechanics"] = "compound", muskeln: string[] = ["X"]): PlanUebung => ({
  id, name: id, pattern, gruppe, level, mechanics, primaryMuscles: muskeln, secondaryMuscles: [], equipment: "machine", repRange: "8-12",
});

/** Ein kleiner Satz, der jeden Platz belegt. Zwei Einsteigerübungen je Platz, damit die Abwechslung sichtbar wird. */
const LIB: PlanUebung[] = [
  u("kniebeuge1", "knee_dominant", "beine", "beginner"), u("kniebeuge2", "knee_dominant", "beine", "intermediate"),
  u("ausfall1", "unilateral_legs", "beine", "beginner"), u("ausfall2", "unilateral_legs", "beine", "intermediate"),
  u("rdl1", "hip_dominant", "beine", "beginner"), u("rdl2", "hip_dominant", "beine", "intermediate"),
  u("curl1", "knee_flexion", "beine", "beginner", "isolation"), u("wade1", "calves", "beine", "beginner", "isolation"),
  u("bank1", "horizontal_push", "brust", "beginner"), u("bank2", "incline_push", "brust", "intermediate"),
  u("fly1", "chest_isolation", "brust", "beginner", "isolation"),
  u("press1", "vertical_push", "schultern", "beginner"), u("press2", "vertical_push", "schultern", "intermediate"),
  u("rudern1", "horizontal_pull", "ruecken", "beginner"), u("rudern2", "horizontal_pull", "ruecken", "intermediate"),
  u("zug1", "vertical_pull", "ruecken", "beginner"), u("zug2", "vertical_pull", "ruecken", "advanced"),
  u("seit1", "shoulder_isolation", "schultern", "beginner", "isolation", ["seitliche Schulter"]),
  u("bizeps1", "elbow_flexion", "arme", "beginner", "isolation"), u("trizeps1", "elbow_extension", "arme", "beginner", "isolation"),
  u("plank", "core_anti_extension", "rumpf", "beginner", "isometric"),
];

const w = (teil: Partial<PlanWunsch> = {}): PlanWunsch => ({ tage: 3, minuten: 60, niveau: "intermediate", ziel: "muskel", ...teil });

test("Jede Tageszahl ergibt genau so viele Einheiten", () => {
  for (const tage of [2, 3, 4, 5] as const) {
    assert.equal(uebungsplanBauen(w({ tage }), LIB).einheiten.length, tage);
  }
});

test("Dieselbe Eingabe ergibt denselben Plan", () => {
  assert.deepEqual(uebungsplanBauen(w(), LIB), uebungsplanBauen(w(), LIB));
});

test("Eine andere Variante tauscht Übungen, lässt den Aufbau aber stehen", () => {
  const a = uebungsplanBauen(w({ variante: 0 }), LIB);
  const b = uebungsplanBauen(w({ variante: 7 }), LIB);
  assert.equal(a.einheiten.length, b.einheiten.length);
  assert.deepEqual(a.einheiten.map((e) => e.titel), b.einheiten.map((e) => e.titel));
});

test("Einsteiger bekommen nur Einsteigerübungen", () => {
  const plan = uebungsplanBauen(w({ niveau: "beginner" }), LIB);
  const einsteiger = new Set(LIB.filter((e) => e.level === "beginner").map((e) => e.id));
  for (const e of plan.einheiten) for (const p of e.positionen) assert.ok(einsteiger.has(p.id), p.id);
});

test("In einer Einheit steht keine Übung zweimal", () => {
  for (const tage of [2, 3, 4, 5] as const) {
    for (const e of uebungsplanBauen(w({ tage }), LIB).einheiten) {
      const ids = e.positionen.map((p) => p.id);
      assert.equal(new Set(ids).size, ids.length, e.titel);
    }
  }
});

test("Eine Einheit hat mindestens drei Übungen, auch bei kurzer Zeit", () => {
  for (const e of uebungsplanBauen(w({ minuten: 30 }), LIB).einheiten) assert.ok(e.positionen.length >= 3, e.titel);
});

test("Kürzere Einheiten haben nicht mehr Übungen als längere", () => {
  const kurz = uebungsplanBauen(w({ minuten: 30 }), LIB).einheiten[0]!.positionen.length;
  const lang = uebungsplanBauen(w({ minuten: 75 }), LIB).einheiten[0]!.positionen.length;
  assert.ok(kurz <= lang);
});

test("Die geschätzte Dauer bleibt bei normaler Länge in der gewünschten Zeit", () => {
  for (const minuten of [45, 60, 75]) {
    for (const e of uebungsplanBauen(w({ minuten }), LIB).einheiten) assert.ok(e.dauerMin <= minuten, `${e.titel}: ${e.dauerMin} > ${minuten}`);
  }
});

test("Ab drei Tagen trifft der Plan Brust, Rücken und Beine mindestens zweimal", () => {
  for (const tage of [3, 4, 5] as const) {
    const plan = uebungsplanBauen(w({ tage, minuten: 75 }), LIB);
    for (const gruppe of ["brust", "ruecken", "beine"]) {
      const tageMitGruppe = plan.einheiten.filter((e) => e.positionen.some((p) => LIB.find((x) => x.id === p.id)?.gruppe === gruppe)).length;
      assert.ok(tageMitGruppe >= 2, `${gruppe} bei ${tage} Tagen nur an ${tageMitGruppe}`);
    }
  }
});

test("Kraft nimmt weniger Wiederholungen und längere Pausen als Muskelaufbau", () => {
  const kraft = uebungsplanBauen(w({ ziel: "kraft", niveau: "advanced" }), LIB).einheiten[0]!.positionen[0]!;
  const muskel = uebungsplanBauen(w({ ziel: "muskel", niveau: "advanced" }), LIB).einheiten[0]!.positionen[0]!;
  assert.equal(kraft.wdh, "3-6");
  assert.equal(muskel.wdh, "6-10");
  assert.ok(kraft.pauseSek > muskel.pauseSek);
});

test("Die Entlastung halbiert die Sätze und erhöht die Reserve um zwei", () => {
  const normal = uebungsplanBauen(w({ tage: 2 }), LIB).einheiten[0]!.positionen[0]!;
  const deload = uebungsplanBauen(w({ tage: 2, deload: true }), LIB).einheiten[0]!.positionen[0]!;
  assert.equal(deload.saetze, Math.ceil(normal.saetze / 2));
  assert.equal(deload.reserve, normal.reserve + 2);
});

test("Eine Haltübung behält ihren Zeitbereich statt Wiederholungen", () => {
  const plan = uebungsplanBauen(w({ tage: 4, minuten: 75 }), [...LIB, { ...u("plank2", "core_anti_extension", "rumpf", "beginner", "isometric"), repRange: "20-60s" }]);
  const haltungen = plan.einheiten.flatMap((e) => e.positionen).filter((p) => p.id.startsWith("plank"));
  assert.ok(haltungen.length > 0);
  for (const p of haltungen) assert.ok(/s$/.test(p.wdh) || p.wdh === "8-12");
});

test("Die Wochensätze entsprechen der Summe der Positionen", () => {
  const plan = uebungsplanBauen(w({ tage: 4 }), LIB);
  const summe = Object.values(plan.wochensaetze).reduce((a, b) => a + b, 0);
  const aus = plan.einheiten.flatMap((e) => e.positionen).reduce((a, p) => a + p.saetze, 0);
  assert.equal(summe, aus);
});

test("Unter zehn Sätzen steht ein Hinweis mit der Zahl, ohne Heilsversprechen", () => {
  const plan = uebungsplanBauen(w({ tage: 2, minuten: 30 }), LIB);
  const text = plan.hinweise.join(" ");
  assert.match(text, /Direkte Sätze pro Woche/);
  assert.match(text, /Einsteiger kommen mit weniger aus/);
  assert.doesNotMatch(text, /garantiert|sicher|beweist/i);
});

test("Fehlt ein Platz in der Datenbank, wird er übersprungen statt zu scheitern", () => {
  const ohneWaden = LIB.filter((e) => e.pattern !== "calves");
  assert.doesNotThrow(() => uebungsplanBauen(w({ tage: 4, minuten: 75 }), ohneWaden));
});

test("Pausen werden lesbar gesetzt", () => {
  assert.equal(pauseText(45), "45 s");
  assert.equal(pauseText(120), "2 min");
  assert.equal(pauseText(150), "2,5 min");
});

test("Der Text zum Weitergeben nennt jede Einheit und jede Übung", () => {
  const plan = uebungsplanBauen(w({ tage: 2 }), LIB);
  const text = uebungsplanText(plan);
  assert.match(text, /Ganzkörper A/);
  assert.match(text, /Ganzkörper B/);
  for (const e of plan.einheiten) for (const p of e.positionen) assert.ok(text.includes(p.name));
  assert.doesNotMatch(text, /[–—]/);
});
