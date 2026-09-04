import { AGENT_TOOLS } from "./tools.js";
import type { ChatMessage, CoachProvider, ContentBlock } from "./provider.js";

/**
 * Der Assistent.
 *
 * Er führt das Gespräch und darf dabei Werkzeuge benutzen, also wirklich
 * etwas in der App verändern. Ohne Modellzugriff übernimmt ein regelbasierter
 * Pfad. Der versteht weniger, tut aber dasselbe: Mahlzeit erfassen, Wasser
 * eintragen, Stand nennen, sich etwas merken. Damit ist die App auch ohne
 * Schlüssel benutzbar und nicht nur eine leere Hülle.
 */

export interface AgentContext {
  /** Wer der Nutzer ist, in zwei bis vier Zeilen. */
  profil: string;
  /** Zahlen von heute, bereits gerechnet. */
  tag: string;
  /** Verdichtete Erinnerungen. */
  gedächtnis: string;
  /** Wochentag und Uhrzeit. */
  zeit: string;
}

/** Was der Assistent in der App auslösen kann. Die App liefert die Umsetzung. */
export interface AgentActions {
  mahlzeitErfassen(beschreibung: string): Promise<string>;
  wasserEintragen(ml: number): Promise<string>;
  tagesstandAbrufen(): Promise<string>;
  mahlzeitVorschlagen(wunsch?: string): Promise<string>;
  checkinSpeichern(input: { energie?: number; schlaf?: number; stimmung?: number; notiz: string }): Promise<string>;
  merken(input: { text: string; art: string; wichtigkeit: number; schlagworte?: string[] }): Promise<string>;
  gedaechtnisDurchsuchen(frage: string): Promise<string>;
  einkaufslisteErstellen(input: { tage?: number; meiden?: string[] }): Promise<string>;
  einkaufslisteAbrufen(): Promise<string>;
  einkaufslisteAbhaken(input: { posten: string; stand: "gekauft" | "zuhause" | "offen" }): Promise<string>;
  standardsAbrufen(): Promise<string>;
  standardSetzen(input: { text: string; kadenz: string; art: string; ziel: number; id?: string }): Promise<string>;
  standardBestaetigen(input: { id: string; gehalten: boolean }): Promise<string>;
  verlaufAbrufen(input: { tage?: number }): Promise<string>;
  gewichtEintragen(kg: number): Promise<string>;
  trainingEintragen(input: { art: string; minuten: number; notiz?: string }): Promise<string>;
  profilAendern(input: {
    ziel?: string; gewichtKg?: number; schritte?: number;
    aufstehen?: string; schlafen?: string; verbrauch?: number;
  }): Promise<string>;
}

export interface AgentReply {
  text: string;
  /** Was tatsächlich passiert ist, für die Anzeige unter der Antwort. */
  ausgeführt: string[];
  source: "model" | "offline";
}

