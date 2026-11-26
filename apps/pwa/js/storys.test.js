import { test } from "node:test";
import assert from "node:assert/strict";
import { folieDauer, folieHtml } from "./briefing-show.js";
import {
  auswertungFolien, blockDaten, blockFolien, epley, kopfFolien, monatsBildWerte, monatsFolien,
  morgenFolien, rekorde, rueckblickFolien, trainingFolien,
} from "./storys.js";

/** Jede Präsentation: zeichnet sich, endet auf einer Karte mit Knöpfen, keine leere Karte. */
function pruefen(folien) {
  assert.ok(folien.length >= 2, "mindestens Titel und Schluss");
  assert.equal(folien.at(-1).art, "schluss");
  assert.equal(folieDauer(folien.at(-1)), Infinity);
  for (const f of folien.slice(0, -1)) assert.ok(Number.isFinite(folieDauer(f)), `${f.art} läuft weiter`);
  for (const f of folien) {
    const html = folieHtml(f);
    assert.match(html, new RegExp(`bs-f-${f.art}`));
    assert.doesNotMatch(html, /undefined|NaN|null/, `${f.art}: ${html}`);
  }
  return folien.map((f) => f.art);
}

const RUECKBLICK = {
  art: "woche", titel: "Dein Wochenrückblick", kurz: "", bilanz: [],
  gut: ["Jeden Tag eingetragen."], besser: ["Protein fehlt an 3 von 7 Tagen."],
  tipps: ["Plan 40 g Protein in jede Mahlzeit ein. 250 g Magerquark bringen rund 30 g.", "Stell dir morgens eine Flasche hin."],
  fokus: "Plan 40 g Protein in jede Mahlzeit ein.", text: "",
  zahlen: { tage: 7, eingetragen: 7, gezaehlt: 6, proteinGedeckt: 4, proteinSchnitt: 150, proteinZiel: 170, kcalSchnitt: 2600, kcalZiel: 2800, kcalGetroffen: 5, wasserProzent: 85, trainiert: 4, geplant: 5, gewichtDiff: -0.4, schlafStunden: 7.2 },
};

test("Wochenrückblick: Zahlen als Karten, Fokus mit Anpassen, Werte aus `zahlen`", () => {
  const folien = rueckblickFolien(RUECKBLICK);
  const arten = pruefen(folien);
  assert.deepEqual(arten, ["titel", "zahl", "ringe", "zahl", "punkte", "punkte", "punkte", "frage", "schluss"]);
  assert.equal(folien[1].zahl, "7");
  assert.match(folien[1].satz, /1 Tag sieht unvollständig aus/);
  assert.match(folieHtml(folien[3]), /von 5 Einheiten/);
  assert.match(folieHtml(folien[3]), /-0,4 kg/);
  assert.equal(folien.at(-2).anpassen.id, "fokus-aufgabe");
  assert.match(folien.at(-2).satz, /Magerquark/);
});

test("Wochenrückblick ohne Ernährung: keine Ringe, kein Training ohne Plan", () => {
  const leer = { ...RUECKBLICK, gut: [], besser: [], tipps: ["Trag mehr ein."], fokus: "Trag mehr ein.",
    zahlen: { tage: 3, eingetragen: 0, gezaehlt: 0, proteinGedeckt: null, proteinSchnitt: null, proteinZiel: null, kcalSchnitt: null, kcalZiel: null, kcalGetroffen: null, wasserProzent: null, trainiert: 0, geplant: 0, gewichtDiff: null, schlafStunden: null } };
  assert.deepEqual(pruefen(rueckblickFolien(leer)), ["titel", "zahl", "frage", "schluss"]);
});

