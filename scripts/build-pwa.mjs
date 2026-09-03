/**
 * Baut die statische Version der App fuer GitHub Pages.
 *
 * Ablauf: die kompilierten Pakete aus packages/*\/dist werden neben die
 * statischen Dateien aus apps/pwa kopiert. Die Importe im Browser laufen ueber
 * die Import Map in index.html, deshalb braucht es keinen Bundler.
 */
import { cp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const outDir = join(root, "dist-pages");

const required = [
  join(root, "packages/core/dist/index.js"),
  join(root, "packages/coach/dist/index.js"),
];
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`Fehlt: ${file}\nZuerst "npm run build" ausfuehren.`);
    process.exit(1);
  }
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await cp(join(root, "apps/pwa"), outDir, { recursive: true });
await mkdir(join(outDir, "lib/core"), { recursive: true });
await mkdir(join(outDir, "lib/coach"), { recursive: true });

/** Kopiert nur die Laufzeitdateien, keine Tests und keine Sourcemaps. */
async function copyRuntime(from, to) {
  for (const entry of await readdir(from, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".js")) continue;
    if (entry.name.endsWith(".test.js")) continue;
    await cp(join(from, entry.name), join(to, entry.name));
  }
}

await copyRuntime(join(root, "packages/core/dist"), join(outDir, "lib/core"));
await copyRuntime(join(root, "packages/coach/dist"), join(outDir, "lib/coach"));

// GitHub Pages laeuft sonst durch Jekyll und wirft Ordner mit Unterstrich weg.
await writeFile(join(outDir, ".nojekyll"), "");

const files = [];
async function walk(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await walk(join(dir, entry.name), rel);
    else files.push(rel);
  }
}
await walk(outDir);

// Sicherstellen, dass die Import Map auf vorhandene Dateien zeigt.
const html = await readFile(join(outDir, "index.html"), "utf8");
for (const path of ["./lib/core/index.js", "./lib/coach/index.js"]) {
  if (!html.includes(path)) {
    console.error(`Import Map verweist nicht auf ${path}`);
    process.exit(1);
  }
  if (!files.includes(path.slice(2))) {
    console.error(`Datei fehlt im Build: ${path}`);
    process.exit(1);
  }
}

console.log(`dist-pages gebaut, ${files.length} Dateien.`);
