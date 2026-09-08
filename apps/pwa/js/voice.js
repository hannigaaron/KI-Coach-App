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
 *
 * Warum das Zuhören so gebaut ist, wie es gebaut ist
 *
 * Die Spracherkennung des Browsers ist nicht dafür gemacht, minutenlang zu
 * laufen. Sie beendet sich selbst: nach einer Sprechpause, nach einer
 * Zeitspanne ohne Ton, bei einem Wechsel der Netzverbindung, und in Safari
 * regelmässig ohne erkennbaren Grund. Wer sie einfach laufen lässt, verliert
 * mitten im Satz die Aufnahme.
 *
 * Deshalb gilt hier: der Nutzer bestimmt, wann Schluss ist, nicht die
 * Erkennung. Beendet sich die Erkennung von selbst, wird sie sofort neu
 * gestartet und der bisherige Text bleibt erhalten. Abgeschickt wird erst,
 * wenn der Nutzer wirklich fertig ist, erkannt an einer Sprechpause von
 * PAUSE_MS, oder wenn er selbst auf Fertig tippt.
 */

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;

/** Sprechpause, nach der ein Satz als beendet gilt. */
const PAUSE_MS = 2200;
/** Wartezeit, bevor aufgegeben wird, wenn noch gar nichts gesagt wurde. */
const STILLE_MS = 9000;
/** Obergrenze für eine einzelne Aufnahme. Schützt vor einem offenen Mikrofon. */
const MAX_MS = 120000;
/** Pause vor einem Neustart. Ohne die lehnt Safari den Start ab. */
const NEUSTART_MS = 220;

export const voiceSupport = {
  erkennung: Boolean(Recognition),
  ausgabe: typeof globalThis.speechSynthesis !== "undefined",
};

export class Listener {
  /**
   * `pauseMs` und `maxMs` lassen sich überschreiben.
   *
   * Der Grund ist der Schwall: wer alles rausredet, was ihm im Kopf herumgeht,
   * denkt zwischendurch nach. Zwei Sekunden Stille sind dann kein Satzende,
   * sondern eine Denkpause. Wird dort abgeschickt, zerfällt ein Gedanke in
   * fünf Nachrichten, und genau das soll die Funktion ja verhindern.
   */
  constructor({ onPartial, onFinal, onState, onLevel, pauseMs, maxMs, stilleMs }) {
    this.onPartial = onPartial ?? (() => {});
    this.onFinal = onFinal ?? (() => {});
    this.onState = onState ?? (() => {});
    this.onLevel = onLevel ?? (() => {});
    this.recognition = null;
    this.stream = null;
    this.audio = null;
    this.raf = 0;
    /** Der Nutzer will zuhören lassen. Unabhängig davon, ob die Erkennung gerade läuft. */
    this.active = false;
    this.handsFree = false;
    /** Text aus abgeschlossenen Teilstücken, überlebt jeden Neustart. */
    this.gesammelt = "";
    this.pauseTimer = 0;
    this.maxTimer = 0;
    this.neustarts = 0;
    this.messerAus = false;
    this.pauseMs = pauseMs ?? PAUSE_MS;
    this.maxMs = maxMs ?? MAX_MS;
    this.stilleMs = stilleMs ?? STILLE_MS;
  }

  get supported() {
    return voiceSupport.erkennung;
  }

  /** Alles, was bisher verstanden wurde, inklusive des laufenden Teilstücks. */
  text(interim = "") {
    return `${this.gesammelt} ${interim}`.replace(/\s+/g, " ").trim();
  }

  async start() {
    if (!this.supported || this.active) return false;
    this.active = true;
    this.gesammelt = "";
    this.neustarts = 0;
    this.onState("listening");
    await this.startMeter();

    this.maxTimer = setTimeout(() => this.fertig("zeit"), this.maxMs);
    this.planePause(this.stilleMs);
    this.starteErkennung();
    return true;
  }