test("Morgen Check-in: Wert, Training, Tipps, am Ende das Briefing", () => {
  const r = { wert: 72, belastbarkeit: "normal", warum: "Du hast gut geschlafen.", training: ["Krafttraining um 17:00: wie geplant."], tipps: ["Tageslicht in der ersten Stunde."], nachfrage: false };
  const folien = morgenFolien(r, { datum: "Donnerstag, 26. November" });
  assert.deepEqual(pruefen(folien), ["titel", "zahl", "punkte", "punkte", "schluss"]);
  assert.equal(folien[1].zahl, "72");
  assert.ok(folien.at(-1).knoepfe.some((k) => k.id === "briefing"));
  const ruhe = morgenFolien({ ...r, gestrichen: true, training: [], tipps: [] });
  assert.equal(ruhe[1].zahl, "Ruhetag");
  assert.match(folieHtml(ruhe[1]), /bs-grosszahl lang/);
});

test("Auswertung: eine Karte je Befund mit Zahl und Frage", () => {
  const folien = auswertungFolien({
    tage: 28,
    widersprueche: [{ thema: "Protein", anspruch: "Ziel 170 g.", wirklichkeit: "Im Schnitt 140 g.", frage: "Ziel halten?", gewicht: 70, zahl: "-30", einheit: "g Protein am Tag" }],
    befunde: [{ treiber: "Schlaf", ziel: "Energie", r: 0.55, tage: 20, oben: 7.4, unten: 5.1, satz: "An guten Nächten mehr Energie." }],
  });
  assert.deepEqual(pruefen(folien), ["titel", "frage", "frage", "schluss"]);
  assert.match(folieHtml(folien[1]), /-30/);
  assert.match(folieHtml(folien[2]), /7,4 zu 5,1/);
  assert.match(folieHtml(folien[2]), /keine Ursache/);
  const leer = auswertungFolien({ tage: 4 });
  assert.match(leer[0].zeile, /zehn Tage/);
});

test("Monatsrückblick: Zahl je Wert mit Linie, Bild ohne Gewicht", () => {
  const b = {
    von: "2026-10-01", bis: "2026-10-31", tageMitDaten: 25, tageGesamt: 31, fazit: ["Protein im Schnitt 160 g."],
    werte: [
      { name: "Protein", schluessel: "protein", zahl: "160", einheit: "g", zusatz: "im Schnitt", wert: "", tage: 25, trend: "8 Prozent mehr als davor", verlauf: [150, null, 160, 170] },
      { name: "Gewicht", schluessel: "gewicht", zahl: "86,2", einheit: "kg", zusatz: "zuletzt", wert: "", tage: 8, trend: null, verlauf: [87, 86.2] },
    ],
  };
  const folien = monatsFolien(b, { name: "Oktober" });
  assert.deepEqual(pruefen(folien), ["titel", "zahl", "zahl", "punkte", "schluss"]);
  assert.match(folieHtml(folien[1]), /<polyline/);
  // Zwei Punkte sind keine Linie.
  assert.doesNotMatch(folieHtml(folien[2]), /bs-linie/);
  assert.deepEqual(monatsBildWerte(b).map((w) => w.name), ["Protein"]);
  assert.ok(folien.at(-1).knoepfe.some((k) => k.id === "teilen"));
});

test("Trainingsblock: Einheiten, Zuwachs und Ende nach zwölf Wochen", () => {
  const log = [
    { datum: "2026-09-01", uebung: "bank", einheit: "A", saetze: [{ kg: 80, wdh: 8 }, { kg: 80, wdh: 8 }] },
    { datum: "2026-09-01", uebung: "kniebeuge", einheit: "A", saetze: [{ kg: 100, wdh: 5 }] },
    { datum: "2026-11-20", uebung: "bank", einheit: "A", saetze: [{ kg: 90, wdh: 8 }] },
    { datum: "2026-08-01", uebung: "bank", einheit: "A", saetze: [{ kg: 70, wdh: 8 }] },
  ];
  const trend = (id) => (id === "bank" ? { art: "steigt", prozent: 12.5, einheiten: 2 } : { art: "haelt", prozent: 0.5, einheiten: 3 });
  const d = blockDaten({ log, beginn: "2026-09-01", heute: "2026-11-24", wochen: 12, trend, name: (id) => id.toUpperCase() });
  assert.equal(d.einheiten, 2);
  assert.equal(d.saetze, 4);
  assert.equal(d.volumenKg, 80 * 8 * 2 + 500 + 720);
  assert.equal(d.besser[0].name, "BANK");
  const folien = blockFolien(d, { titel: "Ganzkörper" });
  assert.deepEqual(pruefen(folien), ["titel", "zahl", "punkte", "punkte", "schluss"]);
  assert.ok(folien.at(-1).knoepfe.some((k) => k.id === "anpassen"));
  const acht = blockFolien({ ...d, wochen: 8 }, { getauscht: [{ alt: "Curl", neu: "Hammer Curl", prozent: 0.4 }] });
  assert.match(folieHtml(acht[3]), /Curl wird Hammer Curl/);
});

