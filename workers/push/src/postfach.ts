import type { KVNamespace } from "./umgebung.js";

/**
 * Das Postfach.
 *
 * Es gibt einen Grund, warum es das gibt, und der ist eine Grenze von iOS:
 * eine Adresse öffnet dort immer Safari, nie die App vom Homebildschirm.
 * Beide haben getrennte Speicher, und die Daten des Nutzers liegen in der
 * App. Ein Siri Kurzbefehl, der eine Adresse öffnet, landet also in einer
 * leeren daevo. Die Aktion "App öffnen" wiederum führt Webapps nicht auf.
 *
 * Also der Umweg: der Kurzbefehl legt den Satz hier ab, der Worker schickt
 * eine Push Nachricht, und ein Tipp darauf öffnet die installierte App. Die
 * holt den Satz ab und löscht ihn.
 *
 * Bewusst kein Datenabgleich. Auf dem Server liegt nur der eine Satz, und nur
 * so lange, bis er abgeholt ist. Gewicht, Gespräche, Notizen über Therapie
 * und Familie bleiben auf dem Gerät. Ein Postfach hat ausserdem kein
 * Konfliktproblem: es gibt nur eine Richtung.
 */

const PRAEFIX = "post:";

/**
 * Nach dieser Zeit verfällt ein Eintrag von selbst.
 *
 * Eine Stunde, weil ein Satz, der länger liegt, nicht mehr in den Tag passt,
 * für den er gedacht war. "Ich hab gerade gegessen" ist morgen früh falsch.
 * Cloudflare räumt abgelaufene Einträge selbst weg, es braucht keinen Cron.
 */
export const POSTFACH_TTL_S = 3600;

/** Mehr als das nimmt kein Postfach an. Ein Diktat ist keine Textwand. */
export const MAX_ZEICHEN = 2000;

/**
 * Höchstens so viele offene Einträge.
 *
 * Wer fünfmal spricht, ohne die App zu öffnen, hat fünf Einträge. Danach wird
 * abgewiesen statt der älteste verworfen: ein stilles Verwerfen sieht aus wie
 * ein verlorener Satz, und der Nutzer sucht den Fehler bei sich.
 */
export const MAX_OFFEN = 10;

export interface Posten {
  /** Der Schlüssel im Speicher. Die App schickt ihn beim Abholen zurück. */
  id: string;
  text: string;
  /** Wann er abgelegt wurde, in Millisekunden. */
  at: number;
}

/**
 * Legt einen Satz ab.
 *
 * Der Schlüssel trägt die Zeit voran, damit die Liste in der Reihenfolge des
 * Sprechens zurückkommt. KV sortiert nach Schlüsselnamen, und eine Zeit als
 * Text sortiert nur dann richtig, wenn sie auf gleiche Länge aufgefüllt ist.
 */
export async function postAblegen(kv: KVNamespace, text: string): Promise<Posten> {
  const sauber = text.trim().slice(0, MAX_ZEICHEN);
  if (!sauber) throw new Error("Ohne Text kein Eintrag.");

  const offen = await postAbholen(kv, { loeschen: false });
  if (offen.length >= MAX_OFFEN) {
    throw new Error(`Im Postfach liegen schon ${offen.length} Sätze. Öffne daevo und hol sie ab.`);
  }

  const at = Date.now();
  const id = `${PRAEFIX}${String(at).padStart(14, "0")}-${zufall()}`;
  await kv.put(id, JSON.stringify({ text: sauber, at }), { expirationTtl: POSTFACH_TTL_S });
  return { id, text: sauber, at };
}

/**
 * Holt die offenen Sätze.
 *
 * Mit `loeschen` in einem Durchgang: gelesen und weg. Das ist der Normalfall,
 * denn ein Satz, den die App verarbeitet hat, darf beim nächsten Öffnen nicht
 * nochmal erscheinen. Ohne `loeschen` nur zum Zählen.
 *
 * Ein Eintrag, der sich nicht lesen lässt, wird weggeräumt statt übersprungen.
 * Sonst bleibt er liegen, zählt gegen die Obergrenze und blockiert das
 * Postfach, bis die Stunde um ist.
 */
export async function postAbholen(
  kv: KVNamespace,
  { loeschen = true }: { loeschen?: boolean } = {},
): Promise<Posten[]> {
  const { keys } = await kv.list({ prefix: PRAEFIX, limit: MAX_OFFEN });
  const raus: Posten[] = [];
  for (const { name } of keys) {
    const roh = await kv.get(name);
    if (!roh) continue;
    let daten: { text?: string; at?: number };
    try {
      daten = JSON.parse(roh) as { text?: string; at?: number };
    } catch {
      await kv.delete(name);
      continue;
    }
    if (!daten.text) {
      await kv.delete(name);
      continue;
    }
    raus.push({ id: name, text: daten.text, at: Number(daten.at) || 0 });
    if (loeschen) await kv.delete(name);
  }
  return raus.sort((a, b) => a.at - b.at);
}

/** Löscht einen einzelnen Eintrag, wenn die App ihn bestätigt hat. */
export async function postLoeschen(kv: KVNamespace, id: string): Promise<void> {
  if (!id.startsWith(PRAEFIX)) return;
  await kv.delete(id);
}

/**
 * Was in der Push Nachricht steht.
 *
 * Der Satz selbst steht drin und nicht nur "du hast etwas gesagt". Auf dem
 * Sperrbildschirm sieht der Nutzer damit, ob die Erkennung ihn verstanden
 * hat, bevor er die App überhaupt öffnet. Gekürzt, weil eine Mitteilung
 * ohnehin abschneidet.
 */
export function postMitteilung(text: string): { titel: string; text: string; marke: string; ziel: string } {
  return {
    titel: "Angekommen",
    text: text.length > 110 ? `${text.slice(0, 107)}...` : text,
    // Feste Marke: wer dreimal spricht, bekommt eine Mitteilung, die sich
    // ersetzt, statt drei, die sich stapeln.
    marke: "postfach",
    ziel: "./?postfach=1",
  };
}

function zufall(): string {
  return Math.random().toString(36).slice(2, 8);
}
