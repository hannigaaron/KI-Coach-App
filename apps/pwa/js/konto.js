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

/* ---------- Abo anbieten ---------- */

/**
 * Was die Stufen kosten und was sie bringen. Die Grenzen selbst stehen auf
 * dem Server in `workers/push/src/konto.ts`, hier steht nur, was der Nutzer
 * liest. Ändert sich dort eine Zahl, ändert sie sich hier mit.
 */
export const ABO_STUFEN = [
  {
    id: "plus", name: "Plus", preis: "9,99 €",
    punkte: ["800 Nachrichten an die KI im Monat", "Fotos von Teller, Etikett und Kühlschrank", "Planung, Coaching und Kopf leeren"],
  },
  {
    id: "pro", name: "Pro", preis: "19,99 €",
    punkte: ["2500 Nachrichten an die KI im Monat", "Für viel Diktat und viele Fotos", "Alles aus Plus"],
  },
];

const TAG_MS = 86400000;

/** Tage bis einschliesslich `bis`, von `heute` aus. Am letzten Tag ist es 1. */
export function tageUebrig(bis, heute) {
  if (!bis) return null;
  return Math.round((Date.parse(`${bis}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / TAG_MS) + 1;
}

/**
 * Ob beim Start ein Hinweis aufs Abo kommt, und welcher.
 *
 * Jede Bedingung hier verhindert eine Meldung. Ein Fenster, das bei jedem
 * Öffnen aufgeht, wird weggedrückt, ohne gelesen zu werden, und dann auch an
 * dem Tag, an dem es wirklich zählt. Deshalb: die letzten zwei Tage der
 * Testphase je einmal, das Ende einmal, und bei Plus einmal im Monat ab 80
 * Prozent. `merken` geht in `settings.aboHinweise`.
 */
export function aboAnlass(stand, gezeigt = {}, heute) {
  if (!stand || stand.fehler) return null;
  if (stand.stufe === "test") {
    const tage = tageUebrig(stand.bis, heute);
    if (tage === null || tage > 2 || gezeigt.tag === heute) return null;
    return {
      art: "testende",
      titel: tage <= 1 ? "Heute ist der letzte Tag deiner Testphase" : "Noch 2 Tage Testphase",
      text: "Danach gibt es die KI mit Plus oder Pro. Essen eintragen, Pläne und Erinnerungen bleiben auch ohne Abo.",
      merken: { tag: heute },
    };
  }
  if (stand.stufe === "frei") {
    if (gezeigt.vorbei) return null;
    return {
      art: "vorbei",
      titel: "Deine Testphase ist vorbei",
      text: "Mit Plus denkt daevo weiter mit: Fotos auswerten, deinen Tag planen, mit dir reden. Ohne Abo läuft alles, was keine KI braucht.",
      merken: { vorbei: true, tag: heute },
    };
  }
  if (stand.stufe === "plus") {
    const n = stand.verbrauch?.nachrichten ?? 0;
    const g = stand.grenze?.nachrichten ?? 0;
    if (!g || n < g * 0.8 || gezeigt.monat80 === stand.monat) return null;
    return {
      art: "knapp",
      titel: "Du nutzt daevo richtig viel",
      text: `${n} von ${g} Nachrichten sind diesen Monat verbraucht. Mit Pro hast du gut das Dreifache.`,
      merken: { monat80: stand.monat },
      empfohlen: "pro",
    };
  }
  return null;
}

/**
 * Der Hinweis, wenn eine Nachricht am leeren Kontingent scheitert.
 *
 * Nicht mitten in einem Gespräch über Scham oder Familie. Wer gerade so etwas
 * schreibt und ein Verkaufsfenster bekommt, macht die App nicht wieder auf.
 * Der Satz in der Antwort sagt dort trotzdem, was los ist. Und höchstens
 * einmal die Stunde, sonst kommt es nach jeder Nachricht.
 */
export function aboAnlassLeer(gezeigt = {}, jetzt = Date.now(), modus = "") {
  if (modus === "psyche") return null;
  if (gezeigt.leerUm && jetzt - gezeigt.leerUm < 3600000) return null;
  return {
    art: "leer",
    titel: "Hol dir Plus, damit daevo weiterdenkt",
    text: "Deine Testphase oder dein Kontingent ist aufgebraucht. Alles ohne KI funktioniert weiter.",
    merken: { leerUm: jetzt },
  };
}

/**
 * Wohin der Knopf führt. Ein Zahlungslink des Betreibers, sonst eine Mail an
 * ihn mit der Kontokennung, damit er die Stufe von Hand setzen kann.
 *
 * In der iPhone App gibt es keinen Link: digitale Abos laufen dort über den
 * Kauf im App Store, und ein Weg daran vorbei kostet die Freigabe.
 */
export function aboLink(stufe, kontoId, konfig = KONFIG, nativ = false) {
  if (nativ) return null;
  const s = ABO_STUFEN.find((x) => x.id === stufe);
  if (!s) return null;
  const url = konfig.abo?.[`${stufe}Url`];
  if (url) {
    const u = new URL(url);
    // Stripe ordnet die Zahlung darüber dem Konto zu.
    if (kontoId) u.searchParams.set("client_reference_id", kontoId);
    return u.toString();
  }
  const mail = konfig.angebot?.mail;
  if (!mail) return null;
  const betreff = encodeURIComponent(`daevo ${s.name}`);
  const text = encodeURIComponent(`Hallo, ich möchte daevo ${s.name} für ${s.preis} im Monat.\n\nMeine Konto-ID: ${kontoId || "unbekannt"}`);
  return `mailto:${mail}?subject=${betreff}&body=${text}`;
}
