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

/**
 * Die Farbe eines Bereichs, aus dem Stylesheet.
 *
 * Vorher standen die fünf Werte hier als feste Zeichenketten. Zwei Probleme
 * hatte das. Erstens waren sie in beiden Farbmodi gleich: ein Ton, der auf
 * Schwarz stimmt, stimmt auf Weiss nicht. Zweitens standen sie neben den
 * Tokens statt in ihnen, und damit ausserhalb des Systems, das für alles
 * andere in der App gilt.
 *
 * Gelesen wird bei jedem Zeichnen, nicht einmal beim Laden. Der Nutzer kann
 * das Aussehen im Profil umschalten, und ein einmal gelesener Wert bliebe
 * danach der alte.
 */
export function bereichFarbe(bereich) {
  const wert = getComputedStyle(document.documentElement)
    .getPropertyValue(`--bereich-${bereich}`).trim();
  // Der Rückfall greift, wenn jemand einen Bereich zeichnet, den es im
  // Stylesheet nicht gibt. Eine leere Farbe macht den Ring unsichtbar, und
  // ein unsichtbarer Ring sieht aus wie ein Wert von null.
  return wert || "currentColor";
}

/** Nur für Code, der die ganze Tabelle braucht. */
export const BEREICHE = ["karriere", "fitness", "wellbeing", "me_time", "beziehung"];

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
 * Ein Ring, aufgeteilt auf die fünf Bereiche.
 *
 * Anders als der Stapel zeigt er nicht, wie voll jedes Ziel ist, sondern wie
 * der Tag aufgeteilt war. Die Segmente laufen hintereinander und ergeben
 * zusammen mit dem Rest genau einen vollen Kreis. Das ist die Frage, die man
 * sich morgens stellt: wo ist der Tag hingegangen.
 *
 * Der Rest bleibt gedämpft und ohne Farbe. Nicht verplante Zeit ist kein
 * Bereich, und sie als sechste Farbe zu zeichnen würde sie zu einem machen.
 */