  /**
   * Startet die Erkennung. Wird nach jedem selbstständigen Ende erneut
   * aufgerufen, solange der Nutzer nicht auf Fertig getippt hat.
   */
  starteErkennung() {
    if (!this.active) return;
    const recognition = new Recognition();
    recognition.lang = "de-DE";
    recognition.interimResults = true;
    // continuous hält die Erkennung über kurze Pausen hinweg offen. Safari
    // ignoriert das teilweise, der Neustart unten fängt das auf.
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    const gestartet = Date.now();
    let hatEtwasGehoert = false;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) this.gesammelt = `${this.gesammelt} ${result[0].transcript}`.trim();
        else interim += result[0].transcript;
      }
      hatEtwasGehoert = true;
      this.letzterInterim = interim;
      this.onPartial(this.text(interim));
      // Jedes gehörte Wort schiebt das Ende nach hinten. Wer weiterredet,
      // wird nicht unterbrochen.
      this.planePause(this.pauseMs);
    };

    recognition.onspeechstart = () => {
      hatEtwasGehoert = true;
      this.planePause(this.pauseMs);
    };

    recognition.onerror = (event) => {
      const fehler = event.error;
      // no-speech und aborted sind der Normalfall beim Warten und beim
      // Neustart. network und audio-capture treten auf Mobilgeräten sporadisch
      // auf. Alle vier sind kein Grund, die Aufnahme wegzuwerfen.
      if (fehler === "not-allowed" || fehler === "service-not-allowed") {
        this.onState("error", "Zugriff auf das Mikrofon verweigert");
        this.abbrechen();
        return;
      }
      if (fehler !== "no-speech" && fehler !== "aborted" && fehler !== "network" && fehler !== "audio-capture") {
        this.onState("error", fehler);
      }
    };

    recognition.onend = () => {
      if (!this.active) return;
      // Die Erkennung hat sich selbst beendet, der Nutzer nicht. Also weiter.
      this.neustarts++;

      // Bricht sie sofort wieder ab, ohne je etwas gehört zu haben, liegt das
      // meistens am parallel laufenden Pegelmesser. Der wird dann geopfert,
      // der Kreis pulsiert danach erzeugt statt nach echtem Pegel.
      if (!hatEtwasGehoert && Date.now() - gestartet < 500 && this.audio && this.neustarts >= 2) {
        this.messerAus = true;
        this.stopMeter();
        this.startMeter();
      }

      if (this.neustarts > 40) {
        this.fertig("zu viele Neustarts");
        return;
      }
      setTimeout(() => this.starteErkennung(), NEUSTART_MS);
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      // Kommt vor, wenn die alte Instanz noch nicht ganz zu ist. Später nochmal.
      setTimeout(() => this.starteErkennung(), NEUSTART_MS * 2);
    }
  }

  /** Setzt die Uhr neu, nach deren Ablauf die Eingabe als beendet gilt. */
  planePause(ms) {
    clearTimeout(this.pauseTimer);
    this.pauseTimer = setTimeout(() => this.fertig("pause"), ms);
  }

  /** Der Nutzer tippt auf Fertig. Der Text geht raus, auch mitten im Satz. */
  stop() {
    this.handsFree = false;
    this.fertig("nutzer");
  }

  /**
   * Beendet die Aufnahme und schickt ab, was verstanden wurde.
   * Ohne Text wird nichts geschickt, im Freihandmodus wird neu gehört.
   */
  fertig() {
    if (!this.active) return;
    this.active = false;
    clearTimeout(this.pauseTimer);
    clearTimeout(this.maxTimer);
    this.loeseErkennung();
    this.stopMeter();
    this.onState("idle");

    const text = this.text(this.letzterInterim || "");
    this.gesammelt = "";
    this.letzterInterim = "";
    if (text) this.onFinal(text);
    else if (this.handsFree) setTimeout(() => this.start(), 400);
  }

  /** Bricht ab und wirft weg. Nur bei verweigertem Mikrofon. */
  abbrechen() {
    this.active = false;
    this.handsFree = false;
    clearTimeout(this.pauseTimer);
    clearTimeout(this.maxTimer);
    this.loeseErkennung();
    this.stopMeter();
    this.gesammelt = "";
    this.letzterInterim = "";
    this.onState("idle");
  }

  loeseErkennung() {
    const recognition = this.recognition;
    this.recognition = null;
    if (!recognition) return;
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
    try { recognition.stop(); } catch { /* schon beendet */ }
    try { recognition.abort(); } catch { /* kennt nicht jeder Browser */ }
  }

  async startMeter() {
    if (this.audio || this.messerAus) return this.startErsatzMeter();
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
      this.startErsatzMeter();
    }
  }

  /** Erzeugte Welle, damit der Kreis auch ohne echten Pegel lebt. */
  startErsatzMeter() {
    cancelAnimationFrame(this.raf);
    let phase = 0;
    const tick = () => {
      if (!this.active) return;
      phase += 0.09;
      this.onLevel(0.32 + Math.sin(phase) * 0.22 + Math.sin(phase * 2.3) * 0.1);
      this.raf = requestAnimationFrame(tick);
    };
    tick();
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

/**
 * Deutsche Stimmen, die das Gerät anbietet, sortiert nach Eignung.
 *
 * Vorher nahm die App die erste deutsche Stimme aus der Liste. Auf einem iPhone
 * ist das die weibliche Standardstimme in Basisqualität, und die klingt genau
 * so abgehackt, wie ein Sprachassistent klingen kann.
 *
 * Sortiert wird nach drei Kriterien, in dieser Reihenfolge:
 *
 * 1. Qualität. Apple und Google liefern zu vielen Stimmen eine bessere Variante
 *    nach, erkennbar an "Enhanced", "Premium" oder "Neural" im Namen. Der
 *    Unterschied zwischen Basis und Premium ist grösser als der zwischen zwei
 *    verschiedenen Stimmen.
 * 2. Geschlecht. Männliche Stimmen zuerst, weil der Nutzer das so will. Die
 *    Namensliste deckt die gängigen deutschen Systemstimmen ab. Welche davon
 *    installiert sind, unterscheidet sich je Gerät, deshalb ist die Liste eine
 *    Reihenfolge und keine Bedingung.
 * 3. Lokal vor Netz. Eine lokale Stimme fängt sofort an, eine Netzstimme
 *    stockt beim ersten Satz.
 */
const MAENNLICHE_STIMMEN = [
  "markus", "yannick", "martin", "viktor", "conrad", "daniel", "stefan",
  "hans", "klaus", "reed", "rocko", "eddy", "grandpa",
];

export function deutscheStimmen() {
  if (!voiceSupport.ausgabe) return [];
  const alle = globalThis.speechSynthesis.getVoices() || [];
  return alle
    .filter((v) => v.lang && v.lang.toLowerCase().startsWith("de"))
    .map((v) => ({ stimme: v, punkte: stimmPunkte(v) }))
    .sort((a, b) => b.punkte - a.punkte)
    .map((x) => x.stimme);
}

function stimmPunkte(v) {
  const name = (v.name || "").toLowerCase();
  let punkte = 0;
  if (/premium|neural|enhanced|natural/.test(name)) punkte += 100;
  if (MAENNLICHE_STIMMEN.some((m) => name.includes(m))) punkte += 40;
  if (v.localService) punkte += 10;
  // Eine "Eloquence" Stimme auf iOS ist die alte Roboterstimme aus den
  // Neunzigern. Die will niemand hören.
  if (/eloquence|compact/.test(name)) punkte -= 60;
  return punkte;
}

/** Die Stimme, die gesprochen wird. Erst die gewählte, sonst die beste. */
export function gewaehlteStimme(name) {
  const liste = deutscheStimmen();
  if (name) {
    const treffer = liste.find((v) => v.name === name);
    if (treffer) return treffer;
  }
  return liste[0] || null;
}

/**
 * Liest eine Antwort vor. Bricht eine laufende Ausgabe vorher ab.
 *
 * Tempo und Tonhöhe leicht unter dem Standard. Die Voreinstellung klingt
 * gehetzt, und gehetzt klingt maschinell. 0,96 ist knapp unter Normaltempo,
 * hörbar ruhiger, ohne schleppend zu wirken.
 */
export function speak(text, { onStart, onEnd, enabled = true, stimme, tempo } = {}) {
  if (!enabled || !voiceSupport.ausgabe || !text) {
    onEnd?.();
    return;
  }
  const synth = globalThis.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(stripForSpeech(text));
  utterance.lang = "de-DE";
  utterance.rate = Number.isFinite(tempo) ? Math.max(0.7, Math.min(1.3, tempo)) : 0.96;
  utterance.pitch = 0.95;
  const gewaehlt = gewaehlteStimme(stimme);
  if (gewaehlt) utterance.voice = gewaehlt;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
}

export function stopSpeaking() {
  if (voiceSupport.ausgabe) globalThis.speechSynthesis.cancel();
}

/**
 * Text für die Sprachausgabe aufbereiten.
 *
 * Der grösste Teil des Roboterklangs kommt nicht von der Stimme, sondern vom
 * Text. Eine Aufzählung mit Bindestrichen liest die Engine als eine einzige
 * atemlose Kette, Abkürzungen buchstabiert sie, und Uhrzeiten mit Doppelpunkt
 * werden zu "sieben Doppelpunkt drei null".
 *
 * Ein Punkt am Ende einer Aufzählungszeile erzeugt eine echte Sprechpause. Das
 * ist der billigste und wirksamste Hebel, den es hier gibt.
 */
function stripForSpeech(text) {
  return text
    // Aufzählungszeichen am Zeilenanfang raus, dafür eine Pause dahinter.
    .replace(/^\s*[-*•]\s*/gm, "")
    // Zeilen ohne Satzzeichen am Ende bekommen einen Punkt, sonst hetzt die
    // Engine ohne Luft in die nächste Zeile.
    .replace(/([^.!?:,])\n/g, "$1.\n")
    .replace(/\bkcal\b/gi, "Kilokalorien")
    .replace(/(\d)\s*g\b/g, "$1 Gramm")
    .replace(/(\d)\s*ml\b/g, "$1 Milliliter")
    .replace(/(\d)\s*kg\b/g, "$1 Kilo")
    .replace(/(\d)\s*km\b/g, "$1 Kilometer")
    .replace(/(\d)\s*min\b/gi, "$1 Minuten")
    .replace(/(\d)\s*h\b/g, "$1 Stunden")
    // Uhrzeiten: "14:30" wird sonst als Doppelpunkt gelesen.
    .replace(/\b(\d{1,2}):(00)\b/g, "$1 Uhr")
    .replace(/\b(\d{1,2}):(\d{2})\b/g, "$1 Uhr $2")
    .replace(/\bz\.\s?B\./gi, "zum Beispiel")
    .replace(/\bca\./gi, "circa")
    .replace(/\busw\./gi, "und so weiter")
    .replace(/\bbzw\./gi, "beziehungsweise")
    .replace(/\bEUR\b|€/g, "Euro")
    .replace(/\bTDEE\b/g, "Tagesbedarf")
    .replace(/\bPT\b/g, "Personal Training")
    // Mehrfache Leerzeichen und Zeilen zusammenfassen, Absätze werden zu Pausen.
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
}
