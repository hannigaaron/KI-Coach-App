import type { Termin } from "./ical.js";
import { uhrzeit } from "./ical.js";
import type { MacroTargets, UserProfile } from "./types.js";

/**
 * Den Tag lesen, nicht nur anzeigen.
 *
 * Ein Kalender allein coacht niemanden. Was hier passiert: aus den Terminen
 * werden die Lücken, aus den Lücken werden Essensfenster, und aus dem
 * Verhältnis von Terminen zu Schlafzeit werden die Sätze, die ein Coach am
 * Vorabend sagen würde.
 *
 * Alles hier ist gerechnet, nichts geraten. Jede Empfehlung hängt an einer
 * Zahl aus dem Kalender oder aus dem Profil. Das Sprachmodell bekommt das
 * Ergebnis und formuliert es, es erfindet keine Zeiten dazu.
 */

export interface Luecke {
  von: number;
  bis: number;
  minuten: number;
}

export interface Essensfenster {
  /** Wievielte Mahlzeit des Tages. */
  nummer: number;
  /** Empfohlener Zeitpunkt. */
  um: number;
  /** Wie viel Zeit dafür da ist. */
  minuten: number;
  /** Was in diese Mahlzeit gehört, in Gramm Protein. */
  proteinG: number;
  kcal: number;
  /** Warum genau hier. */
  grund: string;
}

export interface Tagesablauf {
  tag: string;
  /** Termine des Tages, ohne ganztägige. */
  termine: Termin[];
  ganztags: Termin[];
  /** Wach von, wach bis, aus dem Profil. */
  wachVon: number;
  wachBis: number;
  /** Wie viel des Wachtags verplant ist, zwischen 0 und 1. */
  auslastung: number;
  /** Minuten, die im Kalender belegt sind. */
  belegtMinuten: number;
  luecken: Luecke[];
  /** Der längste freie Block, für Arbeit, die Konzentration braucht. */
  fokusblock: Luecke | null;
  essensfenster: Essensfenster[];
  /** Termine, die als Training gelesen werden. */
  training: Termin[];
  /** Was auffällt. Jede Zeile mit Grund. */
  hinweise: string[];
}

/** Wie lange eine Mahlzeit im Alltag mindestens braucht. */
const MIN_ESSEN_MINUTEN = 20;
/** Ab hier ist ein freier Block für konzentrierte Arbeit brauchbar. */
const MIN_FOKUS_MINUTEN = 60;

const TRAININGSWORTE = [
  "training", "gym", "kraft", "volleyball", "sport", "workout", "cardio",
  "laufen", "joggen", "schwimmen", "mobility", "pt ", "personal training", "athletik",
];

/**
 * Wertet einen Tag aus.
 *
 * `jetzt` ist der Bezugspunkt für "der Tag ist schon halb rum". Der Aufrufer
 * gibt ihn mit, damit sich das Ergebnis testen lässt.
 */
export function tagesablauf(params: {
  tag: string;
  termine: Termin[];
  profile: UserProfile;
  ziele: MacroTargets;
  mahlzeiten?: number;
}): Tagesablauf {
  const { tag, profile, ziele } = params;
  const mahlzeiten = Math.max(2, Math.min(6, params.mahlzeiten ?? 4));

  const wachVon = zeitAmTag(tag, profile.wakeTime);
  // Geht jemand nach Mitternacht ins Bett, endet der Wachtag am nächsten Tag.
  const rohBis = zeitAmTag(tag, profile.sleepTime);
  const wachBis = rohBis > wachVon ? rohBis : rohBis + 86400_000;

  const alle = params.termine.slice().sort((a, b) => a.von - b.von);
  const ganztags = alle.filter((t) => t.ganztags);
  const termine = alle.filter((t) => !t.ganztags);

  const belegt = verschmelze(termine.map((t) => ({ von: t.von, bis: t.bis })));
  const belegtImWachfenster = belegt
    .map((b) => ({ von: Math.max(b.von, wachVon), bis: Math.min(b.bis, wachBis) }))
    .filter((b) => b.bis > b.von);
  const belegtMinuten = Math.round(
    belegtImWachfenster.reduce((s, b) => s + (b.bis - b.von), 0) / 60000,
  );
  const wachMinuten = Math.max(1, Math.round((wachBis - wachVon) / 60000));

  const luecken = freieBloecke(belegtImWachfenster, wachVon, wachBis);
  const fokusblock = luecken
    .filter((l) => l.minuten >= MIN_FOKUS_MINUTEN)
    .sort((a, b) => b.minuten - a.minuten)[0] ?? null;

  const training = termine.filter((t) => istTraining(t.titel));
  const essensfenster = verteileMahlzeiten({ luecken, wachVon, wachBis, mahlzeiten, ziele, training });

  const hinweise = pruefe({
    tag, termine, ganztags, wachVon, wachBis, luecken, training, profile, belegtMinuten, wachMinuten,
  });

  return {
    tag,
    termine,
    ganztags,
    wachVon,
    wachBis,
    auslastung: Math.min(1, belegtMinuten / wachMinuten),
    belegtMinuten,
    luecken,
    fokusblock,
    essensfenster,
    training,
    hinweise,
  };
}