test("Rekorde: nur gegen frühere Einheiten, nach geschätzter Kraft", () => {
  const log = [{ datum: "2026-11-01", uebung: "bank", saetze: [{ kg: 80, wdh: 8 }] }];
  assert.ok(epley(80, 10) > epley(82.5, 5));
  const r = rekorde([{ uebung: "bank", saetze: [{ kg: 80, wdh: 10 }] }, { uebung: "neu", saetze: [{ kg: 50, wdh: 10 }] }], log, "2026-11-26");
  assert.equal(r.length, 1);
  assert.equal(r[0].uebung, "bank");
  assert.equal(rekorde([{ uebung: "bank", saetze: [{ kg: 80, wdh: 8 }] }], log, "2026-11-26").length, 0);
});

test("Trainingsabschluss: drei Karten und Schluss", () => {
  const d = { titel: "Pull", datum: "2026-11-26", minuten: 52, uebungen: [{ id: "a" }, { id: "b" }], saetze: 12, volumenKg: 4200, wdh: 100, partien: [{ name: "Rücken", saetze: 8 }] };
  const folien = trainingFolien(d, { rekordListe: [{ uebung: "a", kg: 80, wdh: 8, prozent: 3.2 }], karte: "<svg></svg>", name: () => "Rudern" });
  assert.deepEqual(pruefen(folien), ["zahl", "punkte", "bild", "schluss"]);
  assert.match(folieHtml(folien[1]), /Rudern/);
  const ohne = trainingFolien({ ...d, minuten: null }, {});
  assert.deepEqual(ohne.map((f) => f.art), ["zahl", "zahl", "schluss"]);
  assert.match(ohne[1].unter, /kein neuer Rekord/);
});

test("Kopf leeren: eine Karte je Schublade, dann genau ein erster Schritt", () => {
  const e = { kern: "Zu viel auf einmal.", aufgaben: [{ text: "Angebot schreiben", minuten: 45, wichtigkeit: 3, warum: "" }], entscheidungen: ["Bali oder nicht"], sorgen: ["Schwester"], nichtBeeinflussbar: ["Wetter"], ersterSchritt: "Angebot öffnen.", rueckfrage: "" };
  const folien = kopfFolien(e);
  assert.deepEqual(pruefen(folien), ["titel", "punkte", "punkte", "punkte", "punkte", "frage", "schluss"]);
  assert.equal(folien.filter((f) => f.etikett === "Dein erster Schritt").length, 1);
  assert.deepEqual(pruefen(kopfFolien({ ...e, entscheidungen: [], sorgen: [], nichtBeeinflussbar: [] })), ["titel", "punkte", "frage", "schluss"]);
});

test("Allgemeine Karten maskieren Text und tragen ihr eigenes Anpassen", () => {
  const html = folieHtml({ art: "punkte", etikett: "<i>", punkte: [{ titel: "<script>" }], anpassen: { id: "x", text: "Ändern" } });
  assert.doesNotMatch(html, /<script>|<i>/);
  assert.match(html, /data-bs-anpassen="x"/);
});
