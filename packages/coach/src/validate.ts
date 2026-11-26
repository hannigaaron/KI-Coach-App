import type { FoodEntry } from "@daevo/core";

export interface ValidationResult {
  entries: FoodEntry[];
  warnings: string[];
  /**
   * Posten ohne jede Angabe: null Kalorien und null Makros. Sie kommen nicht
   * in den Tag, sondern zurück an den Aufrufer, der nachschätzen lässt oder
   * fragt. Im Betrieb standen "Hähnchenfleisch" und "Cocktailsauce" mit 0
   * kcal und der Menge "<UNKNOWN>" in einem Dürüm, und der Tag war um
   * mehrere hundert Kalorien zu niedrig, ohne dass es jemand sah.
   */
  offen: string[];
}

/**
 * Was wirklich keine Kalorien hat. Nur dafür ist 0 kcal eine Angabe und
 * keine Lücke. Abgeglichen wird auf ganze Wörter im kleingeschriebenen Namen.
 */
const OHNE_KALORIEN = /\b(wasser|mineralwasser|sprudel|tee|kräutertee|kaffee schwarz|espresso|zero|süßstoff|suessstoff|salz|pfeffer|gewürz|gewuerz|gewürze|essig|eiswürfel|eis würfel|kaugummi zuckerfrei)\b/;

/** Eine Menge, die keine ist: Platzhalter des Modells statt einer Angabe. */
export function istPlatzhalter(menge: unknown): boolean {
  if (typeof menge !== "string") return true;
  return /^\s*(<[^>]*>|unknown|unbekannt|n\/?a|null|undefined|\?+|-+)?\s*$/i.test(menge);
}

const MAX_KCAL_PER_ENTRY = 3000;

/**
 * Prüft Modellantworten auf Rechenfehler und Ausreisser.
 *
 * Sprachmodelle rechnen Kalorien häufig falsch. Deshalb gilt hier die
 * Makrorechnung als Wahrheit: kcal = Protein*4 + Fett*9 + Kohlenhydrate*4.
 * Weicht der gelieferte Wert um mehr als 10 Prozent ab, wird er korrigiert.
 */
export function validateEntries(raw: unknown): ValidationResult {
  const warnings: string[] = [];
  const entries: FoodEntry[] = [];
  const offen: string[] = [];
  if (!Array.isArray(raw)) return { entries, warnings: ["Antwort enthielt keine Liste von Einträgen."], offen };

  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) continue;

    const proteinG = nonNegative(rec.proteinG);
    const fatG = nonNegative(rec.fatG);
    const carbsG = nonNegative(rec.carbsG);
    const claimedKcal = nonNegative(rec.kcal);
    const derivedKcal = Math.round(proteinG * 4 + fatG * 9 + carbsG * 4);

    let kcal = Math.round(claimedKcal);
    if (derivedKcal > 0 && Math.abs(claimedKcal - derivedKcal) > derivedKcal * 0.1) {
      warnings.push(`${name}: Kalorien auf ${derivedKcal} kcal korrigiert, geliefert waren ${Math.round(claimedKcal)} kcal.`);
      kcal = derivedKcal;
    }
    if (kcal > MAX_KCAL_PER_ENTRY) {
      warnings.push(`${name}: ${kcal} kcal für einen Posten ist unplausibel. Bitte Menge prüfen.`);
    }

    // Null in allem ist keine Angabe, sondern eine Lücke. Eingetragen
    // stünde sie wie gegessen und nichts gekostet.
    if (kcal === 0 && proteinG === 0 && fatG === 0 && carbsG === 0 && !OHNE_KALORIEN.test(name.toLowerCase())) {
      offen.push(name);
      continue;
    }

    entries.push({
      name,
      quantity: istPlatzhalter(rec.quantity) ? "geschätzt" : String(rec.quantity).trim(),
      kcal,
      proteinG: round1(proteinG),
      fatG: round1(fatG),
      carbsG: round1(carbsG),
    });
  }
  return { entries, warnings, offen };
}

function nonNegative(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
