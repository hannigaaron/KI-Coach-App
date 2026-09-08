/**
 * Die beiden festen Check-ins der Woche.
 *
 * Mittwoch ist die Mitte. Wer erst sonntags merkt, dass die Woche schieflief,
 * kann nichts mehr ändern. Der Mittwochs Check-in fragt Zahlen ab, die sich
 * noch drehen lassen: Energie, Stress, Schlaf, Motivation. Er endet mit einer
 * Frage, die weh tut, und einem Fokus für den Rest der Woche.
 *
 * Sonntagabend ist der Rückblick. Dort stehen keine Stellschrauben mehr,
 * sondern Fragen nach Stolz, Dankbarkeit, Reue und dem, was hängen geblieben
 * ist. Zahlen kommen dort nur als Rahmen dazu.
 *
 * Die Fragen stammen aus den Fragebögen, die der Nutzer bisher ausserhalb der
 * App geführt hat. Sie werden hier nicht verbessert, sondern übernommen: ein
 * Fragebogen, den jemand über Monate benutzt hat, ist erprobter als einer, den
 * sich eine App ausdenkt.
 */

export type FrageTyp = "zahl" | "auswahl" | "text" | "jaNein" | "dauer" | "mehrfach";

export interface Frage {
  id: string;
  text: string;
  typ: FrageTyp;
  /** Kurzer Zusatz unter der Frage. */
  hinweis?: string;
  pflicht: boolean;
  /** Für "zahl": Grenzen und Beschriftung der Enden. */
  min?: number;
  max?: number;
  vonWort?: string;
  bisWort?: string;
  /** Für "auswahl" und "mehrfach". */
  optionen?: string[];
}

export interface CheckinBogen {
  id: "mitte" | "woche";
  titel: string;
  einleitung: string;
  /** Wochentag wie bei `Date.getDay()`. */
  wochentag: number;
  /** Uhrzeit HH:MM, zu der erinnert wird. */
  uhrzeit: string;
  fragen: Frage[];
}

/**
 * Mittwoch, Mitte der Woche.
 *
 * Alle Fragen sind Pflicht. Das ist Absicht und kommt aus dem Original: ein
 * Check-in mit Lücken taugt nicht für einen Verlauf, und der Verlauf ist der
 * ganze Zweck.
 */
export const CHECKIN_MITTE: CheckinBogen = {
  id: "mitte",
  titel: "Mitte der Woche",
  einleitung: "Elf Fragen, zwei Minuten. Danach weisst du, ob die Woche noch zu drehen ist.",
  wochentag: 3,
  uhrzeit: "18:00",
  fragen: [
    { id: "energie", text: "Energielevel", typ: "zahl", min: 1, max: 5, vonWort: "leer", bisWort: "voll da", pflicht: true },
    { id: "laune", text: "Laune", typ: "auswahl", optionen: ["Gut", "Mittel", "Schlecht"], pflicht: true },
    { id: "stress", text: "Stresslevel", typ: "zahl", min: 0, max: 100, vonWort: "0 Prozent", bisWort: "100 Prozent", pflicht: true },
    {
      id: "motivation", text: "Motivation und Lust fürs Training", typ: "auswahl",
      optionen: ["1 Kein Bock", "2", "3", "4", "5 Eskalation"], pflicht: true,
    },
    { id: "schlafdauer", text: "Schlafdauer", typ: "dauer", hinweis: "Stunden und Minuten", pflicht: true },
    {
      id: "schlafqualitaet", text: "Schlafqualität", typ: "auswahl",
      optionen: ["1 Schlecht", "2", "3", "4", "5 Super ausgeruht"], pflicht: true,
    },
    { id: "schmerzen", text: "Schmerzen", typ: "text", hinweis: "Wo, wie stark, seit wann. Nichts ist auch eine Antwort.", pflicht: true },
    {
      id: "ernaehrung", text: "Wie schätzt du deine Ernährung der letzten Tage ein?",
      typ: "zahl", min: 1, max: 10, vonWort: "schlecht", bisWort: "top", pflicht: true,
    },
    {
      id: "zielKurs", text: "Ehrliche Frage an dich selbst: Erreichst du dein Ziel, wenn du so weiter machst?",
      typ: "jaNein", pflicht: true,
    },
    {
      id: "umgesetzt", text: "Besprochenes umgesetzt", typ: "zahl", min: 0, max: 100,
      vonWort: "0 Prozent", bisWort: "100 Prozent", pflicht: true,
    },
    { id: "fokus", text: "Fokus auf die Restwoche", typ: "text", hinweis: "Eine Sache, nicht fünf.", pflicht: true },
  ],
};

