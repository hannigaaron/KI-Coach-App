/**
 * Ein Essensplan über sieben Tage, aus den eigenen Rezepten gerechnet.
 *
 * Kein Modell schreibt hier ein Menü. Jeder Tag wird über `verteileRest` auf
 * die Mahlzeiten aufgeteilt, jede Mahlzeit bekommt ein Rezept aus
 * `rezeptEmpfehlungen`, auf ihren Anteil skaliert. Damit gelten dieselben
 * harten Filter wie bei der einzelnen Empfehlung: Allergien,
 * Unverträglichkeiten, Ernährungsform, Ausschlüsse, Geräte. Ein Plan, der am
 * Mittwoch einmal Soja enthält, ist für jemanden mit Sojaallergie kein Plan.
 *
 * Bei gleicher Eingabe kommt immer derselbe Plan heraus. "Anderer Plan"
 * erhöht die Variante, so wie beim Trainingsplan.
 */
import type { Zutat, ZutatKey } from "./rezepte-daten.js";
import { REZEPTE, ZUTATEN, type Rezept } from "./rezepte-daten.js";
import { type Ernaehrung, type Posten, type RezeptEmpfehlung, passung, rezeptArtFuer, rezeptEmpfehlungen, rezeptGesperrt, rezeptPortion } from "./rezepte.js";
import { type MahlzeitArt, type Rest, mahlzeitInfo, verteileRest } from "./verteilung.js";

export interface EssensplanEingabe {
  /** Das Tagesziel, wie es `macroTargets` liefert. */
  ziel: Rest;
  /**
   * Ein eigenes Ziel je Tag, etwa mehr an Trainingstagen. Fehlt es, gilt
   * `ziel` an jedem Tag.
   */
  zielFuer?: (datum: string) => Rest;
  /** Welche Mahlzeiten am Tag. Standard: alle vier. */
  arten?: MahlzeitArt[];
  ernaehrung?: Ernaehrung;
  vorrat?: string[];
  /** Erster Tag als JJJJ-MM-TT. */
  start: string;
  tage?: number;
  /** 0 ist der beste Plan, jede weitere Zahl ein anderer. */
  variante?: number;
  /**
   * Das Abendessen kommt zwei Tage hintereinander, damit man einmal kocht und
   * zweimal isst. Standard: an. Eine Regel von Coach Aaron: wer jeden Abend
   * neu kochen muss, hält einen Plan keine zwei Wochen durch.
   */
  vorkochen?: boolean;
  rezepte?: Rezept[];
  /**
   * Ob an einem Tag trainiert wird. Snacks mit schnellem Zucker kommen nur an
   * diesen Tagen in den Plan. Fehlt die Angabe, gilt kein Tag als
   * Trainingstag, und es gibt Zucker nirgends.
   */
  trainingstag?: (datum: string) => boolean;
}

export interface PlanMahlzeit {
  art: MahlzeitArt;
  name: string;
  empfehlung: RezeptEmpfehlung;
  /**
   * Vorkochen: "doppelt" heisst heute die doppelte Menge kochen, "vorgekocht"
   * heisst, es steht vom Vortag im Kühlschrank.
   */
  vorkochen?: "doppelt" | "vorgekocht";
}

export interface PlanTag {
  datum: string;
  mahlzeiten: PlanMahlzeit[];
  /**
   * Was der Tag zusätzlich zu den Rezepten braucht, um Protein,
   * Kohlenhydrate oder Fett zu treffen. Leer, wenn die Gerichte reichen.
   */
  ergaenzung: Posten[];
  summe: Rest;
  ziel: Rest;
  /** 0 bis 100, wie gut der ganze Tag zum Tagesziel passt. */
  passung: number;
}

export interface EinkaufPosten {
  key: ZutatKey;
  name: string;
  gramm: number;
  menge: string;
  imVorrat: boolean;
}

export interface Essensplan {
  tage: PlanTag[];
  einkauf: EinkaufPosten[];
  /** Was gegen den Plan spricht, etwa zu wenige passende Rezepte. */
  hinweise: string[];
  /** Mahlzeiten, für die kein Rezept passte. */
  luecken: Array<{ datum: string; art: MahlzeitArt }>;
  variante: number;
}

const STANDARD_ARTEN: MahlzeitArt[] = ["fruehstueck", "mittagessen", "abendessen", "snack"];

