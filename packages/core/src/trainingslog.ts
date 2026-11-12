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
  /** Ob sich etwas geändert hat. Vorher bleibt der Plan, wie er ist. */
  faellig: boolean;
  plan: Uebungsplan;
  getauscht: Tausch[];
  /** Geprüfte Übungen mit Zuwachs, die bleiben, mit Prozent. */
  behalten: Array<{ id: string; name: string; prozent: number }>;
  /** Fällige Übungen ohne genug Daten. Sie bleiben, weil die App nichts über sie weiss. */
  ohneDaten: string[];
  text: string;
}

/** So lange muss eine Übung an ihrem Platz stehen, bevor sie wegen Stillstand geht. */
export const STILLSTAND_WOCHEN = PLAN_WOCHEN;

function tagMinus(iso: string, tage: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) - tage * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Prüft jeden Platz des Plans für sich: steht eine Übung seit acht Wochen
 * dort und ist in diesen acht Wochen kaum stärker geworden, wird sie gegen
 * eine andere Übung derselben Bewegung getauscht. Sätze, Wiederholungen und
 * Pause bleiben, die Rolle im Plan ist dieselbe.
 *
 * Laufend und nicht einmal nach acht Wochen Planalter. Vorher wurde nur am
 * Stichtag geprüft, und eine Übung, die in Woche 9 festfuhr, blieb bis zum
 * Ende des Plans. Jeder Platz trägt dafür `seit`: eine getauschte Übung
 * bekommt ihre eigenen acht Wochen, bevor sie wieder geprüft wird.
 *
 * Gemessen wird über die letzten acht Wochen, nicht seit Beginn des Plans:
 * wer im ersten Monat 15 Prozent zulegt und danach zwei Monate steht, steht.
 * Ausnahmen, und jede hat einen Grund. Wer einmal die Woche trainiert, behält
 * seine Übungen: bei acht Einheiten in acht Wochen ist jeder Wechsel ein
 * Neuanfang, und der einfache Plan lebt davon, an denselben Grundübungen
 * stärker zu werden. Eine Übung ohne genug Einträge bleibt ebenfalls, denn
 * ohne Zahlen wäre ein Tausch geraten.
 */
export function planAktualisieren(
  plan: Uebungsplan & { aktualisiertAm?: string; gespeichertAm?: string; beginn?: string },
  log: LogEintrag[],
  uebungen: PlanUebung[],
  heute: string,
): PlanPruefung {
  const planSeit = (plan.beginn ?? plan.gespeichertAm ?? heute).slice(0, 10);
  const leer: PlanPruefung = { faellig: false, plan, getauscht: [], behalten: [], ohneDaten: [], text: "" };
  if (plan.wunsch.tage === 1) return leer;
  const ab = tagMinus(heute, STILLSTAND_WOCHEN * 7);

  const getauscht: Tausch[] = [];
  const behalten: PlanPruefung["behalten"] = [];
  const ohneDaten: string[] = [];
  const raus = new Set<string>();
  let arbeit: Uebungsplan = plan;

  plan.einheiten.forEach((einheit, ei) => {
    einheit.positionen.forEach((p, pi) => {
      // Die spätere von beidem: ein älterer Plan kennt `seit` nicht, und ein
      // neuer Plan prüft auch eine alte Übung erst nach acht Wochen.
      const seit = [p.seit, plan.aktualisiertAm, planSeit].filter(Boolean).map((x) => String(x).slice(0, 10)).sort().pop()!;
      if (tageZwischen(seit, heute) < STILLSTAND_WOCHEN * 7) return;
      const f = fortschritt(log, p.id, ab);
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
          ...e, positionen: e.positionen.map((q, j) => (j === pi ? { ...q, id: kandidat.id, name: kandidat.name, seit: heute } : q)),
        }),
      };
    });
  });

  if (!getauscht.length) return { ...leer, behalten, ohneDaten };
  const fertig = { ...planNachrechnen(arbeit, uebungen), aktualisiertAm: heute };
  const zahl = (x: number) => String(x).replace(".", ",");
  const zeilen: string[] = [];
  zeilen.push(getauscht.length === 1
    ? "Eine Übung kam in den letzten acht Wochen kaum voran. daevo hat sie gegen eine für dieselbe Bewegung getauscht, Sätze und Pausen bleiben:"
    : `${getauscht.length} Übungen kamen in den letzten acht Wochen kaum voran. daevo hat sie gegen andere für dieselbe Bewegung getauscht, Sätze und Pausen bleiben:`);
  for (const t of getauscht) zeilen.push(`${t.alt.name} (${t.prozent > 0 ? "+" : ""}${zahl(t.prozent)} %) wird ${t.neu.name}, ${t.einheit}`);
  const stark = [...behalten].sort((a, b) => b.prozent - a.prozent).slice(0, 3);
  if (stark.length) zeilen.push(`Bleiben, weil du dort zugelegt hast: ${stark.map((b) => `${b.name} +${zahl(b.prozent)} %`).join(", ")}.`);
  return { faellig: true, plan: fertig, getauscht, behalten, ohneDaten, text: zeilen.join("\n") };
}

