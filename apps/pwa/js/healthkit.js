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

/** Schreibt eine Antwort des Plugins. Gibt zurück, was übernommen wurde. */
export function healthkitSchreiben(antwort, { store, heute }) {
  const tage = (antwort?.tage || []).filter((t) => t && /^\d{4}-\d{2}-\d{2}$/.test(String(t.tag)));
  const bericht = tage.length
    ? healthSchreiben({ tage }, { store, heute, stempel: "healthNativ" })
    : { tage: 0, schritte: 0, schlaf: 0, gewicht: 0 };
  return { ...bericht, trainings: workoutsSchreiben(antwort?.workouts, { store, heute }) };
}

/**
 * Holt die Werte aus Health und schreibt sie. Beim ersten Mal fragt iOS
 * nach der Erlaubnis, danach nie wieder. Ohne Erlaubnis kommen leere Tage,
 * und dann wird nichts geschrieben.
 */
export async function healthkitAbgleichen({ aufruf, store, heute, tage = 14 }) {
  const settings = store.getSettings();
  if (!settings.healthNativGefragt) {
    await aufruf("Gesundheit", "berechtigen");
    store.setSettings({ ...store.getSettings(), healthNativGefragt: true });
  }
  // Beim ersten Abgleich zwei Jahre, damit Bericht und Trend sofort Daten
  // haben. Danach reichen zwei Wochen: was älter ist, ändert sich nicht mehr.
  const zeitraum = settings.healthNativ ? tage : 730;
  const antwort = await aufruf("Gesundheit", "lesen", { tage: zeitraum });
  return healthkitSchreiben(antwort, { store, heute });
}
