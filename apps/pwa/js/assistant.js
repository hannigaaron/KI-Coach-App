import {
  Agent, AnthropicProvider, Coach, addiere, buildShoppingList, cacheQuote, denktiefe, dollarText,
  einstufeAufgabe, einstufungText, ersparnis, extractGrams, NICHT_GESPEICHERT, fehlerErklaerung, hochrechnung, kopfLeeren, kopfText, leereSumme,
  mahlzeitAusFoto, modellFuerBilder, naehrwerteImNetz, produktPerBarcode, produkteSuchen, summiere, vorratAusFoto,
  todoistAbhaken, todoistAufgaben, todoistIdVon, todoistWiederOeffnen, PERSONA_TEILE,
} from "@daevo/coach";
import { essenszeitAus, foldUmlauts, wochenrueckblick, wochenbeginn, wochenschnitt, wochenschnittText, tagKurz, tagStand, rueckblickArt, periodeBeenden, periodeBeginnen, suchWoerter, symptomUmschalten, trefferWerten, zyklusText, SYMPTOME, uebungErlaubt, vorausblick, vorausblickText, vorausblickUhrzeit, tagesessen, tagesessenText, trainingAusProfil, tagesbriefing, einzeltrainingBauen, FOKUS_NAME, alternativen, planNachrechnen } from "@daevo/core";
import { trainingsTageAusQuellen } from "./luecke.js";
import { UEBUNGEN } from "./uebungen-daten.js";
import { GERAETE, uebungenFiltern } from "./uebungen.js";
import {
  MAX_EIGENE,
  planAendern,
  trainingsplanText,
  standardAenderungAus,
  erinnerungFehler,
  erinnerungVorbei,
  erinnerungZeile,
  istEinmalig,
  MAX_EINMALIG,
  tageText,
  wannText,
  MAHLZEITEN,
  artZurUhrzeit,
  empfehlungText,
  rezeptEmpfehlungen,
  abendAbschluss,
  balance,
  balanceEmpfehlung,
  balanceText,
  checkinText,
  checkinVergleich,
  doppeltText,
  ordnerFuerGespraech,
  ordnerName,
  sucheGespraeche,
  titelVon,
  bereichVon,
  buildDailyReminders,
  muster,
  musterText,
  trainingsplanAusKalender,
  widersprueche,
  widerspruchText,
  energieBefund,
  restText,
  energieBefundText,
  mittagsBefund,
  morgenBriefing,
  planText,
  priorisiere,
  restDesTages,
  tagesablauf,
  tagesablaufText,
  termineAmTag,
  termineAusIcs,
  uhrzeit as uhrzeitVon,
  wochenText,
  currentStreak,
  energyBreakdown,
  macroTargets,
  remainingBudget,
  scoreDay,
  estimateTdee,
  BEREICH_NAME,
  naehrwerteFuer,
  offeneMahlzeiten,
  mengeSetzen,
  ohneDoppelte,
  plausibelPruefen,
  plausibelText,
  portionsVorschlag,
  setzeAusnahme,
  tagesrandFuer,
  wachMinutenAm,
  wachMinutenAus,
  produktText,
  skalierbar,
  standardZumNachhaken,
  standardsStatus,
  verteileRest,
  verteilungText,
  tagesnutzung,
  suggestStandards,
  targetCorrection,
  waterTargetMl,
  weightTrend,
  belastung,
  belastungText,
  bereitschaft,
  bereitschaftText,
  bericht,
  berichtText,
  zeitplan,
  zeitplanText,
  lueckenOhne,
  wochenplan,
  wochenplanText,
  trainingAnpassen,
  anpassungText,
  letzteEinheit,
  steigerung,
  essensplanBauen,
  essensplanText,
} from "@daevo/core";
import { brain } from "./brain.js";
import { nativHolen } from "./nativ.js";
import { KONFIG, istNativ } from "./konfig.js";
import { kontoSicherstellen, kontoToken } from "./konto.js";
import { kiErlaubt } from "./einwilligung.js";
import { NACHTRAG_TAGE, tageZurueck } from "./exif.js";
import { eigeneLebensmittel, eigenerPosten, eigenesIn, lebensmittelSpeichern } from "./bibliothek.js";
import { newId, nowTime, store, todayIso } from "./storage.js";
import { bestellteEinheit } from "./vorhaben.js";

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function provider({ ohneZaehlung = false } = {}) {
  const settings = store.getSettings();
  // Steht eine eigene Adresse in der Konfiguration, läuft die Anfrage über den
  // eigenen Server. Der hält den Schlüssel als Geheimnis, im Browser liegt
  // keiner. Genau deshalb kann die Fassung für Nutzer ohne Eingabe reden.
  const ueberServer = Boolean(KONFIG.chatUrl);
  // Ohne Einwilligung geht über den Server nichts an die KI. Ein Anbieter
  // ohne Ziel meldet sich als nicht verfügbar, und der Agent nimmt den
  // Regelweg. Eine Sperre an einer einzigen Stelle statt an jedem Aufruf:
  // ein vergessener Aufruf wäre eine Übermittlung ohne Erlaubnis.
  if (ueberServer && !kiErlaubt(settings, KONFIG)) {
    return new AnthropicProvider({ model: settings.model || "claude-sonnet-5-5", onVerbrauch: zaehleVerbrauch });
  }
  return new AnthropicProvider({
    apiKey: settings.apiKey || undefined,
    baseUrl: ueberServer ? KONFIG.chatUrl : undefined,
    // Der Server zählt je Konto. Ohne Schlüssel gilt die Grenze für alle.
    kontoToken: ueberServer ? kontoToken : undefined,
    // Rückfallmodell. Welches Modell eine einzelne Nachricht wirklich
    // bekommt, entscheidet der Agent je Modus und überschreibt das hier.
    model: settings.model || "claude-sonnet-5-5",
    // Der Kopf für den Direktzugriff aus dem Browser gehört nur auf den
    // direkten Weg. Über den eigenen Server wäre er sinnlos und irreführend.
    browserAccess: !ueberServer,
    timeoutMs: 90000,
    onVerbrauch: zaehleVerbrauch,
    ohneZaehlung,
  });
}

/**
 * Wie die neue Suche von Open Food Facts erreicht wird. In der iPhone App
 * direkt über iOS, `nativHolen`, im Browser über den eigenen Worker, siehe
 * workers/push/src/produkt.ts. Ohne beides bleiben die Wege mit CORS Kopf.
 */
export function offOptionen() {
  if (istNativ()) return { fetchImpl: (url) => nativHolen(url).catch(() => fetch(url)) };
  const proxy = (KONFIG.chatUrl || "").replace(/\/+$/, "");
  return proxy ? { proxy } : {};
}

/** Höchstens so viele gemerkte Produkte. Je Produkt rund 300 Byte. */
const PRODUKTE_GRENZE = 300;

/**
 * Sucht in den schon gefundenen Produkten. Ein Treffer zählt nur, wenn alle
 * Wörter der Suche passen und die Marke stimmt: "ESN Whey" darf nicht den
 * gemerkten ESN Rice Pudding bringen.
 */
function gemerktesProdukt(suche) {
  const liste = store.getSettings().produkte || [];
  if (!liste.length) return [];
  const schluessel = suchWoerter(suche).join(" ");
  const genau = liste.find((e) => e.suche === schluessel);
  if (genau) return [{ produkt: { ...genau.produkt, quelle: "gemerkt" }, einwaende: [] }];
  const w = trefferWerten(suche, liste.map((e) => e.produkt)).find((x) => x.passung === 1 && x.markeStimmt);
  return w ? [{ produkt: { ...w.produkt, quelle: "gemerkt" }, einwaende: [] }] : [];
}

/** Ein eigenes Lebensmittel als Produkt, damit das Nachschlagen es wie jedes andere behandelt. */
function eigenesProdukt(suche) {
  const s = store.getSettings();
  const l = eigenesIn(suche, s) || eigeneLebensmittel(s).find((x) => foldUmlauts(x.name.toLowerCase()) === foldUmlauts(String(suche).toLowerCase().trim()));
  if (!l) return [];
  return [{ produkt: { barcode: `eigen-${l.id}`, name: l.name, marke: "", menge: "", per100: l.per100, portionG: l.portionG, quelle: "eigen" }, einwaende: [] }];
}

function produktMerken(suche, produkt) {
  if (produkt.quelle === "gemerkt" || produkt.quelle === "eigen") return;
  const settings = store.getSettings();
  const schluessel = suchWoerter(suche).join(" ");
  const liste = (settings.produkte || []).filter((e) => e.suche !== schluessel && e.produkt.barcode !== produkt.barcode);
  liste.unshift({ suche: schluessel, produkt, am: todayIso() });
  store.setSettings({ ...settings, produkte: liste.slice(0, PRODUKTE_GRENZE) });
}

/**
 * Setzt die eigenen Lebensmittel ein. Das Modell kennt "Omas Kuchen" nicht
 * und schätzt, der Regelweg kennt es auch nicht und lässt es weg. Was der
 * Nutzer selbst mit Werten angelegt hat, gilt deshalb vor beidem: bei einem
 * Posten mit demselben Namen werden die Werte aus der eigenen Liste
 * gerechnet, und was der Regelweg nicht zuordnen konnte, wird dort gesucht.
 */
export function mitEigenenLebensmitteln(parsed, settings) {
  if (!eigeneLebensmittel(settings).length) return parsed;
  const gramm = (text, l) => extractGrams(String(text || ""), l.portionG ?? 100)?.grams ?? l.portionG ?? 100;
  const ersetzt = [];
  const entries = parsed.entries.map((e) => {
    const l = eigenesIn(e.name, settings);
    if (!l) return e;
    ersetzt.push(l.name);
    const p = eigenerPosten(l, gramm(e.quantity, l));
    return { ...e, name: l.name, quantity: p.quantity, kcal: p.kcal, proteinG: p.proteinG, fatG: p.fatG, carbsG: p.carbsG };
  });
  const offen = [];
  for (const stueck of parsed.unresolved || []) {
    const l = eigenesIn(stueck, settings);
    if (l && !entries.some((e) => e.name === l.name)) {
      const { eigen: _e, ...p } = eigenerPosten(l, gramm(stueck, l));
      entries.push(p);
      ersetzt.push(l.name);
    } else offen.push(stueck);
  }
  if (!ersetzt.length) return parsed;
  return { ...parsed, entries, unresolved: offen, followUpQuestion: offen.length ? parsed.followUpQuestion : "" };
}

const zyklusDatum = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { day: "numeric", month: "long" });

/* ---------- Was die App verbraucht ---------- */

/**
 * Zählt jeden Modellaufruf mit.
 *
 * Ohne diese Zählung weiss niemand, ob das Zwischenspeichern greift. Ein
 * Zwischenspeicher, der still ausfällt, erzeugt keine Fehlermeldung, nur eine
 * höhere Rechnung am Monatsende.
 */
function zaehleVerbrauch(verbrauch) {
  const day = todayIso();
  const bisher = store.getDay(day).verbrauch || leereSumme();
  store.addVerbrauch(day, addiere(bisher, verbrauch));
}

/** Die Verbrauchssummen der letzten Tage, jüngster zuerst. */
export function verbrauchTage(anzahl = 30) {
  const heute = todayIso();
  const out = [];
  for (let i = 0; i < anzahl; i++) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() - i);
    const summe = store.getDay(d.toISOString().slice(0, 10)).verbrauch;
    if (summe) out.push(summe);
  }
  return out;
}

/** Alles, was die Kostenanzeige braucht. */
export function kostenUebersicht() {
  const heute = store.getDay(todayIso()).verbrauch || leereSumme();
  const tage = verbrauchTage(30);
  const gesamt = summiere(tage);
  const monat = hochrechnung(tage);
  return {
    heute,
    gesamt,
    monat,
    quote: cacheQuote(gesamt),
    gespart: ersparnis(gesamt),
    heuteText: dollarText(heute.dollar),
    gesamtText: dollarText(gesamt.dollar),
    monatText: dollarText(monat.dollarProMonat),
    gespartText: dollarText(gesamt.dollarOhneCache - gesamt.dollar),
  };
}

/* ---------- Zahlen des Tages ---------- */

/**
 * Die Plausibilitätsprüfung für einen ganzen Tag, als fertiger Satz.
 *
 * Läuft nach jedem Eintrag. Der Riegel in `ohneDoppelte` fängt den Fall ab,
 * den wir kennen: denselben Posten zweimal. Er fängt nicht ab, was aus einer
 * falsch geschätzten Menge, einer falsch gelesenen Etikettenspalte oder einem
 * Rechenfehler des Modells entsteht. Diese Prüfung sieht deshalb nicht auf die
 * Herkunft der Zahl, sondern auf das Ergebnis.
 *
 * Leer, wenn nichts auffällt. Eine Bestätigung nach jeder Mahlzeit wäre Lärm,
 * und Lärm überliest man mitsamt dem, was darin steht.
 */
export function plausibelHinweis(day = todayIso()) {
  const n = dayNumbers(day);
  const rand = tagesrandFuer(n.profile, day);
  const posten = (n.data.meals || []).flatMap((m) => m.entries || []);
  return plausibelText(plausibelPruefen({
    posten,
    zielKcal: n.targets.kcal,
    gewichtKg: n.profile.weightKg,
    zielFettG: n.targets.fatG,
    zielKohlenhydrateG: n.targets.carbsG,
    waterMl: n.totals.waterMl,
    jetzt: day === todayIso() ? nowTime() : null,
    aufstehen: rand.wakeTime,
    schlafen: rand.sleepTime,
  }));
}

/**
 * Die Schritte, mit denen das Kalorienziel rechnet.
 *
 * Der Fragebogen fragt nach einer Schätzung, und die stimmt selten. Liegen
 * aus Apple Health an mindestens vier der letzten sieben Tage Schritte vor,
 * gilt deren Schnitt. Der laufende Tag zählt nicht mit: um neun Uhr morgens
 * stehen dort 800 Schritte, und das Ziel fiele jeden Morgen ab und stiege
 * abends wieder. Vier Tage, weil ein einzelner Ausreisser sonst das Ziel der
 * ganzen Woche verschiebt.
 */
export function gemesseneSchritte(day = todayIso()) {
  const werte = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const s = store.getDay(d.toISOString().slice(0, 10)).steps;
    if (s !== null && s !== undefined && Number(s) > 0) werte.push(Number(s));
  }
  if (werte.length < 4) return null;
  return Math.round(werte.reduce((a, b) => a + b, 0) / werte.length);
}

/**
 * Das Profil, mit dem ein Tag rechnet: mit gemessenen Schritten, wo es sie
 * gibt. Eine Stelle für alle Rechnungen des Tages. Der Tagesablauf rechnete
 * vorher mit dem gespeicherten Profil, und die Mahlzeiten im Kalender
 * ergaben 2268 kcal gegen ein Tagesziel von 2312 auf Heute.
 */
export function profilFuerTag(day = todayIso()) {
  const gespeichert = store.getProfile();
  const gemessen = gemesseneSchritte(day);
  return gemessen && gespeichert ? { ...gespeichert, dailySteps: gemessen, schritteGemessen: true } : gespeichert;
}

export function dayNumbers(day = todayIso()) {
  const profile = profilFuerTag(day);
  const weekday = new Date(`${day}T12:00:00`).getDay();
  const trainingMinutes = (profile.sessions || [])
    .filter((s) => s.weekday === weekday)
    .reduce((sum, s) => sum + s.minutes, 0);
  const targets = { ...macroTargets(profile), waterMl: waterTargetMl(profile, trainingMinutes) };

  const data = store.getDay(day);
  const totals = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, waterMl: data.waterMl || 0 };
  for (const meal of data.meals) {
    for (const entry of meal.entries) {
      totals.kcal += entry.kcal;
      totals.proteinG += entry.proteinG;
      totals.fatG += entry.fatG;
      totals.carbsG += entry.carbsG;
    }
  }
  for (const key of ["kcal", "proteinG", "fatG", "carbsG"]) totals[key] = Math.round(totals[key]);

  return {
    day,
    weekday,
    trainingMinutes,
    profile,
    targets,
    totals,
    data,
    rest: remainingBudget(totals, targets),
    score: scoreDay(totals, targets),
    streak: currentStreak({
      daysWithLog: store.allDays().filter((d) => store.getDay(d).meals.length > 0),
      today: day,
    }),
  };
}

function daySummaryText(n) {
  const sessions = (n.profile.sessions || []).filter((s) => s.weekday === n.weekday);
  const training = sessions.length
    ? sessions.map((s) => `${s.startsAt} Uhr, ${s.minutes} Minuten`).join(" und ")
    : "kein Training geplant";
  return [
    // Über dem Ziel steht "drüber" und keine negative Restmenge. "offen -34 g"
    // ist kein Deutsch und keine Information.
    n.rest.kcal >= 0
      ? `Kalorien ${n.totals.kcal} von ${n.targets.kcal}, offen ${n.rest.kcal}.`
      : `Kalorien ${n.totals.kcal} von ${n.targets.kcal}, ${-n.rest.kcal} drüber.`,
    n.rest.proteinG > 0
      ? `Protein ${n.totals.proteinG} von ${n.targets.proteinG} g, offen ${n.rest.proteinG} g.`
      : `Protein ${n.totals.proteinG} von ${n.targets.proteinG} g, Ziel erreicht.`,
    `Fett ${n.totals.fatG} von ${n.targets.fatG} g, Kohlenhydrate ${n.totals.carbsG} von ${n.targets.carbsG} g.`,
    `Wasser ${n.totals.waterMl} von ${n.targets.waterMl} ml.`,
    `Mahlzeiten heute: ${n.data.meals.length}. Serie: ${n.streak} ${n.streak === 1 ? "Tag" : "Tage"}. Heute ${training}.`,
  ].join(" ");
}

const ARBEIT_LABEL = {
  sitzend: "sitzt auf der Arbeit fast nur",
  gemischt: "sitzt auf der Arbeit mal, steht mal",
  stehend: "ist auf der Arbeit überwiegend auf den Beinen",
  koerperlich: "arbeitet körperlich",
};
const FREIZEIT_LABEL = { ruhig: "in der Freizeit eher ruhig", gemischt: "in der Freizeit gemischt", aktiv: "in der Freizeit viel unterwegs" };

function profileText(profile) {
  const energy = energyBreakdown(profile);
  const ziele = macroTargets(profile);
  const goal = { fat_loss: "Fett verlieren", maintain: "Gewicht halten", lean_bulk: "Muskeln aufbauen" }[profile.goal];
  const zeilen = [
    `${profile.name || "Der Nutzer"}, ${profile.ageYears} Jahre, ${profile.heightCm} cm, ${profile.weightKg} kg, ` +
      `${profile.sex === "female" ? "weiblich" : "männlich"}.` +
      (profile.bodyFatPercent ? ` Geschätzter Körperfettanteil ${profile.bodyFatPercent} Prozent.` : ""),
    `Ziel: ${goal}.`,
    profile.tdeeOverrideKcal
      ? `Bedarf ${energy.tdeeKcal} kcal, gemessen aus dem eigenen Verlauf und nicht aus der Formel. Tagesziel ${ziele.kcal} kcal.`
      : `Bedarf ${energy.tdeeKcal} kcal, geschätzt über Mifflin-St Jeor mit Aktivitätsfaktor ${String(energy.activityFactor).replace(".", ",")}. Tagesziel ${ziele.kcal} kcal.`,
    `Makroziele: ${ziele.proteinG} g Protein, ${ziele.fatG} g Fett, ${ziele.carbsG} g Kohlenhydrate.`,
    `Etwa ${profile.dailySteps} Schritte am Tag, ${ARBEIT_LABEL[profile.occupation] || ARBEIT_LABEL.sitzend}, ` +
      `${FREIZEIT_LABEL[profile.leisure] || FREIZEIT_LABEL.gemischt}.`,
    `Steht gegen ${profile.wakeTime} auf, geht gegen ${profile.sleepTime} ins Bett.`,
  ];
  const plan = (profile.sessions || []);
  zeilen.push(
    plan.length
      ? `Trainingsplan: ${plan.map((s) => `${WEEKDAYS[s.weekday]} ${s.startsAt}, ${TYP_LABEL[s.type] || s.type}, ${s.minutes} Minuten`).join("; ")}.`
      : "Trainingsplan: keine Einheiten hinterlegt.",
  );
  return zeilen.join("\n");
}

/**
 * Dasselbe Profil in drei Zeilen, für das reine Erfassen.
 *
 * Wer "zwei Eier gegessen" schreibt, braucht keinen Trainingsplan und keine
 * Schlafenszeit im Prompt. Er braucht die Ziele, gegen die gerechnet wird.
 * Der Rest ist bezahlter Text, den niemand liest.
 */
function profilKurz(profile) {
  const ziele = macroTargets(profile);
  const goal = { fat_loss: "Fett verlieren", maintain: "Gewicht halten", lean_bulk: "Muskeln aufbauen" }[profile.goal];
  return [
    `${profile.name || "Der Nutzer"}, ${profile.ageYears} Jahre, ${profile.weightKg} kg. Ziel: ${goal}.`,
    `Tagesziel ${ziele.kcal} kcal, ${ziele.proteinG} g Protein, ${ziele.fatG} g Fett, ${ziele.carbsG} g Kohlenhydrate.`,
  ].join("\n");
}

/**
 * Was sonst noch gilt: Standards, offene Einkäufe, letzte Woche in Zahlen.
 *
 * Das steht bei jeder Nachricht im Systemprompt, damit der Assistent nicht
 * erst drei Werkzeuge aufrufen muss, um zu wissen, wie es gerade steht. Die
 * genauen Zahlen holt er trotzdem aus den Werkzeugen, bevor er sie nennt.
 */
/**
 * Die Messwerte aus Apple Health, die der Coach kennen soll: die letzte
 * Nacht mit Phasen, Ruhepuls und HRV gegen den eigenen Schnitt, VO2max und
 * Körperfett mit Datum. Ohne Vergleich sagt "HRV 42" nichts, und eine Zahl,
 * die nichts sagt, verleitet das Modell zu einer Deutung.
 */
