/**
 * Strichfiguren für die Übungen.
 *
 * Eine Figur, die aus Gelenkwinkeln gebaut wird, statt 44 Zeichnungen. Jede
 * Bewegung ist ein Paar Posen: Anfang und Ende. Dazwischen läuft ein weicher
 * Übergang, am Ende und am Anfang eine kurze Pause, wie bei einer sauberen
 * Wiederholung.
 *
 * Gerechnet wird von der Hüfte aus nach vorn (Rumpf, Arm) und nach unten
 * (Bein). Danach wird die ganze Figur so verschoben, dass ein Gelenk an seinem
 * festen Punkt steht: der Fuß bei der Kniebeuge, die Hand an der Stange beim
 * Klimmzug, die Hüfte auf der Bank. So rutscht nichts über den Boden, und die
 * Winkel müssen nicht zu Koordinaten passen.
 *
 * Winkel in Grad. Bei Gliedmaßen gilt 0 = nach unten, 90 = nach vorn (die
 * Figur schaut nach rechts), 180 = nach oben, negativ = nach hinten. Beim
 * Rumpf gilt 0 = aufrecht, 90 = waagerecht nach vorn, negativ = nach hinten.
 * Der Weg zwischen Anfang und Ende ist der gerade Weg der Zahlen. Wo ein
 * Arm hinter dem Kopf durch muss, steht deshalb 260 statt -100.
 *
 * Das ist eine Seitenansicht. Seitheben und Schulterzucken laufen in einer
 * Frontansicht, weil sich die Bewegung von der Seite nicht zeigen lässt.
 * Bei Übungen, die sich von der Seite nur grob zeigen lassen (Fliegende,
 * Butterfly), zeigt die Figur die Grundbewegung, nicht jede Einzelheit.
 */

const SEG = { torso: 46, ua: 24, fa: 22, th: 30, sh: 30, foot: 11, kopf: 7 };
const rad = (grad) => (grad * Math.PI) / 180;
const abwaerts = (grad) => ({ x: Math.sin(rad(grad)), y: Math.cos(rad(grad)) });
const aufwaerts = (grad) => ({ x: Math.sin(rad(grad)), y: -Math.cos(rad(grad)) });

const STANDARD = { t: 0, ua: 0, fa: 0, th: 0, sh: 0, ft: 90, dy: 0 };

/**
 * Alle Bewegungen. `A` ist der Anfang, `B` das Ende der Wiederholung.
 * `anker` hält ein Gelenk an einem festen Punkt. `gewicht` sagt, wo das
 * Gewicht sitzt. `szene` sind die festen Dinge im Bild.
 */
const BODEN = 168;
const boden = { t: "linie", x1: 20, y1: BODEN, x2: 220, y2: BODEN };

