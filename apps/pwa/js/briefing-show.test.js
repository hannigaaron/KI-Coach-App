import { test } from "node:test";
import assert from "node:assert/strict";
import { folieDauer, folieHtml } from "./briefing-show.js";

test("jede Art von Karte zeichnet sich, Text wird maskiert", () => {
  const folien = [
    { art: "start", morgens: true, gruss: "Guten Morgen", datum: "Mittwoch, 25. November", zeile: "3 Termine" },
    { art: "rueckblick", kcal: 2000, zielKcal: 2500, proteinG: 150, zielProteinG: 170, erledigt: 2, satz: "Gut" },
    { art: "fokus", haupt: "<b>Angebot</b>", um: "09:00", zusatz: "Das zuerst." },
    { art: "tag", titel: "Morgen", termine: [{ um: "07:00", bis: "08:00", titel: "Kunde" }], mehr: 0, frei: { von: "11:00", bis: "16:00", training: "14:00" }, belegt: "1 Stunde", ganztags: [] },
    { art: "tun", punkte: [{ art: "aufgabe", text: "Steuer", zuerst: true }], mehr: 0, feierabend: "20:00" },
    { art: "achtung", titel: "Darauf achten", punkte: [{ art: "frueh", kurz: "Start um 07:00", tun: "Frühstück bereitlegen" }] },
    { art: "essen", zielKcal: 2500, zielProteinG: 170, mahlzeiten: [{ um: "08:00", name: "Frühstück", gericht: "Skyr", kcal: 400, proteinG: 30, rolle: "" }] },
    { art: "untergrenze", punkte: [{ titel: "Vor 23 Uhr im Bett", stand: "2 von 5" }], geburtstage: ["Zoe"] },
    { art: "ende", morgens: false, satz: "Schlaf gut." },
  ];
  for (const f of folien) {
    const html = folieHtml(f);
    assert.match(html, new RegExp(`bs-f-${f.art}`));
    assert.ok(Number.isFinite(folieDauer(f)) || f.art === "ende");
  }
  assert.doesNotMatch(folieHtml(folien[2]), /<b>Angebot/);
  assert.match(folieHtml(folien[3]), /Darin dein Training um 14:00/);
  assert.match(folieHtml(folien[8]), /data-bs="fertig"/);
  // Die letzte Karte bleibt stehen, bis jemand tippt.
  assert.equal(folieDauer(folien[8]), Infinity);
  // Mehr Zeilen, mehr Zeit.
  assert.ok(folieDauer({ art: "tun", punkte: [1, 2, 3, 4] }) > folieDauer({ art: "tun", punkte: [1] }));
});

test("jede Karte mit Inhalt lässt sich anpassen, jede Mahlzeit ändern", () => {
  assert.match(folieHtml({ art: "fokus", haupt: "X", zusatz: "Y" }), /data-bs-anpassen="fokus"/);
  assert.doesNotMatch(folieHtml({ art: "start", morgens: true, gruss: "G", datum: "D", zeile: "Z" }), /data-bs-anpassen/);
  const essen = folieHtml({ art: "essen", zielKcal: 2000, zielProteinG: 150, mahlzeiten: [
    { art: "fruehstueck", um: "08:00", name: "Frühstück", gericht: "Skyr", kcal: 400, proteinG: 30, rolle: "" },
    { art: "abendessen", um: "19:00", name: "Abendessen", gericht: "Brot", kcal: 300, proteinG: 25, rolle: "deine Wahl", gewaehlt: true },
  ] });
  assert.equal((essen.match(/data-bs-essen=/g) || []).length, 2);
  assert.match(essen, /bs-mahlzeit gewaehlt/);
});
