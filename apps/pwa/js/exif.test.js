import { test } from "node:test";
import assert from "node:assert/strict";
import { aufnahmezeit, zeitLesen, zeitVorschlag, tagVor, tageZurueck } from "./exif.js";

/**
 * Baut ein minimales JPEG mit Exif Block von Hand, in beiden Bytereihenfolgen.
 * Ein echtes Foto als Testdatei wäre ein paar Megabyte im Repository und
 * prüfte nur die eine Reihenfolge, die das Gerät zufällig schreibt.
 */
function jpegMitZeit({ original, datetime, klein = true }) {
  const tiff = [];
  const u16 = (v) => (klein ? [v & 255, v >> 8] : [v >> 8, v & 255]);
  const u32 = (v) => (klein ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24] : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255]);
  const ascii = (s) => [...s].map((c) => c.charCodeAt(0)).concat(0);

  // Aufbau: Kopf (8), IFD0, Exif IFD, Texte.
  const ifd0Eintraege = (datetime ? 1 : 0) + (original ? 1 : 0);
  const ifd0Groesse = 2 + ifd0Eintraege * 12 + 4;
  const exifStart = 8 + ifd0Groesse;
  const exifGroesse = original ? 2 + 12 + 4 : 0;
  let textPos = exifStart + exifGroesse;
  const texte = [];

  tiff.push(...(klein ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
  tiff.push(...u16(ifd0Eintraege));
  if (datetime) {
    const t = ascii(datetime);
    tiff.push(...u16(0x0132), ...u16(2), ...u32(t.length), ...u32(textPos));
    texte.push(...t); textPos += t.length;
  }
  if (original) tiff.push(...u16(0x8769), ...u16(4), ...u32(1), ...u32(exifStart));
  tiff.push(...u32(0));
  if (original) {
    const t = ascii(original);
    tiff.push(...u16(1), ...u16(0x9003), ...u16(2), ...u32(t.length), ...u32(textPos), ...u32(0));
    texte.push(...t);
  }
  tiff.push(...texte);

  const app1 = [..."Exif"].map((c) => c.charCodeAt(0)).concat(0, 0, ...tiff);
  const laenge = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, laenge >> 8, laenge & 255, ...app1, 0xff, 0xda, 0, 2, 0xff, 0xd9]);
}

test("liest DateTimeOriginal in Intel Reihenfolge", () => {
  const bild = jpegMitZeit({ original: "2026:10:16 13:05:42" });
  assert.deepEqual(aufnahmezeit(bild), { tag: "2026-10-16", uhrzeit: "13:05" });
});

test("liest DateTimeOriginal in Motorola Reihenfolge", () => {
  const bild = jpegMitZeit({ original: "2026:10:16 07:30:00", klein: false });
  assert.deepEqual(aufnahmezeit(bild), { tag: "2026-10-16", uhrzeit: "07:30" });
});

test("DateTimeOriginal schlägt DateTime", () => {
  // DateTime ändert sich beim Bearbeiten, die Aufnahmezeit nicht.
  const bild = jpegMitZeit({ original: "2026:10:16 12:00:00", datetime: "2026:10:17 09:00:00" });
  assert.equal(aufnahmezeit(bild).uhrzeit, "12:00");
});

test("nimmt DateTime, wenn nur das da ist", () => {
  const bild = jpegMitZeit({ datetime: "2026:10:15 19:45:10" });
  assert.deepEqual(aufnahmezeit(bild), { tag: "2026-10-15", uhrzeit: "19:45" });
});

test("ohne Exif kommt null und nichts Geratenes", () => {
  assert.equal(aufnahmezeit(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2])), null);
  assert.equal(aufnahmezeit(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null);
  assert.equal(aufnahmezeit(new Uint8Array(0)), null);
});

test("ein abgeschnittener Block wirft nicht", () => {
  const bild = jpegMitZeit({ original: "2026:10:16 13:05:42" });
  for (let n = 0; n < bild.length; n += 7) assert.doesNotThrow(() => aufnahmezeit(bild.slice(0, n)));
});

test("zeitLesen verwirft, was keine Zeit ist", () => {
  assert.equal(zeitLesen("0000:00:00 00:00:00"), null);
  assert.equal(zeitLesen("    :  :     :  :  "), null);
  assert.equal(zeitLesen("2026:13:01 10:00:00"), null);
  assert.deepEqual(zeitLesen("2026:01:09 23:59:59"), { tag: "2026-01-09", uhrzeit: "23:59" });
});


test("Vorschlag übernimmt die Aufnahmezeit von gestern", () => {
  const jetzt = new Date(2026, 9, 17, 21, 10);
  assert.deepEqual(zeitVorschlag({ tag: "2026-10-16", uhrzeit: "13:05" }, jetzt),
    { tag: "2026-10-16", uhrzeit: "13:05", ausFoto: true });
});

test("Vorschlag verwirft altes Foto und Zukunft", () => {
  const jetzt = new Date(2026, 9, 17, 21, 10);
  assert.deepEqual(zeitVorschlag({ tag: "2026-10-10", uhrzeit: "13:05" }, jetzt),
    { tag: "2026-10-17", uhrzeit: "21:10", ausFoto: false });
  assert.equal(zeitVorschlag({ tag: "2026-10-17", uhrzeit: "22:00" }, jetzt).ausFoto, false);
  assert.equal(zeitVorschlag({ tag: "2026-10-18", uhrzeit: "08:00" }, jetzt).ausFoto, false);
  assert.equal(zeitVorschlag(null, jetzt).uhrzeit, "21:10");
});

test("Tage rechnen über den Monatswechsel", () => {
  assert.equal(tagVor("2026-11-01", 1), "2026-10-31");
  assert.equal(tageZurueck("2026-10-31", "2026-11-01"), 1);
});
