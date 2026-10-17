/**
 * Die Gewichtskurve unter dem Eintragen.
 *
 * Eine Zahl allein sagt nach dem Wiegen wenig. Wer sieht, wo sie gegen die
 * letzten Wochen liegt, liest eine Schwankung als Schwankung und nicht als
 * Rückschlag.
 *
 * Gezeichnet wird jede Wiegung als Punkt, verbunden in zeitlicher Folge. Die
 * Abstände auf der Zeitachse sind echte Tage: zwei Wiegungen mit einer Woche
 * dazwischen liegen weiter auseinander als zwei an aufeinanderfolgenden
 * Tagen. Anders als bei den Karten im Bericht wird über Lücken verbunden.
 * Ein Tag ohne Wiegung ist kein Tag ohne Gewicht, und die Linie zwischen zwei
 * Punkten behauptet nur, dass es dazwischen irgendwo lag.
 *
 * Die gestrichelte Gerade ist der Trend aus `weightTrend` im Kern, keine
 * eigene Rechnung. Sie steht nur da, wo der Kern ihn belastbar nennt, also ab
 * vier Wiegungen über zwei Wochen. Davor wäre sie eine Richtung aus Rauschen.
 *
 * Kein Zugriff auf `document`, damit der Test ohne Browser läuft. Farben
 * kommen über Klassen aus dem Stylesheet, damit Hell und Dunkel stimmen.
 */

const MONATE = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];

const B = 340;
const H = 150;
const LINKS = 38;
const RECHTS = 14;
const OBEN = 14;
const UNTEN = 24;

/**
 * @param {{ day: string, weightKg: number|null }[]} punkte älteste zuerst, ein Eintrag je Tag
 * @param {{ belastbar: boolean, aktuellKg: number|null, kgProWoche: number, spanneTage: number }} trend
 * @returns {string} SVG, oder "" ohne Wiegung
 */
