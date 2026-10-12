/**
 * Trainingspläne aus der Übungsdatenbank.
 *
 * Der Plan wird in `packages/core/src/trainingsplan.ts` gerechnet. Diese Datei
 * stellt ihn dar: vier Auswahlzeilen, die Einheiten mit Foto je Übung, die
 * Sätze pro Muskelgruppe und die Quellen. Ein Tipp auf eine Übung öffnet
 * dieselbe Detailseite wie in der Liste.
 *
 * Alles, was entscheidet, ist ohne Browser getestet. Nur `plaeneStarten`
 * fasst `document` an.
 */
import { uebungsplanBauen, uebungsplanText } from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";
import { GRUPPEN, vorschauPfad } from "./uebungen.js";

export const STANDARD_WUNSCH = { tage: 3, minuten: 45, niveau: "intermediate", ziel: "muskel", deload: false, variante: 0 };

export const FELDER = [
  { feld: "tage", name: "Tage pro Woche", werte: [2, 3, 4, 5].map((w) => ({ wert: w, text: String(w) })) },
  { feld: "minuten", name: "Minuten pro Einheit", werte: [30, 45, 60, 75].map((w) => ({ wert: w, text: String(w) })) },
  {
    feld: "niveau", name: "Erfahrung",
    werte: [{ wert: "beginner", text: "Einsteiger" }, { wert: "intermediate", text: "Fortgeschritten" }, { wert: "advanced", text: "Erfahren" }],
  },
  {
    feld: "ziel", name: "Ziel",
    werte: [{ wert: "muskel", text: "Muskelaufbau" }, { wert: "kraft", text: "Kraft" }, { wert: "fitness", text: "Fitness" }],
  },
];

const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Prüft ein gespeichertes oder eingegebenes Wunschobjekt und füllt Lücken mit den Standardwerten. */
export function wunschPruefen(roh) {
  const w = { ...STANDARD_WUNSCH, ...(roh && typeof roh === "object" ? roh : {}) };
  for (const f of FELDER) {
    if (!f.werte.some((x) => x.wert === w[f.feld])) w[f.feld] = STANDARD_WUNSCH[f.feld];
  }
  w.deload = Boolean(w.deload);
  w.variante = Number.isInteger(w.variante) && w.variante >= 0 ? w.variante : 0;
  return w;
}

export function planFuer(wunsch) {
  return uebungsplanBauen(wunschPruefen(wunsch), UEBUNGEN);
}

const nachId = new Map(UEBUNGEN.map((u) => [u.id, u]));

/**
 * Ein gespeicherter Plan kann Übungen enthalten, die es später nicht mehr gibt.
 * Sie werden weggelassen statt die Ansicht zu brechen. Bleibt eine Einheit
 * leer, fällt sie ganz weg.
 */
export function gespeicherterPlan(roh) {
  if (!roh || !Array.isArray(roh.einheiten)) return null;
  const einheiten = roh.einheiten
    .map((e) => ({ ...e, positionen: (Array.isArray(e.positionen) ? e.positionen : []).filter((p) => nachId.has(p.id)) }))
    .filter((e) => e.positionen.length);
  if (!einheiten.length) return null;
  return { ...roh, wunsch: wunschPruefen(roh.wunsch), einheiten };
}

export function steuerHtml(wunsch) {
  const reihen = FELDER.map((f) => {
    const knoepfe = f.werte
      .map((x) => `<button type="button" class="ue-tab${wunsch[f.feld] === x.wert ? " on" : ""}" data-feld="${f.feld}" data-wert="${esc(x.wert)}" aria-pressed="${wunsch[f.feld] === x.wert}">${esc(x.text)}</button>`)
      .join("");
    return `<div class="pl-feld"><p class="pl-name">${f.name}</p><div class="pl-reihe">${knoepfe}</div></div>`;
  });
  const deload = `<label class="pl-deload"><input type="checkbox" id="plDeload"${wunsch.deload ? " checked" : ""}><span>Entlastungswoche</span><small>Halbe Satzzahl, mehr Reserve</small></label>`;
  return reihen.join("") + deload;
}

export function zeileHtml(p) {
  const u = nachId.get(p.id);
  const bild = u ? `<img class="pl-bild" src="${esc(vorschauPfad(u))}" alt="" width="56" height="70" loading="lazy" decoding="async">` : "";
  const pause = p.pauseSek < 90 ? `${p.pauseSek} s` : `${String(p.pauseSek / 60).replace(".", ",")} min`;
  return `<li><button type="button" class="pl-zeile" data-uebung="${esc(p.id)}">${bild}
    <span class="pl-text"><b>${esc(p.name)}</b><span>${p.saetze} × ${esc(p.wdh)}<i></i>Pause ${pause}<i></i>${p.reserve} in Reserve</span></span>
    <span class="chev-re" aria-hidden="true"></span></button></li>`;
}

export function einheitHtml(e) {
  return `<section class="pl-einheit"><header><h3>${esc(e.titel)}</h3><p>${esc(e.fokus)} · etwa ${e.dauerMin} Min.</p></header>
    <ol class="pl-liste">${e.positionen.map(zeileHtml).join("")}</ol></section>`;
}

