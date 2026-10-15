/**
 * Ein Übungsplan aus der Übungsdatenbank.
 *
 * Der Plan wird gerechnet und nicht von einem Modell geschrieben. Das hat zwei
 * Gründe. Er muss ohne Schlüssel funktionieren, und er muss nachprüfbar sein:
 * jede Zahl darin hängt an einer Regel, die hier steht und die jemand
 * widerlegen kann. Ein Plan aus einem Modell klingt überzeugend und ist bei
 * jeder Anfrage ein anderer.
 *
 * Was die Regeln tragen, und was nicht:
 *
 * - Jede Muskelgruppe wird mindestens zweimal pro Woche trainiert, sobald die
 *   Tage es zulassen. Quelle: Schoenfeld, Ogborn und Krieger, Sports Medicine
 *   2016, Meta-Analyse zur Trainingshäufigkeit. Bei Gleichstand der
 *   Wochensätze war zwei Mal pro Woche besser als ein Mal.
 * - Die Zahl der harten Sätze pro Muskelgruppe und Woche wird ausgewiesen, nicht
 *   erzwungen. Quelle: Schoenfeld, Ogborn und Krieger, Journal of Sports
 *   Sciences 2017, Meta-Analyse zum Volumen: im Mittel mehr Zuwachs ab etwa
 *   zehn Sätzen pro Woche. Einsteiger kommen mit weniger aus, und mit zwei
 *   kurzen Einheiten pro Woche liegt jeder Plan darunter. Das steht dann auch
 *   so im Ergebnis.
 * - Die Anstrengung wird über Wiederholungen in Reserve gesteuert, weil die App
 *   kein Gewicht vorschreiben kann, das sie nicht kennt. Quellen: Zourdos und
 *   andere 2016, Helms und andere 2016.
 * - Die Dauer ist eine Schätzung aus Sätzen, Pausen und Aufbau, keine Messung.
 *
 * Regeln der App, keine Studienergebnisse, und als solche benannt:
 *
 * - Bis 45 Minuten gibt es keine Isolation. Jede Einheit bewegt Knie, Hüfte,
 *   drückt, zieht und hat eine Rumpfübung. Seitheben in einer halben Stunde
 *   Ganzkörper heisst, dass dafür eine Grundbewegung fehlt. Passt die Zeit
 *   nicht, werden Sätze und Pausen gekürzt, nie eine Bewegung.
 * - Einsteiger bekommen für die Grundübungen geführte Geräte, wo es welche
 *   gibt. Die Bahn ist vorgegeben, und an der Brustpresse kann niemand die
 *   Kurzhanteln über dem Gesicht verlieren.
 * - Die schwerste Übung kommt zuerst. Wer müde in die Beinpresse geht, macht
 *   dort die Fehler.
 *
 * Nicht Teil davon: Verletzungen, Vorerkrankungen, Geräte, die ein Studio nicht
 * hat. Das ist ein Gerüst und kein individuelles Coaching.
 */

export type PlanNiveau = "beginner" | "intermediate" | "advanced";
export type PlanZiel = "muskel" | "kraft" | "fitness";
export type PlanTage = 2 | 3 | 4 | 5;

/** Die Felder der Übungsdatenbank, die der Plan braucht. */
export interface PlanUebung {
  id: string;
  name: string;
  pattern: string;
  gruppe: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  level: PlanNiveau;
  mechanics: "compound" | "isolation" | "isometric";
  repRange: string;
}

export interface PlanWunsch {
  tage: PlanTage;
  /** Länge einer Einheit in Minuten, inklusive fünf Minuten Aufwärmen. */
  minuten: number;
  niveau: PlanNiveau;
  ziel: PlanZiel;
  /** Halbes Volumen, mehr Reserve. Für die Entlastungswoche. */
  deload?: boolean;
  /** Höher zählen heißt andere Übungen bei gleichem Aufbau. */
  variante?: number;
}

export interface PlanPosition {
  id: string;
  name: string;
  saetze: number;
  wdh: string;
  pauseSek: number;
  /** Wiederholungen, die am Ende des Satzes noch gegangen wären. */
  reserve: number;
}

export interface PlanEinheit {
  titel: string;
  fokus: string;
  positionen: PlanPosition[];
  dauerMin: number;
}

export interface Uebungsplan {
  wunsch: PlanWunsch;
  einheiten: PlanEinheit[];
  /** Direkte Sätze je Muskelgruppe und Woche, über das Feld `gruppe`. */
  wochensaetze: Record<string, number>;
  hinweise: string[];
  quellen: string[];
}

