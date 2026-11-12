/**
 * Der Guten Morgen Check-in in der App. Gerechnet wird in
 * `packages/core/src/morgencheck.ts`, hier wird gelesen, gespeichert und
 * gezeigt.
 *
 * Er kommt eine halbe Stunde nach der Aufstehzeit des Tages. In der iPhone
 * App als Mitteilung, siehe `mitteilungen.js`. In der Web App öffnet er sich
 * beim ersten Öffnen nach dieser Zeit von selbst, einmal am Tag und nur bis
 * mittags: um 15 Uhr nach dem Aufwachen zu fragen, ist keine Erinnerung,
 * sondern ein Formular.
 *
 * Gespeichert wird als Check-in der Art "morning", mit Schlaf und Energie auf
 * der Skala 1 bis 10. So rechnen Bereitschaft, Bericht und Muster weiter mit
 * den Feldern, die sie schon kennen.
 *
 * Bis `morgenStarten` fasst das Modul weder `document` noch `window` an.
 */
import {
  bereichVon, MORGEN_FRAGEN, BELASTBARKEIT_NAME, PHASE_NAME, SYMPTOM_NAME, zyklusEmpfehlung, zyklusStand, NACHFRAGE_UHRZEIT, morgenAuswerten, morgenUhrzeit, morgenVollstaendig, nachfrageAuswerten, nachfrageNoetig, tagesrandFuer,
} from "@daevo/core";
import { newId, nowTime } from "./storage.js";
import { bestellteEinheit, planEinheitFuer } from "./vorhaben.js";
import { spueren } from "./haptik.js";

/** Bis zu dieser Uhrzeit öffnet sich der Check-in von selbst. */
export const MORGEN_BIS = "12:00";

const esc = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const min = (u) => { const [h, m] = String(u).split(":").map(Number); return h * 60 + m; };

/** Der Morgen Check-in von heute, wenn es ihn schon gibt. */
export function morgenVonHeute(store, tag) {
  return (store.getDay(tag).checkins || []).filter((c) => c.kind === "morning" && c.morgen).pop() ?? null;
}

/**
 * Was heute im Wochenplan steht, mit dem Titel der Einheit aus dem
 * gespeicherten Plan. Dieselbe Zuordnung wie bei `trainingsplanAbrufen`:
 * die Krafttage der Woche der Reihe nach, Montag zuerst, A, B, C im Wechsel.
 */
export function trainingHeute(store, tag) {
  return mitKalender(trainingAusPlan(store, tag), store, tag);
}

const hhmm = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const ortsTag = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/**
 * Der Kalender schlägt das Profil. Im Betrieb stand "Krafttraining um 15:00:
 * wie geplant", während um 15:00 eine Vertretung im Kalender stand und das
 * Krafttraining dort um 16:15. Ein eigenes Training im Kalender gibt Uhrzeit
 * und Dauer vor, über dieselbe Zuordnung wie das Balance Board, dazu alles,
 * was daevo eingetragen hat. Steht keins dort und liegt zur Uhrzeit aus dem
 * Profil ein anderer Termin, sagt der Check-in das, statt "wie geplant".
 */
function mitKalender(geplant, store, tag) {
  const termine = (store.getKalender?.().termine || [])
    .filter((t) => !t.ganztags && Number.isFinite(Number(t.von)) && ortsTag(Number(t.von)) === tag)
    .sort((a, b) => a.von - b.von);
  if (!termine.length) return geplant;
  const istTraining = (t) => t.daevo || bereichVon(String(t.titel || "")) === "fitness";
  const mannschaft = (t) => /volleyball|spiel|turnier|wettkampf|mannschaft/i.test(String(t.titel || ""));
  const frei = termine.filter(istTraining);
  return geplant.map((g) => {
    const passend = frei.filter((t) => (g.art === "team_sport") === mannschaft(t));
    if (passend.length) {
      const ziel = g.uhrzeit ? min(g.uhrzeit) : 0;
      const t = passend.sort((a, b) => Math.abs(min(hhmm(a.von)) - ziel) - Math.abs(min(hhmm(b.von)) - ziel))[0];
      frei.splice(frei.indexOf(t), 1);
      return { ...g, uhrzeit: hhmm(t.von), minuten: Math.round((t.bis - t.von) / 60000) || g.minuten };
    }
    if (!g.uhrzeit) return g;
    const von = min(g.uhrzeit);
    const bis = von + (Number(g.minuten) || 60);
    const stoer = termine.find((t) => !istTraining(t) && min(hhmm(t.von)) < bis && min(hhmm(t.bis)) > von && ortsTag(Number(t.bis)) === tag);
    return stoer ? { ...g, konflikt: String(stoer.titel || "ein Termin") } : g;
  });
}

