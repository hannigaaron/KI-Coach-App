import {
  BEREICHE, BEREICH_NAME, CHECKIN_BOEGEN, CHECKIN_MITTE, STANDARD_ZIELE, WOCHENTAGE,
  MAHLZEITEN, bogenAmTag, bogenFuer, energyBreakdown, hatAngebot, nachOrdnern, offeneMahlzeiten,
  impulseFuerTag, planFuer, saubereUrl, uhrzeit, undListe, weightTrend,
} from "@daevo/core";
import { MODELL_JE_MODUS, MODELL_OPTIONEN, MODELLE } from "@daevo/coach";
import { Coach, AnthropicProvider } from "@daevo/coach";
import {
  ablaufFuer, ask, aufgabeAbhaken, aufgabeAnlegenEingestuft, aufgabeLoeschen, aufgabeUmstufen, aufgabenPlan,
  balanceFuer, balanceRat, briefing,
  buildActions, dayNumbers, einkaufslisteText, ensureStandards, greeting, herausforderungSpeichern,
  aktuelleLage, aktivesGespraech, gegesseneArten, gespraechAnlegen, gespraechLoeschen, gespraechNachziehen,
  gespraechOeffnen, gespraecheSuchen,
  aufgabenPlanText, energieCheck, kopfSortieren, mittagscheck, mittagscheckText, musterUebersicht,
  schluesselPruefen, tagesnutzungFuer,
  trainingsplanUebernehmen, trainingsplanVorschlag, widerspruchListe,
  kalenderEntfernen, kalenderImportieren, kalenderStand, kalenderUebersicht,
  kostenUebersicht, recommendations, standardsUebersicht, tagesErinnerungen, verlaufPunkte,
} from "./assistant.js";
import { brain } from "./brain.js";
import { Orb } from "./orb.js";
import { anhangAusDatei, grossInKb } from "./media.js";
import { BEREICH_FARBE, anteilsRing, kurzDauer, metrikRing, richtungVon, ringMitZahl, wertungsRing } from "./rings.js";
import { Listener, deutscheStimmen, speak, stopSpeaking, voiceSupport } from "./voice.js";
import { SetupFlow } from "./setup-ui.js";
import { pushAbmelden, pushAbo, pushAnmelden, pushLage } from "./push.js";
import { newId, nowTime, store, todayIso } from "./storage.js";

const $ = (id) => document.getElementById(id);
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const TYPE_LABEL = { strength: "Kraft", team_sport: "Mannschaftssport", cardio: "Ausdaür", mobility: "Mobility" };
const FEELINGS = ["voll da", "satt und gut", "müde", "aufgebläht", "noch hungrig"];
const KIND_LABEL = {
  fakt: "Fakt", praeferenz: "Vorliebe", ziel: "Ziel",
  ereignis: "Ereignis", reflexion: "Reflexion", hinweis: "Hinweis", muster: "Muster",
};

let profile = store.getProfile();
let day = todayIso();
let lastMealId = null;
let orb = null;
let listener = null;
let busy = false;
let options = { speak: true, handsFree: false };
/** Was bei der nächsten Nachricht mitgeschickt wird. */
let anhaenge = [];

/* ---------- Startbildschirm ---------- */

/** Wie lange die Marke steht und wie lange sie ausblendet. Passt zu styles.css. */
const SPLASH_MS = 1300;
const SPLASH_FADE_MS = 400;

/**
 * Blendet den Startbildschirm aus.
 *
 * Insgesamt 1,7 Sekunden. Lang genug, dass die Marke ankommt, kurz genug,
 * dass niemand wartet. Ein Tipp bricht sofort ab. Der Knoten wird danach aus
 * dem Baum genommen, sonst fängt er weiter Berührungen ab.
 */
function splashWeg(sofort = false) {
  const el = $("splash");
  if (!el || el.dataset.weg) return;
  el.dataset.weg = "1";
  el.classList.add("geht");
  setTimeout(() => el.remove(), sofort ? 0 : SPLASH_FADE_MS);
}

const splash = $("splash");
if (splash) {
  splash.addEventListener("click", () => splashWeg(true));
  setTimeout(() => splashWeg(), SPLASH_MS);
}

/* ---------- Helfer ---------- */

function toast(message, ms = 2600) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setStatus(text) {
  $("assistantStatus").textContent = text;
}

/* ---------- Anhänge ---------- */

/** Höchstens vier Anhänge je Nachricht. Mehr Bilder machen die Antwort nicht besser. */
const MAX_ANHAENGE = 4;

function renderAnhaenge() {
  const el = $("anhangLeiste");
  el.hidden = anhaenge.length === 0;
  el.innerHTML = anhaenge.map((a) => {
    const inhalt = a.vorschau
      ? `<img src="${a.vorschau}" alt="${escapeHtml(a.name)}">`
      : `<span class="anhang-typ">${escapeHtml(a.fehler ? "Fehler" : a.art === "pdf" ? "PDF" : a.art)}</span>`;
    const klassen = ["anhang", a.laedt ? "laedt" : "", a.fehler ? "fehler" : ""].filter(Boolean).join(" ");
    return `<div class="${klassen}" title="${escapeHtml(a.fehler || a.name)}">${inhalt}` +
      `<button class="anhang-weg" data-anhang-weg="${a.id}" aria-label="Anhang entfernen">×</button></div>`;
  }).join("");
  $("btnAnhang").setAttribute("aria-pressed", String(anhaenge.length > 0));
}

async function dateienAufnehmen(dateien) {
  const platz = MAX_ANHAENGE - anhaenge.length;
  if (platz <= 0) { toast(`Mehr als ${MAX_ANHAENGE} Anhänge gehen nicht.`); return; }
  const auswahl = [...dateien].slice(0, platz);
  if (dateien.length > platz) toast(`Ich nehme ${platz} davon, mehr passt nicht.`);

  // Platzhalter sofort zeigen. Ein Video zu verkleinern dauert ein paar
  // Sekunden, und ohne Rückmeldung tippt der Nutzer in der Zeit weiter.
  const platzhalter = auswahl.map((datei) => ({
    id: `laedt-${Math.random().toString(36).slice(2, 8)}`,
    name: datei.name || "Anhang",
    art: (datei.type || "").startsWith("video/") ? "video" : "bild",
    laedt: true,
  }));
  anhaenge = [...anhaenge, ...platzhalter];
  renderAnhaenge();

  for (const [i, datei] of auswahl.entries()) {
    const fertig = await anhangAusDatei(datei);
    const stelle = anhaenge.findIndex((a) => a.id === platzhalter[i].id);
    if (stelle !== -1) anhaenge[stelle] = fertig;
    renderAnhaenge();
    if (fertig.fehler) toast(fertig.fehler, 4200);
    else if (fertig.hinweis) toast(fertig.hinweis, 4200);
  }
}

$("btnAnhang").addEventListener("click", (event) => {
  event.stopPropagation();
  $("anhangMenue").hidden = !$("anhangMenue").hidden;
});
// Tippen ausserhalb schliesst das Menue. Ohne das bleibt es stehen und
// verdeckt den Verlauf, bis jemand Abbrechen findet.
document.addEventListener("click", (event) => {
  if ($("anhangMenue").hidden) return;
  if (event.target.closest("#anhangMenue") || event.target.closest("#btnAnhang")) return;
  $("anhangMenue").hidden = true;
});
$("chatInput").addEventListener("focus", () => { $("anhangMenue").hidden = true; });
$("anhangMenue").addEventListener("click", (event) => {
  const button = event.target.closest("[data-anhang]");
  if (!button) return;
  $("anhangMenue").hidden = true;
  if (button.dataset.anhang === "kamera") $("kameraWahl").click();
  if (button.dataset.anhang === "datei") $("dateiWahl").click();
});
for (const id of ["dateiWahl", "kameraWahl"]) {
  $(id).addEventListener("change", async (event) => {
    const dateien = event.target.files;
    if (dateien?.length) await dateienAufnehmen(dateien);
    // Zurücksetzen, sonst löst dieselbe Datei beim zweiten Mal kein change aus.
    event.target.value = "";
  });
}
$("anhangLeiste").addEventListener("click", (event) => {
  const weg = event.target.closest("[data-anhang-weg]");
  if (!weg) return;
  anhaenge = anhaenge.filter((a) => a.id !== weg.dataset.anhangWeg);
  renderAnhaenge();
});
$("chips").addEventListener("click", (event) => {
  if (event.target.closest("[data-chip-foto]")) $("kameraWahl").click();
});

/* ---------- Assistent ---------- */

/**
 * Die Marke neben der Antwort.
 *
 * Das d aus dem Logo, gebaut wie im Bauplan: die Bowl ist ein Aktivitätsring
 * über 300 Grad mit runden Enden, der Stamm ein Rechteck mit halbrunden
 * Enden. Kein Schriftzeichen, sondern dieselbe Geometrie wie das grosse Logo
 * und wie der Kreis auf dem Assistenten.
 *
 * Sie steht auch über der Antwort, während sie noch entsteht. Ein Absender
 * ohne Marke sieht aus wie ein Systemhinweis, und ein Systemhinweis hat keine
 * Haltung.
 */
function markeSvg() {
  return `<svg class="marke" viewBox="-6 -80 73 87" aria-hidden="true">` +
    `<path d="M 31.80 -49.20 A 21.50 21.50 0 1 1 13.18 -38.45" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>` +
    `<rect x="47" y="-74" width="14" height="74" rx="7" fill="currentColor"/></svg>`;
}

function renderTranscript() {
  const chat = store.getChat();
  const el = $("transcript");
  el.innerHTML = chat
    .slice(-40)
    .map((m) => {
      const done = m.ausgeführt?.length ? `<span class="msg-done">${escapeHtml(m.ausgeführt.join(" und "))}</span>` : "";
      const bilder = m.bilder?.length
        ? `<div class="msg-bilder">${m.bilder.map((b) => `<img src="${b}" alt="Mitgeschicktes Bild">`).join("")}</div>`
        : "";
      const dateien = m.dateien?.length
        ? `<div class="msg-dateien">${escapeHtml(m.dateien.join(", "))}</div>`
        : "";
      if (m.role === "user") {
        return `<div class="msg user">${bilder}${dateien}${escapeHtml(m.text)}${done}</div>`;
      }
      return `<div class="msg assistant">${markeSvg()}` +
        `<div class="msg-text">${bilder}${dateien}${escapeHtml(m.text)}${done}</div></div>`;
    })
    .join("");
  // Erst wenn der Nutzer selbst etwas gesagt hat, schrumpft der Kreis. Die
  // Begrüssung allein zählt nicht, sonst sieht man den großen Kreis nie.
  $("assistant").classList.toggle("has-chat", chat.some((m) => m.role === "user"));
  el.scrollTop = el.scrollHeight;
}

function appendBubble(role, text, bilder = []) {
  const el = $("transcript");
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  if (bilder.length) {
    const reihe = document.createElement("div");
    reihe.className = "msg-bilder";
    for (const quelle of bilder) {
      const bild = document.createElement("img");
      bild.src = quelle;
      bild.alt = "Mitgeschicktes Bild";
      reihe.appendChild(bild);
    }
    node.appendChild(reihe);
  }
  node.appendChild(document.createTextNode(text));
  el.appendChild(node);
  el.scrollTop = el.scrollHeight;
  return node;
}

/**
 * Der Platzhalter, solange die Antwort entsteht.
 *
 * Er trägt dieselbe Marke wie die fertige Antwort und wird zur Antwort, sobald
 * das erste Wort da ist. Deshalb hat er denselben Aufbau: Marke oben, Text
 * darunter. Ohne das würde der Text beim ersten Wort springen.
 */
function appendPending(text) {
  const el = $("transcript");
  const node = document.createElement("div");
  node.className = "msg assistant pending";
  node.innerHTML = markeSvg();
  const inhalt = document.createElement("div");
  inhalt.className = "msg-text";
  inhalt.textContent = text;
  node.appendChild(inhalt);
  el.appendChild(node);
  el.scrollTop = el.scrollHeight;
  return { node, text: inhalt };
}

async function send(text) {
  const nachricht = text.trim();

  // Die Antwort auf die Energiefrage aus der Benachrichtigung. Eine blosse
  // Zahl von 1 bis 10 wird hier gerechnet und geht nicht an das Modell: die
  // Bewertung steht im Rechenkern, kostet nichts und läuft ohne Schlüssel.
  const zahl = offeneFrage === "energie" ? nurZahl(nachricht) : null;
  if (zahl !== null && !busy) {
    offeneFrage = null;
    $("chatInput").value = "";
    appendBubble("user", nachricht);
    const chat = store.getChat();
    chat.push({ role: "user", text: nachricht, at: new Date().toISOString() });
    const { text: antwort } = energieCheck(zahl);
    chat.push({ role: "assistant", text: antwort, at: new Date().toISOString() });
    store.setChat(chat);
    gespraechNachziehen();
    renderTranscript();
    refreshAll();
    return;
  }
  offeneFrage = null;

  const mit = anhaenge.filter((a) => !a.fehler && !a.laedt);
  if ((!nachricht && mit.length === 0) || busy) return;
  if (anhaenge.some((a) => a.laedt)) { toast("Ein Anhang wird noch verarbeitet."); return; }
  busy = true;
  stopSpeaking();
  $("chatInput").value = "";

  // Ohne Text, aber mit Bild: der Coach soll trotzdem etwas zum Anfassen haben.
  const frage = nachricht || (mit.length ? "Schau dir das an." : "");

  // Die Nachricht wird nur angezeigt, gespeichert wird sie in ask(). Sonst
  // landet sie zweimal im Verlauf.
  appendBubble("user", frage, mit.map((a) => a.vorschau).filter(Boolean));
  const gesendet = mit;
  anhaenge = [];
  renderAnhaenge();
  $("assistant").classList.add("has-chat");
  const pending = appendPending(gesendet.length ? "schaut sich das Bild an" : "denkt nach");
  orb.setState("thinking");
  setStatus("denkt nach");

  // Der Text läuft in die Blase, während er geschrieben wird. Ein Stück Text
  // ist ein Anhängen, null heisst: alles bisherige war ein Zwischenschritt und
  // wird verworfen.
  let laufend = "";
  const onStrom = (stueck) => {
    if (stueck === null) { laufend = ""; pending.text.textContent = "denkt nach"; return; }
    laufend += stueck;
    pending.node.classList.remove("pending");
    pending.text.textContent = laufend;
    $("transcript").scrollTop = $("transcript").scrollHeight;
  };

  try {
    const reply = await ask(frage, { onChange: refreshAll, anhaenge: gesendet, onStrom });
    pending.node.remove();
    gespraechNachziehen();
    renderTranscript();
    refreshAll();
    if (options.speak) {
      orb.setState("speaking");
      setStatus("spricht");
      const stimmEinst = store.getSettings();
      speak(reply.text, {
        enabled: options.speak,
        stimme: stimmEinst.stimme,
        tempo: stimmEinst.sprechtempo,
        onEnd: () => {
          orb.setState("idle");
          setStatus("bereit");
          if (options.handsFree) startListening();
        },
      });
    } else {
      orb.setState("idle");
      setStatus("bereit");
      if (options.handsFree) startListening();
    }
  } catch (error) {
    pending.node.remove();
    const chatNow = store.getChat();
    chatNow.push({ role: "assistant", text: `Das hat nicht geklappt: ${error.message}`, at: new Date().toISOString() });
    store.setChat(chatNow);
    renderTranscript();
    orb.setState("idle");
    setStatus("bereit");
  } finally {
    busy = false;
  }
}

