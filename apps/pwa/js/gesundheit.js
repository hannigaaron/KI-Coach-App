/**
 * Der Apple Health Import.
 *
 * HealthKit gibt es nur nativ, daran ändert auch kein MCP etwas: MCP verbindet
 * ein Sprachmodell mit Werkzeugen, nicht eine Web App mit einem Gerät. Der
 * einzige Weg ohne App Store ist der Export, den die Health App selbst
 * anbietet. Er kommt als ZIP, und darin liegt `apple_health_export/export.xml`.
 *
 * Alles läuft im Browser. Es geht keine Datei an einen Server, genau wie beim
 * Kalender. Gespeichert werden die Tageswerte und nicht die Datei: ein Export
 * hat je nach Nutzungsdauer mehrere hundert Megabyte, und der localStorage ist
 * bei rund fünf zu Ende.
 *
 * Diese Datei fasst weder `document` noch `window` an.
 */

import { healthBericht, healthSammler } from "@daevo/core";
import { zipDateiText, zipNamen } from "./zip.js";

/**
 * So viele Tage werden höchstens übernommen.
 *
 * Zwei Jahre. Wer die Uhr seit 2015 trägt, hat über dreitausend Tage im
 * Export, und die bringen den Speicher an seine Grenze, ohne dass irgendeine
 * Auswertung dieser App so weit zurückschaut. Die längste ist der
 * Belastungsverlauf mit 28 Tagen.
 */
export const MAX_TAGE = 730;

/**
 * Der Name im Archiv. `export_cda.xml` liegt daneben und ist das Falsche.
 *
 * Ohne Rücksicht auf Gross und Klein. Ein Export von einem deutschen iPhone
 * heisst `Export.xml`, und die erste Fassung suchte nur nach `export.xml`.
 * Der Nutzer bekam "keine export.xml im Archiv", während sie mit grossem E
 * als erste Datei in der Liste stand.
 */
export function istExport(name) {
  const klein = String(name).toLowerCase();
  return klein === "export.xml" || klein.endsWith("/export.xml");
}

/**
 * Liest die Datei und gibt das Ergebnis zurück, ohne etwas zu speichern.
 *
 * Getrennt vom Schreiben, weil der Nutzer sehen soll, was ankommt, bevor es in
 * seine Tage geht. Ein Import, der erst schreibt und dann berichtet, lässt ihm
 * keine Wahl.
 *
 * `aufFortschritt` bekommt die bisher gelesenen Zeichen. Bei 300 Megabyte
 * dauert das eine Weile, und eine Anzeige ohne Bewegung sieht nach zwanzig
 * Sekunden aus wie eine hängende App.
 */
export async function healthDateiLesen(datei, { aufFortschritt } = {}) {
  const sammler = healthSammler();
  let gelesen = 0;

  // Über `getReader` und nicht `for await`: Safari kann einen Datenstrom
  // nicht per Schleife durchlaufen und wirft "undefined is not a function".
  // Chrome und Node können es, deshalb fiel das in keinem Test auf.
  const leser = (await stromFuer(datei)).getReader();
  while (true) {
    const { done, value } = await leser.read();
    if (done) break;
    sammler.fuettern(value);
    gelesen += value.length;
    aufFortschritt?.(gelesen);
  }
  return sammler.ergebnis();
}

/**
 * Nimmt ZIP und XML entgegen.
 *
 * Beides, weil beides vorkommt: manche entpacken das Archiv am Mac und laden
 * die XML direkt, manche schieben das ZIP so, wie es aus der Health App kommt.
 * Unterschieden wird am Inhalt und nicht an der Endung, denn eine Datei aus
 * einem Share Sheet heisst gelegentlich `Archiv.zip.txt`.
 */
async function stromFuer(datei) {
  const anfang = new Uint8Array(await datei.slice(0, 4).arrayBuffer());
  const istZip = anfang[0] === 0x50 && anfang[1] === 0x4b;
  if (!istZip) return datei.stream().pipeThrough(new TextDecoderStream());

  try {
    return await zipDateiText(datei, istExport);
  } catch (fehler) {
    if (!/nicht drin/.test(fehler.message)) throw fehler;
    const namen = await zipNamen(datei);
    throw new Error(
      `In diesem Archiv ist keine export.xml. Drin liegen: ${namen.slice(0, 5).join(", ")}`
      + `${namen.length > 5 ? ` und ${namen.length - 5} weitere` : ""}.`,
    );
  }
}