export function gewichtsKurve(punkte, trend) {
  const tage = Array.isArray(punkte) ? punkte : [];
  const n = tage.length;
  const messungen = [];
  tage.forEach((p, i) => {
    // Auf null prüfen, bevor gerechnet wird: Number(null) ist 0, und eine
    // Wiegung von null Kilo hat in dieser App schon einmal im Bericht gestanden.
    if (p && p.weightKg !== null && p.weightKg !== undefined && Number(p.weightKg) > 0) {
      messungen.push({ i, kg: Number(p.weightKg), day: p.day });
    }
  });
  if (messungen.length === 0 || n === 0) return "";

  // Die Zeitachse beginnt beim ersten Tag mit Wiegung, nicht am Anfang des
  // Zeitraums. Wer seit zwei Wochen wiegt und drei Monate wählt, sähe sonst
  // elf Wochen leere Fläche und alle Punkte am rechten Rand übereinander.
  const start = messungen[0].i;
  for (const m of messungen) m.i -= start;
  const spanne = n - 1 - start;

  // Die Trendgerade endet am letzten Messtag auf dem geglätteten Wert und
  // fällt über die Spanne der Messungen mit der Steigung des Kerns zurück.
  let gerade = null;
  if (trend?.belastbar && Number.isFinite(trend.aktuellKg) && messungen.length >= 2) {
    const letzte = messungen[messungen.length - 1];
    const erste = messungen[0];
    const proTag = trend.kgProWoche / 7;
    gerade = {
      von: { i: erste.i, kg: trend.aktuellKg - proTag * (letzte.i - erste.i) },
      bis: { i: letzte.i, kg: trend.aktuellKg },
    };
  }

  const werte = messungen.map((m) => m.kg);
  if (gerade) werte.push(gerade.von.kg, gerade.bis.kg);
  let min = Math.min(...werte);
  let max = Math.max(...werte);
  // Mindestens zwei Kilo Höhe. Sonst zieht eine Schwankung von 300 Gramm
  // über die ganze Fläche und sieht aus wie ein Absturz.
  if (max - min < 2) {
    const mitte = (max + min) / 2;
    min = mitte - 1;
    max = mitte + 1;
  }
  min = Math.floor(min * 2) / 2;
  max = Math.ceil(max * 2) / 2;

  const x = (i) => (spanne > 0 ? LINKS + (i / spanne) * (B - LINKS - RECHTS) : (LINKS + B - RECHTS) / 2);
  const y = (kg) => OBEN + ((max - kg) / (max - min)) * (H - OBEN - UNTEN);
  const f = (v) => v.toFixed(1);

  const teile = [];
  const mitte = (max + min) / 2;
  // Beschriftet sind nur Ober und Unterkante. Die Mitte liegt oft auf einem
  // Viertelkilo, und eine Achse mit 84,3 liest sich wie ein Messwert.
  for (const kg of [max, mitte, min]) {
    teile.push(`<line class="gk-raster" x1="${LINKS}" x2="${B - RECHTS}" y1="${f(y(kg))}" y2="${f(y(kg))}"/>`);
    if (kg !== mitte) teile.push(`<text class="gk-achse" x="${LINKS - 6}" y="${f(y(kg) + 3.5)}" text-anchor="end">${kg.toFixed(1).replace(".", ",")}</text>`);
  }
  if (spanne > 0) teile.push(`<text class="gk-achse" x="${LINKS}" y="${H - 6}">${datum(tage[start].day)}</text>`);
  teile.push(`<text class="gk-achse" x="${B - RECHTS}" y="${H - 6}" text-anchor="end">${datum(tage[n - 1].day)}</text>`);

  if (gerade) {
    teile.push(`<line class="gk-trend" x1="${f(x(gerade.von.i))}" y1="${f(y(gerade.von.kg))}" ` +
      `x2="${f(x(gerade.bis.i))}" y2="${f(y(gerade.bis.kg))}"/>`);
  }
  if (messungen.length >= 2) {
    const d = messungen.map((m, k) => `${k ? "L" : "M"}${f(x(m.i))} ${f(y(m.kg))}`).join(" ");
    teile.push(`<path class="gk-linie" d="${d}"/>`);
  }
  messungen.forEach((m, k) => {
    const letzte = k === messungen.length - 1;
    teile.push(`<circle class="${letzte ? "gk-punkt gk-letzter" : "gk-punkt"}" cx="${f(x(m.i))}" cy="${f(y(m.kg))}" r="${letzte ? 4.5 : 3}"/>`);
  });

  // Der letzte Wert steht nicht am Punkt, sondern über der Kurve in
  // `gewichtsSpanne`. Am Punkt lag die Zahl im Betrieb auf der Linie, die
  // von links oben hereinkommt, und war nicht zu lesen.
  const letzte = messungen[messungen.length - 1];
  const beschreibung = `${messungen.length} ${messungen.length === 1 ? "Wiegung" : "Wiegungen"}, ` +
    `zuletzt ${letzte.kg.toFixed(1).replace(".", ",")} kg am ${datum(letzte.day)}`;
  return `<svg class="gewicht-kurve" viewBox="0 0 ${B} ${H}" role="img" aria-label="${beschreibung}">${teile.join("")}</svg>`;
}

function datum(iso) {
  const [, m, t] = String(iso).split("-").map(Number);
  return m ? `${t}. ${MONATE[m - 1]}` : "";
}

/**
 * Die Zeile über der Kurve: letzter Wert und Strecke seit der ersten Wiegung
 * im Zeitraum. Eine Strecke und kein Schnitt, wie im Bericht: der
 * Durchschnitt von 87 und 85 Kilo sagt über eine Abnahme nichts.
 *
 * @returns {{ kg: string, zusatz: string } | null}
 */
export function gewichtsSpanne(punkte) {
  const m = (Array.isArray(punkte) ? punkte : [])
    .filter((p) => p && p.weightKg !== null && p.weightKg !== undefined && Number(p.weightKg) > 0);
  if (m.length === 0) return null;
  const letzte = m[m.length - 1];
  const kg = `${Number(letzte.weightKg).toFixed(1).replace(".", ",")} kg`;
  if (m.length === 1) return { kg, zusatz: `gewogen am ${datum(letzte.day)}` };
  const diff = Math.round((Number(letzte.weightKg) - Number(m[0].weightKg)) * 10) / 10;
  const betrag = Math.abs(diff).toFixed(1).replace(".", ",");
  const zusatz = diff === 0
    ? `gleich wie am ${datum(m[0].day)}`
    : `${diff > 0 ? "plus" : "minus"} ${betrag} kg seit ${datum(m[0].day)}`;
  return { kg, zusatz };
}
