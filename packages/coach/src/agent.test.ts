import { test } from "node:test";
import assert from "node:assert/strict";
import { Agent, istAbsicht, runOffline, type AgentActions } from "./agent.js";
import type { ChatMessage, CoachProvider, ContentBlock, ConverseRequest, ConverseResponse, JsonRequest } from "./provider.js";

function stubActions(log: string[]): AgentActions {
  return {
    async mahlzeitErfassen(b) { log.push(`mahlzeit:${b}`); return "Eingetragen: 500 kcal, 40 g Protein."; },
    async mahlzeitKorrigieren(i) { log.push(`korrigieren:${i.posten ?? ""}:${i.neueMenge}`); return "Korrigiert."; },
    async eintragZuruecknehmen(i) { log.push(`zurueck:${i.art ?? ""}:${i.suche ?? ""}`); return "Raus: 200 g Magerquark."; },
    async tagZuEndePlanen(i) { log.push(`planen:${(i.mahlzeiten ?? []).join("+")}`); return "Abendessen 900 kcal."; },
    async gespraecheDurchsuchen(i) { log.push(`suche:${i.suche}`); return "Zwei Gespräche gefunden."; },
    async gespraechEinordnenAktiv(i) { log.push(`einordnen:${i.ordner}`); return "Verschoben."; },
    async tageszeitenSetzen(i) { log.push(`zeiten:${i.tag ?? "heute"}:${i.aufstehen ?? ""}:${i.schlafen ?? ""}`); return "Eingetragen."; },
    async produktNachschlagen(i) { log.push(`produkt:${i.suche}:${i.gramm ?? ""}:${i.erfassen ? "ja" : "nein"}`); return "More Nutrition Grießpudding, 346 kcal je 100 g."; },
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
    async kalenderAbrufen(i) {
      log.push(`kalender:${i.stand ? "stand" : (i.tage ?? "")}`);
      return i.stand ? "Dein Kalender ist verbunden. 42 Termine liegen hier." : "Montag: 3 Termine, 240 Minuten verplant.";
    },
    async aufgabeAnlegen(i) { log.push(`aufgabe:${i.text}`); return "Steht auf der Liste."; },
    async aufgabeAbhaken(i) { log.push(`abhaken:${i.text}`); return "Abgehakt."; },
    async aufgabenPriorisieren() { log.push("prio"); return "Heute noch: Angebot schreiben."; },
    async kopfLeeren(i) { log.push(`kopf:${i.text.slice(0, 12)}`); return "Fang hiermit an: Angebot schreiben."; },
    async musterErkennen(i) { log.push(`muster:${i.tage ?? ""}`); return "Schlaf und Energie hängen zusammen."; },
    async balanceAbrufen(i) { log.push(`balance:${i.tage ?? ""}`); return "Karriere 40 Stunden, Me Time 0 Minuten."; },
    async zeitEintragen(i) { log.push(`zeit:${i.bereich}:${i.minuten}`); return "Gebucht."; },
    async widerspruechePruefen() { log.push("widerspruch"); return "Protein: Ziel 180 g, im Schnitt 120 g."; },
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
  // Die Aufgabe wird trotzdem erledigt, und der Nutzer erfährt warum das
  // Modell nicht dran war. Vorher stand hier nur "nicht erreichbar", was ihn
  // ohne jeden Anhaltspunkt zurückliess.
  assert.match(reply.text, /500 ml eingetragen/);
  assert.ok(!/nicht erreichbar/.test(reply.text), "keine Ausrede ohne Ursache");
  assert.match(reply.text, /gescheitert|Schlüssel|Guthaben|Netz|überlastet/);
});

