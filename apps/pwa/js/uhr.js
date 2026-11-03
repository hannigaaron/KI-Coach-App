/**
 * Die Apple Watch, auf der Seite der App.
 *
 * Die Uhr rechnet nichts selbst. Sie bekommt ein Paket mit dem Stand des Tages
 * und fertig vorbereiteten Trainings, mit den Werten vom letzten Mal in jedem
 * Satz, und schickt zurück, was dort passiert ist: Wasser, ein beendetes
 * Training. Eine zweite Fassung der Regeln in Swift liefe nach drei Monaten
 * anders als die im Kern, deshalb steht die ganze Logik hier.
 *
 * Gespeichert wird ein Training von der Uhr genauso wie eines aus dem
 * Trainingsmodus, über `entwurfAbschliessen`. Damit zählt jeder Satz für die
 * Steigerung und für die Prüfung nach acht Wochen, egal wo er abgehakt wurde.
 *
 * Kein `document`, kein `window`: das Modul läuft in den Tests.
 */
import { entwurfAbschliessen, entwurfNeu } from "./training.js";
import { bestellteEinheit } from "./vorhaben.js";

export const UHR_FASSUNG = 1;
/** So viele Trainings gehen höchstens mit. Fünf Tage Plan plus heute plus ein offener Entwurf. */
const MAX_TRAININGS = 7;
/** Erledigte Ereignisse, damit ein doppelt zugestelltes nicht zweimal zählt. */
const MERKEN = 100;

const r = (x) => Math.round(Number(x) || 0);

/** Nur was die Uhr anzeigt. Ein Entwurf trägt mehr, aber jedes Byte geht über Bluetooth. */
function schlank(entwurf) {
  return {
    titel: entwurf.titel,
    datum: entwurf.datum,
    uebungen: (entwurf.uebungen || []).map((u) => ({
      id: u.id,
      name: u.name,
      wdhZiel: String(u.ziel?.wdh ?? ""),
      pauseSek: r(u.ziel?.pauseSek) || 90,
      saetze: (u.saetze || []).map((s) => ({ kg: s.kg ?? null, wdh: s.wdh ?? null, rir: s.rir ?? null, fertig: Boolean(s.fertig) })),
    })),
  };
}

/**
 * Das Paket für die Uhr. `zahlen` ist das Ergebnis von `dayNumbers`, die
 * Trainings kommen in dieser Reihenfolge: ein offener Entwurf von heute,
 * das Training für heute aus dem Gespräch, dann die Einheiten des Plans.
 */
export function uhrPaket({ settings, zahlen, heute, gestrichen = false }) {
  const log = Array.isArray(settings.trainingslog) ? settings.trainingslog : [];
  const trainings = [];
  const offen = settings.trainingEntwurf;
  if (offen?.datum === heute && offen.uebungen?.length) {
    trainings.push({ schluessel: `offen-${offen.start || heute}`, quelle: "offen", titel: offen.titel, entwurf: schlank(offen) });
  }
  const ht = bestellteEinheit(settings, heute);
  if (ht?.einheit?.positionen?.length) {
    const e = entwurfNeu({ einheiten: [ht.einheit] }, 0, log, heute);
    if (e) trainings.push({ schluessel: `heute-${ht.schluessel || heute}`, quelle: "heute", titel: "Training für heute", entwurf: schlank({ ...e, titel: "Training für heute" }) });
  }
  const plan = settings.plan;
  (plan?.einheiten || []).forEach((einheit, ei) => {
    const e = entwurfNeu(plan, ei, log, heute);
    if (e) trainings.push({ schluessel: `plan-${ei}`, quelle: "plan", titel: einheit.titel, entwurf: schlank(e) });
  });
  const t = zahlen?.targets || {};
  const s = zahlen?.totals || {};
  return {
    fassung: UHR_FASSUNG,
    tag: heute,
    stand: {
      kcal: r(s.kcal), kcalZiel: r(t.kcal),
      protein: r(s.proteinG), proteinZiel: r(t.proteinG),
      wasserMl: r(s.waterMl), wasserZiel: r(t.waterMl),
    },
    gestrichen: Boolean(gestrichen),
    trainings: trainings.slice(0, MAX_TRAININGS),
  };
}

/**
 * Übernimmt, was von der Uhr kam. Gibt zurück, was übernommen wurde, für
 * eine kurze Meldung. Ein Training ohne einen abgehakten Satz wird nicht
 * gespeichert: nicht gemacht ist nicht null.
 */
export function uhrEreignisseAnwenden(ereignisse, { store, heute, neueId, jetzt = () => new Date() }) {
  const settings = store.getSettings();
  const erledigt = new Set(Array.isArray(settings.uhrErledigt) ? settings.uhrErledigt : []);
  const ergebnis = { wasserMl: 0, trainings: [] };
  let log = Array.isArray(settings.trainingslog) ? settings.trainingslog : [];

  for (const e of Array.isArray(ereignisse) ? ereignisse : []) {
    if (!e || typeof e !== "object") continue;
    const id = String(e.id || "");
    if (id && erledigt.has(id)) continue;
    if (id) erledigt.add(id);

    if (e.art === "wasser") {
      const ml = Math.max(0, Math.min(2000, r(e.ml)));
      const tag = /^\d{4}-\d{2}-\d{2}$/.test(String(e.tag)) ? e.tag : heute;
      if (ml > 0) { store.addWater(tag, ml); ergebnis.wasserMl += ml; }
      continue;
    }

    if (e.art === "training" && Array.isArray(e.uebungen)) {
      const datum = /^\d{4}-\d{2}-\d{2}$/.test(String(e.datum)) ? e.datum : heute;
      const start = Date.parse(e.start) ? e.start : new Date(jetzt().getTime() - 3_600_000).toISOString();
      const ende = Date.parse(e.ende) || jetzt().getTime();
      const entwurf = {
        titel: String(e.titel || "Training"),
        datum,
        start,
        uebungen: e.uebungen.map((u) => ({
          id: String(u.id || ""),
          name: String(u.name || ""),
          saetze: (Array.isArray(u.saetze) ? u.saetze : []).map((s) => ({
            kg: s.kg === null || s.kg === undefined ? null : Number(s.kg),
            wdh: r(s.wdh),
            rir: s.rir === null || s.rir === undefined ? null : r(s.rir),
            fertig: Boolean(s.fertig),
          })),
        })).filter((u) => u.id),
      };
      const fertig = entwurfAbschliessen(entwurf, log, ende);
      if (!fertig.saetze) continue;
      log = fertig.log;
      store.addTraining(datum, { id: neueId(), type: "strength", minutes: fertig.minuten, at: new Date(start).toTimeString().slice(0, 5), note: `${entwurf.titel}, Apple Watch` });
      ergebnis.trainings.push({ titel: entwurf.titel, saetze: fertig.saetze, minuten: fertig.minuten });
    }
  }

  store.setSettings({ ...store.getSettings(), trainingslog: log, uhrErledigt: [...erledigt].slice(-MERKEN) });
  return ergebnis;
}

/** Ein Satz für die Meldung nach dem Abholen, oder leer. */
export function uhrMeldung(ergebnis) {
  const teile = [];
  for (const t of ergebnis.trainings) teile.push(`${t.titel} von der Uhr gespeichert, ${t.saetze} Sätze in ${t.minuten} Minuten`);
  if (ergebnis.wasserMl) teile.push(`${ergebnis.wasserMl} ml Wasser von der Uhr`);
  return teile.join(". ");
}
