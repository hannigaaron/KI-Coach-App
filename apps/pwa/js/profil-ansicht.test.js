import { test } from "node:test";
import assert from "node:assert/strict";
import { PROFIL_TEILE, profilUnter, profilZeilen, teilFuer, uebersichtHtml } from "./profil-ansicht.js";
import { SYMBOLNAMEN } from "./symbole.js";

test("Jeder Abschnitt hat ein Zeichen, das es gibt, und einen eigenen Schlüssel", () => {
  for (const t of PROFIL_TEILE) assert.ok(SYMBOLNAMEN.includes(t.sym), t.sym);
  assert.equal(new Set(PROFIL_TEILE.map((t) => t.schluessel)).size, PROFIL_TEILE.length);
  assert.equal(teilFuer("Unbekannt", 4).schluessel, "teil4");
});

test("Zweite Zeile aus dem Profil, Trainingstage nach Uhrzeit zusammen", () => {
  const u = profilUnter({ weightKg: 83.4, goal: "fat_loss", dailySteps: 7500, wakeTime: "06:30", sleepTime: "22:45", essenszeiten: { mittag: "12:30", abend: "19:00" },
    sessions: [{ weekday: 6, startsAt: "18:00" }, { weekday: 1, startsAt: "18:00" }, { weekday: 3, startsAt: "18:00" }] });
  assert.equal(u.koerper, "83,4 kg · Fett verlieren · 7.500 Schritte");
  assert.equal(u.tagesablauf, "06:30 bis 22:45 · Essen 12:30 und 19:00");
  assert.equal(u.training, "Mo, Mi, Sa 18:00");
  assert.equal(profilUnter({ sessions: [] }).training, "Noch keine festen Tage");
});

test("Übersicht in Gruppen, jede Zeile öffnet ihren Abschnitt", () => {
  const html = uebersichtHtml(profilZeilen([{ titel: "Körper und Ziel" }, { titel: "Stimme" }, { titel: "Sicherung" }], { stimme: "Anna" }));
  assert.match(html, /Du<\/h2>.*App<\/h2>.*Deine Daten<\/h2>/s);
  assert.match(html, /data-pf-oeffnen="stimme"/);
  assert.match(html, /<small>Anna<\/small>/);
  assert.doesNotMatch(html, /undefined/);
});
