/**
 * base64url ohne Abhängigkeit und ohne Buffer.
 *
 * Buffer gibt es in Cloudflare Workers nicht. Damit dieselbe
 * Verschlüsselung in Node, im Worker und im Browser läuft, gehen alle Werte
 * als Uint8Array durch und die Umwandlung steht hier an einer Stelle.
 */

/**
 * Ein Byte Feld auf einem eigenen Puffer.
 *
 * Ohne die Angabe steht dort ArrayBufferLike, und das schliesst
 * SharedArrayBuffer mit ein. WebCrypto nimmt den nicht an, deshalb steht der
 * Puffertyp hier fest, statt an jeder Aufrufstelle umgebogen zu werden.
 */
export type Bytes = Uint8Array<ArrayBuffer>;

export function ausB64Url(text: string): Bytes {
  const gefuellt = text.replace(/-/g, "+").replace(/_/g, "/");
  const roh = atob(gefuellt.padEnd(Math.ceil(gefuellt.length / 4) * 4, "="));
  const bytes = new Uint8Array(roh.length);
  for (let i = 0; i < roh.length; i++) bytes[i] = roh.charCodeAt(i);
  return bytes;
}

export function zuB64Url(bytes: Uint8Array): string {
  let roh = "";
  // Stückweise, weil String.fromCharCode mit einem sehr langen Array den
  // Aufrufstapel sprengt. 0x8000 ist die übliche sichere Grösse.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    roh += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(roh).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function textZuB64Url(text: string): string {
  return zuB64Url(new TextEncoder().encode(text));
}

export function verbinde(...teile: Uint8Array[]): Bytes {
  const gesamt = teile.reduce((summe, t) => summe + t.length, 0);
  const aus = new Uint8Array(gesamt);
  let stelle = 0;
  for (const t of teile) {
    aus.set(t, stelle);
    stelle += t.length;
  }
  return aus;
}

/** Vergleicht zwei Byte Folgen. */
export function gleich(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
