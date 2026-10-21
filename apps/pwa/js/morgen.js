/**
 * Der Guten Morgen Check-in in der App. Gerechnet wird in
 * `packages/core/src/morgencheck.ts`, hier wird gelesen, gespeichert und
 * gezeigt.
 *
 * Er kommt eine halbe Stunde nach der Aufstehzeit des Tages. In der iPhone
 * App als Mitteilung, siehe `mitteilungen.js`. In der Web App öffnet er sich
 * beim ersten Öffnen nach dieser Zeit von selbst, einmal am Tag und nur bis
 * mittags: um 15 Uhr nach dem Aufwachen zu fragen, ist keine Erinnerung,
 * sondern ein Formular.
 *
 * Gespeichert wird als Check-in der Art "morning", mit Schlaf und Energie auf
 * der Skala 1 bis 10. So rechnen Bereitschaft, Bericht und Muster weiter mit
 * den Feldern, die sie schon kennen.
 *
 * Bis `morgenStarten` fasst das Modul weder `document` noch `window` an.
 */
import { MORGEN_FRAGEN, BELASTBARKEIT_NAME, morgenAuswerten, morgenUhrzeit, morgenVollstaendig, tagesrandFuer } from "@daevo/core";
import { newId, nowTime } from "./storage.js";

/** Bis zu dieser Uhrzeit öffnet sich der Check-in von selbst. */
export const MORGEN_BIS = "12:00";

const esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const min = (u) => { const [h, m] = String(u).split(":").map(Number); return h * 60 + m; };

/** Der Morgen Check-in von heute, wenn es ihn schon gibt. */
export function morgenVonHeute(store, tag) {
  return (store.getDay(tag).checkins || []).filter((c) => c.kind === "morning" && c.morgen).pop() ?? null;
}

/**
 * Was heute im Wochenplan steht, mit dem Titel der Einheit aus dem
 * gespeicherten Plan. Dieselbe Zuordnung wie bei `trainingsplanAbrufen`:
 * die Krafttage der Woche der Reihe nach, Montag zuerst, A, B, C im Wechsel.
 */
export function trainingHeute(store, tag) {
  const wochentag = new Date(`${tag}T12:00:00`).getDay();
  const sessions = store.getProfile()?.sessions || [];
  const plan = store.getSettings().plan;
  const kraft = sessions.filter((s) => s.type === "strength").sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
  return sessions
    .filter((s) => s.weekday === wochentag)
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))
    .map((s) => {
      let titel;
      if (s.type === "strength" && plan?.einheiten?.length) {
        const i = Math.max(0, kraft.findIndex((k) => k.weekday === wochentag));
        titel = plan.einheiten[i % plan.einheiten.length]?.titel;
      }
      return { art: s.type, minuten: s.minutes, uhrzeit: s.startsAt, titel };
    });
}

/**
 * Ob der Check-in sich jetzt von selbst öffnen soll. Fünf Bedingungen, und
 * jede verhindert ihn: kein Profil, heute schon gemacht, heute schon
 * angeboten, zu früh, zu spät.
 */
export function morgenFaellig(store, jetzt) {
  const profil = store.getProfile();
  if (!profil) return false;
  if (morgenVonHeute(store, jetzt.tag)) return false;
  if (store.getSettings().morgenAngeboten === jetzt.tag) return false;
  const ab = morgenUhrzeit(tagesrandFuer(profil, jetzt.tag).wakeTime);
  return min(jetzt.uhrzeit) >= min(ab) && min(jetzt.uhrzeit) < min(MORGEN_BIS);
}

export function morgenErgebnis(store, tag, antworten) {
  const profil = store.getProfile();
  const gesundheit = store.getDay(tag).gesundheit;
  return morgenAuswerten({
    antworten,
    schlafMinuten: Number.isFinite(Number(gesundheit?.schlafMinuten)) && gesundheit?.schlafMinuten !== null ? Number(gesundheit.schlafMinuten) : null,
    schlafenszeit: profil ? tagesrandFuer(profil, tag).sleepTime : null,
    training: trainingHeute(store, tag),
  });
}

