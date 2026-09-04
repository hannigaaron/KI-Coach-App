/**
 * Verlauf über Wochen.
 *
 * Der Rechenkern schätzt den Kalorienbedarf über Mifflin-St Jeor und einen
 * Aktivitätsfaktor. Diese Schätzung liegt bei einzelnen Menschen regelmässig
 * 200 bis 300 kcal daneben, weil der Faktor geraten ist und niemand weiss,
 * wie viel jemand wirklich isst.
 *
 * Es gibt genau einen Weg, das zu korrigieren: den eigenen Gewichtsverlauf
 * gegen die eigene Aufnahme rechnen. Wer über vier Wochen im Schnitt 2900 kcal
 * isst und dabei 0,5 kg zunimmt, hat einen Bedarf von etwa 2350 kcal, egal was
 * die Formel sagt. Genau das macht diese Datei.
 *
 * Der Umrechnungsfaktor: rund 7700 kcal je Kilogramm Körpermasse. Der Wert
 * geht auf Wishnofsky (1958) zurück und gilt für reines Körperfett. Er ist eine
 * grobe Näherung, weil Gewichtsänderungen immer auch Wasser, Glykogen und
 * Magermasse enthalten. Für eine Korrektur über vier Wochen reicht er, für
 * eine Aussage über einzelne Tage nicht. Deshalb liefert diese Datei erst ab
 * 14 Tagen ein Ergebnis und nennt immer die Zahl der Tage, auf der es beruht.
 */

const KCAL_PRO_KG = 7700;

/** Weniger Tage ergeben eine Steigung, die vom Wasserhaushalt bestimmt wird. */
const MIN_TAGE_TREND = 14;
/** Für eine Bedarfsschätzung braucht es zusätzlich genug Tage mit Einträgen. */
const MIN_TAGE_AUFNAHME = 10;

export interface TrendPunkt {
  /** Datum im Format JJJJ-MM-TT. */
  day: string;
  /** Gewicht in kg, oder null an Tagen ohne Messung. */
  weightKg?: number | null;
  /** Aufgenommene Kalorien, oder null an Tagen ohne Eintrag. */
  kcal?: number | null;
}

export interface GewichtsTrend {
  /** Steigung in kg je Woche. Negativ bedeutet abnehmen. */
  kgProWoche: number;
  /** Zahl der Messungen, auf denen die Gerade beruht. */
  messungen: number;
  /** Zeitraum in Tagen zwischen der ersten und der letzten Messung. */
  spanneTage: number;
  /** Geglättetes Gewicht am Ende des Zeitraums. */
  aktuellKg: number | null;
  /** Verlässlich genug, um darauf eine Empfehlung zu bauen. */
  belastbar: boolean;
}

/**
 * Legt eine Gerade durch die Gewichtsmessungen.
 *
 * Kleinste Quadrate über die Tage seit der ersten Messung. Das ist der übliche
 * Weg, aus schwankenden Tageswerten eine Richtung zu lesen. Das Gewicht
 * schwankt je nach Salz, Kohlenhydraten und Darminhalt um ein bis zwei Kilo,
 * ein Vergleich zweier einzelner Tage sagt deshalb nichts.
 */
