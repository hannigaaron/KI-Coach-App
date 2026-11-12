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
 * Die Figur. Jede Ansicht steht in einem Feld von 200 mal 430, die Mitte
 * liegt bei x 100, acht Kopflängen von 10 bis 414. Gezeichnet ist die linke
 * Hälfte des Bildes, die rechte entsteht gespiegelt. Was auf der Achse
 * liegt, wird nicht gespiegelt.
 *
 * Der Stil folgt dem Beispiel, das der Nutzer vorgegeben hat: eine
 * anatomische Strichzeichnung mit hellem Umriss, die Muskeln als Flächen mit
 * feinen Linien dazwischen, vorn eine Pose mit angespanntem Bizeps, Fäuste,
 * die Beine leicht geöffnet. Die Zeichnung selbst ist für daevo gemacht und
 * nicht aus dem Beispiel übernommen. Was trainiert wurde, steht in Blau.
 *
 * Die Beine sind um die Hüfte gedreht, `BEIN_DREHUNG`, statt jede Form neu
 * zu zeichnen. Eine Drehung um denselben Punkt hält Umriss und Muskeln
 * zusammen, und die Beinstellung lässt sich an einer Stelle ändern.
 */

const HALS = "M92 57C91 63 91 68 89 72C82 76 72 78 63 81";
// Der hängende Arm mit Faust, vom Schulterdach bis in die Achsel.
const ARM_HAENGEND = "C52 84 46 95 46 109C44 128 44 148 46 165C42 184 42 204 45 224"
  + "C40 230 41 241 48 243C55 244 58 237 57 230C57 227 56 225 55 224"
  + "C58 205 60 188 60 171C62 153 64 136 66 119";
// Der angespannte Arm: Oberarm waagerecht nach aussen, Unterarm senkrecht nach oben.
const ARM_GEBEUGT = "C54 81 46 85 42 90C36 82 28 82 26 88C27 76 28 64 27 54"
  + "C29 46 25 38 18 38C10 38 6 46 9 54C8 68 7 84 8 98"
  + "C8 110 14 118 24 118C40 120 54 120 66 119";
const RUMPF = "C68 140 70 160 72 178C70 190 70 200 74 211";
const BEIN = "M74 211C70 240 70 270 76 299C74 321 72 346 76 370C78 384 80 391 80 397"
  + "C74 404 74 412 83 414L95 414C98 408 96 400 94 396"
  + "C94 370 96 342 94 318C95 300 97 270 99 240C99 228 100 218 100 212";
const BEIN_DREHUNG = 'transform="rotate(5 86 212)"';

const oben = (arm) => HALS + arm + RUMPF;

const SCHULTER_HAENGEND = [
  ["schulter_seite", "M66 81C54 84 47 95 46 109C48 116 52 118 55 116C56 104 60 92 70 86Z"],
  ["schulter_vorn", "M85 78C77 79 71 82 67 86C61 94 57 104 56 116C61 112 67 104 72 96C74 90 77 85 83 82Z"],
];
const ARM_VORN_HAENGEND = [
  ["bizeps", "M56 117C50 128 48 146 50 160C54 166 60 166 62 160C64 146 65 130 66 119C62 116 59 116 56 117Z"],
  ["unterarme", "M47 168C43 186 43 204 45 222L56 222C58 206 60 188 60 171C56 166 50 166 47 168Z"],
];
const ARM_VORN_GEBEUGT = [
  ["schulter_seite", "M66 81C56 81 47 85 42 91C44 100 47 108 52 112C54 100 58 92 66 86Z"],
  ["schulter_vorn", "M85 78C77 79 71 82 66 86C60 92 56 100 54 112C60 108 66 102 72 96C74 90 77 85 83 82Z"],
  ["bizeps", "M52 109C50 96 42 86 32 85C26 85 24 92 26 100C27 106 31 110 38 111C44 112 49 111 52 109Z"],
  ["trizeps", "M22 114C36 117 52 118 64 118L66 119C52 120 34 120 20 117Z"],
  ["unterarme", "M10 96C9 82 10 66 11 56L26 56C27 66 27 78 26 88C20 90 14 92 10 96Z"],
];
const VORN_RUMPF = [
  ["trapez", "M92 62C89 68 84 73 76 78L86 79C90 74 92 69 94 64Z"],
  ["brust", "M100 80C92 78 85 80 79 84C74 90 71 100 70 111C77 121 89 124 100 122Z"],
  ["seitbauch", "M68 121C70 142 71 160 73 178C78 188 84 194 88 194L88 126C82 124 75 122 68 121Z"],
];
const VORN_BEIN = [
  ["quadrizeps", "M75 214C70 240 71 268 77 292C79 286 80 276 80 262C80 244 79 228 78 216Z"],
  ["quadrizeps", "M79 216C82 214 88 218 91 228C93 248 92 270 88 290C85 294 82 292 81 286C82 264 82 240 79 216Z"],
  ["quadrizeps", "M93 258C96 268 97 284 95 296C91 302 85 301 83 297C88 290 91 276 93 258Z"],
  ["adduktoren", "M100 213C96 215 93 222 92 230C95 240 97 250 97 258C98 244 99 228 100 216Z"],
  ["waden", "M78 312C74 330 74 352 78 372L84 376C86 352 86 330 84 312Z"],
  ["waden", "M86 312C92 326 94 346 92 368L86 374C88 350 88 330 86 312Z"],
];
const VORN_MITTE = [
  ["bauch", "M89 125C93 123 97 123 99 124L99 139L89 140Z"],
  ["bauch", "M101 124C103 123 107 123 111 125L111 140L101 139Z"],
  ["bauch", "M89 143L99 142L99 157L89 158Z"],
  ["bauch", "M101 142L111 143L111 158L101 157Z"],
  ["bauch", "M89 161L99 160L99 175L89 176Z"],
  ["bauch", "M101 160L111 161L111 176L101 175Z"],
  ["bauch", "M89 179L99 178L99 202C94 200 90 196 88 190Z"],
  ["bauch", "M101 178L111 179L112 190C110 196 106 200 101 202Z"],
];
// Schlüsselbein, Hals, Brust, Knie: Linien, die den Körper lesbar machen.
const LINIEN_VORN = "M93 75C86 77 80 78 74 80M94 58C95 64 97 70 99 76M100 82V122M73 110C80 116 90 118 98 116M75 200C82 208 91 214 99 218";
const LINIEN_VORN_BEIN = "M80 300C84 308 92 309 95 302M84 384C86 390 88 394 90 396";

