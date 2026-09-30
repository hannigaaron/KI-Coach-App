/**
 * Die Trainingslücke.
 *
 * Alle anderen Impulse hängen an keiner Zahl des Nutzers und können deshalb
 * blind vom Worker verschickt werden, siehe tagesimpulse.ts. Diese hier hängt
 * am Trainingslog, und das Trainingslog liegt auf dem Gerät. Deshalb erkennt
 * die App die Lücke und beauftragt den Worker, die Nachricht zu einer festen
 * Uhrzeit zu schicken. Der Worker erfährt dabei nur die Anzahl der Tage,
 * nicht die Trainings.
 *
 * Der Text wird trotzdem hier gebaut und nicht in der App, denn der Worker
 * baut ihn beim Versand ein zweites Mal aus derselben Zahl. Käme der Text vom
 * Gerät, wäre der Worker eine offene Stelle, über die sich beliebiger Text auf
 * einen fremden Sperrbildschirm schieben liesse.
 */

/**
 * Ab wie vielen Tagen ohne Training gefragt wird.
 *
 * Vier, weil "mehr als drei Tage" gefordert war. Drei Tage Pause sind bei
 * einem Plan mit drei bis vier Einheiten die Woche noch normal, etwa von
 * Freitag auf Montag. Ab dem vierten Tag ist es keine Wochenendpause mehr.
 */
export const LUECKE_AB_TAGEN = 4;

/**
 * So lange wird nach einer Frage nicht erneut gefragt.
 *
 * Ohne diese Sperre kommt bei einer zweiwöchigen Pause jeden Tag dieselbe
 * Frage. Eine Frage, die täglich kommt, wird weggewischt, und mit ihr alle
 * anderen Nachrichten der App.
 */
export const WIEDER_FRAGEN_NACH_TAGEN = 3;

/**
 * So weit wird zurückgeschaut, um das letzte Training zu finden.
 *
 * Findet sich in diesem Fenster kein einziges Training, wird nicht gefragt.
 * Die App weiss dann nicht, ob der Nutzer überhaupt trainiert, und eine Frage
 * nach einer Lücke setzt voraus, dass es vorher keine Lücke war.
 */
export const RUECKBLICK_TAGE = 60;

/** Wann die Nachricht rausgeht, lokale Berliner Zeit. */
export const LUECKE_UHRZEIT = "18:00";

/** Eine Antwort, die direkt in der Benachrichtigung gegeben werden kann. */
export interface Schnellantwort {
  /** Kennung für die Benachrichtigung. ASCII, weil sie gespeichert wird. */
  id: string;
  /** Beschriftung des Knopfes. Kurz, die Systeme schneiden hart ab. */
  label: string;
  /** Was als Antwort des Nutzers in die App geschrieben wird. */
  satz: string;
}

/**
 * Die Auswahl.
 *
 * Drei Gründe, die zusammen die häufigsten Fälle abdecken, und jeder führt zu
 * einer anderen Reaktion des Coaches. Keine Zeit heisst Planung, zu platt
 * heisst Regeneration, krank heisst gar nichts machen. Ein vierter Knopf
 * "Sonstiges" fehlt bewusst: wer etwas anderes sagen will, tippt auf die
 * Nachricht und schreibt es.
 *
 * Mehr als zwei Knöpfe zeigt nicht jedes System an. Die Reihenfolge ist
 * deshalb nach Häufigkeit sortiert, damit die ersten beiden die nützlichen
 * sind.
 */
export const LUECKEN_ANTWORTEN: Schnellantwort[] = [
  { id: "keine_zeit", label: "Keine Zeit", satz: "Es hat zeitlich nicht gereicht." },
  { id: "platt", label: "Zu platt", satz: "Ich war zu müde und ausgelaugt." },
  { id: "krank", label: "Krank oder verletzt", satz: "Ich war krank oder verletzt." },
];

export interface LueckenLage {
  /** Die Tage aus dem Speicher, Schlüssel JJJJ-MM-TT. */
  tage: Record<string, { trainings?: unknown[] } | undefined>;
  /** Heute, JJJJ-MM-TT. */
  heute: string;
  /** Wie viele Einheiten der Plan im Profil je Woche vorsieht. */
  geplanteEinheiten: number;
  /** Wann zuletzt nach dem Grund gefragt wurde, JJJJ-MM-TT. */
  zuletztGefragt?: string | null;
}

export interface Trainingsluecke {
  /** Volle Tage seit dem letzten Training. */
  tageOhne: number;
  /** Der Tag des letzten Trainings, JJJJ-MM-TT. */
  letztesTraining: string;
  titel: string;
  text: string;
  antworten: Schnellantwort[];
}

/**
 * Findet die Lücke, oder null.
 *
 * Null heisst in jedem Fall: nicht fragen. Die Gründe sind verschieden, das
 * Ergebnis ist dasselbe, und ein Aufrufer, der zwischen "keine Lücke" und
 * "zu wenig Daten" unterscheiden müsste, hätte davon nichts.
 */
export function trainingslueckeFinden(lage: LueckenLage): Trainingsluecke | null {
  if (lage.geplanteEinheiten < 1) return null;

  const heute = tagIndex(lage.heute);
  let letzter: string | null = null;
  for (let zurueck = 0; zurueck <= RUECKBLICK_TAGE; zurueck++) {
    const tag = tagAus(heute - zurueck);
    const eintraege = lage.tage[tag]?.trainings;
    if (Array.isArray(eintraege) && eintraege.length > 0) {
      letzter = tag;
      break;
    }
  }
  if (!letzter) return null;

  const tageOhne = heute - tagIndex(letzter);
  if (tageOhne < LUECKE_AB_TAGEN) return null;

  if (lage.zuletztGefragt) {
    const seitFrage = heute - tagIndex(lage.zuletztGefragt);
    if (seitFrage < WIEDER_FRAGEN_NACH_TAGEN) return null;
  }

  return {
    tageOhne,
    letztesTraining: letzter,
    ...lueckenText(tageOhne, lage.geplanteEinheiten, heute),
    antworten: LUECKEN_ANTWORTEN,
  };
}

/**
 * Titel und Text aus der Anzahl Tage.
 *
 * Eigene Funktion, weil der Worker sie beim Versand aufruft und dabei nur die
 * Zahl hat. Derselbe Text aus derselben Zahl, egal wer ihn baut.
 *
 * Die Frage lautet nie "warum hast du nicht trainiert". Das ist ein Vorwurf
 * und erzeugt eine Rechtfertigung. Gefragt wird nach dem, was dazwischen kam.
 */
export function lueckenText(
  tageOhne: number,
  geplanteEinheiten: number,
  tagFuerAuswahl: number = tagIndex(heuteIso()),
): { titel: string; text: string } {
  const titel = `${tageOhne} Tage ohne Training`;
  const texte = [
    "Was ist dazwischen gekommen?",
    "Woran hat es gelegen?",
    `Dein Plan steht auf ${geplanteEinheiten} Einheiten die Woche. Was hat gefehlt?`,
  ];
  return { titel, text: texte[Math.abs(tagFuerAuswahl) % texte.length] as string };
}

/** Tage seit dem 1. Januar 1970. Dieselbe Rechnung wie in tagesimpulse.ts. */
function tagIndex(tagIso: string): number {
  const ms = Date.parse(`${tagIso}T00:00:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`Ungültiges Datum: ${tagIso}`);
  return Math.floor(ms / 86400000);
}

function tagAus(index: number): string {
  return new Date(index * 86400000).toISOString().slice(0, 10);
}

function heuteIso(): string {
  return new Date().toISOString().slice(0, 10);
}