function trainingAusPlan(store, tag) {
  const wochentag = new Date(`${tag}T12:00:00`).getDay();
  const sessions = store.getProfile()?.sessions || [];
  // Eine Einheit, die er für diesen Tag bestellt hat, ersetzt das Krafttraining
  // aus dem Wochenplan. Sonst sagt der Morgen "kein Training", obwohl er am
  // Abend vorher "morgen um 14 Uhr Pull" gesagt hat.
  const bestellt = bestellteEinheit(store.getSettings(), tag);
  if (bestellt) {
    const kraftHeute = sessions.find((s) => s.weekday === wochentag && s.type === "strength");
    const andere = sessions.filter((s) => s.weekday === wochentag && s.type !== "strength")
      .map((s) => ({ art: s.type, minuten: s.minutes, uhrzeit: s.startsAt, titel: undefined }));
    return [{ art: "strength", minuten: bestellt.einheit.dauerMin ?? bestellt.minuten, uhrzeit: bestellt.uhrzeit ?? kraftHeute?.startsAt, titel: bestellt.einheit.fokus }, ...andere]
      .sort((a, b) => String(a.uhrzeit ?? "99").localeCompare(String(b.uhrzeit ?? "99")));
  }
  return sessions
    .filter((s) => s.weekday === wochentag)
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))
    .map((s) => {
      // Dieselbe Einheit wie "Als Nächstes" unter Mein Plan, in einer
      // stressigen Woche aus dem Kurzplan.
      const titel = s.type === "strength" ? planEinheitFuer(store.getSettings(), store.getProfile(), tag, tag)?.titel : undefined;
      return { art: s.type, minuten: s.minutes, uhrzeit: s.startsAt, titel };
    });
}

/**
 * Ob der Check-in sich jetzt von selbst öffnen soll. Fünf Bedingungen, und
 * jede verhindert ihn: kein Profil, heute schon gemacht, heute schon
 * angeboten, zu früh, zu spät.
 */
export function morgenFaellig(store, jetzt) {
  const profil = store.getProfile();
  if (!profil) return false;
  if (morgenVonHeute(store, jetzt.tag)) return false;
  if (store.getSettings().morgenAngeboten === jetzt.tag) return false;
  const ab = morgenUhrzeit(tagesrandFuer(profil, jetzt.tag).wakeTime);
  return min(jetzt.uhrzeit) >= min(ab) && min(jetzt.uhrzeit) < min(MORGEN_BIS);
}

/** Bis zu dieser Uhrzeit wird mittags nachgefragt. Abends ist die Frage nach dem Training vorbei. */
export const NACHFRAGE_BIS = "20:00";

/**
 * Ob mittags nachgefragt werden soll: morgens Fitheit 1 oder 2, noch nicht
 * nachgefragt, nach 12:30 und vor 20 Uhr, und heute noch nicht von selbst
 * geöffnet.
 */
export function nachfrageFaellig(store, jetzt) {
  const c = morgenVonHeute(store, jetzt.tag);
  if (!c || c.nachgefragt || !nachfrageNoetig(c.morgen)) return false;
  if (store.getSettings().nachfrageAngeboten === jetzt.tag) return false;
  return min(jetzt.uhrzeit) >= min(NACHFRAGE_UHRZEIT) && min(jetzt.uhrzeit) < min(NACHFRAGE_BIS);
}

function eingabe(store, tag, antworten) {
  const profil = store.getProfile();
  const gesundheit = store.getDay(tag).gesundheit;
  return {
    antworten,
    schlafMinuten: Number.isFinite(Number(gesundheit?.schlafMinuten)) && gesundheit?.schlafMinuten !== null ? Number(gesundheit.schlafMinuten) : null,
    schlafenszeit: profil ? tagesrandFuer(profil, tag).sleepTime : null,
    training: trainingHeute(store, tag),
  };
}

export function morgenErgebnis(store, tag, antworten) {
  return morgenAuswerten(eingabe(store, tag, antworten));
}

