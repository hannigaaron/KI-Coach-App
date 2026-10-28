/**
 * Der Kauf eines Abos, in der iPhone App über den App Store, im Browser über
 * einen Stripe Payment Link.
 *
 * Die Testphase ist Teil des Abos: Apple nennt es Einführungsangebot, Stripe
 * trial. Wer startet, schliesst das Abo ab, zahlt ab Tag 8 und kann bis
 * Tag 7 kostenlos kündigen. Eingerichtet wird beides beim Anbieter, siehe
 * docs/ABO-EINRICHTEN.md. Die App zeigt nur, was der Anbieter meldet.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { KONFIG } from "./konfig.js";
import { nativAufruf } from "./nativ.js";
import { store } from "./storage.js";

const basis = () => (KONFIG.chatUrl || "").replace(/\/+$/, "");

/** Die Produktkennung im App Store je Stufe und Zahlweise. */
export function produktId(stufe, takt = "monat", konfig = KONFIG) {
  const ids = konfig.abo?.appstore || {};
  return ids[`${stufe}${takt === "jahr" ? "Jahr" : "Monat"}`] || `de.daevo.${stufe}.${takt === "jahr" ? "jahr" : "monat"}`;
}

/** Schickt Transaktionen an den Server. Der prüft sie gegen Apple. */
export async function transaktionenMelden(liste, holen = fetch) {
  const token = store.getSettings().kontoToken;
  if (!basis() || !token) return { fehler: "Kein Konto." };
  let letzte = null;
  for (const jws of liste) {
    const r = await holen(`${basis()}/appstore`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ jws }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { fehler: j.fehler || `Status ${r.status}` };
    letzte = j;
  }
  return { ok: true, stufe: letzte?.stufe ?? null, bis: letzte?.bis ?? null };
}

/** Kauf im App Store. Abbruch ist kein Fehler und kommt als `abgebrochen`. */
export async function kaufenNativ(stufe, takt = "monat", { aufruf = nativAufruf, holen = fetch } = {}) {
  let antwort;
  try {
    antwort = await aufruf("Abo", "kaufen", { id: produktId(stufe, takt) });
  } catch (e) {
    const text = String(e?.message || e);
    return text === "abgebrochen" ? { abgebrochen: true } : { fehler: text };
  }
  if (antwort?.wartet) return { wartet: true };
  if (!antwort?.jws) return { fehler: "Der App Store hat keinen Beleg geschickt." };
  return transaktionenMelden([antwort.jws], holen);
}

/**
 * Beim Start: gilt im App Store ein Abo, das der Server noch nicht kennt,
 * etwa nach einer Neuinstallation oder einer Verlängerung ohne Meldung,
 * kommt es so an.
 */
export async function abosAbgleichen({ aufruf = nativAufruf, holen = fetch } = {}) {
  const { jws = [] } = await aufruf("Abo", "aktuelle", {});
  if (!jws.length) return { ok: true, leer: true };
  return transaktionenMelden(jws, holen);
}

/**
 * Der Anlass für das Fenster nach dem Fragebogen, wenn die Testphase erst
 * mit dem Abo beginnt. Nur einmal, nur ohne Abo, und nur, wenn der Server
 * so eingestellt ist: sonst hat jedes neue Konto schon seine sieben Tage.
 */
export function startAnlass(stand, gezeigt = {}) {
  if (!stand || stand.fehler || !stand.testphaseMitAbo) return null;
  if (stand.stufe !== "frei" || stand.quelle || gezeigt.start) return null;
  return {
    art: "start",
    marke: "7 Tage kostenlos",
    titel: "Starte deine Testphase",
    text: "Du schließt das Abo jetzt ab und zahlst erst ab Tag 8. Kündigst du bis Tag 7, kostet es nichts.",
    knopf: "7 Tage gratis testen",
    merken: { start: true },
    testphase: true,
  };
}
