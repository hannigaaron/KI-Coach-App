/**
 * Ein Training von der Uhr, das daevo nicht geplant hatte.
 *
 * Wer mit der Apple Watch trainiert, sagt es daevo nicht noch einmal. Vorher
 * stand das Training still im Tag, und der Kalender zeigte weiter das
 * Krafttraining um 18 Uhr, obwohl es um 16 Uhr schon erledigt war. Jetzt
 * meldet sich daevo, lobt, trägt es in den Kalender, falls dort noch nichts
 * steht, und fragt, ob ein noch geplantes Training damit vorgezogen war.
 *
 * Gefragt und nicht gestrichen: zweimal am Tag zu trainieren ist bei diesem
 * Nutzer normal, Kraft am Nachmittag und Volleyball am Abend. Ein Plan, der
 * still verschwindet, ist schlimmer als eine Frage.
 *
 * Ohne `document` und `window`, damit es ohne Browser testbar ist.
 */
import { bereichVon } from "@daevo/core";

export const ART_NAME = { strength: "Krafttraining", team_sport: "Mannschaftstraining", cardio: "Ausdauertraining", mobility: "Mobility" };

const minutenVon = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const tagBeginn = (iso) => new Date(`${iso}T00:00:00`).getTime();

/**
 * Was heute nach diesem Training noch als Training geplant ist: aus dem
 * Kalender, was das Balance Board als Fitness liest oder daevo eingetragen
 * hat, und aus dem Profil die Einheiten des Wochentags. Ein Termin im
 * Kalender schlägt das Profil zur selben Zeit.
 */
export function nochGeplant({ heute, abMinute, profil = {}, termine = [] }) {
  const beginn = tagBeginn(heute);
  const ausKalender = termine
    .filter((t) => t.von >= beginn && t.von < beginn + 86400000)
    .filter((t) => t.daevo || bereichVon(String(t.titel || "")) === "fitness")
    .map((t) => ({ um: Math.round((t.von - beginn) / 60000), titel: String(t.titel || "Training"), eid: t.eid, von: t.von }))
    .filter((t) => t.um >= abMinute);
  const wochentag = new Date(`${heute}T12:00:00`).getDay();
  const ausProfil = (profil.sessions || [])
    .filter((s) => s.weekday === wochentag)
    .map((s) => ({ um: minutenVon(s.startsAt), titel: ART_NAME[s.type] || "Training", art: s.type }))
    .filter((s) => s.um !== null && s.um >= abMinute)
    .filter((s) => !ausKalender.some((k) => Math.abs(k.um - s.um) <= 60));
  return [...ausKalender, ...ausProfil].sort((a, b) => a.um - b.um);
}

/**
 * Die Nachricht zu neuen Trainings aus Health, oder null.
 *
 * Nur Trainings von heute, die noch nicht gemeldet wurden. Ein Training von
 * gestern zu loben, das beim ersten Abgleich nach Wochen auftaucht, wäre
 * Lärm.
 */
export function trainingErkannt({ neue = [], heute, profil = {}, termine = [], gemeldet = [] }) {
  const frisch = neue.filter((w) => w?.tag === heute && !gemeldet.includes(String(w.id)));
  if (!frisch.length) return null;
  const letztes = frisch.reduce((a, b) => ((minutenVon(b.uhrzeit) ?? 0) >= (minutenVon(a.uhrzeit) ?? 0) ? b : a));
  const start = minutenVon(letztes.uhrzeit) ?? 0;
  const ende = start + Math.round(Number(letztes.minuten) || 0);
  const name = ART_NAME[letztes.art] || "Training";
  const teile = [
    `Mega stark, dass du heute schon trainiert hast: ${Math.round(letztes.minuten)} Minuten ${name}${letztes.uhrzeit ? ` um ${letztes.uhrzeit}` : ""}. Ich hab es eingetragen.`,
  ];
  // Gleiche Art in den nächsten Stunden ist die Frage wert. Ein Volleyball am
  // Abend nach Kraft am Nachmittag ist ein zweites Training und kein
  // vorgezogenes, darüber muss niemand reden.
  const geplant = nochGeplant({ heute, abMinute: ende, profil, termine })
    .filter((g) => !g.art || g.art === letztes.art);
  const naechstes = geplant[0] ?? null;
  if (naechstes) {
    teile.push(`Für heute steht noch ${naechstes.titel} um ${hhmm(naechstes.um)} im Plan. Hast du das vorgezogen, oder trainierst du heute zweimal?`);
  }
  return { text: teile.join(" "), ids: frisch.map((w) => String(w.id)), training: { ...letztes, ende }, naechstes };
}

/** Wie die Antwort auf die Frage gemeint ist: "vorgezogen", "zweimal" oder null. */
export function antwortAufFrage(text) {
  const t = String(text || "").toLowerCase();
  if (/zweimal|zwei mal|nochmal|noch mal|beides|später noch|spaeter noch|heute abend noch|auch noch/.test(t)) return "zweimal";
  if (/vorgezogen|vorverlegt|früher gemacht|frueher gemacht|statt|stattdessen|ersetzt|reicht|das war('?s)? es|streich|fällt aus|faellt aus|nur einmal|einmal reicht/.test(t)) return "vorgezogen";
  return null;
}
