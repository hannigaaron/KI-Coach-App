import test from "node:test";
import assert from "node:assert/strict";
import { BEREICHE, SCHRITTE, auswerten } from "./anamnese.js";
import { existsSync } from "node:fs";
import { BODY_FAT_LEVELS, figurBild, figurDatei, skala, stufeText } from "./silhouette.js";

const basis = {
  name: " Aaron ",
  bereiche: ["ernaehrung", "kraft"],
  sex: "male",
  ageYears: 23,
  heightCm: 184,
  weightKg: 87,
  goal: "maintain",
  dailySteps: 12000,
  occupation: "stehend",
  leisure: "aktiv",
  kraftErfahrung: "ueber3",
  sportProWoche: 5,
  koerperfett: { step: 1, percent: 15 },
  allergien: ["Laktose"],
  allergienFrei: "",
  krankheiten: "",
  wakeTime: "07:00",
  sleepTime: "23:00",
  handyAus: "22:00",
  handyMorgens: "07:15",
};

test("jeder Schritt hat eine Kennung und mindestens ein Feld", () => {
  const ids = new Set();
  for (const schritt of SCHRITTE) {
    assert.ok(schritt.id, "Schritt ohne id");
    assert.equal(ids.has(schritt.id), false, `doppelte id ${schritt.id}`);
    ids.add(schritt.id);
    assert.ok(schritt.felder.length > 0, `${schritt.id} hat kein Feld`);
    for (const feld of schritt.felder) assert.ok(feld.art && feld.id);
  }
});

test("auswerten baut ein vollstaendiges Profil", () => {
  const { profile } = auswerten(basis);
  assert.equal(profile.name, "Aaron");
  assert.equal(profile.weightKg, 87);
  assert.equal(profile.occupation, "stehend");
  assert.equal(profile.bodyFatPercent, 15);
  assert.equal(profile.sessions.length, 5);
});

test("ohne Angabe zum Koerperfett bleibt der Wert leer", () => {
  const { profile } = auswerten({ ...basis, koerperfett: undefined });
  assert.equal(profile.bodyFatPercent, null);
});

test("leere Antworten ergeben trotzdem ein rechenbares Profil", () => {
  const { profile } = auswerten({});
  assert.equal(profile.sex, "male");
  assert.ok(profile.ageYears >= 14);
  assert.ok(profile.heightCm >= 120);
  assert.ok(profile.weightKg >= 35);
  assert.match(profile.wakeTime, /^\d{2}:\d{2}$/);
  assert.deepEqual(profile.sessions, []);
});

test("Trainingseinheiten liegen auf verschiedenen Wochentagen", () => {
  for (let n = 1; n <= 6; n++) {
    const { sessions } = auswerten({ ...basis, sportProWoche: n });
    assert.equal(sessions.length, n);
    assert.equal(new Set(sessions.map((s) => s.weekday)).size, n);
    for (const s of sessions) assert.match(s.startsAt, /^\d{2}:\d{2}$/);
  }
});

test("mehr als sechs Einheiten werden gedeckelt", () => {
  assert.equal(auswerten({ ...basis, sportProWoche: 14 }).sessions.length, 6);
});

test("die Startzeit bleibt auch nach Mitternacht gueltig", () => {
  const { sessions } = auswerten({ ...basis, wakeTime: "16:30", sportProWoche: 1 });
  assert.equal(sessions[0].startsAt, "02:30");
});

test("jede Angabe landet als Notiz im Gedaechtnis", () => {
  const texte = auswerten(basis).notizen.map((n) => n.text).join(" ");
  assert.match(texte, /Aaron/);
  assert.match(texte, /Laktose/);
  assert.match(texte, /Ernährung, Krafttraining/);
  assert.match(texte, /07:15/);
  assert.match(texte, /15 Prozent/);
  for (const notiz of auswerten(basis).notizen) {
    assert.ok(notiz.wichtigkeit >= 1 && notiz.wichtigkeit <= 5);
    assert.ok(notiz.text.length > 3);
  }
});

test("Bereiche der Auswahl und der Auswertung passen zusammen", () => {
  const ids = new Set(BEREICHE.map((b) => b.id));
  const feld = SCHRITTE.find((s) => s.id === "bereiche").felder[0];
  assert.equal(feld.max, 3);
  for (const option of feld.optionen) assert.ok(ids.has(option.id));
});

test("zu jeder Stufe gibt es wirklich eine Bilddatei", () => {
  for (const sex of ["male", "female"]) {
    for (let i = 0; i < BODY_FAT_LEVELS[sex].length; i++) {
      const datei = figurDatei(sex, i);
      const pfad = new URL(`../img/koerperfett/${datei}`, import.meta.url);
      assert.equal(existsSync(pfad), true, `${datei} fehlt`);
    }
  }
});

