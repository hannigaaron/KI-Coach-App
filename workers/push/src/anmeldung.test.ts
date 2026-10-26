import test from "node:test";
import assert from "node:assert/strict";
import { anmeldungVerknuepfen, idTokenPruefen, pruefungFuer } from "./anmeldung.js";
import { hash, kontoAnlegen, kontoAusAnfrage, kontoLoeschen, type Konto } from "./konto.js";
import type { KVNamespace } from "./umgebung.js";

function kv(): KVNamespace & { inhalt: Map<string, string> } {
  const inhalt = new Map<string, string>();
  return {
    inhalt,
    async get(k) { return inhalt.has(k) ? inhalt.get(k)! : null; },
    async put(k, v) { inhalt.set(k, v); },
    async delete(k) { inhalt.delete(k); },
    async list() { return { keys: [...inhalt.keys()].map((name) => ({ name })) }; },
  };
}

const b64 = (b: Uint8Array | string) =>
  Buffer.from(typeof b === "string" ? new TextEncoder().encode(b) : b).toString("base64url");

async function schluessel() {
  const paar = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["sign", "verify"],
  ) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", paar.publicKey) as { n: string; e: string; kty: string };
  const holen = (async () => new Response(JSON.stringify({ keys: [{ kid: "k1", kty: jwk.kty, n: jwk.n, e: jwk.e }] }))) as unknown as typeof fetch;
  const signieren = async (inhalt: Record<string, unknown>, kid = "k1") => {
    const kopf = b64(JSON.stringify({ alg: "RS256", kid }));
    const rumpf = b64(JSON.stringify(inhalt));
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", paar.privateKey, new TextEncoder().encode(`${kopf}.${rumpf}`));
    return `${kopf}.${rumpf}.${b64(new Uint8Array(sig))}`;
  };
  return { holen, signieren };
}

test("ID Token: Signatur, Aussteller, Empfänger und Ablauf werden geprüft", async () => {
  const { holen, signieren } = await schluessel();
  const p = pruefungFuer("apple", {})!;
  const jetzt = Date.now();
  const gut = { iss: "https://appleid.apple.com", aud: "de.daevo.app", sub: "001.abc", exp: Math.floor(jetzt / 1000) + 600 };
  assert.deepEqual(await idTokenPruefen(await signieren(gut), p, { holen, jetzt }), { sub: "001.abc" });
  assert.match((await idTokenPruefen(await signieren({ ...gut, aud: "fremd" }), p, { holen, jetzt }) as { fehler: string }).fehler, /nicht für daevo/);
  assert.match((await idTokenPruefen(await signieren({ ...gut, iss: "https://evil" }), p, { holen, jetzt }) as { fehler: string }).fehler, /Aussteller/);
  assert.match((await idTokenPruefen(await signieren({ ...gut, exp: 1 }), p, { holen, jetzt }) as { fehler: string }).fehler, /abgelaufen/);
  assert.match((await idTokenPruefen(await signieren(gut, "k9"), p, { holen, jetzt }) as { fehler: string }).fehler, /unbekannt/);
  // Ein verändertes Token fällt an der Signatur durch.
  const t = (await signieren(gut)).split(".");
  const gefaelscht = `${t[0]}.${b64(JSON.stringify({ ...gut, sub: "jemand-anderes" }))}.${t[2]}`;
  assert.match((await idTokenPruefen(gefaelscht, p, { holen, jetzt }) as { fehler: string }).fehler, /Signatur/);
  assert.equal(pruefungFuer("google", {}), null);
});

const anfrageMit = (token: string) => new Request("https://w.dev/x", { headers: { authorization: `Bearer ${token}` } });

test("Verknüpfen: Gerätekonto wird verknüpft, neues Gerät übernimmt, Testphase nur einmal", async () => {
  const k = kv();
  // Gerät A hat ein Konto ohne Anmeldung und meldet sich an.
  const a = await kontoAnlegen(k);
  const aktuellA = await kontoAusAnfrage(k, anfrageMit(a.token));
  const r1 = await anmeldungVerknuepfen(k, "apple", "sub-1", aktuellA);
  assert.equal(r1.token, undefined);
  assert.equal(r1.konto.id, a.konto.id);
  assert.equal(r1.konto.login, "apple");

  // Gerät B, frisch installiert, mit eigenem Testkonto: bekommt das alte zurück.
  const b = await kontoAnlegen(k);
  const r2 = await anmeldungVerknuepfen(k, "apple", "sub-1", await kontoAusAnfrage(k, anfrageMit(b.token)));
  assert.equal(r2.uebernommen, true);
  assert.equal(r2.konto.id, a.konto.id);
  assert.ok(r2.token);
  // Das Testkonto von B ist weg, A gilt nicht mehr, B mit dem neuen Schlüssel schon.
  assert.equal(await k.get(`kontoid.${b.konto.id}`), null);
  assert.equal(await kontoAusAnfrage(k, anfrageMit(a.token)), null);
  assert.equal((await kontoAusAnfrage(k, anfrageMit(r2.token!)))?.konto.id, a.konto.id);

  // Ohne Gerätekonto und mit neuer Kennung entsteht ein Konto, mit TESTPHASE=abo ohne KI.
  const r3 = await anmeldungVerknuepfen(k, "google", "sub-2", null, new Date(), { testphase: false });
  assert.equal(r3.neu, true);
  assert.equal(r3.konto.stufe, "frei");
  assert.equal((await kontoAusAnfrage(k, anfrageMit(r3.token!)))?.konto.login, "google");
});

test("Konto löschen nimmt die Verknüpfung mit", async () => {
  const k = kv();
  const r = await anmeldungVerknuepfen(k, "apple", "sub-9", null);
  const h = await hash(r.token!);
  await kontoLoeschen(k, h, JSON.parse((await k.get(`konto.${h}`))!) as Konto);
  assert.equal([...k.inhalt.keys()].filter((x) => x.startsWith("login")).length, 0);
  const neu = await anmeldungVerknuepfen(k, "apple", "sub-9", null);
  assert.equal(neu.neu, true);
});
