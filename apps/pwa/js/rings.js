/**
 * Ringe.
 *
 * Ein Ring beantwortet eine Frage in einem Blick: wie viel vom Ziel ist voll.
 * Deshalb SVG und nicht Canvas. Es sind ein paar Dutzend Kreise, kein Feld aus
 * tausenden Partikeln wie beim Orb, und SVG skaliert ohne Zutun auf jede
 * Pixeldichte und lässt sich per CSS einfärben.
 *
 * Zwei Darstellungen, beide aus denselben Zahlen:
 *
 * Der Stapel legt fünf Ringe ineinander, wie bei Apple Fitness. Er zeigt auf
 * einen Blick, ob ein Leben rund läuft, ohne dass man Zahlen liest.
 *
 * Die Kacheln zeigen je Bereich einen eigenen Ring mit Zahl darunter. Der
 * Stapel sagt, dass etwas fehlt. Die Kachel sagt, was.
 *
 * Ueber 100 Prozent wird der Ring voll gezeichnet, die Zahl bleibt aber
 * ehrlich. Wer 200 Prozent seiner Arbeitszeit macht, soll das lesen können.
 */

export const BEREICH_FARBE = {
  karriere: "#1E7FA8",
  fitness: "#E4572E",
  wellbeing: "#2FBF71",
  me_time: "#A06CD5",
  beziehung: "#F2B035",
};

/** Farbe für den Tagesring. Kommt aus der Marke. */
const TAG_FARBE = "#1E7FA8";

const NS = "http://www.w3.org/2000/svg";

function el(name, attrs = {}) {
  const node = document.createElementNS(NS, name);
  for (const [key, wert] of Object.entries(attrs)) node.setAttribute(key, String(wert));
  return node;
}

/**
 * Ein einzelner Ring.
 *
 * `anteil` ist 0 bis beliebig. Gezeichnet wird höchstens ein voller Kreis.
 * Der Ring beginnt oben und läuft im Uhrzeigersinn, wie das d im Logo.
 */
function ring(gruppe, { radius, breite, anteil, farbe, mitte }) {
  const umfang = 2 * Math.PI * radius;
  const voll = Math.min(1, Math.max(0, anteil));

  gruppe.appendChild(el("circle", {
    cx: mitte, cy: mitte, r: radius,
    fill: "none", stroke: farbe, "stroke-opacity": 0.18, "stroke-width": breite,
  }));

  if (voll <= 0) return;

  const bogen = el("circle", {
    cx: mitte, cy: mitte, r: radius,
    fill: "none", stroke: farbe, "stroke-width": breite, "stroke-linecap": "round",
    "stroke-dasharray": `${umfang * voll} ${umfang}`,
    transform: `rotate(-90 ${mitte} ${mitte})`,
  });
  gruppe.appendChild(bogen);
}

/**
 * Fünf Ringe ineinander.
 *
 * Der äusserste ist Karriere, weil er im Alltag am meisten Platz einnimmt und
 * damit auch optisch aussen steht. Nach innen folgen die Bereiche in der
 * Reihenfolge, in der sie im Board stehen.
 */
export function ringStapel(bereiche, { groesse = 190 } = {}) {
  const svg = el("svg", {
    viewBox: `0 0 ${groesse} ${groesse}`, width: groesse, height: groesse,
    role: "img", "aria-label": "Balance der letzten Tage",
  });
  const mitte = groesse / 2;
  const breite = Math.max(7, Math.round(groesse / 22));
  const abstand = breite + 4;

  bereiche.forEach((stand, i) => {
    const radius = mitte - breite / 2 - 2 - i * abstand;
    if (radius < breite) return;
    ring(svg, {
      radius, breite, anteil: stand.anteil,
      farbe: BEREICH_FARBE[stand.bereich] || TAG_FARBE, mitte,
    });
  });

  return svg;
}

/** Ein Ring mit Zahl in der Mitte. Für den Tageswert und für die Kacheln. */
export function ringMitZahl({ anteil, zahl, unten = "", farbe = TAG_FARBE, groesse = 108 }) {
  const svg = el("svg", {
    viewBox: `0 0 ${groesse} ${groesse}`, width: groesse, height: groesse,
    role: "img", "aria-label": `${zahl} ${unten}`.trim(),
  });
  const mitte = groesse / 2;
  const breite = Math.max(6, Math.round(groesse / 12));
  ring(svg, { radius: mitte - breite / 2 - 2, breite, anteil, farbe, mitte });

  const text = el("text", {
    x: mitte, y: unten ? mitte - 1 : mitte + 1,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 4), "font-weight": 700, fill: "currentColor",
  });
  text.textContent = String(zahl);
  svg.appendChild(text);

  if (unten) {
    const klein = el("text", {
      x: mitte, y: mitte + Math.round(groesse / 6),
      "text-anchor": "middle", "dominant-baseline": "middle",
      "font-size": Math.round(groesse / 9), fill: "currentColor", "fill-opacity": 0.6,
    });
    klein.textContent = unten;
    svg.appendChild(klein);
  }

  return svg;
}

