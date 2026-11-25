import { uhrzeit } from "./ical.js";
import type { Termin } from "./ical.js";
import { REZEPTE, type Rezept } from "./rezepte-daten.js";
import { postenText, rezeptEmpfehlungen, type Ernaehrung, type Posten } from "./rezepte.js";
import type { Tagesablauf } from "./tagesablauf.js";
import type { MacroTargets } from "./types.js";
import { mahlzeitInfo, verteileRest, type MahlzeitArt } from "./verteilung.js";

/**
 * Die Mahlzeiten eines Tages, nach dem Kalender gelegt und mit Rezept.
 *
 * Vorher stand dort viermal dieselbe Zahl, gleichmässig über den Tag
 * verteilt: "12:00, 787 kcal, 41 g Protein". Das hilft niemandem. Ein Coach
 * sagt: Frühstück um 7:45, mittags ist zwischen deinen Kunden genau eine
 * halbe Stunde frei, vor dem Training um 18:15 ein kleiner Snack mit
 * Kohlenhydraten, danach das grösste Essen des Tages. Und er sagt, was es
 * gibt.
 *
 * Gerechnet, nicht geraten. Die Grösse je Mahlzeit kommt aus `verteileRest`,
 * also aus dem Rest des Tages nach dem, was schon gegessen ist. Das Rezept
 * kommt aus `rezeptEmpfehlungen` mit allen Ausschlüssen des Nutzers. Die
 * Uhrzeit kommt aus den Lücken im Kalender.
 */

export interface GeplanteMahlzeit {
  art: MahlzeitArt;
  name: string;
  /** Zeitpunkt in Millisekunden. */
  um: number;
  kcal: number;
  proteinG: number;
  /** Warum genau hier und so gross. */
  grund: string;
  /** Kein freier Platz im Fenster: unterwegs essen, also vorbereiten. */
  mitnehmen: boolean;
  /** Rolle zum Training, falls es eine gibt. */
  training?: "davor" | "danach";
  /**
   * Selbst gewählt statt des Vorschlags, aus dem Briefing über "Ändern".
   * Die Werte sind die der Wahl, der Rest des Tages ist um sie herum gerechnet.
   */
  gewaehlt?: { name: string; posten: GewaehltPosten[] };
  rezept: null | {
    id: string;
    name: string;
    minuten: number;
    foto: boolean;
    kcal: number;
    proteinG: number;
    zutaten: string[];
    /** Die Zutaten in der gerechneten Portion, mit Werten, zum Eintragen. */
    posten: Posten[];
    /** Die Zubereitung des Rezepts. */
    schritte: string[];
  };
}

/** Ein Posten einer selbst gewählten Mahlzeit, wie ein Eintrag im Tag. */
export interface GewaehltPosten { name: string; quantity: string; kcal: number; proteinG: number; fatG: number; carbsG: number }

/** Eine Mahlzeit, die jemand für einen Tag gewählt hat, bevor sie gegessen ist. */
export interface GewaehlteMahlzeit {
  art: MahlzeitArt;
  name: string;
  /** HH:MM, ohne Angabe die Zeit des Vorschlags. */
  um?: string;
  posten: GewaehltPosten[];
}

/** Die eigenen Essenszeiten aus dem Fragebogen. */
export interface Essenszeiten {
  /** Minuten vom Aufstehen bis zur ersten Mahlzeit. */
  ersteNachMin?: number;
  /** Mittagessen als HH:MM. */
  mittag?: string;
  /** Abendessen als HH:MM. */
  abend?: string;
}

/**
 * Die Uhrzeit je Hauptmahlzeit an einem Tag, aus Aufstehzeit und Fragebogen,
 * als HH:MM. Für den Kalender, wenn ein Plan übernommen wird. Ohne Angabe
 * gelten 45 Minuten nach dem Aufstehen, 12:30 und 19:00, dieselben Wünsche
 * wie in den Fenstern oben.
 */
export function essensUhrzeiten(aufstehen: string, ez: Essenszeiten = {}): Record<"fruehstueck" | "mittagessen" | "abendessen", string> {
  const [h = 7, m = 0] = (aufstehen || "07:00").split(":").map(Number);
  const erste = (h * 60 + m) + (Number.isFinite(ez.ersteNachMin) ? Number(ez.ersteNachMin) : 45);
  const viertel = Math.round(erste / 15) * 15;
  const fruehstueck = `${String(Math.floor(viertel / 60) % 24).padStart(2, "0")}:${String(viertel % 60).padStart(2, "0")}`;
  const gueltig = (x?: string) => (x && /^\d{1,2}:\d{2}$/.test(x) ? x.padStart(5, "0") : null);
  return { fruehstueck, mittagessen: gueltig(ez.mittag) ?? "12:30", abendessen: gueltig(ez.abend) ?? "19:00" };
}

