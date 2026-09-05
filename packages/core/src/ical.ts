/**
 * Kalender lesen.
 *
 * Beide Kalender, die dieser Nutzer hat, sprechen dasselbe Format: iCalendar
 * nach RFC 5545. Google Calendar gibt je Kalender eine geheime Adresse im
 * iCal Format aus, Apple Kalender exportiert eine .ics Datei und kann einen
 * Kalender als Feed veröffentlichen. Ein Parser deckt damit beide ab.
 *
 * Bewusst nicht implementiert: Zeitzonendefinitionen aus dem VTIMEZONE Block,
 * BYSETPOS, BYMONTHDAY in Kombination mit BYDAY, und geänderte Einzeltermine
 * einer Serie über RECURRENCE-ID. Das sind seltene Fälle, und ein halb
 * richtiger Termin ist schlimmer als ein fehlender. Was nicht gelesen werden
 * kann, wird gezählt und gemeldet, statt still zu verschwinden.
 *
 * Zeitzonen laufen über Intl. Steht in DTSTART ein TZID, wird die Wandzeit in
 * dieser Zone in einen echten Zeitpunkt umgerechnet, nicht als Ortszeit des
 * Geräts angenommen. Ohne das läge jeder Termin nach einer Reise daneben.
 */

export interface Termin {
  /** Kennung aus dem Kalender. Bei Serien je Termin um den Start ergänzt. */
  uid: string;
  titel: string;
  ort: string;
  /** Beginn in Millisekunden seit 1970. */
  von: number;
  /** Ende in Millisekunden seit 1970. */
  bis: number;
  /** Ganztägige Termine haben keine sinnvolle Uhrzeit. */
  ganztags: boolean;
  /** Name des Kalenders, aus dem der Termin stammt. */
  quelle?: string;
}

export interface IcsErgebnis {
  termine: Termin[];
  /** Name des Kalenders, falls er im Feed steht. */
  kalendername: string;
  /** Wie viele Einträge nicht gelesen werden konnten. */
  uebersprungen: number;
  hinweise: string[];
}

export interface IcsFenster {
  /** Frühester Zeitpunkt, der interessiert. */
  von: number;
  /** Spätester Zeitpunkt, der interessiert. */
  bis: number;
}

/** Mehr als das expandiert keine Serie. Schutz gegen eine kaputte Regel. */
const MAX_JE_SERIE = 400;
/** Mehr Termine als das braucht kein Tagescoaching. */
const MAX_TERMINE = 2000;

/**
 * Liest einen iCalendar Text.
 *
 * Das Fenster begrenzt, was zurückkommt. Ein Kalender aus zehn Jahren passt
 * weder in den Speicher des Browsers noch in einen Prompt, und für den
 * Tagesablauf zählen ohnehin nur die nächsten Wochen.
 */
export function termineAusIcs(text: string, fenster: IcsFenster, quelle = ""): IcsErgebnis {
  const zeilen = entfalte(text);
  const termine: Termin[] = [];
  const hinweise: string[] = [];
  let kalendername = "";
  let uebersprungen = 0;

  let aktuell: Record<string, Feld> | null = null;
  for (const zeile of zeilen) {
    const feld = feldAus(zeile);
    if (!feld) continue;
    if (feld.name === "BEGIN" && feld.wert === "VEVENT") { aktuell = {}; continue; }
    if (feld.name === "END" && feld.wert === "VEVENT") {
      if (aktuell) {
        if (!aktuell.DTSTART) uebersprungen += 1;
        for (const t of ausEvent(aktuell, fenster, quelle)) termine.push(t);
      }
      aktuell = null;
      continue;
    }
    if (aktuell) { aktuell[feld.name] = feld; continue; }
    if (feld.name === "X-WR-CALNAME") kalendername = textWert(feld.wert);
  }

  termine.sort((a, b) => a.von - b.von);
  if (termine.length > MAX_TERMINE) {
    hinweise.push(`Mehr als ${MAX_TERMINE} Termine im Zeitraum. Die späteren habe ich weggelassen.`);
    termine.length = MAX_TERMINE;
  }
  if (uebersprungen > 0) {
    hinweise.push(`${uebersprungen} Einträge ohne lesbaren Beginn übersprungen.`);
  }
  return { termine, kalendername, uebersprungen, hinweise };
}

interface Feld {
  name: string;
  params: Record<string, string>;
  wert: string;
}

/**
 * Faltet die Zeilen wieder auf.
 *
 * RFC 5545 bricht lange Zeilen um und beginnt die Fortsetzung mit einem
 * Leerzeichen oder Tabulator. Wer das ignoriert, verliert jeden Termin mit
 * einem langen Titel.
 */
function entfalte(text: string): string[] {
  const roh = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const zeile of roh) {
    if ((zeile.startsWith(" ") || zeile.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += zeile.slice(1);
    } else {
      out.push(zeile);
    }
  }
  return out;
}

