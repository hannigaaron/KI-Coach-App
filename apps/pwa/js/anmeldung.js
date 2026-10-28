/**
 * Anmeldung mit Apple oder Google.
 *
 * Die Anmeldung hängt das Konto auf dem Server an eine Kennung von Apple oder
 * Google. Damit kommt das Abo nach einer Neuinstallation oder auf einem neuen
 * Handy zurück, und die Testphase gibt es je Person einmal. Die Daten selbst
 * liegen weiter nur auf dem Gerät, dafür bleibt die Sicherung.
 *
 * Geprüft wird das Token auf dem Server, `workers/push/src/anmeldung.ts`. Die
 * App reicht es nur weiter.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { istNativ, KONFIG } from "./konfig.js";
import { nativAufruf } from "./nativ.js";
import { store } from "./storage.js";

const basis = () => (KONFIG.chatUrl || "").replace(/\/+$/, "");
const konfig = () => KONFIG.anmeldung || {};

/** Welche Wege es auf diesem Gerät gibt. Ohne eigenen Server keiner. */
export function anmeldeWege() {
  if (!basis()) return { apple: false, google: false };
  return {
    apple: istNativ(),
    google: Boolean(istNativ() ? konfig().googleIosClientId : konfig().googleWebClientId),
  };
}

const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** PKCE nach RFC 7636: ein Zufallswert und sein SHA-256 als Prüfwert. */
export async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge: b64url(digest) };
}

/**
 * Die Rückkehradresse eines iOS Clients bei Google ist seine Kennung von
 * hinten gelesen, so verlangt es Google für installierte Apps.
 */
export function iosRueckkehr(clientId) {
  const vorn = String(clientId || "").replace(/\.apps\.googleusercontent\.com$/, "");
  const schema = `com.googleusercontent.apps.${vorn}`;
  return { schema, redirect: `${schema}:/oauth2redirect` };
}

export function googleAdresse({ clientId, redirect, challenge, state }) {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: "openid",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

/**
 * Schickt den Nachweis an den Server und übernimmt das Konto, das zurückkommt.
 * Hat das Gerät schon ein Konto, geht es mit: der Server verknüpft es, statt
 * ein zweites anzulegen.
 */
export async function anmeldungSenden(daten, holen = fetch) {
  const s = store.getSettings();
  const r = await holen(`${basis()}/anmeldung`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(s.kontoToken ? { authorization: `Bearer ${s.kontoToken}` } : {}),
    },
    body: JSON.stringify(daten),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) return { fehler: j.fehler || `Anmeldung gescheitert (${r.status}).` };
  store.setSettings({
    ...store.getSettings(),
    ...(j.token ? { kontoToken: j.token } : {}),
    kontoId: j.id,
    login: j.login,
    anmeldungGefragt: true,
  });
  return { ok: true, uebernommen: Boolean(j.uebernommen), neu: Boolean(j.neu), login: j.login };
}

export async function anmeldenApple(holen = fetch) {
  const { idToken } = await nativAufruf("Anmeldung", "apple", {});
  return anmeldungSenden({ anbieter: "apple", idToken }, holen);
}

export async function anmeldenGoogleNativ(holen = fetch) {
  const clientId = konfig().googleIosClientId;
  const { schema, redirect } = iosRueckkehr(clientId);
  const { verifier, challenge } = await pkce();
  const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
  const { url } = await nativAufruf("Anmeldung", "web", { url: googleAdresse({ clientId, redirect, challenge, state }), schema });
  const rueck = new URL(url.replace(/^[^:]+:\/?/, "https://rueck/"));
  if (rueck.searchParams.get("state") !== state) return { fehler: "Die Antwort von Google passt nicht zur Anfrage." };
  const code = rueck.searchParams.get("code");
  if (!code) return { fehler: rueck.searchParams.get("error") || "Google hat keinen Code geschickt." };
  return anmeldungSenden({ anbieter: "google", code, verifier, redirect }, holen);
}

/** Ein Satz für das Profil. */
export function anmeldungText(settings = store.getSettings()) {
  if (settings.login === "apple") return "Angemeldet mit Apple. Dein Abo kommt nach einer Neuinstallation zurück.";
  if (settings.login === "google") return "Angemeldet mit Google. Dein Abo kommt nach einer Neuinstallation zurück.";
  return "Nicht angemeldet. Ohne Anmeldung hängt dein Abo an diesem Gerät und an deiner Sicherung.";
}
