/**
 * Trainings in den echten Kalender schreiben und verschieben.
 *
 * Geschrieben wird über `KalenderPlugin.swift`, also über EventKit. Damit
 * landet ein Termin in iCloud, Google oder Outlook, je nachdem, welcher
 * Kalender auf dem iPhone der Standard ist, und iOS gleicht ihn selbst ab.
 *
 * Drei Regeln, und jede steht auch im Plugin:
 * - Was daevo selbst eingetragen hat, verschiebt es ohne Rückfrage.
 * - Fremde Termine nur mit `bestaetigt`, also nach einem Ja. Ein Kundentermin,
 *   der still wandert, ist ein Fehler bei einem echten Menschen.
 * - Gelöscht wird nur, was daevo angelegt hat.
 *
 * Den freien Platz rechnet `freienPlatzFinden` im Kern, nie das Modell. Jede
 * Änderung kommt auf einen Stapel in `settings.kalenderAenderungen` und
 * lässt sich mit einem Satz zurücknehmen.
 *
 * Kein `document`, kein `window`: das Modul läuft auch in den Tests.
 */
import { foldUmlauts, freienPlatzFinden, platzText } from "@daevo/core";
import { istNativ } from "./konfig.js";
import { store } from "./storage.js";
import { nativAufruf } from "./nativ.js";
import { kalenderAbgleichen } from "./kalender-sync.js";

/** Muss zu NICHT_GESPEICHERT in `packages/coach/src/agent.ts` passen. */
const NICHT_GESPEICHERT = "Noch nicht gespeichert.";
const STAPEL_MAX = 20;
const TRAININGSTITEL = /\b(training|gym|studio|kraft\w*|workout|einheit|volleyball|laufen|joggen|lauf|cardio|mobility)\b/;
const ART_TITEL = { strength: "Krafttraining", team_sport: "Volleyball", cardio: "Ausdauer", mobility: "Mobilität" };

const uhr = (ms) => new Date(ms).toTimeString().slice(0, 5);
const tagIso = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tagBeginn = (iso) => new Date(`${iso}T00:00:00`).getTime();

export function kalenderAenderungen(settings = store.getSettings()) {
  return Array.isArray(settings.kalenderAenderungen) ? settings.kalenderAenderungen : [];
}

let gruppeZaehler = 0;
const gruppeNeu = () => `${Date.now()}-${++gruppeZaehler}`;

function merken(eintrag) {
  const s = store.getSettings();
  const stapel = [...kalenderAenderungen(s), { ...eintrag, am: new Date().toISOString() }].slice(-STAPEL_MAX);
  store.setSettings({ ...s, kalenderAenderungen: stapel });
}

/** Passt der Termin zur Suche? "training" trifft jede Art von Training. */
function passt(termin, suche) {
  const titel = foldUmlauts(String(termin.titel || "").toLowerCase());
  const s = foldUmlauts(String(suche || "training").toLowerCase());
  if (s === "training" || s === "einheit") return TRAININGSTITEL.test(titel);
  return titel.includes(s);
}

/** Der nächste passende Termin, am genannten Tag oder ab heute. */
export function terminFinden(termine, { suche, tag } = {}, jetzt = Date.now()) {
  const kandidaten = termine
    .filter((t) => !t.ganztags && passt(t, suche))
    .filter((t) => (tag ? tagIso(t.von) === tag : t.bis >= jetzt))
    .sort((a, b) => a.von - b.von);
  return kandidaten[0] ?? null;
}

/** Die Einheit aus dem Profil an diesem Tag, wenn sie nicht im Kalender steht. */
function einheitAmTag(profile, tag) {
  const wochentag = new Date(`${tag}T12:00:00`).getDay();
  return (profile.sessions || []).find((s) => s.weekday === wochentag) ?? null;
}

function dauerAusProfil(profile) {
  const kraft = (profile.sessions || []).find((s) => s.type === "strength") ?? (profile.sessions || [])[0];
  return kraft ? { minuten: kraft.minutes, uhrzeit: kraft.startsAt, art: kraft.type } : null;
}

