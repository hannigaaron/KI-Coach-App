import type { MacroTargets } from "./types.js";

/**
 * Der Rhythmus des Tages.
 *
 * Drei Punkte, an denen sich ein Coach meldet, statt zu warten, bis jemand
 * die App öffnet: morgens der Plan, mittags die Kontrolle, abends der
 * Abschluss. Dazwischen liegt der eigentliche Wert: mittags merkt man, ob der
 * Tag kippt, und mittags kann man ihn noch drehen. Abends kann man nur noch
 * zählen.
 *
 * Alle Texte hier entstehen aus Zahlen, die die App schon hat. Kein Modell,
 * keine erfundene Studie. Wo etwas nur plausibel und nicht belegt ist, steht
 * das im Satz.
 */

/* ---------- Mittags: was war das Essen wert ---------- */

export interface MittagsEingabe {
  /** 1 bis 10. */
  energie: number;
  /** 1 bis 10. */
  konzentration: number;
  /** 1 hungrig, 5 angenehm, 10 übervoll. */
  saettigung: number;
  /** Die zuletzt erfasste Mahlzeit. Ohne sie fällt der Teil zum Essen weg. */
  mahlzeit?: { text: string; kcal: number; proteinG: number; fatG: number; carbsG: number } | null;
  ziele: MacroTargets;
  /** Bis jetzt aufgenommen. */
  bisherKcal: number;
  wasserMl: number;
  /** Schlafqualität aus dem Morgen Check-in, 1 bis 10. */
  schlafQualitaet?: number | null;
}

export interface MittagsBefund {
  /** Liegt überhaupt etwas im Argen. */
  auffaellig: boolean;
  /** Was die Zahlen sagen, je Satz eine Beobachtung mit Zahl. */
  befund: string[];
  /**
   * Was an der nächsten Mahlzeit anders sein soll, in Gramm.
   * Positiv heisst mehr, negativ weniger. Die konkreten Lebensmittel dazu
   * kommen aus dem Vorschlag, damit die Nährwerte aus einer Quelle stammen.
   */
  aenderung: { kcal: number; proteinG: number; carbsG: number } | null;
  /** Was der Nutzer beim nächsten Mal anders macht, in Worten. */
  massnahmen: string[];
}

/** Ab hier gilt ein Wert als schlecht. Unter fünf von zehn. */
const SCHWELLE = 4;

export function mittagsBefund(e: MittagsEingabe): MittagsBefund {
  const befund: string[] = [];
  const massnahmen: string[] = [];
  let aenderung: MittagsBefund["aenderung"] = null;

  const schlecht = e.energie <= SCHWELLE || e.konzentration <= SCHWELLE;

  befund.push(
    `Energie ${e.energie} von 10, Konzentration ${e.konzentration} von 10, Sättigung ${e.saettigung} von 10.`,
  );

  const m = e.mahlzeit;
  if (m && m.kcal > 0) {
    const anteil = e.ziele.kcal > 0 ? m.kcal / e.ziele.kcal : 0;
    const kohlenhydratAnteil = m.kcal > 0 ? (m.carbsG * 4) / m.kcal : 0;
    befund.push(
      `${m.text}: ${Math.round(m.kcal)} kcal, ${Math.round(m.proteinG)} g Protein, ` +
      `${Math.round(m.carbsG)} g Kohlenhydrate, ${Math.round(m.fatG)} g Fett. ` +
      `Das sind ${Math.round(anteil * 100)} Prozent deines Tagesziels in einer Mahlzeit.`,
    );

    if (schlecht) {
      // Die Reihenfolge ist Absicht: erst die Menge, dann die Zusammensetzung.
      // Eine zu grosse Mahlzeit erklärt den Einbruch besser als das Verhältnis.
      if (anteil >= 0.4) {
        const ziel = Math.round(e.ziele.kcal * 0.3);
        aenderung = { kcal: ziel - Math.round(m.kcal), proteinG: 0, carbsG: 0 };
        massnahmen.push(
          `Teil diese Mahlzeit. ${Math.round(m.kcal)} kcal auf einmal ist viel. ` +
          `${ziel} kcal jetzt und der Rest zwei Stunden später belastet dich weniger.`,
        );
      } else if (kohlenhydratAnteil >= 0.55 && m.proteinG < 30) {
        const mehrProtein = Math.max(15, Math.round(35 - m.proteinG));
        const wenigerKh = Math.round((mehrProtein * 4) / 4);
        aenderung = { kcal: 0, proteinG: mehrProtein, carbsG: -wenigerKh };
        massnahmen.push(
          `${Math.round(kohlenhydratAnteil * 100)} Prozent der Kalorien kamen aus Kohlenhydraten, ` +
          `bei ${Math.round(m.proteinG)} g Protein. Nimm beim nächsten Mal ${mehrProtein} g Protein mehr ` +
          `und ${wenigerKh} g Kohlenhydrate weniger, bei gleichen Kalorien.`,
        );
      } else if (m.proteinG < 25) {
        const mehr = Math.round(30 - m.proteinG);
        aenderung = { kcal: 0, proteinG: mehr, carbsG: 0 };
        massnahmen.push(`Nur ${Math.round(m.proteinG)} g Protein in der Mahlzeit. ${mehr} g mehr halten dich länger satt.`);
      }
    }

    if (e.saettigung <= 3 && anteil < 0.2) {
      const fehlt = Math.round(e.ziele.kcal * 0.25 - m.kcal);
      aenderung = { kcal: fehlt, proteinG: 0, carbsG: 0 };
      massnahmen.push(
        `Die Mahlzeit war mit ${Math.round(m.kcal)} kcal zu klein für dich. ` +
        `Etwa ${fehlt} kcal mehr, dann kommst du bis zur nächsten Mahlzeit durch.`,
      );
    }
    if (e.saettigung >= 9) {
      massnahmen.push(
        "Sättigung 9 oder 10 heisst übervoll. Iss die gleiche Menge langsamer oder in zwei Schritten, " +
        "dann merkst du die Sättigung, bevor der Teller leer ist.",
      );
    }
  } else if (schlecht) {
    befund.push("Zu dieser Zeit ist keine Mahlzeit erfasst. Ohne Mahlzeit kann ich das Essen nicht als Ursache prüfen.");
    massnahmen.push("Trag nach, was du gegessen hast. Dann sehe ich beim nächsten Mal, ob es daran liegt.");
  }

  // Wasser. Bis zum frühen Nachmittag sollte etwa die Hälfte stehen.
  const wasserSoll = Math.round(e.ziele.waterMl * 0.5);
  if (e.wasserMl < wasserSoll * 0.6) {
    befund.push(`Getrunken hast du bis jetzt ${e.wasserMl} ml. Bis zum frühen Nachmittag wären etwa ${wasserSoll} ml normal.`);
    if (schlecht) massnahmen.push(`Trink jetzt ${Math.min(750, wasserSoll - e.wasserMl)} ml und schau in einer Stunde nochmal.`);
  }

  if (schlecht && typeof e.schlafQualitaet === "number" && e.schlafQualitaet <= SCHWELLE) {
    befund.push(
      `Du hast heute früh die Schlafqualität mit ${e.schlafQualitaet} von 10 angegeben. ` +
      "Dann ist der Einbruch am Nachmittag eher der Schlaf als das Essen.",
    );
    massnahmen.push("Ändere heute nichts an der Ernährung. Geh dafür heute Abend früher ins Bett und miss es morgen erneut.");
  }

  if (schlecht && massnahmen.length === 0) {
    massnahmen.push(
      "An deinen Zahlen sehe ich keinen Grund im Essen. Häufigere Ursachen sind dann Schlaf, Stress " +
      "oder zu wenig Pause. Sag mir, was heute los war.",
    );
  }

  if (!schlecht) {
    befund.push("Das passt. Merk dir diese Mahlzeit als eine, die funktioniert.");
  }

  return { auffaellig: schlecht, befund, aenderung, massnahmen };
}

