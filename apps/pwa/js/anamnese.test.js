import test from "node:test";
import assert from "node:assert/strict";
import { BEREICHE, SCHRITTE, auswerten } from "./anamnese.js";
import { BODY_FAT_LEVELS, koerpermasse, silhouetteSvg } from "./silhouette.js";

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

test("jede Silhouette ist ein gueltiges SVG", () => {
  for (const sex of ["male", "female"]) {
    for (let i = 0; i < 6; i++) {
      const svg = silhouetteSvg(sex, i);
      assert.match(svg, /^<svg viewBox="0 0 128 282"/);
      assert.match(svg, /<\/svg>$/);
      assert.equal(svg.includes("NaN"), false);
    }
  }
});

test("Taille, Bauch und Oberschenkel wachsen mit jeder Stufe", () => {
  for (const sex of ["male", "female"]) {
    for (let i = 1; i < 6; i++) {
      const vorher = koerpermasse(sex, i - 1);
      const jetzt = koerpermasse(sex, i);
      for (const teil of ["taille", "nabel", "oberschenkel", "huefte"]) {
        assert.ok(jetzt[teil] > vorher[teil], `${sex} ${teil}: Stufe ${i} nicht breiter als ${i - 1}`);
      }
    }
  }
});

test("die Taille wächst schneller als die Schulter", () => {
  // Das ist der Kern der Darstellung. Wachsen beide gleich schnell, sehen
  // alle sechs Stufen gleich aus, nur grösser.
  for (const sex of ["male", "female"]) {
    const unten = koerpermasse(sex, 0);
    const oben = koerpermasse(sex, 5);
    const taille = oben.taille / unten.taille;
    const schulter = oben.schulter / unten.schulter;
    assert.ok(taille > schulter * 1.5, `${sex}: Taille ${taille.toFixed(2)}, Schulter ${schulter.toFixed(2)}`);
  }
});

test("die Proportionen bleiben menschlich", () => {
  for (const sex of ["male", "female"]) {
    for (let i = 0; i < 6; i++) {
      const m = koerpermasse(sex, i);
      // Kopfhöhe 35 Einheiten bei 282 Gesamthöhe, also gut siebeneinhalb Kopf.
      assert.ok(m.kopf > 10 && m.kopf < 14);
      // Die Figur muss in den Entwurfsraum von 128 passen, Arme eingerechnet.
      const breiteste = Math.max(m.schulter, m.brust, m.nabel, m.huefte);
      assert.ok(breiteste + m.unterarm * 0.75 + m.hand < 64, `${sex} Stufe ${i} läuft aus dem Bild`);
    }
  }
  // Bei der Frau ist die Hüfte breiter als die Schulter, beim Mann umgekehrt.
  assert.ok(koerpermasse("female", 0).huefte > koerpermasse("female", 0).schulter);
  assert.ok(koerpermasse("male", 0).schulter > koerpermasse("male", 0).huefte);
});

test("die Kennungen der Verläufe sind je Figur eindeutig", () => {
  // Mehrere Figuren stehen gleichzeitig auf der Seite. Gleiche Kennungen
  // würden dazu führen, dass alle den Verlauf der ersten benutzen.
  const alle = new Set();
  for (const sex of ["male", "female"]) {
    for (let i = 0; i < 6; i++) {
      for (const treffer of silhouetteSvg(sex, i).matchAll(/id="([^"]+)"/g)) {
        assert.equal(alle.has(treffer[1]), false, `Kennung ${treffer[1]} kommt doppelt vor`);
        alle.add(treffer[1]);
      }
    }
  }
});

test("jeder Verweis auf einen Verlauf zeigt auf eine vorhandene Kennung", () => {
  for (const sex of ["male", "female"]) {
    for (let i = 0; i < 6; i++) {
      const svg = silhouetteSvg(sex, i);
      const vorhanden = new Set([...svg.matchAll(/id="([^"]+)"/g)].map((t) => t[1]));
      for (const treffer of svg.matchAll(/url\(#([^)]+)\)/g)) {
        assert.equal(vorhanden.has(treffer[1]), true, `${treffer[1]} fehlt in defs`);
      }
    }
  }
});

test("eine Stufe ausserhalb der Skala bricht nicht", () => {
  for (const wert of [-3, 99, NaN, undefined, null, "2"]) {
    const svg = silhouetteSvg("male", wert);
    assert.match(svg, /^<svg /);
    assert.equal(svg.includes("NaN"), false);
    assert.equal(svg.includes("undefined"), false);
  }
});
