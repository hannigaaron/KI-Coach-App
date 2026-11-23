/**
 * Wie weit jede Muskelpartie sich vom letzten Training erholt hat, und wann
 * sie wieder dran ist.
 *
 * Das ist ein Modell und keine Messung. daevo sieht keinen Muskel, nur die
 * Sätze im Protokoll. Gerechnet wird mit einer Ermüdung je Training, die über
 * eine Erholungszeit linear abklingt, gestützt auf drei Befunde:
 *
 * - Die Muskelproteinsynthese ist nach einem Krafttraining rund 24 bis 48
 *   Stunden erhöht (MacDougall und andere, Can J Appl Physiol 1995, Damas und
 *   andere, J Physiol 2016). Danach ist der Reiz verbraucht.
 * - Kraft und Muskelkater brauchen nach einem harten Training meist 48 bis 72
 *   Stunden, nach ungewohnter oder sehr umfangreicher Belastung länger
 *   (Schoenfeld und Grgic, Strength Cond J 2018, McLester und andere 2003).
 *   Grosse Muskeln mit schweren Grundübungen brauchen länger als kleine.
 * - Zwei Reize pro Woche je Muskel bringen mehr als einer (Schoenfeld und
 *   andere, Sports Med 2016). Liegt der letzte Reiz länger als fünf Tage
 *   zurück, ist die Partie fällig.
 *
 * Die Superkompensation, auf die sich das Fenster beruft, ist ein
 * Lehrbuchmodell und als Kurve nicht gemessen. Die Stunden je Partie und die
 * Gewichtung der Sätze sind Regeln der App.
 */

/** Erholungszeit in Stunden nach einem Training mit sechs harten Sätzen. */
export const ERHOLUNG_STUNDEN: Record<string, number> = {
  quadrizeps: 72,
  gesaess: 72,
  beinbeuger: 72,
  unterer_ruecken: 72,
  brust: 60,
  lat: 60,
  oberer_ruecken: 54,
  adduktoren: 54,
  trapez: 48,
  schulter_vorn: 48,
  schulter_seite: 42,
  schulter_hinten: 42,
  bizeps: 42,
  trizeps: 42,
  waden: 36,
  unterarme: 36,
  bauch: 36,
  seitbauch: 36,
};

/** Ab so vielen Stunden seit dem letzten Reiz ist eine Partie fällig. */
export const FAELLIG_AB_STUNDEN = 5 * 24;

/** Wie schnell sich jemand erholt, im Profil wählbar. */
export type ErholungsTempo = "schnell" | "normal" | "langsam";
const TEMPO: Record<ErholungsTempo, number> = { schnell: 0.8, normal: 1, langsam: 1.25 };

export interface RegenTraining {
  /** Ende des Trainings in Millisekunden. */
  zeit: number;
  /** Sätze je Partie, Hilfsmuskeln halb. */
  saetze: Record<string, number>;
}

export type RegenStand = "erholt" | "fast" | "muede" | "faellig" | "keine";

export interface RegenPartie {
  id: string;
  /** 0 bis 100. Null, wenn die Partie in 28 Tagen nicht trainiert wurde. */
  prozent: number | null;
  stand: RegenStand;
  /** Stunden seit dem letzten Reiz. */
  seitStunden: number | null;
  /** Stunden, bis die Partie wieder voll da ist, 0 wenn schon. */
  bisStunden: number;
  /** Selbst gesetzt statt gerechnet. */
  gefuehl?: "frisch" | "kater";
}

/**
 * Ermüdung eines Trainings: sechs harte Sätze sind eine volle Belastung,
 * weniger zählt weniger, mehr verlängert die Erholung. Zwei Sätze Seitheben
 * zum Schluss legen eine Schulter nicht drei Tage lahm.
 */
function last(saetze: number): { tiefe: number; faktor: number } {
  return {
    tiefe: Math.min(1, 0.25 + saetze * 0.125),
    faktor: Math.max(0.7, Math.min(1.5, 0.7 + saetze * 0.05 + (saetze > 6 ? (saetze - 6) * 0.04 : 0))),
  };
}

/**
 * Regeneration je Partie zum Zeitpunkt `jetzt`. Trainings aus den letzten 28
 * Tagen zählen. Die Ermüdung mehrerer Trainings addiert sich: wer Beine am
 * Montag und Mittwoch macht, ist am Donnerstag müder als nach einem Tag.
 * `gefuehl` überstimmt die Rechnung für heute, denn den Muskelkater spürt
 * der Nutzer und nicht die App.
 */
