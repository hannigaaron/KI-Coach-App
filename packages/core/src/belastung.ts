/**
 * Der Belastungsverlauf.
 *
 * Die Trainingslücke in `trainingsluecke.ts` beantwortet eine einzige Frage:
 * steht da seit vier Tagen nichts. Das ist die grobe Stufe. Was sie nicht
 * sieht, ist der umgekehrte Fall: jemand trainiert jeden Tag, seit zehn Tagen,
 * und legt dabei gegen seinen eigenen Schnitt siebzig Prozent drauf.
 *
 * Gerechnet wird die akute Last der letzten 7 Tage gegen die chronische der
 * letzten 28, beide in Minuten und beide auf dieselbe Fensterlänge gebracht.
 * Das Verfahren stammt aus dem Leistungssport und heisst dort acute chronic
 * workload ratio.
 *
 * Zur Einordnung gehört eine Warnung, und sie steht auch in der Ausgabe: die
 * Schwellen 0,8 und 1,5 stammen aus Gabbett, British Journal of Sports
 * Medicine 2016, und genau diese Arbeit ist seit 2020 stark kritisiert worden,
 * unter anderem von Impellizzeri und anderen, wegen der Art, wie die Quotienten
 * gebildet wurden. Der Quotient beschreibt zuverlässig, wie deine Woche zu
 * deinem Schnitt steht. Dass ein hoher Wert zu Verletzungen führt, ist
 * umstritten, und die App behauptet es deshalb nicht.
 *
 * Gemessen wird in Minuten, nicht in Punkten. Eine Gewichtung je Trainingsart
 * wäre die naheliegende Verbesserung, und sie wäre erfunden: welche Zahl ein
 * Volleyballabend gegen eine Krafteinheit trägt, müsste jemand festlegen. Die
 * MET Werte aus dem Compendium of Physical Activities wären eine Quelle, aber
 * die Zuordnung der vier Arten dieser App auf MET Werte bliebe eine
 * Entscheidung. Lieber eine Zahl, die jeder nachrechnen kann.
 */

/** Das kurze Fenster. Eine Woche, weil ein Trainingsplan in Wochen denkt. */
export const AKUT_TAGE = 7;

/** Das lange Fenster. Vier Wochen, wie in der Quelle. */
export const CHRONISCH_TAGE = 28;

/**
 * Unter so vielen Einheiten im langen Fenster wird nichts behauptet.
 *
 * Der Quotient teilt durch den Schnitt. Steht im Nenner fast nichts, wird aus
 * einer einzigen Einheit ein Ausschlag von mehreren hundert Prozent, und das
 * sieht aus wie eine Aussage, ohne eine zu sein.
 */
export const MIN_EINHEITEN = 4;

export type BelastungsLageArt = "rueckgang" | "stabil" | "aufbau" | "sprung";

export interface BelastungsEingabe {
  /** Die Tage aus dem Speicher, Schlüssel JJJJ-MM-TT. */
  tage: Record<string, { trainings?: Array<{ minutes?: number; type?: string }> } | undefined>;
  /** Heute, JJJJ-MM-TT. */
  heute: string;
}

export interface Belastung {
  /** Minuten in den letzten 7 Tagen. */
  akutMinuten: number;
  /** Minuten der letzten 28 Tage, auf 7 Tage heruntergerechnet. */
  chronischMinuten: number;
  /** akutMinuten geteilt durch chronischMinuten. */
  verhaeltnis: number;
  einheitenAkut: number;
  einheitenChronisch: number;
  lage: BelastungsLageArt;
}

/**
 * Rechnet den Verlauf, oder gibt null zurück.
 *
 * Null heisst immer: zu wenig Daten. Ein Quotient auf drei Einheiten ist keine
 * schwache Aussage, sondern keine.
 */
export function belastung(eingabe: BelastungsEingabe): Belastung | null {
  const heute = tagIndex(eingabe.heute);
  const akut = fenster(eingabe.tage, heute, AKUT_TAGE);
  const chronisch = fenster(eingabe.tage, heute, CHRONISCH_TAGE);

  if (chronisch.einheiten < MIN_EINHEITEN || chronisch.minuten <= 0) return null;

  // Beide Fenster auf dieselbe Länge bringen, sonst vergleicht man vier Wochen
  // mit einer und bekommt immer einen Wert um 0,25.
  const chronischMinuten = (chronisch.minuten / CHRONISCH_TAGE) * AKUT_TAGE;
  const verhaeltnis = akut.minuten / chronischMinuten;

  return {
    akutMinuten: akut.minuten,
    chronischMinuten: Math.round(chronischMinuten),
    verhaeltnis: Math.round(verhaeltnis * 100) / 100,
    einheitenAkut: akut.einheiten,
    einheitenChronisch: chronisch.einheiten,
    lage: einordnen(verhaeltnis),
  };
}

