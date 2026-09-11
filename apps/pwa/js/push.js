/**
 * Push Benachrichtigungen im Browser.
 *
 * Der Ablauf hat drei Schritte, und jeder kann einzeln scheitern:
 * die App muss auf dem Home Bildschirm liegen, der Nutzer muss die Erlaubnis
 * geben, und das Abo muss beim Absender ankommen. Diese Datei macht alle drei
 * sichtbar, statt am Ende nur "hat nicht geklappt" zu melden.
 *
 * Der Absender ist ein Cloudflare Worker, siehe workers/push. Die App holt
 * sich von dort den öffentlichen Schlüssel und schickt ihr Abo hin. Nichts
 * davon muss der Nutzer abtippen.
 *
 * Wichtig fuer iPhone: Web Push gibt es ab iOS 16.4 und nur, wenn die App
 * ueber Teilen, Zum Home Bildschirm installiert ist. In Safari selbst gibt es
 * kein Push. Quelle: WebKit, Web Push for Web Apps on iOS and iPadOS,
 * 16. Februar 2023.
 */

/** Der Zustand, den die Oberflaeche anzeigt. */
export function pushLage() {
  const unterstuetzt = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // display-mode standalone heisst: von einem Symbol gestartet, nicht im
  // Browsertab. Nur so laesst iOS Push zu.
  const installiert =
    window.matchMedia?.("(display-mode: standalone)").matches === true || window.navigator.standalone === true;
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return {
    unterstuetzt,
    installiert,
    apple,
    erlaubnis: unterstuetzt ? Notification.permission : "unsupported",
  };
}

/**
 * Meldet das Geraet beim Worker an.
 *
 * Die Reihenfolge ist Absicht. Erst der Schluessel vom Worker, dann die
 * Erlaubnis, dann das Abo. Wer zuerst nach der Erlaubnis fragt und danach an
 * einer falschen Adresse scheitert, hat den Nutzer um eine Zusage gebeten,
 * die zu nichts fuehrt, und iOS fragt kein zweites Mal.
 */
export async function pushAnmelden({ worker, wort = "" }) {
  const lage = pushLage();
  if (!lage.unterstuetzt) throw new Error("Dieser Browser kann kein Web Push.");
  if (lage.apple && !lage.installiert) {
    throw new Error(
      "Auf dem iPhone geht Push nur aus der installierten App. Teilen, Zum Home Bildschirm, dann die App von dort starten.",
    );
  }

  const basis = adresse(worker);
  const { oeffentlich } = await hole(`${basis}/schluessel`, { wort });
  if (!oeffentlich) throw new Error("Der Worker hat keinen öffentlichen Schlüssel geliefert.");

  const erlaubnis = await Notification.requestPermission();
  if (erlaubnis !== "granted") {
    throw new Error(
      erlaubnis === "denied"
        ? "Du hast Benachrichtigungen abgelehnt. Das lässt sich nur in den Einstellungen des Geräts zurücknehmen."
        : "Ohne Erlaubnis kann daevo dich nicht erreichen.",
    );
  }

  const reg = await navigator.serviceWorker.ready;
  const vorhanden = await reg.pushManager.getSubscription();
  let abo = vorhanden;
  // Ein Abo auf einen alten Schluessel funktioniert nicht mehr, sieht aber
  // gueltig aus. Deshalb wird es verworfen, statt es weiter zu benutzen.
  if (vorhanden && !gleicherSchluessel(vorhanden, oeffentlich)) {
    await vorhanden.unsubscribe();
    abo = null;
  }
  if (!abo) {
    abo = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlZuBytes(oeffentlich),
    });
  }

  const antwort = await hole(`${basis}/abo`, { wort, methode: "POST", koerper: abo.toJSON() });
  return { abo: abo.toJSON(), neu: Boolean(antwort.neu) };
}

/** Meldet das Geraet beim Worker ab und kuendigt das Abo im Browser. */
export async function pushAbmelden({ worker, wort = "" }) {
  const abo = await bestehendesAbo();
  if (!abo) return false;
  if (worker) {
    // Der Worker soll das Abo auch dann los sein, wenn das Kuendigen im
    // Browser scheitert. Sonst schickt er weiter an eine tote Adresse.
    await hole(`${adresse(worker)}/abo`, { wort, methode: "DELETE", koerper: { endpoint: abo.endpoint } }).catch(
      () => {},
    );
  }
  const objekt = await bestehendesAboObjekt();
  return objekt ? objekt.unsubscribe() : false;
}