const RANG: Record<PlanNiveau, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const AUFWAERMEN_MIN = 5;
/** Sekunden unter Spannung je Satz und Zeit zum Einrichten je Übung. Regeln, keine Messung. */
const SATZ_SEK = 45;
const AUFBAU_SEK = 60;

type Platz =
  | "kniebeuge" | "einbein" | "huefte" | "beinbeuger" | "waden"
  | "druecken_h" | "druecken_v" | "ziehen_h" | "ziehen_v"
  | "schulter" | "brust_iso" | "bizeps" | "trizeps" | "rumpf";

const PASST: Record<Platz, (e: PlanUebung) => boolean> = {
  kniebeuge: (e) => e.pattern === "knee_dominant" && e.mechanics === "compound",
  einbein: (e) => e.pattern === "unilateral_legs",
  // Die Hyperextension ist in der Datenbank Isolation, als Bewegung aber eine
  // Hüftstreckung auf einem Gerät. Für Einsteiger ist sie die geführte Hüftübung.
  huefte: (e) => e.pattern === "hip_dominant" && (e.mechanics === "compound" || e.id === "rueckenstrecker-hyperextension") && e.id !== "kettlebell-swing",
  beinbeuger: (e) => e.pattern === "knee_flexion",
  waden: (e) => e.pattern === "calves",
  druecken_h: (e) => (e.pattern === "horizontal_push" || e.pattern === "incline_push") && e.mechanics === "compound" && e.gruppe === "brust",
  druecken_v: (e) => e.pattern === "vertical_push" && e.mechanics === "compound",
  ziehen_h: (e) => e.pattern === "horizontal_pull" && e.mechanics === "compound" && e.id !== "face-pull",
  ziehen_v: (e) => e.pattern === "vertical_pull" && e.mechanics === "compound",
  schulter: (e) => e.pattern === "shoulder_isolation" && e.primaryMuscles.some((m) => /Schulter/.test(m)),
  brust_iso: (e) => e.pattern === "chest_isolation",
  bizeps: (e) => e.pattern === "elbow_flexion",
  trizeps: (e) => e.pattern === "elbow_extension",
  rumpf: (e) => e.pattern.startsWith("core_"),
};

/** Mehrgelenkige Plätze zuerst, Isolation hinten. Die Reihenfolge der Liste ist die Rangfolge beim Kürzen. */
const ISOLATION: ReadonlySet<Platz> = new Set<Platz>(["beinbeuger", "waden", "schulter", "brust_iso", "bizeps", "trizeps", "rumpf"]);

/**
 * Wie viel eine Übung auf diesem Platz dem Körper abverlangt, kleiner heisst
 * schwerer. Beine und Hüfte bewegen die meiste Masse, danach Drücken und
 * Ziehen über den Oberkörper, Isolation und Rumpf zuletzt. Die Rumpfübung
 * steht ganz hinten, weil ein müder Rumpf jede Grundübung danach unsicherer
 * macht.
 */
const SCHWERE: Record<Platz, number> = {
  kniebeuge: 0, huefte: 0, einbein: 1, druecken_h: 2, ziehen_h: 2, ziehen_v: 2, druecken_v: 3,
  beinbeuger: 4, waden: 4, schulter: 4, brust_iso: 4, bizeps: 4, trizeps: 4, rumpf: 5,
};

/** Bis zu dieser Länge enthält ein Plan nur Grundübungen und eine Rumpfübung. */
export const KURZ_BIS_MIN = 45;

/** Die Grundübungen, bei denen ein Einsteiger an ein geführtes Gerät gehört. */
const GRUNDPLATZ: ReadonlySet<Platz> = new Set<Platz>(["kniebeuge", "einbein", "huefte", "druecken_h", "druecken_v", "ziehen_h", "ziehen_v"]);

/**
 * Was ein Einsteiger statt eines Platzes bekommt, der nur freie Gewichte kennt.
 * Für Schulterdrücken gibt es in der Datenbank keine Maschine, Ausfallschritte
 * gehen nur mit Kurzhanteln.
 */
const EINSTEIGER_ERSATZ: Partial<Record<Platz, Platz>> = { druecken_v: "druecken_h", einbein: "kniebeuge" };

/** 0 geführt, 1 eigenes Körpergewicht, 2 freie Gewichte. */
function fuehrung(e: PlanUebung): number {
  if (e.equipment === "machine" || e.equipment === "cable") return 0;
  if (e.equipment === "bodyweight") return 1;
  return 2;
}

