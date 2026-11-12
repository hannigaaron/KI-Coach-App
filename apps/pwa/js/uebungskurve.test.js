import test from "node:test";
import assert from "node:assert/strict";
import { fortschrittHtml, kurvenPunkte, trendKurz, uebungsKurve } from "./uebungskurve.js";

const tag = (n) => new Date(Date.UTC(2026, 8, 1 + n)).toISOString().slice(0, 10);
const reihe = (uebung, kgs, wdh = 8) => kgs.map((kg, i) => ({ datum: tag(i * 7), uebung, saetze: [{ kg, wdh, rir: 2 }, { kg: kg - 10, wdh, rir: 3 }] }));

test("Fortschritt ohne Eintrag sagt, wann hier etwas steht", () => {
  assert.ok(fortschrittHtml([], "bankdruecken", tag(0)).includes("Noch kein Satz gespeichert"));
  assert.equal(trendKurz([], "bankdruecken", tag(0)), "");
});

test("Kurve, Urteil und letzte Einheit stehen da", () => {
  const log = reihe("bank", [60, 62.5, 65, 67.5, 70]);
  const html = fortschrittHtml(log, "bank", tag(30));
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes("Steigt"));
  assert.ok(html.includes("70 kg × 8"));
  assert.ok(html.includes("plus 10 kg seit"));
  assert.ok(trendKurz(log, "bank", tag(30)).includes("steigt"));
});

test("Stillstand heisst Stagniert, schwächer heisst Schwächer", () => {
  assert.ok(fortschrittHtml(reihe("a", [60, 60, 60, 60]), "a", tag(25)).includes("Stagniert"));
  assert.ok(fortschrittHtml(reihe("a", [70, 66, 62, 58]), "a", tag(25)).includes("Schwächer"));
});

test("Ohne Gewicht zeigt die Kurve Wiederholungen", () => {
  const log = [6, 7, 8, 9].map((w, i) => ({ datum: tag(i * 7), uebung: "klimmzug", saetze: [{ kg: 0, wdh: w, rir: 1 }] }));
  const k = kurvenPunkte(log, "klimmzug", tag(25));
  assert.equal(k.einheit, "Wdh.");
  assert.deepEqual(k.punkte.map((p) => p.y), [6, 7, 8, 9]);
  assert.ok(fortschrittHtml(log, "klimmzug", tag(25)).includes("9 Wdh."));
});

test("Ein einzelner Punkt ist keine Kurve, ältere als sechzehn Wochen fallen raus", () => {
  assert.equal(uebungsKurve([{ datum: tag(0), y: 60 }]), "");
  const log = reihe("a", Array(20).fill(60));
  assert.ok(kurvenPunkte(log, "a", tag(19 * 7)).punkte.length <= 17);
});
