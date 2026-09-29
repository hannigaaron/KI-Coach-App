import assert from "node:assert/strict";
import test from "node:test";
import { bereitschaft, bereitschaftText, STRESS_MAX_ALTER_TAGE } from "./bereitschaft.js";
import type { Belastung } from "./belastung.js";

const stabil: Belastung = {
  akutMinuten: 240, chronischMinuten: 230, verhaeltnis: 1.04,
  einheitenAkut: 4, einheitenChronisch: 15, lage: "stabil",
};
const sprung: Belastung = { ...stabil, akutMinuten: 480, verhaeltnis: 2.09, lage: "sprung" };

test("eine einzelne Angabe reicht nicht", () => {
  assert.equal(bereitschaft({ schlafQualitaet: 8 }), null);
  assert.match(bereitschaftText(null), /Morgen Check-in/);
});

test("Schlaf und Energie zusammen reichen", () => {
  const b = bereitschaft({ schlafQualitaet: 8, energie: 8 });
  assert.ok(b);
  assert.equal(b.teile.length, 2);
  assert.equal(b.urteil, "bereit");
});

test("ein fehlender Teil senkt die Zahl nicht, sondern fällt raus", () => {
  // Zweimal derselbe gute Wert, einmal mit und einmal ohne Belastung. Würde
  // der fehlende Teil mit null zählen, wäre die zweite Zahl deutlich kleiner.
  const mit = bereitschaft({ schlafQualitaet: 9, energie: 9, belastung: stabil });
  const ohne = bereitschaft({ schlafQualitaet: 9, energie: 9 });
  assert.ok(mit && ohne);
  assert.ok(Math.abs(mit.wert - ohne.wert) <= 6, `${mit.wert} gegen ${ohne.wert}`);
});

test("die Skala von 1 bis 10 wird auf 0 bis 100 gestreckt", () => {
  const unten = bereitschaft({ schlafQualitaet: 1, energie: 1 });
  const oben = bereitschaft({ schlafQualitaet: 10, energie: 10 });
  assert.equal(unten?.wert, 0);
  assert.equal(oben?.wert, 100);
});

test("ein Wert ausserhalb von 1 bis 10 ist keine Angabe", () => {
  assert.equal(bereitschaft({ schlafQualitaet: 0, energie: 8 }), null);
  assert.equal(bereitschaft({ schlafQualitaet: 12, energie: 8 }), null);
  assert.equal(bereitschaft({ schlafQualitaet: null, energie: 8 }), null);
});

test("ein Sprung in der Belastung drückt die Bereitschaft", () => {
  const ruhig = bereitschaft({ schlafQualitaet: 7, energie: 7, belastung: stabil });
  const hart = bereitschaft({ schlafQualitaet: 7, energie: 7, belastung: sprung });
  assert.ok(ruhig && hart);
  assert.ok(hart.wert < ruhig.wert, `${hart.wert} sollte unter ${ruhig.wert} liegen`);
});

test("eine ruhige Woche hebt die Bereitschaft statt sie zu senken", () => {
  const rueckgang: Belastung = { ...stabil, akutMinuten: 60, verhaeltnis: 0.26, lage: "rueckgang" };
  const b = bereitschaft({ schlafQualitaet: 7, energie: 7, belastung: rueckgang });
  const auf = bereitschaft({ schlafQualitaet: 7, energie: 7, belastung: { ...stabil, lage: "aufbau" } });
  assert.ok(b && auf);
  assert.ok(b.wert > auf.wert);
});

test("ein zu alter Wochenbogen zählt nicht mehr", () => {
  const frisch = bereitschaft({ schlafQualitaet: 5, energie: 5, stress: 90, stressAlterTage: 1 });
  const alt = bereitschaft({ schlafQualitaet: 5, energie: 5, stress: 90, stressAlterTage: STRESS_MAX_ALTER_TAGE + 1 });
  assert.ok(frisch && alt);
  assert.equal(frisch.teile.length, 3);
  assert.equal(alt.teile.length, 2);
});

test("hoher Stress senkt die Zahl, niedriger hebt sie", () => {
  const viel = bereitschaft({ schlafQualitaet: 6, energie: 6, stress: 95, stressAlterTage: 0 });
  const wenig = bereitschaft({ schlafQualitaet: 6, energie: 6, stress: 5, stressAlterTage: 0 });
  assert.ok(viel && wenig);
  assert.ok(viel.wert < wenig.wert);
});

test("der schwächste Teil trägt die Empfehlung", () => {
  const b = bereitschaft({ schlafQualitaet: 2, energie: 8, belastung: stabil });
  assert.ok(b);
  assert.equal(b.schwaechster.name, "Schlaf");
  assert.match(bereitschaftText(b), /liegt Schlaf/);
});

test("der Text nennt jede Quelle und die Grenze der Zahl", () => {
  const b = bereitschaft({ schlafQualitaet: 7, energie: 6, belastung: stabil, stress: 40, stressAlterTage: 2 });
  assert.ok(b);
  const text = bereitschaftText(b);
  assert.match(text, /keine Messung/);
  for (const teil of b.teile) assert.ok(text.includes(teil.quelle), `Quelle fehlt: ${teil.quelle}`);
  assert.match(text, /Stress 40 von 100 in deinem Check-in von vor 2 Tagen/);
});

test("ein fehlender Wochenbogen zählt nicht als Stress null", () => {
  // Number(null) ist 0, und 0 wäre ein gültiger Stresswert. Ohne die Prüfung
  // auf null hätte ein fehlender Bogen die Bereitschaft gehoben.
  const ohne = bereitschaft({ schlafQualitaet: 5, energie: 5, stress: null, stressAlterTage: null });
  assert.ok(ohne);
  assert.equal(ohne.teile.length, 2);
  assert.equal(ohne.teile.some((t) => t.name === "Ruhe"), false);

  const mitNull = bereitschaft({ schlafQualitaet: 5, energie: 5, stress: 0, stressAlterTage: 0 });
  assert.equal(mitNull?.teile.length, 3, "echte Null ist eine Angabe und zählt");
});