interface Tagesvorlage { titel: string; fokus: string; plaetze: Platz[] }

// Kurze Einheiten: fünf Bewegungen, keine Isolation. Die Varianten wechseln
// zwischen Kniebeuge und Einbein, waagerecht und senkrecht, damit über die Woche
// alles vorkommt, ohne dass eine Einheit länger wird.
const KURZ_FOKUS = "Knie, Hüfte, Drücken, Ziehen, Rumpf";
const K_A: Tagesvorlage = { titel: "Ganzkörper A", fokus: KURZ_FOKUS, plaetze: ["kniebeuge", "huefte", "druecken_h", "ziehen_h", "rumpf"] };
const K_B: Tagesvorlage = { titel: "Ganzkörper B", fokus: KURZ_FOKUS, plaetze: ["huefte", "einbein", "druecken_v", "ziehen_v", "rumpf"] };
const K_C: Tagesvorlage = { titel: "Ganzkörper C", fokus: KURZ_FOKUS, plaetze: ["kniebeuge", "huefte", "druecken_h", "ziehen_v", "rumpf"] };
const K_D: Tagesvorlage = { titel: "Ganzkörper D", fokus: KURZ_FOKUS, plaetze: ["huefte", "einbein", "druecken_v", "ziehen_h", "rumpf"] };
const K_E: Tagesvorlage = { ...K_A, titel: "Ganzkörper E" };

const KURZ_VORLAGEN: Record<PlanTage, Tagesvorlage[]> = {
  2: [K_A, K_B],
  3: [K_A, K_B, K_C],
  4: [K_A, K_B, K_C, K_D],
  5: [K_A, K_B, K_C, K_D, K_E],
};

// Pro Tag ein Hauptplatz für die Beine, ein Drücken, ein Ziehen, danach Zubehör. Mehr
// Beinplätze ließen die Beine auf das Doppelte der Brust kommen, und der Plan wäre
// beim Zählen der Sätze schief, obwohl jeder einzelne Tag vernünftig aussah.
const GK_A: Tagesvorlage = { titel: "Ganzkörper A", fokus: "Kniebeuge, Brust, Rücken", plaetze: ["kniebeuge", "druecken_h", "ziehen_h", "schulter", "rumpf", "trizeps", "waden"] };
const GK_B: Tagesvorlage = { titel: "Ganzkörper B", fokus: "Hüfte, Schulter, Rücken", plaetze: ["huefte", "druecken_v", "ziehen_v", "brust_iso", "bizeps", "rumpf", "beinbeuger"] };
const GK_C: Tagesvorlage = { titel: "Ganzkörper C", fokus: "Einbein, Brust, Rücken", plaetze: ["einbein", "druecken_h", "ziehen_v", "schulter", "beinbeuger", "bizeps", "rumpf"] };
const OBER_A: Tagesvorlage = { titel: "Oberkörper A", fokus: "Brust und Rücken", plaetze: ["druecken_h", "ziehen_h", "druecken_v", "ziehen_v", "schulter", "trizeps", "bizeps"] };
const OBER_B: Tagesvorlage = { titel: "Oberkörper B", fokus: "Rücken und Schulter", plaetze: ["ziehen_v", "druecken_h", "ziehen_h", "druecken_v", "brust_iso", "bizeps", "trizeps"] };
const UNTER_A: Tagesvorlage = { titel: "Unterkörper A", fokus: "Kniebeuge und Hüfte", plaetze: ["kniebeuge", "huefte", "einbein", "beinbeuger", "waden", "rumpf"] };
const UNTER_B: Tagesvorlage = { titel: "Unterkörper B", fokus: "Hüfte und Einbein", plaetze: ["huefte", "kniebeuge", "einbein", "beinbeuger", "waden", "rumpf"] };
const PUSH: Tagesvorlage = { titel: "Push", fokus: "Brust, Schulter, Trizeps", plaetze: ["druecken_h", "druecken_v", "brust_iso", "schulter", "trizeps"] };
const PULL: Tagesvorlage = { titel: "Pull", fokus: "Rücken, Bizeps", plaetze: ["ziehen_v", "ziehen_h", "schulter", "bizeps", "rumpf"] };
const BEINE: Tagesvorlage = { titel: "Beine", fokus: "Beine und Hüfte", plaetze: ["kniebeuge", "huefte", "einbein", "beinbeuger", "waden", "rumpf"] };

