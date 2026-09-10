import { berlinZeit, faelligerImpuls, impulseFuerTag, type Impuls } from "@daevo/core";
import { sendeWebPush, vapidPruefen } from "@daevo/push";
import {
  aboLoeschen,
  aboLoeschenNachId,
  aboSpeichern,
  alleAbos,
  endpunktErlaubt,
  sperren,
  type Abo,
} from "./abos.js";
import type { Env, ScheduledEvent } from "./umgebung.js";

/**
 * Der Versand der Tagesimpulse.
 *
 * Warum ein Worker und nicht GitHub Actions: dort startet ein Cron mit fünf
 * bis dreissig Minuten Verzug, gelegentlich mit mehr, und die Abos müssten von
 * Hand in ein Secret geschrieben werden. Hier stimmt die Uhrzeit, und die App
 * meldet sich selbst an.
 *
 * Der Cron läuft alle fünfzehn Minuten und rechnet die Berliner Zeit selbst
 * aus, siehe packages/core/src/zeitzone.ts. Cloudflare kennt nur UTC, und eine
 * feste UTC Zeit ginge im Winter eine Stunde falsch.
 *
 * Rechenzeit ist die knappe Grösse: der Gratis Tarif gibt 10 ms je Lauf.
 * Warten auf das Netz zählt nicht mit, Verschlüsseln und Signieren laufen
 * nativ und liegen weit darunter.
 */

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    ctx.waitUntil(versendeFaellige(env));
  },

  async fetch(anfrage: Request, env: Env): Promise<Response> {
    const url = new URL(anfrage.url);
    const kopf = corsKopf(env, anfrage);

    if (anfrage.method === "OPTIONS") return new Response(null, { status: 204, headers: kopf });

    try {
      if (url.pathname === "/schluessel" && anfrage.method === "GET") {
        // Der öffentliche Schlüssel ist nicht geheim. Der Browser braucht ihn
        // beim Anlegen des Abos, und ihn hier zu holen erspart dem Nutzer,
        // ihn von Hand abzutippen.
        return antwort({ oeffentlich: env.VAPID_PUBLIC }, 200, kopf);
      }

      if (url.pathname === "/abo" && anfrage.method === "POST") {
        return await anmelden(anfrage, env, kopf);
      }

      if (url.pathname === "/abo" && anfrage.method === "DELETE") {
        const { endpoint } = (await anfrage.json()) as { endpoint?: string };
        if (!endpoint) return antwort({ fehler: "Ohne endpoint geht nichts." }, 400, kopf);
        await aboLoeschen(env.ABOS, endpoint);
        return antwort({ ok: true }, 200, kopf);
      }

      if (url.pathname === "/probe" && anfrage.method === "POST") {
        return await probe(anfrage, env, kopf);
      }

      if (url.pathname === "/stand" && anfrage.method === "GET") {
        const abos = await alleAbos(env.ABOS);
        const { tag, zeit, versatz } = berlinZeit();
        return antwort(
          { geraete: abos.length, tag, zeit, versatz, impulse: impulseFuerTag(tag).map((i) => `${i.at} ${i.art}`) },
          200,
          kopf,
        );
      }

      return antwort({ fehler: "Diesen Weg gibt es nicht." }, 404, kopf);
    } catch (fehler) {
      return antwort({ fehler: fehler instanceof Error ? fehler.message : String(fehler) }, 500, kopf);
    }
  },
};

/* ---------- Versand ---------- */

export async function versendeFaellige(env: Env, jetzt: Date = new Date()): Promise<void> {
  const { tag, zeit } = berlinZeit(jetzt);
  const impuls = faelligerImpuls(tag, zeit);
  if (!impuls) return;

  // Der Impuls gilt nur zu seiner Minute. Der Cron läuft öfter, damit ein
  // ausgefallener Lauf nicht den ganzen Tag verschiebt, aber eine Nachricht
  // eine Viertelstunde zu spät ist keine Nachricht mehr zur richtigen Zeit.
  if (impuls.at !== zeit) return;
  if (!(await sperren(env.ABOS, tag, impuls.art))) return;

  await verschicke(env, impuls);
}

