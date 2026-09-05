import { test } from "node:test";
import assert from "node:assert/strict";
import { restDesTages, tagesablauf, tagesablaufText, wochenText } from "./tagesablauf.js";
import type { Termin } from "./ical.js";
import type { MacroTargets, UserProfile } from "./types.js";

const PROFIL: UserProfile = {
  sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain",
  dailySteps: 12000, sessions: [], wakeTime: "07:00", sleepTime: "23:00",
};

const ZIELE: MacroTargets = { kcal: 3000, proteinG: 180, fatG: 90, carbsG: 340, waterMl: 3500 };

const TAG = "2026-09-07";

function t(von: string, bis: string, titel: string, ganztags = false): Termin {
  return {
    uid: `${titel}-${von}`, titel, ort: "",
    von: new Date(`${TAG}T${von}:00`).getTime(),
    bis: new Date(`${TAG}T${bis}:00`).getTime(),
    ganztags,
  };
}

function lauf(termine: Termin[], profile = PROFIL) {
  return tagesablauf({ tag: TAG, termine, profile, ziele: ZIELE });
}

test("ein leerer Tag wird als leer erkannt und nicht schöngeredet", () => {
  const a = lauf([]);
  assert.equal(a.belegtMinuten, 0);
  assert.equal(a.auslastung, 0);
  assert.ok(a.hinweise.some((h) => h.includes("zerfällt ohne Plan")));
});

test("die verplante Zeit wird gerechnet, nicht geschätzt", () => {
  const a = lauf([t("09:00", "12:00", "Kunden"), t("14:00", "15:30", "Zirkeltraining")]);
  assert.equal(a.belegtMinuten, 180 + 90);
  // Wach von 07:00 bis 23:00 sind 960 Minuten.
  assert.equal(Math.round(a.auslastung * 100), Math.round((270 / 960) * 100));
});

test("überlappende Termine zählen nicht doppelt", () => {
  const a = lauf([t("09:00", "11:00", "A"), t("10:00", "12:00", "B")]);
  assert.equal(a.belegtMinuten, 180);
});

test("der längste freie Block wird gefunden", () => {
  const a = lauf([t("09:00", "10:00", "A"), t("18:00", "19:00", "B")]);
  assert.ok(a.fokusblock);
  // Zwischen 10 und 18 Uhr liegen 480 Minuten, mehr als 07:00 bis 09:00.
  assert.equal(a.fokusblock!.minuten, 480);
});

test("ein Termin vor der Aufstehzeit wird angesprochen", () => {
  const a = lauf([t("06:00", "07:30", "Frühschicht")]);
  assert.ok(a.hinweise.some((h) => h.includes("vor deiner Aufstehzeit")));
});

test("ein Termin nach der Schlafenszeit wird angesprochen", () => {
  const a = lauf([t("21:00", "23:45", "Spiel")]);
  assert.ok(a.hinweise.some((h) => h.includes("nach deiner Schlafenszeit")));
});

test("ein voller Tag führt zu einer Warnung mit Zahl", () => {
  // 720 von 960 Wachminuten sind 75 Prozent, die Schwelle liegt bei 70.
  const a = lauf([t("08:00", "20:00", "Durchgehend Kunden")]);
  const hinweis = a.hinweise.find((h) => h.includes("Prozent"));
  assert.ok(hinweis);
  assert.ok(hinweis!.includes("720 von 960"));
});

test("Training wird aus dem Titel erkannt", () => {
  const a = lauf([t("19:00", "21:00", "Volleyball Training"), t("09:00", "10:00", "Zahnarzt")]);
  assert.equal(a.training.length, 1);
  assert.equal(a.training[0]!.titel, "Volleyball Training");
});

test("ohne Mittagslücke wird das gesagt", () => {
  const a = lauf([t("11:00", "15:00", "Blockseminar")]);
  assert.ok(a.hinweise.some((h) => h.includes("zwischen 11 und 15 Uhr") || h.includes("11 und 15 Uhr")));
});

