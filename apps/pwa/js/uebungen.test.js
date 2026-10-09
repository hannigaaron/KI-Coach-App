import test from "node:test";
import assert from "node:assert/strict";
import { UEBUNGEN } from "./uebungen-daten.js";
import { ANIMATIONEN, ANIM_SCHLUESSEL, bild, gelenke, verlauf } from "./uebungen-anim.js";
import {
  ARTEN, GERAETE, GRUPPEN, NIVEAUS, listeHtml, metaHtml, muskelnHtml, schritteHtml, uebungNach, uebungenFiltern, untertitel,
} from "./uebungen.js";

/**
 * Die Übungsdatenbank und ihre Ansicht.
 *
 * Geprüft wird, was die Detailseite voraussetzt: jede Übung hat Muskeln, drei
 * bis vier Schritte und eine Animation, die es gibt. Fehlt eines davon, bleibt
 * beim Antippen eine leere Seite stehen, und das sieht man erst im Browser.
 */

test("Jede Übung hat die Angaben, die die Detailseite zeigt", () => {
  assert.ok(UEBUNGEN.length >= 70);
  const ids = new Set();
  for (const u of UEBUNGEN) {
    assert.ok(!ids.has(u.id), `doppelte Kennung ${u.id}`);
    ids.add(u.id);
    assert.match(u.id, /^[a-z0-9-]+$/, `Kennung ${u.id} muss ASCII sein`);
    assert.ok(u.name && u.nameEn, u.id);
    assert.ok(u.primaryMuscles.length >= 1, `${u.id} ohne Hauptmuskel`);
    assert.ok(u.steps.length >= 3 && u.steps.length <= 4, `${u.id} hat ${u.steps.length} Schritte`);
    for (const schritt of u.steps) assert.ok(schritt.trim().length > 3, `${u.id}: leerer Schritt`);
    assert.ok(GRUPPEN.some((g) => g.id === u.gruppe), `${u.id}: Gruppe ${u.gruppe}`);
    assert.ok(u.equipment in GERAETE, `${u.id}: Gerät ${u.equipment}`);
    assert.ok(u.level in NIVEAUS, `${u.id}: Niveau ${u.level}`);
    assert.ok(u.mechanics in ARTEN, `${u.id}: Art ${u.mechanics}`);
    assert.ok(u.anim in ANIMATIONEN, `${u.id}: Animation ${u.anim} fehlt`);
    assert.ok(u.repRange, u.id);
  }
});

test("Jede gezeichnete Bewegung wird von mindestens einer Übung gebraucht", () => {
  const benutzt = new Set(UEBUNGEN.map((u) => u.anim));
  for (const schluessel of ANIM_SCHLUESSEL) assert.ok(benutzt.has(schluessel), `${schluessel} ist verwaist`);
});

test("Die Texte tragen echte Umlaute statt Umschreibungen", () => {
  for (const u of UEBUNGEN) {
    const text = [u.name, ...u.primaryMuscles, ...u.secondaryMuscles, ...u.steps].join(" ");
    assert.doesNotMatch(text, /\b\w*(Gesaess|Rueck|Schluessel|Koerper|fuer|ueber)\w*\b/i, `${u.id}: Umschreibung`);
    assert.doesNotMatch(text, /[–—]/, `${u.id}: Gedankenstrich`);
  }
});

test("Die Figur ist an jeder Stelle der Bewegung endlich und ohne Fehlwerte", () => {
  for (const schluessel of ANIM_SCHLUESSEL) {
    for (const k of [0, 0.25, 0.5, 0.75, 1]) {
      const svg = bild(schluessel, k);
      assert.ok(svg.length > 50, `${schluessel} bei ${k} leer`);
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${schluessel} bei ${k}`);
      const g = gelenke(schluessel, k);
      if (!g) continue;
      for (const [name, p] of Object.entries(g)) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${schluessel}.${name}`);
        // Alles muss im Bild bleiben, sonst ist ein Körperteil abgeschnitten.
        assert.ok(p.x > 12 && p.x < 228 && p.y > 10 && p.y < 188, `${schluessel}.${name} liegt außerhalb: ${p.x}, ${p.y}`);
      }
    }
  }
});

