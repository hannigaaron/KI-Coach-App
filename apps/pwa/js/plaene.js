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
import {
  BESCHWERDE_NAME, FOKUS_NAME, FOKUS_PARTIEN, PARTIEN, einzeltrainingBauen, fehlendePartien, wocheTrainiert, alternativen, planAktualisieren, planNachrechnen, positionFuer, uebungErlaubt, uebungsplanBauen, uebungsplanText,
} from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";
import { GRUPPEN, vorschauPfad } from "./uebungen.js";
import { trendKurz } from "./uebungskurve.js";
import { naechsteEinheit } from "./vorhaben.js";

export const STANDARD_WUNSCH = {
  tage: 3, minuten: 45, niveau: "intermediate", ziel: "muskel", deload: false, variante: 0,
  ort: "studio", beschwerden: [], meiden: [], fokus: [],
};

export const FOKUS = FOKUS_PARTIEN;
/** Mehr als zwei Partien zuerst heisst: keine zuerst. */
export const FOKUS_MAX = 2;

export const BESCHWERDEN = Object.keys(BESCHWERDE_NAME);

export const FELDER = [
  { feld: "tage", name: "Tage pro Woche", werte: [1, 2, 3, 4, 5].map((w) => ({ wert: w, text: String(w) })) },
  { feld: "minuten", name: "Minuten pro Einheit", werte: [30, 45, 60, 75, 90].map((w) => ({ wert: w, text: String(w) })) },
  {
    feld: "niveau", name: "Erfahrung",
    werte: [{ wert: "beginner", text: "Einsteiger" }, { wert: "intermediate", text: "Fortgeschritten" }, { wert: "advanced", text: "Erfahren" }],
  },
  {
    feld: "ziel", name: "Ziel",
    werte: [{ wert: "muskel", text: "Muskelaufbau" }, { wert: "kraft", text: "Kraft" }, { wert: "fitness", text: "Fitness" }],
  },
  {
    feld: "ort", name: "Wo du trainierst",
    werte: [{ wert: "studio", text: "Studio" }, { wert: "zuhause", text: "Zuhause, Kurzhanteln" }, { wert: "ohne", text: "Ohne Geräte" }],
  },
];

const nachId = new Map(UEBUNGEN.map((u) => [u.id, u]));

const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Prüft ein gespeichertes oder eingegebenes Wunschobjekt und füllt Lücken mit den Standardwerten. */
export function wunschPruefen(roh) {
  const w = { ...STANDARD_WUNSCH, ...(roh && typeof roh === "object" ? roh : {}) };
  for (const f of FELDER) {
    if (!f.werte.some((x) => x.wert === w[f.feld])) w[f.feld] = STANDARD_WUNSCH[f.feld];
  }
  w.deload = Boolean(w.deload);
  w.variante = Number.isInteger(w.variante) && w.variante >= 0 ? w.variante : 0;
  w.beschwerden = (Array.isArray(w.beschwerden) ? w.beschwerden : []).filter((b) => BESCHWERDEN.includes(b));
  w.meiden = (Array.isArray(w.meiden) ? w.meiden : []).filter((id) => nachId.has(id));
  w.fokus = (Array.isArray(w.fokus) ? w.fokus : []).filter((f) => FOKUS.includes(f)).slice(0, FOKUS_MAX);
  return w;
}

export function planFuer(wunsch) {
  return uebungsplanBauen(wunschPruefen(wunsch), UEBUNGEN);
}

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
  // Mehrfachwahl: jede Stelle für sich an oder aus. Ein Plan, der Knie und
  // Schulter schonen soll, braucht beides gleichzeitig.
  const beschwerden = BESCHWERDEN
    .map((b) => {
      const an = wunsch.beschwerden.includes(b);
      return `<button type="button" class="ue-tab${an ? " on" : ""}" data-beschwerde="${b}" aria-pressed="${an}">${esc(BESCHWERDE_NAME[b])}</button>`;
    })
    .join("");
  const schmerz = `<div class="pl-feld"><p class="pl-name">Beschwerden</p><div class="pl-reihe">${beschwerden}</div></div>`;
  const fokusKnoepfe = FOKUS
    .map((f) => {
      const an = wunsch.fokus.includes(f);
      return `<button type="button" class="ue-tab${an ? " on" : ""}" data-fokus="${f}" aria-pressed="${an}">${esc(FOKUS_NAME[f])}</button>`;
    })
    .join("");
  const fokus = `<div class="pl-feld"><p class="pl-name">Am wichtigsten, kommt zuerst (bis zu zwei)</p><div class="pl-reihe">${fokusKnoepfe}</div></div>`;
  const deload = `<label class="pl-deload"><input type="checkbox" id="plDeload"${wunsch.deload ? " checked" : ""}><span>Entlastungswoche</span><small>Halbe Satzzahl, mehr Reserve</small></label>`;
  return reihen.join("") + fokus + schmerz + deload;
}

/** Zwei Pfeile im Kreis, dieselbe Linienfamilie wie die übrigen Zeichen. */
const TAUSCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h12l-3-3M19 15H7l3 3"/></svg>';

/**
 * Eine Zeile der Liste. Rechts steht immer das Tauschzeichen: wer eine
 * einzelne Übung nicht will, soll nicht die ganze Einheit neu würfeln
 * müssen. `tauschAttr` sagt, welche Daten der Knopf trägt, denn der Plan
 * und das Training für heute tauschen über verschiedene Wege.
 */
