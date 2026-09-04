/**
 * Sprache: zuhören, antworten, Pegel messen.
 *
 * Drei Dinge, die unabhängig voneinander ausfallen können:
 * 1. Spracherkennung. In Safari und Chrome vorhanden, in Firefox nicht.
 * 2. Sprachausgabe. Fast überall vorhanden, die Stimmen unterscheiden sich.
 * 3. Mikrofonpegel über die Web Audio API, nur für die Animation.
 *
 * Punkt 3 läuft parallel zu Punkt 1 auf dieselbe Aufnahme. Manche Browser
 * lassen das nicht zu. Deshalb fällt der Pegel bei einem Fehler auf eine
 * erzeugte Welle zurück, damit der Kreis trotzdem lebt.
 */

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

export const voiceSupport = {
  erkennung: Boolean(Recognition),
  ausgabe: typeof globalThis.speechSynthesis !== "undefined",
};

export class Listener {
  constructor({ onPartial, onFinal, onState, onLevel }) {
    this.onPartial = onPartial ?? (() => {});
    this.onFinal = onFinal ?? (() => {});
    this.onState = onState ?? (() => {});
    this.onLevel = onLevel ?? (() => {});
    this.recognition = null;
    this.stream = null;
    this.audio = null;
    this.raf = 0;
    this.active = false;
    this.handsFree = false;
  }

  get supported() {
    return voiceSupport.erkennung;
  }

  async start() {
    if (!this.supported || this.active) return false;
    this.active = true;
    this.onState("listening");
    await this.startMeter();

    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let letzter = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) letzter += result[0].transcript;
        else interim += result[0].transcript;
      }
      this.onPartial((letzter + interim).trim());
    };
    recognition.onerror = (event) => {
      // "no-speech" und "aborted" sind normal, kein Grund für eine Meldung.
      if (event.error !== "no-speech" && event.error !== "aborted") {
        this.onState("error", event.error);
      }
    };
    recognition.onend = () => {
      this.stopMeter();
      this.active = false;
      const text = letzter.trim();
      this.onState("idle");
      if (text) this.onFinal(text);
      else if (this.handsFree) this.start();
    };

    this.recognition = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      this.active = false;
      this.stopMeter();
      this.onState("idle");
      return false;
    }
  }

  stop() {
    this.handsFree = false;
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* schon beendet */ }
    }
    this.stopMeter();
    this.active = false;
    this.onState("idle");
  }

  async startMeter() {
    if (this.audio) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
      const source = context.createMediaStreamSource(this.stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      this.audio = { context, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
      const tick = () => {
        if (!this.audio) return;
        this.audio.analyser.getByteTimeDomainData(this.audio.data);
        let sum = 0;
        for (const value of this.audio.data) {
          const centered = (value - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / this.audio.data.length);
        this.onLevel(Math.min(1, rms * 4));
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Kein Mikrofonzugriff für die Messung. Der Kreis pulsiert dann erzeugt.
      this.audio = null;
      let phase = 0;
      const tick = () => {
        if (!this.active) return;
        phase += 0.09;
        this.onLevel(0.32 + Math.sin(phase) * 0.22 + Math.sin(phase * 2.3) * 0.1);
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    }
  }

  stopMeter() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.onLevel(0);
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.audio) {
      this.audio.context.close().catch(() => {});
      this.audio = null;
    }
  }
}

/** Liest eine Antwort vor. Bricht eine laufende Ausgabe vorher ab. */
export function speak(text, { onStart, onEnd, enabled = true } = {}) {
  if (!enabled || !voiceSupport.ausgabe || !text) {
    onEnd?.();
    return;
  }
  const synth = globalThis.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(stripForSpeech(text));
  utterance.lang = "de-DE";
  utterance.rate = 1.05;
  utterance.pitch = 1;
  const german = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith("de"));
  if (german) utterance.voice = german;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (voiceSupport.ausgabe) globalThis.speechSynthesis.cancel();
}

/** Zahlen und Einheiten so umschreiben, dass die Ausgabe natürlich klingt. */
function stripForSpeech(text) {
  return text
    .replace(/\bkcal\b/g, "Kilokalorien")
    .replace(/(\d)\s*g\b/g, "$1 Gramm")
    .replace(/(\d)\s*ml\b/g, "$1 Milliliter")
    .replace(/\s+/g, " ")
    .trim();
}
