/**
 * Aufgaben und was davon heute noch drankommt.
 *
 * Der Sinn ist nicht eine weitere Liste. Der Sinn ist die Entscheidung: was
 * machst du heute noch, und was schiebst du auf morgen, ohne dich dafür
 * fertigzumachen. Diese Entscheidung fällt hier nach Zahlen, nicht nach
 * Gefühl, und sie sagt jedes Mal dazu, worauf sie beruht.
 *
 * Die Zeit, die noch übrig ist, kommt aus dem Kalender. Ohne Kalender wird mit
 * dem Rest des Wachtags gerechnet, und das steht dann auch in der Begründung.
 *
 * Zur Ueberlastgrenze: die App misst kein Cortisol und behauptet auch nicht,
 * eine Grenze würde es senken. Die Grenze ist eine Regel, die der Nutzer sich
 * selbst setzt, damit ein Tag ein Ende hat. Mehr wird hier nicht versprochen.
 */

export interface Aufgabe {
  id: string;
  text: string;
  /** Geschätzter Aufwand in Minuten. */
  minuten: number;
  /** Fällig bis, JJJJ-MM-TT. Ohne Datum gibt es keine Frist. */
  faellig?: string | null;
  /** 1 nebensächlich, 2 normal, 3 wichtig. */
  wichtigkeit: number;
  erledigt: boolean;
  /** Wann angelegt, ISO. */
  erstellt: string;
  /** Woher sie kommt: vom Nutzer, aus dem Gespräch, aus einem Abschluss. */
  quelle?: string;
}

export interface Plan {
  /** Was heute noch drankommt, in dieser Reihenfolge. */
  heute: Aufgabe[];
  /** Was auf morgen wandert. */
  morgen: Aufgabe[];
  /** Was ohne Frist liegen bleibt, weil es heute nichts bringt. */
  spaeter: Aufgabe[];
  /** Minuten, die nach dem Kalender heute noch frei sind. */
  freieMinuten: number;
  /** Minuten, die der Plan für heute belegt. */
  geplanteMinuten: number;
  /** Jede Zeile nennt die Zahl, auf der sie beruht. */
  begruendung: string[];
}

/** Ab hier gilt der Tag als voll. Als Regel gesetzt, nicht gemessen. */
export const ARBEITSGRENZE_MINUTEN = 600;

export interface PlanEingabe {
  aufgaben: Aufgabe[];
  /** Heute, JJJJ-MM-TT. */
  tag: string;
  /** Minuten, die heute noch frei sind. Aus dem Kalender. */
  freieMinuten: number;
  /** Minuten, die heute schon gearbeitet wurden. Aus dem Kalender. */
  bereitsGearbeitet: number;
  /** Eigene Obergrenze in Minuten. Ohne Angabe die Regel oben. */
  grenzeMinuten?: number;
}

/**
 * Sortiert die offenen Aufgaben und teilt sie auf heute und morgen.
 *
 * Die Rangfolge steht auf zwei Beinen. Wichtigkeit sagt, was zählt. Frist
 * sagt, was nicht mehr warten kann. Eine wichtige Aufgabe ohne Frist verliert
 * gegen eine mittlere, die heute fällig ist, denn die zweite ist morgen
 * verloren und die erste nicht.
 */
