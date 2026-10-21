/**
 * Die Ansicht "Rezepte".
 *
 * Eine Karte auf einmal, nicht eine Liste. Eine Liste mit zwanzig Rezepten
 * liest man quer und entscheidet sich für keines. Eine Karte stellt eine Frage:
 * dieses hier? Das Kreuz zeigt das nächste, das Plus trägt es ein.
 *
 * Die Zahlen kommen aus `rezeptVorschlaege` in assistant.js und damit aus dem
 * Rechenkern. Diese Datei rechnet nichts, sie zeigt nur.
 */
import { MAHLZEITEN } from "@daevo/core";
import { rezeptEintragen, rezeptVorschlaege } from "./assistant.js";
import { symbol } from "./symbole.js";

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ART_SYMBOL = { fruehstueck: "sonne", hauptmahlzeit: "flamme", snack: "apfel" };
// Kurze Namen, damit die vier Mahlzeiten in eine Zeile passen. In zwei
// Zeilen stand der Snack allein unter den drei anderen.
const KURZNAME = { fruehstueck: "Frühstück", mittagessen: "Mittag", abendessen: "Abend", snack: "Snack" };
const ART_NAME = { fruehstueck: "Frühstück", hauptmahlzeit: "Hauptmahlzeit", snack: "Snack" };

/**
 * Baut die Ansicht und gibt eine Funktion zum Neuzeichnen zurück.
 *
 * `beiEintrag` kommt aus app.js und zeichnet den Rest der App neu. Diese Datei
 * soll nicht wissen, welche Ansichten es sonst noch gibt.
 */
