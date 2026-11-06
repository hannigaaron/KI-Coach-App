import Foundation
// ObservableObject und @Published kommen aus Combine. Neue Ziele in Xcode 26
// importieren Module nicht mehr über andere mit, ohne diese Zeile baut es nicht.
import Combine
import AVFoundation

/// Das Gespräch auf der Uhr.
///
/// Erst das iPhone: ist daevo dort vorn offen, antwortet der ganze Agent mit
/// allen Werkzeugen und dem Gedächtnis, und was er einträgt, ist eingetragen.
/// Sonst fragt die Uhr selbst, über denselben Server und dasselbe Konto wie
/// die App, mit Haltung, Schreibstil und Stand des Tages aus dem Paket. Dort
/// gibt es nur das Werkzeug `vormerken`: was etwas einträgt, läuft beim
/// nächsten Öffnen auf dem iPhone durch den Agenten. Die Uhr sagt dann
/// "vorgemerkt" und nie "eingetragen".
@MainActor
final class Unterhaltung: NSObject, ObservableObject, AVSpeechSynthesizerDelegate {
    static let shared = Unterhaltung()

    @Published private(set) var zustand: OrbZustand = .bereit
    @Published private(set) var frage = ""
    @Published private(set) var antwort = ""
    @Published private(set) var fehler = ""

    private var verlauf: [(frage: String, antwort: String)] = []
    private let stimme = AVSpeechSynthesizer()

    override init() {
        super.init()
        stimme.delegate = self
    }

    func fragen(_ text: String) async {
        let satz = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !satz.isEmpty, zustand != .denkt else { return }
        stimme.stopSpeaking(at: .immediate)
        frage = satz
        antwort = ""
        fehler = ""
        zustand = .denkt

        var ergebnis: String?
        var vomIphone = false
        if let ueberIphone = await Verbindung.shared.frageAnsIphone(satz) {
            ergebnis = ueberIphone
            vomIphone = true
        } else {
            ergebnis = await direkt(satz)
        }

        guard let text = ergebnis, !text.isEmpty else {
            zustand = .bereit
            if fehler.isEmpty { fehler = "Keine Antwort. Öffne daevo auf dem iPhone und versuch es noch einmal." }
            return
        }
        antwort = text
        verlauf.append((satz, text))
        verlauf = Array(verlauf.suffix(6))
        // Was das iPhone beantwortet hat, steht dort schon im Gespräch.
        if !vomIphone { Verbindung.shared.gespraechMerken(frage: satz, antwort: text) }
        WKHaptik.erfolg()
        if Verbindung.shared.paket?.ki?.sprechen ?? true {
            sprechen(text)
        } else {
            zustand = .bereit
        }
    }

    /// Die Anfrage ohne iPhone, an die Messages API oder den Server der App.
    private func direkt(_ satz: String) async -> String? {
        guard let ki = Verbindung.shared.paket?.ki, let url = URL(string: ki.url) else {
            fehler = "daevo auf dem iPhone öffnen, dann kann ich auch ohne iPhone antworten."
            return nil
        }
        var nachrichten: [[String: Any]] = []
        for runde in verlauf {
            nachrichten.append(["role": "user", "content": runde.frage])
            nachrichten.append(["role": "assistant", "content": runde.antwort])
        }
        nachrichten.append(["role": "user", "content": satz])
        let koerper: [String: Any] = [
            "model": ki.modell,
            "max_tokens": 4096,
            "system": ki.system + "\n\nUhrzeit jetzt: " + Self.uhrzeit(),
            "messages": nachrichten,
            "output_config": ["effort": "low"],
            "tools": [[
                "name": "vormerken",
                "description": "Merkt einen Satz zum Eintragen vor. Das iPhone führt ihn aus, sobald daevo dort offen ist. Für Essen, Training, Gewicht, Wasser, Aufgaben, Erinnerungen und Termine.",
                "input_schema": [
                    "type": "object",
                    "properties": ["satz": ["type": "string", "description": "Der Satz des Nutzers, vollständig, mit Mengen und Zeiten."]],
                    "required": ["satz"],
                ],
            ]],
        ]
        var anfrage = URLRequest(url: url)
        anfrage.httpMethod = "POST"
        anfrage.timeoutInterval = 60
        anfrage.setValue("application/json", forHTTPHeaderField: "content-type")
        anfrage.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        if let token = ki.token { anfrage.setValue("Bearer \(token)", forHTTPHeaderField: "authorization") }
        if let schluessel = ki.schluessel { anfrage.setValue(schluessel, forHTTPHeaderField: "x-api-key") }
        anfrage.httpBody = try? JSONSerialization.data(withJSONObject: koerper)

        do {
            let (daten, antwort) = try await URLSession.shared.data(for: anfrage)
            let status = (antwort as? HTTPURLResponse)?.statusCode ?? 0
            guard status == 200 else {
                fehler = Self.fehlerText(status)
                return nil
            }
            return auswerten(daten)
        } catch {
            fehler = "Kein Netz. Die Uhr braucht WLAN, Mobilfunk oder das iPhone in der Nähe."
            return nil
        }
    }

