import { strict as assert } from "node:assert";
import { test } from "node:test";
import { berlinZeit, sommerzeit } from "./zeitzone.js";

/** Dieselbe Angabe über Intl, also über die echte Zeitzonendatenbank. */
function ueberIntl(jetzt: Date): { tag: string; zeit: string } {
  const teile = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(jetzt);
  const feld = (typ: string) => teile.find((t) => t.type === typ)?.value ?? "";
  const stunde = feld("hour") === "24" ? "00" : feld("hour");
  return { tag: `${feld("year")}-${feld("month")}-${feld("day")}`, zeit: `${stunde}:${feld("minute")}` };
}

test("Die gerechnete Zeit stimmt über vier Jahre mit Intl überein", () => {
  // Alle sechs Stunden über vier Jahre. Damit liegen beide Umstellungen jedes
  // Jahres im Feld, dazu jede Tagesgrenze.
  let stelle = Date.UTC(2025, 0, 1);
  const ende = Date.UTC(2029, 0, 1);
  let geprueft = 0;
  while (stelle < ende) {
    const jetzt = new Date(stelle);
    const eigen = berlinZeit(jetzt);
    const intl = ueberIntl(jetzt);
    assert.deepEqual({ tag: eigen.tag, zeit: eigen.zeit }, intl, `Abweichung bei ${jetzt.toISOString()}`);
    stelle += 6 * 3600_000;
    geprueft++;
  }
  assert.ok(geprueft > 5800, `zu wenige Stichproben: ${geprueft}`);
});

test("Die Umstellungen liegen minutengenau richtig", () => {
  // Letzter Sonntag im März 2026 ist der 29., letzter im Oktober der 25.
  for (const [zeitpunkt, erwartet] of [
    ["2026-03-29T00:59:00Z", false],
    ["2026-03-29T01:00:00Z", true],
    ["2026-10-25T00:59:00Z", true],
    ["2026-10-25T01:00:00Z", false],
  ] as Array<[string, boolean]>) {
    assert.equal(sommerzeit(new Date(zeitpunkt)), erwartet, zeitpunkt);
  }
});

test("Minutengenau über beide Umstellungen stimmt es mit Intl überein", () => {
  for (const start of ["2026-03-29T00:00:00Z", "2026-10-25T00:00:00Z"]) {
    for (let minute = 0; minute < 180; minute++) {
      const jetzt = new Date(Date.parse(start) + minute * 60_000);
      const eigen = berlinZeit(jetzt);
      assert.deepEqual({ tag: eigen.tag, zeit: eigen.zeit }, ueberIntl(jetzt), jetzt.toISOString());
    }
  }
});

test("Der Versatz ist im Sommer zwei und im Winter eine Stunde", () => {
  assert.equal(berlinZeit(new Date("2026-07-01T12:00:00Z")).versatz, 2);
  assert.equal(berlinZeit(new Date("2026-01-15T12:00:00Z")).versatz, 1);
});

test("Kurz vor Mitternacht UTC gilt in Berlin schon der nächste Tag", () => {
  const z = berlinZeit(new Date("2026-07-10T22:30:00Z"));
  assert.equal(z.tag, "2026-07-11");
  assert.equal(z.zeit, "00:30");
});