/**
 * Wie weit ein Rezept unter dem besten liegen darf, um noch in Frage zu
 * kommen. Eine Regel der App: darunter tauscht der Plan Abwechslung gegen ein
 * Gericht, das die Makros der Mahlzeit deutlich verfehlt.
 */
const SPIELRAUM = 15;

/** Unter dieser Passung wird kein Rezept gewählt, egal wie knapp die Auswahl ist. */
const MINDEST_PASSUNG = 45;

/** Wie viele Rezepte je Mahlzeit in die Tagessuche gehen. 8 hoch 4 sind 4096 Tage, unter 50 ms. */
const KANDIDATEN = 8;

/** Ab dieser Abweichung der Tageskalorien vom Ziel sagt der Plan es dazu. */
const TAG_TOLERANZ = 0.1;

type Werte = { kcal: number; proteinG: number; fatG: number; carbsG: number };

/**
 * Die Ergänzung, die eine Lücke im Tag schliesst, in dieser Reihenfolge
 * versucht. Was die Ernährungsform oder eine Allergie sperrt, fällt raus.
 * Ein Coach plant genauso: passt das Protein mit den Gerichten nicht, kommt
 * ein Quark dazu, und nicht ein anderes Abendessen, das dafür nicht schmeckt.
 */
const ERGAENZUNG: Record<"protein" | "kohlenhydrate" | "fett", Array<{ key: ZutatKey; schritt: number; min: number; max: number }>> = {
  protein: [
    { key: "magerquark", schritt: 25, min: 100, max: 500 },
    { key: "magerquarkLf", schritt: 25, min: 100, max: 500 },
    { key: "skyr", schritt: 25, min: 100, max: 500 },
    { key: "whey", schritt: 5, min: 20, max: 60 },
    { key: "tofu", schritt: 25, min: 100, max: 300 },
  ],
  kohlenhydrate: [
    { key: "haferflocken", schritt: 10, min: 30, max: 150 },
    { key: "reis", schritt: 10, min: 30, max: 150 },
    { key: "banane", schritt: 10, min: 100, max: 360 },
  ],
  fett: [
    { key: "mandeln", schritt: 5, min: 10, max: 40 },
    { key: "erdnussbutter", schritt: 5, min: 10, max: 40 },
    { key: "olivenoel", schritt: 5, min: 5, max: 25 },
  ],
};

/**
 * Rechnet den Plan.
 *
 * Je Tag werden die besten Rezepte jeder Mahlzeit gegeneinander kombiniert,
 * und es gewinnt der Tag, der als Ganzes am besten trifft. Einzeln gewählt lag
 * ein Tag bis zu 50 Prozent über dem Protein und 60 Prozent über dem Fett,
 * obwohl jede Mahlzeit für sich gut passte: ein fettes Frühstück und ein
 * fettes Abendessen gleichen sich nicht aus, sie addieren sich.
 *
 * Wiederholt wird nur, wenn die Auswahl nicht reicht. Für die Hauptmahlzeiten
 * gibt es genug Rezepte, dort kommt in sieben Tagen keines zweimal. Beim Snack
 * gibt es nach den Filtern oft weniger als sieben, dann darf eines
 * wiederkommen, aber nie am Tag darauf: dasselbe Gericht zwei Tage
 * hintereinander ist der Grund, warum Pläne nach drei Tagen liegen bleiben.
 */
