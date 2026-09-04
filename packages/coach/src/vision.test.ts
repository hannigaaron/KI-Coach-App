import { test } from "node:test";
import assert from "node:assert/strict";
import { AnthropicProvider } from "./anthropic.js";
import { anhangBlock, type Anhang, type CoachProvider, type ConverseRequest, type ConverseResponse, type JsonRequest } from "./provider.js";
import { mahlzeitAusFoto, vorratAusFoto } from "./vision.js";

const BILD: Anhang = { mediaType: "image/jpeg", data: "AAECAwQ=", name: "teller.jpg" };
const PDF: Anhang = { mediaType: "application/pdf", data: "JVBERi0=", name: "blutbild.pdf" };

class StubProvider implements CoachProvider {
  readonly name = "stub";
  readonly available = true;
  readonly gesehen: JsonRequest[] = [];
  constructor(private readonly antwort: unknown) {}
  async generateJson<T>(request: JsonRequest): Promise<T> {
    this.gesehen.push(request);
    return this.antwort as T;
  }
  async converse(_r: ConverseRequest): Promise<ConverseResponse> {
    throw new Error("nicht benutzt");
  }
}

/* ---------- Inhaltsblöcke ---------- */

test("ein Bild wird zum Bildblock, ein PDF zum Dokumentblock", () => {
  assert.deepEqual(anhangBlock(BILD), {
    type: "image",
    source: { type: "base64", media_type: "image/jpeg", data: "AAECAwQ=" },
  });
  assert.deepEqual(anhangBlock(PDF), {
    type: "document",
    source: { type: "base64", media_type: "application/pdf", data: "JVBERi0=" },
  });
});

