import test from "node:test";
import assert from "node:assert/strict";
import { chatWeiterreichen, KONTO_STUNDENGRENZE } from "./chat.js";
import {
  geltendeStufe,
  kontingentPruefen,
  kontoAnlegen,
  kontoAusAnfrage,
  kostenMikro,
  STUFEN,
  stufeSetzen,
  verbrauchAusAntwort,
  verbrauchBuchen,
  verbrauchLesen,
} from "./konto.js";
import worker from "./index.js";
import type { Env, KVNamespace } from "./umgebung.js";

function kvAttrappe(): KVNamespace & { inhalt: Map<string, string> } {
  const inhalt = new Map<string, string>();
  return {
    inhalt,
    async get(k) { return inhalt.has(k) ? inhalt.get(k)! : null; },
    async put(k, v) { inhalt.set(k, v); },
    async delete(k) { inhalt.delete(k); },
    async list() { return { keys: [...inhalt.keys()].map((name) => ({ name })) }; },
  };
}

function umgebung(extra: Partial<Env> = {}): Env & { ABOS: ReturnType<typeof kvAttrappe> } {
  return {
    ABOS: kvAttrappe(), VAPID_PUBLIC: "p", VAPID_PRIVATE: "q",
    PUSH_KONTAKT: "mailto:a@b.de", HERKUNFT: "https://example.org",
    ANTHROPIC_KEY: "sk-test", ANMELDE_WORT: "geheim", ...extra,
  } as Env & { ABOS: ReturnType<typeof kvAttrappe> };
}

function chatAnfrage(token?: string, ip = "1.2.3.4"): Request {
  const kopf: Record<string, string> = { "content-type": "application/json", "CF-Connecting-IP": ip };
  if (token) kopf.authorization = `Bearer ${token}`;
  return new Request("https://w.dev/chat", {
    method: "POST",
    headers: kopf,
    body: JSON.stringify({ model: "claude-haiku-4-5", messages: [] }),
  });
}

const STROM = [
  'event: message_start',
  'data: {"type":"message_start","message":{"model":"claude-haiku-4-5","usage":{"input_tokens":1000,"cache_read_input_tokens":4000,"output_tokens":1}}}',
  '',
  'event: content_block_delta',
  'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hallo"}}',
  '',
  'event: message_delta',
  'data: {"type":"message_delta","usage":{"output_tokens":200}}',
  '',
].join("\n");

test("auf dem Server liegt nur der Hash des Schlüssels", async () => {
  const kv = kvAttrappe();
  const { token, konto } = await kontoAnlegen(kv);
  assert.equal(token.length, 40);
  assert.equal(konto.stufe, "test");
  for (const [k, v] of kv.inhalt) {
    assert.equal(k.includes(token), false);
    assert.equal(v.includes(token), false);
  }
});

test("ein Konto wird über den Bearer Kopf gefunden, ein falscher Schlüssel nicht", async () => {
  const kv = kvAttrappe();
  const { token, konto } = await kontoAnlegen(kv);
  const mit = (t: string) => new Request("https://w.dev/x", { headers: { authorization: `Bearer ${t}` } });
  assert.equal((await kontoAusAnfrage(kv, mit(token)))?.konto.id, konto.id);
  // Das letzte Zeichen wird sicher ein anderes. Mit festem "x" war der Test
  // einmal in 62 Läufen rot, wenn der Schlüssel schon auf "x" endete.
  const anders = token.slice(0, -1) + (token.endsWith("x") ? "y" : "x");
  assert.equal(await kontoAusAnfrage(kv, mit(anders)), null);
  assert.equal(await kontoAusAnfrage(kv, new Request("https://w.dev/x")), null);
});

test("eine abgelaufene Stufe fällt auf kostenlos zurück", () => {
  const konto = { id: "a", stufe: "plus", bis: "2026-10-31", angelegt: "2026-10-01" };
  assert.equal(geltendeStufe(konto, "2026-10-31"), "plus");
  assert.equal(geltendeStufe(konto, "2026-11-01"), "frei");
  assert.equal(geltendeStufe({ ...konto, stufe: "gibtsnicht" }, "2026-10-01"), "frei");
});

