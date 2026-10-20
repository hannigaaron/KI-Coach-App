import type { UserProfile } from "./types.js";
import { foldUmlauts } from "./memory.js";

/**
 * Mindeststandards.
 *
 * Der Unterschied zu einem Ziel: ein Ziel ist der beste Tag, ein Standard ist
 * der schlechteste, den du noch akzeptierst. "Sechsmal die Woche trainieren"
 * ist ein Ziel. "Mindestens zweimal, egal wie die Woche läuft" ist ein
 * Standard. Standards halten dich in schlechten Wochen im Spiel, und schlechte
 * Wochen entscheiden über ein Jahr, nicht die guten.
 *
 * Deshalb sind die Werte hier bewusst niedrig angesetzt. Ein Standard, den man
 * in einer harten Woche reisst, ist kein Standard, sondern nur ein weiteres
 * Ziel, an dem man scheitert.
 *
 * Der Nachweis läuft über Daten, die die App ohnehin hat. Ein Standard ohne
 * messbaren Nachweis wird nicht automatisch geprüft, sondern nachgefragt.
 */

export type StandardKind =
  | "protein"
  | "wasser"
  | "training"
  | "schritte"
  | "erfassen"
  | "schlafenszeit"
  | "handy_aus"
  | "frei";

/** Ueber welchen Zeitraum der Standard gilt. */
export type Kadenz = "taeglich" | "woechentlich";

export interface Standard {
  id: string;
  kind: StandardKind;
  /** Der Satz, den der Nutzer liest. Aus seiner Sicht formuliert. */
  text: string;
  kadenz: Kadenz;
  /** Zielwert in der Einheit der Art. Bei "frei" ohne Bedeutung. */
  ziel: number;
  aktiv: boolean;
  /** Wann der Standard vereinbart wurde. */
  seit: string;
  /** Bei Schlafenszeit und Handy: bis wann, HH:MM. Steht auch im Text. */
  uhrzeit?: string;
}

export interface StandardTag {
  /** Datum im Format JJJJ-MM-TT. */
  day: string;
  proteinG: number;
  waterMl: number;
  steps: number;
  /** Anzahl erfasster Mahlzeiten. */
  meals: number;
  /** Anzahl absolvierter Trainingseinheiten. */
  trainings: number;
  /** Wurde der Standard vom Nutzer selbst bestätigt. */
  bestaetigt?: Record<string, boolean>;
}

export interface StandardStatus {
  standard: Standard;
  /** Wie oft der Standard im Zeitraum gehalten wurde. */
  gehalten: number;
  /** Wie oft er hätte gehalten werden können. */
  moeglich: number;
  /** Anteil zwischen 0 und 1. */
  quote: number;
  /** Wurde er heute beziehungsweise diese Woche gehalten. */
  aktuell: boolean;
  /** Wie viele Tage in Folge zuletzt gehalten. Nur bei täglichen Standards. */
  serie: number;
  /** Der Satz, den der Coach sagen kann. Enthält den Standard und die Zahl. */
  satz: string;
  /** Nur die Zahlen, ohne den Standard zu wiederholen. Für Listen. */
  zahlen: string;
}

/**
 * Schlägt Standards vor, passend zu Profil und gewählten Schwerpunkten.
 *
 * Bewusst höchstens vier. Wer zwölf Mindeststandards hat, hat keine.
 */