test("bei einem abgelehnten Schlüssel steht im Chat, was zu tun ist", async () => {
  class KeyProvider implements CoachProvider {
    readonly name = "key";
    readonly available = true;
    async generateJson<T>(): Promise<T> { throw new Error("weg"); }
    async converse(): Promise<ConverseResponse> {
      throw new Error('Anthropic API 401: {"error":{"message":"invalid x-api-key"}}');
    }
  }
  const log: string[] = [];
  const reply = await new Agent(new KeyProvider()).respond({
    nachricht: "Ich habe zwei Gläser Wasser getrunken", verlauf: LEER, kontext: KONTEXT, aktionen: stubActions(log),
  });
  assert.match(reply.text, /Schlüssel wird abgelehnt/);
  assert.match(reply.text, /Profil/);
  // Ein falscher Schlüssel wird beim zweiten Versuch nicht richtig.
  assert.ok(!/nochmal/.test(reply.text), "kein sinnloser Hinweis auf einen erneuten Versuch");
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

test("ein Barcode geht ohne Schluessel direkt in die Datenbank", async () => {
  const log: string[] = [];
  await runOffline("Ich hatte den hier gegessen: 4255719307476", stubActions(log));
  assert.equal(log[0], "produkt:4255719307476::ja");
});

test("eine Marke im Text schlaegt nach statt zu raten", async () => {
  const log: string[] = [];
  await runOffline("Ich hatte einen More Nutrition Grießpudding", stubActions(log));
  assert.match(log[0]!, /^produkt:/);
  assert.match(log[0]!, /More Nutrition/);
});

test("die Grammangabe wandert mit und faellt aus dem Suchbegriff", async () => {
  const log: string[] = [];
  await runOffline("60 g More Nutrition Grießpudding gegessen", stubActions(log));
  assert.match(log[0]!, /^produkt:/);
  assert.match(log[0]!, /:60:ja$/);
  assert.ok(!log[0]!.includes("60 g"), "die Menge gehoert nicht in den Suchbegriff");
});

test("eine Frage nach einer Marke traegt nichts ein", async () => {
  const log: string[] = [];
  await runOffline("Wie viele Kalorien hat ein More Nutrition Grießpudding", stubActions(log));
  assert.match(log[0]!, /:nein$/);
});

test("Grundnahrungsmittel gehen weiter an die Mahlzeit", async () => {
  const log: string[] = [];
  await runOffline("Ich hatte 200 g Hähnchenbrust und Reis gegessen", stubActions(log));
  assert.match(log[0]!, /^mahlzeit:/);
});

test("ein Supermarkt ist keine Marke und loest keine Produktsuche aus", async () => {
  // Der echte Fall aus dem Betrieb: der Satz ging komplett als Suchbegriff an
  // Open Food Facts, fand nichts, und die Mahlzeit wurde nie erfasst.
  const log: string[] = [];
  await runOffline(
    "Also ich hab gerade 400 g Puten Hackfleisch von Lidl gegessen mit einer mittleren Süßkartoffel und eine Handvoll Kartoffeln",
    stubActions(log),
  );
  assert.match(log[0]!, /^mahlzeit:/, "eine Mahlzeit mit drei Zutaten ist keine Produktsuche");
});

test("auch einzeln loest ein Haendlername keine Suche aus", async () => {
  for (const satz of [
    "Ich hatte Hackfleisch von Lidl gegessen",
    "Joghurt von Aldi gegessen",
    "Ich war bei Rewe einkaufen",
  ]) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.ok(!log.some((z) => z.startsWith("produkt:")), satz);
  }
});

test("eine Aufzaehlung mit echter Marke bleibt eine Mahlzeit", async () => {
  // Der Griesspudding allein ist ein Produkt. Mit Banane und Haferflocken ist
  // es eine Mahlzeit, und die beiden anderen Zutaten duerfen nicht wegfallen.
  const log: string[] = [];
  await runOffline("More Nutrition Grießpudding mit Banane und Haferflocken gegessen", stubActions(log));
  assert.match(log[0]!, /^mahlzeit:/);
});

test("eine echte Marke allein schlaegt weiterhin nach", async () => {
  const log: string[] = [];
  await runOffline("60 g More Nutrition Grießpudding gegessen", stubActions(log));
  assert.match(log[0]!, /^produkt:/);
});

test("der Haendlername faellt aus dem Suchbegriff", async () => {
  const log: string[] = [];
  await runOffline("Ein Barebells Riegel von Rewe gegessen", stubActions(log));
  assert.match(log[0]!, /^produkt:/);
  assert.ok(!/rewe/i.test(log[0]!), "der Laden gehoert nicht in die Suche");
  assert.match(log[0]!, /Barebells/);
});

test("eine Marke in einem laengeren Wort loest nichts aus", async () => {
  // "dm" steckt in "Kardamom". Ohne Wortgrenze schickt jeder Gewuerztext eine
  // Datenbankabfrage los und bekommt ein fremdes Produkt zurueck.
  const log: string[] = [];
  await runOffline("Ich hatte Reis mit Kardamom gegessen", stubActions(log));
  assert.match(log[0]!, /^mahlzeit:/);
});

test("eine Jahreszahl ist kein Barcode", async () => {
  const log: string[] = [];
  await runOffline("Ich wiege seit 2024 immer 87 kg", stubActions(log));
  assert.ok(!log.some((z) => z.startsWith("produkt:")), "vier Ziffern sind kein Barcode");
});

test("eine Fruehschicht wird ohne Modell erkannt", async () => {
  const log: string[] = [];
  await runOffline("Ich muss morgen um 5 aufstehen", stubActions(log));
  assert.match(log[0]!, /^zeiten:/);
  assert.match(log[0]!, /:05:00:$/);
});

test("eine Spaetschicht setzt die Schlafenszeit", async () => {
  const log: string[] = [];
  await runOffline("Heute Spätschicht, ich komme erst um 23 ins Bett", stubActions(log));
  assert.match(log[0]!, /^zeiten:/);
  assert.match(log[0]!, /:23:00$/);
});

test("ohne Uhrzeit wird nichts geraten", async () => {
  const log: string[] = [];
  await runOffline("Ich muss morgen früh aufstehen", stubActions(log));
  assert.ok(!log.some((z) => z.startsWith("zeiten:")), "morgen frueh ist keine Uhrzeit");
});

test("ohne Tagesbezug wird nichts eingetragen", async () => {
  const log: string[] = [];
  await runOffline("Ich stehe eigentlich immer um 7 auf", stubActions(log));
  assert.ok(!log.some((z) => z.startsWith("zeiten:")), "das ist der Standard, kein einzelner Tag");
});

test("eine unmoegliche Uhrzeit wird verworfen", async () => {
  const log: string[] = [];
  await runOffline("Ich stehe morgen um 99 auf", stubActions(log));
  assert.ok(!log.some((z) => z.startsWith("zeiten:")));
});

test("die Frage nach der Verbindung bekommt den Stand, nicht die Woche", async () => {
  // Genau das lief im Betrieb schief: "wieso ist mein Terminkalender nicht mit
  // dir verbunden" landete auf der Wochenübersicht, und der Nutzer bekam
  // sieben Zeilen Termine auf eine Ja-Nein-Frage.
  for (const frage of [
    "Hey kurze Frage wieso ist letztendlich mein Terminkalender nicht mit dir verbunden",
    "ist mein Kalender eigentlich aktuell",
    "warum stimmt das nicht mit meinen Terminen",
    "synchronisiert sich mein Google Kalender",
  ]) {
    const log: string[] = [];
    await runOffline(frage, stubActions(log));
    assert.ok(log.includes("kalender:stand"), `${frage} ergab ${log.join(",")}`);
  }
});

test("die Frage nach den Terminen bekommt weiter die Woche", async () => {
  const log: string[] = [];
  await runOffline("was steht diese Woche an", stubActions(log));
  assert.ok(log.includes("kalender:"), log.join(","));
});

/* ---------- Vorhaben sind keine Mahlzeit ---------- */

test("ein Tagesplan mit essen wird nicht als Mahlzeit erfasst", async () => {
  // Genau dieser Satz hat im Betrieb den ganzen Tagesplan als Mahlzeit
  // eingetragen. "esse" steckt in "essen".
  const log: string[] = [];
  await runOffline(
    "Ich hab genau 5 Stunden Zeit bis ich meinen ersten Kundentermin habe ich möchte heute "
    + "folgendes machen ich möchte meine Sachen für den Urlaub packen ich möchte trainieren "
    + "gehen ich möchte zwei gute Mahlzeiten essen",
    stubActions(log),
  );
  assert.equal(log.some((e) => e.startsWith("mahlzeit:")), false, log.join(","));
});

test("was wirklich gegessen wurde, wird weiter erfasst", async () => {
  for (const satz of [
    "ich hab 200 g Magerquark gegessen",
    "heute Mittag hatte ich Reis mit Hähnchen",
    "zum Frühstück Haferflocken",
  ]) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.ok(log.some((e) => e.startsWith("mahlzeit:")), `${satz} ergab ${log.join(",")}`);
  }
});

