/**
 * Holt Satoshi beim Bauen von Fontshare, statt sie einzuchecken.
 *
 * Satoshi steht unter der ITF Free Font License. Sie erlaubt, die Schrift
 * auf der eigenen Seite und in der eigenen App auszuliefern, verbietet aber,
 * sie über ein öffentliches Repository weiterzugeben, und dieses Repository
 * ist öffentlich. Deshalb liegt sie nur in der gebauten App, nie im Baum.
 * Verändert wird nichts: die Lizenz verbietet auch Teilmengen und
 * Formatwechsel, also geht die offizielle Datei unverändert hinein.
 *
 * Ohne Netz baut die App trotzdem. Dann fehlt die Datei, das Stylesheet
 * fällt auf die Systemschrift zurück, und der Build sagt das.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile, cp } from "node:fs/promises";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

const QUELLE = "https://api.fontshare.com/v2/fonts/download/satoshi";
const DATEIEN = {
  "Satoshi_Complete/Fonts/WEB/fonts/Satoshi-Variable.woff2": "satoshi-variable.woff2",
  "Satoshi_Complete/License/FFL.txt": "satoshi-lizenz-ffl.txt",
};

/**
 * Liest die gesuchten Einträge aus einem ZIP. Über das zentrale Verzeichnis
 * am Ende und nicht von vorn, denn nur dort stehen die Grössen verlässlich.
 */
export function zipLesen(buf, namen) {
  let ende = buf.length - 22;
  while (ende >= 0 && buf.readUInt32LE(ende) !== 0x06054b50) ende--;
  if (ende < 0) throw new Error("Kein ZIP Archiv.");
  const anzahl = buf.readUInt16LE(ende + 10);
  let pos = buf.readUInt32LE(ende + 16);
  const raus = {};
  for (let i = 0; i < anzahl; i++) {
    const methode = buf.readUInt16LE(pos + 10);
    const groesse = buf.readUInt32LE(pos + 20);
    const nl = buf.readUInt16LE(pos + 28), xl = buf.readUInt16LE(pos + 30), kl = buf.readUInt16LE(pos + 32);
    const lokal = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf8", pos + 46, pos + 46 + nl);
    if (namen.includes(name)) {
      // Der lokale Kopf kann ein anderes Extrafeld tragen als das Verzeichnis.
      const start = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28);
      const roh = buf.subarray(start, start + groesse);
      raus[name] = methode === 8 ? inflateRawSync(roh) : methode === 0 ? Buffer.from(roh) : null;
    }
    pos += 46 + nl + xl + kl;
  }
  return raus;
}

/** Legt Satoshi nach `ziel`. Gibt true zurück, wenn die Schrift dort liegt. */
export async function satoshiHolen(ziel, lager) {
  await mkdir(lager, { recursive: true });
  const fertig = () => Object.values(DATEIEN).every((d) => existsSync(join(lager, d)));
  if (!fertig()) {
    try {
      const r = await fetch(QUELLE);
      if (!r.ok) throw new Error(`Fontshare antwortet mit ${r.status}`);
      const inhalt = zipLesen(Buffer.from(await r.arrayBuffer()), Object.keys(DATEIEN));
      for (const [im, als] of Object.entries(DATEIEN)) {
        if (!inhalt[im]) throw new Error(`${im} fehlt im Archiv`);
        await writeFile(join(lager, als), inhalt[im]);
      }
    } catch (fehler) {
      console.warn(`Satoshi nicht geladen (${fehler.message}). Die App zeigt die Systemschrift.`);
      return false;
    }
  }
  await mkdir(ziel, { recursive: true });
  for (const d of Object.values(DATEIEN)) await cp(join(lager, d), join(ziel, d));
  return true;
}

// Direkt aufgerufen: nur ins Lager laden, etwa vor einem Build ohne Netz.
if (process.argv[1]?.endsWith("schrift-holen.mjs")) {
  const lager = join(process.cwd(), "node_modules/.cache/daevo-schrift");
  console.log((await satoshiHolen(lager, lager)) ? "Satoshi liegt bereit." : "Satoshi fehlt.");
}