/** Schickt eine Nachricht sofort, zum Pruefen der Einrichtung. */
export async function pushProbe({ worker, wort, art = "trinken" }) {
  return hole(`${adresse(worker)}/probe`, { wort, methode: "POST", koerper: { art } });
}

/** Was der Worker ueber sich sagt: Anzahl Geraete, seine Uhrzeit, der Plan. */
export async function pushStand({ worker, wort = "" }) {
  return hole(`${adresse(worker)}/stand`, { wort });
}

/** Das bestehende Abo als einfaches Objekt, oder null. */
export async function pushAbo() {
  const objekt = await bestehendesAboObjekt();
  return objekt ? objekt.toJSON() : null;
}

async function bestehendesAbo() {
  const objekt = await bestehendesAboObjekt();
  return objekt ? objekt.toJSON() : null;
}

async function bestehendesAboObjekt() {
  if (!("PushManager" in window)) return null;
  const reg = await registrierung();
  return (await reg?.pushManager?.getSubscription()) ?? null;
}

/**
 * Die Registrierung, oder null.
 *
 * Bewusst getRegistration statt ready. ready wartet, bis ein Worker aktiv ist,
 * und wartet ohne Worker fuer immer. Die Oberflaeche haengt dann still, statt
 * "noch nicht angemeldet" anzuzeigen.
 */
async function registrierung() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Die Adresse des Workers, ohne Schraegstrich am Ende. */
function adresse(roh) {
  // Alle Leerzeichen raus, auch die in der Mitte.
  //
  // iOS setzt beim Einfuegen einer Adresse gern ein Leerzeichen hinter den
  // Doppelpunkt, und aus "https://..." wird "https: //...". Das sieht im Feld
  // fast richtig aus, ist aber keine gueltige Adresse mehr. Dazu die
  // unsichtbaren Zeichen, die beim Kopieren aus einer Nachricht mitkommen.
  const text = (roh || "")
    .replace(/[\s\u00a0\u200b-\u200d\ufeff]/g, "")
    // Typografische Anfuehrungszeichen aus der Autokorrektur.
    .replace(/^["'\u201c\u201d\u2018\u2019]+|["'\u201c\u201d\u2018\u2019]+$/g, "");
  if (!text) throw new Error("Es fehlt die Adresse des Push Workers.");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`So kann ich die Adresse nicht lesen: ${text}. Sie muss mit https:// beginnen.`);
  }
  // http nur auf dem eigenen Rechner. Dort laeuft wrangler dev, und dafuer
  // gibt es kein Zertifikat. Alles andere ueber http waere eine Adresse, die
  // jeder im selben Netz mitlesen kann.
  const lokal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && lokal)) {
    throw new Error("Die Adresse des Push Workers muss mit https beginnen.");
  }
  return url.origin;
}

async function hole(url, { wort = "", methode = "GET", koerper = null } = {}) {
  const kopf = {};
  if (wort) kopf["x-daevo-wort"] = wort;
  if (koerper) kopf["content-type"] = "application/json";

  let antwort;
  try {
    antwort = await fetch(url, { method: methode, headers: kopf, body: koerper ? JSON.stringify(koerper) : null });
  } catch {
    // Ein Netzfehler sieht hier genauso aus wie eine falsche Adresse. Beides
    // ist fuer den Nutzer dasselbe: der Worker ist nicht erreichbar.
    throw new Error("Der Push Worker ist nicht erreichbar. Adresse prüfen.");
  }

  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw new Error(daten.fehler || `Der Worker antwortet mit ${antwort.status}.`);
  return daten;
}

function gleicherSchluessel(abo, schluessel) {
  const key = abo.options?.applicationServerKey;
  if (!key) return false;
  return bytesZuBase64Url(new Uint8Array(key)) === schluessel;
}

/**
 * base64url in Bytes.
 *
 * applicationServerKey nimmt keinen Text an, sondern nur den rohen Punkt.
 * atob kennt kein base64url, deshalb werden die beiden Zeichen vorher
 * zurueckgetauscht und die Auffuellung ergaenzt.
 */
function base64UrlZuBytes(text) {
  const roh = atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "="));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

function bytesZuBase64Url(bytes) {
  let roh = "";
  for (const b of bytes) roh += String.fromCharCode(b);
  return btoa(roh).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
