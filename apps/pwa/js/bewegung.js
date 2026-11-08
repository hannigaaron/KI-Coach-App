/**
 * Bewegung, die etwas sagt.
 *
 * Ringe und Balken laufen von ihrem letzten Stand auf den neuen, Zahlen
 * zählen hoch, Zeilen gleiten heraus statt zu verschwinden, und eine Zeile
 * lässt sich zum Löschen nach links wischen. Jede dieser Bewegungen
 * beantwortet eine Frage: was hat sich geändert, und wohin ist es gegangen.
 * Ein Balken, der ohne Übergang von 40 auf 70 Prozent springt, zeigt den
 * neuen Stand, aber nicht, dass die Mahlzeit eben ihn verschoben hat.
 *
 * Der Weg ist ein Beobachter auf dem Dokument und kein Aufruf an jeder
 * Stelle, die zeichnet. Die App baut Ringe und Balken bei jeder Änderung neu
 * auf, und eine Übergangsregel im Stylesheet greift bei einem neuen Element
 * nie. Gemerkt wird je Ring der letzte Wert, über die Kennung des nächsten
 * Vorfahren mit `id` und die Stelle darin. Beim ersten Zeichnen laufen sie
 * von null: das Öffnen der App sieht dann lebendig aus statt fertig.
 *
 * Wer in den Bedienungshilfen weniger Bewegung eingestellt hat, bekommt
 * keine davon. Die Werte stimmen trotzdem, nur ohne Weg dorthin.
 *
 * Gemessen wird nichts, alles läuft über die Web Animations API auf der
 * Grafikkarte, soweit der Browser es kann: Strichlänge, Breite, Deckkraft
 * und Verschiebung.
 */

const KURVE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DAUER = 720;
const alt = new Map();
// Elemente, die schon einmal gelaufen sind. Ein Element, das bleibt und nur
// seinen Wert ändert, übernimmt die Übergangsregel im Stylesheet, und zwei
// Bewegungen übereinander ruckeln.
const gesehen = new WeakSet();
const ZAHLEN = "[data-zaehlen], .held-zahl, #kcalEaten";

export const wenigBewegung = () => Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

function schluessel(el, art) {
  const anker = el.closest("[id]");
  const id = anker?.id ?? "seite";
  const liste = anker ? [...anker.querySelectorAll(art)] : [];
  return `${id}|${art}|${liste.indexOf(el)}`;
}

const sichtbar = (el) => !el.closest("[hidden]") && el.getClientRects().length > 0;

/** Ein Bogen ist ein Kreis mit `stroke-dasharray` "Länge Umfang". */
function bogenLaenge(kreis) {
  const teile = String(kreis.getAttribute("stroke-dasharray") ?? "").split(/[\s,]+/).map(Number);
  if (teile.length !== 2 || !teile.every(Number.isFinite)) return null;
  const r = Number(kreis.getAttribute("r"));
  if (!(r > 0) || Math.abs(teile[1] - 2 * Math.PI * r) > 1) return null;
  return { laenge: teile[0], umfang: teile[1] };
}

function boegen(wurzel) {
  for (const kreis of wurzel.querySelectorAll("svg circle[stroke-dasharray]")) {
    if (gesehen.has(kreis) || !sichtbar(kreis)) continue;
    gesehen.add(kreis);
    const b = bogenLaenge(kreis);
    if (!b) continue;
    const k = schluessel(kreis, "svg circle[stroke-dasharray]");
    const von = alt.get(k) ?? 0;
    alt.set(k, b.laenge);
    if (Math.abs(von - b.laenge) < 0.5) continue;
    kreis.animate(
      [{ strokeDasharray: `${von} ${b.umfang}` }, { strokeDasharray: `${b.laenge} ${b.umfang}` }],
      { duration: DAUER, easing: KURVE },
    );
  }
}