function kannSchreiben() {
  return istNativ() && store.getSettings().appleKalender === true;
}

const NUR_IPHONE = "Eintragen kann ich nur in der iPhone App mit verbundenem Kalender, Menü, Alltag, Kalender.";
const RUECKNAHME = "Sag „mach die Kalenderänderung rückgängig“, dann kommt es zurück.";

async function neuLesen() {
  try { await kalenderAbgleichen({ zwang: true }); } catch { /* der Stand von vorher bleibt */ }
}

/** Gibt einen Satz zurück, wenn nicht verschoben werden darf, sonst null. */
function darfVerschieben(t, auftrag) {
  if (!t.eid || t.schreibbar === false) {
    return `${NICHT_GESPEICHERT} \u201e${t.titel}\u201c liegt in einem Kalender, in den daevo nicht schreiben darf.`;
  }
  if (!t.daevo && auftrag.bestaetigt !== true) {
    return `${NICHT_GESPEICHERT} \u201e${t.titel}\u201c hat nicht daevo eingetragen. Soll ich ihn verschieben? Sag ja, dann mache ich es.`;
  }
  return null;
}

async function verschiebenNativ(t, platz, bestaetigt, gruppe) {
  try {
    await nativAufruf("Kalender", "verschieben", { eid: t.eid, alt: t.von, von: platz.von, bis: platz.bis, bestaetigt });
  } catch (e) {
    return `${NICHT_GESPEICHERT} Verschieben ging nicht: ${e?.message || e}`;
  }
  merken({ art: "verschoben", eid: t.eid, titel: t.titel, vorher: { von: t.von, bis: t.bis }, nachher: { von: platz.von, bis: platz.bis }, gruppe });
  return null;
}

/**
 * "Verschieb den Termin mit Kunde XY auf Freitag 14 Uhr". Das Ziel nennt der
 * Nutzer, also gilt es genau, auch bei einem fremden Termin: die Bitte ist
 * das Ja. Liegt dort ein Training, wandert das Training an den nächsten
 * freien Platz, denn genau das ist die zweite Hälfte dieses Satzes. Ein
 * Training, das daevo eingetragen hat, ohne Rückfrage, ein fremdes nur mit
 * Vorschlag. Liegt dort etwas anderes, wird nichts geschrieben: zwei
 * Kundentermine übereinander legt daevo nicht still an.
 */
async function anGenauesZiel(alt, auftrag, { termine, profile, jetzt }) {
  const dauer = alt.bis - alt.von;
  const tag = auftrag.zielTag || tagIso(alt.von);
  const zeit = auftrag.zielUhrzeit || uhr(alt.von);
  const von = tagBeginn(tag) + (Number(zeit.slice(0, 2)) * 60 + Number(zeit.slice(3, 5))) * 60000;
  const ziel = { tag, von, bis: von + dauer };
  if (von < jetzt) return `${NICHT_GESPEICHERT} ${platzText(ziel)} liegt in der Vergangenheit.`;
  const im = termine.filter((t) => !t.ganztags && t.uid !== alt.uid && t.von < ziel.bis && t.bis > ziel.von);
  const fremd = im.find((t) => !passt(t, "training"));
  if (fremd) {
    return `${NICHT_GESPEICHERT} Um ${zeit} liegt schon \u201e${fremd.titel}\u201c. Soll ich \u201e${alt.titel}\u201c trotzdem dorthin legen oder eine andere Zeit nehmen?`;
  }
  if (!kannSchreiben()) return `${NICHT_GESPEICHERT} ${NUR_IPHONE}`;
  const pruefung = darfVerschieben(alt, auftrag);
  if (pruefung) return pruefung;
  const gruppe = gruppeNeu();
  const fehler = await verschiebenNativ(alt, ziel, auftrag.bestaetigt === true, gruppe);
  if (fehler) return fehler;
  const saetze = [`Verschoben: \u201e${alt.titel}\u201c von ${platzText(alt)} auf ${platzText(ziel)}.`];

  const training = im.find((t) => passt(t, "training"));
  if (training) {
    const belegt = [...termine.filter((t) => t.uid !== alt.uid && t.uid !== training.uid), { ...alt, ...ziel }];
    const platz = freienPlatzFinden({
      termine: belegt, profile,
      wunsch: { minuten: Math.round((training.bis - training.von) / 60000), ab: Math.max(jetzt, tagBeginn(tag)), uhrzeit: uhr(training.von) },
    });
    if (!platz) {
      saetze.push(`Dein \u201e${training.titel}\u201c liegt jetzt darunter, und in den nächsten sieben Tagen finde ich keinen freien Platz dafür.`);
    } else if (training.daevo && training.eid && training.schreibbar !== false) {
      const f = await verschiebenNativ(training, platz, false, gruppe);
      saetze.push(f ? `Dein Training liegt jetzt darunter. ${f}` : `Dein \u201e${training.titel}\u201c lag dort und steht jetzt am ${platzText(platz)}.`);
    } else {
      saetze.push(`Dort lag dein \u201e${training.titel}\u201c. Frei wäre ${platzText(platz)}. Soll ich es dorthin legen?`);
    }
  }
  await neuLesen();
  return `${saetze.join(" ")} ${RUECKNAHME}`;
}

