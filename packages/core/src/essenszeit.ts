/**
 * Wann etwas gegessen wurde, aus dem Satz, in dem es eingetragen wird.
 *
 * "Heute Morgen hatte ich 3 Eier" landete im Betrieb um 13:48 als
 * Mittagessen, weil jeder Eintrag die Uhrzeit des Eintragens bekam. Alles,
 * was an der Uhrzeit hängt, rechnete danach falsch: welche Mahlzeit schon
 * gegessen ist, die Aufteilung des Rests, der Abstand zur letzten Mahlzeit.
 *
 * Gelesen werden ein Tag (heute, gestern, vorgestern) und eine Zeit. Eine
 * genannte Uhrzeit gilt genau. Ein Wort wie "morgens" oder "zum Abendessen"
 * bekommt eine feste Uhrzeit mitten in seinem Fenster, so dass `artZurUhrzeit`
 * in herkunft.ts dieselbe Mahlzeit daraus liest: Frühstück 8:00, Vormittag
 * 10:00, Mittag 12:30, Nachmittag 15:30, Abend 19:00, Nacht 22:00. Die
 * Zeiten sind eine Regel der App und keine Messung, die Antwort nennt sie,
 * damit man sie korrigieren kann.
 *
 * Steht nichts davon im Satz, kommt null zurück, und es gilt jetzt. Weiter
 * zurück als vorgestern wird nichts gelesen: ein Satz über letzte Woche ist
 * fast nie ein Nachtrag, und ein geratener Tag ist schlimmer als jetzt.
 */
import { foldUmlauts } from "./memory.js";

export interface Essenszeit {
  /** 0 heute, 1 gestern, 2 vorgestern. */
  tageZurueck: number;
  /** HH:MM, oder null, wenn nur ein Tag genannt ist. */
  uhrzeit: string | null;
  /** Das Wort, aus dem die Zeit stammt, für die Antwort. */
  grund: string | null;
}

const FENSTER: Array<[RegExp, string, string]> = [
  [/\b(nachts|in der nacht|spaetabends|spaet abends|mitternacht)\b/, "22:00", "nachts"],
  [/\b(abendessen|abendbrot|abends|am abend|zum abend|heute abend|gestern abend|vorgestern abend)\b/, "19:00", "abends"],
  [/\b(nachmittags|am nachmittag|heute nachmittag|gestern nachmittag|vorgestern nachmittag)\b/, "15:30", "nachmittags"],
  [/\b(mittagessen|mittags|zu mittag|zum mittag|am mittag|heute mittag|gestern mittag|vorgestern mittag)\b/, "12:30", "mittags"],
  [/\b(vormittags|am vormittag|heute vormittag|gestern vormittag|vorgestern vormittag)\b/, "10:00", "vormittags"],
  [/\b(fruehstueck\w*|morgens|am morgen|heute morgen|gestern morgen|vorgestern morgen|heute frueh|gestern frueh)\b/, "08:00", "morgens"],
];

const zwei = (n: number) => String(n).padStart(2, "0");

/** Liest Tag und Zeit aus einem Satz. Null, wenn nichts davon dasteht. */
export function essenszeitAus(satz: string): Essenszeit | null {
  const t = foldUmlauts(String(satz ?? "").toLowerCase());
  let tageZurueck = 0;
  let tagGenannt = false;
  if (/\bvorgestern\b/.test(t)) { tageZurueck = 2; tagGenannt = true; }
  else if (/\bgestern\b/.test(t)) { tageZurueck = 1; tagGenannt = true; }
  else if (/\bheute\b/.test(t)) tagGenannt = true;

  let uhrzeit: string | null = null;
  let grund: string | null = null;
  const fenster = FENSTER.find(([muster]) => muster.test(t));

  // Eine genannte Uhrzeit: "um 8", "um 13:30", "8 Uhr", "um halb 8".
  const halb = t.match(/\bum halb (\d{1,2})\b/);
  const genau = t.match(/\bum (\d{1,2})(?:[:.](\d{2}))?(?: ?uhr)?\b/) ?? t.match(/\b(\d{1,2})(?:[:.](\d{2}))? ?uhr\b/);
  if (halb || genau) {
    let h = halb ? Number(halb[1]) - 1 : Number(genau![1]);
    const m = halb ? 30 : Number(genau![2] ?? 0);
    // "um 8 abends" heisst 20 Uhr. Am Nachmittag und abends gibt es kein 7 Uhr.
    if (fenster && ["abends", "nachts", "nachmittags"].includes(fenster[2]) && h >= 1 && h < 12) h += 12;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      uhrzeit = `${zwei(h)}:${zwei(m)}`;
      grund = `um ${uhrzeit}`;
    }
  }
  if (!uhrzeit && fenster) { uhrzeit = fenster[1]; grund = fenster[2]; }
  if (!uhrzeit && !(tagGenannt && tageZurueck > 0)) return null;
  return { tageZurueck, uhrzeit, grund };
}
