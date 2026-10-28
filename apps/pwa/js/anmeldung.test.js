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
const { anmeldeWege, anmeldungSenden, anmeldungText, googleAdresse, iosRueckkehr, pkce } = await import("./anmeldung.js");

test("ohne eigenen Server gibt es keine Anmeldung, im Browser nur Google mit Web Client", () => {
  assert.deepEqual(anmeldeWege(), { apple: false, google: false });
  KONFIG.chatUrl = "https://w.dev";
  assert.deepEqual(anmeldeWege(), { apple: false, google: false });
  KONFIG.anmeldung = { googleWebClientId: "123-web.apps.googleusercontent.com" };
  assert.deepEqual(anmeldeWege(), { apple: false, google: true });
  KONFIG.anmeldung = null;
  KONFIG.chatUrl = "";
});

test("PKCE und Google Adresse nach RFC 7636", async () => {
  const { verifier, challenge } = await pkce();
  assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
  const erwartet = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))).toString("base64url");
  assert.equal(challenge, erwartet);
  const r = iosRueckkehr("987-abc.apps.googleusercontent.com");
  assert.deepEqual(r, { schema: "com.googleusercontent.apps.987-abc", redirect: "com.googleusercontent.apps.987-abc:/oauth2redirect" });
  const url = new URL(googleAdresse({ clientId: "987-abc.apps.googleusercontent.com", redirect: r.redirect, challenge, state: "s1" }));
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("scope"), "openid");
});

test("Anmeldung übernimmt den Schlüssel vom Server und schickt den alten mit", async () => {
  KONFIG.chatUrl = "https://w.dev";
  store.setSettings({ kontoToken: "alt".repeat(10) });
  let gesendet;
  const holen = async (url, init) => {
    gesendet = { url, auth: init.headers.authorization, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ ok: true, token: "neu".repeat(10), id: "k1", login: "apple", uebernommen: true }));
  };
  const r = await anmeldungSenden({ anbieter: "apple", idToken: "x.y.z" }, holen);
  assert.equal(r.uebernommen, true);
  assert.equal(gesendet.url, "https://w.dev/anmeldung");
  assert.equal(gesendet.auth, `Bearer ${"alt".repeat(10)}`);
  const s = store.getSettings();
  assert.equal(s.kontoToken, "neu".repeat(10));
  assert.equal(s.login, "apple");
  assert.match(anmeldungText(s), /Apple/);
  const f = await anmeldungSenden({ anbieter: "apple" }, async () => new Response(JSON.stringify({ fehler: "Signatur ungültig." }), { status: 401 }));
  assert.equal(f.fehler, "Signatur ungültig.");
  KONFIG.chatUrl = "";
});