test("das Bild verweist auf dieselbe Datei wie figurDatei", () => {
  for (const sex of ["male", "female"]) {
    for (let i = 0; i < BODY_FAT_LEVELS[sex].length; i++) {
      const html = figurBild(sex, i);
      assert.ok(html.includes(`./img/koerperfett/${figurDatei(sex, i)}`), html);
      // Ohne Maße im Markup springt die Auswahl beim Laden.
      assert.match(html, /width="\d+" height="\d+"/);
      assert.match(html, /alt="[^"]{10,}"/);
    }
  }
});

test("eine Stufe ausserhalb der Skala bricht nicht", () => {
  for (const wert of [-3, 99, NaN, undefined, null, "2"]) {
    const html = figurBild("male", wert);
    assert.match(html, /^<img /);
    assert.equal(html.includes("NaN"), false);
    assert.equal(html.includes("undefined"), false);
  }
});

test("die Skala nennt den kleinsten und groessten Wert mit Bild", () => {
  assert.deepEqual(skala("male"), { min: 8, max: 35 });
  assert.deepEqual(skala("female"), { min: 30, max: 45 });
  // Unbekanntes Geschlecht faellt auf maennlich zurueck statt zu brechen.
  assert.deepEqual(skala("keine Angabe"), { min: 8, max: 35 });
});

test("es gibt einen Weg fuer Werte unterhalb der Bilder", () => {
  // Die Vorlage beginnt beim Mann erst bei 20 Prozent. Wer darunter liegt,
  // braucht ein Zahlenfeld, sonst kann er sich nicht eintragen.
  const schritt = SCHRITTE.find((s) => s.id === "koerperfett");
  const feld = schritt.felder.find((f) => f.art === "zahl");
  assert.ok(feld, "kein Zahlenfeld im Schritt");
  assert.ok(feld.min < skala("male").min, "das Feld deckt den schlanken Bereich nicht ab");
});

test("ein eingetragener Wert schlaegt die gewaehlte Figur", () => {
  const antworten = { ...basis, koerperfett: { step: 2, percent: 30 }, koerperfettWert: 14 };
  assert.equal(auswerten(antworten).profile.bodyFatPercent, 14);
});

test("ein unsinniger Wert wird verworfen, die Figur bleibt", () => {
  for (const unsinn of [0, 95, -5, "viel", null]) {
    const antworten = { ...basis, koerperfett: { step: 1, percent: 25 }, koerperfettWert: unsinn };
    assert.equal(auswerten(antworten).profile.bodyFatPercent, 25, String(unsinn));
  }
});

test("ohne beides bleibt der Koerperfettanteil leer", () => {
  const antworten = { ...basis, koerperfett: undefined, koerperfettWert: undefined };
  assert.equal(auswerten(antworten).profile.bodyFatPercent, null);
});

test("sechs Stufen beim Mann, vier bei der Frau, aufsteigend im Prozentwert", () => {
  for (const sex of ["male", "female"]) {
    const stufen = BODY_FAT_LEVELS[sex];
    assert.equal(stufen.length, sex === "male" ? 6 : 4);
    for (let i = 1; i < stufen.length; i++) {
      assert.ok(stufen[i].percent > stufen[i - 1].percent);
      assert.ok(stufen[i].hint.length > 20, `${sex} ${i}: Hinweis zu knapp`);
    }
  }
});

test("der Begrüssungstext nennt keine feste Zahl an Schritten", () => {
  // Der Text nannte einmal neun Schritte, während dreizehn kamen. Die Zahl
  // steht jetzt oben im Kopf und wird gezählt, also gehört sie nicht in den
  // Text, wo sie beim nächsten Umbau wieder falsch wäre.
  const text = SCHRITTE[0].text || "";
  assert.doesNotMatch(text, /\b(neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|\d+) (kurze )?Schritte/i);
});

test("jede Seite hat einen Abschnitt für den Kopf", () => {
  for (const s of SCHRITTE) assert.ok(s.abschnitt, `${s.id} ohne Abschnitt`);
});

test("jedes Symbol in den Optionen gibt es wirklich", async () => {
  const { SYMBOLNAMEN } = await import("./symbole.js");
  for (const s of SCHRITTE) {
    if (s.tipp) assert.ok(SYMBOLNAMEN.includes(s.tipp.symbol), `${s.id}: ${s.tipp.symbol}`);
    for (const f of s.felder) {
      for (const o of f.optionen || []) {
        if (o.symbol) assert.ok(SYMBOLNAMEN.includes(o.symbol), `${s.id}: ${o.symbol}`);
      }
    }
  }
});

test("Ernährung landet als Listen im Profil, damit ein Filter sie prüfen kann", () => {
  const { profile, notizen, vorrat } = auswerten({
    ...basis, ernaehrungsform: "vegetarisch", allergien: ["Soja", "Krebstiere"],
    unvertraeglichkeiten: ["Laktose"], ausschluesse: ["Kein Alkohol"], vorrat: ["Skyr", "Eier"],
  });
  assert.equal(profile.ernaehrung.form, "vegetarisch");
  assert.deepEqual(profile.ernaehrung.allergien, ["Soja", "Krebstiere"]);
  assert.deepEqual(profile.ernaehrung.unvertraeglichkeiten, ["Laktose"]);
  assert.deepEqual(profile.ernaehrung.ausschluesse, ["Kein Alkohol"]);
  assert.deepEqual(vorrat, ["Skyr", "Eier"]);
  const texte = notizen.map((n) => n.text).join(" ");
  assert.match(texte, /Allergie, nie vorschlagen: Soja, Krebstiere/);
  assert.doesNotMatch(texte, /Verträgt kein Krebstiere/);
});

