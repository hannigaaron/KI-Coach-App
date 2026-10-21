/**
 * Der Guten Morgen Check-in.
 *
 * Vier Fragen, je 1 bis 5, eine halbe Stunde nach dem Aufstehen: wie gut
 * geschlafen, wie schnell eingeschlafen, wie erholt aufgewacht, wie gesund.
 * Daraus macht die App einen Morgenwert, die Belastbarkeit für den Tag, eine
 * Anweisung für das geplante Training und höchstens drei Tipps.
 *
 * Fünf Stufen und nicht zehn. Wer gerade aufgewacht ist, unterscheidet
 * zwischen "schlecht", "geht" und "gut", aber nicht zwischen 6 und 7, und
 * eine Skala, deren Stufen niemand trennen kann, misst Zufall.
 *
 * Der Wert misst nichts. Er fasst zusammen, was der Nutzer selbst angegeben
 * hat, und das steht in jeder Ausgabe. Dieselbe Haltung wie in
 * `bereitschaft.ts`.
 *
 * Die Gewichte sind eine Regel der App: erholt aufgewacht 35, Schlaf 30,
 * gesund 20, Einschlafen 15. Erholt wiegt am meisten, weil es die Frage nach
 * dem Heute ist, Einschlafen am wenigsten, weil es über gestern Abend mehr
 * sagt als über diesen Tag.
 */

export interface MorgenAntworten {
  /** Wie gut geschlafen, 1 schlecht bis 5 sehr gut. */
  schlaf: number;
  /** Wie schnell eingeschlafen, 1 lange wach bis 5 sofort. */
  einschlafen: number;
  /** Wie erholt aufgewacht, 1 gar nicht bis 5 voll erholt. */
  erholt: number;
  /** Wie gesund, 1 krank bis 5 topfit. */
  gesund: number;
}

export const MORGEN_FRAGEN: Array<{ id: keyof MorgenAntworten; frage: string; links: string; rechts: string }> = [
  { id: "schlaf", frage: "Wie gut hast du geschlafen?", links: "schlecht", rechts: "sehr gut" },
  { id: "einschlafen", frage: "Wie schnell bist du eingeschlafen?", links: "lange wach", rechts: "sofort" },
  { id: "erholt", frage: "Wie erholt bist du aufgewacht?", links: "gar nicht", rechts: "voll erholt" },
  { id: "gesund", frage: "Wie gesund fühlst du dich?", links: "krank", rechts: "topfit" },
];

const GEWICHTE: Record<keyof MorgenAntworten, number> = { erholt: 35, schlaf: 30, gesund: 20, einschlafen: 15 };

/** Eine halbe Stunde nach dem Aufstehen. Früher ist man noch nicht wach genug für ehrliche Antworten. */
export const MORGEN_ABSTAND_MIN = 30;

export type Belastbarkeit = "hoch" | "normal" | "reduziert" | "niedrig" | "schonen";

export const BELASTBARKEIT_NAME: Record<Belastbarkeit, string> = {
  hoch: "Hoch", normal: "Normal", reduziert: "Reduziert", niedrig: "Niedrig", schonen: "Schonen",
};

export interface GeplantesTraining {
  /** "strength", "cardio", "team_sport", "mobility" */
  art: string;
  minuten: number;
  uhrzeit?: string;
  /** Titel der Einheit aus dem Plan, etwa "Ganzkörper A". */
  titel?: string;
}

export interface MorgenEingabe {
  antworten: MorgenAntworten;
  /** Schlafdauer aus Apple Health, wenn vorhanden. */
  schlafMinuten?: number | null;
  /** Die Schlafenszeit von heute Abend, "HH:MM". */
  schlafenszeit?: string | null;
  /** Was heute im Wochenplan steht. Leer heisst Ruhetag. */
  training?: GeplantesTraining[];
}

