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
import { LUECKE_UHRZEIT, NACHFRAGE_UHRZEIT, erinnerungAmTag, erinnerungUhrzeit, impulseFuerTag, impulsNoetig, morgenUhrzeit, rueckblickArt, nachfrageNoetig, schlafenszeitAusKalender, tagesrandFuer, wochentagVon } from "@daevo/core";

/**
 * Aufsteh und Schlafenszeit eines Tages für die Mitteilungen. Was der Nutzer
 * in daevo eingetragen hat, gilt zuerst: die Ausnahme für genau diesen Tag,
 * dann die Zeit je Wochentag aus dem Profil. Erst wenn dort für diesen Tag
 * nichts steht, zählt ein Eintrag wie "SLEEP" im Kalender, und danach der
 * Schnitt. Der Betreiber pflegt seine Zeiten je Tag in der App, und ein
 * Kalendereintrag darf sie nicht still überschreiben.
 */
export function randMitKalender(profil, tag, termine = []) {
  const rand = tagesrandFuer(profil, tag);
  if (profil.tagesausnahmen?.[tag]?.sleepTime) return rand;
  const wt = wochentagVon(tag);
  if (profil.randModus === "wochentag" && wt !== null && profil.wochenraender?.[String(wt)]?.sleepTime) return rand;
  const ausKalender = schlafenszeitAusKalender(termine, tag);
  return ausKalender ? { ...rand, sleepTime: ausKalender } : rand;
}
import { lueckeAusSpeicher, lueckeGefragtMerken, trainingsTageAusQuellen } from "./luecke.js";

export const MAX_GEPLANT = 60;

