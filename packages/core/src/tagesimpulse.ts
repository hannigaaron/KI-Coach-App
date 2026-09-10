/**
 * Die regelmässigen Impulse am Tag.
 *
 * Das sind die Nachrichten, die daevo von sich aus schickt, ohne dass der
 * Nutzer die App öffnet. Sie hängen an keiner Zahl und brauchen keinen
 * Zustand: der Versand läuft über einen Cron ohne Datenbank, siehe
 * scripts/push-senden.mjs. Alles, was Zahlen des Nutzers braucht, steht in
 * reminders.ts und läuft weiter über den Scheduler.
 *
 * Sechs feste Zeitpunkte, alle zur vollen Stunde. Der Grund ist der Versand:
 * GitHub Actions startet einen Cron mit fünf bis dreissig Minuten Verzug,
 * gelegentlich mehr. Ein Lauf zur vollen Stunde deckt deshalb genau die
 * Stunde ab, in der er ankommt, und jeder Impuls geht genau einmal raus.
 *
 * Je Zeitpunkt gibt es mehrere Formulierungen. Die gleiche Nachricht jeden
 * Tag wird nach einer Woche weggewischt, ohne gelesen zu werden. Gewählt wird
 * über das Datum, nicht zufällig: derselbe Tag ergibt dieselbe Nachricht, und
 * damit ist der Versand wiederholbar und testbar.
 */

export type ImpulsArt = "protein" | "trinken" | "shake" | "energie" | "stress" | "pause";

export interface Impuls {
  art: ImpulsArt;
  /** Lokale Uhrzeit HH:MM, Europe/Berlin. */
  at: string;
  titel: string;
  text: string;
  /**
   * Erwartet eine Antwort. Die Benachrichtigung öffnet dann den Assistenten
   * mit der Frage, statt nur die App zu starten.
   */
  frage: boolean;
}

interface Slot {
  art: ImpulsArt;
  at: string;
  titel: string;
  frage: boolean;
  texte: string[];
}

const SLOTS: Slot[] = [
  {
    art: "protein",
    at: "09:00",
    titel: "Eiweiss zuerst",
    frage: false,
    texte: [
      "Denk daran, in jede Mahlzeit eine Eiweissquelle einzubauen.",
      "Erste Mahlzeit heute: steht da eine Eiweissquelle drin?",
      "Bau in jede Mahlzeit heute eine Eiweissquelle ein. Quark, Eier, Fleisch, Fisch, Hülsenfrüchte.",
    ],
  },
  {
    art: "trinken",
    at: "11:00",
    titel: "Trinken",
    frage: false,
    texte: [
      "Wird Zeit, was zu trinken.",
      "Flasche leer oder voll? Trink jetzt einen halben Liter.",
      "Zwischendurch trinken. Das kostet dich zehn Sekunden.",
    ],
  },
  {
    art: "energie",
    at: "14:00",
    titel: "Energie",
    frage: true,
    texte: [
      "Wie fühlst du dich von 1 bis 10 beim Energielevel, seit du das letzte Mal gegessen hast?",
      "Energielevel von 1 bis 10, seit der letzten Mahlzeit. Eine Zahl reicht.",
    ],
  },
  {
    art: "shake",
    at: "16:00",
    titel: "Nachlegen",
    frage: false,
    texte: [
      "Falls dein Mittagessen ausfallen musste oder keine Eiweissquelle drin war, nimm jetzt einen Shake.",
      "Mittagessen ausgefallen oder ohne Eiweiss? Dann jetzt ein Shake, damit der Tag nicht kippt.",
      "Prüf kurz dein Protein für heute. Fehlt was, geht ein Shake schneller als eine Mahlzeit.",
    ],
  },
  {
    art: "stress",
    at: "18:00",
    titel: "Stresslevel",
    frage: true,
    texte: [
      "Wie ist dein Stresslevel gerade, von 1 bis 10?",
      "Stresslevel jetzt, von 1 bis 10?",
    ],
  },
  {
    art: "pause",
    at: "21:00",
    titel: "Fünf Minuten",
    frage: true,
    texte: [
      "Hast du dir heute schon fünf Minuten nur für dich genommen?",
      "Fünf Minuten ohne Handy und ohne To-do. Hattest du die heute?",
      "Hast du heute irgendwann runtergefahren, oder lief der Tag durch?",
    ],
  },
];