export function priorisiere(eingabe: PlanEingabe): Plan {
  const offen = eingabe.aufgaben.filter((a) => !a.erledigt);
  const grenze = eingabe.grenzeMinuten ?? ARBEITSGRENZE_MINUTEN;
  const begruendung: string[] = [];

  const rest = Math.max(0, eingabe.freieMinuten);
  const ueber = eingabe.bereitsGearbeitet - grenze;

  // Die Obergrenze schlägt den Kalender. Wer zwölf Stunden verplant hat, hat
  // rechnerisch noch Zeit und trotzdem nichts mehr zu geben.
  const budget = ueber >= 0 ? 0 : Math.min(rest, grenze - eingabe.bereitsGearbeitet);

  if (ueber >= 0) {
    begruendung.push(
      `Du bist heute bei ${stunden(eingabe.bereitsGearbeitet)} verplanter Zeit und damit über deiner Grenze ` +
      `von ${stunden(grenze)}. Alles Weitere steht morgen im Plan.`,
    );
  } else {
    begruendung.push(
      `Nach deinem Kalender bleiben heute ${rest} freie Minuten. Bis zu deiner Grenze von ${stunden(grenze)} ` +
      `sind es ${grenze - eingabe.bereitsGearbeitet} Minuten. Gerechnet wird mit dem kleineren Wert, ${budget} Minuten.`,
    );
  }

  const bewertet = offen
    .map((a) => ({ a, rang: rang(a, eingabe.tag) }))
    .sort((x, y) => y.rang - x.rang || x.a.minuten - y.a.minuten);

  const heute: Aufgabe[] = [];
  const morgen: Aufgabe[] = [];
  const spaeter: Aufgabe[] = [];
  let belegt = 0;

  for (const { a } of bewertet) {
    const ueberfaellig = a.faellig ? a.faellig <= eingabe.tag : false;
    if (belegt + a.minuten <= budget) {
      heute.push(a);
      belegt += a.minuten;
      continue;
    }
    // Passt nicht mehr. Eine Aufgabe mit Frist heute wandert trotzdem nicht
    // ins Nirgendwo, sondern sichtbar auf morgen, mit Grund.
    if (ueberfaellig || (a.faellig && a.faellig <= naechsterTag(eingabe.tag))) morgen.push(a);
    else if (a.wichtigkeit >= 3) morgen.push(a);
    else spaeter.push(a);
  }

  if (heute.length === 0 && offen.length > 0) {
    begruendung.push("Heute passt keine Aufgabe mehr rein. Das ist kein Versagen, das ist der Kalender.");
  } else if (heute.length > 0) {
    begruendung.push(`${heute.length} ${heute.length === 1 ? "Aufgabe" : "Aufgaben"} für heute, zusammen ${belegt} Minuten.`);
  }

  const heuteFaellig = morgen.filter((a) => a.faellig && a.faellig <= eingabe.tag);
  if (heuteFaellig.length > 0) {
    begruendung.push(
      `${heuteFaellig.length} davon war für heute gesetzt. Wenn das wirklich heute sein muss, ` +
      "streich dafür etwas anderes, statt den Tag zu verlängern.",
    );
  }

  return { heute, morgen, spaeter, freieMinuten: rest, geplanteMinuten: belegt, begruendung };
}

/**
 * Rangzahl einer Aufgabe.
 *
 * Wichtigkeit zählt bis 30, die Frist bis 60. Damit gewinnt eine Frist heute
 * gegen jede Wichtigkeit, und unter gleichen Fristen entscheidet die
 * Wichtigkeit. Alte Aufgaben bekommen einen kleinen Zuschlag, damit nichts
 * ewig unten liegen bleibt.
 */
function rang(a: Aufgabe, tag: string): number {
  let punkte = Math.max(1, Math.min(3, a.wichtigkeit)) * 10;
  if (a.faellig) {
    const tage = tageZwischen(tag, a.faellig);
    if (tage <= 0) punkte += 60;
    else if (tage === 1) punkte += 40;
    else if (tage <= 3) punkte += 25;
    else if (tage <= 7) punkte += 12;
  }
  const alter = tageZwischen(a.erstellt.slice(0, 10), tag);
  punkte += Math.min(10, Math.max(0, alter));
  return punkte;
}

function tageZwischen(vonIso: string, bisIso: string): number {
  const von = new Date(`${vonIso}T12:00:00`).getTime();
  const bis = new Date(`${bisIso}T12:00:00`).getTime();
  if (!Number.isFinite(von) || !Number.isFinite(bis)) return 0;
  return Math.round((bis - von) / 86400000);
}

function naechsterTag(tagIso: string): string {
  const d = new Date(`${tagIso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function stunden(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = minuten % 60;
  if (h === 0) return `${m} Minuten`;
  return m === 0 ? `${h} Stunden` : `${h} Stunden ${m} Minuten`;
}

/** Der Plan in Worten. Für den Prompt, die Erinnerung und die Anzeige. */
export function planText(plan: Plan): string {
  const zeilen: string[] = [];
  if (plan.heute.length === 0 && plan.morgen.length === 0 && plan.spaeter.length === 0) {
    return "Keine offenen Aufgaben.";
  }

  if (plan.heute.length) {
    zeilen.push("Heute noch, in dieser Reihenfolge:");
    for (const a of plan.heute) zeilen.push(`- ${a.text} (${a.minuten} Minuten${frist(a)})`);
  } else {
    zeilen.push("Heute nichts mehr.");
  }

  if (plan.morgen.length) {
    zeilen.push("Das kann bis morgen warten:");
    for (const a of plan.morgen) zeilen.push(`- ${a.text} (${a.minuten} Minuten${frist(a)})`);
  }

  if (plan.spaeter.length) {
    zeilen.push(`Ohne Frist und heute ohne Nutzen: ${plan.spaeter.map((a) => a.text).join(", ")}.`);
  }

  for (const b of plan.begruendung) zeilen.push(b);
  return zeilen.join("\n");
}

function frist(a: Aufgabe): string {
  return a.faellig ? `, fällig ${a.faellig}` : "";
}
