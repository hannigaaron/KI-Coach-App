/**
 * Die Trainingslücke, auf Seite der App.
 *
 * Drei Aufgaben, die zusammengehören und deshalb in einer Datei stehen:
 * die Lücke erkennen, den Worker mit der Nachricht beauftragen, und die
 * Antwort einsammeln, die der Nutzer direkt in der Benachrichtigung gegeben
 * hat.
 *
 * Warum der Umweg über den Worker: eine geschlossene App kann sich nicht
 * selbst benachrichtigen. Das Web gibt einer Seite dafür nichts, und
 * `showTrigger` hat es nie über einen Versuch hinaus geschafft. Der einzige
 * Weg zu einer geschlossenen App ist Push, und Push kommt von aussen.
 *
 * Diese Datei fasst weder `document` noch `window` an. Sie ist damit ohne
 * Browser testbar, wie storage.js und assistant.js auch.
 */

import { LUECKEN_ANTWORTEN, LUECKE_UHRZEIT, trainingslueckeFinden } from "@daevo/core";

/** Derselbe Name wie im Service Worker. Wer ihn hier ändert, bricht beides. */
export const ANTWORT_CACHE = "daevo-antworten";

/**
 * Wann die Frage rausgeht, als Zeitpunkt.
 *
 * Heute um 18:00, und wenn das vorbei ist, morgen um 18:00. Abends, weil die
 * Frage "was ist dazwischen gekommen" erst dann beantwortbar ist. Wer sie
 * morgens bekommt, hat den Tag noch vor sich und keine Antwort.
 */
export function naechsterZeitpunkt(jetzt = new Date()) {
  const [stunde, minute] = LUECKE_UHRZEIT.split(":").map(Number);
  const ziel = new Date(jetzt);
  ziel.setHours(stunde, minute, 0, 0);
  if (ziel.getTime() <= jetzt.getTime()) ziel.setDate(ziel.getDate() + 1);
  return ziel.getTime();
}

/**
 * Sucht die Lücke in den gespeicherten Tagen.
 *
 * Der Rückblick geht über die Tage, die wirklich im Speicher stehen. Ein
 * leerer Tag ist ein Tag ohne Training, und einer, der gar nicht existiert,
 * auch. Die Unterscheidung wäre hier ohne Wert.
 */
export function lueckeAusSpeicher(store, heute = new Date().toISOString().slice(0, 10)) {
  const tage = {};
  for (const tag of store.allDays()) tage[tag] = store.getDay(tag);
  const profil = store.getProfile();
  const einstellungen = store.getSettings();
  return trainingslueckeFinden({
    tage,
    heute,
    geplanteEinheiten: Array.isArray(profil?.sessions) ? profil.sessions.length : 0,
    zuletztGefragt: einstellungen?.lueckeGefragt ?? null,
  });
}

/**
 * Beauftragt den Worker mit der Frage.
 *
 * Mitgeschickt wird die Anzahl Tage, nicht der Text. Den baut der Worker
 * selbst, siehe workers/push/src/auftrag.ts. Das Gerät kann damit keinen
 * eigenen Text auf einen Sperrbildschirm legen, auch nicht auf den eigenen.
 *
 * Gemerkt wird der Tag der Frage erst, wenn der Worker sie angenommen hat.
 * Wer ihn vorher setzt, verliert die Frage bei jedem Netzfehler still und
 * fragt drei Tage lang nicht mehr.
 */
export async function lueckeMelden({ store, worker, endpoint, luecke, jetzt = new Date(), holen = fetch }) {
  if (!luecke || !worker || !endpoint) return null;

  const antwort = await holen(`${String(worker).replace(/\/+$/, "")}/auftrag`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      endpoint,
      art: "trainingsluecke",
      at: naechsterZeitpunkt(jetzt),
      tageOhne: luecke.tageOhne,
      geplanteEinheiten: store.getProfile()?.sessions?.length ?? 0,
    }),
  });
  if (!antwort.ok) {
    const grund = await antwort.json().catch(() => ({}));
    throw new Error(grund.fehler || `Der Worker hat mit ${antwort.status} geantwortet.`);
  }

  store.setSettings({ ...store.getSettings(), lueckeGefragt: jetzt.toISOString().slice(0, 10) });
  return luecke;
}

/**
 * Holt die Antworten ab, die im Service Worker abgelegt wurden.
 *
 * Gelesen und gelöscht in einem Durchgang. Eine Antwort, die liegen bleibt,
 * wird beim nächsten Öffnen ein zweites Mal verarbeitet, und dann steht
 * derselbe Grund zweimal im Gedächtnis.
 */
export async function antwortenAbholen(cacheSpeicher = globalThis.caches) {
  if (!cacheSpeicher?.open) return [];
  let cache;
  try {
    cache = await cacheSpeicher.open(ANTWORT_CACHE);
  } catch {
    return [];
  }
  const raus = [];
  for (const anfrage of await cache.keys()) {
    const treffer = await cache.match(anfrage);
    if (treffer) {
      try {
        raus.push(await treffer.json());
      } catch {
        // Ein kaputter Eintrag wird weggeräumt statt übersprungen. Sonst
        // bleibt er für immer liegen.
      }
    }
    await cache.delete(anfrage);
  }
  return raus.sort((a, b) => (a.at || 0) - (b.at || 0));
}

/**
 * Schreibt eine Antwort in das Gedächtnis.
 *
 * Kategorie `muster`, nicht `fakt`. "Keine Zeit gehabt" ist wiederkehrendes
 * Verhalten und keine Tatsache, die gilt. Wichtigkeit 4, damit der Coach es
 * bei der nächsten Planung findet: ein Grund, der dreimal auftaucht, ist die
 * eigentliche Information.
 *
 * Gibt den Satz zurück, den die App anzeigt, oder null bei einer Antwort,
 * die es nicht gibt.
 */
export function antwortVerarbeiten(eintrag, { store, brain }) {
  const wahl = LUECKEN_ANTWORTEN.find((a) => a.id === eintrag?.aktion);
  if (!wahl) return null;

  const datum = new Date(eintrag.at || Date.now()).toISOString().slice(0, 10);
  const text = `Training ausgefallen am ${datum}: ${wahl.satz}`;
  brain.add({ text, art: "muster", wichtigkeit: 4, schlagworte: ["training", "luecke"], quelle: "nutzer" });

  // Die Frage ist beantwortet, also wird der Zähler zurückgesetzt. Sonst
  // fragt die App drei Tage lang nicht, obwohl der Grund schon dasteht und
  // eine Reaktion darauf gerade jetzt etwas bringen würde.
  store.setSettings({ ...store.getSettings(), lueckeAntwort: { id: wahl.id, at: eintrag.at || Date.now() } });
  return wahl.satz;
}