export interface Tagesessen {
  mahlzeiten: GeplanteMahlzeit[];
  /** Was schon gegessen ist, in Kalorien. */
  gegessenKcal: number;
  hinweise: string[];
}

/** Wann eine Mahlzeit sein darf, als Stunden. Regel der App, keine Studie. */
const FENSTER: Record<MahlzeitArt, { von: number; bis: number; wunsch: number }> = {
  fruehstueck: { von: 0, bis: 11, wunsch: 0 }, // von und wunsch hängen am Aufstehen, siehe unten
  mittagessen: { von: 11.5, bis: 14.5, wunsch: 12.5 },
  snack: { von: 15, bis: 17.5, wunsch: 16 },
  abendessen: { von: 18, bis: 21, wunsch: 19 },
};
const MIN_ESSEN = 20;
const MIN_SNACK = 10;

function amTag(tag: string, stunden: number): number {
  return new Date(`${tag}T00:00:00`).getTime() + Math.round(stunden * 60) * 60000;
}

function stundeVon(ms: number): number {
  const d = new Date(ms);
  return d.getHours() + d.getMinutes() / 60;
}

/** Der Zeitpunkt im Fenster, der dem Wunsch am nächsten liegt und in eine Lücke passt. */
function platzImFenster(a: Tagesablauf, von: number, bis: number, wunsch: number, dauer: number): number | null {
  let bester: number | null = null;
  for (const l of a.luecken) {
    const start = Math.max(l.von, von);
    const ende = Math.min(l.bis, bis);
    const spaetestens = ende - dauer * 60000;
    if (spaetestens < start) continue;
    const roh = Math.min(Math.max(wunsch, start), spaetestens);
    // Auf die Viertelstunde, "14:58" plant niemand. Passt die gerundete Zeit
    // nicht mehr in die Lücke, die abgerundete, sonst auf fünf Minuten.
    const viertel = 900000;
    const kandidat = [Math.round(roh / viertel) * viertel, Math.floor(roh / viertel) * viertel, Math.ceil(roh / viertel) * viertel]
      .find((k) => k >= start && k <= spaetestens) ?? Math.ceil(roh / 300000) * 300000;
    if (kandidat > spaetestens) continue;
    if (bester === null || Math.abs(kandidat - wunsch) < Math.abs(bester - wunsch)) bester = kandidat;
  }
  return bester;
}

