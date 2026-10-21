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
  BESCHWERDE_NAME, alternativen, planAktualisieren, planNachrechnen, positionFuer, uebungErlaubt, uebungsplanBauen, uebungsplanText,
} from "@daevo/core";
import { UEBUNGEN } from "./uebungen-daten.js";
import { GRUPPEN, vorschauPfad } from "./uebungen.js";

export const STANDARD_WUNSCH = {
  tage: 3, minuten: 45, niveau: "intermediate", ziel: "muskel", deload: false, variante: 0,
  ort: "studio", beschwerden: [], meiden: [],
};

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
  const deload = `<label class="pl-deload"><input type="checkbox" id="plDeload"${wunsch.deload ? " checked" : ""}><span>Entlastungswoche</span><small>Halbe Satzzahl, mehr Reserve</small></label>`;
  return reihen.join("") + schmerz + deload;
}

export function zeileHtml(p, { bearbeiten = false, ei = 0, pi = 0, tausch = null } = {}) {
  const u = nachId.get(p.id);
  const bild = u ? `<img class="pl-bild" src="${esc(vorschauPfad(u))}" alt="" width="56" height="70" loading="lazy" decoding="async">` : "";
  const pause = p.pauseSek < 90 ? `${p.pauseSek} s` : `${String(p.pauseSek / 60).replace(".", ",")} min`;
  const zeile = `<button type="button" class="pl-zeile" data-uebung="${esc(p.id)}">${bild}
    <span class="pl-text"><b>${esc(p.name)}</b><span>${p.saetze} × ${esc(p.wdh)}<i></i>Pause ${pause}<i></i>${p.reserve} in Reserve</span></span>
    <span class="chev-re" aria-hidden="true"></span></button>`;
  if (!bearbeiten) return `<li>${zeile}</li>`;
  const ort = `data-ei="${ei}" data-pi="${pi}"`;
  const werkzeug = `<div class="pl-werkzeug">
      <span class="pl-saetze-wahl"><button type="button" data-aktion="weniger" ${ort} aria-label="Ein Satz weniger">−</button>
      <b>${p.saetze} Sätze</b><button type="button" data-aktion="mehr" ${ort} aria-label="Ein Satz mehr">+</button></span>
      <button type="button" class="pl-mini" data-aktion="tauschen" ${ort}>Tauschen</button>
      <button type="button" class="pl-mini" data-aktion="entfernen" ${ort}>Entfernen</button>
    </div>`;
  const offen = tausch && tausch.ei === ei && tausch.pi === pi;
  const auswahl = offen
    ? `<div class="pl-tausch">${tausch.liste.length
      ? tausch.liste.map((a) => `<button type="button" class="ue-tab" data-aktion="nehmen" data-id="${esc(a.id)}" ${ort}>${esc(a.name)}</button>`).join("")
      : "<p>Für diese Bewegung gibt es hier keine andere Übung, die zu Ort und Beschwerden passt.</p>"}</div>`
    : "";
  return `<li class="pl-bearbeiten">${zeile}${werkzeug}${auswahl}</li>`;
}

