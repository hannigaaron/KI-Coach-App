import type { FoodEntry } from "@daevo/core";
import type { Anhang, CoachProvider } from "./provider.js";
import { validateEntries } from "./validate.js";
import { COACH_PERSONA } from "./prompts.js";

/**
 * Fotos auswerten.
 *
 * Zwei Fälle, die im Alltag zählen: ein Teller und ein Kühlschrank.
 *
 * Beim Teller ist die Menge das eigentliche Problem, nicht das Erkennen.
 * Reis ist leicht zu erkennen, aber ob dort 150 oder 350 Gramm liegen,
 * entscheidet über 300 Kalorien. Deshalb verlangt das Schema für jede Position
 * eine Begründung der Mengenschätzung und eine Sicherheitsangabe. Eine
 * Schätzung ohne Bezugsgrösse ist geraten, und geraten gehört gekennzeichnet.
 *
 * Die Nährwerte prüft danach dieselbe Funktion wie bei der Texteingabe:
 * kcal muss zu Protein mal 4 plus Fett mal 9 plus Kohlenhydrate mal 4 passen.
 * Ohne diese Prüfung wäre ein Foto eine Einladung, Zahlen zu erfinden.
 */

export interface FotoMahlzeit {
  entries: FoodEntry[];
  /** Was auf dem Bild zu sehen ist, in einem Satz. */
  beschreibung: string;
  /** Wie die Mengen geschätzt wurden. */
  annahme: string;
  /** hoch, mittel oder niedrig. */
  sicherheit: "hoch" | "mittel" | "niedrig";
  /** Rückfrage, wenn eine Menge nicht bestimmbar ist. */
  rueckfrage: string;
  warnings: string[];
}

export interface FotoVorrat {
  /** Erkannte Lebensmittel, in der Schreibweise, die man im Laden benutzt. */
  zutaten: string[];
  /** Was auf dem Bild zu sehen ist, in einem Satz. */
  beschreibung: string;
  /** Dinge, die unklar geblieben sind. */
  unsicher: string[];
}

const MENGEN_HILFE = `So schätzt du Mengen aus einem Bild:
Such zuerst eine Bezugsgrösse im Bild. Ein Esslöffel ist etwa 15 ml, eine Gabel etwa 19 cm lang,
ein Standardteller 26 bis 28 cm, eine Untertasse 15 cm, eine Trinkglasfüllung 200 bis 250 ml,
eine Scheibe Brot 40 bis 50 g, ein Hühnerei 55 bis 60 g, eine Banane ohne Schale 100 bis 120 g.
Ohne Bezugsgrösse im Bild ist deine Schätzung deutlich unsicherer. Sag das dann auch.
Gib die Menge in Gramm oder Millilitern an, nicht als Portion. "Eine Portion" ist keine Menge.
Denk daran, ob das Lebensmittel roh oder gekocht auf dem Teller liegt. Gekochter Reis wiegt
etwa das Zweieinhalbfache des trockenen und hat je 100 g entsprechend weniger Kalorien.
Vergiss nicht, was man nicht sieht: Öl in der Pfanne, Butter im Gemüse, Sauce unter dem Fleisch.
Nenn das in der Annahme, statt es wegzulassen.`;

export const FOTO_MAHLZEIT_SYSTEM = `${COACH_PERSONA}

Aufgabe: Werte das Foto einer Mahlzeit aus und gib die Nährwerte zurück.

${MENGEN_HILFE}

Die Kalorien müssen zu den Makros passen: kcal = Protein*4 + Fett*9 + Kohlenhydrate*4.
Rechne das nach, bevor du antwortest.

Ist auf dem Bild kein Essen zu sehen, gib eine leere Liste zurück und schreib in die
Beschreibung, was stattdessen zu sehen ist. Erfinde nichts.

Setz die Sicherheit ehrlich:
hoch, wenn du Bezugsgrössen hast und die Lebensmittel eindeutig sind,
mittel, wenn du die Menge aus der Erfahrung schätzt,
niedrig, wenn das Bild unscharf ist, Teile verdeckt sind oder du raten müsstest.`;

export const FOTO_VORRAT_SYSTEM = `${COACH_PERSONA}

Aufgabe: Lies aus dem Foto eines Kühlschranks, einer Vorratskammer oder einer Einkaufstüte,
welche Lebensmittel darin sind.

Nenn jedes Lebensmittel einmal, in der Schreibweise, die man im Laden benutzt, also
"Magerquark" und nicht "ein Becher weisses Milchprodukt". Keine Mengen, nur die Namen.
Was du nur vermutest, weil die Verpackung halb verdeckt ist, kommt in die Liste unsicher
und nicht in die Liste zutaten. Erfinde nichts dazu, was üblicherweise im Kühlschrank steht.`;

