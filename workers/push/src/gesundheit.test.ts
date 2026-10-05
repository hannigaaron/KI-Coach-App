import { strict as assert } from "node:assert";
import { test } from "node:test";
import { vapidSchluesselErzeugen } from "@daevo/push";
import worker from "./index.js";
import { gesundheitAbholen, gesundheitAblegen, tagPruefen, werteLesen, zahlLesen } from "./gesundheit.js";
import type { Env, KVNamespace } from "./umgebung.js";

function kvAttrappe(): KVNamespace & { inhalt: Map<string, string> } {
  const inhalt = new Map<string, string>();
  return {
    inhalt,
    async get(k) { return inhalt.get(k) ?? null; },
    async put(k, v) { inhalt.set(k, v); },
    async delete(k) { inhalt.delete(k); },
    async list({ prefix = "", limit = 1000 } = {}) {
      return { keys: [...inhalt.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) };
    },
  };
}

async function umgebung(): Promise<{ env: Env; kv: ReturnType<typeof kvAttrappe> }> {
  const kv = kvAttrappe();
  const s = await vapidSchluesselErzeugen();
  return {
    kv,
    env: {
      ABOS: kv, VAPID_PUBLIC: s.oeffentlich, VAPID_PRIVATE: s.privat,
      PUSH_KONTAKT: "mailto:a@b.de", HERKUNFT: "https://hannigaaron.github.io", ANMELDE_WORT: "geheim",
    },
  };
}

const senden = (koerper: unknown, wort = "geheim") =>
  new Request("https://w.dev/gesundheit", {
    method: "POST",
    headers: { "content-type": "application/json", "x-daevo-wort": wort },
    body: JSON.stringify(koerper),
  });

test("Zahlen kommen als Zahl, mit Komma, mit Tausenderpunkt oder mit Einheit", () => {
  assert.equal(zahlLesen(9123, "schritte"), 9123);
  assert.equal(zahlLesen("9.123", "schritte"), 9123);
  assert.equal(zahlLesen("86,4", "gewichtKg"), 86.4);
  assert.equal(zahlLesen("1.234,5", "aktivKcal"), 1234.5);
  assert.equal(zahlLesen("62 Schläge/Min.", "ruhepuls"), 62);
  assert.equal(zahlLesen("86.4", "gewichtKg"), 86.4);
  assert.equal(zahlLesen("", "schritte"), undefined);
  assert.equal(zahlLesen("keine", "schritte"), null);
});

test("Werte ausserhalb des Bereichs werden verworfen und genannt", () => {
  const l = werteLesen({ Schritte: "8.500", Ruhepuls: 0, Gewicht: "86,44", Blutdruck: 120 });
  assert.deepEqual(l.werte, { schritte: 8500, gewichtKg: 86.4 });
  assert.deepEqual(l.verworfen, ["ruhepuls"]);
  assert.deepEqual(l.unbekannt, ["Blutdruck"]);
});

test("ein leeres Feld ist kein Fehler", () => {
  const l = werteLesen({ schritte: 4000, hrv: "" });
  assert.deepEqual(l.werte, { schritte: 4000 });
  assert.deepEqual(l.verworfen, []);
});

test("der Tag darf fehlen, aber nicht weit zurückliegen oder in der Zukunft", () => {
  assert.equal(tagPruefen(undefined, "2026-10-05"), "2026-10-05");
  assert.equal(tagPruefen("2026-10-03", "2026-10-05"), "2026-10-03");
  assert.equal(tagPruefen("2026-10-02", "2026-10-05"), null);
  assert.equal(tagPruefen("2026-10-06", "2026-10-05"), null);
  assert.equal(tagPruefen("gestern", "2026-10-05"), null);
});

test("ein späterer Lauf am selben Tag ergänzt und überschreibt Feld für Feld", async () => {
  const kv = kvAttrappe();
  await gesundheitAblegen(kv, "2026-10-05", { schritte: 2000, gewichtKg: 86.4 });
  await gesundheitAblegen(kv, "2026-10-05", { schritte: 11000 });
  const tage = await gesundheitAbholen(kv);
  assert.deepEqual(tage, [{ tag: "2026-10-05", schritte: 11000, gewichtKg: 86.4 }]);
});

test("abholen löscht, ein zweites Abholen ist leer", async () => {
  const kv = kvAttrappe();
  await gesundheitAblegen(kv, "2026-10-04", { schritte: 9000 });
  await gesundheitAblegen(kv, "2026-10-05", { schritte: 3000 });
  const tage = await gesundheitAbholen(kv);
  assert.deepEqual(tage.map((t) => t.tag), ["2026-10-04", "2026-10-05"]);
  assert.equal((await gesundheitAbholen(kv)).length, 0);
});

test("ohne Anmeldewort nimmt der Worker nichts an und gibt nichts heraus", async () => {
  const { env, kv } = await umgebung();
  const a = await worker.fetch(senden({ schritte: 5000 }, "falsch"), env);
  assert.equal(a.status, 401);
  assert.equal(kv.inhalt.size, 0);
  const b = await worker.fetch(new Request("https://w.dev/gesundheit"), env);
  assert.equal(b.status, 401);
});

test("ohne gesetztes Wort bleibt der Weg zu", async () => {
  const { env } = await umgebung();
  delete env.ANMELDE_WORT;
  const a = await worker.fetch(senden({ schritte: 5000 }, ""), env);
  assert.equal(a.status, 401);
});

test("der Rundlauf: Kurzbefehl legt ab, die App holt ab", async () => {
  const { env } = await umgebung();
  const a = await worker.fetch(senden({ tag: tagHeuteBerlin(), schritte: "10.250", ruhepuls: "58" }), env);
  assert.equal(a.status, 200);
  const antwort = (await a.json()) as { uebernommen: Record<string, number> };
  assert.deepEqual(antwort.uebernommen, { schritte: 10250, ruhepuls: 58 });

  const b = await worker.fetch(new Request("https://w.dev/gesundheit", { headers: { "x-daevo-wort": "geheim" } }), env);
  const { tage } = (await b.json()) as { tage: Array<Record<string, unknown>> };
  assert.equal(tage.length, 1);
  assert.equal(tage[0]!.schritte, 10250);
});

test("ohne einen einzigen lesbaren Wert kommt eine Meldung statt eines leeren Eintrags", async () => {
  const { env, kv } = await umgebung();
  const a = await worker.fetch(senden({ Schrite: 5000 }), env);
  assert.equal(a.status, 400);
  const fehler = (await a.json()) as { unbekannt: string[] };
  assert.deepEqual(fehler.unbekannt, ["Schrite"]);
  assert.equal(kv.inhalt.size, 0);
});

function tagHeuteBerlin(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}