test("das Kontingent greift an Nachrichten und an Kosten", () => {
  const test = STUFEN.test!;
  assert.equal(kontingentPruefen("test", { nachrichten: test.nachrichten - 1, mikro: 0 }), null);
  assert.match(kontingentPruefen("test", { nachrichten: test.nachrichten, mikro: 0 })!, /Nachrichten/);
  // Wenige teure Nachrichten mit Fotos auf Opus erreichen das Budget vor der Zahl.
  assert.match(kontingentPruefen("test", { nachrichten: 3, mikro: test.budgetMikro })!, /Monatsbudget/);
  // Ohne Abo gibt es nach der Testphase gar keine KI, auch nicht die erste Nachricht.
  assert.match(kontingentPruefen("frei", { nachrichten: 0, mikro: 0 })!, /Testphase ist vorbei/);
});

test("der Verbrauch wird aus dem Strom gelesen, Ausgabe aus dem letzten Ereignis", () => {
  const v = verbrauchAusAntwort(STROM, "claude-haiku-4-5")!;
  assert.equal(v.inputTokens, 1000);
  assert.equal(v.cacheReadTokens, 4000);
  assert.equal(v.outputTokens, 200);
  assert.ok(kostenMikro(v) > 0);
});

test("der Verbrauch wird auch aus einer Antwort am Stück gelesen", () => {
  const v = verbrauchAusAntwort(JSON.stringify({ usage: { input_tokens: 10, output_tokens: 5 } }), "claude-haiku-4-5")!;
  assert.equal(v.inputTokens, 10);
  assert.equal(v.outputTokens, 5);
  assert.equal(verbrauchAusAntwort("kein json", "x"), null);
});

test("Buchungen summieren sich je Monat", async () => {
  const kv = kvAttrappe();
  await verbrauchBuchen(kv, "a", { nachrichten: 1, mikro: 100 }, "2026-10");
  await verbrauchBuchen(kv, "a", { nachrichten: 1, mikro: 50 }, "2026-10");
  assert.deepEqual(await verbrauchLesen(kv, "a", "2026-10"), { nachrichten: 2, mikro: 150 });
  assert.deepEqual(await verbrauchLesen(kv, "a", "2026-11"), { nachrichten: 0, mikro: 0 });
});

test("eine Nachricht mit Konto wird nach dem Ende des Stroms gebucht", async () => {
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  const offen: Promise<unknown>[] = [];
  const antwort = await chatWeiterreichen(
    chatAnfrage(token),
    env,
    async () => new Response(STROM, { headers: { "content-type": "text/event-stream" } }),
    (p) => offen.push(p),
  );
  // Die App bekommt den Strom unverändert.
  assert.equal(await antwort.text(), STROM);
  await Promise.all(offen);
  const v = await verbrauchLesen(env.ABOS, konto.id);
  assert.equal(v.nachrichten, 1);
  assert.ok(v.mikro > 0);
});

test("eine gescheiterte Anfrage kostet keine Nachricht", async () => {
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  const offen: Promise<unknown>[] = [];
  const antwort = await chatWeiterreichen(chatAnfrage(token), env, async () => new Response("{}", { status: 529 }), (p) => offen.push(p));
  assert.equal(antwort.status, 529);
  await Promise.all(offen);
  assert.equal((await verbrauchLesen(env.ABOS, konto.id)).nachrichten, 0);
});

test("ein aufgebrauchtes Kontingent antwortet mit 402 und fragt Anthropic gar nicht", async () => {
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  await verbrauchBuchen(env.ABOS, konto.id, { nachrichten: STUFEN.test!.nachrichten });
  let gefragt = false;
  const antwort = await chatWeiterreichen(chatAnfrage(token), env, async () => {
    gefragt = true;
    return new Response("{}");
  });
  assert.equal(antwort.status, 402);
  assert.equal(gefragt, false);
  const koerper = (await antwort.json()) as { error: { type: string } };
  assert.equal(koerper.error.type, "kontingent");
});

test("ein Konto hat eine eigene Stundengrenze statt der Grenze je Gerät", async () => {
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  // Plus, weil das kostenlose Monatskontingent unter der Stundengrenze liegt.
  await stufeSetzen(env.ABOS, konto.id, "plus");
  const holen = async () => new Response("{}");
  for (let i = 0; i < KONTO_STUNDENGRENZE; i++) {
    assert.equal((await chatWeiterreichen(chatAnfrage(token), env, holen, () => {})).status, 200);
  }
  assert.equal((await chatWeiterreichen(chatAnfrage(token), env, holen, () => {})).status, 429);
});

test("ein bezahltes Konto zählt nicht gegen die Tagesgrenze der Demo", async () => {
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  await stufeSetzen(env.ABOS, konto.id, "plus");
  await chatWeiterreichen(chatAnfrage(token), env, async () => new Response("{}"), () => {});
  const tageszaehler = [...env.ABOS.inhalt.keys()].filter((k) => k.startsWith("chat.tag."));
  assert.equal(tageszaehler.length, 0);
});