export function essensplanBauen(e: EssensplanEingabe): Essensplan {
  const arten = (e.arten?.length ? e.arten : STANDARD_ARTEN)
    .slice()
    .sort((a, b) => mahlzeitInfo(a).stunde - mahlzeitInfo(b).stunde);
  const anzahlTage = Math.max(1, Math.min(14, Math.round(e.tage ?? 7)));
  const variante = Math.max(0, Math.round(e.variante ?? 0));
  const vorkochen = e.vorkochen ?? true;
  // Snacks aus der Liste von Coach Aaron, sobald genug davon zu den Angaben
  // passen. Vorher kamen Hummus, Hüttenkäse und Apfel mit Erdnussbutter mit
  // derselben Chance wie der Shake.
  const alle = e.rezepte ?? REZEPTE;
  const standardSnacks = alle.filter((r) => r.art === "snack" && r.standard && !r.zucker && !rezeptGesperrt(r, e.ernaehrung));
  // Die übrigen bleiben als Reserve und zahlen dafür in der Bewertung. Ganz
  // ohne sie lag ein Tag der Diät 7 Prozent über dem Ziel, weil kein Snack
  // die Lücke zwischen den Gerichten schliessen konnte.
  const reserve = (r: Rezept) => standardSnacks.length >= 2 && r.art === "snack" && !r.standard;
  const rezepte = alle;
  const ohneZucker = rezepte.filter((r) => !r.zucker);
  // Wer nicht vegetarisch isst, bekommt nicht zwei fleischlose Hauptgerichte
  // an einem Tag. Im Betrieb standen Linsen Curry und Linsen Bolognese am
  // selben Tag bei jemandem, der nie vegetarisch angegeben hatte: Linsen
  // treffen Protein und Kohlenhydrate gut, und deshalb gewannen sie immer.
  const isstFleisch = !e.ernaehrung?.form || e.ernaehrung.form === "omnivor" || e.ernaehrung.form === "flexitarisch";
  const hinweise = [...verteileRest(e.ziel, arten).hinweise];

  // Je Rezeptart: wie oft sie in der Woche gebraucht wird und wie viele
  // Rezepte nach den Filtern übrig sind. Daraus folgt, ob wiederholt werden darf.
  const plaetze = new Map<string, number>();
  for (const art of arten) {
    const ra = rezeptArtFuer(art);
    plaetze.set(ra, (plaetze.get(ra) ?? 0) + anzahlTage);
  }
  const erlaubt = new Map<string, number>();
  for (const r of rezepte) {
    if (!plaetze.has(r.art) || rezeptGesperrt(r, e.ernaehrung)) continue;
    erlaubt.set(r.art, (erlaubt.get(r.art) ?? 0) + 1);
  }
  const quellen = {
    protein: ERGAENZUNG.protein.filter((q) => zutatErlaubt(q.key, e.ernaehrung)),
    kohlenhydrate: ERGAENZUNG.kohlenhydrate.filter((q) => zutatErlaubt(q.key, e.ernaehrung)),
    fett: ERGAENZUNG.fett.filter((q) => zutatErlaubt(q.key, e.ernaehrung)),
  };

  const benutzt = new Map<string, number>();
  const zuletzt = new Map<string, number>();
  const tage: PlanTag[] = [];
  const luecken: Essensplan["luecken"] = [];

  for (let d = 0; d < anzahlTage; d++) {
    const datum = tagPlus(e.start, d);
    const tagesziel = e.zielFuer?.(datum) ?? e.ziel;
    // Paare ab dem ersten Tag: 1 und 2, 3 und 4, 5 und 6, der siebte allein.
    const zweiterTag = vorkochen && d % 2 === 1;
    const vortagAbend = tage[d - 1]?.mahlzeiten.find((m) => m.art === "abendessen")?.empfehlung.rezept.id;
    const anteile = verteileRest(tagesziel, arten).anteile;

    // Die Kandidaten je Mahlzeit. Wenig benutzte zuerst, dann die Passung:
    // bei knapper Auswahl kommt so erst jedes Rezept einmal dran.
    const listen = anteile.map((anteil, i) => {
      const ziel = { kcal: anteil.kcal, proteinG: anteil.proteinG, fatG: anteil.fatG, carbsG: anteil.carbsG };
      const tagesRezepte = e.trainingstag?.(datum) ? rezepte : ohneZucker;
      const { empfehlungen } = rezeptEmpfehlungen({ ziel, art: anteil.art, ernaehrung: e.ernaehrung, vorrat: e.vorrat, rezepte: tagesRezepte });
      // Der zweite Tag eines Paars isst, was am Vortag doppelt gekocht wurde,
      // mit der Portion für sein eigenes Ziel. Fehlt das Gericht heute in der
      // Liste, gilt der Tag wie jeder andere.
      if (anteil.art === "abendessen" && zweiterTag && vortagAbend) {
        const gleich = empfehlungen.find((x) => x.rezept.id === vortagAbend);
        if (gleich) return [gleich];
      }
      // Nie zwei Tage hintereinander, und höchstens zweimal die Woche, solange
      // die Auswahl das hergibt. Streng ohne Wiederholung waren die gut
      // passenden Gerichte am Donnerstag verbraucht, und der Sonntag lag 45
      // Prozent über dem Protein.
      const ra = rezeptArtFuer(anteil.art);
      // Neue Gerichte zuerst. Ein schon gegessenes darf einmal wiederkommen,
      // aber nie am Tag darauf, und es zahlt dafür in der Bewertung. Streng
      // ohne Wiederholung waren die gut passenden Gerichte am Donnerstag
      // verbraucht, und der Sonntag lag 45 Prozent über dem Protein. Die
      // Abendessen der Paare zählen dabei schon doppelt.
      const knapp = (erlaubt.get(ra) ?? 0) * 2 < (plaetze.get(ra) ?? 0);
      const moeglich = empfehlungen.filter((x) => zuletzt.get(x.rezept.id) !== d - 1
        && (knapp || (benutzt.get(x.rezept.id) ?? 0) < (anteil.art === "abendessen" ? 1 : 2)));
      // Unter der Mindestpassung nur, wenn sonst gar nichts geht. Bei vegan und
      // niedrigen Kalorien trifft kein Gericht allein das Protein, dann
      // schliesst die Ergänzung die Lücke, statt dass der Tag leer bleibt.
      const gut = moeglich.filter((x) => x.passung >= MINDEST_PASSUNG);
      // Mit weniger als drei passenden kommen die nächstbesten dazu, sonst
      // wollen Mittag und Abend dasselbe einzige Gericht, und der Tag bleibt leer.
      const frei = gut.length >= 3 ? gut : moeglich.slice(0, Math.max(3, gut.length));
      if (!frei.length) return [];
      // Schon benutzte rutschen nach hinten, um 10 Punkte je Mal.
      const rang = (x: RezeptEmpfehlung) => x.passung - 10 * (benutzt.get(x.rezept.id) ?? 0) - (reserve(x.rezept) ? 15 : 0);
      const sortiert = frei.slice().sort((a, b) => rang(b) - rang(a));
      const bester = rang(sortiert[0]!);
      const eng = sortiert.filter((x) => rang(x) >= bester - SPIELRAUM);
      const nah = eng.length >= 3 ? eng : sortiert.slice(0, 3);
      // Die Variante dreht, mit welchen Rezepten die Suche anfängt. So kommt
      // bei "Anderer Plan" eine andere Woche heraus, ohne schlechter zu treffen.
      const versatz = nah.length > KANDIDATEN ? (variante * KANDIDATEN + d + i) % nah.length : 0;
      return [...nah.slice(versatz), ...nah.slice(0, versatz)].slice(0, KANDIDATEN);
    });

    const offen = listen.map((l, i) => (l.length ? i : -1)).filter((i) => i >= 0);
    const auswahl = offen.map((i) => listen[i]!);
    const bewerten = (wahl: RezeptEmpfehlung[]) => {
      const summe = summeAus(wahl.flatMap((w) => w.posten));
      // Zweimal: werden die Gerichte kleiner, fehlt danach auch ihr Protein,
      // und die Ergänzung muss das mittragen.
      let ergaenzung = ergaenzen(summe, tagesziel, quellen);
      let f = kleinerFaktor(summe, ergaenzung, tagesziel);
      if (f < 1) {
        ergaenzung = ergaenzen(skaliert(summe, f), tagesziel, quellen);
        f = kleinerFaktor(summe, ergaenzung, tagesziel);
      }
      // Gerechnet wird mit den Gerichten, wie sie nach dem Verkleinern
      // wirklich aussehen. Wraps und Eier gibt es nur ganz, und ein linear
      // verkleinerter Tag lag im Plan bei 1700 kcal und auf dem Teller bei 1815.
      const echt = f < 1 ? summeAus(wahl.map((w) => kleiner(w, f)).flatMap((w) => w.posten)) : summe;
      const gesamt = summeAus([...ergaenzung, { ...echt, key: "reis", name: "", gramm: 0, menge: "" }]);
      const doppelt = wahl.length - new Set(wahl.map(eiweissQuelle)).size;
      const wieder = wahl.reduce((n, w) => n + (benutzt.get(w.rezept.id) ?? 0), 0);
      // Fleischlose Hauptgerichte über eines hinaus zahlen deutlich. Dieselbe
      // Eiweissquelle zweimal am Tag zahlt mehr als vorher: mit 0,03 standen
      // zwei Linsengerichte trotzdem nebeneinander.
      const veg = isstFleisch ? wahl.filter((w) => w.rezept.art === "hauptmahlzeit" && fleischlos(w.rezept)).length : 0;
      return { ergaenzung, faktor: f, fehler: tagesfehler(gesamt, tagesziel) + doppelt * 0.06 + Math.max(0, veg - 1) * 0.08 + wahl.filter((w) => reserve(w.rezept)).length * 0.05 + ergaenzung.length * 0.01 + wieder * 0.04 };
    };
    // Gibt es keine Kombination ohne doppeltes Gericht am selben Tag, wird
    // das in Kauf genommen. Ein doppeltes Gericht ist besser als ein leerer Tag.
    const gefunden = besteKombination(auswahl, bewerten, false) ?? besteKombination(auswahl, bewerten, true);
    // Braucht der Tag eine Ergänzung und ist kein Platz, werden die Gerichte
    // kleiner gerechnet, aus den Zutaten neu und nicht über den Faktor.
    const bestes = gefunden && gefunden.faktor < 1
      ? { ...gefunden, wahl: gefunden.wahl.map((w) => kleiner(w, gefunden.faktor)) }
      : gefunden;

    const mahlzeiten: PlanMahlzeit[] = [];
    anteile.forEach((anteil, i) => {
      const pos = offen.indexOf(i);
      if (pos < 0 || !bestes) { luecken.push({ datum, art: anteil.art }); return; }
      const wahl = bestes.wahl[pos]!;
      benutzt.set(wahl.rezept.id, (benutzt.get(wahl.rezept.id) ?? 0) + 1);
      zuletzt.set(wahl.rezept.id, d);
      const m: PlanMahlzeit = { art: anteil.art, name: anteil.name, empfehlung: wahl };
      if (anteil.art === "abendessen" && vorkochen) {
        if (zweiterTag && wahl.rezept.id === vortagAbend) {
          m.vorkochen = "vorgekocht";
          const vortag = tage[d - 1]!.mahlzeiten.find((x) => x.art === "abendessen");
          if (vortag) vortag.vorkochen = "doppelt";
        }
      }
      mahlzeiten.push(m);
    });
    const ergaenzung = bestes?.ergaenzung ?? [];
    const s = summeAus([...mahlzeiten.flatMap((m) => m.empfehlung.posten), ...ergaenzung]);
    const summe = { kcal: Math.round(s.kcal), proteinG: Math.round(s.proteinG), fatG: Math.round(s.fatG), carbsG: Math.round(s.carbsG) };
    tage.push({ datum, mahlzeiten, ergaenzung, summe, ziel: tagesziel, passung: passung(summe, tagesziel) });
  }

  // Reicht die Auswahl nicht für eine Woche ohne Wiederholung, steht das da.
  // Sonst sieht ein Plan, der jeden zweiten Tag dasselbe bringt, aus wie ein
  // Fehler der App und nicht wie eine Folge der eigenen Angaben.
  for (const [ra, n] of plaetze) {
    const da = erlaubt.get(ra) ?? 0;
    if (da > 0 && da < n) {
      const name = ra === "fruehstueck" ? "Frühstücke" : ra === "snack" ? "Snacks" : "Hauptgerichte";
      hinweise.push(`Zu deinen Angaben passen ${da} ${name}, deshalb wiederholen sie sich in der Woche.`);
    }
  }
  if (luecken.length) {
    const namen = [...new Set(luecken.map((l) => mahlzeitInfo(l.art).name))];
    hinweise.push(
      `Für ${luecken.length} ${luecken.length === 1 ? "Mahlzeit" : "Mahlzeiten"} (${namen.join(", ")}) passt zu deinen Angaben kein Rezept gut genug. `
      + "Dort steht nichts, statt ein Gericht, das deine Makros deutlich verfehlt.",
    );
  }
  // Reicht das Protein trotz Ergänzung nicht, steht das da, mit dem Weg, der
  // es schliesst. Vegan gibt es in der Tabelle kein Pulver, und erfundene
  // Werte für eines schreibt der Plan nicht hinein.
  const knappP = tage.filter((t) => t.mahlzeiten.length && t.summe.proteinG < t.ziel.proteinG * 0.9);
  if (knappP.length) {
    const fehlt = Math.max(...knappP.map((t) => t.ziel.proteinG - t.summe.proteinG));
    hinweise.push(
      `An ${knappP.length} ${knappP.length === 1 ? "Tag" : "Tagen"} fehlen bis zu ${Math.round(fehlt)} g Protein, weil zu deinen Angaben kein Gericht und keine Ergänzung mehr passt. `
      + "Ein Proteinshake schliesst das, vegan etwa mit Erbsen oder Reisprotein, 25 g Protein je Portion stehen meist auf dem Etikett.",
    );
  }
  const daneben = tage.filter((t) => t.mahlzeiten.length && Math.abs(t.summe.kcal - t.ziel.kcal) > t.ziel.kcal * TAG_TOLERANZ);
  if (daneben.length) {
    hinweise.push(
      `An ${daneben.length} ${daneben.length === 1 ? "Tag" : "Tagen"} liegt der Plan mehr als 10 Prozent neben deinem Kalorienziel, `
      + "weil die Portionen nur bis zu einem Faktor skaliert werden. Gleich das mit einem Snack oder einer kleineren Beilage aus.",
    );
  }

  return { tage, einkauf: einkaufAus(tage, e.vorrat ?? []), hinweise, luecken, variante };
}

