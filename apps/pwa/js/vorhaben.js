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

/**
 * Welche Einheit als Nächstes dran ist: die nach der zuletzt trainierten
 * Einheit dieses Plans, über den Titel im Protokoll. Der Wochentag sagt bei
 * wechselnden Arbeitszeiten nichts. Ohne Training aus dem Plan die erste.
 */
export function naechsteEinheit(plan, log) {
  const titel = (plan?.einheiten || []).map((e) => e.titel);
  if (!titel.length) return 0;
  const letzte = [...(Array.isArray(log) ? log : [])]
    .filter((e) => titel.includes(e.einheit))
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
    .pop();
  return letzte ? (titel.indexOf(letzte.einheit) + 1) % titel.length : 0;
}

const tagPlus = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const wochentagVon = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/**
 * Die Einheit des gültigen Plans für einen Tag, für Morgen Check-in,
 * Briefing und Coach. Dieselbe Reihenfolge wie "Als Nächstes" unter Mein
 * Plan: vorher zählten diese Stellen die Krafttage der Woche ab Montag,
 * und nach einer verschobenen Einheit nannte das Briefing eine andere als
 * der Plan. Heute ist die Einheit nach dem letzten Training vor heute. Für
 * spätere Tage rückt sie je Krafttag im Profil dazwischen eins weiter. Wer
 * heute schon trainiert hat, dessen Training steht bereits im Protokoll.
 */
export function planEinheitFuer(settings, profile, tag, heute) {
  const plan = aktiverPlan(settings, tag);
  if (!plan?.einheiten?.length) return null;
  const log = Array.isArray(settings?.trainingslog) ? settings.trainingslog : [];
  if (tag <= heute) return plan.einheiten[naechsteEinheit(plan, log.filter((e) => e.datum < tag))] ?? null;
  const kraftTage = new Set((profile?.sessions || []).filter((s) => s.type === "strength").map((s) => s.weekday));
  const titel = plan.einheiten.map((e) => e.titel);
  const heuteGemacht = log.some((e) => e.datum === heute && titel.includes(e.einheit));
  let schritte = 0;
  for (let d = heuteGemacht ? tagPlus(heute, 1) : heute; d < tag; d = tagPlus(d, 1)) if (kraftTage.has(wochentagVon(d))) schritte++;
  return plan.einheiten[(naechsteEinheit(plan, log.filter((e) => e.datum <= heute)) + schritte) % plan.einheiten.length] ?? null;
}
