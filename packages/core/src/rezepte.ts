/**
 * Rezepte, die in den Rest des Tages passen.
 *
 * Erst rechnen, dann zeigen. Die Menge kommt aus dem Rechenkern: jedes Rezept
 * wird auf den Anteil der Mahlzeit skaliert, den `verteileRest` für sie
 * vorsieht. Kein Modell schätzt hier Nährwerte, sie kommen aus den Zutaten.
 *
 * Gefiltert wird vor dem Sortieren, und zwar hart. Ein Rezept mit Soja für
 * jemanden mit Sojaallergie fällt raus, es landet nicht nur weiter hinten.
 * Eine Empfehlung, die einmal ein Allergen enthielt, nimmt niemand mehr ernst.
 */
import { foldUmlauts } from "./memory.js";
import type { MahlzeitArt, Rest } from "./verteilung.js";
import { REZEPTE, ZUTATEN, type Rezept, type RezeptArt, type Zutat, type ZutatKey } from "./rezepte-daten.js";

export interface Ernaehrung {
  form?: "omnivor" | "flexitarisch" | "vegetarisch" | "pescetarisch" | "vegan";
  allergien?: string[];
  unvertraeglichkeiten?: string[];
  ausschluesse?: string[];
  /** Freie Angaben wie "Pilze, Koriander". Verglichen gegen Zutatennamen. */
  meiden?: string[];
  /** Was in der Küche steht. Leer heisst: unbekannt, dann zählt es nicht. */
  geraete?: string[];
}

