/**
 * Körperfiguren zur Schätzung des Körperfettanteils.
 *
 * Selbst gezeichnet und aus Parametern erzeugt. Der Grund ist nicht Sturheit:
 * Fotos echter Menschen liegen bei jemandem im Urheberrecht, und gekaufte
 * Bilder müssten in die App wandern und dort gepflegt werden. Erzeugte
 * Figuren sind lizenzfrei, wiegen ein paar Kilobyte und lassen sich an einer
 * einzigen Zahl verstellen.
 *
 * Damit sie plastisch wirken und nicht wie flache Schatten:
 * - Körperformen aus weichen Kurven statt aus Kapseln,
 * - Licht von links über einen Verlauf quer über den Körper,
 * - Muskelzeichnung, die mit steigendem Körperfett verschwindet,
 * - Bauch, Taille und Hüfte, die unterschiedlich schnell wachsen.
 *
 * Die Proportionen folgen den üblichen Körpermassen: die Figur ist siebeneinhalb
 * Kopf hoch, die Schulterbreite liegt beim Mann bei etwa einem Viertel der
 * Körperhöhe, die Hüfte bei der Frau ist breiter als die Schulter. Ohne diese
 * Verhältnisse sieht jede gezeichnete Figur aus wie eine Puppe.
 *
 * Die Prozentwerte sind Richtwerte für eine Schätzung nach Augenmaß. Eine
 * solche Schätzung liegt selbst bei geübten Trainern gut fünf Prozentpunkte
 * daneben. Sie ersetzt keine Messung per Caliper, DEXA oder BIA. Die App nutzt
 * den Wert nur, um die Proteinmenge auf die fettfreie Masse zu beziehen.
 */

export const BODY_FAT_LEVELS = {
  male: [
    { percent: 10, label: "sehr definiert", hint: "Bauchmuskeln klar sichtbar, Adern an den Armen" },
    { percent: 15, label: "athletisch", hint: "Bauchmuskeln angedeutet, Taille schmal" },
    { percent: 20, label: "normal", hint: "flacher Bauch, keine Definition" },
    { percent: 25, label: "leichter Bauch", hint: "Bauch steht leicht über den Gürtel" },
    { percent: 30, label: "deutlicher Bauch", hint: "runder Bauch, Taille breiter als Brust" },
    { percent: 35, label: "stark", hint: "Bauch bestimmt die Form" },
  ],
  female: [
    { percent: 20, label: "sehr definiert", hint: "Bauchmuskeln sichtbar, sehr schmale Taille" },
    { percent: 25, label: "athletisch", hint: "straffe Taille, Muskeln angedeutet" },
    { percent: 30, label: "normal", hint: "weiche Taille, gerundete Hüfte" },
    { percent: 35, label: "leichte Rundung", hint: "Bauch und Hüfte deutlich gerundet" },
    { percent: 40, label: "deutliche Rundung", hint: "Taille kaum abgesetzt" },
    { percent: 45, label: "stark", hint: "Bauch und Hüfte bestimmen die Form" },
  ],
};

/* ---------- Der Entwurfsraum ---------- */

const W = 128;
const CX = W / 2;

/**
 * Die Höhen. Die Figur ist 284 Einheiten hoch und damit siebeneinhalb Kopf,
 * das übliche Verhältnis für einen erwachsenen Körper.
 */
const H = {
  kopfOben: 7,
  kopfUnten: 42,
  halsUnten: 55,
  schulter: 62,
  achsel: 82,
  brust: 90,
  unterBrust: 107,
  taille: 123,
  nabel: 135,
  huefte: 152,
  schritt: 168,
  oberschenkel: 192,
  knie: 218,
  wade: 236,
  knoechel: 270,
  boden: 280,
};

/**
 * Halbe Breiten ab der Mittellinie, jeweils bei 0 und bei 100 Prozent der
 * Skala. Zwischen beiden wird linear überblendet.
 *
 * Beim Mann sitzt das Fett vor allem am Bauch, deshalb wächst der Nabel am
 * stärksten und überholt bei den oberen Stufen die Brust. Bei der Frau
 * wachsen Hüfte und Oberschenkel mit, die Taille bleibt länger abgesetzt.
 * Genau daran erkennt man auf so einem Bild den Unterschied.
 */