export const ANIMATIONEN = {
  squat: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "shoulder", szene: [boden],
    A: { t: 6, ua: -20, fa: 155, th: 0, sh: 0 },
    B: { t: 40, ua: -20, fa: 155, th: 92, sh: -28 },
  },
  jump: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, szene: [boden],
    A: { t: 40, ua: -45, fa: -30, th: 92, sh: -28 },
    B: { t: 0, ua: 115, fa: 130, th: 0, sh: 0, ft: 55, dy: 16 },
  },
  throw: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 22, ua: 40, fa: 100, th: 45, sh: -22 },
    B: { t: -4, ua: 135, fa: 150, th: 0, sh: 0, ft: 60 },
  },
  lunge: {
    anker: { gelenk: "ankle", x: 128, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 0, th: 0, sh: 0, thB: 0, shB: 0 },
    B: { t: 4, th: 85, sh: -4, thB: -22, shB: -97 },
  },
  split: {
    anker: { gelenk: "ankle", x: 140, y: BODEN - 5 }, gewicht: "wrist",
    szene: [boden, { t: "rechteck", x: 28, y: BODEN - 32, w: 50, h: 5 }, { t: "linie", x1: 36, y1: BODEN - 27, x2: 36, y2: BODEN },
      { t: "linie", x1: 70, y1: BODEN - 27, x2: 70, y2: BODEN }],
    A: { t: 4, th: 40, sh: -18, thB: -40, shB: -105 },
    B: { t: 4, th: 85, sh: -4, thB: -55, shB: -110 },
  },
  legpress: {
    anker: { gelenk: "hip", x: 82, y: 132 }, szene: [boden, { t: "polster" }, { t: "platte" }],
    A: { t: -50, ua: 90, fa: 90, th: 140, sh: 78, ft: 20 },
    B: { t: -50, ua: 90, fa: 90, th: 112, sh: 108, ft: 20 },
  },
  legext: {
    anker: { gelenk: "hip", x: 92, y: 118 }, szene: [boden, { t: "sitz" }, { t: "polster" }],
    A: { t: -4, ua: 20, fa: 90, th: 90, sh: 4 },
    B: { t: -4, ua: 20, fa: 90, th: 90, sh: 84, ft: 150 },
  },
  legcurl: {
    anker: { gelenk: "hip", x: 130, y: 124 }, szene: [{ t: "rechteck", x: 60, y: 130, w: 135, h: 6 }, { t: "linie", x1: 70, y1: 136, x2: 70, y2: BODEN }, { t: "linie", x1: 185, y1: 136, x2: 185, y2: BODEN }, boden],
    A: { t: 90, ua: 40, fa: 12, th: -90, sh: -90, ft: -90 },
    B: { t: 90, ua: 40, fa: 12, th: -90, sh: -172, ft: -172 },
  },
  hinge: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 2, ua: 0, fa: 0, th: 0, sh: 0 },
    B: { t: 62, ua: -22, fa: -8, th: 28, sh: -14 },
  },
  goodmorning: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "shoulder", szene: [boden],
    A: { t: 2, ua: -20, fa: 155, th: 0, sh: 0 },
    B: { t: 68, ua: -20, fa: 155, th: 28, sh: -14 },
  },
  deadlift: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 52, ua: -28, fa: -28, th: 58, sh: -26 },
    B: { t: 0, ua: 0, fa: 0, th: 0, sh: 0 },
  },
  bridge: {
    anker: { gelenk: "ankle", x: 150, y: BODEN - 5 }, gewicht: "hip", szene: [boden, { t: "rechteck", x: 30, y: BODEN - 24, w: 36, h: 24 }],
    A: { t: -48, ua: 90, fa: 90, th: 140, sh: -20 },
    B: { t: -88, ua: 90, fa: 90, th: 95, sh: -4 },
  },
  nordic: {
    anker: { gelenk: "knee", x: 72, y: BODEN - 8 }, szene: [boden, { t: "rechteck", x: 14, y: BODEN - 14, w: 40, h: 8 }],
    A: { t: 0, ua: 20, fa: 100, th: 0, sh: -90 },
    B: { t: 64, ua: 85, fa: 85, th: -64, sh: -90 },
  },
  calf: {
    anker: { gelenk: "toe", x: 118, y: BODEN }, gewicht: "wrist", szene: [boden, { t: "rechteck", x: 90, y: BODEN - 6, w: 40, h: 6 }],
    A: { t: 0, th: 0, sh: 0, ft: 90 },
    B: { t: -2, th: -9, sh: -9, ft: 56 },
  },
  bench: {
    anker: { gelenk: "hip", x: 118, y: 130 }, szene: [boden, { t: "rechteck", x: 54, y: 138, w: 80, h: 7 }, { t: "linie", x1: 64, y1: 145, x2: 64, y2: BODEN }, { t: "linie", x1: 124, y1: 145, x2: 124, y2: BODEN }],
    gewicht: "wrist",
    A: { t: -90, ua: 178, fa: 180, th: 100, sh: -30 },
    B: { t: -90, ua: 100, fa: 178, th: 100, sh: -30 },
  },
  incline: {
    anker: { gelenk: "hip", x: 118, y: 128 }, gewicht: "wrist",
    szene: [boden, { t: "linie", x1: 112, y1: 134, x2: 62, y2: 90, w: 6 }, { t: "rechteck", x: 110, y: 138, w: 24, h: 6 }, { t: "linie", x1: 122, y1: 144, x2: 122, y2: BODEN }],
    A: { t: -58, ua: 172, fa: 178, th: 100, sh: -30 },
    B: { t: -58, ua: 115, fa: 172, th: 100, sh: -30 },
  },
  benchfly: {
    anker: { gelenk: "hip", x: 118, y: 130 }, gewicht: "wrist",
    szene: [boden, { t: "rechteck", x: 54, y: 138, w: 80, h: 7 }, { t: "linie", x1: 64, y1: 145, x2: 64, y2: BODEN }, { t: "linie", x1: 124, y1: 145, x2: 124, y2: BODEN }],
    A: { t: -90, ua: 104, fa: 104, th: 100, sh: -30 },
    B: { t: -90, ua: 178, fa: 178, th: 100, sh: -30 },
  },
  pushup: {
    anker: { gelenk: "ankle", x: 36, y: BODEN - 3 }, szene: [boden],
    A: { t: 64, ua: 0, fa: 0, th: -64, sh: -64, ft: 40 },
    B: { t: 84, ua: -70, fa: 82, th: -84, sh: -84, ft: 40 },
  },
  dips: {
    anker: { gelenk: "wrist", x: 118, y: 74 }, szene: [{ t: "linie", x1: 98, y1: 74, x2: 150, y2: 74, w: 4 }, { t: "linie", x1: 140, y1: 74, x2: 140, y2: BODEN }, boden],
    A: { t: 6, ua: 0, fa: 0, th: 0, sh: -45 },
    B: { t: 16, ua: -62, fa: 62, th: 5, sh: -50 },
  },
  ohp: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 0, ua: 45, fa: 176 },
    B: { t: -3, ua: 175, fa: 180 },
  },
  row: {
    anker: { gelenk: "ankle", x: 100, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 66, ua: 0, fa: 0, th: 24, sh: -14 },
    B: { t: 66, ua: -72, fa: 4, th: 24, sh: -14 },
  },
  seatedrow: {
    anker: { gelenk: "hip", x: 80, y: 138 }, gewicht: "wrist",
    szene: [boden, { t: "sitz" }, { t: "seil", zu: [226, 108] }],
    A: { t: 12, ua: 82, fa: 88, th: 92, sh: -12 },
    B: { t: -6, ua: -66, fa: 90, th: 92, sh: -12 },
  },
  straightarm: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist",
    szene: [boden, { t: "seil", zu: [150, 14] }],
    A: { t: 14, ua: 170, fa: 170 },
    B: { t: 14, ua: 15, fa: 15 },
  },
  pullup: {
    anker: { gelenk: "wrist", x: 120, y: 26 }, szene: [{ t: "linie", x1: 84, y1: 26, x2: 156, y2: 26, w: 5 }],
    A: { t: -4, ua: 180, fa: 180, th: -8, sh: -35 },
    B: { t: -4, ua: -72, fa: 180, th: -8, sh: -35 },
  },
  pulldown: {
    anker: { gelenk: "hip", x: 100, y: 144 }, gewicht: "wrist",
    szene: [boden, { t: "sitz" }, { t: "seil", zu: [92, 16] }],
    A: { t: -8, ua: 176, fa: 178, th: 92, sh: -4 },
    B: { t: -16, ua: -34, fa: 132, th: 92, sh: -4 },
  },
  curl: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 0, ua: 2, fa: 4 },
    B: { t: -2, ua: 8, fa: 152 },
  },
  tripush: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist",
    szene: [boden, { t: "seil", zu: [150, 12] }],
    A: { t: 8, ua: -6, fa: 118 },
    B: { t: 8, ua: -6, fa: 6 },
  },
  triover: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 0, ua: 172, fa: -38 },
    B: { t: 0, ua: 176, fa: -182 },
  },
  facepull: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist",
    szene: [boden, { t: "seil", zu: [228, 62] }],
    A: { t: 0, ua: 84, fa: 88 },
    B: { t: -4, ua: 72, fa: 168 },
  },
  pallof: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist",
    szene: [boden, { t: "seil", zu: [228, 66] }],
    A: { t: 0, ua: 28, fa: 84 },
    B: { t: 0, ua: 88, fa: 90 },
  },
  flycable: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist",
    szene: [boden, { t: "seil", zu: [30, 20] }],
    A: { t: 8, ua: -50, fa: -50 },
    B: { t: 8, ua: 62, fa: 62 },
  },
  swing: {
    anker: { gelenk: "ankle", x: 112, y: BODEN - 5 }, gewicht: "wrist", szene: [boden],
    A: { t: 62, ua: -12, fa: -2, th: 28, sh: -14 },
    B: { t: 0, ua: 90, fa: 90, th: 0, sh: 0 },
  },
  carry: {
    anker: { gelenk: "hip", x: 118, y: 106 }, gewicht: "wrist", szene: [boden],
    A: { t: 0, th: 24, sh: -4, thB: -22, shB: -40 },
    B: { t: 0, th: -22, sh: -40, thB: 24, shB: -4 },
  },
  hang: {
    anker: { gelenk: "wrist", x: 120, y: 26 }, szene: [{ t: "linie", x1: 84, y1: 26, x2: 156, y2: 26, w: 5 }],
    A: { t: -5, ua: 180, fa: 180, th: -4, sh: -10 },
    B: { t: 5, ua: 180, fa: 180, th: 4, sh: -4 },
  },
  legraise: {
    anker: { gelenk: "wrist", x: 120, y: 26 }, szene: [{ t: "linie", x1: 84, y1: 26, x2: 156, y2: 26, w: 5 }],
    A: { t: -4, ua: 180, fa: 180, th: 2, sh: 2 },
    B: { t: 14, ua: 180, fa: 180, th: 86, sh: 80 },
  },
  crunch: {
    anker: { gelenk: "knee", x: 112, y: BODEN - 8 }, szene: [boden, { t: "seil", zu: [100, 6] }],
    A: { t: 6, ua: 110, fa: -150, th: 0, sh: -90 },
    B: { t: 74, ua: 120, fa: -140, th: 0, sh: -90 },
  },
  abwheel: {
    anker: { gelenk: "knee", x: 70, y: BODEN - 8 }, gewicht: "wrist", szene: [boden],
    A: { t: 38, ua: 22, fa: 12, th: 0, sh: -90 },
    B: { t: 86, ua: 92, fa: 90, th: -28, sh: -90 },
  },
  plank: {
    anker: { gelenk: "ankle", x: 34, y: BODEN - 24 }, szene: [boden],
    A: { t: 80, ua: 2, fa: 90, th: -80, sh: -80, ft: 30 },
    B: { t: 83, ua: 2, fa: 90, th: -83, sh: -83, ft: 30 },
  },
  deadbug: {
    anker: { gelenk: "hip", x: 118, y: 150 }, szene: [boden],
    A: { t: -90, ua: 180, fa: 180, th: 180, sh: 90, thB: 180, shB: 90 },
    B: { t: -90, ua: 262, fa: 262, th: 180, sh: 90, thB: 112, shB: 104 },
  },
  hyper: {
    anker: { gelenk: "hip", x: 128, y: 112 }, szene: [boden, { t: "linie", x1: 118, y1: 124, x2: 140, y2: 100, w: 7 }, { t: "linie", x1: 124, y1: 118, x2: 124, y2: BODEN }],
    A: { t: 148, ua: 40, fa: 120, th: -88, sh: -88, ft: -88 },
    B: { t: 92, ua: 40, fa: 120, th: -88, sh: -88, ft: -88 },
  },
  /* Frontansicht. */
  lateral: { ansicht: "front", gewicht: "wrist", A: { a: 6 }, B: { a: 86 } },
  shrug: { ansicht: "front", gewicht: "wrist", A: { a: 4, s: 0 }, B: { a: 4, s: 9 } },
  legspread: { ansicht: "front", A: { l: 6 }, B: { l: 30 } },
  legclose: { ansicht: "front", A: { l: 30 }, B: { l: 6 } },
  rotation: { ansicht: "front", gewicht: "wrist", A: { a: 4, r: -1 }, B: { a: 4, r: 0.9 } },
};