export function koerperText(heute = todayIso()) {
  const tage = [];
  for (let i = 0; i < 28; i++) {
    const tag = new Date(Date.parse(`${heute}T00:00:00Z`) - i * 86400000).toISOString().slice(0, 10);
    tage.push({ tag, g: store.getDay(tag).gesundheit || {} });
  }
  const zahl = (v) => v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) > 0;
  const teile = [];
  const nacht = tage.slice(0, 2).find((t) => zahl(t.g.schlafMinuten));
  if (nacht) {
    const h = (m) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, "0")}`;
    const phasen = [
      zahl(nacht.g.tiefschlafMinuten) ? `davon ${h(nacht.g.tiefschlafMinuten)} Tiefschlaf` : "",
      zahl(nacht.g.remMinuten) ? `${h(nacht.g.remMinuten)} REM` : "",
    ].filter(Boolean).join(", ");
    teile.push(`Schlaf ${nacht.tag === heute ? "letzte Nacht" : "vorletzte Nacht"} ${h(nacht.g.schlafMinuten)}${phasen ? ` (${phasen})` : ""}`);
  }
  for (const [feld, name, einheit] of [["ruhepuls", "Ruhepuls", "bpm"], ["hrv", "HRV", "ms"]]) {
    const werte = tage.map((t) => t.g[feld]).filter(zahl).map(Number);
    if (!zahl(tage[0].g[feld]) && !zahl(tage[1].g[feld])) continue;
    const jetzt = Number(zahl(tage[0].g[feld]) ? tage[0].g[feld] : tage[1].g[feld]);
    const schnitt = werte.length >= 7 ? Math.round(mittelwert(werte)) : null;
    teile.push(`${name} ${Math.round(jetzt)} ${einheit}${schnitt ? `, Schnitt 28 Tage ${schnitt}` : ""}`);
  }
  for (const [feld, name, einheit] of [["vo2max", "VO2max", "ml/kg/min"], ["koerperfett", "Körperfett", "%"]]) {
    const t = tage.find((x) => zahl(x.g[feld]));
    if (t) teile.push(`${name} ${String(t.g[feld]).replace(".", ",")} ${einheit} (${t.tag})`);
  }
  return teile.length ? `Apple Health: ${teile.join(". ")}.` : "";
}

function lageText() {
  const zeilen = [];
  const status = standardsUebersicht();
  if (status.length) {
    zeilen.push("Vereinbarte Mindeststandards:");
    for (const s of status) zeilen.push(`- [${s.standard.id}] ${s.satz}`);
  }

  const liste = store.getShoppingList();
  const offen = (liste?.items || []).filter((i) => i.stand === "offen");
  if (liste) {
    zeilen.push(`Einkaufsliste: ${liste.items.length} Posten für ${liste.tage} Tage, ${offen.length} noch offen.`);
  }

  const woche = letzteTage(7);
  if (woche.length) {
    const kcal = woche.map((d) => d.totals.kcal).filter((k) => k > 0);
    const protein = woche.map((d) => d.totals.proteinG).filter((p) => p > 0);
    if (kcal.length) {
      zeilen.push(
        `Letzte sieben Tage: an ${kcal.length} Tagen erfasst, im Schnitt ${Math.round(mittelwert(kcal))} kcal ` +
        `und ${Math.round(mittelwert(protein))} g Protein.`,
      );
    }
    const einheiten = woche.reduce((sum, d) => sum + (d.data.trainings || []).length, 0);
    if (einheiten > 0) zeilen.push(`Absolvierte Trainingseinheiten in den letzten sieben Tagen: ${einheiten}.`);
  }

  const koerper = koerperText();
  if (koerper) zeilen.push(koerper);

  // Der Zyklus nur, wenn die Nutzerin ihn eingeschaltet hat. Eine Zeile reicht,
  // die Empfehlung steht darin, und der Coach soll sie nicht neu erfinden.
  const zyklusDaten = store.getSettings().zyklus;
  if (zyklusDaten?.an) zeilen.push(`Zyklus, gerechnet: ${zyklusText(zyklusDaten, todayIso(), zyklusDatum).replace(/\n/g, " ")}`);

  // Was der Kalender für heute und morgen verlangt, gerechnet. Damit spricht
  // der Coach es von selbst an, auch wenn die Frage eine andere war: wer
  // abends nach einem Rezept fragt, soll hören, dass morgen mittags keine
  // Lücke ist.
  const heuteBlick = vorausblickText(vorausblickFuer(todayIso()));
  if (heuteBlick) zeilen.push(`Heute laut Kalender, gerechnet: ${heuteBlick}`);
  const morgenBlick = vorausblickText(vorausblickFuer(tagPlusIso(todayIso(), 1)));
  if (morgenBlick) zeilen.push(`Morgen laut Kalender, gerechnet: ${morgenBlick}`);

  // Der heutige Tagesablauf, falls ein Kalender verbunden ist. Ohne das müsste
  // der Coach für jede Frage nach Zeit erst ein Werkzeug rufen, und für die
  // meisten Antworten reicht schon die Uebersicht.
  const heuteTermine = termineFuer(todayIso());
  if (heuteTermine.length > 0) {
    const a = ablaufFuer(todayIso());
    zeilen.push(
      `Heute im Kalender: ${a.termine.length} Termine mit Uhrzeit, ${a.belegtMinuten} Minuten verplant, ` +
      `${Math.round(a.auslastung * 100)} Prozent des Wachtags. ` +
      (a.fokusblock ? `Längster freier Block ${uhrzeitVon(a.fokusblock.von)} bis ${uhrzeitVon(a.fokusblock.bis)}. ` : "") +
      "Für Details tagesablauf_planen benutzen.",
    );
    for (const t of a.termine.slice(0, 8)) {
      zeilen.push(`- ${uhrzeitVon(t.von)} bis ${uhrzeitVon(t.bis)} ${t.titel}`);
    }
  }

  const trend = weightTrend(verlaufPunkte(56));
  if (trend.belastbar) {
    zeilen.push(
      `Gewichtsverlauf: ${trend.aktuellKg} kg geglättet, ${trend.kgProWoche > 0 ? "plus" : "minus"} ` +
      `${Math.abs(trend.kgProWoche).toFixed(2).replace(".", ",")} kg je Woche über ${trend.spanneTage} Tage. ` +
      "Für Details verlauf_abrufen benutzen.",
    );
  } else if (trend.messungen > 0) {
    zeilen.push(`Gewichtsverlauf: erst ${trend.messungen} Wiegungen, noch keine belastbare Richtung.`);
  } else {
    zeilen.push("Gewichtsverlauf: noch keine Wiegung. Ohne Wiegungen bleibt jede Zielkorrektur geraten.");
  }
  return zeilen.join("\n");
}

/* ---------- Verlauf über Wochen ---------- */

const TYP_LABEL = { strength: "Kraft", team_sport: "Mannschaftssport", cardio: "Ausdauer", mobility: "Mobility" };

/**
 * Trifft ein Suchtext diesen Posten.
 *
 * In beide Richtungen, und das ist der Punkt. Das Modell schickt "Milka",
 * dann steckt der Suchtext im Namen. Der Regelweg schickt den ganzen Satz,
 * dann steckt der Name im Suchtext. Ein erster Entwurf prüfte nur die erste
 * Richtung, und "das war nur ein Rippchen Milka" fand den Eintrag nie.
 *
 * Verglichen wird auf ganze Wörter ab drei Zeichen. Ein kürzeres Wort trifft
 * zufällig: "Ei" steckt in "Eiweiss", "Reis" und "Eintrag".
 */
/**
 * Baut die Tage für den Bericht.
 *
 * Die Zahlen kommen aus `dayNumbers`, also aus demselben Weg wie die
 * Tagesansicht. Eine zweite Rechnung wäre eine zweite Stelle, an der eine
 * Kalorie anders herauskommt als in der App daneben.
 */
export function berichtTage(von, bis) {
  const tage = [];
  for (let t = Date.parse(`${von}T00:00:00Z`); t <= Date.parse(`${bis}T00:00:00Z`); t += 86400000) {
    const tag = new Date(t).toISOString().slice(0, 10);
    const daten = store.getDay(tag);
    const { totals } = dayNumbers(tag);
    const trainings = Array.isArray(daten.trainings) ? daten.trainings : [];
    const checkin = (daten.checkins || []).find((c) => Number.isFinite(Number(c?.energy)));
    const morgen = (daten.checkins || []).filter((c) => c?.kind === "morning").pop();
    tage.push({
      tag,
      kcal: totals.kcal,
      proteinG: totals.proteinG,
      wasserMl: totals.waterMl,
      // `Number(null)` ist 0 und damit endlich. `getDay` liefert `weightKg: null`
      // für jeden Tag ohne Wiegung, und ohne diese Prüfung wird daraus eine
      // Wiegung von null Kilo. Im Bericht stand dann "+83.8 kg seit".
      gewichtKg: daten.weightKg === null || daten.weightKg === undefined ? null : Number(daten.weightKg),
      trainingMinuten: trainings.reduce((s, e) => s + (Number(e?.minutes) || 0), 0),
      trainingEinheiten: trainings.length,
      energie: checkin ? Number(checkin.energy) : null,
      schlafMinuten: Number.isFinite(Number(daten.gesundheit?.schlafMinuten))
        ? Number(daten.gesundheit.schlafMinuten)
        : null,
      // Die Qualität kommt aus dem Morgen Check-in und braucht keine Uhr.
      schlafQualitaet: morgen && Number.isFinite(Number(morgen.sleepQuality))
        ? Number(morgen.sleepQuality)
        : null,
    });
  }
  return tage;
}

/**
 * Die wählbaren Zeiträume.
 *
 * Woche und vier Wochen sind gleitend, sie enden heute. Ein Monat ist fest:
 * "September" heisst vom Ersten bis zum Letzten, und genau so vergleicht ihn
 * auch jeder mit dem August. Beides zusammen in einer Liste, weil beides
 * dieselbe Frage beantwortet, nur mit anderem Ausschnitt.
 *
 * Angeboten werden nur Monate, in denen wirklich etwas steht. Eine Liste mit
 * zwölf leeren Monaten sieht nach einer App aus, die seit einem Jahr nicht
 * benutzt wurde.
 */
export function berichtZeitraeume(heute = todayIso()) {
  const monate = new Set();
  for (const tag of store.allDays()) {
    if (tag <= heute) monate.add(tag.slice(0, 7));
  }
  const NAMEN = ["Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"];

  return [
    { wert: "7", name: "Letzte Woche" },
    { wert: "28", name: "Letzte vier Wochen" },
    ...[...monate].sort().reverse().map((m) => {
      const [jahr, monat] = m.split("-");
      // Der laufende Monat heisst so und trägt keine Jahreszahl: niemand
      // sagt "September 2026", wenn September gerade läuft.
      const laufend = m === heute.slice(0, 7);
      return { wert: m, name: laufend ? `${NAMEN[Number(monat) - 1]}, bisher` : `${NAMEN[Number(monat) - 1]} ${jahr}` };
    }),
  ];
}

/**
 * Ein Bericht über einen der Zeiträume.
 *
 * `wahl` ist "7", "28" oder ein Monat als JJJJ-MM. Verglichen wird immer mit
 * dem gleich langen Zeitraum davor, bei einem Monat also mit dem Vormonat und
 * nicht mit den 30 Tagen davor: wer den September ansieht, vergleicht ihn mit
 * dem August.
 */
export function berichtFuer(wahl = "28", heute = todayIso()) {
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  let von;
  let bis;
  let vorherVon;
  let vorherBis;

  if (/^\d{4}-\d{2}$/.test(String(wahl))) {
    const [jahr, monat] = String(wahl).split("-").map(Number);
    von = `${wahl}-01`;
    // Tag 0 des Folgemonats ist der letzte des gesuchten. Ein laufender Monat
    // endet heute: die Tage danach gibt es noch nicht, und sie als leer zu
    // zählen würde jeden Schnitt und jede Abdeckung verfälschen.
    const letzter = new Date(Date.UTC(jahr, monat, 0)).toISOString().slice(0, 10);
    bis = letzter > heute ? heute : letzter;
    vorherVon = new Date(Date.UTC(jahr, monat - 2, 1)).toISOString().slice(0, 10);
    vorherBis = new Date(Date.UTC(jahr, monat - 1, 0)).toISOString().slice(0, 10);
  } else {
    const anzahl = Number(wahl) >= 21 ? 28 : 7;
    const ende = Date.parse(`${heute}T00:00:00Z`);
    von = iso(ende - (anzahl - 1) * 86400000);
    bis = heute;
    vorherVon = iso(ende - (2 * anzahl - 1) * 86400000);
    vorherBis = iso(ende - anzahl * 86400000);
  }

  const z = dayNumbers(heute).targets;
  return bericht({
    tage: berichtTage(von, bis),
    vorher: berichtTage(vorherVon, vorherBis),
    ziele: { kcal: z.kcal, proteinG: z.proteinG, wasserMl: z.waterMl },
    von,
    bis,
  });
}

/** Alle Tage aus dem Speicher als Tabelle. Für die Fensterrechnungen. */
function alleTage() {
  const tage = {};
  for (const tag of store.allDays()) tage[tag] = store.getDay(tag);
  return tage;
}

export function trifftPosten(name, suchtext) {
  const n = String(name || "").toLowerCase();
  const t = String(suchtext || "").toLowerCase();
  if (!n || !t) return false;
  if (n.includes(t)) return true;
  return n.split(/[^a-zäöüß0-9]+/).some((wort) => wort.length >= 3 && new RegExp(`(^|[^a-zäöüß0-9])${wort}([^a-zäöüß0-9]|$)`).test(t));
}

/** Die letzten Tage als Reihe für den Rechenkern, ältester Tag zuerst. */
export function verlaufPunkte(tage = 28) {
  const heute = todayIso();
  const out = [];
  for (let i = tage - 1; i >= 0; i--) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const data = store.getDay(iso);
    let kcal = 0;
    for (const meal of data.meals) for (const e of meal.entries) kcal += e.kcal;
    out.push({
      day: iso,
      weightKg: typeof data.weightKg === "number" ? data.weightKg : null,
      kcal: data.meals.length > 0 ? Math.round(kcal) : null,
    });
  }
  return out;
}

/**
 * Der Verlauf in Worten, mit allen Zahlen, auf denen er beruht.
 *
 * Das ist die ehrlichste Auskunft, die die App geben kann: gemessen statt
 * gerechnet. Sie sagt aber auch, wann sie nichts sagen kann.
 */
export function verlaufText(tage = 28) {
  const profile = store.getProfile();
  const punkte = verlaufPunkte(tage);
  const schaetzung = estimateTdee(punkte);
  const trend = schaetzung.trend;
  const ziel = macroTargets(profile);
  const korrektur = targetCorrection({
    schaetzung,
    goal: profile.goal,
    weightKg: trend.aktuellKg ?? profile.weightKg,
    aktuellesZielKcal: ziel.kcal,
  });

  const zeilen = [
    `Zeitraum: ${tage} Tage. Wiegungen: ${trend.messungen}, Tage mit Essenseintrag: ${schaetzung.tageMitEintrag}.`,
  ];
  if (trend.messungen >= 2) {
    zeilen.push(
      `Gewicht: ${trend.aktuellKg} kg geglättet, ${trend.kgProWoche > 0 ? "plus" : "minus"} ` +
      `${Math.abs(trend.kgProWoche).toFixed(2).replace(".", ",")} kg je Woche über ${trend.spanneTage} Tage.`,
    );
  } else {
    zeilen.push("Gewicht: zu wenige Wiegungen für eine Richtung.");
  }
  if (schaetzung.tageMitEintrag > 0) {
    zeilen.push(`Aufnahme im Schnitt: ${schaetzung.schnittAufnahmeKcal} kcal, Ziel ${ziel.kcal} kcal.`);
  }
  zeilen.push(
    schaetzung.tdeeKcal !== null
      ? `Gemessener Verbrauch: etwa ${schaetzung.tdeeKcal} kcal am Tag. Die Formel schätzt ${energyBreakdown(profile).tdeeKcal} kcal.`
      : `Gemessener Verbrauch: noch nicht bestimmbar. ${schaetzung.grund}`,
  );
  zeilen.push(`Beurteilung: ${korrektur.begruendung}`);
  if (korrektur.neuesZielKcal !== null) {
    zeilen.push(
      `Vorschlag: gemessenen Verbrauch von ${schaetzung.tdeeKcal} kcal über profil_aendern setzen. ` +
      `Das Tagesziel landet dann bei etwa ${korrektur.neuesZielKcal} kcal.`,
    );
  }

  // Was sonst noch auffällt, ohne Bewertung.
  const werte = letzteTage(Math.min(tage, 28));
  const energien = werte.flatMap((d) => d.data.checkins.map((c) => c.energy).filter((e) => typeof e === "number"));
  const schlaf = werte.flatMap((d) => d.data.checkins.map((c) => c.sleepQuality).filter((e) => typeof e === "number"));
  if (energien.length >= 3) zeilen.push(`Energie im Schnitt ${mittelwert(energien).toFixed(1).replace(".", ",")} von 10 aus ${energien.length} Check-ins.`);
  if (schlaf.length >= 3) zeilen.push(`Schlafqualität im Schnitt ${mittelwert(schlaf).toFixed(1).replace(".", ",")} von 10.`);
  const einheiten = werte.reduce((sum, d) => sum + (d.data.trainings || []).length, 0);
  zeilen.push(`Absolvierte Einheiten in den letzten ${werte.length} erfassten Tagen: ${einheiten}.`);
  const protein = werte.map((d) => d.totals.proteinG).filter((p) => p > 0);
  if (protein.length >= 3) zeilen.push(`Protein im Schnitt ${Math.round(mittelwert(protein))} g, Ziel ${ziel.proteinG} g.`);

  return zeilen.join("\n");
}

/* ---------- Mindeststandards ---------- */

/**
 * Baut die Tagesreihe, gegen die Standards geprüft werden.
 *
 * Absteigend nach Datum, heute zuerst, so wie standardStatus es erwartet.
 * Ein Tag ohne Daten zählt als nicht gehalten. Das ist gewollt: ein Tag ohne
 * Eintrag ist kein Beweis dafür, dass etwas geklappt hat.
 */
export function standardTage(anzahl = 28) {
  const heute = todayIso();
  const out = [];
  for (let i = 0; i < anzahl; i++) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const data = store.getDay(iso);
    const weekday = d.getDay();
    let proteinG = 0;
    for (const meal of data.meals) for (const e of meal.entries) proteinG += e.proteinG;
    const profile = store.getProfile();
    out.push({
      day: iso,
      proteinG: Math.round(proteinG),
      waterMl: data.waterMl || 0,
      // Schritte kommen erst mit Apple Health. Bis dahin steht hier der
      // Durchschnitt aus dem Profil, damit ein Schrittstandard nicht
      // fälschlich als gerissen gilt.
      steps: data.steps || profile?.dailySteps || 0,
      meals: data.meals.length,
      trainings: (profile?.sessions || []).filter((s) => s.weekday === weekday).length > 0 && data.meals.length > 0 ? 1 : 0,
      bestaetigt: data.standards || {},
    });
  }
  return out;
}

/** Legt beim ersten Aufruf Standards an, passend zu Profil und Schwerpunkten. */
/**
 * Räumt einmal eine Notiz weg, die der Coach falsch verstanden hatte: "alles,
 * was ich empfehle, kommt in den Kalender". Der Nutzer hat das so nie
 * gewollt, und solange die Notiz im Gedächtnis steht, liest der Coach sie
 * bei jeder Nachricht als Auftrag. Die Regel, was in den Kalender gehört,
 * steht jetzt in der Persona und in `eintragErlaubt`.
 */
export function kalenderNotizAufraeumen() {
  const s = store.getSettings();
  if (s.kalenderNotizGeprueft) return 0;
  const alle = store.getMemories();
  const falsch = (m) => {
    const t = foldUmlauts(String(m.text || "").toLowerCase());
    return /\bkalender\b/.test(t) && /\b(alles|alle|jede|jeden|immer)\b/.test(t) && /\b(empfehl\w*|empfiehl\w*|empfohlen|vorschlag\w*|vorschlae\w*|plan\w*)\b/.test(t)
      && /\b(eintrag\w*|kommt|kommen|landen|landet|rein|direkt)\b/.test(t);
  };
  const bleiben = alle.filter((m) => !falsch(m));
  if (bleiben.length !== alle.length) store.setMemories(bleiben);
  store.setSettings({ ...store.getSettings(), kalenderNotizGeprueft: true });
  return alle.length - bleiben.length;
}

/**
 * Räumt einmal die Aufgaben weg, die der Regelweg aus einer Beschwerde an
 * daevo gemacht hatte, etwa "dass ich das machen muss". Ein Satzteil, der
 * mit "dass" beginnt, ist nie eine Aufgabe, sondern der Rest eines Satzes.
 * Seit `anDaevo` entstehen solche nicht mehr. Todoist bleibt unberührt.
 */
export function aufgabenAufraeumen() {
  const s = store.getSettings();
  if (s.aufgabenGeprueft) return 0;
  const alle = store.getAufgaben();
  const falsch = (a) => !a.erledigt && a.quelle !== "todoist" && /^dass\b/.test(foldUmlauts(String(a.text || "").trim().toLowerCase()));
  const bleiben = alle.filter((a) => !falsch(a));
  if (bleiben.length !== alle.length) store.setAufgaben(bleiben);
  store.setSettings({ ...store.getSettings(), aufgabenGeprueft: true });
  return alle.length - bleiben.length;
}

export function ensureStandards() {
  const vorhanden = store.getStandards();
  if (vorhanden.length > 0) return vorhanden;
  const profile = store.getProfile();
  if (!profile) return [];
  const bereiche = brain
    .all()
    .filter((e) => e.tags.includes("fokus"))
    .flatMap((e) => e.text.toLowerCase().match(/ernährung|krafttraining|ausdauer|schlaf|stress|trinken|routinen|gewicht/g) || [])
    .map((wort) => ({
      "ernährung": "ernaehrung", krafttraining: "kraft", ausdauer: "ausdauer", schlaf: "schlaf",
      stress: "stress", trinken: "trinken", routinen: "routine", gewicht: "gewicht",
    })[wort])
    .filter(Boolean);
  const targets = macroTargets(profile);
  const neu = suggestStandards({
    profile,
    bereiche,
    proteinTargetG: targets.proteinG,
    waterTargetMl: waterTargetMl(profile, 0),
  });
  store.setStandards(neu);
  return neu;
}

export function standardsUebersicht() {
  return standardsStatus(ensureStandards(), standardTage());
}

/**
 * Formuliert die Nachfrage zu einem Standard.
 *
 * Messbare Standards werden mit ihrer Zahl konfrontiert. Bei den anderen
 * bleibt nur die Frage, weil die App es nicht wissen kann.
 */
export function standardFrage(status) {
  const s = status.standard;
  if (s.kadenz === "woechentlich") {
    const fehlt = Math.max(0, s.ziel - status.gehalten);
    return `${s.text}. Diese Woche fehlen noch ${fehlt || s.ziel}. Kriegst du das heute unter?`;
  }
  return `${s.text}. Heute noch nicht erledigt. Schaffst du es noch?`;
}

/**
 * Der Erinnerungsplan für einen Tag, inklusive Einkauf und Standards.
 *
 * Liegt hier und nicht in app.js, weil sonst zwei Stellen wissen müssten,
 * wie der Zustand für den Rechenkern aufgebaut wird.
 */
export function tagesErinnerungen(day = todayIso()) {
  const n = dayNumbers(day);
  const liste = store.getShoppingList();
  const status = standardsUebersicht();
  const offen = standardZumNachhaken(status);
  return buildDailyReminders({
    profile: n.profile,
    weekday: n.weekday,
    // Der Tag geht mit, damit der Plan die Zeiten dieses Tages nimmt und nicht
    // den Schnitt aus dem Profil.
    tag: day,
    state: {
      mealsLogged: n.data.meals.length,
      waterMl: n.totals.waterMl,
      waterTargetMl: n.targets.waterMl,
      wochenCheckinDone: store.getCheckinBoegen().some((b) => b.tag === day),
      morningCheckinDone: n.data.checkins.some((c) => c.kind === "morning"),
      eveningReviewDone: n.data.checkins.some((c) => c.kind === "evening"),
      middayCheckinDone: n.data.checkins.some((c) => c.kind === "midday"),
      middayChallengeDone: n.data.checkins.some((c) => c.kind === "herausforderung"),
      offeneAufgaben: store.getAufgaben().filter((a) => !a.erledigt).length,
      offeneEinkaeufe: (liste?.items || []).filter((i) => i.stand === "offen").length,
      standardHinweis: offen ? { id: offen.standard.id, frage: standardFrage(offen) } : null,
    },
  });
}

/* ---------- Einkaufsliste ---------- */

/** Was der Nutzer nicht verträgt, aus dem Gedächtnis gelesen. */
/**
 * Was jemand nicht essen will, aus dem Profil und aus dem Gedächtnis.
 *
 * Im Betrieb stand "mag keinen Frischkäse" nur als Notiz im Gedächtnis, weil
 * es im Gespräch gesagt wurde und nicht im Fragebogen. Der Essensplan las nur
 * das Profil und brachte trotzdem Hüttenkäse auf Reiswaffeln. Gelesen werden
 * Sätze wie "mag keinen X", "esse keine X", "kein X", "ohne X" in Notizen
 * zum Essen.
 */
export function meidenAusNotizen(notizen = brain.all()) {
  const funde = [];
  for (const e of notizen) {
    const text = String(e.text || "");
    const zumEssen = (e.tags || []).some((t) => /ern(ä|ae)hrung|essen|vorliebe|praeferenz|präferenz/.test(t))
      || /\b(mag|esse|isst|vertr(ä|ae)gt)\b/i.test(text);
    if (!zumEssen) continue;
    const re = /\b(?:mag|esse|isst|will|möchte|moechte)\s+(?:gar\s+|absolut\s+|überhaupt\s+)?(?:kein|keine|keinen|nicht\s+gern\w*)\s+([A-Za-zÄÖÜäöüß-]{3,}(?:\s+(?:und|oder)\s+[A-Za-zÄÖÜäöüß-]{3,})*)/gi;
    for (const m of text.matchAll(re)) funde.push(...m[1].split(/\s+(?:und|oder)\s+/));
  }
  return [...new Set(funde.map((w) => w.trim()).filter((w) => w.length >= 3 && !/^(lust|zeit|hunger|appetit)$/i.test(w)))];
}

/** Die Ernährungsangaben für Rezepte und Plan, mit allem, was gemieden wird. */
export function ernaehrungMitNotizen(profil = store.getProfile() || {}) {
  const e = profil.ernaehrung || {};
  const meiden = [...new Set([...(e.meiden || []), ...meidenAusNotizen()])];
  return { ...e, meiden };
}

function unvertraeglichkeiten() {
  return brain
    .all()
    .filter((e) => e.tags.includes("unverträglichkeit"))
    .flatMap((e) => {
      const match = /(?:Verträgt kein|Verträgt nicht:)\s*(.+?)\.?$/i.exec(e.text);
      return match ? match[1].split(/,|und/).map((t) => t.trim()) : [];
    })
    .filter(Boolean);
}

export function einkaufslisteText(liste) {
  if (!liste || liste.items.length === 0) return "Es gibt noch keine Einkaufsliste.";
  const offen = liste.items.filter((i) => i.stand === "offen");
  const zuhause = liste.items.filter((i) => i.stand === "zuhause");
  const gekauft = liste.items.filter((i) => i.stand === "gekauft");
  const zeilen = offen.map((i) => (i.menge ? `- ${i.name}, ${i.menge}` : `- ${i.name}`));
  return [
    `Liste für ${liste.tage} Tage, ${liste.items.length} Posten. ` +
      `Offen ${offen.length}, zu Hause ${zuhause.length}, gekauft ${gekauft.length}.`,
    ...zeilen,
  ].join("\n");
}

/* ---------- Kalender ---------- */

/**
 * Wie weit zurück und wie weit voraus Termine behalten werden.
 *
 * Zurück reichen 60 Tage, nicht 14. Ein wöchentlicher Termin kommt in zwei
 * Wochen nur zweimal vor, und aus zweimal lässt sich keine Serie erkennen.
 * Für den Trainingsplan aus dem Kalender und für die Zeitverteilung über
 * Wochen braucht es den längeren Rückblick.
 */
const KALENDER_RUECK_TAGE = 60;
const KALENDER_VOR_TAGE = 90;

function kalenderFenster() {
  const jetzt = Date.now();
  return {
    von: jetzt - KALENDER_RUECK_TAGE * 86400000,
    bis: jetzt + KALENDER_VOR_TAGE * 86400000,
  };
}

/**
 * Nimmt eine ICS Datei auf.
 *
 * Termine derselben Quelle werden ersetzt, nicht ergänzt. Sonst stünde ein
 * abgesagter Termin nach dem nächsten Import immer noch im Kalender, und die
 * App würde einen Tag planen, den es nicht gibt.
 */
export function kalenderImportieren(icsText, quelle) {
  const fenster = kalenderFenster();
  const ergebnis = termineAusIcs(icsText, fenster, quelle);
  const name = quelle || ergebnis.kalendername || "Kalender";
  kalenderTermineSetzen(name, ergebnis.termine, { art: "datei" });
  return { name, anzahl: ergebnis.termine.length, hinweise: ergebnis.hinweise };
}

/**
 * Ersetzt die Termine einer Quelle. Gemeinsamer Weg für Datei, Abo Adresse
 * und den Apple Kalender auf dem iPhone, damit alle drei dieselben Regeln
 * haben: Fenster, Sortierung, und eine Quelle ersetzt nur sich selbst.
 * `art` sagt der Oberfläche, ob die Quelle von selbst nachgeladen wird.
 */
export function kalenderTermineSetzen(name, neue, { art = "datei" } = {}) {
  const fenster = kalenderFenster();
  const bestand = store.getKalender();
  const andere = (bestand.termine || []).filter((t) => t.quelle !== name);
  const quellen = (bestand.quellen || []).filter((q) => q.name !== name);
  quellen.push({ name, anzahl: neue.length, stand: new Date().toISOString(), art });
  const termine = [...andere, ...neue.map((t) => ({ ...t, quelle: name }))]
    .filter((t) => t.bis > fenster.von && t.von < fenster.bis)
    .sort((a, b) => a.von - b.von);
  store.setKalender({ quellen, termine, stand: new Date().toISOString() });
  return neue.length;
}

export { kalenderFenster };

/** Entfernt einen Kalender samt seiner Termine. */
export function kalenderEntfernen(name) {
  const bestand = store.getKalender();
  store.setKalender({
    quellen: (bestand.quellen || []).filter((q) => q.name !== name),
    termine: (bestand.termine || []).filter((t) => t.quelle !== name),
    stand: new Date().toISOString(),
  });
}

/**
 * Antwort auf "ist mein Kalender überhaupt verbunden".
 *
 * Vorher landete genau diese Frage auf der Wochenübersicht, und der Nutzer
 * bekam sieben Zeilen Termine auf eine Ja-Nein-Frage. Eine Antwort, die an
 * der Frage vorbeigeht, ist schlimmer als keine: sie sieht aus wie eine.
 *
 * Genannt wird, was gemessen ist: Name der Quelle, Anzahl der Termine, wann
 * zuletzt eingelesen wurde. Dazu die eine Sache, die fast immer die Ursache
 * ist, nämlich dass ein Import eine Momentaufnahme ist und nicht mitwächst.
 */
export function kalenderStandText() {
  const st = kalenderStand();
  if (st.anzahl === 0) {
    return "Es ist kein Kalender verbunden. Im Menü unter Alltag, Kalender lädst du eine ICS Datei hoch "
      + "oder trägst die Adresse deines Google Kalenders ein. Ohne Kalender schätze ich deine "
      + "freie Zeit aus deinen Schlafenszeiten, statt sie zu messen.";
  }

  const namen = st.quellen.map((q) => q.name).filter(Boolean);
  const tageHer = st.stand
    ? Math.floor((Date.now() - new Date(st.stand).getTime()) / 86400000)
    : null;

  const teile = [
    `Dein Kalender ist verbunden. ${st.anzahl} Termine liegen hier, davon ${st.kommend} in der Zukunft.`,
  ];
  if (namen.length) teile.push(`Quelle: ${namen.join(", ")}.`);
  if (tageHer === null) teile.push("Wann zuletzt eingelesen wurde, weiß ich nicht.");
  else if (tageHer === 0) teile.push("Zuletzt eingelesen: heute.");
  else if (tageHer === 1) teile.push("Zuletzt eingelesen: gestern.");
  else teile.push(`Zuletzt eingelesen: vor ${tageHer} Tagen.`);

  // Eine Quelle, die von selbst nachlädt, ist keine Kopie. Der Hinweis auf
  // das Neuladen stimmt nur für Dateien.
  if (st.quellen.length && st.quellen.every((q) => q.art === "abo" || q.art === "apple")) {
    teile.push("Er gleicht sich beim Öffnen der App von selbst ab, höchstens alle 30 Minuten.");
    return teile.join(" ");
  }
  // Der eigentliche Grund, warum sich der Kalender falsch anfühlt. Der Import
  // ist eine Kopie, kein Abo. Was du seitdem eingetragen hast, fehlt hier.
  if (tageHer !== null && tageHer >= 2) {
    teile.push(`Das heißt: alles, was du in den letzten ${tageHer} Tagen im Kalender geändert hast, `
      + "kenne ich nicht. Der Import ist eine Kopie und kein Abo. Lad ihn im Menü unter Alltag, Kalender neu.");
  } else {
    teile.push("Der Import ist eine Kopie und kein Abo. Nach jeder Änderung in deinem Kalender "
      + "musst du ihn hier einmal neu laden, sonst rechne ich mit dem alten Stand.");
  }
  return teile.join(" ");
}

export function kalenderStand() {
  const bestand = store.getKalender();
  const jetzt = Date.now();
  return {
    quellen: bestand.quellen || [],
    anzahl: (bestand.termine || []).length,
    kommend: (bestand.termine || []).filter((t) => t.bis > jetzt).length,
    stand: bestand.stand,
  };
}

/** Termine eines Tages, aus dem Speicher. */
export function termineFuer(tagIso) {
  return termineAmTag(store.getKalender().termine || [], tagIso);
}

/**
 * Der ausgewertete Tagesablauf. Basis für Werkzeug, Anzeige und Prompt.
 *
 * Ohne Profil gibt es keine Aufstehzeit und keine Ziele. Dann wird mit einem
 * neutralen Tag gerechnet, statt an einer fehlenden Zahl zu scheitern.
 */
const PROFIL_NOTFALL = {
  sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, goal: "maintain",
  dailySteps: 8000, sessions: [], wakeTime: "07:00", sleepTime: "23:00",
};

export function ablaufFuer(tagIso) {
  const profile = profilFuerTag(tagIso) || PROFIL_NOTFALL;
  return tagesablauf({
    tag: tagIso,
    termine: termineFuer(tagIso),
    profile,
    ziele: macroTargets(profile),
    mahlzeiten: 4,
  });
}

/**
 * Was für einen Tag vorzubereiten ist, aus Kalender und Profil. Null ohne
 * Kalender oder wenn nichts zu tun ist, siehe `vorausblick` im Kern.
 */
export function vorausblickFuer(tagIso) {
  const termine = store.getKalender().termine || [];
  if (!termine.length) return null;
  const profile = profilFuerTag(tagIso) || store.getProfile();
  if (!profile) return null;
  return vorausblick({ morgen: ablaufFuer(tagIso), termine, profile });
}

/**
 * Die Abendmitteilungen für die nächsten Tage: jeden Abend das Briefing für
 * den Tag danach. Steht etwas vorzubereiten an, trägt die Mitteilung genau
 * das, sonst Termine und Fokus. Geplant wird bei jedem Öffnen neu, ändert
 * sich der Kalender, ändert sich auch die Mitteilung.
 */
export function vorausblickePlan(heute = todayIso(), tage = 3) {
  const profile = store.getProfile();
  if (!profile) return [];
  const plan = [];
  for (let i = 0; i < tage; i++) {
    const abend = tagPlusIso(heute, i);
    const b = tagesbriefingFuer("abend", Date.now(), tagPlusIso(abend, 1));
    if (b?.kurz) plan.push({ tag: abend, uhrzeit: vorausblickUhrzeit(profile, abend), titel: b.titel, text: b.kurz });
  }
  return plan;
}

/** Der Tagesablauf in Worten. Leer, solange kein Kalender verbunden ist. */
export function tagesablaufUebersicht(tagIso = todayIso()) {
  if ((store.getKalender().termine || []).length === 0) {
    return "Kein Kalender verbunden. Ohne Termine kann ich den Tagesablauf nicht beurteilen.";
  }
  return tagesablaufText(ablaufFuer(tagIso), tagesessenText(tagesessenFuer(tagIso)) || undefined);
}

/** Die nächsten Tage in je einer Zeile. */
export function kalenderUebersicht(tage = 7) {
  if ((store.getKalender().termine || []).length === 0) {
    return "Kein Kalender verbunden. Im Menü unter Alltag, Kalender lässt sich einer hinzufügen.";
  }
  const heute = todayIso();
  const ablaeufe = [];
  for (let i = 0; i < Math.max(1, Math.min(14, tage)); i++) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() + i);
    ablaeufe.push(ablaufFuer(d.toISOString().slice(0, 10)));
  }
  return wochenText(ablaeufe);
}

/* ---------- Aufgaben und Tagesrhythmus ---------- */

/**
 * Was heute noch frei ist, nach Kalender.
 *
 * Ohne Kalender gibt es keine belastbare Zahl. Dann wird mit der Zeit bis zur
 * Schlafenszeit gerechnet und das steht auch in der Begründung, damit niemand
 * eine gemessene Zahl vermutet, wo geschätzt wurde.
 */
function zeitbudget(jetzt = Date.now()) {
  const a = ablaufFuer(todayIso());
  const rest = restDesTages(a, jetzt);
  const hatKalender = (store.getKalender().termine || []).length > 0;
  return {
    freieMinuten: hatKalender ? rest.freieMinuten : rest.restMinuten,
    bereitsGearbeitet: hatKalender ? rest.belegtBisJetzt : 0,
    hatKalender,
  };
}

/**
 * Die eigenen Aufgaben und die aus Todoist, zusammen.
 *
 * Todoist nur, solange ein Token hinterlegt ist. Wer die Verbindung löst,
 * soll nicht weiter mit einer alten Kopie planen.
 */
export function alleAufgaben() {
  const eigene = store.getAufgaben();
  if (!todoistVerbunden()) return eigene;
  return [...eigene, ...(store.getTodoist().aufgaben || [])];
}

export function todoistVerbunden() {
  return Boolean(String(store.getSettings().todoistToken || "").trim());
}

/** Wie lange ein gelesener Stand aus Todoist als frisch gilt. */
const TODOIST_FRISCH_MS = 5 * 60000;

/**
 * Liest Todoist neu, wenn der Stand älter als fünf Minuten ist.
 *
 * Gibt einen Satz zurück, wenn etwas nicht geklappt hat, sonst einen leeren.
 * Ein Fehler hält die Planung nicht auf: es wird mit dem letzten Stand
 * gerechnet, und das steht dann dabei. Ein Plan ohne Netz ist besser als
 * keiner, aber nur, wenn er sagt, worauf er beruht.
 */
export async function todoistAktualisieren({ erzwingen = false, fetchImpl } = {}) {
  if (!todoistVerbunden()) return "";
  const alt = store.getTodoist();
  const alter = alt.abgerufen ? Date.now() - Date.parse(alt.abgerufen) : Infinity;
  if (!erzwingen && alter < TODOIST_FRISCH_MS) return "";
  try {
    const aufgaben = await todoistAufgaben(todayIso(), { token: store.getSettings().todoistToken, fetchImpl });
    store.setTodoist({ abgerufen: new Date().toISOString(), aufgaben });
    return "";
  } catch (e) {
    const wann = alt.abgerufen ? ` Gerechnet ist mit dem Stand von ${uhrzeitVon(Date.parse(alt.abgerufen))} Uhr.` : "";
    return `${e?.message || "Todoist war nicht erreichbar."}${wann}`;
  }
}

export function aufgabenPlan(jetzt = Date.now()) {
  // Dieselbe Uhrzeit wie der Plan mit Zeiten. Rechnet die Priorisierung mit
  // der echten Uhr und der Plan mit einer anderen, passen beide nicht zusammen.
  const budget = zeitbudget(jetzt);
  const plan = priorisiere({
    aufgaben: alleAufgaben(),
    tag: todayIso(),
    freieMinuten: budget.freieMinuten,
    bereitsGearbeitet: budget.bereitsGearbeitet,
  });
  if (!budget.hatKalender) {
    plan.begruendung.push(
      "Kein Kalender verbunden. Gerechnet ist mit der Zeit bis zu deiner Schlafenszeit, nicht mit echten Terminen.",
    );
  }
  const angenommen = [...plan.heute, ...plan.morgen].filter((a) => a.dauerAngenommen).length;
  if (angenommen > 0) {
    plan.begruendung.push(
      `Bei ${angenommen} ${angenommen === 1 ? "Aufgabe" : "Aufgaben"} aus Todoist steht keine Dauer, gerechnet ist mit 30 Minuten. ` +
      "Trag in Todoist eine Dauer ein, dann rechne ich damit.",
    );
  }
  return plan;
}

/**
 * Was heute ausser Terminen belegt ist: das Training aus dem Profil und eine
 * halbe Stunde je Mahlzeit.
 *
 * Die halbe Stunde ist eine Regel und keine Messung. Ohne sie legt der Plan
 * eine Aufgabe genau auf die Uhrzeit, zu der die App selbst eine Mahlzeit
 * empfiehlt.
 */
function belegtAusserKalender(tagIso, ablauf) {
  const profile = store.getProfile() || PROFIL_NOTFALL;
  const wochentag = new Date(`${tagIso}T12:00:00`).getDay();
  const belegt = [];
  for (const s of profile.sessions || []) {
    if (Number(s.weekday) !== wochentag || !/^\d{1,2}:\d{2}$/.test(String(s.startsAt || ""))) continue;
    const [h, m] = String(s.startsAt).split(":").map(Number);
    const von = new Date(`${tagIso}T00:00:00`);
    von.setHours(h, m, 0, 0);
    belegt.push({ von: von.getTime(), bis: von.getTime() + Math.max(15, Number(s.minutes) || 60) * 60000 });
  }
  for (const e of ablauf.essensfenster || []) belegt.push({ von: e.um, bis: e.um + 30 * 60000 });
  return belegt;
}

/** Der Tag mit Uhrzeiten: Reihenfolge aus `aufgabenPlan`, Zeiten aus dem Kalender. */
export function tagesplan(jetzt = Date.now()) {
  const plan = aufgabenPlan(jetzt);
  const tag = todayIso();
  const ablauf = ablaufFuer(tag);
  const luecken = lueckenOhne(ablauf.luecken, belegtAusserKalender(tag, ablauf));
  // Eine Aufgabe, die daevo heute als eigenen Termin in den Kalender gelegt
  // hat, steht dort fest. Ohne das zählte der Termin als belegt, und der Plan
  // legte dieselbe Aufgabe ein zweites Mal woandershin: zwei Uhrzeiten für
  // eine Sache, und der Morgen widersprach dem Kalender.
  const fest = new Map();
  for (const k of (Array.isArray(store.getSettings().kalenderAenderungen) ? store.getSettings().kalenderAenderungen : [])) {
    if (k.art === "angelegt" && k.aufgabeId && k.nachher && ortsTag(k.nachher.von) === tag) fest.set(k.aufgabeId, k.nachher);
  }
  if (!fest.size) return { plan, zeiten: zeitplan({ aufgaben: plan.heute, luecken, ab: jetzt }) };
  const z = zeitplan({ aufgaben: plan.heute.filter((a) => !fest.has(a.id)), luecken, ab: jetzt });
  const gesetzt = plan.heute.filter((a) => fest.has(a.id)).map((a) => ({ aufgabe: a, von: fest.get(a.id).von, bis: fest.get(a.id).bis }));
  return { plan, zeiten: { ...z, bloecke: [...z.bloecke, ...gesetzt].sort((x, y) => x.von - y.von) } };
}

export function tagesplanText(jetzt = Date.now()) {
  const { plan, zeiten } = tagesplan(jetzt);
  const zeilen = [zeitplanText(zeiten)];
  if (plan.morgen.length) zeilen.push(`Kann bis morgen warten: ${plan.morgen.map((a) => a.text).join(", ")}.`);
  if (plan.spaeter.length) zeilen.push(`Ohne Frist und heute ohne Nutzen: ${plan.spaeter.map((a) => a.text).join(", ")}.`);
  for (const b of plan.begruendung) zeilen.push(b);
  return zeilen.join("\n");
}

/** Die nächsten sieben Tage, heute zuerst. */
export function wochenplanFuer(jetzt = Date.now()) {
  const tage = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${todayIso()}T12:00:00`);
    d.setDate(d.getDate() + i);
    const tag = d.toISOString().slice(0, 10);
    const ablauf = ablaufFuer(tag);
    const luecken = lueckenOhne(ablauf.luecken, belegtAusserKalender(tag, ablauf));
    // Heute zählt nur, was noch vor einem liegt.
    const ab = i === 0 ? jetzt : 0;
    const frei = luecken.reduce((s, l) => s + Math.max(0, l.bis - Math.max(l.von, ab)), 0) / 60000;
    const bloecke = luecken.map((l) => Math.round(Math.max(0, l.bis - Math.max(l.von, ab)) / 60000)).filter((m) => m > 0);
    tage.push({ tag, freieMinuten: Math.round(frei), belegtMinuten: ablauf.belegtMinuten, bloecke });
  }
  return wochenplan({ aufgaben: alleAufgaben(), tage });
}

