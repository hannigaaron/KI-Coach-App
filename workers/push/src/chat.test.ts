import test from "node:test";
import assert from "node:assert/strict";
import { chatWeiterreichen, fenster, geraeteKennung, zaehlen, TAGESGRENZE, GERAETEGRENZE } from "./chat.js";
import type { Env, KVNamespace } from "./umgebung.js";

/** Ein Schlüsselspeicher im Arbeitsspeicher. */
function kvAttrappe(): KVNamespace & { inhalt: Map<string, string> } {
  const inhalt = new Map<string, string>();
  return {
    inhalt,
    async get(k) { return inhalt.has(k) ? inhalt.get(k)! : null; },
    async put(k, v) { inhalt.set(k, v); },
    async delete(k) { inhalt.delete(k); },
    async list() { return { keys: [...inhalt.keys()].map((name) => ({ name })) }; },
  };
}

function umgebung(extra: Partial<Env> = {}): Env {
  return {
    ABOS: kvAttrappe(), VAPID_PUBLIC: "p", VAPID_PRIVATE: "q",
    PUSH_KONTAKT: "mailto:a@b.de", HERKUNFT: "https://example.org",
    ANTHROPIC_KEY: "sk-test", ...extra,
  } as Env;
}

function anfrage(ip = "1.2.3.4"): Request {
  return new Request("https://w.dev/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify({ model: "x", messages: [] }),
  });
}

test("ohne Schlüssel sagt der Worker das, statt still zu scheitern", async () => {
  const env = umgebung({ ANTHROPIC_KEY: undefined });
  const antwort = await chatWeiterreichen(anfrage(), env, async () => new Response("{}"));
  assert.equal(antwort.status, 503);
  assert.match(await antwort.text(), /kein Schlüssel/);
});

test("der Schlüssel geht an Anthropic und nicht an den Browser", async () => {
  const env = umgebung();
  let gesehen: Record<string, string> = {};
  const antwort = await chatWeiterreichen(anfrage(), env, async (_url, init) => {
    gesehen = Object.fromEntries(Object.entries((init as RequestInit).headers as Record<string, string>));
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  });
  assert.equal(gesehen["x-api-key"], "sk-test");
  // Die Antwort an den Browser trägt keinen Schlüssel, in keinem Kopf.
  antwort.headers.forEach((wert) => assert.equal(/sk-test/.test(wert), false));
  assert.equal(antwort.status, 200);
});

test("der Körper geht unverändert durch", async () => {
  const env = umgebung();
  let koerper = "";
  await chatWeiterreichen(anfrage(), env, async (_url, init) => {
    koerper = String((init as RequestInit).body);
    return new Response("{}");
  });
  assert.deepEqual(JSON.parse(koerper), { model: "x", messages: [] });
});

test("die Tagesgrenze deckelt den Schaden, wenn die Adresse bekannt wird", async () => {
  const env = umgebung();
  const holen = async () => new Response("{}");
  for (let i = 0; i < TAGESGRENZE; i++) await chatWeiterreichen(anfrage(`10.0.0.${i % 200}`), env, holen);
  const zuviel = await chatWeiterreichen(anfrage("10.9.9.9"), env, holen);
  assert.equal(zuviel.status, 429);
  assert.match(await zuviel.text(), /Tageskontingent/);
});

test("ein einzelnes Gerät läuft vorher gegen seine eigene Grenze", async () => {
  const env = umgebung();
  const holen = async () => new Response("{}");
  for (let i = 0; i < GERAETEGRENZE; i++) await chatWeiterreichen(anfrage("5.5.5.5"), env, holen);
  const zuviel = await chatWeiterreichen(anfrage("5.5.5.5"), env, holen);
  assert.equal(zuviel.status, 429);
  assert.match(await zuviel.text(), /diesem Gerät/);
  // Ein anderes Gerät ist davon nicht betroffen.
  const anderes = await chatWeiterreichen(anfrage("6.6.6.6"), env, holen);
  assert.equal(anderes.status, 200);
});

test("der Zähler läuft je Fenster und nicht über alles", () => {
  const a = fenster(new Date("2026-09-17T06:30:00Z"));
  const b = fenster(new Date("2026-09-17T07:01:00Z"));
  assert.equal(a.tag, b.tag, "derselbe Tag");
  assert.notEqual(a.stunde, b.stunde, "eine andere Stunde");
});

test("ohne IP wird trotzdem gezählt, nur gemeinsam", () => {
  const ohne = new Request("https://w.dev/chat", { method: "POST" });
  assert.equal(geraeteKennung(ohne), "unbekannt");
});

test("der Zähler meldet seinen Stand und blockt ab der Grenze", async () => {
  const kv = kvAttrappe();
  assert.deepEqual(await zaehlen(kv, "k", 2, 60), { erlaubt: true, stand: 1 });
  assert.deepEqual(await zaehlen(kv, "k", 2, 60), { erlaubt: true, stand: 2 });
  assert.deepEqual(await zaehlen(kv, "k", 2, 60), { erlaubt: false, stand: 2 });
});
