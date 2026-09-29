/**
 * Ein ZIP so weit lesen, wie es für den Health Export reicht.
 *
 * Eine Bibliothek dafür wäre die erste Laufzeitabhängigkeit der App und je
 * nach Paket zwischen 20 und 100 Kilobyte. Gebraucht wird davon genau eines:
 * eine einzelne Datei aus dem Archiv holen. Das Format dafür ist seit 1989
 * unverändert, und der Browser bringt das Entpacken selbst mit,
 * `DecompressionStream("deflate-raw")`.
 *
 * Nichts wird komplett in den Speicher gelesen. Ein `export.xml` von jemandem,
 * der seit Jahren eine Uhr trägt, hat mehrere hundert Megabyte. Gelesen wird
 * über `Blob.slice`, entpackt wird als Strom, und der Aufrufer bekommt Stück
 * für Stück Text.
 *
 * Diese Datei fasst weder `document` noch `window` an und läuft deshalb auch
 * im Test ohne Browser.
 */

const EOCD_SIGNATUR = 0x06054b50;
const ZENTRAL_SIGNATUR = 0x02014b50;
const LOKAL_SIGNATUR = 0x04034b50;

/** Das Ende eines ZIP darf bis zu 64 KiB Kommentar tragen. */
const EOCD_SUCHFENSTER = 66000;

/**
 * Sucht eine Datei im Archiv und gibt ihren Text als Strom.
 *
 * `passt` bekommt den Namen im Archiv und entscheidet. Ein fester Name wäre zu
 * starr: Apple packt alles unter `apple_health_export/`, und ob der Ordner
 * eines Tages anders heisst, weiss niemand.
 */
export async function zipDateiText(datei, passt) {
  const eintrag = await eintragSuchen(datei, passt);
  if (!eintrag) throw new Error("In diesem Archiv ist die gesuchte Datei nicht drin.");

  const daten = await datenBlob(datei, eintrag);
  if (eintrag.methode === 0) return daten.stream().pipeThrough(new TextDecoderStream());
  if (eintrag.methode !== 8) {
    throw new Error(`Dieses Archiv benutzt Verfahren ${eintrag.methode}, das kann der Browser nicht entpacken.`);
  }
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Dieser Browser kann keine ZIP Dateien entpacken. Entpack sie und wähl die XML Datei direkt.");
  }
  return daten
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"))
    .pipeThrough(new TextDecoderStream());
}

/** Die Namen im Archiv, für eine Fehlermeldung, die weiterhilft. */
export async function zipNamen(datei) {
  const namen = [];
  await jederEintrag(datei, (e) => { namen.push(e.name); });
  return namen;
}

async function eintragSuchen(datei, passt) {
  let treffer = null;
  await jederEintrag(datei, (e) => {
    if (!treffer && passt(e.name)) treffer = e;
  });
  return treffer;
}

/**
 * Läuft das zentrale Verzeichnis ab.
 *
 * Das steht am Ende der Datei und trägt jeden Eintrag mit Namen, Verfahren und
 * der Stelle, an der seine Daten liegen. Über die Einträge von vorn zu laufen
 * ginge auch und hiesse, die ganze Datei zu lesen.
 */
async function jederEintrag(datei, fuerJeden) {
  const schwanz = new DataView(
    await datei.slice(Math.max(0, datei.size - EOCD_SUCHFENSTER)).arrayBuffer(),
  );
  const versatz = datei.size - schwanz.byteLength;

  let eocd = -1;
  for (let i = schwanz.byteLength - 22; i >= 0; i--) {
    if (schwanz.getUint32(i, true) === EOCD_SIGNATUR) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Das ist keine ZIP Datei.");

  const anzahl = schwanz.getUint16(eocd + 10, true);
  const zentralGroesse = schwanz.getUint32(eocd + 12, true);
  const zentralStart = schwanz.getUint32(eocd + 16, true);
  if (zentralStart === 0xffffffff || anzahl === 0xffff) {
    throw new Error("Dieses Archiv ist im ZIP64 Format. Entpack es und wähl die XML Datei direkt.");
  }

  // Das Verzeichnis ist klein, auch bei grossen Archiven: je Eintrag rund
  // hundert Byte. Das darf am Stück gelesen werden.
  const zentral = new DataView(
    await datei.slice(zentralStart, zentralStart + zentralGroesse).arrayBuffer(),
  );
  const namen = new TextDecoder();

  let p = 0;
  for (let i = 0; i < anzahl && p + 46 <= zentral.byteLength; i++) {
    if (zentral.getUint32(p, true) !== ZENTRAL_SIGNATUR) break;
    const nameLaenge = zentral.getUint16(p + 28, true);
    const extraLaenge = zentral.getUint16(p + 30, true);
    const kommentarLaenge = zentral.getUint16(p + 32, true);
    const name = namen.decode(
      new Uint8Array(zentral.buffer, zentral.byteOffset + p + 46, nameLaenge),
    );
    fuerJeden({
      name,
      methode: zentral.getUint16(p + 10, true),
      gepackt: zentral.getUint32(p + 20, true),
      lokal: zentral.getUint32(p + 42, true),
    });
    p += 46 + nameLaenge + extraLaenge + kommentarLaenge;
  }
  // `versatz` bleibt ungenutzt, solange kein ZIP64 dabei ist. Er steht hier,
  // damit klar ist, dass die Stellen im Schwanz relativ sind.
  void versatz;
}

/**
 * Wo die Daten eines Eintrags wirklich anfangen.
 *
 * Der lokale Kopf wiederholt Name und Extrafeld, und seine Längen können von
 * denen im Verzeichnis abweichen. Wer die Längen aus dem Verzeichnis nimmt,
 * liest bei manchen Archiven ein paar Byte daneben, und das Entpacken bricht
 * mit einer Meldung ab, die nichts erklärt.
 */
async function datenBlob(datei, eintrag) {
  const kopf = new DataView(await datei.slice(eintrag.lokal, eintrag.lokal + 30).arrayBuffer());
  if (kopf.getUint32(0, true) !== LOKAL_SIGNATUR) throw new Error("Der Eintrag im Archiv ist beschädigt.");
  const start = eintrag.lokal + 30 + kopf.getUint16(26, true) + kopf.getUint16(28, true);
  return datei.slice(start, start + eintrag.gepackt);
}