/* ---------- Fortschritt einer Übung ---------- */

export interface UebungsPunkt {
  datum: string;
  /** Schwerstes Gewicht der Einheit, 0 ohne Zusatzgewicht. */
  kg: number;
  /** Wiederholungen beim schwersten Gewicht, der beste Satz davon. */
  wdh: number;
  /** Geschätzte Maximalkraft des besten Satzes, siehe `satzWert`. */
  wert: number;
}

/** Je Einheit ein Punkt, älteste zuerst. */
export function uebungsPunkte(log: LogEintrag[], uebung: string): UebungsPunkt[] {
  return verlaufFuer(log, uebung).map((e) => {
    const g = e.saetze.filter(gueltig);
    const kg = Math.max(...g.map((s) => s.kg));
    const wdh = Math.max(...g.filter((s) => s.kg === kg).map((s) => s.wdh));
    return { datum: e.datum, kg, wdh, wert: Math.round(einheitWert(e) * 10) / 10 };
  });
}

export type TrendArt = "steigt" | "haelt" | "faellt" | "offen";

export interface UebungsTrend {
  art: TrendArt;
  /** Zuwachs der geschätzten Kraft über die letzten acht Wochen, null bei zu wenig Daten. */
  prozent: number | null;
  einheiten: number;
  /** Seit wann gemessen wird, die erste Einheit im Fenster. */
  seit: string | null;
  /** Ob die Übung acht Wochen ohne Zuwachs steht und damit getauscht würde. */
  stillstand: boolean;
  text: string;
}

/**
 * Wie sich eine Übung entwickelt, über die letzten acht Wochen und mit
 * derselben Rechnung wie der Tausch: geschätzte Maximalkraft, Schnitt der
 * ersten und letzten zwei Einheiten, 2,5 Prozent als Grenze. Unter minus 2,5
 * heisst schwächer. Das Gewicht allein sagt das nicht: 80 kg mal 10 sind
 * mehr als 82,5 kg mal 5, und genau so sieht eine gute Steigerung aus.
 */
export function uebungsTrend(log: LogEintrag[], uebung: string, heute: string): UebungsTrend {
  const ab = tagMinus(heute, STILLSTAND_WOCHEN * 7);
  const fenster = verlaufFuer(log, uebung, ab);
  const f = fortschritt(log, uebung, ab);
  const seit = fenster[0]?.datum ?? null;
  if (f.prozent === null) {
    const fehlen = EINHEITEN_MIN - f.einheiten;
    return { art: "offen", prozent: null, einheiten: f.einheiten, seit, stillstand: false,
      text: f.einheiten === 0 ? "In den letzten acht Wochen noch nicht gemacht." : `Noch ${fehlen} ${fehlen === 1 ? "Einheit" : "Einheiten"}, dann sagt daevo, wohin es geht.` };
  }
  const p = f.prozent;
  const art: TrendArt = p >= FORTSCHRITT_MIN ? "steigt" : p <= -FORTSCHRITT_MIN ? "faellt" : "haelt";
  // Stillstand erst, wenn die Messung fast die ganzen acht Wochen trägt.
  const stillstand = art !== "steigt" && seit !== null && tageZwischen(seit, heute) >= (STILLSTAND_WOCHEN - 1) * 7;
  const zahl = `${p > 0 ? "+" : ""}${String(p).replace(".", ",")} %`;
  const text = art === "steigt" ? `${zahl} geschätzte Kraft in ${f.einheiten} Einheiten. Du wirst stärker.`
    : art === "faellt" ? `${zahl} geschätzte Kraft in ${f.einheiten} Einheiten. Schlaf, Essen und Pausen prüfen, bevor du mehr Gewicht nimmst.`
    : `${zahl} geschätzte Kraft in ${f.einheiten} Einheiten. Das ist Stillstand.`;
  return { art, prozent: p, einheiten: f.einheiten, seit, stillstand,
    text: stillstand ? `${text} Acht Wochen ohne Zuwachs: im Plan tauscht daevo sie gegen eine Übung für dieselbe Bewegung.` : text };
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
