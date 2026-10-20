import { test } from "node:test";
import assert from "node:assert/strict";
import { pauseFuer } from "./voice.js";

test("mitten in einer Aufzählung wartet die Erkennung länger", () => {
  assert.equal(pauseFuer("80 Gramm Milchreis und"), 6000);
  assert.equal(pauseFuer("einen Shake mit 600"), 6000);
  assert.equal(pauseFuer("1 gehäuften Teelöffel Erdnussbutter,"), 6000);
  assert.equal(pauseFuer("30 Gramm"), 6000);
});

test("ein fertiger Satz geht nach der normalen Pause raus", () => {
  assert.equal(pauseFuer("Wie viel Protein fehlt mir heute"), 3200);
  assert.equal(pauseFuer("Ich hatte einen guten Tag"), 3200);
  // Kopf leeren setzt eine eigene, längere Grundpause und behält sie.
  assert.equal(pauseFuer("fertig", 6000), 6000);
});
