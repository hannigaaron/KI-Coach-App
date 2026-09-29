import { type Belastung } from "./belastung.js";

/**
 * Die Morgenbereitschaft.
 *
 * Oura und Whoop rechnen so etwas aus Herzfrequenzvariabilität, Temperatur und
 * Schlafphasen. daevo hat keinen Sensor. Eine Zahl, die so aussieht wie deren
 * Zahl, wäre geraten, und geratene Zahlen sind in dieser App der eine Fehler,
 * der nicht passieren darf.
 *
 * Deshalb misst diese Zahl nichts. Sie fasst zusammen, was du selbst angegeben
 * hast, plus den einen Wert, den die App wirklich rechnen kann: deine
 * Trainingslast gegen deinen eigenen Schnitt. Jeder Teil nennt seine Quelle,
 * und der Text sagt ausdrücklich, dass es keine Messung ist. Wer das
 * weglässt, verkauft eine Selbsteinschätzung als Physiologie.
 *
 * Die Gewichtung ist eine Produktentscheidung und steht deshalb sichtbar im
 * Code, genauso wie bei `tagesnutzung` in balance.ts. Ein Teil ohne Datenlage
 * wird nicht mit null bewertet, sondern fällt raus, und die übrigen Gewichte
 * werden hochgerechnet. Sonst misst die Zahl Datenlage statt Zustand.
 */

/** Ab so vielen Tagen zählt ein Wochenbogen nicht mehr für heute. */
export const STRESS_MAX_ALTER_TAGE = 7;

/** Ohne so viel Gewicht an Daten kommt gar keine Zahl. */
export const MIN_GEWICHT = 40;

export interface BereitschaftsEingabe {
  /** Schlafqualität aus dem Morgen Check-in, 1 bis 10. */
  schlafQualitaet?: number | null;
  /** Energie aus dem Morgen Check-in, 1 bis 10. */
  energie?: number | null;
  /** Der Belastungsverlauf, oder null bei zu wenig Daten. */
  belastung?: Belastung | null;
  /** Stress aus dem letzten Wochenbogen, 0 bis 100. */
  stress?: number | null;
  /** Wie viele Tage der Wochenbogen alt ist. */
  stressAlterTage?: number | null;
}

export interface BereitschaftsTeil {
  name: string;
  /** 0 bis 100. */
  wert: number;
  gewicht: number;
  /** Woher der Wert kommt. Steht mit in der Ausgabe. */
  quelle: string;
}

export type BereitschaftsUrteil = "bereit" | "solide" | "runterfahren";

export interface Bereitschaft {
  /** 0 bis 100. */
  wert: number;
  urteil: BereitschaftsUrteil;
  teile: BereitschaftsTeil[];
  /** Der schwächste Teil. Daran hängt die Empfehlung. */
  schwaechster: BereitschaftsTeil;
}

/**
 * Die Gewichte.
 *
 * Schlaf und Energie wiegen zusammen fast zwei Drittel, weil das die beiden
 * Angaben sind, die du heute Morgen wirklich gemacht hast. Die Belastung ist
 * Kontext und keine Aussage über diesen Morgen. Stress wiegt am wenigsten,
 * weil der Wert aus dem Wochenbogen kommt und bis zu sieben Tage alt sein
 * darf.
 */
const GEWICHTE = { schlaf: 35, energie: 30, belastung: 20, stress: 15 };

/**
 * Die Belastung als Zahl von 0 bis 100.
 *
 * Ein Rückgang senkt die Bereitschaft nicht, er hebt sie: wer eine ruhige
 * Woche hatte, ist ausgeruhter. Das ist eine Überlegung und keine Messung,
 * und deshalb steht sie hier und nicht in belastung.ts.
 */
const BELASTUNG_WERT = { stabil: 100, rueckgang: 90, aufbau: 70, sprung: 40 };

