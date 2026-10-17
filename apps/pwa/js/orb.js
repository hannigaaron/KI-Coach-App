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
 *   Grundlinie 760, Ringmitte 325 / 483, Radius 215, Strichstärke 140
 *   Ring 280 Grad ab oben im Uhrzeigersinn, 80 Grad bleiben offen
 *   Stamm x 470 bis 610, von y 20 bis auf Höhe der Ringmitte
 *
 * Der Stamm endet nicht an der Grundlinie, sondern läuft in den Ring hinein.
 * Seine Mittellinie liegt bei x 540, genau auf der Mittellinie des Rings an
 * dessen rechter Seite. Dort gehen beide Schläuche ineinander über, und das d
 * ist ein Zug statt zwei Teilen nebeneinander.
 *
 * Zustände:
 *   idle       ruhiges Wogen, ein dünner Innenring zeigt den Tagesfortschritt
 *   listening  Wellen und Helligkeit folgen dem Mikrofonpegel
 *   thinking   die Wellen wandern schnell um den Ring
 *   speaking   der ganze Ring pulsiert
 */

const BASE = 760;
const CX = 325;            // CX + R = 540, die Mittellinie des Stamms
const CY = BASE - 277;
const R = 215;
const TUBE = 70;              // halbe Strichstärke
const SWEEP = 280;            // offener Ring wie im Logo
const STEM_X = 470;
const STEM_W = 140;
const STEM_TOP = BASE - 740;
const DESIGN = 800;           // Kantenlänge des Entwurfsraums
const ORIGIN_X = -75;         // Verschiebung, damit das d mittig sitzt
const ORIGIN_Y = -6;

/**
 * Die Punkte liegen auf Fäden. Ein Faden ist ein Ring bei festem Winkel um
 * den Schlauchqürschnitt. Jeder Faden wogt mit eigener Phase, dadurch
 * entstehen die sichtbaren Stränge statt eines gleichmäßigen Rauschens.
 */
const STRANDS = 30;
const PER_STRAND = 101;       // 108 bei 300 Grad, auf 280 umgerechnet
/*
 * Runde Enden am Ring. Im Logo endet der Bogen mit einem Halbkreis, im Kreis
 * war er gerade abgeschnitten, und die Schnittkante las sich als Kante. Der
 * Bogen läuft dafür an beiden Enden um den Winkel weiter, der einem halben
 * Strich entspricht, und wird dort zum Halbkreis verjüngt.
 */
const KAPPE = TUBE / R;
// Ohne Kappen. Mit Kappen werden es mehr, siehe buildParticles.
const RING_PARTICLES = STRANDS * PER_STRAND;
/*
 * Die Punktzahl des Stamms folgt seiner Fläche, nicht dem Gefühl.
 *
 * Der Ring trägt rund 0,0206 Punkte je Quadrateinheit. Der Stamm misst 140
 * mal 463 (von y 20 bis zur Ringmitte), also 64820 Einheiten, und braucht bei
 * gleicher Dichte rund 1335. Mit zu wenig Punkten wirkte der Ring dicht, der
 * Stamm ausgefranst, und das d las sich als zerrissener Buchstabe.
 */
