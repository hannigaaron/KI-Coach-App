import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  auftragAblegen,
  auftragsMitteilung,
  faelligeAuftraege,
  MAX_VORLAUF_MS,
} from "./auftrag.js";
import type { KVNamespace } from "./umgebung.js";

function kvAttrappe(): KVNamespace & { inhalt: Map<string, string> } {
  const inhalt = new Map<string, string>();
  return {
    inhalt,
    async get(k) {
      return inhalt.get(k) ?? null;
    },
    async put(k, v) {
      inhalt.set(k, v);
    },
    async delete(k) {
      inhalt.delete(k);
    },
    async list({ prefix = "", limit = 1000 } = {}) {
      return { keys: [...inhalt.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) };
    },
  };
}

const JETZT = Date.parse("2026-09-26T12:00:00Z");
const gut = { art: "trainingsluecke", at: JETZT + 3600_000, tageOhne: 5, geplanteEinheiten: 4 };

test("ein Auftrag wird abgelegt und wird zu seiner Zeit fällig", async () => {
  const kv = kvAttrappe();
  await auftragAblegen(kv, "abc123", gut, JETZT);

  assert.deepEqual(await faelligeAuftraege(kv, JETZT), []);
  const faellig = await faelligeAuftraege(kv, JETZT + 3600_000);
  assert.equal(faellig.length, 1);
  assert.equal(faellig[0]?.aboId, "abc123");
  assert.equal(faellig[0]?.art, "trainingsluecke");
  assert.equal(faellig[0]?.tageOhne, 5);
});

test("ein zugestellter Auftrag geht kein zweites Mal raus", async () => {
  const kv = kvAttrappe();
  await auftragAblegen(kv, "abc123", gut, JETZT);
  assert.equal((await faelligeAuftraege(kv, JETZT + 3600_000)).length, 1);
  assert.equal((await faelligeAuftraege(kv, JETZT + 7200_000)).length, 0);
});

test("ein zweiter Auftrag derselben Art überschreibt den ersten", async () => {
  const kv = kvAttrappe();
  await auftragAblegen(kv, "abc123", gut, JETZT);
  await auftragAblegen(kv, "abc123", { ...gut, tageOhne: 9 }, JETZT);
  const faellig = await faelligeAuftraege(kv, JETZT + 3600_000);
  assert.equal(faellig.length, 1);
  assert.equal(faellig[0]?.tageOhne, 9);
});

test("zwei Geräte bekommen zwei Aufträge", async () => {
  const kv = kvAttrappe();
  await auftragAblegen(kv, "abc123", gut, JETZT);
  await auftragAblegen(kv, "def456", gut, JETZT);
  assert.equal((await faelligeAuftraege(kv, JETZT + 3600_000)).length, 2);
});

test("eine unbekannte Art wird abgewiesen", async () => {
  const kv = kvAttrappe();
  await assert.rejects(() => auftragAblegen(kv, "abc123", { ...gut, art: "spam" }, JETZT), /Unbekannte Art/);
  assert.equal(kv.inhalt.size, 0);
});

test("unsinnige Zahlen werden abgewiesen", async () => {
  const kv = kvAttrappe();
  await assert.rejects(() => auftragAblegen(kv, "a", { ...gut, tageOhne: 0 }, JETZT), /tageOhne/);
  await assert.rejects(() => auftragAblegen(kv, "a", { ...gut, tageOhne: 999 }, JETZT), /tageOhne/);
  await assert.rejects(() => auftragAblegen(kv, "a", { ...gut, geplanteEinheiten: 0 }, JETZT), /geplante/);
});

test("weiter als zwei Tage voraus geht nicht", async () => {
  const kv = kvAttrappe();
  await assert.rejects(
    () => auftragAblegen(kv, "a", { ...gut, at: JETZT + MAX_VORLAUF_MS + 1000 }, JETZT),
    /zwei Tage/,
  );
});

test("ein Zeitpunkt in der Vergangenheit heisst sofort", async () => {
  const kv = kvAttrappe();
  const auftrag = await auftragAblegen(kv, "a", { ...gut, at: JETZT - 99999 }, JETZT);
  assert.equal(auftrag.at, JETZT);
  assert.equal((await faelligeAuftraege(kv, JETZT)).length, 1);
});

