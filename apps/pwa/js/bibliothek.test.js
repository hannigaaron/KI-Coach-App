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

test("ein kurzer Begriff trifft nicht mitten im Wort", () => {
  // Im Betrieb: wer Ei suchte, bekam Reis und Leberkäse.
  const ei = tabellenSuche("ei").map((p) => p.name);
  assert.equal(ei[0], "Ei");
  assert.ok(!ei.includes("Reis"), ei.join(", "));
  assert.ok(!ei.includes("Leberkäse"), ei.join(", "));
  // Am Wortende zählt auch ein kurzer Begriff: Olivenöl ist ein Öl.
  assert.ok(tabellenSuche("öl").some((p) => p.name === "Olivenöl"));
  // Ab vier Zeichen zählt auch die Mitte.
  assert.ok(tabellenSuche("milch").some((p) => p.name === "Hafermilch"));
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

test("Lebensmittelfotos: jede Kennung hat Datei und Nachweis, Zuordnung auf ganzen Wörtern am Anfang", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const { LEBENSMITTEL_BILDER, tabellenBild } = await import("./bibliothek.js");
  const ordner = new URL("../img/lebensmittel/", import.meta.url);
  const nachweis = JSON.parse(readFileSync(new URL("NACHWEIS.json", ordner), "utf8"));
  for (const key of LEBENSMITTEL_BILDER) {
    assert.ok(existsSync(new URL(`${key}.jpg`, ordner)), key);
    const n = nachweis.find((x) => x.datei === `${key}.jpg`);
    assert.ok(n && /^(CC0|PDM|BY)/.test(n.lizenz) && n.quelle.startsWith("https://"), key);
  }
  assert.equal(tabellenBild("Avocado"), "img/lebensmittel/avocado.jpg");
  assert.equal(tabellenBild("Avocado, halbe"), "img/lebensmittel/avocado.jpg");
  assert.equal(tabellenBild("Apfel 150 g"), "img/lebensmittel/apfel.jpg");
  // Ein Wortanfang ist kein Wort: Apfelmus ist kein Apfel.
  assert.notEqual(tabellenBild("Apfelmusschale"), "img/lebensmittel/apfel.jpg");
  assert.equal(tabellenBild("Ein Teller mit Avocado"), undefined);
  assert.equal(tabellenSuche("avocado")[0].bild, "img/lebensmittel/avocado.jpg");
});

test("eigene Lebensmittel: speichern, ersetzen, prüfen und finden", async () => {
  const { lebensmittelSpeichern, lebensmittelLoeschen, eigeneSuche, eigenesIn, eigenerPosten } = await import("./bibliothek.js");
  let n = 0;
  const id = () => `l${++n}`;
  let r = lebensmittelSpeichern({}, { name: "Omas Kuchen", kcal: "350", proteinG: "5", fatG: "18", carbsG: "40,5", portionG: 120 }, { id });
  assert.equal(r.fehler, undefined);
  assert.deepEqual(r.lebensmittel.per100, { kcal: 350, proteinG: 5, fatG: 18, carbsG: 40.5 });
  assert.equal(r.hinweis, "");
  let s = r.settings;
  r = lebensmittelSpeichern(s, { name: "omas kuchen", kcal: 360, proteinG: 5, fatG: 19, carbsG: 40 }, { id });
  assert.equal(r.ersetzt, true);
  s = r.settings;
  assert.equal(s.eigeneLebensmittel.length, 1);
  assert.match(lebensmittelSpeichern(s, { name: "Kaputt", kcal: 300, proteinG: 80, fatG: 20, carbsG: 30 }).fehler, /mehr als 100 g/);
  assert.match(lebensmittelSpeichern(s, { name: "Riegel", kcal: 500, proteinG: 30, fatG: 5, carbsG: 30 }).hinweis, /Aus den Makros ergeben sich etwa 285 kcal/);
  assert.match(lebensmittelSpeichern(s, { name: "Ohne", kcal: "" }).fehler, /Kalorien/);
  assert.equal(eigeneSuche("kuchen", s)[0].name, "omas kuchen");
  assert.equal(eigenesIn("200 g Omas Kuchen mit Sahne", s)?.name, "omas kuchen");
  assert.equal(eigenesIn("Kuchenteig", s), null);
  assert.deepEqual(eigenerPosten(s.eigeneLebensmittel[0], 200), { name: "omas kuchen", quantity: "200 g", kcal: 720, proteinG: 10, fatG: 38, carbsG: 80, eigen: true });
  assert.equal(lebensmittelLoeschen(s, s.eigeneLebensmittel[0].id).eigeneLebensmittel.length, 0);
});

test("Sofortsuche: ab dem ersten Buchstaben, Gegessenes vor der Tabelle", async () => {
  const { vorschlaege, passung, produktGemerkt } = await import("./bibliothek.js");
  const tage = [
    { date: "2026-11-08", meals: [{ entries: [{ name: "ESN Rice Pudding", quantity: "60 g", kcal: 230, proteinG: 20, fatG: 3, carbsG: 30 }] }] },
    { date: "2026-11-05", meals: [{ entries: [{ name: "ESN Rice Pudding", quantity: "60 g", kcal: 230, proteinG: 20, fatG: 3, carbsG: 30 }] }] },
    { date: "2026-11-04", meals: [{ source: "health", entries: [{ name: "Riegel aus YAZIO", quantity: "1", kcal: 200, proteinG: 1, fatG: 1, carbsG: 40 }] }] },
  ];
  const namen = (q, o = {}) => vorschlaege(q, { tage, heute: "2026-11-09", ...o }).map((v) => v.e?.name ?? v.r?.name);
  assert.equal(namen("r")[0], "ESN Rice Pudding");
  assert.equal(namen("ri")[0], "ESN Rice Pudding");
  assert.equal(namen("ri pu")[0], "ESN Rice Pudding");
  assert.ok(!namen("ri").includes("Riegel aus YAZIO"), "Health zählt nicht");
  assert.equal(vorschlaege("ri", { tage, heute: "2026-11-09" })[0].anzahl, 2);
  // Die Tabelle erst ab zwei Buchstaben, mitten im Wort erst ab drei.
  assert.ok(namen("haf").some((n) => /Hafer/.test(n)));
  assert.equal(passung("Reis", "ei"), 0);
  // Ein gemerktes Produkt steht danach ohne Netz zur Wahl.
  const settings = produktGemerkt({}, { barcode: "4260107220015", name: "Protein Pudding", marke: "More", menge: "200 g", per100: { kcal: 80, proteinG: 10, fatG: 1, carbsG: 7 }, quelle: "openfoodfacts" }, "more pud");
  const v = vorschlaege("mo pu", { settings });
  assert.equal(v[0].e.name, "More Protein Pudding");
  assert.equal(v[0].e.kcal, 160, "die ganze Packung als Portion");
  assert.equal(vorschlaege("", { tage }).length, 0);
});
