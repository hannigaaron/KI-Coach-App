import { test } from "node:test";
import assert from "node:assert/strict";
import { berechtigungenFragen, berechtigungenOffen, berechtigungenText, kontenAus, kontenText } from "./berechtigungen.js";
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
  assert.deepEqual(reihe, ["Kalender.berechtigen", "Kalender.konten", "Gesundheit.berechtigen", "Mitteilungen.berechtigen", "Diktat.berechtigen"]);
  assert.deepEqual(r, { kalender: true, konten: [], gesundheit: true, mitteilungen: true, sprache: true });
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

test("Blätter vor dem Fragebogen liegen nicht im versteckten #app", async () => {
  // Lag die Anmeldung in #app, war sie bei neuen Nutzern offen und
  // unsichtbar, und die iPhone App blieb schwarz.
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const appAnfang = html.indexOf('<main id="app"');
  const appEnde = html.indexOf("</main>", appAnfang);
  for (const id of ["anmeldeBlatt", "rechtBlatt"]) {
    const stelle = html.indexOf(`id="${id}"`);
    assert.ok(stelle > 0, `${id} fehlt`);
    assert.ok(stelle < appAnfang || stelle > appEnde, `${id} liegt in #app`);
  }
});

test("nach dem Ja zum Kalender: was gefunden wurde, und der Weg zu Google", async () => {
  const store = speicher();
  const aufruf = async (plugin, methode) => {
    if (plugin === "Kalender" && methode === "konten") {
      return { konten: [{ name: "Auf meinem iPhone", art: "lokal", kalender: 1 }, { name: "iCloud", art: "icloud", kalender: 3 }] };
    }
    if (plugin === "Diktat") return { mikrofon: true, erkennung: true };
    return { erlaubt: true };
  };
  const r = await berechtigungenFragen({ aufruf, store });
  assert.equal(r.konten[0].art, "icloud");
  assert.deepEqual(store.getSettings().kalenderKonten, r.konten);
  const text = kontenText(r.konten);
  assert.match(text, /^Verbunden: iCloud mit 3 Kalendern, Auf dem iPhone \(Auf meinem iPhone\) mit 1 Kalender\./);
  assert.match(text, /Account hinzufügen/);
  const mitGoogle = kontenText(kontenAus({ konten: [{ name: "aaron@gmail.com", art: "google", kalender: 2 }] }));
  assert.equal(mitGoogle, "Verbunden: Google (aaron@gmail.com) mit 2 Kalendern.");
  assert.match(kontenText([]), /noch kein Kalender eingerichtet.*Account hinzufügen/);
  // Eine ältere Hülle ohne die Methode hält nichts auf.
  const alt = await berechtigungenFragen({ aufruf: async (p, m) => { if (m === "konten") throw new Error("fehlt"); return p === "Diktat" ? { mikrofon: true, erkennung: true } : { erlaubt: true }; }, store: speicher() });
  assert.equal(alt.kalender, true);
  assert.equal(alt.konten, undefined);
});
