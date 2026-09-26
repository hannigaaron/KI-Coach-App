import { LUECKEN_ANTWORTEN, lueckenText, RUECKBLICK_TAGE } from "@daevo/core";
import type { KVNamespace } from "./umgebung.js";

/**
 * Aufträge: Nachrichten, die an Zahlen des Nutzers hängen.
 *
 * Die Tagesimpulse hängen an nichts und laufen deshalb blind über den Cron.
 * Die Trainingslücke hängt am Trainingslog, und das liegt auf dem Gerät. Der
 * Worker kann sie also nicht selbst erkennen. Die App erkennt sie und legt
 * hier einen Auftrag ab, der Cron stellt ihn zur Uhrzeit zu.
 *
 * Der entscheidende Punkt ist, was der Auftrag nicht enthält: keinen Text.
 * Der Worker baut ihn beim Versand selbst aus der Art und der Anzahl Tage,
 * über dieselbe Funktion, die auch die App benutzt. Käme der Text vom Gerät,
 * wäre dieser Weg eine offene Stelle, über die sich beliebiger Text auf einen
 * fremden Sperrbildschirm schieben liesse. So ist das Schlimmste, was jemand
 * mit einem fremden Endpunkt anrichten kann, eine Trainingsfrage an ein
 * Gerät, das sowieso schon angemeldet ist.
 *
 * Deshalb hängt hier auch kein Anmeldewort. Die Fassung für Nutzer kennt
 * keines, und ein Weg, den nur der Betreiber benutzen kann, wäre für die
 * Nutzer kein Weg.
 */

const PRAEFIX = "auftrag:";

/** Bekannte Arten. Alles andere wird abgewiesen, statt durchgereicht. */
export const ARTEN = ["trainingsluecke"] as const;
export type AuftragsArt = (typeof ARTEN)[number];

/**
 * Weiter als zwei Tage voraus wird nichts angenommen.
 *
 * Ein Auftrag ist eine Momentaufnahme des Trainingslogs. Wer morgen trainiert,
 * macht den Auftrag von heute falsch, und eine Frage nach einer Lücke, die es
 * nicht mehr gibt, ist schlimmer als keine Frage. Zwei Tage sind das Fenster,
 * in dem die App ohnehin wieder geöffnet und der Auftrag überschrieben wird.
 */
export const MAX_VORLAUF_MS = 48 * 60 * 60 * 1000;

/**
 * Nach dieser Zeit verfällt ein Auftrag von selbst.
 *
 * Etwas mehr als der Vorlauf, damit ein Auftrag, der auf die letzte erlaubte
 * Minute gelegt wurde, nicht kurz vorher wegläuft. Cloudflare räumt ab, es
 * braucht keinen Cron dafür.
 */
export const AUFTRAG_TTL_S = 50 * 60 * 60;

export interface Auftrag {
  /** Der Schlüssel im Speicher. */
  id: string;
  /** Die Kennung des Abos, an das zugestellt wird. */
  aboId: string;
  art: AuftragsArt;
  /** Wann zugestellt werden soll, in Millisekunden. */
  at: number;
  tageOhne: number;
  geplanteEinheiten: number;
}

export interface AuftragEingabe {
  art: string;
  at: number;
  tageOhne: number;
  geplanteEinheiten: number;
}

/**
 * Legt einen Auftrag ab.
 *
 * Je Gerät und Art genau einer. Ein zweiter überschreibt den ersten, statt
 * sich daneben zu legen: die App legt bei jedem Start einen an, und ohne das
 * hätte der Nutzer nach einer Woche sieben Fragen im Speicher stehen.
 */
