import assert from "node:assert/strict";
import test from "node:test";
import { uebungsplanBauen, zuSchwerZusammen, type PlanUebung, type Uebungsplan } from "./trainingsplan.js";
import {
  einheitHaeltZns, fortschritt, letzteEinheit, planAktualisieren, satzWert, type LogEintrag,
} from "./trainingslog.js";

const u = (id: string, pattern: string, gruppe: string, equipment = "barbell", level: PlanUebung["level"] = "intermediate", mechanics: PlanUebung["mechanics"] = "compound"): PlanUebung => ({
  id, name: id, pattern, gruppe, level, mechanics, primaryMuscles: ["X"], secondaryMuscles: [], equipment, repRange: "8-12",
});

const LIB: PlanUebung[] = [
  u("kniebeuge-langhantel", "knee_dominant", "beine"), u("beinpresse", "knee_dominant", "beine", "machine", "beginner"),
  u("kreuzheben", "hip_dominant", "beine"), u("hip-thrust", "hip_dominant", "beine"),
  u("bank1", "horizontal_push", "brust"), u("bank2", "horizontal_push", "brust", "dumbbell"),
  u("rudern1", "horizontal_pull", "ruecken"), u("zug1", "vertical_pull", "ruecken"),
  u("press1", "vertical_push", "schultern"), u("ausfall", "unilateral_legs", "beine", "dumbbell"),
  u("plank", "core_anti_extension", "rumpf", "bodyweight", "beginner", "isometric"),
];

test("Reserve zählt wie Wiederholungen", () => {
  assert.equal(satzWert({ kg: 80, wdh: 8, rir: 2 }), satzWert({ kg: 80, wdh: 10, rir: 0 }));
  assert.ok(Math.abs(satzWert({ kg: 100, wdh: 10, rir: null }) - 133.33) < 0.01);
  assert.equal(satzWert({ kg: 0, wdh: 12, rir: 3 }), 15);
  assert.equal(satzWert({ kg: 50, wdh: 0, rir: 2 }), 0);
});

const tag = (n: number) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);
const reihe = (uebung: string, kgs: number[]): LogEintrag[] =>
  kgs.map((kg, i) => ({ datum: tag(i * 7), uebung, saetze: [{ kg, wdh: 8, rir: 2 }, { kg: kg - 10, wdh: 8, rir: 3 }] }));

test("Fortschritt braucht drei Einheiten und vergleicht Anfang mit Ende", () => {
  assert.equal(fortschritt(reihe("a", [60, 62]), "a").prozent, null);
  const f = fortschritt(reihe("a", [60, 60, 65, 70, 70]), "a");
  assert.equal(f.einheiten, 5);
  assert.ok(f.prozent! > 10 && f.prozent! < 20, String(f.prozent));
  assert.equal(fortschritt(reihe("a", [60, 60, 60, 60]), "a").prozent, 0);
});

test("Letzte Einheit ist die jüngste vor dem Tag", () => {
  const log = reihe("a", [60, 62, 64]);
  assert.equal(letzteEinheit(log, "a")!.saetze[0]!.kg, 64);
  assert.equal(letzteEinheit(log, "a", tag(14))!.saetze[0]!.kg, 62);
});

test("Schweres Kreuzheben und schwere Kniebeugen stehen nie in einer Einheit", () => {
  assert.ok(zuSchwerZusammen("kreuzheben", ["kniebeuge-langhantel"]));
  assert.ok(!zuSchwerZusammen("hip-thrust", ["kniebeuge-langhantel"]));
  for (const tage of [1, 2, 3, 4, 5] as const) for (const minuten of [30, 60, 90]) for (let variante = 0; variante < 6; variante++) {
    const plan = uebungsplanBauen({ tage, minuten, niveau: "advanced", ziel: "kraft", variante }, LIB);
    for (const e of plan.einheiten) assert.ok(einheitHaeltZns(e.positionen.map((p) => p.id)), `${tage}/${minuten}/${variante} ${e.titel}`);
  }
});

const mitDatum = (plan: Uebungsplan, datum: string) => ({ ...plan, gespeichertAm: `${datum}T10:00:00Z` });

test("Vor acht Wochen ändert sich nichts", () => {
  const plan = mitDatum(uebungsplanBauen({ tage: 3, minuten: 60, niveau: "intermediate", ziel: "muskel" }, LIB), tag(0));
  const r = planAktualisieren(plan, [], LIB, tag(50));
  assert.equal(r.faellig, false);
  assert.equal(r.plan, plan);
});

test("Nach acht Wochen bleibt, was wächst, und Festgefahrenes wird getauscht", () => {
  const plan = mitDatum(uebungsplanBauen({ tage: 2, minuten: 60, niveau: "intermediate", ziel: "muskel" }, LIB), tag(0));
  const ids = plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  const [waechst, steht] = ids.filter((id) => id !== "plank");
  const log = [...reihe(waechst!, [60, 62, 64, 66, 68]), ...reihe(steht!, [80, 80, 79, 80, 80])];
  const r = planAktualisieren(plan, log, LIB, tag(60));
  assert.equal(r.faellig, true);
  assert.ok(r.behalten.some((b) => b.id === waechst));
  const t = r.getauscht.find((x) => x.alt.id === steht);
  assert.ok(t, r.text);
  const neuIds = r.plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  assert.ok(!neuIds.includes(steht!) && neuIds.includes(t!.neu.id));
  assert.ok(neuIds.includes(waechst!));
  assert.equal((r.plan as { aktualisiertAm?: string }).aktualisiertAm, tag(60));
  assert.ok(r.text.includes("Acht Wochen"));
  for (const e of r.plan.einheiten) assert.ok(einheitHaeltZns(e.positionen.map((p) => p.id)));
});

test("Einmal die Woche bleiben die Übungen", () => {
  const plan = mitDatum(uebungsplanBauen({ tage: 1, minuten: 60, niveau: "intermediate", ziel: "muskel" }, LIB), tag(0));
  const id = plan.einheiten[0]!.positionen[0]!.id;
  const r = planAktualisieren(plan, reihe(id, [80, 80, 80, 80]), LIB, tag(60));
  assert.equal(r.getauscht.length, 0);
  assert.deepEqual(r.plan.einheiten, plan.einheiten);
});

test("Ohne Einträge wird nichts geraten", () => {
  const plan = mitDatum(uebungsplanBauen({ tage: 3, minuten: 60, niveau: "intermediate", ziel: "muskel" }, LIB), tag(0));
  const r = planAktualisieren(plan, [], LIB, tag(60));
  assert.equal(r.getauscht.length, 0);
  assert.ok(r.ohneDaten.length > 0);
});