export function tagesessen(p: {
  ablauf: Tagesablauf;
  ziele: MacroTargets;
  /** Schon gegessene Mahlzeiten des Tages mit Uhrzeit HH:MM und Summen. */
  gegessen?: Array<{ at?: string; kcal: number; proteinG: number; fatG: number; carbsG: number }>;
  /** Jetzt, für heute. Ohne Angabe gilt der ganze Tag als offen. */
  jetzt?: number;
  /**
   * Feste Einheiten aus dem Profil an diesem Tag. Was davon nicht schon im
   * Kalender steht, blockiert die Zeit genauso: ein Mittagessen um 12:30
   * mitten im Krafttraining um 12 wäre sonst der Vorschlag.
   */
  trainings?: Array<{ von: number; bis: number; titel: string }>;
  ernaehrung?: Ernaehrung;
  vorrat?: string[];
  rezepte?: Rezept[];
  /**
   * Die eigenen Essenszeiten aus dem Fragebogen: Minuten vom Aufstehen bis
   * zur ersten Mahlzeit, Mittag und Abend als HH:MM. Sie werden der Wunsch im
   * Fenster, der Kalender und das Training gehen weiter vor.
   */
  essenszeiten?: Essenszeiten;
  /**
   * Selbst gewählte Mahlzeiten statt des Vorschlags. Sie zählen beim Rest
   * wie gegessen, damit die übrigen Mahlzeiten um sie herum kleiner oder
   * grösser werden, und stehen mit ihren eigenen Werten im Plan. Ist die
   * Mahlzeit dieser Art schon gegessen, gilt das Gegessene.
   */
  gewaehlt?: GewaehlteMahlzeit[];
}): Tagesessen {
  const { ablauf: a, ziele } = p;
  const hinweise: string[] = [];
  const gegessen = p.gegessen ?? [];
  const gegesseneArten = new Set(gegessen.map((m) => artAus(m.at)).filter(Boolean) as MahlzeitArt[]);
  const gewaehlt = (p.gewaehlt ?? []).filter((w) => !gegesseneArten.has(w.art) && w.posten.length);
  const gewaehltSumme = (w: GewaehlteMahlzeit) => w.posten.reduce((s, x) => ({
    kcal: s.kcal + (Number(x.kcal) || 0), proteinG: s.proteinG + (Number(x.proteinG) || 0),
    fatG: s.fatG + (Number(x.fatG) || 0), carbsG: s.carbsG + (Number(x.carbsG) || 0),
  }), { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 });
  const summe = [...gegessen, ...gewaehlt.map(gewaehltSumme)].reduce((s, m) => ({
    kcal: s.kcal + m.kcal, proteinG: s.proteinG + m.proteinG, fatG: s.fatG + m.fatG, carbsG: s.carbsG + m.carbsG,
  }), { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 });

  // Alle Trainings des Tages: aus dem Kalender, dazu die Einheiten aus dem
  // Profil, die sich mit keinem Kalendertraining überschneiden.
  const imKalender = a.training.map((x) => ({ von: x.von, bis: x.bis, titel: x.titel }));
  const trainings = [...imKalender, ...(p.trainings ?? []).filter((x) => !imKalender.some((k) => k.von < x.bis && k.bis > x.von))]
    .sort((x, y) => x.von - y.von);
  // Die Lücken ohne die Trainingszeit, mit 15 Minuten für Umziehen.
  const luecken = trainings.reduce((ls, x) => ls.flatMap((l) => {
    const von = x.von - 15 * 60000;
    const bis = x.bis + 15 * 60000;
    if (bis <= l.von || von >= l.bis) return [l];
    return [{ von: l.von, bis: von }, { von: bis, bis: l.bis }].filter((r) => r.bis - r.von >= MIN_SNACK * 60000)
      .map((r) => ({ ...r, minuten: Math.round((r.bis - r.von) / 60000) }));
  }), a.luecken);
  const frei: Tagesablauf = { ...a, luecken };
  // Um das letzte Training des Tages wird gegessen: davor etwas Leichtes,
  // danach die grosse Mahlzeit. Bei zweien wäre die Mittagspause sonst
  // schon das Essen "nach dem Training" und der Abend leer.
  const tr = trainings[trainings.length - 1] ?? null;

  // Fenster je Mahlzeit. Frühstück hängt am Aufstehen dieses Tages.
  const aufstehen = stundeVon(a.wachVon);
  const fenster: Record<MahlzeitArt, { von: number; bis: number; wunsch: number }> = {
    ...FENSTER,
    fruehstueck: { von: aufstehen + 0.25, bis: Math.max(aufstehen + 2.5, 10.5), wunsch: aufstehen + 0.75 },
  };
  const schlafen = stundeVon(a.wachBis) < aufstehen ? stundeVon(a.wachBis) + 24 : stundeVon(a.wachBis);
  const ez = p.essenszeiten;
  if (ez) {
    // Wer erst zwei Stunden nach dem Aufstehen isst, bekommt kein Frühstück
    // um viertel nach sieben vorgeschlagen. Das Fenster wandert mit, eine
    // Stunde Spielraum nach beiden Seiten für den Kalender.
    if (Number.isFinite(ez.ersteNachMin)) {
      const w = aufstehen + Math.max(0, Math.min(300, Number(ez.ersteNachMin))) / 60;
      fenster.fruehstueck = { von: Math.max(aufstehen, w - 1), bis: Math.max(w + 1.5, fenster.fruehstueck.bis), wunsch: w };
    }
    const um = (hhmm?: string) => (hhmm && /^\d{1,2}:\d{2}$/.test(hhmm) ? Number(hhmm.split(":")[0]) + Number(hhmm.split(":")[1]) / 60 : null);
    const mittag = um(ez.mittag);
    if (mittag !== null) fenster.mittagessen = { von: mittag - 1, bis: mittag + 1.5, wunsch: mittag };
    const abend = um(ez.abend);
    if (abend !== null) fenster.abendessen = { von: abend - 1, bis: abend + 1.5, wunsch: abend };
    // Der Snack liegt zwischen Mittag und Abend, nie darüber.
    if (mittag !== null && abend !== null && abend - mittag >= 3) {
      fenster.snack = { von: mittag + 2, bis: abend - 1, wunsch: (mittag + abend) / 2 };
    }
  }
  fenster.abendessen = { ...fenster.abendessen, bis: Math.min(fenster.abendessen.bis + 1, schlafen - 1.5) };

  const rollen: Partial<Record<MahlzeitArt, { training: "davor" | "danach"; grund: string; wunsch?: number }>> = {};
  if (tr) {
    const trStart = stundeVon(tr.von);
    const trEnde = stundeVon(tr.bis);
    // Davor: die Mahlzeit, deren Fenster 1 bis 3 Stunden vor dem Training
    // liegt. Gibt es keine, wird der Snack der Snack davor.
    const davor = (["mittagessen", "snack", "fruehstueck", "abendessen"] as MahlzeitArt[])
      .find((art) => fenster[art].von <= trStart - 1 && fenster[art].bis >= trStart - 3) ?? "snack";
    const wunschDavor = trStart - 1.5;
    fenster[davor] = { von: Math.max(fenster[davor].von, trStart - 3), bis: Math.min(Math.max(fenster[davor].bis, trStart - 0.75), trStart - 0.5), wunsch: wunschDavor };
    rollen[davor] = { training: "davor", grund: `90 Minuten vor ${tr.titel} um ${uhrzeit(tr.von)}: Kohlenhydrate, wenig Fett, damit du nicht leer reingehst` };
    // Danach: die nächste Mahlzeit nach dem Ende, innerhalb von zwei Stunden.
    const danach = (["abendessen", "snack", "mittagessen"] as MahlzeitArt[])
      .find((art) => art !== davor && fenster[art].bis >= trEnde && fenster[art].von <= trEnde + 2);
    if (danach) {
      fenster[danach] = { ...fenster[danach], von: Math.max(fenster[danach].von, trEnde + 0.25), wunsch: Math.max(fenster[danach].wunsch, trEnde + 0.5) };
      rollen[danach] = { training: "danach", grund: `nach ${tr.titel}: die grösste Portion Protein des Tages` };
    }
  }

  // Welche Mahlzeiten noch offen sind: nicht gegessen und nicht vorbei.
  const reihenfolge: MahlzeitArt[] = ["fruehstueck", "mittagessen", "snack", "abendessen"];
  const offen = reihenfolge.filter((art) => {
    if (gegesseneArten.has(art) || gewaehlt.some((w) => w.art === art)) return false;
    if (p.jetzt && amTag(a.tag, fenster[art].bis) < p.jetzt) return false;
    return true;
  });

  // Ein Snack ohne Training ist kein Muss. Er bleibt, wenn der Tag lang ist
  // oder viel Energie braucht, sonst würden drei Mahlzeiten zu gross.
  const mitSnack = offen.filter((art) => art !== "snack" || rollen.snack || ziele.kcal >= 2400);

  // Die gewählten Mahlzeiten stehen zu ihrer Zeit, sonst zur Wunschzeit ihres Fensters.
  const gewaehltePlanen = (): GeplanteMahlzeit[] => gewaehlt.map((w) => {
    const f = fenster[w.art];
    const um = w.um && /^\d{1,2}:\d{2}$/.test(w.um)
      ? new Date(`${a.tag}T00:00:00`).getTime() + (Number(w.um.split(":")[0]) * 60 + Number(w.um.split(":")[1])) * 60000
      : (platzImFenster(frei, amTag(a.tag, f.von), amTag(a.tag, f.bis), amTag(a.tag, f.wunsch), w.art === "snack" ? MIN_SNACK : MIN_ESSEN) ?? amTag(a.tag, f.wunsch));
    const z = gewaehltSumme(w);
    const rolle = rollen[w.art];
    return {
      art: w.art, name: mahlzeitInfo(w.art).name, um, kcal: Math.round(z.kcal), proteinG: Math.round(z.proteinG),
      grund: "deine Wahl", mitnehmen: false, ...(rolle ? { training: rolle.training } : {}),
      gewaehlt: { name: w.name, posten: w.posten }, rezept: null,
    };
  });

  const rest = {
    kcal: Math.max(0, ziele.kcal - summe.kcal), proteinG: Math.max(0, ziele.proteinG - summe.proteinG),
    fatG: Math.max(0, ziele.fatG - summe.fatG), carbsG: Math.max(0, ziele.carbsG - summe.carbsG),
  };

  // Abends ist oft noch viel offen und nur noch das Abendessen übrig. Eine
  // Mahlzeit über 900 kcal isst kaum jemand, also kommt ein später Snack
  // dazu, wenn bis zum Schlafen Zeit ist. Sonst stünde dort ein Teller mit
  // 1200 kcal und darunter der Hinweis, dass das zu viel ist.
  let spaet = false;
  const hauptOffen = mitSnack.filter((art) => art !== "snack").length;
  if (!mitSnack.includes("snack") && mitSnack.includes("abendessen") && hauptOffen
    && rest.kcal / hauptOffen > 900 && schlafen - fenster.abendessen.wunsch >= 3) {
    const von = Math.max(fenster.abendessen.wunsch + 2, p.jetzt ? stundeVon(p.jetzt) + 1.5 : 0);
    if (von <= schlafen - 0.75) {
      fenster.snack = { von, bis: schlafen - 0.5, wunsch: Math.min(von + 0.5, schlafen - 1) };
      mitSnack.push("snack");
      spaet = true;
    }
  }
  if (rest.kcal < 150) {
    return { mahlzeiten: gewaehltePlanen(), gegessenKcal: Math.round(summe.kcal), hinweise: ["Dein Ziel für heute ist erreicht. Für heute ist nichts mehr zu planen."] };
  }
  const verteilung = verteileRest(rest, mitSnack);
  hinweise.push(...verteilung.hinweise);

  // Nach dem Training mehr Protein, davor weniger: zehn Prozent des Rests
  // wandern. Die Summe bleibt dieselbe.
  const anteile = verteilung.anteile.map((x) => ({ ...x }));
  const vor = anteile.find((x) => rollen[x.art]?.training === "davor");
  const nach = anteile.find((x) => rollen[x.art]?.training === "danach");
  if (vor && nach) {
    const schub = Math.round(rest.proteinG * 0.1);
    const nehmen = Math.min(schub, Math.max(0, vor.proteinG - 15));
    vor.proteinG -= nehmen;
    nach.proteinG += nehmen;
  }

  const genutzt = new Set<string>();
  const mahlzeiten: GeplanteMahlzeit[] = [];
  for (const anteil of anteile) {
    const art = anteil.art;
    const f = fenster[art];
    const von = Math.max(amTag(a.tag, f.von), p.jetzt ?? 0);
    const bis = amTag(a.tag, f.bis);
    const wunsch = Math.max(amTag(a.tag, f.wunsch), von);
    const dauer = art === "snack" ? MIN_SNACK : MIN_ESSEN;
    const platz = bis > von ? platzImFenster(frei, von, bis, wunsch, dauer) : null;
    const rolle = rollen[art];
    const info = mahlzeitInfo(art);

    let grund: string;
    let um: number;
    let mitnehmen = false;
    if (platz !== null) {
      um = platz;
      const alles = [...a.termine.map((x) => ({ von: x.von, bis: x.bis, titel: x.titel })), ...trainings];
      const danach = alles.filter((x) => x.von >= platz && x.von - platz <= 75 * 60000).sort((x, y) => x.von - y.von)[0];
      const davor = alles.filter((x) => x.bis <= platz && platz - x.bis <= 45 * 60000).sort((x, y) => y.bis - x.bis)[0];
      grund = rolle?.grund
        ?? (danach ? `vor „${danach.titel}“ um ${uhrzeit(danach.von)}`
          : davor ? `nach „${davor.titel}“`
          : Math.abs(platz - wunsch) > 30 * 60000 ? "die nächste freie Lücke im Kalender" : "frei im Kalender");
    } else {
      um = Math.min(Math.max(wunsch, von), bis);
      mitnehmen = true;
      grund = `zwischen ${uhrzeit(amTag(a.tag, f.von))} und ${uhrzeit(bis)} ist kein Platz von ${dauer} Minuten. Bereite es vor und iss unterwegs`;
    }

    const ergebnis = rezeptEmpfehlungen({
      ziel: { kcal: anteil.kcal, proteinG: anteil.proteinG, fatG: anteil.fatG, carbsG: anteil.carbsG },
      art, ernaehrung: p.ernaehrung, vorrat: p.vorrat, rezepte: p.rezepte ?? REZEPTE,
    }).empfehlungen;
    // Snacks nach der Liste von Coach Aaron, schneller Zucker nur ums
    // Training. Im Betrieb kam spät abends Hüttenkäse auf Reiswaffeln, obwohl
    // Shake, Skyr und Pudding passten.
    const umsTraining = Boolean(rolle?.training);
    const snackRegel = (liste: typeof ergebnis) => {
      if (art !== "snack") return liste;
      const erlaubt = liste.filter((e) => umsTraining || !e.rezept.zucker);
      const standard = erlaubt.filter((e) => e.rezept.standard);
      const basis = standard.length ? standard : erlaubt;
      return umsTraining ? [...basis.filter((e) => e.rezept.zucker), ...basis.filter((e) => !e.rezept.zucker)] : basis;
    };
    // Kein Rezept zweimal am Tag. Unterwegs lieber etwas Schnelles.
    const kandidaten = snackRegel(ergebnis).filter((e) => !genutzt.has(e.rezept.id));
    const wahl = (mitnehmen ? kandidaten.find((e) => e.rezept.minuten <= 15 && e.passung >= kandidaten[0]!.passung - 10) : undefined)
      ?? kandidaten[0] ?? null;
    if (wahl) genutzt.add(wahl.rezept.id);

    mahlzeiten.push({
      art, name: art === "snack" && spaet ? "Später Snack" : info.name, um,
      kcal: wahl ? wahl.summe.kcal : anteil.kcal,
      proteinG: wahl ? wahl.summe.proteinG : anteil.proteinG,
      grund, mitnehmen, ...(rolle ? { training: rolle.training } : {}),
      rezept: wahl ? {
        id: wahl.rezept.id, name: wahl.rezept.name, minuten: wahl.rezept.minuten, foto: Boolean(wahl.rezept.foto),
        kcal: wahl.summe.kcal, proteinG: wahl.summe.proteinG, zutaten: wahl.posten.map(postenText),
        posten: wahl.posten, schritte: Array.isArray(wahl.rezept.schritte) ? wahl.rezept.schritte : [],
      } : null,
    });
  }

  return { mahlzeiten: [...mahlzeiten, ...gewaehltePlanen()].sort((x, y) => x.um - y.um), gegessenKcal: Math.round(summe.kcal - gewaehlt.reduce((x, w) => x + gewaehltSumme(w).kcal, 0)), hinweise };
}

