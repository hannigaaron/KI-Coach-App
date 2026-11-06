import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bilanzSatz, tageListe, tagKurz, tagStand, wochenschnitt, wochenschnittText, zeitraumText, type VerlaufTag } from "./essensverlauf.js";

const tag = (t: string, x: Partial<VerlaufTag> = {}): VerlaufTag => ({
  tag: t, mahlzeiten: 3, kcal: 2500, proteinG: 170, fatG: 70, carbsG: 300,
  zielKcal: 2600, zielProteinG: 175, zielFatG: 70, zielCarbsG: 310, verbrauchKcal: 3000, ...x,
});

test("Ein Tag ohne Eintrag ist leer, unter der Hälfte unvollständig", () => {
  assert.equal(tagStand(tag("2026-11-02", { mahlzeiten: 0, kcal: 0 })), "leer");
  assert.equal(tagStand(tag("2026-11-02", { kcal: 1200 })), "unvollstaendig");
  assert.equal(tagStand(tag("2026-11-02", { kcal: 2600 })), "im_ziel");
  assert.equal(tagStand(tag("2026-11-02", { kcal: 2900 })), "drueber");
  assert.equal(tagStand(tag("2026-11-02", { kcal: 2200 })), "drunter");
});

test("Lücken und unvollständige Tage zählen nicht in den Schnitt", () => {
  const w = wochenschnitt([
    tag("2026-11-02", { kcal: 2400, proteinG: 160 }),
    tag("2026-11-03", { mahlzeiten: 0, kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 }),
    tag("2026-11-04", { kcal: 900, proteinG: 40 }),
    tag("2026-11-05", { kcal: 2600, proteinG: 180 }),
  ]);
  assert.equal(w.tage, 4);
  assert.equal(w.mitEintrag, 3);
  assert.equal(w.gezaehlt, 2);
  assert.deepEqual(w.leer, ["2026-11-03"]);
  assert.deepEqual(w.unvollstaendig, ["2026-11-04"]);
  assert.equal(w.schnitt?.kcal, 2500);
  assert.equal(w.schnitt?.proteinG, 170);
});

test("Die Bilanz ist Aufnahme minus Verbrauch, negativ heisst Defizit", () => {
  const w = wochenschnitt([tag("2026-11-02", { kcal: 2500 }), tag("2026-11-03", { kcal: 2300 })]);
  assert.equal(w.verbrauchKcal, 3000);
  assert.equal(w.bilanzKcal, -600);
  assert.equal(w.bilanzSummeKcal, -1200);
  // 600 * 7 / 7700
  assert.equal(w.kgJeWoche, -0.55);
  const satz = bilanzSatz(w);
  assert.match(satz, /Defizit im Schnitt 600 kcal am Tag, zusammen 1200 kcal/);
  assert.match(satz, /nach Formel/);
});

test("Ohne Verbrauch wird keine Bilanz erfunden", () => {
  const w = wochenschnitt([tag("2026-11-02", { verbrauchKcal: null })]);
  assert.equal(w.bilanzKcal, null);
  assert.match(bilanzSatz(w), /fehlt der Verbrauch/);
});

test("Überschuss und gemessener Verbrauch werden genannt", () => {
  const w = wochenschnitt([tag("2026-11-02", { kcal: 3400 })], { verbrauchQuelle: "gemessen" });
  assert.match(bilanzSatz(w), /Überschuss im Schnitt 400 kcal/);
  assert.match(bilanzSatz(w), /gemessen aus deinem Gewichtsverlauf/);
});

test("Der Text nennt Makros, Lücken und unvollständige Tage", () => {
  const text = wochenschnittText(wochenschnitt([
    tag("2026-11-02"),
    tag("2026-11-03", { mahlzeiten: 0, kcal: 0 }),
    tag("2026-11-04", { kcal: 500 }),
  ]));
  assert.match(text, /Wochenschnitt 2\. bis 4\. Nov\./);
  assert.match(text, /Gezählt: 1 von 3 Tagen/);
  assert.match(text, /Protein: 170 von 175 g/);
  assert.match(text, /Ohne Eintrag, zählt nicht: Di 3\. Nov\.\n/);
  assert.ok(!text.includes(".."));
  assert.match(text, /wohl unvollständig, zählt nicht: Mi 4\. Nov\./);
  assert.ok(!text.includes("–") && !text.includes("—"));
});

test("Ohne gezählten Tag kommt keine Zahl", () => {
  const text = wochenschnittText(wochenschnitt([tag("2026-11-02", { mahlzeiten: 0, kcal: 0 })]));
  assert.match(text, /nichts eingetragen/);
  assert.ok(!/kcal/.test(text));
});

test("Datumsangaben in Worten", () => {
  assert.equal(tagKurz("2026-11-02"), "Mo 2. Nov.");
  assert.equal(zeitraumText("2026-10-27", "2026-11-02"), "27. Okt. bis 2. Nov.");
});

test("Eine Woche ohne abgeschlossenen Tag nennt keine Zahl", () => {
  const text = wochenschnittText(wochenschnitt([]));
  assert.match(text, /noch kein abgeschlossener Tag/);
});

test("Die Liste der Tage endet mit genau einem Punkt", () => {
  assert.equal(tageListe(["2026-11-03"]), "Di 3. Nov.");
  assert.equal(tageListe(["2026-05-04"]), "Mo 4. Mai.");
});
