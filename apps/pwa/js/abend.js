/**
 * Die Abendroutine, das Blatt `#abendBlatt`, und der Schlaf der letzten
 * sieben Nächte für den Morgen. Gerechnet wird in
 * `packages/core/src/schlafplan.ts`.
 *
 * Abends, 90 Minuten vor der Schlafenszeit des Tages, kommt die Mitteilung,
 * siehe `mitteilungen.js`. Ein Tipp darauf öffnet dieses Blatt: der Ablauf
 * mit Uhrzeiten zum Abhaken und die Stunden bis zum Wecker. "Ich geh jetzt
 * schlafen" merkt sich die Uhrzeit. Ohne Apple Health ist das die einzige
 * Angabe, wann jemand wirklich ins Bett ging.
 *
 * Gespeichert in `settings.abend`, je Abend { erledigt, zuBett }, die
 * letzten 21 Abende.
 *
 * Bis `abendStarten` fasst das Modul weder `document` noch `window` an.
 */
import { abendplan, schlafDauer, schlafWoche, spaeterAls, stundenText } from "@daevo/core";
import { randMitKalender } from "./mitteilungen.js";
import { spueren } from "./haptik.js";

const esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const tagPlus = (tag, n) => {
  const d = new Date(`${tag}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const termineVon = (store) => store.getKalender?.().termine || [];

/** Der Ablauf eines Abends, mit derselben Schlafenszeit wie die Mitteilung. */
export function abendplanFuer(store, tag) {
  const profil = store.getProfile();
  if (!profil) return null;
  const termine = termineVon(store);
  const heute = randMitKalender(profil, tag, termine);
  const morgen = randMitKalender(profil, tagPlus(tag, 1), termine);
  return abendplan(heute.sleepTime, morgen.wakeTime);
}

export function abendStand(store, tag) {
  return store.getSettings().abend?.[tag] || { erledigt: [] };
}

function abendSetzen(store, tag, stand) {
  const s = store.getSettings();
  const alle = { ...(s.abend || {}), [tag]: stand };
  // Drei Wochen reichen für den Blick auf sieben Nächte, und jede Nacht
  // mehr liegt dauerhaft im Speicher.
  const behalten = Object.keys(alle).sort().slice(-21);
  store.setSettings({ ...s, abend: Object.fromEntries(behalten.map((k) => [k, alle[k]])) });
}

export function schrittUmschalten(store, tag, id) {
  const alt = abendStand(store, tag);
  const erledigt = alt.erledigt?.includes(id) ? alt.erledigt.filter((x) => x !== id) : [...(alt.erledigt || []), id];
  abendSetzen(store, tag, { ...alt, erledigt });
}

export function zuBettMerken(store, tag, uhrzeit) {
  abendSetzen(store, tag, { ...abendStand(store, tag), zuBett: uhrzeit });
}

/**
 * Die letzten sieben Nächte bis heute Morgen. Geplant ist Schlafenszeit des
 * Abends bis Aufstehzeit des Morgens danach. Tatsächlich kommt aus Apple
 * Health am Aufwachtag, sonst aus "Ich geh jetzt schlafen" bis zum Morgen
 * Check-in. Das zweite ist Zeit im Bett und kein gemessener Schlaf, und das
 * steht in der Ausgabe.
 */
export function schlafWocheFuer(store, heute) {
  const profil = store.getProfile();
  if (!profil) return null;
  const termine = termineVon(store);
  const naechte = [];
  for (let i = 7; i >= 1; i--) {
    const abend = tagPlus(heute, -i);
    const morgen = tagPlus(heute, -i + 1);
    const randAbend = randMitKalender(profil, abend, termine);
    const randMorgen = randMitKalender(profil, morgen, termine);
    const geplantMin = schlafDauer(randAbend.sleepTime, randMorgen.wakeTime);
    const stand = abendStand(store, abend);
    const health = store.getDay(morgen).gesundheit?.schlafMinuten;
    const morgenCheck = (store.getDay(morgen).checkins || []).find((c) => c.kind === "morning" && c.morgen);
    let tatsaechlichMin = null, quelle = null;
    if (health !== null && health !== undefined && Number(health) > 0) { tatsaechlichMin = Number(health); quelle = "health"; }
    else if (stand.zuBett && morgenCheck?.at) { tatsaechlichMin = schlafDauer(stand.zuBett, morgenCheck.at); quelle = "app"; }
    naechte.push({ tag: abend, geplantMin, tatsaechlichMin, quelle, spaeterMin: stand.zuBett ? spaeterAls(randAbend.sleepTime, stand.zuBett) : null });
  }
  return schlafWoche(naechte);
}

/* ---------- Darstellung ---------- */

const MOND = `<svg class="ab-mond" viewBox="0 0 100 100" aria-hidden="true"><path d="M62 8a42 42 0 1 0 30 62A36 36 0 0 1 62 8z"/></svg>`;
const HAKEN = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function abendHtml(plan, stand) {
  if (!plan) return `<p class="ab-leer">Trag im Profil deine Schlafens und Aufstehzeit ein, dann plant daevo deinen Abend.</p>`;
  const erledigt = new Set(stand.erledigt || []);
  return `<div class="ab-kopf">${MOND}
      <b class="ab-stunden">${esc(stundenText(plan.schlafMinuten))}</b>
      <span class="ab-unter">Schlaf bis zu deinem Wecker um ${esc(plan.wecker)}</span>
    </div>
    <ul class="ab-liste">${plan.schritte.map((s) => `<li>
        <button type="button" class="ab-schritt${erledigt.has(s.id) ? " an" : ""}" data-ab-schritt="${esc(s.id)}" aria-pressed="${erledigt.has(s.id)}">
          <span class="ab-text"><b>${esc(s.titel)}</b><small>${esc(s.text)}</small></span>
          <span class="ab-zeit">${esc(s.uhrzeit)}</span>
          <span class="ab-haken">${HAKEN}</span>
        </button></li>`).join("")}</ul>
    ${stand.zuBett ? `<p class="ab-bett">Ins Bett um ${esc(stand.zuBett)}. Gute Nacht.</p>` : ""}`;
}

/** Der Schlaf der letzten sieben Nächte, unter dem Morgen Check-in. */
export function schlafWocheHtml(w) {
  if (!w || !w.naechte.length) return "";
  const hoechst = Math.max(...w.naechte.map((n) => Math.max(n.geplantMin, n.tatsaechlichMin || 0)), 1);
  const wt = (tag) => ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][new Date(`${tag}T12:00:00`).getDay()];
  const balken = w.naechte.map((n) => `<div class="sw-nacht" title="${esc(wt(n.tag))}">
      <div class="sw-saeule"><i class="sw-plan" style="height:${Math.round(n.geplantMin / hoechst * 100)}%"></i>${n.tatsaechlichMin !== null ? `<i class="sw-ist" style="height:${Math.round(n.tatsaechlichMin / hoechst * 100)}%"></i>` : ""}</div>
      <small>${esc(wt(n.tag))}</small></div>`).join("");
  const nurApp = w.gemessen && w.naechte.every((n) => n.quelle !== "health");
  const diff = w.abweichung;
  return `<section class="sw">
      <h3 class="mg-titel">Dein Schlaf, letzte 7 Nächte</h3>
      <div class="sw-zahlen">
        <div><b>${esc(stundenText(w.geplantSchnitt))}</b><span>vorgenommen, im Schnitt</span></div>
        <div><b>${w.tatsaechlichSchnitt !== null ? esc(stundenText(w.tatsaechlichSchnitt)) : "keine Angabe"}</b><span>${nurApp ? "im Bett, aus der App" : "geschlafen"}${w.gemessen ? `, ${w.gemessen} von 7 Nächten` : ""}</span></div>
      </div>
      ${diff !== null ? `<p class="sw-diff${diff < -15 ? " minus" : ""}">${diff < 0 ? `${esc(stundenText(-diff))} weniger als geplant, je Nacht` : diff > 0 ? `${esc(stundenText(diff))} mehr als geplant, je Nacht` : "Genau wie geplant"}</p>` : ""}
      <div class="sw-balken" aria-hidden="true">${balken}</div>
      <p class="sw-legende"><i class="sw-plan"></i>vorgenommen <i class="sw-ist"></i>${nurApp ? "im Bett" : "geschlafen"}</p>
      <p class="sw-tipp"><b>Für heute Abend:</b> ${esc(w.tipp)}</p>
    </section>`;
}

/* ---------- Blatt ---------- */

export function abendStarten({ store, heute, jetztUhrzeit }) {
  const blatt = document.getElementById("abendBlatt");
  const inhalt = document.getElementById("abendInhalt");
  const knopf = document.getElementById("abendSchlafen");
  const zeit = document.getElementById("abendZeit");
  // Nach Mitternacht gehört der Abend noch zum Tag davor.
  let tag = null;

  const zeichnen = () => {
    const plan = abendplanFuer(store, tag);
    const stand = abendStand(store, tag);
    zeit.textContent = plan ? plan.start : "";
    inhalt.innerHTML = abendHtml(plan, stand);
    knopf.textContent = stand.zuBett ? "Schließen" : "Ich geh jetzt schlafen";
  };
  const schliessen = () => { blatt.hidden = true; document.body.classList.remove("blatt-offen"); };
  const oeffnen = () => {
    const u = jetztUhrzeit();
    tag = Number(u.slice(0, 2)) < 5 ? tagPlus(heute(), -1) : heute();
    zeichnen();
    blatt.hidden = false;
    document.body.classList.add("blatt-offen");
  };

  inhalt.addEventListener("click", (event) => {
    const b = event.target.closest("[data-ab-schritt]");
    if (!b) return;
    schrittUmschalten(store, tag, b.dataset.abSchritt);
    spueren("leicht");
    zeichnen();
  });
  knopf.addEventListener("click", () => {
    if (abendStand(store, tag).zuBett) { schliessen(); return; }
    zuBettMerken(store, tag, jetztUhrzeit());
    spueren("erfolg");
    zeichnen();
  });
  document.getElementById("abendZu").addEventListener("click", schliessen);
  return { oeffnen };
}
