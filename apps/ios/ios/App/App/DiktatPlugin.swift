import Foundation
import Capacitor
import AVFoundation
import Speech

/// Die Spracherkennung der iPhone App, nativ statt über die Web Ansicht.
///
/// Die Web Ansicht bot nur `webkitSpeechRecognition`. Die kennt keine
/// Fachwörter, bricht nach Pausen ab und schrieb im Betrieb aus "zwei Sätze
/// breite Klimmzüge" ein "zwei Sitze breite Umzüge". Dieses Plugin nimmt zwei
/// Wege, den besseren zuerst:
///
/// - Ab iOS 26 `SpeechAnalyzer` mit `SpeechTranscriber`. Das ist Apples neue
///   Erkennung auf dem Gerät, für lange Aufnahmen gebaut und ohne Zeitlimit.
///   Auf ihr baut auch Yap auf. Ob Deutsch dabei ist, fragt das Plugin bei
///   iOS selbst ab, und das Sprachpaket wird beim ersten Mal geladen.
/// - Davor oder ohne Deutsch `SFSpeechRecognizer`, mit Fachwörtern über
///   `contextualStrings`. Ein Abschnitt endet dort nach Stille oder rund einer
///   Minute, deshalb beginnt sofort ein neuer, solange aufgenommen wird.
///
/// Die Web App fragt den Stand alle paar hundert Millisekunden ab, statt auf
/// Ereignisse zu warten. Ereignisse bräuchten `@capacitor/core` im Browser,
/// und die Web App hat keinen Bundler und soll dafür keine Abhängigkeit
/// bekommen. Ein Abruf kostet weniger als ein Bild des Kreises.
///
/// Der Code für iOS 26 steht hinter `#if compiler(>=6.2)`: mit einem älteren
/// Xcode fehlt die Schnittstelle, und das Projekt soll trotzdem bauen.
@objc(DiktatPlugin)
public class DiktatPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DiktatPlugin"
    public let jsName = "Diktat"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "verfuegbar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "berechtigen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "starten", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stand", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stoppen", returnType: CAPPluginReturnPromise),
    ]

    private let zustand = DiktatZustand()
    private var motor: DiktatMotor?

    @objc func verfuegbar(_ call: CAPPluginCall) {
        Task {
            var neu = false
            #if compiler(>=6.2)
            if #available(iOS 26.0, *) { neu = await NeuMotor.deutsch() != nil }
            #endif
            let alt = SFSpeechRecognizer(locale: Locale(identifier: "de-DE"))?.isAvailable ?? false
            call.resolve(["verfuegbar": neu || alt, "motor": neu ? "speechanalyzer" : (alt ? "sfspeech" : "")])
        }
    }

    @objc func berechtigen(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { mikro in
            SFSpeechRecognizer.requestAuthorization { status in
                call.resolve(["mikrofon": mikro, "erkennung": status == .authorized])
            }
        }
    }

    @objc func starten(_ call: CAPPluginCall) {
        let woerter = (call.getArray("woerter", String.self) ?? []).prefix(100).map { $0 }
        Task {
            await motor?.stoppen()
            motor = nil
            zustand.zuruecksetzen()
            var fehler: Error?
            #if compiler(>=6.2)
            if #available(iOS 26.0, *), await NeuMotor.deutsch() != nil {
                let m = NeuMotor(zustand: zustand)
                do {
                    try await m.starten(woerter: woerter)
                    motor = m
                    call.resolve(["motor": m.name])
                    return
                } catch {
                    // Etwa wenn das Sprachpaket nicht geladen werden kann. Dann
                    // der alte Weg, statt gar keiner Erkennung.
                    await m.stoppen()
                    fehler = error
                }
            }
            #endif
            let alt = AltMotor(zustand: zustand)
            do {
                try await alt.starten(woerter: woerter)
                motor = alt
                call.resolve(["motor": alt.name, "hinweis": fehler?.localizedDescription ?? ""])
            } catch {
                call.reject("Die Spracherkennung liess sich nicht starten: \(error.localizedDescription)")
            }
        }
    }

    @objc func stand(_ call: CAPPluginCall) {
        call.resolve(zustand.schnappschuss())
    }

    @objc func stoppen(_ call: CAPPluginCall) {
        Task {
            await motor?.stoppen()
            motor = nil
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
            call.resolve(zustand.schnappschuss())
        }
    }
}

enum DiktatFehler: LocalizedError {
    case nichtVerfuegbar
    case keinDeutsch
    var errorDescription: String? {
        switch self {
        case .nichtVerfuegbar: return "Die Spracherkennung ist auf diesem Gerät gerade nicht verfügbar."
        case .keinDeutsch: return "Für Deutsch gibt es auf diesem Gerät keine Erkennung."
        }
    }
}

