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
import { produktAusOff, pruefeProdukt, type Produkt } from "@daevo/core";

const BASIS = "https://world.openfoodfacts.org";
const KENNUNG = "daevo/1.0 (https://github.com/hannigaaron/KI-Coach-App)";

/** Nur diese Felder abrufen. Ein voller Datensatz ist rund 30 Kilobyte gross. */
const FELDER = [
  "code", "product_name", "product_name_de", "brands", "quantity", "serving_size", "nutriments",
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
  const json = await hole(url, o);
  if (!json || typeof json !== "object") return null;

  const roh = (json as Record<string, unknown>).product;
  const p = produktAusOff(roh);
  if (!p) return null;
  return { produkt: p, einwaende: pruefeProdukt(p).einwaende };
}

/**
 * Produkte über den Namen suchen.
 *
 * Die Suche ist deutlich langsamer als der Barcode und liefert oft Produkte,
 * die nur ein Wort teilen. Deshalb kommen hoechstens acht Treffer zurueck und
 * die Auswahl trifft der Nutzer oder der Coach, nicht diese Funktion.
 */
export async function produkteSuchen(begriff: string, o: OffOptionen & { anzahl?: number } = {}): Promise<OffTreffer[]> {
  const q = begriff.trim();
  if (q.length < 3) return [];
  const anzahl = Math.min(Math.max(o.anzahl ?? 6, 1), 8);

  const url = `${BASIS}/cgi/search.pl?search_terms=${encodeURIComponent(q)}`
    + `&search_simple=1&action=process&json=1&page_size=${anzahl}`
    + `&fields=${FELDER}&app_name=${encodeURIComponent(KENNUNG)}`;

  // Die Suche antwortet unter Last mit 503 und einer HTML Seite. Gemessen am
  // 07.09.2026: derselbe Aufruf zweimal 503, beim dritten Versuch 200 mit dem
  // richtigen Treffer. Ein einzelner Versuch wuerde also melden, das Produkt
  // gaebe es nicht, obwohl es in der Datenbank steht. Der Barcode laeuft ueber
  // einen anderen Dienst und ist davon nicht betroffen.
  let json = await hole(url, o);
  if (!json) json = await hole(url, o);
  if (!json || typeof json !== "object") return [];

  const liste = (json as Record<string, unknown>).products;
  if (!Array.isArray(liste)) return [];

  const treffer: OffTreffer[] = [];
  for (const roh of liste) {
    const p = produktAusOff(roh);
    if (!p) continue;
    const pr = pruefeProdukt(p);
    // Ein Datensatz, dessen Makros zusammen ueber 100 Gramm ergeben, ist kaputt
    // und gehoert nicht in eine Auswahlliste. Kleinere Einwaende bleiben sichtbar.
    if (p.per100.proteinG + p.per100.fatG + p.per100.carbsG > 100) continue;
    treffer.push({ produkt: p, einwaende: pr.einwaende });
  }
  return treffer;
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
