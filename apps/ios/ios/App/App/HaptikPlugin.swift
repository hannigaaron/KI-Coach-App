import UIKit
import Capacitor

/// Spürbare Rückmeldung über die Taptic Engine.
///
/// `navigator.vibrate` gibt es auf dem iPhone nicht, weder in Safari noch in
/// der Web Ansicht. Ein abgehakter Satz oder das Ende einer Pause war deshalb
/// nur zu sehen, und wer zwischen zwei Sätzen das Handy weglegt, sieht nichts.
///
/// Drei Arten, wie bei Apple selbst: `leicht` für Auswahl und Tippen,
/// `erfolg` für etwas, das gespeichert ist, `hinweis` für das Ende einer
/// Pause. Mehr Arten verwässern die Bedeutung.
@objc(HaptikPlugin)
public class HaptikPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HaptikPlugin"
    public let jsName = "Haptik"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "spueren", returnType: CAPPluginReturnPromise),
    ]

    @objc func spueren(_ call: CAPPluginCall) {
        let art = call.getString("art") ?? "leicht"
        DispatchQueue.main.async {
            switch art {
            case "erfolg":
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            case "hinweis":
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
            default:
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
            call.resolve()
        }
    }
}
