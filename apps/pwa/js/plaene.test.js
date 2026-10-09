import test from "node:test";
import assert from "node:assert/strict";
import { UEBUNGEN } from "./uebungen-daten.js";
import { FELDER, STANDARD_WUNSCH, einheitHtml, gespeicherterPlan, planFuer, planText, saetzeHtml, steuerHtml, wunschPruefen, zeileHtml } from "./plaene.js";

/**
 * Pläne gegen die echte Übungsdatenbank.
 *
 * Der Baustein selbst ist in `packages/core` mit einer kleinen Testbibliothek
 * geprüft. Hier geht es um das, was nur mit den echten Daten schiefgehen kann:
 * ein Platz, für den es auf einer Stufe keine Übung gibt, oder eine Übung, deren
 * Felder der Plan anders liest als gedacht.
 */

const alleWuensche = () => {
  const aus = [];
  for (const tage of [2, 3, 4, 5]) for (const minuten of [30, 45, 60, 75]) for (const niveau of ["beginner", "intermediate", "advanced"])
    for (const ziel of ["muskel", "kraft", "fitness"]) for (const deload of [false, true]) aus.push({ tage, minuten, niveau, ziel, deload, variante: 0 });
  return aus;
};

test("Jede Kombination ergibt einen brauchbaren Plan", () => {
  const ids = new Set(UEBUNGEN.map((u) => u.id));
  for (const w of alleWuensche()) {
    const plan = planFuer(w);
    assert.equal(plan.einheiten.length, w.tage, JSON.stringify(w));
    for (const e of plan.einheiten) {
      assert.ok(e.positionen.length >= 3, `${e.titel} bei ${JSON.stringify(w)}: ${e.positionen.length}`);
      assert.equal(new Set(e.positionen.map((p) => p.id)).size, e.positionen.length);
      for (const p of e.positionen) {
        assert.ok(ids.has(p.id), p.id);
        assert.ok(p.saetze >= 1 && p.saetze <= 5, `${p.id}: ${p.saetze} Sätze`);
        assert.ok(p.pauseSek >= 30 && p.pauseSek <= 240);
        assert.ok(p.reserve >= 0 && p.reserve <= 6);
      }
    }
  }
});

test("Einsteiger bekommen nur Einsteigerübungen, auch mit echten Daten", () => {
  const einsteiger = new Set(UEBUNGEN.filter((u) => u.level === "beginner").map((u) => u.id));
  for (const tage of [2, 3, 4, 5]) for (const variante of [0, 1, 2, 3]) {
    for (const e of planFuer({ ...STANDARD_WUNSCH, tage, niveau: "beginner", variante }).einheiten)
      for (const p of e.positionen) assert.ok(einsteiger.has(p.id), `${p.id} ist keine Einsteigerübung`);
  }
});

test("Für Einsteiger kommt das Ziehen von oben aus Latzug oder Klimmzug mit Unterstützung", () => {
  const erlaubt = new Set(["latzug", "latzug-enger-griff", "klimmzug-breit-maschine", "klimmzug-eng-maschine"]);
  const gesehen = new Set();
  for (let variante = 0; variante < 12; variante++) {
    for (const e of planFuer({ ...STANDARD_WUNSCH, tage: 3, niveau: "beginner", minuten: 60, variante }).einheiten) {
      for (const p of e.positionen) {
        const u = UEBUNGEN.find((x) => x.id === p.id);
        if (u.pattern === "vertical_pull") { assert.ok(erlaubt.has(p.id), p.id); gesehen.add(p.id); }
      }
    }
  }
  assert.ok(gesehen.size >= 2, "es sollte mehr als eine Möglichkeit vorkommen");
});

test("Wer erfahren ist, bekommt Klimmzüge statt der Unterstützung", () => {
  const frei = new Set(["klimmzug", "klimmzug-untergriff", "klimmzug-breit", "klimmzug-eng", "latzug", "latzug-enger-griff",
    "klimmzug-breit-maschine", "klimmzug-eng-maschine", "klimmzug-breit-band", "klimmzug-eng-band"]);
  for (let variante = 0; variante < 6; variante++) {
    for (const e of planFuer({ ...STANDARD_WUNSCH, niveau: "advanced", tage: 4, minuten: 75, variante }).einheiten)
      for (const p of e.positionen) if (UEBUNGEN.find((x) => x.id === p.id).pattern === "vertical_pull") assert.ok(frei.has(p.id), p.id);
  }
});

test("Ab drei Tagen kommt jede große Gruppe an mindestens zwei Tagen vor", () => {
  for (const tage of [3, 4, 5]) {
    const plan = planFuer({ ...STANDARD_WUNSCH, tage, minuten: 60 });
    for (const gruppe of ["brust", "ruecken", "beine"]) {
      const tageMit = plan.einheiten.filter((e) => e.positionen.some((p) => UEBUNGEN.find((u) => u.id === p.id).gruppe === gruppe)).length;
      assert.ok(tageMit >= 2, `${gruppe} bei ${tage} Tagen an ${tageMit}`);
    }
  }
});

