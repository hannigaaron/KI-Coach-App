import type { Env, KVNamespace } from "./umgebung.js";

/**
 * Der Weg zum Modell, ohne Schlüssel im Browser.
 *
 * Eine statische Web App liefert ihren gesamten Code an jeden Besucher aus.
 * Ein eingebauter Schlüssel steht damit im Klartext im Netz, und Anthropic
 * sperrt ihn, sobald er in einer öffentlichen Quelle auftaucht. Bis dahin
 * zahlt der Betreiber fremde Aufrufe.
 *
 * Deshalb dieser Weg: der Schlüssel liegt als Geheimnis auf dem Worker, die
 * App fragt den Worker, der Worker fragt Anthropic. Im Browser liegt nichts.
 * Das ist dieselbe Bauweise, die eine native App später braucht, also kein
 * Umweg für die Demo, sondern der erste Schritt dorthin.
 *
 * Der Schutz davor, dass Fremde auf fremde Rechnung reden, hat drei Ebenen,
 * und keine davon ist allein genug:
 *
 * Erstens die Herkunft. Ein Browser schickt sie mit und kann sie nicht
 * fälschen. Das hält jede fremde Webseite ab, aber kein Skript ausserhalb
 * eines Browsers.
 *
 * Zweitens eine Obergrenze je Tag. Sie begrenzt den Schaden, wenn die Adresse
 * doch bekannt wird, statt ihn zu verhindern. Eine Grenze, die den Schaden
 * deckelt, ist mehr wert als ein Schutz, der im Ernstfall ganz versagt.
 *
 * Drittens eine Obergrenze je Gerät und Stunde. Ein einzelner Besucher, der
 * die Demo in Ruhe ausprobiert, bleibt weit darunter. Wer sie automatisiert
 * abgreift, läuft dagegen.
 *
 * Was das nicht ist: ein Ersatz für ein Konto. Sobald echte Kunden zahlen,
 * gehört hier eine Anmeldung hin und die Grenze ans Konto.
 */

const ZIEL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

/** Wie viele Anfragen der Worker am Tag insgesamt weiterreicht. */
export const TAGESGRENZE = 400;
/** Wie viele Anfragen ein einzelnes Gerät je Stunde stellen darf. */
export const GERAETEGRENZE = 40;

/** Zählt einen Zugriff und sagt, ob er noch unter der Grenze liegt. */
export async function zaehlen(
  kv: KVNamespace,
  schluessel: string,
  grenze: number,
  ttlSekunden: number,
): Promise<{ erlaubt: boolean; stand: number }> {
  const roh = await kv.get(schluessel);
  const stand = Number(roh) || 0;
  if (stand >= grenze) return { erlaubt: false, stand };
  // Die TTL wird bei jedem Schreiben neu gesetzt. Für ein Zeitfenster, das
  // ohnehin am Schlüsselnamen hängt, reicht das: der Name wechselt mit dem
  // Fenster, der alte Zähler läuft von selbst ab.
  await kv.put(schluessel, String(stand + 1), { expirationTtl: ttlSekunden });
  return { erlaubt: true, stand: stand + 1 };
}

/** Eine grobe Kennung des Geräts, aus dem, was Cloudflare mitschickt. */
export function geraeteKennung(anfrage: Request): string {
  // Die IP allein reicht: sie ist nicht eindeutig, aber sie ist das, was ein
  // Angreifer am schwersten in grosser Zahl wechselt. Ein Wert aus dem Body
  // wäre frei wählbar und damit wertlos.
  return anfrage.headers.get("CF-Connecting-IP") || "unbekannt";
}

/** Stunden- und Tagesfenster als Teil des Schlüssels. */
export function fenster(jetzt: Date = new Date()): { tag: string; stunde: string } {
  const iso = jetzt.toISOString();
  return { tag: iso.slice(0, 10), stunde: iso.slice(0, 13) };
}

export interface ChatErgebnis {
  status: number;
  koerper: BodyInit | null;
  typ: string;
}

/**
 * Reicht eine Modellanfrage weiter.
 *
 * Der Körper geht unverändert durch. Der Worker soll nicht entscheiden, was
 * gefragt wird: jede Regel hier wäre eine zweite Stelle, an der die App
 * gepflegt werden müsste, und sie würde bei jeder Änderung am Prompt brechen.
 *
 * Die Antwort geht ebenfalls unverändert zurück, auch als Datenstrom. Ohne
 * das käme die Antwort erst am Stück an, und die Blase im Chat bliebe leer,
 * bis alles fertig ist.
 */
export async function chatWeiterreichen(
  anfrage: Request,
  env: Env,
  holen: typeof fetch = fetch,
): Promise<Response> {
  if (!env.ANTHROPIC_KEY) {
    return new Response(JSON.stringify({ error: { message: "Auf diesem Worker liegt kein Schlüssel." } }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  }

  const { tag, stunde } = fenster();
  const tagesstand = await zaehlen(env.ABOS, `chat.tag.${tag}`, TAGESGRENZE, 60 * 60 * 26);
  if (!tagesstand.erlaubt) {
    return new Response(JSON.stringify({ error: { message: "Das Tageskontingent der Demo ist aufgebraucht." } }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }
  const geraet = await zaehlen(env.ABOS, `chat.ip.${stunde}.${geraeteKennung(anfrage)}`, GERAETEGRENZE, 60 * 70);
  if (!geraet.erlaubt) {
    return new Response(JSON.stringify({ error: { message: "Zu viele Anfragen von diesem Gerät. Probier es später." } }), {
      status: 429,
      headers: { "content-type": "application/json" },
    });
  }

  const koerper = await anfrage.text();
  const antwort = await holen(ZIEL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_KEY,
      "anthropic-version": API_VERSION,
    },
    body: koerper,
  });

  return new Response(antwort.body, {
    status: antwort.status,
    headers: { "content-type": antwort.headers.get("content-type") || "application/json" },
  });
}
