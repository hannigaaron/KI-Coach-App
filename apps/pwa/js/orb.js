/**
 * Der Kreis.
 *
 * Das d aus dem Logo, aufgeloest in Partikel. Der Ring ist als Torus gedacht:
 * jeder Punkt sitzt auf einem Winkel entlang des Bogens und auf einem Winkel
 * um den Schlauchquerschnitt. Daraus ergeben sich Tiefe und Helligkeit. Ueber
 * den Radius laufen mehrere Sinuswellen, das erzeugt das Wogen.
 *
 * Canvas statt SVG, weil ein paar tausend Punkte pro Bild in SVG nicht
 * fluessig laufen.
 *
 * Die Geometrie ist dieselbe wie im Logo, gemessen aus Poppins SemiBold bei
 * 1000 Einheiten je Geviert und in einen Entwurfsraum von 800 gelegt:
 *   Grundlinie 760, Ringmitte 318 / 483, Radius 215, Strichstaerke 140
 *   Stamm x 470 bis 610, von y 20 bis zur Grundlinie
 *
 * Zustaende:
 *   idle       ruhiges Wogen, ein duenner Innenring zeigt den Tagesfortschritt
 *   listening  Wellen und Helligkeit folgen dem Mikrofonpegel
 *   thinking   die Wellen wandern schnell um den Ring
 *   speaking   der ganze Ring pulsiert
 */

const BASE = 760;
const CX = 318;
const CY = BASE - 277;
const R = 215;
const TUBE = 70;              // halbe Strichstaerke
const SWEEP = 300;            // offener Ring wie im Logo
const STEM_X = 470;
const STEM_W = 140;
const STEM_TOP = BASE - 740;
const GAUGE_R = R - 96;
const DESIGN = 800;           // Kantenlaenge des Entwurfsraums
const ORIGIN_X = -78.5;       // Verschiebung, damit das d mittig sitzt
const ORIGIN_Y = -6;

/**
 * Die Punkte liegen auf Faeden. Ein Faden ist ein Ring bei festem Winkel um
 * den Schlauchquerschnitt. Jeder Faden wogt mit eigener Phase, dadurch
 * entstehen die sichtbaren Straenge statt eines gleichmaessigen Rauschens.
 */
const STRANDS = 30;
const PER_STRAND = 108;
const RING_PARTICLES = STRANDS * PER_STRAND;
const STEM_PARTICLES = 900;
const ALPHA_STEPS = 12;

function brandColor(el) {
  const value = getComputedStyle(el).getPropertyValue("--brand").trim();
  return value || "#96d8f0";
}

