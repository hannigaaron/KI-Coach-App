import type { Aufgabe } from "./aufgaben.js";
import type { MacroTargets, UserProfile } from "./types.js";

/**
 * Wo das, was du sagst, und das, was du tust, auseinanderlaufen.
 *
 * Das ist der unangenehme Teil der App und der wertvollste. Jeder kennt seine
 * Ziele. Fast niemand rechnet nach, ob die letzten vier Wochen dazu passen.
 *
 * Zwei Regeln:
 *
 * Es wird nur genannt, was die App wirklich gemessen hat. Kein Widerspruch
 * wird aus einer Absicht abgeleitet, die irgendwo im Gespräch stand.
 *
 * Jeder Punkt nennt beide Zahlen und stellt eine Frage, statt ein Urteil zu
 * fällen. Ein Widerspruch ist eine Entscheidung, die ansteht, kein Vorwurf.
 * Manchmal ist die richtige Antwort, das Ziel zu ändern.
 */

export interface WiderspruchEingabe {
  profile: UserProfile;
  ziele: MacroTargets;
  /** Die letzten Tage, ältester zuerst. */
  tage: {
    tag: string;
    kcal: number | null;
    proteinG: number | null;
    /** Anzahl erfasster Mahlzeiten. */
    mahlzeiten: number;
    trainings: number;
    /** Im Kalender verplante Minuten. */
    terminMinuten: number | null;
  }[];
  aufgaben: Aufgabe[];
  /** Heute, JJJJ-MM-TT. */
  heute: string;
  /** Titel aller Termine der letzten Wochen, für die Aufteilung der Zeit. */
  terminTitel?: { titel: string; minuten: number }[];
}

export interface Widerspruch {
  /** Kurzer Name, für die Anzeige. */
  thema: string;
  /** Was du sagst. */
  anspruch: string;
  /** Was die Zahlen sagen. */
  wirklichkeit: string;
  /** Die Frage, die daraus folgt. */
  frage: string;
  /** Höher heisst dringender. */
  gewicht: number;
}

/** Ab dieser Abweichung wird ein Ziel als verfehlt behandelt. */
const TOLERANZ = 0.15;
/** Ab so vielen Tagen gilt eine wichtige Aufgabe als geschoben. */
const GESCHOBEN_AB_TAGEN = 7;

/**
 * Worte, an denen Termine grob einsortiert werden.
 *
 * Grob heisst grob. Ein Termin mit dem Titel "Anna" landet nirgends, und das
 * ist richtig so: lieber weniger einsortieren als falsch.
 */
const KATEGORIEN: { name: string; worte: string[] }[] = [
  { name: "Kundenarbeit", worte: ["kunde", "kundin", "training mit", "pt ", "personal training", "athletik", "zirkel", "stunde", "session"] },
  { name: "eigenes Training", worte: ["gym", "volleyball", "krafttraining", "workout", "laufen", "mobility"] },
  { name: "Aufbau und Content", worte: ["content", "reel", "video", "dreh", "podcast", "website", "marketing", "akquise", "angebot", "konzept", "yan", "franchise"] },
  { name: "Verwaltung", worte: ["steuer", "buchhaltung", "rechnung", "termin beim", "arzt", "amt", "versicherung"] },
];

