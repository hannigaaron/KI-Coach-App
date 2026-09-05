import { test } from "node:test";
import assert from "node:assert/strict";
import { AnthropicProvider } from "./anthropic.js";
import { MODELL_JE_MODUS, MODELL_OPTIONEN, MODELLE, modellFuer, modellFuerBilder } from "./modelle.js";
import { MODELL_PREISE } from "./kosten.js";
import type { Modus } from "./persona.js";

const ALLE_MODI: Modus[] = ["erfassen", "coaching", "psyche", "planung", "standard"];

test("jeder Modus hat ein Modell, und es ist eins, das es gibt", () => {
  for (const modus of ALLE_MODI) {
    const wahl = modellFuer(modus);
    assert.ok(MODELLE[wahl.id], `${modus} zeigt auf ein unbekanntes Modell`);
    assert.ok(MODELL_PREISE[wahl.id], `${modus}: für ${wahl.id} gibt es keinen Preis`);
  }
});

test("Erfassen läuft auf dem günstigsten Modell", () => {
  const erfassen = modellFuer("erfassen");
  const psyche = modellFuer("psyche");
  assert.ok(
    MODELL_PREISE[erfassen.id]!.input < MODELL_PREISE[psyche.id]!.input,
    "Eintragen darf nicht so viel kosten wie ein persönliches Gespräch",
  );
});

test("persönliche Themen und Planung bekommen das stärkste Modell", () => {
  const teuerste = Math.max(...Object.values(MODELL_PREISE).map((p) => p.input));
  for (const modus of ["psyche", "planung"] as const) {
    assert.equal(MODELL_PREISE[modellFuer(modus).id]!.input, teuerste, modus);
  }
});

test("Bilder laufen auf dem stärksten Modell", () => {
  const teuerste = Math.max(...Object.values(MODELL_PREISE).map((p) => p.input));
  assert.equal(MODELL_PREISE[modellFuerBilder().id]!.input, teuerste);
});

test("eine feste Wahl schlägt die Zuordnung", () => {
  for (const modus of ALLE_MODI) {
    assert.equal(modellFuer(modus, "claude-haiku-4-5").id, "claude-haiku-4-5", modus);
    assert.equal(modellFuer(modus, "claude-opus-5").id, "claude-opus-5", modus);
  }
  assert.equal(modellFuerBilder("claude-sonnet-5").id, "claude-sonnet-5");
});

test("eine unsinnige Wahl fällt auf die Zuordnung zurück", () => {
  for (const unsinn of ["gibt-es-nicht", "", "gpt-4"]) {
    assert.equal(modellFuer("psyche", unsinn).id, MODELL_JE_MODUS.psyche, unsinn);
  }
});

test("Haiku 4.5 ist als Modell ohne Denktiefe markiert", () => {
  // Haiku 4.5 lehnt output_config.effort mit einem Fehler ab. Steht das
  // Merkmal falsch, scheitert jede Erfassung mit einem 400.
  assert.equal(MODELLE["claude-haiku-4-5"]!.kannEffort, false);
  assert.equal(MODELLE["claude-opus-5"]!.kannEffort, true);
  assert.equal(MODELLE["claude-sonnet-5"]!.kannEffort, true);
});

test("ohne Denktiefe geht das Feld gar nicht erst mit", async () => {
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
  await provider.converse({
    system: "s", messages: [{ role: "user", content: "hi" }], tools: [],
    effort: "low", modell: "claude-haiku-4-5", ohneEffort: true,
  });
  assert.equal(gesendet.model, "claude-haiku-4-5");
  assert.equal("output_config" in gesendet, false, "Haiku bekommt kein output_config");
});

test("mit Denktiefe steht das Feld drin", async () => {
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
  await provider.converse({
    system: "s", messages: [{ role: "user", content: "hi" }], tools: [],
    effort: "high", modell: "claude-sonnet-5",
  });
  assert.equal(gesendet.model, "claude-sonnet-5");
  assert.deepEqual(gesendet.output_config, { effort: "high" });
});

test("der Verbrauch nennt das Modell, das wirklich lief", async () => {
  const gemeldet: string[] = [];
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5",
    onVerbrauch: (v) => gemeldet.push(v.modell),
    fetchImpl: async () => new Response(
      JSON.stringify({ content: [], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  });
  await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [], modell: "claude-haiku-4-5" });
  await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
  // Sonst wuerde die Kostenrechnung jede Nachricht mit dem Preis des
  // Rueckfallmodells verbuchen und waere um ein Vielfaches daneben.
  assert.deepEqual(gemeldet, ["claude-haiku-4-5", "claude-opus-5"]);
});

test("auch der Bildaufruf schickt sein eigenes Modell", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-haiku-4-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return new Response(
        JSON.stringify({ content: [{ type: "tool_use", name: "x", input: {} }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  await provider.generateJson({
    system: "s", user: "u", schema: { type: "object" }, schemaName: "x",
    modell: "claude-opus-5",
  });
  assert.equal(gesendet.model, "claude-opus-5");
});

test("die Auswahl im Profil deckt jedes bekannte Modell ab", () => {
  const werte = MODELL_OPTIONEN.map((o) => o.wert);
  assert.equal(werte[0], "auto", "automatisch muss oben stehen");
  for (const id of Object.keys(MODELLE)) {
    assert.ok(werte.includes(id), `${id} fehlt in der Auswahl`);
  }
  assert.equal(new Set(werte).size, werte.length);
});