export async function auftragAblegen(
  kv: KVNamespace,
  aboId: string,
  eingabe: AuftragEingabe,
  jetzt: number = Date.now(),
): Promise<Auftrag> {
  const art = pruefeArt(eingabe.art);
  const tageOhne = ganzeZahl(eingabe.tageOhne, 1, RUECKBLICK_TAGE, "tageOhne");
  const geplanteEinheiten = ganzeZahl(eingabe.geplanteEinheiten, 1, 14, "geplanteEinheiten");

  const at = Number(eingabe.at);
  if (!Number.isFinite(at)) throw new Error("Ohne Zeitpunkt kein Auftrag.");
  if (at > jetzt + MAX_VORLAUF_MS) throw new Error("Weiter als zwei Tage voraus geht nicht.");
  // Ein Zeitpunkt in der Vergangenheit ist kein Fehler, sondern "so bald wie
  // möglich". Die App rechnet mit ihrer eigenen Uhr, und die geht anders.
  const zeit = Math.max(at, jetzt);

  const id = `${PRAEFIX}${aboId}:${art}`;
  await kv.put(id, JSON.stringify({ at: zeit, tageOhne, geplanteEinheiten }), {
    expirationTtl: AUFTRAG_TTL_S,
  });
  return { id, aboId, art, at: zeit, tageOhne, geplanteEinheiten };
}

/**
 * Die fälligen Aufträge, mit einem Riegel gegen doppelte Zustellung.
 *
 * Gelesen und gelöscht in einem Durchgang. Der Cron läuft alle fünfzehn
 * Minuten, und ein Auftrag, der beim zweiten Lauf noch dasteht, geht sonst
 * zweimal raus.
 */
export async function faelligeAuftraege(
  kv: KVNamespace,
  jetzt: number = Date.now(),
): Promise<Auftrag[]> {
  const { keys } = await kv.list({ prefix: PRAEFIX, limit: 100 });
  const faellig: Auftrag[] = [];
  for (const { name } of keys) {
    const roh = await kv.get(name);
    if (!roh) continue;
    let daten: { at?: number; tageOhne?: number; geplanteEinheiten?: number };
    try {
      daten = JSON.parse(roh) as typeof daten;
    } catch {
      await kv.delete(name);
      continue;
    }
    if (!Number.isFinite(daten.at) || (daten.at as number) > jetzt) continue;

    const rest = name.slice(PRAEFIX.length);
    const trenner = rest.lastIndexOf(":");
    if (trenner < 1) {
      await kv.delete(name);
      continue;
    }
    faellig.push({
      id: name,
      aboId: rest.slice(0, trenner),
      art: rest.slice(trenner + 1) as AuftragsArt,
      at: daten.at as number,
      tageOhne: Number(daten.tageOhne) || 0,
      geplanteEinheiten: Number(daten.geplanteEinheiten) || 0,
    });
    await kv.delete(name);
  }
  return faellig;
}

/**
 * Was in der Nachricht steht.
 *
 * Aus der Zahl, nicht aus dem, was das Gerät geschickt hat. Die Antworten
 * gehen als Knöpfe mit: das ist der Unterschied zwischen einer Frage, die man
 * am Sperrbildschirm beantwortet, und einer, für die man die App aufmacht.
 */
export function auftragsMitteilung(auftrag: Auftrag): {
  titel: string;
  text: string;
  marke: string;
  ziel: string;
  aktionen: Array<{ action: string; title: string }>;
  daten: Record<string, unknown>;
} {
  const { titel, text } = lueckenText(auftrag.tageOhne, auftrag.geplanteEinheiten);
  return {
    titel,
    text,
    marke: `auftrag-${auftrag.art}`,
    ziel: `./?frage=${auftrag.art}`,
    aktionen: LUECKEN_ANTWORTEN.map((a) => ({ action: a.id, title: a.label })),
    daten: { art: auftrag.art, frage: true, tageOhne: auftrag.tageOhne },
  };
}

function pruefeArt(art: string): AuftragsArt {
  if (!(ARTEN as readonly string[]).includes(art)) throw new Error(`Unbekannte Art: ${art}`);
  return art as AuftragsArt;
}

function ganzeZahl(wert: unknown, min: number, max: number, name: string): number {
  const zahl = Math.round(Number(wert));
  if (!Number.isFinite(zahl) || zahl < min || zahl > max) {
    throw new Error(`${name} muss zwischen ${min} und ${max} liegen.`);
  }
  return zahl;
}
