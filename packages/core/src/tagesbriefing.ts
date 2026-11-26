import { abendroutineBeginn, darfNachFeierabend, feierabendZeitpunkt } from "./feierabend.js";
import { uhrzeit } from "./ical.js";
import type { SortierGruppe, SortierPunkt, SortierStufe } from "./sortierung.js";
import type { Tagesablauf } from "./tagesablauf.js";
import type { Tagesessen } from "./tagesessen.js";
import type { Vorausblick } from "./vorausblick.js";

/**
 * Viele tragen die Uhrzeit in den Titel: "13:15 Uhr Silke Call" um 13:15.
 * Davor steht ohnehin die Uhrzeit, und doppelt liest es sich wie ein Fehler.
 * Entfernt wird sie nur, wenn sie genau dem Beginn entspricht. Eine andere
 * Uhrzeit im Titel ist eine Information und bleibt.
 */
export function ohneEigeneUhrzeit(titel: string, beginn: string): string {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*(uhr)?\s*[-,:]?\s*/i.exec(titel);
  if (!m) return titel;
  const zeit = `${m[1]!.padStart(2, "0")}:${m[2]}`;
  const rest = titel.slice(m[0].length);
  return zeit === beginn && rest.trim() ? rest : titel;
}

/**
 * Das Briefing, morgens für heute und abends für morgen.
 *
 * Vorher waren es zwei Textblöcke: der Tagesablauf als Liste mit jedem
 * Termin, die Ziele als Zahlen, der Aufgabenplan dahinter. Alles stimmte,
 * aber niemand las es, weil nichts davon sagte, worauf es heute ankommt.
 *
 * Jetzt in festen Abschnitten, die je eine Frage beantworten: was steht an,
 * worauf liegt der Fokus, was ist zu tun, worauf achten. Die erste Zeile ist
 * die Mitteilung auf dem Sperrbildschirm und muss allein stehen können.
 *
 * Nichts davon kommt aus einem Modell. Termine, freie Zeit, Mahlzeiten mit
 * Rezept, Training und Aufgaben sind gerechnet, die Sätze darum sind fest.
 */

export interface BriefingAbschnitt {
  titel: string;
  zeilen: string[];
}

export interface TagesBriefing {
  art: "morgen" | "abend";
  /** Überschrift der Mitteilung. */
  titel: string;
  /** Ein bis zwei Sätze für den Sperrbildschirm. */
  kurz: string;
  abschnitte: BriefingAbschnitt[];
  /** Alles als Text, für Chat und Teilen. */
  text: string;
  /** Der Tag als eine Liste nach Uhrzeit, für die Ansicht, siehe `briefingPunkte`. */
  punkte: BriefingPunkt[];
  /** Dieselbe Liste in der Reihenfolge, die daevo vorgibt: zuerst, danach, dazwischen, warten, abends. */
  /** Ein Satz, wenn ein Lebensbereich diese Woche zu kurz kam und Aufgaben deshalb vorrücken. */
  musterHinweis: string | null;
  reihenfolge: SortierGruppe[];
  /** Dasselbe als Karten für die kleine Präsentation, siehe `briefingFolien`. */
  folien: BriefingFolie[];
}

/**
 * Eine Karte der Präsentation. Jede trägt nur Zahlen und wenige Wörter, die
 * Sätze für Chat und Mitteilung bleiben in `abschnitte`. Ein Abschnitt mit
 * fünf Zeilen Fliesstext liest abends niemand, eine Karte mit einer Zahl und
 * drei Zeilen schon.
 */
export type BriefingFolie =
  | { art: "start"; morgens: boolean; gruss: string; datum: string; zeile: string }
  | { art: "rueckblick"; kcal: number; zielKcal: number; proteinG: number; zielProteinG: number; erledigt: number; satz: string }
  | { art: "fokus"; haupt: string; um?: string; zusatz: string; gewaehlt?: boolean }
  | { art: "tag"; titel: string; termine: Array<{ um: string; bis: string; titel: string }>; mehr: number; frei: null | { von: string; bis: string; training?: string }; belegt: string; ganztags: string[] }
  | { art: "tun"; punkte: Array<{ art: "training" | "aufgabe"; text: string; um?: string; zuerst: boolean; grund?: string; id?: string }>; mehr: number; feierabend?: string; gestrichen?: boolean }
  | { art: "achtung"; titel: string; punkte: Array<{ art: string; kurz: string; tun: string }> }
  | { art: "essen"; zielKcal: number; zielProteinG: number; mahlzeiten: Array<{ art: string; um: string; name: string; gericht: string; kcal: number; proteinG: number; rolle: string; gewaehlt?: boolean; rezeptId?: string; foto?: boolean }> }
  | { art: "untergrenze"; punkte: Array<{ titel: string; stand: string }>; geburtstage: string[] }
  | { art: "ende"; morgens: boolean; satz: string };