export const ANIM_SCHLUESSEL = Object.keys(ANIMATIONEN);

function mische(a, b, k) {
  const aus = {};
  for (const schluessel of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[schluessel] ?? 0;
    const y = b[schluessel] ?? 0;
    aus[schluessel] = x + (y - x) * k;
  }
  return aus;
}

/**
 * Weicher Verlauf mit Pause an beiden Enden.
 * `u` läuft von 0 bis 1 und wieder zurück, `k` hält an den Enden kurz an.
 * Eine Wiederholung ohne Pause oben und unten sieht aus wie ein Gummiband,
 * nicht wie eine kontrollierte Bewegung.
 */
export function verlauf(t) {
  const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * (((t % 1) + 1) % 1));
  const x = Math.min(1, Math.max(0, (u - 0.12) / 0.76));
  return x * x * (3 - 2 * x);
}

/** Die Gelenke einer Seitenansicht bei Fortschritt k (0 = Anfang, 1 = Ende). */
export function gelenke(schluessel, k) {
  const anim = ANIMATIONEN[schluessel];
  if (!anim || anim.ansicht === "front") return null;
  const p = mische({ ...STANDARD, ...anim.A }, { ...STANDARD, ...anim.B }, k);
  const thB = p.thB ?? p.th;
  const shB = p.shB ?? p.sh;

  const hueft = { x: 0, y: 0 };
  const schulter = plus(hueft, mal(aufwaerts(p.t), SEG.torso));
  const kopf = plus(schulter, mal(aufwaerts(p.t), 11));
  const ellbogen = plus(schulter, mal(abwaerts(p.ua), SEG.ua));
  const handgelenk = plus(ellbogen, mal(abwaerts(p.fa), SEG.fa));
  const knie = plus(hueft, mal(abwaerts(p.th), SEG.th));
  const knoechel = plus(knie, mal(abwaerts(p.sh), SEG.sh));
  const zeh = plus(knoechel, mal(abwaerts(p.ft), SEG.foot));
  const knieB = plus(hueft, mal(abwaerts(thB), SEG.th));
  const knoechelB = plus(knieB, mal(abwaerts(shB), SEG.sh));
  const zehB = plus(knoechelB, mal(abwaerts(p.ft), SEG.foot));

  const j = { hip: hueft, shoulder: schulter, head: kopf, elbow: ellbogen, wrist: handgelenk, knee: knie, ankle: knoechel, toe: zeh, kneeB: knieB, ankleB: knoechelB, toeB: zehB };
  const fest = j[anim.anker.gelenk];
  const dx = anim.anker.x - fest.x;
  const dy = anim.anker.y - fest.y - p.dy;
  const aus = {};
  for (const [name, punkt] of Object.entries(j)) aus[name] = { x: punkt.x + dx, y: punkt.y + dy };
  return aus;
}