function istTraining(titel: string): boolean {
  const t = titel.toLowerCase();
  return TRAININGSWORTE.some((wort) => t.includes(wort));
}

function zeitAmTag(tagIso: string, hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":");
  return new Date(`${tagIso}T00:00:00`).getTime() + (Number(h) * 60 + Number(m)) * 60000;
}

/** Ueberlappende Termine zu Blöcken zusammenfassen. Sonst zählt Zeit doppelt. */
function verschmelze(bloecke: { von: number; bis: number }[]): { von: number; bis: number }[] {
  const sortiert = bloecke.slice().sort((a, b) => a.von - b.von);
  const out: { von: number; bis: number }[] = [];
  for (const b of sortiert) {
    const letzter = out[out.length - 1];
    if (letzter && b.von <= letzter.bis) letzter.bis = Math.max(letzter.bis, b.bis);
    else out.push({ ...b });
  }
  return out;
}

function freieBloecke(belegt: { von: number; bis: number }[], von: number, bis: number): Luecke[] {
  const out: Luecke[] = [];
  let zeiger = von;
  for (const b of belegt) {
    if (b.von > zeiger) out.push(luecke(zeiger, b.von));
    zeiger = Math.max(zeiger, b.bis);
  }
  if (zeiger < bis) out.push(luecke(zeiger, bis));
  return out.filter((l) => l.minuten >= 5);
}

function luecke(von: number, bis: number): Luecke {
  return { von, bis, minuten: Math.round((bis - von) / 60000) };
}

/**
 * Verteilt die Mahlzeiten auf den Tag.
 *
 * Die Regel dahinter ist einfach und bewährt: gleichmässige Abstände über den
 * Wachtag, Protein gleichmässig auf die Mahlzeiten, und keine Mahlzeit dort,
 * wo ein Termin steht. Liegt der rechnerische Zeitpunkt in einem Termin, wandert
 * er in die nächste Lücke, die lang genug ist.
 *
 * Um ein Training herum wird verschoben: die Mahlzeit davor rückt vor den
 * Start, damit nicht auf leeren Magen trainiert wird, die danach so bald wie
 * möglich hinter das Ende.
 */
function verteileMahlzeiten(params: {
  luecken: Luecke[];
  wachVon: number;
  wachBis: number;
  mahlzeiten: number;
  ziele: MacroTargets;
  training: Termin[];
}): Essensfenster[] {
  const { luecken, wachVon, wachBis, mahlzeiten, ziele, training } = params;
  const brauchbar = luecken.filter((l) => l.minuten >= MIN_ESSEN_MINUTEN);
  if (brauchbar.length === 0) return [];

  // Erste Mahlzeit eine Stunde nach dem Aufstehen, letzte zwei Stunden vor dem
  // Schlafen. Dazwischen gleichmässig.
  const ersteZeit = wachVon + 60 * 60000;
  const letzteZeit = Math.max(ersteZeit, wachBis - 2 * 60 * 60000);
  const abstand = mahlzeiten > 1 ? (letzteZeit - ersteZeit) / (mahlzeiten - 1) : 0;

  const proteinJe = Math.round(ziele.proteinG / mahlzeiten);
  const kcalJe = Math.round(ziele.kcal / mahlzeiten);

  // Erst die Wunschzeiten, dann die Trainings dazwischenfunken lassen, dann
  // erst in die Lücken legen. In dieser Reihenfolge, weil sonst die Mahlzeit
  // vor dem Training schon woanders liegt und sich nicht mehr verschieben lässt.
  const wuensche: { um: number; grund: string }[] = [];
  for (let i = 0; i < mahlzeiten; i++) {
    wuensche.push({ um: ersteZeit + abstand * i, grund: "gleichmässiger Abstand über den Tag" });
  }

  for (const t of training) {
    const ziel = t.von - 90 * 60000;
    // Die letzte Mahlzeit, die vor dem Training liegen könnte. Ohne eine solche
    // Mahlzeit ginge er leer ins Training, und das ist der häufigste Grund für
    // eine schlechte Einheit.
    let index = -1;
    let abstandBest = Infinity;
    for (let i = 0; i < wuensche.length; i++) {
      const w = wuensche[i]!;
      if (w.um > t.von) continue;
      const d = Math.abs(w.um - ziel);
      if (d < abstandBest) { abstandBest = d; index = i; }
    }
    if (index >= 0 && ziel > ersteZeit) {
      wuensche[index] = { um: ziel, grund: `90 Minuten vor ${t.titel}, damit du nicht leer reingehst` };
    }
  }

  const out: Essensfenster[] = [];
  const belegteFenster: number[] = [];
  for (const wunsch of wuensche.sort((a, b) => a.um - b.um)) {
    const platz = naechsterPlatz(brauchbar, wunsch.um, belegteFenster);
    if (platz === null) continue;
    belegteFenster.push(platz);
    const verschoben = Math.abs(platz - wunsch.um) > 10 * 60000;
    out.push({
      nummer: out.length + 1,
      um: platz,
      minuten: brauchbar.find((l) => platz >= l.von && platz <= l.bis)?.minuten ?? MIN_ESSEN_MINUTEN,
      proteinG: proteinJe,
      kcal: kcalJe,
      grund: verschoben
        ? "in die nächste freie Lücke geschoben, weil zur Wunschzeit ein Termin steht"
        : wunsch.grund,
    });
  }
  return out.sort((a, b) => a.um - b.um).map((e, i) => ({ ...e, nummer: i + 1 }));
}