export function suggestStandards(params: {
  profile: UserProfile;
  /** Schwerpunkte aus dem Anamnesebogen, etwa ernaehrung, kraft, schlaf. */
  bereiche?: string[];
  proteinTargetG: number;
  waterTargetMl: number;
  heute?: string;
}): Standard[] {
  const seit = params.heute ?? new Date().toISOString().slice(0, 10);
  const bereiche = new Set(params.bereiche ?? []);
  const out: Standard[] = [];

  // Der Erfassungsstandard steht immer drin. Ohne Daten kann die App nichts,
  // und fünf Tage die Woche sind auch in einer schlechten Woche zu schaffen.
  out.push({
    id: "std_erfassen",
    kind: "erfassen",
    text: "An mindestens fünf Tagen die Woche trage ich ein, was ich gegessen habe",
    kadenz: "woechentlich",
    ziel: 5,
    aktiv: true,
    seit,
  });

  // Protein bei 80 Prozent des Ziels. Das ist die Untergrenze, ab der der
  // Muskelerhalt im Defizit nicht mehr sicher ist.
  if (bereiche.has("ernaehrung") || bereiche.has("kraft") || bereiche.has("gewicht") || bereiche.size === 0) {
    out.push({
      id: "std_protein",
      kind: "protein",
      text: `Ich komme jeden Tag auf mindestens ${Math.round(params.proteinTargetG * 0.8)} g Protein`,
      kadenz: "taeglich",
      ziel: Math.round(params.proteinTargetG * 0.8),
      aktiv: true,
      seit,
    });
  }

  const trainingProWoche = zaehleTrainings(params.profile);
  if (trainingProWoche > 0 && (bereiche.has("kraft") || bereiche.has("ausdauer") || bereiche.size === 0)) {
    const minimum = Math.max(2, Math.round(trainingProWoche * 0.6));
    out.push({
      id: "std_training",
      kind: "training",
      text: `Ich mache mindestens ${minimum === 1 ? "eine Einheit" : `${minimum} Einheiten`} die Woche, auch wenn die Woche schlecht läuft`,
      kadenz: "woechentlich",
      ziel: minimum,
      aktiv: true,
      seit,
    });
  }

  if (bereiche.has("trinken")) {
    out.push({
      id: "std_wasser",
      kind: "wasser",
      text: `Ich trinke jeden Tag mindestens ${Math.round((params.waterTargetMl * 0.75) / 100) * 100} ml`,
      kadenz: "taeglich",
      ziel: Math.round((params.waterTargetMl * 0.75) / 100) * 100,
      aktiv: true,
      seit,
    });
  }

  if (bereiche.has("schlaf") || bereiche.has("routine")) {
    out.push({
      id: "std_schlafenszeit",
      kind: "schlafenszeit",
      text: `Ich liege an mindestens fünf Tagen die Woche vor ${params.profile.sleepTime} im Bett`,
      kadenz: "woechentlich",
      ziel: 5,
      aktiv: true,
      seit,
    });
  }

  if (bereiche.has("ausdauer") && !out.some((s) => s.kind === "schritte")) {
    out.push({
      id: "std_schritte",
      kind: "schritte",
      text: `Ich gehe jeden Tag mindestens ${Math.round((params.profile.dailySteps * 0.7) / 500) * 500} Schritte`,
      kadenz: "taeglich",
      ziel: Math.round((params.profile.dailySteps * 0.7) / 500) * 500,
      aktiv: true,
      seit,
    });
  }

  return out.slice(0, 4);
}

/**
 * Wertet aus, wie gut ein Standard gehalten wurde.
 *
 * `tage` muss absteigend nach Datum sortiert sein, der heutige Tag zuerst.
 */
export function standardStatus(standard: Standard, tage: StandardTag[]): StandardStatus {
  const messbar = istMessbar(standard.kind);
  const gepruefteTage = tage.slice(0, standard.kadenz === "taeglich" ? 14 : 28);

  const treffer = gepruefteTage.map((tag) => haeltTag(standard, tag, messbar));

  if (standard.kadenz === "taeglich") {
    const gehalten = treffer.filter(Boolean).length;
    const moeglich = gepruefteTage.length;
    let serie = 0;
    for (const ok of treffer) {
      if (!ok) break;
      serie++;
    }
    const quote = moeglich > 0 ? gehalten / moeglich : 0;
    return {
      standard,
      gehalten,
      moeglich,
      quote,
      aktuell: treffer[0] === true,
      serie,
      satz: `${standard.text}: ${zahlenTaeglich(gehalten, moeglich, serie)}`,
      zahlen: zahlenTaeglich(gehalten, moeglich, serie),
    };
  }

  // Wöchentlich: die Tage in Wochenblöcke zu sieben schneiden und je Woche
  // zählen, wie oft der Standard erfüllt war.
  const wochen: boolean[] = [];
  for (let start = 0; start < gepruefteTage.length; start += 7) {
    const block = treffer.slice(start, start + 7);
    if (block.length < 7 && start > 0) break;
    wochen.push(block.filter(Boolean).length >= standard.ziel);
  }
  const gehalten = wochen.filter(Boolean).length;
  const moeglich = wochen.length;
  const dieseWoche = treffer.slice(0, 7).filter(Boolean).length;
  return {
    standard,
    gehalten,
    moeglich,
    quote: moeglich > 0 ? gehalten / moeglich : 0,
    aktuell: dieseWoche >= standard.ziel,
    serie: 0,
    satz: `${standard.text}: ${zahlenWoechentlich(standard, dieseWoche)}`,
    zahlen: zahlenWoechentlich(standard, dieseWoche),
  };
}

/** Wertet alle Standards aus, die wichtigsten Abweichungen zuerst. */
export function standardsStatus(standards: Standard[], tage: StandardTag[]): StandardStatus[] {
  return standards
    .filter((s) => s.aktiv)
    .map((s) => standardStatus(s, tage))
    .sort((a, b) => a.quote - b.quote);
}

/**
 * Sucht den Standard, bei dem Nachhaken am meisten bringt.
 *
 * Kriterium ist nicht die schlechteste Quote allein, sondern die schlechteste
 * Quote unter denen, die noch nicht aufgegeben sind. Ein Standard, der seit
 * zwei Wochen bei null steht, gehört geändert, nicht erinnert.
 */
