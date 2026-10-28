import { test } from "node:test";
import assert from "node:assert/strict";
import { berechtigungenFragen, berechtigungenOffen, berechtigungenText } from "./berechtigungen.js";
import { HEALTH_FASSUNG } from "./healthkit.js";

function speicher(start = {}) {
  let s = { ...start };
  return { getSettings: () => s, setSettings: (n) => { s = n; } };
}

test("fragt alle vier nacheinander, in fester Reihenfolge", async () => {
  const store = speicher();
  const reihe = [];
  let laeuft = 0;
  const aufruf = async (plugin, methode) => {
    assert.equal(laeuft, 0, "zwei Abfragen gleichzeitig");
    laeuft++;
    await new Promise((r) => setTimeout(r, 2));
    laeuft--;
    reihe.push(`${plugin}.${methode}`);
    if (plugin === "Diktat") return { mikrofon: true, erkennung: true };
    return { erlaubt: true };
  };
  const r = await berechtigungenFragen({ aufruf, store });
  assert.deepEqual(reihe, ["Kalender.berechtigen", "Gesundheit.berechtigen", "Mitteilungen.berechtigen", "Diktat.berechtigen"]);
  assert.deepEqual(r, { kalender: true, gesundheit: true, mitteilungen: true, sprache: true });
  const s = store.getSettings();
  assert.equal(s.appleKalender, true);
  assert.equal(s.healthNativFassung, HEALTH_FASSUNG);
  assert.equal(s.mitteilungenGefragt, true);
  assert.equal(berechtigungenOffen(s), false);
  assert.equal(berechtigungenText(r), "");
});

test("eine Absage oder ein Fehler hält die übrigen nicht auf", async () => {
  const store = speicher({ appleKalender: true });
  const aufruf = async (plugin) => {
    if (plugin === "Kalender") return { erlaubt: false };
    if (plugin === "Gesundheit") throw new Error("kein Health");
    if (plugin === "Diktat") return { mikrofon: true, erkennung: false };
    return { erlaubt: true };
  };
  const r = await berechtigungenFragen({ aufruf, store });
  assert.deepEqual(r, { kalender: false, gesundheit: false, mitteilungen: true, sprache: false });
  // Ein Nein trennt keine bestehende Verbindung.
  assert.equal(store.getSettings().appleKalender, true);
  assert.equal(store.getSettings().berechtigungenGefragt, true);
  assert.match(berechtigungenText(r), /Kalender, Apple Health, Mikrofon/);
});

test("offen nur, solange nicht gefragt wurde", () => {
  assert.equal(berechtigungenOffen({}), true);
  assert.equal(berechtigungenOffen({ berechtigungenGefragt: true }), false);
});
