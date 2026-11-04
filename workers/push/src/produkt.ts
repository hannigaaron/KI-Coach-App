/**
 * Produktsuche bei Open Food Facts für die App.
 *
 * Die neue Suche, search.openfoodfacts.org, findet Markenprodukte, an denen
 * die alte scheitert, sendet aber keinen CORS Kopf für fremde Adressen. Der
 * Browser und die iPhone App dürfen sie deshalb nicht direkt lesen. Der
 * Worker reicht genau diese eine Suche durch, mit festen Feldern und fester
 * Grösse. Gespeichert wird nichts.
 *
 * Kein offenes Tor: das Ziel steht fest, nur der Suchtext kommt von aussen.
 * Eine Grenze je Gerät fehlt bewusst. Sie kostete je Suche einen Schreibzugriff
 * im Schlüsselspeicher, davon gibt es im Gratis Tarif 1000 am Tag, und das
 * Schlimmste, was ein Fremder hier anrichten kann, ist eine Suche bei Open
 * Food Facts.
 */
export const SUCHE = "https://search.openfoodfacts.org/search";
const FELDER = "code,product_name,product_name_de,brands,quantity,serving_size,nutriments,image_front_small_url,image_small_url";

/** Baut die Adresse der Suche. Null, wenn der Suchtext nicht taugt. */
export function produktSucheAdresse(q: string | null): string | null {
  const text = String(q ?? "").replace(/\s+/g, " ").trim();
  if (text.length < 3 || text.length > 120) return null;
  return `${SUCHE}?q=${encodeURIComponent(text)}&page_size=12&fields=${FELDER}`;
}

export async function produktSuchen(q: string | null, holen: typeof fetch = fetch): Promise<{ status: number; text: string }> {
  const adresse = produktSucheAdresse(q);
  if (!adresse) return { status: 400, text: JSON.stringify({ fehler: "Suchtext zwischen 3 und 120 Zeichen." }) };
  try {
    const r = await holen(adresse, { headers: { accept: "application/json", "user-agent": "daevo/1.0 (https://github.com/hannigaaron/KI-Coach-App)" } });
    const typ = r.headers.get("content-type") || "";
    if (!r.ok || !typ.includes("json")) return { status: 502, text: JSON.stringify({ fehler: `Open Food Facts antwortet mit ${r.status}.` }) };
    return { status: 200, text: await r.text() };
  } catch {
    return { status: 502, text: JSON.stringify({ fehler: "Open Food Facts nicht erreichbar." }) };
  }
}
