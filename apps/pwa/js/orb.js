/**
 * Der Kreis.
 *
 * Das d aus dem Logo, nur gross und lebendig. Dieselbe Geometrie wie in
 * apps/pwa/brand, damit Marke und Oberflaeche dieselbe Form zeigen.
 *
 * Die Masse stammen aus Poppins SemiBold bei 1000 Einheiten je Geviert und
 * sind hier in den SVG Raum gelegt, in dem y nach unten waechst. Die Grundlinie
 * liegt auf y = 760, alles andere ergibt sich daraus:
 *   Ringmitte  318 / 483      Radius 215      Strichstaerke 140
 *   Stamm      x 470, Breite 140, von y 20 bis zur Grundlinie
 *
 * Zustaende:
 *   idle       ruhiges Atmen, der Ring zeigt den Fortschritt des Tages
 *   listening  der Ring folgt dem Mikrofonpegel
 *   thinking   der Ring dreht sich
 *   speaking   der Ring pulsiert im Takt der Ausgabe
 */

const BASE = 760;      // Grundlinie
const CX = 318;
const CY = BASE - 277; // 483
const R = 215;
const STROKE = 140;
const STEM_X = 470;
const STEM_W = 140;
const STEM_TOP = BASE - 740; // 20
const VIEW = "-78.5 -6 800 800";
const GAUGE_R = R - 96;   // Innenring fuer den Tagesfortschritt
const GAUGE_W = 26;

/** Punkt auf dem Ring. 0 Grad ist oben, positive Werte laufen im Uhrzeigersinn. */
function point(deg, radius) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

export function arcPath(sweep, start = 0, radius = R) {
  const clamped = Math.max(0.5, Math.min(359.5, sweep));
  const [x0, y0] = point(start, radius);
  const [x1, y1] = point(start + clamped, radius);
  const large = clamped > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

const TEMPLATE = `
<svg class="orb-svg" viewBox="${VIEW}" aria-hidden="true">
  <g class="orb-halo">
    <circle cx="${CX}" cy="${CY}" r="${R + 130}"></circle>
    <circle cx="${CX}" cy="${CY}" r="${R + 230}"></circle>
  </g>
  <circle class="orb-gauge-track" cx="${CX}" cy="${CY}" r="${GAUGE_R}" fill="none" stroke-width="${GAUGE_W}"></circle>
  <path class="orb-gauge" fill="none" stroke-width="${GAUGE_W}" stroke-linecap="round"></path>
  <path class="orb-arc" fill="none" stroke-width="${STROKE}" stroke-linecap="round"></path>
  <rect class="orb-stem" x="${STEM_X}" y="${STEM_TOP}" width="${STEM_W}" height="${BASE - STEM_TOP}"></rect>
</svg>`;

export class Orb {
  constructor(element) {
    this.el = element;
    this.el.innerHTML = TEMPLATE;
    this.arc = this.el.querySelector(".orb-arc");
    this.gauge = this.el.querySelector(".orb-gauge");
    this.progress = 0;
    this.level = 0;
    this.phase = 0;
    this.rafId = 0;
    this.reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.setState("idle");
    this.loop();
  }

  /** Fortschritt des Tages von 0 bis 1, im Ruhezustand sichtbar. */
  setProgress(value) {
    this.progress = Math.max(0, Math.min(1, Number(value) || 0));
  }

  setLevel(value) {
    this.level = Math.max(0, Math.min(1, Number(value) || 0));
  }

  setState(state) {
    this.state = state;
    this.el.dataset.state = state;
  }

  frame() {
    this.phase += this.reduced ? 0 : 0.016;
    let sweep;
    let glow;

    // Der grosse Bogen ist immer das Logo. Er bleibt bei 300 Grad, damit der
    // Buchstabe in jedem Zustand lesbar ist. Bewegung entsteht ueber Leuchten,
    // Drehung und den Innenring, nicht ueber das Zerlegen des d.
    if (this.state === "listening") {
      sweep = 260 + this.level * 60;
      glow = 0.55 + this.level * 0.45;
    } else if (this.state === "thinking") {
      sweep = 300;
      glow = 0.5 + Math.sin(this.phase * 3) * 0.22;
    } else if (this.state === "speaking") {
      const pulse = Math.abs(Math.sin(this.phase * 4.2));
      sweep = 285 + pulse * 30;
      glow = 0.5 + pulse * 0.42;
    } else {
      const breath = (Math.sin(this.phase * 0.9) + 1) / 2;
      sweep = 300;
      glow = 0.26 + breath * 0.14;
    }

    const rotation = this.state === "thinking" ? (this.phase * 130) % 360 : 0;
    this.arc.setAttribute("d", arcPath(sweep, rotation));
    // Der Innenring zeigt den Tag. Bei null bleibt er leer statt einen Punkt
    // zu setzen, sonst sieht ein leerer Tag aus wie ein Fehler.
    this.gauge.setAttribute("d", this.progress > 0.005 ? arcPath(this.progress * 360, 0, GAUGE_R) : "");
    this.el.style.setProperty("--glow", glow.toFixed(3));
    this.el.style.setProperty("--level", this.level.toFixed(3));
  }

  loop() {
    const tick = () => {
      this.frame();
      this.rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
  }
}
