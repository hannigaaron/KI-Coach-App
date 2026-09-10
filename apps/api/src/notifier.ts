import { sendeWebPush, vapidPruefen, type PushAbo, type VapidSchluessel } from "@daevo/push";

export interface PushMessage {
  userId: string;
  title: string;
  body: string;
  kind: string;
}

export interface Notifier {
  send(message: PushMessage, deviceTokens: string[]): Promise<void>;
}

/**
 * Platzhalter für den Versand.
 *
 * Der echte Versand läuft später über APNs für iOS und Apple Watch.
 * Dafuer braucht es ein Apple Developer Programm Konto, einen APNs Auth Key
 * und einen signierten JWT je Anfrage. Solange das nicht eingerichtet ist,
 * schreibt der Scheduler die fälligen Nachrichten nur ins Log, damit die
 * Zeitsteuerung trotzdem testbar ist.
 * Siehe docs/ARCHITEKTUR.md, Abschnitt Push.
 */
export class ConsoleNotifier implements Notifier {
  readonly sent: PushMessage[] = [];

  async send(message: PushMessage, deviceTokens: string[]): Promise<void> {
    this.sent.push(message);
    console.log(
      `[push] user=${message.userId} kind=${message.kind} geräte=${deviceTokens.length} titel="${message.title}"`,
    );
  }
}

/**
 * Der echte Versand über Web Push.
 *
 * Ein Gerätetoken ist hier das Abo aus dem Browser als JSON, so wie es
 * `PushSubscription.toJSON()` ausgibt. Ein Token, das sich nicht lesen lässt,
 * wird übersprungen und gemeldet: eine Ausnahme würde den ganzen Durchlauf
 * abbrechen und damit alle anderen Nutzer mit.
 *
 * Verschlüsselung und Signatur stehen in `packages/push`, geprüft gegen den
 * Testvektor aus RFC 8291.
 */
export class WebPushNotifier implements Notifier {
  private constructor(
    private readonly schluessel: VapidSchluessel,
    private readonly kontakt: string,
  ) {}

  /**
   * Legt den Versender an und prüft dabei die Schlüssel.
   *
   * Eigene Funktion statt eines Konstruktors, weil die Prüfung über WebCrypto
   * läuft und damit asynchron ist. Ein Schlüsselpaar, das nicht zusammenpasst,
   * soll beim Start auffallen und nicht bei der ersten Erinnerung.
   */
  static async erstellen(schluessel: VapidSchluessel, kontakt: string): Promise<WebPushNotifier> {
    await vapidPruefen(schluessel);
    return new WebPushNotifier(schluessel, kontakt);
  }

  async send(message: PushMessage, deviceTokens: string[]): Promise<void> {
    for (const token of deviceTokens) {
      let abo: PushAbo;
      try {
        abo = JSON.parse(token);
      } catch {
        console.error(`[push] user=${message.userId}: Gerätetoken ist kein gültiges JSON.`);
        continue;
      }
      if (!abo?.endpoint || !abo.keys?.p256dh || !abo.keys?.auth) {
        console.error(`[push] user=${message.userId}: Gerätetoken hat nicht die Form eines Abos.`);
        continue;
      }

      const ergebnis = await sendeWebPush({
        abo,
        inhalt: { titel: message.title, text: message.body, marke: `erinnerung-${message.kind}`, ziel: "./" },
        schluessel: this.schluessel,
        kontakt: this.kontakt,
      });
      if (!ergebnis.ok) {
        console.error(
          `[push] user=${message.userId} kind=${message.kind} status=${ergebnis.status}` +
            `${ergebnis.abgelaufen ? " Abo abgelaufen, gehört gelöscht." : ` ${ergebnis.fehler ?? ""}`}`,
        );
      }
    }
  }
}
