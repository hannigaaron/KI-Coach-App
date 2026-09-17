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
/*
 * Zwei Fassungen aus einer Quelle.
 *
 * Ohne Schalter entsteht die Entwicklerfassung: der Nutzer trägt Schlüssel,
 * Worker und Angebot selbst ein. Mit `--demo` entsteht die Fassung für Nutzer:
 * dieselben Werte stehen fest in der App, die Felder dafür sind weg.
 *
 * Zwei getrennte Verzeichnisse, weil beide gleichzeitig existieren müssen. Ein
 * Build, der den anderen überschreibt, zwingt dazu, vor jedem Ansehen neu zu
 * bauen, und dann sieht man am Ende nur noch eine von beiden an.
 */
const demo = process.argv.includes("--demo");
const outDir = join(root, demo ? "dist-demo" : "dist-pages");

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

/*
 * Die eingebaute Konfiguration.
 *
 * Geschrieben wird erst in der Ausgabe, nie in die Quelle. Ein Build, der die
 * Quelldatei ändert, hinterlässt nach jedem Durchlauf eine Änderung im Baum,
 * und irgendwann committet sie jemand versehentlich mit.
 *
 * Geprüft wird ausserdem, dass nichts Geheimes hineinrutscht. Die Datei landet
 * im Netz, und ein Schlüssel darin wäre öffentlich.
 */
if (demo) {
  const pfad = join(root, "demo.config.json");
  if (!existsSync(pfad)) {
    console.error(`Fehlt: ${pfad}\nDie Fassung für Nutzer braucht ihre Konfiguration.`);
    process.exit(1);
  }
  const konfig = JSON.parse(await readFile(pfad, "utf8"));
  const roh = JSON.stringify(konfig);
  const verdaechtig = [/sk-ant-/, /"anmeldeWort"/i, /"wort"\s*:/i, /BEGIN [A-Z ]*PRIVATE KEY/];
  for (const muster of verdaechtig) {
    if (muster.test(roh)) {
      console.error(`\nIn demo.config.json steht etwas Geheimes (${muster}).\n`
        + "Diese Datei geht in die veröffentlichte App und ist damit öffentlich.\n");
      process.exit(1);
    }
  }
  const ziel = join(outDir, "js/konfig.js");
  const quelle = await readFile(join(root, "apps/pwa/js/konfig.js"), "utf8");
  const kopf = quelle.slice(0, quelle.indexOf("export const KONFIG"));
  await writeFile(ziel,
    `${kopf}export const KONFIG = ${JSON.stringify({ DEMO: true, ...konfig, _: undefined }, null, 2)};\n\n`
    + "/** Kurz und lesbar an den Stellen, die sich danach richten. */\n"
    + "export const istDemo = () => KONFIG.DEMO === true;\n");
  console.log("Konfiguration eingebaut, Fassung für Nutzer.");
}

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

console.log(`${demo ? "dist-demo" : "dist-pages"} gebaut, ${files.length} Dateien.`);
