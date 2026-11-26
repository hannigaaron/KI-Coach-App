import { test } from "node:test";
import assert from "node:assert/strict";
import { gedenkArt, geburtstagsName, kalenderWaehlen } from "./gedenktage.js";
import { tagesablauf } from "./tagesablauf.js";
import { tagesbriefing } from "./tagesbriefing.js";
import type { Termin } from "./ical.js";
import type { UserProfile } from "./types.js";

const TAG = "2026-11-24";
const tag0 = new Date(`${TAG}T00:00:00`).getTime();
const h = (std: number) => tag0 + std * 3600_000;
const termin = (titel: string, von: number, bis: number, mehr: Partial<Termin> = {}): Termin =>
  ({ uid: `${titel}-${von}`, titel, ort: "", von, bis, ganztags: false, ...mehr });

test("Geburtstag und Feiertag werden erkannt, ein Termin mit Geburtstag im Titel nicht", () => {
  assert.equal(gedenkArt(termin("Zoe Geburtstag", h(0), h(0))), "geburtstag");
  assert.equal(gedenkArt(termin("Max", h(0), h(24), { ganztags: true, kalenderTyp: 4 })), "geburtstag");
  assert.equal(gedenkArt(termin("Buß und Bettag", h(0), h(24), { ganztags: true })), "feiertag");
  assert.equal(gedenkArt(termin("Frei", h(0), h(24), { ganztags: true, kalenderTyp: 3 })), "feiertag");
  assert.equal(gedenkArt(termin("Geburtstagsfeier bei Max", h(19), h(22))), null);
  assert.equal(gedenkArt(termin("Kunde", h(9), h(10))), null);
  assert.equal(gedenkArt(termin("Urlaub", h(0), h(24), { ganztags: true })), null);
});

test("der Name steht ohne Geburtstag und ohne Genitiv", () => {
  assert.equal(geburtstagsName("Zoe Geburtstag"), "Zoe");
  assert.equal(geburtstagsName("Geburtstag von Lena"), "Lena");
  assert.equal(geburtstagsName("Zoes Geburtstag"), "Zoe");
  assert.equal(geburtstagsName("Max Geburtstag"), "Max");
  assert.equal(geburtstagsName("Lisa's birthday"), "Lisa");
  assert.equal(geburtstagsName("Thomas Geburtstag"), "Thomas");
  assert.equal(geburtstagsName("Ines Geburtstag"), "Ines");
});

test("der Kalender mit den meisten Terminen gewinnt, Eigenes und Gedenktage bleiben", () => {
  const g = (n: number) => termin(`G${n}`, h(8 + n), h(9 + n), { kalender: "Aaron", kalenderQuelle: "Google" });
  const alt = termin("Alte Serie", h(10), h(11), { kalender: "Kalender", kalenderQuelle: "iCloud" });
  const eigen = termin("Training", h(18), h(19), { kalender: "Kalender", kalenderQuelle: "iCloud", daevo: true });
  const geb = termin("Zoe Geburtstag", h(0), h(0), { kalender: "Geburtstage", kalenderTyp: 4 });
  const w = kalenderWaehlen([g(1), g(2), g(3), alt, eigen, geb]);
  assert.equal(w.haupt?.name, "Aaron (Google)");
  assert.deepEqual(w.ignoriert.map((z) => z.name), ["Kalender (iCloud)"]);
  assert.deepEqual(w.termine.map((t) => t.titel).sort(), ["G1", "G2", "G3", "Training", "Zoe Geburtstag"]);
  // Eigene Wahl schlägt die Zahl, und "alle" liest wie früher.
  assert.equal(kalenderWaehlen([g(1), g(2), alt], { gewaehlt: "iCloud|Kalender" }).haupt?.name, "Kalender (iCloud)");
  assert.equal(kalenderWaehlen([g(1), g(2), alt], { alle: true }).termine.length, 3);
  // Ein einziger Kalender bleibt unberührt.
  assert.equal(kalenderWaehlen([g(1), g(2)]).haupt, null);
});

const PROFIL: UserProfile = { sex: "male", ageYears: 23, heightCm: 184, weightKg: 87, goal: "maintain", dailySteps: 12000, sessions: [], wakeTime: "07:00", sleepTime: "23:00" };
const ZIELE = { kcal: 3000, proteinG: 180, fatG: 90, carbsG: 340, waterMl: 3500 };

test("Feiertage stehen nirgends, der Geburtstag steht ganz am Ende des Briefings", () => {
  const termine = [
    termin("Buß und Bettag", h(0), h(24), { ganztags: true }),
    termin("Zoe Geburtstag", h(0), h(0)),
    termin("Kunde", h(9), h(10)),
  ];
  const ablauf = tagesablauf({ tag: TAG, termine, profile: PROFIL, ziele: ZIELE });
  assert.deepEqual(ablauf.geburtstage, ["Zoe"]);
  assert.equal(ablauf.ganztags.length, 0);
  assert.equal(ablauf.termine.length, 1);
  const b = tagesbriefing({
    art: "morgen", datum: "Dienstag", ablauf, aufgaben: [{ text: "Angebot", wichtig: true, um: "10:30", id: "a" }],
    ziele: { kcal: 3000, proteinG: 180 }, standards: [],
  } as never);
  assert.ok(!b.text.includes("Bettag"));
  const letzter = b.abschnitte[b.abschnitte.length - 1]!;
  assert.equal(letzter.titel, "Nicht vergessen");
  assert.match(letzter.zeilen[0]!, /Zoe hat heute Geburtstag/);
  assert.ok(b.abschnitte.findIndex((a) => a.titel === "Zu tun") < b.abschnitte.length - 1);
  assert.ok(!b.abschnitte.find((a) => a.titel === "Dein Tag")!.zeilen.some((z) => /Zoe|Bettag/.test(z)));
});