/**
 * Was die Bereitschaft heute an Zahlen bekommt.
 *
 * Eine Stelle für beides, Bereitschaft und Trainingsanpassung. Zwei
 * Rechnungen derselben Eingabe laufen irgendwann auseinander, und dann sagt
 * die eine Ansicht "bereit" und die andere "leichter trainieren".
 */
export function bereitschaftsEingabe(day = todayIso()) {
  const morgen = (store.getDay(day).checkins || []).filter((c) => c.kind === "morning").pop();
  const boegen = store.getCheckinBoegen().filter((b) => Number.isFinite(Number(b?.werte?.stress)));
  const letzter = boegen.sort((a, b) => String(a.tag).localeCompare(String(b.tag))).pop();
  const alter = letzter
    ? Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${letzter.tag}T00:00:00Z`)) / 86400000)
    : null;
  return {
    schlafQualitaet: morgen?.sleepQuality ?? null,
    energie: morgen?.energy ?? null,
    belastung: belastung({ tage: alleTage(), heute: day }),
    stress: letzter ? Number(letzter.werte.stress) : null,
    stressAlterTage: Number.isFinite(alter) ? alter : null,
  };
}

/**
 * Das Training von heute an Schlaf, Stress und Kalender angepasst.
 *
 * Die geplante Einheit kommt aus dem Profil, nicht aus dem Kalender. Ein
 * Kalendertermin sagt, wann trainiert wird, aber nicht was, und eine
 * geratene Trainingsart würde die falsche Anweisung erzeugen.
 */
export function trainingsanpassungText(angaben = {}, jetzt = Date.now()) {
  const day = todayIso();
  const profile = store.getProfile() || PROFIL_NOTFALL;
  const wochentag = new Date(`${day}T12:00:00`).getDay();
  const session = (profile.sessions || [])
    .filter((s) => Number(s.weekday) === wochentag)
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))[0];
  const geplant = session
    ? { art: session.type, minuten: Number(session.minutes) || 60, quelle: `deinem Trainingsplan, ${session.startsAt} Uhr` }
    : null;

  const eingabe = bereitschaftsEingabe(day);
  const hatKalender = (store.getKalender().termine || []).length > 0;
  const frei = hatKalender ? restDesTages(ablaufFuer(day), jetzt).freieMinuten : null;

  const an = trainingAnpassen({
    schlafMinuten: store.getDay(day).gesundheit?.schlafMinuten ?? null,
    schlafQualitaet: eingabe.schlafQualitaet,
    stress: eingabe.stressAlterTage !== null && eingabe.stressAlterTage <= 7 ? eingabe.stress : null,
    bereitschaft: bereitschaft(eingabe),
    freieMinuten: frei,
    geplant,
    angaben: { schlechtGeschlafen: angaben.schlechtGeschlafen === true, gestresst: angaben.gestresst === true },
  });
  const text = anpassungText(an, geplant);
  return geplant ? text : `${text}\nIn deinem Profil steht für heute keine Einheit. Die Anweisungen gelten, falls du trotzdem trainierst.`;
}

export function wochenplanTextFuer(jetzt = Date.now()) {
  const text = wochenplanText(wochenplanFuer(jetzt));
  return (store.getKalender().termine || []).length
    ? text
    : `${text}\nKein Kalender verbunden. Gerechnet ist mit deinen Wachzeiten, nicht mit echten Terminen.`;
}

export function aufgabenPlanText() {
  return planText(aufgabenPlan(), todayIso());
}

/**
 * Eine Aufgabe anlegen und dabei vom Coach einstufen lassen.
 *
 * Der Nutzer schreibt hin, was zu tun ist, und sonst nichts. Wer beim
 * Eintragen eine Wichtigkeit auswählen muss, wählt beim dritten Mal immer
 * dieselbe, und eine Liste, in der alles wichtig ist, ist keine Liste.
 *
 * Der Coach sieht dabei mehr als ein Auswahlfeld: den Wortlaut, die Ziele aus
 * dem Profil und was sonst offen ist. Ohne Schlüssel greift der Regelweg, und
 * das steht dann auch an der Aufgabe.
 */
export async function aufgabeEinstufen(text) {
  const profile = store.getProfile();
  const ziel = { fat_loss: "Fett verlieren", maintain: "Gewicht halten", lean_bulk: "Muskeln aufbauen" };
  const offen = store.getAufgaben().filter((a) => !a.erledigt).map((a) => a.text);

  return einstufeAufgabe(provider(), text, {
    heute: todayIso(),
    ziele: profile
      ? [
        `Körperziel: ${ziel[profile.goal] || profile.goal}.`,
        store.getSettings().anweisungen || "",
        brain.contextFor("ziele arbeit geld aufbau", 4),
      ].filter(Boolean).join("\n")
      : undefined,
    offen,
    // Einstufen ist eine Wertung, keine Texterkennung. Sie hängt an den
    // Zielen des Nutzers, nicht am Wortlaut, deshalb nicht das kleinste Modell.
    modell: modellFuerBilder(store.getSettings().modellWahl || "auto").id,
  });
}

/** Legt eine Aufgabe an und lässt den Coach einstufen. Gibt beides zurück. */
export async function aufgabeAnlegenEingestuft(text, quelle = "nutzer") {
  const sauber = String(text || "").trim();
  if (sauber.length < 3) return null;
  const e = await aufgabeEinstufen(sauber);
  const a = aufgabeAnlegen({
    text: sauber,
    minuten: e.minuten,
    wichtigkeit: e.wichtigkeit,
    faellig: e.faellig,
    warum: e.warum,
    regelbasiert: e.regelbasiert,
    quelle,
  });
  return a ? { aufgabe: a, einstufung: e, text: einstufungText(e) } : null;
}

export function aufgabeAnlegen({ text, minuten, faellig, wichtigkeit, warum, regelbasiert, quelle = "nutzer" }) {
  const sauber = String(text || "").trim().slice(0, 200);
  if (sauber.length < 3) return null;
  const aufgaben = store.getAufgaben();
  aufgaben.push({
    id: newId(),
    text: sauber,
    minuten: Math.max(5, Math.min(480, Number(minuten) || 30)),
    faellig: faellig || null,
    wichtigkeit: Math.max(1, Math.min(3, Number(wichtigkeit) || 2)),
    erledigt: false,
    erstellt: new Date().toISOString(),
    warum: String(warum || "").slice(0, 160),
    regelbasiert: Boolean(regelbasiert),
    quelle,
  });
  store.setAufgaben(aufgaben);
  return aufgaben[aufgaben.length - 1];
}

/** Findet eine Aufgabe über Wortüberlappung. Genau wie im Gedächtnis. */
export function aufgabeFinden(text) {
  const worte = foldUm(text).split(/\W+/).filter((w) => w.length > 2);
  let bester = null;
  let beste = 0;
  for (const a of alleAufgaben()) {
    if (a.erledigt) continue;
    const ziel = foldUm(a.text);
    const treffer = worte.filter((w) => ziel.includes(w)).length;
    if (treffer > beste) { beste = treffer; bester = a; }
  }
  return beste > 0 ? bester : null;
}

/**
 * Hakt eine Aufgabe ab, egal woher sie kommt.
 *
 * Eine Aufgabe aus Todoist wird zuerst dort geschlossen und erst danach hier
 * entfernt. Andersherum stünde sie bei einem Netzfehler hier als erledigt und
 * dort weiter offen, und beim nächsten Lesen käme sie zurück, ohne dass
 * jemand weiss, warum. Gibt einen Satz zurück, der sagt, was passiert ist.
 */
export async function aufgabeErledigen(id, { fetchImpl } = {}) {
  const a = alleAufgaben().find((x) => x.id === id);
  if (!a) return { ok: false, text: "Die Aufgabe gibt es nicht mehr." };
  const todoistId = todoistIdVon(id);
  if (!todoistId) {
    aufgabeAbhaken(id);
    return { ok: true, text: `Abgehakt: ${a.text}.`, rueck: { id } };
  }
  try {
    await todoistAbhaken(todoistId, { token: store.getSettings().todoistToken, fetchImpl });
  } catch (e) {
    return { ok: false, text: `In Todoist konnte ich "${a.text}" nicht abhaken. ${e?.message || ""}`.trim() };
  }
  const stand = store.getTodoist();
  const alt = (stand.aufgaben || []).find((x) => x.id === id);
  store.setTodoist({ ...stand, aufgaben: (stand.aufgaben || []).filter((x) => x.id !== id) });
  return { ok: true, text: `Abgehakt, auch in Todoist: ${a.text}.`, rueck: { id, todoistId, aufgabe: alt } };
}

/**
 * Nimmt ein Abhaken zurück. Ein Haken liegt auf dem Handy direkt unter dem
 * Daumen, und ein Fehltipp hakte bisher endgültig ab, in Todoist gleich mit.
 * Todoist zuerst und dann der lokale Stand, aus demselben Grund wie beim
 * Abhaken: sonst stünde die Aufgabe hier offen und dort erledigt.
 */
export async function aufgabeWiederOeffnen(rueck, { fetchImpl } = {}) {
  if (!rueck?.id) return { ok: false, text: "Da gibt es nichts zurückzunehmen." };
  if (rueck.todoistId) {
    try {
      await todoistWiederOeffnen(rueck.todoistId, { token: store.getSettings().todoistToken, fetchImpl });
    } catch (e) {
      return { ok: false, text: `In Todoist ging das Zurückholen nicht. ${e?.message || ""}`.trim() };
    }
    const stand = store.getTodoist();
    const liste = stand.aufgaben || [];
    if (rueck.aufgabe && !liste.some((x) => x.id === rueck.id)) store.setTodoist({ ...stand, aufgaben: [...liste, rueck.aufgabe] });
    return { ok: true, text: "Wieder offen, auch in Todoist." };
  }
  const aufgaben = store.getAufgaben();
  const a = aufgaben.find((x) => x.id === rueck.id);
  if (!a) return { ok: false, text: "Die Aufgabe gibt es nicht mehr." };
  a.erledigt = false;
  delete a.erledigtAm;
  store.setAufgaben(aufgaben);
  return { ok: true, text: "Wieder offen." };
}

export function aufgabeAbhaken(id) {
  const aufgaben = store.getAufgaben();
  const a = aufgaben.find((x) => x.id === id);
  if (!a) return false;
  a.erledigt = true;
  a.erledigtAm = new Date().toISOString();
  store.setAufgaben(aufgaben);
  return true;
}

/**
 * Die Einstufung von Hand ändern.
 *
 * Eine Einschätzung, die man nicht korrigieren kann, ist eine Bevormundung.
 * Ein Tipp auf die Einstufung schaltet weiter, mehr braucht es nicht.
 */
export function aufgabeUmstufen(id) {
  const aufgaben = store.getAufgaben();
  const a = aufgaben.find((x) => x.id === id);
  if (!a) return null;
  a.wichtigkeit = (a.wichtigkeit % 3) + 1;
  a.warum = "von dir geändert";
  a.regelbasiert = false;
  store.setAufgaben(aufgaben);
  return a;
}

/**
 * Legt eine eigene Aufgabe auf einen späteren Tag.
 *
 * Gesetzt wird `ab`, nicht die Frist. Liegt eine Frist vor dem neuen Tag,
 * wandert sie mit: wer bewusst auf Donnerstag schiebt, weiss, dass Mittwoch
 * nicht mehr klappt, und eine Frist vor dem Starttag wäre im Wochenplan für
 * immer gerissen. Aufgaben aus Todoist werden dort verschoben, nicht hier: das
 * nächste Lesen würde jede Änderung hier überschreiben.
 */
export function aufgabeVerschieben(id, tag) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(tag || ""))) return null;
  const aufgaben = store.getAufgaben();
  const a = aufgaben.find((x) => x.id === id);
  if (!a) return null;
  a.ab = tag;
  if (a.faellig && a.faellig < tag) a.faellig = tag;
  store.setAufgaben(aufgaben);
  return a;
}

export function aufgabeLoeschen(id) {
  store.setAufgaben(store.getAufgaben().filter((a) => a.id !== id));
}

function foldUm(text) {
  return String(text || "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
}

/** Die zuletzt erfasste Mahlzeit von heute, mit ihren Nährwerten. */
function letzteMahlzeit(day = todayIso()) {
  const data = store.getDay(day);
  const meal = data.meals[data.meals.length - 1];
  if (!meal) return null;
  // Die Posten und nicht der Satz, mit dem sie eingetragen wurden. Sonst
  // stand im Mittags Check-in "Ich hab gerade 250 g Magerquark gegessen: 213 kcal".
  const namen = (meal.entries || []).map((e) => `${e.quantity} ${e.name}`.trim()).join(", ");
  const summe = { text: namen || meal.text || "Mahlzeit", kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  for (const e of meal.entries) {
    summe.kcal += e.kcal;
    summe.proteinG += e.proteinG;
    summe.fatG += e.fatG;
    summe.carbsG += e.carbsG;
  }
  return summe;
}

/**
 * Der Mittags Check-in.
 *
 * Speichert die drei Werte und gibt zurück, was sie im Zusammenhang mit der
 * zuletzt erfassten Mahlzeit bedeuten. Die Bewertung kommt aus dem Rechenkern,
 * nicht aus dem Modell.
 */
export function mittagscheck({ energie, konzentration, saettigung, notiz = "" }) {
  const day = todayIso();
  const n = dayNumbers(day);
  const morgens = n.data.checkins.find((c) => c.kind === "morning");

  const befund = mittagsBefund({
    energie, konzentration, saettigung,
    mahlzeit: letzteMahlzeit(day),
    ziele: n.targets,
    bisherKcal: n.totals.kcal,
    wasserMl: n.totals.waterMl,
    schlafQualitaet: morgens?.sleepQuality ?? null,
  });

  store.addCheckin(day, {
    kind: "midday",
    at: nowTime(),
    note: notiz,
    energy: energie,
    concentration: konzentration,
    satiety: saettigung,
    sleepQuality: null,
    mood: null,
  });

  return befund;
}

/**
 * Die Antwort auf die Energiefrage aus der Push Nachricht.
 *
 * Eigener Pfad neben dem Mittags Check-in, weil hier nur eine Zahl kommt.
 * Konzentration und Sättigung mitzuraten wäre einfach und falsch: die App
 * würde danach mit Werten rechnen, die niemand angegeben hat.
 *
 * Läuft ohne Modell und ohne Schlüssel. Unter 5 von 10 kommen Vorschläge,
 * darüber nicht.
 */
export function energieCheck(energie) {
  const day = todayIso();
  const n = dayNumbers(day);
  const morgens = n.data.checkins.find((c) => c.kind === "morning");
  const letzte = letzteMahlzeit(day);
  const meals = n.data.meals;
  const letzterEintrag = meals[meals.length - 1];

  const befund = energieBefund({
    energie,
    mahlzeit: letzte,
    stundenSeitMahlzeit: stundenSeit(letzterEintrag?.at),
    zielKcal: n.targets.kcal,
    zielWasserMl: n.targets.waterMl,
    wasserMl: n.totals.waterMl,
    schlafQualitaet: morgens?.sleepQuality ?? null,
  });

  store.addCheckin(day, {
    kind: "energie",
    at: nowTime(),
    note: "",
    energy: energie,
    concentration: null,
    satiety: null,
    sleepQuality: null,
    mood: null,
  });

  return { befund, text: energieBefundText(befund) };
}

/** Stunden zwischen einer Uhrzeit HH:MM von heute und jetzt. Null ohne Zeit. */
function stundenSeit(uhrzeit) {
  if (!uhrzeit || !/^\d{1,2}:\d{2}$/.test(uhrzeit)) return null;
  const [h, m] = uhrzeit.split(":").map(Number);
  const [jetztH, jetztM] = nowTime().split(":").map(Number);
  const diff = (jetztH * 60 + jetztM - (h * 60 + m)) / 60;
  // Ein negativer Abstand heisst, der Eintrag liegt in der Zukunft. Dann sagt
  // die Zahl nichts, und geraten wird nicht.
  return diff >= 0 ? diff : null;
}

export function mittagscheckText(befund) {
  const zeilen = [...befund.befund];
  if (befund.massnahmen.length) {
    zeilen.push("");
    for (const m of befund.massnahmen) zeilen.push(m);
  }
  if (befund.aenderung) {
    const a = befund.aenderung;
    const teile = [];
    if (a.kcal) teile.push(`${a.kcal > 0 ? "plus" : "minus"} ${Math.abs(a.kcal)} kcal`);
    if (a.proteinG) teile.push(`${a.proteinG > 0 ? "plus" : "minus"} ${Math.abs(a.proteinG)} g Protein`);
    if (a.carbsG) teile.push(`${a.carbsG > 0 ? "plus" : "minus"} ${Math.abs(a.carbsG)} g Kohlenhydrate`);
    if (teile.length) zeilen.push(`Für die nächste Mahlzeit: ${teile.join(", ")}.`);
  }
  return zeilen.join("\n");
}

/**
 * Kopf leeren.
 *
 * Der Nutzer redet alles raus, was ihm im Kopf herumgeht. Zurück kommt eine
 * geordnete Liste, und die Aufgaben daraus stehen sofort in der Aufgabenliste.
 * Das ist der Punkt: eine Ordnung, die nur auf dem Bildschirm steht und nicht
 * in der Liste landet, ist am nächsten Tag wieder weg.
 *
 * Sorgen und Entscheidungen wandern ins Gedächtnis, nicht in die Aufgaben.
 * Eine Sorge auf einer To Do Liste erzeugt schlechtes Gewissen und sonst nichts.
 */
export async function kopfSortieren(text) {
  const roh = String(text || "").trim();
  if (roh.length < 20) return null;

  const jetzt = new Date();
  const ergebnis = await kopfLeeren(provider(), roh, {
    zeit: `${WEEKDAYS[jetzt.getDay()]}, ${nowTime()} Uhr`,
    kalender: (store.getKalender().termine || []).length ? tagesablaufUebersicht() : "",
    // Kopf leeren ist Planung. Wer hier spart, bekommt eine Liste, die
    // aussieht wie Ordnung und keine ist.
    modell: modellFuerBilder(store.getSettings().modellWahl || "auto").id,
  });

  const angelegt = [];
  for (const a of ergebnis.aufgaben) {
    const neu = aufgabeAnlegen({
      text: a.text, minuten: a.minuten, wichtigkeit: a.wichtigkeit, quelle: "kopf",
    });
    if (neu) angelegt.push(neu);
  }

  for (const s of ergebnis.sorgen) {
    brain.add({ text: `Belastet ihn gerade: ${s}`, art: "reflexion", wichtigkeit: 3, schlagworte: ["sorge"], quelle: "kopf" });
  }
  for (const d of ergebnis.entscheidungen) {
    brain.add({ text: `Offene Entscheidung: ${d}`, art: "hinweis", wichtigkeit: 4, schlagworte: ["entscheidung"], quelle: "kopf" });
  }

  return { ergebnis, angelegt, text: kopfText(ergebnis) };
}

/**
 * Die grösste Herausforderung des Tages festhalten.
 *
 * Getrennt vom Check-in gespeichert, damit die Frage am Nachmittag nicht noch
 * einmal kommt, und zusätzlich im Gedächtnis, weil sich über Wochen daran
 * zeigt, woran es immer wieder hängt.
 */
export function herausforderungSpeichern(text) {
  const sauber = String(text || "").trim();
  if (sauber.length < 3) return false;
  const day = todayIso();
  store.addCheckin(day, {
    kind: "herausforderung",
    at: nowTime(),
    note: sauber,
    energy: null, sleepQuality: null, mood: null,
  });
  brain.add({
    text: `Herausforderung am ${day}: ${sauber}`,
    art: "ereignis", wichtigkeit: 3, schlagworte: ["herausforderung"], quelle: "nutzer",
  });
  return true;
}

/**
 * Die Mahlzeiten eines Tages, an den Kalender gelegt, mit Rezept.
 *
 * Vorher teilte der Tagesablauf das Ziel gleichmässig auf vier Zeiten, und
 * jede Zeile hiess "787 kcal". Jetzt rechnet `tagesessen` im Kern: was schon
 * gegessen ist, zählt ab, das Training verschiebt Zeit und Grösse, und jede
 * Mahlzeit bekommt ein Gericht, das zu Ausschlüssen und Vorrat passt.
 */
export function tagesessenFuer(tagIso = todayIso(), jetzt = Date.now()) {
  const n = dayNumbers(tagIso);
  const profile = n.profile || PROFIL_NOTFALL;
  const heute = tagIso === todayIso();
  const gegessen = (n.data.meals || []).map((m) => {
    const s = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
    for (const e of m.entries || []) for (const k of Object.keys(s)) s[k] += Number(e[k]) || 0;
    return { at: m.at, ...s };
  });
  return tagesessen({
    ablauf: ablaufFuer(tagIso),
    ziele: n.targets,
    gegessen: heute ? gegessen : [],
    jetzt: heute ? jetzt : undefined,
    trainings: trainingAusProfil(profile.sessions, tagIso),
    ernaehrung: ernaehrungMitNotizen(profile),
    vorrat: store.getFridge(),
  });
}

function datumLang(tagIso) {
  const d = new Date(`${tagIso}T12:00:00`);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${d.toLocaleString("de-DE", { month: "long" })}`;
}

