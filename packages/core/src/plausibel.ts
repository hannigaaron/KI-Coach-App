import type { FoodEntry } from "./types.js";
import { mengeLesen } from "./portion.js";

/**
 * Die Prüfung auf einen unmöglichen Tag.
 *
 * Der Anlass ist derselbe wie bei `doppelt.ts`: an einem echten Tag standen um
 * 16 Uhr 5172 Kalorien gegen ein Ziel von 3000. Der Riegel gegen doppelte
 * Posten verhindert genau diesen Fall. Er verhindert aber nicht den nächsten,
 * denn ein falscher Wert kann auch aus einer falsch geschätzten Menge, einer
 * falsch gelesenen Etikettenspalte oder einem Rechenfehler des Modells kommen.
 *
 * Deshalb hier die zweite Ebene: nicht die Herkunft eines Wertes prüfen,
 * sondern das Ergebnis. Ein Tag, der physikalisch nicht geht, geht nicht, egal
 * wie er zustande kam.
 *
 * Zwei Stufen, und die Trennung ist der ganze Punkt. "hart" heisst, der Wert
 * kann so nicht stimmen: er verletzt eine Grenze, die keine Ernährung erreicht.
 * "auffaellig" heisst, der Wert ist möglich, aber in fast allen Fällen ein
 * Fehler. Beides in einen Topf zu werfen würde die harte Aussage entwerten:
 * wer dreimal "auffällig" überliest, überliest beim vierten Mal auch das, was
 * wirklich falsch ist.
 *
 * Es wird nichts stillschweigend korrigiert. Die App kann nicht wissen, ob
 * jemand sich vertippt oder wirklich so gegessen hat. Sie kann nur sagen, was
 * ihr auffällt, und die Zahl danebenstellen, an der es auffällt.
 */

export type Schwere = "hart" | "auffaellig";

export interface PlausibelBefund {
  schwere: Schwere;
  /** Der Satz für den Nutzer, mit der Zahl, an der es hängt. */
  text: string;
  /** Der Posten, um den es geht. Fehlt bei Befunden über den ganzen Tag. */
  posten?: string;
}

/**
 * Die höchste Energiedichte, die ein Lebensmittel haben kann.
 *
 * Reines Fett liefert 9 kcal je Gramm, Protein und Kohlenhydrate je 4. Ein
 * Lebensmittel besteht nie zu mehr als 100 Prozent aus Fett, also liegt die
 * Obergrenze bei 9 kcal je Gramm. Faktoren nach Verordnung (EU) Nr. 1169/2011,
 * Anhang XIV.
 *
 * Die Schwelle steht bei 9,4 und nicht bei 9,0. Öl wird mit 900 kcal je 100
 * Gramm deklariert und liegt damit genau auf der Grenze, und eine Rundung auf
 * dem Etikett darf keinen Fehlalarm auslösen. Alkohol mit 7 kcal je Gramm
 * liegt darunter und ändert nichts.
 */
export const MAX_KCAL_JE_GRAMM = 9.4;

/**
 * Ab wie viel Gramm Protein je Kilo Körpergewicht der Tag auffällt.
 *
 * Vier Gramm je Kilo. Das ist etwa das Doppelte dessen, was im Kraftsport als
 * obere sinnvolle Menge gilt, und für diesen Nutzer bei 87 kg rund 350 Gramm
 * Protein am Tag. Das isst niemand versehentlich. Wer es doch tut, bekommt
 * einen Hinweis und keine Sperre.
 */
export const MAX_PROTEIN_JE_KG = 4;

/** Ab wie viel Millilitern am Tag die Wassermenge auffällt. */
export const MAX_WASSER_ML = 6000;

export interface PlausibelLage {
  posten: FoodEntry[];
  /** Das Kalorienziel des Tages. Ohne Ziel entfallen die Befunde, die daran hängen. */
  zielKcal?: number | null;
  /** Körpergewicht in Kilo, für die Proteingrenze. */
  gewichtKg?: number | null;
  waterMl?: number | null;
  /** Uhrzeit als HH:MM, für den Befund "so früh am Tag". */
  jetzt?: string | null;
  /** Wachzeit als HH:MM, aus `tagesrandFuer`. */
  aufstehen?: string | null;
  schlafen?: string | null;
}