export interface Posten {
  key: ZutatKey;
  name: string;
  gramm: number;
  menge: string;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface RezeptEmpfehlung {
  rezept: Rezept;
  /** Faktor gegen die Grundportion. */
  faktor: number;
  posten: Posten[];
  summe: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  ziel: { kcal: number; proteinG: number; fatG: number; carbsG: number };
  /** 0 bis 100, wie gut die Portion zum Ziel der Mahlzeit passt. */
  passung: number;
  /** Zutaten, die schon im Vorrat liegen. */
  imVorrat: string[];
}

/** Was eine Ernährungsform ausschliesst. */
const FORM_SPERRT: Record<NonNullable<Ernaehrung["form"]>, string[]> = {
  omnivor: [],
  flexitarisch: [],
  pescetarisch: ["fleisch"],
  vegetarisch: ["fleisch", "fisch", "meeresfrucht"],
  vegan: ["fleisch", "fisch", "meeresfrucht", "ei", "milch", "honig"],
};

/** Die Ausschlüsse aus dem Fragebogen, übersetzt in Eigenschaften der Zutat. */
function ausschlussTrifft(ausschluss: string, z: Zutat): boolean {
  const a = foldUmlauts(ausschluss.toLowerCase());
  if (a.includes("schwein")) return z.sorte === "schwein";
  if (a.includes("rind")) return z.sorte === "rind";
  if (a.includes("meeresfr")) return z.herkunft === "meeresfrucht";
  // Alkohol, Gelatine und Innereien kommen in keiner Zutat vor. Sobald eine
  // dazukommt, braucht sie hier eine Eigenschaft, sonst rutscht sie durch.
  return false;
}

/** Ob ein freier Begriff wie "Zwiebeln" eine Zutat wie "Zwiebel" meint. */
function meidenTrifft(begriff: string, z: Zutat): boolean {
  const b = foldUmlauts(begriff.toLowerCase()).trim();
  const n = foldUmlauts(z.name.toLowerCase());
  if (b.length < 3) return false;
  // Beide Richtungen und ohne Endung: "Zwiebeln" soll "Zwiebel" treffen, und
  // "Tomate" soll "Passierte Tomaten" treffen.
  const stamm = b.replace(/(en|n|e|s)$/, "");
  return n.includes(stamm) || (stamm.length >= 4 && b.includes(n.split(/[ ,]/)[0]!));
}

/**
 * Warum ein Rezept nicht passt, oder null.
 *
 * Der Grund wird zurückgegeben statt nur ja oder nein. Wer sich wundert, warum
 * die Bolognese fehlt, soll lesen können, dass es am Rindfleisch lag.
 */
export function rezeptGesperrt(rezept: Rezept, e: Ernaehrung = {}): string | null {
  const gesperrt = new Set(FORM_SPERRT[e.form ?? "omnivor"] ?? []);
  const allergien = new Set(e.allergien ?? []);
  const unvertr = new Set(e.unvertraeglichkeiten ?? []);
  for (const { z } of rezept.zutaten) {
    const zutat: Zutat = ZUTATEN[z];
    for (const a of zutat.allergene ?? []) if (allergien.has(a)) return `enthält ${a}`;
    for (const u of zutat.unvertraeglich ?? []) if (unvertr.has(u)) return `enthält ${u}`;
    if (zutat.herkunft && gesperrt.has(zutat.herkunft)) return `nicht ${e.form}`;
    for (const a of e.ausschluesse ?? []) if (ausschlussTrifft(a, zutat)) return a;
    for (const m of e.meiden ?? []) if (meidenTrifft(m, zutat)) return `enthält ${zutat.name}`;
  }
  const geraete = e.geraete ?? [];
  if (geraete.length && rezept.geraete.length && !rezept.geraete.some((g) => geraete.includes(g))) {
    return `braucht ${rezept.geraete.join(" oder ")}`;
  }
  return null;
}

/** Welche Rezeptart zu welcher Mahlzeit passt. */
export function rezeptArtFuer(art: MahlzeitArt): RezeptArt {
  if (art === "fruehstueck") return "fruehstueck";
  if (art === "snack") return "snack";
  return "hauptmahlzeit";
}

/** Grenzen für die Portion. Ausserhalb wird aus dem Rezept ein anderes Gericht. */
export const FAKTOR_MIN = 0.6;
export const FAKTOR_MAX = 1.8;

/**
 * Rechnet ein Rezept auf ein Ziel hoch oder runter.
 *
 * Skaliert wird über die Kalorien, gerundet auf 5 Gramm, Stückzutaten wie Eier
 * auf ganze Stücke. Die Nährwerte werden danach aus den gerundeten Mengen neu
 * gerechnet und nicht aus dem Faktor: sonst stünden bei "3 Eier" die Werte von
 * 2,6 Eiern daneben, und das fällt beim Nachrechnen auf.
 */
export function rezeptPortion(rezept: Rezept, zielKcal?: number): { faktor: number; posten: Posten[] } {
  const basis = rezept.zutaten.reduce((s, { z, g }) => s + (ZUTATEN[z].per100.kcal * g) / 100, 0);
  let faktor = zielKcal && zielKcal > 0 && basis > 0 ? zielKcal / basis : 1;
  faktor = Math.round(Math.max(FAKTOR_MIN, Math.min(FAKTOR_MAX, faktor)) * 20) / 20;

  const posten = rezept.zutaten.map(({ z, g }) => {
    const zutat: Zutat = ZUTATEN[z];
    let gramm: number;
    let menge: string;
    if (zutat.stueckG) {
      const stueck = Math.max(1, Math.round((g * faktor) / zutat.stueckG));
      gramm = stueck * zutat.stueckG;
      const [eins, viele] = zutat.stueckName ?? [zutat.name, zutat.name];
      menge = `${stueck} ${stueck === 1 ? eins : viele}`;
    } else {
      gramm = Math.max(5, Math.round((g * faktor) / 5) * 5);
      menge = `${gramm} g`;
    }
    const p = zutat.per100;
    return {
      key: z, name: zutat.name, gramm, menge,
      kcal: (p.kcal * gramm) / 100, proteinG: (p.proteinG * gramm) / 100,
      fatG: (p.fatG * gramm) / 100, carbsG: (p.carbsG * gramm) / 100,
    };
  });
  return { faktor, posten };
}

/**
 * Wie gut eine Portion zum Ziel der Mahlzeit passt, 0 bis 100.
 *
 * Eine Regel und keine Messung. Kalorien und Protein wiegen je 35 Prozent,
 * Fett und Kohlenhydrate je 15. Protein wiegt so viel wie die Kalorien, weil
 * es die Zahl ist, an der die meisten ihren Tag verfehlen, und weil ein
 * Rezept, das die Kalorien trifft und das Protein nicht, die Lücke nur auf
 * später verschiebt. Jede Abweichung zählt relativ zum Ziel und höchstens
 * ganz: ein Wert, der doppelt so hoch liegt, kostet nicht mehr als einer, der
 * fehlt.
 */
export function passung(
  ist: { kcal: number; proteinG: number; fatG: number; carbsG: number },
  ziel: { kcal: number; proteinG: number; fatG: number; carbsG: number },
): number {
  const ab = (a: number, b: number) => Math.min(1, Math.abs(a - b) / Math.max(b, 1));
  const fehler = 0.35 * ab(ist.kcal, ziel.kcal) + 0.35 * ab(ist.proteinG, ziel.proteinG)
    + 0.15 * ab(ist.fatG, ziel.fatG) + 0.15 * ab(ist.carbsG, ziel.carbsG);
  return Math.round(Math.max(0, 1 - fehler) * 100);
}

export interface RezeptEingabe {
  /** Was für diese Mahlzeit vorgesehen ist, aus `verteileRest`. */
  ziel: Rest;
  art: MahlzeitArt;
  ernaehrung?: Ernaehrung;
  vorrat?: string[];
  rezepte?: Rezept[];
}

export interface RezeptErgebnis {
  empfehlungen: RezeptEmpfehlung[];
  /** Wie viele Rezepte der Art wegen der Angaben rausfielen, und warum. */
  ausgeblendet: Array<{ name: string; grund: string }>;
}

/**
 * Die passenden Rezepte für eine Mahlzeit, bestes zuerst.
 *
 * Der Vorrat entscheidet nur bei fast gleicher Passung. Ein Rezept, das zwei
 * Zutaten aus dem Kühlschrank nimmt, aber 40 Gramm Protein verfehlt, ist kein
 * besserer Vorschlag, nur ein bequemerer.
 */
export function rezeptEmpfehlungen(e: RezeptEingabe): RezeptErgebnis {
  const art = rezeptArtFuer(e.art);
  const vorrat = (e.vorrat ?? []).map((v) => foldUmlauts(v.toLowerCase()));
  const ausgeblendet: RezeptErgebnis["ausgeblendet"] = [];
  const empfehlungen: RezeptEmpfehlung[] = [];

  for (const rezept of (e.rezepte ?? REZEPTE).filter((r) => r.art === art)) {
    const grund = rezeptGesperrt(rezept, e.ernaehrung);
    if (grund) { ausgeblendet.push({ name: rezept.name, grund }); continue; }
    const { faktor, posten } = rezeptPortion(rezept, e.ziel.kcal);
    const summe = summieren(posten);
    const imVorrat = posten.filter((p) => {
      const n = foldUmlauts(p.name.toLowerCase());
      return vorrat.some((v) => v.length >= 3 && (n.includes(v) || v.includes(n.split(/[ ,]/)[0]!)));
    }).map((p) => p.name);
    empfehlungen.push({ rezept, faktor, posten, summe, ziel: e.ziel, passung: passung(summe, e.ziel), imVorrat });
  }

  empfehlungen.sort((a, b) => {
    const d = b.passung - a.passung;
    if (Math.abs(d) > 3) return d;
    return b.imVorrat.length - a.imVorrat.length || d || a.rezept.minuten - b.rezept.minuten;
  });
  return { empfehlungen, ausgeblendet };
}

function summieren(posten: Posten[]) {
  const s = posten.reduce((a, p) => ({
    kcal: a.kcal + p.kcal, proteinG: a.proteinG + p.proteinG, fatG: a.fatG + p.fatG, carbsG: a.carbsG + p.carbsG,
  }), { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 });
  return { kcal: Math.round(s.kcal), proteinG: Math.round(s.proteinG), fatG: Math.round(s.fatG), carbsG: Math.round(s.carbsG) };
}

/** Eine Empfehlung als Text, für den Coach und den Regelweg. */
export function empfehlungText(e: RezeptEmpfehlung): string {
  const s = e.summe;
  const vorrat = e.imVorrat.length ? ` Aus deinem Vorrat: ${e.imVorrat.join(", ")}.` : "";
  return `${e.rezept.name}, ${e.passung} Prozent passend, ${e.rezept.minuten} Minuten. `
    + `${s.kcal} kcal, ${s.proteinG} g Protein, ${s.fatG} g Fett, ${s.carbsG} g Kohlenhydrate. `
    + `Zutaten: ${e.posten.map(postenText).join(", ")}.${vorrat}`;
}

/** "120 g Reis, roh" oder "3 Eier": bei Stückzutaten steckt der Name schon in der Menge. */
export function postenText(p: Posten): string {
  return p.menge.endsWith(" g") ? `${p.menge} ${p.name}` : p.menge;
}