/**
 * Kopf leeren als Sprachnachricht im Chat.
 *
 * Zwei Unterschiede zum normalen Mikrofon. Die Sprechpause darf sechs Sekunden
 * lang sein statt gut zwei, weil man beim Rausreden zwischendurch nachdenkt und
 * eine Denkpause kein Satzende ist. Und die Aufnahme läuft bis zu fünf Minuten
 * statt zwei.
 *
 * Am Ende geht der Text nicht als normale Frage an den Coach, sondern durch die
 * Sortierung. Der Nutzer sieht seinen eigenen Schwall als Nachricht und darunter
 * die geordnete Liste, und die Aufgaben stehen danach wirklich in der Liste.
 */
let dumpListener = null;

async function dumpFertig(text) {
  const roh = String(text || "").trim();
  $("btnDump").setAttribute("aria-pressed", "false");
  $("chatInput").value = "";
  if (roh.length < 20) {
    orb.setState("idle");
    setStatus("bereit");
    toast("Da war zu wenig. Red einfach alles raus.");
    return;
  }

  busy = true;
  appendBubble("user", roh);
  $("assistant").classList.add("has-chat");
  const pending = appendPending("sortiert das");
  orb.setState("thinking");
  setStatus("sortiert");

  try {
    const ergebnis = await kopfSortieren(roh);
    pending.node.remove();
    const antwort = ergebnis
      ? `${ergebnis.text}\n\n${ergebnis.angelegt.length} Aufgaben stehen jetzt in deiner Liste.\n\n${aufgabenPlanText()}`
      : "Dafür war zu wenig da.";

    const chat = store.getChat();
    chat.push({ role: "user", text: roh, at: new Date().toISOString() });
    chat.push({
      role: "assistant", text: antwort, at: new Date().toISOString(),
      ausgeführt: ergebnis ? [`${ergebnis.angelegt.length} Aufgaben angelegt`] : [],
    });
    store.setChat(chat);
    gespraechNachziehen();
    renderTranscript();
    refreshAll();
  } catch (error) {
    pending.node.remove();
    const chat = store.getChat();
    chat.push({ role: "assistant", text: `Das hat nicht geklappt: ${error.message}`, at: new Date().toISOString() });
    store.setChat(chat);
    renderTranscript();
  } finally {
    busy = false;
    orb.setState("idle");
    setStatus("bereit");
  }
}

$("btnDump").addEventListener("click", () => {
  if (dumpListener?.active) { dumpListener.fertig("nutzer"); return; }
  if (busy) return;
  if (!voiceSupport.erkennung) {
    toast("Dieser Browser kann keine Spracherkennung. Schreib es ins Feld, dann sortiere ich es genauso.");
    $("chatInput").focus();
    return;
  }
  stopSpeaking();
  listener?.stop?.();

  dumpListener = new Listener({
    pauseMs: 6000,
    maxMs: 300000,
    stilleMs: 12000,
    onPartial: (t) => { $("chatInput").value = t; },
    onFinal: (t) => { dumpFertig(t); },
    onLevel: (level) => orb.setLevel(level),
    onState: (state) => {
      if (state === "listening") {
        orb.setState("listening");
        setStatus("hört zu, tipp auf Kopf, wenn du fertig bist");
        $("orbHint").textContent = "Red alles raus. Pausen sind in Ordnung. Tipp auf Kopf, wenn du fertig bist.";
      }
    },
  });
  dumpListener.start();
  $("btnDump").setAttribute("aria-pressed", "true");
  toast("Red alles raus. Ich sortiere danach.");
});

function startListening() {
  if (!listener?.supported) {
    toast("Dieser Browser kann keine Spracherkennung. Nutze Safari oder Chrome.");
    return;
  }
  if (listener.active) {
    listener.stop();
    return;
  }
  stopSpeaking();
  listener.handsFree = options.handsFree;
  listener.start();
}

function setupAssistant() {
  orb = new Orb($("orb"));
  listener = new Listener({
    onPartial: (text) => { $("chatInput").value = text; },
    onFinal: (text) => { send(text); },
    onLevel: (level) => orb.setLevel(level),
    onState: (state, detail) => {
      $("btnMic").setAttribute("aria-pressed", state === "listening" ? "true" : "false");
      if (state === "listening") {
        orb.setState("listening");
        setStatus("hört zu, tipp auf Fertig");
        $("btnMic").classList.add("hoert");
        $("orbHint").textContent = "Sprich in Ruhe. Tipp auf den Kreis, wenn du fertig bist.";
      }
      else if (state === "error") {
        toast(`Mikrofon: ${detail}`);
        orb.setState("idle"); setStatus("bereit");
        $("btnMic").classList.remove("hoert");
        $("orbHint").textContent = "Tipp auf den Kreis und sprich";
      }
      else {
        $("btnMic").classList.remove("hoert");
        $("orbHint").textContent = "Tipp auf den Kreis und sprich";
        if (!busy) { orb.setState("idle"); setStatus("bereit"); }
      }
    },
  });

  // Sorgt dafür, dass ein Gespräch offen ist. Ohne das schreibt setChat ins
  // Leere, und die erste Nachricht des Tages wäre weg.
  aktivesGespraech();
  if (store.getChat().length === 0) {
    const text = greeting();
    store.setChat([{ role: "assistant", text, at: new Date().toISOString() }]);
  }
  renderTranscript();
  setStatus("bereit");
}

/* ---------- Bereiche ---------- */

function showView(name) {
  for (const view of document.querySelectorAll(".view")) view.hidden = view.dataset.view !== name;
  $("menu").hidden = true;
  if (name === "heute") renderToday();
  if (name === "essen") { $("fridgeInput").value = store.getFridge().join(", "); renderMeals("mealList2"); renderRestDesTages(); }
  if (name === "checkin") renderCheckins();
  if (name === "reflexion") renderMemories();
  if (name === "einkauf") renderEinkauf();
  if (name === "kalender") renderKalender();
  if (name === "tag") renderTag();
  if (name === "balance") renderBalance();
  if (name === "standards") { renderStandards(); zeigeAngebot("standardsAngebot"); }
  if (name === "gespraeche") renderGespraeche();
  if (name === "wochencheck") wcStart();
  if (name === "empfehlungen") { renderRecommendations(); zeigeAngebot("empfehlungenAngebot"); }
  if (name === "profil") renderProfile();
  if (name === "assistant") renderTranscript();
}

function refreshAll() {
  const visible = document.querySelector(".view:not([hidden])");
  const numbers = dayNumbers(day);
  orb?.setProgress(numbers.targets.kcal > 0 ? numbers.totals.kcal / numbers.targets.kcal : 0);
  if (!visible) return;
  const name = visible.dataset.view;
  if (name === "heute") renderToday();
  if (name === "essen") renderMeals("mealList2");
  if (name === "checkin") renderCheckins();
  if (name === "reflexion") renderMemories();
  if (name === "einkauf") renderEinkauf();
  if (name === "kalender") renderKalender();
  if (name === "tag") renderTag();
  if (name === "balance") renderBalance();
  if (name === "standards") { renderStandards(); zeigeAngebot("standardsAngebot"); }
}

/**
 * Die fünf Bereiche als schmaler Streifen auf der Tagesansicht.
 *
 * Bewusst hier und nicht nur unter Balance: was man nur sieht, wenn man danach
 * sucht, sieht man nicht. Der Streifen zeigt den heutigen Tag, das ganze Board
 * mit Woche und Zielen liegt im Menue.
 */
/**
 * Die Tageswertung ganz oben.
 *
 * Aufbau wie ein Messwert, den man kennt: die Teilwerte klein darüber, mit
 * Richtung gegen gestern, darunter die eine Zahl gross. Wer nur die Zahl
 * sieht, weiss nicht, warum sie so ist. Wer nur die Teile sieht, muss rechnen.
 */
const URTEIL = [
  { ab: 85, wort: "Stark" },
  { ab: 70, wort: "Ziemlich gut" },
  { ab: 50, wort: "Solide" },
  { ab: 30, wort: "Dünn" },
  { ab: 0, wort: "Schwach" },
];

function renderTagWertung() {
  const heute = tagesnutzungFuer(day);
  const gesternTag = new Date(`${day}T12:00:00`);
  gesternTag.setDate(gesternTag.getDate() - 1);
  const gestern = tagesnutzungFuer(gesternTag.toISOString().slice(0, 10));

  // Jede Kennzahl führt dorthin, wo man sie ändern kann. Eine Zahl ohne Weg
  // zur Handlung ist nur eine Zahl.
  const ZIEL = { Balance: "balance", Aufgaben: "tag", Standards: "standards", Ernährung: "essen" };

  const metriken = $("tagMetriken");
  metriken.innerHTML = "";
  for (const teil of heute.teile) {
    const alt = gestern.teile.find((x) => x.name === teil.name);
    const kachel = metrikRing({
      name: teil.name,
      wert: teil.wert,
      richtung: richtungVon(teil.wert, alt?.wert),
    });
    const ziel = ZIEL[teil.name];
    if (ziel) {
      kachel.classList.add("klickbar");
      kachel.setAttribute("role", "button");
      kachel.setAttribute("tabindex", "0");
      kachel.dataset.ziel = ziel;
      kachel.addEventListener("click", () => showView(ziel));
      kachel.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showView(ziel); }
      });
    }
    metriken.appendChild(kachel);
  }

  const wrap = $("tagWertung");
  wrap.innerHTML = "";
  wrap.appendChild(wertungsRing({
    wert: heute.wert,
    etikett: "TAGESNUTZUNG",
    urteil: URTEIL.find((u) => heute.wert >= u.ab).wort,
    groesse: 230,
  }));

  $("tagWertungSatz").textContent = heute.satz;
}

function renderHeuteBalance() {
  const el = $("heuteBalance");
  if (!el) return;
  const b = balanceFuer(1, day);
  el.innerHTML = "";
  for (const stand of b.bereiche) {
    const kachel = document.createElement("div");
    kachel.className = "ring-kachel";
    kachel.appendChild(ringMitZahl({
      anteil: stand.anteilAmTag,
      zahl: `${Math.round(stand.anteilAmTag * 100)}%`,
      farbe: BEREICH_FARBE[stand.bereich],
      groesse: 72,
    }));
    const name = document.createElement("div");
    name.className = "k-name";
    name.textContent = stand.name;
    kachel.appendChild(name);
    el.appendChild(kachel);
  }

  const nutzung = tagesnutzungFuer(day);
  const leer = b.bereiche.filter((x) => x.minuten === 0).map((x) => x.name);
  $("heuteBalanceHinweis").textContent = b.gesamtMinuten === 0
    ? "Heute ist noch keine Minute gemessen. Kalender, eingetragene Zeit oder erledigte Aufgabe füllen die Ringe."
    : `Tagesnutzung ${nutzung.wert} von 100.${leer.length ? ` Noch nichts in: ${leer.join(", ")}.` : ""}`;
}

function renderToday() {
  const n = dayNumbers(day);
  const ratio = n.targets.kcal > 0 ? Math.min(1, n.totals.kcal / n.targets.kcal) : 0;
  const circumference = 2 * Math.PI * 52;
  $("ringKcal").style.strokeDashoffset = String(circumference * (1 - ratio));
  $("ringKcal").style.stroke = n.totals.kcal > n.targets.kcal ? "var(--bad)" : "var(--accent)";
  $("kcalLeft").textContent = String(n.rest.kcal);
  $("kcalEaten").textContent = `${n.totals.kcal} kcal`;
  $("kcalTarget").textContent = `${n.targets.kcal} kcal`;

  const scoreIsMeaningful = new Date().getHours() >= 18 || n.totals.kcal >= n.targets.kcal * 0.7;
  $("scoreLabel").textContent = scoreIsMeaningful ? "Ernährung" : "Protein offen";
  $("scoreVal").textContent = scoreIsMeaningful ? `${n.score.total} / 100` : `${Math.max(0, n.rest.proteinG)} g`;

  setBar("p", n.totals.proteinG, n.targets.proteinG, "g");
  setBar("f", n.totals.fatG, n.targets.fatG, "g");
  setBar("c", n.totals.carbsG, n.targets.carbsG, "g");
  setBar("w", n.totals.waterMl, n.targets.waterMl, "ml");

  const reminders = tagesErinnerungen(day);
  const time = nowTime();
  const upcoming = reminders.filter((r) => r.at >= time).slice(0, 3);
  const list = upcoming.length ? upcoming : reminders.slice(-2);
  $("reminderList").innerHTML = list.length
    ? list.map((r) =>
        `<li><div class="li-main"><div class="li-title">${escapeHtml(r.title)}</div>` +
        `<div class="li-sub">${escapeHtml(r.body)}</div></div>` +
        `<div class="li-side"><b>${r.at}</b>${r.at < time ? "vorbei" : "geplant"}</div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">Für heute ist alles erledigt.</div></div></li>`;

  renderTagWertung();
  renderHeuteBalance();
  renderWeight();
  renderMeals("mealList");
}

/**
 * Gewicht und Richtung.
 *
 * Die Richtung kommt aus einer Geraden durch alle Wiegungen, nicht aus dem
 * Vergleich zweier Tage. Das Gewicht schwankt je nach Salz, Kohlenhydraten
 * und Darminhalt um ein bis zwei Kilo, zwei einzelne Tage sagen deshalb nichts.
 */
function renderWeight() {
  const heute = store.getDay(day).weightKg;
  const feld = $("weightInput");
  if (document.activeElement !== feld) feld.value = heute ?? "";
  const trend = weightTrend(verlaufPunkte(56));
  if (trend.messungen === 0) {
    $("weightTrend").textContent = "Noch keine Wiegung. Wieg dich am besten morgens nach dem Klo, dann schwankt es am wenigsten.";
    return;
  }
  if (!trend.belastbar) {
    $("weightTrend").textContent =
      `${trend.messungen} ${trend.messungen === 1 ? "Wiegung" : "Wiegungen"} bisher. ` +
      "Ab vier Wiegungen über zwei Wochen kann ich eine Richtung sagen.";
    return;
  }
  const richtung = trend.kgProWoche > 0 ? "plus" : "minus";
  $("weightTrend").textContent =
    `Geglättet ${trend.aktuellKg} kg, ${richtung} ${Math.abs(trend.kgProWoche).toFixed(2)} kg je Woche ` +
    `über ${trend.spanneTage} Tage aus ${trend.messungen} Wiegungen. Frag mich nach deinem Verlauf, dann rechne ich dein Ziel nach.`;
}

function setBar(prefix, actual, target, unit) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  $(`${prefix}Bar`).style.width = `${pct}%`;
  $(`${prefix}Bar`).classList.toggle("over", target > 0 && actual > target * 1.1);
  $(`${prefix}Txt`).textContent = `${actual} / ${target} ${unit}`;
}

function renderMeals(targetId) {
  const el = $(targetId);
  if (!el) return;
  const meals = store.getDay(day).meals;
  el.innerHTML = meals.length
    ? meals.map((meal) => {
        const kcal = Math.round(meal.entries.reduce((s, e) => s + e.kcal, 0));
        const protein = Math.round(meal.entries.reduce((s, e) => s + e.proteinG, 0));
        const items = meal.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
        return `<li data-meal="${meal.id}"><div class="li-main">` +
          `<div class="li-title">${escapeHtml(items || meal.text)}</div>` +
          `<div class="li-sub">${meal.at} Uhr, ${protein} g Protein` +
          (meal.feeling ? `, danach ${escapeHtml(meal.feeling)}` : "") +
          (meal.source === "offline" ? ", Tabellenwert" : "") +
          `</div></div><div class="li-side"><b>${kcal}</b>kcal</div></li>`;
      }).join("")
    : `<li><div class="li-main"><div class="li-sub">Noch nichts erfasst.</div></div></li>`;
}