function balken(wurzel) {
  for (const i of wurzel.querySelectorAll(".balken > i, .ab-partien i")) {
    if (gesehen.has(i) || !sichtbar(i)) continue;
    gesehen.add(i);
    const ziel = i.getBoundingClientRect().width;
    const k = schluessel(i, ".balken > i, .ab-partien i");
    const von = alt.get(k) ?? 0;
    alt.set(k, ziel);
    if (Math.abs(von - ziel) < 1 || !ziel) continue;
    const start = Math.max(0, Math.min(1, von / ziel));
    i.animate([{ transform: `scaleX(${start})` }, { transform: "scaleX(1)" }], { duration: DAUER, easing: KURVE });
  }
}

/** Liest "1.234,5" als 1234.5. */
function zahlLesen(text) {
  const m = String(text).trim().match(/^(-?[\d.]+(?:,\d+)?)(.*)$/);
  if (!m) return null;
  const wert = Number(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(wert) ? { wert, rest: m[2], komma: m[1].includes(",") } : null;
}

const format = (x, komma) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: komma ? 1 : 0 }).format(x);

/** Zählt eine Zahl von `von` auf ihren Wert. Der Text am Ende bleibt stehen. */
const zaehltGerade = new WeakSet();
function zaehlen(el, von, ziel) {
  const start = performance.now();
  // Jedes Bild ändert den Text, und der Beobachter sähe darin eine neue
  // Zahl. Solange gezählt wird, gilt das Element als beschäftigt.
  zaehltGerade.add(el);
  const endText = el.textContent;
  let geschrieben = endText;
  const schritt = (t) => {
    // Hat die App inzwischen selbst einen neuen Wert geschrieben, gilt der.
    if (el.textContent !== geschrieben) { zaehltGerade.delete(el); return; }
    const p = Math.min(1, (t - start) / DAUER);
    const e = 1 - (1 - p) ** 3;
    geschrieben = p < 1 ? `${format(von + (ziel.wert - von) * e, ziel.komma)}${ziel.rest}` : endText;
    el.textContent = geschrieben;
    if (p < 1) requestAnimationFrame(schritt);
    else requestAnimationFrame(() => zaehltGerade.delete(el));
  };
  requestAnimationFrame(schritt);
}

function zahlen(wurzel) {
  for (const el of wurzel.querySelectorAll(ZAHLEN)) {
    if (zaehltGerade.has(el) || !sichtbar(el) || el.children.length) continue;
    const ziel = zahlLesen(el.textContent);
    if (!ziel || Math.abs(ziel.wert) > 1e6) continue;
    const k = schluessel(el, ZAHLEN);
    const von = alt.get(k) ?? 0;
    alt.set(k, ziel.wert);
    if (von === ziel.wert) continue;
    zaehlen(el, von, ziel);
  }
}

/** Läuft einmal über das Dokument oder einen Teil davon. */
export function laufen(wurzel = document) {
  if (wenigBewegung()) return;
  try {
    boegen(wurzel);
    balken(wurzel);
    zahlen(wurzel);
  } catch {
    // Bewegung ist eine Zugabe. Ein Fehler hier darf nichts anderes aufhalten.
  }
}

/** Zahlen in einem frisch gefüllten Bereich hochzählen, ohne Gedächtnis. */
export function zahlenZaehlen(wurzel) {
  if (wenigBewegung()) return;
  for (const el of wurzel.querySelectorAll("[data-zaehlen]")) {
    const ziel = zahlLesen(el.textContent);
    if (!ziel) continue;
    alt.set(schluessel(el, ZAHLEN), ziel.wert);
    zaehlen(el, 0, ziel);
  }
  balken(wurzel);
}

/**
 * Beobachtet das Dokument und lässt nach jedem Neuzeichnen laufen,
 * gebündelt auf ein Bild. Ein Eingabefeld, das tippt, löst nichts aus:
 * geprüft werden nur Bereiche, in die Elemente eingefügt wurden.
 */
