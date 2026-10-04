import assert from "node:assert/strict";
import test from "node:test";
import {
  ABSTAND_TAGE, MIN_TAGE, schieflageFinden, schieflagenText, type SchieflagenLage,
} from "./schieflage.js";
import type { BereichStand } from "./balance.js";

function stand(bereich: string, name: string, minuten: number, ziel: number): BereichStand {
  return {
    bereich: bereich as BereichStand["bereich"],
    name, minuten, zielMinuten: ziel,
    anteil: ziel > 0 ? minuten / ziel : 0,
    anteilAmTag: 0,
  };
}

/** Karriere weit über dem Ziel, Me Time fast leer. Aarons Muster. */
function schief(): BereichStand[] {
  return [
    // 162 Prozent. Der erste Entwurf stand auf 3510, also 146 Prozent, und lag
    // damit unter der eigenen Schwelle von 150: der Test hat die Zahlen der
    // Vorlage korrigiert, nicht das Modul.
    stand("karriere", "Karriere", 3900, 2400),
    stand("fitness", "Fitness", 310, 300),
    stand("wellbeing", "Wellbeing", 80, 300),
    stand("me_time", "Me Time", 125, 420),
    stand("beziehung", "Familie und Beziehung", 280, 480),
  ];
}

function lage(teil: Partial<SchieflagenLage> = {}): SchieflagenLage {
  return { bereiche: schief(), tageMitZeit: 14, heute: "2026-09-29", ...teil };
}

test("Der schwächste Bereich wird gemeldet, nicht der auffälligste", () => {
  const s = schieflageFinden(lage());
  assert.ok(s);
  assert.equal(s.fehlt.bereich, "wellbeing", "80 von 300 ist weniger als 125 von 420");
  assert.equal(s.frisst?.bereich, "karriere");
  assert.equal(s.fehlt.minutenOffen, 220);
});

test("Über vierzig Prozent ist keine Schieflage mehr", () => {
  const knapp = schief().map((b) => (b.bereich === "wellbeing" ? stand("wellbeing", "Wellbeing", 140, 300) : b));
  // Me Time liegt dann bei 30 Prozent und wird zum schwächsten.
  const s = schieflageFinden(lage({ bereiche: knapp }));
  assert.equal(s?.fehlt.bereich, "me_time");

  const alleOk = schief().map((b) => stand(b.bereich, b.name, b.zielMinuten, b.zielMinuten));
  assert.equal(schieflageFinden(lage({ bereiche: alleOk })), null);
});

test("Ein Bereich über dem Ziel allein ist keine Meldung", () => {
  // Wer viel trainiert und sonst alles schafft, hat eine gute Woche.
  const gut = schief().map((b) =>
    b.bereich === "fitness" ? stand("fitness", "Fitness", 900, 300) : stand(b.bereich, b.name, b.zielMinuten, b.zielMinuten));
  assert.equal(schieflageFinden(lage({ bereiche: gut })), null);
});

test("Ohne genug Tage mit gemessener Zeit wird nichts behauptet", () => {
  // Sonst meldet die App eine Schieflage, die nur eine Lücke im Eintragen ist.
  assert.equal(schieflageFinden(lage({ tageMitZeit: MIN_TAGE - 1 })), null);
  assert.ok(schieflageFinden(lage({ tageMitZeit: MIN_TAGE })));
});

test("Nach einer Meldung bleibt es drei Tage still", () => {
  assert.equal(schieflageFinden(lage({ zuletztGemeldet: "2026-09-28" })), null);
  assert.equal(schieflageFinden(lage({ zuletztGemeldet: "2026-09-27" })), null);
  assert.ok(schieflageFinden(lage({ zuletztGemeldet: "2026-09-26" })));
  assert.equal(ABSTAND_TAGE, 3);
});

test("Bereiche ohne Ziel zählen nicht mit", () => {
  // Ein Ziel von null ist keine Vorgabe, und ein Anteil durch null keine Zahl.
  const ohne = schief().map((b) => (b.bereich === "wellbeing" ? stand("wellbeing", "Wellbeing", 0, 0) : b));
  const s = schieflageFinden(lage({ bereiche: ohne }));
  assert.equal(s?.fehlt.bereich, "me_time");

  const nurEins = [stand("karriere", "Karriere", 100, 2400)];
  assert.equal(schieflageFinden(lage({ bereiche: nurEins })), null);
});

test("Derselbe Bereich ist nie Täter und Opfer zugleich", () => {
  const eins = [
    stand("karriere", "Karriere", 100, 2400),
    stand("fitness", "Fitness", 300, 300),
  ];
  const s = schieflageFinden(lage({ bereiche: eins }));
  assert.equal(s?.fehlt.bereich, "karriere");
  assert.equal(s?.frisst, null);
});

test("Der Text nennt das Ziel des Nutzers, nicht sein Versagen", () => {
  const { titel, text } = schieflagenText("Me Time", 0.3, 295, "Karriere");
  assert.equal(titel, "Me Time bei 30 Prozent");
  assert.match(text, /vorgenommen/);
  assert.match(text, /vier Wochen/, "der Zeitraum gehört in den Satz");
  assert.match(text, /fehlen 4 Stunden/);
  assert.match(text, /Karriere/);
  for (const wort of ["zu wenig", "schlecht", "versagt", "solltest"]) {
    assert.doesNotMatch(text.toLowerCase(), new RegExp(wort));
  }
});

test("Unter einer Stunde steht die Zahl in Minuten", () => {
  assert.match(schieflagenText("Me Time", 0.3, 45, null).text, /fehlen 45 Minuten/);
});

test("Ein ungültiges Datum wirft, statt still nicht zu melden", () => {
  assert.throws(() => schieflageFinden(lage({ zuletztGemeldet: "letzte woche" })), /Ungültiges Datum/);
});