/**
 * Schreibt die Tageswerte in den Speicher.
 *
 * Was von Hand eingetragen wurde, bleibt stehen. Schritte kommen aus der Uhr
 * und sind dort genauer als jede Schätzung, die überschreibt die App. Ein
 * Gewicht dagegen wird nicht überschrieben: wer sich einträgt und danach eine
 * Waage synchronisiert, hätte sonst plötzlich zwei Wahrheiten, und die des
 * Nutzers verliert.
 */
export function healthSchreiben(ergebnis, { store, heute = new Date().toISOString().slice(0, 10), stempel = "healthImport" }) {
  const grenze = new Date(Date.parse(`${heute}T00:00:00Z`) - MAX_TAGE * 86400000)
    .toISOString().slice(0, 10);

  const bericht = { tage: 0, schritte: 0, schlaf: 0, gewicht: 0, uebersprungen: 0 };

  for (const t of ergebnis.tage) {
    if (t.tag < grenze || t.tag > heute) { bericht.uebersprungen++; continue; }

    const day = store.getDay(t.tag);
    let geaendert = false;

    if (Number.isFinite(t.schritte)) { day.steps = t.schritte; bericht.schritte++; geaendert = true; }

    const gesundheit = { ...(day.gesundheit || {}) };
    for (const feld of ["schlafMinuten", "ruhepuls", "hrv", "aktivKcal"]) {
      if (Number.isFinite(t[feld])) { gesundheit[feld] = t[feld]; geaendert = true; }
    }
    if (Number.isFinite(t.schlafMinuten)) bericht.schlaf++;
    if (Object.keys(gesundheit).length) day.gesundheit = gesundheit;

    if (Number.isFinite(t.gewichtKg) && !Number.isFinite(day.weightKg)) {
      day.weightKg = t.gewichtKg;
      bericht.gewicht++;
      geaendert = true;
    }

    if (geaendert) { store.setDay(t.tag, day); bericht.tage++; }
  }

  // Das Profilgewicht zieht nach, wie bei einer Wiegung im Chat. Grundumsatz,
  // Protein, Fett und Wasserziel rechnen alle dagegen, siehe energy.ts.
  const letztesGewicht = [...ergebnis.tage].reverse()
    .find((t) => Number.isFinite(t.gewichtKg) && t.tag <= heute && t.tag >= grenze);
  if (letztesGewicht) {
    const kg = Math.round(letztesGewicht.gewichtKg * 10) / 10;
    const profil = store.getProfile();
    if (kg >= 30 && kg <= 300 && profil && profil.weightKg !== kg) {
      store.setProfile({ ...profil, weightKg: kg });
      bericht.profilGewicht = kg;
    }
  }

  // Export und Kurzbefehl stempeln getrennt. Wer beides benutzt, soll sehen,
  // wie alt die grosse Kopie ist und wann zuletzt Tageswerte kamen.
  store.setSettings({ ...store.getSettings(), [stempel]: { at: new Date().toISOString(), tage: bericht.tage } });
  return bericht;
}

/**
 * Schreibt die Tage, die ein Kurzbefehl über den Worker geschickt hat.
 *
 * Derselbe Weg wie beim Export, damit beide Quellen nach denselben Regeln in
 * die Tage gehen: Schritte überschreiben, ein selbst eingetragenes Gewicht
 * bleibt stehen. `heute` kommt vom Aufrufer als Ortsdatum. Der Standard oben
 * ist UTC, und kurz nach Mitternacht läge der heutige Tag aus Berlin dann
 * in der Zukunft und würde verworfen.
 */
export function kurzbefehlSchreiben(tage, { store, heute }) {
  const sauber = (Array.isArray(tage) ? tage : [])
    .filter((t) => t && /^\d{4}-\d{2}-\d{2}$/.test(String(t.tag)));
  if (sauber.length === 0) return null;
  return healthSchreiben({ tage: sauber }, { store, heute, stempel: "healthKurzbefehl" });
}

/** Was geschrieben wurde, in Worten. Zahlen, nicht "erfolgreich". */
export function schreibBericht(bericht, ergebnis) {
  const zeilen = [healthBericht(ergebnis), ""];
  zeilen.push(`Übernommen: ${bericht.tage} Tage, davon ${bericht.schritte} mit Schritten, `
    + `${bericht.schlaf} mit Schlaf, ${bericht.gewicht} mit Gewicht.`);
  if (bericht.profilGewicht) zeilen.push(`Profilgewicht auf ${bericht.profilGewicht} kg gesetzt.`);
  if (bericht.uebersprungen) {
    zeilen.push(`${bericht.uebersprungen} Tage liegen ausserhalb der letzten ${MAX_TAGE} Tage und bleiben draussen.`);
  }
  zeilen.push("Ein Gewicht, das du selbst eingetragen hast, bleibt stehen.");
  return zeilen.join("\n");
}
