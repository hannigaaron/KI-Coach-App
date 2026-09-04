import type { ToolDefinition } from "./provider.js";

/**
 * Die Werkzeuge, die der Assistent im Gespraech benutzen darf.
 *
 * Sie sind bewusst eng geschnitten. Der Assistent soll Dinge tun koennen,
 * nicht ueber Dinge reden, die er tun koennte. Jede Beschreibung sagt auch,
 * wann das Werkzeug NICHT zu nehmen ist, weil Modelle sonst zu Werkzeugen
 * greifen, wo eine Antwort genuegt.
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "mahlzeit_erfassen",
    description:
      "Traegt eine gegessene Mahlzeit ein und rechnet Kalorien und Makros aus. " +
      "Nur nehmen, wenn der Nutzer sagt, dass er etwas gegessen oder getrunken hat, das Kalorien liefert. " +
      "Nicht nehmen fuer Plaene oder Fragen wie was soll ich essen.",
    input_schema: {
      type: "object",
      properties: {
        beschreibung: {
          type: "string",
          description: "Was gegessen wurde, so woertlich wie moeglich, inklusive Mengen.",
        },
      },
      required: ["beschreibung"],
    },
  },
  {
    name: "wasser_eintragen",
    description: "Traegt getrunkenes Wasser in Millilitern ein. Ein Glas sind 250 ml, eine Flasche 500 ml.",
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
      "Vor jeder Aussage ueber Zahlen aufrufen. Nie Zahlen schaetzen.",
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
      "Haelt Befinden fest: Energie, Schlafqualitaet, Stimmung, freie Notiz. " +
      "Nehmen, wenn der Nutzer erzaehlt, wie es ihm geht oder wie er geschlafen hat.",
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
      "Legt etwas dauerhaft im Gedaechtnis ab. Nehmen fuer alles, was auch in vier Wochen noch gilt: " +
      "Unvertraeglichkeiten, Vorlieben, Ziele, Verletzungen, Lebensumstaende, wiederkehrende Muster. " +
      "Nicht nehmen fuer den heutigen Tagesablauf, dafuer gibt es die anderen Werkzeuge.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Die Aussage in einem Satz, aus Sicht des Coaches formuliert." },
        art: {
          type: "string",
          enum: ["fakt", "praeferenz", "ziel", "ereignis", "reflexion", "hinweis"],
          description: "Kategorie der Notiz.",
        },
        wichtigkeit: { type: "number", description: "1 bis 5. 5 nur fuer Dinge, die immer mitgedacht werden muessen." },
        schlagworte: { type: "array", items: { type: "string" }, description: "Wenige Stichworte zum Wiederfinden." },
      },
      required: ["text", "art", "wichtigkeit"],
    },
  },
  {
    name: "gedaechtnis_durchsuchen",
    description:
      "Sucht in fruehreren Notizen. Nehmen, wenn der Nutzer sich auf etwas Frueheres bezieht " +
      "oder wenn eine Antwort von seiner Vorgeschichte abhaengt.",
    input_schema: {
      type: "object",
      properties: { frage: { type: "string", description: "Wonach gesucht wird." } },
      required: ["frage"],
    },
  },
];