/**
 * Führt einen Auftrag aus `kalenderAuftragAus` oder vom Modell aus. Gibt
 * immer einen Satz zurück. Hat er nichts geschrieben, beginnt er mit
 * NICHT_GESPEICHERT, damit der Coach nicht "eingetragen" sagt.
 */
export async function kalenderTermin(auftrag = {}, { jetzt = Date.now() } = {}) {
  const aktion = auftrag.aktion || "vorschlagen";
  if (aktion === "rueckgaengig") return zuruecknehmen();

  const profile = store.getProfile();
  const termine = store.getKalender().termine || [];
  const alt = aktion === "eintragen" ? null
    : auftrag.eid ? termine.find((t) => t.eid === auftrag.eid && Math.abs(t.von - Number(auftrag.beginn)) < 60000) ?? null
    : terminFinden(termine, auftrag, jetzt);
  if (auftrag.eid && !alt) return `${NICHT_GESPEICHERT} Das Training steht nicht mehr im Kalender.`;
  const vorbild = alt ? null : (auftrag.tag ? einheitAmTag(profile, auftrag.tag) : null) ?? dauerAusProfil(profile);
  const minuten = auftrag.minuten
    ?? (alt ? Math.round((alt.bis - alt.von) / 60000) : (vorbild?.minutes ?? vorbild?.minuten));
  if (!minuten) {
    return `${NICHT_GESPEICHERT} Wie lange soll das Training dauern? Im Profil steht keine Einheit, an der ich mich orientieren kann.`;
  }
  const uebernommen = !auftrag.minuten && !alt ? ` Die Dauer von ${minuten} Minuten ist aus deinem Trainingsplan übernommen.` : "";
  const titel = auftrag.titel || alt?.titel || ART_TITEL[vorbild?.type ?? vorbild?.art] || "Training";

  if (alt && aktion === "verschieben" && (auftrag.zielTag || auftrag.zielUhrzeit)) {
    return anGenauesZiel(alt, auftrag, { termine, profile, jetzt });
  }

  // Fester Wunsch beim Eintragen: genau dort oder gar nicht, statt still
  // eine andere Zeit zu nehmen.
  let platz;
  if (aktion === "eintragen" && auftrag.uhrzeit) {
    const tag = auftrag.tag || tagIso(jetzt);
    const von = tagBeginn(tag) + (Number(auftrag.uhrzeit.slice(0, 2)) * 60 + Number(auftrag.uhrzeit.slice(3, 5))) * 60000;
    const bis = von + minuten * 60000;
    const kollision = termine.find((t) => !t.ganztags && t.von < bis && t.bis > von);
    if (kollision) {
      const frei = freienPlatzFinden({ termine, profile, wunsch: { minuten, ab: tagBeginn(tag), tage: 3, uhrzeit: auftrag.uhrzeit } });
      return `${NICHT_GESPEICHERT} Um ${auftrag.uhrzeit} liegt schon „${kollision.titel}“.`
        + (frei ? ` Frei wäre ${platzText(frei)}. Soll ich es dort eintragen?` : " In den nächsten drei Tagen finde ich keinen freien Platz.");
    }
    platz = { tag, von, bis };
  } else {
    // Wer sagt, dass er es an einem Tag nicht schafft, will einen anderen Tag.
    // Bei einer Überschneidung zählt derselbe Tag noch: das Training soll
    // nur dem neuen Termin ausweichen, nicht ausfallen.
    const ab = alt && auftrag.konflikt ? Math.max(jetzt, tagBeginn(tagIso(alt.von)))
      : alt ? Math.max(jetzt, tagBeginn(tagIso(alt.von)) + 86400000)
      : aktion === "verschieben" && auftrag.tag ? Math.max(jetzt, tagBeginn(auftrag.tag) + 86400000)
      : Math.max(jetzt, auftrag.tag ? tagBeginn(auftrag.tag) : jetzt);
    const uhrzeit = auftrag.uhrzeit || (alt ? uhr(alt.von) : vorbild?.startsAt ?? vorbild?.uhrzeit);
    platz = freienPlatzFinden({ termine, profile, wunsch: { minuten, ab, uhrzeit, ...(alt ? { ohneUid: alt.uid } : {}) } });
    if (!platz) return `${NICHT_GESPEICHERT} In den nächsten sieben Tagen finde ich keinen freien Platz für ${minuten} Minuten.`;
  }

  if (aktion === "vorschlagen") return `Frei wäre ${platzText(platz)}.${uebernommen} Soll ich es eintragen?`;
  if (!kannSchreiben()) return `${NICHT_GESPEICHERT} Frei wäre ${platzText(platz)}. ${NUR_IPHONE}`;

  if (alt && aktion === "verschieben") {
    const pruefung = darfVerschieben(alt, auftrag);
    if (pruefung) return `${pruefung} Frei wäre ${platzText(platz)}.`;
    const fehler = await verschiebenNativ(alt, platz, auftrag.bestaetigt === true, gruppeNeu());
    if (fehler) return fehler;
    await neuLesen();
    return `Verschoben: \u201e${alt.titel}\u201c von ${platzText(alt)} auf ${platzText(platz)}. ${RUECKNAHME}`;
  }

  try {
    const r = await nativAufruf("Kalender", "anlegen", { titel, von: platz.von, bis: platz.bis });
    merken({ art: "angelegt", eid: r?.eid || "", titel, nachher: { von: platz.von, bis: platz.bis }, gruppe: gruppeNeu() });
    await neuLesen();
    return `Eingetragen: „${titel}“ am ${platzText(platz)}${r?.kalender ? ` im Kalender ${r.kalender}` : ""}.${uebernommen} ${RUECKNAHME}`;
  } catch (e) {
    return `${NICHT_GESPEICHERT} Eintragen ging nicht: ${e?.message || e}`;
  }
}

