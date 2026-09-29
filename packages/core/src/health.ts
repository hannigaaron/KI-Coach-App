/**
 * Apple Health, über die Exportdatei.
 *
 * HealthKit gibt es nur nativ. Eine Web App kommt nicht heran, und daran
 * ändert auch kein MCP etwas: MCP verbindet ein Sprachmodell mit Werkzeugen,
 * nicht eine Web App mit einem Gerät. Der einzige Weg ohne App Store ist der
 * Export, den die Health App selbst anbietet: Profil, Alle Daten exportieren.
 * Heraus kommt ein ZIP mit `apple_health_export/export.xml`.
 *
 * Das ist ein Import und kein Abgleich. Was nach dem Export im Gerät passiert,
 * kennt die App nicht, genau wie beim Kalender. Das steht auch so in der
 * Oberfläche, denn eine Kopie, die für ein Abo gehalten wird, ist schlimmer
 * als gar keine.
 *
 * Gelesen wird in Stücken. Ein `export.xml` von jemandem, der seit Jahren eine
 * Uhr trägt, hat mehrere hundert Megabyte, und eine Zeichenkette dieser Grösse
 * bringt den Browser um. Der Sammler nimmt deshalb Stück für Stück entgegen
 * und hält nur die Tageswerte.
 */

/** Die Typen, die gelesen werden. Alles andere wird übersprungen. */
const TYPEN = {
  HKQuantityTypeIdentifierStepCount: "schritte",
  HKQuantityTypeIdentifierRestingHeartRate: "ruhepuls",
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
  HKQuantityTypeIdentifierBodyMass: "gewichtKg",
  HKQuantityTypeIdentifierActiveEnergyBurned: "aktivKcal",
} as const;

const SCHLAF_TYP = "HKCategoryTypeIdentifierSleepAnalysis";

export interface HealthTag {
  /** JJJJ-MM-TT, lokale Zeit des Geräts zum Zeitpunkt des Exports. */
  tag: string;
  schritte?: number;
  /** Minuten, in denen wirklich geschlafen wurde. Wach im Bett zählt nicht. */
  schlafMinuten?: number;
  ruhepuls?: number;
  /** SDNN in Millisekunden. */
  hrv?: number;
  gewichtKg?: number;
  aktivKcal?: number;
}

export interface HealthErgebnis {
  tage: HealthTag[];
  /** Wie viele Datensätze gelesen wurden, auch die übersprungenen. */
  gelesen: number;
  /** Wie viele davon verwertet wurden. */
  verwertet: number;
  /** Der früheste und späteste Tag mit Daten. */
  von: string | null;
  bis: string | null;
}

interface Sammelwert {
  summe: number;
  anzahl: number;
  letzter: number;
}

/**
 * Nimmt die Datei in Stücken entgegen.
 *
 * Ein Datensatz kann an einer Stückgrenze zerrissen werden. Deshalb bleibt der
 * Rest hinter dem letzten vollständigen Tag im Puffer und wird dem nächsten
 * Stück vorangestellt. Ohne das fehlt bei jedem Stückwechsel genau ein Eintrag,
 * und bei einer Datei mit Millionen Einträgen fällt das niemandem auf.
 */