export interface BriefingPunkt {
  art: "aufgabe" | "termin" | "essen" | "training" | "feierabend";
  /** Zeitpunkt in Millisekunden, null für eine Aufgabe ohne Platz im Tag. */
  um: number | null;
  /** Ende, wo es eines gibt, damit ein laufender Termin noch als jetzt gilt. */
  bis?: number;
  titel: string;
  unter: string;
  /** Kennung der Aufgabe, zum Abhaken. */
  id?: string;
  wichtig?: boolean;
  rezeptId?: string;
  foto?: boolean;
  /** Bei Essen die Art der Mahlzeit, fruehstueck bis abendessen, zum Austauschen. */
  mahlzeit?: string;
  /** Bei Essen die Kalorien, für das Blatt zum Austauschen. */
  kcal?: number;
}

export interface BriefingEingaben {
  art: "morgen" | "abend";
  /** "Montag, 2. November" für den Tag, um den es geht. */
  datum: string;
  /** Null, wenn kein Kalender verbunden ist. */
  ablauf: Tagesablauf | null;
  essen: Tagesessen | null;
  vorausblick: Vorausblick | null;
  /** Das Training an diesem Tag, wenn eines geplant ist. */
  training: null | { titel: string; um?: string; minuten?: number; gestrichen?: boolean; uebungen?: number };
  /** Aufgaben für diesen Tag, wichtigste zuerst, mit Uhrzeit, wenn sie einen Platz hat. */
  aufgaben: Array<{ id?: string; text: string; um?: string; wichtig?: boolean; stufe?: SortierStufe; grund?: string }>;
  musterHinweis?: string | null;
  /** Wie der Tag heisst: heute, morgen, übermorgen oder Wochentag mit Datum. Ohne Angabe folgt es aus art. */
  tagWort?: string;
  /** Stunde, zu der gefragt wird. Nach 11 Uhr heisst das Briefing von heute nicht mehr "Guten Morgen". */
  stunde?: number;
  /** Aufgaben, die bis morgen warten dürfen. Sie stehen als dritte SortierStufe da, nicht im Tag. */
  warten?: Array<{ id?: string; text: string; grund?: string }>;
  ziele: { kcal: number; proteinG: number };
  /** Nur abends: wie der heutige Tag stand. */
  heute?: { kcal: number; zielKcal: number; proteinG: number; zielProteinG: number; erledigt: number };
  /** Mindeststandards, die noch offen sind, je ein kurzer Satz. */
  standards: string[];
  /** Ein selbst gewählter Fokus aus dem Briefing, schlägt die Rechnung. */
  fokusWahl?: string;
}

const MAX_TERMINE = 6;

/**
 * Was im Briefing steht, nach Feierabend gerechnet. Ein Termin, der erst
 * beginnt, wenn die Abendroutine läuft, steht nicht mehr da: um 22 Uhr sagt
 * daevo "Handy weg", und um 23 Uhr steht im Briefing noch ein Termin. Eine
 * Aufgabe nach Feierabend nur, wenn sie nicht warten darf.
 */
function begrenzt(e: BriefingEingaben): { termine: Tagesablauf["termine"]; aufgaben: BriefingEingaben["aufgaben"]; feierabend: number | null } {
  const a = e.ablauf;
  if (!a) return { termine: [], aufgaben: e.aufgaben, feierabend: null };
  const feierabend = feierabendZeitpunkt(a.wachVon, a.wachBis);
  const abend = abendroutineBeginn(a.wachBis);
  const tag = a.tag;
  const aufgaben = e.aufgaben.filter((x) => {
    if (!x.um || !/^\d{1,2}:\d{2}$/.test(x.um)) return true;
    const um = new Date(`${tag}T00:00:00`).getTime() + (Number(x.um.slice(0, 2)) * 60 + Number(x.um.slice(3))) * 60000;
    return um < feierabend || darfNachFeierabend({ text: x.text, wichtigkeit: x.wichtig ? 3 : 1 });
  });
  return { termine: a.termine.filter((t) => t.von < abend), aufgaben, feierabend };
}

/** Ganztägige Einträge ohne Dubletten: "Allerheiligen" steckt in "Allerheiligen (Feiertag)". */
function ganztaegig(ablauf: Tagesablauf): string[] {
  const namen = ablauf.ganztags.map((t) => t.titel.trim()).filter(Boolean);
  return namen.filter((n, i) => !namen.some((m, j) => j !== i && m.length < n.length && n.startsWith(m)) && namen.indexOf(n) === i);
}

