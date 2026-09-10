import { nutzlastVerschluesseln, type PushAbo } from "./verschluesselung.js";
import { vapidHeader, type VapidSchluessel } from "./vapid.js";

export interface PushInhalt {
  titel: string;
  text: string;
  /**
   * Ersetzt eine ältere Nachricht mit derselben Marke, statt sich darunter zu
   * stapeln. Ein doppelt gestarteter Cron erzeugt so keine zweite Nachricht.
   */
  marke?: string;
  /** Wohin der Tipp auf die Nachricht führt, relativ zur App. */
  ziel?: string;
  /** Beliebige Zusatzdaten für den Service Worker. */
  daten?: Record<string, unknown>;
}

export interface Versandergebnis {
  endpunkt: string;
  status: number;
  ok: boolean;
  /**
   * Das Abo ist beim Push Dienst nicht mehr gültig, 404 oder 410. Es gehört
   * gelöscht. Alles andere kann ein vorübergehender Fehler sein.
   */
  abgelaufen: boolean;
  fehler?: string;
}

/**
 * Schickt eine Nachricht an ein Abo.
 *
 * TTL 4 Stunden: ein Impuls für den Nachmittag hilft am nächsten Morgen
 * nicht mehr. Dringlichkeit normal, damit ein iPhone im Stromsparmodus die
 * Nachricht trotzdem zustellt.
 */
export async function sendeWebPush(params: {
  abo: PushAbo;
  inhalt: PushInhalt;
  schluessel: VapidSchluessel;
  kontakt: string;
  ttlSekunden?: number;
  fetchImpl?: typeof fetch;
}): Promise<Versandergebnis> {
  const koerper = nutzlastVerschluesseln(params.abo, JSON.stringify(params.inhalt));
  const doFetch = params.fetchImpl ?? fetch;

  try {
    const antwort = await doFetch(params.abo.endpoint, {
      method: "POST",
      headers: {
        Authorization: vapidHeader({
          endpunkt: params.abo.endpoint,
          schluessel: params.schluessel,
          kontakt: params.kontakt,
        }),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(params.ttlSekunden ?? 4 * 60 * 60),
        Urgency: "normal",
      },
      body: koerper,
    });

    const abgelaufen = antwort.status === 404 || antwort.status === 410;
    const ergebnis: Versandergebnis = {
      endpunkt: params.abo.endpoint,
      status: antwort.status,
      ok: antwort.status >= 200 && antwort.status < 300,
      abgelaufen,
    };
    if (!ergebnis.ok) ergebnis.fehler = (await antwort.text().catch(() => "")).slice(0, 300);
    return ergebnis;
  } catch (error) {
    return {
      endpunkt: params.abo.endpoint,
      status: 0,
      ok: false,
      abgelaufen: false,
      fehler: error instanceof Error ? error.message : String(error),
    };
  }
}
