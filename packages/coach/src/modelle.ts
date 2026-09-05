import type { Modus } from "./persona.js";

/**
 * Welches Modell welche Nachricht beantwortet.
 *
 * Der Gedanke: nicht jede Nachricht ist gleich viel wert. "Zwei Eier gegessen"
 * ist Texterkennung mit einem Werkzeugaufruf. "Warum bin ich seit Wochen müde"
 * ist die Frage, für die jemand einen Coach bezahlt. Beides auf dem teuersten
 * Modell zu beantworten kostet fünfmal so viel und macht die erste Antwort
 * kein Stück besser.
 *
 * Gemessen an den echten Anfragegrössen der App, rund 6000 Token Eingabe je
 * Nachricht, kostet ein Tag mit acht Erfassungen, fünf Fachfragen und zwei
 * persönlichen Gesprächen:
 *   alles auf Opus      etwa 75 Cent
 *   nach dieser Tabelle etwa 35 Cent
 *
 * Zwei Dinge, die man dabei wissen muss:
 *
 * Der Zwischenspeicher gilt je Modell. Wer zwischen Modellen wechselt, hält
 * mehrere Speicher warm statt einen. Das kostet etwas von der Ersparnis
 * zurück, deutlich weniger als der Preisunterschied zwischen den Modellen
 * einbringt.
 *
 * Haiku 4.5 nimmt keine Angabe zur Denktiefe entgegen und lehnt sie mit einem
 * Fehler ab. Deshalb steht in der Tabelle, welches Modell das kann.
 */

export interface ModellWahl {
  id: string;
  /** Nimmt output_config.effort entgegen. Haiku 4.5 tut das nicht. */
  kannEffort: boolean;
  /** Für die Anzeige im Profil. */
  name: string;
}

export const MODELLE: Record<string, ModellWahl> = {
  "claude-opus-5": { id: "claude-opus-5", kannEffort: true, name: "Opus 5" },
  "claude-sonnet-5": { id: "claude-sonnet-5", kannEffort: true, name: "Sonnet 5" },
  "claude-haiku-4-5": { id: "claude-haiku-4-5", kannEffort: false, name: "Haiku 4.5" },
};

const OPUS = "claude-opus-5";
const SONNET = "claude-sonnet-5";
const HAIKU = "claude-haiku-4-5";

/**
 * Die Zuordnung.
 *
 * erfassen  Haiku. Eine Menge aus einem Satz lesen und ein Werkzeug rufen.
 *           Dafür braucht es kein teures Modell.
 * standard  Sonnet. Smalltalk soll trotzdem nach dem Coach klingen.
 * coaching  Sonnet. Fachfragen zu Training und Ernährung sitzen im Wissen,
 *           nicht in der Denktiefe.
 * psyche    Opus. Hier entscheidet sich, ob die App etwas wert ist. Wer bei
 *           Scham und Schuld spart, spart am einzigen Teil, der zählt.
 * planung   Opus. Geld und Zeit, Fehler kosten echtes Geld.
 */
export const MODELL_JE_MODUS: Record<Modus, string> = {
  erfassen: HAIKU,
  standard: SONNET,
  coaching: SONNET,
  psyche: OPUS,
  planung: OPUS,
};

/**
 * Bilder auswerten läuft immer auf Opus.
 *
 * Eine Mahlzeit aus einem Foto zu schätzen ist der Kern des Produkts, und der
 * Fehler landet direkt in den Tagesdaten. Ein Teller wird ein bis drei Mal am
 * Tag fotografiert, der Aufpreis fällt kaum ins Gewicht.
 */
export const MODELL_FUER_BILDER = OPUS;

/**
 * Wählt das Modell für eine Nachricht.
 *
 * `wahl` kommt aus den Einstellungen. "auto" folgt der Tabelle, jeder andere
 * gültige Wert gewinnt. So kann der Nutzer die Automatik jederzeit abstellen,
 * ohne dass jemand im Code etwas ändern muss.
 */
export function modellFuer(modus: Modus, wahl = "auto"): ModellWahl {
  if (wahl !== "auto" && MODELLE[wahl]) return MODELLE[wahl]!;
  return MODELLE[MODELL_JE_MODUS[modus]] ?? MODELLE[OPUS]!;
}

/** Modell für einen Bildaufruf, unter derselben Regel. */
export function modellFuerBilder(wahl = "auto"): ModellWahl {
  if (wahl !== "auto" && MODELLE[wahl]) return MODELLE[wahl]!;
  return MODELLE[MODELL_FUER_BILDER]!;
}

/** Was im Profil zur Auswahl steht. */
export const MODELL_OPTIONEN = [
  { wert: "auto", text: "Automatisch, je nach Frage" },
  { wert: OPUS, text: "Immer Opus 5, am schlausten und teuersten" },
  { wert: SONNET, text: "Immer Sonnet 5, guter Mittelweg" },
  { wert: HAIKU, text: "Immer Haiku 4.5, am günstigsten" },
];