export function standardZumNachhaken(status: StandardStatus[]): StandardStatus | null {
  const kandidaten = status.filter((s) => !s.aktuell && s.moeglich >= 1);
  if (kandidaten.length === 0) return null;
  const machbar = kandidaten.filter((s) => s.quote > 0.15);
  return (machbar.length > 0 ? machbar : kandidaten)[0] ?? null;
}

/**
 * Welche Standards die App selbst nachweisen kann.
 *
 * Training steht bewusst nicht drin. Ein Eintrag im Kalender ist kein Beweis,
 * dass trainiert wurde. Solange keine Uhr angebunden ist, wird gefragt statt
 * geraten. Das ändert sich mit Apple Health, siehe docs/ROADMAP.md.
 */
function istMessbar(kind: StandardKind): boolean {
  return kind === "protein" || kind === "wasser" || kind === "schritte" || kind === "erfassen";
}

function haeltTag(standard: Standard, tag: StandardTag, messbar: boolean): boolean {
  if (!messbar) return Boolean(tag.bestaetigt?.[standard.id]);
  switch (standard.kind) {
    case "protein":
      return tag.proteinG >= standard.ziel;
    case "wasser":
      return tag.waterMl >= standard.ziel;
    case "schritte":
      return tag.steps >= standard.ziel;
    case "erfassen":
      return tag.meals > 0;
    case "training":
      return tag.trainings > 0;
    default:
      return Boolean(tag.bestaetigt?.[standard.id]);
  }
}

function zahlenTaeglich(gehalten: number, moeglich: number, serie: number): string {
  if (moeglich === 0) return "noch keine Daten";
  if (serie >= 3) return `${serie} Tage in Folge gehalten, ${gehalten} von ${moeglich} insgesamt`;
  return `an ${gehalten} von ${moeglich} Tagen gehalten`;
}

function zahlenWoechentlich(standard: Standard, dieseWoche: number): string {
  const fehlt = Math.max(0, standard.ziel - dieseWoche);
  if (fehlt === 0) return `diese Woche erfüllt, ${dieseWoche} von ${standard.ziel}`;
  return `diese Woche ${dieseWoche} von ${standard.ziel}, es fehlen noch ${fehlt}`;
}

function zaehleTrainings(profile: UserProfile): number {
  return (profile.sessions ?? []).length;
}

const ZAHLWORT: Record<string, number> = {
  ein: 1, einmal: 1, zwei: 2, zweimal: 2, drei: 3, dreimal: 3, vier: 4, viermal: 4,
  fuenf: 5, fuenfmal: 5, sechs: 6, sechsmal: 6, sieben: 7, siebenmal: 7,
};

const ART_WORTE: [RegExp, StandardKind][] = [
  [/\b(handy|smartphone|bildschirm)\w*/, "handy_aus"],
  [/\b(schlafen|bett|schlafenszeit|ins bett)\b/, "schlafenszeit"],
  [/\bprotein|eiweiss\b/, "protein"],
  [/\b(wasser|trinken|trinke)\b/, "wasser"],
  [/\b(training|trainieren|einheiten?)\b/, "training"],
  [/\bschritte\b/, "schritte"],
  [/\b(eintragen|tracken|erfassen)\b/, "erfassen"],
];

/**
 * Liest eine Änderung eines Mindeststandards aus einem Satz, ohne Modell.
 *
 * "Passe meinen Mindeststandard an, Handy nur noch dreimal die Woche vor 23
 * Uhr weg." Erkannt wird nur, was eindeutig ist: das Wort Standard, eine Art,
 * und eine Häufigkeit oder ein Wert. Was fehlt, kommt aus dem bestehenden
 * Standard derselben Art. Gibt es keinen und fehlt der Wert, greift der Zweig
 * nicht, denn ein geratener Mindestwert ist schlimmer als eine Rückfrage.
 */