export interface MorgenErgebnis {
  wert: number;
  belastbarkeit: Belastbarkeit;
  /** Ein Satz, warum. Hängt an den Antworten. */
  warum: string;
  training: string[];
  tipps: string[];
  /** Für den bestehenden Check-in und die Bereitschaft, auf der Skala 1 bis 10. */
  alsZehner: { sleepQuality: number; energy: number };
  /** Bei Fitheit 1 oder 2: mittags wird nachgefragt, und erst dann entscheidet sich das Training. */
  nachfrage: boolean;
  /** Nach der Nachfrage: ob das Training an diesem Tag gestrichen ist. */
  gestrichen?: boolean;
}

/**
 * Wann nachgefragt wird, wenn es morgens nicht gut aussah. Mittags, weil
 * sich bis dahin zeigt, ob es eine schlechte Nacht war oder ein Infekt, und
 * weil die meisten danach erst trainieren. Eine Regel der App.
 */
export const NACHFRAGE_UHRZEIT = "12:30";

/** Ob morgens so wenig Fitheit angegeben wurde, dass mittags nachgefragt wird. */
export const nachfrageNoetig = (a: Pick<MorgenAntworten, "gesund">) => a.gesund <= 2;

/** Ob alle vier Antworten da und gültig sind. */
export function morgenVollstaendig(a: Partial<MorgenAntworten> | null | undefined): a is MorgenAntworten {
  return Boolean(a) && MORGEN_FRAGEN.every((f) => {
    const v = (a as Record<string, unknown>)[f.id];
    return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5;
  });
}

/** 1 bis 5 auf 0 bis 100. */
const prozent = (v: number) => Math.round(((v - 1) / 4) * 100);
/** 1 bis 5 auf 1 bis 10, für die Felder, die die App schon kennt. 3 wird 6, die Mitte bleibt Mitte. */
export const aufZehn = (v: number) => Math.round(1 + ((v - 1) * 9) / 4);

export function morgenWert(a: MorgenAntworten): number {
  let summe = 0;
  let gewicht = 0;
  for (const f of MORGEN_FRAGEN) {
    summe += prozent(a[f.id]) * GEWICHTE[f.id];
    gewicht += GEWICHTE[f.id];
  }
  return Math.round(summe / gewicht);
}