function dauer(min: number): string {
  if (min < 60) return `${min} Minuten`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} ${h === 1 ? "Stunde" : "Stunden"}`;
}

/**
 * Der Fokus in zwei Teilen für die Karte: was, und ein kurzer Satz warum.
 * Dieselbe Entscheidung wie `fokus`, nur ohne den Satz drumherum.
 */
function fokusTeile(e: BriefingEingaben, tagWort: string): { haupt: string; um?: string; zusatz: string } {
  if (e.fokusWahl) {
    const a = e.aufgaben.find((x) => x.text === e.fokusWahl);
    return { haupt: e.fokusWahl, um: a?.um, zusatz: `Dein Fokus für ${tagWort}, selbst gewählt.` };
  }
  const voll = (e.ablauf?.auslastung ?? 0) >= 0.7;
  const stufe = (a: BriefingEingaben["aufgaben"][number]): number => a.stufe ?? (a.wichtig ? 1 : 2);
  const wichtig = e.aufgaben.find((a) => stufe(a) === 1) ?? e.aufgaben.find((a) => a.wichtig) ?? e.aufgaben[0];
  if (voll) {
    return wichtig
      ? { haupt: wichtig.text, um: wichtig.um, zusatz: "Der Tag ist voll. Nur das zählt, alles andere darf warten." }
      : { haupt: "Deine Mindeststandards", zusatz: "Der Tag ist voll. Mehr braucht es nicht." };
  }
  if (wichtig) {
    const frueher = wichtig.um ? e.aufgaben.some((a) => a !== wichtig && a.um && a.um < wichtig.um!) : false;
    return { haupt: wichtig.text, um: wichtig.um, zusatz: frueher || !wichtig.um ? `Das ist ${tagWort} das Wichtigste.` : "Das zuerst, alles andere danach." };
  }
  if (e.training && !e.training.gestrichen) return { haupt: e.training.titel, um: e.training.um, zusatz: `Der feste Punkt ${tagWort}.` };
  const block = e.ablauf?.fokusblock;
  if (block) return { haupt: `${uhrzeit(block.von)} bis ${uhrzeit(block.bis)} frei`, zusatz: "Leg dort hinein, was dich wirklich weiterbringt." };
  return { haupt: "Protein treffen, pünktlich ins Bett", zusatz: "Das reicht für einen guten Tag." };
}

/** "Ich liege an fünf Tagen vor 23:00 im Bett: diese Woche 0 von 5, es fehlen noch 5" in Titel und Stand. */
function standardTeile(satz: string): { titel: string; stand: string } {
  const i = satz.indexOf(": ");
  if (i < 0) return { titel: satz, stand: "" };
  const stand = satz.slice(i + 2).replace(/^diese Woche\s+/i, "").replace(/,\s*es fehlen noch.*$/i, "");
  return { titel: satz.slice(0, i).replace(/^Ich\s+/, "").replace(/^\w/, (c) => c.toUpperCase()), stand };
}

/**
 * Das Briefing als Karten, in der Reihenfolge, in der man einen Tag denkt:
 * Begrüssung, abends wie heute lief, der eine Fokus, der Tag nach Uhrzeit,
 * was zu tun ist, was daevo aufgefallen ist, das Essen, die Untergrenze,
 * Schluss. Eine Karte ohne Inhalt fällt weg, eine leere Karte wäre eine
 * Sekunde Warten für nichts.
 */
function briefingFolien(e: BriefingEingaben, g: { tagWort: string; feierabend: number | null; tagTermine: Tagesablauf["termine"]; kopf: string }): BriefingFolie[] {
  const morgens = e.art === "morgen";
  const folien: BriefingFolie[] = [];
  const TagWort = g.tagWort.charAt(0).toUpperCase() + g.tagWort.slice(1);
  const gruss = morgens
    ? ((e.stunde === undefined || e.stunde < 11) ? "Guten Morgen" : "Dein Tag")
    : (g.tagWort === "morgen" ? "Dein Morgen" : TagWort);
  folien.push({ art: "start", morgens, gruss, datum: e.datum, zeile: g.kopf || (e.ablauf ? `${TagWort} ist frei im Kalender.` : "Kein Kalender verbunden.") });

  if (!morgens && e.heute) {
    const h = e.heute;
    // Ohne Eintrag ist ein Tag vergessen und kein Tag ohne Essen. Ein Rat,
    // 168 g Protein vor dem Schlafen nachzuholen, wäre dann falsch.
    const satz = h.kcal === 0
      ? "Heute steht noch kein Essen drin. Trag nach, was du gegessen hast."
      : h.proteinG < h.zielProteinG - 25
        ? `Noch ${h.zielProteinG - h.proteinG} g Protein offen. Ein Shake oder Quark schliesst das.`
        : "Protein ist gedeckt. Gut gemacht.";
    folien.push({ art: "rueckblick", kcal: h.kcal, zielKcal: h.zielKcal, proteinG: h.proteinG, zielProteinG: h.zielProteinG, erledigt: h.erledigt, satz });
  }

  const f = fokusTeile(e, g.tagWort);
  folien.push({ art: "fokus", haupt: f.haupt, ...(f.um ? { um: f.um } : {}), zusatz: f.zusatz, ...(e.fokusWahl ? { gewaehlt: true } : {}) });

  if (e.ablauf && (g.tagTermine.length || e.ablauf.fokusblock)) {
    const a = e.ablauf;
    const tr = e.training && !e.training.gestrichen && e.training.um ? e.training.um : "";
    const block = a.fokusblock;
    const drin = Boolean(block && tr && tr >= uhrzeit(block.von) && tr < uhrzeit(block.bis));
    folien.push({
      art: "tag",
      titel: morgens ? "Dein Tag" : TagWort,
      termine: g.tagTermine.slice(0, 5).map((t) => ({ um: uhrzeit(t.von), bis: uhrzeit(t.bis), titel: ohneEigeneUhrzeit(t.titel, uhrzeit(t.von)) })),
      mehr: Math.max(0, g.tagTermine.length - 5),
      frei: block ? { von: uhrzeit(block.von), bis: uhrzeit(block.bis), ...(drin ? { training: tr } : {}) } : null,
      belegt: dauer(a.belegtMinuten),
      ganztags: ganztaegig(a),
    });
  }

  const stufeVon = (a: BriefingEingaben["aufgaben"][number]): SortierStufe => a.stufe ?? (a.wichtig ? 1 : 2);
  const sortiert = e.aufgaben.map((a, i) => ({ a, i })).sort((x, y) => stufeVon(x.a) - stufeVon(y.a) || x.i - y.i).map((x) => x.a);
  const tun: Extract<BriefingFolie, { art: "tun" }>["punkte"] = [];
  if (e.training && !e.training.gestrichen) {
    tun.push({ art: "training", text: e.training.titel, ...(e.training.um ? { um: e.training.um } : {}), zuerst: false,
      grund: [e.training.minuten ? `${e.training.minuten} Minuten` : "", e.training.uebungen ? `${e.training.uebungen} Übungen` : ""].filter(Boolean).join(", ") || undefined });
  }
  for (const a of sortiert.slice(0, 4)) {
    tun.push({ art: "aufgabe", text: a.text, ...(a.um ? { um: a.um } : {}), zuerst: stufeVon(a) === 1, ...(a.grund ? { grund: a.grund } : {}), ...(a.id ? { id: a.id } : {}) });
  }
  if (tun.length || e.training?.gestrichen) {
    folien.push({ art: "tun", punkte: tun, mehr: Math.max(0, sortiert.length - 4),
      ...(g.feierabend !== null ? { feierabend: uhrzeit(g.feierabend) } : {}), ...(e.training?.gestrichen ? { gestrichen: true } : {}) });
  }

  // Was daevo aufgefallen ist: der Blick in den Kalender und das Muster der Woche.
  const achtung: Extract<BriefingFolie, { art: "achtung" }>["punkte"] = (e.vorausblick?.punkte ?? [])
    .filter((p) => p.kurz)
    .map((p) => ({ art: p.art, kurz: p.kurz!, tun: p.tun ?? "" }));
  if (e.musterHinweis) achtung.push({ art: "muster", kurz: "Zu kurz gekommen", tun: e.musterHinweis.replace(/ Passende Aufgaben.*$/, "") });
  if (achtung.length) folien.push({ art: "achtung", titel: morgens ? "Darauf achten" : "Heute Abend vorbereiten", punkte: achtung.slice(0, 4) });

  const mahlzeiten = (e.essen?.mahlzeiten ?? []).map((m) => ({
    art: m.art, um: uhrzeit(m.um), name: m.name, gericht: m.rezept?.name ?? m.gewaehlt?.name ?? m.name, kcal: m.kcal, proteinG: m.proteinG,
    rolle: m.gewaehlt ? "deine Wahl" : m.mitnehmen ? "zum Mitnehmen" : m.training === "davor" ? "vor dem Training" : m.training === "danach" ? "nach dem Training" : "",
    ...(m.gewaehlt ? { gewaehlt: true } : {}),
    ...(m.rezept ? { rezeptId: m.rezept.id, foto: m.rezept.foto } : {}),
  }));
  if (mahlzeiten.length) folien.push({ art: "essen", zielKcal: e.ziele.kcal, zielProteinG: e.ziele.proteinG, mahlzeiten });

  const geb = e.ablauf?.geburtstage ?? [];
  if (e.standards.length || geb.length) {
    folien.push({ art: "untergrenze", punkte: e.standards.slice(0, 3).map(standardTeile), geburtstage: geb });
  }

  const erster = g.tagTermine[0];
  folien.push({
    art: "ende", morgens,
    satz: morgens
      ? `Eins nach dem anderen. Zuerst: ${f.haupt}.`
      : erster ? `Morgen geht es um ${uhrzeit(erster.von)} los. Schlaf gut.` : "Schlaf gut. Morgen ist ein neuer Tag.",
  });
  return folien;
}

/**
 * Der eine Fokus des Tages. Die Reihenfolge ist die Entscheidung: eine
 * wichtige Aufgabe schlägt das Training, das Training schlägt den freien
 * Block. Ein voller Tag bekommt keinen Ehrgeiz, sondern die Untergrenze.
 */
function fokus(e: BriefingEingaben, tagWort: string): string {
  if (e.fokusWahl) {
    const a = e.aufgaben.find((x) => x.text === e.fokusWahl);
    return `${e.fokusWahl}${a?.um ? ` um ${a.um}` : ""}. Das hast du dir für ${tagWort} als Fokus gesetzt.`;
  }
  const voll = (e.ablauf?.auslastung ?? 0) >= 0.7;
  // Die Aufgabe der ersten Stufe geht vor: dieselbe Reihenfolge wie in der Übersicht,
  // sonst nennt der Fokus eine andere als das, was darunter oben steht.
  const stufe = (a: BriefingEingaben["aufgaben"][number]): number => a.stufe ?? (a.wichtig ? 1 : 2);
  const wichtig = e.aufgaben.find((a) => stufe(a) === 1) ?? e.aufgaben.find((a) => a.wichtig) ?? e.aufgaben[0];
  if (voll) {
    return wichtig
      ? `Der Tag ist voll. Nur eins zählt: ${wichtig.text}${wichtig.um ? ` um ${wichtig.um}` : ""}. Alles andere darf warten.`
      : "Der Tag ist voll. Halte deine Mindeststandards, mehr nicht.";
  }
  if (wichtig) {
    // "Das zuerst" nur, wenn es wirklich zuerst dran ist. Liegt eine andere
    // Aufgabe früher, hiess es vorher trotzdem "zuerst", und der Morgen
    // widersprach sich: Denise um 08:45, darunter "Slide zuerst" um 11:00.
    const frueher = wichtig.um ? e.aufgaben.some((a) => a !== wichtig && a.um && a.um < wichtig.um!) : false;
    return frueher || !wichtig.um
      ? `${wichtig.text}${wichtig.um ? ` um ${wichtig.um}` : ""}. Das ist ${tagWort === "heute" ? "heute" : tagWort} das Wichtigste.`
      : `${wichtig.text}, eingeplant um ${wichtig.um}. Das zuerst, alles andere danach.`;
  }
  if (e.training && !e.training.gestrichen) return `Dein ${e.training.titel}${e.training.um ? ` um ${e.training.um}` : ""}. Das ist ${tagWort} der feste Punkt.`;
  const block = e.ablauf?.fokusblock;
  if (block) return `Dein längster freier Block ist ${uhrzeit(block.von)} bis ${uhrzeit(block.bis)}. Leg dort hinein, was dich wirklich weiterbringt.`;
  return "Protein treffen und vor deiner Schlafenszeit im Bett sein. Das reicht für einen guten Tag.";
}

export function tagesbriefing(roh: BriefingEingaben): TagesBriefing {
  const grenze = begrenzt(roh);
  const e: BriefingEingaben = { ...roh, aufgaben: grenze.aufgaben, ablauf: roh.ablauf ? { ...roh.ablauf, termine: grenze.termine } : null };
  const morgens = e.art === "morgen";
  const tagWort = e.tagWort ?? (morgens ? "heute" : "morgen");
  const TagWort = tagWort.charAt(0).toUpperCase() + tagWort.slice(1);
  // Ein Tag weiter als morgen heisst im Abschnitt wie im Satz: Wochentag und Datum.
  const nurEinTag = tagWort === "heute" || tagWort === "morgen";
  const abschnitte: BriefingAbschnitt[] = [];

  // Abends zuerst, wie heute lief. Eine Zeile, kein Urteil.
  if (!morgens && e.heute) {
    const h = e.heute;
    const z = [`${h.kcal} von ${h.zielKcal} kcal und ${h.proteinG} von ${h.zielProteinG} g Protein.`];
    if (h.proteinG < h.zielProteinG - 25) {
      z.push(`Für Protein fehlen noch ${h.zielProteinG - h.proteinG} g. Ein Shake oder ein Quark vor dem Schlafen schliesst das.`);
    }
    if (h.erledigt) z.push(`${h.erledigt} ${h.erledigt === 1 ? "Aufgabe" : "Aufgaben"} erledigt.`);
    abschnitte.push({ titel: "Heute", zeilen: z });
  }

  // Der Tag: Termine knapp, mit freier Zeit.
  const tag: string[] = [];
  let kopf = "";
  const feierabendMs = grenze.feierabend;
  const tagTermine = (e.ablauf?.termine ?? []).filter((t) => feierabendMs === null || t.von < feierabendMs);
  const abendTermine = (e.ablauf?.termine ?? []).filter((t) => feierabendMs !== null && t.von >= feierabendMs);
  if (!e.ablauf) {
    tag.push("Kein Kalender verbunden. Ich sehe deine Termine nicht.");
  } else {
    // Termine nach Feierabend stehen nicht im Tag, sondern unter "Abends".
    const a = { ...e.ablauf, termine: tagTermine };
    const feiertage = ganztaegig(a);
    if (feiertage.length) tag.push(`Ganztägig: ${feiertage.join(", ")}.`);
    if (!a.termine.length) {
      kopf = nurEinTag ? `${TagWort} stehen keine Termine im Kalender.` : `Am ${TagWort} stehen keine Termine im Kalender.`;
      tag.push(kopf);
    } else {
      const erster = a.termine[0]!;
      const letzter = a.termine.reduce((x, y) => (y.bis > x.bis ? y : x));
      kopf = `${a.termine.length} ${a.termine.length === 1 ? "Termin" : "Termine"}, der erste um ${uhrzeit(erster.von)}, `
        + `fertig um ${uhrzeit(letzter.bis)}.`;
      tag.push(`${kopf} Verplant ${dauer(a.belegtMinuten)}.`);
      for (const t of a.termine.slice(0, MAX_TERMINE)) tag.push(`${uhrzeit(t.von)} ${ohneEigeneUhrzeit(t.titel, uhrzeit(t.von))}`);
      if (a.termine.length > MAX_TERMINE) tag.push(`und ${a.termine.length - MAX_TERMINE} weitere`);
      if (a.fokusblock) {
        // Das Training aus dem Profil steht nicht im Kalender, liegt aber oft
        // genau in diesem Block. Ohne den Zusatz klänge der Abend leer.
        const tr = e.training && !e.training.gestrichen && e.training.um ? e.training.um : "";
        const drin = tr && tr >= uhrzeit(a.fokusblock.von) && tr < uhrzeit(a.fokusblock.bis);
        tag.push(`Frei am Stück: ${uhrzeit(a.fokusblock.von)} bis ${uhrzeit(a.fokusblock.bis)}${drin ? `, darin dein Training um ${tr}` : ""}.`);
      }
    }
  }
  abschnitte.push({ titel: morgens ? "Dein Tag" : (tagWort === "morgen" ? "Morgen" : TagWort), zeilen: tag });

  // Der Fokus, ein Satz.
  const fokusSatz = fokus(e, tagWort);
  abschnitte.push({ titel: "Fokus", zeilen: [fokusSatz] });

  // Abends: was heute Abend für morgen zu tun ist. Morgens: worauf achten.
  const achtung = (e.vorausblick?.punkte ?? []).filter((p) => p.art !== "voll").map((p) => p.text);
  if (achtung.length) abschnitte.push({ titel: morgens ? "Achtung" : "Heute Abend vorbereiten", zeilen: achtung });

  // Zu tun: Training, Aufgaben.
  const tun: string[] = [];
  if (e.training) {
    tun.push(e.training.gestrichen
      ? `Training ist ${tagWort} gestrichen, der Tag gehört der Erholung.`
      : `${e.training.titel}${e.training.um ? ` um ${e.training.um}` : ""}${e.training.minuten ? `, ${e.training.minuten} Minuten` : ""}`
        + `${e.training.uebungen ? `, ${e.training.uebungen} Übungen` : ""}.`);
  }
  // In der Reihenfolge, die daevo vorgibt: absolute Priorität, dann Priorität 2.
  // Ohne Einstufung zählt eine wichtige Aufgabe als SortierStufe 1, jede andere als 2.
  const stufeVon = (a: BriefingEingaben["aufgaben"][number]): SortierStufe => a.stufe ?? (a.wichtig ? 1 : 2);
  const sortiert = e.aufgaben.map((a, i) => ({ a, i })).sort((x, y) => stufeVon(x.a) - stufeVon(y.a) || x.i - y.i).map((x) => x.a);
  for (const a of sortiert.slice(0, 3)) {
    tun.push(`${stufeVon(a) === 1 ? "Zuerst" : "Danach"}: ${a.um ? `${a.um} ` : ""}${a.text}${a.grund ? ` (${a.grund})` : ""}`);
  }
  if (sortiert.length > 3) tun.push(`und ${sortiert.length - 3} weitere unter Dein Tag`);
  if (grenze.feierabend !== null) tun.push(`Ab ${uhrzeit(grenze.feierabend)} ist Feierabend. Danach kein Termin und keine Aufgabe mehr, ausser es brennt.`);
  if (tun.length) abschnitte.push({ titel: "Zu tun", zeilen: tun });
  const warten = e.warten ?? [];
  if (warten.length) {
    abschnitte.push({ titel: "Kann bis morgen warten", zeilen: [warten.slice(0, 4).map((w) => w.text).join(", ") + (warten.length > 4 ? ` und ${warten.length - 4} weitere` : "")] });
  }
  if (abendTermine.length) {
    abschnitte.push({ titel: "Abends, nach Feierabend", zeilen: abendTermine.map((t) => `${uhrzeit(t.von)} ${ohneEigeneUhrzeit(t.titel, uhrzeit(t.von))}`) });
  }

  // Essen: jede Mahlzeit mit Uhrzeit und Gericht.
  const essen = (e.essen?.mahlzeiten ?? []).map((m) =>
    `${uhrzeit(m.um)} ${m.name}: ${m.rezept ? `${m.rezept.name}, ` : m.gewaehlt ? `${m.gewaehlt.name}, ` : ""}${m.kcal} kcal, ${m.proteinG} g Protein`
    + `${m.mitnehmen ? ", zum Mitnehmen" : m.training === "davor" ? ", vor dem Training" : m.training === "danach" ? ", nach dem Training" : ""}`);
  if (essen.length) {
    abschnitte.push({ titel: "Essen", zeilen: [`Ziel: ${e.ziele.kcal} kcal, ${e.ziele.proteinG} g Protein.`, ...essen] });
  }

  if (e.standards.length) abschnitte.push({ titel: "Deine Untergrenze", zeilen: e.standards.slice(0, 3) });

  // Zuletzt, nach allem, was zu tun ist: wem heute zu gratulieren ist.
  const geb = e.ablauf?.geburtstage ?? [];
  if (geb.length) {
    const namen = geb.length === 1 ? geb[0]! : `${geb.slice(0, -1).join(", ")} und ${geb[geb.length - 1]}`;
    abschnitte.push({
      titel: "Nicht vergessen",
      zeilen: [morgens
        ? `${namen} ${geb.length === 1 ? "hat" : "haben"} heute Geburtstag. Gratulier ${geb.length === 1 ? "heute noch" : "ihnen heute noch"}.`
        : `${namen} ${geb.length === 1 ? "hat" : "haben"} morgen Geburtstag. Gratulier ${geb.length === 1 ? "morgen" : "ihnen morgen"} gleich früh.`],
    });
  }

  // Die Mitteilung: abends das, was heute Abend zu tun ist, morgens der Tag
  // in einer Zeile und der Fokus.
  const titel = morgens ? `Dein Tag, ${e.datum}` : (e.vorausblick?.titel ?? `Morgen, ${e.datum}`);
  const kurz = morgens
    ? [kopf || null, fokusSatz].filter(Boolean).join(" ")
    : (achtung[0] ?? [kopf || null, `Fokus: ${fokusSatz}`].filter(Boolean).join(" "));

  const text = [
    morgens ? ((e.stunde === undefined || e.stunde < 11) ? `Guten Morgen. ${e.datum}.` : `Dein Tag, ${e.datum}.`) : (nurEinTag ? `Dein Blick auf morgen, ${e.datum}.` : `Dein Blick auf ${tagWort}.`),
    ...abschnitte.map((a) => `\n${a.titel}\n${a.zeilen.map((z) => (a.zeilen.length > 1 ? `- ${z}` : z)).join("\n")}`),
  ].join("\n");

  const folien = briefingFolien(e, { tagWort, feierabend: grenze.feierabend, tagTermine, kopf });
  return { art: e.art, titel, kurz, abschnitte, text, punkte: briefingPunkte(e), reihenfolge: reihenfolgeBauen(e, grenze.feierabend), musterHinweis: roh.musterHinweis ?? null, folien };
}

function amTag(tag: string, hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return null;
  return new Date(`${tag}T00:00:00`).getTime() + (Number(m[1]) * 60 + Number(m[2])) * 60000;
}

/**
 * Der Tag als eine Liste: Termine, Aufgaben, Mahlzeiten und Training, nach
 * Uhrzeit. Vorher standen sie in fünf Abschnitten untereinander, und der Tag
 * sah aus wie dreissig Punkte. Eine Zeitachse beantwortet die eine Frage, die
 * zählt: was kommt als Nächstes. Aufgaben ohne Platz im Tag stehen am Ende.
 */
export function briefingPunkte(e: BriefingEingaben): BriefingPunkt[] {
  const tag = e.ablauf?.tag ?? (e.essen?.mahlzeiten[0] ? new Date(e.essen.mahlzeiten[0].um).toISOString().slice(0, 10) : "");
  const punkte: BriefingPunkt[] = [];
  if (e.ablauf) {
    const fa = feierabendZeitpunkt(e.ablauf.wachVon, e.ablauf.wachBis);
    punkte.push({ art: "feierabend", um: fa, titel: "Feierabend", unter: "Ab jetzt kein Termin und keine Aufgabe mehr" });
  }
  for (const t of e.ablauf?.termine ?? []) {
    punkte.push({ art: "termin", um: t.von, bis: t.bis, titel: ohneEigeneUhrzeit(t.titel, uhrzeit(t.von)), unter: `Termin bis ${uhrzeit(t.bis)}` });
  }
  for (const a of e.aufgaben) {
    punkte.push({ art: "aufgabe", um: tag && a.um ? amTag(tag, a.um) : null, titel: a.text, unter: a.wichtig ? "Aufgabe, wichtig" : "Aufgabe", id: a.id, wichtig: a.wichtig });
  }
  for (const m of e.essen?.mahlzeiten ?? []) {
    const rolle = m.mitnehmen ? ", zum Mitnehmen" : m.training === "davor" ? ", vor dem Training" : m.training === "danach" ? ", nach dem Training" : "";
    punkte.push({
      art: "essen", um: m.um, titel: m.rezept ? m.rezept.name : m.gewaehlt ? m.gewaehlt.name : m.name,
      unter: `${m.name}, ${m.kcal} kcal, ${m.proteinG} g Protein${rolle}`,
      rezeptId: m.rezept?.id, foto: m.rezept?.foto, mahlzeit: m.art, kcal: m.kcal,
    });
  }
  // Das Training nur, wenn es nicht schon als Termin im Kalender steht.
  const tr = e.training;
  if (tr && !tr.gestrichen) {
    const um = tag && tr.um ? amTag(tag, tr.um) : null;
    const schonDa = um !== null && (e.ablauf?.training ?? []).some((t) => Math.abs(t.von - um) < 30 * 60000);
    if (!schonDa) {
      punkte.push({
        art: "training", um, bis: um !== null && tr.minuten ? um + tr.minuten * 60000 : undefined, titel: tr.titel,
        unter: [tr.minuten ? `${tr.minuten} Minuten` : "", tr.uebungen ? `${tr.uebungen} Übungen` : ""].filter(Boolean).join(", ") || "Training",
      });
    }
  }
  return punkte.sort((x, y) => (x.um ?? Infinity) - (y.um ?? Infinity));
}

/**
 * Was jetzt dran ist: der erste Punkt, der noch nicht vorbei ist. Ein Termin
 * gilt bis zu seinem Ende, alles andere eine Viertelstunde über seine Zeit
 * hinaus. Aufgaben ohne Uhrzeit kommen erst, wenn der Tag nichts mehr hat.
 */
export function naechsterPunkt(punkte: BriefingPunkt[], jetzt: number): number {
  const i = punkte.findIndex((p) => p.um === null || (p.bis ?? p.um + 15 * 60000) > jetzt);
  return i;
}


/**
 * Der Tag in der Reihenfolge, die daevo vorgibt, für die Anzeige:
 * 1 absolute Priorität, 2 Priorität 2, dazwischen Termine, Essen und
 * Training nach Uhrzeit, dann was bis morgen warten darf, und ganz unten die
 * Abendtermine nach Feierabend. Aufgaben stehen nie unter Abends: nach
 * Feierabend ist Schluss, ausser etwas darf nicht warten, und das steht dann
 * schon oben unter Zuerst.
 */
export function reihenfolgeBauen(e: BriefingEingaben, feierabend: number | null): SortierGruppe[] {
  const tag = e.ablauf?.tag ?? "";
  const stufeVon = (a: BriefingEingaben["aufgaben"][number]): SortierStufe => a.stufe ?? (a.wichtig ? 1 : 2);
  const alsPunkt = (a: BriefingEingaben["aufgaben"][number]): SortierPunkt => ({
    art: "aufgabe", titel: a.text, id: a.id, grund: a.grund,
    um: tag && a.um ? amTag(tag, a.um) : null,
    unter: [a.um ? `um ${a.um}` : "", a.grund ?? ""].filter(Boolean).join(", ") || "Aufgabe",
  });
  const zuerst = e.aufgaben.filter((a) => stufeVon(a) === 1).map(alsPunkt);
  const danach = e.aufgaben.filter((a) => stufeVon(a) === 2).map(alsPunkt);
  // Eine Aufgabe der dritten SortierStufe, die heute Platz hat, darf heute, muss aber nicht.
  const warten: SortierPunkt[] = [
    ...e.aufgaben.filter((a) => stufeVon(a) === 3).map((a) => ({ ...alsPunkt(a), unter: "wenn Zeit bleibt" })),
    ...(e.warten ?? []).map((w): SortierPunkt => ({ art: "aufgabe", titel: w.text, id: w.id, um: null, unter: w.grund || "kann warten", grund: w.grund })),
  ];

  const alle = briefingPunkte(e).filter((p) => p.art !== "aufgabe" && p.art !== "feierabend");
  const vorFeierabend = (p: BriefingPunkt) => feierabend === null || p.um === null || p.um < feierabend;
  const alsSort = (p: BriefingPunkt): SortierPunkt => ({ art: p.art as SortierPunkt["art"], titel: p.titel, unter: p.unter, um: p.um, rezeptId: p.rezeptId, foto: p.foto, ...(p.mahlzeit ? { mahlzeit: p.mahlzeit } : {}) });
  const dazwischen = alle.filter(vorFeierabend).map(alsSort);
  const abends = alle.filter((p) => !vorFeierabend(p) && p.art === "termin").map(alsSort);

  const gruppen: SortierGruppe[] = [
    { id: "zuerst", nr: 1, titel: "Absolute Priorität", unter: "Umsatz, Geld, Frist heute, höchste Wichtigkeit", punkte: zuerst },
    { id: "danach", nr: 2, titel: "Priorität 2", unter: "wichtig, Frist in den nächsten Tagen", punkte: danach },
    { id: "dazwischen", titel: "Dazwischen", unter: "Termine, Essen und Training nach Uhrzeit", punkte: dazwischen },
    { id: "warten", nr: 3, titel: "Kann auf morgen warten", unter: "ohne Frist und ohne Umsatz", punkte: warten },
    { id: "abends", titel: "Abends, nach Feierabend", unter: feierabend !== null ? `ab ${uhrzeit(feierabend)}, nur Termine` : "nur Termine", punkte: abends },
  ];
  return gruppen.filter((g) => g.punkte.length > 0);
}