/**
 * Nimmt den letzten Auftrag zurück. Hat er zwei Termine bewegt, etwa den
 * Kunden und das Training dahinter, kommen beide zurück: der Nutzer hat
 * einen Satz gesagt und nimmt einen Satz zurück.
 */
export async function zuruecknehmen() {
  const stapel = kalenderAenderungen();
  const letzte = stapel[stapel.length - 1];
  if (!letzte) return `${NICHT_GESPEICHERT} daevo hat noch nichts im Kalender geändert, das ich zurücknehmen könnte.`;
  if (!kannSchreiben()) return `${NICHT_GESPEICHERT} ${NUR_IPHONE}`;
  const saetze = [];
  let rest = stapel;
  while (rest.length) {
    const e = rest[rest.length - 1];
    if (e !== letzte && (!letzte.gruppe || e.gruppe !== letzte.gruppe)) break;
    const satz = await eineZuruecknehmen(e);
    if (satz.startsWith(NICHT_GESPEICHERT)) { saetze.push(satz); break; }
    saetze.push(satz);
    rest = rest.slice(0, -1);
    const s = store.getSettings();
    store.setSettings({ ...s, kalenderAenderungen: rest });
  }
  await neuLesen();
  return saetze.join(" ");
}

async function eineZuruecknehmen(letzte) {
  try {
    if (letzte.art === "angelegt") {
      await nativAufruf("Kalender", "loeschen", { eid: letzte.eid, alt: letzte.nachher.von });
    } else {
      // Der Nutzer hat beim Verschieben schon ja gesagt, zurück braucht kein zweites.
      await nativAufruf("Kalender", "verschieben", {
        eid: letzte.eid, alt: letzte.nachher.von, von: letzte.vorher.von, bis: letzte.vorher.bis, bestaetigt: true,
      });
    }
  } catch (e) {
    return `${NICHT_GESPEICHERT} Zurücknehmen ging nicht: ${e?.message || e}`;
  }
  return letzte.art === "angelegt"
    ? `Zurückgenommen: „${letzte.titel}“ am ${platzText(letzte.nachher)} ist wieder aus dem Kalender.`
    : `Zurückgenommen: „${letzte.titel}“ steht wieder am ${platzText(letzte.vorher)}.`;
}

