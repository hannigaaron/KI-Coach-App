import { hash, kontoAnlegen, type Konto } from "./konto.js";
import type { KVNamespace } from "./umgebung.js";

/**
 * Anmeldung mit Apple oder Google.
 *
 * Das Konto bleibt ein Schlüssel ohne E-Mail und Passwort. Die Anmeldung
 * hängt nur eine Kennung des Anbieters daran, und zwar als Hash: gespeichert
 * wird nicht, wer jemand ist, sondern nur, dass dieselbe Apple oder Google
 * Kennung wiederkommt. Daraus folgen die zwei Zwecke:
 *
 * 1. Wer die App neu installiert oder das Handy wechselt, meldet sich an und
 *    hat sein Abo wieder, ohne Sicherung.
 * 2. Die Testphase gibt es je Person einmal. Wer neu installiert, bekommt
 *    sein altes Konto zurück und keine neue Woche.
 *
 * Ein Konto gilt auf einem Gerät. Meldet sich jemand auf einem zweiten an,
 * wandert das Konto dorthin, und das erste legt beim nächsten Start ein
 * neues an. Mehrere Schlüssel je Konto hiesse, Stufe und Verbrauch an
 * mehreren Stellen gleich zu halten, und genau das kann der Schlüsselspeicher
 * nicht zuverlässig.
 *
 * Geprüft wird die Signatur des Tokens gegen die öffentlichen Schlüssel des
 * Anbieters, dazu Aussteller, Empfänger und Ablauf. Ein Token, das nur
 * entschlüsselt und nicht geprüft wird, kann jeder selbst schreiben.
 */

export type Anbieter = "apple" | "google";

const APPLE_KEYS = "https://appleid.apple.com/auth/keys";
const GOOGLE_KEYS = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string }

function b64url(text: string): Uint8Array<ArrayBuffer> {
  const b = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(b), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

export interface Pruefung {
  aussteller: string[];
  empfaenger: string[];
  jwksUrl: string;
}

export function pruefungFuer(anbieter: Anbieter, env: { APPLE_AUD?: string; GOOGLE_CLIENT_IDS?: string }): Pruefung | null {
  const liste = (t?: string) => (t || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (anbieter === "apple") {
    const aud = liste(env.APPLE_AUD || "de.daevo.app");
    return { aussteller: ["https://appleid.apple.com"], empfaenger: aud, jwksUrl: APPLE_KEYS };
  }
  if (anbieter === "google") {
    const aud = liste(env.GOOGLE_CLIENT_IDS);
    if (!aud.length) return null;
    return { aussteller: ["https://accounts.google.com", "accounts.google.com"], empfaenger: aud, jwksUrl: GOOGLE_KEYS };
  }
  return null;
}

/**
 * Prüft ein ID Token und gibt die Kennung `sub` zurück, sonst einen Fehler.
 * `holen` und `jetzt` kommen von aussen, damit die Prüfung testbar ist.
 */
export async function idTokenPruefen(
  token: string,
  p: Pruefung,
  { holen = fetch, jetzt = Date.now(), nonce }: { holen?: typeof fetch; jetzt?: number; nonce?: string } = {},
): Promise<{ sub: string } | { fehler: string }> {
  const teile = String(token || "").split(".");
  if (teile.length !== 3) return { fehler: "Kein gültiges Token." };
  let kopf: { alg?: string; kid?: string };
  let inhalt: { iss?: string; aud?: string | string[]; exp?: number; sub?: string; nonce?: string };
  try {
    kopf = JSON.parse(new TextDecoder().decode(b64url(teile[0]!)));
    inhalt = JSON.parse(new TextDecoder().decode(b64url(teile[1]!)));
  } catch {
    return { fehler: "Token nicht lesbar." };
  }
  if (kopf.alg !== "RS256" || !kopf.kid) return { fehler: "Unbekanntes Verfahren." };
  const r = await holen(p.jwksUrl);
  if (!r.ok) return { fehler: "Schlüssel des Anbieters nicht erreichbar." };
  const { keys = [] } = (await r.json()) as { keys?: Jwk[] };
  const jwk = keys.find((k) => k.kid === kopf.kid);
  if (!jwk) return { fehler: "Schlüssel unbekannt." };
  const schluessel = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const echt = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    schluessel,
    b64url(teile[2]!),
    new TextEncoder().encode(`${teile[0]}.${teile[1]}`),
  );
  if (!echt) return { fehler: "Signatur ungültig." };
  if (!inhalt.iss || !p.aussteller.includes(inhalt.iss)) return { fehler: "Falscher Aussteller." };
  const aud = Array.isArray(inhalt.aud) ? inhalt.aud : [inhalt.aud];
  if (!aud.some((a) => a && p.empfaenger.includes(a))) return { fehler: "Token gilt nicht für daevo." };
  // Eine Minute Spielraum für abweichende Uhren.
  if (!inhalt.exp || inhalt.exp * 1000 < jetzt - 60_000) return { fehler: "Token abgelaufen." };
  if (nonce !== undefined && inhalt.nonce !== nonce) return { fehler: "Nonce stimmt nicht." };
  if (!inhalt.sub) return { fehler: "Keine Kennung im Token." };
  return { sub: inhalt.sub };
}

/**
 * Tauscht den Code aus dem Google Fenster der iPhone App gegen ein ID Token.
 * Ein iOS Client bei Google hat kein Geheimnis, der Austausch ist über PKCE
 * gesichert: nur wer den `verifier` kennt, bekommt das Token.
 */
export async function googleCodeTauschen(
  daten: { code: string; verifier: string; redirect: string; clientId: string },
  holen: typeof fetch = fetch,
): Promise<{ idToken: string } | { fehler: string }> {
  const r = await holen(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: daten.code,
      code_verifier: daten.verifier,
      redirect_uri: daten.redirect,
      client_id: daten.clientId,
    }).toString(),
  });
  if (!r.ok) return { fehler: `Google lehnt den Code ab (${r.status}).` };
  const j = (await r.json()) as { id_token?: string };
  return j.id_token ? { idToken: j.id_token } : { fehler: "Google hat kein Token geschickt." };
}