test("Anhänge stehen im Aufruf vor dem Text", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return new Response(
        JSON.stringify({ content: [{ type: "tool_use", name: "x", input: { ok: true } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  await provider.generateJson({
    system: "s",
    user: "Werte das Bild aus.",
    anhaenge: [BILD],
    schema: { type: "object" },
    schemaName: "x",
  });
  const inhalt = (gesendet.messages as Array<{ content: unknown }>)[0]!.content as Array<{ type: string }>;
  assert.equal(Array.isArray(inhalt), true);
  assert.equal(inhalt[0]!.type, "image", "das Bild muss zuerst kommen");
  assert.equal(inhalt[1]!.type, "text");
});

test("ohne Anhang bleibt der Inhalt eine Zeichenkette", async () => {
  let gesendet: Record<string, unknown> = {};
  const provider = new AnthropicProvider({
    apiKey: "sk-test",
    model: "claude-opus-5",
    fetchImpl: async (_url, init) => {
      gesendet = JSON.parse(String((init as RequestInit).body));
      return new Response(
        JSON.stringify({ content: [{ type: "tool_use", name: "x", input: {} }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  await provider.generateJson({ system: "s", user: "Hallo", schema: { type: "object" }, schemaName: "x" });
  assert.equal(typeof (gesendet.messages as Array<{ content: unknown }>)[0]!.content, "string");
});

test("fetch wird gebunden gespeichert, nicht blank", async () => {
  // Wird die blanke Funktion in einem Feld abgelegt und als this.fetchImpl
  // aufgerufen, ist this die Instanz statt window. Browser werfen dann
  // "Illegal invocation", und es geht keine einzige Anfrage raus. Der Fehler
  // faellt in Node nicht auf, deshalb dieser Test mit einem strengen this.
  const streng = function (this: unknown): Promise<Response> {
    if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
    return Promise.resolve(new Response(
      JSON.stringify({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));
  } as unknown as typeof fetch;
  const provider = new AnthropicProvider({ apiKey: "sk-test", model: "claude-opus-5", fetchImpl: streng });
  const antwort = await provider.converse({ system: "s", messages: [{ role: "user", content: "hi" }], tools: [] });
  assert.equal(antwort.stopReason, "end_turn");
});

/* ---------- Mahlzeit aus dem Foto ---------- */

test("ein Teller wird zu geprueften Eintraegen", async () => {
  const provider = new StubProvider({
    beschreibung: "Reis mit Hähnchen und Brokkoli",
    entries: [
      { name: "Reis, gekocht", quantity: "180 g", kcal: 234, proteinG: 4.9, fatG: 0.5, carbsG: 50.4 },
      { name: "Hähnchenbrust", quantity: "150 g", kcal: 180, proteinG: 34.5, fatG: 3.9, carbsG: 0 },
    ],
    annahme: "Menge am Tellerrand von 27 cm geschätzt",
    sicherheit: "mittel",
    rueckfrage: "",
  });
  const ergebnis = await mahlzeitAusFoto(provider, [BILD]);
  assert.equal(ergebnis.entries.length, 2);
  assert.equal(ergebnis.sicherheit, "mittel");
  assert.match(ergebnis.annahme, /Tellerrand/);
  // Das Bild muss wirklich mitgegangen sein.
  assert.deepEqual(provider.gesehen[0]!.anhaenge, [BILD]);
  assert.match(provider.gesehen[0]!.system, /Bezugsgrösse/);
});

test("der Hinweis des Nutzers landet im Aufruf", async () => {
  const provider = new StubProvider({ beschreibung: "x", entries: [], annahme: "", sicherheit: "niedrig", rueckfrage: "" });
  await mahlzeitAusFoto(provider, [BILD], "Da ist noch ein Esslöffel Öl drin");
  assert.match(provider.gesehen[0]!.user, /Esslöffel Öl/);
});

test("kein Essen auf dem Bild ergibt keine erfundenen Eintraege", async () => {
  const provider = new StubProvider({
    beschreibung: "Ein Schreibtisch mit einem Laptop",
    entries: [],
    annahme: "",
    sicherheit: "hoch",
    rueckfrage: "",
  });
  const ergebnis = await mahlzeitAusFoto(provider, [BILD]);
  assert.equal(ergebnis.entries.length, 0);
  assert.match(ergebnis.beschreibung, /Schreibtisch/);
});

test("Kalorien, die nicht zu den Makros passen, werden bemerkt", async () => {
  // 30 g Protein, 10 g Fett, 40 g Kohlenhydrate ergeben 370 kcal, nicht 900.
  const provider = new StubProvider({
    beschreibung: "Teller",
    entries: [{ name: "Irgendwas", quantity: "200 g", kcal: 900, proteinG: 30, fatG: 10, carbsG: 40 }],
    annahme: "",
    sicherheit: "hoch",
    rueckfrage: "",
  });
  const ergebnis = await mahlzeitAusFoto(provider, [BILD]);
  assert.ok(ergebnis.warnings.length > 0, "eine unstimmige Rechnung muss auffallen");
});

test("eine unsinnige Sicherheitsangabe faellt auf mittel zurueck", async () => {
  for (const wert of ["sehr hoch", "", null, 5]) {
    const provider = new StubProvider({ beschreibung: "x", entries: [], annahme: "", sicherheit: wert, rueckfrage: "" });
    const ergebnis = await mahlzeitAusFoto(provider, [BILD]);
    assert.equal(ergebnis.sicherheit, "mittel", String(wert));
  }
});

/* ---------- Vorrat aus dem Foto ---------- */

test("aus einem Kuehlschrankfoto wird eine Zutatenliste", async () => {
  const provider = new StubProvider({
    beschreibung: "Ein offener Kühlschrank",
    zutaten: ["Magerquark", "Eier", "Brokkoli", "Butter"],
    unsicher: ["etwas in einer Dose"],
  });
  const ergebnis = await vorratAusFoto(provider, [BILD]);
  assert.deepEqual(ergebnis.zutaten, ["Magerquark", "Eier", "Brokkoli", "Butter"]);
  assert.deepEqual(ergebnis.unsicher, ["etwas in einer Dose"]);
  assert.match(provider.gesehen[0]!.system, /Kühlschranks/);
});

test("doppelte und unsinnige Eintraege fliegen raus", async () => {
  const provider = new StubProvider({
    beschreibung: "x",
    zutaten: ["Eier", "eier", "EIER", "a", "", null, 42, "x".repeat(80), "Milch"],
    unsicher: "keine Liste",
  });
  const ergebnis = await vorratAusFoto(provider, [BILD]);
  assert.deepEqual(ergebnis.zutaten, ["Eier", "42", "Milch"]);
  assert.deepEqual(ergebnis.unsicher, []);
});

test("die Liste wird bei vierzig Eintraegen gekappt", async () => {
  const viele = Array.from({ length: 60 }, (_, i) => `Zutat ${i}`);
  const provider = new StubProvider({ beschreibung: "x", zutaten: viele, unsicher: [] });
  const ergebnis = await vorratAusFoto(provider, [BILD]);
  assert.equal(ergebnis.zutaten.length, 40);
});
