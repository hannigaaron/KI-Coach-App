import { test } from "node:test";
import assert from "node:assert/strict";
import { Coach } from "./skills.js";
import type { CoachProvider, JsonRequest } from "./provider.js";
import type { MacroTargets } from "@daevo/core";

const targets: MacroTargets = { kcal: 3000, proteinG: 139, fatG: 70, carbsG: 431, waterMl: 3050 };

class StubProvider implements CoachProvider {
  readonly name = "stub";
  available = true;
  lastRequest: JsonRequest | null = null;
  constructor(private readonly response: unknown, private readonly fail = false) {}
  async generateJson<T>(request: JsonRequest): Promise<T> {
    this.lastRequest = request;
    if (this.fail) throw new Error("Modell nicht erreichbar");
    return this.response as T;
  }
  async converse(): Promise<never> {
    throw new Error("in diesem Test nicht benutzt");
  }
}

class NoProvider implements CoachProvider {
  readonly name = "none";
  readonly available = false;
  async generateJson<T>(): Promise<T> {
    throw new Error("nicht verfügbar");
  }
  async converse(): Promise<never> {
    throw new Error("nicht verfügbar");
  }
}

test("nutzt das Modell, wenn es verfügbar ist", async () => {
  const provider = new StubProvider({
    entries: [{ name: "Skyr", quantity: "500 g", kcal: 315, proteinG: 55, fatG: 1, carbsG: 20 }],
    assumption: "",
    followUpQuestion: "",
  });
  const result = await new Coach(provider).parseMeal("500g Skyr");
  assert.equal(result.source, "model");
  assert.equal(result.entries[0]!.name, "Skyr");
});

test("fällt bei Modellfehler auf die Tabelle zurück", async () => {
  const provider = new StubProvider(null, true);
  const result = await new Coach(provider).parseMeal("200g Hähnchenbrust");
  assert.equal(result.source, "offline");
  assert.equal(result.entries[0]!.kcal, 240);
});

test("ohne API Key läuft alles offline", async () => {
  const result = await new Coach(new NoProvider()).parseMeal("3 Eier");
  assert.equal(result.source, "offline");
  assert.equal(result.entries.length, 1);
});

test("Modellantwort mit falschen Kalorien wird korrigiert", async () => {
  const provider = new StubProvider({
    entries: [{ name: "Reis", quantity: "150 g", kcal: 900, proteinG: 4, fatG: 0.5, carbsG: 42 }],
    assumption: "",
    followUpQuestion: "",
  });
  const result = await new Coach(provider).parseMeal("150g Reis");
  assert.equal(result.entries[0]!.kcal, 189);
  assert.equal(result.warnings.length, 1);
});

test("Vorschlag bekommt das Restbudget in den Prompt", async () => {
  const provider = new StubProvider({
    title: "Test",
    feasible: true,
    reason: "",
    ingredients: [],
    steps: [],
    prepMinutes: 10,
  });
  await new Coach(provider).suggestMeal({
    fridge: ["Eier", "Reis"],
    targets,
    consumed: [{ name: "Skyr", quantity: "500 g", kcal: 315, proteinG: 55, fatG: 1, carbsG: 20 }],
  });
  assert.match(provider.lastRequest!.user, /2685 kcal/);
});

test("Offline Vorschlag lehnt bei zu kleinem Restbudget ab", async () => {
  const result = await new Coach(new NoProvider()).suggestMeal({
    fridge: ["Eier"],
    targets,
    consumed: [{ name: "Pizza", quantity: "900 g", kcal: 2900, proteinG: 99, fatG: 90, carbsG: 297 }],
  });
  assert.equal(result.feasible, false);
  assert.equal(result.source, "offline");
});

test("Check-in nutzt ohne Modell den Fallbacktext", async () => {
  const message = await new Coach(new NoProvider()).checkInMessage({
    reminderKind: "hydration",
    fallback: "Trink was.",
    context: "",
  });
  assert.equal(message, "Trink was.");
});

test("Mahlzeit über den eigenen Server: Kontoschlüssel statt API Schlüssel", async () => {
  const { AnthropicProvider } = await import("./anthropic.js");
  let ziel = "";
  let kopf: Record<string, string> = {};
  const provider = new AnthropicProvider({
    apiKey: undefined,
    baseUrl: "https://worker.example",
    kontoToken: () => "konto-123",
    model: "claude-sonnet-5",
    fetchImpl: async (url, init) => {
      ziel = String(url);
      kopf = (init as RequestInit).headers as Record<string, string>;
      return new Response(JSON.stringify({
        content: [{ type: "tool_use", name: "mahlzeit_erfassen", input: {
          entries: [{ name: "Hafermilch", quantity: "600 ml", kcal: 264, proteinG: 6, fatG: 9, carbsG: 39 }],
        } }],
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const ergebnis = await new Coach(provider).parseMeal("600 ml Hafermilch");
  assert.equal(ziel, "https://worker.example/chat");
  assert.equal(kopf.authorization, "Bearer konto-123");
  assert.equal("x-api-key" in kopf, false);
  assert.equal(ergebnis.source, "model");
});

test("scheitert das Modell, kommt der Grund mit und kein Posten fällt still weg", async () => {
  const { AnthropicProvider } = await import("./anthropic.js");
  const provider = new AnthropicProvider({
    apiKey: undefined,
    baseUrl: "https://worker.example",
    model: "claude-sonnet-5",
    fetchImpl: async () => new Response('{"type":"konto"}', { status: 401 }),
  });
  const ergebnis = await new Coach(provider).parseMeal(
    "80 Gramm Instant Rice Pudding und 1 gehäuften Teelöffel Erdnussbutter",
  );
  assert.equal(ergebnis.source, "offline");
  assert.ok(ergebnis.modellFehler);
  assert.match(ergebnis.followUpQuestion, /Nicht eingetragen.*Rice Pudding/);
  assert.doesNotMatch(ergebnis.followUpQuestion, /Wie viel/);
});
