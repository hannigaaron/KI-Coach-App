/**
 * Körpersilhouetten zur Schätzung des Körperfettanteils.
 *
 * Selbst gezeichnet und aus Parametern erzeugt, damit die sechs Stufen
 * zueinander passen. Jede Figur besteht aus einfachen Formen, die sich
 * überlappen: Kopf, Hals, Rumpf, zwei Arme, zwei Beine. Überlappung ist hier
 * ein Vorteil, sie versteckt die Nähte und spart eine komplizierte Kontur.
 *
 * Die Prozentwerte sind Richtwerte für eine Schätzung nach Augenmaß. Eine
 * solche Schätzung liegt selbst bei geübten Trainern gut fünf Prozentpunkte
 * daneben. Sie ersetzt keine Messung per Caliper, DEXA oder BIA. Die App nutzt
 * den Wert nur, um die Proteinmenge auf die fettfreie Masse zu beziehen, nicht
 * für harte Aussagen.
 */

export const BODY_FAT_LEVELS = {
  male: [
    { percent: 10, label: "sehr definiert", hint: "Bauchmuskeln klar sichtbar, Adern an den Armen" },
    { percent: 15, label: "athletisch", hint: "Bauchmuskeln angedeutet, Taille schmal" },
    { percent: 20, label: "normal", hint: "flacher Bauch, keine Definition" },
    { percent: 25, label: "leichter Bauch", hint: "Bauch steht leicht über den Gürtel" },
    { percent: 30, label: "deutlicher Bauch", hint: "runder Bauch, Taille breiter als Brust" },
    { percent: 35, label: "stark", hint: "Bauch dominiert die Silhouette" },
  ],
  female: [
    { percent: 18, label: "sehr definiert", hint: "Bauchmuskeln sichtbar, sehr schmale Taille" },
    { percent: 23, label: "athletisch", hint: "straffe Taille, Muskeln angedeutet" },
    { percent: 28, label: "normal", hint: "weiche Taille, gerundete Hüfte" },
    { percent: 33, label: "leichte Rundung", hint: "Bauch und Hüfte deutlich gerundet" },
    { percent: 38, label: "deutliche Rundung", hint: "Taille kaum abgesetzt" },
    { percent: 43, label: "stark", hint: "Bauch und Hüfte dominieren" },
  ],
};

/**
 * Breiten je Stufe, in Einheiten der Figurenhöhe von 100.
 * Die Taille wächst am schnellsten, das entspricht der Fettverteilung beim
 * Mann. Bei der Frau wächst die Hüfte mit.
 */
function measures(sex, step) {
  const t = step / 5; // 0 bis 1
  if (sex === "female") {
    return {
      shoulder: 10.2 + t * 1.5,
      chest: 9.0 + t * 3.0,
      waist: 6.0 + t * 7.0,
      hip: 10.4 + t * 3.2,
      thigh: 3.6 + t * 2.0,
      arm: 2.3 + t * 1.2,
      belly: t * 3.0,
      head: 5.2,
    };
  }
  return {
    shoulder: 12.2 + t * 1.6,
    chest: 10.2 + t * 3.2,
    waist: 6.8 + t * 8.6,
    hip: 9.2 + t * 3.2,
    thigh: 3.8 + t * 2.2,
    arm: 2.6 + t * 1.4,
    belly: t * 3.8,
    head: 5.4,
  };
}

const CX = 50;

function capsule(x1, y1, x2, y2, r) {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke-width="${(r * 2).toFixed(1)}" stroke-linecap="round"/>`;
}

/**
 * Der Rumpf als geschlossene Kurve über Schulter, Brust, Taille und Hüfte.
 * Der Bauch wird als zusätzliche Wölbung auf die Taille gelegt.
 */
function torso(m) {
  const yShoulder = 23;
  const yChest = 32;
  const yWaist = 44;
  const yHip = 54;
  const yCrotch = 60;
  const waist = m.waist + m.belly * 0.6;

  // Unten schmaler als die Hüfte, sonst wirkt die Figur wie in einem Rock und
  // die Beine setzen sich nicht ab.
  const right = [
    [CX + m.shoulder, yShoulder],
    [CX + m.chest, yChest],
    [CX + waist, yWaist],
    [CX + m.hip, yHip],
    [CX + m.hip * 0.7, yCrotch],
  ];
  const left = right.map(([x, y]) => [CX - (x - CX), y]).reverse();

  const points = [...right, ...left];
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    const cy = (py + y) / 2;
    d += ` C ${px.toFixed(1)} ${cy.toFixed(1)}, ${x.toFixed(1)} ${cy.toFixed(1)}, ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `<path d="${d} Z"/>`;
}

/** Liefert das fertige SVG für eine Stufe. */
export function silhouetteSvg(sex, step) {
  const m = measures(sex === "female" ? "female" : "male", step);
  const yShoulder = 23;
  const legX = m.hip * 0.52;
  // Die Arme haengen neben der breitesten Stelle, nicht davor. Sonst verdecken
  // sie genau die Kontur, an der man die Stufen unterscheidet.
  const breiteste = Math.max(m.shoulder, m.chest, m.waist + m.belly * 0.6, m.hip);
  const armX = breiteste + m.arm * 0.8;
  const parts = [
    `<ellipse cx="${CX}" cy="9" rx="${(m.head * 0.74).toFixed(1)}" ry="${m.head.toFixed(1)}"/>`,
    capsule(CX, 14, CX, yShoulder + 1, 2.4),
    torso(m),
    // Arme, leicht nach außen, bis knapp unter die Hüfte
    capsule(CX + m.shoulder * 0.8, yShoulder + 2, CX + armX, 55, m.arm),
    capsule(CX - m.shoulder * 0.8, yShoulder + 2, CX - armX, 55, m.arm),
    // Beine, nach unten etwas zusammenlaufend
    capsule(CX + legX, 57, CX + legX * 0.72, 97, m.thigh),
    capsule(CX - legX, 57, CX - legX * 0.72, 97, m.thigh),
  ];
  return `<svg viewBox="0 0 100 104" class="silhouette" aria-hidden="true"><g fill="currentColor" stroke="currentColor">${parts.join("")}</g></svg>`;
}
