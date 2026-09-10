import { strict as assert } from "node:assert";
import { test } from "node:test";
import { vapidSchluesselErzeugen } from "@daevo/push";
import worker, { versendeFaellige } from "./index.js";
import { MAX_ABOS, aboId, aboSpeichern, alleAbos, endpunktErlaubt, sperren } from "./abos.js";
import type { Env, KVNamespace } from "./umgebung.js";

/** Ein Schlüsselspeicher im Arbeitsspeicher, mit demselben Verhalten. */
function kvAttrappe(): KVNamespace & { inhalt: Map<string, string> } {
  const inhalt = new Map<string, string>();
  return {
    inhalt,
    async get(k) {
      return inhalt.get(k) ?? null;
    },
    async put(k, v) {
      inhalt.set(k, v);
    },
    async delete(k) {
      inhalt.delete(k);
    },
    async list({ prefix = "", limit = 1000 } = {}) {
      return { keys: [...inhalt.keys()].filter((k) => k.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) };
    },
  };
}

const ABO = {
  endpoint: "https://web.push.apple.com/AB12/xyz",
  keys: {
    p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
    auth: "BTBZMqHH6r4Tts7J_aSIgg",
  },
};

async function umgebung(extra: Partial<Env> = {}): Promise<{ env: Env; kv: ReturnType<typeof kvAttrappe> }> {
  const kv = kvAttrappe();
  const s = await vapidSchluesselErzeugen();
  return {
    kv,
    env: {
      ABOS: kv,
      VAPID_PUBLIC: s.oeffentlich,
      VAPID_PRIVATE: s.privat,
      PUSH_KONTAKT: "mailto:a@b.de",
      HERKUNFT: "https://hannigaaron.github.io",
      ...extra,
    },
  };
}

const anfrage = (pfad: string, init: RequestInit = {}) =>
  new Request(`https://daevo-push.workers.dev${pfad}`, {
    headers: { Origin: "https://hannigaaron.github.io", "content-type": "application/json" },
    ...init,
  });

/* ---------- Endpunkte ---------- */

test("Nur Endpunkte bekannter Push Dienste werden angenommen", () => {
  assert.ok(endpunktErlaubt("https://web.push.apple.com/AB12"));
  assert.ok(endpunktErlaubt("https://updates.push.services.mozilla.com/wpush/v2/abc"));
  assert.ok(endpunktErlaubt("https://fcm.googleapis.com/fcm/send/abc"));
  assert.ok(endpunktErlaubt("https://wns2-par02p.notify.windows.com/w/?token=x"));
});

test("Fremde Adressen werden abgewiesen, damit der Worker keine offene Weiterleitung wird", () => {
  assert.equal(endpunktErlaubt("https://angreifer.example/pfad"), false);
  assert.equal(endpunktErlaubt("http://web.push.apple.com/AB12"), false, "kein https");
  assert.equal(endpunktErlaubt("https://web.push.apple.com.angreifer.example/x"), false, "angehängte Domain");
  assert.equal(endpunktErlaubt("kein URL"), false);
});

test("Dieselbe Adresse ergibt dieselbe Kennung, eine andere nicht", async () => {
  assert.equal(await aboId("https://a/b"), await aboId("https://a/b"));
  assert.notEqual(await aboId("https://a/b"), await aboId("https://a/c"));
  assert.equal((await aboId("https://a/b")).length, 24);
});

/* ---------- Speicher ---------- */

test("Ein zweites Anmelden desselben Geräts legt keinen zweiten Eintrag an", async () => {
  const kv = kvAttrappe();
  const erst = await aboSpeichern(kv, ABO);
  const zweit = await aboSpeichern(kv, ABO);
  assert.equal(erst.neu, true);
  assert.equal(zweit.neu, false);
  assert.equal((await alleAbos(kv)).length, 1);
});

test("Über der Obergrenze wird kein neues Gerät mehr angenommen", async () => {
  const kv = kvAttrappe();
  for (let i = 0; i < MAX_ABOS; i++) {
    await aboSpeichern(kv, { ...ABO, endpoint: `https://web.push.apple.com/g${i}` });
  }
  await assert.rejects(
    () => aboSpeichern(kv, { ...ABO, endpoint: "https://web.push.apple.com/zuviel" }),
    /Mehr als 50/,
  );
  // Ein bereits bekanntes Gerät darf sich trotzdem weiter erneuern.
  await aboSpeichern(kv, { ...ABO, endpoint: "https://web.push.apple.com/g0" });
});

test("Ein kaputter Eintrag hält den Versand an alle anderen nicht auf", async () => {
  const kv = kvAttrappe();
  await aboSpeichern(kv, ABO);
  await kv.put("abo:kaputt", "{kein json");
  await kv.put("abo:leer", JSON.stringify({ endpoint: "https://x/y" }));
  assert.equal((await alleAbos(kv)).length, 1);
});