/**
 * Die Einordnung in Worten.
 *
 * Jede Zeile nennt die Zahlen, aus denen sie kommt. Der Hinweis auf die
 * umstrittene Quelle steht nur dort, wo aus der Zahl eine Empfehlung wird,
 * also bei Sprung und Rückgang. Ihn unter jede Zeile zu setzen wäre Lärm, und
 * Lärm überliest man mitsamt dem, was darin steht.
 */
export function belastungText(b: Belastung | null): string {
  if (!b) {
    return `Für einen Belastungsverlauf brauche ich mindestens ${MIN_EINHEITEN} Einheiten in ${CHRONISCH_TAGE} Tagen. `
      + "So lange sagt der Vergleich mit deinem Schnitt nichts.";
  }

  const zahlen = `${b.akutMinuten} Minuten in ${AKUT_TAGE} Tagen, dein Schnitt liegt bei ${b.chronischMinuten}. `
    + `Das sind ${prozent(b.verhaeltnis)} deines Schnitts.`;

  if (b.lage === "sprung") {
    return `${zahlen}\nDu hast deutlich draufgelegt. Im Leistungssport gilt ein Sprung über 50 Prozent `
      + "als Grenze, ab der zurückgefahren wird. Ob das wirklich vor Verletzungen schützt, ist in der "
      + "Forschung umstritten. Was gesichert ist: du liegst weit über dem, was dein Körper aus den "
      + "letzten vier Wochen kennt.";
  }
  if (b.lage === "aufbau") {
    return `${zahlen}\nDas ist ein Aufbau, kein Sprung. Halte es eine Woche hier, bevor du weiter erhöhst.`;
  }
  if (b.lage === "rueckgang") {
    const fehlen = Math.max(0, b.chronischMinuten - b.akutMinuten);
    return `${zahlen}\nDu liegst unter deinem Schnitt. ${fehlen} Minuten fehlen auf eine normale Woche.`;
  }
  return `${zahlen}\nDas liegt in deinem gewohnten Bereich.`;
}

/**
 * Die Schwellen.
 *
 * 0,8 und 1,5 stehen so in der Quelle, 1,3 ist die Grenze, ab der die App von
 * Aufbau statt von gewohnt spricht. Alle drei sind Orientierung und keine
 * Messung.
 */
function einordnen(verhaeltnis: number): BelastungsLageArt {
  if (verhaeltnis > 1.5) return "sprung";
  if (verhaeltnis > 1.3) return "aufbau";
  if (verhaeltnis < 0.8) return "rueckgang";
  return "stabil";
}

/**
 * Summiert ein Fenster bis einschliesslich heute.
 *
 * Eine Einheit ohne Dauer zählt als Einheit, aber mit null Minuten. Sie
 * wegzulassen würde den Nenner verkleinern und den Quotienten nach oben
 * treiben, eine geratene Dauer würde ihn verfälschen. Also zählt sie mit dem,
 * was bekannt ist.
 */
function fenster(
  tage: BelastungsEingabe["tage"],
  heute: number,
  laenge: number,
): { minuten: number; einheiten: number } {
  let minuten = 0;
  let einheiten = 0;
  for (let zurueck = 0; zurueck < laenge; zurueck++) {
    const eintraege = tage[tagAus(heute - zurueck)]?.trainings;
    if (!Array.isArray(eintraege)) continue;
    for (const e of eintraege) {
      einheiten++;
      const m = Number(e?.minutes);
      if (Number.isFinite(m) && m > 0) minuten += m;
    }
  }
  return { minuten, einheiten };
}

function prozent(verhaeltnis: number): string {
  return `${Math.round(verhaeltnis * 100)} Prozent`;
}

function tagIndex(tagIso: string): number {
  const ms = Date.parse(`${tagIso}T00:00:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`Ungültiges Datum: ${tagIso}`);
  return Math.floor(ms / 86400000);
}

function tagAus(index: number): string {
  return new Date(index * 86400000).toISOString().slice(0, 10);
}
