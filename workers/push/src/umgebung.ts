/**
 * Die Umgebung des Workers.
 *
 * Die Typen für KV stehen hier von Hand statt über @cloudflare/workers-types.
 * Gebraucht werden vier Aufrufe. Ein Paket mit mehreren tausend Zeilen
 * Typdeklarationen dafür in den Baum zu ziehen, lohnt nicht, und die Regel im
 * Projekt lautet, dass eine neue Abhängigkeit eine Begründung braucht.
 */

export interface KVNamespace {
  get(schluessel: string): Promise<string | null>;
  put(schluessel: string, wert: string, optionen?: { expirationTtl?: number }): Promise<void>;
  delete(schluessel: string): Promise<void>;
  list(optionen?: { prefix?: string; limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
}

export interface Env {
  /** Die Abos und die Sperre gegen Doppelversand. */
  ABOS: KVNamespace;
  VAPID_PUBLIC: string;
  VAPID_PRIVATE: string;
  /** mailto: Adresse. Der Push Dienst verlangt einen Ansprechpartner. */
  PUSH_KONTAKT: string;
  /**
   * Woher die App kommen darf. Ohne Angabe antwortet der Worker jedem, und
   * dann kann jede fremde Seite Abos anlegen und löschen.
   */
  HERKUNFT: string;
  /**
   * Optionales Wort, ohne das kein Abo angelegt wird. Leer heisst: jeder darf
   * sich anmelden. Für einen einzelnen Nutzer ist das vertretbar, sobald die
   * App öffentlich ist, gehört hier eines hin.
   */
  ANMELDE_WORT?: string;
  /**
   * "an" lässt Modellanfragen ohne Konto durch, mit den alten Grenzen je Tag
   * und Gerät. Aus ist der Standard: sonst umgeht jeder die Testphase, der
   * den Kopf mit dem Schlüssel weglässt.
   */
  OHNE_KONTO?: string;
  /** Tagesgrenze für Testphase und Anfragen ohne Konto, als Zahl. Fehlt sie, gilt TAGESGRENZE. */
  TAGESGRENZE?: string;
  /**
   * Der Anthropic Schlüssel. Nur gesetzt, wenn dieser Worker auch die
   * Modellanfragen weiterreicht, siehe chat.ts. Er liegt als Geheimnis hier
   * und geht nie an den Browser.
   */
  ANTHROPIC_KEY?: string;
  /** Bundle ID der iPhone App für Sign in with Apple, Standard de.daevo.app. */
  APPLE_AUD?: string;
  /** Google Client IDs, durch Komma getrennt: Web und iOS. Ohne sie gibt es keine Google Anmeldung. */
  GOOGLE_CLIENT_IDS?: string;
  /** Der iOS Client bei Google, für den Codeaustausch der iPhone App. */
  GOOGLE_IOS_CLIENT_ID?: string;
  /** Signaturgeheimnis des Stripe Webhooks, beginnt mit whsec_. */
  STRIPE_WEBHOOK_SECRET?: string;
  /**
   * "abo" heisst: ein neues Konto startet ohne KI, die Testphase beginnt erst
   * mit dem abgeschlossenen Abo im App Store oder bei Stripe. Fehlt der Wert,
   * bekommt jedes neue Konto sieben Tage ohne Abo, wie bisher.
   */
  TESTPHASE?: string;
}

export interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}