/// Was bisher verstanden wurde. Fest ist, was die Erkennung abgeschlossen hat,
/// laufend das Stück, das sich noch ändern kann.
final class DiktatZustand {
    private let sperre = NSLock()
    private var fest = ""
    private var laufend = ""
    private var fehler = ""

    func zuruecksetzen() { sperre.lock(); fest = ""; laufend = ""; fehler = ""; sperre.unlock() }

    /// Ein abgeschlossenes Stück kommt hinten an, das laufende ist damit erledigt.
    func festhalten(_ text: String) {
        sperre.lock()
        let t = text.trimmingCharacters(in: .whitespaces)
        if !t.isEmpty { fest = fest.isEmpty ? t : "\(fest) \(t)" }
        laufend = ""
        sperre.unlock()
    }

    func laufendSetzen(_ text: String) { sperre.lock(); laufend = text; sperre.unlock() }

    /// Bricht ein Abschnitt ohne Abschluss ab, gilt das Laufende als gesagt.
    func laufendFesthalten() {
        sperre.lock()
        let t = laufend.trimmingCharacters(in: .whitespaces)
        if !t.isEmpty { fest = fest.isEmpty ? t : "\(fest) \(t)" }
        laufend = ""
        sperre.unlock()
    }

    func fehlerSetzen(_ text: String) { sperre.lock(); fehler = text; sperre.unlock() }

    func schnappschuss() -> [String: Any] {
        sperre.lock()
        defer { sperre.unlock() }
        let text = [fest, laufend].filter { !$0.isEmpty }.joined(separator: " ")
        return ["text": text, "fehler": fehler]
    }
}

protocol DiktatMotor: AnyObject {
    var name: String { get }
    func starten(woerter: [String]) async throws
    func stoppen() async
}

/// Aufnahme für beide Wege. Wiedergabe bleibt erlaubt, damit die Stimme von
/// daevo danach nicht stumm ist.
func diktatAudioSitzung() throws {
    let sitzung = AVAudioSession.sharedInstance()
    try sitzung.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .duckOthers])
    try sitzung.setActive(true, options: .notifyOthersOnDeactivation)
}

/// Der Weg bis iOS 25 und ohne deutsches Sprachpaket.
final class AltMotor: DiktatMotor {
    let name = "sfspeech"
    private let zustand: DiktatZustand
    private let erkenner = SFSpeechRecognizer(locale: Locale(identifier: "de-DE"))
    private let engine = AVAudioEngine()
    private var anfrage: SFSpeechAudioBufferRecognitionRequest?
    private var aufgabe: SFSpeechRecognitionTask?
    private var woerter: [String] = []
    private var aktiv = false
    /// Abschnitte hintereinander, die ohne ein einziges Wort endeten. Ab fünf
    /// stimmt etwas nicht, und ein neuer Abschnitt hülfe nicht mehr.
    private var leer = 0

    init(zustand: DiktatZustand) { self.zustand = zustand }

    func starten(woerter: [String]) async throws {
        guard let erkenner = erkenner, erkenner.isAvailable else { throw DiktatFehler.nichtVerfuegbar }
        self.woerter = woerter
        try diktatAudioSitzung()
        let eingang = engine.inputNode
        let format = eingang.outputFormat(forBus: 0)
        eingang.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] puffer, _ in
            self?.anfrage?.append(puffer)
        }
        engine.prepare()
        try engine.start()
        aktiv = true
        neuerAbschnitt()
    }

    private func neuerAbschnitt() {
        guard aktiv, let erkenner = erkenner else { return }
        let a = SFSpeechAudioBufferRecognitionRequest()
        a.shouldReportPartialResults = true
        a.contextualStrings = woerter
        if #available(iOS 16.0, *) { a.addsPunctuation = true }
        anfrage = a
        var etwas = false
        aufgabe = erkenner.recognitionTask(with: a) { [weak self] ergebnis, fehler in
            guard let self = self else { return }
            if let e = ergebnis {
                etwas = true
                let text = e.bestTranscription.formattedString
                if e.isFinal { self.zustand.festhalten(text) } else { self.zustand.laufendSetzen(text) }
            }
            if (ergebnis?.isFinal ?? false) || fehler != nil {
                self.zustand.laufendFesthalten()
                self.leer = etwas ? 0 : self.leer + 1
                if self.leer >= 5 {
                    self.zustand.fehlerSetzen(fehler?.localizedDescription ?? "Die Erkennung hört nichts.")
                    return
                }
                if self.aktiv { DispatchQueue.main.async { self.neuerAbschnitt() } }
            }
        }
    }

    func stoppen() async {
        guard aktiv || aufgabe != nil else { return }
        aktiv = false
        engine.stop()
        engine.inputNode.removeTap(onBus: 0)
        anfrage?.endAudio()
        // Kurz warten, damit der letzte Abschnitt abgeschlossen ankommt.
        try? await Task.sleep(nanoseconds: 700_000_000)
        aufgabe?.cancel()
        aufgabe = nil
        anfrage = nil
        zustand.laufendFesthalten()
    }
}

