import { test } from "node:test";
import assert from "node:assert/strict";
import { braucheZeitsparend, hatAngebot, LEERES_ANGEBOT, passenderPlan, planFuer, saubereUrl, undListe } from "./angebot.js";
import type { Trainingsplan } from "./angebot.js";

test("entfernt Werbetracker aus einer Adresse", () => {
  const roh = "https://calendly.com/personalcoach-aaron/dein-kostenloses-erstgesprach"
    + "?fbclid=PAZXh0bgNhZW0CMTEAAacWf&utm_source=google&gclid=abc";
  assert.equal(saubereUrl(roh), "https://calendly.com/personalcoach-aaron/dein-kostenloses-erstgesprach");
});

test("entfernt einen Monat aus der Vergangenheit", () => {
  // Mit month=2025-10 öffnet Calendly den Kalender in diesem Monat, und der
  // Nutzer sieht einen leeren Kalender statt freier Termine.
  const roh = "https://calendly.com/x/y?month=2025-10";
  assert.equal(saubereUrl(roh), "https://calendly.com/x/y");
});

test("behaelt Parameter, die zur Adresse gehoeren", () => {
  assert.equal(saubereUrl("https://app.example.com/plan?id=42"), "https://app.example.com/plan?id=42");
});

test("http und Unsinn werden verworfen", () => {
  assert.equal(saubereUrl("http://calendly.com/x"), "");
  assert.equal(saubereUrl("calendly.com/x"), "");
  assert.equal(saubereUrl(""), "");
  assert.equal(saubereUrl("   "), "");
});

test("ohne Link gibt es kein Angebot", () => {
  assert.equal(hatAngebot(LEERES_ANGEBOT), false);
  assert.equal(hatAngebot(null), false);
});

test("ein abgeschaltetes Angebot wird nicht gezeigt", () => {
  const a = { ...LEERES_ANGEBOT, buchungUrl: "https://calendly.com/x/y", aus: true };
  assert.equal(hatAngebot(a), false);
});

test("ein Plan allein reicht schon als Angebot", () => {
  const a = {
    ...LEERES_ANGEBOT,
    plaene: [{ id: "1", name: "P", fuerWen: "x", einheitenProWoche: 3, url: "https://x.de/p" }],
  };
  assert.equal(hatAngebot(a), true);
});

const PLAENE: Trainingsplan[] = [
  { id: "a", name: "Zweimal 30", fuerWen: "Wenig Zeit", einheitenProWoche: 2, url: "https://x.de/a" },
  { id: "b", name: "Dreier Split", fuerWen: "Fortgeschritten", einheitenProWoche: 3, url: "https://x.de/b" },
  { id: "c", name: "Fünfer", fuerWen: "Ambitioniert", einheitenProWoche: 5, url: "https://x.de/c" },
];

test("waehlt den Plan, der zum Trainingsumfang passt", () => {
  assert.equal(passenderPlan(PLAENE, 3)?.id, "b");
  assert.equal(passenderPlan(PLAENE, 5)?.id, "c");
  assert.equal(passenderPlan(PLAENE, 2)?.id, "a");
});

test("bei gleichem Abstand gewinnt der kleinere Plan", () => {
  // Vier Einheiten liegen zwischen dem Dreier und dem Fünfer. Zu viel Volumen
  // findet nicht statt, zu wenig geht langsamer voran.
  assert.equal(passenderPlan(PLAENE, 4)?.id, "b");
});

test("Plaene ohne gueltigen Link fallen raus", () => {
  const kaputt = [{ id: "x", name: "X", fuerWen: "y", einheitenProWoche: 3, url: "nicht mal eine url" }];
  assert.equal(passenderPlan(kaputt, 3), null);
});

test("ohne Angabe zum Umfang kommt der erste Plan", () => {
  assert.equal(passenderPlan(PLAENE, 0)?.id, "a");
});

/* ---------- Auswahl nach Lage ---------- */

const VIER: Trainingsplan[] = [
  { id: "mf", name: "Fortgeschritten Männer", fuerWen: "x", einheitenProWoche: 2, url: "https://alphaprogression.com/de/7GIk3i",
    fuerGeschlecht: "male", niveau: "fortgeschritten", zeitsparend: true },
  { id: "ma", name: "Anfänger Männer", fuerWen: "x", einheitenProWoche: 2, url: "https://alphaprogression.com/de/6iG0LT",
    fuerGeschlecht: "male", niveau: "anfaenger", zeitsparend: true },
  { id: "wf", name: "Fortgeschritten Frauen", fuerWen: "x", einheitenProWoche: 2, url: "https://alphaprogression.com/de/9js4Xk",
    fuerGeschlecht: "female", niveau: "fortgeschritten", zeitsparend: true },
  { id: "wa", name: "Anfänger Frauen", fuerWen: "x", einheitenProWoche: 2, url: "https://alphaprogression.com/de/1SfLlj",
    fuerGeschlecht: "female", niveau: "anfaenger", zeitsparend: true },
];

