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
 * Die Figur ist für daevo gezeichnet, als Flächen mit schmalen Fugen statt
 * einer Umrisslinie. Keine Vorlage einer anderen App.
 *
 * Kein `document` in dieser Datei: sie liefert Zeichenketten, damit die
 * Tests ohne Browser laufen.
 */
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
 * Die Formen. Jede Figur steht in einem Feld von 200 mal 430, die Mitte
 * liegt bei x 100. Gezeichnet ist die linke Hälfte des Bildes, die rechte
 * entsteht gespiegelt. `mitte` steht auf der Achse und wird nicht gespiegelt.
 */
const VORN = [
  ["schulter_vorn", "M84 70C76 70 68 74 64 82C68 86 72 92 72 100C76 94 80 86 86 80Z"],
  ["schulter_seite", "M62 82C56 86 52 94 52 104C56 108 62 108 68 104C70 96 68 88 62 82Z"],
  ["trapez", "M94 54L82 66C86 67 90 68 94 68Z"],
  ["brust", "M98 72C90 70 82 76 76 84C72 92 72 104 78 110C86 116 94 114 98 110Z"],
  ["bizeps", "M52 110C48 122 48 136 52 148C58 151 63 148 65 140C67 128 67 116 66 108C62 111 56 112 52 110Z"],
  ["unterarme", "M50 154C44 170 42 188 44 206L54 207C58 190 62 172 64 154C60 157 54 157 50 154Z"],
  ["seitbauch", "M80 116C76 126 75 150 78 170L88 178L88 120Z"],
  ["quadrizeps", "M80 196C72 222 70 258 76 296C82 304 90 304 95 296C97 266 97 232 95 206Z"],
  ["adduktoren", "M98 196L95 206C96 226 97 246 99 262L100 262L100 198Z"],
  ["waden", "M78 318C73 340 73 368 79 396L90 396C94 368 94 340 91 318Z"],
];
const VORN_MITTE = [
  ["bauch", "M90 116L110 116L112 174C106 182 94 182 88 174Z"],
];
// Der Rumpf als Fläche hinter den Muskeln. Die Fugen zwischen den Muskeln
// zeigen dann den Körper und keine Löcher.
const RUMPF = '<path d="M90 60L110 60L134 70L148 86L150 106L134 112L124 118L122 182L100 186L78 182L76 118L66 112L50 106L52 86L66 70Z"/>';
const BEINE = '<path d="M78 190L99 196L98 300L94 312L92 400L78 400L72 340L74 300L70 250Z"/><path d="M122 190L101 196L102 300L106 312L108 400L122 400L128 340L126 300L130 250Z"/>';
const ARME = '<path d="M52 100L66 104L66 150L58 210L44 210L46 150Z"/><path d="M148 100L134 104L134 150L142 210L156 210L154 150Z"/>';

const VORN_GRUND = {
  koerper: RUMPF + BEINE + ARME,
  kopf: '<ellipse cx="100" cy="30" rx="16" ry="20"/>',
  hals: '<path d="M93 48L107 48L108 64L92 64Z"/>',
  becken: '<path d="M82 182L118 182L116 196L100 204L84 196Z"/>',
  haende: '<ellipse cx="48" cy="216" rx="6" ry="10"/><ellipse cx="152" cy="216" rx="6" ry="10"/>',
  knie: '<ellipse cx="85" cy="308" rx="8" ry="7"/><ellipse cx="115" cy="308" rx="8" ry="7"/>',
  fuesse: '<ellipse cx="84" cy="406" rx="10" ry="6"/><ellipse cx="116" cy="406" rx="10" ry="6"/>',
};

