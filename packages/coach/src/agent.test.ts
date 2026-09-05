import { test } from "node:test";
import assert from "node:assert/strict";
import { Agent, runOffline, type AgentActions } from "./agent.js";
import type { ChatMessage, CoachProvider, ContentBlock, ConverseRequest, ConverseResponse, JsonRequest } from "./provider.js";

function stubActions(log: string[]): AgentActions {
  return {
    async mahlzeitErfassen(b) { log.push(`mahlzeit:${b}`); return "Eingetragen: 500 kcal, 40 g Protein."; },
    async wasserEintragen(ml) { log.push(`wasser:${ml}`); return `${ml} ml eingetragen.`; },
    async tagesstandAbrufen() { log.push("stand"); return "Heute 1200 von 3000 kcal, 60 von 139 g Protein."; },
    async mahlzeitVorschlagen(w) { log.push(`vorschlag:${w ?? ""}`); return "Reis mit Ei."; },
    async checkinSpeichern(i) { log.push(`checkin:${i.notiz}`); return "Check-in gespeichert."; },
    async merken(i) { log.push(`merken:${i.text}|${i.art}|${i.wichtigkeit}`); return "Habe ich mir gemerkt."; },
    async gedaechtnisDurchsuchen(f) { log.push(`suche:${f}`); return "Verträgt keine Laktose."; },
    async einkaufslisteErstellen(i) { log.push(`einkauf:${i.tage ?? ""}`); return "Liste für 7 Tage, 14 Posten."; },
    async einkaufslisteAbrufen() { log.push("einkauf:abrufen"); return "14 Posten, 3 davon zu Hause."; },
    async einkaufslisteAbhaken(i) { log.push(`einkauf:${i.posten}=${i.stand}`); return "Notiert."; },
    async standardsAbrufen() { log.push("standards"); return "Protein: an 5 von 7 Tagen gehalten."; },
    async standardSetzen(i) { log.push(`standard:${i.text}`); return "Standard steht."; },
    async standardBestaetigen(i) { log.push(`standard:${i.id}=${i.gehalten}`); return "Eingetragen."; },
    async verlaufAbrufen(i) { log.push(`verlauf:${i.tage ?? ""}`); return "Minus 0,4 kg die Woche, Bedarf etwa 2900 kcal."; },
    async kalenderAbrufen(i) { log.push(`kalender:${i.tage ?? ""}`); return "Montag: 3 Termine, 240 Minuten verplant."; },
    async aufgabeAnlegen(i) { log.push(`aufgabe:${i.text}`); return "Steht auf der Liste."; },
    async aufgabeAbhaken(i) { log.push(`abhaken:${i.text}`); return "Abgehakt."; },
    async aufgabenPriorisieren() { log.push("prio"); return "Heute noch: Angebot schreiben."; },
    async mittagscheckSpeichern(i) { log.push(`mittag:${i.energie}/${i.konzentration}/${i.saettigung}`); return "Notiert."; },
    async briefingErstellen(i) { log.push(`briefing:${i.art}`); return "Guten Morgen."; },
    async tagesablaufPlanen(i) { log.push(`tagesablauf:${i.tag ?? ""}`); return "Wach von 07:00 bis 23:00. Verplant: 240 Minuten."; },
    async gewichtEintragen(kg) { log.push(`gewicht:${kg}`); return `${kg} kg eingetragen.`; },
    async trainingEintragen(i) { log.push(`training:${i.art}/${i.minuten}`); return "Training eingetragen."; },
    async profilAendern(i) { log.push(`profil:${JSON.stringify(i)}`); return "Profil geändert."; },
    async fotoAlsMahlzeit(i) { log.push(`fotoMahlzeit:${i.hinweis ?? ""}`); return "Teller erfasst, 620 kcal."; },
    async fotoAlsVorrat(i) { log.push(`fotoVorrat:${i.hinweis ?? ""}`); return "Zwölf Zutaten übernommen."; },
  };
}