async function verschicke(env: Env, impuls: Impuls): Promise<{ zugestellt: number; geraete: number }> {
  const schluessel = { oeffentlich: env.VAPID_PUBLIC, privat: env.VAPID_PRIVATE };
  const abos = await alleAbos(env.ABOS);
  const inhalt = {
    titel: impuls.titel,
    text: impuls.text,
    // Die Marke ist die Art, nicht die Uhrzeit. Läuft der Versand doppelt,
    // ersetzt die zweite Nachricht die erste, statt sich darunter zu stapeln.
    marke: `impuls-${impuls.art}`,
    ziel: impuls.frage ? `./?impuls=${impuls.art}` : "./",
    daten: { art: impuls.art, frage: impuls.frage, at: impuls.at },
  };

  let zugestellt = 0;
  for (const { id, abo } of abos) {
    const ergebnis = await sendeWebPush({ abo, inhalt, schluessel, kontakt: env.PUSH_KONTAKT });
    if (ergebnis.ok) zugestellt++;
    // 404 und 410 heissen, dass der Browser das Abo aufgegeben hat. Es weiter
    // mitzuschleppen kostet bei jedem Versand eine Anfrage, die nie ankommt.
    else if (ergebnis.abgelaufen) await aboLoeschenNachId(env.ABOS, id);
    else console.error(`[push] ${impuls.art} status=${ergebnis.status} ${ergebnis.fehler ?? ""}`);
  }
  return { zugestellt, geraete: abos.length };
}

/* ---------- Wege ---------- */

async function anmelden(anfrage: Request, env: Env, kopf: Record<string, string>): Promise<Response> {
  if (env.ANMELDE_WORT && anfrage.headers.get("x-daevo-wort") !== env.ANMELDE_WORT) {
    return antwort({ fehler: "Das Anmeldewort stimmt nicht." }, 401, kopf);
  }
  const abo = (await anfrage.json()) as Abo;
  if (!abo?.endpoint || !abo.keys?.p256dh || !abo.keys?.auth) {
    return antwort({ fehler: "Das ist kein vollständiges Abo." }, 400, kopf);
  }
  if (!endpunktErlaubt(abo.endpoint)) {
    return antwort({ fehler: "Dieser Endpunkt gehört zu keinem bekannten Push Dienst." }, 400, kopf);
  }
  try {
    const { neu, id } = await aboSpeichern(env.ABOS, abo);
    return antwort({ ok: true, neu, id }, 200, kopf);
  } catch (fehler) {
    return antwort({ fehler: fehler instanceof Error ? fehler.message : String(fehler) }, 409, kopf);
  }
}

/**
 * Eine Nachricht sofort schicken, zum Prüfen der Einrichtung.
 *
 * Braucht das Anmeldewort, auch wenn die Anmeldung selbst offen ist. Sonst
 * könnte jeder, der die Adresse kennt, dem Nutzer den ganzen Tag Nachrichten
 * schicken.
 */
async function probe(anfrage: Request, env: Env, kopf: Record<string, string>): Promise<Response> {
  if (!env.ANMELDE_WORT || anfrage.headers.get("x-daevo-wort") !== env.ANMELDE_WORT) {
    return antwort({ fehler: "Dafür braucht es das Anmeldewort." }, 401, kopf);
  }
  await vapidPruefen({ oeffentlich: env.VAPID_PUBLIC, privat: env.VAPID_PRIVATE });

  const { tag, zeit } = berlinZeit();
  const { art } = (await anfrage.json().catch(() => ({}))) as { art?: string };
  const impuls = art
    ? impulseFuerTag(tag).find((i) => i.art === art)
    : (faelligerImpuls(tag, zeit) ?? impulseFuerTag(tag)[0]);
  if (!impuls) {
    return antwort({ fehler: `Unbekannte Art: ${art}` }, 400, kopf);
  }

  const ergebnis = await verschicke(env, impuls);
  return antwort({ ok: true, art: impuls.art, ...ergebnis }, 200, kopf);
}

/* ---------- Kleinkram ---------- */

function antwort(koerper: unknown, status: number, kopf: Record<string, string>): Response {
  return new Response(JSON.stringify(koerper), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...kopf },
  });
}

/**
 * Nur die eigene App darf den Worker aufrufen.
 *
 * Ohne diese Begrenzung kann jede fremde Seite im Browser eines Besuchers
 * Abos anlegen und löschen. Mehrere Adressen gehen durch Komma getrennt, weil
 * die App auf GitHub Pages und beim Entwickeln unter localhost läuft.
 */
function corsKopf(env: Env, anfrage: Request): Record<string, string> {
  const erlaubt = (env.HERKUNFT || "").split(",").map((h) => h.trim()).filter(Boolean);
  const herkunft = anfrage.headers.get("Origin") || "";
  const treffer = erlaubt.includes(herkunft) ? herkunft : (erlaubt[0] ?? "");
  return {
    "Access-Control-Allow-Origin": treffer,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-daevo-wort",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
