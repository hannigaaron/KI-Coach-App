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
}

/** Obergrenze. iOS hält 64 Mitteilungen, und die Impulse brauchen auch Platz. */
export const MAX_EIGENE = 6;

export const WOCHENTAG_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Wochentag eines Datums JJJJ-MM-TT, 1 Montag bis 7 Sonntag. */
export function wochentagIso(tag: string): number {
  const d = new Date(`${tag}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Ob die Erinnerung an diesem Tag kommt. */
export function erinnerungAmTag(e: EigeneErinnerung, tag: string): boolean {
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
  return null;
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
export function erinnerungAus(satz: string): Omit<EigeneErinnerung, "id"> | null {
  const roh = String(satz ?? "");
  const text = foldUmlauts(roh.toLowerCase());
  if (!/\berinner/.test(text)) return null;
  // Eine einmalige Sache für heute oder morgen ist eine Aufgabe, keine
  // wiederkehrende Erinnerung.
  if (/\b(heute|morgen|uebermorgen|gleich|spaeter|in \d+ (minuten|stunden))\b/.test(text)
    && !/\bjeden morgen\b/.test(text)) return null;

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

const ZAHLWORTE: Record<string, number> = { eine: 1, einer: 1, ein: 1, zwei: 2, drei: 3, halbe: 0.5 };

/** Der Teil "eine Stunde vor dem Schlafengehen" im Original, zum Herausschneiden. */
const RELATIV_ROH = /,?\s*((eine?r?|zwei|drei|eine halbe|\d{1,3})\s+(stunden?|std|minuten|min)\s+)?(vor|nach)\s+(dem\s+)?(schlafen(gehen)?|zubettgehen|insbettgehen|ins bett gehen|aufstehen|aufwachen)\b/gi;

/**
 * "eine Stunde vor dem Schlafengehen", "30 Minuten nach dem Aufstehen",
 * "vor dem Schlafen". Ohne Dauer zählt der Zeitpunkt selbst: "vor dem
 * Schlafen" heisst dann zur Schlafenszeit, nicht eine geratene halbe Stunde.
 */
function relativAus(text: string): { bezug: "schlafen" | "aufstehen"; versatz: number } | null {
  const m = /\b(?:((?:eine halbe)|eine?r?|zwei|drei|\d{1,3})\s+(stunden?|std|minuten|min)\s+)?(vor|nach)\s+(?:dem\s+)?(schlafen(?:gehen)?|zubettgehen|insbettgehen|ins bett gehen|aufstehen|aufwachen)\b/.exec(text);
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
