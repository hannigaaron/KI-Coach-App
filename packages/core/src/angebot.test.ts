import { test } from "node:test";
import assert from "node:assert/strict";
import { hatAngebot, LEERES_ANGEBOT, passenderPlan, saubereUrl } from "./angebot.js";
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
