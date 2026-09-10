import type { KVNamespace } from "./umgebung.js";

/**
 * Die Abos im Schlüsselspeicher.
 *
 * Je Abo ein eigener Eintrag, nicht alle zusammen in einem. Bei einer
 * gemeinsamen Liste müsste jedes Anmelden lesen, ändern und zurückschreiben,
 * und zwei gleichzeitige Anmeldungen würden sich gegenseitig überschreiben.
 * Ein abgelaufenes Abo ist so ausserdem ein einzelnes Löschen.
 */

export interface Abo {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

const PRAEFIX = "abo:";

/**
 * Höchstens so viele Geräte. Der Gratis Tarif erlaubt tausend Schreibvorgänge
 * am Tag, und jeder Versand liest jedes Abo. Eine offene Anmeldung ohne
 * Obergrenze wäre eine Einladung, den Speicher vollzuschreiben.
 */
export const MAX_ABOS = 50;

/**
 * Die Push Dienste, deren Endpunkte angenommen werden.
 *
 * Ein Abo zeigt immer auf den Dienst des Browsers. Ein beliebiger Endpunkt in
 * der Liste hiesse, dass der Worker auf Zuruf Anfragen an fremde Adressen
 * schickt, und das ist eine offene Weiterleitung.
 */
const DIENSTE = [
  "web.push.apple.com",
  "updates.push.services.mozilla.com",
  "fcm.googleapis.com",
  "wns2-*.notify.windows.com",
];

export function endpunktErlaubt(endpunkt: string): boolean {
  let url: URL;
  try {
    url = new URL(endpunkt);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  return DIENSTE.some((muster) => {
    if (!muster.includes("*")) return url.hostname === muster;
    const [vorn, hinten] = muster.split("*") as [string, string];
    return url.hostname.startsWith(vorn) && url.hostname.endsWith(hinten);
  });
}

/** Eine kurze, stabile Kennung für einen Endpunkt. */
export async function aboId(endpunkt: string): Promise<string> {
  const roh = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpunkt));
  return [...new Uint8Array(roh).subarray(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function aboSpeichern(kv: KVNamespace, abo: Abo): Promise<{ neu: boolean; id: string }> {
  const id = await aboId(abo.endpoint);
  const vorhanden = await kv.get(PRAEFIX + id);
  if (!vorhanden) {
    const { keys } = await kv.list({ prefix: PRAEFIX, limit: MAX_ABOS + 1 });
    if (keys.length >= MAX_ABOS) throw new Error(`Mehr als ${MAX_ABOS} Geräte gehen nicht.`);
  }
  await kv.put(PRAEFIX + id, JSON.stringify({ endpoint: abo.endpoint, keys: abo.keys }));
  return { neu: !vorhanden, id };
}

export async function aboLoeschen(kv: KVNamespace, endpunkt: string): Promise<void> {
  await kv.delete(PRAEFIX + (await aboId(endpunkt)));
}

/** Alle Abos. Ein Eintrag, der sich nicht lesen lässt, wird übergangen. */
export async function alleAbos(kv: KVNamespace): Promise<Array<{ id: string; abo: Abo }>> {
  const { keys } = await kv.list({ prefix: PRAEFIX, limit: MAX_ABOS });
  const aus: Array<{ id: string; abo: Abo }> = [];
  for (const eintrag of keys) {
    const roh = await kv.get(eintrag.name);
    if (!roh) continue;
    try {
      const abo = JSON.parse(roh) as Abo;
      if (abo?.endpoint && abo.keys?.p256dh && abo.keys?.auth) {
        aus.push({ id: eintrag.name.slice(PRAEFIX.length), abo });
      }
    } catch {
      // Ein kaputter Eintrag darf den Versand an alle anderen nicht aufhalten.
    }
  }
  return aus;
}

export async function aboLoeschenNachId(kv: KVNamespace, id: string): Promise<void> {
  await kv.delete(PRAEFIX + id);
}

/**
 * Sperrt einen Impuls für diesen Tag. Gibt false zurück, wenn er schon raus ist.
 *
 * Der Speicher ist nur mit Verzögerung überall gleich. Für zwei Läufe, die im
 * selben Moment starten, reicht die Sperre deshalb nicht sicher. Sie greift
 * gegen den Fall, der wirklich vorkommt: ein Lauf von Hand neben dem Cron.
 */
export async function sperren(kv: KVNamespace, tag: string, art: string): Promise<boolean> {
  const schluessel = `raus:${tag}:${art}`;
  if (await kv.get(schluessel)) return false;
  // Zwei Tage Haltbarkeit, danach räumt der Speicher selbst auf.
  await kv.put(schluessel, new Date().toISOString(), { expirationTtl: 2 * 24 * 60 * 60 });
  return true;
}
