import { energyBreakdown, uhrzeit, weightTrend } from "@daevo/core";
import { MODELL_JE_MODUS, MODELL_OPTIONEN, MODELLE } from "@daevo/coach";
import { Coach, AnthropicProvider } from "@daevo/coach";
import {
  ablaufFuer, ask, aufgabeAbhaken, aufgabeAnlegen, aufgabeLoeschen, aufgabenPlan, briefing,
  buildActions, dayNumbers, einkaufslisteText, ensureStandards, greeting, herausforderungSpeichern,
  mittagscheck, mittagscheckText, musterUebersicht,
  trainingsplanUebernehmen, trainingsplanVorschlag, widerspruchListe,
  kalenderEntfernen, kalenderImportieren, kalenderStand, kalenderUebersicht,
  kostenUebersicht, recommendations, standardsUebersicht, tagesErinnerungen, verlaufPunkte,
} from "./assistant.js";
import { brain } from "./brain.js";
import { Orb } from "./orb.js";
import { anhangAusDatei, grossInKb } from "./media.js";
import { Listener, speak, stopSpeaking, voiceSupport } from "./voice.js";
import { SetupFlow } from "./setup-ui.js";
import { newId, nowTime, store, todayIso } from "./storage.js";

const $ = (id) => document.getElementById(id);
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const TYPE_LABEL = { strength: "Kraft", team_sport: "Mannschaftssport", cardio: "Ausdaür", mobility: "Mobility" };
const FEELINGS = ["voll da", "satt und gut", "müde", "aufgebläht", "noch hungrig"];
const KIND_LABEL = {
  fakt: "Fakt", praeferenz: "Vorliebe", ziel: "Ziel",
  ereignis: "Ereignis", reflexion: "Reflexion", hinweis: "Hinweis",
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
      return `<div class="msg ${m.role === "user" ? "user" : "assistant"}">${bilder}${dateien}${escapeHtml(m.text)}${done}</div>`;
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

function appendPending(text) {
  const el = $("transcript");
  const node = document.createElement("div");
  node.className = "msg assistant pending";
  node.textContent = text;
  el.appendChild(node);
  el.scrollTop = el.scrollHeight;
  return node;
}

async function send(text) {
  const nachricht = text.trim();
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
    if (stueck === null) { laufend = ""; pending.textContent = "denkt nach"; return; }
    laufend += stueck;
    pending.classList.remove("pending");
    pending.textContent = laufend;
    $("transcript").scrollTop = $("transcript").scrollHeight;
  };

  try {
    const reply = await ask(frage, { onChange: refreshAll, anhaenge: gesendet, onStrom });
    pending.remove();
    renderTranscript();
    refreshAll();
    if (options.speak) {
      orb.setState("speaking");
      setStatus("spricht");
      speak(reply.text, {
        enabled: options.speak,
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
    pending.remove();
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
  if (name === "essen") { $("fridgeInput").value = store.getFridge().join(", "); renderMeals("mealList2"); }
  if (name === "checkin") renderCheckins();
  if (name === "reflexion") renderMemories();
  if (name === "einkauf") renderEinkauf();
  if (name === "kalender") renderKalender();
  if (name === "tag") renderTag();
  if (name === "standards") renderStandards();
  if (name === "empfehlungen") renderRecommendations();
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
  if (name === "standards") renderStandards();
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
  $("scoreLabel").textContent = scoreIsMeaningful ? "Tagesscore" : "Protein offen";
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
  if (item) showView(item.dataset.go);
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

$("btnFridge").addEventListener("click", () => {
  const items = $("fridgeInput").value.split(",").map((s) => s.trim()).filter(Boolean);
  store.setFridge(items);
  toast(`${items.length} Zutaten gespeichert`);
});

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
    li.innerHTML =
      `<div class="li-main"><div class="li-title">${escapeHtml(a.text)}</div>` +
      `<div class="li-sub">${a.minuten} Minuten, ${wichtig}${escapeHtml(frist)}</div></div>`;
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

$("btnAufgabe").addEventListener("click", () => {
  const a = aufgabeAnlegen({
    text: $("aufgabeText").value,
    minuten: Number($("aufgabeMin").value) || 30,
    wichtigkeit: Number($("aufgabeWichtig").value) || 2,
    faellig: $("aufgabeFrist").value || null,
  });
  if (!a) { toast("Schreib kurz, was zu tun ist."); return; }
  $("aufgabeText").value = "";
  $("aufgabeFrist").value = "";
  renderTag();
  refreshAll();
  toast("Angelegt");
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
  };
  if (!validProfile(candidate)) { toast("Bitte prüfe deine Angaben."); return; }
  profile = candidate;
  store.setProfile(profile);
  renderProfile();
  refreshAll();
  toast("Gespeichert");
});

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

$("btnSaveKey").addEventListener("click", () => {
  const key = $("apiKey").value.trim();
  const settings = store.getSettings();
  store.setSettings({ ...settings, apiKey: key });
  toast(key ? "Schlüssel gespeichert. daevo denkt jetzt selbst." : "Schlüssel entfernt. Regelbetrieb aktiv.");
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