function artAus(at?: string): MahlzeitArt | null {
  const stunde = Number(String(at || "").slice(0, 2));
  if (!/^\d{2}/.test(String(at || ""))) return null;
  if (stunde < 11) return "fruehstueck";
  if (stunde < 15) return "mittagessen";
  if (stunde < 17) return "snack";
  return "abendessen";
}

/** Eine Zeile je Mahlzeit, für Briefing und Coach. */
export function tagesessenText(t: Tagesessen): string {
  if (!t.mahlzeiten.length) return t.hinweise[0] ?? "";
  return t.mahlzeiten.map((m) => {
    const was = m.rezept ? `${m.rezept.name}, ${m.rezept.kcal} kcal, ${m.rezept.proteinG} g Protein`
      : m.gewaehlt ? `${m.gewaehlt.name}, ${m.kcal} kcal, ${m.proteinG} g Protein, deine Wahl`
      : `etwa ${m.kcal} kcal, ${m.proteinG} g Protein`;
    return `${uhrzeit(m.um)} ${m.name}: ${was}${m.mitnehmen ? ", zum Mitnehmen" : ""}.`;
  }).join("\n");
}

/** Die festen Einheiten des Profils an einem Tag, als Zeitspannen. */
export function trainingAusProfil(
  sessions: Array<{ type: string; minutes: number; weekday: number; startsAt: string }> | undefined,
  tag: string,
): Array<{ von: number; bis: number; titel: string }> {
  const wochentag = new Date(`${tag}T12:00:00`).getDay();
  const gesehen = new Set<string>();
  return (sessions ?? [])
    .filter((x) => x.weekday === wochentag && /^\d{1,2}:\d{2}$/.test(x.startsAt) && x.type !== "mobility")
    // Dieselbe Einheit zweimal im Profil ist ein Eingabefehler und kein Doppeltraining.
    .filter((x) => { const k = `${x.type}${x.startsAt}`; if (gesehen.has(k)) return false; gesehen.add(k); return true; })
    .map((s) => {
      const [h, m] = s.startsAt.split(":").map(Number);
      const von = amTag(tag, (h ?? 0) + (m ?? 0) / 60);
      const titel = s.type === "strength" ? "Krafttraining" : s.type === "team_sport" ? "Mannschaftstraining" : "Training";
      return { von, bis: von + s.minutes * 60000, titel };
    });
}

export type { Termin };
