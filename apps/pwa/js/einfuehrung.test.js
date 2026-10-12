import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EINFUEHRUNG_SCHRITTE } from "./einfuehrung.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("jedes Ziel der Einführung steht im HTML", () => {
  // Ein Schritt mit fehlendem Ziel fällt zur Laufzeit still weg. Ohne diesen
  // Test merkt niemand, wenn ein Umbau die halbe Einführung verschluckt.
  for (const s of EINFUEHRUNG_SCHRITTE) {
    assert.ok(html.includes(`id="${s.ziel}"`), `${s.ziel} fehlt im HTML`);
    assert.ok(html.includes(`data-view="${s.ansicht}"`), `Ansicht ${s.ansicht} fehlt`);
  }
});

test("jeder Satz ist kurz genug für einen Blick", () => {
  for (const s of EINFUEHRUNG_SCHRITTE) {
    assert.ok(s.text.length <= 120, `zu lang: ${s.text}`);
    assert.doesNotMatch(s.text, /[—–]/, `Gedankenstrich in: ${s.text}`);
  }
});

test("die Einführung endet dort, wo man anfängt: beim Assistenten", () => {
  assert.equal(EINFUEHRUNG_SCHRITTE.at(-1).ansicht, "assistant");
  assert.equal(EINFUEHRUNG_SCHRITTE[0].ansicht, "assistant");
});
