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
 * Beschwerden und Trainingsort filtern die Datenbank, bevor gewählt wird. Wer
 * Knieschmerzen angibt, bekommt keine Kniebeugen und Ausfallschritte, wer zu
 * Hause ohne Geräte trainiert, keine Maschinen. Welche Übung welches Gelenk
 * stark belastet, ist eine Regel dieser App aus der Trainingspraxis und keine
 * Diagnose, und der Plan sagt das. Eine echte Abklärung ersetzt er nicht.
 */

export type PlanNiveau = "beginner" | "intermediate" | "advanced";
export type PlanZiel = "muskel" | "kraft" | "fitness";
export type PlanTage = 1 | 2 | 3 | 4 | 5;

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
  /** Wo trainiert wird. Ohne Angabe gilt das Studio. */
  ort?: PlanOrt;
  /** Stellen, an denen es wehtut. Übungen, die sie stark belasten, fallen weg. */
  beschwerden?: Beschwerde[];
  /** Übungen, die der Nutzer selbst nicht will oder bei denen es wehtut. */
  meiden?: string[];
  /** Muskelpartien, die zuerst kommen. Siehe `FOKUS_PLAETZE`. */
  fokus?: FokusGruppe[];
}

/**
 * Die Muskelpartien, nach denen jemand fragt. Po ist eine eigene Partie,
 * obwohl die Datenbank sie unter Beine führt: wer Po sagt, meint Hüftstrecken
 * und nicht Beinstrecker.
 */
export type FokusGruppe = "beine" | "po" | "brust" | "ruecken" | "schultern" | "arme" | "rumpf";

export const FOKUS_NAME: Record<FokusGruppe, string> = {
  beine: "Beine", po: "Po", brust: "Brust", ruecken: "Rücken", schultern: "Schultern", arme: "Arme", rumpf: "Core",
};

export type PlanOrt = "studio" | "zuhause" | "ohne";
export type Beschwerde =
  | "schulter" | "ellbogen" | "handgelenk" | "nacken" | "unterer_ruecken" | "huefte" | "knie" | "sprunggelenk";

export const BESCHWERDE_NAME: Record<Beschwerde, string> = {
  schulter: "Schulter", ellbogen: "Ellbogen", handgelenk: "Handgelenk", nacken: "Nacken",
  unterer_ruecken: "unterer Rücken", huefte: "Hüfte", knie: "Knie", sprunggelenk: "Sprunggelenk",
};

/**
 * Welche Übungen eine Stelle stark belasten. Eine Regel aus der Praxis und
 * keine medizinische Aussage: im Zweifel fällt eine Übung eher weg, als dass
 * sie bleibt. Geführte Varianten bleiben, wo sie das Gelenk entlasten, etwa
 * das Rudern mit Brustauflage bei Beschwerden im unteren Rücken.
 */
const BELASTET: Record<Beschwerde, (e: PlanUebung) => boolean> = {
  knie: (e) => e.pattern === "knee_dominant" || e.pattern === "unilateral_legs" || e.pattern === "plyometric",
  unterer_ruecken: (e) =>
    (e.pattern === "hip_dominant" && ["barbell", "trap_bar", "kettlebell"].includes(e.equipment))
    || ["kniebeuge-langhantel", "frontkniebeuge", "rudern-langhantel", "t-bar-rudern", "good-morning"].includes(e.id),
  schulter: (e) =>
    e.pattern === "vertical_push"
    || ["dips", "bankdruecken", "schraegbankdruecken", "fliegende-kurzhantel", "klimmzug-breit", "seitheben"].includes(e.id),
  ellbogen: (e) =>
    e.pattern === "elbow_flexion" || e.pattern === "elbow_extension" || ["dips", "enges-bankdruecken"].includes(e.id),
  handgelenk: (e) =>
    ["liegestuetz", "dips", "bankdruecken", "schraegbankdruecken", "enges-bankdruecken", "schulterdruecken-langhantel",
      "frontkniebeuge", "langhantel-curl", "french-press"].includes(e.id),
  nacken: (e) => ["kurzhantel-shrug", "kniebeuge-langhantel", "schulterdruecken-langhantel", "good-morning"].includes(e.id),
  huefte: (e) =>
    e.pattern === "unilateral_legs" || e.pattern === "plyometric" || e.pattern === "hip_abd_add"
    || (e.pattern === "hip_dominant" && e.equipment === "barbell"),
  sprunggelenk: (e) => e.pattern === "unilateral_legs" || e.pattern === "plyometric" || e.id === "wadenheben-stehend" || e.id === "farmers-walk",
};

/** Was zu Hause ohne Studio fehlt: eine Stange, eine Bank zum Einhängen, Maschinen. */
const BRAUCHT_STANGE = new Set([
  "klimmzug", "klimmzug-untergriff", "klimmzug-breit", "klimmzug-eng", "dips", "haengendes-beinheben", "hanging-hold",
]);

/** Ob eine Übung am Trainingsort geht. */
export function amOrt(e: PlanUebung, ort: PlanOrt = "studio"): boolean {
  if (ort === "studio") return true;
  if (BRAUCHT_STANGE.has(e.id)) return false;
  if (ort === "ohne") return e.equipment === "bodyweight";
  return ["bodyweight", "dumbbell", "resistance_band", "kettlebell"].includes(e.equipment);
}