/** Speichert. Ein zweiter Check-in am selben Morgen ersetzt den ersten: wer nochmal antwortet, hat sich korrigiert. */
export function morgenSpeichern(store, tag, antworten) {
  if (!morgenVollstaendig(antworten)) return null;
  const r = morgenErgebnis(store, tag, antworten);
  const tagDaten = store.getDay(tag);
  tagDaten.checkins = (tagDaten.checkins || []).filter((c) => !(c.kind === "morning" && c.morgen));
  tagDaten.checkins.push({
    id: newId(), kind: "morning", at: nowTime(), note: "Guten Morgen Check-in",
    energy: r.alsZehner.energy, sleepQuality: r.alsZehner.sleepQuality, mood: null,
    morgen: { ...antworten }, morgenWert: r.wert, belastbarkeit: r.belastbarkeit,
  });
  store.setDay(tag, tagDaten);
  return r;
}

/* ---------- Darstellung ---------- */

export function fragenHtml(antworten = {}) {
  return MORGEN_FRAGEN.map((f) => `<fieldset class="mg-frage"><legend>${esc(f.frage)}</legend>
      <div class="mg-skala" role="radiogroup">${[1, 2, 3, 4, 5].map((v) =>
        `<button type="button" role="radio" aria-checked="${antworten[f.id] === v}" class="mg-punkt${antworten[f.id] === v ? " an" : ""}" data-mg-frage="${f.id}" data-mg-wert="${v}">${v}</button>`).join("")}</div>
      <div class="mg-enden"><span>${esc(f.links)}</span><span>${esc(f.rechts)}</span></div></fieldset>`).join("");
}

export function ergebnisHtml(r) {
  const liste = (zeilen) => `<ul class="mg-liste">${zeilen.map((z) => `<li>${esc(z)}</li>`).join("")}</ul>`;
  return `<div class="mg-ergebnis">
      <div class="mg-wert mg-${r.belastbarkeit}"><b>${r.wert}</b><span>von 100</span></div>
      <p class="mg-stufe">Belastbarkeit heute: <b>${esc(BELASTBARKEIT_NAME[r.belastbarkeit])}</b></p>
      <p class="mg-warum">${esc(r.warum)}</p>
      <h3 class="mg-titel">Training</h3>${liste(r.training)}
      ${r.tipps.length ? `<h3 class="mg-titel">Für heute</h3>${liste(r.tipps)}` : ""}
      <p class="mg-grenze">Das ist keine Messung, sondern deine eigene Einschätzung, zusammengefasst.</p>
    </div>`;
}

/* ---------- Oberfläche ---------- */

export function morgenStarten({ store, heute, melde, gespeichert }) {
  const blatt = document.getElementById("morgenBlatt");
  const inhalt = document.getElementById("morgenInhalt");
  const knopf = document.getElementById("morgenAuswerten");
  let antworten = {};
  let fertig = false;

  const zeichnen = () => {
    if (fertig) return;
    inhalt.innerHTML = fragenHtml(antworten);
    knopf.disabled = !morgenVollstaendig(antworten);
    knopf.textContent = "Auswerten";
  };
  const oeffnen = () => {
    const alt = morgenVonHeute(store, heute());
    antworten = alt ? { ...alt.morgen } : {};
    fertig = false;
    zeichnen();
    blatt.hidden = false;
    document.body.classList.add("blatt-offen");
  };
  const schliessen = () => { blatt.hidden = true; document.body.classList.remove("blatt-offen"); };

  inhalt.addEventListener("click", (event) => {
    const p = event.target.closest("[data-mg-frage]");
    if (!p) return;
    antworten = { ...antworten, [p.dataset.mgFrage]: Number(p.dataset.mgWert) };
    zeichnen();
  });
  knopf.addEventListener("click", () => {
    if (fertig) { schliessen(); return; }
    const r = morgenSpeichern(store, heute(), antworten);
    if (!r) return;
    fertig = true;
    inhalt.innerHTML = ergebnisHtml(r);
    inhalt.scrollTop = 0;
    knopf.textContent = "Fertig";
    knopf.disabled = false;
    // Keine Meldung: das Ergebnis selbst zeigt, dass gespeichert ist, und
    // eine Meldung läge über dem letzten Satz.
    gespeichert?.(r);
  });
  document.getElementById("morgenZu").addEventListener("click", schliessen);

  return {
    oeffnen,
    /** Öffnet von selbst, wenn es Zeit ist, und merkt sich, dass gefragt wurde. */
    vielleicht(jetzt) {
      if (!morgenFaellig(store, jetzt)) return false;
      store.setSettings({ ...store.getSettings(), morgenAngeboten: jetzt.tag });
      oeffnen();
      return true;
    },
  };
}