export function rezepteAnsicht({ wurzel, toast, beiEintrag }) {
  const zustand = { art: null, index: 0, verworfen: new Set() };

  const el = (id) => wurzel.querySelector(`#${id}`);

  function zeichnen() {
    const r = rezeptVorschlaege({ art: zustand.art });
    zustand.art = r.art;
    const liste = r.empfehlungen.filter((e) => !zustand.verworfen.has(e.rezept.id));
    if (zustand.index >= liste.length) zustand.index = 0;
    const e = liste[zustand.index];

    const rest = Math.round(r.rest.kcal);
    // Wird für morgen geplant, gilt der Rest von heute nicht. Vorher stand
    // "291 kcal übrig, im Rahmen" über einem Rezept, das mit dem vollen
    // Tagesziel von morgen gerechnet war.
    el("rzRest").innerHTML = r.morgen
      ? `<b>Für morgen</b> <span class="rz-status gut">mit vollem Tagesziel</span>`
      : `<b>${Math.max(0, rest)}</b> kcal übrig
      <span class="rz-status ${rest >= 0 ? "gut" : "drueber"}">${rest >= 0 ? "Im Rahmen" : `${Math.abs(rest)} kcal drüber`}</span>`;

    // Angeboten werden die Mahlzeiten, die heute noch kommen, plus Snack. Ein
    // Frühstück um 20 Uhr ist trotzdem wählbar, wenn man es antippt: es steht
    // dann für morgen da.
    // Feste Reihenfolge, der Snack zuletzt. Nach Uhrzeit sortiert stand er
    // zwischen Mittag und Abend und sah aus wie eine Hauptmahlzeit.
    el("rzArten").innerHTML = ["fruehstueck", "mittagessen", "abendessen", "snack"]
      .map((art) => MAHLZEITEN.find((m) => m.art === art))
      .map((m) => `<button type="button" class="pill${m.art === r.art ? " on" : ""}" data-rz-art="${m.art}"
        aria-pressed="${m.art === r.art}">${escapeHtml(KURZNAME[m.art] || m.name)}</button>`).join("");

    el("rzFuerMorgen").hidden = !r.morgen;
    if (!r.ziel) {
      el("rzKarte").innerHTML = `<div class="rz-leer">${escapeHtml(r.hinweis || "Für heute ist nichts mehr offen.")}</div>`;
      el("rzAktionen").hidden = true;
      el("rzDetail").innerHTML = "";
      el("rzHinweis").textContent = "";
      return;
    }
    if (!e) {
      el("rzKarte").innerHTML = `<div class="rz-leer">${r.empfehlungen.length
        ? "Das waren alle passenden Rezepte. Tipp auf eine andere Mahlzeit oder komm später wieder."
        : "Zu deinen Angaben passt für diese Mahlzeit keines meiner Rezepte."}</div>`;
      el("rzAktionen").hidden = !r.empfehlungen.length;
      el("rzDetail").innerHTML = "";
      zeigeAusgeblendet(r);
      return;
    }

    el("rzAktionen").hidden = false;
    el("rzKarte").innerHTML = `
      ${e.rezept.foto
        ? `<img class="rz-foto" src="./img/rezepte/${encodeURIComponent(e.rezept.id)}.jpg" alt="" width="800" height="600" decoding="async">`
        : `<div class="rz-bild" style="--ton: var(--makro-${e.rezept.art === "snack" ? "protein" : e.rezept.art === "fruehstueck" ? "kohlenhydrate" : "fett"})">
        ${symbol(ART_SYMBOL[e.rezept.art] || "apfel", { groesse: 64, klasse: "rz-symbol" })}
      </div>`}
      <span class="rz-passung">${e.passung} % passend</span>
      <div class="rz-titel">
        <span>${escapeHtml(ART_NAME[e.rezept.art])}</span>
        <h2>${escapeHtml(e.rezept.name)}</h2>
      </div>`;
    el("rzZeit").innerHTML = `<b>${e.rezept.minuten}</b> Min.`;

    const s = e.summe;
    const z = e.ziel;
    const zeile = (name, ist, soll, einheit) => `<div class="kv"><span>${name}</span><b>${ist} ${einheit}</b><span class="rz-soll">Ziel ${soll}</span></div>`;
    el("rzDetail").innerHTML = `
      <div class="rz-werte">
        ${zeile("Kalorien", s.kcal, z.kcal, "kcal")}
        ${zeile("Protein", s.proteinG, z.proteinG, "g")}
        ${zeile("Kohlenhydrate", s.carbsG, z.carbsG, "g")}
        ${zeile("Fett", s.fatG, z.fatG, "g")}
      </div>
      <h3 class="section-title">Zutaten für deine Portion</h3>
      <ul class="rz-zutaten">${e.posten.map((p) =>
        `<li><span>${escapeHtml(p.name)}</span><b>${escapeHtml(p.menge)}</b>${e.imVorrat.includes(p.name) ? '<i class="rz-vorrat">im Vorrat</i>' : ""}</li>`).join("")}</ul>
      <h3 class="section-title">So geht es</h3>
      <ol class="rz-schritte">${e.rezept.schritte.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ol>`;
    zeigeAusgeblendet(r);
    el("rzEintragen").dataset.index = String(zustand.index);
    zustand.aktuell = e;
    zustand.morgen = r.morgen;
  }

  function zeigeAusgeblendet(r) {
    const n = r.ausgeblendet.length;
    el("rzHinweis").textContent = (n
      ? `${n} ${n === 1 ? "Rezept passt" : "Rezepte passen"} nicht zu deinen Angaben und ${n === 1 ? "ist" : "sind"} ausgeblendet, etwa ${r.ausgeblendet[0].name}: ${r.ausgeblendet[0].grund}. `
      : "")
      + "Die Nährwerte sind Richtwerte aus Nährwerttabellen, für Markenprodukte weichen sie ab. "
      + "Die Passung ist eine Regel der App: Kalorien und Protein zählen je 35 Prozent, Fett und Kohlenhydrate je 15.";
  }

  wurzel.addEventListener("click", (event) => {
    const art = event.target.closest("[data-rz-art]");
    if (art) {
      zustand.art = art.dataset.rzArt;
      zustand.index = 0;
      return zeichnen();
    }
    if (event.target.closest("#rzWeiter")) {
      if (zustand.aktuell) zustand.verworfen.add(zustand.aktuell.rezept.id);
      return zeichnen();
    }
    if (event.target.closest("#rzEintragen") && zustand.aktuell) {
      const e = zustand.aktuell;
      // Für morgen geplant heisst auch für morgen eingetragen. Im heutigen Tag
      // stünde es als gegessen und verschöbe den Rest von heute.
      const tag = zustand.morgen ? morgenIso() : undefined;
      rezeptEintragen(e, tag ? { day: tag } : {});
      toast(`${e.rezept.name} ${tag ? "für morgen " : ""}eingetragen, ${e.summe.kcal} kcal und ${e.summe.proteinG} g Protein.`);
      zustand.verworfen.clear();
      zustand.index = 0;
      beiEintrag();
      return zeichnen();
    }
  });

  return { zeichnen };
}

/** Das Datum von morgen in Ortszeit, JJJJ-MM-TT. */
function morgenIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