/** Ob eine Übung für diesen Wunsch in Frage kommt, nach Ort, Beschwerden und eigener Auswahl. */
export function uebungErlaubt(e: PlanUebung, w: Pick<PlanWunsch, "ort" | "beschwerden" | "meiden">): boolean {
  if (!amOrt(e, w.ort)) return false;
  if ((w.meiden ?? []).includes(e.id)) return false;
  return !(w.beschwerden ?? []).some((b) => BELASTET[b]?.(e));
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

export type Platz =
  | "kniebeuge" | "einbein" | "huefte" | "beinbeuger" | "beinstrecker" | "adduktoren" | "waden"
  | "druecken_h" | "druecken_v" | "ziehen_h" | "ziehen_v"
  | "seitlich" | "hintere" | "brust_iso" | "bizeps" | "trizeps" | "rumpf";

const PASST: Record<Platz, (e: PlanUebung) => boolean> = {
  kniebeuge: (e) => e.pattern === "knee_dominant" && e.mechanics === "compound",
  einbein: (e) => e.pattern === "unilateral_legs",
  // Die Hyperextension ist in der Datenbank Isolation, als Bewegung aber eine
  // Hüftstreckung auf einem Gerät. Für Einsteiger ist sie die geführte Hüftübung.
  huefte: (e) => e.pattern === "hip_dominant" && (e.mechanics === "compound" || e.id === "rueckenstrecker-hyperextension") && e.id !== "kettlebell-swing",
  beinbeuger: (e) => e.pattern === "knee_flexion",
  beinstrecker: (e) => e.pattern === "knee_dominant" && e.mechanics === "isolation",
  adduktoren: (e) => e.pattern === "hip_abd_add",
  waden: (e) => e.pattern === "calves",
  druecken_h: (e) => (e.pattern === "horizontal_push" || e.pattern === "incline_push") && e.mechanics === "compound" && e.gruppe === "brust",
  druecken_v: (e) => e.pattern === "vertical_push" && e.mechanics === "compound",
  ziehen_h: (e) => e.pattern === "horizontal_pull" && e.mechanics === "compound" && e.id !== "face-pull",
  ziehen_v: (e) => e.pattern === "vertical_pull" && e.mechanics === "compound",
  // Seitliche und hintere Schulter getrennt. Vorher war beides ein Platz, und
  // am Push Tag stand Reverse Fly, eine Zugübung, am Pull Tag Seitheben.
  seitlich: (e) => e.pattern === "shoulder_isolation" && e.primaryMuscles.some((m) => /seitliche Schulter/.test(m)),
  hintere: (e) => (e.pattern === "shoulder_isolation" && e.primaryMuscles.some((m) => /hintere Schulter/.test(m))) || e.id === "face-pull",
  brust_iso: (e) => e.pattern === "chest_isolation",
  bizeps: (e) => e.pattern === "elbow_flexion",
  trizeps: (e) => e.pattern === "elbow_extension",
  rumpf: (e) => e.pattern.startsWith("core_"),
};

/** Welche Plätze zu einer Partie gehören, die schwerste zuerst. */
export const FOKUS_PLAETZE: Record<FokusGruppe, Platz[]> = {
  beine: ["kniebeuge", "huefte", "einbein", "beinbeuger", "beinstrecker", "waden"],
  po: ["huefte", "einbein", "adduktoren"],
  brust: ["druecken_h", "brust_iso"],
  ruecken: ["ziehen_v", "ziehen_h"],
  schultern: ["druecken_v", "seitlich", "hintere"],
  arme: ["bizeps", "trizeps"],
  rumpf: ["rumpf"],
};

const OBEN: ReadonlySet<Platz> = new Set<Platz>(["druecken_h", "druecken_v", "ziehen_h", "ziehen_v", "seitlich", "hintere", "brust_iso", "bizeps", "trizeps"]);
const UNTEN: ReadonlySet<Platz> = new Set<Platz>(["kniebeuge", "huefte", "einbein", "beinbeuger", "beinstrecker", "adduktoren", "waden"]);

/** Ob ein Platz zu einer der Fokuspartien gehört. Der Rumpf nie, siehe `einheitBauen`. */
function imFokus(platz: Platz, fokus: FokusGruppe[] | undefined): boolean {
  if (platz === "rumpf") return false;
  return (fokus ?? []).some((f) => FOKUS_PLAETZE[f]?.includes(platz));
}

/** Mehrgelenkige Plätze zuerst, Isolation hinten. */
const ISOLATION: ReadonlySet<Platz> = new Set<Platz>([
  "beinbeuger", "beinstrecker", "adduktoren", "waden", "seitlich", "hintere", "brust_iso", "bizeps", "trizeps", "rumpf",
]);

/**
 * Wie viel eine Übung auf diesem Platz dem Körper abverlangt, kleiner heisst
 * schwerer. Beine und Hüfte bewegen die meiste Masse, danach Drücken und
 * Ziehen über den Oberkörper. In der Isolation kommen grosse Muskeln vor
 * kleinen: Beinbeuger und Brust vor Schulter, Schulter vor Armen, Waden zum
 * Schluss. Die Rumpfübung steht ganz hinten, weil ein müder Rumpf jede
 * Grundübung danach unsicherer macht. So sind auch die Pläne von Coach Aaron
 * aufgebaut, nach denen sich diese Regel richtet.
 */
const SCHWERE: Record<Platz, number> = {
  kniebeuge: 0, huefte: 0, einbein: 1, druecken_h: 2, ziehen_h: 2, ziehen_v: 2, druecken_v: 3,
  beinbeuger: 4, beinstrecker: 4.1, adduktoren: 4.4, brust_iso: 4.2, hintere: 4.3, seitlich: 4.3,
  trizeps: 4.6, bizeps: 4.6, waden: 4.8, rumpf: 5,
};

/**
 * Was beim Kürzen zuerst wegfällt, höher heisst eher. Waden und Arme vor
 * Schulter und Brust, die Rumpfübung zuletzt: sie ist kurz und schützt.
 */
const VERZICHT: Record<Platz, number> = {
  waden: 9, bizeps: 8, trizeps: 8, adduktoren: 7, hintere: 6, seitlich: 6, beinstrecker: 5, brust_iso: 5,
  beinbeuger: 4, rumpf: 1, kniebeuge: 0, huefte: 0, einbein: 0, druecken_h: 0, druecken_v: 0, ziehen_h: 0, ziehen_v: 0,
};

/**
 * Schweres Kreuzheben und schwere Kniebeugen stehen nie in derselben Einheit.
 * Beide fordern Rücken und Nervensystem am stärksten, und die zweite Übung
 * wird dann müde und unsauber gemacht. Eine Regel aus der Praxis von Coach
 * Aaron, keine Studie. Rumänisches Kreuzheben, Hip Thrust oder Beinpresse
 * bleiben mit der Kniebeuge kombinierbar, sie gehen mit weniger Last.
 */
export const SCHWER_HEBEN: ReadonlySet<string> = new Set(["kreuzheben", "sumo-kreuzheben", "trap-bar-kreuzheben"]);
export const SCHWER_BEUGEN: ReadonlySet<string> = new Set(["kniebeuge-langhantel", "frontkniebeuge"]);

/** Ob eine Übung neben den schon gewählten gegen die Regel oben verstösst. */
export function zuSchwerZusammen(id: string, andere: Iterable<string>): boolean {
  const liste = [...andere];
  if (SCHWER_HEBEN.has(id)) return liste.some((x) => SCHWER_BEUGEN.has(x));
  if (SCHWER_BEUGEN.has(id)) return liste.some((x) => SCHWER_HEBEN.has(x));
  return false;
}

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

interface Tagesvorlage {
  titel: string;
  fokus: string;
  plaetze: Platz[];
  /**
   * Was dazukommt, wenn die Zeit reicht, in dieser Reihenfolge. Ohne diese
   * Liste waren 90 Minuten derselbe Plan wie 60, rund 55 Minuten lang.
   */
  extra?: Platz[];
}

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
  1: [K_A],
  2: [K_A, K_B],
  3: [K_A, K_B, K_C],
  4: [K_A, K_B, K_C, K_D],
  5: [K_A, K_B, K_C, K_D, K_E],
};