test("die Stufe setzt nur, wer das Anmeldewort kennt", async () => {
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  const setzen = (wort?: string) =>
    worker.fetch(
      new Request("https://w.dev/konto/stufe", {
        method: "POST",
        headers: { "content-type": "application/json", ...(wort ? { "x-daevo-wort": wort } : {}) },
        body: JSON.stringify({ konto: konto.id, stufe: "pro", bis: "2099-01-01" }),
      }),
      env,
    );
  assert.equal((await setzen()).status, 401);
  assert.equal((await setzen("falsch")).status, 401);
  assert.equal((await setzen("geheim")).status, 200);

  const stand = await worker.fetch(new Request("https://w.dev/konto", { headers: { authorization: `Bearer ${token}` } }), env);
  const daten = (await stand.json()) as { stufe: string; grenze: { nachrichten: number } };
  assert.equal(daten.stufe, "pro");
  assert.equal(daten.grenze.nachrichten, STUFEN.pro!.nachrichten);
});

test("neue Konten sind je Adresse und Tag begrenzt", async () => {
  const env = umgebung();
  const neu = () => worker.fetch(new Request("https://w.dev/konto", { method: "POST", headers: { "CF-Connecting-IP": "9.9.9.9" } }), env);
  for (let i = 0; i < 5; i++) assert.equal((await neu()).status, 200);
  assert.equal((await neu()).status, 429);
});

test("ein unbekanntes Konto meldet 404, damit die App neu anlegt", async () => {
  const env = umgebung();
  const stand = await worker.fetch(new Request("https://w.dev/konto", { headers: { authorization: `Bearer ${"x".repeat(40)}` } }), env);
  assert.equal(stand.status, 404);
});

test("ein neues Konto hat sieben Tage Testphase, danach keine KI mehr", async () => {
  const kv = kvAttrappe();
  const { konto } = await kontoAnlegen(kv, new Date("2026-10-18T09:00:00Z"));
  assert.equal(konto.bis, "2026-10-24");
  assert.equal(geltendeStufe(konto, "2026-10-24"), "test");
  assert.equal(geltendeStufe(konto, "2026-10-25"), "frei");
});

test("ohne Konto gibt es keine KI, ausser der Betreiber schaltet es frei", async () => {
  const ohne = new Request("https://w.dev/chat", { method: "POST", body: "{}" });
  const zu = await chatWeiterreichen(ohne, umgebung({ OHNE_KONTO: undefined }), async () => new Response("{}"));
  assert.equal(zu.status, 401);
  assert.equal(((await zu.json()) as { error: { type: string } }).error.type, "konto");
  const offen = await chatWeiterreichen(new Request("https://w.dev/chat", { method: "POST", body: "{}" }), umgebung({ OHNE_KONTO: "an" }), async () => new Response("{}"));
  assert.equal(offen.status, 200);
});

test("Folgeanfragen derselben Nachricht kosten Budget, aber keine Nachricht", async () => {
  // Eine Mahlzeit mit Werkzeug sind drei Anfragen. Gezählt wurden vorher alle
  // drei, und aus 800 versprochenen Nachrichten wurden rund 270.
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  const offen: Promise<unknown>[] = [];
  const strom = async () => new Response(STROM, { headers: { "content-type": "text/event-stream" } });
  for (const folge of [false, true, true]) {
    const a = chatAnfrage(token);
    if (folge) a.headers.set("x-daevo-folge", "1");
    const antwort = await chatWeiterreichen(a, env, strom, (p) => offen.push(p));
    await antwort.text();
  }
  await Promise.all(offen);
  const v = await verbrauchLesen(env.ABOS, konto.id);
  assert.equal(v.nachrichten, 1);
  assert.ok(v.mikro > 0);
});

test("die letzte erlaubte Nachricht bricht nicht im Werkzeug ab", async () => {
  const env = umgebung();
  const { token, konto } = await kontoAnlegen(env.ABOS);
  await verbrauchBuchen(env.ABOS, konto.id, { nachrichten: 150, mikro: 1000 });
  const neu = await chatWeiterreichen(chatAnfrage(token), env, async () => new Response("{}"), () => {});
  assert.equal(neu.status, 402);
  const folge = chatAnfrage(token);
  folge.headers.set("x-daevo-folge", "1");
  const weiter = await chatWeiterreichen(folge, env, async () => new Response("{}"), () => {});
  assert.equal(weiter.status, 200);
});