export function zeileHtml(p, { bearbeiten = false, ei = 0, pi = 0, tausch = null, tauschAttr = null, ohneTausch = false, trend = null } = {}) {
  const u = nachId.get(p.id);
  const bild = u ? `<img class="pl-bild" src="${esc(vorschauPfad(u))}" alt="" width="56" height="70" loading="lazy" decoding="async">` : "";
  const pause = p.pauseSek < 90 ? `${p.pauseSek} s` : `${String(p.pauseSek / 60).replace(".", ",")} min`;
  const ort = `data-ei="${ei}" data-pi="${pi}"`;
  const attr = tauschAttr ?? `data-aktion="tauschen" ${ort}`;
  const offen = tausch && tausch.ei === ei && tausch.pi === pi;
  const zeile = `<div class="pl-zeile-rahmen"><button type="button" class="pl-zeile" data-uebung="${esc(p.id)}">${bild}
    <span class="pl-text"><b>${esc(p.name)}</b><span>${p.saetze} × ${esc(p.wdh)}<i></i>Pause ${pause}<i></i>${p.reserve} in Reserve</span>${trend ? trend(p.id) : ""}</span></button>
    ${ohneTausch ? "" : `<button type="button" class="pl-tausch-knopf" ${attr} aria-expanded="${Boolean(offen)}" aria-label="${esc(p.name)} tauschen">${TAUSCH_SVG}</button>`}</div>`;
  const nehmenAttr = (a) => (tauschAttr ? `data-heute-nehmen="${esc(a.id)}" data-alt="${esc(p.id)}"` : `data-aktion="nehmen" data-id="${esc(a.id)}" ${ort}`);
  const auswahl = offen
    ? `<div class="pl-tausch">${tausch.liste.length
      ? tausch.liste.map((a) => `<button type="button" class="ue-tab" ${nehmenAttr(a)}>${esc(a.name)}</button>`).join("")
      : "<p>Für diese Bewegung gibt es hier keine andere Übung, die zu Ort und Beschwerden passt.</p>"}</div>`
    : "";
  if (!bearbeiten) return `<li${offen ? ' class="pl-offen"' : ""}>${zeile}${auswahl}</li>`;
  const werkzeug = `<div class="pl-werkzeug">
      <span class="pl-saetze-wahl"><button type="button" data-aktion="weniger" ${ort} aria-label="Ein Satz weniger">−</button>
      <b>${p.saetze} Sätze</b><button type="button" data-aktion="mehr" ${ort} aria-label="Ein Satz mehr">+</button></span>
      <button type="button" class="pl-mini" data-aktion="entfernen" ${ort}>Entfernen</button>
    </div>`;
  return `<li class="pl-bearbeiten">${zeile}${werkzeug}${auswahl}</li>`;
}

export function einheitHtml(e, ei = 0, { bearbeitet = -1, tausch = null, zusatz = [], ohneKnoepfe = false, nurStart = false, startAttr = null, trend = null } = {}) {
  const an = bearbeitet === ei;
  // Unter Anpassen ist der Plan eine Vorschau: dort wird nichts gestartet
  // und nichts bearbeitet, sonst liefe ein Training aus einem Plan, der
  // noch gar nicht gilt.
  const startKnopf = `<button type="button" class="pl-mini pl-start" ${startAttr ?? `data-tr-start="${ei}"`}>Starten</button>`;
  const knopf = ohneKnoepfe ? ""
    : nurStart ? `<div class="pl-knoepfe">${startKnopf}</div>`
    : `<div class="pl-knoepfe">${an ? "" : startKnopf}<button type="button" class="pl-mini pl-bearb" data-bearbeiten="${ei}">${an ? "Fertig" : "Bearbeiten"}</button></div>`;
  const dazu = an && zusatz.length
    ? `<label class="pl-dazu"><span>Übung hinzufügen</span><select data-dazu="${ei}"><option value="">Auswählen</option>${
      zusatz.map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("")}</select></label>`
    : "";
  return `<section class="pl-einheit"><header><div><h3>${esc(e.titel)}</h3><p>${esc(e.fokus)} · etwa ${e.dauerMin} Min.</p></div>${knopf}</header>
    <ol class="pl-liste">${e.positionen.map((p, pi) => zeileHtml(p, { bearbeiten: an, ei, pi, tausch, trend, ohneTausch: ohneKnoepfe || nurStart })).join("")}</ol>${dazu}</section>`;
}

/* ---------- Von Hand ändern ---------- */

/**
 * Jede Änderung geht über diese Funktionen und danach durch
 * `planNachrechnen`, damit Dauer und Sätze pro Woche zur Liste passen. Der
 * Plan wird kopiert und nicht verändert: wer bearbeitet und den Plan danach
 * nicht speichert, soll den gespeicherten unverändert wiederfinden.
 */
function mitEinheit(plan, ei, aendern) {
  const einheiten = plan.einheiten.map((e, i) => (i === ei ? { ...e, positionen: aendern([...e.positionen]) } : e));
  return planNachrechnen({ ...plan, einheiten, bearbeitet: true }, UEBUNGEN);
}

export function saetzeAendern(plan, ei, pi, delta) {
  return mitEinheit(plan, ei, (pos) => {
    const p = pos[pi];
    if (p) pos[pi] = { ...p, saetze: Math.max(1, Math.min(8, p.saetze + delta)) };
    return pos;
  });
}

export function uebungEntfernen(plan, ei, pi) {
  return mitEinheit(plan, ei, (pos) => pos.filter((_, i) => i !== pi));
}

/** Tauscht die Übung und behält Sätze, Wiederholungen und Pause: die Rolle im Plan bleibt dieselbe. */
export function uebungTauschen(plan, ei, pi, neueId) {
  const neu = nachId.get(neueId);
  if (!neu) return plan;
  return mitEinheit(plan, ei, (pos) => {
    const p = pos[pi];
    if (p) pos[pi] = { ...p, id: neu.id, name: neu.name };
    return pos;
  });
}

/** Verschiebt eine Übung innerhalb einer Einheit, etwa wenn im Studio ein Gerät besetzt ist. */
export function positionVerschieben(plan, ei, von, nach) {
  return mitEinheit(plan, ei, (pos) => {
    if (von < 0 || von >= pos.length || nach < 0 || nach >= pos.length || von === nach) return pos;
    const [p] = pos.splice(von, 1);
    pos.splice(nach, 0, p);
    return pos;
  });
}

export function uebungHinzufuegen(plan, ei, id) {
  const u = nachId.get(id);
  if (!u) return plan;
  return mitEinheit(plan, ei, (pos) => (pos.some((p) => p.id === id) ? pos : [...pos, positionFuer(u, plan.wunsch)]));
}

export function tauschListe(plan, ei, id) {
  return alternativen(plan, ei, id, UEBUNGEN).slice(0, 8);
}