// Pro Tag ein Hauptplatz für die Beine, ein Drücken, ein Ziehen, danach Zubehör. Mehr
// Beinplätze ließen die Beine auf das Doppelte der Brust kommen, und der Plan wäre
// beim Zählen der Sätze schief, obwohl jeder einzelne Tag vernünftig aussah.
const GK_A: Tagesvorlage = {
  titel: "Ganzkörper A", fokus: "Kniebeuge, Brust, Rücken",
  plaetze: ["kniebeuge", "druecken_h", "ziehen_h", "seitlich", "trizeps", "waden", "rumpf"],
  extra: ["druecken_v", "beinbeuger", "bizeps", "hintere"],
};
const GK_B: Tagesvorlage = {
  titel: "Ganzkörper B", fokus: "Hüfte, Schulter, Rücken",
  plaetze: ["huefte", "druecken_v", "ziehen_v", "brust_iso", "bizeps", "beinbeuger", "rumpf"],
  extra: ["druecken_h", "ziehen_h", "trizeps", "hintere"],
};
const GK_C: Tagesvorlage = {
  titel: "Ganzkörper C", fokus: "Einbein, Brust, Rücken",
  plaetze: ["einbein", "druecken_h", "ziehen_v", "seitlich", "beinbeuger", "bizeps", "rumpf"],
  extra: ["ziehen_h", "trizeps", "brust_iso", "waden"],
};
const OBER_A: Tagesvorlage = {
  titel: "Oberkörper A", fokus: "Brust und Rücken",
  plaetze: ["druecken_h", "ziehen_h", "druecken_v", "ziehen_v", "seitlich", "trizeps", "bizeps"],
  extra: ["brust_iso", "hintere", "rumpf"],
};
const OBER_B: Tagesvorlage = {
  titel: "Oberkörper B", fokus: "Rücken und Schulter",
  plaetze: ["ziehen_v", "druecken_h", "ziehen_h", "druecken_v", "brust_iso", "bizeps", "trizeps"],
  extra: ["seitlich", "hintere", "rumpf"],
};
const UNTER_A: Tagesvorlage = {
  titel: "Unterkörper A", fokus: "Kniebeuge und Hüfte",
  plaetze: ["kniebeuge", "huefte", "einbein", "beinbeuger", "waden", "rumpf"],
  extra: ["beinstrecker", "huefte", "adduktoren", "beinbeuger", "rumpf"],
};
const UNTER_B: Tagesvorlage = {
  titel: "Unterkörper B", fokus: "Hüfte und Einbein",
  plaetze: ["huefte", "kniebeuge", "einbein", "beinbeuger", "waden", "rumpf"],
  extra: ["beinstrecker", "huefte", "adduktoren", "beinbeuger", "rumpf"],
};
const PUSH: Tagesvorlage = {
  titel: "Push", fokus: "Brust, Schulter, Trizeps",
  plaetze: ["druecken_h", "druecken_v", "druecken_h", "brust_iso", "seitlich", "trizeps"],
  extra: ["trizeps", "brust_iso", "seitlich", "rumpf"],
};
const PULL: Tagesvorlage = {
  titel: "Pull", fokus: "Rücken, hintere Schulter, Bizeps",
  plaetze: ["ziehen_v", "ziehen_h", "ziehen_h", "hintere", "bizeps", "rumpf"],
  extra: ["ziehen_v", "bizeps", "hintere"],
};
const BEINE: Tagesvorlage = {
  titel: "Beine", fokus: "Beine und Hüfte",
  plaetze: ["kniebeuge", "huefte", "einbein", "beinbeuger", "waden", "rumpf"],
  extra: ["beinstrecker", "huefte", "adduktoren", "beinbeuger", "rumpf"],
};
// Bei fünf Tagen gibt es Oberkörper und Unterkörper nur einmal. "Oberkörper
// B" ohne ein A daneben las sich wie ein Fehler.
const OBER_5: Tagesvorlage = { ...OBER_B, titel: "Oberkörper" };
const UNTER_5: Tagesvorlage = { ...UNTER_B, titel: "Unterkörper" };

