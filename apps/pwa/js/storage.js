/**
 * Speicher der App.
 *
 * Alles liegt im localStorage des Geräts. Es gibt keinen Server und keine
 * Uebertragung. Das ist bewusst so: solange die App im Test ist, sollen keine
 * Gesundheitsdaten irgendwo landen.
 *
 * Grenze: localStorage ist an einen Browser gebunden. Wenn du den Browser
 * löschst oder das Gerät wechselst, sind die Daten weg. Deshalb gibt es den
 * Export im Profil.
 */

const PREFIX = "daevo.v1.";
const LEGACY_PREFIX = "kicoach.v1.";

/**
 * Uebernimmt Daten aus der Zeit vor der Umbenennung auf daevo.
 * Läuft einmal und lässt die alten Schlüssel unberührt, damit nichts
 * verloren geht, falls die Uebernahme schiefgeht.
 */
function migrateLegacyKeys() {
  try {
    if (localStorage.getItem(PREFIX + "migrated")) return;
    const pairs = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LEGACY_PREFIX)) pairs.push([key, localStorage.getItem(key)]);
    }
    for (const [key, value] of pairs) {
      const target = PREFIX + key.slice(LEGACY_PREFIX.length);
      if (localStorage.getItem(target) === null && value !== null) localStorage.setItem(target, value);
    }
    localStorage.setItem(PREFIX + "migrated", "1");
  } catch {
    // Kein Speicherzugriff. Die App startet dann mit leeren Daten.
  }
}

migrateLegacyKeys();

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Eindeutige Kennung für Einträge.
 *
 * crypto.randomUUID gibt es nur in sicheren Kontexten und erst ab Safari 15.4.
 * Der Rückfall nutzt Zufallswerte aus der Krypto Schnittstelle, notfalls
 * Math.random. Die Kennungen bleiben lokal, sie müssen nicht fälschungssicher
 * sein, nur eindeutig.
 */
export function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 12)}`;
}

export function todayIso(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function nowTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export const store = {
  getProfile() {
    return read("profile", null);
  },
  setProfile(profile) {
    write("profile", profile);
  },

  getSettings() {
    return read("settings", { apiKey: "", model: "claude-sonnet-5" });
  },
  setSettings(settings) {
    write("settings", settings);
  },

  getMemories() {
    return read("memories", []);
  },
  setMemories(entries) {
    write("memories", entries);
  },

  getChat() {
    return read("chat", []);
  },
  setChat(messages) {
    // Nur die letzten Nachrichten behalten. Der Verlauf wächst sonst ohne
    // Grenze und der localStorage ist bei rund fünf Megabyte zu Ende.
    write("chat", messages.slice(-60));
  },

  getFridge() {
    return read("fridge", []);
  },
  setFridge(items) {
    write("fridge", items);
  },

  getDay(day) {
    return read(`day.${day}`, { meals: [], waterMl: 0, checkins: [] });
  },
  setDay(day, data) {
    write(`day.${day}`, data);
    const index = new Set(read("days", []));
    index.add(day);
    write("days", [...index].sort());
  },
  allDays() {
    return read("days", []);
  },

  addMeal(day, meal) {
    const data = this.getDay(day);
    data.meals.push(meal);
    this.setDay(day, data);
  },
  removeMeal(day, id) {
    const data = this.getDay(day);
    data.meals = data.meals.filter((m) => m.id !== id);
    this.setDay(day, data);
  },
  setMealFeeling(day, id, feeling) {
    const data = this.getDay(day);
    const meal = data.meals.find((m) => m.id === id);
    if (meal) meal.feeling = feeling;
    this.setDay(day, data);
  },
  addWater(day, ml) {
    const data = this.getDay(day);
    data.waterMl = Math.max(0, (data.waterMl || 0) + ml);
    this.setDay(day, data);
  },
  addCheckin(day, checkin) {
    const data = this.getDay(day);
    data.checkins.push(checkin);
    this.setDay(day, data);
  },

  exportAll() {
    const out = { exportedAt: new Date().toISOString(), version: 1, days: {} };
    out.profile = this.getProfile();
    out.fridge = this.getFridge();
    out.memories = this.getMemories();
    out.chat = this.getChat();
    for (const day of this.allDays()) out.days[day] = this.getDay(day);
    return out;
  },

  clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  },
};
