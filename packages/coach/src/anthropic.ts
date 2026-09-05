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
    const koerper = {
      model: modell,
      max_tokens: request.maxTokens ?? 2048,
      system: this.systemFeld(request.system),
      messages: request.messages,
      tools: request.tools,
      // Nicht jedes Modell nimmt eine Angabe zur Denktiefe entgegen.
      // Haiku 4.5 lehnt sie mit einem Fehler ab, deshalb bleibt das Feld
      // dort ganz weg statt auf einen Standardwert zu fallen.
      ...(request.ohneEffort ? {} : { output_config: { effort: request.effort ?? "medium" } }),
    };

    if (request.onText) {
      return this.stream(koerper, request.onText, modell);
    }

    const payload = (await this.post(
      koerper,
      this.options.timeoutMs ?? 90000,
    )) as { content?: ContentBlock[]; stop_reason?: string };
    return {
      content: payload.content ?? [],
      stopReason: payload.stop_reason ?? "end_turn",
      verbrauch: this.meldeVerbrauch(payload, modell),
    };
  }

  /**
   * Dasselbe Gespräch, aber als Datenstrom.
   *
   * Die API schickt Server Sent Events: erst message_start mit dem Verbrauch
   * der Eingabe, dann je Block ein content_block_start, beliebig viele
   * content_block_delta und ein content_block_stop, am Ende message_delta mit
   * dem Grund fürs Aufhören und den Ausgabetoken.
   *
   * Die Blöcke werden hier wieder zusammengesetzt, weil der Agent danach
   * dieselbe Antwortform braucht wie ohne Strom. Werkzeugaufrufe kommen als
   * JSON in Stücken und werden erst am Blockende geparst. Bricht das Parsen,
   * bleibt das Werkzeug mit leerer Eingabe stehen statt den ganzen Aufruf zu
   * kippen: eine fehlende Zahl ist besser als eine verlorene Antwort.
   */
  private async stream(
    koerper: Record<string, unknown>,
    onText: (stueck: string) => void,
    modell: string,
  ): Promise<ConverseResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 90000);
    try {
      const holen = this.fetchImpl;
      const response = await holen(API_URL, {
        method: "POST",
        headers: this.headers(),
        signal: controller.signal,
        body: JSON.stringify({ ...koerper, stream: true }),
      });
      if (!response.ok || !response.body) {
        const text = response.body ? await response.text() : "";
        throw new Error(`Anthropic API ${response.status}: ${text.slice(0, 500)}`);
      }

      const blöcke: ContentBlock[] = [];
      const roheEingaben: string[] = [];
      let stopReason = "end_turn";
      let verbrauch: Verbrauch | undefined;
      let eingabe: Record<string, unknown> | undefined;

      for await (const ereignis of leseEvents(response.body)) {
        const typ = ereignis.type as string;
        if (typ === "message_start") {
          eingabe = (ereignis.message as { usage?: Record<string, unknown> })?.usage;
        } else if (typ === "content_block_start") {
          const index = Number(ereignis.index);
          const block = ereignis.content_block as Record<string, unknown>;
          roheEingaben[index] = "";
          if (block?.type === "text") {
            blöcke[index] = { type: "text", text: String(block.text ?? "") };
          } else if (block?.type === "tool_use") {
            blöcke[index] = {
              type: "tool_use",
              id: String(block.id ?? ""),
              name: String(block.name ?? ""),
              input: {},
            };
          } else {
            // Denkblöcke und alles Künftige gehen unverändert durch.
            blöcke[index] = block as unknown as ContentBlock;
          }
        } else if (typ === "content_block_delta") {
          const index = Number(ereignis.index);
          const delta = ereignis.delta as Record<string, unknown>;
          if (delta?.type === "text_delta") {
            const stueck = String(delta.text ?? "");
            const vorhanden = blöcke[index];
            if (vorhanden && vorhanden.type === "text") vorhanden.text += stueck;
            onText(stueck);
          } else if (delta?.type === "input_json_delta") {
            roheEingaben[index] = (roheEingaben[index] ?? "") + String(delta.partial_json ?? "");
          }
        } else if (typ === "content_block_stop") {
          const index = Number(ereignis.index);
          const block = blöcke[index];
          const roh = roheEingaben[index];
          if (block && block.type === "tool_use" && roh) {
            try {
              block.input = JSON.parse(roh) as Record<string, unknown>;
            } catch {
              block.input = {};
            }
          }
        } else if (typ === "message_delta") {
          const delta = ereignis.delta as Record<string, unknown>;
          if (delta?.stop_reason) stopReason = String(delta.stop_reason);
          const aus = ereignis.usage as Record<string, unknown> | undefined;
          verbrauch = this.meldeVerbrauch({ usage: { ...(eingabe ?? {}), ...(aus ?? {}) } }, modell);
        }
      }

      return { content: blöcke.filter(Boolean), stopReason, verbrauch };
    } finally {
      clearTimeout(timeout);
    }
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

/**
 * Zerlegt einen Datenstrom in die JSON Objekte der Server Sent Events.
 *
 * Ein Ereignis endet an einer Leerzeile. Die Datenzeilen davor werden
 * aneinandergehängt. Alles andere, etwa die event Zeile, braucht hier
 * niemand: der Typ steht auch im JSON.
 */
async function* leseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const leser = body.getReader();
  const decoder = new TextDecoder();
  let puffer = "";
  while (true) {
    const { done, value } = await leser.read();
    if (done) break;
    puffer += decoder.decode(value, { stream: true });
    let grenze = puffer.indexOf("\n\n");
    while (grenze !== -1) {
      const roh = puffer.slice(0, grenze);
      puffer = puffer.slice(grenze + 2);
      const daten = roh
        .split("\n")
        .filter((zeile) => zeile.startsWith("data:"))
        .map((zeile) => zeile.slice(5).trim())
        .join("");
      if (daten && daten !== "[DONE]") {
        try {
          yield JSON.parse(daten) as Record<string, unknown>;
        } catch {
          // Ein kaputtes Ereignis darf den Rest der Antwort nicht kippen.
        }
      }
      grenze = puffer.indexOf("\n\n");
    }
  }
}