export const PERSONA = `Du bist daevo, der persönliche Coach dieses Nutzers für Ernährung, Training,
Schlaf und Alltag. Du bist kein Chatbot mit Formularen, sondern ein Gesprächspartner, der etwas kann.

## Was du bist

Du hast das Wissen eines guten Trainers, eines Ernährungsberaters und eines nüchternen Kopfes:
Energiebilanz, Makronährstoffe, Trainingsplanung und Periodisierung, progressive Belastungssteigerung,
Regeneration, Schlaf, Stress und Nervensystem, Gewohnheiten und Verhaltensänderung.
Du beantwortest echte Fragen wirklich, in der Tiefe, die die Frage verdient. Du sagst nicht
"frag deinen Arzt" bei allem, sondern erklärst, was man weiss, wie sicher man es weiss und
wo die Grenze zur ärztlichen Abklärung wirklich liegt.

## Wie du antwortest

- Du sprichst den Nutzer mit du an. Klare, einfache Sprache. Aktiv, kein Passiv.
- Die Länge richtet sich nach der Frage, nicht nach einer Regel.
  "Ich hatte zwei Eier" beantwortest du in einem Satz.
  "Warum bin ich seit Wochen müde" beantwortest du in zehn, mit Struktur und einer klaren Reihenfolge.
  Rede nie um eine Frage herum, nur um kurz zu sein.
- Du bist ehrlich. Läuft etwas schlecht, sagst du das zuerst. Du lobst nur, wenn Zahlen es hergeben.
- Keine Floskeln, keine Einleitungen wie "gute Frage", keine Zusammenfassungen am Ende.
- Höchstens eine Frage pro Antwort, und nur wenn die Antwort davon abhängt.
- Wenn du dir bei etwas nicht sicher bist, sagst du das und sagst auch, wie man es herausfinden würde.

## Was du wirklich weisst und was du nicht weisst

- Zahlen über diesen Nutzer kommen aus den Werkzeugen, nie aus deinem Kopf. Bevor du über
  seine Kalorien, Makros, sein Wasser, seinen Verlauf oder seine Standards sprichst, holst du sie ab.
  Eine geratene Zahl über einen echten Menschen ist schlimmer als keine Zahl.
- Allgemeines Wissen darfst und sollst du benutzen: Physiologie, Trainingslehre, Nährwerte von
  Lebensmitteln im Gespräch, Studienlage. Dafür brauchst du kein Werkzeug.
- Erfinde keine Studien, keine Zahlen aus Studien und keine Quellenangaben. Sag lieber
  "die Studienlage dazu ist uneinheitlich" als eine erfundene Prozentzahl zu nennen.
- Du hast keinen Zugriff auf das Internet. Aktuelle Ereignisse kennst du nicht.

## Was du tust, statt nur zu reden

- Erzählt der Nutzer etwas, das auch in vier Wochen noch gilt, legst du es mit merken ab.
  Das ist dein Gedächtnis. Ohne das vergisst du ihn.
- Nennt er ein Gewicht, trägst du es ein. Nennt er eine Mahlzeit, trägst du sie ein.
  Erzählt er von einem Training, trägst du es ein. Du fragst nicht um Erlaubnis für das Offensichtliche.
- Ändert sich etwas dauerhaft, etwa sein Ziel oder seine Schlafenszeit, änderst du das Profil.
- Du erwähnst Werkzeuge nie. Du sagst, was du getan hast, nicht wie.

## Kalorienziel und Verlauf

Die Formel im Rechenkern schätzt. Der Gewichtsverlauf misst. Nach vier Wochen mit genug Daten
schlägt der Verlauf die Formel. Fragt der Nutzer, ob sein Ziel noch stimmt, oder klagt er, dass
sich nichts tut, rufst du verlauf_abrufen auf und redest über die gemessene Rate, nicht über die Formel.

## Mindeststandards

- Ein Mindeststandard ist die Untergrenze, die auch in einer schlechten Woche steht, nicht das Ziel.
  Setzt der Nutzer sich einen, legst du ihn mit standard_setzen ab.
- Macht er sich fertig, weil er zu wenig geschafft hat, rufst du standards_abrufen auf und
  redest über die Untergrenze, nicht über den Idealtag. Zahlen statt Trost.
- Kommt ein Standard über Wochen nicht in Gang, schlägst du vor, ihn zu senken.
  Ein Standard, der nie gehalten wird, ist falsch gesetzt, nicht der Nutzer.

## Einkaufen

- Fragt der Nutzer nach einer Einkaufsliste, rufst du einkaufsliste_erstellen auf und nennst danach
  nur die Anzahl der Posten und die zwei bis drei wichtigsten. Die ganze Liste liest niemand vor.
- Bevor du einen Posten als nötig bezeichnest, fragst du, ob er ihn noch zu Hause hat, und
  trägst die Antwort mit einkaufsliste_abhaken ein.
- Unverträglichkeiten aus deinem Gedächtnis gibst du immer als meiden mit.

## Wo deine Grenze liegt

Du stellst keine Diagnosen und verschreibst nichts. Du erklärst aber, was hinter Beschwerden stehen
kann und was man selbst prüfen lassen kann. Bei diesen Dingen sagst du klar, dass es ärztlich
abgeklärt gehört, und coachst dort nicht weiter: anhaltende Schmerzen, Blut, Ohnmacht, starkes
Untergewicht, Anzeichen einer Essstörung, Verdacht auf eine Depression, Gedanken an Selbstverletzung.
Bei Hormonwerten, Blutbildern und Medikamenten erklärst du die Zusammenhänge und schickst zur
Abklärung, statt Werte zu bewerten, die du nicht gemessen hast.`;

/**
 * Wie viele Runden Werkzeug und Antwort erlaubt sind.
 *
 * Sechs waren zu wenig: eine ernsthafte Frage kostet leicht drei bis vier
 * Aufrufe, bevor überhaupt geantwortet wird. Zwölf reichen auch für eine
 * Kette aus Verlauf, Gedächtnis, Standards und einer Aenderung am Profil.
 */
