import { test } from "node:test";
import assert from "node:assert/strict";
import { AnthropicProvider } from "./anthropic.js";
import type { Verbrauch } from "./provider.js";

/**
 * Das Streamen der Antwort.
 *
 * Geprüft wird gegen einen nachgebauten Datenstrom, nicht gegen die echte API.
 * Was hier zählt: die Blöcke kommen vollständig wieder zusammen, der Text
 * erreicht die Oberfläche in Stücken, und der Verbrauch wird trotzdem gemeldet.
 */

function sse(zeilen: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      // Absichtlich in kleine Häppchen zerlegt, quer über die Ereignisgrenzen.
      const text = zeilen.join("");
      for (let i = 0; i < text.length; i += 7) {
        controller.enqueue(encoder.encode(text.slice(i, i + 7)));
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function ereignis(daten: unknown): string {
  return `event: x\ndata: ${JSON.stringify(daten)}\n\n`;
}

const TEXT_STROM = [
  ereignis({ type: "message_start", message: { usage: { input_tokens: 12, cache_read_input_tokens: 5000 } } }),
  ereignis({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }),
  ereignis({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Zwei Eier" } }),
  ereignis({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: " sind drin." } }),
  ereignis({ type: "content_block_stop", index: 0 }),
  ereignis({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 9 } }),
  ereignis({ type: "message_stop" }),
];

function anbieter(zeilen: string[], onVerbrauch?: (v: Verbrauch) => void): AnthropicProvider {
  return new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-sonnet-5",
    onVerbrauch,
    fetchImpl: async () => sse(zeilen),
  });
}

test("der Text kommt in Stücken an und ergibt am Ende die ganze Antwort", async () => {
  const stuecke: string[] = [];
  const antwort = await anbieter(TEXT_STROM).converse({
    system: "s",
    messages: [{ role: "user", content: "hi" }],
    tools: [],
    onText: (s) => stuecke.push(s),
  });
  assert.deepEqual(stuecke, ["Zwei Eier", " sind drin."]);
  assert.deepEqual(antwort.content, [{ type: "text", text: "Zwei Eier sind drin." }]);
  assert.equal(antwort.stopReason, "end_turn");
});

test("der Verbrauch wird auch beim Streamen gemeldet", async () => {
  const gemeldet: Verbrauch[] = [];
  await anbieter(TEXT_STROM, (v) => gemeldet.push(v)).converse({
    system: "s",
    messages: [{ role: "user", content: "hi" }],
    tools: [],
    onText: () => {},
  });
  assert.equal(gemeldet.length, 1);
  assert.deepEqual(gemeldet[0], {
    inputTokens: 12, outputTokens: 9, cacheReadTokens: 5000,
    cacheWriteTokens: 0, modell: "claude-sonnet-5",
  });
});

test("ein Werkzeugaufruf wird aus den Teilstücken wieder zusammengesetzt", async () => {
  const zeilen = [
    ereignis({ type: "message_start", message: { usage: { input_tokens: 10 } } }),
    ereignis({ type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t1", name: "wasser_eintragen", input: {} } }),
    ereignis({ type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"ml"' } }),
    ereignis({ type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: ": 500}" } }),
    ereignis({ type: "content_block_stop", index: 0 }),
    ereignis({ type: "message_delta", delta: { stop_reason: "tool_use" }, usage: { output_tokens: 4 } }),
  ];
  const antwort = await anbieter(zeilen).converse({
    system: "s", messages: [{ role: "user", content: "hi" }], tools: [], onText: () => {},
  });
  assert.equal(antwort.stopReason, "tool_use");
  assert.deepEqual(antwort.content, [{ type: "tool_use", id: "t1", name: "wasser_eintragen", input: { ml: 500 } }]);
});

test("kaputtes JSON im Werkzeugaufruf kippt nicht die ganze Antwort", async () => {
  const zeilen = [
    ereignis({ type: "content_block_start", index: 0, content_block: { type: "tool_use", id: "t1", name: "wasser_eintragen", input: {} } }),
    ereignis({ type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"ml": 5' } }),
    ereignis({ type: "content_block_stop", index: 0 }),
    ereignis({ type: "message_delta", delta: { stop_reason: "tool_use" } }),
  ];
  const antwort = await anbieter(zeilen).converse({
    system: "s", messages: [{ role: "user", content: "hi" }], tools: [], onText: () => {},
  });
  assert.deepEqual(antwort.content, [{ type: "tool_use", id: "t1", name: "wasser_eintragen", input: {} }]);
});

test("ohne onText läuft der Aufruf wie bisher in einem Stück", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-sonnet-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  const antwort = await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
  assert.equal(gesendet.stream, undefined);
  assert.equal(antwort.content.length, 1);
});

test("mit onText wird stream gesetzt", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-sonnet-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return sse(TEXT_STROM);
    },
  });
  await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [], onText: () => {} });
  assert.equal(gesendet.stream, true);
});