/** Stunden und Minuten kurz, für die Beschriftung unter einer Kachel. */
export function kurzDauer(minuten) {
  if (minuten <= 0) return "0";
  const h = Math.floor(minuten / 60);
  const m = Math.round(minuten % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h}:${String(m).padStart(2, "0")} h`;
}


/**
 * Der grosse Wertungsring.
 *
 * Aufbau von aussen nach innen: ein Ring, in der Mitte ein Etikett in einer
 * Pille, darunter die Zahl gross, darunter das Urteil in Worten. Die Zahl
 * allein sagt niemandem etwas, das Wort allein ist zu ungenau. Zusammen
 * versteht man es in einer halben Sekunde.
 *
 * Der Ring läuft zweifarbig, damit man den Fortschritt auch dann sieht, wenn
 * er fast voll ist: der vordere Teil in der Markenfarbe, der Rest gedämpft.
 */
export function wertungsRing({ wert, etikett, urteil, groesse = 230, farbe = TAG_FARBE }) {
  const svg = el("svg", {
    viewBox: `0 0 ${groesse} ${groesse}`, width: groesse, height: groesse,
    role: "img", "aria-label": `${etikett} ${wert} von 100, ${urteil}`,
  });
  const mitte = groesse / 2;
  const breite = Math.max(5, Math.round(groesse / 40));

  ring(svg, { radius: mitte - breite / 2 - 3, breite, anteil: Math.max(0, Math.min(1, wert / 100)), farbe, mitte });

  const pille = el("rect", {
    x: mitte - groesse * 0.2, y: mitte - groesse * 0.26,
    width: groesse * 0.4, height: groesse * 0.115, rx: groesse * 0.058,
    fill: "none", stroke: "currentColor", "stroke-opacity": 0.28, "stroke-width": 1,
  });
  svg.appendChild(pille);

  const label = el("text", {
    x: mitte, y: mitte - groesse * 0.202,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 22), "font-weight": 600,
    "letter-spacing": Math.round(groesse / 190) + 1,
    fill: "currentColor", "fill-opacity": 0.66,
  });
  label.textContent = etikett;
  svg.appendChild(label);

  const zahl = el("text", {
    x: mitte, y: mitte + groesse * 0.03,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 2.6), "font-weight": 300, fill: "currentColor",
  });
  zahl.textContent = String(wert);
  svg.appendChild(zahl);

  const wort = el("text", {
    x: mitte, y: mitte + groesse * 0.2,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 14), fill: "currentColor", "fill-opacity": 0.62,
  });
  wort.textContent = urteil;
  svg.appendChild(wort);

  return svg;
}

/**
 * Eine Kennzahl mit Ring, Wert und Richtung.
 *
 * Der Pfeil vergleicht mit gestern. Ohne Vergleich ist eine Zahl nur eine
 * Zahl: 58 sagt nichts, 58 und fallend sagt etwas.
 */
export function metrikRing({ name, wert, richtung = "gleich", farbe = TAG_FARBE }) {
  const wrap = document.createElement("div");
  wrap.className = "metrik";

  const kopf = document.createElement("div");
  kopf.className = "metrik-name";
  kopf.textContent = name;

  const zeile = document.createElement("div");
  zeile.className = "metrik-zeile";
  zeile.appendChild(ringMitZahl({ anteil: wert / 100, zahl: "", groesse: 22, farbe }));

  const zahl = document.createElement("span");
  zahl.className = "metrik-wert";
  zahl.textContent = String(wert);

  const pfeil = document.createElement("span");
  pfeil.className = `metrik-pfeil ${richtung}`;
  pfeil.setAttribute("aria-hidden", "true");

  zeile.appendChild(zahl);
  zeile.appendChild(pfeil);
  wrap.appendChild(kopf);
  wrap.appendChild(zeile);
  return wrap;
}

/** Richtung aus zwei Werten. Unter fünf Punkten Unterschied ist es dasselbe. */
export function richtungVon(heute, gestern) {
  if (!Number.isFinite(gestern)) return "gleich";
  const d = heute - gestern;
  if (d >= 5) return "hoch";
  if (d <= -5) return "runter";
  return "gleich";
}
