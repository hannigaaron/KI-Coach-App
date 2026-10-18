import test from "node:test";
import assert from "node:assert/strict";

/** Das Konto auf dem eigenen Server, ohne Browser und ohne Netz. */
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

const { KONFIG } = await import("./konfig.js");
const { store } = await import("./storage.js");
const { kontoSicherstellen, kontoStand, kontoText, kontoToken } = await import("./konto.js");

function json(daten, status = 200) {
  return new Response(JSON.stringify(daten), { status, headers: { "content-type": "application/json" } });
}

test("ohne eigenen Server gibt es kein Konto und keine Anfrage", async () => {
  KONFIG.chatUrl = "";
  localStorage.clear();
  let gefragt = false;
  assert.equal(await kontoSicherstellen(async () => { gefragt = true; return json({}); }), null);
  assert.equal(gefragt, false);
});

test("beim ersten Start wird ein Konto angelegt und gespeichert, danach nicht nochmal", async () => {
  KONFIG.chatUrl = "https://w.dev";
  localStorage.clear();
  let anfragen = 0;
  const holen = async () => { anfragen++; return json({ ok: true, token: "t".repeat(40), id: "abc12345" }); };
  assert.equal(await kontoSicherstellen(holen), "t".repeat(40));
  assert.equal(await kontoSicherstellen(holen), "t".repeat(40));
  assert.equal(anfragen, 1);
  assert.equal(kontoToken(), "t".repeat(40));
  assert.equal(store.getSettings().kontoId, "abc12345");
});

test("ein Netzfehler blockiert nichts, die App läuft ohne Konto weiter", async () => {
  KONFIG.chatUrl = "https://w.dev";
  localStorage.clear();
  assert.equal(await kontoSicherstellen(async () => { throw new TypeError("Failed to fetch"); }), null);
  assert.equal(kontoToken(), undefined);
});

test("kennt der Server das Konto nicht mehr, legt die App ein neues an", async () => {
  KONFIG.chatUrl = "https://w.dev";
  localStorage.clear();
  store.setSettings({ kontoToken: "alt".padEnd(40, "x"), kontoId: "altalt12" });
  const holen = async (url, init) => {
    if (init?.method === "POST") return json({ ok: true, token: "n".repeat(40), id: "neuneu12" });
    const kopf = init?.headers?.authorization || "";
    if (kopf.includes("alt")) return json({ fehler: "unbekannt" }, 404);
    return json({ ok: true, id: "neuneu12", stufe: "frei", name: "Kostenlos", verbrauch: { nachrichten: 3, mikro: 30000 }, grenze: { nachrichten: 40, budgetMikro: 300000 } });
  };
  const stand = await kontoStand(holen);
  assert.equal(stand.id, "neuneu12");
  assert.equal(kontoToken(), "n".repeat(40));
  assert.equal(kontoText(stand), "Stufe Kostenlos. Diesen Monat 3 von 40 Nachrichten an die KI, 10 Prozent des Budgets.");
});
