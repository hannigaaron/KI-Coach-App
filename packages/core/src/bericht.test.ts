import assert from "node:assert/strict";
import test from "node:test";
import {
  bericht, berichtText, datumKurz, spanneKurz, MIN_ABDECKUNG, type BerichtTag,
} from "./bericht.js";

const ZIELE = { kcal: 2900, proteinG: 175, wasserMl: 3500 };

/** 28 Tage ab dem angegebenen Start, jeder Tag über `baue` gefüllt. */
function zeitraum(start: string, anzahl: number, baue: (i: number) => Partial<BerichtTag>): BerichtTag[] {
  const basis = Math.floor(Date.parse(`${start}T00:00:00Z`) / 86400000);
  return Array.from({ length: anzahl }, (_, i) => ({
    tag: new Date((basis + i) * 86400000).toISOString().slice(0, 10),
    ...baue(i),
  }));
}

const voll = (i: number) => ({
  kcal: 2800 + (i % 5) * 50,
  proteinG: 170 + (i % 3) * 10,
  wasserMl: 3000,
  trainingMinuten: i % 2 === 0 ? 60 : 0,
  trainingEinheiten: i % 2 === 0 ? 1 : 0,
  energie: 6 + (i % 3),
});

function lauf(tage: BerichtTag[], vorher?: BerichtTag[]) {
  return bericht({ tage, vorher, ziele: ZIELE, von: tage[0]!.tag, bis: tage[tage.length - 1]!.tag });
}

test("Ein voller Monat ergibt alle Werte", () => {
  const b = lauf(zeitraum("2026-09-01", 28, voll));
  const namen = b.werte.map((w) => w.name);
  assert.ok(namen.includes("Kalorien"));
  assert.ok(namen.includes("Protein"));
  assert.ok(namen.includes("Training"));
  assert.equal(b.tageMitDaten, 28);
});

test("Ein Schnitt unter einem Drittel Abdeckung wird nicht ausgegeben", () => {
  // Vier von achtundzwanzig Tagen sind der Schnitt von vier guten Tagen.
  const tage = zeitraum("2026-09-01", 28, (i) => (i < 4 ? { kcal: 2400, proteinG: 180 } : {}));
  const b = lauf(tage);
  assert.equal(b.werte.some((w) => w.name === "Kalorien"), false);
  assert.ok(b.tageMitDaten < 28 * MIN_ABDECKUNG);
  assert.match(b.fazit[0] ?? "", /Momentaufnahme/);
});

test("Eine Lücke zieht den Schnitt nicht nach unten", () => {
  // Null Kalorien an einem Tag ohne Eintrag ist keine Angabe.
  const mitLuecken = zeitraum("2026-09-01", 28, (i) => (i % 2 === 0 ? { kcal: 2800 } : { kcal: 0 }));
  const b = lauf(mitLuecken);
  const kcal = b.werte.find((w) => w.name === "Kalorien");
  assert.equal(kcal?.wert, "2800 kcal im Schnitt");
  assert.equal(kcal?.tage, 14);
});

test("Training wird summiert, Kalorien werden gemittelt", () => {
  const b = lauf(zeitraum("2026-09-01", 28, voll));
  assert.equal(b.werte.find((w) => w.name === "Training")?.wert, "840 Minuten zusammen");
  assert.equal(b.werte.find((w) => w.name === "Einheiten")?.zahl, "14");
});

test("Das Gewicht ist eine Strecke und kein Schnitt", () => {
  const tage = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), gewichtKg: i === 0 ? 87.4 : i === 27 ? 85.9 : null }));
  const g = lauf(tage).werte.find((w) => w.name === "Gewicht");
  assert.equal(g?.wert, "85.9 kg, -1.5 kg seit 1. Sep");
});

test("Eine einzelne Wiegung ergibt keine Strecke", () => {
  const tage = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), gewichtKg: i === 0 ? 87 : null }));
  assert.equal(lauf(tage).werte.some((w) => w.name === "Gewicht"), false);
});

test("Der Trend vergleicht gegen den Zeitraum davor", () => {
  const jetzt = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), trainingMinuten: i % 2 === 0 ? 90 : 0 }));
  const davor = zeitraum("2026-08-04", 28, (i) => ({ ...voll(i), trainingMinuten: i % 2 === 0 ? 60 : 0 }));
  const t = lauf(jetzt, davor).werte.find((w) => w.name === "Training");
  assert.match(t?.trend ?? "", /50 Prozent mehr als davor/);
});

test("Eine kleine Änderung gilt als unverändert", () => {
  const jetzt = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), kcal: 2800 }));
  const davor = zeitraum("2026-08-04", 28, (i) => ({ ...voll(i), kcal: 2830 }));
  assert.equal(lauf(jetzt, davor).werte.find((w) => w.name === "Kalorien")?.trend, "wie davor");
});

test("Ohne Vorperiode steht kein Trend da", () => {
  for (const w of lauf(zeitraum("2026-09-01", 28, voll)).werte) assert.equal(w.trend, null);
});

test("Der Trend urteilt nicht, er misst", () => {
  // Ob mehr Kalorien besser sind, hängt am Ziel. Der Bericht weiss das nicht.
  const jetzt = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), kcal: 3400 }));
  const davor = zeitraum("2026-08-04", 28, (i) => ({ ...voll(i), kcal: 2800 }));
  const t = lauf(jetzt, davor).werte.find((w) => w.name === "Kalorien")?.trend ?? "";
  assert.doesNotMatch(t, /besser|schlechter/);
});

test("Das Fazit hängt an Zahlen und hat höchstens drei Sätze", () => {
  const b = lauf(zeitraum("2026-09-01", 28, voll));
  assert.ok(b.fazit.length <= 3);
  assert.match(b.fazit.join(" "), /Proteinziel von 175 g/);
});

