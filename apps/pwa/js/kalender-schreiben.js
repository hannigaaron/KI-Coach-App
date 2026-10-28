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
  const alt = aktion === "eintragen" ? null : terminFinden(termine, auftrag, jetzt);
  const vorbild = alt ? null : (auftrag.tag ? einheitAmTag(profile, auftrag.tag) : null) ?? dauerAusProfil(profile);
  const minuten = auftrag.minuten
    ?? (alt ? Math.round((alt.bis - alt.von) / 60000) : (vorbild?.minutes ?? vorbild?.minuten));
  if (!minuten) {
    return `${NICHT_GESPEICHERT} Wie lange soll das Training dauern? Im Profil steht keine Einheit, an der ich mich orientieren kann.`;
  }
  const uebernommen = !auftrag.minuten && !alt ? ` Die Dauer von ${minuten} Minuten ist aus deinem Trainingsplan übernommen.` : "";
  const titel = auftrag.titel || alt?.titel || ART_TITEL[vorbild?.type ?? vorbild?.art] || "Training";

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
    const ab = alt ? Math.max(jetzt, tagBeginn(tagIso(alt.von)) + 86400000)
      : aktion === "verschieben" && auftrag.tag ? Math.max(jetzt, tagBeginn(auftrag.tag) + 86400000)
      : Math.max(jetzt, auftrag.tag ? tagBeginn(auftrag.tag) : jetzt);
    const uhrzeit = auftrag.uhrzeit || (alt ? uhr(alt.von) : vorbild?.startsAt ?? vorbild?.uhrzeit);
    platz = freienPlatzFinden({ termine, profile, wunsch: { minuten, ab, uhrzeit, ...(alt ? { ohneUid: alt.uid } : {}) } });
    if (!platz) return `${NICHT_GESPEICHERT} In den nächsten sieben Tagen finde ich keinen freien Platz für ${minuten} Minuten.`;
  }

  if (aktion === "vorschlagen") return `Frei wäre ${platzText(platz)}.${uebernommen} Soll ich es eintragen?`;
  if (!kannSchreiben()) return `${NICHT_GESPEICHERT} Frei wäre ${platzText(platz)}. ${NUR_IPHONE}`;

  if (alt && aktion === "verschieben") {
    if (!alt.eid || alt.schreibbar === false) {
      return `${NICHT_GESPEICHERT} „${alt.titel}“ liegt in einem Kalender, in den daevo nicht schreiben darf. Frei wäre ${platzText(platz)}.`;
    }
    if (!alt.daevo && auftrag.bestaetigt !== true) {
      return `${NICHT_GESPEICHERT} „${alt.titel}“ hat nicht daevo eingetragen. Soll ich ihn von ${platzText(alt)} auf ${platzText(platz)} verschieben? Sag ja, dann mache ich es.`;
    }
    try {
      await nativAufruf("Kalender", "verschieben", { eid: alt.eid, alt: alt.von, von: platz.von, bis: platz.bis, bestaetigt: auftrag.bestaetigt === true });
    } catch (e) {
      return `${NICHT_GESPEICHERT} Verschieben ging nicht: ${e?.message || e}`;
    }
    merken({ art: "verschoben", eid: alt.eid, titel: alt.titel, vorher: { von: alt.von, bis: alt.bis }, nachher: { von: platz.von, bis: platz.bis } });
    await neuLesen();
    return `Verschoben: „${alt.titel}“ von ${platzText(alt)} auf ${platzText(platz)}. ${RUECKNAHME}`;
  }

  try {
    const r = await nativAufruf("Kalender", "anlegen", { titel, von: platz.von, bis: platz.bis });
    merken({ art: "angelegt", eid: r?.eid || "", titel, nachher: { von: platz.von, bis: platz.bis } });
    await neuLesen();
    return `Eingetragen: „${titel}“ am ${platzText(platz)}${r?.kalender ? ` im Kalender ${r.kalender}` : ""}.${uebernommen} ${RUECKNAHME}`;
  } catch (e) {
    return `${NICHT_GESPEICHERT} Eintragen ging nicht: ${e?.message || e}`;
  }
}

/** Nimmt die letzte Änderung zurück, genau eine. */
export async function zuruecknehmen() {
  const stapel = kalenderAenderungen();
  const letzte = stapel[stapel.length - 1];
  if (!letzte) return `${NICHT_GESPEICHERT} daevo hat noch nichts im Kalender geändert, das ich zurücknehmen könnte.`;
  if (!kannSchreiben()) return `${NICHT_GESPEICHERT} ${NUR_IPHONE}`;
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
  const s = store.getSettings();
  store.setSettings({ ...s, kalenderAenderungen: kalenderAenderungen(s).slice(0, -1) });
  await neuLesen();
  return letzte.art === "angelegt"
    ? `Zurückgenommen: „${letzte.titel}“ am ${platzText(letzte.nachher)} ist wieder aus dem Kalender.`
    : `Zurückgenommen: „${letzte.titel}“ steht wieder am ${platzText(letzte.vorher)}.`;
}
