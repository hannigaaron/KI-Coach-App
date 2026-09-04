import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateTdee, targetCorrection, weightTrend, type TrendPunkt } from "./trend.js";

/** Baut eine Reihe von Tagen mit linearem Gewichtsverlauf und fester Aufnahme. */
function reihe(params: {
  tage: number;
  startKg: number;
  kgProWoche: number;
  kcal?: number | null;
  /** Nur jeden n-ten Tag wiegen, so wie im echten Leben. */
  wiegenJeden?: number;
  /** Schwankung, die auf den Verlauf gelegt wird. */
  rauschen?: number;
}): TrendPunkt[] {
  const { tage, startKg, kgProWoche, kcal = 2800, wiegenJeden = 1, rauschen = 0 } = params;
  const out: TrendPunkt[] = [];
  for (let i = 0; i < tage; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i));
    const day = d.toISOString().slice(0, 10);
    // Ein festes Muster statt Zufall, damit der Test immer gleich läuft.
    const wackeln = rauschen === 0 ? 0 : Math.sin(i * 1.7) * rauschen;
    out.push({
      day,
      weightKg: i % wiegenJeden === 0 ? startKg + (kgProWoche / 7) * i + wackeln : null,
      kcal,
    });
  }
  return out;
}

test("ohne Messungen gibt es keinen Trend und keine erfundene Zahl", () => {
  const trend = weightTrend([{ day: "2026-01-01", kcal: 2500 }]);
  assert.equal(trend.kgProWoche, 0);
  assert.equal(trend.aktuellKg, null);
  assert.equal(trend.belastbar, false);
});

test("eine einzelne Messung ergibt keinen Trend", () => {
  const trend = weightTrend([{ day: "2026-01-01", weightKg: 87 }]);
  assert.equal(trend.messungen, 1);
  assert.equal(trend.belastbar, false);
  assert.equal(trend.aktuellKg, 87);
});

test("die Gerade findet die Richtung trotz Schwankungen", () => {
  // Ein halbes Kilo Abnahme die Woche, mit einem Kilo Schwankung obendrauf.
  const trend = weightTrend(reihe({ tage: 28, startKg: 87, kgProWoche: -0.5, rauschen: 1.0 }));
  assert.ok(Math.abs(trend.kgProWoche + 0.5) < 0.12, `war ${trend.kgProWoche}`);
  assert.equal(trend.belastbar, true);
  assert.equal(trend.messungen, 28);
});

test("zweimal die Woche wiegen reicht für einen belastbaren Trend", () => {
  const trend = weightTrend(reihe({ tage: 28, startKg: 87, kgProWoche: 0.25, wiegenJeden: 3, rauschen: 0.8 }));
  assert.equal(trend.belastbar, true);
  assert.ok(Math.abs(trend.kgProWoche - 0.25) < 0.15, `war ${trend.kgProWoche}`);
});

test("das geglättete Gewicht folgt der Geraden, nicht dem letzten Ausreisser", () => {
  const punkte = reihe({ tage: 21, startKg: 80, kgProWoche: 0 });
  punkte[punkte.length - 1]!.weightKg = 84;
  const trend = weightTrend(punkte);
  assert.ok(trend.aktuellKg !== null && trend.aktuellKg < 81.5, `war ${trend.aktuellKg}`);
});

test("aus Aufnahme und Verlauf wird der tatsächliche Bedarf", () => {
  // 3000 kcal am Tag, dabei 0,5 kg Zunahme je Woche.
  // 0,5 kg mal 7700 kcal geteilt durch 7 Tage sind 550 kcal Ueberschuss.
  // Der Verbrauch liegt also bei etwa 2450 kcal.
  const s = estimateTdee(reihe({ tage: 28, startKg: 87, kgProWoche: 0.5, kcal: 3000 }));
  assert.ok(s.tdeeKcal !== null);
  assert.ok(Math.abs(s.tdeeKcal - 2450) < 40, `war ${s.tdeeKcal}`);
  assert.equal(s.schnittAufnahmeKcal, 3000);
});

test("bei gehaltenem Gewicht ist der Bedarf gleich der Aufnahme", () => {
  const s = estimateTdee(reihe({ tage: 28, startKg: 87, kgProWoche: 0, kcal: 2900 }));
  assert.ok(s.tdeeKcal !== null && Math.abs(s.tdeeKcal - 2900) < 30, `war ${s.tdeeKcal}`);
});