const MASSE = {
  male: {
    kopf: [12.6, 12.6], hals: [6.2, 7.4],
    schulter: [33.5, 37.5],
    brust: [29.5, 36.0],
    unterBrust: [23.5, 34.0],
    taille: [20.0, 36.5],
    nabel: [19.5, 38.5],
    huefte: [24.5, 33.5],
    schritt: [22.0, 27.0],
    oberschenkel: [12.4, 17.6],
    knie: [8.0, 10.0],
    wade: [9.6, 12.0],
    knoechel: [4.6, 5.6],
    oberarm: [6.6, 10.0],
    ellbogen: [5.6, 8.2],
    unterarm: [5.2, 7.4],
    handgelenk: [3.8, 4.8],
    hand: [4.6, 5.6],
  },
  female: {
    kopf: [11.8, 11.8], hals: [5.4, 6.4],
    schulter: [27.5, 30.5],
    brust: [27.5, 34.0],
    unterBrust: [20.5, 30.5],
    taille: [16.8, 31.5],
    nabel: [17.5, 34.0],
    huefte: [30.5, 40.0],
    schritt: [22.5, 28.0],
    oberschenkel: [13.2, 19.6],
    knie: [7.6, 9.6],
    wade: [9.0, 11.4],
    knoechel: [4.2, 5.2],
    oberarm: [5.8, 9.2],
    ellbogen: [4.8, 7.4],
    unterarm: [4.6, 6.8],
    handgelenk: [3.4, 4.4],
    hand: [4.2, 5.2],
  },
};

/**
 * Die Masse einer Stufe, als Zahlen statt als Bild.
 *
 * Nach aussen gegeben, damit sich die Verhältnisse prüfen lassen. Aus einem
 * fertigen SVG die Taillenbreite herauszulesen wäre Raten.
 */
export function koerpermasse(sex, step) {
  const geschlecht = sex === "female" ? "female" : "male";
  const stufe = Math.max(0, Math.min(5, Math.round(Number(step) || 0)));
  return masse(geschlecht, stufe / 5);
}

function masse(sex, t) {
  const roh = MASSE[sex];
  const out = {};
  for (const [name, [von, bis]] of Object.entries(roh)) out[name] = von + (bis - von) * t;
  // Der Bauch wölbt sich nicht linear, sondern erst ab der Mitte der Skala.
  // Bis etwa 20 Prozent ist der Bauch flach, danach geht es schnell.
  out.bauch = t * t * (sex === "female" ? 5.6 : 7.0);
  return out;
}

/* ---------- Zeichenhelfer ---------- */

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Baut aus einer Mittellinie mit halben Breiten eine geschlossene, weiche Form.
 *
 * Die Kontrollpunkte liegen senkrecht zwischen zwei Punkten. Bei einem
 * stehenden Körper laufen fast alle Konturen senkrecht, deshalb ergibt das
 * runde Hüften und Waden, ohne jede Kurve einzeln zu setzen.
 */
function form(punkte, { obenRund = true, untenRund = true, spannung = 0.42 } = {}) {
  const rechts = punkte.map((p) => [p.x + p.w, p.y]);
  const links = punkte.map((p) => [p.x - p.w, p.y]).reverse();
  const erster = punkte[0];
  const letzter = punkte[punkte.length - 1];

  const kurve = (liste) => {
    let out = "";
    for (let i = 1; i < liste.length; i++) {
      const [x0, y0] = liste[i - 1];
      const [x1, y1] = liste[i];
      const dy = (y1 - y0) * spannung;
      out += ` C ${r1(x0)} ${r1(y0 + dy)}, ${r1(x1)} ${r1(y1 - dy)}, ${r1(x1)} ${r1(y1)}`;
    }
    return out;
  };

  let d = `M ${r1(rechts[0][0])} ${r1(rechts[0][1])}`;
  d += kurve(rechts);
  d += untenRund
    ? ` A ${r1(letzter.w)} ${r1(letzter.w * 0.85)} 0 0 0 ${r1(letzter.x - letzter.w)} ${r1(letzter.y)}`
    : ` L ${r1(letzter.x - letzter.w)} ${r1(letzter.y)}`;
  d += kurve(links);
  d += obenRund
    ? ` A ${r1(erster.w)} ${r1(erster.w * 0.85)} 0 0 0 ${r1(erster.x + erster.w)} ${r1(erster.y)}`
    : ` L ${r1(erster.x + erster.w)} ${r1(erster.y)}`;
  return `${d} Z`;
}