export function weightTrend(punkte: TrendPunkt[]): GewichtsTrend {
  const messungen = punkte
    .filter((p) => typeof p.weightKg === "number" && Number.isFinite(p.weightKg))
    .map((p) => ({ tag: tagZahl(p.day), kg: p.weightKg as number }))
    .sort((a, b) => a.tag - b.tag);

  if (messungen.length < 2) {
    return {
      kgProWoche: 0,
      messungen: messungen.length,
      spanneTage: 0,
      aktuellKg: messungen[0]?.kg ?? null,
      belastbar: false,
    };
  }

  const erster = messungen[0]!.tag;
  const xs = messungen.map((m) => m.tag - erster);
  const ys = messungen.map((m) => m.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let zaehler = 0;
  let nenner = 0;
  for (let i = 0; i < n; i++) {
    zaehler += (xs[i]! - mx) * (ys[i]! - my);
    nenner += (xs[i]! - mx) ** 2;
  }
  const proTag = nenner === 0 ? 0 : zaehler / nenner;
  const spanneTage = xs[n - 1]! - xs[0]!;

  // Das geglättete aktuelle Gewicht ist der Wert der Geraden am letzten Tag,
  // nicht die letzte Messung. Eine einzelne Messung kann ein Ausreisser sein.
  const achsenabschnitt = my - proTag * mx;
  const aktuellKg = runde(achsenabschnitt + proTag * xs[n - 1]!, 1);

  return {
    kgProWoche: runde(proTag * 7, 2),
    messungen: n,
    spanneTage,
    aktuellKg,
    belastbar: n >= 4 && spanneTage >= MIN_TAGE_TREND,
  };
}

export interface BedarfsSchaetzung {
  /** Geschätzter tatsächlicher Verbrauch in kcal je Tag. */
  tdeeKcal: number | null;
  /** Durchschnittliche Aufnahme in den ausgewerteten Tagen. */
  schnittAufnahmeKcal: number;
  /** Zahl der Tage mit Einträgen. */
  tageMitEintrag: number;
  trend: GewichtsTrend;
  /** Warum es kein Ergebnis gibt, falls tdeeKcal null ist. */
  grund: string;
}

/**
 * Schätzt den tatsächlichen Kalorienverbrauch aus Aufnahme und Gewichtsverlauf.
 *
 * Verbrauch = durchschnittliche Aufnahme minus der Energie, die im Körper
 * gelandet oder aus ihm verschwunden ist.
 *
 * Diese Schätzung schlägt jede Formel, sobald genug Daten da sind. Sie hat
 * aber eine harte Voraussetzung: die Aufnahme muss ehrlich erfasst sein. Wer
 * die Hälfte nicht einträgt, bekommt einen zu niedrigen Bedarf heraus. Deshalb
 * wird die Zahl der Tage mit Eintrag immer mitgeliefert.
 */
export function estimateTdee(punkte: TrendPunkt[]): BedarfsSchaetzung {
  const trend = weightTrend(punkte);
  const mitEintrag = punkte.filter((p) => typeof p.kcal === "number" && (p.kcal as number) > 0);
  const schnitt = mitEintrag.length
    ? Math.round(mitEintrag.reduce((s, p) => s + (p.kcal as number), 0) / mitEintrag.length)
    : 0;

  if (!trend.belastbar) {
    return {
      tdeeKcal: null,
      schnittAufnahmeKcal: schnitt,
      tageMitEintrag: mitEintrag.length,
      trend,
      grund: `Für eine Korrektur brauche ich mindestens vier Wiegungen über ${MIN_TAGE_TREND} Tage. ` +
        `Bisher sind es ${trend.messungen} über ${trend.spanneTage} Tage.`,
    };
  }
  if (mitEintrag.length < MIN_TAGE_AUFNAHME) {
    return {
      tdeeKcal: null,
      schnittAufnahmeKcal: schnitt,
      tageMitEintrag: mitEintrag.length,
      trend,
      grund: `Der Gewichtsverlauf reicht, die Einträge nicht. ${mitEintrag.length} Tage mit Essen erfasst, ` +
        `nötig sind ${MIN_TAGE_AUFNAHME}.`,
    };
  }

  const kcalProTagAusSpeicher = (trend.kgProWoche * KCAL_PRO_KG) / 7;
  return {
    tdeeKcal: Math.round(schnitt - kcalProTagAusSpeicher),
    schnittAufnahmeKcal: schnitt,
    tageMitEintrag: mitEintrag.length,
    trend,
    grund: "",
  };
}

export interface Korrektur {
  /** Empfohlenes neues Tagesziel, oder null wenn nichts zu ändern ist. */
  neuesZielKcal: number | null;
  /** Unterschied zum bisherigen Ziel. */
  differenzKcal: number;
  /** Der Satz für den Nutzer. Enthält immer die Zahlen, auf denen er beruht. */
  begruendung: string;
}

/**
 * Vergleicht den gemessenen Verlauf mit dem Ziel und schlägt eine Korrektur vor.
 *
 * Erwartete Raten:
 * - Abnehmen: 0,5 bis 1,0 Prozent des Körpergewichts je Woche. Mehr kostet
 *   Muskeln, weniger dauert so lange, dass kaum jemand dabei bleibt.
 * - Aufbauen: 0,25 bis 0,5 Prozent je Woche. Mehr davon ist Fett.
 * - Halten: zwischen minus und plus 0,25 Prozent je Woche.
 *
 * Korrigiert wird erst, wenn die tatsächliche Rate deutlich daneben liegt.
 * Ein Ziel, das jede Woche verschoben wird, ist kein Ziel.
 */
export function targetCorrection(params: {
  schaetzung: BedarfsSchaetzung;
  goal: "fat_loss" | "maintain" | "lean_bulk";
  weightKg: number;
  aktuellesZielKcal: number;
}): Korrektur {
  const { schaetzung, goal, weightKg, aktuellesZielKcal } = params;
  if (schaetzung.tdeeKcal === null) {
    return { neuesZielKcal: null, differenzKcal: 0, begruendung: schaetzung.grund };
  }

  const istProWoche = schaetzung.trend.kgProWoche;
  const istProzent = (istProWoche / weightKg) * 100;
  const spanne = ZIEL_SPANNE[goal];

  const richtung = istProWoche === 0 ? "gleich" : istProWoche < 0 ? "runter" : "hoch";
  const basis =
    `Über ${schaetzung.trend.spanneTage} Tage: im Schnitt ${schaetzung.schnittAufnahmeKcal} kcal am Tag, ` +
    `Gewicht ${istProWoche > 0 ? "plus" : "minus"} ${Math.abs(istProWoche).toFixed(2)} kg die Woche ` +
    `(${istProzent.toFixed(2)} Prozent). Daraus ergibt sich ein Verbrauch von etwa ${schaetzung.tdeeKcal} kcal.`;

  if (istProzent >= spanne.min && istProzent <= spanne.max) {
    return {
      neuesZielKcal: null,
      differenzKcal: 0,
      begruendung: `${basis} Das liegt im erwarteten Bereich, ich lasse dein Ziel bei ${aktuellesZielKcal} kcal.`,
    };
  }

  // Das neue Ziel setzt an der Mitte der erwarteten Spanne an.
  const zielProzent = (spanne.min + spanne.max) / 2;
  const zielKgProWoche = (zielProzent / 100) * weightKg;
  const neuesZiel = Math.round((schaetzung.tdeeKcal + (zielKgProWoche * KCAL_PRO_KG) / 7) / 10) * 10;
  const differenz = neuesZiel - aktuellesZielKcal;

  if (Math.abs(differenz) < 100) {
    return {
      neuesZielKcal: null,
      differenzKcal: differenz,
      begruendung: `${basis} Die Abweichung ist mit ${Math.abs(differenz)} kcal zu klein, um daran zu drehen.`,
    };
  }

  return {
    neuesZielKcal: neuesZiel,
    differenzKcal: differenz,
    begruendung:
      `${basis} Erwartet wären ${spanne.min} bis ${spanne.max} Prozent die Woche, du liegst bei ` +
      `${istProzent.toFixed(2)}. Dein Gewicht geht ${richtung}. ` +
      `Neues Ziel: ${neuesZiel} kcal, also ${differenz > 0 ? "plus" : "minus"} ${Math.abs(differenz)}.`,
  };
}

/** Erwartete Gewichtsänderung je Woche, in Prozent des Körpergewichts. */
const ZIEL_SPANNE = {
  fat_loss: { min: -1.0, max: -0.4 },
  maintain: { min: -0.25, max: 0.25 },
  lean_bulk: { min: 0.2, max: 0.5 },
} as const;

/** Tage seit einem festen Bezugspunkt. Erlaubt Rechnen mit Datumsangaben. */
function tagZahl(iso: string): number {
  return Math.round(new Date(`${iso}T12:00:00Z`).getTime() / 86400000);
}

function runde(wert: number, stellen: number): number {
  const f = 10 ** stellen;
  return Math.round(wert * f) / f;
}
