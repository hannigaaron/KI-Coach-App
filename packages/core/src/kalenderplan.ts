import type { Termin } from "./ical.js";
import type { UserProfile } from "./types.js";
import { tagesrandFuer } from "./tagesrand.js";
import { foldUmlauts } from "./memory.js";

/**
 * Einen freien Platz im echten Kalender finden.
 *
 * Grundlage für "ich schaff's morgen nicht, plan um": die App sucht den
 * Platz, das Sprachmodell nennt ihn nur. Ein Modell, das eine Uhrzeit
 * vorschlägt, kennt den Kalender nicht genau genug und legt das Training
 * auf einen Kundentermin.
 *
 * Gesucht wird in der Wachzeit des jeweiligen Tages, über `tagesrandFuer`,
 * also mit Wochentag und Ausnahmen. Um jeden Termin liegt Luft für Weg und
 * Umziehen, und eine Einheit endet spätestens eine Stunde vor dem
 * Schlafengehen: intensive Belastung in der letzten Stunde vor dem Schlaf
 * verschlechtert ihn, früher am Abend nicht (Stutz, Eiholzer und Spengler,
 * Sports Medicine 2019, Meta-Analyse über 23 Studien).
 */

export interface PlatzWunsch {
  /** Dauer der Einheit. */
  minuten: number;
  /** Frühester Beginn, Millisekunden. */
  ab: number;
  /** Wie viele Tage ab `ab` gesucht wird. */
  tage?: number;
  /** Lieber um diese Uhrzeit, HH:MM. Die Uhrzeit des alten Termins. */
  uhrzeit?: string;
  /** Diesen Termin nicht als belegt zählen, das ist der, der verschoben wird. */
  ohneUid?: string;
}

export interface FreierPlatz {
  tag: string;
  von: number;
  bis: number;
}

/** Luft vor und nach jedem Termin. Regel der App, keine Messung. */
export const PUFFER_MIN = 15;
/** Abstand zwischen Ende der Einheit und Schlafenszeit. */
export const ABSTAND_SCHLAF_MIN = 60;
/** Beginn auf die Viertelstunde, "16:07" trägt niemand in einen Kalender ein. */
const RASTER_MIN = 15;

function tagIso(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function zeitAmTag(tag: string, hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":");
  return new Date(`${tag}T00:00:00`).getTime() + (Number(h) * 60 + Number(m)) * 60000;
}

function aufRaster(ms: number): number {
  const schritt = RASTER_MIN * 60000;
  return Math.ceil(ms / schritt) * schritt;
}

/**
 * Sucht den passenden Platz. Am frühesten Tag, an dem einer passt, und dort
 * so nah wie möglich an der gewünschten Uhrzeit: wer sonst um 18 Uhr
 * trainiert, will das nachgeholte Training nicht um 7 Uhr früh, wenn um 18
 * Uhr auch frei ist. Ein späterer Tag zur Wunschzeit verliert gegen einen
 * früheren Tag zu anderer Zeit, denn nachholen heisst bald.
 */
export function freienPlatzFinden(params: {
  termine: Termin[];
  profile: UserProfile;
  wunsch: PlatzWunsch;
}): FreierPlatz | null {
  const { termine, profile, wunsch } = params;
  const dauer = Math.max(10, Math.round(wunsch.minuten)) * 60000;
  const puffer = PUFFER_MIN * 60000;
  const tage = Math.max(1, Math.min(14, wunsch.tage ?? 7));
  const belegt = termine
    .filter((t) => !t.ganztags && t.uid !== wunsch.ohneUid)
    .map((t) => ({ von: t.von - puffer, bis: t.bis + puffer }));

  const start = new Date(wunsch.ab);
  for (let i = 0; i < tage; i++) {
    const tag = tagIso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i).getTime());
    const rand = tagesrandFuer(profile, tag);
    const wachVon = zeitAmTag(tag, rand.wakeTime);
    let schlaf = zeitAmTag(tag, rand.sleepTime);
    if (schlaf <= wachVon) schlaf += 86400_000;
    const spaetestesEnde = schlaf - ABSTAND_SCHLAF_MIN * 60000;
    const kandidaten: number[] = [];
    for (let von = aufRaster(Math.max(wachVon, wunsch.ab)); von + dauer <= spaetestesEnde; von += RASTER_MIN * 60000) {
      const bis = von + dauer;
      if (!belegt.some((b) => b.von < bis && b.bis > von)) kandidaten.push(von);
    }
    if (!kandidaten.length) continue;
    const ziel = wunsch.uhrzeit ? zeitAmTag(tag, wunsch.uhrzeit) : null;
    const beste = ziel === null
      ? kandidaten[0]!
      : kandidaten.reduce((a, b) => (Math.abs(b - ziel) < Math.abs(a - ziel) ? b : a));
    return { tag, von: beste, bis: beste + dauer };
  }
  return null;
}