type Bewertung = { ergaenzung: Posten[]; faktor: number; fehler: number };

/**
 * Wie stark die Gerichte schrumpfen müssen, damit der Tag mit Ergänzung ins
 * Kalorienziel passt. Greift auch ohne Ergänzung, wenn Stückzutaten und die
 * Mindestportion einen Tag über das Ziel schieben. Höchstens um 15 Prozent: darunter wird aus einem
 * Abendessen ein Teller, von dem niemand satt wird.
 */
function kleinerFaktor(gerichte: Werte, ergaenzung: Posten[], ziel: Werte): number {
  const erg = ergaenzung.reduce((s, p) => s + p.kcal, 0);
  if (gerichte.kcal + erg <= ziel.kcal * 1.02) return 1;
  return Math.max(0.8, Math.min(1, (ziel.kcal - erg) / Math.max(gerichte.kcal, 1)));
}

/** Ein Gericht auf einen kleineren Anteil, aus den Zutaten neu gerechnet. */
function kleiner(w: RezeptEmpfehlung, faktor: number): RezeptEmpfehlung {
  const { faktor: f, posten } = rezeptPortion(w.rezept, w.summe.kcal * faktor);
  const s = summeAus(posten);
  const summe = { kcal: Math.round(s.kcal), proteinG: Math.round(s.proteinG), fatG: Math.round(s.fatG), carbsG: Math.round(s.carbsG) };
  return { ...w, faktor: f, posten, summe, passung: passung(summe, w.ziel) };
}

