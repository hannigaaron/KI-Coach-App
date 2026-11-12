import { strict as assert } from "node:assert";
import { test } from "node:test";
import { GEZEICHNET, REGIONEN, muskelkarteSvg, partienListe, saetzeJePartie, staerke } from "./muskelkarte.js";
import { abschlussDaten, abschlussHtml } from "./abschluss.js";
import { UEBUNGEN } from "./uebungen-daten.js";
import { uebungenFiltern } from "./uebungen.js";

const satz = (kg, wdh) => ({ kg, wdh, rir: 1 });

test("Jede Partie der Liste ist auf der Karte gezeichnet", () => {
  for (const id of Object.keys(REGIONEN)) assert.ok(GEZEICHNET.has(id), `${id} fehlt in der Zeichnung`);
});

test("Jede Übung trifft mindestens eine Partie der Karte", () => {
  for (const u of UEBUNGEN) {
    if (u.primaryMuscles.includes("Ganzkörper")) continue;
    const s = saetzeJePartie([{ uebung: u.id, saetze: [satz(10, 10)] }]);
    assert.ok(Object.keys(s).length > 0, `${u.id} färbt nichts`);
  }
});

test("Hauptmuskel voll, Hilfsmuskel halb, dieselbe Partie nur einmal je Übung", () => {
  const s = saetzeJePartie([{ uebung: "schraegbankdruecken", saetze: [satz(60, 8), satz(60, 8)] }]);
  // Brust und obere Brust sind beide Brust: zwei Sätze, nicht vier.
  assert.equal(s.brust, 2);
  assert.equal(s.schulter_vorn, 1);
  assert.equal(s.trizeps, 1);
});

test("Ein Satz ist zart, acht Sätze sind voll, mehr bleibt voll", () => {
  assert.equal(staerke(0), 0);
  assert.ok(staerke(1) < 0.4);
  assert.ok(staerke(3) > staerke(1));
  assert.equal(staerke(8), 1);
  assert.equal(staerke(20), 1);
});

test("Die Karte färbt nur, was trainiert wurde", () => {
  const svg = muskelkarteSvg({ bizeps: 4 });
  assert.match(svg, /^<svg/);
  assert.equal((svg.match(/fill="#96d8f0"/g) ?? []).length, 2, "Bizeps links und rechts");
  assert.ok(!svg.includes("var(--"), "keine CSS Variablen, sonst bleibt das Bild zum Teilen leer");
});

test("Der Abschluss nennt Sätze, Volumen und die stärksten Partien", () => {
  const d = abschlussDaten([
    { datum: "2026-11-08", uebung: "klimmzug-breit", saetze: [satz(20, 6), satz(10, 8)] },
    { datum: "2026-11-08", uebung: "klimmzug-eng", saetze: [satz(0, 8)] },
  ], { titel: "Freies Training", minuten: 74 });
  assert.equal(d.saetze, 3);
  assert.equal(d.volumenKg, 200);
  assert.equal(d.partien[0].id, "lat");
  assert.equal(d.datum, "2026-11-08");
  const html = abschlussHtml(d);
  assert.match(html, /74/);
  assert.match(html, /Klimmzug breit/);
  assert.match(html, /bester 20 kg × 6/);
  assert.ok(!/[–—]/.test(html));
});

test("Ohne Dauer steht keine erfundene Minutenzahl", () => {
  const html = abschlussHtml(abschlussDaten([{ datum: "2026-11-08", uebung: "plank", saetze: [satz(0, 1)] }]));
  assert.ok(!html.includes("Minuten"));
});

test("Die Suche findet Geräte aus dem Studio", () => {
  const ids = (q) => uebungenFiltern({ text: q }).map((u) => u.id);
  assert.deepEqual(ids("high row"), ["high-row-maschine"]);
  assert.ok(ids("Isolation curl").includes("preacher-curl"));
  assert.ok(ids("reverse butterfly maschine").includes("reverse-butterfly-maschine"));
  assert.ok(ids("overhead extension").includes("trizeps-liegend-kurzhantel"));
  assert.ok(ids("rudermaschine eng").includes("rudern-maschine-eng"));
  assert.deepEqual(ids("xyz abc"), []);
});

test("Fast passend schlägt leer, ein kurzes Wort trägt die Liste nicht", () => {
  const treffer = uebungenFiltern({ text: "curl zzzz" });
  assert.ok(treffer.length > 3 && treffer.every((u) => /curl/i.test(`${u.name} ${u.nameEn}`)), treffer.map((u) => u.id).join(","));
  assert.deepEqual(uebungenFiltern({ text: "an zzzz" }), []);
});

test("Partien sind nach Sätzen sortiert", () => {
  const l = partienListe({ bizeps: 2, lat: 6, waden: 0 });
  assert.deepEqual(l.map((p) => p.id), ["lat", "bizeps"]);
});
