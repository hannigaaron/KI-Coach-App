/**
 * Nährwerte aus dem Netz, wenn keine Datenbank ein Produkt kennt.
 *
 * Die letzte Stufe nach der eigenen Liste und Open Food Facts. Das Modell
 * sucht mit der Websuche von Anthropic, bevorzugt die Seite des Herstellers
 * oder eines Händlers mit Nährwerttabelle, und meldet die Werte je 100 Gramm
 * mit Adresse. Geraten wird nicht: ohne Tabelle auf einer gefundenen Seite
 * ist die Antwort "nicht gefunden".
 *
 * Danach läuft dieselbe Prüfung wie für Open Food Facts. Makros über 100
 * Gramm verwerfen den Fund, Kalorien, die nicht zu den Makros passen, werden
 * aus den Makros gerechnet.
 *
 * Sonnet und nicht Haiku: die Websuche mit Filtern läuft laut Anthropic auf
 * Opus und Sonnet. Kosten je Fund rund 0,01 Dollar je Suche plus die
 * gelesenen Seiten, deshalb höchstens drei Suchen und das Ergebnis wird
 * gemerkt.
 */
import { produktBereinigen, type Produkt } from "@daevo/core";
import type { CoachProvider } from "./provider.js";
import { SONNET } from "./modelle.js";

interface Fund {
  gefunden: boolean;
  marke?: string;
  name?: string;
  kcal?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  ballaststoffeG?: number;
  portionG?: number;
  quelle?: string;
}

const SYSTEM = [
  "Du suchst Nährwerte für ein Lebensmittel im Netz und meldest sie je 100 Gramm.",
  "Nimm die Seite des Herstellers oder eines Händlers, der die Nährwerttabelle der Packung abbildet.",
  "Bei Pulvern und Instantprodukten gilt die Spalte für das Pulver, nicht für die Zubereitung mit Milch oder Wasser.",
  "Steht auf keiner gefundenen Seite eine Nährwerttabelle für genau dieses Produkt, melde gefunden=false. Schätze nie, und nimm keine Werte eines ähnlichen Produkts.",
  "Gib in quelle die Adresse der Seite an, von der die Zahlen stammen.",
].join(" ");

const SCHEMA = {
  type: "object",
  properties: {
    gefunden: { type: "boolean" },
    marke: { type: "string" },
    name: { type: "string" },
    kcal: { type: "number", description: "kcal je 100 g" },
    proteinG: { type: "number" },
    fatG: { type: "number" },
    carbsG: { type: "number" },
    ballaststoffeG: { type: "number" },
    portionG: { type: "number", description: "Portion laut Hersteller in Gramm, wenn angegeben." },
    quelle: { type: "string", description: "https Adresse der Seite mit der Tabelle." },
  },
  required: ["gefunden"],
};

/** Macht aus dem Fund ein Produkt oder verwirft ihn. */
export function produktAusFund(fund: Fund, suche: string): Produkt | null {
  if (!fund?.gefunden) return null;
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
  const p = n(fund.proteinG), f = n(fund.fatG), k = n(fund.carbsG);
  if (p === null || f === null || k === null) return null;
  let url: URL | null = null;
  try {
    url = new URL(String(fund.quelle ?? ""));
  } catch {
    url = null;
  }
  // Ohne nachprüfbare Seite ist es eine Behauptung und kein Fund.
  if (!url || url.protocol !== "https:") return null;
  const kcal = n(fund.kcal) ?? Math.round(p * 4 + f * 9 + k * 4);
  const roh: Produkt = {
    barcode: `web-${suche.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").slice(0, 60)}`,
    name: String(fund.name || suche).trim(),
    marke: String(fund.marke || "").trim(),
    menge: "",
    per100: { kcal: Math.round(kcal), proteinG: p, fatG: f, carbsG: k },
    portionG: n(fund.portionG) ?? undefined,
    ballaststoffeG: n(fund.ballaststoffeG) ?? undefined,
    quelle: "web",
    quelleUrl: url.toString(),
  };
  return produktBereinigen(roh);
}

/** Sucht im Netz. Null, wenn nichts Belastbares gefunden wurde oder das Modell nicht erreichbar ist. */
export async function naehrwerteImNetz(provider: CoachProvider, suche: string): Promise<Produkt | null> {
  if (!provider.available || !provider.generateJson) return null;
  try {
    const fund = await provider.generateJson<Fund>({
      system: SYSTEM,
      user: `Produkt: ${suche}`,
      schema: SCHEMA,
      schemaName: "naehrwerte_melden",
      modell: SONNET,
      effort: "low",
      websuche: 3,
      maxTokens: 4096,
    });
    return produktAusFund(fund, suche);
  } catch {
    return null;
  }
}
