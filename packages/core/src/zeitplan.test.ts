import assert from "node:assert/strict";
import test from "node:test";
import type { Aufgabe } from "./aufgaben.js";
import { uhrzeit } from "./ical.js";
import { lueckenOhne, PUFFER_MINUTEN, zeitplan, zeitplanText } from "./zeitplan.js";

/** Ortszeit des Testtags, damit `uhrzeit` dieselbe Uhrzeit liest. */
function um(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2026, 9, 5, h, m).getTime();
}

function luecke(von: string, bis: string) {
  return { von: um(von), bis: um(bis), minuten: (um(bis) - um(von)) / 60000 };
}

function aufgabe(text: string, minuten: number, wichtigkeit = 2): Aufgabe {
  return { id: text, text, minuten, wichtigkeit, erledigt: false, erstellt: "2026-10-05T08:00:00" };
}

test("die wichtigste Aufgabe bekommt den frühesten Block, in den sie passt", () => {
  const plan = zeitplan({
    aufgaben: [aufgabe("Angebot", 60, 3), aufgabe("Mails", 20)],
    luecken: [luecke("09:00", "10:30"), luecke("14:00", "16:00")],
    ab: um("08:00"),
  });
  assert.equal(uhrzeit(plan.bloecke[0]!.von), "09:00");
  assert.equal(plan.bloecke[0]!.aufgabe.text, "Angebot");
  // Nach 60 Minuten plus Luft beginnt die nächste Aufgabe, nicht direkt danach.
  assert.equal(uhrzeit(plan.bloecke[1]!.von), "10:10");
});

test("eine Aufgabe wird nicht zerteilt, sie wandert in einen grösseren Block", () => {
  const plan = zeitplan({
    aufgaben: [aufgabe("Konzept", 90, 3)],
    luecken: [luecke("09:00", "10:00"), luecke("13:00", "15:00")],
    ab: um("08:00"),
  });
  assert.equal(plan.bloecke.length, 1);
  assert.equal(uhrzeit(plan.bloecke[0]!.von), "13:00");
});

test("ein kleiner Block wird von einer späteren, kurzen Aufgabe genutzt", () => {
  const plan = zeitplan({
    aufgaben: [aufgabe("Konzept", 90, 3), aufgabe("Anruf", 15)],
    luecken: [luecke("09:00", "09:30"), luecke("13:00", "15:00")],
    ab: um("08:00"),
  });
  const anruf = plan.bloecke.find((b) => b.aufgabe.text === "Anruf")!;
  assert.equal(uhrzeit(anruf.von), "09:00");
  // Zeitlich sortiert, auch wenn der Rang ein anderer war.
  assert.deepEqual(plan.bloecke.map((b) => b.aufgabe.text), ["Anruf", "Konzept"]);
});

test("was in keinen Block passt, wird gesondert genannt und nicht hineingequetscht", () => {
  const plan = zeitplan({
    aufgaben: [aufgabe("Steuer", 120)],
    luecken: [luecke("09:00", "10:00")],
    ab: um("08:00"),
  });
  assert.equal(plan.bloecke.length, 0);
  assert.equal(plan.passtNicht.length, 1);
  assert.match(plan.hinweise.join(" "), /60 Minuten/);
});

test("ein angebrochener Block beginnt jetzt, auf den Takt gerundet", () => {
  const plan = zeitplan({
    aufgaben: [aufgabe("Mails", 20)],
    luecken: [luecke("09:00", "11:00")],
    ab: um("09:07"),
  });
  assert.equal(uhrzeit(plan.bloecke[0]!.von), "09:10");
});

test("vergangene Blöcke fallen weg", () => {
  const plan = zeitplan({
    aufgaben: [aufgabe("Mails", 20)],
    luecken: [luecke("07:00", "08:00"), luecke("15:00", "16:00")],
    ab: um("12:00"),
  });
  assert.equal(uhrzeit(plan.bloecke[0]!.von), "15:00");
});

test("der Text nennt die Luft als Regel und markiert Wichtiges", () => {
  const text = zeitplanText(zeitplan({
    aufgaben: [aufgabe("Angebot", 60, 3)],
    luecken: [luecke("09:00", "12:00")],
    ab: um("08:00"),
  }));
  assert.match(text, /09:00 bis 10:00: Angebot \(wichtig\)/);
  assert.match(text, new RegExp(`${PUFFER_MINUTEN} Minuten Luft`));
  assert.match(text, /Regel und keine Messung/);
});

test("ohne Aufgaben sagt der Text das, statt leer zu bleiben", () => {
  assert.equal(zeitplanText(zeitplan({ aufgaben: [], luecken: [], ab: um("08:00") })), "Für heute steht nichts im Plan.");
});

test("belegte Zeiten werden aus den Blöcken geschnitten", () => {
  const rest = lueckenOhne([luecke("09:00", "13:00")], [{ von: um("10:00"), bis: um("11:30") }]);
  assert.deepEqual(rest.map((l) => `${uhrzeit(l.von)}-${uhrzeit(l.bis)}`), ["09:00-10:00", "11:30-13:00"]);
  assert.deepEqual(rest.map((l) => l.minuten), [60, 90]);
});

test("was einen Block ganz bedeckt, entfernt ihn", () => {
  assert.equal(lueckenOhne([luecke("09:00", "10:00")], [{ von: um("08:00"), bis: um("11:00") }]).length, 0);
});

test("Belegtes ausserhalb lässt den Block unberührt", () => {
  const rest = lueckenOhne([luecke("09:00", "10:00")], [{ von: um("18:00"), bis: um("19:00") }]);
  assert.equal(rest[0]!.minuten, 60);
});
