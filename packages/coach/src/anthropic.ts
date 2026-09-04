import {
  ProviderUnavailableError,
  type CoachProvider,
  type ContentBlock,
  type ConverseRequest,
  type ConverseResponse,
  anhangBlock,
  type JsonRequest,
} from "./provider.js";

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export interface AnthropicOptions {
  apiKey: string | undefined;
  model: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Setzt den Header anthropic-dangerous-direct-browser-access.
   * Nur für Aufrufe direkt aus dem Browser nötig. Der Schlüssel liegt dann
   * im Gerät des Nutzers und ist dort einsehbar. Das ist für eigene Tests
   * vertretbar, für eine öffentliche App nicht.
   */
  browserAccess?: boolean;
}

/**
 * Anbindung an die Anthropic Messages API.
 *
 * Strukturierte Antworten werden über einen erzwungenen Tool Call geholt.
 * Das ist zuverlässiger als freies JSON im Text, weil das Modell das
 * Eingabeschema des Tools einhalten muss.
 * Doku: https://docs.anthropic.com/en/api/messages
 */
export class AnthropicProvider implements CoachProvider {
  readonly name = "anthropic";
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: AnthropicOptions) {
    // fetch muss an globalThis gebunden bleiben. Speichert man die blanke
    // Funktion in einem Feld und ruft sie als this.fetchImpl auf, ist this
    // die Instanz und nicht window. Browser werfen dann "Illegal invocation",
    // und der Aufruf scheitert, bevor eine einzige Anfrage rausgeht.
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  get available(): boolean {
    return Boolean(this.options.apiKey);
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-key": this.options.apiKey as string,
      "anthropic-version": API_VERSION,
      ...(this.options.browserAccess ? { "anthropic-dangerous-direct-browser-access": "true" } : {}),
    };
  }

  private async post(body: unknown, timeoutMs: number): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // Erst in eine lokale Konstante, dann aufrufen. Ruft man
      // this.fetchImpl(...) direkt auf, ist this die Instanz und nicht
      // globalThis. Browser werfen dann "Illegal invocation", und es geht
      // keine einzige Anfrage raus.
      const holen = this.fetchImpl;
      const response = await holen(API_URL, {
        method: "POST",
        headers: this.headers(),
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Anthropic API ${response.status}: ${text.slice(0, 500)}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Gespräch mit Werkzeugen.
   *
   * Kein festes Denkbudget. Auf den aktuellen Modellen läuft adaptives Denken
   * von selbst, gesteuert wird die Tiefe über effort. Die Stufe kommt vom
   * Agenten und hängt an der Nachricht: eine Mahlzeit einzutragen braucht
   * kein Nachdenken, "warum ist mein Testosteron niedrig" schon.
   *
   * medium ist die Grundstufe, nicht low. Ein Coach, der nur schnell ist,
   * ist kein Coach.
   */
  async converse(request: ConverseRequest): Promise<ConverseResponse> {
    if (!this.available) throw new ProviderUnavailableError("ANTHROPIC_API_KEY fehlt");
    const payload = (await this.post(
      {
        model: this.options.model,
        max_tokens: request.maxTokens ?? 2048,
        system: request.system,
        messages: request.messages,
        tools: request.tools,
        output_config: { effort: request.effort ?? "medium" },
      },
      this.options.timeoutMs ?? 90000,
    )) as { content?: ContentBlock[]; stop_reason?: string };
    return { content: payload.content ?? [], stopReason: payload.stop_reason ?? "end_turn" };
  }

  async generateJson<T>(request: JsonRequest): Promise<T> {
    if (!this.available) throw new ProviderUnavailableError("ANTHROPIC_API_KEY fehlt");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 30000);
    try {
      const holen = this.fetchImpl;
      const response = await holen(API_URL, {
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
          // Anhänge stehen vor dem Text. Das Modell sieht sonst die Frage,
          // bevor es das Bild kennt, und beginnt zu raten.
          messages: [{
            role: "user",
            content: request.anhaenge?.length
              ? [...request.anhaenge.map(anhangBlock), { type: "text", text: request.user }]
              : request.user,
          }],
          tools: [
            {
              name: request.schemaName,
              description: "Gib das Ergebnis ausschließlich über dieses Tool zurück.",
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
      if (!toolUse?.input) throw new Error("Antwort enthält keinen Tool Call");
      return toolUse.input as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
