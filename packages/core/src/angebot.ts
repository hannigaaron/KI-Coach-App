/**
 * Das Coaching Angebot des Betreibers.
 *
 * Die App ist ein Coach, aber sie ersetzt keinen Menschen. An den Stellen, an
 * denen ein Nutzer merkt, dass er allein nicht weiterkommt, gehört ein Weg zu
 * einer echten Person. Das ist der einzige Punkt, an dem die App etwas
 * verkauft, und deshalb steht er hier als eigenes Modul und nicht verstreut in
 * der Oberfläche.
 *
 * Alles ist konfigurierbar und nichts fest verdrahtet. Der Betreiber trägt
 * seinen Link ein, nicht der Code.
 */

export interface Trainingsplan {
  id: string;
  /** Name des Plans, wie er in der Liste steht. */
  name: string;
  /** Für wen der Plan ist. Ein Satz. */
  fuerWen: string;
  /** Wie viele Einheiten pro Woche. Für den Abgleich mit dem Nutzerprofil. */
  einheitenProWoche: number;
  /** Wohin der Plan verlinkt, etwa eine Trainings App. */
  url: string;
}

export interface Angebot {
  /** Der Name, unter dem der Coach auftritt. */
  coachName: string;
  /** Buchungslink für ein Erstgespräch. Leer heisst: kein Angebot anzeigen. */
  buchungUrl: string;
  /** Was beim Erstgespräch passiert. Ein bis zwei Sätze. */
  buchungText: string;
  plaene: Trainingsplan[];
  /** Aus. Für den Betreiber selbst, der sein eigenes Angebot nicht braucht. */
  aus?: boolean;
}

export const LEERES_ANGEBOT: Angebot = {
  coachName: "",
  buchungUrl: "",
  buchungText: "",
  plaene: [],
};

/**
 * Trackingparameter und Zustand aus einer Adresse entfernen.
 *
 * Ein aus der Werbung kopierter Link trägt `fbclid`, `gclid` und ähnliches mit
 * sich. Der schlimmere Fall ist `month`: Calendly öffnet den Kalender dann in
 * genau diesem Monat, und ein Link mit einem Monat aus der Vergangenheit zeigt
 * dem Nutzer einen leeren Kalender. Das sieht aus, als wäre nichts frei.
 */
const MUELL = [
  "fbclid", "gclid", "wbraid", "gbraid", "msclkid", "igshid", "ttclid",
  "month", "date", "back",
];

export function saubereUrl(roh: string): string {
  const text = roh.trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    // Nur https. Ein http Link in einer App ist ein Fehler, kein Angebot.
    if (url.protocol !== "https:") return "";
    for (const p of MUELL) url.searchParams.delete(p);
    for (const [k] of [...url.searchParams]) {
      if (k.startsWith("utm_") || k.startsWith("tw_")) url.searchParams.delete(k);
    }
    return url.toString().replace(/\?$/, "");
  } catch {
    return "";
  }
}

/** Ob überhaupt etwas anzuzeigen ist. */
export function hatAngebot(a: Angebot | null | undefined): boolean {
  if (!a || a.aus) return false;
  return Boolean(saubereUrl(a.buchungUrl)) || a.plaene.some((p) => saubereUrl(p.url));
}

/**
 * Der Plan, der am besten zum Nutzer passt.
 *
 * Verglichen wird die Zahl der Einheiten pro Woche. Wer dreimal trainiert,
 * bekommt keinen Fünfertag Plan vorgeschlagen: er bricht ihn ab und hält
 * danach seinen eigenen Plan für gescheitert.
 *
 * Bei gleichem Abstand gewinnt der kleinere Plan. Zu wenig Volumen bringt
 * langsamere Fortschritte, zu viel bringt gar keine, weil er nicht stattfindet.
 */
export function passenderPlan(plaene: Trainingsplan[], einheitenProWoche: number): Trainingsplan | null {
  const gueltig = plaene.filter((p) => saubereUrl(p.url));
  if (gueltig.length === 0) return null;
  if (!Number.isFinite(einheitenProWoche) || einheitenProWoche <= 0) return gueltig[0] ?? null;

  return gueltig.slice().sort((a, b) => {
    const da = Math.abs(a.einheitenProWoche - einheitenProWoche);
    const db = Math.abs(b.einheitenProWoche - einheitenProWoche);
    if (da !== db) return da - db;
    return a.einheitenProWoche - b.einheitenProWoche;
  })[0] ?? null;
}