/** Das Training eines Tages für das Briefing, mit der Einheit aus dem gespeicherten Plan. */
function trainingFuerBriefing(tagIso) {
  const profile = store.getProfile();
  const wochentag = new Date(`${tagIso}T12:00:00`).getDay();
  const sessions = (profile?.sessions || []).filter((s) => s.weekday === wochentag)
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  const kalender = ablaufFuer(tagIso).training[0];
  // Was er für diesen Tag selbst bestellt hat, schlägt den Wochenplan: "morgen
  // um 14 Uhr Pull" ist genauer als "dienstags Krafttraining".
  const bestellt = bestellteEinheit(store.getSettings(), tagIso);
  if (bestellt) {
    const morgensB = tagIso === todayIso()
      ? (store.getDay(tagIso).checkins || []).filter((c) => c.kind === "morning" && c.morgen).pop() : null;
    return {
      titel: `Training: ${trainingsTitel(bestellt.gruppen || [])}`,
      um: bestellt.uhrzeit ?? (kalender ? uhrzeitVon(kalender.von) : sessions.find((x) => x.type === "strength")?.startsAt),
      minuten: bestellt.einheit.dauerMin ?? bestellt.minuten,
      uebungen: bestellt.einheit.positionen?.length,
      gestrichen: Boolean(morgensB?.trainingGestrichen),
    };
  }
  if (!sessions.length && !kalender) return null;
  const s = sessions.find((x) => x.type === "strength") ?? sessions[0];
  let titel = kalender ? kalender.titel
    : ({ strength: "Krafttraining", team_sport: "Mannschaftstraining", cardio: "Ausdauer", mobility: "Mobilität" }[s.type] || "Training");
  let uebungen;
  const plan = store.getSettings().plan;
  if (s?.type === "strength" && plan?.einheiten?.length) {
    const kraft = (profile.sessions || []).filter((x) => x.type === "strength")
      .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
    const index = Math.max(0, kraft.findIndex((x) => x.weekday === wochentag));
    const einheit = plan.einheiten[index % plan.einheiten.length];
    if (einheit) { titel = `Krafttraining, ${einheit.titel}`; uebungen = einheit.positionen?.length; }
  }
  const morgens = tagIso === todayIso()
    ? (store.getDay(tagIso).checkins || []).filter((c) => c.kind === "morning" && c.morgen).pop()
    : null;
  return {
    titel,
    um: kalender ? uhrzeitVon(kalender.von) : s?.startsAt,
    minuten: kalender ? Math.round((kalender.bis - kalender.von) / 60000) : s?.minutes,
    uebungen,
    gestrichen: Boolean(morgens?.trainingGestrichen),
  };
}

/**
 * Das Briefing als Struktur, morgens für heute, abends für morgen.
 * Abschnitte für die Ansicht, `kurz` für die Mitteilung, `text` für den Chat.
 */
export function tagesbriefingFuer(art = "morgen", jetzt = Date.now(), fuerTag) {
  const heute = todayIso();
  const morgenIso = tagPlusIso(heute, 1);
  const tag = fuerTag || (art === "abend" ? morgenIso : heute);
  const hatKalender = (store.getKalender().termine || []).length > 0;
  const n = dayNumbers(tag);
  const profile = profilFuerTag(tag) || store.getProfile();

  let aufgaben = [];
  if (art === "morgen") {
    const { plan, zeiten } = tagesplan(jetzt);
    const um = new Map(zeiten.bloecke.map((b) => [b.aufgabe.id ?? b.aufgabe.text, uhrzeitVon(b.von)]));
    aufgaben = plan.heute.map((a) => ({ id: a.id, text: a.text, um: um.get(a.id ?? a.text), wichtig: a.wichtigkeit >= 3 }));
  } else if (tag === morgenIso) {
    // Für übermorgen kennt die Priorisierung keine Reihenfolge, dann lieber
    // keine Aufgabe als die falsche.
    const plan = aufgabenPlan(jetzt);
    aufgaben = plan.morgen.map((a) => ({ id: a.id, text: a.text, wichtig: a.wichtigkeit >= 3 }));
  }

  const status = standardsUebersicht();
  const h = dayNumbers(heute);
  const erledigt = store.getAufgaben().filter((a) => a.erledigt && (a.erledigtAm || "").slice(0, 10) === heute).length;

  return tagesbriefing({
    art,
    datum: datumLang(tag),
    ablauf: hatKalender ? ablaufFuer(tag) : null,
    essen: tagesessenFuer(tag, jetzt),
    vorausblick: hatKalender && profile
      ? vorausblick({ morgen: ablaufFuer(tag), termine: store.getKalender().termine, profile, fuer: art === "abend" ? "morgen" : "heute" })
      : null,
    training: trainingFuerBriefing(tag),
    aufgaben,
    ziele: { kcal: n.targets.kcal, proteinG: n.targets.proteinG },
    heute: art === "abend"
      ? { kcal: h.totals.kcal, zielKcal: h.targets.kcal, proteinG: h.totals.proteinG, zielProteinG: h.targets.proteinG, erledigt }
      : undefined,
    standards: status.filter((s) => !s.aktuell).map((s) => s.satz),
  });
}

/** Morgenbriefing und Tagesabschluss als Text. Ohne Modellaufruf. */
export function briefing(art = "morgen") {
  return tagesbriefingFuer(art === "abend" ? "abend" : "morgen").text;
}

/**
 * Prüft den hinterlegten Schlüssel und meldet den echten Grund.
 *
 * Ohne diese Prüfung fällt jeder Fehler still auf den Regelweg zurück, und die
 * App sieht aus, als hätte sie geantwortet. Der häufigste Fall ist ein
 * gültiger Schlüssel ohne Guthaben, und der sieht sonst genauso aus wie ein
 * falscher.
 */
export async function schluesselPruefen() {
  return provider().pruefe();
}

/**
 * Welche Mahlzeiten heute schon gegessen wurden.
 *
 * Erkannt wird an der Uhrzeit des Eintrags, nicht an seinem Text. Wer um 13 Uhr
 * etwas einträgt, hat Mittag gegessen, egal wie er es nennt. Ein zweiter
 * Eintrag im selben Fenster gilt als dieselbe Mahlzeit: wer nachlegt, isst
 * nicht zweimal zu Mittag.
 */
/**
 * Rezeptvorschläge für eine Mahlzeit, gerechnet gegen den Rest des Tages.
 *
 * Das Ziel der Mahlzeit kommt aus `verteileRest` über alle Mahlzeiten, die
 * heute noch offen sind, nicht aus dem ganzen Rest. Wer um 13 Uhr fragt,
 * bekommt ein Mittagessen und kein Gericht über das Budget von Mittag und
 * Abend zusammen. Ist die gewünschte Art schon vorbei, zählt sie trotzdem mit:
 * wer um 21 Uhr ein Frühstück für morgen sucht, soll eines bekommen.
 */
export function rezeptVorschlaege({ art, jetzt = new Date() } = {}) {
  const n = dayNumbers();
  const offen = offeneMahlzeiten(jetzt.getHours(), gegesseneArten(n.data.meals));
  const gewaehlt = art || offen[0] || "snack";
  const profil = store.getProfile() || {};
  // Eine Mahlzeit, die heute schon vorbei ist, plant jemand für morgen. Dann
  // zählt das volle Tagesziel mit dem üblichen Anteil dieser Mahlzeit, nicht
  // der Rest von heute. Sonst bekäme um 21 Uhr niemand ein Frühstück.
  const morgen = !offen.includes(gewaehlt);
  let anteil;
  let hinweis = "";
  if (morgen) {
    const v = verteileRest({ ...n.targets }, MAHLZEITEN.map((m) => m.art));
    anteil = v.anteile.find((a) => a.art === gewaehlt);
  } else {
    const rest = { kcal: n.rest.kcal, proteinG: Math.max(0, n.rest.proteinG), fatG: Math.max(0, n.rest.fatG), carbsG: Math.max(0, n.rest.carbsG) };
    const v = verteileRest(rest, offen);
    anteil = v.anteile.find((a) => a.art === gewaehlt);
    hinweis = v.hinweise.join(" ");
  }
  if (!anteil) {
    return { art: gewaehlt, offen, morgen, rest: n.rest, ziel: null, empfehlungen: [], ausgeblendet: [], hinweis };
  }
  const ziel = { kcal: anteil.kcal, proteinG: anteil.proteinG, fatG: anteil.fatG, carbsG: anteil.carbsG };
  const { empfehlungen, ausgeblendet } = rezeptEmpfehlungen({
    ziel, art: gewaehlt, ernaehrung: ernaehrungMitNotizen(profil), vorrat: store.getFridge(),
  });
  return { art: gewaehlt, offen, morgen, rest: n.rest, ziel, empfehlungen, ausgeblendet, hinweis };
}

/**
 * Der Essensplan für sieben Tage, aus dem Rechenkern.
 *
 * Gespeichert werden nur Beginn und Variante, nicht der Plan. Bei gleicher
 * Eingabe rechnet der Kern denselben Plan, und ändert sich das Gewicht oder
 * die Allergieliste, stimmt der Plan danach mit den neuen Angaben überein,
 * statt mit denen vom Montag. Ein Plan, der älter als sechs Tage ist, beginnt
 * neu ab heute.
 */
export function essensplanRechnen({ neu = false, andere = false, heute = todayIso() } = {}) {
  const s = store.getSettings();
  let stand = s.essensplan;
  const alt = stand?.start ? (Date.parse(`${heute}T12:00:00`) - Date.parse(`${stand.start}T12:00:00`)) / 86400000 : Infinity;
  if (neu || !stand || alt < 0 || alt > 6) stand = { start: heute, variante: 0 };
  if (andere) stand = { ...stand, variante: (stand.variante || 0) + 1 };
  if (stand !== s.essensplan) store.setSettings({ ...store.getSettings(), essensplan: stand });
  const profil = store.getProfile() || {};
  const ziel = (tag) => {
    const t = dayNumbers(tag).targets;
    return { kcal: t.kcal, proteinG: t.proteinG, fatG: t.fatG, carbsG: t.carbsG };
  };
  return essensplanBauen({
    ziel: ziel(stand.start), zielFuer: ziel, start: stand.start, variante: stand.variante || 0,
    ernaehrung: ernaehrungMitNotizen(profil), vorrat: store.getFridge(),
    // Zucker nur ums Training: an Tagen mit Krafttraining oder Sport im Profil.
    trainingstag: (tag) => (profil.sessions || []).some((x) => x.weekday === new Date(`${tag}T12:00:00`).getDay()),
  });
}

/** Ein Tag des Essensplans als Text für den Coach und den Regelweg. */
export function essensplanTagText(tag) {
  const wt = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const kopf = `${wt[new Date(`${tag.datum}T12:00:00`).getDay()]}, ${tag.summe.kcal} von ${tag.ziel.kcal} kcal, ${tag.summe.proteinG} von ${tag.ziel.proteinG} g Protein.`;
  const zeilen = tag.mahlzeiten.map((m) => {
    const e = m.empfehlung;
    const vk = m.vorkochen === "doppelt" ? " Doppelt kochen, morgen gibt es das noch einmal."
      : m.vorkochen === "vorgekocht" ? " Vom Vortag aufwärmen." : "";
    return `${m.name}: ${e.rezept.name}, ${e.summe.kcal} kcal, ${e.summe.proteinG} g Protein. ${e.posten.map((p) => `${p.menge}${p.menge.endsWith(" g") ? ` ${p.name}` : ""}`).join(", ")}.${vk}`;
  });
  const erg = tag.ergaenzung.length ? [`Dazu: ${tag.ergaenzung.map((p) => `${p.menge} ${p.name}`).join(" und ")}.`] : [];
  return [kopf, ...zeilen, ...erg].join("\n");
}

/** Ob der Coach den Plan zeigen darf, dieselbe Regel wie die Ansicht. */
function essensplanFreiFuerCoach() {
  if (!KONFIG.chatUrl) return true;
  return ["pro", "test"].includes(store.getSettings().kontoStufe || "test");
}

/**
 * Kurzer Name einer Einheit für den Kalender. "Pull" liest man im Kalender
 * schneller als "Rücken, Bizeps", und so hat er es selbst gesagt.
 */
export function trainingsTitel(partien) {
  const k = [...partien].sort().join("+");
  const namen = { "bizeps+ruecken": "Pull", "brust+schultern+trizeps": "Push", "beine+po": "Beine", "beine": "Beine", "bizeps+trizeps": "Arme" };
  return namen[k] ?? partien.map((g) => FOKUS_NAME[g] ?? g).join(", ");
}

