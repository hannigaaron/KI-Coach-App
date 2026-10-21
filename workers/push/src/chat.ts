import {
  geltendeStufe,
  hash,
  kontingentPruefen,
  kontoAusAnfrage,
  kostenMikro,
  verbrauchAusAntwort,
  verbrauchBuchen,
  verbrauchLesen,
} from "./konto.js";
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
 * Ohne Konto gibt es keine Antwort, ausser OHNE_KONTO steht auf "an". Mit
 * Konto gilt statt der Gerätegrenze das Kontingent der Abostufe, siehe
 * konto.ts. Die Tagesgrenze gilt weiter für die Testphase: Konten lassen sich
 * ohne Anmeldung anlegen, und ohne diese Grenze wären hundert neue Konten
 * hundert Testphasen auf Rechnung des Betreibers.
 */

const ZIEL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

/** Wie viele Anfragen der Worker am Tag insgesamt weiterreicht. */
export const TAGESGRENZE = 400;
/** Wie viele Anfragen ein einzelnes Gerät je Stunde stellen darf. */
export const GERAETEGRENZE = 40;
/**
 * Wie viele Anfragen ein Konto je Stunde stellen darf. Eine Nachricht mit
 * Werkzeug sind bis zu vier Anfragen, 150 heissen also rund vierzig
 * Nachrichten. Ein Mensch, der viel diktiert, schafft das in einer Stunde
 * nicht. Ein Skript mit einem abgegriffenen Schlüssel schafft es in einer
 * Minute. Vorher stand hier 60, und damit war nach zwanzig Nachrichten mit
 * Werkzeug Schluss, mitten im Gespräch.
 */
export const KONTO_STUNDENGRENZE = 150;

/**
 * Ob eine Anfrage zu einer Nachricht gehört, die schon gezählt ist.
 *
 * Die App setzt den Kopf ab der zweiten Anfrage derselben Nachricht. Eine
 * gefälschte Folge spart nur die Zählung der Nachricht: das Budget in Dollar
 * und die Stundengrenze gelten trotzdem, und die schützen das Geld.
 */
export function istFolge(anfrage: Request): boolean {
  return anfrage.headers.get("x-daevo-folge") === "1";
}

function fehlerAntwort(status: number, message: string, type?: string): Response {
  return new Response(JSON.stringify({ error: type ? { type, message } : { message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

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
  warten?: (p: Promise<unknown>) => void,
): Promise<Response> {
  // Getrimmt, weil ein Schlüssel von Hand eingefügt wird. Ein angehängter
  // Zeilenumbruch oder ein Leerzeichen bleibt beim Einfügen unsichtbar, geht
  // aber in den Kopf und führt zu "invalid x-api-key". Der Fehler sieht dann
  // nach einem falschen Schlüssel aus, und man legt einen neuen an, der
  // genauso scheitert.
  const schluessel = (env.ANTHROPIC_KEY || "").trim();
  if (!schluessel) return fehlerAntwort(503, "Auf diesem Worker liegt kein Schlüssel.");

  const { tag, stunde } = fenster();
  // Ein unbekannter Schlüssel fällt auf den Weg ohne Konto zurück, statt
  // abgewiesen zu werden. Die App merkt es an GET /konto und legt neu an,
  // und bis dahin redet der Nutzer weiter, statt vor einer Fehlermeldung zu
  // sitzen, an der er nichts ändern kann.
  const gefunden = await kontoAusAnfrage(env.ABOS, anfrage);
  const folge = istFolge(anfrage);
  const stufe = gefunden ? geltendeStufe(gefunden.konto) : null;
  if (!gefunden && env.OHNE_KONTO !== "an") {
    return fehlerAntwort(401, "Ohne Konto gibt es keine KI. Die App legt beim Start eins an.", "konto");
  }

  if (gefunden && stufe) {
    const stand = await verbrauchLesen(env.ABOS, gefunden.konto.id);
    // Eine Folge prüft nur das Budget. Sonst bräche die letzte erlaubte
    // Nachricht mitten im Werkzeugaufruf ab, und die Mahlzeit stünde halb da.
    const grund = kontingentPruefen(stufe, folge ? { ...stand, nachrichten: 0 } : stand);
    // 402 und nicht 429: ein erneuter Versuch hilft hier nicht, erst der
    // nächste Monat oder eine andere Stufe.
    if (grund) return fehlerAntwort(402, grund, "kontingent");
    const proStunde = await zaehlen(env.ABOS, `chat.konto.${stunde}.${gefunden.konto.id}`, KONTO_STUNDENGRENZE, 60 * 70);
    if (!proStunde.erlaubt) return fehlerAntwort(429, "Zu viele Anfragen in dieser Stunde. Probier es gleich nochmal.");
  }

  // Die Testphase zählt gegen die Tagesgrenze, ein bezahltes Abo nicht.
  // Gezählt werden Nachrichten und keine Folgeanfragen, sonst reichten 400
  // für rund 130 Nachrichten aller Testkonten zusammen.
  if ((!stufe || stufe === "test") && !folge) {
    const tagesstand = await zaehlen(env.ABOS, `chat.tag.${tag}`, Number(env.TAGESGRENZE) || TAGESGRENZE, 60 * 60 * 26);
    if (!tagesstand.erlaubt) return fehlerAntwort(429, "Das Tageskontingent der Demo ist aufgebraucht.");
  }
  if (!gefunden) {
    const geraet = await zaehlen(env.ABOS, `chat.ip.${stunde}.${await hash(geraeteKennung(anfrage))}`, GERAETEGRENZE, 60 * 70);
    if (!geraet.erlaubt) return fehlerAntwort(429, "Zu viele Anfragen von diesem Gerät. Probier es später.");
  }

  const koerper = await anfrage.text();
  const antwort = await holen(ZIEL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": schluessel,
      "anthropic-version": API_VERSION,
    },
    body: koerper,
  });

  const typ = antwort.headers.get("content-type") || "application/json";
  if (!gefunden || !antwort.ok || !antwort.body) {
    return new Response(antwort.body, { status: antwort.status, headers: { "content-type": typ } });
  }

  // Der Strom wird geteilt: ein Zweig geht sofort an die App, der andere wird
  // nach dem Ende gelesen und gebucht. Gezählt wird erst dann, weil die
  // Ausgabetoken erst im letzten Ereignis feststehen. Eine gescheiterte
  // Anfrage kostet keine Nachricht aus dem Kontingent.
  const [fuerApp, fuerZaehlung] = antwort.body.tee();
  const modell = modellAus(koerper);
  const buchung = new Response(fuerZaehlung)
    .text()
    .then((text) => {
      const v = verbrauchAusAntwort(text, modell);
      return verbrauchBuchen(env.ABOS, gefunden.konto.id, { nachrichten: folge ? 0 : 1, mikro: v ? kostenMikro(v) : 0 });
    })
    .catch(() => undefined);
  if (warten) warten(buchung);

  return new Response(fuerApp, { status: antwort.status, headers: { "content-type": typ } });
}

function modellAus(koerper: string): string {
  try {
    const m = (JSON.parse(koerper) as { model?: unknown }).model;
    return typeof m === "string" ? m : "";
  } catch {
    return "";
  }
}