/** Sätze je Gruppe als Balken. Der Strich bei 10 ist der Richtwert, keine Pflicht. */
export function saetzeHtml(wochensaetze) {
  const zeilen = GRUPPEN.filter((g) => g.id !== "alle" && wochensaetze[g.id]).map((g) => {
    const n = wochensaetze[g.id];
    const breite = Math.min(100, Math.round((n / 20) * 100));
    return `<div class="pl-satz"><span>${esc(g.name)}</span><div class="pl-spur" role="img" aria-label="${n} Sätze"><i style="width:${breite}%"></i></div><b>${n}</b></div>`;
  });
  if (!zeilen.length) return "";
  return `<h3 class="ue-abschnitt">Sätze pro Woche</h3><div class="pl-saetze">${zeilen.join("")}</div><p class="pl-legende">Der Strich markiert zehn Sätze, einen üblichen Richtwert für Muskelaufbau.</p>`;
}

export const hinweiseHtml = (hinweise) => hinweise.map((h) => `<li>${esc(h)}</li>`).join("");
export const quellenHtml = (quellen) => quellen.map((q) => `<li>${esc(q)}</li>`).join("");

export function planText(plan) {
  return uebungsplanText(plan);
}

const $ = (id) => document.getElementById(id);

/**
 * Hängt die Pläne in die Übungsansicht. `speicher` liest und schreibt den
 * gespeicherten Plan, `oeffne` zeigt die Detailseite einer Übung, `melde` gibt
 * eine kurze Rückmeldung. Alle drei kommen von außen, damit diese Datei weder
 * den Speicher noch die Oberfläche der App kennen muss.
 */
export function plaeneStarten({ speicher, oeffne, melde }) {
  let gespeichert = gespeicherterPlan(speicher.lesen());
  let wunsch = wunschPruefen(gespeichert?.wunsch);
  let plan = gespeichert ?? planFuer(wunsch);
  let istGespeichert = Boolean(gespeichert);

  const zeichnen = () => {
    $("plSteuerung").innerHTML = steuerHtml(wunsch);
    const dauer = plan.einheiten.map((e) => e.dauerMin);
    const schnitt = Math.round(dauer.reduce((a, b) => a + b, 0) / dauer.length);
    $("plKopf").innerHTML = `<b>${plan.einheiten.length} Einheiten pro Woche</b><span>etwa ${schnitt} Min. je Einheit${wunsch.deload ? " · Entlastung" : ""}</span>`;
    $("plEinheiten").innerHTML = plan.einheiten.map(einheitHtml).join("");
    $("plSaetze").innerHTML = saetzeHtml(plan.wochensaetze ?? {});
    $("plHinweise").innerHTML = hinweiseHtml(plan.hinweise ?? []);
    $("plQuellen").innerHTML = quellenHtml(plan.quellen ?? []);
    $("plSpeichern").textContent = istGespeichert ? "Gespeichert" : "Als meinen Plan speichern";
    $("plSpeichern").disabled = istGespeichert;
    $("plGeladen").hidden = !(gespeichert && !istGespeichert);
  };

  const neu = (teil) => {
    wunsch = wunschPruefen({ ...wunsch, ...teil });
    plan = planFuer(wunsch);
    istGespeichert = false;
    zeichnen();
  };

  $("plSteuerung").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-feld]");
    if (!knopf) return;
    const f = FELDER.find((x) => x.feld === knopf.dataset.feld);
    const wert = f.werte.find((x) => String(x.wert) === knopf.dataset.wert)?.wert;
    // Eine neue Auswahl beginnt bei Variante 0, sonst bleibt eine alte Streuung hängen.
    neu({ [f.feld]: wert, variante: 0 });
  });
  $("plSteuerung").addEventListener("change", (event) => {
    if (event.target.id === "plDeload") neu({ deload: event.target.checked });
  });
  $("plAndere").addEventListener("click", () => neu({ variante: wunsch.variante + 1 }));
  $("plEinheiten").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-uebung]");
    if (knopf) oeffne(knopf.dataset.uebung);
  });
  $("plSpeichern").addEventListener("click", () => {
    speicher.schreiben({ ...plan, gespeichertAm: new Date().toISOString() });
    gespeichert = plan;
    istGespeichert = true;
    zeichnen();
    melde("Plan gespeichert");
  });
  $("plGeladen").addEventListener("click", () => {
    if (!gespeichert) return;
    wunsch = wunschPruefen(gespeichert.wunsch);
    plan = gespeichert;
    istGespeichert = true;
    zeichnen();
  });
  $("plTeilen").addEventListener("click", async () => {
    const text = planText(plan);
    try {
      if (navigator.share) { await navigator.share({ title: "Trainingsplan", text }); return; }
      await navigator.clipboard.writeText(text);
      melde("Plan kopiert");
    } catch (fehler) {
      // Ein Abbruch im Teilen Dialog wirft ebenfalls, und das ist kein Fehler.
      if (fehler?.name !== "AbortError") melde("Teilen ging nicht. Der Plan steht auf dieser Seite.");
    }
  });

  zeichnen();
}