/** JJJJ-MM-TT in Ortszeit für einen Zeitpunkt in Millisekunden. */
function ortsTag(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tagPlusIso(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Schreibt die Zutaten des Plans in die Einkaufsliste.
 *
 * Posten aus einem früheren Plan werden ersetzt und nicht addiert: wer zweimal
 * auf den Knopf drückt, braucht nicht doppelt so viel Reis. Eigene Posten und
 * die aus der Tagesrechnung bleiben stehen. Was im Vorrat liegt, kommt als
 * "zuhause" hinein, damit es sichtbar bleibt und nicht gekauft wird.
 */
export function essensplanEinkauf(plan) {
  const alt = store.getShoppingList();
  const liste = alt ?? { tage: 7, items: [], hinweis: "", gemieden: [], erstelltAm: new Date().toISOString() };
  liste.items = liste.items.filter((i) => !i.ausPlan);
  for (const p of plan.einkauf) {
    liste.items.push({
      key: `plan-${p.key}`, name: p.name, menge: p.menge, kategorie: "sonstiges",
      grund: "Für deinen Essensplan", stand: p.imVorrat ? "zuhause" : "offen", ausPlan: true,
    });
  }
  store.setShoppingList(liste);
  return plan.einkauf.length;
}

/**
 * Trägt eine Rezeptempfehlung als Mahlzeit ein, Posten für Posten.
 *
 * Als einzelne Posten und nicht als eine Zeile "Chili, 750 kcal": nur so lässt
 * sich danach im Editor die Reismenge ändern, wenn es doch weniger war.
 */
export function rezeptEintragen(empfehlung, { day = todayIso(), jetzt = Date.now() } = {}) {
  const entries = empfehlung.posten.map((p) => ({
    name: p.name, quantity: p.menge,
    kcal: Math.round(p.kcal), proteinG: Math.round(p.proteinG * 10) / 10,
    fatG: Math.round(p.fatG * 10) / 10, carbsG: Math.round(p.carbsG * 10) / 10,
  }));
  store.addMeal(day, { id: newId(), text: empfehlung.rezept.name, at: jetzt, source: "rezept", entries, feeling: null });
  return entries;
}

/** Text für den Coach: die drei besten Rezepte für die nächste Mahlzeit. */
export function rezeptVorschlagText({ art } = {}) {
  const r = rezeptVorschlaege({ art });
  if (!r.ziel) return r.hinweis || "Für heute ist nichts mehr offen, was ein Rezept füllen könnte.";
  if (r.empfehlungen.length === 0) {
    return "Zu deinen Angaben passt gerade keines meiner Rezepte. "
      + (r.ausgeblendet.length ? `Ausgeblendet: ${r.ausgeblendet.slice(0, 3).map((a) => `${a.name} (${a.grund})`).join(", ")}.` : "");
  }
  const name = MAHLZEITEN.find((m) => m.art === r.art)?.name || "Mahlzeit";
  return [
    `Für dein ${name} sind ${r.ziel.kcal} kcal und ${r.ziel.proteinG} g Protein vorgesehen. Am besten passen:`,
    ...r.empfehlungen.slice(0, 3).map((e, i) => `${i + 1}. ${empfehlungText(e)}`),
    "Zum Eintragen unter Ernährung, Rezepte.",
  ].join("\n");
}

export function gegesseneArten(mahlzeiten = []) {
  const arten = new Set();
  // Die Fenster stehen in artZurUhrzeit im Kern. Die Aufschlüsselung der
  // Makros benutzt dieselben, sonst hiesse dieselbe Mahlzeit dort Snack und
  // hier Mittagessen.
  for (const m of mahlzeiten) {
    const art = artZurUhrzeit(m.at);
    if (art) arten.add(art);
  }
  return [...arten];
}

/**
 * Die Lage, aus der die Planempfehlung kommt.
 *
 * Alles gemessen, nichts geraten. Was fehlt, bleibt undefiniert, und die
 * Empfehlung stützt sich dann auf weniger Signale statt auf erfundene.
 */
export function aktuelleLage() {
  const profile = store.getProfile();
  const b = balanceFuer(14);

  // Gegen die gemessene Zeit rechnen, nicht gegen die verfügbare. Die Frage
  // lautet "wo geht deine Zeit hin", nicht "wie viel deines Tages ist erfasst".
  // Über vierzehn Tage mit zwei erfassten Tagen wäre jeder Anteil am Tag
  // einstellig, und die Schwelle für ein Signal nie erreichbar.
  const gemessen = b.bereiche.reduce((sum, x) => sum + (x.minuten || 0), 0);
  const anteil = (id) => {
    if (gemessen <= 0) return 0;
    return (b.bereiche.find((x) => x.bereich === id)?.minuten ?? 0) / gemessen;
  };

  // Stress aus dem letzten Wochenbogen. Der Mittags Check-in fragt danach
  // nicht, deshalb ist der Bogen die einzige Quelle.
  const boegen = store.getCheckinBoegen().filter((x) => x.bogen === "mitte");
  const letzter = boegen[boegen.length - 1];
  const stress = typeof letzter?.werte?.stress === "number" ? letzter.werte.stress : undefined;

  let freieMinuten;
  if ((store.getKalender().termine || []).length > 0) {
    const a = ablaufFuer(todayIso());
    freieMinuten = (a.luecken || []).reduce((sum, l) => sum + (l.minuten || 0), 0);
  }

  return {
    stress,
    freieMinuten,
    anteile: { karriere: anteil("karriere"), beziehung: anteil("beziehung"), fitness: anteil("fitness") },
    sex: profile?.sex,
    einheitenProWoche: (profile?.sessions || []).length || undefined,
  };
}

/* ---------- Gespräche ---------- */

/**
 * Das offene Gespräch, oder ein neues.
 *
 * Beim Start der App wird nicht automatisch ein neues Gespräch angelegt. Wer
 * die App öffnet und sofort wieder schliesst, hinterlässt sonst jedes Mal einen
 * leeren Eintrag in der Liste.
 */
export function aktivesGespraech() {
  const id = store.getAktivesGespraech();
  const treffer = store.getGespraeche().find((g) => g.id === id);
  if (treffer) return treffer;

  const alle = store.getGespraeche();
  const letztes = alle.sort((a, b) => b.zuletzt.localeCompare(a.zuletzt))[0];
  if (letztes) {
    store.setAktivesGespraech(letztes.id);
    return letztes;
  }
  return gespraechAnlegen();
}

export function gespraechAnlegen() {
  const jetzt = new Date().toISOString();
  const g = {
    id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    titel: "Neues Gespräch",
    ordner: "sonstiges",
    nachrichten: [],
    erstellt: jetzt,
    zuletzt: jetzt,
  };
  const alle = store.getGespraeche();
  alle.push(g);
  store.setGespraeche(alle);
  store.setAktivesGespraech(g.id);
  return g;
}

/** Hat der Nutzer in diesem Gespräch schon etwas gesagt. */
function hatGesprochen(g) {
  return (g?.nachrichten || []).some((m) => m.role === "user");
}

/**
 * Ein leeres Gespräch zum Start, wie bei Claude.
 *
 * Wer die App öffnet, will meist etwas Neues sagen und nicht im Gespräch von
 * gestern weiterschreiben. Das alte steht in der Liste und ist dort über die
 * Suche zu finden.
 *
 * Leere Gespräche werden dabei weggeräumt, bis auf das eine, das offen ist.
 * Die Liste fasst vierzig Gespräche, sortiert nach dem letzten Stand. Legte
 * jedes Öffnen ein neues an, schöben vierzig Starts ohne ein Wort jedes echte
 * Gespräch aus dem Speicher.
 */
export function frischesGespraech() {
  const alle = store.getGespraeche();
  const leer = alle.filter((g) => !hatGesprochen(g));
  const behalten = leer.find((g) => g.id === store.getAktivesGespraech()) ?? leer[0];
  if (!behalten) return gespraechAnlegen();

  const rest = alle.filter((g) => hatGesprochen(g) || g.id === behalten.id);
  behalten.nachrichten = [];
  behalten.titel = "Neues Gespräch";
  behalten.ordner = "sonstiges";
  delete behalten.ordnerFest;
  behalten.erstellt = behalten.zuletzt = new Date().toISOString();
  store.setGespraeche(rest);
  store.setAktivesGespraech(behalten.id);
  return behalten;
}

/** Ob das offene Gespräch schon etwas enthält, das der Nutzer gesagt hat. */
export function gespraechBegonnen() {
  return hatGesprochen(store.getGespraeche().find((g) => g.id === store.getAktivesGespraech()));
}

/** Gespräche für die Liste: nur solche, in denen der Nutzer etwas gesagt hat. */
export function gespraecheMitInhalt() {
  return store.getGespraeche().filter(hatGesprochen);
}

export function gespraechOeffnen(id) {
  if (store.getGespraeche().some((g) => g.id === id)) store.setAktivesGespraech(id);
}

export function gespraechLoeschen(id) {
  const rest = store.getGespraeche().filter((g) => g.id !== id);
  store.setGespraeche(rest);
  if (store.getAktivesGespraech() === id) {
    store.setAktivesGespraech(rest.sort((a, b) => b.zuletzt.localeCompare(a.zuletzt))[0]?.id ?? null);
  }
}

/** Ordner von Hand setzen. Danach sortiert die App dieses Gespräch nicht mehr um. */
export function gespraechEinordnen(id, ordner) {
  const alle = store.getGespraeche();
  const g = alle.find((x) => x.id === id);
  if (!g) return;
  g.ordner = ordner;
  g.ordnerFest = true;
  store.setGespraeche(alle);
}

/**
 * Titel und Ordner nach einer Antwort nachziehen.
 *
 * Erst ab der zweiten Nachricht des Nutzers. Eine einzelne Zeile wie "hi" sagt
 * über das Thema nichts, und ein Gespräch, das schon beim ersten Wort in einen
 * Ordner rutscht, liegt danach oft im falschen.
 */
export function gespraechNachziehen() {
  const alle = store.getGespraeche();
  const g = alle.find((x) => x.id === store.getAktivesGespraech());
  if (!g) return;

  if (g.titel === "Neues Gespräch" || !g.titel) g.titel = titelVon(g.nachrichten);

  const vomNutzer = g.nachrichten.filter((m) => m.role === "user").length;
  if (!g.ordnerFest && vomNutzer >= 2) g.ordner = ordnerFuerGespraech(g);

  store.setGespraeche(alle);
}

export function gespraecheSuchen(frage) {
  return sucheGespraeche(store.getGespraeche(), frage);
}

/* ---------- Life Balance ---------- */

/**
 * Die Balance über einen Zeitraum.
 *
 * Termine kommen aus dem Kalender, dazu die eingetragenen Trainings als
 * Zusatzminuten für Fitness. Ein Training, das der Nutzer erfasst hat, hat
 * stattgefunden, auch wenn kein Termin dafür im Kalender steht.
 */
export function balanceFuer(tage = 1, bisIso = todayIso()) {
  const termine = [];
  let trainingMinuten = 0;
  const profil = store.getProfile();
  // Die Wachzeit wird je Tag summiert, nicht einmal genommen und multipliziert.
  // Bei wechselnden Zeiten unterscheiden sich die Tage um Stunden, und die
  // Wachzeit ist der Nenner für jeden Anteil auf dem Balance Board.
  let wachSumme = 0;

  for (let i = tage - 1; i >= 0; i--) {
    const d = new Date(`${bisIso}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    for (const t of termineFuer(iso)) termine.push(t);
    for (const training of store.getDay(iso).trainings || []) {
      trainingMinuten += Number(training.minutes) || 0;
    }
    wachSumme += profil ? wachMinutenAm(profil, iso) : 16 * 60;
  }

  // Ein Termin kann in zwei Tagen vorkommen, wenn er über Mitternacht läuft.
  // Ohne diese Entdopplung zählt seine Zeit zweimal.
  const gesehen = new Set();
  const eindeutig = termine.filter((t) => {
    const schluessel = `${t.uid}|${t.von}`;
    if (gesehen.has(schluessel)) return false;
    gesehen.add(schluessel);
    return true;
  });

  // Die verfügbare Zeit kommt aus dem Profil, nicht aus einer Annahme:
  // Wachzeit mal Anzahl Tage. Das ist der Nenner für alle Anteile.
  // Was der Coach gebucht hat und was an Aufgaben erledigt wurde, zählt
  // genauso. Ein Kalender voller Kundentermine ist kein Leben, und eine
  // erledigte Aufgabe hat genauso Zeit gekostet wie ein Termin.
  const zusatz = { karriere: 0, fitness: trainingMinuten, wellbeing: 0, me_time: 0, beziehung: 0 };
  const vonTag = new Date(`${bisIso}T12:00:00`);
  vonTag.setDate(vonTag.getDate() - (tage - 1));
  const abIso = vonTag.toISOString().slice(0, 10);

  for (const z of store.getZeiten()) {
    if (z.tag < abIso || z.tag > bisIso) continue;
    if (zusatz[z.bereich] === undefined) continue;
    zusatz[z.bereich] += Number(z.minuten) || 0;
  }

  for (const a of store.getAufgaben()) {
    if (!a.erledigt || !a.erledigtAm) continue;
    const tag = a.erledigtAm.slice(0, 10);
    if (tag < abIso || tag > bisIso) continue;
    const bereich = bereichVon(a.text) ?? "karriere";
    zusatz[bereich] += Number(a.minuten) || 0;
  }

  return balance({
    termine: eindeutig,
    zusatz,
    ziele: store.getSettings().balanceZiele || undefined,
    basisMinuten: wachSumme,
    tage,
  });
}

/**
 * Die Empfehlung aus den letzten Tagen.
 *
 * Der Vorschlag für einen Termin kommt aus dem längsten freien Block der
 * nächsten sieben Tage. Ohne Kalender bleibt die Empfehlung ohne Uhrzeit, und
 * das steht dann auch drin.
 */
export function balanceRat(tage = 7) {
  const b = balanceFuer(tage);
  return balanceEmpfehlung({ balance: b, vorschlag: freierBlock() });
}

function freierBlock() {
  if ((store.getKalender().termine || []).length === 0) return null;
  const heute = todayIso();
  let bester = null;
  for (let i = 1; i <= 7; i++) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const a = ablaufFuer(iso);
    // Blöcke am späten Abend taugen nicht für einen neuen Vorsatz.
    const passend = a.luecken
      .filter((l) => l.minuten >= 30 && new Date(l.von).getHours() >= 8 && new Date(l.von).getHours() <= 20)
      .sort((x, y) => y.minuten - x.minuten)[0];
    if (passend && (!bester || passend.minuten > bester.minuten)) {
      bester = {
        tag: new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long" }),
        von: uhrzeitVon(passend.von),
        minuten: passend.minuten,
      };
    }
  }
  return bester;
}

export function balanceUebersicht(tage = 7) {
  // Der Kalender ist eine von drei Quellen. Gebuchte Zeiten und erledigte
  // Aufgaben zaehlen genauso, also haengt die Sperre an gemessenen Minuten
  // und nicht mehr daran, ob ein Kalender verbunden ist.
  const b = balanceFuer(Math.max(1, Math.min(90, tage)));
  if (b.gesamtMinuten === 0) {
    return "Noch keine Minute gemessen. Verbinde deinen Kalender, trag eine Zeit ein oder hak eine Aufgabe ab, dann rechne ich mit echten Zahlen.";
  }
  return balanceText(b);
}

/**
 * Wie gut der Tag genutzt wurde.
 *
 * Vier Teile mit fester Gewichtung, alle aus Zahlen, die die App schon hat.
 * Die Gewichtung steht im Rechenkern und ist dort erklärt.
 */
export function tagesnutzungFuer(tagIso = todayIso()) {
  const n = dayNumbers(tagIso);
  const plan = aufgabenPlan();
  const erledigt = store.getAufgaben()
    .filter((a) => a.erledigt && (a.erledigtAm || "").slice(0, 10) === tagIso).length;
  const status = standardsUebersicht();

  return tagesnutzung({
    balance: balanceFuer(1, tagIso),
    aufgabenErledigt: erledigt,
    aufgabenGeplant: erledigt + plan.heute.length,
    standardsGehalten: status.filter((s) => s.aktuell).length,
    standardsGesamt: status.length,
    ernaehrung: scoreDay(n.totals, n.targets).total,
  });
}

/* ---------- Muster und Widersprüche ---------- */

/** Die Tagesreihe für die Musteranalyse. Fehlende Werte bleiben leer. */
export function musterTage(tage = 60) {
  const heute = todayIso();
  const out = [];
  for (let i = tage - 1; i >= 0; i--) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const data = store.getDay(iso);
    const hatEssen = data.meals.length > 0;

    let kcal = 0;
    let protein = 0;
    for (const meal of data.meals) {
      for (const e of meal.entries) { kcal += e.kcal; protein += e.proteinG; }
    }

    const morgens = data.checkins.find((c) => c.kind === "morning");
    const mittags = data.checkins.find((c) => c.kind === "midday");
    const energie = mittags?.energy ?? morgens?.energy ?? null;
    const stimmung = data.checkins.map((c) => c.mood).find((m) => typeof m === "number") ?? null;

    const termine = termineFuer(iso).filter((t) => !t.ganztags);
    const terminMinuten = termine.length
      ? Math.round(termine.reduce((s, t) => s + (t.bis - t.von), 0) / 60000)
      : null;

    out.push({
      tag: iso,
      kcal: hatEssen ? Math.round(kcal) : null,
      proteinG: hatEssen ? Math.round(protein) : null,
      wasserMl: data.waterMl > 0 ? data.waterMl : null,
      schlaf: morgens?.sleepQuality ?? null,
      energie,
      konzentration: mittags?.concentration ?? null,
      stimmung,
      training: (data.trainings || []).length,
      terminMinuten,
    });
  }
  return out;
}

export function musterUebersicht(tage = 60) {
  const reihe = musterTage(tage);
  return musterText(muster(reihe), reihe.length);
}

export function widerspruchListe(tage = 28) {
  const heute = todayIso();
  const reihe = [];
  const titel = [];
  // Ein Training, das nur im Kalender oder im Protokoll steht, ist trotzdem
  // gemacht. Ein fehlender Eintrag ist vergessen, nicht ausgefallen.
  const weitere = new Set(trainingsTageAusQuellen(store, heute));
  for (let i = tage - 1; i >= 0; i--) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const data = store.getDay(iso);
    let kcal = 0;
    let protein = 0;
    for (const meal of data.meals) {
      for (const e of meal.entries) { kcal += e.kcal; protein += e.proteinG; }
    }
    const termine = termineFuer(iso).filter((t) => !t.ganztags);
    for (const t of termine) titel.push({ titel: t.titel, minuten: Math.round((t.bis - t.von) / 60000) });
    reihe.push({
      tag: iso,
      kcal: data.meals.length ? Math.round(kcal) : null,
      proteinG: data.meals.length ? Math.round(protein) : null,
      mahlzeiten: data.meals.length,
      trainings: Math.max((data.trainings || []).length, weitere.has(iso) ? 1 : 0),
      terminMinuten: termine.length ? Math.round(termine.reduce((s, t) => s + (t.bis - t.von), 0) / 60000) : null,
    });
  }
  const n = dayNumbers(heute);
  return widersprueche({
    profile: n.profile,
    ziele: n.targets,
    tage: reihe,
    aufgaben: store.getAufgaben(),
    heute,
    terminTitel: titel,
  });
}

export function widerspruchUebersicht() {
  return widerspruchText(widerspruchListe());
}

/**
 * Trainingsplan aus dem Kalender.
 *
 * Der Kalender ist die Wirklichkeit, das Profil ist gepflegt oder nicht.
 * Uebernommen wird nur auf Ansage, nicht automatisch: ein Plan, den die App
 * hinter dem Rücken ändert, ist kein Plan mehr.
 */
export function trainingsplanVorschlag() {
  return trainingsplanAusKalender(store.getKalender().termine || []);
}

export function trainingsplanUebernehmen() {
  const vorschlag = trainingsplanVorschlag();
  if (vorschlag.length === 0) return 0;
  const profile = store.getProfile();
  if (!profile) return 0;
  store.setProfile({
    ...profile,
    sessions: vorschlag.map((v) => ({
      type: /volleyball|mannschaft|team/i.test(v.titel)
        ? "team_sport"
        : /lauf|jogg|cardio|rad|schwimm/i.test(v.titel)
          ? "cardio"
          : /mobility|dehn|yoga/i.test(v.titel)
            ? "mobility"
            : "strength",
      minutes: v.minutes,
      weekday: v.weekday,
      startsAt: v.startsAt,
    })),
  });
  return vorschlag.length;
}

/* ---------- Was der Assistent tun darf ---------- */

/**
 * Tag und Uhrzeit für eine nachgetragene Mahlzeit.
 *
 * Angenommen wird nur, was das Fotoblatt anbietet: heute, gestern,
 * vorgestern und eine echte Uhrzeit. Alles andere fällt auf jetzt zurück,
 * und eine Uhrzeit von heute, die noch nicht war, ebenfalls: gegessen ist,
 * was schon passiert ist.
 */
export function nachtragZeit(tag, uhrzeit, jetzt = new Date()) {
  const heute = todayIso(jetzt);
  const jetztZeit = nowTime(jetzt);
  const tagGilt = tag === undefined || (typeof tag === "string" && NACHTRAG_TAGE.includes(tageZurueck(tag, heute)));
  // Ein ungültiger Tag nimmt die Uhrzeit mit: 8 Uhr an einem Tag, den es so
  // nicht gibt, ist auf heute verschoben keine Angabe mehr, sondern geraten.
  if (!tagGilt) return { day: heute, at: jetztZeit };
  const day = tag ?? heute;
  let at = typeof uhrzeit === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(uhrzeit) ? uhrzeit : jetztZeit;
  if (day === heute && at > jetztZeit) at = jetztZeit;
  return { day, at };
}

/** Der Tag `n` Tage vor `iso`, in Ortszeit gerechnet wie `todayIso`. */
function isoMinus(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "2026-10-23" wird "Fr 23. Okt". Daten werden gesagt, nicht gesetzt. */
function datumKurz(iso) {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const tag = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][d.getDay()];
  const monat = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"][d.getMonth()];
  return `${tag} ${d.getDate()}. ${monat}`;
}

/** Ein Posten mit neuen Nährwerten über einen Faktor, Rundung wie in `mengeSetzen`. */
function mitFaktor(eintrag, faktor, quantity) {
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    ...eintrag,
    quantity,
    kcal: Math.round(eintrag.kcal * faktor),
    proteinG: r1(eintrag.proteinG * faktor),
    fatG: r1(eintrag.fatG * faktor),
    carbsG: r1(eintrag.carbsG * faktor),
  };
}

export function buildActions({ onChange, anhaenge = [], anbieter = provider() } = {}) {
  const changed = () => onChange?.();
  const coach = new Coach(anbieter);
  const bilder = anhaenge.filter((a) => a.mediaType && a.data && !a.fehler);

  return {
    async mahlzeitErfassen(beschreibung, { tag, uhrzeit } = {}) {
      // Wann gegessen wurde, steht oft im Satz: "heute Morgen", "gestern
      // Abend", "um 13 Uhr". Vorher bekam jeder Eintrag die Uhrzeit des
      // Eintragens, und das Frühstück stand um 13:48 als Mittagessen da.
      // Was das Modell ausdrücklich angibt, schlägt das Lesen des Satzes.
      const gelesen = essenszeitAus(beschreibung);
      const heute = todayIso();
      const tagIso = typeof tag === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tag) ? tag
        : gelesen?.tageZurueck ? isoMinus(heute, gelesen.tageZurueck) : undefined;
      const zeitAngabe = typeof uhrzeit === "string" && uhrzeit ? uhrzeit : gelesen?.uhrzeit ?? undefined;
      // Ein früherer Tag ohne Uhrzeit bekommt Mittag. Die Uhrzeit von jetzt
      // stünde dort wie eine Angabe und ist keine.
      const zeit = nachtragZeit(tagIso, zeitAngabe ?? (tagIso && tagIso !== heute ? "12:00" : undefined));
      const day = zeit.day;
      const nachtrag = day !== heute || zeit.at !== nowTime();
      const parsed = mitEigenenLebensmitteln(await coach.parseMeal(beschreibung), store.getSettings());
      // Lief das Modell nicht, steht das in der Antwort, mit Grund. Vorher
      // fiel die App still auf die Tabelle zurück, und ein Satz mit sechs
      // Lebensmitteln kam mit zweien an, ohne dass jemand es merkte.
      // Beim leeren Kontingent steht der Grund schon unter der Antwort. Ein
      // zweiter Absatz dazu sagte dasselbe noch einmal.
      const deutung = parsed.modellFehler !== undefined ? fehlerErklaerung(parsed.modellFehler) : null;
      const ohneModell = !deutung ? ""
        : deutung.art === "kontingent" ? "Ohne KI, nach der eingebauten Tabelle."
        : `Die KI hat nicht geantwortet, deshalb nur nach der eingebauten Tabelle. ${deutung.text}`;
      if (parsed.entries.length === 0) {
        // Kein erkanntes Lebensmittel heisst fast immer: das war keine
        // Mahlzeit. Eine Rückfrage nach Mengen wirkt dann, als hätte die App
        // nicht zugehört, und genau das ist im Betrieb passiert, als ein
        // Tagesplan mit "zwei gute Mahlzeiten essen" als Eintrag gelesen wurde.
        return [ohneModell, "Daraus konnte ich keine Mahlzeit lesen. Wenn du etwas eintragen willst, "
          + "sag es mir mit Menge, etwa 200 Gramm Magerquark."].filter(Boolean).join(" ");
      }
      // Der Riegel gegen doppeltes Zählen. Das Modell sieht die Zahlen des
      // Tages im Kontext und schickt beim nächsten Eintrag die ganze bisherige
      // Liste erneut mit. An einem echten Tag standen dadurch 5172 statt rund
      // 1700 Kalorien da. Siehe packages/core/src/doppelt.ts.
      const jetzt = zeit.at;
      const bestehend = (store.getDay(day).meals || []).flatMap((m) =>
        (m.entries || []).map((eintrag) => ({ eintrag, at: m.at || jetzt })),
      );
      const { behalten, verworfen } = ohneDoppelte(bestehend, parsed.entries, jetzt);
      const schonDa = doppeltText(verworfen);

      if (behalten.length === 0) {
        // Alles war schon da. Nichts eintragen, aber auch nicht so tun, als
        // sei etwas passiert.
        const n0 = dayNumbers();
        return [schonDa, `Stand unverändert: ${restText(n0.rest)}`].filter(Boolean).join(" ");
      }

      store.addMeal(day, {
        id: newId(),
        text: beschreibung,
        at: jetzt,
        source: parsed.source,
        entries: behalten,
        feeling: null,
      });
      // Ein Nachtrag gehört an seine Stelle im Tag und nicht ans Ende.
      if (nachtrag) {
        const daten = store.getDay(day);
        daten.meals.sort((a, b) => String(a.at).localeCompare(String(b.at)));
        store.setDay(day, daten);
      }
      changed();
      const kcal = Math.round(behalten.reduce((s, e) => s + e.kcal, 0));
      const protein = Math.round(behalten.reduce((s, e) => s + e.proteinG, 0));
      // Je Posten mit Kalorien. Ohne die Zahl je Zeile konnte im Betrieb weder
      // der Nutzer noch der Coach sehen, welcher Posten falsch war: auf "der
      // Reis kann nicht stimmen" kam "einen Einzelwert habe ich nicht".
      const posten = behalten.map((e) => `${e.quantity} ${e.name} (${Math.round(e.kcal)} kcal)`).join(", ");
      const warnung = parsed.warnings.length ? ` ${parsed.warnings.join(" ")}` : "";
      const zurueck = tageZurueck(day, heute);
      const n = dayNumbers(day);
      const tagWort = zurueck === 0 ? "heute" : zurueck === 1 ? "gestern" : "vorgestern";
      const wann = nachtrag ? `Für ${tagWort}, ${jetzt} Uhr${gelesen?.grund && !uhrzeit && !gelesen.grund.startsWith("um") ? ` (${gelesen.grund})` : ""}.` : "";
      const stand = zurueck === 0
        ? restText(n.rest)
        : `${zurueck === 1 ? "Gestern" : "Vorgestern"} liegst du damit bei ${Math.round(n.totals.kcal)} von ${n.targets.kcal} kcal.`;
      // Der Hinweis steht vorn. Eine Korrektur am Ende einer Antwort wird
      // überlesen, und genau sie ist der Grund, warum die Zahlen stimmen.
      const unplausibel = plausibelHinweis(day);
      // Was nicht erkannt wurde, steht direkt hinter dem Eingetragenen. Ein
      // Posten, der still fehlt, ist der teuerste Fehler beim Tracken: die
      // Zahlen sehen richtig aus und sind es nicht.
      return [
        ohneModell,
        schonDa,
        `Eingetragen: ${posten}. Diese Mahlzeit zusammen ${kcal} kcal und ${protein} g Protein.`,
        wann,
        parsed.followUpQuestion,
        `${stand}${warnung}`,
        unplausibel,
      ].filter(Boolean).join(" ").trimEnd();
    },

    /**
     * Naehrwerte eines Markenprodukts aus Open Food Facts.
     *
     * Der Barcode trifft genau, der Name ist eine Suche. Deshalb wird bei einer
     * reinen Ziffernfolge direkt der Barcode abgefragt und sonst gesucht, und
     * bei mehreren Treffern kommt die Auswahl in die Antwort statt einer
     * stillen Entscheidung fuer den ersten.
     */
    /**
     * Aufstehen und Schlafen für einen einzelnen Tag.
     *
     * Nicht das Profil, sondern eine Ausnahme für genau dieses Datum. Der
     * Standard bleibt stehen, sonst verschiebt eine einzelne Frühschicht den
     * Schnitt für alle folgenden Tage.
     */
    /**
     * Einen ausgefüllten Wochenbogen auswerten.
     *
     * Der Vergleich mit der Vorwoche geht mit, weil ein einzelner Bogen eine
     * Momentaufnahme ist. Erst "Stress von 40 auf 75" ist eine Aussage.
     */
    async checkinAuswerten({ bogen } = {}) {
      const alle = store.getCheckinBoegen().filter((b) => b.bogen === bogen);
      const jetzt = alle[alle.length - 1];
      if (!jetzt) return "Da ist noch kein Bogen.";
      const vorher = alle[alle.length - 2];

      const teile = [checkinText(jetzt)];
      const diff = checkinVergleich(jetzt, vorher);
      if (diff.length) teile.push(`Verglichen mit dem letzten Mal:\n${diff.map((d) => `- ${d}`).join("\n")}`);

      const frage = bogen === "mitte"
        ? "Das ist mein Check-in von der Wochenmitte. Sag mir ehrlich, wie die Woche läuft, "
          + "was die Zahlen zusammen bedeuten, und die eine Sache, die ich für den Rest der Woche ändere."
        : "Das ist mein Wochenrückblick. Sag mir, was du siehst, ohne es schönzureden, "
          + "und was ich nächste Woche anders mache. Eine Sache, nicht fünf.";

      const antwort = await ask(`${teile.join("\n\n")}\n\n${frage}`);
      return antwort.text;
    },

    /**
     * In früheren Gesprächen suchen.
     *
     * Gibt Titel, Ordner, Datum und die passende Stelle zurück, nicht das
     * ganze Gespräch. Fünf komplette Verläufe im Kontext kosten mehr Token als
     * die eigentliche Frage und bringen weniger als fünf gute Ausschnitte.
     */
    async gespraecheDurchsuchen({ suche } = {}) {
      const funde = gespraecheSuchen(String(suche ?? "")).slice(0, 5);
      if (funde.length === 0) return `Zu "${suche}" steht in keinem früheren Gespräch etwas.`;

      const aktiv = store.getAktivesGespraech();
      const zeilen = funde
        .filter((f) => f.gespraech.id !== aktiv)
        .map((f) => {
          const wann = new Date(f.gespraech.zuletzt).toLocaleDateString("de-DE", { day: "numeric", month: "long" });
          return `- ${f.gespraech.titel} (${ordnerName(f.gespraech.ordner)}, ${wann}): ${f.stelle}`;
        });
      if (zeilen.length === 0) return `Zu "${suche}" finde ich nur das Gespräch, in dem wir gerade sind.`;
      return `Gefunden in früheren Gesprächen:\n${zeilen.join("\n")}`;
    },

    async gespraechEinordnenAktiv({ ordner, titel } = {}) {
      const id = store.getAktivesGespraech();
      if (!id) return "Kein Gespräch offen.";
      gespraechEinordnen(id, ordner);
      if (titel) {
        const alle = store.getGespraeche();
        const g = alle.find((x) => x.id === id);
        if (g) { g.titel = titel; store.setGespraeche(alle); }
      }
      changed();
      return `Liegt jetzt unter ${ordnerName(ordner)}.`;
    },

    async tageszeitenSetzen({ tag, aufstehen, schlafen } = {}) {
      const profile = store.getProfile();
      if (!profile) return "Erst das Profil anlegen.";
      const datum = tag || todayIso();

      const ausnahmen = setzeAusnahme(
        profile,
        datum,
        { wakeTime: aufstehen, sleepTime: schlafen },
        todayIso(),
      );
      store.setProfile({ ...profile, tagesausnahmen: ausnahmen });
      changed();

      const wann = datum === todayIso() ? "Heute" : new Date(`${datum}T12:00:00`)
        .toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
      const r = tagesrandFuer(store.getProfile(), datum);
      const stunden = Math.round(wachMinutenAus(r.wakeTime, r.sleepTime) / 60);
      return `${wann}: ${r.wakeTime} bis ${r.sleepTime}, rund ${stunden} Stunden wach. `
        + "Erinnerungen und freie Zeit rechne ich für diesen Tag damit.";
    },

    /**
     * Zyklus abrufen oder eintragen. Die Phase und die Empfehlung rechnet der
     * Kern aus den Einträgen, das Modell erfindet keinen Zyklustag.
     */
    async zyklus({ aktion = "abrufen", tag, symptome = [] } = {}) {
      const heute = todayIso();
      const datum = typeof tag === "string" && /^\d{4}-\d{2}-\d{2}$/.test(tag) && tag <= heute ? tag : heute;
      let d = store.getSettings().zyklus || {};
      if (aktion === "periode_beginn") d = periodeBeginnen(d, datum);
      else if (aktion === "periode_ende") d = periodeBeenden(d, datum);
      else if (aktion === "symptome") {
        const gueltig = symptome.filter((x) => SYMPTOME.includes(x));
        if (!gueltig.length) return `${NICHT_GESPEICHERT} Welche Beschwerden? Etwa Krämpfe, Müdigkeit oder Kopfschmerz.`;
        for (const x of gueltig) if (!(d.symptome?.[datum] || []).includes(x)) d = symptomUmschalten(d, datum, x);
      } else if (!d.an) {
        return "Die Zyklus Funktion ist aus. Sie steht im Menü unter Training, Zyklus, oder sag mir den ersten Tag deiner letzten Periode.";
      }
      if (aktion !== "abrufen") {
        store.setSettings({ ...store.getSettings(), zyklus: { ...d, an: true } });
        changed();
      }
      const vorn = aktion === "periode_beginn" ? `Eingetragen: Periode ab ${zyklusDatum(datum)}.\n`
        : aktion === "periode_ende" ? `Eingetragen: Ende am ${zyklusDatum(datum)}.\n`
        : aktion === "symptome" ? "Eingetragen.\n" : "";
      return vorn + zyklusText({ ...d, an: true }, heute, zyklusDatum);
    },

    async lebensmittelAnlegen({ name, kcal, proteinG, fatG, carbsG, portionG } = {}) {
      const r = lebensmittelSpeichern(store.getSettings(), { name, kcal, proteinG, fatG, carbsG, portionG }, { id: newId });
      if (r.fehler) return `${NICHT_GESPEICHERT} ${r.fehler}`;
      store.setSettings(r.settings);
      changed();
      const l = r.lebensmittel;
      const w = l.per100;
      return [`${r.ersetzt ? "Aktualisiert" : "Angelegt"}: ${l.name}, je 100 g ${w.kcal} kcal, ${w.proteinG} g Eiweiß, ${w.fatG} g Fett, ${w.carbsG} g Kohlenhydrate${l.portionG ? `, Portion ${l.portionG} g` : ""}.`,
        "Ab jetzt rechne ich damit, wenn du es isst.", r.hinweis].filter(Boolean).join(" ");
    },

    /**
     * Ein Markenprodukt nachschlagen und auf Wunsch eintragen.
     *
     * Drei Stufen, und erst wenn alle drei nichts haben, fragt daevo nach
     * Barcode oder Etikett. Vorher stand nach der ersten gescheiterten Suche
     * "Dazu finde ich nichts" da, bei ESN Instant Rice Pudding, das fünfmal
     * in Open Food Facts steht: die alte Suche dort antwortete mit 503.
     *
     * Erst die eigene Liste, `settings.produkte`: was einmal gefunden wurde,
     * ist beim nächsten Mal ohne Netz und ohne Kosten da. Dann Open Food
     * Facts über drei Wege, siehe `produkteSuchen`. Zuletzt die Websuche des
     * Modells, nur mit Seite und nach derselben Prüfung der Zahlen.
     */
    async produktNachschlagen({ suche, gramm, erfassen } = {}) {
      const q = String(suche ?? "").trim();
      if (q.length < 3) return "Wonach soll ich suchen?";

      const nurZiffern = /^\d{8,14}$/.test(q.replace(/\s/g, ""));
      let treffer = eigenesProdukt(q);
      if (!treffer.length) treffer = gemerktesProdukt(q);
      if (!treffer.length) {
        if (nurZiffern) {
          const t = await produktPerBarcode(q.replace(/\s/g, ""), offOptionen());
          if (t) treffer = [t];
        } else {
          treffer = await produkteSuchen(q, { anzahl: 5, ...offOptionen() });
        }
      }
      if (!treffer.length && !nurZiffern) {
        const p = await naehrwerteImNetz(provider({ ohneZaehlung: true }), q);
        if (p) treffer = [{ produkt: p, einwaende: [] }];
      }

      if (treffer.length === 0) {
        return `${NICHT_GESPEICHERT} ${q} finde ich weder in Open Food Facts noch im Netz mit einer Nährwerttabelle. `
          + "Scann den Barcode oder fotografier das Nährwertetikett, dann trage ich die echten Werte ein.";
      }

      const beste = treffer[0];
      const p = beste.produkt;
      produktMerken(q, p);
      const menge = gramm ?? portionsVorschlag(p)?.gramm ?? 100;
      const zeilen = [produktText(p, menge)];

      if (!gramm) {
        const v = portionsVorschlag(p);
        zeilen.push(v ? `Gerechnet mit ${v.gramm} g, ${v.grund}.` : "Gerechnet mit 100 g, weil keine Portion angegeben ist.");
      }
      if (treffer.length > 1) {
        const rest = treffer.slice(1, 3).map((t) => `${t.produkt.marke} ${t.produkt.name}`.trim()).join(", ");
        zeilen.push(`Ebenfalls gefunden: ${rest}.`);
      }

      if (erfassen) {
        const w = naehrwerteFuer(p, menge);
        store.addMeal(todayIso(), {
          id: newId(),
          text: `${p.marke} ${p.name}, ${Math.round(menge)} g`.trim(),
          at: nowTime(),
          source: "datenbank",
          entries: [{
            name: `${p.marke} ${p.name}`.trim(),
            quantity: `${Math.round(menge)} g`,
            kcal: w.kcal,
            proteinG: w.proteinG,
            fatG: w.fatG,
            carbsG: w.carbsG,
          }],
          feeling: null,
        });
        changed();
        const n = dayNumbers();
        zeilen.push(`Eingetragen. ${restText(n.rest)}`);
      }

      return zeilen.join("\n");
    },

    /**
     * Nimmt den letzten Eintrag zurück.
     *
     * Der Grund ist der Tag mit den 5172 Kalorien. Der Riegel gegen doppelte
     * Posten verhindert die Wiederholung, aber wenn doch einmal etwas Falsches
     * drinsteht, musste der Nutzer bisher ins Menue, in die Ernährungsansicht
     * und den Eintrag dort suchen. Wer den Fehler im Gespräch bemerkt, will ihn
     * im Gespräch loswerden.
     *
     * Zurückgenommen wird immer nur ein Eintrag und immer der jüngste, der
     * passt. Ein Werkzeug, das auf einen Satz hin mehrere Einträge entfernt,
     * macht denselben Schaden wie das doppelte Erfassen, nur in die andere
     * Richtung. Was weg ist, steht in der Antwort mit seinen Zahlen, damit es
     * sich in einem Satz wieder eintragen lässt.
     */
    async eintragZuruecknehmen({ art, suche } = {}) {
      const day = todayIso();
      const gesucht = String(suche || "").toLowerCase().trim();

      if (art === "wasser") {
        const data = store.getDay(day);
        if (!data.waterMl) return "Für heute steht kein Wasser drin.";
        // Einzelne Schlucke werden nicht gespeichert, nur die Summe. Ein
        // Rückgängig ohne Einzelposten kann deshalb nur auf null setzen, und
        // das gehört gesagt statt geraten.
        data.waterMl = 0;
        store.setDay(day, data);
        changed();
        return "Wasser für heute auf null gesetzt. Die App speichert nur die Summe, "
          + "einzelne Gläser lassen sich nicht einzeln zurücknehmen. Sag mir die richtige Menge, dann trage ich sie ein.";
      }

      if (art === "training") {
        const data = store.getDay(day);
        const trainings = data.trainings || [];
        const weg = trainings[trainings.length - 1];
        if (!weg) return "Für heute steht kein Training drin.";
        data.trainings = trainings.slice(0, -1);
        store.setDay(day, data);
        changed();
        return `Zurückgenommen: ${TYP_LABEL[weg.type] || weg.type}, ${weg.minutes} Minuten.`;
      }

      if (art === "aufgabe") {
        const offen = store.getAufgaben().filter((x) => !x.erledigt);
        const treffer = gesucht
          ? offen.find((x) => x.text.toLowerCase().includes(gesucht))
          : offen[offen.length - 1];
        if (!treffer) return "Die Aufgabe finde ich nicht. Sag mir den Wortlaut.";
        store.setAufgaben(store.getAufgaben().filter((x) => x.id !== treffer.id));
        changed();
        return `Gelöscht: ${treffer.text}.`;
      }

      const data = store.getDay(day);
      const meals = data.meals || [];
      // "Lösch das Frühstück": die jüngste Mahlzeit dieser Tageszeit, über
      // dieselbe Uhrzeitregel wie überall sonst.
      const tageszeit = { fruehstueck: "fruehstueck", "frühstück": "fruehstueck", mittagessen: "mittagessen", abendessen: "abendessen", snack: "snack" }[gesucht];
      const treffer = tageszeit
        ? [...meals].reverse().find((m) => artZurUhrzeit(m.at) === tageszeit)
        : gesucht
          ? [...meals].reverse().find((m) => (m.entries || []).some((e) => trifftPosten(e.name, gesucht)))
          : meals[meals.length - 1];
      if (!treffer) {
        return gesucht
          ? (gesucht.split(/\s+/).length > 3 ? "Dazu finde ich heute keinen passenden Eintrag." : `Dazu finde ich heute keinen Eintrag mit ${suche}.`)
          : "Für heute steht noch keine Mahlzeit drin.";
      }
      const posten = (treffer.entries || []).map((e) => `${e.quantity} ${e.name}`).join(", ");
      const kcal = Math.round((treffer.entries || []).reduce((sum, e) => sum + e.kcal, 0));
      store.removeMeal(day, treffer.id);
      changed();
      const n = dayNumbers(day);
      return `Raus: ${posten}, zusammen ${kcal} kcal. ${restText(n.rest)}`;
    },

    /**
     * Korrigiert die Menge eines schon eingetragenen Postens.
     *
     * Der Anlass ist ein echter Abend. Statt eines Rippchens stand eine ganze
     * Tafel Milka im Tag, das Fett lag bei 167 Gramm gegen ein Ziel von 69.
     * Der Coach hat den Fehler erkannt, richtig benannt und dann geschrieben,
     * er koenne ihn nicht rueckgaengig machen. Das ist die schlechteste
     * moegliche Antwort: die falschen Zahlen bleiben stehen, und der Nutzer
     * bekommt eine Erklaerung statt einer Loesung.
     *
     * Loeschen allein reicht dafuer nicht. Wer ein Rippchen gegessen hat, hat
     * nicht nichts gegessen. Erst die Korrektur macht aus dem Erkennen eine
     * Behebung.
     *
     * Gerechnet wird ueber `mengeSetzen`, also ueber das Verhaeltnis der
     * Mengen. Das ist exakt, solange die Naehrwerte linear zur Menge stehen,
     * und das tun sie. Die Zahlen kommen damit aus dem Rechenkern und nicht
     * aus dem Modell, genau wie beim Erfassen.
     */
    async mahlzeitKorrigieren({ posten, neueMenge, mengeText } = {}) {
      const day = todayIso();
      const gesucht = String(posten || "").toLowerCase().trim();
      const data = store.getDay(day);
      const meals = data.meals || [];

      // Von hinten, weil der jüngste Eintrag fast immer der gemeinte ist.
      let treffer = null;
      for (let i = meals.length - 1; i >= 0 && !treffer; i--) {
        const eintraege = meals[i].entries || [];
        for (let j = eintraege.length - 1; j >= 0 && !treffer; j--) {
          if (!gesucht || trifftPosten(eintraege[j].name, gesucht)) {
            treffer = { meal: meals[i], index: j, eintrag: eintraege[j] };
          }
        }
      }
      if (!treffer) {
        return gesucht
          ? (gesucht.split(/\s+/).length > 3 ? "Dazu finde ich heute keinen passenden Eintrag." : `Dazu finde ich heute keinen Eintrag mit ${posten}.`)
          : "Für heute steht noch keine Mahlzeit drin, die ich ändern könnte.";
      }

      const zahl = Number(String(neueMenge ?? "").replace(",", "."));
      if (!skalierbar(treffer.eintrag)) {
        return `${treffer.eintrag.name} steht als "${treffer.eintrag.quantity}" da. `
          + "Ohne Zahl in der Menge kann ich nichts umrechnen. Nimm den Eintrag raus und sag mir die Menge neu.";
      }
      if (!(zahl > 0)) {
        return `Für ${treffer.eintrag.name} brauche ich die richtige Menge als Zahl.`;
      }

      const alt = treffer.eintrag;
      // Nennt der Nutzer eine andere Einheit als am Posten steht, rechnet die
      // App über Gramm um. Im Live-Test stand Honig als "15 g" da, der Nutzer
      // sagte "ein Teelöffel", das Modell schickte 1, und daraus wurde 1 g.
      const neuG = mengeText ? extractGrams(mengeText) : null;
      const altG = extractGrams(alt.quantity);
      const neu = neuG?.explizit && altG?.explizit && altG.grams > 0
        ? mitFaktor(alt, neuG.grams / altG.grams, mengeText)
        : mengeSetzen(alt, zahl);
      const eintraege = [...(treffer.meal.entries || [])];
      eintraege[treffer.index] = neu;
      // `korrigiert` sagt dem Coach, dass das keine Schätzung mehr ist. Eine
      // korrigierte Mahlzeit soll er nicht nochmal in Frage stellen.
      store.updateMeal(day, treffer.meal.id, { entries: eintraege, korrigiert: true });
      changed();

      const n = dayNumbers(day);
      return `Korrigiert: ${alt.name} von ${alt.quantity} auf ${neu.quantity}, `
        + `${Math.round(alt.kcal)} kcal werden ${Math.round(neu.kcal)}. ${restText(n.rest)}`;
    },

    async wasserEintragen(ml) {
      const day = todayIso();
      store.addWater(day, ml);
      changed();
      const n = dayNumbers(day);
      return `${ml} ml eingetragen. Heute ${n.totals.waterMl} von ${n.targets.waterMl} ml.`;
    },

    async tagesstandAbrufen() {
      return daySummaryText(dayNumbers());
    },

    async mahlzeitVorschlagen(wunsch) {
      // Erst die eigenen Rezepte: deren Zahlen kommen aus dem Rechenkern und
      // halten Allergien und Ausschlüsse aus dem Fragebogen sicher ein. Der
      // freie Vorschlag aus dem Vorrat kommt nur, wenn kein Rezept passt.
      const rezepte = rezeptVorschlaege();
      if (rezepte.empfehlungen.length) return rezeptVorschlagText();
      const n = dayNumbers();
      const suggestion = await coach.suggestMeal({
        fridge: store.getFridge(),
        targets: n.targets,
        consumed: n.data.meals.flatMap((m) => m.entries),
        waterMl: n.totals.waterMl,
      });
      const zutaten = suggestion.ingredients.map((i) => `${i.quantity} ${i.name}`).join(", ");
      return [
        suggestion.title,
        suggestion.reason,
        zutaten ? `Zutaten: ${zutaten}.` : "",
        suggestion.steps.join(" "),
        `Restbudget ${n.rest.kcal} kcal und ${n.rest.proteinG} g Protein.`,
        wunsch ? `Wunsch war: ${wunsch}.` : "",
      ].filter(Boolean).join(" ");
    },

    /**
     * Den Rest des Tages planen.
     *
     * Erst rechnen, dann fragen. Die Aufteilung kommt aus dem Rechenkern und
     * steht fest, bevor das Modell etwas sieht. Das Modell füllt sie mit
     * Lebensmitteln, es entscheidet nicht über die Zahlen. Sonst kämen drei
     * Vorschläge zurück, die einzeln plausibel sind und zusammen 600 Kalorien
     * über dem Ziel liegen.
     */
    async tagZuEndePlanen({ mahlzeiten } = {}) {
      const n = dayNumbers();
      const stunde = new Date().getHours();

      const arten = mahlzeiten && mahlzeiten.length
        ? mahlzeiten
        : offeneMahlzeiten(stunde, gegesseneArten(n.data.meals));

      if (arten.length === 0) {
        return "Für heute ist keine Mahlzeit mehr eingeplant. "
          + `Offen wären noch ${n.rest.kcal} kcal und ${Math.max(0, n.rest.proteinG)} g Protein. `
          + "Sag mir, was du noch essen willst, dann rechne ich es dir auf.";
      }

      const v = verteileRest(
        { kcal: n.rest.kcal, proteinG: n.rest.proteinG, fatG: n.rest.fatG, carbsG: n.rest.carbsG },
        arten,
      );
      if (v.anteile.length === 0) return v.hinweise.join(" ");

      const vorrat = store.getFridge();
      const teile = [verteilungText(v)];
      if (vorrat.length === 0) {
        teile.push(
          "Was du zu Hause hast, weiß ich nicht, deshalb sind die Vorschläge allgemein. "
          + "Trag deinen Vorrat ein, dann schlage ich dir vor, was du wirklich kochen kannst.",
        );
      }

      // Je Mahlzeit ein eigener Vorschlag gegen das eigene Teilbudget. Ohne
      // Schlüssel liefert suggestMeal den Regelweg, dann steht wenigstens die
      // Aufteilung da, und die ist der eigentliche Nutzen.
      for (const a of v.anteile) {
        try {
          const s = await coach.suggestMeal({
            fridge: vorrat,
            targets: { kcal: a.kcal, proteinG: a.proteinG, fatG: a.fatG, carbsG: a.carbsG, waterMl: 0 },
            consumed: [],
            waterMl: 0,
          });
          const zutaten = s.ingredients.map((i) => `${i.quantity} ${i.name}`).join(", ");
          teile.push(`${a.name}: ${s.title}.${zutaten ? ` ${zutaten}.` : ""}`);
        } catch {
          teile.push(`${a.name}: kein Vorschlag, aber das Budget steht oben.`);
        }
      }

      return teile.join("\n");
    },

    async checkinSpeichern({ energie, schlaf, stimmung, notiz, herausforderung }) {
      const day = todayIso();
      const hour = new Date().getHours();
      store.addCheckin(day, {
        kind: hour < 12 ? "morning" : hour >= 19 ? "evening" : "adhoc",
        at: nowTime(),
        note: notiz,
        energy: energie ?? null,
        sleepQuality: schlaf ?? null,
        mood: stimmung ?? null,
      });

      // Die Herausforderung wird getrennt abgelegt. Sonst fragt die App am
      // Nachmittag noch einmal danach, obwohl sie die Antwort schon hat.
      const heraus = String(herausforderung || "").trim();
      if (heraus.length >= 3) {
        store.addCheckin(day, {
          kind: "herausforderung",
          at: nowTime(),
          note: heraus,
          energy: null, sleepQuality: null, mood: null,
        });
        brain.add({
          text: `Herausforderung am ${day}: ${heraus}`,
          art: "ereignis", wichtigkeit: 3, schlagworte: ["herausforderung"], quelle: "coach",
        });
      }

      changed();
      return heraus
        ? "Check-in gespeichert. Die Herausforderung habe ich mir gemerkt. Geh jetzt darauf ein und nenn genau eine Sache, die hilft."
        : "Check-in gespeichert.";
    },

    async merken({ text, art, wichtigkeit, schlagworte }) {
      const result = brain.add({ text, art, wichtigkeit, schlagworte, quelle: "coach" });
      changed();
      if (result.action === "verworfen") return "Zu wenig Inhalt, nicht gespeichert.";
      return result.action === "aktualisiert"
        ? "Wusste ich schon, ich habe die Notiz aufgefrischt."
        : "Habe ich mir gemerkt.";
    },

    async gedaechtnisDurchsuchen(frage) {
      const hits = brain.search(frage, 6);
      // "Was weisst du über mich" teilt mit keiner Notiz ein Wort und fand im
      // Live-Test nichts, obwohl fünf Notizen dastanden. Bei einer Frage nach
      // der Person kommen die wichtigsten Notizen, nicht die passendsten.
      if (hits.length === 0 && /\b(mich|mir|ueber mich|über mich)\b/i.test(String(frage))) {
        const alle = [...store.getMemories()].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 8);
        if (alle.length === 0) return "Über dich habe ich noch nichts notiert.";
        return alle.map((m) => `- ${m.text} (${String(m.at).slice(0, 10)})`).join("\n");
      }
      if (hits.length === 0) return "Dazu habe ich nichts notiert.";
      return hits.map((h) => `- ${h.entry.text} (${h.entry.at.slice(0, 10)})`).join("\n");
    },

    async aufgabeAnlegen({ text, minuten, faellig, wichtigkeit } = {}) {
      // Kommen Werte vom Modell, gelten sie. Fehlen sie, wird eingestuft,
      // statt still auf normal und dreissig Minuten zu fallen.
      const a = Number.isFinite(Number(wichtigkeit)) && Number.isFinite(Number(minuten))
        ? aufgabeAnlegen({ text, minuten, faellig, wichtigkeit, warum: "vom Coach gesetzt", quelle: "coach" })
        : (await aufgabeAnlegenEingestuft(text, "coach"))?.aufgabe;
      if (!a) return "Das war zu kurz für eine Aufgabe.";
      changed();
      return `Steht auf der Liste: ${a.text}, ${a.minuten} Minuten, ` +
        `${["nebensächlich", "normal", "wichtig"][a.wichtigkeit - 1]}` +
        `${a.faellig ? `, fällig ${datumKurz(a.faellig)}` : ""}.`;
    },

    async aufgabeAbhaken({ text } = {}) {
      const a = aufgabeFinden(text || "");
      if (!a) return "Die Aufgabe finde ich nicht. Sag mir den Wortlaut.";
      const ergebnis = await aufgabeErledigen(a.id);
      if (ergebnis.ok) changed();
      return ergebnis.text;
    },

    async kalenderTermin(auftrag = {}) {
      // Dynamisch, denn kalender-schreiben.js zieht kalender-sync.js, und das
      // importiert diese Datei. Ein Kreis beim Laden lässt eine Seite leer.
      const { kalenderTermin, kalenderAenderungen } = await import("./kalender-schreiben.js");
      let a = { ...auftrag };
      // Eine Aufgabe aus Todoist darf daevo von sich aus in den Kalender legen,
      // aber nur eine dringende: heute fällig oder überfällig und wichtig. Der
      // Titel ist die Aufgabe selbst, nie eine Liste. Höchstens drei am Tag,
      // sonst ist der Kalender wieder voll mit dem, was ohnehin unter Dein Tag
      // steht.
      if (a.aufgabeId && a.aktion === "eintragen") {
        const heute = todayIso();
        const auf = alleAufgaben().find((x) => x.id === a.aufgabeId || x.id === `todoist:${a.aufgabeId}`);
        if (!auf || auf.erledigt) return `${NICHT_GESPEICHERT} Diese Aufgabe finde ich nicht.`;
        const dringend = auf.quelle === "todoist" && auf.faellig && auf.faellig <= heute && (auf.wichtigkeit ?? 2) >= 3;
        if (!dringend && a.erbeten !== true) {
          return `${NICHT_GESPEICHERT} „${auf.text}“ ist nicht dringend genug, um sie von mir aus in den Kalender zu legen. Sie steht unter Dein Tag.`;
        }
        const schon = kalenderAenderungen().filter((k) => k.art === "angelegt" && k.aufgabeId && String(k.am || "").slice(0, 10) === heute);
        if (schon.some((k) => k.aufgabeId === auf.id)) return `${NICHT_GESPEICHERT} „${auf.text}“ steht heute schon im Kalender.`;
        if (schon.length >= 3 && a.erbeten !== true) return `${NICHT_GESPEICHERT} Heute stehen schon drei Aufgaben von mir im Kalender. Mehr trage ich nicht von mir aus ein.`;
        a = { ...a, aufgabe: true, aufgabeId: auf.id, titel: auf.text, minuten: a.minuten ?? auf.minuten, tag: a.tag ?? heute };
      }
      const text = await kalenderTermin(a);
      changed();
      return text;
    },
    async erinnerungAnlegen({ text, uhrzeit, bezug, versatz, tage = [], datum } = {}) {
      // "an mein Magnesium" wird "Magnesium". In der Mitteilung stand sonst
      // "Mein Magnesium", und das liest sich wie ein Fehler.
      // "an den Physio Termin" wird "Physio Termin", der Artikel gehört nicht in die Mitteilung.
      const sauber = String(text || "").trim().replace(/^(mein|meine|meinen|meinem|meiner|den|die|das|der|dem)\s+/i, "");
      const eintrag = { id: newId(), text: sauber ? sauber.charAt(0).toUpperCase() + sauber.slice(1) : sauber, tage };
      if (bezug) Object.assign(eintrag, { bezug, versatz: Number(versatz) || 0 });
      else eintrag.uhrzeit = uhrzeit;
      if (datum) Object.assign(eintrag, { datum, tage: [] });
      const fehler = erinnerungFehler(eintrag);
      if (fehler) return fehler;
      const jetzt = { tag: todayIso(), uhrzeit: nowTime() };
      if (erinnerungVorbei(eintrag, jetzt)) return `${eintrag.uhrzeit} ist heute schon vorbei. Für wann soll ich sie stellen?`;
      // Vorbei ist vorbei: einmalige von gestern räumen sich hier selbst weg.
      // Eine wiederkehrende mit demselben Text wird ersetzt und nicht
      // verdoppelt: "Schlaf Supplements eine Stunde vor dem Schlafen" heisst,
      // die alte um 21:54 soll weg, nicht dass beide kommen.
      const gleicherText = (e) => foldUmlauts(String(e.text || "").toLowerCase().replace(/^(mein|meine|meinen|meinem|meiner)\s+/, "").trim());
      const bisher = erinnerungenAufgeraeumt(jetzt);
      const alt = istEinmalig(eintrag) ? null : bisher.find((e) => !istEinmalig(e) && gleicherText(e) === gleicherText(eintrag));
      const liste = bisher.filter((e) => e !== alt);
      const gleicheArt = liste.filter((e) => istEinmalig(e) === istEinmalig(eintrag)).length;
      if (!istEinmalig(eintrag) && gleicheArt >= MAX_EIGENE) {
        return `Du hast schon ${MAX_EIGENE} wiederkehrende Erinnerungen. Lösch eine im Profil unter Benachrichtigungen, dann geht die nächste.`;
      }
      if (istEinmalig(eintrag) && gleicheArt >= MAX_EINMALIG) {
        return `Du hast schon ${MAX_EINMALIG} offene einmalige Erinnerungen. Lösch eine im Profil unter Benachrichtigungen.`;
      }
      let imKalender = "";
      if (istEinmalig(eintrag)) {
        const { erinnerungEintragen } = await import("./kalender-schreiben.js");
        const k = await erinnerungEintragen(eintrag);
        if (k?.eid) {
          eintrag.kalender = { eid: k.eid, von: k.von };
          imKalender = ` Sie steht auch als Termin im Kalender${k.kalender ? ` ${k.kalender}` : ""}.`;
        }
      }
      store.setSettings({ ...store.getSettings(), eigeneErinnerungen: [...liste, eintrag] });
      changed();
      const wann = erinnerungZeile(eintrag, jetzt.tag);
      // Im Browser plant niemand diese Mitteilung ein. Das gehört gesagt,
      // gerade wenn es um ein Medikament geht.
      const hinweis = istNativ()
        ? " Du siehst und löschst sie im Profil unter Benachrichtigungen."
        : " Mitteilungen dafür kommen nur in der iPhone App, hier im Browser erinnere ich dich nicht.";
      const vorher = alt ? ` Die bisherige (${erinnerungZeile(alt, jetzt.tag)}) ist ersetzt.` : "";
      return `Erinnerung angelegt: ${eintrag.text}, ${wann}.${vorher}${imKalender}${hinweis}`;
    },

    async zeitEintragen({ bereich, minuten, was, tag } = {}) {
      const eintrag = {
        tag: tag || todayIso(),
        bereich,
        minuten: Math.max(5, Math.min(720, Number(minuten) || 0)),
        was: String(was || "").slice(0, 80),
        at: new Date().toISOString(),
      };
      store.addZeit(eintrag);
      changed();
      const stunden = eintrag.minuten >= 60
        ? `${Math.round((eintrag.minuten / 60) * 10) / 10} Stunden`
        : `${eintrag.minuten} Minuten`;
      // Ohne Beschreibung endet der Satz nach dem Bereich. Der Regelweg
      // bucht ohne `was`, und "gebucht: ." ist kein Satz.
      const wofuer = eintrag.was ? `: ${eintrag.was}` : "";
      return `${stunden} auf ${BEREICH_NAME[bereich] || bereich} gebucht${wofuer}.`;
    },

    async balanceAbrufen({ tage } = {}) {
      const zeitraum = Math.max(1, Math.min(90, tage || 7));
      const nutzung = zeitraum === 1 ? tagesnutzungFuer() : null;
      const rat = balanceRat(zeitraum);
      const teile = [balanceUebersicht(zeitraum)];
      if (nutzung) teile.push(`Tagesnutzung: ${nutzung.satz}`);
      teile.push(`Empfehlung: ${rat.befund} ${rat.schritt}`);
      return teile.join("\n\n");
    },

    async musterErkennen({ tage } = {}) {
      return musterUebersicht(Math.max(14, Math.min(180, tage || 60)));
    },

    /**
     * Die Trainingslast gegen den eigenen Schnitt.
     *
     * Liest jeden Tag aus dem Speicher, auch die vor dem Fenster. `allDays`
     * einmal zu lesen und einmal zu filtern ist billiger als 28 Einzelzugriffe
     * mit Datumsrechnung dazwischen.
     */
    /**
     * Der Bericht über einen Zeitraum.
     *
     * Sieben oder achtundzwanzig Tage, alles andere wird darauf gerundet. Eine
     * freie Zahl klänge genauer, als sie ist: ein Bericht über elf Tage
     * vergleicht gegen elf Tage davor, und die Grenze liegt dann mitten in
     * einer Woche.
     */
    async berichtErstellen({ tage } = {}) {
      return berichtText(berichtFuer(Number(tage) >= 21 ? "28" : "7"));
    },

    async belastungAbrufen() {
      return belastungText(belastung({ tage: alleTage(), heute: todayIso() }));
    },

    /**
     * Die Tagesform aus den eigenen Angaben.
     *
     * Keine Messung, und das steht auch in jeder Ausgabe. Was hier fehlt,
     * fällt raus, statt mit null zu zählen: sonst misst die Zahl, wie fleissig
     * jemand Check-ins ausfüllt.
     */
    async bereitschaftAbrufen() {
      return bereitschaftText(bereitschaft(bereitschaftsEingabe()));
    },

    async tagesplanErstellen() {
      const hinweis = await todoistAktualisieren();
      return [tagesplanText(), hinweis].filter(Boolean).join("\n");
    },

    async wochenplanErstellen() {
      const hinweis = await todoistAktualisieren();
      return [wochenplanTextFuer(), hinweis].filter(Boolean).join("\n");
    },

    async trainingAnpassen({ schlechtGeschlafen, gestresst } = {}) {
      return trainingsanpassungText({ schlechtGeschlafen, gestresst });
    },

    async widerspruechePruefen() {
      return widerspruchUebersicht();
    },

    async kopfLeeren({ text } = {}) {
      const ergebnis = await kopfSortieren(text);
      if (!ergebnis) return "Dafür ist zu wenig da. Erzähl einfach alles, was dir durch den Kopf geht.";
      changed();
      const plan = aufgabenPlanText();
      return `${ergebnis.text}\n\n${ergebnis.angelegt.length === 1 ? "Eine Aufgabe steht" : `${ergebnis.angelegt.length} Aufgaben stehen`} jetzt auf deiner Liste.\n\n${plan}`;
    },

    async aufgabenPriorisieren() {
      const hinweis = await todoistAktualisieren();
      return [aufgabenPlanText(), hinweis].filter(Boolean).join("\n");
    },

    async mittagscheckSpeichern({ energie, konzentration, saettigung, notiz } = {}) {
      const befund = mittagscheck({ energie, konzentration, saettigung, notiz });
      changed();
      return mittagscheckText(befund);
    },

    async briefingErstellen({ art } = {}) {
      const hinweis = await todoistAktualisieren();
      return [briefing(art === "abend" ? "abend" : "morgen"), hinweis].filter(Boolean).join("\n");
    },

    async kalenderAbrufen({ tage, stand } = {}) {
      // In der iPhone App verbindet daevo den Kalender gleich selbst, statt
      // auf das Menü zu verweisen. Wer im Gespräch nach seinem Kalender
      // fragt, will ihn verbunden haben, und die Frage von iOS nach dem
      // Zugriff kommt dann genau in diesem Moment.
      if (istNativ() && store.getSettings().appleKalender !== true) {
        try {
          const { appleKalenderVerbinden } = await import("./kalender-sync.js");
          const r = await appleKalenderVerbinden();
          changed();
          if (r?.fehler) return r.fehler;
          const apple = (r?.ergebnisse || []).find((e) => e.name === "Apple Kalender");
          if (apple?.fehler) return `Der Zugriff ist erlaubt, das Lesen ging aber nicht: ${apple.fehler}`;
          return `Kalender verbunden, ${apple?.anzahl ?? 0} Termine gelesen. ${stand ? "" : kalenderUebersicht(tage || 7)}`.trim();
        } catch (e) {
          return `Den Kalender konnte ich nicht verbinden: ${e?.message || e}`;
        }
      }
      return stand ? kalenderStandText() : kalenderUebersicht(tage || 7);
    },

    async tagesablaufPlanen({ tag } = {}) {
      return tagesablaufUebersicht(tag || todayIso());
    },

    async fotoAlsMahlzeit({ hinweis, tag, uhrzeit } = {}) {
      if (bilder.length === 0) return "Zu dieser Nachricht ist kein Bild dabei.";
      const { day, at } = nachtragZeit(tag, uhrzeit);
      const modell = modellFuerBilder(store.getSettings().modellWahl || "auto");
      const ergebnis = await mahlzeitAusFoto(anbieter, bilder.slice(0, 3), hinweis || "", modell.id);
      if (ergebnis.entries.length === 0) {
        return `Auf dem Bild sehe ich kein Essen. ${ergebnis.beschreibung}`;
      }
      store.addMeal(day, {
        id: newId(),
        text: ergebnis.beschreibung || "Foto",
        at,
        source: "foto",
        entries: ergebnis.entries,
        feeling: null,
        sicherheit: ergebnis.sicherheit,
        annahme: ergebnis.annahme,
      });
      // Ein Nachtrag gehört an seine Stelle im Tag und nicht ans Ende. Die
      // Liste liest man von oben nach unten als Ablauf, und ein Mittagessen
      // unter dem Abendessen sieht aus wie ein zweites Abendessen.
      const daten = store.getDay(day);
      daten.meals.sort((a, b) => String(a.at).localeCompare(String(b.at)));
      store.setDay(day, daten);
      changed();
      const kcal = Math.round(ergebnis.entries.reduce((s, e) => s + e.kcal, 0));
      const protein = Math.round(ergebnis.entries.reduce((s, e) => s + e.proteinG, 0));
      const posten = ergebnis.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
      const zurueck = tageZurueck(day, todayIso());
      const n = dayNumbers(day);
      // Für einen vergangenen Tag gibt es keinen Rest mehr, der offen wäre.
      // Dort zählt, wo der Tag damit gelandet ist.
      const stand = zurueck === 0
        ? restText(n.rest)
        : `${zurueck === 1 ? "Gestern" : "Vorgestern"} liegst du damit bei ${Math.round(n.totals.kcal)} von ${n.targets.kcal} kcal.`;
      const teile = [
        zurueck === 0 && at === nowTime() ? "" : `Eingetragen für ${zurueck === 0 ? "heute" : zurueck === 1 ? "gestern" : "vorgestern"}, ${at} Uhr.`,
        `Erkannt: ${posten}.`,
        `Zusammen ${kcal} kcal und ${protein} g Protein.`,
        `Sicherheit der Mengenschätzung: ${ergebnis.sicherheit}.`,
        ergebnis.annahme ? `Angenommen: ${ergebnis.annahme}` : "",
        stand,
        ergebnis.warnings.length ? ergebnis.warnings.join(" ") : "",
        ergebnis.rueckfrage,
      ];
      return teile.filter(Boolean).join(" ");
    },

    async fotoAlsVorrat({ hinweis } = {}) {
      if (bilder.length === 0) return "Zu dieser Nachricht ist kein Bild dabei.";
      const modell = modellFuerBilder(store.getSettings().modellWahl || "auto");
      const ergebnis = await vorratAusFoto(anbieter, bilder.slice(0, 3), hinweis || "", modell.id);
      if (ergebnis.zutaten.length === 0) {
        return `Ich erkenne keine Lebensmittel. ${ergebnis.beschreibung}`;
      }
      // Zum Vorhandenen dazu, nicht ersetzen. Ein Foto zeigt selten alles.
      const vorher = store.getFridge();
      const bekannt = new Set(vorher.map((v) => v.toLowerCase()));
      const neu = ergebnis.zutaten.filter((z) => !bekannt.has(z.toLowerCase()));
      store.setFridge([...vorher, ...neu].slice(0, 60));
      changed();
      return [
        `${ergebnis.zutaten.length} Lebensmittel erkannt, ${neu.length} davon neu: ${ergebnis.zutaten.join(", ")}.`,
        ergebnis.unsicher.length ? `Unsicher bin ich bei: ${ergebnis.unsicher.join(", ")}.` : "",
        `Im Vorrat stehen jetzt ${store.getFridge().length} Zutaten.`,
      ].filter(Boolean).join(" ");
    },

    async einkaufslisteErstellen({ tage, meiden } = {}) {
      const n = dayNumbers();
      const roh = buildShoppingList({
        targets: n.targets,
        goal: n.profile.goal,
        tage: tage ?? 7,
        vorrat: store.getFridge(),
        meiden: [...(meiden || []), ...unvertraeglichkeiten()],
      });
      // Der Stand je Posten gehört der App, nicht der Rechnung. Deshalb wird
      // er hier ergänzt und beim Neuberechnen für bekannte Posten übernommen.
      const alt = store.getShoppingList();
      const alterStand = new Map((alt?.items || []).map((i) => [i.key, i.stand]));
      const liste = {
        ...roh,
        erstelltAm: new Date().toISOString(),
        // Was der Nutzer selbst dazugeschrieben hat, bleibt beim Neurechnen
        // stehen. Sonst wäre jeder eigene Posten mit dem nächsten Tipp auf
        // "Liste rechnen" weg.
        items: [
          ...roh.items.map((item) => ({ ...item, stand: alterStand.get(item.key) || "offen" })),
          ...(alt?.items || []).filter((i) => (i.eigen || i.ausPlan) && !roh.items.some((r) => r.name.toLowerCase() === i.name.toLowerCase())),
        ],
      };
      store.setShoppingList(liste);
      changed();
      const offen = liste.items.filter((i) => i.stand === "offen");
      const top = offen.slice(0, 3).map((i) => `${i.name} ${i.menge}`).join(", ");
      return `Liste steht: ${liste.items.length} Posten für ${liste.tage} Tage, davon ${offen.length} offen. ` +
        `Die wichtigsten sind ${top}. ${liste.hinweis}`;
    },

    async einkaufslisteAbrufen() {
      return einkaufslisteText(store.getShoppingList());
    },

    async einkaufslisteAbhaken({ posten, stand }) {
      const liste = store.getShoppingList();
      if (!liste) return "Es gibt noch keine Einkaufsliste.";
      const suche = posten.toLowerCase().trim();
      const treffer = liste.items.find(
        (i) => i.name.toLowerCase() === suche || i.key === suche ||
          i.name.toLowerCase().includes(suche) || suche.includes(i.name.toLowerCase()),
      );
      if (!treffer) return `${posten} steht nicht auf der Liste.`;
      treffer.stand = stand;
      store.setShoppingList(liste);
      changed();
      const offen = liste.items.filter((i) => i.stand === "offen").length;
      const wort = { gekauft: "gekauft", zuhause: "hast du noch", offen: "wieder offen" }[stand];
      return `${treffer.name}: ${wort}. Noch ${offen} Posten offen.`;
    },

    async uebungenSuchen({ suche, ersatzFuer } = {}) {
      return uebungenSuchenText({ suche, ersatzFuer });
    },
    async wochenrueckblick() {
      return wochenrueckblickFuer().text;
    },
    async essensverlaufAbrufen({ tag, tageZurueck, woche = false, wochenZurueck = 0 } = {}) {
      const heute = todayIso();
      if (woche) {
        const n = Math.max(0, Math.min(52, Math.round(Number(wochenZurueck) || 0)));
        const t = /^\d{4}-\d{2}-\d{2}$/.test(String(tag || "")) && tag <= heute ? tag : tagPlusIso(heute, -7 * n);
        return wochenschnittText(wochenschnittFuer(t));
      }
      const zurueck = Number.isFinite(Number(tageZurueck)) ? Math.max(0, Math.min(400, Math.round(Number(tageZurueck)))) : 1;
      const t = /^\d{4}-\d{2}-\d{2}$/.test(String(tag || "")) && tag <= heute ? tag : tagPlusIso(heute, -zurueck);
      return tagesverlaufText(t);
    },
    async essensplanAbrufen({ inTagen = 0 } = {}) {
      if (!essensplanFreiFuerCoach()) {
        return "NICHT_GESPEICHERT: Der Essensplan für die Woche gehört zu Pro. Einzelne Rezepte passend zum Rest des Tages gibt es unter Rezepte.";
      }
      const plan = essensplanRechnen();
      const tag = plan.tage.find((t) => t.datum === tagPlusIso(todayIso(), inTagen));
      if (!tag) return "Der Plan reicht nicht so weit. Unter Rezepte, Wochenplan, rechnet daevo einen neuen ab heute.";
      return essensplanTagText(tag) + (plan.hinweise.length ? `\n${plan.hinweise.join(" ")}` : "");
    },

    async trainingHeute({ gruppen = [], minuten, neu = false, tag: wunschTag, uhrzeit, weglassen = [], tauschen = [] } = {}) {
      const heuteIso = todayIso();
      // Ein Tag in der Vergangenheit ist keine Bestellung. Weiter als eine
      // Woche voraus auch nicht: bis dahin hat sich der Plan geändert.
      const tag = /^\d{4}-\d{2}-\d{2}$/.test(String(wunschTag || "")) && wunschTag > heuteIso && wunschTag <= tagPlusIso(heuteIso, 7)
        ? wunschTag : heuteIso;
      const zukunft = tag !== heuteIso;
      const um = /^\d{1,2}:\d{2}$/.test(String(uhrzeit || "")) ? String(uhrzeit).padStart(5, "0") : undefined;
      const morgens = zukunft ? null : (store.getDay(tag).checkins || []).filter((c) => c.kind === "morning" && c.morgen).pop();
      if (morgens?.trainingGestrichen) {
        return `${NICHT_GESPEICHERT} Heute ist das Training nach der Nachfrage am Mittag gestrichen. Fühlst du dich besser, beantworte unter Check-ins die Nachfrage neu, dann rechne ich dir die Einheit.`;
      }
      const s = store.getSettings();
      const jetzt = bestellteEinheit(s, tag);
      // "Neue Übungen" ohne Partien meint die Einheit von heute.
      const SPLIT = { arme: ["bizeps", "trizeps"], push: ["brust", "schultern", "trizeps"], pull: ["ruecken", "bizeps"], beine: ["beine", "po"] };
      let partien = [...new Set(gruppen.map(String).flatMap((g) => SPLIT[g] ?? [g]))].filter((g) => FOKUS_NAME[g]);
      if (!partien.length && neu && jetzt) partien = jetzt.gruppen;
      // Eine einzelne Übung ändern, ohne die Einheit neu zu rechnen. Sieht der
      // Coach selbst, dass eine Übung nicht passt, oder sagt der Nutzer
      // "ohne Schulterdrücken", ändert er sie hier, statt es nur zu sagen.
      const namenWeg = (Array.isArray(weglassen) ? weglassen : []).map(String).filter(Boolean);
      const namenTausch = (Array.isArray(tauschen) ? tauschen : []).map(String).filter(Boolean);
      if ((namenWeg.length || namenTausch.length) && jetzt?.einheit && (!partien.length || [...partien].sort().join("+") === jetzt.schluessel)) {
        return einheitAendern(jetzt, tag, namenWeg, namenTausch, changed);
      }
      if (!partien.length) return `${NICHT_GESPEICHERT} Welche Partien willst du heute trainieren? Etwa Push, Pull, Beine oder Oberkörper.`;
      const schluessel = [...partien].sort().join("+");
      const verlauf = Array.isArray(s.heuteVerlauf) ? s.heuteVerlauf : [];
      const frueher = [...verlauf].reverse().find((v) => v.schluessel === schluessel && v.tag <= tag);
      const min = Math.max(20, Math.min(120, Math.round(Number(minuten ?? (neu ? jetzt?.minuten : frueher?.minuten) ?? 60) || 60)));
      // Erfahrung, Ort, Beschwerden und Fokus kommen aus dem gespeicherten
      // Plan. Ohne Plan gelten dieselben Vorgaben wie in der Planansicht.
      const w = s.plan?.wunsch || {};
      const NIVEAUS = ["beginner", "intermediate", "advanced"];
      const bauen = (variante, zuletzt = []) => einzeltrainingBauen({
        minuten: min, gruppen: partien,
        niveau: NIVEAUS.includes(w.niveau) ? w.niveau : "intermediate",
        ziel: typeof w.ziel === "string" ? w.ziel : "muskel",
        ort: typeof w.ort === "string" ? w.ort : "studio",
        beschwerden: Array.isArray(w.beschwerden) ? w.beschwerden : [],
        meiden: Array.isArray(w.meiden) ? w.meiden : [],
        fokus: Array.isArray(w.fokus) ? w.fokus : [],
        variante, zuletzt,
      }, UEBUNGEN);
      // Dieselben Partien wie schon einmal heisst dieselben Übungen, mit den
      // Tauschen von damals. Fortschritt lässt sich nur an Übungen ablesen,
      // die man wiederholt, und wer jede Woche neue nimmt, fängt jede Woche
      // bei den Gewichten von vorn an. Eine Regel von Coach Aaron. Gestützt
      // auf Kassiano und andere, J Strength Cond Res 2022: Abwechslung bringt
      // für Muskelaufbau nicht mehr, zu viel davon kann ihn bremsen.
      let variante = 0;
      let ersetzt = {};
      let wiederholt = false;
      if (neu) variante = ((jetzt?.schluessel === schluessel ? jetzt.variante : frueher?.variante) ?? 0) + 1;
      else if (frueher) {
        variante = frueher.variante ?? 0; ersetzt = frueher.ersetzt ?? {}; wiederholt = true;
        // Die Reihenfolge der Partien entscheidet mit, welche Übung welchen
        // Platz bekommt. "Trizeps, Brust" muss dieselbe Einheit ergeben wie
        // "Brust, Trizeps".
        partien = frueher.gruppen;
      }
      // Gleiche Dauer heisst genau die Einheit von damals, auch wenn sich die
      // Datenbank seitdem geändert hat. Erst bei anderer Dauer wird gerechnet.
      const damals = wiederholt && Math.abs((frueher.minuten ?? 0) - min) <= 10 && frueher.einheit?.positionen?.length ? frueher.einheit : null;
      // Neue Übungen heisst: was zuletzt dran war, steht hinten an.
      const vorher = neu ? ((jetzt?.schluessel === schluessel ? jetzt : frueher)?.einheit?.positionen ?? []).map((p) => p.id) : [];
      let einheit = damals ?? bauen(variante, vorher);
      if (!einheit && variante > 0) { variante = 0; einheit = bauen(0); }
      if (!einheit) return `${NICHT_GESPEICHERT} Für diese Partien findet die App mit deinen Beschwerden und deinem Ort keine passende Übung.`;
      const nachId = new Map(UEBUNGEN.map((u) => [u.id, u]));
      const weg = wiederholt && Array.isArray(frueher.weg) ? frueher.weg : [];
      if (!damals) einheit = {
        ...einheit,
        positionen: einheit.positionen.filter((p) => !weg.includes(p.id)).map((p) => {
          const u = nachId.get(ersetzt[p.id]);
          return u ? { ...p, id: u.id, name: u.name } : p;
        }),
      };
      const eintrag = { tag, schluessel, gruppen: partien, minuten: min, variante, ersetzt, ...(weg.length ? { weg } : {}), einheit, erstellt: new Date().toISOString(),
        ...(um ? { uhrzeit: um } : {}), ...(zukunft ? { geplant: true } : {}) };
      // Je Tag eine bestellte Einheit. Wer für morgen erst Push und dann Pull
      // sagt, meint Pull, und zwei Einheiten an einem Tag verwirren den Plan.
      const ohneHeute = verlauf.filter((v) => !(v.tag === tag && (v.schluessel === schluessel || (zukunft && v.geplant))));
      // Für einen anderen Tag bleibt die Einheit von heute, wie sie ist.
      store.setSettings({ ...store.getSettings(), ...(zukunft ? {} : { heuteTraining: eintrag }), heuteVerlauf: [...ohneHeute, eintrag].slice(-20) });
      changed();
      const log = Array.isArray(s.trainingslog) ? s.trainingslog : [];
      const zeilen = [];
      if (wiederholt && frueher.tag < tag) {
        const wann = new Date(`${frueher.tag}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
        zeilen.push(`Dieselben Übungen wie am ${wann}. Bleib dabei, solange du dich steigerst: Fortschritt siehst du nur an Übungen, die du wiederholst. Willst du trotzdem andere, tipp auf "Neue Übungen".`);
      } else if (neu) {
        zeilen.push("Neue Übungen für dieselben Partien. Nimm sie die nächsten Male wieder, dann siehst du, ob du stärker wirst.");
      }
      const wann = zukunft
        ? new Date(`${tag}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })
        : "heute";
      zeilen.push(zukunft
        ? `Training für ${wann}${um ? ` um ${um}` : ""} steht: ${einheit.fokus}, etwa ${einheit.dauerMin} Minuten. An dem Tag steht es unter "Training für heute" bereit und startet von dort.`
        : `Training für heute${um ? ` um ${um}` : ""} steht: ${einheit.fokus}, etwa ${einheit.dauerMin} Minuten. Tipp auf "Training starten", dann läuft es im Trainingsmodus. Jede Übung lässt sich dort über die drei Punkte tauschen.`);
      for (const p of einheit.positionen) {
        const st = steigerung(letzteEinheit(log, p.id, tag), p.wdh, p.reserve);
        zeilen.push(`- ${p.name}: ${p.saetze} x ${p.wdh}, ${p.reserve} in Reserve${st ? `. ${st.text}` : ""}`);
      }
      // Mit Uhrzeit gehört das Training in den Kalender: das hat er selbst
      // gesagt, und ein Termin, den er genannt hat, ist kein Vorschlag.
      if (um) {
        const { kalenderTermin, terminFinden, kannSchreiben } = await import("./kalender-schreiben.js");
        if (kannSchreiben()) {
          const titel = `Training: ${trainingsTitel(partien)}`;
          const alt = terminFinden(store.getKalender().termine || [], { suche: "training", tag });
          const k = alt?.daevo
            ? await kalenderTermin({ aktion: "verschieben", suche: alt.titel, tag, zielTag: tag, zielUhrzeit: um })
            : await kalenderTermin({ aktion: "eintragen", titel, tag, uhrzeit: um, minuten: einheit.dauerMin, erbeten: true });
          zeilen.push(k.replace(NICHT_GESPEICHERT, "Nicht im Kalender:").trim());
        }
      }
      return zeilen.join("\n");
    },

    async trainingsplanAbrufen({ inTagen = 0 } = {}) {
      const d = new Date(`${todayIso()}T12:00:00`);
      d.setDate(d.getDate() + inTagen);
      const wochentag = d.getDay();
      const wann = inTagen === 0 ? "Heute" : inTagen === 1 ? "Morgen" : `Am ${WEEKDAYS[wochentag]}`;
      const sessions = store.getProfile()?.sessions || [];
      const heute = sessions.filter((s) => s.weekday === wochentag).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      if (heute.length === 0) {
        return `${wann}, ${WEEKDAYS[wochentag]}, steht kein Training in deinem Wochenplan. Ein Ruhetag gehört zum Plan.`;
      }
      const zeilen = [`${wann}, ${WEEKDAYS[wochentag]}: ` + heute.map((s) => `${TYP_LABEL[s.type] || s.type} um ${s.startsAt}, ${s.minutes} Minuten`).join(", ") + "."];
      // Nach der Nachfrage am Mittag mit Fitheit 1 oder 2 ist das Training gestrichen.
      const morgens = inTagen === 0 ? (store.getDay(todayIso()).checkins || []).filter((c) => c.kind === "morning" && c.morgen).pop() : null;
      if (morgens?.trainingGestrichen) {
        zeilen.push(`Heute gestrichen: du hast dich auch mittags nur bei ${morgens.nachgefragt?.gesund ?? morgens.morgen.gesund} von 5 gefühlt. Der Tag gehört der Erholung.`);
        return zeilen.join("\n");
      }
      // Welche Einheit des gespeicherten Plans dran ist: die Krafttage der
      // Woche der Reihe nach, Montag zuerst, und die Einheiten A, B, C im
      // Wechsel darüber. Das ist dieselbe Zuordnung wie im Kalender.
      const plan = store.getSettings().plan;
      if (plan?.einheiten?.length && heute.some((s) => s.type === "strength")) {
        const kraft = sessions.filter((s) => s.type === "strength").sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7));
        const index = Math.max(0, kraft.findIndex((s) => s.weekday === wochentag));
        const einheit = plan.einheiten[index % plan.einheiten.length];
        zeilen.push(`Aus deinem Plan: ${einheit.titel}, ${einheit.fokus}, etwa ${einheit.dauerMin} Minuten.`);
        // Der Vorschlag für heute steht dabei, gerechnet aus dem Protokoll.
        // Sonst rät der Coach ein Gewicht, und eine Zahl aus dem Modell ist
        // in dieser App der eine Fehler, der nicht passieren darf.
        const log = Array.isArray(store.getSettings().trainingslog) ? store.getSettings().trainingslog : [];
        for (const p of einheit.positionen) {
          const st = steigerung(letzteEinheit(log, p.id, todayIso()), p.wdh, p.reserve);
          zeilen.push(`- ${p.name}: ${p.saetze} x ${p.wdh}, ${p.reserve} in Reserve${st ? `. ${st.text}` : ""}`);
        }
      } else if (heute.some((s) => s.type === "strength")) {
        zeilen.push("Einen Plan mit Übungen hast du noch nicht gespeichert. Den rechnet dir die App unter Training, Anpassen.");
      }
      return zeilen.join("\n");
    },

    async einkaufslisteErgaenzen({ posten }) {
      const alt = store.getShoppingList();
      const liste = alt ?? { tage: 7, items: [], hinweis: "", gemieden: [], erstelltAm: new Date().toISOString() };
      const neu = [];
      for (const roh of posten) {
        // "Hähnchenbrust 500 g" wird Name und Menge. Ohne Zahl bleibt die
        // Menge leer, statt geraten zu werden.
        const m = /^(.*?)\s+(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|stück|stk|packungen?|dosen?|flaschen?)?)$/i.exec(roh.trim());
        const name = (m ? m[1] : roh).trim();
        const menge = m ? m[2].trim() : "";
        const schon = liste.items.find((i) => i.name.toLowerCase() === name.toLowerCase());
        if (schon) {
          schon.stand = "offen";
          if (menge) schon.menge = menge;
        } else {
          liste.items.push({
            key: `eigen-${name.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-")}`,
            name, menge, kategorie: "sonstiges", grund: "Von dir dazugeschrieben", stand: "offen", eigen: true,
          });
        }
        neu.push(menge ? `${name} ${menge}` : name);
      }
      store.setShoppingList(liste);
      changed();
      const offen = liste.items.filter((i) => i.stand === "offen").length;
      return `Auf der Liste: ${neu.join(", ")}. Jetzt ${offen} Posten offen.`;
    },

    async standardsAbrufen() {
      const status = standardsUebersicht();
      if (status.length === 0) return "Es sind noch keine Mindeststandards vereinbart.";
      return status.map((s) => `- [${s.standard.id}] ${s.satz}`).join("\n");
    },

    async standardSetzen({ text, kadenz, art, ziel, id, uhrzeit, entfernen }) {
      const standards = ensureStandards();
      // Ohne Kennung zählt die Art. Sagt jemand "Handy nur noch dreimal die
      // Woche weg", meint er seinen Handystandard und will keinen zweiten
      // daneben. Bei "frei" gibt es keine Art, die zwei Sätze verbindet.
      const vorhanden = (id ? standards.find((s) => s.id === id) : null)
        ?? (art !== "frei" ? standards.find((s) => s.kind === art && s.aktiv) : null);
      if (entfernen) {
        if (!vorhanden) return "Diesen Standard gibt es nicht.";
        store.setStandards(standards.filter((s) => s !== vorhanden));
        changed();
        return `Standard entfernt: ${vorhanden.text}.`;
      }
      const zeit = /^([01]\d|2[0-3]):[0-5]\d$/.test(uhrzeit || "") ? uhrzeit : undefined;
      if (vorhanden) {
        const vorher = vorhanden.text;
        Object.assign(vorhanden, { text, kadenz, kind: art, ziel, aktiv: true, ...(zeit ? { uhrzeit: zeit } : {}) });
        store.setStandards(standards.slice(0, 8));
        changed();
        return `Standard geändert. Vorher: ${vorher}. Jetzt: ${text}.`;
      }
      standards.push({
        id: `std_${newId().slice(0, 8)}`,
        kind: art,
        text,
        kadenz,
        ziel,
        aktiv: true,
        seit: todayIso(),
        ...(zeit ? { uhrzeit: zeit } : {}),
      });
      store.setStandards(standards.slice(0, 8));
      changed();
      return `Standard steht: ${text}.`;
    },

    async standardAusSatz(satz) {
      const a = standardAenderungAus(satz, ensureStandards());
      if (!a) return null;
      return this.standardSetzen({ text: a.text, kadenz: a.kadenz, art: a.kind, ziel: a.ziel, id: a.id, uhrzeit: a.uhrzeit });
    },

    async trainingsplanAendern(aenderung) {
      const profil = store.getProfile();
      const r = planAendern(profil.sessions || [], aenderung);
      if (r.fehler) return `${NICHT_GESPEICHERT} ${r.fehler}`;
      store.setProfile({ ...profil, sessions: r.sessions });
      changed();
      const ziel = macroTargets({ ...profil, sessions: r.sessions });
      const angenommen = r.angenommen.length ? ` Übernommen aus dem bisherigen Plan: ${r.angenommen.join(", ")}.` : "";
      return `Trainingsplan gespeichert: ${trainingsplanText(r.sessions)}.${angenommen} Tagesziel jetzt ${ziel.kcal} kcal.`;
    },

    async verlaufAbrufen({ tage } = {}) {
      return verlaufText(Math.max(7, Math.min(120, tage || 28)));
    },

    async gewichtEintragen(kg) {
      const day = todayIso();
      store.setWeight(day, kg);
      // Das Profilgewicht muss mit. Grundumsatz, Protein, Fett und Wasserziel
      // rechnen alle gegen `profile.weightKg`, siehe packages/core/src/energy.ts.
      // Ohne diese Zeile wiegt sich jemand ein halbes Jahr lang und bekommt
      // weiterhin die Ziele aus dem Anamnesebogen.
      const profil = store.getProfile();
      const gerundet = Math.round(kg * 10) / 10;
      if (gerundet >= 30 && gerundet <= 300 && profil.weightKg !== gerundet) {
        store.setProfile({ ...profil, weightKg: gerundet });
      }
      changed();
      const trend = weightTrend(verlaufPunkte(56));
      if (!trend.belastbar) {
        return `${String(kg).replace(".", ",")} kg eingetragen. Für eine Richtung brauche ich mindestens vier Wiegungen über zwei Wochen, ` +
          `bisher sind es ${trend.messungen}.`;
      }
      return `${String(kg).replace(".", ",")} kg eingetragen. Geglättet ${String(trend.aktuellKg).replace(".", ",")} kg, ` +
        `${trend.kgProWoche > 0 ? "plus" : "minus"} ${Math.abs(trend.kgProWoche).toFixed(2).replace(".", ",")} kg je Woche ` +
        `über ${trend.spanneTage} Tage.`;
    },

    async trainingEintragen({ art, minuten, notiz }) {
      const day = todayIso();
      store.addTraining(day, { id: newId(), type: art, minutes: minuten, at: nowTime(), note: notiz || "" });
      changed();
      const heute = store.getDay(day).trainings.length;
      return `${TYP_LABEL[art] || art}, ${minuten} Minuten eingetragen. Heute ${heute} ${heute === 1 ? "Einheit" : "Einheiten"}.`;
    },

    async profilAendern(aenderung) {
      const alt = store.getProfile();
      const neu = { ...alt };
      const notiert = [];
      if (aenderung.ziel && ["fat_loss", "maintain", "lean_bulk"].includes(aenderung.ziel)) {
        neu.goal = aenderung.ziel;
        notiert.push(`Ziel auf ${{ fat_loss: "Fett verlieren", maintain: "Gewicht halten", lean_bulk: "Muskeln aufbauen" }[aenderung.ziel]}`);
      }
      if (aenderung.gewichtKg >= 30 && aenderung.gewichtKg <= 300) {
        neu.weightKg = Math.round(aenderung.gewichtKg * 10) / 10;
        notiert.push(`Gewicht auf ${neu.weightKg} kg`);
      }
      if (aenderung.schritte >= 0 && aenderung.schritte <= 60000) {
        neu.dailySteps = Math.round(aenderung.schritte);
        notiert.push(`Schritte auf ${neu.dailySteps}`);
      }
      if (/^\d{2}:\d{2}$/.test(aenderung.aufstehen || "")) {
        neu.wakeTime = aenderung.aufstehen;
        notiert.push(`Aufstehen auf ${neu.wakeTime}`);
      }
      if (/^\d{2}:\d{2}$/.test(aenderung.schlafen || "")) {
        neu.sleepTime = aenderung.schlafen;
        notiert.push(`Schlafen auf ${neu.sleepTime}`);
      }
      // Der gemessene Verbrauch ersetzt die Formel. Der Zuschlag oder Abzug
      // fürs Ziel kommt danach aus dem Rechenkern, nicht vom Modell.
      if (aenderung.verbrauch >= 1200 && aenderung.verbrauch <= 6000) {
        neu.tdeeOverrideKcal = Math.round(aenderung.verbrauch);
        notiert.push(`gemessener Verbrauch auf ${neu.tdeeOverrideKcal} kcal`);
      }
      if (notiert.length === 0) return "Da war nichts dabei, was ich ändern könnte.";
      store.setProfile(neu);
      changed();
      const z = macroTargets(neu);
      return `Geändert: ${notiert.join(", ")}. Neues Tagesziel: ${z.kcal} kcal, ${z.proteinG} g Protein.`;
    },

    async standardBestaetigen({ id, gehalten }) {
      const standards = store.getStandards();
      const standard = standards.find((s) => s.id === id);
      if (!standard) return "Diesen Standard kenne ich nicht.";
      store.setStandardConfirmed(todayIso(), id, gehalten);
      changed();
      return gehalten ? "Gehalten, eingetragen." : "Nicht gehalten, eingetragen. Morgen neuer Versuch.";
    },
  };
}

