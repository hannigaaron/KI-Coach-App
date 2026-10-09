/**
 * Die Übungsansicht: Liste, Filter und Detailseite.
 *
 * Ein Tipp auf eine Übung öffnet die Detailseite mit der Animation, den
 * trainierten Muskeln und drei bis vier Schritten zur Ausführung. Die Daten
 * stehen in `uebungen-daten.js`, die Figuren zeichnet `uebungen-anim.js`.
 *
 * Alles, was Suche und Filter entscheidet, ist ohne Browser getestet. Nur
 * `uebungenStarten` fasst `document` an und wird deshalb erst beim Aufruf
 * ausgeführt.
 */
import { foldUmlauts } from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";
import { abspielen } from "./uebungen-anim.js";

export const GRUPPEN = [
  { id: "alle", name: "Alle" },
  { id: "beine", name: "Beine und Gesäß" },
  { id: "brust", name: "Brust" },
  { id: "ruecken", name: "Rücken" },
  { id: "schultern", name: "Schultern" },
  { id: "arme", name: "Arme" },
  { id: "rumpf", name: "Rumpf" },
  { id: "ganzkoerper", name: "Ganzkörper" },
];

export const GERAETE = {
  barbell: "Langhantel",
  dumbbell: "Kurzhantel",
  machine: "Maschine",
  cable: "Kabelzug",
  bodyweight: "Körpergewicht",
  kettlebell: "Kettlebell",
  trap_bar: "Trap Bar",
  medicine_ball: "Medizinball",
  equipment: "Ab Wheel",
};

export const NIVEAUS = { beginner: "Einsteiger", intermediate: "Fortgeschritten", advanced: "Erfahren" };
export const ARTEN = { compound: "Mehrgelenkig", isolation: "Eingelenkig", isometric: "Halteübung" };

/**
 * Wie Leute nach einem Muskel suchen, ohne den Fachnamen zu kennen. Die
 * Anzeige bleibt beim Fachnamen, den jedes Studio benutzt.
 */
const MUSKEL_ALIAS = {
  Gluteus: "Gesäß Po",
  "Gluteus medius": "Gesäß Po",
  Hamstrings: "hintere Oberschenkel Beinbeuger",
  Quadrizeps: "vordere Oberschenkel",
  Latissimus: "Rücken breiter Rückenmuskel",
  Rhomboiden: "Rücken",
  Rückenstrecker: "Rücken unterer Rücken",
  Trapez: "Nacken Rücken",
  Brust: "Brustmuskel",
  "obere Brust": "Brustmuskel",
  Bizeps: "Oberarm",
  Trizeps: "Oberarm",
  "Trizeps (langer Kopf)": "Oberarm",
  Brachialis: "Oberarm",
  Bauch: "Bauchmuskeln Sixpack",
  Rumpf: "Core Bauch",
  Gastrocnemius: "Waden",
  Soleus: "Waden",
  Adduktoren: "Innenseite Oberschenkel",
  Unterarme: "Griffkraft",
};

const norm = (text) => foldUmlauts(String(text ?? "").toLowerCase());

/**
 * Filtert die Datenbank. Der Suchtext trifft Name, englischen Namen, Muskeln
 * und Gerät. Jedes Wort muss irgendwo vorkommen, die Reihenfolge ist egal.
 * Ohne Umlautfaltung fände "Gesaess" das Gesäß nicht und "Gesäß" nicht
 * "Gesaess".
 */
export function uebungenFiltern({ text = "", gruppe = "alle", geraet = "alle" } = {}, liste = UEBUNGEN) {
  const woerter = norm(text).split(/\s+/).filter(Boolean);
  return liste.filter((u) => {
    if (gruppe !== "alle" && u.gruppe !== gruppe) return false;
    if (geraet !== "alle" && u.equipment !== geraet) return false;
    if (!woerter.length) return true;
    const muskeln = [...u.primaryMuscles, ...u.secondaryMuscles];
    const heu = norm([u.name, u.nameEn, ...muskeln, ...muskeln.map((m) => MUSKEL_ALIAS[m] ?? ""), GERAETE[u.equipment]].join(" "));
    return woerter.every((w) => heu.includes(w));
  });
}

export function uebungNach(id, liste = UEBUNGEN) {
  return liste.find((u) => u.id === id) ?? null;
}

const kommaListe = (felder) => felder.join(", ");

