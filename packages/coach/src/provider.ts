/**
 * Ein Anhang, den der Nutzer mitschickt.
 *
 * Bilder gehen als base64 an das Modell, PDFs ebenfalls. Videos kann die API
 * nicht lesen, deshalb zieht die App vorher ein Einzelbild heraus und schickt
 * das. Was die App daraus macht, steht in apps/pwa/js/media.js.
 */
export interface Anhang {
  /** image/jpeg, image/png, image/webp, image/gif oder application/pdf. */
  mediaType: string;
  /** Die Daten als base64, ohne den data URL Kopf. */
  data: string;
  /** Dateiname, nur für die Anzeige und für das Modell als Hinweis. */
  name?: string;
}

export interface JsonRequest {
  system: string;
  user: string;
  /** Bilder oder PDFs, die zur Frage gehören. */
  anhaenge?: Anhang[];
  /** JSON Schema, das die Antwort erfüllen muss. */
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
  /** Ueberschreibt das Modell des Anbieters für diesen einen Aufruf. */
  modell?: string;
}

/** Ein Werkzeug, das das Modell aufrufen darf. */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

/**
 * Baut aus einem Anhang den passenden Inhaltsblock.
 *
 * PDFs sind für die API ein eigener Typ, alles andere ein Bild. Ein
 * unbekannter Medientyp wird als Bild geschickt, weil die API dann eine
 * verständliche Fehlermeldung liefert statt still das Falsche zu tun.
 */
export function anhangBlock(anhang: Anhang): ContentBlock {
  const typ = anhang.mediaType === "application/pdf" ? "document" : "image";
  return { type: typ, source: { type: "base64", media_type: anhang.mediaType, data: anhang.data } } as ContentBlock;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

/**
 * Was ein Aufruf verbraucht hat.
 *
 * `inputTokens` ist nur der ungecachte Rest. Die volle Promptgrösse ist die
 * Summe aus allen drei Eingabefeldern. Wer nur inputTokens liest, sieht nach
 * gutem Zwischenspeichern eine winzige Zahl und hält das für einen Fehler.
 */
export interface Verbrauch {
  inputTokens: number;
  outputTokens: number;
  /** Aus dem Zwischenspeicher gelesen, kostet ein Zehntel. */
  cacheReadTokens: number;
  /** In den Zwischenspeicher geschrieben, kostet das 1,25 fache. */
  cacheWriteTokens: number;
  modell: string;
}

export interface ConverseRequest {
  system: string | SystemBlockParam[];
  messages: ChatMessage[];
  tools: ToolDefinition[];
  maxTokens?: number;
  /**
   * Steuert, wie gründlich das Modell nachdenkt, und damit auch die Kosten.
   * low reicht für "ich hatte zwei Eier", eine echte Frage braucht high.
   * Welche Stufe wann genommen wird, entscheidet der Agent je Nachricht.
   */
  effort?: "low" | "medium" | "high";
  /** Ueberschreibt das Modell des Anbieters für diesen einen Aufruf. */
  modell?: string;
  /**
   * Setzt effort, auch wenn der Anbieter sonst eines schicken würde.
   * Haiku 4.5 lehnt die Angabe mit einem Fehler ab.
   */
  ohneEffort?: boolean;
  /**
   * Wird während der Antwort mit jedem Stück Text gerufen.
   *
   * Ist die Funktion gesetzt, läuft der Aufruf als Datenstrom. Das macht die
   * Antwort nicht schneller, aber die Wartezeit sichtbar kürzer: das erste
   * Wort steht nach etwa einer Sekunde da statt nach zehn. Kosten ändert es
   * nicht, gezahlt wird dasselbe.
   */
  onText?: (stueck: string) => void;
}

/** Ein Stück Systemprompt, das eigen markiert werden kann. */
export interface SystemBlockParam {
  text: string;
  /** Setzt die Marke fürs Zwischenspeichern hinter dieses Stück. */
  cache?: boolean;
}

export interface ConverseResponse {
  content: ContentBlock[];
  stopReason: string;
  verbrauch?: Verbrauch;
}

export interface CoachProvider {
  readonly name: string;
  readonly available: boolean;
  generateJson<T>(request: JsonRequest): Promise<T>;
  /** Mehrschrittiges Gespräch mit Werkzeugen. */
  converse(request: ConverseRequest): Promise<ConverseResponse>;
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
