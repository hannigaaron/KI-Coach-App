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
 * Platzhalter fuer den Versand.
 *
 * Der echte Versand laeuft spaeter ueber APNs fuer iOS und Apple Watch.
 * Dafuer braucht es ein Apple Developer Programm Konto, einen APNs Auth Key
 * und einen signierten JWT je Anfrage. Solange das nicht eingerichtet ist,
 * schreibt der Scheduler die faelligen Nachrichten nur ins Log, damit die
 * Zeitsteuerung trotzdem testbar ist.
 * Siehe docs/ARCHITEKTUR.md, Abschnitt Push.
 */
export class ConsoleNotifier implements Notifier {
  readonly sent: PushMessage[] = [];

  async send(message: PushMessage, deviceTokens: string[]): Promise<void> {
    this.sent.push(message);
    console.log(
      `[push] user=${message.userId} kind=${message.kind} geraete=${deviceTokens.length} titel="${message.title}"`,
    );
  }
}
