export interface JsonRequest {
  system: string;
  user: string;
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
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export interface ChatMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ConverseRequest {
  system: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  maxTokens?: number;
  /** Steuert Tiefe und Kosten. Für ein Gespräch reicht low. */
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
