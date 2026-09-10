import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createPublicKey } from "node:crypto";
import { nutzlastVerschluesseln } from "./verschluesselung.js";
import { vapidHeader, vapidPruefen, vapidSchluesselErzeugen } from "./vapid.js";
import { sendeWebPush } from "./senden.js";

/**
 * Der Testvektor aus RFC 8291, Abschnitt 5.
 *
 * Das ist die einzige Prüfung, die wirklich etwas beweist. Ein Rundlauf mit
 * selbst geschriebener Gegenseite zeigt nur, dass beide Seiten denselben
 * Fehler machen. Hier stehen Ein und Ausgabe fest, und wenn eine der
 * Zeichenketten in der Ableitung falsch wäre, käme ein anderer Körper heraus.
 */
test("Verschlüsselung trifft den Testvektor aus RFC 8291", () => {
  const abo = {
    endpoint: "https://push.example.net/push/JzLQ3raZJfFBR0aqvOMsLrt54w4rJUsV",
    keys: {
      p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
      auth: "BTBZMqHH6r4Tts7J_aSIgg",
    },
  };
  const koerper = nutzlastVerschluesseln(abo, "When I grow up, I want to be a watermelon", {
    salz: Buffer.from("DGv6ra1nlYgDCS1FRnbzlw", "base64url"),
    asPrivat: Buffer.from("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw", "base64url"),
  });

  const erwartet =
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml" +
    "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT" +
    "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN";
  assert.equal(koerper.toString("base64url"), erwartet);
  // Der abgedruckte Körper ergibt dekodiert 144 Byte. Die Zeile
  // Content-Length im selben Abschnitt nennt 145. Massgeblich ist der Körper.
  assert.equal(koerper.length, 144);
});

test("Ein anderes Salz ergibt einen anderen Körper", () => {
  const abo = {
    endpoint: "https://push.example.net/x",
    keys: {
      p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
      auth: "BTBZMqHH6r4Tts7J_aSIgg",
    },
  };
  const a = nutzlastVerschluesseln(abo, "hallo");
  const b = nutzlastVerschluesseln(abo, "hallo");
  assert.notEqual(a.toString("base64url"), b.toString("base64url"));
});

test("Zu kurze Schlüssel werden abgewiesen", () => {
  assert.throws(
    () => nutzlastVerschluesseln({ endpoint: "https://x/y", keys: { p256dh: "AAAA", auth: "BTBZMqHH6r4Tts7J_aSIgg" } }, "x"),
    /p256dh/,
  );
});

test("VAPID Schlüssel haben die vorgeschriebene Form", () => {
  const s = vapidSchluesselErzeugen();
  assert.equal(Buffer.from(s.oeffentlich, "base64url").length, 65);
  assert.equal(Buffer.from(s.privat, "base64url").length, 32);
  vapidPruefen(s);
});

test("Ein fremder privater Schlüssel fällt bei der Prüfung durch", () => {
  const a = vapidSchluesselErzeugen();
  const b = vapidSchluesselErzeugen();
  assert.throws(() => vapidPruefen({ oeffentlich: a.oeffentlich, privat: b.privat }), /gehören nicht zusammen/);
});

test("Der VAPID Header trägt den Ursprung des Endpunkts, nicht den Pfad", () => {
  const s = vapidSchluesselErzeugen();
  const header = vapidHeader({
    endpunkt: "https://web.push.apple.com/abc/def",
    schluessel: s,
    kontakt: "mailto:coach@daevo.app",
    jetzt: 1_700_000_000,
  });
  const jwt = header.slice("vapid t=".length).split(",")[0] as string;
  const teile = jwt.split(".");
  assert.equal(teile.length, 3);
  const payload = JSON.parse(Buffer.from(teile[1] as string, "base64url").toString("utf8"));
  assert.equal(payload.aud, "https://web.push.apple.com");
  assert.equal(payload.sub, "mailto:coach@daevo.app");
  assert.equal(payload.exp, 1_700_000_000 + 12 * 60 * 60);
  assert.ok(header.includes(`k=${s.oeffentlich}`));
  assert.equal(Buffer.from(teile[2] as string, "base64url").length, 64);
});

test("Die Signatur lässt sich mit dem öffentlichen Schlüssel prüfen", async () => {
  const { verify } = await import("node:crypto");
  const s = vapidSchluesselErzeugen();
  const header = vapidHeader({ endpunkt: "https://fcm.googleapis.com/x", schluessel: s, kontakt: "mailto:a@b.de" });
  const jwt = header.slice("vapid t=".length).split(",")[0] as string;
  const [h, p, sig] = jwt.split(".") as [string, string, string];
  const pub = Buffer.from(s.oeffentlich, "base64url");
  const key = createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: pub.subarray(1, 33).toString("base64url"),
      y: pub.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });
  assert.ok(
    verify("sha256", Buffer.from(`${h}.${p}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url")),
  );
});

test("410 gilt als abgelaufenes Abo, 500 nicht", async () => {
  const s = vapidSchluesselErzeugen();
  const abo = {
    endpoint: "https://push.example.net/x",
    keys: {
      p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
      auth: "BTBZMqHH6r4Tts7J_aSIgg",
    },
  };
  const antwort = (status: number) =>
    (async () => new Response(status === 201 ? null : "kaputt", { status })) as unknown as typeof fetch;

  const weg = await sendeWebPush({ abo, inhalt: { titel: "a", text: "b" }, schluessel: s, kontakt: "mailto:a@b.de", fetchImpl: antwort(410) });
  assert.equal(weg.abgelaufen, true);
  assert.equal(weg.ok, false);

  const kaputt = await sendeWebPush({ abo, inhalt: { titel: "a", text: "b" }, schluessel: s, kontakt: "mailto:a@b.de", fetchImpl: antwort(500) });
  assert.equal(kaputt.abgelaufen, false);

  const gut = await sendeWebPush({ abo, inhalt: { titel: "a", text: "b" }, schluessel: s, kontakt: "mailto:a@b.de", fetchImpl: antwort(201) });
  assert.equal(gut.ok, true);
});

test("Ein Netzfehler wirft nicht, sondern kommt als Ergebnis zurück", async () => {
  const s = vapidSchluesselErzeugen();
  const abo = {
    endpoint: "https://push.example.net/x",
    keys: {
      p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
      auth: "BTBZMqHH6r4Tts7J_aSIgg",
    },
  };
  const ergebnis = await sendeWebPush({
    abo,
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