#if compiler(>=6.2)
/// Der Weg ab iOS 26.
@available(iOS 26.0, *)
final class NeuMotor: DiktatMotor {
    let name = "speechanalyzer"
    private let zustand: DiktatZustand
    private let engine = AVAudioEngine()
    private var analyzer: SpeechAnalyzer?
    private var eingabe: AsyncStream<AnalyzerInput>.Continuation?
    private var ergebnisse: Task<Void, Never>?
    private var wandler: AVAudioConverter?
    private var zielFormat: AVAudioFormat?
    private var laeuft = false

    init(zustand: DiktatZustand) { self.zustand = zustand }

    /// Die deutsche Sprache, die iOS für die Erkennung anbietet, oder nil.
    static func deutsch() async -> Locale? {
        await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: "de-DE"))
    }

    func starten(woerter: [String]) async throws {
        guard let sprache = await Self.deutsch() else { throw DiktatFehler.keinDeutsch }
        let transcriber = SpeechTranscriber(locale: sprache, transcriptionOptions: [], reportingOptions: [.volatileResults], attributeOptions: [])
        // Beim ersten Mal lädt iOS das Sprachpaket. Danach liegt es auf dem Gerät.
        if let laden = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
            try await laden.downloadAndInstall()
        }
        let analyzer = SpeechAnalyzer(modules: [transcriber])
        self.analyzer = analyzer
        zielFormat = await SpeechAnalyzer.bestAvailableAudioFormat(compatibleWith: [transcriber])

        let (strom, fortsetzung) = AsyncStream<AnalyzerInput>.makeStream()
        eingabe = fortsetzung
        let zustand = self.zustand
        ergebnisse = Task {
            do {
                for try await ergebnis in transcriber.results {
                    let text = String(ergebnis.text.characters)
                    if ergebnis.isFinal { zustand.festhalten(text) } else { zustand.laufendSetzen(text) }
                }
            } catch {
                zustand.fehlerSetzen(error.localizedDescription)
            }
        }
        try await analyzer.start(inputSequence: strom)

        try diktatAudioSitzung()
        let eingang = engine.inputNode
        let format = eingang.outputFormat(forBus: 0)
        if let ziel = zielFormat, ziel != format { wandler = AVAudioConverter(from: format, to: ziel) }
        eingang.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] puffer, _ in
            self?.einspeisen(puffer)
        }
        engine.prepare()
        try engine.start()
        laeuft = true
    }

    /// Das Mikrofon liefert meist 48 kHz, die Erkennung will ihr eigenes Format.
    private func einspeisen(_ puffer: AVAudioPCMBuffer) {
        guard let eingabe = eingabe else { return }
        guard let wandler = wandler, let ziel = zielFormat else {
            eingabe.yield(AnalyzerInput(buffer: puffer))
            return
        }
        let faktor = ziel.sampleRate / puffer.format.sampleRate
        let kapazitaet = AVAudioFrameCount(Double(puffer.frameLength) * faktor) + 1
        guard let aus = AVAudioPCMBuffer(pcmFormat: ziel, frameCapacity: kapazitaet) else { return }
        var geliefert = false
        var fehler: NSError?
        wandler.convert(to: aus, error: &fehler) { _, status in
            if geliefert {
                status.pointee = .noDataNow
                return nil
            }
            geliefert = true
            status.pointee = .haveData
            return puffer
        }
        if fehler == nil && aus.frameLength > 0 { eingabe.yield(AnalyzerInput(buffer: aus)) }
    }

    func stoppen() async {
        if laeuft {
            engine.stop()
            engine.inputNode.removeTap(onBus: 0)
            laeuft = false
        }
        eingabe?.finish()
        eingabe = nil
        try? await analyzer?.finalizeAndFinishThroughEndOfInput()
        // Die letzten Ergebnisse abwarten, aber nicht ewig.
        if let ergebnisse = ergebnisse {
            let warten = Task { await ergebnisse.value }
            let frist = Task { try? await Task.sleep(nanoseconds: 1_500_000_000); ergebnisse.cancel() }
            _ = await warten.value
            frist.cancel()
        }
        ergebnisse = nil
        analyzer = nil
        zustand.laufendFesthalten()
    }
}
#endif