const FOTO_MAHLZEIT_SCHEMA = {
  type: "object",
  properties: {
    beschreibung: { type: "string", description: "Was auf dem Bild zu sehen ist, ein Satz." },
    entries: {
      type: "array",
      description: "Jede erkannte Position einzeln. Leer, wenn kein Essen zu sehen ist.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Lebensmittel auf Deutsch." },
          quantity: { type: "string", description: "Geschätzte Menge mit Einheit, etwa 180 g." },
          kcal: { type: "number" },
          proteinG: { type: "number" },
          fatG: { type: "number" },
          carbsG: { type: "number" },
        },
        required: ["name", "quantity", "kcal", "proteinG", "fatG", "carbsG"],
      },
    },
    annahme: {
      type: "string",
      description: "Woran du die Mengen festgemacht hast, und was du dazugerechnet hast, etwa Öl.",
    },
    sicherheit: { type: "string", enum: ["hoch", "mittel", "niedrig"] },
    rueckfrage: { type: "string", description: "Eine Rückfrage, wenn eine Menge nicht bestimmbar ist. Sonst leer." },
  },
  required: ["beschreibung", "entries", "annahme", "sicherheit", "rueckfrage"],
} as const;

const FOTO_VORRAT_SCHEMA = {
  type: "object",
  properties: {
    beschreibung: { type: "string", description: "Was auf dem Bild zu sehen ist, ein Satz." },
    zutaten: { type: "array", items: { type: "string" }, description: "Sicher erkannte Lebensmittel." },
    unsicher: { type: "array", items: { type: "string" }, description: "Vermutungen, die du nicht sicher bist." },
  },
  required: ["beschreibung", "zutaten", "unsicher"],
} as const;

/** Wertet das Foto einer Mahlzeit aus. Ohne Modell gibt es kein Ergebnis. */
export async function mahlzeitAusFoto(
  provider: CoachProvider,
  anhaenge: Anhang[],
  hinweis = "",
): Promise<FotoMahlzeit> {
  const roh = await provider.generateJson<{
    beschreibung?: string;
    entries?: unknown;
    annahme?: string;
    sicherheit?: string;
    rueckfrage?: string;
  }>({
    system: FOTO_MAHLZEIT_SYSTEM,
    user: hinweis
      ? `Der Nutzer sagt dazu: ${hinweis}\nWerte das Bild aus.`
      : "Werte das Bild aus.",
    anhaenge,
    schema: FOTO_MAHLZEIT_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "mahlzeit_aus_foto",
    maxTokens: 2048,
  });

  const geprueft = validateEntries(roh.entries);
  const sicherheit = roh.sicherheit === "hoch" || roh.sicherheit === "niedrig" ? roh.sicherheit : "mittel";
  return {
    entries: geprueft.entries,
    beschreibung: (roh.beschreibung ?? "").trim(),
    annahme: (roh.annahme ?? "").trim(),
    sicherheit,
    rueckfrage: (roh.rueckfrage ?? "").trim(),
    warnings: geprueft.warnings,
  };
}

/** Liest Lebensmittel aus dem Foto eines Kühlschranks oder Vorrats. */
export async function vorratAusFoto(
  provider: CoachProvider,
  anhaenge: Anhang[],
  hinweis = "",
): Promise<FotoVorrat> {
  const roh = await provider.generateJson<{
    beschreibung?: string;
    zutaten?: unknown;
    unsicher?: unknown;
  }>({
    system: FOTO_VORRAT_SYSTEM,
    user: hinweis ? `Der Nutzer sagt dazu: ${hinweis}\nLies das Bild aus.` : "Lies das Bild aus.",
    anhaenge,
    schema: FOTO_VORRAT_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "vorrat_aus_foto",
    maxTokens: 1024,
  });

  return {
    beschreibung: (roh.beschreibung ?? "").trim(),
    zutaten: sauber(roh.zutaten),
    unsicher: sauber(roh.unsicher),
  };
}

/** Macht aus einer unbekannten Antwort eine brauchbare Liste kurzer Namen. */
function sauber(wert: unknown): string[] {
  if (!Array.isArray(wert)) return [];
  const gesehen = new Set<string>();
  const out: string[] = [];
  for (const eintrag of wert) {
    const text = String(eintrag ?? "").trim();
    if (text.length < 2 || text.length > 60) continue;
    const schluessel = text.toLowerCase();
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    out.push(text);
    if (out.length >= 40) break;
  }
  return out;
}
