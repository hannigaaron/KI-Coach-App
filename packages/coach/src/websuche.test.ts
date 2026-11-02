import { test } from "node:test";
import assert from "node:assert/strict";
import { produktAusFund, naehrwerteImNetz } from "./websuche.js";
import type { CoachProvider, JsonRequest } from "./provider.js";

test("ein Fund aus dem Netz braucht eine https Seite und echte Makros", () => {
  const p = produktAusFund({ gefunden: true, marke: "ESN", name: "Instant Rice Pudding", kcal: 373, proteinG: 7.7, fatG: 0.7, carbsG: 83, quelle: "https://www.esn.com/products/rice-pudding" }, "ESN Instant Rice Pudding");
  assert.equal(p?.quelle, "web");
  assert.equal(p?.per100.kcal, 373);
  assert.equal(produktAusFund({ gefunden: true, proteinG: 7.7, fatG: 0.7, carbsG: 83, quelle: "esn.com" }, "x"), null);
  assert.equal(produktAusFund({ gefunden: true, proteinG: 7.7, fatG: 0.7, quelle: "https://esn.com" }, "x"), null);
  assert.equal(produktAusFund({ gefunden: false }, "x"), null);
});

test("die Websuche fragt mit Suchwerkzeug und meldet ohne Modell nichts", async () => {
  let frage: JsonRequest | null = null;
  const prov = {
    available: true,
    async generateJson(r: JsonRequest) { frage = r; return { gefunden: true, kcal: 523, proteinG: 73, fatG: 5.2, carbsG: 9.2, quelle: "https://esn.com/whey" }; },
  } as unknown as CoachProvider;
  const p = await naehrwerteImNetz(prov, "ESN Designer Whey");
  assert.equal((frage as JsonRequest | null)?.websuche, 3);
  assert.equal(p?.kcalGerechnet, true);
  assert.equal(await naehrwerteImNetz({ available: false } as unknown as CoachProvider, "x"), null);
});

test("mit Websuche geht das Suchwerkzeug mit, ohne Zwang, und pause_turn setzt fort", async () => {
  const { AnthropicProvider } = await import("./anthropic.js");
  const gesendet: Array<Record<string, unknown>> = [];
  const gemeldet: number[] = [];
  const antworten = [
    { content: [{ type: "server_tool_use", id: "s1", name: "web_search", input: { query: "esn rice pudding" } }], stop_reason: "pause_turn", usage: { input_tokens: 10, output_tokens: 5, server_tool_use: { web_search_requests: 1 } } },
    { content: [{ type: "tool_use", id: "t1", name: "naehrwerte_melden", input: { gefunden: true } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } },
  ];
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-haiku-5-5",
    onVerbrauch: (v) => gemeldet.push(v.websuchen ?? 0),
    fetchImpl: async (_url, init) => {
      gesendet.push(JSON.parse(String((init as RequestInit).body)));
      return new Response(JSON.stringify(antworten.shift()), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const r = await provider.generateJson<{ gefunden: boolean }>({ system: "s", user: "u", schema: { type: "object" }, schemaName: "naehrwerte_melden", websuche: 3 });
  assert.equal(r.gefunden, true);
  assert.equal(gesendet.length, 2);
  const tools = gesendet[0]!.tools as Array<Record<string, unknown>>;
  assert.deepEqual(tools[1], { type: "web_search_20260209", name: "web_search", max_uses: 3 });
  assert.deepEqual(gesendet[0]!.tool_choice, { type: "auto" });
  assert.equal((gesendet[1]!.messages as unknown[]).length, 2);
  assert.deepEqual(gemeldet, [1, 0]);
});
