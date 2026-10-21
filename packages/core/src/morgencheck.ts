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

export type Belastbarkeit = "hoch" | "normal" | "reduziert" | "schonen";

export const BELASTBARKEIT_NAME: Record<Belastbarkeit, string> = {
  hoch: "Hoch", normal: "Normal", reduziert: "Reduziert", schonen: "Schonen",
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
}

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

const RANG: Belastbarkeit[] = ["schonen", "reduziert", "normal", "hoch"];
const hoechstens = (b: Belastbarkeit, grenze: Belastbarkeit): Belastbarkeit =>
  RANG.indexOf(b) > RANG.indexOf(grenze) ? grenze : b;

export function morgenAuswerten(e: MorgenEingabe): MorgenErgebnis {
  const a = e.antworten;
  const wert = morgenWert(a);
  let b: Belastbarkeit = wert >= 75 ? "hoch" : wert >= 55 ? "normal" : wert >= 35 ? "reduziert" : "schonen";
  const gruende: string[] = [];

  // Schonen heisst krank oder angeschlagen. Wer gesund ist und schlecht
  // geschlafen hat, trainiert leichter, aber er trainiert: der Leistungsabfall
  // nach kurzem Schlaf ist messbar, ein Grund für eine Pause ist er nicht.
  if (b === "schonen" && a.gesund >= 4) b = "reduziert";

  // Krank schlägt jeden Schnitt. Wer sich krank fühlt und gut geschlafen
  // hat, ist trotzdem krank, und ein Mittelwert würde das verstecken.
  if (a.gesund === 1) { b = "schonen"; gruende.push("du dich krank fühlst"); }
  else if (a.gesund === 2) { b = hoechstens(b, "reduziert"); gruende.push("du dich nicht ganz gesund fühlst"); }

  // Unter sechs Stunden laut Uhr, Craven und andere, Sports Medicine 2022.
  const kurz = e.schlafMinuten !== null && e.schlafMinuten !== undefined && e.schlafMinuten > 0 && e.schlafMinuten < 360;
  if (kurz) { b = hoechstens(b, "reduziert"); gruende.push(`du laut Apple Health nur ${dauer(e.schlafMinuten!)} geschlafen hast`); }

  if (a.erholt <= 2) gruende.push("du wenig erholt aufgewacht bist");
  if (a.schlaf <= 2) gruende.push("die Nacht schlecht war");
  if (!gruende.length && b === "hoch") gruende.push("alle vier Antworten oben liegen");

  const warum = gruende.length ? `Weil ${verbinden(gruende)}.` : "Aus deinen vier Antworten.";

  return {
    wert, belastbarkeit: b, warum,
    training: trainingFuer(b, e.training ?? [], a),
    tipps: tippsFuer(a, b, e.schlafenszeit ?? null),
    alsZehner: { sleepQuality: aufZehn(a.schlaf), energy: aufZehn(a.erholt) },
  };
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
    if (b === "schonen") return ["Heute steht kein Training an, und das passt. Ruh dich aus."];
    return ["Heute steht kein Training an. Ein Spaziergang oder zehn Minuten Mobilität reichen."];
  }
  const zeilen: string[] = [];
  for (const t of geplant) {
    const name = t.titel ? `${ART[t.art] ?? t.art}, ${t.titel}` : ART[t.art] ?? t.art;
    const wann = t.uhrzeit ? ` um ${t.uhrzeit}` : "";
    if (b === "schonen") {
      zeilen.push(a.gesund === 1
        ? `${name}${wann} fällt heute aus. Mit Krankheitsgefühl trainierst du gar nicht, bei Fieber erst recht nicht.`
        : `${name}${wann}: heute lieber ausfallen lassen oder 20 Minuten locker bewegen. Morgen zählt mehr als heute.`);
    } else if (b === "reduziert") {
      zeilen.push(t.art === "strength"
        ? `${name}${wann}: etwa drei Viertel der Sätze, jeden Satz eine Wiederholung früher beenden. Keine Bestwerte heute.`
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
    t.push("Geh in der ersten Stunde 10 bis 20 Minuten raus ins Tageslicht. Licht am Morgen stellt die innere Uhr, auch bei Bewölkung.");
  }
  if (a.einschlafen <= 2 && schlafenszeit) {
    // Gardiner und andere, Sleep Medicine Reviews 2023: Koffein verkürzt den
    // Schlaf, wenn es weniger als rund 8,8 Stunden vor dem Schlafen kommt.
    const grenze = uhrzeit(minuten(schlafenszeit) - 9 * 60);
    t.push(`Letzter Kaffee heute bis ${grenze}. Koffein wirkt bis etwa neun Stunden vor dem Schlafen noch auf den Schlaf.`);
  } else if (a.einschlafen <= 2) {
    t.push("Letzter Kaffee etwa neun Stunden vor dem Schlafen. So lange wirkt Koffein noch auf den Schlaf.");
  }
  if ((a.schlaf <= 2 || a.erholt <= 2) && schlafenszeit && t.length < 3) {
    t.push(`Heute Abend eine halbe Stunde früher ins Bett, um ${uhrzeit(minuten(schlafenszeit) - 30)}.`);
  }
  if (b === "reduziert" && a.erholt <= 3 && t.length < 3) {
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
