/**
 * Push Benachrichtigungen im Browser.
 *
 * Der Ablauf hat drei Schritte, und jeder kann einzeln scheitern:
 * die App muss auf dem Home Bildschirm liegen, der Nutzer muss die Erlaubnis
 * geben, und das Abo muss beim Absender ankommen. Diese Datei macht alle drei
 * sichtbar, statt am Ende nur "hat nicht geklappt" zu melden.
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
 * Meldet das Geraet an.
 *
 * Gibt das Abo als Objekt zurueck. Genau dieses Objekt gehoert in das Secret
 * PUSH_ABOS, damit der Cron es erreichen kann.
 */
export async function pushAnmelden(oeffentlicherSchluessel) {
  const lage = pushLage();
  if (!lage.unterstuetzt) {
    throw new Error("Dieser Browser kann kein Web Push.");
  }
  if (lage.apple && !lage.installiert) {
    throw new Error(
      "Auf dem iPhone geht Push nur aus der installierten App. Teilen, Zum Home Bildschirm, dann die App von dort starten.",
    );
  }
  const schluessel = (oeffentlicherSchluessel || "").trim();
  if (!schluessel) throw new Error("Es fehlt der öffentliche VAPID Schlüssel.");

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
  // Ein Abo auf einen alten Schluessel funktioniert nicht mehr, sieht aber
  // gueltig aus. Deshalb wird es verworfen, statt es zurueckzugeben.
  if (vorhanden && !gleicherSchluessel(vorhanden, schluessel)) {
    await vorhanden.unsubscribe();
  } else if (vorhanden) {
    return vorhanden.toJSON();
  }

  const abo = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlZuBytes(schluessel),
  });
  return abo.toJSON();
}

export async function pushAbmelden() {
  const reg = await registrierung();
  const abo = await reg?.pushManager?.getSubscription();
  if (!abo) return false;
  return abo.unsubscribe();
}

/** Das bestehende Abo, oder null. */
export async function pushAbo() {
  if (!("PushManager" in window)) return null;
  const reg = await registrierung();
  const abo = await reg?.pushManager?.getSubscription();
  return abo ? abo.toJSON() : null;
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