/* ---------- Gespräch ---------- */

/**
 * Streicht oder tauscht einzelne Übungen in einer bestellten Einheit. Der
 * Name wird gegen die Übungen der Einheit abgeglichen, in beide Richtungen,
 * denn das Modell schreibt "Schulterdrücken" und die Einheit heisst
 * "Schulterdrücken Langhantel". Getauscht wird gegen eine Übung derselben
 * Bewegung, nach Ort, Niveau und Beschwerden. Was gestrichen oder getauscht
 * ist, gilt auch beim nächsten Mal mit denselben Partien.
 */
function einheitAendern(eintrag, tag, weglassen, tauschen, changed = () => {}) {
  const s = store.getSettings();
  const w = s.plan?.wunsch || {};
  const wunsch = {
    niveau: ["beginner", "intermediate", "advanced"].includes(w.niveau) ? w.niveau : "intermediate",
    ort: typeof w.ort === "string" ? w.ort : "studio",
    beschwerden: Array.isArray(w.beschwerden) ? w.beschwerden : [],
    meiden: Array.isArray(w.meiden) ? w.meiden : [],
    ziel: typeof w.ziel === "string" ? w.ziel : "muskel",
  };
  const passt = (name, wunschName) => {
    const a = foldUmlauts(String(name).toLowerCase());
    const b = foldUmlauts(String(wunschName).toLowerCase()).trim();
    return b.length >= 3 && (a.includes(b) || b.includes(a));
  };
  const ersetzt = { ...(eintrag.ersetzt || {}) };
  const weg = [...(eintrag.weg || [])];
  const gestrichen = [];
  const getauscht = [];
  const ohne = [];
  let positionen = eintrag.einheit.positionen.filter((p) => {
    if (!weglassen.some((n) => passt(p.name, n))) return true;
    gestrichen.push(p.name);
    // Die Kennung von damals zählt, nicht die des Ersatzes.
    const ursprung = Object.keys(ersetzt).find((k) => ersetzt[k] === p.id) ?? p.id;
    weg.push(ursprung);
    return false;
  });
  positionen = positionen.map((p) => {
    if (!tauschen.some((n) => passt(p.name, n))) return p;
    const neu = alternativen({ wunsch, einheiten: [{ positionen }] }, 0, p.id, UEBUNGEN)[0];
    if (!neu) { ohne.push(p.name); return p; }
    getauscht.push(`${p.name} gegen ${neu.name}`);
    const ursprung = Object.keys(ersetzt).find((k) => ersetzt[k] === p.id) ?? p.id;
    ersetzt[ursprung] = neu.id;
    return { ...p, id: neu.id, name: neu.name };
  });
  if (!gestrichen.length && !getauscht.length) {
    const da = eintrag.einheit.positionen.map((p) => p.name).join(", ");
    return `${NICHT_GESPEICHERT} ${ohne.length ? `Für ${ohne.join(", ")} gibt es keine passende andere Übung.` : `Diese Übung steht nicht in der Einheit. Drin sind: ${da}.`}`;
  }
  if (!positionen.length) return `${NICHT_GESPEICHERT} Dann bliebe keine Übung übrig. Sag mir lieber, welche Partien du trainieren willst.`;
  const gerechnet = planNachrechnen({ wunsch, einheiten: [{ ...eintrag.einheit, positionen }] }, UEBUNGEN).einheiten[0];
  const neu = { ...eintrag, ersetzt, weg: [...new Set(weg)], einheit: gerechnet, geaendert: new Date().toISOString() };
  const verlauf = (Array.isArray(s.heuteVerlauf) ? s.heuteVerlauf : []).map((v) => (v.tag === eintrag.tag && v.schluessel === eintrag.schluessel ? neu : v));
  const heute = s.heuteTraining?.tag === eintrag.tag && s.heuteTraining?.schluessel === eintrag.schluessel;
  store.setSettings({ ...store.getSettings(), ...(heute ? { heuteTraining: neu } : {}), heuteVerlauf: verlauf });
  changed();
  const zeilen = [[
    gestrichen.length ? `Gestrichen: ${gestrichen.join(", ")}.` : "",
    getauscht.length ? `Getauscht: ${getauscht.join(", ")}.` : "",
    ohne.length ? `Für ${ohne.join(", ")} gibt es keine passende andere Übung, sie bleibt.` : "",
  ].filter(Boolean).join(" ") + ` Die Einheit dauert jetzt etwa ${gerechnet.dauerMin} Minuten.`];
  const log = Array.isArray(s.trainingslog) ? s.trainingslog : [];
  for (const p of gerechnet.positionen) {
    const st = steigerung(letzteEinheit(log, p.id, tag), p.wdh, p.reserve);
    zeilen.push(`- ${p.name}: ${p.saetze} x ${p.wdh}, ${p.reserve} in Reserve${st ? `. ${st.text}` : ""}`);
  }
  return zeilen.join("\n");
}

