import test from "node:test";
import assert from "node:assert/strict";
import {
  anteilAmZiel,
  hauptMakro,
  rezeptGrenze,
  rezeptLoeschen,
  rezeptSpeichern,
  tabellenSuche,
  zuletztGegessen,
} from "./bibliothek.js";

const posten = (name, kcal = 100) => ({ name, quantity: "100 g", kcal, proteinG: 10, fatG: 2, carbsG: 5 });

test("zuletzt gegessen: jüngstes zuerst, jedes nur einmal, ohne Health", () => {
  const tage = [
    { date: "2026-10-24", meals: [{ at: "12:00", entries: [posten("Tofu"), posten("Paprika")] }] },
    { date: "2026-10-25", meals: [
      { at: "08:00", entries: [posten("Skyr")] },
      { at: "19:00", entries: [posten("Ketchup light"), posten("tofu", 150)] },
      { at: "20:00", source: "health", entries: [posten("Aus YAZIO")] },
    ] },
  ];
  const namen = zuletztGegessen(tage).map((e) => e.name);
  assert.deepEqual(namen, ["tofu", "Ketchup light", "Skyr", "Paprika"]);
  // Die zuletzt gegessene Menge kommt mit.
  assert.equal(zuletztGegessen(tage)[0].kcal, 150);
  assert.equal(zuletztGegessen(tage, { anzahl: 2 }).length, 2);
});

test("die Tabellensuche findet Wortanfänge vor Teilwörtern und rechnet die Portion", () => {
  const treffer = tabellenSuche("döner");
  assert.ok(treffer.length > 0);
  assert.match(treffer[0].name, /Döner/);
  assert.equal(treffer[0].quantity, "350 g");
  assert.deepEqual(tabellenSuche("d"), []);
  const banane = tabellenSuche("banane")[0];
  assert.ok(banane && banane.kcal > 0);
});

test("Rezepte: Plus fünf, Pro ohne Grenze, ohne Abo keines, ohne Server frei", () => {
  const server = { chatUrl: "https://w.dev" };
  assert.equal(rezeptGrenze({ kontoStufe: "plus" }, server), 5);
  assert.equal(rezeptGrenze({ kontoStufe: "test" }, server), 5);
  assert.equal(rezeptGrenze({ kontoStufe: "pro" }, server), Infinity);
  assert.equal(rezeptGrenze({ kontoStufe: "frei" }, server), 0);
  assert.equal(rezeptGrenze({}, {}), Infinity);
});

test("Rezept speichern, ersetzen, Grenze und löschen", () => {
  let n = 0;
  const id = () => `r${++n}`;
  let s = {};
  for (let i = 1; i <= 5; i++) {
    const r = rezeptSpeichern(s, `Rezept ${i}`, [posten("Hafer")], { grenze: 5, id });
    assert.ok(r.settings, r.fehler);
    s = r.settings;
  }
  assert.equal(rezeptSpeichern(s, "Rezept 6", [posten("Hafer")], { grenze: 5, id }).fehler, "grenze");
  // Gleicher Name ersetzt und zählt nicht gegen die Grenze.
  const ersetzt = rezeptSpeichern(s, "rezept 3", [posten("Quark", 200)], { grenze: 5, id });
  assert.equal(ersetzt.ersetzt, true);
  assert.equal(ersetzt.settings.eigeneRezepte.length, 5);
  assert.equal(ersetzt.settings.eigeneRezepte.find((r) => r.id === "r3").posten[0].kcal, 200);
  assert.equal(rezeptSpeichern(s, "  ", [posten("x")]).fehler, "Gib dem Rezept einen Namen.");
  assert.match(rezeptSpeichern(s, "Leer", []).fehler, /mindestens/);
  assert.equal(rezeptLoeschen(s, "r1").eigeneRezepte.length, 4);
});

test("Anteil am Ziel und Hauptmakro", () => {
  assert.equal(anteilAmZiel(300, 3000), 10);
  assert.equal(anteilAmZiel(300, 0), null);
  assert.equal(hauptMakro({ proteinG: 30, fatG: 2, carbsG: 3 }), "protein");
  assert.equal(hauptMakro({ proteinG: 1, fatG: 20, carbsG: 3 }), "fett");
  assert.equal(hauptMakro({ proteinG: 1, fatG: 1, carbsG: 30 }), "kohlenhydrate");
  assert.equal(hauptMakro({}), "keiner");
});

test("Lebensmittelfotos: jede Kennung hat Datei und Nachweis, Zuordnung nur bei genauem Namen", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const { LEBENSMITTEL_BILDER, tabellenBild } = await import("./bibliothek.js");
  const ordner = new URL("../img/lebensmittel/", import.meta.url);
  const nachweis = JSON.parse(readFileSync(new URL("NACHWEIS.json", ordner), "utf8"));
  for (const key of LEBENSMITTEL_BILDER) {
    assert.ok(existsSync(new URL(`${key}.jpg`, ordner)), key);
    const n = nachweis.find((x) => x.datei === `${key}.jpg`);
    assert.ok(n && /^(CC0|PDM)/.test(n.lizenz) && n.quelle.startsWith("https://"), key);
  }
  assert.equal(tabellenBild("Avocado"), "img/lebensmittel/avocado.jpg");
  assert.equal(tabellenBild("Avocado Toast mit Ei"), undefined);
  assert.equal(tabellenSuche("avocado")[0].bild, "img/lebensmittel/avocado.jpg");
});