test("Der Text lässt sich kopieren und trägt die Abdeckung", () => {
  const text = berichtText(lauf(zeitraum("2026-09-01", 28, voll)));
  assert.match(text, /daevo Bericht, 1\. Sep bis 28\. Sep/);
  assert.match(text, /28 von 28 Tagen mit Eintrag/);
  assert.doesNotMatch(text, /[*#]/, "keine Auszeichnung, der Text geht in eine Nachricht");
});

test("Schlaf kommt als Stunden und Minuten", () => {
  const tage = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), schlafMinuten: 430 }));
  assert.equal(lauf(tage).werte.find((w) => w.name === "Schlaf")?.wert, "7 h 10 min im Schnitt");
});

test("Ein Gewicht von null ist keine Wiegung", () => {
  // Der Speicher liefert weightKg als null für jeden Tag ohne Wiegung, und
  // Number(null) ist 0. Ohne diese Prüfung stand im Bericht "+83.8 kg seit".
  const tage = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), gewichtKg: i === 27 ? 83.8 : 0 }));
  assert.equal(lauf(tage).werte.some((w) => w.name === "Gewicht"), false);
});

test("Jeder Wert liefert Zahl, Einheit und Zusatz getrennt", () => {
  // Eine Karte, die nur einen Wert zeigt, setzt die drei in drei Grössen. Aus
  // einer fertigen Zeile liesse sich das nur mit einer Regex zurückholen.
  const b = lauf(zeitraum("2026-09-01", 28, voll));
  const kcal = b.werte.find((w) => w.schluessel === "kalorien");
  assert.ok(kcal);
  assert.match(kcal.zahl, /^\d+$/);
  assert.equal(kcal.einheit, "kcal");
  assert.equal(b.werte.find((w) => w.schluessel === "wasser")?.einheit, "Liter");
  assert.equal(kcal.zusatz, "im Schnitt");
  assert.equal(kcal.wert, `${kcal.zahl} kcal im Schnitt`);
});

test("Eine Summe sagt zusammen, ein Schnitt sagt im Schnitt", () => {
  const b = lauf(zeitraum("2026-09-01", 28, voll));
  assert.equal(b.werte.find((w) => w.schluessel === "training")?.zusatz, "zusammen");
  assert.equal(b.werte.find((w) => w.schluessel === "protein")?.zusatz, "im Schnitt");
});

test("Jeder Wert trägt eine Kennung in ASCII", () => {
  // Über den Namen zu gehen wäre eine Kopplung an einen Text, den irgendwann
  // jemand umformuliert, und dann fehlt das Zeichen ohne Fehlermeldung.
  const tage = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), schlafMinuten: 430, gewichtKg: i % 9 === 0 ? 87 - i / 28 : null }));
  for (const w of lauf(tage).werte) assert.match(w.schluessel, /^[a-z]+$/);
});

test("Das Fazit nennt die blosse Zahl der Einheiten", () => {
  // `wert` trägt seit der Aufteilung auch den Zusatz, und daraus wurde im
  // Betrieb "Eingetragen sind 6 zusammen Einheiten in 28 Tagen".
  const text = lauf(zeitraum("2026-09-01", 28, voll)).fazit.join(" ");
  assert.match(text, /Eingetragen sind 14 Einheiten in 28 Tagen/);
  assert.doesNotMatch(text, /zusammen Einheiten/);
});

test("Die Schlafqualität kommt aus dem Check-in, nicht aus der Uhr", () => {
  // Wer keinen Health Import gemacht hat, hat trotzdem eine Aussage über
  // seinen Schlaf.
  const tage = zeitraum("2026-09-01", 28, (i) => ({ ...voll(i), schlafQualitaet: 6 + (i % 3) }));
  const w = lauf(tage).werte.find((x) => x.schluessel === "schlafqualitaet");
  assert.ok(w);
  assert.equal(w.einheit, "von 10");
  assert.equal(w.tage, 28);
});

test("Jeder Wert trägt seinen Verlauf je Tag, mit Lücken", () => {
  // Eine Lücke bleibt null. Eine Linie, die an jeder Lücke auf den Boden
  // fällt, behauptet einen Einbruch, den es nicht gab.
  const tage = zeitraum("2026-09-01", 28, (i) => (i % 2 === 0 ? voll(i) : {}));
  const w = lauf(tage).werte.find((x) => x.schluessel === "kalorien");
  assert.ok(w);
  assert.equal(w.verlauf.length, 28);
  assert.equal(w.verlauf[0] !== null, true);
  assert.equal(w.verlauf[1], null);
  assert.equal(w.verlauf.filter((v) => v !== null).length, 14);
});

test("Ein Tag mit nur einem Morgen Check-in zählt als Tag mit Eintrag", () => {
  const tage = zeitraum("2026-09-01", 28, (i) => (i === 0 ? { schlafQualitaet: 7 } : {}));
  assert.equal(lauf(tage).tageMitDaten, 1);
});

test("Ein Datum wird gesagt, nicht als Datenbankzeile gesetzt", () => {
  assert.equal(datumKurz("2026-09-03"), "3. Sep");
  assert.equal(datumKurz("2026-12-24", true), "24. Dez 2026");
  // Kaputtes bleibt stehen, statt zu einem erfundenen Datum zu werden.
  assert.equal(datumKurz("morgen"), "morgen");
});

test("Das Jahr kommt nur mit, wenn der Zeitraum zwei Jahre berührt", () => {
  assert.equal(spanneKurz("2026-09-01", "2026-09-28"), "1. Sep bis 28. Sep");
  assert.equal(spanneKurz("2025-12-20", "2026-01-10"), "20. Dez 2025 bis 10. Jan 2026");
});