/** Die Zeile in der Liste: Muskeln und Gerät, mehr nicht. */
export function untertitel(u) {
  return `${kommaListe(u.primaryMuscles)} · ${GERAETE[u.equipment] ?? u.equipment}`;
}

const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function listeHtml(treffer) {
  if (!treffer.length) return '<li class="ue-leer">Keine Übung gefunden. Versuch es mit einem Muskel oder einem Gerät.</li>';
  return treffer
    .map((u) => `<li><button class="ue-item" type="button" data-uebung="${esc(u.id)}">
      <span class="li-main"><span class="li-title">${esc(u.name)}</span><span class="li-sub" style="display:block">${esc(untertitel(u))}</span></span>
      <span class="chev-re" aria-hidden="true"></span></button></li>`)
    .join("");
}

export function muskelnHtml(u) {
  const haupt = u.primaryMuscles.map((m) => `<span class="ue-chip">${esc(m)}</span>`);
  const neben = u.secondaryMuscles.map((m) => `<span class="ue-chip zweit">${esc(m)}</span>`);
  return [...haupt, ...neben].join("");
}

export function schritteHtml(u) {
  return u.steps.map((s) => `<li>${esc(s)}</li>`).join("");
}

export function metaHtml(u) {
  return [
    `<span>Gerät <b>${esc(GERAETE[u.equipment] ?? u.equipment)}</b></span>`,
    `<span>Niveau <b>${esc(NIVEAUS[u.level] ?? u.level)}</b></span>`,
    `<span>Art <b>${esc(ARTEN[u.mechanics] ?? u.mechanics)}</b></span>`,
    `<span>Wiederholungen <b>${esc(u.repRange)}</b></span>`,
  ].join("");
}

const $ = (id) => document.getElementById(id);

let stopp = () => {};

/**
 * Hängt die Ansicht ein. Wird einmal beim Start gerufen. Die Animation läuft
 * nur, solange die Detailseite offen ist: ein Bildlauf, der im Hintergrund
 * weiterzeichnet, kostet Akku und bringt niemandem etwas.
 */
export function uebungenStarten() {
  const reduziert = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const zustand = { text: "", gruppe: "alle", geraet: "alle" };

  $("ueGruppen").innerHTML = GRUPPEN.map((g) => `<button type="button" class="pill${g.id === "alle" ? " on" : ""}" data-gruppe="${g.id}">${g.name}</button>`).join("");
  const benutzt = [...new Set(UEBUNGEN.map((u) => u.equipment))];
  $("ueGeraet").innerHTML = '<option value="alle">Alle Geräte</option>' + benutzt.map((g) => `<option value="${g}">${GERAETE[g] ?? g}</option>`).join("");

  const zeichnen = () => {
    const treffer = uebungenFiltern(zustand);
    $("ueListe").innerHTML = listeHtml(treffer);
    $("ueZaehler").textContent = `${treffer.length} von ${UEBUNGEN.length} Übungen`;
  };

  $("ueSuche").addEventListener("input", () => { zustand.text = $("ueSuche").value; zeichnen(); });
  $("ueGeraet").addEventListener("change", () => { zustand.geraet = $("ueGeraet").value; zeichnen(); });
  $("ueGruppen").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-gruppe]");
    if (!knopf) return;
    zustand.gruppe = knopf.dataset.gruppe;
    for (const k of $("ueGruppen").children) k.classList.toggle("on", k === knopf);
    zeichnen();
  });

  const schliessen = () => {
    stopp();
    stopp = () => {};
    $("ueDetail").hidden = true;
  };
  $("ueDetailZu").addEventListener("click", schliessen);

  $("ueListe").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-uebung]");
    const u = knopf && uebungNach(knopf.dataset.uebung);
    if (!u) return;
    $("ueTitel").textContent = u.name;
    $("ueEnglisch").textContent = u.nameEn;
    $("ueMuskeln").innerHTML = muskelnHtml(u);
    $("ueSchritte").innerHTML = schritteHtml(u);
    $("ueMeta").innerHTML = metaHtml(u);
    $("ueDetail").hidden = false;
    $("ueDetail").querySelector(".scroll")?.scrollTo({ top: 0 });
    stopp();
    stopp = abspielen($("ueFigur"), u.anim, { reduziert });
  });

  zeichnen();
  return { schliessen };
}
