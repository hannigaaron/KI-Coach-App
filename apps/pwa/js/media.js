/**
 * Anhänge für den Chat: Fotos, Videos, PDFs.
 *
 * Was hier passiert und warum:
 *
 * Ein Foto vom iPhone hat 12 Megapixel und 3 bis 5 Megabyte. Das an ein Modell
 * zu schicken ist teuer und bringt nichts: die API rechnet Bilder ohnehin auf
 * etwa 1,15 Megapixel herunter. Deshalb wird jedes Bild vorher auf 1568 Pixel
 * an der langen Kante gebracht und als JPEG mit Qualität 82 kodiert. Aus 4 MB
 * werden so etwa 250 KB, ohne dass ein Teller schlechter erkennbar wird.
 *
 * Videos kann die API nicht lesen. Statt das zu verschweigen, zieht die App ein
 * Einzelbild aus der Mitte des Videos und schickt das. Der Nutzer erfährt, dass
 * nur ein Bild ausgewertet wurde.
 *
 * Vom Original bleibt zusätzlich ein kleines Vorschaubild übrig, 320 Pixel
 * lang. Nur das wandert in den gespeicherten Verlauf. Ganze Bilder im
 * localStorage wären nach wenigen Fotos am Limit von rund fünf Megabyte.
 */

/** Lange Kante für das Bild, das in die Bildauswertung geht. */
const MAX_KANTE = 1568;
/**
 * Lange Kante für das Bild, das im Gespräch mitgeht.
 *
 * Die API rechnet Bilder in Token um, grob Breite mal Höhe geteilt durch 750.
 * Ein Bild mit 1568 Pixeln kostet so rund 2500 Token, eines mit 768 Pixeln
 * rund 590. Im Gespräch entscheidet das Modell nur, was auf dem Bild ist und
 * welches Werkzeug es ruft. Dafür reicht die kleine Fassung. Die Mengen
 * schätzt danach die Bildauswertung, und die bekommt weiter das grosse Bild.
 */
const CHAT_KANTE = 768;
/** Lange Kante für das Vorschaubild im Verlauf. */
const VORSCHAU_KANTE = 320;
const JPEG_QUALITAET = 0.82;
const VORSCHAU_QUALITAET = 0.7;
/** Obergrenze je Datei vor der Verarbeitung. */
const MAX_DATEI_MB = 40;
/** Obergrenze für ein PDF, das ungeprüft weitergereicht wird. */
const MAX_PDF_MB = 8;

export const ERLAUBTE_TYPEN = "image/*,video/*,application/pdf";

/**
 * Macht aus einer Datei einen Anhang, den der Coach lesen kann.
 *
 * Wirft nie. Bei einem Problem kommt ein Anhang mit `fehler` zurück, damit die
 * Oberfläche sagen kann, was schiefging, statt still nichts zu tun.
 */
export async function anhangAusDatei(datei) {
  const basis = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: datei.name || "Anhang",
    groesse: datei.size,
    art: art(datei),
  };
  try {
    if (datei.size > MAX_DATEI_MB * 1024 * 1024) {
      return { ...basis, fehler: `Die Datei ist ${(datei.size / 1048576).toFixed(0)} MB gross. Mehr als ${MAX_DATEI_MB} MB kann ich nicht verarbeiten.` };
    }
    if (basis.art === "bild") return { ...basis, ...(await ausBild(datei)) };
    if (basis.art === "video") return { ...basis, ...(await ausVideo(datei)) };
    if (basis.art === "pdf") return { ...basis, ...(await ausPdf(datei)) };
    return { ...basis, fehler: "Diesen Dateityp kann ich nicht lesen. Fotos, Videos und PDFs gehen." };
  } catch (error) {
    return { ...basis, fehler: `Konnte die Datei nicht lesen: ${error.message}` };
  }
}

function art(datei) {
  const typ = (datei.type || "").toLowerCase();
  if (typ.startsWith("image/")) return "bild";
  if (typ.startsWith("video/")) return "video";
  if (typ === "application/pdf") return "pdf";
  // Manche Browser liefern für HEIC und für Dateien aus der Cloud keinen Typ.
  // Dann entscheidet die Endung.
  const name = (datei.name || "").toLowerCase();
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp)$/.test(name)) return "bild";
  if (/\.(mp4|mov|m4v|webm|avi)$/.test(name)) return "video";
  if (name.endsWith(".pdf")) return "pdf";
  return "unbekannt";
}

