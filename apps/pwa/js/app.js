import {
  buildDailyReminders,
  currentStreak,
  energyBreakdown,
  macroTargets,
  remainingBudget,
  scoreDay,
  waterTargetMl,
} from "@daevo/core";
import { AnthropicProvider, Coach } from "@daevo/coach";
import { nowTime, store, todayIso } from "./storage.js";

const $ = (id) => document.getElementById(id);
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const TYPE_LABEL = { strength: "Kraft", team_sport: "Mannschaftssport", cardio: "Ausdauer", mobility: "Mobility" };
const FEELINGS = ["voll da", "satt und gut", "muede", "aufgeblaeht", "noch hungrig"];

let profile = store.getProfile();
let day = todayIso();
let lastMealId = null;

/* Coach mit dem Schluessel des Nutzers. Ohne Schluessel laeuft alles offline. */
function buildCoach() {
  const settings = store.getSettings();
  return new Coach(
    new AnthropicProvider({
      apiKey: settings.apiKey || undefined,
      model: settings.model || "claude-sonnet-5",
      browserAccess: true,
      timeoutMs: 45000,
    }),
  );
}

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

/* ---------- Berechnung ---------- */

function trainingMinutesToday() {
  const weekday = new Date(`${day}T12:00:00`).getDay();
  return (profile.sessions || []).filter((s) => s.weekday === weekday).reduce((sum, s) => sum + s.minutes, 0);
}

function targetsToday() {
  return { ...macroTargets(profile), waterMl: waterTargetMl(profile, trainingMinutesToday()) };
}

function totalsToday() {
  const data = store.getDay(day);
  const totals = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, waterMl: data.waterMl || 0 };
  for (const meal of data.meals) {
    for (const entry of meal.entries) {
      totals.kcal += entry.kcal;
      totals.proteinG += entry.proteinG;
      totals.fatG += entry.fatG;
      totals.carbsG += entry.carbsG;
    }
  }
  return {
    kcal: Math.round(totals.kcal),
    proteinG: Math.round(totals.proteinG),
    fatG: Math.round(totals.fatG),
    carbsG: Math.round(totals.carbsG),
    waterMl: totals.waterMl,
  };
}

/* ---------- Rendern ---------- */

function renderToday() {
  const targets = targetsToday();
  const totals = totalsToday();
  const rest = remainingBudget(totals, targets);
  const score = scoreDay(totals, targets);
  const data = store.getDay(day);

  const hour = new Date().getHours();
  const greet = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend";
  $("greeting").textContent = `${greet}${profile.name ? ", " + profile.name : ""}`;
  const d = new Date(`${day}T12:00:00`);
  $("dateLine").textContent = `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${d.toLocaleString("de-DE", { month: "long" })}`;

  const streak = currentStreak({ daysWithLog: store.allDays().filter((x) => store.getDay(x).meals.length > 0), today: day });
  $("streakBadge").textContent = streak > 0 ? `${streak} Tage Serie` : "Start heute";

  const ratio = targets.kcal > 0 ? Math.min(1, totals.kcal / targets.kcal) : 0;
  const circumference = 2 * Math.PI * 52;
  $("ringKcal").style.strokeDashoffset = String(circumference * (1 - ratio));
  $("ringKcal").style.stroke = totals.kcal > targets.kcal ? "var(--bad)" : "var(--accent)";
  $("kcalLeft").textContent = String(rest.kcal);
  $("kcalEaten").textContent = `${totals.kcal} kcal`;
  $("kcalTarget").textContent = `${targets.kcal} kcal`;
  // Der Score misst den ganzen Tag. Morgens waere er immer nahe null und damit
  // wertlos. Bis zum spaeten Nachmittag zeigt die Kachel deshalb das offene
  // Protein, danach den Score.
  const scoreIsMeaningful = new Date().getHours() >= 18 || totals.kcal >= targets.kcal * 0.7;
  $("scoreLabel").textContent = scoreIsMeaningful ? "Tagesscore" : "Protein offen";
  $("scoreVal").textContent = scoreIsMeaningful
    ? `${score.total} / 100`
    : `${Math.max(0, rest.proteinG)} g`;

  setBar("p", totals.proteinG, targets.proteinG, "g");
  setBar("f", totals.fatG, targets.fatG, "g");
  setBar("c", totals.carbsG, targets.carbsG, "g");
  setBar("w", totals.waterMl, targets.waterMl, "ml");

  renderReminders(targets, data);
  renderMeals("mealList");
  renderMeals("mealList2");
}