class ScriptedProvider implements CoachProvider {
  readonly name = "scripted";
  readonly available = true;
  readonly seen: ConverseRequest[] = [];
  private step = 0;
  constructor(private readonly script: ConverseResponse[]) {}
  async generateJson<T>(_r: JsonRequest): Promise<T> { throw new Error("nicht benutzt"); }
  async converse(request: ConverseRequest): Promise<ConverseResponse> {
    this.seen.push(structuredClone(request));
    const next = this.script[this.step++];
    if (!next) throw new Error("Skript zu Ende");
    return next;
  }
}

class DeadProvider implements CoachProvider {
  readonly name = "dead";
  readonly available = true;
  async generateJson<T>(): Promise<T> { throw new Error("weg"); }
  async converse(): Promise<ConverseResponse> { throw new Error("Netzwerkfehler"); }
}

class NoProvider implements CoachProvider {
  readonly name = "none";
  readonly available = false;
  async generateJson<T>(): Promise<T> { throw new Error("nicht verfügbar"); }
  async converse(): Promise<ConverseResponse> { throw new Error("nicht verfügbar"); }
}

const KONTEXT = { profil: "Aaron, 23", tag: "0 kcal", gedächtnis: "nichts", zeit: "Donnerstag 12:00" };
const LEER: ChatMessage[] = [];

function text(t: string): ContentBlock[] { return [{ type: "text", text: t }]; }
function toolUse(name: string, input: Record<string, unknown>): ContentBlock[] {
  return [{ type: "tool_use", id: "t1", name, input }];
}

test("Antwort ohne Werkzeug kommt direkt durch", async () => {
  const log: string[] = [];
  const provider = new ScriptedProvider([{ content: text("Alles klar."), stopReason: "end_turn" }]);
  const reply = await new Agent(provider).respond({ nachricht: "Hi", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions(log) });
  assert.equal(reply.text, "Alles klar.");
  assert.equal(reply.source, "model");
  assert.deepEqual(log, []);
});

test("Werkzeugaufruf wird ausgeführt und das Ergebnis zurückgegeben", async () => {
  const log: string[] = [];
  const provider = new ScriptedProvider([
    { content: toolUse("wasser_eintragen", { ml: 500 }), stopReason: "tool_use" },
    { content: text("500 ml sind drin."), stopReason: "end_turn" },
  ]);
  const reply = await new Agent(provider).respond({ nachricht: "Ich hatte eine Flasche Wasser", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions(log) });
  assert.equal(reply.text, "500 ml sind drin.");
  assert.deepEqual(log, ["wasser:500"]);
  assert.deepEqual(reply.ausgeführt, ["500 ml Wasser eingetragen"]);
});

test("das Werkzeugergebnis wird dem Modell zurückgereicht", async () => {
  const provider = new ScriptedProvider([
    { content: toolUse("tagesstand_abrufen", {}), stopReason: "tool_use" },
    { content: text("Du liegst gut."), stopReason: "end_turn" },
  ]);
  await new Agent(provider).respond({ nachricht: "Wie stehe ich?", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions([]) });
  const zweite = provider.seen[1]!;
  const letzte = zweite.messages[zweite.messages.length - 1]!;
  const blöcke = letzte.content as ContentBlock[];
  assert.equal(letzte.role, "user");
  assert.equal(blöcke[0]!.type, "tool_result");
  assert.match((blöcke[0] as { content: string }).content, /1200/);
});

test("Kontext landet im Systemprompt", async () => {
  const provider = new ScriptedProvider([{ content: text("ok"), stopReason: "end_turn" }]);
  await new Agent(provider).respond({ nachricht: "Hi", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions([]) });
  // Der Prompt kommt jetzt in Bloecken. Fuer die Pruefung wieder zusammensetzen.
  const roh = provider.seen[0]!.system;
  const system = typeof roh === "string" ? roh : roh.map((b) => b.text).join("\n");
  assert.match(system, /Aaron, 23/);
  assert.match(system, /Donnerstag 12:00/);
  assert.match(system, /Zahlen über diesen Nutzer kommen aus den Werkzeugen/);
});