function renderCheckins() {
  const checkins = store.getDay(day).checkins;
  $("checkinList").innerHTML = checkins.length
    ? checkins.slice().reverse().map((c) =>
        `<li><div class="li-main"><div class="li-title">${escapeHtml(c.note || "Check-in")}</div>` +
        `<div class="li-sub">${c.at} Uhr, Schlaf ${c.sleepQuality ?? "-"}, Stimmung ${c.mood ?? "-"}</div></div>` +
        `<div class="li-side"><b>${c.energy ?? "-"}</b>Energie</div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">Heute noch kein Check-in.</div></div></li>`;
}

function renderMemories() {
  const query = $("memSearch").value.trim();
  const entries = query ? brain.search(query, 40).map((h) => h.entry) : brain.all().slice().reverse();
  $("memCount").textContent = String(brain.all().length);
  $("memList").innerHTML = entries.length
    ? entries.map((e) =>
        `<li><div class="li-main"><span class="mem-kind">${KIND_LABEL[e.kind] ?? e.kind}</span>` +
        `<div class="li-title">${escapeHtml(e.text)}</div>` +
        `<div class="li-sub">${e.at.slice(0, 10)}, Wichtigkeit ${e.weight}${e.tags.length ? ", " + escapeHtml(e.tags.join(", ")) : ""}</div></div>` +
        `<div class="li-side"><button class="ghost" data-mem-del="${e.id}">Weg</button></div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">${query ? "Nichts gefunden." : "Noch nichts gemerkt. Erzähl dem Assistenten etwas über dich."}</div></div></li>`;
}

/* ---------- Einkaufsliste ---------- */

const EK_TITEL = {
  protein: "Protein", kohlenhydrate: "Kohlenhydrate", gemuese: "Gemüse",
  obst: "Obst", fett: "Fett", sonstiges: "Sonstiges",
};
const EK_STAND = { offen: "offen", gekauft: "gekauft", zuhause: "hab ich" };

function renderEinkauf() {
  const liste = store.getShoppingList();
  const el = $("einkaufList");
  if (!liste || liste.items.length === 0) {
    el.innerHTML = `<li><div class="li-main"><div class="li-sub">Noch keine Liste. Tipp auf Liste rechnen.</div></div></li>`;
    $("einkaufHinweis").textContent = "";
    $("einkaufSub").textContent = "Gerechnet aus deinen Tageszielen.";
    return;
  }
  $("einkaufTage").value = liste.tage;
  const offen = liste.items.filter((i) => i.stand === "offen").length;
  $("einkaufSub").textContent =
    `${liste.items.length} Posten, ${offen} noch offen. Tipp auf Gekauft oder auf Hab ich noch.`;
  $("einkaufHinweis").textContent = liste.hinweis +
    (liste.gemieden.length ? ` Ausgelassen: ${liste.gemieden.join(", ")}.` : "");

  el.innerHTML = liste.items.map((item) => {
    const erledigt = item.stand !== "offen";
    return `<li${erledigt ? ' class="erledigt"' : ""}>
      <div class="li-main">
        <span class="ek-stand ${item.stand}">${EK_TITEL[item.kategorie]}${item.stand === "offen" ? "" : `, ${EK_STAND[item.stand]}`}</span>
        <div class="li-title">${escapeHtml(item.name)}, ${escapeHtml(item.menge)}</div>
        <div class="li-sub">${escapeHtml(item.grund)}</div>
      </div>
      <div class="li-side ek-knoepfe">
        <button class="ghost" data-ek="${item.key}" data-stand="${item.stand === "gekauft" ? "offen" : "gekauft"}">${item.stand === "gekauft" ? "Zurück" : "Gekauft"}</button>
        <button class="ghost" data-ek="${item.key}" data-stand="${item.stand === "zuhause" ? "offen" : "zuhause"}">${item.stand === "zuhause" ? "Zurück" : "Hab ich"}</button>
      </div>
    </li>`;
  }).join("");
}

/* ---------- Mindeststandards ---------- */

function renderStandards() {
  const status = standardsUebersicht();
  const el = $("standardList");
  if (status.length === 0) {
    el.innerHTML = `<li><div class="li-main"><div class="li-sub">Noch keine Standards. Setz dir unten einen.</div></div></li>`;
    return;
  }
  el.innerHTML = status.map((s) => {
    const prozent = Math.round(s.quote * 100);
    const klasse = prozent >= 80 ? "" : prozent >= 40 ? "schwach" : "rot";
    const messbar = ["protein", "wasser", "schritte", "erfassen"].includes(s.standard.kind);
    return `<li>
      <div class="li-main">
        <div class="li-title">${escapeHtml(s.standard.text)}</div>
        <div class="li-sub">${escapeHtml(s.zahlen)}, seit ${s.standard.seit.slice(8, 10)}.${s.standard.seit.slice(5, 7)}.</div>
        <div class="std-quote">
          <div class="std-bar"><i class="${klasse}" style="width:${prozent}%"></i></div>
          <span class="std-zahl">${prozent} %</span>
        </div>
      </div>
      <div class="li-side ek-knoepfe">
        ${messbar ? "" : `<button class="ghost" data-std-ok="${s.standard.id}">${s.aktuell ? "Gehalten" : "Heute ok"}</button>`}
        <button class="ghost" data-std-del="${s.standard.id}">Weg</button>
      </div>
    </li>`;
  }).join("");
}

function renderRecommendations() {
  $("recoList").innerHTML = recommendations()
    .map((r) => `<div class="reco"><h3>${escapeHtml(r.titel)}</h3><p>${escapeHtml(r.text)}</p><div class="grund">${escapeHtml(r.grund)}</div></div>`)
    .join("");

  $("musterText").textContent = musterUebersicht(60);

  const liste = widerspruchListe();
  $("widerspruchListe").innerHTML = liste.length === 0
    ? '<div class="empty">Zwischen Anspruch und Umsetzung sehe ich gerade keinen Widerspruch.</div>'
    : liste
      .map((w) => `<div class="reco"><h3>${escapeHtml(w.thema)}</h3>` +
        `<p>${escapeHtml(w.anspruch)} ${escapeHtml(w.wirklichkeit)}</p>` +
        `<div class="grund">${escapeHtml(w.frage)}</div></div>`)
      .join("");
}

/**
 * Die Zeiten je Wochentag im Profil.
 *
 * Ein leeres Feld heisst nicht null Uhr, sondern "für diesen Tag gilt der
 * Schnitt". Deshalb wird ein leerer Wert gelöscht und nicht gespeichert.
 */
function renderWochenzeiten() {
  const box = $("e-wochenbox");
  const modus = $("e-randmodus").value;
  box.hidden = modus !== "wochentag";

  $("e-randhilfe").textContent = modus === "wechselnd"
    ? "Deine Zeiten oben gelten als Schnitt. Sag im Chat, wann du an einem Tag wirklich aufstehst, "
      + "etwa \"morgen um 5 raus\", dann rechne ich diesen Tag damit."
    : modus === "wochentag"
      ? "Für Tage ohne Eintrag gilt dein Schnitt. Einzelne Tage änderst du jederzeit im Chat."
      : "";

  if (box.hidden) return;
  const werte = profile.wochenraender || {};
  const el = $("e-wochenzeiten");
  el.innerHTML = WOCHENTAGE.map((t) => {
    const e = werte[String(t.nr)] || {};
    return `<div class="wochenzeile">
      <span class="wt-tag">${t.kurz}</span>
      <input type="time" data-wt="${t.nr}" data-teil="wakeTime" value="${e.wakeTime ?? ""}"
             aria-label="${t.name} aufstehen">
      <input type="time" data-wt="${t.nr}" data-teil="sleepTime" value="${e.sleepTime ?? ""}"
             aria-label="${t.name} schlafen">
    </div>`;
  }).join("");
}

function wochenzeitenLesen() {
  const out = {};
  for (const el of $("e-wochenzeiten").querySelectorAll("[data-wt]")) {
    if (!el.value) continue;
    const tag = el.dataset.wt;
    out[tag] = { ...(out[tag] || {}), [el.dataset.teil]: el.value };
  }
  return out;
}

/**
 * Die Stimmauswahl.
 *
 * Welche Stimmen ein Gerät hat, weiss nur das Gerät. Auf einem iPhone sind die
 * besseren Varianten ein eigener Download unter Bedienungshilfen, und ohne den
 * bleibt nur die Basisqualität. Deshalb steht die Liste hier zur Auswahl statt
 * einer festen Stimme im Code, und der Hinweis sagt, was zu tun ist.
 */
function renderStimmwahl() {
  const feld = $("e-stimme");
  if (!feld) return;
  const liste = deutscheStimmen();
  const gewaehlt = store.getSettings().stimme || "";

  if (liste.length === 0) {
    feld.innerHTML = '<option value="">Keine deutsche Stimme gefunden</option>';
    $("e-stimmhilfe").textContent = "Dieses Gerät hat keine deutsche Stimme installiert.";
    return;
  }

  feld.innerHTML = liste.map((v) => {
    const gut = /premium|neural|enhanced|natural/i.test(v.name);
    return `<option value="${escapeHtml(v.name)}"${v.name === gewaehlt ? " selected" : ""}>`
      + `${escapeHtml(v.name)}${gut ? " (bessere Qualität)" : ""}</option>`;
  }).join("");

  const beste = liste[0];
  const hatGute = /premium|neural|enhanced|natural/i.test(beste?.name || "");
  $("e-stimmhilfe").textContent = hatGute
    ? "Ohne eigene Wahl nehme ich die beste männliche Stimme, die dein Gerät hat."
    : "Dein Gerät hat nur Stimmen in Basisqualität. Auf dem iPhone lädst du bessere unter "
      + "Einstellungen, Bedienungshilfen, Gesprochene Inhalte, Stimmen, Deutsch. "
      + "Wähl dort eine Stimme mit dem Zusatz Premium. Der Unterschied ist deutlich grösser "
      + "als zwischen zwei verschiedenen Stimmen.";
}

/* ---------- Rest des Tages ---------- */

// Welche Mahlzeiten der Nutzer angetippt hat. Null heisst: noch nichts
// angetippt, dann entscheidet die Uhrzeit.
let restWahl = null;

function renderRestDesTages() {
  const n = dayNumbers(day);
  const satz = $("restSatz");
  if (!satz) return;

  satz.textContent = n.rest.kcal > 0
    ? `Offen sind noch ${n.rest.kcal} kcal und ${Math.max(0, n.rest.proteinG)} g Protein.`
    : `Dein Tagesziel ist erreicht, ${Math.abs(n.rest.kcal)} kcal darüber.`;

  const gegessen = gegesseneArten(n.data.meals);
  const vorgabe = offeneMahlzeiten(new Date().getHours(), gegessen);
  const gewaehlt = restWahl ?? vorgabe;

  $("restMahlzeiten").innerHTML = MAHLZEITEN.map((m) => {
    const an = gewaehlt.includes(m.art);
    const schon = gegessen.includes(m.art);
    return `<button type="button" class="pill${an ? " on" : ""}" data-mahlzeit="${m.art}">`
      + `${escapeHtml(m.name)}${schon ? " ✓" : ""}</button>`;
  }).join("");
}

$("restMahlzeiten").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-mahlzeit]");
  if (!knopf) return;
  const art = knopf.dataset.mahlzeit;
  const n = dayNumbers(day);
  const aktuell = restWahl ?? offeneMahlzeiten(new Date().getHours(), gegesseneArten(n.data.meals));
  restWahl = aktuell.includes(art) ? aktuell.filter((x) => x !== art) : [...aktuell, art];
  renderRestDesTages();
});

$("btnRestPlanen").addEventListener("click", async () => {
  const knopf = $("btnRestPlanen");
  const feld = $("restAusgabe");
  knopf.disabled = true;
  knopf.textContent = "daevo rechnet";
  feld.hidden = false;
  feld.textContent = "Ich teile das auf.";
  try {
    vorratLesen();
    const text = await buildActions({ onChange: refreshAll })
      .tagZuEndePlanen({ mahlzeiten: restWahl ?? undefined });
    feld.textContent = text;
  } catch (error) {
    feld.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Rest aufteilen und Vorschläge holen";
  }
});

/* ---------- Gespräche ---------- */

let gsFilter = null;

function renderGespraeche() {
  const frage = $("gsSuche").value.trim();
  const aktiv = store.getAktivesGespraech();

  // Der Filter zeigt nur Ordner, in denen wirklich etwas liegt. Sechs leere
  // Kacheln sagen nichts und kosten eine Bildschirmhöhe.
  const belegt = nachOrdnern(store.getGespraeche());
  $("gsOrdnerFilter").innerHTML = belegt.length > 1
    ? `<button class="pill${gsFilter === null ? " on" : ""}" data-filter="">Alle</button>`
      + belegt.map((x) =>
        `<button class="pill${gsFilter === x.ordner.id ? " on" : ""}" data-filter="${x.ordner.id}">`
        + `${escapeHtml(x.ordner.name)}</button>`).join("")
    : "";

  if (frage.length >= 2) {
    const funde = gespraecheSuchen(frage);
    $("gsListe").innerHTML = funde.length === 0
      ? `<p class="gs-leer">Nichts gefunden zu "${escapeHtml(frage)}".</p>`
      : funde.map((f) => eintragHtml(f.gespraech, aktiv, f.stelle)).join("");
    return;
  }

  const gruppen = belegt.filter((x) => !gsFilter || x.ordner.id === gsFilter);
  if (gruppen.length === 0) {
    $("gsListe").innerHTML = '<p class="gs-leer">Noch keine Gespräche. Fang oben eins an, '
      + 'daevo sortiert es selbst ein, sobald das Thema klar ist.</p>';
    return;
  }

  $("gsListe").innerHTML = gruppen.map((x) => `
    <div class="gs-ordner">
      <span class="punkt" style="background:${x.ordner.farbe}"></span>
      <b>${escapeHtml(x.ordner.name)}</b>
      <span class="anzahl">${x.gespraeche.length}</span>
    </div>
    ${x.gespraeche.map((g) => eintragHtml(g, aktiv)).join("")}`).join("");
}

function eintragHtml(g, aktiv, stelle = "") {
  const wann = new Date(g.zuletzt).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  const anzahl = g.nachrichten.length;
  return `<div class="gs-eintrag${g.id === aktiv ? " on" : ""}">
    <div class="gs-text" data-oeffnen="${g.id}" role="button" tabindex="0">
      <b>${escapeHtml(g.titel)}</b>
      <span class="gs-meta">${wann} · ${anzahl} ${anzahl === 1 ? "Nachricht" : "Nachrichten"}`
      + `${g.ordnerFest ? " · von dir einsortiert" : ""}</span>
      ${stelle ? `<span class="gs-stelle">${escapeHtml(stelle)}</span>` : ""}
    </div>
    <button class="gs-weg" data-loeschen="${g.id}" aria-label="Gespräch löschen">&times;</button>
  </div>`;
}

$("gsSuche").addEventListener("input", renderGespraeche);

$("gespraeche").addEventListener("click", (event) => {
  const filter = event.target.closest("[data-filter]");
  if (filter) { gsFilter = filter.dataset.filter || null; renderGespraeche(); return; }

  const weg = event.target.closest("[data-loeschen]");
  if (weg) {
    gespraechLoeschen(weg.dataset.loeschen);
    renderGespraeche();
    return;
  }

  const oeffnen = event.target.closest("[data-oeffnen]");
  if (oeffnen) {
    gespraechOeffnen(oeffnen.dataset.oeffnen);
    showView("assistant");
    renderTranscript();
  }
});

