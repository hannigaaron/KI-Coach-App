/**
 * Die Muskelkarte nach einem Training: Körper von vorn und hinten, jede
 * Partie so kräftig blau, wie viele Sätze sie bekommen hat.
 *
 * Gezählt wird in Sätzen und nicht in Kilo mal Wiederholungen. 100 kg
 * Beinpresse und 10 kg Seitheben sind beide ein harter Satz für ihren
 * Muskel, und für den Muskelaufbau zählt die Zahl harter Sätze (Schoenfeld
 * und andere 2017). Ein Satz zählt voll für die Hauptmuskeln der Übung und
 * halb für die Hilfsmuskeln. Das Halbe ist eine Regel der App, eine übliche
 * Näherung beim Zählen von Wochensätzen und keine Messung.
 *
 * Die Farbe folgt einer festen Skala und nicht dem Maximum des Tages: ein
 * Satz ist immer zart, ab acht Sätzen ist die Partie voll. Sonst sähe ein
 * Training mit je einem Satz für alles genauso kräftig aus wie eines mit
 * zwanzig Sätzen Rücken.
 *
 * Die Figur folgt der Körpervorlage des Nutzers, Flächen mit dunklen Fugen.
 *
 * Kein `document` in dieser Datei: sie liefert Zeichenketten, damit die
 * Tests ohne Browser laufen.
 */
import { FLAECHEN, UMRISS } from "./muskelkarte-pfade.js";
import { UEBUNGEN } from "./uebungen-daten.js";

export const REGIONEN = {
  brust: "Brust",
  schulter_vorn: "Vordere Schulter",
  schulter_seite: "Seitliche Schulter",
  schulter_hinten: "Hintere Schulter",
  bizeps: "Bizeps",
  trizeps: "Trizeps",
  unterarme: "Unterarme",
  bauch: "Bauch",
  seitbauch: "Seitliche Bauchmuskeln",
  trapez: "Trapez",
  oberer_ruecken: "Oberer Rücken",
  lat: "Latissimus",
  unterer_ruecken: "Unterer Rücken",
  gesaess: "Gesäß",
  quadrizeps: "Beinvorderseite",
  adduktoren: "Adduktoren",
  beinbeuger: "Beinrückseite",
  waden: "Waden",
};

/** Muskelnamen der Datenbank auf Partien der Karte. */
const ZUORDNUNG = {
  Quadrizeps: ["quadrizeps"],
  Gluteus: ["gesaess"],
  "Gluteus medius": ["gesaess"],
  Adduktoren: ["adduktoren"],
  Rumpf: ["bauch"],
  Bauch: ["bauch"],
  "Seitliche Bauchmuskeln": ["seitbauch"],
  Beinbeuger: ["beinbeuger"],
  Rückenstrecker: ["unterer_ruecken"],
  Trapez: ["trapez"],
  Unterarme: ["unterarme"],
  Unterarm: ["unterarme"],
  Gastrocnemius: ["waden"],
  Soleus: ["waden"],
  Waden: ["waden"],
  Brust: ["brust"],
  "obere Brust": ["brust"],
  Trizeps: ["trizeps"],
  "Trizeps (langer Kopf)": ["trizeps"],
  "vordere Schulter": ["schulter_vorn"],
  "seitliche Schulter": ["schulter_seite"],
  Schulter: ["schulter_vorn", "schulter_seite"],
  "hintere Schulter": ["schulter_hinten"],
  Rotatorenmanschette: ["schulter_hinten"],
  Rhomboiden: ["oberer_ruecken"],
  "mittlerer Rücken": ["oberer_ruecken"],
  "oberer Rücken": ["oberer_ruecken"],
  Latissimus: ["lat"],
  Bizeps: ["bizeps"],
  Brachialis: ["bizeps"],
};

const nachId = new Map(UEBUNGEN.map((u) => [u.id, u]));

/** Ab so vielen Sätzen ist eine Partie voll gefärbt. Eine Regel der App. */
export const VOLL_AB_SAETZEN = 8;

/**
 * Sätze je Partie aus Protokolleinträgen `{ uebung, saetze: [...] }`. Eine
 * Übung zählt je Partie einmal, auch wenn zwei ihrer Muskeln auf dieselbe
 * Partie fallen: Brust und obere Brust im Schrägbankdrücken sind ein Satz
 * Brust und nicht zwei.
 */
export function saetzeJePartie(eintraege, liste = nachId) {
  const ergebnis = {};
  for (const e of eintraege ?? []) {
    const u = liste.get(e.uebung);
    const n = e.saetze?.length ?? 0;
    if (!u || !n) continue;
    const anteil = {};
    for (const m of u.secondaryMuscles) for (const r of ZUORDNUNG[m] ?? []) anteil[r] = Math.max(anteil[r] ?? 0, 0.5);
    for (const m of u.primaryMuscles) for (const r of ZUORDNUNG[m] ?? []) anteil[r] = 1;
    for (const [r, a] of Object.entries(anteil)) ergebnis[r] = (ergebnis[r] ?? 0) + a * n;
  }
  return ergebnis;
}

