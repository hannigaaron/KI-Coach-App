import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Db } from "./db.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * Tokenbasierte Authentifizierung für den MVP.
 *
 * Der Klartext Token wird einmal bei der Registrierung ausgegeben und danach
 * nur als SHA-256 Hash gespeichert. Für die Produktion gehört hier
 * Sign in with Apple plus kurzlebige Zugriffstokens hin.
 * Siehe docs/ARCHITEKTUR.md, Abschnitt Sicherheit.
 */
export function createToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function authenticate(db: Db, authorizationHeader: string | undefined): AuthUser | null {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice(7).trim();
  if (!token) return null;
  const hash = hashToken(token);
  const rows = db.prepare("SELECT id, email, name, token_hash FROM users").all() as Array<{
    id: string;
    email: string;
    name: string;
    token_hash: string;
  }>;
  for (const row of rows) {
    if (safeEqual(row.token_hash, hash)) {
      return { id: row.id, email: row.email, name: row.name };
    }
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