/** Probiert jede Kombination aus je einem Kandidaten pro Mahlzeit. */
function besteKombination(
  listen: RezeptEmpfehlung[][],
  bewerten: (wahl: RezeptEmpfehlung[]) => Bewertung,
  doppeltErlaubt: boolean,
): ({ wahl: RezeptEmpfehlung[] } & Bewertung) | null {
  let bestes: ({ wahl: RezeptEmpfehlung[] } & Bewertung) | null = null;
  const index = listen.map(() => 0);
  for (;;) {
    const wahl = listen.map((l, i) => l[index[i]!]!);
    if (doppeltErlaubt || new Set(wahl.map((w) => w.rezept.id)).size === wahl.length) {
      const b = bewerten(wahl);
      if (!bestes || b.fehler < bestes.fehler - 1e-9) bestes = { wahl, ...b };
    }
    let k = listen.length - 1;
    while (k >= 0) {
      index[k]! += 1;
      if (index[k]! < listen[k]!.length) break;
      index[k] = 0;
      k--;
    }
    if (k < 0) return bestes;
  }
}

/**
 * Wie weit ein Tag vom Ziel weg ist, 0 heisst genau getroffen.
 *
 * Dieselbe Gewichtung wie `passung`, Kalorien und Protein je 35 Prozent, Fett
 * und Kohlenhydrate je 15. Zu viel Protein zählt anderthalbfach: zu wenig
 * schliesst eine Ergänzung, zu viel lässt sich aus einem Gericht nicht
 * herausnehmen, und über 2 Gramm je Kilo bringt es für den Muskelaufbau nichts
 * mehr (Morton und andere, British Journal of Sports Medicine 2018, Plateau
 * bei rund 1,6 g je kg).
 */