export function bewegungStarten() {
  if (!globalThis.MutationObserver || !document.body) return;
  let geplant = false;
  const beobachter = new MutationObserver((liste) => {
    if (geplant) return;
    if (!liste.some((m) => m.addedNodes.length)) return;
    geplant = true;
    requestAnimationFrame(() => { geplant = false; laufen(document); });
  });
  beobachter.observe(document.body, { childList: true, subtree: true });
  // Auf dem iPhone greift :active erst mit einem Listener für Berührungen.
  document.addEventListener("touchstart", () => {}, { passive: true });
  laufen(document);
}

/** Eine Zeile gleitet aus und klappt zusammen, dann `fertig`. */
export function zeileRaus(el, fertig = () => {}) {
  if (!el || wenigBewegung() || !el.animate) { fertig(); return; }
  const hoehe = el.getBoundingClientRect().height;
  el.style.overflow = "hidden";
  const a = el.animate([
    { transform: el.style.transform || "translateX(0)", opacity: 1, height: `${hoehe}px` },
    { transform: "translateX(-24%)", opacity: 0, height: `${hoehe}px`, offset: 0.55 },
    { transform: "translateX(-24%)", opacity: 0, height: "0px", paddingTop: "0px", paddingBottom: "0px", marginTop: "0px", marginBottom: "0px" },
  ], { duration: 340, easing: KURVE, fill: "forwards" });
  a.onfinish = fertig;
}

/**
 * Wischen zum Löschen. Ab einem Drittel der Breite oder einem schnellen
 * Schwung löscht die Zeile, darunter federt sie zurück. Senkrechte
 * Bewegungen bleiben Scrollen: entschieden wird nach den ersten acht Pixeln.
 */
export function wischenZumLoeschen(liste, auswahl, loeschen) {
  if (!liste) return;
  let zeile = null; let x0 = 0; let y0 = 0; let t0 = 0; let dx = 0; let richtung = null;
  const zurueck = (el) => {
    el.style.transition = `transform 260ms ${KURVE}`;
    el.style.transform = "";
    el.classList.remove("wischt");
    setTimeout(() => { el.style.transition = ""; }, 280);
  };
  liste.addEventListener("touchstart", (e) => {
    const z = e.target.closest(auswahl);
    if (!z || e.touches.length !== 1) return;
    zeile = z; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = performance.now(); dx = 0; richtung = null;
  }, { passive: true });
  liste.addEventListener("touchmove", (e) => {
    if (!zeile) return;
    const mx = e.touches[0].clientX - x0;
    const my = e.touches[0].clientY - y0;
    if (!richtung && Math.hypot(mx, my) > 8) richtung = Math.abs(mx) > Math.abs(my) * 1.2 && mx < 0 ? "x" : "y";
    if (richtung !== "x") return;
    e.preventDefault();
    dx = Math.min(0, mx);
    zeile.classList.add("wischt");
    zeile.style.transform = `translateX(${dx}px)`;
  }, { passive: false });
  liste.addEventListener("touchend", () => {
    if (!zeile) return;
    const z = zeile; zeile = null;
    if (richtung !== "x") return;
    const breite = z.getBoundingClientRect().width;
    const schnell = -dx / Math.max(1, performance.now() - t0) > 0.6;
    if (-dx > breite / 3 || (schnell && -dx > 40)) {
      z.style.transition = `transform 180ms ${KURVE}`;
      z.style.transform = `translateX(-${breite}px)`;
      setTimeout(() => loeschen(z), 170);
    } else zurueck(z);
  });
  liste.addEventListener("touchcancel", () => { if (zeile) zurueck(zeile); zeile = null; });
  // Der Klick nach einem Wischen öffnet die Zeile nicht.
  liste.addEventListener("click", (e) => {
    if (e.target.closest(auswahl)?.classList.contains("wischt")) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}
