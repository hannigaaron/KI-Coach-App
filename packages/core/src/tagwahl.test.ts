import { test } from "node:test";
import assert from "node:assert/strict";
import { tagAufloesen, tagAusText, tagLang, tagWort } from "./tagwahl.js";
import { tagesfrageAus } from "./tagesfrage.js";

// Montag, 23. November 2026.
const HEUTE = "2026-11-23";

test("morgen, übermorgen, Wochentag und Datum werden zum richtigen Tag", () => {
  assert.equal(tagAusText("Briefing für morgen", HEUTE)?.tag, "2026-11-24");
  assert.equal(tagAusText("was ist übermorgen", HEUTE)?.tag, "2026-11-25");
  assert.equal(tagAusText("was ist uebermorgen", HEUTE)?.tag, "2026-11-25");
  assert.equal(tagAusText("am Freitag", HEUTE)?.tag, "2026-11-27");
  // Ein Wochentag, der heute ist, meint die nächste Woche, heute heisst heute.
  assert.equal(tagAusText("am Montag", HEUTE)?.tag, "2026-11-30");
  assert.equal(tagAusText("am 25.11.", HEUTE)?.tag, "2026-11-25");
  assert.equal(tagAusText("am 3.1.", HEUTE)?.tag, "2027-01-03");
  assert.equal(tagAusText("gestern", HEUTE)?.tag, "2026-11-22");
  assert.equal(tagAufloesen("2026-12-01", HEUTE), "2026-12-01");
  assert.equal(tagAufloesen("irgendwann", HEUTE), null);
});

test("Guten Morgen, Morgenbriefing und heute Morgen sind kein morgen", () => {
  assert.equal(tagAusText("Guten Morgen", HEUTE), null);
  assert.equal(tagAusText("Morgenbriefing", HEUTE), null);
  assert.equal(tagAusText("Morgenroutine", HEUTE), null);
  assert.equal(tagAusText("heute Morgen hatte ich Eier", HEUTE)?.tag, HEUTE);
});

test("tagWort und tagLang nennen Wochentag und Datum", () => {
  assert.equal(tagLang("2026-11-24"), "Dienstag, 24. November");
  assert.equal(tagWort("2026-11-24", HEUTE), "morgen");
  assert.equal(tagWort("2026-11-27", HEUTE), "Freitag, 27. November");
});

test("nur Fragen nach einem Tag werden erkannt, Befehle und Einträge nicht", () => {
  const f = (s: string) => tagesfrageAus(s, HEUTE);
  assert.deepEqual([f("Kurzes Briefing für morgen, bitte.")?.art, f("Kurzes Briefing für morgen, bitte.")?.tag], ["tag", "2026-11-24"]);
  assert.equal(f("Was steht morgen an?")?.art, "tag");
  assert.equal(f("Wann muss ich morgen aufstehen?")?.art, "tag");
  assert.equal(f("Was soll ich morgen essen?")?.art, "essen");
  assert.equal(f("Wann trainiere ich morgen?")?.art, "training");
  assert.equal(f("Wann soll ich heute trainieren?")?.art, "training");
  assert.equal(f("Was sind meine To-Dos für morgen?")?.art, "tag");
  assert.equal(f("Erinnere mich morgen um 9 an die Tablette"), null);
  assert.equal(f("Morgen um 5 aufstehen"), null);
  assert.equal(f("Ich muss morgen noch zum Amt"), null);
  assert.equal(f("Ich habe heute Morgen 3 Eier gegessen"), null);
  assert.equal(f("Guten Morgen"), null);
  assert.equal(f("Wie wird das Wetter morgen?"), null);
});
