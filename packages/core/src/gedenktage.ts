/**
 * Gedenktage und der Kalender, dem daevo glaubt.
 *
 * Zwei Fehler aus dem Betrieb. Erstens standen Geburtstage und Feiertage im
 * Briefing zwischen den Terminen, als wären sie Aufgaben. Ein Feiertag ist
 * keine, und ein Geburtstag gehört ans Ende des Tages: nach allem, was zu tun
 * ist, die eine Zeile, dass jemand angerufen werden will.
 *
 * Zweitens las daevo jeden Kalender, den iOS kennt. Wer im Google Kalender
 * eine Serie gelöscht hat, sah sie in daevo weiter, weil sie im alten
 * iCloud Kalender noch stand. Jetzt zählt der Kalender, in dem tatsächlich
 * gelebt wird: der mit den meisten Terminen im gelesenen Fenster.
 */
import type { Termin } from "./ical.js";

export type GedenkArt = "geburtstag" | "feiertag";

/** EKCalendarType: 3 abonniert, 4 Geburtstage. Andere Quellen schicken keinen. */
const TYP_ABO = 3;
const TYP_GEBURTSTAG = 4;

const FEIERTAGE = [
  "feiertag", "neujahr", "heilige drei koenige", "karfreitag", "ostersonntag", "ostermontag", "tag der arbeit",
  "christi himmelfahrt", "pfingstsonntag", "pfingstmontag", "fronleichnam", "mariae himmelfahrt",
  "tag der deutschen einheit", "reformationstag", "allerheiligen", "buss und bettag", "heiligabend",
  "1. weihnachtsfeiertag", "2. weihnachtsfeiertag", "weihnachten", "silvester", "valentinstag", "muttertag",
  "vatertag", "halloween", "nikolaus", "sommerzeit", "winterzeit", "ramadan", "ostern", "pfingsten",
];

