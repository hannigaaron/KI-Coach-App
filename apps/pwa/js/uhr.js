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
import { istSchlafMarker } from "@daevo/core";

export const UHR_FASSUNG = 2;
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
      saetze: (u.saetze || []).map((s) => ohneLeeres({ kg: zahlOder(s.kg), wdh: zahlOder(s.wdh), rir: zahlOder(s.rir), fertig: Boolean(s.fertig) })),
    })).filter((u) => u.saetze.length),
  };
}

const zahlOder = (x) => (x === null || x === undefined || x === "" || !Number.isFinite(Number(x)) ? undefined : Number(x));

/**
 * Leere Felder fallen weg, statt als null mitzugehen. Der Application Context
 * nimmt nur Werte einer Property List, und null ist keiner: iOS lehnt dann
 * das ganze Paket ab, und die Uhr bekommt nie einen Tag und nie ein
 * Training. Auf der Uhr ist ein fehlendes Feld dasselbe wie leer.
 */
function ohneLeeres(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null));
}

/** Ob ein Wert über den Application Context gehen kann: keine null, keine Zahl, die keine ist. */
export function alsPropertyList(wert) {
  if (wert === null || wert === undefined) return false;
  if (typeof wert === "number") return Number.isFinite(wert);
  if (typeof wert === "string" || typeof wert === "boolean") return true;
  if (Array.isArray(wert)) return wert.every(alsPropertyList);
  if (typeof wert === "object") return Object.values(wert).every(alsPropertyList);
  return false;
}

/** So viele Termine und Aufgaben gehen höchstens mit. Eine Uhr ist für einen Blick gemacht. */
const MAX_TERMINE = 30;
const MAX_AUFGABEN = 12;
/** Termine so weit voraus. Weiter schaut niemand auf der Uhr, und jedes Byte geht über Bluetooth. */
const TERMINE_TAGE = 7;

/**
 * Die Termine der nächsten Tage für die Uhr, ab jetzt. Was schon vorbei ist,
 * fällt weg, ein laufender Termin bleibt. Derselbe Termin aus zwei
 * Kalendern zählt einmal, wie im Briefing. Zeiten in Millisekunden: die Uhr
 * zeigt sie in ihrer eigenen Zeitzone, und die stimmt mit dem iPhone überein.
 */
export function uhrTermine(termine, jetzt = Date.now()) {
  const bis = jetzt + TERMINE_TAGE * 86_400_000;
  const gesehen = new Set();
  const aus = [];
  for (const t of [...(Array.isArray(termine) ? termine : [])].sort((a, b) => a.von - b.von)) {
    if (!(Number(t?.bis) > jetzt) || !(Number(t?.von) < bis)) continue;
    const titel = String(t.titel || "").trim();
    if (!titel || istSchlafMarker(titel)) continue;
    const schluessel = `${titel.toLowerCase()}|${t.von}`;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    aus.push(ohneLeeres({ titel: titel.slice(0, 80), von: Number(t.von), bis: Number(t.bis), ganztags: Boolean(t.ganztags), ort: t.ort ? String(t.ort).slice(0, 60) : undefined }));
    if (aus.length >= MAX_TERMINE) break;
  }
  return aus;
}

/**
 * Die Aufgaben für die Uhr, in der Reihenfolge des Plans: heute zuerst, mit
 * Uhrzeit, wenn der Tagesplan einen Platz gefunden hat, dann was auf morgen
 * gerutscht ist. Dieselbe Rangfolge wie auf Dein Tag, sonst stünde auf der
 * Uhr eine andere Aufgabe oben als am iPhone.
 */
export function uhrAufgaben({ plan, zeiten } = {}) {
  const uhrzeit = new Map();
  for (const b of zeiten?.bloecke || []) {
    if (b?.aufgabe?.id && Number.isFinite(b.von)) {
      const d = new Date(b.von);
      uhrzeit.set(b.aufgabe.id, `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }
  }
  const zeile = (a, wann) => ohneLeeres({
    id: String(a.id),
    text: String(a.text || "").slice(0, 120),
    wann,
    uhrzeit: uhrzeit.get(a.id),
    faellig: a.faellig || undefined,
    wichtig: Number(a.wichtigkeit) >= 3,
    todoist: String(a.quelle || "") === "todoist",
  });
  return [
    ...(plan?.heute || []).map((a) => zeile(a, "heute")),
    ...(plan?.morgen || []).map((a) => zeile(a, "spaeter")),
  ].filter((a) => a.id && a.text).slice(0, MAX_AUFGABEN);
}

/**
 * Das Paket für die Uhr. `zahlen` ist das Ergebnis von `dayNumbers`, die
 * Trainings kommen in dieser Reihenfolge: ein offener Entwurf von heute,
 * das Training für heute aus dem Gespräch, dann die Einheiten des Plans.
 */
export function uhrPaket({ settings, zahlen, heute, gestrichen = false, ki = null, termine = [], aufgaben = [] }) {
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
    trainings: trainings.filter((t) => t.entwurf.uebungen.length).slice(0, MAX_TRAININGS),
    termine,
    aufgaben,
    // Wann gerechnet wurde. Die Uhr sagt damit, wie alt ein Stand ist,
    // statt einen von gestern als heutigen zu zeigen.
    stamp: Date.now(),
    // Ohne Einwilligung oder Konto fehlt das Feld, und die Uhr fragt nur über das iPhone.
    ...(ki && alsPropertyList(ki) ? { ki } : {}),
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
  const ergebnis = { wasserMl: 0, trainings: [], saetze: [], gespraech: [], erledigt: [] };
  let log = Array.isArray(settings.trainingslog) ? settings.trainingslog : [];

  for (const e of Array.isArray(ereignisse) ? ereignisse : []) {
    if (!e || typeof e !== "object") continue;
    const id = String(e.id || "");
    if (id && erledigt.has(id)) continue;
    if (id) erledigt.add(id);

    // Ein Satz, den die Uhr ohne iPhone vorgemerkt hat. Er läuft beim Öffnen
    // durch den ganzen Agenten, als hätte er ihn hier gesagt.
    if (e.art === "satz") {
      const text = String(e.text || "").trim().slice(0, 1000);
      if (text) ergebnis.saetze.push(text);
      continue;
    }

    // Was auf der Uhr ohne iPhone gefragt und beantwortet wurde. Es gehört
    // ins Gespräch, sonst fehlt es dem Coach beim nächsten Mal.
    if (e.art === "gespraech") {
      const frage = String(e.frage || "").trim().slice(0, 1000);
      const antwort = String(e.antwort || "").trim().slice(0, 2000);
      if (frage && antwort) ergebnis.gespraech.push({ frage, antwort, at: String(e.at || "") });
      continue;
    }

    // Eine Aufgabe, die auf der Uhr abgehakt wurde. Abgehakt wird danach in
    // der App über `aufgabeErledigen`, bei Todoist also auch dort.
    if (e.art === "aufgabe") {
      const aufgabeId = String(e.aufgabeId || "").trim();
      if (aufgabeId && !ergebnis.erledigt.includes(aufgabeId)) ergebnis.erledigt.push(aufgabeId);
      continue;
    }

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
