import { test } from "node:test";
import assert from "node:assert/strict";
import {
  coreMemories,
  memoriesToPrompt,
  searchMemories,
  similarity,
  tokenize,
  upsertMemory,
  type MemoryEntry,
} from "./memory.js";

const NOW = new Date("2026-09-03T12:00:00Z");

function entry(text: string, over: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: over.id ?? text.slice(0, 8),
    at: over.at ?? "2026-09-01T10:00:00Z",
    kind: over.kind ?? "fakt",
    text,
    tags: over.tags ?? [],
    weight: over.weight ?? 3,
    source: over.source ?? "nutzer",
  };
}

test("Tokenizer entfernt Fuellwoerter und loest Umlaute auf", () => {
  assert.deepEqual(tokenize("Ich habe eine Unvertraeglichkeit gegen Laktose"), [
    "unvertraeglichkeit",
    "laktose",
  ]);
  assert.deepEqual(tokenize("Grüne Äpfel"), ["gruene", "aepfel"]);
});

test("Suche findet den thematisch passenden Eintrag", () => {
  const entries = [
    entry("Vertraegt keine Laktose, bekommt sonst Bauchschmerzen"),
    entry("Spielt zweimal die Woche Volleyball"),
    entry("Trainiert am liebsten am spaeten Nachmittag"),
  ];
  const hits = searchMemories(entries, "Kann ich Magerquark essen oder ist das mit Laktose ein Problem?", { now: NOW });
  assert.ok(hits.length > 0);
  assert.match(hits[0]!.entry.text, /Laktose/);
});

test("Eintraege ohne gemeinsames Wort tauchen nie auf", () => {
  const entries = [entry("Spielt Volleyball")];
  assert.equal(searchMemories(entries, "Wie war mein Schlaf?", { now: NOW }).length, 0);
});

test("leere Frage liefert nichts", () => {
  assert.equal(searchMemories([entry("Irgendwas")], "und der", { now: NOW }).length, 0);
});

test("neuere Eintraege ranken vor aelteren bei gleichem Inhalt", () => {
  const entries = [
    entry("Knieschmerzen beim Kniebeugen", { id: "alt", at: "2026-01-01T10:00:00Z" }),
    entry("Knieschmerzen beim Kniebeugen aufgetreten", { id: "neu", at: "2026-09-01T10:00:00Z" }),
  ];
  const hits = searchMemories(entries, "Knieschmerzen", { now: NOW });
  assert.equal(hits[0]!.entry.id, "neu");
});

test("Wichtigkeit hebt einen Eintrag an", () => {
  const entries = [
    entry("Volleyball am Dienstag", { id: "a", weight: 1 }),
    entry("Volleyball ist sein Ausgleich", { id: "b", weight: 5 }),
  ];
  const hits = searchMemories(entries, "Volleyball", { now: NOW });
  assert.equal(hits[0]!.entry.id, "b");
});

test("Aehnlichkeit erkennt Umformulierungen", () => {
  assert.ok(similarity("Vertraegt keine Laktose", "Laktose vertraegt er nicht") >= 0.72);
  assert.ok(similarity("Spielt Volleyball", "Mag keinen Kaffee") < 0.3);
});

test("fast gleicher Eintrag wird zusammengefuehrt statt verdoppelt", () => {
  const first = upsertMemory([], { kind: "fakt", text: "Vertraegt keine Laktose", tags: [], weight: 3, source: "nutzer" });
  assert.equal(first.action, "hinzugefuegt");
  const second = upsertMemory(first.entries, {
    kind: "fakt",
    text: "Laktose vertraegt er nicht gut",
    tags: ["ernaehrung"],
    weight: 5,
    source: "nutzer",
  });
  assert.equal(second.action, "aktualisiert");
  assert.equal(second.entries.length, 1);
  assert.equal(second.entries[0]!.weight, 5);
  assert.deepEqual(second.entries[0]!.tags, ["ernaehrung"]);
});

test("unterschiedliche Aussagen bleiben getrennt", () => {
  const a = upsertMemory([], { kind: "fakt", text: "Vertraegt keine Laktose", tags: [], weight: 3, source: "nutzer" });
  const b = upsertMemory(a.entries, { kind: "fakt", text: "Spielt zweimal die Woche Volleyball", tags: [], weight: 3, source: "nutzer" });
  assert.equal(b.entries.length, 2);
});

test("gleicher Text in anderer Kategorie bleibt getrennt", () => {
  const a = upsertMemory([], { kind: "ziel", text: "Will unter 80 Kilo kommen", tags: [], weight: 4, source: "nutzer" });
  const b = upsertMemory(a.entries, { kind: "reflexion", text: "Will unter 80 Kilo kommen", tags: [], weight: 4, source: "nutzer" });
  assert.equal(b.entries.length, 2);
});

test("zu kurzer Text wird verworfen", () => {
  const r = upsertMemory([], { kind: "fakt", text: "ok", tags: [], weight: 3, source: "nutzer" });
  assert.equal(r.action, "verworfen");
  assert.equal(r.entries.length, 0);
});

test("Kernerinnerungen sortieren nach Wichtigkeit", () => {
  const entries = [entry("a", { id: "a", weight: 2 }), entry("b", { id: "b", weight: 5 }), entry("c", { id: "c", weight: 3 })];
  assert.deepEqual(coreMemories(entries, 2, NOW).map((e) => e.id), ["b", "c"]);
});

test("Prompt Block bleibt lesbar und nennt das Datum", () => {
  const text = memoriesToPrompt([entry("Vertraegt keine Laktose", { kind: "fakt", at: "2026-08-30T09:00:00Z" })]);
  assert.equal(text, "- [fakt, 2026-08-30] Vertraegt keine Laktose");
  assert.match(memoriesToPrompt([]), /Noch keine Notizen/);
});
