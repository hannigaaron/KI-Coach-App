import { test } from "node:test";
import assert from "node:assert/strict";
import { produktSucheAdresse, produktSuchen } from "./produkt.js";

test("die Produktsuche geht nur an Open Food Facts und nur mit festen Feldern", () => {
  const a = produktSucheAdresse("brands:esn rice pudding");
  assert.ok(a?.startsWith("https://search.openfoodfacts.org/search?q=brands%3Aesn%20rice%20pudding&page_size=12&fields="));
  assert.equal(produktSucheAdresse("ab"), null);
  assert.equal(produktSucheAdresse("x".repeat(121)), null);
});

test("eine HTML Seite unter Last wird zum Fehler und nicht durchgereicht", async () => {
  const html = (async () => new Response("<html>", { status: 503, headers: { "content-type": "text/html" } })) as typeof fetch;
  assert.equal((await produktSuchen("esn whey", html)).status, 502);
  const ok = (async () => new Response('{"hits":[]}', { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
  assert.deepEqual(await produktSuchen("esn whey", ok), { status: 200, text: '{"hits":[]}' });
});
