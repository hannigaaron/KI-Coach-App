import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EINSTUFUNG_SYSTEM, einstufeAufgabe, einstufungText, fristAus, regelEinstufung,
} from "./einstufung.js";
import type { CoachProvider } from "./provider.js";

const HEUTE = "2026-09-07"; // ein Montag

function anbieter(antwort: unknown, verfuegbar = true): CoachProvider {
  return {
    name: "test",
    available: verfuegbar,
    async generateJson<T>() { return antwort as T; },
    async converse() { return { content: [], stopReason: "end_turn" }; },
  };
}

/* ---------- Ohne Modell ---------- */

test("Verbindliches wird als wichtig eingestuft", () => {
  assert.equal(regelEinstufung("Rechnung an Anna schicken", HEUTE).wichtigkeit, 3);
  assert.equal(regelEinstufung("Angebot für den neuen Kunden", HEUTE).wichtigkeit, 3);
});

test("Nebensächliches wird als nebensächlich eingestuft", () => {
  assert.equal(regelEinstufung("Irgendwann mal den Keller ausmisten", HEUTE).wichtigkeit, 1);
});

test("alles andere bleibt normal", () => {
  assert.equal(regelEinstufung("Zahnbürste kaufen", HEUTE).wichtigkeit, 2);
});

test("der Aufwand richtet sich nach der Art der Handlung", () => {
  assert.equal(regelEinstufung("Anna anrufen", HEUTE).minuten, 15);
  assert.equal(regelEinstufung("Angebot schreiben", HEUTE).minuten, 45);
  assert.equal(regelEinstufung("Franchise Konzept vorbereiten", HEUTE).minuten, 120);
  assert.equal(regelEinstufung("Etwas erledigen", HEUTE).minuten, 30);
});

test("die Regelfassung sagt, dass sie geraten hat", () => {
  const e = regelEinstufung("Etwas tun", HEUTE);
  assert.equal(e.regelbasiert, true);
  assert.ok(e.warum.length > 5);
});

/* ---------- Fristen aus dem Text ---------- */

test("heute, morgen und übermorgen werden zu Daten", () => {
  assert.equal(fristAus("das muss heute raus", HEUTE), "2026-09-07");
  assert.equal(fristAus("bis morgen erledigen", HEUTE), "2026-09-08");
  assert.equal(fristAus("übermorgen abgeben", HEUTE), "2026-09-09");
});

test("ein Wochentag wird zum nächsten Vorkommen", () => {
  // Montag der 7. September. Der nächste Freitag ist der 11.
  assert.equal(fristAus("bis Freitag fertig", HEUTE), "2026-09-11");
  // Der nächste Montag ist der 14., nicht heute.
  assert.equal(fristAus("am Montag abgeben", HEUTE), "2026-09-14");
});

test("ein geschriebenes Datum wird gelesen", () => {
  assert.equal(fristAus("Abgabe 12.09.", HEUTE), "2026-09-12");
  assert.equal(fristAus("Abgabe 03.11.2026", HEUTE), "2026-11-03");
});

test("ohne Frist im Text wird keine erfunden", () => {
  assert.equal(fristAus("Angebot schreiben", HEUTE), null);
  assert.equal(regelEinstufung("Angebot schreiben", HEUTE).faellig, null);
});

/* ---------- Mit Modell ---------- */

test("ohne Schlüssel läuft der Regelweg", async () => {
  const e = await einstufeAufgabe(anbieter(null, false), "Rechnung schicken", { heute: HEUTE });
  assert.equal(e.regelbasiert, true);
  assert.equal(e.wichtigkeit, 3);
});

test("das Modell liefert Einstufung und Grund", async () => {
  const e = await einstufeAufgabe(
    anbieter({ minuten: 45, wichtigkeit: 3, faellig: "2026-09-11", warum: "Geld, das schon zugesagt ist" }),
    "Angebot für Anna schreiben",
    { heute: HEUTE },
  );
  assert.equal(e.regelbasiert, undefined);
  assert.equal(e.minuten, 45);
  assert.equal(e.wichtigkeit, 3);
  assert.equal(e.faellig, "2026-09-11");
  assert.equal(e.warum, "Geld, das schon zugesagt ist");
});

test("unsinnige Werte des Modells werden begrenzt", async () => {
  const e = await einstufeAufgabe(
    anbieter({ minuten: 99999, wichtigkeit: 9, faellig: "irgendwann", warum: "" }),
    "Etwas",
    { heute: HEUTE },
  );
  assert.equal(e.minuten, 480);
  assert.equal(e.wichtigkeit, 3);
  assert.equal(e.faellig, null);
});

test("ein Fehler des Modells fällt auf den Regelweg zurück", async () => {
  const kaputt: CoachProvider = {
    name: "test", available: true,
    async generateJson<T>(): Promise<T> { throw new Error("500"); },
    async converse() { return { content: [], stopReason: "end_turn" }; },
  };
  const e = await einstufeAufgabe(kaputt, "Rechnung schicken", { heute: HEUTE });
  assert.equal(e.regelbasiert, true);
});

/* ---------- Der Prompt und die Anzeige ---------- */

test("der Prompt deckelt die Zahl der wichtigen Aufgaben", () => {
  assert.ok(EINSTUFUNG_SYSTEM.includes("Höchstens jede vierte Aufgabe ist eine 3"));
  assert.ok(EINSTUFUNG_SYSTEM.includes("Erfinde keine"));
});

test("die Anzeige nennt Aufwand, Einstufung und Grund", () => {
  const text = einstufungText({ minuten: 45, wichtigkeit: 3, faellig: "2026-09-11", warum: "Geld, das zugesagt ist" });
  assert.ok(text.includes("45 Minuten"));
  assert.ok(text.includes("wichtig"));
  assert.ok(text.includes("fällig 2026-09-11"));
  assert.ok(text.includes("Geld, das zugesagt ist"));
});