const minuten = (uhrzeit: string) => {
  const [h, m] = uhrzeit.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const uhrzeit = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Die Uhrzeit des Check-ins: Aufstehzeit plus eine halbe Stunde. */
export function morgenUhrzeit(aufstehen: string): string {
  return uhrzeit(minuten(aufstehen) + MORGEN_ABSTAND_MIN);
}

const RANG: Belastbarkeit[] = ["schonen", "niedrig", "reduziert", "normal", "hoch"];
const hoechstens = (b: Belastbarkeit, grenze: Belastbarkeit): Belastbarkeit =>
  RANG.indexOf(b) > RANG.indexOf(grenze) ? grenze : b;

export function morgenAuswerten(e: MorgenEingabe): MorgenErgebnis {
  const a = e.antworten;
  const wert = morgenWert(a);
  // Unter 50 heisst niedrig: Krafttraining nur leicht und nur, wenn man sich
  // fit genug fühlt. Die Grenzen sind Regeln von Coach Aaron, keine Studie.
  let b: Belastbarkeit = wert >= 75 ? "hoch" : wert >= 55 ? "normal" : wert >= 50 ? "reduziert" : "niedrig";
  const gruende: string[] = [];

  // Schonen heisst krank, und nur das. Krank schlägt jeden Schnitt: wer
  // sich krank fühlt und gut geschlafen hat, ist trotzdem krank, und ein
  // Mittelwert würde das verstecken. Das Training wird gestrichen.
  // Bei 2 und 3 wird angepasst und nicht gestrichen.
  if (a.gesund === 1) { b = "schonen"; gruende.push("du dich krank fühlst"); }
  else if (a.gesund === 2) { b = hoechstens(b, "reduziert"); gruende.push("du dich nicht ganz fit fühlst"); }

  // Unter sechs Stunden laut Uhr, Craven und andere, Sports Medicine 2022.
  const kurz = e.schlafMinuten !== null && e.schlafMinuten !== undefined && e.schlafMinuten > 0 && e.schlafMinuten < 360;
  if (kurz) { b = hoechstens(b, "reduziert"); gruende.push(`du laut Apple Health nur ${dauer(e.schlafMinuten!)} geschlafen hast`); }

  if (a.erholt <= 2) gruende.push("du wenig erholt aufgewacht bist");
  if (a.schlaf <= 2) gruende.push("die Nacht schlecht war");
  if (!gruende.length && b === "hoch") gruende.push("alle vier Antworten oben liegen");

  const warum = gruende.length ? `Weil ${verbinden(gruende)}.` : "Aus deinen vier Antworten.";

  const nachfrage = nachfrageNoetig(a);
  return {
    wert, belastbarkeit: b, warum,
    // Fitheit 1 oder 2: noch keine Entscheidung. Ein Infekt zeigt sich oft
    // erst im Lauf des Vormittags, eine schlechte Nacht ist mittags oft vorbei.
    training: nachfrage ? vorlaeufig(e.training ?? []) : trainingFuer(b, e.training ?? [], a),
    tipps: tippsFuer(a, b, e.schlafenszeit ?? null),
    alsZehner: { sleepQuality: aufZehn(a.schlaf), energy: aufZehn(a.erholt) },
    nachfrage,
  };
}

function vorlaeufig(geplant: GeplantesTraining[]): string[] {
  const was = geplant.length
    ? geplant.map((t) => `${t.titel ? `${ART[t.art] ?? t.art}, ${t.titel}` : ART[t.art] ?? t.art}${t.uhrzeit ? ` um ${t.uhrzeit}` : ""}`).join(" und ")
    : null;
  return [
    `${was ? `${was} ist vorerst ausgesetzt.` : "Heute steht kein Training an."} Um ${NACHFRAGE_UHRZEIT} fragt daevo nochmal, wie du dich fühlst.`
      + (was ? " Bist du dann bei 3 oder besser, darfst du trainieren. Bleibt es bei 1 oder 2, fällt das Training heute aus." : ""),
  ];
}

/**
 * Die Antwort auf die Nachfrage am Mittag. Ab 3 ist das Training frei, mit
 * angepasster Last, denn der Morgen war trotzdem schwach: höchstens
 * reduziert. Bei 1 oder 2 ist es gestrichen, und der Tag dreht sich um
 * Erholung.
 */
export function nachfrageAuswerten(e: MorgenEingabe, gesundJetzt: number): MorgenErgebnis {
  const jetzt = { ...e.antworten, gesund: gesundJetzt };
  if (gesundJetzt >= 3) {
    const r = morgenAuswerten({ ...e, antworten: jetzt });
    const b = hoechstens(r.belastbarkeit, "reduziert");
    return {
      ...r, belastbarkeit: b, nachfrage: false, gestrichen: false,
      warum: `Besser als heute Morgen, Fitheit jetzt ${gesundJetzt} von 5. Das Training ist frei, mit angepasster Last, weil der Morgen schwach war.`,
      training: trainingFuer(b, e.training ?? [], jetzt),
    };
  }
  const geplant = e.training ?? [];
  return {
    wert: morgenWert(jetzt), belastbarkeit: "schonen", nachfrage: false, gestrichen: true,
    warum: `Weil du dich auch mittags nur bei ${gesundJetzt} von 5 fühlst.`,
    training: geplant.length
      ? geplant.map((t) => `${t.titel ? `${ART[t.art] ?? t.art}, ${t.titel}` : ART[t.art] ?? t.art}${t.uhrzeit ? ` um ${t.uhrzeit}` : ""} ist heute gestrichen.`)
      : ["Heute steht kein Training an, und das bleibt so."],
    tipps: erholungsTipps(e.schlafenszeit ?? null),
    alsZehner: { sleepQuality: aufZehn(e.antworten.schlaf), energy: aufZehn(e.antworten.erholt) },
  };
}

/**
 * Der Tag gehört der Erholung: Ruhe, Vitamine aus dem Essen, gezielt
 * Supplemente, Schlaf, so wenig Stress wie möglich.
 *
 * Zink: Hemilä, JRSM Open 2017, Lutschtabletten ab dem ersten Tag
 * verkürzten Erkältungen im Mittel. Vitamin C: Hemilä und Chalker, Cochrane
 * 2013, regelmässig genommen leicht kürzere Erkältungen, als Vorbeugung für
 * die meisten ohne Wirkung. Beides steht so im Satz, ohne mehr zu versprechen.
 */
export function erholungsTipps(schlafenszeit: string | null): string[] {
  return [
    "Heute zählt Ruhe. Kein Training und kein Ersatzprogramm, auch nicht nur ein bisschen.",
    "Iss viel Obst und Gemüse, etwa Paprika, Zitrusfrüchte, Beeren und Brokkoli für Vitamin C, dazu genug Eiweiß, und trink über den Tag verteilt.",
    "Zink als Lutschtablette kann eine Erkältung etwas verkürzen, wenn du am ersten Tag beginnst, Vitamin C regelmäßig ebenfalls leicht. Mehr ist nicht belegt.",
    `${schlafenszeit ? `Heute früh ins Bett, spätestens ${uhrzeit(minuten(schlafenszeit) - 30)}.` : "Heute früh ins Bett."} Schieb, was warten kann, und sag ab, was dich stresst. Bei Fieber oder wenn es länger als ein paar Tage anhält, gehört das zum Arzt.`,
  ];
}

const ART: Record<string, string> = { strength: "Krafttraining", cardio: "Ausdauer", team_sport: "Mannschaftssport", mobility: "Mobilität" };

/**
 * Was mit dem geplanten Training passiert. Gesteuert über Sätze und
 * Wiederholungen in Reserve, dieselben Stufen wie in
 * `trainingsanpassung.ts`: reduziert heisst drei Viertel der Sätze und eine
 * Wiederholung mehr in Reserve.
 */
function trainingFuer(b: Belastbarkeit, geplant: GeplantesTraining[], a: MorgenAntworten): string[] {
  if (!geplant.length) {
    if (b === "schonen" || b === "niedrig") return ["Heute steht kein Training an, und das passt. Ruh dich aus."];
    return ["Heute steht kein Training an. Ein Spaziergang oder zehn Minuten Mobilität reichen."];
  }
  const zeilen: string[] = [];
  for (const t of geplant) {
    const name = t.titel ? `${ART[t.art] ?? t.art}, ${t.titel}` : ART[t.art] ?? t.art;
    const wann = t.uhrzeit ? ` um ${t.uhrzeit}` : "";
    if (b === "schonen") {
      zeilen.push(`${name}${wann} ist heute gestrichen. Wer sich krank fühlt, trainiert nicht, bei Fieber erst recht nicht.`);
    } else if (b === "niedrig") {
      zeilen.push(t.art === "strength"
        ? `${name}${wann}: nur leicht und nur, wenn du dich fit genug fühlst. Etwa die Hälfte der Sätze, 2 bis 3 Wiederholungen im Tank. Fühlt sich das Aufwärmen schlecht an, lass es heute.`
        : t.art === "team_sport"
          ? `${name}${wann}: nur, wenn du dich fit genug fühlst. Dann Intensität selbst steuern und danach nichts mehr dranhängen.`
          : `${name}${wann}: nur leicht und nur, wenn du dich fit genug fühlst. Etwa die halbe Dauer, locker.`);
    } else if (b === "reduziert") {
      zeilen.push(t.art === "strength"
        ? `${name}${wann}: etwa drei Viertel der Sätze, 1 bis 2 Wiederholungen im Tank lassen, nicht bis ans Muskelversagen. Keine Bestwerte heute.`
        : t.art === "team_sport"
          ? `${name}${wann}: hingehen geht, Intensität selbst steuern und danach nichts mehr dranhängen.`
          : `${name}${wann}: Dauer auf drei Viertel, locker, Intervalle verschieben.`);
    } else if (b === "hoch") {
      zeilen.push(t.art === "strength"
        ? `${name}${wann}: wie geplant. Guter Tag, um bei der ersten Übung das Gewicht zu steigern, wenn die Technik sitzt.`
        : `${name}${wann}: wie geplant, du kannst Gas geben.`);
    } else {
      zeilen.push(`${name}${wann}: wie geplant, ${t.minuten} Minuten.`);
    }
  }
  return zeilen;
}

/**
 * Höchstens drei Tipps, jeder hängt an einer Antwort. Mehr liest am Morgen
 * niemand, und ein Tipp ohne Anlass ist ein Kalenderspruch.
 */
function tippsFuer(a: MorgenAntworten, b: Belastbarkeit, schlafenszeit: string | null): string[] {
  const t: string[] = [];
  if (a.gesund <= 2) {
    t.push("Viel trinken, leicht essen, heute früher ins Bett. Bei Fieber oder wenn es länger als ein paar Tage anhält, gehört das zum Arzt.");
  }
  if (a.schlaf <= 2 || a.erholt <= 2) {
    // Blume, Garbazza und Spitschan, Somnologie 2019: Licht am Morgen ist der
    // stärkste Taktgeber der inneren Uhr.
    // Für die Lampe: Golden und andere, American Journal of Psychiatry 2005,
    // Meta-Analyse zur Lichttherapie, üblich sind 10.000 Lux für rund 30
    // Minuten. Im Winter ist es zur Aufstehzeit oft noch dunkel.
    t.push("Geh in der ersten Stunde 10 bis 20 Minuten raus ins Tageslicht. Ist es noch dunkel oder trüb, hilft eine Tageslichtlampe mit 10.000 Lux: in der ersten Stunde des Tages etwa 20 bis 30 Minuten einschalten, am besten bevor du länger auf einen Bildschirm schaust.");
  }
  // Gardiner und andere, Sleep Medicine Reviews 2023: Koffein verkürzt den
  // Schlaf, wenn es weniger als rund 8,8 Stunden vor dem Schlafen kommt.
  // L-Theanin putscht nicht auf. Einzelne kleine Studien fanden mit rund
  // 200 mg bessere Aufmerksamkeit, etwa Kahathuduwa und andere, Nutritional
  // Neuroscience 2017. Die Lage ist dünn, und so steht es auch im Satz.
  if (a.einschlafen <= 2 || a.erholt <= 2) {
    const grenze = schlafenszeit ? uhrzeit(minuten(schlafenszeit) - 9 * 60) : null;
    t.push(`${grenze ? `Letzter Kaffee heute bis ${grenze}.` : "Letzter Kaffee etwa neun Stunden vor dem Schlafen."} Koffein wirkt bis etwa neun Stunden vor dem Schlafen noch auf den Schlaf. `
      + "Bist du danach noch müde, nimm statt Kaffee L-Theanin, etwa 200 mg: es putscht nicht auf, kann aber wacher und klarer machen. Die Studien dazu sind klein.");
  }
  if ((a.schlaf <= 2 || a.erholt <= 2) && schlafenszeit && t.length < 3) {
    t.push(`Heute Abend eine halbe Stunde früher ins Bett, um ${uhrzeit(minuten(schlafenszeit) - 30)}.`);
  }
  if ((b === "reduziert" || b === "niedrig") && a.erholt <= 3 && t.length < 3) {
    t.push("Konzentrierte Arbeit in Blöcken von 45 bis 60 Minuten, dazwischen fünf Minuten aufstehen. Eine Regel der App, keine Studie.");
  }
  if (b === "hoch" && t.length < 3) {
    t.push("Leg die wichtigste und schwerste Aufgabe des Tages auf heute Vormittag.");
  }
  return t.slice(0, 3);
}

function verbinden(teile: string[]): string {
  if (teile.length <= 1) return teile[0] ?? "";
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

function dauer(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} Stunden ${m} Minuten` : `${h} Stunden`;
}

/** Als Text für den Chat und zum Vorlesen. */
export function morgenText(r: MorgenErgebnis): string {
  return [
    `Morgenwert ${r.wert} von 100. Belastbarkeit heute: ${BELASTBARKEIT_NAME[r.belastbarkeit]}. ${r.warum}`,
    "",
    "Training:",
    ...r.training,
    ...(r.tipps.length ? ["", "Für heute:", ...r.tipps] : []),
    "",
    "Das ist keine Messung, sondern deine eigene Einschätzung, zusammengefasst.",
  ].join("\n");
}