function falte(s: string): string {
  return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9. ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Ob ein Eintrag ein Gedenktag ist und kein Termin. Geburtstage, Feiertage
 * und Jahrestage stehen in vielen Kalendern als Eintrag um 00:00 ohne
 * Ganztags Kennzeichen, etwa aus Kontakten oder einem importierten Feed. Wer
 * sie als Termin liest, bekommt um 20 Uhr die Mitteilung, morgen beginne
 * "Zoe Geburtstag" vor der Aufstehzeit. Sie belegen auch keine Zeit: ein Tag
 * mit einem Geburtstag ist nicht voll.
 *
 * Erkannt wird, was um 00:00 beginnt und mindestens 12 Stunden oder gar keine
 * Zeit dauert, dazu ein Gedenktag Wort im Titel um 00:00.
 */
export function istGanztagsartig(t: { titel: string; von: number; bis: number; ganztags?: boolean }): boolean {
  if (t.ganztags) return true;
  const d = new Date(t.von);
  if (d.getHours() !== 0 || d.getMinutes() !== 0) return false;
  const dauer = t.bis - t.von;
  return dauer <= 0 || dauer >= 12 * 3600_000 || /\b(geburtstag|feiertag|jahrestag|namenstag)\b/i.test(t.titel);
}


export type MitKalender = Termin;

/**
 * Ob ein Eintrag ein Geburtstag oder Feiertag ist. Null heisst: ein echter
 * Termin. Ein Titel allein genügt nicht: "Geburtstagsfeier bei Max" um 19 Uhr
 * ist ein Termin. Es zählt, was ganztägig ist oder um 00:00 beginnt, oder was
 * aus dem Geburtstage Kalender von iOS kommt.
 */
export function gedenkArt(t: Pick<MitKalender, "titel" | "kalender" | "kalenderTyp" | "ganztags" | "von" | "bis">): GedenkArt | null {
  const titel = falte(t.titel);
  const kalender = falte(t.kalender ?? "");
  if (t.kalenderTyp === TYP_GEBURTSTAG || /geburtstag|birthday/.test(kalender)) return "geburtstag";
  if (/feiertag|holiday/.test(kalender)) return "feiertag";
  const ohneUhr = t.ganztags || (Number.isFinite(t.von) && Number.isFinite(t.bis) && istGanztagsartig({ titel: t.titel, von: t.von, bis: t.bis, ganztags: t.ganztags }));
  if (!ohneUhr) return null;
  if (/\b(geburtstag|birthday)\b/.test(titel)) return "geburtstag";
  if (t.kalenderTyp === TYP_ABO) return "feiertag";
  if (FEIERTAGE.some((f) => titel === f || titel.startsWith(`${f} `) || titel.endsWith(` ${f}`))) return "feiertag";
  return null;
}

/** "Zoe Geburtstag", "Geburtstag von Zoe", "Zoes Geburtstag", "Zoe's birthday" werden "Zoe". */
export function geburtstagsName(titel: string): string {
  const roh = titel
    .replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, " ")
    .replace(/\b(geburtstag|birthday|geburtstage)\b/gi, " ")
    .replace(/\b(von|vom|hat|ist|heute|morgen)\b/gi, " ")
    .replace(/[’']s\b/gi, "")
    .replace(/[()\-:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Genitiv nur dort abziehen, wo er sicher ist: "Zoes" wird "Zoe", "Thomas",
  // "Ines" und "Max" bleiben, wie sie sind. Ein falsch gekürzter Name ist
  // schlimmer als ein Genitiv.
  return /^[A-ZÄÖÜ][a-zäöüß]*(oe|ee)s$/.test(roh) ? roh.slice(0, -1) : roh;
}

export interface KalenderZaehlung {
  /** Schlüssel: Quelle und Name, damit zwei Kalender mit dem Namen "Kalender" nicht zusammenfallen. */
  schluss: string;
  name: string;
  anzahl: number;
}

const schluessel = (t: MitKalender) => `${t.kalenderQuelle ?? ""}|${t.kalender ?? ""}`;
const anzeige = (t: MitKalender) => [t.kalender, t.kalenderQuelle && t.kalenderQuelle !== t.kalender ? `(${t.kalenderQuelle})` : ""].filter(Boolean).join(" ") || "Kalender";

/** Zählt die echten Termine je Kalender. Gedenktage und von daevo Eingetragenes zählen nicht. */
export function kalenderZaehlen(termine: MitKalender[]): KalenderZaehlung[] {
  const m = new Map<string, KalenderZaehlung>();
  for (const t of termine) {
    if (t.daevo || gedenkArt(t)) continue;
    const k = schluessel(t);
    const z = m.get(k) ?? { schluss: k, name: anzeige(t), anzahl: 0 };
    z.anzahl += 1;
    m.set(k, z);
  }
  return [...m.values()].sort((a, b) => b.anzahl - a.anzahl);
}

export interface KalenderWahl {
  termine: MitKalender[];
  /** Der gelesene Kalender, null wenn es nur einen gibt oder alle gelesen werden. */
  haupt: KalenderZaehlung | null;
  /** Kalender, deren Termine nicht gelesen werden. */
  ignoriert: KalenderZaehlung[];
  /** Wie viele Geburtstage und Feiertage durchgehen. */
  gedenk: number;
}

/**
 * Behält den Hauptkalender. `gewaehlt` ist der Schlüssel, den der Nutzer
 * selbst festgelegt hat, sonst gilt der mit den meisten Terminen. Von daevo
 * Eingetragenes, Geburtstage und Feiertage bleiben immer, egal woher.
 * `alle` liest jeden Kalender, wie vorher.
 */
export function kalenderWaehlen(termine: MitKalender[], opt: { gewaehlt?: string | null; alle?: boolean } = {}): KalenderWahl {
  const zaehlung = kalenderZaehlen(termine);
  const gedenk = termine.filter((t) => gedenkArt(t)).length;
  if (opt.alle || zaehlung.length <= 1) return { termine, haupt: null, ignoriert: [], gedenk };
  const haupt = zaehlung.find((z) => z.schluss === opt.gewaehlt) ?? zaehlung[0]!;
  const behalten = termine.filter((t) => t.daevo || gedenkArt(t) || schluessel(t) === haupt.schluss);
  return { termine: behalten, haupt, ignoriert: zaehlung.filter((z) => z !== haupt), gedenk };
}
