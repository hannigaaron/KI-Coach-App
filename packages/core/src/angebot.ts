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
  /** Für wen der Plan gedacht ist. Ohne Angabe für alle. */
  fuerGeschlecht?: "male" | "female" | "alle";
  /** Erfahrungsstand. Ohne Angabe für alle. */
  niveau?: "anfaenger" | "fortgeschritten" | "alle";
  /**
   * Der Plan ist auf wenig Zeit ausgelegt. Solche Pläne werden aktiv
   * empfohlen, wenn die Lage des Nutzers danach aussieht, und nicht nur, wenn
   * er selbst danach fragt.
   */
  zeitsparend?: boolean;
}

export interface Angebot {
  /** Der Name, unter dem der Coach auftritt. */
  coachName: string;
  /** Mailadresse als zweiter Weg neben der Buchung. Optional. */
  email?: string;
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

/**
 * Die Lage des Nutzers, soweit die App sie misst.
 *
 * Alle Felder sind optional. Was nicht gemessen wurde, wird nicht behauptet,
 * und eine Empfehlung, die auf einem geratenen Stresslevel steht, ist keine
 * Empfehlung.
 */
export interface Lage {
  /** Stress aus dem letzten Check-in, 0 bis 100. */
  stress?: number;
  /** Freie Minuten am Tag, aus dem Kalender. */
  freieMinuten?: number;
  /** Anteile der Lebensbereiche an der gemessenen Zeit, 0 bis 1. */
  anteile?: { karriere?: number; beziehung?: number; fitness?: number };
  sex?: "male" | "female";
  /** Wie lange der Nutzer schon trainiert. Ohne Angabe unbekannt. */
  jahreTraining?: number;
  einheitenProWoche?: number;
}

/**
 * Ob die Lage für einen zeitsparenden Plan spricht, und warum.
 *
 * Drei Signale, von denen zwei reichen. Ein einzelnes ist zu wenig: wer eine
 * stressige Woche hat, braucht deswegen keinen neuen Trainingsplan. Wer über
 * Wochen hohen Stress, kaum freie Zeit und einen Alltag hat, der fast nur aus
 * Arbeit und Familie besteht, schafft einen Fünfertag Plan nicht, und ein Plan,
 * den man nicht schafft, ist schlimmer als keiner.
 *
 * Die Schwellen sind Produktentscheidungen und stehen deshalb sichtbar hier.
 */
export function braucheZeitsparend(lage: Lage): { ja: boolean; gruende: string[] } {
  const gruende: string[] = [];

  // Die Gründe sind Nebensätze mit dem Verb am Ende. Sie hängen an einem
  // "Weil", und "Weil dein Stresslevel liegt bei 78" ist kein Deutsch.
  if (typeof lage.stress === "number" && lage.stress >= 65) {
    gruende.push(`dein Stresslevel bei ${Math.round(lage.stress)} von 100 liegt`);
  }
  // Zwei Stunden freie Zeit am Tag klingen nach viel. Davon geht Essen,
  // Einkaufen, Weg und Haushalt ab, und was für Training bleibt, ist wenig.
  if (typeof lage.freieMinuten === "number" && lage.freieMinuten < 120) {
    gruende.push(`dir am Tag nur rund ${Math.round(lage.freieMinuten)} freie Minuten bleiben`);
  }
  const k = lage.anteile?.karriere ?? 0;
  const b = lage.anteile?.beziehung ?? 0;
  if (k + b >= 0.6) {
    gruende.push(`Arbeit und Familie ${Math.round((k + b) * 100)} Prozent deiner gemessenen Zeit ausmachen`);
  }

  return { ja: gruende.length >= 2, gruende };
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
  return planFuer(plaene, { einheitenProWoche })?.plan ?? null;
}

export interface PlanTreffer {
  plan: Trainingsplan;
  /**
   * Eigenschaften des Plans, etwa "für Fortgeschrittene". Kurze Stichworte,
   * die neben dem Umfang stehen.
   */
  passung: string[];
  /**
   * Fakten über die Lage des Nutzers, etwa "dein Stresslevel liegt bei 78".
   * Ganze Teilsätze, die zu einem Satz zusammengesetzt werden.
   *
   * Getrennt von der Passung, weil beides grammatisch nicht in einen Satz
   * passt: "Weil für Fortgeschrittene, dein Stresslevel liegt bei 78" ist
   * kein Deutsch.
   */
  lageGruende: string[];
  /** Der Plan wurde wegen der Lage empfohlen, nicht nur wegen des Umfangs. */
  wegenLage: boolean;
}

/** Aufzählung mit "und" vor dem letzten Glied. */
export function undListe(teile: string[]): string {
  if (teile.length === 0) return "";
  if (teile.length === 1) return teile[0]!;
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

/**
 * Der Plan, der zur Lage des Nutzers passt.
 *
 * Die Auswahl läuft über Punkte statt über eine Kette von Bedingungen. Bei vier
 * Plänen und drei Kriterien gäbe es sonst zwölf Fälle, von denen die Hälfte nie
 * geprüft wird.
 *
 * Geschlecht und Erfahrungsstand wiegen schwer: ein Plan für Anfängerinnen ist
 * für einen fortgeschrittenen Mann der falsche, egal wie gut die Anzahl der
 * Einheiten passt.
 */
export function planFuer(plaene: Trainingsplan[], lage: Lage): PlanTreffer | null {
  const gueltig = plaene.filter((p) => saubereUrl(p.url));
  if (gueltig.length === 0) return null;

  const zeit = braucheZeitsparend(lage);
  const niveau = niveauAus(lage);

  const bewertet = gueltig.map((p) => {
    let punkte = 0;
    const gruende: string[] = [];

    const g = p.fuerGeschlecht ?? "alle";
    if (lage.sex && g !== "alle") {
      if (g === lage.sex) punkte += 40;
      else punkte -= 60;
    }

    const n = p.niveau ?? "alle";
    if (niveau && n !== "alle") {
      if (n === niveau) { punkte += 30; gruende.push(niveau === "anfaenger" ? "für den Einstieg" : "für Fortgeschrittene"); }
      else punkte -= 40;
    }

    if (zeit.ja && p.zeitsparend) {
      punkte += 35;
      gruende.push("auf wenig Zeit ausgelegt");
    } else if (p.zeitsparend) {
      gruende.push("auf wenig Zeit ausgelegt");
    }

    // Der Umfang zählt weiter, aber schwächer als die Passung. Ein Unterschied
    // von einer Einheit kostet acht Punkte, von dreien vierundzwanzig.
    if (Number.isFinite(lage.einheitenProWoche) && (lage.einheitenProWoche ?? 0) > 0) {
      punkte -= Math.abs(p.einheitenProWoche - (lage.einheitenProWoche ?? 0)) * 8;
    }

    return { plan: p, punkte, gruende };
  });

  const bester = bewertet.sort((a, b) => b.punkte - a.punkte
    || a.plan.einheitenProWoche - b.plan.einheitenProWoche)[0];
  if (!bester) return null;

  const wegenLage = zeit.ja && Boolean(bester.plan.zeitsparend);
  return {
    plan: bester.plan,
    passung: bester.gruende,
    lageGruende: wegenLage ? zeit.gruende : [],
    wegenLage,
  };
}

/**
 * Anfänger oder fortgeschritten.
 *
 * Zwei Jahre sind die Grenze, und sie ist grob. Wer zwei Jahre ernsthaft
 * trainiert, hat die Grundübungen im Griff, und darum geht es bei der
 * Planauswahl. Ohne Angabe wird nichts angenommen, dann entscheiden die anderen
 * Kriterien.
 */
function niveauAus(lage: Lage): "anfaenger" | "fortgeschritten" | null {
  if (typeof lage.jahreTraining !== "number") return null;
  return lage.jahreTraining >= 2 ? "fortgeschritten" : "anfaenger";
}
