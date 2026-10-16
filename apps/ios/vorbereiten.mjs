/**
 * Holt die gebaute Web App in die native Hülle.
 *
 * Die iPhone App ist dieselbe Web App wie auf GitHub Pages, nur aus dem
 * App Bundle geladen statt aus dem Netz. Ein zweiter Code für iOS würde
 * jede Änderung zweimal verlangen, und nach drei Wochen laufen beide
 * auseinander.
 *
 * Standard ist die Entwicklerfassung: der Betreiber benutzt die App selbst,
 * mit eigenem Schlüssel. Mit `--nutzer` kommt die Fassung für Nutzer hinein,
 * die über den Worker spricht.
 */
import { execSync } from "node:child_process";
import { cp, rm, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const hier = dirname(fileURLToPath(import.meta.url));
const wurzel = join(hier, "..", "..");
const nutzer = process.argv.includes("--nutzer");
const quelle = join(wurzel, nutzer ? "dist-demo" : "dist-pages");
const ziel = join(hier, "www");

// Gebaut wird über das Skript der Wurzel, damit dieselben Prüfungen laufen:
// Syntax, Kennungen im HTML, Geheimnisse in der Konfiguration.
execSync(`npm run ${nutzer ? "build:demo" : "build:pwa"}`, { cwd: wurzel, stdio: "inherit" });
await access(join(quelle, "index.html"));

await rm(ziel, { recursive: true, force: true });
await cp(quelle, ziel, { recursive: true });
console.log(`www aus ${nutzer ? "dist-demo" : "dist-pages"} übernommen.`);