export function regeneration(
  trainings: RegenTraining[],
  jetzt: number,
  opt: { tempo?: ErholungsTempo; gefuehl?: Record<string, "frisch" | "kater"> } = {},
): RegenPartie[] {
  const tempo = TEMPO[opt.tempo ?? "normal"] ?? 1;
  const fenster = jetzt - 28 * 86400000;
  const ergebnis: RegenPartie[] = [];
  for (const [id, basis] of Object.entries(ERHOLUNG_STUNDEN)) {
    let ermuedung = 0;
    let letzte: number | null = null;
    let bis = 0;
    for (const t of trainings) {
      const n = t.saetze[id] ?? 0;
      if (!(n > 0) || t.zeit > jetzt || t.zeit < fenster) continue;
      if (letzte === null || t.zeit > letzte) letzte = t.zeit;
      const { tiefe, faktor } = last(n);
      const dauer = basis * faktor * tempo;
      const vergangen = (jetzt - t.zeit) / 3600000;
      const rest = Math.max(0, 1 - vergangen / dauer);
      ermuedung += tiefe * rest;
      if (rest > 0) bis = Math.max(bis, dauer - vergangen);
    }
    const seit = letzte === null ? null : Math.round((jetzt - letzte) / 3600000);
    const gefuehl = opt.gefuehl?.[id];
    let prozent = letzte === null ? null : Math.round(100 * (1 - Math.min(1, ermuedung)));
    if (gefuehl === "frisch") { prozent = 100; bis = 0; }
    if (gefuehl === "kater") { prozent = Math.min(prozent ?? 100, 35); bis = Math.max(bis, 24); }
    ergebnis.push({
      id,
      prozent,
      stand: standVon(prozent, seit, gefuehl),
      seitStunden: seit,
      bisStunden: Math.round(bis),
      ...(gefuehl ? { gefuehl } : {}),
    });
  }
  return ergebnis;
}

function standVon(prozent: number | null, seit: number | null, gefuehl?: string): RegenStand {
  if (gefuehl === "kater") return "muede";
  if (prozent === null) return "keine";
  if (prozent < 60) return "muede";
  if (prozent < 90) return "fast";
  if (seit !== null && seit >= FAELLIG_AB_STUNDEN) return "faellig";
  return "erholt";
}

/**
 * Farbe von Rot über Gelb nach Grün, als Farbton. Rot heisst noch belastet,
 * Grün wieder frisch. Gelb liegt bei 60 Prozent, wo die Rechnung "fast"
 * sagt.
 */
export function regenFarbton(prozent: number): number {
  const p = Math.max(0, Math.min(100, prozent));
  return Math.round(p < 60 ? (p / 60) * 45 : 45 + ((p - 60) / 40) * 95);
}

const DAUER = (h: number) => (h < 24 ? `${Math.max(1, Math.round(h))} Stunden` : h < 48 ? "rund einem Tag" : `rund ${Math.round(h / 24)} Tagen`);

/** Ein Satz je Partie, für die Liste unter der Karte und für den Coach. */
export function regenSatz(p: RegenPartie): string {
  if (p.stand === "keine") return "In den letzten vier Wochen nicht trainiert.";
  if (p.gefuehl === "kater") return "Du hast Muskelkater angegeben. Heute schonen.";
  if (p.stand === "muede") return `Erholt sich noch, wieder voll da in ${DAUER(p.bisStunden)}.`;
  if (p.stand === "fast") return `Fast erholt, leichtes Training geht. Voll da in ${DAUER(p.bisStunden)}.`;
  const tage = Math.round((p.seitStunden ?? 0) / 24);
  if (p.stand === "faellig") return `Erholt, der letzte Reiz liegt ${tage} Tage zurück. Wieder dran.`;
  return "Erholt und im Fenster für den nächsten Reiz.";
}

/** Text für den Coach: was frisch, was müde, was fällig ist. */
export function regenText(partien: RegenPartie[], namen: Record<string, string>): string {
  const gruppe = (s: RegenStand) => partien.filter((p) => p.stand === s).map((p) => `${namen[p.id] ?? p.id} ${p.prozent ?? ""}%`.trim());
  const zeilen = [
    ["Noch in Erholung", gruppe("muede")],
    ["Fast erholt", gruppe("fast")],
    ["Erholt", gruppe("erholt")],
    ["Fällig, letzter Reiz über fünf Tage her", gruppe("faellig")],
  ].filter(([, l]) => (l as string[]).length).map(([t, l]) => `${t}: ${(l as string[]).join(", ")}`);
  if (!zeilen.length) return "Keine Trainings mit Übungen in den letzten vier Wochen, daevo kann die Regeneration nicht rechnen.";
  return `Regeneration je Muskel, gerechnet aus dem Trainingsprotokoll, keine Messung:\n${zeilen.join("\n")}`;
}