export function standardAenderungAus(
  satz: string,
  bestehend: Standard[] = [],
): { id?: string; kind: StandardKind; kadenz: Kadenz; ziel: number; uhrzeit?: string; text: string } | null {
  const t = foldUmlauts(String(satz ?? "").toLowerCase());
  if (!/\b(mindeststandard\w*|standard\w*)\b/.test(t)) return null;
  const treffer = ART_WORTE.filter(([m]) => m.test(t)).map(([, k]) => k);
  // "Dreimal die Woche vor 23 Uhr weg" sagt nicht, was weg ist. Gemeint ist
  // in dieser App das Handy, denn nur dafür gibt es einen Standard mit "weg".
  if (treffer.length === 0 && /\bweg\b/.test(t) && /\b(vor|bis)\s+\d{1,2}/.test(t)) treffer.push("handy_aus");
  if (treffer.length !== 1) return null;
  const kind = treffer[0] as StandardKind;
  const alt = bestehend.find((x) => x.kind === kind && x.aktiv);

  let kadenz: Kadenz | undefined;
  let haeufigkeit: number | undefined;
  const woche = /\b(\d|ein|einmal|zwei|zweimal|drei|dreimal|vier|viermal|fuenf|fuenfmal|sechs|sechsmal|sieben|siebenmal)\s*(x|mal)?\s*(die|pro|in der|je)\s+woche\b/.exec(t)
    ?? /\ban\s+(\d|zwei|drei|vier|fuenf|sechs|sieben)\s+tagen\b/.exec(t);
  if (woche) {
    kadenz = "woechentlich";
    const w = woche[1] as string;
    haeufigkeit = /^\d$/.test(w) ? Number(w) : ZAHLWORT[w];
  } else if (/\b(jeden tag|taeglich|immer)\b/.test(t)) {
    kadenz = "taeglich";
  }

  const zeit = /\b(?:vor|bis|um)\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\b/.exec(t);
  let uhrzeit = alt?.uhrzeit;
  if (zeit && (kind === "handy_aus" || kind === "schlafenszeit")) {
    const h = Number(zeit[1]);
    const m = Number(zeit[2] ?? 0);
    if (h <= 23 && m <= 59) uhrzeit = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Ein Mengenwert für die messbaren Arten.
  let menge: number | undefined;
  const g = kind === "protein" ? /\b(\d{2,3})\s*(g|gramm)\b/.exec(t)
    : kind === "wasser" ? /\b(\d(?:[.,]\d)?)\s*(l|liter)\b/.exec(t)
    : kind === "schritte" ? /\b(\d{1,2}(?:[.]\d{3})?|\d{3,5})\s*schritte\b/.exec(t)
    : null;
  if (g) {
    const roh = String(g[1]).replace(/\.(?=\d{3}\b)/, "").replace(",", ".");
    menge = kind === "wasser" ? Math.round(Number(roh) * 1000) : Number(roh);
  }

  kadenz = kadenz ?? alt?.kadenz ?? (haeufigkeit ? "woechentlich" : undefined);
  if (!kadenz) return null;
  let ziel: number | undefined;
  if (kadenz === "woechentlich" && kind !== "protein" && kind !== "wasser" && kind !== "schritte") ziel = haeufigkeit ?? alt?.ziel;
  else ziel = menge ?? (kadenz === alt?.kadenz ? alt?.ziel : undefined) ?? haeufigkeit;
  if (!ziel || ziel <= 0) return null;
  if ((kind === "handy_aus" || kind === "schlafenszeit") && !uhrzeit) return null;

  const text = standardText(kind, kadenz, ziel, uhrzeit);
  return { ...(alt ? { id: alt.id } : {}), kind, kadenz, ziel, ...(uhrzeit ? { uhrzeit } : {}), text };
}

function malText(n: number): string {
  return n === 1 ? "einmal" : `${n} Mal`;
}

/** Der Satz eines Standards aus seinen Werten, aus Sicht des Nutzers. */
export function standardText(kind: StandardKind, kadenz: Kadenz, ziel: number, zeit?: string): string {
  // "vor 23 Uhr" liest sich, "vor 23:00 Uhr" ist eine Tabelle.
  const uhrzeit = zeit?.endsWith(":00") ? String(Number(zeit.slice(0, 2))) : zeit;
  const woche = kadenz === "woechentlich";
  const tage = `An mindestens ${ziel === 1 ? "einem Tag" : `${ziel} Tagen`} die Woche`;
  switch (kind) {
    case "handy_aus":
      return woche ? `${tage} lege ich das Handy vor ${uhrzeit} Uhr weg` : `Ich lege das Handy jeden Tag vor ${uhrzeit} Uhr weg`;
    case "schlafenszeit":
      return woche ? `${tage} liege ich vor ${uhrzeit} Uhr im Bett` : `Ich liege jeden Tag vor ${uhrzeit} Uhr im Bett`;
    case "training":
      return `Ich trainiere mindestens ${malText(ziel)} die Woche, auch wenn die Woche schlecht läuft`;
    case "erfassen":
      return woche ? `${tage} trage ich ein, was ich gegessen habe` : "Ich trage jeden Tag ein, was ich gegessen habe";
    case "protein":
      return `Ich komme jeden Tag auf mindestens ${ziel} g Protein`;
    case "wasser":
      return `Ich trinke jeden Tag mindestens ${ziel} ml`;
    case "schritte":
      return `Ich gehe jeden Tag mindestens ${ziel} Schritte`;
    default:
      return woche ? `${tage} halte ich meinen Standard` : "Ich halte meinen Standard jeden Tag";
  }
}
