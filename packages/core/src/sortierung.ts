/**
 * Die Reihenfolge, die daevo vorgibt.
 *
 * Eine Liste ohne Reihenfolge sagt nur, wie viel da ist. Wer um sieben Uhr
 * auf sie schaut, will wissen, womit er anfängt, was danach kommt und was bis
 * morgen warten darf. Das entscheidet nicht das Modell, sondern drei Regeln,
 * die jeder nachrechnen kann: Umsatz und Geld, Frist, Wichtigkeit.
 */
import { darfNachFeierabend } from "./feierabend.js";

export type SortierStufe = 1 | 2 | 3;

export interface SortierAufgabe {
  text: string;
  /** 1 bis 3, 3 ist die höchste. */
  wichtigkeit?: number;
  /** Frist als Datum, YYYY-MM-DD. */
  faellig?: string;
}

export interface Einstufung {
  stufe: SortierStufe;
  /** Warum genau diese SortierStufe, kurz, für die Anzeige. */
  grund: string;
  /** Zum Sortieren innerhalb einer SortierStufe, höher kommt zuerst. */
  punkte: number;
}

/** Wörter, hinter denen Umsatz steht: wer zahlt, kommt vor dem, was nur liegt. */
const UMSATZ = /\b(kunde|kundin|kunden|angebot|angebote|umsatz|auftrag|abschluss|verkauf|vertrag|akquise|lead|leads|upsell|pitch|offerte|rechnung)\b/;

function falte(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

function tageBis(faellig: string, heute: string): number {
  return Math.round((Date.parse(`${faellig}T00:00:00Z`) - Date.parse(`${heute}T00:00:00Z`)) / 86400000);
}

/**
 * SortierStufe 1 ist absolute Priorität: überfällig, heute fällig, höchste
 * Wichtigkeit, Umsatz oder Geld. SortierStufe 2: mittlere Wichtigkeit oder eine Frist
 * in den nächsten drei Tagen. Alles andere ist SortierStufe 3 und darf warten.
 */
export function aufgabeStufe(a: SortierAufgabe, heute: string): Einstufung {
  const t = falte(a.text);
  const w = a.wichtigkeit ?? 1;
  const tage = a.faellig ? tageBis(a.faellig, heute) : null;
  const umsatz = UMSATZ.test(t);
  const geld = darfNachFeierabend({ text: a.text, wichtigkeit: 1 });

  let punkte = w * 10;
  if (tage !== null) punkte += tage < 0 ? 60 : tage === 0 ? 50 : tage <= 1 ? 35 : tage <= 3 ? 20 : 0;
  if (umsatz) punkte += 25;
  else if (geld) punkte += 20;

  if (tage !== null && tage < 0) return { stufe: 1, grund: "überfällig", punkte };
  if (tage === 0) return { stufe: 1, grund: "Frist heute", punkte };
  if (umsatz) return { stufe: 1, grund: "Umsatz", punkte };
  if (geld) return { stufe: 1, grund: "Geld", punkte };
  if (w >= 3) return { stufe: 1, grund: "höchste Wichtigkeit", punkte };
  if (tage !== null && tage <= 3) return { stufe: 2, grund: tage === 1 ? "Frist morgen" : `Frist in ${tage} Tagen`, punkte };
  if (w >= 2) return { stufe: 2, grund: "wichtig", punkte };
  return { stufe: 3, grund: "kann warten", punkte };
}

export type GruppeKennung = "zuerst" | "danach" | "dazwischen" | "warten" | "abends";

export interface SortierPunkt {
  art: "aufgabe" | "termin" | "essen" | "training";
  titel: string;
  unter: string;
  /** Zeitpunkt in Millisekunden, null ohne Uhrzeit. */
  um: number | null;
  grund?: string;
  id?: string;
  rezeptId?: string;
  foto?: boolean;
}

export interface SortierGruppe {
  id: GruppeKennung;
  /** Nummer für die Anzeige, nur bei den Prioritäten. */
  nr?: number;
  titel: string;
  unter: string;
  punkte: SortierPunkt[];
}