/** Was sich einer Einheit noch hinzufügen lässt, nach Ort und Beschwerden, alphabetisch. */
export function zusatzListe(plan, ei) {
  const schon = new Set((plan.einheiten[ei]?.positionen ?? []).map((p) => p.id));
  return UEBUNGEN.filter((u) => !schon.has(u.id) && uebungErlaubt(u, plan.wunsch))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
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

/**
 * Die Karte nach der Prüfung nach acht Wochen. Sie bleibt zwei Wochen stehen
 * oder bis sie weggetippt wird: wer den Plan erst am Trainingstag öffnet,
 * soll trotzdem lesen, warum dort andere Übungen stehen.
 */
export function aktualisierungHtml(plan, heute) {
  const a = plan?.aktualisierung;
  if (!a || a.gesehen || !a.text) return "";
  const alter = Math.round((Date.parse(`${heute}T00:00:00Z`) - Date.parse(`${a.datum}T00:00:00Z`)) / 86_400_000);
  if (alter > 14) return "";
  const zeilen = a.text.split("\n").map((z) => `<p>${esc(z)}</p>`).join("");
  return `<div class="pl-update"><b>Übung getauscht nach acht Wochen Stillstand</b>${zeilen}<div class="pl-update-knoepfe">`
    + `<button type="button" class="pl-mini" data-update="ok">Verstanden</button>`
    + (a.vorher ? `<button type="button" class="pl-mini" data-update="zurueck">Alten Plan behalten</button>` : "")
    + "</div></div>";
}

/**
 * Prüft einen gespeicherten Plan nach acht Wochen. Gibt den neuen Plan
 * zurück, wenn sich etwas geändert hat, sonst null. Der alte Stand der
 * Einheiten reist mit, damit "Alten Plan behalten" ihn zurückholen kann.
 */
export function planPruefen(plan, log, heute) {
  if (!plan) return null;
  const r = planAktualisieren(plan, log, UEBUNGEN, heute);
  if (!r.faellig) return null;
  return {
    ...r.plan,
    aktualisierung: { datum: heute, text: r.text, vorher: r.getauscht.length ? plan.einheiten : null, gesehen: false },
  };
}

/* ---------- Ein Plan für zwölf Wochen ---------- */

/**
 * Ein Plan läuft zwölf Wochen. Wer jede Woche neu wählt, misst nie, ob er an
 * denselben Übungen stärker wird, und genau daran hängt die Prüfung nach
 * acht Wochen. Zwölf und nicht acht, damit nach der Prüfung noch vier Wochen
 * mit den getauschten Übungen bleiben. Eine Regel von Coach Aaron.
 */
export const PLAN_WOCHEN = 12;

const tagAus = (iso) => Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`);

/** Der erste Tag des Plans, JJJJ-MM-TT. Ältere Pläne kennen nur `gespeichertAm`. */
export function planBeginn(plan) {
  const roh = plan?.beginn || plan?.gespeichertAm;
  return roh && Number.isFinite(tagAus(roh)) ? String(roh).slice(0, 10) : null;
}

/** In welcher Woche der Plan steht, 1 bis 12, und ob er durch ist. */
export function planWoche(plan, heute) {
  const beginn = planBeginn(plan);
  if (!beginn) return { woche: 1, von: PLAN_WOCHEN, fertig: false };
  const tage = Math.max(0, Math.floor((tagAus(heute) - tagAus(beginn)) / 86_400_000));
  const woche = Math.floor(tage / 7) + 1;
  return { woche: Math.min(woche, PLAN_WOCHEN), von: PLAN_WOCHEN, fertig: woche > PLAN_WOCHEN };
}

/** Steht in `vorhaben.js`, damit Briefing und Coach dieselbe Einheit nennen. */
export { naechsteEinheit };

/** Der Kopf des Plans: Woche, Fortschritt und die nächste Einheit gross. */
export function planKopfHtml(plan, { woche, naechste, kurz = false }) {
  const e = plan.einheiten[naechste];
  const anteil = Math.round((Math.min(woche.woche, PLAN_WOCHEN) / PLAN_WOCHEN) * 100);
  const dauer = plan.einheiten.map((x) => x.dauerMin);
  const schnitt = dauer.length ? Math.round(dauer.reduce((a, b) => a + b, 0) / dauer.length) : 0;
  const ueber = kurz ? "Kurzplan diese Woche" : `Dein Plan · Woche ${woche.woche} von ${woche.von}`;
  const fertig = !kurz && woche.fertig
    ? `<p class="pl-fertig">Deine zwölf Wochen sind um. Unter Anpassen rechnet daevo dir den nächsten Plan, deine Gewichte bleiben gespeichert.</p>`
    : "";
  return `<div class="pl-plankopf">
    <p class="pl-ueber">${esc(ueber)}</p>
    ${kurz ? "" : `<div class="pl-fortschritt" role="img" aria-label="Woche ${woche.woche} von ${woche.von}"><span style="width:${anteil}%"></span></div>`}
    <p class="pl-umfang">${plan.einheiten.length} ${plan.einheiten.length === 1 ? "Einheit" : "Einheiten"} pro Woche, etwa ${schnitt} Min.${plan.bearbeitet ? " · von dir angepasst" : ""}</p>
    ${fertig}
    ${e ? `<div class="pl-naechste"><div><small>Als Nächstes</small><b>${esc(e.titel)}</b><span>${esc(e.fokus)} · ${e.positionen.length} Übungen</span></div>
      <button type="button" class="primary" ${kurz ? `data-kurz-start="${naechste}"` : `data-tr-start="${naechste}"`}>Starten</button></div>` : ""}
  </div>`;
}

/** Ohne gespeicherten Plan: was der Plan ist und ein Knopf, der ihn anlegt. */
export function planEinstiegHtml() {
  return `<div class="pl-plankopf pl-einstieg">
    <p class="pl-ueber">Dein Trainingsplan</p>
    <h3>Ein Plan, der zu deinem Alltag passt</h3>
    <p>Sag daevo, wie oft und wie lange du trainierst, wo und was dir wichtig ist. Daraus rechnet daevo deinen Plan für die nächsten zwölf Wochen. Er bleibt gespeichert, und jedes Training startet mit deinen Gewichten, Wiederholungen und RIR vom letzten Mal.</p>
    <button type="button" class="primary breit" data-pl-anpassen>Plan erstellen</button>
  </div>`;
}

/* ---------- Der Kurzplan für stressige Wochen ---------- */

export const KURZ_MINUTEN = [30, 45];
export const KURZ_TAGE = [2, 3];

/**
 * Ein zweiter Plan für Wochen, in denen der normale nicht reinpasst. Immer
 * Ganzkörper, weil bei zwei oder drei kurzen Einheiten jede Partie zweimal
 * dran sein soll, und mit demselben Niveau, Ort, Beschwerden und Ziel wie
 * der normale Plan. Ein Fokus fällt weg: in 30 Minuten zählen die fünf
 * Grundbewegungen. Die Titel tragen "kurz", sonst mischte das Protokoll
 * die Einheiten beider Pläne bei der nächsten Einheit und beim letzten Mal.
 */
export function kurzplanFuer(basis, { minuten = 30, tage = 2, gruppen = [] } = {}) {
  const w = wunschPruefen({
    ...basis,
    minuten: KURZ_MINUTEN.includes(minuten) ? minuten : 30,
    tage: KURZ_TAGE.includes(tage) ? tage : 2,
    fokus: [], deload: false, variante: 0,
  });
  const plan = planFuer(w);
  const wahl = [...new Set((Array.isArray(gruppen) ? gruppen : []).filter((g) => PARTIEN.includes(g)))];
  if (!wahl.length) return { ...plan, kurz: true, kurzGruppen: [], einheiten: plan.einheiten.map((e) => ({ ...e, titel: `${e.titel}, kurz` })) };
  // Gewählte Partien: jede Einheit rechnet `einzeltrainingBauen`, dieselbe
  // Funktion wie Training für heute, mit Schwere, Einsteigergeräten und
  // Beschwerden. Die Variante wechselt je Einheit, damit A und B nicht
  // dieselben Übungen tragen. Jede Woche bleiben es dieselben.
  const namen = wahl.map((g) => FOKUS_NAME[g]).join(", ");
  const einheiten = Array.from({ length: w.tage }, (_, i) => einzeltrainingBauen({
    minuten: w.minuten, gruppen: wahl, niveau: w.niveau, ziel: w.ziel, ort: w.ort,
    beschwerden: w.beschwerden, meiden: w.meiden, variante: i,
  }, UEBUNGEN)).filter(Boolean)
    .map((e, i) => ({ ...e, titel: `Kurz ${"ABC"[i]}, ${namen}` }));
  if (!einheiten.length) return { ...plan, kurz: true, kurzGruppen: [], einheiten: plan.einheiten.map((e) => ({ ...e, titel: `${e.titel}, kurz` })) };
  return { ...plan, kurz: true, kurzGruppen: wahl, einheiten };
}

/** Sonntag der Woche, in der `heute` liegt. Bis dahin gilt die stressige Woche. */
export function wochenEnde(heute) {
  const d = new Date(`${heute}T12:00:00Z`);
  const bisSonntag = (7 - d.getUTCDay()) % 7;
  return new Date(d.getTime() + bisSonntag * 86_400_000).toISOString().slice(0, 10);
}

/** Die Karte unter dem Plan: anlegen, für diese Woche nehmen oder zurück. */
export function stressHtml({ kurz, aktiv, wahl }) {
  if (aktiv) {
    return `<div class="pl-stress an"><b>Diese Woche läuft der Kurzplan</b>
      <p>Bis Sonntag zeigt daevo hier die kurzen Einheiten. Danach geht es mit deinem Plan weiter, wo du aufgehört hast.</p>
      <button type="button" class="pl-mini" data-kurz-aus>Zurück zum normalen Plan</button></div>`;
  }
  const minuten = KURZ_MINUTEN.map((m) => `<button type="button" class="ue-tab${wahl.minuten === m ? " on" : ""}" data-kurz-min="${m}" aria-pressed="${wahl.minuten === m}">${m} Min.</button>`).join("");
  const tage = KURZ_TAGE.map((t) => `<button type="button" class="ue-tab${wahl.tage === t ? " on" : ""}" data-kurz-tage="${t}" aria-pressed="${wahl.tage === t}">${t} mal</button>`).join("");
  const gewaehlt = wahl.gruppen ?? [];
  const partien = [`<button type="button" class="ue-tab${gewaehlt.length ? "" : " on"}" data-kurz-gruppe="" aria-pressed="${!gewaehlt.length}">Ganzkörper</button>`,
    ...PARTIEN.map((g) => `<button type="button" class="ue-tab${gewaehlt.includes(g) ? " on" : ""}" data-kurz-gruppe="${g}" aria-pressed="${gewaehlt.includes(g)}">${FOKUS_NAME[g]}</button>`)].join("");
  if (kurz && !wahl.offen) {
    const m = kurz.einheiten[0]?.dauerMin ?? wahl.minuten;
    return `<div class="pl-stress"><b>Stressige Woche?</b>
      <p>Dann nimm deinen Kurzplan: ${kurz.einheiten.length} mal etwa ${m} Minuten ${kurz.kurzGruppen?.length ? esc(kurz.kurzGruppen.map((g) => FOKUS_NAME[g]).join(", ")) : "Ganzkörper"}, mit denselben Übungen jede Woche.</p>
      <div class="pl-update-knoepfe"><button type="button" class="pl-mini pl-start" data-kurz-an>Diese Woche nutzen</button><button type="button" class="pl-mini" data-kurz-aendern>Kurzplan ändern</button></div></div>`;
  }
  return `<div class="pl-stress"><b>Stressige Woche?</b>
    <p>Leg dir einmal einen Kurzplan an: 30 oder 45 Minuten, zwei oder drei Mal, Ganzkörper oder die Partien, die dir wichtig sind. Dann ist er da, wenn die Woche voll wird, und du musst nichts neu zusammenstellen.</p>
    <div class="pl-feld"><p class="pl-name">Minuten</p><div class="pl-reihe">${minuten}</div></div>
    <div class="pl-feld"><p class="pl-name">Was trainiert wird</p><div class="pl-reihe">${partien}</div></div>
    <div class="pl-feld"><p class="pl-name">Wie oft in der Woche</p><div class="pl-reihe">${tage}</div></div>
    <button type="button" class="pl-mini pl-start" data-kurz-speichern>${kurz ? "Kurzplan speichern" : "Kurzplan anlegen"}</button></div>`;
}

/* ---------- Training für heute ---------- */

export const HEUTE_MINUTEN = [20, 30, 45, 60, 75, 90];

/**
 * Was diese Woche schon dran war, als Satz, und welche Partien vorgewählt
 * sind. Ohne Eintrag in dieser Woche ist nichts vorgewählt: alle sieben
 * Partien auf einmal wären keine Wahl, sondern ein Formular.
 */
export function heuteVorschlag(log, heute) {
  const trainiert = wocheTrainiert(log, UEBUNGEN, heute);
  const namen = Object.entries(trainiert).map(([g, n]) => `${FOKUS_NAME[g]} ${n} ${n === 1 ? "Satz" : "Sätze"}`);
  const fehlt = fehlendePartien(trainiert);
  return {
    text: namen.length
      ? `Diese Woche in daevo: ${namen.join(", ")}. Noch offen: ${fehlt.map((g) => FOKUS_NAME[g]).join(", ") || "nichts"}.`
      : "Diese Woche steht in daevo noch kein Training. Wähl, was heute drankommen soll.",
    gruppen: namen.length ? fehlt : [],
  };
}

export function heuteHtml(stand, einheit) {
  const minuten = HEUTE_MINUTEN.map((m) => `<button type="button" class="ue-tab${stand.minuten === m ? " on" : ""}" data-heute-min="${m}" aria-pressed="${stand.minuten === m}">${m}</button>`).join("");
  const gruppen = PARTIEN.map((g) => {
    const an = stand.gruppen.includes(g);
    return `<button type="button" class="ue-tab${an ? " on" : ""}" data-heute-gruppe="${g}" aria-pressed="${an}">${esc(FOKUS_NAME[g])}</button>`;
  }).join("");
  const ergebnis = einheit
    ? `<section class="pl-einheit pl-heute-einheit"><header><div><h3>${esc(einheit.fokus)}</h3><p>${einheit.positionen.length} Übungen · etwa ${einheit.dauerMin} Min.</p></div>
        <div class="pl-knoepfe"><button type="button" class="pl-mini pl-start" data-heute-start>Starten</button><button type="button" class="pl-mini" data-heute-andere>Andere Übungen</button></div></header>
        <ol class="pl-liste">${einheit.positionen.map((p, pi) => zeileHtml(p, { pi, tausch: stand.tausch ?? null, tauschAttr: `data-heute-tausch="${pi}"` })).join("")}</ol></section>`
    : stand.gruppen.length ? "" : '<p class="pl-legende">Wähl mindestens eine Partie.</p>';
  return `<h3 class="ue-abschnitt">Training für heute</h3>
    <p class="sub">Wenn der Plan heute nicht passt: wie viel Zeit du hast und was diese Woche noch fehlt.</p>
    <p class="pl-legende">${esc(stand.text)}</p>
    <div class="pl-feld"><p class="pl-name">Minuten</p><div class="pl-reihe">${minuten}</div></div>
    <div class="pl-feld"><p class="pl-name">Heute dran</p><div class="pl-reihe">${gruppen}</div></div>
    ${ergebnis}`;
}

/** Die Einheit für heute, mit Erfahrung, Ziel, Ort, Beschwerden und Fokus aus dem Plan. */
function heuteRoh(stand, wunsch) {
  const w = wunschPruefen(wunsch);
  return einzeltrainingBauen({
    minuten: stand.minuten, gruppen: stand.gruppen, niveau: w.niveau, ziel: w.ziel, ort: w.ort,
    beschwerden: w.beschwerden, meiden: w.meiden, fokus: w.fokus, variante: stand.variante ?? 0,
  }, UEBUNGEN);
}

/**
 * Die Einheit für heute mit den Übungen, die der Nutzer einzeln getauscht
 * hat. Die Dosis bleibt, die Rolle in der Einheit ist dieselbe.
 */
export function heuteEinheit(stand, wunsch) {
  const e = heuteRoh(stand, wunsch);
  const ersetzt = stand.ersetzt ?? {};
  if (!e || !Object.keys(ersetzt).length) return e;
  return {
    ...e,
    positionen: e.positionen.map((p) => {
      const neu = nachId.get(ersetzt[p.id]);
      return neu ? { ...p, id: neu.id, name: neu.name } : p;
    }),
  };
}

/** Was für eine Übung des Trainings für heute in Frage kommt. */
export function heuteTauschListe(einheit, pi, wunsch) {
  const p = einheit?.positionen[pi];
  if (!p) return [];
  return alternativen({ wunsch: wunschPruefen(wunsch), einheiten: [einheit] }, 0, p.id, UEBUNGEN).slice(0, 8);
}

/**
 * Die letzten Trainings aus dem Protokoll, je Tag und Einheit eine Zeile,
 * aufklappbar mit den Sätzen. Was gespeichert ist, soll man auch sehen: ein
 * Protokoll, in das man nur schreibt, wirkt wie eines, das nichts behält.
 */
export function verlaufHtml(log, grenze = 10) {
  const gruppen = new Map();
  for (const e of log) {
    const k = `${e.datum}|${e.einheit ?? ""}`;
    gruppen.set(k, [...(gruppen.get(k) ?? []), e]);
  }
  const zeilen = [...gruppen.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, grenze).map(([k, liste]) => {
    const [datum, einheit] = k.split("|");
    const tag = new Date(`${datum}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const saetze = liste.reduce((s, e) => s + e.saetze.length, 0);
    const details = liste.map((e) => {
      const name = nachId.get(e.uebung)?.name ?? e.uebung;
      const s2 = e.saetze.map((x) => `${String(x.kg).replace(".", ",")} kg × ${x.wdh}${x.rir !== null && x.rir !== undefined ? `, ${x.rir} RIR` : ""}`).join(" · ");
      return `<li><b>${esc(name)}</b><span>${esc(s2)}</span></li>`;
    }).join("");
    return `<details class="pl-verlauf-tag"><summary><b>${esc(tag)}</b><span>${esc(einheit || "Training")} · ${liste.length} ${liste.length === 1 ? "Übung" : "Übungen"}, ${saetze} ${saetze === 1 ? "Satz" : "Sätze"}</span></summary><ul>${details}</ul><button type="button" class="ghost pl-abschluss" data-pl-abschluss="${esc(k)}">Muskelkarte und Teilen</button></details>`;
  });
  if (!zeilen.length) return "";
  return `<h3 class="ue-abschnitt">Deine letzten Trainings</h3>${zeilen.join("")}`;
}