/** Zerlegt eine Hexfarbe in ihre Kanaele, damit die Deckkraft je Punkt gesetzt werden kann. */
function rgbOf(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

export class Orb {
  constructor(element) {
    this.el = element;
    this.el.innerHTML = '<canvas class="orb-canvas"></canvas>';
    this.canvas = this.el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.progress = 0;
    this.level = 0;
    this.phase = 0;
    this.rafId = 0;
    this.state = "idle";
    this.reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.rgb = rgbOf(brandColor(this.el));
    this.buildParticles();
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.el);
    this.setState("idle");
    this.loop();
  }

  /**
   * Die Punkte werden einmal erzeugt und danach nur noch bewegt. Jeder Punkt
   * behaelt seinen Platz auf dem Ring, sonst flimmert das Bild.
   */
  buildParticles() {
    const sweepRad = (SWEEP * Math.PI) / 180;
    this.ring = new Float32Array(RING_PARTICLES * 5); // a, b, r, seed, size
    let k = 0;
    for (let strand = 0; strand < STRANDS; strand++) {
      const b0 = (strand / STRANDS) * Math.PI * 2;
      const rScale = 0.55 + Math.random() * 0.45;
      const seed = Math.random() * Math.PI * 2;
      for (let j = 0; j < PER_STRAND; j++) {
        const t = (j + Math.random() * 0.6) / PER_STRAND;
        this.ring[k++] = t * sweepRad;
        this.ring[k++] = b0 + (Math.random() - 0.5) * 0.18;
        this.ring[k++] = rScale * (0.9 + Math.random() * 0.2);
        this.ring[k++] = seed;
        this.ring[k++] = 2.1 + Math.random() * 1.8;
      }
    }
    this.stem = new Float32Array(STEM_PARTICLES * 4); // u, v, seed, size
    k = 0;
    for (let i = 0; i < STEM_PARTICLES; i++) {
      this.stem[k++] = Math.random();
      this.stem[k++] = Math.random();
      this.stem[k++] = Math.random() * Math.PI * 2;
      this.stem[k++] = 2.2 + Math.random() * 1.8;
    }
    // Ziel fuer die berechneten Bildpunkte: x, y, groesse, Helligkeitsstufe
    this.out = new Float32Array((RING_PARTICLES + STEM_PARTICLES) * 4);
  }

  resize() {
    const rect = this.el.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.scale = (rect.width * dpr) / DESIGN;
    this.rgb = rgbOf(brandColor(this.el));
  }

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

  /** Wellenparameter je Zustand. */
  motion() {
    if (this.state === "listening") {
      return { amp: 12 + this.level * 44, speed: 1.7, bright: 0.95 + this.level * 0.05, spread: 1 + this.level * 0.45 };
    }
    if (this.state === "thinking") {
      return { amp: 22, speed: 4.2, bright: 0.96, spread: 1 };
    }
    if (this.state === "speaking") {
      const pulse = Math.abs(Math.sin(this.phase * 4));
      return { amp: 14 + pulse * 20, speed: 2.4, bright: 0.9 + pulse * 0.1, spread: 1 + pulse * 0.18 };
    }
    const breath = (Math.sin(this.phase * 0.8) + 1) / 2;
    return { amp: 8 + breath * 6, speed: 0.7, bright: 0.82 + breath * 0.1, spread: 1 };
  }

  frame() {
    const { ctx, scale } = this;
    if (!scale) return;
    if (!this.reduced) this.phase += 0.016;

    const m = this.motion();
    const t = this.phase * m.speed;
    const [r, g, b] = this.rgb;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, -ORIGIN_X * scale, -ORIGIN_Y * scale);
    ctx.globalCompositeOperation = "lighter";

    // Innenring fuer den Tagesfortschritt, ruhig und duenn.
    if (this.progress > 0.005) {
      ctx.beginPath();
      ctx.arc(CX, CY, GAUGE_R, -Math.PI / 2, -Math.PI / 2 + this.progress * Math.PI * 2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Erst alle Bildpunkte rechnen, dann nach Helligkeit gebuendelt zeichnen.
    // Ein fillStyle je Punkt kostet pro Bild tausende Zeichenketten.
    const out = this.out;
    let o = 0;

    for (let i = 0; i < RING_PARTICLES; i++) {
      const p = i * 5;
      const a = this.ring[p];
      const bAng = this.ring[p + 1] + t * 0.45;
      const rScale = this.ring[p + 2];
      const seed = this.ring[p + 3];
      const size = this.ring[p + 4];

      const wave =
        Math.sin(a * 3 + t * 1.1 + seed) * 0.6 +
        Math.sin(a * 5 - t * 0.7 + seed * 1.7) * 0.3 +
        Math.sin(a * 8 + t * 1.9) * 0.2;
      const radial = R + Math.cos(bAng) * TUBE * rScale * m.spread + wave * m.amp;
      const angle = a - Math.PI / 2;
      const depth = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(bAng));

      out[o++] = CX + Math.cos(angle) * radial;
      out[o++] = CY + Math.sin(angle) * radial;
      out[o++] = size * (0.6 + depth * 0.7);
      out[o++] = depth * m.bright;
    }

    for (let i = 0; i < STEM_PARTICLES; i++) {
      const p = i * 4;
      const u = this.stem[p];
      const v = this.stem[p + 1];
      const seed = this.stem[p + 2];
      const size = this.stem[p + 3];
      const wobble = Math.sin(v * 9 + t * 1.2 + seed) * m.amp * 0.22;
      const depth = 0.55 + 0.45 * Math.sin(u * Math.PI);

      out[o++] = STEM_X + u * STEM_W + wobble;
      out[o++] = STEM_TOP + v * (BASE - STEM_TOP);
      out[o++] = size * (0.6 + depth * 0.7);
      out[o++] = Math.min(1, depth * m.bright * 1.1);
    }

    const total = RING_PARTICLES + STEM_PARTICLES;
    for (let step = 0; step < ALPHA_STEPS; step++) {
      const alpha = (step + 1) / ALPHA_STEPS;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
      let drew = false;
      for (let i = 0; i < total; i++) {
        const q = i * 4;
        const bucket = Math.min(ALPHA_STEPS - 1, Math.max(0, Math.round(out[q + 3] * ALPHA_STEPS) - 1));
        if (bucket !== step) continue;
        const s = out[q + 2];
        ctx.fillRect(out[q] - s / 2, out[q + 1] - s / 2, s, s);
        drew = true;
      }
      if (!drew) continue;
    }

    ctx.globalCompositeOperation = "source-over";
    this.el.style.setProperty("--glow", m.bright.toFixed(3));
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
    this.observer?.disconnect();
  }
}