/* ---------- Die Teile des Körpers ---------- */

function rumpf(m) {
  return form(
    [
      { x: CX, y: H.halsUnten - 6, w: m.hals + 1.0 },
      { x: CX, y: H.schulter, w: m.schulter },
      { x: CX, y: H.achsel, w: m.brust * 0.985 },
      { x: CX, y: H.brust, w: m.brust },
      { x: CX, y: H.unterBrust, w: m.unterBrust },
      { x: CX, y: H.taille, w: m.taille },
      { x: CX, y: H.nabel, w: m.nabel },
      { x: CX, y: H.huefte, w: m.huefte },
      { x: CX, y: H.schritt + 6, w: m.schritt },
    ],
    { obenRund: false, untenRund: false, spannung: 0.36 },
  );
}

/** Schultern und Trapez, damit der Hals nicht wie ein Rohr auf einer Platte sitzt. */
function schultern(m) {
  const y = H.schulter;
  return (
    `<path d="M ${r1(CX - m.schulter)} ${r1(y + 4)}` +
    ` C ${r1(CX - m.schulter * 0.72)} ${r1(y - 8)}, ${r1(CX - m.hals * 1.5)} ${r1(H.halsUnten - 8)}, ${r1(CX - m.hals * 0.9)} ${r1(H.halsUnten - 12)}` +
    ` L ${r1(CX + m.hals * 0.9)} ${r1(H.halsUnten - 12)}` +
    ` C ${r1(CX + m.hals * 1.5)} ${r1(H.halsUnten - 8)}, ${r1(CX + m.schulter * 0.72)} ${r1(y - 8)}, ${r1(CX + m.schulter)} ${r1(y + 4)} Z"` +
    ` fill="url(#haut-VAR)"/>`
  );
}

/** Der Bauch als eigene Wölbung darüber. Erst ab etwa 22 Prozent sichtbar. */
function bauch(m) {
  if (m.bauch < 0.8) return "";
  const breite = m.nabel * 0.84;
  const oben = H.taille - 2;
  const unten = H.huefte + 4;
  const mitte = (oben + unten) / 2;
  return (
    `<path d="M ${r1(CX - breite)} ${r1(mitte)}` +
    ` C ${r1(CX - breite)} ${r1(oben - m.bauch)}, ${r1(CX + breite)} ${r1(oben - m.bauch)}, ${r1(CX + breite)} ${r1(mitte)}` +
    ` C ${r1(CX + breite)} ${r1(unten + m.bauch)}, ${r1(CX - breite)} ${r1(unten + m.bauch)}, ${r1(CX - breite)} ${r1(mitte)} Z"` +
    ` fill="url(#bauch-VAR)" opacity="${Math.min(0.62, 0.2 + m.bauch * 0.07).toFixed(2)}"/>`
  );
}

function bein(m, seite) {
  const s = seite === "links" ? -1 : 1;
  const huefteX = CX + s * (m.schritt * 0.46);
  const knieX = CX + s * (m.schritt * 0.4);
  const fussX = CX + s * (m.schritt * 0.36);
  return form(
    [
      { x: huefteX, y: H.huefte - 10, w: m.oberschenkel * 1.1 },
      { x: huefteX, y: H.oberschenkel, w: m.oberschenkel },
      { x: (huefteX + knieX) / 2, y: H.knie - 16, w: m.knie * 1.22 },
      { x: knieX, y: H.knie, w: m.knie },
      { x: knieX, y: H.wade, w: m.wade },
      { x: fussX, y: H.knoechel, w: m.knoechel },
    ],
    { obenRund: false, untenRund: false, spannung: 0.4 },
  );
}

