import { test } from "node:test";
import assert from "node:assert/strict";
import { wahlHtml, wahlListeHtml } from "./uebung-wahl.js";
import { UEBUNGEN } from "./uebungen-daten.js";
import { uebungTauschen } from "./plaene.js";

test("Übung wählen: Suche und Filter nach Gruppe und Gerät statt einer Liste mit allem", () => {
  const html = wahlHtml({ titel: "Übung hinzufügen", liste: UEBUNGEN, gruppe: "arme", geraet: "cable" });
  assert.match(html, /data-uw-suche/);
  assert.match(html, /data-uw-gruppe="arme" aria-pressed="true"/);
  assert.match(html, /data-uw-geraet="cable" aria-pressed="true"/);
  const zeilen = [...html.matchAll(/data-uw="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(zeilen.length > 0);
  for (const id of zeilen) {
    const u = UEBUNGEN.find((x) => x.id === id);
    assert.equal(u.gruppe, "arme");
    assert.equal(u.equipment, "cable");
  }
  assert.match(wahlListeHtml([]), /Keine passende Übung/);
});

test("Tausch gegen eine andere Bewegung nimmt deren Dosis, die Sätze bleiben", () => {
  const knie = UEBUNGEN.find((u) => u.pattern === "squat" || u.pattern === "knee_dominant") ?? UEBUNGEN[0];
  const curl = UEBUNGEN.find((u) => u.pattern !== knie.pattern && u.mechanics === "isolation");
  const plan = { wunsch: {}, einheiten: [{ titel: "A", positionen: [{ id: knie.id, name: knie.name, saetze: 4, wdh: "5-8", reserve: 2, pauseSek: 180 }] }] };
  const neu = uebungTauschen(plan, 0, 0, curl.id);
  const p = neu.einheiten[0].positionen[0];
  assert.equal(p.id, curl.id);
  assert.equal(p.saetze, 4);
  assert.notEqual(p.pauseSek, 180);
});
