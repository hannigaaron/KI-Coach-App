/**
 * Aus dem Trainingsprotokoll die Trainings für die Regeneration im Kern:
 * je Tag und Einheit ein Zeitpunkt und die Sätze je Partie.
 *
 * Das Protokoll trägt nur den Tag. Die Uhrzeit kommt aus dem Training im
 * Tag, das beim Beenden mit Beginn und Dauer angelegt wird. Fehlt es, gilt
 * 18 Uhr: ein Training von gestern Abend ist heute früh nicht 36 Stunden her.
 *
 * Kein `document` und kein `window`, damit der Test ohne Browser läuft.
 */
import { saetzeJePartie } from "./muskelkarte.js";

export function regenTrainings(store) {
  const log = Array.isArray(store.getSettings().trainingslog) ? store.getSettings().trainingslog : [];
  const gruppen = new Map();
  for (const e of log) {
    const schluessel = `${e.datum}|${e.einheit ?? ""}`;
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
    gruppen.get(schluessel).push(e);
  }
  const ergebnis = [];
  for (const [schluessel, eintraege] of gruppen) {
    const [datum, einheit] = schluessel.split("|");
    const tag = store.getDay(datum);
    const t = (tag.trainings || []).find((x) => x.type === "strength" && x.note === einheit && x.at)
      ?? (tag.trainings || []).find((x) => x.type === "strength" && x.at);
    let zeit;
    if (t) {
      const [h, m] = t.at.split(":").map(Number);
      zeit = new Date(`${datum}T00:00:00`).getTime() + ((h * 60 + m) + (Number(t.minutes) || 60)) * 60000;
    } else {
      zeit = new Date(`${datum}T18:00:00`).getTime();
    }
    ergebnis.push({ zeit, saetze: saetzeJePartie(eintraege) });
  }
  return ergebnis;
}

/** Das Gefühl je Partie gilt nur am Tag, an dem es gesetzt wurde. */
export function regenGefuehlHeute(settings, heute) {
  const g = settings.regenGefuehl;
  return g && g.datum === heute ? { ...g.werte } : {};
}
