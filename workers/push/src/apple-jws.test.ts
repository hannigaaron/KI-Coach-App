import test from "node:test";
import assert from "node:assert/strict";
import { APPLE_ROOT_G3_SHA256, appleJwsPruefen } from "./apple-jws.js";
import { TEST_BLATT, TEST_WURZEL, TEST_WURZEL_SHA256, TEST_ZWISCHEN, testJws } from "./apple-jws.testdaten.js";

const b64url = (b: string) => Buffer.from(new TextEncoder().encode(b)).toString("base64url");


test("App Store JWS: Kette, Kennungen und Signatur werden geprüft", async () => {
  const jws = await testJws({ productId: "de.daevo.plus.monat" });
  const ok = await appleJwsPruefen(jws, { wurzel: TEST_WURZEL_SHA256 });
  assert.deepEqual(ok, { inhalt: { productId: "de.daevo.plus.monat" } });
  // Im Betrieb gilt nur die Wurzel von Apple.
  assert.match((await appleJwsPruefen(jws) as { fehler: string }).fehler, /nicht die von Apple/);
  // Ein veränderter Inhalt fällt an der Signatur durch.
  const t = jws.split(".");
  const falsch = `${t[0]}.${b64url(JSON.stringify({ productId: "de.daevo.pro.jahr" }))}.${t[2]}`;
  assert.match((await appleJwsPruefen(falsch, { wurzel: TEST_WURZEL_SHA256 }) as { fehler: string }).fehler, /Signatur/);
  // Zwischenzertifikat und Blatt vertauscht: die Kette trägt nicht.
  const vertauscht = await testJws({ a: 1 }, [TEST_ZWISCHEN, TEST_BLATT, TEST_WURZEL]);
  assert.ok("fehler" in (await appleJwsPruefen(vertauscht, { wurzel: TEST_WURZEL_SHA256 })));
  assert.equal(APPLE_ROOT_G3_SHA256.length, 64);
});