/**
 * Sonntagabend, Rückblick.
 *
 * Hier ist fast nichts Pflicht. Ein Rückblick, der einen zwingt, etwas über
 * Dankbarkeit zu schreiben, wird nicht ehrlich beantwortet, sondern abgehakt.
 */
export const CHECKIN_WOCHE: CheckinBogen = {
  id: "woche",
  titel: "Rückblick auf die Woche",
  einleitung: "Kein Test. Was dir zu einer Frage nichts einfällt, lässt du leer.",
  wochentag: 0,
  uhrzeit: "19:30",
  fragen: [
    { id: "dreiWorte", text: "Diese Woche in drei Worten", typ: "text", pflicht: false },
    { id: "stolz", text: "Worauf bist du diese Woche stolz?", typ: "text", pflicht: false },
    { id: "dankbar", text: "Wofür bist du dankbar diese Woche?", typ: "text", pflicht: false },
    { id: "gluecklich", text: "Was hat dich besonders glücklich gemacht?", typ: "text", pflicht: false },
    { id: "beschaeftigt", text: "Was hat dich diese Woche beschäftigt?", typ: "text", pflicht: false },
    { id: "bereut", text: "Was bereust du, diese Woche nicht getan zu haben?", typ: "text", pflicht: false },
    { id: "besser", text: "Was hättest du diese Woche besser machen können?", typ: "text", pflicht: false },
    {
      id: "gewohnheiten", text: "Welche Gewohnheiten kannst du noch verbessern?", typ: "mehrfach",
      optionen: [
        "Schlafenszeit", "Handy am Abend", "Handy am Morgen", "Aufschieben",
        "Pünktlichkeit", "Trainingsroutine", "Essen unterwegs", "Pausen machen",
        "Nein sagen", "Zeit für mich",
      ],
      pflicht: false,
    },
    { id: "trainings", text: "Wie oft hast du trainiert?", typ: "zahl", min: 0, max: 14, pflicht: false },
    {
      id: "ernaehrung", text: "Wie schätzt du deine Ernährung der letzten Tage ein?",
      typ: "zahl", min: 1, max: 10, vonWort: "schlecht", bisWort: "top", pflicht: false,
    },
    {
      id: "energieFrueh", text: "Wie ist dein Energielevel nach dem Frühstück?",
      typ: "zahl", min: 1, max: 10, vonWort: "leer", bisWort: "voll da", pflicht: false,
    },
    {
      id: "energieJetzt", text: "Wie ist dein Energielevel gerade jetzt?",
      typ: "zahl", min: 1, max: 10, vonWort: "leer", bisWort: "voll da", pflicht: false,
    },
    {
      id: "produktiv", text: "Wie produktiv war deine Woche?",
      typ: "zahl", min: 1, max: 10, vonWort: "gar nicht", bisWort: "sehr", pflicht: false,
    },
    { id: "dreiDinge", text: "Diese drei Dinge will ich verbessern", typ: "text", pflicht: false },
    { id: "gelernt", text: "Das habe ich über mich gelernt", typ: "text", pflicht: false },
    { id: "gedanken", text: "Gedanken an mich selbst", typ: "text", pflicht: false },
    { id: "ziel", text: "Das will ich erreichen", typ: "text", hinweis: "Remember your goals.", pflicht: false },
  ],
};

