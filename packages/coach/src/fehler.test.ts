import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fehlerErklaerung } from "./fehler.js";

test("Ein abgelehnter Schlüssel wird als solcher benannt", () => {
  const d = fehlerErklaerung(new Error('Anthropic API 401: {"error":{"message":"invalid x-api-key"}}'));
  assert.equal(d.art, "schluessel");
  assert.equal(d.nochmal, false, "ein falscher Schlüssel wird beim zweiten Versuch nicht richtig");
  assert.match(d.text, /Profil/);
});

test("Fehlendes Guthaben wird vom falschen Schlüssel unterschieden", () => {
  const d = fehlerErklaerung(
    new Error('Anthropic API 400: {"error":{"message":"Your credit balance is too low"}}'),
  );
  assert.equal(d.art, "guthaben");
  assert.equal(d.nochmal, false);
  assert.match(d.text, /Billing/);
});

test("Zu viele Anfragen und Überlastung laden zum erneuten Versuch ein", () => {
  assert.equal(fehlerErklaerung(new Error("Anthropic API 429: rate limit")).art, "limit");
  assert.equal(fehlerErklaerung(new Error("Anthropic API 429: rate limit")).nochmal, true);
  assert.equal(fehlerErklaerung(new Error("Anthropic API 529: overloaded")).art, "ueberlastet");
  assert.equal(fehlerErklaerung(new Error("Anthropic API 500: internal")).art, "ueberlastet");
});

test("Ein Netzfehler ohne Status wird erkannt", () => {
  // So meldet sich fetch im Browser, wenn nichts durchgeht.
  const d = fehlerErklaerung(new TypeError("Failed to fetch"));
  assert.equal(d.art, "netz");
  assert.equal(d.nochmal, true);
});

test("Eine zu lange Anfrage nennt den Ausweg", () => {
  const d = fehlerErklaerung(new Error("Anthropic API 400: prompt is too long: 250000 tokens"));
  assert.equal(d.art, "zu_gross");
  assert.match(d.text, /neues Gespräch/);
});

test("Ein unbekannter Fehler nennt die Meldung im Original, statt eine Ursache zu erfinden", () => {
  const d = fehlerErklaerung(new Error("Anthropic API 418: irgendwas ganz Neues"));
  assert.equal(d.art, "unbekannt");
  assert.match(d.text, /418/);
  assert.match(d.text, /irgendwas ganz Neues/);
});

test("Keine Deutung endet mit dem alten Satz ohne Ursache", () => {
  const faelle = [
    new Error("Anthropic API 401: x"),
    new Error("Anthropic API 429: x"),
    new TypeError("Failed to fetch"),
    new Error("irgendwas"),
  ];
  for (const f of faelle) {
    const d = fehlerErklaerung(f);
    assert.ok(!/nicht erreichbar/i.test(d.text), `${f.message} ergibt wieder eine Ausrede`);
    assert.ok(d.text.length > 30, `${f.message} ergibt einen zu knappen Satz`);
  }
});
