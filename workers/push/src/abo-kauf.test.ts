import test from "node:test";
import assert from "node:assert/strict";
import { appleJwsAnwenden, appleMeldung, stripeEreignis, stripeSignaturPruefen, stufeAusProdukt } from "./abo-kauf.js";
import { TEST_WURZEL_SHA256, testJws } from "./apple-jws.testdaten.js";
import { geltendeStufe, kontoAnlegen, type Konto } from "./konto.js";
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
async function kontoVon(k: KVNamespace, id: string): Promise<Konto> {
  return JSON.parse((await k.get(`konto.${await k.get(`kontoid.${id}`)}`))!) as Konto;
}

test("Stufe aus Produkt: Liste schlägt Namen, Namen auf Wortgrenzen", () => {
  assert.equal(stufeAusProdukt("de.daevo.plus.monat"), "plus");
  assert.equal(stufeAusProdukt("daevo_pro_jahr"), "pro");
  assert.equal(stufeAusProdukt("price_123", "price_123:pro"), "pro");
  assert.equal(stufeAusProdukt("de.daevo.produkt"), null);
});

test("App Store: Testphase setzt die Stufe bis zum Ende plus einen Tag, ein Abo gehört einem Konto", async () => {
  const k = kv();
  const a = await kontoAnlegen(k, new Date(), { testphase: false });
  const jetzt = Date.parse("2026-10-27T10:00:00Z");
  const trans = { productId: "de.daevo.plus.monat", bundleId: "de.daevo.app", originalTransactionId: "1000", expiresDate: Date.parse("2026-11-03T10:00:00Z"), offerType: 1 };
  const o = { kontoId: a.konto.id, wurzel: TEST_WURZEL_SHA256, jetzt };
  const r = await appleJwsAnwenden(k, await testJws(trans), o);
  assert.equal(r.status, 200);
  const konto = await kontoVon(k, a.konto.id);
  assert.equal(konto.stufe, "plus");
  assert.equal(konto.bis, "2026-11-04");
  assert.equal(konto.quelle, "appstore");
  // Dasselbe Abo auf einem zweiten Konto wird abgelehnt.
  const b = await kontoAnlegen(k);
  assert.equal((await appleJwsAnwenden(k, await testJws(trans), { ...o, kontoId: b.konto.id })).status, 409);
  // Fremde App und gefälschte Signatur.
  assert.equal((await appleJwsAnwenden(k, await testJws({ ...trans, bundleId: "x" }), o)).status, 400);
  assert.equal((await appleJwsAnwenden(k, await testJws(trans), { kontoId: a.konto.id })).status, 401);
  // Meldung von Apple: zurückerstattet heisst ohne Abo.
  const meldung = await testJws({ notificationType: "REFUND", data: { signedTransactionInfo: await testJws({ ...trans, revocationDate: jetzt }) } });
  assert.equal((await appleMeldung(k, meldung, { wurzel: TEST_WURZEL_SHA256, jetzt })).status, 200);
  assert.equal(geltendeStufe(await kontoVon(k, a.konto.id), "2026-10-27"), "frei");
});

test("Stripe: Signatur nach Doku, Testphase über Checkout und Abo in beliebiger Reihenfolge", async () => {
  const geheim = "whsec_test";
  const roh = JSON.stringify({ type: "x" });
  const t = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(geheim), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${roh}`))).toString("hex");
  assert.equal(await stripeSignaturPruefen(roh, `t=${t},v1=${sig}`, geheim), true);
  assert.equal(await stripeSignaturPruefen(roh + " ", `t=${t},v1=${sig}`, geheim), false);
  assert.equal(await stripeSignaturPruefen(roh, `t=${t - 600},v1=${sig}`, geheim), false);

  const k = kv();
  const a = await kontoAnlegen(k, new Date(), { testphase: false });
  const ende = Math.floor(Date.parse("2026-11-03T12:00:00Z") / 1000);
  const abo = { id: "sub_1", status: "trialing", current_period_end: ende, items: { data: [{ price: { id: "price_x", lookup_key: "daevo_pro_monat" } }] } };
  // Zuerst das Abo, dann der Checkout.
  await stripeEreignis(k, { type: "customer.subscription.created", data: { object: abo } });
  assert.equal((await kontoVon(k, a.konto.id)).stufe, "frei");
  await stripeEreignis(k, { type: "checkout.session.completed", data: { object: { client_reference_id: a.konto.id, subscription: "sub_1" } } });
  let konto = await kontoVon(k, a.konto.id);
  assert.equal(konto.stufe, "pro");
  assert.equal(konto.bis, "2026-11-04");
  // In der Testphase gekündigt.
  await stripeEreignis(k, { type: "customer.subscription.deleted", data: { object: { ...abo, status: "canceled" } } });
  konto = await kontoVon(k, a.konto.id);
  assert.equal(konto.stufe, "frei");
});
