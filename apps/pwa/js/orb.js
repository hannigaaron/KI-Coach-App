/**
 * Der Kreis.
 *
 * Das d aus dem Logo, aufgelöst in Partikel. Der Ring ist als Torus gedacht:
 * jeder Punkt sitzt auf einem Winkel entlang des Bogens und auf einem Winkel
 * um den Schlauchqürschnitt. Daraus ergeben sich Tiefe und Helligkeit. Ueber
 * den Radius laufen mehrere Sinuswellen, das erzeugt das Wogen.
 *
 * Canvas statt SVG, weil ein paar tausend Punkte pro Bild in SVG nicht
 * flüssig laufen.
 *
 * Die Geometrie ist dieselbe wie im Logo, gemessen aus Poppins SemiBold bei
 * 1000 Einheiten je Geviert und in einen Entwurfsraum von 800 gelegt:
 *   Grundlinie 760, Ringmitte 318 / 483, Radius 215, Strichstärke 140
 *   Stamm x 470 bis 610, von y 20 bis zur Grundlinie
 *
 * Zustände:
 *   idle       ruhiges Wogen, ein dünner Innenring zeigt den Tagesfortschritt
 *   listening  Wellen und Helligkeit folgen dem Mikrofonpegel
 *   thinking   die Wellen wandern schnell um den Ring
 *   speaking   der ganze Ring pulsiert
 */

const BASE = 760;
const CX = 318;
const CY = BASE - 277;
const R = 215;
const TUBE = 70;              // halbe Strichstärke
const SWEEP = 300;            // offener Ring wie im Logo
const STEM_X = 470;
const STEM_W = 140;
const STEM_TOP = BASE - 740;
const DESIGN = 800;           // Kantenlänge des Entwurfsraums
const ORIGIN_X = -78.5;       // Verschiebung, damit das d mittig sitzt
const ORIGIN_Y = -6;

/**
 * Die Punkte liegen auf Fäden. Ein Faden ist ein Ring bei festem Winkel um
 * den Schlauchqürschnitt. Jeder Faden wogt mit eigener Phase, dadurch
 * entstehen die sichtbaren Stränge statt eines gleichmäßigen Rauschens.
 */
const STRANDS = 30;
const PER_STRAND = 108;
const RING_PARTICLES = STRANDS * PER_STRAND;
const STEM_PARTICLES = 1500;
const ALPHA_STEPS = 12;

/**
 * Die Punktfarbe kommt aus --accent. Im dunklen Modus ist das das Logoblau,
 * im hellen der abgedunkelte Ton. Das Logoblau auf Weiss hat nur 1.57 zu 1
 * und waere als Kreis kaum zu sehen.
 */
function brandColor(el) {
  // --accent enthaelt "var(--brand-deep)", nicht die Farbe selbst. Ein Probe
  // Element loest die Kette auf, der Browser liefert dann rgb().
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;color:var(--accent)";
  el.appendChild(probe);
  const farbe = getComputedStyle(probe).color;
  probe.remove();
  const teile = farbe.match(/\d+/g);
  return teile ? teile.slice(0, 3).map(Number) : [150, 216, 240];
}

/**
 * Auf dunklem Grund werden die Punkte addiert, dann leuchtet der Kreis.
 * Auf hellem Grund wuerde Addieren ihn ausbleichen, dort wird normal gemalt.
 * Entschieden wird an der Helligkeit des Hintergrunds, nicht am Attribut,
 * damit auch die Einstellung "wie das Geraet" richtig liegt.
 */