export const hinweiseHtml = (hinweise) => hinweise.map((h) => `<li>${esc(h)}</li>`).join("");
export const quellenHtml = (quellen) => quellen.map((q) => `<li>${esc(q)}</li>`).join("");

export function planText(plan) {
  return uebungsplanText(plan);
}

const $ = (id) => document.getElementById(id);

/**
 * Hängt die Pläne in die Übungsansicht. `speicher` liest und schreibt den
 * gespeicherten Plan, `kurz` den Kurzplan, `woche` die stressige Woche,
 * `oeffne` zeigt die Detailseite einer Übung, `melde` gibt eine kurze
 * Rückmeldung. Alles kommt von aussen, damit diese Datei weder den Speicher
 * noch die Oberfläche der App kennen muss.
 *
 * Zwei Teile. "Mein Plan" zeigt den gespeicherten Plan und startet ihn,
 * "Anpassen" stellt die Fragen und rechnet einen neuen. Vorher stand beides
 * auf einer Seite, die Fragen oben, und wer trainieren wollte, scrollte bei
 * jedem Öffnen an Tagen und Minuten vorbei.
 */
export function plaeneStarten({
  speicher, kurz: kurzSpeicher = { lesen: () => null, schreiben: () => {} }, woche: wocheSpeicher = { lesen: () => null, schreiben: () => {} },
  oeffne, melde, starte = () => {}, frei = () => {}, starteEinheit = () => {}, log = () => [], heute = () => new Date().toISOString().slice(0, 10),
  heuteBestellt = () => null, abschluss = () => {}, mitwachsen = () => true, proOeffnen = () => {}, zuModus = () => {},
}) {
  // Acht Wochen um: Fortschritt prüfen, bevor irgendetwas gezeigt wird. Den
  // Plan, der mitwächst, gibt es mit Pro. Ohne Pro bleibt der Plan, wie er
  // ist, und eine Karte sagt, dass jetzt angepasst würde.
  let anpassungGesperrt = false;
  const pruefen = () => {
    const geprueft = planPruefen(gespeicherterPlan(speicher.lesen()), log(), heute());
    if (!geprueft) return;
    if (mitwachsen()) speicher.schreiben(geprueft);
    else anpassungGesperrt = true;
  };
  pruefen();
  let gespeichert = gespeicherterPlan(speicher.lesen());
  // Ein Plan ohne Beginn bekommt heute als ersten Tag, einmal. Sonst stünde
  // bei jedem Öffnen Woche 1.
  if (gespeichert && !planBeginn(gespeichert)) {
    gespeichert = { ...gespeichert, beginn: heute() };
    speicher.schreiben(gespeichert);
  }
  let wunsch = wunschPruefen(gespeichert?.wunsch);
  // Der Entwurf unter Anpassen. Er ersetzt den gespeicherten Plan erst mit
  // "Für zwölf Wochen nehmen".
  let entwurf = gespeichert ?? planFuer(wunsch);
  let kurzplan = gespeicherterPlan(kurzSpeicher.lesen());
  let kurzWahl = { minuten: kurzplan?.wunsch?.minuten ?? 30, tage: kurzplan?.einheiten?.length ?? 2, gruppen: kurzplan?.kurzGruppen ?? [], offen: false };
  const trendFuer = (id) => trendKurz(log(), id, heute());
  const kurzAktiv = () => {
    const w = wocheSpeicher.lesen();
    return Boolean(kurzplan && w?.art === "kurz" && w.bis && heute() <= w.bis);
  };

  // Das Training für heute. Vorgewählt wird beim Öffnen der Ansicht neu,
  // denn was diese Woche fehlt, ändert sich mit jedem Training.
  const vorschlag = heuteVorschlag(log(), heute());
  let heuteStand = { minuten: 30, gruppen: vorschlag.gruppen, text: vorschlag.text, variante: 0 };
  // Hat der Coach heute schon eine Einheit gerechnet, steht genau die hier,
  // aufgeklappt, denn dann ist sie das Training des Tages.
  const bestellt = heuteBestellt();
  if (bestellt?.tag === heute() && Array.isArray(bestellt.gruppen) && bestellt.gruppen.length) {
    heuteStand = { minuten: bestellt.minuten, gruppen: bestellt.gruppen.flatMap((g) => (g === "arme" ? ["bizeps", "trizeps"] : [g])), text: "Im Gespräch mit daevo zusammengestellt.", variante: 0 };
    $("plEinzeln").open = true;
  }
  const heuteZeichnen = () => {
    $("plHeute").innerHTML = heuteHtml(heuteStand, heuteStand.gruppen.length ? heuteEinheit(heuteStand, wunsch) : null);
  };

  // Welche Einheit gerade bearbeitet wird und welche Tauschliste offen ist.
  let bearbeitet = -1;
  let tausch = null;

  const ansichtZeichnen = () => {
    const aktiv = kurzAktiv();
    const plan = aktiv ? kurzplan : gespeichert;
    $("plUpdate").innerHTML = !gespeichert || aktiv ? ""
      : anpassungGesperrt ? `<div class="pl-update pro-sperre-karte"><b>Eine Übung steckt fest <span class="pro-chip">Pro</span></b>`
        + `<p>Mindestens eine Übung kam acht Wochen lang nicht voran. Mit Pro tauscht daevo sie gegen eine für dieselbe Bewegung, Sätze und Pausen bleiben. Wie es je Übung läuft, siehst du unter Fortschritt, wenn du auf die Übung tippst.</p>`
        + `<div class="pl-update-knoepfe"><button type="button" class="pl-mini" data-pro-anpassung>Pro ansehen</button></div></div>`
      : aktualisierungHtml(gespeichert, heute());
    if (!plan) {
      $("plStart").innerHTML = planEinstiegHtml();
      $("plEinheiten").innerHTML = "";
      $("plStress").innerHTML = "";
    } else {
      $("plStart").innerHTML = planKopfHtml(plan, { woche: planWoche(gespeichert, heute()), naechste: naechsteEinheit(plan, log()), kurz: aktiv });
      // Der Kurzplan lässt sich nicht bearbeiten, nur starten. Er ist ein
      // Notfallplan, und wer ihn anders will, legt ihn unten neu an.
      $("plEinheiten").innerHTML = aktiv
        ? plan.einheiten.map((e, ei) => einheitHtml(e, ei, { nurStart: true, trend: trendFuer, startAttr: `data-kurz-start="${ei}"` })).join("")
        : plan.einheiten.map((e, ei) => einheitHtml(e, ei, { bearbeitet, tausch, trend: trendFuer, zusatz: bearbeitet === ei ? zusatzListe(plan, ei) : [] })).join("");
      $("plStress").innerHTML = stressHtml({ kurz: kurzplan, aktiv, wahl: kurzWahl });
    }
    $("plVerlauf").innerHTML = verlaufHtml(log());
    $("plTeilen").hidden = !plan;
    heuteZeichnen();
  };

  const konfigZeichnen = () => {
    $("plSteuerung").innerHTML = steuerHtml(wunsch);
    const dauer = entwurf.einheiten.map((e) => e.dauerMin);
    const schnitt = dauer.length ? Math.round(dauer.reduce((a, b) => a + b, 0) / dauer.length) : 0;
    const istDerGespeicherte = entwurf === gespeichert;
    $("plKopf").innerHTML = `<b>${istDerGespeicherte ? "Dein aktueller Plan" : "So sähe dein neuer Plan aus"}</b><span>${entwurf.einheiten.length} Einheiten pro Woche, etwa ${schnitt} Min.${wunsch.deload ? " · Entlastung" : ""}</span>`;
    $("plVorschau").innerHTML = entwurf.einheiten.map((e, ei) => einheitHtml(e, ei, { ohneKnoepfe: true })).join("");
    $("plSaetze").innerHTML = saetzeHtml(entwurf.wochensaetze ?? {});
    $("plHinweise").innerHTML = hinweiseHtml(entwurf.hinweise ?? []);
    $("plQuellen").innerHTML = quellenHtml(entwurf.quellen ?? []);
    $("plSpeichern").textContent = istDerGespeicherte ? "Das ist dein Plan" : gespeichert ? "Neuen Plan für zwölf Wochen nehmen" : "Für zwölf Wochen nehmen";
    $("plSpeichern").disabled = istDerGespeicherte;
  };

  const zeichnen = () => { ansichtZeichnen(); konfigZeichnen(); };

  const neu = (teil) => {
    wunsch = wunschPruefen({ ...wunsch, ...teil });
    entwurf = planFuer(wunsch);
    konfigZeichnen();
  };

  /** Speichert den Plan auf "Mein Plan", ohne Beginn und Woche zu ändern. */
  const planSichern = (plan) => {
    gespeichert = plan;
    speicher.schreiben(plan);
    if (entwurf !== gespeichert && entwurf?.einheiten === plan.einheiten) entwurf = plan;
  };

  $("plSteuerung").addEventListener("click", (event) => {
    const fokusKnopf = event.target.closest("[data-fokus]");
    if (fokusKnopf) {
      const f = fokusKnopf.dataset.fokus;
      let liste = wunsch.fokus.includes(f) ? wunsch.fokus.filter((x) => x !== f) : [...wunsch.fokus, f];
      // Eine dritte Partie verdrängt die älteste. Ein gesperrter Knopf ohne
      // Erklärung sähe kaputt aus.
      if (liste.length > FOKUS_MAX) liste = liste.slice(-FOKUS_MAX);
      neu({ fokus: liste });
      return;
    }
    const beschwerde = event.target.closest("[data-beschwerde]");
    if (beschwerde) {
      const b = beschwerde.dataset.beschwerde;
      const liste = wunsch.beschwerden.includes(b) ? wunsch.beschwerden.filter((x) => x !== b) : [...wunsch.beschwerden, b];
      neu({ beschwerden: liste, variante: 0 });
      return;
    }
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
  $("plVorschau").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-uebung]");
    if (knopf) oeffne(knopf.dataset.uebung);
  });
  $("plAndere").addEventListener("click", () => neu({ variante: wunsch.variante + 1 }));
  $("plSpeichern").addEventListener("click", () => {
    // Ein neuer Plan beginnt bei Woche 1. Das Protokoll bleibt, also
    // starten dieselben Übungen mit den Gewichten vom letzten Mal.
    const neuerPlan = { ...entwurf, beginn: heute(), gespeichertAm: new Date().toISOString(), aktualisierung: undefined };
    speicher.schreiben(neuerPlan);
    gespeichert = gespeicherterPlan(speicher.lesen());
    entwurf = gespeichert;
    wunsch = wunschPruefen(gespeichert.wunsch);
    anpassungGesperrt = false;
    bearbeitet = -1;
    tausch = null;
    zeichnen();
    melde("Dein Plan für die nächsten zwölf Wochen steht");
    zuModus("plaene");
  });

  $("plFrei").addEventListener("click", () => frei());
  $("plVerlauf").addEventListener("click", (event) => {
    const knopf = event.target.closest("[data-pl-abschluss]");
    if (!knopf) return;
    const [datum, einheit] = knopf.dataset.plAbschluss.split("|");
    abschluss(datum, einheit);
  });
  $("plHeute").addEventListener("click", (event) => {
    const k = (sel) => event.target.closest(sel);
    let x;
    if ((x = k("[data-heute-tausch]"))) {
      const pi = Number(x.dataset.heuteTausch);
      const offen = heuteStand.tausch?.pi === pi;
      heuteStand = { ...heuteStand, tausch: offen ? null : { ei: 0, pi, liste: heuteTauschListe(heuteEinheit(heuteStand, wunsch), pi, wunsch) } };
    } else if ((x = k("[data-heute-nehmen]"))) {
      // Getauscht wird über die ursprüngliche Kennung, damit ein zweiter
      // Tausch derselben Zeile den ersten ersetzt und nicht verkettet.
      const ersetzt = { ...(heuteStand.ersetzt ?? {}) };
      const ursprung = Object.keys(ersetzt).find((alt) => ersetzt[alt] === x.dataset.alt) ?? x.dataset.alt;
      ersetzt[ursprung] = x.dataset.heuteNehmen;
      heuteStand = { ...heuteStand, ersetzt, tausch: null };
    } else if ((x = k("[data-heute-min]"))) heuteStand = { ...heuteStand, minuten: Number(x.dataset.heuteMin), variante: 0, ersetzt: {}, tausch: null };
    else if ((x = k("[data-heute-gruppe]"))) {
      const g = x.dataset.heuteGruppe;
      const gruppen = heuteStand.gruppen.includes(g) ? heuteStand.gruppen.filter((y) => y !== g) : [...heuteStand.gruppen, g];
      heuteStand = { ...heuteStand, gruppen, variante: 0, ersetzt: {}, tausch: null };
    } else if (k("[data-heute-andere]")) heuteStand = { ...heuteStand, variante: heuteStand.variante + 1, ersetzt: {}, tausch: null };
    else if (k("[data-heute-start]")) {
      const einheit = heuteEinheit(heuteStand, wunsch);
      if (einheit) starteEinheit(einheit);
      return;
    } else if ((x = k("[data-uebung]"))) { oeffne(x.dataset.uebung); return; }
    else return;
    heuteZeichnen();
  });
  $("plUpdate").addEventListener("click", (event) => {
    if (event.target.closest("[data-pro-anpassung]")) { proOeffnen(); return; }
    const k = event.target.closest("[data-update]");
    if (!k || !gespeichert?.aktualisierung) return;
    let neuerPlan = { ...gespeichert, aktualisierung: { ...gespeichert.aktualisierung, gesehen: true } };
    if (k.dataset.update === "zurueck" && gespeichert.aktualisierung.vorher) {
      neuerPlan = planNachrechnen({ ...neuerPlan, einheiten: gespeichert.aktualisierung.vorher }, UEBUNGEN);
      melde("Alter Plan bleibt");
    }
    planSichern(neuerPlan);
    zeichnen();
  });

  /** Klicks auf Kopf, Einheiten und Kurzplan, alle auf "Mein Plan". */
  const planKlick = (event) => {
    if (event.target.closest("[data-pl-anpassen]")) { zuModus("anpassen"); return; }
    const kurzStart = event.target.closest("[data-kurz-start]");
    if (kurzStart) {
      const e = kurzplan?.einheiten[Number(kurzStart.dataset.kurzStart)];
      if (e) starteEinheit(e);
      return;
    }
    const start = event.target.closest("[data-tr-start]");
    if (start) { starte(Number(start.dataset.trStart)); return; }
    const plan = gespeichert;
    if (!plan) return;
    const bearb = event.target.closest("[data-bearbeiten]");
    if (bearb) {
      const ei = Number(bearb.dataset.bearbeiten);
      // "Fertig" speichert. Bearbeiten ist ein Zustand der Einheit und kein
      // Entwurf: wer Sätze ändert und auf Fertig tippt, will sie behalten.
      bearbeitet = bearbeitet === ei ? -1 : ei;
      tausch = null;
      ansichtZeichnen();
      if (bearbeitet === -1) melde("Plan gespeichert");
      return;
    }
    const aktion = event.target.closest("[data-aktion]");
    if (aktion) {
      const ei = Number(aktion.dataset.ei);
      const pi = Number(aktion.dataset.pi);
      const art = aktion.dataset.aktion;
      if (art === "mehr" || art === "weniger") planSichern(saetzeAendern(plan, ei, pi, art === "mehr" ? 1 : -1));
      else if (art === "entfernen") { tausch = null; planSichern(uebungEntfernen(plan, ei, pi)); }
      else if (art === "tauschen") {
        const offen = tausch && tausch.ei === ei && tausch.pi === pi;
        tausch = offen ? null : { ei, pi, liste: tauschListe(plan, ei, plan.einheiten[ei].positionen[pi].id) };
      } else if (art === "nehmen") {
        tausch = null;
        planSichern(uebungTauschen(plan, ei, pi, aktion.dataset.id));
        if (bearbeitet !== ei) melde("Übung getauscht");
      }
      ansichtZeichnen();
      return;
    }
    // Aus dem eigenen Plan öffnet eine Übung auf dem Fortschritt, sobald es
    // dafür Einträge gibt: wer im Plan auf seine Übung tippt, will wissen,
    // wie es dort läuft, die Anleitung kennt er.
    const knopf = event.target.closest("[data-uebung]");
    if (knopf) oeffne(knopf.dataset.uebung, log().some((e) => e.uebung === knopf.dataset.uebung) ? "fortschritt" : "info");
  };
  $("plStart").addEventListener("click", planKlick);
  $("plEinheiten").addEventListener("click", planKlick);
  $("plEinheiten").addEventListener("change", (event) => {
    const feld = event.target.closest("[data-dazu]");
    if (!feld || !feld.value || !gespeichert) return;
    planSichern(uebungHinzufuegen(gespeichert, Number(feld.dataset.dazu), feld.value));
    ansichtZeichnen();
  });

  $("plStress").addEventListener("click", (event) => {
    const k = (sel) => event.target.closest(sel);
    let x;
    if ((x = k("[data-kurz-min]"))) kurzWahl = { ...kurzWahl, minuten: Number(x.dataset.kurzMin) };
    else if ((x = k("[data-kurz-tage]"))) kurzWahl = { ...kurzWahl, tage: Number(x.dataset.kurzTage) };
    else if ((x = k("[data-kurz-gruppe]"))) {
      // Ganzkörper leert die Wahl, jede Partie schaltet sich um.
      const g = x.dataset.kurzGruppe;
      const alt = kurzWahl.gruppen ?? [];
      kurzWahl = { ...kurzWahl, gruppen: !g ? [] : alt.includes(g) ? alt.filter((y) => y !== g) : [...alt, g] };
    }
    else if (k("[data-kurz-aendern]")) kurzWahl = { ...kurzWahl, offen: true };
    else if (k("[data-kurz-speichern]")) {
      kurzplan = { ...kurzplanFuer(wunsch, kurzWahl), gespeichertAm: new Date().toISOString() };
      kurzSpeicher.schreiben(kurzplan);
      kurzWahl = { ...kurzWahl, offen: false };
      melde("Kurzplan gespeichert");
    } else if (k("[data-kurz-an]")) {
      wocheSpeicher.schreiben({ art: "kurz", bis: wochenEnde(heute()) });
      melde("Diese Woche gilt der Kurzplan");
    } else if (k("[data-kurz-aus]")) {
      wocheSpeicher.schreiben(null);
      melde("Zurück zum normalen Plan");
    } else return;
    ansichtZeichnen();
  });

  $("plTeilen").addEventListener("click", async () => {
    const plan = kurzAktiv() ? kurzplan : gespeichert;
    if (!plan) return;
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

  // Unter Anpassen steht beim Öffnen der gespeicherte Plan, nicht ein
  // halbfertiger Entwurf vom letzten Mal.
  document.addEventListener("daevo-planmodus", (event) => {
    if (event.detail !== "anpassen" || !gespeichert) return;
    entwurf = gespeichert;
    wunsch = wunschPruefen(gespeichert.wunsch);
    konfigZeichnen();
  });

  zeichnen();

  // Der Fragebogen speichert den ersten Plan, nachdem diese Ansicht schon
  // steht. Ohne Nachladen zeigte sie den Standardplan statt des eigenen.
  return {
    /** Nach einem beendeten Training, damit Verlauf und nächste Einheit stimmen. */
    verlaufNeu() {
      const v = heuteVorschlag(log(), heute());
      heuteStand = { ...heuteStand, gruppen: v.gruppen, text: v.text, variante: 0 };
      ansichtZeichnen();
    },
    laden() {
      pruefen();
      const neu = gespeicherterPlan(speicher.lesen());
      kurzplan = gespeicherterPlan(kurzSpeicher.lesen());
      if (neu) {
        gespeichert = planBeginn(neu) ? neu : { ...neu, beginn: heute() };
        entwurf = gespeichert;
        wunsch = wunschPruefen(gespeichert.wunsch);
      }
      bearbeitet = -1;
      tausch = null;
      zeichnen();
    },
  };
}