const HINTEN_RUMPF = [
  ["trapez", "M100 58C97 64 92 70 80 78C75 80 71 82 70 84C80 86 88 88 93 92C96 108 98 124 100 140Z"],
  ["schulter_hinten", "M70 84C62 84 55 90 51 100C52 108 56 112 58 110C62 100 68 94 78 90C76 88 73 86 70 84Z"],
  ["schulter_seite", "M66 81C54 84 47 95 46 109C48 114 50 114 51 100C55 90 62 84 70 84Z"],
  ["oberer_ruecken", "M78 92C84 90 90 92 92 96C94 104 92 112 88 116C83 118 78 116 76 110C74 104 75 96 78 92Z"],
  ["oberer_ruecken", "M93 96C95 108 97 122 98 132C95 128 92 122 89 117C93 112 94 104 93 96Z"],
  ["lat", "M69 114C68 132 70 150 75 168C81 180 91 186 100 186L100 134C96 124 88 118 78 115Z"],
  ["unterer_ruecken", "M92 174C95 182 95 192 92 200L99 201L99 176Z"],
  ["trizeps", "M54 116C47 130 47 150 50 164C55 168 61 166 63 158C65 144 66 128 66 118C62 114 57 114 54 116Z"],
  ["unterarme", "M47 168C43 186 43 204 45 222L56 222C58 206 60 188 60 171C56 166 50 166 47 168Z"],
  ["gesaess", "M100 200C88 198 77 202 74 214C72 230 80 244 94 246C97 246 99 244 100 242Z"],
];
const HINTEN_BEIN = [
  ["beinbeuger", "M77 250C72 268 74 286 79 298L86 300C86 284 87 266 87 249C83 248 80 249 77 250Z"],
  ["beinbeuger", "M89 249C92 248 95 249 98 252C98 266 98 282 96 298L88 300C89 284 89 266 89 249Z"],
  ["waden", "M78 312C71 326 71 346 77 362C82 370 90 368 92 358C94 342 93 324 90 312C86 308 82 308 78 312Z"],
];
const LINIEN_HINTEN = "M100 60V200M100 246V230";
const LINIEN_HINTEN_BEIN = "M80 304C86 309 92 309 96 304M84 314C85 330 85 346 84 362M84 366C85 380 86 390 88 396";

const SPIEGEL = 'transform="translate(200 0) scale(-1 1)"';

/**
 * Eine Hälfte des Körpers. `arm` und `armFormen` wählen die Haltung, damit
 * vorn ein Arm hängt und der andere den Bizeps anspannt.
 */