$("btnGespraeche").addEventListener("click", () => showView("gespraeche"));

function neuesGespraech() {
  gespraechAnlegen();
  showView("assistant");
  renderTranscript();
  $("chatInput")?.focus();
}
$("btnNeuesGespraech").addEventListener("click", neuesGespraech);
$("btnNeuAusListe").addEventListener("click", neuesGespraech);

/* ---------- Wochen Check-in ---------- */

// Welcher Bogen gerade offen ist. Standard ist der, der heute ansteht.
let wcBogen = null;
let wcWerte = {};

function wcStart(id) {
  const bogen = bogenFuer(id) || bogenAmTag(new Date().getDay()) || CHECKIN_MITTE;
  wcBogen = bogen;
  // Ein heute schon abgeschickter Bogen wird zum Bearbeiten geladen, statt den
  // Nutzer alles neu tippen zu lassen.
  const vorhanden = store.getCheckinBoegen()
    .find((b) => b.bogen === bogen.id && b.tag === todayIso());
  wcWerte = vorhanden ? { ...vorhanden.werte } : {};
  renderWochencheck();
}

function renderWochencheck() {
  if (!wcBogen) return wcStart();
  const bogen = wcBogen;
  $("wcTitel").textContent = bogen.titel;
  $("wcEinleitung").textContent = bogen.einleitung;

  const heute = new Date().getDay();
  $("wcWahl").innerHTML = CHECKIN_BOEGEN.map((b) => {
    const dran = b.wochentag === heute;
    return `<button class="${b.id === bogen.id ? "primary" : "ghost"}" data-bogen="${b.id}">`
      + `${escapeHtml(b.titel)}${dran ? " heute" : ""}</button>`;
  }).join("");

  $("wcFragen").innerHTML = bogen.fragen.map((f) => wcFrageHtml(f)).join("");
  $("wcAktionen").hidden = false;
  $("wcAuswertung").hidden = true;
  renderWcVerlauf();
}

