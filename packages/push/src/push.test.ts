import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ausB64Url, zuB64Url } from "./b64.js";
import { jwkAus, nutzlastVerschluesseln } from "./verschluesselung.js";
import { vapidHeader, vapidPruefen, vapidSchluesselErzeugen } from "./vapid.js";
import { sendeWebPush } from "./senden.js";

const ABO = {
  endpoint: "https://push.example.net/push/JzLQ3raZJfFBR0aqvOMsLrt54w4rJUsV",
  keys: {
    p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
    auth: "BTBZMqHH6r4Tts7J_aSIgg",
  },
};

/**
 * Der Testvektor aus RFC 8291, Abschnitt 5.
 *
 * Das ist die einzige Prüfung, die wirklich etwas beweist. Ein Rundlauf mit
 * selbst geschriebener Gegenseite zeigt nur, dass beide Seiten denselben
 * Fehler machen. Hier stehen Ein und Ausgabe fest, und wenn eine der
 * Zeichenketten in der Ableitung falsch wäre, käme ein anderer Körper heraus.
 */
test("Verschlüsselung trifft den Testvektor aus RFC 8291", async () => {
  const koerper = await nutzlastVerschluesseln(ABO, "When I grow up, I want to be a watermelon", {
    salz: ausB64Url("DGv6ra1nlYgDCS1FRnbzlw"),
    asPrivat: ausB64Url("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw"),
    asOeffentlich: ausB64Url("BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"),
  });

  const erwartet =
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml" +
    "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT" +
    "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";
  assert.equal(zuB64Url(koerper), erwartet);
  // Der abgedruckte Körper ergibt dekodiert 144 Byte. Die Zeile
  // Content-Length im selben Abschnitt nennt 145. Massgeblich ist der Körper.
  assert.equal(koerper.length, 144);
});

test("Ein anderes Salz ergibt einen anderen Körper", async () => {
  const a = await nutzlastVerschluesseln(ABO, "hallo");
  const b = await nutzlastVerschluesseln(ABO, "hallo");
  assert.notEqual(zuB64Url(a), zuB64Url(b));
});

test("Der Kopf des Körpers trägt Satzgrösse und Schlüssellänge", async () => {
  const k = await nutzlastVerschluesseln(ABO, "hallo");
  assert.equal(new DataView(k.buffer, k.byteOffset + 16, 4).getUint32(0), 4096);
  assert.equal(k[20], 65);
  assert.equal(k[21], 0x04, "der flüchtige Schlüssel steht unkomprimiert im Körper");
});

test("Zu kurze Schlüssel werden abgewiesen", async () => {
  await assert.rejects(
    () => nutzlastVerschluesseln({ endpoint: "https://x/y", keys: { p256dh: "AAAA", auth: "BTBZMqHH6r4Tts7J_aSIgg" } }, "x"),
    /p256dh/,
  );
  await assert.rejects(() => nutzlastVerschluesseln({ ...ABO, keys: { ...ABO.keys, auth: "AAAA" } }, "x"), /auth/);
});

test("Eine zu grosse Nutzlast wird abgewiesen, statt abgeschnitten zu werden", async () => {
  await assert.rejects(() => nutzlastVerschluesseln(ABO, "x".repeat(4096)), /zu gross/);
});

test("base64url läuft ohne Verlust hin und zurück", () => {
  const bytes = crypto.getRandomValues(new Uint8Array(200));
  assert.deepEqual([...ausB64Url(zuB64Url(bytes))], [...bytes]);
});

test("Ein JWK entsteht aus dem unkomprimierten Punkt", () => {
  const punkt = ausB64Url(ABO.keys.p256dh);
  const jwk = jwkAus(punkt);
  assert.equal(jwk.crv, "P-256");
  assert.equal(jwk.d, undefined);
  assert.equal(ausB64Url(jwk.x as string).length, 32);
  assert.equal(ausB64Url(jwk.y as string).length, 32);
});

test("VAPID Schlüssel haben die vorgeschriebene Form", async () => {
  const s = await vapidSchluesselErzeugen();
  assert.equal(ausB64Url(s.oeffentlich).length, 65);
  assert.equal(ausB64Url(s.privat).length, 32);
  await vapidPruefen(s);
});

test("Ein fremder privater Schlüssel fällt bei der Prüfung durch", async () => {
  const a = await vapidSchluesselErzeugen();
  const b = await vapidSchluesselErzeugen();
  await assert.rejects(() => vapidPruefen({ oeffentlich: a.oeffentlich, privat: b.privat }), /gehören nicht zusammen/);
  // Und die Gegenprobe: das echte Paar geht durch.
  await vapidPruefen(a);
  await vapidPruefen(b);
});

