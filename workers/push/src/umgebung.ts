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
}

export interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}
