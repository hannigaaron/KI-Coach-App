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

  /**
   * Die Notizen, jede mit den Feldern, die die Leser voraussetzen.
   *
   * Hier wird geradegezogen statt an jeder Lesestelle geprüft. Eine Notiz
   * ohne `tags` hat die App beim Start zum Absturz gebracht, und zwar in
   * `ensureStandards`, also bevor überhaupt etwas zu sehen war. Genau das
   * passiert beim Einspielen einer Sicherung aus einer älteren Fassung, in
   * der das Feld noch nicht existierte.
   */
  getMemories() {
    return read("memories", []).map((e) => ({
      ...e,
      tags: Array.isArray(e?.tags) ? e.tags : [],
      weight: Number.isFinite(e?.weight) ? e.weight : 3,
      at: e?.at || new Date().toISOString(),
    }));
  },
  setMemories(entries) {
    write("memories", entries);
  },

  /* ---------- Gespräche ---------- */

  /**
   * Alle Gespräche.
   *
   * Beim ersten Aufruf wird ein bestehender einzelner Verlauf übernommen. Ohne
   * das verliert jeder, der die App schon benutzt, seinen kompletten Chat, und
   * das ist der einzige Ort, an dem manche Dinge stehen.
   */
  getGespraeche() {
    const liste = read("gespraeche", null);
    if (Array.isArray(liste)) return liste;

    const alt = read("chat", []);
    if (alt.length === 0) {
      write("gespraeche", []);
      return [];
    }
    const jetzt = new Date().toISOString();
    const uebernommen = [{
      id: `g${Date.now().toString(36)}`,
      titel: "Bisheriger Verlauf",
      ordner: "sonstiges",
      nachrichten: alt,
      erstellt: alt[0]?.at || jetzt,
      zuletzt: alt[alt.length - 1]?.at || jetzt,
    }];
    write("gespraeche", uebernommen);
    return uebernommen;
  },

  setGespraeche(liste) {
    // Vierzig Gespräche mit je hundert Nachrichten sind die Obergrenze. Der
    // localStorage ist bei rund fünf Megabyte zu Ende, und ein Gespräch, das
    // seit vierzig Gesprächen niemand geöffnet hat, ist über die Suche in den
    // Notizen besser aufgehoben als im Verlauf.
    const gekuerzt = liste
      .map((g) => ({ ...g, nachrichten: g.nachrichten.slice(-100) }))
      .sort((a, b) => b.zuletzt.localeCompare(a.zuletzt))
      .slice(0, 40);
    write("gespraeche", gekuerzt);
  },

  getAktivesGespraech() {
    return read("aktivesGespraech", null);
  },
  setAktivesGespraech(id) {
    write("aktivesGespraech", id);
  },

  /** Die Nachrichten des offenen Gesprächs. Ersetzt den alten einzelnen Chat. */
  getChat() {
    const id = this.getAktivesGespraech();
    const g = this.getGespraeche().find((x) => x.id === id);
    return g ? g.nachrichten : [];
  },

  setChat(messages) {
    const alle = this.getGespraeche();
    const id = this.getAktivesGespraech();
    const treffer = alle.find((x) => x.id === id);
    if (!treffer) return;
    treffer.nachrichten = messages;
    treffer.zuletzt = new Date().toISOString();
    this.setGespraeche(alle);
  },

  getFridge() {
    return read("fridge", []);
  },
  setFridge(items) {
    write("fridge", items);
  },

  /**
   * Der Kalender.
   *
   * Gespeichert werden die fertig gelesenen Termine, nicht die ICS Datei.
   * Eine Datei mit einem Jahr Terminen ist schnell ein Megabyte gross, und
   * der localStorage ist bei rund fünf zu Ende. Die Termine selbst sind das,
   * was die App braucht.
   */
  getKalender() {
    return read("kalender", { quellen: [], termine: [], stand: null });
  },
  setKalender(kalender) {
    write("kalender", {
      quellen: (kalender.quellen || []).slice(0, 8),
      termine: (kalender.termine || []).slice(0, 1500),
      stand: kalender.stand || new Date().toISOString(),
    });
  },

  getShoppingList() {
    return read("shopping", null);
  },
  setShoppingList(liste) {
    write("shopping", liste);
  },

  /**
   * Aufgaben.
   *
   * Bewusst getrennt von den Tagesdaten: eine Aufgabe gehört keinem Tag, sie
   * wandert mit, bis sie erledigt ist. Erledigtes bleibt 30 Tage liegen, damit
   * der Abschluss am Abend sagen kann, was geschafft wurde.
   */
  getAufgaben() {
    return read("aufgaben", []);
  },
  setAufgaben(aufgaben) {
    const grenze = new Date(Date.now() - 30 * 86400000).toISOString();
    write("aufgaben", aufgaben.filter((a) => !a.erledigt || (a.erledigtAm || a.erstellt) > grenze).slice(0, 300));
  },

  /**
   * Zeit, die der Coach auf einen Lebensbereich gebucht hat.
   *
   * Der Kalender enthält bei diesem Nutzer fast nur Kundentermine. Ohne diese
   * Buchungen behauptet das Balance Board, er hätte 92 Prozent des Tages
   * nichts getan, und misst damit seine Kalenderpflege statt sein Leben.
   */
  /** Die ausgefüllten Wochenbögen, neueste zuletzt. */
  getCheckinBoegen() {
    return read("checkinBoegen", []);
  },

  /**
   * Einen Bogen speichern. Ein zweiter Bogen am selben Tag ersetzt den ersten,
   * sonst stehen zwei Wahrheiten für denselben Tag in der Auswertung.
   */
  addCheckinBogen(eintrag) {
    const liste = read("checkinBoegen", [])
      .filter((b) => !(b.tag === eintrag.tag && b.bogen === eintrag.bogen));
    liste.push(eintrag);
    // Ein Jahr Verlauf reicht für jeden Vergleich, den die App zieht.
    write("checkinBoegen", liste.slice(-120));
    return eintrag;
  },

  getAngebot() {
    const roh = read("angebot", null);
    return roh && typeof roh === "object"
      ? { coachName: "", buchungUrl: "", buchungText: "", plaene: [], ...roh }
      : { coachName: "", buchungUrl: "", buchungText: "", plaene: [] };
  },
  setAngebot(a) {
    write("angebot", a);
  },

  getZeiten() {
    return read("zeiten", []);
  },
  addZeit(eintrag) {
    const alle = this.getZeiten();
    alle.push(eintrag);
    // Ein halbes Jahr reicht. Alles davor braucht kein Balance Board mehr.
    const grenze = new Date(Date.now() - 190 * 86400000).toISOString().slice(0, 10);
    write("zeiten", alle.filter((z) => z.tag >= grenze).slice(-1500));
  },

  getStandards() {
    return read("standards", []);
  },
  setStandards(standards) {
    write("standards", standards);
  },

  getDay(day) {
    return read(`day.${day}`, {
      meals: [], waterMl: 0, checkins: [], steps: 0, standards: {},
      weightKg: null, trainings: [], verbrauch: null,
    });
  },
  setDay(day, data) {
    write(`day.${day}`, data);
    const index = new Set(read("days", []));
    index.add(day);
    write("days", [...index].sort());
  },
  /**
   * Alle Tage, für die etwas gespeichert ist.
   *
   * Aus dem Verzeichnis und zusätzlich aus den tatsächlich vorhandenen
   * Schlüsseln. Läuft beides auseinander, etwa weil ein Schreibvorgang
   * abgebrochen ist, fehlten sonst Tage in der Sicherung, ohne dass es jemand
   * merkt. Eine Sicherung, die Tage übergeht, ist schlimmer als keine.
   */
  allDays() {
    const ausVerzeichnis = read("days", []);
    const ausSpeicher = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const schluessel = localStorage.key(i) || "";
        if (schluessel.startsWith(`${PREFIX}day.`)) ausSpeicher.push(schluessel.slice(`${PREFIX}day.`.length));
      }
    } catch {
      // Ohne Zugriff auf den Speicher bleibt das Verzeichnis.
    }
    return [...new Set([...ausVerzeichnis, ...ausSpeicher])].filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t)).sort();
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
  /**
   * Ändert eine erfasste Mahlzeit.
   *
   * Nur die Felder, die mitkommen. Eine Mahlzeit trägt Uhrzeit, Quelle,
   * Gefühl und Sicherheit der Schätzung, und ein Editor, der beim Ändern der
   * Menge die Herkunft des Eintrags löscht, macht aus einem Fotoeintrag einen
   * ohne Herkunft.
   */
  updateMeal(day, id, aenderung) {
    const data = this.getDay(day);
    const meal = data.meals.find((m) => m.id === id);
    if (!meal) return null;
    Object.assign(meal, aenderung);
    this.setDay(day, data);
    return meal;
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
  /**
   * Hält fest, ob ein Mindeststandard an diesem Tag gehalten wurde.
   * Nötig für Standards, die die App nicht selbst messen kann, etwa die
   * Schlafenszeit. Alles andere wird aus den Tagesdaten gerechnet.
   */
  setStandardConfirmed(day, id, gehalten) {
    const data = this.getDay(day);
    data.standards = { ...(data.standards || {}), [id]: Boolean(gehalten) };
    this.setDay(day, data);
  },

  /**
   * Zählt einen Modellaufruf zum Tagesverbrauch dazu.
   *
   * Liegt beim Tag, nicht global, damit sich Verlauf und Hochrechnung ohne
   * eigene Buchführung ergeben. Wer alles löscht, löscht auch das mit.
   */
  addVerbrauch(day, summe) {
    const data = this.getDay(day);
    data.verbrauch = summe;
    this.setDay(day, data);
  },

  /** Eine Wiegung. Ein Wert je Tag, eine spätere ersetzt die frühere. */
  setWeight(day, kg) {
    const data = this.getDay(day);
    data.weightKg = kg;
    this.setDay(day, data);
  },

  /** Eine absolvierte Trainingseinheit, im Unterschied zum Plan im Profil. */
  addTraining(day, training) {
    const data = this.getDay(day);
    data.trainings = [...(data.trainings || []), training];
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
    // Die Einstellungen fehlten hier. Genau sie sind das, was nach einer
    // Neuinstallation am meisten Arbeit macht: Schluessel, Adresse des Push
    // Workers, Anmeldewort, Stimme, eigene Anweisungen. Eine Sicherung ohne
    // sie ist keine Sicherung.
    out.settings = this.getSettings();
    out.fridge = this.getFridge();
    out.shopping = this.getShoppingList();
    out.kalender = this.getKalender();
    out.aufgaben = this.getAufgaben();
    out.zeiten = this.getZeiten();
    out.checkinBoegen = this.getCheckinBoegen();
    out.angebot = this.getAngebot();
    out.standards = this.getStandards();
    out.memories = this.getMemories();
    out.gespraeche = this.getGespraeche();
    out.aktivesGespraech = this.getAktivesGespraech();
    for (const day of this.allDays()) out.days[day] = this.getDay(day);
    return out;
  },

  /**
   * Spielt eine Sicherung zurueck.
   *
   * Geschrieben wird nur, was in der Datei steht. Ein fehlendes Feld laesst
   * den bestehenden Wert in Ruhe, statt ihn zu leeren: eine aeltere Sicherung
   * darf nicht loeschen, was sie noch nicht kannte.
   *
   * Gibt zurueck, was angekommen ist, damit die Oberflaeche es benennen kann.
   * "Wiederhergestellt" ohne Zahl glaubt niemand, der gerade seine Daten
   * verloren hat.
   */
  importAll(daten) {
    if (!daten || typeof daten !== "object") throw new Error("Das ist keine Sicherung von daevo.");
    if (!daten.profile && !daten.days && !daten.settings) {
      throw new Error("In der Datei steht kein Profil und kein Tag. Ist das die richtige Datei?");
    }

    const bericht = { tage: 0, gespraeche: 0, notizen: 0, aufgaben: 0, einstellungen: false, profil: false };

    if (daten.profile) { this.setProfile(daten.profile); bericht.profil = true; }
    if (daten.settings) { this.setSettings(daten.settings); bericht.einstellungen = true; }
    if (Array.isArray(daten.memories)) { this.setMemories(daten.memories); bericht.notizen = daten.memories.length; }
    if (Array.isArray(daten.gespraeche)) { this.setGespraeche(daten.gespraeche); bericht.gespraeche = daten.gespraeche.length; }
    if (daten.aktivesGespraech) this.setAktivesGespraech(daten.aktivesGespraech);
    if (Array.isArray(daten.fridge)) this.setFridge(daten.fridge);
    if (Array.isArray(daten.shopping)) this.setShoppingList(daten.shopping);
    if (daten.kalender) this.setKalender(daten.kalender);
    if (Array.isArray(daten.aufgaben)) { this.setAufgaben(daten.aufgaben); bericht.aufgaben = daten.aufgaben.length; }
    if (Array.isArray(daten.standards)) this.setStandards(daten.standards);
    if (daten.angebot) this.setAngebot(daten.angebot);
    if (Array.isArray(daten.zeiten)) write("zeiten", daten.zeiten);
    if (Array.isArray(daten.checkinBoegen)) write("checkinBoegen", daten.checkinBoegen);

    if (daten.days && typeof daten.days === "object") {
      for (const [tag, inhalt] of Object.entries(daten.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tag) || !inhalt) continue;
        this.setDay(tag, inhalt);
        bericht.tage++;
      }
    }
    return bericht;
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