export const CHECKIN_BOEGEN = [CHECKIN_MITTE, CHECKIN_WOCHE];

export function bogenFuer(id: string): CheckinBogen | null {
  return CHECKIN_BOEGEN.find((b) => b.id === id) ?? null;
}

/** Welcher Bogen an diesem Wochentag ansteht. Null an allen anderen Tagen. */
export function bogenAmTag(wochentag: number): CheckinBogen | null {
  return CHECKIN_BOEGEN.find((b) => b.wochentag === wochentag) ?? null;
}

export interface CheckinAntwort {
  bogen: "mitte" | "woche";
  /** Datum JJJJ-MM-TT. */
  tag: string;
  /** Antworten je Frage. Fehlende Schlüssel heissen "nicht beantwortet". */
  werte: Record<string, string | number | boolean | string[]>;
}

/**
 * Der Text, den der Coach zu lesen bekommt.
 *
 * Nur beantwortete Fragen. Eine Liste mit "keine Angabe" bei zwölf von achtzehn
 * Fragen sagt dem Modell nichts und kostet Token.
 */
export function checkinText(antwort: CheckinAntwort): string {
  const bogen = bogenFuer(antwort.bogen);
  if (!bogen) return "";
  const zeilen: string[] = [`${bogen.titel}, ${antwort.tag}:`];

  for (const frage of bogen.fragen) {
    const wert = antwort.werte[frage.id];
    if (wert === undefined || wert === "" || (Array.isArray(wert) && wert.length === 0)) continue;
    zeilen.push(`- ${frage.text} ${formatWert(frage, wert)}`);
  }
  return zeilen.length > 1 ? zeilen.join("\n") : `${bogen.titel}, ${antwort.tag}: nichts ausgefüllt.`;
}

function formatWert(frage: Frage, wert: string | number | boolean | string[]): string {
  if (typeof wert === "boolean") return wert ? "Ja" : "Nein";
  if (Array.isArray(wert)) return wert.join(", ");
  if (frage.typ === "dauer" && typeof wert === "number") {
    const h = Math.floor(wert / 60);
    const m = wert % 60;
    return m === 0 ? `${h} Stunden` : `${h} Stunden ${m} Minuten`;
  }
  if (frage.typ === "zahl" && typeof wert === "number" && frage.max !== undefined) {
    return `${wert} von ${frage.max}`;
  }
  return String(wert);
}

/**
 * Was sich seit dem letzten gleichen Bogen verändert hat.
 *
 * Ein einzelner Check-in ist eine Momentaufnahme und sagt wenig. Erst der
 * Vergleich mit der Vorwoche macht daraus eine Aussage. Verglichen werden nur
 * Zahlen, und nur wenn beide Seiten sie haben.
 */
export function checkinVergleich(jetzt: CheckinAntwort, vorher?: CheckinAntwort): string[] {
  if (!vorher || vorher.bogen !== jetzt.bogen) return [];
  const bogen = bogenFuer(jetzt.bogen);
  if (!bogen) return [];

  const out: string[] = [];
  for (const frage of bogen.fragen) {
    if (frage.typ !== "zahl" && frage.typ !== "dauer") continue;
    const a = jetzt.werte[frage.id];
    const b = vorher.werte[frage.id];
    if (typeof a !== "number" || typeof b !== "number") continue;
    const diff = a - b;
    if (diff === 0) continue;
    // Bei Skalen bis 10 ist ein Punkt Unterschied Rauschen, bei Prozent nicht.
    const schwelle = (frage.max ?? 10) > 20 ? 10 : 1;
    if (Math.abs(diff) < schwelle) continue;
    const richtung = diff > 0 ? "hoch" : "runter";
    out.push(`${frage.text}: ${b} auf ${a}, also ${richtung}.`);
  }
  return out;
}
