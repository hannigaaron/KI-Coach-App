import { uhrzeit } from "./ical.js";
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
}

export interface BriefingPunkt {
  art: "aufgabe" | "termin" | "essen" | "training";
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
  aufgaben: Array<{ id?: string; text: string; um?: string; wichtig?: boolean }>;
  ziele: { kcal: number; proteinG: number };
  /** Nur abends: wie der heutige Tag stand. */
  heute?: { kcal: number; zielKcal: number; proteinG: number; zielProteinG: number; erledigt: number };
  /** Mindeststandards, die noch offen sind, je ein kurzer Satz. */
  standards: string[];
}

const MAX_TERMINE = 6;

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

export function tagesbriefing(e: BriefingEingaben): TagesBriefing {
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
  if (!e.ablauf) {
    tag.push("Kein Kalender verbunden. Ich sehe deine Termine nicht.");
  } else {
    const a = e.ablauf;
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
  // Die drei wichtigsten, dann nach Uhrzeit: so liest man den Tag von oben nach unten.
  const drei = e.aufgaben.slice(0, 3).sort((x, y) => (x.um ?? "99").localeCompare(y.um ?? "99"));
  for (const a of drei) tun.push(`${a.um ? `${a.um} ` : ""}${a.text}`);
  if (e.aufgaben.length > 3) tun.push(`und ${e.aufgaben.length - 3} weitere unter Dein Tag`);
  if (tun.length) abschnitte.push({ titel: "Zu tun", zeilen: tun });

  // Essen: jede Mahlzeit mit Uhrzeit und Gericht.
  const essen = (e.essen?.mahlzeiten ?? []).map((m) =>
    `${uhrzeit(m.um)} ${m.name}: ${m.rezept ? `${m.rezept.name}, ` : ""}${m.kcal} kcal, ${m.proteinG} g Protein`
    + `${m.mitnehmen ? ", zum Mitnehmen" : m.training === "davor" ? ", vor dem Training" : m.training === "danach" ? ", nach dem Training" : ""}`);
  if (essen.length) {
    abschnitte.push({ titel: "Essen", zeilen: [`Ziel: ${e.ziele.kcal} kcal, ${e.ziele.proteinG} g Protein.`, ...essen] });
  }

  if (e.standards.length) abschnitte.push({ titel: "Deine Untergrenze", zeilen: e.standards.slice(0, 3) });

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

  return { art: e.art, titel, kurz, abschnitte, text, punkte: briefingPunkte(e) };
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
