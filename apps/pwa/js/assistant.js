import {
  Agent, AnthropicProvider, Coach, addiere, buildShoppingList, cacheQuote, dollarText,
  ersparnis, hochrechnung, leereSumme, mahlzeitAusFoto, modellFuerBilder, summiere, vorratAusFoto,
} from "@daevo/coach";
import {
  buildDailyReminders,
  currentStreak,
  energyBreakdown,
  macroTargets,
  remainingBudget,
  scoreDay,
  estimateTdee,
  standardZumNachhaken,
  standardsStatus,
  suggestStandards,
  targetCorrection,
  waterTargetMl,
  weightTrend,
} from "@daevo/core";
import { brain } from "./brain.js";
import { newId, nowTime, store, todayIso } from "./storage.js";

const WEEKDAYS = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function provider() {
  const settings = store.getSettings();
  return new AnthropicProvider({
    apiKey: settings.apiKey || undefined,
    // Rückfallmodell. Welches Modell eine einzelne Nachricht wirklich
    // bekommt, entscheidet der Agent je Modus und überschreibt das hier.
    model: settings.model || "claude-opus-5",
    browserAccess: true,
    timeoutMs: 90000,
    onVerbrauch: zaehleVerbrauch,
  });
}

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

export function dayNumbers(day = todayIso()) {
  const profile = store.getProfile();
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
    `Kalorien ${n.totals.kcal} von ${n.targets.kcal}, offen ${n.rest.kcal}.`,
    `Protein ${n.totals.proteinG} von ${n.targets.proteinG} g, offen ${n.rest.proteinG} g.`,
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
      : `Bedarf ${energy.tdeeKcal} kcal, geschätzt über Mifflin-St Jeor mit Aktivitätsfaktor ${energy.activityFactor}. Tagesziel ${ziele.kcal} kcal.`,
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
 * Was sonst noch gilt: Standards, offene Einkäufe, letzte Woche in Zahlen.
 *
 * Das steht bei jeder Nachricht im Systemprompt, damit der Assistent nicht
 * erst drei Werkzeuge aufrufen muss, um zu wissen, wie es gerade steht. Die
 * genauen Zahlen holt er trotzdem aus den Werkzeugen, bevor er sie nennt.
 */
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

  const trend = weightTrend(verlaufPunkte(56));
  if (trend.belastbar) {
    zeilen.push(
      `Gewichtsverlauf: ${trend.aktuellKg} kg geglättet, ${trend.kgProWoche > 0 ? "plus" : "minus"} ` +
      `${Math.abs(trend.kgProWoche).toFixed(2)} kg je Woche über ${trend.spanneTage} Tage. ` +
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
      `${Math.abs(trend.kgProWoche).toFixed(2)} kg je Woche über ${trend.spanneTage} Tage.`,
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
  if (energien.length >= 3) zeilen.push(`Energie im Schnitt ${mittelwert(energien).toFixed(1)} von 10 aus ${energien.length} Check-ins.`);
  if (schlaf.length >= 3) zeilen.push(`Schlafqualität im Schnitt ${mittelwert(schlaf).toFixed(1)} von 10.`);
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
    state: {
      mealsLogged: n.data.meals.length,
      waterMl: n.totals.waterMl,
      waterTargetMl: n.targets.waterMl,
      morningCheckinDone: n.data.checkins.some((c) => c.kind === "morning"),
      eveningReviewDone: n.data.checkins.some((c) => c.kind === "evening"),
      offeneEinkaeufe: (liste?.items || []).filter((i) => i.stand === "offen").length,
      standardHinweis: offen ? { id: offen.standard.id, frage: standardFrage(offen) } : null,
    },
  });
}

/* ---------- Einkaufsliste ---------- */

/** Was der Nutzer nicht verträgt, aus dem Gedächtnis gelesen. */
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
  const zeilen = offen.map((i) => `- ${i.name}, ${i.menge}`);
  return [
    `Liste für ${liste.tage} Tage, ${liste.items.length} Posten. ` +
      `Offen ${offen.length}, zu Hause ${zuhause.length}, gekauft ${gekauft.length}.`,
    ...zeilen,
  ].join("\n");
}