function setBar(prefix, actual, target, unit) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  $(`${prefix}Bar`).style.width = `${pct}%`;
  $(`${prefix}Bar`).classList.toggle("over", target > 0 && actual > target * 1.1);
  $(`${prefix}Txt`).textContent = `${actual} / ${target} ${unit}`;
}

function renderReminders(targets, data) {
  const reminders = buildDailyReminders({
    profile,
    weekday: new Date(`${day}T12:00:00`).getDay(),
    state: {
      mealsLogged: data.meals.length,
      waterMl: data.waterMl || 0,
      waterTargetMl: targets.waterMl,
      morningCheckinDone: data.checkins.some((c) => c.kind === "morning"),
      eveningReviewDone: data.checkins.some((c) => c.kind === "evening"),
    },
  });
  const time = nowTime();
  const upcoming = reminders.filter((r) => r.at >= time).slice(0, 3);
  const list = upcoming.length ? upcoming : reminders.slice(-2);
  $("reminderList").innerHTML = list.length
    ? list
        .map(
          (r) =>
            `<li><div class="li-main"><div class="li-title">${escapeHtml(r.title)}</div>` +
            `<div class="li-sub">${escapeHtml(r.body)}</div></div>` +
            `<div class="li-side"><b>${r.at}</b>${r.at < time ? "vorbei" : "geplant"}</div></li>`,
        )
        .join("")
    : `<li><div class="li-main"><div class="li-sub">Fuer heute ist alles erledigt.</div></div></li>`;
}

function renderMeals(targetId) {
  const data = store.getDay(day);
  const el = $(targetId);
  if (!el) return;
  if (data.meals.length === 0) {
    el.innerHTML = `<li><div class="li-main"><div class="li-sub">Noch nichts erfasst.</div></div></li>`;
    return;
  }
  el.innerHTML = data.meals
    .map((meal) => {
      const kcal = Math.round(meal.entries.reduce((s, e) => s + e.kcal, 0));
      const protein = Math.round(meal.entries.reduce((s, e) => s + e.proteinG, 0));
      const items = meal.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
      return (
        `<li data-meal="${meal.id}"><div class="li-main">` +
        `<div class="li-title">${escapeHtml(items || meal.text)}</div>` +
        `<div class="li-sub">${meal.at} Uhr, ${protein} g Protein` +
        (meal.feeling ? `, danach ${escapeHtml(meal.feeling)}` : "") +
        (meal.source === "offline" ? ", Tabellenwert" : "") +
        `</div></div>` +
        `<div class="li-side"><b>${kcal}</b>kcal</div></li>`
      );
    })
    .join("");
}

function renderProfile() {
  const energy = energyBreakdown(profile);
  const targets = targetsToday();
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
  $("modelSel").value = settings.model || "claude-sonnet-5";
  $("versionLine").textContent = `daevo 0.3.0, Stand ${todayIso()}. Testversion, kein Medizinprodukt.`;

  renderSessions();
}

function renderSessions() {
  const sessions = profile.sessions || [];
  $("sessionList").innerHTML = sessions.length
    ? sessions
        .map(
          (s, i) =>
            `<li><div class="li-main"><div class="li-title">${WEEKDAYS[s.weekday]} ${s.startsAt}</div>` +
            `<div class="li-sub">${TYPE_LABEL[s.type] || s.type}, ${s.minutes} Minuten</div></div>` +
            `<div class="li-side"><button class="ghost" data-del="${i}">Weg</button></div></li>`,
        )
        .join("")
    : `<li><div class="li-main"><div class="li-sub">Noch keine Einheit eingetragen.</div></div></li>`;
}

function renderCheckins() {
  const data = store.getDay(day);
  $("checkinList").innerHTML = data.checkins.length
    ? data.checkins
        .slice()
        .reverse()
        .map(
          (c) =>
            `<li><div class="li-main"><div class="li-title">${escapeHtml(c.note || "Check-in")}</div>` +
            `<div class="li-sub">${c.at} Uhr</div></div>` +
            `<div class="li-side"><b>${c.energy ?? "-"}</b>Energie</div></li>`,
        )
        .join("")
    : "";
}

function renderFeelings() {
  $("feelingRow").innerHTML = FEELINGS.map(
    (f) => `<button data-feel="${escapeHtml(f)}">${escapeHtml(f)}</button>`,
  ).join("");
}

/* ---------- Aktionen ---------- */

