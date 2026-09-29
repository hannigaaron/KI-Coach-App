import {
  BEREICHE, BEREICH_NAME, LUECKEN_ANTWORTEN, lueckenText, RUECKBLICK_TAGE, schieflagenText,
} from "@daevo/core";
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
export const ARTEN = ["trainingsluecke", "schieflage"] as const;
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
  /** Nur für die Trainingslücke. */
  tageOhne?: number;
  geplanteEinheiten?: number;
  /**
   * Nur für die Schieflage. Der Bereich kommt als Kennung und nicht als Name:
   * ein Name wäre freier Text vom Gerät, und genau den nimmt dieser Weg nicht
   * an. Den Namen schlägt der Worker in der festen Tabelle nach.
   */
  bereich?: string;
  gegenBereich?: string;
  prozent?: number;
  minutenOffen?: number;
}

export interface AuftragEingabe {
  art: string;
  at: number;
  tageOhne?: unknown;
  geplanteEinheiten?: unknown;
  bereich?: unknown;
  gegenBereich?: unknown;
  prozent?: unknown;
  minutenOffen?: unknown;
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
  // Je Art ihre eigenen Felder, und jedes einzeln geprüft. Ein Auftrag, der
  // irgendeine Zahl durchreicht, wäre genau die offene Stelle, die dieser
  // Weg nicht sein soll.
  const werte: Record<string, number | string> = art === "trainingsluecke"
    ? {
      tageOhne: ganzeZahl(eingabe.tageOhne, 1, RUECKBLICK_TAGE, "tageOhne"),
      geplanteEinheiten: ganzeZahl(eingabe.geplanteEinheiten, 1, 14, "geplanteEinheiten"),
    }
    : {
      bereich: pruefeBereich(eingabe.bereich, "bereich"),
      ...(eingabe.gegenBereich ? { gegenBereich: pruefeBereich(eingabe.gegenBereich, "gegenBereich") } : {}),
      prozent: ganzeZahl(eingabe.prozent, 0, 99, "prozent"),
      minutenOffen: ganzeZahl(eingabe.minutenOffen, 1, 10080, "minutenOffen"),
    };

  const at = Number(eingabe.at);
  if (!Number.isFinite(at)) throw new Error("Ohne Zeitpunkt kein Auftrag.");
  if (at > jetzt + MAX_VORLAUF_MS) throw new Error("Weiter als zwei Tage voraus geht nicht.");
  // Ein Zeitpunkt in der Vergangenheit ist kein Fehler, sondern "so bald wie
  // möglich". Die App rechnet mit ihrer eigenen Uhr, und die geht anders.
  const zeit = Math.max(at, jetzt);

  const id = `${PRAEFIX}${aboId}:${art}`;
  await kv.put(id, JSON.stringify({ at: zeit, ...werte }), { expirationTtl: AUFTRAG_TTL_S });
  return { id, aboId, art, at: zeit, ...werte } as Auftrag;
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
    let daten: Record<string, number | string | undefined>;
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
      ...daten,
      id: name,
      aboId: rest.slice(0, trenner),
      art: rest.slice(trenner + 1) as AuftragsArt,
      at: daten.at as number,
    } as Auftrag);
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
  if (auftrag.art === "schieflage") {
    // Der Name kommt aus der festen Tabelle, nicht vom Gerät.
    const name = BEREICH_NAME[auftrag.bereich as keyof typeof BEREICH_NAME] ?? "Ein Bereich";
    const gegen = auftrag.gegenBereich
      ? BEREICH_NAME[auftrag.gegenBereich as keyof typeof BEREICH_NAME] ?? null
      : null;
    const { titel, text } = schieflagenText(
      name,
      (auftrag.prozent ?? 0) / 100,
      auftrag.minutenOffen ?? 0,
      gegen,
    );
    return {
      titel,
      text,
      marke: "auftrag-schieflage",
      ziel: "./?ansicht=balance",
      // Keine Knöpfe. Hier gibt es nichts mit drei Antworten zu beantworten,
      // sondern etwas anzusehen. Ein Knopf ohne Wirkung ist schlimmer als
      // keiner.
      aktionen: [],
      daten: { art: auftrag.art, frage: false, bereich: auftrag.bereich },
    };
  }

  const { titel, text } = lueckenText(auftrag.tageOhne ?? 0, auftrag.geplanteEinheiten ?? 0);
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

/** Nur eine der fünf bekannten Kennungen. Alles andere ist fremder Text. */
function pruefeBereich(wert: unknown, feld: string): string {
  const s = String(wert ?? "");
  if (!(BEREICHE as readonly string[]).includes(s)) throw new Error(`${feld} ist kein bekannter Bereich.`);
  return s;
}

function ganzeZahl(wert: unknown, min: number, max: number, name: string): number {
  const zahl = Math.round(Number(wert));
  if (!Number.isFinite(zahl) || zahl < min || zahl > max) {
    throw new Error(`${name} muss zwischen ${min} und ${max} liegen.`);
  }
  return zahl;
}
