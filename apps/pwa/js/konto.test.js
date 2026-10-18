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

const { aboAnlass, aboAnlassLeer, aboLink, tageUebrig } = await import("./konto.js");

test("die Testphase meldet sich an ihren letzten zwei Tagen, je einmal", () => {
  const stand = { stufe: "test", bis: "2026-10-24" };
  assert.equal(tageUebrig("2026-10-24", "2026-10-24"), 1);
  assert.equal(aboAnlass(stand, {}, "2026-10-21"), null);
  assert.match(aboAnlass(stand, {}, "2026-10-23").marke, /Noch 2 Tage/);
  assert.match(aboAnlass(stand, {}, "2026-10-24").titel, /endet/);
  assert.equal(aboAnlass(stand, { tag: "2026-10-24" }, "2026-10-24"), null);
});

test("das Ende der Testphase kommt genau einmal", () => {
  const a = aboAnlass({ stufe: "frei" }, {}, "2026-10-25");
  assert.equal(a.art, "vorbei");
  assert.equal(aboAnlass({ stufe: "frei" }, a.merken, "2026-10-26"), null);
});

test("Plus bekommt ab 80 Prozent einmal im Monat den Hinweis auf Pro", () => {
  const stand = { stufe: "plus", monat: "2026-11", verbrauch: { nachrichten: 640 }, grenze: { nachrichten: 800 } };
  const a = aboAnlass(stand, {}, "2026-11-20");
  assert.equal(a.empfohlen, "pro");
  assert.equal(aboAnlass(stand, a.merken, "2026-11-21"), null);
  assert.equal(aboAnlass({ ...stand, verbrauch: { nachrichten: 639 } }, {}, "2026-11-20"), null);
  assert.equal(aboAnlass({ stufe: "pro" }, {}, "2026-11-20"), null);
});

test("ein leeres Kontingent bietet das Abo an, aber nicht mitten in einem Gespräch über Gefühle", () => {
  assert.equal(aboAnlassLeer({}, 1000, "psyche"), null);
  const a = aboAnlassLeer({}, 1000, "erfassen");
  assert.equal(a.art, "leer");
  assert.equal(aboAnlassLeer(a.merken, 1000 + 60000, "erfassen"), null);
  assert.ok(aboAnlassLeer(a.merken, 1000 + 3600001, "erfassen"));
});

test("der Knopf führt zum Zahlungslink, sonst zur Mail, in der iPhone App nirgends hin", () => {
  const mitLink = aboLink("plus", "abc12345", { abo: { plusUrl: "https://buy.stripe.com/test_x" } });
  assert.equal(mitLink, "https://buy.stripe.com/test_x?client_reference_id=abc12345");
  const mail = aboLink("pro", "abc12345", { angebot: { mail: "coach@example.org" } });
  assert.match(mail, /^mailto:coach@example\.org\?subject=daevo%20Pro/);
  assert.match(decodeURIComponent(mail), /Konto-ID: abc12345/);
  assert.equal(aboLink("plus", "abc12345", { abo: { plusUrl: "https://buy.stripe.com/x" } }, true), null);
  assert.equal(aboLink("plus", "abc12345", {}), null);
});

test("die Leiste auf dem Start zählt die Testphase herunter und schweigt bei Pro", async () => {
  const { aboLeiste } = await import("./konto.js");
  assert.equal(aboLeiste({ stufe: "test", bis: "2026-10-24" }, "2026-10-20").text, "Testphase, noch 5 Tage");
  assert.equal(aboLeiste({ stufe: "test", bis: "2026-10-24" }, "2026-10-24").text, "Testphase endet heute");
  assert.equal(aboLeiste({ stufe: "frei" }, "2026-10-30").knopf, "Plus holen");
  assert.equal(aboLeiste({ stufe: "plus", verbrauch: { nachrichten: 100 }, grenze: { nachrichten: 800 } }, "2026-10-30"), null);
  assert.equal(aboLeiste({ stufe: "pro" }, "2026-10-30"), null);
});
