import { test } from "node:test";
import assert from "node:assert/strict";
import { termineAmTag, termineAusIcs, uhrzeit } from "./ical.js";

/**
 * Der Kalender.
 *
 * Geprüft wird gegen echte Ausschnitte aus dem, was Google Calendar und der
 * Apple Kalender exportieren. Ein Parser, der nur die eigene Beispieldatei
 * liest, ist wertlos.
 */

const FENSTER = {
  von: new Date("2026-09-01T00:00:00").getTime(),
  bis: new Date("2026-10-01T00:00:00").getTime(),
};

function ics(...zeilen: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...zeilen, "END:VCALENDAR"].join("\r\n");
}

test("ein einfacher Termin wird gelesen", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT",
    "UID:abc",
    "SUMMARY:Kunde Anna",
    "LOCATION:DaFITs",
    "DTSTART;TZID=Europe/Berlin:20260907T100000",
    "DTEND;TZID=Europe/Berlin:20260907T110000",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine.length, 1);
  assert.equal(termine[0]!.titel, "Kunde Anna");
  assert.equal(termine[0]!.ort, "DaFITs");
  assert.equal(termine[0]!.bis - termine[0]!.von, 3600_000);
});

test("eine Zeitzone wird umgerechnet, nicht als Ortszeit angenommen", () => {
  // 10 Uhr Berlin im September ist 08:00 UTC, weil Sommerzeit gilt.
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Termin",
    "DTSTART;TZID=Europe/Berlin:20260907T100000",
    "DTEND;TZID=Europe/Berlin:20260907T110000",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(new Date(termine[0]!.von).toISOString(), "2026-09-07T08:00:00.000Z");
});

test("Zeiten in UTC werden als UTC gelesen", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Call",
    "DTSTART:20260907T140000Z", "DTEND:20260907T143000Z",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(new Date(termine[0]!.von).toISOString(), "2026-09-07T14:00:00.000Z");
});

test("umgebrochene Zeilen werden wieder zusammengesetzt", () => {
  // Google bricht bei 75 Zeichen um. Ohne Entfalten fehlt der halbe Titel.
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a",
    "SUMMARY:Athletiktraining mit der ersten Mannschaft in der grossen",
    "  Halle am Sportplatz",
    "DTSTART;TZID=Europe/Berlin:20260907T180000",
    "DTEND;TZID=Europe/Berlin:20260907T200000",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine[0]!.titel, "Athletiktraining mit der ersten Mannschaft in der grossen Halle am Sportplatz");
});

test("Sonderzeichen im Titel werden entschärft", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a",
    "SUMMARY:Kunde\\, Probetraining\; 60 Minuten",
    "DTSTART:20260907T090000Z", "DTEND:20260907T100000Z",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine[0]!.titel, "Kunde, Probetraining; 60 Minuten");
});

test("ein ganztägiger Termin bleibt ganztägig", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Urlaub",
    "DTSTART;VALUE=DATE:20260910", "DTEND;VALUE=DATE:20260911",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine[0]!.ganztags, true);
  assert.equal(termine[0]!.bis - termine[0]!.von, 86400_000);
});

test("eine wöchentliche Serie wird aufgelöst", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:volley", "SUMMARY:Volleyball",
    "DTSTART;TZID=Europe/Berlin:20260901T190000",
    "DTEND;TZID=Europe/Berlin:20260901T210000",
    "RRULE:FREQ=WEEKLY;BYDAY=TU,TH",
    "END:VEVENT",
  ), FENSTER);
  // September 2026 beginnt an einem Dienstag. Dienstage und Donnerstage im
  // Fenster: 1., 3., 8., 10., 15., 17., 22., 24., 29. Der 1. ist der Start.
  assert.ok(termine.length >= 8, `nur ${termine.length}`);
  for (const t of termine) {
    const tag = new Date(t.von).getDay();
    assert.ok(tag === 2 || tag === 4, `${new Date(t.von).toISOString()} ist Tag ${tag}`);
  }
});

test("COUNT begrenzt die Serie", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Reha",
    "DTSTART;TZID=Europe/Berlin:20260902T080000",
    "DTEND;TZID=Europe/Berlin:20260902T090000",
    "RRULE:FREQ=DAILY;COUNT=3",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine.length, 3);
});

test("UNTIL begrenzt die Serie", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Reha",
    "DTSTART;TZID=Europe/Berlin:20260902T080000",
    "DTEND;TZID=Europe/Berlin:20260902T090000",
    "RRULE:FREQ=DAILY;UNTIL=20260905T235959Z",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine.length, 4);
});

test("ein abgesagter Einzeltermin einer Serie fällt raus", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Zirkeltraining",
    "DTSTART;TZID=Europe/Berlin:20260902T080000",
    "DTEND;TZID=Europe/Berlin:20260902T090000",
    "RRULE:FREQ=DAILY;COUNT=3",
    "EXDATE;TZID=Europe/Berlin:20260903T080000",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine.length, 2);
});

test("Termine ausserhalb des Fensters kommen nicht mit", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Alt",
    "DTSTART:20200101T090000Z", "DTEND:20200101T100000Z",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine.length, 0);
});

test("ein Eintrag ohne Beginn wird gezählt, nicht still verschluckt", () => {
  const ergebnis = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Kaputt", "END:VEVENT",
  ), FENSTER);
  assert.equal(ergebnis.termine.length, 0);
  assert.equal(ergebnis.uebersprungen, 1);
  assert.ok(ergebnis.hinweise.some((h) => h.includes("übersprungen")));
});

test("der Kalendername wird gelesen", () => {
  const ergebnis = termineAusIcs(ics("X-WR-CALNAME:Arbeit"), FENSTER);
  assert.equal(ergebnis.kalendername, "Arbeit");
});

test("DURATION statt DTEND wird verstanden", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Call",
    "DTSTART:20260907T140000Z", "DURATION:PT45M",
    "END:VEVENT",
  ), FENSTER);
  assert.equal(termine[0]!.bis - termine[0]!.von, 45 * 60000);
});

test("Termine eines Tages werden richtig gefiltert", () => {
  const { termine } = termineAusIcs(ics(
    "BEGIN:VEVENT", "UID:a", "SUMMARY:Heute",
    "DTSTART;TZID=Europe/Berlin:20260907T100000", "DTEND;TZID=Europe/Berlin:20260907T110000",
    "END:VEVENT",
    "BEGIN:VEVENT", "UID:b", "SUMMARY:Morgen",
    "DTSTART;TZID=Europe/Berlin:20260908T100000", "DTEND;TZID=Europe/Berlin:20260908T110000",
    "END:VEVENT",
  ), FENSTER);
  const heute = termineAmTag(termine, "2026-09-07");
  assert.equal(heute.length, 1);
  assert.equal(heute[0]!.titel, "Heute");
});

test("die Uhrzeit wird zweistellig ausgegeben", () => {
  const ts = new Date(2026, 8, 7, 9, 5).getTime();
  assert.equal(uhrzeit(ts), "09:05");
});

test("ein leerer oder kaputter Text bricht nicht", () => {
  assert.deepEqual(termineAusIcs("", FENSTER).termine, []);
  assert.deepEqual(termineAusIcs("das ist kein Kalender", FENSTER).termine, []);
});
