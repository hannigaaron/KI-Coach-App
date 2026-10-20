import Foundation
import AVFoundation
import Capacitor

/// Sprachausgabe über AVSpeechSynthesizer statt über die Web Ansicht.
///
/// Die Web Speech API in der Web Ansicht meldet auf dem iPhone nur die
/// Basisstimmen, auf deutsch genau eine: Anna. Was jemand unter
/// Bedienungshilfen, Gesprochene Inhalte, Stimmen in Erweitert oder Premium
/// lädt, sieht sie nicht. AVSpeechSynthesizer sieht diese Stimmen, und damit
/// auch die Männerstimmen.
///
/// Der Text kommt fertig aufbereitet aus `stripForSpeech` in voice.js. Hier
/// wird nur gesprochen.
@objc(SprachePlugin)
public class SprachePlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "SprachePlugin"
    public let jsName = "Sprache"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "stimmen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sprechen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stoppen", returnType: CAPPluginReturnPromise),
    ]

    private let synth = AVSpeechSynthesizer()
    /// Der Aufruf, der auf das Ende der laufenden Ausgabe wartet.
    private var laufend: CAPPluginCall?
    /// Der Satz zu diesem Aufruf. Ein Abbruch des vorigen Satzes meldet sich
    /// erst später, und ohne den Vergleich beendete er den neuen Aufruf.
    private var laufenderSatz: AVSpeechUtterance?

    override public func load() {
        synth.delegate = self
        // Eigene Audiositzung des Synthesizers. Sonst kämpft die Ausgabe mit
        // der Spracherkennung der Web Ansicht um das Mikrofon, und nach der
        // ersten Antwort hört die App nicht mehr zu.
        synth.usesApplicationAudioSession = false
    }

    /// Alle installierten Stimmen mit Qualität und Geschlecht.
    @objc func stimmen(_ call: CAPPluginCall) {
        let liste = AVSpeechSynthesisVoice.speechVoices().map { v -> [String: Any] in
            var qualitaet = 1
            if v.quality == .enhanced { qualitaet = 2 }
            if #available(iOS 16.0, *), v.quality == .premium { qualitaet = 3 }
            let geschlecht: String
            switch v.gender {
            case .male: geschlecht = "m"
            case .female: geschlecht = "w"
            default: geschlecht = ""
            }
            return [
                "id": v.identifier,
                "name": v.name,
                "lang": v.language,
                "qualitaet": qualitaet,
                "geschlecht": geschlecht,
            ]
        }
        call.resolve(["stimmen": liste])
    }

    /// Spricht und antwortet erst, wenn die Ausgabe fertig oder abgebrochen ist.
    @objc func sprechen(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        guard !text.isEmpty else {
            call.resolve(["fertig": true])
            return
        }
        DispatchQueue.main.async {
            self.beenden(abgebrochen: true)
            if self.synth.isSpeaking { self.synth.stopSpeaking(at: .immediate) }

            let satz = AVSpeechUtterance(string: text)
            if let id = call.getString("stimme"), let stimme = AVSpeechSynthesisVoice(identifier: id) {
                satz.voice = stimme
            } else {
                satz.voice = AVSpeechSynthesisVoice(language: "de-DE")
            }
            // Das Tempo kommt im Mass der Web Speech API, 1 ist normal. Hier
            // ist normal AVSpeechUtteranceDefaultSpeechRate.
            let tempo = Float(call.getDouble("tempo") ?? 0.96)
            let rate = AVSpeechUtteranceDefaultSpeechRate * tempo
            satz.rate = min(max(rate, AVSpeechUtteranceMinimumSpeechRate), AVSpeechUtteranceMaximumSpeechRate)
            satz.pitchMultiplier = Float(call.getDouble("tonhoehe") ?? 0.95)
            satz.postUtteranceDelay = 0.05

            self.laufend = call
            self.laufenderSatz = satz
            self.synth.speak(satz)
        }
    }

    @objc func stoppen(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.synth.stopSpeaking(at: .immediate)
            self.beenden(abgebrochen: true)
            call.resolve()
        }
    }

    private func beenden(abgebrochen: Bool) {
        guard let call = laufend else { return }
        laufend = nil
        laufenderSatz = nil
        call.resolve(["fertig": !abgebrochen, "abgebrochen": abgebrochen])
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            if utterance === self.laufenderSatz { self.beenden(abgebrochen: false) }
        }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async {
            if utterance === self.laufenderSatz { self.beenden(abgebrochen: true) }
        }
    }
}
