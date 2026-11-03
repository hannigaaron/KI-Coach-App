import Foundation
import Capacitor
import WatchConnectivity
import UIKit

/// Die Verbindung zur Apple Watch, auf der Seite des iPhones.
///
/// Die Uhr bekommt ein Paket: den Stand des Tages und fertig vorbereitete
/// Trainings mit den Werten vom letzten Mal. Gerechnet wird das Paket in der
/// Web App, `apps/pwa/js/uhr.js`, damit es nur eine Fassung der Regeln gibt.
/// Gesendet wird es als Application Context: die Uhr bekommt immer nur den
/// neuesten Stand, auch wenn sie gerade nicht verbunden ist.
///
/// Zurück kommt, was auf der Uhr passiert ist: ein Glas Wasser, ein
/// beendetes Training. Das kommt über `transferUserInfo`, eine Warteschlange,
/// die iOS auch dann zustellt, wenn die App gerade nicht läuft. Abgelegt wird
/// in den UserDefaults, die Web App holt beim nächsten Öffnen ab. So geht
/// kein Training verloren, nur weil das iPhone in der Tasche geschlafen hat.
final class UhrZentrale: NSObject, WCSessionDelegate {
    static let shared = UhrZentrale()
    private let schluessel = "daevo.uhr.eingang"
    private let sperre = NSLock()
    /// Das Plugin der laufenden Web Ansicht. Schwach, denn die Web Ansicht
    /// gehört der Bridge und nicht hierher.
    weak var plugin: UhrPlugin?
    /// Offene Fragen der Uhr, je Kennung die Antwort an die Uhr. Nur auf dem
    /// Hauptthread angefasst.
    private var offen: [String: ([String: Any]) -> Void] = [:]

    /// Im AppDelegate gerufen: ohne aktive Sitzung beim Start gingen
    /// Ereignisse verloren, die eintreffen, bevor die Web Ansicht steht.
    func einrichten() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    var bereit: Bool {
        WCSession.isSupported() && WCSession.default.activationState == .activated && WCSession.default.isPaired && WCSession.default.isWatchAppInstalled
    }

    func senden(_ paket: [String: Any]) throws {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
        try WCSession.default.updateApplicationContext(["paket": UhrZentrale.ohneNull(paket), "gesendet": Date().timeIntervalSince1970])
    }

    /// Der Application Context nimmt nur Werte einer Property List. NSNull ist
    /// keiner, und ein einziges davon lässt iOS das ganze Paket ablehnen. Die
    /// Web App schickt schon keine, das hier ist der zweite Riegel.
    static func ohneNull(_ wert: Any) -> Any {
        if let d = wert as? [String: Any] {
            var aus: [String: Any] = [:]
            for (k, v) in d where !(v is NSNull) { aus[k] = ohneNull(v) }
            return aus
        }
        if let a = wert as? [Any] { return a.filter { !($0 is NSNull) }.map(ohneNull) }
        return wert
    }

    func abholen() -> [[String: Any]] {
        sperre.lock()
        defer { sperre.unlock() }
        let liste = UserDefaults.standard.array(forKey: schluessel) as? [[String: Any]] ?? []
        UserDefaults.standard.removeObject(forKey: schluessel)
        return liste
    }

    private func ablegen(_ ereignis: [String: Any]) {
        sperre.lock()
        defer { sperre.unlock() }
        var liste = UserDefaults.standard.array(forKey: schluessel) as? [[String: Any]] ?? []
        liste.append(ereignis)
        // Obergrenze, damit eine Uhr, die wochenlang sendet, ohne dass die
        // App geöffnet wird, den Speicher nicht füllt.
        UserDefaults.standard.set(Array(liste.suffix(200)), forKey: schluessel)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        ablegen(userInfo)
        NotificationCenter.default.post(name: .daevoUhrEingang, object: nil)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        ablegen(message)
        NotificationCenter.default.post(name: .daevoUhrEingang, object: nil)
    }

