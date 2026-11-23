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
}

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
  /** Aufgaben, die bis morgen warten dürfen. Sie stehen als dritte SortierStufe da, nicht im Tag. */
  warten?: Array<{ id?: string; text: string; grund?: string }>;
  ziele: { kcal: number; proteinG: number };
  /** Nur abends: wie der heutige Tag stand. */
  heute?: { kcal: number; zielKcal: number; proteinG: number; zielProteinG: number; erledigt: number };
  /** Mindeststandards, die noch offen sind, je ein kurzer Satz. */
  standards: string[];
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
 * Der eine Fokus des Tages. Die Reihenfolge ist die Entscheidung: eine
 * wichtige Aufgabe schlägt das Training, das Training schlägt den freien
 * Block. Ein voller Tag bekommt keinen Ehrgeiz, sondern die Untergrenze.
 */
function fokus(e: BriefingEingaben, tagWort: string): string {
  const voll = (e.ablauf?.auslastung ?? 0) >= 0.7;
  const wichtig = e.aufgaben.find((a) => a.wichtig) ?? e.aufgaben[0];
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
      ? `${wichtig.text}${wichtig.um ? ` um ${wichtig.um}` : ""}. Das ist heute das Wichtigste.`
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
  const tagWort = morgens ? "heute" : "morgen";
  const TagWort = morgens ? "Heute" : "Morgen";
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
      kopf = `${TagWort} stehen keine Termine im Kalender.`;
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
  abschnitte.push({ titel: morgens ? "Dein Tag" : "Morgen", zeilen: tag });

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
    `${uhrzeit(m.um)} ${m.name}: ${m.rezept ? `${m.rezept.name}, ` : ""}${m.kcal} kcal, ${m.proteinG} g Protein`
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
    morgens ? `Guten Morgen. ${e.datum}.` : `Dein Blick auf morgen, ${e.datum}.`,
    ...abschnitte.map((a) => `\n${a.titel}\n${a.zeilen.map((z) => (a.zeilen.length > 1 ? `- ${z}` : z)).join("\n")}`),
  ].join("\n");

  return { art: e.art, titel, kurz, abschnitte, text, punkte: briefingPunkte(e), reihenfolge: reihenfolgeBauen(e, grenze.feierabend), musterHinweis: roh.musterHinweis ?? null };
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
      art: "essen", um: m.um, titel: m.rezept ? m.rezept.name : m.name,
      unter: `${m.name}, ${m.kcal} kcal, ${m.proteinG} g Protein${rolle}`,
      rezeptId: m.rezept?.id, foto: m.rezept?.foto,
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
  const alsSort = (p: BriefingPunkt): SortierPunkt => ({ art: p.art as SortierPunkt["art"], titel: p.titel, unter: p.unter, um: p.um, rezeptId: p.rezeptId, foto: p.foto });
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
