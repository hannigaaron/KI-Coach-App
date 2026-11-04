/**
 * Eigene Erinnerungen des Nutzers.
 *
 * Die Impulse am Tag sind für alle dieselben. Was jemand selbst braucht, kennt
 * nur er: die Tablette um acht, die Schilddrüse vor dem Frühstück, das Spray
 * am Abend. Deshalb kann er eigene anlegen, im Profil oder im Gespräch.
 *
 * Eine Erinnerung ist ein Text, eine Uhrzeit und die Wochentage. Keine Tage
 * heisst täglich. Wochentage zählen ab Montag mit 1 bis Sonntag mit 7, wie
 * nach ISO 8601, denn so denkt jemand in Deutschland über seine Woche.
 *
 * Kein Medizinprodukt. Eine Erinnerung ist eine Mitteilung des iPhones und
 * kann ausbleiben, wenn Mitteilungen ausgeschaltet sind oder das Gerät aus
 * ist. Das gehört gesagt, gerade bei Medikamenten.
 */
import { foldUmlauts } from "./memory.js";

export interface EigeneErinnerung {
  id: string;
  text: string;
  /** HH:MM, wenn die Erinnerung an einer festen Uhrzeit hängt. */
  uhrzeit?: string;
  /**
   * Oder am eigenen Tag: "schlafen" heisst Schlafenszeit, "aufstehen" die
   * Aufstehzeit, beides aus `tagesrandFuer` und damit je Tag verschieden.
   * Die Supplemente vor dem Schlafen kommen dann auch am Wochenende eine
   * Stunde vorher, wenn jemand dort später ins Bett geht.
   */
  bezug?: "schlafen" | "aufstehen";
  /** Minuten zum Bezug, negativ heisst davor. */
  versatz?: number;
  /** 1 Montag bis 7 Sonntag. Leer heisst täglich. */
  tage: number[];
  /**
   * JJJJ-MM-TT bei einer einmaligen Erinnerung. Dann zählen die Wochentage
   * nicht, sie kommt genau an diesem Tag und fällt danach weg. Ohne das gab
   * es auf "erinnere mich heute um 22:30" nur zwei Antworten: eine tägliche
   * Erinnerung, die niemand wollte, oder eine Aufgabe ohne Mitteilung.
   */
  datum?: string;
  /** Kennung und Beginn des Kalendertermins dazu, damit Löschen ihn mitnimmt. */
  kalender?: { eid: string; von: number };
}

/** Obergrenze. iOS hält 64 Mitteilungen, und die Impulse brauchen auch Platz. */
export const MAX_EIGENE = 6;

/**
 * Obergrenze für einmalige. Jede kostet genau eine Mitteilung, nicht sieben
 * wie eine tägliche, deshalb zählen sie getrennt und dürfen mehr sein.
 */
export const MAX_EINMALIG = 12;

/** Ob eine Erinnerung einmalig ist. */
export function istEinmalig(e: Pick<EigeneErinnerung, "datum">): boolean {
  return typeof e.datum === "string" && e.datum.length > 0;
}

/** Ob eine einmalige Erinnerung vorbei ist und weg kann. */
export function erinnerungVorbei(e: EigeneErinnerung, jetzt: { tag: string; uhrzeit: string }): boolean {
  if (!istEinmalig(e)) return false;
  if ((e.datum as string) < jetzt.tag) return true;
  return e.datum === jetzt.tag && !!e.uhrzeit && e.uhrzeit < jetzt.uhrzeit;
}