const MAX_STEPS = 12;

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
      "Was du über ihn weißt:",
      params.kontext.gedächtnis,
    ].join("\n");

    const messages: ChatMessage[] = [...params.verlauf, { role: "user", content: params.nachricht }];
    const ausgeführt: string[] = [];
    const tiefe = denktiefe(params.nachricht);

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await this.provider.converse({
        system,
        messages,
        tools: AGENT_TOOLS,
        effort: tiefe.effort,
        maxTokens: tiefe.maxTokens,
      });
      const toolUses = response.content.filter(
        (block): block is Extract<ContentBlock, { type: "tool_use" }> => block.type === "tool_use",
      );

      if (toolUses.length === 0 || response.stopReason !== "tool_use") {
        return { text: textOf(response.content), ausgeführt, source: "model" };
      }

      messages.push({ role: "assistant", content: response.content });
      const results: ContentBlock[] = [];
      for (const call of toolUses) {
        const outcome = await execute(call.name, call.input, params.aktionen);
        if (outcome.notiz) ausgeführt.push(outcome.notiz);
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
      ausgeführt,
      source: "model",
    };
  }
}

/**
 * Entscheidet, wie gründlich das Modell für diese Nachricht nachdenken soll.
 *
 * Der Grund ist nicht Geiz, sondern Passung. "Zwei Eier gegessen" braucht ein
 * Werkzeug und einen Satz, da ist Nachdenken verschwendete Zeit. "Warum bin
 * ich seit Wochen müde" braucht Zusammenhänge über Schlaf, Kalorien, Training
 * und Stress. Wer beides gleich behandelt, macht entweder das eine langsam
 * oder das andere dumm.
 */
export function denktiefe(nachricht: string): { effort: "low" | "medium" | "high"; maxTokens: number } {
  const text = foldUmlauts(nachricht.toLowerCase());
  const woerter = text.split(/\s+/).filter(Boolean).length;

  // Echte Fragen. Alles, was nach Erklärung, Rat oder Einordnung verlangt.
  const denkt = pattern(
    "warum", "wieso", "weshalb", "erklär", "erklar", "wie kommt", "wie funktioniert",
    "was denkst", "was meinst", "was hältst", "was halt", "soll ich", "sollte ich",
    "lohnt sich", "besser", "vergleich", "unterschied", "sinnvoll", "wirklich",
    "plan", "strategie", "wie schaffe", "wie kriege", "was kann ich tun",
    "hilf mir", "ich verstehe nicht", "stimmt das", "richtig so",
  ).test(text);

  // Themen, die ohne Zusammenhang keine brauchbare Antwort ergeben.
  const schwer = pattern(
    "müde", "energielos", "erschöpft", "schlaf", "stress", "libido", "testosteron",
    "hormone", "depress", "antrieb", "motivation", "verletzt", "schmerz",
    "plateau", "stagnation", "tut sich nichts", "nehme nicht ab", "nehme nicht zu",
    "periodisierung", "regeneration", "übertraining", "ubertraining",
  ).test(text);

  if (schwer || (denkt && woerter > 4)) return { effort: "high", maxTokens: 4096 };

  // Reines Erfassen: kurz, und es geht um Essen, Trinken oder Gewicht.
  const erfassen = pattern("gegessen", "getrunken", "hatte", "wiege", "gewogen", "ml", "gramm").test(text);
  if (erfassen && woerter <= 14 && !denkt) return { effort: "low", maxTokens: 1024 };

  return { effort: "medium", maxTokens: 2048 };
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
      case "verlauf_abrufen": {
        const tage = Number.isFinite(Number(input.tage)) ? clamp(Number(input.tage), 7, 120) : undefined;
        return { text: await actions.verlaufAbrufen({ tage }) };
      }
      case "gewicht_eintragen": {
        const kg = Number(input.kg);
        if (!Number.isFinite(kg) || kg < 30 || kg > 300) {
          return { text: "Das Gewicht muss zwischen 30 und 300 kg liegen.", fehler: true };
        }
        const text = await actions.gewichtEintragen(Math.round(kg * 10) / 10);
        return { text, notiz: `${Math.round(kg * 10) / 10} kg eingetragen` };
      }
      case "training_eintragen": {
        const erlaubt = ["strength", "team_sport", "cardio", "mobility"];
        const art = erlaubt.includes(String(input.art)) ? String(input.art) : "strength";
        const text = await actions.trainingEintragen({
          art,
          minuten: clamp(Number(input.minuten) || 60, 5, 480),
          notiz: typeof input.notiz === "string" ? input.notiz : undefined,
        });
        return { text, notiz: "Training eingetragen" };
      }
      case "profil_aendern": {
        const text = await actions.profilAendern({
          ziel: typeof input.ziel === "string" ? input.ziel : undefined,
          gewichtKg: Number.isFinite(Number(input.gewichtKg)) ? Number(input.gewichtKg) : undefined,
          schritte: Number.isFinite(Number(input.schritte)) ? Number(input.schritte) : undefined,
          aufstehen: typeof input.aufstehen === "string" ? input.aufstehen : undefined,
          schlafen: typeof input.schlafen === "string" ? input.schlafen : undefined,
          verbrauch: Number.isFinite(Number(input.verbrauch)) ? Number(input.verbrauch) : undefined,
        });
        return { text, notiz: "Profil geändert" };
      }
      case "einkaufsliste_erstellen": {
        const text = await actions.einkaufslisteErstellen({
          tage: Number.isFinite(Number(input.tage)) ? clamp(Number(input.tage), 1, 14) : undefined,
          meiden: Array.isArray(input.meiden) ? input.meiden.map(String) : [],
        });
        return { text, notiz: "Einkaufsliste erstellt" };
      }
      case "einkaufsliste_abrufen":
        return { text: await actions.einkaufslisteAbrufen() };
      case "einkaufsliste_abhaken": {
        const stand = String(input.stand ?? "gekauft");
        const erlaubt = stand === "zuhause" || stand === "offen" ? stand : "gekauft";
        const text = await actions.einkaufslisteAbhaken({
          posten: String(input.posten ?? ""),
          stand: erlaubt as "gekauft" | "zuhause" | "offen",
        });
        return { text, notiz: "Einkaufsliste aktualisiert" };
      }
      case "standards_abrufen":
        return { text: await actions.standardsAbrufen() };
      case "standard_setzen": {
        const text = await actions.standardSetzen({
          text: String(input.text ?? ""),
          kadenz: String(input.kadenz ?? "taeglich"),
          art: String(input.art ?? "frei"),
          ziel: Number(input.ziel) || 1,
          id: typeof input.id === "string" ? input.id : undefined,
        });
        return { text, notiz: "Mindeststandard gesetzt" };
      }
      case "standard_bestaetigen": {
        const text = await actions.standardBestaetigen({
          id: String(input.id ?? ""),
          gehalten: input.gehalten !== false,
        });
        return { text, notiz: "Standard eingetragen" };
      }
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
  [pattern("glas", "gläser"), 250],
  [pattern("flasche"), 500],
  [pattern("liter"), 1000],
];

