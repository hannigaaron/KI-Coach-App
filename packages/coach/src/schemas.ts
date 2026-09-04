export const MEAL_SCHEMA = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Lebensmittel auf Deutsch" },
          quantity: { type: "string", description: "Menge inklusive Einheit, zum Beispiel 200 g" },
          kcal: { type: "number" },
          proteinG: { type: "number" },
          fatG: { type: "number" },
          carbsG: { type: "number" },
        },
        required: ["name", "quantity", "kcal", "proteinG", "fatG", "carbsG"],
      },
    },
    assumption: { type: "string", description: "Welche Mengen wurden geschätzt. Leer lassen, wenn nichts geschätzt wurde." },
    followUpQuestion: { type: "string", description: "Rückfrage an den Nutzer oder leer." },
  },
  required: ["entries", "assumption", "followUpQuestion"],
} as const;

export const SUGGESTION_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    feasible: { type: "boolean", description: "Falsch, wenn Zutaten oder Budget nicht reichen." },
    reason: { type: "string", description: "Begründung, falls feasible falsch ist." },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          kcal: { type: "number" },
          proteinG: { type: "number" },
          fatG: { type: "number" },
          carbsG: { type: "number" },
        },
        required: ["name", "quantity", "kcal", "proteinG", "fatG", "carbsG"],
      },
    },
    steps: { type: "array", items: { type: "string" } },
    prepMinutes: { type: "number" },
  },
  required: ["title", "feasible", "reason", "ingredients", "steps", "prepMinutes"],
} as const;

export const MESSAGE_SCHEMA = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
} as const;
