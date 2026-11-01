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
    if (ergebnis.kalender) {
      merken({ appleKalender: true });
      // Gleich nachsehen, welche Konten iOS kennt. Eine ältere Hülle ohne
      // diese Methode wirft, dann fehlt nur der Hinweis.
      try {
        ergebnis.konten = kontenAus(await aufruf("Kalender", "konten", {}));
        merken({ kalenderKonten: ergebnis.konten });
      } catch { /* ohne Liste kein Hinweis */ }
    }
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

const ART_NAME = { google: "Google", icloud: "iCloud", outlook: "Outlook", abo: "Abos", lokal: "Auf dem iPhone", andere: "" };

/** Die Antwort des Plugins in eine saubere Liste, Google und iCloud vorn. */
export function kontenAus(antwort) {
  const rang = { google: 0, icloud: 1, outlook: 2, andere: 3, abo: 4, lokal: 5 };
  return (Array.isArray(antwort?.konten) ? antwort.konten : [])
    .filter((k) => k && typeof k.name === "string" && Number(k.kalender) > 0)
    .map((k) => ({ name: k.name, art: ART_NAME[k.art] !== undefined ? k.art : "andere", kalender: Number(k.kalender) }))
    .sort((a, b) => rang[a.art] - rang[b.art] || a.name.localeCompare(b.name));
}

/**
 * Was gefunden wurde, und wenn kein Google oder Outlook dabei ist, wie man es
 * hinzufügt. Eine App darf in iOS keinen Account anlegen. Wer Google nur im
 * Browser nutzt, hat sonst einen leeren Kalender in daevo und weiss nicht,
 * warum.
 */
export function kontenText(konten) {
  if (!Array.isArray(konten)) return "";
  const teile = konten.map((k) => {
    const art = ART_NAME[k.art];
    const name = art && art !== k.name && !k.name.toLowerCase().includes(art.toLowerCase()) ? `${art} (${k.name})` : (art || k.name);
    return `${name} mit ${k.kalender} ${k.kalender === 1 ? "Kalender" : "Kalendern"}`;
  });
  const gefunden = teile.length ? `Verbunden: ${teile.join(", ")}.` : "Auf diesem iPhone ist noch kein Kalender eingerichtet.";
  const fremd = konten.some((k) => k.art === "google" || k.art === "outlook");
  const weg = " Nutzt du Google oder Outlook? Füg das Konto in den iOS Einstellungen hinzu: Apps, Kalender, "
    + "Kalender-Accounts, Account hinzufügen. daevo liest es danach von selbst.";
  return gefunden + (fremd ? "" : weg);
}
