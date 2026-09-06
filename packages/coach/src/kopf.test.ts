import { test } from "node:test";
import assert from "node:assert/strict";
import { KOPF_SYSTEM, kopfLeeren, kopfText, regelKopf } from "./kopf.js";
import type { CoachProvider } from "./provider.js";

/**
 * Kopf leeren.
 *
 * Geprüft wird zweierlei: dass der Weg ohne Modell Handlungen von Sorgen
 * trennt, und dass die Antwort des Modells gesäubert wird, bevor sie in die
 * App kommt. Ein Modell, das fünfzig Aufgaben zurückgibt, darf nicht fünfzig
 * Aufgaben anlegen.
 */

const DURCHEINANDER = `Ich muss noch das Angebot für Anna schreiben und eigentlich sollte ich
auch die Reels schneiden. Ich habe Angst, dass ich das mit YAN verpasse. David antwortet nicht auf
meine Nachricht. Ich weiss nicht ob ich das Franchise Konzept zuerst machen soll oder erst die
Website. Ich bin einfach müde die ganze Zeit.`;

function anbieter(antwort: unknown, verfuegbar = true): CoachProvider {
  return {
    name: "test",
    available: verfuegbar,
    async generateJson<T>() { return antwort as T; },
    async converse() { return { content: [], stopReason: "end_turn" }; },
  };
}

test("ohne Modell werden Handlungen von Sorgen getrennt", () => {
  const e = regelKopf(DURCHEINANDER);
  assert.ok(e.aufgaben.length >= 2, `nur ${e.aufgaben.length}`);
  assert.ok(e.aufgaben.some((a) => a.text.includes("Angebot")));
  assert.ok(e.sorgen.some((s) => s.includes("müde")));
  assert.equal(e.regelbasiert, true);
});

test("was an anderen hängt, kommt nicht in die Aufgabenliste", () => {
  const e = regelKopf("David antwortet nicht auf meine Nachricht.");
  assert.equal(e.aufgaben.length, 0);
  assert.equal(e.nichtBeeinflussbar.length, 1);
});

test("eine Entscheidung ist keine Aufgabe", () => {
  const e = regelKopf("Ich weiss nicht, ob ich zuerst nach Bali gehe oder erst das Business aufbaue.");
  assert.equal(e.aufgaben.length, 0);
  assert.ok(e.entscheidungen.length >= 1 || e.sorgen.length >= 1);
});

test("der Aufwand wird nach Art der Handlung geschätzt", () => {
  assert.equal(regelKopf("Ich muss Anna anrufen wegen des Termins.").aufgaben[0]!.minuten, 15);
  assert.equal(regelKopf("Ich muss das Angebot schreiben für den neuen Kunden.").aufgaben[0]!.minuten, 45);
  assert.equal(regelKopf("Ich muss das Franchise Konzept vorbereiten für David.").aufgaben[0]!.minuten, 120);
});

test("ohne Schlüssel läuft der Regelweg, ohne dass es kracht", async () => {
  const e = await kopfLeeren(anbieter(null, false), DURCHEINANDER);
  assert.equal(e.regelbasiert, true);
});

test("das Modell liefert die geordnete Fassung", async () => {
  const e = await kopfLeeren(anbieter({
    kern: "Du hast drei Baustellen und keine davon angefangen.",
    aufgaben: [{ text: "Angebot für Anna schreiben", minuten: 45, wichtigkeit: 3, warum: "Geld, das schon zugesagt ist" }],
    entscheidungen: ["Franchise Konzept oder Website zuerst?"],
    sorgen: ["Angst, YAN zu verpassen"],
    nichtBeeinflussbar: ["David antwortet nicht"],
    ersterSchritt: "Angebot für Anna schreiben",
    rueckfrage: "",
  }), DURCHEINANDER);
  assert.equal(e.regelbasiert, undefined);
  assert.equal(e.aufgaben[0]!.text, "Angebot für Anna schreiben");
  assert.equal(e.ersterSchritt, "Angebot für Anna schreiben");
});

test("mehr als zwölf Aufgaben werden abgeschnitten", async () => {
  const viele = Array.from({ length: 30 }, (_, i) => ({
    text: `Aufgabe ${i}`, minuten: 30, wichtigkeit: 2, warum: "x",
  }));
  const e = await kopfLeeren(anbieter({ kern: "k", aufgaben: viele, ersterSchritt: "" }), "egal");
  assert.equal(e.aufgaben.length, 12);
});

test("unsinnige Werte des Modells werden begrenzt", async () => {
  const e = await kopfLeeren(anbieter({
    kern: "k",
    aufgaben: [{ text: "Etwas tun", minuten: 99999, wichtigkeit: 9, warum: "" }],
    ersterSchritt: "",
  }), "egal");
  assert.equal(e.aufgaben[0]!.minuten, 480);
  assert.equal(e.aufgaben[0]!.wichtigkeit, 3);
});

test("ohne ersten Schritt wird die erste Aufgabe genommen", async () => {
  const e = await kopfLeeren(anbieter({
    kern: "k",
    aufgaben: [{ text: "Angebot schreiben", minuten: 45, wichtigkeit: 3, warum: "x" }],
    ersterSchritt: "",
  }), "egal");
  assert.equal(e.ersterSchritt, "Angebot schreiben");
});

test("ein Fehler des Modells fällt auf den Regelweg zurück", async () => {
  const kaputt: CoachProvider = {
    name: "test", available: true,
    async generateJson<T>(): Promise<T> { throw new Error("500"); },
    async converse() { return { content: [], stopReason: "end_turn" }; },
  };
  const e = await kopfLeeren(kaputt, DURCHEINANDER);
  assert.equal(e.regelbasiert, true);
  assert.ok(e.aufgaben.length > 0);
});

test("der Text nennt zuerst den Kern und dann die eine erste Sache", () => {
  const text = kopfText({
    kern: "Du hast drei Baustellen.",
    aufgaben: [{ text: "Angebot schreiben", minuten: 45, wichtigkeit: 3, warum: "Geld" }],
    entscheidungen: [], sorgen: ["Angst, YAN zu verpassen"], nichtBeeinflussbar: [],
    ersterSchritt: "Angebot schreiben", rueckfrage: "",
  });
  const zeilen = text.split("\n");
  assert.equal(zeilen[0], "Du hast drei Baustellen.");
  assert.ok(zeilen[2]!.startsWith("Fang hiermit an:"));
  assert.ok(text.includes("keine Aufgabe"));
});

test("der Systemprompt trennt Aufgabe, Entscheidung und Sorge", () => {
  for (const wort of ["Aufgabe.", "Entscheidung.", "Sorge.", "Nicht beeinflussbar."]) {
    assert.ok(KOPF_SYSTEM.includes(wort), wort);
  }
  assert.ok(KOPF_SYSTEM.includes("Erfinde nichts dazu"));
});
