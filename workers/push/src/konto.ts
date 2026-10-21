import { kostenVon } from "@daevo/coach/kosten";
import type { KVNamespace } from "./umgebung.js";

/**
 * Konten und Abostufen.
 *
 * Gespeichert wird hier, wer welche Stufe hat und was er diesen Monat
 * verbraucht hat. Sonst nichts: Gespräche, Notizen, Gewicht und Kalender
 * bleiben auf dem Gerät. Ein Konto ohne Inhalte ist kein Datenschatz, und
 * genau das ist der Punkt. Gesundheitsdaten auf einem eigenen Server fallen
 * unter Art. 9 DSGVO, eine Abostufe nicht.
 *
 * Das Konto ist ein Schlüssel, den die App beim ersten Start bekommt. Keine
 * E-Mail, kein Passwort. Er liegt in den Einstellungen und geht damit in die
 * Sicherung: wer die App neu einrichtet und die Sicherung einspielt, hat sein
 * Abo wieder. Auf dem Server liegt nur sein Hash, ein ausgelesener Speicher
 * verrät also keinen gültigen Schlüssel.
 *
 * Sign in with Apple und der Kauf im App Store kommen später als zweiter Weg
 * an dieselbe Stelle: sie setzen nur die Stufe, siehe `stufeSetzen`.
 */

export interface Stufe {
  name: string;
  /** Höchstens so viele Nachrichten an das Modell im Kalendermonat. */
  nachrichten: number;
  /**
   * Höchstens so viel Modellkosten im Monat, in Millionstel Dollar. Die
   * Nachrichten allein reichen als Grenze nicht: eine Nachricht mit drei
   * Fotos auf Opus kostet ein Vielfaches einer Mahlzeit auf Haiku.
   */
  budgetMikro: number;
}

/**
 * Jedes neue Konto startet mit sieben Tagen Testphase. Danach gibt es die KI
 * nur mit Abo, der Regelpfad läuft in jeder Stufe weiter und taucht hier nicht
 * auf. "frei" heisst damit: alles ohne Modell, nichts mit.
 *
 * Preise: Plus 9,99 Euro, Pro 19,99 Euro im Monat. Gemessen am 21. Oktober
 * 2026 über den Worker kostet eine Nachricht im Schnitt rund 2 Cent: Essen
 * eintragen auf Haiku 0,1 Cent, eine Fachfrage auf Sonnet 2 bis 7 Cent, ein
 * Gespräch auf Opus 3 bis 15 Cent. Die Zahl der Nachrichten ist so gewählt,
 * dass das Budget sie bei diesem Schnitt trägt: 250 mal 2 Cent sind 5 Dollar
 * gegen 7 im Budget, 700 mal 2 Cent 14 gegen 15. Wer fast nur auf Opus redet,
 * erreicht das Budget früher, deshalb steht in der App "bis zu". Nach Steuer
 * und App Store bleiben je Abo rund 7,14 und 14,28 Euro, das Budget liegt in
 * beiden Fällen darunter.
 *
 * Gezählt wird je Nachricht des Nutzers, nicht je Anfrage, siehe
 * `x-daevo-folge` in `chat.ts`. Essen per Text und Sprache zählt gar nicht,
 * nur gegen das Budget.
 *
 * Die Testphase ist enger als Plus. Ein Konto lässt sich ohne Anmeldung
 * anlegen, und eine Testphase mit dem vollen Budget wäre für jeden, der
 * wöchentlich die App neu installiert, ein kostenloses Plus.
 */
export const STUFEN: Record<string, Stufe> = {
  frei: { name: "Ohne Abo", nachrichten: 0, budgetMikro: 0 },
  test: { name: "Testphase", nachrichten: 60, budgetMikro: 1_500_000 },
  plus: { name: "Plus", nachrichten: 250, budgetMikro: 7_000_000 },
  pro: { name: "Pro", nachrichten: 700, budgetMikro: 15_000_000 },
};

/** Wie lange die Testphase läuft, der Tag der Anlage zählt mit. */
export const TESTTAGE = 7;

