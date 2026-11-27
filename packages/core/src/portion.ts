import type { FoodEntry } from "./types.js";
import { portionInGramm } from "./produkt.js";

/**
 * Mengen an einem eingetragenen Posten ändern.
 *
 * Bisher war eine erfasste Mahlzeit endgültig. Wer sich vertippt hat oder dem
 * Modell eine Menge nachschärfen wollte, musste den ganzen Eintrag löschen und
 * alles neu sagen. Beim Tracken ist das der häufigste Handgriff überhaupt: die
 * Schätzung stimmt fast, und man zieht sie von 180 auf 150 Gramm.
 *
 * Ein `FoodEntry` trägt absolute Nährwerte für seine Menge, keine Werte je 100
 * Gramm. Skaliert wird deshalb über das Verhältnis der Mengen. Das ist exakt,
 * solange die Nährwerte linear zur Menge stehen, und das tun sie: 300 Gramm
 * Reis haben genau das Anderthalbfache von 200 Gramm.
 */

/** Wie die Menge eines Postens aussieht, sobald sie sich rechnen lässt. */
export interface Menge {
  zahl: number;
  /** Die Einheit, wie sie dastand. Leer, wenn nur eine Zahl da war. */
  einheit: string;
}

/**
 * Liest die Menge eines Postens.
 *
 * Nicht über `portionInGramm`, weil hier auch Angaben ohne Einheit zählen: das
 * Modell schreibt "2 Eier" oder "1 Portion", und auch die lassen sich
 * verdoppeln. Umgerechnet wird nichts, es geht nur um das Verhältnis.
 */
export function mengeLesen(quantity: string): Menge | null {
  const t = String(quantity ?? "").toLowerCase().replace(",", ".").trim();
  const treffer = t.match(/(\d+(?:\.\d+)?)\s*([a-zäöüß]*)/);
  if (!treffer) return null;
  const zahl = Number(treffer[1]);
  if (!Number.isFinite(zahl) || zahl <= 0) return null;
  return { zahl, einheit: (treffer[2] ?? "").trim() };
}

/** Lässt sich dieser Posten über die Menge skalieren. */
export function skalierbar(eintrag: FoodEntry): boolean {
  return mengeLesen(eintrag.quantity) !== null;
}

/**
 * Setzt die Menge eines Postens neu und rechnet die Nährwerte mit.
 *
 * Gerundet wird erst am Ende und je Wert einzeln. Wer zwischendrin rundet,
 * sammelt über fünf Posten ein paar Kalorien Abweichung ein, und dann stimmt
 * die Summe der Zeilen nicht mit der Gesamtsumme überein. Genau das fällt beim
 * Nachrechnen sofort auf und kostet Vertrauen.
 *
 * Protein, Fett und Kohlenhydrate auf eine Nachkommastelle, Kalorien ganz.
 * Ein halbes Gramm Fett ist beim Tracken eine Angabe, eine halbe Kalorie nicht.
 */
export function mengeSetzen(eintrag: FoodEntry, neueZahl: number): FoodEntry {
  const alt = mengeLesen(eintrag.quantity);
  if (!alt || !Number.isFinite(neueZahl) || neueZahl <= 0) return eintrag;
  const faktor = neueZahl / alt.zahl;
  return {
    ...eintrag,
    quantity: mengeSchreiben(neueZahl, alt.einheit),
    kcal: Math.round(eintrag.kcal * faktor),
    proteinG: runde1(eintrag.proteinG * faktor),
    fatG: runde1(eintrag.fatG * faktor),
    carbsG: runde1(eintrag.carbsG * faktor),
  };
}

/**
 * Schreibt eine Menge so, wie sie dastehen soll.
 *
 * Ganze Zahlen ohne Nachkommastelle: "150 g" und nicht "150.0 g". Bei einer
 * Einheit steht ein Leerzeichen davor, ohne Einheit bleibt die nackte Zahl.
 */
export function mengeSchreiben(zahl: number, einheit: string): string {
  const z = Number.isInteger(zahl) ? String(zahl) : String(runde1(zahl));
  return einheit ? `${z} ${einheit}` : z;
}

/**
 * Ein neuer Posten aus Nährwerten je 100 Gramm.
 *
 * Der Weg für Barcode und Suche. `naehrwerteFuer` in `produkt.ts` rechnet
 * dasselbe für ein Produkt aus Open Food Facts, hier geht es um Werte, die von
 * irgendwoher kommen, auch von Hand eingetippt.
 */
export function eintragAus100g(
  name: string,
  gramm: number,
  je100: { kcal: number; proteinG: number; fatG: number; carbsG: number },
): FoodEntry {
  const f = gramm / 100;
  return {
    name: String(name ?? "").trim() || "Unbenannt",
    quantity: mengeSchreiben(gramm, "g"),
    kcal: Math.round(je100.kcal * f),
    proteinG: runde1(je100.proteinG * f),
    fatG: runde1(je100.fatG * f),
    carbsG: runde1(je100.carbsG * f),
  };
}