/**
 * Speichert die Antwort auf die Nachfrage am selben Check-in. Danach trägt
 * er `trainingGestrichen`, damit Coach und Trainingsmodus es wissen.
 */
export function nachfrageSpeichern(store, tag, gesund) {
  const c = morgenVonHeute(store, tag);
  if (!c || !Number.isInteger(gesund) || gesund < 1 || gesund > 5) return null;
  const r = nachfrageAuswerten(eingabe(store, tag, c.morgen), gesund);
  const tagDaten = store.getDay(tag);
  tagDaten.checkins = (tagDaten.checkins || []).map((x) => (x === c || (x.id && x.id === c.id))
    ? { ...x, nachgefragt: { gesund, um: nowTime() }, belastbarkeit: r.belastbarkeit, trainingGestrichen: Boolean(r.gestrichen) }
    : x);
  store.setDay(tag, tagDaten);
  return r;
}

/** Ob das Training heute gestrichen ist, nach der Nachfrage am Mittag. */
export function trainingGestrichen(store, tag) {
  return Boolean(morgenVonHeute(store, tag)?.trainingGestrichen);
}

/** Speichert. Ein zweiter Check-in am selben Morgen ersetzt den ersten: wer nochmal antwortet, hat sich korrigiert. */
export function morgenSpeichern(store, tag, antworten) {
  if (!morgenVollstaendig(antworten)) return null;
  const r = morgenErgebnis(store, tag, antworten);
  const tagDaten = store.getDay(tag);
  tagDaten.checkins = (tagDaten.checkins || []).filter((c) => !(c.kind === "morning" && c.morgen));
  tagDaten.checkins.push({
    id: newId(), kind: "morning", at: nowTime(), note: "Guten Morgen Check-in",
    energy: r.alsZehner.energy, sleepQuality: r.alsZehner.sleepQuality, mood: null,
    morgen: { ...antworten }, morgenWert: r.wert, belastbarkeit: r.belastbarkeit,
  });
  store.setDay(tag, tagDaten);
  return r;
}

/* ---------- Darstellung ---------- */

export function fragenHtml(antworten = {}) {
  return MORGEN_FRAGEN.map((f) => `<fieldset class="mg-frage"><legend>${esc(f.frage)}</legend>
      <div class="mg-skala" role="radiogroup">${[1, 2, 3, 4, 5].map((v) =>
        `<button type="button" role="radio" aria-checked="${antworten[f.id] === v}" class="mg-punkt${antworten[f.id] === v ? " an" : ""}" data-mg-frage="${f.id}" data-mg-wert="${v}">${v}</button>`).join("")}</div>
      <div class="mg-enden"><span>${esc(f.links)}</span><span>${esc(f.rechts)}</span></div></fieldset>`).join("");
}

export function nachfrageHtml(wert) {
  return `<p class="mg-nachfrage">Heute Morgen ging es dir nicht gut. Davon hängt ab, ob du heute trainierst.</p>
    <fieldset class="mg-frage"><legend>Wie fit fühlst du dich jetzt?</legend>
      <div class="mg-skala" role="radiogroup">${[1, 2, 3, 4, 5].map((v) =>
        `<button type="button" role="radio" aria-checked="${wert === v}" class="mg-punkt${wert === v ? " an" : ""}" data-mg-jetzt="${v}">${v}</button>`).join("")}</div>
      <div class="mg-enden"><span>krank</span><span>topfit</span></div></fieldset>`;
}

/**
 * Eine Zeile zum Zyklus unter dem Ergebnis, nur wenn er eingeschaltet ist.
 * Senken die Beschwerden die Stufe, steht die Empfehlung mit Grund da, sonst
 * nur Tag und Phase: der Morgen hat schon gesagt, wie trainiert wird.
 */
export function zyklusZeileHtml(zyklus, heute) {
  if (!zyklus?.an) return "";
  const stand = zyklusStand(zyklus, heute);
  if (!stand.bekannt) return "";
  const sym = zyklus.symptome?.[heute] || [];
  const e = zyklusEmpfehlung(stand, sym, zyklus.blutung?.[heute]);
  const kopf = `Tag ${stand.tag}${stand.phase ? `, ${PHASE_NAME[stand.phase]}` : ""}`;
  const unter = sym.length ? sym.map((x) => SYMPTOM_NAME[x]).join(", ") + ", aus deinem Eintrag" : "Beschwerden trägst du unter Zyklus ein";
  return `<div class="mg-zyklus"><b>${esc(kopf)}</b><small>${esc(unter)}</small>${e.stufe !== "normal" ? `<p>${esc(e.training)}</p>` : ""}${e.essen && zyklus.blutung?.[heute] === "stark" ? `<p>${esc(e.essen)}</p>` : ""}</div>`;
}

