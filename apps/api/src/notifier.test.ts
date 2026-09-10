import { strict as assert } from "node:assert";
import { test } from "node:test";
import { vapidSchluesselErzeugen } from "@daevo/push";
import { WebPushNotifier } from "./notifier.js";

const schluessel = await vapidSchluesselErzeugen();

test("Ein Schlüsselpaar, das nicht zusammenpasst, fällt beim Anlegen auf", async () => {
  const anderer = await vapidSchluesselErzeugen();
  await assert.rejects(
    () => WebPushNotifier.erstellen({ oeffentlich: schluessel.oeffentlich, privat: anderer.privat }, "mailto:a@b.de"),
    /gehören nicht zusammen/,
  );
});

test("Ein unlesbares Gerätetoken bricht den Durchlauf nicht ab", async () => {
  const notifier = await WebPushNotifier.erstellen(schluessel, "mailto:a@b.de");
  const fehler: string[] = [];
  const echt = console.error;
  console.error = (...args: unknown[]) => fehler.push(args.join(" "));
  try {
    await notifier.send({ userId: "u1", title: "t", body: "b", kind: "hydration" }, ["kein JSON", "{}"]);
  } finally {
    console.error = echt;
  }
  assert.equal(fehler.length, 2);
  assert.match(fehler[0] ?? "", /kein gültiges JSON/);
  assert.match(fehler[1] ?? "", /nicht die Form eines Abos/);
});
