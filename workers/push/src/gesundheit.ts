import type { KVNamespace } from "./umgebung.js";

/**
 * Health Werte aus einem Kurzbefehl.
 *
 * HealthKit gibt es nur für native Apps. Die Kurzbefehle App darf es aber
 * lesen, über die Aktion "Health-Messungen suchen", und eine Automation zu
 * festen Uhrzeiten läuft seit iOS 17 ohne Nachfrage. Der Kurzbefehl schickt
 * die Zahlen hierher, die App holt sie beim nächsten Öffnen ab. Dasselbe
 * Prinzip wie beim Postfach, nur ohne Mitteilung: drei Mitteilungen am Tag
 * über Schrittzahlen wären Lärm.
 *
 * Angenommen werden nur Zahlen unter festen Namen, kein Text. Was hier liegt,
 * schreibt die App ohne Rückfrage in die Tage, und freier Text wäre ein Weg,
 * über den fremde Inhalte in die App kommen.
 */

const PRAEFIX = "health:";

/**
 * Nach dieser Zeit verfällt ein Tag von selbst.
 *
 * Drei Tage und nicht eine Stunde wie beim Postfach. Ein Satz gehört zu dem
 * Moment, in dem er gesagt wurde. Eine Schrittzahl von gestern ist morgen
 * noch richtig, und wer die App einen Tag nicht öffnet, soll sie trotzdem
 * bekommen. Länger nicht: Gesundheitswerte gehören auf das Gerät und nicht
 * auf einen Server.
 */
export const GESUNDHEIT_TTL_S = 3 * 86400;

/** Weiter zurück als zwei Tage nimmt der Worker keinen Tag an. */
export const MAX_TAGE_ZURUECK = 2;

/**
 * Die Felder und ihr gültiger Bereich.
 *
 * Was ausserhalb liegt, ist ein Fehler im Kurzbefehl und keine Messung: ein
 * Ruhepuls von 0 heisst, dass heute noch keiner gemessen wurde. Die Namen
 * sind dieselben wie in `HealthTag` aus `@daevo/core`, damit die App beide
 * Wege mit derselben Funktion schreiben kann.
 */
export const FELDER = {
  schritte: { min: 0, max: 100000, stellen: 0 },
  aktivKcal: { min: 0, max: 10000, stellen: 0 },
  ruhepuls: { min: 25, max: 220, stellen: 0 },
  hrv: { min: 1, max: 300, stellen: 0 },
  schlafMinuten: { min: 0, max: 1440, stellen: 0 },
  gewichtKg: { min: 30, max: 300, stellen: 1 },
} as const;

export type Feld = keyof typeof FELDER;
export type Werte = Partial<Record<Feld, number>>;

/**
 * Andere Schreibweisen derselben Felder.
 *
 * Die Schlüssel tippt der Nutzer im Kurzbefehl von Hand. "Gewicht" statt
 * "gewichtKg" ist dort kein Fehler, sondern das Naheliegende.
 */
const NAMEN: Record<string, Feld> = {
  schritte: "schritte",
  aktivkcal: "aktivKcal",
  aktivekalorien: "aktivKcal",
  kalorien: "aktivKcal",
  ruhepuls: "ruhepuls",
  hrv: "hrv",
  schlafminuten: "schlafMinuten",
  schlaf: "schlafMinuten",
  gewicht: "gewichtKg",
  gewichtkg: "gewichtKg",
};

export interface Lesung {
  werte: Werte;
  /** Felder, die erkannt wurden, deren Wert aber nicht passte. */
  verworfen: string[];
  /** Schlüssel, die keinem Feld entsprechen. */
  unbekannt: string[];
}

/** Liest die Felder aus dem, was der Kurzbefehl geschickt hat. */
export function werteLesen(roh: unknown): Lesung {
  const werte: Werte = {};
  const verworfen: string[] = [];
  const unbekannt: string[] = [];
  if (!roh || typeof roh !== "object") return { werte, verworfen, unbekannt };

  for (const [schluessel, wert] of Object.entries(roh as Record<string, unknown>)) {
    if (schluessel === "tag") continue;
    const feld = NAMEN[schluessel.toLowerCase().replace(/[^a-z]/g, "")];
    if (!feld) { unbekannt.push(schluessel); continue; }
    const zahl = zahlLesen(wert, feld);
    // Ein leeres Feld ist kein Fehler: die Statistik einer leeren Suche
    // kommt im Kurzbefehl als leerer Text an.
    if (zahl === undefined) continue;
    const { min, max, stellen } = FELDER[feld];
    if (zahl === null || zahl < min || zahl > max) { verworfen.push(feld); continue; }
    const faktor = 10 ** stellen;
    werte[feld] = Math.round(zahl * faktor) / faktor;
  }
  return { werte, verworfen, unbekannt };
}

