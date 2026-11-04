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
