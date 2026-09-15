/**
 * Baut die statische Version der App für GitHub Pages.
 *
 * Ablauf: die kompilierten Pakete aus packages/*\/dist werden neben die
 * statischen Dateien aus apps/pwa kopiert. Die Importe im Browser laufen über
 * die Import Map in index.html, deshalb braucht es keinen Bundler.
 */
import { cp, mkdir, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outDir = join(root, "dist-pages");

const required = [
  join(root, "packages/core/dist/index.js"),
  join(root, "packages/coach/dist/index.js"),
];
for (const file of required) {
  if (!existsSync(file)) {
    console.error(`Fehlt: ${file}\nZuerst "npm run build" ausführen.`);
    process.exit(1);
  }
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// Tests gehoeren nicht in die veroeffentlichte App.
await cp(join(root, "apps/pwa"), outDir, {
  recursive: true,
  filter: (quelle) => !quelle.endsWith(".test.js"),
});
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

/**
 * Syntaxprüfung für den Browsercode.
 *
 * `npm test` prüft die Pakete, aber `apps/pwa/js` ist reines Browser
 * JavaScript und läuft in keinem Test. Ein Tippfehler dort kommt deshalb
 * grün durch die Prüfung und macht die App beim Öffnen weiss: das Modul
 * lädt nicht, `#app` bleibt versteckt, und der Nutzer sieht den
 * Anamnesebogen statt seiner Daten.
 *
 * Genau das ist passiert. Seitdem läuft `node --check` über jede Datei,
 * bevor irgendetwas nach dist-pages geht.
 */
const jsDir = join(root, "apps/pwa/js");
const jsDateien = (await readdir(jsDir)).filter((n) => n.endsWith(".js"));
for (const name of jsDateien) {
  try {
    execFileSync(process.execPath, ["--check", join(jsDir, name)], { stdio: "pipe" });
  } catch (fehler) {
    const meldung = String(fehler.stderr || fehler.message).trim();
    console.error(`\nSyntaxfehler in apps/pwa/js/${name}\n${meldung}\n`);
    process.exit(1);
  }
}
console.log(`${jsDateien.length} Browserdateien syntaktisch geprüft.`);

/*
 * Jede angesprochene Kennung muss es im HTML auch geben.
 *
 * Der Syntaxtest oben findet das nicht. `$("btnFotoEssen")` ist einwandfreies
 * JavaScript, auch wenn es das Element nicht mehr gibt. Im Browser wirft erst
 * `addEventListener` auf `null`, das Modul bricht ab, und die App bleibt
 * schwarz. Genau so ist es passiert, als ein Knopf aus der Oberfläche
 * verschwand und sein Listener stehen blieb.
 *
 * Geprüft wird nur `$("...")` mit fester Zeichenkette. Alles, was aus einer
 * Variablen kommt, lässt sich ohne Ausführen nicht auflösen, und ein Test,
 * der dort rät, meldet Fehler, die keine sind.
 */
const quellHtml = await readFile(join(root, "apps/pwa/index.html"), "utf8");
const vorhanden = new Set([...quellHtml.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const fehlend = [];
for (const name of jsDateien) {
  const quelle = await readFile(join(jsDir, name), "utf8");
  for (const treffer of quelle.matchAll(/\$\(\s*"([^"]+)"\s*\)/g)) {
    if (!vorhanden.has(treffer[1])) fehlend.push(`${name}: $("${treffer[1]}")`);
  }
}
if (fehlend.length) {
  console.error(`\nDiese Kennungen gibt es im HTML nicht mehr:\n${[...new Set(fehlend)].join("\n")}\n`);
  process.exit(1);
}
console.log(`${vorhanden.size} Kennungen im HTML, alle angesprochenen gefunden.`);

// GitHub Pages läuft sonst durch Jekyll und wirft Ordner mit Unterstrich weg.
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