function feldAus(zeile: string): Feld | null {
  const doppelpunkt = zeile.indexOf(":");
  if (doppelpunkt === -1) return null;
  const kopf = zeile.slice(0, doppelpunkt);
  const wert = zeile.slice(doppelpunkt + 1);
  const teile = kopf.split(";");
  const name = (teile[0] ?? "").toUpperCase().trim();
  if (!name) return null;
  const params: Record<string, string> = {};
  for (const teil of teile.slice(1)) {
    const gleich = teil.indexOf("=");
    if (gleich === -1) continue;
    params[teil.slice(0, gleich).toUpperCase().trim()] = teil.slice(gleich + 1).replace(/^"|"$/g, "");
  }
  return { name, params, wert };
}

/** Text nach RFC 5545 entschärfen. Reihenfolge zählt, der Backslash zuletzt. */
function textWert(wert: string): string {
  return wert
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function ausEvent(felder: Record<string, Feld>, fenster: IcsFenster, quelle: string): Termin[] {
  const start = felder.DTSTART;
  if (!start) return [];
  const beginn = zeitpunkt(start);
  if (beginn === null) return [];

  const ganztags = start.params.VALUE === "DATE" || /^\d{8}$/.test(start.wert.trim());
  const ende = felder.DTEND ? zeitpunkt(felder.DTEND) : null;
  const dauer = ende !== null && ende > beginn
    ? ende - beginn
    : ganztags ? 24 * 3600_000 : dauerAus(felder.DURATION?.wert) ?? 60 * 60_000;

  const titel = textWert(felder.SUMMARY?.wert ?? "") || "Ohne Titel";
  const ort = textWert(felder.LOCATION?.wert ?? "");
  const uid = felder.UID?.wert?.trim() || `${titel}-${beginn}`;

  const ausnahmen = new Set<number>();
  for (const feld of [felder.EXDATE].filter(Boolean) as Feld[]) {
    for (const stueck of feld.wert.split(",")) {
      const p = zeitpunkt({ ...feld, wert: stueck });
      if (p !== null) ausnahmen.add(p);
    }
  }

  const starts = felder.RRULE
    ? serie(beginn, felder.RRULE.wert, fenster)
    : [beginn];

  const out: Termin[] = [];
  for (const s of starts) {
    if (ausnahmen.has(s)) continue;
    const b = s + dauer;
    // Ein Termin zählt, sobald er das Fenster berührt. Wer nur den Beginn
    // prüft, verliert den Termin, der über Mitternacht in den Tag läuft.
    if (b <= fenster.von || s >= fenster.bis) continue;
    out.push({
      uid: starts.length > 1 ? `${uid}-${s}` : uid,
      titel,
      ort,
      von: s,
      bis: b,
      ganztags,
      ...(quelle ? { quelle } : {}),
    });
  }
  return out;
}

/** DURATION nach RFC 5545, nur die Teile, die in Kalendern wirklich vorkommen. */
function dauerAus(wert: string | undefined): number | null {
  if (!wert) return null;
  const treffer = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(wert.trim());
  if (!treffer) return null;
  const [, tage, std, min, sek] = treffer;
  const ms = (Number(tage ?? 0) * 86400 + Number(std ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(sek ?? 0)) * 1000;
  return ms > 0 ? ms : null;
}

/**
 * Einen Zeitpunkt aus einem Datumsfeld lesen.
 *
 * Drei Formen kommen vor: reines Datum, Ortszeit mit TZID, und UTC mit Z am
 * Ende. Ohne TZID und ohne Z ist es nach Norm die Zeit des Betrachters, also
 * die des Geräts.
 */
function zeitpunkt(feld: Feld): number | null {
  const wert = feld.wert.trim();
  const nurDatum = /^(\d{4})(\d{2})(\d{2})$/.exec(wert);
  if (nurDatum) {
    const [, j, m, t] = nurDatum;
    // Ganztägig heisst: der Tag, wie ihn der Nutzer sieht. Also lokale Mitternacht.
    return new Date(Number(j), Number(m) - 1, Number(t)).getTime();
  }
  const voll = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/.exec(wert);
  if (!voll) return null;
  const [, j, m, t, h, min, s, z] = voll;
  const zahlen = [Number(j), Number(m), Number(t), Number(h), Number(min), Number(s)] as const;
  if (z) return Date.UTC(zahlen[0], zahlen[1] - 1, zahlen[2], zahlen[3], zahlen[4], zahlen[5]);
  const tzid = feld.params.TZID;
  if (tzid) {
    const p = ausZone(zahlen, tzid);
    if (p !== null) return p;
  }
  return new Date(zahlen[0], zahlen[1] - 1, zahlen[2], zahlen[3], zahlen[4], zahlen[5]).getTime();
}

/**
 * Wandzeit in einer Zeitzone in einen echten Zeitpunkt umrechnen.
 *
 * Der Trick: einmal so tun, als wäre die Wandzeit UTC, dann den Versatz dieser
 * Zone zu diesem Zeitpunkt messen und abziehen. Zweimal, weil der Versatz
 * selbst vom Zeitpunkt abhängt und an den zwei Umstelltagen im Jahr springt.
 */
function ausZone(zahlen: readonly [number, number, number, number, number, number], tzid: string): number | null {
  const alsWaereUtc = Date.UTC(zahlen[0], zahlen[1] - 1, zahlen[2], zahlen[3], zahlen[4], zahlen[5]);
  try {
    let ts = alsWaereUtc;
    for (let i = 0; i < 2; i++) ts = alsWaereUtc - versatz(tzid, ts);
    return ts;
  } catch {
    // Unbekannte Zone. Lieber Ortszeit des Geräts als gar kein Termin.
    return null;
  }
}

function versatz(tzid: string, ts: number): number {
  const teile = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(ts));
  const feld = (name: string) => Number(teile.find((p) => p.type === name)?.value ?? 0);
  const stunde = feld("hour") % 24;
  const inZone = Date.UTC(feld("year"), feld("month") - 1, feld("day"), stunde, feld("minute"), feld("second"));
  return inZone - ts;
}

const WOCHENTAGE: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

/**
 * Eine Serie in einzelne Termine auflösen.
 *
 * Nur so weit, wie das Fenster reicht. Eine Regel ohne Ende läuft sonst bis
 * ans Ende der Zeit, und der Browser bleibt stehen.
 */
function serie(beginn: number, regel: string, fenster: IcsFenster): number[] {
  const teile: Record<string, string> = {};
  for (const stueck of regel.split(";")) {
    const gleich = stueck.indexOf("=");
    if (gleich > 0) teile[stueck.slice(0, gleich).toUpperCase()] = stueck.slice(gleich + 1);
  }
  const freq = (teile.FREQ ?? "").toUpperCase();
  const schritt = Math.max(1, Number(teile.INTERVAL ?? 1) || 1);
  const anzahl = Number(teile.COUNT ?? 0) || 0;
  const bisRegel = teile.UNTIL
    ? zeitpunkt({ name: "UNTIL", params: {}, wert: teile.UNTIL })
    : null;
  const grenze = Math.min(fenster.bis, bisRegel ?? fenster.bis);

  const tage = (teile.BYDAY ?? "")
    .split(",")
    .map((d) => WOCHENTAGE[d.trim().slice(-2).toUpperCase()])
    .filter((d): d is number => typeof d === "number");

  const out: number[] = [];
  const start = new Date(beginn);
  const nimm = (ts: number) => {
    if (ts > grenze) return false;
    if (ts + 86400_000 >= fenster.von) out.push(ts);
    return true;
  };

  if (freq === "DAILY") {
    for (let i = 0; i < MAX_JE_SERIE; i++) {
      const d = new Date(beginn);
      d.setDate(d.getDate() + i * schritt);
      if (!nimm(d.getTime())) break;
      if (anzahl && out.length >= anzahl) break;
    }
  } else if (freq === "WEEKLY") {
    const ziele = tage.length ? tage : [start.getDay()];
    let gezaehlt = 0;
    for (let woche = 0; woche < MAX_JE_SERIE; woche++) {
      const wochenstart = new Date(beginn);
      wochenstart.setDate(wochenstart.getDate() - wochenstart.getDay() + woche * 7 * schritt);
      let ueber = false;
      for (const tag of [...ziele].sort((a, b) => a - b)) {
        const d = new Date(wochenstart);
        d.setDate(d.getDate() + tag);
        d.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
        const ts = d.getTime();
        if (ts < beginn) continue;
        if (anzahl && gezaehlt >= anzahl) { ueber = true; break; }
        gezaehlt++;
        if (!nimm(ts)) { ueber = true; break; }
      }
      if (ueber) break;
      if (anzahl && gezaehlt >= anzahl) break;
    }
  } else if (freq === "MONTHLY" || freq === "YEARLY") {
    for (let i = 0; i < MAX_JE_SERIE; i++) {
      const d = new Date(beginn);
      if (freq === "MONTHLY") d.setMonth(d.getMonth() + i * schritt);
      else d.setFullYear(d.getFullYear() + i * schritt);
      if (!nimm(d.getTime())) break;
      if (anzahl && out.length >= anzahl) break;
    }
  } else {
    return [beginn];
  }

  return out;
}

/** Termine eines Tages, sortiert. Der Tag ist lokal gemeint, nicht in UTC. */
export function termineAmTag(termine: Termin[], tagIso: string): Termin[] {
  const von = new Date(`${tagIso}T00:00:00`).getTime();
  const bis = von + 86400_000;
  return termine
    .filter((t) => t.bis > von && t.von < bis)
    .sort((a, b) => a.von - b.von);
}

/** Uhrzeit eines Zeitpunkts als HH:MM, in der Zeit des Geräts. */
export function uhrzeit(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