// Einmal die Woche: ein einfacher Ganzkörperplan aus Grundübungen, je
// Bewegung eine. Wer nur einmal kommt, braucht keine Isolation, sondern jede
// große Bewegung einmal. Die Übungen bleiben über die Monate gleich, siehe
// `planAktualisieren`.
const GK_1: Tagesvorlage = {
  titel: "Ganzkörper", fokus: "Beine, Hüfte, Drücken, Ziehen",
  plaetze: ["kniebeuge", "huefte", "druecken_h", "ziehen_v", "rumpf"],
  extra: ["ziehen_h", "druecken_v", "einbein"],
};

const VORLAGEN: Record<PlanTage, Tagesvorlage[]> = {
  1: [GK_1],
  2: [GK_A, GK_B],
  3: [GK_A, GK_B, GK_C],
  4: [OBER_A, UNTER_A, OBER_B, UNTER_B],
  5: [PUSH, PULL, BEINE, OBER_5, UNTER_5],
};

const FOKUS_WORT: Record<Platz, string> = {
  kniebeuge: "Knie", einbein: "Knie", huefte: "Hüfte", beinbeuger: "Beinbeuger", beinstrecker: "Knie",
  adduktoren: "Hüfte", waden: "Waden",
  druecken_h: "Drücken", druecken_v: "Drücken", ziehen_h: "Ziehen", ziehen_v: "Ziehen",
  seitlich: "Schulter", hintere: "Schulter", brust_iso: "Brust", bizeps: "Arme", trizeps: "Arme", rumpf: "Rumpf",
};

function fokusAus(plaetze: Platz[]): string {
  return [...new Set(plaetze.map((p) => FOKUS_WORT[p]))].join(", ");
}

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

interface BauKontext {
  wunsch: PlanWunsch;
  erlaubt: PlanUebung[];
  /** Wie oft eine Übung in dieser Woche schon vorkam. Wird fortgeschrieben. */
  imPlan: Map<string, number>;
  kurz: boolean;
  einsteiger: boolean;
  variante: number;
}

/**
 * Eine Einheit aus einer Vorlage. Dieselbe Rechnung für jeden Tag des
 * Wochenplans und für das Einzeltraining, damit beide denselben Regeln
 * folgen: Fokus zuerst, dann schwer vor leicht, Zeit füllen oder kürzen.
 */