export const WOCHENTAG_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Wochentag eines Datums JJJJ-MM-TT, 1 Montag bis 7 Sonntag. */
export function wochentagIso(tag: string): number {
  const d = new Date(`${tag}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Ob die Erinnerung an diesem Tag kommt. */
export function erinnerungAmTag(e: EigeneErinnerung, tag: string): boolean {
  if (istEinmalig(e)) return e.datum === tag;
  return !e.tage?.length || e.tage.includes(wochentagIso(tag));
}

function minutenVon(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function hhmm(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Die Uhrzeit an einem Tag. Feste Uhrzeit oder Bezug plus Versatz.
 * `rand` sind Aufsteh und Schlafenszeit dieses Tages.
 */
export function erinnerungUhrzeit(e: EigeneErinnerung, rand: { wakeTime: string; sleepTime: string }): string | null {
  if (e.bezug) {
    const basis = e.bezug === "schlafen" ? rand.sleepTime : rand.wakeTime;
    if (!/^\d{1,2}:\d{2}$/.test(String(basis ?? ""))) return null;
    return hhmm(minutenVon(basis) + (e.versatz ?? 0));
  }
  return e.uhrzeit ?? null;
}

/** "08:00" oder "1 Stunde vor dem Schlafen". */
export function wannText(e: EigeneErinnerung): string {
  if (!e.bezug) return e.uhrzeit ?? "";
  const v = e.versatz ?? 0;
  const ziel = e.bezug === "schlafen" ? "dem Schlafen" : "dem Aufstehen";
  if (v === 0) return e.bezug === "schlafen" ? "zur Schlafenszeit" : "beim Aufstehen";
  const abs = Math.abs(v);
  const dauer = abs % 60 === 0 ? (abs === 60 ? "1 Stunde" : `${abs / 60} Stunden`) : `${abs} Minuten`;
  return `${dauer} ${v < 0 ? "vor" : "nach"} ${ziel}`;
}

/**
 * "heute", "morgen", "übermorgen" oder "am 3. Nov.". Der Monat als Kürzel,
 * wie im Bericht: 3.11. und 11.3. unterscheiden sich nur in der Reihenfolge.
 */
export function datumText(datum: string, heute: string): string {
  const tage = Math.round((Date.parse(`${datum}T12:00:00Z`) - Date.parse(`${heute}T12:00:00Z`)) / 86400000);
  if (tage === 0) return "heute";
  if (tage === 1) return "morgen";
  if (tage === 2) return "übermorgen";
  const [, m, d] = datum.split("-").map(Number);
  const monate = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
  return `am ${d}. ${monate[(m ?? 1) - 1]}`;
}

/** Die Zeile unter einer Erinnerung: "täglich, 08:00" oder "heute, 22:30". */
export function erinnerungZeile(e: EigeneErinnerung, heute: string): string {
  if (istEinmalig(e)) return `${datumText(e.datum as string, heute)}, ${e.uhrzeit ?? ""}, einmalig`;
  return `${tageText(e.tage)}, ${wannText(e)}`;
}

/** "täglich", "werktags", "Mo, Mi, Fr". */
export function tageText(tage: number[]): string {
  const t = [...new Set(tage ?? [])].filter((n) => n >= 1 && n <= 7).sort((a, b) => a - b);
  if (t.length === 0 || t.length === 7) return "täglich";
  if (t.join() === "1,2,3,4,5") return "werktags";
  if (t.join() === "6,7") return "am Wochenende";
  return t.map((n) => WOCHENTAG_KURZ[n - 1]).join(", ");
}

/** Prüft eine Erinnerung, bevor sie gespeichert wird. Gibt den Fehler zurück oder null. */
export function erinnerungFehler(e: Partial<EigeneErinnerung>): string | null {
  if (!e.text || String(e.text).trim().length < 2) return "Woran soll ich dich erinnern?";
  if (String(e.text).length > 120) return "Das ist zu lang für eine Mitteilung. Höchstens 120 Zeichen.";
  if (e.bezug) {
    if (!["schlafen", "aufstehen"].includes(e.bezug)) return "Bezug muss Schlafen oder Aufstehen sein.";
    if (!Number.isInteger(e.versatz ?? 0) || Math.abs(e.versatz ?? 0) > 720) return "Der Abstand stimmt nicht.";
  } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(e.uhrzeit ?? ""))) return "Um wie viel Uhr?";
  if (!Array.isArray(e.tage) || e.tage.some((n) => !Number.isInteger(n) || n < 1 || n > 7)) {
    return "Die Wochentage stimmen nicht.";
  }
  if (e.datum !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.datum)) || Number.isNaN(Date.parse(`${e.datum}T12:00:00Z`))) {
      return "An welchem Tag?";
    }
    // Eine einmalige Erinnerung braucht eine Uhrzeit. "Eine Stunde vor dem
    // Schlafen" an einem einzelnen Tag ginge, ist aber nie gefragt worden.
    if (e.bezug) return "Für eine einmalige Erinnerung brauche ich eine Uhrzeit.";
  }
  return null;
}

/** Heute und jetzt in Ortszeit, für den Regelweg ohne mitgegebene Zeit. */
function jetztOrt(): { tag: string; uhrzeit: string } {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return { tag: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`, uhrzeit: `${z(d.getHours())}:${z(d.getMinutes())}` };
}