test("ohne genug Wiegungen kommt eine Begründung statt einer Zahl", () => {
  const s = estimateTdee(reihe({ tage: 8, startKg: 87, kgProWoche: -0.5 }));
  assert.equal(s.tdeeKcal, null);
  assert.match(s.grund, /vier Wiegungen/);
});

test("ohne genug Einträge kommt eine Begründung statt einer Zahl", () => {
  const punkte = reihe({ tage: 28, startKg: 87, kgProWoche: -0.5, kcal: null });
  punkte[0]!.kcal = 2800;
  punkte[1]!.kcal = 2800;
  const s = estimateTdee(punkte);
  assert.equal(s.tdeeKcal, null);
  assert.match(s.grund, /Einträge/);
});

test("liegt die Rate im erwarteten Bereich, bleibt das Ziel stehen", () => {
  // Abnehmen mit 0,6 kg die Woche bei 87 kg sind 0,69 Prozent, das passt.
  const schaetzung = estimateTdee(reihe({ tage: 28, startKg: 87, kgProWoche: -0.6, kcal: 2400 }));
  const k = targetCorrection({ schaetzung, goal: "fat_loss", weightKg: 87, aktuellesZielKcal: 2400 });
  assert.equal(k.neuesZielKcal, null);
  assert.match(k.begruendung, /erwarteten Bereich/);
});

test("nimmt jemand im Defizit nicht ab, wird das Ziel gesenkt", () => {
  const schaetzung = estimateTdee(reihe({ tage: 28, startKg: 87, kgProWoche: 0, kcal: 2600 }));
  const k = targetCorrection({ schaetzung, goal: "fat_loss", weightKg: 87, aktuellesZielKcal: 2600 });
  assert.ok(k.neuesZielKcal !== null);
  assert.ok(k.neuesZielKcal < 2600, `war ${k.neuesZielKcal}`);
  assert.ok(k.differenzKcal < 0);
  assert.match(k.begruendung, /2600 kcal/);
});

test("nimmt jemand beim Aufbau zu schnell zu, wird das Ziel gesenkt", () => {
  // 1 kg die Woche bei 87 kg sind 1,15 Prozent, das ist zu viel für Aufbau.
  const schaetzung = estimateTdee(reihe({ tage: 28, startKg: 87, kgProWoche: 1.0, kcal: 3600 }));
  const k = targetCorrection({ schaetzung, goal: "lean_bulk", weightKg: 87, aktuellesZielKcal: 3600 });
  assert.ok(k.neuesZielKcal !== null && k.neuesZielKcal < 3600, `war ${k.neuesZielKcal}`);
});

test("kleine Abweichungen führen zu keiner Korrektur", () => {
  const schaetzung = estimateTdee(reihe({ tage: 28, startKg: 87, kgProWoche: 0.28, kcal: 3000 }));
  const k = targetCorrection({ schaetzung, goal: "maintain", weightKg: 87, aktuellesZielKcal: 2700 });
  // Die Rate liegt knapp über der Spanne, das neue Ziel darf sich aber nur
  // ändern, wenn es sich um mehr als 100 kcal unterscheidet.
  if (k.neuesZielKcal !== null) assert.ok(Math.abs(k.differenzKcal) >= 100);
});

test("ohne belastbare Daten gibt es keine Korrektur, nur den Grund", () => {
  const schaetzung = estimateTdee(reihe({ tage: 6, startKg: 87, kgProWoche: -0.5 }));
  const k = targetCorrection({ schaetzung, goal: "fat_loss", weightKg: 87, aktuellesZielKcal: 2400 });
  assert.equal(k.neuesZielKcal, null);
  assert.equal(k.begruendung, schaetzung.grund);
});

test("jede Begründung nennt die Zahlen, auf denen sie beruht", () => {
  const schaetzung = estimateTdee(reihe({ tage: 28, startKg: 87, kgProWoche: 0, kcal: 2600 }));
  const k = targetCorrection({ schaetzung, goal: "fat_loss", weightKg: 87, aktuellesZielKcal: 2600 });
  assert.match(k.begruendung, /\d+ Tage/);
  assert.match(k.begruendung, /kg die Woche/);
  assert.match(k.begruendung, /Verbrauch von etwa \d+ kcal/);
});