/** Fuss von vorne: kurz, breiter als der Knöchel, vorne rund. */
function fuss(m, seite) {
  const s = seite === "links" ? -1 : 1;
  const x = CX + s * (m.schritt * 0.36);
  return (
    `<path d="${form([
      { x, y: H.knoechel - 4, w: m.knoechel },
      { x: x + s * 0.8, y: H.boden - 3, w: m.knoechel * 1.35 },
    ], { obenRund: false, untenRund: true, spannung: 0.5 })}" fill="url(#haut-VAR)"/>`
  );
}

function arm(m, seite) {
  const s = seite === "links" ? -1 : 1;
  // Der Arm hängt neben der breitesten Stelle des Rumpfes, nicht davor. Sonst
  // verdeckt er genau die Kontur, an der man die Stufen unterscheidet.
  const breiteste = Math.max(m.schulter, m.brust, m.nabel, m.huefte);
  const schulterX = CX + s * (m.schulter - m.oberarm * 0.5);
  const handX = CX + s * (breiteste + m.unterarm * 0.75);
  const ellbogenX = schulterX + (handX - schulterX) * 0.55;
  return form(
    [
      { x: schulterX, y: H.schulter + 2, w: m.oberarm * 1.12 },
      { x: schulterX + s * 1.2, y: H.brust, w: m.oberarm },
      { x: ellbogenX, y: H.unterBrust + 8, w: m.ellbogen },
      { x: handX - s * 1.2, y: H.nabel + 4, w: m.unterarm },
      { x: handX, y: H.huefte + 2, w: m.handgelenk },
      { x: handX, y: H.huefte + 12, w: m.hand },
      { x: handX, y: H.schritt + 12, w: m.handgelenk * 0.85 },
    ],
    { obenRund: true, untenRund: true, spannung: 0.44 },
  );
}

function kopfUndHals(m) {
  const kopfMitte = (H.kopfOben + H.kopfUnten) / 2;
  const ry = (H.kopfUnten - H.kopfOben) / 2;
  return (
    `<path d="${form([
      { x: CX, y: H.kopfUnten - 10, w: m.hals },
      { x: CX, y: H.halsUnten, w: m.hals * 1.1 },
    ], { obenRund: false, untenRund: false })}" fill="url(#hals-VAR)"/>` +
    `<ellipse cx="${CX}" cy="${r1(kopfMitte)}" rx="${r1(m.kopf)}" ry="${r1(ry)}" fill="url(#haut-VAR)"/>` +
    // Kiefer und Kinn: unten schmaler als die Schläfen.
    `<path d="M ${r1(CX - m.kopf * 0.95)} ${r1(kopfMitte + ry * 0.1)}` +
    ` C ${r1(CX - m.kopf * 0.85)} ${r1(H.kopfUnten - 1)}, ${r1(CX + m.kopf * 0.85)} ${r1(H.kopfUnten - 1)}, ${r1(CX + m.kopf * 0.95)} ${r1(kopfMitte + ry * 0.1)} Z"` +
    ` fill="url(#haut-VAR)"/>`
  );
}