export function ergebnisHtml(r) {
  const liste = (zeilen) => `<ul class="mg-liste">${zeilen.map((z) => `<li>${esc(z)}</li>`).join("")}</ul>`;
  return `<div class="mg-ergebnis">
      ${r.gestrichen
        // Eine Zahl wie 56 neben "Schonen" widerspricht sich. Entschieden hat
        // die Fitheit am Mittag, nicht der Morgenwert.
        ? `<div class="mg-wert mg-schonen"><b class="mg-wort">Ruhetag</b></div>`
        : `<div class="mg-wert mg-${r.belastbarkeit}"><b>${r.wert}</b><span>von 100</span></div>`}
      <p class="mg-stufe">Belastbarkeit heute: <b>${esc(BELASTBARKEIT_NAME[r.belastbarkeit])}</b></p>
      <p class="mg-warum">${esc(r.warum)}</p>
      <h3 class="mg-titel">Training</h3>${liste(r.training)}
      ${r.tipps.length ? `<h3 class="mg-titel">Für heute</h3>${liste(r.tipps)}` : ""}
      <p class="mg-grenze">Das ist keine Messung, sondern deine eigene Einschätzung, zusammengefasst.</p>
    </div>`;
}

/**
 * Das Tagesbriefing unter dem Ergebnis. Der Morgen Check-in ist der Moment,
 * in dem jemand ohnehin auf den Tag schaut, und eine zweite Mitteilung zur
 * selben Zeit wäre Lärm. Ohne Briefing bleibt der Teil leer.
 */
const ART_WORT = { termin: "Termin", aufgabe: "Aufgabe", essen: "Essen", training: "Training" };

/**
 * Das Briefing unter dem Morgen Check-in.
 *
 * Der Fokus steht oben als eigene Fläche, darunter der Tag als Zeitleiste mit
 * Uhrzeiten: Termine, Training, Mahlzeiten und Aufgaben in der Reihenfolge,
 * in der sie kommen. Vorher stand alles als Textliste untereinander, und wer
 * um sieben Uhr auf das Handy schaut, liest keine Liste, er sucht die nächste
 * Uhrzeit. Was keine Uhrzeit hat, steht am Ende ohne Zeit.
 */
export function briefingHtml(b) {
  if (!b?.abschnitte?.length) return "";
  const punkte = (b.punkte || []).slice(0, 12);
  const fokus = b.abschnitte.find((a) => a.titel === "Fokus");
  const rest = b.abschnitte.filter((a) => a.titel !== "Deine Untergrenze" && a.titel !== "Fokus"
    && !(punkte.length && (a.titel === "Dein Tag" || a.titel === "Zu tun" || a.titel === "Essen")));
  const zeit = (ms) => (ms === null || ms === undefined ? "" : new Date(ms).toTimeString().slice(0, 5));
  const leiste = punkte.length
    ? `<h3 class="mg-titel">Dein Tag</h3><ol class="mg-zeitleiste">${punkte.map((p) => `<li class="mg-zeile" data-art="${esc(p.art)}">`
      + `<span class="mg-uhr">${esc(zeit(p.um))}</span><span class="mg-pkt" aria-hidden="true"></span>`
      + `<span class="mg-was"><b>${esc(p.titel)}</b><small>${esc(p.unter || ART_WORT[p.art] || "")}</small></span></li>`).join("")}</ol>`
    : "";
  const abschnitt = (a) => `<h3 class="mg-titel">${esc(a.titel)}</h3>`
    + (a.zeilen.length > 1 ? `<ul class="mg-liste">${a.zeilen.map((z) => `<li>${esc(z)}</li>`).join("")}</ul>` : `<p class="mg-warum">${esc(a.zeilen[0] || "")}</p>`);
  return `<div class="mg-ergebnis mg-tag">`
    + (fokus ? `<div class="mg-fokus"><span>Fokus heute</span><p>${esc(fokus.zeilen.join(" "))}</p></div>` : "")
    + leiste + rest.map(abschnitt).join("") + `</div>`;
}

