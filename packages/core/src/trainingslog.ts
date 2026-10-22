/**
 * Was im Training wirklich passiert ist: Gewicht, Wiederholungen und
 * Wiederholungen in Reserve je Satz. Daraus misst die App den Fortschritt je
 * Übung und baut den Plan nach acht Wochen um.
 *
 * Gemessen wird mit einer geschätzten Maximalkraft je Satz nach Epley, kg mal
 * (1 + Wiederholungen / 30), mit den Wiederholungen in Reserve dazugezählt:
 * 80 kg für 8 Wiederholungen mit 2 in Reserve zählen wie 80 kg für 10 bis
 * zum Versagen. Quellen: Epley 1985 für die Formel, Zourdos und andere 2016
 * und Helms und andere 2016 für das Zählen der Reserve. Die Zahl ist eine
 * Schätzung und kein Test. Sie taugt zum Vergleich einer Übung mit sich
 * selbst, nicht zwischen zwei Übungen, und genau dafür wird sie benutzt.
 *
 * Bei Übungen ohne Gewicht zählt die Summe aus Wiederholungen und Reserve.
 */
import {
  SCHWER_BEUGEN, SCHWER_HEBEN, alternativen, planNachrechnen,
  type PlanUebung, type Uebungsplan,
} from "./trainingsplan.js";

export interface SatzEintrag {
  kg: number;
  wdh: number;
  /** Wiederholungen in Reserve. Null, wenn nicht angegeben. */
  rir: number | null;
}

export interface LogEintrag {
  /** Tag als JJJJ-MM-TT. */
  datum: string;
  uebung: string;
  /** Titel der Einheit, etwa "Ganzkörper A". */
  einheit?: string;
  saetze: SatzEintrag[];
}

/** Ein Plan bleibt acht Wochen, dann wird er überprüft. */
export const PLAN_WOCHEN = 8;
/**
 * Unter diesem Zuwachs über acht Wochen gilt eine Übung als festgefahren.
 * 2,5 Prozent sind bei 100 kg geschätzter Maximalkraft 2,5 kg, weniger als
 * die kleinste übliche Steigerung an der Stange. Eine Regel der App.
 */
export const FORTSCHRITT_MIN = 2.5;
/** Unter so vielen Einheiten mit einer Übung lässt sich kein Fortschritt sagen. */
export const EINHEITEN_MIN = 3;

function gueltig(s: SatzEintrag): boolean {
  return Number.isFinite(s.kg) && s.kg >= 0 && Number.isFinite(s.wdh) && s.wdh > 0;
}

/** Geschätzte Maximalkraft eines Satzes, mit Reserve. Ohne Gewicht: Wiederholungen plus Reserve. */
export function satzWert(s: SatzEintrag): number {
  if (!gueltig(s)) return 0;
  const reps = s.wdh + (s.rir !== null && s.rir !== undefined && s.rir >= 0 ? s.rir : 0);
  if (s.kg === 0) return reps;
  return s.kg * (1 + reps / 30);
}

/** Der beste Satz einer Einheit zählt. Ein Aufwärmsatz soll den Schnitt nicht drücken. */
export function einheitWert(e: LogEintrag): number {
  return Math.max(0, ...e.saetze.map(satzWert));
}