const VORLAGEN: Record<PlanTage, Tagesvorlage[]> = {
  2: [GK_A, GK_B],
  3: [GK_A, GK_B, GK_C],
  4: [OBER_A, UNTER_A, OBER_B, UNTER_B],
  5: [PUSH, PULL, BEINE, OBER_B, UNTER_B],
};

/** Stabiler Streuwert aus Text, damit dieselbe Eingabe denselben Plan ergibt. */
function streu(text: string, variante: number): number {
  let h = 2166136261 ^ (variante * 16777619);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 997;
}

interface Dosis { saetze: number; wdh: string; pauseSek: number; reserve: number }

function dosis(e: PlanUebung, platz: Platz, w: PlanWunsch): Dosis {
  const iso = ISOLATION.has(platz);
  const einsteiger = w.niveau === "beginner";
  let d: Dosis;
  if (e.mechanics === "isometric") {
    d = { saetze: 2, wdh: e.repRange, pauseSek: 45, reserve: 2 };
  } else if (w.ziel === "kraft") {
    d = iso
      ? { saetze: 2, wdh: "8-12", pauseSek: 90, reserve: 1 }
      : { saetze: einsteiger ? 3 : 4, wdh: einsteiger ? "5-8" : "3-6", pauseSek: 180, reserve: 2 };
  } else if (w.ziel === "fitness") {
    d = iso
      ? { saetze: 2, wdh: "12-15", pauseSek: 45, reserve: 3 }
      : { saetze: einsteiger ? 2 : 3, wdh: "10-15", pauseSek: 60, reserve: 3 };
  } else {
    d = iso
      ? { saetze: 2, wdh: "10-15", pauseSek: 75, reserve: 1 }
      : { saetze: 3, wdh: einsteiger ? "8-12" : "6-10", pauseSek: 120, reserve: einsteiger ? 3 : 2 };
  }
  if (w.deload) {
    d = { ...d, saetze: Math.max(1, Math.ceil(d.saetze / 2)), reserve: d.reserve + 2 };
  }
  return d;
}

function dauerMin(positionen: PlanPosition[]): number {
  const sek = positionen.reduce((s, p) => s + p.saetze * (SATZ_SEK + p.pauseSek) + AUFBAU_SEK, 0);
  return AUFWAERMEN_MIN + Math.round(sek / 60);
}

/**
 * Baut den Plan. `uebungen` ist die Datenbank, damit dieses Paket keine
 * Übungsdaten kennen muss und die Regeln ohne Browser testbar bleiben.
 */
