/**
 * Doppelt kodierter Text, wie er im Betrieb im Gedächtnis stand.
 *
 * Eigene Datei, weil `storage.js` beim Laden den Speicher repariert. Der
 * kaputte Stand muss deshalb vor dem Import im Speicher stehen.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

/** UTF-8 Bytes eines Textes, je Byte ein Zeichen: genau der Fehler. */
const kaputt = (text) => String.fromCharCode(...new TextEncoder().encode(text));

class SpeicherAttrappe {
  constructor() { this.inhalt = new Map(); }
  get length() { return this.inhalt.size; }
  key(i) { return [...this.inhalt.keys()][i] ?? null; }
  getItem(k) { return this.inhalt.has(k) ? this.inhalt.get(k) : null; }
  setItem(k, v) { this.inhalt.set(String(k), String(v)); }
  removeItem(k) { this.inhalt.delete(k); }
  clear() { this.inhalt.clear(); }
}

globalThis.localStorage = new SpeicherAttrappe();
const notizen = [{ id: "a", text: "Heißt Aaron. Verträgt nicht: Haselnüsse.", tags: [] }];
localStorage.setItem("daevo.v1.memories", kaputt(JSON.stringify(notizen)));
localStorage.setItem("daevo.v1.fremd", "Café");

const { kodierungReparieren, store } = await import("./storage.js");

test("der Speicher wird beim Start repariert", () => {
  assert.equal(store.getMemories()[0].text, "Heißt Aaron. Verträgt nicht: Haselnüsse.");
});

test("doppelt kodierter Text kommt zurück, richtiger bleibt, wie er ist", () => {
  assert.equal(kaputt("Männer"), "MÃ¤nner");
  assert.equal(kodierungReparieren(kaputt("Grundübungen, Schärfe, groß")), "Grundübungen, Schärfe, groß");
  for (const richtig of ["Männer", "Café", "Grüße aus Köln", "30 %", "", "Ã allein"]) {
    assert.equal(kodierungReparieren(richtig), richtig);
  }
  // Ein Zeichen über 255 heisst: das war nie Latin-1.
  assert.equal(kodierungReparieren("MÃ¤nner 💪"), "MÃ¤nner 💪");
  assert.equal(kodierungReparieren(null), null);
});