/* ---------- Was der Assistent tun darf ---------- */

export function buildActions({ onChange, anhaenge = [] } = {}) {
  const changed = () => onChange?.();
  const anbieter = provider();
  const coach = new Coach(anbieter);
  const bilder = anhaenge.filter((a) => a.mediaType && a.data && !a.fehler);

  return {
    async mahlzeitErfassen(beschreibung) {
      const day = todayIso();
      const parsed = await coach.parseMeal(beschreibung);
      if (parsed.entries.length === 0) {
        return `Konnte nichts zuordnen. ${parsed.followUpQuestion || "Nenn mir bitte die Mengen."}`;
      }
      store.addMeal(day, {
        id: newId(),
        text: beschreibung,
        at: nowTime(),
        source: parsed.source,
        entries: parsed.entries,
        feeling: null,
      });
      changed();
      const kcal = Math.round(parsed.entries.reduce((s, e) => s + e.kcal, 0));
      const protein = Math.round(parsed.entries.reduce((s, e) => s + e.proteinG, 0));
      const posten = parsed.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
      const warnung = parsed.warnings.length ? ` ${parsed.warnings.join(" ")}` : "";
      const n = dayNumbers();
      return `Eingetragen: ${posten}. Zusammen ${kcal} kcal und ${protein} g Protein. ` +
        `Offen sind noch ${n.rest.kcal} kcal und ${Math.max(0, n.rest.proteinG)} g Protein.${warnung}`;
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

    async checkinSpeichern({ energie, schlaf, stimmung, notiz }) {
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
      changed();
      return "Check-in gespeichert.";
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
      if (hits.length === 0) return "Dazu habe ich nichts notiert.";
      return hits.map((h) => `- ${h.entry.text} (${h.entry.at.slice(0, 10)})`).join("\n");
    },

    async fotoAlsMahlzeit({ hinweis } = {}) {
      if (bilder.length === 0) return "Zu dieser Nachricht ist kein Bild dabei.";
      const modell = modellFuerBilder(store.getSettings().modellWahl || "auto");
      const ergebnis = await mahlzeitAusFoto(anbieter, bilder.slice(0, 3), hinweis || "", modell.id);
      if (ergebnis.entries.length === 0) {
        return `Auf dem Bild sehe ich kein Essen. ${ergebnis.beschreibung}`;
      }
      const day = todayIso();
      store.addMeal(day, {
        id: newId(),
        text: ergebnis.beschreibung || "Foto",
        at: nowTime(),
        source: "foto",
        entries: ergebnis.entries,
        feeling: null,
        sicherheit: ergebnis.sicherheit,
        annahme: ergebnis.annahme,
      });
      changed();
      const kcal = Math.round(ergebnis.entries.reduce((s, e) => s + e.kcal, 0));
      const protein = Math.round(ergebnis.entries.reduce((s, e) => s + e.proteinG, 0));
      const posten = ergebnis.entries.map((e) => `${e.quantity} ${e.name}`).join(", ");
      const n = dayNumbers();
      const teile = [
        `Erkannt: ${posten}.`,
        `Zusammen ${kcal} kcal und ${protein} g Protein.`,
        `Sicherheit der Mengenschätzung: ${ergebnis.sicherheit}.`,
        ergebnis.annahme ? `Angenommen: ${ergebnis.annahme}` : "",
        `Offen sind noch ${n.rest.kcal} kcal und ${Math.max(0, n.rest.proteinG)} g Protein.`,
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
        items: roh.items.map((item) => ({ ...item, stand: alterStand.get(item.key) || "offen" })),
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

    async standardsAbrufen() {
      const status = standardsUebersicht();
      if (status.length === 0) return "Es sind noch keine Mindeststandards vereinbart.";
      return status.map((s) => `- [${s.standard.id}] ${s.satz}`).join("\n");
    },

    async standardSetzen({ text, kadenz, art, ziel, id }) {
      const standards = ensureStandards();
      const vorhanden = id ? standards.find((s) => s.id === id) : null;
      if (vorhanden) {
        Object.assign(vorhanden, { text, kadenz, kind: art, ziel, aktiv: true });
      } else {
        standards.push({
          id: `std_${newId().slice(0, 8)}`,
          kind: art,
          text,
          kadenz,
          ziel,
          aktiv: true,
          seit: todayIso(),
        });
      }
      store.setStandards(standards.slice(0, 8));
      changed();
      return vorhanden ? `Standard geändert: ${text}.` : `Standard steht: ${text}.`;
    },

    async verlaufAbrufen({ tage } = {}) {
      return verlaufText(Math.max(7, Math.min(120, tage || 28)));
    },

    async gewichtEintragen(kg) {
      const day = todayIso();
      store.setWeight(day, kg);
      changed();
      const trend = weightTrend(verlaufPunkte(56));
      if (!trend.belastbar) {
        return `${kg} kg eingetragen. Für eine Richtung brauche ich mindestens vier Wiegungen über zwei Wochen, ` +
          `bisher sind es ${trend.messungen}.`;
      }
      return `${kg} kg eingetragen. Geglättet ${trend.aktuellKg} kg, ` +
        `${trend.kgProWoche > 0 ? "plus" : "minus"} ${Math.abs(trend.kgProWoche).toFixed(2)} kg je Woche ` +
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

export async function ask(nachricht, { onChange, anhaenge = [] } = {}) {
  const agent = new Agent(provider());
  const n = dayNumbers();
  const now = new Date();

  const reply = await agent.respond({
    nachricht,
    verlauf: store.getChat().slice(-24).map((m) => ({ role: m.role, content: m.text })),
    kontext: {
      profil: profileText(n.profile),
      tag: `${daySummaryText(n)}\n\n${lageText()}`,
      gedächtnis: brain.contextFor(nachricht),
      zeit: `${WEEKDAYS[now.getDay()]}, ${now.getDate()}. ${now.toLocaleString("de-DE", { month: "long" })} ${now.getFullYear()}, ${nowTime()} Uhr.`,
      eigeneAnweisungen: store.getSettings().anweisungen || "",
    },
    aktionen: buildActions({ onChange, anhaenge }),
    modellWahl: store.getSettings().modellWahl || "auto",
    anhaenge: anhaenge.filter((a) => a.mediaType && a.data && !a.fehler)
      .map((a) => ({ mediaType: a.mediaType, data: a.data, name: a.name })),
  });

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
  return reply;
}

/**
 * Begrüssung beim Oeffnen der App.
 *
 * Bewusst ohne Modellaufruf. Wer die App öffnet, soll sofort etwas sehen und
 * nicht auf eine Antwort warten, die Geld kostet.
 */
export function greeting() {
  const n = dayNumbers();
  const hour = new Date().getHours();
  const name = n.profile.name ? `, ${n.profile.name}` : "";
  const gruss = hour < 11 ? `Guten Morgen${name}` : hour < 18 ? `Hallo${name}` : `Guten Abend${name}`;

  if (n.data.meals.length === 0) {
    return `${gruss}. Noch nichts eingetragen heute. Sag mir, was du gegessen hast, oder frag mich was.`;
  }
  if (n.rest.kcal < 0) {
    return `${gruss}. Du bist ${Math.abs(n.rest.kcal)} kcal über deinem Ziel. Kein Drama, aber gut zu wissen.`;
  }
  return `${gruss}. Du hast noch ${n.rest.kcal} kcal und ${Math.max(0, n.rest.proteinG)} g Protein offen.`;
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
      grund: `Liste vom ${(liste.erstelltAm || "").slice(0, 10)} für ${liste.tage} Tage.`,
    });
  }

  const letzteWoche = letzteTage(7);
  const schnitt = mittelwert(letzteWoche.map((d) => d.totals.kcal));
  if (letzteWoche.length >= 4) {
    const abweichung = Math.round(schnitt - n.targets.kcal);
    if (Math.abs(abweichung) > 250) {
      out.push({
        titel: abweichung > 0 ? "Du liegst über deinem Schnitt" : "Du liegst unter deinem Schnitt",
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
      grund: `Schnitt der Energie: ${mittelwert(energien).toFixed(1)} von 10.`,
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
