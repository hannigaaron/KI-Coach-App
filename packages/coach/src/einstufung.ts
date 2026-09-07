import type { CoachProvider } from "./provider.js";

/**
 * Wie wichtig ist das, und wie lange dauert es.
 *
 * Der Nutzer soll eine Aufgabe hinschreiben und fertig. Wer beim Eintragen
 * eine Wichtigkeit auswählen muss, wählt beim dritten Mal immer dieselbe, und
 * eine Liste, in der alles wichtig ist, ist keine Liste.
 *
 * Deshalb stuft der Coach ein. Er sieht dabei mehr als ein Auswahlfeld: den
 * Wortlaut, die Ziele des Nutzers und was sonst offen ist. Die Einstufung
 * steht danach sichtbar an der Aufgabe, samt Begründung in einem Halbsatz,
 * und lässt sich mit einem Tipp ändern. Eine Einschätzung, die man nicht
 * korrigieren kann, ist eine Bevormundung.
 */

export interface Einstufung {
  /** Geschätzter Aufwand in Minuten. */
  minuten: number;
  /** 1 nebensächlich, 2 normal, 3 wichtig. */
  wichtigkeit: number;
  /** Frist als JJJJ-MM-TT, wenn im Text eine steht. Sonst leer. */
  faellig: string | null;
  /** Ein Halbsatz, warum diese Einstufung. */
  warum: string;
  /** Ohne Modell entstanden, also nach Wortgruppen statt nach Verständnis. */
  regelbasiert?: boolean;
}

export const EINSTUFUNG_SYSTEM = `Du stufst eine einzelne Aufgabe ein, die der Nutzer gerade
aufgeschrieben hat. Drei Dinge: Aufwand in Minuten, Wichtigkeit von 1 bis 3, und eine Frist, falls
im Text eine steht.

Zur Wichtigkeit. Sie misst nicht, wie dringend sich etwas anfühlt, sondern was passiert, wenn es
nicht getan wird.

3 bekommt nur, was Geld bringt oder kostet, was eine Zusage an einen anderen Menschen ist, was
gesundheitlich nicht warten kann, oder was den Aufbau seines Geschäfts wirklich voranbringt.
Höchstens jede vierte Aufgabe ist eine 3. Wenn alles wichtig ist, ist nichts wichtig.

2 ist der Normalfall. Es gehört getan, aber eine Woche später wäre es auch nicht schlimm.

1 bekommt, was niemandem auffällt, wenn es nie passiert.

Zum Aufwand. Schätz grosszügig, nicht optimistisch. Menschen unterschätzen Aufgaben, und ein Plan
aus zu knappen Schätzungen geht jeden Tag nicht auf. Ein Anruf sind 15 Minuten, ein Angebot 45, ein
Konzept zwei Stunden.

Zur Frist. Nur setzen, wenn im Text wirklich eine steht, etwa bis Freitag, morgen, bis Monatsende.
Erfinde keine.

Die Begründung ist ein Halbsatz und nennt den Grund, nicht die Einstufung. Nicht "wichtig, weil
wichtig", sondern "Geld, das schon zugesagt ist".`;

const SCHEMA = {
  type: "object",
  properties: {
    minuten: { type: "number", description: "Geschätzter Aufwand, 5 bis 480." },
    wichtigkeit: { type: "number", description: "1, 2 oder 3." },
    faellig: { type: "string", description: "JJJJ-MM-TT, oder leer, wenn im Text keine Frist steht." },
    warum: { type: "string", description: "Ein Halbsatz zum Grund." },
  },
  required: ["minuten", "wichtigkeit", "faellig", "warum"],
} as const;

export interface EinstufungKontext {
  /** Heute, JJJJ-MM-TT. Damit eine Frist im Text ein Datum werden kann. */
  heute: string;
  /** Was der Nutzer erreichen will, in ein bis drei Zeilen. */
  ziele?: string;
  /** Was sonst noch offen ist, damit die Einstufung im Verhältnis steht. */
  offen?: string[];
  modell?: string;
}

export async function einstufeAufgabe(
  provider: CoachProvider,
  text: string,
  kontext: EinstufungKontext,
): Promise<Einstufung> {
  const sauber = text.trim();
  if (!provider.available) return regelEinstufung(sauber, kontext.heute);

  const teile = [
    `Heute ist der ${kontext.heute}.`,
    kontext.ziele ? `Was der Nutzer erreichen will:\n${kontext.ziele}` : "",
    kontext.offen?.length ? `Was sonst offen ist:\n${kontext.offen.slice(0, 12).map((o) => `- ${o}`).join("\n")}` : "",
    "",
    `Die neue Aufgabe: ${sauber}`,
  ].filter(Boolean).join("\n");

  try {
    const roh = await provider.generateJson<Partial<Einstufung>>({
      system: EINSTUFUNG_SYSTEM,
      user: teile,
      schema: SCHEMA as unknown as Record<string, unknown>,
      schemaName: "aufgabe_einstufen",
      maxTokens: 512,
      modell: kontext.modell,
    });
    return {
      minuten: Math.max(5, Math.min(480, Math.round(Number(roh.minuten) || 30))),
      wichtigkeit: Math.max(1, Math.min(3, Math.round(Number(roh.wichtigkeit) || 2))),
      faellig: /^\d{4}-\d{2}-\d{2}$/.test(String(roh.faellig ?? "")) ? String(roh.faellig) : null,
      warum: String(roh.warum ?? "").trim(),
    };
  } catch {
    return regelEinstufung(sauber, kontext.heute);
  }
}

