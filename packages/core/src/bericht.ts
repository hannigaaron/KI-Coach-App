/**
 * Der Wochen- und Monatsbericht.
 *
 * Die zwei Check-ins fragen ab, wie eine Woche sich angefühlt hat. Was fehlt,
 * ist der Blick auf das, was wirklich passiert ist, über mehrere Wochen und
 * auf einer Seite. Genau das ist der Punkt, an dem jemand merkt, ob sich
 * etwas bewegt.
 *
 * Zwei Regeln, und beide stehen über allem anderen. Genannt wird nur, was
 * gemessen wurde. Und zu jeder Zahl gehört, auf wie vielen Tagen sie beruht:
 * ein Kalorienschnitt aus vier von achtundzwanzig Tagen ist der Schnitt von
 * vier guten Tagen und sonst nichts.
 */

/** Ein Tag, so weit er für den Bericht zählt. Alles optional ausser dem Tag. */
export interface BerichtTag {
  /** JJJJ-MM-TT. */
  tag: string;
  kcal?: number | null;
  proteinG?: number | null;
  wasserMl?: number | null;
  gewichtKg?: number | null;
  trainingMinuten?: number | null;
  trainingEinheiten?: number | null;
  /** Energie aus einem Check-in, 1 bis 10. */
  energie?: number | null;
  /** Schlafminuten, etwa aus dem Apple Health Import. */
  schlafMinuten?: number | null;
}

export interface BerichtZiele {
  kcal: number;
  proteinG: number;
  wasserMl: number;
}

export interface BerichtEingabe {
  /** Die Tage des Zeitraums, in beliebiger Reihenfolge. */
  tage: BerichtTag[];
  /** Die Tage des gleich langen Zeitraums davor. Für den Vergleich. */
  vorher?: BerichtTag[];
  ziele: BerichtZiele;
  von: string;
  bis: string;
}

export interface BerichtWert {
  name: string;
  /** Der Wert als Text, mit Einheit. */
  wert: string;
  /** Auf wie vielen Tagen er beruht. */
  tage: number;
  /** Der Vergleich zum Zeitraum davor, oder null. */
  trend: string | null;
}

export interface Bericht {
  von: string;
  bis: string;
  /** Wie viele der Tage überhaupt einen Eintrag haben. */
  tageMitDaten: number;
  tageGesamt: number;
  werte: BerichtWert[];
  /** Ein bis drei Sätze über den Zeitraum. Nur aus den Zahlen oben. */
  fazit: string[];
}

/**
 * Unter dieser Abdeckung wird ein Schnitt nicht ausgegeben.
 *
 * Ein Drittel. Darunter beschreibt der Schnitt nicht den Zeitraum, sondern die
 * Auswahl der Tage, an denen jemand Lust hatte einzutragen, und das sind fast
 * immer die guten.
 */
export const MIN_ABDECKUNG = 1 / 3;

/**
 * Ab dieser Änderung gilt ein Trend als Trend.
 *
 * Fünf Prozent. Darunter ist es Rauschen, und ein Pfeil auf Rauschen erzeugt
 * Aktionismus. Dieselbe Überlegung wie bei `checkinVergleich`.
 */
export const TREND_SCHWELLE = 0.05;

export function bericht(e: BerichtEingabe): Bericht {
  const tage = e.tage;
  const gesamt = tage.length;
  const mitDaten = tage.filter((t) => hatDaten(t)).length;
  const werte: BerichtWert[] = [];

  const feld = (
    name: string,
    lies: (t: BerichtTag) => number | null | undefined,
    formatiere: (wert: number, n: number) => string,
    art: "schnitt" | "summe" = "schnitt",
    hochIstBesser = true,
  ) => {
    const jetzt = zahlen(tage, lies);
    if (art === "schnitt" && jetzt.length < Math.ceil(gesamt * MIN_ABDECKUNG)) return;
    if (jetzt.length === 0) return;
    const wertJetzt = art === "summe" ? summe(jetzt) : summe(jetzt) / jetzt.length;
    const vorher = e.vorher ? zahlen(e.vorher, lies) : [];
    const wertVorher = vorher.length
      ? (art === "summe" ? summe(vorher) : summe(vorher) / vorher.length)
      : null;
    werte.push({
      name,
      wert: formatiere(wertJetzt, jetzt.length),
      tage: jetzt.length,
      trend: trendText(wertJetzt, wertVorher, hochIstBesser),
    });
  };

  feld("Kalorien", (t) => t.kcal, (w) => `${Math.round(w)} kcal im Schnitt`);
  feld("Protein", (t) => t.proteinG, (w) => `${Math.round(w)} g im Schnitt`);
  feld("Wasser", (t) => t.wasserMl, (w) => `${(w / 1000).toFixed(1)} l im Schnitt`);
  feld("Training", (t) => t.trainingMinuten, (w) => `${Math.round(w)} Minuten`, "summe");
  feld("Einheiten", (t) => t.trainingEinheiten, (w) => `${Math.round(w)}`, "summe");
  feld("Schlaf", (t) => t.schlafMinuten, (w) => `${stunden(w)} im Schnitt`);
  feld("Energie", (t) => t.energie, (w) => `${w.toFixed(1)} von 10`);

  // Das Gewicht ist kein Schnitt, sondern eine Strecke. Der Durchschnitt von
  // 87 und 85 Kilo sagt über eine Abnahme nichts.
  // `Number(null)` ist 0 und damit endlich. Ohne die Prüfung auf null zählt
  // jeder Tag ohne Wiegung als Wiegung von null Kilo, und aus einer einzelnen
  // Wiegung wird eine Strecke von 87 auf 0. Derselbe Fehler steckte in
  // bereitschaft.ts, dort hat ihn erst die Ansicht gezeigt.
  const wiegungen = tage
    .filter((t) => t.gewichtKg !== null && t.gewichtKg !== undefined && Number(t.gewichtKg) > 0)
    .sort((a, b) => a.tag.localeCompare(b.tag));
  if (wiegungen.length >= 2) {
    const erste = Number(wiegungen[0]!.gewichtKg);
    const letzte = Number(wiegungen[wiegungen.length - 1]!.gewichtKg);
    const diff = letzte - erste;
    werte.push({
      name: "Gewicht",
      wert: `${letzte.toFixed(1)} kg, ${vorzeichen(diff)} kg seit ${wiegungen[0]!.tag}`,
      tage: wiegungen.length,
      trend: null,
    });
  }

  return { von: e.von, bis: e.bis, tageMitDaten: mitDaten, tageGesamt: gesamt, werte, fazit: fazit(e, werte, mitDaten, gesamt) };
}