/** Haare. Ohne sie ist der Kopf eine Murmel. */
function haare(m, sex) {
  const kopfMitte = (H.kopfOben + H.kopfUnten) / 2;
  const rx = m.kopf;
  const ry = (H.kopfUnten - H.kopfOben) / 2;
  const stirn = kopfMitte - ry * 0.34;

  if (sex === "female") {
    // Lange Haare: hinter dem Kopf, an den Seiten bis auf die Schulter.
    const aussen = rx + 3.4;
    return (
      `<path d="M ${r1(CX - aussen)} ${r1(kopfMitte + 4)}` +
      ` C ${r1(CX - aussen - 1)} ${r1(H.kopfOben - 3)}, ${r1(CX + aussen + 1)} ${r1(H.kopfOben - 3)}, ${r1(CX + aussen)} ${r1(kopfMitte + 4)}` +
      ` C ${r1(CX + aussen + 1.5)} ${r1(H.schulter - 10)}, ${r1(CX + rx + 1)} ${r1(H.schulter - 2)}, ${r1(CX + rx - 1)} ${r1(H.schulter + 2)}` +
      ` L ${r1(CX + rx - 4)} ${r1(H.halsUnten - 8)}` +
      ` C ${r1(CX + rx * 0.5)} ${r1(H.kopfUnten - 6)}, ${r1(CX - rx * 0.5)} ${r1(H.kopfUnten - 6)}, ${r1(CX - rx + 4)} ${r1(H.halsUnten - 8)}` +
      ` L ${r1(CX - rx + 1)} ${r1(H.schulter + 2)}` +
      ` C ${r1(CX - rx - 1)} ${r1(H.schulter - 2)}, ${r1(CX - aussen - 1.5)} ${r1(H.schulter - 10)}, ${r1(CX - aussen)} ${r1(kopfMitte + 4)} Z"` +
      ` fill="url(#haar-VAR)"/>` +
      // Scheitel vorne, damit die Stirn frei bleibt.
      `<path d="M ${r1(CX - rx)} ${r1(stirn + 3)}` +
      ` C ${r1(CX - rx)} ${r1(H.kopfOben + 1)}, ${r1(CX + rx)} ${r1(H.kopfOben + 1)}, ${r1(CX + rx)} ${r1(stirn + 3)}` +
      ` C ${r1(CX + rx * 0.5)} ${r1(stirn - 2)}, ${r1(CX - rx * 0.5)} ${r1(stirn - 2)}, ${r1(CX - rx)} ${r1(stirn + 3)} Z"` +
      ` fill="url(#haar-VAR)"/>`
    );
  }
  // Kurze Haare: eine Kappe, die an den Schläfen ausläuft.
  return (
    `<path d="M ${r1(CX - rx - 0.4)} ${r1(stirn + 5)}` +
    ` C ${r1(CX - rx - 0.8)} ${r1(H.kopfOben - 1)}, ${r1(CX + rx + 0.8)} ${r1(H.kopfOben - 1)}, ${r1(CX + rx + 0.4)} ${r1(stirn + 5)}` +
    ` C ${r1(CX + rx * 0.86)} ${r1(stirn - 1)}, ${r1(CX + rx * 0.45)} ${r1(stirn + 1.5)}, ${CX} ${r1(stirn + 1)}` +
    ` C ${r1(CX - rx * 0.45)} ${r1(stirn + 1.5)}, ${r1(CX - rx * 0.86)} ${r1(stirn - 1)}, ${r1(CX - rx - 0.4)} ${r1(stirn + 5)} Z"` +
    ` fill="url(#haar-VAR)"/>`
  );
}

/**
 * Muskelzeichnung. Verschwindet, je höher der Körperfettanteil.
 *
 * Das ist der eigentliche Unterschied zwischen 10 und 20 Prozent: die Breite
 * ändert sich kaum, die Zeichnung dagegen vollständig.
 */
