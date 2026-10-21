/**
 * Die festen Trainingstage im Profil ändern, per Satz.
 *
 * Wer seinen Arbeitsplan wechselt, trainiert an anderen Tagen. Bisher konnte
 * der Coach das nur hören und nicht speichern: `profile.sessions` liess sich
 * nur im Profil von Hand ändern. Dann rechnet die App weiter mit den alten
 * Tagen, beim Kalorienbedarf, beim Wasser, bei der Trainingslücke und bei der
 * Erinnerung vor dem Training.
 *
 * Wochentage zählen hier von 1 Montag bis 7 Sonntag, wie in `erinnerung.ts`.
 * Gespeichert wird wie bisher mit 0 Sonntag bis 6 Samstag, `Date.getDay()`.
 */
import { foldUmlauts } from "./memory.js";
import type { TrainingSession, TrainingType } from "./types.js";

export interface EinheitEingabe {
  /** 1 Montag bis 7 Sonntag. */
  wochentag: number;
  /** HH:MM. Fehlt sie, gilt die Zeit einer bisherigen Einheit derselben Art. */
  uhrzeit?: string;
  minuten?: number;
  art?: TrainingType;
}

export interface PlanAenderung {
  /**
   * ersetzen: die Einheiten ersetzen den Plan, mit `nurArt` nur die dieser Art.
   * hinzufuegen: kommen dazu. entfernen: fallen an diesen Tagen weg.
   */
  modus: "ersetzen" | "hinzufuegen" | "entfernen";
  einheiten: EinheitEingabe[];
  nurArt?: TrainingType;
}

export interface PlanErgebnis {
  sessions: TrainingSession[];
  /** Was ergänzt wurde, weil es fehlte. Steht in der Antwort, damit nichts still geraten ist. */
  angenommen: string[];
  /** Warum nichts geändert wurde. Leer, wenn es geklappt hat. */
  fehler: string;
}

export const ARTEN: TrainingType[] = ["strength", "team_sport", "cardio", "mobility"];
const TAG_NAME = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const ART_NAME: Record<TrainingType, string> = {
  strength: "Kraft", team_sport: "Mannschaftssport", cardio: "Ausdauer", mobility: "Mobility",
};

/** 1 Montag bis 7 Sonntag auf 0 Sonntag bis 6 Samstag. */
export function isoZuGetDay(tag: number): number {
  return tag % 7;
}

function gueltigeZeit(z: unknown): z is string {
  return typeof z === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(z);
}

function median(werte: number[]): number | null {
  if (!werte.length) return null;
  const s = [...werte].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? null;
}

/**
 * Wendet eine Änderung auf den Plan an.
 *
 * Fehlende Angaben werden aus dem bisherigen Plan genommen und nicht
 * erfunden: die Uhrzeit und Dauer einer Einheit derselben Art, sonst der
 * Median des Plans. Ist auch dort nichts, wird nicht gespeichert und nach der
 * Angabe gefragt. Eine geratene Dauer geht in Kalorienbedarf und Wasser.
 */
