import { test } from "node:test";
import assert from "node:assert/strict";
import { AnthropicProvider } from "./anthropic.js";
import { MODELL_JE_MODUS, MODELL_OPTIONEN, MODELLE, aktuellesModell, modellFuer, modellFuerBilder } from "./modelle.js";
import { MODELL_PREISE } from "./kosten.js";
import { modellFuerTempo, tiefeAnheben } from "./agent.js";
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

// Verglichen wird unter den Modellen, die die App heute benutzt. Die
// Preistabelle führt auch die Generation davor, und Opus 5 war teurer als
// Opus 5.5, ohne das stärkere Modell zu sein.
const AKTUELL = Object.keys(MODELLE).map((id) => MODELL_PREISE[id]!.input);

test("persönliche Themen und Planung bekommen das stärkste Modell", () => {
  const teuerste = Math.max(...AKTUELL);
  for (const modus of ["psyche", "planung"] as const) {
    assert.equal(MODELL_PREISE[modellFuer(modus).id]!.input, teuerste, modus);
  }
});

test("Bilder laufen auf dem stärksten Modell", () => {
  const teuerste = Math.max(...AKTUELL);
  assert.equal(MODELL_PREISE[modellFuerBilder().id]!.input, teuerste);
});

test("eine feste Wahl schlägt die Zuordnung", () => {
  for (const modus of ALLE_MODI) {
    assert.equal(modellFuer(modus, "claude-haiku-5-5").id, "claude-haiku-5-5", modus);
    assert.equal(modellFuer(modus, "claude-opus-5-5").id, "claude-opus-5-5", modus);
  }
  assert.equal(modellFuerBilder("claude-sonnet-5-5").id, "claude-sonnet-5-5");
});

test("eine unsinnige Wahl fällt auf die Zuordnung zurück", () => {
  for (const unsinn of ["gibt-es-nicht", "", "gpt-4"]) {
    assert.equal(modellFuer("psyche", unsinn).id, MODELL_JE_MODUS.psyche, unsinn);
  }
});

test("eine gespeicherte Wahl aus der Generation davor geht auf den Nachfolger", () => {
  // Wer "Immer Opus 5" gewählt hatte, behält nach dem Update seine Wahl,
  // statt still auf Automatisch zu fallen.
  assert.equal(modellFuer("erfassen", "claude-opus-5").id, "claude-opus-5-5");
  assert.equal(modellFuer("psyche", "claude-haiku-4-5").id, "claude-haiku-5-5");
  assert.equal(modellFuerBilder("claude-sonnet-5").id, "claude-sonnet-5-5");
  assert.equal(aktuellesModell("gibt-es-nicht"), "gibt-es-nicht");
});

test("ein altes Rückfallmodell geht unter neuer Kennung raus", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return new Response(JSON.stringify({ content: [], stop_reason: "end_turn" }), { status: 200 });
    },
  });
  await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
  assert.equal(gesendet.model, "claude-opus-5-5");
});

test("nur Haiku 5.5 bekommt ein erzwungenes Werkzeug", async () => {
  // Opus 5.5 und Sonnet 5.5 antworten auf tool_choice tool mit 400, gemessen
  // am Worker. Steht das Merkmal falsch, scheitert jedes Foto.
  for (const [id, erzwungen] of [["claude-opus-5-5", false], ["claude-sonnet-5-5", false], ["claude-haiku-5-5", true]] as const) {
    let gesendet: Record<string, unknown> = {};
    const provider = new AnthropicProvider({
      apiKey: "sk-test",
      model: id,
      fetchImpl: async (_url, init) => {
        gesendet = JSON.parse(String((init as RequestInit).body));
        return new Response(JSON.stringify({ content: [{ type: "tool_use", name: "x", input: { a: 1 } }] }), { status: 200 });
      },
    });
    const ergebnis = await provider.generateJson<{ a: number }>({ system: "s", user: "u", schema: { type: "object" }, schemaName: "x" });
    assert.equal(ergebnis.a, 1);
    const wahl = gesendet.tool_choice as { type: string };
    assert.equal(wahl.type, erzwungen ? "tool" : "auto", id);
    const system = (gesendet.system as Array<{ text: string }>)[0]!.text;
    assert.equal(system.includes("Werkzeug x"), !erzwungen, `${id}: Pflicht im Prompt`);
    assert.ok(gesendet.output_config, `${id}: Denktiefe steht drin`);
  }
});

