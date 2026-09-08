import { test } from "node:test";
import assert from "node:assert/strict";
import { ORDNER, nachOrdnern, ordnerFuerGespraech, ordnerVon, sucheGespraeche, titelVon } from "./gespraeche.js";
import type { Gespraech } from "./gespraeche.js";

test("erkennt die Themen an eindeutigen Woertern", () => {
  assert.equal(ordnerVon("Ich hatte 200 g Hähnchen und Reis, wie viel Protein war das?").ordner, "ernaehrung");
  assert.equal(ordnerVon("Mein Kreuzheben stagniert seit drei Wochen bei 140 Kilo").ordner, "training");
  assert.equal(ordnerVon("Ich schlafe schlecht und bin ständig müde, mein Testosteron ist niedrig").ordner, "regeneration");
  assert.equal(ordnerVon("Ich muss meine Aufgaben für die Woche planen und Prioritäten setzen").ordner, "planung");
  assert.equal(ordnerVon("Ich habe Schuldgefühle wegen meiner Schwester und schäme mich dafür").ordner, "aengste");
});

test("ohne Treffer bleibt es Sonstiges", () => {
  const r = ordnerVon("Was hältst du eigentlich vom Wetter heute");
  assert.equal(r.ordner, "sonstiges");
  assert.equal(r.treffer, 0);
});

test("Aengste schlaegt bei Gleichstand alles andere", () => {
  // Ein Satz, der Training und Scham gleich stark trifft, ist kein
  // Trainingsgespraech.
  const r = ordnerVon("Ich schäme mich, dass ich mein Training nicht durchziehe");
  assert.equal(r.ordner, "aengste");
});

test("Wortgrenzen werden eingehalten", () => {
  // "plan" steckt in "Planet", "satz" in "Ersatz".
  assert.equal(ordnerVon("Der Planet ist schön").ordner, "sonstiges");
  assert.equal(ordnerVon("Ich brauche Ersatz dafür").ordner, "sonstiges");
});

test("nur die Nachrichten des Nutzers zaehlen fuer den Ordner", () => {
  const g = {
    nachrichten: [
      { role: "user" as const, text: "Ich schlafe seit Wochen schlecht und bin müde", at: "" },
      { role: "assistant" as const, text: "Iss mehr Protein, Kalorien hoch, Makros prüfen, Mahlzeit planen", at: "" },
    ],
  };
  assert.equal(ordnerFuerGespraech(g), "regeneration");
});

test("der Titel kommt aus dem ersten Satz des Nutzers", () => {
  assert.equal(
    titelVon([
      { role: "assistant", text: "Guten Morgen Aaron.", at: "" },
      { role: "user", text: "Wie viel Protein brauche ich? Und wann esse ich am besten?", at: "" },
    ]),
    "Wie viel Protein brauche ich?",
  );
});

test("lange Titel werden an der Wortgrenze gekuerzt", () => {
  const titel = titelVon([{
    role: "user",
    text: "Ich wollte dich mal fragen wie ich meine Woche besser strukturieren kann ohne dass ich überfordert bin",
    at: "",
  }]);
  assert.ok(titel.length <= 50, `zu lang: ${titel.length}`);
  assert.ok(titel.endsWith("…"));
  assert.ok(!titel.includes("  "));
  // Nicht mitten im Wort abgeschnitten.
  assert.ok(!/\w…$/.test(titel.replace(/\s\S*…$/, "")) || titel.split(" ").length > 3);
});

test("ohne Nutzernachricht gibt es einen Platzhalter", () => {
  assert.equal(titelVon([{ role: "assistant", text: "Hallo", at: "" }]), "Neues Gespräch");
  assert.equal(titelVon([]), "Neues Gespräch");
});

const G = (id: string, titel: string, ordner: Gespraech["ordner"], texte: string[], zuletzt: string): Gespraech => ({
  id, titel, ordner, erstellt: zuletzt, zuletzt,
  nachrichten: texte.map((t) => ({ role: "user" as const, text: t, at: zuletzt })),
});

test("die Suche findet ueber den Inhalt", () => {
  const alle = [
    G("1", "Protein", "ernaehrung", ["Wie viel Grießpudding kann ich essen"], "2026-09-01T10:00:00Z"),
    G("2", "Training", "training", ["Kreuzheben stagniert"], "2026-09-02T10:00:00Z"),
  ];
  const funde = sucheGespraeche(alle, "grießpudding");
  assert.equal(funde.length, 1);
  assert.equal(funde[0]?.gespraech.id, "1");
  assert.match(funde[0]!.stelle, /Grießpudding/);
});

test("ein Treffer im Titel wiegt schwerer", () => {
  const alle = [
    G("1", "Irgendwas", "sonstiges", ["Da ging es am Rand um Schlaf"], "2026-09-01T10:00:00Z"),
    G("2", "Schlaf", "regeneration", ["Anderes Thema hier drin"], "2026-09-01T10:00:00Z"),
  ];
  const funde = sucheGespraeche(alle, "schlaf");
  assert.equal(funde[0]?.gespraech.id, "2");
});

test("ohne Treffer kommt nichts zurueck", () => {
  const alle = [G("1", "Protein", "ernaehrung", ["Hähnchen und Reis"], "2026-09-01T10:00:00Z")];
  assert.deepEqual(sucheGespraeche(alle, "Steuererklärung"), []);
  assert.deepEqual(sucheGespraeche(alle, ""), []);
});

test("Ordnergruppen kommen sortiert und ohne leere", () => {
  const alle = [
    G("1", "A", "ernaehrung", ["x"], "2026-09-01T10:00:00Z"),
    G("2", "B", "ernaehrung", ["y"], "2026-09-05T10:00:00Z"),
    G("3", "C", "training", ["z"], "2026-09-03T10:00:00Z"),
  ];
  const gruppen = nachOrdnern(alle);
  assert.equal(gruppen.length, 2, "leere Ordner fallen raus");
  const ernaehrung = gruppen.find((g) => g.ordner.id === "ernaehrung");
  assert.equal(ernaehrung?.gespraeche[0]?.id, "2", "neuestes zuerst");
});

test("jeder Ordner hat einen Namen und eine Farbe", () => {
  for (const o of ORDNER) {
    assert.ok(o.name.length > 0);
    assert.match(o.farbe, /^#[0-9A-Fa-f]{6}$/);
  }
  assert.equal(new Set(ORDNER.map((o) => o.id)).size, ORDNER.length);
});