function grundIstHell() {
  const bg = getComputedStyle(document.body).backgroundColor;
  const teile = bg.match(/\d+/g);
  if (!teile) return false;
  const [r, g, b] = teile.map(Number);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
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
    this.rgb = brandColor(this.el);
    this.hell = grundIstHell();
    this.buildParticles();
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.el);
    this.setState("idle");
    this.loop();
  }

  /**
   * Die Punkte werden einmal erzeugt und danach nur noch bewegt. Jeder Punkt
   * behält seinen Platz auf dem Ring, sonst flimmert das Bild.
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
    // Der Stamm ist eine Kapsel: ein Rechteck mit je einem Halbkreis oben und
    // unten. Genau so steht er im Logo, seit die Enden rund sind. Die Punkte
    // werden im umschliessenden Rechteck gewuerfelt und ausserhalb der Kapsel
    // verworfen. Ohne das Verwerfen bekaemen die runden Enden Ecken zurueck.
    const stemCx = STEM_X + STEM_W / 2;
    const capR = STEM_W / 2;
    const yTopCap = STEM_TOP + capR;
    const yBotCap = BASE - capR;
    this.stem = new Float32Array(STEM_PARTICLES * 4); // x, y, seed, size
    this.stemCount = 0;
    k = 0;
    let versuche = 0;
    while (this.stemCount < STEM_PARTICLES && versuche < STEM_PARTICLES * 40) {
      versuche++;
      const x = STEM_X + Math.random() * STEM_W;
      const y = STEM_TOP + Math.random() * (BASE - STEM_TOP);
      const dx = x - stemCx;
      let drin;
      if (y >= yTopCap && y <= yBotCap) drin = true;
      else {
        const dy = y < yTopCap ? y - yTopCap : y - yBotCap;
        drin = dx * dx + dy * dy <= capR * capR;
      }
      if (!drin) continue;
      this.stem[k++] = x;
      this.stem[k++] = y;
      this.stem[k++] = Math.random() * Math.PI * 2;
      this.stem[k++] = 2.2 + Math.random() * 1.8;
      this.stemCount++;
    }
    // Ziel für die berechneten Bildpunkte: x, y, grösse, Helligkeitsstufe
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
    this.refreshTheme();
  }

  /** Nach einem Wechsel zwischen hell und dunkel neu einlesen. */
  refreshTheme() {
    this.rgb = brandColor(this.el);
    this.hell = grundIstHell();
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
    // scale wächst beim Zuhören und Sprechen. Der ganze Kreis geht auf,
    // so wie Siri grösser wird, wenn sie zuhört.
    if (this.state === "listening") {
      return {
        amp: 12 + this.level * 44, speed: 1.7,
        bright: 0.95 + this.level * 0.05,
        spread: 1 + this.level * 0.45,
        scale: 1.06 + this.level * 0.16,
      };
    }
    if (this.state === "thinking") {
      return { amp: 22, speed: 4.2, bright: 0.96, spread: 1, scale: 1.04 + Math.sin(this.phase * 3) * 0.02 };
    }
    if (this.state === "speaking") {
      const pulse = Math.abs(Math.sin(this.phase * 4));
      return {
        amp: 14 + pulse * 20, speed: 2.4,
        bright: 0.9 + pulse * 0.1,
        spread: 1 + pulse * 0.18,
        scale: 1.05 + pulse * 0.09,
      };
    }
    const breath = (Math.sin(this.phase * 0.8) + 1) / 2;
    return { amp: 8 + breath * 6, speed: 0.7, bright: 0.82 + breath * 0.1, spread: 1, scale: 1 + breath * 0.015 };
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
    ctx.globalCompositeOperation = this.hell ? "source-over" : "lighter";

    // Erst alle Bildpunkte rechnen, dann nach Helligkeit gebündelt zeichnen.
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

    for (let i = 0; i < this.stemCount; i++) {
      const p = i * 4;
      const x = this.stem[p];
      const y = this.stem[p + 1];
      const seed = this.stem[p + 2];
      const size = this.stem[p + 3];
      const v = (y - STEM_TOP) / (BASE - STEM_TOP);
      const u = (x - STEM_X) / STEM_W;
      const wobble = Math.sin(v * 9 + t * 1.2 + seed) * m.amp * 0.22;
      const depth = 0.55 + 0.45 * Math.sin(u * Math.PI);

      out[o++] = x + wobble;
      out[o++] = y;
      out[o++] = size * (0.6 + depth * 0.7);
      out[o++] = Math.min(1, depth * m.bright * 1.1);
    }

    const total = RING_PARTICLES + this.stemCount;
    for (let step = 0; step < ALPHA_STEPS; step++) {
      // Auf hellem Grund sind kleine Punkte mit wenig Deckkraft kaum zu sehen.
      // Deshalb dort ein Sockel, statt linear bei null zu beginnen.
      const roh = (step + 1) / ALPHA_STEPS;
      const alpha = this.hell ? 0.4 + roh * 0.6 : roh;
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
    this.el.style.setProperty("--orb-scale", m.scale.toFixed(3));
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