function wcFrageHtml(f) {
  const wert = wcWerte[f.id];
  const kopf = `<div class="wc-text">${escapeHtml(f.text)}</div>`
    + (f.hinweis ? `<div class="wc-hinweis">${escapeHtml(f.hinweis)}</div>` : "");
  const huelle = (inhalt) =>
    `<div class="wc-frage${f.pflicht ? " pflicht" : ""}" data-frage="${f.id}">${kopf}${inhalt}</div>`;

  if (f.typ === "zahl") {
    const min = f.min ?? 1;
    const max = f.max ?? 10;
    const gesetzt = Number.isFinite(wert);
    // Der Regler steht in der Mitte, die Anzeige bleibt aber leer, bis er
    // bewegt wurde. Eine Zahl, die dasteht ohne dass jemand sie gewaehlt hat,
    // ist keine Antwort, und im Verlauf sieht sie spaeter aus wie eine.
    const v = gesetzt ? wert : Math.round((min + max) / 2);
    const anteil = Math.round(((v - min) / (max - min)) * 100);
    return huelle(
      `<div class="wc-skala${gesetzt ? "" : " offen"}">
        <input type="range" min="${min}" max="${max}" step="1" value="${v}" data-wert="${f.id}" data-typ="zahl"
               style="--fuellung:${anteil}%">
        <span class="wc-wert" data-anzeige="${f.id}">${gesetzt ? v : "&ndash;"}</span>
      </div>
      <div class="wc-enden"><span>${escapeHtml(f.vonWort ?? String(min))}</span><span>${escapeHtml(f.bisWort ?? String(max))}</span></div>`,
    );
  }
  if (f.typ === "auswahl") {
    const karten = (f.optionen || []).map((o) =>
      `<button type="button" class="pill${wert === o ? " on" : ""}" data-wert="${f.id}" data-typ="auswahl"
        data-option="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("");
    return huelle(`<div class="pills">${karten}</div>`);
  }
  if (f.typ === "mehrfach") {
    const liste = Array.isArray(wert) ? wert : [];
    const karten = (f.optionen || []).map((o) =>
      `<button type="button" class="pill${liste.includes(o) ? " on" : ""}" data-wert="${f.id}" data-typ="mehrfach"
        data-option="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("");
    return huelle(`<div class="pills">${karten}</div>`);
  }
  if (f.typ === "jaNein") {
    return huelle(`<div class="pills">
      <button type="button" class="pill${wert === true ? " on" : ""}" data-wert="${f.id}" data-typ="jaNein" data-option="ja">Ja</button>
      <button type="button" class="pill${wert === false ? " on" : ""}" data-wert="${f.id}" data-typ="jaNein" data-option="nein">Nein</button>
    </div>`);
  }
  if (f.typ === "dauer") {
    const min = Number.isFinite(wert) ? wert : 0;
    return huelle(`<div class="wc-dauer">
      <input type="number" min="0" max="16" inputmode="numeric" value="${Math.floor(min / 60) || ""}"
             data-wert="${f.id}" data-typ="dauer-h" placeholder="7"><span>Stunden</span>
      <input type="number" min="0" max="59" inputmode="numeric" value="${min % 60 || ""}"
             data-wert="${f.id}" data-typ="dauer-m" placeholder="30"><span>Minuten</span>
    </div>`);
  }
  return huelle(`<textarea rows="2" data-wert="${f.id}" data-typ="text"
    placeholder="">${escapeHtml(typeof wert === "string" ? wert : "")}</textarea>`);
}

function renderWcVerlauf() {
  const liste = store.getCheckinBoegen()
    .filter((b) => b.bogen === wcBogen.id)
    .slice(-6)
    .reverse();
  $("wcVerlaufTitel").hidden = liste.length === 0;
  $("wcVerlauf").innerHTML = liste.map((b) => {
    const wann = new Date(`${b.tag}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long" });
    const anzahl = Object.values(b.werte).filter((v) => v !== "" && v !== undefined).length;
    return `<li><div><b>${wann}</b><span class="meta">${anzahl} von ${wcBogen.fragen.length} beantwortet</span></div></li>`;
  }).join("");
}

/* ---------- Coaching Angebot ---------- */

function renderAngebot() {
  const a = store.getAngebot();
  $("a-name").value = a.coachName || "";
  $("a-buchung").value = a.buchungUrl || "";
  $("a-text").value = a.buchungText || "";
  $("a-mail").value = a.email || "";
  $("a-aus").checked = Boolean(a.aus);

  // Sagt sofort, ob aus dem eingefügten Link etwas Brauchbares wird. Ein
  // Buchungslink, der erst beim Nutzer auffällt, fällt gar nicht auf.
  const roh = $("a-buchung").value.trim();
  const sauber = saubereUrl(roh);
  $("a-buchungHinweis").textContent = !roh
    ? "Ohne Link zeigt die App kein Angebot an."
    : !sauber
      ? "Das ist keine gültige https Adresse."
      : sauber !== roh
        ? `Ich habe Tracker und Datumsangaben entfernt. Gespeichert wird: ${sauber}`
        : "";

  $("a-plaene").innerHTML = (a.plaene || []).map((p, i) => `
    <div class="plan-zeile" data-plan="${i}">
      <input type="text" data-feld="name" value="${escapeHtml(p.name || "")}" placeholder="Zweimal 30">
      <input type="text" data-feld="fuerWen" value="${escapeHtml(p.fuerWen || "")}" placeholder="Für wen ist der Plan">
      <div class="plan-zeile-unten">
        <input type="number" data-feld="einheitenProWoche" min="1" max="7" inputmode="numeric"
               value="${Number(p.einheitenProWoche) || 3}" aria-label="Einheiten pro Woche">
        <span>mal pro Woche</span>
        <button class="gs-weg" data-planweg="${i}" aria-label="Vorlage entfernen">&times;</button>
      </div>
      <div class="plan-zeile-unten">
        <select data-feld="fuerGeschlecht" aria-label="Für wen">
          <option value="alle"${(p.fuerGeschlecht ?? "alle") === "alle" ? " selected" : ""}>Für alle</option>
          <option value="male"${p.fuerGeschlecht === "male" ? " selected" : ""}>Männer</option>
          <option value="female"${p.fuerGeschlecht === "female" ? " selected" : ""}>Frauen</option>
        </select>
        <select data-feld="niveau" aria-label="Erfahrungsstand">
          <option value="alle"${(p.niveau ?? "alle") === "alle" ? " selected" : ""}>Jedes Niveau</option>
          <option value="anfaenger"${p.niveau === "anfaenger" ? " selected" : ""}>Einstieg</option>
          <option value="fortgeschritten"${p.niveau === "fortgeschritten" ? " selected" : ""}>Fortgeschritten</option>
        </select>
      </div>
      <label class="switch"><input type="checkbox" data-feld="zeitsparend"${p.zeitsparend ? " checked" : ""}>
        <span>Bei Stress und wenig Zeit aktiv empfehlen</span></label>
      <input type="url" data-feld="url" value="${escapeHtml(p.url || "")}" placeholder="https://...">
    </div>`).join("")
    || '<p class="feld-hilfe">Noch keine Vorlage. Trag deine Pläne ein, dann schlägt daevo den passenden vor.</p>';
}

function angebotLesen() {
  const plaene = [...$("a-plaene").querySelectorAll("[data-plan]")].map((zeile, i) => {
    const holen = (f) => zeile.querySelector(`[data-feld="${f}"]`)?.value ?? "";
    return {
      id: `p${i}`,
      name: holen("name").trim(),
      fuerWen: holen("fuerWen").trim(),
      einheitenProWoche: Number(holen("einheitenProWoche")) || 3,
      url: holen("url").trim(),
      fuerGeschlecht: holen("fuerGeschlecht") || "alle",
      niveau: holen("niveau") || "alle",
      zeitsparend: zeile.querySelector('[data-feld="zeitsparend"]')?.checked ?? false,
    };
  }).filter((p) => p.name || p.url);

  return {
    coachName: $("a-name").value.trim(),
    email: $("a-mail").value.trim(),
    // Gespeichert wird die saubere Adresse, nicht die eingefügte. Sonst steht
    // der Tracker beim nächsten Öffnen wieder da.
    buchungUrl: saubereUrl($("a-buchung").value) || "",
    buchungText: $("a-text").value.trim(),
    plaene: plaene.map((p) => ({ ...p, url: saubereUrl(p.url) || p.url })),
    aus: $("a-aus").checked,
  };
}

$("a-buchung").addEventListener("input", () => {
  const roh = $("a-buchung").value.trim();
  const sauber = saubereUrl(roh);
  $("a-buchungHinweis").textContent = !roh
    ? "Ohne Link zeigt die App kein Angebot an."
    : !sauber
      ? "Das ist keine gültige https Adresse."
      : sauber !== roh
        ? `Ich entferne Tracker und Datumsangaben. Gespeichert wird: ${sauber}`
        : "";
});

/**
 * Die vier Pläne des Betreibers auf einen Schlag.
 *
 * Vier Vorlagen mit je fünf Feldern von Hand einzutragen dauert zehn Minuten
 * und geht dreimal schief. Die Werte stehen hier, nicht im Kern: es sind die
 * Pläne eines bestimmten Coaches und keine Eigenschaft der App.
 */
const ALPHA_PLAENE = [
  {
    name: "Zweimal 30, Männer fortgeschritten", fuerWen: "Wenig Zeit, Grundübungen sitzen",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/7GIk3i",
    fuerGeschlecht: "male", niveau: "fortgeschritten", zeitsparend: true,
  },
  {
    name: "Zweimal 30, Männer Einstieg", fuerWen: "Wenig Zeit, noch keine Routine",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/6iG0LT",
    fuerGeschlecht: "male", niveau: "anfaenger", zeitsparend: true,
  },
  {
    name: "Zweimal 30, Frauen fortgeschritten", fuerWen: "Wenig Zeit, Grundübungen sitzen",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/9js4Xk",
    fuerGeschlecht: "female", niveau: "fortgeschritten", zeitsparend: true,
  },
  {
    name: "Zweimal 30, Frauen Einstieg", fuerWen: "Wenig Zeit, noch keine Routine",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/1SfLlj",
    fuerGeschlecht: "female", niveau: "anfaenger", zeitsparend: true,
  },
];

$("btnPlanVorlagen").addEventListener("click", () => {
  const a = angebotLesen();
  // Was schon drin ist, bleibt drin. Ein Knopf, der die eigene Arbeit
  // ueberschreibt, wird genau einmal gedrueckt.
  const vorhanden = new Set(a.plaene.map((p) => saubereUrl(p.url)));
  let neu = 0;
  for (const p of ALPHA_PLAENE) {
    if (vorhanden.has(saubereUrl(p.url))) continue;
    a.plaene.push({ ...p, id: `p${a.plaene.length}` });
    neu++;
  }
  store.setAngebot(a);
  renderAngebot();
  toast(neu ? `${neu} Vorlagen eingetragen` : "Die stehen schon drin");
});

$("btnPlanNeu").addEventListener("click", () => {
  const a = angebotLesen();
  a.plaene.push({ id: `p${a.plaene.length}`, name: "", fuerWen: "", einheitenProWoche: 3, url: "" });
  store.setAngebot(a);
  renderAngebot();
});

$("a-plaene").addEventListener("click", (event) => {
  const weg = event.target.closest("[data-planweg]");
  if (!weg) return;
  const a = angebotLesen();
  a.plaene.splice(Number(weg.dataset.planweg), 1);
  store.setAngebot(a);
  renderAngebot();
});

$("btnAngebotSpeichern").addEventListener("click", () => {
  store.setAngebot(angebotLesen());
  renderAngebot();
  refreshAll();
  toast("Angebot gespeichert");
});

/**
 * Der Block, der Nutzern den Weg zu einem echten Coach zeigt.
 *
 * Er steht nur da, wo jemand gerade merkt, dass er allein nicht weiterkommt.
 * Ein Buchungslink auf jeder Seite ist Werbung, einer an der richtigen Stelle
 * ist ein Angebot.
 */
function angebotBlock() {
  const a = store.getAngebot();
  if (!hatAngebot(a)) return null;

  const box = document.createElement("div");
  box.className = "angebot";

  // Die Lage entscheidet, nicht nur die Zahl der Einheiten. Wer über Wochen
  // hohen Stress und kaum freie Zeit hat, bekommt den zeitsparenden Plan
  // vorgeschlagen, mit dem gemessenen Grund dabei.
  const treffer = planFuer(a.plaene || [], { ...aktuelleLage(), jahreTraining: profile?.jahreTraining });
  if (treffer) {
    const { plan, passung, lageGruende, wegenLage } = treffer;
    // Die Passung steht als Stichwort in der Zeile mit dem Umfang, die Lage als
    // eigener Satz darunter. Zusammen ergäben sie keinen deutschen Satz.
    const zeile = [plan.fuerWen, `${plan.einheitenProWoche} mal pro Woche`, ...passung]
      .filter(Boolean).join(" · ");
    const grund = wegenLage && lageGruende.length
      ? `<span class="angebot-grund">Weil ${escapeHtml(undListe(lageGruende))}.</span>`
      : "";
    box.innerHTML += `<div class="angebot-teil">
      <b>${escapeHtml(plan.name)}</b>
      <span>${escapeHtml(zeile)}</span>
      ${grund}
      <a class="angebot-knopf" href="${escapeHtml(saubereUrl(plan.url))}" target="_blank" rel="noopener">Plan ansehen</a>
    </div>`;
  }

  const buchung = saubereUrl(a.buchungUrl);
  if (buchung) {
    box.innerHTML += `<div class="angebot-teil">
      <b>Du willst persönliche Betreuung</b>
      <span>${escapeHtml(a.buchungText || "Sprich direkt mit einem Coach.")}</span>
      <a class="angebot-knopf primary" href="${escapeHtml(buchung)}" target="_blank" rel="noopener">
        ${escapeHtml(a.coachName ? `Termin bei ${a.coachName}` : "Termin vereinbaren")}</a>
      ${a.email ? `<a class="angebot-mail" href="mailto:${escapeHtml(a.email)}">oder schreib eine Mail</a>` : ""}
    </div>`;
  }
  return box;
}

/** Den Angebotsblock in einen Behälter setzen, falls es eines gibt. */
function zeigeAngebot(id) {
  const ziel = $(id);
  if (!ziel) return;
  ziel.innerHTML = "";
  const block = angebotBlock();
  if (block) ziel.appendChild(block);
}

function renderProfile() {
  const energy = energyBreakdown(profile);
  const targets = dayNumbers(day).targets;
  $("pBmr").textContent = `${energy.bmrKcal} kcal`;
  $("pAf").textContent = String(energy.activityFactor);
  $("pTdee").textContent = `${energy.tdeeKcal} kcal`;
  $("pTarget").textContent = `${targets.kcal} kcal, ${targets.proteinG} g Protein`;

  $("e-weight").value = profile.weightKg;
  $("e-steps").value = profile.dailySteps;
  $("e-goal").value = profile.goal;
  $("e-wake").value = profile.wakeTime;
  $("e-sleep").value = profile.sleepTime;
  $("e-randmodus").value = profile.wechselndeZeiten ? "wechselnd" : (profile.randModus || "gleich");
  renderWochenzeiten();
  renderStimmwahl();
  renderAngebot();
  renderPush();
  $("e-tempo").value = store.getSettings().sprechtempo ?? 0.96;

  const settings = store.getSettings();
  $("apiKey").value = settings.apiKey || "";
  renderModellwahl(settings.modellWahl || "auto");
  $("optGruendlich").checked = Boolean(settings.immerGruendlich);
  renderGruendlich(Boolean(settings.immerGruendlich));
  $("themeSel").value = settings.theme || "system";
  $("anweisungen").value = settings.anweisungen || "";
  zeigeAnweisungsLaenge();
  $("optSpeak").checked = options.speak;
  $("optHandsFree").checked = options.handsFree;
  $("voiceNote").textContent = voiceSupport.erkennung
    ? "Spracherkennung läuft über den Browser. Auf dem iPhone nur in Safari."
    : "Dieser Browser kann keine Spracherkennung. Tippen geht trotzdem.";
  $("versionLine").textContent = `daevo 0.5.0, Stand ${todayIso()}. Testversion, kein Medizinprodukt.`;
  renderKosten();
  renderSessions();
}

/**
 * Was die App an Modellaufrufen verbraucht hat.
 *
 * Die Quote aus dem Zwischenspeicher ist der wichtigste Wert. Steht sie über
 * Tage bei null, greift das Zwischenspeichern nicht, und das kostet echtes
 * Geld, ohne dass irgendwo eine Fehlermeldung erscheint.
 */
/**
 * Die Modellwahl.
 *
 * Automatisch heisst: der erkannte Modus entscheidet. Erfassen braucht kein
 * teures Modell, ein Gespräch über Schuldgefühle schon. Wer das nicht will,
 * setzt hier ein festes Modell.
 */
const MODUS_TEXT = {
  erfassen: "Essen, Trinken, Gewicht eintragen",
  standard: "Kurzes hin und her",
  coaching: "Fachfragen zu Training und Ernährung",
  psyche: "Persönliche Themen",
  planung: "Geld, Zeit, Aufbau",
};

function renderModellwahl(aktuell) {
  const sel = $("modelSel");
  sel.innerHTML = MODELL_OPTIONEN
    .map((o) => `<option value="${o.wert}"${o.wert === aktuell ? " selected" : ""}>${escapeHtml(o.text)}</option>`)
    .join("");

  if (aktuell === "auto") {
    const zeilen = Object.entries(MODELL_JE_MODUS)
      .map(([modus, id]) => `${MODUS_TEXT[modus] || modus}: ${MODELLE[id]?.name || id}`);
    $("modelNote").textContent =
      `${zeilen.join(". ")}. Bilder immer auf Opus 5, weil die Mengenschätzung direkt in deinen Tagesdaten landet. ` +
      "Das spart gegenüber Opus für alles etwa die Hälfte.";
  } else {
    $("modelNote").textContent =
      `Alle Nachrichten laufen auf ${MODELLE[aktuell]?.name || aktuell}, auch das reine Eintragen. ` +
      "Automatisch ist in fast allen Fällen günstiger, ohne dass die Antworten schlechter werden, wo es zählt.";
  }
}

/**
 * Der Schalter für die Denktiefe.
 *
 * Persönliche Themen und Planung laufen ohnehin immer auf der höchsten Stufe.
 * Alles andere läuft auf mittel oder niedrig, weil Anthropic für Wissensarbeit
 * angibt, dass mittlere Denktiefe die Genauigkeit der Voreinstellung bei 70
 * bis 85 Prozent der Kosten erreicht, und dabei schneller antwortet. Das ist
 * eine veröffentlichte Angabe und keine Messung an deinen Daten. Wer sie nicht
 * gelten lassen will, schaltet hier um.
 */
function renderGruendlich(an) {
  $("gruendlichNote").textContent = an
    ? "Jede Nachricht läuft auf der höchsten Denkstufe. Antworten dauern länger und kosten mehr, auch beim reinen Eintragen."
    : "Persönliche Themen und Planung denken immer auf der höchsten Stufe. Fachfragen laufen auf mittel, kurzes hin und her auf niedrig.";
}

$("optGruendlich").addEventListener("change", (event) => {
  const an = event.target.checked;
  store.setSettings({ ...store.getSettings(), immerGruendlich: an });
  renderGruendlich(an);
  toast(an ? "daevo denkt jetzt überall gründlich" : "daevo denkt so tief, wie die Frage es braucht");
});

$("modelSel").addEventListener("change", (event) => {
  const wahl = event.target.value;
  store.setSettings({ ...store.getSettings(), modellWahl: wahl });
  renderModellwahl(wahl);
  toast(wahl === "auto" ? "daevo wählt jetzt selbst" : `Alles läuft auf ${MODELLE[wahl]?.name || wahl}`);
});

function renderKosten() {
  const k = kostenUebersicht();
  $("kostenHeute").textContent = k.heuteText;
  $("kostenGesamt").textContent = k.gesamtText;
  $("kostenMonat").textContent = k.monat.tage > 0 ? k.monatText : "noch keine Daten";
  $("kostenQuote").textContent = `${Math.round(k.quote * 100)} %`;
  $("kostenGespart").textContent = k.gespartText;

  const zeilen = [];
  if (k.gesamt.anfragen === 0) {
    zeilen.push("Noch keine Aufrufe. Ohne Schlüssel läuft alles regelbasiert und kostet nichts.");
  } else {
    zeilen.push(
      `${k.gesamt.anfragen} Aufrufe in ${k.monat.tage} ${k.monat.tage === 1 ? "Tag" : "Tagen"}, ` +
      `${Math.round((k.gesamt.inputTokens + k.gesamt.cacheReadTokens + k.gesamt.cacheWriteTokens) / 1000)}k Token rein, ` +
      `${Math.round(k.gesamt.outputTokens / 1000)}k raus.`,
    );
    if (k.monat.tage < 3) {
      zeilen.push("Die Hochrechnung beruht auf weniger als drei Tagen und ist entsprechend grob.");
    }
    if (k.quote < 0.2 && k.gesamt.anfragen > 4) {
      zeilen.push("Die Quote aus dem Zwischenspeicher ist niedrig. Das passiert, wenn zwischen zwei Nachrichten mehr als fünf Minuten liegen.");
    }
  }
  zeilen.push("Preise nach der Anthropic Preisliste, Stand 24. Juni 2026. Geschätzt, nicht abgerechnet. Die echte Abrechnung steht in deiner Anthropic Console.");
  $("kostenHinweis").textContent = zeilen.join(" ");
}

function renderSessions() {
  const sessions = profile.sessions || [];
  $("sessionList").innerHTML = sessions.length
    ? sessions.map((s, i) =>
        `<li><div class="li-main"><div class="li-title">${WEEKDAYS[s.weekday]} ${s.startsAt}</div>` +
        `<div class="li-sub">${TYPE_LABEL[s.type] || s.type}, ${s.minutes} Minuten</div></div>` +
        `<div class="li-side"><button class="ghost" data-del="${i}">Weg</button></div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">Noch keine Einheit eingetragen.</div></div></li>`;
}

function renderFeelings() {
  $("feelingRow").innerHTML = FEELINGS.map((f) => `<button data-feel="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join("");
}

/* ---------- Onboarding ---------- */

/**
 * Prueft die Werte, die spaeter in Formeln landen. Ohne diese Grenzen kann
 * eine Zahl aus dem Profil den Grundumsatz unbrauchbar machen.
 */
function validProfile(c) {
  return (
    c.ageYears >= 14 && c.ageYears <= 100 &&
    c.heightCm >= 120 && c.heightCm <= 230 &&
    c.weightKg >= 35 && c.weightKg <= 300 &&
    c.dailySteps >= 0 && c.dailySteps <= 60000 &&
    /^\d{2}:\d{2}$/.test(c.wakeTime) && /^\d{2}:\d{2}$/.test(c.sleepTime)
  );
}

/** Uebernimmt das Ergebnis des Anamnesebogens und startet die App. */
function anamneseFertig(ergebnis) {
  if (!validProfile(ergebnis.profile)) { toast("Bitte pruefe deine Angaben."); return; }
  profile = ergebnis.profile;
  store.setProfile(profile);
  // Der Bogen ist die erste Erinnerung des Assistenten. Alles daraus geht ins
  // Gedaechtnis, damit er ab dem ersten Satz weiss, mit wem er redet.
  for (const notiz of ergebnis.notizen) {
    brain.add({ text: notiz.text, art: notiz.art, wichtigkeit: notiz.wichtigkeit, schlagworte: notiz.schlagworte });
  }
  brain.add({
    text: `Trainingsvorschlag zum Start: ${ergebnis.kraft.titel}.`,
    art: "hinweis", wichtigkeit: 3, schlagworte: ["training"],
  });
  startApp();
}

function startApp() {
  $("setup").hidden = true;
  $("app").hidden = false;
  options = { ...options, ...(store.getSettings().voice || {}) };
  renderFeelings();
  ensureStandards();
  setupAssistant();
  showView("assistant");
  refreshAll();

  // Über eine Benachrichtigung gestartet. Der Parameter wird danach aus der
  // Adresse entfernt, sonst steht die Frage bei jedem Neuladen wieder da.
  const art = new URLSearchParams(location.search).get("impuls");
  if (art) {
    impulsOeffnen({ art });
    history.replaceState(null, "", location.pathname);
  }
}

/* ---------- Ereignisse ---------- */

$("composer").addEventListener("submit", (event) => {
  event.preventDefault();
  send($("chatInput").value);
});
$("btnMic").addEventListener("click", startListening);
$("orb").addEventListener("click", startListening);
$("chips").addEventListener("click", (event) => {
  const button = event.target.closest("[data-say]");
  if (button) send(button.dataset.say);
});

$("btnMenu").addEventListener("click", () => { $("menu").hidden = false; });
$("btnMenuClose").addEventListener("click", () => { $("menu").hidden = true; });
$("menu").addEventListener("click", (event) => {
  const item = event.target.closest("[data-go]");
  if (item) { showView(item.dataset.go); return; }

  // Immer nur eine Gruppe offen. Zwei offene Gruppen sind wieder eine lange
  // Liste, und genau die sollte weg.
  const kopf = event.target.closest(".menu-kopf");
  if (!kopf) return;
  const offen = kopf.getAttribute("aria-expanded") === "true";
  for (const anderer of document.querySelectorAll(".menu-kopf")) {
    anderer.setAttribute("aria-expanded", "false");
    anderer.parentElement.querySelector(".menu-unter").hidden = true;
  }
  if (!offen) {
    kopf.setAttribute("aria-expanded", "true");
    kopf.parentElement.querySelector(".menu-unter").hidden = false;
  }
});
for (const button of document.querySelectorAll("[data-back]")) {
  button.addEventListener("click", () => showView("assistant"));
}

$("btnSpeaker").addEventListener("click", () => {
  options.speak = !options.speak;
  $("btnSpeaker").setAttribute("aria-pressed", String(options.speak));
  if (!options.speak) stopSpeaking();
  saveOptions();
  toast(options.speak ? "Ich lese Antworten vor" : "Vorlesen aus");
});

for (const chip of document.querySelectorAll("[data-water]")) {
  chip.addEventListener("click", async () => {
    await buildActions({ onChange: refreshAll }).wasserEintragen(Number(chip.dataset.water));
    toast(`${chip.dataset.water} ml eingetragen`);
  });
}

/** Rückmeldung in einer der Feedbackflächen zeigen. */
function zeigeFeedback(id, text, fehler = false) {
  const feld = $(id);
  feld.hidden = false;
  feld.className = fehler ? "feedback err" : "feedback";
  feld.textContent = text;
}

$("btnParse").addEventListener("click", async () => {
  const text = $("mealText").value.trim();
  if (!text) return;
  const feedback = $("mealFeedback");
  const button = $("btnParse");
  button.disabled = true;
  button.textContent = "Rechne";
  feedback.hidden = false;
  feedback.className = "feedback";
  feedback.textContent = "Ich rechne das gerade durch.";
  try {
    const before = store.getDay(day).meals.length;
    const antwort = await buildActions({ onChange: refreshAll }).mahlzeitErfassen(text);
    const after = store.getDay(day).meals;
    if (after.length > before) {
      lastMealId = after[after.length - 1].id;
      $("mealText").value = "";
      feedback.className = "feedback ok";
    } else {
      feedback.className = "feedback err";
    }
    feedback.textContent = antwort;
    refreshAll();
  } catch (error) {
    feedback.className = "feedback err";
    feedback.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Erfassen";
  }
});

/**
 * Teller fotografieren, direkt aus der Essensansicht.
 *
 * Derselbe Weg wie im Chat, nur ohne Umweg über das Gespräch: Bild
 * verkleinern, auswerten, eintragen. Die Nährwerte laufen durch dieselbe
 * Prüfung wie bei der Texteingabe.
 */
$("btnFotoEssen").addEventListener("click", () => $("essenFoto").click());

$("essenFoto").addEventListener("change", async (event) => {
  const datei = event.target.files?.[0];
  event.target.value = "";
  if (!datei) return;

  const knopf = $("btnFotoEssen");
  knopf.disabled = true;
  knopf.textContent = "Liest";
  zeigeFeedback("mealFeedback", "Ich schaue mir das Bild an.");
  try {
    const anhang = await anhangAusDatei(datei);
    if (anhang.fehler) { zeigeFeedback("mealFeedback", anhang.fehler, true); return; }
    const text = await buildActions({ onChange: refreshAll, anhaenge: [anhang] }).fotoAlsMahlzeit({});
    zeigeFeedback("mealFeedback", text);
    renderMeals("mealList2");
    refreshAll();
  } catch (error) {
    zeigeFeedback("mealFeedback", `Das hat nicht geklappt: ${error.message}`, true);
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Foto";
  }
});

/* ---------- Barcode ---------- */

/**
 * Der Scanner nutzt BarcodeDetector, wo der Browser ihn hat, sonst bleibt das
 * Eingabefeld. Ein Barcode hat dreizehn Ziffern, die tippt man in zehn Sekunden
 * ab. Eine Kamerabibliothek dafuer waere die erste Laufzeitabhaengigkeit der App
 * und rund 300 Kilobyte, die jeder Aufruf laedt.
 */
let scanStrom = null;
let scanLaeuft = false;

async function scanStarten() {
  const box = $("scanBox");
  box.hidden = false;
  $("scanCode").focus();

  const kannScannen = "BarcodeDetector" in window;
  if (!kannScannen) {
    $("scanHinweis").textContent = "Dieser Browser kann keine Barcodes lesen. Tipp die Ziffern unter dem Strichcode ein.";
    $("scanVideo").hidden = true;
    return;
  }

  try {
    scanStrom = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = $("scanVideo");
    video.hidden = false;
    video.srcObject = scanStrom;
    await video.play();
    $("scanHinweis").textContent = "Halte den Barcode ins Bild.";

    const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    scanLaeuft = true;
    const suchen = async () => {
      if (!scanLaeuft) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length && codes[0].rawValue) {
          $("scanCode").value = codes[0].rawValue;
          scanBeenden();
          await barcodeNachschlagen(codes[0].rawValue);
          return;
        }
      } catch { /* Ein einzelnes Bild ohne Code ist kein Fehler. */ }
      requestAnimationFrame(suchen);
    };
    requestAnimationFrame(suchen);
  } catch {
    $("scanHinweis").textContent = "Kein Zugriff auf die Kamera. Tipp die Ziffern unter dem Strichcode ein.";
    $("scanVideo").hidden = true;
  }
}

function scanBeenden() {
  scanLaeuft = false;
  if (scanStrom) {
    for (const spur of scanStrom.getTracks()) spur.stop();
    scanStrom = null;
  }
  $("scanVideo").srcObject = null;
  $("scanBox").hidden = true;
}

async function barcodeNachschlagen(code) {
  const ziffern = String(code).replace(/\D/g, "");
  if (ziffern.length < 8) { zeigeFeedback("mealFeedback", "Ein Barcode hat mindestens acht Ziffern.", true); return; }
  zeigeFeedback("mealFeedback", "Ich schlage das Produkt nach.");
  try {
    const text = await buildActions({ onChange: refreshAll }).produktNachschlagen({ suche: ziffern });
    zeigeFeedback("mealFeedback", text);
  } catch (error) {
    zeigeFeedback("mealFeedback", `Das hat nicht geklappt: ${error.message}`, true);
  }
}

$("btnScan").addEventListener("click", () => {
  if ($("scanBox").hidden) scanStarten(); else scanBeenden();
});
$("btnScanZu").addEventListener("click", scanBeenden);
$("btnScanSuchen").addEventListener("click", () => {
  const code = $("scanCode").value.trim();
  scanBeenden();
  barcodeNachschlagen(code);
});
$("scanCode").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("btnScanSuchen").click(); }
});

$("btnVoice").addEventListener("click", () => {
  if (!listener?.supported) { toast("Dieser Browser kann keine Spracherkennung."); return; }
  const einmal = new Listener({
    onPartial: (t) => { $("mealText").value = t; },
    onFinal: (t) => { $("mealText").value = t; toast("Aufnahme übernommen"); },
  });
  einmal.start();
  toast("Sprich jetzt");
});

$("feelingRow").addEventListener("click", (event) => {
  const button = event.target.closest("[data-feel]");
  if (!button) return;
  if (!lastMealId) { toast("Erfasse zuerst eine Mahlzeit."); return; }
  store.setMealFeeling(day, lastMealId, button.dataset.feel);
  for (const other of $("feelingRow").children) other.classList.remove("on");
  button.classList.add("on");
  renderMeals("mealList2");
  toast("Notiert");
});

/**
 * Der Vorrat wird beim Verlassen des Feldes gespeichert, nicht auf Knopfdruck.
 *
 * Ein eigener Speichern-Knopf neben einem Textfeld ist eine Falle: wer tippt
 * und dann auf "Vorschläge holen" drückt, hat nicht gespeichert, und die App
 * rechnet mit dem Stand von gestern, ohne es zu sagen.
 */
function vorratLesen() {
  const items = $("fridgeInput").value.split(",").map((x) => x.trim()).filter(Boolean);
  store.setFridge(items);
  return items;
}
$("fridgeInput").addEventListener("blur", vorratLesen);

$("btnSuggest").addEventListener("click", async () => {
  const out = $("suggestOut");
  const button = $("btnSuggest");
  const items = $("fridgeInput").value.split(",").map((s) => s.trim()).filter(Boolean);
  store.setFridge(items);
  button.disabled = true;
  button.textContent = "Denke nach";
  out.hidden = false;
  out.textContent = "Ich schaue, was passt.";
  try {
    out.textContent = await buildActions({ onChange: refreshAll }).mahlzeitVorschlagen();
  } catch (error) {
    out.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Mahlzeit vorschlagen";
  }
});

$("btnCheckin").addEventListener("click", async () => {
  await buildActions({ onChange: refreshAll }).checkinSpeichern({
    energie: Number($("energy").value) || undefined,
    schlaf: Number($("sleepQ").value) || undefined,
    stimmung: Number($("mood").value) || undefined,
    notiz: $("checkNote").value.trim() || "Check-in ohne Notiz",
  });
  $("checkNote").value = "";
  renderCheckins();
  toast("Check-in gespeichert");
});

$("btnWeight").addEventListener("click", async () => {
  const kg = Number(String($("weightInput").value).replace(",", "."));
  if (!(kg >= 30 && kg <= 300)) { toast("Das Gewicht muss zwischen 30 und 300 kg liegen."); return; }
  const antwort = await buildActions({ onChange: refreshAll }).gewichtEintragen(Math.round(kg * 10) / 10);
  renderWeight();
  toast(antwort.split(".")[0]);
});

/* ---------- Balance ---------- */

/** Zeitraum des Balance Boards in Tagen. */
let balanceTage = 1;

/**
 * Das Board.
 *
 * Der Stapel links zeigt auf einen Blick, ob etwas fehlt. Die Kacheln darunter
 * sagen, was. Der grosse Ring rechts ist die Tagesnutzung und steht nur beim
 * Zeitraum Heute, weil eine Nutzung über 30 Tage keine Aussage mehr ist.
 */
function renderBalance() {
  for (const knopf of document.querySelectorAll("#balanceZeitraum .seg-btn")) {
    knopf.classList.toggle("is-on", Number(knopf.dataset.tage) === balanceTage);
  }

  const b = balanceFuer(balanceTage);

  const stapel = $("balanceStapel");
  stapel.innerHTML = "";
  stapel.appendChild(anteilsRing(b.bereiche, { groesse: 200, restAnteil: b.restAnteil }));

  const tagesring = $("balanceTagesring");
  tagesring.innerHTML = "";
  if (balanceTage === 1) {
    const nutzung = tagesnutzungFuer();
    tagesring.appendChild(ringMitZahl({
      anteil: nutzung.wert / 100, zahl: nutzung.wert, unten: "von 100", groesse: 128,
    }));
    $("balanceNutzung").textContent = `${nutzung.satz} ${nutzung.teile.map((t) => `${t.name} ${t.wert}`).join(", ")}.`;
  } else {
    $("balanceNutzung").textContent =
      `Zeitraum ${b.tage} Tage. Die Tagesnutzung gibt es nur für heute, über Wochen sagt ein einzelner Wert nichts.`;
  }

  const kacheln = $("balanceKacheln");
  kacheln.innerHTML = "";
  for (const stand of b.bereiche) {
    const kachel = document.createElement("div");
    kachel.className = "ring-kachel";
    // Der Ring zeigt den Anteil an der Zeit, die Zahl darunter das Ziel.
    // Zwei verschiedene Fragen, und beide gehören auf die Kachel.
    kachel.appendChild(ringMitZahl({
      anteil: stand.anteilAmTag,
      zahl: `${Math.round(stand.anteilAmTag * 100)}%`,
      farbe: BEREICH_FARBE[stand.bereich],
      groesse: 84,
    }));
    const name = document.createElement("div");
    name.className = "k-name";
    name.textContent = stand.name;
    const wert = document.createElement("div");
    wert.className = "k-wert";
    wert.textContent = `${kurzDauer(stand.minuten)} von ${kurzDauer(stand.zielMinuten)}`;
    kachel.appendChild(name);
    kachel.appendChild(wert);
    kacheln.appendChild(kachel);
  }

  const teile = [];
  if (b.gesamtMinuten === 0) {
    teile.push(
      "Noch keine Minute gemessen. Verbinde deinen Kalender, trag eine Zeit ein " +
      "oder hak eine Aufgabe ab, dann füllen sich die Ringe.",
    );
  }
  if (b.nichtZugeordnet > 0) {
    teile.push(
      `${kurzDauer(b.nichtZugeordnet)} konnte ich keinem Bereich zuordnen. ` +
      "Diese Termine haben keinen Titel, aus dem sich etwas lesen lässt, und zählen nirgends mit.",
    );
  }
  const leer = b.bereiche.filter((x) => x.minuten === 0).map((x) => x.name);
  if (leer.length) teile.push(`Ohne eine einzige Minute: ${leer.join(", ")}.`);
  $("balanceHinweis").textContent = teile.join(" ");

  const rat = balanceRat(balanceTage === 1 ? 7 : balanceTage);
  $("balanceRat").innerHTML =
    `<h3>${escapeHtml(rat.bereich ? BEREICH_NAME[rat.bereich] : "Nichts zu korrigieren")}</h3>` +
    `<p>${escapeHtml(rat.befund)}</p>` +
    `<div class="grund">${escapeHtml(rat.schritt)}</div>`;

  renderBalanceZiele();
}

function renderBalanceZiele() {
  const gespeichert = store.getSettings().balanceZiele || {};
  const wrap = $("balanceZiele");
  wrap.innerHTML = "";
  for (const bereich of BEREICHE) {
    const minuten = gespeichert[bereich] ?? STANDARD_ZIELE[bereich];
    const zeile = document.createElement("div");
    zeile.className = "ziel-zeile";
    const name = document.createElement("span");
    name.textContent = BEREICH_NAME[bereich];
    const feld = document.createElement("input");
    feld.type = "number";
    feld.inputMode = "decimal";
    feld.min = "0";
    feld.max = "80";
    feld.step = "0.5";
    feld.value = String(Math.round((minuten / 60) * 2) / 2);
    feld.dataset.bereich = bereich;
    zeile.appendChild(name);
    zeile.appendChild(feld);
    wrap.appendChild(zeile);
  }
}

$("balanceZeitraum").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-tage]");
  if (!knopf) return;
  balanceTage = Number(knopf.dataset.tage) || 1;
  renderBalance();
});

$("btnBalanceZiele").addEventListener("click", () => {
  const ziele = {};
  for (const feld of document.querySelectorAll("#balanceZiele input")) {
    const stunden = Math.max(0, Math.min(80, Number(feld.value) || 0));
    ziele[feld.dataset.bereich] = Math.round(stunden * 60);
  }
  store.setSettings({ ...store.getSettings(), balanceZiele: ziele });
  renderBalance();
  toast("Ziele gespeichert");
});

/* ---------- Dein Tag ---------- */

/**
 * Aufgabenliste und Mittagscheck.
 *
 * Die Reihenfolge der Aufgaben kommt aus dem Rechenkern, nicht aus dieser
 * Datei. Hier wird nur angezeigt und angetippt.
 */
function renderTag() {
  const plan = aufgabenPlan();

  fuelleAufgaben("aufgabenHeute", plan.heute, "Heute steht nichts mehr an.");
  fuelleAufgaben("aufgabenMorgen", [...plan.morgen, ...plan.spaeter], "Nichts, was warten müsste.");
  $("aufgabenGrund").textContent = plan.begruendung.join(" ");

  const heute = dayNumbers(todayIso());
  const schonGemacht = heute.data.checkins.some((c) => c.kind === "midday");
  $("mittagSub").textContent = schonGemacht
    ? "Heute schon beantwortet. Du kannst es überschreiben, wenn sich etwas geändert hat."
    : "Nach dem Mittagessen. Drei Zahlen, danach sage ich dir, ob es am Essen lag.";

  const herausGemacht = heute.data.checkins.find((c) => c.kind === "herausforderung");
  $("herausHinweis").textContent = herausGemacht
    ? `Heute schon beantwortet: ${herausGemacht.note}`
    : "Die Antwort geht an den Coach, der darauf eingeht.";
}

function fuelleAufgaben(id, aufgaben, leerText) {
  const el = $(id);
  el.innerHTML = "";
  if (aufgaben.length === 0) {
    el.innerHTML = `<li class="empty">${escapeHtml(leerText)}</li>`;
    return;
  }
  for (const a of aufgaben) {
    const li = document.createElement("li");
    const frist = a.faellig ? `, fällig ${a.faellig}` : "";
    const wichtig = ["nebensächlich", "normal", "wichtig"][a.wichtigkeit - 1] || "normal";
    const grund = a.warum ? ` (${a.warum})` : "";
    li.innerHTML =
      `<div class="li-main"><div class="li-title">${escapeHtml(a.text)}</div>` +
      `<button class="stufe" data-stufe="${a.wichtigkeit}" type="button">` +
      `${a.minuten} Minuten, ${wichtig}${escapeHtml(frist)}${escapeHtml(grund)}</button></div>`;

    // Ein Tipp auf die Einstufung schaltet sie weiter. Eine Einschätzung, die
    // man nicht korrigieren kann, ist eine Bevormundung.
    li.querySelector(".stufe").addEventListener("click", () => {
      aufgabeUmstufen(a.id);
      renderTag();
      refreshAll();
    });
    const knoepfe = document.createElement("div");
    const fertig = document.createElement("button");
    fertig.className = "ghost";
    fertig.textContent = "Erledigt";
    fertig.addEventListener("click", () => {
      aufgabeAbhaken(a.id);
      renderTag();
      toast("Abgehakt");
    });
    const weg = document.createElement("button");
    weg.className = "ghost";
    weg.textContent = "Weg";
    weg.addEventListener("click", () => {
      aufgabeLoeschen(a.id);
      renderTag();
    });
    knoepfe.appendChild(fertig);
    knoepfe.appendChild(weg);
    li.appendChild(knoepfe);
    el.appendChild(li);
  }
}

$("btnAufgabe").addEventListener("click", async () => {
  const text = $("aufgabeText").value.trim();
  if (text.length < 3) { toast("Schreib kurz, was zu tun ist."); return; }
  const knopf = $("btnAufgabe");
  knopf.disabled = true;
  knopf.textContent = "Stuft ein";
  $("aufgabeEcho").textContent = "daevo schaut sich das an.";
  try {
    const ergebnis = await aufgabeAnlegenEingestuft(text);
    if (!ergebnis) { $("aufgabeEcho").textContent = "Das war zu kurz."; return; }
    $("aufgabeText").value = "";
    $("aufgabeEcho").textContent = ergebnis.einstufung.regelbasiert
      ? `${ergebnis.text} Ohne KI Schlüssel nach Wortgruppen sortiert, nicht verstanden.`
      : ergebnis.text;
    renderTag();
    refreshAll();
  } catch (error) {
    $("aufgabeEcho").textContent = `Einstufung nicht möglich: ${error.message}`;
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Aufgabe anlegen";
  }
});

/**
 * Kopf leeren.
 *
 * Der Knopf läuft bewusst über die Aufgabenliste weiter: das Ergebnis steht
 * nicht nur da, die Aufgaben stehen danach wirklich in der Liste, und die
 * Priorisierung sagt sofort, was heute noch reingeht.
 */
$("btnKopf").addEventListener("click", async () => {
  const text = $("kopfText").value.trim();
  if (text.length < 20) { toast("Schreib mehr. Alles, was dir im Kopf herumgeht."); return; }
  const button = $("btnKopf");
  button.disabled = true;
  button.textContent = "Sortiere";
  $("kopfErgebnis").hidden = false;
  $("kopfErgebnis").textContent = "Ich sortiere das.";
  try {
    const ergebnis = await kopfSortieren(text);
    if (!ergebnis) { $("kopfErgebnis").textContent = "Dafür war zu wenig da."; return; }
    $("kopfErgebnis").textContent =
      `${ergebnis.text}\n\n${ergebnis.angelegt.length} Aufgaben stehen jetzt in deiner Liste.`;
    $("kopfText").value = "";
    renderTag();
    refreshAll();
  } catch (error) {
    $("kopfErgebnis").textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Sortieren";
  }
});

$("btnKopfDiktat").addEventListener("click", () => {
  if (!listener?.supported) { toast("Dieser Browser kann keine Spracherkennung."); return; }
  const einmal = new Listener({
    onPartial: (t) => { $("kopfText").value = t; },
    onFinal: (t) => { $("kopfText").value = t; toast("Aufnahme übernommen"); },
  });
  einmal.start();
  toast("Sprich in Ruhe. Alles, was dir im Kopf herumgeht.");
});

$("btnBriefingMorgen").addEventListener("click", () => { $("briefingText").textContent = briefing("morgen"); });
$("btnBriefingAbend").addEventListener("click", () => { $("briefingText").textContent = briefing("abend"); });

$("btnMittag").addEventListener("click", () => {
  const zahl = (id, min, max) => Math.max(min, Math.min(max, Number($(id).value) || min));
  const befund = mittagscheck({
    energie: zahl("mEnergie", 1, 10),
    konzentration: zahl("mKonz", 1, 10),
    saettigung: zahl("mSatt", 1, 10),
  });
  const text = mittagscheckText(befund);
  $("mittagBefund").textContent = text;
  $("mittagBefund").hidden = false;
  $("btnMittagAlternative").hidden = !befund.auffaellig;
  renderTag();
  refreshAll();
});

/**
 * Bei schlechten Werten direkt eine bessere Mahlzeit rechnen.
 *
 * Der Vorschlag kommt aus derselben Funktion wie sonst, damit die Nährwerte
 * aus einer Quelle stammen. Der Mittagscheck sagt nur, was sich ändern soll.
 */
$("btnMittagAlternative").addEventListener("click", async () => {
  const button = $("btnMittagAlternative");
  button.disabled = true;
  try {
    const text = await buildActions({ onChange: refreshAll }).mahlzeitVorschlagen("viel Protein, nicht schwer");
    $("mittagBefund").textContent += `\n\n${text}`;
  } finally {
    button.disabled = false;
  }
});

$("btnHeraus").addEventListener("click", async () => {
  const text = $("herausText").value.trim();
  if (text.length < 3) { toast("Schreib einen Satz."); return; }
  $("herausText").value = "";
  herausforderungSpeichern(text);
  renderTag();
  showView("assistant");
  await send(`Meine grösste Herausforderung heute: ${text}. Was würdest du dagegen machen?`);
});

/* ---------- Kalender ---------- */

/**
 * Der Tag, der gerade im Kalender angezeigt wird.
 *
 * Getrennt vom Tag der Tagesansicht, weil man den Kalender vorausschauend
 * benutzt und die Zahlen des Tages rückblickend.
 */
let kalenderTag = todayIso();

const KALENDER_ANLEITUNG = [
  "Google Calendar: In den Einstellungen den Kalender auswählen, ganz unten unter Kalender integrieren",
  "die geheime Adresse im iCal Format kopieren, im Browser öffnen und die Datei hier auswählen.",
  "Apple Kalender am Mac: Kalender auswählen, Ablage, Exportieren, dann die .ics Datei hier auswählen.",
  "Auf dem iPhone: iCloud Kalender im Web öffnen, Kalender freigeben, öffentlicher Kalender,",
  "die Adresse kopieren, webcal durch https ersetzen und die Datei hier auswählen.",
  "Nichts davon geht an einen Server. Die Datei wird im Browser gelesen und nur die Termine bleiben liegen.",
].join(" ");

function renderKalender() {
  $("kalTag").value = kalenderTag;
  $("kalAnleitung").textContent = KALENDER_ANLEITUNG;

  const stand = kalenderStand();
  const quellen = $("kalQuellen");
  quellen.innerHTML = "";
  if (stand.quellen.length === 0) {
    quellen.innerHTML = '<li class="empty">Noch kein Kalender verbunden.</li>';
  } else {
    for (const q of stand.quellen) {
      const li = document.createElement("li");
      const datum = q.stand ? new Date(q.stand).toLocaleDateString("de-DE") : "";
      li.innerHTML =
        `<div class="li-main"><div class="li-title">${escapeHtml(q.name)}</div>` +
        `<div class="li-sub">${q.anzahl} Termine, eingelesen am ${escapeHtml(datum)}</div></div>`;
      const weg = document.createElement("button");
      weg.className = "ghost";
      weg.textContent = "Entfernen";
      weg.addEventListener("click", () => {
        kalenderEntfernen(q.name);
        renderKalender();
        toast("Kalender entfernt");
      });
      li.appendChild(weg);
      quellen.appendChild(li);
    }
  }

  const a = ablaufFuer(kalenderTag);
  $("kalBelegt").textContent = `${a.belegtMinuten} Minuten`;
  $("kalQuote").textContent = `${Math.round(a.auslastung * 100)} %`;
  $("kalFokus").textContent = a.fokusblock
    ? `${uhrzeit(a.fokusblock.von)} bis ${uhrzeit(a.fokusblock.bis)}, ${a.fokusblock.minuten} Minuten`
    : "keiner";

  fuelleListe("kalListe", [...a.ganztags, ...a.termine].map((t) => ({
    titel: t.titel,
    sub: t.ganztags ? "ganztägig" : `${uhrzeit(t.von)} bis ${uhrzeit(t.bis)}${t.ort ? `, ${t.ort}` : ""}`,
    seite: t.quelle || "",
  })), "Keine Termine an diesem Tag.");

  fuelleListe("kalEssen", a.essensfenster.map((e) => ({
    titel: `${uhrzeit(e.um)} Mahlzeit ${e.nummer}`,
    sub: e.grund,
    seite: `${e.kcal} kcal\n${e.proteinG} g Protein`,
  })), (kalenderStand().anzahl === 0 ? "Ohne Kalender kein Vorschlag." : "Keine freie Lücke gefunden."));

  fuelleListe("kalHinweise", a.hinweise.map((h) => ({ titel: h, sub: "", seite: "" })), "Nichts Auffälliges.");

  $("kalWoche").textContent = kalenderUebersicht(Number($("kalTage").value) || 7);

  const vorschlag = trainingsplanVorschlag();
  fuelleListe("planVorschlag", vorschlag.map((v) => ({
    titel: `${WEEKDAYS[v.weekday]} ${v.startsAt} ${v.titel}`,
    sub: `${v.minutes} Minuten, ${v.vorkommen} mal im Kalender`,
    seite: "",
  })), "Noch keine Einheit, die sich regelmässig wiederholt.");
  $("btnPlanUebernehmen").hidden = vorschlag.length === 0;
}

$("btnPlanUebernehmen").addEventListener("click", () => {
  const anzahl = trainingsplanUebernehmen();
  if (anzahl === 0) { toast("Nichts zu übernehmen."); return; }
  profile = store.getProfile();
  renderKalender();
  refreshAll();
  toast(`${anzahl} ${anzahl === 1 ? "Einheit" : "Einheiten"} ins Profil übernommen`);
});

/** Baut eine Liste aus drei Feldern. Spart drei fast gleiche Schleifen. */
function fuelleListe(id, eintraege, leerText) {
  const el = $(id);
  el.innerHTML = "";
  if (eintraege.length === 0) {
    el.innerHTML = `<li class="empty">${escapeHtml(leerText)}</li>`;
    return;
  }
  for (const e of eintraege) {
    const li = document.createElement("li");
    const seite = e.seite
      ? `<div class="li-side">${e.seite.split("\n").map((z, i) => (i === 0 ? `<b>${escapeHtml(z)}</b>` : escapeHtml(z))).join("")}</div>`
      : "";
    li.innerHTML =
      `<div class="li-main"><div class="li-title">${escapeHtml(e.titel)}</div>` +
      (e.sub ? `<div class="li-sub">${escapeHtml(e.sub)}</div>` : "") +
      "</div>" + seite;
    el.appendChild(li);
  }
}

$("kalTag").addEventListener("change", (event) => {
  kalenderTag = event.target.value || todayIso();
  renderKalender();
});

$("kalTage").addEventListener("change", renderKalender);

$("btnKalDatei").addEventListener("click", () => $("kalDatei").click());

$("kalDatei").addEventListener("change", async (event) => {
  const datei = event.target.files?.[0];
  if (!datei) return;
  try {
    const text = await datei.text();
    const name = $("kalName").value.trim() || datei.name.replace(/\.ics$/i, "");
    uebernehmen(text, name);
  } catch (error) {
    toast(`Datei nicht lesbar: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

$("btnKalText").addEventListener("click", () => {
  const text = $("kalText").value.trim();
  if (!text) { toast("Da steht nichts drin."); return; }
  uebernehmen(text, $("kalName").value.trim() || "Eingefügt");
  $("kalText").value = "";
});

function uebernehmen(text, name) {
  if (!text.includes("BEGIN:VCALENDAR") && !text.includes("BEGIN:VEVENT")) {
    toast("Das ist keine Kalenderdatei. Sie beginnt mit BEGIN:VCALENDAR.");
    return;
  }
  const ergebnis = kalenderImportieren(text, name);
  renderKalender();
  refreshAll();
  toast(
    ergebnis.anzahl === 0
      ? "Gelesen, aber im Zeitraum lag kein Termin."
      : `${ergebnis.anzahl} Termine aus ${ergebnis.name} übernommen`,
  );
}

$("btnEinkaufNeu").addEventListener("click", async () => {
  const button = $("btnEinkaufNeu");
  button.disabled = true;
  button.textContent = "Rechne";
  try {
    await buildActions({ onChange: refreshAll }).einkaufslisteErstellen({
      tage: Number($("einkaufTage").value) || 7,
    });
    renderEinkauf();
    toast("Liste steht");
  } finally {
    button.disabled = false;
    button.textContent = "Liste rechnen";
  }
});

$("einkaufList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-ek]");
  if (!button) return;
  const liste = store.getShoppingList();
  const item = liste?.items.find((i) => i.key === button.dataset.ek);
  if (!item) return;
  item.stand = button.dataset.stand;
  store.setShoppingList(liste);
  // Was zu Hause ist, gehört in den Vorrat. Dann rechnet die nächste Liste
  // damit und der Vorschlag für heute Abend kennt es auch.
  if (item.stand === "zuhause" || item.stand === "gekauft") {
    const vorrat = store.getFridge();
    if (!vorrat.some((v) => v.toLowerCase() === item.name.toLowerCase())) {
      store.setFridge([...vorrat, item.name].slice(0, 40));
    }
  }
  renderEinkauf();
});

$("btnStdAdd").addEventListener("click", () => {
  const text = $("stdText").value.trim();
  if (text.length < 8) { toast("Schreib den Standard als ganzen Satz."); return; }
  const standards = ensureStandards();
  standards.push({
    id: `std_${newId().slice(0, 8)}`,
    kind: "frei",
    text,
    kadenz: $("stdKadenz").value,
    ziel: Math.max(1, Number($("stdZiel").value) || 1),
    aktiv: true,
    seit: todayIso(),
  });
  store.setStandards(standards.slice(0, 8));
  $("stdText").value = "";
  renderStandards();
  toast("Standard steht");
});

$("standardList").addEventListener("click", (event) => {
  const ok = event.target.closest("[data-std-ok]");
  if (ok) {
    store.setStandardConfirmed(day, ok.dataset.stdOk, true);
    renderStandards();
    toast("Eingetragen");
    return;
  }
  const del = event.target.closest("[data-std-del]");
  if (del) {
    store.setStandards(store.getStandards().filter((s) => s.id !== del.dataset.stdDel));
    renderStandards();
  }
});

$("memSearch").addEventListener("input", renderMemories);
$("btnMemAdd").addEventListener("click", () => {
  const text = $("memNew").value.trim();
  if (!text) return;
  const result = brain.add({
    text,
    art: $("memKind").value,
    wichtigkeit: Number($("memWeight").value) || 3,
  });
  $("memNew").value = "";
  renderMemories();
  toast(result.action === "aktualisiert" ? "Bestehende Notiz aufgefrischt" : "Gemerkt");
});
$("memList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-mem-del]");
  if (!button) return;
  brain.remove(button.dataset.memDel);
  renderMemories();
});

$("btnSaveProfile").addEventListener("click", () => {
  const candidate = {
    ...profile,
    weightKg: Number($("e-weight").value),
    dailySteps: Number($("e-steps").value),
    goal: $("e-goal").value,
    wakeTime: $("e-wake").value,
    sleepTime: $("e-sleep").value,
    randModus: $("e-randmodus").value === "wochentag" ? "wochentag" : "gleich",
    wechselndeZeiten: $("e-randmodus").value === "wechselnd",
    wochenraender: $("e-randmodus").value === "wochentag" ? wochenzeitenLesen() : undefined,
    // Ausnahmen für einzelne Tage bleiben erhalten. Sie hängen nicht am Modus,
    // und wer sie beim Speichern des Profils verlöre, müsste seine Schicht für
    // morgen jedes Mal neu eintragen.
    tagesausnahmen: profile.tagesausnahmen,
    handyAus: profile.handyAus,
    handyMorgens: profile.handyMorgens,
  };
  if (!validProfile(candidate)) { toast("Bitte prüfe deine Angaben."); return; }
  profile = candidate;
  store.setProfile(profile);
  renderProfile();
  refreshAll();
  toast("Gespeichert");
});

/* Eingaben im Wochenbogen. Ein Listener auf dem Behaelter statt einem je Feld,
   weil die Fragen bei jedem Rendern neu gebaut werden. */
$("wochencheck").addEventListener("click", (event) => {
  const wahl = event.target.closest("[data-bogen]");
  if (wahl) { wcStart(wahl.dataset.bogen); return; }

  const pille = event.target.closest("[data-wert][data-option]");
  if (!pille) return;
  const id = pille.dataset.wert;
  const typ = pille.dataset.typ;
  const option = pille.dataset.option;

  if (typ === "auswahl") {
    wcWerte[id] = wcWerte[id] === option ? undefined : option;
  } else if (typ === "jaNein") {
    const neu = option === "ja";
    wcWerte[id] = wcWerte[id] === neu ? undefined : neu;
  } else if (typ === "mehrfach") {
    const liste = Array.isArray(wcWerte[id]) ? wcWerte[id] : [];
    wcWerte[id] = liste.includes(option) ? liste.filter((x) => x !== option) : [...liste, option];
  }
  // Nur die betroffene Frage neu zeichnen, sonst springt die Seite nach oben.
  const box = pille.closest("[data-frage]");
  const frage = wcBogen.fragen.find((f) => f.id === id);
  if (box && frage) box.outerHTML = wcFrageHtml(frage);
});

$("wochencheck").addEventListener("input", (event) => {
  const feld = event.target.closest("[data-wert]");
  if (!feld || feld.dataset.option) return;
  const id = feld.dataset.wert;
  const typ = feld.dataset.typ;

  if (typ === "zahl") {
    wcWerte[id] = Number(feld.value);
    const anzeige = $("wochencheck").querySelector(`[data-anzeige="${id}"]`);
    if (anzeige) anzeige.textContent = feld.value;
    // Der Fuellstand der Spur haengt am Wert und muss beim Ziehen mitlaufen.
    const min = Number(feld.min);
    const max = Number(feld.max);
    feld.style.setProperty("--fuellung", `${Math.round(((Number(feld.value) - min) / (max - min)) * 100)}%`);
    feld.closest(".wc-skala")?.classList.remove("offen");
  } else if (typ === "text") {
    wcWerte[id] = feld.value;
  } else if (typ === "dauer-h" || typ === "dauer-m") {
    const box = feld.closest("[data-frage]");
    const h = Number(box.querySelector('[data-typ="dauer-h"]').value) || 0;
    const m = Number(box.querySelector('[data-typ="dauer-m"]').value) || 0;
    wcWerte[id] = h * 60 + m;
  }
});

$("btnWcSpeichern").addEventListener("click", async () => {
  const fehlend = wcBogen.fragen.filter((f) => {
    if (!f.pflicht) return false;
    const v = wcWerte[f.id];
    return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  });
  if (fehlend.length) {
    toast(`Noch offen: ${fehlend[0].text}`);
    const box = $("wochencheck").querySelector(`[data-frage="${fehlend[0].id}"]`);
    box?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const eintrag = { bogen: wcBogen.id, tag: todayIso(), werte: { ...wcWerte } };
  store.addCheckinBogen(eintrag);
  refreshAll();

  const knopf = $("btnWcSpeichern");
  knopf.disabled = true;
  knopf.textContent = "daevo liest";
  const feld = $("wcAuswertung");
  feld.hidden = false;
  feld.textContent = "Ich schaue mir das an.";
  try {
    const text = await buildActions({ onChange: refreshAll }).checkinAuswerten({ bogen: wcBogen.id });
    feld.textContent = text;
  } catch (error) {
    feld.textContent = `Gespeichert. Die Auswertung hat nicht geklappt: ${error.message}`;
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Abschicken";
    renderWcVerlauf();
  }
});

$("e-randmodus").addEventListener("change", renderWochenzeiten);

// Der Tagesablauf hat einen eigenen Knopf, weil er weit unter dem oberen steht.
// Wer dort etwas ändert, scrollt sonst nach oben, um zu speichern, und vergisst
// es beim dritten Mal.
$("btnSaveTage").addEventListener("click", () => {
  profile = {
    ...profile,
    wakeTime: $("e-wake").value,
    sleepTime: $("e-sleep").value,
    randModus: $("e-randmodus").value === "wochentag" ? "wochentag" : "gleich",
    wechselndeZeiten: $("e-randmodus").value === "wechselnd",
    wochenraender: $("e-randmodus").value === "wochentag" ? wochenzeitenLesen() : undefined,
  };
  store.setProfile(profile);
  refreshAll();
  toast("Tagesablauf gespeichert");
});

$("e-stimme").addEventListener("change", () => {
  store.setSettings({ ...store.getSettings(), stimme: $("e-stimme").value });
  stimmProbe();
});
$("e-tempo").addEventListener("change", () => {
  store.setSettings({ ...store.getSettings(), sprechtempo: Number($("e-tempo").value) });
  stimmProbe();
});
$("btnStimmProbe").addEventListener("click", stimmProbe);

/* ---------- Benachrichtigungen ---------- */

/**
 * Zeigt, woran es hängt, statt am Ende nur zu melden, dass es nicht geht.
 *
 * Drei Dinge müssen stimmen: der Browser kann Push, die App läuft vom Home
 * Bildschirm, und die Erlaubnis steht. Auf dem iPhone scheitert es fast immer
 * am zweiten Punkt, und das sieht man dem Fehler sonst nicht an.
 */
async function renderPush() {
  const settings = store.getSettings();
  $("e-vapid").value = settings.vapidPublic || "";
  const lage = pushLage();
  const abo = await pushAbo().catch(() => null);

  $("e-pushAboFeld").hidden = !abo;
  if (abo) $("e-pushAbo").value = JSON.stringify(abo);

  const zeilen = [];
  if (!lage.unterstuetzt) {
    zeilen.push("Dieser Browser kann kein Web Push.");
  } else if (lage.apple && !lage.installiert) {
    zeilen.push("Auf dem iPhone geht Push nur aus der installierten App. Teilen, Zum Home Bildschirm, dann von dort starten.");
  } else if (abo) {
    zeilen.push("Dieses Gerät ist angemeldet.");
    zeilen.push("Damit die Nachrichten ankommen, muss der Text oben im Secret PUSH_ABOS im Repository stehen.");
  } else if (lage.erlaubnis === "denied") {
    zeilen.push("Benachrichtigungen sind abgelehnt. Das lässt sich nur in den Einstellungen des Geräts zurücknehmen.");
  } else {
    zeilen.push("Noch nicht angemeldet.");
  }
  $("e-pushhilfe").textContent = zeilen.join(" ");
  $("btnPushAus").hidden = !abo;
}

$("e-vapid").addEventListener("change", () => {
  store.setSettings({ ...store.getSettings(), vapidPublic: $("e-vapid").value.trim() });
});

$("btnPushAn").addEventListener("click", async () => {
  const schluessel = $("e-vapid").value.trim();
  store.setSettings({ ...store.getSettings(), vapidPublic: schluessel });
  try {
    const abo = await pushAnmelden(schluessel);
    $("e-pushAboFeld").hidden = false;
    $("e-pushAbo").value = JSON.stringify(abo);
    await renderPush();
    toast("Angemeldet. Jetzt den Text kopieren.");
  } catch (fehler) {
    $("e-pushhilfe").textContent = fehler.message;
    toast("Hat nicht geklappt");
  }
});

$("btnPushAus").addEventListener("click", async () => {
  await pushAbmelden().catch(() => false);
  await renderPush();
  toast("Abgemeldet. Nimm das Gerät auch aus PUSH_ABOS raus.");
});

$("btnPushKopieren").addEventListener("click", async () => {
  const text = $("e-pushAbo").value;
  try {
    await navigator.clipboard.writeText(text);
    toast("Kopiert");
  } catch {
    // Ohne Erlaubnis für die Zwischenablage bleibt das Markieren von Hand.
    $("e-pushAbo").select();
    toast("Markiert. Jetzt selbst kopieren.");
  }
});

/* ---------- Ein Impuls kommt herein ---------- */

/**
 * Welche Frage gerade offen ist.
 *
 * Antwortet der Nutzer darauf mit einer blossen Zahl, wird sie hier
 * ausgewertet und nicht an das Modell geschickt. Eine Zahl von 1 bis 10 ist
 * eindeutig, und die Bewertung kommt aus dem Rechenkern.
 */
let offeneFrage = null;

function impulsOeffnen(daten) {
  const art = daten?.art;
  if (!art) return;
  showView("assistant");
  const impuls = impulseFuerTag(todayIso()).find((i) => i.art === art);
  if (!impuls) return;

  const chat = store.getChat();
  const letzte = chat[chat.length - 1];
  // Zweimal auf dieselbe Nachricht getippt heisst nicht, dass die Frage
  // zweimal im Verlauf stehen soll.
  if (!(letzte?.role === "assistant" && letzte.text === impuls.text)) {
    chat.push({ role: "assistant", text: impuls.text, at: new Date().toISOString() });
    store.setChat(chat);
    renderTranscript();
  }
  offeneFrage = impuls.frage ? art : null;
  $("chatInput").focus();
}

/** Eine blosse Zahl von 1 bis 10, sonst null. */
function nurZahl(text) {
  const treffer = text.trim().match(/^([1-9]|10)([.,]0)?$/);
  return treffer ? Number(treffer[1]) : null;
}

// Der Service Worker meldet den Tipp auf eine Benachrichtigung, wenn die App
// schon offen ist. Ein zweites Fenster wäre die Alternative, und das empfinden
// Nutzer als kaputt.
navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.typ === "impuls") impulsOeffnen(event.data.daten);
});

