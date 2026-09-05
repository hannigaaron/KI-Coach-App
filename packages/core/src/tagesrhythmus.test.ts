import { test } from "node:test";
import assert from "node:assert/strict";
import { abendAbschluss, mittagsBefund, morgenBriefing } from "./tagesrhythmus.js";
import type { MacroTargets } from "./types.js";

const ZIELE: MacroTargets = { kcal: 3000, proteinG: 180, fatG: 90, carbsG: 340, waterMl: 3500 };

const GUT = {
  energie: 8, konzentration: 8, saettigung: 5, ziele: ZIELE,
  bisherKcal: 1200, wasserMl: 1800, schlafQualitaet: 7,
};

test("gute Werte lösen keine Massnahme aus", () => {
  const b = mittagsBefund({ ...GUT, mahlzeit: { text: "Reis mit Hähnchen", kcal: 700, proteinG: 50, fatG: 15, carbsG: 85 } });
  assert.equal(b.auffaellig, false);
  assert.equal(b.aenderung, null);
});

test("schlechte Energie mit zu grosser Mahlzeit führt zum Teilen", () => {
  const b = mittagsBefund({
    ...GUT, energie: 3, konzentration: 4,
    mahlzeit: { text: "Pasta", kcal: 1400, proteinG: 40, fatG: 40, carbsG: 190 },
  });
  assert.equal(b.auffaellig, true);
  assert.ok(b.massnahmen.some((m) => m.includes("Teil diese Mahlzeit")));
  // 1400 kcal sind 47 Prozent von 3000. Der Vorschlag zielt auf 30 Prozent.
  assert.equal(b.aenderung!.kcal, 900 - 1400);
});

test("viel Kohlenhydrate bei wenig Protein bringt eine Aenderung in Gramm", () => {
  const b = mittagsBefund({
    ...GUT, energie: 3, konzentration: 3,
    mahlzeit: { text: "Nudeln mit Sauce", kcal: 800, proteinG: 20, fatG: 12, carbsG: 130 },
  });
  assert.ok(b.aenderung);
  assert.ok(b.aenderung!.proteinG > 0);
  assert.ok(b.aenderung!.carbsG < 0);
  assert.ok(b.massnahmen.some((m) => m.includes("g Protein mehr")));
});

test("eine zu kleine Mahlzeit bei Hunger führt zu mehr, nicht zu weniger", () => {
  const b = mittagsBefund({
    ...GUT, saettigung: 2,
    mahlzeit: { text: "Salat", kcal: 300, proteinG: 12, fatG: 8, carbsG: 30 },
  });
  assert.ok(b.aenderung!.kcal > 0);
  assert.ok(b.massnahmen.some((m) => m.includes("zu klein")));
});

test("bei schlechtem Schlaf wird das Essen nicht zur Ursache erklärt", () => {
  const b = mittagsBefund({
    ...GUT, energie: 2, konzentration: 3, schlafQualitaet: 3,
    mahlzeit: { text: "Reis mit Hähnchen", kcal: 700, proteinG: 50, fatG: 15, carbsG: 85 },
  });
  assert.ok(b.befund.some((z) => z.includes("eher der Schlaf als das Essen")));
  assert.ok(b.massnahmen.some((m) => m.includes("Ändere heute nichts an der Ernährung")));
});

test("ohne erfasste Mahlzeit wird das gesagt statt geraten", () => {
  const b = mittagsBefund({ ...GUT, energie: 3, konzentration: 3, mahlzeit: null });
  assert.ok(b.befund.some((z) => z.includes("keine Mahlzeit erfasst")));
  assert.equal(b.aenderung, null);
});

test("zu wenig getrunken wird mit Zahl benannt", () => {
  const b = mittagsBefund({ ...GUT, energie: 3, konzentration: 3, wasserMl: 400, mahlzeit: null });
  assert.ok(b.befund.some((z) => z.includes("400 ml")));
});

test("der Befund nennt immer die drei Werte", () => {
  const b = mittagsBefund({ ...GUT, mahlzeit: null });
  assert.ok(b.befund[0]!.includes("Energie 8 von 10"));
  assert.ok(b.befund[0]!.includes("Konzentration 8 von 10"));
  assert.ok(b.befund[0]!.includes("Sättigung 5 von 10"));
});

test("das Morgenbriefing nennt Kalender, Ziele und Aufgaben", () => {
  const text = morgenBriefing({
    datum: "Montag, 7. September 2026",
    tagesablauf: "Termine: 09:00 bis 12:00 Kunden",
    ziele: ZIELE,
    aufgaben: "Heute noch: Angebot schreiben",
    standards: ["Mindestens 150 g Protein"],
  });
  assert.ok(text.includes("09:00 bis 12:00 Kunden"));
  assert.ok(text.includes("3000 kcal"));
  assert.ok(text.includes("Angebot schreiben"));
  assert.ok(text.includes("Mindestens 150 g Protein"));
});

test("ohne Kalender sagt das Briefing das offen", () => {
  const text = morgenBriefing({ datum: "Montag", tagesablauf: "", ziele: ZIELE, aufgaben: "", standards: [] });
  assert.ok(text.includes("Kein Kalender verbunden"));
});

test("der Abschluss macht aus Offenem keine Schuld", () => {
  const text = abendAbschluss({
    datum: "Montag", stand: "2400 von 3000 kcal", offen: ["Angebot"], erledigt: ["Training"],
    standards: [], morgen: "3 Termine",
  });
  assert.ok(text.includes("nicht als Schuld"));
  assert.ok(text.includes("grösste Herausforderung"));
});
