import type { FoodEntry, MacroTargets } from "@daevo/core";
import { remainingBudget, sumEntries, type RemainingBudget } from "@daevo/core";
import { parseMealOffline } from "./parse-offline.js";
import { CHECKIN_SYSTEM, MEAL_PARSE_SYSTEM, MEAL_SUGGEST_SYSTEM } from "./prompts.js";
import { MEAL_SCHEMA, MESSAGE_SCHEMA, SUGGESTION_SCHEMA } from "./schemas.js";
import type { CoachProvider } from "./provider.js";
import { validateEntries } from "./validate.js";

/**
 * Debugausgabe. Der Zugriff auf process wird abgesichert, weil dieses Modul
 * auch im Browser läuft, wo es kein process Objekt gibt.
 */
function debugLog(message: string, error: unknown): void {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  if (env?.COACH_DEBUG) console.error(message, error);
}

export interface MealParseResult {
  entries: FoodEntry[];
  assumption: string;
  followUpQuestion: string;
  warnings: string[];
  source: "model" | "offline";
}

export interface MealSuggestion {
  title: string;
  feasible: boolean;
  reason: string;
  ingredients: FoodEntry[];
  steps: string[];
  prepMinutes: number;
  source: "model" | "offline";
}

export class Coach {
  constructor(private readonly provider: CoachProvider) {}

  /** Wandelt freien Text in Nährwerte um. Fällt ohne Modell auf die Tabelle zurück. */
  async parseMeal(text: string): Promise<MealParseResult> {
    if (this.provider.available) {
      try {
        const raw = await this.provider.generateJson<{
          entries: unknown;
          assumption?: string;
          followUpQuestion?: string;
        }>({
          system: MEAL_PARSE_SYSTEM,
          user: `Mahlzeit des Nutzers:\n${text}`,
          schema: MEAL_SCHEMA as unknown as Record<string, unknown>,
          schemaName: "mahlzeit_erfassen",
        });
        const validated = validateEntries(raw.entries);
        if (validated.entries.length > 0) {
          return {
            entries: validated.entries,
            assumption: raw.assumption ?? "",
            followUpQuestion: raw.followUpQuestion ?? "",
            warnings: validated.warnings,
            source: "model",
          };
        }
      } catch (error) {
        // Fallback unten. Der Fehler wird vom Aufrufer geloggt.
        debugLog("parseMeal Modellfehler", error);
      }
    }

    const offline = parseMealOffline(text);
    return {
      entries: offline.entries,
      assumption: "Werte stammen aus der internen Referenztabelle, nicht aus einer Nährwertdatenbank.",
      followUpQuestion: offline.unresolved.length
        ? `Das konnte ich nicht zuordnen: ${offline.unresolved.join(", ")}. Wie viel war das ungefähr?`
        : "",
      warnings: [],
      source: "offline",
    };
  }

  /** Baut aus Kühlschrankinhalt und Restbudget eine Mahlzeit. */
  async suggestMeal(params: {
    fridge: string[];
    targets: MacroTargets;
    consumed: FoodEntry[];
    waterMl?: number;
  }): Promise<MealSuggestion> {
    const totals = sumEntries(params.consumed, params.waterMl ?? 0);
    const remaining = remainingBudget(totals, params.targets);

    if (this.provider.available) {
      try {
        const raw = await this.provider.generateJson<{
          title: string;
          feasible: boolean;
          reason: string;
          ingredients: unknown;
          steps: string[];
          prepMinutes: number;
        }>({
          system: MEAL_SUGGEST_SYSTEM,
          user: buildSuggestionPrompt(params.fridge, remaining),
          schema: SUGGESTION_SCHEMA as unknown as Record<string, unknown>,
          schemaName: "mahlzeit_vorschlagen",
        });
        const validated = validateEntries(raw.ingredients);
        return {
          title: raw.title,
          feasible: Boolean(raw.feasible),
          reason: raw.reason ?? "",
          ingredients: validated.entries,
          steps: Array.isArray(raw.steps) ? raw.steps : [],
          prepMinutes: Number.isFinite(raw.prepMinutes) ? raw.prepMinutes : 0,
          source: "model",
        };
      } catch (error) {
        debugLog("suggestMeal Modellfehler", error);
      }
    }

    return offlineSuggestion(params.fridge, remaining);
  }

  /** Erzeugt die Check-in Nachricht für eine Erinnerung. */
  async checkInMessage(params: {
    reminderKind: string;
    fallback: string;
    context: string;
  }): Promise<string> {
    if (!this.provider.available) return params.fallback;
    try {
      const raw = await this.provider.generateJson<{ message: string }>({
        system: CHECKIN_SYSTEM,
        user: `Art der Erinnerung: ${params.reminderKind}\nStand des Tages:\n${params.context}`,
        schema: MESSAGE_SCHEMA as unknown as Record<string, unknown>,
        schemaName: "checkin_nachricht",
        maxTokens: 300,
      });
      return raw.message?.trim() || params.fallback;
    } catch (error) {
      debugLog("checkInMessage Modellfehler", error);
      return params.fallback;
    }
  }
}

function buildSuggestionPrompt(fridge: string[], remaining: RemainingBudget): string {
  return [
    `Vorhandene Zutaten: ${fridge.join(", ") || "keine genannt"}`,
    "Restbudget für heute:",
    `- Kalorien: ${remaining.kcal} kcal`,
    `- Protein: ${remaining.proteinG} g`,
    `- Fett: ${remaining.fatG} g`,
    `- Kohlenhydrate: ${remaining.carbsG} g`,
    "Baue daraus eine Mahlzeit. Halte das Restbudget ein, Abweichung höchstens zehn Prozent.",
  ].join("\n");
}

/**
 * Offline Vorschlag ohne Modell. Bewusst simpel: er kombiniert keine Rezepte,
 * sondern nennt die vorhandenen Zutaten und das Restbudget, damit der Nutzer
 * selbst entscheiden kann. Alles andere wäre geraten.
 */
function offlineSuggestion(fridge: string[], remaining: RemainingBudget): MealSuggestion {
  const feasible = remaining.kcal >= 250 && fridge.length > 0;
  return {
    title: feasible ? "Vorschlag aus deinen Zutaten" : "Kein Vorschlag möglich",
    feasible,
    reason: feasible
      ? "Ohne Modellzugriff nenne ich dir nur den Rahmen. Die Kombination wäre sonst geraten."
      : remaining.kcal < 250
        ? `Dein Restbudget liegt bei ${remaining.kcal} kcal. Das reicht für keine volle Mahlzeit.`
        : "Du hast keine Zutaten genannt.",
    ingredients: [],
    steps: feasible
      ? [
          `Du hast noch ${remaining.kcal} kcal und ${remaining.proteinG} g Protein offen.`,
          `Nimm eine Proteinqülle aus deinem Vorrat: ${fridge.join(", ")}.`,
          "Ergänze eine Kohlenhydratqülle und Gemüse.",
        ]
      : [],
    prepMinutes: 0,
    source: "offline",
  };
}
