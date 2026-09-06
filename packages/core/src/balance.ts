import type { Termin } from "./ical.js";

/**
 * Das Life Balance Board.
 *
 * Fünf Bereiche, die zusammen ein Leben ergeben, und die Frage, wie viel Zeit
 * jeder davon wirklich bekommen hat. Nicht wie viel er bekommen sollte, nicht
 * wie es sich angefühlt hat: wie viele Minuten in Kalender und Einträgen
 * stehen.
 *
 * Der Grund für die Trennung: wer nur Kalorien und Training misst, optimiert
 * einen Ausschnitt und wundert sich, warum das Leben trotzdem schief steht.
 * Eine Woche mit 45 Stunden Kundenarbeit und null Stunden für sich selbst ist
 * eine schlechte Woche, auch wenn jedes Makroziel getroffen wurde.
 *
 * Was hier bewusst nicht passiert: es wird nichts geschätzt und nichts
 * unterstellt. Zeit, die nirgends steht, zählt nirgends. Ein Ring, der leer
 * bleibt, weil ein Termin keinen erkennbaren Titel hat, ist ein Hinweis auf
 * die Datenlage, nicht auf das Leben. Deshalb meldet die Auswertung immer mit,
 * wie viele Minuten sie nicht zuordnen konnte.
 */

export type Bereich = "karriere" | "fitness" | "wellbeing" | "me_time" | "beziehung";

export const BEREICHE: Bereich[] = ["karriere", "fitness", "wellbeing", "me_time", "beziehung"];

export const BEREICH_NAME: Record<Bereich, string> = {
  karriere: "Karriere",
  fitness: "Fitness",
  wellbeing: "Wellbeing",
  me_time: "Me Time",
  beziehung: "Familie und Beziehung",
};

/**
 * Woran ein Termin erkannt wird.
 *
 * Die Listen sind absichtlich kurz und eindeutig. Ein Wort, das in zwei
 * Bereichen vorkommen könnte, gehört in keinen von beiden: eine falsche
 * Zuordnung ist schlimmer als eine fehlende, weil sie eine Zahl erzeugt, der
 * man glaubt.
 *
 * Geprüft wird in dieser Reihenfolge, der erste Treffer gewinnt. Fitness steht
 * vor Karriere, weil "Training mit Kunde" für den Nutzer Arbeit ist, aber
 * "Krafttraining" nicht.
 */
const WORTE: { bereich: Bereich; worte: string[] }[] = [
  {
    bereich: "karriere",
    worte: [
      "kunde", "kundin", "coaching", "pt ", "personal training", "athletiktraining",
      "zirkeltraining", "probetraining", "beratung", "meeting", "besprechung", "call",
      "termin mit", "arbeit", "schicht", "buero", "büro", "studio", "dafits", "yan",
      "content", "reel", "dreh", "podcast", "akquise", "angebot", "konzept", "franchise",
      "rechnung", "buchhaltung", "steuer", "seminar", "fortbildung", "lehrgang",
    ],
  },
  {
    bereich: "fitness",
    worte: [
      "krafttraining", "gym", "volleyball", "workout", "laufen", "joggen", "schwimmen",
      "radfahren", "mobility", "beweglichkeit", "sport", "wettkampf", "spiel", "turnier",
    ],
  },
  {
    bereich: "wellbeing",
    worte: [
      "sauna", "massage", "physio", "therapie", "therapeut", "meditation", "atmung",
      "yoga", "spaziergang", "arzt", "regeneration", "eisbad", "schlaf", "nickerchen",
      "pause", "auszeit",
    ],
  },
  {
    bereich: "me_time",
    worte: [
      "lesen", "buch", "hobby", "musik", "gitarre", "kino", "serie", "gaming", "zocken",
      "kochen", "reise", "urlaub", "frei", "me time", "für mich", "fuer mich",
    ],
  },
  {
    bereich: "beziehung",
    worte: [
      "familie", "mama", "papa", "mutter", "vater", "schwester", "bruder", "eltern",
      "oma", "opa", "freundin", "freund", "date", "geburtstag", "hochzeit", "besuch",
      "essen mit", "treffen mit", "abendessen mit", "telefonat mit",
    ],
  },
];

/**
 * Ordnet einen Titel einem Bereich zu.
 *
 * Gibt null zurück, wenn nichts passt. Das ist der wichtigste Rückgabewert der
 * Funktion: nicht zuordnen zu können ist ein gültiges Ergebnis.
 */
export function bereichVon(titel: string): Bereich | null {
  const t = falte(titel);
  for (const gruppe of WORTE) {
    if (gruppe.worte.some((wort) => t.includes(falte(wort)))) return gruppe.bereich;
  }
  return null;
}

