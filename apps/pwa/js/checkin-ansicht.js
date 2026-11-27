/**
 * Die Seite Check-ins: zwei Kacheln für Morgen und Abend, die Energie der
 * Woche als Balken und das Tagebuch je Tag.
 *
 * Vorher stand dort je Check-in eine Karte, dreissig Karten für zwei
 * Wochen, und jede sagte nur "Energie 7". Ein Tag ist die Einheit, an die
 * man sich erinnert, deshalb steht je Tag eine Zeile mit kleinen Marken:
 * Morgenwert, Energie, Schlaf, Mittag. Wer mehr will, klappt den Tag auf.
 *
 * Fasst weder `document` noch `window` an, getestet in
 * `checkin-ansicht.test.js`.
 */
import { symbol } from "./symbole.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const da = (w) => w !== null && w !== undefined && Number.isFinite(Number(w));
const komma = (z) => String(Math.round(z * 10) / 10).replace(".", ",");

const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const plus = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const montag = (iso) => { const d = new Date(`${iso}T12:00:00`); return plus(iso, -((d.getDay() + 6) % 7)); };

/** Mittel der Energie eines Tages über alle Check-ins mit Energie, sonst null. */
export function tagesEnergie(checkins) {
  const w = (checkins ?? []).filter((c) => c.kind !== "herausforderung" && da(c.energy)).map((c) => Number(c.energy));
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
}

/**
 * Energie je Tag der laufenden Woche, Montag bis Sonntag, und der Schnitt
 * gegen die Woche davor. `checkinsVon(tag)` gibt die Check-ins eines Tages.
 * Tage ohne Wert zählen nicht in den Schnitt: ein Tag ohne Check-in ist
 * vergessen und keine Energie von null.
 */
export function wocheEnergie(heute, checkinsVon) {
  const mo = montag(heute);
  const tage = Array.from({ length: 7 }, (_, i) => {
    const tag = plus(mo, i);
    return { tag, kurz: WOCHENTAG[new Date(`${tag}T12:00:00`).getDay()], wert: tag > heute ? null : tagesEnergie(checkinsVon(tag)) };
  });
  const schnitt = (liste) => { const w = liste.filter(da); return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null; };
  const jetzt = schnitt(tage.map((t) => t.wert));
  const davor = schnitt(Array.from({ length: 7 }, (_, i) => tagesEnergie(checkinsVon(plus(mo, i - 7)))));
  return { tage, schnitt: jetzt, diff: da(jetzt) && da(davor) ? jetzt - davor : null };
}

/** Farbe eines Balkens: ab 8 grün, ab 6 Markenblau, darunter gelb. */
export const energieTon = (w) => (w >= 8 ? "var(--makro-protein)" : w >= 6 ? "var(--brand)" : "var(--warn)");

export function wocheHtml(w) {
  if (!da(w.schnitt)) return `<p class="ci-woche-leer">Noch kein Check-in diese Woche. Dein erster steht danach hier als Balken.</p>`;
  const diff = da(w.diff) && Math.abs(w.diff) >= 0.1
    ? `<span class="ci-diff ${w.diff > 0 ? "hoch" : "runter"}">${w.diff > 0 ? "↑" : "↓"} ${komma(Math.abs(w.diff))} zur Vorwoche</span>` : "";
  const saeulen = w.tage.map((t) => {
    const h = da(t.wert) ? Math.max(14, Math.round((t.wert / 10) * 100)) : 0;
    return `<li><span>${t.kurz}</span><i class="ci-saeule${h ? "" : " leer"}" style="${h ? `height:${h}%;background:${energieTon(t.wert)}` : ""}" title="${da(t.wert) ? `Energie ${komma(t.wert)}` : "kein Eintrag"}"></i></li>`;
  }).join("");
  return `<div class="ci-woche-kopf"><b>Energie im Schnitt ${komma(w.schnitt)}</b>${diff}</div><ol class="ci-saeulen">${saeulen}</ol>`;
}

const ART = (c) => (c.kind === "midday" ? "Mittags Check-in" : c.morgen ? "Guten Morgen Check-in" : c.kind === "evening" ? "Abend Check-in" : "Check-in");

/** Die Marken eines Tages: Morgenwert, Energie, Schlaf, Mittag. */
export function tagMarken(checkins) {
  const m = [];
  const morgen = checkins.find((c) => c.morgen && da(c.morgenWert));
  if (morgen) m.push({ sym: "sonne", text: `Morgen ${morgen.morgenWert}` });
  // Energie und Schlaf ohne den Mittags Check-in, der steht als eigene Marke.
  const tag = checkins.filter((c) => c.kind !== "midday");
  const e = tagesEnergie(tag);
  if (da(e)) m.push({ sym: "blitz", text: komma(e) });
  const schlaf = tag.find((c) => da(c.sleepQuality));
  if (schlaf) m.push({ sym: "mond", text: String(schlaf.sleepQuality) });
  const mittag = checkins.find((c) => c.kind === "midday" && da(c.energy));
  if (mittag) m.push({ sym: "uhr", text: `Mittag ${mittag.energy}` });
  return m;
}

