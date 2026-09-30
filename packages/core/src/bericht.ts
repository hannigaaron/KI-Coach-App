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
  /**
   * Schlafqualität aus dem Morgen Check-in, 1 bis 10.
   *
   * Getrennt von der Dauer, weil beides verschiedene Fragen beantwortet und
   * aus verschiedenen Quellen kommt. Die Dauer braucht eine Uhr, die Qualität
   * nur den Nutzer. Wer keinen Health Import gemacht hat, hat trotzdem eine
   * Aussage über seinen Schlaf.
   */
  schlafQualitaet?: number | null;
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
  /**
   * Eine feste Kennung, ASCII. Die Oberfläche wählt darüber das Zeichen.
   * Über den Namen zu gehen wäre eine Kopplung an einen Text, den irgendwann
   * jemand umformuliert, und dann fehlt das Zeichen ohne Fehlermeldung.
   */
  schluessel: BerichtSchluessel;
  /**
   * Die Zahl allein, ohne Einheit. Eine Karte, die nur einen Wert zeigt, setzt
   * Zahl, Einheit und Zusatz in drei Grössen. Aus einer fertigen Zeile wie
   * "2800 kcal im Schnitt" liesse sich das nur mit einer Regex zurückholen,
   * und eine Regex auf den eigenen Text ist eine Schnittstelle, die niemand
   * gepflegt hat.
   */
  zahl: string;
  /** Die Einheit, etwa "kcal" oder "g". Leer, wo es keine gibt. */
  einheit: string;
  /** Was die Zahl ist, etwa "im Schnitt" oder "zusammen". */
  zusatz: string;
  /** Der Wert als eine Zeile, für den Text zum Weitergeben. */
  wert: string;
  /** Auf wie vielen Tagen er beruht. */
  tage: number;
  /** Der Vergleich zum Zeitraum davor, oder null. */
  trend: string | null;
  /**
   * Der Wert je Tag über den Zeitraum, in der Reihenfolge der Tage.
   *
   * `null` steht für einen Tag ohne Angabe und wird nicht durch eine Null
   * ersetzt: eine Linie, die an jeder Lücke auf den Boden fällt, behauptet
   * einen Einbruch, den es nicht gab.
   */
  verlauf: (number | null)[];
}