test("Die Plandauer liegt bei 45 Minuten und mehr in der Zeit", () => {
  for (const w of alleWuensche().filter((x) => x.minuten >= 45)) {
    for (const e of planFuer(w).einheiten) assert.ok(e.dauerMin <= w.minuten + 3, `${e.titel}: ${e.dauerMin} Min. bei ${w.minuten}, ${JSON.stringify(w)}`);
  }
});

test("Ein unbrauchbares Wunschobjekt fällt auf die Standardwerte zurück", () => {
  assert.deepEqual(wunschPruefen(null), STANDARD_WUNSCH);
  assert.equal(wunschPruefen({ tage: 9, ziel: "xyz" }).tage, STANDARD_WUNSCH.tage);
  assert.equal(wunschPruefen({ tage: 9, ziel: "xyz" }).ziel, STANDARD_WUNSCH.ziel);
  assert.equal(wunschPruefen({ variante: -4 }).variante, 0);
  assert.equal(wunschPruefen({ variante: 2.5 }).variante, 0);
  assert.equal(wunschPruefen({ deload: "ja" }).deload, true);
});

test("Ein gespeicherter Plan verliert unbekannte Übungen und kippt nicht", () => {
  const plan = planFuer(STANDARD_WUNSCH);
  const kaputt = JSON.parse(JSON.stringify(plan));
  kaputt.einheiten[0].positionen.unshift({ id: "gibts-nicht", name: "X", saetze: 3, wdh: "8", pauseSek: 60, reserve: 2 });
  const geladen = gespeicherterPlan(kaputt);
  assert.ok(geladen);
  assert.ok(!geladen.einheiten[0].positionen.some((p) => p.id === "gibts-nicht"));
  assert.equal(gespeicherterPlan(null), null);
  assert.equal(gespeicherterPlan({ einheiten: [] }), null);
  assert.equal(gespeicherterPlan({ einheiten: [{ titel: "A", positionen: [{ id: "weg" }] }] }), null);
  assert.equal(gespeicherterPlan("quatsch"), null);
});

test("Die Auswahlzeilen markieren genau einen Wert je Feld", () => {
  const html = steuerHtml(STANDARD_WUNSCH);
  for (const f of FELDER) {
    const an = html.split("\n").join("").match(new RegExp(`data-feld="${f.feld}"[^>]*aria-pressed="true"`, "g")) ?? [];
    assert.equal(an.length, 1, f.feld);
  }
  assert.doesNotMatch(html, /plDeload"\s+checked/);
  assert.match(steuerHtml({ ...STANDARD_WUNSCH, deload: true }), /id="plDeload" checked/);
});

test("Eine Zeile zeigt Foto, Sätze, Pause und Reserve und maskiert Zeichen", () => {
  const html = zeileHtml({ id: "kniebeuge-langhantel", name: "<b>x</b>", saetze: 3, wdh: "6-10", pauseSek: 120, reserve: 2 });
  assert.match(html, /img\/uebungen\/kachel\/kniebeuge-langhantel\.jpg/);
  assert.match(html, /3 × 6-10/);
  assert.match(html, /Pause 2 min/);
  assert.match(html, /2 in Reserve/);
  assert.doesNotMatch(html, /<b>x/);
  assert.match(zeileHtml({ id: "plank", name: "Plank", saetze: 2, wdh: "20-60s", pauseSek: 45, reserve: 2 }), /Pause 45 s/);
});

test("Die Sätze pro Woche zeigen nur belegte Gruppen und erklären den Strich", () => {
  const html = saetzeHtml({ brust: 8, beine: 12, rumpf: 0 });
  assert.match(html, /Brust/);
  assert.match(html, /Beine und Gesäß/);
  assert.doesNotMatch(html, /Rumpf/);
  assert.match(html, /zehn Sätze/);
  assert.equal(saetzeHtml({}), "");
});

test("Jede Einheit und der Text zum Teilen tragen Titel und Übungen", () => {
  const plan = planFuer({ ...STANDARD_WUNSCH, tage: 2 });
  for (const e of plan.einheiten) assert.match(einheitHtml(e), new RegExp(e.titel));
  const text = planText(plan);
  assert.match(text, /^Trainingsplan: 2 Tage/);
  assert.doesNotMatch(text, /[–—]/);
});

test("Kein Text im Plan nutzt Umschreibungen statt Umlaute", () => {
  const plan = planFuer(STANDARD_WUNSCH);
  const text = [...plan.hinweise, ...plan.einheiten.flatMap((e) => [e.titel, e.fokus])].join(" ");
  assert.doesNotMatch(text, /\b\w*(Rueck|Koerper|Gesaess|fuer|ueber)\w*\b/i);
  assert.doesNotMatch(text, /[–—]/);
});