function zeichnung(m, t, sex) {
  const deutlich = Math.max(0, 1 - t * 2.4);
  const teile = [];
  const linie = (d, breite, staerke) =>
    `<path d="${d}" stroke="url(#linie-VAR)" stroke-width="${breite}" stroke-linecap="round" fill="none" opacity="${staerke.toFixed(2)}"/>`;

  if (deutlich > 0.04) {
    const o = (f) => deutlich * f;
    // Mittellinie des Bauches
    teile.push(linie(`M ${CX} ${r1(H.unterBrust + 3)} L ${CX} ${r1(H.nabel - 3)}`, 1.1, o(0.7)));
    // Querlinien der Bauchmuskeln
    const b = m.taille * 0.46;
    for (const y of [H.unterBrust + 10, H.unterBrust + 23, H.taille + 6]) {
      teile.push(linie(`M ${r1(CX - b)} ${r1(y)} Q ${CX} ${r1(y + 2.6)} ${r1(CX + b)} ${r1(y)}`, 1, o(0.5)));
    }
    // Brustansatz
    if (sex === "male") {
      for (const s of [-1, 1]) {
        teile.push(linie(
          `M ${r1(CX + s * m.brust * 0.8)} ${r1(H.brust - 6)} Q ${r1(CX + s * m.brust * 0.42)} ${r1(H.unterBrust)} ${CX} ${r1(H.unterBrust - 4)}`,
          1.6, o(0.4),
        ));
      }
    }
    // Knie andeuten, sonst wirken die Beine wie Rohre.
    for (const s of [-1, 1]) {
      const x = CX + s * (m.schritt * 0.4);
      teile.push(linie(
        `M ${r1(x - m.knie * 0.55)} ${r1(H.knie - 3)} Q ${r1(x)} ${r1(H.knie + 2)} ${r1(x + m.knie * 0.55)} ${r1(H.knie - 3)}`,
        0.9, o(0.4),
      ));
    }
  }

  // Die schrägen Hüftlinien gibt es nur bei sehr niedrigem Körperfett.
  const schraeg = Math.max(0, 1 - t * 3.6);
  if (schraeg > 0.04) {
    for (const s of [-1, 1]) {
      teile.push(linie(
        `M ${r1(CX + s * m.taille * 0.92)} ${r1(H.nabel - 6)} Q ${r1(CX + s * m.taille * 0.55)} ${r1(H.huefte)} ${r1(CX + s * m.schritt * 0.34)} ${r1(H.schritt - 4)}`,
        1.2, schraeg * 0.55,
      ));
    }
  }

  // Bauchfalte und Nabel, sobald genug Fett da ist.
  if (t >= 0.45) {
    const staerke = (t - 0.45) / 0.55;
    teile.push(linie(
      `M ${r1(CX - m.nabel * 0.58)} ${r1(H.huefte - 10)} Q ${CX} ${r1(H.huefte - 2)} ${r1(CX + m.nabel * 0.58)} ${r1(H.huefte - 10)}`,
      1.4, staerke * 0.4,
    ));
  }
  teile.push(
    `<ellipse cx="${CX}" cy="${r1(H.nabel + 2)}" rx="1.7" ry="2.1" fill="url(#linie-VAR)" opacity="${(0.28 + t * 0.22).toFixed(2)}"/>`,
  );
  return teile.join("");
}

/** Kleidung. Sie macht aus einer Form einen Menschen und setzt die Hüfte ab. */
function kleidung(m, sex) {
  const teile = [];
  if (sex === "female") {
    // Zwei Körbchen statt eines Bandes, sonst sieht es aus wie eine Binde.
    const y = H.brust - 2;
    const halb = m.brust * 0.92;
    teile.push(
      `<path d="M ${r1(CX - halb)} ${r1(y - 8)}` +
      ` C ${r1(CX - halb * 0.55)} ${r1(y - 12)}, ${r1(CX + halb * 0.55)} ${r1(y - 12)}, ${r1(CX + halb)} ${r1(y - 8)}` +
      ` C ${r1(CX + halb * 1.02)} ${r1(y + 6)}, ${r1(CX + halb * 0.62)} ${r1(y + 11)}, ${r1(CX + halb * 0.34)} ${r1(y + 10)}` +
      ` C ${r1(CX + halb * 0.16)} ${r1(y + 9)}, ${r1(CX - halb * 0.16)} ${r1(y + 9)}, ${r1(CX - halb * 0.34)} ${r1(y + 10)}` +
      ` C ${r1(CX - halb * 0.62)} ${r1(y + 11)}, ${r1(CX - halb * 1.02)} ${r1(y + 6)}, ${r1(CX - halb)} ${r1(y - 8)} Z"` +
      ` fill="url(#stoff-VAR)"/>`,
    );
  }
  // Unterteil auf der Hüfte, in der Mitte tiefer geschnitten.
  const oben = H.huefte - 1;
  const unten = H.schritt + 8;
  const halb = m.huefte * 1.0;
  teile.push(
    `<path d="M ${r1(CX - halb)} ${r1(oben)}` +
    ` Q ${CX} ${r1(oben + 6)} ${r1(CX + halb)} ${r1(oben)}` +
    ` C ${r1(CX + halb * 0.94)} ${r1(unten - 12)}, ${r1(CX + m.schritt * 0.5)} ${r1(unten - 6)}, ${r1(CX + m.schritt * 0.34)} ${r1(unten)}` +
    ` Q ${CX} ${r1(unten + 7)} ${r1(CX - m.schritt * 0.34)} ${r1(unten)}` +
    ` C ${r1(CX - m.schritt * 0.5)} ${r1(unten - 6)}, ${r1(CX - halb * 0.94)} ${r1(unten - 12)}, ${r1(CX - halb)} ${r1(oben)} Z"` +
    ` fill="url(#stoff-VAR)"/>`,
  );
  return teile.join("");
}