/** Ein Satz unter den Marken: die eigene Notiz, sonst der Anfang der Antwort von daevo. */
export function tagSatz(checkins) {
  const notiz = checkins.map((c) => c.note).find((n) => n && n !== "Check-in ohne Notiz");
  if (notiz) return { art: "notiz", text: notiz.length > 70 ? `${notiz.slice(0, 68)}…` : notiz };
  const antwort = checkins.map((c) => c.antwort).find(Boolean);
  if (!antwort) return null;
  const erster = String(antwort).replace(/\*\*/g, "").split(/(?<=[.!?])\s/)[0].trim();
  return { art: "daevo", text: erster.length > 70 ? `${erster.slice(0, 68)}…` : erster };
}

/**
 * Das Tagebuch. `tage` ist [{ tag, checkins }] neueste zuerst. `antwortHtml`
 * setzt die Antwort von daevo, im Browser über `chatHtml`.
 */
export function tagebuchHtml(tage, antwortHtml = esc) {
  const mitEintrag = tage.filter((t) => t.checkins.length);
  if (!mitEintrag.length) return `<li class="ci-tag"><p class="sub" style="margin:0">Noch kein Check-in. Dein erster steht danach hier, mit der Antwort von daevo.</p></li>`;
  return mitEintrag.map(({ tag, checkins }) => {
    const d = new Date(`${tag}T12:00:00`);
    const marken = tagMarken(checkins).map((k) => `<span class="ci-marke">${symbol(k.sym, { groesse: 15, klasse: `sym ci-sym-${k.sym}` })}${esc(k.text)}</span>`).join("");
    const satz = tagSatz(checkins);
    const zeile = satz ? `<p class="ci-satz${satz.art === "daevo" ? " daevo" : ""}">${satz.art === "daevo" ? `daevo: ${esc(satz.text)}` : `„${esc(satz.text)}“`}</p>` : "";
    const einzeln = checkins.map((c) => {
      const werte = [["Energie", c.energy], ["Schlaf", c.sleepQuality], ["Stimmung", c.mood], ["Konzentration", c.concentration], ["Sättigung", c.satiety], ["Morgenwert", c.morgenWert]].filter(([, w]) => da(w));
      const notiz = c.note && c.note !== "Check-in ohne Notiz" ? c.note : "";
      const paare = [
        ...werte.map(([n, w]) => `<div class="wc-tb-paar"><dt>${esc(n)}</dt><dd>${esc(String(w))}${n === "Morgenwert" ? " von 100" : " von 10"}</dd></div>`),
        ...(notiz ? [`<div class="wc-tb-paar"><dt>Notiz</dt><dd>${esc(notiz)}</dd></div>`] : []),
      ].join("");
      const daevo = c.antwort ? `<div class="wc-tb-daevo"><p class="wc-tb-von">daevo</p><div class="msg-text">${antwortHtml(c.antwort)}</div></div>` : "";
      return `<section class="ci-einzeln"><h3>${esc(ART(c))}${c.at ? `, ${esc(c.at)}` : ""}</h3><dl>${paare}</dl>${daevo}</section>`;
    }).join("");
    return `<li class="ci-tag"><details><summary>`
      + `<span class="ci-datum"><small>${WOCHENTAG[d.getDay()]}</small><b>${d.getDate()}</b></span>`
      + `<span class="ci-inhalt"><span class="ci-marken">${marken || `<span class="ci-marke">${esc(ART(checkins[0]))}</span>`}</span>${zeile}</span>`
      + `</summary>${einzeln}</details></li>`;
  }).join("");
}

/** Die beiden Kacheln oben: Morgen offen oder mit Wert, Abend ab der Uhrzeit. */
export function kachelStand({ morgen, abendStart, jetzt }) {
  const m = morgen ? (morgen.gestrichen ? "Ruhetag" : da(morgen.wert) ? `erledigt, ${morgen.wert}` : "erledigt") : "offen";
  const a = abendStart ? (jetzt >= abendStart ? "jetzt" : `ab ${abendStart}`) : "";
  return { morgen: m, morgenOffen: !morgen, abend: a, abendJetzt: !!abendStart && jetzt >= abendStart };
}