test("ohne Werkzeugaufruf in der Antwort scheitert der Aufruf laut", async () => {
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5-5",
    fetchImpl: async () => new Response(JSON.stringify({ content: [{ type: "text", text: "hier" }], stop_reason: "end_turn" }), { status: 200 }),
  });
  await assert.rejects(provider.generateJson({ system: "s", user: "u", schema: { type: "object" }, schemaName: "x" }), /Tool Call/);
});

test("ohne Denktiefe geht das Feld gar nicht erst mit", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5-5",
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
    effort: "low", modell: "claude-haiku-5-5", ohneEffort: true,
  });
  assert.equal(gesendet.model, "claude-haiku-5-5");
  assert.equal("output_config" in gesendet, false, "ohneEffort lässt das Feld weg");
});

test("mit Denktiefe steht das Feld drin", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5-5",
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
    effort: "high", modell: "claude-sonnet-5-5",
  });
  assert.equal(gesendet.model, "claude-sonnet-5-5");
  assert.deepEqual(gesendet.output_config, { effort: "high" });
});

test("der Verbrauch nennt das Modell, das wirklich lief", async () => {
  const gemeldet: string[] = [];
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5-5",
    onVerbrauch: (v) => gemeldet.push(v.modell),
    fetchImpl: async () => new Response(
      JSON.stringify({ content: [], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  });
  await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [], modell: "claude-haiku-5-5" });
  await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
  // Sonst wuerde die Kostenrechnung jede Nachricht mit dem Preis des
  // Rueckfallmodells verbuchen und waere um ein Vielfaches daneben.
  assert.deepEqual(gemeldet, ["claude-haiku-5-5", "claude-opus-5-5"]);
});

test("auch der Bildaufruf schickt sein eigenes Modell", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-haiku-5-5",
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
    modell: "claude-opus-5-5",
  });
  assert.equal(gesendet.model, "claude-opus-5-5");
});

test("die Auswahl im Profil deckt jedes bekannte Modell ab", () => {
  const werte = MODELL_OPTIONEN.map((o) => o.wert);
  assert.equal(werte[0], "auto", "automatisch muss oben stehen");
  for (const id of Object.keys(MODELLE)) {
    assert.ok(werte.includes(id), `${id} fehlt in der Auswahl`);
  }
  assert.equal(new Set(werte).size, werte.length);
});

/* ---------- Tempo ---------- */

test("schnell deckelt die Denktiefe, gründlich hebt sie an", () => {
  const planung = { effort: "high", maxTokens: 8192, modus: "planung" } as const;
  assert.equal(tiefeAnheben(planung, "schnell").effort, "medium");
  assert.equal(tiefeAnheben(planung, "normal").effort, "high");
  assert.equal(tiefeAnheben(planung, "gruendlich").effort, "high");

  const erfassen = { effort: "low", maxTokens: 2048, modus: "erfassen" } as const;
  // Schnell macht aus niedrig nicht noch weniger, es gibt nichts darunter.
  assert.equal(tiefeAnheben(erfassen, "schnell").effort, "low");
  assert.equal(tiefeAnheben(erfassen, "gruendlich").effort, "high");
});

test("bei Scham und Schuld gilt schnell nicht", () => {
  // Der eine Ort, an dem die App die Einstellung des Nutzers überstimmt. Eine
  // hingeworfene Antwort auf so etwas ist schlimmer als eine langsame.
  const psyche = { effort: "high", maxTokens: 8192, modus: "psyche" } as const;
  assert.equal(tiefeAnheben(psyche, "schnell").effort, "high");
  assert.equal(tiefeAnheben(psyche, "schnell").maxTokens, 8192);
});

test("eine gespeicherte Einstellung aus der alten Fassung gilt weiter", () => {
  // Vorher war es ein Wahrheitswert. Aus false darf nicht plötzlich schnell
  // werden, sonst läuft die App nach einem Update auf Sparflamme.
  const t = { effort: "medium", maxTokens: 4096, modus: "coaching" } as const;
  assert.equal(tiefeAnheben(t, false).effort, "medium");
  assert.equal(tiefeAnheben(t, true).effort, "high");
});

test("schnell schickt Planung auf Sonnet, Psyche bleibt auf Opus", () => {
  assert.equal(modellFuerTempo("planung", "schnell"), "claude-sonnet-5-5");
  assert.equal(modellFuerTempo("psyche", "schnell"), null);
  // Ohne schnell ändert sich nichts an der Tabelle.
  assert.equal(modellFuerTempo("planung", "normal"), null);
  assert.equal(modellFuerTempo("planung", "gruendlich"), null);
});
