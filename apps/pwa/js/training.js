/**
 * Der Trainingsmodus: eine Einheit aus dem Plan Satz für Satz abarbeiten.
 *
 * Je Satz Gewicht, Wiederholungen und Wiederholungen in Reserve, ein Haken
 * zum Abschliessen, danach läuft die Pause. Darunter steht, was beim letzten
 * Mal war. Die Felder sind mit dem letzten Mal vorbelegt: wer jede Woche
 * dieselben 60 kg eintippt, trackt nach drei Wochen nicht mehr.
 *
 * RIR statt einer geschätzten Maximalkraft in der Tabelle. Die App steuert
 * die Anstrengung über Reserve, und eine Zahl wie "10RM 55,5" sagt beim
 * Training nichts, was man im Satz danach anders machen würde.
 *
 * Der Entwurf wird bei jeder Eingabe gespeichert. Ein Anruf mitten im
 * Training schliesst auf dem iPhone die App, und eine Einheit, die danach weg
 * ist, wird nicht nochmal eingetragen.
 *
 * Alles bis `trainingStarten` fasst weder `document` noch `window` an und ist
 * ohne Browser getestet.
 */
import { letzteEinheit } from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";
import { GERAETE, vorschauPfad } from "./uebungen.js";
import { tauschListe, uebungTauschen } from "./plaene.js";

const nachId = new Map(UEBUNGEN.map((u) => [u.id, u]));
const esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Ein Jahr Protokoll reicht für jede Auswertung und hält den Speicher klein. */
export const LOG_TAGE = 400;

