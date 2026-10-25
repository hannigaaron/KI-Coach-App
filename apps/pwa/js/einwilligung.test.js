import test from "node:test";
import assert from "node:assert/strict";
import {
  EINWILLIGUNG_FASSUNG,
  einwilligungOffen,
  einwilligungSetzen,
  einwilligungText,
  kiErlaubt,
} from "./einwilligung.js";

const SERVER = { chatUrl: "https://w.example" };

test("ohne Server fragt die App nicht und die KI ist erlaubt", () => {
  assert.equal(kiErlaubt({}, {}), true);
  assert.equal(einwilligungOffen({}, {}), false);
});

test("über den Server geht ohne Zustimmung nichts an die KI", () => {
  assert.equal(kiErlaubt({}, SERVER), false);
  assert.equal(einwilligungOffen({}, SERVER), true);
});

test("nach Ja ist die KI erlaubt und die Frage zu", () => {
  const s = einwilligungSetzen({}, true, new Date("2026-10-25T10:00:00Z"));
  assert.equal(kiErlaubt(s, SERVER), true);
  assert.equal(einwilligungOffen(s, SERVER), false);
  assert.match(einwilligungText(s, SERVER), /Erteilt am 25\. Oktober 2026/);
});

test("nach Nein bleibt die KI aus und die App fragt nicht nach jeder Nachricht", () => {
  const s = einwilligungSetzen({}, false);
  assert.equal(kiErlaubt(s, SERVER), false);
  assert.equal(einwilligungOffen(s, SERVER), false);
});

test("eine Zustimmung zu einer älteren Fassung gilt nicht", () => {
  const s = { kiEinwilligung: { ja: true, fassung: EINWILLIGUNG_FASSUNG - 1, am: "2026-01-01T00:00:00Z" } };
  assert.equal(kiErlaubt(s, SERVER), false);
  assert.equal(einwilligungOffen(s, SERVER), true);
});