async function parseMeal() {
  const text = $("mealText").value.trim();
  if (!text) return;
  const button = $("btnParse");
  const feedback = $("mealFeedback");
  button.disabled = true;
  button.textContent = "Rechne";
  feedback.hidden = false;
  feedback.className = "feedback";
  feedback.textContent = "Ich rechne das gerade durch.";

  try {
    const result = await buildCoach().parseMeal(text);
    if (result.entries.length === 0) {
      feedback.className = "feedback err";
      feedback.textContent = result.followUpQuestion || "Das konnte ich nicht zuordnen. Nenn mir die Menge in Gramm.";
      return;
    }
    const kcal = Math.round(result.entries.reduce((s, e) => s + e.kcal, 0));
    const protein = Math.round(result.entries.reduce((s, e) => s + e.proteinG, 0));
    lastMealId = crypto.randomUUID();
    store.addMeal(day, {
      id: lastMealId,
      text,
      at: nowTime(),
      source: result.source,
      entries: result.entries,
      feeling: null,
    });
    $("mealText").value = "";
    const lines = [`Eingetragen: ${kcal} kcal, ${protein} g Protein.`];
    if (result.warnings.length) lines.push(result.warnings.join(" "));
    if (result.followUpQuestion) lines.push(result.followUpQuestion);
    if (result.source === "offline") lines.push("Gerechnet mit der internen Tabelle. Mit API Schluessel wird es genauer.");
    feedback.className = "feedback ok";
    feedback.textContent = lines.join(" ");
    renderToday();
  } catch (error) {
    feedback.className = "feedback err";
    feedback.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Erfassen";
  }
}

function startVoice() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    toast("Dieser Browser kann keine Spracherkennung. Tipp es ein.");
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "de-DE";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    $("mealText").value = event.results[0][0].transcript;
    toast("Aufnahme uebernommen");
  };
  recognition.onerror = () => toast("Aufnahme fehlgeschlagen");
  toast("Sprich jetzt");
  recognition.start();
}

async function suggestMeal() {
  const fridgeText = $("fridgeInput").value;
  const fridge = fridgeText.split(",").map((s) => s.trim()).filter(Boolean);
  store.setFridge(fridge);
  const out = $("suggestOut");
  const button = $("btnSuggest");
  button.disabled = true;
  button.textContent = "Denke nach";
  out.hidden = false;
  out.innerHTML = "<p>Ich schaue, was passt.</p>";

  try {
    const data = store.getDay(day);
    const consumed = data.meals.flatMap((m) => m.entries);
    const suggestion = await buildCoach().suggestMeal({
      fridge,
      targets: targetsToday(),
      consumed,
      waterMl: data.waterMl || 0,
    });
    const rest = remainingBudget(totalsToday(), targetsToday());
    const parts = [`<h3>${escapeHtml(suggestion.title)}</h3>`];
    if (suggestion.reason) parts.push(`<p class="sub">${escapeHtml(suggestion.reason)}</p>`);
    if (suggestion.ingredients.length) {
      parts.push(
        "<ul>" +
          suggestion.ingredients
            .map((i) => `<li>${escapeHtml(i.quantity)} ${escapeHtml(i.name)}, ${i.kcal} kcal</li>`)
            .join("") +
          "</ul>",
      );
    }
    if (suggestion.steps.length) {
      parts.push("<ol>" + suggestion.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("") + "</ol>");
    }
    parts.push(
      `<div class="kv"><span>Restbudget</span><b>${rest.kcal} kcal, ${rest.proteinG} g Protein</b></div>`,
    );
    if (suggestion.prepMinutes > 0) {
      parts.push(`<div class="kv"><span>Zubereitung</span><b>${suggestion.prepMinutes} Minuten</b></div>`);
    }
    out.innerHTML = parts.join("");
  } catch (error) {
    out.innerHTML = `<p>Das hat nicht geklappt: ${escapeHtml(error.message)}</p>`;
  } finally {
    button.disabled = false;
    button.textContent = "Mahlzeit vorschlagen";
  }
}

function saveCheckin() {
  const hour = new Date().getHours();
  store.addCheckin(day, {
    kind: hour < 12 ? "morning" : hour >= 19 ? "evening" : "adhoc",
    at: nowTime(),
    note: $("checkNote").value.trim(),
    energy: Number($("energy").value) || null,
    sleepQuality: Number($("sleepQ").value) || null,
  });
  $("checkNote").value = "";
  renderCheckins();
  renderToday();
  toast("Check-in gespeichert");
}

function readSetupProfile() {
  return {
    name: $("s-name").value.trim(),
    sex: $("s-sex").value,
    ageYears: Number($("s-age").value),
    heightCm: Number($("s-height").value),
    weightKg: Number($("s-weight").value),
    goal: $("s-goal").value,
    dailySteps: Number($("s-steps").value),
    wakeTime: $("s-wake").value,
    sleepTime: $("s-sleep").value,
    tdeeOverrideKcal: null,
    sessions: [],
  };
}

