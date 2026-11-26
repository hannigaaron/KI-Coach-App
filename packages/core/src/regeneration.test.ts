import { test } from "node:test";
import assert from "node:assert/strict";
import { regeneration, regenFarbton, regenSatz, FAELLIG_AB_STUNDEN } from "./regeneration.js";

const H = 3600000;
const JETZT = Date.parse("2026-11-24T18:00:00Z");
const partie = (l: ReturnType<typeof regeneration>, id: string) => l.find((p) => p.id === id)!;

test("direkt nach dem Training müde, nach der Erholungszeit erholt", () => {
  const t = [{ zeit: JETZT - 12 * H, saetze: { quadrizeps: 6 } }];
  const frisch = partie(regeneration(t, JETZT), "quadrizeps");
  assert.equal(frisch.stand, "muede");
  assert.ok(frisch.prozent! < 60);
  const spaeter = partie(regeneration(t, JETZT + 70 * H), "quadrizeps");
  assert.equal(spaeter.prozent, 100);
  assert.equal(spaeter.stand, "erholt");
});

test("kleine Muskeln erholen sich schneller als grosse", () => {
  const t = [{ zeit: JETZT - 40 * H, saetze: { quadrizeps: 6, bizeps: 6 } }];
  const l = regeneration(t, JETZT);
  assert.ok(partie(l, "bizeps").prozent! > partie(l, "quadrizeps").prozent!);
});

test("zwei Sätze belasten weniger als zehn", () => {
  const wenig = partie(regeneration([{ zeit: JETZT - 6 * H, saetze: { brust: 2 } }], JETZT), "brust");
  const viel = partie(regeneration([{ zeit: JETZT - 6 * H, saetze: { brust: 10 } }], JETZT), "brust");
  assert.ok(wenig.prozent! > viel.prozent!);
  assert.ok(viel.bisStunden > wenig.bisStunden);
});

test("länger als fünf Tage ohne Reiz ist fällig, nie trainiert ist keine Angabe", () => {
  const l = regeneration([{ zeit: JETZT - FAELLIG_AB_STUNDEN * H - H, saetze: { lat: 6 } }], JETZT);
  assert.equal(partie(l, "lat").stand, "faellig");
  assert.equal(partie(l, "waden").stand, "keine");
  assert.equal(partie(l, "waden").prozent, null);
});

test("das Gefühl des Nutzers überstimmt die Rechnung", () => {
  const t = [{ zeit: JETZT - 10 * H, saetze: { brust: 8 } }];
  assert.equal(partie(regeneration(t, JETZT, { gefuehl: { brust: "frisch" } }), "brust").prozent, 100);
  const kater = partie(regeneration([], JETZT, { gefuehl: { bizeps: "kater" } }), "bizeps");
  assert.equal(kater.stand, "muede");
  assert.match(regenSatz(kater), /Muskelkater/);
});

test("langsames Tempo verlängert die Erholung", () => {
  const t = [{ zeit: JETZT - 30 * H, saetze: { brust: 6 } }];
  assert.ok(partie(regeneration(t, JETZT, { tempo: "langsam" }), "brust").prozent! < partie(regeneration(t, JETZT), "brust").prozent!);
});

test("Farbe läuft von Rot über Gelb nach Grün", () => {
  assert.equal(regenFarbton(0), 0);
  assert.equal(regenFarbton(60), 45);
  assert.equal(regenFarbton(100), 140);
});
