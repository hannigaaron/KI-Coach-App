/**
 * Kalender, die sich von selbst abgleichen.
 *
 * Zwei Wege. Auf dem iPhone liest daevo den Apple Kalender direkt über
 * EventKit, `KalenderPlugin.swift`. Darin stehen auch Google und Outlook,
 * sobald sie in den iOS Einstellungen unter Kalender als Account hinzugefügt
 * sind. Im Browser und für alle, die das nicht wollen, gibt es die geheime
 * iCal Adresse eines Kalenders. Die holt der Worker, weil Google und iCloud
 * keinen CORS Kopf senden, `workers/push/src/kalender.ts`.
 *
 * Abgeglichen wird beim Öffnen und beim Zurückholen der App, höchstens alle
 * 30 Minuten. Ein Kalender, der sich nur auf Knopfdruck auffrischt, ist nach
 * zwei Tagen veraltet, und dann plant die App einen Tag, den es nicht gibt.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { termineAusIcs } from "@daevo/core";
import { istNativ, KONFIG } from "./konfig.js";
import { store } from "./storage.js";
import { kalenderFenster, kalenderTermineSetzen } from "./assistant.js";
import { nativAufruf } from "./nativ.js";

export const ABGLEICH_ABSTAND_MS = 30 * 60 * 1000;
export const APPLE_QUELLE = "Apple Kalender";
const MAX_ABOS = 6;

export function kalenderAbos(settings = store.getSettings()) {
  return Array.isArray(settings.kalenderAbos) ? settings.kalenderAbos : [];
}

/** Erkennt den Dienst an der Adresse, für den Namen und die Prüfung. */
export function aboDienst(url) {
  const text = String(url || "").trim().replace(/^webcals?:\/\//i, "https://");
  let host;
  try {
    host = new URL(text).hostname;
  } catch {
    return null;
  }
  if (host === "calendar.google.com") return "Google Kalender";
  if (/^p\d+-(caldav|calendars)\.icloud\.com$/.test(host)) return "iCloud Kalender";
  if (/^outlook\.(live|office365|office)\.com$/.test(host)) return "Outlook Kalender";
  return null;
}

/**
 * Legt ein Abo an. Dieselbe Adresse ersetzt das alte, ein gleicher Name
 * bekommt eine Nummer: zwei Quellen mit demselben Namen würden sich beim
 * Abgleich gegenseitig die Termine löschen.
 */
export function aboHinzufuegen(settings, url, name = "") {
  const adresse = String(url || "").trim().replace(/^webcals?:\/\//i, "https://");
  const dienst = aboDienst(adresse);
  if (!dienst) return { fehler: "Das ist keine Kalenderadresse von Google, iCloud oder Outlook." };
  const liste = kalenderAbos(settings).filter((a) => a.url !== adresse);
  if (liste.length >= MAX_ABOS) return { fehler: `Höchstens ${MAX_ABOS} Kalender.` };
  let titel = String(name || "").trim().slice(0, 40) || dienst;
  const belegt = new Set([...liste.map((a) => a.name), APPLE_QUELLE]);
  for (let n = 2; belegt.has(titel); n++) titel = `${(String(name || "").trim() || dienst)} ${n}`;
  const abo = { name: titel, url: adresse };
  return { settings: { ...settings, kalenderAbos: [...liste, abo] }, abo };
}

export function aboEntfernen(settings, name) {
  return { ...settings, kalenderAbos: kalenderAbos(settings).filter((a) => a.name !== name) };
}

/** Apple Termine aus dem Plugin in die Form des Kerns. */
export function appleTermine(roh) {
  return (Array.isArray(roh) ? roh : [])
    .filter((t) => t && Number.isFinite(t.von) && Number.isFinite(t.bis) && t.bis >= t.von)
    .map((t) => ({
      uid: String(t.uid || `${t.von}`),
      titel: String(t.titel || "Termin"),
      ort: String(t.ort || ""),
      von: t.von,
      bis: t.bis,
      ganztags: Boolean(t.ganztags),
    }));
}

let laeuft = null;

/**
 * Gleicht alle Quellen ab. Fehler einer Quelle halten die anderen nicht auf
 * und lassen ihre alten Termine stehen: lieber der Stand von gestern als ein
 * leerer Tag.
 */
export async function kalenderAbgleichen({ zwang = false, holen = fetch, jetzt = Date.now() } = {}) {
  if (laeuft) return laeuft;
  const s = store.getSettings();
  const zuletzt = Date.parse(s.kalenderAbgleich || "") || 0;
  if (!zwang && jetzt - zuletzt < ABGLEICH_ABSTAND_MS) return { uebersprungen: true, ergebnisse: [] };
  laeuft = (async () => {
    const ergebnisse = [];
    if (s.appleKalender && istNativ()) {
      try {
        const f = kalenderFenster();
        const roh = await nativAufruf("Kalender", "termine", { von: f.von, bis: f.bis });
        const anzahl = kalenderTermineSetzen(APPLE_QUELLE, appleTermine(roh?.termine), { art: "apple" });
        ergebnisse.push({ name: APPLE_QUELLE, anzahl });
      } catch (e) {
        ergebnisse.push({ name: APPLE_QUELLE, fehler: e?.message || String(e) });
      }
    }
    const basis = (KONFIG.chatUrl || "").replace(/\/+$/, "");
    for (const abo of kalenderAbos(s)) {
      if (!basis || !s.kontoToken) {
        ergebnisse.push({ name: abo.name, fehler: "Abo Adressen brauchen das daevo Konto." });
        continue;
      }
      try {
        const r = await holen(`${basis}/kalender`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${s.kontoToken}` },
          body: JSON.stringify({ url: abo.url }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          ergebnisse.push({ name: abo.name, fehler: d.fehler || `Status ${r.status}` });
          continue;
        }
        const ics = await r.text();
        const { termine } = termineAusIcs(ics, kalenderFenster(), abo.name);
        ergebnisse.push({ name: abo.name, anzahl: kalenderTermineSetzen(abo.name, termine, { art: "abo" }) });
      } catch (e) {
        ergebnisse.push({ name: abo.name, fehler: e?.message || String(e) });
      }
    }
    store.setSettings({ ...store.getSettings(), kalenderAbgleich: new Date(jetzt).toISOString() });
    return { uebersprungen: false, ergebnisse };
  })();
  try {
    return await laeuft;
  } finally {
    laeuft = null;
  }
}

/** Fragt auf dem iPhone nach dem Zugriff und liest danach sofort. */
export async function appleKalenderVerbinden() {
  const antwort = await nativAufruf("Kalender", "berechtigen", {});
  if (!antwort?.erlaubt) {
    return { fehler: "Kein Zugriff. In den iOS Einstellungen unter daevo, Kalender, Vollzugriff erlauben." };
  }
  store.setSettings({ ...store.getSettings(), appleKalender: true });
  return kalenderAbgleichen({ zwang: true });
}

export function appleKalenderTrennen() {
  store.setSettings({ ...store.getSettings(), appleKalender: false });
  const bestand = store.getKalender();
  store.setKalender({
    quellen: (bestand.quellen || []).filter((q) => q.name !== APPLE_QUELLE),
    termine: (bestand.termine || []).filter((t) => t.quelle !== APPLE_QUELLE),
    stand: new Date().toISOString(),
  });
}
