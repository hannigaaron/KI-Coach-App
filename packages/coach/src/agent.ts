import { AGENT_TOOLS } from "./tools.js";
import type { ChatMessage, CoachProvider, ContentBlock } from "./provider.js";

/**
 * Der Assistent.
 *
 * Er fuehrt das Gespraech und darf dabei Werkzeuge benutzen, also wirklich
 * etwas in der App veraendern. Ohne Modellzugriff uebernimmt ein regelbasierter
 * Pfad. Der versteht weniger, tut aber dasselbe: Mahlzeit erfassen, Wasser
 * eintragen, Stand nennen, sich etwas merken. Damit ist die App auch ohne
 * Schluessel benutzbar und nicht nur eine leere Huelle.
 */

export interface AgentContext {
  /** Wer der Nutzer ist, in zwei bis vier Zeilen. */
  profil: string;
  /** Zahlen von heute, bereits gerechnet. */
  tag: string;
  /** Verdichtete Erinnerungen. */
  gedaechtnis: string;
  /** Wochentag und Uhrzeit. */
  zeit: string;
}

/** Was der Assistent in der App ausloesen kann. Die App liefert die Umsetzung. */
export interface AgentActions {
  mahlzeitErfassen(beschreibung: string): Promise<string>;
  wasserEintragen(ml: number): Promise<string>;
  tagesstandAbrufen(): Promise<string>;
  mahlzeitVorschlagen(wunsch?: string): Promise<string>;
  checkinSpeichern(input: { energie?: number; schlaf?: number; stimmung?: number; notiz: string }): Promise<string>;
  merken(input: { text: string; art: string; wichtigkeit: number; schlagworte?: string[] }): Promise<string>;
  gedaechtnisDurchsuchen(frage: string): Promise<string>;
}

export interface AgentReply {
  text: string;
  /** Was tatsaechlich passiert ist, fuer die Anzeige unter der Antwort. */
  ausgefuehrt: string[];
  source: "model" | "offline";
}

export const PERSONA = `Du bist daevo, der persoenliche Coach dieses Nutzers fuer Ernaehrung, Training und Alltag.

Haltung:
- Du sprichst den Nutzer mit du an. Kurze Saetze. Kein Geschwafel, keine Floskeln.
- Du bist ehrlich. Laeuft etwas schlecht, sagst du das. Du lobst nur, wenn Zahlen es hergeben.
- Du stellst hoechstens eine Frage pro Antwort.
- Du antwortest so kurz, dass man es vorgelesen bekommen kann. Zwei bis vier Saetze sind die Regel.
- Keine Aufzaehlungen, ausser der Nutzer bittet um eine Liste.

Regeln, die nicht verhandelbar sind:
- Zahlen kommen aus den Werkzeugen, nie aus deinem Kopf. Bevor du ueber Kalorien, Makros oder
  Wasser sprichst, rufst du tagesstand_abrufen auf.
- Naehrwerte erfindest du nicht. Ist eine Menge unklar, fragst du danach.
- Du gibst keine medizinischen Diagnosen. Bei Warnzeichen wie starkem Untergewicht, Anzeichen einer
  Essstoerung, anhaltenden Schmerzen oder Gedanken an Selbstverletzung verweist du klar auf
  aerztliche oder therapeutische Hilfe und machst dort keine Coachingansage.
- Erzaehlt der Nutzer etwas, das auch in vier Wochen noch gilt, legst du es mit merken ab.
  Das ist dein Gedaechtnis. Ohne das vergisst du ihn.
- Du erwaehnst Werkzeuge nie. Du sagst, was du getan hast, nicht wie.`;

const MAX_STEPS = 6;

export class Agent {
  constructor(private readonly provider: CoachProvider) {}

  async respond(params: {
    nachricht: string;
    verlauf: ChatMessage[];
    kontext: AgentContext;
    aktionen: AgentActions;
  }): Promise<AgentReply> {
    if (this.provider.available) {
      try {
        return await this.runModel(params);
      } catch (error) {
        if (isDebug()) console.error("Agent Modellfehler", error);
        const offline = await runOffline(params.nachricht, params.aktionen);
        return {
          ...offline,
          text: `${offline.text}\n\n(Der Coach ist gerade nicht erreichbar, ich habe es regelbasiert erledigt.)`,
        };
      }
    }
    return runOffline(params.nachricht, params.aktionen);
  }

