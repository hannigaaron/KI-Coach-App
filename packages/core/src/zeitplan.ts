/**
 * Aus einer Reihenfolge wird ein Tag mit Uhrzeiten.
 *
 * `priorisiere` beantwortet, was heute drankommt und was warten kann. Es sagt
 * nicht, wann. "Erst das Angebot, dann die Steuer" hilft wenig, wenn
 * dazwischen drei Kundentermine liegen und unklar ist, ob das Angebot vor
 * zwölf überhaupt reinpasst. Erst die Uhrzeit macht aus einer Liste einen
 * Plan, an den man sich halten kann.
 *
 * Gelegt wird in Rangfolge: die wichtigste Aufgabe bekommt den frühesten
 * freien Block, in den sie ganz hineinpasst. Eine Aufgabe wird nicht
 * zerteilt. Neunzig Minuten Konzentration in drei Stücken zu zwanzig sind
 * keine neunzig Minuten Konzentration.
 *
 * Passt eine Aufgabe in keinen Block mehr, steht sie gesondert da und nicht
 * irgendwo hineingequetscht. Ein Plan, der mehr verspricht, als der Kalender
 * hergibt, wird mittags verworfen, und danach glaubt man auch dem nächsten
 * nicht.
 */

import type { Aufgabe } from "./aufgaben.js";
import { uhrzeit } from "./ical.js";
import type { Luecke } from "./tagesablauf.js";

/**
 * Luft zwischen zwei Aufgaben, in Minuten.
 *
 * Als Regel gesetzt, nicht gemessen. Ein Plan ohne Luft hält genau bis zur
 * ersten Aufgabe, die länger dauert als geschätzt, und das ist fast jede.
 */
export const PUFFER_MINUTEN = 10;

/** Startzeiten werden auf diesen Takt gerundet. "10:07" plant niemand. */
const TAKT_MINUTEN = 5;

export interface Zeitblock {
  aufgabe: Aufgabe;
  /** Beginn in Millisekunden. */
  von: number;
  /** Ende in Millisekunden. */
  bis: number;
}

export interface Zeitplan {
  /** Gelegte Aufgaben, zeitlich sortiert. */
  bloecke: Zeitblock[];
  /** Für heute vorgesehen, aber in keinem freien Block genug Platz. */
  passtNicht: Aufgabe[];
  /** Jede Zeile nennt die Zahl, auf der sie beruht. */
  hinweise: string[];
}

export interface ZeitplanEingabe {
  /** In Rangfolge, wichtigste zuerst. So, wie `priorisiere` sie liefert. */
  aufgaben: Aufgabe[];
  /** Freie Blöcke des Tages aus dem Kalender. */
  luecken: Luecke[];
  /** Ab hier wird geplant. Was davor liegt, ist vorbei. */
  ab: number;
  /** Abweichende Luft zwischen Aufgaben. */
  pufferMinuten?: number;
}

