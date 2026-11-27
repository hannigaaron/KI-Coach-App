/**
 * Das Profil als Einstellungsliste. Vorher stand jeder Abschnitt
 * untereinander auf einer Seite von drei Bildschirmhöhen, und wer die
 * Stimme ändern wollte, scrollte an Gewicht, Tagesablauf und Training
 * vorbei. Jetzt steht oben eine Zeile je Abschnitt mit dem, was eingestellt
 * ist, und ein Tipp öffnet nur diesen Abschnitt.
 *
 * Die Abschnitte bleiben im HTML, wie sie sind. `gruppieren` fasst sie beim
 * ersten Öffnen zusammen: ein neuer Teil beginnt an jeder Überschrift
 * `h2.abschnitt` oder an einem Block, der mit einer beginnt. Ist die
 * Überschrift versteckt, etwa für den Betreiber, hängt ihr Inhalt am Teil
 * davor. So bleibt jedes Feld in beiden Fassungen erreichbar.
 *
 * `profilZeilen` und `uebersichtHtml` fassen weder `document` noch
 * `window` an, getestet in `profil-ansicht.test.js`.
 */
import { symbol } from "./symbole.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Titel, Gruppe, Zeichen und Farbe je Abschnitt. Unbekanntes landet unter App. */
export const PROFIL_TEILE = [
  { titel: "Körper und Ziel", schluessel: "koerper", gruppe: "du", sym: "waage", ton: "var(--makro-protein)" },
  { titel: "Dein Tagesablauf", schluessel: "tagesablauf", gruppe: "du", sym: "uhr", ton: "var(--brand)", anzeige: "Tagesablauf" },
  { titel: "Training", schluessel: "training", gruppe: "du", sym: "hantel", ton: "var(--makro-kohlenhydrate, #b6a0e9)" },
  { titel: "Gedächtnis", schluessel: "gedaechtnis", gruppe: "du", sym: "idee", ton: "var(--makro-fett, #e58aa8)" },
  { titel: "Wie daevo mit dir reden soll", schluessel: "anweisungen", gruppe: "du", sym: "sprechblase", ton: "#7fb7ff", anzeige: "Eigene Anweisungen" },
  { titel: "Benachrichtigungen", schluessel: "mitteilungen", gruppe: "app", sym: "ring", ton: "#e8b75a" },
  { titel: "Stimme", schluessel: "stimme", gruppe: "app", sym: "mikrofon", ton: "#4cc3d9" },
  { titel: "Sprache", schluessel: "sprache", gruppe: "app", sym: "welle", ton: "#4cc3d9", anzeige: "Vorlesen und Freihand" },
  { titel: "Freihändig ansprechen", schluessel: "freihand", gruppe: "app", sym: "mikrofon", ton: "#4cc3d9" },
  { titel: "Wie daevo denkt", schluessel: "denken", gruppe: "app", sym: "idee", ton: "var(--brand)" },
  { titel: "Den echten Coach freischalten", schluessel: "schluessel", gruppe: "app", sym: "schloss", ton: "var(--brand)", anzeige: "KI Schlüssel" },
  { titel: "Was daevo kostet", schluessel: "kosten", gruppe: "app", sym: "verlauf", ton: "#9aa3b2" },
  { titel: "Dein Konto", schluessel: "konto", gruppe: "app", sym: "person", ton: "#9aa3b2", anzeige: "Konto und Abo" },
  { titel: "Dein Coaching Angebot", schluessel: "angebot", gruppe: "app", sym: "tasche", ton: "#9aa3b2" },
  { titel: "Aussehen", schluessel: "aussehen", gruppe: "app", sym: "sonne", ton: "#9aa3b2" },
  { titel: "Einführung", schluessel: "einfuehrung", gruppe: "app", sym: "liste", ton: "#9aa3b2" },
  { titel: "Sicherung", schluessel: "sicherung", gruppe: "daten", sym: "dokument", ton: "#9aa3b2" },
  { titel: "Datenschutz", schluessel: "datenschutz", gruppe: "daten", sym: "schild", ton: "#9aa3b2" },
  { titel: "Daten", schluessel: "daten", gruppe: "daten", sym: "kiste", ton: "#e5534b", anzeige: "Konto löschen" },
];

const GRUPPEN = [["du", "Du"], ["app", "App"], ["daten", "Deine Daten"]];

/** Der Eintrag zu einem Titel, sonst ein schlichter unter App. */
export function teilFuer(titel, i = 0) {
  return PROFIL_TEILE.find((t) => t.titel === titel)
    ?? { titel, schluessel: `teil${i}`, gruppe: "app", sym: "regler", ton: "#9aa3b2" };
}

