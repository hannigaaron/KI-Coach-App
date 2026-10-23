/**
 * Die Brücke zu den eigenen Swift Plugins der iPhone App.
 *
 * Die Plugins liegen im App Ziel unter `apps/ios/ios/App/App` und werden in
 * `DaevoBridge.swift` angemeldet. Fremde Pakete gibt es dafür nicht: jedes
 * Plugin ist eine Datei, die man lesen kann, und keine Abhängigkeit, die
 * irgendwann nicht mehr gepflegt wird.
 *
 * Im Browser tut dieses Modul nichts. `nativAufruf` lehnt dort ab, und jeder
 * Aufrufer hat seinen Weg ohne natives Gerät.
 */
import { istNativ } from "./konfig.js";

export function nativAufruf(plugin, methode, daten = {}) {
  const cap = globalThis.Capacitor;
  if (!istNativ() || !cap) return Promise.reject(new Error("Nur in der iPhone App."));
  // Die Brücke, die Capacitor in die Seite legt, kann Plugins ohne das
  // Paket @capacitor/core ansprechen. Die Web App hat keinen Bundler und
  // soll keine Abhängigkeit dafür bekommen.
  if (typeof cap.nativePromise === "function") return cap.nativePromise(plugin, methode, daten);
  const p = cap.Plugins?.[plugin];
  if (p && typeof p[methode] === "function") return p[methode](daten);
  return Promise.reject(new Error(`Plugin ${plugin} fehlt in dieser Fassung der App.`));
}

/* ---------- Ende der Satzpause ---------- */

/**
 * Meldet das Ende der Pause auch bei gesperrtem Handy. Die Uhr der Seite
 * läuft im Hintergrund nicht weiter, und wer zwischen zwei Sätzen das Handy
 * weglegt, sieht nicht, dass es weitergeht. Ist die App vorn, zeigt iOS die
 * Mitteilung nicht, dann meldet die Seite selbst.
 */
export function pauseMitteilung(sekunden, uebung = "") {
  if (!istNativ()) return;
  nativAufruf("Mitteilungen", "pauseStellen", { sekunden, uebung }).catch(() => {});
}

export function pauseMitteilungAus() {
  if (!istNativ()) return;
  nativAufruf("Mitteilungen", "pauseAbbrechen").catch(() => {});
}

/* ---------- Spiegel des Speichers ---------- */

const PREFIX = "daevo.";

/** Alle Schlüssel der App als ein Objekt. Fremde Schlüssel bleiben draussen. */
export function schnappschuss(speicher = globalThis.localStorage) {
  const daten = {};
  for (let i = 0; i < speicher.length; i++) {
    const k = speicher.key(i);
    if (k && k.startsWith(PREFIX)) daten[k] = speicher.getItem(k);
  }
  return daten;
}

/**
 * Ob der Speicher der Web Ansicht leer ist und die Kopie gebraucht wird.
 * "migrated" allein zählt als leer, das setzt `storage.js` bei jedem Start.
 */
export function brauchtWiederherstellung(speicher, kopie) {
  if (!kopie || typeof kopie !== "object") return false;
  const eigene = Object.keys(schnappschuss(speicher)).filter((k) => k !== "daevo.v1.migrated");
  return eigene.length === 0 && Object.keys(kopie).some((k) => k !== "daevo.v1.migrated");
}

let geplant = null;

function spiegeln() {
  clearTimeout(geplant);
  geplant = null;
  nativAufruf("Speicher", "schreiben", { daten: JSON.stringify(schnappschuss()) }).catch(() => {});
}

function spaeterSpiegeln() {
  // Gesammelt, weil eine Mahlzeit ein Dutzend Schreibvorgänge auslöst und
  // jede Kopie den ganzen Stand schreibt.
  clearTimeout(geplant);
  geplant = setTimeout(spiegeln, 600);
}

async function spiegelStarten() {
  let kopie = null;
  try {
    const { daten } = await nativAufruf("Speicher", "lesen");
    kopie = daten ? JSON.parse(daten) : null;
  } catch {
    kopie = null;
  }

  // Hat iOS die Daten der Web Ansicht verworfen, kommen sie aus der Kopie
  // zurück, und die Seite lädt neu, damit jedes Modul den alten Stand liest.
  if (brauchtWiederherstellung(localStorage, kopie)) {
    for (const [k, v] of Object.entries(kopie)) if (typeof v === "string") localStorage.setItem(k, v);
    location.reload();
    return;
  }

  // Erst jetzt wird gespiegelt. Vorher könnte ein leerer Start die einzige
  // Kopie überschreiben, bevor sie gelesen ist.
  const proto = Object.getPrototypeOf(localStorage);
  for (const name of ["setItem", "removeItem"]) {
    const original = proto[name];
    proto[name] = function (k, ...rest) {
      const ergebnis = original.call(this, k, ...rest);
      if (this === localStorage && String(k).startsWith(PREFIX)) spaeterSpiegeln();
      return ergebnis;
    };
  }
  const leeren = proto.clear;
  proto.clear = function () {
    leeren.call(this);
    if (this === localStorage) spaeterSpiegeln();
  };
  // Beim Wechsel in den Hintergrund sofort, denn danach kann iOS die App
  // jederzeit beenden.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && geplant) spiegeln();
  });
  spaeterSpiegeln();
}

if (istNativ()) spiegelStarten();