function tagesfehler(ist: Werte, ziel: Werte): number {
  const rel = (a: number, b: number) => (a - b) / Math.max(b, 1);
  const p = rel(ist.proteinG, ziel.proteinG);
  const k = Math.abs(rel(ist.kcal, ziel.kcal));
  // Über 4 Prozent bei den Kalorien zählt jeder weitere Prozentpunkt fünffach:
  // ein Tag mit 120 Kalorien zu viel wiegt in der Diät mehr als 10 Gramm
  // Kohlenhydrate daneben.
  // Über 5 Prozent daneben ist ein Tag, den der Plan nur nimmt, wenn es gar
  // keinen besseren gibt. Mit den neuen Snacks aus Stückzutaten wie Riegel und
  // Banane gewann sonst ein Tag mit 7 Prozent zu viel gegen einen mit 2, nur
  // weil darin ein schon benutztes Gericht stand.
  return 0.35 * k + Math.max(0, k - 0.04) * 1.5 + (k > 0.05 ? 1 : 0)
    + 0.35 * (p > 0 ? p * 1.5 : -p)
    + 0.15 * Math.abs(rel(ist.fatG, ziel.fatG))
    + 0.15 * Math.abs(rel(ist.carbsG, ziel.carbsG));
}

/**
 * Was ein Tag noch braucht, als höchstens drei Posten.
 *
 * Erst Protein, weil es am schwersten über Gerichte zu treffen ist, dann
 * Kohlenhydrate und Fett, beide nur, solange Kalorien offen sind. Kleine
 * Lücken bleiben offen: 5 Gramm Protein sind Rauschen in der Schätzung jeder
 * Portion und kein Grund für einen weiteren Posten.
 */
