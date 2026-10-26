/**
 * Apple Health direkt, in der iPhone App.
 *
 * Export und Kurzbefehl waren Umwege, weil eine Web App an HealthKit nicht
 * herankommt. In der nativen Hülle liest `GesundheitPlugin.swift` die Werte
 * selbst, und dieses Modul schreibt sie über `healthSchreiben` in die Tage:
 * dieselben Regeln wie bei den anderen beiden Quellen.
 *
 * Gelesen wird beim Öffnen und beim Zurückholen der App. Mehr braucht es
 * nicht, denn ausgewertet wird nur, wenn jemand hinsieht.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { healthSchreiben } from "./gesundheit.js";

/** Welche Fassung der Leseberechtigung zuletzt erfragt wurde. 2 brachte die Ernährung, 3 Körperfett, VO2max und Trainingsminuten. */
export const HEALTH_FASSUNG = 3;

/** Trainings innerhalb dieses Abstands zu einem eigenen Eintrag gleicher Art gelten als derselbe. */
const GLEICH_MINUTEN = 90;

function minutenVon(uhrzeit) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(uhrzeit || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Legt Trainings aus Apple Health an, ohne etwas doppelt zu zählen.
 *
 * Zwei Wege führen zu demselben Training: die Uhr zeichnet es auf, und der
 * Nutzer sagt im Chat "60 Minuten Krafttraining". Beides zu zählen hiesse
 * zwei Einheiten im Bericht, doppelte Minuten im Balance Board und einen
 * höheren Wasserbedarf. Steht schon ein Eintrag gleicher Art in der Nähe der
 * Uhrzeit, bleibt der des Nutzers und der aus Health fällt weg.
 */
export function workoutsSchreiben(workouts, { store, heute }) {
  let neu = 0;
  for (const w of Array.isArray(workouts) ? workouts : []) {
    if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(String(w.tag)) || w.tag > heute) continue;
    const minuten = Math.round(Number(w.minuten));
    // Unter fünf Minuten ist es eher ein vergessenes Training auf der Uhr
    // als eine Einheit.
    if (!Number.isFinite(minuten) || minuten < 5) continue;
    const id = `hk-${w.id}`;
    const day = store.getDay(w.tag);
    const vorhanden = day.trainings || [];
    if (vorhanden.some((t) => t.id === id)) continue;
    const start = minutenVon(w.uhrzeit);
    const doppelt = vorhanden.some((t) => {
      if (t.type !== w.art) return false;
      const andere = minutenVon(t.at);
      return start === null || andere === null || Math.abs(andere - start) <= GLEICH_MINUTEN;
    });
    if (doppelt) continue;
    store.addTraining(w.tag, { id, type: w.art, minutes: minuten, at: w.uhrzeit || "", note: "aus Apple Health", quelle: "health" });
    neu++;
  }
  return neu;
}

/**
 * Eine eigene Mahlzeit in diesem Abstand macht eine Mahlzeit aus Health zum
 * Verdacht auf dieselbe. Wer sein Mittagessen in YAZIO und in daevo
 * einträgt, tut das selten mehr als eine Dreiviertelstunde auseinander. Eine
 * Regel der App, keine Messung.
 */
export const NAHRUNG_GLEICH_MINUTEN = 45;

const NAEHRWERTE = ["kcal", "proteinG", "fatG", "carbsG"];
/** So weit zurück werden Mahlzeiten aus Health übernommen. */
export const NAHRUNG_TAGE = 60;

/**
 * Legt die einzelnen Nährwerte aus Health zu Mahlzeiten zusammen. Steht eine
 * Mahlzeit in Health als Ganzes, gehört alles mit ihrer Kennung zusammen.
 * Sonst gilt: dieselbe App, derselbe Tag, dieselbe Minute. So schreiben die
 * Apps eine Mahlzeit, deren Werte einzeln ankommen.
 */
