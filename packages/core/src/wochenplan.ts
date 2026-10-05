/**
 * Die offenen Aufgaben auf die Woche verteilt.
 *
 * Der Tagesplan beantwortet "was heute". Die Woche beantwortet die Frage
 * davor: geht das, was ich mir vorgenommen habe, in diesen sieben Tagen
 * überhaupt auf? Die meisten Wochen scheitern nicht am Montag, sondern daran,
 * dass am Montag niemand nachgerechnet hat.
 *
 * Gerechnet wird mit der freien Zeit je Tag aus dem Kalender. Verteilt wird
 * in derselben Rangfolge wie beim Tagesplan, über `aufgabenRang`: was eine
 * Frist hat und wichtig ist, kommt zuerst und an den frühesten Tag, an dem es
 * Platz hat.
 *
 * Eine Aufgabe mit Frist wird nie hinter ihre Frist gelegt. Passt sie davor
 * nirgends hinein, steht sie gesondert da. Das ist die wichtigste Aussage des
 * ganzen Plans, und sie gehört nicht in einen Tag versteckt, an dem es schon
 * zu spät ist.
 */

import { ARBEITSGRENZE_MINUTEN, aufgabenRang, type Aufgabe } from "./aufgaben.js";

/**
 * Höchstens dieser Anteil der freien Zeit eines Tages wird mit Aufgaben
 * belegt.
 *
 * Als Regel gesetzt, nicht gemessen. Freie Zeit im Kalender ist nicht leer:
 * dort wird gegessen, trainiert, gefahren und geschlafen, was nicht als Termin
 * eingetragen ist. Ein Wochenplan, der jede freie Minute füllt, ist am
 * Dienstag überholt.
 */
export const PLANUNGSQUOTE = 2 / 3;

export interface WochenTagEingabe {
  /** JJJJ-MM-TT. */
  tag: string;
  /** Freie Minuten im Wachtag laut Kalender. */
  freieMinuten: number;
  /** Im Kalender belegte Minuten. Näherungswert für Arbeit. */
  belegtMinuten: number;
}

export interface WochenTag {
  tag: string;
  aufgaben: Aufgabe[];
  /** Minuten, die an diesem Tag für Aufgaben vorgesehen sind. */
  budgetMinuten: number;
  /** Davon belegt. */
  geplantMinuten: number;
}

export interface Wochenplan {
  tage: WochenTag[];
  /** Mit Frist, aber vor der Frist nirgends Platz. */
  fristGerissen: Aufgabe[];
  /** Ohne Frist und diese Woche nirgends Platz. */
  naechsteWoche: Aufgabe[];
  hinweise: string[];
}

export interface WochenplanEingabe {
  aufgaben: Aufgabe[];
  /** Die Tage der Woche in Reihenfolge, heute zuerst. */
  tage: WochenTagEingabe[];
  grenzeMinuten?: number;
}