export function planAendern(bestehend: TrainingSession[], a: PlanAenderung): PlanErgebnis {
  const alt = [...(bestehend ?? [])];
  const angenommen: string[] = [];
  const einheiten = (a.einheiten ?? []).filter((e) => Number.isInteger(e.wochentag) && e.wochentag >= 1 && e.wochentag <= 7);
  if (!einheiten.length) return { sessions: alt, angenommen, fehler: "An welchen Tagen?" };

  if (a.modus === "entfernen") {
    const tage = new Set(einheiten.map((e) => isoZuGetDay(e.wochentag)));
    const rest = alt.filter((s) => !(tage.has(s.weekday) && (!a.nurArt || s.type === a.nurArt)));
    if (rest.length === alt.length) return { sessions: alt, angenommen, fehler: "An diesen Tagen steht kein Training im Plan." };
    return { sessions: rest, angenommen, fehler: "" };
  }

  const neue: TrainingSession[] = [];
  for (const e of einheiten) {
    const art: TrainingType = e.art && ARTEN.includes(e.art) ? e.art : (a.nurArt ?? haeufigsteArt(alt) ?? "strength");
    if (!e.art && !a.nurArt) angenommen.push(`${TAG_NAME[isoZuGetDay(e.wochentag)]} als ${ART_NAME[art]}`);
    const vorbild = alt.find((s) => s.type === art && s.weekday === isoZuGetDay(e.wochentag))
      ?? alt.find((s) => s.type === art);

    let uhrzeit = gueltigeZeit(e.uhrzeit) ? e.uhrzeit : vorbild?.startsAt;
    if (!uhrzeit) return { sessions: alt, angenommen, fehler: `Um wie viel Uhr trainierst du ${TAG_NAME[isoZuGetDay(e.wochentag)]!.toLowerCase()}s?` };
    if (!gueltigeZeit(e.uhrzeit)) angenommen.push(`${TAG_NAME[isoZuGetDay(e.wochentag)]} um ${uhrzeit} wie bisher`);

    let minuten = Number.isFinite(e.minuten) && (e.minuten as number) >= 5 ? Math.min(480, Math.round(e.minuten as number)) : null;
    if (minuten === null) {
      minuten = vorbild?.minutes ?? median(alt.map((s) => s.minutes));
      if (minuten === null) return { sessions: alt, angenommen, fehler: "Wie lange dauert eine Einheit?" };
      angenommen.push(`${minuten} Minuten wie bisher`);
    }
    neue.push({ type: art, minutes: minuten, weekday: isoZuGetDay(e.wochentag), startsAt: uhrzeit });
  }

  let basis: TrainingSession[];
  if (a.modus === "hinzufuegen") basis = alt;
  else if (a.nurArt) basis = alt.filter((s) => s.type !== a.nurArt);
  else basis = [];
  // Derselbe Tag mit derselben Art zweimal ist fast immer dieselbe Einheit.
  const schluessel = (s: TrainingSession) => `${s.weekday}|${s.type}`;
  const ersetzt = new Set(neue.map(schluessel));
  const sessions = [...basis.filter((s) => !ersetzt.has(schluessel(s))), ...neue]
    .sort((x, y) => ((x.weekday + 6) % 7) - ((y.weekday + 6) % 7) || x.startsAt.localeCompare(y.startsAt))
    .slice(0, 21);
  return { sessions, angenommen: [...new Set(angenommen)], fehler: "" };
}

function haeufigsteArt(plan: TrainingSession[]): TrainingType | null {
  const zaehler = new Map<TrainingType, number>();
  for (const s of plan) zaehler.set(s.type, (zaehler.get(s.type) ?? 0) + 1);
  let beste: TrainingType | null = null;
  let n = 0;
  for (const [art, z] of zaehler) if (z > n) { beste = art; n = z; }
  return beste;
}

/** "Mo 18:00 Kraft 60 Min, Do 19:00 Mannschaftssport 120 Min". */
export function trainingsplanText(sessions: TrainingSession[]): string {
  if (!sessions.length) return "Im Plan steht jetzt kein festes Training.";
  return sessions
    .map((s) => `${TAG_NAME[s.weekday]} ${s.startsAt} ${ART_NAME[s.type]} ${s.minutes} Minuten`)
    .join(", ");
}

const TAGE: [RegExp, number][] = [
  [/\bmontags?\b/, 1], [/\bdienstags?\b/, 2], [/\bmittwochs?\b/, 3], [/\bdonnerstags?\b/, 4],
  [/\bfreitags?\b/, 5], [/\bsamstags?\b/, 6], [/\bsonntags?\b/, 7],
];

const ART_WORTE: [RegExp, TrainingType][] = [
  [/\b(krafttraining|kraft|gym|fitnessstudio|studio|pumpen)\b/, "strength"],
  [/\b(volleyball|fussball|basketball|handball|tennis|mannschaft\w*)\b/, "team_sport"],
  [/\b(laufen|joggen|lauf|rad|radfahren|cardio|ausdauer|schwimmen)\b/, "cardio"],
  [/\b(yoga|mobility|mobilitaet|dehnen|pilates)\b/, "mobility"],
];

/**
 * Liest eine Planänderung aus einem Satz, ohne Modell.
 *
 * Erkannt wird nur, was eindeutig ist: ein Wort für Training, ein Wort für
 * eine dauerhafte Änderung und mindestens ein Wochentag. "Ich trainiere heute
 * später" ist keine Planänderung, und "Volleyball am Donnerstag war super"
 * auch nicht. Ohne "jetzt", "ab sofort", "verschoben" und ähnliches greift
 * der Zweig nicht.
 */
