/**
 * Die Einwilligung, bevor etwas an die KI geht.
 *
 * Über den eigenen Server gehen Nachrichten mit Gesundheitsdaten an
 * Anthropic in den USA. Das sind besondere Daten nach Art. 9 DSGVO, und dafür
 * braucht es eine ausdrückliche Einwilligung, bevor die erste Anfrage rausgeht.
 * Apple verlangt dasselbe, wenn eine App persönliche Daten an eine fremde KI
 * schickt.
 *
 * Mit eigenem Schlüssel in der Entwicklerfassung fragt die App nicht: dort
 * sind Nutzer und Betreiber dieselbe Person, und die Daten gehen unter deren
 * eigenem Vertrag an Anthropic.
 *
 * `FASSUNG` steigt, wenn sich ändert, was an die KI geht. Eine Zustimmung zu
 * einer älteren Fassung gilt dann nicht mehr, und die App fragt neu.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
export const EINWILLIGUNG_FASSUNG = 1;

/** Braucht diese Fassung der App überhaupt eine Einwilligung? */
export function einwilligungGefragt(konfig) {
  return Boolean(konfig?.chatUrl);
}

/** Hat der Nutzer der aktuellen Fassung zugestimmt? */
export function kiErlaubt(settings, konfig) {
  if (!einwilligungGefragt(konfig)) return true;
  const e = settings?.kiEinwilligung;
  return Boolean(e?.ja && e.fassung >= EINWILLIGUNG_FASSUNG);
}

/**
 * Muss die App jetzt fragen? Nein, wenn schon zugestimmt ist, und nein, wenn
 * der Nutzer zu dieser Fassung schon abgelehnt hat: eine Frage, die nach jedem
 * Nein wiederkommt, wird irgendwann mit Ja weggedrückt, und das ist keine
 * freiwillige Einwilligung mehr.
 */
export function einwilligungOffen(settings, konfig) {
  if (!einwilligungGefragt(konfig)) return false;
  const e = settings?.kiEinwilligung;
  return !e || e.fassung < EINWILLIGUNG_FASSUNG;
}

/** Der neue Stand für die Einstellungen. */
export function einwilligungSetzen(settings, ja, jetzt = new Date()) {
  return { ...settings, kiEinwilligung: { ja: Boolean(ja), fassung: EINWILLIGUNG_FASSUNG, am: jetzt.toISOString() } };
}

/** Ein Satz für das Profil. */
export function einwilligungText(settings, konfig) {
  if (!einwilligungGefragt(konfig)) return "Du nutzt einen eigenen Schlüssel. Nachrichten gehen direkt unter deinem Vertrag an Anthropic.";
  const e = settings?.kiEinwilligung;
  if (!e) return "Noch nicht gefragt. daevo fragt dich vor der ersten Antwort mit KI.";
  const tag = new Date(e.am).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  if (e.ja && e.fassung >= EINWILLIGUNG_FASSUNG) return `Erteilt am ${tag}. Nachrichten, die die KI braucht, gehen über den Server von daevo an Anthropic.`;
  if (e.ja) return "Die Angaben haben sich geändert. daevo fragt dich vor der nächsten Antwort mit KI neu.";
  return `Nicht erteilt, seit ${tag}. daevo antwortet nur mit dem, was ohne KI geht.`;
}
