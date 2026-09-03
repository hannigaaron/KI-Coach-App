import { ProviderUnavailableError, type CoachProvider, type JsonRequest } from "./provider.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export interface AnthropicOptions {
  apiKey: string | undefined;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Setzt den Header anthropic-dangerous-direct-browser-access.
   * Nur fuer Aufrufe direkt aus dem Browser noetig. Der Schluessel liegt dann
   * im Geraet des Nutzers und ist dort einsehbar. Das ist fuer eigene Tests
   * vertretbar, fuer eine oeffentliche App nicht.
   */
  browserAccess?: boolean;
}

/**
 * Anbindung an die Anthropic Messages API.
 *
 * Strukturierte Antworten werden ueber einen erzwungenen Tool Call geholt.
 * Das ist zuverlaessiger als freies JSON im Text, weil das Modell das
 * Eingabeschema des Tools einhalten muss.
 * Doku: https://docs.anthropic.com/en/api/messages
 */
export class AnthropicProvider implements CoachProvider {
  readonly name = "anthropic";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: AnthropicOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get available(): boolean {
    return Boolean(this.options.apiKey);
  }

  async generateJson<T>(request: JsonRequest): Promise<T> {
    if (!this.available) throw new ProviderUnavailableError("ANTHROPIC_API_KEY fehlt");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30000);
    try {
      const response = await this.fetchImpl(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.options.apiKey as string,
          "anthropic-version": API_VERSION,
          ...(this.options.browserAccess ? { "anthropic-dangerous-direct-browser-access": "true" } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: request.maxTokens ?? 2048,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          tools: [
            {
              name: request.schemaName,
              description: "Gib das Ergebnis ausschliesslich ueber dieses Tool zurueck.",
              input_schema: request.schema,
            },
          ],
          tool_choice: { type: "tool", name: request.schemaName },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Anthropic API ${response.status}: ${body.slice(0, 500)}`);
      }

      const payload = (await response.json()) as {
        content?: Array<{ type: string; name?: string; input?: unknown }>;
      };
      const toolUse = payload.content?.find((block) => block.type === "tool_use");
      if (!toolUse?.input) throw new Error("Antwort enthaelt keinen Tool Call");
      return toolUse.input as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
