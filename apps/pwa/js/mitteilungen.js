/**
 * Mitteilungen in der iPhone App, ohne Server.
 *
 * Im Web kam jede Mitteilung vom Worker, weil eine geschlossene Web App sich
 * nicht selbst melden kann. Nativ plant die App sie selbst bei iOS ein,
 * `MitteilungenPlugin.swift`, und iOS stellt sie zu, auch wenn die App zu
 * ist. Damit hängen sie an den Zahlen des Nutzers und nicht an einem Cron
 * für alle: das Runterfahren kommt zu seiner Schlafenszeit, nicht um 21 Uhr.
 *
 * Geplant werden sieben Tage im Voraus und bei jedem Öffnen neu. iOS hält
 * höchstens 64 ausstehende Mitteilungen je App und verwirft den Rest still,
 * deshalb die Obergrenze von 60.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { LUECKE_UHRZEIT, impulseFuerTag, tagesrandFuer } from "@daevo/core";
import { lueckeAusSpeicher } from "./luecke.js";

export const MAX_GEPLANT = 60;
const TAGE_VORAUS = 7;

function tagPlus(tag, n) {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function minuten(uhrzeit) {
  const [h, m] = String(uhrzeit).split(":").map(Number);
  return h * 60 + m;
}

function uhrzeitAus(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Was in den nächsten sieben Tagen kommt, als Liste für das Plugin.
 *
 * `jetzt` ist die lokale Uhrzeit als { tag, uhrzeit }. Was davor liegt, fällt
 * weg: eine Mitteilung von heute Morgen, die abends nachgereicht wird, ist
 * keine Erinnerung mehr, sondern Lärm.
 */
export function mitteilungsPlan({ store, jetzt, luecke = null }) {
  const profil = store.getProfile();
  const aus = store.getSettings().mitteilungenAus || {};
  const plan = [];

  for (let i = 0; i < TAGE_VORAUS; i++) {
    const tag = tagPlus(jetzt.tag, i);
    if (!aus.impulse) {
      for (const impuls of impulseFuerTag(tag)) {
        plan.push({ id: `impuls-${impuls.art}-${tag}`, tag, uhrzeit: impuls.at, titel: impuls.titel, text: impuls.text, art: impuls.art });
      }
    }
    if (!aus.runterfahren && profil) {
      // Dieselbe Zeit wie im Erinnerungsplan, siehe reminders.ts: 45 Minuten
      // vor der Schlafenszeit dieses Tages, mit Wochentag und Ausnahmen.
      const { sleepTime } = tagesrandFuer(profil, tag);
      plan.push({
        id: `runterfahren-${tag}`,
        tag,
        uhrzeit: uhrzeitAus(minuten(sleepTime) - 45),
        titel: "Runterfahren",
        text: "Handy weg. Dein Schlaf entscheidet über die Energie von morgen.",
        art: "runterfahren",
      });
    }
  }

  if (luecke) {
    const tag = minuten(jetzt.uhrzeit) < minuten(LUECKE_UHRZEIT) ? jetzt.tag : tagPlus(jetzt.tag, 1);
    plan.push({ id: `luecke-${tag}`, tag, uhrzeit: LUECKE_UHRZEIT, titel: luecke.titel, text: luecke.text, art: "luecke", kategorie: "luecke" });
  }

  return plan
    .filter((m) => m.tag > jetzt.tag || minuten(m.uhrzeit) > minuten(jetzt.uhrzeit))
    .sort((a, b) => `${a.tag} ${a.uhrzeit}`.localeCompare(`${b.tag} ${b.uhrzeit}`))
    // Die Lücke geht vor, wenn gekürzt werden muss: sie ist die einzige
    // Mitteilung, die etwas über diesen Nutzer sagt.
    .sort((a, b) => (b.art === "luecke") - (a.art === "luecke"))
    .slice(0, MAX_GEPLANT)
    .sort((a, b) => `${a.tag} ${a.uhrzeit}`.localeCompare(`${b.tag} ${b.uhrzeit}`));
}

/**
 * Die Lücke für den Plan. Einmal gefunden, bleibt sie im Plan, bis ihr Tag
 * vorbei ist oder wieder trainiert wurde. Ohne das fiele sie beim nächsten
 * Öffnen am selben Tag heraus, denn dann gilt sie als schon gefragt.
 */
export function lueckeFuerPlan(store, heute) {
  const neu = lueckeAusSpeicher(store, heute);
  if (neu) {
    store.setSettings({ ...store.getSettings(), lueckeGefragt: heute, lueckeGeplant: { tag: heute, titel: neu.titel, text: neu.text } });
    return neu;
  }
  const geplant = store.getSettings().lueckeGeplant;
  if (!geplant || geplant.tag < tagPlus(heute, -1)) return null;
  // Seit dem Planen trainiert? Dann ist die Frage erledigt.
  for (let t = geplant.tag; t <= heute; t = tagPlus(t, 1)) {
    if ((store.getDay(t).trainings || []).length) return null;
  }
  return geplant;
}

/** Plant alles neu bei iOS. Gibt die Zahl der geplanten Mitteilungen zurück. */
export async function mitteilungenPlanen({ aufruf, store, jetzt }) {
  const settings = store.getSettings();
  if (!settings.mitteilungenGefragt) {
    const { erlaubt } = await aufruf("Mitteilungen", "berechtigen");
    store.setSettings({ ...store.getSettings(), mitteilungenGefragt: true, mitteilungenErlaubt: Boolean(erlaubt) });
  }
  const plan = mitteilungsPlan({ store, jetzt, luecke: lueckeFuerPlan(store, jetzt.tag) });
  await aufruf("Mitteilungen", "planen", { eintraege: plan });
  return plan.length;
}
