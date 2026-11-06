/**
 * Der Verlauf der Ernährung: wie ein Tag stand und was eine Woche im Schnitt
 * ergibt.
 *
 * Heute zeigt nur heute. Wer wissen will, was er gestern gegessen hat oder
 * wie groß sein Defizit über die Woche wirklich war, fand das bisher nirgends.
 * Diese Datei rechnet beides, die Oberfläche zeigt es unter Mahlzeiten.
 *
 * Es gelten dieselben zwei Regeln wie im Wochenrückblick, und zwar mit
 * denselben Schwellen, damit beide nie verschiedene Schnitte nennen.
 *
 * Ein Tag ohne Eintrag ist eine Lücke und kein Tag ohne Essen. Er zählt in
 * keinem Schnitt mit, er wird nur genannt.
 *
 * Ein Tag unter der Hälfte des Kalorienziels ist fast immer unvollständig
 * eingetragen. Er zählt ebenfalls nicht mit. Sonst rechnet die App aus zwei
 * vergessenen Abendessen ein Defizit, das es nie gab.
 *
 * Die Bilanz ist Aufnahme minus Verbrauch. Der Verbrauch ist gemessen, wenn
 * trend.ts ihn aus dem Gewichtsverlauf bestimmen kann, sonst die Formel aus
 * energy.ts. Welches von beiden, steht in jeder Ausgabe. Die Umrechnung in
 * Kilo nutzt 7700 kcal je kg nach Wishnofsky (1958). Das ist eine Näherung
 * für reines Körperfett. Auf der Waage kommen Wasser und Glykogen dazu, die
 * Zahl ist deshalb eine Rechnung und keine Vorhersage.
 */

export interface VerlaufTag {
  /** JJJJ-MM-TT */
  tag: string;
  /** Mahlzeiten mit mindestens einem Posten. */
  mahlzeiten: number;
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  zielKcal: number;
  zielProteinG: number;
  zielFatG: number;
  zielCarbsG: number;
  /** Verbrauch an diesem Tag, gemessen oder nach Formel. */
  verbrauchKcal: number | null;
}

export type TagStand = "leer" | "unvollstaendig" | "im_ziel" | "drueber" | "drunter";

/** Gleich wie im Wochenrückblick, eine Regel der App. */
export const UNVOLLSTAENDIG_ANTEIL = 0.5;
/** Kalorien innerhalb von 10 Prozent gelten als getroffen. */
export const KCAL_SPANNE = 0.1;
const KCAL_PRO_KG = 7700;

export function tagStand(t: Pick<VerlaufTag, "mahlzeiten" | "kcal" | "zielKcal">): TagStand {
  if (t.mahlzeiten <= 0 || t.kcal <= 0) return "leer";
  if (t.zielKcal > 0 && t.kcal < t.zielKcal * UNVOLLSTAENDIG_ANTEIL) return "unvollstaendig";
  if (t.zielKcal <= 0) return "im_ziel";
  const abw = (t.kcal - t.zielKcal) / t.zielKcal;
  if (abw > KCAL_SPANNE) return "drueber";
  if (abw < -KCAL_SPANNE) return "drunter";
  return "im_ziel";
}

