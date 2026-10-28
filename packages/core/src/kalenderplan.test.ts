import assert from "node:assert/strict";
import test from "node:test";
import type { Termin } from "./ical.js";
import { freienPlatzFinden } from "./kalenderplan.js";
import type { UserProfile } from "./types.js";

const profil = { wakeTime: "07:00", sleepTime: "23:00" } as UserProfile;

/** Ortszeit am 29. und 30. Oktober 2026. */
function am(tag: number, hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2026, 9, tag, h, m).getTime();
}

function termin(uid: string, tag: number, von: string, bis: string): Termin {
  return { uid, titel: uid, ort: "", von: am(tag, von), bis: am(tag, bis), ganztags: false } as Termin;
}

test("nimmt die Wunschzeit, wenn sie frei ist", () => {
  const p = freienPlatzFinden({ termine: [], profile: profil, wunsch: { minuten: 60, ab: am(29, "08:00"), uhrzeit: "18:00" } });
  assert.equal(p?.von, am(29, "18:00"));
  assert.equal(p?.bis, am(29, "19:00"));
});

test("weicht um einen Kundentermin herum aus, mit Luft davor und danach", () => {
  const p = freienPlatzFinden({
    termine: [termin("Kunde", 29, "17:30", "19:00")],
    profile: profil,
    wunsch: { minuten: 60, ab: am(29, "08:00"), uhrzeit: "18:00" },
  });
  // 19:00 plus 15 Minuten Luft ist näher an 18 Uhr als 16:15 davor.
  assert.equal(p?.von, am(29, "19:15"));
});

test("ein früherer Tag schlägt die Wunschzeit an einem späteren", () => {
  const voll = [termin("Arbeit", 29, "07:00", "20:00")];
  const p = freienPlatzFinden({ termine: voll, profile: profil, wunsch: { minuten: 60, ab: am(29, "07:00"), uhrzeit: "07:30" } });
  assert.equal(p?.von, am(29, "20:15"));
});

test("endet spätestens eine Stunde vor dem Schlafen, sonst nächster Tag", () => {
  const p = freienPlatzFinden({
    termine: [termin("Arbeit", 29, "07:00", "21:00")],
    profile: profil,
    wunsch: { minuten: 90, ab: am(29, "07:00") },
  });
  assert.equal(p?.tag, "2026-10-30");
  assert.equal(p?.von, am(30, "07:00"));
});

test("der zu verschiebende Termin zählt nicht als belegt", () => {
  const training = termin("training-1", 29, "18:00", "19:00");
  const p = freienPlatzFinden({
    termine: [training],
    profile: profil,
    wunsch: { minuten: 60, ab: am(29, "08:00"), uhrzeit: "18:00", ohneUid: "training-1" },
  });
  assert.equal(p?.von, am(29, "18:00"));
});

test("findet nichts, wenn die ganze Woche voll ist", () => {
  const voll = Array.from({ length: 8 }, (_, i) => termin(`t${i}`, 29 + i, "06:00", "23:30"));
  assert.equal(freienPlatzFinden({ termine: voll, profile: profil, wunsch: { minuten: 60, ab: am(29, "06:00") } }), null);
});

test("liest die Sätze, die im Alltag fallen", async () => {
  const { kalenderAuftragAus } = await import("./kalenderplan.js");
  const mi = new Date(2026, 9, 28, 9, 0); // Mittwoch
  assert.deepEqual(kalenderAuftragAus("Ich schaff's morgen doch nicht ins Training, plan mal bitte um", mi),
    { aktion: "verschieben", suche: "training", tag: "2026-10-29" });
  assert.deepEqual(kalenderAuftragAus("Verschieb mein Training von Freitag", mi),
    { aktion: "verschieben", suche: "training", tag: "2026-10-30" });
  assert.deepEqual(kalenderAuftragAus("Trag mir Donnerstag um 18 Uhr Training ein, 90 Minuten", mi),
    { aktion: "eintragen", titel: "Training", uhrzeit: "18:00", tag: "2026-10-29", minuten: 90 });
  assert.equal(kalenderAuftragAus("Trag mir Training ein", mi), null, "ohne Uhrzeit wird nichts geraten");
  assert.equal(kalenderAuftragAus("Das Training morgen war super", mi), null);
  assert.equal(kalenderAuftragAus("Mach das rückgängig", mi), null, "ohne Kalender nicht");
  assert.deepEqual(kalenderAuftragAus("Mach die Kalenderänderung rückgängig", mi), { aktion: "rueckgaengig" });
});
