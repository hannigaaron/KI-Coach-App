import { strict as assert } from "node:assert";
import { test } from "node:test";
import { weckwortGehoert } from "./weckwort.js";

test("die Schreibweisen, die der Nutzer selbst diktiert hat, treffen alle", () => {
  // Echte Mitschriften aus dem Betrieb. Keine davon schreibt den Namen richtig.
  for (const satz of [
    "Hey daevo, wie viel Protein fehlt mir noch",
    "hey David wie viel Protein fehlt mir noch",
    "Hey Dabo, wie viel Protein fehlt mir noch",
    "hey Devo wie viel Protein fehlt mir noch",
    "Hallo Davo, wie viel Protein fehlt mir noch",
  ]) {
    const w = weckwortGehoert(satz);
    assert.equal(w.erkannt, true, satz);
    assert.match(w.frage, /Protein/);
  }
});

test("die Frage kommt mit Umlauten und Grossschreibung zurück", () => {
  const w = weckwortGehoert("Hey daevo, wie wäre es mit Hähnchen und Süßkartoffel");
  assert.equal(w.frage, "wie wäre es mit Hähnchen und Süßkartoffel");
});

test("ohne Anrede ist es kein Weckruf", () => {
  // Der Chef dieses Nutzers heisst David. Über ihn zu reden darf die App nicht
  // wecken, sonst hört sie mitten im Satz zu und schickt Unsinn los.
  for (const satz of [
    "Ich hab heute mit David gesprochen",
    "David meinte, das Konzept passt",
    "daevo ist der Name der App",
  ]) {
    assert.equal(weckwortGehoert(satz).erkannt, false, satz);
  }
});

test("nur der Name ohne Frage wird erkannt, die Frage bleibt leer", () => {
  const w = weckwortGehoert("Hey daevo");
  assert.equal(w.erkannt, true);
  assert.equal(w.frage, "");
});

test("beim zweiten Ansetzen zählt der zweite", () => {
  const w = weckwortGehoert("Hey daevo, äh, hey daevo, trag 200 g Reis ein");
  assert.equal(w.erkannt, true);
  assert.equal(w.frage, "trag 200 g Reis ein");
});

test("eine unbekannte Schreibweise kommt über den Abstand noch durch", () => {
  // Was die Erkennung morgen erfindet, steht heute in keiner Liste.
  const w = weckwortGehoert("Hey Daewo, wie viele Kalorien hab ich noch");
  assert.equal(w.erkannt, true);
});

test("ein fremdes Wort nach der Anrede weckt nicht", () => {
  for (const satz of [
    "Hey Alina, wie war dein Training",
    "Hallo Mama",
    "Hey du",
    "Ok Google, wie spät ist es",
  ]) {
    assert.equal(weckwortGehoert(satz).erkannt, false, satz);
  }
});

test("ein leerer Text weckt nicht", () => {
  assert.equal(weckwortGehoert("").erkannt, false);
  assert.equal(weckwortGehoert("   ").erkannt, false);
});

test("die gehörte Schreibweise kommt für die Fehlersuche mit", () => {
  const w = weckwortGehoert("hey david trag 300 g Quark ein");
  assert.equal(w.gehoert, "hey david");
});
