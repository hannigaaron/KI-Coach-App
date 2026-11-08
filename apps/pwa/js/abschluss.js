/**
 * Der Abschluss eines Trainings: was gemacht wurde, welche Muskeln es
 * getroffen hat, und ein Bild zum Teilen.
 *
 * Kommt direkt nach "Beenden" und lässt sich unter "Deine letzten Trainings"
 * jederzeit wieder öffnen. Gerechnet wird aus dem Protokoll, also aus den
 * abgehakten Sätzen: was nicht abgehakt ist, steht auch hier nicht.
 *
 * Das Bild zum Teilen ist 1080 mal 1920, das Format einer Instagram Story.
 * Gezeichnet auf einer Leinwand und nicht als Screenshot der Seite: ein
 * Screenshot trüge die Leisten des Telefons und die Bedienelemente mit.
 *
 * `abschlussDaten` und `abschlussHtml` fassen weder `document` noch `window`
 * an, die Tests laufen ohne Browser.
 */
import { UEBUNGEN } from "./uebungen-daten.js";
import { KARTE_DUNKEL, KARTE_HELL, muskelkarteSvg, partienListe, saetzeJePartie } from "./muskelkarte.js";
import { vorschauPfad } from "./uebungen.js";

const nachId = new Map(UEBUNGEN.map((u) => [u.id, u]));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const zahl = (x) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(x);

/**
 * Kennzahlen aus Protokolleinträgen eines Trainings. `minuten` ist bekannt,
 * wenn das Training gerade beendet wurde, im Verlauf nur, wenn sie gemerkt
 * ist. Ohne Minuten fehlt die Dauer, statt geraten zu werden.
 */
export function abschlussDaten(eintraege, { titel = "Training", datum, minuten = null } = {}) {
  const liste = (eintraege ?? []).filter((e) => e.saetze?.length);
  const saetze = liste.reduce((s, e) => s + e.saetze.length, 0);
  // Volumen nur aus Sätzen mit Gewicht. Ein Klimmzug mit 0 kg Zusatz hat
  // kein Volumen von null, er hat eines, das die App nicht kennt.
  const volumenKg = Math.round(liste.reduce((s, e) => s + e.saetze.reduce((t, x) => t + (x.kg > 0 ? x.kg * x.wdh : 0), 0), 0));
  const wdh = liste.reduce((s, e) => s + e.saetze.reduce((t, x) => t + (x.wdh || 0), 0), 0);
  const jePartie = saetzeJePartie(liste);
  return {
    titel, datum: datum ?? liste[0]?.datum ?? "", minuten,
    uebungen: liste.map((e) => ({
      id: e.uebung,
      name: nachId.get(e.uebung)?.name ?? e.uebung,
      saetze: e.saetze,
      bestes: e.saetze.reduce((b, x) => (!b || x.kg > b.kg || (x.kg === b.kg && x.wdh > b.wdh) ? x : b), null),
    })),
    saetze, volumenKg, wdh,
    jePartie,
    partien: partienListe(jePartie),
  };
}

export function datumLang(iso) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

function kennzahlen(d) {
  const felder = [
    d.minuten ? [zahl(d.minuten), "Minuten"] : null,
    [zahl(d.uebungen.length), d.uebungen.length === 1 ? "Übung" : "Übungen"],
    [zahl(d.saetze), d.saetze === 1 ? "Satz" : "Sätze"],
    d.volumenKg > 0 ? [zahl(d.volumenKg), "kg bewegt"] : [zahl(d.wdh), "Wdh"],
  ].filter(Boolean);
  return felder;
}

/** Der Inhalt des Blatts. `hell` wählt die Farben der Karte. */
export function abschlussHtml(d, { hell = false } = {}) {
  const felder = kennzahlen(d).map(([w, t], i) => `<div class="ab-zahl" style="--i:${i}"><b data-zaehlen="${esc(w)}">${esc(w)}</b><span>${esc(t)}</span></div>`).join("");
  const max = Math.max(1, ...d.partien.map((p) => p.saetze));
  const partien = d.partien.slice(0, 6).map((p, i) => `<li style="--i:${i}"><span>${esc(p.name)}</span><i style="--anteil:${(p.saetze / max).toFixed(3)}"></i><b>${zahl(p.saetze)}</b></li>`).join("");
  const uebungen = d.uebungen.map((u) => {
    const info = nachId.get(u.id);
    const bild = info ? `<img src="${esc(vorschauPfad(info))}" alt="" loading="lazy" decoding="async">` : "<span></span>";
    const b = u.bestes;
    const best = b ? (b.kg > 0 ? `${zahl(b.kg)} kg × ${b.wdh}` : `${b.wdh} Wdh`) : "";
    return `<li>${bild}<div><b>${esc(u.name)}</b><span>${u.saetze.length} ${u.saetze.length === 1 ? "Satz" : "Sätze"}${best ? ` · bester ${esc(best)}` : ""}</span></div></li>`;
  }).join("");
  return `<div class="ab-kopf">
      <p class="ab-datum">${esc(datumLang(d.datum))}</p>
      <h3 class="ab-titel">${esc(d.titel)}</h3>
    </div>
    <div class="ab-zahlen">${felder}</div>
    <div class="ab-karte">${muskelkarteSvg(d.jePartie, { farben: hell ? KARTE_HELL : KARTE_DUNKEL })}</div>
    ${partien ? `<h4 class="ab-zwischen">Sätze je Muskel</h4><ul class="ab-partien">${partien}</ul><p class="ab-hinweis">Hauptmuskel zählt voll, Hilfsmuskel halb. Je dunkler, desto mehr Sätze, voll ab 8.</p>` : ""}
    <h4 class="ab-zwischen">Übungen</h4>
    <ul class="ab-uebungen">${uebungen}</ul>`;
}

