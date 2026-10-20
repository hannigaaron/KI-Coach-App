import { test } from "node:test";
import assert from "node:assert/strict";
import { erinnerungAmTag, erinnerungAus, erinnerungFehler, erinnerungUhrzeit, tageText, wannText, wochentagIso } from "./erinnerung.js";

test("ein Satz wird zur Erinnerung, ohne Tage heisst täglich", () => {
  assert.deepEqual(erinnerungAus("Erinnere mich jeden Tag um 8 an meine Tabletten"),
    { text: "Meine Tabletten", uhrzeit: "08:00", tage: [] });
  assert.deepEqual(erinnerungAus("Erinnere mich um 21:30 an das Nasenspray"),
    { text: "Das Nasenspray", uhrzeit: "21:30", tage: [] });
  assert.deepEqual(erinnerungAus("erinner mich werktags um 7.15 Uhr daran, die Schilddrüsentablette zu nehmen."),
    { text: "Die Schilddrüsentablette zu nehmen", uhrzeit: "07:15", tage: [1, 2, 3, 4, 5] });
  assert.deepEqual(erinnerungAus("Erinnere mich montags und donnerstags um 9 an Vitamin D"),
    { text: "Vitamin D", uhrzeit: "09:00", tage: [1, 4] });
  assert.equal(erinnerungAus("Erinnere mich um 8 abends an Magnesium")?.uhrzeit, "20:00");
});

test("ohne echte Uhrzeit oder für heute wird nichts geraten", () => {
  assert.equal(erinnerungAus("Erinnere mich später an meine Tabletten"), null);
  assert.equal(erinnerungAus("Erinnere mich an meine Tabletten"), null);
  assert.equal(erinnerungAus("Erinnere mich morgen um 8 an den Zahnarzt"), null);
  assert.equal(erinnerungAus("Ich nehme um 8 meine Tabletten"), null);
  assert.equal(erinnerungAus("Erinnere mich um 25 Uhr an etwas"), null);
  assert.ok(erinnerungAus("Erinnere mich jeden Morgen um 7 an Wasser"));
});

test("Wochentage zählen ab Montag", () => {
  assert.equal(wochentagIso("2026-10-19"), 1);
  assert.equal(wochentagIso("2026-10-25"), 7);
  const e = { id: "a", text: "x", uhrzeit: "08:00", tage: [1, 3] };
  assert.equal(erinnerungAmTag(e, "2026-10-19"), true);
  assert.equal(erinnerungAmTag(e, "2026-10-20"), false);
  assert.equal(erinnerungAmTag({ ...e, tage: [] }, "2026-10-20"), true);
  assert.equal(tageText([]), "täglich");
  assert.equal(tageText([5, 4, 3, 2, 1]), "werktags");
  assert.equal(tageText([6, 7]), "am Wochenende");
  assert.equal(tageText([1, 4]), "Mo, Do");
});

test("Prüfung vor dem Speichern", () => {
  assert.equal(erinnerungFehler({ text: "Tabletten", uhrzeit: "08:00", tage: [] }), null);
  assert.ok(erinnerungFehler({ text: "", uhrzeit: "08:00", tage: [] }));
  assert.ok(erinnerungFehler({ text: "Tabletten", uhrzeit: "8", tage: [] }));
  assert.ok(erinnerungFehler({ text: "Tabletten", uhrzeit: "08:00", tage: [8] }));
});

test("am eigenen Tag: vor dem Schlafen, nach dem Aufstehen", () => {
  const e = erinnerungAus("Erinnere mich abends eine Stunde vor dem Schlafengehen an die abendlichen Supplemente");
  assert.deepEqual(e, { text: "Die abendlichen Supplemente", bezug: "schlafen", versatz: -60, tage: [] });
  assert.equal(erinnerungUhrzeit({ id: "a", ...e! }, { wakeTime: "07:00", sleepTime: "23:00" }), "22:00");
  assert.equal(erinnerungUhrzeit({ id: "a", ...e! }, { wakeTime: "09:00", sleepTime: "00:30" }), "23:30");
  assert.equal(wannText({ id: "a", ...e! }), "1 Stunde vor dem Schlafen");

  const f = erinnerungAus("Erinner mich 30 Minuten nach dem Aufstehen an die Schilddrüsentablette");
  assert.deepEqual(f, { text: "Die Schilddrüsentablette", bezug: "aufstehen", versatz: 30, tage: [] });
  assert.equal(wannText({ id: "b", ...f! }), "30 Minuten nach dem Aufstehen");
  assert.equal(erinnerungAus("Erinnere mich vor dem Schlafen an Magnesium")?.versatz, 0);
  assert.equal(erinnerungFehler({ text: "Magnesium", bezug: "schlafen", versatz: -60, tage: [] }), null);
});