function einheitBauen(vorlage: Tagesvorlage, { wunsch, erlaubt, imPlan, kurz, einsteiger, variante }: BauKontext): PlanEinheit {
  const gewaehlt: Array<{ e: PlanUebung; platz: Platz }> = [];
  const benutzt = new Set<string>();

  const kandidatenFuer = (platz: Platz): PlanUebung[] => {
    const alle = erlaubt.filter((e) => PASST[platz](e) && !benutzt.has(e.id) && !zuSchwerZusammen(e.id, benutzt));
    if (!einsteiger || !GRUNDPLATZ.has(platz) || !alle.length) return alle;
    // Einsteiger: nur die am stärksten geführte Stufe, die es für diesen Platz gibt.
    const beste = Math.min(...alle.map(fuehrung));
    return alle.filter((e) => fuehrung(e) === beste);
  };

  const waehle = (vorlagePlatz: Platz): { e: PlanUebung; platz: Platz } | null => {
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
      if (gefuehrtBekannt) return null;
    }
    if (!kandidaten.length) return null;
    // Wer schon in dieser Woche dran war, kommt später. Danach zählt der Abstand
    // zum eigenen Niveau, dann ein stabiler Streuwert für Abwechslung.
    const wertung = (e: PlanUebung) =>
      (imPlan.get(e.id) ?? 0) * 100 + Math.abs(RANG[e.level] - RANG[wunsch.niveau]) * 20 + streu(`${e.id}|${vorlage.titel}`, variante) / 100;
    kandidaten.sort((a, b) => wertung(a) - wertung(b));
    const treffer = kandidaten[0];
    if (!treffer) return null;
    benutzt.add(treffer.id);
    return { e: treffer, platz };
  };

  for (const vorlagePlatz of vorlage.plaetze) {
    const w = waehle(vorlagePlatz);
    if (w) gewaehlt.push(w);
  }
  const zusatz: Array<{ e: PlanUebung; platz: Platz }> = [];
  if (!kurz) {
    // Fokuspartien kommen als erste Zusatzplätze, aber nur in Einheiten, die
    // diese Körperhälfte ohnehin trainieren. Bizeps am Beintag hiesse, dass
    // der Plan den Aufbau der Woche vergisst, um eine Vorliebe zu bedienen.
    const haelfte = (p: Platz) => (OBEN.has(p) ? OBEN : UNTEN.has(p) ? UNTEN : null);
    const fokusExtra = (wunsch.fokus ?? []).flatMap((f) => FOKUS_PLAETZE[f] ?? [])
      .filter((p) => p !== "rumpf" && !vorlage.plaetze.includes(p) && vorlage.plaetze.some((v) => haelfte(p)?.has(v)))
      .filter((p, i, a) => a.indexOf(p) === i)
      .slice(0, 2);
    for (const vorlagePlatz of [...fokusExtra, ...(vorlage.extra ?? [])]) {
      const w = waehle(vorlagePlatz);
      if (w) zusatz.push(w);
    }
  }
  // Stabil sortiert: bei gleicher Schwere bleibt die Reihenfolge der Vorlage.
  // Eine Hüftübung ohne Last von aussen, Hyperextension oder Glute Bridge,
  // ist leichter als die Beinpresse und rückt hinter sie.
  // Fokus zuerst: wer Arme aufbauen will, trainiert sie frisch, vor allem
  // anderen. Unter den Fokusübungen und unter dem Rest gilt weiter schwer vor
  // leicht. Der Rumpf bleibt auch als Fokus am Ende: ein müder Rumpf macht
  // jede schwere Übung danach unsicherer.
  const schwere = ({ e, platz }: { e: PlanUebung; platz: Platz }) =>
    (imFokus(platz, wunsch.fokus) ? -100 : 0)
    + SCHWERE[platz] + (platz === "huefte" && (e.mechanics !== "compound" || e.equipment === "bodyweight") ? 1.5 : 0);
  const ordnen = <T extends { e: PlanUebung; platz: Platz }>(liste: T[]): T[] => [...liste].sort((a, b) => schwere(a) - schwere(b));

  const baue = (liste: Array<{ e: PlanUebung; platz: Platz }>, saetzeMinus: number, pauseMax = Infinity, grundPlus = 0, isoPlus = 0): PlanPosition[] =>
    ordnen(liste).map(({ e, platz }) => {
      const d = dosis(e, platz, wunsch);
      const grund = !ISOLATION.has(platz) && e.mechanics !== "isometric";
      return {
        // Gekürzt wird nicht unter zwei Sätze, ausser die Übung hatte nie mehr.
        id: e.id, name: e.name,
        saetze: Math.max(Math.min(2, d.saetze), d.saetze - saetzeMinus) + (grund ? grundPlus : ISOLATION.has(platz) ? isoPlus : 0),
        wdh: d.wdh,
        pauseSek: Math.min(d.pauseSek, pauseMax), reserve: d.reserve,
      };
    });
  let positionen: PlanPosition[] = [];
  let drin = [...gewaehlt];
  if (kurz) {
    // Kurz heisst: alle fünf Bewegungen bleiben. Gekürzt werden erst die
    // Pausen, dann die Sätze, bis die Einheit passt. Unter zwei Sätze geht es
    // nur, wenn sonst gar nichts mehr passt.
    const stufen: Array<[number, number]> = [[0, Infinity], [0, 120], [0, 90], [1, 120], [1, 90], [1, 75], [1, 60], [2, 60]];
    for (const [minus, pause] of stufen) {
      positionen = baue(drin, minus, pause);
      if (dauerMin(positionen) <= wunsch.minuten) break;
    }
  } else {
    // Zu lang: erst die verzichtbarste Isolation raus, Waden und Arme vor
    // Schulter und Brust, die Rumpfübung zuletzt. Grundübungen bleiben.
    const passt = (liste: typeof drin, minus = 0, plus = 0, iso = 0) => dauerMin(baue(liste, minus, Infinity, plus, iso)) <= wunsch.minuten;
    // Eine Fokusübung fällt als letzte Isolation weg, nach dem Rumpf.
    const verzicht = (g: { platz: Platz }) => (imFokus(g.platz, wunsch.fokus) && VERZICHT[g.platz] > 0 ? 0.5 : VERZICHT[g.platz]);
    while (!passt(drin) && drin.some((g) => verzicht(g) > 0) && drin.length > 3) {
      const raus = drin.reduce((a, b) => (verzicht(b) >= verzicht(a) ? b : a));
      drin = drin.filter((g) => g !== raus);
    }
    const minus = passt(drin) ? 0 : 1;
    // Zu kurz: Zusatzübungen in der Reihenfolge der Vorlage, solange sie
    // in die Zeit passen. Danach ein vierter Satz auf den Grundübungen,
    // wenn auch der noch passt, zuletzt ein dritter Satz auf der Isolation.
    // So wird eine Einheit von 90 Minuten auch 90 Minuten lang, und die
    // Reihenfolge bleibt: schwer zuerst, Isolation danach, Rumpf am Ende.
    // In der Entlastungswoche wird nicht aufgefüllt: sie soll kürzer sein.
    const fuellen = minus === 0 && !wunsch.deload;
    if (fuellen) for (const z of zusatz) if (passt([...drin, z], minus)) drin.push(z);
    const plus = fuellen && passt(drin, 0, 1) ? 1 : 0;
    const iso = fuellen && passt(drin, 0, plus, 1) ? 1 : 0;
    positionen = baue(drin, minus, Infinity, plus, iso);
  }
  for (const p of positionen) imPlan.set(p.id, (imPlan.get(p.id) ?? 0) + 1);
  // Fällt ein Platz weg, etwa die Kniebeuge bei Knieschmerzen, darf der
  // Fokus ihn nicht mehr nennen. Sonst steht "Knie" über einer Einheit ohne
  // eine einzige Knieübung.
  const genommen = ordnen(drin).map((g) => g.platz);
  const fehlt = vorlage.plaetze.some((p) => !genommen.includes(p) && !genommen.includes(EINSTEIGER_ERSATZ[p] as Platz));
  const fokus = fehlt ? fokusAus(genommen) : vorlage.fokus;
  return { titel: vorlage.titel, fokus, positionen, dauerMin: dauerMin(positionen) };
}