function validProfile(candidate) {
  return (
    candidate.ageYears >= 14 && candidate.ageYears <= 100 &&
    candidate.heightCm >= 120 && candidate.heightCm <= 230 &&
    candidate.weightKg >= 35 && candidate.weightKg <= 300 &&
    candidate.dailySteps >= 0 && candidate.dailySteps <= 60000 &&
    /^\d{2}:\d{2}$/.test(candidate.wakeTime) && /^\d{2}:\d{2}$/.test(candidate.sleepTime)
  );
}

/* ---------- Navigation ---------- */

function showTab(name) {
  for (const section of document.querySelectorAll(".tab")) section.hidden = section.dataset.tab !== name;
  for (const button of document.querySelectorAll(".tabbtn")) button.classList.toggle("active", button.dataset.go === name);
  window.scrollTo({ top: 0 });
  if (name === "profil") renderProfile();
  if (name === "coach") { $("fridgeInput").value = store.getFridge().join(", "); renderCheckins(); }
  if (name === "essen") renderMeals("mealList2");
}

function startApp() {
  $("setup").hidden = true;
  $("app").hidden = false;
  renderFeelings();
  renderToday();
}

/* ---------- Ereignisse ---------- */

$("s-save").addEventListener("click", () => {
  const candidate = readSetupProfile();
  if (!validProfile(candidate)) {
    toast("Bitte pruefe deine Angaben.");
    return;
  }
  profile = candidate;
  store.setProfile(profile);
  startApp();
});

for (const button of document.querySelectorAll(".tabbtn")) {
  button.addEventListener("click", () => showTab(button.dataset.go));
}

for (const chip of document.querySelectorAll("[data-water]")) {
  chip.addEventListener("click", () => {
    store.addWater(day, Number(chip.dataset.water));
    renderToday();
    toast(`${chip.dataset.water} ml eingetragen`);
  });
}

$("btnParse").addEventListener("click", parseMeal);
$("btnVoice").addEventListener("click", startVoice);
$("btnSuggest").addEventListener("click", suggestMeal);
$("btnCheckin").addEventListener("click", saveCheckin);

$("feelingRow").addEventListener("click", (event) => {
  const button = event.target.closest("[data-feel]");
  if (!button || !lastMealId) {
    if (button) toast("Erfasse zuerst eine Mahlzeit.");
    return;
  }
  store.setMealFeeling(day, lastMealId, button.dataset.feel);
  for (const other of $("feelingRow").children) other.classList.remove("on");
  button.classList.add("on");
  renderMeals("mealList2");
  renderMeals("mealList");
  toast("Notiert");
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
  if (!validProfile(candidate)) {
    toast("Bitte pruefe deine Angaben.");
    return;
  }
  profile = candidate;
  store.setProfile(profile);
  renderProfile();
  renderToday();
  toast("Gespeichert");
});

$("btnAddSession").addEventListener("click", () => {
  const minutes = Number($("t-min").value);
  if (!(minutes >= 5 && minutes <= 480)) {
    toast("Dauer muss zwischen 5 und 480 Minuten liegen.");
    return;
  }
  profile.sessions = [
    ...(profile.sessions || []),
    { type: $("t-type").value, minutes, weekday: Number($("t-day").value), startsAt: $("t-time").value },
  ].slice(0, 21);
  store.setProfile(profile);
  renderSessions();
  renderToday();
  toast("Einheit hinzugefuegt");
});

$("sessionList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-del]");
  if (!button) return;
  profile.sessions.splice(Number(button.dataset.del), 1);
  store.setProfile(profile);
  renderSessions();
  renderToday();
});

$("btnSaveKey").addEventListener("click", () => {
  const key = $("apiKey").value.trim();
  store.setSettings({ apiKey: key, model: $("modelSel").value });
  toast(key ? "Schluessel gespeichert. Der Coach denkt jetzt selbst." : "Schluessel entfernt. Offline Modus aktiv.");
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
  if (!confirm("Wirklich alle Daten auf diesem Geraet loeschen? Das kann nicht rueckgaengig gemacht werden.")) return;
  store.clearAll();
  location.reload();
});

/* Tageswechsel abfangen, wenn die App im Hintergrund lag. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !profile) return;
  const current = todayIso();
  if (current !== day) day = current;
  renderToday();
});

if (profile) startApp();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