/**
 * "Umplanen" aus der Mitteilung der Kalenderwache, `KalenderWache` in
 * `KalenderPlugin.swift`. Erst neu lesen, denn die Mitteilung kann Stunden
 * alt sein und der Störer längst verschoben. Steht das Training nicht mehr
 * im Konflikt, bleibt es, wo es ist.
 */
export async function konfliktUmplanen({ eid, von }, { jetzt = Date.now() } = {}) {
  await neuLesen();
  const termine = store.getKalender().termine || [];
  const training = termine.find((t) => t.eid === eid && Math.abs(t.von - Number(von)) < 60000);
  if (!training) return `${NICHT_GESPEICHERT} Das Training steht nicht mehr im Kalender.`;
  const stoerer = termine.find((t) => t.uid !== training.uid && !t.ganztags && t.von < training.bis && t.bis > training.von);
  if (!stoerer) return `Dein \u201e${training.titel}\u201c überschneidet sich nicht mehr und bleibt am ${platzText(training)}.`;
  return kalenderTermin({ aktion: "verschieben", eid, beginn: training.von, konflikt: true }, { jetzt });
}

/**
 * Eine feste Trainingseinheit im Profil wurde geändert, etwa Montag 17 Uhr
 * auf Dienstag 18 Uhr. Die Termine, die daevo dafür in den nächsten vier
 * Wochen eingetragen hat, wandern mit, jeweils in derselben Woche. Fremde
 * Termine bleiben, wie bei jedem Schreiben ohne Bitte.
 */
export async function einheitImKalenderAnpassen(alt, neu, { jetzt = Date.now() } = {}) {
  if (!kannSchreiben()) return { anzahl: 0, nurIphone: true };
  const termine = store.getKalender().termine || [];
  const ende = jetzt + 28 * 86400000;
  const passend = termine.filter((t) => t.daevo && t.eid && !t.ganztags && t.von >= jetzt && t.von < ende
    && new Date(t.von).getDay() === alt.weekday && uhr(t.von) === alt.startsAt);
  // Montag als Wochenanfang: Sonntag liegt am Ende der Woche, nicht davor.
  const wochenIndex = (tag) => (tag + 6) % 7;
  const gruppe = gruppeNeu();
  let anzahl = 0;
  for (const t of passend) {
    const tag = tagBeginn(tagIso(t.von)) + (wochenIndex(neu.weekday) - wochenIndex(alt.weekday)) * 86400000;
    const [h, m] = neu.startsAt.split(":").map(Number);
    const d = new Date(tag); d.setHours(h, m, 0, 0);
    const von = d.getTime();
    if (von < jetzt) continue;
    const fehler = await verschiebenNativ(t, { von, bis: von + neu.minutes * 60000 }, false, gruppe);
    if (!fehler) anzahl++;
  }
  if (anzahl) await neuLesen();
  return { anzahl };
}
