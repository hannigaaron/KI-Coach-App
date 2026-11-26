import test from "node:test";
import assert from "node:assert/strict";

class Speicher {
  constructor() { this.i = new Map(); }
  get length() { return this.i.size; }
  key(n) { return [...this.i.keys()][n] ?? null; }
  getItem(k) { return this.i.has(k) ? this.i.get(k) : null; }
  setItem(k, v) { this.i.set(String(k), String(v)); }
  removeItem(k) { this.i.delete(k); }
  clear() { this.i.clear(); }
}
globalThis.localStorage = new Speicher();
const { store } = await import("./storage.js");
const { wasserAusAktion } = await import("./schnellaktion.js");

test("Ein Knopf an der Mitteilung bucht das Wasser auf den Tag des Tipps", () => {
  localStorage.clear();
  const gestern = new Date(2026, 10, 17, 22, 5).getTime();
  const satz = wasserAusAktion({ aktion: "wasser_500", at: gestern }, store);
  assert.match(satz, /0,5 l/);
  assert.equal(store.getDay("2026-11-17").waterMl, 500);
  wasserAusAktion({ aktion: "wasser_1000", at: gestern }, store);
  assert.equal(store.getDay("2026-11-17").waterMl, 1500);
  assert.match(wasserAusAktion({ aktion: "wasser_250", at: gestern }, store), /1,75 l/);
});

test("Alles andere ist keine Wasseraktion", () => {
  assert.equal(wasserAusAktion({ aktion: "umplanen" }, store), null);
  assert.equal(wasserAusAktion(null, store), null);
});
