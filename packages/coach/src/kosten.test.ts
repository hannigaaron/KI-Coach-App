import { test } from "node:test";
import assert from "node:assert/strict";
import { AnthropicProvider } from "./anthropic.js";
import {
  MODELL_PREISE, addiere, cacheQuote, dollarText, ersparnis, hochrechnung,
  kostenOhneCache, kostenVon, leereSumme, summiere,
} from "./kosten.js";
import { systemBloecke } from "./persona.js";
import type { Verbrauch } from "./provider.js";

function v(teile: Partial<Verbrauch> = {}): Verbrauch {
  return {
    inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
    modell: "claude-opus-5", ...teile,
  };
}

/* ---------- Der Prompt ist in einen festen und einen wechselnden Teil geschnitten ---------- */

const TEILE = {
  zeit: "Freitag 20:00",
  profil: "Aaron, 87 kg",
  tag: "1200 von 3000 kcal",
  gedächtnis: "Verträgt keine Laktose",
};

test("der feste Block ist zwischen zwei Nachrichten byteweise gleich", () => {
  // Das ist die ganze Bedingung fürs Zwischenspeichern. Ändert sich ein
  // einziges Byte im vorderen Teil, faellt der ganze Speicher weg.
  const a = systemBloecke({ ...TEILE, modus: "erfassen" })[0]!;
  const b = systemBloecke({
    ...TEILE, modus: "psyche", zeit: "Samstag 08:00", profil: "anders",
    tag: "andere Zahlen", gedächtnis: "anderes", eigeneAnweisungen: "sei knapp",
  })[0]!;
  assert.equal(a.text, b.text);
  assert.equal(a.cache, true);
});

test("der Modus steht im wechselnden Block, nicht im festen", () => {
  const fest = systemBloecke({ ...TEILE, modus: "psyche" })[0]!.text;
  const wechselnd = systemBloecke({ ...TEILE, modus: "psyche" })[1]!.text;
  assert.equal(fest.includes("Zuerst verstehen, dann erst etwas vorschlagen"), false);
  assert.ok(wechselnd.includes("Zuerst verstehen, dann erst etwas vorschlagen"));
});

test("genau ein Block trägt die Marke, und es ist der erste", () => {
  const bloecke = systemBloecke({ ...TEILE, modus: "coaching" });
  assert.equal(bloecke.filter((b) => b.cache).length, 1);
  assert.equal(bloecke[0]!.cache, true);
});

test("der feste Block ist gross genug, damit sich das Zwischenspeichern lohnt", () => {
  // Claude Opus 5 speichert erst ab 512 Token. Grob gerechnet mit 3,5 Zeichen
  // je Token braucht der Block also mindestens 1800 Zeichen.
  const fest = systemBloecke({ ...TEILE, modus: "erfassen" })[0]!.text;
  assert.ok(fest.length > 3000, `nur ${fest.length} Zeichen`);
});

test("die eigenen Anweisungen liegen hinter der Marke", () => {
  // Sonst wuerde jede Aenderung an ihnen den Speicher verwerfen.
  const bloecke = systemBloecke({ ...TEILE, modus: "standard", eigeneAnweisungen: "Frag nach meinem Schlaf." });
  assert.equal(bloecke[0]!.text.includes("Frag nach meinem Schlaf."), false);
  assert.ok(bloecke[1]!.text.includes("Frag nach meinem Schlaf."));
});