function minuten(hhmm: string | null | undefined): number | null {
  const t = String(hhmm ?? "").match(/^(\d{1,2}):(\d{2})$/);
  if (!t) return null;
  const h = Number(t[1]);
  const m = Number(t[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Die Menge eines Postens in Gramm oder Millilitern, sonst null. */
function masseInGramm(eintrag: FoodEntry): number | null {
  const menge = mengeLesen(eintrag.quantity);
  if (!menge) return null;
  // Nur Gewicht und Volumen. "2 Eier" sagt über die Masse nichts, und ein
  // geratener Umrechnungsfaktor würde einen Befund erfinden.
  if (!["g", "gramm", "ml"].includes(menge.einheit)) return null;
  return menge.zahl;
}

function rund(n: number, stellen = 1): number {
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
}

/**
 * Prüft einen Tag und gibt zurück, was nicht stimmen kann.
 *
 * Die Reihenfolge ist Absicht: erst die einzelnen Posten, dann der Tag. Ein
 * kaputter Posten erklärt eine kaputte Tagessumme, und wer die Ursache zuerst
 * liest, muss die Folge nicht mehr lesen.
 */
export function plausibelPruefen(lage: PlausibelLage): PlausibelBefund[] {
  const befunde: PlausibelBefund[] = [];
  const posten = lage.posten ?? [];

  for (const e of posten) {
    const kcal = Number(e.kcal) || 0;
    const protein = Number(e.proteinG) || 0;
    const fett = Number(e.fatG) || 0;
    const kh = Number(e.carbsG) || 0;
    const masse = masseInGramm(e);
    if (masse === null || masse <= 0) continue;

    const dichte = kcal / masse;
    if (dichte > MAX_KCAL_JE_GRAMM) {
      befunde.push({
        schwere: "hart",
        posten: e.name,
        text: `${e.name}: ${Math.round(kcal)} kcal auf ${e.quantity} sind ${rund(dichte)} kcal je Gramm. `
          + `Mehr als ${MAX_KCAL_JE_GRAMM} geht nicht, reines Fett liegt bei 9. Da stimmt die Menge oder der Wert nicht.`,
      });
    }

    // Die Makros wiegen zusammen mehr als der Posten selbst. Das ist keine
    // Schätzfrage, sondern eine Massenbilanz: Wasser und Asche wiegen auch noch.
    const makroMasse = protein + fett + kh;
    if (makroMasse > masse * 1.05) {
      befunde.push({
        schwere: "hart",
        posten: e.name,
        text: `${e.name}: ${rund(makroMasse)} g Makros auf ${e.quantity}. `
          + `Die Nährstoffe wiegen mehr als der Posten selbst, das kann nicht stimmen.`,
      });
    }
  }

  const tagKcal = posten.reduce((s, e) => s + (Number(e.kcal) || 0), 0);
  const tagProtein = posten.reduce((s, e) => s + (Number(e.proteinG) || 0), 0);

  const ziel = Number(lage.zielKcal) || 0;
  if (ziel > 0 && tagKcal > ziel * 2) {
    befunde.push({
      schwere: "auffaellig",
      text: `${Math.round(tagKcal)} kcal stehen heute drin, dein Ziel sind ${Math.round(ziel)}. `
        + `Das ist mehr als das Doppelte. Schau bitte nach, ob etwas doppelt eingetragen ist.`,
    });
  }

  // Über dem Ziel, obwohl der Tag noch lange läuft. Das ist der Fall vom
  // 16 Uhr Tag: nicht unmöglich, aber ein Grund nachzusehen, solange sich der
  // Rest des Tages noch planen lässt.
  const jetzt = minuten(lage.jetzt);
  const schlaf = minuten(lage.schlafen);
  if (ziel > 0 && jetzt !== null && schlaf !== null && tagKcal > ziel) {
    const restMin = schlaf - jetzt;
    if (restMin >= 240) {
      const restH = Math.round(restMin / 60);
      befunde.push({
        schwere: "auffaellig",
        text: `Du bist schon ${Math.round(tagKcal - ziel)} kcal über dem Ziel, und es sind noch rund `
          + `${restH} Stunden bis zum Schlafen. Wenn das nicht stimmt, sag es, dann räume ich auf.`,
      });
    }
  }

  const gewicht = Number(lage.gewichtKg) || 0;
  if (gewicht > 0 && tagProtein > gewicht * MAX_PROTEIN_JE_KG) {
    befunde.push({
      schwere: "auffaellig",
      text: `${Math.round(tagProtein)} g Protein bei ${gewicht} kg sind `
        + `${rund(tagProtein / gewicht)} g je Kilo. Das isst niemand versehentlich, da ist vermutlich ein Wert zu hoch.`,
    });
  }

  const wasser = Number(lage.waterMl) || 0;
  if (wasser > MAX_WASSER_ML) {
    befunde.push({
      schwere: "auffaellig",
      text: `${(wasser / 1000).toFixed(1)} Liter stehen heute drin. Prüf das bitte, das ist mehr als geplant sein kann.`,
    });
  }

  return befunde;
}

/**
 * Die Befunde als Text, harte zuerst.
 *
 * Leer, wenn nichts auffällt. Ein "alles in Ordnung" nach jeder Mahlzeit wäre
 * Lärm, und Lärm überliest man mitsamt dem, was darin steht.
 */
export function plausibelText(befunde: PlausibelBefund[]): string {
  if (!befunde.length) return "";
  const hart = befunde.filter((b) => b.schwere === "hart");
  const weich = befunde.filter((b) => b.schwere === "auffaellig");
  const zeilen = [...hart, ...weich].map((b) => `- ${b.text}`);
  const kopf = hart.length ? "Das kann so nicht stimmen:" : "Das fällt mir auf:";
  return `${kopf}\n${zeilen.join("\n")}`;
}