/**
 * Was die Apple Watch braucht, um selbst zu fragen, wenn das iPhone nicht
 * antworten kann.
 *
 * Ist daevo auf dem iPhone offen, beantwortet das iPhone die Frage mit dem
 * ganzen Agenten, allen Werkzeugen und dem Gedächtnis. Liegt es in der
 * Tasche, schläft die Web Ansicht, und iOS weckt sie dafür nicht. Dann fragt
 * die Uhr selbst, über denselben Server und dasselbe Konto, mit Haltung und
 * Schreibstil aus der Persona und dem Stand des Tages. Werkzeuge hat sie
 * dort keine ausser `vormerken`: was etwas einträgt, führt das iPhone beim
 * nächsten Öffnen aus. Eine Uhr, die "eingetragen" sagt, ohne dass etwas
 * eingetragen ist, wäre schlimmer als eine, die vormerkt.
 *
 * Nur mit Einwilligung und Konto, wie jede andere Anfrage an die KI.
 */
export const UHR_HINWEIS = `Er spricht gerade über die Apple Watch mit dir, das iPhone ist nicht erreichbar.
Antworte in höchstens drei kurzen Sätzen, ohne Liste und ohne Tabelle: der Bildschirm ist klein,
und die Antwort wird vorgelesen. Werkzeuge hast du hier nur eines, vormerken. Will er etwas
eintragen oder ändern, Essen, Training, Gewicht, Aufgabe, Erinnerung, Termin, rufst du vormerken mit
seinem Satz auf und schreibst davor einen Satz, dass es vorgemerkt ist und eingetragen wird, sobald
daevo auf dem iPhone offen ist. Sag nie, es sei schon eingetragen. Zahlen über ihn nimmst du nur aus
dem Stand unten, alles andere weisst du nicht.`;