    /// Eine Frage von der Uhr. Beantwortet wird sie nur, wenn daevo hier
    /// vorn offen ist: im Hintergrund hält iOS die Web Ansicht an, und eine
    /// Antwort käme erst nach dem Zeitlimit der Uhr. Dann sagt das iPhone
    /// sofort ab, und die Uhr fragt selbst über den Server.
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard message["art"] as? String == "frage", let text = message["text"] as? String else {
            replyHandler(["fehler": "unbekannt"])
            return
        }
        DispatchQueue.main.async {
            guard UIApplication.shared.applicationState == .active, let plugin = self.plugin else {
                replyHandler(["fehler": "iphone"])
                return
            }
            let id = UUID().uuidString
            self.offen[id] = replyHandler
            // Ein Agent mit Werkzeugen braucht manchmal 20 Sekunden. Länger
            // wartet die Uhr nicht, dann fragt sie selbst.
            DispatchQueue.main.asyncAfter(deadline: .now() + 40) { self.antworten(id: id, ["fehler": "zeit"]) }
            plugin.frageWeitergeben(id: id, text: text) { angenommen in
                if !angenommen { self.antworten(id: id, ["fehler": "iphone"]) }
            }
        }
    }

    /// Schickt die Antwort genau einmal an die Uhr. Auf dem Hauptthread.
    func antworten(id: String, _ antwort: [String: Any]) {
        guard let antworte = offen.removeValue(forKey: id) else { return }
        antworte(antwort)
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) { WCSession.default.activate() }
}

extension Notification.Name {
    static let daevoUhrEingang = Notification.Name("daevoUhrEingang")
}

@objc(UhrPlugin)
public class UhrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UhrPlugin"
    public let jsName = "Uhr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "stand", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "senden", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "abholen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "antworten", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        UhrZentrale.shared.plugin = self
    }

    /// Reicht die Frage an `daevoUhrFrage` in `app.js` weiter. Die Argumente
    /// gehen als JSON hinein, damit kein Zeichen der Frage das Skript bricht.
    func frageWeitergeben(id: String, text: String, fertig: @escaping (Bool) -> Void) {
        guard let webView = bridge?.webView,
              let daten = try? JSONSerialization.data(withJSONObject: [id, text]),
              let args = String(data: daten, encoding: .utf8) else { fertig(false); return }
        let skript = "typeof window.daevoUhrFrage === 'function' ? (window.daevoUhrFrage(...\(args)), 1) : 0"
        webView.evaluateJavaScript(skript) { ergebnis, fehler in
            fertig(fehler == nil && (ergebnis as? Int) == 1)
        }
    }

    @objc func antworten(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Keine Kennung."); return }
        var antwort: [String: Any] = [:]
        if let text = call.getString("antwort") { antwort["antwort"] = text }
        if let fehler = call.getString("fehler") { antwort["fehler"] = fehler }
        DispatchQueue.main.async {
            UhrZentrale.shared.antworten(id: id, antwort)
            call.resolve()
        }
    }

    @objc func stand(_ call: CAPPluginCall) {
        let s = WCSession.isSupported() ? WCSession.default : nil
        call.resolve([
            "unterstuetzt": s != nil,
            "gekoppelt": s?.isPaired ?? false,
            "installiert": s?.isWatchAppInstalled ?? false,
        ])
    }

    @objc func senden(_ call: CAPPluginCall) {
        guard let paket = call.getObject("paket") else { call.reject("Kein Paket."); return }
        do {
            try UhrZentrale.shared.senden(paket)
            call.resolve(["gesendet": UhrZentrale.shared.bereit])
        } catch {
            call.reject("Senden an die Uhr ging nicht: \(error.localizedDescription)")
        }
    }

    @objc func abholen(_ call: CAPPluginCall) {
        call.resolve(["ereignisse": UhrZentrale.shared.abholen()])
    }
}
