import Foundation
import Capacitor

/// Eine zweite Kopie der Daten, ausserhalb der Web Ansicht.
///
/// Die App rechnet mit dem localStorage der Web Ansicht, und der ist schnell
/// und synchron. Er ist aber nicht der sichere Ort: iOS darf Daten einer Web
/// Ansicht unter Speicherdruck verwerfen, und dann stünde jemand nach einem
/// halben Jahr Tracking vor dem Fragebogen. Deshalb spiegelt die App jeden
/// Stand hierher, in eine Datei im Ordner der App. Die liegt in der
/// Gerätesicherung, aber nicht in iCloud Drive.
@objc(SpeicherPlugin)
public class SpeicherPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SpeicherPlugin"
    public let jsName = "Speicher"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "lesen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schreiben", returnType: CAPPluginReturnPromise),
    ]

    private let warteschlange = DispatchQueue(label: "de.daevo.speicher")

    private func datei() throws -> URL {
        let ordner = try FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        ).appendingPathComponent("daevo", isDirectory: true)
        try FileManager.default.createDirectory(at: ordner, withIntermediateDirectories: true)
        return ordner.appendingPathComponent("speicher.json")
    }

    @objc func lesen(_ call: CAPPluginCall) {
        warteschlange.async {
            do {
                let url = try self.datei()
                guard FileManager.default.fileExists(atPath: url.path) else {
                    call.resolve(["daten": NSNull()])
                    return
                }
                let text = try String(contentsOf: url, encoding: .utf8)
                call.resolve(["daten": text])
            } catch {
                call.reject("Der Speicher liess sich nicht lesen: \(error.localizedDescription)")
            }
        }
    }

    @objc func schreiben(_ call: CAPPluginCall) {
        guard let text = call.getString("daten") else {
            call.reject("Ohne Daten gibt es nichts zu schreiben.")
            return
        }
        warteschlange.async {
            do {
                // Atomar, damit ein Absturz mitten im Schreiben nicht die
                // einzige Kopie zerreisst.
                try text.write(to: try self.datei(), atomically: true, encoding: .utf8)
                call.resolve()
            } catch {
                call.reject("Der Speicher liess sich nicht schreiben: \(error.localizedDescription)")
            }
        }
    }
}