/* ---------- Zusammenbau ---------- */

/**
 * Liefert das fertige SVG für eine Stufe.
 *
 * Die Verlaufskennungen tragen einen Zusatz je Figur, weil mehrere SVG auf
 * derselben Seite stehen und Kennungen im Dokument eindeutig sein müssen.
 */
export function silhouetteSvg(sex, step) {
  const geschlecht = sex === "female" ? "female" : "male";
  const stufe = Math.max(0, Math.min(5, Math.round(Number(step) || 0)));
  const t = stufe / 5;
  const m = masse(geschlecht, t);
  const id = `${geschlecht}${stufe}`;

  const haut = (d) => `<path d="${d}" fill="url(#haut-VAR)"/>`;

  const inhalt = [
    haare(m, geschlecht),
    fuss(m, "links"),
    fuss(m, "rechts"),
    haut(bein(m, "links")),
    haut(bein(m, "rechts")),
    haut(rumpf(m)),
    schultern(m),
    kopfUndHals(m),
    bauch(m),
    zeichnung(m, t, geschlecht),
    kleidung(m, geschlecht),
    haut(arm(m, "links")),
    haut(arm(m, "rechts")),
  ].join("").replaceAll("-VAR)", `-${id})`);

  return `<svg viewBox="0 0 ${W} ${H.boden + 2}" class="silhouette" aria-hidden="true">${defs(id)}${inhalt}</svg>`;
}

/**
 * Die Verläufe.
 *
 * Das Licht kommt von links, so wie auf fast jedem Produktbild. Der Verlauf
 * über die Breite gibt dem Körper Rundung, ohne dass eine einzige
 * Schattenfläche gezeichnet werden müsste. Der Hautton ist bewusst neutral
 * gehalten und soll niemanden abbilden, sondern eine Form zeigen.
 */
function defs(id) {
  return `<defs>
    <linearGradient id="haut-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a6350"/>
      <stop offset="10%" stop-color="#b7896c"/>
      <stop offset="30%" stop-color="#e6c1a4"/>
      <stop offset="52%" stop-color="#dcb094"/>
      <stop offset="76%" stop-color="#bb8a6c"/>
      <stop offset="100%" stop-color="#835d4a"/>
    </linearGradient>
    <linearGradient id="hals-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7a5643"/>
      <stop offset="45%" stop-color="#c39a7d"/>
      <stop offset="100%" stop-color="#6f4e3d"/>
    </linearGradient>
    <linearGradient id="bauch-${id}" x1="0.2" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="#f0d2b7" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#d8ab8b" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#8a6350" stop-opacity="0.8"/>
    </linearGradient>
    <linearGradient id="haar-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#241b16"/>
      <stop offset="30%" stop-color="#453529"/>
      <stop offset="100%" stop-color="#1d1611"/>
    </linearGradient>
    <linearGradient id="stoff-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#16303f"/>
      <stop offset="35%" stop-color="#2f6b86"/>
      <stop offset="100%" stop-color="#122834"/>
    </linearGradient>
    <linearGradient id="linie-${id}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7a5643" stop-opacity="0.35"/>
      <stop offset="40%" stop-color="#8a6047"/>
      <stop offset="100%" stop-color="#6a4a38" stop-opacity="0.35"/>
    </linearGradient>
  </defs>`;
}
