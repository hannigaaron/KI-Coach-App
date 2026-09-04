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

export interface ConverseRequest {
  system: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  maxTokens?: number;
  /**
   * Steuert, wie gründlich das Modell nachdenkt, und damit auch die Kosten.
   * low reicht für "ich hatte zwei Eier", eine echte Frage braucht high.
   * Welche Stufe wann genommen wird, entscheidet der Agent je Nachricht.
   */
  effort?: "low" | "medium" | "high";
}

export interface ConverseResponse {
  content: ContentBlock[];
  stopReason: string;
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