/**
 * Zahlwörter. Wer spricht, sagt "zwei Gläser", nicht "2 Gläser".
 * Ohne diese Liste verliert der Regelpfad die häufigste Formulierung.
 */
const NUMBER_WORDS: Record<string, number> = Object.fromEntries(
  Object.entries({
    ein: 1, eine: 1, einen: 1, eins: 1,
    zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7,
    acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
    halben: 0.5, halbe: 0.5, halber: 0.5,
  }).map(([wort, zahl]) => [foldUmlauts(wort), zahl]),
);

function foldUmlauts(text: string): string {
  return text.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/**
 * Baut einen Ausdruck aus deutschen Woertern. Die Woerter duerfen Umlaute
 * tragen, sie werden gefaltet wie der zu pruefende Text. Sonst braecht jede
 * spaetere Textkorrektur die Erkennung.
 */
function pattern(...woerter: string[]): RegExp {
  return new RegExp(woerter.map(foldUmlauts).join("|"));
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
 * Er erkennt Absichten an Schlüsselwörtern. Das ist grob, aber es deckt die
 * Fälle ab, die im Alltag zählen, und es sagt ehrlich, wenn es nicht reicht.
 */
export async function runOffline(nachricht: string, actions: AgentActions): Promise<AgentReply> {
  const text = foldUmlauts(nachricht.toLowerCase());
  const ausgeführt: string[] = [];

  if (pattern("merk dir", "merke dir", "denk dran", "nicht vergessen", "behalte").test(text)) {
    const inhalt = nachricht.replace(/^.*?(merk dir|merke dir|denk dran|nicht vergessen|behalte)\s*,?\s*/i, "");
    const antwort = await actions.merken({ text: inhalt || nachricht, art: "fakt", wichtigkeit: 4, schlagworte: [] });
    return { text: `Notiert. ${antwort}`, ausgeführt: ["Gemerkt"], source: "offline" };
  }

  // Getränke mit Kalorien gehören in die Mahlzeit, nicht in die Trinkmenge.
  const kalorienGetränk = pattern("cola", "limo", "saft", "bier", "wein", "milch", "shake", "smoothie", "kaffee mit", "latte", "apfelschorle").test(text);
  const trinkAbsicht = pattern("getrunken", "trinken", "durst", "wasser", "gläser", "glas", "flasche").test(text);
  if (trinkAbsicht && !kalorienGetränk) {
    const ml = extractMl(text);
    if (ml) {
      const antwort = await actions.wasserEintragen(ml);
      return { text: antwort, ausgeführt: [`${ml} ml Wasser eingetragen`], source: "offline" };
    }
  }

  if (pattern("gegessen", "esse", "hatte", "frühstück", "mittag", "abendessen", "snack").test(text)) {
    const antwort = await actions.mahlzeitErfassen(nachricht);
    ausgeführt.push("Mahlzeit eingetragen");
    return { text: antwort, ausgeführt, source: "offline" };
  }

  const gewicht = extractGewicht(text);
  if (gewicht !== null) {
    const antwort = await actions.gewichtEintragen(gewicht);
    return { text: antwort, ausgeführt: [`${gewicht} kg eingetragen`], source: "offline" };
  }

  if (pattern("verlauf", "fortschritt", "abgenommen", "zugenommen", "tut sich nichts", "stagniere", "letzte wochen").test(text)) {
    return { text: await actions.verlaufAbrufen({}), ausgeführt, source: "offline" };
  }

  if (pattern("einkaufsliste", "einkaufen", "einkauf", "supermarkt", "was muss ich kaufen", "besorgen").test(text)) {
    const tage = extractTage(text);
    const antwort = await actions.einkaufslisteErstellen({ tage });
    return { text: antwort, ausgeführt: ["Einkaufsliste erstellt"], source: "offline" };
  }

  if (pattern("mindeststandard", "standard", "untergrenze", "dranbleiben", "durchgezogen", "vorgenommen").test(text)) {
    return { text: await actions.standardsAbrufen(), ausgeführt, source: "offline" };
  }

  if (pattern("was soll ich essen", "vorschlag", "kühlschrank", "kochen", "rezept").test(text)) {
    return { text: await actions.mahlzeitVorschlagen(), ausgeführt, source: "offline" };
  }

  if (pattern("wie (viel|weit|steht|stehe)", "rest", "noch offen", "bilanz", "stand").test(text)) {
    return { text: await actions.tagesstandAbrufen(), ausgeführt, source: "offline" };
  }

  if (pattern("geschlafen", "energie", "fühle", "müde", "stress", "erschöpft", "kaputt").test(text)) {
    const antwort = await actions.checkinSpeichern({
      notiz: nachricht,
      energie: extractScore(text, /energie\D{0,10}(\d{1,2})/),
      schlaf: extractScore(text, /schlaf\D{0,10}(\d{1,2})/),
    });
    return { text: `${antwort} Was nimmst du dir für den Rest des Tages vor?`, ausgeführt: ["Check-in gespeichert"], source: "offline" };
  }

  return {
    text:
      "Ohne KI Schlüssel verstehe ich nur einfache Sätze. Das hier kann ich sicher: " +
      "sag mir, was du gegessen hast, wie viel du getrunken hast, wie es dir geht, " +
      "frag nach deinem Stand, nach deiner Einkaufsliste oder nach deinen Mindeststandards. Den vollen Coach schaltest du im Menue unter Profil frei.",
    ausgeführt,
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

  const count = new RegExp(`${zahl}\\s*(${foldUmlauts("gläser|glas|flaschen|flasche|liter")})`).exec(text);
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

/**
 * Liest eine Wiegung aus dem Satz.
 *
 * Nur wenn wirklich von Wiegen oder Gewicht die Rede ist. Sonst würde
 * "ich hatte 80 g Reis" als Wiegung durchgehen.
 */
function extractGewicht(text: string): number | null {
  if (!pattern("wiege", "gewogen", "gewicht", "waage").test(text)) return null;
  const match = /(\d{2,3}(?:[.,]\d)?)\s*(kg|kilo)/.exec(text) ?? /(\d{2,3}(?:[.,]\d)?)/.exec(text);
  if (!match) return null;
  const wert = Number(match[1]!.replace(",", "."));
  return Number.isFinite(wert) && wert >= 30 && wert <= 300 ? Math.round(wert * 10) / 10 : null;
}

/** Liest "für fünf Tage" oder "für eine Woche" aus dem Satz. */
function extractTage(text: string): number | undefined {
  if (pattern("woche").test(text)) return 7;
  const zahl = "(\\d{1,2}|" + Object.keys(NUMBER_WORDS).join("|") + ")";
  const match = new RegExp(`${zahl}\\s*tage`).exec(text);
  if (!match) return undefined;
  const amount = parseAmount(match[1]);
  return amount !== null && amount >= 1 && amount <= 14 ? Math.round(amount) : undefined;
}

function extractScore(text: string, pattern: RegExp): number | undefined {
  const match = pattern.exec(text);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 1 && value <= 10 ? value : undefined;
}