// Eigene Erinnerungen zuerst, dann die zwei, die etwas über diesen Nutzer
// wissen: der Blick auf morgen und die Lücke. Die Impulse sind für alle gleich.
const rang = (m) => (m.art === "eigene" ? 3 : m.art === "vorausblick" || m.art === "rueckblick" ? 2 : m.art === "luecke" ? 1 : 0);
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
export function mitteilungsPlan({ store, jetzt, luecke = null, vorausblicke = [] }) {
  const profil = store.getProfile();
  const aus = store.getSettings().mitteilungenAus || {};
  const plan = [];

  const eigene = store.getSettings().eigeneErinnerungen || [];
  const termine = store.getKalender?.().termine || [];
  for (let i = 0; i < TAGE_VORAUS; i++) {
    const tag = tagPlus(jetzt.tag, i);
    for (const e of eigene) {
      if (!erinnerungAmTag(e, tag)) continue;
      // Ohne Profil gibt es keine Schlafenszeit. Eine Erinnerung, die daran
      // hängt, fällt dann aus, statt auf eine geratene Uhrzeit zu rutschen.
      const rand = profil ? randMitKalender(profil, tag, termine) : null;
      const uhrzeit = e.bezug ? (rand ? erinnerungUhrzeit(e, rand) : null) : e.uhrzeit;
      if (!uhrzeit) continue;
      plan.push({ id: `eigene-${e.id}-${tag}`, tag, uhrzeit, titel: "Erinnerung", text: e.text, art: "eigene" });
    }
    if (!aus.impulse) {
      const lage = i === 0 ? impulsLage(store, tag) : null;
      for (const impuls of impulseFuerTag(tag)) {
        if (lage && !impulsNoetig(impuls.art, lage)) continue;
        // Eine Frage bekommt "Antworten": auf der Uhr und am Sperrbildschirm
        // tippt oder diktiert man die Antwort, ohne die App zu öffnen. Ohne
        // das stand auf der Uhr nur "Schließen" unter der Frage.
        plan.push({ id: `impuls-${impuls.art}-${tag}`, tag, uhrzeit: impuls.at, titel: impuls.titel, text: impuls.text, art: impuls.art, ...(impuls.frage ? { kategorie: "frage" } : {}) });
      }
    }
    if (!aus.morgen && profil) {
      // Eine halbe Stunde nach der Aufstehzeit dieses Tages. Ist der
      // Check-in heute schon gemacht, kommt die Mitteilung nicht.
      const gemacht = i === 0 && (store.getDay(tag).checkins || []).some((c) => c.kind === "morning" && c.morgen);
      // Morgens Fitheit 1 oder 2: mittags fragt daevo nach, ob trainiert wird.
      const heuteMorgen = i === 0 ? (store.getDay(tag).checkins || []).filter((c) => c.kind === "morning" && c.morgen).pop() : null;
      if (heuteMorgen && !heuteMorgen.nachgefragt && nachfrageNoetig(heuteMorgen.morgen)) {
        plan.push({
          id: `nachfrage-${tag}`, tag, uhrzeit: NACHFRAGE_UHRZEIT,
          titel: "Wie geht es dir jetzt?", text: "Heute Morgen ging es dir nicht gut. Davon hängt ab, ob du heute trainierst.", art: "nachfrage",
        });
      }
      if (!gemacht) {
        plan.push({
          id: `morgen-${tag}`, tag, uhrzeit: morgenUhrzeit(tagesrandFuer(profil, tag).wakeTime),
          titel: "Guten Morgen", text: "Wie hast du geschlafen? Vier Fragen, dann plant daevo deinen Tag.", art: "morgen",
        });
      }
    }
    // Mittwoch Zwischenstand, Sonntag Rückblick, eine halbe Stunde nach dem
    // Check-in derselben Tage. Der Text steht nicht in der Mitteilung: sie ist
    // Tage im Voraus geplant, die Zahlen wären beim Ankommen alt. Gerechnet
    // wird beim Antippen.
    const rueckblick = rueckblickArt(tag);
    if (!aus.rueckblick && rueckblick) {
      plan.push({
        id: `rueckblick-${tag}`, tag, uhrzeit: rueckblick === "woche" ? "20:00" : "18:30",
        titel: rueckblick === "woche" ? "Dein Wochenrückblick" : "Zwischenstand zur Wochenmitte",
        text: rueckblick === "woche" ? "Wie lief deine Woche? Zahlen, was gut lief, was besser geht und dein Fokus für nächste Woche."
          : "Montag bis heute: was läuft, was fehlt und worauf du bis Sonntag achtest.",
        art: "rueckblick",
      });
    }
    if (!aus.runterfahren && profil) {
      // Dieselbe Zeit wie im Erinnerungsplan, siehe reminders.ts: 45 Minuten
      // vor der Schlafenszeit dieses Tages, mit Wochentag und Ausnahmen.
      const { sleepTime } = randMitKalender(profil, tag, termine);
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

  // Am Abend vor einem Tag, an dem etwas vorzubereiten ist: vorkochen,
  // Training verlegen, früh los. Der Text kommt aus `vorausblick` im Kern,
  // gerechnet aus Kalender und Profil.
  if (!aus.vorausblick) {
    for (const v of vorausblicke) {
      plan.push({ id: `voraus-${v.tag}`, tag: v.tag, uhrzeit: v.uhrzeit, titel: v.titel, text: v.text, art: "vorausblick", kategorie: "frage" });
    }
  }

  if (luecke) {
    const tag = minuten(jetzt.uhrzeit) < minuten(LUECKE_UHRZEIT) ? jetzt.tag : tagPlus(jetzt.tag, 1);
    plan.push({ id: `luecke-${tag}`, tag, uhrzeit: LUECKE_UHRZEIT, titel: luecke.titel, text: luecke.text, art: "luecke", kategorie: "luecke" });
  }

  return plan
    .filter((m) => m.tag > jetzt.tag || minuten(m.uhrzeit) > minuten(jetzt.uhrzeit))
    .sort((a, b) => `${a.tag} ${a.uhrzeit}`.localeCompare(`${b.tag} ${b.uhrzeit}`))
    // Wenn gekürzt werden muss, gehen eigene Erinnerungen vor, dann die
    // Lücke. Eine vergessene Tablette wiegt schwerer als ein Trinkimpuls,
    // und die Lücke ist die einzige Mitteilung, die etwas über diesen
    // Nutzer sagt.
    .sort((a, b) => rang(b) - rang(a))
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
    lueckeGefragtMerken(store, heute);
    store.setSettings({ ...store.getSettings(), lueckeGeplant: { tag: heute, titel: neu.titel, text: neu.text } });
    return neu;
  }
  const geplant = store.getSettings().lueckeGeplant;
  if (!geplant || geplant.tag < tagPlus(heute, -1)) return null;
  // Seit dem Planen trainiert, in der App, in Health oder im Kalender? Dann
  // ist die Frage erledigt.
  const weitere = new Set(trainingsTageAusQuellen(store, heute));
  for (let t = geplant.tag; t <= heute; t = tagPlus(t, 1)) {
    if ((store.getDay(t).trainings || []).length || weitere.has(t)) return null;
  }
  return geplant;
}

/** Was heute schon eingetragen ist, für `impulsNoetig`. */
export function impulsLage(store, tag) {
  const d = store.getDay(tag);
  const beantwortet = store.getSettings().impulsBeantwortet || {};
  return {
    mahlzeiten: (d.meals || []).filter((m) => (m.entries || []).length).map((m) => String(m.at || "")),
    wasserMl: Number(d.waterMl) || 0,
    checkins: (d.checkins || []).map((c) => c.kind),
    beantwortet: Object.keys(beantwortet).filter((art) => beantwortet[art] === tag),
  };
}

/** Plant alles neu bei iOS. Gibt die Zahl der geplanten Mitteilungen zurück. */
export async function mitteilungenPlanen({ aufruf, store, jetzt, vorausblicke = [] }) {
  const settings = store.getSettings();
  if (!settings.mitteilungenGefragt) {
    const { erlaubt } = await aufruf("Mitteilungen", "berechtigen");
    store.setSettings({ ...store.getSettings(), mitteilungenGefragt: true, mitteilungenErlaubt: Boolean(erlaubt) });
  }
  const plan = mitteilungsPlan({ store, jetzt, luecke: lueckeFuerPlan(store, jetzt.tag), vorausblicke });
  await aufruf("Mitteilungen", "planen", { eintraege: plan });
  return plan.length;
}