/**
 * Die Werte je 100 Gramm aus einem bestehenden Posten.
 *
 * Gebraucht, sobald der Nutzer im Editor eine Menge ändert und die App zeigen
 * soll, worauf sie rechnet. Geht nur, wenn die Menge eine Gewichtsangabe ist:
 * "2 Eier" hat keine 100 Gramm Basis.
 */
export function je100gAus(eintrag: FoodEntry): { kcal: number; proteinG: number; fatG: number; carbsG: number } | null {
  const gramm = portionInGramm(eintrag.quantity);
  if (!gramm || gramm <= 0) return null;
  const f = 100 / gramm;
  return {
    kcal: Math.round(eintrag.kcal * f),
    proteinG: runde1(eintrag.proteinG * f),
    fatG: runde1(eintrag.fatG * f),
    carbsG: runde1(eintrag.carbsG * f),
  };
}

function runde1(wert: number): number {
  return Math.round(wert * 10) / 10;
}

/**
 * Mengen in Haushaltsmassen.
 *
 * Wer Müsli mit Milch isst, wiegt die Milch nicht, er nimmt ein Glas. Nur
 * Gramm anzubieten hiess, dass jemand ein Glas in Gramm umrechnen muss, und
 * das tut beim dritten Mal niemand mehr. Deshalb lässt sich jeder Posten mit
 * Gewichtsangabe in diesen Einheiten erfassen, mit einer Anzahl davor,
 * 0,5 EL genauso wie 2 Gläser.
 *
 * Esslöffel 15 und Teelöffel 5 sind dieselben Faustwerte wie im Regelweg,
 * `parse-offline.ts`, das Glas 250 ml wie in `agent.ts`. Tasse, Handvoll,
 * Schüssel und Teller sind Annahmen der App und keine Messung. Die Gramm
 * stehen deshalb in jeder Menge dabei, "1 Teller (350 g)", und wer es genau
 * will, stellt auf Gramm.
 */
export interface Einheit {
  id: string;
  /** So steht es in der Auswahl und in der Menge. */
  name: string;
  /** Gramm je Einheit. Milliliter zählen wie Gramm, siehe `portionInGramm`. */
  gramm: number;
}

export const EINHEITEN: Einheit[] = [
  { id: "g", name: "g", gramm: 1 },
  { id: "ml", name: "ml", gramm: 1 },
  { id: "el", name: "EL", gramm: 15 },
  { id: "tl", name: "TL", gramm: 5 },
  { id: "tasse", name: "Tasse", gramm: 150 },
  { id: "glas", name: "Glas", gramm: 250 },
  { id: "handvoll", name: "Handvoll", gramm: 30 },
  { id: "schuessel_klein", name: "kleine Schüssel", gramm: 250 },
  { id: "schuessel", name: "Schüssel", gramm: 400 },
  { id: "teller", name: "Teller", gramm: 350 },
];

/** Wie eine Menge in Einheiten aussieht: Anzahl, Einheit und die Gramm dahinter. */
export interface MengeInEinheit {
  anzahl: number;
  einheit: Einheit;
  gramm: number;
}

