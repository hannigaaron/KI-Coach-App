import { strict as assert } from "node:assert";
import { test } from "node:test";
import { ean13Module, eanAusBild, eanAusZeile, pruefzifferStimmt } from "./ean.js";

/** Eine Zeile Grauwerte wie aus einer Kamera: unscharf, verrauscht, ungleich hell. */
function zeile(code, { modul = 3, unschaerfe = 1, rauschen = 18, verlauf = 60, rand = 37 } = {}) {
  let zufall = 7;
  const z = () => { zufall = (zufall * 1103515245 + 12345) % 2147483648; return zufall / 2147483648; };
  const roh = [];
  for (let i = 0; i < rand; i++) roh.push(230);
  for (const m of ean13Module(code)) for (let i = 0; i < modul; i++) roh.push(m ? 35 : 230);
  for (let i = 0; i < rand; i++) roh.push(230);
  const n = roh.length;
  return roh.map((_, x) => {
    let s = 0; let k = 0;
    for (let d = -unschaerfe; d <= unschaerfe; d++) { const j = x + d; if (j >= 0 && j < n) { s += roh[j]; k++; } }
    const v = s / k - (verlauf * x) / n + (z() - 0.5) * rauschen;
    return Math.max(0, Math.min(255, v));
  });
}

test("Prüfziffer nach GS1", () => {
  assert.ok(pruefzifferStimmt("4006381333931"));
  assert.ok(!pruefzifferStimmt("4006381333932"));
  assert.ok(pruefzifferStimmt("96385074"));
});

test("Liest echte Codes aus einer unscharfen, verrauschten Zeile", () => {
  for (const code of ["4006381333931", "4260107220015", "0012345678905", "5000112637922"]) {
    assert.equal(eanAusZeile(zeile(code)), code, code);
  }
});

test("Liest auch kopfüber und bei krummer Modulbreite", () => {
  const code = "4006381333931";
  assert.equal(eanAusZeile(zeile(code).reverse()), code);
  // 2,5 Pixel je Modul ergibt sich, wenn die Packung weiter weg ist.
  const fein = zeile(code, { modul: 5 }).filter((_, i) => i % 2 === 0);
  assert.equal(eanAusZeile(fein), code);
});

test("Kein Code, kein Ergebnis", () => {
  const leer = Array.from({ length: 400 }, (_, i) => 128 + 60 * Math.sin(i / 3));
  assert.equal(eanAusZeile(leer), null);
});

test("Ein Bild braucht zwei Zeilen mit demselben Ergebnis", () => {
  const code = "4260107220015";
  const z = zeile(code);
  const width = z.length; const height = 40;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4;
    data[p] = data[p + 1] = data[p + 2] = z[x]; data[p + 3] = 255;
  }
  assert.equal(eanAusBild({ data, width, height }), code);
});
