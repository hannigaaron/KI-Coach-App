/**
 * Die Abendroutine und der Blick auf die letzten Nächte.
 *
 * Abends, 90 Minuten vor der Schlafenszeit des Tages, kommt die Mitteilung.
 * Ein Tipp darauf öffnet den Ablauf bis zum Schlafen mit Uhrzeiten und die
 * Stunden bis zum Wecker. Morgens stehen geplanter und tatsächlicher Schlaf
 * der letzten sieben Nächte nebeneinander, mit einem Tipp für heute Abend.
 *
 * Der Ablauf ist eine Regel von Coach Aaron, keine Studie. Gestützt ist nur
 * die Untergrenze: mindestens sieben Stunden Schlaf für Erwachsene, Watson
 * und andere, Konsens von AASM und SRS, Sleep 2015. Die übrigen Zeiten sind
 * Abstände, damit die Schritte nicht übereinanderliegen.
 */

/** Wie viele Minuten vor der Schlafenszeit die Mitteilung kommt. */
export const ABEND_VORLAUF_MIN = 90;

/** Untergrenze nach Watson und andere 2015, in Minuten. */
export const SCHLAF_MINDESTENS_MIN = 7 * 60;

export interface AbendSchritt {
  id: string;
  uhrzeit: string;
  titel: string;
  text: string;
}

export interface Abendplan {
  /** Uhrzeit der Mitteilung. */
  start: string;
  schlafenszeit: string;
  wecker: string;
  /** Minuten von der Schlafenszeit bis zum Wecker am Morgen danach. */
  schlafMinuten: number;
  schritte: AbendSchritt[];
}

const minuten = (u: string): number => {
  const [h = 0, m = 0] = u.split(":").map(Number);
  return h * 60 + m;
};

const uhrzeit = (m: number): string => {
  const t = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/** Minuten von der Schlafenszeit bis zum Wecker, über Mitternacht gerechnet. */
export function schlafDauer(schlafenszeit: string, wecker: string): number {
  const d = minuten(wecker) - minuten(schlafenszeit);
  return d <= 0 ? d + 1440 : d;
}

/** "7 h 45", "8 h", "31 min". */
export function stundenText(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

/**
 * Der Ablauf für einen Abend. `schlafenszeit` ist die dieses Tages, `wecker`
 * die Aufstehzeit des nächsten Tages: wer freitags spät ins Bett geht,
 * steht samstags anders auf als donnerstags.
 */
export function abendplan(schlafenszeit: string, wecker: string): Abendplan {
  const s = minuten(schlafenszeit);
  return {
    start: uhrzeit(s - ABEND_VORLAUF_MIN),
    schlafenszeit,
    wecker,
    schlafMinuten: schlafDauer(schlafenszeit, wecker),
    schritte: [
      { id: "handy", uhrzeit: uhrzeit(s - 60), titel: "Handy weg", text: "Bildschirm aus, das Handy ausserhalb vom Bett laden." },
      { id: "supplements", uhrzeit: uhrzeit(s - 55), titel: "Supplements nehmen", text: "Deine abendlichen Supplements." },
      { id: "lueften", uhrzeit: uhrzeit(s - 50), titel: "Zimmer lüften", text: "Fenster auf, kühl schläft es sich leichter ein." },
      { id: "licht", uhrzeit: uhrzeit(s - 45), titel: "Licht dimmen", text: "Nur noch warmes, gedimmtes Licht." },
      { id: "ruhe", uhrzeit: uhrzeit(s - 40), titel: "Lesen, Journal oder Meditation", text: "Was dich runterbringt, ohne Bildschirm." },
      { id: "schlafen", uhrzeit: schlafenszeit, titel: "Schlafen", text: `Wecker auf ${wecker}.` },
    ],
  };
}

/** Eine Nacht: geplant aus dem Profil, tatsächlich aus Apple Health oder dem Zubettgehen in der App. */
export interface Nacht {
  /** Der Abend, an dem die Nacht beginnt. */
  tag: string;
  geplantMin: number;
  /** null, wenn für diese Nacht nichts gemessen ist. */
  tatsaechlichMin: number | null;
  quelle: "health" | "app" | null;
  /** Minuten, die das Zubettgehen nach der geplanten Zeit lag, wenn bekannt. */
  spaeterMin: number | null;
}

export interface SchlafWoche {
  naechte: Nacht[];
  geplantSchnitt: number;
  tatsaechlichSchnitt: number | null;
  gemessen: number;
  /** Tatsächlich minus geplant, im Schnitt der gemessenen Nächte. */
  abweichung: number | null;
  tipp: string;
}

const schnitt = (z: number[]): number => Math.round(z.reduce((a, b) => a + b, 0) / z.length);

/**
 * Fasst die Nächte zusammen und wählt einen Tipp. Genannt wird nur, was
 * gemessen ist: ohne gemessene Nacht gibt es keinen Vergleich, nur den Plan.
 */
export function schlafWoche(naechte: Nacht[]): SchlafWoche {
  const geplantSchnitt = naechte.length ? schnitt(naechte.map((n) => n.geplantMin)) : 0;
  const gemessene = naechte.filter((n) => n.tatsaechlichMin !== null);
  const tatsaechlichSchnitt = gemessene.length ? schnitt(gemessene.map((n) => n.tatsaechlichMin as number)) : null;
  const abweichung = gemessene.length
    ? schnitt(gemessene.map((n) => (n.tatsaechlichMin as number) - n.geplantMin))
    : null;
  const spaet = naechte.filter((n) => n.spaeterMin !== null).map((n) => n.spaeterMin as number);
  const spaetSchnitt = spaet.length >= 2 ? schnitt(spaet) : null;

  let tipp: string;
  if (geplantSchnitt && geplantSchnitt < SCHLAF_MINDESTENS_MIN) {
    tipp = `Dein Plan selbst gibt dir nur ${stundenText(geplantSchnitt)}. Empfohlen sind mindestens 7 Stunden. Leg deine Schlafenszeit 30 Minuten früher.`;
  } else if (spaetSchnitt !== null && spaetSchnitt >= 20) {
    tipp = `Du gehst im Schnitt ${spaetSchnitt} Minuten später ins Bett als geplant. Leg heute das Handy schon bei der Mitteilung weg, nicht erst eine halbe Stunde später.`;
  } else if (abweichung !== null && abweichung <= -45) {
    tipp = `Dir fehlen im Schnitt ${stundenText(-abweichung)} je Nacht. Heute Abend zählt ein Schritt: um die geplante Zeit im Bett, das Handy nicht im Schlafzimmer.`;
  } else if (abweichung !== null) {
    tipp = "Du schläfst ungefähr so, wie du es dir vorgenommen hast. Bleib heute Abend bei deinem Ablauf.";
  } else {
    tipp = "Für die letzten Nächte ist kein Schlaf gemessen. Mit Apple Health oder dem Knopf \"Ich geh jetzt schlafen\" am Abend siehst du hier, wie es wirklich war.";
  }
  return { naechte, geplantSchnitt, tatsaechlichSchnitt, gemessen: gemessene.length, abweichung, tipp };
}

/** Wie viele Minuten `ist` nach `soll` liegt, um Mitternacht herum gerechnet, zwischen -12 und +12 Stunden. */
export function spaeterAls(soll: string, ist: string): number {
  let d = minuten(ist) - minuten(soll);
  if (d > 720) d -= 1440;
  if (d < -720) d += 1440;
  return d;
}