async function ausBild(datei) {
  const bild = await ladeBild(URL.createObjectURL(datei));
  try {
    const gross = zeichne(bild, MAX_KANTE);
    const mittel = zeichne(bild, CHAT_KANTE);
    const klein = zeichne(bild, VORSCHAU_KANTE);
    return {
      mediaType: "image/jpeg",
      data: teilNachKomma(gross.toDataURL("image/jpeg", JPEG_QUALITAET)),
      chatData: teilNachKomma(mittel.toDataURL("image/jpeg", JPEG_QUALITAET)),
      vorschau: klein.toDataURL("image/jpeg", VORSCHAU_QUALITAET),
      breite: gross.width,
      hoehe: gross.height,
    };
  } finally {
    URL.revokeObjectURL(bild.src);
  }
}

/**
 * Zieht ein Einzelbild aus der Mitte des Videos.
 *
 * Die Mitte, weil der Anfang oft verwackelt ist und das Ende oft schon
 * woanders hinzeigt. Klappt das Springen nicht, wird das erste Bild genommen.
 */
async function ausVideo(datei) {
  const url = URL.createObjectURL(datei);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    await new Promise((auf, ab) => {
      video.onloadeddata = auf;
      video.onerror = () => ab(new Error("Video nicht lesbar"));
      setTimeout(() => ab(new Error("Video braucht zu lange")), 15000);
    });

    const ziel = Number.isFinite(video.duration) && video.duration > 0 ? video.duration / 2 : 0;
    await new Promise((auf) => {
      let fertig = false;
      const ok = () => { if (!fertig) { fertig = true; auf(); } };
      video.onseeked = ok;
      setTimeout(ok, 3000);
      try { video.currentTime = ziel; } catch { ok(); }
    });

    const gross = zeichne(video, MAX_KANTE, video.videoWidth, video.videoHeight);
    const mittel = zeichne(video, CHAT_KANTE, video.videoWidth, video.videoHeight);
    const klein = zeichne(video, VORSCHAU_KANTE, video.videoWidth, video.videoHeight);
    return {
      mediaType: "image/jpeg",
      data: teilNachKomma(gross.toDataURL("image/jpeg", JPEG_QUALITAET)),
      chatData: teilNachKomma(mittel.toDataURL("image/jpeg", JPEG_QUALITAET)),
      vorschau: klein.toDataURL("image/jpeg", VORSCHAU_QUALITAET),
      breite: gross.width,
      hoehe: gross.height,
      hinweis: "Aus dem Video habe ich ein Einzelbild aus der Mitte genommen. Bewegung kann ich nicht auswerten.",
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function ausPdf(datei) {
  if (datei.size > MAX_PDF_MB * 1024 * 1024) {
    return { fehler: `Das PDF ist ${(datei.size / 1048576).toFixed(1)} MB gross. Mehr als ${MAX_PDF_MB} MB kann ich nicht schicken.` };
  }
  const daten = await new Promise((auf, ab) => {
    const leser = new FileReader();
    leser.onload = () => auf(teilNachKomma(String(leser.result)));
    leser.onerror = () => ab(new Error("PDF nicht lesbar"));
    leser.readAsDataURL(datei);
  });
  return { mediaType: "application/pdf", data: daten, vorschau: null };
}

function ladeBild(url) {
  return new Promise((auf, ab) => {
    const bild = new Image();
    bild.onload = () => auf(bild);
    bild.onerror = () => ab(new Error("Bild nicht lesbar, vielleicht ein Format, das der Browser nicht kennt"));
    bild.src = url;
  });
}

/** Zeichnet die Quelle auf ein Canvas mit begrenzter langer Kante. */
function zeichne(quelle, maxKante, breiteRoh, hoeheRoh) {
  const breite = breiteRoh || quelle.naturalWidth || quelle.width;
  const hoehe = hoeheRoh || quelle.naturalHeight || quelle.height;
  if (!breite || !hoehe) throw new Error("Bild hat keine Grösse");
  const faktor = Math.min(1, maxKante / Math.max(breite, hoehe));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(breite * faktor));
  canvas.height = Math.max(1, Math.round(hoehe * faktor));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(quelle, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Aus einem data URL nur die Nutzdaten holen. */
function teilNachKomma(dataUrl) {
  const komma = dataUrl.indexOf(",");
  return komma === -1 ? dataUrl : dataUrl.slice(komma + 1);
}

/** Grösse einer base64 Zeichenkette in Kilobyte, für die Anzeige. */
export function grossInKb(base64) {
  return Math.round((base64.length * 3) / 4 / 1024);
}
