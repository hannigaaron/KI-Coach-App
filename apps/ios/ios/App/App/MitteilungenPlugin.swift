import Foundation
import Capacitor
import UserNotifications

/// Nimmt Antworten aus Mitteilungen entgegen, auch wenn die App gar nicht läuft.
///
/// Ein Tipp auf "Keine Zeit" startet die App im Hintergrund, ohne Fenster und
/// ohne Web Ansicht. Die Antwort muss deshalb hier landen und nicht im Plugin:
/// das Plugin gibt es erst, wenn die Web Ansicht steht. Gesetzt wird der
/// Empfänger im AppDelegate, bevor iOS die Antwort zustellt.
final class MitteilungenZentrale: NSObject, UNUserNotificationCenterDelegate {
    static let shared = MitteilungenZentrale()
    static let antwortenSchluessel = "daevo.mitteilungen.antworten"
    static let geoeffnetSchluessel = "daevo.mitteilungen.geoeffnet"

    func einrichten() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        // Dieselben drei Gründe wie im Web, LUECKEN_ANTWORTEN in packages/core.
        // Ohne die Option "foreground" bleibt die App zu, genau das ist der Zweck.
        let aktionen = [
            UNNotificationAction(identifier: "keine_zeit", title: "Keine Zeit", options: []),
            UNNotificationAction(identifier: "platt", title: "Zu platt", options: []),
            UNNotificationAction(identifier: "krank", title: "Krank oder verletzt", options: []),
        ]
        let luecke = UNNotificationCategory(identifier: "luecke", actions: aktionen, intentIdentifiers: [], options: [])
        center.setNotificationCategories([luecke])
    }

    // Auch bei offener App zeigen. Sonst geht die Erinnerung ans Runterfahren
    // genau dann verloren, wenn jemand gerade auf das Handy schaut.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let info = response.notification.request.content.userInfo
        let art = info["art"] as? String ?? ""
        let defaults = UserDefaults.standard
        switch response.actionIdentifier {
        case UNNotificationDefaultActionIdentifier:
            defaults.set(["art": art, "at": Date().timeIntervalSince1970 * 1000], forKey: Self.geoeffnetSchluessel)
        case UNNotificationDismissActionIdentifier:
            break
        default:
            var liste = defaults.array(forKey: Self.antwortenSchluessel) as? [[String: Any]] ?? []
            liste.append([
                "aktion": response.actionIdentifier,
                "art": art,
                "frage": response.notification.request.content.title,
                "frageText": response.notification.request.content.body,
                "at": Date().timeIntervalSince1970 * 1000,
            ])
            defaults.set(liste, forKey: Self.antwortenSchluessel)
        }
        completionHandler()
    }
}

/// Plant Mitteilungen bei iOS ein. Was geplant wird, entscheidet die App,
/// `apps/pwa/js/mitteilungen.js`. Hier steht nur die Zustellung.
@objc(MitteilungenPlugin)
public class MitteilungenPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MitteilungenPlugin"
    public let jsName = "Mitteilungen"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "berechtigen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "planen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "abholen", returnType: CAPPluginReturnPromise),
    ]

    private static let praefix = "daevo-"

    @objc func berechtigen(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { erlaubt, _ in
            call.resolve(["erlaubt": erlaubt])
        }
    }

    /// Ersetzt alle eigenen ausstehenden Mitteilungen durch die neue Liste.
    /// Fremde gibt es in dieser App nicht, das Präfix schützt trotzdem davor,
    /// später etwas mitzulöschen, das ein anderes Modul geplant hat.
    @objc func planen(_ call: CAPPluginCall) {
        let eintraege = call.getArray("eintraege", JSObject.self) ?? []
        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { offen in
            let alte = offen.map(\.identifier).filter { $0.hasPrefix(Self.praefix) }
            center.removePendingNotificationRequests(withIdentifiers: alte)

            var geplant = 0
            for e in eintraege.prefix(60) {
                guard let id = e["id"] as? String, let tag = e["tag"] as? String, let uhrzeit = e["uhrzeit"] as? String,
                      let titel = e["titel"] as? String, let text = e["text"] as? String else { continue }
                let teile = tag.split(separator: "-").compactMap { Int($0) }
                let zeit = uhrzeit.split(separator: ":").compactMap { Int($0) }
                guard teile.count == 3, zeit.count == 2 else { continue }

                let inhalt = UNMutableNotificationContent()
                inhalt.title = titel
                inhalt.body = text
                inhalt.sound = .default
                inhalt.userInfo = ["art": e["art"] as? String ?? ""]
                if let kategorie = e["kategorie"] as? String { inhalt.categoryIdentifier = kategorie }

                var wann = DateComponents()
                wann.year = teile[0]; wann.month = teile[1]; wann.day = teile[2]
                wann.hour = zeit[0]; wann.minute = zeit[1]
                let ausloeser = UNCalendarNotificationTrigger(dateMatching: wann, repeats: false)
                center.add(UNNotificationRequest(identifier: Self.praefix + id, content: inhalt, trigger: ausloeser))
                geplant += 1
            }
            call.resolve(["geplant": geplant])
        }
    }

    /// Gibt Antworten und den letzten Tipp heraus und löscht sie dabei.
    /// Gelesen und gelöscht in einem Schritt, wie im Web: eine Antwort, die
    /// liegen bleibt, stünde beim nächsten Öffnen zweimal im Gedächtnis.
    @objc func abholen(_ call: CAPPluginCall) {
        let defaults = UserDefaults.standard
        let antworten = defaults.array(forKey: MitteilungenZentrale.antwortenSchluessel) ?? []
        let geoeffnet = defaults.dictionary(forKey: MitteilungenZentrale.geoeffnetSchluessel)
        defaults.removeObject(forKey: MitteilungenZentrale.antwortenSchluessel)
        defaults.removeObject(forKey: MitteilungenZentrale.geoeffnetSchluessel)
        call.resolve(["antworten": antworten, "geoeffnet": geoeffnet ?? NSNull()])
    }
}