test("eine Absicht mit Vergangenheitsform zählt weiter als Eintrag", () => {
  // "Ich möchte wissen, was ich gegessen habe" meint die Vergangenheit,
  // obwohl möchte darin steht.
  assert.equal(istAbsicht("ich möchte wissen was ich heute gegessen habe"), false);
  assert.equal(istAbsicht("ich möchte heute zwei gute Mahlzeiten essen"), true);
  assert.equal(istAbsicht("ich hab 200 g Magerquark gegessen"), false);
});

test("Regelpfad nimmt einen Eintrag zurück, statt ihn nochmal einzutragen", async () => {
  // "Das hab ich nicht gegessen" enthält "gegessen" und landete vorher auf dem
  // Erfassen, also genau auf dem Gegenteil dessen, was gemeint war.
  for (const satz of [
    "Lösch den letzten Eintrag",
    "Das hab ich doch nicht gegessen",
    "Die letzte Mahlzeit stimmt nicht",
    "Nimm den Eintrag raus",
  ] as const) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.match(log[0] ?? "", /^zurueck:mahlzeit/, satz);
  }
});

test("die Rücknahme trifft die genannte Art", async () => {
  const log: string[] = [];
  await runOffline("Lösch das Training von heute", stubActions(log));
  assert.match(log[0]!, /^zurueck:training/);
});

