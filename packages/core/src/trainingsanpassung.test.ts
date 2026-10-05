import assert from "node:assert/strict";
import test from "node:test";
import type { Bereitschaft } from "./bereitschaft.js";
import { anpassungText, trainingAnpassen, type GeplanteEinheit } from "./trainingsanpassung.js";

const KRAFT: GeplanteEinheit = { art: "strength", minuten: 75, quelle: "deinem Trainingsplan" };

function bereit(urteil: Bereitschaft["urteil"], wert = 40): Bereitschaft {
  const teil = { name: "Energie", wert: 30, gewicht: 30, quelle: "deinem Morgen Check-in" };
  return { wert, urteil, teile: [teil], schwaechster: teil };
}

test("ohne Signal bleibt alles wie geplant", () => {
  const an = trainingAnpassen({ schlafMinuten: 450, schlafQualitaet: 8, stress: 30, geplant: KRAFT });
  assert.equal(an.stufe, "normal");
  assert.equal(an.volumenFaktor, 1);
  assert.match(an.anweisungen.join(" "), /wie geplant, 75 Minuten/);
});

test("kurzer Schlaf allein nimmt etwas zurück und nennt die Quelle", () => {
  const an = trainingAnpassen({ schlafMinuten: 320, geplant: KRAFT });
  assert.equal(an.stufe, "reduziert");
  assert.equal(an.reserveZusatz, 1);
  assert.match(an.gruende[0]!, /5 Stunden 20 Minuten Schlaf/);
  assert.match(an.gruende[0]!, /Craven/);
});

test("schlechte Qualität zählt auch bei langer Nacht", () => {
  assert.equal(trainingAnpassen({ schlafMinuten: 480, schlafQualitaet: 3 }).stufe, "reduziert");
});

test("Schlaf und Stress zusammen machen den Tag leicht", () => {
  const an = trainingAnpassen({ schlafMinuten: 300, stress: 80, geplant: KRAFT });
  assert.equal(an.stufe, "leicht");
  assert.equal(an.volumenFaktor, 0.5);
  assert.equal(an.reserveZusatz, 2);
  assert.match(an.anweisungen.join(" "), /bei vier Sätzen also 2/);
  assert.match(an.anweisungen.join(" "), /Pause ist heute ebenfalls vertretbar/);
});

test("die Bereitschaft zählt nicht doppelt zum schlechten Schlaf", () => {
  const an = trainingAnpassen({ schlafMinuten: 300, bereitschaft: bereit("runterfahren") });
  assert.equal(an.stufe, "reduziert");
});

test("die Bereitschaft allein zählt, wenn sonst nichts da ist", () => {
  assert.equal(trainingAnpassen({ bereitschaft: bereit("runterfahren") }).stufe, "reduziert");
});

test("fehlende Werte zählen nicht als Null", () => {
  // Number(null) ist 0. Ohne eigene Prüfung wäre das "0 Minuten Schlaf".
  const an = trainingAnpassen({ schlafMinuten: null, schlafQualitaet: null, stress: null });
  assert.equal(an.stufe, "normal");
});

test("ein voller Kalender kürzt die Dauer, nicht die Intensität", () => {
  const an = trainingAnpassen({ freieMinuten: 60, geplant: KRAFT });
  assert.equal(an.stufe, "normal");
  assert.equal(an.reserveZusatz, 0);
  assert.equal(an.maxMinuten, 45);
  assert.match(an.anweisungen.join(" "), /gedeckelt auf 45 Minuten/);
});

test("reicht die Zeit gar nicht, gibt es keine Einheit, sondern eine Alternative", () => {
  const an = trainingAnpassen({ freieMinuten: 25, geplant: KRAFT });
  assert.equal(an.maxMinuten, 10);
  assert.match(an.anweisungen[0]!, /reicht die Zeit heute nicht/);
});

test("Ausdauer wird über Dauer und Tempo angepasst", () => {
  const an = trainingAnpassen({ stress: 70, geplant: { art: "cardio", minuten: 40, quelle: "Plan" } });
  assert.match(an.anweisungen.join(" "), /in ganzen Sätzen unterhalten/);
});

test("der Text sagt bei jeder Anpassung, dass sie eine Regel ist", () => {
  const text = anpassungText(trainingAnpassen({ schlafMinuten: 300, geplant: KRAFT }), KRAFT);
  assert.match(text, /Krafttraining, 75 Minuten, aus deinem Trainingsplan/);
  assert.match(text, /Regel der App und keine Messung/);
  const normal = anpassungText(trainingAnpassen({}), null);
  assert.doesNotMatch(normal, /Regel der App/);
});

test("was der Nutzer sagt, zählt als Signal, ohne eine Zahl zu erfinden", () => {
  const an = trainingAnpassen({ angaben: { schlechtGeschlafen: true, gestresst: true }, geplant: KRAFT });
  assert.equal(an.stufe, "leicht");
  assert.match(an.gruende.join(" "), /Du hast gesagt, dass du schlecht geschlafen hast/);
  assert.match(an.gruende.join(" "), /Du hast gesagt, dass du gestresst bist/);
  assert.doesNotMatch(an.gruende.join(" "), /von 10|von 100/);
});

test("Aussage und Messung zum Schlaf zählen nur einmal", () => {
  assert.equal(trainingAnpassen({ schlafMinuten: 300, angaben: { schlechtGeschlafen: true } }).stufe, "reduziert");
});