export interface Makros {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface Wochenschnitt {
  von: string;
  bis: string;
  /** Tage im Zeitraum, bis heute. */
  tage: number;
  mitEintrag: number;
  /** Tage, die in die Schnitte eingehen. */
  gezaehlt: number;
  leer: string[];
  unvollstaendig: string[];
  /** Null, wenn kein Tag gezählt wird. */
  schnitt: Makros | null;
  ziel: Makros | null;
  verbrauchKcal: number | null;
  verbrauchQuelle: "gemessen" | "formel";
  /** Aufnahme minus Verbrauch je Tag. Negativ heisst Defizit. */
  bilanzKcal: number | null;
  /** Summe der Bilanz über die gezählten Tage. */
  bilanzSummeKcal: number | null;
  /** Die Bilanz je Tag auf sieben Tage gerechnet, in kg. Eine Rechnung. */
  kgJeWoche: number | null;
}

const mittel = (werte: number[]) => (werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0);

export function wochenschnitt(
  tage: VerlaufTag[],
  { verbrauchQuelle = "formel" }: { verbrauchQuelle?: "gemessen" | "formel" } = {},
): Wochenschnitt {
  const sortiert = [...tage].sort((a, b) => a.tag.localeCompare(b.tag));
  const leer: string[] = [];
  const unvollstaendig: string[] = [];
  const gezaehlt: VerlaufTag[] = [];
  for (const t of sortiert) {
    const s = tagStand(t);
    if (s === "leer") leer.push(t.tag);
    else if (s === "unvollstaendig") unvollstaendig.push(t.tag);
    else gezaehlt.push(t);
  }
  const ergebnis: Wochenschnitt = {
    von: sortiert[0]?.tag ?? "",
    bis: sortiert[sortiert.length - 1]?.tag ?? "",
    tage: sortiert.length,
    mitEintrag: sortiert.length - leer.length,
    gezaehlt: gezaehlt.length,
    leer, unvollstaendig,
    schnitt: null, ziel: null,
    verbrauchKcal: null, verbrauchQuelle,
    bilanzKcal: null, bilanzSummeKcal: null, kgJeWoche: null,
  };
  if (!gezaehlt.length) return ergebnis;

  const r = (x: number) => Math.round(x);
  ergebnis.schnitt = {
    kcal: r(mittel(gezaehlt.map((t) => t.kcal))),
    proteinG: r(mittel(gezaehlt.map((t) => t.proteinG))),
    fatG: r(mittel(gezaehlt.map((t) => t.fatG))),
    carbsG: r(mittel(gezaehlt.map((t) => t.carbsG))),
  };
  ergebnis.ziel = {
    kcal: r(mittel(gezaehlt.map((t) => t.zielKcal))),
    proteinG: r(mittel(gezaehlt.map((t) => t.zielProteinG))),
    fatG: r(mittel(gezaehlt.map((t) => t.zielFatG))),
    carbsG: r(mittel(gezaehlt.map((t) => t.zielCarbsG))),
  };
  // Die Bilanz nur über Tage, für die ein Verbrauch bekannt ist. Ein Tag
  // ohne Verbrauch mit null zu rechnen ergäbe einen Überschuss in Höhe der
  // ganzen Aufnahme.
  const mitVerbrauch = gezaehlt.filter((t) => t.verbrauchKcal !== null && Number(t.verbrauchKcal) > 0);
  if (mitVerbrauch.length) {
    const bilanzen = mitVerbrauch.map((t) => t.kcal - Number(t.verbrauchKcal));
    ergebnis.verbrauchKcal = r(mittel(mitVerbrauch.map((t) => Number(t.verbrauchKcal))));
    ergebnis.bilanzKcal = r(mittel(bilanzen));
    ergebnis.bilanzSummeKcal = r(bilanzen.reduce((a, b) => a + b, 0));
    ergebnis.kgJeWoche = Math.round(((mittel(bilanzen) * 7) / KCAL_PRO_KG) * 100) / 100;
  }
  return ergebnis;
}

const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONATE = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

/** "Mo 3. Nov." */
export function tagKurz(tagIso: string): string {
  const d = new Date(`${tagIso}T12:00:00`);
  return `${WT[d.getDay()]} ${d.getDate()}. ${MONATE[d.getMonth()]}`;
}

/** "3. bis 9. Nov." oder "27. Okt. bis 2. Nov." */
export function zeitraumText(von: string, bis: string): string {
  const a = new Date(`${von}T12:00:00`);
  const b = new Date(`${bis}T12:00:00`);
  if (von === bis) return `${b.getDate()}. ${MONATE[b.getMonth()]}`;
  const links = a.getMonth() === b.getMonth() ? `${a.getDate()}.` : `${a.getDate()}. ${MONATE[a.getMonth()]}`;
  return `${links} bis ${b.getDate()}. ${MONATE[b.getMonth()]}`;
}

/** Tage als Liste mit genau einem Punkt am Ende. "Nov." trägt ihn schon, "Mai" nicht. */
export function tageListe(tage: string[]): string {
  const x = tage.map(tagKurz).join(", ");
  return x.endsWith(".") ? x : `${x}.`;
}

const kg = (x: number) => String(Math.abs(x)).replace(".", ",");

/** Die Bilanz in Worten: Defizit, Überschuss oder ausgeglichen. */
export function bilanzSatz(w: Wochenschnitt): string {
  if (w.bilanzKcal === null || w.verbrauchKcal === null) return "Für die Bilanz fehlt der Verbrauch.";
  const quelle = w.verbrauchQuelle === "gemessen"
    ? "gemessen aus deinem Gewichtsverlauf"
    : "nach Formel aus Profil und Schritten";
  const b = w.bilanzKcal;
  const kern = Math.abs(b) < 50
    ? `Ausgeglichen, im Schnitt ${b > 0 ? "+" : ""}${b} kcal am Tag`
    : b < 0
      ? `Defizit im Schnitt ${-b} kcal am Tag, zusammen ${-(w.bilanzSummeKcal ?? 0)} kcal`
      : `Überschuss im Schnitt ${b} kcal am Tag, zusammen ${w.bilanzSummeKcal ?? 0} kcal`;
  const rechnung = w.kgJeWoche !== null && Math.abs(b) >= 50
    ? ` Rechnerisch sind das etwa ${kg(w.kgJeWoche)} kg je Woche ${w.kgJeWoche < 0 ? "weniger" : "mehr"}, die Waage schwankt mit Wasser stärker.`
    : "";
  return `${kern}. Verbrauch ${w.verbrauchKcal} kcal, ${quelle}.${rechnung}`;
}

/** Der Wochenschnitt als Text für Coach und Regelweg. */
export function wochenschnittText(w: Wochenschnitt): string {
  if (w.tage === 0) return "Wochenschnitt: noch kein abgeschlossener Tag in dieser Woche. Heute zählt mit, sobald er vorbei ist.";
  const kopf = `Wochenschnitt ${zeitraumText(w.von, w.bis)}`;
  if (!w.schnitt || !w.ziel) {
    const grund = w.mitEintrag === 0
      ? "In diesem Zeitraum ist nichts eingetragen."
      : `Kein Tag ist vollständig eingetragen: ${w.unvollstaendig.length} ${w.unvollstaendig.length === 1 ? "Tag liegt" : "Tage liegen"} unter der Hälfte deines Ziels.`;
    return `${kopf}\n${grund} Ein Tag ohne Eintrag zählt nicht als Tag ohne Essen.`;
  }
  const s = w.schnitt;
  const z = w.ziel;
  const zeilen = [
    kopf,
    `Gezählt: ${w.gezaehlt} von ${w.tage} Tagen.`,
    `- Kalorien: ${s.kcal} von ${z.kcal} kcal`,
    `- Protein: ${s.proteinG} von ${z.proteinG} g`,
    `- Fett: ${s.fatG} von ${z.fatG} g`,
    `- Kohlenhydrate: ${s.carbsG} von ${z.carbsG} g`,
    bilanzSatz(w),
  ];
  if (w.leer.length) zeilen.push(`Ohne Eintrag, zählt nicht: ${tageListe(w.leer)}`);
  if (w.unvollstaendig.length) {
    zeilen.push(`Unter der Hälfte des Ziels, wohl unvollständig, zählt nicht: ${tageListe(w.unvollstaendig)} Hast du dort wirklich so wenig gegessen, sag es mir.`);
  }
  return zeilen.join("\n");
}