test("die Mitteilung trägt die Knöpfe und keinen Text vom Gerät", () => {
  const m = auftragsMitteilung({
    id: "auftrag:a:trainingsluecke",
    aboId: "a",
    art: "trainingsluecke",
    at: JETZT,
    tageOhne: 6,
    geplanteEinheiten: 4,
  });
  assert.match(m.titel, /6 Tage ohne Training/);
  assert.ok(m.text.length > 0);
  assert.equal(m.aktionen.length, 3);
  assert.deepEqual(
    m.aktionen.map((a) => a.action),
    ["keine_zeit", "platt", "krank"],
  );
  assert.equal(m.daten.frage, true);
});

test("ein kaputter Eintrag blockiert die anderen nicht", async () => {
  const kv = kvAttrappe();
  kv.inhalt.set("auftrag:kaputt:trainingsluecke", "{kein json");
  await auftragAblegen(kv, "abc123", gut, JETZT);
  const faellig = await faelligeAuftraege(kv, JETZT + 3600_000);
  assert.equal(faellig.length, 1);
  assert.equal(kv.inhalt.has("auftrag:kaputt:trainingsluecke"), false);
});

/* ---------- Die Schieflage ---------- */

const schief = {
  art: "schieflage",
  at: JETZT + 3600_000,
  bereich: "me_time",
  gegenBereich: "karriere",
  prozent: 30,
  minutenOffen: 295,
};

test("Eine Schieflage wird abgelegt und zugestellt", async () => {
  const kv = kvAttrappe();
  await auftragAblegen(kv, "abc123", schief, JETZT);
  const faellig = await faelligeAuftraege(kv, JETZT + 3600_000);
  assert.equal(faellig.length, 1);
  assert.equal(faellig[0]?.art, "schieflage");
  assert.equal(faellig[0]?.bereich, "me_time");
  assert.equal(faellig[0]?.minutenOffen, 295);
});

test("Der Bereich kommt als Kennung, nicht als Name", async () => {
  // Ein Name wäre freier Text vom Gerät, und genau den nimmt dieser Weg nicht
  // an. Das ist der ganze Grund, warum der Worker die Texte selbst baut.
  const kv = kvAttrappe();
  await assert.rejects(
    () => auftragAblegen(kv, "a", { ...schief, bereich: "Klick hier: angreifer.example" }, JETZT),
    /kein bekannter Bereich/,
  );
  await assert.rejects(() => auftragAblegen(kv, "a", { ...schief, bereich: "" }, JETZT), /kein bekannter Bereich/);
  assert.equal(kv.inhalt.size, 0);
});

test("Unsinnige Zahlen in der Schieflage werden abgewiesen", async () => {
  const kv = kvAttrappe();
  await assert.rejects(() => auftragAblegen(kv, "a", { ...schief, prozent: 400 }, JETZT), /prozent/);
  await assert.rejects(() => auftragAblegen(kv, "a", { ...schief, minutenOffen: 0 }, JETZT), /minutenOffen/);
});

test("Der Gegenbereich darf fehlen", async () => {
  const kv = kvAttrappe();
  const { gegenBereich, ...ohne } = schief;
  void gegenBereich;
  const a = await auftragAblegen(kv, "a", ohne, JETZT);
  assert.equal(a.gegenBereich, undefined);
});

test("Die Mitteilung zur Schieflage schlägt den Namen selbst nach", () => {
  const m = auftragsMitteilung({
    id: "auftrag:a:schieflage", aboId: "a", art: "schieflage", at: JETZT,
    bereich: "me_time", gegenBereich: "karriere", prozent: 30, minutenOffen: 295,
  });
  assert.match(m.titel, /Me Time bei 30 Prozent/);
  assert.match(m.text, /Karriere/);
  assert.equal(m.aktionen.length, 0, "hier gibt es nichts mit drei Antworten zu beantworten");
  assert.equal(m.ziel, "./?ansicht=balance");
});

test("Beide Arten liegen nebeneinander, ohne sich zu überschreiben", async () => {
  const kv = kvAttrappe();
  await auftragAblegen(kv, "abc123", gut, JETZT);
  await auftragAblegen(kv, "abc123", schief, JETZT);
  const faellig = await faelligeAuftraege(kv, JETZT + 3600_000);
  assert.equal(faellig.length, 2);
  assert.deepEqual(faellig.map((a) => a.art).sort(), ["schieflage", "trainingsluecke"]);
});
