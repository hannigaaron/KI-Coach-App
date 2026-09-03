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
}

class NoProvider implements CoachProvider {
  readonly name = "none";
  readonly available = false;
  async generateJson<T>(): Promise<T> {
    throw new Error("nicht verfuegbar");
  }
}

test("nutzt das Modell, wenn es verfuegbar ist", async () => {
  const provider = new StubProvider({
    entries: [{ name: "Skyr", quantity: "500 g", kcal: 315, proteinG: 55, fatG: 1, carbsG: 20 }],
    assumption: "",
    followUpQuestion: "",
  });
  const result = await new Coach(provider).parseMeal("500g Skyr");
  assert.equal(result.source, "model");
  assert.equal(result.entries[0]!.name, "Skyr");
});

test("faellt bei Modellfehler auf die Tabelle zurueck", async () => {
  const provider = new StubProvider(null, true);
  const result = await new Coach(provider).parseMeal("200g Haehnchenbrust");
  assert.equal(result.source, "offline");
  assert.equal(result.entries[0]!.kcal, 240);
});

test("ohne API Key laeuft alles offline", async () => {
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