test("Die Sperre lässt einen Impuls je Tag durch", async () => {
  const kv = kvAttrappe();
  assert.equal(await sperren(kv, "2026-09-10", "energie"), true);
  assert.equal(await sperren(kv, "2026-09-10", "energie"), false);
  assert.equal(await sperren(kv, "2026-09-10", "stress"), true, "andere Art");
  assert.equal(await sperren(kv, "2026-09-11", "energie"), true, "anderer Tag");
});

/* ---------- Wege ---------- */

test("Der öffentliche Schlüssel lässt sich abholen", async () => {
  const { env } = await umgebung();
  const antwort = await worker.fetch(anfrage("/schluessel"), env);
  assert.equal(antwort.status, 200);
  assert.equal((await antwort.json()).oeffentlich, env.VAPID_PUBLIC);
  assert.equal(antwort.headers.get("Access-Control-Allow-Origin"), "https://hannigaaron.github.io");
});

test("Eine fremde Herkunft bekommt die eigene Adresse nicht bestätigt", async () => {
  const { env } = await umgebung();
  const antwort = await worker.fetch(
    new Request("https://daevo-push.workers.dev/schluessel", { headers: { Origin: "https://angreifer.example" } }),
    env,
  );
  assert.notEqual(antwort.headers.get("Access-Control-Allow-Origin"), "https://angreifer.example");
});

test("Ein Gerät meldet sich an und wieder ab", async () => {
  const { env, kv } = await umgebung();
  const an = await worker.fetch(anfrage("/abo", { method: "POST", body: JSON.stringify(ABO) }), env);
  assert.equal(an.status, 200);
  assert.equal((await an.json()).neu, true);
  assert.equal((await alleAbos(kv)).length, 1);

  const ab = await worker.fetch(
    anfrage("/abo", { method: "DELETE", body: JSON.stringify({ endpoint: ABO.endpoint }) }),
    env,
  );
  assert.equal(ab.status, 200);
  assert.equal((await alleAbos(kv)).length, 0);
});

test("Ein unvollständiges Abo wird abgewiesen", async () => {
  const { env } = await umgebung();
  const antwort = await worker.fetch(
    anfrage("/abo", { method: "POST", body: JSON.stringify({ endpoint: ABO.endpoint }) }),
    env,
  );
  assert.equal(antwort.status, 400);
  assert.match((await antwort.json()).fehler, /nicht vollständig|kein vollständiges/);
});

test("Ein fremder Endpunkt wird abgewiesen", async () => {
  const { env } = await umgebung();
  const antwort = await worker.fetch(
    anfrage("/abo", { method: "POST", body: JSON.stringify({ ...ABO, endpoint: "https://angreifer.example/x" }) }),
    env,
  );
  assert.equal(antwort.status, 400);
  assert.match((await antwort.json()).fehler, /Push Dienst/);
});

test("Mit gesetztem Anmeldewort geht ohne das Wort nichts", async () => {
  const { env } = await umgebung({ ANMELDE_WORT: "geheim" });
  const ohne = await worker.fetch(anfrage("/abo", { method: "POST", body: JSON.stringify(ABO) }), env);
  assert.equal(ohne.status, 401);

  const mit = await worker.fetch(
    new Request("https://daevo-push.workers.dev/abo", {
      method: "POST",
      headers: { Origin: "https://hannigaaron.github.io", "x-daevo-wort": "geheim" },
      body: JSON.stringify(ABO),
    }),
    env,
  );
  assert.equal(mit.status, 200);
});

test("Ohne Anmeldewort in der Umgebung ist die Probe gesperrt", async () => {
  const { env } = await umgebung();
  const antwort = await worker.fetch(anfrage("/probe", { method: "POST", body: "{}" }), env);
  assert.equal(antwort.status, 401);
});