/** Verteilt die offenen Aufgaben auf die Tage. */
export function wochenplan(e: WochenplanEingabe): Wochenplan {
  const grenze = e.grenzeMinuten ?? ARBEITSGRENZE_MINUTEN;
  const ersterTag = e.tage[0]?.tag ?? "";

  const tage: WochenTag[] = e.tage.map((t) => {
    // Dieselbe Obergrenze wie im Tagesplan: wer zehn Stunden Termine hat, hat
    // rechnerisch noch freie Zeit und trotzdem nichts mehr zu geben.
    const bisGrenze = Math.max(0, grenze - t.belegtMinuten);
    const ausKalender = Math.floor(Math.max(0, t.freieMinuten) * PLANUNGSQUOTE);
    return { tag: t.tag, aufgaben: [], budgetMinuten: Math.min(ausKalender, bisGrenze), geplantMinuten: 0 };
  });

  const offen = e.aufgaben
    .filter((a) => !a.erledigt)
    .map((a) => ({ a, rang: aufgabenRang(a, ersterTag) }))
    .sort((x, y) => y.rang - x.rang || x.a.minuten - y.a.minuten)
    .map(({ a }) => a);

  const fristGerissen: Aufgabe[] = [];
  const naechsteWoche: Aufgabe[] = [];

  for (const a of offen) {
    const kandidaten = tage.filter((t) => !a.faellig || t.tag <= a.faellig);
    const tag = kandidaten.find((t) => t.budgetMinuten - t.geplantMinuten >= a.minuten);
    if (tag) {
      tag.aufgaben.push(a);
      tag.geplantMinuten += a.minuten;
      continue;
    }
    // Eine Frist, die in diese Woche fällt oder schon vorbei ist, wird gerissen.
    // Liegt sie hinter der Woche, ist es kein Problem dieser Woche.
    const letzterTag = tage[tage.length - 1]?.tag ?? "";
    if (a.faellig && a.faellig <= letzterTag) fristGerissen.push(a);
    else naechsteWoche.push(a);
  }

  const hinweise: string[] = [];
  const budget = tage.reduce((s, t) => s + t.budgetMinuten, 0);
  const geplant = tage.reduce((s, t) => s + t.geplantMinuten, 0);
  hinweise.push(
    `Verplant sind ${stunden(geplant)} von ${stunden(budget)}, die diese Woche für Aufgaben da sind. ` +
    `Gerechnet ist mit ${Math.round(PLANUNGSQUOTE * 100)} Prozent der freien Zeit je Tag. ` +
    "Das ist eine Regel und keine Messung: der Rest ist für Essen, Training, Wege und Unvorhergesehenes.",
  );
  if (fristGerissen.length) {
    hinweise.push(
      `${fristGerissen.length} ${fristGerissen.length === 1 ? "Aufgabe passt" : "Aufgaben passen"} vor ihrer Frist nicht mehr hinein. ` +
      "Hier musst du entscheiden: Frist verschieben, Termin freiräumen oder etwas anderes streichen.",
    );
  }
  const voll = tage.filter((t) => t.budgetMinuten === 0);
  if (voll.length) {
    hinweise.push(`An ${voll.length} ${voll.length === 1 ? "Tag" : "Tagen"} ist keine Zeit für Aufgaben, der Kalender ist dort voll.`);
  }

  return { tage, fristGerissen, naechsteWoche, hinweise };
}

const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONAT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** "Mo 6. Okt". Ein Datum zum Lesen, keine Datenbankzeile. */
function tagKurz(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return `${WOCHENTAG[d.getDay()]} ${d.getDate()}. ${MONAT[d.getMonth()]}`;
}

function stunden(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

/** Der Wochenplan in Worten. Leere Tage stehen als Zahl am Ende. */
export function wochenplanText(plan: Wochenplan): string {
  const zeilen: string[] = [];

  // Die Entscheidung zuerst. Wer nur die erste Zeile liest, soll wissen, ob
  // die Woche aufgeht.
  if (plan.fristGerissen.length) {
    zeilen.push(`Passt vor der Frist nicht mehr: ${plan.fristGerissen.map((a) => `${a.text} (bis ${tagKurz(a.faellig!)})`).join(", ")}.`);
  }

  const belegt = plan.tage.filter((t) => t.aufgaben.length > 0);
  if (belegt.length === 0 && plan.fristGerissen.length === 0) {
    zeilen.push("Diese Woche steht keine offene Aufgabe an.");
  }
  for (const t of belegt) {
    zeilen.push(`${tagKurz(t.tag)}: ${t.aufgaben.map((a) => `${a.text} (${a.minuten} min${a.wichtigkeit >= 3 ? ", wichtig" : ""})`).join(", ")}. ` +
      `${stunden(t.geplantMinuten)} von ${stunden(t.budgetMinuten)}.`);
  }
  const leer = plan.tage.length - belegt.length;
  if (belegt.length && leer > 0) zeilen.push(`${leer} ${leer === 1 ? "Tag bleibt" : "Tage bleiben"} ohne Aufgaben.`);

  if (plan.naechsteWoche.length) {
    zeilen.push(`Ohne Frist, wandert in die nächste Woche: ${plan.naechsteWoche.map((a) => a.text).join(", ")}.`);
  }
  for (const h of plan.hinweise) zeilen.push(h);
  return zeilen.join("\n");
}
