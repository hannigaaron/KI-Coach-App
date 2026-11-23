import { foldUmlauts } from "./memory.js";

/**
 * Welcher Tag gemeint ist, wenn jemand "morgen", "übermorgen" oder "am
 * Freitag" sagt.
 *
 * Der Anlass: "Kurzes Briefing für morgen" lieferte den heutigen Tag, weil das
 * Werkzeug `briefing_erstellen` nur `art: "morgen"` kannte, und das hiess das
 * Morgenbriefing von heute. Eine Frage nach einem Tag darf nie davon abhängen,
 * ob das Modell die Benennung eines Parameters richtig deutet. Deshalb löst
 * dieselbe Funktion den Tag auf, im Regelweg wie im Werkzeug.
 *
 * Tage sind JJJJ-MM-TT. Gerechnet wird mit UTC Mitternacht, damit keine
 * Sommerzeit einen Tag verschiebt.
 */

const WOCHENTAGE: Array<[string, number]> = [
  ["montag", 1], ["dienstag", 2], ["mittwoch", 3], ["donnerstag", 4],
  ["freitag", 5], ["samstag", 6], ["sonnabend", 6], ["sonntag", 0],
];
const NAMEN = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export function tagVerschieben(tag: string, n: number): string {
  const d = new Date(`${tag}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function wochentagVon(tag: string): number {
  return new Date(`${tag}T00:00:00Z`).getUTCDay();
}

/** "Dienstag, 24. November": Wochentag und Datum, damit niemand raten muss. */
export function tagLang(tag: string): string {
  const d = new Date(`${tag}T00:00:00Z`);
  return `${NAMEN[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONATE[d.getUTCMonth()]}`;
}

/** "heute", "morgen", "übermorgen" oder der Wochentag mit Datum. */
export function tagWort(tag: string, heute: string): string {
  if (tag === heute) return "heute";
  if (tag === tagVerschieben(heute, 1)) return "morgen";
  if (tag === tagVerschieben(heute, 2)) return "übermorgen";
  if (tag === tagVerschieben(heute, -1)) return "gestern";
  return tagLang(tag);
}

export interface Tagwahl {
  tag: string;
  /** Wie der Nutzer es gesagt hat, normalisiert: heute, morgen, übermorgen oder der Wochentag. */
  wort: string;
}

/**
 * Löst eine Angabe auf: ISO Datum, heute, morgen, übermorgen, ein Wochentag
 * oder "25.11.". Ein Wochentag ist sein nächstes Vorkommen nach heute, ein
 * Wochentag, der heute ist, meint heute nur mit dem Wort heute.
 */
export function tagAufloesen(angabe: string | undefined | null, heute: string): string | null {
  const t = foldUmlauts(String(angabe ?? "").toLowerCase()).trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return Number.isNaN(Date.parse(`${t}T00:00:00Z`)) ? null : t;
  return tagAusText(t, heute)?.tag ?? null;
}

/**
 * Sucht in einem Satz einen Tag. Gibt null zurück, wenn keiner genannt ist.
 *
 * "Guten Morgen" und "Morgenbriefing" sind kein Tag, "heute Morgen" ist
 * heute. "Morgen früh" und "morgen Abend" sind morgen. Das Wort muss ein
 * ganzes Wort sein: "Morgenroutine" nennt keinen Tag.
 */
export function tagAusText(text: string, heute: string): Tagwahl | null {
  const t = foldUmlauts(String(text ?? "").toLowerCase());

  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso && !Number.isNaN(Date.parse(`${iso[1]}T00:00:00Z`))) return { tag: iso[1]!, wort: tagWort(iso[1]!, heute) };

  if (/\bu?e?bermorgen\b/.test(t)) return { tag: tagVerschieben(heute, 2), wort: "übermorgen" };
  if (/\bvorgestern\b/.test(t)) return { tag: tagVerschieben(heute, -2), wort: tagLang(tagVerschieben(heute, -2)) };
  if (/\bgestern\b/.test(t)) return { tag: tagVerschieben(heute, -1), wort: "gestern" };

  // "heute morgen" ist der Morgen von heute und nicht der Tag danach.
  const heuteMorgen = /\bheute\s+morgen\b/.test(t);
  const gutenMorgen = /\b(guten|guter)\s+morgen\b/.test(t);
  if (/\bmorgen\b/.test(t) && !heuteMorgen && !gutenMorgen) return { tag: tagVerschieben(heute, 1), wort: "morgen" };
  if (/\bmorgige[nrms]?\b/.test(t)) return { tag: tagVerschieben(heute, 1), wort: "morgen" };
  if (/\bheute\b|\bheutige[nrms]?\b/.test(t)) return { tag: heute, wort: "heute" };

  for (const [name, nr] of WOCHENTAGE) {
    if (new RegExp(`\\b${name}s?\\b`).test(t)) {
      let schritt = (nr - wochentagVon(heute) + 7) % 7;
      if (schritt === 0) schritt = 7;
      const tag = tagVerschieben(heute, schritt);
      return { tag, wort: tagWort(tag, heute) };
    }
  }

  // "am 25.11." oder "am 25.11.2026". Ohne Jahr das nächste Vorkommen.
  const dm = t.match(/\b(\d{1,2})\.\s?(\d{1,2})\.(?:\s?(\d{2,4}))?/);
  if (dm) {
    const tag0 = Number(dm[1]);
    const mon = Number(dm[2]);
    if (tag0 >= 1 && tag0 <= 31 && mon >= 1 && mon <= 12) {
      let jahr = dm[3] ? Number(dm[3]) : Number(heute.slice(0, 4));
      if (jahr < 100) jahr += 2000;
      let kandidat = `${jahr}-${String(mon).padStart(2, "0")}-${String(tag0).padStart(2, "0")}`;
      if (!dm[3] && kandidat < heute) kandidat = `${jahr + 1}-${String(mon).padStart(2, "0")}-${String(tag0).padStart(2, "0")}`;
      if (!Number.isNaN(Date.parse(`${kandidat}T00:00:00Z`))) return { tag: kandidat, wort: tagWort(kandidat, heute) };
    }
  }
  return null;
}