function haelfte({ arm, armFormen, rumpf, bein, linien, linienBein }, saetze, f) {
  const strich = `stroke="${f.linie}" stroke-linejoin="round" stroke-linecap="round" fill="none"`;
  const flaeche = ([id, d]) => {
    const a = staerke(saetze[id] ?? 0);
    return `<path d="${d}" fill="${a ? f.akzent : f.muskel}" fill-opacity="${a ? Math.max(0.35, a) : 1}" stroke="${f.linie}" stroke-opacity="0.6" stroke-width="0.7"/>`;
  };
  const umriss = oben(arm);
  return `<path d="${umriss}L100 211L100 57Z" fill="${f.grund}"/>`
    + `<g ${BEIN_DREHUNG}><path d="${BEIN}Z" fill="${f.grund}"/>${bein.map(flaeche).join("")}`
    + `<path d="${linienBein}" ${strich} stroke-width="0.7" stroke-opacity="0.5"/>`
    + `<path d="${BEIN}" ${strich} stroke-width="1.3"/></g>`
    + [...rumpf, ...armFormen].map(flaeche).join("")
    + `<path d="${linien}" ${strich} stroke-width="0.7" stroke-opacity="0.5"/>`
    + `<path d="${umriss}" ${strich} stroke-width="1.3"/>`;
}

function figur(links, rechts, mitte, saetze, f) {
  const kopf = `<ellipse cx="100" cy="35" rx="17" ry="22" fill="${f.grund}" stroke="${f.linie}" stroke-width="1.3"/>`;
  const flaeche = ([id, d]) => {
    const a = staerke(saetze[id] ?? 0);
    return `<path d="${d}" fill="${a ? f.akzent : f.muskel}" fill-opacity="${a ? Math.max(0.35, a) : 1}" stroke="${f.linie}" stroke-opacity="0.6" stroke-width="0.7"/>`;
  };
  return `<g>${haelfte(links, saetze, f)}</g><g ${SPIEGEL}>${haelfte(rechts, saetze, f)}</g>`
    + mitte.map(flaeche).join("") + kopf;
}

const VORN_LINKS = { arm: ARM_HAENGEND, armFormen: [...SCHULTER_HAENGEND, ...ARM_VORN_HAENGEND], rumpf: VORN_RUMPF, bein: VORN_BEIN, linien: LINIEN_VORN, linienBein: LINIEN_VORN_BEIN };
const VORN_RECHTS = { ...VORN_LINKS, arm: ARM_GEBEUGT, armFormen: ARM_VORN_GEBEUGT };
const HINTEN_SEITE = { arm: ARM_HAENGEND, armFormen: [], rumpf: HINTEN_RUMPF, bein: HINTEN_BEIN, linien: LINIEN_HINTEN, linienBein: LINIEN_HINTEN_BEIN };

export const KARTE_DUNKEL = { grund: "#2a313b", muskel: "#5b6574", linie: "#eef2f6", akzent: "#96d8f0", text: "#8b97a8" };
export const KARTE_HELL = { grund: "#e3e8ee", muskel: "#bcc6d2", linie: "#3c4757", akzent: "#1e7fa8", text: "#5b6675" };

/**
 * Beide Ansichten nebeneinander als SVG. `farben` trägt echte Farbwerte und
 * keine CSS Variablen, damit dieselbe Zeichenkette auch als Bild für das
 * Teilen auf eine Leinwand gezeichnet werden kann.
 */
export function muskelkarteSvg(saetze, { farben = KARTE_DUNKEL, beschriftung = true } = {}) {
  const f = { ...KARTE_DUNKEL, ...farben };
  const schrift = 'font-family="Satoshi, system-ui, sans-serif" font-size="13" text-anchor="middle"';
  const text = beschriftung
    ? `<text x="100" y="432" ${schrift} fill="${f.text}">Vorn</text><text x="320" y="432" ${schrift} fill="${f.text}">Hinten</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 ${beschriftung ? 438 : 418}" role="img" aria-label="Trainierte Muskeln, vorn und hinten">`
    + `<g>${figur(VORN_LINKS, VORN_RECHTS, VORN_MITTE, saetze, f)}</g>`
    + `<g transform="translate(220 0)">${figur(HINTEN_SEITE, HINTEN_SEITE, [], saetze, f)}</g>`
    + `${text}</svg>`;
}

/** Alle Partien, die die Karte zeichnet. Für den Test, dass keine fehlt. */
export const GEZEICHNET = new Set([...SCHULTER_HAENGEND, ...ARM_VORN_HAENGEND, ...ARM_VORN_GEBEUGT, ...VORN_RUMPF, ...VORN_BEIN, ...VORN_MITTE, ...HINTEN_RUMPF, ...HINTEN_BEIN].map(([id]) => id));
