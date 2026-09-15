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