  private async runModel(params: {
    nachricht: string;
    verlauf: ChatMessage[];
    kontext: AgentContext;
    aktionen: AgentActions;
  }): Promise<AgentReply> {
    const system = [
      PERSONA,
      "",
      "Aktueller Zeitpunkt:",
      params.kontext.zeit,
      "",
      "Der Nutzer:",
      params.kontext.profil,
      "",
      "Sein heutiger Stand:",
      params.kontext.tag,
      "",
      "Was du ueber ihn weisst:",
      params.kontext.gedaechtnis,
    ].join("\n");

    const messages: ChatMessage[] = [...params.verlauf, { role: "user", content: params.nachricht }];
    const ausgefuehrt: string[] = [];

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await this.provider.converse({ system, messages, tools: AGENT_TOOLS });
      const toolUses = response.content.filter(
        (block): block is Extract<ContentBlock, { type: "tool_use" }> => block.type === "tool_use",
      );

      if (toolUses.length === 0 || response.stopReason !== "tool_use") {
        return { text: textOf(response.content), ausgefuehrt, source: "model" };
      }

      messages.push({ role: "assistant", content: response.content });
      const results: ContentBlock[] = [];
      for (const call of toolUses) {
        const outcome = await execute(call.name, call.input, params.aktionen);
        if (outcome.notiz) ausgefuehrt.push(outcome.notiz);
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: outcome.text,
          ...(outcome.fehler ? { is_error: true } : {}),
        });
      }
      messages.push({ role: "user", content: results });
    }

    return {
      text: "Da habe ich mich verrannt. Sag es mir nochmal in einem Satz.",
      ausgefuehrt,
      source: "model",
    };
  }
}