/* ---------- Oberfläche ---------- */

export function morgenStarten({ store, heute, melde, gespeichert, tagesbriefing, kalenderFrisch }) {
  const blatt = document.getElementById("morgenBlatt");
  const inhalt = document.getElementById("morgenInhalt");
  const knopf = document.getElementById("morgenAuswerten");
  const titel = document.getElementById("morgenTitel");
  let antworten = {};
  let fertig = false;
  // "morgen" für die vier Fragen, "nachfrage" für die eine am Mittag.
  let modus = "morgen";
  let jetzt = null;

  const zeichnen = () => {
    if (fertig) return;
    titel.textContent = modus === "morgen" ? "Guten Morgen" : "Wie geht es dir jetzt?";
    inhalt.innerHTML = modus === "morgen" ? fragenHtml(antworten) : nachfrageHtml(jetzt);
    knopf.disabled = modus === "morgen" ? !morgenVollstaendig(antworten) : jetzt === null;
    knopf.textContent = "Auswerten";
  };
  const zeigen = () => {
    fertig = false;
    zeichnen();
    blatt.hidden = false;
    document.body.classList.add("blatt-offen");
  };
  const oeffnen = () => {
    const alt = morgenVonHeute(store, heute());
    antworten = alt ? { ...alt.morgen } : {};
    modus = "morgen";
    zeigen();
  };
  const nachfrage = () => {
    if (!morgenVonHeute(store, heute())) { oeffnen(); return; }
    modus = "nachfrage";
    jetzt = null;
    zeigen();
  };
  const schliessen = () => { blatt.hidden = true; document.body.classList.remove("blatt-offen"); };

  inhalt.addEventListener("click", (event) => {
    const j = event.target.closest("[data-mg-jetzt]");
    if (j) { jetzt = Number(j.dataset.mgJetzt); spueren("leicht"); zeichnen(); return; }
    const p = event.target.closest("[data-mg-frage]");
    if (!p) return;
    antworten = { ...antworten, [p.dataset.mgFrage]: Number(p.dataset.mgWert) };
    spueren("leicht");
    zeichnen();
  });
  knopf.addEventListener("click", async () => {
    if (fertig) { schliessen(); return; }
    const r = modus === "morgen" ? morgenSpeichern(store, heute(), antworten) : nachfrageSpeichern(store, heute(), jetzt);
    if (!r) return;
    fertig = true;
    spueren("erfolg");
    // Der Kalender wird vor dem Briefing frisch gelesen, höchstens vier
    // Sekunden lang. Ein Termin, der seit gestern Abend dazukam, gehört in
    // das Briefing von heute Morgen.
    if (modus === "morgen" && kalenderFrisch) {
      knopf.disabled = true;
      knopf.textContent = "Kalender wird gelesen";
      await Promise.race([kalenderFrisch().catch(() => {}), new Promise((ok) => setTimeout(ok, 4000))]);
    }
    inhalt.innerHTML = ergebnisHtml(r) + zyklusZeileHtml(store.getSettings?.().zyklus, heute()) + briefingHtml(modus === "morgen" ? tagesbriefing?.() : null);
    inhalt.scrollTop = 0;
    knopf.textContent = "Fertig";
    knopf.disabled = false;
    // Keine Meldung: das Ergebnis selbst zeigt, dass gespeichert ist, und
    // eine Meldung läge über dem letzten Satz.
    gespeichert?.(r);
  });
  document.getElementById("morgenZu").addEventListener("click", schliessen);

  return {
    oeffnen,
    nachfrage,
    /** Die Nachfrage am Mittag, wenn sie fällig ist. */
    nachfrageVielleicht(jetztZeit) {
      if (!nachfrageFaellig(store, jetztZeit)) return false;
      store.setSettings({ ...store.getSettings(), nachfrageAngeboten: jetztZeit.tag });
      nachfrage();
      return true;
    },
    /** Öffnet von selbst, wenn es Zeit ist, und merkt sich, dass gefragt wurde. */
    vielleicht(jetzt) {
      if (!morgenFaellig(store, jetzt)) return false;
      store.setSettings({ ...store.getSettings(), morgenAngeboten: jetzt.tag });
      oeffnen();
      return true;
    },
  };
}
