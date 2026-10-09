import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { UEBUNGEN } from "./uebungen-daten.js";
import {
  ARTEN, GERAETE, GRUPPEN, NIVEAUS, fotoPfad, gruppenName, hauptmuskelnText, listeHtml, metaHtml, nebenmuskelnText,
  schritteHtml, uebungNach, uebungenFiltern, videoHtml, videoLink, vorschauPfad,
} from "./uebungen.js";

/**
 * Die Übungsdatenbank und ihre Ansicht.
 *
 * Geprüft wird, was die Detailseite voraussetzt: jede Übung hat Muskeln, drei
 * bis vier Schritte, ein Foto und einen Videolink. Fehlt eines davon, bleibt
 * beim Antippen eine leere Stelle stehen, und das sieht man erst im Browser.
 */

const pwa = join(dirname(fileURLToPath(import.meta.url)), "..");
const imPfad = (relativ) => join(pwa, relativ.replace(/^\.\//, ""));

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
    assert.ok(u.repRange, u.id);
  }
});

test("Zu jeder Übung gibt es ein Foto und eine Vorschau, und beide sind klein genug", () => {
  for (const u of UEBUNGEN) {
    const gross = imPfad(fotoPfad(u));
    const klein = imPfad(vorschauPfad(u));
    assert.ok(existsSync(gross), `Foto fehlt: ${u.id}`);
    assert.ok(existsSync(klein), `Vorschau fehlt: ${u.id}`);
    assert.ok(statSync(gross).size > 20_000 && statSync(gross).size < 400_000, `${u.id}: Foto ${statSync(gross).size} Byte`);
    assert.ok(statSync(klein).size > 8_000 && statSync(klein).size < 60_000, `${u.id}: Kachel ${statSync(klein).size} Byte`);
  }
});

test("Jede Übung verweist auf ein Video mit gültiger Kennung", () => {
  for (const u of UEBUNGEN) {
    assert.match(u.video.id, /^[A-Za-z0-9_-]{11}$/, `${u.id}: Videokennung`);
    assert.ok(u.video.titel && u.video.kanal, `${u.id}: Titel oder Kanal fehlt`);
    assert.equal(videoLink(u), `https://www.youtube.com/watch?v=${u.video.id}`);
  }
});

test("Der Videoknopf öffnet YouTube in neuem Fenster und nennt Kanal und Dauer", () => {
  const u = uebungNach("kreuzheben");
  const html = videoHtml(u);
  assert.match(html, /href="https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.ok(html.includes(u.video.kanal));
  assert.match(html, /Min\./);
  // Ohne Dauer steht kein leeres Stück da.
  assert.doesNotMatch(videoHtml({ ...u, video: { ...u.video, dauer: "" } }), /Min\./);
});

test("Die Texte tragen echte Umlaute statt Umschreibungen und keine Gedankenstriche", () => {
  for (const u of UEBUNGEN) {
    const text = [u.name, ...u.primaryMuscles, ...u.secondaryMuscles, ...u.steps].join(" ");
    assert.doesNotMatch(text, /\b\w*(Gesaess|Rueck|Schluessel|Koerper|fuer|ueber)\w*\b/i, `${u.id}: Umschreibung`);
    assert.doesNotMatch(text, /[–—]/, `${u.id}: Gedankenstrich`);
  }
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

test("Die Detailseite zeigt Gruppe, Muskeln, Schritte und drei Kennzahlen", () => {
  const u = uebungNach("bankdruecken");
  assert.ok(u);
  assert.equal(gruppenName(u), "Brust");
  assert.equal(hauptmuskelnText(u), "Brust");
  assert.match(nebenmuskelnText(u), /Trizeps/);
  assert.equal((schritteHtml(u).match(/<li>/g) ?? []).length, u.steps.length);
  const meta = metaHtml(u);
  assert.equal((meta.match(/class="ue-stat"/g) ?? []).length, 3);
  assert.match(meta, /Langhantel/);
  assert.match(meta, /5-10/);
  assert.equal(uebungNach("gibtsnicht"), null);
});

test("Eine Übung ohne unterstützende Muskeln liefert einen leeren Text, damit die Zeile entfällt", () => {
  assert.equal(nebenmuskelnText({ secondaryMuscles: [] }), "");
});

test("Die Kacheln zeigen Foto, Namen und Hauptmuskel, maskieren Zeichen und melden einen leeren Treffer", () => {
  const html = listeHtml([{ id: 'x"y', name: "<b>A&B</b>", primaryMuscles: ["Brust"], secondaryMuscles: [], equipment: "cable" }]);
  assert.doesNotMatch(html, /<b>A/);
  assert.match(html, /&lt;b&gt;A&amp;B/);
  assert.match(html, /data-uebung="x&quot;y"/);
  assert.match(html, /class="ue-karte-bild"/);
  assert.match(html, /<span>Brust<\/span>/);
  assert.match(listeHtml([]), /Keine Übung gefunden/);
});