test("spätes Training wird mit dem Schlaf verknüpft", () => {
  const a = lauf([t("21:00", "22:30", "Volleyball")]);
  assert.ok(a.hinweise.some((h) => h.includes("Nach spätem Training")));
});

test("die Mahlzeiten liegen in den Lücken, nicht in den Terminen", () => {
  const termine = [t("09:00", "12:00", "Kunden"), t("14:00", "17:00", "Kunden")];
  const a = lauf(termine);
  assert.ok(a.essensfenster.length >= 3);
  for (const e of a.essensfenster) {
    for (const termin of termine) {
      assert.ok(e.um <= termin.von || e.um >= termin.bis,
        `Mahlzeit ${new Date(e.um).toISOString()} liegt in ${termin.titel}`);
    }
  }
});

test("die Mahlzeiten teilen das Tagesziel auf", () => {
  const a = lauf([]);
  const protein = a.essensfenster.reduce((s, e) => s + e.proteinG, 0);
  // Vier Mahlzeiten zu je 45 g ergeben die 180 g Ziel.
  assert.equal(protein, 180);
});

test("vor einem Training rückt die Mahlzeit nach vorn und sagt warum", () => {
  const a = lauf([t("19:00", "21:00", "Volleyball")]);
  const davor = a.essensfenster.find((e) => e.grund.includes("90 Minuten vor"));
  assert.ok(davor, a.essensfenster.map((e) => e.grund).join(" | "));
  assert.ok(davor!.um <= new Date(`${TAG}T19:00:00`).getTime());
});

test("ein Wachfenster über Mitternacht wird richtig gerechnet", () => {
  const a = lauf([], { ...PROFIL, wakeTime: "08:00", sleepTime: "01:00" });
  // 08:00 bis 01:00 am Folgetag sind 17 Stunden.
  assert.equal(Math.round((a.wachBis - a.wachVon) / 3600_000), 17);
});

test("der Text nennt jede Zahl, auf der er beruht", () => {
  const text = tagesablaufText(lauf([t("09:00", "12:00", "Kunden")]));
  assert.ok(text.includes("09:00 bis 12:00 Kunden"));
  assert.ok(text.includes("Verplant: 180 Minuten"));
  assert.ok(text.includes("Wach von 07:00 bis 23:00"));
});

test("die Wochenübersicht bleibt eine Zeile je Tag", () => {
  const text = wochenText([lauf([t("09:00", "12:00", "Kunden")])]);
  assert.equal(text.split("\n").length, 1);
  assert.ok(text.includes("Montag"));
});

test("ein Termin heisst Termin, nicht Termine", () => {
  assert.ok(wochenText([lauf([t("09:00", "12:00", "Kunden")])]).includes("1 Termin,"));
  assert.ok(wochenText([lauf([t("09:00", "10:00", "A"), t("11:00", "12:00", "B")])]).includes("2 Termine,"));
});

test("ein leerer Tag steht als leer da, nicht als null Termine", () => {
  const text = wochenText([lauf([])]);
  assert.ok(text.includes("nichts im Kalender"));
  assert.equal(text.includes("0 Termine"), false);
});

test("der Rest des Tages rechnet ab jetzt, nicht ab dem Aufstehen", () => {
  const a = lauf([t("09:00", "12:00", "Kunden"), t("16:00", "17:00", "Kunde")]);
  const jetzt = new Date(`${TAG}T13:00:00`).getTime();
  const rest = restDesTages(a, jetzt);
  // 13:00 bis 23:00 sind 600 Minuten, davon eine Stunde belegt.
  assert.equal(rest.restMinuten, 600);
  assert.equal(rest.freieMinuten, 540);
  // Bis 13 Uhr waren die drei Stunden Kunden belegt.
  assert.equal(rest.belegtBisJetzt, 180);
});

test("nach der Schlafenszeit ist nichts mehr frei", () => {
  const a = lauf([]);
  const rest = restDesTages(a, new Date(`${TAG}T23:59:00`).getTime());
  assert.equal(rest.freieMinuten, 0);
  assert.equal(rest.restMinuten, 0);
});
