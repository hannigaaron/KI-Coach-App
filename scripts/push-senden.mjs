#!/usr/bin/env node
/**
 * Verschickt den Impuls, der in dieser Stunde fällig ist.
 *
 * Läuft in GitHub Actions, stündlich, ohne Server und ohne Datenbank. Der
 * Zeitplan steht in .github/workflows/push.yml, die Texte in
 * packages/core/src/tagesimpulse.ts.
 *
 * Warum stündlich und nicht auf die Minute: GitHub startet einen Cron mit
 * fünf bis dreissig Minuten Verzug, gelegentlich mehr. Ein Lauf zur vollen
 * Stunde deckt deshalb genau die Stunde ab, in der er ankommt. Jeder Impuls
 * geht damit genau einmal raus, egal wie spät der Lauf startet.
 *
 * Nötige Secrets im Repository:
 *   VAPID_PUBLIC    öffentlicher Schlüssel, base64url
 *   VAPID_PRIVATE   privater Schlüssel, base64url
 *   PUSH_ABOS       JSON Liste der Abos aus der App
 *   PUSH_KONTAKT    mailto: Adresse für den Push Dienst
 *
 * Schlüssel erzeugen: node scripts/push-schluessel.mjs
 */
import { faelligerImpuls, impulseFuerTag } from "../packages/core/dist/index.js";
import { sendeWebPush, vapidPruefen } from "../packages/push/dist/index.js";

const ZONE = "Europe/Berlin";

function berlinJetzt() {
  const teile = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const feld = (typ) => teile.find((t) => t.type === typ)?.value ?? "";
  // hourCycle h23 gibt Mitternacht als 24 aus. Ohne das Abfangen sucht der
  // Skript nach einem Impuls um 24 Uhr und findet nie einen.
  const stunde = feld("hour") === "24" ? "00" : feld("hour");
  return {
    tag: `${feld("year")}-${feld("month")}-${feld("day")}`,
    zeit: `${stunde}:${feld("minute")}`,
  };
}

function pflicht(name) {
  const wert = process.env[name];
  if (!wert) {
    console.error(`Das Secret ${name} fehlt. Ohne es kann nichts verschickt werden.`);
    process.exit(1);
  }
  return wert;
}

function aboListe(roh) {
  let daten;
  try {
    daten = JSON.parse(roh);
  } catch {
    console.error("PUSH_ABOS ist kein gültiges JSON. Erwartet wird eine Liste von Abos aus der App.");
    process.exit(1);
  }
  const liste = Array.isArray(daten) ? daten : [daten];
  const gueltig = liste.filter((a) => a?.endpoint && a?.keys?.p256dh && a?.keys?.auth);
  if (gueltig.length !== liste.length) {
    console.error(`${liste.length - gueltig.length} Einträge in PUSH_ABOS haben nicht die erwartete Form.`);
  }
  if (gueltig.length === 0) {
    console.error("Kein brauchbares Abo in PUSH_ABOS.");
    process.exit(1);
  }
  return gueltig;
}

const schluessel = { oeffentlich: pflicht("VAPID_PUBLIC"), privat: pflicht("VAPID_PRIVATE") };
try {
  vapidPruefen(schluessel);
} catch (fehler) {
  console.error(fehler.message);
  process.exit(1);
}

const abos = aboListe(pflicht("PUSH_ABOS"));
const kontakt = process.env.PUSH_KONTAKT || "mailto:hannigaaron@gmail.com";
const { tag, zeit } = berlinJetzt();

// PUSH_ART setzt die Stunde ausser Kraft. Damit lässt sich jede Nachricht von
// Hand auslösen, ohne bis zu ihrer Uhrzeit zu warten. "auto" ist die Vorgabe
// im Formular von GitHub und bedeutet dasselbe wie ein leeres Feld.
const gewaehlt = process.env.PUSH_ART?.trim();
const erzwungen = gewaehlt && gewaehlt !== "auto" ? gewaehlt : "";
const alle = impulseFuerTag(tag);
const impuls = erzwungen ? alle.find((i) => i.art === erzwungen) : faelligerImpuls(tag, zeit);

if (erzwungen && !impuls) {
  console.error(`Unbekannte Art: ${erzwungen}. Möglich sind ${alle.map((i) => i.art).join(", ")}.`);
  process.exit(1);
}
if (!impuls) {
  console.log(`${tag} ${zeit} Berlin: in dieser Stunde steht nichts an.`);
  process.exit(0);
}

console.log(`${tag} ${zeit} Berlin: ${impuls.art}, geplant für ${impuls.at}, an ${abos.length} ${abos.length === 1 ? "Abo" : "Abos"}.`);

const inhalt = {
  titel: impuls.titel,
  text: impuls.text,
  // Die Marke ist die Art, nicht die Uhrzeit. Startet der Cron doppelt,
  // ersetzt die zweite Nachricht die erste, statt sich darunter zu stapeln.
  marke: `impuls-${impuls.art}`,
  ziel: impuls.frage ? `./?impuls=${impuls.art}` : "./",
  daten: { art: impuls.art, frage: impuls.frage, at: impuls.at },
};

let zugestellt = 0;
for (const abo of abos) {
  const ergebnis = await sendeWebPush({ abo, inhalt, schluessel, kontakt });
  const kurz = `${abo.endpoint.slice(0, 48)}...`;
  if (ergebnis.ok) {
    zugestellt++;
    console.log(`ok   ${ergebnis.status} ${kurz}`);
  } else if (ergebnis.abgelaufen) {
    console.log(`weg  ${ergebnis.status} ${kurz} Das Abo gilt nicht mehr. Nimm es aus PUSH_ABOS raus.`);
  } else {
    console.log(`fehl ${ergebnis.status} ${kurz} ${ergebnis.fehler ?? ""}`);
  }
}

console.log(`${zugestellt} von ${abos.length} zugestellt.`);
