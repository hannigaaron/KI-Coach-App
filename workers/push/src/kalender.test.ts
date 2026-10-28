import { test } from "node:test";
import assert from "node:assert/strict";
import { kalenderAdresse, kalenderHolen } from "./kalender.js";

test("nur bekannte Kalenderdienste, webcal wird https", () => {
  assert.equal(kalenderAdresse("webcal://p42-caldav.icloud.com/published/2/abc")?.protocol, "https:");
  assert.ok(kalenderAdresse("https://calendar.google.com/calendar/ical/x%40gmail.com/private-abc/basic.ics"));
  assert.ok(kalenderAdresse("https://outlook.office365.com/owa/calendar/a/b/calendar.ics"));
  assert.equal(kalenderAdresse("https://evil.example/calendar.google.com"), null);
  assert.equal(kalenderAdresse("https://calendar.google.com.evil.example/x"), null);
  assert.equal(kalenderAdresse("http://calendar.google.com/x"), null);
  assert.equal(kalenderAdresse("https://user:pw@calendar.google.com/x"), null);
  assert.equal(kalenderAdresse("kein link"), null);
});

test("Abruf reicht nur echte Kalender durch", async () => {
  const antwort = (text: string, status = 200) => (async () => new Response(text, { status })) as unknown as typeof fetch;
  assert.equal((await kalenderHolen("https://calendar.google.com/a.ics", antwort("BEGIN:VCALENDAR\nEND:VCALENDAR"))).status, 200);
  assert.equal((await kalenderHolen("https://calendar.google.com/a.ics", antwort("<html>"))).status, 502);
  assert.equal((await kalenderHolen("https://calendar.google.com/a.ics", antwort("", 404))).status, 502);
  assert.equal((await kalenderHolen("https://example.com/a.ics", antwort("BEGIN:VCALENDAR"))).status, 400);
});