const STEM_PARTICLES = 1335;
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
    // Jeder Faden trägt Radius und Phase für Ring und Stamm gemeinsam. An der
    // Naht läuft so derselbe Faden weiter, statt dass zwei fremde Fäden
    // aneinanderstossen.
    this.fadenR = new Float32Array(STRANDS);
    this.fadenSeed = new Float32Array(STRANDS);
    for (let strand = 0; strand < STRANDS; strand++) {
      this.fadenR[strand] = 0.55 + Math.random() * 0.45;
      this.fadenSeed[strand] = Math.random() * Math.PI * 2;
    }

    // Die Kappen verlängern jeden Faden. Damit die Dichte je Fläche gleich
    // bleibt, wächst die Zahl der Punkte im selben Verhältnis wie die Länge.
    const proFaden = Math.round(PER_STRAND * (sweepRad + 2 * KAPPE) / sweepRad);
    const ring = [];
    for (let strand = 0; strand < STRANDS; strand++) {
      const b0 = (strand / STRANDS) * Math.PI * 2;
      const rScale = this.fadenR[strand];
      const seed = this.fadenSeed[strand];
      for (let j = 0; j < proFaden; j++) {
        const t = (j + Math.random() * 0.6) / proFaden;
        const a = -KAPPE + t * (sweepRad + 2 * KAPPE);
        // In der Kappe wird der Schlauch zum Halbkreis. Ein Punkt bleibt dort
        // nur mit der Wahrscheinlichkeit der verbleibenden Breite, sonst
        // drängen sich alle Punkte eines Fadens in der Spitze, und die Enden
        // leuchten heller als der Bogen.
        const ueber = a < 0 ? -a : a > sweepRad ? a - sweepRad : 0;
        const kappe = ueber > 0 ? Math.sqrt(Math.max(0, 1 - (ueber / KAPPE) ** 2)) : 1;
        if (kappe < 1 && Math.random() > kappe) continue;
        ring.push(
          a,
          b0 + (Math.random() - 0.5) * 0.18,
          rScale * kappe * (0.9 + Math.random() * 0.2),
          seed,
          2.1 + Math.random() * 1.8,
        );
      }
    }
    this.ring = Float32Array.from(ring); // a, b, r, seed, size
    this.ringCount = ring.length / 5;
    // Eine feste Zufallszahl je Punkt für den weichen Übergang am Stamm.
    this.ringLos = new Float32Array(this.ringCount).map(() => Math.random());
    let k = 0;
    // Der Stamm ist dieselbe Form wie der Ring, nur gerade: ein Schlauch mit
    // runden Enden. Also bekommt er auch dieselbe Struktur, 30 Faeden um den
    // Schlauch herum.
    //
    // Vorher wurden die Punkte im umschliessenden Rechteck gewuerfelt und
    // ausserhalb der Kapsel verworfen. Das ergab eine gleichmaessig gefuellte
    // Flaeche, waehrend der Ring als Buendel aus Faeden lief. Zwei Texturen in
    // einem Buchstaben, und der Stamm wirkte wie ein aufgeklebter Balken.
    //
    // Statt zu verwerfen wird jetzt gerechnet. Zu jeder Hoehe steht fest, wie
    // weit der Schlauch dort reicht: in der Mitte der volle Radius, am oberen
    // Ende der halbe Kreis. Der Punkt sitzt auf seinem Faden bei cos(b) mal
    // dieser Weite und liegt damit immer drin. Die runden Enden entstehen
    // dabei von selbst, weil die Faeden dort zusammenlaufen.
    const stemCx = STEM_X + STEM_W / 2;
    const capR = STEM_W / 2;
    const yTopCap = STEM_TOP + capR;
    // Unten kein rundes Ende: der Stamm endet auf Höhe der Ringmitte im Ring.
    const yUnten = CY;
    const PRO_STAMM_FADEN = Math.round(STEM_PARTICLES / STRANDS);
    this.stemCount = STRANDS * PRO_STAMM_FADEN;
    this.stem = new Float32Array(this.stemCount * 5); // b, y, weite, seed, size
    k = 0;
    for (let strand = 0; strand < STRANDS; strand++) {
      const b0 = (strand / STRANDS) * Math.PI * 2;
      const rScale = this.fadenR[strand];
      const seed = this.fadenSeed[strand];
      for (let j = 0; j < PRO_STAMM_FADEN; j++) {
        let y = STEM_TOP + Math.random() * (yUnten - STEM_TOP);
        let weite = capR;
        // Dieselbe Verjüngung wie an den Ringenden: in der Kappe bleibt ein
        // Punkt nur mit der Wahrscheinlichkeit der Breite, sonst wird neu
        // gezogen. Sonst leuchtet die Spitze heller als der Stamm.
        while (y < yTopCap) {
          const dy = y - yTopCap;
          // Die halbe Sehne des Kreises auf dieser Hoehe. Hier einmal beim
          // Bauen gerechnet, damit im Bild pro Punkt keine Wurzel anfaellt.
          weite = Math.sqrt(Math.max(0, capR * capR - dy * dy));
          if (Math.random() <= weite / capR) break;
          y = STEM_TOP + Math.random() * (yUnten - STEM_TOP);
          weite = capR;
        }
        this.stem[k++] = b0 + (Math.random() - 0.5) * 0.18;
        this.stem[k++] = y;
        this.stem[k++] = weite * rScale * (0.9 + Math.random() * 0.2);
        this.stem[k++] = seed;
        this.stem[k++] = 2.1 + Math.random() * 1.8;
      }
    }
    this.stemCx = stemCx;

    // Ziel für die berechneten Bildpunkte: x, y, grösse, Helligkeitsstufe
    // Die Grösse kommt aus `stemCount` und nicht aus der Konstante. Die Zahl
    // der Faeden rundet, und bei einem Wert, der nicht durch STRANDS teilbar
    // ist, entstehen mehr Punkte als die Konstante sagt. Der Puffer waere dann
    // zu klein, und Float32Array schreibt still nicht weiter: der Stamm haette
    // ein Stueck weniger, ohne Fehlermeldung.
    this.out = new Float32Array((this.ringCount + this.stemCount) * 4);
  }

  /**
   * Grösse neu setzen.
   *
   * Nur die Breite wird gemessen, die Höhe kommt daraus. Der Kreis ist
   * quadratisch, und die Höhe des Knopfes hängt am Canvas: liest man beide
   * Seiten aus dem Element, hält sich eine einmal zu gross gesetzte Höhe für
   * immer, weil das Canvas sie selbst erzeugt. Genau das ist passiert, als der
   * Kreis beim ersten Gespräch schrumpfen sollte und stattdessen oben
   * abgeschnitten stehen blieb.
   */
  resize() {
    const rect = this.el.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const kante = Math.round(rect.width * dpr);
    if (this.canvas.width === kante) return;
    this.canvas.width = kante;
    this.canvas.height = kante;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.width}px`;
    this.scale = kante / DESIGN;
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

    // Wo Stamm und Ring übereinanderliegen, zeichnet nur der Stamm. Beide
    // zusammen ergäben dort die doppelte Dichte, und die Naht stünde als
    // dunklerer Fleck im Buchstaben. Geprüft wird die aktuelle Lage und
    // nicht die Ruhelage, denn die Punkte wandern mit der Drehung durch den
    // Schlauch.
    //
    // Die Grenze ist weich. Ein harter Schnitt am Rand des Stamms liess dort
    // eine helle Fuge stehen, weil der Stamm an seinem Rand dünner besetzt
    // ist als in der Mitte: nicht jeder Faden reicht bis ganz aussen. Im
    // Übergang bleibt ein Ringpunkt mit wachsender Wahrscheinlichkeit
    // stehen, gewählt über eine feste Zahl je Punkt, damit nichts flackert.
    const innen = TUBE * 0.7;
    const aussen = TUBE * 1.15;
    for (let i = 0; i < this.ringCount; i++) {
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

      const px = CX + Math.cos(angle) * radial;
      const py = CY + Math.sin(angle) * radial;
      if (py < CY) {
        const dx = Math.abs(px - this.stemCx);
        if (dx < aussen) {
          const u = Math.max(0, (dx - innen) / (aussen - innen));
          const behalten = u * u * (3 - 2 * u);
          if (this.ringLos[i] >= behalten) continue;
        }
      }
      out[o++] = px;
      out[o++] = py;
      out[o++] = size * (0.6 + depth * 0.7);
      out[o++] = depth * m.bright;
    }

    for (let i = 0; i < this.stemCount; i++) {
      const p = i * 5;
      // Dieselbe Drehung wie beim Ring, 0.45 je Sekunde. Liefen beide Teile
      // verschieden schnell, zerfiele der Buchstabe beim Zusehen in zwei.
      const bAng = this.stem[p] + t * 0.45;
      const y = this.stem[p + 1];
      const weite = this.stem[p + 2];
      const seed = this.stem[p + 3];
      const size = this.stem[p + 4];
      // Der Stamm wogt mit derselben Welle wie der Ring, als liefe der Bogen
      // von drei Uhr aus geradeaus nach oben weiter. An der Naht haben beide
      // damit denselben Wert und dieselbe Steigung, und es entsteht kein
      // Knick. Vorher hatte der Stamm eine eigene, schwächere Welle, und die
      // Naht stand als Kante im Buchstaben.
      const a = Math.PI / 2 - (CY - y) / R;
      const wobble = (
        Math.sin(a * 3 + t * 1.1 + seed) * 0.6 +
        Math.sin(a * 5 - t * 0.7 + seed * 1.7) * 0.3 +
        Math.sin(a * 8 + t * 1.9) * 0.2
      ) * m.amp;
      // Dieselbe Tiefenformel wie beim Ring, damit beide gleich hell wirken.
      const depth = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(bAng));

      out[o++] = this.stemCx + Math.cos(bAng) * weite + wobble;
      out[o++] = y;
      out[o++] = size * (0.6 + depth * 0.7);
      out[o++] = Math.min(1, depth * m.bright * 1.1);
    }

    const total = o / 4;
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
