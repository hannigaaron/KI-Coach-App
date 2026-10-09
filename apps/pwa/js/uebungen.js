/**
 * Die Übungsansicht: Liste, Filter und Detailseite.
 *
 * Ein Tipp auf eine Übung öffnet die Detailseite mit Foto, trainierten Muskeln,
 * drei bis vier Schritten zur Ausführung und dem Link zu einem Erklärvideo. Die
 * Daten stehen in `uebungen-daten.js`.
 *
 * Alles, was Suche und Filter entscheidet, ist ohne Browser getestet. Nur
 * `uebungenStarten` fasst `document` an und wird deshalb erst beim Aufruf
 * ausgeführt.
 */
import { foldUmlauts } from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";

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
  resistance_band: "Widerstandsband",
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

/** Pfade der Fotos. Eines je Übung, dazu ein Hochformat Ausschnitt für das Raster. */
export const fotoPfad = (u) => `./img/uebungen/${u.id}.jpg`;
export const vorschauPfad = (u) => `./img/uebungen/kachel/${u.id}.jpg`;
export const alternativPfad = (u) => `./img/uebungen/alternative/${u.id}.jpg`;

/**
 * Der Link zum Video. Nur die Kennung ist gespeichert, die Adresse wird hier
 * gebaut: so kann kein Eintrag auf eine andere Seite zeigen als YouTube.
 */
export const videoLink = (u) => `https://www.youtube.com/watch?v=${u.video.id}`;

/** Die Zeile in der Liste: Muskeln und Gerät, mehr nicht. */
export function untertitel(u) {
  return `${kommaListe(u.primaryMuscles)} · ${GERAETE[u.equipment] ?? u.equipment}`;
}

const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function listeHtml(treffer) {
  if (!treffer.length) return '<li class="ue-leer">Keine Übung gefunden.<br>Versuch einen Muskel oder ein Gerät.</li>';
  return treffer
    .map((u) => `<li><button class="ue-karte" type="button" data-uebung="${esc(u.id)}">
      <img class="ue-karte-bild" src="${esc(vorschauPfad(u))}" alt="" width="400" height="500" loading="lazy" decoding="async">
      <span class="ue-karte-text"><b>${esc(u.name)}</b><span>${esc(u.primaryMuscles[0])}</span></span></button></li>`)
    .join("");
}

const mitPunkt = (liste) => liste.map(esc).join(" · ");

/** Hauptmuskeln und unterstützende Muskeln als Text. Leer, wenn es keine gibt. */
export const hauptmuskelnText = (u) => mitPunkt(u.primaryMuscles);
export const nebenmuskelnText = (u) => mitPunkt(u.secondaryMuscles);
export const gruppenName = (u) => GRUPPEN.find((g) => g.id === u.gruppe)?.name ?? "";

export function schritteHtml(u) {
  return u.steps.map((s) => `<li>${esc(s)}</li>`).join("");
}

/** Drei Kennzahlen in einer Zeile: Niveau, Wiederholungen, Gerät. */
export function metaHtml(u) {
  const zelle = (wert, name) => `<div class="ue-stat"><b>${esc(wert)}</b><span>${name}</span></div>`;
  return [
    zelle(NIVEAUS[u.level] ?? u.level, "Niveau"),
    zelle(u.repRange, "Wdh."),
    zelle(GERAETE[u.equipment] ?? u.equipment, "Gerät"),
  ].join("");
}

/** Ein zweiter Aufbau derselben Übung, falls die Datenbank einen kennt. Leer, wenn nicht. */
export function alternativeHtml(u) {
  if (!u.alternative) return "";
  const schritte = u.alternative.steps.map((s) => `<li>${esc(s)}</li>`).join("");
  return `<h3 class="ue-abschnitt">${esc(u.alternative.titel)}</h3>
    <div class="ue-alt-bild"><img src="${esc(alternativPfad(u))}" alt="${esc(u.name)}: zweiter Aufbau" width="960" height="720" loading="lazy" decoding="async"></div>
    <ol class="ue-schritte">${schritte}</ol>`;
}