/** "Do, 30. Okt., 18:00 bis 19:00", so wie man es sagt. */
export function platzText(p: { von: number; bis: number }): string {
  const tag = new Date(p.von).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
  const uhr = (ms: number) => new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${tag}, ${uhr(p.von)} bis ${uhr(p.bis)}`;
}

/* ---------- Was der Nutzer will, ohne Modell gelesen ---------- */

export interface KalenderAuftrag {
  aktion: "eintragen" | "verschieben" | "vorschlagen" | "rueckgaengig";
  /** Woran der Termin im Kalender erkannt wird, etwa "training". */
  suche?: string;
  titel?: string;
  /** Der Tag des bestehenden Termins oder des neuen, YYYY-MM-DD. */
  tag?: string;
  /** HH:MM, nur beim Eintragen mit fester Uhrzeit. */
  uhrzeit?: string;
  minuten?: number;
}

const WOCHENTAGE = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];
const TRAININGSWORT = /\b(training\w*|trainieren|gym|studio|krafttraining|einheit|workout|volleyball|laufen|joggen)\b/;

function tagAusSatz(text: string, heute: Date): string | undefined {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const plus = (n: number) => { const d = new Date(heute); d.setDate(d.getDate() + n); return iso(d); };
  if (/\buebermorgen\b/.test(text)) return plus(2);
  if (/\bmorgen\b/.test(text)) return plus(1);
  if (/\bheute\b/.test(text)) return plus(0);
  const w = new RegExp(`\\b(${WOCHENTAGE.join("|")})s?\\b`).exec(text);
  if (w) return plus((WOCHENTAGE.indexOf(w[1]!) - heute.getDay() + 7) % 7 || 7);
  return undefined;
}

/**
 * Erkennt nur, was eindeutig ist, wie die anderen Regelpfade. Verschieben
 * braucht ein Wort für Training und eines für "klappt nicht" oder
 * "verschieb". Eintragen braucht "trag ein" und eine echte Uhrzeit, denn
 * eine geratene Uhrzeit landet in einem echten Kalender. Rückgängig
 * braucht den Kalender oder Termin im Satz, sonst nimmt "mach das
 * rückgängig" nach einer Mahlzeit einen Termin zurück.
 */
export function kalenderAuftragAus(satz: string, heute = new Date()): KalenderAuftrag | null {
  const text = foldUmlauts(String(satz ?? "").toLowerCase()).replace(/[’']/g, "");
  if (/\b(rueckgaengig|zurueck ?setzen|setz\w* .{0,30}zurueck)\b/.test(text) && /\b(kalender\w*|termin\w*|training\w*|verschieb\w*)\b/.test(text)) {
    return { aktion: "rueckgaengig" };
  }
  if (!TRAININGSWORT.test(text)) return null;
  const tag = tagAusSatz(text, heute);
  const dauer = /(\d+)\s*(min|minuten)\b/.exec(text) ?? null;
  const stunden = /(\d+(?:[.,]\d)?|eine|einer)\s*(stunden?|std)\b/.exec(text);
  const minuten = dauer ? Number(dauer[1]) : stunden ? Math.round((stunden[1]!.startsWith("ein") ? 1 : Number(stunden[1]!.replace(",", "."))) * 60) : undefined;
  if (/\b(schaff\w*|schaffs|klappt|pack\w*|kann)\b.{0,40}\bnicht\b|\bnicht\b.{0,30}\b(schaff\w*|hin)\b|\b(verschieb\w*|verleg\w*|umplan\w*|plan\w* .{0,15}um|nachhol\w*|nachzuholen)\b/.test(text)) {
    if (/\b(wann|wo)\b.{0,40}\b(nachhol\w*|nachzuholen|zeit)\b/.test(text) && !/\b(verschieb\w*|plan\w* .{0,15}um|trag)\b/.test(text)) {
      return { aktion: "vorschlagen", suche: "training", ...(tag ? { tag } : {}) };
    }
    return { aktion: "verschieben", suche: "training", ...(tag ? { tag } : {}) };
  }
  if (/\btrag\w*\b.{0,60}\bein\b|\beintragen\b|\bin (den|meinen) kalender\b/.test(text)) {
    const u = /\bum\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?/.exec(text);
    if (!u || Number(u[1]) > 23) return null;
    const uhrzeit = `${String(Number(u[1])).padStart(2, "0")}:${u[2] ?? "00"}`;
    return { aktion: "eintragen", titel: "Training", uhrzeit, ...(tag ? { tag } : {}), ...(minuten ? { minuten } : {}) };
  }
  return null;
}