/** Legt die Aufgaben in die freien Blöcke. */
export function zeitplan(e: ZeitplanEingabe): Zeitplan {
  const puffer = Math.max(0, e.pufferMinuten ?? PUFFER_MINUTEN) * 60000;
  const takt = TAKT_MINUTEN * 60000;

  // Jeder Block bekommt einen Zeiger, der vorrückt, sobald etwas hineingelegt
  // wurde. Blöcke, die schon vorbei sind, fallen weg, ein angebrochener
  // beginnt jetzt und nicht zu seiner ursprünglichen Zeit.
  const bloecke = e.luecken
    .map((l) => ({ zeiger: aufTakt(Math.max(l.von, e.ab), takt), bis: l.bis }))
    .filter((b) => b.bis > b.zeiger)
    .sort((a, b) => a.zeiger - b.zeiger);

  const gelegt: Zeitblock[] = [];
  const passtNicht: Aufgabe[] = [];

  for (const aufgabe of e.aufgaben) {
    const dauer = Math.max(TAKT_MINUTEN, aufgabe.minuten) * 60000;
    const block = bloecke.find((b) => b.bis - b.zeiger >= dauer);
    if (!block) {
      passtNicht.push(aufgabe);
      continue;
    }
    gelegt.push({ aufgabe, von: block.zeiger, bis: block.zeiger + dauer });
    block.zeiger = aufTakt(block.zeiger + dauer + puffer, takt);
  }

  gelegt.sort((a, b) => a.von - b.von);

  const hinweise: string[] = [];
  if (gelegt.length > 0) {
    hinweise.push(
      `Zwischen zwei Aufgaben liegen ${Math.round(puffer / 60000)} Minuten Luft. ` +
      "Das ist eine Regel und keine Messung: ohne Luft hält ein Plan nur bis zur ersten Aufgabe, die länger dauert.",
    );
  }
  if (passtNicht.length > 0) {
    const laengste = Math.max(0, ...bloecke.map((b) => b.bis - b.zeiger)) / 60000;
    hinweise.push(
      `${passtNicht.length} ${passtNicht.length === 1 ? "Aufgabe passt" : "Aufgaben passen"} in keinen freien Block mehr. ` +
      `Der grösste, der noch frei ist, hat ${Math.floor(laengste)} Minuten. ` +
      "Entweder etwas verschieben oder einen Termin freiräumen.",
    );
  }

  return { bloecke: gelegt, passtNicht, hinweise };
}

/** Rundet auf den nächsten Takt nach oben. */
function aufTakt(ms: number, takt: number): number {
  return Math.ceil(ms / takt) * takt;
}

/** Der Plan in Worten, für Antwort und Anzeige. */
export function zeitplanText(plan: Zeitplan): string {
  if (plan.bloecke.length === 0 && plan.passtNicht.length === 0) {
    return "Für heute steht nichts im Plan.";
  }
  const zeilen: string[] = [];
  if (plan.bloecke.length) {
    zeilen.push("Dein Tag, wichtigstes zuerst:");
    for (const b of plan.bloecke) {
      zeilen.push(`- ${uhrzeit(b.von)} bis ${uhrzeit(b.bis)}: ${b.aufgabe.text}${b.aufgabe.wichtigkeit >= 3 ? " (wichtig)" : ""}`);
    }
  }
  if (plan.passtNicht.length) {
    zeilen.push(`Kein Platz mehr für: ${plan.passtNicht.map((a) => `${a.text} (${a.minuten} Minuten)`).join(", ")}.`);
  }
  for (const h of plan.hinweise) zeilen.push(h);
  return zeilen.join("\n");
}

/**
 * Nimmt belegte Zeiten aus den freien Blöcken.
 *
 * Der Kalender kennt nur, was als Termin eingetragen ist. Das Training aus
 * dem Profil und die Mahlzeiten stehen meist nicht darin, und ein Plan, der
 * das Angebot auf die Zeit des Krafttrainings legt, wird nicht befolgt,
 * sondern ignoriert.
 */
export function lueckenOhne(luecken: Luecke[], belegt: Array<{ von: number; bis: number }>): Luecke[] {
  let rest = luecken.map((l) => ({ von: l.von, bis: l.bis }));
  for (const b of belegt) {
    if (!(b.bis > b.von)) continue;
    const neu: Array<{ von: number; bis: number }> = [];
    for (const l of rest) {
      if (b.bis <= l.von || b.von >= l.bis) {
        neu.push(l);
        continue;
      }
      if (b.von > l.von) neu.push({ von: l.von, bis: b.von });
      if (b.bis < l.bis) neu.push({ von: b.bis, bis: l.bis });
    }
    rest = neu;
  }
  return rest
    .map((l) => ({ ...l, minuten: Math.round((l.bis - l.von) / 60000) }))
    .filter((l) => l.minuten > 0)
    .sort((a, b) => a.von - b.von);
}