export function anteilsRing(bereiche, { groesse = 200, restAnteil = 0 } = {}) {
  const svg = el("svg", {
    viewBox: `0 0 ${groesse} ${groesse}`, width: groesse, height: groesse,
    role: "img", "aria-label": "Aufteilung der Zeit",
  });
  const mitte = groesse / 2;
  const breite = Math.max(9, Math.round(groesse / 14));
  const radius = mitte - breite / 2 - 2;
  const umfang = 2 * Math.PI * radius;

  svg.appendChild(el("circle", {
    cx: mitte, cy: mitte, r: radius,
    fill: "none", stroke: "currentColor", "stroke-opacity": 0.12, "stroke-width": breite,
  }));

  // Von hinten nach vorn zeichnen: jedes Segment beginnt am Anfang und wird
  // vom nächsten überdeckt. Das spart die Rechnerei mit Versatz und Lücken.
  const teile = bereiche
    .map((stand) => ({ stand, anteil: Math.max(0, stand.anteilAmTag) }))
    .filter((t) => t.anteil > 0.002);

  let summe = teile.reduce((s, t) => s + t.anteil, 0);
  for (let i = teile.length - 1; i >= 0; i--) {
    const bis = summe;
    summe -= teile[i].anteil;
    svg.appendChild(el("circle", {
      cx: mitte, cy: mitte, r: radius,
      fill: "none", stroke: bereichFarbe(teile[i].stand.bereich) || TAG_FARBE,
      "stroke-width": breite, "stroke-linecap": "butt",
      "stroke-dasharray": `${umfang * Math.min(1, bis)} ${umfang}`,
      transform: `rotate(-90 ${mitte} ${mitte})`,
    }));
  }

  const mitteText = el("text", {
    x: mitte, y: mitte - 6,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 5.5), "font-weight": 300, fill: "currentColor",
  });
  mitteText.textContent = `${Math.round((1 - restAnteil) * 100)}%`;
  svg.appendChild(mitteText);

  const unten = el("text", {
    x: mitte, y: mitte + Math.round(groesse / 9),
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 16), fill: "currentColor", "fill-opacity": 0.6,
  });
  unten.textContent = "der Zeit verplant";
  svg.appendChild(unten);

  return svg;
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
      farbe: bereichFarbe(stand.bereich) || TAG_FARBE, mitte,
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
    "font-size": Math.round(groesse / 3.7), "font-weight": 500,
    "letter-spacing": -groesse / 130, fill: "currentColor",
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
  // Vorher stand hier "8:12 h" neben "43 min" in derselben Spalte. Eine
  // Uhrzeitschreibweise für eine Dauer zwingt den Leser ausserdem, jede Zeile
  // einzeln zu deuten: 8:12 sieht aus wie zwölf nach acht.
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
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

  // Das Etikett steht ohne Rahmen. Eine Umrandung um zwei Wörter mitten in
  // einem Ring ist ein Kasten in einem Kreis: sie trennt nichts und zieht
  // Aufmerksamkeit von der Zahl weg, um die es geht. Versalien mit weiter
  // Laufweite tragen sich allein.
  const label = el("text", {
    x: mitte, y: mitte - groesse * 0.205,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 23), "font-weight": 620,
    "letter-spacing": groesse / 130,
    fill: "currentColor", "fill-opacity": 0.5,
  });
  label.textContent = etikett;
  svg.appendChild(label);

  const zahl = el("text", {
    x: mitte, y: mitte + groesse * 0.03,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 2.5), "font-weight": 250,
    "letter-spacing": -groesse / 90, fill: "currentColor",
  });
  zahl.textContent = String(wert);
  svg.appendChild(zahl);

  const wort = el("text", {
    x: mitte, y: mitte + groesse * 0.2,
    "text-anchor": "middle", "dominant-baseline": "middle",
    "font-size": Math.round(groesse / 15), "font-weight": 520,
    fill: "currentColor", "fill-opacity": 0.55,
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

/**
 * Das Netz aus Soll und Ist.
 *
 * Fünf Achsen, eine je Lebensbereich, jede von null bis 160 Prozent des
 * eigenen Wochenziels. Die gestrichelte Fläche ist das Ziel und damit immer
 * ein regelmässiges Fünfeck, die gefüllte der gemessene Stand.
 *
 * Auf Prozent des Ziels und nicht auf Stunden, weil die Bereiche sonst nicht
 * auf eine Achse passen: vierzig Stunden Arbeit gegen sieben Stunden Me Time
 * drücken alles ausser Karriere an den Mittelpunkt. Die Stunden stehen in den
 * Balken darunter, wo man sie ablesen kann.
 *
 * Die Reihenfolge der Achsen ist fest und darf sich nie ändern. Ein Netz ist
 * nur mit sich selbst vergleichbar, und wenn Me Time nächstes Jahr an einer
 * anderen Ecke sitzt, passt kein Bild von heute mehr dazu.
 */
export const NETZ_MAX = 1.6;

export function netzDiagramm({ bereiche, groesse = 300, beschriftet = true }) {
  const cx = groesse / 2;
  const cy = groesse / 2;
  // Platz für die Beschriftung am Rand. Ohne den Abzug steht der Text
  // ausserhalb der viewBox und wird an der Kante abgeschnitten.
  // 66 Pixel Rand für die Beschriftung. Der erste Entwurf nahm 40, und
  // "Wellbeing" und "Familie" liefen an den Seiten aus der viewBox heraus:
  // im Betrieb stand dort "Fitne" und "milie". Der Rand muss das längste
  // Wort tragen, nicht das durchschnittliche.
  const r = groesse / 2 - (beschriftet ? 66 : 8);
  // Die Beschriftung sitzt in festen Pixeln ausserhalb des Netzes, nicht auf
  // einem Anteil oberhalb des Maximums. Ein Bereich über 160 Prozent wird auf
  // den Rand gedeckelt, und ein Etikett auf einem Anteil landete dann genau
  // auf seinem eigenen Punkt: im Betrieb stand "Fitness" auf dem grünen Kreis.
  const rEtikett = r + 14;

  const svg = el("svg", {
    viewBox: `0 0 ${groesse} ${groesse}`, width: groesse, height: groesse,
    role: "img",
    "aria-label": bereiche.map((b) => `${b.name} ${Math.round(b.anteil * 100)} Prozent des Ziels`).join(", "),
  });

  const winkel = (i) => ((i * 360) / bereiche.length - 90) * (Math.PI / 180);
  const punkt = (i, anteil) => {
    const w = winkel(i);
    const rr = (Math.min(Math.max(anteil, 0), NETZ_MAX) / NETZ_MAX) * r;
    return [cx + Math.cos(w) * rr, cy + Math.sin(w) * rr];
  };
  const pfad = (werte) => werte.map((a, i) => punkt(i, a).map((n) => n.toFixed(1)).join(",")).join(" ");

  // Das Netz im Hintergrund. Die Stufe bei 100 Prozent fehlt hier, weil dort
  // schon die gestrichelte Ziellinie liegt: zwei Linien an derselben Stelle
  // sind eine zu viel.
  for (const stufe of [0.5, 1.5]) {
    svg.appendChild(el("polygon", {
      points: pfad(bereiche.map(() => stufe)),
      fill: "none", stroke: "currentColor", "stroke-opacity": "0.13", "stroke-width": "1",
    }));
  }
  for (let i = 0; i < bereiche.length; i++) {
    const [x, y] = punkt(i, NETZ_MAX);
    svg.appendChild(el("line", {
      x1: cx, y1: cy, x2: x.toFixed(1), y2: y.toFixed(1),
      stroke: "currentColor", "stroke-opacity": "0.11", "stroke-width": "1",
    }));
  }

  svg.appendChild(el("polygon", {
    points: pfad(bereiche.map(() => 1)),
    fill: "none", stroke: "currentColor", "stroke-opacity": "0.8",
    "stroke-width": "1.6", "stroke-dasharray": "5 4",
  }));

  const brand = getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() || "currentColor";
  svg.appendChild(el("polygon", {
    points: pfad(bereiche.map((b) => b.anteil)),
    fill: brand, "fill-opacity": "0.2", stroke: brand,
    "stroke-width": "2", "stroke-linejoin": "round",
  }));

  bereiche.forEach((b, i) => {
    const farbe = bereichFarbe(b.bereich);
    const [px, py] = punkt(i, b.anteil);
    svg.appendChild(el("circle", {
      cx: px.toFixed(1), cy: py.toFixed(1), r: beschriftet ? 4 : 3,
      fill: farbe, stroke: "var(--bg)", "stroke-width": "2",
    }));
    if (!beschriftet) return;
    const w = winkel(i);
    const tx = cx + Math.cos(w) * rEtikett;
    const ty = cy + Math.sin(w) * rEtikett;
    const t = el("text", {
      x: tx.toFixed(1), y: (ty + 4).toFixed(1),
      "text-anchor": tx > cx + 6 ? "start" : tx < cx - 6 ? "end" : "middle",
      fill: farbe, "font-size": "12", "font-weight": "600",
    });
    // Der lange Name bricht in SVG nicht um und würde über den Rand laufen.
    t.textContent = b.name.replace(" und Beziehung", "");
    svg.appendChild(t);
  });

  return svg;
}