export function einheitHtml(e, ei = 0, { bearbeitet = -1, tausch = null, zusatz = [] } = {}) {
  const an = bearbeitet === ei;
  const knopf = `<div class="pl-knoepfe">${an ? "" : `<button type="button" class="pl-mini pl-start" data-tr-start="${ei}">Starten</button>`}<button type="button" class="pl-mini pl-bearb" data-bearbeiten="${ei}">${an ? "Fertig" : "Bearbeiten"}</button></div>`;
  const dazu = an && zusatz.length
    ? `<label class="pl-dazu"><span>Übung hinzufügen</span><select data-dazu="${ei}"><option value="">Auswählen</option>${
      zusatz.map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("")}</select></label>`
    : "";
  return `<section class="pl-einheit"><header><div><h3>${esc(e.titel)}</h3><p>${esc(e.fokus)} · etwa ${e.dauerMin} Min.</p></div>${knopf}</header>
    <ol class="pl-liste">${e.positionen.map((p, pi) => zeileHtml(p, { bearbeiten: an, ei, pi, tausch })).join("")}</ol>${dazu}</section>`;
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
  return `<div class="pl-update"><b>Dein Plan nach acht Wochen</b>${zeilen}<div class="pl-update-knoepfe">`
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
export function plaeneStarten({ speicher, oeffne, melde, starte = () => {}, log = () => [], heute = () => new Date().toISOString().slice(0, 10) }) {
  // Acht Wochen um: Fortschritt prüfen, bevor irgendetwas gezeigt wird.
  const geprueft = planPruefen(gespeicherterPlan(speicher.lesen()), log(), heute());
  if (geprueft) speicher.schreiben(geprueft);
  let gespeichert = gespeicherterPlan(speicher.lesen());
  let wunsch = wunschPruefen(gespeichert?.wunsch);
  let plan = gespeichert ?? planFuer(wunsch);
  let istGespeichert = Boolean(gespeichert);

  // Welche Einheit gerade bearbeitet wird und welche Tauschliste offen ist.
  let bearbeitet = -1;
  let tausch = null;

  const zeichnen = () => {
    $("plSteuerung").innerHTML = steuerHtml(wunsch);
    const dauer = plan.einheiten.map((e) => e.dauerMin);
    const schnitt = dauer.length ? Math.round(dauer.reduce((a, b) => a + b, 0) / dauer.length) : 0;
    $("plUpdate").innerHTML = istGespeichert ? aktualisierungHtml(plan, heute()) : "";
    $("plKopf").innerHTML = `<b>${plan.einheiten.length} Einheiten pro Woche</b><span>etwa ${schnitt} Min. je Einheit${wunsch.deload ? " · Entlastung" : ""}${plan.bearbeitet ? " · von dir angepasst" : ""}</span>`;
    $("plEinheiten").innerHTML = plan.einheiten
      .map((e, ei) => einheitHtml(e, ei, { bearbeitet, tausch, zusatz: bearbeitet === ei ? zusatzListe(plan, ei) : [] }))
      .join("");
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
    bearbeitet = -1;
    tausch = null;
    zeichnen();
  };

  const geaendert = (neuerPlan) => {
    plan = neuerPlan;
    istGespeichert = false;
    zeichnen();
  };

  $("plSteuerung").addEventListener("click", (event) => {
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
  $("plAndere").addEventListener("click", () => neu({ variante: wunsch.variante + 1 }));
  $("plUpdate").addEventListener("click", (event) => {
    const k = event.target.closest("[data-update]");
    if (!k || !plan.aktualisierung) return;
    let neuerPlan = { ...plan, aktualisierung: { ...plan.aktualisierung, gesehen: true } };
    if (k.dataset.update === "zurueck" && plan.aktualisierung.vorher) {
      neuerPlan = planNachrechnen({ ...neuerPlan, einheiten: plan.aktualisierung.vorher }, UEBUNGEN);
      melde("Alter Plan bleibt");
    }
    speicher.schreiben(neuerPlan);
    gespeichert = neuerPlan;
    plan = neuerPlan;
    zeichnen();
  });
  $("plEinheiten").addEventListener("click", (event) => {
    const start = event.target.closest("[data-tr-start]");
    if (start) {
      // Wer trainiert, hat sich für diesen Plan entschieden. Ungespeichert
      // gäbe es kein Protokoll, an dem nach acht Wochen gemessen wird.
      if (!istGespeichert) {
        speicher.schreiben({ ...plan, gespeichertAm: new Date().toISOString() });
        gespeichert = gespeicherterPlan(speicher.lesen());
        plan = gespeichert;
        istGespeichert = true;
        zeichnen();
      }
      starte(Number(start.dataset.trStart));
      return;
    }
    const bearb = event.target.closest("[data-bearbeiten]");
    if (bearb) {
      const ei = Number(bearb.dataset.bearbeiten);
      bearbeitet = bearbeitet === ei ? -1 : ei;
      tausch = null;
      zeichnen();
      return;
    }
    const aktion = event.target.closest("[data-aktion]");
    if (aktion) {
      const ei = Number(aktion.dataset.ei);
      const pi = Number(aktion.dataset.pi);
      const art = aktion.dataset.aktion;
      if (art === "mehr" || art === "weniger") geaendert(saetzeAendern(plan, ei, pi, art === "mehr" ? 1 : -1));
      else if (art === "entfernen") { tausch = null; geaendert(uebungEntfernen(plan, ei, pi)); }
      else if (art === "tauschen") {
        const offen = tausch && tausch.ei === ei && tausch.pi === pi;
        tausch = offen ? null : { ei, pi, liste: tauschListe(plan, ei, plan.einheiten[ei].positionen[pi].id) };
        zeichnen();
      } else if (art === "nehmen") {
        tausch = null;
        geaendert(uebungTauschen(plan, ei, pi, aktion.dataset.id));
      }
      return;
    }
    const knopf = event.target.closest("[data-uebung]");
    if (knopf) oeffne(knopf.dataset.uebung);
  });
  $("plEinheiten").addEventListener("change", (event) => {
    const feld = event.target.closest("[data-dazu]");
    if (!feld || !feld.value) return;
    geaendert(uebungHinzufuegen(plan, Number(feld.dataset.dazu), feld.value));
  });
  $("plSpeichern").addEventListener("click", () => {
    speicher.schreiben({ ...plan, gespeichertAm: new Date().toISOString() });
    gespeichert = plan;
    istGespeichert = true;
    bearbeitet = -1;
    tausch = null;
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

  // Der Fragebogen speichert den ersten Plan, nachdem diese Ansicht schon
  // steht. Ohne Nachladen zeigte sie den Standardplan statt des eigenen.
  return {
    laden() {
      const geprueft = planPruefen(gespeicherterPlan(speicher.lesen()), log(), heute());
      if (geprueft) speicher.schreiben(geprueft);
      const neu = gespeicherterPlan(speicher.lesen());
      if (!neu) return;
      gespeichert = neu;
      wunsch = wunschPruefen(neu.wunsch);
      plan = neu;
      istGespeichert = true;
      bearbeitet = -1;
      tausch = null;
      zeichnen();
    },
  };
}
