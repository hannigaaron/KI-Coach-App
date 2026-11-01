import type { Termin } from "./ical.js";
import { uhrzeit } from "./ical.js";
import { freienPlatzFinden, PUFFER_MIN } from "./kalenderplan.js";
import type { Tagesablauf } from "./tagesablauf.js";
import { tagesrandFuer } from "./tagesrand.js";
import type { TrainingSession, UserProfile } from "./types.js";

/**
 * Der Blick auf morgen, am Abend davor.
 *
 * `tagesablauf` liest einen Tag, aber nur, wenn jemand fragt. Ein Coach
 * sagt es am Vorabend von selbst: morgen hast du mittags keine Lücke, koch
 * heute eine Portion mehr. Dein Training um 18:15 liegt auf dem Termin mit
 * dem Kunden, frei wäre 20:00. Genau dann lässt sich noch etwas ändern, am
 * Morgen selbst ist es zu spät zum Vorkochen.
 *
 * Gerechnet, nicht geraten. Jeder Punkt hängt an einer Zahl aus Kalender
 * oder Profil, und es kommt nur etwas, wenn es etwas zu tun gibt. Ein Abend,
 * an dem jeden Tag eine Meldung kommt, wird weggewischt, mitsamt dem Abend,
 * an dem sie zählt.
 */

export type VorausArt = "vorkochen" | "training" | "frueh" | "voll";

export interface VorausPunkt {
  art: VorausArt;
  text: string;
}

export interface Vorausblick {
  /** Der Tag, um den es geht. */
  tag: string;
  punkte: VorausPunkt[];
  /** Kurz für die Mitteilung: der wichtigste Punkt zuerst. */
  titel: string;
  text: string;
}

/** Ab diesem Anteil verplanter Wachzeit gilt ein Tag als voll. Regel der App. */
export const VOLL_AB = 0.6;
/** So lange braucht eine Mahlzeit mindestens. Wie in `tagesablauf`. */
const ESSEN_MIN = 20;

function zeitAmTag(tag: string, hhmm: string): number {
  const [h, m] = (hhmm || "00:00").split(":");
  return new Date(`${tag}T00:00:00`).getTime() + (Number(h) * 60 + Number(m)) * 60000;
}

function wochentag(tag: string): number {
  return new Date(`${tag}T12:00:00`).getDay();
}

function dauerText(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} Minuten`;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} Stunden`;
}

/** Ob eine Lücke ein Zeitfenster um mindestens `min` Minuten berührt. */
function hatLuecke(a: Tagesablauf, von: string, bis: string, min: number): boolean {
  const f0 = zeitAmTag(a.tag, von);
  const f1 = zeitAmTag(a.tag, bis);
  return a.luecken.some((l) => Math.min(l.bis, f1) - Math.max(l.von, f0) >= min * 60000);
}

const ART_NAME: Record<string, string> = {
  strength: "Krafttraining", cardio: "Ausdauer", team_sport: "Mannschaftssport", mobility: "Mobilität",
};

/**
 * Was für morgen ansteht. `morgen` ist der fertig gelesene Tag, `termine` der
 * ganze Kalender, damit ein Ausweichplatz gefunden werden kann.
 *
 * Null heisst: nichts zu tun. Dann kommt auch keine Mitteilung.
 */
