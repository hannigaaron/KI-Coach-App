import { test } from "node:test";
import assert from "node:assert/strict";
import { tageLeisteHtml, tagZeile, zeitleisteHtml } from "./kalender-zeitleiste.js";

const uhr = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const um = (h, m = 0) => new Date(2026, 10, 26, h, m).getTime();

test("Sieben Tage ab heute, der gewählte ist an", () => {
  const html = tageLeisteHtml("2026-11-26", "2026-11-27");
  assert.equal((html.match(/data-kal-tag=/g) ?? []).length, 7);
  assert.match(html, /data-kal-tag="2026-11-27" aria-pressed="true"/);
  assert.match(html, /<small>Do<\/small><b>26<\/b>/);
});

test("Zeitleiste: Termin, Essen mit Tauschen, Aufgabe mit Haken, kein Feierabend", () => {
  const punkte = [
    { art: "termin", um: um(8, 30), bis: um(12), titel: "Projektarbeit", unter: "Termin bis 12:00" },
    { art: "essen", um: um(12, 30), titel: "Tofu Pfanne", unter: "Mittagessen, 796 kcal, 44 g Protein", rezeptId: "tofu", foto: true, mahlzeit: "mittag", kcal: 796 },
    { art: "aufgabe", um: null, titel: "Einkauf", unter: "Aufgabe, wichtig", id: "a1" },
    { art: "feierabend", um: um(20), titel: "Feierabend", unter: "" },
  ];
  const html = zeitleisteHtml(punkte, { jetzt: 1, uhr, tausch: () => "<button data-essen-tauschen></button>" });
  assert.equal((html.match(/class="kz-punkt/g) ?? []).length, 3);
  assert.match(html, /bis 12:00/);
  assert.match(html, /796 kcal · 44 g Protein<button data-essen-tauschen>/);
  assert.match(html, /kz-essen jetzt/);
  assert.match(html, /data-erledigt="a1"/);
  assert.match(html, /<time>offen<\/time>/);
  assert.doesNotMatch(html, /Feierabend|undefined/);
  assert.match(zeitleisteHtml([], { uhr }), /Nichts eingetragen/);
});

test("Zeile über der Leiste: verplant, freier Block, Ganztägiges", () => {
  const z = tagZeile({ belegtMinuten: 300, fokusblock: { von: um(15, 45), bis: um(22, 45) }, geburtstage: ["Zoe"], ganztags: [] }, { uhr, dauer: (m) => `${m / 60} h` });
  assert.equal(z, "5 h verplant · frei 15:45 bis 22:45 · Zoe hat Geburtstag");
  assert.equal(tagZeile({ belegtMinuten: 0 }, { uhr, dauer: String }), "Nichts verplant");
});
