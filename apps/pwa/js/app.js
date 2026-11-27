import "./nativ.js";
import { chatHtml, chatSprechbar } from "./chat-format.js";
import { briefingZeigen } from "./briefing-show.js";
import {
  BEREICHE, BEREICH_NAME, CHECKIN_BOEGEN, CHECKIN_MITTE, STANDARD_ZIELE, WOCHENTAGE,
  MAHLZEITEN, bogenAmTag, bogenFuer, eintragAus100g, energyBreakdown, hatAngebot, mengeLesen,
  ORDNER, mengeSetzen, nachOrdnern, naehrwerteFuer, offeneMahlzeiten, portionsVorschlag, skalierbar,
  impulseFuerTag, naechsterPunkt, planFuer, saubereUrl, uhrzeit, undListe, weckwortGehoert, weightTrend,
  belastung,
  belastungKurz,
  regeneration, regenFarbton, regenSatz, schlafwert, schlafZiel, PHASEN_SPANNE, koerperlage, essensUhrzeiten, tagesrandFuer,
  bereitschaft,
  bereitschaftText,
  berichtText,
  spanneKurz,
  restText,
  makroHerkunft,
  MAX_EIGENE,
  erinnerungZeile,
  istEinmalig,
  bilanzKurz, bilanzSatz, tageListe, tagStand, zeitraumText, uebungsTrend,
} from "@daevo/core";
import { MODELL_JE_MODUS, MODELL_OPTIONEN, MODELLE, PREISE_STAND, aktuellesModell, produktPerBarcode, produkteSuchen } from "@daevo/coach";
import { Coach, AnthropicProvider, FOODS } from "@daevo/coach";
import { KONFIG, istDemo, istNativ } from "./konfig.js";
import { uebungenStarten } from "./uebungen.js";
import { planFuer as uebungsplanFuer, plaeneStarten, gespeicherterPlan, planWoche, planBeginn } from "./plaene.js";
import {
  auswertungFolien, bildTeilen, blockDaten, blockFolien, kopfFolien, monatsBild, monatsFolien,
  morgenFolien, rekorde, rueckblickFolien, trainingFolien,
} from "./storys.js";
import { trainingStarten } from "./training.js";
import { morgenStarten, morgenVonHeute, trainingGestrichen } from "./morgen.js";
import { abendplanFuer, abendStarten, schlafWocheFuer, schlafWocheHtml } from "./abend.js";
import {
  antwortVerarbeiten, antwortenAbholen, lueckeAusSpeicher, lueckeMelden,
  schieflageAusSpeicher, schieflageMelden,
} from "./luecke.js";
import { healthDateiLesen, healthSchreiben, kurzbefehlSchreiben, schreibBericht } from "./gesundheit.js";
import {
  ablaufFuer, ask, aufgabeAnlegenEingestuft, aufgabeLoeschen, aufgabeUmstufen, aufgabeVerschieben, aufgabenPlan,
  balanceFuer, balanceRat, briefing,
  buildActions, begruessung, dayNumbers, einkaufslisteText, ensureStandards, kalenderNotizAufraeumen, aufgabenAufraeumen, herausforderungSpeichern,
  aktuelleLage, frischesGespraech, gegesseneArten, gespraechBegonnen, gespraecheMitInhalt, gespraechLoeschen, gespraechNachziehen,
  gespraechOeffnen, gespraecheSuchen,
  aufgabenPlanText, energieCheck, kopfSortieren, kopfLetzter, musterBefunde, mittagscheck, mittagscheckText, musterUebersicht,
  schluesselPruefen, tagesnutzungFuer,
  trainingsplanUebernehmen, trainingsplanVorschlag, widerspruchListe,
  kalenderEntfernen, kalenderImportieren, kalenderStand, tagesbriefingFuer, wochenrueckblickFuer, tagesessenFuer,
  briefingTag, essenWahlAusFoto, essenWahlAusText, essenWahlFuer, essenWahlSetzen, geplanteMahlzeitEintragen, fokusKandidaten, fokusWaehlen,
  kostenUebersicht, recommendations, standardsUebersicht, tagesErinnerungen, verlaufPunkte,
  berichtFuer,
  berichtZeitraeume,
  aufgabeErledigen, aufgabeWiederOeffnen, todoistAktualisieren, todoistVerbunden,
  erinnerungenAufgeraeumt, heuteGetauscht, heuteVerschoben,
  vorausblickePlan,
  offOptionen, uhrKiZugang, tagesplan,
  verlaufTag, wochenschnittFuer, gemessenerVerbrauch,
  signalTage,
} from "./assistant.js";
import { zyklusAnsicht, zyklusSichtbar } from "./zyklus-ui.js";
import { entwurfMitUhr, uhrAufgaben, uhrEreignisseAnwenden, uhrMeldung, uhrPaket, uhrTermine } from "./uhr.js";
import { brain } from "./brain.js";
import { Orb } from "./orb.js";
import { anhangAusDatei, grossInKb } from "./media.js";
import { EXIF_LESEN_BYTES, aufnahmezeit, tagVor, tageZurueck, zeitVorschlag } from "./exif.js";
import { gewichtsKurve, gewichtsSpanne } from "./gewichtkurve.js";
import { bereichFarbe, anteilsRing, kurzDauer, netzDiagramm, ringMitZahl, wertungsRing } from "./rings.js";
import {
  Listener, alleStimmen, istDeutsch, istMaennlich, speak, stimmQualitaet, stimmSchluessel, stimmenBereit, stopSpeaking,
  voiceSupport, waehlbareStimmen,
} from "./voice.js";
import { SetupFlow } from "./setup-ui.js";
import { einfuehrungStarten } from "./einfuehrung.js";
import { rezepteAnsicht } from "./rezepte-ui.js";
import { symbol } from "./symbole.js";
import { NATIV_PUSH, gesundheitHolen, postfachHolen, pushAbmelden, pushAbo, pushAnmelden, pushLage, pushProbe } from "./push.js";
import { kodierungReparieren, newId, nowTime, store, todayIso } from "./storage.js";
import { bestellteEinheit } from "./vorhaben.js";
import { REGIONEN, KARTE_DUNKEL, KARTE_HELL, regenerationSvg, muskelkarteSvg } from "./muskelkarte.js";
import { regenTrainings, regenGefuehlHeute } from "./regeneration-daten.js";
import { healthEinfangen, healthkitAbgleichen } from "./healthkit.js";
import { wasserAusAktion } from "./schnellaktion.js";
import { antwortAufFrage, trainingErkannt } from "./training-erkannt.js";
import { abosAbgleichen, kaufenNativ, startAnlass } from "./kauf.js";
import { anmeldeWege, anmeldenApple, anmeldenGoogleNativ, anmeldungSenden, anmeldungText } from "./anmeldung.js";
import { aboEntfernen, aboHinzufuegen, APPLE_QUELLE, appleKalenderTrennen, appleKalenderVerbinden, kalenderAbgleichen, kalenderAbos } from "./kalender-sync.js";
import { MITTEILUNG_ZIEL, mitteilungenPlanen } from "./mitteilungen.js";
import { berechtigungenFragen, berechtigungenOffen, berechtigungenText, kontenText } from "./berechtigungen.js";
import { nativAufruf } from "./nativ.js";
import { spueren } from "./haptik.js";
import { eanAusBild } from "./ean.js";
import { anteilAmZiel, eigeneLebensmittel, eigeneSuche, eigenerPosten, lebensmittelLoeschen, lebensmittelSpeichern, eigeneRezepte, essensplanFrei, proFrei, hauptMakro, rezeptGrenze, rezeptLoeschen, rezeptSpeichern, summe as postenSumme, tabellenBild, tabellenPosten, tabellenSuche, zuletztGegessen, vorschlaege, produktGemerkt, produktPosten } from "./bibliothek.js";
import { abschlussDaten, abschlussHtml, storyTeilen } from "./abschluss.js";
import { UEBUNGEN } from "./uebungen-daten.js";
import { sortiertHtml, sortiertGezeigt } from "./sortierung.js";
import { kachelStand, tagebuchHtml, wocheEnergie, wocheHtml } from "./checkin-ansicht.js";
import { gruppieren, profilUnter, profilZeilen, uebersichtHtml } from "./profil-ansicht.js";
import { tageLeisteHtml, tagZeile, zeitleisteHtml } from "./kalender-zeitleiste.js";
import { bewegungStarten, wischenZumLoeschen, zahlenZaehlen, zeileRaus } from "./bewegung.js";
import { einwilligungOffen, einwilligungSetzen, einwilligungText, kiErlaubt } from "./einwilligung.js";
import { ABO_STUFEN, ABO_TAKTE, aboPreis, ersparnisProzent, aboAnlass, aboAnlassLeer, aboLeiste, aboLink, kontoLoeschen, kontoSicherstellen, kontoStand, kontoText, sperreFuer } from "./konto.js";

const $ = (id) => document.getElementById(id);
const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const TYPE_LABEL = { strength: "Kraft", team_sport: "Mannschaftssport", cardio: "Ausdauer", mobility: "Mobility" };
const FEELINGS = ["voll da", "satt und gut", "müde", "aufgebläht", "noch hungrig"];
const KIND_LABEL = {
  fakt: "Fakt", praeferenz: "Vorliebe", ziel: "Ziel",
  ereignis: "Ereignis", reflexion: "Reflexion", hinweis: "Hinweis", muster: "Muster",
};

let profile = store.getProfile();
let day = todayIso();
/** Der Tag und der Monat, die der Verlauf unter Mahlzeiten zeigt. */
let evTag = day;
let evMonat = day.slice(0, 7);
/** Der Tag, den die Seite Heute zeigt. Ohne Wahl ist es heute. */
let heuteTag = day;
let twTag = day;
let twMonat = day.slice(0, 7);
let lastMealId = null;
let orb = null;
let listener = null;
let busy = false;
let options = { speak: true, handsFree: false };
/** Was bei der nächsten Nachricht mitgeschickt wird. */
let anhaenge = [];

/* ---------- Startbildschirm ---------- */

/** Wie lange die Marke steht und wie lange sie ausblendet. Passt zu styles.css. */
const SPLASH_MS = 2000;
const SPLASH_FADE_MS = 400;

/**
 * Blendet den Startbildschirm aus.
 *
 * Zwei Sekunden, dann noch die Blende. Die Marke entsteht in dieser Zeit,
 * statt fertig dazustehen, und Entstehen braucht Zeit: bei 1,3 Sekunden wirkt
 * dieselbe Bewegung gehetzt und damit billig. Wer es eilig hat, tippt einmal
 * und ist sofort drin. Der Knoten wird danach aus dem Baum genommen, sonst
 * fängt er weiter Berührungen ab.
 */
function splashWeg(sofort = false) {
  const el = $("splash");
  if (!el || el.dataset.weg) return;
  el.dataset.weg = "1";
  el.classList.add("geht");
  setTimeout(() => el.remove(), sofort ? 0 : SPLASH_FADE_MS);
}

const splash = $("splash");
if (splash) {
  splash.addEventListener("click", () => splashWeg(true));
  setTimeout(() => splashWeg(), SPLASH_MS);
}

/* ---------- Helfer ---------- */

function toast(message, ms = 2600) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

/**
 * Eine Meldung mit Knopf, etwa "Abgehakt" mit "Rückgängig". Sechs Sekunden,
 * länger als die normale Meldung: wer sich vertippt hat, merkt es nicht sofort.
 */
function toastAktion(message, label, aktion, ms = 6000) {
  const el = $("toast");
  el.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = message;
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = "toast-aktion";
  knopf.textContent = label;
  knopf.addEventListener("click", () => { el.hidden = true; aktion(); }, { once: true });
  el.append(text, knopf);
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, ms);
}

/** Abgehakt, mit dem Weg zurück. Gilt auf Dein Tag und auf der Kalenderseite. */
function abgehaktMelden(ergebnis, nachher) {
  if (!ergebnis.ok) { toast(ergebnis.text, 4200); return; }
  if (!ergebnis.rueck) { toast("Abgehakt"); return; }
  toastAktion("Abgehakt", "Rückgängig", async () => {
    const r = await aufgabeWiederOeffnen(ergebnis.rueck);
    toast(r.text, r.ok ? 2600 : 4200);
    nachher();
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setStatus(text) {
  $("assistantStatus").textContent = text;
}

/* ---------- Anhänge ---------- */

/** Höchstens vier Anhänge je Nachricht. Mehr Bilder machen die Antwort nicht besser. */
const MAX_ANHAENGE = 4;

function renderAnhaenge() {
  const el = $("anhangLeiste");
  el.hidden = anhaenge.length === 0;
  el.innerHTML = anhaenge.map((a) => {
    const inhalt = a.vorschau
      ? `<img src="${a.vorschau}" alt="${escapeHtml(a.name)}">`
      : `<span class="anhang-typ">${escapeHtml(a.fehler ? "Fehler" : a.art === "pdf" ? "PDF" : a.art)}</span>`;
    const klassen = ["anhang", a.laedt ? "laedt" : "", a.fehler ? "fehler" : ""].filter(Boolean).join(" ");
    return `<div class="${klassen}" title="${escapeHtml(a.fehler || a.name)}">${inhalt}` +
      `<button class="anhang-weg" data-anhang-weg="${a.id}" aria-label="Anhang entfernen">×</button></div>`;
  }).join("");
  $("btnAnhang").setAttribute("aria-pressed", String(anhaenge.length > 0));
}

async function dateienAufnehmen(dateien) {
  const platz = MAX_ANHAENGE - anhaenge.length;
  if (platz <= 0) { toast(`Mehr als ${MAX_ANHAENGE} Anhänge gehen nicht.`); return; }
  const auswahl = [...dateien].slice(0, platz);
  if (dateien.length > platz) toast(`Ich nehme ${platz} davon, mehr passt nicht.`);

  // Platzhalter sofort zeigen. Ein Video zu verkleinern dauert ein paar
  // Sekunden, und ohne Rückmeldung tippt der Nutzer in der Zeit weiter.
  const platzhalter = auswahl.map((datei) => ({
    id: `laedt-${Math.random().toString(36).slice(2, 8)}`,
    name: datei.name || "Anhang",
    art: (datei.type || "").startsWith("video/") ? "video" : "bild",
    laedt: true,
  }));
  anhaenge = [...anhaenge, ...platzhalter];
  renderAnhaenge();

  for (const [i, datei] of auswahl.entries()) {
    const fertig = await anhangAusDatei(datei);
    const stelle = anhaenge.findIndex((a) => a.id === platzhalter[i].id);
    if (stelle !== -1) anhaenge[stelle] = fertig;
    renderAnhaenge();
    if (fertig.fehler) toast(fertig.fehler, 4200);
    else if (fertig.hinweis) toast(fertig.hinweis, 4200);
  }
}

$("btnAnhang").addEventListener("click", (event) => {
  event.stopPropagation();
  $("anhangMenue").hidden = !$("anhangMenue").hidden;
});
// Tippen ausserhalb schliesst das Menue. Ohne das bleibt es stehen und
// verdeckt den Verlauf, bis jemand Abbrechen findet.
document.addEventListener("click", (event) => {
  if ($("anhangMenue").hidden) return;
  if (event.target.closest("#anhangMenue") || event.target.closest("#btnAnhang")) return;
  $("anhangMenue").hidden = true;
});
$("chatInput").addEventListener("focus", () => { $("anhangMenue").hidden = true; });

/**
 * Das Nachrichtenfeld wächst mit dem Text. Gesetzt wird `value` an vielen
 * Stellen, auch von der Spracherkennung, und kein Ereignis meldet das. Deshalb
 * läuft die Anpassung über den Setter des Feldes und nicht über `input` allein.
 * Return sendet, Umschalt Return macht eine neue Zeile.
 */
(() => {
  const feld = $("chatInput");
  const anpassen = () => {
    feld.style.height = "auto";
    // Versteckt, etwa beim Diktieren, ist scrollHeight 0. Dann bleibt es bei
    // der Höhe aus dem Stylesheet, sonst käme das Feld mit null Pixeln zurück.
    if (feld.scrollHeight > 0) feld.style.height = `${feld.scrollHeight}px`;
  };
  const roh = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  Object.defineProperty(feld, "value", {
    configurable: true,
    get() { return roh.get.call(this); },
    set(v) { roh.set.call(this, v); anpassen(); },
  });
  feld.addEventListener("input", anpassen);
  feld.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    $("composer").requestSubmit();
  });
  // Nach dem Diktat wieder sichtbar: die Höhe neu messen.
  new MutationObserver(anpassen).observe($("composer"), { attributes: true, attributeFilter: ["class"] });
  anpassen();
})();
$("anhangMenue").addEventListener("click", (event) => {
  const button = event.target.closest("[data-anhang]");
  if (!button) return;
  $("anhangMenue").hidden = true;
  if (button.dataset.anhang === "kamera") $("kameraWahl").click();
  if (button.dataset.anhang === "datei") $("dateiWahl").click();
  // Die beiden Betriebsarten haben ihre eigenen Knöpfe, die erst beim Laufen
  // sichtbar werden. Das Menü stößt sie nur an.
  if (button.dataset.anhang === "dump") $("btnDump").click();
  if (button.dataset.anhang === "weckwort") $("btnWeckwort").click();
});
for (const id of ["dateiWahl", "kameraWahl"]) {
  $(id).addEventListener("change", async (event) => {
    const dateien = event.target.files;
    if (dateien?.length) await dateienAufnehmen(dateien);
    // Zurücksetzen, sonst löst dieselbe Datei beim zweiten Mal kein change aus.
    event.target.value = "";
  });
}
$("anhangLeiste").addEventListener("click", (event) => {
  const weg = event.target.closest("[data-anhang-weg]");
  if (!weg) return;
  anhaenge = anhaenge.filter((a) => a.id !== weg.dataset.anhangWeg);
  renderAnhaenge();
});

/* ---------- Assistent ---------- */

/**
 * Die Marke neben der Antwort.
 *
 * Das d aus dem Logo, gebaut wie im Bauplan: die Bowl ist ein Aktivitätsring
 * über 300 Grad mit runden Enden, der Stamm ein Rechteck mit halbrunden
 * Enden. Kein Schriftzeichen, sondern dieselbe Geometrie wie das grosse Logo
 * und wie der Kreis auf dem Assistenten.
 *
 * Sie steht auch über der Antwort, während sie noch entsteht. Ein Absender
 * ohne Marke sieht aus wie ein Systemhinweis, und ein Systemhinweis hat keine
 * Haltung.
 */
function markeSvg() {
  return `<svg class="marke" viewBox="-6 -86 73 93" aria-hidden="true">` +
    `<path d="M 32.50 -49.20 A 21.50 21.50 0 1 1 11.33 -31.43" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>` +
    `<path d="M 54 -73 L 54 -27.7" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round"/></svg>`;
}

function renderTranscript() {
  const chat = store.getChat();
  const el = $("transcript");
  // Die sortierte Übersicht steht nur unter der letzten Antwort dieser Art:
  // eine ältere wäre mit dem Stand von gestern gerechnet.
  const letzteSortierung = chat.slice(-40).map((m) => Boolean(m.ausgeführt?.includes("Tag sortiert"))).lastIndexOf(true);
  const istBriefing = (m) => m.role !== "user" && (m.ausgeführt?.includes("Briefing erstellt") || /^(Guten Morgen\.|Dein Tag, |Dein Blick auf )/.test(m.text || ""));
  const letztesBriefing = chat.slice(-40).map(istBriefing).lastIndexOf(true);
  const letzterRueckblick = chat.slice(-40).map((m) => m.role !== "user" && /Dein (Wochenrückblick|Zwischenstand zur Wochenmitte)/.test(m.text || "")).lastIndexOf(true);
  const kopfDa = Boolean(kopfLetzter());
  const letzterKopf = kopfDa ? chat.slice(-40).map((m) => m.role !== "user" && (m.ausgeführt || []).some((a) => /Kopf geleert|Aufgaben angelegt/.test(a))).lastIndexOf(true) : -1;
  let sortierung = "";
  if (letzteSortierung >= 0) {
    try { sortierung = (() => { const bb = tagesbriefingFuer("morgen"); return sortiertHtml(bb.reihenfolge, { schluessel: "chat", mitHaken: false, hinweis: bb.musterHinweis }); })(); } catch (e) { console.error(e); }
  }
  el.innerHTML = chat
    .slice(-40)
    .map((m, idx) => {
      const done = m.ausgeführt?.length ? `<span class="msg-done">${escapeHtml(m.ausgeführt.join(" und "))}</span>` : "";
      const bilder = m.bilder?.length
        ? `<div class="msg-bilder">${m.bilder.map((b) => `<img src="${b}" alt="Mitgeschicktes Bild">`).join("")}</div>`
        : "";
      const dateien = m.dateien?.length
        ? `<div class="msg-dateien">${escapeHtml(m.dateien.join(", "))}</div>`
        : "";
      if (m.role === "user") {
        return `<div class="msg user">${bilder}${dateien}${escapeHtml(m.text)}${done}</div>`;
      }
      // Eine Einheit, die der Coach für heute gerechnet hat, startet direkt
      // aus dem Gespräch. Nur heute: gestern gerechnet ist heute Geschichte.
      const startbar = m.ausgeführt?.includes("Training für heute bereit") && Boolean(bestellteEinheit(store.getSettings(), todayIso()));
      // Ein Briefing im Chat bekommt den Weg zur Präsentation. Der Text dort
      // ist der aus dem Kern, er beginnt immer gleich, oder der Coach hat das
      // Werkzeug benutzt.
      const briefingArt = idx === letztesBriefing
        ? (/^Dein Blick auf|\bmorgen\b/i.test(m.text.replace(/^Guten Morgen/, "")) ? "abend" : "morgen")
        : null;
      // Rückblick und Kopf leeren bekommen denselben Weg, nur unter der
      // letzten Antwort dieser Art: eine ältere wäre mit altem Stand gerechnet.
      const story = idx === letzterRueckblick ? "rueckblick" : idx === letzterKopf ? "kopf" : null;
      const knopf = startbar
        ? `<div class="msg-aktionen"><button type="button" class="primary" data-heute-starten>Training starten</button>` +
          `<button type="button" class="ghost" data-heute-neu>Neue Übungen</button></div>`
        : briefingArt
          ? `<div class="msg-aktionen"><button type="button" class="primary" data-briefing-zeigen="${briefingArt}">Als Präsentation ansehen</button></div>`
          : story
            ? `<div class="msg-aktionen"><button type="button" class="primary" data-story-zeigen="${story}">Als Präsentation ansehen</button></div>`
            : "";
      return `<div class="msg assistant">${markeSvg()}` +
        `<div class="msg-text">${bilder}${dateien}${chatHtml(m.text)}${done}${idx === letzteSortierung ? sortierung : ""}${knopf}</div></div>`;
    })
    .join("");
  sortiertGezeigt(el);
  // Erst wenn der Nutzer selbst etwas gesagt hat, schrumpft der Kreis. Die
  // Begrüssung allein zählt nicht, sonst sieht man den großen Kreis nie.
  $("assistant").classList.toggle("has-chat", chat.some((m) => m.role === "user"));
  el.scrollTop = el.scrollHeight;
}

function appendBubble(role, text, bilder = []) {
  const el = $("transcript");
  const node = document.createElement("div");
  node.className = `msg ${role}`;
  if (bilder.length) {
    const reihe = document.createElement("div");
    reihe.className = "msg-bilder";
    for (const quelle of bilder) {
      const bild = document.createElement("img");
      bild.src = quelle;
      bild.alt = "Mitgeschicktes Bild";
      reihe.appendChild(bild);
    }
    node.appendChild(reihe);
  }
  node.appendChild(document.createTextNode(text));
  el.appendChild(node);
  el.scrollTop = el.scrollHeight;
  return node;
}

/**
 * Der Platzhalter, solange die Antwort entsteht.
 *
 * Er trägt dieselbe Marke wie die fertige Antwort und wird zur Antwort, sobald
 * das erste Wort da ist. Deshalb hat er denselben Aufbau: Marke oben, Text
 * darunter. Ohne das würde der Text beim ersten Wort springen.
 */
function appendPending(text) {
  const el = $("transcript");
  const node = document.createElement("div");
  node.className = "msg assistant pending";
  node.innerHTML = markeSvg();
  const inhalt = document.createElement("div");
  inhalt.className = "msg-text";
  inhalt.textContent = text;
  node.appendChild(inhalt);
  el.appendChild(node);
  el.scrollTop = el.scrollHeight;
  return { node, text: inhalt };
}

async function send(text, { vonUhr = false } = {}) {
  const nachricht = text.trim();

  // Die Antwort auf die Energiefrage aus der Benachrichtigung. Eine blosse
  // Zahl von 1 bis 10 wird hier gerechnet und geht nicht an das Modell: die
  // Bewertung steht im Rechenkern, kostet nichts und läuft ohne Schlüssel.
  // Eine beantwortete Frage aus einer Mitteilung kommt heute nicht noch einmal.
  if (offeneFrage && nachricht) {
    const s = store.getSettings();
    store.setSettings({ ...s, impulsBeantwortet: { ...(s.impulsBeantwortet || {}), [offeneFrage]: todayIso() } });
  }
  const zahl = offeneFrage === "energie" ? nurZahl(nachricht) : null;
  if (zahl !== null && !busy) {
    offeneFrage = null;
    $("chatInput").value = "";
    appendBubble("user", nachricht);
    const chat = store.getChat();
    chat.push({ role: "user", text: nachricht, at: new Date().toISOString() });
    const { text: antwort } = energieCheck(zahl);
    chat.push({ role: "assistant", text: antwort, at: new Date().toISOString() });
    store.setChat(chat);
    gespraechNachziehen();
    renderTranscript();
    refreshAll();
    return;
  }
  offeneFrage = null;

  // Die Antwort auf "vorgezogen oder zweimal" nach einem Training von der Uhr.
  // Eindeutige Antworten erledigt die App selbst, alles andere geht wie
  // immer an den Coach.
  const tf = trainingFrage;
  trainingFrage = null;
  const gemeint = tf && nachricht && !busy ? antwortAufFrage(nachricht) : null;
  if (gemeint) {
    $("chatInput").value = "";
    appendBubble("user", nachricht);
    const um = `${String(Math.floor(tf.um / 60)).padStart(2, "0")}:${String(tf.um % 60).padStart(2, "0")}`;
    let antwort;
    if (gemeint === "vorgezogen") {
      antwort = `Alles klar, dann war das dein Training für heute. ${tf.titel} um ${um} ist damit erledigt.`;
      if (tf.eid) {
        const { kalenderTermin } = await import("./kalender-schreiben.js");
        const satz = await kalenderTermin({ aktion: "loeschen", eid: tf.eid, beginn: tf.von });
        antwort += /^Noch nicht gespeichert/.test(satz) ? ` ${satz}` : " Ich hab den Termin aus dem Kalender genommen.";
      } else {
        antwort += " Dein Wochenplan bleibt, wie er ist.";
      }
    } else {
      antwort = `Dann bleibt ${tf.titel} um ${um} stehen. Iss etwa 90 Minuten vorher eine Mahlzeit mit Protein und Kohlenhydraten, und trink bis dahin mindestens einen halben Liter.`;
    }
    const chat = store.getChat();
    chat.push({ role: "user", text: nachricht, at: new Date().toISOString() });
    chat.push({ role: "assistant", text: antwort, at: new Date().toISOString() });
    store.setChat(chat);
    gespraechNachziehen();
    renderTranscript();
    refreshAll();
    return;
  }

  const mit = anhaenge.filter((a) => !a.fehler && !a.laedt);
  if ((!nachricht && mit.length === 0) || busy) return;
  if (anhaenge.some((a) => a.laedt)) { toast("Ein Anhang wird noch verarbeitet."); return; }
  // Vor der ersten Antwort mit KI fragt die App. Die Nachricht wartet so
  // lange im Feld, und danach geht sie mit oder ohne KI raus.
  if (einwilligungOffen(store.getSettings(), KONFIG)) await kiFreigabe();
  busy = true;
  stopSpeaking();
  $("chatInput").value = "";

  // Ohne Text, aber mit Bild: der Coach soll trotzdem etwas zum Anfassen haben.
  const frage = nachricht || (mit.length ? "Schau dir das an." : "");

  // Die Nachricht wird nur angezeigt, gespeichert wird sie in ask(). Sonst
  // landet sie zweimal im Verlauf.
  appendBubble("user", frage, mit.map((a) => a.vorschau).filter(Boolean));
  const gesendet = mit;
  anhaenge = [];
  renderAnhaenge();
  $("assistant").classList.add("has-chat");
  const pending = appendPending(gesendet.length ? "schaut sich das Bild an" : "denkt nach");
  orb.setState("thinking");
  setStatus("denkt nach");

  // Eine laufende Uhr, sobald es länger dauert.
  //
  // Bei Planung und persönlichen Themen läuft Opus auf höchster Denkstufe, und
  // das sind schnell über sechzig Sekunden. "denkt nach" ohne jede Bewegung
  // sieht in dieser Zeit aus wie eine hängende App, und der Nutzer schickt die
  // Frage nochmal oder schliesst die App. Die Uhr sagt nichts Neues, sie
  // beweist nur, dass etwas passiert. Sie startet erst nach vier Sekunden:
  // eine Uhr bei einer Antwort, die ohnehin gleich da ist, ist Unruhe.
  const begonnen = Date.now();
  let uhr = 0;
  const uhrStarten = () => {
    uhr = setInterval(() => {
      if (laufend) { clearInterval(uhr); uhr = 0; return; }
      const s = Math.round((Date.now() - begonnen) / 1000);
      pending.text.textContent = `denkt nach, ${s} Sekunden`;
    }, 1000);
  };
  const uhrVorlauf = setTimeout(uhrStarten, 4000);
  const uhrStoppen = () => { clearTimeout(uhrVorlauf); if (uhr) clearInterval(uhr); uhr = 0; };

  // Der Text läuft in die Blase, während er geschrieben wird. Ein Stück Text
  // ist ein Anhängen, null heisst: alles bisherige war ein Zwischenschritt und
  // wird verworfen.
  let laufend = "";
  const onStrom = (stueck) => {
    if (stueck === null) { laufend = ""; pending.text.textContent = "denkt nach"; return; }
    // Sobald Text kommt, hat das Warten ein Ende und die Uhr stört nur.
    uhrStoppen();
    laufend += stueck;
    pending.node.classList.remove("pending");
    pending.text.textContent = laufend;
    $("transcript").scrollTop = $("transcript").scrollHeight;
  };

  try {
    const reply = await ask(frage, { onChange: refreshAll, anhaenge: gesendet, onStrom });
    pending.node.remove();
    gespraechNachziehen();
    renderTranscript();
    refreshAll();
    // Erst nach der Antwort, nie davor: der Regelweg hat dann schon getan,
    // was ohne KI geht, und das Fenster verdeckt keine halbe Nachricht.
    // Kennt der Server den Schlüssel nicht mehr, legt kontoStand ein neues
    // Konto an. Ohne das scheiterte jede weitere Nachricht an derselben Stelle.
    if (reply.fehlerArt === "konto") kontoStand();
    // Im Gespräch angelegt: sofort einplanen, nicht erst beim nächsten Öffnen.
    if ((reply.ausgeführt || []).some((a) => String(a).startsWith("Erinnerung"))) {
      eigeneErinnerungenZeigen();
      mitteilungenNativ();
    }
    if (reply.fehlerArt === "kontingent") {
      // Ein Kontingent von null heisst: gesperrt. Der Server sagt es.
      sperrePruefen().catch(() => {});
      const anlass = aboAnlassLeer(store.getSettings().aboHinweise, Date.now(), reply.modus);
      if (anlass) setTimeout(() => aboOeffnen(anlass), 700);
    }
    // Eine Frage von der Uhr liest die Uhr selbst vor. Sprächen beide, hörte
    // man dieselbe Antwort zweimal und versetzt.
    if (options.speak && !vonUhr) {
      orb.setState("speaking");
      setStatus("spricht");
      const stimmEinst = store.getSettings();
      speak(reply.text, {
        enabled: options.speak,
        stimme: stimmEinst.stimme,
        tempo: stimmEinst.sprechtempo,
        onEnd: () => {
          orb.setState("idle");
          setStatus("bereit");
          if (weckwortLaeuft) weckwortWeiterhoeren();
          else if (options.handsFree) startListening();
        },
      });
    } else {
      orb.setState("idle");
      setStatus("bereit");
      if (weckwortLaeuft) weckwortWeiterhoeren();
      else if (options.handsFree) startListening();
    }
  } catch (error) {
    pending.node.remove();
    const chatNow = store.getChat();
    chatNow.push({ role: "assistant", text: `Das hat nicht geklappt: ${error.message}`, at: new Date().toISOString() });
    store.setChat(chatNow);
    renderTranscript();
    orb.setState("idle");
    setStatus("bereit");
  } finally {
    uhrStoppen();
    busy = false;
  }
}

/**
 * Kopf leeren als Sprachnachricht im Chat.
 *
 * Zwei Unterschiede zum normalen Mikrofon. Die Sprechpause darf sechs Sekunden
 * lang sein statt gut zwei, weil man beim Rausreden zwischendurch nachdenkt und
 * eine Denkpause kein Satzende ist. Und die Aufnahme läuft bis zu fünf Minuten
 * statt zwei.
 *
 * Am Ende geht der Text nicht als normale Frage an den Coach, sondern durch die
 * Sortierung. Der Nutzer sieht seinen eigenen Schwall als Nachricht und darunter
 * die geordnete Liste, und die Aufgaben stehen danach wirklich in der Liste.
 */
let dumpListener = null;

async function dumpFertig(text) {
  const roh = String(text || "").trim();
  $("btnDump").setAttribute("aria-pressed", "false");
  $("chatInput").value = "";
  if (roh.length < 20) {
    orb.setState("idle");
    setStatus("bereit");
    toast("Da war zu wenig. Red einfach alles raus.");
    return;
  }

  busy = true;
  appendBubble("user", roh);
  $("assistant").classList.add("has-chat");
  const pending = appendPending("sortiert das");
  orb.setState("thinking");
  setStatus("sortiert");

  try {
    const ergebnis = await kopfSortieren(roh);
    pending.node.remove();
    const antwort = ergebnis
      ? `${ergebnis.text}\n\n${ergebnis.angelegt.length === 1 ? "Eine Aufgabe steht" : `${ergebnis.angelegt.length} Aufgaben stehen`} jetzt in deiner Liste.\n\n${aufgabenPlanText()}`
      : "Dafür war zu wenig da.";

    const chat = store.getChat();
    chat.push({ role: "user", text: roh, at: new Date().toISOString() });
    chat.push({
      role: "assistant", text: antwort, at: new Date().toISOString(),
      ausgeführt: ergebnis ? [`${ergebnis.angelegt.length} Aufgaben angelegt`] : [],
    });
    store.setChat(chat);
    gespraechNachziehen();
    renderTranscript();
    refreshAll();
    // Das Sortierte gleich als Karten, eine je Schublade.
    if (ergebnis) kopfShow(ergebnis.ergebnis);
  } catch (error) {
    pending.node.remove();
    const chat = store.getChat();
    chat.push({ role: "assistant", text: `Das hat nicht geklappt: ${error.message}`, at: new Date().toISOString() });
    store.setChat(chat);
    renderTranscript();
  } finally {
    busy = false;
    orb.setState("idle");
    setStatus("bereit");
  }
}

$("btnDump").addEventListener("click", () => {
  if (dumpListener?.active) { dumpListener.fertig("nutzer"); return; }
  if (busy) return;
  if (!voiceSupport.erkennung) {
    toast("Dieser Browser kann keine Spracherkennung. Schreib es ins Feld, dann sortiere ich es genauso.");
    $("chatInput").focus();
    return;
  }
  stopSpeaking();
  listener?.stop?.();

  dumpListener = new Listener({
    bisStopp: true,
    pauseMs: 9000,
    maxMs: 300000,
    stilleMs: 12000,
    onPartial: (t) => { $("chatInput").value = t; },
    onFinal: (t) => { dumpFertig(t); },
    onLevel: (level) => orb.setLevel(level),
    onState: (state) => {
      if (state === "listening") {
        orb.setState("listening");
        setStatus("hört zu, tipp auf Fertig, wenn du durch bist");
        $("orbHint").textContent = "Red alles raus. Pausen sind in Ordnung. Tipp unten auf Fertig, wenn du durch bist.";
      }
    },
  });
  dumpListener.start();
  $("btnDump").setAttribute("aria-pressed", "true");
  toast("Red alles raus. Ich sortiere danach.");
});

/* ---------- Weckwort ---------- */

/**
 * "Hey daevo" im Dauerbetrieb.
 *
 * Das Mikrofon läuft, und erst das Weckwort macht aus einem Satz im Raum eine
 * Frage an die App. Gedacht für die Momente, in denen das Handy daneben liegt
 * und die Hände beschäftigt sind: Kochen, Auto, zwischen zwei Sätzen im
 * Training.
 *
 * Auf dem iPhone geht das nur, solange die App offen und der Bildschirm an
 * ist. iOS lässt keine fremde App im Hintergrund das Mikrofon abhören, und
 * daran ändert auch eine gekaufte Weckworterkennung nichts.
 */
let weckwortLaeuft = false;
let weckwortTimer = 0;
/** Wurde das Weckwort gehört und die Frage fehlt noch. */
let warteAufFrage = false;

/**
 * Nach dieser Zeit ohne Ansprache geht das Mikrofon aus.
 *
 * Dauerhaft zuzuhören zieht Akku. Ein Modus, der den Akku leert, wird einmal
 * ausprobiert und danach nie wieder eingeschaltet.
 */
const WECKWORT_AUS_NACH_MS = 10 * 60 * 1000;

/**
 * Warum das Zuhören hier gerade nicht geht, in einem Satz.
 *
 * Vorher stand da ein Satz für jeden Fall. Wenn der Knopf nichts tut, ist
 * das die falsche Antwort: der Nutzer probiert es fünfmal und hält die App
 * für kaputt. Geprüft wird deshalb einzeln, und genannt wird, was fehlt.
 */
function weckwortHindernis() {
  if (!listener?.supported) {
    if (istNativ()) {
      return "Die iPhone App hat noch keine Spracherkennung. Bis sie kommt, tippst du oder nutzt die Diktiertaste der Tastatur.";
    }
    const standalone = globalThis.matchMedia?.("(display-mode: standalone)")?.matches
      || globalThis.navigator?.standalone;
    if (standalone) {
      return "Dieses iPhone gibt der installierten App keine Spracherkennung. "
        + "Nutz den Siri Kurzbefehl im Profil, oder öffne daevo in Safari.";
    }
    return "Dieser Browser kann keine Spracherkennung. In Safari und Chrome geht sie, in Firefox nicht.";
  }
  if (!globalThis.isSecureContext) {
    return "Ohne https gibt der Browser kein Mikrofon frei.";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Dieser Browser gibt kein Mikrofon frei.";
  }
  return "";
}

function weckwortStarten() {
  const hindernis = weckwortHindernis();
  if (hindernis) {
    toast(hindernis, 6000);
    return;
  }
  weckwortLaeuft = true;
  warteAufFrage = false;
  listener.handsFree = true;
  stopSpeaking();
  listener.start();
  weckwortFristSetzen();
  $("btnWeckwort")?.setAttribute("aria-pressed", "true");
  setStatus("wartet auf Hey daevo");
  toast("Sag Hey daevo, dann deine Frage.");
}

function weckwortStoppen(grund = "") {
  weckwortLaeuft = false;
  warteAufFrage = false;
  clearTimeout(weckwortTimer);
  listener.handsFree = false;
  listener.stop();
  $("btnWeckwort")?.setAttribute("aria-pressed", "false");
  setStatus("bereit");
  if (grund) toast(grund);
}

/**
 * Nach einem verworfenen Satz wieder zuhören.
 *
 * Der Listener startet von selbst nur neu, wenn nichts verstanden wurde. Ein
 * Satz, der nicht an die App gerichtet war, ist für ihn aber ein Ergebnis,
 * und danach stünde das Mikrofon still. Genau so ist der Weckwortmodus beim
 * ersten Versuch nach einem Nebensatz verstummt.
 *
 * Die kleine Verzögerung ist nötig, weil die Erkennung im selben Moment noch
 * abgeräumt wird und einen sofortigen Start ablehnt.
 */
function weckwortWeiterhoeren() {
  if (!weckwortLaeuft) return;
  setTimeout(() => {
    if (weckwortLaeuft && !listener.active) listener.start();
  }, 400);
}

function weckwortFristSetzen() {
  clearTimeout(weckwortTimer);
  weckwortTimer = setTimeout(
    () => weckwortStoppen("Zehn Minuten nichts gehört, Mikrofon aus. Spart Akku."),
    WECKWORT_AUS_NACH_MS,
  );
}

/**
 * Ein Stück erkannter Text im Weckwortmodus.
 *
 * Drei Fälle: das Weckwort mit Frage geht sofort raus, das Weckwort ohne
 * Frage lässt die App auf den nächsten Satz warten, und alles andere wird
 * verworfen. Ohne den mittleren Fall bricht jeder ab, der nach der Anrede
 * kurz überlegt.
 */
function weckwortPruefen(text) {
  weckwortFristSetzen();

  if (warteAufFrage) {
    warteAufFrage = false;
    const frage = text.trim();
    if (frage) { $("chatInput").value = ""; send(frage); return; }
    setStatus("wartet auf Hey daevo");
    weckwortWeiterhoeren();
    return;
  }

  const ruf = weckwortGehoert(text);
  if (!ruf.erkannt) {
    // Nicht an die App gerichtet. Das Feld leeren, sonst steht das
    // Mitgehörte im Eingabefeld und wandert in die nächste Nachricht.
    $("chatInput").value = "";
    weckwortWeiterhoeren();
    return;
  }

  if (ruf.frage) {
    $("chatInput").value = "";
    send(ruf.frage);
    return;
  }

  // Nur der Name. Der nächste Satz ist die Frage.
  warteAufFrage = true;
  $("chatInput").value = "";
  setStatus("ja, ich höre");
  orb.setState("listening");
  weckwortWeiterhoeren();
}

function startListening() {
  // Wer aufs Mikrofon tippt, will direkt reden und nicht erst eine Anrede
  // sagen. Beides gleichzeitig wäre ein Mikrofon mit zwei Bedeutungen.
  if (weckwortLaeuft) weckwortStoppen();
  if (!listener?.supported) {
    toast("Dieser Browser kann keine Spracherkennung. Nutze Safari oder Chrome.");
    return;
  }
  if (listener.active) {
    listener.stop();
    return;
  }
  stopSpeaking();
  listener.handsFree = options.handsFree;
  listener.start();
}

function setupAssistant() {
  orb = new Orb($("orb"));
  listener = new Listener({
    // Diktieren endet nur auf Senden, Stopp oder einen Tipp auf den Kreis,
    // nie durch eine Sprechpause. Freihand und Weckwort schalten das über
    // `handsFree` selbst wieder auf das Ende durch Stille.
    bisStopp: true,
    onPartial: (text) => {
      $("chatInput").value = text;
      const vorschau = $("diktatText");
      vorschau.textContent = text;
      vorschau.scrollTop = vorschau.scrollHeight;
    },
    onFinal: (text) => {
      // Im Weckwortmodus ist nicht alles Gesagte an daevo gerichtet. Erst das
      // Weckwort macht aus einem Satz im Raum eine Frage an die App.
      if (weckwortLaeuft) { weckwortPruefen(text); return; }
      send(text);
    },
    onLevel: (level) => { orb.setLevel(level); welle.pegel = level; },
    onState: (state, detail) => {
      $("btnMic").setAttribute("aria-pressed", state === "listening" ? "true" : "false");
      diktatAnzeige(state === "listening" && listener.ohneStille && !weckwortLaeuft);
      if (state === "listening") {
        // Spürbar, dass das Mikrofon offen ist, auch wer nicht hinsieht.
        // Nicht im Weckwortmodus und nicht beim Neustart im Freihandbetrieb:
        // dort startet das Mikrofon nach jedem Satz neu, und ein Summen nach
        // jedem Satz im Raum wäre Lärm.
        if (!weckwortLaeuft && !listener.handsFree) spueren("leicht");
        orb.setState("listening");
        // Im Weckwortmodus heisst zuhören etwas anderes als beim Diktieren:
        // dort wartet die App auf die Anrede, hier auf den Satz. Ohne den
        // Unterschied stünde "tipp auf Fertig" da, während niemand tippen soll.
        if (weckwortLaeuft) {
          setStatus(warteAufFrage ? "ja, ich höre" : "wartet auf Hey daevo");
          $("orbHint").textContent = warteAufFrage
            ? "Sag jetzt, was du willst."
            : "Sag Hey daevo, dann deine Frage.";
        } else {
          setStatus("hört zu");
          // Die Erklärung nur beim allerersten Diktat. Danach weiss man es,
          // und ein Satz, der jedes Mal dasteht, wird zur Tapete.
          $("orbHint").textContent = diktatErstesMal()
            ? "Sprich in Ruhe, Pausen sind in Ordnung. Senden schickt ab, das Viereck hält an zum Bearbeiten."
            : "";
        }
        $("btnMic").classList.add("hoert");
      }
      else if (state === "error") {
        toast(`Mikrofon: ${detail}`, 5000);
        // Im Weckwortmodus muss der Knopf zurückspringen. Ein gedrückter
        // Knopf über einem toten Mikrofon ist eine Lüge, und der Nutzer
        // redet weiter gegen eine App, die nicht zuhört.
        if (weckwortLaeuft) weckwortStoppen("");
        orb.setState("idle"); setStatus("bereit");
        $("btnMic").classList.remove("hoert");
        begruessungZeigen();
      }
      else {
        $("btnMic").classList.remove("hoert");
        if (weckwortLaeuft) return;
        begruessungZeigen();
        if (!busy) { orb.setState("idle"); setStatus("bereit"); }
      }
    },
  });

  // Jeder Start beginnt mit einem leeren Gespräch, wie bei Claude. Das
  // Gespräch von gestern steht in der Liste und nicht mehr im Weg. Ohne ein
  // offenes Gespräch schriebe setChat ausserdem ins Leere.
  frischesGespraech();
  begruessungZeigen();
  renderTranscript();
  setStatus("bereit");
}

/**
 * Die Balken beim Diktieren. Jeder Balken ist ein Moment, der neueste rechts,
 * gefüttert mit dem Pegel aus dem Mikrofon. In der iPhone App ist das der
 * echte Pegel aus `DiktatPlugin.swift`, im Browser auf iOS eine erzeugte
 * Welle, weil dort Erkennung und Pegelmesser sich das Mikrofon nicht teilen.
 */
const welle = { pegel: 0, verlauf: [], takt: 0 };
const WELLE_BALKEN = 34;
function diktatAnzeige(an) {
  const form = $("composer");
  const vorschau = $("diktatText");
  const war = form.classList.contains("diktiert");
  form.classList.toggle("diktiert", an);
  vorschau.hidden = !an;
  if (an && !war) {
    vorschau.textContent = "";
    const box = $("diktatWelle");
    box.innerHTML = "<i></i>".repeat(WELLE_BALKEN);
    welle.verlauf = Array(WELLE_BALKEN).fill(0);
    clearInterval(welle.takt);
    welle.takt = setInterval(() => {
      welle.verlauf.push(welle.pegel);
      welle.verlauf.shift();
      const balken = box.children;
      for (let i = 0; i < balken.length; i++) {
        balken[i].style.height = `${4 + Math.round(welle.verlauf[i] * 30)}px`;
      }
    }, 80);
  }
  if (!an && war) {
    clearInterval(welle.takt);
    welle.takt = 0;
  }
}

/**
 * Gruss und Lage unter dem grossen Kreis.
 *
 * Die Begrüssung stand vorher als erste Nachricht im Verlauf. Damit begann
 * jedes Gespräch mit einem Satz der App, und die Liste füllte sich mit
 * Gesprächen, in denen niemand etwas gesagt hatte.
 */
function begruessungZeigen() {
  const { gruss, lage } = begruessung();
  $("orbGruss").textContent = gruss;
  $("orbHint").textContent = lage;
}

/*
 * Nach einer halben Stunde im Hintergrund beginnt ebenfalls ein neues
 * Gespräch. Eine installierte App wird auf dem iPhone selten neu geladen,
 * sondern nur wieder nach vorn geholt, und ohne das stünde dort tagelang
 * dasselbe Gespräch. Ein Gespräch, in dem gerade geantwortet wird, bleibt.
 */
const NEU_NACH_MS = 30 * 60 * 1000;
let verstecktSeit = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { verstecktSeit = Date.now(); return; }
  if (!verstecktSeit || Date.now() - verstecktSeit < NEU_NACH_MS) return;
  verstecktSeit = 0;
  if (busy || !gespraechBegonnen()) { begruessungZeigen(); return; }
  frischesGespraech();
  begruessungZeigen();
  renderTranscript();
});

/* ---------- Bereiche ---------- */

/**
 * Die Reihenfolge der Ansichten.
 *
 * Sie entscheidet über die Richtung des Übergangs. Wer vom Assistenten nach
 * Heute geht, geht nach vorn, und wer zurück geht, kommt von links wieder
 * herein. Ohne Richtung wirkt jeder Wechsel gleich, und dann hat der Nutzer
 * nach drei Sprüngen kein Gefühl mehr dafür, wo er ist.
 *
 * Was nicht in der Liste steht, gilt als weiter hinten. Eine Ansicht, die
 * jemand später hinzufügt, bekommt damit einen vernünftigen Übergang, ohne
 * dass er daran denken muss.
 */
const ANSICHT_TIEFE = ["assistant", "gespraeche", "heute", "essen", "rezepte", "tag", "balance", "bereitschaft", "schlaf", "zyklus", "checkin", "wochencheck", "bericht", "profil", "reflexion"];

let letzteAnsicht = "assistant";

/** Die Übungsansicht. Sie wird nach dem Aufbau der Seite gestartet, siehe unten. */
let uebungen = null;

function showView(name) {
  // "Trainingspläne" ist ein Reiter der Übungsansicht und hat keine eigene.
  const aufPlaene = name === "plaene";
  if (aufPlaene) name = "uebungen";
  const von = ANSICHT_TIEFE.indexOf(letzteAnsicht);
  const nach = ANSICHT_TIEFE.indexOf(name);
  // -1 heisst "nicht in der Liste", also hinten. Zwei unbekannte Ansichten
  // nacheinander ergeben damit keinen Übergang, und das ist richtig: zwischen
  // zwei Nebenseiten gibt es kein Vor und Zurück.
  const zurueck = name !== letzteAnsicht && (nach < von || (nach === -1 && von === -1 ? false : nach < von));
  letzteAnsicht = name;

  for (const view of document.querySelectorAll(".view")) view.hidden = view.dataset.view !== name;
  const offen = document.querySelector(".view:not([hidden])");
  if (offen) {
    // Die Klasse wird entfernt und im nächsten Bild neu gesetzt. Ohne das
    // startet die Animation beim zweiten Mal auf dieselbe Ansicht nicht neu.
    offen.classList.remove("kommt-rein", "kommt-zurueck");
    void offen.offsetWidth;
    offen.classList.add(zurueck ? "kommt-zurueck" : "kommt-rein");
    // Eine neue Ansicht fängt oben an. Ohne das steht man auf einer frischen
    // Seite mitten im Text, weil die vorherige dort gescrollt war.
    offen.querySelector(".scroll")?.scrollTo({ top: 0 });
  }
  $("menu").hidden = true;
  // Eine offene Detailseite samt Animation endet mit dem Verlassen der Ansicht.
  if (name !== "uebungen") uebungen?.schliessen();
  if (name === "uebungen") uebungen?.modus(aufPlaene ? "plaene" : "uebungen");
  if (aufPlaene) setTimeout(blockVielleicht, 320);
  if (name === "heute") renderToday();
  if (name === "essen") { $("fridgeInput").value = store.getFridge().join(", "); renderVerlauf(); renderRestDesTages(); }
  if (name === "checkin") renderCheckins();
  if (name === "reflexion") renderMemories();
  if (name === "einkauf") renderEinkauf();
  if (name === "rezepte") rezepte.zeichnen();
  // Der Health Abschnitt steht auf der Kalenderseite. Ohne den Aufruf hier
  // blieb sein Stand leer, solange man nicht vorher im Profil war.
  if (name === "kalender") { renderKalender(); healthStandZeigen(); }
  if (name === "tag") {
    renderTag();
    // Erst den gespeicherten Stand zeigen, dann neu lesen. Andersherum bleibt
    // die Liste leer, bis Todoist geantwortet hat, und bei schlechtem Netz
    // sieht das aus wie keine Aufgaben.
    if (todoistVerbunden()) {
      todoistAktualisieren().then((fehler) => {
        if (document.querySelector('.view[data-view="tag"]:not([hidden])')) renderTag();
        if (fehler) toast(fehler, 4200);
      });
    }
  }
  if (name === "balance") renderBalance();
  if (name === "bereitschaft") renderBereitschaft();
  if (name === "schlaf") renderSchlaf();
  if (name === "zyklus") zyklus.zeichnen();
  if (name === "bericht") { berichtZeitraumFuellen(); renderBericht(); }
  if (name === "standards") { renderStandards(); zeigeAngebot("standardsAngebot"); }
  if (name === "gespraeche") renderGespraeche();
  if (name === "wochencheck") wcStart();
  if (name === "empfehlungen") { renderRecommendations(); zeigeAngebot("empfehlungenAngebot"); }
  if (name === "profil") { const pv = document.querySelector('[data-view="profil"]'); if (pv.dataset.pfOffen) { delete pv.dataset.pfOffen; pv.querySelector(".bar h1").textContent = "Profil"; } renderProfile(); healthStandZeigen(); eigeneErinnerungenZeigen(); }
  if (name === "assistant") renderTranscript();
  // Werte, die beim Öffnen gesetzt werden, etwa der Vorrat, lösen kein input
  // aus. Ohne das hier stand die zweite Zeile halb abgeschnitten im Feld.
  requestAnimationFrame(() => document.querySelectorAll(`.view[data-view="${name}"] textarea`).forEach(feldWachsen));
}

/**
 * Ein Textfeld wächst mit dem Inhalt, bis zu vier Zehnteln des Bildschirms.
 * Darüber scrollt es: eine Sicherung als Text wäre sonst so hoch wie die
 * Seite. Ein abgeschnittener Satz sieht aus wie ein verlorener.
 */
function feldWachsen(el) {
  if (!el || el.offsetParent === null) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight + 2, Math.round(innerHeight * 0.4))}px`;
}
document.addEventListener("input", (event) => {
  if (event.target instanceof HTMLTextAreaElement) feldWachsen(event.target);
});
document.addEventListener("click", (event) => {
  if (!event.target.closest?.("#bwZielSchalter")) return;
  const s = store.getSettings();
  store.setSettings({ ...s, aktivZumZiel: s.aktivZumZiel === false });
  refreshAll();
});

function refreshAll() {
  uhrSpaeter();
  planSpaeter();
  const visible = document.querySelector(".view:not([hidden])");
  const numbers = dayNumbers(day);
  orb?.setProgress(numbers.targets.kcal > 0 ? numbers.totals.kcal / numbers.targets.kcal : 0);
  if (!visible) return;
  const name = visible.dataset.view;
  if (name === "heute") renderToday();
  if (name === "essen") renderVerlauf();
  if (name === "checkin") renderCheckins();
  if (name === "reflexion") renderMemories();
  if (name === "einkauf") renderEinkauf();
  if (name === "kalender") renderKalender();
  if (name === "tag") {
    renderTag();
    // Ab 17 Uhr steht der Blick auf morgen vorn, morgens das Briefing für heute.
    document.querySelector(".bs-wahl")?.classList.toggle("abends", new Date().getHours() >= 17);
  }
  if (name === "balance") renderBalance();
  if (name === "standards") { renderStandards(); zeigeAngebot("standardsAngebot"); }
}

/**
 * Die fünf Bereiche als schmaler Streifen auf der Tagesansicht.
 *
 * Bewusst hier und nicht nur unter Balance: was man nur sieht, wenn man danach
 * sucht, sieht man nicht. Der Streifen zeigt den heutigen Tag, das ganze Board
 * mit Woche und Zielen liegt im Menue.
 */
/**
 * Die Tageswertung ganz oben.
 *
 * Aufbau wie ein Messwert, den man kennt: die Teilwerte klein darüber, mit
 * Richtung gegen gestern, darunter die eine Zahl gross. Wer nur die Zahl
 * sieht, weiss nicht, warum sie so ist. Wer nur die Teile sieht, muss rechnen.
 */
const URTEIL = [
  { ab: 85, wort: "Stark" },
  { ab: 70, wort: "Gut" },
  { ab: 50, wort: "Solide" },
  // "Dünn" und "Schwach" beschrieben den Nutzer, nicht den Tag, und bei einer
  // App, die auch Körpergewicht führt, liest sich "dünn" doppelt falsch. Ein
  // Urteil über einen Tag soll sagen, wie voll er war, nicht wie jemand ist.
  { ab: 30, wort: "Mager" },
  { ab: 0, wort: "Leer" },
];

/**
 * Baut eine Messwertzeile.
 *
 * Eine Funktion für alle: Tagesnutzung, die vier Teile darunter und die fünf
 * Lebensbereiche laufen durch dieselbe. Drei Bauarten für dieselbe Form wären
 * drei Stellen, an denen sie später auseinanderlaufen.
 */
function messwert({ name, wert, zusatz = "", anteil, ton, ziel, ueber = false }) {
  const el = document.createElement(ziel ? "button" : "div");
  el.className = "messwert";
  if (ziel) { el.type = "button"; el.addEventListener("click", () => showView(ziel)); }
  if (ton) el.style.setProperty("--ton", ton);

  const kopf = document.createElement("div");
  kopf.className = "messwert-kopf";
  const links = document.createElement("span");
  links.className = "messwert-name";
  links.textContent = name;
  const rechts = document.createElement("span");
  rechts.className = "messwert-wert";
  rechts.innerHTML = `<b>${escapeHtml(String(wert))}</b>${zusatz ? ` <span class="messwert-zusatz">${escapeHtml(zusatz)}</span>` : ""}`;
  kopf.append(links, rechts);

  const spur = document.createElement("div");
  spur.className = "balken";
  const fuellung = document.createElement("i");
  // Über hundert Prozent wird gedeckelt, sonst läuft der Balken aus seiner
  // Spur. Dass es mehr war, steht in der Zahl daneben und zusätzlich als
  // Schraffur: eine volle Spur allein sieht aus wie genau erreicht.
  fuellung.style.width = `${Math.max(0, Math.min(1, anteil)) * 100}%`;
  if (ueber || anteil > 1) fuellung.classList.add("drueber");
  spur.appendChild(fuellung);

  el.append(kopf, spur);
  return el;
}

function renderTagWertung() {
  const heute = tagesnutzungFuer(heuteTag);
  const gesternTag = new Date(`${heuteTag}T12:00:00`);
  gesternTag.setDate(gesternTag.getDate() - 1);
  const gestern = tagesnutzungFuer(gesternTag.toISOString().slice(0, 10));

  $("tagWert").textContent = String(heute.wert);
  $("tagUrteil").textContent = URTEIL.find((u) => heute.wert >= u.ab).wort;
  $("tagBalken").style.width = `${Math.max(0, Math.min(100, heute.wert))}%`;
  $("tagWertungSatz").textContent = heute.satz;

  // Jede Kennzahl führt dorthin, wo man sie ändern kann. Eine Zahl ohne Weg
  // zur Handlung ist nur eine Zahl.
  const ZIEL = { Balance: "balance", Aufgaben: "tag", Standards: "standards", Ernährung: "essen" };

  const metriken = $("tagMetriken");
  metriken.innerHTML = "";
  for (const teil of heute.teile) {
    const alt = gestern.teile.find((x) => x.name === teil.name);
    metriken.appendChild(messwert({
      name: teil.name,
      wert: teil.wert,
      zusatz: vergleichWort(teil.wert, alt?.wert),
      anteil: teil.wert / 100,
      ziel: ZIEL[teil.name],
    }));
  }
}

/**
 * Der Vergleich zu gestern in Worten statt als Pfeil.
 *
 * Ein Pfeil neben einer Zahl von 0 bis 100 sagt die Richtung und verschweigt
 * die Grösse. "plus 12" ist beides in derselben Breite. Unter drei Punkten
 * steht nichts: ein Punkt auf hundert ist Rauschen, und ein Pfeil auf Rauschen
 * erzeugt Aktionismus.
 */
function vergleichWort(jetzt, vorher) {
  if (!Number.isFinite(Number(vorher))) return "";
  const diff = Math.round(Number(jetzt) - Number(vorher));
  if (Math.abs(diff) < 3) return "wie gestern";
  return `${diff > 0 ? "+" : ""}${diff} zu gestern`;
}

/* ---------- Der Bericht ---------- */

/*
 * Die Zeichen der Berichtskarten.
 *
 * Alle auf demselben Raster von 24 und mit derselben Strichstärke, damit sie
 * als eine Familie lesbar sind. Gezeichnet und keine Emoji: die sehen auf
 * jedem Gerät anders aus und tragen eine fremde Farbigkeit in die Palette,
 * dieselbe Überlegung wie bei den vier Wegen ins Erfassen.
 *
 * Die Farbe kommt aus dem Design System. Kalorien und Protein tragen die
 * Makrofarben, die der Nutzer auf Heute schon kennt, Training und Energie die
 * Bereichsfarben. Eine achte Farbe nur für diese Karten wäre eine Farbe ohne
 * Bedeutung.
 */
const KARTEN_ZEICHEN = {
  // Eine Flamme, geschlossen gezeichnet statt als Pfad aus dem Nichts.
  // Eine Flamme mit Zunge. Der erste Entwurf war ein runder Klumpen mit einem
  // Strich darunter und las sich bei 20 Pixeln als Tropfen.
  kalorien: { pfad: "M12 21a6 6 0 0 0 6-6c0-4-3-6.5-6-12-3 5.5-6 8-6 12a6 6 0 0 0 6 6zM12 21a2.8 2.8 0 0 0 2.8-2.8c0-1.9-1.4-3-2.8-5.4-1.4 2.4-2.8 3.5-2.8 5.4A2.8 2.8 0 0 0 12 21z", ton: "var(--makro-fett)" },
  // Ein Knochen. Der erste Entwurf war eine Aminosäurekette, inhaltlich
  // richtig und bei 20 Pixeln ein Gekritzel.
  protein: { pfad: "M8.5 15.5l7-7M7.2 12.6a2.4 2.4 0 1 1 1.1-4 2.4 2.4 0 1 1 3.4 3.4M12.3 15.7a2.4 2.4 0 1 1 3.4 3.4 2.4 2.4 0 1 1 4-1.1", ton: "var(--makro-protein)" },
  wasser: { pfad: "M12 3.5c3.2 3.6 5 6.2 5 8.6a5 5 0 0 1-10 0c0-2.4 1.8-5 5-8.6z", ton: "var(--makro-wasser)" },
  training: { pfad: "M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10", ton: "var(--bereich-fitness)" },
  einheiten: { pfad: "M4 12l5 5L20 6", ton: "var(--bereich-fitness)" },
  schlaf: { pfad: "M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z", ton: "var(--bereich-wellbeing)" },
  schlafqualitaet: { pfad: "M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10zM12 2.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z", ton: "var(--bereich-wellbeing)" },
  energie: { pfad: "M13 3 5.5 13.5H11l-1 7.5 7.5-10.5H12z", ton: "var(--makro-kohlenhydrate)" },
  gewicht: { pfad: "M5 8h14l2 12H3zM9 8a3 3 0 0 1 6 0", ton: "var(--bereich-karriere)" },
};

/**
 * Die kleine Linie auf der Karte.
 *
 * Sie trägt keine Achse und keine Zahl. Ihre Aufgabe ist die Form: geht es
 * rauf, runter oder zappelt es. Für alles Genaue steht die Zahl darüber.
 *
 * Lücken unterbrechen die Linie, statt auf null zu fallen. Eine Linie, die an
 * jedem Tag ohne Eintrag den Boden berührt, behauptet einen Einbruch, den es
 * nicht gab, und das ist genau der Fehler, den diese App nirgends machen darf.
 *
 * Unter drei Werten wird nichts gezeichnet. Zwei Punkte ergeben immer eine
 * gerade Linie, und eine gerade Linie sieht nach einer Aussage aus.
 */
function sparkline(verlauf, breite = 224, hoehe = 34) {
  const werte = Array.isArray(verlauf) ? verlauf : [];
  const vorhanden = werte.filter((v) => v !== null && Number.isFinite(v));
  if (vorhanden.length < 3) return "";

  const min = Math.min(...vorhanden);
  const max = Math.max(...vorhanden);
  // Bei einer flachen Reihe hat die Spanne keine Höhe. Ohne diesen Fall
  // teilte die Rechnung durch null und jeder Punkt landete bei NaN.
  const spanne = max - min || 1;
  const rand = 3;
  const x = (i) => (werte.length > 1 ? (i / (werte.length - 1)) * (breite - 2 * rand) + rand : breite / 2);
  const y = (v) => hoehe - rand - ((v - min) / spanne) * (hoehe - 2 * rand);

  const stuecke = [];
  let offen = false;
  werte.forEach((v, i) => {
    if (v === null || !Number.isFinite(v)) { offen = false; return; }
    stuecke.push(`${offen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
    offen = true;
  });

  const letzterIndex = werte.length - 1 - [...werte].reverse().findIndex((v) => v !== null && Number.isFinite(v));
  const letzter = werte[letzterIndex];
  return `<svg class="funke" viewBox="0 0 ${breite} ${hoehe}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${stuecke.join(" ")}"></path>
      <circle cx="${x(letzterIndex).toFixed(1)}" cy="${y(letzter).toFixed(1)}" r="2.6"></circle>
    </svg>`;
}

/** Baut eine Karte des Berichts. */
function berichtKarte(w) {
  const zeichen = KARTEN_ZEICHEN[w.schluessel] ?? { pfad: "M5 12h14", ton: "var(--brand)" };
  const karte = document.createElement("div");
  karte.className = "karte";
  karte.style.setProperty("--ton", zeichen.ton);
  karte.innerHTML = `
    <div class="karte-kopf">
      <span class="karte-zeichen" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="${zeichen.pfad}"></path></svg>
      </span>
      <span class="karte-name">${escapeHtml(w.name)}</span>
    </div>
    <div class="karte-zahl">${escapeHtml(w.zahl)}${w.einheit ? `<span class="karte-einheit">${escapeHtml(w.einheit)}</span>` : ""}</div>
    <div class="karte-zusatz">${escapeHtml(w.zusatz)}</div>
    ${sparkline(w.verlauf)}
    <div class="karte-fuss">
      <span class="karte-trend${w.trend ? "" : " leise"}">${escapeHtml(w.trend || "kein Vergleich")}</span>
      <span>${w.tage} Tage</span>
    </div>`;
  return karte;
}

/**
 * Füllt die Zeitraumliste.
 *
 * Bei jedem Öffnen neu, denn mit jedem Monatswechsel kommt ein Eintrag dazu.
 * Die bisherige Wahl bleibt stehen, solange es sie noch gibt: wer im
 * September stand und zurückkommt, will nicht wieder bei vier Wochen landen.
 */
function berichtZeitraumFuellen() {
  const feld = $("berichtZeitraum");
  const vorher = feld.value;
  const liste = berichtZeitraeume();
  feld.innerHTML = liste
    .map((z) => `<option value="${escapeHtml(z.wert)}">${escapeHtml(z.name)}</option>`)
    .join("");
  // Sieben Tage als Voreinstellung. Über vier Wochen fehlt bei jemandem, der
  // die App erst seit zwei Wochen nutzt, jeder Vergleich, und auf jeder Karte
  // stand "kein Vergleich".
  feld.value = liste.some((z) => z.wert === vorher) ? vorher : "7";
}

function renderBericht() {
  // Der Rückblick der laufenden Woche. Rechnet er nicht, etwa ohne Profil,
  // fehlt nur der Abschnitt.
  try {
    const text = wochenrueckblickFuer().text;
    $("berichtRueckblickText").innerHTML = chatHtml(text);
    $("berichtRueckblick").hidden = !text;
    $("btnRueckblickShow").hidden = !text;
  } catch { $("berichtRueckblick").hidden = true; $("btnRueckblickShow").hidden = true; }
  const b = berichtFuer($("berichtZeitraum").value || "7");
  const zr = $("berichtZeitraum");
  $("btnBerichtShowUnter").textContent = /^\d+$/.test(zr.value || "7")
    ? "Eine Zahl je Karte, zum Teilen"
    : `Dein ${zr.selectedOptions[0]?.textContent?.replace(/, bisher$/, "") || "Monat"} wie ein Jahresrückblick, zum Teilen`;
  $("berichtKopf").textContent =
    `${spanneKurz(b.von, b.bis)}, ${b.tageMitDaten} von ${b.tageGesamt} Tagen mit Eintrag.`;

  const streifen = $("berichtWerte");
  streifen.innerHTML = "";
  for (const w of b.werte) streifen.appendChild(berichtKarte(w));
  if (!b.werte.length) {
    const leer = document.createElement("div");
    leer.className = "karte";
    leer.innerHTML = '<div class="karte-kopf"><span class="karte-name">Noch nichts zu berichten</span></div>'
      + '<div class="karte-zusatz">Trag ein paar Tage ein, dann steht hier etwas.</div>';
    streifen.appendChild(leer);
  }

  punkteBauen(streifen, $("berichtPunkte"), b.werte.length);
  $("berichtFazit").textContent = b.fazit.join("\n");
}

/**
 * Die Punkte unter dem Streifen.
 *
 * Ohne sie wischt niemand weiter: nichts auf der Seite sagt, dass hinter der
 * ersten Karte noch sechs liegen. Der aktive Punkt folgt dem Scrollstand und
 * nicht einem Zähler, den die App selbst führt. Sonst laufen beide
 * auseinander, sobald jemand mit Schwung über zwei Karten wischt.
 */
function punkteBauen(streifen, leiste, anzahl) {
  leiste.innerHTML = "";
  if (anzahl < 2) return;
  for (let i = 0; i < anzahl; i++) leiste.appendChild(document.createElement("i"));

  const setzen = () => {
    const karten = [...streifen.children];
    if (!karten.length) return;
    const mitte = streifen.scrollLeft + streifen.clientWidth / 2;
    let naechste = 0;
    let abstand = Infinity;
    karten.forEach((k, i) => {
      const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mitte);
      if (d < abstand) { abstand = d; naechste = i; }
    });
    [...leiste.children].forEach((punkt, i) => punkt.classList.toggle("an", i === naechste));
  };
  streifen.onscroll = setzen;
  setzen();
}

/*
 * Pfeiltasten schieben den Streifen um eine Karte.
 *
 * Wischen geht nur mit dem Finger. Auf dem Rechner und mit einer Tastatur
 * bliebe der Streifen sonst eine Reihe, aus der man nur die erste Karte
 * sieht, und das ist kein Bedienelement, sondern eine Sackgasse.
 */
$("berichtWerte").addEventListener("keydown", (event) => {
  const richtung = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  if (!richtung) return;
  event.preventDefault();
  const karte = $("berichtWerte").firstElementChild;
  if (!karte) return;
  $("berichtWerte").scrollBy({ left: richtung * (karte.offsetWidth + 12), behavior: "smooth" });
});

$("berichtZeitraum").addEventListener("change", renderBericht);
$("regenTempo").addEventListener("change", (e) => {
  store.setSettings({ ...store.getSettings(), regenTempo: e.target.value });
  renderRegeneration();
});

/*
 * Teilen, wo es das gibt, sonst in die Zwischenablage.
 *
 * `navigator.share` ist auf dem iPhone der kurze Weg in eine Nachricht, auf
 * dem Rechner gibt es ihn oft nicht. Ein Knopf, der dort nichts tut, wäre die
 * schlechtere Lösung als einer, der still kopiert.
 */
$("btnBerichtTeilen").addEventListener("click", async () => {
  const text = berichtText(berichtFuer($("berichtZeitraum").value || "28"));
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); toast("Bericht kopiert"); }
  } catch (fehler) {
    // Abbrechen im Teilen Dialog wirft ebenfalls. Das ist kein Fehler.
    if (fehler?.name !== "AbortError") toast("Das hat nicht geklappt");
  }
});

/* ---------- Apple Health ---------- */

/**
 * Der Import aus der Exportdatei.
 *
 * Erst lesen, dann anzeigen, dann schreiben. Ein Import, der erst schreibt und
 * danach berichtet, lässt dem Nutzer keine Wahl, und bei einer Datei mit zwei
 * Jahren Daten ist das die falsche Reihenfolge.
 *
 * Der Fortschritt steht am Knopf. Eine Exportdatei von jemandem, der lange
 * eine Uhr trägt, braucht zwanzig Sekunden und mehr, und ein Knopf, der sich
 * dabei nicht rührt, sieht aus wie eine hängende App.
 */
$("btnHealthDatei").addEventListener("click", () => $("healthDatei").click());

$("healthDatei").addEventListener("change", async (event) => {
  const datei = event.target.files?.[0];
  event.target.value = "";
  if (!datei) return;

  const knopf = $("btnHealthDatei");
  const ausgabe = $("healthBericht");
  knopf.disabled = true;
  ausgabe.hidden = false;
  ausgabe.textContent = "Ich lese die Datei.";

  try {
    const ergebnis = await healthDateiLesen(datei, {
      aufFortschritt: (zeichen) => {
        knopf.textContent = `${Math.round(zeichen / 1_000_000)} MB gelesen`;
      },
    });
    knopf.textContent = "Ich schreibe die Tage";
    ausgabe.textContent = schreibBericht(healthSchreiben(ergebnis, { store }), ergebnis);
    healthStandZeigen();
    // Der Import setzt das Profilgewicht. `profile` ist eine Kopie im Modul,
    // und ohne das Nachladen zeigt das Feld weiter den alten Wert, den der
    // nächste Druck auf Speichern dann wieder zurückschreibt.
    profile = store.getProfile();
    renderProfile();
    refreshAll();
  } catch (fehler) {
    ausgabe.textContent = `Das hat nicht geklappt: ${fehler.message}`;
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Export auswählen";
  }
});

/** Wann zuletzt importiert wurde. Ohne das weiss niemand, wie alt die Kopie ist. */
function healthStandZeigen() {
  const s = store.getSettings();
  const stand = s.healthImport;
  $("healthStand").textContent = stand?.at
    ? `Zuletzt eingelesen am ${stand.at.slice(0, 10)}, ${stand.tage} Tage.`
    : "Noch nichts eingelesen.";
  const kurz = s.healthKurzbefehl;
  $("healthKurzStand").textContent = kurz?.at
    ? `Zuletzt über den Kurzbefehl: ${new Date(kurz.at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}.`
    : "Über den Kurzbefehl ist noch nichts angekommen.";
  $("e-healthUrl").value = workerAdresse("gesundheit");
  $("e-healthErnaehrung").checked = !s.healthErnaehrungAus;
}

// Ausschalten entfernt die Mahlzeiten aus Health beim nächsten Abgleich,
// und der kommt sofort.
$("e-healthErnaehrung").addEventListener("change", (event) => {
  store.setSettings({ ...store.getSettings(), healthErnaehrungAus: !event.target.checked });
  healthNativ().then(() => refreshAll());
});

/**
 * Holt die Werte, die der Health Kurzbefehl auf dem Worker abgelegt hat.
 *
 * Läuft still bei jedem Öffnen, wie das Postfach. Schritte im Hintergrund
 * nachzutragen ist kein Ereignis, das eine Meldung braucht. Laut nur, wenn
 * der Nutzer selbst auf den Knopf drückt.
 */
let gesundheitLaeuft = false;
async function gesundheitPruefen({ laut = false } = {}) {
  const s = store.getSettings();
  if (gesundheitLaeuft) return;
  if (!s.pushWorker || !s.pushWort) {
    if (laut) toast("Dafür brauchst du Adresse und Anmeldewort des Push Workers im Profil.");
    return;
  }
  gesundheitLaeuft = true;
  try {
    const tage = await gesundheitHolen({ worker: s.pushWorker, wort: s.pushWort });
    const bericht = kurzbefehlSchreiben(tage, { store, heute: todayIso() });
    if (!bericht) {
      if (laut) toast("Vom Kurzbefehl liegt nichts bereit.");
      return;
    }
    if (laut) toast(`Health: ${bericht.tage} ${bericht.tage === 1 ? "Tag" : "Tage"} übernommen.`);
    profile = store.getProfile();
    refreshAll();
    healthStandZeigen();
  } catch (fehler) {
    if (laut) toast(`Health: ${fehler.message}`);
  } finally {
    gesundheitLaeuft = false;
  }
}

$("btnHealthAbholen").addEventListener("click", () => gesundheitPruefen({ laut: true }));
$("btnHealthKopieren").addEventListener("click", async () => {
  const text = workerAdresse("gesundheit");
  if (!text.startsWith("http")) { toast(text); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast("Adresse kopiert");
  } catch {
    $("e-healthUrl").select?.();
    toast("Kopieren ging nicht. Feld ist markiert, kopier von Hand.");
  }
});

/* ---------- Bereitschaft und Belastung ---------- */

/**
 * Sammelt die Tage aus dem Speicher.
 *
 * Beide Module rechnen über dasselbe Fenster, deshalb wird einmal gelesen und
 * zweimal benutzt. `allDays` kann über achtzig Tage liefern, und der Speicher
 * ist der langsamste Teil dieser Kette.
 */
function tageFuerBelastung() {
  const tage = {};
  for (const tag of store.allDays()) tage[tag] = store.getDay(tag);
  return tage;
}

/**
 * Der letzte Wochenbogen mit seinem Alter.
 *
 * Das Alter geht mit, weil Stress im Check-in steht und nicht heute Morgen
 * gemessen wurde. Ein Wert von vorletzter Woche darf die Bereitschaft von
 * heute nicht mehr bestimmen, und die Entscheidung darüber gehört in den
 * Rechenkern, nicht hierher.
 */
function letzterStress() {
  const boegen = store.getCheckinBoegen().filter((b) => Number.isFinite(Number(b?.werte?.stress)));
  const letzter = boegen.sort((a, b) => String(a.tag).localeCompare(String(b.tag))).pop();
  if (!letzter) return { stress: null, stressAlterTage: null };
  const tage = Math.round((Date.parse(`${todayIso()}T00:00:00Z`) - Date.parse(`${letzter.tag}T00:00:00Z`)) / 86400000);
  return { stress: Number(letzter.werte.stress), stressAlterTage: Number.isFinite(tage) ? tage : null };
}

/* ---------- Schlaf und Körpersignale ----------
 *
 * Gebaut aus den Teilen, die daevo schon hat: der Wertungsring wie bei der
 * Bereitschaft, Balkenzeilen wie bei Makros und Balance, die Linie aus dem
 * Bericht. Die Phasen tragen Farben aus der Familie der Bereiche, alle mit
 * demselben Kontrast, keine Ampel. Kästen nur, wo eine Fläche etwas
 * zusammenhält.
 */

let schlafTag = null;
let schlafNacht = null;

/** Phase, Name und Farbe, von wach nach tief. Eigene Töne aus der Familie der Makros, heller. */
const PHASEN = [
  ["w", "Wach", "var(--schlaf-wach)"],
  ["r", "REM", "var(--schlaf-rem)"],
  ["c", "Kern", "var(--schlaf-kern)"],
  ["d", "Tief", "var(--schlaf-tief)"],
];
const PHASE_FARBE = Object.fromEntries(PHASEN.map(([k, , f]) => [k, f]));
const uhrAus = (ms) => new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

/**
 * Der Verlauf der Nacht als Treppe: oben wach, unten tief, verbunden mit
 * einer dünnen Linie, wie in Apple Health. Ein Tipp auf eine Phase nennt
 * Uhrzeit und Dauer darüber. Gewählt vom Nutzer aus drei Entwürfen.
 */
function hypnogramm(nacht) {
  const B = 326, L = 38, R = 4, oben = 6, h = 30;
  const H = oben + 4 * h + 20;
  const ebene = { w: 0, r: 1, c: 2, d: 3 };
  const gesamt = Math.max(1, (nacht.ende - nacht.beginn) / 60000);
  const x = (m) => L + (m / gesamt) * (B - L - R);
  const y = (p) => oben + ebene[p] * h + h / 2;
  const linien = PHASEN.map(([k, n]) => `<text x="0" y="${y(k) + 4}" font-size="11" fill="currentColor" fill-opacity="0.55">${n}</text>`
    + `<line x1="${L}" x2="${B - R}" y1="${y(k)}" y2="${y(k)}" stroke="currentColor" stroke-opacity="0.06"/>`).join("");
  let d = "";
  nacht.phasen.forEach(([von, dauer, p], i) => { d += `${i ? "L" : "M"}${x(von).toFixed(1)},${y(p)}L${x(von + dauer).toFixed(1)},${y(p)}`; });
  const treppe = `<path d="${d}" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.5"/>`;
  const flaechen = nacht.phasen.map(([von, dauer, p], i) =>
    `<rect data-ph="${i}" x="${x(von).toFixed(1)}" y="${y(p) - 5}" width="${Math.max(3, x(von + dauer) - x(von)).toFixed(1)}" height="10" fill="${PHASE_FARBE[p]}"/>`).join("");
  const erste = new Date(nacht.beginn); erste.setMinutes(60, 0, 0);
  let achse = "";
  for (let t = erste.getTime(); t < nacht.ende; t += 3600000) {
    const m = (t - nacht.beginn) / 60000;
    achse += `<text x="${x(m)}" y="${H - 4}" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity="0.45">${String(new Date(t).getHours()).padStart(2, "0")}</text>`;
  }
  const legende = PHASEN.map(([k, n]) => `<span><i style="background:${PHASE_FARBE[k]}"></i>${n}</span>`).join("");
  return `<div class="schlaf-tipp"><span>${uhrAus(nacht.beginn)} bis ${uhrAus(nacht.ende)}</span><b>Tippe auf eine Phase</b></div>`
    + `<svg class="schlaf-verlauf" viewBox="0 0 ${B} ${H}" role="img" aria-label="Schlafphasen im Verlauf der Nacht">${linien}${treppe}${flaechen}${achse}</svg>`
    + `<div class="schlaf-legende" aria-hidden="true">${legende}</div>`;
}

/** Zeigt die angetippte Phase über der Kurve. */
function schlafPhaseZeigen(nacht, i) {
  const [von, dauer, p] = nacht.phasen[i] ?? [];
  if (p === undefined) return;
  const name = PHASEN.find(([k]) => k === p)?.[1] ?? "";
  const a = nacht.beginn + von * 60000;
  $("schlafInhalt").querySelector(".schlaf-tipp").innerHTML = `<span>${uhrAus(a)} bis ${uhrAus(a + dauer * 60000)}</span><b style="color:${PHASE_FARBE[p]}">${name}, ${kurzDauer(Math.round(dauer))}</b>`;
  $("schlafInhalt").querySelectorAll("[data-ph]").forEach((r) => r.classList.toggle("an", r.dataset.ph === String(i)));
}

const SIGNAL = {
  hrv: { name: "HRV", einheit: "ms", ton: "var(--bereich-me_time)", hoch: "gut" },
  ruhepuls: { name: "Ruhepuls", einheit: "bpm", ton: "var(--bereich-beziehung)", hoch: "schlecht" },
  atemfrequenz: { name: "Atemfrequenz", einheit: "je min", ton: "var(--makro-wasser)", hoch: "schlecht" },
  handgelenkTemp: { name: "Hauttemperatur nachts", einheit: "°C", ton: "var(--makro-fett)", hoch: "schlecht" },
};

function kommaZahl(x, stellen = 0) {
  return (Math.round(x * 10 ** stellen) / 10 ** stellen).toLocaleString("de-DE", { maximumFractionDigits: stellen });
}

/** Die Körpersignale gegen den eigenen Schnitt, als Zeilen mit Linie über 14 Tage. */
function koerperHtml() {
  const heute = todayIso();
  const lage = koerperlage(signalTage(heute), heute);
  const g = store.getDay(heute).gesundheit || {};
  const gestern = store.getDay(tagVor(heute, 1)).gesundheit || {};
  const tag = Number.isFinite(g.pulsSchnitt) ? g : gestern;
  const zeilen = lage.signale.map((sig) => {
    const d = SIGNAL[sig.art];
    const stellen = sig.art === "handgelenkTemp" || sig.art === "atemfrequenz" ? 1 : 0;
    const wert = sig.art === "handgelenkTemp" && sig.abweichung !== null
      ? `${sig.abweichung > 0 ? "+" : ""}${kommaZahl(sig.abweichung, 1)} °C`
      : `${kommaZahl(sig.wert, stellen)} ${d.einheit}`;
    const gegen = sig.basis === null ? "eigener Schnitt ab sieben Tagen"
      : sig.art === "handgelenkTemp" ? "gegen deinen Schnitt"
      // Schnitt und Abstand mit einer Stelle: ein Median von 49,5 und ein Abstand
      // von 2,5 hiessen gerundet "+3 · im Rahmen", obwohl 3 die Grenze ist.
      : `Schnitt ${kommaZahl(sig.basis, 1)}, ${sig.abweichung > 0 ? "+" : ""}${kommaZahl(sig.abweichung, 1)}`;
    const wort = { belastet: "spricht für Belastung", erholt: "spricht für Erholung", im_rahmen: "im Rahmen", offen: "" }[sig.richtung];
    return `<div class="ks-zeile" style="--ton:${d.ton}">
      <div class="ks-kopf"><span class="ks-name">${d.name}</span><span class="ks-wert"><b>${escapeHtml(wert)}</b></span></div>
      ${sparkline(sig.verlauf, 320, 30)}
      <p class="ks-unter">${escapeHtml(gegen)}${wort ? ` · ${wort}` : ""}</p>
    </div>`;
  }).join("");
  const extra = [];
  if (Number.isFinite(tag.pulsSchnitt)) extra.push(["Puls über den Tag", `${Math.round(tag.pulsSchnitt)} bpm`, `${Number.isFinite(tag.pulsMin) ? `tiefster ${Math.round(tag.pulsMin)}` : ""}${Number.isFinite(tag.pulsMax) ? `, höchster ${Math.round(tag.pulsMax)}` : ""}`]);
  if (Number.isFinite(tag.gehpuls)) extra.push(["Gehpuls", `${Math.round(tag.gehpuls)} bpm`, "Schnitt beim Gehen"]);
  const o2 = Number.isFinite(g.sauerstoff) ? g.sauerstoff : gestern.sauerstoff;
  if (Number.isFinite(o2)) extra.push(["Sauerstoff im Blut", `${Math.round(o2 <= 1 ? o2 * 100 : o2)} %`, "Schnitt der Messungen"]);
  let achtsam = 0;
  for (let i = 0; i < 7; i++) achtsam += Number(store.getDay(tagVor(heute, i)).gesundheit?.achtsamMinuten) || 0;
  if (achtsam) extra.push(["Achtsamkeit", `${Math.round(achtsam)} min`, "in den letzten sieben Tagen"]);
  if (!zeilen && !extra.length) {
    return `<h2 class="abschnitt">Körpersignale</h2><p class="sub">Noch keine Werte. HRV, Ruhepuls, Puls, Atmung, Sauerstoff und
      Temperatur kommen aus Apple Health, von der Apple Watch und auch von Oura, Garmin oder Whoop, wenn deren App mit Health teilt.</p>`;
  }
  const stufe = { entspannt: "Entspannt", im_rahmen: "Im Rahmen", angespannt: "Angespannt", offen: "" }[lage.stufe];
  return `<h2 class="abschnitt">Körpersignale</h2>
    ${stufe ? `<p class="ks-lage ks-${lage.stufe}"><b>${stufe}</b> ${escapeHtml(lage.text)}</p>` : `<p class="sub">${escapeHtml(lage.text)}</p>`}
    <div class="ks-liste">${zeilen}</div>
    ${extra.length ? `<div class="ks-zahlen">${extra.map(([n, w, u]) => `<div><small>${n}</small><b>${w}</b><span>${escapeHtml(u)}</span></div>`).join("")}</div>` : ""}
    <details class="info-klapp"><summary>So rechnet daevo</summary><p class="fineprint">Einen Stresswert speichert Apple Health nicht, und Garmin, Oura und Whoop geben ihren nicht weiter.
      daevo leitet die Lage aus HRV, Ruhepuls, Atmung und Temperatur gegen deinen eigenen Schnitt der letzten 28 Tage ab.
      Eine niedrigere HRV und ein höherer Ruhepuls treten bei Stress, wenig Schlaf, viel Training und beginnenden Infekten
      auf (Kim und andere 2018, Buchheit 2014). Das ist eine Ableitung und keine Messung.</p></details>`;
}

function renderSchlaf() {
  const profil = store.getProfile();
  const heute = todayIso();
  const tage = Array.from({ length: 7 }, (_, i) => tagVor(heute, 6 - i));
  const nacht = (tag) => store.getDay(tag).gesundheit?.nacht ?? null;
  if (!schlafTag || !tage.includes(schlafTag)) schlafTag = [...tage].reverse().find((t) => nacht(t)) ?? heute;
  const werte = Object.fromEntries(tage.map((t) => {
    const n = nacht(t);
    return [t, n ? schlafwert({ tag: t, ...n }, schlafZiel(tagesrandFuer(profil, tagVor(t, 1)).sleepTime, tagesrandFuer(profil, t).wakeTime)) : null];
  }));
  const kurz = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const inhalt = $("schlafInhalt");
  inhalt.innerHTML = "";

  // Die Woche als kleine Ringe in der Markenfarbe, wie die Kennzahlen auf Heute.
  const woche = document.createElement("div");
  woche.className = "schlaf-woche";
  woche.setAttribute("role", "tablist");
  for (const t of tage) {
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = `schlaf-tag${t === schlafTag ? " an" : ""}`;
    knopf.dataset.schlafTag = t;
    knopf.setAttribute("role", "tab");
    knopf.setAttribute("aria-selected", String(t === schlafTag));
    const d = new Date(`${t}T12:00:00`);
    const name = document.createElement("span");
    name.textContent = kurz[d.getDay()];
    knopf.append(name, ringMitZahl({ anteil: (werte[t]?.wert ?? 0) / 100, zahl: d.getDate(), groesse: 38 }));
    woche.appendChild(knopf);
  }
  inhalt.appendChild(woche);

  const n = nacht(schlafTag);
  schlafNacht = n;
  const w = werte[schlafTag];
  const g = store.getDay(schlafTag).gesundheit || {};
  const rest = document.createElement("div");
  if (!n || !w) {
    rest.innerHTML = `${Number.isFinite(g.schlafMinuten)
      ? `<p class="sub">In dieser Nacht stehen ${kurzDauer(g.schlafMinuten)} Schlaf in Apple Health, aber keine Phasen.</p>` : ""}
      <p class="sub">Schlafphasen kommen aus Apple Health, auch von Oura, Garmin und Whoop.</p>${koerperHtml()}`;
    inhalt.appendChild(rest);
    return;
  }

  const held = document.createElement("div");
  held.className = "wertung";
  held.appendChild(wertungsRing({ wert: w.wert, etikett: "SCHLAF", urteil: w.wert >= 80 ? "erholsam" : w.wert >= 60 ? "okay" : "zu wenig", groesse: 220 }));
  inhalt.appendChild(held);

  const uhr = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const sp = PHASEN_SPANNE;
  const phase = { w: [n.wachMin, null], r: [n.remMin, sp.rem], c: [n.kernMin, sp.kern], d: [n.tiefMin, sp.tief] };
  rest.innerHTML = `
    <p class="schlaf-satz"><b>${kurzDauer(w.schlafMin)}</b> geschlafen, Ziel ${kurzDauer(w.zielMin)}</p>
    <div class="ks-zahlen">
      <div><small>Eingeschlafen</small><b>${uhr(n.beginn)}</b></div>
      <div><small>Aufgewacht</small><b>${uhr(n.ende)}</b></div>
      <div><small>Effizienz</small><b>${w.effizienz} %</b></div>
      <div><small>Wach geworden</small><b>${n.wachPhasen ?? (n.phasen ?? []).filter((p) => p[2] === "w").length}×</b></div>
    </div>
    <h2 class="abschnitt">Phasen</h2>
    <div class="schlaf-balken">${PHASEN.map(([k]) => (phase[k][0] ? `<span style="flex:${phase[k][0]};background:${PHASE_FARBE[k]}"></span>` : "")).join("")}</div>
    ${n.phasen?.length ? hypnogramm(n) : ""}
    <div class="messwerte" id="schlafPhasen"></div>
    ${koerperHtml()}
    <p class="fineprint">Gemessen von ${escapeHtml(n.quelle || "deiner Uhr")}, gelesen aus Apple Health. Uhren und Ringe erkennen Schlaf und
      Wachsein recht gut, die Phasen deutlich ungenauer (de Zambotti und andere 2019). Der Schlafwert ist eine Regel
      von daevo: Dauer gegen dein Ziel 50, Effizienz 20, Tief 15 und REM 15 Punkte. Das Ziel ist dein Plan aus
      Schlafens und Aufstehzeit, nie unter sieben Stunden (Watson und andere 2015). Die üblichen Spannen sind
      Richtwerte für junge Erwachsene nach Ohayon und andere 2004, keine Diagnose.</p>`;
  inhalt.appendChild(rest);
  // Dieselben Balkenzeilen wie bei Makros und Balance. Der Balken misst den
  // Anteil gegen das obere Ende der üblichen Spanne.
  const ziel = rest.querySelector("#schlafPhasen");
  for (const [k, name, ton] of PHASEN) {
    const [m, spanne] = phase[k];
    const anteil = Math.round((m / w.schlafMin) * 100);
    ziel.appendChild(messwert({
      name, wert: kurzDauer(m),
      zusatz: spanne ? `${anteil} %, üblich ${spanne[0]} bis ${spanne[1]}` : "kurzes Aufwachen ist normal",
      anteil: spanne ? anteil / spanne[1] : Math.min(1, m / 60), ton,
    }));
  }
}

$("schlafInhalt").addEventListener("click", (e) => {
  const ph = e.target.closest("[data-ph]");
  if (ph && schlafNacht) { schlafPhaseZeigen(schlafNacht, Number(ph.dataset.ph)); return; }
  const t = e.target.closest("[data-schlaf-tag]");
  if (!t) return;
  schlafTag = t.dataset.schlafTag;
  renderSchlaf();
});

/** Gefühl je Partie: kein Eintrag, frisch, Muskelkater, wieder von vorn. */
const REGEN_STUFE = { "": "frisch", frisch: "kater", kater: "" };

function renderRegeneration() {
  const s = store.getSettings();
  const tempo = s.regenTempo || "normal";
  $("regenTempo").value = tempo;
  const partien = regeneration(regenTrainings(store), Date.now(), { tempo, gefuehl: regenGefuehlHeute(s, todayIso()) });
  const werte = Object.fromEntries(partien.map((p) => [p.id, p.prozent]));
  $("regenKarte").innerHTML = regenerationSvg(werte, regenFarbton, { farben: hellerModus() ? KARTE_HELL : KARTE_DUNKEL });
  const bekannt = partien.filter((p) => p.stand !== "keine");
  $("regenSub").textContent = bekannt.length
    ? `${bekannt.filter((p) => p.stand === "erholt" || p.stand === "faellig").length} von ${bekannt.length} trainierten Partien sind wieder frisch.`
    : "Noch kein Training mit Übungen in den letzten 4 Wochen.";
  // Müde zuerst, dann fällig: das sind die zwei, nach denen man plant.
  const rang = { muede: 0, faellig: 1, fast: 2, erholt: 3, keine: 4 };
  const liste = $("regenListe");
  liste.innerHTML = "";
  // Partien ohne Training stehen als eine Reihe kleiner Chips und nicht als
  // eigene Zeile: neunzehnmal "nicht trainiert" untereinander war eine
  // Bildschirmhöhe ohne Information. Antippen geht dort genauso.
  const ohne = $("regenOhne");
  ohne.innerHTML = "";
  const ohneListe = partien.filter((p) => p.stand === "keine" && !p.gefuehl);
  ohne.hidden = !ohneListe.length;
  if (ohneListe.length) ohne.insertAdjacentHTML("afterbegin", `<small>${bekannt.length ? "Nicht trainiert in 4 Wochen" : "Muskelkater? Tippe die Partie an"}</small>`);
  for (const p of [...partien].sort((a, b) => rang[a.stand] - rang[b.stand] || (a.prozent ?? 101) - (b.prozent ?? 101))) {
    const chip = ohneListe.includes(p);
    const zeile = document.createElement("button");
    zeile.type = "button";
    zeile.className = chip ? "regen-chip" : "regen-zeile";
    const farbe = p.prozent === null ? "var(--muted)" : `hsl(${regenFarbton(p.prozent)} 72% 50%)`;
    if (chip) zeile.textContent = REGIONEN[p.id] ?? p.id;
    else zeile.innerHTML = `<span class="regen-punkt" style="background:${farbe}"></span>
      <span class="regen-text"><b>${REGIONEN[p.id] ?? p.id}</b><small>${regenSatz(p)}</small></span>
      <span class="regen-wert">${p.prozent === null ? "–" : `${p.prozent}%`}${p.gefuehl ? `<small>${p.gefuehl === "frisch" ? "frisch" : "Kater"}</small>` : ""}</span>`;
    zeile.setAttribute("aria-label", `${REGIONEN[p.id] ?? p.id}, tippen ändert dein Gefühl für heute`);
    zeile.addEventListener("click", () => {
      const st = store.getSettings();
      const heute = regenGefuehlHeute(st, todayIso());
      const neu = REGEN_STUFE[heute[p.id] ?? ""];
      if (neu) heute[p.id] = neu; else delete heute[p.id];
      store.setSettings({ ...st, regenGefuehl: { datum: todayIso(), werte: heute } });
      renderRegeneration();
    });
    (chip ? ohne : liste).appendChild(zeile);
  }
}

function renderBereitschaft() {
  renderRegeneration();
  const last = belastung({ tage: tageFuerBelastung(), heute: todayIso() });
  const lk = belastungKurz(last);
  $("belastungZahl").textContent = lk.prozent === null ? "–" : `${lk.prozent} %`;
  $("belastungZahl").dataset.lage = lk.lage ?? "";
  $("belastungUrteil").textContent = lk.urteil;
  $("belastungSatz").textContent = lk.satz;

  // Der Morgen Check-in von heute. Gibt es mehrere, gilt der letzte: wer
  // zweimal antwortet, hat sich korrigiert.
  const morgen = (store.getDay(todayIso()).checkins || [])
    .filter((c) => c.kind === "morning")
    .pop();

  const b = bereitschaft({
    schlafQualitaet: morgen?.sleepQuality ?? null,
    energie: morgen?.energy ?? null,
    belastung: last,
    ...letzterStress(),
  });

  const ring = $("bereitschaftRing");
  ring.innerHTML = "";
  const teile = $("bereitschaftTeile");
  if (!b) {
    teile.innerHTML = "";
    $("bereitschaftSub").textContent = bereitschaftText(null);
    return;
  }

  ring.appendChild(wertungsRing({
    wert: b.wert,
    etikett: "BEREITSCHAFT",
    urteil: b.urteil === "bereit" ? "Gas geben" : b.urteil === "solide" ? "trägt" : "runterfahren",
    groesse: 230,
  }));
  // Nur der Rat, nicht der ganze Text. Die Teile stehen darunter als Liste,
  // und die Grenze der Zahl steht fest im HTML.
  $("bereitschaftSub").textContent = bereitschaftText(b).split("\n").filter(Boolean).slice(-2)[0];
  // Dieselben Balken wie auf Heute und Balance. Vorher standen die Teile als
  // gerahmte Karten mit "78 von 100" im Titel, eine dritte Form für dieselbe
  // Aussage: wie voll ist dieser Teil.
  teile.innerHTML = "";
  for (const t of b.teile) {
    // Die Quelle je Teil steht im Tooltip und unter "So rechnet daevo", nicht
    // als dritte Zeile: dreimal "aus deinem Morgen Check-in" war Lärm.
    const zeile = messwert({ name: t.name, wert: t.wert, zusatz: "von 100", anteil: t.wert / 100, ton: TEIL_TON[t.name] });
    zeile.title = `aus ${t.quelle}`;
    teile.appendChild(zeile);
  }
}

/** Die Farbe je Teil der Bereitschaft, aus den Farben, die es schon gibt. */
const TEIL_TON = {
  Schlaf: "var(--bereich-wellbeing)",
  Energie: "var(--makro-kohlenhydrate)",
  Belastung: "var(--bereich-fitness)",
  Ruhe: "var(--bereich-me_time)",
};

/**
 * Was Apple Health für den gezeigten Tag weiss. Nur was gemessen ist, steht
 * da: eine Kachel ohne Wert wäre eine Null, die niemand gemessen hat. In der
 * iPhone App steht der Abschnitt immer, damit sichtbar ist, ob der Abgleich
 * läuft, im Browser nur mit Daten aus Export oder Kurzbefehl.
 */
/** Diese Karten führen in die Ansicht Erholung mit Schlaf und Körpersignalen. */
const ZUR_ERHOLUNG = new Set(["Schlaf", "Ruhepuls", "HRV", "Puls", "Sauerstoff"]);

function renderBewegung(n, istHeute) {
  const d = n.data;
  const g = d.gesundheit || {};
  const kacheln = [];
  const zahlText = (x) => Math.round(x).toLocaleString("de-DE");
  if (Number.isFinite(d.steps)) {
    const ziel = Number(n.profile.dailySteps) || 0;
    kacheln.push(["schuh", "fitness", "Schritte", zahlText(d.steps), "", ziel ? `Schnitt ${zahlText(ziel)}` : "", ziel ? d.steps / ziel : null]);
  }
  if (Number.isFinite(g.aktivKcal)) kacheln.push(["blitz", "fett", "Aktive Kalorien", zahlText(g.aktivKcal), "kcal", "laut Apple Watch", null]);
  if (Number.isFinite(g.schlafMinuten)) kacheln.push(["schlaf", "wellbeing", "Schlaf", `${Math.floor(g.schlafMinuten / 60)}:${String(Math.round(g.schlafMinuten % 60)).padStart(2, "0")}`, "h", "Nacht davor", g.schlafMinuten / 480]);
  if (Number.isFinite(g.ruhepuls)) kacheln.push(["puls", "beziehung", "Ruhepuls", `${Math.round(g.ruhepuls)}`, "bpm", "Schläge je Minute", null]);
  if (Number.isFinite(g.hrv)) kacheln.push(["herz", "me_time", "HRV", `${Math.round(g.hrv)}`, "ms", "Schnitt des Tages", null]);
  if (Number.isFinite(g.pulsSchnitt)) kacheln.push(["puls", "beziehung", "Puls", `${Math.round(g.pulsSchnitt)}`, "bpm", Number.isFinite(g.pulsMin) && Number.isFinite(g.pulsMax) ? `${Math.round(g.pulsMin)} bis ${Math.round(g.pulsMax)} heute` : "Schnitt des Tages", null]);
  if (Number.isFinite(g.sauerstoff)) kacheln.push(["welle", "wasser", "Sauerstoff", `${Math.round(g.sauerstoff <= 1 ? g.sauerstoff * 100 : g.sauerstoff)}`, "%", "im Blut", null]);
  if (Number.isFinite(g.trainingsMinuten)) kacheln.push(["stoppuhr", "karriere", "Training", `${Math.round(g.trainingsMinuten)}`, "min", "Apple Ring", g.trainingsMinuten / 30]);
  // Je Wert ein Zeichen in einer Farbe aus der Familie der Bereiche und
  // Makros: der Nutzer wollte Karten, die man am Zeichen erkennt, ohne das
  // Wort zu lesen. Der Balken unten nur, wo es ein Ziel gibt, sonst wäre er
  // eine Zahl ohne Bezug. Schlaf misst gegen acht Stunden, die Ringminuten
  // gegen die 30 von Apple.
  const farbe = (t) => ["fett", "protein", "kohlenhydrate", "wasser"].includes(t) ? `var(--makro-${t})` : `var(--bereich-${t})`;
  $("bwRaster").innerHTML = kacheln.map(([sym, ton, name, wert, einheit, zusatz, anteil]) =>
    (ZUR_ERHOLUNG.has(name) ? `<button type="button" class="bw-karte bw-knopf" data-go="schlaf" style="--ton:${farbe(ton)}">` : `<div class="bw-karte" style="--ton:${farbe(ton)}">`)
    + `<div class="bw-kopf"><span class="bw-sym">${symbol(sym, { groesse: 18 })}</span><span class="bw-name">${escapeHtml(name)}</span></div>`
    + `<p class="bw-wert"><b>${escapeHtml(wert)}</b>${einheit ? `<i>${escapeHtml(einheit)}</i>` : ""}</p>`
    + (anteil !== null ? `<span class="bw-spur"><span style="width:${Math.round(Math.min(1, Math.max(0, anteil)) * 100)}%"></span></span>` : "")
    + (zusatz ? `<small>${escapeHtml(zusatz)}</small>` : "")
    + (ZUR_ERHOLUNG.has(name) ? `</button>` : `</div>`)).join("");

  const trainings = (d.trainings || []).filter((t) => t.minutes > 0);
  const ART = { strength: "Krafttraining", cardio: "Ausdauer", team_sport: "Mannschaftssport", mobility: "Mobilität" };
  $("bwTrainings").innerHTML = trainings.length
    ? `<ul class="bw-trainings">${trainings.map((t) => {
        const teile = [`${t.minutes} min`, t.kcal ? `${zahlText(t.kcal)} kcal` : "", t.puls ? `Puls ${t.puls}${t.pulsMax ? `, max ${t.pulsMax}` : ""}` : ""].filter(Boolean);
        const sym = t.type === "strength" ? "hantel" : t.type === "cardio" ? "laufen" : t.type === "mobility" ? "welle" : "puls";
        return `<li><span class="bw-sym">${symbol(sym, { groesse: 18 })}</span><span class="bw-tr-name"><b>${escapeHtml(t.name || ART[t.type] || "Training")}${t.at ? ` <small>${escapeHtml(t.at)}</small>` : ""}</b><small>${escapeHtml(teile.join(" · "))}</small></span></li>`;
      }).join("")}</ul>`
    : "";

  const a = n.aktivitaet;
  const aus = store.getSettings().aktivZumZiel === false;
  $("bwZiel").innerHTML = a
    ? `${aus ? "Die Uhr misst" : "Dein Ziel rechnet schon mit"} ${aus ? `${zahlText(a.gemessenKcal)} kcal Bewegung, aufs Ziel kommt davon nichts, so ist es eingestellt.` : `${zahlText(a.geplantKcal)} kcal Bewegung am Tag. Die Uhr misst ${zahlText(a.gemessenKcal)} kcal${a.zuschlagKcal > 0 ? `, ${zahlText(a.zuschlagKcal)} kcal sind deshalb aufs Ziel gekommen.` : ". Was darüber liegt, kommt aufs Ziel, bisher nichts."}`}`
      + ` <button type="button" class="link-knopf" id="bwZielSchalter">${aus ? "Wieder aufs Ziel rechnen" : "Nicht aufs Ziel rechnen"}</button>`
    : "";

  const stand = store.getSettings().healthNativ || store.getSettings().healthKurzbefehl || store.getSettings().healthImport;
  const nativ = istNativ();
  if (!kacheln.length && !trainings.length) {
    $("bwStand").textContent = nativ
      ? (stand?.at
        ? `Für ${istHeute ? "heute" : "diesen Tag"} steht noch nichts aus Apple Health da. Fehlt etwas, prüf in den iPhone Einstellungen unter Health, Datenzugriff und Geräte, daevo, ob alles erlaubt ist.`
        : "Noch kein Abgleich mit Apple Health. Erlaube daevo den Zugriff in den iPhone Einstellungen unter Health, Datenzugriff und Geräte, daevo, und öffne die App neu.")
      : "";
  } else {
    $("bwStand").textContent = stand?.at
      ? `Aus Apple Health, abgeglichen ${new Date(stand.at).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`
      : "Aus Apple Health.";
  }
  $("heuteBewegung").hidden = !nativ && !kacheln.length && !trainings.length;
}

function renderHeuteBalance() {
  const el = $("heuteBalance");
  if (!el) return;
  const b = balanceFuer(1, heuteTag);
  el.innerHTML = "";
  for (const stand of b.bereiche) {
    el.appendChild(messwert({
      name: stand.name,
      wert: kurzDauer(stand.minuten),
      zusatz: stand.zielMinuten ? `von ${kurzDauer(stand.zielMinuten)}` : "",
      // Der Balken misst gegen das Ziel, nicht gegen den Tag. Vorher füllte
      // ihn der Anteil am Tag, während die Zahl daneben das Ziel nannte: zwei
      // Fragen in einer Zeile, und keine davon war ablesbar. Den Anteil am Tag
      // beantwortet der Ring auf der Balance Seite.
      anteil: stand.zielMinuten > 0 ? stand.minuten / stand.zielMinuten : 0,
      ton: bereichFarbe(stand.bereich),
      ziel: "balance",
    }));
  }

  // Die Tagesnutzung steht schon als eigene Leiste darüber. Hier noch einmal
  // dieselbe Zahl zu nennen wäre eine Zeile ohne neue Auskunft.
  const leer = b.bereiche.filter((x) => x.minuten === 0).map((x) => x.name);
  $("heuteBalanceHinweis").textContent = b.gesamtMinuten === 0
    ? "Heute ist noch keine Minute gemessen. Kalender, eingetragene Zeit oder erledigte Aufgabe füllen die Balken."
    : leer.length ? `Noch nichts in: ${leer.join(", ")}.` : "";
}

function renderToday() {
  const jetzt = todayIso();
  if (heuteTag > jetzt) heuteTag = jetzt;
  const istHeute = heuteTag === jetzt;
  $("heuteTitelText").textContent = tagTitel(heuteTag);
  $("heuteZurueck").hidden = istHeute;
  $("heuteErinnerungen").hidden = !istHeute;
  $("heuteGegessenTitel").textContent = istHeute ? "Heute gegessen" : "Gegessen";
  $("weightLabel").textContent = istHeute ? "Heute gewogen, in kg" : "An diesem Tag gewogen, in kg";
  $("btnVerlaufOeffnen").hidden = !istHeute;
  const sub = $("btnErfassenHeute").querySelector(".erfassen-sub");
  const titel = $("btnErfassenHeute").querySelector(".erfassen-titel");
  titel.textContent = istHeute ? "Essen erfassen" : "Essen nachtragen";
  sub.textContent = istHeute ? "Foto, Barcode, Suche oder sprechen" : `Für ${tagTitel(heuteTag)}, über Suche oder Barcode`;
  const n = dayNumbers(heuteTag);
  const ratio = n.targets.kcal > 0 ? Math.min(1, n.totals.kcal / n.targets.kcal) : 0;
  const circumference = 2 * Math.PI * 52;
  $("ringKcal").style.strokeDashoffset = String(circumference * (1 - ratio));
  $("ringKcal").style.stroke = n.totals.kcal > n.targets.kcal ? "var(--bad)" : "var(--accent)";
  $("kcalLeft").textContent = String(n.rest.kcal);
  $("kcalEaten").textContent = `${n.totals.kcal} kcal`;
  $("kcalTarget").textContent = `${n.targets.kcal} kcal`;

  // Die Ernährungsnote stand früher als dritte Zeile neben dem Ring. Sie ist
  // eine abgeleitete Zahl und steht jetzt bei den anderen abgeleiteten Zahlen
  // weiter unten. Der Ring trägt nur, was direkt gemessen ist.

  setBar("p", n.totals.proteinG, n.targets.proteinG, "g", { obergrenze: false });
  setBar("f", n.totals.fatG, n.targets.fatG, "g");
  setBar("c", n.totals.carbsG, n.targets.carbsG, "g");
  setBar("w", n.totals.waterMl, n.targets.waterMl, "ml", { obergrenze: false });

  const reminders = istHeute ? tagesErinnerungen(day) : [];
  const time = nowTime();
  const upcoming = reminders.filter((r) => r.at >= time).slice(0, 3);
  const list = upcoming.length ? upcoming : reminders.slice(-2);
  $("reminderList").innerHTML = list.length
    ? list.map((r) =>
        `<li><div class="li-main"><div class="li-title">${escapeHtml(r.title)}</div></div>` +
        `<div class="li-side"><b>${r.at}</b></div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">Für heute ist alles erledigt.</div></div></li>`;

  renderBewegung(n, istHeute);
  renderTagWertung();
  renderHeuteBalance();
  renderWeight();
  renderMeals("mealList", heuteTag);
}

/**
 * Gewicht und Richtung.
 *
 * Die Richtung kommt aus einer Geraden durch alle Wiegungen, nicht aus dem
 * Vergleich zweier Tage. Das Gewicht schwankt je nach Salz, Kohlenhydraten
 * und Darminhalt um ein bis zwei Kilo, zwei einzelne Tage sagen deshalb nichts.
 */
/** Zeitraum der Gewichtskurve in Tagen. */
let gewichtTage = 90;

function renderWeight() {
  const heute = store.getDay(heuteTag).weightKg;
  const feld = $("weightInput");
  if (document.activeElement !== feld) feld.value = heute ?? "";
  for (const knopf of document.querySelectorAll("#gewichtZeitraum .seg-btn")) {
    knopf.classList.toggle("is-on", Number(knopf.dataset.tage) === gewichtTage);
  }
  // Ein Jahr einmal lesen und daraus schneiden, statt den Speicher je
  // Zeitraum neu zu durchlaufen. renderWeight läuft bei jeder Änderung.
  const jahr = verlaufPunkte(365);
  const kurvenPunkte = jahr.slice(-gewichtTage);
  const spanne = gewichtsSpanne(kurvenPunkte);
  const kurve = gewichtsKurve(kurvenPunkte, weightTrend(kurvenPunkte));
  $("gewichtKurve").innerHTML = kurve && spanne
    ? `<p class="gk-kopf"><b>${spanne.kg}</b> <span>${spanne.zusatz}</span></p>${kurve}`
    : kurve;
  // Die Zeitraumwahl steht nur da, wenn es überhaupt eine Kurve gibt.
  $("gewichtZeitraum").hidden = !jahr.some((p) => p.weightKg !== null);
  const trend = weightTrend(verlaufPunkte(56));
  if (trend.messungen === 0) {
    $("weightTrend").textContent = "Am besten morgens nach dem Klo wiegen.";
    return;
  }
  if (!trend.belastbar) {
    // Mit vier und mehr Wiegungen fehlt nur noch Zeit, nicht die Zahl. Der
    // Satz sagt dann das, sonst liest man "8 Wiegungen, ab vier" als Fehler.
    $("weightTrend").textContent = trend.messungen >= 4
      ? `${trend.messungen} Wiegungen in ${trend.spanneTage} ${trend.spanneTage === 1 ? "Tag" : "Tagen"}, Trend ab 14 Tagen.`
      : `${trend.messungen} ${trend.messungen === 1 ? "Wiegung" : "Wiegungen"}, Trend ab 4 Wiegungen in 14 Tagen.`;
    return;
  }
  const richtung = trend.kgProWoche > 0 ? "plus" : "minus";
  $("weightTrend").textContent =
    `Geglättet ${trend.aktuellKg} kg, ${richtung} ${Math.abs(trend.kgProWoche).toFixed(2).replace(".", ",")} kg je Woche ` +
    `über ${trend.spanneTage} Tage aus ${trend.messungen} Wiegungen. Frag mich nach deinem Verlauf, dann rechne ich dein Ziel nach.`;
}

function setBar(prefix, actual, target, unit, { obergrenze = true } = {}) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  $(`${prefix}Bar`).style.width = `${pct}%`;
  // Rot nur, wo das Ziel eine Obergrenze ist. Protein und Wasser über dem
  // Ziel sind kein Fehler, und ein roter Balken für 166 von 150 g Protein las
  // sich in der Demo wie ein Alarm an einem guten Tag.
  $(`${prefix}Bar`).classList.toggle("over", obergrenze && target > 0 && actual > target * 1.1);
  $(`${prefix}Txt`).textContent = `${actual} / ${target} ${unit}`;
}

function renderMeals(targetId, tag = day) {
  const el = $(targetId);
  if (!el) return;
  const meals = store.getDay(tag).meals;
  el.innerHTML = meals.length
    ? meals.map((meal) => {
        const kcal = Math.round(meal.entries.reduce((s, e) => s + e.kcal, 0));
        const protein = Math.round(meal.entries.reduce((s, e) => s + e.proteinG, 0));
        // Aus Health kommt eine Mahlzeit als eine Summe. "1 Portion Mahlzeit"
        // sagt nichts, ihr Name oder "Mahlzeit aus YAZIO" schon.
        const items = meal.source === "health" ? meal.text : meal.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
        // Antippbar, weil Korrigieren der häufigste Handgriff beim Tracken
        // ist. Ohne Hinweis darauf findet ihn niemand.
        return `<li data-meal="${meal.id}" class="tippbar"><div class="li-main">` +
          `<div class="li-title">${escapeHtml(items || meal.text)}</div>` +
          `<div class="li-sub">${meal.at} Uhr, ${protein} g Protein` +
          (meal.feeling ? `, danach ${escapeHtml(meal.feeling)}` : "") +
          (meal.source === "offline" ? ", Tabellenwert" : "") +
          (meal.source === "health" && meal.text !== `Mahlzeit aus ${meal.quelle}` ? `, aus ${escapeHtml(meal.quelle || "Apple Health")}` : "") +
          `</div></div><div class="li-side"><b>${kcal}</b>kcal</div>` +
          `<button type="button" class="aufgabe-knopf meal-weg" data-meal-weg="${meal.id}" title="Löschen" aria-label="Mahlzeit löschen">` +
          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button></li>`;
      }).join("")
    : `<li><div class="li-main"><div class="li-sub">${tag === todayIso() ? "Noch nichts erfasst." : "Nichts eingetragen. Das heisst nicht, dass du nichts gegessen hast."}</div></div></li>`;
  // Was aus Health kam und nicht zählt, steht sichtbar da. Ein stiller
  // Filter, der Essen verschluckt, wäre derselbe Fehler wie doppelt zählen.
  const weg = store.getDay(tag).healthUebersprungen || [];
  if (weg.length) {
    el.innerHTML += weg.map((w) => `<li><div class="li-main"><div class="li-sub">Nicht mitgezählt: ${w.kcal} kcal aus ${escapeHtml(w.quelle)} um ${escapeHtml(w.uhrzeit)} Uhr. `
      + `Du hast um ${escapeHtml(w.eigeneUm)} Uhr selbst eine Mahlzeit eingetragen, vermutlich dieselbe.</div></div></li>`).join("");
  }
}

/* ---------- Verlauf und Wochenschnitt ---------- */

const MAKRO_ZEILEN = [
  ["Protein", "proteinG", "--makro-protein"],
  ["Fett", "fatG", "--makro-fett"],
  ["Kohlenhydrate", "carbsG", "--makro-kohlenhydrate"],
];

function isoPlus(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Makrozeilen gegen ein Ziel, dieselbe Form wie auf Heute. */
function makroZeilen(el, ist, ziel) {
  for (const [name, feld, ton] of MAKRO_ZEILEN) {
    const z = ziel[feld] || 0;
    el.appendChild(messwert({
      name, wert: `${ist[feld]} g`, zusatz: z ? `von ${z} g` : "",
      anteil: z ? ist[feld] / z : 0, ton: `var(${ton})`,
    }));
  }
}

function tagTitel(tag) {
  const heute = todayIso();
  if (tag === heute) return "Heute";
  if (tag === isoPlus(heute, -1)) return "Gestern";
  return new Date(`${tag}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
}

/** Der erste Tag mit einer Mahlzeit. Weiter zurück blättern zeigt nur leere Monate. */
function fruehesterTag() {
  return store.allDays().filter((t) => (store.getDay(t).meals || []).length).sort()[0] || todayIso();
}

/**
 * Ein Monat als Raster: je Tag Kalorien und der Punkt für den Stand gegen
 * das Ziel. Derselbe Bau unter Mahlzeiten und in der Tagwahl auf Heute.
 */
function monatsKalender(monatIso, gewaehlt) {
  const heute = todayIso();
  const [jahr, monat] = monatIso.split("-").map(Number);
  const versatz = (new Date(jahr, monat - 1, 1).getDay() + 6) % 7;
  const tage = new Date(jahr, monat, 0).getDate();
  let html = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span class="ev-wt">${w}</span>`).join("");
  html += '<span class="ev-leer"></span>'.repeat(versatz);
  for (let d = 1; d <= tage; d++) {
    const iso = `${monatIso}-${String(d).padStart(2, "0")}`;
    const zukunft = iso > heute;
    const t = zukunft ? null : verlaufTag(iso);
    // Heute läuft noch: unter der Hälfte heisst dort nicht unvollständig.
    const stand = t ? (iso === heute && tagStand(t) === "unvollstaendig" ? "laeuft" : tagStand(t)) : "leer";
    const kcal = t && t.mahlzeiten ? t.kcal : 0;
    const klassen = ["ev-tag", stand, iso === gewaehlt ? "gewaehlt" : "", iso === heute ? "heute" : ""].filter(Boolean).join(" ");
    const label = `${tagTitel(iso)}, ${kcal ? `${kcal} kcal` : "nichts eingetragen"}`;
    html += `<button type="button" class="${klassen}" data-ev-tag="${iso}"${zukunft ? " disabled" : ""} aria-pressed="${iso === gewaehlt}" aria-label="${escapeHtml(label)}">`
      + `<span class="ev-zahl">${d}</span><span class="ev-kcal">${kcal || ""}</span><i class="ev-punkt ${stand}"></i></button>`;
  }
  return html;
}

function monatText(monatIso) {
  const [jahr, monat] = monatIso.split("-").map(Number);
  return new Date(jahr, monat - 1, 15).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function monatPlus(monatIso, n) {
  const [j, m] = monatIso.split("-").map(Number);
  const d = new Date(j, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* Die Tagwahl auf Heute */
function tagWahlZeichnen() {
  const heute = todayIso();
  $("twMonat").textContent = monatText(twMonat);
  $("twVor").disabled = twMonat >= heute.slice(0, 7);
  $("twZurueck").disabled = twMonat <= fruehesterTag().slice(0, 7);
  $("twKalender").innerHTML = monatsKalender(twMonat, twTag);
  $("twAnzeigen").textContent = twTag === heute ? "Heute anzeigen" : `${tagTitel(twTag)} anzeigen`;
}
function tagWahlOeffnen() {
  twTag = heuteTag;
  twMonat = heuteTag.slice(0, 7);
  tagWahlZeichnen();
  $("tagWahlBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
}
function tagWahlSchliessen() {
  $("tagWahlBlatt").hidden = true;
  document.body.classList.remove("blatt-offen");
}
function heuteZeigen(tag) {
  heuteTag = tag;
  renderToday();
  $("heuteTitel").closest(".view")?.querySelector(".scroll")?.scrollTo({ top: 0 });
}

/**
 * Kalender, gewählter Tag und Wochenschnitt unter Mahlzeiten.
 *
 * Der Kalender zeigt je Tag die Kalorien und einen Punkt für den Stand
 * gegen das Ziel, gerechnet in `tagStand` im Kern. Ein Tag ohne Eintrag
 * bleibt leer und wird nicht rot: nicht eingetragen heisst vergessen und
 * nicht nichts gegessen. Der Wochenschnitt folgt dem gewählten Tag.
 */
function renderVerlauf() {
  if (!$("evKalender")) return;
  const heute = todayIso();
  if (evTag > heute) evTag = heute;
  if (evMonat > heute.slice(0, 7)) evMonat = heute.slice(0, 7);
  $("evMonat").textContent = monatText(evMonat);
  $("evVor").disabled = evMonat >= heute.slice(0, 7);
  $("evZurueck").disabled = evMonat <= fruehesterTag().slice(0, 7);

  $("evKalender").innerHTML = monatsKalender(evMonat, evTag);

  // Der gewählte Tag
  const t = verlaufTag(evTag);
  $("evTagTitel").textContent = tagTitel(evTag);
  $("evTagSumme").textContent = t.mahlzeiten ? `${t.kcal} von ${t.zielKcal} kcal` : "";
  const makros = $("evTagMakros");
  makros.innerHTML = "";
  if (t.mahlzeiten) makroZeilen(makros, t, { proteinG: t.zielProteinG, fatG: t.zielFatG, carbsG: t.zielCarbsG });
  $("evTagHinweis").textContent = evTag !== heute && tagStand(t) === "unvollstaendig"
    ? "Unvollständig, zählt nicht in den Wochenschnitt."
    : "";
  renderMeals("mealList2", evTag);
  $("evNachtragen").hidden = evTag === heute;

  // Der Schnitt der Woche, in der dieser Tag liegt
  const gemessen = gemessenerVerbrauch();
  const w = wochenschnittFuer(evTag, gemessen);
  $("evWocheZeitraum").textContent = w.tage
    ? `${zeitraumText(w.von, w.bis)}, ${w.gezaehlt} von ${w.tage} ${w.tage === 1 ? "Tag" : "Tagen"} gezählt`
    : "Die Woche hat heute begonnen. Der Schnitt zählt abgeschlossene Tage.";
  const woche = $("evWoche");
  woche.innerHTML = "";
  if (w.schnitt && w.ziel) {
    const kz = messwert({
      name: "Kalorien im Schnitt", wert: `${w.schnitt.kcal} kcal`, zusatz: `von ${w.ziel.kcal}`,
      anteil: w.ziel.kcal ? w.schnitt.kcal / w.ziel.kcal : 0, ton: "var(--brand)",
    });
    kz.classList.add("gross");
    woche.appendChild(kz);
    makroZeilen(woche, w.schnitt, w.ziel);
    $("evBilanz").textContent = bilanzKurz(w);
    $("evBilanz").hidden = false;
  } else {
    woche.innerHTML = w.tage ? `<p class="sub">${w.mitEintrag ? "In dieser Woche ist noch kein Tag vollständig eingetragen." : "In dieser Woche ist nichts eingetragen."}</p>` : "";
    $("evBilanz").hidden = true;
  }
  const hinweise = [];
  const liste = tageListe;
  if (w.leer.length && w.mitEintrag) hinweise.push(`Ohne Eintrag: ${liste(w.leer)}`);
  if (w.unvollstaendig.length) hinweise.push(`Wohl unvollständig, zählt nicht: ${liste(w.unvollstaendig)}`);
  $("evWocheHinweis").textContent = hinweise.join(" ");

  // Die letzten acht Wochen, jede antippbar
  const zeilen = [];
  for (let i = 0; i < 8; i++) {
    const x = wochenschnittFuer(isoPlus(heute, -7 * i), gemessen);
    if (!x.mitEintrag) continue;
    const bilanz = x.bilanzKcal === null ? "" : Math.abs(x.bilanzKcal) < 50 ? " · ausgeglichen" : ` · ${x.bilanzKcal < 0 ? "−" : "+"}${Math.abs(x.bilanzKcal)} kcal am Tag`;
    const sub = x.schnitt ? `${x.schnitt.proteinG} g Protein${bilanz}` : "nicht vollständig eingetragen";
    const aktiv = evTag >= x.von && evTag <= x.bis;
    zeilen.push(`<li class="tippbar${aktiv ? " aktiv" : ""}" data-ev-woche="${x.bis}"><div class="li-main"><div class="li-title">${escapeHtml(zeitraumText(x.von, x.bis))}</div>`
      + `<div class="li-sub">${escapeHtml(sub)}</div></div><div class="li-side">${x.schnitt ? `<b>${x.schnitt.kcal}</b>kcal` : ""}</div></li>`);
  }
  $("evWochen").innerHTML = zeilen.join("") || `<li><div class="li-main"><div class="li-sub">Noch keine Woche mit Einträgen.</div></div></li>`;
}

function verlaufZeigen(tag) {
  evTag = tag;
  evMonat = tag.slice(0, 7);
  renderVerlauf();
}

/**
 * Die täglichen Check-ins der letzten 30 Tage als Tagebuch, wie bei den
 * Wochenbögen: zu eine Zeile mit Tag, Uhrzeit und Energie, offen die Werte,
 * die eigene Notiz und die Antwort von daevo.
 */
function renderCheckins() {
  const tage = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(`${todayIso()}T12:00:00`);
    d.setDate(d.getDate() - i);
    const tag = todayIso(d);
    tage.push({ tag, checkins: (store.getDay(tag).checkins || []).filter((c) => c.kind !== "herausforderung").slice().reverse() });
  }
  $("checkinList").innerHTML = tagebuchHtml(tage, chatHtml);
  $("ciWoche").innerHTML = wocheHtml(wocheEnergie(todayIso(), (tag) => store.getDay(tag).checkins || []));
  const m = morgenVonHeute(store, todayIso());
  let abendStart = "";
  try { abendStart = abendplanFuer(store, todayIso())?.start ?? ""; } catch { /* ohne Profil keine Uhrzeit */ }
  const jetzt = new Date();
  const k = kachelStand({ morgen: m ? { wert: m.morgenWert, gestrichen: m.trainingGestrichen } : null, abendStart, jetzt: `${String(jetzt.getHours()).padStart(2, "0")}:${String(jetzt.getMinutes()).padStart(2, "0")}` });
  $("ciMorgenStand").textContent = k.morgen;
  $("ciAbendStand").textContent = k.abend;
  $("btnMorgenCheckin").classList.toggle("an", k.morgenOffen && jetzt.getHours() < 12);
  $("btnAbendroutine").classList.toggle("an", k.abendJetzt);
}

function renderMemories() {
  const query = $("memSearch").value.trim();
  const entries = query ? brain.search(query, 40).map((h) => h.entry) : brain.all().slice().reverse();
  $("memCount").textContent = String(brain.all().length);
  $("memList").innerHTML = entries.length
    ? entries.map((e) =>
        `<li><div class="li-main"><span class="mem-kind">${KIND_LABEL[e.kind] ?? e.kind}</span>` +
        `<div class="li-title">${escapeHtml(e.text)}</div>` +
        `<div class="li-sub">${new Date(e.at).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}, Wichtigkeit ${e.weight} von 5</div></div>` +
        `<div class="li-side"><button class="aufgabe-knopf" data-mem-del="${e.id}" title="Löschen" aria-label="Notiz löschen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button></div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">${query ? "Nichts gefunden." : "Noch nichts gemerkt. Erzähl dem Assistenten etwas über dich."}</div></div></li>`;
}

/* ---------- Einkaufsliste ---------- */

const EK_TITEL = {
  protein: "Protein", kohlenhydrate: "Kohlenhydrate", gemuese: "Gemüse",
  obst: "Obst", fett: "Fett", sonstiges: "Sonstiges",
};
const EK_STAND = { offen: "offen", gekauft: "gekauft", zuhause: "hab ich" };

function renderEinkauf() {
  const liste = store.getShoppingList();
  const el = $("einkaufList");
  if (!liste || liste.items.length === 0) {
    // Die Liste ist reine Rechnung aus den Zielen, ohne Modell. Wer die Seite
    // zum ersten Mal öffnet, bekommt sie deshalb gleich, statt vor einem
    // leeren Kasten mit einer Aufforderung zu stehen.
    if (!renderEinkauf.versucht) {
      renderEinkauf.versucht = true;
      buildActions({ onChange: refreshAll }).einkaufslisteErstellen({ tage: 7 }).then(renderEinkauf).catch(() => {});
    }
    el.innerHTML = `<li><div class="li-main"><div class="li-sub">Noch keine Liste. Tipp auf Liste rechnen.</div></div></li>`;
    $("einkaufHinweis").textContent = "";
    $("einkaufSub").textContent = "Gerechnet aus deinen Tageszielen.";
    return;
  }
  $("einkaufTage").value = liste.tage;
  const offen = liste.items.filter((i) => i.stand === "offen").length;
  $("einkaufSub").textContent =
    `${offen} von ${liste.items.length} noch offen`;
  $("einkaufHinweis").textContent = liste.hinweis +
    (liste.gemieden.length ? ` Ausgelassen: ${liste.gemieden.join(", ")}.` : "");

  el.innerHTML = liste.items.map((item) => {
    const erledigt = item.stand !== "offen";
    return `<li${erledigt ? ' class="erledigt"' : ""}>
      <div class="li-main">
        <span class="ek-stand ${item.stand}">${EK_TITEL[item.kategorie]}${item.stand === "offen" ? "" : `, ${EK_STAND[item.stand]}`}</span>
        <div class="li-title">${escapeHtml(item.name)}${item.menge ? `, ${escapeHtml(item.menge)}` : ""}</div>
      </div>
      <div class="li-side ek-knoepfe">
        <button class="ghost" data-ek="${item.key}" data-stand="${item.stand === "gekauft" ? "offen" : "gekauft"}">${item.stand === "gekauft" ? "Zurück" : "Gekauft"}</button>
        <button class="ghost" data-ek="${item.key}" data-stand="${item.stand === "zuhause" ? "offen" : "zuhause"}">${item.stand === "zuhause" ? "Zurück" : "Hab ich"}</button>
      </div>
    </li>`;
  }).join("");
}

/* ---------- Mindeststandards ---------- */

function renderStandards() {
  const status = standardsUebersicht();
  const el = $("standardList");
  if (status.length === 0) {
    el.innerHTML = `<li><div class="li-main"><div class="li-sub">Noch keine Standards. Setz dir unten einen.</div></div></li>`;
    return;
  }
  el.innerHTML = status.map((s) => {
    const prozent = Math.round(s.quote * 100);
    const klasse = prozent >= 80 ? "" : prozent >= 40 ? "schwach" : "rot";
    const messbar = ["protein", "wasser", "schritte", "erfassen"].includes(s.standard.kind);
    return `<li>
      <div class="li-main">
        <div class="li-title">${escapeHtml(s.standard.text)}</div>
        <div class="li-sub">${escapeHtml(s.zahlen)}</div>
        <div class="std-quote">
          <div class="std-bar"><i class="${klasse}" style="width:${prozent}%"></i></div>
          <span class="std-zahl">${prozent} %</span>
        </div>
      </div>
      <div class="li-side ek-knoepfe">
        ${messbar ? "" : `<button class="ghost" data-std-ok="${s.standard.id}">${s.aktuell ? "Gehalten" : "Heute ok"}</button>`}
        <button class="aufgabe-knopf" data-std-del="${s.standard.id}" title="Entfernen" aria-label="Standard entfernen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button>
      </div>
    </li>`;
  }).join("");
}

function renderRecommendations() {
  $("recoList").innerHTML = recommendations()
    .map((r) => `<div class="reco"><h3>${escapeHtml(r.titel)}</h3><p>${escapeHtml(r.text)}</p><div class="grund">${escapeHtml(r.grund)}</div></div>`)
    .join("");

  $("musterText").textContent = musterUebersicht(60);

  const liste = widerspruchListe();
  $("widerspruchListe").innerHTML = liste.length === 0
    ? '<div class="empty">Zwischen Anspruch und Umsetzung sehe ich gerade keinen Widerspruch.</div>'
    : liste
      .map((w) => `<div class="reco"><h3>${escapeHtml(w.thema)}</h3>` +
        `<p>${escapeHtml(w.anspruch)} ${escapeHtml(w.wirklichkeit)}</p>` +
        `<div class="grund">${escapeHtml(w.frage)}</div></div>`)
      .join("");
}

/**
 * Die Zeiten je Wochentag im Profil.
 *
 * Ein leeres Feld heisst nicht null Uhr, sondern "für diesen Tag gilt der
 * Schnitt". Deshalb wird ein leerer Wert gelöscht und nicht gespeichert.
 */
function renderWochenzeiten() {
  const box = $("e-wochenbox");
  const modus = $("e-randmodus").value;
  box.hidden = modus !== "wochentag";

  $("e-randhilfe").textContent = modus === "wechselnd"
    ? "Deine Zeiten oben gelten als Schnitt. Sag im Chat, wann du an einem Tag wirklich aufstehst, "
      + "etwa \"morgen um 5 raus\", dann rechne ich diesen Tag damit."
    : modus === "wochentag"
      ? "Für Tage ohne Eintrag gilt dein Schnitt. Einzelne Tage änderst du jederzeit im Chat."
      : "";

  if (box.hidden) return;
  const werte = profile.wochenraender || {};
  const el = $("e-wochenzeiten");
  el.innerHTML = WOCHENTAGE.map((t) => {
    const e = werte[String(t.nr)] || {};
    return `<div class="wochenzeile">
      <span class="wt-tag">${t.kurz}</span>
      <input type="time" data-wt="${t.nr}" data-teil="wakeTime" value="${e.wakeTime ?? ""}"
             aria-label="${t.name} aufstehen">
      <input type="time" data-wt="${t.nr}" data-teil="sleepTime" value="${e.sleepTime ?? ""}"
             aria-label="${t.name} schlafen">
    </div>`;
  }).join("");
}

function wochenzeitenLesen() {
  const out = {};
  for (const el of $("e-wochenzeiten").querySelectorAll("[data-wt]")) {
    if (!el.value) continue;
    const tag = el.dataset.wt;
    out[tag] = { ...(out[tag] || {}), [el.dataset.teil]: el.value };
  }
  return out;
}

/**
 * Die Stimmauswahl.
 *
 * Welche Stimmen ein Gerät hat, weiss nur das Gerät. Auf einem iPhone sind die
 * besseren Varianten ein eigener Download unter Bedienungshilfen, und ohne den
 * bleibt nur die Basisqualität. Deshalb steht die Liste hier zur Auswahl statt
 * einer festen Stimme im Code, und der Hinweis sagt, was zu tun ist.
 */
async function renderStimmwahl() {
  const feld = $("e-stimme");
  if (!feld) return;
  // Warten, statt sofort zu lesen. getVoices ist beim ersten Aufruf oft leer,
  // und dann stand hier "keine deutsche Stimme gefunden", obwohl welche da
  // waren.
  await stimmenBereit();
  const liste = waehlbareStimmen();
  const gewaehlt = store.getSettings().stimme || "";

  if (liste.length === 0) {
    feld.innerHTML = '<option value="">Keine Stimme gefunden</option>';
    $("e-stimmhilfe").textContent =
      "Dieses Gerät meldet keine Stimme. Auf dem iPhone lädst du welche unter Einstellungen, "
      + "Bedienungshilfen, Gesprochene Inhalte, Stimmen. Danach die App einmal schließen und neu öffnen.";
    return;
  }

  // Die gespeicherte Wahl kann ein alter Name sein oder ein Schlüssel. Nativ
  // gibt es Anna in Basis und in Erweitert unter demselben Namen.
  const gewaehltIst = (v) => gewaehlt && (stimmSchluessel(v) === gewaehlt || v.name === gewaehlt);
  const markiert = liste.find(gewaehltIst);
  const eintrag = (v) => {
    const q = stimmQualitaet(v);
    const stufe = q === 3 ? "Premium" : q === 2 ? "Erweitert" : "";
    // Den Qualitätszusatz aus dem Namen nehmen und dahinter setzen.
    // "Markus, Premium" liest sich, "Markus (Enhanced) [de-DE]" nicht.
    const kurz = v.name.replace(/\s*\((premium|enhanced|neural|natural)\)/i, "").trim();
    const zusatz = [istMaennlich(v) ? "männlich" : "", stufe].filter(Boolean).join(", ");
    const sprache = istDeutsch(v) ? "" : ` [${v.lang}]`;
    return `<option value="${escapeHtml(stimmSchluessel(v))}"${v === markiert ? " selected" : ""}>`
      + `${escapeHtml(kurz)}${sprache}${zusatz ? `, ${zusatz}` : ""}</option>`;
  };

  feld.innerHTML = liste.map(eintrag).join("");

  const deutsch = liste.filter(istDeutsch);
  const hatGute = liste.some((v) => stimmQualitaet(v) >= 2);
  const hatMann = deutsch.some(istMaennlich);
  const zeilen = [];
  const nativeListe = liste.some((v) => v.nativ);

  if (deutsch.length === 0) {
    zeilen.push("Dieses Gerät meldet keine Stimme als Deutsch. Die gefundenen stehen trotzdem zur Wahl, "
      + "sie sprechen deutschen Text meist sauber.");
  } else if (nativeListe && (!hatGute || !hatMann)) {
    // In der iPhone App sieht daevo jede geladene Stimme. Fehlt eine gute
    // oder eine männliche, liegt sie noch nicht auf dem Gerät.
    zeilen.push("Bessere Stimmen lädst du auf dem iPhone unter Einstellungen, Bedienungshilfen, "
      + "Gesprochene Inhalte, Stimmen, Deutsch. Eine Männerstimme wie Markus oder Yannick in Erweitert "
      + "oder Premium laden, dann hierher zurückkommen. Sie steht danach in der Liste.");
  } else if (!hatGute && (istNativ() || /iPhone|iPad|iPod/.test(navigator.userAgent))) {
    // Safari und die Web App vom Homebildschirm sehen nur die Basisstimmen.
    // Was unter Bedienungshilfen geladen wird, nutzt erst die iPhone App.
    zeilen.push("Im Browser gibt Apple nur die Basisstimmen frei. Geladene Stimmen wie Markus oder "
      + "Yannick nutzt daevo erst in der iPhone App.");
  } else if (!hatGute) {
    zeilen.push("Deine deutschen Stimmen sind in Basisqualität. Bessere lädst du in den Einstellungen "
      + "deines Geräts unter Bedienungshilfen, Gesprochene Inhalte. Danach die App einmal schließen "
      + "und neu öffnen.");
  }

  // Nur Hinweise, die etwas ändern. Eine Liste aller Gerätestimmen und
  // Sätze darüber, was nicht geht, standen hier vorher und halfen niemandem.
  $("e-stimmhilfe").textContent = zeilen.join(" ");
}

/* ---------- Rest des Tages ---------- */

// Welche Mahlzeiten der Nutzer angetippt hat. Null heisst: noch nichts
// angetippt, dann entscheidet die Uhrzeit.
let restWahl = null;

function renderRestDesTages() {
  const n = dayNumbers(day);
  const satz = $("restSatz");
  if (!satz) return;

  satz.textContent = restText(n.rest);

  const gegessen = gegesseneArten(n.data.meals);
  const vorgabe = offeneMahlzeiten(new Date().getHours(), gegessen);
  const gewaehlt = restWahl ?? vorgabe;

  $("restMahlzeiten").innerHTML = MAHLZEITEN.map((m) => {
    const an = gewaehlt.includes(m.art);
    const schon = gegessen.includes(m.art);
    return `<button type="button" class="pill${an ? " on" : ""}" data-mahlzeit="${m.art}">`
      // Ein gezeichneter Haken statt des Schriftzeichens, das je nach Schrift
      // anders sitzt. Dieselbe Linie wie der Haken im Trainingsmodus.
      + `${escapeHtml(m.name)}${schon ? '<svg class="pill-haken" viewBox="0 0 24 24" role="img" aria-label="schon gegessen"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : ""}</button>`;
  }).join("");
}

$("restMahlzeiten").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-mahlzeit]");
  if (!knopf) return;
  const art = knopf.dataset.mahlzeit;
  const n = dayNumbers(day);
  const aktuell = restWahl ?? offeneMahlzeiten(new Date().getHours(), gegesseneArten(n.data.meals));
  restWahl = aktuell.includes(art) ? aktuell.filter((x) => x !== art) : [...aktuell, art];
  renderRestDesTages();
});

$("btnRestPlanen").addEventListener("click", async () => {
  const knopf = $("btnRestPlanen");
  const feld = $("restAusgabe");
  knopf.disabled = true;
  knopf.textContent = "daevo rechnet";
  feld.hidden = false;
  feld.textContent = "Ich teile das auf.";
  try {
    vorratLesen();
    const text = await buildActions({ onChange: refreshAll })
      .tagZuEndePlanen({ mahlzeiten: restWahl ?? undefined });
    feld.textContent = text;
  } catch (error) {
    feld.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Rest aufteilen und Vorschläge holen";
  }
});

/* ---------- Gespräche ---------- */

let gsFilter = null;

function renderGespraeche() {
  const frage = $("gsSuche").value.trim();
  const aktiv = store.getAktivesGespraech();
  const mitInhalt = gespraecheMitInhalt();

  // Der Filter zeigt nur Ordner, in denen wirklich etwas liegt. Sechs leere
  // Kacheln sagen nichts und kosten eine Bildschirmhöhe.
  const belegt = nachOrdnern(mitInhalt);
  $("gsOrdnerFilter").innerHTML = belegt.length > 1
    ? `<button class="pill${gsFilter === null ? " on" : ""}" data-filter="">Alle</button>`
      + belegt.map((x) =>
        `<button class="pill${gsFilter === x.ordner.id ? " on" : ""}" data-filter="${x.ordner.id}">`
        + `${escapeHtml(x.ordner.name)}</button>`).join("")
    : "";

  if (frage.length >= 2) {
    const funde = gespraecheSuchen(frage).filter((f) => f.gespraech.nachrichten.some((m) => m.role === "user"));
    $("gsListe").innerHTML = funde.length === 0
      ? `<p class="gs-leer">Nichts gefunden zu "${escapeHtml(frage)}".</p>`
      : funde.map((f) => eintragHtml(f.gespraech, aktiv, f.stelle)).join("");
    return;
  }

  const liste = mitInhalt
    .filter((g) => !gsFilter || g.ordner === gsFilter)
    .sort((x, y) => y.zuletzt.localeCompare(x.zuletzt));
  if (liste.length === 0) {
    $("gsListe").innerHTML = '<p class="gs-leer">Noch keine Gespräche. Sag im Assistenten etwas, '
      + "dann steht es hier und lässt sich später durchsuchen.</p>";
    return;
  }

  // Nach Zeit statt nach Ordner, wie bei Claude. Gesucht wird ein Gespräch
  // fast immer über "das war vorgestern", selten über das Thema, und für das
  // Thema gibt es den Filter darüber.
  const gruppen = new Map();
  for (const g of liste) {
    const name = zeitGruppe(g.zuletzt);
    if (!gruppen.has(name)) gruppen.set(name, []);
    gruppen.get(name).push(g);
  }
  $("gsListe").innerHTML = [...gruppen].map(([name, gs]) => `
    <div class="gs-gruppe">${escapeHtml(name)}</div>
    ${gs.map((g) => eintragHtml(g, aktiv)).join("")}`).join("");
}

/** Heute, Gestern, Letzte 7 Tage, Letzte 30 Tage, dann der Monat. */
function zeitGruppe(iso) {
  const tag = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const tage = Math.round((tag(Date.now()) - tag(iso)) / 86400000);
  if (tage <= 0) return "Heute";
  if (tage === 1) return "Gestern";
  if (tage < 7) return "Letzte 7 Tage";
  if (tage < 30) return "Letzte 30 Tage";
  return new Date(iso).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function eintragHtml(g, aktiv, stelle = "") {
  const datum = new Date(g.zuletzt);
  const heute = zeitGruppe(g.zuletzt) === "Heute";
  const wann = heute
    ? datum.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : datum.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  const ordner = ORDNER.find((o) => o.id === g.ordner) ?? ORDNER[ORDNER.length - 1];
  return `<div class="gs-eintrag${g.id === aktiv ? " on" : ""}">
    <div class="gs-text" data-oeffnen="${g.id}" role="button" tabindex="0">
      <b>${escapeHtml(g.titel)}</b>
      <span class="gs-meta"><span class="punkt" style="background:${ordner.farbe}"></span>`
      + `${escapeHtml(ordner.name)} · ${wann}</span>
      ${stelle ? `<span class="gs-stelle">${escapeHtml(stelle)}</span>` : ""}
    </div>
    <button class="gs-weg" data-loeschen="${g.id}" aria-label="Gespräch löschen">&times;</button>
  </div>`;
}

$("gsSuche").addEventListener("input", renderGespraeche);

$("gespraeche").addEventListener("click", (event) => {
  const filter = event.target.closest("[data-filter]");
  if (filter) { gsFilter = filter.dataset.filter || null; renderGespraeche(); return; }

  const weg = event.target.closest("[data-loeschen]");
  if (weg) {
    gespraechLoeschen(weg.dataset.loeschen);
    renderGespraeche();
    return;
  }

  const oeffnen = event.target.closest("[data-oeffnen]");
  if (oeffnen) {
    gespraechOeffnen(oeffnen.dataset.oeffnen);
    showView("assistant");
    renderTranscript();
  }
});

$("btnGespraeche").addEventListener("click", () => showView("gespraeche"));

function neuesGespraech() {
  frischesGespraech();
  begruessungZeigen();
  showView("assistant");
  renderTranscript();
  $("chatInput")?.focus();
}
// Ein neues Gespräch beginnt über die Liste der Gespräche oder von selbst
// nach einer halben Stunde. Das Plus in der Kopfzeile tat nichts, was man
// dort sucht, und sah neben Liste und Lautsprecher nach einem Fehler aus.
$("btnNeuAusListe").addEventListener("click", neuesGespraech);

/* ---------- Wochen Check-in ---------- */

// Welcher Bogen gerade offen ist. Standard ist der, der heute ansteht.
let wcBogen = null;
let wcWerte = {};

function wcStart(id) {
  const bogen = bogenFuer(id) || bogenAmTag(new Date().getDay()) || CHECKIN_MITTE;
  wcBogen = bogen;
  // Ein heute schon abgeschickter Bogen wird zum Bearbeiten geladen, statt den
  // Nutzer alles neu tippen zu lassen.
  const vorhanden = store.getCheckinBoegen()
    .find((b) => b.bogen === bogen.id && b.tag === todayIso());
  wcWerte = vorhanden ? { ...vorhanden.werte } : {};
  renderWochencheck();
}

function renderWochencheck() {
  if (!wcBogen) return wcStart();
  const bogen = wcBogen;
  // Die Kopfzeile bleibt "Check-ins". Welcher Bogen offen ist, zeigt die
  // Auswahl darunter, und eine Überschrift, die mit dem Reiter wechselt, sieht
  // aus wie eine andere Seite.
  $("wcEinleitung").textContent = bogen.einleitung;

  const heute = new Date().getDay();
  $("wcWahl").innerHTML = CHECKIN_BOEGEN.map((b) => {
    const dran = b.wochentag === heute;
    return `<button class="${b.id === bogen.id ? "primary" : "ghost"}" data-bogen="${b.id}">`
      + `${escapeHtml(b.titel)}${dran ? " heute" : ""}</button>`;
  }).join("");

  $("wcFragen").innerHTML = bogen.fragen.map((f) => wcFrageHtml(f)).join("");
  $("wcAktionen").hidden = false;
  $("wcAuswertung").hidden = true;
  renderWcVerlauf();
}

function wcFrageHtml(f) {
  const wert = wcWerte[f.id];
  const kopf = `<div class="wc-text">${escapeHtml(f.text)}</div>`
    + (f.hinweis ? `<div class="wc-hinweis">${escapeHtml(f.hinweis)}</div>` : "");
  const huelle = (inhalt) =>
    `<div class="wc-frage${f.pflicht ? " pflicht" : ""}" data-frage="${f.id}">${kopf}${inhalt}</div>`;

  if (f.typ === "zahl") {
    const min = f.min ?? 1;
    const max = f.max ?? 10;
    const gesetzt = Number.isFinite(wert);
    // Der Regler steht in der Mitte, die Anzeige bleibt aber leer, bis er
    // bewegt wurde. Eine Zahl, die dasteht ohne dass jemand sie gewaehlt hat,
    // ist keine Antwort, und im Verlauf sieht sie spaeter aus wie eine.
    const v = gesetzt ? wert : Math.round((min + max) / 2);
    const anteil = Math.round(((v - min) / (max - min)) * 100);
    return huelle(
      `<div class="wc-skala${gesetzt ? "" : " offen"}">
        <input type="range" min="${min}" max="${max}" step="1" value="${v}" data-wert="${f.id}" data-typ="zahl"
               style="--fuellung:${anteil}%">
        <span class="wc-wert" data-anzeige="${f.id}">${gesetzt ? v : "&ndash;"}</span>
      </div>
      <div class="wc-enden"><span>${escapeHtml(f.vonWort ?? String(min))}</span><span>${escapeHtml(f.bisWort ?? String(max))}</span></div>`,
    );
  }
  if (f.typ === "auswahl") {
    const karten = (f.optionen || []).map((o) =>
      `<button type="button" class="pill${wert === o ? " on" : ""}" data-wert="${f.id}" data-typ="auswahl"
        data-option="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("");
    return huelle(`<div class="pills">${karten}</div>`);
  }
  if (f.typ === "mehrfach") {
    const liste = Array.isArray(wert) ? wert : [];
    const karten = (f.optionen || []).map((o) =>
      `<button type="button" class="pill${liste.includes(o) ? " on" : ""}" data-wert="${f.id}" data-typ="mehrfach"
        data-option="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join("");
    return huelle(`<div class="pills">${karten}</div>`);
  }
  if (f.typ === "jaNein") {
    return huelle(`<div class="pills">
      <button type="button" class="pill${wert === true ? " on" : ""}" data-wert="${f.id}" data-typ="jaNein" data-option="ja">Ja</button>
      <button type="button" class="pill${wert === false ? " on" : ""}" data-wert="${f.id}" data-typ="jaNein" data-option="nein">Nein</button>
    </div>`);
  }
  if (f.typ === "dauer") {
    const min = Number.isFinite(wert) ? wert : 0;
    return huelle(`<div class="wc-dauer">
      <input type="number" min="0" max="16" inputmode="numeric" value="${Math.floor(min / 60) || ""}"
             data-wert="${f.id}" data-typ="dauer-h" placeholder="7"><span>Stunden</span>
      <input type="number" min="0" max="59" inputmode="numeric" value="${min % 60 || ""}"
             data-wert="${f.id}" data-typ="dauer-m" placeholder="30"><span>Minuten</span>
    </div>`);
  }
  return huelle(`<textarea rows="2" data-wert="${f.id}" data-typ="text"
    placeholder="">${escapeHtml(typeof wert === "string" ? wert : "")}</textarea>`);
}

/**
 * Die bisherigen Bögen als Tagebuch, beide Arten, neueste zuerst. Ein Tipp
 * klappt einen Bogen auf: jede Frage mit der eigenen Antwort und darunter,
 * was daevo dazu gesagt hat. Vorher stand dort nur "17 von 17 beantwortet",
 * und was man geschrieben hatte, war nicht mehr zu lesen.
 */
function wcWertText(frage, wert) {
  if (typeof wert === "boolean") return wert ? "Ja" : "Nein";
  if (Array.isArray(wert)) return wert.join(", ");
  if (frage.typ === "dauer" && typeof wert === "number") {
    const h = Math.floor(wert / 60);
    const m = wert % 60;
    return m ? `${h} Stunden ${m} Minuten` : `${h} Stunden`;
  }
  if (frage.typ === "zahl" && typeof wert === "number" && frage.max !== undefined) return `${wert} von ${frage.max}`;
  return String(wert);
}

function renderWcVerlauf() {
  const liste = store.getCheckinBoegen().slice(-40).reverse();
  $("wcVerlaufTitel").hidden = liste.length === 0;
  $("wcVerlauf").innerHTML = liste.map((b) => {
    const bogen = bogenFuer(b.bogen);
    if (!bogen) return "";
    const wann = new Date(`${b.tag}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" });
    const fragen = bogen.fragen.filter((f) => { const v = b.werte[f.id]; return v !== undefined && v !== "" && !(Array.isArray(v) && !v.length); });
    const antworten = fragen.map((f) => `<div class="wc-tb-paar"><dt>${escapeHtml(f.text)}</dt><dd>${escapeHtml(wcWertText(f, b.werte[f.id]))}</dd></div>`).join("");
    const daevo = b.antwort
      ? `<div class="wc-tb-daevo"><p class="wc-tb-von">daevo</p><div class="msg-text">${chatHtml(b.antwort)}</div></div>`
      : "";
    return `<li class="wc-tb"><details><summary><span><b>${escapeHtml(wann)}</b><small>${escapeHtml(bogen.titel)}</small></span><span class="meta">${fragen.length} von ${bogen.fragen.length}${b.antwort ? ", mit Antwort" : ""}</span></summary><dl>${antworten}</dl>${daevo}</details></li>`;
  }).join("");
}

/* ---------- Coaching Angebot ---------- */

function renderAngebot() {
  const a = store.getAngebot();
  $("a-name").value = a.coachName || "";
  $("a-buchung").value = a.buchungUrl || "";
  $("a-text").value = a.buchungText || "";
  $("a-mail").value = a.email || "";
  $("a-aus").checked = Boolean(a.aus);

  // Sagt sofort, ob aus dem eingefügten Link etwas Brauchbares wird. Ein
  // Buchungslink, der erst beim Nutzer auffällt, fällt gar nicht auf.
  const roh = $("a-buchung").value.trim();
  const sauber = saubereUrl(roh);
  $("a-buchungHinweis").textContent = !roh
    ? "Ohne Link zeigt die App kein Angebot an."
    : !sauber
      ? "Das ist keine gültige https Adresse."
      : sauber !== roh
        ? `Ich habe Tracker und Datumsangaben entfernt. Gespeichert wird: ${sauber}`
        : "";

  $("a-plaene").innerHTML = (a.plaene || []).map((p, i) => `
    <div class="plan-zeile" data-plan="${i}">
      <input type="text" data-feld="name" value="${escapeHtml(p.name || "")}" placeholder="Zweimal 30">
      <input type="text" data-feld="fuerWen" value="${escapeHtml(p.fuerWen || "")}" placeholder="Für wen ist der Plan">
      <div class="plan-zeile-unten">
        <input type="number" data-feld="einheitenProWoche" min="1" max="7" inputmode="numeric"
               value="${Number(p.einheitenProWoche) || 3}" aria-label="Einheiten pro Woche">
        <span>mal pro Woche</span>
        <button class="gs-weg" data-planweg="${i}" aria-label="Vorlage entfernen">&times;</button>
      </div>
      <div class="plan-zeile-unten">
        <select data-feld="fuerGeschlecht" aria-label="Für wen">
          <option value="alle"${(p.fuerGeschlecht ?? "alle") === "alle" ? " selected" : ""}>Für alle</option>
          <option value="male"${p.fuerGeschlecht === "male" ? " selected" : ""}>Männer</option>
          <option value="female"${p.fuerGeschlecht === "female" ? " selected" : ""}>Frauen</option>
        </select>
        <select data-feld="niveau" aria-label="Erfahrungsstand">
          <option value="alle"${(p.niveau ?? "alle") === "alle" ? " selected" : ""}>Jedes Niveau</option>
          <option value="anfaenger"${p.niveau === "anfaenger" ? " selected" : ""}>Einstieg</option>
          <option value="fortgeschritten"${p.niveau === "fortgeschritten" ? " selected" : ""}>Fortgeschritten</option>
        </select>
      </div>
      <label class="switch"><input type="checkbox" data-feld="zeitsparend"${p.zeitsparend ? " checked" : ""}>
        <span>Bei Stress und wenig Zeit aktiv empfehlen</span></label>
      <input type="url" data-feld="url" value="${escapeHtml(p.url || "")}" placeholder="https://...">
    </div>`).join("")
    || '<p class="feld-hilfe">Noch keine Vorlage. Trag deine Pläne ein, dann schlägt daevo den passenden vor.</p>';
}

function angebotLesen() {
  const plaene = [...$("a-plaene").querySelectorAll("[data-plan]")].map((zeile, i) => {
    const holen = (f) => zeile.querySelector(`[data-feld="${f}"]`)?.value ?? "";
    return {
      id: `p${i}`,
      name: holen("name").trim(),
      fuerWen: holen("fuerWen").trim(),
      einheitenProWoche: Number(holen("einheitenProWoche")) || 3,
      url: holen("url").trim(),
      fuerGeschlecht: holen("fuerGeschlecht") || "alle",
      niveau: holen("niveau") || "alle",
      zeitsparend: zeile.querySelector('[data-feld="zeitsparend"]')?.checked ?? false,
    };
  }).filter((p) => p.name || p.url);

  return {
    coachName: $("a-name").value.trim(),
    email: $("a-mail").value.trim(),
    // Gespeichert wird die saubere Adresse, nicht die eingefügte. Sonst steht
    // der Tracker beim nächsten Öffnen wieder da.
    buchungUrl: saubereUrl($("a-buchung").value) || "",
    buchungText: $("a-text").value.trim(),
    plaene: plaene.map((p) => ({ ...p, url: saubereUrl(p.url) || p.url })),
    aus: $("a-aus").checked,
  };
}

$("a-buchung").addEventListener("input", () => {
  const roh = $("a-buchung").value.trim();
  const sauber = saubereUrl(roh);
  $("a-buchungHinweis").textContent = !roh
    ? "Ohne Link zeigt die App kein Angebot an."
    : !sauber
      ? "Das ist keine gültige https Adresse."
      : sauber !== roh
        ? `Ich entferne Tracker und Datumsangaben. Gespeichert wird: ${sauber}`
        : "";
});

/**
 * Die vier Pläne des Betreibers auf einen Schlag.
 *
 * Vier Vorlagen mit je fünf Feldern von Hand einzutragen dauert zehn Minuten
 * und geht dreimal schief. Die Werte stehen hier, nicht im Kern: es sind die
 * Pläne eines bestimmten Coaches und keine Eigenschaft der App.
 */
const ALPHA_PLAENE = [
  {
    name: "Zweimal 30, Männer fortgeschritten", fuerWen: "Wenig Zeit, Grundübungen sitzen",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/7GIk3i",
    fuerGeschlecht: "male", niveau: "fortgeschritten", zeitsparend: true,
  },
  {
    name: "Zweimal 30, Männer Einstieg", fuerWen: "Wenig Zeit, noch keine Routine",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/6iG0LT",
    fuerGeschlecht: "male", niveau: "anfaenger", zeitsparend: true,
  },
  {
    name: "Zweimal 30, Frauen fortgeschritten", fuerWen: "Wenig Zeit, Grundübungen sitzen",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/9js4Xk",
    fuerGeschlecht: "female", niveau: "fortgeschritten", zeitsparend: true,
  },
  {
    name: "Zweimal 30, Frauen Einstieg", fuerWen: "Wenig Zeit, noch keine Routine",
    einheitenProWoche: 2, url: "https://alphaprogression.com/de/1SfLlj",
    fuerGeschlecht: "female", niveau: "anfaenger", zeitsparend: true,
  },
];

$("btnPlanVorlagen").addEventListener("click", () => {
  const a = angebotLesen();
  // Was schon drin ist, bleibt drin. Ein Knopf, der die eigene Arbeit
  // ueberschreibt, wird genau einmal gedrueckt.
  const vorhanden = new Set(a.plaene.map((p) => saubereUrl(p.url)));
  let neu = 0;
  for (const p of ALPHA_PLAENE) {
    if (vorhanden.has(saubereUrl(p.url))) continue;
    a.plaene.push({ ...p, id: `p${a.plaene.length}` });
    neu++;
  }
  store.setAngebot(a);
  renderAngebot();
  toast(neu ? `${neu} Vorlagen eingetragen` : "Die stehen schon drin");
});

$("btnPlanNeu").addEventListener("click", () => {
  const a = angebotLesen();
  a.plaene.push({ id: `p${a.plaene.length}`, name: "", fuerWen: "", einheitenProWoche: 3, url: "" });
  store.setAngebot(a);
  renderAngebot();
});

$("a-plaene").addEventListener("click", (event) => {
  const weg = event.target.closest("[data-planweg]");
  if (!weg) return;
  const a = angebotLesen();
  a.plaene.splice(Number(weg.dataset.planweg), 1);
  store.setAngebot(a);
  renderAngebot();
});

$("btnAngebotSpeichern").addEventListener("click", () => {
  store.setAngebot(angebotLesen());
  renderAngebot();
  refreshAll();
  toast("Angebot gespeichert");
});

/**
 * Der Block, der Nutzern den Weg zu einem echten Coach zeigt.
 *
 * Er steht nur da, wo jemand gerade merkt, dass er allein nicht weiterkommt.
 * Ein Buchungslink auf jeder Seite ist Werbung, einer an der richtigen Stelle
 * ist ein Angebot.
 */
function angebotBlock() {
  const a = store.getAngebot();
  if (!hatAngebot(a)) return null;

  const box = document.createElement("div");
  box.className = "angebot";

  // Die Lage entscheidet, nicht nur die Zahl der Einheiten. Wer über Wochen
  // hohen Stress und kaum freie Zeit hat, bekommt den zeitsparenden Plan
  // vorgeschlagen, mit dem gemessenen Grund dabei.
  const treffer = planFuer(a.plaene || [], { ...aktuelleLage(), jahreTraining: profile?.jahreTraining });
  if (treffer) {
    const { plan, passung, lageGruende, wegenLage } = treffer;
    // Die Passung steht als Stichwort in der Zeile mit dem Umfang, die Lage als
    // eigener Satz darunter. Zusammen ergäben sie keinen deutschen Satz.
    const zeile = [plan.fuerWen, `${plan.einheitenProWoche} mal pro Woche`, ...passung]
      .filter(Boolean).join(" · ");
    const grund = wegenLage && lageGruende.length
      ? `<span class="angebot-grund">Weil ${escapeHtml(undListe(lageGruende))}.</span>`
      : "";
    box.innerHTML += `<div class="angebot-teil">
      <b>${escapeHtml(plan.name)}</b>
      <span>${escapeHtml(zeile)}</span>
      ${grund}
      <a class="angebot-knopf" href="${escapeHtml(saubereUrl(plan.url))}" target="_blank" rel="noopener">Plan ansehen</a>
    </div>`;
  }

  const buchung = saubereUrl(a.buchungUrl);
  if (buchung) {
    box.innerHTML += `<div class="angebot-teil">
      <b>Du willst persönliche Betreuung</b>
      <span>${escapeHtml(a.buchungText || "Sprich direkt mit einem Coach.")}</span>
      <a class="angebot-knopf primary" href="${escapeHtml(buchung)}" target="_blank" rel="noopener">
        ${escapeHtml(a.coachName ? `Termin bei ${a.coachName}` : "Termin vereinbaren")}</a>
      ${a.email ? `<a class="angebot-mail" href="mailto:${escapeHtml(a.email)}">oder schreib eine Mail</a>` : ""}
    </div>`;
  }
  return box;
}

/** Den Angebotsblock in einen Behälter setzen, falls es eines gibt. */
function zeigeAngebot(id) {
  const ziel = $(id);
  if (!ziel) return;
  ziel.innerHTML = "";
  const block = angebotBlock();
  if (block) ziel.appendChild(block);
}

/* ---------- Profil als Einstellungsliste, profil-ansicht.js ---------- */

let profilTeile = null;
function profilUebersicht(energy, targets) {
  const view = document.querySelector('[data-view="profil"]');
  // Gruppiert wird erst, wenn die Seite offen ist: vorher hat die Fassung
  // noch nicht entschieden, welche Abschnitte für den Betreiber sind.
  if (!profilTeile && view.hidden) return;
  if (!profilTeile) {
    profilTeile = gruppieren(view.querySelector(".scroll"), $("pfGedaechtnis"));
    // Die Werte gehören zu Körper und Ziel, die Kacheln oben nennen das Wichtigste.
    const koerper = view.querySelector('[data-pf-teil="koerper"]');
    if (koerper) koerper.firstElementChild.after($("pfWerte"));
  }
  const kg = Number(profile.weightKg);
  $("pfKacheln").innerHTML = `<div class="pf-kachel"><small>Zielkalorien</small><b>${targets.kcal}</b><small>Bedarf ${energy.tdeeKcal} kcal</small></div>`
    + `<div class="pf-kachel"><small>Protein</small><b>${targets.proteinG} g</b><small>${kg > 0 ? `${(targets.proteinG / kg).toFixed(1).replace(".", ",")} g je kg` : ""}</small></div>`;
  const s = store.getSettings();
  const tempo = { schnell: "Schnell", normal: "Ausgewogen", gruendlich: "Immer gründlich" }[$("tempoSel").value] ?? "";
  const stimme = $("e-stimme").selectedOptions?.[0]?.textContent ?? "";
  const unter = profilUnter(profile, {
    denken: tempo, stimme,
    mitteilungen: istNativ() ? `Abendroutine ${abendplanFuerSicher()}` : "Impulse am Tag",
    konto: $("kontoStand").textContent && $("kontoStand").textContent !== "Wird geladen." ? $("kontoStand").textContent.split(".")[0] : "",
    sicherung: "Daten sichern und einspielen",
    aussehen: { system: "Wie das Gerät", light: "Hell", dark: "Dunkel" }[$("themeSel").value] ?? "",
    anweisungen: s.anweisungen ? `${String(s.anweisungen).slice(0, 40)}${String(s.anweisungen).length > 40 ? "…" : ""}` : "Noch keine",
  });
  const teile = [...profilTeile];
  teile.splice(3, 0, { titel: "Gedächtnis", schluessel: "gedaechtnis" });
  $("pfUebersicht").innerHTML = uebersichtHtml(profilZeilen(teile, unter));
}
function abendplanFuerSicher() {
  try { return abendplanFuer(store, todayIso())?.start ?? ""; } catch { return ""; }
}
function profilTeilOeffnen(schluessel) {
  const view = document.querySelector('[data-view="profil"]');
  if (schluessel === "gedaechtnis") { showView("reflexion"); return; }
  for (const t of view.querySelectorAll(".pf-teil")) t.classList.toggle("offen", t.dataset.pfTeil === schluessel);
  const titel = view.querySelector(`[data-pf-oeffnen="${schluessel}"] b`)?.textContent ?? "Profil";
  view.dataset.pfOffen = schluessel;
  view.querySelector(".bar h1").textContent = titel;
  view.querySelector(".scroll").scrollTop = 0;
}
function profilTeilZu() {
  const view = document.querySelector('[data-view="profil"]');
  if (!view.dataset.pfOffen) return false;
  delete view.dataset.pfOffen;
  view.querySelector(".bar h1").textContent = "Profil";
  renderProfile();
  return true;
}
document.addEventListener("click", (ev) => {
  const k = ev.target.closest("[data-pf-oeffnen]");
  if (k) profilTeilOeffnen(k.dataset.pfOeffnen);
});
// Zurück schliesst erst den offenen Abschnitt, dann die Seite. Der Lauscher
// liegt in der Fangphase an der Ansicht und kommt so vor dem am Knopf.
document.querySelector('[data-view="profil"]').addEventListener("click", (ev) => {
  if (ev.target.closest("[data-back]") && profilTeilZu()) { ev.stopPropagation(); ev.preventDefault(); }
}, true);

function renderProfile() {
  const energy = energyBreakdown(profile);
  const targets = dayNumbers(day).targets;
  $("pBmr").textContent = `${energy.bmrKcal} kcal`;
  $("pAf").textContent = String(energy.activityFactor);
  $("pTdee").textContent = `${energy.tdeeKcal} kcal`;
  $("pTarget").textContent = `${targets.kcal} kcal, ${targets.proteinG} g Protein`;
  profilUebersicht(energy, targets);

  $("e-weight").value = profile.weightKg;
  $("e-steps").value = profile.dailySteps;
  $("e-goal").value = profile.goal;
  $("e-wake").value = profile.wakeTime;
  $("e-sleep").value = profile.sleepTime;
  // Ein Wert, den die Liste nicht kennt, fällt auf den nächsten bekannten.
  const erste = Number(profile.essenszeiten?.ersteNachMin ?? 45);
  $("e-ersteMahlzeit").value = String([15, 45, 90, 180].reduce((a, b) => (Math.abs(b - erste) < Math.abs(a - erste) ? b : a)));
  $("e-mittag").value = profile.essenszeiten?.mittag || "12:30";
  $("e-abend").value = profile.essenszeiten?.abend || "19:00";
  // Nur ein Wert, den das Feld kennt. Ein fremder Wert liess es leer stehen.
  $("e-randmodus").value = profile.wechselndeZeiten ? "wechselnd" : (profile.randModus === "wochentag" ? "wochentag" : "gleich");
  renderWochenzeiten();
  renderStimmwahl();
  siriAdresseZeigen();
  renderAngebot();
  renderPush();
  renderKonto();
  $("e-tempo").value = store.getSettings().sprechtempo ?? 0.96;

  const settings = store.getSettings();
  $("apiKey").value = settings.apiKey || "";
  renderModellwahl(aktuellesModell(settings.modellWahl || "auto"));
  const tempo = tempoVon(settings);
  $("tempoSel").value = tempo;
  renderGruendlich(tempo);
  $("themeSel").value = settings.theme || "system";
  $("anweisungen").value = settings.anweisungen || "";
  zeigeAnweisungsLaenge();
  $("optSpeak").checked = options.speak;
  $("optHandsFree").checked = options.handsFree;
  $("voiceNote").textContent = voiceSupport.erkennung
    ? "Spracherkennung läuft über den Browser. Auf dem iPhone nur in Safari."
    : "Dieser Browser kann keine Spracherkennung. Tippen geht trotzdem.";
  $("versionLine").textContent = `daevo 0.5.0, Stand ${todayIso()}. Testversion, kein Medizinprodukt.`;
  renderKosten();
  renderSessions();
}

/**
 * Was die App an Modellaufrufen verbraucht hat.
 *
 * Die Quote aus dem Zwischenspeicher ist der wichtigste Wert. Steht sie über
 * Tage bei null, greift das Zwischenspeichern nicht, und das kostet echtes
 * Geld, ohne dass irgendwo eine Fehlermeldung erscheint.
 */
/**
 * Die Modellwahl.
 *
 * Automatisch heisst: der erkannte Modus entscheidet. Erfassen braucht kein
 * teures Modell, ein Gespräch über Schuldgefühle schon. Wer das nicht will,
 * setzt hier ein festes Modell.
 */
const MODUS_TEXT = {
  erfassen: "Essen, Trinken, Gewicht eintragen",
  standard: "Kurzes hin und her",
  coaching: "Fachfragen zu Training und Ernährung",
  psyche: "Persönliche Themen",
  planung: "Geld, Zeit, Aufbau",
};

function renderModellwahl(aktuell) {
  const sel = $("modelSel");
  sel.innerHTML = MODELL_OPTIONEN
    .map((o) => `<option value="${o.wert}"${o.wert === aktuell ? " selected" : ""}>${escapeHtml(o.text)}</option>`)
    .join("");

  if (aktuell === "auto") {
    const zeilen = Object.entries(MODELL_JE_MODUS)
      .map(([modus, id]) => `${MODUS_TEXT[modus] || modus}: ${MODELLE[id]?.name || id}`);
    $("modelNote").textContent =
      `${zeilen.join(". ")}. Bilder immer auf Opus 5.5, weil die Mengenschätzung direkt in deinen Tagesdaten landet. ` +
      "Das spart gegenüber Opus für alles etwa die Hälfte.";
  } else {
    $("modelNote").textContent =
      `Alle Nachrichten laufen auf ${MODELLE[aktuell]?.name || aktuell}, auch das reine Eintragen. ` +
      "Automatisch ist in fast allen Fällen günstiger, ohne dass die Antworten schlechter werden, wo es zählt.";
  }
}

/**
 * Der Schalter für die Denktiefe.
 *
 * Persönliche Themen und Planung laufen ohnehin immer auf der höchsten Stufe.
 * Alles andere läuft auf mittel oder niedrig, weil Anthropic für Wissensarbeit
 * angibt, dass mittlere Denktiefe die Genauigkeit der Voreinstellung bei 70
 * bis 85 Prozent der Kosten erreicht, und dabei schneller antwortet. Das ist
 * eine veröffentlichte Angabe und keine Messung an deinen Daten. Wer sie nicht
 * gelten lassen will, schaltet hier um.
 */
/**
 * Die gespeicherte Einstellung als Stufe.
 *
 * Vorher war es ein Wahrheitswert namens `immerGruendlich`. Wer die App schon
 * benutzt, hat den gespeichert, und daraus darf nicht plötzlich "schnell"
 * werden. Deshalb wird der alte Wert gelesen, solange kein neuer dasteht.
 */
function tempoVon(settings) {
  if (settings.tempo === "schnell" || settings.tempo === "normal" || settings.tempo === "gruendlich") {
    return settings.tempo;
  }
  return settings.immerGruendlich ? "gruendlich" : "normal";
}

function renderGruendlich(tempo) {
  const texte = {
    schnell:
      "Planung und Fachfragen antworten schneller und knapper. Persönliche Themen bleiben auf der "
      + "höchsten Stufe, dort wird nicht gespart, auch wenn hier schnell steht.",
    normal:
      "Persönliche Themen und Planung denken auf der höchsten Stufe. Fachfragen laufen auf mittel, "
      + "kurzes hin und her auf niedrig.",
    gruendlich:
      // Was "mehr" bedeutet, hängt davon ab, wer zahlt. Wer seinen eigenen
      // Schlüssel benutzt, zahlt je Nachricht. Wer die App geladen hat, wartet
      // nur länger, und ein Hinweis auf Kosten wäre dort schlicht falsch.
      istDemo()
        ? "Jede Nachricht läuft auf der höchsten Denkstufe. Antworten dauern länger, auch beim reinen Eintragen."
        : "Jede Nachricht läuft auf der höchsten Denkstufe. Antworten dauern länger und kosten mehr, "
          + "auch beim reinen Eintragen.",
  };
  $("gruendlichNote").textContent = texte[tempo] ?? texte.normal;
}

$("tempoSel").addEventListener("change", (event) => {
  const tempo = event.target.value;
  store.setSettings({ ...store.getSettings(), tempo, immerGruendlich: tempo === "gruendlich" });
  renderGruendlich(tempo);
  const sagt = {
    schnell: "daevo antwortet jetzt schneller und knapper",
    normal: "daevo denkt so tief, wie die Frage es braucht",
    gruendlich: "daevo denkt jetzt überall gründlich",
  };
  toast(sagt[tempo] ?? sagt.normal);
});

$("modelSel").addEventListener("change", (event) => {
  const wahl = event.target.value;
  store.setSettings({ ...store.getSettings(), modellWahl: wahl });
  renderModellwahl(wahl);
  toast(wahl === "auto" ? "daevo wählt jetzt selbst" : `Alles läuft auf ${MODELLE[wahl]?.name || wahl}`);
});

function renderKosten() {
  const k = kostenUebersicht();
  $("kostenHeute").textContent = k.heuteText;
  $("kostenGesamt").textContent = k.gesamtText;
  $("kostenMonat").textContent = k.monat.tage > 0 ? k.monatText : "noch keine Daten";
  $("kostenQuote").textContent = `${Math.round(k.quote * 100)} %`;
  $("kostenGespart").textContent = k.gespartText;

  const zeilen = [];
  if (k.gesamt.anfragen === 0) {
    zeilen.push("Noch keine Aufrufe. Ohne Schlüssel läuft alles regelbasiert und kostet nichts.");
  } else {
    zeilen.push(
      `${k.gesamt.anfragen} Aufrufe in ${k.monat.tage} ${k.monat.tage === 1 ? "Tag" : "Tagen"}, ` +
      `${Math.round((k.gesamt.inputTokens + k.gesamt.cacheReadTokens + k.gesamt.cacheWriteTokens) / 1000)}k Token rein, ` +
      `${Math.round(k.gesamt.outputTokens / 1000)}k raus.`,
    );
    if (k.monat.tage < 3) {
      zeilen.push("Die Hochrechnung beruht auf weniger als drei Tagen und ist entsprechend grob.");
    }
    if (k.quote < 0.2 && k.gesamt.anfragen > 4) {
      zeilen.push("Die Quote aus dem Zwischenspeicher ist niedrig. Das passiert, wenn zwischen zwei Nachrichten mehr als fünf Minuten liegen.");
    }
  }
  zeilen.push(`Preise nach der Anthropic Preisliste, Stand ${PREISE_STAND}. Geschätzt, nicht abgerechnet. Die echte Abrechnung steht in deiner Anthropic Console.`);
  $("kostenHinweis").textContent = zeilen.join(" ");
}

// Welche Einheit gerade im Formular steht. -1 heisst: das Formular legt
// eine neue an.
let sessionBearbeitet = -1;

function sessionFormular(i) {
  sessionBearbeitet = i;
  const s = profile.sessions?.[i];
  if (s) {
    $("t-day").value = String(s.weekday);
    $("t-time").value = s.startsAt;
    $("t-type").value = s.type;
    $("t-min").value = String(s.minutes);
  }
  $("btnAddSession").textContent = s ? "Änderung speichern" : "Einheit hinzufügen";
  $("btnDelSession").hidden = !s;
  renderSessions();
}

function renderSessions() {
  const sessions = profile.sessions || [];
  $("sessionList").innerHTML = sessions.length
    ? sessions.map((s, i) =>
        `<li><div class="li-main"><div class="li-title">${WEEKDAYS[s.weekday]} ${s.startsAt}</div>` +
        `<div class="li-sub">${TYPE_LABEL[s.type] || s.type}, ${s.minutes} Minuten</div></div>` +
        `<div class="li-side"><button class="ghost" data-edit="${i}" aria-pressed="${sessionBearbeitet === i}">${sessionBearbeitet === i ? "Wird geändert" : "Ändern"}</button></div></li>`).join("")
    : `<li><div class="li-main"><div class="li-sub">Noch keine Einheit eingetragen.</div></div></li>`;
}

function renderFeelings() {
  $("feelingRow").innerHTML = FEELINGS.map((f) => `<button data-feel="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join("");
}

/* ---------- Onboarding ---------- */

/**
 * Prueft die Werte, die spaeter in Formeln landen. Ohne diese Grenzen kann
 * eine Zahl aus dem Profil den Grundumsatz unbrauchbar machen.
 */
function validProfile(c) {
  return (
    c.ageYears >= 14 && c.ageYears <= 100 &&
    c.heightCm >= 120 && c.heightCm <= 230 &&
    c.weightKg >= 35 && c.weightKg <= 300 &&
    c.dailySteps >= 0 && c.dailySteps <= 60000 &&
    /^\d{2}:\d{2}$/.test(c.wakeTime) && /^\d{2}:\d{2}$/.test(c.sleepTime)
  );
}

/** Uebernimmt das Ergebnis des Anamnesebogens und startet die App. */
function anamneseFertig(ergebnis) {
  if (!validProfile(ergebnis.profile)) { toast("Bitte pruefe deine Angaben."); return; }
  profile = ergebnis.profile;
  store.setProfile(profile);
  // Der Bogen ist die erste Erinnerung des Assistenten. Alles daraus geht ins
  // Gedaechtnis, damit er ab dem ersten Satz weiss, mit wem er redet.
  for (const notiz of ergebnis.notizen) {
    brain.add({ text: notiz.text, art: notiz.art, wichtigkeit: notiz.wichtigkeit, schlagworte: notiz.schlagworte });
  }
  // Wer den Bogen abgekürzt hat, wird später gefragt, aber einzeln und im
  // passenden Moment, nicht mit zwölf Fragen auf einmal.
  if (ergebnis.kurzweg) {
    brain.add({
      text: "Fragebogen abgekürzt. Es fehlen Ernährungsform, Allergien, Geschmack, Gesundheit, Essverhalten, "
        + "Vorgeschichte, Umfeld, Antrieb und Tagesränder. Frag einzeln danach, wenn es zum Gespräch passt, "
        + "vor allem nach Allergien, bevor du ein Rezept vorschlägst.",
      art: "hinweis", wichtigkeit: 5, schlagworte: ["anamnese", "allergie", "rezept"],
    });
  }
  brain.add({
    text: `Trainingsvorschlag zum Start: ${ergebnis.kraft.titel}.`,
    art: "hinweis", wichtigkeit: 3, schlagworte: ["training"],
  });
  // Der Plan aus dem Bogen ist ab sofort der eigene. Wer einen eigenen hat
  // und dabei bleibt, bekommt keinen, sonst stünden zwei Pläne nebeneinander.
  if (ergebnis.planWunsch) {
    store.setSettings({ ...store.getSettings(), plan: { ...uebungsplanFuer(ergebnis.planWunsch), gespeichertAm: new Date().toISOString() } });
    plaene.laden();
  }
  // Was im Bogen als Vorrat angetippt wurde, ist ab sofort der Vorrat. Ohne
  // das müsste der Nutzer dieselbe Liste in der App ein zweites Mal tippen.
  if (ergebnis.vorrat?.length) {
    const vorhanden = store.getFridge();
    store.setFridge([...vorhanden, ...ergebnis.vorrat.filter((v) => !vorhanden.includes(v))]);
  }
  startApp();
}

/**
 * Wendet die eingebaute Konfiguration an und räumt die Betreiberfelder weg.
 *
 * Die Werte werden bei jedem Start gesetzt, nicht nur beim ersten. Ändert der
 * Betreiber seine Worker Adresse und liefert eine neue Fassung aus, soll sie
 * auch bei denen greifen, die die App schon benutzen. Ein Wert, der nur einmal
 * geschrieben wird, bleibt sonst für immer der alte.
 *
 * Was der Nutzer selbst gesetzt hat, bleibt unangetastet: Stimme, Tonfall,
 * Aussehen, seine Zahlen. Nur was dem Betreiber gehört, wird überschrieben.
 */
/** Die Empfehlungen. Gerechnet wird in assistant.js, hier wird nur verbunden. */
const zyklus = zyklusAnsicht({ wurzel: $("zyklusInhalt"), toast, beiAenderung: () => zyklusMenue() });

/** Die Zeile im Menü steht bei Frauen immer und sonst nur, wenn jemand den Zyklus eingeschaltet hat. */
function zyklusMenue() {
  $("menuZyklus").hidden = !zyklusSichtbar(store.getProfile(), store.getSettings());
}
zyklusMenue();

const rezepte = rezepteAnsicht({
  wurzel: document.querySelector('[data-view="rezepte"]'),
  toast,
  beiEintrag: () => refreshAll(),
  planFrei: () => essensplanFrei(store.getSettings(), KONFIG),
  proOeffnen: () => aboOeffnen({ marke: "Pro", titel: "Dein Essensplan für die Woche", empfohlen: "pro",
    text: "Sieben Tage aus den Rezepten, gerechnet auf deine Kalorien und Makros, mit Abendessen zum Vorkochen und fertiger Einkaufsliste." }),
  inKalender: (plan) => essensplanInKalender(plan),
});

/**
 * Der übernommene Essensplan steht danach im Kalender: Frühstück, Mittag und
 * Abend zu den eigenen Essenszeiten, je Tag mit der Aufstehzeit dieses Tages.
 * Snacks nicht, sonst stehen fünf Termine am Tag nur fürs Essen da.
 */
async function essensplanInKalender(plan) {
  if (!istNativ()) {
    toast("Den Plan trage ich in der iPhone App in deinen Kalender ein. Im Browser komme ich an deinen Kalender nicht heran.");
    return;
  }
  const p = store.getProfile();
  const liste = [];
  for (const tag of plan.tage) {
    const zeiten = essensUhrzeiten(tagesrandFuer(p, tag.datum).wakeTime, p.essenszeiten);
    for (const m of tag.mahlzeiten) {
      if (!zeiten[m.art]) continue;
      liste.push({ tag: tag.datum, art: m.art, name: m.empfehlung.rezept.name, uhrzeit: zeiten[m.art], minuten: m.art === "abendessen" && m.vorkochen === "doppelt" ? 45 : 30,
        notiz: `${m.empfehlung.summe.kcal} kcal, ${m.empfehlung.summe.proteinG} g Protein. Aus deinem Essensplan in daevo.` });
    }
  }
  const { mahlzeitenEinplanen } = await import("./kalender-schreiben.js");
  const r = await mahlzeitenEinplanen(liste);
  if (r.ohneKalender) { toast("Verbinde zuerst deinen Kalender, auf der Kalenderseite unter Apple Kalender."); return; }
  toast(r.angelegt ? `${r.angelegt} Mahlzeiten stehen jetzt in deinem Kalender${r.ersetzt ? `, ${r.ersetzt} alte ersetzt` : ""}.` : "Alles schon eingetragen oder schon vorbei.");
}

function einfuehrungGesehen() {
  store.setSettings({ ...store.getSettings(), einfuehrungGesehen: true });
}

$("btnEinfuehrung").addEventListener("click", () => {
  einfuehrungStarten({ zeigeAnsicht: showView, beiEnde: einfuehrungGesehen });
});

function konfigAnwenden() {
  // Unabhängig von der Fassung: in der iPhone App fallen die Wege weg, die
  // es nur gibt, weil eine Web App nicht an HealthKit und iOS herankommt.
  if (istNativ()) {
    for (const el of document.querySelectorAll("[data-nur-web]")) el.hidden = true;
    for (const el of document.querySelectorAll("[data-nur-nativ]")) el.hidden = false;
  }
  if (!istDemo()) return;

  if (KONFIG.pushUrl) {
    store.setSettings({ ...store.getSettings(), pushWorker: KONFIG.pushUrl });
  }
  if (KONFIG.angebot) {
    // Der Nutzer kann das Angebot nicht ändern, also gibt es nichts zu
    // erhalten. Ein Zusammenführen würde nur alte Felder mitschleppen.
    store.setAngebot({ coachName: "", buchungUrl: "", buchungText: "", plaene: [], ...KONFIG.angebot });
  }
  for (const el of document.querySelectorAll("[data-betreiber]")) el.hidden = true;
  for (const el of document.querySelectorAll("[data-nutzer]")) el.hidden = false;
}

function startApp() {
  $("setup").hidden = true;
  $("app").hidden = false;
  konfigAnwenden();
  // Im Hintergrund, damit die erste Nachricht schon zählt. Scheitert es, wird
  // es vor der nächsten Nachricht nachgeholt.
  const aboGeprueft = kontoSicherstellen().then(() => aboBeimStart()).catch(() => {});
  // Erst die Zugriffe, dann alles, was sie braucht. Nacheinander: zwei
  // Abfragen von iOS gleichzeitig, und die zweite geht unter der ersten
  // verloren.
  const rechte = rechteFragen();
  rechte.then(() => healthNativ()).then(() => mitteilungenNativ());
  Promise.all([kontoSicherstellen().catch(() => {}), rechte]).then(() => kalenderStill());
  anmeldungStandZeigen();
  // Wer die App schon benutzt, wird einmal gefragt, nicht vor jedem Start.
  if (store.getSettings().einfuehrungGesehen) rechte.then(() => setTimeout(() => anmeldungFragen(), 1200));
  // Die Einführung kommt einmal: nach dem Bogen, beim ersten Öffnen der Demo,
  // und einmal bei allen, die die App schon vorher benutzt haben. Danach steht
  // sie im Profil. Wer sie bei jedem Start sieht, tippt sie weg, ohne zu lesen.
  if (!store.getSettings().einfuehrungGesehen) {
    Promise.all([aboGeprueft, rechte]).then(() => setTimeout(() => aboFensterZu().then(() => einfuehrungStarten({ zeigeAnsicht: showView, beiEnde: einfuehrungGesehen })), 900));
  }
  else rechte.then(() => setTimeout(morgenVielleicht, 1000));
  options = { ...options, ...(store.getSettings().voice || {}) };
  renderFeelings();
  ensureStandards();
  kalenderNotizAufraeumen();
  aufgabenAufraeumen();
  setupAssistant();
  showView("assistant");
  refreshAll();

  // Über eine Benachrichtigung gestartet. Der Parameter wird danach aus der
  // Adresse entfernt, sonst steht die Frage bei jedem Neuladen wieder da.
  const params = new URLSearchParams(location.search);
  const art = params.get("impuls");
  if (art) {
    impulsOeffnen({ art });
    history.replaceState(null, "", location.pathname);
  }

  // Von aussen mit einer fertigen Frage geöffnet, etwa aus einem Siri
  // Kurzbefehl. Das ist auf dem iPhone der einzige Weg, bei gesperrtem
  // Bildschirm zu diktieren: Siri nimmt auf, der Kurzbefehl öffnet daevo mit
  // dem Text in der Adresse. Ein Weckwort im Hintergrund gibt das Web nicht
  // her, ein Kurzbefehl schon.
  // Über die Mitteilung aus dem Postfach geöffnet.
  if (params.get("postfach")) {
    history.replaceState(null, "", location.pathname);
    postfachPruefen({ laut: true });
  } else {
    // Auch ohne Mitteilung nachsehen. Wer die Mitteilung weggewischt hat und
    // die App später selbst öffnet, soll seinen Satz trotzdem bekommen.
    postfachPruefen();
  }
  gesundheitPruefen();

  // Die Trainingslücke. Läuft still: wer trainiert hat, merkt nichts davon.
  lueckePruefen();

  // Über die Frage nach der Trainingslücke geöffnet, ohne einen der Knöpfe
  // benutzt zu haben. Dann steht die Frage im Chat und der Nutzer antwortet
  // frei, statt aus drei Gründen zu wählen.
  const frage = params.get("frage");
  if (frage === "trainingsluecke") {
    history.replaceState(null, "", location.pathname);
    lueckeFrageOeffnen();
  }

  // Aus der Mitteilung über die Schieflage. Sie stellt keine Frage, sie zeigt
  // etwas, also geht sie direkt dorthin.
  if (params.get("ansicht") === "balance") {
    history.replaceState(null, "", location.pathname);
    showView("balance");
  }

  const gesagt = (params.get("sag") || "").trim();
  if (gesagt) {
    history.replaceState(null, "", location.pathname);
    // Vorlesen einschalten, denn wer diktiert, schaut nicht auf den Schirm.
    options.speak = true;
    send(gesagt.slice(0, 2000));
  }
}

/* ---------- Ereignisse ---------- */

$("composer").addEventListener("submit", (event) => {
  event.preventDefault();
  // Senden beim Diktieren: anhalten und abschicken, was verstanden wurde.
  if (listener?.active && listener.ohneStille && !weckwortLaeuft) {
    spueren("leicht");
    listener.stop();
    return;
  }
  if ($("chatInput").value.trim()) spueren("leicht");
  send($("chatInput").value);
});
/**
 * Holt ab, was ein Siri Kurzbefehl abgelegt hat.
 *
 * Auf dem iPhone öffnet eine Adresse immer Safari, nie die App vom
 * Homebildschirm, und die Aktion "App öffnen" führt Webapps nicht auf. Der
 * Kurzbefehl kommt also nicht direkt in die App. Über den Worker schon: er
 * nimmt den Satz an, schickt eine Mitteilung, und ein Tipp darauf öffnet
 * diese App hier.
 *
 * Läuft still. Ist nichts da, ist nichts zu melden, und ein Fehler beim
 * Abholen ist kein Grund, eine Meldung über etwas anzuzeigen, das der Nutzer
 * gerade gar nicht erwartet.
 */
let postfachLaeuft = false;
let postfachSpaeter = 0;

async function postfachPruefen({ laut = false } = {}) {
  if (postfachLaeuft) return;
  // Läuft gerade eine Antwort, wird nicht verworfen, sondern später nochmal
  // nachgesehen. Stilles Verwerfen hiesse: der Satz liegt bis zum nächsten
  // Öffnen der App im Postfach, und für den Nutzer ist er verschwunden.
  if (busy) {
    clearTimeout(postfachSpaeter);
    postfachSpaeter = setTimeout(() => postfachPruefen({ laut }), 1500);
    return;
  }
  const s = store.getSettings();
  if (!s.pushWorker || !s.pushWort) {
    if (laut) toast("Für das Postfach brauchst du Adresse und Anmeldewort des Push Workers im Profil.");
    return;
  }
  postfachLaeuft = true;
  try {
    const posten = await postfachHolen({ worker: s.pushWorker, wort: s.pushWort });
    if (posten.length === 0) {
      if (laut) toast("Im Postfach liegt nichts.");
      return;
    }
    // Wer diktiert, schaut nicht auf den Schirm.
    options.speak = true;
    // Nacheinander, nicht alle auf einmal. Zwei Mahlzeiten in einer Nachricht
    // werden zu einer verrechnet, und die Reihenfolge des Sprechens ist die
    // Reihenfolge, in der sie gemeint waren.
    for (const p of posten) {
      await send(p.text);
    }
  } catch (fehler) {
    if (laut) toast(`Postfach: ${fehler.message}`);
  } finally {
    postfachLaeuft = false;
  }
}

// Beim Zurückkommen aus dem Kurzbefehl wird die App wieder sichtbar. Dann
// liegt der Satz im Postfach.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  postfachPruefen();
  gesundheitPruefen();
});

$("btnMic").addEventListener("click", startListening);
// Das Viereck: anhalten, der Text bleibt im Feld und lässt sich korrigieren.
$("btnDiktatStopp").addEventListener("click", async () => {
  if (!listener?.active) return;
  spueren("leicht");
  const text = await listener.beenden();
  const feld = $("chatInput");
  feld.value = text;
  feld.focus();
  try { feld.setSelectionRange(text.length, text.length); } catch { /* nicht jedes Feld kann das */ }
});
$("btnWeckwort").addEventListener("click", () => {
  if (weckwortLaeuft) weckwortStoppen("Weckwort aus");
  else weckwortStarten();
});
$("orb").addEventListener("click", startListening);

// Die Zeichen im Menü kommen aus symbole.js und nicht aus dem HTML, damit
// eine Linie nur an einer Stelle gepflegt wird.
for (const el of document.querySelectorAll("[data-sym]")) el.innerHTML = symbol(el.dataset.sym, { groesse: 22, klasse: "sym" });

/** Zeigt eine Seite des Menüs: "start" oder eine Gruppe. */
function menuSeite(name) {
  for (const seite of $("menu").querySelectorAll("[data-seite]")) seite.hidden = seite.dataset.seite !== name;
  $("menu").scrollTo({ top: 0 });
}
// Das Menü öffnet immer auf der Startseite. Wer es zuletzt in einer Gruppe
// verlassen hat, sucht beim nächsten Mal sonst den Weg zurück.
$("btnMenu").addEventListener("click", () => { menuSeite("start"); $("menu").hidden = false; });
$("btnMenuClose").addEventListener("click", () => { $("menu").hidden = true; });
// Ausserhalb des Menüs führt `data-go` ebenso in eine Ansicht, etwa die
// Schlafkarte auf Heute oder der Knopf zum Schlaf unter Bereitschaft.
document.addEventListener("click", (event) => {
  const item = event.target.closest("[data-go]");
  if (!item || item.closest("#menu")) return;
  showView(item.dataset.go);
});
$("menu").addEventListener("click", (event) => {
  const item = event.target.closest("[data-go]");
  // Aus dem Menü heisst Heute wieder heute, auch wenn vorher ein anderer Tag gewählt war.
  if (item?.dataset.go === "heute") heuteTag = todayIso();
  if (item) { showView(item.dataset.go); return; }
  const gruppe = event.target.closest("[data-menu-gruppe]");
  if (gruppe) { menuSeite(gruppe.dataset.menuGruppe); return; }
  if (event.target.closest("[data-menu-zurueck]")) menuSeite("start");
});
// Das Protokoll wird erst beim Antippen gelesen, `trainingslog` steht weiter unten.
uebungen = uebungenStarten({ log: () => trainingslog(), heute: () => todayIso() });
const planSpeicher = {
  lesen: () => store.getSettings().plan ?? null,
  schreiben: (plan) => store.setSettings({ ...store.getSettings(), plan }),
};
const trainingslog = () => (Array.isArray(store.getSettings().trainingslog) ? store.getSettings().trainingslog : []);
/** Ob zum laufenden Training eine Sitzung auf der Uhr gestartet wurde. Dann speichert die Uhr es in Health. */
// eslint-disable-next-line no-var
var uhrTrainingLaeuft = false;

/**
 * Ein beendetes Training in den Kalender, wenn dort zu der Zeit noch keins
 * steht. Für Trainings aus daevo und von der Uhr, mit dem Namen der Einheit.
 */
async function trainingInDenKalender({ titel, datum, start, minuten }) {
  try {
    const { kannSchreiben, trainingNachtragen } = await import("./kalender-schreiben.js");
    if (!kannSchreiben() || !Date.parse(start)) return;
    const b = new Date(start);
    const uhrzeit = `${String(b.getHours()).padStart(2, "0")}:${String(b.getMinutes()).padStart(2, "0")}`;
    const name = !titel || titel === "Freies Training" || titel === "Training für heute" ? "Krafttraining" : titel;
    await trainingNachtragen({ tag: datum, uhrzeit, minuten, art: "strength", name, notiz: "Training in daevo, eingetragen von daevo." });
  } catch { /* ohne Kalender bleibt es beim Eintrag im Tag */ }
}

function plaeneAbschluss(datum, einheit) {
  const eintraege = trainingslog().filter((e) => e.datum === datum && (e.einheit ?? "") === einheit);
  if (!eintraege.length) return;
  const minuten = store.getSettings().trainingDauer?.[`${datum}|${einheit}`] ?? null;
  abschlussOeffnen(abschlussDaten(eintraege, { titel: einheit || "Training", datum, minuten }));
}
const training = trainingStarten({
  plan: planSpeicher,
  log: { lesen: trainingslog, schreiben: (trainingslog) => store.setSettings({ ...store.getSettings(), trainingslog }) },
  entwurfSpeicher: {
    lesen: () => store.getSettings().trainingEntwurf ?? null,
    // Jede Änderung geht auch an die Uhr. Vorher kam ein am iPhone
    // dazugenommene Übung dort nie an.
    schreiben: (trainingEntwurf) => { store.setSettings({ ...store.getSettings(), trainingEntwurf }); uhrSpaeter(); },
  },
  // Ein Training am iPhone öffnet daevo auf der Uhr mit einer Sitzung für
  // Apple Fitness, und die Uhr bekommt sofort das Paket mit den Übungen.
  begonnen: () => {
    if (!istNativ()) return;
    uhrSenden().catch(() => {});
    nativAufruf("Uhr", "trainingStarten", {}).then((r) => { uhrTrainingLaeuft = Boolean(r?.gestartet); }).catch(() => {});
  },
  pauseGeaendert: (bis) => { store.setSettings({ ...store.getSettings(), trainingPause: bis ? { bis } : null }); uhrSpaeter(); },
  heute: todayIso,
  oeffne: (id, ansicht) => uebungen.oeffne(id, ansicht),
  melde: (text) => toast(text),
  // Eine beendete Einheit steht danach auch im Tag. Sonst fragt die
  // Trainingslücke nach vier Tagen, obwohl jeder Satz eingetragen ist.
  fertig: ({ titel, datum, start, minuten, eintraege }) => {
    // Die Uhrzeit ist der Beginn, nicht das Ende. Sonst lag das Training aus
    // Apple Health eine Stunde daneben und zählte doppelt.
    const beginn = Date.parse(start) ? new Date(start) : new Date(Date.now() - minuten * 60000);
    const at = `${String(beginn.getHours()).padStart(2, "0")}:${String(beginn.getMinutes()).padStart(2, "0")}`;
    store.addTraining(todayIso(), { id: newId(), type: "strength", minutes: minuten, at, note: titel });
    // Hat die Uhr dazu etwas aufgezeichnet, geht es in diesen Eintrag.
    healthEinfangen(store, todayIso(), store.getDay(todayIso()).trainings.at(-1));
    trainingInDenKalender({ titel, datum, start: beginn.toISOString(), minuten });
    // In Apple Health, damit es in Apple Fitness und den Ringen zählt. Lief
    // es auf der Uhr mit, hat die Uhr es schon gespeichert.
    if (istNativ() && !uhrTrainingLaeuft) {
      nativAufruf("Gesundheit", "trainingSpeichern", { start: beginn.getTime(), ende: beginn.getTime() + minuten * 60000, titel }).catch(() => {});
    }
    uhrTrainingLaeuft = false;
    // Die Dauer steht im Protokoll nicht. Gemerkt je Tag und Einheit, damit
    // der Abschluss im Verlauf sie auch später noch nennt.
    const dauer = { ...(store.getSettings().trainingDauer ?? {}), [`${datum}|${titel}`]: minuten };
    const schluessel = Object.keys(dauer).sort().slice(-60);
    store.setSettings({ ...store.getSettings(), trainingDauer: Object.fromEntries(schluessel.map((k) => [k, dauer[k]])) });
    $("plOffen").hidden = true;
    plaene.verlaufNeu();
    refreshAll();
    trainingShow(abschlussDaten(eintraege, { titel, datum, minuten }), eintraege, datum);
  },
  geaendert: () => plaene.laden(),
  // Getauscht im Training für heute gilt auch beim nächsten Mal mit denselben Partien.
  getauscht: (titel, altId, neueId) => { if (titel === "Training für heute") heuteGetauscht(altId, neueId); },
  verschoben: (titel, ids) => { if (titel === "Training für heute") heuteVerschoben(ids); },
  korrigiert: () => { plaene.verlaufNeu(); refreshAll(); },
  abschluss: (datum, einheit) => plaeneAbschluss(datum, einheit),
});
const plaene = plaeneStarten({
  speicher: planSpeicher,
  // Krafttage und Dauer aus dem Profil. Wer den Fragebogen vor dem Plan
  // beendet hat, hat Trainingstage, aber keinen gespeicherten Plan.
  profilWunsch: () => {
    const kraft = (store.getProfile()?.sessions || []).filter((x) => x.type === "strength");
    if (!kraft.length) return null;
    const tage = Math.min(5, new Set(kraft.map((x) => x.weekday)).size);
    const dauer = kraft.map((x) => Number(x.minutes)).filter((n) => n > 0).sort((p, q) => p - q);
    const mitte = dauer.length ? dauer[Math.floor(dauer.length / 2)] : 60;
    const minuten = [30, 45, 60, 75, 90].reduce((b, m) => (Math.abs(m - mitte) < Math.abs(b - mitte) ? m : b), 60);
    return { wunsch: { tage, minuten }, text: `${tage} Krafttage pro Woche, ${minuten} Minuten, wie in deinem Profil.` };
  },
  // Der Kurzplan für stressige Wochen und ob er diese Woche gilt. Beides in
  // den Einstellungen und damit in der Sicherung.
  kurz: { lesen: () => store.getSettings().planKurz ?? null, schreiben: (planKurz) => { store.setSettings({ ...store.getSettings(), planKurz }); uhrSpaeter(); } },
  woche: { lesen: () => store.getSettings().planWoche ?? null, schreiben: (planWoche) => { store.setSettings({ ...store.getSettings(), planWoche }); uhrSpaeter(); } },
  zuModus: (name) => { uebungen?.modus(name); document.querySelector('[data-view="uebungen"] .scroll')?.scrollTo({ top: 0 }); },
  mitwachsen: () => proFrei(store.getSettings(), KONFIG),
  proOeffnen: () => aboOeffnen({ marke: "Pro", titel: "Dein Plan, der mitwächst", empfohlen: "pro",
    text: "Nach acht Wochen prüft daevo jede Übung und tauscht, wo du nicht mehr stärker wirst." }),
  oeffne: (id, ansicht) => uebungen.oeffne(id, ansicht),
  melde: (text) => toast(text),
  // Gestrichen heisst gestrichen. Wer sich besser fühlt, sagt es im
  // Check-in, dann ist das Training wieder frei.
  starte: (ei) => {
    if (trainingGestrichen(store, todayIso())) {
      toast("Heute ist dein Training gestrichen, der Tag gehört der Erholung. Geht es dir besser, sag es unter Check-ins.", 5000);
      return;
    }
    training.starten(ei);
  },
  frei: () => {
    if (trainingGestrichen(store, todayIso())) {
      toast("Heute ist dein Training gestrichen, der Tag gehört der Erholung. Geht es dir besser, sag es unter Check-ins.", 5000);
      return;
    }
    training.frei();
  },
  starteEinheit: (einheit) => {
    if (trainingGestrichen(store, todayIso())) {
      toast("Heute ist dein Training gestrichen, der Tag gehört der Erholung. Geht es dir besser, sag es unter Check-ins.", 5000);
      return;
    }
    training.einheit(einheit);
  },
  log: trainingslog,
  heute: todayIso,
  heuteBestellt: () => bestellteEinheit(store.getSettings(), todayIso()),
  abschluss: (datum, einheit) => plaeneAbschluss(datum, einheit),
  ansehen: (datum, einheit) => training.ansehen(datum, einheit),
});

/*
 * 6. Nach Beenden erst die Präsentation: Dauer und Volumen, Bestwerte,
 * Muskelkarte. "Alle Übungen" öffnet das Blatt mit jeder Übung, das aus dem
 * Verlauf weiter direkt kommt.
 */
function trainingShow(daten, eintraege, datum) {
  const st = storyOeffnen("Training", () => trainingFolien(daten, {
    rekordListe: rekorde(eintraege, trainingslog(), datum),
    karte: muskelkarteSvg(daten.jePartie, { farben: KARTE_DUNKEL }),
    name: (id) => UEBUNGEN.find((u) => u.id === id)?.name ?? id,
  }), {
    aktion: (was) => {
      if (was === "details") { abschlussOeffnen(daten); return; }
      if (was !== "teilen") return;
      storyTeilen(daten).then((r) => { if (r === "gespeichert") toast("Bild gespeichert"); }).catch(() => toast("Das Bild ließ sich nicht erstellen."));
      return "bleiben";
    },
  });
  if (!st) abschlussOeffnen(daten);
}

/*
 * 5. Ein Trainingsblock nach acht und nach zwölf Wochen, je einmal. Beim
 * Öffnen der Pläne, denn dort steht als Nächstes, was sich ändert.
 */
function blockVielleicht({ immer = false } = {}) {
  const plan = gespeicherterPlan(planSpeicher.lesen());
  const beginn = planBeginn(plan);
  if (!plan || !beginn) return false;
  const heute = todayIso();
  const woche = planWoche(plan, heute);
  const wochen = woche.fertig ? 12 : woche.woche >= 9 ? 8 : null;
  if (!wochen) return false;
  const s = store.getSettings();
  const schluessel = `${beginn}|${wochen}`;
  if (!immer && s.blockGezeigt?.[schluessel]) return false;
  store.setSettings({ ...s, blockGezeigt: { ...(s.blockGezeigt ?? {}), [schluessel]: true } });
  const log = trainingslog();
  const name = (id) => UEBUNGEN.find((u) => u.id === id)?.name ?? id;
  // Was die Prüfung getauscht hat: der alte Stand reist am Plan mit.
  const vorher = plan.aktualisierung?.vorher ?? null;
  const getauscht = [];
  if (vorher) {
    vorher.forEach((e, ei) => (e.positionen ?? []).forEach((p, pi) => {
      const jetzt = plan.einheiten[ei]?.positionen?.[pi];
      if (jetzt && jetzt.id !== p.id) getauscht.push({ alt: name(p.id), neu: name(jetzt.id), prozent: uebungsTrend(log, p.id, heute).prozent });
    }));
  }
  const ende = new Date(`${beginn}T12:00:00`);
  ende.setDate(ende.getDate() + wochen * 7 - 1);
  const bis = todayIso(ende) < heute ? todayIso(ende) : heute;
  storyOeffnen("Trainingsblock", () => blockFolien(
    blockDaten({ log, beginn, heute: bis, wochen, trend: (id) => uebungsTrend(log, id, bis), name }),
    { titel: plan.einheiten.map((e) => e.titel).slice(0, 3).join(", "), getauscht },
  ), {
    aktion: (was) => {
      if (was === "anpassen") { showView("plaene"); uebungen?.modus("anpassen"); }
      else if (was === "plan") showView("plaene");
    },
  });
  return true;
}

/* Der Abschluss eines Trainings, nach Beenden und aus dem Verlauf. */
let abStand = null;
const hellerModus = () => document.documentElement.dataset.theme === "light"
  || (document.documentElement.dataset.theme !== "dark" && globalThis.matchMedia?.("(prefers-color-scheme: light)").matches);
function abschlussOeffnen(daten) {
  abStand = daten;
  $("abInhalt").innerHTML = abschlussHtml(daten, { hell: hellerModus() });
  $("abInhalt").scrollTop = 0;
  $("abschlussBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
  zahlenZaehlen($("abInhalt"));
}
function abschlussSchliessen() {
  $("abschlussBlatt").hidden = true;
  document.body.classList.remove("blatt-offen");
}
$("abSchliessen").addEventListener("click", abschlussSchliessen);
$("abFertig").addEventListener("click", abschlussSchliessen);
$("abschlussBlatt").addEventListener("click", (ev) => { if (ev.target === $("abschlussBlatt")) abschlussSchliessen(); });
$("abTeilen").addEventListener("click", async () => {
  if (!abStand) return;
  const knopf = $("abTeilen");
  knopf.disabled = true;
  try {
    const r = await storyTeilen(abStand);
    if (r === "gespeichert") toast("Bild gespeichert");
  } catch {
    toast("Das Bild ließ sich nicht erstellen.");
  } finally {
    knopf.disabled = false;
  }
});
$("plOffen").hidden = !training.offen();
// "Training starten" unter der Antwort des Coaches. Läuft die Einheit
// schon, geht es dort weiter, statt die abgehakten Sätze zu verwerfen.
$("kalZiel").addEventListener("change", (ev) => {
  store.setSettings({ ...store.getSettings(), zielKalender: ev.target.value });
  toast(`daevo trägt ab jetzt in ${ev.target.selectedOptions[0]?.textContent || "diesen Kalender"} ein.`);
});

$("transcript").addEventListener("click", (ev) => {
  // "Neue Übungen" geht als Satz an den Coach, damit es im Gespräch steht
  // und derselbe Weg rechnet wie beim Tippen.
  if (ev.target.closest("[data-heute-neu]")) { send("Neue Übungen für heute"); return; }
  const show = ev.target.closest("[data-briefing-zeigen]");
  if (show) { briefingShowOeffnen(show.dataset.briefingZeigen); return; }
  const story = ev.target.closest("[data-story-zeigen]");
  if (story) { if (story.dataset.storyZeigen === "kopf") kopfShow(); else rueckblickShow(); return; }
  if (!ev.target.closest("[data-heute-starten]")) return;
  const ht = bestellteEinheit(store.getSettings(), todayIso());
  if (!ht?.einheit) { toast("Diese Einheit war für einen anderen Tag. Sag mir, was du heute trainierst."); return; }
  if (trainingGestrichen(store, todayIso())) {
    toast("Heute ist dein Training gestrichen, der Tag gehört der Erholung. Geht es dir besser, sag es unter Check-ins.", 5000);
    return;
  }
  const offen = training.offen();
  if (offen && offen.titel === ht.einheit.titel && (offen.uebungen?.length ?? 0) > 0) training.fortsetzen();
  else training.einheit(ht.einheit);
});
$("plFortsetzen").addEventListener("click", () => training.fortsetzen());

// Täglicher Check-in und Wochenbogen sind zwei Ansichten, aber ein Menüpunkt.
// Zwei Einträge für dieselbe Handlung zwingen dazu, jedes Mal zu überlegen,
// welcher gemeint ist. Der Reiter wechselt die Ansicht, statt sie umzubauen.
for (const knopf of document.querySelectorAll("[data-ci-reiter]")) {
  knopf.addEventListener("click", () => showView(knopf.dataset.ciReiter));
}
for (const knopf of document.querySelectorAll("[data-go-ansicht]")) {
  knopf.addEventListener("click", () => showView(knopf.dataset.goAnsicht));
}

for (const button of document.querySelectorAll("[data-back]")) {
  button.addEventListener("click", () => showView("assistant"));
}

$("btnSpeaker").addEventListener("click", () => {
  options.speak = !options.speak;
  $("btnSpeaker").setAttribute("aria-pressed", String(options.speak));
  if (!options.speak) stopSpeaking();
  saveOptions();
  toast(options.speak ? "Ich lese Antworten vor" : "Vorlesen aus");
});

for (const chip of document.querySelectorAll("[data-water]")) {
  chip.addEventListener("click", async () => {
    // Auf einem früheren Tag geht das Wasser in diesen Tag.
    if (heuteTag !== todayIso()) {
      store.addWater(heuteTag, Number(chip.dataset.water));
      refreshAll();
      toast(`${chip.dataset.water} ml für ${tagTitel(heuteTag)} eingetragen`);
      return;
    }
    await buildActions({ onChange: refreshAll }).wasserEintragen(Number(chip.dataset.water));
    toast(`${chip.dataset.water} ml eingetragen`);
  });
}

/** Rückmeldung in einer der Feedbackflächen zeigen. */
function zeigeFeedback(id, text, fehler = false) {
  const feld = $(id);
  feld.hidden = false;
  feld.className = fehler ? "feedback err" : "feedback";
  feld.textContent = text;
  // Liegt das Feld in einer versteckten Ansicht, sieht niemand die Antwort.
  // Das passiert, seit das Erfassen auch von Heute aus geht. Ein Ergebnis, das
  // auf einer Seite steht, die man gerade nicht ansieht, ist kein Ergebnis.
  if (feld.closest(".view")?.hidden) toast(ersterSatz(text), 5200);
}

/** Der erste Satz, für die kurze Meldung. Ganze Absätze passen in keinen Toast. */
function ersterSatz(text) {
  const t = String(text ?? "").trim();
  const ende = t.search(/[.!?](\s|$)/);
  return ende > 0 ? t.slice(0, ende + 1) : t.slice(0, 120);
}

$("btnParse").addEventListener("click", async () => {
  const text = $("mealText").value.trim();
  if (!text) return;
  const feedback = $("mealFeedback");
  const button = $("btnParse");
  button.disabled = true;
  button.textContent = "Rechne";
  feedback.hidden = false;
  feedback.className = "feedback";
  feedback.textContent = "Ich rechne das gerade durch.";
  try {
    const before = store.getDay(day).meals.length;
    const antwort = await buildActions({ onChange: refreshAll }).mahlzeitErfassen(text);
    const after = store.getDay(day).meals;
    if (after.length > before) {
      lastMealId = after[after.length - 1].id;
      $("mealText").value = "";
      feedback.className = "feedback ok";
      // Gesprochen oder getippt, die Mengen sind eine Schätzung. Ein Tipp
      // öffnet die Mahlzeit, dort lässt sich jede Menge ändern.
      const id = lastMealId; const tag = day;
      setTimeout(() => toastAktion("Eingetragen. Mengen prüfen?", "Ändern", () => mahlzeitOeffnen(id, tag), 8000), 50);
    } else {
      feedback.className = "feedback err";
    }
    feedback.textContent = antwort;
    refreshAll();
  } catch (error) {
    feedback.className = "feedback err";
    feedback.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Erfassen";
  }
});

/**
 * Teller fotografieren, direkt aus der Essensansicht.
 *
 * Derselbe Weg wie im Chat, nur ohne Umweg über das Gespräch: Bild
 * verkleinern, auswerten, eintragen. Die Nährwerte laufen durch dieselbe
 * Prüfung wie bei der Texteingabe.
 */
$("essenFoto").addEventListener("change", async (event) => {
  const datei = event.target.files?.[0];
  event.target.value = "";
  if (!datei) return;
  await fotoBlattOeffnen(datei);
});

/* ---------- Das Foto, bevor es rausgeht ---------- */

/**
 * Was der Nutzer sieht, während gerechnet wird.
 *
 * Drei Schritte, nicht einer. Eine Bildauswertung dauert fünf bis fünfzehn
 * Sekunden, und ein Knopf, der die ganze Zeit dasselbe sagt, sieht nach der
 * Hälfte davon aus wie eine hängende App. Die Schritte sind echt und nicht
 * erfunden: verkleinern, auswerten, gegen die Makroformel prüfen. Was die
 * Anzeige nicht weiss, ist wie lange jeder dauert, deshalb steht keine Zeit
 * daneben.
 */
const FOTO_SCHRITTE = ["Bild vorbereiten", "Mengen schätzen", "Nährwerte prüfen"];

/** Das gewählte Bild, bis es ausgewertet oder verworfen ist. */
let fotoDatei = null;
let fotoUrl = null;
/** Tag der Mahlzeit, als JJJJ-MM-TT. Die Uhrzeit steht im Feld. */
let fotoTag = todayIso();

async function fotoBlattOeffnen(datei) {
  fotoDatei = datei;
  if (fotoUrl) URL.revokeObjectURL(fotoUrl);
  fotoUrl = URL.createObjectURL(datei);
  $("fbBild").src = fotoUrl;
  $("fbDetails").value = "";
  $("fbFeedback").hidden = true;
  fotoSchritt(null);

  // Die Zeit wird gelesen, bevor das Blatt aufgeht, nicht danach. Sonst
  // springt die Uhrzeit unter dem Finger um, während jemand schon tippt.
  let exif = null;
  try {
    exif = aufnahmezeit(await datei.slice(0, EXIF_LESEN_BYTES).arrayBuffer());
  } catch { exif = null; }
  const vorschlag = zeitVorschlag(exif);
  fotoTag = vorschlag.tag;
  $("fbUhrzeit").value = vorschlag.uhrzeit;
  fotoTagZeigen();
  $("fbZeitHinweis").textContent = vorschlag.ausFoto
    ? "Zeit aus dem Foto übernommen."
    : "";

  $("fotoBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
}

function fotoTagZeigen() {
  const zurueck = tageZurueck(fotoTag, todayIso());
  for (const knopf of $("fbTag").querySelectorAll("[data-tage]")) {
    const an = Number(knopf.dataset.tage) === zurueck;
    knopf.classList.toggle("on", an);
    knopf.setAttribute("aria-pressed", String(an));
  }
}

$("fbTag").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-tage]");
  if (!knopf) return;
  fotoTag = tagVor(todayIso(), Number(knopf.dataset.tage));
  fotoTagZeigen();
  $("fbZeitHinweis").textContent = "";
});
$("fbUhrzeit").addEventListener("input", () => { $("fbZeitHinweis").textContent = ""; });

function fotoBlattSchliessen() {
  $("fotoBlatt").hidden = true;
  document.body.classList.remove("blatt-offen");
  // Die Adresse des Bildes wird freigegeben, sonst hält der Browser jedes
  // Foto dieser Sitzung im Speicher. Bei zehn Tellern am Tag summiert sich
  // das auf einem Handy spürbar.
  if (fotoUrl) { URL.revokeObjectURL(fotoUrl); fotoUrl = null; }
  fotoDatei = null;
  $("fbBild").removeAttribute("src");
}

/**
 * Setzt den Schritt. `null` heisst: nicht am Rechnen.
 *
 * Die Animation hängt an derselben Zustandsvariable wie die Beschriftung. Wer
 * beides getrennt setzt, hat irgendwann einen laufenden Scanner über einem
 * fertigen Ergebnis.
 */
function fotoSchritt(index) {
  const laeuft = index !== null;
  $("fbBuehne").classList.toggle("laeuft", laeuft);
  $("fbAuswerten").disabled = laeuft;
  $("fbAuswertenText").textContent = laeuft
    ? `${index + 1}/${FOTO_SCHRITTE.length} ${FOTO_SCHRITTE[index]}...`
    : "Auswerten";
}

$("fbSchliessen").addEventListener("click", fotoBlattSchliessen);
$("fotoBlatt").addEventListener("click", (event) => {
  if (event.target === $("fotoBlatt")) fotoBlattSchliessen();
});

$("fbAuswerten").addEventListener("click", async () => {
  if (!(await kiFreigabe())) {
    toast("Fotos auswerten braucht die KI. Du kannst sie im Profil unter Datenschutz erlauben.");
    return;
  }
  if (!fotoDatei) return;
  const hinweis = $("fbDetails").value.trim().slice(0, 500);
  const feedback = $("fbFeedback");
  feedback.hidden = true;

  try {
    fotoSchritt(0);
    const anhang = await anhangAusDatei(fotoDatei);
    if (anhang.fehler) {
      feedback.hidden = false;
      feedback.className = "feedback err";
      feedback.textContent = anhang.fehler;
      fotoSchritt(null);
      return;
    }

    fotoSchritt(1);
    const aktionen = buildActions({ onChange: refreshAll, anhaenge: [anhang] });
    const uhrzeit = /^\d{2}:\d{2}$/.test($("fbUhrzeit").value) ? $("fbUhrzeit").value : undefined;
    const text = await aktionen.fotoAlsMahlzeit({ ...(hinweis ? { hinweis } : {}), tag: fotoTag, uhrzeit });

    // Der dritte Schritt ist die Prüfung gegen die Makroformel, und die läuft
    // in fotoAlsMahlzeit schon mit. Er wird hier nur noch angezeigt, damit
    // die Zählung nicht bei 2 von 3 stehen bleibt.
    fotoSchritt(2);
    fotoBlattSchliessen();
    zeigeFeedback("mealFeedback", text);
    renderVerlauf();
    refreshAll();
  } catch (error) {
    feedback.hidden = false;
    feedback.className = "feedback err";
    feedback.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    fotoSchritt(null);
  }
});

/* ---------- Woher kommt das ---------- */

/**
 * Ein Tipp auf den Kalorienring oder einen Makrobalken zerlegt den Tag:
 * oben je Mahlzeit, darunter je Lebensmittel. Der Balken sagt, ob das Ziel
 * erreicht ist, das Blatt sagt, woran es lag. Gerechnet wird in
 * `makroHerkunft` im Kern, hier wird nur gezeigt.
 */
const HERKUNFT = {
  kcal: { name: "Kalorien", einheit: "kcal", ziel: "kcal", ton: "var(--accent)", frage: "Woher kommen deine Kalorien" },
  proteinG: { name: "Protein", einheit: "g", ziel: "proteinG", ton: "var(--makro-protein)", frage: "Woher kommt dein Protein" },
  fatG: { name: "Fett", einheit: "g", ziel: "fatG", ton: "var(--makro-fett)", frage: "Woher kommt dein Fett" },
  carbsG: { name: "Kohlenhydrate", einheit: "g", ziel: "carbsG", ton: "var(--makro-kohlenhydrate)", frage: "Woher kommen deine Kohlenhydrate" },
};
const ART_NAME = Object.fromEntries(MAHLZEITEN.map((m) => [m.art, m.name]));
let herkunftMakro = "proteinG";
let herkunftAusloeser = null;

function herkunftZeigen() {
  const info = HERKUNFT[herkunftMakro];
  const n = dayNumbers(heuteTag);
  const h = makroHerkunft(n.data.meals, herkunftMakro);
  const zahl = (v) => Math.round(v);
  const prozent = (a) => `${Math.round(a * 100)} %`;

  $("hkTitel").textContent = info.frage;
  for (const knopf of $("hkWahl").querySelectorAll("[data-makro]")) {
    const an = knopf.dataset.makro === herkunftMakro;
    knopf.classList.toggle("on", an);
    knopf.setAttribute("aria-selected", String(an));
  }
  $("herkunftBlatt").style.setProperty("--hk-ton", info.ton);
  $("hkSumme").innerHTML = `<b>${zahl(h.gesamt)} ${info.einheit}</b>von ${zahl(n.targets[info.ziel])} ${info.einheit} Ziel`;

  if (n.data.meals.length === 0) {
    const leer = `<li class="hk-leer">Heute ist noch nichts eingetragen.</li>`;
    $("hkMahlzeiten").innerHTML = leer;
    $("hkLebensmittel").innerHTML = "";
    return;
  }

  // Je Mahlzeit stehen alle vier Werte, der gewählte vorn und gross. Wer auf
  // Protein getippt hat, will wissen, wie viel das Frühstück hatte, und im
  // selben Blick, was es an Kalorien gekostet hat.
  $("hkMahlzeiten").innerHTML = h.mahlzeiten.map((m) => {
    const art = m.art ? ART_NAME[m.art] : "Mahlzeit";
    const wert = m[herkunftMakro];
    return `<li>
      <div class="hk-zeile">
        <span class="hk-name">${escapeHtml(art)}<span class="hk-zeit">${escapeHtml(m.at)} Uhr</span></span>
        <span class="hk-wert">${zahl(wert)} ${info.einheit}</span>
        <span class="hk-anteil">${prozent(m.anteil)}</span>
      </div>
      <div class="hk-sub">${escapeHtml(m.titel)}</div>
      <div class="hk-makros"><b>${zahl(m.kcal)}</b> kcal · Protein <b>${zahl(m.proteinG)}</b> g · Fett <b>${zahl(m.fatG)}</b> g · KH <b>${zahl(m.carbsG)}</b> g</div>
      <div class="hk-spur"><i style="width:${(m.anteil * 100).toFixed(1)}%"></i></div>
      <div class="hk-aktionen">
        <button type="button" class="hk-aktion" data-hk-aendern="${escapeHtml(m.id)}">Ändern</button>
        <button type="button" class="hk-aktion gefahr" data-hk-loeschen="${escapeHtml(m.id)}">Löschen</button>
      </div>
    </li>`;
  }).join("");

  const zeilen = h.lebensmittel.map((l) => `<li>
      <div class="hk-zeile">
        <span class="hk-name">${escapeHtml(l.name)}${l.mal > 1 ? `<span class="hk-zeit">${l.mal} mal</span>` : ""}</span>
        <span class="hk-wert">${zahl(l.wert)} ${info.einheit}</span>
        <span class="hk-anteil">${prozent(l.anteil)}</span>
      </div>
      <div class="hk-spur"><i style="width:${(l.anteil * 100).toFixed(1)}%"></i></div>
    </li>`);
  if (h.rest) {
    zeilen.push(`<li><div class="hk-zeile"><span class="hk-name">${h.rest.anzahl} weitere</span>` +
      `<span class="hk-wert">${zahl(h.rest.wert)} ${info.einheit}</span><span class="hk-anteil">${prozent(h.rest.anteil)}</span></div></li>`);
  }
  $("hkLebensmittel").innerHTML = zeilen.length ? zeilen.join("") : `<li class="hk-leer">Kein Lebensmittel heute mit ${info.name}.</li>`;
}

function herkunftOeffnen(makro, ausloeser) {
  herkunftMakro = HERKUNFT[makro] ? makro : "proteinG";
  herkunftAusloeser = ausloeser || null;
  herkunftZeigen();
  $("herkunftBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
  $("herkunftBlatt").querySelector(".blatt-scroll").scrollTop = 0;
}

function herkunftSchliessen() {
  $("herkunftBlatt").hidden = true;
  document.body.classList.remove("blatt-offen");
  herkunftAusloeser?.focus?.();
}

// Ändern und Löschen direkt dort, wo man die Mahlzeit sieht. Im Betrieb
// stand sie im Blatt mit allen Zahlen, und der einzige Weg zum Editor lag
// in der Liste ganz unten auf Heute, ohne dass etwas darauf hinwies.
$("hkMahlzeiten").addEventListener("click", (event) => {
  const aendern = event.target.closest("[data-hk-aendern]");
  const loeschen = event.target.closest("[data-hk-loeschen]");
  if (aendern) {
    herkunftSchliessen();
    mahlzeitOeffnen(aendern.dataset.hkAendern, heuteTag);
  } else if (loeschen) {
    mahlzeitLoeschen(heuteTag, loeschen.dataset.hkLoeschen);
    herkunftZeigen();
  }
});

for (const el of document.querySelectorAll("[data-herkunft]")) {
  el.addEventListener("click", () => herkunftOeffnen(el.dataset.herkunft, el));
  // Der Ring ist kein echter Knopf, also braucht er die Tasten selbst.
  if (el.tagName !== "BUTTON") {
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); herkunftOeffnen(el.dataset.herkunft, el); }
    });
  }
}
$("hkWahl").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-makro]");
  if (!knopf) return;
  herkunftMakro = knopf.dataset.makro;
  herkunftZeigen();
});
$("hkSchliessen").addEventListener("click", herkunftSchliessen);
$("herkunftBlatt").addEventListener("click", (event) => {
  if (event.target === $("herkunftBlatt")) herkunftSchliessen();
});

/* ---------- Barcode ---------- */

async function barcodeNachschlagen(code) {
  const ziffern = String(code).replace(/\D/g, "");
  if (ziffern.length < 8) { zeigeFeedback("mealFeedback", "Ein Barcode hat mindestens acht Ziffern.", true); return; }
  zeigeFeedback("mealFeedback", "Ich schlage das Produkt nach.");
  try {
    const text = await buildActions({ onChange: refreshAll }).produktNachschlagen({ suche: ziffern });
    zeigeFeedback("mealFeedback", text);
  } catch (error) {
    zeigeFeedback("mealFeedback", `Das hat nicht geklappt: ${error.message}`, true);
  }
}

/*
 * Das Blatt mit den vier Wegen.
 *
 * Ein Weg hinein statt vier Knöpfe nebeneinander. Das Blatt schliesst sich,
 * bevor der gewählte Weg startet: eine Kamera, die hinter einer halb offenen
 * Ebene aufgeht, sieht aus, als hinge die App.
 */
/*
 * Der Knopf steht auf zwei Seiten, das Blatt gibt es einmal. Welcher Knopf
 * es geöffnet hat, zählt trotzdem: er trägt danach den Fortschritt, wenn ein
 * Bild ausgewertet wird, und er bekommt sein aria-expanded zurück.
 */
let erfassenAuslöser = null;
const ERFASSEN_KNOEPFE = ["btnErfassen", "btnErfassenHeute"];

function erfassenOeffnen(event) {
  // Auf Heute mit einem früheren Tag geht es direkt in den Editor für diesen
  // Tag. Foto und Sprache tragen für heute ein und würden den Tag verfehlen.
  if (event?.currentTarget?.id === "btnErfassenHeute" && heuteTag !== todayIso()) {
    mahlzeitNeu("suche", heuteTag);
    return;
  }
  erfassenAuslöser = event?.currentTarget ?? $("btnErfassen");
  $("erfassenBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
  erfassenAuslöser.setAttribute("aria-expanded", "true");
}
function erfassenSchliessen() {
  $("erfassenBlatt").hidden = true;
  document.body.classList.remove("blatt-offen");
  for (const id of ERFASSEN_KNOEPFE) $(id).setAttribute("aria-expanded", "false");
}

for (const id of ERFASSEN_KNOEPFE) $(id).addEventListener("click", erfassenOeffnen);
$("ebSchliessen").addEventListener("click", erfassenSchliessen);
// Ein Tipp auf den dunklen Grund schliesst. Ohne das ist der einzige Ausweg
// das kleine Kreuz oben rechts, und das trifft man mit dem Daumen schlecht.
$("erfassenBlatt").addEventListener("click", (event) => {
  if (event.target === $("erfassenBlatt")) erfassenSchliessen();
});
/*
 * Tippen und Sprechen brauchen das Textfeld, und das steht auf der Essen
 * Seite. Wer von Heute aus kommt, wird deshalb erst dorthin gebracht: ein
 * Feld, das in einer versteckten Ansicht den Fokus bekommt, tut sichtbar
 * nichts, und der Nutzer hält den Knopf für kaputt.
 */
function zurEssenEingabe() {
  showView("essen");
  $("mealComposer").hidden = false;
}

$("ebTippen").addEventListener("click", () => {
  erfassenSchliessen();
  zurEssenEingabe();
  $("mealText").focus();
});

$("erfassenBlatt").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-weg]");
  if (!knopf) return;
  erfassenSchliessen();
  const weg = knopf.dataset.weg;
  if (weg === "foto") $("essenFoto").click();
  if (weg === "barcode") mahlzeitNeu("barcode");
  if (weg === "suche") mahlzeitNeu("suche");
  if (weg === "sprache") {
    zurEssenEingabe();
    $("btnVoice").click();
  }
});

/** Ob heute zum ersten Mal überhaupt diktiert wird. Merkt es sich sofort. */
function diktatErstesMal() {
  const settings = store.getSettings();
  if (settings.diktatErklaert) return false;
  store.setSettings({ ...settings, diktatErklaert: true });
  return true;
}

/**
 * Ein Knopf zum Diktieren in ein Feld. Er hört zu, bis er noch einmal
 * gedrückt wird, und heisst solange "Fertig". Pausen beenden nichts: wer
 * aufzählt, was er gegessen hat, überlegt zwischen den Posten.
 */
function diktatKnopf(knopfId, feldId, hinweis, { nachFertig } = {}) {
  let laufend = null;
  let fertigGedrueckt = false;
  const knopf = $(knopfId);
  const ruhe = knopf.textContent;
  knopf.addEventListener("click", () => {
    if (laufend?.active) { fertigGedrueckt = true; laufend.stop(); return; }
    fertigGedrueckt = false;
    if (!listener?.supported) { toast("Dieser Browser kann keine Spracherkennung."); return; }
    stopSpeaking();
    const vorher = $(feldId).value.trim();
    const mit = (t) => (vorher ? `${vorher} ${t}` : t);
    laufend = new Listener({
      bisStopp: true,
      onPartial: (t) => { $(feldId).value = mit(t); },
      onFinal: (t) => {
        $(feldId).value = mit(t);
        // Fertig hält an und lässt den Text stehen, wie das Viereck im
        // Chat. Eingetragen wird erst mit dem Knopf daneben: im Betrieb
        // stand "Lufka" statt Yufka da, die Suche fand nichts, und der Fehler
        // war schon eingetragen, bevor man ihn sehen konnte. Erst hier und
        // nicht beim Wechsel auf "idle": die native Erkennung liefert das
        // letzte Wort nach dem Anhalten.
        if (fertigGedrueckt && $(feldId).value.trim()) { fertigGedrueckt = false; nachFertig?.(); }
      },
      onState: (state, detail) => {
        const an = state === "listening";
        knopf.textContent = an ? "Fertig" : ruhe;
        knopf.classList.toggle("hoert", an);
        if (state === "error") toast(`Mikrofon: ${detail}`, 5000);
      },
    });
    laufend.start();
    if (diktatErstesMal()) toast(hinweis);
  });
}
/** Nach dem Diktat: Feld mit dem Cursor am Ende, damit ein falsches Wort ein Tipp ist. */
function zumKorrigieren(feldId) {
  const feld = $(feldId);
  feld.focus();
  try { feld.setSelectionRange(feld.value.length, feld.value.length); } catch { /* nicht jedes Feld kann das */ }
}
diktatKnopf("btnVoice", "mealText", "Sprich in Ruhe. Tipp auf Fertig, prüf den Text, dann Erfassen.", {
  nachFertig: () => zumKorrigieren("mealText"),
});

$("feelingRow").addEventListener("click", (event) => {
  const button = event.target.closest("[data-feel]");
  if (!button) return;
  if (!lastMealId) { toast("Erfasse zuerst eine Mahlzeit."); return; }
  store.setMealFeeling(day, lastMealId, button.dataset.feel);
  for (const other of $("feelingRow").children) other.classList.remove("on");
  button.classList.add("on");
  renderVerlauf();
  toast("Notiert");
});

/**
 * Der Vorrat wird beim Verlassen des Feldes gespeichert, nicht auf Knopfdruck.
 *
 * Ein eigener Speichern-Knopf neben einem Textfeld ist eine Falle: wer tippt
 * und dann auf "Vorschläge holen" drückt, hat nicht gespeichert, und die App
 * rechnet mit dem Stand von gestern, ohne es zu sagen.
 */
function vorratLesen() {
  const items = $("fridgeInput").value.split(",").map((x) => x.trim()).filter(Boolean);
  store.setFridge(items);
  return items;
}
$("fridgeInput").addEventListener("blur", vorratLesen);

$("btnSuggest").addEventListener("click", async () => {
  const out = $("suggestOut");
  const button = $("btnSuggest");
  const items = $("fridgeInput").value.split(",").map((s) => s.trim()).filter(Boolean);
  store.setFridge(items);
  button.disabled = true;
  button.textContent = "Denke nach";
  out.hidden = false;
  out.textContent = "Ich schaue, was passt.";
  try {
    out.textContent = await buildActions({ onChange: refreshAll }).mahlzeitVorschlagen();
  } catch (error) {
    out.textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Mahlzeit vorschlagen";
  }
});

/**
 * Stufen von 1 bis 10 zum Antippen statt eines Zahlenfelds. Ein Zahlenfeld
 * öffnet die Tastatur, verdeckt die halbe Seite und will gelöscht werden,
 * bevor man tippt. Der Wert bleibt im versteckten Feld, damit Speichern
 * unverändert liest.
 */
function stufenZeichnen() {
  for (const reihe of document.querySelectorAll("[data-stufen]")) {
    const feld = $(reihe.dataset.stufen);
    // Fünf Stufen, wo eine Frage nach dem Essen keine zehn braucht: niemand
    // trennt mittags 6 von 7. Gespeichert wird weiter auf 1 bis 10, Stufe
    // mal zwei, wie beim Morgen Check-in, damit Verlauf und Auswertung
    // dieselbe Skala lesen.
    const fuenf = "stufenFuenf" in reihe.dataset;
    const wert = fuenf ? Math.round(Number(feld.value) / 2) : Number(feld.value);
    reihe.classList.toggle("fuenf", fuenf);
    reihe.innerHTML = Array.from({ length: fuenf ? 5 : 10 }, (_, i) => i + 1)
      .map((v) => `<button type="button" class="mg-punkt${v === wert ? " an" : ""}" role="radio" aria-checked="${v === wert}" data-stufe="${fuenf ? v * 2 : v}">${v}</button>`)
      .join("");
    reihe.setAttribute("role", "radiogroup");
    reihe.setAttribute("aria-label", reihe.closest("fieldset")?.querySelector("legend")?.textContent ?? "");
  }
}
document.addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-stufen] [data-stufe]");
  if (!knopf) return;
  $(knopf.closest("[data-stufen]").dataset.stufen).value = knopf.dataset.stufe;
  spueren("leicht");
  stufenZeichnen();
});
stufenZeichnen();

$("btnCheckin").addEventListener("click", async () => {
  const aktionen = buildActions({ onChange: refreshAll });
  await aktionen.checkinSpeichern({
    energie: Number($("energy").value) || undefined,
    schlaf: Number($("sleepQ").value) || undefined,
    stimmung: Number($("mood").value) || undefined,
    notiz: $("checkNote").value.trim() || "Check-in ohne Notiz",
  });
  $("checkNote").value = "";
  renderCheckins();
  // Der eben gespeicherte ist der letzte des Tages. Seine Uhrzeit ist der
  // Schlüssel, unter dem die Antwort von daevo danach im Tagebuch steht.
  const tag = todayIso();
  const at = (store.getDay(tag).checkins || []).filter((c) => c.kind !== "herausforderung").pop()?.at;
  const knopf = $("btnCheckin");
  const feld = $("ciAuswertung");
  knopf.disabled = true;
  knopf.textContent = "daevo liest";
  feld.hidden = false;
  feld.textContent = "Gespeichert. Ich schaue mir das an.";
  try {
    const text = await aktionen.tagesCheckinAuswerten({ tag, at });
    if (text) {
      feld.textContent = text;
      store.checkinTagAntwortSetzen(tag, at, text);
    } else {
      feld.textContent = "Gespeichert. Eine Antwort von daevo gibt es mit KI, dein Eintrag steht im Tagebuch.";
    }
  } catch (error) {
    feld.textContent = `Gespeichert. Die Antwort hat nicht geklappt: ${error.message}`;
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Check-in speichern";
    renderCheckins();
  }
});

$("gewichtZeitraum").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-tage]");
  if (!knopf) return;
  gewichtTage = Number(knopf.dataset.tage);
  renderWeight();
});

$("btnWeight").addEventListener("click", async () => {
  const kg = Number(String($("weightInput").value).replace(",", "."));
  if (!(kg >= 30 && kg <= 300)) { toast("Das Gewicht muss zwischen 30 und 300 kg liegen."); return; }
  // Eine Wiegung von früher geht nur in ihren Tag. Das Profil trägt das
  // aktuelle Gewicht, und ein Nachtrag ist nicht das aktuelle.
  if (heuteTag !== todayIso()) {
    store.setWeight(heuteTag, Math.round(kg * 10) / 10);
    refreshAll();
    toast(`Gewicht für ${tagTitel(heuteTag)} eingetragen`);
    return;
  }
  const antwort = await buildActions({ onChange: refreshAll }).gewichtEintragen(Math.round(kg * 10) / 10);
  renderWeight();
  toast(antwort.split(".")[0]);
});

/* ---------- Balance ---------- */

/** Zeitraum des Balance Boards in Tagen. */
let balanceTage = 1;

/**
 * Das Board.
 *
 * Der Stapel links zeigt auf einen Blick, ob etwas fehlt. Die Kacheln darunter
 * sagen, was. Der grosse Ring rechts ist die Tagesnutzung und steht nur beim
 * Zeitraum Heute, weil eine Nutzung über 30 Tage keine Aussage mehr ist.
 */
function renderBalance() {
  for (const knopf of document.querySelectorAll("#balanceZeitraum .seg-btn")) {
    knopf.classList.toggle("is-on", Number(knopf.dataset.tage) === balanceTage);
  }

  const b = balanceFuer(balanceTage);

  const stapel = $("balanceStapel");
  stapel.innerHTML = "";
  stapel.appendChild(anteilsRing(b.bereiche, { groesse: 200, restAnteil: b.restAnteil }));

  // Das Netz. Die Breite folgt dem Fenster, weil die Beschriftung aussen
  // sitzt: auf einem schmalen Gerät läuft sie sonst über den Rand.
  const netz = $("balanceNetz");
  netz.innerHTML = "";
  netz.appendChild(netzDiagramm({
    bereiche: b.bereiche,
    groesse: Math.min(340, Math.max(280, window.innerWidth - 40)),
  }));
  $("netzZeitraum").textContent =
    balanceTage === 1 ? "heute" : balanceTage === 7 ? "letzte Woche" : `letzte ${balanceTage} Tage`;

  // Ohne gesetzte Ziele ist die gestrichelte Form eine Behauptung. Dann steht
  // da, woher sie kommt, statt sie als Vorgabe auszugeben.
  const ohneZiel = b.bereiche.filter((x) => x.zielMinuten <= 0).length;
  // Die Schieflage steht auch in der Ansicht und nicht nur in der Mitteilung.
  // Wer die Mitteilung weggewischt hat und später selbst nachsieht, soll
  // dasselbe lesen.
  const schief = schieflageAusSpeicher(store, balanceFuer, todayIso());
  const schiefKasten = $("balanceRatSchieflage");
  if (schief) {
    schiefKasten.hidden = false;
    schiefKasten.innerHTML = `<div class="li-title">${escapeHtml(schief.titel)}</div>`
      + `<div class="li-sub">${escapeHtml(schief.text)}</div>`;
  } else {
    schiefKasten.hidden = true;
  }

  $("netzHinweis").textContent = ohneZiel
    ? `Für ${ohneZiel} von ${b.bereiche.length} Bereichen steht noch kein Wochenziel. Trag sie unten ein, dann wird die gestrichelte Form deine.`
    : "Die gestrichelte Form ist dein Wochenziel, heruntergerechnet auf den Zeitraum. Das Netz reicht bis 160 Prozent.";

  $("balanceNutzung").textContent = balanceTage === 1
    ? tagesnutzungFuer().satz
    : `Zeitraum ${b.tage} Tage. Die Tagesnutzung gibt es nur für heute, über Wochen sagt ein einzelner Wert nichts.`;

  const kacheln = $("balanceKacheln");
  kacheln.innerHTML = "";
  for (const stand of b.bereiche) {
    // Balken statt Ring. Drei Prozent auf einem Ring sind ein Stummel von zehn
    // Grad, und fünf Ringe ergeben eine Reihe zu drei und eine zu zwei.
    kacheln.appendChild(messwert({
      name: stand.name,
      wert: kurzDauer(stand.minuten),
      zusatz: `von ${kurzDauer(stand.zielMinuten)}`,
      anteil: stand.zielMinuten > 0 ? stand.minuten / stand.zielMinuten : 0,
      ton: bereichFarbe(stand.bereich),
    }));
  }

  const teile = [];
  if (b.gesamtMinuten === 0) {
    teile.push(
      "Noch keine Minute gemessen. Verbinde deinen Kalender, trag eine Zeit ein " +
      "oder hak eine Aufgabe ab, dann füllen sich die Ringe.",
    );
  }
  if (b.nichtZugeordnet > 0) {
    teile.push(
      `${kurzDauer(b.nichtZugeordnet)} konnte ich keinem Bereich zuordnen. ` +
      "Diese Termine haben keinen Titel, aus dem sich etwas lesen lässt, und zählen nirgends mit.",
    );
  }
  const leer = b.bereiche.filter((x) => x.minuten === 0).map((x) => x.name);
  if (leer.length) teile.push(`Ohne eine einzige Minute: ${leer.join(", ")}.`);
  $("balanceHinweis").textContent = teile.join(" ");

  const rat = balanceRat(balanceTage === 1 ? 7 : balanceTage);
  $("balanceRat").innerHTML =
    `<h3>${escapeHtml(rat.bereich ? BEREICH_NAME[rat.bereich] : "Nichts zu korrigieren")}</h3>` +
    `<p>${escapeHtml(rat.befund)}</p>` +
    `<div class="grund">${escapeHtml(rat.schritt)}</div>`;

  renderBalanceZiele();
}

function renderBalanceZiele() {
  const gespeichert = store.getSettings().balanceZiele || {};
  const wrap = $("balanceZiele");
  wrap.innerHTML = "";
  for (const bereich of BEREICHE) {
    const minuten = gespeichert[bereich] ?? STANDARD_ZIELE[bereich];
    const zeile = document.createElement("div");
    zeile.className = "ziel-zeile";
    const name = document.createElement("span");
    name.textContent = BEREICH_NAME[bereich];
    const feld = document.createElement("input");
    feld.type = "number";
    feld.inputMode = "decimal";
    feld.min = "0";
    feld.max = "80";
    feld.step = "0.5";
    feld.value = String(Math.round((minuten / 60) * 2) / 2);
    feld.dataset.bereich = bereich;
    zeile.appendChild(name);
    zeile.appendChild(feld);
    wrap.appendChild(zeile);
  }
}

$("balanceZeitraum").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-tage]");
  if (!knopf) return;
  balanceTage = Number(knopf.dataset.tage) || 1;
  renderBalance();
});

$("btnBalanceZiele").addEventListener("click", () => {
  const ziele = {};
  for (const feld of document.querySelectorAll("#balanceZiele input")) {
    const stunden = Math.max(0, Math.min(80, Number(feld.value) || 0));
    ziele[feld.dataset.bereich] = Math.round(stunden * 60);
  }
  store.setSettings({ ...store.getSettings(), balanceZiele: ziele });
  renderBalance();
  toast("Ziele gespeichert");
});

/* ---------- Dein Tag ---------- */

/**
 * Aufgabenliste und Mittagscheck.
 *
 * Die Reihenfolge der Aufgaben kommt aus dem Rechenkern, nicht aus dieser
 * Datei. Hier wird nur angezeigt und angetippt.
 */
function renderTag() {
  const plan = aufgabenPlan();

  fuelleAufgaben("aufgabenHeute", plan.heute, "Heute steht nichts mehr an.", { heute: true });
  const warten = [...plan.morgen, ...plan.spaeter];
  fuelleAufgaben("aufgabenMorgen", warten, "Nichts, was warten müsste.");
  const summe = plan.heute.reduce((n, a) => n + (Number(a.minuten) || 0), 0);
  $("aufgabenKopf").textContent = plan.heute.length ? `Aufgaben · ${plan.heute.length} offen, ${minutenKurz(summe)}` : "Aufgaben";
  $("aufgabenMorgenKopf").hidden = warten.length === 0;
  $("aufgabenMorgen").hidden = warten.length === 0;
  $("aufgabenGrund").textContent = plan.begruendung.join(" ");

  const heute = dayNumbers(todayIso());
  const schonGemacht = heute.data.checkins.some((c) => c.kind === "midday");
  $("mittagSub").textContent = schonGemacht
    ? "Heute schon beantwortet. Du kannst es überschreiben, wenn sich etwas geändert hat."
    : "Nach dem Mittagessen. Drei Zahlen, danach sage ich dir, ob es am Essen lag.";

  const herausGemacht = heute.data.checkins.find((c) => c.kind === "herausforderung");
  $("herausHinweis").textContent = herausGemacht
    ? `Heute schon beantwortet: ${herausGemacht.note}`
    : "Die Antwort geht an den Coach, der darauf eingeht.";
}

const AUFGABE_ZEICHEN = {
  haken: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  kreuz: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  kalender: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>',
};

/** JJJJ-MM-TT in Ortszeit, `tage` nach heute. */
function tagIn(tage) {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tagGesagt(iso) {
  if (iso === tagIn(1)) return "morgen";
  if (iso === tagIn(2)) return "übermorgen";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Die Zeile unter einer Aufgabe, die nach dem Tag fragt. Im Listeneintrag und
 * nicht als schwebendes Menü: ein Menü über einer Liste deckt die nächste
 * Aufgabe zu und sitzt am unteren Rand halb ausserhalb des Bildschirms.
 */
function verschiebenZeile(a) {
  const zeile = document.createElement("div");
  zeile.className = "verschieben";
  zeile.innerHTML =
    `<button type="button" class="pill" data-tag="${tagIn(1)}">Morgen</button>` +
    `<button type="button" class="pill" data-tag="${tagIn(2)}">Übermorgen</button>` +
    `<label class="pill verschieben-datum">Tag wählen<input type="date" min="${tagIn(1)}" aria-label="Tag wählen"></label>`;
  const setzen = (tag) => {
    if (!tag || tag <= todayIso()) { toast("Wähl einen Tag nach heute."); return; }
    aufgabeVerschieben(a.id, tag);
    renderTag();
    toast(`Verschoben auf ${tagGesagt(tag)}: ${a.text}`);
  };
  zeile.addEventListener("click", (event) => {
    const b = event.target.closest("[data-tag]");
    if (b) setzen(b.dataset.tag);
  });
  const feld = zeile.querySelector("input");
  feld.addEventListener("change", () => setzen(feld.value));
  // Auf dem Rechner öffnet ein Tipp aufs Etikett den Kalender sonst nicht.
  zeile.querySelector(".verschieben-datum").addEventListener("click", () => {
    try { feld.showPicker?.(); } catch { /* ohne Nutzergeste oder alter Browser: das Feld bleibt bedienbar */ }
  });
  return zeile;
}

/** "1 h 55" oder "40 min". */
function minutenKurz(m) {
  const h = Math.floor(m / 60), r = Math.round(m % 60);
  return h ? (r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`) : `${r} min`;
}

/**
 * Eine Aufgabe je Zeile: Kreis zum Abhaken links, Titel und darunter Dauer
 * und Frist, rechts eine Marke, ob sie zuerst oder heute dran ist. Vorher
 * trug jede Aufgabe eine Karte mit drei Zeichen, und drei Aufgaben füllten
 * den Bildschirm. Verschieben und Streichen liegen hinter den drei Punkten.
 */
function fuelleAufgaben(id, aufgaben, leerText, { heute = false } = {}) {
  const el = $(id);
  el.innerHTML = "";
  if (aufgaben.length === 0) {
    el.innerHTML = `<li class="empty">${escapeHtml(leerText)}</li>`;
    return;
  }
  aufgaben.forEach((a, i) => {
    const li = document.createElement("li");
    li.className = "aufgabe tag-aufgabe";
    const frist = a.faellig ? `fällig ${a.faellig === todayIso() ? "heute" : tagGesagt(a.faellig)}` : "";
    const ab = a.ab && a.ab > todayIso() ? `ab ${tagGesagt(a.ab)}` : "";
    const wichtig = ["nebensächlich", "normal", "wichtig"][a.wichtigkeit - 1] || "normal";
    const ausTodoist = a.quelle === "todoist";
    const dauer = `${a.dauerAngenommen ? "etwa " : ""}${a.minuten} min`;
    const meta = [dauer, frist, ab, ausTodoist ? "Todoist" : ""].filter(Boolean).join(" · ");
    const marke = heute ? (i === 0 ? `<span class="tag-marke zuerst">Zuerst</span>` : `<span class="tag-marke">Heute</span>`) : "";
    li.innerHTML =
      `<button type="button" class="tag-haken" aria-label="Erledigt: ${escapeHtml(a.text)}"></button>`
      + `<div class="li-main"><div class="li-title">${escapeHtml(a.text)}</div>`
      // Ein Tipp auf die Zeile darunter schaltet die Wichtigkeit weiter. Eine
      // Einschätzung, die man nicht korrigieren kann, ist eine Bevormundung.
      + (ausTodoist
        ? `<div class="li-sub">${escapeHtml(meta)}</div>`
        : `<button class="stufe tag-meta" data-stufe="${a.wichtigkeit}" type="button" title="Tipp ändert die Wichtigkeit, jetzt ${wichtig}${a.warum ? `: ${escapeHtml(a.warum)}` : ""}">${escapeHtml(meta)}${a.wichtigkeit === 3 ? " · wichtig" : ""}</button>`)
      + `</div>${marke}`
      + (ausTodoist ? "" : `<button type="button" class="tag-mehr" aria-label="Verschieben oder streichen: ${escapeHtml(a.text)}" aria-expanded="false"><i></i><i></i><i></i></button>`);
    li.querySelector(".stufe")?.addEventListener("click", () => { aufgabeUmstufen(a.id); renderTag(); refreshAll(); });
    const haken = li.querySelector(".tag-haken");
    haken.addEventListener("click", async () => {
      haken.disabled = true;
      li.classList.add("erledigt");
      spueren("leicht");
      const ergebnis = await aufgabeErledigen(a.id);
      renderTag();
      refreshAll();
      abgehaktMelden(ergebnis, () => { renderTag(); refreshAll(); });
    });
    // Streichen und Verschieben nur bei eigenen Aufgaben. Eine Aufgabe in
    // Todoist auf einen Tipp hin zu löschen wäre ein Eingriff in eine fremde
    // Liste, und ein hier gesetzter Tag wäre beim nächsten Lesen wieder weg.
    const mehr = li.querySelector(".tag-mehr");
    mehr?.addEventListener("click", () => {
      const offen = li.querySelector(".verschieben");
      if (offen) { offen.remove(); mehr.setAttribute("aria-expanded", "false"); return; }
      mehr.setAttribute("aria-expanded", "true");
      const zeile = verschiebenZeile(a);
      const weg = document.createElement("button");
      weg.type = "button";
      weg.className = "pill tag-streichen";
      weg.textContent = "Streichen";
      weg.addEventListener("click", () => { aufgabeLoeschen(a.id); renderTag(); toast(`Gestrichen: ${a.text}`); });
      zeile.append(weg);
      li.appendChild(zeile);
    });
    el.appendChild(li);
  });
}

// Enter im Feld schickt das Formular ab, und das löst den Klick auf den Knopf
// aus. Das Formular selbst darf die Seite nicht neu laden.
$("aufgabeForm").addEventListener("submit", (ev) => ev.preventDefault());
for (const k of document.querySelectorAll("[data-tag-werkzeug]")) {
  k.addEventListener("click", () => {
    const name = k.dataset.tagWerkzeug;
    const bereich = document.querySelector(`[data-werkzeug="${name}"]`);
    const auf = bereich.hidden;
    for (const b of document.querySelectorAll("[data-werkzeug]")) b.hidden = true;
    for (const x of document.querySelectorAll("[data-tag-werkzeug]")) { x.setAttribute("aria-expanded", "false"); x.classList.remove("an"); }
    bereich.hidden = !auf;
    k.setAttribute("aria-expanded", String(auf));
    k.classList.toggle("an", auf);
    if (auf) bereich.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

$("btnAufgabe").addEventListener("click", async () => {
  const text = $("aufgabeText").value.trim();
  if (text.length < 3) { toast("Schreib kurz, was zu tun ist."); return; }
  const knopf = $("btnAufgabe");
  knopf.disabled = true;
  knopf.classList.add("laeuft");
  $("aufgabeEcho").textContent = "daevo schaut sich das an.";
  try {
    const ergebnis = await aufgabeAnlegenEingestuft(text);
    if (!ergebnis) { $("aufgabeEcho").textContent = "Das war zu kurz."; return; }
    $("aufgabeText").value = "";
    $("aufgabeEcho").textContent = ergebnis.einstufung.regelbasiert
      ? `${ergebnis.text} Ohne KI Schlüssel nach Wortgruppen sortiert, nicht verstanden.`
      : ergebnis.text;
    renderTag();
    refreshAll();
  } catch (error) {
    $("aufgabeEcho").textContent = `Einstufung nicht möglich: ${error.message}`;
  } finally {
    knopf.disabled = false;
    knopf.classList.remove("laeuft");
  }
});

/**
 * Kopf leeren.
 *
 * Der Knopf läuft bewusst über die Aufgabenliste weiter: das Ergebnis steht
 * nicht nur da, die Aufgaben stehen danach wirklich in der Liste, und die
 * Priorisierung sagt sofort, was heute noch reingeht.
 */
$("btnKopf").addEventListener("click", async () => {
  const text = $("kopfText").value.trim();
  if (text.length < 20) { toast("Schreib mehr. Alles, was dir im Kopf herumgeht."); return; }
  const button = $("btnKopf");
  button.disabled = true;
  button.textContent = "Sortiere";
  $("kopfErgebnis").hidden = false;
  $("kopfErgebnis").textContent = "Ich sortiere das.";
  try {
    const ergebnis = await kopfSortieren(text);
    if (!ergebnis) { $("kopfErgebnis").textContent = "Dafür war zu wenig da."; return; }
    $("kopfErgebnis").textContent =
      `${ergebnis.text}\n\n${ergebnis.angelegt.length === 1 ? "Eine Aufgabe steht" : `${ergebnis.angelegt.length} Aufgaben stehen`} jetzt in deiner Liste.`;
    $("kopfText").value = "";
    renderTag();
    refreshAll();
    kopfShow(ergebnis.ergebnis);
  } catch (error) {
    $("kopfErgebnis").textContent = `Das hat nicht geklappt: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "Sortieren";
  }
});

diktatKnopf("btnKopfDiktat", "kopfText", "Sprich in Ruhe. Tipp auf Fertig, wenn du durch bist.");

/**
 * Das Briefing als Präsentation, morgens für heute, abends für morgen. Der
 * Text dazu steht weiter im Chat und in der Mitteilung, hier nur Karten.
 */
let bsArt = "morgen";
let bsSteuerung = null;
// Der Tagesabschluss ist das Briefing vom Abend ohne den Blick nach vorn:
// wie heute lief, was von der Untergrenze offen ist, Schluss.
const ABSCHLUSS_KARTEN = ["rueckblick", "untergrenze", "feierabend", "abend", "ende"];
let bsNur = null;
function briefingRechnen() {
  const b = tagesbriefingFuer(bsArt === "abend" ? "abend" : "morgen");
  if (!bsNur) return b;
  const folien = (b.folien || []).filter((f) => bsNur.includes(f.art));
  return { ...b, folien: folien.length > 1 ? folien : b.folien };
}
function briefingShowOeffnen(art, { nur = null } = {}) {
  bsArt = art === "abend" ? "abend" : "morgen";
  bsNur = nur;
  let b;
  try { b = briefingRechnen(); } catch (e) { console.error(e); toast("Das Briefing liess sich nicht rechnen."); return; }
  bsSteuerung = briefingZeigen(b, $("briefingShow"), {
    aktion: (was) => { if (was === "tag") showView("tag"); else if (was === "abend") abend.oeffnen(); },
    anpassen: briefingAnpassen,
  });
}

/**
 * Eine der übrigen Präsentationen auf derselben Bühne wie das Briefing.
 * Rechnet sie nicht, steht eine Meldung da statt einer leeren Bühne.
 */
let storySteuerung = null;
function storyOeffnen(name, rechnen, { aktion, anpassen } = {}) {
  let folien;
  try { folien = rechnen(); } catch (e) { console.error(e); toast(`${name} liess sich nicht rechnen.`); return null; }
  if (!folien?.length) return null;
  storySteuerung = briefingZeigen({ folien }, $("briefingShow"), { name, aktion, anpassen });
  return storySteuerung;
}

/* 1. Der Wochenrückblick. */
function rueckblickShow() {
  storyOeffnen("Wochenrückblick", () => rueckblickFolien(wochenrueckblickFuer()), {
    anpassen: (id, _zeile, st) => {
      if (id === "nachtragen") { st.schliessen(); showView("essen"); return; }
      if (id === "fokus-aufgabe") {
        const r = wochenrueckblickFuer();
        const neu = aufgabeAnlegenEingestuft(r.fokus.replace(/\.$/, ""));
        Promise.resolve(neu).then(() => { renderTag(); toast("Als Aufgabe unter Dein Tag gemerkt."); }).catch(() => toast("Das liess sich nicht speichern."));
      }
    },
  });
}

/* 3. Die Auswertung, eine Karte je Befund. */
function auswertungShow() {
  storyOeffnen("Auswertung", () => {
    const m = musterBefunde(60);
    return auswertungFolien({ befunde: m.befunde, widersprueche: widerspruchListe(), tage: m.tage });
  });
}

/* 4. Der Zeitraum aus dem Bericht, im Monat wie ein Jahresrückblick. */
function berichtShow() {
  const wahl = $("berichtZeitraum");
  const wert = wahl.value || "28";
  const text = wahl.selectedOptions[0]?.textContent?.replace(/, bisher$/, "") || "Monat";
  const monat = !/^\d+$/.test(wert);
  const opt = monat
    ? { name: text, etikett: "Monatsrückblick" }
    : { name: text, titel: wert === "7" ? "Deine Woche" : "Deine vier Wochen", ende: "Das war dein Zeitraum", etikett: "Rückblick" };
  storyOeffnen(monat ? "Monatsrückblick" : "Rückblick", () => monatsFolien(berichtFuer(wert), opt), {
    aktion: (was) => {
      if (was !== "teilen") return;
      monatsBild(berichtFuer(wert), opt.titel ?? `Dein ${text}`)
        .then((blob) => bildTeilen(blob, `daevo-${wert}.png`, text))
        .then((r) => { if (r === "gespeichert") toast("Bild gespeichert"); })
        .catch(() => toast("Das Bild ließ sich nicht erstellen."));
      return "bleiben";
    },
  });
}

/* 7. Kopf leeren: eine Karte je Schublade, dann der erste Schritt. */
function kopfShow(ergebnis = kopfLetzter()) {
  if (!ergebnis) { toast("Das letzte Kopf leeren ist älter als ein Tag."); return; }
  storyOeffnen("Kopf leeren", () => kopfFolien(ergebnis), {
    anpassen: (id, _z, st) => { if (id === "aufgaben") { st.schliessen(); showView("tag"); } },
  });
}

/** Nach einer Änderung neu rechnen und auf derselben Karte weiter. */
function briefingNeu() {
  try { bsSteuerung?.aktualisieren(briefingRechnen()); } catch (e) { console.error(e); }
  // Auch die Kalenderseite, von der aus getauscht werden kann.
  try { briefingZeichnen(); essenZeichnen(essenTag); zeitleisteZeichnen(); } catch (e) { console.error(e); }
  refreshAll();
}

/** Der Knopf zum Austauschen an einem Essen, überall gleich. */
function tauschKnopf(mahlzeit, gericht, kcal, um) {
  if (!mahlzeit) return "";
  return `<button type="button" class="essen-tauschen" data-essen-tauschen="${escapeHtml(mahlzeit)}" data-gericht="${escapeHtml(gericht)}" data-kcal="${Number(kcal) || 0}" data-um="${escapeHtml(um)}">`
    + `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>Austauschen</button>`;
}

/** Ein Tipp auf Austauschen öffnet das Blatt aus dem Briefing für diesen Tag. */
function tauschOeffnen(knopf, tag) {
  const art = knopf.dataset.essenTauschen;
  bsaOeffnen({ art, name: MAHLZEIT_NAME[art] || "Mahlzeit", gericht: knopf.dataset.gericht, kcal: Number(knopf.dataset.kcal) || 0, um: knopf.dataset.um }, tag);
}

/**
 * "Anpassen" auf einer Karte. Essen und Fokus ändern sich direkt im
 * Briefing, die Präsentation hält so lange an. Der Rest gehört auf seine
 * Seite: Termine in den Kalender, Aufgaben auf Dein Tag, Standards zu den
 * Standards. Dorthin schliesst die Präsentation.
 */
function briefingAnpassen(art, zeile, steuerung) {
  if (art === "essen" && zeile) { steuerung.anhalten(true); bsaOeffnen(zeile); return; }
  if (art === "fokus") { steuerung.anhalten(true); bsfOeffnen(); return; }
  const ziel = { tag: "kalender", achtung: "kalender", tun: "tag", untergrenze: "standards", rueckblick: "heute" }[art];
  if (!ziel) return;
  if (ziel === "heute") heuteTag = todayIso();
  showView(ziel);
  if (art === "rueckblick") setTimeout(() => erfassenOeffnen({ currentTarget: $("btnErfassenHeute") }), 250);
  return "schliessen";
}

/* ---------- Eine Mahlzeit im Briefing ändern ---------- */

let bsaZeile = null;
// Der Tag, für den das Blatt gerade ändert. Aus der Präsentation der Tag des
// Briefings, von der Kalenderseite der Tag, der dort gezeigt wird.
let bsaTag = todayIso();
const MAHLZEIT_NAME = { fruehstueck: "Frühstück", mittagessen: "Mittagessen", snack: "Snack", abendessen: "Abendessen" };

function bsaOeffnen(zeile, tag = briefingTag(bsArt)) {
  bsaZeile = zeile;
  bsaTag = tag;
  const gewaehlt = essenWahlFuer(tag).some((w) => w.art === zeile.art);
  $("bsaTitel").textContent = `${MAHLZEIT_NAME[zeile.art] || zeile.name} ändern`;
  $("bsaVorschlag").textContent = `${gewaehlt ? "Gerade" : "Vorschlag"}: ${zeile.gericht}, ${zeile.kcal} kcal um ${zeile.um}`;
  $("bsaText").value = "";
  $("bsaHinweis").textContent = "";
  $("bsaVorschlagZurueck").hidden = !gewaehlt;
  // Eintragen gibt es nur für heute: morgen ist noch nichts gegessen.
  $("bsaGegessen").hidden = tag !== todayIso();
  $("bsaGegessen").textContent = gewaehlt ? "Gegessen, jetzt eintragen" : "So gegessen, jetzt eintragen";
  bsaBeschaeftigt(false);
  $("bsAendern").hidden = false;
}

function bsaSchliessen({ weiter = true } = {}) {
  $("bsAendern").hidden = true;
  bsaZeile = null;
  if (weiter) bsSteuerung?.anhalten(false);
}

function bsaBeschaeftigt(an, text = "") {
  for (const id of ["bsaGegessen", "bsaUebernehmen", "bsaFoto", "bsaScan", "bsaSuchen", "bsaMikro"]) $(id).disabled = an;
  $("bsaUebernehmen").textContent = an ? "daevo rechnet" : "Übernehmen";
  if (text) $("bsaHinweis").textContent = text;
}

/** Nach einer gespeicherten Wahl: zu, neu rechnen, kurz sagen, was gilt. */
function bsaFertig(satz) {
  bsaSchliessen();
  briefingNeu();
  toast(satz || "Geändert. Der Rest des Tages ist neu gerechnet.", 3500);
}

$("bsaZu").addEventListener("click", () => bsaSchliessen());
$("bsAendern").addEventListener("click", (ev) => { if (ev.target === $("bsAendern")) bsaSchliessen(); });
diktatKnopf("bsaMikro", "bsaText", "Sag, was du stattdessen isst, mit Menge. Tipp auf Fertig, prüf den Text, dann Übernehmen.", {
  nachFertig: () => zumKorrigieren("bsaText"),
});

$("bsaUebernehmen").addEventListener("click", async () => {
  const text = $("bsaText").value.trim();
  if (!bsaZeile) return;
  if (!text) { $("bsaHinweis").textContent = "Schreib oder sag, was du isst, etwa 200 g Reis mit Hähnchen."; $("bsaText").focus(); return; }
  bsaBeschaeftigt(true, "");
  const r = await essenWahlAusText(bsaTag, bsaZeile.art, text);
  bsaBeschaeftigt(false);
  if (!r.ok) { $("bsaHinweis").textContent = r.text; return; }
  bsaFertig(r.text ? `Geändert. ${r.text}` : "");
});

$("bsaFoto").addEventListener("click", async () => {
  if (!(await kiFreigabe())) { toast("Fotos auswerten braucht die KI. Du kannst sie im Profil unter Datenschutz erlauben."); return; }
  $("bsaDatei").value = "";
  $("bsaDatei").click();
});
$("bsaDatei").addEventListener("change", async () => {
  const datei = $("bsaDatei").files?.[0];
  if (!datei || !bsaZeile) return;
  bsaBeschaeftigt(true, "daevo schaut sich das Foto an.");
  const anhang = await anhangAusDatei(datei);
  if (anhang.fehler) { bsaBeschaeftigt(false, anhang.fehler); return; }
  const r = await essenWahlAusFoto(bsaTag, bsaZeile.art, anhang);
  bsaBeschaeftigt(false, r.ok ? "" : r.text);
  if (r.ok) bsaFertig();
});

/** Scannen und Suchen laufen über den Editor, dort lässt sich die Menge danach ändern. */
function bsaImEditor(fokus) {
  const zeile = bsaZeile;
  if (!zeile) return;
  const tag = bsaTag;
  const vorher = essenWahlFuer(tag).find((w) => w.art === zeile.art);
  // Von der Kalenderseite aus war keine Präsentation offen, und sie darf nach
  // dem Editor auch nicht plötzlich erscheinen.
  const showOffen = !$("briefingShow").hidden;
  bsaSchliessen({ weiter: false });
  $("briefingShow").hidden = true;
  wahlEditorOeffnen({
    tag, art: zeile.art, um: vorher?.um || zeile.um, posten: vorher?.posten || [],
    titel: `${MAHLZEIT_NAME[zeile.art] || zeile.name} ändern`, fokus,
    fertig: (gespeichert) => {
      if (showOffen) $("briefingShow").hidden = false;
      if (gespeichert) briefingNeu();
      bsSteuerung?.anhalten(false);
    },
  });
}
$("bsaScan").addEventListener("click", () => bsaImEditor("barcode"));
$("bsaSuchen").addEventListener("click", () => bsaImEditor("suche"));
$("bsaGegessen").addEventListener("click", () => {
  if (!bsaZeile) return;
  const art = bsaZeile.art;
  const vorher = essenWahlFuer(todayIso()).find((w) => w.art === art);
  const r = geplanteMahlzeitEintragen(art);
  if (!r) { $("bsaHinweis").textContent = "Dazu gibt es nichts zum Eintragen. Sag oder tipp oben, was du gegessen hast."; return; }
  bsaSchliessen();
  briefingNeu();
  refreshAll();
  toastAktion(`${MAHLZEIT_NAME[art] || "Mahlzeit"} eingetragen, ${r.kcal} kcal um ${r.at}.`, "Rückgängig", () => {
    store.removeMeal(r.tag, r.id);
    if (vorher) essenWahlSetzen(r.tag, art, vorher);
    briefingNeu();
    refreshAll();
  });
});
$("bsaVorschlagZurueck").addEventListener("click", () => {
  if (!bsaZeile) return;
  essenWahlSetzen(bsaTag, bsaZeile.art, null);
  bsaFertig("Wieder der Vorschlag von daevo.");
});

/* ---------- Den Fokus im Briefing wählen ---------- */

function bsfOeffnen() {
  const tag = briefingTag(bsArt);
  const jetzt = store.getSettings().briefingFokus;
  const liste = fokusKandidaten().slice(0, 8);
  $("bsfListe").innerHTML = liste.length
    ? liste.map((t, i) => `<button type="button" class="bsf-wahl${jetzt?.tag === tag && jetzt.text === t ? " an" : ""}" data-bsf="${i}">${escapeHtml(t)}</button>`).join("")
    : '<p class="bsa-vorschlag">Keine offenen Aufgaben. Schreib unten, worauf es ankommt.</p>';
  $("bsfListe").dataset.liste = JSON.stringify(liste);
  $("bsfText").value = "";
  $("bsfZurueck").hidden = !(jetzt?.tag === tag);
  $("bsFokus").hidden = false;
}
function bsfSchliessen() { $("bsFokus").hidden = true; bsSteuerung?.anhalten(false); }
function bsfSetzen(text) {
  fokusWaehlen(briefingTag(bsArt), text);
  $("bsFokus").hidden = true;
  briefingNeu();
  bsSteuerung?.anhalten(false);
}
$("bsfZu").addEventListener("click", bsfSchliessen);
$("bsFokus").addEventListener("click", (ev) => {
  if (ev.target === $("bsFokus")) return bsfSchliessen();
  const k = ev.target.closest("[data-bsf]");
  if (!k) return;
  const liste = JSON.parse($("bsfListe").dataset.liste || "[]");
  if (liste[Number(k.dataset.bsf)]) bsfSetzen(liste[Number(k.dataset.bsf)]);
});
$("bsfSetzen").addEventListener("click", async () => {
  const text = $("bsfText").value.trim();
  if (!text) { $("bsfText").focus(); return; }
  // Ein eigener Fokus wird eine Aufgabe für diesen Tag: sonst gälte er nur,
  // solange er in der Liste steht, und dort stünde er nie.
  if (!fokusKandidaten().includes(text)) {
    try { await aufgabeAnlegenEingestuft(text); } catch (e) { console.error(e); }
  }
  bsfSetzen(text);
});
$("bsfZurueck").addEventListener("click", () => bsfSetzen(null));
for (const k of document.querySelectorAll(".bs-wahl [data-briefing-zeigen]")) {
  k.addEventListener("click", () => briefingShowOeffnen(k.dataset.briefingZeigen));
}
/**
 * Die beiden Wege in die Präsentation oben auf der Kalenderseite. Ab 17 Uhr
 * zählt der Blick auf morgen, darunter der Abschluss von heute. Vorher der
 * Tag heute, darunter schon morgen.
 */
function kalShowSetzen() {
  const abends = new Date().getHours() >= 17;
  $("kalShowHaupt").dataset.art = abends ? "abend" : "morgen";
  $("kalShowTitel").textContent = abends ? "Briefing für morgen ansehen" : "Tagesbriefing ansehen";
  $("kalShowUnter").textContent = abends ? "Morgen in Karten, eine Minute" : "Dein Tag in Karten, eine Minute";
  $("kalShowNeben").dataset.art = abends ? "abschluss" : "abend";
  $("kalShowNeben").textContent = abends ? "Tagesabschluss von heute" : "Schon mal auf morgen schauen";
}
$("btnRueckblickShow").addEventListener("click", rueckblickShow);
$("btnBerichtShow").addEventListener("click", berichtShow);
$("btnAuswertungShow").addEventListener("click", auswertungShow);
$("kalShowHaupt").addEventListener("click", () => briefingShowOeffnen($("kalShowHaupt").dataset.art));
$("kalShowNeben").addEventListener("click", () => {
  const art = $("kalShowNeben").dataset.art;
  if (art === "abschluss") briefingShowOeffnen("abend", { nur: ABSCHLUSS_KARTEN });
  else briefingShowOeffnen(art);
});

$("btnMittag").addEventListener("click", () => {
  const zahl = (id, min, max) => Math.max(min, Math.min(max, Number($(id).value) || min));
  const befund = mittagscheck({
    energie: zahl("mEnergie", 1, 10),
    konzentration: zahl("mKonz", 1, 10),
    saettigung: zahl("mSatt", 1, 10),
  });
  const text = mittagscheckText(befund);
  $("mittagBefund").textContent = text;
  $("mittagBefund").hidden = false;
  $("btnMittagAlternative").hidden = !befund.auffaellig;
  renderTag();
  refreshAll();
});

/**
 * Bei schlechten Werten direkt eine bessere Mahlzeit rechnen.
 *
 * Der Vorschlag kommt aus derselben Funktion wie sonst, damit die Nährwerte
 * aus einer Quelle stammen. Der Mittagscheck sagt nur, was sich ändern soll.
 */
$("btnMittagAlternative").addEventListener("click", async () => {
  const button = $("btnMittagAlternative");
  button.disabled = true;
  try {
    const text = await buildActions({ onChange: refreshAll }).mahlzeitVorschlagen("viel Protein, nicht schwer");
    $("mittagBefund").textContent += `\n\n${text}`;
  } finally {
    button.disabled = false;
  }
});

$("btnHeraus").addEventListener("click", async () => {
  const text = $("herausText").value.trim();
  if (text.length < 3) { toast("Schreib einen Satz."); return; }
  $("herausText").value = "";
  herausforderungSpeichern(text);
  renderTag();
  showView("assistant");
  await send(`Meine größte Herausforderung heute: ${text}. Was würdest du dagegen machen?`);
});

/* ---------- Kalender ---------- */

/**
 * Der Tag, der gerade im Kalender angezeigt wird.
 *
 * Getrennt vom Tag der Tagesansicht, weil man den Kalender vorausschauend
 * benutzt und die Zahlen des Tages rückblickend.
 */
let kalenderTag = todayIso();

const KALENDER_ANLEITUNG = [
  "Google Calendar: In den Einstellungen den Kalender auswählen, ganz unten unter Kalender integrieren",
  "die geheime Adresse im iCal Format kopieren, im Browser öffnen und die Datei hier auswählen.",
  "Apple Kalender am Mac: Kalender auswählen, Ablage, Exportieren, dann die .ics Datei hier auswählen.",
  "Auf dem iPhone: iCloud Kalender im Web öffnen, Kalender freigeben, öffentlicher Kalender,",
  "die Adresse kopieren, webcal durch https ersetzen und die Datei hier auswählen.",
  "Nichts davon geht an einen Server. Die Datei wird im Browser gelesen und nur die Termine bleiben liegen.",
].join(" ");

/**
 * Wohin daevo Trainings und Erinnerungen schreibt. Vorher immer der
 * Standardkalender von iOS, und der steht ab Werk auf iCloud: das Training
 * stand im Apple Kalender, im Google Kalender des Nutzers fehlte es. Jetzt
 * wählt das Plugin Google vor iCloud, und hier lässt es sich festlegen.
 */
async function zielKalenderZeigen() {
  const { schreibKalender, kalenderWahlText } = await import("./kalender-schreiben.js");
  const liste = await schreibKalender();
  $("kalZielFeld").hidden = liste.length < 2;
  if (liste.length < 2) return;
  $("kalZiel").innerHTML = liste
    .map((k) => `<option value="${escapeHtml(k.id)}"${k.ziel ? " selected" : ""}>${escapeHtml(kalenderWahlText(k))}</option>`)
    .join("");
}

$("btnKalAlle").addEventListener("click", async () => {
  const s = store.getSettings();
  store.setSettings({ ...s, kalenderAlle: !s.kalenderAlle });
  await kalenderAbgleichen({ zwang: true });
  refreshAll();
});

function renderKalender() {
  renderTodoist();
  $("kalTag").value = kalenderTag;
  $("kalAnleitung").textContent = KALENDER_ANLEITUNG;
  const sync = store.getSettings();
  $("btnAppleKalender").hidden = Boolean(sync.appleKalender);
  $("kalKonten").textContent = sync.appleKalender ? kontenText(sync.kalenderKonten) : "";
  zielKalenderZeigen();
  // Welcher Kalender gelesen wird. Ohne die Zeile wüsste niemand, warum ein
  // Termin aus dem alten iCloud Kalender nicht mehr im Briefing steht.
  const ue = sync.kalenderUebersicht;
  const mehrere = Boolean(sync.appleKalender && (sync.kalenderAlle || ue?.ignoriert?.length));
  $("kalHaupt").textContent = !sync.appleKalender || !ue ? ""
    : sync.kalenderAlle ? "daevo liest alle Kalender auf deinem iPhone."
    : ue.haupt ? `daevo liest ${ue.haupt.name} mit ${ue.haupt.anzahl} Terminen, den Kalender, den du am meisten nutzt. `
      + `Nicht gelesen: ${ue.ignoriert.map((z) => `${z.name} (${z.anzahl})`).join(", ")}. Geburtstage und Feiertage laufen separat.`
    : "";
  $("btnKalAlle").hidden = !mehrere;
  $("btnKalAlle").textContent = sync.kalenderAlle ? "Nur den meistgenutzten Kalender lesen" : "Alle Kalender lesen";
  $("btnKalAbgleich").hidden = !(sync.appleKalender || kalenderAbos(sync).length);

  const stand = kalenderStand();
  const quellen = $("kalQuellen");
  quellen.innerHTML = "";
  if (stand.quellen.length === 0) {
    quellen.innerHTML = '<li class="empty">Noch kein Kalender verbunden.</li>';
  } else {
    for (const q of stand.quellen) {
      const li = document.createElement("li");
      const stand = q.stand ? new Date(q.stand) : null;
      const wann = stand
        ? (todayIso(stand) === todayIso() ? `heute ${uhrzeit(stand.getTime())}` : stand.toLocaleDateString("de-DE"))
        : "";
      const art = q.art === "apple" ? "gleicht sich ab, vom iPhone" : q.art === "abo" ? "gleicht sich ab, Abo" : "einmalig eingelesen";
      li.innerHTML =
        `<div class="li-main"><div class="li-title">${escapeHtml(q.name)}</div>` +
        `<div class="li-sub">${q.anzahl} Termine, Stand ${escapeHtml(wann)} · <span class="kal-art">${art}</span></div></div>`;
      const weg = document.createElement("button");
      weg.className = "ghost";
      weg.textContent = "Entfernen";
      weg.addEventListener("click", () => {
        if (q.name === APPLE_QUELLE) appleKalenderTrennen();
        else {
          store.setSettings(aboEntfernen(store.getSettings(), q.name));
          kalenderEntfernen(q.name);
        }
        renderKalender();
        refreshAll();
        toast("Kalender entfernt");
      });
      li.appendChild(weg);
      quellen.appendChild(li);
    }
  }

  const a = ablaufFuer(kalenderTag);
  zeitleisteZeichnen(a);
  // Als Dauer gesagt, nicht als Minutenzahl: "975 Minuten" rechnet jeder
  // Leser selbst um.
  $("kalBelegt").textContent = kurzDauer(a.belegtMinuten);
  $("kalQuote").textContent = `${Math.round(a.auslastung * 100)} %`;
  $("kalFokus").textContent = a.fokusblock
    ? `${uhrzeit(a.fokusblock.von)} bis ${uhrzeit(a.fokusblock.bis)}, ${kurzDauer(a.fokusblock.minuten)}`
    : "keiner";

  const geburtstage = (a.geburtstage || []).map((n) => ({ titel: `${n} hat Geburtstag`, sub: "ganztägig", seite: "" }));
  fuelleListe("kalListe", [...geburtstage, ...[...a.ganztags, ...a.termine].map((t) => ({
    titel: t.titel,
    sub: t.ganztags ? "ganztägig" : `${uhrzeit(t.von)} bis ${uhrzeit(t.bis)}${t.ort ? `, ${t.ort}` : ""}`,
    seite: t.quelle || "",
  }))], "Keine Termine an diesem Tag.");

  essenZeichnen(kalenderTag);

  fuelleListe("kalHinweise", a.hinweise.map((h) => ({ titel: h, sub: "", seite: "" })), "Nichts Auffälliges.");

  briefingZeichnen();

  const vorschlag = trainingsplanVorschlag();
  fuelleListe("planVorschlag", vorschlag.map((v) => ({
    titel: `${WEEKDAYS[v.weekday]} ${v.startsAt} ${v.titel}`,
    sub: `${v.minutes} Minuten, ${v.vorkommen} mal im Kalender`,
    seite: "",
  })), "Noch keine Einheit, die sich regelmässig wiederholt.");
  $("btnPlanUebernehmen").hidden = vorschlag.length === 0;
}

$("btnPlanUebernehmen").addEventListener("click", () => {
  const anzahl = trainingsplanUebernehmen();
  if (anzahl === 0) { toast("Nichts zu übernehmen."); return; }
  profile = store.getProfile();
  renderKalender();
  refreshAll();
  toast(`${anzahl} ${anzahl === 1 ? "Einheit" : "Einheiten"} ins Profil übernommen`);
});

/** Tagesleiste und Zeitleiste oben auf der Kalenderseite, kalender-zeitleiste.js. */
function zeitleisteZeichnen(a = ablaufFuer(kalenderTag)) {
  if (kalenderTag < todayIso()) kalenderTag = todayIso();
  $("kalTage").innerHTML = tageLeisteHtml(todayIso(), kalenderTag);
  $("kalTage").querySelector(".an")?.scrollIntoView?.({ block: "nearest", inline: "center" });
  $("kalTagZeile").textContent = tagZeile(a, { uhr: uhrzeit, dauer: kurzDauer });
  let b;
  try { b = tagesbriefingFuer(kalenderTag === todayIso() ? "morgen" : "abend", Date.now(), kalenderTag); }
  catch (e) { console.error(e); $("kalZeitleiste").innerHTML = '<p class="kz-leer">Der Tag liess sich nicht rechnen.</p>'; return; }
  const punkte = b.punkte;
  const jetzt = kalenderTag === todayIso() ? naechsterPunkt(punkte, Date.now()) : -1;
  $("kalZeitleiste").innerHTML = zeitleisteHtml(punkte, {
    jetzt, uhr: uhrzeit,
    tausch: (p, zeit) => tauschKnopf(p.mahlzeit, p.titel, p.kcal, zeit).replace("Austauschen</button>", '<span class="kz-tausch-text">Austauschen</span></button>'),
  });
}
$("kalTage").addEventListener("click", (ev) => {
  const k = ev.target.closest("[data-kal-tag]");
  if (!k) return;
  kalenderTag = k.dataset.kalTag;
  essenTag = kalenderTag;
  spueren("leicht");
  renderKalender();
});
$("kalZeitleiste").addEventListener("click", async (ev) => {
  const tauschen = ev.target.closest("[data-essen-tauschen]");
  if (tauschen) { tauschOeffnen(tauschen, kalenderTag); return; }
  const knopf = ev.target.closest("[data-erledigt]");
  if (knopf) {
    knopf.disabled = true;
    knopf.classList.add("an");
    spueren("erfolg");
    const ergebnis = await aufgabeErledigen(knopf.dataset.erledigt);
    setTimeout(() => { zeitleisteZeichnen(); refreshAll(); }, 450);
    abgehaktMelden(ergebnis, () => { zeitleisteZeichnen(); refreshAll(); });
    return;
  }
  const rezept = ev.target.closest("[data-rezept]");
  if (rezept) { const m = vorschlagFuer(kalenderTag, rezept.dataset.rezept); if (m) rezeptBlattOeffnen(m); }
});

/** Baut eine Liste aus drei Feldern. Spart drei fast gleiche Schleifen. */
function fuelleListe(id, eintraege, leerText) {
  const el = $(id);
  el.innerHTML = "";
  if (eintraege.length === 0) {
    el.innerHTML = `<li class="empty">${escapeHtml(leerText)}</li>`;
    return;
  }
  for (const e of eintraege) {
    const li = document.createElement("li");
    const seite = e.seite
      ? `<div class="li-side">${e.seite.split("\n").map((z, i) => (i === 0 ? `<b>${escapeHtml(z)}</b>` : escapeHtml(z))).join("")}</div>`
      : "";
    li.innerHTML =
      `<div class="li-main"><div class="li-title">${escapeHtml(e.titel)}</div>` +
      (e.sub ? `<div class="li-sub">${escapeHtml(e.sub)}</div>` : "") +
      "</div>" + seite;
    el.appendChild(li);
  }
}

$("kalTag").addEventListener("change", (event) => {
  kalenderTag = event.target.value || todayIso();
  renderKalender();
});

/**
 * Das Briefing oben auf der Kalenderseite. Heute ist der Morgen, Morgen der
 * Vorabend: dieselben Abschnitte, die auch als Mitteilung und im Chat kommen.
 * Vorher stand dort eine Woche als Textblock mit Minutenzahlen je Tag, und
 * die beantwortete keine Frage, die jemand morgens hat.
 */
let briefingArt = "morgen";
/** Ob die blassen Punkte nach den ersten vier aufgeklappt sind. */
let briefingAlles = false;
const PUNKT_ART = { aufgabe: "Aufgabe", termin: "Termin", essen: "Essen", training: "Training", feierabend: "Schluss für heute" };

/**
 * Das Briefing als ein Blick: oben gross, was jetzt dran ist, darunter der
 * Rest des Tages blass als Zeitachse. Vorher fünf Abschnitte mit allen
 * Terminen, Aufgaben und Mahlzeiten untereinander, und ein Tag mit vier
 * Aufgaben sah aus wie dreissig Punkte. Wer nur das Nächste sieht, fängt an.
 * Aufgaben lassen sich direkt abhaken, dann rückt das Nächste nach oben.
 */
function briefingZeichnen() {
  kalShowSetzen();
  const ziel = $("kalBriefing");
  let b;
  try { b = tagesbriefingFuer(briefingArt); } catch (e) { ziel.textContent = "Das Briefing liess sich nicht rechnen."; console.error(e); return; }
  const heute = briefingArt === "morgen";
  const abschnitt = (titel) => b.abschnitte.find((x) => x.titel === titel);
  const punkte = b.punkte;
  // Morgen beginnt mit dem ersten Punkt des Tages, heute mit dem, der noch
  // nicht vorbei ist.
  const i = heute ? naechsterPunkt(punkte, Date.now()) : (punkte.length ? 0 : -1);
  const vorbei = heute && i > 0 ? i : (heute && i < 0 ? punkte.length : 0);
  const haupt = i >= 0 ? punkte[i] : null;
  const rest = i >= 0 ? punkte.slice(i + 1) : [];
  const zeit = (p) => (p.um === null ? "offen" : uhrzeit(p.um));
  const haken = (p, gross) => (p.art === "aufgabe" && p.id
    ? `<button type="button" class="kb-haken${gross ? " gross" : ""}" data-erledigt="${escapeHtml(p.id)}" aria-label="Erledigt: ${escapeHtml(p.titel)}"><svg viewBox="0 0 24 24" width="${gross ? 22 : 16}" height="${gross ? 22 : 16}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`
    : "");

  let html = "";
  const stand = !heute ? abschnitt("Heute") : null;
  if (stand) html += `<p class="kb-stand">Heute: ${escapeHtml(stand.zeilen[0])}</p>`;
  const ganz = (abschnitt(heute ? "Dein Tag" : "Morgen")?.zeilen || []).find((z) => z.startsWith("Ganztägig:"));
  if (ganz) html += `<p class="kb-ganz">${escapeHtml(ganz.replace(/\.$/, ""))}</p>`;

  if (haupt) {
    const bild = haupt.foto && haupt.rezeptId
      ? `<img class="kb-bild" src="img/rezepte/${encodeURIComponent(haupt.rezeptId)}.jpg" alt="" loading="lazy">` : "";
    html += `<section class="kb-jetzt kb-${haupt.art}"${haupt.art === "essen" && haupt.rezeptId ? ` data-rezept="${escapeHtml(haupt.rezeptId)}" role="button" tabindex="0"` : ""}>
      <span class="kb-label">${heute ? "Als Nächstes" : "Morgen zuerst"} · ${zeit(haupt)}</span>
      <div class="kb-jetzt-zeile">${bild}<div class="kb-jetzt-text"><h3>${escapeHtml(haupt.titel)}</h3>
      <p>${escapeHtml(haupt.unter)}</p></div>${haken(haupt, true)}</div>
      ${haupt.art === "essen" ? tauschKnopf(haupt.mahlzeit, haupt.titel, haupt.kcal, zeit(haupt)) : ""}
    </section>`;
  } else {
    html += `<section class="kb-jetzt"><span class="kb-label">${heute ? "Heute" : "Morgen"}</span><div class="kb-jetzt-text"><h3>${heute ? "Für heute ist nichts mehr offen." : "Morgen steht noch nichts an."}</h3></div></section>`;
  }

  const achtung = abschnitt("Achtung") || abschnitt("Heute Abend vorbereiten");
  if (achtung) html += `<p class="kb-achtung"><b>${escapeHtml(achtung.titel)}:</b> ${escapeHtml(achtung.zeilen[0])}</p>`;

  if (b.reihenfolge?.length) {
    // daevo zeigt, was er sortiert hat: Stufe 1, Stufe 2, dazwischen, warten, abends.
    html += sortiertHtml(b.reihenfolge, { schluessel: `kal-${briefingArt}`, mitHaken: true, mitTauschen: true, hinweis: b.musterHinweis });
  } else if (rest.length) {
    const sichtbar = briefingAlles ? rest : rest.slice(0, 4);
    html += `<h3 class="kb-danach">Danach</h3><ol class="kb-liste">${sichtbar.map((p) => `<li class="kb-${p.art}"${p.art === "essen" && p.rezeptId ? ` data-rezept="${escapeHtml(p.rezeptId)}" role="button" tabindex="0"` : ""}>
      <span class="kb-zeit">${zeit(p)}</span><span class="kb-was"><b>${escapeHtml(p.titel)}</b><small>${escapeHtml(PUNKT_ART[p.art])}${p.art === "essen" ? `, ${escapeHtml(p.unter.split(", ").slice(1).join(", "))}` : ""}</small></span>${haken(p, false)}</li>`).join("")}</ol>`;
    if (rest.length > 4) {
      html += `<button type="button" class="kb-mehr" data-mehr>${briefingAlles ? "Weniger zeigen" : `Noch ${rest.length - 4} weitere`}</button>`;
    }
  }
  if (vorbei > 0) html += `<p class="kb-vorbei">${vorbei} ${vorbei === 1 ? "Punkt ist" : "Punkte sind"} heute schon vorbei.</p>`;

  // Der Geburtstag steht ganz unten, nach allem, was zu tun ist.
  const gratulieren = abschnitt("Nicht vergessen");
  const grenze = abschnitt("Deine Untergrenze");
  if (grenze) {
    html += `<details class="kb-grenze"><summary>Deine Untergrenze, ${grenze.zeilen.length} offen</summary><ul>${grenze.zeilen.map((z) => `<li>${escapeHtml(z)}</li>`).join("")}</ul></details>`;
  }
  if (gratulieren) html += `<p class="kb-gratulieren">${escapeHtml(gratulieren.zeilen[0])}</p>`;
  ziel.innerHTML = html;
  sortiertGezeigt(ziel);
}
$("kalBriefing").addEventListener("click", async (event) => {
  if (event.target.closest("[data-mehr]")) { briefingAlles = !briefingAlles; briefingZeichnen(); return; }
  const tauschen = event.target.closest("[data-essen-tauschen]");
  if (tauschen) { tauschOeffnen(tauschen, briefingArt === "morgen" ? todayIso() : folgetag(todayIso())); return; }
  const rezept = event.target.closest("[data-rezept]");
  if (rezept && !event.target.closest("[data-erledigt]")) {
    const tag = briefingArt === "morgen" ? todayIso() : folgetag(todayIso());
    const m = vorschlagFuer(tag, rezept.dataset.rezept);
    if (m) rezeptBlattOeffnen(m);
    return;
  }
  const knopf = event.target.closest("[data-erledigt]");
  if (!knopf) return;
  knopf.disabled = true;
  knopf.classList.add("an");
  spueren("erfolg");
  const ergebnis = await aufgabeErledigen(knopf.dataset.erledigt);
  // Kurz stehen lassen, damit der Haken zu sehen ist, dann rückt das Nächste nach.
  setTimeout(() => { briefingZeichnen(); refreshAll(); }, 450);
  abgehaktMelden(ergebnis, () => { briefingZeichnen(); refreshAll(); });
});
document.querySelectorAll("#kalBriefingWahl [data-briefing]").forEach((k) => {
  k.addEventListener("click", () => {
    briefingArt = k.dataset.briefing;
    document.querySelectorAll("#kalBriefingWahl [data-briefing]").forEach((x) => {
      x.classList.toggle("is-on", x === k);
      x.setAttribute("aria-selected", String(x === k));
    });
    briefingZeichnen();
  });
});

/**
 * Die Mahlzeiten des Tages als Karten: Uhrzeit, Gericht mit Foto, Grösse,
 * und warum genau dann. Die Zutaten klappen auf. Gleiche Kalorien für jede
 * Mahlzeit, wie vorher, sagen nichts darüber, was man essen soll.
 */
let essenTag = todayIso();
$("kalEssen").addEventListener("click", (ev) => {
  const tauschen = ev.target.closest("[data-essen-tauschen]");
  if (tauschen) { tauschOeffnen(tauschen, essenTag); return; }
  const k = ev.target.closest("[data-rezept]");
  if (!k) return;
  const m = vorschlagFuer(essenTag, k.dataset.rezept);
  if (m) rezeptBlattOeffnen(m);
});

function essenZeichnen(tag) {
  essenTag = tag;
  const liste = $("kalEssen");
  let t;
  try { t = tagesessenFuer(tag); } catch (e) { liste.innerHTML = `<li class="empty">Kein Vorschlag möglich.</li>`; console.error(e); return; }
  if (!t.mahlzeiten.length) {
    liste.innerHTML = `<li class="empty">${escapeHtml(t.hinweise[0] || "Für heute ist nichts mehr offen.")}</li>`;
    return;
  }
  liste.innerHTML = t.mahlzeiten.map((m) => {
    const r = m.rezept;
    const bild = r?.foto
      ? `<img class="ke-bild" src="img/rezepte/${encodeURIComponent(r.id)}.jpg" alt="" loading="lazy">`
      : `<span class="ke-bild ke-leer" aria-hidden="true"></span>`;
    const marke = m.mitnehmen ? "zum Mitnehmen" : m.training === "davor" ? "vor dem Training" : m.training === "danach" ? "nach dem Training" : "";
    const zutaten = r?.zutaten?.length
      ? `<details class="ke-zutaten"><summary>Zutaten, ${r.minuten} Minuten</summary><ul>${r.zutaten.map((z) => `<li>${escapeHtml(z)}</li>`).join("")}</ul></details>`
      : "";
    return `<li class="ke">
      <div class="ke-zeit"><b>${uhrzeit(m.um)}</b><span>${escapeHtml(m.name)}</span></div>
      <div class="ke-karte">
        <div class="ke-kopf"${r ? ` data-rezept="${escapeHtml(r.id)}" role="button" tabindex="0"` : ""}>${bild}<div class="ke-text">
          <b>${escapeHtml(r ? r.name : "Freie Wahl")}</b>
          <span class="ke-werte">${m.kcal} kcal · ${m.proteinG} g Protein${marke ? ` · <em>${escapeHtml(marke)}</em>` : ""}</span>
          <span class="ke-grund">${escapeHtml(m.grund)}</span>
        </div></div>${zutaten}
        ${tauschKnopf(m.art, m.gewaehlt?.name || r?.name || "Freie Wahl", m.kcal, uhrzeit(m.um))}
      </div>
    </li>`;
  }).join("") + (t.hinweise.length ? `<li class="ke-hinweis">${escapeHtml(t.hinweise.join(" "))}</li>` : "");
}

/**
 * Der Stand der Todoist Verbindung.
 *
 * Gezeigt wird, was gemessen ist: wie viele offene Aufgaben zuletzt gelesen
 * wurden und wann. "Verbunden" ohne Zahl sagt nichts darüber, ob gerade
 * irgendetwas ankommt.
 */
function renderTodoist() {
  const verbunden = todoistVerbunden();
  const stand = store.getTodoist();
  $("btnTodoistTrennen").hidden = !verbunden;
  $("btnTodoistVerbinden").textContent = verbunden ? "Neu einlesen" : "Verbinden und prüfen";
  $("todoistToken").placeholder = verbunden ? "Token hinterlegt" : "In Todoist kopieren und hier einfügen";
  if (verbunden && stand.abgerufen) {
    const n = (stand.aufgaben || []).length;
    const wann = new Date(stand.abgerufen).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
    $("todoistStand").textContent = `Verbunden. ${n} offene ${n === 1 ? "Aufgabe" : "Aufgaben"}, zuletzt gelesen am ${wann}.`;
  }
}

$("btnTodoistVerbinden").addEventListener("click", async () => {
  const eingabe = $("todoistToken").value.trim();
  const settings = store.getSettings();
  if (!eingabe && !todoistVerbunden()) { toast("Füg zuerst deinen Token ein."); return; }
  const vorher = settings.todoistToken || "";
  if (eingabe) store.setSettings({ ...settings, todoistToken: eingabe });
  const knopf = $("btnTodoistVerbinden");
  knopf.disabled = true;
  knopf.textContent = "Prüfe …";
  const fehler = await todoistAktualisieren({ erzwingen: true });
  knopf.disabled = false;
  if (fehler) {
    // Ein abgelehnter Token wird nicht gespeichert. Sonst steht im Profil
    // "verbunden", und jede Planung scheitert still an derselben Stelle.
    if (eingabe) store.setSettings({ ...store.getSettings(), todoistToken: vorher });
    renderTodoist();
    toast(fehler, 4200);
    return;
  }
  $("todoistToken").value = "";
  renderTodoist();
  refreshAll();
  toast(`${(store.getTodoist().aufgaben || []).length} Aufgaben aus Todoist gelesen`);
});

$("btnTodoistTrennen").addEventListener("click", () => {
  store.setSettings({ ...store.getSettings(), todoistToken: "" });
  store.setTodoist({ abgerufen: null, aufgaben: [] });
  $("todoistStand").textContent = "Getrennt. In Todoist bleibt alles, wie es ist.";
  renderTodoist();
  refreshAll();
});

/** Zeigt das Ergebnis eines Abgleichs in einer Meldung, Fehler zuerst. */
function abgleichMelden(r) {
  const fehler = (r?.ergebnisse || []).filter((e) => e.fehler);
  if (fehler.length) { toast(`${fehler[0].name}: ${fehler[0].fehler}`, 5000); return; }
  const summe = (r?.ergebnisse || []).reduce((n, e) => n + (e.anzahl || 0), 0);
  toast(`Kalender abgeglichen, ${summe} Termine`);
}

$("btnAppleKalender").addEventListener("click", async () => {
  try {
    const r = await appleKalenderVerbinden();
    if (r.fehler) { toast(r.fehler, 6000); return; }
    abgleichMelden(r);
  } catch (e) {
    toast(`Kalender nicht lesbar: ${e.message}`, 5000);
  }
  renderKalender();
  refreshAll();
});

$("btnKalAbo").addEventListener("click", async () => {
  const r = aboHinzufuegen(store.getSettings(), $("kalAboUrl").value);
  if (r.fehler) { toast(r.fehler, 5000); return; }
  store.setSettings(r.settings);
  $("kalAboUrl").value = "";
  await kontoSicherstellen();
  abgleichMelden(await kalenderAbgleichen({ zwang: true }));
  renderKalender();
  refreshAll();
});

$("btnKalAbgleich").addEventListener("click", async () => {
  abgleichMelden(await kalenderAbgleichen({ zwang: true }));
  renderKalender();
  refreshAll();
});

/** Still im Hintergrund, beim Start und beim Zurückholen der App. */
async function kalenderStill() {
  const s = store.getSettings();
  if (!s.appleKalender && !kalenderAbos(s).length) return;
  try {
    const r = await kalenderAbgleichen();
    // Der Plan aus dem Profil gehört auch in den echten Kalender.
    if (s.appleKalender) {
      const { planInDenKalender } = await import("./kalender-schreiben.js");
      const p = await planInDenKalender();
      if (p.angelegt || p.entfernt) refreshAll();
      // Überschneidungen sofort melden, nicht erst, wenn iOS die Wache weckt.
      nativAufruf("Kalender", "wachePruefen").catch(() => {});
    }
    if (!r.uebersprungen && r.ergebnisse.some((e) => e.anzahl !== undefined)) {
      refreshAll();
      // Ein SLEEP Eintrag im Kalender verschiebt die Erinnerungen vor dem
      // Schlafen. Ohne neues Planen kämen sie zur Zeit von vor dem Abgleich.
      mitteilungenNativ();
    }
  } catch {
    // Ohne Netz bleibt der letzte Stand. Der Kalender sagt im Profil, von wann er ist.
  }
}

$("btnKalDatei").addEventListener("click", () => $("kalDatei").click());

$("kalDatei").addEventListener("change", async (event) => {
  const datei = event.target.files?.[0];
  if (!datei) return;
  try {
    const text = await datei.text();
    const name = $("kalName").value.trim() || datei.name.replace(/\.ics$/i, "");
    uebernehmen(text, name);
  } catch (error) {
    toast(`Datei nicht lesbar: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

$("btnKalText").addEventListener("click", () => {
  const text = $("kalText").value.trim();
  if (!text) { toast("Da steht nichts drin."); return; }
  uebernehmen(text, $("kalName").value.trim() || "Eingefügt");
  $("kalText").value = "";
});

function uebernehmen(text, name) {
  if (!text.includes("BEGIN:VCALENDAR") && !text.includes("BEGIN:VEVENT")) {
    toast("Das ist keine Kalenderdatei. Sie beginnt mit BEGIN:VCALENDAR.");
    return;
  }
  const ergebnis = kalenderImportieren(text, name);
  renderKalender();
  refreshAll();
  toast(
    ergebnis.anzahl === 0
      ? "Gelesen, aber im Zeitraum lag kein Termin."
      : `${ergebnis.anzahl} Termine aus ${ergebnis.name} übernommen`,
  );
}

$("btnEinkaufNeu").addEventListener("click", async () => {
  const button = $("btnEinkaufNeu");
  button.disabled = true;
  button.textContent = "Rechne";
  try {
    await buildActions({ onChange: refreshAll }).einkaufslisteErstellen({
      tage: Number($("einkaufTage").value) || 7,
    });
    renderEinkauf();
    toast("Liste steht");
  } finally {
    button.disabled = false;
    button.textContent = "Liste rechnen";
  }
});

$("einkaufList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-ek]");
  if (!button) return;
  const liste = store.getShoppingList();
  const item = liste?.items.find((i) => i.key === button.dataset.ek);
  if (!item) return;
  item.stand = button.dataset.stand;
  store.setShoppingList(liste);
  // Was zu Hause ist, gehört in den Vorrat. Dann rechnet die nächste Liste
  // damit und der Vorschlag für heute Abend kennt es auch.
  if (item.stand === "zuhause" || item.stand === "gekauft") {
    const vorrat = store.getFridge();
    if (!vorrat.some((v) => v.toLowerCase() === item.name.toLowerCase())) {
      store.setFridge([...vorrat, item.name].slice(0, 40));
    }
  }
  renderEinkauf();
});

$("btnStdAdd").addEventListener("click", () => {
  const text = $("stdText").value.trim();
  if (text.length < 8) { toast("Schreib den Standard als ganzen Satz."); return; }
  const standards = ensureStandards();
  standards.push({
    id: `std_${newId().slice(0, 8)}`,
    kind: "frei",
    text,
    kadenz: $("stdKadenz").value,
    ziel: Math.max(1, Number($("stdZiel").value) || 1),
    aktiv: true,
    seit: todayIso(),
  });
  store.setStandards(standards.slice(0, 8));
  $("stdText").value = "";
  renderStandards();
  toast("Standard steht");
});

$("standardList").addEventListener("click", (event) => {
  const ok = event.target.closest("[data-std-ok]");
  if (ok) {
    store.setStandardConfirmed(day, ok.dataset.stdOk, true);
    renderStandards();
    toast("Eingetragen");
    return;
  }
  const del = event.target.closest("[data-std-del]");
  if (del) {
    store.setStandards(store.getStandards().filter((s) => s.id !== del.dataset.stdDel));
    renderStandards();
  }
});

$("memSearch").addEventListener("input", renderMemories);
$("btnMemAdd").addEventListener("click", () => {
  const text = $("memNew").value.trim();
  if (!text) return;
  const result = brain.add({
    text,
    art: $("memKind").value,
    wichtigkeit: Number($("memWeight").value) || 3,
  });
  $("memNew").value = "";
  renderMemories();
  toast(result.action === "aktualisiert" ? "Bestehende Notiz aufgefrischt" : "Gemerkt");
});
$("memList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-mem-del]");
  if (!button) return;
  brain.remove(button.dataset.memDel);
  renderMemories();
});

$("btnSaveProfile").addEventListener("click", () => {
  queueMicrotask(zyklusMenue);
  const candidate = {
    ...profile,
    weightKg: Number($("e-weight").value),
    dailySteps: Number($("e-steps").value),
    goal: $("e-goal").value,
    wakeTime: $("e-wake").value,
    sleepTime: $("e-sleep").value,
    randModus: $("e-randmodus").value === "wochentag" ? "wochentag" : "gleich",
    wechselndeZeiten: $("e-randmodus").value === "wechselnd",
    wochenraender: $("e-randmodus").value === "wochentag" ? wochenzeitenLesen() : undefined,
    essenszeiten: {
      ersteNachMin: Number($("e-ersteMahlzeit").value),
      mittag: $("e-mittag").value || "12:30",
      abend: $("e-abend").value || "19:00",
    },
    // Ausnahmen für einzelne Tage bleiben erhalten. Sie hängen nicht am Modus,
    // und wer sie beim Speichern des Profils verlöre, müsste seine Schicht für
    // morgen jedes Mal neu eintragen.
    tagesausnahmen: profile.tagesausnahmen,
    handyAus: profile.handyAus,
    handyMorgens: profile.handyMorgens,
  };
  if (!validProfile(candidate)) { toast("Bitte prüfe deine Angaben."); return; }
  profile = candidate;
  store.setProfile(profile);
  renderProfile();
  refreshAll();
  // Neue Schlafenszeiten verschieben die Erinnerungen vor dem Schlafen und das
  // Runterfahren. Ohne neues Planen kämen sie bis zum nächsten Öffnen zur alten Zeit.
  mitteilungenNativ();
  toast("Gespeichert");
});

/* Eingaben im Wochenbogen. Ein Listener auf dem Behaelter statt einem je Feld,
   weil die Fragen bei jedem Rendern neu gebaut werden. */
$("wochencheck").addEventListener("click", (event) => {
  const wahl = event.target.closest("[data-bogen]");
  if (wahl) { wcStart(wahl.dataset.bogen); return; }

  const pille = event.target.closest("[data-wert][data-option]");
  if (!pille) return;
  const id = pille.dataset.wert;
  const typ = pille.dataset.typ;
  const option = pille.dataset.option;

  if (typ === "auswahl") {
    wcWerte[id] = wcWerte[id] === option ? undefined : option;
  } else if (typ === "jaNein") {
    const neu = option === "ja";
    wcWerte[id] = wcWerte[id] === neu ? undefined : neu;
  } else if (typ === "mehrfach") {
    const liste = Array.isArray(wcWerte[id]) ? wcWerte[id] : [];
    wcWerte[id] = liste.includes(option) ? liste.filter((x) => x !== option) : [...liste, option];
  }
  // Nur die betroffene Frage neu zeichnen, sonst springt die Seite nach oben.
  const box = pille.closest("[data-frage]");
  const frage = wcBogen.fragen.find((f) => f.id === id);
  if (box && frage) box.outerHTML = wcFrageHtml(frage);
});

$("wochencheck").addEventListener("input", (event) => {
  const feld = event.target.closest("[data-wert]");
  if (!feld || feld.dataset.option) return;
  const id = feld.dataset.wert;
  const typ = feld.dataset.typ;

  if (typ === "zahl") {
    wcWerte[id] = Number(feld.value);
    const anzeige = $("wochencheck").querySelector(`[data-anzeige="${id}"]`);
    if (anzeige) anzeige.textContent = feld.value;
    // Der Fuellstand der Spur haengt am Wert und muss beim Ziehen mitlaufen.
    const min = Number(feld.min);
    const max = Number(feld.max);
    feld.style.setProperty("--fuellung", `${Math.round(((Number(feld.value) - min) / (max - min)) * 100)}%`);
    feld.closest(".wc-skala")?.classList.remove("offen");
  } else if (typ === "text") {
    wcWerte[id] = feld.value;
  } else if (typ === "dauer-h" || typ === "dauer-m") {
    const box = feld.closest("[data-frage]");
    const h = Number(box.querySelector('[data-typ="dauer-h"]').value) || 0;
    const m = Number(box.querySelector('[data-typ="dauer-m"]').value) || 0;
    wcWerte[id] = h * 60 + m;
  }
});

$("btnWcSpeichern").addEventListener("click", async () => {
  const fehlend = wcBogen.fragen.filter((f) => {
    if (!f.pflicht) return false;
    const v = wcWerte[f.id];
    return v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
  });
  if (fehlend.length) {
    toast(`Noch offen: ${fehlend[0].text}`);
    const box = $("wochencheck").querySelector(`[data-frage="${fehlend[0].id}"]`);
    box?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const eintrag = { bogen: wcBogen.id, tag: todayIso(), werte: { ...wcWerte } };
  store.addCheckinBogen(eintrag);
  refreshAll();

  const knopf = $("btnWcSpeichern");
  knopf.disabled = true;
  knopf.textContent = "daevo liest";
  const feld = $("wcAuswertung");
  feld.hidden = false;
  feld.textContent = "Ich schaue mir das an.";
  try {
    const text = await buildActions({ onChange: refreshAll }).checkinAuswerten({ bogen: wcBogen.id });
    feld.textContent = text;
    store.checkinAntwortSetzen(eintrag.tag, eintrag.bogen, text);
  } catch (error) {
    feld.textContent = `Gespeichert. Die Auswertung hat nicht geklappt: ${error.message}`;
  } finally {
    knopf.disabled = false;
    knopf.textContent = "Abschicken";
    renderWcVerlauf();
  }
});

$("e-randmodus").addEventListener("change", renderWochenzeiten);

// Der Tagesablauf hat einen eigenen Knopf, weil er weit unter dem oberen steht.
// Wer dort etwas ändert, scrollt sonst nach oben, um zu speichern, und vergisst
// es beim dritten Mal.
$("btnSaveTage").addEventListener("click", () => {
  profile = {
    ...profile,
    wakeTime: $("e-wake").value,
    sleepTime: $("e-sleep").value,
    randModus: $("e-randmodus").value === "wochentag" ? "wochentag" : "gleich",
    wechselndeZeiten: $("e-randmodus").value === "wechselnd",
    wochenraender: $("e-randmodus").value === "wochentag" ? wochenzeitenLesen() : undefined,
    essenszeiten: {
      ersteNachMin: Number($("e-ersteMahlzeit").value),
      mittag: $("e-mittag").value || "12:30",
      abend: $("e-abend").value || "19:00",
    },
  };
  store.setProfile(profile);
  refreshAll();
  toast("Tagesablauf gespeichert");
});

$("e-stimme").addEventListener("change", () => {
  store.setSettings({ ...store.getSettings(), stimme: $("e-stimme").value });
  stimmProbe();
});
$("e-tempo").addEventListener("change", () => {
  store.setSettings({ ...store.getSettings(), sprechtempo: Number($("e-tempo").value) });
  stimmProbe();
});
$("btnStimmProbe").addEventListener("click", stimmProbe);



/**
 * Die Adresse für den Siri Kurzbefehl.
 *
 * Sie zeigt auf das Postfach des eigenen Push Workers und wird aus den
 * Einstellungen gebaut, nicht fest eingetragen: jeder Nutzer hat seinen
 * eigenen Worker unter seinem eigenen Namen.
 *
 * Ohne eingetragenen Worker steht dort der Grund, nicht eine halbe Adresse.
 * Eine Adresse, die nach Adresse aussieht und keine ist, wird kopiert und
 * erzeugt einen Kurzbefehl, der stumm nichts tut.
 */
function siriAdresse() {
  return workerAdresse("postfach");
}

/** Eine Adresse auf dem eigenen Push Worker, oder der Grund, warum es keine gibt. */
function workerAdresse(pfad) {
  const roh = (store.getSettings().pushWorker || "").trim().replace(/\/+$/, "");
  if (!roh) return "Trag unten erst die Adresse deines Push Workers ein.";
  return `${roh}/${pfad}`;
}

function siriAdresseZeigen() {
  const feld = $("e-siriUrl");
  if (feld) feld.value = siriAdresse();
}

siriAdresseZeigen();
$("btnSiriKopieren").addEventListener("click", async () => {
  const text = siriAdresse();
  if (!text.startsWith("http")) { toast(text); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast("Adresse kopiert");
  } catch {
    // Ohne Erlaubnis für die Zwischenablage bleibt das Markieren von Hand.
    $("e-siriUrl").select?.();
    toast("Kopieren ging nicht. Feld ist markiert, kopier von Hand.");
  }
});

// Der Weg von Hand, wenn die Mitteilung nicht ankommt oder weggewischt wurde.
$("btnPostfach").addEventListener("click", () => {
  showView("assistant");
  postfachPruefen({ laut: true });
});


/* ---------- Der Mahlzeit Editor ---------- */

/**
 * Mengen ändern, Posten löschen, Lebensmittel nachtragen.
 *
 * Bisher war eine erfasste Mahlzeit endgültig. Wer sich vertippt hatte oder
 * eine Schätzung des Modells nachschärfen wollte, musste den ganzen Eintrag
 * löschen und alles neu sagen. Beim Tracken ist das Korrigieren der häufigste
 * Handgriff überhaupt, und eine App, in der er fehlt, wird nach zwei Wochen
 * nicht mehr benutzt.
 *
 * Gearbeitet wird auf einer Kopie. Erst Speichern schreibt in den Tag. Wer im
 * Editor herumprobiert und dann abbricht, hat seinen Tag sonst schon geändert,
 * ohne es zu wollen.
 */
let meMahlzeit = null;
/** Der Tag, an dem die offene Mahlzeit steht. Ein Rezept für morgen gehört nicht in den Tag, der gerade auf Heute steht. */
let meTag = todayIso();
let mePosten = [];
let meArt = "";
let meScanLaeuft = false;

/**
 * Der Editor als Wahl für das Briefing: dieselbe Suche, derselbe Scanner,
 * dieselben Mengen, nur gespeichert wird nicht in den Tag, sondern als
 * geplante Mahlzeit in `settings.essenWahl`. Morgen ist noch nichts gegessen.
 */
let meWahl = null;

/** Öffnet den Editor für eine Mahlzeit des heutigen Tages. */
/** Ob die offene Mahlzeit gerade erst für diesen Editor angelegt wurde. */
let meNeu = false;

function mahlzeitOeffnen(id, tag = day) {
  meTag = tag;
  const mahlzeit = store.getDay(meTag).meals.find((m) => m.id === id);
  if (!mahlzeit) return;
  meMahlzeit = mahlzeit;
  meNeu = false;
  // Tiefe Kopie, damit Abbrechen wirklich abbricht.
  mePosten = (mahlzeit.entries || []).map((e) => ({ ...e }));
  meArt = mahlzeit.art || "";
  $("meZeit").value = mahlzeit.at || nowTime();
  $("meSuche").value = "";
  $("meTreffer").hidden = true;
  $("meSuchHinweis").textContent = "";
  $("meHandHinweis").textContent = "";
  $("meRezeptForm").hidden = true;
  $("meRezeptHinweis").textContent = "";
  meArtenZeichnen();
  mePostenZeichnen();
  meBibliothekZeichnen();
  $("mahlzeitEditor").hidden = false;
  document.body.classList.add("blatt-offen");
}

function mahlzeitSchliessen() {
  // Eine leer angelegte Mahlzeit verschwindet beim Schliessen wieder. Sie
  // entsteht nur, damit der Editor etwas zum Anfassen hat: wer den Weg
  // abbricht, darf keine Zeile mit null Kalorien im Verlauf zurücklassen.
  // Gezählt wird, was gespeichert ist: ein vorbelegtes Rezept hat Posten im
  // Editor, aber noch keine im Tag, und Abbrechen darf es nicht stehen lassen.
  if (!meWahl && meMahlzeit && meNeu && !store.getDay(meTag).meals.find((m) => m.id === meMahlzeit.id)?.entries?.length) {
    store.removeMeal(meTag, meMahlzeit.id);
  }
  // Aus dem Briefing geöffnet: zurück in die Präsentation, gespeichert oder nicht.
  const wahl = meWahl;
  meWahl = null;
  $("meTitel").textContent = "Mahlzeit";
  $("meLoeschen").textContent = "Mahlzeit löschen";
  if (wahl) setTimeout(() => wahl.fertig?.(wahl.gespeichert), 0);
  meNeu = false;
  $("mahlzeitEditor").hidden = true;
  document.body.classList.remove("blatt-offen");
  meScanStoppen();
  meMahlzeit = null;
  mePosten = [];
  refreshAll();
}

/**
 * Legt eine leere Mahlzeit an und öffnet den Editor darauf.
 *
 * Der Editor kann Suche, Barcode und Handeingabe, konnte aber bisher nur an
 * eine bestehende Mahlzeit. Damit war der beste Weg der einzige, den man nicht
 * von vorn beginnen konnte.
 */
/**
 * Löscht eine Mahlzeit und bietet sechs Sekunden Rückgängig an. Eine
 * Rückfrage vorher wäre ein Tipp mehr bei jedem Löschen, und ein Fehltipp
 * lässt sich so trotzdem zurückholen. Rückgängig setzt die Mahlzeit an
 * ihre alte Stelle und nimmt bei Apple Health die Sperre wieder weg, sonst
 * käme sie beim nächsten Abgleich nicht zurück.
 */
function mahlzeitLoeschen(tag, id) {
  const vorher = store.getDay(tag);
  const stelle = vorher.meals.findIndex((m) => m.id === id);
  if (stelle < 0) return;
  const mahlzeit = vorher.meals[stelle];
  store.removeMeal(tag, id);
  refreshAll();
  const kcal = Math.round((mahlzeit.entries || []).reduce((a, e) => a + (Number(e.kcal) || 0), 0));
  toastAktion(`Gelöscht, ${kcal} kcal`, "Rückgängig", () => {
    const d = store.getDay(tag);
    if (d.meals.some((m) => m.id === id)) return;
    d.meals.splice(Math.min(stelle, d.meals.length), 0, mahlzeit);
    if (Array.isArray(d.healthEntfernt)) d.healthEntfernt = d.healthEntfernt.filter((x) => x !== id);
    store.setDay(tag, d);
    refreshAll();
    if (!$("herkunftBlatt").hidden) herkunftZeigen();
  });
}

function wahlEditorOeffnen({ tag, art, um, posten = [], titel, fokus, fertig }) {
  meWahl = { tag, art, fertig, gespeichert: false };
  meTag = tag;
  meMahlzeit = { id: "wahl", at: um || "12:00", entries: [] };
  meNeu = false;
  mePosten = posten.map((e) => ({ ...e }));
  meArt = art;
  $("meZeit").value = um || "12:00";
  $("meSuche").value = "";
  $("meTreffer").hidden = true;
  $("meSuchHinweis").textContent = "";
  $("meHandHinweis").textContent = "";
  $("meRezeptForm").hidden = true;
  $("meRezeptHinweis").textContent = "";
  $("meTitel").textContent = titel || "Mahlzeit ändern";
  $("meLoeschen").textContent = "Wieder den Vorschlag nehmen";
  meArtenZeichnen();
  mePostenZeichnen();
  meBibliothekZeichnen();
  $("mahlzeitEditor").hidden = false;
  document.body.classList.add("blatt-offen");
  if (fokus === "suche") $("meSuche").focus();
  if (fokus === "barcode") meScanStarten();
}

function mahlzeitNeu(fokus, tag = day) {
  const id = newId();
  // Ein Nachtrag für einen früheren Tag bekommt Mittag als Uhrzeit. Die
  // Uhrzeit von jetzt stünde dort wie eine Angabe und ist keine.
  store.addMeal(tag, {
    id, text: "", at: tag === day ? nowTime() : "12:00", source: "hand", entries: [], feeling: null,
  });
  mahlzeitOeffnen(id, tag);
  // Nach dem Öffnen, weil mahlzeitOeffnen die Marke zurücksetzt. Danach die
  // Liste noch einmal zeichnen, sonst steht dort der Satz für eine geleerte
  // Mahlzeit statt der Einladung für eine neue.
  meNeu = true;
  mePostenZeichnen();
  if (fokus === "suche") $("meSuche").focus();
  if (fokus === "barcode") meScanStarten();
}

/* ---------- Ein vorgeschlagenes Rezept öffnen und eintragen ---------- */

/** Der Tag nach `tag`, als ISO Datum in Ortszeit. */
function folgetag(tag) {
  const d = new Date(`${tag}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let rbMahlzeit = null;

/**
 * Das Rezept hinter einem Vorschlag auf der Kalenderseite: Foto, Zutaten in
 * der gerechneten Portion, Zubereitung, darunter Eintragen für heute oder
 * morgen. Vorher stand dort nur der Name, und wer kochen wollte, musste das
 * Rezept unter Ernährung suchen.
 */
function rezeptBlattOeffnen(m) {
  const r = m?.rezept;
  if (!r) return;
  rbMahlzeit = m;
  $("rbTitel").textContent = r.name;
  const bild = r.foto ? `<img class="rb-bild" src="img/rezepte/${encodeURIComponent(r.id)}.jpg" alt="">` : "";
  const summe = (r.posten || []).reduce((s, p) => ({ f: s.f + p.fatG, k: s.k + p.carbsG }), { f: 0, k: 0 });
  $("rbInhalt").innerHTML = `${bild}
    <p class="rb-werte">${r.kcal} kcal · ${r.proteinG} g Protein · ${Math.round(summe.f)} g Fett · ${Math.round(summe.k)} g Kohlenhydrate · ${r.minuten} Minuten</p>
    <p class="rb-grund">${escapeHtml(m.name)} um ${uhrzeit(m.um)}${m.grund ? `, ${escapeHtml(m.grund.replace(/\.$/, ""))}` : ""}.</p>
    <h3 class="rb-kopf">Zutaten</h3>
    <ul class="rb-zutaten">${(r.posten || []).map((p) => `<li><span>${escapeHtml(p.name)}</span><b>${escapeHtml(p.menge)}</b></li>`).join("")}</ul>
    ${r.schritte?.length ? `<h3 class="rb-kopf">Zubereitung</h3><ol class="rb-schritte">${r.schritte.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>` : ""}
    <p class="fineprint">Mengen für deine Portion gerechnet. Beim Eintragen kannst du jede Menge ändern, wenn du es anders machst.</p>`;
  $("rezeptBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
}

function rezeptBlattSchliessen() {
  $("rezeptBlatt").hidden = true;
  if ($("mahlzeitEditor").hidden) document.body.classList.remove("blatt-offen");
}

/**
 * Öffnet den Mahlzeit Editor mit den Zutaten des Rezepts, noch nicht
 * gespeichert. Wer weniger Reis nimmt, ändert die Menge und speichert, wer
 * abbricht, hinterlässt nichts im Tag.
 */
function rezeptInEditor(m, tag) {
  const r = m.rezept;
  const id = newId();
  store.addMeal(tag, { id, text: r.name, at: uhrzeit(m.um), source: "rezept", entries: [], feeling: null, art: m.art });
  mahlzeitOeffnen(id, tag);
  meNeu = true;
  mePosten = (r.posten || []).map((p) => ({
    name: p.name, quantity: p.menge,
    kcal: Math.round(p.kcal), proteinG: Math.round(p.proteinG * 10) / 10,
    fatG: Math.round(p.fatG * 10) / 10, carbsG: Math.round(p.carbsG * 10) / 10,
  }));
  meArt = m.art || "";
  meArtenZeichnen();
  mePostenZeichnen();
  if (tag !== todayIso()) {
    const wann = new Date(`${tag}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
    $("meSuchHinweis").textContent = `Wird für ${wann} eingetragen.`;
    toast(`Für ${wann}. Mengen anpassen, dann speichern.`, 3600);
  }
}

$("rbSchliessen").addEventListener("click", rezeptBlattSchliessen);
$("rezeptBlatt").addEventListener("click", (ev) => { if (ev.target === $("rezeptBlatt")) rezeptBlattSchliessen(); });
$("rbHeute").addEventListener("click", () => { const m = rbMahlzeit; rezeptBlattSchliessen(); if (m) rezeptInEditor(m, todayIso()); });
$("rbMorgen").addEventListener("click", () => { const m = rbMahlzeit; rezeptBlattSchliessen(); if (m) rezeptInEditor(m, folgetag(todayIso())); });
// Einplanen heisst: daevo hat es vorgeschlagen, du isst es, also steht es im
// Kalender zu der Zeit, zu der daevo es gerechnet hat.
$("rbKalender").addEventListener("click", async () => {
  const m = rbMahlzeit;
  if (!m?.rezept) return;
  const d = new Date(m.um);
  const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { mahlzeitenEinplanen } = await import("./kalender-schreiben.js");
  const r = await mahlzeitenEinplanen([{ tag, art: m.art, name: m.rezept.name, uhrzeit: uhrzeit(m.um),
    notiz: `${m.rezept.kcal} kcal, ${m.rezept.proteinG} g Protein. Von daevo vorgeschlagen.` }]);
  rezeptBlattSchliessen();
  toast(r.ohneKalender ? "Verbinde zuerst deinen Kalender, auf der Kalenderseite unter Apple Kalender."
    : r.angelegt ? `${m.name} um ${uhrzeit(m.um)} steht in deinem Kalender.` : "Die Zeit ist schon vorbei.");
});

/** Sucht den Vorschlag mit diesem Rezept an diesem Tag. */
function vorschlagFuer(tag, rezeptId) {
  try { return tagesessenFuer(tag).mahlzeiten.find((x) => x.rezept?.id === rezeptId) || null; } catch { return null; }
}

function meArtenZeichnen() {
  // Die Art ist freiwillig. Eine Mahlzeit ohne Zuordnung ist kein Fehler, und
  // ein Pflichtfeld würde beim dritten Mal auf gut Glück gefüllt.
  $("meArten").innerHTML = MAHLZEITEN.map((m) =>
    `<button type="button" data-art="${m.art}" class="${meArt === m.art ? "an" : ""}">${escapeHtml(m.name)}</button>`,
  ).join("");
}

function mePostenZeichnen() {
  const liste = $("mePosten");
  if (mePosten.length === 0) {
    // Zwei Lagen, zwei Sätze. Eine frisch angelegte Mahlzeit war nie voll,
    // und "kein Posten mehr drin" liest sich dort wie ein Fehler.
    liste.innerHTML = meNeu
      ? `<li class="me-leer">Noch nichts drin. Such unten ein Lebensmittel oder scann einen Barcode.</li>`
      : `<li class="me-leer">Kein Posten mehr drin. Speichern löscht die Mahlzeit.</li>`;
  } else {
    const ziel = dayNumbers(meTag).targets;
    liste.innerHTML = mePosten.map((e, i) => {
      const menge = mengeLesen(e.quantity);
      const kann = skalierbar(e);
      // Ohne lesbare Menge lässt sich nichts skalieren. Dann steht die Angabe
      // als Text da, statt ein Feld anzubieten, das nichts bewirkt.
      const feld = kann
        ? `<input class="me-menge" type="number" inputmode="decimal" min="0" step="1"
                  value="${menge.zahl}" data-i="${i}" aria-label="Menge von ${escapeHtml(e.name)}">
           <span class="me-einheit">${escapeHtml(menge.einheit)}</span>`
        : `<span class="me-fest">${escapeHtml(e.quantity)}</span>`;
      return `<li class="me-karte">
        ${postenBild(e)}
        <div class="me-karte-text">
          <div class="me-name">${escapeHtml(e.name)}</div>
          <div class="me-werte">${postenWerte(e, ziel)}</div>
          <div class="me-mengefeld">${feld}</div>
        </div>
        <button type="button" class="me-weg" data-weg="${i}" aria-label="${escapeHtml(e.name)} entfernen">
          <span class="kreuz"></span>
        </button>
      </li>`;
    }).join("");
  }
  meSummeZeichnen();
}

function meSummeZeichnen() {
  const summe = mePosten.reduce(
    (s, e) => ({
      kcal: s.kcal + e.kcal, p: s.p + e.proteinG, f: s.f + e.fatG, k: s.k + e.carbsG,
    }),
    { kcal: 0, p: 0, f: 0, k: 0 },
  );
  $("meKcal").textContent = String(Math.round(summe.kcal));
  $("meProtein").textContent = `${komma(runde1(summe.p))} g`;
  $("meFett").textContent = `${komma(runde1(summe.f))} g`;
  $("meKh").textContent = `${komma(runde1(summe.k))} g`;
  const ziel = dayNumbers(meTag).targets;
  const kcalAnteil = anteilAmZiel(summe.kcal, ziel.kcal);
  $("meKcalAnteil").textContent = kcalAnteil === null ? "" : `${kcalAnteil} % deines Tages`;
  $("meKcalBalken").style.width = `${Math.min(100, kcalAnteil ?? 0)}%`;
  $("mePostenZahl").textContent = mePosten.length ? `${Math.round(summe.kcal)} kcal` : "";
  const teile = [
    ["Eiweiß", summe.p, ziel.proteinG, "protein"],
    ["Fett", summe.f, ziel.fatG, "fett"],
    ["Kohlenhydrate", summe.k, ziel.carbsG, "kohlenhydrate"],
  ].map(([name, wert, z, art]) => ({ name, wert, a: anteilAmZiel(wert, z), art }));
  $("meAnteile").hidden = mePosten.length === 0;
  $("meAnteile").innerHTML = teile.map((t) => `<div class="me-anteil" data-makro="${t.art}">
      <span class="me-anteil-name">${escapeHtml(t.name)}</span>
      ${ringKlein(t.a)}
      <span class="me-anteil-wert"><b>${komma(runde1(t.wert))}</b> g</span>
    </div>`).join("");
}

/**
 * Ein kleiner Ring mit dem Anteil am Tagesziel in der Mitte, wie in den
 * Makrokarten der guten Tracker. Über hundert Prozent bleibt der Ring voll,
 * die Zahl sagt den Rest.
 */
function ringKlein(prozent) {
  const r = 22;
  const umfang = 2 * Math.PI * r;
  const voll = Math.min(100, Math.max(0, prozent ?? 0)) / 100;
  const zahl = prozent === null ? "–" : `${prozent}<small>%</small>`;
  return `<span class="me-ring"><svg viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r="${r}" class="me-ring-spur"/>
      <circle cx="28" cy="28" r="${r}" class="me-ring-wert" stroke-dasharray="${(umfang * voll).toFixed(1)} ${umfang.toFixed(1)}" transform="rotate(-90 28 28)"/>
    </svg><b>${zahl}</b></span>`;
}

/**
 * Das Bild eines Postens. Ein Foto gibt es nur von Open Food Facts, für
 * alles andere steht der Anfangsbuchstabe auf der Farbe des Makros, der die
 * meisten Kalorien trägt. Kein Emoji: die sehen auf jedem Gerät anders aus
 * und bringen eine fremde Farbigkeit in die Palette.
 */
function postenBild(e) {
  const bild = e.bild || tabellenBild(e.name);
  if (bild) return `<span class="me-bild"><img src="${escapeHtml(bild)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
  const buchstabe = (String(e.name || "?").trim()[0] || "?").toUpperCase();
  return `<span class="me-bild" data-makro="${hauptMakro(e)}" aria-hidden="true"><b>${escapeHtml(buchstabe)}</b></span>`;
}

/** Die Zeile unter einem Posten: Werte und, wenn ein Ziel da ist, der Anteil am Tag. */
function postenWerte(e, ziel) {
  const a = anteilAmZiel(e.kcal, ziel?.kcal);
  const anteil = a === null ? "" : `<span class="me-tagesanteil"> · ${a} % des Tages</span>`;
  return `<span class="me-kcal-text">${Math.round(e.kcal)} kcal</span>${anteil}<br>`
    + `<span class="me-makro-text">E ${komma(runde1(e.proteinG))} g · F ${komma(runde1(e.fatG))} g · K ${komma(runde1(e.carbsG))} g</span>`;
}

/* ---------- Bibliothek: Rezepte, zuletzt gegessen, Nährwerttabelle ---------- */

/** Was gerade in der Bibliothek steht, damit ein Tipp den richtigen Posten findet. */
let meBibliothekPosten = [];

function bibZeile(e, i, { loeschen = null, unter = "", loeschenArt = "rezept" } = {}) {
  const weg = loeschen
    ? `<button type="button" class="me-weg" data-${loeschenArt}-weg="${escapeHtml(loeschen)}" aria-label="${loeschenArt === "rezept" ? "Rezept" : "Lebensmittel"} ${escapeHtml(e.name)} löschen"><span class="kreuz"></span></button>`
    : "";
  const zeile = unter || `<span class="me-kcal-text">${Math.round(e.kcal)} kcal</span> · ${escapeHtml(e.quantity || "")}`;
  return `<li class="bib-zeile">
    <button type="button" class="bib-knopf" data-bib="${i}">
      ${postenBild(e)}
      <span class="bib-text"><span class="me-name">${escapeHtml(e.name)}</span>
        <span class="me-werte">${zeile}</span></span>
      <span class="bib-plus" aria-hidden="true"></span>
    </button>${weg}
  </li>`;
}

/** Welcher Reiter unter der Suche offen ist. Zuletzt zuerst: das ist, was man meistens wieder isst. */
let meReiterWahl = "zuletzt";

function meBibliothekZeichnen() {
  const box = $("meBibliothek");
  const begriff = $("meSuche").value.trim();
  if (!begriff) { clearTimeout(meLiveTimer); meLiveNummer++; $("meTreffer").hidden = true; }
  $("meSuchen").hidden = !begriff;
  $("meReiter").hidden = Boolean(begriff);
  for (const k of $("meReiter").querySelectorAll("[data-reiter]")) k.classList.toggle("an", k.dataset.reiter === meReiterWahl);
  meBibliothekPosten = [];
  const liste = (zeilen) => `<ul class="bib-liste">${zeilen.join("")}</ul>`;
  const leer = (text) => `<p class="me-leer">${text}</p>`;
  if (begriff) {
    // Beim Tippen sofort alles, was ohne Netz da ist, ab dem ersten
    // Buchstaben: Gegessenes, eigene Lebensmittel, gemerkte Produkte,
    // Rezepte, Tabelle, `vorschlaege` in bibliothek.js. Produkte aus dem Netz
    // kommen kurz danach von selbst darunter, `meLiveSuche`.
    const tage = store.allDays().slice(-180).map((d) => ({ ...store.getDay(d), date: d }));
    const treffer = vorschlaege(begriff, { tage, settings: store.getSettings(), heute: todayIso() });
    const QUELLE = { zuletzt: (v) => `${v.anzahl > 1 ? `${v.anzahl}× gegessen` : "schon gegessen"}`, eigen: () => "eigenes", produkt: () => "Produkt", rezept: () => "Rezept", tabelle: () => "" };
    box.innerHTML = treffer.length
      ? liste(treffer.map((v) => {
        if (v.art === "rezept") {
          const sum = postenSumme(v.r.posten);
          const e = { name: v.r.name, kcal: sum.kcal, proteinG: sum.proteinG, fatG: sum.fatG, carbsG: sum.carbsG, bild: v.r.posten.find((x) => x.bild)?.bild };
          return bibZeile(e, meBibliothekPosten.push({ art: "rezept", r: v.r }) - 1, { unter: `<span class="me-kcal-text">${Math.round(sum.kcal)} kcal</span> · Rezept` });
        }
        const zusatz = QUELLE[v.quelle]?.(v) || "";
        const unter = `<span class="me-kcal-text">${Math.round(v.e.kcal)} kcal</span> · ${escapeHtml(v.e.quantity ?? "")}${zusatz ? ` · ${zusatz}` : ""}`;
        return bibZeile(v.e, meBibliothekPosten.push({ art: "posten", e: v.e }) - 1, { unter });
      }))
      : (begriff.length < 3 ? leer("Tipp weiter, ab drei Buchstaben sucht daevo auch nach Marken und Produkten.") : "");
    meLiveSuche(begriff);
    return;
  }
  if (meReiterWahl === "rezepte") {
    const s = store.getSettings();
    const rezepte = eigeneRezepte(s);
    const grenze = rezeptGrenze(s, KONFIG);
    const zaehler = grenze === Infinity ? "" : `<p class="feld-hilfe">${rezepte.length} von ${grenze} Rezepten gespeichert.</p>`;
    box.innerHTML = rezepte.length
      ? zaehler + liste(rezepte.map((r) => {
        const sum = postenSumme(r.posten);
        const e = { name: r.name, kcal: sum.kcal, proteinG: sum.proteinG, fatG: sum.fatG, carbsG: sum.carbsG, bild: r.posten.find((p) => p.bild)?.bild };
        const unter = `<span class="me-kcal-text">${Math.round(sum.kcal)} kcal</span> · ${r.posten.length} ${r.posten.length === 1 ? "Zutat" : "Zutaten"}`;
        return bibZeile(e, meBibliothekPosten.push({ art: "rezept", r }) - 1, { loeschen: r.id, unter });
      }))
      : leer("Noch keine eigenen Rezepte. Stell oben eine Mahlzeit zusammen und speichere sie als Rezept.");
    return;
  }
  if (meReiterWahl === "eigene") {
    const liste_ = eigeneLebensmittel(store.getSettings());
    box.innerHTML = liste_.length
      ? liste(liste_.map((l) => {
        const e = eigenerPosten(l);
        const unter = `<span class="me-kcal-text">${l.per100.kcal} kcal je 100 g</span> · ${l.per100.proteinG} g Eiweiß`;
        return bibZeile(e, meBibliothekPosten.push({ art: "posten", e }) - 1, { loeschen: l.id, unter, loeschenArt: "lebensmittel" });
      }))
      : leer("Noch keine eigenen Lebensmittel. Leg unten eines an, mit den Werten je 100 g von der Packung.");
    return;
  }
  if (meReiterWahl === "lexikon") {
    // Die ganze Tabelle, nach Namen. Ein Lexikon zum Blättern, für alles,
    // was man nicht beim Namen sucht.
    const alle = [...FOODS].sort((x, y) => x.label.localeCompare(y.label, "de")).map((f) => tabellenPosten(f));
    box.innerHTML = liste(alle.map((e) => bibZeile(e, meBibliothekPosten.push({ art: "posten", e }) - 1)));
    return;
  }
  const tage = store.allDays().slice(-30).map((d) => ({ ...store.getDay(d), date: d }));
  const zuletzt = zuletztGegessen(tage, { anzahl: 15 });
  box.innerHTML = zuletzt.length
    ? liste(zuletzt.map((e) => bibZeile(e, meBibliothekPosten.push({ art: "posten", e }) - 1)))
    : leer("Hier stehen bald die Lebensmittel, die du zuletzt gegessen hast.");
}

/**
 * Produkte aus dem Netz, während getippt wird. Vorher erst mit Enter, und
 * wer nicht wusste, dass Enter mehr findet, fand seine Marke nie. Gesucht
 * wird 350 Millisekunden nach dem letzten Buchstaben und ab drei Zeichen,
 * sonst ginge bei jedem Buchstaben eine Anfrage raus. Eine Antwort, die
 * nach einer neueren Suche ankommt, wird verworfen: sonst überschreibt
 * "ric" die Treffer für "rice pudding".
 */
var meLiveTimer = 0;
var meLiveNummer = 0;
function meLiveSuche(begriff) {
  clearTimeout(meLiveTimer);
  const nummer = ++meLiveNummer;
  const q = begriff.trim();
  if (q.length < 3 || /^\d+$/.test(q.replace(/\s/g, ""))) { $("meTreffer").hidden = true; return; }
  meLiveTimer = setTimeout(async () => {
    $("meSuchHinweis").textContent = "Suche Produkte";
    try {
      const treffer = await produkteSuchen(q, { anzahl: 8, ...offOptionen() });
      if (nummer !== meLiveNummer) return;
      $("meSuchHinweis").textContent = "";
      if (treffer.length) meTrefferZeichnen(treffer, { titel: "Produkte" });
      else {
        $("meTreffer").hidden = true;
        if (!meBibliothekPosten.length) $("meBibliothek").innerHTML = `<p class="me-leer">Nichts gefunden. Scann den Barcode oder leg es unten als eigenes Lebensmittel an.</p>`;
      }
    } catch {
      if (nummer === meLiveNummer) $("meSuchHinweis").textContent = "Produktsuche gerade nicht erreichbar. Deine eigenen Treffer stehen oben.";
    }
  }, 350);
}

$("meReiter").addEventListener("click", (event) => {
  const k = event.target.closest("[data-reiter]");
  if (!k) return;
  meReiterWahl = k.dataset.reiter;
  meBibliothekZeichnen();
});

function meRezeptHinweis(text) {
  $("meRezeptHinweis").textContent = text;
}

$("meBibliothek").addEventListener("click", (event) => {
  const lmWeg = event.target.closest("[data-lebensmittel-weg]");
  if (lmWeg) {
    const l = eigeneLebensmittel(store.getSettings()).find((x) => x.id === lmWeg.dataset.lebensmittelWeg);
    if (!l || !confirm(`"${l.name}" aus deinen Lebensmitteln löschen? Eingetragene Mahlzeiten bleiben.`)) return;
    store.setSettings(lebensmittelLoeschen(store.getSettings(), l.id));
    meBibliothekZeichnen();
    return;
  }
  const weg = event.target.closest("[data-rezept-weg]");
  if (weg) {
    const r = eigeneRezepte(store.getSettings()).find((x) => x.id === weg.dataset.rezeptWeg);
    if (!r || !confirm(`Rezept "${r.name}" löschen?`)) return;
    store.setSettings(rezeptLoeschen(store.getSettings(), r.id));
    meBibliothekZeichnen();
    return;
  }
  const knopf = event.target.closest("[data-bib]");
  if (!knopf) return;
  const eintrag = meBibliothekPosten[Number(knopf.dataset.bib)];
  if (!eintrag) return;
  spueren("leicht");
  // Ein Rezept kommt als seine Zutaten in die Mahlzeit, nicht als ein Block:
  // so lässt sich heute weniger Reis nehmen, ohne das Rezept zu ändern.
  const neu = eintrag.art === "rezept" ? eintrag.r.posten : [eintrag.e];
  for (const e of neu) mePostenAnhaengen({ ...e });
  if (eintrag.art === "rezept") meRezeptHinweis(`"${eintrag.r.name}" eingefügt. Mengen lassen sich oben ändern.`);
  $("meSuche").value = "";
  $("meTreffer").hidden = true;
  meBibliothekZeichnen();
});

$("meSuche").addEventListener("input", () => {
  if (!$("meSuche").value.trim()) $("meTreffer").hidden = true;
  meBibliothekZeichnen();
});

$("meAlsRezept").addEventListener("click", () => {
  if (mePosten.length === 0) { meRezeptHinweis("Füg erst Lebensmittel hinzu, dann lässt sich das Ganze als Rezept speichern."); return; }
  const grenze = rezeptGrenze(store.getSettings(), KONFIG);
  if (grenze === 0) {
    aboOeffnen({ marke: "Plus und Pro", titel: "Eigene Rezepte speichern", empfohlen: "plus",
      text: "Mit Plus speicherst du fünf eigene Rezepte, mit Pro so viele du willst. Einmal zusammengestellt, mit einem Tipp eingetragen." });
    return;
  }
  $("meRezeptForm").hidden = false;
  $("meRezeptName").focus();
});

function meRezeptSichern() {
  const s = store.getSettings();
  const grenze = rezeptGrenze(s, KONFIG);
  const ergebnis = rezeptSpeichern(s, $("meRezeptName").value, mePosten, { grenze, id: newId });
  if (ergebnis.fehler === "grenze") {
    aboOeffnen({ marke: "Pro", titel: "Mehr eigene Rezepte", empfohlen: "pro",
      text: `In deiner Stufe sind ${grenze} eigene Rezepte möglich. Mit Pro speicherst du so viele du willst. Ein bestehendes Rezept ersetzt du, indem du es unter demselben Namen speicherst.` });
    return;
  }
  if (ergebnis.fehler) { meRezeptHinweis(ergebnis.fehler); return; }
  store.setSettings(ergebnis.settings);
  spueren("erfolg");
  $("meRezeptForm").hidden = true;
  $("meRezeptName").value = "";
  meRezeptHinweis(ergebnis.ersetzt ? `"${ergebnis.rezept.name}" aktualisiert.` : `"${ergebnis.rezept.name}" gespeichert. Du findest es unter Meine Rezepte.`);
  meBibliothekZeichnen();
}

$("meRezeptOk").addEventListener("click", meRezeptSichern);
$("meRezeptName").addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); meRezeptSichern(); }
});

function runde1(wert) {
  return Math.round((Number(wert) || 0) * 10) / 10;
}

/** Eine Zahl mit deutschem Komma, für alles, was gelesen wird. */
function komma(zahl) {
  return String(zahl).replace(".", ",");
}

/** Hängt einen Posten an und zeigt ihn sofort. */
function mePostenAnhaengen(eintrag) {
  mePosten.push(eintrag);
  mePostenZeichnen();
  // An das Ende der Liste scrollen, sonst landet der neue Posten unsichtbar
  // über dem Suchfeld.
  $("mePosten").lastElementChild?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* ---------- Suche und Barcode im Editor ---------- */

async function meSuchen() {
  const begriff = $("meSuche").value.trim();
  if (!begriff) return;
  const hinweis = $("meSuchHinweis");
  $("meTreffer").hidden = true;
  hinweis.textContent = "suche";

  // Eine reine Ziffernfolge ist ein Barcode und trifft genau. Alles andere
  // ist eine Textsuche, und die liefert Treffer unterschiedlicher Güte.
  const ziffern = begriff.replace(/\D/g, "");
  try {
    if (ziffern.length >= 8 && ziffern.length <= 14 && ziffern.length === begriff.replace(/\s/g, "").length) {
      const t = await produktPerBarcode(ziffern, offOptionen());
      if (!t) { hinweis.textContent = "Diesen Barcode kennt Open Food Facts nicht."; return; }
      meTrefferZeichnen([t]);
      hinweis.textContent = "";
      return;
    }
    const treffer = await produkteSuchen(begriff, { anzahl: 8, ...offOptionen() });
    if (treffer.length === 0) {
      hinweis.textContent = "Nichts gefunden. Scann den Barcode oder leg es unten als eigenes Lebensmittel an.";
      $("meHandName").value = begriff;
      document.querySelector(".me-hand")?.setAttribute("open", "");
      return;
    }
    meTrefferZeichnen(treffer);
    hinweis.textContent = "";
  } catch (fehler) {
    hinweis.textContent = `Die Suche hat nicht geklappt: ${fehler.message}`;
  }
}

function meTrefferZeichnen(treffer, { titel = "" } = {}) {
  const liste = $("meTreffer");
  liste.hidden = false;
  liste.innerHTML = (titel ? `<li class="me-treffer-titel">${escapeHtml(titel)}</li>` : "") + treffer.map((t, i) => {
    const p = t.produkt;
    const titel = [p.marke, p.name].filter(Boolean).join(" ");
    // Die vorgeschlagene Portion kommt vom Hersteller, sonst 100 Gramm. Eine
    // geratene Portion wäre schlimmer: der Nutzer übernimmt sie ungeprüft.
    const vorschlag = portionsVorschlag(p);
    const gramm = vorschlag ? vorschlag.gramm : 100;
    const n = naehrwerteFuer(p, gramm);
    const warnung = t.einwaende.length ? `<div class="me-warnung">${escapeHtml(t.einwaende.join(" "))}</div>` : "";
    return `<li>
      <button type="button" class="me-treffer-knopf bib-knopf" data-treffer="${i}">
        ${postenBild({ name: titel || "?", bild: p.bild, kcal: n.kcal, proteinG: n.proteinG, fatG: n.fatG, carbsG: n.carbsG })}
        <span class="bib-text">
        <div class="me-name">${escapeHtml(titel || "Ohne Namen")}</div>
        <div class="me-werte">${gramm} g, ${Math.round(n.kcal)} kcal, ${komma(runde1(n.proteinG))} g Eiweiß</div>
        ${warnung}
        </span>
      </button>
    </li>`;
  }).join("");
  liste.dataset.rohdaten = JSON.stringify(treffer.map((t) => {
    const vorschlag = portionsVorschlag(t.produkt);
    const gramm = vorschlag ? vorschlag.gramm : 100;
    const n = naehrwerteFuer(t.produkt, gramm);
    return {
      name: [t.produkt.marke, t.produkt.name].filter(Boolean).join(" ") || "Ohne Namen",
      gramm,
      kcal: n.kcal, proteinG: n.proteinG, fatG: n.fatG, carbsG: n.carbsG,
      bild: t.produkt.bild,
      produkt: t.produkt,
    };
  }));
}

/* ---------- Ereignisse des Editors ---------- */

// Ein Tipp auf eine Mahlzeit öffnet den Editor. Beide Listen, damit es von
// Heute und von Essen aus gleich funktioniert.
for (const id of ["mealList", "mealList2"]) {
  $(id)?.addEventListener("click", (event) => {
    // Unter Mahlzeiten steht der gewählte Tag des Verlaufs, nicht immer heute.
    const tag = id === "mealList2" ? evTag : heuteTag;
    const weg = event.target.closest("[data-meal-weg]");
    if (weg) {
      spueren("leicht");
      zeileRaus(weg.closest("li"), () => mahlzeitLoeschen(tag, weg.dataset.mealWeg));
      return;
    }
    const zeile = event.target.closest("[data-meal]");
    if (zeile) mahlzeitOeffnen(zeile.dataset.meal, tag);
  });
  // Nach links wischen löscht, wie in den Listen von iOS. Das Kreuz bleibt
  // stehen: wer nicht weiss, dass man wischen kann, findet es trotzdem.
  wischenZumLoeschen($(id), "li[data-meal]", (li) => {
    spueren("leicht");
    const tag = id === "mealList2" ? evTag : heuteTag;
    zeileRaus(li, () => mahlzeitLoeschen(tag, li.dataset.meal));
  });
}

$("evKalender").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-ev-tag]");
  if (!knopf || knopf.disabled) return;
  evTag = knopf.dataset.evTag;
  renderVerlauf();
});
$("evZurueck").addEventListener("click", () => { evMonat = monatPlus(evMonat, -1); renderVerlauf(); });
$("evVor").addEventListener("click", () => { evMonat = monatPlus(evMonat, 1); renderVerlauf(); });

$("heuteTitel").addEventListener("click", tagWahlOeffnen);
$("heuteZurueck").addEventListener("click", () => heuteZeigen(todayIso()));
$("twSchliessen").addEventListener("click", tagWahlSchliessen);
$("tagWahlBlatt").addEventListener("click", (event) => {
  if (event.target === $("tagWahlBlatt")) tagWahlSchliessen();
});
$("twKalender").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-ev-tag]");
  if (!knopf || knopf.disabled) return;
  twTag = knopf.dataset.evTag;
  tagWahlZeichnen();
});
$("twZurueck").addEventListener("click", () => { twMonat = monatPlus(twMonat, -1); tagWahlZeichnen(); });
$("twVor").addEventListener("click", () => { twMonat = monatPlus(twMonat, 1); tagWahlZeichnen(); });
$("twAnzeigen").addEventListener("click", () => { tagWahlSchliessen(); heuteZeigen(twTag); });
$("twHeute").addEventListener("click", () => { tagWahlSchliessen(); heuteZeigen(todayIso()); });
$("evWochen").addEventListener("click", (event) => {
  const zeile = event.target.closest("[data-ev-woche]");
  if (!zeile) return;
  verlaufZeigen(zeile.dataset.evWoche);
  $("evTagTitel").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("evNachtragen").addEventListener("click", () => mahlzeitNeu(undefined, evTag));
$("btnVerlaufOeffnen").addEventListener("click", () => {
  verlaufZeigen(isoPlus(todayIso(), -1));
  showView("essen");
  requestAnimationFrame(() => $("evAnker").scrollIntoView({ block: "start" }));
});

$("meSchliessen").addEventListener("click", mahlzeitSchliessen);
$("mahlzeitEditor").addEventListener("click", (event) => {
  // Ein Tipp auf den Hintergrund schliesst. Ein Tipp im Blatt nicht.
  if (event.target === $("mahlzeitEditor")) mahlzeitSchliessen();
});

$("meArten").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-art]");
  if (!knopf) return;
  // Nochmal auf dieselbe Art tippen hebt die Zuordnung auf.
  meArt = meArt === knopf.dataset.art ? "" : knopf.dataset.art;
  meArtenZeichnen();
});

$("mePosten").addEventListener("input", (event) => {
  const feld = event.target.closest(".me-menge");
  if (!feld) return;
  const i = Number(feld.dataset.i);
  const zahl = Number(feld.value);
  if (!Number.isFinite(zahl) || zahl <= 0) return;
  const alt = mePosten[i];
  if (!alt) return;
  mePosten[i] = mengeSetzen(alt, zahl);
  // Nur die Werte neu schreiben, nicht die ganze Liste. Ein Neuaufbau würde
  // dem Nutzer mitten im Tippen den Fokus aus dem Feld nehmen.
  const zeile = feld.closest("li")?.querySelector(".me-werte");
  const e = mePosten[i];
  if (zeile) zeile.innerHTML = postenWerte(e, dayNumbers(meTag).targets);
  meSummeZeichnen();
});

$("mePosten").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-weg]");
  if (!knopf) return;
  mePosten.splice(Number(knopf.dataset.weg), 1);
  mePostenZeichnen();
});

$("meSuchen").addEventListener("click", meSuchen);
$("meSuche").addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); meSuchen(); }
});

$("meTreffer").addEventListener("click", (event) => {
  const knopf = event.target.closest("[data-treffer]");
  if (!knopf) return;
  const rohdaten = JSON.parse($("meTreffer").dataset.rohdaten || "[]");
  const t = rohdaten[Number(knopf.dataset.treffer)];
  if (!t) return;
  mePostenAnhaengen({
    name: t.name,
    quantity: `${t.gramm} g`,
    kcal: Math.round(t.kcal),
    proteinG: runde1(t.proteinG),
    fatG: runde1(t.fatG),
    carbsG: runde1(t.carbsG),
    ...(t.bild ? { bild: t.bild } : {}),
  });
  // Gemerkt, damit es beim nächsten Mal ab dem ersten Buchstaben ohne Netz vorn steht.
  if (t.produkt) store.setSettings(produktGemerkt(store.getSettings(), t.produkt, $("meSuche").value));
  $("meTreffer").hidden = true;
  $("meSuche").value = "";
  meBibliothekZeichnen();
});

$("meHandAdd").addEventListener("click", () => {
  const name = $("meHandName").value.trim();
  const gramm = Number($("meHandGramm").value);
  const kcal = Number($("meHandKcal").value);
  const hinweis = $("meHandHinweis");
  if (!name) { hinweis.textContent = "Ohne Namen findest du den Posten später nicht wieder."; return; }
  if (!Number.isFinite(gramm) || gramm <= 0) { hinweis.textContent = "Die Menge fehlt."; return; }
  if (!Number.isFinite(kcal) || kcal < 0) { hinweis.textContent = "Die Kalorien je 100 g fehlen."; return; }
  const werte = {
    kcal,
    proteinG: Number(String($("meHandP").value).replace(",", ".")) || 0,
    fatG: Number(String($("meHandF").value).replace(",", ".")) || 0,
    carbsG: Number(String($("meHandK").value).replace(",", ".")) || 0,
  };
  let satz = "Hinzugefügt.";
  if ($("meHandMerken").checked) {
    // Gespeichert wird vor dem Anhängen: lehnt die Prüfung die Werte ab,
    // etwa Makros über 100 g, soll auch kein Posten mit diesen Werten im
    // Tag landen.
    const r = lebensmittelSpeichern(store.getSettings(), { name, ...werte, portionG: gramm }, { id: newId });
    if (r.fehler) { hinweis.textContent = r.fehler; return; }
    store.setSettings(r.settings);
    satz = `Hinzugefügt und unter Eigene gespeichert.${r.hinweis ? ` ${r.hinweis}` : ""}`;
  }
  mePostenAnhaengen(eintragAus100g(name, gramm, werte));
  for (const id of ["meHandName", "meHandKcal", "meHandP", "meHandF", "meHandK"]) $(id).value = "";
  $("meHandGramm").value = "100";
  hinweis.textContent = satz;
  meBibliothekZeichnen();
});

$("meLoeschen").addEventListener("click", () => {
  if (!meMahlzeit) return;
  if (meWahl) {
    essenWahlSetzen(meWahl.tag, meWahl.art, null);
    meWahl.gespeichert = true;
    mahlzeitSchliessen();
    return;
  }
  const { id } = meMahlzeit;
  const tag = meTag;
  // Erst schliessen, dann löschen: mahlzeitSchliessen räumt eine neue, leere
  // Mahlzeit selbst weg, und Rückgängig soll die gespeicherte zurückholen.
  meNeu = false;
  mahlzeitSchliessen();
  mahlzeitLoeschen(tag, id);
});

$("meSpeichern").addEventListener("click", () => {
  if (!meMahlzeit) return;
  if (meWahl) {
    // Leer heisst: wieder der Vorschlag.
    essenWahlSetzen(meWahl.tag, meWahl.art, mePosten.length
      ? { name: mePosten.map((e) => e.name).join(", "), um: $("meZeit").value || undefined, posten: mePosten } : null);
    meWahl.gespeichert = true;
    mahlzeitSchliessen();
    toast(mePosten.length ? "Geändert. Der Rest des Tages ist neu gerechnet." : "Wieder der Vorschlag von daevo.");
    return;
  }
  // Eine Mahlzeit ohne Posten ist keine Mahlzeit. Sie stehen zu lassen hiesse,
  // eine Zeile mit null Kalorien im Verlauf zu führen.
  if (mePosten.length === 0) {
    store.removeMeal(meTag, meMahlzeit.id);
    mahlzeitSchliessen();
    refreshAll();
    toast("Mahlzeit gelöscht, es war nichts mehr drin");
    return;
  }
  const zeit = $("meZeit").value || meMahlzeit.at;
  store.updateMeal(meTag, meMahlzeit.id, {
    entries: mePosten,
    at: zeit,
    art: meArt || undefined,
    // Von Hand geändert. Das gehört vermerkt: eine korrigierte Mahlzeit ist
    // keine Schätzung des Modells mehr, und der Coach soll sie nicht
    // nochmal in Frage stellen.
    korrigiert: true,
  });
  mahlzeitSchliessen();
  refreshAll();
  toast("Gespeichert");
});

/* ---------- Barcode im Editor ---------- */

/**
 * Der Scanner im Editor.
 *
 * Drei Wege, der erste, der geht, gewinnt. In der iPhone App liest Apple
 * selbst, `ScannerPlugin.swift`. Im Browser die Kamera über `getUserMedia`,
 * gelesen von `BarcodeDetector`, wo es ihn gibt, sonst von `ean.js`. Vorher
 * gab es nur `BarcodeDetector`, den das iPhone nicht kennt, und ein Tipp auf
 * den Scanner tat dort sichtbar nichts: der Hinweis stand klein unter dem
 * Suchfeld, oft unter der Tastatur.
 *
 * Die Kamera im Browser steht als Vollbild mit Rahmen und "Abbrechen", wie
 * nativ. Ein Video von Daumengrösse im Blatt zielt niemand auf eine Packung.
 */
let meScanStrom = null;
let meScanTimer = 0;

function meScanFehler(text) {
  $("meSuchHinweis").textContent = text;
  toast(text, 6000);
}

/**
 * Ein gescannter Code ist eindeutig, deshalb kommt das Produkt direkt in die
 * Mahlzeit, mit der Portion des Herstellers. Vorher stand es als Treffer da
 * und wollte noch einmal angetippt werden. Kennt Open Food Facts den Code
 * nicht, steht er im Suchfeld, und unten lässt sich das Produkt anlegen.
 */
async function meScanTreffer(code) {
  spueren("erfolg");
  $("meSuchHinweis").textContent = "Suche den Barcode";
  try {
    const t = await produktPerBarcode(code, offOptionen());
    if (t?.produkt) {
      const e = produktPosten(t.produkt);
      mePostenAnhaengen({ ...e, kcal: Math.round(e.kcal) });
      store.setSettings(produktGemerkt(store.getSettings(), t.produkt));
      $("meSuche").value = "";
      $("meSuchHinweis").textContent = t.einwaende?.length ? t.einwaende.join(" ") : "";
      meBibliothekZeichnen();
      toast(`${e.name} hinzugefügt. Die Menge lässt sich oben ändern.`, 4000);
      return;
    }
  } catch { /* weiter wie ohne Treffer */ }
  $("meSuche").value = code;
  meBibliothekZeichnen();
  $("meSuchHinweis").textContent = "Diesen Barcode kennt Open Food Facts nicht. Leg das Produkt unten mit den Werten von der Packung an.";
  document.querySelector(".me-hand")?.setAttribute("open", "");
}

async function meScanStarten() {
  if (meScanLaeuft) { meScanStoppen(); return; }
  if (istNativ()) {
    try {
      const { code } = await nativAufruf("Scanner", "scannen");
      if (code) meScanTreffer(String(code));
      return;
    } catch (fehler) {
      const grund = String(fehler?.message ?? fehler);
      if (grund.includes("abgebrochen")) return;
      if (grund.includes("keinZugriff")) {
        meScanFehler("daevo darf die Kamera nicht benutzen. Erlaub es unter Einstellungen, daevo, Kamera, oder tipp die Ziffern ein.");
        return;
      }
      // Eine ältere Fassung der App ohne das Plugin: weiter mit der Kamera der Web Ansicht.
    }
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    meScanFehler("Hier gibt es keinen Kamerazugriff. Tipp die Ziffern unter dem Barcode ins Suchfeld.");
    $("meSuche").focus();
    return;
  }
  try {
    meScanStrom = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  } catch {
    meScanFehler("Ohne Kamerazugriff geht der Scanner nicht. Erlaub die Kamera oder tipp die Ziffern ein.");
    return;
  }
  meScanLaeuft = true;
  const blatt = document.createElement("div");
  blatt.className = "scan-blatt";
  blatt.innerHTML = `<video playsinline muted autoplay></video>
    <div class="scan-rahmen" aria-hidden="true"></div>
    <p class="scan-hinweis">Halte den Barcode in den Rahmen</p>
    <button type="button" class="scan-abbrechen">Abbrechen</button>`;
  document.body.append(blatt);
  blatt.querySelector(".scan-abbrechen").addEventListener("click", meScanStoppen);
  const video = blatt.querySelector("video");
  video.srcObject = meScanStrom;
  await video.play().catch(() => {});

  const detektor = "BarcodeDetector" in window
    ? new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] })
    : null;
  const leinwand = document.createElement("canvas");
  const g = leinwand.getContext("2d", { willReadFrequently: true });
  const suchen = async () => {
    if (!meScanLaeuft) return;
    let code = null;
    try {
      if (detektor) {
        const codes = await detektor.detect(video);
        code = codes[0]?.rawValue || null;
      }
      if (!code && video.videoWidth) {
        // Nur der mittlere Streifen, dort liegt der Rahmen. Weniger Pixel,
        // schneller gelesen, und ein zweiter Code am Rand stört nicht.
        const w = video.videoWidth; const h = video.videoHeight;
        const sw = Math.min(w, 1280); const sh = Math.round(h * 0.4);
        leinwand.width = sw; leinwand.height = sh;
        g.drawImage(video, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, sw, sh);
        code = eanAusBild(g.getImageData(0, 0, sw, sh));
      }
    } catch { /* ein einzelnes Bild ohne Treffer ist kein Fehler */ }
    if (code) { meScanStoppen(); meScanTreffer(code); return; }
    meScanTimer = setTimeout(suchen, 120);
  };
  suchen();
}

function meScanStoppen() {
  meScanLaeuft = false;
  clearTimeout(meScanTimer);
  document.querySelector(".scan-blatt")?.remove();
  if (meScanStrom) {
    for (const spur of meScanStrom.getTracks()) spur.stop();
    meScanStrom = null;
  }
}

$("meScan").addEventListener("click", meScanStarten);

/* ---------- Benachrichtigungen ---------- */

/**
 * Zeigt, woran es hängt, statt am Ende nur zu melden, dass es nicht geht.
 *
 * Drei Dinge müssen stimmen: der Browser kann Push, die App läuft vom Home
 * Bildschirm, und die Erlaubnis steht. Auf dem iPhone scheitert es fast immer
 * am zweiten Punkt, und das sieht man dem Fehler sonst nicht an.
 */
/** Stufe und Verbrauch im Profil. Nur über den eigenen Server, sonst gibt es kein Konto. */
async function renderKonto() {
  if (!KONFIG.chatUrl) return;
  const stand = await kontoStand();
  $("kontoStand").textContent = kontoText(stand);
  $("kontoId").textContent = stand?.id || store.getSettings().kontoId || "-";
}

// Die Kennung stand vorher als Wert einer Zeile "Konto", rechts und
// abgeschnitten, und wurde auf dem iPhone nicht gefunden. Kopieren über
// einen Knopf, weil eine lange Zeichenkette niemand abtippt.
$("btnKontoKopieren").addEventListener("click", async () => {
  const id = store.getSettings().kontoId || "";
  if (!id) { toast("Noch kein Konto. Prüf deine Verbindung und öffne das Profil erneut."); return; }
  try {
    await navigator.clipboard.writeText(id);
    toast("Kennung kopiert");
  } catch {
    toast(`Kennung: ${id}`, 10000);
  }
});

/* ---------- Anmeldung mit Apple oder Google ---------- */

let anmeldungWartet = null;

/**
 * Zeigt den Anmeldebildschirm, wenn es einen Weg gibt und noch nicht
 * gefragt wurde. Löst auf, sobald angemeldet oder übersprungen ist. Nach
 * "Ohne Anmeldung weiter" fragt die App nicht wieder, im Profil bleibt der
 * Knopf.
 */
function anmeldungFragen({ immer = false } = {}) {
  const wege = anmeldeWege();
  const s = store.getSettings();
  if (!wege.apple && !wege.google) return Promise.resolve(false);
  if (!immer && (s.login || s.anmeldungGefragt)) return Promise.resolve(false);
  $("btnAnmeldenApple").hidden = !wege.apple;
  $("btnAnmeldenGoogle").hidden = !(wege.google && istNativ());
  $("googleWebKnopf").hidden = !(wege.google && !istNativ());
  if (wege.google && !istNativ()) googleWebLaden();
  $("anmeldeBlatt").hidden = false;
  return new Promise((resolve) => { anmeldungWartet = resolve; });
}

function anmeldungSchliessen(ergebnis) {
  $("anmeldeBlatt").hidden = true;
  store.setSettings({ ...store.getSettings(), anmeldungGefragt: true });
  anmeldungStandZeigen();
  const w = anmeldungWartet;
  anmeldungWartet = null;
  w?.(ergebnis);
}

async function anmeldungAusfuehren(weg, knopf) {
  if (knopf) knopf.disabled = true;
  try {
    const r = await weg();
    if (r?.fehler) { toast(r.fehler, 5000); return; }
    toast(r.uebernommen ? "Angemeldet. Dein Konto ist wieder da." : "Angemeldet.");
    kontoStand().catch(() => {});
    anmeldungSchliessen(true);
  } catch (e) {
    if (String(e?.message || e) !== "abgebrochen") toast(`Anmeldung gescheitert: ${e?.message || e}`, 5000);
  } finally {
    if (knopf) knopf.disabled = false;
  }
}

$("btnAnmeldenApple").addEventListener("click", (e) => anmeldungAusfuehren(() => anmeldenApple(), e.currentTarget));
$("btnAnmeldenGoogle").addEventListener("click", (e) => anmeldungAusfuehren(() => anmeldenGoogleNativ(), e.currentTarget));
$("btnAnmeldenSpaeter").addEventListener("click", () => anmeldungSchliessen(false));
$("btnAnmeldungProfil").addEventListener("click", () => anmeldungFragen({ immer: true }));

/**
 * Kündigen muss so leicht sein wie abschliessen. In der iPhone App öffnet
 * das die Abos der Apple ID, im Browser das Kundenportal von Stripe.
 */
$("btnAboVerwalten").addEventListener("click", async () => {
  if (istNativ()) {
    try { await nativAufruf("Abo", "verwalten", {}); } catch (e) { toast(e.message, 5000); }
    return;
  }
  if (KONFIG.abo?.portalUrl) window.open(KONFIG.abo.portalUrl, "_blank", "noopener");
});

let googleGeladen = false;

/**
 * Im Browser zeichnet Google seinen eigenen Knopf. Das Skript kommt erst,
 * wenn der Bildschirm wirklich erscheint: vorher verrät kein Abruf an Google,
 * dass jemand daevo öffnet.
 */
function googleWebLaden() {
  const zeichnen = () => {
    const g = globalThis.google?.accounts?.id;
    if (!g) return;
    g.initialize({
      client_id: KONFIG.anmeldung?.googleWebClientId,
      callback: (antwort) => anmeldungAusfuehren(() => anmeldungSenden({ anbieter: "google", idToken: antwort.credential })),
    });
    $("googleWebKnopf").innerHTML = "";
    g.renderButton($("googleWebKnopf"), { theme: "filled_black", size: "large", shape: "pill", text: "signin_with", width: 320, locale: "de" });
  };
  if (googleGeladen) { zeichnen(); return; }
  const skript = document.createElement("script");
  skript.src = "https://accounts.google.com/gsi/client";
  skript.async = true;
  skript.onload = () => { googleGeladen = true; zeichnen(); };
  document.head.appendChild(skript);
}

function anmeldungStandZeigen() {
  const wege = anmeldeWege();
  const da = wege.apple || wege.google;
  const s = store.getSettings();
  $("anmeldungStand").hidden = !da;
  $("anmeldungStand").textContent = anmeldungText(s);
  $("btnAnmeldungProfil").hidden = !da || Boolean(s.login);
  $("btnAboVerwalten").hidden = !(KONFIG.chatUrl && (istNativ() || KONFIG.abo?.portalUrl));
}

/* ---------- Zugriffe beim ersten Start ---------- */

let rechteOffen = false;

/**
 * Zeigt beim ersten Start in der iPhone App einmal das Blatt mit den vier
 * Zugriffen und stellt danach die Fragen von iOS, siehe `berechtigungen.js`.
 * Löst sich auf, wenn alles beantwortet ist, sonst sofort.
 */
function rechteFragen() {
  if (!istNativ() || !berechtigungenOffen(store.getSettings())) return Promise.resolve();
  rechteOffen = true;
  $("rechteBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
  return new Promise((fertig) => {
    $("rechteWeiter").addEventListener("click", async () => {
      $("rechteBlatt").hidden = true;
      document.body.classList.remove("blatt-offen");
      try {
        const ergebnis = await berechtigungenFragen({ aufruf: nativAufruf, store });
        // Was fehlt zuerst, dann welche Kalender gefunden wurden. Fehlt
        // Google, steht der Weg dorthin gleich dabei.
        const satz = [berechtigungenText(ergebnis), ergebnis.konten ? kontenText(ergebnis.konten) : ""].filter(Boolean).join(" ");
        if (satz) toast(satz, 12000);
      } catch {
        // Ohne Hülle oder Plugin bleibt jede Funktion bei ihrer eigenen Frage.
      }
      rechteOffen = false;
      fertig();
    }, { once: true });
  });
}

/* ---------- Apple Health in der iPhone App ---------- */

let healthLaeuft = false;
// Offen alle zehn Minuten. Vorher nur beim Öffnen, und wer daevo nach dem
// Training offen hatte, sah die Kalorien der Stunde davor nie.
setInterval(() => { if (document.visibilityState === "visible") healthNativ(); }, 10 * 60_000);

/**
 * Liest Apple Health beim Start und bei jedem Zurückholen der App. Läuft
 * schon ein Abgleich, wird kein zweiter gestartet: das erste Lesen geht
 * über zwei Jahre und kann dauern.
 */
async function healthNativ() {
  if (!istNativ() || healthLaeuft || rechteOffen) return;
  healthLaeuft = true;
  try {
    const bericht = await healthkitAbgleichen({ aufruf: nativAufruf, store, heute: todayIso() });
    if (bericht.tage || bericht.trainings || bericht.mahlzeiten || bericht.uebersprungen) refreshAll();
    if (bericht.neueTrainings?.length) await trainingVonDerUhr(bericht.neueTrainings);
  } catch {
    // Ohne Erlaubnis oder ohne Health bleibt alles, wie es war. Der Weg über
    // den Export im Profil steht weiter offen.
  } finally {
    healthLaeuft = false;
  }
}

/**
 * Ein Training aus Apple Health, das daevo noch nicht kannte.
 *
 * Lob in den Chat, ein Termin in den Kalender, wenn dort zu der Zeit noch
 * kein Training steht, und die Frage, ob ein heute noch geplantes Training
 * damit vorgezogen war. Siehe training-erkannt.js.
 */
let trainingFrage = null;
async function trainingVonDerUhr(neue) {
  const s = store.getSettings();
  const gemeldet = s.trainingGemeldet || [];
  const erkannt = trainingErkannt({
    neue, heute: todayIso(), profil: store.getProfile() || {}, termine: store.getKalender().termine || [], gemeldet,
  });
  if (!erkannt) return;
  store.setSettings({ ...store.getSettings(), trainingGemeldet: [...gemeldet, ...erkannt.ids].slice(-50) });
  const { kannSchreiben, trainingNachtragen } = await import("./kalender-schreiben.js");
  if (kannSchreiben()) {
    try { await trainingNachtragen(erkannt.training); } catch { /* ohne Kalender bleibt es beim Eintrag im Tag */ }
  }
  const chat = store.getChat();
  chat.push({ role: "assistant", text: erkannt.text, at: new Date().toISOString() });
  store.setChat(chat);
  renderTranscript();
  trainingFrage = erkannt.naechstes;
}

/**
 * Plant die Mitteilungen neu und holt ab, was in ihnen beantwortet wurde.
 * Bei jedem Öffnen, denn jede Mahlzeit und jedes Training kann den Plan
 * ändern: wer heute trainiert hat, bekommt um 18 Uhr keine Frage nach der
 * Lücke.
 */
async function mitteilungenNativ() {
  if (!istNativ() || rechteOffen) return;
  try {
    const { antworten = [], geoeffnet = null } = await nativAufruf("Mitteilungen", "abholen");
    for (const eintrag of antworten) {
      if (eintrag?.text) { await mitteilungAntworten(eintrag); continue; }
      // Knöpfe ohne Text: Wasser dazu, Training verschieben. "Lassen" und
      // "Kalender öffnen" heissen für die App nichts tun.
      if (await aktionAusMitteilung(eintrag)) continue;
      if (eintrag?.art === "kalender") continue;
      if (antwortVerarbeiten(eintrag, { store, brain })) toast("Antwort übernommen");
    }
    // Ein Training von der Uhr: Chat öffnen und Health lesen, dort entsteht
    // die Nachricht mit Eintrag, Kalender und Frage.
    if (geoeffnet?.art === "training") { showView("assistant"); healthNativ(); }
    else if (geoeffnet?.art === "antwort") showView("assistant");
    else if (geoeffnet?.art === "luecke") lueckeFrageOeffnen();
    else if (geoeffnet?.art === "satzpause") training.fortsetzen();
    else if (geoeffnet?.art) impulsOeffnen({ art: geoeffnet.art });

    await mitteilungenNeuPlanen();
  } catch {
    // Ohne Erlaubnis plant iOS nichts. Die App läuft trotzdem.
  }
}

/**
 * Eine Antwort, die direkt in einer Mitteilung getippt oder auf der Uhr
 * diktiert wurde. Sie läuft durch denselben Weg wie eine Antwort im Chat:
 * erst steht die Frage im Gespräch, dann die Antwort, und eine blosse Zahl
 * auf die Energiefrage rechnet `energieCheck` ohne Modell. Ist die App
 * dabei nicht zu sehen, kommt die Antwort von daevo als Mitteilung zurück,
 * sonst stünde sie nur im Chat, den gerade niemand ansieht.
 */
async function mitteilungAntworten(eintrag) {
  const text = String(eintrag?.text || "").trim();
  if (!text) return;
  while (busy) await new Promise((weiter) => setTimeout(weiter, 300));
  if (eintrag.art && eintrag.art !== "antwort") impulsOeffnen({ art: eintrag.art }, { still: true });
  $("assistant").classList.add("has-chat");
  const vorher = store.getChat().length;
  await send(text);
  const neu = store.getChat().slice(vorher).filter((m) => m.role === "assistant").pop();
  if (neu?.text && document.visibilityState !== "visible") {
    await nativAufruf("Mitteilungen", "sofort", { titel: "daevo", text: chatSprechbar(neu.text) }).catch(() => {});
  }
}

/**
 * Das Plugin ruft das auf, wenn eine Antwort aus einer Mitteilung kommt,
 * während daevo noch im Speicher liegt. Holt nur die Antworten ab und plant
 * nichts neu: dafür reicht die Zeit im Hintergrund nicht sicher.
 */
window.daevoMitteilungAntworten = async () => {
  if (!istNativ()) return;
  const { antworten = [] } = await nativAufruf("Mitteilungen", "abholen");
  for (const eintrag of antworten) {
    if (eintrag?.text) await mitteilungAntworten(eintrag);
    else if (await aktionAusMitteilung(eintrag)) continue;
    else if (antwortVerarbeiten(eintrag, { store, brain })) refreshAll();
  }
};

/**
 * Ein Knopf an einer Mitteilung, der etwas tut: Wasser dazu oder das Training
 * verschieben. Das Ergebnis steht als Meldung in der App, liegt die App nicht
 * vorn, als Mitteilung: ein Knopf ohne Rückmeldung wird zweimal getippt.
 */
async function aktionAusMitteilung(eintrag) {
  let satz = wasserAusAktion(eintrag, store);
  if (!satz && eintrag?.art === "kalender" && eintrag.aktion === "umplanen" && eintrag.eid) {
    // Den freien Platz rechnet die App mit denselben Regeln wie im Gespräch.
    const { konfliktUmplanen } = await import("./kalender-schreiben.js");
    satz = (await konfliktUmplanen({ eid: eintrag.eid, von: eintrag.von })).replace(/^Noch nicht gespeichert\. /, "");
  }
  if (!satz) return false;
  refreshAll();
  if (document.visibilityState === "visible") toast(satz, 8000);
  else await nativAufruf("Mitteilungen", "sofort", { titel: "daevo", text: satz }).catch(() => {});
  return true;
}

async function mitteilungenNeuPlanen() {
  const d = new Date();
  const jetzt = { tag: todayIso(d), uhrzeit: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
  let vorausblicke = [];
  try { vorausblicke = vorausblickePlan(jetzt.tag); } catch { /* ohne Kalender keiner */ }
  await mitteilungenPlanen({ aufruf: nativAufruf, store, jetzt, vorausblicke });
}

/**
 * Nach jedem Eintrag neu planen, gebündelt. Wer um 13 Uhr sein Mittagessen
 * einträgt, bekommt um 16 Uhr keine Frage mehr, ob es ausgefallen ist: der
 * Plan bei iOS wird ohne diese Mitteilung ersetzt. var aus demselben Grund
 * wie bei uhrTimer, refreshAll läuft vor dieser Zeile.
 */
// eslint-disable-next-line no-var
var planTimer = 0;
function planSpaeter() {
  // Nicht rechteOffen lesen: das ist ein let, und refreshAll läuft beim Start
  // vor seiner Zeile. Das wäre ein ReferenceError und eine schwarze App.
  if (!istNativ() || !store.getSettings().mitteilungenGefragt) return;
  clearTimeout(planTimer);
  planTimer = setTimeout(() => mitteilungenNeuPlanen().catch(() => {}), 3000);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    kalenderStill();
    // Erst die Mitteilung, dann Health: der Abgleich dauert Sekunden, und
    // so lange stand nach einem Tipp die Startseite da.
    mitteilungenNativ().then(() => healthNativ()).then(morgenVielleicht);
  }
});

/* ---------- Abendroutine ---------- */

const abend = abendStarten({
  store, heute: todayIso,
  jetztUhrzeit: () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; },
});
$("btnAbendroutine").addEventListener("click", () => abend.oeffnen());

/* ---------- Guten Morgen Check-in ---------- */

const morgen = morgenStarten({
  store, heute: todayIso, melde: (text) => toast(text),
  // Neu planen: nach Fitheit 1 oder 2 kommt die Nachfrage am Mittag dazu,
  // nach der Nachfrage fällt sie wieder weg.
  gespeichert: (r) => { refreshAll(); mitteilungenNativ(); morgenShow(r); },
  tagesbriefing: () => { try { return tagesbriefingFuer("morgen"); } catch { return null; } },
  schlafWoche: () => { try { return schlafWocheHtml(schlafWocheFuer(store, todayIso())); } catch { return ""; } },
  kalenderFrisch: async () => {
    const s = store.getSettings();
    if (!s.appleKalender && !kalenderAbos(s).length) return;
    await kalenderAbgleichen({ zwang: true });
  },
});

// Solange die App offen ist, gleicht sie den Kalender alle 15 Minuten ab.
// Wer daevo den Tag über offen hat, sieht sonst bis zum nächsten Start den
// Stand vom Morgen.
setInterval(() => { if (document.visibilityState === "visible") kalenderStill(); }, 15 * 60 * 1000);

/*
 * 2. Das Ergebnis des Morgen Check-ins als Präsentation, direkt nach dem
 * Absenden. Darunter bleibt das Blatt mit dem Ergebnis, ein Tipp auf
 * "Als Präsentation ansehen" dort zeigt sie noch einmal.
 */
let morgenLetzt = null;
function morgenShow(r = morgenLetzt) {
  if (!r) return;
  morgenLetzt = r;
  const morgens = r.gestrichen === undefined;
  const datum = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  storyOeffnen("Morgen Check-in", () => morgenFolien(r, { datum, gruss: morgens ? "Guten Morgen" : "Mittags nachgefragt", mitBriefing: morgens }), {
    aktion: (was) => { if (was === "briefing") setTimeout(() => briefingShowOeffnen("morgen"), 60); },
    anpassen: (id, _z, st) => {
      if (id === "plan") { st.schliessen(); $("morgenBlatt").hidden = true; document.body.classList.remove("blatt-offen"); showView("plaene"); }
    },
  });
}
$("morgenBlatt").addEventListener("click", (ev) => { if (ev.target.closest("[data-morgen-show]")) morgenShow(); });

/**
 * Öffnet den Morgen Check-in, wenn es Zeit ist. Nie während der Einführung
 * und nie über einem anderen offenen Blatt: wer gerade trainiert oder ein
 * Foto auswertet, wird nicht unterbrochen.
 */
function morgenVielleicht() {
  if ($("app").hidden || !store.getSettings().einfuehrungGesehen) return;
  if (document.querySelector(".blatt:not([hidden])")) return;
  const d = new Date();
  const jetzt = { tag: todayIso(d), uhrzeit: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` };
  if (!morgen.vielleicht(jetzt)) morgen.nachfrageVielleicht(jetzt);
}
// Nach einem schwachen Morgen führt der Knopf zur Nachfrage. So lässt sich
// ein gestrichenes Training wieder freigeben, wenn es einem besser geht.
$("btnMorgenCheckin").addEventListener("click", () => {
  const c = morgenVonHeute(store, todayIso());
  if (c && c.morgen.gesund <= 2) morgen.nachfrage(); else morgen.oeffnen();
});

/* ---------- Eigene Erinnerungen ---------- */

const ER_KREUZ = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
  + 'stroke-linecap="round" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';

function eigeneErinnerungenZeigen() {
  const liste = erinnerungenAufgeraeumt();
  $("eigeneListe").innerHTML = liste.length
    ? liste.map((e) => `<li><div class="li-main"><div class="li-title">${escapeHtml(e.text)}</div>`
      + `<div class="li-sub">${escapeHtml(erinnerungZeile(e, todayIso()))}</div></div>`
      + `<div class="li-side"><button class="aufgabe-knopf" data-er-weg="${e.id}" title="Löschen" `
      + `aria-label="Erinnerung löschen">${ER_KREUZ}</button></div></li>`).join("")
    : "";
  $("btnErinnerungNeu").disabled = liste.filter((e) => !istEinmalig(e)).length >= MAX_EIGENE;
}

$("erWann").addEventListener("change", () => {
  const fest = $("erWann").value === "uhrzeit";
  $("erUhrzeitFeld").hidden = !fest;
  $("erAbstandFeld").hidden = fest;
});
$("erTage").addEventListener("click", (event) => {
  const b = event.target.closest("[data-er-tag]");
  if (b) b.classList.toggle("on");
});
$("eigeneListe").addEventListener("click", (event) => {
  const b = event.target.closest("[data-er-weg]");
  if (!b) return;
  const s = store.getSettings();
  const weg = (s.eigeneErinnerungen || []).find((e) => e.id === b.dataset.erWeg);
  store.setSettings({ ...s, eigeneErinnerungen: (s.eigeneErinnerungen || []).filter((e) => e.id !== b.dataset.erWeg) });
  if (weg?.kalender) import("./kalender-schreiben.js").then((m) => m.erinnerungAustragen(weg.kalender));
  eigeneErinnerungenZeigen();
  mitteilungenNativ();
});
$("btnErinnerungNeu").addEventListener("click", async () => {
  const wann = $("erWann").value;
  const tage = [...$("erTage").querySelectorAll(".on")].map((b) => Number(b.dataset.erTag));
  const eingabe = wann === "uhrzeit"
    ? { text: $("erText").value, uhrzeit: $("erUhrzeit").value, tage }
    : { text: $("erText").value, bezug: wann, versatz: Number($("erAbstand").value) * (wann === "schlafen" ? -1 : 1), tage };
  const antwort = await buildActions({ onChange: refreshAll }).erinnerungAnlegen(eingabe);
  $("erHinweis").textContent = antwort;
  if (antwort.startsWith("Erinnerung angelegt")) {
    $("erText").value = "";
    for (const b of $("erTage").querySelectorAll(".on")) b.classList.remove("on");
    eigeneErinnerungenZeigen();
    mitteilungenNativ();
  }
});

/* ---------- Abo Fenster ---------- */

let aboWahl = "plus";
// Jährlich ist vorgewählt. Es ist für beide Seiten die bessere Wahl, und wer
// monatlich will, sieht den Schalter direkt darüber.
let aboTakt = "jahr";

function aboMerken(merken) {
  if (!merken) return;
  const s = store.getSettings();
  store.setSettings({ ...s, aboHinweise: { ...(s.aboHinweise || {}), ...merken } });
}

function aboTaktZeigen() {
  const box = $("aboTakt");
  box.innerHTML = "";
  const ersparnis = Math.min(...ABO_STUFEN.map(ersparnisProzent));
  for (const takt of ABO_TAKTE) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(takt === aboTakt));
    b.textContent = takt === "jahr" ? "Jährlich" : "Monatlich";
    if (takt === "jahr") {
      const marke = document.createElement("span");
      marke.className = "abo-takt-marke";
      marke.textContent = `${ersparnis} % sparen`;
      b.append(marke);
    }
    b.addEventListener("click", () => { aboTakt = takt; aboStufenZeigen(); });
    box.append(b);
  }
}

function aboStufenZeigen() {
  aboTaktZeigen();
  const box = $("aboStufen");
  box.innerHTML = "";
  for (const s of ABO_STUFEN) {
    const p = aboPreis(s, aboTakt);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "abo-stufe";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(s.id === aboWahl));
    const name = document.createElement("b");
    name.textContent = s.name;
    const preis = document.createElement("span");
    preis.textContent = `${p.preis} ${p.zeitraum}`;
    b.append(name, preis);
    if (p.zusatz) {
      const zusatz = document.createElement("small");
      zusatz.textContent = p.zusatz;
      b.append(zusatz);
    }
    b.addEventListener("click", () => { aboWahl = s.id; aboStufenZeigen(); });
    box.append(b);
  }
  const s = ABO_STUFEN.find((x) => x.id === aboWahl);
  const haken = $("aboHaken");
  haken.innerHTML = "";
  for (const p of s.punkte) {
    const li = document.createElement("li");
    li.textContent = p;
    haken.append(li);
  }
  const p = aboPreis(s, aboTakt);
  const link = aboLink(aboWahl, store.getSettings().kontoId, KONFIG, istNativ(), aboTakt);
  $("aboKaufen").textContent = aboAnlassJetzt?.testphase ? `${aboAnlassJetzt.knopf}, danach ${p.preis} ${p.zeitraum}` : `${s.name} holen, ${p.preis} ${p.zeitraum}`;
  $("aboKaufen").hidden = !link && !(istNativ() && KONFIG.chatUrl);
  $("aboHinweis").textContent = aboAnlassJetzt?.testphase
    ? `Die ersten 7 Tage kosten nichts. Ab Tag 8 ${p.preis} ${p.zeitraum}, bis Tag 7 kostenlos kündbar${istNativ() ? " in den Einstellungen deiner Apple ID" : " über den Link in der Bestätigungsmail"}.`
    : istNativ()
    ? "Abgerechnet über deine Apple ID, kündbar in deren Einstellungen."
    : aboTakt === "jahr"
      ? "Einmal im Jahr abgerechnet. Das Kontingent an Nachrichten gilt je Monat."
      : "Monatlich abgerechnet, jederzeit kündbar.";
}

let aboAnlassJetzt = null;
let nachAbo = null;

function aboOeffnen(anlass = null) {
  aboAnlassJetzt = anlass;
  aboWahl = anlass?.empfohlen || "plus";
  $("aboMarke").textContent = anlass?.marke || "Plus und Pro";
  $("aboTitel").textContent = anlass?.titel || "Deinen Coach freischalten";
  $("aboSpaeter").textContent = "Später";
  // Gesperrt: kein Kreuz, kein Später, kein Tipp daneben. Weg geht es nur
  // über ein Abo.
  $("aboBlatt").classList.toggle("gesperrt", Boolean(anlass?.gesperrt));
  $("aboSperrLinks").hidden = !anlass?.gesperrt;
  $("aboWiederherstellen").hidden = !(anlass?.gesperrt && (istNativ() || KONFIG.chatUrl));
  $("aboText").textContent = anlass?.text || "Mit Abo denkt daevo mit: Fotos auswerten, deinen Tag planen, mit dir reden.";
  aboStufenZeigen();
  aboMerken(anlass?.merken);
  $("aboBlatt").hidden = false;
  $("aboBlatt").querySelector(".abo-innen").scrollTop = 0;
  document.body.classList.add("blatt-offen");
}

function aboSchliessen() {
  if (gesperrtJetzt) return;
  $("aboBlatt").hidden = true;
  document.body.classList.remove("blatt-offen");
  aboAnlassJetzt = null;
  const weiter = nachAbo;
  nachAbo = null;
  weiter?.();
}

/** Wartet, bis das Abo Fenster zu ist. Die Einführung kommt danach, nicht darüber. */
function aboFensterZu() {
  if ($("aboBlatt").hidden) return Promise.resolve();
  return new Promise((r) => { nachAbo = r; });
}

$("aboSchliessen").addEventListener("click", aboSchliessen);
$("aboSpaeter").addEventListener("click", aboSchliessen);
$("aboBlatt").addEventListener("click", (event) => { if (event.target === $("aboBlatt")) aboSchliessen(); });

/* ---------- Die Sperre ---------- */

var gesperrtJetzt = false;

const SPERR_ANLASS = {
  frei: { marke: "Testphase vorbei", titel: "Mach mit daevo weiter", text: "Deine Testphase ist zu Ende. Mit Plus oder Pro geht es genau dort weiter, wo du aufgehört hast. Deine Daten bleiben erhalten." },
  start: { marke: "7 Tage kostenlos", titel: "Starte deine Testphase", text: "Du schließt das Abo jetzt ab und zahlst erst ab Tag 8. Kündigst du bis Tag 7, kostet es nichts.", knopf: "7 Tage gratis testen", testphase: true },
  abgelaufen: { marke: "Abo abgelaufen", titel: "Dein Abo ist abgelaufen", text: "Mit Plus oder Pro geht es genau dort weiter, wo du aufgehört hast. Deine Daten bleiben erhalten." },
};

function sperreSetzen(sperre) {
  const aktiv = Boolean(sperre);
  // Alles ausser dem Abo Fenster wird für Tastatur und Hilfstechnik stillgelegt.
  for (const kind of $("app").children) if (kind.id !== "aboBlatt") kind.inert = aktiv;
  if (aktiv) {
    gesperrtJetzt = false;
    aboOeffnen({ ...SPERR_ANLASS[sperre.grund], gesperrt: true });
    gesperrtJetzt = true;
  } else if (gesperrtJetzt) {
    gesperrtJetzt = false;
    aboSchliessen();
  }
}

/** Fragt den Server und sperrt oder gibt frei. Ohne Netz gilt der letzte Stand. */
async function sperrePruefen(stand) {
  if (!KONFIG.chatUrl) return null;
  const s = stand ?? await kontoStand();
  sperreSetzen(sperreFuer(s, store.getSettings(), todayIso()));
  return s;
}

$("aboWiederherstellen").addEventListener("click", async () => {
  const knopf = $("aboWiederherstellen");
  knopf.disabled = true;
  if (istNativ()) await abosAbgleichen().catch(() => null);
  const s = await kontoStand();
  knopf.disabled = false;
  if (s?.fehler) { toast(s.fehler, 5000); return; }
  await sperrePruefen(s);
  if (gesperrtJetzt) toast("Zu diesem Konto gehört kein aktives Abo.", 5000);
  else { toast("Abo gefunden. Willkommen zurück."); kontoStand().then(aboLeisteZeigen).catch(() => {}); }
});
$("aboDatenSichern").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daevo-sicherung-${todayIso()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("aboKontoLoeschen").addEventListener("click", () => $("btnReset").click());
$("btnAboZeigen").addEventListener("click", () => aboOeffnen());
$("aboKaufen").addEventListener("click", async () => {
  if (istNativ()) {
    const knopf = $("aboKaufen");
    knopf.disabled = true;
    const r = await kaufenNativ(aboWahl, aboTakt).catch((e) => ({ fehler: e.message }));
    knopf.disabled = false;
    if (r.abgebrochen) return;
    if (r.fehler) { toast(r.fehler, 6000); return; }
    if (r.wartet) toast("Der Kauf wartet auf eine Freigabe, etwa durch die Familienfreigabe.", 6000);
    else toast(aboAnlassJetzt?.testphase ? "Testphase läuft. Viel Spaß mit daevo." : "Abo aktiv.");
    // Gesperrt schliesst das Fenster nur der Server: erst wenn er das Abo
    // kennt, geht die App auf.
    if (gesperrtJetzt) await sperrePruefen(); else aboSchliessen();
    kontoStand().then(aboLeisteZeigen).catch(() => {});
    return;
  }
  const link = aboLink(aboWahl, store.getSettings().kontoId, KONFIG, istNativ(), aboTakt);
  if (link) window.open(link, "_blank", "noopener");
  aboSchliessen();
});

/**
 * Beim Start einmal nachsehen, ob die Testphase endet oder das Kontingent
 * knapp wird. Nicht während der Einführung: zwei Ebenen über der App
 * zugleich, und keine von beiden wird gelesen.
 */
let aboLeisteEmpfohlen = null;

function aboLeisteZeigen(stand) {
  const zeile = aboLeiste(stand, todayIso());
  $("aboLeiste").hidden = !zeile;
  if (!zeile) return;
  $("aboLeisteText").textContent = zeile.text;
  $("aboLeisteKnopf").textContent = zeile.knopf;
  aboLeisteEmpfohlen = zeile.empfohlen || null;
}

$("aboLeiste").addEventListener("click", () => aboOeffnen(aboLeisteEmpfohlen ? { empfohlen: aboLeisteEmpfohlen } : null));

async function aboBeimStart() {
  if (!KONFIG.chatUrl) return;
  // Ein Abo, das im App Store gilt und dem Server fehlt, kommt zuerst an.
  if (istNativ()) await abosAbgleichen().catch(() => null);
  const stand = await kontoStand();
  aboLeisteZeigen(stand);
  // Ohne Testphase und ohne Abo ist die App zu. Das geht allem anderen vor.
  await sperrePruefen(stand);
  if (gesperrtJetzt) return;
  // Startet die Testphase erst mit dem Abo, kommt das Fenster direkt nach
  // dem Fragebogen und vor der Einführung.
  const start = startAnlass(stand, store.getSettings().aboHinweise);
  if (start) { aboOeffnen(start); return; }
  const anlass = aboAnlass(stand, store.getSettings().aboHinweise, todayIso());
  if (!anlass) return;
  if (!store.getSettings().einfuehrungGesehen) return;
  // Der Morgen Check-in geht vor. Zwei Blätter übereinander am Morgen, und
  // das zweite ist ein Verkaufsfenster.
  setTimeout(() => { if ($("morgenBlatt").hidden) aboOeffnen(anlass); }, 1500);
}

async function renderPush() {
  const settings = store.getSettings();
  $("e-pushWorker").value = settings.pushWorker || "";
  $("e-pushWort").value = settings.pushWort || "";
  const lage = pushLage();
  const abo = await pushAbo().catch(() => null);

  const zeilen = [];
  if (lage.nativ) {
    zeilen.push(NATIV_PUSH);
  } else if (!lage.unterstuetzt) {
    zeilen.push("Dieser Browser kann kein Web Push.");
  } else if (lage.apple && !lage.installiert) {
    zeilen.push("Auf dem iPhone geht Push nur aus der installierten App. Teilen, Zum Home Bildschirm, dann von dort starten.");
  } else if (abo) {
    zeilen.push("Dieses Gerät ist angemeldet.");
  } else if (lage.erlaubnis === "denied") {
    zeilen.push("Benachrichtigungen sind abgelehnt. Das lässt sich nur in den Einstellungen des Geräts zurücknehmen.");
  } else if (!settings.pushWorker) {
    zeilen.push("Trag die Adresse deines Push Workers ein, dann kannst du einschalten.");
  } else {
    zeilen.push("Noch nicht angemeldet.");
  }
  $("e-pushhilfe").textContent = zeilen.join(" ");
  $("btnPushAus").hidden = !abo;
  $("btnPushProbe").hidden = !abo || !settings.pushWort;
}

function pushEinstellungen() {
  const settings = store.getSettings();
  return { worker: settings.pushWorker || "", wort: settings.pushWort || "" };
}

function pushFelderSichern() {
  store.setSettings({
    ...store.getSettings(),
    pushWorker: $("e-pushWorker").value.trim(),
    pushWort: $("e-pushWort").value.trim(),
  });
}

for (const id of ["e-pushWorker", "e-pushWort"]) {
  $(id).addEventListener("change", () => { pushFelderSichern(); renderPush(); });
}

$("btnPushAn").addEventListener("click", async () => {
  pushFelderSichern();
  try {
    const { neu } = await pushAnmelden(pushEinstellungen());
    await renderPush();
    toast(neu ? "Angemeldet" : "War schon angemeldet");
  } catch (fehler) {
    $("e-pushhilfe").textContent = fehler.message;
    toast("Hat nicht geklappt");
  }
});

$("btnPushAus").addEventListener("click", async () => {
  await pushAbmelden(pushEinstellungen()).catch(() => false);
  await renderPush();
  toast("Abgemeldet");
});

$("btnPushProbe").addEventListener("click", async () => {
  try {
    const ergebnis = await pushProbe({ ...pushEinstellungen(), art: "trinken" });
    toast(`An ${ergebnis.zugestellt} von ${ergebnis.geraete} Geräten`);
  } catch (fehler) {
    $("e-pushhilfe").textContent = fehler.message;
    toast("Probe fehlgeschlagen");
  }
});

/* ---------- Ein Impuls kommt herein ---------- */

/**
 * Welche Frage gerade offen ist.
 *
 * Antwortet der Nutzer darauf mit einer blossen Zahl, wird sie hier
 * ausgewertet und nicht an das Modell geschickt. Eine Zahl von 1 bis 10 ist
 * eindeutig, und die Bewertung kommt aus dem Rechenkern.
 */
let offeneFrage = null;

function impulsOeffnen(daten, { still = false } = {}) {
  const art = daten?.art;
  if (!art) return;
  if (art === "morgen") { morgen.oeffnen(); return; }
  if (art === "runterfahren") { abend.oeffnen(); return; }
  if (art === "nachfrage") { morgen.nachfrage(); return; }
  if (art === "luecke") { lueckeFrageOeffnen(); return; }
  if (art === "satzpause") { training.fortsetzen(); return; }
  // Seiten statt Chat, wo es eine Seite gibt, siehe MITTEILUNG_ZIEL.
  const ziel = MITTEILUNG_ZIEL[art];
  if (ziel && ziel.ansicht !== "assistant") {
    if (ziel.ansicht === "heute") heuteTag = todayIso();
    showView(ziel.ansicht);
    if (ziel.aktion === "erfassen") erfassenOeffnen({ currentTarget: $("btnErfassenHeute") });
    else if (ziel.aktion === "wasser") setTimeout(() => $("wBar")?.closest(".balken-zeile")?.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
    else if (ziel.aktion === "rueckblick") { renderBericht(); $("berichtRueckblick").open = true; setTimeout(rueckblickShow, 260); }
    else if (ziel.aktion === "morgen") {
      document.querySelector('#kalBriefingWahl [data-briefing="abend"]')?.click();
      document.querySelector(`#kalTage [data-kal-tag="${folgetag(todayIso())}"]`)?.click();
      // Abends kommt der Blick auf morgen als Präsentation, darunter liegt der Kalender.
      setTimeout(() => briefingShowOeffnen("abend"), 260);
    }
    return;
  }
  if (!ziel && !impulseFuerTag(todayIso()).some((i) => i.art === art)) return;
  showView("assistant");
  const impuls = impulseFuerTag(todayIso()).find((i) => i.art === art);
  if (!impuls) return;

  const chat = store.getChat();
  const letzte = chat[chat.length - 1];
  // Zweimal auf dieselbe Nachricht getippt heisst nicht, dass die Frage
  // zweimal im Verlauf stehen soll.
  if (!(letzte?.role === "assistant" && letzte.text === impuls.text)) {
    chat.push({ role: "assistant", text: impuls.text, at: new Date().toISOString() });
    store.setChat(chat);
    renderTranscript();
  }
  offeneFrage = impuls.frage ? art : null;
  if (!still) $("chatInput").focus();
}

/** Eine blosse Zahl von 1 bis 10, sonst null. */
function nurZahl(text) {
  const treffer = text.trim().match(/^([1-9]|10)([.,]0)?$/);
  return treffer ? Number(treffer[1]) : null;
}

// Der Service Worker meldet den Tipp auf eine Benachrichtigung, wenn die App
// schon offen ist. Ein zweites Fenster wäre die Alternative, und das empfinden
// Nutzer als kaputt.
navigator.serviceWorker?.addEventListener("message", (event) => {
  if (event.data?.typ === "impuls") impulsOeffnen(event.data.daten);
  // Eine Antwort, die der Nutzer direkt in der Benachrichtigung gegeben hat,
  // während die App offen war. Sie wird sofort verarbeitet statt erst beim
  // nächsten Start: sonst sieht der Nutzer seine eigene Antwort nicht.
  if (event.data?.typ === "antwort") {
    const satz = antwortVerarbeiten(event.data.daten, { store, brain });
    if (satz) { toast("Antwort übernommen"); refreshAll(); }
  }
});

/* ---------- Die Trainingslücke ---------- */

/**
 * Prüft die Lücke und beauftragt den Worker mit der Frage.
 *
 * Zwei Teile, die getrennt scheitern dürfen. Die Antworten werden immer
 * abgeholt, auch wenn kein Worker eingerichtet ist: sie liegen schon da, und
 * eine Antwort zu verlieren, weil eine Adresse fehlt, wäre absurd.
 *
 * Läuft still. Ohne Push Abo passiert nichts, und wer trainiert hat, soll von
 * dieser Funktion nie etwas merken.
 */
async function lueckePruefen() {
  for (const eintrag of await antwortenAbholen()) {
    const satz = antwortVerarbeiten(eintrag, { store, brain });
    if (satz) toast("Antwort übernommen");
  }

  const luecke = lueckeAusSpeicher(store);
  // Die Schieflage geht nicht mehr als Mitteilung raus. Sie misst Zeit, die
  // eingetragen ist, und ein leerer Bereich heisst meist nur, dass nichts
  // eingetragen wurde. Eine Regel des Nutzers: daevo hakt nur beim Training
  // nach, wenn nirgends eins zu sehen ist. Auf der Balance Seite steht sie
  // weiter.
  const schieflage = null;
  if (!luecke) return;

  const worker = store.getSettings().pushWorker || KONFIG.pushUrl || "";
  if (!worker || !navigator.serviceWorker) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const abo = await reg.pushManager?.getSubscription();
    if (!abo) return;
    // Beide nacheinander und nicht parallel. Zwei Mitteilungen, die im selben
    // Moment eintreffen, liest der Nutzer als eine und wischt beide weg.
    if (luecke) await lueckeMelden({ store, worker, endpoint: abo.endpoint, luecke });
    if (schieflage) await schieflageMelden({ store, worker, endpoint: abo.endpoint, schieflage });
  } catch {
    // Kein Netz, kein Abo, kein Worker. Beim nächsten Öffnen wieder, denn
    // der Tag der Meldung wird erst gesetzt, wenn der Worker angenommen hat.
  }
}

/**
 * Stellt die Frage im Chat.
 *
 * Für den Weg über den Tipp auf die Nachricht statt auf einen ihrer Knöpfe.
 * Die Frage steht damit im Verlauf, und die Antwort geht als normale
 * Nachricht an den Coach, der sie im Zusammenhang beantwortet.
 */
function lueckeFrageOeffnen() {
  const luecke = lueckeAusSpeicher(store);
  if (!luecke) return;
  showView("assistant");
  const chat = store.getChat();
  const letzte = chat[chat.length - 1];
  const text = `${luecke.titel}. ${luecke.text}`;
  if (!(letzte?.role === "assistant" && letzte.text === text)) {
    chat.push({ role: "assistant", text, at: new Date().toISOString() });
    store.setChat(chat);
    renderTranscript();
  }
  $("chatInput").focus();
}

function stimmProbe() {
  const e = store.getSettings();
  // Ein Satz mit Zahl, Uhrzeit und Umgangston. An einer nackten Ansage wie
  // "Test" hoert man nicht, ob eine Stimme taugt.
  speak(
    "Alles klar, ich hab dir 208 Kilokalorien eingetragen. Dein Training steht um 18:30, "
    + "bis dahin hast du noch gut Zeit für was Ordentliches zu essen.",
    { enabled: true, stimme: e.stimme, tempo: e.sprechtempo },
  );
}

// Die Stimmliste ist beim ersten Aufruf oft leer und wird nachgereicht.
if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener?.("voiceschanged", () => {
    const profilView = document.querySelector('[data-view="profil"]');
    if (profilView && !profilView.hidden) renderStimmwahl();
  });
}
// In der iPhone App meldet voice.js, wenn die Liste nach der Rückkehr aus den
// Einstellungen neu gelesen ist.
window.addEventListener("daevo-stimmen", () => {
  const profilView = document.querySelector('[data-view="profil"]');
  if (profilView && !profilView.hidden) renderStimmwahl();
});

$("btnAddSession").addEventListener("click", async () => {
  const minutes = Number($("t-min").value);
  if (!(minutes >= 5 && minutes <= 480)) { toast("Dauer muss zwischen 5 und 480 Minuten liegen."); return; }
  const neu = { type: $("t-type").value, minutes, weekday: Number($("t-day").value), startsAt: $("t-time").value };
  const i = sessionBearbeitet;
  const alt = profile.sessions?.[i];
  if (!alt) {
    profile.sessions = [...(profile.sessions || []), neu].slice(0, 21);
    store.setProfile(profile);
    renderSessions();
    toast("Einheit hinzugefügt");
    kalenderStill();
    return;
  }
  profile.sessions = profile.sessions.map((s, k) => (k === i ? neu : s));
  store.setProfile(profile);
  sessionFormular(-1);
  // Was daevo für diese Einheit schon in den Kalender geschrieben hat,
  // wandert mit. Sonst stünde im Profil Dienstag und im Kalender Montag.
  const { einheitImKalenderAnpassen } = await import("./kalender-schreiben.js");
  const r = await einheitImKalenderAnpassen(alt, neu);
  toast(r.anzahl
    ? `Geändert, ${r.anzahl} ${r.anzahl === 1 ? "Termin" : "Termine"} im Kalender mitverschoben`
    : "Geändert", 4000);
  kalenderStill();
  refreshAll();
});

$("btnDelSession").addEventListener("click", () => {
  if (sessionBearbeitet < 0) return;
  profile.sessions.splice(sessionBearbeitet, 1);
  store.setProfile(profile);
  sessionFormular(-1);
  toast("Einheit entfernt");
  kalenderStill();
});

$("sessionList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-edit]");
  if (!button) return;
  const i = Number(button.dataset.edit);
  sessionFormular(sessionBearbeitet === i ? -1 : i);
  if (sessionBearbeitet === i) $("t-day").scrollIntoView({ behavior: "smooth", block: "center" });
});

/**
 * Eigene Anweisungen des Nutzers.
 *
 * Sie landen im Systemprompt des Assistenten. Die Obergrenze liegt bei 4000
 * Zeichen, weil jede Nachricht sie mitschickt und der Prompt sonst mehr kostet
 * als die eigentliche Frage.
 */
const ANWEISUNGEN_MAX = 4000;

/**
 * Startpunkt für eigene Anweisungen.
 *
 * Bewusst ohne persönliche Angaben. Was daevo über den Nutzer weiss, gehört
 * ins Gedächtnis und nicht in eine Vorlage, die jeder bekommt. Hier steht nur,
 * wie geredet werden soll.
 */
const ANWEISUNGEN_VORLAGE = [
  "Sag mir die Wahrheit, auch wenn sie unangenehm ist. Beschönige nichts.",
  "Sei ehrlich und realistisch, nicht schmeichelnd. Lob nur, wenn Zahlen es hergeben.",
  "Keine Floskeln, keine Einleitungen, keine Zusammenfassungen am Ende.",
  "Erfinde nichts. Bist du unsicher, sag es. Zeig mir, wie du auf eine Zahl kommst.",
  "Bei fachlichen Fragen will ich den Mechanismus und die Grössenordnung, nicht nur die Regel.",
  "Bei persönlichen Themen: erst verstehen, dann Vorschläge. Geh unter die Oberfläche,",
  "zeig mir das Muster dahinter, und gib mir am Ende genau eine Sache, die ich heute anders mache.",
  "Sag mir, wenn ich mir etwas vormache.",
  "Frag nach, wenn eine Antwort nicht zu dem passt, was du über mich weißt.",
].join("\n");

function zeigeAnweisungsLaenge() {
  const laenge = $("anweisungen").value.length;
  $("anweisungenNote").textContent = laenge === 0
    ? "Noch nichts hinterlegt. daevo nutzt dann nur seine eingebaute Haltung."
    : `${laenge} von ${ANWEISUNGEN_MAX} Zeichen. Wird bei jeder Nachricht mitgelesen.`;
}

$("anweisungen").addEventListener("input", zeigeAnweisungsLaenge);
$("btnAnweisungen").addEventListener("click", () => {
  const text = $("anweisungen").value.slice(0, ANWEISUNGEN_MAX);
  $("anweisungen").value = text;
  store.setSettings({ ...store.getSettings(), anweisungen: text });
  zeigeAnweisungsLaenge();
  toast(text ? "daevo liest das ab jetzt mit" : "Anweisungen gelöscht");
});

$("btnAnweisungenVorlage").addEventListener("click", () => {
  if ($("anweisungen").value.trim() && !confirm("Das überschreibt, was da steht. Weiter?")) return;
  $("anweisungen").value = ANWEISUNGEN_VORLAGE;
  zeigeAnweisungsLaenge();
  toast("Vorlage eingesetzt. Ändere sie und speichere dann.");
});

$("btnPruefeKey").addEventListener("click", async () => {
  const knopf = $("btnPruefeKey");
  knopf.disabled = true;
  $("keyStatus").textContent = "Prüfe.";
  try {
    const e = await schluesselPruefen();
    $("keyStatus").textContent = e.ok ? `In Ordnung. ${e.meldung}` : e.meldung;
  } catch (error) {
    $("keyStatus").textContent = `Prüfung nicht möglich: ${error.message}`;
  } finally {
    knopf.disabled = false;
  }
});

$("btnSaveKey").addEventListener("click", () => {
  const key = $("apiKey").value.trim();
  const settings = store.getSettings();
  store.setSettings({ ...settings, apiKey: key });
  toast(key ? "Schlüssel gespeichert. daevo denkt jetzt selbst." : "Schlüssel entfernt. Regelbetrieb aktiv.");
  $("keyStatus").textContent = key ? "Gespeichert. Tipp auf Schlüssel prüfen, um zu sehen, ob er wirklich geht." : "";
});

/* ---------- Tag und Nacht ---------- */

/**
 * "system" bedeutet: kein Attribut setzen, dann entscheidet
 * prefers-color-scheme im Stylesheet. Nur eine ausdrueckliche Wahl stempelt
 * data-theme an die Wurzel.
 */
function applyTheme(wahl) {
  if (wahl === "light" || wahl === "dark") document.documentElement.dataset.theme = wahl;
  else delete document.documentElement.dataset.theme;
  orb?.refreshTheme();
}

// Auch ohne eigene Wahl muss der Kreis umschalten, wenn das Geraet wechselt.
globalThis.matchMedia?.("(prefers-color-scheme: light)").addEventListener?.("change", () => orb?.refreshTheme());

$("themeSel").addEventListener("change", (e) => {
  const wahl = e.target.value;
  applyTheme(wahl);
  store.setSettings({ ...store.getSettings(), theme: wahl });
});

function saveOptions() {
  const settings = store.getSettings();
  store.setSettings({ ...settings, voice: options });
}
$("optSpeak").addEventListener("change", (e) => {
  options.speak = e.target.checked;
  $("btnSpeaker").setAttribute("aria-pressed", String(options.speak));
  saveOptions();
});
$("optHandsFree").addEventListener("change", (e) => {
  options.handsFree = e.target.checked;
  saveOptions();
  if (!options.handsFree && listener) listener.handsFree = false;
});

/* ---------- Sicherung ---------- */

/**
 * Alles in einen Text, und aus einem Text wieder zurück.
 *
 * Auf dem iPhone liegt der Speicher einer installierten App getrennt von
 * Safari. Wer das Symbol vom Home Bildschirm löscht, verliert damit alles,
 * was er eingestellt hat. Ein Download hilft dort nur bedingt: aus einer
 * installierten App heraus landet die Datei je nach Version nirgends
 * Sichtbarem. Ein Text, den man sich selbst schickt, kommt immer an.
 */
$("btnSicherung").addEventListener("click", () => {
  const text = JSON.stringify(store.exportAll());
  $("sicherungText").value = text;
  $("sicherungFeld").hidden = false;
  const daten = store.exportAll();
  const tage = Object.keys(daten.days || {}).length;
  $("sicherungHinweis").textContent =
    `Gesichert: Profil, Einstellungen, ${tage} Tage, ${(daten.gespraeche || []).length} Gespräche, `
    + `${(daten.memories || []).length} Notizen. Rund ${Math.round(text.length / 1024)} Kilobyte.`;
});

$("btnSicherungKopieren").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("sicherungText").value);
    toast("Kopiert. Schick ihn dir selbst zu.");
  } catch {
    // Ohne Erlaubnis für die Zwischenablage bleibt das Markieren von Hand.
    $("sicherungText").select();
    toast("Markiert. Jetzt selbst kopieren.");
  }
});

$("btnExport").addEventListener("click", () => {
  // Mit Angabe der Kodierung. Ohne sie liest iOS die Datei als Latin-1, und
  // beim Kopieren daraus kommt jeder Umlaut doppelt kodiert zurück.
  const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `daevo-sicherung-${todayIso()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("btnWiederherstellen").addEventListener("click", () => {
  $("wiederherstellenFeld").hidden = !$("wiederherstellenFeld").hidden;
  if (!$("wiederherstellenFeld").hidden) $("wiederherstellenText").focus();
});

$("btnWiederherstellenStart").addEventListener("click", () => {
  // Eine Sicherung, die unterwegs falsch gelesen wurde, kommt sonst mit
  // "Ã¤" statt "ä" in jede Notiz.
  const roh = kodierungReparieren($("wiederherstellenText").value.trim());
  if (!roh) { $("sicherungHinweis").textContent = "Da steht nichts drin."; return; }

  let daten;
  try {
    daten = JSON.parse(roh);
  } catch {
    $("sicherungHinweis").textContent =
      "Das ist kein vollständiger Sicherungstext. Er beginnt mit einer geschweiften Klammer und endet mit einer. "
      + "Beim Kopieren aus einer Nachricht fehlt oft das Ende.";
    return;
  }

  try {
    const b = store.importAll(daten);
    const teile = [];
    if (b.profil) teile.push("Profil");
    if (b.einstellungen) teile.push("Einstellungen");
    if (b.tage) teile.push(`${b.tage} Tage`);
    if (b.gespraeche) teile.push(`${b.gespraeche} Gespräche`);
    if (b.notizen) teile.push(`${b.notizen} Notizen`);
    $("sicherungHinweis").textContent = `Eingespielt: ${teile.join(", ")}. Die App lädt gleich neu.`;
    // Neu laden, weil Profil und Einstellungen überall hängen. Alles einzeln
    // nachzuziehen wäre eine Fehlerquelle bei jeder künftigen Ansicht.
    setTimeout(() => location.reload(), 900);
  } catch (fehler) {
    $("sicherungHinweis").textContent = fehler.message;
  }
});

$("btnReset").addEventListener("click", async () => {
  if (!confirm("Wirklich dein Konto und alle Daten auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.")) return;
  // Erst der Server, dann das Gerät. Andersherum wäre der Schlüssel weg, und
  // das Konto bliebe auf dem Server liegen, ohne dass es jemand löschen kann.
  const server = await kontoLoeschen();
  if (server && !server.ok
    && !confirm(`${server.fehler} Trotzdem alles auf diesem Gerät löschen? Dein Konto auf dem Server bleibt dann, bis du an die Adresse im Impressum schreibst.`)) return;
  store.clearAll();
  location.reload();
});

/* ---------- Einwilligung und Rechtstexte ---------- */

let kiWartet = null;

/**
 * Ist die KI erlaubt? Steht die Frage noch offen, öffnet sich das Blatt, und
 * die Antwort kommt erst nach dem Tipp. Nach einem Nein fragt die App nicht
 * wieder, das geht nur über das Profil.
 */
function kiFreigabe() {
  const s = store.getSettings();
  if (kiErlaubt(s, KONFIG)) return Promise.resolve(true);
  if (!einwilligungOffen(s, KONFIG)) return Promise.resolve(false);
  return new Promise((resolve) => {
    kiWartet = resolve;
    $("kiBlatt").hidden = false;
    document.body.classList.add("blatt-offen");
  });
}

function kiEntscheiden(ja) {
  store.setSettings(einwilligungSetzen(store.getSettings(), ja));
  $("kiBlatt").hidden = true;
  if ($("rechtBlatt").hidden) document.body.classList.remove("blatt-offen");
  kiStandZeigen();
  const warten = kiWartet;
  kiWartet = null;
  warten?.(ja);
}

function kiStandZeigen() {
  const s = store.getSettings();
  $("kiStand").textContent = einwilligungText(s, KONFIG);
  const gefragt = Boolean(KONFIG.chatUrl);
  $("btnKiEinwilligung").hidden = !gefragt;
  $("btnKiEinwilligung").textContent = kiErlaubt(s, KONFIG) ? "Einwilligung widerrufen" : "KI erlauben";
}

$("kiJa").addEventListener("click", () => kiEntscheiden(true));
$("kiNein").addEventListener("click", () => kiEntscheiden(false));
$("btnKiEinwilligung").addEventListener("click", () => {
  const erlaubt = kiErlaubt(store.getSettings(), KONFIG);
  if (erlaubt && !confirm("Einwilligung widerrufen? Danach antwortet daevo nur noch mit dem, was ohne KI geht.")) return;
  if (!erlaubt) {
    // Erlauben geht über dasselbe Blatt wie beim ersten Mal, damit niemand
    // zustimmt, ohne gelesen zu haben, wozu.
    $("kiBlatt").hidden = false;
    document.body.classList.add("blatt-offen");
    return;
  }
  store.setSettings(einwilligungSetzen(store.getSettings(), false));
  kiStandZeigen();
  toast("Widerrufen. Ab jetzt geht nichts mehr an die KI.");
});

const RECHT_TITEL = { datenschutz: "Datenschutz", nutzungsbedingungen: "Nutzungsbedingungen", impressum: "Impressum", bildnachweis: "Bildnachweis" };

function rechtOeffnen(seite) {
  $("rechtTitel").textContent = RECHT_TITEL[seite] || "Rechtliches";
  $("rechtRahmen").src = `rechtliches/${seite}.html`;
  $("rechtBlatt").hidden = false;
  document.body.classList.add("blatt-offen");
}

function rechtSchliessen() {
  $("rechtBlatt").hidden = true;
  if ($("kiBlatt").hidden) document.body.classList.remove("blatt-offen");
}

document.addEventListener("click", (event) => {
  const knopf = event.target.closest?.("[data-recht]");
  if (!knopf) return;
  event.preventDefault();
  rechtOeffnen(knopf.dataset.recht);
});
$("rechtSchliessen").addEventListener("click", rechtSchliessen);
kiStandZeigen();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !profile) return;
  const current = todayIso();
  // Nach Mitternacht wandert eine Seite, die auf heute stand, mit.
  if (current !== day) { if (heuteTag === day) heuteTag = current; day = current; }
  refreshAll();
  // Die Testphase endet auch, während die App im Hintergrund liegt.
  sperrePruefen().catch(() => {});
});

applyTheme(store.getSettings().theme || "system");

/**
 * Eine Sicherung einspielen, bevor der Fragebogen durch ist.
 *
 * Der Weg im Profil hilft nur, wer schon drin ist. Nach einer Neuinstallation
 * steht man im Fragebogen, und ohne diesen Knopf müsste man ihn erst
 * durchklicken, um danach im Profil die Sicherung zu suchen. Genau das soll
 * eine Sicherung ja ersparen.
 */
$("btnSetupSicherung").addEventListener("click", () => {
  const feld = $("setupSicherungFeld");
  feld.hidden = !feld.hidden;
  if (!feld.hidden) $("setupSicherungText").focus();
});

$("btnSetupSicherungStart").addEventListener("click", () => {
  const roh = kodierungReparieren($("setupSicherungText").value.trim());
  const hinweis = $("setupSicherungHinweis");
  if (!roh) { hinweis.textContent = "Da steht nichts drin."; return; }

  let daten;
  try {
    daten = JSON.parse(roh);
  } catch {
    hinweis.textContent =
      "Das ist kein vollständiger Sicherungstext. Er beginnt mit einer geschweiften Klammer und endet mit einer. "
      + "Beim Kopieren aus einer Nachricht fehlt oft das Ende.";
    return;
  }

  try {
    const b = store.importAll(daten);
    hinweis.textContent = b.profil
      ? `Eingespielt, ${b.tage} Tage. Geht gleich los.`
      : "Eingespielt, aber ohne Profil. Der Fragebogen läuft weiter.";
    setTimeout(() => location.reload(), 900);
  } catch (fehler) {
    hinweis.textContent = fehler.message;
  }
});

/**
 * Der erste Start der Fassung für Nutzer.
 *
 * Eine leere App zeigt nichts: ein Ring auf null, vier leere Balken, ein
 * Verlauf ohne Zeilen. Genau die Ansichten, die das Produkt ausmachen,
 * brauchen Vergangenheit, das Balance Board gebuchte Zeit, die Muster zehn
 * gemeinsame Tage, der Gewichtstrend vier Wiegungen über zwei Wochen.
 *
 * Deshalb kommen in der Demo vierzehn Tage einer erfundenen Person herein,
 * einmal, und nur wenn wirklich nichts da ist. Wer die Demo benutzt hat und
 * neu lädt, findet seine eigenen Eingaben wieder. Über Daten löschen im Profil
 * kommt der leere Zustand zurück, und mit ihm der Fragebogen.
 */
async function demoVorbereiten() {
  // Die iPhone App ist die Fassung für Nutzer, aber keine Demo. Wer sie
  // installiert, trägt seine eigenen Daten ein und darf keine erfundene
  // Person vorfinden.
  if (!istDemo() || istNativ() || profile) return false;
  const { beispieldaten } = await import("./beispiel.js");
  store.importAll(beispieldaten());
  profile = store.getProfile();
  return Boolean(profile);
}

demoVorbereiten().then(async (gefuellt) => {
  if (profile || gefuellt) { startApp(); return; }
  // Wer neu ist, meldet sich vor dem Fragebogen an: dann kommt ein schon
  // gekauftes Abo sofort zurück, und die Testphase gilt je Person einmal.
  await anmeldungFragen();
  new SetupFlow($("setupFlow"), { onFertig: anamneseFertig });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

/** Der Tag nach `iso`, in Ortszeit. */
function tagNach(iso) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return todayIso(d);
}


/* ---------- Apple Watch ---------- */

/**
 * Holt ab, was auf der Uhr passiert ist, und schickt danach den neuen Stand.
 * Nur in der iPhone App, und nur wenn eine Uhr gekoppelt ist. Ohne Uhr
 * kostet das einen Aufruf beim Öffnen und sonst nichts.
 */
// var und nicht let: refreshAll ruft uhrSpaeter schon beim Start, bevor
// diese Zeilen erreicht sind. Mit let wäre das ein ReferenceError, und die
// App bliebe schwarz.
// eslint-disable-next-line no-var
var uhrDa = null;
// eslint-disable-next-line no-var
var uhrLaeuft = false;
// eslint-disable-next-line no-var
var uhrNochmal = false;
async function uhrAbgleichen() {
  if (!istNativ()) return;
  // Kommt während eines Abgleichs etwas Neues, läuft danach ein zweiter.
  // Ein überlappender Lauf könnte einen Satz zweimal durch den Coach schicken.
  if (uhrLaeuft) { uhrNochmal = true; return; }
  uhrLaeuft = true;
  try {
    // Der Stand wird jedes Mal gefragt und nicht einmal beim Start gemerkt.
    // Im Betrieb kam die Uhr App nach der iPhone App aufs Gerät, beim Start
    // hiess es "keine Uhr", und vorgemerkte Sätze blieben liegen, bis die App
    // ganz neu startete. Abgeholt wird immer: was im Eingang liegt, kam von
    // einer Uhr, egal was der Stand gerade meldet.
    const st = await nativAufruf("Uhr", "stand", {});
    uhrDa = Boolean(st?.gekoppelt);
    const { ereignisse = [] } = await nativAufruf("Uhr", "abholen", {});
    if (ereignisse.length) {
      const ergebnis = uhrEreignisseAnwenden(ereignisse, { store, heute: todayIso(), neueId: newId });
      // Ein Training, das auf der Uhr läuft, läuft am iPhone mit. Eines, das
      // dort beendet wurde, ist hier gespeichert und nicht mehr offen.
      if (ergebnis.stand) training.vonAussen((e) => entwurfMitUhr(e, ergebnis.stand));
      for (const t of ergebnis.trainings) {
        training.vonUhrBeendet(t.titel, t.datum);
        trainingInDenKalender(t);
      }
      const satz = uhrMeldung(ergebnis);
      if (satz) { toast(satz, 4500); plaene.verlaufNeu?.(); }
      // Auf der Uhr abgehakt: hier wirklich abhaken, bei Todoist auch dort.
      for (const id of ergebnis.erledigt) {
        try { await aufgabeErledigen(id); } catch { /* gibt es nicht mehr oder kein Netz */ }
      }
      // Was auf der Uhr ohne iPhone besprochen wurde, steht danach im
      // Gespräch, damit der Coach beim nächsten Mal davon weiss.
      if (ergebnis.gespraech.length) {
        const chat = store.getChat();
        for (const g of ergebnis.gespraech) {
          const at = g.at || new Date().toISOString();
          chat.push({ role: "user", text: g.frage, at, quelle: "uhr" }, { role: "assistant", text: g.antwort, at, quelle: "uhr" });
        }
        store.setChat(chat);
        gespraechNachziehen();
        renderTranscript();
      }
      // Vorgemerkte Sätze laufen jetzt durch den ganzen Agenten, einer nach
      // dem anderen, als hätte er sie hier gesagt.
      for (const text of ergebnis.saetze) {
        // Läuft gerade eine Antwort, wartet der Satz, sonst verwirft send ihn.
        while (busy) await new Promise((fertig) => setTimeout(fertig, 300));
        $("assistant").classList.add("has-chat");
        await send(text);
      }
    }
    if (uhrDa) await uhrSenden();
  } catch {
    // Ohne Plugin, etwa eine ältere Hülle, oder ohne Uhr: dann eben nicht.
  } finally {
    uhrLaeuft = false;
  }
  if (uhrNochmal) { uhrNochmal = false; await uhrAbgleichen(); }
}

/**
 * Das Plugin ruft das auf, sobald etwas von der Uhr eintrifft, während daevo
 * hier vorn offen ist. Vorher kam ein Satz von der Uhr erst beim nächsten
 * Öffnen an, und wer die App schon offen hatte, wartete vergeblich.
 */
window.daevoUhrEingang = () => { uhrAbgleichen().then(() => refreshAll()); };

async function uhrSenden() {
  if (!istNativ() || !uhrDa) return;
  // Todoist zuerst, höchstens alle fünf Minuten. Sonst ging der Stand von
  // der letzten Planung an die Uhr, und was in Todoist längst abgehakt war,
  // stand dort noch als offen.
  await todoistAktualisieren().catch(() => "");
  let aufgaben = [];
  try { aufgaben = uhrAufgaben(tagesplan()); } catch { /* ohne Aufgaben eine leere Liste */ }
  const paket = uhrPaket({
    settings: store.getSettings(), zahlen: dayNumbers(), heute: todayIso(), gestrichen: trainingGestrichen(store, todayIso()), ki: uhrKiZugang(),
    termine: uhrTermine(store.getKalender().termine || []), aufgaben,
    todoistToken: String(store.getSettings().todoistToken || "").trim(),
  });
  await nativAufruf("Uhr", "senden", { paket });
}

/**
 * Eine Frage von der Uhr, während daevo hier offen ist. Das Plugin ruft diese
 * Funktion über die Web Ansicht auf. Sie läuft durch denselben Weg wie jede
 * Nachricht im Chat, mit allen Werkzeugen, und die Antwort geht zurück an
 * die Uhr. Ist gerade etwas anderes im Gange, antwortet sie sofort mit einem
 * Fehler, und die Uhr fragt selbst.
 */
globalThis.daevoUhrFrage = async (id, text) => {
  const antworten = (daten) => nativAufruf("Uhr", "antworten", { id, ...daten }).catch(() => {});
  if (busy) return antworten({ fehler: "beschaeftigt" });
  try {
    $("assistant").classList.add("has-chat");
    const vorher = store.getChat().length;
    await send(String(text || ""), { vonUhr: true });
    const neu = store.getChat().slice(vorher).filter((m) => m.role === "assistant").pop();
    await antworten(neu?.text ? { antwort: neu.text } : { fehler: "leer" });
  } catch (e) {
    await antworten({ fehler: String(e?.message || e) });
  }
};

/** Nach einer Änderung nicht sofort, sondern gebündelt: ein Tag hat viele kleine Änderungen. */
// eslint-disable-next-line no-var
var uhrTimer = 0;
function uhrSpaeter() {
  if (!istNativ() || !uhrDa) return;
  clearTimeout(uhrTimer);
  uhrTimer = setTimeout(() => uhrSenden().catch(() => {}), 1500);
}

// Ohne Profil steht noch der Fragebogen da, und refreshAll hätte keinen Tag
// zu rechnen: beim ersten Start warf das nach 2,5 Sekunden einen Fehler.
const nachUhr = () => { if (store.getProfile()) refreshAll(); };
setTimeout(() => uhrAbgleichen().then(nachUhr), 2500);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") uhrAbgleichen().then(nachUhr);
  // Beim Wechsel in den Hintergrund noch einmal der neueste Stand: danach
  // rechnet hier nichts mehr, bis die App wieder offen ist.
  else uhrSenden().catch(() => {});
});
// Offen alle fünf Minuten, auch ohne Änderung hier: Todoist und der Tag
// ändern sich nebenher, und die Uhr soll nicht auf den nächsten Tipp warten.
setInterval(() => { if (document.visibilityState === "visible") uhrSenden().catch(() => {}); }, 5 * 60_000);

// Ringe, Balken und Zahlen laufen auf ihren neuen Stand, siehe bewegung.js.
bewegungStarten();