export function healthSammler() {
  const werte = new Map<string, Map<string, Sammelwert>>();
  const schlaf = new Map<string, number>();
  let rest = "";
  let gelesen = 0;
  let verwertet = 0;

  function eintrag(tag: string, feld: string, wert: number): void {
    let proTag = werte.get(tag);
    if (!proTag) {
      proTag = new Map();
      werte.set(tag, proTag);
    }
    const vorhanden = proTag.get(feld);
    if (vorhanden) {
      vorhanden.summe += wert;
      vorhanden.anzahl++;
      vorhanden.letzter = wert;
    } else {
      proTag.set(feld, { summe: wert, anzahl: 1, letzter: wert });
    }
  }

  return {
    fuettern(stueck: string): void {
      const text = rest + stueck;
      // Bis zum letzten vollständigen Tag lesen, den Rest aufheben.
      const letzterSchluss = text.lastIndexOf(">");
      if (letzterSchluss < 0) {
        rest = text;
        return;
      }
      const fertig = text.slice(0, letzterSchluss + 1);
      rest = text.slice(letzterSchluss + 1);

      for (const treffer of fertig.matchAll(/<Record\s([^>]*?)\/?>/g)) {
        gelesen++;
        const roh = treffer[1] as string;
        const typ = attribut(roh, "type");
        if (!typ) continue;

        if (typ === SCHLAF_TYP) {
          // Nur echter Schlaf. "InBed" ist Liegezeit, und die als Schlaf zu
          // zählen macht aus sieben Stunden Liegen sieben Stunden Schlaf.
          const wert = attribut(roh, "value") ?? "";
          if (!wert.includes("Asleep")) continue;
          const von = zeit(attribut(roh, "startDate"));
          const bis = zeit(attribut(roh, "endDate"));
          if (von === null || bis === null || bis <= von) continue;
          // Dem Aufwachtag zugeschlagen, nicht dem Einschlaftag. Eine Nacht
          // von Sonntag 23 Uhr bis Montag 7 Uhr ist Montags Schlaf, und so
          // fragt auch der Morgen Check-in danach.
          const tag = (attribut(roh, "endDate") ?? "").slice(0, 10);
          if (!istTag(tag)) continue;
          schlaf.set(tag, (schlaf.get(tag) ?? 0) + (bis - von) / 60000);
          verwertet++;
          continue;
        }

        const feld = TYPEN[typ as keyof typeof TYPEN];
        if (!feld) continue;
        const tag = (attribut(roh, "startDate") ?? "").slice(0, 10);
        if (!istTag(tag)) continue;
        let wert = Number(attribut(roh, "value"));
        if (!Number.isFinite(wert)) continue;
        // Pfund kommen vor, wenn das Gerät auf US Einheiten steht.
        if (feld === "gewichtKg" && (attribut(roh, "unit") ?? "").toLowerCase() === "lb") {
          wert *= 0.45359237;
        }
        eintrag(tag, feld, wert);
        verwertet++;
      }
    },

    ergebnis(): HealthErgebnis {
      const tage = new Set([...werte.keys(), ...schlaf.keys()]);
      const liste: HealthTag[] = [...tage].sort().map((tag) => {
        const proTag = werte.get(tag);
        const eintragTag: HealthTag = { tag };
        const minuten = schlaf.get(tag);
        if (minuten !== undefined) eintragTag.schlafMinuten = Math.round(minuten);
        // Schritte und Kalorien werden summiert, denn die Uhr schreibt sie in
        // vielen kleinen Stücken über den Tag. Puls, HRV und Gewicht werden
        // gemittelt beziehungsweise zuletzt genommen: die Summe von vierzig
        // Pulswerten ist keine Zahl, die irgendetwas bedeutet.
        if (proTag?.has("schritte")) eintragTag.schritte = Math.round(proTag.get("schritte")!.summe);
        if (proTag?.has("aktivKcal")) eintragTag.aktivKcal = Math.round(proTag.get("aktivKcal")!.summe);
        if (proTag?.has("ruhepuls")) eintragTag.ruhepuls = mittel(proTag.get("ruhepuls")!);
        if (proTag?.has("hrv")) eintragTag.hrv = mittel(proTag.get("hrv")!);
        if (proTag?.has("gewichtKg")) {
          eintragTag.gewichtKg = Math.round(proTag.get("gewichtKg")!.letzter * 10) / 10;
        }
        return eintragTag;
      });
      return {
        tage: liste,
        gelesen,
        verwertet,
        von: liste[0]?.tag ?? null,
        bis: liste[liste.length - 1]?.tag ?? null,
      };
    },
  };
}

/** Liest eine ganze Datei am Stück. Für Tests und kleine Exporte. */
export function healthLesen(xml: string): HealthErgebnis {
  const sammler = healthSammler();
  sammler.fuettern(xml);
  return sammler.ergebnis();
}

/**
 * Was der Import gebracht hat, in Worten.
 *
 * Nennt Zahlen und nicht "erfolgreich". Wer gerade eine 300 Megabyte Datei
 * hochgeladen hat, will wissen, was angekommen ist.
 */
export function healthBericht(e: HealthErgebnis): string {
  if (e.tage.length === 0) {
    return `Aus ${e.gelesen} Datensätzen kam nichts Verwertbares. `
      + "Prüf, ob du wirklich export.xml aus dem Health Export geladen hast.";
  }
  const zaehle = (feld: keyof HealthTag) => e.tage.filter((t) => t[feld] !== undefined).length;
  const teile = [
    `${e.tage.length} Tage von ${e.von} bis ${e.bis}.`,
    `${zaehle("schritte")} Tage mit Schritten, ${zaehle("schlafMinuten")} mit Schlaf, `
      + `${zaehle("ruhepuls")} mit Ruhepuls, ${zaehle("gewichtKg")} mit Gewicht.`,
    `Gelesen: ${e.gelesen} Datensätze, verwertet ${e.verwertet}.`,
    "Das ist eine Kopie und kein Abo. Was seit dem Export dazugekommen ist, kenne ich nicht.",
  ];
  return teile.join("\n");
}

function mittel(w: Sammelwert): number {
  return Math.round(w.summe / w.anzahl);
}

/**
 * Ein Attribut aus dem rohen Tag.
 *
 * Eigene Funktion statt eines XML Parsers, weil die Datei bis zu einer Million
 * Einträge hat und ein Baum davon nicht in den Speicher passt. Gesucht wird auf
 * doppelte Anführungszeichen, denn genau die schreibt Apple.
 */
function attribut(roh: string, name: string): string | null {
  const treffer = roh.match(new RegExp(`\\b${name}="([^"]*)"`));
  return treffer ? (treffer[1] as string) : null;
}

/**
 * Apple schreibt "2026-09-29 07:12:33 +0200", also Wandzeit plus Versatz.
 * Für den Tag reichen die ersten zehn Zeichen, für eine Dauer braucht es den
 * Zeitpunkt. `Date.parse` versteht die Form nicht überall gleich, deshalb wird
 * sie erst in ISO gebracht.
 */
function zeit(roh: string | null): number | null {
  if (!roh) return null;
  const treffer = roh.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/);
  const ms = treffer
    ? Date.parse(`${treffer[1]}T${treffer[2]}${treffer[3]}:${treffer[4]}`)
    : Date.parse(roh);
  return Number.isFinite(ms) ? ms : null;
}

function istTag(tag: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(tag);
}