function ergaenzen(summe: Werte, ziel: Werte, quellen: typeof ERGAENZUNG): Posten[] {
  const aus: Posten[] = [];
  const jetzt = { ...summe };
  const dazu = (p: Posten) => {
    aus.push(p);
    jetzt.kcal += p.kcal; jetzt.proteinG += p.proteinG; jetzt.fatG += p.fatG; jetzt.carbsG += p.carbsG;
  };
  const menge = (q: { key: ZutatKey; schritt: number; min: number; max: number }, gramm: number) =>
    Math.min(q.max, Math.max(q.min, Math.round(gramm / q.schritt) * q.schritt));

  // Für Protein ohne Rücksicht auf offene Kalorien: Platz schafft danach
  // `kleinerSkalieren`, das die Gerichte um bis zu 20 Prozent verkleinert.
  // Mehr als 20 Prozent der Tageskalorien darf die Ergänzung nicht tragen,
  // sonst ist sie keine Ergänzung mehr, sondern eine Mahlzeit.
  const p = quellen.protein[0];
  const lueckeP = ziel.proteinG - jetzt.proteinG;
  if (p && lueckeP > Math.max(8, ziel.proteinG * 0.05)) {
    const z = ZUTATEN[p.key].per100;
    const g = Math.min(menge(p, (lueckeP / z.proteinG) * 100), Math.floor((ziel.kcal * 0.2 / z.kcal) * 100 / p.schritt) * p.schritt);
    if (g >= p.min) dazu(postenAus(p.key, g));
  }
  const k = quellen.kohlenhydrate[0];
  const lueckeK = ziel.carbsG - jetzt.carbsG;
  const kcalK = ziel.kcal - jetzt.kcal;
  if (k && lueckeK > Math.max(20, ziel.carbsG * 0.1) && kcalK > ziel.kcal * 0.04) {
    const z = ZUTATEN[k.key].per100;
    const g = Math.min((lueckeK / z.carbsG) * 100, (kcalK / z.kcal) * 100);
    if (g >= k.min * 0.7) dazu(postenAus(k.key, menge(k, g)));
  }
  const f = quellen.fett[0];
  const lueckeF = ziel.fatG - jetzt.fatG;
  const kcalF = ziel.kcal - jetzt.kcal;
  if (f && lueckeF > Math.max(10, ziel.fatG * 0.15) && kcalF > ziel.kcal * 0.03) {
    const z = ZUTATEN[f.key].per100;
    const g = Math.min((lueckeF / z.fatG) * 100, (kcalF / z.kcal) * 100);
    if (g >= f.min * 0.7) dazu(postenAus(f.key, menge(f, g)));
  }
  return aus;
}

function postenAus(key: ZutatKey, gramm: number): Posten {
  const z: Zutat = ZUTATEN[key];
  const p = z.per100;
  return {
    key, name: z.name, gramm, menge: `${gramm} g`,
    kcal: (p.kcal * gramm) / 100, proteinG: (p.proteinG * gramm) / 100,
    fatG: (p.fatG * gramm) / 100, carbsG: (p.carbsG * gramm) / 100,
  };
}

