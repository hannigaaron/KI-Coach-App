#!/usr/bin/env node
/**
 * Erzeugt ein VAPID Schlüsselpaar für den Push Versand.
 *
 * Einmal ausführen, beide Werte als Geheimnis im Worker hinterlegen:
 *   npx wrangler secret put VAPID_PUBLIC
 *   npx wrangler secret put VAPID_PRIVATE
 *
 * Der öffentliche Schlüssel muss nirgends von Hand in die App. Sie holt ihn
 * beim Anmelden über /schluessel vom Worker.
 *
 * Wird das Paar später getauscht, verlieren alle bestehenden Abos ihre
 * Gültigkeit und müssen im Browser neu angelegt werden.
 */
import { vapidSchluesselErzeugen } from "../packages/push/dist/index.js";

const s = await vapidSchluesselErzeugen();
console.log("VAPID_PUBLIC");
console.log(s.oeffentlich);
console.log("");
console.log("VAPID_PRIVATE");
console.log(s.privat);
console.log("");
console.log("Beide gehören als Geheimnis in den Worker, nicht in den Code und nicht in die App.");