    private func auswerten(_ daten: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: daten) as? [String: Any] else { return nil }
        if json["stop_reason"] as? String == "refusal" {
            return "Dazu kann ich hier nichts sagen. Frag mich auf dem iPhone, dort habe ich mehr Zusammenhang."
        }
        let bloecke = json["content"] as? [[String: Any]] ?? []
        var texte: [String] = []
        var vorgemerkt = false
        for b in bloecke {
            if b["type"] as? String == "text", let t = b["text"] as? String, !t.isEmpty { texte.append(t) }
            if b["type"] as? String == "tool_use", b["name"] as? String == "vormerken",
               let eingabe = b["input"] as? [String: Any], let satz = eingabe["satz"] as? String, !satz.isEmpty {
                Verbindung.shared.vormerken(satz)
                vorgemerkt = true
            }
        }
        var text = texte.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty && vorgemerkt {
            text = "Vorgemerkt. Ich trage es ein, sobald daevo auf dem iPhone offen ist."
        }
        return text
    }

    private static func fehlerText(_ status: Int) -> String {
        switch status {
        case 402: return "Kontingent aufgebraucht. Alles ohne KI funktioniert weiter."
        case 401, 403: return "Anmeldung abgelehnt. Öffne daevo auf dem iPhone."
        case 429: return "Gerade zu viele Anfragen. Versuch es gleich noch einmal."
        case 529, 503: return "Der Dienst ist gerade überlastet. Versuch es gleich noch einmal."
        default: return "Das ging nicht, Fehler \(status)."
        }
    }

    private static func uhrzeit() -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "de_DE")
        f.dateFormat = "EEEE, d. MMMM, HH:mm"
        return f.string(from: Date()) + " Uhr"
    }

    // MARK: Sprechen

    func sprechen(_ text: String) {
        let satz = AVSpeechUtterance(string: text)
        satz.voice = Self.besteStimme()
        satz.rate = AVSpeechUtteranceDefaultSpeechRate * 0.96
        satz.pitchMultiplier = 0.95
        zustand = .spricht
        stimme.speak(satz)
    }

    func stumm() {
        stimme.stopSpeaking(at: .immediate)
        zustand = .bereit
    }

    /// Dieselbe Wahl wie in `SprachePlugin.swift`: Premium vor Erweitert,
    /// männlich vor weiblich.
    private static func besteStimme() -> AVSpeechSynthesisVoice? {
        let deutsch = AVSpeechSynthesisVoice.speechVoices().filter { $0.language.hasPrefix("de") }
        func punkte(_ v: AVSpeechSynthesisVoice) -> Int {
            var p = 0
            if v.quality == .premium { p += 120 } else if v.quality == .enhanced { p += 100 }
            if v.gender == .male { p += 40 }
            if v.language == "de-DE" { p += 10 }
            return p
        }
        return deutsch.max { punkte($0) < punkte($1) } ?? AVSpeechSynthesisVoice(language: "de-DE")
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor in if self.zustand == .spricht { self.zustand = .bereit } }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor in if self.zustand == .spricht { self.zustand = .bereit } }
    }
}
