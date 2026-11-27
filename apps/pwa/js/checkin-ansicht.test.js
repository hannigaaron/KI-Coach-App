import { test } from "node:test";
import assert from "node:assert/strict";
import { kachelStand, tagebuchHtml, tagMarken, tagSatz, wocheEnergie, wocheHtml } from "./checkin-ansicht.js";

const tage = {
  "2026-11-23": [{ kind: "morning", energy: 6 }],
  "2026-11-24": [{ kind: "morning", energy: 8 }, { kind: "midday", energy: 6 }],
  "2026-11-17": [{ kind: "morning", energy: 5 }],
};

test("Woche: Montag bis Sonntag, leere Tage zählen nicht, Vergleich zur Vorwoche", () => {
  const w = wocheEnergie("2026-11-26", (t) => tage[t] ?? []);
  assert.deepEqual(w.tage.map((t) => t.kurz), ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]);
  assert.equal(w.tage[0].wert, 6);
  assert.equal(w.tage[1].wert, 7);
  assert.equal(w.tage[2].wert, null);
  assert.equal(w.schnitt, 6.5);
  assert.equal(w.diff, 1.5);
  const html = wocheHtml(w);
  assert.match(html, /Energie im Schnitt 6,5/);
  assert.match(html, /↑ 1,5 zur Vorwoche/);
  assert.match(wocheHtml(wocheEnergie("2026-11-26", () => [])), /Noch kein Check-in/);
});

test("Tagebuch: eine Zeile je Tag mit Marken, Notiz vor Antwort", () => {
  const cs = [{ kind: "morning", morgen: {}, morgenWert: 78, energy: 8, sleepQuality: 7, note: "Gut geschlafen, Kopf klar." }, { kind: "midday", energy: 6 }];
  assert.deepEqual(tagMarken(cs).map((m) => m.text), ["Morgen 78", "8", "7", "Mittag 6"]);
  assert.equal(tagSatz(cs).art, "notiz");
  assert.equal(tagSatz([{ kind: "midday", energy: 5, antwort: "Weniger Kaffee nach 14 Uhr. Dann ..." }]).text, "Weniger Kaffee nach 14 Uhr.");
  const html = tagebuchHtml([{ tag: "2026-11-26", checkins: cs }, { tag: "2026-11-25", checkins: [] }]);
  assert.equal((html.match(/class="ci-tag"/g) ?? []).length, 1);
  assert.match(html, /<b>26<\/b>/);
  assert.match(html, /Gut geschlafen/);
  assert.doesNotMatch(html, /undefined|NaN/);
  assert.match(tagebuchHtml([]), /Noch kein Check-in/);
});

test("Kacheln: Morgen offen oder erledigt, Abend ab Uhrzeit", () => {
  assert.equal(kachelStand({ morgen: null, abendStart: "21:15", jetzt: "10:00" }).morgen, "offen");
  assert.equal(kachelStand({ morgen: { wert: 78 }, abendStart: "21:15", jetzt: "10:00" }).morgen, "erledigt, 78");
  assert.equal(kachelStand({ morgen: null, abendStart: "21:15", jetzt: "10:00" }).abend, "ab 21:15");
  assert.equal(kachelStand({ morgen: null, abendStart: "21:15", jetzt: "21:30" }).abendJetzt, true);
});