test("Ein privater Schlüssel ausserhalb der Kurve fällt durch", async () => {
  const a = await vapidSchluesselErzeugen();
  await assert.rejects(
    () => vapidPruefen({ oeffentlich: a.oeffentlich, privat: zuB64Url(new Uint8Array(32).fill(0xff)) }),
    /Kurve P-256|gehören nicht zusammen/,
  );
});

test("Ein zu kurzer Schlüssel fällt bei der Prüfung durch", async () => {
  const a = await vapidSchluesselErzeugen();
  await assert.rejects(() => vapidPruefen({ oeffentlich: a.oeffentlich, privat: "AAAA" }), /32 Byte/);
  await assert.rejects(() => vapidPruefen({ oeffentlich: "AAAA", privat: a.privat }), /65 Byte/);
});

test("Der VAPID Header trägt den Ursprung des Endpunkts, nicht den Pfad", async () => {
  const s = await vapidSchluesselErzeugen();
  const header = await vapidHeader({
    endpunkt: "https://web.push.apple.com/abc/def",
    schluessel: s,
    kontakt: "mailto:coach@daevo.app",
    jetzt: 1_700_000_000,
  });
  const jwt = header.slice("vapid t=".length).split(",")[0] as string;
  const teile = jwt.split(".");
  assert.equal(teile.length, 3);
  const payload = JSON.parse(new TextDecoder().decode(ausB64Url(teile[1] as string)));
  assert.equal(payload.aud, "https://web.push.apple.com");
  assert.equal(payload.sub, "mailto:coach@daevo.app");
  assert.equal(payload.exp, 1_700_000_000 + 12 * 60 * 60);
  assert.ok(header.includes(`k=${s.oeffentlich}`));
  assert.equal(ausB64Url(teile[2] as string).length, 64, "ES256 verlangt r und s als je 32 Byte");
});

test("Die Signatur lässt sich mit dem öffentlichen Schlüssel prüfen", async () => {
  const s = await vapidSchluesselErzeugen();
  const header = await vapidHeader({ endpunkt: "https://fcm.googleapis.com/x", schluessel: s, kontakt: "mailto:a@b.de" });
  const jwt = header.slice("vapid t=".length).split(",")[0] as string;
  const [h, p, sig] = jwt.split(".") as [string, string, string];
  const key = await crypto.subtle.importKey(
    "raw",
    ausB64Url(s.oeffentlich),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  assert.ok(
    await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      ausB64Url(sig),
      new TextEncoder().encode(`${h}.${p}`),
    ),
  );
});

test("410 gilt als abgelaufenes Abo, 500 nicht", async () => {
  const s = await vapidSchluesselErzeugen();
  const antwort = (status: number) =>
    (async () => new Response(status === 201 ? null : "kaputt", { status })) as unknown as typeof fetch;
  const basis = { abo: ABO, inhalt: { titel: "a", text: "b" }, schluessel: s, kontakt: "mailto:a@b.de" };

  const weg = await sendeWebPush({ ...basis, fetchImpl: antwort(410) });
  assert.equal(weg.abgelaufen, true);
  assert.equal(weg.ok, false);
  assert.equal(await sendeWebPush({ ...basis, fetchImpl: antwort(404) }).then((e) => e.abgelaufen), true);
  assert.equal(await sendeWebPush({ ...basis, fetchImpl: antwort(500) }).then((e) => e.abgelaufen), false);
  assert.equal(await sendeWebPush({ ...basis, fetchImpl: antwort(201) }).then((e) => e.ok), true);
});

test("Die Anfrage trägt die Kopfzeilen, die der Push Dienst verlangt", async () => {
  const s = await vapidSchluesselErzeugen();
  let gesehen: Request | null = null;
  await sendeWebPush({
    abo: ABO,
    inhalt: { titel: "a", text: "b" },
    schluessel: s,
    kontakt: "mailto:a@b.de",
    fetchImpl: (async (url: string, init: RequestInit) => {
      gesehen = new Request(url, init);
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch,
  });
  const anfrage = gesehen as unknown as Request;
  assert.equal(anfrage.method, "POST");
  assert.equal(anfrage.headers.get("Content-Encoding"), "aes128gcm");
  assert.equal(anfrage.headers.get("TTL"), String(4 * 60 * 60));
  assert.match(anfrage.headers.get("Authorization") ?? "", /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
});

test("Ein Netzfehler wirft nicht, sondern kommt als Ergebnis zurück", async () => {
  const s = await vapidSchluesselErzeugen();
  const ergebnis = await sendeWebPush({
    abo: ABO,
    inhalt: { titel: "a", text: "b" },
    schluessel: s,
    kontakt: "mailto:a@b.de",
    fetchImpl: (async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    }) as unknown as typeof fetch,
  });
  assert.equal(ergebnis.ok, false);
  assert.equal(ergebnis.status, 0);
  assert.match(ergebnis.fehler ?? "", /ENOTFOUND/);
});
