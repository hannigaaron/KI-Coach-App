/**
 * Die Kalenderseite als eine Zeitleiste: oben sieben Tage zum Antippen,
 * darunter der gewählte Tag mit Terminen, Essen, Aufgaben und Training in
 * der Reihenfolge der Uhr.
 *
 * Vorher standen dort dieselben Dinge viermal: das sortierte Briefing, die
 * Termine, die Mahlzeiten und der Tag im Detail mit einem Datumsfeld. Wer
 * wissen will, was um zwei ist, liest eine Leiste und nicht vier Listen. Die
 * Sortierung nach Stufen bleibt im Briefing, im Chat und im Morgen Check-in.
 *
 * Fasst weder `document` noch `window` an, getestet in
 * `kalender-zeitleiste.test.js`.
 */
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const plus = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

/** Sieben Tage ab heute als Knöpfe, der gewählte ist hervorgehoben. */
export function tageLeisteHtml(heute, gewaehlt, anzahl = 7) {
  return Array.from({ length: anzahl }, (_, i) => {
    const tag = plus(heute, i);
    const d = new Date(`${tag}T12:00:00`);
    const an = tag === gewaehlt;
    return `<button type="button" class="kz-tag${an ? " an" : ""}" data-kal-tag="${tag}" aria-pressed="${an}" aria-label="${d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}">`
      + `<small>${WT[d.getDay()]}</small><b>${d.getDate()}</b></button>`;
  }).join("");
}

const ART = { termin: "Termin", essen: "Essen", aufgabe: "Aufgabe", training: "Training" };

/**
 * Die Leiste. `punkte` aus `briefingPunkte`, `jetzt` die Stelle des
 * nächsten Punkts oder -1, `uhr` macht aus Millisekunden "14:00",
 * `tausch` baut den Knopf zum Austauschen eines Essens. Der Feierabend
 * steht nicht als Karte da: er ist eine Grenze und kein Termin.
 */
export function zeitleisteHtml(punkte, { jetzt = -1, uhr, tausch = () => "" } = {}) {
  const liste = punkte.map((p, i) => ({ p, i })).filter(({ p }) => p.art !== "feierabend");
  if (!liste.length) return `<p class="kz-leer">Nichts eingetragen. Ein freier Tag, oder der Kalender ist nicht verbunden.</p>`;
  return `<ol class="kz-leiste">${liste.map(({ p, i }) => {
    const zeit = p.um === null || p.um === undefined ? "offen" : uhr(p.um);
    const bild = p.art === "essen" && p.foto && p.rezeptId
      ? `<img class="kz-bild" src="img/rezepte/${encodeURIComponent(p.rezeptId)}.jpg" alt="" loading="lazy" width="56" height="56">` : "";
    const haken = p.art === "aufgabe" && p.id
      ? `<button type="button" class="kz-haken" data-erledigt="${esc(p.id)}" aria-label="Erledigt: ${esc(p.titel)}"></button>` : "";
    let unter = p.unter ?? "";
    if (p.art === "essen") unter = unter.split(", ").slice(1, 3).join(" · ");
    if (p.art === "termin") unter = unter.replace(/^Termin /, "");
    if (p.art === "aufgabe") unter = unter.replace(/^Aufgabe, ?/, "").replace(/^Aufgabe$/, "");
    const rezept = p.art === "essen" && p.rezeptId ? ` data-rezept="${esc(p.rezeptId)}" role="button" tabindex="0"` : "";
    return `<li class="kz-punkt kz-${p.art}${i === jetzt ? " jetzt" : ""}">`
      + `<time>${esc(zeit)}</time><span class="kz-dot" aria-hidden="true"></span>`
      + `<div class="kz-karte"${rezept}>${haken}${bild}`
      // Austauschen sitzt als kleines Zeichen hinter den Kalorien, wie im
      // Entwurf: ein beschrifteter Knopf je Essen war grösser als das Gericht.
      + `<div class="kz-text"><b>${esc(p.titel)}</b>${unter || p.art === "essen" ? `<small>${esc(unter)}${p.art === "essen" ? tausch(p, zeit) : ""}</small>` : ""}</div>`
      + `<span class="kz-art">${ART[p.art] ?? ""}</span></div></li>`;
  }).join("")}</ol>`;
}

/** "5 h verplant · frei 15:45 bis 22:45" aus dem Tagesablauf. */
export function tagZeile(a, { uhr, dauer }) {
  const teile = [];
  if (a.belegtMinuten > 0) teile.push(`${dauer(a.belegtMinuten)} verplant`);
  if (a.fokusblock) teile.push(`frei ${uhr(a.fokusblock.von)} bis ${uhr(a.fokusblock.bis)}`);
  const ganz = [...(a.geburtstage ?? []).map((n) => `${n} hat Geburtstag`), ...(a.ganztags ?? []).map((t) => t.titel)];
  if (ganz.length) teile.push(ganz.join(", "));
  return teile.join(" · ") || "Nichts verplant";
}