/** Die Einheiten einer Übung, nach Datum, nur mit mindestens einem gültigen Satz. */
export function verlaufFuer(log: LogEintrag[], uebung: string, ab?: string): LogEintrag[] {
  return log
    .filter((e) => e.uebung === uebung && (!ab || e.datum >= ab) && e.saetze.some(gueltig))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

/** Die letzte Einheit mit dieser Übung, für die Anzeige "letztes Mal". */
export function letzteEinheit(log: LogEintrag[], uebung: string, vor?: string): LogEintrag | null {
  const v = verlaufFuer(log, uebung).filter((e) => !vor || e.datum < vor);
  return v[v.length - 1] ?? null;
}

export interface Fortschritt {
  uebung: string;
  einheiten: number;
  /** Zuwachs in Prozent vom Anfang zum Ende, null bei zu wenig Daten. */
  prozent: number | null;
}

/**
 * Anfang und Ende sind je der Schnitt aus den ersten und den letzten zwei
 * Einheiten. Eine einzelne gute oder schlechte Einheit am Rand würde sonst
 * das ganze Urteil tragen.
 */
export function fortschritt(log: LogEintrag[], uebung: string, ab?: string): Fortschritt {
  const v = verlaufFuer(log, uebung, ab).map(einheitWert).filter((x) => x > 0);
  if (v.length < EINHEITEN_MIN) return { uebung, einheiten: v.length, prozent: null };
  const n = Math.min(2, Math.floor(v.length / 2));
  const schnitt = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const anfang = schnitt(v.slice(0, n));
  const ende = schnitt(v.slice(-n));
  return { uebung, einheiten: v.length, prozent: anfang > 0 ? Math.round(((ende - anfang) / anfang) * 1000) / 10 : null };
}

function tageZwischen(von: string, bis: string): number {
  return Math.round((Date.parse(`${bis}T00:00:00Z`) - Date.parse(`${von}T00:00:00Z`)) / 86_400_000);
}

export interface Tausch {
  einheit: string;
  alt: { id: string; name: string };
  neu: { id: string; name: string };
  prozent: number;
}

export interface PlanPruefung {
  /** Ob die acht Wochen um sind. Vorher ändert sich nichts. */
  faellig: boolean;
  plan: Uebungsplan;
  getauscht: Tausch[];
  /** Übungen mit Zuwachs, die bleiben, mit Prozent. */
  behalten: Array<{ id: string; name: string; prozent: number }>;
  /** Übungen ohne genug Daten. Sie bleiben, weil die App nichts über sie weiss. */
  ohneDaten: string[];
  text: string;
}

/**
 * Nach acht Wochen: Übungen mit Fortschritt bleiben, festgefahrene werden
 * gegen eine andere Übung derselben Bewegung getauscht. Sätze,
 * Wiederholungen und Pause bleiben, die Rolle im Plan ist dieselbe.
 *
 * Ausnahmen, und jede hat einen Grund. Wer einmal die Woche trainiert, behält
 * seine Übungen: bei acht Einheiten in acht Wochen ist jeder Wechsel ein
 * Neuanfang, und der einfache Plan lebt davon, an denselben Grundübungen
 * stärker zu werden. Eine Übung ohne genug Einträge bleibt ebenfalls, denn
 * ohne Zahlen wäre ein Tausch geraten.
 */
export function planAktualisieren(
  plan: Uebungsplan & { aktualisiertAm?: string; gespeichertAm?: string },
  log: LogEintrag[],
  uebungen: PlanUebung[],
  heute: string,
): PlanPruefung {
  const seit = (plan.aktualisiertAm ?? plan.gespeichertAm ?? heute).slice(0, 10);
  const faellig = tageZwischen(seit, heute) >= PLAN_WOCHEN * 7;
  const leer = { faellig, plan, getauscht: [], behalten: [], ohneDaten: [], text: "" };
  if (!faellig) return leer;
  const neuerStand = { ...plan, aktualisiertAm: heute };
  if (plan.wunsch.tage === 1) {
    return { ...leer, plan: neuerStand, text: "Acht Wochen sind um. Bei einem Training pro Woche bleiben die Übungen gleich, damit du an genau diesen stärker wirst." };
  }

  const getauscht: Tausch[] = [];
  const behalten: PlanPruefung["behalten"] = [];
  const ohneDaten: string[] = [];
  const raus = new Set<string>();
  let arbeit: Uebungsplan = plan;

  plan.einheiten.forEach((einheit, ei) => {
    einheit.positionen.forEach((p, pi) => {
      const f = fortschritt(log, p.id, seit);
      if (f.prozent === null) { if (!ohneDaten.includes(p.name)) ohneDaten.push(p.name); return; }
      if (f.prozent >= FORTSCHRITT_MIN) { behalten.push({ id: p.id, name: p.name, prozent: f.prozent }); return; }
      // Nicht wieder dieselbe festgefahrene Übung aus einer anderen Einheit nehmen.
      const kandidat = alternativen(arbeit, ei, p.id, uebungen).find((u) => !raus.has(u.id));
      if (!kandidat) { behalten.push({ id: p.id, name: p.name, prozent: f.prozent }); return; }
      raus.add(p.id);
      getauscht.push({ einheit: einheit.titel, alt: { id: p.id, name: p.name }, neu: { id: kandidat.id, name: kandidat.name }, prozent: f.prozent });
      arbeit = {
        ...arbeit,
        einheiten: arbeit.einheiten.map((e, i) => i !== ei ? e : {
          ...e, positionen: e.positionen.map((q, j) => (j === pi ? { ...q, id: kandidat.id, name: kandidat.name } : q)),
        }),
      };
    });
  });

  const fertig = { ...planNachrechnen(arbeit, uebungen), aktualisiertAm: heute };
  const zahl = (x: number) => String(x).replace(".", ",");
  const zeilen: string[] = [];
  if (getauscht.length) {
    zeilen.push(`Acht Wochen sind um. ${getauscht.length} ${getauscht.length === 1 ? "Übung kam" : "Übungen kamen"} kaum voran und ${getauscht.length === 1 ? "ist" : "sind"} getauscht, gegen eine für dieselbe Bewegung:`);
    for (const t of getauscht) zeilen.push(`${t.alt.name} (${zahl(t.prozent)} %) wird ${t.neu.name}, ${t.einheit}`);
  } else {
    zeilen.push("Acht Wochen sind um. Keine Übung musste getauscht werden.");
  }
  const stark = [...behalten].sort((a, b) => b.prozent - a.prozent).slice(0, 3);
  if (stark.length) zeilen.push(`Bleiben, weil du dort am meisten zugelegt hast: ${stark.map((b) => `${b.name} +${zahl(b.prozent)} %`).join(", ")}.`);
  if (ohneDaten.length) zeilen.push(`Ohne genug Einträge und deshalb unverändert: ${ohneDaten.join(", ")}.`);
  return { faellig, plan: fertig, getauscht, behalten, ohneDaten, text: zeilen.join("\n") };
}

export interface Steigerung {
  /** gewicht: mehr Kilo, wdh: mehr Wiederholungen, halten: wie letztes Mal, variante: ohne Gewicht am oberen Ende. */
  art: "gewicht" | "wdh" | "halten" | "variante";
  /** Vorschlag je Satz. Null, wo nichts zu setzen ist. */
  kg: number | null;
  wdh: number | null;
  text: string;
}

const zahlText = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");

/**
 * Was heute dran ist, aus dem letzten Mal: doppelte Progression. Erst werden
 * die Wiederholungen bis ans obere Ende des Bereichs gesteigert, dann kommt
 * Gewicht dazu, und es geht wieder unten los.
 *
 * Gestützt auf ACSM, Progression Models in Resistance Training for Healthy
 * Adults, Medicine and Science in Sports and Exercise 2009: mehr Last um 2
 * bis 10 Prozent, sobald die Wiederholungen ein bis zwei über dem Ziel
 * liegen. Die Schritte von 2,5 kg und unter 20 kg von 1 kg sind eine Regel
 * der App, die kleinsten üblichen Scheiben und Kurzhanteln.
 *
 * Gezählt werden die Sätze mit dem höchsten Gewicht, die Aufwärmsätze nicht.
 * Lag die Reserve letztes Mal mehr als eine Wiederholung unter dem Ziel, ging
 * es härter als geplant, und dann wird gehalten statt gesteigert.
 */
export function steigerung(letzt: LogEintrag | null, wdhBereich: string, reserve: number): Steigerung | null {
  if (!letzt) return null;
  const b = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/.exec(String(wdhBereich));
  if (!b) return null;
  const unten = Number(b[1]);
  const oben = Number(b[2] ?? b[1]);
  const saetze = letzt.saetze.filter(gueltig);
  if (!saetze.length) return null;
  const kg = Math.max(...saetze.map((x) => x.kg));
  const oberste = saetze.filter((x) => x.kg === kg);
  const minWdh = Math.min(...oberste.map((x) => x.wdh));
  const rirs = oberste.map((x) => x.rir).filter((x): x is number => x !== null && x !== undefined && x >= 0);
  const zuHart = rirs.length > 0 && Math.min(...rirs) < reserve - 1;
  const ohneGewicht = kg === 0;
  const last = ohneGewicht ? "" : `${zahlText(kg)}\u00a0kg und `;

  if (minWdh >= oben && !zuHart) {
    if (ohneGewicht) {
      return { art: "variante", kg: null, wdh: null, text: `Letztes Mal alle Sätze bei ${oben} Wiederholungen oder mehr. Mach es schwerer: Zusatzgewicht, langsamer ablassen oder eine schwerere Variante.` };
    }
    const neu = Math.round((kg + (kg < 20 ? 1 : 2.5)) * 10) / 10;
    return { art: "gewicht", kg: neu, wdh: unten, text: `Letztes Mal alle Sätze bei ${oben} Wiederholungen oder mehr. Heute ${zahlText(neu)}\u00a0kg, wieder ab ${unten} Wiederholungen.` };
  }
  if (zuHart) {
    return { art: "halten", kg: ohneGewicht ? null : kg, wdh: minWdh, text: `Letztes Mal knapp am Limit. Heute ${last}${minWdh} Wiederholungen, mit ${reserve} in Reserve.` };
  }
  const wdh = Math.min(oben, minWdh + 1);
  return {
    art: "wdh", kg: ohneGewicht ? null : kg, wdh,
    text: `Heute ${last}${wdh} Wiederholungen je Satz, eine mehr als im schwächsten Satz letztes Mal. Bei ${oben} kommt mehr Gewicht.`,
  };
}

/** Für Tests und Prüfungen: ob eine Einheit die Regel gegen schweres Heben und Beugen am selben Tag hält. */
export function einheitHaeltZns(ids: string[]): boolean {
  return !(ids.some((x) => SCHWER_HEBEN.has(x)) && ids.some((x) => SCHWER_BEUGEN.has(x)));
}