test("ein Widerspruch ohne Gegenstand löscht nichts", async () => {
  // "Das stimmt nicht" über eine Aussage des Coaches darf keinen Eintrag entfernen.
  const log: string[] = [];
  await runOffline("Das stimmt nicht", stubActions(log));
  assert.equal(log.some((z) => z.startsWith("zurueck:")), false);
});

test("Regelpfad trägt ein Training mit Art und Dauer ein", async () => {
  for (const [satz, erwartet] of [
    ["Ich war 2 Stunden Volleyball spielen", "training:team_sport/120"],
    ["Hab heute 90 Minuten trainiert", "training:strength/90"],
    ["War eine Stunde laufen", "training:cardio/60"],
    ["Ich hab 20 Minuten gedehnt", "training:mobility/20"],
  ] as const) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.equal(log[0], erwartet, satz);
  }
});

test("ohne erkannte Dauer wird kein Training geraten", async () => {
  // Die Dauer geht ins Balance Board und in den Wasserbedarf. Eine erfundene
  // Stunde verschiebt beides, also greift der Zweig gar nicht erst.
  const log: string[] = [];
  await runOffline("Ich war heute trainieren", stubActions(log));
  assert.equal(log.some((z) => z.startsWith("training:")), false);
});

test("Kundenstunden sind kein eigenes Training", async () => {
  // Dieselbe Trennung wie im Balance Board: wer seine Kundenstunden als eigene
  // Einheiten gezählt bekommt, hat eine Statistik, die ihn anlügt.
  for (const satz of [
    "Ich hab 2 Stunden Athletiktraining gegeben",
    "War 3 Stunden mit einer Kundin trainieren",
  ] as const) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.equal(log.some((z) => z.startsWith("training:")), false, satz);
  }
});

test("ein Trainingsvorhaben ist keine Einheit", async () => {
  const log: string[] = [];
  await runOffline("Ich will morgen 2 Stunden trainieren", stubActions(log));
  assert.equal(log.some((z) => z.startsWith("training:")), false);
});

test("Regelpfad bucht erzählte Zeit auf einen Bereich", async () => {
  for (const [satz, erwartet] of [
    ["Ich hab 2 Stunden mit meiner Schwester verbracht", "zeit:beziehung:120"],
    ["Hab heute 3 Stunden an Content gearbeitet", "zeit:karriere:180"],
    ["War 45 Minuten spazieren und hab entspannt", "zeit:wellbeing:45"],
  ] as const) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.equal(log[0], erwartet, satz);
  }
});