function stimmProbe() {
  const e = store.getSettings();
  // Ein Satz mit Zahl, Uhrzeit und Umgangston. An einer nackten Ansage wie
  // "Test" hoert man nicht, ob eine Stimme taugt.
  speak(
    "Alles klar, ich hab dir 208 Kilokalorien eingetragen. Dein Training steht um 18:30, "
    + "bis dahin hast du noch gut Zeit für was Ordentliches zu essen.",
    { enabled: true, stimme: e.stimme, tempo: e.sprechtempo },
  );
}

// Die Stimmliste ist beim ersten Aufruf oft leer und wird nachgereicht.
if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener?.("voiceschanged", () => {
    const profilView = document.querySelector('[data-view="profil"]');
    if (profilView && !profilView.hidden) renderStimmwahl();
  });
}

$("btnAddSession").addEventListener("click", () => {
  const minutes = Number($("t-min").value);
  if (!(minutes >= 5 && minutes <= 480)) { toast("Dauer muss zwischen 5 und 480 Minuten liegen."); return; }
  profile.sessions = [
    ...(profile.sessions || []),
    { type: $("t-type").value, minutes, weekday: Number($("t-day").value), startsAt: $("t-time").value },
  ].slice(0, 21);
  store.setProfile(profile);
  renderSessions();
  toast("Einheit hinzugefügt");
});

