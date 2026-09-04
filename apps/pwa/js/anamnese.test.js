import test from "node:test";
import assert from "node:assert/strict";
import { BEREICHE, SCHRITTE, auswerten } from "./anamnese.js";
import { existsSync } from "node:fs";
import { BODY_FAT_LEVELS, figurBild, figurDatei, skala } from "./silhouette.js";

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
  assert.deepEqual(skala("male"), { min: 20, max: 35 });
  assert.deepEqual(skala("female"), { min: 30, max: 45 });
  // Unbekanntes Geschlecht faellt auf maennlich zurueck statt zu brechen.
  assert.deepEqual(skala("keine Angabe"), { min: 20, max: 35 });
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

test("es gibt vier Stufen je Geschlecht, aufsteigend im Prozentwert", () => {
  for (const sex of ["male", "female"]) {
    const stufen = BODY_FAT_LEVELS[sex];
    assert.equal(stufen.length, 4);
    for (let i = 1; i < stufen.length; i++) {
      assert.ok(stufen[i].percent > stufen[i - 1].percent);
      assert.ok(stufen[i].hint.length > 20, `${sex} ${i}: Hinweis zu knapp`);
    }
  }
});
