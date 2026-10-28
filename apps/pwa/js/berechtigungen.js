/**
 * Fragt beim ersten Start in der iPhone App einmal nach jedem Zugriff, den
 * daevo braucht: Kalender, Apple Health, Mitteilungen, Mikrofon und
 * Spracherkennung.
 *
 * Vorher kam jede Frage erst, wenn die Funktion zum ersten Mal gebraucht
 * wurde. Der Kalender kam damit nie, wenn niemand im Profil auf Verbinden
 * tippte, und das Mikrofon mitten im ersten Diktat. Wer die App gerade
 * installiert hat, erwartet die Fragen am Anfang und beantwortet sie dort.
 *
 * Nacheinander und nicht gleichzeitig: zwei Abfragen von iOS auf einmal, und
 * die zweite geht unter der ersten verloren. Eine Absage hält die übrigen
 * nicht auf. iOS fragt nie zweimal nach demselben Zugriff, wer schon
 * entschieden hat, sieht für diesen Punkt nichts.
 *
 * Fasst weder `document` noch `window` an, damit der Test ohne Browser läuft.
 */
import { HEALTH_FASSUNG } from "./healthkit.js";

/** Die Reihenfolge, in der gefragt wird. Kalender zuerst, er trägt den Tag. */
export const ZUGRIFFE = ["kalender", "gesundheit", "mitteilungen", "sprache"];

/** Ob die Fragen noch ausstehen. Einmal je Installation. */
export function berechtigungenOffen(settings) {
  return !settings?.berechtigungenGefragt;
}

/**
 * Stellt die Fragen und merkt sich die Antworten. Gibt zurück, was erlaubt
 * wurde, je Zugriff ein Ja oder Nein.
 */
export async function berechtigungenFragen({ aufruf, store }) {
  const ergebnis = {};
  const merken = (felder) => store.setSettings({ ...store.getSettings(), ...felder });

  try {
    const r = await aufruf("Kalender", "berechtigen", {});
    ergebnis.kalender = Boolean(r?.erlaubt);
    // Nur ein Ja verbindet. Ein Nein lässt eine bestehende Verbindung in
    // Ruhe, die trennt man im Profil.
    if (ergebnis.kalender) merken({ appleKalender: true });
  } catch { ergebnis.kalender = false; }

  try {
    await aufruf("Gesundheit", "berechtigen");
    // iOS sagt aus Datenschutzgründen nicht, ob Lesen erlaubt wurde. Gemerkt
    // wird deshalb nur, dass gefragt wurde, mit der Fassung der Typen, sonst
    // fragt der Abgleich danach gleich noch einmal.
    ergebnis.gesundheit = true;
    merken({ healthNativGefragt: true, healthNativFassung: HEALTH_FASSUNG });
  } catch { ergebnis.gesundheit = false; }

  try {
    const r = await aufruf("Mitteilungen", "berechtigen");
    ergebnis.mitteilungen = Boolean(r?.erlaubt);
    merken({ mitteilungenGefragt: true, mitteilungenErlaubt: ergebnis.mitteilungen });
  } catch { ergebnis.mitteilungen = false; }

  try {
    const r = await aufruf("Diktat", "berechtigen");
    ergebnis.sprache = Boolean(r?.mikrofon && r?.erkennung);
  } catch { ergebnis.sprache = false; }

  merken({ berechtigungenGefragt: true });
  return ergebnis;
}

/** Ein Satz für die Meldung danach. Nennt nur, was fehlt, und wo es geht. */
export function berechtigungenText(ergebnis) {
  const namen = { kalender: "Kalender", gesundheit: "Apple Health", mitteilungen: "Mitteilungen", sprache: "Mikrofon" };
  const fehlt = ZUGRIFFE.filter((z) => ergebnis[z] === false).map((z) => namen[z]);
  if (!fehlt.length) return "";
  return `Ohne Zugriff: ${fehlt.join(", ")}. Ändern kannst du das in den iOS Einstellungen unter daevo.`;
}
