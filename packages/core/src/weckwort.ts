import { foldUmlauts } from "./memory.js";

/**
 * Das Weckwort.
 *
 * "Hey daevo" im laufenden Text erkennen, damit der Nutzer sprechen kann,
 * ohne vorher auf das Mikrofon zu tippen. Beim Kochen, im Auto, zwischen zwei
 * Sätzen im Training: überall dort, wo das Handy daneben liegt und die Hände
 * beschäftigt sind.
 *
 * Der schwierige Teil ist nicht das Zuhören, sondern die Schreibweise. Die
 * Spracherkennung des Geräts kennt "daevo" nicht und schreibt, was für sie am
 * ehesten nach einem deutschen Wort klingt. Aus echten Mitschriften: David,
 * Davo, Devo, Dabo, Tävo. Ein Vergleich auf die richtige Schreibweise würde
 * fast nie treffen.
 *
 * Deshalb zwei Stufen: eine Liste der Varianten, die wirklich vorkommen, und
 * darunter ein Abstandsmass für alles, was noch kommt. Ein Name, den niemand
 * schreiben kann, muss trotzdem gehört werden.
 */

/** Was vor dem Namen stehen muss. Ohne Anrede ist es kein Weckruf. */
const ANREDEN = ["hey", "hallo", "hi", "he", "ey", "ok", "okay", "oke"];

/**
 * Schreibweisen, die die Spracherkennung wirklich produziert.
 *
 * "david" steht mit drin, weil es der häufigste Treffer ist. Es steht aber
 * nur mit Anrede davor: der Chef dieses Nutzers heisst David, und "ich hab
 * mit David gesprochen" darf kein Weckruf sein.
 */
const VARIANTEN = [
  "daevo", "davo", "devo", "dave", "david", "dabo", "debo", "deavo", "taevo",
  "tavo", "tevo", "dievo", "diavo", "davor", "daewoo", "dayvo", "deivo",
  "daivo",
];

/** Höchstabstand für eine unbekannte Schreibweise. Zwei Zeichen. */
const MAX_ABSTAND = 2;

export interface Weckruf {
  /** Das Weckwort kam vor. */
  erkannt: boolean;
  /** Was danach gesagt wurde. Leer, wenn nur der Name kam. */
  frage: string;
  /** Wie die Erkennung es geschrieben hat. Für die Fehlersuche. */
  gehoert?: string;
}

/**
 * Sucht das Weckwort im Text und gibt zurück, was danach kommt.
 *
 * Gesucht wird ab dem letzten Vorkommen. Wer zweimal ansetzt, meint den
 * zweiten Versuch: "Hey daevo, äh, hey daevo, wie viel Protein fehlt mir."
 */
export function weckwortGehoert(text: string): Weckruf {
  const worte = foldUmlauts(text.toLowerCase())
    .replace(/[.,!?;:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let stelle = -1;
  let gehoert = "";
  for (let i = 0; i < worte.length - 1; i++) {
    if (!ANREDEN.includes(worte[i] as string)) continue;
    const kandidat = worte[i + 1] as string;
    if (passt(kandidat)) {
      stelle = i + 2;
      gehoert = `${worte[i]} ${kandidat}`;
    }
  }

  if (stelle === -1) return { erkannt: false, frage: "" };

  // Die Frage aus dem Originaltext holen, nicht aus den gefalteten Worten:
  // sonst verliert sie Umlaute und Grossschreibung, und der Coach bekommt
  // "waere" statt "wäre".
  const frage = frageAusOriginal(text, worte.length - stelle);
  return { erkannt: true, frage, gehoert };
}

/** Passt das Wort auf eine der Schreibweisen. */
function passt(wort: string): boolean {
  if (VARIANTEN.includes(wort)) return true;
  // Zu kurze Wörter nicht über den Abstand prüfen: bei drei Zeichen und zwei
  // erlaubten Fehlern passt fast alles.
  if (wort.length < 4) return false;
  return VARIANTEN.some((v) => abstand(wort, v) <= MAX_ABSTAND);
}

/** Die letzten n Wörter des Originaltexts, mit Umlauten und Satzzeichen. */
function frageAusOriginal(text: string, anzahl: number): string {
  if (anzahl <= 0) return "";
  const roh = text.trim().split(/\s+/);
  return roh.slice(roh.length - anzahl).join(" ").replace(/^[,.\s]+/, "").trim();
}

/**
 * Levenshtein Abstand, also die Zahl der Änderungen von einem Wort zum
 * anderen. Klein gehalten: die Wörter hier sind nie länger als zehn Zeichen.
 */
function abstand(a: string, b: string): number {
  const zeile = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let vorige = zeile[0] as number;
    zeile[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const merk = zeile[j] as number;
      zeile[j] = a[i - 1] === b[j - 1]
        ? vorige
        : Math.min(vorige, zeile[j] as number, zeile[j - 1] as number) + 1;
      vorige = merk;
    }
  }
  return zeile[b.length] as number;
}
