import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKIN_MITTE, CHECKIN_WOCHE, bogenAmTag, bogenFuer, checkinText, checkinVergleich } from "./checkin.js";

test("die Boegen liegen auf Mittwoch und Sonntag", () => {
  assert.equal(CHECKIN_MITTE.wochentag, 3);
  assert.equal(CHECKIN_WOCHE.wochentag, 0);
  assert.equal(bogenAmTag(3)?.id, "mitte");
  assert.equal(bogenAmTag(0)?.id, "woche");
  assert.equal(bogenAmTag(1), null);
});

test("jede Frage hat eine eigene Kennung", () => {
  for (const bogen of [CHECKIN_MITTE, CHECKIN_WOCHE]) {
    const ids = bogen.fragen.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length, `doppelte Kennung in ${bogen.id}`);
  }
});

test("Skalenfragen haben Grenzen, Auswahlfragen Optionen", () => {
  for (const bogen of [CHECKIN_MITTE, CHECKIN_WOCHE]) {
    for (const f of bogen.fragen) {
      if (f.typ === "zahl") {
        assert.ok(Number.isFinite(f.min) && Number.isFinite(f.max), `${f.id} ohne Grenzen`);
        assert.ok((f.max ?? 0) > (f.min ?? 0), `${f.id} mit falschen Grenzen`);
      }
      if (f.typ === "auswahl" || f.typ === "mehrfach") {
        assert.ok((f.optionen?.length ?? 0) >= 2, `${f.id} ohne Optionen`);
      }
    }
  }
});

test("der Rueckblick zwingt zu nichts", () => {
  assert.equal(CHECKIN_WOCHE.fragen.every((f) => !f.pflicht), true);
});

test("der Text nennt nur beantwortete Fragen", () => {
  const text = checkinText({
    bogen: "mitte",
    tag: "2026-09-09",
    werte: { energie: 4, laune: "Gut", schmerzen: "", stress: 70 },
  });
  assert.match(text, /Energielevel 4 von 5/);
  assert.match(text, /Laune Gut/);
  assert.match(text, /Stresslevel 70 von 100/);
  assert.ok(!text.includes("Schmerzen"), "leere Antworten stehen nicht drin");
});

test("Ja und Nein werden als Wort ausgegeben", () => {
  const text = checkinText({ bogen: "mitte", tag: "2026-09-09", werte: { zielKurs: false } });
  assert.match(text, /Nein/);
});

test("die Schlafdauer wird in Stunden und Minuten geschrieben", () => {
  assert.match(checkinText({ bogen: "mitte", tag: "2026-09-09", werte: { schlafdauer: 450 } }), /7 Stunden 30 Minuten/);
  assert.match(checkinText({ bogen: "mitte", tag: "2026-09-09", werte: { schlafdauer: 480 } }), /8 Stunden/);
});

test("ein leerer Bogen sagt das auch", () => {
  assert.match(checkinText({ bogen: "woche", tag: "2026-09-13", werte: {} }), /nichts ausgefüllt/);
});

test("der Vergleich meldet echte Aenderungen", () => {
  const diff = checkinVergleich(
    { bogen: "mitte", tag: "2026-09-16", werte: { energie: 4, stress: 40 } },
    { bogen: "mitte", tag: "2026-09-09", werte: { energie: 2, stress: 75 } },
  );
  assert.ok(diff.some((d) => d.includes("Energielevel") && d.includes("hoch")));
  assert.ok(diff.some((d) => d.includes("Stresslevel") && d.includes("runter")));
});

test("kleine Schwankungen sind kein Befund", () => {
  // Ein Punkt auf einer Skala bis 5 ist Rauschen, zehn Prozentpunkte auch.
  const diff = checkinVergleich(
    { bogen: "mitte", tag: "2026-09-16", werte: { stress: 45 } },
    { bogen: "mitte", tag: "2026-09-09", werte: { stress: 40 } },
  );
  assert.deepEqual(diff, []);
});

test("ohne Vorwoche gibt es keinen Vergleich", () => {
  assert.deepEqual(checkinVergleich({ bogen: "mitte", tag: "2026-09-16", werte: { energie: 4 } }), []);
});

test("verschiedene Boegen werden nicht verglichen", () => {
  const diff = checkinVergleich(
    { bogen: "mitte", tag: "2026-09-16", werte: { ernaehrung: 8 } },
    { bogen: "woche", tag: "2026-09-13", werte: { ernaehrung: 3 } },
  );
  assert.deepEqual(diff, []);
});

test("bogenFuer findet beide und sonst nichts", () => {
  assert.equal(bogenFuer("mitte")?.id, "mitte");
  assert.equal(bogenFuer("woche")?.id, "woche");
  assert.equal(bogenFuer("quatsch"), null);
});

test("die genannte Fragenzahl stimmt mit der Liste ueberein", () => {
  // Eine Einleitung, die eine Zahl nennt, wird beim Ergaenzen einer Frage
  // stillschweigend falsch. Dieser Test faellt dann auf.
  const WORT: Record<string, number> = {
    Acht: 8, Neun: 9, Zehn: 10, Elf: 11, Zwoelf: 12, Zwölf: 12,
    Dreizehn: 13, Vierzehn: 14, Fuenfzehn: 15, Fünfzehn: 15,
    Sechzehn: 16, Siebzehn: 17, Achtzehn: 18, Neunzehn: 19, Zwanzig: 20,
  };
  for (const bogen of [CHECKIN_MITTE, CHECKIN_WOCHE]) {
    const treffer = /^(\w+) Fragen/.exec(bogen.einleitung);
    if (!treffer) continue;
    const genannt = WORT[treffer[1]!];
    assert.equal(genannt, bogen.fragen.length, `${bogen.id} nennt ${treffer[1]}, hat aber ${bogen.fragen.length}`);
  }
});