/**
 * Baut den Plan. `uebungen` ist die Datenbank, damit dieses Paket keine
 * Übungsdaten kennen muss und die Regeln ohne Browser testbar bleiben.
 */
export function uebungsplanBauen(wunsch: PlanWunsch, uebungen: PlanUebung[]): Uebungsplan {
  const variante = wunsch.variante ?? 0;
  const erlaubt = uebungen.filter((e) => RANG[e.level] <= RANG[wunsch.niveau] && uebungErlaubt(e, wunsch));
  const imPlan = new Map<string, number>();
  const einheiten: PlanEinheit[] = [];

  const kurz = wunsch.minuten <= KURZ_BIS_MIN;
  const einsteiger = wunsch.niveau === "beginner";

  for (const vorlage of (kurz ? KURZ_VORLAGEN : VORLAGEN)[wunsch.tage]) {
    einheiten.push(einheitBauen(vorlage, { wunsch, erlaubt, imPlan, kurz, einsteiger, variante }));
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
  // Kürzer als gewählt sagen statt mit Sätzen auffüllen, die nichts bringen.
  // Bei Einsteigern fehlen für manche Tage genug geführte Übungen.
  const zuKurz = w.minuten > KURZ_BIS_MIN && !w.deload ? einheiten.filter((e) => e.dauerMin < w.minuten - 15) : [];
  if (zuKurz.length) {
    aus.push(`${zuKurz.map((e) => `${e.titel} dauert rund ${e.dauerMin} Minuten`).join(", ")}. Mehr Übungen derselben Art bringen an diesem Tag keinen Vorteil, die übrige Zeit passt gut für Mobilität oder lockeres Ausdauertraining.`);
  }
  if (w.minuten <= KURZ_BIS_MIN) {
    aus.push(`Bis ${KURZ_BIS_MIN} Minuten enthält jede Einheit nur Grundübungen: Knie, Hüfte, Drücken, Ziehen und eine Rumpfübung. Die schwerste Übung kommt zuerst. Isolation ginge in dieser Zeit auf Kosten einer Grundbewegung.`);
  }
  if (w.niveau === "beginner") {
    aus.push("Als Einsteiger bekommst du für Beine, Drücken und Ziehen geführte Geräte, wo es welche gibt. Die Bahn ist vorgegeben, die Technik kann weniger schiefgehen.");
  }
  if (w.beschwerden?.length) {
    aus.push(
      `Wegen Beschwerden an ${w.beschwerden.map((b) => BESCHWERDE_NAME[b]).join(", ")} sind Übungen raus, die diese Stelle stark belasten. `
      + "Das ist eine Regel dieser App und keine Diagnose. Tut etwas trotzdem weh, lass die Übung weg. Bleiben die Schmerzen, gehört das zu Arzt oder Physiotherapie.",
    );
  }
  if (w.ort === "zuhause") aus.push("Für zu Hause stehen nur Übungen mit Kurzhanteln, Band und Körpergewicht im Plan.");
  if (w.ort === "ohne") aus.push("Ohne Geräte stehen nur Übungen mit dem eigenen Körpergewicht im Plan. Für Rücken und Beine fehlt damit oft der Widerstand, ein Band hilft schon viel.");
  if (w.fokus?.length) {
    const namen = w.fokus.map((f) => FOKUS_NAME[f]).join(", ");
    aus.push(`Dein Fokus: ${namen}. Diese Übungen kommen in jeder passenden Einheit zuerst, solange du frisch bist. Danach geht es wie immer von schwer nach leicht.`);
    if (w.minuten <= KURZ_BIS_MIN && w.fokus.includes("arme")) aus.push("Bis 45 Minuten gibt es keine eigenen Armübungen. Drücken und Ziehen trainieren die Arme mit, für mehr braucht es längere Einheiten.");
    if (w.fokus.includes("rumpf")) aus.push("Core bleibt auch als Fokus am Ende der Einheit. Ein müder Rumpf macht jede schwere Übung danach unsicherer.");
  }
  if (w.tage === 1) aus.push("Einmal die Woche: jede große Bewegung einmal, ohne Isolation. Die Übungen bleiben über die Monate gleich, damit du an genau diesen stärker wirst.");
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

/**
 * Rechnet Dauer und Wochensätze neu, nachdem jemand den Plan von Hand
 * geändert hat. Die Positionen bleiben, wie sie sind: eine Übung, die der
 * Nutzer selbst gewählt hat, wird nicht wieder herausgerechnet.
 */
export function planNachrechnen(plan: Uebungsplan, uebungen: PlanUebung[]): Uebungsplan {
  const nachId = new Map(uebungen.map((e) => [e.id, e]));
  const einheiten = plan.einheiten.map((e) => ({ ...e, dauerMin: dauerMin(e.positionen) }));
  const wochensaetze: Record<string, number> = {};
  for (const einheit of einheiten) {
    for (const p of einheit.positionen) {
      const gruppe = nachId.get(p.id)?.gruppe;
      if (gruppe) wochensaetze[gruppe] = (wochensaetze[gruppe] ?? 0) + p.saetze;
    }
  }
  return { ...plan, einheiten, wochensaetze, hinweise: hinweise(plan.wunsch, einheiten, wochensaetze) };
}

/**
 * Übungen, die eine Position ersetzen können: dasselbe Bewegungsmuster, am
 * Trainingsort machbar und ohne die angegebenen Beschwerden. Die eigene Stufe
 * zuerst, dann die nächste. Eine Übung, die schon in derselben Einheit steht,
 * fehlt, sonst stünde sie dort zweimal.
 */
export function alternativen(plan: Uebungsplan, einheit: number, id: string, uebungen: PlanUebung[]): PlanUebung[] {
  const alt = uebungen.find((e) => e.id === id);
  if (!alt) return [];
  const schon = new Set((plan.einheiten[einheit]?.positionen ?? []).map((p) => p.id));
  return uebungen
    .filter((e) => e.pattern === alt.pattern && !schon.has(e.id) && uebungErlaubt(e, plan.wunsch)
      && RANG[e.level] <= RANG[plan.wunsch.niveau] + 1
      && !zuSchwerZusammen(e.id, [...schon].filter((x) => x !== id)))
    .sort((a, b) => Math.abs(RANG[a.level] - RANG[plan.wunsch.niveau]) - Math.abs(RANG[b.level] - RANG[plan.wunsch.niveau]));
}

/** Die Dosis für eine Übung, die von Hand dazukommt. Dieselbe Regel wie beim Bauen. */
export function positionFuer(e: PlanUebung, w: PlanWunsch): PlanPosition {
  const platz: Platz = e.mechanics === "compound" ? "kniebeuge" : "bizeps";
  const d = dosis(e, platz, w);
  return { id: e.id, name: e.name, saetze: d.saetze, wdh: d.wdh, pauseSek: d.pauseSek, reserve: d.reserve };
}

/* ---------- Ein Training für heute ---------- */

export interface EinzelWunsch {
  minuten: number;
  /** Was heute drankommen soll. */
  gruppen: FokusGruppe[];
  niveau: PlanNiveau;
  ziel: PlanZiel;
  ort?: PlanOrt;
  beschwerden?: Beschwerde[];
  meiden?: string[];
  fokus?: FokusGruppe[];
  variante?: number;
}

export const EINZEL_TITEL = "Training für heute";

/**
 * Eine einzelne Einheit für heute, aus Zeit und den Partien, die diese Woche
 * noch fehlen. Für den Tag, an dem der Plan nicht passt: nur eine halbe
 * Stunde, und Push und Pull waren schon dran.
 *
 * Je Partie kommt zuerst ihr schwerster Platz, dann reihum die nächsten,
 * solange die Zeit reicht. Der Rumpf steht als Grundplatz da, wenn er
 * gewählt ist, und immer am Ende. Gerechnet wird mit `einheitBauen`, also
 * mit denselben Regeln wie im Wochenplan: Fokus zuerst, schwer vor leicht,
 * schweres Heben und Beugen nie zusammen, Einsteiger an geführte Geräte.
 *
 * Anders als im Wochenplan gibt es auch unter 45 Minuten Isolation, wenn
 * jemand nur Arme gewählt hat. Wer Arme sagt, will Arme, und für sie gibt es
 * keine Grundübung. Ob eine Isolation in die Zeit passt, entscheidet wie
 * sonst die Rechnung.
 */
export function einzeltrainingBauen(w: EinzelWunsch, uebungen: PlanUebung[]): PlanEinheit | null {
  const gruppen = [...new Set(w.gruppen)].filter((g) => FOKUS_PLAETZE[g]);
  if (!gruppen.length) return null;
  const ohneRumpf = gruppen.filter((g) => g !== "rumpf");
  const listen = ohneRumpf.map((g) => FOKUS_PLAETZE[g]);
  const plaetze: Platz[] = [];
  const extra: Platz[] = [];
  const nehmen = (ziel: Platz[], p: Platz | undefined) => { if (p && !plaetze.includes(p) && !extra.includes(p)) ziel.push(p); };
  for (const l of listen) nehmen(plaetze, l[0]);
  const tiefe = Math.max(0, ...listen.map((l) => l.length));
  for (let i = 1; i < tiefe; i++) for (const l of listen) nehmen(extra, l[i]);
  // Ein zweiter Durchgang mit denselben Plätzen und anderen Übungen, falls
  // noch Zeit ist. Sonst wären 30 Minuten Arme nach zwei Übungen zu Ende.
  for (const l of listen) for (const p of l) extra.push(p);
  if (gruppen.includes("rumpf")) plaetze.push("rumpf");
  const wunsch: PlanWunsch = {
    tage: 1, minuten: w.minuten, niveau: w.niveau, ziel: w.ziel, ort: w.ort, beschwerden: w.beschwerden,
    meiden: w.meiden, fokus: w.fokus, variante: w.variante ?? 0,
  };
  const erlaubt = uebungen.filter((e) => RANG[e.level] <= RANG[w.niveau] && uebungErlaubt(e, wunsch));
  const vorlage: Tagesvorlage = { titel: EINZEL_TITEL, fokus: gruppen.map((g) => FOKUS_NAME[g]).join(", "), plaetze, extra };
  const einheit = einheitBauen(vorlage, {
    wunsch, erlaubt, imPlan: new Map(), kurz: false, einsteiger: w.niveau === "beginner", variante: w.variante ?? 0,
  });
  return einheit.positionen.length ? einheit : null;
}

/** Welche Partie ein Bewegungsmuster vor allem trifft. Für den Blick auf die Woche. */
const MUSTER_PARTIE: Record<string, FokusGruppe> = {
  knee_dominant: "beine", unilateral_legs: "beine", knee_flexion: "beine", calves: "beine", plyometric: "beine",
  hip_dominant: "po", hip_abd_add: "po",
  horizontal_push: "brust", incline_push: "brust", chest_isolation: "brust",
  vertical_push: "schultern", shoulder_isolation: "schultern",
  horizontal_pull: "ruecken", vertical_pull: "ruecken",
  elbow_flexion: "arme", elbow_extension: "arme",
};

/**
 * Sätze je Partie in der laufenden Woche, ab Montag, aus dem Protokoll. Was
 * die Uhr als Training meldet, trägt keine Übungen und zählt hier nicht: aus
 * "60 Minuten Krafttraining" lässt sich nicht ablesen, ob es Beine waren.
 */
export function wocheTrainiert(
  log: Array<{ datum: string; uebung: string; saetze: unknown[] }>,
  uebungen: PlanUebung[],
  heute: string,
): Partial<Record<FokusGruppe, number>> {
  const d = new Date(`${heute}T12:00:00Z`);
  const montag = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
  const nachId = new Map(uebungen.map((e) => [e.id, e]));
  const aus: Partial<Record<FokusGruppe, number>> = {};
  for (const e of log) {
    if (e.datum < montag || e.datum > heute) continue;
    const u = nachId.get(e.uebung);
    if (!u) continue;
    const partie = u.pattern.startsWith("core_") ? "rumpf" : MUSTER_PARTIE[u.pattern];
    if (partie) aus[partie] = (aus[partie] ?? 0) + e.saetze.length;
  }
  return aus;
}

/** Was diese Woche noch fehlt, in der festen Reihenfolge der Partien. */
export function fehlendePartien(trainiert: Partial<Record<FokusGruppe, number>>): FokusGruppe[] {
  return (Object.keys(FOKUS_NAME) as FokusGruppe[]).filter((g) => !trainiert[g]);
}
