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
import { aktiverPlan, bestellteEinheit } from "./vorhaben.js";
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
export function uhrPaket({ settings, zahlen, heute, gestrichen = false, ki = null, termine = [], aufgaben = [], todoistToken = "" }) {
  const log = Array.isArray(settings.trainingslog) ? settings.trainingslog : [];
  const trainings = [];
  const offen = settings.trainingEntwurf;
  const offenDa = offen?.datum === heute && offen.uebungen?.length && !offen.rueckblick;
  if (offenDa) {
    // Das laufende Training mit Beginn und laufender Pause. Die Uhr zeigt
    // damit dieselben Übungen wie das iPhone, auch die eben dazugenommenen,
    // und zählt eine Pause vom iPhone mit herunter.
    const pauseBis = Number(settings.trainingPause?.bis) > Date.now() ? Number(settings.trainingPause.bis) : undefined;
    trainings.push(ohneLeeres({ schluessel: `offen-${offen.start || heute}`, quelle: "offen", titel: offen.titel, start: offen.start || undefined, pauseBis, entwurf: schlank(offen) }));
  }
  const ht = bestellteEinheit(settings, heute);
  // Läuft das Training für heute schon, steht es nicht ein zweites Mal da.
  // Im Betrieb zeigte die Uhr "Training für heute, 6 Übungen", während am
  // iPhone dasselbe Training mit 9 Übungen lief.
  if (ht?.einheit?.positionen?.length && !(offenDa && offen.titel === "Training für heute")) {
    const e = entwurfNeu({ einheiten: [ht.einheit] }, 0, log, heute);
    if (e) trainings.push({ schluessel: `heute-${ht.schluessel || heute}`, quelle: "heute", titel: "Training für heute", entwurf: schlank({ ...e, titel: "Training für heute" }) });
  }
  // In einer stressigen Woche bekommt die Uhr den Kurzplan, sonst stünden
  // dort Einheiten, die diese Woche niemand trainiert.
  const plan = aktiverPlan(settings, heute);
  (plan?.einheiten || []).forEach((einheit, ei) => {
    if (offenDa && offen.titel === einheit.titel) return;
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
    // Der Todoist Schlüssel für die Uhr. Sie fragt Todoist damit selbst, wenn
    // das iPhone nicht vorn ist, und blendet aus, was dort schon erledigt
    // ist. Er geht nur an die eigene Uhr und liegt dort im Schlüsselbund.
    // Leer heisst: Verbindung gelöst, die Uhr löscht ihn.
    todoistToken: String(todoistToken || ""),
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
  const ergebnis = { wasserMl: 0, trainings: [], saetze: [], gespraech: [], erledigt: [], stand: null };
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

    // Der Stand eines Trainings, das gerade auf der Uhr läuft, nach jedem
    // Satz. Gespeichert wird hier nichts, die App führt ihn in das laufende
    // Training am iPhone, `entwurfMitUhr`. Nur der jüngste zählt.
    if (e.art === "trainingStand" && Array.isArray(e.uebungen)) {
      ergebnis.stand = { titel: String(e.titel || "Training"), datum: /^\d{4}-\d{2}-\d{2}$/.test(String(e.datum)) ? e.datum : heute, start: Date.parse(e.start) ? e.start : null, uebungen: uhrUebungen(e.uebungen) };
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
        uebungen: uhrUebungen(e.uebungen),
      };
      const fertig = entwurfAbschliessen(entwurf, log, ende);
      if (!fertig.saetze) continue;
      log = fertig.log;
      store.addTraining(datum, { id: neueId(), type: "strength", minutes: fertig.minuten, at: new Date(start).toTimeString().slice(0, 5), note: `${entwurf.titel}, Apple Watch` });
      ergebnis.trainings.push({ titel: entwurf.titel, datum, start, ende: new Date(ende).toISOString(), saetze: fertig.saetze, minuten: fertig.minuten });
      // Ein beendetes Training ist kein laufendes mehr.
      if (ergebnis.stand?.titel === entwurf.titel) ergebnis.stand = null;
    }
  }

  store.setSettings({ ...store.getSettings(), trainingslog: log, uhrErledigt: [...erledigt].slice(-MERKEN) });
  return ergebnis;
}

/** Übungen, wie die Uhr sie schickt, in der Form eines Entwurfs. */
function uhrUebungen(liste) {
  return (Array.isArray(liste) ? liste : []).map((u) => ({
    id: String(u.id || ""),
    name: String(u.name || ""),
    saetze: (Array.isArray(u.saetze) ? u.saetze : []).map((s) => ({
      kg: s.kg === null || s.kg === undefined ? null : Number(s.kg),
      wdh: r(s.wdh),
      rir: s.rir === null || s.rir === undefined ? null : r(s.rir),
      fertig: Boolean(s.fertig),
    })),
  })).filter((u) => u.id);
}

/**
 * Führt den Stand von der Uhr in das laufende Training am iPhone. Ein Satz,
 * der auf der Uhr abgehakt ist und hier noch offen, wird mit den Werten der
 * Uhr übernommen. Was hier schon abgehakt ist, bleibt: abgehakt ist
 * abgehakt, egal wo. Eine Übung, die das iPhone nicht kennt, kommt hinten
 * dazu. Ohne laufendes Training wird der Stand der Uhr selbst zum Training,
 * damit man am iPhone weitermachen kann.
 */
export function entwurfMitUhr(entwurf, stand) {
  if (!stand) return entwurf;
  if (!entwurf || entwurf.titel !== stand.titel || entwurf.datum !== stand.datum) {
    return {
      ei: -1, frei: true, titel: stand.titel, datum: stand.datum, start: stand.start || new Date().toISOString(), aktiv: 0,
      uebungen: stand.uebungen.map((u) => ({ ...u, ziel: { saetze: u.saetze.length, wdh: "8-12", reserve: 2, pauseSek: 90 } })),
    };
  }
  const uebungen = entwurf.uebungen.map((u) => {
    const von = stand.uebungen.find((x) => x.id === u.id);
    if (!von) return u;
    const saetze = u.saetze.map((s, i) => {
      const w = von.saetze[i];
      return w?.fertig && !s.fertig ? { ...s, kg: w.kg, wdh: w.wdh, rir: w.rir ?? s.rir, fertig: true } : s;
    });
    for (let i = u.saetze.length; i < von.saetze.length; i++) if (von.saetze[i].fertig) saetze.push({ ...von.saetze[i] });
    return { ...u, saetze };
  });
  for (const u of stand.uebungen) {
    if (!uebungen.some((x) => x.id === u.id)) uebungen.push({ ...u, ziel: { saetze: u.saetze.length, wdh: "8-12", reserve: 2, pauseSek: 90 } });
  }
  // Die aktive Übung folgt der ersten offenen, wie auf der Uhr.
  const aktiv = uebungen.findIndex((u) => u.saetze.some((s) => !s.fertig));
  return { ...entwurf, uebungen, aktiv: aktiv >= 0 ? aktiv : entwurf.aktiv };
}

/** Ein Satz für die Meldung nach dem Abholen, oder leer. */
export function uhrMeldung(ergebnis) {
  const teile = [];
  for (const t of ergebnis.trainings) teile.push(`${t.titel} von der Uhr gespeichert, ${t.saetze} Sätze in ${t.minuten} Minuten`);
  if (ergebnis.wasserMl) teile.push(`${ergebnis.wasserMl} ml Wasser von der Uhr`);
  return teile.join(". ");
}
