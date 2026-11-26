/**
 * Eine Übung aus der Datenbank wählen: Suchfeld, Filter nach Gruppe und
 * Gerät, darunter die Liste mit Foto. Für "Übung hinzufügen" und "Alle
 * Übungen durchsuchen" im Plan.
 *
 * Vorher stand dort ein Auswahlfeld mit jeder Übung alphabetisch, über
 * hundert Zeilen. Im Studio sucht niemand "Kabel Curl" zwischen
 * Abduktorenmaschine und Arnold Press, er sucht nach dem, was er vor sich
 * hat. Filter und Suche sind dieselben wie in der Ansicht Übungen,
 * `uebungenFiltern`, damit ein Wort hier dasselbe findet wie dort.
 *
 * `wahlHtml` und `wahlListeHtml` fassen weder `document` noch `window` an.
 */
import { GERAETE, GRUPPEN, uebungenFiltern, vorschauPfad } from "./uebungen.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Die Geräte, die als Filter angeboten werden, wie in der Ansicht Übungen. */
export const GERAETE_WAHL = [["alle", "Alle Geräte"], ["machine", "Maschine"], ["cable", "Kabel"], ["smith_machine", "Multipresse"], ["dumbbell", "Kurzhantel"], ["barbell", "Langhantel"], ["bodyweight", "Körpergewicht"]];

export function wahlListeHtml(liste) {
  if (!liste.length) return '<p class="uw-leer">Keine passende Übung. Nimm einen Filter weg oder such anders.</p>';
  return liste.slice(0, 80).map((u) => `<button type="button" class="uw-zeile" data-uw="${esc(u.id)}">`
    + `<img src="${esc(vorschauPfad(u))}" alt="" loading="lazy" decoding="async" width="44" height="55">`
    + `<span><b>${esc(u.name)}</b><small><em>${esc(GERAETE[u.equipment] ?? u.equipment)}</em> · ${esc((u.primaryMuscles ?? []).join(", "))}</small></span></button>`).join("");
}

export function wahlHtml({ titel, unter = "", text = "", gruppe = "alle", geraet = "alle", liste }) {
  const chips = (paare, an, attr) => paare.map(([id, name]) => `<button type="button" class="ue-tab${id === an ? " on" : ""}" ${attr}="${id}" aria-pressed="${id === an}">${esc(name)}</button>`).join("");
  return `<div class="uw-innen" role="dialog" aria-modal="true" aria-label="${esc(titel)}">
    <header class="uw-kopf"><div><h2>${esc(titel)}</h2>${unter ? `<p>${esc(unter)}</p>` : ""}</div>
      <button type="button" class="icon-btn uw-zu" data-uw-zu aria-label="Schliessen"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <input type="search" class="uw-suche" data-uw-suche placeholder="Übung, Muskel oder Gerät" value="${esc(text)}" autocomplete="off" autocapitalize="none" spellcheck="false">
    <div class="uw-filter" role="group" aria-label="Gruppe">${chips(GRUPPEN.map((g) => [g.id, g.name]), gruppe, "data-uw-gruppe")}</div>
    <div class="uw-filter" role="group" aria-label="Gerät">${chips(GERAETE_WAHL, geraet, "data-uw-geraet")}</div>
    <div class="uw-liste">${wahlListeHtml(uebungenFiltern({ text, gruppe, geraet }, liste))}</div>
  </div>`;
}

/**
 * Öffnet die Wahl über allem. `liste` ist, was überhaupt in Frage kommt,
 * schon nach Ort und Beschwerden gefiltert. `aufWahl` bekommt die Kennung.
 */
export function uebungWahlOeffnen({ titel, unter = "", liste, aufWahl }) {
  document.querySelector(".uw")?.remove();
  const zustand = { text: "", gruppe: "alle", geraet: "alle" };
  const wurzel = document.createElement("div");
  wurzel.className = "uw blatt";
  const zeichnen = () => {
    wurzel.innerHTML = wahlHtml({ titel, unter, liste, ...zustand });
    // Ein gewählter Filter rechts in der Zeile bliebe sonst ausserhalb des Bildes.
    for (const k of wurzel.querySelectorAll(".uw-filter .on")) k.scrollIntoView?.({ block: "nearest", inline: "center" });
  };
  // Die Suche zeichnet nur die Liste neu, sonst verlöre das Feld nach jedem
  // Buchstaben den Fokus.
  const listeNeu = () => { wurzel.querySelector(".uw-liste").innerHTML = wahlListeHtml(uebungenFiltern(zustand, liste)); };
  const zu = () => { wurzel.remove(); document.body.classList.remove("blatt-offen"); document.removeEventListener("keydown", taste); };
  const taste = (ev) => { if (ev.key === "Escape") zu(); };
  wurzel.addEventListener("click", (ev) => {
    if (ev.target === wurzel || ev.target.closest("[data-uw-zu]")) return zu();
    const k = ev.target.closest("button");
    if (!k) return;
    if (k.dataset.uw) { zu(); aufWahl(k.dataset.uw); return; }
    if (k.dataset.uwGruppe) { zustand.gruppe = k.dataset.uwGruppe; zeichnen(); }
    else if (k.dataset.uwGeraet) { zustand.geraet = k.dataset.uwGeraet; zeichnen(); }
  });
  wurzel.addEventListener("input", (ev) => {
    if (!ev.target.matches("[data-uw-suche]")) return;
    zustand.text = ev.target.value;
    listeNeu();
  });
  zeichnen();
  document.body.append(wurzel);
  document.body.classList.add("blatt-offen");
  document.addEventListener("keydown", taste);
}
