import { test } from "node:test";
import assert from "node:assert/strict";
import { REZEPTE, ZUTATEN } from "./rezepte-daten.js";
import { passung, rezeptEmpfehlungen, rezeptGesperrt, rezeptPortion } from "./rezepte.js";

const MITTAG = { kcal: 750, proteinG: 55, fatG: 22, carbsG: 80 };

test("jede Zutat erfüllt die Makrorechnung im Rahmen der Rundung", () => {
  // kcal = Protein*4 + Fett*9 + Kohlenhydrate*4. Ballaststoffe und Rundung
  // lassen Luft, ein Tippfehler in einer Zehnerstelle fällt trotzdem auf.
  for (const [key, z] of Object.entries(ZUTATEN)) {
    const p = z.per100;
    const rechnung = p.proteinG * 4 + p.fatG * 9 + p.carbsG * 4;
    assert.ok(Math.abs(rechnung - p.kcal) <= Math.max(25, p.kcal * 0.15), `${key}: ${rechnung} gegen ${p.kcal}`);
  }
});

test("jedes Rezept hat Zutaten aus der Tabelle, Schritte und eine eindeutige Kennung", () => {
  const ids = new Set<string>();
  for (const r of REZEPTE) {
    assert.equal(ids.has(r.id), false, r.id);
    ids.add(r.id);
    assert.ok(r.zutaten.length >= 2 && r.schritte.length >= 2, r.id);
    for (const { z } of r.zutaten) assert.ok(ZUTATEN[z], `${r.id}: ${z}`);
    for (const s of r.schritte) assert.doesNotMatch(s, /[—–]/, `Gedankenstrich in ${r.id}`);
  }
});

test("eine Sojaallergie sperrt jedes Rezept mit Tofu, Sojajoghurt oder Sojasauce", () => {
  const { empfehlungen, ausgeblendet } = rezeptEmpfehlungen({ ziel: MITTAG, art: "mittagessen", ernaehrung: { allergien: ["Soja"] } });
  for (const e of empfehlungen) {
    for (const { z } of e.rezept.zutaten) {
      assert.equal((ZUTATEN[z] as { allergene?: string[] }).allergene?.includes("Soja") ?? false, false, `${e.rezept.id} enthält Soja`);
    }
  }
  assert.ok(ausgeblendet.some((a) => a.grund === "enthält Soja"));
});

test("vegan sperrt Fleisch, Fisch, Ei, Milch und Honig", () => {
  for (const r of REZEPTE) {
    const grund = rezeptGesperrt(r, { form: "vegan" });
    const tierisch = r.zutaten.some(({ z }) => "herkunft" in ZUTATEN[z]);
    assert.equal(grund !== null, tierisch, r.id);
  }
});

test("pescetarisch erlaubt Fisch, aber kein Fleisch", () => {
  const lachs = REZEPTE.find((r) => r.id === "lachs-kartoffeln")!;
  const chili = REZEPTE.find((r) => r.id === "chili")!;
  assert.equal(rezeptGesperrt(lachs, { form: "pescetarisch" }), null);
  assert.notEqual(rezeptGesperrt(chili, { form: "pescetarisch" }), null);
});

test("Ausschlüsse und freie Angaben greifen", () => {
  const chili = REZEPTE.find((r) => r.id === "chili")!;
  assert.equal(rezeptGesperrt(chili, { ausschluesse: ["Kein Rindfleisch"] }), "Kein Rindfleisch");
  assert.match(rezeptGesperrt(chili, { meiden: ["Zwiebeln"] }) ?? "", /Zwiebel/);
  assert.match(rezeptGesperrt(chili, { meiden: ["Tomate"] }) ?? "", /Tomaten/);
  const garnelen = REZEPTE.find((r) => r.id === "garnelen-nudeln")!;
  assert.notEqual(rezeptGesperrt(garnelen, { ausschluesse: ["Keine Meeresfrüchte"] }), null);
});

test("ohne passendes Gerät fällt ein Rezept weg, ohne Angabe nicht", () => {
  const lachs = REZEPTE.find((r) => r.id === "lachs-kartoffeln")!;
  assert.equal(rezeptGesperrt(lachs, { geraete: [] }), null);
  assert.match(rezeptGesperrt(lachs, { geraete: ["Herd"] }) ?? "", /Backofen/);
  assert.equal(rezeptGesperrt(lachs, { geraete: ["Airfryer"] }), null);
});

test("die Portion trifft das Ziel und rechnet aus gerundeten Mengen", () => {
  const r = REZEPTE.find((x) => x.id === "haehnchen-reis-brokkoli")!;
  const { posten } = rezeptPortion(r, 750);
  const kcal = posten.reduce((s, p) => s + p.kcal, 0);
  assert.ok(Math.abs(kcal - 750) < 60, String(kcal));
  for (const p of posten) assert.equal(p.gramm % 5, 0, p.name);
});

test("Eier bleiben ganze Eier", () => {
  const r = REZEPTE.find((x) => x.id === "ruehrei-brot")!;
  const ei = rezeptPortion(r, 420).posten.find((p) => p.key === "ei")!;
  assert.equal(ei.gramm % 58, 0);
  assert.match(ei.menge, /^\d+ (Ei|Eier)$/);
});

test("die Portion bleibt in ihren Grenzen", () => {
  const r = REZEPTE.find((x) => x.id === "quark-beeren")!;
  assert.equal(rezeptPortion(r, 5000).faktor, 1.8);
  assert.equal(rezeptPortion(r, 10).faktor, 0.6);
});

test("Passung: genau getroffen ist 100, alles verfehlt ist 0", () => {
  assert.equal(passung(MITTAG, MITTAG), 100);
  assert.equal(passung({ kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 }, MITTAG), 0);
});

test("sortiert nach Passung, und für jede Mahlzeit gibt es etwas", () => {
  for (const art of ["fruehstueck", "mittagessen", "abendessen", "snack"] as const) {
    const ziel = art === "snack" ? { kcal: 300, proteinG: 30, fatG: 8, carbsG: 25 } : MITTAG;
    const { empfehlungen } = rezeptEmpfehlungen({ ziel, art });
    assert.ok(empfehlungen.length >= 4, art);
    for (let i = 1; i < empfehlungen.length; i++) {
      assert.ok(empfehlungen[i - 1]!.passung >= empfehlungen[i]!.passung - 3, art);
    }
  }
});

test("Vorrat entscheidet nur bei fast gleicher Passung", () => {
  const ohne = rezeptEmpfehlungen({ ziel: MITTAG, art: "mittagessen" }).empfehlungen;
  const mit = rezeptEmpfehlungen({ ziel: MITTAG, art: "mittagessen", vorrat: ["Hähnchenbrust", "Reis"] }).empfehlungen;
  assert.ok(mit[0]!.passung >= ohne[0]!.passung - 3);
  assert.ok(mit.some((e) => e.imVorrat.includes("Hähnchenbrust")));
});

test("jedes Rezept mit Foto hat eine Datei dazu", async () => {
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  for (const r of REZEPTE.filter((x) => x.foto)) {
    const pfad = fileURLToPath(new URL(`../../../apps/pwa/img/rezepte/${r.id}.jpg`, import.meta.url));
    assert.ok(existsSync(pfad), `${r.id}: ${pfad}`);
  }
});