/** Die Grundlage, auf der ein Posten umgerechnet wird. */
export interface PostenBasis {
  gramm: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/** Ein Posten, der seine Grundlage mitträgt, damit wiederholtes Umstellen nicht wegrundet. */
export type PostenMitBasis = FoodEntry & { basis?: PostenBasis; stueckG?: number };

function falten(text: string): string {
  return text.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/** Welche Einheit am Anfang einer Menge steht, "1,5 EL (23 g)" ist EL. */
function einheitVorn(quantity: string): { anzahl: number; einheit: Einheit } | null {
  const t = falten(String(quantity ?? "")).replace(",", ".").trim();
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return null;
  const anzahl = Number(m[1]);
  if (!Number.isFinite(anzahl) || anzahl <= 0) return null;
  const rest = m[2]!.replace(/\(.*$/, "").trim();
  // Die längste Bezeichnung zuerst: "kleine Schüssel" vor "Schüssel".
  const sortiert = [...EINHEITEN].sort((a, b) => b.name.length - a.name.length);
  const einheit = sortiert.find((e) => {
    const n = falten(e.name);
    return rest === n || rest.startsWith(`${n} `) || (n.length > 2 && rest.startsWith(n));
  });
  if (!einheit) return null;
  return { anzahl, einheit };
}

/**
 * Wie viel Gramm hinter der Menge eines Postens stehen, oder null.
 *
 * "150 g", "200 ml", "1,5 EL (23 g)", "4 Stück (ca. 36 g)" und "1 Teller"
 * lassen sich lesen. "2 Eier" ohne Gramm nicht: dafür fehlt das Stückgewicht.
 */
export function grammVonMenge(quantity: string): number | null {
  const direkt = portionInGramm(quantity);
  if (direkt) return direkt;
  const vorn = einheitVorn(quantity);
  return vorn ? vorn.anzahl * vorn.einheit.gramm : null;
}

/** Die Grundlage eines Postens, aus der gespeicherten oder aus der Menge. */
export function postenBasis(eintrag: PostenMitBasis): PostenBasis | null {
  if (eintrag.basis && eintrag.basis.gramm > 0) return eintrag.basis;
  const gramm = grammVonMenge(eintrag.quantity);
  if (!gramm || gramm <= 0) return null;
  return { gramm, kcal: eintrag.kcal, proteinG: eintrag.proteinG, fatG: eintrag.fatG, carbsG: eintrag.carbsG };
}

/**
 * Die Einheiten, die für einen Posten gehen, mit Stück, wenn das
 * Stückgewicht bekannt ist. Null, wenn sich die Menge nicht in Gramm lesen
 * lässt: dann bleibt im Editor das Feld für die Zahl allein.
 */
export function einheitenFuer(eintrag: PostenMitBasis): Einheit[] | null {
  if (!postenBasis(eintrag)) return null;
  const liste = [...EINHEITEN];
  const stueck = stueckGramm(eintrag);
  if (stueck) liste.splice(2, 0, { id: "stueck", name: "Stück", gramm: stueck });
  return liste;
}

/** Gramm je Stück, aus dem Posten oder aus "4 Stück (ca. 36 g)". */
export function stueckGramm(eintrag: PostenMitBasis): number | null {
  if (Number(eintrag.stueckG) > 0) return Number(eintrag.stueckG);
  const t = falten(String(eintrag.quantity ?? "")).replace(",", ".");
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(stueck|stk|scheiben?|kugeln?)\b/);
  if (!m) return null;
  const gramm = portionInGramm(eintrag.quantity);
  const anzahl = Number(m[1]);
  return gramm && anzahl > 0 ? Math.round((gramm / anzahl) * 10) / 10 : null;
}

/** Welche Anzahl und Einheit die Menge eines Postens gerade zeigt. */
export function mengeInEinheitLesen(eintrag: PostenMitBasis): MengeInEinheit | null {
  const einheiten = einheitenFuer(eintrag);
  if (!einheiten) return null;
  const basis = postenBasis(eintrag)!;
  const vorn = einheitVorn(eintrag.quantity);
  if (vorn) {
    const e = einheiten.find((x) => x.id === vorn.einheit.id) ?? vorn.einheit;
    return { anzahl: vorn.anzahl, einheit: e, gramm: vorn.anzahl * e.gramm };
  }
  const t = falten(String(eintrag.quantity ?? ""));
  const stueck = einheiten.find((x) => x.id === "stueck");
  if (stueck && /^\d+(?:[.,]\d+)?\s*(stueck|stk)\b/.test(t)) {
    const anzahl = Number(t.replace(",", ".").match(/^\d+(?:\.\d+)?/)![0]);
    return { anzahl, einheit: stueck, gramm: basis.gramm };
  }
  const ml = /\d\s*(ml|l|cl)\b/.test(t);
  const e = einheiten.find((x) => x.id === (ml ? "ml" : "g"))!;
  const gramm = grammVonMenge(eintrag.quantity) ?? basis.gramm;
  return { anzahl: Math.round(gramm * 10) / 10, einheit: e, gramm };
}

/**
 * Setzt einen Posten auf Anzahl mal Einheit und rechnet die Nährwerte mit.
 *
 * Gerechnet wird immer von der Grundlage aus und nicht vom letzten Stand.
 * Wer zehnmal zwischen EL und Glas wechselt, hätte sonst zehnmal gerundet.
 */
export function mengeInEinheitSetzen(eintrag: PostenMitBasis, anzahl: number, einheitId: string): PostenMitBasis {
  const basis = postenBasis(eintrag);
  const einheiten = einheitenFuer(eintrag);
  const einheit = einheiten?.find((e) => e.id === einheitId);
  if (!basis || !einheit || !Number.isFinite(anzahl) || anzahl <= 0) return eintrag;
  const gramm = anzahl * einheit.gramm;
  const f = gramm / basis.gramm;
  const zahl = String(Number.isInteger(anzahl) ? anzahl : runde2(anzahl)).replace(".", ",");
  const quantity = einheit.id === "g" || einheit.id === "ml"
    ? `${zahl} ${einheit.name}`
    : `${zahl} ${einheit.name} (${Math.round(gramm)} g)`;
  const stueck = stueckGramm(eintrag);
  return {
    ...eintrag,
    quantity,
    kcal: Math.round(basis.kcal * f),
    proteinG: runde1(basis.proteinG * f),
    fatG: runde1(basis.fatG * f),
    carbsG: runde1(basis.carbsG * f),
    basis,
    ...(stueck ? { stueckG: stueck } : {}),
  };
}

function runde2(wert: number): number {
  return Math.round(wert * 100) / 100;
}