/**
 * Verknüpft eine geprüfte Kennung mit einem Konto und gibt den Schlüssel für
 * dieses Gerät zurück.
 *
 * - Die Kennung kennt schon ein Konto: dieses Konto gilt, auf diesem Gerät mit
 *   einem neuen Schlüssel. Ein Konto, das das Gerät vorher ohne Anmeldung
 *   hatte, wird gelöscht. Es war eine Testphase ohne Person, und die Person
 *   hat jetzt ihr echtes Konto.
 * - Die Kennung ist neu und das Gerät hat ein Konto ohne Anmeldung: das wird
 *   verknüpft, Stufe und Verbrauch bleiben.
 * - Sonst entsteht ein neues Konto.
 */
export async function anmeldungVerknuepfen(
  kv: KVNamespace,
  anbieter: Anbieter,
  sub: string,
  aktuell: { konto: Konto; h: string } | null,
  jetzt: Date = new Date(),
  { testphase = true }: { testphase?: boolean } = {},
): Promise<{ token?: string; konto: Konto; neu: boolean; uebernommen: boolean }> {
  const schluessel = `login.${anbieter}.${await hash(`${anbieter}:${sub}`)}`;
  const vorhandeneId = await kv.get(schluessel);

  if (vorhandeneId) {
    if (aktuell?.konto.id === vorhandeneId) return { konto: aktuell.konto, neu: false, uebernommen: false };
    const alterHash = await kv.get(`kontoid.${vorhandeneId}`);
    const roh = alterHash ? await kv.get(`konto.${alterHash}`) : null;
    if (roh && alterHash) {
      const konto = JSON.parse(roh) as Konto;
      const token = neuerToken();
      const h = await hash(token);
      await kv.put(`konto.${h}`, JSON.stringify(konto));
      await kv.put(`kontoid.${konto.id}`, h);
      await kv.delete(`konto.${alterHash}`);
      if (aktuell && !aktuell.konto.login) {
        await kv.delete(`konto.${aktuell.h}`);
        await kv.delete(`kontoid.${aktuell.konto.id}`);
      }
      return { token, konto, neu: false, uebernommen: true };
    }
    // Die Verknüpfung zeigt ins Leere, etwa nach einem gelöschten Konto.
    await kv.delete(schluessel);
  }

  if (aktuell && !aktuell.konto.login) {
    const konto: Konto = { ...aktuell.konto, login: anbieter };
    await kv.put(`konto.${aktuell.h}`, JSON.stringify(konto));
    await kv.put(schluessel, konto.id);
    await kv.put(`loginvon.${konto.id}`, schluessel);
    return { konto, neu: false, uebernommen: false };
  }

  const { token, konto } = await kontoAnlegen(kv, jetzt, { testphase });
  const mitLogin: Konto = { ...konto, login: anbieter };
  await kv.put(`konto.${await hash(token)}`, JSON.stringify(mitLogin));
  await kv.put(schluessel, konto.id);
  await kv.put(`loginvon.${konto.id}`, schluessel);
  return { token, konto: mitLogin, neu: true, uebernommen: false };
}

function neuerToken(): string {
  const z = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...crypto.getRandomValues(new Uint8Array(40))].map((b) => z[b % z.length]).join("");
}
