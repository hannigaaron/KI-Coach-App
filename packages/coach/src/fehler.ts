/**
 * Aus einem Fehler beim Modellaufruf einen Satz machen, mit dem der Nutzer
 * etwas anfangen kann.
 *
 * Vorher stand an dieser Stelle immer derselbe Satz: "Der Coach ist gerade
 * nicht erreichbar, ich habe es regelbasiert erledigt." Das ist keine
 * Diagnose, sondern eine Entschuldigung. Wer ihn zehnmal liest, weiss danach
 * genauso wenig wie vorher, und die eigentliche Meldung von Anthropic, die
 * den Grund nennt, wurde dabei weggeworfen.
 *
 * Jede Zeile hier nennt die Ursache und was zu tun ist. Wo der Grund nicht
 * eindeutig ist, steht das da, statt einen zu erfinden.
 */

export interface Fehlerdeutung {
  /** Was los ist und was zu tun ist. Steht so in der Antwort. */
  text: string;
  /**
   * Hilft ein erneuter Versuch. Bei einem falschen Schlüssel nicht, bei einer
   * überlasteten Schnittstelle schon.
   */
  nochmal: boolean;
  /** Kurzform für die Protokollierung. */
  art:
    | "schluessel"
    | "guthaben"
    | "limit"
    | "ueberlastet"
    | "netz"
    | "modell"
    | "zu_gross"
    | "unbekannt";
}

/** Liest den HTTP Status aus einer Meldung der Form "Anthropic API 401: ...". */
function statusAus(meldung: string): number | null {
  const treffer = /Anthropic API (\d{3})/.exec(meldung);
  return treffer ? Number(treffer[1]) : null;
}

export function fehlerErklaerung(fehler: unknown): Fehlerdeutung {
  const meldung = fehler instanceof Error ? fehler.message : String(fehler);
  const status = statusAus(meldung);
  const klein = meldung.toLowerCase();

  // Netzfehler zuerst. fetch wirft dabei einen TypeError ohne Status, und im
  // Browser sieht ein blockierter Aufruf genauso aus wie ein fehlendes Netz.
  if (status === null && /failed to fetch|networkerror|load failed|fetch failed/i.test(meldung)) {
    return {
      art: "netz",
      nochmal: true,
      text:
        "Ich komme gerade nicht ins Netz. Prüf deine Verbindung. "
        + "Bleibt es dabei, obwohl andere Seiten laden, blockiert etwas den Zugriff auf die Schnittstelle.",
    };
  }

  if (status === 401 || status === 403) {
    return {
      art: "schluessel",
      nochmal: false,
      text:
        "Dein API Schlüssel wird abgelehnt. Er ist falsch, abgelaufen oder gelöscht. "
        + "Trag im Profil unter Den echten Coach freischalten einen gültigen ein und lass ihn dort prüfen.",
    };
  }

  if (status === 400 && /credit|balance|guthaben|insufficient/i.test(klein)) {
    return {
      art: "guthaben",
      nochmal: false,
      text:
        "Der Schlüssel gilt, aber auf dem Konto ist kein Guthaben mehr. "
        + "Lad bei Anthropic unter Billing auf, danach läuft es sofort weiter.",
    };
  }

  if (status === 429) {
    return {
      art: "limit",
      nochmal: true,
      text: "Zu viele Anfragen in kurzer Zeit. Warte eine Minute und schick es nochmal.",
    };
  }

  if (status === 529 || (status !== null && status >= 500)) {
    return {
      art: "ueberlastet",
      nochmal: true,
      text: "Die Schnittstelle ist gerade überlastet. Das legt sich meist nach ein paar Minuten von selbst.",
    };
  }

  if (status === 404 || /model/i.test(klein) && status === 400) {
    return {
      art: "modell",
      nochmal: false,
      text:
        "Das eingestellte Modell gibt es unter diesem Namen nicht oder dein Konto hat keinen Zugriff darauf. "
        + "Stell im Profil unter Modell auf Automatisch.",
    };
  }

  if (status === 413 || /too large|request_too_large|prompt is too long/i.test(klein)) {
    return {
      art: "zu_gross",
      nochmal: false,
      text:
        "Die Anfrage ist zu gross. Das passiert bei sehr langen Gesprächen oder grossen Anhängen. "
        + "Fang ein neues Gespräch an oder schick weniger Bilder auf einmal.",
    };
  }

  // Kein bekanntes Muster. Dann kommt die Meldung im Original mit, gekürzt.
  // Eine erfundene Ursache wäre schlimmer als eine technische Zeile: mit der
  // lässt sich wenigstens suchen.
  const kurz = meldung.replace(/\s+/g, " ").trim().slice(0, 200);
  return {
    art: "unbekannt",
    nochmal: true,
    text: `Der Aufruf ist gescheitert${status ? `, Status ${status}` : ""}. Die Meldung lautet: ${kurz}`,
  };
}