export function widersprueche(e: WiderspruchEingabe): Widerspruch[] {
  const out: Widerspruch[] = [];
  const tage = e.tage;
  if (tage.length === 0) return out;

  /* Essen: das Ziel gegen den Durchschnitt der Tage, an denen erfasst wurde. */
  const mitEintrag = tage.filter((t) => t.mahlzeiten > 0);
  if (mitEintrag.length >= 7) {
    const proteinSchnitt = schnitt(mitEintrag.map((t) => t.proteinG ?? 0));
    if (proteinSchnitt < e.ziele.proteinG * (1 - TOLERANZ)) {
      const fehlt = Math.round(e.ziele.proteinG - proteinSchnitt);
      out.push({
        thema: "Protein",
        anspruch: `Dein Ziel steht bei ${e.ziele.proteinG} g Protein am Tag.`,
        wirklichkeit: `An den ${mitEintrag.length} erfassten Tagen waren es im Schnitt ${Math.round(proteinSchnitt)} g, also ${fehlt} g zu wenig.`,
        frage: `Willst du das Ziel halten und ${fehlt} g dazulegen, oder ist das Ziel zu hoch angesetzt?`,
        gewicht: 70,
      });
    }

    const kcalSchnitt = schnitt(mitEintrag.map((t) => t.kcal ?? 0));
    const abweichung = (kcalSchnitt - e.ziele.kcal) / e.ziele.kcal;
    if (Math.abs(abweichung) > TOLERANZ) {
      const zuViel = abweichung > 0;
      const ziel = { fat_loss: "Fett verlieren", maintain: "Gewicht halten", lean_bulk: "Muskeln aufbauen" }[e.profile.goal];
      out.push({
        thema: "Kalorien",
        anspruch: `Dein Ziel ist ${ziel}, dafür stehen ${e.ziele.kcal} kcal am Tag.`,
        wirklichkeit: `An den erfassten Tagen waren es im Schnitt ${Math.round(kcalSchnitt)} kcal, ` +
          `also ${Math.abs(Math.round(kcalSchnitt - e.ziele.kcal))} kcal ${zuViel ? "mehr" : "weniger"}.`,
        frage: zuViel
          ? "Ist das Ziel zu knapp gerechnet, oder fehlt die Umsetzung an den Abenden?"
          : "Isst du wirklich so wenig, oder fehlt einfach die Hälfte in der Erfassung?",
        gewicht: 65,
      });
    }
  }

  /* Erfassung: ohne Daten ist jede Auswertung wertlos, auch diese hier. */
  const quote = mitEintrag.length / tage.length;
  if (tage.length >= 14 && quote < 0.5) {
    out.push({
      thema: "Erfassung",
      anspruch: "Du willst wissen, ob dein Plan funktioniert.",
      wirklichkeit: `An ${mitEintrag.length} von ${tage.length} Tagen ist etwas erfasst, das sind ${Math.round(quote * 100)} Prozent.`,
      frage: "Ohne die andere Hälfte kann ich nichts messen. Reicht dir eine Woche sauber erfassen, um es zu prüfen?",
      gewicht: 80,
    });
  }

  /* Training: der Plan im Profil gegen die eingetragenen Einheiten. */
  const wochen = tage.length / 7;
  if (wochen >= 2 && e.profile.sessions.length > 0) {
    const geplant = e.profile.sessions.length * wochen;
    const tatsaechlich = tage.reduce((s, t) => s + t.trainings, 0);
    if (tatsaechlich < geplant * (1 - TOLERANZ)) {
      out.push({
        thema: "Training",
        anspruch: `Im Profil stehen ${e.profile.sessions.length} Einheiten die Woche.`,
        wirklichkeit: `In ${Math.round(wochen * 10) / 10} Wochen sind ${tatsaechlich} Einheiten eingetragen, geplant wären ${Math.round(geplant)}.`,
        frage: "Trägst du sie nur nicht ein, oder fallen sie wirklich aus? Beides hat eine andere Lösung.",
        gewicht: 60,
      });
    }
  }

  /* Aufgaben: was du wichtig nennst und trotzdem seit Wochen schiebst. */
  const geschoben = e.aufgaben.filter((a) =>
    !a.erledigt && a.wichtigkeit >= 3 && tageSeit(a.erstellt.slice(0, 10), e.heute) >= GESCHOBEN_AB_TAGEN);
  if (geschoben.length > 0) {
    const aeltest = geschoben
      .map((a) => ({ a, tage: tageSeit(a.erstellt.slice(0, 10), e.heute) }))
      .sort((x, y) => y.tage - x.tage)[0]!;
    out.push({
      thema: "Geschobenes",
      anspruch: `Du hast ${geschoben.length} ${geschoben.length === 1 ? "Aufgabe" : "Aufgaben"} als wichtig markiert.`,
      wirklichkeit: `"${aeltest.a.text}" steht seit ${aeltest.tage} Tagen offen, geschätzt ${aeltest.a.minuten} Minuten Aufwand.`,
      frage: "Entweder heute ein Termin dafür, oder runter auf normal. Eine wichtige Aufgabe, die vier Wochen liegt, war nicht wichtig.",
      gewicht: 85,
    });
  }

  /* Zeit: wofür der Kalender wirklich draufgeht. */
  const verteilung = zeitverteilung(e.terminTitel ?? []);
  if (verteilung.gesamt >= 600) {
    const aufbau = verteilung.nach.get("Aufbau und Content") ?? 0;
    const kunden = verteilung.nach.get("Kundenarbeit") ?? 0;
    if (kunden > 0 && aufbau < kunden * 0.15) {
      out.push({
        thema: "Zeitverteilung",
        anspruch: "Du willst etwas aufbauen, das ohne deine Anwesenheit läuft.",
        wirklichkeit: `Im Kalender stehen ${stunden(kunden)} Kundenarbeit und ${stunden(aufbau)} für Aufbau und Content.`,
        frage: "Wie soll aus dieser Aufteilung etwas entstehen, das ohne dich läuft? Welcher Kundentermin fällt dafür weg?",
        gewicht: 90,
      });
    }
  }

  /* Schlaf: die eigene Schlafenszeit gegen die Termine, die danach enden. */
  const spaeteTage = tage.filter((t) => (t.terminMinuten ?? 0) > 0).length;
  if (spaeteTage >= 5) {
    const schnittMinuten = schnitt(tage.map((t) => t.terminMinuten ?? 0));
    if (schnittMinuten > 480) {
      out.push({
        thema: "Auslastung",
        anspruch: `Du stehst um ${e.profile.wakeTime} auf und willst um ${e.profile.sleepTime} im Bett sein.`,
        wirklichkeit: `Im Schnitt sind ${Math.round(schnittMinuten)} Minuten am Tag verplant, das sind ${stunden(schnittMinuten)}.`,
        frage: "Wo in diesem Tag liegen Erholung und der Aufbau, von dem du redest?",
        gewicht: 75,
      });
    }
  }

  return out.sort((a, b) => b.gewicht - a.gewicht);
}