test("der Systemprompt geht als Blöcke mit Marke an die API", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return new Response(
        JSON.stringify({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  await provider.converse({
    system: systemBloecke({ ...TEILE, modus: "erfassen" }),
    messages: [{ role: "user", content: "hi" }],
    tools: [],
  });
  const system = gesendet.system as Array<Record<string, unknown>>;
  assert.equal(Array.isArray(system), true);
  assert.deepEqual(system[0]!.cache_control, { type: "ephemeral" });
  assert.equal(system[1]!.cache_control, undefined);
});

test("eine Zeichenkette bleibt eine Zeichenkette", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return new Response(
        JSON.stringify({ content: [], stop_reason: "end_turn" }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  await provider.converse({ system: "kurz", messages: [{ role: "user", content: "hi" }], tools: [] });
  assert.equal(gesendet.system, "kurz");
});

/* ---------- Der Verbrauch wird gemeldet ---------- */

test("der Verbrauch aus der Antwort wird gemeldet", async () => {
  const gemeldet: Verbrauch[] = [];
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-sonnet-5",
    onVerbrauch: (x) => gemeldet.push(x),
    fetchImpl: async () => new Response(
      JSON.stringify({
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        usage: {
          input_tokens: 400, output_tokens: 120,
          cache_read_input_tokens: 5000, cache_creation_input_tokens: 0,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  });
  const antwort = await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
  assert.equal(gemeldet.length, 1);
  assert.deepEqual(gemeldet[0], {
    inputTokens: 400, outputTokens: 120, cacheReadTokens: 5000,
    cacheWriteTokens: 0, modell: "claude-sonnet-5",
  });
  assert.deepEqual(antwort.verbrauch, gemeldet[0]);
});

test("eine Antwort ohne Verbrauchsangabe bricht nicht", async () => {
  const gemeldet: Verbrauch[] = [];
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5",
    onVerbrauch: (x) => gemeldet.push(x),
    fetchImpl: async () => new Response(
      JSON.stringify({ content: [], stop_reason: "end_turn" }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  });
  const antwort = await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
  assert.equal(antwort.verbrauch, undefined);
  assert.equal(gemeldet.length, 0);
});

/* ---------- Die Rechnung ---------- */

test("ohne Zwischenspeicher ist die Rechnung die einfache Formel", () => {
  // Eine Million Eingabetoken auf Opus 5 kosten 5 Dollar, eine Million
  // Ausgabetoken 25.
  assert.equal(kostenVon(v({ inputTokens: 1_000_000 })), 5);
  assert.equal(kostenVon(v({ outputTokens: 1_000_000 })), 25);
  assert.equal(kostenVon(v({ inputTokens: 1_000_000, outputTokens: 1_000_000 })), 30);
});

test("Lesen aus dem Zwischenspeicher kostet ein Zehntel", () => {
  assert.equal(kostenVon(v({ cacheReadTokens: 1_000_000 })), 0.5);
});

test("Schreiben in den Zwischenspeicher kostet das 1,25 fache", () => {
  assert.equal(kostenVon(v({ cacheWriteTokens: 1_000_000 })), 6.25);
});

test("ab dem zweiten Aufruf lohnt sich das Zwischenspeichern", () => {
  // Erster Aufruf schreibt, zweiter liest. Zusammen 1,25 plus 0,1 gegen 2,0.
  const mit = kostenVon(v({ cacheWriteTokens: 1_000_000 })) + kostenVon(v({ cacheReadTokens: 1_000_000 }));
  const ohne = kostenVon(v({ inputTokens: 1_000_000 })) * 2;
  assert.ok(mit < ohne, `mit ${mit}, ohne ${ohne}`);
  assert.equal(Math.round(mit * 100) / 100, 6.75);
  assert.equal(ohne, 10);
});

test("jedes Modell wird mit seinem eigenen Preis gerechnet", () => {
  for (const [modell, preis] of Object.entries(MODELL_PREISE)) {
    assert.equal(kostenVon(v({ inputTokens: 1_000_000, modell })), preis.input);
  }
});

test("ein unbekanntes Modell wird mit dem teuersten gerechnet", () => {
  // Lieber zu viel schätzen als eine Ueberraschung auf der Rechnung.
  assert.equal(kostenVon(v({ inputTokens: 1_000_000, modell: "gibt-es-nicht" })), 5);
});

test("der Vergleich ohne Zwischenspeicher zählt alle Eingaben voll", () => {
  const verbrauch = v({ inputTokens: 400, cacheReadTokens: 5000, cacheWriteTokens: 0, outputTokens: 200 });
  const ohne = kostenOhneCache(verbrauch);
  const mit = kostenVon(verbrauch);
  assert.ok(ohne > mit);
  assert.equal(ohne, (5400 * 5 + 200 * 25) / 1_000_000);
});

test("Summen zählen richtig zusammen", () => {
  let summe = leereSumme();
  summe = addiere(summe, v({ inputTokens: 100, outputTokens: 50 }));
  summe = addiere(summe, v({ inputTokens: 200, cacheReadTokens: 5000 }));
  assert.equal(summe.anfragen, 2);
  assert.equal(summe.inputTokens, 300);
  assert.equal(summe.cacheReadTokens, 5000);
  assert.ok(summe.dollar > 0);
});

test("die Quote zeigt, wie viel aus dem Zwischenspeicher kam", () => {
  const summe = addiere(leereSumme(), v({ inputTokens: 1000, cacheReadTokens: 9000 }));
  assert.equal(cacheQuote(summe), 0.9);
  assert.equal(cacheQuote(leereSumme()), 0);
});

test("die Ersparnis ist null, wenn nichts gecacht wurde", () => {
  const summe = addiere(leereSumme(), v({ inputTokens: 1000, outputTokens: 100 }));
  assert.equal(ersparnis(summe), 0);
});

test("die Ersparnis wird in Prozent ausgewiesen", () => {
  const summe = addiere(leereSumme(), v({ cacheReadTokens: 10_000, outputTokens: 0 }));
  // 0,1 statt 1,0 sind 90 Prozent weniger.
  assert.equal(Math.round(ersparnis(summe)), 90);
});

test("die Hochrechnung nennt, auf wie vielen Tagen sie beruht", () => {
  const tag = addiere(leereSumme(), v({ inputTokens: 1_000_000 }));
  const leer = leereSumme();
  const h = hochrechnung([tag, tag, leer]);
  assert.equal(h.tage, 2);
  assert.equal(h.dollarProMonat, 5 * 30);
  assert.deepEqual(hochrechnung([]), { dollarProMonat: 0, tage: 0 });
  assert.deepEqual(hochrechnung([leer]), { dollarProMonat: 0, tage: 0 });
});

test("mehrere Tage lassen sich summieren", () => {
  const tag = addiere(leereSumme(), v({ inputTokens: 100, outputTokens: 10 }));
  const gesamt = summiere([tag, tag, tag]);
  assert.equal(gesamt.anfragen, 3);
  assert.equal(gesamt.inputTokens, 300);
});

test("kleine Beträge werden in Cent geschrieben", () => {
  assert.equal(dollarText(0), "0");
  assert.equal(dollarText(0.0034), "0.34 Cent");
  assert.equal(dollarText(0.42), "42 Cent");
  assert.equal(dollarText(3.5), "3.50 Dollar");
});
