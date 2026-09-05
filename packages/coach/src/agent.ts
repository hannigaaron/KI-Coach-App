import { AGENT_TOOLS } from "./tools.js";
import { modellFuer } from "./modelle.js";
import { systemBloecke, type Modus } from "./persona.js";
import { anhangBlock, type Anhang, type ChatMessage, type CoachProvider, type ContentBlock } from "./provider.js";

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
  /**
   * Was der Nutzer selbst als Anweisung hinterlegt hat. Steht im Prompt ganz
   * unten und wiegt am schwersten, ausser bei den Grenzen.
   */
  eigeneAnweisungen?: string;
}

/** Was der Assistent in der App auslösen kann. Die App liefert die Umsetzung. */
export interface AgentActions {
  mahlzeitErfassen(beschreibung: string): Promise<string>;
  wasserEintragen(ml: number): Promise<string>;
  tagesstandAbrufen(): Promise<string>;
  mahlzeitVorschlagen(wunsch?: string): Promise<string>;
  checkinSpeichern(input: {
    energie?: number; schlaf?: number; stimmung?: number; notiz: string; herausforderung?: string;
  }): Promise<string>;
  merken(input: { text: string; art: string; wichtigkeit: number; schlagworte?: string[] }): Promise<string>;
  gedaechtnisDurchsuchen(frage: string): Promise<string>;
  einkaufslisteErstellen(input: { tage?: number; meiden?: string[] }): Promise<string>;
  einkaufslisteAbrufen(): Promise<string>;
  einkaufslisteAbhaken(input: { posten: string; stand: "gekauft" | "zuhause" | "offen" }): Promise<string>;
  standardsAbrufen(): Promise<string>;
  standardSetzen(input: { text: string; kadenz: string; art: string; ziel: number; id?: string }): Promise<string>;
  standardBestaetigen(input: { id: string; gehalten: boolean }): Promise<string>;
  verlaufAbrufen(input: { tage?: number }): Promise<string>;
  kalenderAbrufen(input: { tage?: number }): Promise<string>;
  aufgabeAnlegen(input: { text: string; minuten?: number; faellig?: string; wichtigkeit?: number }): Promise<string>;
  aufgabeAbhaken(input: { text: string }): Promise<string>;
  aufgabenPriorisieren(): Promise<string>;
  mittagscheckSpeichern(input: {
    energie: number; konzentration: number; saettigung: number; notiz?: string;
  }): Promise<string>;
  briefingErstellen(input: { art: "morgen" | "abend" }): Promise<string>;
  tagesablaufPlanen(input: { tag?: string }): Promise<string>;
  gewichtEintragen(kg: number): Promise<string>;
  trainingEintragen(input: { art: string; minuten: number; notiz?: string }): Promise<string>;
  profilAendern(input: {
    ziel?: string; gewichtKg?: number; schritte?: number;
    aufstehen?: string; schlafen?: string; verbrauch?: number;
  }): Promise<string>;
  fotoAlsMahlzeit(input: { hinweis?: string }): Promise<string>;
  fotoAlsVorrat(input: { hinweis?: string }): Promise<string>;
}

/**
 * Nimmt die Antwort entgegen, während sie geschrieben wird.
 *
 * `neu` verwirft, was bisher angezeigt wurde. Das passiert vor jeder Runde,
 * denn zwischen zwei Runden kann ein Werkzeug laufen, und was davor stand,
 * war nur ein Zwischenschritt.
 */
export interface Strom {
  neu(): void;
  text(stueck: string): void;
}

export interface AgentReply {
  text: string;
  /** Was tatsächlich passiert ist, für die Anzeige unter der Antwort. */
  ausgeführt: string[];
  source: "model" | "offline";
}

/**
 * Die Persona steht in persona.js. Hier bleibt nur der Verweis, damit alter
 * Code und Tests weiter etwas zum Anfassen haben.
 */