/** Sucht den Zeitpunkt in einer Lücke, der dem Wunsch am nächsten liegt. */
function naechsterPlatz(luecken: Luecke[], wunsch: number, schonBelegt: number[]): number | null {
  let bester: number | null = null;
  let abstand = Infinity;
  for (const l of luecken) {
    const kandidat = Math.min(Math.max(wunsch, l.von + 5 * 60000), l.bis - 5 * 60000);
    if (kandidat < l.von || kandidat > l.bis) continue;
    if (schonBelegt.some((b) => Math.abs(b - kandidat) < 60 * 60000)) continue;
    const d = Math.abs(kandidat - wunsch);
    if (d < abstand) { abstand = d; bester = Math.round(kandidat); }
  }
  return bester;
}

/**
 * Was am Tag auffällt.
 *
 * Jeder Hinweis nennt die Zahl, auf der er beruht. Ein Coach, der sagt "dein
 * Tag ist zu voll", ohne zu sagen wie voll, sagt nichts.
 */
function pruefe(p: {
  tag: string;
  termine: Termin[];
  ganztags: Termin[];
  wachVon: number;
  wachBis: number;
  luecken: Luecke[];
  training: Termin[];
  profile: UserProfile;
  belegtMinuten: number;
  wachMinuten: number;
}): string[] {
  const hinweise: string[] = [];
  const erster = p.termine[0];
  const letzter = p.termine[p.termine.length - 1];

  if (erster && erster.von < p.wachVon) {
    const minuten = Math.round((p.wachVon - erster.von) / 60000);
    hinweise.push(
      `${erster.titel} beginnt um ${uhrzeit(erster.von)}, das sind ${minuten} Minuten vor deiner Aufstehzeit ` +
      `${p.profile.wakeTime}. Entweder heute früher aufstehen oder den Termin schieben.`,
    );
  }

  if (letzter && letzter.bis > p.wachBis) {
    const minuten = Math.round((letzter.bis - p.wachBis) / 60000);
    hinweise.push(
      `${letzter.titel} endet um ${uhrzeit(letzter.bis)}, also ${minuten} Minuten nach deiner Schlafenszeit ` +
      `${p.profile.sleepTime}. Rechne mit ${minuten} Minuten weniger Schlaf oder verschieb den Morgen.`,
    );
  }

  const quote = p.belegtMinuten / p.wachMinuten;
  if (quote >= 0.7) {
    hinweise.push(
      `${p.belegtMinuten} von ${p.wachMinuten} Wachminuten sind verplant, das sind ${Math.round(quote * 100)} Prozent. ` +
      "An so einem Tag hältst du keine neuen Vorhaben. Halte die Mindeststandards und mehr nicht.",
    );
  }

  // Geprüft wird die Ueberschneidung mit dem Mittagsfenster, nicht die
  // Anfangsstunde der Lücke. Eine Lücke, die um 15 Uhr beginnt, hilft mittags
  // nicht, hätte aber eine Prüfung auf die Startstunde bestanden.
  const mittagVon = new Date(`${p.tag}T11:00:00`).getTime();
  const mittagBis = new Date(`${p.tag}T15:00:00`).getTime();
  const mittags = p.luecken.filter((l) => {
    const ueberschneidung = Math.min(l.bis, mittagBis) - Math.max(l.von, mittagVon);
    return ueberschneidung >= MIN_ESSEN_MINUTEN * 60000;
  });
  if (mittags.length === 0 && p.termine.length > 0) {
    hinweise.push(
      "Zwischen 11 und 15 Uhr hast du keine Lücke von 20 Minuten. Nimm dir heute etwas Vorbereitetes mit, " +
      "sonst fällt die Mahlzeit aus und der Abend wird zu gross.",
    );
  }

  for (const t of p.training) {
    const davor = p.termine.filter((x) => x.bis <= t.von && t.von - x.bis < 45 * 60000);
    if (davor.length > 0) {
      hinweise.push(
        `Vor ${t.titel} um ${uhrzeit(t.von)} liegen weniger als 45 Minuten Puffer. ` +
        "Essen und Anfahrt gehen sich da nicht aus. Iss die Mahlzeit davor früher.",
      );
    }
    const spaet = new Date(t.bis).getHours();
    if (spaet >= 21) {
      hinweise.push(
        `${t.titel} endet um ${uhrzeit(t.bis)}. Nach spätem Training braucht der Puls Zeit. ` +
        `Rechne damit, dass du nicht um ${p.profile.sleepTime} schläfst, und plan den nächsten Morgen entsprechend.`,
      );
    }
  }

  if (p.termine.length === 0 && p.ganztags.length === 0) {
    hinweise.push("Heute steht nichts im Kalender. Ein leerer Tag zerfällt ohne Plan. Setz dir drei feste Blöcke.");
  }

  return hinweise;
}