/* ---------- Bild zum Teilen, nur im Browser ---------- */

function bildLaden(src) {
  return new Promise((ok, fehler) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fehler;
    img.src = src;
  });
}

/**
 * Zeichnet die Story als PNG. Schrift ist Satoshi, wenn sie geladen ist,
 * sonst die des Systems. Die Wortmarke kommt als Datei mit Pfaden, nie als
 * neu gesetzter Text.
 */
export async function storyBild(d) {
  const B = 1080, H = 1920;
  const c = document.createElement("canvas");
  c.width = B; c.height = H;
  const g = c.getContext("2d");
  const verlauf = g.createLinearGradient(0, 0, 0, H);
  verlauf.addColorStop(0, "#0b0d10");
  verlauf.addColorStop(0.55, "#0e1620");
  verlauf.addColorStop(1, "#0f2a3a");
  g.fillStyle = verlauf;
  g.fillRect(0, 0, B, H);
  const schein = g.createRadialGradient(B / 2, 980, 40, B / 2, 980, 760);
  schein.addColorStop(0, "rgba(150,216,240,0.16)");
  schein.addColorStop(1, "rgba(150,216,240,0)");
  g.fillStyle = schein;
  g.fillRect(0, 0, B, H);

  const schrift = (gewicht, groesse) => `${gewicht} ${groesse}px Satoshi, system-ui, -apple-system, sans-serif`;
  g.textAlign = "center";
  g.fillStyle = "#8b97a8";
  g.font = schrift(500, 38);
  g.fillText(datumLang(d.datum).toUpperCase(), B / 2, 170);
  g.fillStyle = "#ffffff";
  g.font = schrift(700, 84);
  const titel = d.titel.length > 22 ? `${d.titel.slice(0, 21)}…` : d.titel;
  g.fillText(titel, B / 2, 270);

  // Kennzahlen in einer Reihe.
  const felder = kennzahlen(d);
  const breite = (B - 160) / felder.length;
  felder.forEach(([w, t], i) => {
    const x = 80 + breite * i + breite / 2;
    g.fillStyle = "#96d8f0";
    g.font = schrift(700, 76);
    g.fillText(w, x, 420);
    g.fillStyle = "#8b97a8";
    g.font = schrift(500, 34);
    g.fillText(t, x, 470);
  });

  const svg = muskelkarteSvg(d.jePartie, { farben: { ...KARTE_DUNKEL, grund: "#121820" }, beschriftung: false });
  const karte = await bildLaden(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const kb = 940, kh = kb * (416 / 420);
  g.drawImage(karte, (B - kb) / 2, 560, kb, kh);
  g.fillStyle = "#5f6b7c";
  g.font = schrift(500, 32);
  g.fillText("Vorn", B / 2 - kb / 4 - 10, 560 + kh + 40);
  g.fillText("Hinten", B / 2 + kb / 4 + 10, 560 + kh + 40);

  // Die drei stärksten Partien.
  const top = d.partien.slice(0, 3).map((p) => `${p.name} ${zahl(p.saetze)}`).join("   ·   ");
  if (top) {
    g.fillStyle = "#c9d3df";
    g.font = schrift(500, 36);
    g.fillText(top, B / 2, 560 + kh + 120);
  }

  try {
    const marke = await bildLaden("brand/daevo-wordmark-white.svg");
    const mh = 64, mb = mh * (marke.width / marke.height || 3.2);
    g.drawImage(marke, (B - mb) / 2, H - 170, mb, mh);
  } catch {
    // Ohne Wortmarke bleibt das Bild ohne Absender, gesetzter Text ersetzt sie nicht.
  }
  return new Promise((ok) => c.toBlob(ok, "image/png"));
}

/** Teilt das Bild, sonst lädt es herunter. Ein Abbruch im Teilen ist kein Fehler. */
export async function storyTeilen(d) {
  const blob = await storyBild(d);
  const datei = new File([blob], `daevo-training-${d.datum || "heute"}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [datei] })) {
    try { await navigator.share({ files: [datei], title: d.titel }); return "geteilt"; } catch (e) { if (e?.name === "AbortError") return "abgebrochen"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = datei.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "gespeichert";
}
