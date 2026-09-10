import { strict as assert } from "node:assert";
import { test } from "node:test";
import { energieBefund, energieBefundText, faelligerImpuls, impulseFuerTag } from "./tagesimpulse.js";

test("Ein Tag hat sechs Impulse, alle zur vollen Stunde und aufsteigend", () => {
  const impulse = impulseFuerTag("2026-09-10");
  assert.equal(impulse.length, 6);
  for (const i of impulse) assert.match(i.at, /^\d\d:00$/);
  const zeiten = impulse.map((i) => i.at);
  assert.deepEqual(zeiten, [...zeiten].sort());
});

test("Jede Stunde trägt höchstens einen Impuls", () => {
  const stunden = impulseFuerTag("2026-09-10").map((i) => i.at.slice(0, 2));
  assert.equal(new Set(stunden).size, stunden.length);
});

test("Derselbe Tag ergibt denselben Text, ein anderer Tag wechselt ihn", () => {
  const a = impulseFuerTag("2026-09-10");
  const b = impulseFuerTag("2026-09-10");
  assert.deepEqual(a, b);

  // Über eine Woche muss bei jedem Slot mit mehreren Texten mindestens ein
  // Wechsel vorkommen. Sonst steht sieben Tage lang dieselbe Nachricht da.
  for (const art of ["protein", "trinken", "shake", "pause"]) {
    const texte = new Set<string>();
    for (let tag = 1; tag <= 7; tag++) {
      const iso = `2026-09-${String(tag).padStart(2, "0")}`;
      texte.add(impulseFuerTag(iso).find((i) => i.art === art)?.text ?? "");
    }
    assert.ok(texte.size > 1, `${art} wechselt den Text nicht`);
  }
});

test("Der fällige Impuls hängt an der Stunde, nicht an der Minute", () => {
  const punkt = faelligerImpuls("2026-09-10", "14:00");
  const spaet = faelligerImpuls("2026-09-10", "14:47");
  assert.equal(punkt?.art, "energie");
  assert.deepEqual(punkt, spaet);
  assert.equal(faelligerImpuls("2026-09-10", "13:59"), null);
});

test("Die Energiefrage und die Stressfrage erwarten eine Antwort, der Hinweis nicht", () => {
  const impulse = impulseFuerTag("2026-09-10");
  assert.equal(impulse.find((i) => i.art === "energie")?.frage, true);
  assert.equal(impulse.find((i) => i.art === "stress")?.frage, true);
  assert.equal(impulse.find((i) => i.art === "trinken")?.frage, false);
});

test("Ein ungültiges Datum wirft, statt still einen Text zu wählen", () => {
  assert.throws(() => impulseFuerTag("kein Datum"), /Ungültiges Datum/);
});

const basis = {
  zielKcal: 3000,
  zielWasserMl: 3000,
  wasserMl: 1600,
  mahlzeit: { text: "Reis mit Hähnchen", kcal: 700, proteinG: 45, fatG: 15, carbsG: 90 },
  stundenSeitMahlzeit: 2,
};

test("Ab 5 von 10 gibt es keine Vorschläge", () => {
  const b = energieBefund({ ...basis, energie: 5 });
  assert.equal(b.niedrig, false);
  assert.equal(b.massnahmen.length, 0);
});

test("Unter 5 von 10 gibt es immer mindestens einen Vorschlag", () => {
  for (let energie = 1; energie <= 4; energie++) {
    const b = energieBefund({ ...basis, energie });
    assert.equal(b.niedrig, true, `Energie ${energie}`);
    assert.ok(b.massnahmen.length > 0, `Energie ${energie} ohne Vorschlag`);
  }
});

test("Ein langer Abstand zur letzten Mahlzeit steht vor der Zusammensetzung", () => {
  const b = energieBefund({ ...basis, energie: 3, stundenSeitMahlzeit: 6 });
  assert.match(b.massnahmen[0] ?? "", /6 Stunden ohne Essen/);
});

test("Eine sehr grosse Mahlzeit wird als Ursache genannt", () => {
  const b = energieBefund({
    ...basis,
    energie: 3,
    mahlzeit: { text: "Döner", kcal: 1400, proteinG: 50, fatG: 60, carbsG: 130 },
  });
  assert.match(b.massnahmen.join(" "), /1400 kcal auf einmal sind 47 Prozent/);
});

test("Viele Kohlenhydrate bei wenig Protein werden benannt", () => {
  const b = energieBefund({
    ...basis,
    energie: 2,
    mahlzeit: { text: "Nudeln", kcal: 600, proteinG: 12, fatG: 8, carbsG: 110 },
  });
  assert.match(b.massnahmen.join(" "), /Prozent der Kalorien kamen aus Kohlenhydraten/);
});

test("Ohne erfasste Mahlzeit wird keine Ursache erfunden", () => {
  const b = energieBefund({ ...basis, energie: 2, mahlzeit: null, stundenSeitMahlzeit: null });
  assert.match(b.befund.join(" "), /keine Mahlzeit erfasst/);
  assert.match(b.massnahmen.join(" "), /Trag nach/);
});

test("Schlechter Schlaf wird als wahrscheinlichere Ursache genannt", () => {
  const b = energieBefund({ ...basis, energie: 3, schlafQualitaet: 3 });
  assert.match(b.massnahmen.join(" "), /eher der Schlaf als das Essen/);
});

test("Zu wenig getrunken erzeugt eine Menge in Millilitern", () => {
  const b = energieBefund({ ...basis, energie: 3, wasserMl: 300 });
  assert.match(b.massnahmen.join(" "), /Trink jetzt \d+ ml/);
});

test("Findet sich keine Ursache in den Zahlen, steht das da", () => {
  const b = energieBefund({ ...basis, energie: 4 });
  assert.match(b.massnahmen.join(" "), /finde ich keine Ursache/);
});

test("Der Text trennt Befund und Massnahmen durch eine Leerzeile", () => {
  const text = energieBefundText(energieBefund({ ...basis, energie: 2, stundenSeitMahlzeit: 7 }));
  assert.ok(text.includes("\n\n"));
  assert.ok(text.startsWith("Energie 2 von 10."));
});