export function nahrungZusammenlegen(nahrung) {
  const mahlzeiten = new Map();
  for (const n of Array.isArray(nahrung) ? nahrung : []) {
    if (!n || !/^\d{4}-\d{2}-\d{2}$/.test(String(n.tag)) || !NAEHRWERTE.includes(n.feld)) continue;
    const wert = Number(n.wert);
    if (!Number.isFinite(wert) || wert < 0) continue;
    const quelle = String(n.quelle || "Apple Health").slice(0, 40);
    const schluessel = n.mahlzeit ? `k:${n.mahlzeit}` : `s:${quelle}|${n.tag}|${n.uhrzeit || ""}`;
    const m = mahlzeiten.get(schluessel) ?? { schluessel, tag: n.tag, uhrzeit: n.uhrzeit || "", quelle, name: "", kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, hatKcal: false };
    m[n.feld] += wert;
    if (n.feld === "kcal") m.hatKcal = true;
    if (n.name && !m.name) m.name = String(n.name).slice(0, 60);
    mahlzeiten.set(schluessel, m);
  }
  return [...mahlzeiten.values()].map((m) => {
    // Ohne Kalorien, aber mit Makros: aus den Makros gerechnet, mit den
    // Faktoren nach Verordnung (EU) Nr. 1169/2011, Anhang XIV.
    const kcal = m.hatKcal ? m.kcal : m.proteinG * 4 + m.fatG * 9 + m.carbsG * 4;
    const r = (x) => Math.round(x * 10) / 10;
    return { ...m, kcal: Math.round(kcal), proteinG: r(m.proteinG), fatG: r(m.fatG), carbsG: r(m.carbsG) };
  }).filter((m) => m.kcal > 0 || m.proteinG > 0 || m.fatG > 0 || m.carbsG > 0);
}