export type BerichtSchluessel =
  | "kalorien" | "protein" | "wasser" | "training" | "einheiten"
  | "schlaf" | "schlafqualitaet" | "energie" | "gewicht";

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
    schluessel: BerichtSchluessel,
    name: string,
    lies: (t: BerichtTag) => number | null | undefined,
    formatiere: (wert: number) => { zahl: string; einheit: string },
    art: "schnitt" | "summe" = "schnitt",
  ) => {
    const jetzt = zahlen(tage, lies);
    if (art === "schnitt" && jetzt.length < Math.ceil(gesamt * MIN_ABDECKUNG)) return;
    if (jetzt.length === 0) return;
    const wertJetzt = art === "summe" ? summe(jetzt) : summe(jetzt) / jetzt.length;
    const vorher = e.vorher ? zahlen(e.vorher, lies) : [];
    const wertVorher = vorher.length
      ? (art === "summe" ? summe(vorher) : summe(vorher) / vorher.length)
      : null;
    const zusatz = art === "summe" ? "zusammen" : "im Schnitt";
    const { zahl, einheit } = formatiere(wertJetzt);
    // Der Verlauf behält die Lücken. Sie sind die Auskunft darüber, wie
    // vollständig der Zeitraum erfasst ist, und die gehört zu jeder Zahl.
    const verlauf = tage.map((t) => {
      const roh = lies(t);
      if (roh === null || roh === undefined) return null;
      const n = Number(roh);
      return Number.isFinite(n) && n > 0 ? n : null;
    });
    werte.push({
      verlauf,
      name,
      schluessel,
      zahl,
      einheit,
      zusatz,
      wert: [zahl, einheit, zusatz].filter(Boolean).join(" "),
      tage: jetzt.length,
      trend: trendText(wertJetzt, wertVorher),
    });
  };

  feld("kalorien", "Kalorien", (t) => t.kcal, (w) => ({ zahl: String(Math.round(w)), einheit: "kcal" }));
  feld("protein", "Protein", (t) => t.proteinG, (w) => ({ zahl: String(Math.round(w)), einheit: "g" }));
  // "Liter" ausgeschrieben. Ein kleines l neben einer grossen Zahl ist auf
  // einer Karte kaum von einem Strich zu unterscheiden.
  feld("wasser", "Wasser", (t) => t.wasserMl, (w) => ({ zahl: (w / 1000).toFixed(1), einheit: "Liter" }));
  feld("training", "Training", (t) => t.trainingMinuten, (w) => ({ zahl: String(Math.round(w)), einheit: "Minuten" }), "summe");
  feld("einheiten", "Einheiten", (t) => t.trainingEinheiten, (w) => ({ zahl: String(Math.round(w)), einheit: "" }), "summe");
  feld("schlaf", "Schlaf", (t) => t.schlafMinuten, (w) => ({ zahl: stunden(w), einheit: "" }));
  feld("schlafqualitaet", "Schlafqualität", (t) => t.schlafQualitaet, (w) => ({ zahl: w.toFixed(1), einheit: "von 10" }));
  feld("energie", "Energie", (t) => t.energie, (w) => ({ zahl: w.toFixed(1), einheit: "von 10" }));

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
      schluessel: "gewicht",
      zahl: letzte.toFixed(1),
      einheit: "kg",
      zusatz: `${vorzeichen(diff)} kg seit ${datumKurz(wiegungen[0]!.tag)}`,
      wert: `${letzte.toFixed(1)} kg, ${vorzeichen(diff)} kg seit ${datumKurz(wiegungen[0]!.tag)}`,
      tage: wiegungen.length,
      trend: null,
      verlauf: tage.map((t) => (t.gewichtKg === null || t.gewichtKg === undefined ? null : Number(t.gewichtKg) || null)),
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
/**
 * Ein Datum, wie man es sagt.
 *
 * "2026-09-03 bis 2026-09-30" ist eine Datenbankzeile und keine Sprache. Der
 * Monat steht als Kürzel und nicht als Zahl, weil 3.9. und 9.3. sich nur
 * durch die Reihenfolge unterscheiden und jeder zweite Leser kurz stockt.
 *
 * Das Jahr kommt nur mit, wenn ein Zeitraum zwei Jahre berührt. Sonst steht
 * es zweimal in einer Zeile, in der es niemanden interessiert.
 */
const MONAT_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export function datumKurz(iso: string, mitJahr = false): string {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!treffer) return String(iso);
  const [, jahr, monat, tag] = treffer;
  const kurz = `${Number(tag)}. ${MONAT_KURZ[Number(monat) - 1]}`;
  return mitJahr ? `${kurz} ${jahr}` : kurz;
}

/** Ein Zeitraum in einer Zeile. */
export function spanneKurz(von: string, bis: string): string {
  const ueberJahre = von.slice(0, 4) !== bis.slice(0, 4);
  return `${datumKurz(von, ueberJahre)} bis ${datumKurz(bis, ueberJahre)}`;
}

export function berichtText(b: Bericht): string {
  const zeilen = [
    `daevo Bericht, ${spanneKurz(b.von, b.bis)}`,
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

  // Die blosse Zahl, nicht `wert`. Der trägt seit der Aufteilung in Zahl,
  // Einheit und Zusatz auch den Zusatz, und daraus wurde im Betrieb
  // "Eingetragen sind 6 zusammen Einheiten in 28 Tagen".
  const training = werte.find((w) => w.schluessel === "einheiten");
  if (training) saetze.push(`Eingetragen sind ${training.zahl} Einheiten in ${gesamt} Tagen.`);

  return saetze.slice(0, 3);
}

/*
 * "besser" und "schlechter" bleiben weg. Ob mehr Kalorien besser sind, hängt
 * am Ziel, und das weiss diese Funktion nicht.
 */
function trendText(jetzt: number, vorher: number | null): string | null {
  if (vorher === null || vorher === 0) return null;
  const anteil = (jetzt - vorher) / Math.abs(vorher);
  if (Math.abs(anteil) < TREND_SCHWELLE) return "wie davor";
  const richtung = anteil > 0 ? "mehr" : "weniger";
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
  return [t.kcal, t.trainingMinuten, t.gewichtKg, t.energie, t.schlafMinuten, t.schlafQualitaet, t.wasserMl]
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