/** Liest eine Zahl aus einem Feld, auch mit Komma. Leer ist null, nicht null Kilo. */
export function zahlAus(text) {
  const t = String(text ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const komma = (n) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

/** Die Zielwiederholungen als Zahl für die Vorbelegung: das untere Ende des Bereichs. */
function zielWdh(wdh) {
  const m = /^(\d+)/.exec(String(wdh));
  return m ? Number(m[1]) : null;
}

/**
 * Legt den Entwurf für eine Einheit an. Je Satz die Werte des letzten Mals
 * an derselben Stelle, sonst die Zielwiederholungen und die Zielreserve.
 */
export function entwurfNeu(plan, ei, log, heute, jetzt = new Date().toISOString()) {
  const einheit = plan.einheiten[ei];
  if (!einheit) return null;
  return {
    ei, titel: einheit.titel, datum: heute, start: jetzt, aktiv: 0,
    uebungen: einheit.positionen.map((p) => uebungImEntwurf(p, log, heute)),
  };
}

function uebungImEntwurf(p, log, heute) {
  const letzt = letzteEinheit(log, p.id, heute);
  return {
    id: p.id, name: p.name,
    ziel: { saetze: p.saetze, wdh: p.wdh, reserve: p.reserve, pauseSek: p.pauseSek },
    saetze: Array.from({ length: p.saetze }, (_, i) => {
      const vorher = letzt?.saetze[i] ?? letzt?.saetze[letzt.saetze.length - 1];
      return {
        kg: vorher ? vorher.kg : null,
        wdh: vorher ? vorher.wdh : zielWdh(p.wdh),
        rir: p.reserve,
        fertig: false,
      };
    }),
  };
}

/** Ändert einen Wert. Gibt einen neuen Entwurf zurück, der alte bleibt unberührt. */
export function satzSetzen(entwurf, ui, si, feld, wert) {
  return mitUebung(entwurf, ui, (u) => ({
    ...u, saetze: u.saetze.map((s, i) => (i === si ? { ...s, [feld]: wert } : s)),
  }));
}

export function satzAbhaken(entwurf, ui, si) {
  const s = entwurf.uebungen[ui]?.saetze[si];
  if (!s) return entwurf;
  return satzSetzen(entwurf, ui, si, "fertig", !s.fertig);
}

export function satzDazu(entwurf, ui) {
  return mitUebung(entwurf, ui, (u) => {
    const letzt = u.saetze[u.saetze.length - 1];
    return { ...u, saetze: [...u.saetze, { kg: letzt?.kg ?? null, wdh: letzt?.wdh ?? null, rir: letzt?.rir ?? u.ziel.reserve, fertig: false }] };
  });
}

export function satzWeg(entwurf, ui) {
  return mitUebung(entwurf, ui, (u) => (u.saetze.length > 1 ? { ...u, saetze: u.saetze.slice(0, -1) } : u));
}

function mitUebung(entwurf, ui, aendern) {
  return { ...entwurf, uebungen: entwurf.uebungen.map((u, i) => (i === ui ? aendern(u) : u)) };
}

/**
 * Tauscht eine Übung im laufenden Training und im Plan. Die Sätze fangen neu
 * an, denn 80 kg Bankdrücken sagen über Kurzhanteln nichts.
 */
export function entwurfTauschen(entwurf, plan, ui, neueId, log) {
  const neuerPlan = uebungTauschen(plan, entwurf.ei, ui, neueId);
  const p = neuerPlan.einheiten[entwurf.ei]?.positionen[ui];
  if (!p || p.id !== neueId) return { entwurf, plan };
  return { plan: neuerPlan, entwurf: mitUebung(entwurf, ui, () => uebungImEntwurf(p, log, entwurf.datum)) };
}

/**
 * Was daevo statt einer Übung vorschlägt: dieselbe Bewegung, nach Ort,
 * Beschwerden und Niveau gefiltert. Die ersten drei, damit es eine Wahl ist
 * und keine Liste.
 */
export function ersatzVorschlaege(plan, ei, id) {
  return tauschListe(plan, ei, id).slice(0, 3);
}

/**
 * Schreibt die abgehakten Sätze ins Protokoll. Ein Satz ohne Wiederholungen
 * zählt nicht, ein Satz ohne Gewicht zählt als Körpergewicht. Eine Übung
 * ohne einen einzigen fertigen Satz fehlt: nicht gemacht ist nicht null.
 */
export function entwurfAbschliessen(entwurf, log, jetzt = Date.now()) {
  const eintraege = entwurf.uebungen
    .map((u) => ({
      datum: entwurf.datum, uebung: u.id, einheit: entwurf.titel,
      saetze: u.saetze.filter((s) => s.fertig && s.wdh > 0).map((s) => ({ kg: s.kg ?? 0, wdh: s.wdh, rir: s.rir ?? null })),
    }))
    .filter((e) => e.saetze.length);
  // Dieselbe Übung am selben Tag in derselben Einheit ersetzt den alten Eintrag.
  // Wer die Einheit zweimal beendet, hat sie nicht zweimal gemacht.
  const schluessel = (e) => `${e.datum}|${e.einheit}|${e.uebung}`;
  const neu = new Set(eintraege.map(schluessel));
  const grenze = new Date(Date.parse(`${entwurf.datum}T00:00:00Z`) - LOG_TAGE * 86_400_000).toISOString().slice(0, 10);
  const naechster = [...log.filter((e) => !neu.has(schluessel(e)) && e.datum >= grenze), ...eintraege];
  const minuten = Math.max(1, Math.round((jetzt - Date.parse(entwurf.start)) / 60000));
  return { log: naechster, eintraege, minuten: Math.min(minuten, 240), saetze: eintraege.reduce((s, e) => s + e.saetze.length, 0) };
}

/** Ob im Entwurf schon etwas passiert ist. Ein leerer Entwurf wird ohne Rückfrage verworfen. */
export const entwurfBegonnen = (entwurf) => Boolean(entwurf?.uebungen?.some((u) => u.saetze.some((s) => s.fertig)));

const datumKurz = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

/* ---------- Darstellung ---------- */

export function trainingHtml(entwurf, log, { menue = false, vorschlaege = [], pause = null } = {}) {
  const u = entwurf.uebungen[entwurf.aktiv];
  if (!u) return "";
  const info = nachId.get(u.id);
  const leiste = entwurf.uebungen.map((x, i) => {
    const bild = nachId.get(x.id);
    const fertig = x.saetze.length && x.saetze.every((s) => s.fertig);
    return `<button type="button" class="tr-daumen${i === entwurf.aktiv ? " an" : ""}${fertig ? " fertig" : ""}" data-tr-gehe="${i}" aria-label="${esc(x.name)}">`
      + (bild ? `<img src="${esc(vorschauPfad(bild))}" alt="" loading="lazy" decoding="async">` : `<span>${esc(x.name.slice(0, 1))}</span>`)
      + "</button>";
  }).join("");
  const geraet = info ? GERAETE[info.equipment] ?? info.equipment : "";
  const zeilen = u.saetze.map((s, si) => `<div class="tr-satz${s.fertig ? " fertig" : ""}">
      <span class="tr-nr">${si + 1}</span>
      <input class="tr-feld" inputmode="decimal" enterkeyhint="next" aria-label="Kilo Satz ${si + 1}" placeholder="kg" value="${esc(komma(s.kg))}" data-tr-feld="kg" data-si="${si}">
      <input class="tr-feld" inputmode="numeric" enterkeyhint="next" aria-label="Wiederholungen Satz ${si + 1}" placeholder="Wdh" value="${esc(komma(s.wdh))}" data-tr-feld="wdh" data-si="${si}">
      <input class="tr-feld" inputmode="numeric" enterkeyhint="done" aria-label="Wiederholungen in Reserve Satz ${si + 1}" placeholder="RIR" value="${esc(komma(s.rir))}" data-tr-feld="rir" data-si="${si}">
      <button type="button" class="tr-haken" data-tr-haken="${si}" aria-pressed="${s.fertig}" aria-label="Satz ${si + 1} ${s.fertig ? "offen setzen" : "abschliessen"}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>
    </div>`).join("");
  const letzt = letzteEinheit(log, u.id, entwurf.datum);
  const vorher = letzt
    ? `<div class="tr-vorher"><p>${esc(datumKurz(letzt.datum))}${letzt.einheit ? ` · ${esc(letzt.einheit)}` : ""}</p>
        <div class="tr-vorher-kopf"><span>#</span><span>KG</span><span>WDH</span><span>RIR</span></div>
        ${letzt.saetze.map((s, i) => `<div class="tr-vorher-zeile"><span>${i + 1}</span><span>${esc(komma(s.kg))}</span><span>${s.wdh}</span><span>${s.rir ?? ""}</span></div>`).join("")}</div>`
    : `<p class="tr-erstes">Das erste Mal mit dieser Übung. Ab dem nächsten Mal steht hier, was du gemacht hast.</p>`;
  const menueHtml = menue
    ? `<div class="tr-menue" role="menu">
        <p class="tr-menue-titel">Ersetzen durch, für dieselbe Bewegung</p>
        ${vorschlaege.length
          ? vorschlaege.map((v, i) => `<button type="button" role="menuitem" class="tr-ersatz" data-tr-ersatz="${esc(v.id)}"><b>${esc(v.name)}</b><span>${esc(GERAETE[v.equipment] ?? v.equipment)}${i === 0 ? " · Vorschlag von daevo" : ""}</span></button>`).join("")
          : "<p class=\"tr-leer\">Für diese Bewegung gibt es keine andere Übung, die zu Ort, Niveau und Beschwerden passt.</p>"}
        <p class="tr-menue-hinweis">Der Tausch gilt ab jetzt auch im Plan.</p>
        <button type="button" role="menuitem" class="tr-ersatz" data-tr-anleitung="${esc(u.id)}"><b>Anleitung ansehen</b></button>
      </div>`
    : "";
  return `<div class="tr-leiste">${leiste}</div>
    <div class="tr-titelzeile"><h2 class="tr-name">${esc(u.name)}</h2>
      <button type="button" class="tr-mehr" data-tr-menue aria-expanded="${menue}" aria-label="Übung ersetzen oder Anleitung"><i></i><i></i><i></i></button></div>
    ${menueHtml}
    <p class="tr-ziel">${esc(geraet)}${geraet ? " · " : ""}${u.ziel.saetze} × ${esc(u.ziel.wdh)} Wdh · ${u.ziel.reserve} RIR</p>
    <div class="tr-tabelle">
      <div class="tr-kopf"><span>#</span><span>KG</span><span>WDH</span><span>RIR</span><span></span></div>
      ${zeilen}
      <div class="tr-satzknoepfe"><button type="button" class="pl-mini" data-tr-satz="dazu">Satz dazu</button>${u.saetze.length > 1 ? '<button type="button" class="pl-mini" data-tr-satz="weg">Satz weg</button>' : ""}</div>
    </div>
    ${vorher}
    <p class="tr-rir-hilfe">RIR heißt Wiederholungen in Reserve: wie viele noch gegangen wären, bevor nichts mehr geht.</p>
`;
}

/** Pause und Weiter. Steht unter dem Blatt und nicht im Scrollbereich, sonst liegt sie über den Sätzen. */
export function fussHtml(entwurf, pause = null) {
  const u = entwurf.uebungen[entwurf.aktiv];
  if (!u) return "";
  const letzteUebung = entwurf.aktiv === entwurf.uebungen.length - 1;
  const zeit = pause ? `${Math.floor(pause.rest / 60)}:${String(pause.rest % 60).padStart(2, "0")}` : "";
  return `<button type="button" class="tr-pause${pause ? " laeuft" : ""}" data-tr-pause aria-label="${pause ? "Pause beenden" : `Pause starten, ${u.ziel.pauseSek} Sekunden`}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 3h4"/></svg>${pause ? `<b>${zeit}</b>` : ""}</button>
    <button type="button" class="tr-weiter" data-tr-weiter>${letzteUebung ? "Training beenden" : "Nächste Übung"}</button>`;
}

/**
 * Das Gewicht des ersten Satzes gilt meist für alle. Es wandert in die
 * folgenden Sätze, solange dort nichts steht und sie nicht abgehakt sind.
 */
export function gewichtWeitergeben(entwurf, ui, si) {
  const u = entwurf.uebungen[ui];
  const kg = u?.saetze[si]?.kg;
  if (kg === null || kg === undefined) return entwurf;
  return mitUebung(entwurf, ui, (x) => ({
    ...x, saetze: x.saetze.map((s, i) => (i > si && !s.fertig && (s.kg === null || s.kg === undefined) ? { ...s, kg } : s)),
  }));
}

/* ---------- Oberfläche ---------- */

/**
 * `plan` liest und schreibt den gespeicherten Plan, `log` das Protokoll,
 * `entwurfSpeicher` die laufende Einheit. `fertig` bekommt Titel und Minuten,
 * damit die App das Training in den Tag schreibt.
 */
export function trainingStarten({ plan: planSpeicher, log: logSpeicher, entwurfSpeicher, heute, oeffne, melde, fertig, geaendert }) {
  const blatt = document.getElementById("trainingBlatt");
  const inhalt = document.getElementById("trainingInhalt");
  const fuss = document.getElementById("trainingFuss");
  const titel = document.getElementById("trainingTitel");
  let entwurf = entwurfSpeicher.lesen();
  let menue = false;
  let pause = null;
  let uhr = 0;

  const merken = () => entwurfSpeicher.schreiben(entwurf);
  const zeichnen = () => {
    if (!entwurf) return;
    titel.textContent = entwurf.titel;
    const plan = planSpeicher.lesen();
    const u = entwurf.uebungen[entwurf.aktiv];
    inhalt.innerHTML = trainingHtml(entwurf, logSpeicher.lesen(), {
      menue, pause, vorschlaege: menue && plan && u ? ersatzVorschlaege(plan, entwurf.ei, u.id) : [],
    });
    fuss.innerHTML = fussHtml(entwurf, pause);
  };
  const pauseStopp = () => { clearInterval(uhr); pause = null; };
  const pauseStart = (sek) => {
    clearInterval(uhr);
    pause = { rest: sek };
    uhr = setInterval(() => {
      pause.rest -= 1;
      if (pause.rest <= 0) {
        pauseStopp();
        try { navigator.vibrate?.([180, 80, 180]); } catch { /* nicht jedes Gerät kann vibrieren */ }
        melde("Pause vorbei");
      }
      const knopf = fuss.querySelector("[data-tr-pause] b");
      if (knopf && pause) knopf.textContent = `${Math.floor(pause.rest / 60)}:${String(pause.rest % 60).padStart(2, "0")}`;
      else zeichnen();
    }, 1000);
  };
  const oeffnen = () => { blatt.hidden = false; zeichnen(); };
  const schliessen = () => {
    pauseStopp(); menue = false; blatt.hidden = true;
    // Geschlossen ist nicht beendet: der Knopf zum Fortsetzen steht beim Plan.
    const offen = document.getElementById("plOffen");
    if (offen) offen.hidden = !entwurf;
  };

  const beenden = () => {
    if (!entwurfBegonnen(entwurf)) {
      entwurfSpeicher.schreiben(null);
      entwurf = null;
      schliessen();
      return;
    }
    const r = entwurfAbschliessen(entwurf, logSpeicher.lesen());
    logSpeicher.schreiben(r.log);
    fertig({ titel: entwurf.titel, minuten: r.minuten, saetze: r.saetze });
    entwurfSpeicher.schreiben(null);
    entwurf = null;
    schliessen();
    melde(`${r.saetze} Sätze gespeichert`);
  };

  inhalt.addEventListener("input", (event) => {
    const feld = event.target.closest("[data-tr-feld]");
    if (!feld || !entwurf) return;
    entwurf = satzSetzen(entwurf, entwurf.aktiv, Number(feld.dataset.si), feld.dataset.trFeld, zahlAus(feld.value));
    merken();
  });
  inhalt.addEventListener("change", (event) => {
    const feld = event.target.closest('[data-tr-feld="kg"]');
    if (!feld || !entwurf) return;
    entwurf = gewichtWeitergeben(entwurf, entwurf.aktiv, Number(feld.dataset.si));
    merken();
    // Nur die Felder setzen, nicht neu zeichnen: wer vom Gewicht ins Feld
    // für die Wiederholungen tippt, verlöre sonst den Fokus und die Eingabe.
    entwurf.uebungen[entwurf.aktiv].saetze.forEach((s, si) => {
      const kgFeld = inhalt.querySelector(`[data-tr-feld="kg"][data-si="${si}"]`);
      if (kgFeld && kgFeld !== document.activeElement && kgFeld.value === "" && s.kg !== null) kgFeld.value = komma(s.kg);
    });
  });
  const klick = (event) => {
    if (!entwurf) return;
    const z = (sel) => event.target.closest(sel);
    let k;
    if ((k = z("[data-tr-gehe]"))) { entwurf = { ...entwurf, aktiv: Number(k.dataset.trGehe) }; menue = false; }
    else if ((k = z("[data-tr-haken]"))) {
      const si = Number(k.dataset.trHaken);
      const warFertig = entwurf.uebungen[entwurf.aktiv].saetze[si].fertig;
      entwurf = satzAbhaken(entwurf, entwurf.aktiv, si);
      if (!warFertig) pauseStart(entwurf.uebungen[entwurf.aktiv].ziel.pauseSek);
    } else if ((k = z("[data-tr-satz]"))) {
      entwurf = k.dataset.trSatz === "dazu" ? satzDazu(entwurf, entwurf.aktiv) : satzWeg(entwurf, entwurf.aktiv);
    } else if (z("[data-tr-menue]")) menue = !menue;
    else if ((k = z("[data-tr-ersatz]"))) {
      const plan = planSpeicher.lesen();
      if (plan) {
        const r = entwurfTauschen(entwurf, plan, entwurf.aktiv, k.dataset.trErsatz, logSpeicher.lesen());
        entwurf = r.entwurf;
        planSpeicher.schreiben(r.plan);
        geaendert?.();
        melde(`Ersetzt durch ${entwurf.uebungen[entwurf.aktiv].name}`);
      }
      menue = false;
    } else if ((k = z("[data-tr-anleitung]"))) { merken(); schliessen(); oeffne(k.dataset.trAnleitung); return; }
    else if (z("[data-tr-pause]")) { if (pause) pauseStopp(); else pauseStart(entwurf.uebungen[entwurf.aktiv].ziel.pauseSek); }
    else if (z("[data-tr-weiter]")) {
      if (entwurf.aktiv >= entwurf.uebungen.length - 1) { beenden(); return; }
      entwurf = { ...entwurf, aktiv: entwurf.aktiv + 1 };
      menue = false;
      inhalt.scrollTop = 0;
    } else return;
    merken();
    zeichnen();
  };
  inhalt.addEventListener("click", klick);
  fuss.addEventListener("click", klick);
  document.getElementById("trainingZu").addEventListener("click", schliessen);
  document.getElementById("trainingEnde").addEventListener("click", beenden);

  return {
    /** Startet eine Einheit. Ein laufender Entwurf derselben Einheit wird fortgesetzt. */
    starten(ei) {
      const plan = planSpeicher.lesen();
      if (!plan) return;
      if (!(entwurf && entwurf.ei === ei && entwurf.datum === heute())) {
        if (entwurfBegonnen(entwurf)) melde(`${entwurf.titel} war noch offen und ist verworfen`);
        entwurf = entwurfNeu(plan, ei, logSpeicher.lesen(), heute());
      }
      menue = false;
      merken();
      oeffnen();
    },
    /** Ein offener Entwurf von heute, etwa nach einem Neustart der App. */
    offen: () => (entwurf && entwurf.datum === heute() ? entwurf : null),
    fortsetzen() { if (entwurf) oeffnen(); },
  };
}