export function uebungsplanBauen(wunsch: PlanWunsch, uebungen: PlanUebung[]): Uebungsplan {
  const variante = wunsch.variante ?? 0;
  const erlaubt = uebungen.filter((e) => RANG[e.level] <= RANG[wunsch.niveau]);
  const imPlan = new Map<string, number>();
  const einheiten: PlanEinheit[] = [];

  const kurz = wunsch.minuten <= KURZ_BIS_MIN;
  const einsteiger = wunsch.niveau === "beginner";

  for (const vorlage of (kurz ? KURZ_VORLAGEN : VORLAGEN)[wunsch.tage]) {
    const gewaehlt: Array<{ e: PlanUebung; platz: Platz }> = [];
    const benutzt = new Set<string>();

    const kandidatenFuer = (platz: Platz): PlanUebung[] => {
      const alle = erlaubt.filter((e) => PASST[platz](e) && !benutzt.has(e.id));
      if (!einsteiger || !GRUNDPLATZ.has(platz) || !alle.length) return alle;
      // Einsteiger: nur die am stärksten geführte Stufe, die es für diesen Platz gibt.
      const beste = Math.min(...alle.map(fuehrung));
      return alle.filter((e) => fuehrung(e) === beste);
    };

    for (const vorlagePlatz of vorlage.plaetze) {
      let platz = vorlagePlatz;
      let kandidaten = kandidatenFuer(platz);
      const ersatz = EINSTEIGER_ERSATZ[platz];
      if (einsteiger && ersatz && (!kandidaten.length || kandidaten.every((e) => fuehrung(e) === 2))) {
        platz = ersatz;
        kandidaten = kandidatenFuer(platz);
      }
      if (einsteiger && GRUNDPLATZ.has(platz) && kandidaten.every((e) => fuehrung(e) === 2)) {
        // Eher eine Übung weniger als Kurzhanteln über dem Gesicht eines Einsteigers.
        // Gilt nur, wenn die Datenbank für diesen Platz überhaupt Geführtes kennt.
        const gefuehrtBekannt = erlaubt.some((e) => PASST[platz](e) && fuehrung(e) < 2);
        if (gefuehrtBekannt) continue;
      }
      if (!kandidaten.length) continue;
      // Wer schon in dieser Woche dran war, kommt später. Danach zählt der Abstand
      // zum eigenen Niveau, dann ein stabiler Streuwert für Abwechslung.
      const wertung = (e: PlanUebung) =>
        (imPlan.get(e.id) ?? 0) * 100 + Math.abs(RANG[e.level] - RANG[wunsch.niveau]) * 20 + streu(`${e.id}|${vorlage.titel}`, variante) / 100;
      kandidaten.sort((a, b) => wertung(a) - wertung(b));
      const treffer = kandidaten[0];
      if (!treffer) continue;
      gewaehlt.push({ e: treffer, platz });
      benutzt.add(treffer.id);
    }
    // Stabil sortiert: bei gleicher Schwere bleibt die Reihenfolge der Vorlage.
    // Eine Hüftübung ohne Last von aussen, Hyperextension oder Glute Bridge,
    // ist leichter als die Beinpresse und rückt hinter sie.
    const schwere = ({ e, platz }: { e: PlanUebung; platz: Platz }) =>
      SCHWERE[platz] + (platz === "huefte" && (e.mechanics !== "compound" || e.equipment === "bodyweight") ? 1.5 : 0);
    gewaehlt.sort((a, b) => schwere(a) - schwere(b));

    const baue = (anzahl: number, saetzeMinus: number, pauseMax = Infinity): PlanPosition[] =>
      gewaehlt.slice(0, anzahl).map(({ e, platz }) => {
        const d = dosis(e, platz, wunsch);
        return {
          // Gekürzt wird nicht unter zwei Sätze, ausser die Übung hatte nie mehr.
          id: e.id, name: e.name, saetze: Math.max(Math.min(2, d.saetze), d.saetze - saetzeMinus), wdh: d.wdh,
          pauseSek: Math.min(d.pauseSek, pauseMax), reserve: d.reserve,
        };
      });
    let positionen: PlanPosition[] = [];
    if (kurz) {
      // Kurz heisst: alle fünf Bewegungen bleiben. Gekürzt werden erst die
      // Pausen, dann die Sätze, bis die Einheit passt. Unter zwei Sätze geht es
      // nur, wenn sonst gar nichts mehr passt.
      const stufen: Array<[number, number]> = [[0, Infinity], [0, 120], [0, 90], [1, 120], [1, 90], [1, 75], [1, 60], [2, 60]];
      for (const [minus, pause] of stufen) {
        positionen = baue(gewaehlt.length, minus, pause);
        if (dauerMin(positionen) <= wunsch.minuten) break;
      }
    } else {
      // Von hinten kürzen, bis die Einheit in die Zeit passt, aber nie unter drei Übungen.
      // Erst mit vollen Sätzen, dann mit je einem Satz weniger, wenn sonst unter vier Übungen bleiben.
      for (const minus of [0, 1]) {
        let anzahl = gewaehlt.length;
        while (anzahl > 3 && dauerMin(baue(anzahl, minus)) > wunsch.minuten) anzahl--;
        positionen = baue(anzahl, minus);
        if (positionen.length >= 4 || minus === 1 || gewaehlt.length < 4) break;
      }
    }
    for (const p of positionen) imPlan.set(p.id, (imPlan.get(p.id) ?? 0) + 1);
    einheiten.push({ titel: vorlage.titel, fokus: vorlage.fokus, positionen, dauerMin: dauerMin(positionen) });
  }

  const nachId = new Map(uebungen.map((e) => [e.id, e]));
  const wochensaetze: Record<string, number> = {};
  for (const einheit of einheiten) {
    for (const p of einheit.positionen) {
      const gruppe = nachId.get(p.id)?.gruppe;
      if (gruppe) wochensaetze[gruppe] = (wochensaetze[gruppe] ?? 0) + p.saetze;
    }
  }

  return { wunsch, einheiten, wochensaetze, hinweise: hinweise(wunsch, einheiten, wochensaetze), quellen: QUELLEN };
}

const GRUPPEN_NAME: Record<string, string> = {
  beine: "Beine und Gesäß", brust: "Brust", ruecken: "Rücken", schultern: "Schultern", arme: "Arme", rumpf: "Rumpf", ganzkoerper: "Ganzkörper",
};

