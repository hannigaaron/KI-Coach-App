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
import { alternativen, letzteEinheit, positionFuer, uebungErlaubt } from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";
import { spueren } from "./haptik.js";
import { GERAETE, uebungenFiltern, vorschauPfad } from "./uebungen.js";
import { STANDARD_WUNSCH, tauschListe, uebungTauschen } from "./plaene.js";

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

/* ---------- Freies Training ---------- */

/**
 * Ein Training ohne Plan. Wer heute etwas anderes macht als geplant, oder
 * gar keinen Plan hat, soll trotzdem jeden Satz festhalten können. Ohne das
 * stünde im Protokoll nur, was der Plan vorsah, und die Prüfung nach acht
 * Wochen rechnete mit der halben Wahrheit.
 *
 * Gespeichert wird genauso wie eine Einheit aus dem Plan, nur unter dem
 * Titel "Freies Training". Damit zählt jeder Satz für den Fortschritt der
 * Übung, egal in welchem Training er gemacht wurde.
 */
export const FREI_TITEL = "Freies Training";

export function entwurfFrei(heute, jetzt = new Date().toISOString()) {
  return { ei: -1, frei: true, titel: FREI_TITEL, datum: heute, start: jetzt, aktiv: 0, uebungen: [] };
}

/**
 * Nimmt eine Übung dazu. Die Dosis kommt aus derselben Regel wie beim Plan,
 * `positionFuer`. War die Übung schon einmal dran, kommen so viele Sätze wie
 * beim letzten Mal, vorbelegt mit dessen Werten. Steht sie schon im
 * Training, springt die Ansicht nur zu ihr.
 */
export function uebungHinzu(entwurf, id, log, wunsch = STANDARD_WUNSCH) {
  const u = nachId.get(id);
  if (!u) return entwurf;
  const schon = entwurf.uebungen.findIndex((x) => x.id === id);
  if (schon >= 0) return { ...entwurf, aktiv: schon };
  const p = positionFuer(u, wunsch);
  const letzt = letzteEinheit(log, id, entwurf.datum);
  const pos = letzt ? { ...p, saetze: Math.max(1, Math.min(8, letzt.saetze.length)) } : p;
  const uebungen = [...entwurf.uebungen, uebungImEntwurf(pos, log, entwurf.datum)];
  return { ...entwurf, uebungen, aktiv: uebungen.length - 1 };
}

export function uebungRaus(entwurf, ui) {
  const uebungen = entwurf.uebungen.filter((_, i) => i !== ui);
  return { ...entwurf, uebungen, aktiv: Math.max(0, Math.min(entwurf.aktiv, uebungen.length - 1)) };
}

/**
 * Was sich hinzufügen lässt, nach Suchtext, Ort und Beschwerden. Ohne
 * Suchtext stehen die zuletzt gemachten Übungen vorn: wer frei trainiert,
 * macht meist, was er kennt.
 */
