import {
  buildDailyReminders,
  energyBreakdown,
  macroTargets,
} from "@daevo/core";
import { Coach, AnthropicProvider } from "@daevo/coach";
import { ask, buildActions, dayNumbers, greeting, recommendations } from "./assistant.js";
import { brain } from "./brain.js";
import { Orb } from "./orb.js";
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

/* ---------- Assistent ---------- */

function renderTranscript() {
  const chat = store.getChat();
  const el = $("transcript");
  el.innerHTML = chat
    .slice(-40)
    .map((m) => {
      const done = m.ausgeführt?.length ? `<span class="msg-done">${escapeHtml(m.ausgeführt.join(" und "))}</span>` : "";
      return `<div class="msg ${m.role === "user" ? "user" : "assistant"}">${escapeHtml(m.text)}${done}</div>`;
    })
    .join("");
  // Erst wenn der Nutzer selbst etwas gesagt hat, schrumpft der Kreis. Die
  // Begrüssung allein zählt nicht, sonst sieht man den großen Kreis nie.
  $("assistant").classList.toggle("has-chat", chat.some((m) => m.role === "user"));
  el.scrollTop = el.scrollHeight;
}

function appendBubble(role, text) {
  const el = $("transcript");
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  node.textContent = text;
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
  if (!nachricht || busy) return;
  busy = true;
  stopSpeaking();
  $("chatInput").value = "";

  // Die Nachricht wird nur angezeigt, gespeichert wird sie in ask(). Sonst
  // landet sie zweimal im Verlauf.
  appendBubble("user", nachricht);
  $("assistant").classList.add("has-chat");
  const pending = appendPending("denkt nach");
  orb.setState("thinking");
  setStatus("denkt nach");

  try {
    const reply = await ask(nachricht, { onChange: refreshAll });
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
      if (state === "listening") { orb.setState("listening"); setStatus("hört zu"); }
      else if (state === "error") { toast(`Mikrofon: ${detail}`); orb.setState("idle"); setStatus("bereit"); }
      else if (!busy) { orb.setState("idle"); setStatus("bereit"); }
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

  const reminders = buildDailyReminders({
    profile,
    weekday: n.weekday,
    state: {
      mealsLogged: n.data.meals.length,
      waterMl: n.totals.waterMl,
      waterTargetMl: n.targets.waterMl,
      morningCheckinDone: n.data.checkins.some((c) => c.kind === "morning"),
      eveningReviewDone: n.data.checkins.some((c) => c.kind === "evening"),
    },
  });
  const time = nowTime();
  const upcoming = reminders.filter((r) => r.at >= time).slice(0, 3);
  const list = upcoming.length ? upcoming : reminders.slice(-2);
  $("reminderList").innerHTML = list.length
    ? list.map((r) =>
        `<li><div class="li-main"><div class="li-title">${escapeHtml(r.title)}</div>` +
        `<div class="li-sub">${escapeHtml(r.body)}</div></div>` +
        `<div class="li-side"><b>${r.at}</b>${r.at < time ? "vorbei" : "geplant"}</div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">Für heute ist alles erledigt.</div></div></li>`;

  renderMeals("mealList");
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

function renderRecommendations() {
  $("recoList").innerHTML = recommendations()
    .map((r) => `<div class="reco"><h3>${escapeHtml(r.titel)}</h3><p>${escapeHtml(r.text)}</p><div class="grund">${escapeHtml(r.grund)}</div></div>`)
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
  $("modelSel").value = settings.model || "claude-opus-5";
  $("themeSel").value = settings.theme || "system";
  $("optSpeak").checked = options.speak;
  $("optHandsFree").checked = options.handsFree;
  $("voiceNote").textContent = voiceSupport.erkennung
    ? "Spracherkennung läuft über den Browser. Auf dem iPhone nur in Safari."
    : "Dieser Browser kann keine Spracherkennung. Tippen geht trotzdem.";
  $("versionLine").textContent = `daevo 0.4.0, Stand ${todayIso()}. Testversion, kein Medizinprodukt.`;
  renderSessions();
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

$("btnSaveKey").addEventListener("click", () => {
  const key = $("apiKey").value.trim();
  const settings = store.getSettings();
  store.setSettings({ ...settings, apiKey: key, model: $("modelSel").value });
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
