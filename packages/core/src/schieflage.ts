import type { Bereich, BereichStand } from "./balance.js";

/**
 * Die Schieflage im Life Balance Board.
 *
 * Das Board zeigt, wo die Zeit hingeht. Was es bisher nicht tat: den Stand
 * gegen das halten, was sich der Nutzer eigentlich vorgenommen hat, und sich
 * von selbst melden, wenn beides weit auseinanderläuft.
 *
 * Das Ziel steht schon da, als Wochenziele in Stunden je Bereich. Diese Datei
 * rechnet nur aus, ob die Abweichung gross genug ist, um etwas zu sagen.
 *
 * Der ganze Wert liegt in der Schwelle. Eine Erinnerung, die jede Woche kommt,
 * wird nach drei Wochen weggewischt, und mit ihr alle anderen Nachrichten der
 * App. Deshalb ist hier fast jede Zeile eine Bedingung, die sie verhindert.
 */

/**
 * Darunter ist es kein schwacher Zeitraum mehr, sondern ein Muster.
 *
 * Vierzig Prozent. Wer sich fünf Stunden Wellbeing vornimmt und zwei schafft,
 * hatte eine volle Woche. Wer eineinhalb schafft, hat es nicht vor.
 */
export const ZU_WENIG = 0.4;

/**
 * Darüber frisst ein Bereich die anderen auf.
 *
 * Hundertfünfzig Prozent. Über dem Ziel zu liegen ist für sich genommen kein
 * Fehler, und bei Fitness ist es meist keiner. Zur Meldung wird es erst,
 * wenn gleichzeitig woanders etwas fehlt, siehe unten.
 */
export const ZU_VIEL = 1.5;

/**
 * Ohne so viele Tage mit gemessener Zeit wird nichts gemeldet.
 *
 * Zehn. Darunter meldet die App eine Schieflage, die nur eine Lücke im
 * Eintragen ist, und das ist der sicherste Weg, jemandem das Board
 * abzugewöhnen.
 */
export const MIN_TAGE = 10;

/** So oft höchstens. Zweimal die Woche ist die Obergrenze, nicht das Ziel. */
export const ABSTAND_TAGE = 3;

/**
 * Das Fenster, über das gerechnet wird.
 *
 * Vier Wochen, und das steht auch im Text. Eine Woche ist eine
 * Momentaufnahme: wer eine harte Projektwoche hatte, hat kein Muster, sondern
 * eine harte Projektwoche. Der Zeitraum gehört in jeden Satz, sonst liest man
 * die Zahl als die von heute, besonders wenn darüber die Ansicht für heute
 * steht.
 */
export const FENSTER_TAGE = 28;

export interface SchieflagenLage {
  /** Die Bereiche über den Zeitraum, aus `balance()`. */
  bereiche: BereichStand[];
  /** Wie viele Tage im Zeitraum überhaupt gemessene Zeit hatten. */
  tageMitZeit: number;
  /** Heute, JJJJ-MM-TT. */
  heute: string;
  /** Wann zuletzt gemeldet wurde, JJJJ-MM-TT. */
  zuletztGemeldet?: string | null;
}

export interface Schieflage {
  /** Der Bereich, der am weitesten unter seinem Ziel liegt. */
  fehlt: { bereich: Bereich; name: string; anteil: number; minutenOffen: number };
  /** Der Bereich, der am weitesten darüber liegt, oder null. */
  frisst: { bereich: Bereich; name: string; anteil: number } | null;
  titel: string;
  text: string;
}

/**
 * Findet die Schieflage, oder null.
 *
 * Gemeldet wird nur, wenn etwas fehlt. Ein Bereich über seinem Ziel allein ist
 * keine Meldung wert: wer viel trainiert und sonst alles schafft, hat kein
 * Problem, sondern eine gute Woche. Erst die Kombination aus einem Bereich,
 * der leer bleibt, und einem, der überzieht, ist die Aussage, um die es geht.
 */
export function schieflageFinden(lage: SchieflagenLage): Schieflage | null {
  if (lage.tageMitZeit < MIN_TAGE) return null;

  if (lage.zuletztGemeldet) {
    const seit = tagIndex(lage.heute) - tagIndex(lage.zuletztGemeldet);
    if (seit < ABSTAND_TAGE) return null;
  }

  // Bereiche ohne Ziel bleiben aussen vor. Ein Ziel von null ist keine
  // Vorgabe, und ein Anteil, der durch null teilt, ist keine Zahl.
  const mitZiel = lage.bereiche.filter((b) => b.zielMinuten > 0);
  if (mitZiel.length < 2) return null;

  const schwaechster = mitZiel.reduce((a, b) => (b.anteil < a.anteil ? b : a));
  if (schwaechster.anteil >= ZU_WENIG) return null;

  const staerkster = mitZiel.reduce((a, b) => (b.anteil > a.anteil ? b : a));
  const frisst = staerkster.anteil > ZU_VIEL && staerkster.bereich !== schwaechster.bereich
    ? { bereich: staerkster.bereich, name: staerkster.name, anteil: staerkster.anteil }
    : null;

  const offen = Math.max(0, Math.round(schwaechster.zielMinuten - schwaechster.minuten));
  return {
    fehlt: {
      bereich: schwaechster.bereich,
      name: schwaechster.name,
      anteil: schwaechster.anteil,
      minutenOffen: offen,
    },
    frisst,
    ...schieflagenText(schwaechster.name, schwaechster.anteil, offen, frisst?.name ?? null),
  };
}

/**
 * Titel und Text.
 *
 * Eigene Funktion, weil der Worker sie beim Versand aufruft und dabei nur die
 * Zahlen hat, genau wie bei der Trainingslücke. Derselbe Text aus denselben
 * Zahlen, egal wer ihn baut.
 *
 * Der Text sagt nicht, was der Nutzer falsch macht. Er sagt, was er sich
 * vorgenommen hatte und wo er steht. Den Unterschied zieht er selbst, und
 * genau das ist der Punkt: die Zahl kommt von ihm, nicht von der App.
 */
export function schieflagenText(
  name: string,
  anteil: number,
  minutenOffen: number,
  frisst: string | null,
): { titel: string; text: string } {
  const prozent = Math.round(anteil * 100);
  const titel = `${name} bei ${prozent} Prozent`;
  const fehlt = minutenOffen >= 60
    ? `${Math.floor(minutenOffen / 60)} Stunden`
    : `${minutenOffen} Minuten`;
  const text = frisst
    ? `Über die letzten vier Wochen fehlen ${fehlt} auf das, was du dir vorgenommen hattest. `
      + `${frisst} liegt gleichzeitig weit darüber.`
    : `Über die letzten vier Wochen fehlen ${fehlt} auf das, was du dir vorgenommen hattest.`;
  return { titel, text };
}

function tagIndex(tagIso: string): number {
  const ms = Date.parse(`${tagIso}T00:00:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`Ungültiges Datum: ${tagIso}`);
  return Math.floor(ms / 86400000);
}