/**
 * Die Zeilen der Übersicht. `teile` ist [{ titel, schluessel? }] in der
 * Reihenfolge der Seite, `unter` gibt je Schlüssel die zweite Zeile.
 */
export function profilZeilen(teile, unter = {}) {
  return teile.map((t, i) => {
    const info = t.schluessel ? { ...teilFuer(t.titel, i), schluessel: t.schluessel } : teilFuer(t.titel, i);
    return { ...info, name: info.anzeige ?? info.titel, unter: unter[info.schluessel] ?? "" };
  });
}

export function uebersichtHtml(zeilen) {
  return GRUPPEN.map(([id, name]) => {
    // Die Reihenfolge der Liste oben, nicht die der Seite: auf der Seite
    // steht Training weit unten, in der Übersicht gehört es zu dir.
    const rang = (r) => { const i = PROFIL_TEILE.findIndex((t) => t.schluessel === r.schluessel); return i < 0 ? 99 : i; };
    const z = zeilen.filter((r) => r.gruppe === id).sort((a, b) => rang(a) - rang(b));
    if (!z.length) return "";
    return `<h2 class="section-title pf-gruppe">${esc(name)}</h2><div class="pf-liste">${z.map((r) =>
      `<button type="button" class="pf-zeile" data-pf-oeffnen="${esc(r.schluessel)}">`
      + `<span class="pf-sym" style="--ton:${esc(r.ton)}">${symbol(r.sym, { groesse: 20 })}</span>`
      + `<span class="pf-text"><b>${esc(r.name)}</b>${r.unter ? `<small>${esc(r.unter)}</small>` : ""}</span>`
      + `<span class="chev-re" aria-hidden="true"></span></button>`).join("")}</div>`;
  }).join("");
}

const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const ZIEL = { maintain: "Gewicht halten", fat_loss: "Fett verlieren", lean_bulk: "Muskeln aufbauen" };

/** Die zweite Zeile je Abschnitt aus dem Profil. Fehlt etwas, bleibt sie leer. */
export function profilUnter(profil, extra = {}) {
  if (!profil) return { ...extra };
  const zahl = (n) => Number(n).toLocaleString("de-DE");
  const koerper = [profil.weightKg ? `${String(profil.weightKg).replace(".", ",")} kg` : "", ZIEL[profil.goal] ?? "", profil.dailySteps ? `${zahl(profil.dailySteps)} Schritte` : ""].filter(Boolean).join(" · ");
  const ez = profil.essenszeiten ?? {};
  const essen = [ez.mittag, ez.abend].filter(Boolean);
  const tag = [profil.wakeTime && profil.sleepTime ? `${profil.wakeTime} bis ${profil.sleepTime}` : "", essen.length ? `Essen ${essen.join(" und ")}` : ""].filter(Boolean).join(" · ");
  // Gleiche Uhrzeit an mehreren Tagen zusammen: "Mo, Mi 18:00 · Sa 18:00".
  const nachZeit = new Map();
  for (const s of [...(profil.sessions ?? [])].sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7))) {
    const k = s.startsAt ?? "";
    nachZeit.set(k, [...(nachZeit.get(k) ?? []), WT[s.weekday]]);
  }
  const training = nachZeit.size ? [...nachZeit].map(([zeit, tage]) => `${tage.join(", ")}${zeit ? ` ${zeit}` : ""}`).join(" · ") : "Noch keine festen Tage";
  return { koerper, tagesablauf: tag, training, gedaechtnis: "Was daevo über dich weiß", ...extra };
}

/**
 * Fasst die Kinder von `wurzel` ab `ab` zu Teilen zusammen. Gibt die Teile
 * mit Titel und Schlüssel zurück. Läuft einmal, danach liegen die Teile als
 * `.pf-teil` in der Seite.
 */
export function gruppieren(wurzel, ab) {
  const kinder = [...wurzel.children].slice([...wurzel.children].indexOf(ab) + 1);
  const teile = [];
  let aktuell = null;
  const ueberschrift = (el) => (el.matches?.("h2.abschnitt") ? el : el.firstElementChild?.matches?.("h2.abschnitt") ? el.firstElementChild : null);
  for (const el of kinder) {
    const h = ueberschrift(el);
    const sichtbar = h && !h.hidden && !el.hidden;
    if (h && (sichtbar || !aktuell)) {
      aktuell = document.createElement("div");
      aktuell.className = "pf-teil";
      const info = teilFuer(h.textContent.trim(), teile.length);
      aktuell.dataset.pfTeil = info.schluessel;
      teile.push({ titel: h.textContent.trim(), schluessel: info.schluessel, sichtbar });
      el.before(aktuell);
    }
    if (aktuell) aktuell.append(el);
  }
  return teile.filter((t) => t.sichtbar);
}