export function auswahlListe(text, entwurf, log, wunsch = STANDARD_WUNSCH, grenze = 30) {
  const drin = new Set(entwurf.uebungen.map((u) => u.id));
  const zuletzt = [];
  for (const e of [...log].sort((a, b) => b.datum.localeCompare(a.datum))) if (!zuletzt.includes(e.uebung)) zuletzt.push(e.uebung);
  const rang = (u) => { const i = zuletzt.indexOf(u.id); return i < 0 ? Infinity : i; };
  return uebungenFiltern({ text })
    .filter((u) => !drin.has(u.id) && uebungErlaubt(u, wunsch))
    .sort((a, b) => (text ? 0 : rang(a) - rang(b)) || a.name.localeCompare(b.name, "de"))
    .slice(0, grenze)
    .map((u) => ({ ...u, zuletzt: zuletzt.includes(u.id) }));
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
  if (entwurf.frei) {
    const u = nachId.get(neueId);
    const alt = entwurf.uebungen[ui];
    if (!u || !alt) return { entwurf, plan };
    const p = { id: u.id, name: u.name, saetze: alt.ziel.saetze, wdh: alt.ziel.wdh, pauseSek: alt.ziel.pauseSek, reserve: alt.ziel.reserve };
    return { plan, entwurf: mitUebung(entwurf, ui, () => uebungImEntwurf(p, log, entwurf.datum)) };
  }
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
export function ersatzVorschlaege(plan, ei, id, entwurf = null) {
  if (entwurf?.frei) {
    const ersatzPlan = { wunsch: plan?.wunsch ?? STANDARD_WUNSCH, einheiten: [{ positionen: entwurf.uebungen }] };
    return alternativen(ersatzPlan, 0, id, UEBUNGEN).slice(0, 3);
  }
  return tauschListe(plan, ei, id).slice(0, 3);
}

/** Die Auswahl zum Hinzufügen: ein Suchfeld und die Liste darunter. */
export function auswahlHtml(liste, text = "") {
  return `<div class="tr-auswahl">
      <p class="tr-menue-titel">Übung hinzufügen</p>
      <input type="search" class="tr-suche" data-tr-suche placeholder="Übung, Muskel oder Gerät" value="${esc(text)}" autocomplete="off" autocapitalize="none" spellcheck="false">
      <div class="tr-auswahl-liste">${auswahlListeHtml(liste)}</div>
    </div>`;
}

export function auswahlListeHtml(liste) {
  if (!liste.length) return '<p class="tr-leer">Keine passende Übung gefunden.</p>';
  return liste.map((u) => `<button type="button" class="tr-wahl" data-tr-dazu="${esc(u.id)}">`
    + `<img src="${esc(vorschauPfad(u))}" alt="" loading="lazy" decoding="async" width="40" height="50">`
    + `<span><b>${esc(u.name)}</b><small>${esc(GERAETE[u.equipment] ?? u.equipment)}${u.zuletzt ? " · zuletzt gemacht" : ""}</small></span></button>`).join("");
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

export function trainingHtml(entwurf, log, { menue = false, vorschlaege = [], pause = null, waehlen = false, auswahl = [], suche = "" } = {}) {
  const u = entwurf.uebungen[entwurf.aktiv];
  if (!u) {
    return `<p class="tr-erstes">Freies Training ohne Plan. Nimm die Übungen dazu, die du heute machst. Jeder Satz wird gespeichert und zählt für deinen Fortschritt.</p>${auswahlHtml(auswahl, suche)}`;
  }
  const info = nachId.get(u.id);
  const leiste = entwurf.uebungen.map((x, i) => {
    const bild = nachId.get(x.id);
    const fertig = x.saetze.length && x.saetze.every((s) => s.fertig);
    return `<button type="button" class="tr-daumen${i === entwurf.aktiv ? " an" : ""}${fertig ? " fertig" : ""}" data-tr-gehe="${i}" aria-label="${esc(x.name)}">`
      + (bild ? `<img src="${esc(vorschauPfad(bild))}" alt="" loading="lazy" decoding="async">` : `<span>${esc(x.name.slice(0, 1))}</span>`)
      + "</button>";
  }).join("") + `<button type="button" class="tr-daumen tr-plus${waehlen ? " an" : ""}" data-tr-waehlen aria-label="Übung hinzufügen"><span>+</span></button>`;
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
        <p class="tr-menue-hinweis">${entwurf.frei ? "Der Tausch gilt für dieses Training." : "Der Tausch gilt ab jetzt auch im Plan."}</p>
        ${entwurf.frei ? `<button type="button" role="menuitem" class="tr-ersatz" data-tr-raus><b>Aus diesem Training entfernen</b></button>` : ""}
        <button type="button" role="menuitem" class="tr-ersatz" data-tr-anleitung="${esc(u.id)}"><b>Anleitung ansehen</b></button>
      </div>`
    : "";
  if (waehlen) return `<div class="tr-leiste">${leiste}</div>${auswahlHtml(auswahl, suche)}`;
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
export function fussHtml(entwurf, pause = null, waehlen = false) {
  const u = entwurf.uebungen[entwurf.aktiv];
  if (!u) return "";
  const letzteUebung = entwurf.aktiv === entwurf.uebungen.length - 1;
  const zeit = pause ? `${Math.floor(pause.rest / 60)}:${String(pause.rest % 60).padStart(2, "0")}` : "";
  // Bei offener Auswahl nur die Pause: "Weitere Übung" unter der Auswahl
  // wäre ein Knopf für das, was man gerade schon tut.
  const weiter = letzteUebung ? (entwurf.frei ? "Weitere Übung" : "Training beenden") : "Nächste Übung";
  return `<button type="button" class="tr-pause${pause ? " laeuft" : ""}" data-tr-pause aria-label="${pause ? "Pause beenden" : `Pause starten, ${u.ziel.pauseSek} Sekunden`}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 13V9M10 3h4"/></svg>${pause ? `<b>${zeit}</b>` : ""}</button>
    ${waehlen ? "" : `<button type="button" class="tr-weiter" data-tr-weiter>${weiter}</button>`}`;
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
  // Ob die Auswahl zum Hinzufügen offen ist, und was im Suchfeld steht.
  let waehlen = false;
  let suche = "";
  const wunsch = () => planSpeicher.lesen()?.wunsch ?? STANDARD_WUNSCH;
  const auswahl = () => (entwurf ? auswahlListe(suche, entwurf, logSpeicher.lesen(), wunsch()) : []);

  const merken = () => entwurfSpeicher.schreiben(entwurf);
  const zeichnen = () => {
    if (!entwurf) return;
    titel.textContent = entwurf.titel;
    const plan = planSpeicher.lesen();
    const u = entwurf.uebungen[entwurf.aktiv];
    const offenWahl = waehlen || !u;
    inhalt.innerHTML = trainingHtml(entwurf, logSpeicher.lesen(), {
      menue, pause, waehlen: offenWahl, suche, auswahl: offenWahl ? auswahl() : [],
      vorschlaege: menue && u && (plan || entwurf.frei) ? ersatzVorschlaege(plan, entwurf.ei, u.id, entwurf) : [],
    });
    fuss.innerHTML = fussHtml(entwurf, pause, offenWahl);
    // Ohne Übung gibt es weder Pause noch Weiter. Eine leere Leiste sähe aus
    // wie ein Knopf, der nicht geladen hat.
    fuss.hidden = !fuss.innerHTML;
  };
  const pauseStopp = () => { clearInterval(uhr); pause = null; };
  const pauseStart = (sek) => {
    clearInterval(uhr);
    pause = { rest: sek };
    uhr = setInterval(() => {
      pause.rest -= 1;
      if (pause.rest <= 0) {
        pauseStopp();
        spueren("hinweis");
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
    spueren("erfolg");
    melde(`${r.saetze} Sätze gespeichert`);
  };

  inhalt.addEventListener("input", (event) => {
    // Die Suche zeichnet nur die Liste neu. Das Feld selbst bliebe sonst
    // nach jedem Buchstaben ohne Fokus.
    if (event.target.matches("[data-tr-suche]")) {
      suche = event.target.value;
      const liste = inhalt.querySelector(".tr-auswahl-liste");
      if (liste) liste.innerHTML = auswahlListeHtml(auswahl());
      return;
    }
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
    if ((k = z("[data-tr-gehe]"))) { entwurf = { ...entwurf, aktiv: Number(k.dataset.trGehe) }; menue = false; waehlen = false; }
    else if (z("[data-tr-waehlen]")) { waehlen = !waehlen; menue = false; suche = ""; }
    else if ((k = z("[data-tr-dazu]"))) {
      entwurf = uebungHinzu(entwurf, k.dataset.trDazu, logSpeicher.lesen(), wunsch());
      waehlen = false; suche = ""; inhalt.scrollTop = 0;
    } else if (z("[data-tr-raus]")) { entwurf = uebungRaus(entwurf, entwurf.aktiv); menue = false; }
    else if ((k = z("[data-tr-haken]"))) {
      const si = Number(k.dataset.trHaken);
      const warFertig = entwurf.uebungen[entwurf.aktiv].saetze[si].fertig;
      entwurf = satzAbhaken(entwurf, entwurf.aktiv, si);
      if (!warFertig) { spueren("leicht"); pauseStart(entwurf.uebungen[entwurf.aktiv].ziel.pauseSek); }
    } else if ((k = z("[data-tr-satz]"))) {
      entwurf = k.dataset.trSatz === "dazu" ? satzDazu(entwurf, entwurf.aktiv) : satzWeg(entwurf, entwurf.aktiv);
    } else if (z("[data-tr-menue]")) menue = !menue;
    else if ((k = z("[data-tr-ersatz]"))) {
      const plan = planSpeicher.lesen();
      if (plan || entwurf.frei) {
        const r = entwurfTauschen(entwurf, plan, entwurf.aktiv, k.dataset.trErsatz, logSpeicher.lesen());
        entwurf = r.entwurf;
        if (!entwurf.frei) { planSpeicher.schreiben(r.plan); geaendert?.(); }
        melde(`Ersetzt durch ${entwurf.uebungen[entwurf.aktiv].name}`);
      }
      menue = false;
    } else if ((k = z("[data-tr-anleitung]"))) { merken(); schliessen(); oeffne(k.dataset.trAnleitung); return; }
    else if (z("[data-tr-pause]")) { if (pause) pauseStopp(); else pauseStart(entwurf.uebungen[entwurf.aktiv].ziel.pauseSek); }
    else if (z("[data-tr-weiter]")) {
      // Im freien Training gibt es kein Ende der Liste: die letzte Übung führt
      // zur Auswahl, beendet wird oben.
      if (entwurf.aktiv >= entwurf.uebungen.length - 1) {
        if (!entwurf.frei) { beenden(); return; }
        waehlen = true; suche = ""; menue = false;
        merken(); zeichnen();
        return;
      }
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
    /** Ein freies Training ohne Plan. Ein offenes von heute wird fortgesetzt. */
    frei() {
      if (!(entwurf?.frei && entwurf.datum === heute())) {
        if (entwurfBegonnen(entwurf)) melde(`${entwurf.titel} war noch offen und ist verworfen`);
        entwurf = entwurfFrei(heute());
      }
      menue = false; waehlen = false; suche = "";
      merken();
      oeffnen();
    },
    /**
     * Eine fertige Einheit, die nicht im Plan steht, etwa das Training für
     * heute. Läuft wie ein freies Training: Ersetzen und Entfernen ändern den
     * Plan nicht.
     */
    einheit(e) {
      if (entwurfBegonnen(entwurf) && !(entwurf.frei && entwurf.titel === e.titel && entwurf.datum === heute())) {
        melde(`${entwurf.titel} war noch offen und ist verworfen`);
      }
      const neu = entwurfNeu({ einheiten: [e] }, 0, logSpeicher.lesen(), heute());
      entwurf = { ...neu, ei: -1, frei: true };
      menue = false; waehlen = false; suche = "";
      merken();
      oeffnen();
    },
    /** Ein offener Entwurf von heute, etwa nach einem Neustart der App. */
    offen: () => (entwurf && entwurf.datum === heute() ? entwurf : null),
    fortsetzen() { if (entwurf) oeffnen(); },
  };
}
