import {
  ProviderUnavailableError,
  type CoachProvider,
  type ContentBlock,
  type ConverseRequest,
  type ConverseResponse,
  anhangBlock,
  type JsonRequest,
  type SystemBlockParam,
  type Verbrauch,
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
  /**
   * Wird nach jedem Aufruf mit dem Verbrauch gerufen. Die App zählt damit
   * mit, was ein Tag gekostet hat. Ohne diese Meldung wüsste niemand, ob das
   * Zwischenspeichern überhaupt greift.
   */
  onVerbrauch?: (verbrauch: Verbrauch) => void;
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

  /**
   * Baut den Systemprompt für die API.
   *
   * Eine Zeichenkette bleibt eine Zeichenkette. Blöcke werden zu Textblöcken,
   * und der als `cache` markierte bekommt die Marke fürs Zwischenspeichern.
   * Die API rendert in der Reihenfolge tools, system, messages. Eine Marke im
   * System deckt deshalb auch alle Werkzeugbeschreibungen mit ab.
   */
  private systemFeld(system: string | SystemBlockParam[]): unknown {
    if (typeof system === "string") return system;
    return system.map((block) => ({
      type: "text",
      text: block.text,
      // Fünf Minuten, nicht eine Stunde. Wer innerhalb eines Gesprächs
      // antwortet, liegt fast immer unter fünf Minuten, und die Stunde kostet
      // beim Schreiben das Doppelte statt das 1,25 fache.
      ...(block.cache ? { cache_control: { type: "ephemeral" } } : {}),
    }));
  }

  /** Liest den Verbrauch aus einer Antwort und meldet ihn. */
  private meldeVerbrauch(payload: unknown, modell = this.options.model): Verbrauch | undefined {
    const usage = (payload as { usage?: Record<string, unknown> })?.usage;
    if (!usage) return undefined;
    const zahl = (wert: unknown) => (Number.isFinite(Number(wert)) ? Number(wert) : 0);
    const verbrauch: Verbrauch = {
      inputTokens: zahl(usage.input_tokens),
      outputTokens: zahl(usage.output_tokens),
      cacheReadTokens: zahl(usage.cache_read_input_tokens),
      cacheWriteTokens: zahl(usage.cache_creation_input_tokens),
      modell,
    };
    this.options.onVerbrauch?.(verbrauch);
    return verbrauch;
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
    const modell = request.modell ?? this.options.model;
    const payload = (await this.post(
      {
        model: modell,
        max_tokens: request.maxTokens ?? 2048,
        system: this.systemFeld(request.system),
        messages: request.messages,
        tools: request.tools,
        // Nicht jedes Modell nimmt eine Angabe zur Denktiefe entgegen.
        // Haiku 4.5 lehnt sie mit einem Fehler ab, deshalb bleibt das Feld
        // dort ganz weg statt auf einen Standardwert zu fallen.
        ...(request.ohneEffort ? {} : { output_config: { effort: request.effort ?? "medium" } }),
      },
      this.options.timeoutMs ?? 90000,
    )) as { content?: ContentBlock[]; stop_reason?: string };
    return {
      content: payload.content ?? [],
      stopReason: payload.stop_reason ?? "end_turn",
      verbrauch: this.meldeVerbrauch(payload, modell),
    };
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
          model: request.modell ?? this.options.model,
          max_tokens: request.maxTokens ?? 2048,
          // Auch hier cachen. Der Prompt fuers Auswerten eines Tellers ist
          // lang und bei jedem Foto derselbe.
          system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
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
      this.meldeVerbrauch(payload, request.modell ?? this.options.model);
      const toolUse = payload.content?.find((block) => block.type === "tool_use");
      if (!toolUse?.input) throw new Error("Antwort enthält keinen Tool Call");
      return toolUse.input as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