/**
 * Eine Zahl aus dem, was die Kurzbefehle App daraus macht.
 *
 * Als Zahl im JSON ist alles einfach. Als Text kommt sie auf einem deutschen
 * iPhone mit Komma, manchmal mit Tausenderpunkt und manchmal mit Einheit:
 * "86,4", "9.123", "62 Schläge/Min.". Zurück kommt undefined für leer und
 * null für nicht lesbar.
 */
export function zahlLesen(wert: unknown, feld: Feld): number | null | undefined {
  if (wert === null || wert === undefined) return undefined;
  if (typeof wert === "number") return Number.isFinite(wert) ? wert : null;
  const text = String(wert).trim();
  if (!text) return undefined;
  const treffer = text.match(/-?\d[\d.,]*/);
  if (!treffer) return null;
  let z = treffer[0].replace(/[.,]$/, "");
  if (z.includes(".") && z.includes(",")) {
    z = z.replace(/\./g, "").replace(",", ".");
  } else if (z.includes(",")) {
    z = z.replace(",", ".");
  } else if (FELDER[feld].stellen === 0 && /^\d{1,3}(\.\d{3})+$/.test(z)) {
    // "9.123" bei Schritten ist ein Tausenderpunkt, kein Komma.
    z = z.replace(/\./g, "");
  }
  const n = Number(z);
  return Number.isFinite(n) ? n : null;
}

/**
 * Der Tag, für den die Werte gelten.
 *
 * Ohne Angabe der heutige Tag in Berlin, denn so rechnet der Rest des
 * Workers. Mit Angabe nur, wenn er höchstens zwei Tage zurückliegt: ein
 * Kurzbefehl, der aus Versehen ein Jahr nachträgt, überschreibt sonst die
 * Schritte eines ganzen Tages, den niemand mehr prüft.
 */
export function tagPruefen(roh: unknown, heute: string): string | null {
  if (roh === undefined || roh === null || roh === "") return heute;
  const tag = String(roh).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tag)) return null;
  const abstand = (Date.parse(`${heute}T00:00:00Z`) - Date.parse(`${tag}T00:00:00Z`)) / 86400000;
  if (!Number.isFinite(abstand) || abstand < 0 || abstand > MAX_TAGE_ZURUECK) return null;
  return tag;
}

/**
 * Legt die Werte eines Tages ab.
 *
 * Ein zweiter Lauf am selben Tag ergänzt und überschreibt Feld für Feld. Der
 * Kurzbefehl um 21 Uhr bringt die Schritte des ganzen Tages, der um 8 Uhr nur
 * die des Morgens, und der spätere Wert ist der richtige.
 */
export async function gesundheitAblegen(kv: KVNamespace, tag: string, werte: Werte): Promise<Werte> {
  const schluessel = `${PRAEFIX}${tag}`;
  const alt = await lesen(kv, schluessel);
  const neu = { ...alt, ...werte };
  await kv.put(schluessel, JSON.stringify(neu), { expirationTtl: GESUNDHEIT_TTL_S });
  return neu;
}

/** Holt alle abgelegten Tage und löscht sie dabei. */
export async function gesundheitAbholen(kv: KVNamespace): Promise<Array<Werte & { tag: string }>> {
  const { keys } = await kv.list({ prefix: PRAEFIX, limit: 20 });
  const raus: Array<Werte & { tag: string }> = [];
  for (const { name } of keys) {
    const werte = await lesen(kv, name);
    await kv.delete(name);
    if (Object.keys(werte).length) raus.push({ tag: name.slice(PRAEFIX.length), ...werte });
  }
  return raus.sort((a, b) => a.tag.localeCompare(b.tag));
}

async function lesen(kv: KVNamespace, schluessel: string): Promise<Werte> {
  const roh = await kv.get(schluessel);
  if (!roh) return {};
  try {
    // Erneut durch die Prüfung: was im Speicher liegt, wird behandelt wie
    // das, was ankommt.
    return werteLesen(JSON.parse(roh)).werte;
  } catch {
    return {};
  }
}