test("unbegrenzte Werkzeugschleife wird gestoppt", async () => {
  const endlos = Array.from({ length: 16 }, () => ({ content: toolUse("tagesstand_abrufen", {}), stopReason: "tool_use" }));
  const provider = new ScriptedProvider(endlos);
  const reply = await new Agent(provider).respond({ nachricht: "Hi", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions([]) });
  assert.match(reply.text, /verrannt/);
});

test("ein Fehler im Werkzeug bricht das Gespräch nicht ab", async () => {
  const kaputt: AgentActions = { ...stubActions([]), async wasserEintragen() { throw new Error("Speicher voll"); } };
  const provider = new ScriptedProvider([
    { content: toolUse("wasser_eintragen", { ml: 500 }), stopReason: "tool_use" },
    { content: text("Das konnte ich nicht eintragen."), stopReason: "end_turn" },
  ]);
  const reply = await new Agent(provider).respond({ nachricht: "500 ml", verlauf: LEER, kontext: KONTEXT, aktionen: kaputt });
  assert.equal(reply.text, "Das konnte ich nicht eintragen.");
  const zweite = provider.seen[1]!;
  const blöcke = zweite.messages[zweite.messages.length - 1]!.content as ContentBlock[];
  assert.equal((blöcke[0] as { is_error?: boolean }).is_error, true);
});

test("fällt bei Netzwerkfehler auf den Regelpfad zurück", async () => {
  const log: string[] = [];
  const reply = await new Agent(new DeadProvider()).respond({
    nachricht: "Ich habe zwei Gläser Wasser getrunken", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions(log),
  });
  assert.equal(reply.source, "offline");
  assert.deepEqual(log, ["wasser:500"]);
  assert.match(reply.text, /nicht erreichbar/);
});

test("ohne Schlüssel läuft alles über den Regelpfad", async () => {
  const log: string[] = [];
  const reply = await new Agent(new NoProvider()).respond({
    nachricht: "Wie viel habe ich heute noch?", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions(log),
  });
  assert.equal(reply.source, "offline");
  assert.deepEqual(log, ["stand"]);
});

test("Regelpfad erkennt Mengen in Litern und Gläsern", async () => {
  for (const [satz, erwartet] of [
    ["Ich habe 1,5 Liter getrunken", "wasser:1500"],
    ["Zwei Gläser Wasser", "wasser:500"],
    ["ein halber Liter Wasser", "wasser:500"],
    ["Ich hatte zwölf Gläser", "wasser:3000"],
    ["3 Gläser getrunken", "wasser:750"],
    ["Eine Flasche Wasser getrunken", "wasser:500"],
    ["750 ml getrunken", "wasser:750"],
  ] as const) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.equal(log[0], erwartet, satz);
  }
});

test("kalorienhaltige Getränke landen in der Mahlzeit, nicht im Wasser", async () => {
  const log: string[] = [];
  await runOffline("Ich hatte ein Glas Cola", stubActions(log));
  assert.match(log[0]!, /^mahlzeit:/);
});

test("Regelpfad merkt sich etwas auf Zuruf", async () => {
  const log: string[] = [];
  const reply = await runOffline("Merk dir, ich vertrage keine Laktose", stubActions(log));
  assert.match(log[0]!, /^merken:ich vertrage keine Laktose/);
  assert.match(reply.text, /Notiert/);
});

test("Regelpfad sagt ehrlich, wenn er nicht weiterweiss", async () => {
  const reply = await runOffline("Erklär mir die Weltwirtschaft", stubActions([]));
  assert.match(reply.text, /verstehe ich nur einfache Sätze/);
  assert.equal(reply.ausgeführt.length, 0);
});