/** Eine kurze, feste Kennung aus dem Schlüssel. Der Schlüssel selbst trägt Leerzeichen und Namen. */
function kennung(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/**
 * Schreibt Mahlzeiten aus Health in die Tage.
 *
 * Drei Regeln. Was in Health steht, kommt als eigene Mahlzeit mit der App
 * als Quelle, "aus YAZIO", und wird bei jedem Abgleich neu geschrieben: wer
 * in YAZIO eine Menge ändert, sieht sie danach auch hier. Was dort gelöscht
 * wurde, verschwindet hier, aber nur in den gelesenen Tagen.
 *
 * Steht in der Nähe schon eine eigene Mahlzeit aus daevo, wird die aus
 * Health nicht mitgezählt. Sie steht am Tag unter `healthUebersprungen`,
 * damit sichtbar bleibt, dass etwas da war und warum es nicht zählt. Ein
 * stiller Filter, der Essen verschluckt, wäre derselbe Fehler wie doppelt
 * zählen, nur in die andere Richtung.
 *
 * Ausschalten lässt es sich unter `settings.healthErnaehrungAus`. Dann
 * werden die Mahlzeiten aus Health auch wieder entfernt.
 */
export function ernaehrungSchreiben(nahrung, { store, heute, von }) {
  const aus = Boolean(store.getSettings().healthErnaehrungAus);
  // Höchstens 60 Tage. Beim ersten Abgleich kommen zwei Jahre, und zwei
  // Jahre Mahlzeiten aus YAZIO füllen den localStorage, ohne dass eine
  // Auswertung so weit zurückschaut.
  const grenze = new Date(Date.parse(`${heute}T12:00:00Z`) - NAHRUNG_TAGE * 86_400_000).toISOString().slice(0, 10);
  von = von && von > grenze ? von : grenze;
  const mahlzeiten = aus ? [] : nahrungZusammenlegen(nahrung).filter((m) => m.tag <= heute && m.tag >= von);
  const jeTag = new Map();
  for (const m of mahlzeiten) jeTag.set(m.tag, [...(jeTag.get(m.tag) ?? []), m]);
  // Auch Tage ohne Health Mahlzeit im Zeitraum anfassen: dort kann eine
  // gelöschte Mahlzeit stehen, die weg muss.
  const tage = new Set([...jeTag.keys(), ...store.allDays().filter((t) => t >= von && t <= heute)]);
  let neu = 0;
  let uebersprungen = 0;
  for (const tag of tage) {
    const day = store.getDay(tag);
    const alt = day.meals || [];
    const eigene = alt.filter((m) => m.source !== "health");
    if (!jeTag.has(tag) && eigene.length === alt.length && !day.healthUebersprungen) continue;
    const ausHealth = [];
    const weg = [];
    for (const m of jeTag.get(tag) ?? []) {
      const start = minutenVon(m.uhrzeit);
      const nah = eigene.find((e) => {
        const andere = minutenVon(e.at);
        return start !== null && andere !== null && Math.abs(andere - start) <= NAHRUNG_GLEICH_MINUTEN;
      });
      if (nah) {
        weg.push({ quelle: m.quelle, uhrzeit: m.uhrzeit, kcal: m.kcal, eigeneUm: nah.at });
        continue;
      }
      const id = `hk-${kennung(m.schluessel)}`;
      // Hier gelöscht bleibt gelöscht, hier korrigiert bleibt korrigiert.
      // Sonst käme jede Änderung beim nächsten Öffnen aus Health zurück.
      if ((day.healthEntfernt || []).includes(id)) continue;
      const vorher = alt.find((x) => x.id === id);
      if (vorher?.korrigiert) { ausHealth.push(vorher); continue; }
      if (!vorher) neu++;
      ausHealth.push({
        id, text: m.name || `Mahlzeit aus ${m.quelle}`, at: m.uhrzeit, source: "health", quelle: m.quelle,
        entries: [{ name: m.name || "Mahlzeit", quantity: "1 Portion", kcal: m.kcal, proteinG: m.proteinG, fatG: m.fatG, carbsG: m.carbsG }],
        feeling: null,
      });
    }
    uebersprungen += weg.length;
    day.meals = [...eigene, ...ausHealth].sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
    if (weg.length) day.healthUebersprungen = weg;
    else delete day.healthUebersprungen;
    store.setDay(tag, day);
  }
  return { mahlzeiten: neu, uebersprungen };
}

/** Schreibt eine Antwort des Plugins. Gibt zurück, was übernommen wurde. */
export function healthkitSchreiben(antwort, { store, heute }) {
  const tage = (antwort?.tage || []).filter((t) => t && /^\d{4}-\d{2}-\d{2}$/.test(String(t.tag)));
  const bericht = tage.length
    ? healthSchreiben({ tage }, { store, heute, stempel: "healthNativ" })
    : { tage: 0, schritte: 0, schlaf: 0, gewicht: 0 };
  // Eine ältere Hülle ohne Ernährung schickt kein Feld. Dann bleibt alles,
  // wie es ist, statt die Mahlzeiten aus Health als gelöscht zu behandeln.
  const essen = Array.isArray(antwort?.nahrung)
    ? ernaehrungSchreiben(antwort.nahrung, { store, heute, von: antwort.von })
    : { mahlzeiten: 0, uebersprungen: 0 };
  return { ...bericht, trainings: workoutsSchreiben(antwort?.workouts, { store, heute }), ...essen };
}

/**
 * Holt die Werte aus Health und schreibt sie. Beim ersten Mal fragt iOS
 * nach der Erlaubnis, danach nie wieder. Ohne Erlaubnis kommen leere Tage,
 * und dann wird nichts geschrieben.
 */
export async function healthkitAbgleichen({ aufruf, store, heute, tage = 14 }) {
  const settings = store.getSettings();
  // iOS fragt nur nach Typen, die neu dazukommen, und nur, wenn die App
  // erneut fragt. Mit der Ernährung kam ein zweiter Satz Typen, deshalb
  // eine Fassung statt eines Ja oder Nein.
  const fassung = Number(settings.healthNativFassung ?? (settings.healthNativGefragt ? 1 : 0));
  if (fassung < HEALTH_FASSUNG) {
    await aufruf("Gesundheit", "berechtigen");
    store.setSettings({ ...store.getSettings(), healthNativGefragt: true, healthNativFassung: HEALTH_FASSUNG });
  }
  // Beim ersten Abgleich zwei Jahre, damit Bericht und Trend sofort Daten
  // haben. Danach reichen zwei Wochen: was älter ist, ändert sich nicht mehr.
  const zeitraum = settings.healthNativ ? tage : 730;
  const antwort = await aufruf("Gesundheit", "lesen", { tage: zeitraum });
  return healthkitSchreiben(antwort, { store, heute });
}