export function uhrKiZugang() {
  const s = store.getSettings();
  const ueberServer = Boolean(KONFIG.chatUrl);
  if (ueberServer && !kiErlaubt(s, KONFIG)) return null;
  const token = ueberServer ? kontoToken() : "";
  if (ueberServer && !token) return null;
  if (!ueberServer && !String(s.apiKey || "").trim()) return null;
  const n = dayNumbers();
  const now = new Date();
  const { GRUNDHALTUNG, SCHREIBSTIL, GRENZEN } = PERSONA_TEILE;
  const eigene = String(s.anweisungen || "").trim();
  const system = [
    GRUNDHALTUNG, "", SCHREIBSTIL, "", GRENZEN, "", UHR_HINWEIS, "",
    "Aktueller Zeitpunkt beim letzten Abgleich:",
    `${WEEKDAYS[now.getDay()]}, ${now.getDate()}. ${now.toLocaleString("de-DE", { month: "long" })} ${now.getFullYear()}, ${nowTime()} Uhr.`,
    "", "Der Nutzer:", profilKurz(n.profile),
    "", "Sein heutiger Stand:", daySummaryText(n), "", lageText(),
    "", "Was du über ihn weißt:", brain.contextFor("", 8),
    ...(eigene ? ["", "Eigene Anweisungen des Nutzers, sie gehen allem oben vor ausser den Grenzen:", eigene.slice(0, 2000)] : []),
  ].join("\n");
  return {
    url: ueberServer ? `${KONFIG.chatUrl.replace(/\/+$/, "")}/chat` : "https://api.anthropic.com/v1/messages",
    ...(token ? { token } : {}),
    ...(!ueberServer ? { schluessel: String(s.apiKey).trim() } : {}),
    modell: "claude-sonnet-5-5",
    // Der Application Context hat eine Grenze von rund 65 Kilobyte, und die
    // Trainings brauchen ihren Teil davon.
    system: system.slice(0, 16000),
    sprechen: Boolean(s.voice?.speak),
  };
}

export async function ask(nachricht, { onChange, anhaenge = [], onStrom } = {}) {
  // Ein Anbieter für die ganze Nachricht, auch für die Werkzeuge. Der Server
  // zählt je Anbieter nur die erste Anfrage als Nachricht. Mit zwei Anbietern
  // kostete eine eingetragene Mahlzeit zwei Nachrichten aus dem Kontingent.
  // Essen eintragen zählt nicht als Nachricht, siehe `ohneZaehlung`. Mit
  // Anhang nicht: ein Foto läuft auf Opus und kostet das Fünfzigfache.
  const modusVorab = denktiefe(nachricht, anhaenge.length > 0).modus;
  const anbieter = provider({ ohneZaehlung: modusVorab === "erfassen" && anhaenge.length === 0 });
  const agent = new Agent(anbieter);
  const n = dayNumbers();
  const now = new Date();

  // Der Kontext richtet sich nach der Frage.
  //
  // Bisher bekam jede Nachricht alles: volles Profil, Standards, Einkaufsliste,
  // letzte sieben Tage, Gewichtsverlauf, zehn Notizen, vierundzwanzig
  // Nachrichten Verlauf. Beim Eintragen einer Mahlzeit ist davon nichts nötig,
  // und es wird bei jeder einzelnen Nachricht bezahlt.
  //
  // Der Modus kommt aus derselben Funktion, die der Agent für Modell und
  // Denktiefe benutzt. Sie ist deterministisch, also stimmen beide Seiten
  // überein. Alles ausser dem reinen Erfassen bekommt weiterhin den vollen
  // Kontext: an der Antwortqualität wird nicht gespart.
  const modus = denktiefe(nachricht, anhaenge.length > 0).modus;
  const knapp = modus === "erfassen";

  // Ohne Konto antwortet der eigene Server nicht. Scheiterte das Anlegen beim
  // Start, etwa ohne Netz, wird es hier nachgeholt.
  if (KONFIG.chatUrl) await kontoSicherstellen();

  const reply = await agent.respond({
    nachricht,
    verlauf: store.getChat().slice(knapp ? -6 : -24).map((m) => ({ role: m.role, content: m.text })),
    kontext: {
      profil: knapp ? profilKurz(n.profile) : profileText(n.profile),
      tag: knapp ? daySummaryText(n) : `${daySummaryText(n)}\n\n${lageText()}`,
      gedächtnis: brain.contextFor(nachricht, knapp ? 3 : 10),
      zeit: `${WEEKDAYS[now.getDay()]}, ${now.getDate()}. ${now.toLocaleString("de-DE", { month: "long" })} ${now.getFullYear()}, ${nowTime()} Uhr.`,
      eigeneAnweisungen: store.getSettings().anweisungen || "",
    },
    aktionen: buildActions({ onChange, anhaenge, anbieter }),
    modellWahl: store.getSettings().modellWahl || "auto",
    // Die alte Einstellung gilt weiter, solange keine neue dasteht. Sonst
    // liefe die App nach einem Update plötzlich auf Sparflamme.
    tempo: store.getSettings().tempo
      || (store.getSettings().immerGruendlich ? "gruendlich" : "normal"),
    // Der Text erscheint, während er entsteht. Das ändert nichts an den
    // Kosten und nichts an der Antwort, nur an der gefühlten Wartezeit.
    strom: onStrom ? { neu: () => onStrom(null), text: (stueck) => onStrom(stueck) } : undefined,
    // Ins Gespräch geht die kleine Fassung des Bildes. Das grosse Bild bekommt
    // nur die Bildauswertung in fotoAlsMahlzeit, denn dort wird die Menge
    // geschätzt. Ein PDF hat keine kleine Fassung und geht wie es ist.
    anhaenge: anhaenge.filter((a) => a.mediaType && a.data && !a.fehler)
      .map((a) => ({ mediaType: a.mediaType, data: a.chatData || a.data, name: a.name })),
  });

  // Die Meldung zum leeren Kontingent einmal in sechs Stunden. Nach der
  // Testphase stand sonst derselbe Absatz unter jeder einzelnen Antwort.
  if (reply.fehlerArt === "kontingent" && reply.nurRegel) {
    const s = store.getSettings();
    const zuletzt = Number(s.aboHinweise?.kontingentNotizUm) || 0;
    if (Date.now() - zuletzt < 6 * 3600000) reply.text = reply.nurRegel;
    else store.setSettings({ ...s, aboHinweise: { ...(s.aboHinweise || {}), kontingentNotizUm: Date.now() } });
  }

  const chat = store.getChat();
  chat.push({
    role: "user",
    text: nachricht,
    at: new Date().toISOString(),
    // Nur das Vorschaubild wandert in den Verlauf. Ganze Bilder waeren nach
    // wenigen Fotos am Limit des localStorage von rund fuenf Megabyte.
    bilder: anhaenge.filter((a) => a.vorschau).map((a) => a.vorschau).slice(0, 4),
    dateien: anhaenge.filter((a) => !a.vorschau && !a.fehler).map((a) => a.name).slice(0, 4),
  });
  chat.push({ role: "assistant", text: reply.text, at: new Date().toISOString(), ausgeführt: reply.ausgeführt });
  store.setChat(chat);
  return { ...reply, modus };
}

/**
 * Begrüssung beim Oeffnen der App.
 *
 * Bewusst ohne Modellaufruf. Wer die App öffnet, soll sofort etwas sehen und
 * nicht auf eine Antwort warten, die Geld kostet.
 */
export function greeting() {
  const { gruss, lage } = begruessung();
  return `${gruss}. ${lage}`;
}

/**
 * Gruss und Lage getrennt. Unter dem grossen Kreis steht der Gruss gross und
 * die Lage klein darunter, im Chat stünden beide in einem Satz.
 */
export function begruessung() {
  const n = dayNumbers();
  const hour = new Date().getHours();
  const name = n.profile.name ? `, ${n.profile.name}` : "";
  const gruss = hour < 11 ? `Guten Morgen${name}` : hour < 18 ? `Hallo${name}` : `Guten Abend${name}`;
  // Eine Frage statt einer Lage. Die Zahlen des Tages stehen auf Heute, und
  // ein Satz über offene Kalorien unter dem Kreis machte den Start zu einer
  // Anzeige, bevor jemand etwas gesagt hat.
  return { gruss, lage: "Wie kann ich dir weiterhelfen?" };
}

/**
 * Empfehlungen aus den eigenen Daten, ohne Modell.
 *
 * Jede Regel nennt die Zahl, auf der sie beruht. Ein Hinweis ohne Zahl ist
 * geraten und gehört nicht in eine Coaching App.
 */
export function recommendations() {
  const n = dayNumbers();
  const out = [];
  const now = new Date();

  if (n.rest.proteinG > 40 && now.getHours() >= 17) {
    out.push({
      titel: "Protein nachlegen",
      text: `Dir fehlen noch ${n.rest.proteinG} g Protein und der Tag ist fast rum. 250 g Magerquark bringen 30 g.`,
      grund: `Ziel ${n.targets.proteinG} g, bisher ${n.totals.proteinG} g.`,
    });
  }
  if (n.targets.waterMl - n.totals.waterMl > 1000 && now.getHours() >= 15) {
    out.push({
      titel: "Trinken nachholen",
      text: `Dir fehlen ${n.targets.waterMl - n.totals.waterMl} ml. Zwei große Gläser jetzt, dann liegst du wieder richtig.`,
      grund: `Ziel ${n.targets.waterMl} ml, bisher ${n.totals.waterMl} ml.`,
    });
  }
  if (n.data.meals.length === 0 && now.getHours() >= 14) {
    out.push({
      titel: "Noch nichts erfasst",
      text: "Ohne Einträge kann ich nicht rechnen. Sag mir in einem Satz, was du heute hattest.",
      grund: "Null Mahlzeiten bis jetzt.",
    });
  }

  // Mindeststandards vor allem anderen. Sie sind die Untergrenze, alles
  // andere ist Feinschliff.
  for (const status of standardsUebersicht()) {
    if (status.moeglich === 0 || status.aktuell) continue;
    if (status.quote >= 0.8) continue;
    out.push({
      titel: status.quote < 0.3 ? "Dieser Standard trägt nicht" : "Ein Standard wackelt",
      text:
        status.quote < 0.3
          ? `${status.standard.text}. Das läuft seit Wochen nicht. Setz ihn niedriger, statt ihn weiter zu reissen.`
          : `${status.standard.text}. Heute noch offen. Untergrenze, nicht Bestleistung.`,
      grund: status.satz,
    });
    break;
  }

  const liste = store.getShoppingList();
  const offeneposten = (liste?.items || []).filter((i) => i.stand === "offen");
  if (offeneposten.length > 0) {
    out.push({
      titel: "Einkauf steht noch aus",
      text: `${offeneposten.length} Posten sind offen, zuerst ${offeneposten.slice(0, 2).map((i) => i.name).join(" und ")}. ` +
        "Sag mir, was du davon noch zu Hause hast, dann streiche ich es.",
      grund: `Liste vom ${datumKurz((liste.erstelltAm || "").slice(0, 10))} für ${liste.tage} Tage.`,
    });
  }

  const letzteWoche = letzteTage(7);
  const schnitt = mittelwert(letzteWoche.map((d) => d.totals.kcal));
  if (letzteWoche.length >= 4) {
    const abweichung = Math.round(schnitt - n.targets.kcal);
    if (Math.abs(abweichung) > 250) {
      out.push({
        titel: abweichung > 0 ? "Du liegst über deinem Ziel" : "Du liegst unter deinem Ziel",
        text:
          abweichung > 0
            ? `Im Schnitt ${abweichung} kcal über dem Ziel. Bei Gewicht halten wandert das nach oben.`
            : `Im Schnitt ${Math.abs(abweichung)} kcal unter dem Ziel. Dauerhaft kostet das Kraft und Schlaf.`,
        grund: `Schnitt der letzten ${letzteWoche.length} Tage: ${Math.round(schnitt)} kcal.`,
      });
    }
  }

  const energien = letzteWoche.flatMap((d) => d.data.checkins.map((c) => c.energy).filter((e) => typeof e === "number"));
  if (energien.length >= 3 && mittelwert(energien) < 5) {
    out.push({
      titel: "Deine Energie ist unten",
      text: "Drei oder mehr Check-ins unter fünf. Das ist ein Muster, kein Ausrutscher. Schlaf und Essenszeiten zuerst.",
      grund: `Schnitt der Energie: ${mittelwert(energien).toFixed(1).replace(".", ",")} von 10.`,
    });
  }

  if (out.length === 0) {
    out.push({
      titel: "Nichts Auffälliges",
      text: "Deine Zahlen liegen im Rahmen. Weiter so, ich melde mich, wenn sich etwas dreht.",
      grund: `Tagesscore ${n.score.total} von 100.`,
    });
  }
  return out;
}

function letzteTage(anzahl) {
  const heute = todayIso();
  const out = [];
  for (let i = 0; i < anzahl; i++) {
    const d = new Date(`${heute}T12:00:00`);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const data = store.getDay(iso);
    if (data.meals.length > 0 || data.checkins.length > 0) out.push(dayNumbers(iso));
  }
  return out;
}

function mittelwert(werte) {
  if (werte.length === 0) return 0;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}

export { buildDailyReminders, daySummaryText, profileText };

/**
 * Die eigenen Erinnerungen ohne die einmaligen, die schon vorbei sind. Was
 * wegfällt, wird gleich mitgespeichert, sonst wüchse die Liste mit jeder
 * Wäsche von letzter Woche.
 */
export function erinnerungenAufgeraeumt(jetzt = { tag: todayIso(), uhrzeit: nowTime() }) {
  const s = store.getSettings();
  const alle = s.eigeneErinnerungen || [];
  const offen = alle.filter((e) => !erinnerungVorbei(e, jetzt));
  if (offen.length !== alle.length) store.setSettings({ ...s, eigeneErinnerungen: offen });
  return offen;
}

/**
 * Der Wochenrückblick aus allem, was eingetragen ist. Mittwochs ab Montag bis
 * heute, an jedem anderen Tag die Woche bis heute, sonntags die ganze Woche.
 * Ziele je Tag kommen aus `dayNumbers`, also mit Trainingstag und Korrektur.
 */
export function wochenrueckblickFuer(heute = todayIso()) {
  // Bis Mittwoch ist es ein Zwischenstand, ab Donnerstag zählt die Woche.
  const w = new Date(`${heute}T12:00:00`).getDay();
  const art = rueckblickArt(heute) ?? (w >= 1 && w <= 3 ? "zwischenstand" : "woche");
  const naechster = (t) => { const d = new Date(`${t}T12:00:00`); d.setDate(d.getDate() + 1); return todayIso(d); };
  const tage = [];
  const weitere = new Set(trainingsTageAusQuellen(store, heute));
  for (let t = wochenbeginn(heute); t <= heute; t = naechster(t)) {
    const n = dayNumbers(t);
    const d = n.data;
    tage.push({
      tag: t,
      mahlzeiten: (d.meals || []).filter((m) => (m.entries || []).length).length,
      kcal: n.totals.kcal, proteinG: n.totals.proteinG,
      zielKcal: n.targets.kcal, zielProteinG: n.targets.proteinG,
      wasserMl: n.totals.waterMl, zielWasserMl: n.targets.waterMl,
      trainings: Math.max((d.trainings || []).length, weitere.has(t) ? 1 : 0),
      geplant: (n.profile?.sessions || []).filter((x) => x.weekday === n.weekday).length,
      gewichtKg: d.weightKg ?? null,
      schlafMin: d.gesundheit?.schlafMinuten ?? null,
    });
  }
  return wochenrueckblick(tage, { art, ziel: store.getProfile()?.goal });
}

/**
 * Ein Tag als Zeile für den Essensverlauf. Ohne dayNumbers, das bei jedem
 * Aufruf alle Tage für die Serie liest: der Kalender fragt 31 Tage auf
 * einmal ab. Das Ziel rechnet mit dem Profil von heute und den gemessenen
 * Schritten dieses Tages. Ein Gewicht von damals kennt das Profil nicht.
 */
export function verlaufTag(tag, verbrauch = null) {
  const data = store.getDay(tag);
  const profile = profilFuerTag(tag);
  const summe = { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  let mahlzeiten = 0;
  for (const m of data.meals || []) {
    if ((m.entries || []).length) mahlzeiten++;
    for (const e of m.entries || []) for (const k of Object.keys(summe)) summe[k] += Number(e[k]) || 0;
  }
  const ziel = profile ? macroTargets(profile) : { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 };
  return {
    tag, mahlzeiten,
    kcal: Math.round(summe.kcal), proteinG: Math.round(summe.proteinG),
    fatG: Math.round(summe.fatG), carbsG: Math.round(summe.carbsG),
    zielKcal: ziel.kcal, zielProteinG: ziel.proteinG, zielFatG: ziel.fatG, zielCarbsG: ziel.carbsG,
    verbrauchKcal: verbrauch ?? (profile ? energyBreakdown(profile).tdeeKcal : null),
  };
}

/** Der gemessene Verbrauch aus 28 Tagen, wenn trend.ts ihn bestimmen kann. */
export function gemessenerVerbrauch() {
  const s = estimateTdee(verlaufPunkte(28));
  return s.tdeeKcal && s.tdeeKcal > 0 ? s.tdeeKcal : null;
}

/**
 * Der Schnitt der Woche, in der `tagIso` liegt, Montag bis Sonntag. Nur
 * abgeschlossene Tage: heute läuft noch, und um neun Uhr morgens stünde er
 * mit 400 kcal im Schnitt oder als unvollständig da, obwohl nichts fehlt.
 * Der Verbrauch ist gemessen, sobald es geht, sonst nach Formel je Tag.
 */
export function wochenschnittFuer(tagIso = todayIso(), gemessen = gemessenerVerbrauch()) {
  const heute = todayIso();
  const von = wochenbeginn(tagIso);
  const tage = [];
  for (let i = 0; i < 7; i++) {
    const t = tagPlusIso(von, i);
    if (t >= heute) break;
    tage.push(verlaufTag(t, gemessen));
  }
  return wochenschnitt(tage, { verbrauchQuelle: gemessen ? "gemessen" : "formel" });
}

/** Was an einem Tag gegessen wurde, als Text für Coach und Regelweg. */
export function tagesverlaufText(tagIso) {
  const t = verlaufTag(tagIso);
  const kopf = tagKurz(tagIso);
  const meals = (store.getDay(tagIso).meals || []).filter((m) => (m.entries || []).length);
  if (!meals.length) return `${kopf}: nichts eingetragen. Das heisst nicht, dass du nichts gegessen hast. Sag mir, was es war, dann trage ich es für diesen Tag nach.`;
  const zeilen = [
    `${kopf}: ${t.kcal} von ${t.zielKcal} kcal, Protein ${t.proteinG} g, Fett ${t.fatG} g, Kohlenhydrate ${t.carbsG} g.`,
    ...meals.map((m) => {
      const kcal = Math.round(m.entries.reduce((s, e) => s + e.kcal, 0));
      const was = m.source === "health" ? m.text : m.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
      return `- ${m.at} Uhr: ${was}, ${kcal} kcal`;
    }),
  ];
  if (tagIso !== todayIso() && tagStand(t) === "unvollstaendig") zeilen.push("Das liegt unter der Hälfte deines Ziels und sieht unvollständig aus. Fehlt etwas, sag es mir.");
  return zeilen.join("\n");
}

/** Ein Tausch im Training für heute gilt auch beim nächsten Mal mit denselben Partien. */
export function heuteGetauscht(altId, neueId) {
  const s = store.getSettings();
  const ht = bestellteEinheit(s, todayIso());
  const u = UEBUNGEN.find((x) => x.id === neueId);
  if (!ht?.einheit || !u) return;
  // Kennung der ursprünglich gerechneten Übung, damit ein zweiter Tausch
  // denselben Platz trifft und nicht ins Leere zeigt.
  const ursprung = Object.entries(ht.ersetzt ?? {}).find(([, v]) => v === altId)?.[0] ?? altId;
  const ersetzt = { ...(ht.ersetzt ?? {}), [ursprung]: neueId };
  const einheit = { ...ht.einheit, positionen: ht.einheit.positionen.map((p) => (p.id === altId ? { ...p, id: u.id, name: u.name } : p)) };
  const neu = { ...ht, ersetzt, einheit, geplant: undefined };
  const verlauf = (Array.isArray(s.heuteVerlauf) ? s.heuteVerlauf : []).map((v) => (v.tag === ht.tag && v.schluessel === ht.schluessel ? neu : v));
  store.setSettings({ ...s, heuteTraining: neu, heuteVerlauf: verlauf });
}

/**
 * Eine im Trainingsmodus verschobene Reihenfolge gilt auch beim nächsten Mal
 * mit denselben Partien. Wer Bizeps vor Rücken trainieren will, will das
 * nicht jede Woche neu ziehen. Übungen, die nicht in der Liste stehen,
 * bleiben hinten in ihrer alten Folge.
 */
export function heuteVerschoben(ids) {
  const s = store.getSettings();
  const ht = bestellteEinheit(s, todayIso());
  if (!ht?.einheit || !Array.isArray(ids)) return;
  const rang = (p) => { const i = ids.indexOf(p.id); return i < 0 ? ids.length : i; };
  const positionen = ht.einheit.positionen.map((p, i) => ({ p, i }))
    .sort((a, b) => rang(a.p) - rang(b.p) || a.i - b.i).map((x) => x.p);
  const neu = { ...ht, einheit: { ...ht.einheit, positionen }, geplant: undefined };
  const verlauf = (Array.isArray(s.heuteVerlauf) ? s.heuteVerlauf : []).map((v) => (v.tag === ht.tag && v.schluessel === ht.schluessel ? neu : v));
  store.setSettings({ ...s, heuteTraining: neu, heuteVerlauf: verlauf });
}

/**
 * Übungen aus der Datenbank, als Antwort im Gespräch. Mit `ersatzFuer`
 * kommen Übungen für dieselbe Bewegung, nach Ort und Beschwerden aus dem
 * gespeicherten Plan. Nur was in der Datenbank steht, hat in der App Foto,
 * Schritte und Video, deshalb nennt der Coach keine Übung aus dem Gedächtnis.
 */
export function uebungenSuchenText({ suche, ersatzFuer } = {}) {
  const zeile = (u) => `- ${u.name}: ${GERAETE[u.equipment] ?? u.equipment}, ${u.primaryMuscles.join(", ")}`;
  const w = store.getSettings().plan?.wunsch || {};
  const erlaubt = (u) => uebungErlaubt(u, { ort: w.ort, beschwerden: w.beschwerden, meiden: w.meiden });
  if (ersatzFuer) {
    const f = (t) => foldUmlauts(String(t).toLowerCase()).trim();
    const ziel = f(ersatzFuer);
    const quelle = UEBUNGEN.find((u) => f(u.name) === ziel)
      ?? UEBUNGEN.find((u) => f(u.name).startsWith(ziel))
      ?? uebungenFiltern({ text: ersatzFuer })[0];
    if (!quelle) return `"${ersatzFuer}" finde ich nicht in der Übungsdatenbank. Unter Training, Übungen kannst du suchen.`;
    const andere = UEBUNGEN.filter((u) => u.id !== quelle.id && u.pattern === quelle.pattern && u.gruppe === quelle.gruppe && erlaubt(u))
      .sort((a, b) => (a.equipment === quelle.equipment) - (b.equipment === quelle.equipment) || (a.mechanics !== quelle.mechanics) - (b.mechanics !== quelle.mechanics))
      .slice(0, 6);
    if (!andere.length) return `Für ${quelle.name} kenne ich keine Übung mit derselben Bewegung, die zu deinem Ort und deinen Beschwerden passt.`;
    return `Statt ${quelle.name}, dieselbe Bewegung:\n${andere.map(zeile).join("\n")}\nIm Trainingsmodus tauschst du sie über die drei Punkte neben dem Namen.`;
  }
  const treffer = uebungenFiltern({ text: suche || "" });
  if (!treffer.length) return `Zu "${suche}" finde ich keine Übung. Unter Training, Übungen kannst du nach Muskel und Gerät filtern.`;
  const gezeigt = treffer.slice(0, 12);
  const rest = treffer.length - gezeigt.length;
  return `${treffer.length} Übungen${suche ? ` zu "${suche}"` : ""}:\n${gezeigt.map(zeile).join("\n")}${rest > 0 ? `\nUnd ${rest} weitere unter Training, Übungen.` : ""}`;
}