/**
 * Der Tag in Worten, für den Prompt und für die Anzeige.
 *
 * Bewusst als Text und nicht als Tabelle: der Coach soll daraus reden können,
 * ohne die Zahlen umzuformen.
 */
export function tagesablaufText(a: Tagesablauf): string {
  const zeilen: string[] = [];
  zeilen.push(`Tag ${a.tag}. Wach von ${uhrzeit(a.wachVon)} bis ${uhrzeit(a.wachBis)}.`);

  if (a.ganztags.length) {
    zeilen.push(`Ganztägig: ${a.ganztags.map((t) => t.titel).join(", ")}.`);
  }

  if (a.termine.length === 0) {
    zeilen.push("Keine Termine mit Uhrzeit.");
  } else {
    zeilen.push("Termine:");
    for (const t of a.termine) {
      zeilen.push(`- ${uhrzeit(t.von)} bis ${uhrzeit(t.bis)} ${t.titel}${t.ort ? `, ${t.ort}` : ""}`);
    }
    zeilen.push(`Verplant: ${a.belegtMinuten} Minuten, ${Math.round(a.auslastung * 100)} Prozent des Wachtags.`);
  }

  if (a.fokusblock) {
    zeilen.push(
      `Längster freier Block: ${uhrzeit(a.fokusblock.von)} bis ${uhrzeit(a.fokusblock.bis)}, ` +
      `${a.fokusblock.minuten} Minuten.`,
    );
  }

  if (a.essensfenster.length) {
    zeilen.push("Vorschlag für die Mahlzeiten:");
    for (const e of a.essensfenster) {
      zeilen.push(`- ${uhrzeit(e.um)} etwa ${e.kcal} kcal und ${e.proteinG} g Protein, ${e.grund}`);
    }
  }

  if (a.hinweise.length) {
    zeilen.push("Was auffällt:");
    for (const h of a.hinweise) zeilen.push(`- ${h}`);
  }

  return zeilen.join("\n");
}

/** Kurzfassung über mehrere Tage, für den Blick auf die Woche. */
export function wochenText(ablaeufe: Tagesablauf[]): string {
  const zeilen: string[] = [];
  for (const a of ablaeufe) {
    const wochentag = new Date(`${a.tag}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long" });
    const anzahl = a.termine.length + a.ganztags.length;
    if (anzahl === 0) {
      zeilen.push(`${wochentag} ${a.tag}: nichts im Kalender.`);
      continue;
    }
    const teile = [
      `${wochentag} ${a.tag}: ${anzahl} ${anzahl === 1 ? "Termin" : "Termine"}, ${a.belegtMinuten} Minuten verplant`,
    ];
    if (a.training.length) teile.push(`Training: ${a.training.map((t) => `${t.titel} ${uhrzeit(t.von)}`).join(", ")}`);
    if (a.fokusblock && a.fokusblock.minuten >= 90) {
      teile.push(`freier Block ${uhrzeit(a.fokusblock.von)} bis ${uhrzeit(a.fokusblock.bis)}`);
    }
    zeilen.push(teile.join(". ") + ".");
  }
  return zeilen.join("\n");
}