export const QUELLEN = [
  "Schoenfeld, Ogborn, Krieger: Effects of resistance training frequency on measures of muscle hypertrophy. Sports Medicine 2016.",
  "Schoenfeld, Ogborn, Krieger: Dose-response relationship between weekly resistance training volume and increases in muscle mass. Journal of Sports Sciences 2017.",
  "Zourdos und andere: Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve. Journal of Strength and Conditioning Research 2016.",
  "Helms und andere: Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training. Strength and Conditioning Journal 2016.",
];

function hinweise(w: PlanWunsch, einheiten: PlanEinheit[], saetze: Record<string, number>): string[] {
  const aus: string[] = [];
  const reserve = w.niveau === "beginner" ? "drei" : "ein bis drei";
  aus.push(`Wähle das Gewicht so, dass am Ende jedes Satzes noch ${reserve} Wiederholungen gegangen wären.`);
  aus.push("Steigere zuerst die Wiederholungen. Schaffst du in allen Sätzen das obere Ende des Bereichs sauber, nimm etwas mehr Gewicht.");
  if (w.deload) aus.push("Entlastung: halbe Satzzahl und mehr Reserve. Das Ziel ist Erholung, nicht ein neuer Bestwert.");

  // Nur Gruppen nennen, die der Plan wirklich direkt trainiert und die groß genug sind, um zu zählen.
  const haupt = ["brust", "ruecken", "beine", "schultern"];
  const knapp = haupt.filter((g) => (saetze[g] ?? 0) > 0 && (saetze[g] ?? 0) < 10).map((g) => `${GRUPPEN_NAME[g]} ${saetze[g]}`);
  if (knapp.length) {
    aus.push(
      `Direkte Sätze pro Woche: ${knapp.join(", ")}. Die Auswertung von Schoenfeld und Kollegen (2017) sieht den Zuwachs im Mittel ab etwa zehn Sätzen pro Muskelgruppe steigen. ` +
        `Einsteiger kommen mit weniger aus. Für mehr Aufbau helfen mehr Tage oder längere Einheiten.`,
    );
  }
  const zuLang = einheiten.filter((e) => e.dauerMin > w.minuten);
  if (zuLang.length) aus.push(`${zuLang.map((e) => e.titel).join(", ")} dauert voraussichtlich etwas länger als ${w.minuten} Minuten. Die Dauer ist eine Schätzung aus Sätzen und Pausen.`);
  if (w.minuten <= KURZ_BIS_MIN) {
    aus.push(`Bis ${KURZ_BIS_MIN} Minuten enthält jede Einheit nur Grundübungen: Knie, Hüfte, Drücken, Ziehen und eine Rumpfübung. Die schwerste Übung kommt zuerst. Isolation ginge in dieser Zeit auf Kosten einer Grundbewegung.`);
  }
  if (w.niveau === "beginner") {
    aus.push("Als Einsteiger bekommst du für Beine, Drücken und Ziehen geführte Geräte, wo es welche gibt. Die Bahn ist vorgegeben, die Technik kann weniger schiefgehen.");
  }
  if (w.tage === 2 && w.minuten > KURZ_BIS_MIN) aus.push("Bei zwei Tagen trainierst du jede Muskelgruppe einmal pro Woche mit Schwerpunkt. Ab drei Tagen wird jede Gruppe zweimal getroffen.");
  return aus;
}

export function pauseText(sek: number): string {
  if (sek < 90) return `${sek} s`;
  const min = sek / 60;
  return Number.isInteger(min) ? `${min} min` : `${String(min.toFixed(1)).replace(".", ",")} min`;
}

/** Eine Zeile je Übung, zum Weitergeben. */
export function uebungsplanText(plan: Uebungsplan): string {
  const zeilen: string[] = [];
  const w = plan.wunsch;
  const zielName = { muskel: "Muskelaufbau", kraft: "Kraft", fitness: "Fitness" }[w.ziel];
  zeilen.push(`Trainingsplan: ${w.tage} Tage, ${zielName}${w.deload ? ", Entlastung" : ""}`);
  for (const e of plan.einheiten) {
    zeilen.push("", `${e.titel} (${e.fokus}, etwa ${e.dauerMin} Min.)`);
    for (const p of e.positionen) {
      zeilen.push(`${p.name}: ${p.saetze} x ${p.wdh}, Pause ${pauseText(p.pauseSek)}, ${p.reserve} in Reserve`);
    }
  }
  return zeilen.join("\n");
}
