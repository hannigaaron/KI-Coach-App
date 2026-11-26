/**
 * Holt die gebaute Web App in die native Hülle.
 *
 * Die iPhone App ist dieselbe Web App wie auf GitHub Pages, nur aus dem
 * App Bundle geladen statt aus dem Netz. Ein zweiter Code für iOS würde
 * jede Änderung zweimal verlangen, und nach drei Wochen laufen beide
 * auseinander.
 *
 * Standard ist die Fassung für Nutzer, die über den Worker spricht. Der
 * Betreiber benutzt die App so, wie seine Kunden sie sehen, sonst weiss er
 * nie, wie sie beim Kunden aussieht. Mit `--entwickler` kommt die
 * Entwicklerfassung mit eigenem Schlüssel hinein.
 */
import { execSync } from "node:child_process";
import { cp, rm, access, readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, "..", "..");
const nutzer = !process.argv.includes("--entwickler");
const quelle = join(wurzel, nutzer ? "dist-demo" : "dist-pages");
const ziel = join(hier, "www");

// Gebaut wird über das Skript der Wurzel, damit dieselben Prüfungen laufen:
// Syntax, Kennungen im HTML, Geheimnisse in der Konfiguration.
execSync(`npm run ${nutzer ? "build:demo" : "build:pwa"}`, { cwd: wurzel, stdio: "inherit" });
await access(join(quelle, "index.html"));

await rm(ziel, { recursive: true, force: true });
await cp(quelle, ziel, { recursive: true });
console.log(`www aus ${nutzer ? "dist-demo" : "dist-pages"} übernommen.`);

/**
 * Die Uhr gleich mit. Ihre Ziele legt der Betreiber einmal in Xcode an, die
 * Ordner liegen dann nur auf seinem Mac und nicht im Repository. Die Quellen
 * stehen in `watch/`. Vorher mussten sie nach jedem Pull von Hand kopiert
 * werden, und eine vergessene Kopie hiess: iPhone neu, Uhr alt, und das
 * Paket passt nicht mehr zur Uhr. Kopiert wird nur, wenn der Ordner in Xcode
 * existiert. Neue Dateien landen im Ordner, Xcode kennt sie aber erst nach
 * "Add Files", deshalb werden sie genannt.
 */
const xcode = join(hier, "ios", "App");
async function uhrDateien(quellOrdner, zielOrdner, extra = []) {
  try { await access(zielOrdner); } catch { return null; }
  const vorher = new Set(await readdir(zielOrdner));
  const dateien = [...(await readdir(quellOrdner)).filter((d) => d.endsWith(".swift")).map((d) => join(quellOrdner, d)), ...extra];
  const neu = [];
  let geaendert = 0;
  for (const datei of dateien) {
    const name = datei.split("/").pop();
    const inhalt = await readFile(datei);
    let alt = null;
    try { alt = await readFile(join(zielOrdner, name)); } catch {}
    if (alt && alt.equals(inhalt)) continue;
    await writeFile(join(zielOrdner, name), inhalt);
    if (!vorher.has(name)) neu.push(name); else geaendert++;
  }
  return { geaendert, neu };
}
const uhr = await uhrDateien(join(hier, "watch", "daevo Watch App"), join(xcode, "daevo Watch App"), [join(hier, "watch", "Gemeinsam", "Komplikation.swift")]);
const kompl = await uhrDateien(join(hier, "watch", "daevo Komplikation"), join(xcode, "daevo Komplikation"));
if (uhr) {
  try {
    const icon = join(xcode, "daevo Watch App", "Assets.xcassets", "AppIcon.appiconset");
    await access(icon);
    await cp(join(hier, "watch", "AppIcon.appiconset"), icon, { recursive: true });
  } catch {}
  console.log(`Uhr: ${uhr.geaendert} Dateien aktualisiert.`);
  if (uhr.neu.length) console.log(`Uhr: neu, in Xcode über Add Files zum Ziel "daevo Watch App" hinzufügen: ${uhr.neu.join(", ")}`);
} else {
  console.log("Uhr: noch nicht in Xcode eingerichtet, siehe docs/WATCH.md.");
}
if (kompl) {
  console.log(`Komplikation: ${kompl.geaendert} Dateien aktualisiert.`);
  if (kompl.neu.length) console.log(`Komplikation: neu, in Xcode über Add Files hinzufügen: ${kompl.neu.join(", ")}`);
}