function falte(text: string): string {
  return text.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/** Wochenziele in Minuten. Vorschlag, kein Gesetz. Der Nutzer ändert sie. */
export const STANDARD_ZIELE: Record<Bereich, number> = {
  karriere: 40 * 60,
  fitness: 5 * 60,
  wellbeing: 5 * 60,
  me_time: 7 * 60,
  beziehung: 8 * 60,
};

export interface BalanceEingabe {
  /** Termine im Zeitraum. Ganztägige zählen nicht mit, sie haben keine Dauer. */
  termine: Termin[];
  /** Zusätzliche Minuten je Bereich aus Einträgen, etwa absolvierte Trainings. */
  zusatz?: Partial<Record<Bereich, number>>;
  /** Wochenziele in Minuten. Ohne Angabe die Vorschläge oben. */
  ziele?: Partial<Record<Bereich, number>>;
  /** Über wie viele Tage der Zeitraum geht. 1 für einen Tag, 7 für eine Woche. */
  tage: number;
}

export interface BereichStand {
  bereich: Bereich;
  name: string;
  /** Gemessene Minuten im Zeitraum. */
  minuten: number;
  /** Ziel für diesen Zeitraum, aus dem Wochenziel heruntergerechnet. */
  zielMinuten: number;
  /** Anteil am Ziel, 0 bis über 1. Nicht gedeckelt, damit man sieht, wer überzieht. */
  anteil: number;
  /** Anteil an der gesamten zugeordneten Zeit, 0 bis 1. */
  anteilAmTag: number;
}

export interface Balance {
  tage: number;
  bereiche: BereichStand[];
  /** Summe aller zugeordneten Minuten. */
  gesamtMinuten: number;
  /** Minuten aus Terminen, die keinem Bereich zugeordnet werden konnten. */
  nichtZugeordnet: number;
  /** Wie viele der fünf Bereiche überhaupt vorkamen. */
  abgedeckt: number;
}

export function balance(e: BalanceEingabe): Balance {
  const tage = Math.max(1, e.tage);
  const minuten: Record<Bereich, number> = {
    karriere: 0, fitness: 0, wellbeing: 0, me_time: 0, beziehung: 0,
  };
  let nichtZugeordnet = 0;

  for (const t of e.termine) {
    if (t.ganztags) continue;
    const dauer = Math.round((t.bis - t.von) / 60000);
    if (dauer <= 0) continue;
    const bereich = bereichVon(t.titel);
    if (bereich) minuten[bereich] += dauer;
    else nichtZugeordnet += dauer;
  }

  for (const bereich of BEREICHE) {
    minuten[bereich] += Math.max(0, Math.round(e.zusatz?.[bereich] ?? 0));
  }

  const gesamtMinuten = BEREICHE.reduce((s, b) => s + minuten[b], 0);

  const bereiche = BEREICHE.map<BereichStand>((bereich) => {
    const wochenziel = e.ziele?.[bereich] ?? STANDARD_ZIELE[bereich];
    const zielMinuten = Math.round((wochenziel / 7) * tage);
    return {
      bereich,
      name: BEREICH_NAME[bereich],
      minuten: minuten[bereich],
      zielMinuten,
      anteil: zielMinuten > 0 ? minuten[bereich] / zielMinuten : 0,
      anteilAmTag: gesamtMinuten > 0 ? minuten[bereich] / gesamtMinuten : 0,
    };
  });

  return {
    tage,
    bereiche,
    gesamtMinuten,
    nichtZugeordnet,
    abgedeckt: bereiche.filter((b) => b.minuten > 0).length,
  };
}

/* ---------- Wie gut war der Tag genutzt ---------- */

export interface TagesnutzungEingabe {
  /** Die Balance des Tages. */
  balance: Balance;
  /** Erledigte und geplante Aufgaben des Tages. */
  aufgabenErledigt: number;
  aufgabenGeplant: number;
  /** Gehaltene und vereinbarte Mindeststandards. */
  standardsGehalten: number;
  standardsGesamt: number;
  /** Der Ernährungswert des Tages, 0 bis 100, aus scoreDay. */
  ernaehrung: number;
}

export interface Tagesnutzung {
  /** 0 bis 100. */
  wert: number;
  /** Die vier Teile, jeder 0 bis 100. */
  teile: { name: string; wert: number; gewicht: number; erklaerung: string }[];
  /** Ein Satz, der den Wert einordnet. */
  satz: string;
}

/**
 * Wie gut der Tag genutzt wurde.
 *
 * Vier Teile, jeder für sich nachvollziehbar, mit einer Gewichtung, die eine
 * Produktentscheidung ist und keine Wissenschaft. Sie steht hier, damit man
 * sie sieht und ändern kann, statt sie zu erraten.
 *
 * Balance zählt am meisten, weil ein Tag, der nur aus Arbeit besteht, auch
 * dann kein guter Tag ist, wenn jede Aufgabe erledigt wurde. Genau das ist der
 * Unterschied zwischen einem Produktivitätswerkzeug und einem Coach.
 *
 * Ein niedriger Wert heisst nicht, dass jemand versagt hat. Er heisst, dass
 * ein Bereich zu kurz kam. Das steht auch im Satz dazu.
 */
export function tagesnutzung(e: TagesnutzungEingabe): Tagesnutzung {
  const abdeckung = Math.round((e.balance.abgedeckt / BEREICHE.length) * 100);
  const aufgaben = e.aufgabenGeplant > 0
    ? Math.round(Math.min(1, e.aufgabenErledigt / e.aufgabenGeplant) * 100)
    : 0;
  const standards = e.standardsGesamt > 0
    ? Math.round((e.standardsGehalten / e.standardsGesamt) * 100)
    : 0;

  // Ein Teil ohne Datenlage wird nicht mit null bewertet, sondern fällt raus,
  // und die übrigen Gewichte werden hochgerechnet. Wer keine Aufgaben geplant
  // hat, hat nichts falsch gemacht. Ihn dafür abzuwerten würde die Zahl
  // wertlos machen, weil sie dann Datenlage misst statt Verhalten.
  const kandidaten = [
    {
      name: "Balance",
      wert: abdeckung,
      gewicht: 0.4,
      zaehlt: true,
      erklaerung: `${e.balance.abgedeckt} von ${BEREICHE.length} Bereichen kamen heute vor.`,
    },
    {
      name: "Aufgaben",
      wert: aufgaben,
      gewicht: 0.25,
      zaehlt: e.aufgabenGeplant > 0,
      erklaerung: e.aufgabenGeplant > 0
        ? `${e.aufgabenErledigt} von ${e.aufgabenGeplant} geplanten Aufgaben erledigt.`
        : "Keine Aufgaben geplant. Zählt heute nicht mit.",
    },
    {
      name: "Standards",
      wert: standards,
      gewicht: 0.2,
      zaehlt: e.standardsGesamt > 0,
      erklaerung: e.standardsGesamt > 0
        ? `${e.standardsGehalten} von ${e.standardsGesamt} Standards gehalten.`
        : "Keine Standards vereinbart. Zählt heute nicht mit.",
    },
    {
      name: "Ernährung",
      wert: Math.max(0, Math.min(100, Math.round(e.ernaehrung))),
      gewicht: 0.15,
      zaehlt: true,
      erklaerung: "Kalorien, Protein und Wasser gegen die Tagesziele.",
    },
  ];

  const zaehlende = kandidaten.filter((t) => t.zaehlt);
  const summeGewicht = zaehlende.reduce((s, t) => s + t.gewicht, 0);
  const teile = kandidaten.map((t) => ({
    name: t.name,
    wert: t.wert,
    gewicht: t.zaehlt && summeGewicht > 0 ? Math.round((t.gewicht / summeGewicht) * 100) / 100 : 0,
    erklaerung: t.erklaerung,
  }));

  const wert = summeGewicht > 0
    ? Math.round(zaehlende.reduce((s, t) => s + t.wert * t.gewicht, 0) / summeGewicht)
    : 0;
  const schwaechster = teile.filter((t) => t.gewicht > 0).sort((a, b) => a.wert - b.wert)[0]
    ?? teile[0]!;

  return {
    wert,
    teile,
    // Der Satz nennt die Zahl einmal und dann nur noch, was sie erklärt.
    // Zweimal dieselbe Zahl in einem Satz liest sich wie ein Fehler.
    satz: wert >= 80
      ? `${wert} von 100. Der Tag lief rund. Am schwächsten war ${schwaechster.name}.`
      : wert >= 50
        ? `${wert} von 100. Schwächster Teil ist ${schwaechster.name}. ${schwaechster.erklaerung}`
        : `${wert} von 100. ${schwaechster.name} zieht den Tag nach unten. ${schwaechster.erklaerung}`,
  };
}

/* ---------- In Worten ---------- */

export function balanceText(b: Balance): string {
  const zeilen = [
    b.tage === 1
      ? `Heute zugeordnet: ${stunden(b.gesamtMinuten)} auf ${b.abgedeckt} von 5 Bereichen.`
      : `Über ${b.tage} Tage zugeordnet: ${stunden(b.gesamtMinuten)} auf ${b.abgedeckt} von 5 Bereichen.`,
  ];

  for (const s of b.bereiche.slice().sort((x, y) => y.minuten - x.minuten)) {
    zeilen.push(
      `- ${s.name}: ${stunden(s.minuten)} von ${stunden(s.zielMinuten)} Ziel, ` +
      `${Math.round(s.anteil * 100)} Prozent davon, ${Math.round(s.anteilAmTag * 100)} Prozent der zugeordneten Zeit.`,
    );
  }

  if (b.nichtZugeordnet > 0) {
    zeilen.push(
      `Nicht zugeordnet: ${stunden(b.nichtZugeordnet)}. Diese Termine haben keinen Titel, ` +
      "aus dem sich ein Bereich lesen lässt. Sie zählen nirgends mit.",
    );
  }

  const leer = b.bereiche.filter((s) => s.minuten === 0);
  if (leer.length > 0) {
    zeilen.push(`Ohne eine einzige Minute: ${leer.map((s) => s.name).join(", ")}.`);
  }

  return zeilen.join("\n");
}

function stunden(minuten: number): string {
  if (minuten === 0) return "0 Minuten";
  const h = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  if (h === 0) return m === 1 ? "1 Minute" : `${m} Minuten`;
  const stundenText = h === 1 ? "1 Stunde" : `${h} Stunden`;
  if (m === 0) return stundenText;
  return `${stundenText} ${m === 1 ? "1 Minute" : `${m} Minuten`}`;
}
