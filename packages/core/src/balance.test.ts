import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BEREICHE, STANDARD_ZIELE, balance, balanceText, bereichVon, tagesnutzung,
} from "./balance.js";
import type { Termin } from "./ical.js";

const TAG = "2026-09-07";

function t(von: string, bis: string, titel: string, ganztags = false): Termin {
  return {
    uid: `${titel}-${von}`, titel, ort: "",
    von: new Date(`${TAG}T${von}:00`).getTime(),
    bis: new Date(`${TAG}T${bis}:00`).getTime(),
    ganztags,
  };
}

/* ---------- Die Zuordnung ---------- */

test("Termine landen im richtigen Bereich", () => {
  assert.equal(bereichVon("Kunde Anna"), "karriere");
  assert.equal(bereichVon("Zirkeltraining YAN"), "karriere");
  assert.equal(bereichVon("Krafttraining"), "fitness");
  assert.equal(bereichVon("Volleyball"), "fitness");
  assert.equal(bereichVon("Sauna"), "wellbeing");
  assert.equal(bereichVon("Physio"), "wellbeing");
  assert.equal(bereichVon("Kino"), "me_time");
  assert.equal(bereichVon("Abendessen mit Mama"), "beziehung");
});

test("Fitness steht vor Karriere, wo beides passen könnte", () => {
  // "Krafttraining" ist seins, "Athletiktraining" ist Arbeit.
  assert.equal(bereichVon("Krafttraining"), "fitness");
  assert.equal(bereichVon("Athletiktraining U19"), "karriere");
});

test("was nicht eindeutig ist, wird nicht zugeordnet", () => {
  assert.equal(bereichVon("Anna"), null);
  assert.equal(bereichVon("Termin"), null);
  assert.equal(bereichVon(""), null);
});

test("Umlaute brechen die Zuordnung nicht", () => {
  assert.equal(bereichVon("Büro"), "karriere");
  assert.equal(bereichVon("Buero"), "karriere");
});

/* ---------- Die Rechnung ---------- */

test("Minuten werden je Bereich summiert", () => {
  const b = balance({
    tage: 1,
    termine: [t("09:00", "12:00", "Kunde Anna"), t("19:00", "21:00", "Volleyball")],
  });
  const karriere = b.bereiche.find((x) => x.bereich === "karriere")!;
  const fitness = b.bereiche.find((x) => x.bereich === "fitness")!;
  assert.equal(karriere.minuten, 180);
  assert.equal(fitness.minuten, 120);
  assert.equal(b.gesamtMinuten, 300);
  assert.equal(b.abgedeckt, 2);
});

test("nicht zuordenbare Zeit wird gemeldet, nicht verteilt", () => {
  const b = balance({ tage: 1, termine: [t("09:00", "10:00", "Anna")] });
  assert.equal(b.gesamtMinuten, 0);
  assert.equal(b.nichtZugeordnet, 60);
  assert.equal(b.abgedeckt, 0);
});

test("ganztägige Termine zählen nicht mit, sie haben keine Dauer", () => {
  const b = balance({ tage: 1, termine: [t("00:00", "23:59", "Urlaub", true)] });
  assert.equal(b.gesamtMinuten, 0);
  assert.equal(b.nichtZugeordnet, 0);
});

test("Zusatzminuten aus Einträgen kommen dazu", () => {
  const b = balance({ tage: 1, termine: [], zusatz: { fitness: 75 } });
  assert.equal(b.bereiche.find((x) => x.bereich === "fitness")!.minuten, 75);
});

test("das Wochenziel wird auf den Zeitraum heruntergerechnet", () => {
  const tagesziel = Math.round(STANDARD_ZIELE.karriere / 7);
  assert.equal(balance({ tage: 1, termine: [] }).bereiche[0]!.zielMinuten, tagesziel);
  assert.equal(balance({ tage: 7, termine: [] }).bereiche[0]!.zielMinuten, STANDARD_ZIELE.karriere);
});

test("eigene Ziele schlagen die Vorschläge", () => {
  const b = balance({ tage: 7, termine: [], ziele: { fitness: 600 } });
  assert.equal(b.bereiche.find((x) => x.bereich === "fitness")!.zielMinuten, 600);
});

test("der Anteil wird nicht gedeckelt, damit man das Ueberziehen sieht", () => {
  const b = balance({ tage: 7, termine: [], zusatz: { karriere: STANDARD_ZIELE.karriere * 2 } });
  assert.equal(b.bereiche.find((x) => x.bereich === "karriere")!.anteil, 2);
});

test("ein leerer Zeitraum ergibt fünf leere Ringe und keinen Fehler", () => {
  const b = balance({ tage: 7, termine: [] });
  assert.equal(b.bereiche.length, 5);
  assert.equal(b.gesamtMinuten, 0);
  assert.equal(b.abgedeckt, 0);
  for (const s of b.bereiche) assert.equal(s.anteilAmTag, 0);
});

