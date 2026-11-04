import { test } from "node:test";
import assert from "node:assert/strict";
import { essensplanBauen, essensplanText } from "./essensplan.js";
import { ZUTATEN, type Zutat } from "./rezepte-daten.js";

const ZIEL = { kcal: 3000, proteinG: 175, fatG: 85, carbsG: 380 };
const START = "2026-11-02";

test("sieben Tage mit vier Mahlzeiten, jeder Tag nahe am Ziel", () => {
  const p = essensplanBauen({ ziel: ZIEL, start: START });
  assert.equal(p.tage.length, 7);
  assert.deepEqual(p.tage.map((t) => t.datum), ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"]);
  for (const t of p.tage) {
    assert.equal(t.mahlzeiten.length, 4, t.datum);
    assert.ok(Math.abs(t.summe.kcal - ZIEL.kcal) <= ZIEL.kcal * 0.15, `${t.datum}: ${t.summe.kcal}`);
    assert.ok(t.passung >= 70, `${t.datum}: ${t.passung}`);
  }
});

test("die Nährwerte kommen aus den Zutaten und gehen in der Summe auf", () => {
  const p = essensplanBauen({ ziel: ZIEL, start: START });
  for (const t of p.tage) {
    const posten = [...t.mahlzeiten.flatMap((m) => m.empfehlung.posten), ...t.ergaenzung];
    assert.equal(t.summe.kcal, Math.round(posten.reduce((s, p) => s + p.kcal, 0)));
    assert.equal(t.summe.proteinG, Math.round(posten.reduce((s, p) => s + p.proteinG, 0)));
    for (const pp of posten) {
      assert.ok(Math.abs(pp.kcal - (ZUTATEN[pp.key].per100.kcal * pp.gramm) / 100) < 0.01);
    }
  }
});

test("das Abendessen kommt als Paar zum Vorkochen, das Mittagessen jeden Tag anders", () => {
  const p = essensplanBauen({ ziel: ZIEL, start: START });
  const abend = p.tage.map((t) => t.mahlzeiten.find((m) => m.art === "abendessen")!);
  for (const i of [0, 2, 4]) {
    assert.equal(abend[i]!.empfehlung.rezept.id, abend[i + 1]!.empfehlung.rezept.id, `Tag ${i}`);
    assert.equal(abend[i]!.vorkochen, "doppelt");
    assert.equal(abend[i + 1]!.vorkochen, "vorgekocht");
  }
  assert.equal(new Set(abend.map((m) => m.empfehlung.rezept.id)).size, 4);
  const mittag = p.tage.map((t) => t.mahlzeiten.find((m) => m.art === "mittagessen")!.empfehlung.rezept.id);
  assert.ok(new Set(mittag).size >= 6, mittag.join(", "));
  for (let i = 1; i < 7; i++) assert.notEqual(mittag[i], mittag[i - 1]);
  // Ein Abendessen ist neu, wenn es gekocht wird, nie ein Rest vom Mittag.
  const vorher = (i: number) => p.tage.slice(0, i).flatMap((t) => t.mahlzeiten.map((m) => m.empfehlung.rezept.id));
  for (const i of [0, 2, 4, 6]) assert.ok(!vorher(i).includes(abend[i]!.empfehlung.rezept.id), `Abend ${i}`);
  const ohne = essensplanBauen({ ziel: ZIEL, start: START, vorkochen: false });
  const abendOhne = ohne.tage.map((t) => t.mahlzeiten.find((m) => m.art === "abendessen")!.empfehlung.rezept.id);
  for (let i = 1; i < 7; i++) assert.notEqual(abendOhne[i], abendOhne[i - 1]);
});

test("Kalorien und Makros treffen jeden Tag, auch in der Diät und vegetarisch", () => {
  const faelle = [
    { ziel: ZIEL, ernaehrung: {} },
    { ziel: { kcal: 1700, proteinG: 140, fatG: 55, carbsG: 160 }, ernaehrung: {} },
    { ziel: { kcal: 2100, proteinG: 120, fatG: 70, carbsG: 245 }, ernaehrung: { form: "vegetarisch" as const } },
    { ziel: { kcal: 3600, proteinG: 190, fatG: 100, carbsG: 480 }, ernaehrung: {} },
  ];
  for (const f of faelle) {
    const p = essensplanBauen({ ziel: f.ziel, start: START, ernaehrung: f.ernaehrung });
    for (const t of p.tage) {
      const wo = `${f.ziel.kcal} ${JSON.stringify(f.ernaehrung)} ${t.datum}`;
      assert.ok(Math.abs(t.summe.kcal / f.ziel.kcal - 1) <= 0.06, `${wo} kcal ${t.summe.kcal}`);
      assert.ok(t.summe.proteinG >= f.ziel.proteinG * 0.92, `${wo} Protein ${t.summe.proteinG} unter ${f.ziel.proteinG}`);
      assert.ok(t.summe.proteinG <= f.ziel.proteinG * 1.25, `${wo} Protein ${t.summe.proteinG} über ${f.ziel.proteinG}`);
    }
  }
});

test("eine knappe Auswahl wiederholt, aber nie am Tag darauf, und sagt es dazu", () => {
  const p = essensplanBauen({ ziel: ZIEL, start: START, ernaehrung: { form: "vegan" } });
  for (const art of ["fruehstueck", "mittagessen", "snack"] as const) {
    const ids = p.tage.map((t) => t.mahlzeiten.find((m) => m.art === art)?.empfehlung.rezept.id);
    for (let i = 1; i < ids.length; i++) if (ids[i]) assert.notEqual(ids[i], ids[i - 1], `${art} an Tag ${i}`);
  }
  assert.ok(p.hinweise.some((h) => /wiederholen sie sich/.test(h)), p.hinweise.join(" "));
});

test("eine Allergie sperrt jedes Rezept mit dem Allergen, an jedem Tag", () => {
  const p = essensplanBauen({ ziel: ZIEL, start: START, ernaehrung: { allergien: ["Soja", "Milch"] } });
  for (const t of p.tage) for (const m of t.mahlzeiten) for (const { z } of m.empfehlung.rezept.zutaten) {
    const allergene: string[] = (ZUTATEN[z] as { allergene?: string[] }).allergene ?? [];
    assert.ok(!allergene.includes("Soja") && !allergene.includes("Milch"), `${m.empfehlung.rezept.name}: ${z}`);
  }
});

test("gleiche Eingabe, gleicher Plan, eine andere Variante ändert ihn", () => {
  const a = essensplanText(essensplanBauen({ ziel: ZIEL, start: START }));
  assert.equal(essensplanText(essensplanBauen({ ziel: ZIEL, start: START })), a);
  assert.notEqual(essensplanText(essensplanBauen({ ziel: ZIEL, start: START, variante: 1 })), a);
});

test("die Einkaufsliste zählt jede Zutat einmal und rundet auf", () => {
  const p = essensplanBauen({ ziel: ZIEL, start: START, vorrat: ["Haferflocken"] });
  const keys = p.einkauf.map((e) => e.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const e of p.einkauf) {
    if ((ZUTATEN[e.key] as Zutat).stueckG) continue;
    const zahl = Number(e.menge.replace(/ k?g$/, "").replace(",", "."));
    const gramm = e.menge.endsWith("kg") ? zahl * 1000 : zahl;
    assert.ok(gramm >= e.gramm && gramm - e.gramm < 10.01, `${e.name}: ${e.menge} für ${e.gramm} g`);
  }
  const hafer = p.einkauf.find((e) => e.key === "haferflocken");
  if (hafer) assert.equal(hafer.imVorrat, true);
});

test("ohne Snack drei Mahlzeiten, und nur die gewählten", () => {
  const p = essensplanBauen({ ziel: ZIEL, start: START, arten: ["abendessen", "fruehstueck", "mittagessen"] });
  for (const t of p.tage) assert.deepEqual(t.mahlzeiten.map((m) => m.art), ["fruehstueck", "mittagessen", "abendessen"]);
});

test("ein eigenes Ziel je Tag, etwa mehr an Trainingstagen", () => {
  const p = essensplanBauen({
    ziel: ZIEL, start: START,
    zielFuer: (d) => (d === "2026-11-04" ? { kcal: 3400, proteinG: 180, fatG: 90, carbsG: 450 } : ZIEL),
  });
  const mi = p.tage.find((t) => t.datum === "2026-11-04")!;
  assert.equal(mi.ziel.kcal, 3400);
  assert.ok(mi.summe.kcal > p.tage[0]!.summe.kcal, `${mi.summe.kcal} gegen ${p.tage[0]!.summe.kcal}`);
});