export function bereitschaft(e: BereitschaftsEingabe): Bereitschaft | null {
  const teile: BereitschaftsTeil[] = [];

  const schlaf = skala10(e.schlafQualitaet);
  if (schlaf !== null) {
    teile.push({ name: "Schlaf", wert: schlaf, gewicht: GEWICHTE.schlaf, quelle: "deinem Morgen Check-in" });
  }

  const energie = skala10(e.energie);
  if (energie !== null) {
    teile.push({ name: "Energie", wert: energie, gewicht: GEWICHTE.energie, quelle: "deinem Morgen Check-in" });
  }

  if (e.belastung) {
    teile.push({
      name: "Belastung",
      wert: BELASTUNG_WERT[e.belastung.lage],
      gewicht: GEWICHTE.belastung,
      quelle: `${e.belastung.akutMinuten} Minuten diese Woche gegen ${e.belastung.chronischMinuten} im Schnitt`,
    });
  }

  // `Number(null)` ist 0, und 0 ist ein gültiger Stresswert. Ohne die Prüfung
  // auf null zählt ein fehlender Wochenbogen als "gar kein Stress" und hebt
  // die Bereitschaft. Gefunden hat das die Ansicht, kein Test: in der Demo
  // stand "Stress 0 von 100", obwohl es dort keinen Bogen gibt.
  const stress = zahl(e.stress);
  const alter = zahl(e.stressAlterTage);
  if (stress !== null && stress >= 0 && stress <= 100 && alter !== null && alter >= 0 && alter <= STRESS_MAX_ALTER_TAGE) {
    // Der Teil heisst Ruhe und nicht Stress, weil sein Wert der umgekehrte
    // ist. "Stress 100 von 100" neben lauter Werten, bei denen hoch gut ist,
    // liest sich als maximaler Stress und bedeutet das Gegenteil. Der
    // gemeldete Wert steht in der Quelle, damit nichts verlorengeht.
    teile.push({
      name: "Ruhe",
      wert: 100 - stress,
      gewicht: GEWICHTE.stress,
      quelle: alter === 0
        ? `Stress ${Math.round(stress)} von 100 in deinem Check-in von heute`
        : `Stress ${Math.round(stress)} von 100 in deinem Check-in von vor ${alter} Tagen`,
    });
  }

  const gewicht = teile.reduce((summe, t) => summe + t.gewicht, 0);
  if (gewicht < MIN_GEWICHT) return null;

  const wert = Math.round(teile.reduce((summe, t) => summe + t.wert * t.gewicht, 0) / gewicht);
  const schwaechster = teile.reduce((a, b) => (b.wert < a.wert ? b : a));

  return { wert, urteil: urteilen(wert), teile, schwaechster };
}

/**
 * Die Zahl in Worten.
 *
 * Der Hinweis, dass nichts gemessen wurde, steht immer dabei und nicht nur
 * einmal beim ersten Mal. Wer die Zahl vier Wochen lang sieht, hält sie sonst
 * irgendwann für eine Messung, und genau dann fängt er an, ihr mehr zu glauben
 * als sich selbst.
 */
export function bereitschaftText(b: Bereitschaft | null): string {
  if (!b) {
    return "Für eine Bereitschaft brauche ich mindestens zwei Angaben von dir. "
      + "Mach den Morgen Check-in, dann rechne ich sie.";
  }

  const kopf = `Bereitschaft ${b.wert} von 100, ${urteilsWort(b.urteil)}.`;
  const zeilen = b.teile.map((t) => `${t.name} ${t.wert} von 100, aus ${t.quelle}.`);
  const rat = empfehlung(b);
  const grenze = "Das ist keine Messung. Es ist zusammengefasst, was du selbst angegeben hast, "
    + "plus deine eigene Trainingslast.";

  return [kopf, "", ...zeilen, "", rat, grenze].join("\n");
}

function empfehlung(b: Bereitschaft): string {
  const s = b.schwaechster;
  if (b.urteil === "bereit") return "Nimm dir heute das Schwerste vor, was ansteht.";
  if (b.urteil === "runterfahren") {
    return `Am weitesten unten liegt ${s.name}. Nimm heute Umfang raus statt Intensität: `
      + "dieselben Übungen, weniger Sätze.";
  }
  return `Das trägt einen normalen Tag. Am weitesten unten liegt ${s.name}, `
    + "dort lohnt sich heute die Aufmerksamkeit.";
}

function urteilen(wert: number): BereitschaftsUrteil {
  if (wert >= 75) return "bereit";
  if (wert >= 55) return "solide";
  return "runterfahren";
}

function urteilsWort(urteil: BereitschaftsUrteil): string {
  if (urteil === "bereit") return "du kannst Gas geben";
  if (urteil === "solide") return "das trägt";
  return "fahr heute runter";
}

/** Eine Zahl, oder null. Anders als `Number` macht das aus null keine 0. */
function zahl(wert: unknown): number | null {
  if (wert === null || wert === undefined || wert === "") return null;
  const n = Number(wert);
  return Number.isFinite(n) ? n : null;
}

/** Eine Angabe von 1 bis 10 auf 0 bis 100. Alles andere ist keine Angabe. */
function skala10(wert: unknown): number | null {
  const zahl = Number(wert);
  if (!Number.isFinite(zahl) || zahl < 1 || zahl > 10) return null;
  return Math.round(((zahl - 1) / 9) * 100);
}
