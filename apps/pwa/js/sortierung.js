// Die sortierte Übersicht: daevo legt jeden Punkt des Tages in seine Stufe.
//
// Dieselbe Darstellung steht im Briefing, im Morgen Check-in und unter der
// Antwort im Chat. Gerechnet wird im Kern (`reihenfolgeBauen`), hier wird nur
// gezeichnet. Die Punkte fliegen beim ersten Zeigen der Reihe nach in ihre
// Gruppe, wie auf der Website bei "daevo sortiert": wer sieht, dass sortiert
// wird, glaubt der Reihenfolge eher. Danach steht sie ruhig da, sonst wird
// aus der Bewegung bei jedem Zeichnen ein Flackern.

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const uhr = (ms) => (ms === null || ms === undefined ? "" : new Date(ms).toTimeString().slice(0, 5));
const ART = { aufgabe: "Aufgabe", termin: "Termin", essen: "Essen", training: "Training" };

// Welche Reihe schon geflogen ist, je Fenster der App. Nur im Speicher: nach
// einem Neustart darf es wieder fliegen, das ist der erste Blick am Tag.
const gesehen = new Set();

export function sortiertSignatur(gruppen) {
  return (gruppen || []).map((g) => `${g.id}:${g.punkte.map((p) => p.titel).join("|")}`).join("/");
}

/**
 * @param {Array} gruppen aus `tagesbriefing().reihenfolge`
 * @param {{ schluessel?: string, mitHaken?: boolean }} opt
 */
export function sortiertHtml(gruppen, opt = {}) {
  if (!gruppen?.length) return "";
  const neu = !gesehen.has(`${opt.schluessel || "x"}|${sortiertSignatur(gruppen)}`);
  let nr = 0;
  const haken = (p) => (opt.mitHaken && p.art === "aufgabe" && p.id
    ? `<button type="button" class="so-haken" data-erledigt="${esc(p.id)}" aria-label="Erledigt: ${esc(p.titel)}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`
    : "");
  const gruppe = (g, gi) => {
    const punkte = g.punkte.map((p, i) => {
      const verz = (nr++ * 0.09 + 0.25).toFixed(2);
      // Jeder Punkt kommt von links oben, wie der Gedanke in der Schublade.
      const dx = ((i % 3) - 1) * 18;
      const zeit = uhr(p.um);
      return `<li class="so-punkt so-${esc(p.art)}${g.id === "zuerst" && i === 0 ? " so-erster" : ""}"${p.art === "essen" && p.rezeptId ? ` data-rezept="${esc(p.rezeptId)}" role="button" tabindex="0"` : ""} style="--d:${verz}s;--dx:${dx}px">`
        + `<span class="so-zeit">${esc(zeit)}</span>`
        + `<span class="so-was"><b>${esc(p.titel)}</b><small>${esc(p.unter || ART[p.art] || "")}</small></span>${haken(p)}</li>`;
    }).join("");
    const marke = g.nr ? `<span class="so-nr">${g.nr}</span>` : `<span class="so-nr so-ohne" aria-hidden="true"></span>`;
    return `<section class="so-gruppe so-g-${esc(g.id)}" style="--gi:${gi}">`
      + `<header class="so-kopf">${marke}<div><h3>${esc(g.titel)}</h3><p>${esc(g.unter)}</p></div></header>`
      + `<ol class="so-liste">${punkte}</ol></section>`;
  };
  return `<div class="so${neu ? " so-neu" : ""}" data-so="${esc(opt.schluessel || "x")}" data-so-sig="${esc(sortiertSignatur(gruppen))}">`
    + `<p class="so-titel"><span class="so-puls" aria-hidden="true"></span>daevo hat deinen Tag sortiert</p>`
    + (opt.hinweis ? `<p class="so-muster">${esc(opt.hinweis)}</p>` : "")
    + gruppen.map(gruppe).join("") + `</div>`;
}

/** Merkt die Reihe als gezeigt. Nach dem Einfügen in die Seite aufrufen. */
export function sortiertGezeigt(wurzel) {
  for (const el of wurzel.querySelectorAll?.(".so.so-neu") || []) {
    gesehen.add(`${el.dataset.so}|${el.dataset.soSig}`);
  }
}
