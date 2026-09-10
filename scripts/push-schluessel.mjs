#!/usr/bin/env node
/**
 * Erzeugt ein VAPID Schlüsselpaar für den Push Versand.
 *
 * Einmal ausführen, die beiden Werte als Secrets im Repository hinterlegen,
 * den öffentlichen zusätzlich in der App unter Profil eintragen. Wird das
 * Paar später getauscht, verlieren alle bestehenden Abos ihre Gültigkeit und
 * müssen im Browser neu angelegt werden.
 */
import { vapidSchluesselErzeugen } from "../packages/push/dist/index.js";

const s = vapidSchluesselErzeugen();
console.log("VAPID_PUBLIC");
console.log(s.oeffentlich);
console.log("");
console.log("VAPID_PRIVATE");
console.log(s.privat);
console.log("");
console.log("Den öffentlichen Schlüssel brauchst du zweimal: als Secret und in der App unter Profil.");
console.log("Den privaten nur als Secret. Er gehört nicht in den Code und nicht in die App.");
