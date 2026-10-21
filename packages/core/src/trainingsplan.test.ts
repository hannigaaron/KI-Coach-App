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
  for (const tage of [1, 2, 3, 4, 5] as const) {
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

const mitGeraet = (e: PlanUebung, equipment: string): PlanUebung => ({ ...e, equipment });
/** LIB plus freie Gewichte für Einsteiger, damit die Wahl zwischen geführt und frei sichtbar wird. */
const LIB_FREI: PlanUebung[] = [
  ...LIB,
  mitGeraet(u("kh-schraeg", "incline_push", "brust", "beginner"), "dumbbell"),
  mitGeraet(u("kh-bank", "horizontal_push", "brust", "beginner"), "dumbbell"),
  mitGeraet(u("kh-schulter", "vertical_push", "schultern", "beginner"), "dumbbell"),
  mitGeraet(u("kh-rudern", "horizontal_pull", "ruecken", "beginner"), "dumbbell"),
  mitGeraet(u("goblet", "knee_dominant", "beine", "beginner"), "dumbbell"),
];
const nach = new Map(LIB_FREI.map((e) => [e.id, e]));
const gruppeVon = (id: string) => nach.get(id)!;

test("Bis 45 Minuten steht keine Isolationsübung im Plan, nur die Rumpfübung", () => {
  for (const minuten of [30, 45]) {
    for (const tage of [2, 3, 4, 5] as const) {
      for (const niveau of ["beginner", "intermediate", "advanced"] as const) {
        for (const e of uebungsplanBauen(w({ tage, minuten, niveau }), LIB_FREI).einheiten) {
          for (const p of e.positionen) {
            const x = gruppeVon(p.id);
            assert.ok(x.mechanics === "compound" || x.pattern.startsWith("core_"), `${minuten} min ${e.titel}: ${p.id}`);
          }
        }
      }
    }
  }
});

test("Jede kurze Einheit hat Knie, Hüfte, Drücken, Ziehen und Rumpf, die Rumpfübung zuletzt", () => {
  for (const tage of [2, 3, 4, 5] as const) {
    for (const ziel of ["muskel", "kraft", "fitness"] as const) {
      for (const e of uebungsplanBauen(w({ tage, minuten: 30, ziel }), LIB_FREI).einheiten) {
        const muster = e.positionen.map((p) => gruppeVon(p.id).pattern);
        assert.ok(muster.some((m) => m === "knee_dominant" || m === "unilateral_legs"), `${e.titel}: Knie fehlt`);
        assert.ok(muster.includes("hip_dominant"), `${e.titel}: Hüfte fehlt`);
        assert.ok(muster.some((m) => /_push$/.test(m)), `${e.titel}: Drücken fehlt`);
        assert.ok(muster.some((m) => /_pull$/.test(m)), `${e.titel}: Ziehen fehlt`);
        assert.ok(muster.at(-1)!.startsWith("core_"), `${e.titel}: Rumpf nicht zuletzt`);
      }
    }
  }
});

test("Kurze Einheiten kürzen Sätze und Pausen statt Bewegungen und bleiben in der Zeit", () => {
  for (const minuten of [30, 45]) {
    for (const ziel of ["muskel", "kraft", "fitness"] as const) {
      for (const e of uebungsplanBauen(w({ minuten, ziel }), LIB_FREI).einheiten) {
        assert.equal(e.positionen.length, 5, e.titel);
        assert.ok(e.dauerMin <= minuten, `${e.titel}: ${e.dauerMin} > ${minuten}`);
        for (const p of e.positionen) assert.ok(p.saetze >= 2, `${p.id} nur ${p.saetze} Satz`);
      }
    }
  }
});

test("Die Beinübung steht vor Drücken und Ziehen", () => {
  for (const minuten of [30, 45, 60, 75]) {
    for (const e of uebungsplanBauen(w({ tage: 3, minuten }), LIB_FREI).einheiten) {
      const muster = e.positionen.map((p) => gruppeVon(p.id).pattern);
      const bein = muster.findIndex((m) => ["knee_dominant", "unilateral_legs", "hip_dominant"].includes(m));
      const ober = muster.findIndex((m) => /_(push|pull)$/.test(m));
      if (bein >= 0 && ober >= 0) assert.ok(bein < ober, `${minuten} min ${e.titel}`);
    }
  }
});

test("Einsteiger drücken, ziehen und beugen an geführten Geräten statt mit freien Gewichten", () => {
  for (const minuten of [30, 45, 60, 75]) {
    for (const tage of [2, 3, 4, 5] as const) {
      for (const e of uebungsplanBauen(w({ tage, minuten, niveau: "beginner" }), LIB_FREI).einheiten) {
        for (const p of e.positionen) assert.ok(!p.id.startsWith("kh-") && p.id !== "goblet", `${tage} Tage ${minuten} min ${e.titel}: ${p.id}`);
      }
    }
  }
});

test("Ohne geführte Alternative bekommen Einsteiger trotzdem eine Übung", () => {
  const nurFrei = LIB_FREI.filter((e) => e.pattern !== "horizontal_push" && e.pattern !== "incline_push" || e.id.startsWith("kh-"));
  const plan = uebungsplanBauen(w({ niveau: "beginner", minuten: 30 }), nurFrei);
  assert.ok(plan.einheiten[0]!.positionen.some((p) => p.id === "kh-bank" || p.id === "kh-schraeg"));
});

test("Fortgeschrittene behalten freie Gewichte", () => {
  const plan = uebungsplanBauen(w({ tage: 5, minuten: 75, niveau: "intermediate" }), LIB_FREI);
  const ids = plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  assert.ok(ids.some((id) => id.startsWith("kh-") || id === "goblet"));
});

test("Kurze Pläne sagen, warum keine Isolation drin ist", () => {
  assert.match(uebungsplanBauen(w({ minuten: 30 }), LIB).hinweise.join(" "), /nur Grundübungen/);
  assert.doesNotMatch(uebungsplanBauen(w({ minuten: 60 }), LIB).hinweise.join(" "), /nur Grundübungen/);
});

test("Knieschmerzen nehmen Kniebeugen und Ausfallschritte aus dem Plan", () => {
  const plan = uebungsplanBauen(w({ beschwerden: ["knie"] }), LIB);
  const ids = plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  assert.equal(ids.some((id) => id.startsWith("kniebeuge") || id.startsWith("ausfall")), false);
  assert.ok(ids.length > 0);
  assert.ok(plan.hinweise.some((h) => /Knie/.test(h) && /keine Diagnose/.test(h)));
});

test("Ohne Geräte stehen nur Übungen mit Körpergewicht im Plan", () => {
  const lib = LIB.map((e) => (e.id === "plank" || e.id === "bank1" ? { ...e, equipment: "bodyweight" } : e));
  const plan = uebungsplanBauen(w({ ort: "ohne" }), lib);
  const ids = plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  assert.deepEqual([...new Set(ids)].sort(), ["bank1", "plank"]);
});

test("Eine gemiedene Übung kommt nicht vor", () => {
  const plan = uebungsplanBauen(w({ meiden: ["bank1", "bank2"] }), LIB);
  const ids = plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  assert.equal(ids.includes("bank1") || ids.includes("bank2"), false);
});

test("Eine lange Einheit füllt ihre Zeit, die Entlastung nicht", () => {
  const sechzig = uebungsplanBauen(w({ tage: 4, minuten: 60 }), LIB).einheiten;
  const neunzig = uebungsplanBauen(w({ tage: 4, minuten: 90 }), LIB).einheiten;
  const deload = uebungsplanBauen(w({ tage: 4, minuten: 90, deload: true }), LIB).einheiten;
  for (let i = 0; i < neunzig.length; i++) {
    assert.ok(neunzig[i]!.dauerMin > sechzig[i]!.dauerMin, neunzig[i]!.titel);
    assert.ok(neunzig[i]!.dauerMin <= 90);
    assert.ok(deload[i]!.dauerMin < neunzig[i]!.dauerMin);
  }
});

test("Grundübungen zuerst, Isolation danach, Rumpf am Ende", () => {
  const nachId = new Map(LIB.map((e) => [e.id, e]));
  for (const minuten of [60, 90]) for (const tage of [2, 3, 4, 5] as const) {
    for (const e of uebungsplanBauen(w({ tage, minuten }), LIB).einheiten) {
      const arten = e.positionen.map((p) => nachId.get(p.id)!);
      const ersteIso = arten.findIndex((u) => u.mechanics === "isolation");
      const letzteGrund = arten.map((u) => u.mechanics === "compound").lastIndexOf(true);
      if (ersteIso >= 0) assert.ok(letzteGrund < ersteIso, `${tage}/${minuten} ${e.titel}`);
      const rumpf = arten.findIndex((u) => u.gruppe === "rumpf");
      if (rumpf >= 0) assert.ok(arten.slice(rumpf).every((u) => u.gruppe === "rumpf"), `${tage}/${minuten} ${e.titel}`);
    }
  }
});
