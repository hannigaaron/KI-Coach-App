/**
 * Abruf von Open Food Facts.
 *
 * Zwei Wege: über den Barcode, wenn er da ist, sonst über die Textsuche.
 * Der Barcode trifft genau, die Textsuche raet. Deshalb liefert die Suche
 * mehrere Treffer zurueck und nicht einen, und die Auswahl faellt sichtbar.
 *
 * Der Dienst setzt `access-control-allow-origin: *`, also laeuft der Abruf
 * direkt im Browser. Kein Server, keine Abhaengigkeit, kein Schluessel.
 *
 * Open Food Facts verlangt in seinen Nutzungsbedingungen einen aussagekraeftigen
 * User Agent. Browser erlauben das Setzen dieses Kopfes nicht, deshalb steht die
 * Kennung als Abfrageparameter mit dabei.
 */
import { produktAusOff, produktBereinigen, pruefeProdukt, trefferWerten, type Produkt } from "@daevo/core";

const BASIS = "https://world.openfoodfacts.org";
const NEUE_SUCHE = "https://search.openfoodfacts.org/search";
const KENNUNG = "daevo/1.0 (https://github.com/hannigaaron/KI-Coach-App)";

/** Nur diese Felder abrufen. Ein voller Datensatz ist rund 30 Kilobyte gross. */
const FELDER = [
  "code", "product_name", "product_name_de", "brands", "quantity", "serving_size", "nutriments",
  "image_front_small_url", "image_small_url",
].join(",");

export interface OffTreffer {
  produkt: Produkt;
  /** Was gegen den Datensatz spricht. Leer, wenn nichts dagegen spricht. */
  einwaende: string[];
}

