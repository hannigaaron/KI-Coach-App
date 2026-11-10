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
import { essensplanEinkauf, essensplanRechnen, rezeptEintragen, rezeptVorschlaege } from "./assistant.js";
import { todayIso } from "./storage.js";
import { symbol } from "./symbole.js";

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const ART_SYMBOL = { fruehstueck: "sonne", hauptmahlzeit: "flamme", snack: "apfel" };
// Kurze Namen, damit die vier Mahlzeiten in eine Zeile passen. In zwei
// Zeilen stand der Snack allein unter den drei anderen.
const KURZNAME = { fruehstueck: "Frühstück", mittagessen: "Mittag", abendessen: "Abend", snack: "Snack" };
const ART_NAME = { fruehstueck: "Frühstück", hauptmahlzeit: "Hauptmahlzeit", snack: "Snack" };
const WOCHENTAG = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const zahl = (n) => Math.round(n).toLocaleString("de-DE");

/**
 * Baut die Ansicht und gibt eine Funktion zum Neuzeichnen zurück.
 *
 * `beiEintrag` kommt aus app.js und zeichnet den Rest der App neu. Diese Datei
 * soll nicht wissen, welche Ansichten es sonst noch gibt.
 */
export function rezepteAnsicht({ wurzel, toast, beiEintrag, planFrei = () => true, proOeffnen = () => {} }) {
  const zustand = { art: null, index: 0, verworfen: new Set(), modus: "einzeln", tag: 0, offen: -1 };

  const el = (id) => wurzel.querySelector(`#${id}`);

  function zeichnen() {
    const woche = zustand.modus === "woche";
    el("rzEinzeln").hidden = woche;
    el("rzWoche").hidden = !woche;
    for (const b of wurzel.querySelectorAll("[data-rz-modus]")) {
      const an = b.dataset.rzModus === zustand.modus;
      b.classList.toggle("on", an);
      b.setAttribute("aria-selected", String(an));
    }
    // Was Pro braucht, trägt das schon am Reiter. Wer erst nach dem Tippen
    // erfährt, dass es gesperrt ist, fühlt sich hereingelegt.
    const reiter = wurzel.querySelector('[data-rz-modus="woche"]');
    if (reiter) reiter.innerHTML = planFrei() ? "Wochenplan" : 'Wochenplan <span class="pro-chip">Pro</span>';
    return woche ? wocheZeichnen() : einzelnZeichnen();
  }

  /**
   * Der Wochenplan, ein Tag auf einmal. Sieben Tage untereinander mit je vier
   * Gerichten sind 28 Zeilen, und darin findet niemand den Donnerstag.
   */
  function wocheZeichnen() {
    // Ohne Pro steht der echte Plan verschwommen hinter einem Schloss, wie bei
    // Sleep Cycle. Ein leerer Kasten mit "gehört zu Pro" zeigt nicht, was man
    // bekäme, und wer es nicht sieht, will es auch nicht.
    const gesperrt = !planFrei();
    el("rzWoche").classList.toggle("pro-gesperrt", gesperrt);
    el("rzWoche").querySelector(".pro-schleier")?.remove();
    if (gesperrt) {
      el("rzWoche").insertAdjacentHTML("beforeend", `<div class="pro-schleier">
        <div class="pro-schloss">${symbol("schloss", { groesse: 22 })}</div>
        <span class="pro-chip">Pro</span>
        <h2>Dein Essensplan für die Woche</h2>
        <p>Sieben Tage aus den Rezepten, gerechnet auf deine Kalorien und Makros, mit Abendessen zum Vorkochen und fertiger Einkaufsliste.</p>
        <button type="button" class="primary breit" data-ep-pro>Mit Pro freischalten</button>
      </div>`);
    }
    wurzel.querySelector(".ep-aktionen").hidden = gesperrt;
    const plan = zustand.plan ?? (zustand.plan = essensplanRechnen());
    if (zustand.tag >= plan.tage.length) zustand.tag = 0;
    const tag = plan.tage[zustand.tag];
    const z = plan.tage[0].ziel;
    el("epZiel").textContent = `Gerechnet auf ${zahl(z.kcal)} kcal und ${z.proteinG} g Protein am Tag, an Trainingstagen auf dein höheres Ziel.`;

    const heute = todayIso();
    el("epTage").innerHTML = plan.tage.map((t, i) => {
      const d = new Date(`${t.datum}T12:00:00`);
      const name = t.datum === heute ? "Heute" : WOCHENTAG[d.getDay()];
      return `<button type="button" class="pill${i === zustand.tag ? " on" : ""}" role="tab" aria-selected="${i === zustand.tag}" data-ep-tag="${i}">${name} <small>${d.getDate()}.</small></button>`;
    }).join("");

    const s = tag.summe;
    const zt = tag.ziel;
    const wert = (name, ist, soll, einheit) => `<div class="ep-wert"><b>${zahl(ist)}</b><span>von ${zahl(soll)} ${einheit}</span><i>${name}</i></div>`;
    const darfEintragen = tag.datum <= heute;
    el("epTag").innerHTML = `
      <div class="ep-werte">
        ${wert("Kalorien", s.kcal, zt.kcal, "kcal")}
        ${wert("Protein", s.proteinG, zt.proteinG, "g")}
        ${wert("Kohlenh.", s.carbsG, zt.carbsG, "g")}
        ${wert("Fett", s.fatG, zt.fatG, "g")}
      </div>
      <ul class="ep-liste">${tag.mahlzeiten.map((m, i) => {
        const e = m.empfehlung;
        const offen = zustand.offen === i;
        const marke = m.vorkochen === "doppelt" ? '<em class="ep-marke">doppelt kochen</em>'
          : m.vorkochen === "vorgekocht" ? '<em class="ep-marke">vom Vortag</em>' : "";
        return `<li class="ep-mahlzeit${offen ? " offen" : ""}">
          <button type="button" class="ep-kopf" data-ep-m="${i}" aria-expanded="${offen}">
            ${e.rezept.foto ? `<img src="./img/rezepte/${encodeURIComponent(e.rezept.id)}.jpg" alt="" width="64" height="48" loading="lazy" decoding="async">` : `<span class="ep-bild">${symbol("apfel", { groesse: 22 })}</span>`}
            <span class="ep-text">
              <small>${escapeHtml(m.name)}${marke}</small>
              <strong>${escapeHtml(e.rezept.name)}</strong>
              <span>${zahl(e.summe.kcal)} kcal · ${e.summe.proteinG} g Protein · ${e.rezept.minuten} Min.</span>
            </span>
          </button>
          ${offen ? `<div class="ep-detail">
            ${m.vorkochen === "doppelt" ? zusammenHtml(m, plan.tage[zustand.tag + 1]) : ""}
            ${m.vorkochen === "vorgekocht" ? '<p class="sub">Vom Vortag aufwärmen. Die Menge unten ist deine Portion für heute.</p>' : ""}
            <ul class="rz-zutaten">${e.posten.map((p) => `<li><span>${escapeHtml(p.name)}</span><b>${escapeHtml(p.menge)}</b></li>`).join("")}</ul>
            ${m.vorkochen === "vorgekocht" ? "" : `<ol class="rz-schritte">${e.rezept.schritte.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ol>`}
            ${darfEintragen ? `<button type="button" class="ghost breit" data-ep-eintragen="${i}">Gegessen, eintragen</button>` : ""}
          </div>` : ""}
        </li>`;
      }).join("")}</ul>
      ${tag.ergaenzung.length ? `<p class="ep-ergaenzung"><b>Dazu am Tag:</b> ${tag.ergaenzung.map((p) => `${escapeHtml(p.menge)} ${escapeHtml(p.name)}`).join(" und ")}. Damit gehen Protein und Kalorien auf, etwa als Snack oder zum Frühstück.</p>` : ""}`;

    el("epHinweis").textContent = [...plan.hinweise,
      "Die Nährwerte sind Richtwerte aus Nährwerttabellen und aus den Zutaten gerechnet. Allergien, Unverträglichkeiten und deine Ernährungsform aus dem Fragebogen sind berücksichtigt."].join(" ");
  }

  /**
   * Was für heute und morgen zusammen in den Topf kommt. Die Portionen beider
   * Tage sind einzeln gerechnet, an einem Trainingstag ist die zweite grösser.
   * Wer vorkocht, will eine Zahl je Zutat und nicht zwei zum Addieren.
   */
  function zusammenHtml(m, morgen) {
    const zweite = morgen?.mahlzeiten.find((x) => x.art === m.art && x.empfehlung.rezept.id === m.empfehlung.rezept.id);
    if (!zweite) return "";
    const summe = new Map();
    for (const p of [...m.empfehlung.posten, ...zweite.empfehlung.posten]) {
      const alt = summe.get(p.key);
      summe.set(p.key, { name: p.name, gramm: (alt?.gramm ?? 0) + p.gramm, stueck: p.menge.endsWith(" g") ? null : p.menge, n: (alt?.n ?? 0) + (Number.parseInt(p.menge, 10) || 0) });
    }
    const zeilen = [...summe.values()].map((z) => {
      const menge = z.stueck ? `${z.n} ${z.stueck.replace(/^\d+\s*/, "")}` : `${z.gramm} g`;
      return `<li><span>${escapeHtml(z.name)}</span><b>${escapeHtml(menge)}</b></li>`;
    }).join("");
    return `<p class="sub">Koch heute für zwei Tage. Morgen gibt es das Gericht noch einmal. So viel kommt zusammen in den Topf:</p>
      <ul class="rz-zutaten">${zeilen}</ul>
      <h3 class="section-title">Davon deine Portion heute</h3>`;
  }

  function einzelnZeichnen() {
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
    const modus = event.target.closest("[data-rz-modus]");
    if (modus) {
      zustand.modus = modus.dataset.rzModus;
      zustand.plan = null;
      return zeichnen();
    }
    if (event.target.closest("[data-ep-pro]")) return proOeffnen();
    const tag = event.target.closest("[data-ep-tag]");
    if (tag) {
      zustand.tag = Number(tag.dataset.epTag);
      zustand.offen = -1;
      return zeichnen();
    }
    const kopf = event.target.closest("[data-ep-m]");
    if (kopf) {
      const i = Number(kopf.dataset.epM);
      zustand.offen = zustand.offen === i ? -1 : i;
      return zeichnen();
    }
    const eintragen = event.target.closest("[data-ep-eintragen]");
    if (eintragen && zustand.plan) {
      const t = zustand.plan.tage[zustand.tag];
      const m = t.mahlzeiten[Number(eintragen.dataset.epEintragen)];
      rezeptEintragen(m.empfehlung, { day: t.datum });
      toast(`${m.empfehlung.rezept.name} eingetragen, ${m.empfehlung.summe.kcal} kcal und ${m.empfehlung.summe.proteinG} g Protein.`);
      beiEintrag();
      return;
    }
    if (event.target.closest("#epAnders")) {
      zustand.plan = essensplanRechnen({ andere: true });
      zustand.offen = -1;
      return zeichnen();
    }
    if (event.target.closest("#epEinkauf") && zustand.plan) {
      const n = essensplanEinkauf(zustand.plan);
      toast(`${n} Zutaten für die Woche stehen in der Einkaufsliste. Was im Vorrat liegt, steht dort als zuhause.`);
      return;
    }
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
