import assert from "node:assert/strict";
import test from "node:test";
import { aufZehn, morgenAuswerten, morgenText, morgenUhrzeit, morgenVollstaendig, morgenWert } from "./morgencheck.js";

const alle = (v: number) => ({ schlaf: v, einschlafen: v, erholt: v, gesund: v });
const kraft = [{ art: "strength", minuten: 60, uhrzeit: "18:00", titel: "Ganzkörper A" }];

test("Der Wert läuft von 0 bis 100", () => {
  assert.equal(morgenWert(alle(1)), 0);
  assert.equal(morgenWert(alle(5)), 100);
  assert.equal(morgenWert(alle(3)), 50);
});

test("Die Uhrzeit ist eine halbe Stunde nach dem Aufstehen, auch über Mitternacht", () => {
  assert.equal(morgenUhrzeit("06:45"), "07:15");
  assert.equal(morgenUhrzeit("23:50"), "00:20");
});

test("Unvollständig ist nicht auswertbar", () => {
  assert.ok(!morgenVollstaendig({ schlaf: 3, einschlafen: 3, erholt: 3 }));
  assert.ok(!morgenVollstaendig({ ...alle(3), gesund: 6 }));
  assert.ok(morgenVollstaendig(alle(3)));
});

test("Fünf auf zehn behält die Mitte", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(aufZehn), [1, 3, 6, 8, 10]);
});

test("Ein guter Morgen gibt hohe Belastbarkeit und Training wie geplant", () => {
  const r = morgenAuswerten({ antworten: alle(5), training: kraft, schlafenszeit: "23:00" });
  assert.equal(r.belastbarkeit, "hoch");
  assert.ok(r.training[0]!.includes("wie geplant"));
  assert.ok(r.tipps.length >= 1 && r.tipps.length <= 3);
});

test("Krank schlägt jeden guten Schlaf, das Training fällt aus", () => {
  const r = morgenAuswerten({ antworten: { schlaf: 5, einschlafen: 5, erholt: 5, gesund: 1 }, training: kraft });
  assert.equal(r.belastbarkeit, "schonen");
  assert.ok(r.training[0]!.includes("gestrichen"));
  assert.ok(r.tipps.some((t) => t.includes("Arzt")));
});

test("Nicht ganz gesund deckelt auf reduziert", () => {
  const r = morgenAuswerten({ antworten: { schlaf: 5, einschlafen: 5, erholt: 5, gesund: 2 }, training: kraft });
  assert.equal(r.belastbarkeit, "reduziert");
  assert.ok(r.training[0]!.includes("drei Viertel"));
});

test("Kurzer Schlaf laut Uhr deckelt auf reduziert", () => {
  const r = morgenAuswerten({ antworten: alle(5), schlafMinuten: 320, training: kraft });
  assert.equal(r.belastbarkeit, "reduziert");
  assert.ok(r.warum.includes("5 Stunden 20 Minuten"));
});

test("Schlecht eingeschlafen nennt die Koffeingrenze aus der Schlafenszeit", () => {
  const r = morgenAuswerten({ antworten: { schlaf: 2, einschlafen: 1, erholt: 2, gesund: 4 }, schlafenszeit: "23:00", training: [] });
  assert.ok(r.tipps.some((t) => t.includes("14:00")), r.tipps.join(" | "));
  assert.ok(r.tipps.some((t) => t.includes("Tageslicht")));
  assert.ok(r.training[0]!.includes("kein Training"));
});

test("Der Text sagt, dass nichts gemessen wurde, und hat keine Gedankenstriche", () => {
  const t = morgenText(morgenAuswerten({ antworten: alle(3), training: kraft, schlafenszeit: "23:00" }));
  assert.ok(t.includes("keine Messung"));
  assert.ok(!/[–—]/.test(t));
});

test("Unter 50 heisst nur leicht und nur, wenn man sich fit genug fühlt", () => {
  const r = morgenAuswerten({ antworten: { schlaf: 1, einschlafen: 1, erholt: 1, gesund: 5 }, training: kraft });
  assert.equal(r.belastbarkeit, "niedrig");
  assert.ok(r.training[0]!.includes("nur leicht und nur, wenn du dich fit genug fühlst"));
  assert.ok(!r.training[0]!.includes("gestrichen"));
});

test("Fitness 1 streicht das Training, 2 und 3 passen es an", () => {
  for (const gesund of [2, 3]) {
    const r = morgenAuswerten({ antworten: { schlaf: 5, einschlafen: 5, erholt: 5, gesund }, training: kraft });
    assert.equal(r.belastbarkeit, "reduziert", String(gesund));
    assert.ok(r.training[0]!.includes("1 bis 2 Wiederholungen im Tank") && r.training[0]!.includes("Muskelversagen"));
  }
  const krank = morgenAuswerten({ antworten: { schlaf: 5, einschlafen: 5, erholt: 5, gesund: 1 }, training: kraft });
  assert.equal(krank.belastbarkeit, "schonen");
  assert.ok(krank.training[0]!.includes("gestrichen"));
});

test("Tageslicht mit Lampe als Ausweichweg, und L-Theanin statt spätem Kaffee", () => {
  const r = morgenAuswerten({ antworten: { schlaf: 2, einschlafen: 4, erholt: 2, gesund: 4 }, schlafenszeit: "23:00", training: [] });
  assert.ok(r.tipps.some((t) => t.includes("Tageslichtlampe") && t.includes("Bildschirm")));
  assert.ok(r.tipps.some((t) => t.includes("14:00") && t.includes("L-Theanin")));
});

test("Der Grund ist ein Nebensatz mit dem Verb am Ende", () => {
  const r = morgenAuswerten({ antworten: { schlaf: 2, einschlafen: 3, erholt: 2, gesund: 2 }, training: [] });
  assert.equal(r.warum, "Weil du dich nicht ganz fit fühlst, du wenig erholt aufgewacht bist und die Nacht schlecht war.");
});