/* ---------- Ohne Modell ---------- */

const WICHTIG = /\b(kunde|kundin|rechnung|angebot|vertrag|zusage|zugesagt|steuer|frist|deadline|abgabe|termin|arzt|bewerbung|gehalt|miete|versicherung|yan|franchise|konzept)\b/i;
const NEBENSACHE = /\b(irgendwann|vielleicht|mal wieder|bei gelegenheit|wenn zeit|nice to have|aufräumen|sortieren|ausmisten)\b/i;

const KURZ = /\b(anrufen|melden|schicken|antworten|absagen|zusagen|nachfragen|buchen|bestellen)\b/i;
const LANG = /\b(konzept|strategie|website|video|dreh|schneiden|vorbereiten|planen|aufsetzen|schreiben und)\b/i;
const MITTEL = /\b(schreiben|angebot|rechnung|mail|mail schreiben|einkaufen|putzen)\b/i;

const WOCHENTAGE = [
  ["sonntag", 0], ["montag", 1], ["dienstag", 2], ["mittwoch", 3],
  ["donnerstag", 4], ["freitag", 5], ["samstag", 6],
] as const;

/**
 * Der Weg ohne Schlüssel.
 *
 * Er versteht nichts, er erkennt Wortgruppen. Trotzdem besser als ein
 * Auswahlfeld, das immer auf normal steht: eine Rechnung ist wichtiger als
 * Ausmisten, und das steht im Wort.
 */
export function regelEinstufung(text: string, heute: string): Einstufung {
  const t = text.toLowerCase();

  const wichtigkeit = NEBENSACHE.test(t) ? 1 : WICHTIG.test(t) ? 3 : 2;
  const minuten = KURZ.test(t) ? 15 : LANG.test(t) ? 120 : MITTEL.test(t) ? 45 : 30;

  return {
    minuten,
    wichtigkeit,
    faellig: fristAus(t, heute),
    warum: wichtigkeit === 3
      ? "enthält ein Wort, das nach Verbindlichkeit klingt"
      : wichtigkeit === 1
        ? "klingt nach etwas, das niemandem auffällt"
        : "nach Wortgruppen eingestuft, nicht verstanden",
    regelbasiert: true,
  };
}

/** Liest eine Frist aus dem Text. Nur was eindeutig ist, sonst nichts. */
export function fristAus(text: string, heute: string): string | null {
  const t = text.toLowerCase();
  const basis = new Date(`${heute}T12:00:00`);
  if (!Number.isFinite(basis.getTime())) return null;

  const plus = (tage: number) => {
    const d = new Date(basis);
    d.setDate(d.getDate() + tage);
    return d.toISOString().slice(0, 10);
  };

  // Umlaute sind für \b keine Wortzeichen. Ein \b vor dem ü trifft deshalb
  // nie, und "übermorgen" wäre stillschweigend nie erkannt worden.
  if (/(^|\s)heute\b/.test(t)) return heute;
  if (/(^|\s)(ü|ue)bermorgen\b/.test(t)) return plus(2);
  if (/(^|\s)morgen\b/.test(t)) return plus(1);

  // Ein Datum im Text, etwa 12.09. oder 12.09.2026. Der Punkt am Ende darf
  // fehlen oder allein stehen, deshalb kein \b am Schluss.
  const datum = /(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(\d{4}))?/.exec(t);
  if (datum) {
    const jahr = datum[3] ? Number(datum[3]) : basis.getFullYear();
    const d = new Date(jahr, Number(datum[2]) - 1, Number(datum[1]), 12);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  }

  for (const [name, tag] of WOCHENTAGE) {
    if (!new RegExp(`\\b(bis |am |n(ä|ae)chsten )?${name}\\b`).test(t)) continue;
    // Der nächste Wochentag dieses Namens, heute nicht mitgezählt.
    for (let i = 1; i <= 7; i++) {
      const d = new Date(basis);
      d.setDate(d.getDate() + i);
      if (d.getDay() === tag) return d.toISOString().slice(0, 10);
    }
  }

  return null;
}

/** Die Einstufung in Worten, für die Anzeige unter der Aufgabe. */
export const WICHTIGKEIT_WORT: Record<number, string> = {
  1: "nebensächlich",
  2: "normal",
  3: "wichtig",
};

export function einstufungText(e: Einstufung): string {
  const teile = [`${e.minuten} Minuten`, WICHTIGKEIT_WORT[e.wichtigkeit] ?? "normal"];
  if (e.faellig) teile.push(`fällig ${e.faellig}`);
  const satz = teile.join(", ");
  return e.warum ? `${satz}. ${e.warum}.` : `${satz}.`;
}