export { systemPrompt, systemBloecke, PERSONA_TEILE, type Modus } from "./persona.js";
export { modellFuer, modellFuerBilder, MODELLE, MODELL_JE_MODUS, MODELL_OPTIONEN } from "./modelle.js";

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
    /** Bilder oder PDFs, die der Nutzer zu dieser Nachricht mitschickt. */
    anhaenge?: Anhang[];
    /** "auto" folgt der Zuordnung je Modus, ein Modellname gewinnt. */
    modellWahl?: string;
    /** Hebt jede Nachricht auf die höchste Denktiefe. */
    immerGruendlich?: boolean;
    /** Nimmt die Antwort entgegen, während sie entsteht. */
    strom?: Strom;
  }): Promise<AgentReply> {
    if (this.provider.available) {
      try {
        return await this.runModel(params);
      } catch (error) {
        if (isDebug()) console.error("Agent Modellfehler", error);
        const offline = await runOffline(params.nachricht, params.aktionen, Boolean(params.anhaenge?.length));
        return {
          ...offline,
          text: `${offline.text}\n\n(Der Coach ist gerade nicht erreichbar, ich habe es regelbasiert erledigt.)`,
        };
      }
    }
    return runOffline(params.nachricht, params.aktionen, Boolean(params.anhaenge?.length));
  }

  private async runModel(params: {
    nachricht: string;
    verlauf: ChatMessage[];
    kontext: AgentContext;
    aktionen: AgentActions;
    anhaenge?: Anhang[];
    modellWahl?: string;
    immerGruendlich?: boolean;
    strom?: Strom;
  }): Promise<AgentReply> {
    const tiefe = tiefeAnheben(
      denktiefe(params.nachricht, Boolean(params.anhaenge?.length)),
      Boolean(params.immerGruendlich),
    );
    const modell = modellFuer(tiefe.modus, params.modellWahl ?? "auto");
    const system = systemBloecke({
      modus: tiefe.modus,
      zeit: params.kontext.zeit,
      profil: params.kontext.profil,
      tag: params.kontext.tag,
      gedächtnis: params.kontext.gedächtnis,
      eigeneAnweisungen: params.kontext.eigeneAnweisungen,
    });

    // Anhänge stehen vor dem Text. Sonst liest das Modell die Frage, bevor es
    // das Bild kennt, und fängt an zu raten.
    const anhaenge = params.anhaenge ?? [];
    const inhalt: string | ContentBlock[] = anhaenge.length
      ? [...anhaenge.map(anhangBlock), { type: "text" as const, text: params.nachricht || "Schau dir das an." }]
      : params.nachricht;
    const messages: ChatMessage[] = [...params.verlauf, { role: "user", content: inhalt }];
    const ausgeführt: string[] = [];

    for (let step = 0; step < MAX_STEPS; step++) {
      // Jede Runde beginnt einen neuen Abschnitt. Schreibt das Modell etwas,
      // ruft dann ein Werkzeug und schreibt danach die eigentliche Antwort,
      // soll der erste Teil nicht stehen bleiben. Er steht auch nicht in der
      // gespeicherten Antwort.
      params.strom?.neu();
      const response = await this.provider.converse({
        system,
        messages,
        tools: AGENT_TOOLS,
        effort: tiefe.effort,
        maxTokens: tiefe.maxTokens,
        modell: modell.id,
        ohneEffort: !modell.kannEffort,
        ...(params.strom ? { onText: (stueck: string) => params.strom?.text(stueck) } : {}),
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
export function denktiefe(nachricht: string, mitAnhang = false): {
  effort: "low" | "medium" | "high";
  maxTokens: number;
  modus: Modus;
} {
  const text = foldUmlauts(nachricht.toLowerCase());
  const woerter = text.split(/\s+/).filter(Boolean).length;

  // Alles, was wehtut. Das hat Vorrang vor jeder anderen Erkennung: wer von
  // Schuld oder Trauer schreibt und dabei nebenbei Kalorien erwähnt, will
  // nicht über Kalorien reden.
  const psyche = pattern(
    "schuld", "scham", "schäme", "schame", "traurig", "trauer", "einsam", "verletzt mich",
    "angst", "panik", "druck", "überfordert", "uberfordert", "ausgebrannt", "burnout",
    "hasse mich", "mag mich nicht", "selbstwert", "wertlos", "versagt", "versager",
    "depress", "antrieb", "sinnlos", "kraftlos", "innerlich leer",
    "beziehung", "trennung", "herz gebrochen", "verliebt", "ex freundin", "exfreundin",
    "familie", "schwester", "bruder", "mutter", "vater", "eltern",
    "therapie", "therapeut", "psycholog",
    "aufschieben", "prokrastin", "impulskontrolle", "handysucht", "social media",
    "porno", "rückfall", "ruckfall", "diszipliniert", "keine motivation", "keine lust mehr",
    "libido", "erektion", "einsamkeit", "grübel", "grubel", "gedankenkarussell",
    "schlechtes gewissen", "mach\\w* mich( \\w+){0,3} fertig", "mit den nerven",
    "schaffe nichts", "schaffe es nicht", "nichts geschafft", "krieg nichts",
  ).test(text);

  // Arbeit, Geld, Zeit, Aufbau.
  const planung = pattern(
    "geld", "einkommen", "umsatz", "gewinn", "verdien", "gehalt", "preis", "preise",
    "euro", "netto", "brutto", "monatlich", "honorar", "stundensatz", "einnahmen",
    "kunden", "kundin", "angebot", "business", "selbstständig", "selbststandig", "firma",
    "steuer", "rechnung", "vertrag", "gründ", "grund ung", "franchise", "investier",
    "etf", "aktien", "vermögen", "vermogen", "sparen", "rente",
    "zeitmanagement", "kalender", "woche planen", "tagesplan", "prioritäten", "prioritaten",
    "content", "reichweite", "instagram", "tiktok", "marketing", "funnel",
  ).test(text);

  // Echte Fachfragen zu Training, Ernährung, Regeneration.
  const fachlich = pattern(
    "protein", "kalorien", "makro", "defizit", "überschuss", "uberschuss", "kohlenhydrat",
    "kreatin", "supplement", "eiweiss", "eiweiß",
    "training", "trainingsplan", "satz", "sätze", "satze", "wiederholung", "progression",
    "periodisierung", "regeneration", "übertraining", "ubertraining", "muskelaufbau",
    "abnehmen", "zunehmen", "diät", "diat", "refeed", "cheat",
    "schlaf", "müde", "mude", "energielos", "erschöpft", "erschopft", "testosteron", "hormon",
    "verletz", "schmerz", "plateau", "stagnation", "tut sich nichts",
    "nehme nicht ab", "nehme nicht zu", "puls", "herzfrequenz",
  ).test(text);

  // Fragt er überhaupt etwas, oder erzählt er nur.
  const fragt = pattern(
    "warum", "wieso", "weshalb", "erklär", "erklar", "wie kommt", "wie funktioniert",
    "was denkst", "was meinst", "was hältst", "was halt", "soll ich", "sollte ich",
    "lohnt sich", "besser", "vergleich", "unterschied", "sinnvoll", "wirklich",
    "wie schaffe", "wie kriege", "was kann ich tun", "hilf mir", "was mache ich",
    "ich verstehe nicht", "stimmt das", "richtig so", "wie gehe ich",
  ).test(text) || text.includes("?");

  // Die Stufen im Einzelnen:
  //
  // psyche und planung bleiben auf hoch. Dort entscheidet sich, ob die App
  // etwas wert ist, und dort wird nicht gespart.
  //
  // Fachfragen laufen auf mittel. Anthropic gibt für Wissensarbeit an, dass
  // mittlere Denktiefe die Genauigkeit der Voreinstellung bei 70 bis 85
  // Prozent der Kosten erreicht. Das ist eine veröffentlichte Angabe, keine
  // Messung an den Daten dieses Nutzers. Mittel antwortet zusätzlich
  // schneller. Wer das anders will, stellt im Profil "immer gründlich" ein.
  //
  // maxTokens ist kein Sparhebel, sondern eine Notbremse. Bezahlt wird, was
  // wirklich geschrieben wird. Ein zu niedriger Wert schneidet nur mitten im
  // Satz ab. Deshalb stehen die Werte hoch genug, dass keine Antwort abbricht.
  if (psyche) return { effort: "high", maxTokens: 8192, modus: "psyche" };

  // Ein Bild auszuwerten heisst Mengen schätzen. Das passiert aber nicht hier,
  // sondern im eigenen Aufruf der Bildauswertung. Im Gespräch entscheidet das
  // Modell nur, welches Werkzeug es ruft, und fasst danach zusammen.
  if (mitAnhang && !planung) return { effort: "medium", maxTokens: 4096, modus: "coaching" };
  if (planung && (fragt || woerter > 8)) return { effort: "high", maxTokens: 8192, modus: "planung" };
  if (fachlich && (fragt || woerter > 8)) return { effort: "medium", maxTokens: 4096, modus: "coaching" };

  // Reines Erfassen: kurz, und es geht um Essen, Trinken oder Gewicht.
  const erfassen = pattern("gegessen", "getrunken", "hatte", "wiege", "gewogen", "ml", "gramm").test(text);
  if (erfassen && woerter <= 14 && !fragt) return { effort: "low", maxTokens: 2048, modus: "erfassen" };

  if (fragt) return { effort: "medium", maxTokens: 4096, modus: "coaching" };
  return { effort: "low", maxTokens: 4096, modus: "standard" };
}

/**
 * Hebt die Denktiefe an, wenn der Nutzer das so eingestellt hat.
 *
 * Der Schalter im Profil heisst "immer gründlich". Er setzt jede Nachricht auf
 * die höchste Stufe. Das kostet mehr und antwortet langsamer, und genau das
 * steht auch daneben.
 */
export function tiefeAnheben(
  tiefe: { effort: "low" | "medium" | "high"; maxTokens: number; modus: Modus },
  immerGruendlich: boolean,
): { effort: "low" | "medium" | "high"; maxTokens: number; modus: Modus } {
  if (!immerGruendlich) return tiefe;
  return { ...tiefe, effort: "high", maxTokens: Math.max(tiefe.maxTokens, 4096) };
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
          herausforderung: typeof input.herausforderung === "string" ? input.herausforderung : undefined,
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
      case "kalender_abrufen": {
        const tage = Number.isFinite(Number(input.tage)) ? clamp(Number(input.tage), 1, 14) : undefined;
        return { text: await actions.kalenderAbrufen({ tage }) };
      }
      case "tagesablauf_planen": {
        const tag = typeof input.tag === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.tag) ? input.tag : undefined;
        return { text: await actions.tagesablaufPlanen({ tag }) };
      }
      case "aufgabe_anlegen": {
        const text = String(input.text ?? "").trim();
        if (!text) return { text: "Ohne Text keine Aufgabe.", fehler: true };
        const antwort = await actions.aufgabeAnlegen({
          text,
          minuten: Number.isFinite(Number(input.minuten)) ? clamp(Number(input.minuten), 5, 480) : undefined,
          faellig: typeof input.faellig === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.faellig) ? input.faellig : undefined,
          wichtigkeit: Number.isFinite(Number(input.wichtigkeit)) ? clamp(Number(input.wichtigkeit), 1, 3) : undefined,
        });
        return { text: antwort, notiz: "Aufgabe angelegt" };
      }
      case "aufgabe_abhaken": {
        const text = String(input.text ?? "").trim();
        if (!text) return { text: "Welche Aufgabe?", fehler: true };
        return { text: await actions.aufgabeAbhaken({ text }), notiz: "Aufgabe abgehakt" };
      }
      case "aufgaben_priorisieren":
        return { text: await actions.aufgabenPriorisieren() };
      case "mittagscheck_speichern": {
        const wert = (roh: unknown) => clamp(Number(roh), 1, 10);
        if (![input.energie, input.konzentration, input.saettigung].every((x) => Number.isFinite(Number(x)))) {
          return { text: "Energie, Konzentration und Sättigung brauche ich als Zahl von 1 bis 10.", fehler: true };
        }
        const antwort = await actions.mittagscheckSpeichern({
          energie: wert(input.energie),
          konzentration: wert(input.konzentration),
          saettigung: wert(input.saettigung),
          notiz: typeof input.notiz === "string" ? input.notiz : undefined,
        });
        return { text: antwort, notiz: "Mittags Check-in gespeichert" };
      }
      case "briefing_erstellen": {
        const art = input.art === "abend" ? "abend" : "morgen";
        return { text: await actions.briefingErstellen({ art }) };
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
      case "foto_als_mahlzeit_erfassen": {
        const text = await actions.fotoAlsMahlzeit({
          hinweis: typeof input.hinweis === "string" ? input.hinweis : undefined,
        });
        return { text, notiz: "Foto ausgewertet und eingetragen" };
      }
      case "foto_als_vorrat_lesen": {
        const text = await actions.fotoAlsVorrat({
          hinweis: typeof input.hinweis === "string" ? input.hinweis : undefined,
        });
        return { text, notiz: "Vorrat aus dem Foto übernommen" };
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
export async function runOffline(
  nachricht: string,
  actions: AgentActions,
  mitAnhang = false,
): Promise<AgentReply> {
  const text = foldUmlauts(nachricht.toLowerCase());
  const ausgeführt: string[] = [];

  // Ein Bild ohne Modell auszuwerten geht nicht. Das ehrlich sagen, statt so
  // zu tun, als hätte man es gesehen.
  if (mitAnhang) {
    return {
      text:
        "Das Bild kann ich ohne KI Schlüssel nicht ansehen. Bilder auswerten geht nur mit Modell. " +
        "Trag deinen Schlüssel im Menue unter Profil ein, dann lese ich Teller und Kühlschrank. " +
        "Bis dahin: schreib mir, was drauf ist, dann rechne ich es aus.",
      ausgeführt,
      source: "offline",
    };
  }

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

  // Der Kalender liegt im Gerät. Dafür braucht es kein Modell, nur die Frage
  // nach der Zeit zu erkennen.
  if (pattern("wann habe ich", "wann muss ich", "was steht an", "mein tag", "heute noch vor",
    "wie sieht (mein|der) tag", "zeit habe ich", "freie zeit", "wann trainiere",
    "wann soll ich essen", "tagesablauf", "tagesplan").test(text)) {
    return { text: await actions.tagesablaufPlanen({}), ausgeführt, source: "offline" };
  }

  if (pattern("kalender", "termine", "diese woche", "nächste woche", "naechste woche", "wochenplan").test(text)) {
    return { text: await actions.kalenderAbrufen({}), ausgeführt, source: "offline" };
  }

  // Aufgaben und Prioritäten. Auch das läuft ohne Modell, weil die
  // Reihenfolge aus Fristen und Zahlen kommt, nicht aus Sprachverständnis.
  if (pattern("was zuerst", "womit anfangen", "priorit", "reihenfolge", "was mache ich (jetzt|zuerst)",
    "rest des tages", "schaffe ich heute", "was kann warten", "to do", "todo", "aufgabenliste").test(text)) {
    return { text: await actions.aufgabenPriorisieren(), ausgeführt, source: "offline" };
  }

  if (pattern("ich muss noch", "nicht vergessen zu", "steht noch an", "auf die liste", "erinnere mich daran",
    "aufgabe").test(text)) {
    const inhalt = nachricht
      .replace(/^.*?(ich muss noch|nicht vergessen zu|steht noch an|auf die liste|erinnere mich daran|aufgabe)\s*,?\s*/i, "")
      .trim();
    if (inhalt.length >= 3) {
      const antwort = await actions.aufgabeAnlegen({ text: inhalt });
      return { text: antwort, ausgeführt: ["Aufgabe angelegt"], source: "offline" };
    }
  }

  if (pattern("morgenbriefing", "wie sieht mein tag", "was steht heute an", "guten morgen").test(text)) {
    return { text: await actions.briefingErstellen({ art: "morgen" }), ausgeführt, source: "offline" };
  }

  if (pattern("tagesabschluss", "tag abschliessen", "tag abschließen", "gute nacht", "feierabend").test(text)) {
    return { text: await actions.briefingErstellen({ art: "abend" }), ausgeführt, source: "offline" };
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