/**
 * Die Impulse eines Tages, in der Reihenfolge des Tages.
 *
 * Der Tag kommt als JJJJ-MM-TT herein, damit die Auswahl der Formulierung
 * nicht an der Uhr des Servers hängt.
 */
export function impulseFuerTag(tagIso: string): Impuls[] {
  const index = tagIndex(tagIso);
  return SLOTS.map((slot) => ({
    art: slot.art,
    at: slot.at,
    titel: slot.titel,
    frage: slot.frage,
    text: slot.texte[index % slot.texte.length] as string,
  }));
}

/**
 * Der Impuls, der in dieser Stunde fällig ist, oder null.
 *
 * Bewusst über die Stunde und nicht über die Minute: der Cron kommt mit
 * Verzug an. Über die Stunde geht jeder Impuls genau einmal raus, egal ob der
 * Lauf um 14:03 oder um 14:41 startet.
 */
export function faelligerImpuls(tagIso: string, uhrzeit: string): Impuls | null {
  const stunde = uhrzeit.slice(0, 2);
  return impulseFuerTag(tagIso).find((i) => i.at.slice(0, 2) === stunde) ?? null;
}

/** Tage seit dem 1. Januar 1970. Ergibt die Rotation der Formulierungen. */
function tagIndex(tagIso: string): number {
  const ms = Date.parse(`${tagIso}T00:00:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`Ungültiges Datum: ${tagIso}`);
  return Math.floor(ms / 86400000);
}

/* ---------- Die Antwort auf die Energiefrage ---------- */

export interface EnergieEingabe {
  /** 1 bis 10. */
  energie: number;
  /** Die zuletzt erfasste Mahlzeit von heute. Ohne sie fällt der Teil weg. */
  mahlzeit?: { text: string; kcal: number; proteinG: number; fatG: number; carbsG: number } | null;
  /** Stunden seit dieser Mahlzeit. Ohne Mahlzeit ohne Bedeutung. */
  stundenSeitMahlzeit?: number | null;
  /** Kalorienziel des Tages. */
  zielKcal: number;
  /** Wasserziel des Tages in ml. */
  zielWasserMl: number;
  /** Bis jetzt getrunken, in ml. */
  wasserMl: number;
  /** Schlafqualität aus dem Morgen Check-in, 1 bis 10. */
  schlafQualitaet?: number | null;
}

export interface EnergieBefund {
  /** Unter 5 von 10. Darunter gibt daevo Vorschläge, darüber nicht. */
  niedrig: boolean;
  /** Was die Zahlen sagen. Je Satz eine Beobachtung mit Zahl. */
  befund: string[];
  /** Was jetzt zu tun ist. Leer, wenn die Energie in Ordnung ist. */
  massnahmen: string[];
}

/** Unter fünf von zehn gilt als niedrig. Das ist die Vorgabe, keine Messung. */
const NIEDRIG_UNTER = 5;

/**
 * Bewertet die Antwort auf die Energiefrage.
 *
 * Jede Massnahme hängt an einer Zahl aus der App. Findet sich keine Ursache in
 * den Zahlen, steht das da, statt eine zu erfinden.
 */
export function energieBefund(e: EnergieEingabe): EnergieBefund {
  const befund: string[] = [`Energie ${e.energie} von 10.`];
  const massnahmen: string[] = [];
  const niedrig = e.energie < NIEDRIG_UNTER;

  if (!niedrig) {
    befund.push("Das passt. Merk dir, was du heute anders gemacht hast.");
    return { niedrig, befund, massnahmen };
  }

  const m = e.mahlzeit;
  const stunden = e.stundenSeitMahlzeit ?? null;

  if (!m || m.kcal <= 0) {
    befund.push("Für heute ist keine Mahlzeit erfasst. Ohne Mahlzeit kann ich das Essen nicht prüfen.");
    massnahmen.push("Trag nach, was du gegessen hast. Dann sehe ich, ob es daran liegt.");
  } else {
    const anteil = e.zielKcal > 0 ? m.kcal / e.zielKcal : 0;
    const kohlenhydratAnteil = m.kcal > 0 ? (m.carbsG * 4) / m.kcal : 0;
    befund.push(
      `Zuletzt erfasst: ${m.text}, ${Math.round(m.kcal)} kcal, ${Math.round(m.proteinG)} g Protein, ` +
        `${Math.round(m.carbsG)} g Kohlenhydrate.`,
    );

    // Reihenfolge wie beim Mittags Check-in: erst der Abstand, dann die Menge,
    // dann die Zusammensetzung. Ein langer Abstand erklärt einen Einbruch
    // besser als das Verhältnis der Makros.
    if (stunden !== null && stunden >= 5) {
      befund.push(`Das war vor etwa ${Math.round(stunden)} Stunden.`);
      massnahmen.push(
        `${Math.round(stunden)} Stunden ohne Essen sind hier die naheliegendste Ursache. ` +
          "Iss jetzt etwas mit 25 bis 30 g Protein.",
      );
    } else if (anteil >= 0.4) {
      const ziel = Math.round(e.zielKcal * 0.3);
      massnahmen.push(
        `${Math.round(m.kcal)} kcal auf einmal sind ${Math.round(anteil * 100)} Prozent deines Tagesziels. ` +
          `Teil so eine Mahlzeit beim nächsten Mal: ${ziel} kcal sofort, der Rest zwei Stunden später.`,
      );
    } else if (kohlenhydratAnteil >= 0.55 && m.proteinG < 30) {
      const mehr = Math.max(15, Math.round(35 - m.proteinG));
      massnahmen.push(
        `${Math.round(kohlenhydratAnteil * 100)} Prozent der Kalorien kamen aus Kohlenhydraten, bei ` +
          `${Math.round(m.proteinG)} g Protein. Nimm beim nächsten Mal ${mehr} g Protein mehr, bei gleichen Kalorien.`,
      );
    } else if (m.proteinG < 25) {
      massnahmen.push(
        `Nur ${Math.round(m.proteinG)} g Protein in der letzten Mahlzeit. ` +
          `${Math.round(30 - m.proteinG)} g mehr halten dich länger auf Temperatur.`,
      );
    }
  }

  // Wasser. Am Nachmittag sollte etwa die Hälfte des Tagesziels stehen.
  const wasserSoll = Math.round(e.zielWasserMl * 0.5);
  if (wasserSoll > 0 && e.wasserMl < wasserSoll * 0.6) {
    befund.push(`Getrunken hast du bis jetzt ${e.wasserMl} ml von ${e.zielWasserMl} ml.`);
    massnahmen.push(`Trink jetzt ${Math.min(750, wasserSoll - e.wasserMl)} ml und schau in einer Stunde nochmal.`);
  }

  if (typeof e.schlafQualitaet === "number" && e.schlafQualitaet < NIEDRIG_UNTER) {
    befund.push(`Deine Schlafqualität heute früh: ${e.schlafQualitaet} von 10.`);
    massnahmen.push(
      "Bei dem Schlaf ist der Einbruch eher der Schlaf als das Essen. Ändere heute nichts am Essen, " +
        "geh dafür früher ins Bett und miss es morgen erneut.",
    );
  }

  if (massnahmen.length === 0) {
    massnahmen.push(
      "In deinen Zahlen finde ich keine Ursache. Häufig ist es dann Stress, zu wenig Pause oder Schlaf. " +
        "Sag mir, was heute bisher los war.",
    );
  }

  return { niedrig, befund, massnahmen };
}

export function energieBefundText(b: EnergieBefund): string {
  const zeilen = [...b.befund];
  if (b.massnahmen.length) {
    zeilen.push("");
    for (const m of b.massnahmen) zeilen.push(m);
  }
  return zeilen.join("\n");
}