/* ---------- Die Tagesnutzung ---------- */

const VOLL = {
  balance: balance({
    tage: 1,
    termine: [
      t("09:00", "12:00", "Kunde Anna"), t("17:00", "18:00", "Krafttraining"),
      t("18:30", "19:00", "Sauna"), t("20:00", "21:00", "Kino"),
      t("21:00", "22:00", "Telefonat mit Mama"),
    ],
  }),
  aufgabenErledigt: 4, aufgabenGeplant: 4,
  standardsGehalten: 3, standardsGesamt: 3,
  ernaehrung: 100,
};

test("ein Tag mit allem drin kommt auf 100", () => {
  assert.equal(tagesnutzung(VOLL).wert, 100);
});

test("Balance wiegt am schwersten", () => {
  // Alles erledigt, aber nur Arbeit im Kalender.
  const nurArbeit = tagesnutzung({
    ...VOLL,
    balance: balance({ tage: 1, termine: [t("08:00", "20:00", "Kunde Anna")] }),
  });
  assert.ok(nurArbeit.wert < 70, `${nurArbeit.wert}`);
  assert.equal(nurArbeit.teile.find((x) => x.name === "Balance")!.wert, 20);
});

test("jeder Teil erklärt sich mit seiner Zahl", () => {
  for (const teil of tagesnutzung(VOLL).teile) {
    assert.ok(teil.erklaerung.length > 10, teil.name);
    assert.ok(teil.gewicht > 0);
  }
  assert.equal(tagesnutzung(VOLL).teile.reduce((s, x) => s + x.gewicht, 0), 1);
});

test("der Satz nennt den schwächsten Teil", () => {
  const schwach = tagesnutzung({ ...VOLL, aufgabenErledigt: 0, aufgabenGeplant: 5, ernaehrung: 40 });
  assert.ok(schwach.satz.includes("Aufgaben"));
});

test("ein Teil ohne Datenlage zählt nicht mit, statt mit null zu bestrafen", () => {
  // Wer keine Aufgaben geplant hat, hat nichts falsch gemacht. Die Zahl würde
  // sonst Datenlage messen statt Verhalten.
  const ohne = tagesnutzung({ ...VOLL, aufgabenErledigt: 0, aufgabenGeplant: 0, standardsGesamt: 0, standardsGehalten: 0 });
  assert.equal(ohne.teile.find((x) => x.name === "Aufgaben")!.gewicht, 0);
  assert.equal(ohne.teile.find((x) => x.name === "Mindeststandards")!.gewicht, 0);
  assert.equal(ohne.wert, 100);
});

test("die übrigen Gewichte werden hochgerechnet und ergeben wieder eins", () => {
  const ohne = tagesnutzung({ ...VOLL, aufgabenGeplant: 0, standardsGesamt: 0 });
  const summe = ohne.teile.reduce((s, t) => s + t.gewicht, 0);
  assert.ok(Math.abs(summe - 1) < 0.02, `Summe ${summe}`);
});

test("ohne jede Datenlage bricht die Rechnung nicht", () => {
  const leer = tagesnutzung({
    balance: balance({ tage: 1, termine: [] }),
    aufgabenErledigt: 0, aufgabenGeplant: 0,
    standardsGehalten: 0, standardsGesamt: 0, ernaehrung: 0,
  });
  assert.equal(leer.wert, 0);
  assert.ok(leer.satz.includes("0 von 100"));
});

test("Stunden und Minuten werden im Singular richtig geschrieben", () => {
  const text = balanceText(balance({ tage: 7, termine: [], zusatz: { fitness: 60, wellbeing: 1 } }));
  assert.ok(text.includes("1 Stunde von"), text);
  assert.ok(text.includes("1 Minute von"), text);
  assert.equal(text.includes("1 Stunden"), false);
});

/* ---------- Der Text ---------- */

test("der Text nennt leere Bereiche beim Namen", () => {
  const text = balanceText(balance({ tage: 7, termine: [t("09:00", "12:00", "Kunde Anna")] }));
  assert.ok(text.includes("Ohne eine einzige Minute"));
  assert.ok(text.includes("Me Time"));
});

test("der Text nennt die nicht zugeordnete Zeit", () => {
  const text = balanceText(balance({ tage: 1, termine: [t("09:00", "11:00", "Anna")] }));
  assert.ok(text.includes("Nicht zugeordnet: 2 Stunden"));
  assert.ok(text.includes("zählen nirgends mit"));
});

test("alle fünf Bereiche stehen im Text", () => {
  const text = balanceText(balance({ tage: 7, termine: [] }));
  for (const bereich of BEREICHE) assert.ok(text.includes(bereich === "beziehung" ? "Familie" : ""), bereich);
  assert.ok(text.includes("Karriere"));
  assert.ok(text.includes("Fitness"));
  assert.ok(text.includes("Wellbeing"));
  assert.ok(text.includes("Me Time"));
});
