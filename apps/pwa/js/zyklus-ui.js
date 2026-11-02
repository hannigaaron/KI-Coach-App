/**
 * Die Zyklusseite. Gerechnet wird in `packages/core/src/zyklus.ts`, hier wird
 * nur gezeichnet und gespeichert. Der Aufbau ist der Entwurf, den der Nutzer
 * ausgesucht hat: der Ring mit Tag und Phase, darunter die Vorhersage, ein
 * Knopf, die Symptome des Tages, die Karte von daevo, die letzten Zyklen.
 *
 * Die Daten liegen in `settings.zyklus` und damit nur auf dem Gerät und in
 * der Sicherung. Zyklusdaten sind Gesundheitsdaten.
 */
import {
  PHASE_NAME, SYMPTOME, SYMPTOM_NAME, periodeBeendet, periodeBeenden, periodeBeginnen, symptomUmschalten,
  vorhersageText, zyklusEmpfehlung, zyklusStand,
} from "@daevo/core";
import { store, todayIso } from "./storage.js";

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);

/** "16. Nov." statt einer Datenbankzeile. */
export const datumText = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "short" }).replace(" ", "\u00a0");

const FARBE = { periode: "var(--zy-periode)", follikel: "var(--zy-follikel)", eisprung: "var(--zy-eisprung)", luteal: "var(--zy-luteal)" };

export function zyklusDaten() {
  return store.getSettings().zyklus || {};
}

function speichern(daten) {
  store.setSettings({ ...store.getSettings(), zyklus: daten });
}

/** Ob die Zeile im Menü steht: bei Frauen immer, sonst nur, wenn eingeschaltet. */
export function zyklusSichtbar(profil, settings) {
  return profil?.sex === "female" || Boolean(settings?.zyklus?.an);
}