/** Deckkraft 0 bis 1. Ein halber Satz ist schon sichtbar, ab VOLL_AB_SAETZEN voll. */
export function staerke(saetze) {
  if (!(saetze > 0)) return 0;
  // Leicht gebogen statt gerade: zwischen einem und drei Sätzen soll man den
  // Unterschied deutlich sehen, zwischen sieben und acht kaum noch.
  return Math.round((0.14 + 0.86 * Math.min(1, saetze / VOLL_AB_SAETZEN) ** 0.75) * 100) / 100;
}

/** Die Partien nach Sätzen, die stärkste zuerst. */
export function partienListe(saetze) {
  return Object.entries(saetze)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, name: REGIONEN[id] ?? id, saetze: Math.round(n * 2) / 2 }));
}

/*
 * Die Figur kommt aus der Vorlage, die der Nutzer vorgegeben hat: vorn und
 * hinten nebeneinander, die Muskeln als graue Flächen, dazwischen dunkle
 * Fugen. Gezeichnet wird zuerst der Umriss in der Farbe der Fugen, darüber
 * jede Fläche. Die Fugen entstehen so von selbst und haben überall dieselbe
 * Breite wie in der Vorlage. Was trainiert wurde, steht in Blau.
 *
 * Eine Fläche kann mehrere Partien tragen: der Deltamuskel von vorn ist
 * vordere und seitliche Schulter, und es gilt die stärkere. Im dunklen Modus
 * liegt ein weicher Schein hinter dem Körper, wie im zweiten Bild der
 * Vorlage, damit die Figur sich vom Grund löst.
 */

export const KARTE_DUNKEL = { muskel: "#5d6773", linie: "#161b22", schein: "#b9c6d4", akzent: "#96d8f0", text: "#8b97a8" };
export const KARTE_HELL = { muskel: "#c3ccd6", linie: "#3c4757", schein: "", akzent: "#1e7fa8", text: "#5b6675" };

/** Ausschnitt der Figur und die Mitte jeder Ansicht, auch für das Bild zum Teilen. */
export const KARTE_RAHMEN = { x: 112, y: -8, breite: 542, hoehe: 512, vorn: 240, hinten: 526 };

function flaeche([partien, d], saetze, f) {
  const a = Math.max(0, ...partien.map((p) => staerke(saetze[p] ?? 0)));
  // Unter dem Blau liegt das Grau, damit eine zarte Partie nicht dunkler
  // wirkt als eine untrainierte.
  const blau = a ? `<path d="${d}" fill="${f.akzent}" fill-opacity="${Math.max(0.35, a)}"/>` : "";
  return `<path d="${d}" fill="${f.muskel}"/>${blau}`;
}

/**
 * Beide Ansichten nebeneinander als SVG. `farben` trägt echte Farbwerte und
 * keine CSS Variablen, damit dieselbe Zeichenkette auch als Bild für das
 * Teilen auf eine Leinwand gezeichnet werden kann.
 */
export function muskelkarteSvg(saetze, { farben = KARTE_DUNKEL, beschriftung = true } = {}) {
  const f = { ...KARTE_DUNKEL, ...farben };
  const R = KARTE_RAHMEN;
  const schrift = 'font-family="Satoshi, system-ui, sans-serif" font-size="15" text-anchor="middle"';
  const text = beschriftung
    ? `<text x="${R.vorn}" y="516" ${schrift} fill="${f.text}">Vorn</text><text x="${R.hinten}" y="516" ${schrift} fill="${f.text}">Hinten</text>`
    : "";
  const schein = f.schein
    ? `<filter id="mkSchein" x="-20%" y="-10%" width="140%" height="120%"><feGaussianBlur stdDeviation="9"/></filter>`
      + `<path d="${UMRISS}" fill="${f.schein}" fill-opacity="0.32" filter="url(#mkSchein)"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${R.x} ${R.y} ${R.breite} ${R.hoehe + (beschriftung ? 20 : 0)}" role="img" aria-label="Trainierte Muskeln, vorn und hinten">`
    + schein
    + `<path d="${UMRISS}" fill="${f.linie}"/>`
    + FLAECHEN.map((x) => flaeche(x, saetze, f)).join("")
    + `${text}</svg>`;
}

/** Alle Partien, die die Karte zeichnet. Für den Test, dass keine fehlt. */
export const GEZEICHNET = new Set(FLAECHEN.flatMap(([p]) => p));
