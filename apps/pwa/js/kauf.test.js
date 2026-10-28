import test from "node:test";
import assert from "node:assert/strict";

class SpeicherAttrappe {
  constructor() { this.inhalt = new Map(); }
  get length() { return this.inhalt.size; }
  key(i) { return [...this.inhalt.keys()][i] ?? null; }
  getItem(k) { return this.inhalt.has(k) ? this.inhalt.get(k) : null; }
  setItem(k, v) { this.inhalt.set(String(k), String(v)); }
  removeItem(k) { this.inhalt.delete(k); }
  clear() { this.inhalt.clear(); }
}
globalThis.localStorage = new SpeicherAttrappe();

const { store } = await import("./storage.js");
const { KONFIG } = await import("./konfig.js");
const { kaufenNativ, produktId, startAnlass } = await import("./kauf.js");

test("Produktkennung aus der Konfiguration, sonst nach Schema", () => {
  assert.equal(produktId("plus", "monat", {}), "de.daevo.plus.monat");
  assert.equal(produktId("pro", "jahr", { abo: { appstore: { proJahr: "x.pro.y" } } }), "x.pro.y");
});

test("Startfenster nur mit Testphase ab Abo, ohne Abo und einmal", () => {
  const stand = { stufe: "frei", testphaseMitAbo: true, quelle: null };
  assert.equal(startAnlass(stand).art, "start");
  assert.equal(startAnlass({ ...stand, testphaseMitAbo: false }), null);
  assert.equal(startAnlass({ ...stand, quelle: "appstore" }), null);
  assert.equal(startAnlass({ ...stand, stufe: "plus" }), null);
  assert.equal(startAnlass(stand, { start: true }), null);
});

test("Kauf: Beleg geht an den Server, Abbruch ist kein Fehler", async () => {
  KONFIG.chatUrl = "https://w.dev";
  store.setSettings({ kontoToken: "t".repeat(30) });
  let gesendet;
  const holen = async (url, init) => { gesendet = { url, body: JSON.parse(init.body) }; return new Response(JSON.stringify({ ok: true, stufe: "plus", bis: "2026-11-04" })); };
  const r = await kaufenNativ("plus", "monat", { aufruf: async (_p, m, d) => { assert.equal(m, "kaufen"); assert.equal(d.id, "de.daevo.plus.monat"); return { jws: "a.b.c" }; }, holen });
  assert.deepEqual(r, { ok: true, stufe: "plus", bis: "2026-11-04" });
  assert.equal(gesendet.url, "https://w.dev/appstore");
  assert.equal(gesendet.body.jws, "a.b.c");
  assert.deepEqual(await kaufenNativ("plus", "monat", { aufruf: async () => { throw new Error("abgebrochen"); }, holen }), { abgebrochen: true });
  KONFIG.chatUrl = "";
});
