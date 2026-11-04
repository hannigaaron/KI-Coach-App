import { strict as assert } from "node:assert";
import { test } from "node:test";
import { rueckblickArt, wochenbeginn, wochenrueckblick, type RueckblickTag } from "./wochenrueckblick.js";

const tag = (t: string, x: Partial<RueckblickTag> = {}): RueckblickTag => ({
  tag: t, mahlzeiten: 3, kcal: 2900, proteinG: 170, zielKcal: 3000, zielProteinG: 175,
  wasserMl: 3000, zielWasserMl: 3200, trainings: 0, geplant: 0, ...x,
});

test("Mittwoch ist Zwischenstand, Sonntag Rückblick, die Woche beginnt am Montag", () => {
  assert.equal(rueckblickArt("2026-11-04"), "zwischenstand");
  assert.equal(rueckblickArt("2026-11-08"), "woche");
  assert.equal(rueckblickArt("2026-11-05"), null);
  assert.equal(wochenbeginn("2026-11-08"), "2026-11-02");
  assert.equal(wochenbeginn("2026-11-02"), "2026-11-02");
});

test("Tage ohne Eintrag sind Lücken und kein Tag ohne Essen", () => {
  const r = wochenrueckblick([
    tag("2026-11-02"), tag("2026-11-03", { mahlzeiten: 0, kcal: 0, proteinG: 0 }), tag("2026-11-04"),
  ], { art: "zwischenstand", ziel: "maintain" });
  assert.match(r.text, /eingetragen an 2 von 3 Tagen/);
  assert.match(r.text, /Protein gedeckt an 2 von 2 gezählten Tagen/);
  assert.match(r.text, /Kalorien im Schnitt 2900 von 3000/);
  assert.ok(r.gut.some((g) => /Protein sitzt/.test(g)));
});

test("ein halb eingetragener Tag zählt nicht in den Schnitt, und der Rückblick sagt das", () => {
  const r = wochenrueckblick([tag("2026-11-02"), tag("2026-11-03", { kcal: 900, proteinG: 40, mahlzeiten: 1 })], { art: "zwischenstand" });
  assert.match(r.text, /1 Tag liegt unter der Hälfte/);
  assert.match(r.text, /Protein gedeckt an 1 von 1/);
});

test("zu wenig Protein ergibt einen konkreten Tipp mit Gramm je Mahlzeit und den Fokus", () => {
  const tage = ["02", "03", "04", "05", "06", "07", "08"].map((d) => tag(`2026-11-${d}`, { proteinG: 110, mahlzeiten: 4, trainings: d === "03" ? 1 : 0, geplant: ["03", "05"].includes(d) ? 1 : 0 }));
  const r = wochenrueckblick(tage, { art: "woche", ziel: "lean_bulk" });
  assert.equal(r.tipps[0], "Plan 45 g Protein in jede deiner 4 Mahlzeiten ein, bevor du sie zusammenstellst. 250 g Magerquark bringen rund 30 g, drei Eier rund 20 g.");
  assert.ok(r.tipps.length >= 2 && r.tipps.length <= 3);
  assert.match(r.text, /Training: 1 von 2 geplanten Einheiten, aus App/);
  assert.match(r.text, /Fokus für nächste Woche: Plan 45 g Protein/);
  assert.match(r.kurz, /^Protein diese Woche an 0 Prozent/);
  assert.doesNotMatch(r.text, /[\u2013\u2014]/);
});

test("eine gute Woche bekommt Lob und trotzdem einen Schritt nach vorn", () => {
  const r = wochenrueckblick(["02", "03", "04", "05", "06", "07", "08"].map((d) => tag(`2026-11-${d}`)), { art: "woche" });
  assert.equal(r.besser.length, 0);
  assert.equal(r.tipps.length, 1);
  assert.match(r.text, /Jeden Tag eingetragen/);
});
