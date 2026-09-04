import test from "node:test";
import assert from "node:assert/strict";
import { BEREICHE, SCHRITTE, auswerten } from "./anamnese.js";
import { BODY_FAT_LEVELS, silhouetteSvg } from "./silhouette.js";

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

test("es gibt sechs Silhouetten je Geschlecht, aufsteigend im Prozentwert", () => {
  for (const sex of ["male", "female"]) {
    const stufen = BODY_FAT_LEVELS[sex];
    assert.equal(stufen.length, 6);
    for (let i = 1; i < stufen.length; i++) {
      assert.ok(stufen[i].percent > stufen[i - 1].percent);
    }
  }
});

test("jede Silhouette ist ein gueltiges SVG und wird zur naechsten breiter", () => {
  const breiten = [];
  for (let i = 0; i < 6; i++) {
    const svg = silhouetteSvg("male", i);
    assert.match(svg, /^<svg viewBox="0 0 100 104"/);
    assert.match(svg, /<\/svg>$/);
    // Die breiteste x Koordinate im Pfad steht fuer die Taille.
    const zahlen = [...svg.matchAll(/[ ,](\d+\.\d)/g)].map((m) => Number(m[1]));
    breiten.push(Math.max(...zahlen));
  }
  for (let i = 1; i < breiten.length; i++) {
    assert.ok(breiten[i] > breiten[i - 1], `Stufe ${i} ist nicht breiter als ${i - 1}`);
  }
});
