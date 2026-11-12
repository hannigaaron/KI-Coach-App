/**
 * Der Fortschritt einer Übung: Kurve, Urteil und die letzten Einheiten.
 *
 * Gezeichnet wird das schwerste Gewicht je Einheit, denn danach fragt man im
 * Studio. Geurteilt wird über die geschätzte Maximalkraft aus `uebungsTrend`
 * im Kern, dieselbe Rechnung wie beim Tausch nach acht Wochen. Das Gewicht
 * allein würde zehn Wiederholungen mit 80 kg schlechter nennen als fünf mit
 * 82,5, und genau so sieht eine gute Steigerung aus. Deshalb steht unter der
 * Kurve, womit gerechnet ist.
 *
 * Ohne Zusatzgewicht, etwa beim Klimmzug, zeigt die Kurve Wiederholungen.
 *
 * Kein Zugriff auf `document`, damit der Test ohne Browser läuft. Farben
 * kommen über Klassen aus dem Stylesheet, Hell und Dunkel stimmen damit.
 */
import { uebungsPunkte, uebungsTrend } from "@daevo/core";

const MONATE = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"];
const B = 340;
const H = 150;
const LINKS = 38;
const RECHTS = 14;
const OBEN = 14;
const UNTEN = 24;
/** Mehr als sechzehn Wochen liest auf dem Handy niemand mehr Punkt für Punkt. */
const FENSTER_TAGE = 112;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const tagZahl = (iso) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const zahl = (x) => String(Math.round(x * 10) / 10).replace(".", ",");

export function datumKurz(iso) {
  const [, m, t] = String(iso).split("-").map(Number);
  return m ? `${t}. ${MONATE[m - 1]}` : "";
}

/** Die Punkte der letzten sechzehn Wochen, und ob in Kilo oder Wiederholungen. */
export function kurvenPunkte(log, uebung, heute) {
  const alle = uebungsPunkte(log, uebung).filter((p) => tagZahl(heute) - tagZahl(p.datum) <= FENSTER_TAGE);
  const mitGewicht = alle.some((p) => p.kg > 0);
  return { punkte: alle.map((p) => ({ ...p, y: mitGewicht ? p.kg : p.wdh })), einheit: mitGewicht ? "kg" : "Wdh." };
}

/** SVG der Kurve, "" unter zwei Einheiten: ein Punkt ist kein Verlauf. */
export function uebungsKurve(punkte, einheit = "kg") {
  if (!Array.isArray(punkte) || punkte.length < 2) return "";
  const t0 = tagZahl(punkte[0].datum);
  const spanne = Math.max(1, tagZahl(punkte[punkte.length - 1].datum) - t0);
  let min = Math.min(...punkte.map((p) => p.y));
  let max = Math.max(...punkte.map((p) => p.y));
  // Mindestens fünf Kilo oder drei Wiederholungen Höhe. Sonst sieht eine
  // Steigerung um 2,5 kg aus wie ein Sprung über die ganze Fläche.
  const mindest = einheit === "kg" ? 5 : 3;
  if (max - min < mindest) { const m = (max + min) / 2; min = m - mindest / 2; max = m + mindest / 2; }
  if (min < 0) { max -= min; min = 0; }
  const x = (d) => LINKS + ((tagZahl(d) - t0) / spanne) * (B - LINKS - RECHTS);
  const y = (v) => OBEN + ((max - v) / (max - min)) * (H - OBEN - UNTEN);
  const f = (v) => v.toFixed(1);
  const teile = [];
  for (const v of [max, (max + min) / 2, min]) {
    teile.push(`<line class="gk-raster" x1="${LINKS}" x2="${B - RECHTS}" y1="${f(y(v))}" y2="${f(y(v))}"/>`);
    if (v !== (max + min) / 2) teile.push(`<text class="gk-achse" x="${LINKS - 6}" y="${f(y(v) + 3.5)}" text-anchor="end">${zahl(v)}</text>`);
  }
  teile.push(`<text class="gk-achse" x="${LINKS}" y="${H - 6}">${datumKurz(punkte[0].datum)}</text>`);
  teile.push(`<text class="gk-achse" x="${B - RECHTS}" y="${H - 6}" text-anchor="end">${datumKurz(punkte[punkte.length - 1].datum)}</text>`);
  teile.push(`<path class="gk-linie" d="${punkte.map((p, i) => `${i ? "L" : "M"}${f(x(p.datum))} ${f(y(p.y))}`).join(" ")}"/>`);
  punkte.forEach((p, i) => {
    const letzter = i === punkte.length - 1;
    teile.push(`<circle class="${letzter ? "gk-punkt gk-letzter" : "gk-punkt"}" cx="${f(x(p.datum))}" cy="${f(y(p.y))}" r="${letzter ? 4.5 : 3}"/>`);
  });
  const l = punkte[punkte.length - 1];
  return `<svg class="gewicht-kurve" viewBox="0 0 ${B} ${H}" role="img" aria-label="${punkte.length} Einheiten, zuletzt ${zahl(l.y)} ${einheit} am ${datumKurz(l.datum)}">${teile.join("")}</svg>`;
}

