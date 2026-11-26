/**
 * Die Einheiten einer Übung im Training: was in der ersten Spalte steht und
 * was in der zweiten. Eigenes Modul, weil Training, Pläne und Abschluss es
 * brauchen und Training und Pläne sich gegenseitig importieren.
 *
 * Kein `document`, kein `window`: das Modul läuft in den Tests.
 */
import { foldUmlauts } from "@daevo/core";

/* ---------- Einheiten je Übung ---------- */

/*
 * Kilo und Wiederholungen passen nicht zu jeder Übung. Ein Plank wird in
 * Sekunden gehalten, ein Ergometer in Minuten auf einer Stufe gefahren, und
 * eine Zeile "kg, Wdh, RIR" darüber zwingt zu Zahlen, die nichts bedeuten.
 * Deshalb trägt jede Übung im Training ihre Masse: was in der ersten Spalte
 * steht (`last`) und was in der zweiten (`menge`). Ein Tipp auf den Kopf
 * der Spalte wechselt sie.
 *
 * Kilo und Wiederholungen bleiben in `kg` und `wdh`, alles andere steht in
 * `last` und `menge`. So rechnen Steigerung, Kurve und die Prüfung nach
 * acht Wochen nie mit Sekunden, als wären es Wiederholungen: ein Satz ohne
 * Wiederholungen gilt dort nicht und wird übersprungen.
 *
 * Gemerkt wird über das Protokoll: ein Eintrag trägt seine Masse, wenn sie
 * nicht Kilo und Wiederholungen sind, und das nächste Training derselben
 * Übung beginnt damit.
 */
export const LAST_EINHEITEN = {
  kg: { kopf: "KG", platz: "kg", name: "Kilo", wahl: "Kilo" },
  ohne: { kopf: "KG", platz: "", name: "Ohne Gewicht", wahl: "Ohne" },
  stufe: { kopf: "STUFE", platz: "Stufe", name: "Intensität, Stufe", wahl: "Stufe" },
  kmh: { kopf: "KM/H", platz: "km/h", name: "Tempo, km/h", wahl: "km/h" },
  km: { kopf: "KM", platz: "km", name: "Strecke, km", wahl: "km" },
  watt: { kopf: "WATT", platz: "W", name: "Watt", wahl: "Watt" },
};
export const MENGE_EINHEITEN = {
  wdh: { kopf: "WDH", platz: "Wdh", name: "Wiederholungen", wahl: "Wdh" },
  sek: { kopf: "SEK", platz: "Sek", name: "Sekunden", wahl: "Sekunden" },
  min: { kopf: "MIN", platz: "Min", name: "Minuten", wahl: "Minuten" },
  m: { kopf: "METER", platz: "m", name: "Meter", wahl: "Meter" },
};
export const STANDARD_MASSE = Object.freeze({ last: "kg", menge: "wdh" });

// Wörter für Ausdauer im Namen, auch bei eigenen Übungen aus dem Diktat.
const CARDIO = /\b(fahrrad|rad|radfahren|ergometer|laufband|laufen|joggen|rudergeraet|ruderergometer|crosstrainer|stepper|treppe|seilspringen|cardio|ausdauer|sprint|schwimmen|airbike|assault|spinning)/;

/**
 * Die Masse, mit der eine Übung beginnt, wenn es kein letztes Mal gibt.
 * Ausdauer in Minuten auf einer Stufe, Halteübungen in Sekunden, alles
 * andere in Kilo und Wiederholungen.
 */
export function standardMasse(info, ziel, name) {
  const n = foldUmlauts(String(name ?? info?.name ?? "").toLowerCase());
  if (CARDIO.test(n)) return { last: "stufe", menge: "min" };
  const bereich = String(ziel?.wdh ?? info?.repRange ?? "");
  if (info?.mechanics === "isometric" || /\d\s*(s|sek|sekunden)\s*$/i.test(bereich)) {
    return { last: info?.equipment === "bodyweight" ? "ohne" : "kg", menge: "sek" };
  }
  return { ...STANDARD_MASSE };
}

export function masseVon(u) {
  const m = u?.masse;
  return {
    last: LAST_EINHEITEN[m?.last] ? m.last : "kg",
    menge: MENGE_EINHEITEN[m?.menge] ? m.menge : "wdh",
  };
}

export const standardIst = (m) => m.last === "kg" && m.menge === "wdh";

const zahlKurz = (n) => String(Math.round(Number(n) * 10) / 10).replace(".", ",");

/** Ein Satz als kurzer Text, in den Massen seiner Übung. Für das letzte Mal, den Verlauf und den Abschluss. */
export function satzText(s, masse = STANDARD_MASSE) {
  const m = { last: masse?.last ?? "kg", menge: masse?.menge ?? "wdh" };
  const menge = m.menge === "wdh" ? s.wdh : s.menge;
  const mengeText = menge === null || menge === undefined || menge === "" ? ""
    : m.menge === "wdh" ? `${zahlKurz(menge)} Wdh`
    : m.menge === "sek" ? `${zahlKurz(menge)} s`
    : m.menge === "min" ? `${zahlKurz(menge)} min`
    : `${zahlKurz(menge)} m`;
  const last = m.last === "kg" ? s.kg : m.last === "ohne" ? null : s.last;
  const lastText = last === null || last === undefined || last === "" || (m.last === "kg" && !(Number(last) > 0)) ? ""
    : m.last === "kg" ? `${zahlKurz(last)} kg`
    : m.last === "stufe" ? `Stufe ${zahlKurz(last)}`
    : m.last === "kmh" ? `${zahlKurz(last)} km/h`
    : m.last === "km" ? `${zahlKurz(last)} km`
    : `${zahlKurz(last)} W`;
  if (m.last === "kg" && m.menge === "wdh" && lastText) return `${lastText} × ${zahlKurz(s.wdh)}`;
  return [mengeText, lastText].filter(Boolean).join(" · ");
}

