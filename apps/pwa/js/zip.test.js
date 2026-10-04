import test from "node:test";
import assert from "node:assert/strict";
import { zipDateiText, zipNamen } from "./zip.js";

/**
 * Baut ein echtes ZIP im Speicher.
 *
 * Kein fertiges Testarchiv als Datei im Repo, denn dann prüft der Test ein
 * Byte-Muster, das irgendwann niemand mehr erzeugen kann. So entsteht es bei
 * jedem Lauf neu, und zwar mit demselben `CompressionStream`, den auch der
 * Browser benutzt.
 */
async function zipBauen(dateien) {
  const geber = new TextEncoder();
  const stuecke = [];
  const zentral = [];
  let versatz = 0;

  for (const { name, inhalt, packen = true } of dateien) {
    const roh = geber.encode(inhalt);
    const daten = packen ? await deflate(roh) : roh;
    const nameBytes = geber.encode(name);

    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(8, packen ? 8 : 0, true);
    kopf.setUint32(18, daten.length, true);
    kopf.setUint32(22, roh.length, true);
    kopf.setUint16(26, nameBytes.length, true);
    stuecke.push(new Uint8Array(kopf.buffer), nameBytes, daten);

    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true);
    z.setUint16(10, packen ? 8 : 0, true);
    z.setUint32(20, daten.length, true);
    z.setUint32(24, roh.length, true);
    z.setUint16(28, nameBytes.length, true);
    z.setUint32(42, versatz, true);
    zentral.push(new Uint8Array(z.buffer), nameBytes);

    versatz += 30 + nameBytes.length + daten.length;
  }

  const zentralGroesse = zentral.reduce((s, t) => s + t.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, zentralGroesse, true);
  ende.setUint32(16, versatz, true);

  return new Blob([...stuecke, ...zentral, new Uint8Array(ende.buffer)]);
}

async function deflate(bytes) {
  const strom = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

async function alsText(strom) {
  let text = "";
  for await (const stueck of strom) text += stueck;
  return text;
}

const XML = "<HealthData><Record type=\"HKQuantityTypeIdentifierStepCount\" value=\"1200\"/></HealthData>";

test("Eine gepackte Datei kommt vollständig zurück", async () => {
  const zip = await zipBauen([
    { name: "apple_health_export/export_cda.xml", inhalt: "<falsch/>" },
    { name: "apple_health_export/export.xml", inhalt: XML },
  ]);
  const strom = await zipDateiText(zip, (n) => n.endsWith("/export.xml") || n === "export.xml");
  assert.equal(await alsText(strom), XML);
});

test("Eine ungepackte Datei geht auch", async () => {
  const zip = await zipBauen([{ name: "export.xml", inhalt: XML, packen: false }]);
  assert.equal(await alsText(await zipDateiText(zip, (n) => n === "export.xml")), XML);
});

test("Eine grosse Datei wird in Stücken geliefert", async () => {
  // Der eigentliche Zweck des Stroms. Käme alles in einem Stück, brächte eine
  // echte Exportdatei den Browser um.
  const gross = XML.repeat(20000);
  const zip = await zipBauen([{ name: "export.xml", inhalt: gross }]);
  const strom = await zipDateiText(zip, (n) => n === "export.xml");
  let stuecke = 0;
  let laenge = 0;
  for await (const s of strom) { stuecke++; laenge += s.length; }
  assert.equal(laenge, gross.length);
  assert.ok(stuecke > 1, `kam in ${stuecke} Stücken`);
});

test("Die Namen im Archiv lassen sich auflisten", async () => {
  const zip = await zipBauen([
    { name: "apple_health_export/export.xml", inhalt: XML },
    { name: "apple_health_export/Elektrokardiogramme/ekg.csv", inhalt: "a,b" },
  ]);
  assert.deepEqual(await zipNamen(zip), [
    "apple_health_export/export.xml",
    "apple_health_export/Elektrokardiogramme/ekg.csv",
  ]);
});

test("Eine fehlende Datei wird gemeldet, statt still nichts zu tun", async () => {
  const zip = await zipBauen([{ name: "export.xml", inhalt: XML }]);
  await assert.rejects(() => zipDateiText(zip, (n) => n === "gibtsnicht.xml"), /nicht drin/);
});

test("Etwas, das kein ZIP ist, wird als solches gemeldet", async () => {
  await assert.rejects(
    () => zipDateiText(new Blob(["das ist einfach nur text"]), () => true),
    /keine ZIP Datei/,
  );
});