function plus(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
function mal(v, s) { return { x: v.x * s, y: v.y * s }; }
const f = (zahl) => Math.round(zahl * 10) / 10;
const pt = (p) => `${f(p.x)} ${f(p.y)}`;

function szeneZeichnen(szene, g) {
  let aus = "";
  for (const s of szene || []) {
    if (s.t === "linie") aus += `<line class="ue-szene" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}"${s.w ? ` stroke-width="${s.w}"` : ""}/>`;
    else if (s.t === "rechteck") aus += `<rect class="ue-szene ue-fuell" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="2"/>`;
    else if (s.t === "seil") aus += `<line class="ue-szene ue-seil" x1="${f(g.wrist.x)}" y1="${f(g.wrist.y)}" x2="${s.zu[0]}" y2="${s.zu[1]}"/>`;
    else if (s.t === "polster") aus += `<line class="ue-szene" stroke-width="6" x1="${f(g.hip.x - (g.shoulder.x - g.hip.x) * 0.15)}" y1="${f(g.hip.y - (g.shoulder.y - g.hip.y) * 0.15)}" x2="${f(g.shoulder.x + (g.shoulder.x - g.hip.x) * 0.2)}" y2="${f(g.shoulder.y + (g.shoulder.y - g.hip.y) * 0.2)}" stroke-linecap="round" opacity=".6"/>`;
    else if (s.t === "sitz") aus += `<line class="ue-szene" stroke-width="5" x1="${f(g.hip.x - 14)}" y1="${f(g.hip.y + 8)}" x2="${f(g.hip.x + 26)}" y2="${f(g.hip.y + 8)}"/><line class="ue-szene" x1="${f(g.hip.x + 6)}" y1="${f(g.hip.y + 8)}" x2="${f(g.hip.x + 6)}" y2="${BODEN}"/>`;
    else if (s.t === "platte") aus += `<line class="ue-szene" stroke-width="5" stroke-linecap="round" x1="${f(g.ankle.x - 7)}" y1="${f(g.ankle.y - 12)}" x2="${f(g.ankle.x - 7)}" y2="${f(g.ankle.y + 14)}"/>`;
  }
  return aus;
}

/** Eine Seitenansicht als SVG Text. */
function seitenansicht(schluessel, k) {
  const anim = ANIMATIONEN[schluessel];
  const g = gelenke(schluessel, k);
  const ferneBeine = `<polyline class="ue-glied ue-fern" points="${pt(g.hip)} ${pt(g.kneeB)} ${pt(g.ankleB)} ${pt(g.toeB)}"/>`;
  const naheBeine = `<polyline class="ue-glied" points="${pt(g.hip)} ${pt(g.knee)} ${pt(g.ankle)} ${pt(g.toe)}"/>`;
  const rumpf = `<line class="ue-glied ue-rumpf" x1="${f(g.hip.x)}" y1="${f(g.hip.y)}" x2="${f(g.shoulder.x)}" y2="${f(g.shoulder.y)}"/>`;
  const arm = `<polyline class="ue-glied" points="${pt(g.shoulder)} ${pt(g.elbow)} ${pt(g.wrist)}"/>`;
  const kopf = `<circle class="ue-kopf" cx="${f(g.head.x)}" cy="${f(g.head.y)}" r="${SEG.kopf}"/>`;
  let gewicht = "";
  if (anim.gewicht) {
    const ort = g[anim.gewicht];
    gewicht = `<circle class="ue-gewicht" cx="${f(ort.x)}" cy="${f(ort.y)}" r="6.5"/>`;
  }
  return `${szeneZeichnen(anim.szene, g)}${ferneBeine}${naheBeine}${rumpf}${kopf}${arm}${gewicht}`;
}

/** Frontansicht für Seitheben, Schulterzucken, Beinabspreizen. */
function frontansicht(schluessel, k) {
  const anim = ANIMATIONEN[schluessel];
  const p = mische({ a: 0, s: 0, l: 8, r: 0, ...anim.A }, { a: 0, s: 0, l: 8, r: 0, ...anim.B }, k);
  const mitte = 120;
  const schulterY = 66 - p.s;
  const hueftY = 112;
  let svg = `<line class="ue-szene" x1="30" y1="${BODEN}" x2="210" y2="${BODEN}"/>`;
  svg += `<circle class="ue-kopf" cx="${mitte}" cy="${f(schulterY - 20)}" r="9"/>`;
  svg += `<line class="ue-glied ue-rumpf" x1="${mitte}" y1="${f(schulterY)}" x2="${mitte}" y2="${hueftY}"/>`;
  svg += `<line class="ue-glied" x1="${mitte - 20}" y1="${f(schulterY)}" x2="${mitte + 20}" y2="${f(schulterY)}"/>`;
  svg += `<line class="ue-glied" x1="${mitte - 11}" y1="${hueftY}" x2="${mitte + 11}" y2="${hueftY}"/>`;
  for (const seite of [-1, 1]) {
    const bein = { x: Math.sin(rad(p.l)) * 56, y: Math.cos(rad(p.l)) * 56 };
    svg += `<polyline class="ue-glied" points="${f(mitte + seite * 11)} ${hueftY} ${f(mitte + seite * (11 + bein.x))} ${f(hueftY + bein.y)}"/>`;
    const schulter = { x: mitte + seite * 20, y: schulterY };
    let ellbogen;
    let hand;
    if (schluessel === "rotation") {
      ellbogen = { x: schulter.x + seite * 3, y: schulter.y + SEG.ua };
      hand = { x: ellbogen.x + seite * SEG.fa * p.r, y: ellbogen.y - SEG.fa * 0.25 };
    } else {
      const richtung = { x: seite * Math.sin(rad(p.a)), y: Math.cos(rad(p.a)) };
      ellbogen = { x: schulter.x + richtung.x * SEG.ua, y: schulter.y + richtung.y * SEG.ua };
      hand = { x: ellbogen.x + richtung.x * SEG.fa, y: ellbogen.y + richtung.y * SEG.fa };
    }
    svg += `<polyline class="ue-glied" points="${pt(schulter)} ${pt(ellbogen)} ${pt(hand)}"/>`;
    if (anim.gewicht && (schluessel !== "rotation" || seite === 1)) svg += `<circle class="ue-gewicht" cx="${f(hand.x)}" cy="${f(hand.y)}" r="6"/>`;
  }
  return svg;
}

/** Ein Einzelbild als SVG Innentext. */
export function bild(schluessel, k) {
  const anim = ANIMATIONEN[schluessel];
  if (!anim) return "";
  return anim.ansicht === "front" ? frontansicht(schluessel, k) : seitenansicht(schluessel, k);
}

export const VIEWBOX = "16 14 208 176";

/**
 * Startet die Schleife in einem SVG Element. Gibt eine Funktion zurück, die
 * sie beendet. Wer Bewegung reduziert haben will, bekommt das Endbild ohne
 * Bewegung.
 */
export function abspielen(svg, schluessel, { reduziert = false, dauerMs = 2600 } = {}) {
  svg.setAttribute("viewBox", VIEWBOX);
  if (reduziert) {
    svg.innerHTML = bild(schluessel, 1);
    return () => {};
  }
  let handle = 0;
  const start = performance.now();
  const bildSchritt = (jetzt) => {
    svg.innerHTML = bild(schluessel, verlauf((jetzt - start) / dauerMs));
    handle = requestAnimationFrame(bildSchritt);
  };
  handle = requestAnimationFrame(bildSchritt);
  return () => cancelAnimationFrame(handle);
}
