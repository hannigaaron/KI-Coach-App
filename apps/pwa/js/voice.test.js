import { test } from "node:test";
import assert from "node:assert/strict";
import { pauseFuer } from "./voice.js";

test("mitten in einer Aufzählung wartet die Erkennung länger", () => {
  assert.equal(pauseFuer("80 Gramm Milchreis und"), 8000);
  assert.equal(pauseFuer("einen Shake mit 600"), 8000);
  assert.equal(pauseFuer("1 gehäuften Teelöffel Erdnussbutter,"), 8000);
  assert.equal(pauseFuer("30 Gramm"), 8000);
});

test("ein fertiger Satz geht nach der normalen Pause raus", () => {
  assert.equal(pauseFuer("Wie viel Protein fehlt mir heute"), 5000);
  assert.equal(pauseFuer("Ich hatte einen guten Tag"), 5000);
  // Kopf leeren setzt eine eigene, längere Grundpause und behält sie.
  assert.equal(pauseFuer("fertig", 9000), 9000);
});

test("Stimmen aus der iPhone App tragen Qualität und Geschlecht selbst", async () => {
  const { stimmQualitaet, istMaennlich, stimmSchluessel } = await import("./voice.js");
  const markus = { name: "Markus", lang: "de-DE", voiceURI: "com.apple.voice.premium.de-DE.Markus", qualitaet: 3, geschlecht: "m" };
  const anna = { name: "Anna", lang: "de-DE", voiceURI: "com.apple.voice.compact.de-DE.Anna", qualitaet: 1, geschlecht: "w" };
  assert.equal(stimmQualitaet(markus), 3);
  assert.equal(stimmQualitaet(anna), 1);
  assert.equal(istMaennlich(markus), true);
  assert.equal(istMaennlich(anna), false);
  // Gespeichert wird die Kennung, denn Anna gibt es nativ in zwei Stufen unter demselben Namen.
  assert.equal(stimmSchluessel(markus), "com.apple.voice.premium.de-DE.Markus");
  // Browserstimmen ohne diese Felder gehen weiter über den Namen.
  assert.equal(stimmQualitaet({ name: "Yannick (Enhanced)" }), 2);
  assert.equal(istMaennlich({ name: "Yannick (Enhanced)" }), true);
});

test("eine Uhrzeit mit Uhr dahinter wird nicht doppelt gesprochen", async () => {
  const { stripForSpeech } = await import("./voice.js");
  assert.equal(stripForSpeech("um 14:30 Uhr"), "um 14 Uhr 30");
  assert.equal(stripForSpeech("um 18:00"), "um 18 Uhr");
});
