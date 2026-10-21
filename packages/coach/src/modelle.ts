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
 * Nachricht, kostete ein Tag mit acht Erfassungen, fünf Fachfragen und zwei
 * persönlichen Gesprächen auf der Generation davor:
 *   alles auf Opus      etwa 75 Cent
 *   nach dieser Tabelle etwa 35 Cent
 * Seit Oktober 2026 laufen Opus 5.5, Sonnet 5.5 und Haiku 5.5. Opus ist 20
 * Prozent billiger als Opus 5, Haiku kostet ein Zehntel von Haiku 4.5.
 *
 * Drei Dinge, die man dabei wissen muss:
 *
 * Der Zwischenspeicher gilt je Modell. Wer zwischen Modellen wechselt, hält
 * mehrere Speicher warm statt einen. Das kostet etwas von der Ersparnis
 * zurück, deutlich weniger als der Preisunterschied zwischen den Modellen
 * einbringt.
 *
 * Opus 5.5 und Sonnet 5.5 lehnen ein erzwungenes Werkzeug ab, `tool_choice`
 * mit `tool` oder `any` gibt Status 400. Haiku 5.5 nimmt es an. Gemessen am
 * Worker am 21. Oktober 2026. Deshalb steht in der Tabelle, wer es kann.
 *
 * Alle drei denken immer, auch ohne Angabe. Gesteuert wird nur über effort,
 * und die Grundstufe ist bei Opus 5.5 und Haiku 5.5 medium, bei Sonnet 5.5
 * high. Deshalb schickt die App die Stufe immer ausdrücklich mit.
 */

export interface ModellWahl {
  id: string;
  /** Nimmt output_config.effort entgegen. Haiku 4.5 tat das nicht. */
  kannEffort: boolean;
  /** Nimmt ein erzwungenes Werkzeug an, `tool_choice: { type: "tool" }`. */
  kannErzwingen: boolean;
  /** Für die Anzeige im Profil. */
  name: string;
}

export const MODELLE: Record<string, ModellWahl> = {
  "claude-opus-5-5": { id: "claude-opus-5-5", kannEffort: true, kannErzwingen: false, name: "Opus 5.5" },
  "claude-sonnet-5-5": { id: "claude-sonnet-5-5", kannEffort: true, kannErzwingen: false, name: "Sonnet 5.5" },
  "claude-haiku-5-5": { id: "claude-haiku-5-5", kannEffort: true, kannErzwingen: true, name: "Haiku 5.5" },
};

export const OPUS = "claude-opus-5-5";
export const SONNET = "claude-sonnet-5-5";
export const HAIKU = "claude-haiku-5-5";

/**
 * Gespeicherte Werte aus der Generation davor.
 *
 * Wer im Profil "Immer Opus 5" gewählt hatte, hat `claude-opus-5` in den
 * Einstellungen stehen. Ohne diese Tabelle fiele die Wahl nach dem Update
 * still auf Automatisch zurück, und der Nutzer merkt es nicht.
 */
const NACHFOLGER: Record<string, string> = {
  "claude-opus-5": OPUS,
  "claude-opus-4-8": OPUS,
  "claude-sonnet-5": SONNET,
  "claude-haiku-4-5": HAIKU,
};

/** Die aktuelle Kennung zu einer gespeicherten. Unbekanntes bleibt, wie es ist. */
export function aktuellesModell(id: string): string {
  return NACHFOLGER[id] ?? id;
}

/** Die Eigenschaften eines Modells, auch unter einer alten Kennung. */
export function modellInfo(id: string): ModellWahl | undefined {
  return MODELLE[aktuellesModell(id)];
}

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
  if (wahl !== "auto" && modellInfo(wahl)) return modellInfo(wahl)!;
  return MODELLE[MODELL_JE_MODUS[modus]] ?? MODELLE[OPUS]!;
}

/** Modell für einen Bildaufruf, unter derselben Regel. */
export function modellFuerBilder(wahl = "auto"): ModellWahl {
  if (wahl !== "auto" && modellInfo(wahl)) return modellInfo(wahl)!;
  return MODELLE[MODELL_FUER_BILDER]!;
}

/** Was im Profil zur Auswahl steht. */
export const MODELL_OPTIONEN = [
  { wert: "auto", text: "Automatisch, je nach Frage" },
  { wert: OPUS, text: "Immer Opus 5.5, am schlausten und teuersten" },
  { wert: SONNET, text: "Immer Sonnet 5.5, guter Mittelweg" },
  { wert: HAIKU, text: "Immer Haiku 5.5, am günstigsten" },
];
