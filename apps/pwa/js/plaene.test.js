import test from "node:test";
import assert from "node:assert/strict";
import { UEBUNGEN } from "./uebungen-daten.js";
import { FELDER, PLAN_WOCHEN, STANDARD_WUNSCH, einheitHtml, gespeicherterPlan, kurzplanFuer, naechsteEinheit, planFuer, planKopfHtml, planText, planWoche, saetzeHtml, steuerHtml, wochenEnde, wunschPruefen, zeileHtml } from "./plaene.js";
import { aktiverPlan, kurzwocheAktiv } from "./vorhaben.js";

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

test("Für Einsteiger kommt das Ziehen von oben aus Latzug, High Row oder Klimmzug mit Unterstützung", () => {
  const erlaubt = new Set(["latzug", "latzug-enger-griff", "klimmzug-breit-maschine", "klimmzug-eng-maschine", "high-row-maschine"]);
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

/* ---------- Von Hand ändern ---------- */

test("Sätze ändern rechnet Dauer und Wochensätze neu und markiert den Plan", async () => {
  const { saetzeAendern } = await import("./plaene.js");
  const plan = planFuer({ ...STANDARD_WUNSCH, minuten: 60 });
  const vorher = plan.einheiten[0].positionen[0].saetze;
  const neu = saetzeAendern(plan, 0, 0, 1);
  assert.equal(neu.einheiten[0].positionen[0].saetze, vorher + 1);
  assert.ok(neu.einheiten[0].dauerMin > plan.einheiten[0].dauerMin);
  assert.equal(neu.bearbeitet, true);
  // Der alte Plan bleibt unverändert, sonst wäre Abbrechen kein Abbrechen.
  assert.equal(plan.einheiten[0].positionen[0].saetze, vorher);
});

test("Tauschen bietet nur dieselbe Bewegung an und behält die Dosis", async () => {
  const { tauschListe, uebungTauschen } = await import("./plaene.js");
  const plan = planFuer({ ...STANDARD_WUNSCH, minuten: 60 });
  const p = plan.einheiten[0].positionen[0];
  const muster = UEBUNGEN.find((u) => u.id === p.id).pattern;
  const liste = tauschListe(plan, 0, p.id);
  assert.ok(liste.length > 0);
  assert.ok(liste.every((u) => u.pattern === muster && u.id !== p.id));
  const neu = uebungTauschen(plan, 0, 0, liste[0].id);
  assert.equal(neu.einheiten[0].positionen[0].id, liste[0].id);
  assert.equal(neu.einheiten[0].positionen[0].saetze, p.saetze);
});

test("Entfernen und Hinzufügen ändern genau eine Einheit", async () => {
  const { uebungEntfernen, uebungHinzufuegen, zusatzListe } = await import("./plaene.js");
  const plan = planFuer({ ...STANDARD_WUNSCH, minuten: 60 });
  const n = plan.einheiten[0].positionen.length;
  const weniger = uebungEntfernen(plan, 0, 0);
  assert.equal(weniger.einheiten[0].positionen.length, n - 1);
  assert.equal(weniger.einheiten[1].positionen.length, plan.einheiten[1].positionen.length);
  const dazu = zusatzListe(plan, 0)[0];
  const mehr = uebungHinzufuegen(plan, 0, dazu.id);
  assert.equal(mehr.einheiten[0].positionen.at(-1).id, dazu.id);
});

test("Beschwerden und Ort überleben das Prüfen eines gespeicherten Wunsches", () => {
  const w = wunschPruefen({ ort: "zuhause", beschwerden: ["knie", "unsinn"], meiden: ["bankdruecken", "gibtsnicht"] });
  assert.equal(w.ort, "zuhause");
  assert.deepEqual(w.beschwerden, ["knie"]);
  assert.deepEqual(w.meiden, ["bankdruecken"]);
  const plan = planFuer(w);
  const ids = plan.einheiten.flatMap((e) => e.positionen.map((p) => p.id));
  const muster = new Set(ids.map((id) => UEBUNGEN.find((u) => u.id === id).pattern));
  assert.equal(muster.has("knee_dominant"), false);
  assert.ok(ids.every((id) => ["dumbbell", "bodyweight", "resistance_band", "kettlebell"].includes(UEBUNGEN.find((u) => u.id === id).equipment)));
});

test("Training für heute: eine einzelne Übung tauschen, Dosis bleibt", async () => {
  const { heuteEinheit, heuteTauschListe } = await import("./plaene.js");
  const stand = { minuten: 45, gruppen: ["ruecken", "arme"], variante: 0 };
  const e = heuteEinheit(stand, STANDARD_WUNSCH);
  const pi = e.positionen.length - 1;
  const liste = heuteTauschListe(e, pi, STANDARD_WUNSCH);
  assert.ok(liste.length > 0, "es gibt eine andere Übung");
  const neu = heuteEinheit({ ...stand, ersetzt: { [e.positionen[pi].id]: liste[0].id } }, STANDARD_WUNSCH);
  assert.equal(neu.positionen[pi].id, liste[0].id);
  assert.equal(neu.positionen[pi].saetze, e.positionen[pi].saetze);
  assert.match(zeileHtml(e.positionen[0], { tauschAttr: 'data-heute-tausch="0"' }), /data-heute-tausch="0"/);
});

test("ein Plan läuft zwölf Wochen, gezählt ab seinem ersten Tag", () => {
  const plan = { beginn: "2026-11-02", einheiten: [] };
  assert.deepEqual(planWoche(plan, "2026-11-02"), { woche: 1, von: PLAN_WOCHEN, fertig: false });
  assert.equal(planWoche(plan, "2026-11-16").woche, 3);
  assert.equal(planWoche(plan, "2027-01-24").woche, 12);
  assert.equal(planWoche(plan, "2027-01-25").fertig, true);
  // Ältere Pläne kennen nur den Zeitpunkt des Speicherns.
  assert.equal(planWoche({ gespeichertAm: "2026-11-02T18:00:00.000Z" }, "2026-11-09").woche, 2);
});

test("als Nächstes kommt die Einheit nach der zuletzt trainierten, ohne Training die erste", () => {
  const plan = planFuer({ ...STANDARD_WUNSCH, tage: 3 });
  const [a, b, c] = plan.einheiten.map((e) => e.titel);
  assert.equal(naechsteEinheit(plan, []), 0);
  assert.equal(naechsteEinheit(plan, [{ datum: "2026-11-02", einheit: a }, { datum: "2026-11-04", einheit: b }]), 2);
  assert.equal(naechsteEinheit(plan, [{ datum: "2026-11-06", einheit: c }]), 0);
  // Ein freies Training zählt nicht als Einheit des Plans.
  assert.equal(naechsteEinheit(plan, [{ datum: "2026-11-02", einheit: a }, { datum: "2026-11-03", einheit: "Freies Training" }]), 1);
  const html = planKopfHtml(plan, { woche: { woche: 3, von: 12, fertig: false }, naechste: 1 });
  assert.match(html, /Woche 3 von 12/);
  assert.match(html, new RegExp(`Als Nächstes</small><b>${b}`));
  assert.match(html, /data-tr-start="1"/);
});

test("der Kurzplan ist Ganzkörper in 30 oder 45 Minuten und trägt kurz im Titel", () => {
  const basis = { ...STANDARD_WUNSCH, tage: 5, minuten: 75, fokus: ["arme"], ort: "studio" };
  for (const minuten of [30, 45]) {
    for (const tage of [2, 3]) {
      const k = kurzplanFuer(basis, { minuten, tage });
      assert.equal(k.einheiten.length, tage);
      assert.ok(k.einheiten.every((e) => / kurz$/.test(e.titel) && e.dauerMin <= minuten + 5), `${tage} x ${minuten}`);
      assert.deepEqual(k.wunsch.fokus, []);
    }
  }
  // Andere Titel als der normale Plan, sonst mischte das Protokoll beide.
  const normal = planFuer({ ...STANDARD_WUNSCH, tage: 2 });
  const kurz = kurzplanFuer(STANDARD_WUNSCH, { minuten: 30, tage: 2 });
  assert.ok(kurz.einheiten.every((e) => !normal.einheiten.some((n) => n.titel === e.titel)));
});

test("der Kurzplan mit gewählten Partien trainiert genau diese", async () => {
  const { UEBUNGEN } = await import("./uebungen-daten.js");
  const gruppe = new Map(UEBUNGEN.map((u) => [u.id, u.gruppe]));
  for (const minuten of [30, 45]) for (const tage of [2, 3]) {
    const k = kurzplanFuer(STANDARD_WUNSCH, { minuten, tage, gruppen: ["brust", "ruecken"] });
    assert.equal(k.einheiten.length, tage);
    assert.deepEqual(k.kurzGruppen, ["brust", "ruecken"]);
    for (const e of k.einheiten) {
      assert.ok(e.titel.startsWith("Kurz ") && e.titel.includes("Brust, Rücken"), e.titel);
      assert.ok(e.positionen.length > 0);
      assert.ok(e.positionen.some((p) => gruppe.get(p.id) === "brust") && e.positionen.some((p) => gruppe.get(p.id) === "ruecken"), e.titel);
      assert.ok(e.dauerMin <= minuten + 8, `${e.titel} ${e.dauerMin}`);
    }
  }
  // Zwei Einheiten tragen nicht genau dieselben Übungen.
  const k = kurzplanFuer(STANDARD_WUNSCH, { minuten: 45, tage: 2, gruppen: ["beine", "po"] });
  assert.notDeepEqual(k.einheiten[0].positionen.map((p) => p.id), k.einheiten[1].positionen.map((p) => p.id));
  // Unbekanntes fällt weg, ohne Wahl bleibt es Ganzkörper.
  assert.deepEqual(kurzplanFuer(STANDARD_WUNSCH, { gruppen: ["quatsch"] }).kurzGruppen, []);
});

test("die stressige Woche gilt bis Sonntag und fällt danach von selbst weg", () => {
  assert.equal(wochenEnde("2026-11-12"), "2026-11-15");
  assert.equal(wochenEnde("2026-11-15"), "2026-11-15");
  const planKurz = { einheiten: [{ titel: "A, kurz", positionen: [] }] };
  const plan = { einheiten: [{ titel: "A", positionen: [] }] };
  const s = { plan, planKurz, planWoche: { art: "kurz", bis: "2026-11-15" } };
  assert.equal(kurzwocheAktiv(s, "2026-11-15"), true);
  assert.equal(aktiverPlan(s, "2026-11-13"), planKurz);
  assert.equal(kurzwocheAktiv(s, "2026-11-16"), false);
  assert.equal(aktiverPlan(s, "2026-11-16"), plan);
  assert.equal(aktiverPlan({ plan, planWoche: { art: "kurz", bis: "2026-11-15" } }, "2026-11-13"), plan);
});

test("Bearbeiten zeigt Pfeile, oben und unten ist je einer gesperrt", async () => {
  const { positionVerschieben } = await import("./plaene.js");
  const plan = planFuer({ ...STANDARD_WUNSCH, tage: 2, minuten: 60 });
  const e = plan.einheiten[0];
  const html = einheitHtml(e, 0, { bearbeitet: 0, ohneStart: true });
  assert.ok(!html.includes("data-tr-start"), "im Entwurf wird nichts gestartet");
  assert.equal((html.match(/data-aktion="hoch"/g) ?? []).length, e.positionen.length);
  assert.match(html, /data-aktion="hoch" data-ei="0" data-pi="0" disabled/);
  assert.match(html, new RegExp(`data-aktion="runter" data-ei="0" data-pi="${e.positionen.length - 1}" disabled`));
  const ids = e.positionen.map((p) => p.id);
  const neu = positionVerschieben(plan, 0, 1, 0);
  assert.deepEqual(neu.einheiten[0].positionen.slice(0, 2).map((p) => p.id), [ids[1], ids[0]]);
  assert.equal(neu.bearbeitet, true);
  assert.deepEqual(plan.einheiten[0].positionen.map((p) => p.id), ids, "der Ausgangsplan bleibt unverändert");
});