const URTEIL = { steigt: "Steigt", haelt: "Stagniert", faellt: "Schwächer", offen: "Noch offen" };

const satzText = (p) => (p.kg > 0 ? `${zahl(p.kg)} kg × ${p.wdh}` : `${p.wdh} Wdh.`);

/**
 * Der ganze Abschnitt. Ohne Eintrag ein Satz, wann hier etwas steht, statt
 * einer leeren Fläche.
 */
export function fortschrittHtml(log, uebung, heute) {
  const { punkte, einheit } = kurvenPunkte(log, uebung, heute);
  if (!punkte.length) {
    return `<div class="uf"><p class="uf-leer">Noch kein Satz gespeichert. Nach dem ersten Training mit dieser Übung steht hier, wie du dich entwickelst.</p></div>`;
  }
  const trend = uebungsTrend(log, uebung, heute);
  const letzter = punkte[punkte.length - 1];
  const erster = punkte[0];
  const diff = letzter.y - erster.y;
  const strecke = punkte.length < 2 ? `am ${datumKurz(letzter.datum)}`
    : diff === 0 ? `gleich wie am ${datumKurz(erster.datum)}`
    : `${diff > 0 ? "plus" : "minus"} ${zahl(Math.abs(diff))} ${einheit} seit ${datumKurz(erster.datum)}`;
  const liste = punkte.slice(-5).reverse()
    .map((p) => `<li><span>${datumKurz(p.datum)}</span><b>${esc(satzText(p))}</b></li>`).join("");
  return `<div class="uf">`
    + `<div class="uf-kopf"><div><p class="uf-wert">${esc(satzText(letzter))}</p><p class="uf-strecke">${esc(strecke)}</p></div>`
    + `<span class="uf-urteil ${trend.art}">${URTEIL[trend.art]}</span></div>`
    + uebungsKurve(punkte, einheit)
    + `<p class="uf-text">${esc(trend.text)}</p>`
    + `<p class="uf-fuss">Die Kurve zeigt das schwerste Gewicht je Einheit. Das Urteil rechnet mit Gewicht und Wiederholungen der letzten acht Wochen, als geschätzte Maximalkraft.</p>`
    + `<ul class="uf-liste">${liste}</ul></div>`;
}

/** Kurz für eine Zeile im Plan: Pfeil und Prozent, "" ohne Urteil. */
export function trendKurz(log, uebung, heute) {
  const t = uebungsTrend(log, uebung, heute);
  if (t.art === "offen") return "";
  const zeichen = t.art === "steigt" ? "↑" : t.art === "faellt" ? "↓" : "→";
  return `<span class="uf-mini ${t.art}" title="${URTEIL[t.art]}">${zeichen} ${t.prozent > 0 ? "+" : ""}${zahl(t.prozent)} %</span>`;
}
