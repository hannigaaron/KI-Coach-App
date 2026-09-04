import type { ToolDefinition } from "./provider.js";

/**
 * Die Werkzeuge, die der Assistent im Gespräch benutzen darf.
 *
 * Sie sind bewusst eng geschnitten. Der Assistent soll Dinge tun können,
 * nicht über Dinge reden, die er tun könnte. Jede Beschreibung sagt auch,
 * wann das Werkzeug NICHT zu nehmen ist, weil Modelle sonst zu Werkzeugen
 * greifen, wo eine Antwort genügt.
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "mahlzeit_erfassen",
    description:
      "Trägt eine gegessene Mahlzeit ein und rechnet Kalorien und Makros aus. " +
      "Nur nehmen, wenn der Nutzer sagt, dass er etwas gegessen oder getrunken hat, das Kalorien liefert. " +
      "Nicht nehmen für Pläne oder Fragen wie was soll ich essen.",
    input_schema: {
      type: "object",
      properties: {
        beschreibung: {
          type: "string",
          description: "Was gegessen wurde, so wörtlich wie möglich, inklusive Mengen.",
        },
      },
      required: ["beschreibung"],
    },
  },
  {
    name: "wasser_eintragen",
    description: "Trägt getrunkenes Wasser in Millilitern ein. Ein Glas sind 250 ml, eine Flasche 500 ml.",
    input_schema: {
      type: "object",
      properties: { ml: { type: "number", description: "Menge in Millilitern, 1 bis 5000." } },
      required: ["ml"],
    },
  },
  {
    name: "tagesstand_abrufen",
    description:
      "Liefert die Zahlen von heute: Kalorien, Makros, Wasser, Restbudget, Trainingseinheiten. " +
      "Vor jeder Aussage über Zahlen aufrufen. Nie Zahlen schätzen.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "mahlzeit_vorschlagen",
    description:
      "Baut aus dem hinterlegten Vorrat und dem Restbudget eine passende Mahlzeit. " +
      "Nehmen, wenn der Nutzer fragt, was er essen soll oder was noch reinpasst.",
    input_schema: {
      type: "object",
      properties: {
        wunsch: { type: "string", description: "Optionale Vorgabe, etwa schnell, warm, viel Protein." },
      },
    },
  },
  {
    name: "checkin_speichern",
    description:
      "Hält Befinden fest: Energie, Schlafqualität, Stimmung, freie Notiz. " +
      "Nehmen, wenn der Nutzer erzählt, wie es ihm geht oder wie er geschlafen hat.",
    input_schema: {
      type: "object",
      properties: {
        energie: { type: "number", description: "1 bis 10, weglassen wenn unbekannt." },
        schlaf: { type: "number", description: "1 bis 10, weglassen wenn unbekannt." },
        stimmung: { type: "number", description: "1 bis 10, weglassen wenn unbekannt." },
        notiz: { type: "string", description: "Was der Nutzer gesagt hat, kurz gefasst." },
      },
      required: ["notiz"],
    },
  },
  {
    name: "merken",
    description:
      "Legt etwas dauerhaft im Gedächtnis ab. Nehmen für alles, was auch in vier Wochen noch gilt: " +
      "Unverträglichkeiten, Vorlieben, Ziele, Verletzungen, Lebensumstände, wiederkehrende Muster. " +
      "Nicht nehmen für den heutigen Tagesablauf, dafür gibt es die anderen Werkzeuge.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Die Aussage in einem Satz, aus Sicht des Coaches formuliert." },
        art: {
          type: "string",
          enum: ["fakt", "praeferenz", "ziel", "ereignis", "reflexion", "hinweis"],
          description: "Kategorie der Notiz.",
        },
        wichtigkeit: { type: "number", description: "1 bis 5. 5 nur für Dinge, die immer mitgedacht werden müssen." },
        schlagworte: { type: "array", items: { type: "string" }, description: "Wenige Stichworte zum Wiederfinden." },
      },
      required: ["text", "art", "wichtigkeit"],
    },
  },
  {
    name: "gedaechtnis_durchsuchen",
    description:
      "Sucht in frühreren Notizen. Nehmen, wenn der Nutzer sich auf etwas Früheres bezieht " +
      "oder wenn eine Antwort von seiner Vorgeschichte abhängt.",
    input_schema: {
      type: "object",
      properties: { frage: { type: "string", description: "Wonach gesucht wird." } },
      required: ["frage"],
    },
  },
];