const HINTEN = [
  ["trapez", "M98 52L84 64L72 74L86 82L98 104Z"],
  ["schulter_hinten", "M80 76C72 74 66 76 62 82C66 88 70 94 72 100C76 92 80 86 86 82Z"],
  ["schulter_seite", "M60 82C54 86 52 94 52 104C56 108 62 108 68 104C68 96 66 88 60 82Z"],
  ["oberer_ruecken", "M98 108L88 86L84 94L96 122Z"],
  ["lat", "M82 96C74 110 74 136 84 162C90 168 95 168 98 162L98 128L88 104Z"],
  ["trizeps", "M52 110C48 122 48 136 52 148C58 151 63 148 65 140C67 128 67 116 66 108C62 111 56 112 52 110Z"],
  ["unterarme", "M50 154C44 170 42 188 44 206L54 207C58 190 62 172 64 154C60 157 54 157 50 154Z"],
  ["gesaess", "M98 186C88 182 80 188 78 202C78 216 86 226 98 224Z"],
  ["beinbeuger", "M80 230C73 256 74 284 80 304L96 304C98 280 98 254 98 230Z"],
  ["waden", "M77 318C69 338 70 362 79 382L92 382C96 362 96 338 92 318Z"],
];
const HINTEN_MITTE = [
  ["unterer_ruecken", "M100 166L108 162L112 182L88 182L92 162Z"],
];
const HINTEN_GRUND = {
  koerper: RUMPF + BEINE + ARME,
  kopf: '<ellipse cx="100" cy="30" rx="16" ry="20"/>',
  hals: '<path d="M93 48L107 48L108 60L92 60Z"/>',
  haende: VORN_GRUND.haende,
  knie: '<ellipse cx="88" cy="310" rx="8" ry="6"/><ellipse cx="112" cy="310" rx="8" ry="6"/>',
  unterschenkel: '<path d="M80 384L91 384L90 400L82 400Z"/><path d="M120 384L109 384L110 400L118 400Z"/>',
  fuesse: '<ellipse cx="85" cy="406" rx="9" ry="5"/><ellipse cx="115" cy="406" rx="9" ry="5"/>',
};

/** Feine Linien für Bauch, Brust und Beine, damit die Flächen als Muskeln lesen. */
const LINIEN_VORN = '<path d="M100 118V178M90 134H110M89 150H111M89 165H111M80 104C86 110 92 111 98 109M86 220C88 250 88 276 86 296M114 220C112 250 112 276 114 296M84 334C86 356 86 376 84 392M116 334C114 356 114 376 116 392"/>';
const LINIEN_HINTEN = '<path d="M100 54V184M100 188V224M88 232V300M112 232V300M85 324C86 346 86 364 85 378M115 324C114 346 114 364 115 378"/>';

const SPIEGEL = 'transform="translate(200 0) scale(-1 1)"';

function figur(formen, mitte, grund, linien, saetze, farben) {
  const flaeche = (id, d) => {
    const a = staerke(saetze[id] ?? 0);
    const blau = a ? `<path d="${d}" fill="${farben.akzent}" fill-opacity="${a}"/>` : "";
    return `<path d="${d}" fill="${farben.muskel}"/>${blau}`;
  };
  const haelfte = formen.map(([id, d]) => flaeche(id, d)).join("");
  return `<g fill="${farben.grund}">${Object.values(grund).join("")}</g>`
    + `<g>${haelfte}</g><g ${SPIEGEL}>${haelfte}</g>`
    + mitte.map(([id, d]) => flaeche(id, d)).join("")
    + `<g fill="none" stroke="${farben.grund}" stroke-width="1.6" stroke-linecap="round">${linien}</g>`;
}

export const KARTE_DUNKEL = { grund: "#161b23", muskel: "#2c3644", akzent: "#96d8f0", text: "#8b97a8" };
export const KARTE_HELL = { grund: "#b9c4d2", muskel: "#dce3ec", akzent: "#1e7fa8", text: "#5b6675" };

/**
 * Beide Ansichten nebeneinander als SVG. `farben` trägt echte Farbwerte und
 * keine CSS Variablen, damit dieselbe Zeichenkette auch als Bild für das
 * Teilen auf eine Leinwand gezeichnet werden kann.
 */
export function muskelkarteSvg(saetze, {
  farben = KARTE_DUNKEL,
  beschriftung = true,
} = {}) {
  const schrift = 'font-family="Satoshi, system-ui, sans-serif" font-size="13" text-anchor="middle"';
  const text = beschriftung
    ? `<text x="100" y="428" ${schrift} fill="${farben.text}">Vorn</text><text x="320" y="428" ${schrift} fill="${farben.text}">Hinten</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 ${beschriftung ? 436 : 416}" role="img" aria-label="Trainierte Muskeln, vorn und hinten">`
    + `<g>${figur(VORN, VORN_MITTE, VORN_GRUND, LINIEN_VORN, saetze, farben)}</g>`
    + `<g transform="translate(220 0)">${figur(HINTEN, HINTEN_MITTE, HINTEN_GRUND, LINIEN_HINTEN, saetze, farben)}</g>`
    + `${text}</svg>`;
}

/** Alle Partien, die die Karte zeichnet. Für den Test, dass keine fehlt. */
export const GEZEICHNET = new Set([...VORN, ...VORN_MITTE, ...HINTEN, ...HINTEN_MITTE].map(([id]) => id));
