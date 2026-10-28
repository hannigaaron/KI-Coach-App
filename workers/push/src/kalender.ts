/**
 * Abruf einer Kalenderadresse im iCal Format für die App.
 *
 * Google, iCloud und Outlook geben je Kalender eine geheime Adresse aus. Der
 * Browser darf sie nicht direkt lesen, die Dienste senden keinen CORS Kopf.
 * Der Worker holt die Datei und reicht sie unverändert durch. Gespeichert
 * wird nichts, weder Adresse noch Inhalt.
 *
 * Nur bekannte Kalenderdienste und nur mit Konto. Ohne die Liste wäre der
 * Worker eine offene Weiterleitung, die auf Zuruf beliebige Adressen abruft.
 */

const ERLAUBT: RegExp[] = [
  /^calendar\.google\.com$/,
  /^p\d+-caldav\.icloud\.com$/,
  /^p\d+-calendars\.icloud\.com$/,
  /^outlook\.live\.com$/,
  /^outlook\.office365\.com$/,
  /^outlook\.office\.com$/,
];

/** Obergrenze, damit ein Kalender über Jahre nicht den Worker aufbläht. */
export const KALENDER_MAX_BYTE = 5_000_000;

/** Normalisiert webcal:// auf https:// und prüft den Dienst. */
export function kalenderAdresse(roh: string): URL | null {
  const text = String(roh || "").trim().replace(/^webcals?:\/\//i, "https://");
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  if (!ERLAUBT.some((r) => r.test(url.hostname))) return null;
  return url;
}

export async function kalenderHolen(
  roh: string,
  holen: typeof fetch = fetch,
): Promise<{ status: number; text?: string; fehler?: string }> {
  const url = kalenderAdresse(roh);
  if (!url) return { status: 400, fehler: "Nur Adressen von Google, iCloud oder Outlook im iCal Format." };
  const r = await holen(url.toString(), { headers: { accept: "text/calendar" }, redirect: "follow" });
  if (!r.ok) return { status: 502, fehler: `Der Kalenderdienst antwortet mit ${r.status}. Ist die Adresse noch gültig?` };
  const text = await r.text();
  if (text.length > KALENDER_MAX_BYTE) return { status: 413, fehler: "Der Kalender ist zu groß." };
  if (!text.includes("BEGIN:VCALENDAR")) return { status: 502, fehler: "Unter der Adresse liegt kein Kalender." };
  return { status: 200, text };
}
