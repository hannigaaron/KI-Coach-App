/**
 * Eine Testkette nach dem Muster von Apple, mit openssl erzeugt: Wurzel
 * P-384, Zwischenzertifikat P-384 mit der Apple Kennung für
 * Entwicklerzertifikate, Blatt P-256 mit der Kennung für den App Store
 * Empfang. Der Schlüssel des Blatts steht hier, damit der Test signieren
 * kann. Er gehört zu nichts ausser diesem Test.
 */
export const TEST_WURZEL = "MIIBuzCCAUCgAwIBAgIUNVHpTGyiCvRpFOqXzapGGbB+0kAwCgYIKoZIzj0EAwMwFDESMBAGA1UEAwwJVGVzdCBSb290MB4XDTI2MTAyNjIxMjUwM1oXDTM2MTAyMzIxMjUwM1owFDESMBAGA1UEAwwJVGVzdCBSb290MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAENJKZrVLzDLP6SkdpsYUAUAfi8NOZLIt6DA7PViUWaGKWV24zDNibngxWjNP71nR/RNkUSyECS8KRqKArab0m49lYs0mFr5rBw1D5lMn9Q+qBJ+XR7bm1Rdo2r9AYVpzho1MwUTAdBgNVHQ4EFgQUoymphh0QI2RPwCeU44twSC399F8wHwYDVR0jBBgwFoAUoymphh0QI2RPwCeU44twSC399F8wDwYDVR0TAQH/BAUwAwEB/zAKBggqhkjOPQQDAwNpADBmAjEA0ulWJkHQ0/FQ7tmJBN11ibU45WCm7FP33k/soEiucddJb/BRmbkqoPPDgQkce3vrAjEA8KicghFV1s1A39bCawnV+cuo62s2tFgweYO9lfNBG70BUwag++00F7HRbeBVpnZO";
export const TEST_ZWISCHEN = "MIIB0DCCAVagAwIBAgIUHAdIxgmXg87yBrpzxrybgxYc3XUwCgYIKoZIzj0EAwMwFDESMBAGA1UEAwwJVGVzdCBSb290MB4XDTI2MTAyNjIxMjUwM1oXDTM2MTAyMzIxMjUwM1owGDEWMBQGA1UEAwwNVGVzdCBad2lzY2hlbjB2MBAGByqGSM49AgEGBSuBBAAiA2IABEdhOyU8arx04ir57dYLQsF9mhUGX3mNXnBgatk5aIGY5jDj5gaTqp8FLBeFVZyRKaQ5MdyM7woQBurhtt4xodbI7rkjRfzvgsD62YRFflF3Z5Yyc4uVgrGrGLjsMwOAGqNlMGMwDwYDVR0TAQH/BAUwAwEB/zAQBgoqhkiG92NkBgIBBAIFADAdBgNVHQ4EFgQU89vjv5VA+DdKOpaxlt1SB8/fEUkwHwYDVR0jBBgwFoAUoymphh0QI2RPwCeU44twSC399F8wCgYIKoZIzj0EAwMDaAAwZQIwKqZmK9eVu6CRfnEKj4WbD7CoWU06HDloyNyGYCOYoMUeypOaTnUgpl5VEcEtlLN6AjEAjvBv7TGCrAbwnV+c7Cpdb2A53rvI/kxyaSx1JE7xtjkG7r4ujTpJohrjrPvDK4MT";
export const TEST_BLATT = "MIIBpDCCASmgAwIBAgIUIeMiT3pauL9AO4lTRv/816vacZwwCgYIKoZIzj0EAwMwGDEWMBQGA1UEAwwNVGVzdCBad2lzY2hlbjAeFw0yNjEwMjYyMTI1MDNaFw0zNjEwMjMyMTI1MDNaMBUxEzARBgNVBAMMClRlc3QgQmxhdHQwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAARvCBHDKHRDPZt6OdTtc43m1yoeADLaAE9XLhVCy52pDFLNn3ymJ6P8lpyj3hXJJz3Off9Bz8BRxcYRW29BHlzzo1QwUjAQBgoqhkiG92NkBgsBBAIFADAdBgNVHQ4EFgQUUDobHs4Vl/Lt1Mv52YFVAbVz0P0wHwYDVR0jBBgwFoAU89vjv5VA+DdKOpaxlt1SB8/fEUkwCgYIKoZIzj0EAwMDaQAwZgIxAMi3hz92b76Kf2bGn0UTa8Z9doTqGTGk5pq17PoJ8yC7ZsvZMErlddEe7jg85aDjLgIxAMZpAayAcx65VOqe3eyBKVrtAWHA9BJhdTgupF0/s4fXgE/fCS4uwEKMq9bYdFxVuA==";
export const TEST_BLATT_SCHLUESSEL = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgl5rWPghtzTrr9xznSS6OcIy5lilrEf9gy0NiKbWCpGehRANCAARvCBHDKHRDPZt6OdTtc43m1yoeADLaAE9XLhVCy52pDFLNn3ymJ6P8lpyj3hXJJz3Off9Bz8BRxcYRW29BHlzz";
export const TEST_WURZEL_SHA256 = "926520c4f7ef51c095acd8f137772459196d8314e51e0f2bdc97d4431dcb9ca5";

/** Signiert einen Inhalt als JWS mit der Testkette. */
const b64url = (b: Uint8Array | string) =>
  btoa(String.fromCharCode(...(typeof b === "string" ? new TextEncoder().encode(b) : b)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function testJws(inhalt: Record<string, unknown>, kette = [TEST_BLATT, TEST_ZWISCHEN, TEST_WURZEL]): Promise<string> {
  const key = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(TEST_BLATT_SCHLUESSEL), (c) => c.charCodeAt(0)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const kopf = b64url(JSON.stringify({ alg: "ES256", x5c: kette }));
  const rumpf = b64url(JSON.stringify(inhalt));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${kopf}.${rumpf}`)));
  return `${kopf}.${rumpf}.${b64url(sig)}`;
}