/**
 * Der Bericht als Text.
 *
 * Bewusst ohne Auszeichnung, damit er sich in eine Nachricht kopieren lässt.
 * Ein Bericht, den man nur in der App ansehen kann, wird nicht weitergegeben.
 */
export function berichtText(b: Bericht): string {
  const zeilen = [
    `daevo Bericht, ${b.von} bis ${b.bis}`,
    `${b.tageMitDaten} von ${b.tageGesamt} Tagen mit Eintrag.`,
    "",
  ];
  for (const w of b.werte) {
    zeilen.push(`${w.name}: ${w.wert}${w.trend ? `, ${w.trend}` : ""} (${w.tage} Tage)`);
  }
  if (b.fazit.length) {
    zeilen.push("");
    zeilen.push(...b.fazit);
  }
  return zeilen.join("\n");
}

/**
 * Das Fazit.
 *
 * Höchstens drei Sätze, und jeder hängt an einer Zahl von oben. Ein Fazit, das
 * mehr sagt als die Zahlen hergeben, ist der Punkt, an dem ein Bericht anfängt
 * zu lügen.
 */
function fazit(e: BerichtEingabe, werte: BerichtWert[], mitDaten: number, gesamt: number): string[] {
  const saetze: string[] = [];
  const abdeckung = gesamt > 0 ? mitDaten / gesamt : 0;

  if (abdeckung < MIN_ABDECKUNG) {
    return [
      `Nur ${mitDaten} von ${gesamt} Tagen haben einen Eintrag. Für mehr als eine Momentaufnahme `
      + "reicht das nicht. Das ist keine Kritik, sondern der Grund, warum hier wenig steht.",
    ];
  }

  const protein = zahlen(e.tage, (t) => t.proteinG);
  if (protein.length && e.ziele.proteinG > 0) {
    const getroffen = protein.filter((w) => w >= e.ziele.proteinG * 0.9).length;
    saetze.push(`Das Proteinziel von ${e.ziele.proteinG} g hast du an ${getroffen} von ${protein.length} `
      + "erfassten Tagen erreicht.");
  }

  const kcal = zahlen(e.tage, (t) => t.kcal);
  if (kcal.length && e.ziele.kcal > 0) {
    const schnitt = summe(kcal) / kcal.length;
    const ab = Math.round(schnitt - e.ziele.kcal);
    saetze.push(Math.abs(ab) < 100
      ? `Im Schnitt lagst du ${Math.abs(ab)} kcal ${ab >= 0 ? "über" : "unter"} deinem Ziel. Das ist auf dem Ziel.`
      : `Im Schnitt lagst du ${Math.abs(ab)} kcal ${ab >= 0 ? "über" : "unter"} deinem Ziel.`);
  }

  const training = werte.find((w) => w.name === "Einheiten");
  if (training) saetze.push(`Eingetragen sind ${training.wert} Einheiten in ${gesamt} Tagen.`);

  return saetze.slice(0, 3);
}

function trendText(jetzt: number, vorher: number | null, hochIstBesser: boolean): string | null {
  if (vorher === null || vorher === 0) return null;
  const anteil = (jetzt - vorher) / Math.abs(vorher);
  if (Math.abs(anteil) < TREND_SCHWELLE) return "wie davor";
  const richtung = anteil > 0 ? "mehr" : "weniger";
  // "besser" und "schlechter" bleiben weg. Ob mehr Kalorien besser sind, hängt
  // am Ziel, und das weiss diese Funktion nicht.
  void hochIstBesser;
  return `${Math.abs(Math.round(anteil * 100))} Prozent ${richtung} als davor`;
}

function zahlen(tage: BerichtTag[], lies: (t: BerichtTag) => number | null | undefined): number[] {
  const raus: number[] = [];
  for (const t of tage) {
    const wert = lies(t);
    if (wert === null || wert === undefined) continue;
    const zahl = Number(wert);
    // Null Kalorien an einem Tag ohne Eintrag ist keine Angabe, sondern eine
    // Lücke. Sie mitzumitteln zieht jeden Schnitt nach unten.
    if (Number.isFinite(zahl) && zahl > 0) raus.push(zahl);
  }
  return raus;
}

function hatDaten(t: BerichtTag): boolean {
  return [t.kcal, t.trainingMinuten, t.gewichtKg, t.energie, t.schlafMinuten, t.wasserMl]
    .some((w) => Number.isFinite(Number(w)) && Number(w) > 0);
}

function summe(werte: number[]): number {
  return werte.reduce((s, w) => s + w, 0);
}

function stunden(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

function vorzeichen(zahl: number): string {
  return `${zahl >= 0 ? "+" : ""}${zahl.toFixed(1)}`;
}