test("Der Stand nennt Geräte, Berliner Zeit und den Plan des Tages", async () => {
  const { env, kv } = await umgebung();
  await aboSpeichern(kv, ABO);
  const daten = await (await worker.fetch(anfrage("/stand"), env)).json();
  assert.equal(daten.geraete, 1);
  assert.match(daten.tag, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(daten.zeit, /^\d{2}:\d{2}$/);
  assert.ok([1, 2].includes(daten.versatz));
  assert.equal(daten.impulse.length, 6);
});

test("Ein unbekannter Weg gibt 404 und keine Ausnahme", async () => {
  const { env } = await umgebung();
  assert.equal((await worker.fetch(anfrage("/gibtesnicht"), env)).status, 404);
});

test("Die Vorabfrage des Browsers wird beantwortet", async () => {
  const { env } = await umgebung();
  const antwort = await worker.fetch(anfrage("/abo", { method: "OPTIONS" }), env);
  assert.equal(antwort.status, 204);
  assert.match(antwort.headers.get("Access-Control-Allow-Headers") ?? "", /x-daevo-wort/);
});

test("Der Worker kommt ohne Node APIs aus", async () => {
  // Die Typen aus @types/node sind für die Tests in dieser Datei eingebunden.
  // Damit im Worker selbst nicht versehentlich node:crypto oder Buffer landet,
  // wird der Quelltext hier gelesen und geprüft. Cloudflare kennt beides nicht,
  // und der Fehler fiele sonst erst beim Ausrollen auf.
  const { readFile, readdir } = await import("node:fs/promises");
  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const quelle = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

  for (const datei of await readdir(quelle)) {
    if (!datei.endsWith(".ts") || datei.endsWith(".test.ts")) continue;
    const text = await readFile(join(quelle, datei), "utf8");
    assert.equal(/from "node:/.test(text), false, `${datei} bindet ein Node Modul ein`);
    assert.equal(/\bBuffer\b/.test(text), false, `${datei} benutzt Buffer`);
    assert.equal(/\bprocess\.env\b/.test(text), false, `${datei} liest process.env statt env`);
  }
});

/* ---------- Der Lauf zur vollen Stunde ---------- */

/** Ersetzt fetch und merkt sich, was an die Push Dienste ginge. */
function fetchAttrappe(status = 201) {
  const gesehen: Array<{ url: string; koerper: number }> = [];
  const echt = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const adresse = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    gesehen.push({ url: adresse, koerper: (init?.body as Uint8Array)?.byteLength ?? 0 });
    return new Response(status === 201 ? null : "weg", { status });
  }) as typeof fetch;
  return { gesehen, zurueck: () => { globalThis.fetch = echt; } };
}

// 14:00 Berlin im Sommer ist 12:00 UTC.
const UM_14_UHR = new Date("2026-09-10T12:00:00Z");

test("Zur Minute eines Impulses geht er an alle Geräte raus", async () => {
  const { env, kv } = await umgebung();
  await aboSpeichern(kv, ABO);
  await aboSpeichern(kv, { ...ABO, endpoint: "https://web.push.apple.com/zweites" });
  const netz = fetchAttrappe();
  try {
    await versendeFaellige(env, UM_14_UHR);
  } finally {
    netz.zurueck();
  }
  assert.equal(netz.gesehen.length, 2);
  assert.ok(netz.gesehen.every((g) => g.url.startsWith("https://web.push.apple.com/")));
  assert.ok(netz.gesehen.every((g) => g.koerper > 86), "der Körper trägt Salz, Kopf, Schlüssel und Inhalt");
});

test("Eine Minute daneben geht nichts raus", async () => {
  const { env, kv } = await umgebung();
  await aboSpeichern(kv, ABO);
  const netz = fetchAttrappe();
  try {
    await versendeFaellige(env, new Date("2026-09-10T12:15:00Z"));
    await versendeFaellige(env, new Date("2026-09-10T11:00:00Z"));
  } finally {
    netz.zurueck();
  }
  assert.equal(netz.gesehen.length, 0);
});

test("Ein zweiter Lauf in derselben Minute schickt nicht noch einmal", async () => {
  const { env, kv } = await umgebung();
  await aboSpeichern(kv, ABO);
  const netz = fetchAttrappe();
  try {
    await versendeFaellige(env, UM_14_UHR);
    await versendeFaellige(env, UM_14_UHR);
  } finally {
    netz.zurueck();
  }
  assert.equal(netz.gesehen.length, 1);
});

test("Im Winter trifft dieselbe Ortszeit eine andere UTC Stunde", async () => {
  const { env, kv } = await umgebung();
  await aboSpeichern(kv, ABO);
  const netz = fetchAttrappe();
  try {
    // 14:00 Berlin im Winter ist 13:00 UTC. Ein fest verdrahteter UTC Wert
    // ginge hier ein halbes Jahr lang eine Stunde falsch.
    await versendeFaellige(env, new Date("2026-12-10T12:00:00Z"));
    assert.equal(netz.gesehen.length, 0);
    await versendeFaellige(env, new Date("2026-12-10T13:00:00Z"));
  } finally {
    netz.zurueck();
  }
  assert.equal(netz.gesehen.length, 1);
});

test("Ein abgelaufenes Abo wird nach 410 gelöscht", async () => {
  const { env, kv } = await umgebung();
  await aboSpeichern(kv, ABO);
  const netz = fetchAttrappe(410);
  try {
    await versendeFaellige(env, UM_14_UHR);
  } finally {
    netz.zurueck();
  }
  assert.equal((await alleAbos(kv)).length, 0);
});

test("Ein Fehler beim Push Dienst löscht das Abo nicht", async () => {
  const { env, kv } = await umgebung();
  await aboSpeichern(kv, ABO);
  const netz = fetchAttrappe(500);
  const echt = console.error;
  console.error = () => {};
  try {
    await versendeFaellige(env, UM_14_UHR);
  } finally {
    netz.zurueck();
    console.error = echt;
  }
  assert.equal((await alleAbos(kv)).length, 1);
});