export function vorausblick(p: {
  morgen: Tagesablauf;
  termine: Termin[];
  profile: UserProfile;
  /**
   * Von wann aus gesprochen wird. "morgen" ist der Vorabend, "heute" das
   * Morgenbriefing: dann heisst es nicht "koch heute Abend vor", sondern
   * "nimm dir etwas mit".
   */
  fuer?: "morgen" | "heute";
}): Vorausblick | null {
  const { morgen, termine, profile } = p;
  const heute = p.fuer === "heute";
  const Tag = heute ? "Heute" : "Morgen";
  const tag = heute ? "heute" : "morgen";
  // Ohne einen einzigen Termin weiss der Kalender nichts über morgen. Ein
  // leerer Tag ist hier keine Aussage, ein nicht verbundener Kalender auch
  // nicht.
  if (!morgen.termine.length) return null;
  const punkte: VorausPunkt[] = [];

  // Essen. Mittag zwischen 11 und 15 Uhr, Abend zwischen 17 und 21 Uhr.
  const ohneMittag = !hatLuecke(morgen, "11:00", "15:00", ESSEN_MIN);
  const ohneAbend = !hatLuecke(morgen, "17:00", "21:00", ESSEN_MIN + 10);
  if (ohneMittag && ohneAbend) {
    punkte.push({
      art: "vorkochen",
      text: heute
        ? "Heute hast du weder mittags noch abends eine Lücke zum Essen. Pack dir zwei Mahlzeiten ein, bevor du losgehst."
        : "Morgen hast du weder mittags noch abends eine Lücke zum Essen. Koch heute Abend doppelt und pack "
          + "zwei Portionen ein, sonst fallen beide Mahlzeiten aus und der späte Abend wird zu groß.",
    });
  } else if (ohneMittag) {
    punkte.push({
      art: "vorkochen",
      text: heute
        ? "Heute hast du zwischen 11 und 15 Uhr keine 20 Minuten frei. Nimm dir etwas mit oder iss vor 11 Uhr."
        : "Morgen hast du zwischen 11 und 15 Uhr keine 20 Minuten frei. Koch heute Abend eine Portion mehr "
          + "und nimm sie mit.",
    });
  } else if (ohneAbend) {
    punkte.push({
      art: "vorkochen",
      text: heute
        ? "Heute hast du zwischen 17 und 21 Uhr keine halbe Stunde frei. Iss vorher etwas Richtiges oder nimm dir etwas mit."
        : "Morgen hast du zwischen 17 und 21 Uhr keine halbe Stunde frei. Bereite das Abendessen heute vor, "
          + "dann steht es morgen in fünf Minuten auf dem Tisch.",
    });
  }

  // Training. Steht eins im Kalender, gilt das. Sonst die feste Einheit aus
  // dem Profil, und nur die lässt sich gegen den Kalender prüfen: ein
  // Mannschaftstraining hat eine feste Halle und Uhrzeit, das verschiebt
  // niemand allein.
  if (!morgen.training.length) {
    const einheiten = (profile.sessions || []).filter((s: TrainingSession) =>
      s.weekday === wochentag(morgen.tag) && s.type !== "team_sport" && /^\d{1,2}:\d{2}$/.test(s.startsAt));
    for (const s of einheiten) {
      const von = zeitAmTag(morgen.tag, s.startsAt);
      const bis = von + s.minutes * 60000;
      const puffer = PUFFER_MIN * 60000;
      const stoerer = morgen.termine.find((t) => t.von < bis + puffer && t.bis > von - puffer);
      if (!stoerer) continue;
      const art = ART_NAME[s.type] ?? "Training";
      const platz = freienPlatzFinden({
        termine, profile, wunsch: { minuten: s.minutes, ab: zeitAmTag(morgen.tag, "00:00"), tage: 1, uhrzeit: s.startsAt },
      });
      if (platz) {
        punkte.push({
          art: "training",
          text: `Dein ${art} um ${s.startsAt} liegt ${tag} auf „${stoerer.titel}“. Frei wäre ${uhrzeit(platz.von)} `
            + `bis ${uhrzeit(platz.bis)}. Sag Bescheid, dann trage ich es dort ein.`,
        });
        continue;
      }
      const kurz = Math.min(30, s.minutes);
      const kurzPlatz = freienPlatzFinden({
        termine, profile, wunsch: { minuten: kurz, ab: zeitAmTag(morgen.tag, "00:00"), tage: 1, uhrzeit: s.startsAt },
      });
      punkte.push({
        art: "training",
        text: kurzPlatz
          ? `Für dein ${art} über ${s.minutes} Minuten ist ${tag} kein Platz, „${stoerer.titel}“ liegt um ${s.startsAt}. `
            + `Für ${kurz} Minuten wäre ${uhrzeit(kurzPlatz.von)} frei, nur Grundübungen, unter Training für heute.`
          : `Für dein ${art} ist ${tag} kein Platz, auch keine halbe Stunde. Plan es lieber bewusst auf einen anderen `
            + `Tag, statt es ${tag} ausfallen zu lassen.`,
      });
    }
  }

  // Früher Start: der erste Termin liegt in der ersten Stunde nach dem
  // Aufstehen oder davor. Dann gehört das Frühstück auf den Abend vorher.
  const rand = tagesrandFuer(profile, morgen.tag);
  const erster = morgen.termine[0]!;
  const aufstehen = zeitAmTag(morgen.tag, rand.wakeTime);
  if (erster.von < aufstehen + 60 * 60000) {
    punkte.push({
      art: "frueh",
      text: erster.von < aufstehen
        ? `${Tag} beginnt „${erster.titel}“ schon um ${uhrzeit(erster.von)}, vor deiner Aufstehzeit ${rand.wakeTime}. `
          + (heute ? "Iss unterwegs etwas mit Protein." : "Stell den Wecker früher und geh heute entsprechend früher ins Bett.")
        : `${Tag} beginnt „${erster.titel}“ um ${uhrzeit(erster.von)}, eine Stunde nach dem Aufstehen. `
          + (heute ? "Frühstück zuerst, bevor das Handy dich hat." : "Leg Frühstück und Tasche heute Abend bereit."),
    });
  }

  // Ein voller Tag allein ist eine Zahl und noch keine Aufgabe. Er kommt nur
  // als Einleitung, wenn es dazu etwas zu tun gibt, oder ab 75 Prozent.
  const voll = morgen.auslastung >= VOLL_AB;
  if (voll && (punkte.length || morgen.auslastung >= 0.75)) {
    const wach = Math.round((morgen.wachBis - morgen.wachVon) / 60000);
    punkte.unshift({
      art: "voll",
      text: `${Tag} ist voll: ${dauerText(morgen.belegtMinuten)} von ${dauerText(wach)} Wachzeit sind verplant.`,
    });
  }

  if (!punkte.length) return null;
  const haupt = punkte.find((x) => x.art !== "voll") ?? punkte[0]!;
  const titel = haupt.art === "vorkochen" ? (heute ? "Essen mitnehmen" : "Für morgen vorkochen")
    : haupt.art === "training" ? `Training ${tag}`
    : haupt.art === "frueh" ? `${Tag} geht es früh los`
    : `${Tag} ist voll`;
  return { tag: morgen.tag, punkte, titel, text: haupt.text };
}

/** Alle Punkte als Absatz, für den Coach und die Ansicht. */
export function vorausblickText(v: Vorausblick | null): string {
  if (!v) return "";
  return v.punkte.map((x) => x.text).join(" ");
}

/**
 * Wann die Mitteilung kommt: 20 Uhr, aber spätestens 90 Minuten vor der
 * Schlafenszeit des Abends. Wer um 21:30 schläft, kocht um 20 Uhr nicht mehr.
 */
export function vorausblickUhrzeit(profile: UserProfile, abendTag: string): string {
  const { sleepTime } = tagesrandFuer(profile, abendTag);
  const [h, m] = sleepTime.split(":").map(Number);
  let schlaf = (h ?? 23) * 60 + (m ?? 0);
  // Nach Mitternacht schlafen heisst für diese Rechnung: spät, also 20 Uhr.
  if (schlaf < 12 * 60) schlaf += 24 * 60;
  const min = Math.max(17 * 60, Math.min(20 * 60, schlaf - 90));
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