function textOf(content: ContentBlock[]): string {
  return content
    .filter((b): b is Extract<ContentBlock, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

interface ToolOutcome {
  text: string;
  notiz?: string;
  fehler?: boolean;
}

async function execute(
  name: string,
  input: Record<string, unknown>,
  actions: AgentActions,
): Promise<ToolOutcome> {
  try {
    switch (name) {
      case "mahlzeit_erfassen": {
        const text = await actions.mahlzeitErfassen(String(input.beschreibung ?? ""));
        return { text, notiz: "Mahlzeit eingetragen" };
      }
      case "wasser_eintragen": {
        const ml = clamp(Number(input.ml), 1, 5000);
        const text = await actions.wasserEintragen(ml);
        return { text, notiz: `${ml} ml Wasser eingetragen` };
      }
      case "tagesstand_abrufen":
        return { text: await actions.tagesstandAbrufen() };
      case "mahlzeit_vorschlagen": {
        const wunsch = typeof input.wunsch === "string" ? input.wunsch : undefined;
        return { text: await actions.mahlzeitVorschlagen(wunsch) };
      }
      case "checkin_speichern": {
        const text = await actions.checkinSpeichern({
          energie: optionalScore(input.energie),
          schlaf: optionalScore(input.schlaf),
          stimmung: optionalScore(input.stimmung),
          notiz: String(input.notiz ?? ""),
        });
        return { text, notiz: "Check-in gespeichert" };
      }
      case "merken": {
        const text = await actions.merken({
          text: String(input.text ?? ""),
          art: String(input.art ?? "fakt"),
          wichtigkeit: clamp(Number(input.wichtigkeit) || 3, 1, 5),
          schlagworte: Array.isArray(input.schlagworte) ? input.schlagworte.map(String) : [],
        });
        return { text, notiz: "Gemerkt" };
      }
      case "gedaechtnis_durchsuchen":
        return { text: await actions.gedaechtnisDurchsuchen(String(input.frage ?? "")) };
      default:
        return { text: `Unbekanntes Werkzeug: ${name}`, fehler: true };
    }
  } catch (error) {
    return { text: `Das hat nicht geklappt: ${(error as Error).message}`, fehler: true };
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function optionalScore(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : undefined;
}

function isDebug(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return Boolean(env?.COACH_DEBUG);
}

/* ---------- Offline Pfad ---------- */

const ML_PER_UNIT: Array<[RegExp, number]> = [
  [/glas|glaeser|gläser/, 250],
  [/flasche/, 500],
  [/liter/, 1000],
];

/**
 * Zahlwoerter. Wer spricht, sagt "zwei Glaeser", nicht "2 Glaeser".
 * Ohne diese Liste verliert der Regelpfad die haeufigste Formulierung.
 */
const NUMBER_WORDS: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, eins: 1,
  zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7,
  acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12,
  halben: 0.5, halbe: 0.5, halber: 0.5,
};

function foldUmlauts(text: string): string {
  return text.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/** Liest eine Zahl als Ziffer oder als Wort. */
function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const numeric = Number(raw.replace(",", "."));
  if (Number.isFinite(numeric)) return numeric;
  const word = NUMBER_WORDS[foldUmlauts(raw.toLowerCase())];
  return word ?? null;
}

/**
 * Regelbasierter Assistent ohne Modell.
 *
 * Er erkennt Absichten an Schluesselwoertern. Das ist grob, aber es deckt die
 * Faelle ab, die im Alltag zaehlen, und es sagt ehrlich, wenn es nicht reicht.
 */
export async function runOffline(nachricht: string, actions: AgentActions): Promise<AgentReply> {
  const text = foldUmlauts(nachricht.toLowerCase());
  const ausgefuehrt: string[] = [];

  if (/merk dir|merke dir|denk dran|nicht vergessen|behalte/.test(text)) {
    const inhalt = nachricht.replace(/^.*?(merk dir|merke dir|denk dran|nicht vergessen|behalte)\s*,?\s*/i, "");
    const antwort = await actions.merken({ text: inhalt || nachricht, art: "fakt", wichtigkeit: 4, schlagworte: [] });
    return { text: `Notiert. ${antwort}`, ausgefuehrt: ["Gemerkt"], source: "offline" };
  }

  // Getraenke mit Kalorien gehoeren in die Mahlzeit, nicht in die Trinkmenge.
  const kalorienGetraenk = /cola|limo|saft|bier|wein|milch|shake|smoothie|kaffee mit|latte|apfelschorle/.test(text);
  const trinkAbsicht = /getrunken|trinken|durst|wasser|glaeser|glas|flasche/.test(text);
  if (trinkAbsicht && !kalorienGetraenk) {
    const ml = extractMl(text);
    if (ml) {
      const antwort = await actions.wasserEintragen(ml);
      return { text: antwort, ausgefuehrt: [`${ml} ml Wasser eingetragen`], source: "offline" };
    }
  }

  if (/gegessen|esse|hatte|fruehstueck|frühstück|mittag|abendessen|snack/.test(text)) {
    const antwort = await actions.mahlzeitErfassen(nachricht);
    ausgefuehrt.push("Mahlzeit eingetragen");
    return { text: antwort, ausgefuehrt, source: "offline" };
  }

  if (/was soll ich essen|vorschlag|kuehlschrank|kühlschrank|kochen|rezept/.test(text)) {
    return { text: await actions.mahlzeitVorschlagen(), ausgefuehrt, source: "offline" };
  }

  if (/wie (viel|weit|steht|stehe)|rest|noch offen|bilanz|stand/.test(text)) {
    return { text: await actions.tagesstandAbrufen(), ausgefuehrt, source: "offline" };
  }

  if (/geschlafen|energie|fuehle|fühle|muede|müde|stress|erschoepft|erschöpft|kaputt/.test(text)) {
    const antwort = await actions.checkinSpeichern({
      notiz: nachricht,
      energie: extractScore(text, /energie\D{0,10}(\d{1,2})/),
      schlaf: extractScore(text, /schlaf\D{0,10}(\d{1,2})/),
    });
    return { text: `${antwort} Was nimmst du dir fuer den Rest des Tages vor?`, ausgefuehrt: ["Check-in gespeichert"], source: "offline" };
  }

  return {
    text:
      "Ohne KI Schluessel verstehe ich nur einfache Saetze. Das hier kann ich sicher: " +
      "sag mir, was du gegessen hast, wie viel du getrunken hast, wie es dir geht, " +
      "oder frag nach deinem Stand. Den vollen Coach schaltest du im Menue unter Profil frei.",
    ausgefuehrt,
    source: "offline",
  };
}

function extractMl(input: string): number | null {
  const text = foldUmlauts(input.toLowerCase());
  const zahl = "(\\d+(?:[.,]\\d+)?|" + Object.keys(NUMBER_WORDS).join("|") + ")";

  const direct = new RegExp(`${zahl}\\s*(ml|milliliter|liter|l)\\b`).exec(text);
  if (direct) {
    const amount = parseAmount(direct[1]);
    const unit = direct[2] ?? "ml";
    if (amount !== null) return Math.round(amount * (unit === "ml" || unit === "milliliter" ? 1 : 1000));
  }

  const count = new RegExp(`${zahl}\\s*(glaeser|glas|flaschen|flasche|liter)`).exec(text);
  if (count) {
    const amount = parseAmount(count[1]);
    const unit = count[2] ?? "glas";
    const perUnit = unit.startsWith("flasche") ? 500 : unit === "liter" ? 1000 : 250;
    if (amount !== null) return Math.round(amount * perUnit);
  }

  for (const [pattern, ml] of ML_PER_UNIT) {
    if (pattern.test(text)) return ml;
  }
  return null;
}

function extractScore(text: string, pattern: RegExp): number | undefined {
  const match = pattern.exec(text);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 1 && value <= 10 ? value : undefined;
}
