import assert from "node:assert/strict";
import test from "node:test";
import {
  aufgabeAusTodoist, todoistAbhaken, todoistAufgaben, todoistIdVon, TodoistFehler, TODOIST_STANDARD_MINUTEN,
} from "./todoist.js";

const HEUTE = "2026-10-05";

function antwort(status: number, json?: unknown): Response {
  return new Response(json === undefined ? null : JSON.stringify(json), {
    status,
    headers: json === undefined ? {} : { "content-type": "application/json" },
  });
}

test("Priorität: P1 und P2 werden wichtig, ohne Priorität bleibt es normal", () => {
  const prio = (p: number) => aufgabeAusTodoist({ id: "1", content: "x", priority: p }, HEUTE)!.wichtigkeit;
  assert.equal(prio(4), 3);
  assert.equal(prio(3), 3);
  assert.equal(prio(2), 2);
  assert.equal(prio(1), 2);
});

test("die harte Frist schlägt das Fälligkeitsdatum", () => {
  const a = aufgabeAusTodoist({ id: "1", content: "x", due: { date: "2026-10-09" }, deadline: { date: "2026-10-07" } }, HEUTE)!;
  assert.equal(a.faellig, "2026-10-07");
  const b = aufgabeAusTodoist({ id: "2", content: "y", due: { date: "2026-10-09T14:00:00" } }, HEUTE)!;
  assert.equal(b.faellig, "2026-10-09");
});

test("ohne Dauer wird angenommen und das steht an der Aufgabe", () => {
  const a = aufgabeAusTodoist({ id: "1", content: "x" }, HEUTE)!;
  assert.equal(a.minuten, TODOIST_STANDARD_MINUTEN);
  assert.equal(a.dauerAngenommen, true);
  const b = aufgabeAusTodoist({ id: "2", content: "y", duration: { amount: 45, unit: "minute" } }, HEUTE)!;
  assert.equal(b.minuten, 45);
  assert.equal(b.dauerAngenommen, false);
});

test("eine Dauer in Tagen ist keine Arbeitszeit", () => {
  const a = aufgabeAusTodoist({ id: "1", content: "x", duration: { amount: 2, unit: "day" } }, HEUTE)!;
  assert.equal(a.dauerAngenommen, true);
});

test("erledigte und leere Einträge fallen raus", () => {
  assert.equal(aufgabeAusTodoist({ id: "1", content: "x", checked: true }, HEUTE), null);
  assert.equal(aufgabeAusTodoist({ id: "1", content: "  " }, HEUTE), null);
  assert.equal(aufgabeAusTodoist(null, HEUTE), null);
});

test("die Kennung trägt die Herkunft, damit Abhaken weiss, wohin", () => {
  const a = aufgabeAusTodoist({ id: "8812", content: "x" }, HEUTE)!;
  assert.equal(a.id, "todoist:8812");
  assert.equal(todoistIdVon(a.id), "8812");
  assert.equal(todoistIdVon("eigene-aufgabe"), null);
});

test("liest über mehrere Seiten und schickt den Token als Bearer", async () => {
  const gesehen: string[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    gesehen.push(url);
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer abc");
    if (!url.includes("cursor=")) return antwort(200, { results: [{ id: "1", content: "A" }], next_cursor: "n2" });
    return antwort(200, { results: [{ id: "2", content: "B" }], next_cursor: null });
  }) as typeof fetch;
  const liste = await todoistAufgaben(HEUTE, { token: " abc ", fetchImpl });
  assert.deepEqual(liste.map((a) => a.text), ["A", "B"]);
  assert.match(gesehen[1]!, /cursor=n2/);
});

test("ein abgelehnter Token ergibt eine Meldung mit dem Weg zum neuen", async () => {
  const fetchImpl = (async () => antwort(401, { error: "x" })) as typeof fetch;
  await assert.rejects(todoistAufgaben(HEUTE, { token: "falsch", fetchImpl }), (e: unknown) => {
    assert.ok(e instanceof TodoistFehler);
    assert.match((e as Error).message, /Integrationen, Entwickler/);
    return true;
  });
});

test("ohne Token wird gar nicht erst angefragt", async () => {
  let angefragt = false;
  const fetchImpl = (async () => { angefragt = true; return antwort(200, []); }) as typeof fetch;
  await assert.rejects(todoistAufgaben(HEUTE, { token: "", fetchImpl }), /Kein Todoist Token/);
  assert.equal(angefragt, false);
});

test("Abhaken schickt POST auf close und nimmt 204 ohne Inhalt an", async () => {
  let ziel = "";
  let methode = "";
  const fetchImpl = (async (url: string, init: RequestInit) => {
    ziel = url;
    methode = String(init.method);
    return antwort(204);
  }) as typeof fetch;
  await todoistAbhaken("8812", { token: "abc", fetchImpl });
  assert.equal(methode, "POST");
  assert.match(ziel, /\/api\/v1\/tasks\/8812\/close$/);
});