test("die Korrektur am Tagesziel geht ins Profil, null und Unsinn fallen weg", () => {
  assert.deepEqual(auswerten({ ...basis, zielKorrektur: { kcal: 150, proteinG: 0, fatG: "x" } }).profile.zielKorrektur, { kcal: 150 });
  assert.equal(auswerten({ ...basis, zielKorrektur: { kcal: 0 } }).profile.zielKorrektur, null);
  assert.equal(auswerten(basis).profile.zielKorrektur, null);
});

test("die EU Allergenliste hat genau vierzehn Einträge", async () => {
  const { ALLERGENE_EU } = await import("./anamnese.js");
  assert.equal(ALLERGENE_EU.length, 14);
  assert.equal(new Set(ALLERGENE_EU).size, 14);
});

test("eine Seite mit Leer Knopf hat kein Pflichtfeld", () => {
  // Sonst steht "Hab ich nicht, weiter" auf einem gesperrten Knopf. Genau das
  // ist beim ersten Durchlauf im Browser passiert.
  for (const s of SCHRITTE.filter((x) => x.knopfLeer)) {
    for (const f of s.felder) {
      assert.ok(["chips", "chipwahl"].includes(f.art) || f.optional, `${s.id}: ${f.id} ist Pflicht`);
    }
  }
});

test("die schlanken Stufen zeigen einen Bereich, die übrigen eine Zahl", () => {
  const [erste, zweite] = BODY_FAT_LEVELS.male;
  assert.equal(stufeText(erste), "5 bis 10 %");
  assert.equal(stufeText(zweite), "10 bis 20 %");
  assert.equal(stufeText(BODY_FAT_LEVELS.female[0]), "30 %");
  // Die Stufen müssen aufsteigen, sonst springt die Auswahl beim Antippen.
  for (const sex of ["male", "female"]) {
    const werte = BODY_FAT_LEVELS[sex].map((s) => s.percent);
    assert.deepEqual(werte, [...werte].sort((a, b) => a - b));
  }
});

test("aus dem Bogen entsteht ein Planwunsch mit Ort, Beschwerden und gemiedenen Übungen", async () => {
  const { planWunschAus } = await import("./anamnese.js");
  const w = planWunschAus({
    planVorhanden: "nein", kraftTage: "4", kraftMinuten: "60", trainingsort: "studio",
    kraftErfahrung: "ueber3", beschwerden: ["Knie", "Schulter"], schmerzUebungen: "Bankdrücken, Ausfallschritt",
  });
  assert.equal(w.tage, 4);
  assert.equal(w.minuten, 60);
  assert.equal(w.niveau, "advanced");
  assert.deepEqual(w.beschwerden, ["knie", "schulter"]);
  assert.ok(w.meiden.includes("bankdruecken"));
  assert.ok(w.meiden.includes("ausfallschritt"));
  // Wer bei seinem eigenen Plan bleibt, bekommt keinen.
  assert.equal(planWunschAus({ planVorhanden: "eigen" }), null);
});

test("die Fragen zum neuen Plan fallen weg, wenn jemand bei seinem bleibt", () => {
  const abhaengig = SCHRITTE.filter((s) => s.wenn?.id === "planVorhanden").map((s) => s.id);
  assert.deepEqual(abhaengig, ["kraftTage", "kraftMinuten", "trainingsort", "fokus"]);
  // Die Beschwerden fragt der Bogen immer: auch ein eigener Plan braucht die Information.
  assert.ok(SCHRITTE.some((s) => s.id === "beschwerden" && !s.wenn));
});

test("die Krafttage stehen im Kalender mit der gewählten Dauer, der Rest als weitere Einheiten", () => {
  const { sessions } = auswerten({ planVorhanden: "nein", kraftTage: "3", kraftMinuten: "45", sportProWoche: 5 });
  assert.equal(sessions.length, 5);
  assert.equal(sessions.filter((s) => s.type === "strength").length, 3);
  assert.ok(sessions.filter((s) => s.type === "strength").every((s) => s.minutes === 45));
});

test("der Fokus aus dem Bogen geht in den Plan, höchstens zwei, nur bekannte", async () => {
  const { planWunschAus } = await import("./anamnese.js");
  const w = planWunschAus({ planVorhanden: "nein", kraftTage: "3", kraftMinuten: "60", fokus: ["arme", "quatsch", "po", "beine"] });
  assert.deepEqual(w.fokus, ["arme", "po"]);
  assert.deepEqual(planWunschAus({ planVorhanden: "nein", kraftTage: "3" }).fokus, []);
});