/* ---------- Morgens: der Plan ---------- */

export interface BriefingEingabe {
  /** Wochentag und Datum in Worten. */
  datum: string;
  /** Der Tagesablauf in Worten, aus dem Kalender. Leer, wenn keiner da ist. */
  tagesablauf: string;
  /** Die Ziele des Tages. */
  ziele: MacroTargets;
  /** Der Plan aus den Aufgaben, in Worten. */
  aufgaben: string;
  /** Offene Mindeststandards, je einer als Satz. */
  standards: string[];
  /** Gewichtstrend in einem Satz, falls belastbar. */
  trend?: string;
}

export function morgenBriefing(e: BriefingEingabe): string {
  const zeilen = [`Guten Morgen. ${e.datum}.`, ""];
  zeilen.push(e.tagesablauf || "Kein Kalender verbunden. Ich kann deinen Tag nicht sehen.");
  zeilen.push("");
  zeilen.push(`Heute stehen ${e.ziele.kcal} kcal, ${e.ziele.proteinG} g Protein und ${e.ziele.waterMl} ml Wasser an.`);
  if (e.trend) zeilen.push(e.trend);
  if (e.standards.length) {
    zeilen.push("");
    zeilen.push("Deine Untergrenze für heute:");
    for (const s of e.standards) zeilen.push(`- ${s}`);
  }
  zeilen.push("");
  zeilen.push(e.aufgaben);
  return zeilen.join("\n");
}

/* ---------- Abends: der Abschluss ---------- */

export interface AbschlussEingabe {
  datum: string;
  /** Kalorien, Protein, Wasser gegen die Ziele. */
  stand: string;
  /** Was von den geplanten Aufgaben offen blieb. */
  offen: string[];
  /** Was heute geschafft wurde. */
  erledigt: string[];
  /** Mindeststandards, die heute gehalten wurden, und die nicht. */
  standards: string[];
  /** Der Kalender von morgen in einer Zeile. */
  morgen: string;
}

export function abendAbschluss(e: AbschlussEingabe): string {
  const zeilen = [`Tagesabschluss, ${e.datum}.`, "", e.stand];

  if (e.erledigt.length) {
    zeilen.push("");
    zeilen.push(`Erledigt: ${e.erledigt.join(", ")}.`);
  }
  if (e.offen.length) {
    zeilen.push("");
    zeilen.push(`Offen geblieben: ${e.offen.join(", ")}. Das steht morgen wieder im Plan, nicht als Schuld.`);
  }
  if (e.standards.length) {
    zeilen.push("");
    for (const s of e.standards) zeilen.push(s);
  }
  zeilen.push("");
  zeilen.push(`Morgen: ${e.morgen}`);
  zeilen.push("");
  zeilen.push("Zwei Fragen: Was war heute die grösste Herausforderung, und was nimmst du dir für morgen als Erstes vor?");
  return zeilen.join("\n");
}