export function planAenderungAus(satz: string): PlanAenderung | null {
  const text = foldUmlauts(String(satz ?? "").toLowerCase());
  if (!/\b(training\w*|trainiere\w*|krafttraining|volleyball|fussball|gym|laufen|joggen|yoga)\b/.test(text)) return null;
  if (!/\b(ab jetzt|ab sofort|jetzt|ab naechster woche|verschoben|verlegt|geaendert|aendert|umgestellt|neu|neuer|neue|statt|stattdessen|nicht mehr|faellt|fallen|streich\w*)\b/.test(text)) return null;
  // Eine Frage nach Anpassung für heute ist kein neuer Plan.
  if (/\b(heute|morgen)\b/.test(text) && !/\b(ab|jetzt immer|immer)\b/.test(text)) return null;

  const arten = ART_WORTE.filter(([m]) => m.test(text)).map(([, a]) => a);
  const nurArt = arten.length === 1 ? arten[0] : undefined;

  // "Donnerstags statt dienstags": der Tag nach "statt" ist der alte und
  // fällt weg, er gehört nicht in den neuen Plan.
  const alteTage = new Set<number>();
  for (const [m, t] of TAGE) {
    const r = new RegExp(`\\b(statt|anstatt|anstelle von|nicht mehr)\\s+(am\\s+)?${m.source.replace(/\\b/g, "")}`);
    if (r.test(text)) alteTage.add(t);
  }

  // "Ich spiele dienstags um 19 Uhr, das ist ab jetzt donnerstags": was vor
  // "ab jetzt" steht, ist der alte Plan. Im Live-Test blieb der Dienstag
  // stehen, und es gab danach zweimal Volleyball in der Woche.
  const wende = /\b(ab jetzt|ab sofort|jetzt immer|ab naechster woche|ist jetzt|sind jetzt)\b/.exec(text);
  if (wende) {
    const danach = TAGE.some(([m]) => new RegExp(m.source).test(text.slice(wende.index)));
    if (danach) {
      for (const [m, t] of TAGE) {
        if (new RegExp(m.source).test(text.slice(0, wende.index))) alteTage.add(t);
      }
    }
  }

  const entfernen = /\b(nicht mehr|streich\w*)\b|\b(faellt|fallen)\b.*\bweg\b/.test(text) && !/\bstatt\b/.test(text);

  // Tage und Uhrzeiten in der Reihenfolge des Satzes. Eine Uhrzeit gilt für
  // alle Tage davor, die noch keine haben, und Tage nach der letzten Uhrzeit
  // bekommen die letzte. "Montags, mittwochs und freitags um 18 Uhr".
  const treffer: { pos: number; tag?: number; zeit?: string }[] = [];
  for (const [m, t] of TAGE) {
    const g = new RegExp(m.source, "g");
    let x: RegExpExecArray | null;
    while ((x = g.exec(text))) treffer.push({ pos: x.index, tag: t });
  }
  const zeitMuster = /\b(?:um\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*uhr\b|\bum\s+(\d{1,2})(?:[:.](\d{2}))?\b/g;
  let z: RegExpExecArray | null;
  while ((z = zeitMuster.exec(text))) {
    const h = Number(z[1] ?? z[3]);
    const min = Number(z[2] ?? z[4] ?? 0);
    if (h <= 23 && min <= 59) treffer.push({ pos: z.index, zeit: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}` });
  }
  treffer.sort((p, q) => p.pos - q.pos);

  const einheiten: EinheitEingabe[] = [];
  let offen: EinheitEingabe[] = [];
  let letzte: string | undefined;
  for (const t of treffer) {
    if (t.tag !== undefined) {
      if (alteTage.has(t.tag) && !entfernen) continue;
      const e: EinheitEingabe = { wochentag: t.tag };
      einheiten.push(e);
      offen.push(e);
    } else if (t.zeit) {
      for (const e of offen) e.uhrzeit = t.zeit;
      offen = [];
      letzte = t.zeit;
    }
  }
  if (letzte) for (const e of offen) e.uhrzeit = letzte;
  if (!einheiten.length) return null;

  const minuten = minutenAus(text);
  for (const e of einheiten) {
    if (minuten) e.minuten = minuten;
    if (nurArt) e.art = nurArt;
  }

  if (entfernen) return { modus: "entfernen", einheiten, ...(nurArt ? { nurArt } : {}) };
  const dazu = /\b(zusaetzlich|dazu|ausserdem noch|noch einmal mehr)\b/.test(text);
  return { modus: dazu ? "hinzufuegen" : "ersetzen", einheiten, ...(nurArt ? { nurArt } : {}) };
}

function minutenAus(text: string): number | undefined {
  const m = /\b(\d{1,3})\s*(minuten|min)\b/.exec(text);
  if (m) return Number(m[1]);
  const s = /\b(\d(?:[.,]\d)?|eine|einer|anderthalb|eineinhalb|zwei|drei)\s*(stunden?|std)\b/.exec(text);
  if (!s) return undefined;
  const wert = { eine: 1, einer: 1, anderthalb: 1.5, eineinhalb: 1.5, zwei: 2, drei: 3 }[s[1] as string]
    ?? Number(String(s[1]).replace(",", "."));
  return Number.isFinite(wert) ? Math.round(wert * 60) : undefined;
}
