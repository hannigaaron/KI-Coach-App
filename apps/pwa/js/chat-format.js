/**
 * Aufzählungen im Chat als Tabelle.
 *
 * Eine Antwort mit acht Zeilen, die alle mit einem Strich beginnen, liest sich
 * als Textwand: die Punkte sind da, aber nichts trennt sie. Der Nutzer hat das
 * am Trainingsplan gesehen und will jede Aufzählung als Übersicht, wie er sie
 * von Claude kennt.
 *
 * Erkannt werden drei Formen, und jede kommt so auch aus Regelweg und Modell:
 * - Zeilen mit Strich oder Nummer vorn. Steht in den meisten "Name: Detail",
 *   wird daraus eine Tabelle mit zwei Spalten, sonst eine Liste mit Linien.
 * - Übungszeilen "Name: 3 x 6-10, 2 in Reserve" werden eine Tabelle mit
 *   Übung, Sätze, Wiederholungen und RIR. Ein Zusatz wie die Steigerung steht
 *   klein unter dem Namen.
 * - Tabellen mit senkrechten Strichen, erste Zeile die Spaltennamen.
 *
 * Alles andere bleibt Absatz. Kein Markdown sonst: ein Sternchen bleibt ein
 * Sternchen. Ohne `document`, damit es ohne Browser testbar bleibt.
 */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// Das Modell schreibt Hervorhebungen manchmal als **so**. Roh dastehende
// Sternchen sehen aus wie ein Fehler der App, also wird daraus Fettdruck,
// und was übrig bleibt, fällt weg.
const fett = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*\*/g, "");

const LISTE = /^\s*(?:[-•–*]|\d{1,2}[.)])\s+(.*)$/;
const TABELLE = /^\s*\|.*\|\s*$/;
const TRENNER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const UEBUNG = /^(\d+)\s*x\s*([\d–-]+(?:\s*(?:s|sek|min))?),\s*(\d+)\s*in Reserve(?:\.\s*(.*))?$/i;

/** Teilt "Name: Detail" am ersten Doppelpunkt, nicht an einer Uhrzeit. */
function paar(zeile) {
  const m = /^(.{1,60}?):\s+(.+)$/.exec(zeile);
  if (!m || /\d$/.test(m[1])) return null;
  return { name: m[1].trim(), wert: m[2].trim() };
}

function tabelleAusPipes(zeilen) {
  const zellen = (z) => z.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  const reihen = zeilen.filter((z) => !TRENNER.test(z)).map(zellen);
  const [kopf, ...rest] = reihen;
  if (!kopf) return "";
  return `<table class="ct"><thead><tr>${kopf.map((k) => `<th>${fett(k)}</th>`).join("")}</tr></thead>` +
    `<tbody>${rest.map((r) => `<tr>${kopf.map((_, i) => `<td>${fett(r[i] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function listeHtml(punkte) {
  const paare = punkte.map(paar);
  const uebungen = paare.map((p) => (p ? UEBUNG.exec(p.wert) : null));
  if (punkte.length >= 2 && uebungen.filter(Boolean).length >= Math.ceil(punkte.length * 0.6)) {
    const zeilen = punkte.map((roh, i) => {
      const p = paare[i];
      const u = uebungen[i];
      if (!p || !u) return `<tr><td colspan="4">${fett(roh)}</td></tr>`;
      const zusatz = u[4] ? `<span class="ct-zusatz">${esc(u[4])}</span>` : "";
      return `<tr><td class="ct-name">${esc(p.name)}${zusatz}</td><td class="ct-zahl">${esc(u[1])}</td>` +
        `<td class="ct-zahl">${esc(u[2])}</td><td class="ct-zahl">${esc(u[3])}</td></tr>`;
    });
    return `<table class="ct ct-training"><thead><tr><th>Übung</th><th>Sätze</th><th>Wdh</th><th>RIR</th></tr></thead>` +
      `<tbody>${zeilen.join("")}</tbody></table>`;
  }
  if (punkte.length >= 2 && paare.filter(Boolean).length >= Math.ceil(punkte.length * 0.6)) {
    return `<table class="ct ct-paare"><tbody>${punkte.map((roh, i) => {
      const p = paare[i];
      return p
        ? `<tr><th scope="row">${fett(p.name)}</th><td>${fett(p.wert)}</td></tr>`
        : `<tr><td colspan="2">${fett(roh)}</td></tr>`;
    }).join("")}</tbody></table>`;
  }
  return `<ul class="cl">${punkte.map((p) => `<li>${fett(p)}</li>`).join("")}</ul>`;
}

/** Text einer Antwort als HTML, mit Aufzählungen als Tabelle. */
export function chatHtml(text) {
  const zeilen = String(text ?? "").split("\n");
  const teile = [];
  let absatz = [];
  const absatzFertig = () => {
    if (absatz.length) teile.push(`<p class="cp">${fett(absatz.join("\n"))}</p>`);
    absatz = [];
  };
  for (let i = 0; i < zeilen.length; ) {
    if (TABELLE.test(zeilen[i])) {
      absatzFertig();
      const block = [];
      while (i < zeilen.length && (TABELLE.test(zeilen[i]) || TRENNER.test(zeilen[i]))) block.push(zeilen[i++]);
      teile.push(tabelleAusPipes(block));
      continue;
    }
    if (LISTE.test(zeilen[i])) {
      const punkte = [];
      while (i < zeilen.length && LISTE.test(zeilen[i])) punkte.push(LISTE.exec(zeilen[i++])[1].trim());
      // Ein einzelner Strich ist kein Aufzählung, sondern ein Satz.
      if (punkte.length < 2) { absatz.push(`- ${punkte[0]}`); continue; }
      absatzFertig();
      teile.push(listeHtml(punkte));
      continue;
    }
    if (!zeilen[i].trim()) absatzFertig();
    else absatz.push(zeilen[i]);
    i++;
  }
  absatzFertig();
  return teile.join("");
}

/** Für die Sprachausgabe: Tabellenzeilen als Sätze, ohne Striche. */
export function chatSprechbar(text) {
  return String(text ?? "").split("\n")
    .filter((z) => !TRENNER.test(z))
    .map((z) => z.replace(/\*\*/g, ""))
    .map((z) => (TABELLE.test(z) ? z.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()).filter(Boolean).join(", ") + "." : z))
    .join("\n");
}