function zeitverteilung(termine: { titel: string; minuten: number }[]): {
  nach: Map<string, number>;
  gesamt: number;
  ohne: number;
} {
  const nach = new Map<string, number>();
  let gesamt = 0;
  let ohne = 0;
  for (const t of termine) {
    gesamt += t.minuten;
    const titel = t.titel.toLowerCase();
    const treffer = KATEGORIEN.find((k) => k.worte.some((w) => titel.includes(w)));
    if (!treffer) { ohne += t.minuten; continue; }
    nach.set(treffer.name, (nach.get(treffer.name) ?? 0) + t.minuten);
  }
  return { nach, gesamt, ohne };
}

function tageSeit(vonIso: string, bisIso: string): number {
  const von = new Date(`${vonIso}T12:00:00`).getTime();
  const bis = new Date(`${bisIso}T12:00:00`).getTime();
  if (!Number.isFinite(von) || !Number.isFinite(bis)) return 0;
  return Math.max(0, Math.round((bis - von) / 86400000));
}

function schnitt(werte: number[]): number {
  return werte.length === 0 ? 0 : werte.reduce((s, w) => s + w, 0) / werte.length;
}

function stunden(minuten: number): string {
  const h = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  if (h === 0) return `${m} Minuten`;
  return m === 0 ? `${h} Stunden` : `${h} Stunden ${m} Minuten`;
}

/** Die Widersprüche in Worten. Ohne Fund wird das auch gesagt. */
export function widerspruchText(liste: Widerspruch[]): string {
  if (liste.length === 0) {
    return "In deinen Daten sehe ich gerade keinen Widerspruch zwischen Anspruch und Umsetzung.";
  }
  const zeilen: string[] = [];
  for (const w of liste) {
    zeilen.push(`${w.thema}: ${w.anspruch} ${w.wirklichkeit} ${w.frage}`);
  }
  return zeilen.join("\n");
}