test("waehlt nach Geschlecht und Erfahrungsstand", () => {
  assert.equal(planFuer(VIER, { sex: "male", jahreTraining: 5 })?.plan.id, "mf");
  assert.equal(planFuer(VIER, { sex: "male", jahreTraining: 0.5 })?.plan.id, "ma");
  assert.equal(planFuer(VIER, { sex: "female", jahreTraining: 4 })?.plan.id, "wf");
  assert.equal(planFuer(VIER, { sex: "female", jahreTraining: 1 })?.plan.id, "wa");
});

test("zwei Jahre sind die Grenze zwischen Anfaenger und fortgeschritten", () => {
  assert.equal(planFuer(VIER, { sex: "male", jahreTraining: 1.9 })?.plan.id, "ma");
  assert.equal(planFuer(VIER, { sex: "male", jahreTraining: 2 })?.plan.id, "mf");
});

test("das Geschlecht wiegt schwerer als der Umfang", () => {
  // Ein Plan fuer Frauen ist fuer einen Mann der falsche, auch wenn die Anzahl
  // der Einheiten besser passt.
  const gemischt: Trainingsplan[] = [
    { ...VIER[0]!, einheitenProWoche: 2 },
    { ...VIER[2]!, einheitenProWoche: 4 },
  ];
  assert.equal(planFuer(gemischt, { sex: "male", jahreTraining: 5, einheitenProWoche: 4 })?.plan.id, "mf");
});

test("hoher Stress allein reicht nicht", () => {
  // Eine stressige Woche ist kein Grund, den Trainingsplan zu wechseln.
  const r = braucheZeitsparend({ stress: 80 });
  assert.equal(r.ja, false);
  assert.equal(r.gruende.length, 1);
});

test("Stress plus wenig freie Zeit reicht", () => {
  const r = braucheZeitsparend({ stress: 75, freieMinuten: 60 });
  assert.equal(r.ja, true);
  assert.ok(r.gruende.some((g) => g.includes("75")));
  assert.ok(r.gruende.some((g) => g.includes("60 freie Minuten")));
  // Nebensatzstellung, weil die Gruende an einem "Weil" haengen.
  for (const g of r.gruende) assert.ok(/(liegt|bleiben|ausmachen)$/.test(g), `kein Nebensatz: ${g}`);
});

test("Arbeit und Familie ueber 60 Prozent zaehlen als Signal", () => {
  const r = braucheZeitsparend({ stress: 70, anteile: { karriere: 0.45, beziehung: 0.2 } });
  assert.equal(r.ja, true);
  assert.ok(r.gruende.some((g) => g.includes("65 Prozent")));
});

test("eine ruhige Lage loest keine Empfehlung aus", () => {
  const r = braucheZeitsparend({ stress: 30, freieMinuten: 300, anteile: { karriere: 0.3, beziehung: 0.1 } });
  assert.equal(r.ja, false);
  assert.deepEqual(r.gruende, []);
});

test("der Treffer sagt, dass er wegen der Lage kommt", () => {
  const t = planFuer(VIER, { sex: "male", jahreTraining: 5, stress: 80, freieMinuten: 70 });
  assert.equal(t?.wegenLage, true);
  assert.ok(t?.passung.some((g) => g.includes("wenig Zeit")));
  assert.ok(t?.lageGruende.some((g) => g.includes("80")));
});

test("Planeigenschaften und Lagegruende bleiben getrennt", () => {
  // "Weil für Fortgeschrittene, dein Stresslevel liegt bei 78" ist kein Deutsch.
  const t = planFuer(VIER, { sex: "male", jahreTraining: 5, stress: 80, freieMinuten: 70 });
  assert.ok(!t?.passung.some((g) => g.includes("Stresslevel")));
  assert.ok(!t?.lageGruende.some((g) => g.includes("Fortgeschrittene")));
});

test("ohne Lage kommt kein Lagegrund", () => {
  const t = planFuer(VIER, { sex: "male", jahreTraining: 5 });
  assert.equal(t?.wegenLage, false);
  assert.deepEqual(t?.lageGruende, []);
});

test("die Aufzaehlung setzt und vor das letzte Glied", () => {
  assert.equal(undListe([]), "");
  assert.equal(undListe(["a"]), "a");
  assert.equal(undListe(["a", "b"]), "a und b");
  assert.equal(undListe(["a", "b", "c"]), "a, b und c");
});

test("ohne Angaben kommt trotzdem ein Plan", () => {
  assert.ok(planFuer(VIER, {})?.plan);
});