export function tagPlus(tag: string, tage: number): string {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

export interface Konto {
  id: string;
  stufe: string;
  /** Bis wann eine bezahlte Stufe gilt, als Tag. Danach gilt wieder frei. */
  bis?: string;
  angelegt: string;
}

export interface Monatsverbrauch {
  nachrichten: number;
  mikro: number;
}

/** Neue Konten je Adresse und Tag. Mehr legt niemand von Hand an. */
export const NEUE_KONTEN_JE_TAG = 5;

/** SHA-256 als Hex. Auch für IP-Adressen: für eine Grenze reicht der Prüfwert. */
export async function hash(text: string): Promise<string> {
  const roh = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(roh)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function zufall(laenge: number, zeichen: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(laenge));
  return [...bytes].map((b) => zeichen[b % zeichen.length]).join("");
}

/** Ohne 0, O, 1 und l, weil jemand die Kennung abtippt oder vorliest. */
const KENNUNG_ZEICHEN = "23456789abcdefghjkmnpqrstuvwxyz";

export function monatVon(jetzt: Date = new Date()): string {
  return jetzt.toISOString().slice(0, 7);
}

/** Die Stufe, die heute wirklich gilt. Eine abgelaufene fällt auf frei zurück. */
export function geltendeStufe(konto: Konto, heute: string = new Date().toISOString().slice(0, 10)): string {
  if (!STUFEN[konto.stufe]) return "frei";
  if (konto.stufe !== "frei" && konto.bis && konto.bis < heute) return "frei";
  return konto.stufe;
}

export async function kontoAnlegen(kv: KVNamespace, jetzt: Date = new Date()): Promise<{ token: string; konto: Konto }> {
  const token = zufall(40, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
  const angelegt = jetzt.toISOString().slice(0, 10);
  const konto: Konto = { id: zufall(8, KENNUNG_ZEICHEN), stufe: "test", bis: tagPlus(angelegt, TESTTAGE - 1), angelegt };
  const h = await hash(token);
  await kv.put(`konto.${h}`, JSON.stringify(konto));
  await kv.put(`kontoid.${konto.id}`, h);
  return { token, konto };
}

/** Liest ein Konto aus dem Kopf `Authorization: Bearer ...`. Ohne gültigen Schlüssel null. */
export async function kontoAusAnfrage(kv: KVNamespace, anfrage: Request): Promise<{ konto: Konto; h: string } | null> {
  const kopf = anfrage.headers.get("authorization") || "";
  if (!kopf.startsWith("Bearer ")) return null;
  const token = kopf.slice(7).trim();
  if (token.length < 20 || token.length > 200) return null;
  const h = await hash(token);
  const roh = await kv.get(`konto.${h}`);
  if (!roh) return null;
  try {
    return { konto: JSON.parse(roh) as Konto, h };
  } catch {
    return null;
  }
}

export async function verbrauchLesen(kv: KVNamespace, id: string, monat: string = monatVon()): Promise<Monatsverbrauch> {
  const roh = await kv.get(`verbrauch.${id}.${monat}`);
  if (!roh) return { nachrichten: 0, mikro: 0 };
  try {
    const v = JSON.parse(roh) as Partial<Monatsverbrauch>;
    return { nachrichten: Number(v.nachrichten) || 0, mikro: Number(v.mikro) || 0 };
  } catch {
    return { nachrichten: 0, mikro: 0 };
  }
}

/**
 * Bucht auf den Monat. Lesen und Schreiben sind zwei Schritte, zwei
 * gleichzeitige Nachrichten desselben Kontos können sich also eine Buchung
 * wegnehmen. Bei einem Nutzer, der nacheinander schreibt, passiert das nicht,
 * und die Abweichung wäre eine Nachricht. Für Geld, das wirklich fliesst,
 * gehört hier ein Speicher mit Transaktionen hin, etwa ein Durable Object.
 */
export async function verbrauchBuchen(
  kv: KVNamespace,
  id: string,
  plus: Partial<Monatsverbrauch>,
  monat: string = monatVon(),
): Promise<Monatsverbrauch> {
  const alt = await verbrauchLesen(kv, id, monat);
  const neu = { nachrichten: alt.nachrichten + (plus.nachrichten || 0), mikro: alt.mikro + Math.round(plus.mikro || 0) };
  // 40 Tage, damit der Monat bis in den nächsten hinein nachzulesen ist und
  // danach von selbst verschwindet.
  await kv.put(`verbrauch.${id}.${monat}`, JSON.stringify(neu), { expirationTtl: 60 * 60 * 24 * 40 });
  return neu;
}

/** Ist noch etwas übrig? Gibt den Grund zurück, wenn nicht. */
export function kontingentPruefen(stufe: string, v: Monatsverbrauch): string | null {
  const s = STUFEN[stufe] ?? STUFEN.frei!;
  if (s.nachrichten === 0) return "Die Testphase ist vorbei. Die KI gibt es mit Plus oder Pro.";
  if (v.nachrichten >= s.nachrichten) {
    return `Kontingent aufgebraucht: ${s.nachrichten} Nachrichten im Monat in der Stufe ${s.name}.`;
  }
  if (v.mikro >= s.budgetMikro) {
    return `Kontingent aufgebraucht: das Monatsbudget der Stufe ${s.name} ist erreicht.`;
  }
  return null;
}

/** Setzt die Stufe eines Kontos, von Hand über das Anmeldewort oder später nach einem Kauf. */
export async function stufeSetzen(kv: KVNamespace, id: string, stufe: string, bis?: string): Promise<Konto | null> {
  if (!STUFEN[stufe]) return null;
  if (bis !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(bis)) return null;
  const h = await kv.get(`kontoid.${id}`);
  if (!h) return null;
  const roh = await kv.get(`konto.${h}`);
  if (!roh) return null;
  const konto = JSON.parse(roh) as Konto;
  konto.stufe = stufe;
  if (bis) konto.bis = bis;
  else delete konto.bis;
  await kv.put(`konto.${h}`, JSON.stringify(konto));
  return konto;
}

export interface Verbrauch {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  modell: string;
}

/**
 * Liest den Verbrauch aus der Antwort von Anthropic, als Datenstrom oder am Stück.
 *
 * Im Strom steht er an zwei Stellen: `message_start` trägt die Eingabe,
 * `message_delta` am Ende die endgültige Ausgabe. Beide werden genommen,
 * jeweils der grössere Wert, weil die Ausgabe dort fortlaufend gezählt wird.
 */
export function verbrauchAusAntwort(text: string, modell: string): Verbrauch | null {
  const v: Verbrauch = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, modell };
  let gefunden = false;
  const nehmen = (u: Record<string, unknown> | undefined) => {
    if (!u) return;
    gefunden = true;
    v.inputTokens = Math.max(v.inputTokens, Number(u.input_tokens) || 0);
    v.outputTokens = Math.max(v.outputTokens, Number(u.output_tokens) || 0);
    v.cacheReadTokens = Math.max(v.cacheReadTokens, Number(u.cache_read_input_tokens) || 0);
    v.cacheWriteTokens = Math.max(v.cacheWriteTokens, Number(u.cache_creation_input_tokens) || 0);
  };
  const ganz = text.trimStart();
  if (ganz.startsWith("{")) {
    try {
      nehmen((JSON.parse(ganz) as { usage?: Record<string, unknown> }).usage);
    } catch {
      return null;
    }
    return gefunden ? v : null;
  }
  for (const zeile of text.split("\n")) {
    if (!zeile.startsWith("data:")) continue;
    try {
      const ereignis = JSON.parse(zeile.slice(5).trim()) as {
        type?: string;
        message?: { usage?: Record<string, unknown> };
        usage?: Record<string, unknown>;
      };
      if (ereignis.type === "message_start") nehmen(ereignis.message?.usage);
      if (ereignis.type === "message_delta") nehmen(ereignis.usage);
    } catch {
      // Eine kaputte Zeile kostet die Zählung dieser einen Zeile, nicht die Antwort
    }
  }
  return gefunden ? v : null;
}

/** Kosten in Millionstel Dollar, über dieselbe Preistabelle wie in der App. */
export function kostenMikro(v: Verbrauch): number {
  return Math.round(kostenVon(v) * 1_000_000);
}