test("Zeit ohne erkennbaren Bereich wird nicht gebucht", async () => {
  // Eine falsche Zuordnung erzeugt eine Zahl, der man glaubt.
  const log: string[] = [];
  await runOffline("Ich hab 2 Stunden damit verbracht", stubActions(log));
  assert.equal(log.some((z) => z.startsWith("zeit:")), false);
});

test("Regelpfad hakt eine Aufgabe ab, statt sie nochmal anzulegen", async () => {
  const log: string[] = [];
  await runOffline("Angebot für YAN ist erledigt", stubActions(log));
  assert.match(log[0]!, /^abhaken:/);
  assert.equal(log.some((z) => z.startsWith("aufgabe:")), false);
});

test("Regelpfad zeigt die Einkaufsliste, statt eine neue zu bauen", async () => {
  const log: string[] = [];
  await runOffline("Was steht auf der Einkaufsliste?", stubActions(log));
  assert.equal(log[0], "einkauf:abrufen");

  const log2: string[] = [];
  await runOffline("Erstell mir eine Einkaufsliste für 5 Tage", stubActions(log2));
  assert.match(log2[0]!, /^einkauf:5/);
});

test("Regelpfad durchsucht das Gedächtnis auf Zuruf", async () => {
  const log: string[] = [];
  await runOffline("Was weisst du eigentlich über mich?", stubActions(log));
  assert.match(log[0]!, /^suche:/);
});

test("Regelpfad nimmt den Mittags Check-in als drei Zahlen an", async () => {
  for (const [satz, erwartet] of [
    ["7 6 8", "mittag:7/6/8"],
    ["Energie 7, Konzentration 6, Sättigung 8", "mittag:7/6/8"],
    ["Energie 7, Sättigung 4, Konzentration 9", "mittag:7/9/4"],
  ] as const) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.equal(log[0], erwartet, satz);
  }
});

test("drei Zahlen in einem Satz sind kein Check-in", async () => {
  // Ein geratener Wert steht im Verlauf später wie eine echte Antwort.
  for (const satz of [
    "Ich hatte 200 g Reis, 3 Eier und 1 Banane",
    "Ich hab 7 von 10 Stunden geschlafen und 2 Kaffee getrunken",
  ] as const) {
    const log: string[] = [];
    await runOffline(satz, stubActions(log));
    assert.equal(log.some((z) => z.startsWith("mittag:")), false, satz);
  }
});

test("zwei Zahlen reichen für den Check-in nicht", async () => {
  const log: string[] = [];
  await runOffline("7 6", stubActions(log));
  assert.equal(log.some((z) => z.startsWith("mittag:")), false);
});

test("Regelpfad korrigiert eine Menge, statt den Eintrag zu löschen", async () => {
  // Der echte Fall: statt eines Rippchens stand eine ganze Tafel Milka im Tag.
  // Wer ein Rippchen gegessen hat, hat nicht nichts gegessen.
  const log: string[] = [];
  await runOffline("Das war nur ein Rippchen Milka, nicht die ganze Packung, korrigier das auf 16 g", stubActions(log));
  assert.match(log[0]!, /^korrigieren:/);
  assert.match(log[0]!, /16$/);
  assert.equal(log.some((z) => z.startsWith("zurueck:")), false);
});

test("eine Korrektur ohne Bezug auf einen Eintrag ist eine neue Mahlzeit", async () => {
  // Eine falsch erkannte Korrektur ändert eine Zahl, die vorher stimmte.
  const log: string[] = [];
  await runOffline("Ich hatte nur ein Brötchen mit 60 g", stubActions(log));
  assert.equal(log.some((z) => z.startsWith("korrigieren:")), false);
});

test("eine Korrektur ohne Menge greift nicht", async () => {
  const log: string[] = [];
  await runOffline("Das war nur ein Rippchen, nicht die ganze Packung", stubActions(log));
  assert.equal(log.some((z) => z.startsWith("korrigieren:")), false);
});
