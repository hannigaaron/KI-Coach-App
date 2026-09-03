export interface JsonRequest {
  system: string;
  user: string;
  /** JSON Schema, das die Antwort erfuellen muss. */
  schema: Record<string, unknown>;
  schemaName: string;
  maxTokens?: number;
}

export interface CoachProvider {
  readonly name: string;
  readonly available: boolean;
  generateJson<T>(request: JsonRequest): Promise<T>;
}

export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