test("Das Ankergelenk bleibt in jedem Bild an seinem Platz", () => {
  for (const schluessel of ANIM_SCHLUESSEL) {
    const anim = ANIMATIONEN[schluessel];
    if (anim.ansicht === "front") continue;
    for (const k of [0, 0.5, 1]) {
      const g = gelenke(schluessel, k);
      const fest = g[anim.anker.gelenk];
      const dy = anim.B.dy ?? 0;
      assert.ok(Math.abs(fest.x - anim.anker.x) < 0.01, `${schluessel}: x`);
      // Nur der Sprung darf den Anker vom Boden lösen.
      if (!dy && !anim.A.dy) assert.ok(Math.abs(fest.y - anim.anker.y) < 0.01, `${schluessel}: y`);
    }
  }
});

test("Der Verlauf hält an beiden Enden und bleibt zwischen 0 und 1", () => {
  assert.equal(verlauf(0), 0);
  assert.ok(Math.abs(verlauf(0.5) - 1) < 1e-9);
  for (let t = 0; t <= 2; t += 0.01) {
    const k = verlauf(t);
    assert.ok(k >= 0 && k <= 1);
  }
  assert.ok(verlauf(0.05) < 0.05, "kurze Pause am Anfang");
});

test("Die Suche findet nach Name, Muskel und Gerät", () => {
  assert.ok(uebungenFiltern({ text: "kniebeuge" }).length >= 3);
  assert.ok(uebungenFiltern({ text: "quadrizeps" }).every((u) => u.primaryMuscles.concat(u.secondaryMuscles).includes("Quadrizeps")));
  assert.ok(uebungenFiltern({ text: "kurzhantel" }).length >= 5);
  assert.deepEqual(uebungenFiltern({ text: "gibtsnicht" }), []);
});

test("Die Suche ignoriert Umlaute und Reihenfolge", () => {
  const mit = uebungenFiltern({ text: "Gesäß" }).map((u) => u.id);
  const ohne = uebungenFiltern({ text: "gesaess" }).map((u) => u.id);
  assert.ok(mit.length > 0);
  assert.deepEqual(mit, ohne);
  assert.deepEqual(uebungenFiltern({ text: "langhantel kniebeuge" }).map((u) => u.id), uebungenFiltern({ text: "kniebeuge langhantel" }).map((u) => u.id));
});

test("Gruppe und Gerät schränken ein und lassen sich kombinieren", () => {
  const brust = uebungenFiltern({ gruppe: "brust" });
  assert.ok(brust.length >= 8 && brust.every((u) => u.gruppe === "brust"));
  const nurKabel = uebungenFiltern({ geraet: "cable" });
  assert.ok(nurKabel.every((u) => u.equipment === "cable"));
  const beides = uebungenFiltern({ gruppe: "ruecken", geraet: "cable" });
  assert.ok(beides.length >= 1 && beides.every((u) => u.gruppe === "ruecken" && u.equipment === "cable"));
  assert.equal(uebungenFiltern({}).length, UEBUNGEN.length);
});

test("Jede Gruppe ist mit Übungen belegt", () => {
  for (const g of GRUPPEN) {
    if (g.id === "alle") continue;
    assert.ok(uebungenFiltern({ gruppe: g.id }).length >= 3, g.id);
  }
});

test("Die Detailseite zeigt Muskeln, Schritte und Eckdaten", () => {
  const u = uebungNach("bankdruecken");
  assert.ok(u);
  assert.match(muskelnHtml(u), /ue-chip">Brust</);
  assert.match(muskelnHtml(u), /ue-chip zweit">Trizeps</);
  assert.equal((schritteHtml(u).match(/<li>/g) ?? []).length, u.steps.length);
  assert.match(metaHtml(u), /Langhantel/);
  assert.match(untertitel(u), /Brust · Langhantel/);
  assert.equal(uebungNach("gibtsnicht"), null);
});

test("Die Liste maskiert Zeichen und meldet einen leeren Treffer", () => {
  const html = listeHtml([{ id: 'x"y', name: "<b>A&B</b>", primaryMuscles: ["Brust"], secondaryMuscles: [], equipment: "cable" }]);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;A&amp;B/);
  assert.match(html, /data-uebung="x&quot;y"/);
  assert.match(listeHtml([]), /Keine Übung gefunden/);
});