$("sessionList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-del]");
  if (!button) return;
  profile.sessions.splice(Number(button.dataset.del), 1);
  store.setProfile(profile);
  renderSessions();
});

/**
 * Eigene Anweisungen des Nutzers.
 *
 * Sie landen im Systemprompt des Assistenten. Die Obergrenze liegt bei 4000
 * Zeichen, weil jede Nachricht sie mitschickt und der Prompt sonst mehr kostet
 * als die eigentliche Frage.
 */
const ANWEISUNGEN_MAX = 4000;

/**
 * Startpunkt für eigene Anweisungen.
 *
 * Bewusst ohne persönliche Angaben. Was daevo über den Nutzer weiss, gehört
 * ins Gedächtnis und nicht in eine Vorlage, die jeder bekommt. Hier steht nur,
 * wie geredet werden soll.
 */
const ANWEISUNGEN_VORLAGE = [
  "Sag mir die Wahrheit, auch wenn sie unangenehm ist. Beschönige nichts.",
  "Sei ehrlich und realistisch, nicht schmeichelnd. Lob nur, wenn Zahlen es hergeben.",
  "Keine Floskeln, keine Einleitungen, keine Zusammenfassungen am Ende.",
  "Erfinde nichts. Bist du unsicher, sag es. Zeig mir, wie du auf eine Zahl kommst.",
  "Bei fachlichen Fragen will ich den Mechanismus und die Grössenordnung, nicht nur die Regel.",
  "Bei persönlichen Themen: erst verstehen, dann Vorschläge. Geh unter die Oberfläche,",
  "zeig mir das Muster dahinter, und gib mir am Ende genau eine Sache, die ich heute anders mache.",
  "Sag mir, wenn ich mir etwas vormache.",
  "Frag nach, wenn eine Antwort nicht zu dem passt, was du über mich weisst.",
].join("\n");