export interface OffOptionen {
  /** Abbruch, damit eine haengende Anfrage nicht die Erfassung blockiert. */
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Ein Produkt über seinen Barcode. Genau ein Treffer oder keiner. */
export async function produktPerBarcode(barcode: string, o: OffOptionen = {}): Promise<OffTreffer | null> {
  const code = barcode.replace(/\D/g, "");
  if (code.length < 8 || code.length > 14) return null;

  const url = `${BASIS}/api/v2/product/${code}.json?fields=${FELDER}&app_name=${encodeURIComponent(KENNUNG)}`;
  let json = await hole(url, o);
  if (!json) json = await hole(url, o);
  if (!json || typeof json !== "object") return null;

  const roh = (json as Record<string, unknown>).product;
  const roh2 = produktAusOff(roh);
  const p = roh2 ? produktBereinigen(roh2) : null;
  if (!p) return null;
  return { produkt: p, einwaende: pruefeProdukt(p).einwaende };
}

/**
 * Produkte über den Namen suchen.
 *
 * Drei Wege gleichzeitig, weil jeder für sich im Betrieb versagt hat:
 *
 * Die alte Suche, `/cgi/search.pl`, antwortet seit Herbst 2026 fast immer mit
 * 503. Gemessen am 02.11.2026: drei von drei Aufrufen. Damit stand "ESN
 * Instant Rice Pudding" als unbekannt da, obwohl es fünfmal in der Datenbank
 * steht.
 *
 * Die neue Suche, search.openfoodfacts.org, findet es sofort, wenn die Marke
 * als `brands:esn` davorsteht. Sie sendet aber keinen CORS Kopf für fremde
 * Adressen, deshalb geht sie über den eigenen Worker, `proxy`.
 *
 * Die Suche nach Marke über `/api/v2/search` sendet den Kopf und läuft direkt.
 * Sie kennt keine Volltextsuche, also holt sie die 100 meistgescannten
 * Produkte der Marke, und die Auswahl trifft `trefferWerten` hier.
 *
 * Alles wird zusammengelegt, bereinigt und nach der Suche sortiert. Was nicht
 * zur Marke passt oder kaputte Makros trägt, fällt raus.
 */
export async function produkteSuchen(
  begriff: string,
  o: OffOptionen & { anzahl?: number; proxy?: string } = {},
): Promise<OffTreffer[]> {
  const q = begriff.trim();
  if (q.length < 3) return [];
  const anzahl = Math.min(Math.max(o.anzahl ?? 6, 1), 8);
  const woerter = q.split(/\s+/).filter(Boolean);

  const wege: Array<Promise<Produkt[]>> = [];
  // Die neue Suche, einmal frei und einmal mit dem ersten Wort als Marke.
  const neu = (frage: string) => {
    const url = o.proxy
      ? `${o.proxy.replace(/\/+$/, "")}/produkt?q=${encodeURIComponent(frage)}`
      : `${NEUE_SUCHE}?q=${encodeURIComponent(frage)}&page_size=12&fields=${FELDER}`;
    return liste(url, "hits", o);
  };
  wege.push(neu(q));
  if (woerter.length >= 2) wege.push(neu(`brands:${woerter[0]} ${woerter.slice(1).join(" ")}`));
  // Die Suche nach Marke, mit einem und mit zwei Wörtern: "more-nutrition".
  for (const n of [1, 2]) {
    if (woerter.length <= n) continue;
    const tag = markenTag(woerter.slice(0, n).join(" "));
    if (tag.length < 2) continue;
    wege.push(liste(
      `${BASIS}/api/v2/search?brands_tags=${encodeURIComponent(tag)}&page_size=100&sort_by=unique_scans_n`
        + `&fields=${FELDER}&app_name=${encodeURIComponent(KENNUNG)}`,
      "products", o, true,
    ));
  }
  let gefunden = (await Promise.all(wege)).flat();

  // Die alte Suche nur, wenn sonst nichts kam. Sie kostet zwei Versuche.
  if (!gefunden.length) {
    const url = `${BASIS}/cgi/search.pl?search_terms=${encodeURIComponent(q)}`
      + `&search_simple=1&action=process&json=1&page_size=${anzahl}`
      + `&fields=${FELDER}&app_name=${encodeURIComponent(KENNUNG)}`;
    gefunden = await liste(url, "products", o, true);
  }

  return trefferWerten(q, gefunden).slice(0, anzahl).map((w) => ({
    produkt: w.produkt,
    einwaende: pruefeProdukt(w.produkt).einwaende,
  }));
}

/** Wie Open Food Facts Marken als Schlagwort schreibt: klein, Bindestriche. */
export function markenTag(marke: string): string {
  return marke.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Holt eine Liste und macht daraus bereinigte Produkte. */
async function liste(url: string, feld: string, o: OffOptionen, zweiterVersuch = false): Promise<Produkt[]> {
  let json = await hole(url, o);
  // Unter Last kommt 503 mit einer HTML Seite. Beim zweiten Versuch klappt
  // es meist, gemessen am 02.11.2026 bei der Suche nach Marke.
  if (!json && zweiterVersuch) json = await hole(url, o);
  if (!json || typeof json !== "object") return [];
  const roh = (json as Record<string, unknown>)[feld];
  if (!Array.isArray(roh)) return [];
  const aus: Produkt[] = [];
  for (const r of roh) {
    const p = produktAusOff(r);
    const sauber = p ? produktBereinigen(p) : null;
    if (sauber) aus.push(sauber);
  }
  return aus;
}

async function hole(url: string, o: OffOptionen): Promise<unknown | null> {
  const f = o.fetchImpl ?? fetch;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), o.timeoutMs ?? 8000);
  try {
    const res = await f(url, { signal: ac.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    // Bei Ueberlastung kommt eine HTML Seite mit Status 200 zurueck. Ohne diese
    // Pruefung wirft das Auslesen, und der Aufrufer sieht einen Fehler statt
    // eines leeren Ergebnisses.
    const typ = res.headers.get("content-type") ?? "";
    if (!typ.includes("json")) return null;
    return await res.json();
  } catch {
    // Kein Netz, Zeitüberschreitung oder kaputtes JSON. Der Aufrufer faellt dann
    // auf den bisherigen Weg zurueck, statt die Erfassung abzubrechen.
    return null;
  } finally {
    clearTimeout(timer);
  }
}