/** Der feste Knopf am unteren Rand: öffnet das Erklärvideo auf YouTube. */
export function videoHtml(u) {
  const dauer = u.video.dauer ? ` · ${esc(u.video.dauer)} Min.` : "";
  return `<a class="ue-cta-knopf" href="${esc(videoLink(u))}" target="_blank" rel="noopener noreferrer">
    <span class="ue-play" aria-hidden="true"></span><span>Erklärvideo ansehen</span></a>
    <p class="ue-cta-fuss">${esc(u.video.kanal)}${dauer} · öffnet YouTube</p>`;
}

const $ = (id) => document.getElementById(id);

/**
 * Hängt die Ansicht ein. Wird einmal beim Start gerufen.
 */
export function uebungenStarten() {
  const zustand = { text: "", gruppe: "alle", geraet: "alle" };

  $("ueGruppen").innerHTML = GRUPPEN.map((g) => `<button type="button" class="ue-tab${g.id === "alle" ? " on" : ""}" data-gruppe="${g.id}" role="tab" aria-selected="${g.id === "alle"}">${g.name}</button>`).join("");

  const zeichnen = () => {
    const treffer = uebungenFiltern(zustand);
    $("ueListe").innerHTML = listeHtml(treffer);
    $("ueZaehler").textContent = treffer.length === UEBUNGEN.length ? `${UEBUNGEN.length} Übungen` : `${treffer.length} von ${UEBUNGEN.length}`;
  };

  $("ueSuche").addEventListener("input", () => { zustand.text = $("ueSuche").value; zeichnen(); });
  $("ueGruppen").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-gruppe]");
    if (!knopf) return;
    zustand.gruppe = knopf.dataset.gruppe;
    for (const k of $("ueGruppen").children) {
      k.classList.toggle("on", k === knopf);
      k.setAttribute("aria-selected", String(k === knopf));
    }
    knopf.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    zeichnen();
  });

  const schliessen = () => {
    $("ueDetail").hidden = true;
    $("ueFoto").removeAttribute("src");
  };
  $("ueDetailZu").addEventListener("click", schliessen);

  const zeigeDetail = (u) => {
    $("ueFoto").src = fotoPfad(u);
    $("ueFoto").alt = `${u.name}: so sieht die Ausführung aus`;
    $("ueGruppe").textContent = gruppenName(u);
    $("ueTitel").textContent = u.name;
    $("ueEnglisch").textContent = u.nameEn;
    $("ueHaupt").innerHTML = hauptmuskelnText(u);
    const neben = nebenmuskelnText(u);
    $("ueNebenZeile").hidden = !neben;
    $("ueNeben").innerHTML = neben;
    $("ueMeta").innerHTML = metaHtml(u);
    $("ueSchritte").innerHTML = schritteHtml(u);
    $("ueAlternative").innerHTML = alternativeHtml(u);
    $("ueVideo").innerHTML = videoHtml(u);
    $("ueDetail").hidden = false;
    $("ueDetail").querySelector(".scroll")?.scrollTo({ top: 0 });
  };

  $("ueListe").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-uebung]");
    const u = knopf && uebungNach(knopf.dataset.uebung);
    if (u) zeigeDetail(u);
  });

  /** Übungen oder Trainingspläne. Die Pläne werden erst beim ersten Öffnen aufgebaut. */
  const modus = (name) => {
    const plaene = name === "plaene";
    $("ueBereichUebungen").hidden = plaene;
    $("ueBereichPlaene").hidden = !plaene;
    $("ueModusUebungen").classList.toggle("on", !plaene);
    $("ueModusPlaene").classList.toggle("on", plaene);
    $("ueModusUebungen").setAttribute("aria-selected", String(!plaene));
    $("ueModusPlaene").setAttribute("aria-selected", String(plaene));
  };
  for (const knopf of [$("ueModusUebungen"), $("ueModusPlaene")]) {
    knopf.addEventListener("click", () => modus(knopf.dataset.modus));
  }

  zeichnen();
  return { schliessen, modus, oeffne: (id) => { const u = uebungNach(id); if (u) zeigeDetail(u); } };
}