function tagPlus(tag: string, n: number): string {
  return new Date(Date.parse(`${tag}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

const TAGE_WORTE: [RegExp, number[]][] = [
  [/\b(jeden tag|taeglich|jeden morgen|jeden abend|jede nacht)\b/, []],
  [/\b(werktags|unter der woche|wochentags)\b/, [1, 2, 3, 4, 5]],
  [/\b(am wochenende|wochenends)\b/, [6, 7]],
];

const EINZELNE: [RegExp, number][] = [
  [/\bmontags?\b/, 1], [/\bdienstags?\b/, 2], [/\bmittwochs?\b/, 3], [/\bdonnerstags?\b/, 4],
  [/\bfreitags?\b/, 5], [/\bsamstags?\b/, 6], [/\bsonntags?\b/, 7],
];

/**
 * Liest eine Erinnerung aus einem Satz, ohne Modell.
 *
 * Erkannt wird nur, was eindeutig ist: das Wort "erinnere" und eine echte
 * Uhrzeit. "Erinnere mich später" hat keine, und eine geratene Uhrzeit bei
 * einem Medikament ist schlimmer als eine Rückfrage. Ohne Tagesangabe gilt
 * täglich, denn so sind fast alle wiederkehrenden Erinnerungen gemeint.
 */
export function erinnerungAus(satz: string, jetzt: { tag: string; uhrzeit: string } = jetztOrt()): Omit<EigeneErinnerung, "id"> | null {
  const roh = String(satz ?? "");
  const text = foldUmlauts(roh.toLowerCase());
  if (!/\berinner/.test(text)) return null;
  // Heute, morgen, übermorgen und "in 20 Minuten" sind einmalig. "Gleich"
  // und "später" haben keine Uhrzeit, dort fragt der Coach nach.
  const einmalig = /\b(heute|morgen|uebermorgen|heute abend|in \d+ (minuten|min|stunden?))\b/.test(text)
    && !/\bjeden morgen\b/.test(text);
  if (einmalig) return einmaligAus(roh, text, jetzt);
  if (/\b(gleich|spaeter)\b/.test(text)) return null;

  const relativ = relativAus(text);
  const zeit = relativ ? null : /\bum (\d{1,2})(?:[:.](\d{2}))?(?:\s*uhr)?\b/.exec(text) ?? /\b(\d{1,2})(?:[:.](\d{2}))?\s*uhr\b/.exec(text);
  if (!zeit && !relativ) return null;
  let uhrzeit: string | undefined;
  if (zeit) {
    let stunde = Number(zeit[1]);
    const minute = Number(zeit[2] ?? 0);
    if (stunde > 23 || minute > 59) return null;
    // "um 8 abends" ist 20 Uhr. "um 8" allein bleibt 8, nicht geraten.
    if (stunde < 12 && /\b(abends|am abend|nachmittags)\b/.test(text)) stunde += 12;
    uhrzeit = `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  let tage: number[] = [];
  for (const [muster, werte] of TAGE_WORTE) if (muster.test(text)) tage = werte;
  if (!tage.length) tage = EINZELNE.filter(([m]) => m.test(text)).map(([, n]) => n);

  // Der Inhalt steht im Original hinter "an" oder "dass", nicht im
  // gefalteten Text, sonst stünde "Schilddruese" in der Mitteilung.
  const inhalt = /\b(?:daran,?|an|dass ich|dass)\s+(.+)$/i.exec(roh.replace(/[.!?]+\s*$/, ""));
  let was = (inhalt?.[1] ?? "").trim();
  was = was
    .replace(RELATIV_ROH, "")
    .replace(/\b(jeden tag|täglich|werktags|am wochenende|jeden morgen|jeden abend)\b/gi, "")
    .replace(/\bum \d{1,2}([:.]\d{2})?(\s*uhr)?\b/gi, "")
    .replace(/\b\d{1,2}([:.]\d{2})?\s*uhr\b/gi, "")
    .replace(/\b(abends|morgens|nachmittags|am abend)\b/gi, "")
    .replace(/\b(montags?|dienstags?|mittwochs?|donnerstags?|freitags?|samstags?|sonntags?)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[,\s]+$/, "");
  if (was.length < 2) return null;
  was = was.charAt(0).toUpperCase() + was.slice(1);
  if (relativ) return { text: was.slice(0, 120), ...relativ, tage };
  return { text: was.slice(0, 120), uhrzeit, tage };
}

/**
 * Eine einmalige Erinnerung aus einem Satz. Nur mit echter Uhrzeit oder
 * "in 20 Minuten", sonst null und der Coach fragt. Liegt die Uhrzeit heute
 * schon hinter uns, gibt es ebenfalls nichts: still auf morgen zu schieben
 * wäre geraten.
 */
function einmaligAus(roh: string, text: string, jetzt: { tag: string; uhrzeit: string }): Omit<EigeneErinnerung, "id"> | null {
  let datum: string;
  let uhrzeit: string;
  const inZeit = /\bin (\d+) (minuten|min|stunden?)\b/.exec(text);
  if (inZeit) {
    const minuten = Number(inZeit[1]) * (/^st/.test(inZeit[2] ?? "") ? 60 : 1);
    if (minuten < 1 || minuten > 24 * 60) return null;
    const [h = 0, m = 0] = jetzt.uhrzeit.split(":").map(Number);
    const ziel = h * 60 + m + minuten;
    datum = tagPlus(jetzt.tag, Math.floor(ziel / 1440));
    uhrzeit = hhmm(ziel);
  } else {
    const zeit = /\bum (\d{1,2})(?:[:.](\d{2}))?(?:\s*uhr)?\b/.exec(text) ?? /\b(\d{1,2})(?:[:.](\d{2}))?\s*uhr\b/.exec(text);
    if (!zeit) return null;
    let stunde = Number(zeit[1]);
    const minute = Number(zeit[2] ?? 0);
    if (stunde > 23 || minute > 59) return null;
    if (stunde < 12 && /\b(abends|am abend|heute abend|nachmittags)\b/.test(text)) stunde += 12;
    uhrzeit = `${String(stunde).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const versatz = /\buebermorgen\b/.test(text) ? 2 : /\bmorgen\b/.test(text) ? 1 : 0;
    datum = tagPlus(jetzt.tag, versatz);
    if (versatz === 0 && uhrzeit <= jetzt.uhrzeit) return null;
  }
  const inhalt = /\b(?:daran,?|an|dass ich|dass)\s+(.+)$/i.exec(roh.replace(/[.!?]+\s*$/, ""));
  let was = (inhalt?.[1] ?? "")
    .replace(/\b(heute abend|heute|übermorgen|morgen|abends|morgens|nachmittags|am abend)\b/gi, "")
    .replace(/\bin \d+ (minuten|min|stunden?)\b/gi, "")
    .replace(/\bum \d{1,2}([:.]\d{2})?(\s*uhr)?\b/gi, "")
    .replace(/\b\d{1,2}([:.]\d{2})?\s*uhr\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[,\s]+|[,\s]+$/g, "");
  if (was.length < 2) return null;
  was = was.charAt(0).toUpperCase() + was.slice(1);
  return { text: was.slice(0, 120), uhrzeit, tage: [], datum };
}

const ZAHLWORTE: Record<string, number> = { eine: 1, einer: 1, ein: 1, zwei: 2, drei: 3, halbe: 0.5 };

/** Der Teil "eine Stunde vor dem Schlafengehen" im Original, zum Herausschneiden. */
const RELATIV_ROH = /,?\s*((eine?r?|zwei|drei|eine halbe|\d{1,3})\s+(stunden?|std|minuten|min)\s+)?((vor|nach)\s+(dem\s+|der\s+|meiner\s+)?(schlafen(gehen)?|schlafenszeit|zubettgehen|insbettgehen|ins bett gehen|bett|aufstehen|aufwachen)|bevor ich (schlafen|ins bett) gehe)\b/gi;

/**
 * "eine Stunde vor dem Schlafengehen", "30 Minuten nach dem Aufstehen",
 * "vor dem Schlafen". Ohne Dauer zählt der Zeitpunkt selbst: "vor dem
 * Schlafen" heisst dann zur Schlafenszeit, nicht eine geratene halbe Stunde.
 */
function relativAus(text: string): { bezug: "schlafen" | "aufstehen"; versatz: number } | null {
  // "bevor ich schlafen gehe" heisst dasselbe wie "vor dem Schlafen".
  const t = text.replace(/\bbevor ich (schlafen|ins bett) gehe\b/g, "vor dem schlafen");
  const m = /\b(?:((?:eine halbe)|eine?r?|zwei|drei|\d{1,3})\s+(stunden?|std|minuten|min)\s+)?(vor|nach)\s+(?:dem\s+|der\s+|meiner\s+)?(schlafen(?:gehen)?|schlafenszeit|zubettgehen|insbettgehen|ins bett gehen|bett|aufstehen|aufwachen)\b/.exec(t);
  if (!m) return null;
  const bezug = /aufsteh|aufwach/.test(m[4] ?? "") ? "aufstehen" : "schlafen";
  let minuten = 0;
  if (m[1]) {
    const zahl = m[1] === "eine halbe" ? 0.5 : (ZAHLWORTE[m[1]] ?? Number(m[1]));
    if (!Number.isFinite(zahl)) return null;
    minuten = Math.round(/^st/.test(m[2] ?? "") ? zahl * 60 : zahl);
  }
  if (minuten > 720) return null;
  return { bezug, versatz: m[3] === "vor" && minuten ? -minuten : minuten };
}