function zeigeAnweisungsLaenge() {
  const laenge = $("anweisungen").value.length;
  $("anweisungenNote").textContent = laenge === 0
    ? "Noch nichts hinterlegt. daevo nutzt dann nur seine eingebaute Haltung."
    : `${laenge} von ${ANWEISUNGEN_MAX} Zeichen. Wird bei jeder Nachricht mitgelesen.`;
}

$("anweisungen").addEventListener("input", zeigeAnweisungsLaenge);
$("btnAnweisungen").addEventListener("click", () => {
  const text = $("anweisungen").value.slice(0, ANWEISUNGEN_MAX);
  $("anweisungen").value = text;
  store.setSettings({ ...store.getSettings(), anweisungen: text });
  zeigeAnweisungsLaenge();
  toast(text ? "daevo liest das ab jetzt mit" : "Anweisungen gelöscht");
});

$("btnAnweisungenVorlage").addEventListener("click", () => {
  if ($("anweisungen").value.trim() && !confirm("Das überschreibt, was da steht. Weiter?")) return;
  $("anweisungen").value = ANWEISUNGEN_VORLAGE;
  zeigeAnweisungsLaenge();
  toast("Vorlage eingesetzt. Ändere sie und speichere dann.");
});

$("btnPruefeKey").addEventListener("click", async () => {
  const knopf = $("btnPruefeKey");
  knopf.disabled = true;
  $("keyStatus").textContent = "Prüfe.";
  try {
    const e = await schluesselPruefen();
    $("keyStatus").textContent = e.ok ? `In Ordnung. ${e.meldung}` : e.meldung;
  } catch (error) {
    $("keyStatus").textContent = `Prüfung nicht möglich: ${error.message}`;
  } finally {
    knopf.disabled = false;
  }
});

$("btnSaveKey").addEventListener("click", () => {
  const key = $("apiKey").value.trim();
  const settings = store.getSettings();
  store.setSettings({ ...settings, apiKey: key });
  toast(key ? "Schlüssel gespeichert. daevo denkt jetzt selbst." : "Schlüssel entfernt. Regelbetrieb aktiv.");
  $("keyStatus").textContent = key ? "Gespeichert. Tipp auf Schlüssel prüfen, um zu sehen, ob er wirklich geht." : "";
});

/* ---------- Tag und Nacht ---------- */

/**
 * "system" bedeutet: kein Attribut setzen, dann entscheidet
 * prefers-color-scheme im Stylesheet. Nur eine ausdrueckliche Wahl stempelt
 * data-theme an die Wurzel.
 */
function applyTheme(wahl) {
  if (wahl === "light" || wahl === "dark") document.documentElement.dataset.theme = wahl;
  else delete document.documentElement.dataset.theme;
  orb?.refreshTheme();
}

// Auch ohne eigene Wahl muss der Kreis umschalten, wenn das Geraet wechselt.
globalThis.matchMedia?.("(prefers-color-scheme: light)").addEventListener?.("change", () => orb?.refreshTheme());

$("themeSel").addEventListener("change", (e) => {
  const wahl = e.target.value;
  applyTheme(wahl);
  store.setSettings({ ...store.getSettings(), theme: wahl });
});

function saveOptions() {
  const settings = store.getSettings();
  store.setSettings({ ...settings, voice: options });
}
$("optSpeak").addEventListener("change", (e) => {
  options.speak = e.target.checked;
  $("btnSpeaker").setAttribute("aria-pressed", String(options.speak));
  saveOptions();
});
$("optHandsFree").addEventListener("change", (e) => {
  options.handsFree = e.target.checked;
  saveOptions();
  if (!options.handsFree && listener) listener.handsFree = false;
});

$("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daevo-export-${todayIso()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("btnReset").addEventListener("click", () => {
  if (!confirm("Wirklich alle Daten auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.")) return;
  store.clearAll();
  location.reload();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !profile) return;
  const current = todayIso();
  if (current !== day) day = current;
  refreshAll();
});

applyTheme(store.getSettings().theme || "system");

if (profile) startApp();
else new SetupFlow($("setupFlow"), { onFertig: anamneseFertig });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