/** Bogen auf dem Ring, 0 Grad oben, im Uhrzeigersinn. */
function bogen(r, von, bis) {
  const punkt = (g) => {
    const t = ((g - 90) * Math.PI) / 180;
    return [130 + r * Math.cos(t), 130 + r * Math.sin(t)];
  };
  const [x0, y0] = punkt(von);
  const [x1, y1] = punkt(bis);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${bis - von > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

function ringSvg(stand) {
  const L = Math.max(stand.laenge, stand.tag);
  const eis = Math.max(stand.periodenDauer + 2, stand.laenge - 14);
  const teile = stand.hormonell
    ? [[1, stand.periodenDauer, "periode"], [stand.periodenDauer + 1, L, "luteal"]]
    : [[1, stand.periodenDauer, "periode"], [stand.periodenDauer + 1, eis - 2, "follikel"], [eis - 1, eis + 1, "eisprung"], [eis + 2, L, "luteal"]];
  const r = 108;
  const pfade = teile
    .filter(([a, b]) => b >= a)
    .map(([a, b, p]) => {
      const farbe = stand.hormonell && p === "luteal" ? "var(--zy-ruhe)" : FARBE[p];
      return `<path d="${bogen(r, ((a - 1) / L) * 360 + 1.6, (b / L) * 360 - 1.6)}" stroke="${farbe}" stroke-width="14" fill="none" stroke-linecap="round"/>`;
    })
    .join("");
  const g = ((Math.min(stand.tag, L) - 0.5) / L) * 360;
  const t = ((g - 90) * Math.PI) / 180;
  const marke = `<circle cx="${(130 + r * Math.cos(t)).toFixed(1)}" cy="${(130 + r * Math.sin(t)).toFixed(1)}" r="12" fill="var(--bg)" stroke="var(--text)" stroke-width="3"/>`;
  return `<svg viewBox="0 0 260 260" width="260" height="260" aria-hidden="true">${pfade}${marke}</svg>`;
}

function chip(text, an, attr) {
  return `<button type="button" class="zy-chip${an ? " an" : ""}" ${attr} aria-pressed="${an ? "true" : "false"}">${esc(text)}</button>`;
}

function einrichtenHtml() {
  return `<div class="zy-start">
    <p class="sub">Trag ein, wann deine letzte Periode begonnen hat. daevo zeigt dir dann, wo du im Zyklus stehst, und passt das Training an deine Beschwerden an.</p>
    <label class="field"><span>Erster Tag der letzten Periode</span><input type="date" id="zyStartDatum" value="${todayIso()}" max="${todayIso()}"></label>
    <fieldset class="zy-verh"><legend>Verhütest du hormonell, etwa mit Pille, Hormonspirale oder Ring?</legend>
      ${chip("Nein", true, 'data-zy-verh="keine"')}${chip("Ja", false, 'data-zy-verh="hormonell"')}
    </fieldset>
    <button type="button" class="primary breit" data-zy-aktion="start">Zyklus starten</button>
    <p class="fineprint">Deine Zyklusdaten bleiben auf deinem Gerät. Eine Vorhersage aus deinen Einträgen, keine Messung, nicht zur Verhütung geeignet.</p>
  </div>`;
}

export function zyklusAnsicht({ wurzel, toast = () => {}, beiAenderung = () => {} }) {
  let startVerh = "keine";
  let datumOffen = false;

  function zeichnen() {
    const d = zyklusDaten();
    const heute = todayIso();
    if (!d.an || !(d.perioden || []).length) {
      wurzel.innerHTML = einrichtenHtml();
      for (const k of wurzel.querySelectorAll("[data-zy-verh]")) k.classList.toggle("an", k.dataset.zyVerh === startVerh);
      return;
    }
    const stand = zyklusStand(d, heute);
    const sym = d.symptome?.[heute] || [];
    const blutung = d.blutung?.[heute];
    const e = zyklusEmpfehlung(stand, sym, blutung);
    const letzte = (d.perioden || []).slice().sort((a, b) => a.beginn.localeCompare(b.beginn)).at(-1);
    const inPeriode = stand.tag <= stand.periodenDauer + 3 && !periodeBeendet(letzte, heute);
    const phase = stand.phase ? PHASE_NAME[stand.phase] : "Zyklus";
    const legende = stand.hormonell
      ? `<span><i style="background:var(--zy-periode)"></i>Periode</span>`
      : ["periode", "follikel", "eisprung", "luteal"].map((p) => `<span><i style="background:${FARBE[p]}"></i>${p === "eisprung" ? "Eisprung" : p === "periode" ? "Periode" : p === "follikel" ? "Follikel" : "Luteal"}</span>`).join("");

    wurzel.innerHTML = `
      <div class="zy-ring">${ringSvg(stand)}
        <div class="zy-mitte"><div class="zy-tag">Tag ${stand.tag}</div>
          <div class="zy-phase" data-phase="${stand.phase || ""}">${esc(phase)}</div>
          <div class="zy-vor">${esc(vorhersageText(stand, datumText))}</div></div>
      </div>
      <div class="zy-legende">${legende}</div>
      <button type="button" class="primary breit" data-zy-aktion="${inPeriode ? "ende" : "beginn"}">${inPeriode ? "Periode ist vorbei" : "Periode hat begonnen"}</button>
      <button type="button" class="zy-leise" data-zy-aktion="datum">${datumOffen ? "Doch heute" : "An einem anderen Tag"}</button>
      ${datumOffen ? `<label class="field zy-datum"><span>${inPeriode ? "Letzter Tag" : "Erster Tag"}</span><input type="date" id="zyDatum" value="${heute}" max="${heute}"></label>` : ""}
      ${inPeriode ? `<h2 class="section-title">Blutung heute</h2><div class="zy-chips">${["leicht", "mittel", "stark"].map((b) => chip(b[0].toUpperCase() + b.slice(1), blutung === b, `data-zy-blutung="${b}"`)).join("")}</div>` : ""}
      <h2 class="section-title">Wie geht's dir heute</h2>
      <div class="zy-chips">${SYMPTOME.map((s) => chip(SYMPTOM_NAME[s], sym.includes(s), `data-zy-symptom="${s}"`)).join("")}${chip("Nichts davon", d.symptome?.[heute] && !sym.length, 'data-zy-symptom="keine"')}</div>
      <div class="zy-karte"><b>daevo für heute</b>
        <p>${esc(e.training)}</p>${e.essen ? `<p>${esc(e.essen)}</p>` : ""}${e.hinweis ? `<p class="zy-warn">${esc(e.hinweis)}</p>` : ""}
        <small>${esc(e.quelle)}</small></div>
      <h2 class="section-title">Deine letzten Zyklen</h2>
      <div class="zy-zeile"><span>Länge</span><span>${stand.laengen.length ? `${stand.laengen.join(", ")} Tage` : "noch kein ganzer Zyklus"}</span></div>
      <div class="zy-zeile"><span>Periode</span><span>im Schnitt ${stand.periodenDauer} Tage</span></div>
      <div class="zy-zeile"><span>Hormonelle Verhütung</span><span>${chip("Nein", !stand.hormonell, 'data-zy-verh-wechsel="keine"')}${chip("Ja", stand.hormonell, 'data-zy-verh-wechsel="hormonell"')}</span></div>
      <p class="fineprint">Eine Vorhersage aus deinen Einträgen, keine Messung. Den Eisprung bestimmt nur ein Test. Nicht zur Verhütung geeignet. Nach Phase zu trainieren ist wissenschaftlich nicht belegt (McNulty 2020, Colenso-Semple 2023), deshalb richtet sich daevo nach deinen Beschwerden.</p>
      <button type="button" class="ghost breit zy-aus" data-zy-aktion="aus">Zyklus ausschalten</button>`;
  }

  wurzel.addEventListener("click", (event) => {
    const z = event.target.closest("button");
    if (!z) return;
    const heute = todayIso();
    let d = zyklusDaten();
    if (z.dataset.zyVerh) { startVerh = z.dataset.zyVerh; zeichnen(); return; }
    if (z.dataset.zyVerhWechsel) { speichern({ ...d, verhuetung: z.dataset.zyVerhWechsel }); zeichnen(); beiAenderung(); return; }
    if (z.dataset.zySymptom) { speichern(symptomUmschalten(d, heute, z.dataset.zySymptom)); zeichnen(); beiAenderung(); return; }
    if (z.dataset.zyBlutung) {
      const blutung = { ...(d.blutung || {}) };
      if (blutung[heute] === z.dataset.zyBlutung) delete blutung[heute]; else blutung[heute] = z.dataset.zyBlutung;
      speichern({ ...d, blutung }); zeichnen(); beiAenderung(); return;
    }
    const aktion = z.dataset.zyAktion;
    if (!aktion) return;
    const tag = wurzel.querySelector("#zyDatum")?.value || heute;
    if (aktion === "start") {
      const start = wurzel.querySelector("#zyStartDatum")?.value || heute;
      speichern({ ...periodeBeginnen({ ...d, verhuetung: startVerh }, start), an: true });
      toast("Zyklus eingeschaltet");
    } else if (aktion === "beginn") {
      speichern(periodeBeginnen(d, tag)); datumOffen = false; toast("Periode eingetragen");
    } else if (aktion === "ende") {
      speichern(periodeBeenden(d, tag)); datumOffen = false; toast("Ende eingetragen");
    } else if (aktion === "datum") {
      datumOffen = !datumOffen;
    } else if (aktion === "aus") {
      if (!confirm("Zyklus ausschalten? Deine Einträge bleiben gespeichert.")) return;
      speichern({ ...d, an: false });
    }
    zeichnen();
    beiAenderung();
  });

  return { zeichnen };
}
