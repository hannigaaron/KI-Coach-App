import type { IncomingMessage, ServerResponse } from "node:http";

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

const MAX_BODY_BYTES = 256 * 1024;

export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Anfrage zu gross");
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new HttpError(400, "Body muss ein JSON Objekt sein");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Ungueltiges JSON");
  }
}

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
  });
  res.end(body);
}

export function requireString(body: Record<string, unknown>, key: string, maxLength = 2000): string {
  const value = body[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `Feld ${key} fehlt oder ist leer`);
  }
  if (value.length > maxLength) throw new HttpError(400, `Feld ${key} ist zu lang`);
  return value.trim();
}

export function requireNumber(body: Record<string, unknown>, key: string, min: number, max: number): number {
  const value = Number(body[key]);
  if (!Number.isFinite(value)) throw new HttpError(400, `Feld ${key} muss eine Zahl sein`);
  if (value < min || value > max) throw new HttpError(400, `Feld ${key} muss zwischen ${min} und ${max} liegen`);
  return value;
}

export function optionalNumber(body: Record<string, unknown>, key: string, min: number, max: number): number | null {
  if (body[key] === undefined || body[key] === null || body[key] === "") return null;
  return requireNumber(body, key, min, max);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  if (!ISO_DATE.test(value)) throw new HttpError(400, "Datum muss im Format YYYY-MM-DD stehen");
  return value;
}

export function today(timeZone = "Europe/Berlin"): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone }).format(new Date());
}

export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}