function skaliert(w: Werte, f: number): Werte {
  return { kcal: w.kcal * f, proteinG: w.proteinG * f, fatG: w.fatG * f, carbsG: w.carbsG * f };
}

function summeAus(posten: Posten[]): Werte {
  return posten.reduce((a, p) => ({
    kcal: a.kcal + p.kcal, proteinG: a.proteinG + p.proteinG, fatG: a.fatG + p.fatG, carbsG: a.carbsG + p.carbsG,
  }), { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 });
}

/** Ob eine einzelne Zutat zu den Angaben passt, über dieselbe Prüfung wie ein Rezept. */
function zutatErlaubt(key: ZutatKey, e?: Ernaehrung): boolean {
  const probe = { id: key, name: key, art: "snack", minuten: 0, zutaten: [{ z: key, g: 100 }], schritte: [], geraete: [] } as Rezept;
  return !rezeptGesperrt(probe, e);
}

/**
 * Die Einkaufsliste für den Plan, je Zutat zusammengezählt.
 *
 * Stückzutaten wie Eier zählen in Stück, alles andere in Gramm, auf 10 Gramm
 * aufgerundet: im Laden kauft niemand 245 Gramm, und abgerundet fehlt am
 * Sonntag der Rest.
 */
export function einkaufAus(tage: PlanTag[], vorrat: string[] = []): EinkaufPosten[] {
  const summe = new Map<ZutatKey, number>();
  for (const t of tage) for (const p of [...t.mahlzeiten.flatMap((m) => m.empfehlung.posten), ...t.ergaenzung]) {
    summe.set(p.key, (summe.get(p.key) ?? 0) + p.gramm);
  }
  const v = vorrat.map((x) => x.toLowerCase());
  return [...summe.entries()].map(([key, gramm]) => {
    const z: Zutat = ZUTATEN[key];
    let menge: string;
    if (z.stueckG) {
      const n = Math.round(gramm / z.stueckG);
      const [eins, viele] = z.stueckName ?? [z.name, z.name];
      menge = `${n} ${n === 1 ? eins : viele}`;
    } else {
      menge = gramm >= 1000 ? `${(Math.ceil(gramm / 10) * 10 / 1000).toLocaleString("de-DE")} kg` : `${Math.ceil(gramm / 10) * 10} g`;
    }
    const n = z.name.toLowerCase();
    const imVorrat = v.some((x) => x.length >= 3 && (n.includes(x) || x.includes(n.split(/[ ,]/)[0]!)));
    return { key, name: z.name, gramm, menge, imVorrat };
  }).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Der Plan als Text, für den Coach und den Regelweg. */
export function essensplanText(p: Essensplan): string {
  const wt = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const zeilen = p.tage.map((t) => {
    const tag = wt[new Date(`${t.datum}T12:00:00`).getDay()];
    const erg = t.ergaenzung.length ? `, dazu ${t.ergaenzung.map((p) => `${p.menge} ${p.name}`).join(" und ")}` : "";
    const m = t.mahlzeiten.map((x) => `${x.name}: ${x.empfehlung.rezept.name}${x.vorkochen === "doppelt" ? " (doppelt kochen)" : x.vorkochen === "vorgekocht" ? " (vom Vortag)" : ""}`).join(", ") + erg;
    return `${tag}: ${m || "nichts Passendes"}. ${t.summe.kcal} kcal, ${t.summe.proteinG} g Protein.`;
  });
  return [...zeilen, ...p.hinweise].join("\n");
}

/** Ein Gericht ohne Fleisch, Fisch und Meeresfrüchte. */
function fleischlos(r: Rezept): boolean {
  return !r.zutaten.some(({ z }) => {
    const h = (ZUTATEN[z] as Zutat).herkunft;
    return h === "fleisch" || h === "fisch" || h === "meeresfrucht";
  });
}

/** Die Zutat, die in einer Portion das meiste Protein trägt. */
function eiweissQuelle(e: RezeptEmpfehlung): string {
  let beste = e.posten[0];
  for (const p of e.posten) if (beste && p.proteinG > beste.proteinG) beste = p;
  return beste?.key ?? "";
}

function tagPlus(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
