/**
 * Die Einheit, die der Coach für einen bestimmten Tag gerechnet hat.
 *
 * Für heute steht sie in `settings.heuteTraining`. Sagt jemand am Abend
 * "morgen um 14 Uhr Pull", gehört die Einheit dem nächsten Tag und darf
 * die von heute nicht überschreiben. Sie liegt dann nur im Verlauf, mit
 * `geplant` und der Uhrzeit, und wird an ihrem Tag hier gefunden.
 *
 * Kein `document`, kein `window`: läuft auch in den Tests.
 */
export function bestellteEinheit(settings, tag) {
  const s = settings || {};
  if (s.heuteTraining?.tag === tag && s.heuteTraining.einheit) return s.heuteTraining;
  const verlauf = Array.isArray(s.heuteVerlauf) ? s.heuteVerlauf : [];
  return [...verlauf].reverse().find((v) => v.tag === tag && v.geplant && v.einheit) ?? null;
}

/**
 * Ob diese Woche der Kurzplan gilt. Gesetzt unter Trainingsplan mit "Diese
 * Woche nutzen", gilt bis Sonntag und fällt danach von selbst weg: wer es
 * vergisst zurückzustellen, soll nicht wochenlang kurz trainieren.
 */
export function kurzwocheAktiv(settings, heute) {
  const w = settings?.planWoche;
  return Boolean(w?.art === "kurz" && w.bis && String(heute) <= String(w.bis) && settings?.planKurz?.einheiten?.length);
}

/** Der Plan, der diese Woche gilt: der Kurzplan in einer stressigen Woche, sonst der normale. */
export function aktiverPlan(settings, heute) {
  return kurzwocheAktiv(settings, heute) ? settings.planKurz : settings?.plan ?? null;
}
