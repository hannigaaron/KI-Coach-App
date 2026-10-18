/**
 * Das Konto auf dem eigenen Server.
 *
 * Läuft die App über `KONFIG.chatUrl`, holt sie sich beim ersten Start einen
 * Kontoschlüssel und schickt ihn bei jeder Modellanfrage mit. Der Server zählt
 * daran Nachrichten und Kosten je Person und setzt die Grenze der Abostufe.
 * Gespräche, Notizen und Zahlen bleiben auf dem Gerät, auf dem Server liegt
 * nur die Stufe und der Verbrauch des Monats.
 *
 * Der Schlüssel liegt in den Einstellungen und geht damit in die Sicherung.
 * Wer die App neu einrichtet und die Sicherung einspielt, hat sein Konto
 * wieder. Ohne Sicherung ist es weg, und das steht auch im Profil.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { KONFIG } from "./konfig.js";
import { store } from "./storage.js";

const basis = () => (KONFIG.chatUrl || "").replace(/\/+$/, "");

/** Der Schlüssel für den Kopf der Modellanfrage, falls es einen gibt. */
export function kontoToken() {
  return store.getSettings().kontoToken || undefined;
}

let laufend = null;

/**
 * Sorgt dafür, dass ein Konto da ist. Scheitert das Netz, läuft die App ohne
 * Konto weiter und versucht es beim nächsten Start nochmal. Ein Fehler hier
 * darf nie den Start blockieren.
 */
export async function kontoSicherstellen(holen = fetch) {
  if (!basis()) return null;
  if (kontoToken()) return kontoToken();
  if (laufend) return laufend;
  laufend = (async () => {
    try {
      const antwort = await holen(`${basis()}/konto`, { method: "POST" });
      if (!antwort.ok) return null;
      const daten = await antwort.json();
      if (!daten?.token) return null;
      store.setSettings({ ...store.getSettings(), kontoToken: daten.token, kontoId: daten.id });
      return daten.token;
    } catch {
      return null;
    } finally {
      laufend = null;
    }
  })();
  return laufend;
}

/**
 * Liest Stufe und Verbrauch. Kennt der Server das Konto nicht mehr, wird der
 * Schlüssel verworfen und ein neues angelegt. Sonst schickte die App einen
 * Schlüssel mit, der nichts zählt, und das Profil zeigte für immer nichts.
 */
export async function kontoStand(holen = fetch) {
  if (!basis()) return null;
  const token = await kontoSicherstellen(holen);
  if (!token) return { fehler: "Der Server ist gerade nicht erreichbar." };
  try {
    const antwort = await holen(`${basis()}/konto`, { headers: { authorization: `Bearer ${token}` } });
    if (antwort.status === 404) {
      const { kontoToken: _t, kontoId: _i, ...rest } = store.getSettings();
      store.setSettings(rest);
      return kontoStand(holen);
    }
    if (!antwort.ok) return { fehler: `Der Server antwortet mit ${antwort.status}.` };
    return await antwort.json();
  } catch {
    return { fehler: "Der Server ist gerade nicht erreichbar." };
  }
}

/** Ein Satz für das Profil. Zahlen kommen vom Server, nicht aus der App. */
export function kontoText(stand) {
  if (!stand) return "";
  if (stand.fehler) return stand.fehler;
  const n = stand.verbrauch?.nachrichten ?? 0;
  const g = stand.grenze?.nachrichten ?? 0;
  const anteil = stand.grenze?.budgetMikro ? Math.min(100, Math.round(((stand.verbrauch?.mikro ?? 0) / stand.grenze.budgetMikro) * 100)) : 0;
  const bis = stand.bis ? ` bis ${stand.bis.split("-").reverse().join(".")}` : "";
  return `Stufe ${stand.name}${bis}. Diesen Monat ${n} von ${g} Nachrichten an die KI, ${anteil} Prozent des Budgets.`;
}
