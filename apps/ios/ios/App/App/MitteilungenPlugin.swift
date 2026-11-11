import Foundation
import Capacitor
import UserNotifications
import UIKit
import WebKit

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
    /// Das Plugin der laufenden Web Ansicht, schwach wie bei der Uhr. Fehlt
    /// es, war die App beendet, und die Antwort wartet bis zum Öffnen.
    weak var plugin: MitteilungenPlugin?

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
        // Umplanen öffnet die App, denn den freien Platz rechnet die App.
        // Lassen bleibt zu: es gibt nichts zu tun.
        let kalender = UNNotificationCategory(identifier: "kalender", actions: [
            UNNotificationAction(identifier: "umplanen", title: "Umplanen", options: [.foreground]),
            UNNotificationAction(identifier: "lassen", title: "Lassen", options: []),
        ], intentIdentifiers: [], options: [])
        // Eine Frage wie "Wie ist dein Energielevel?" bekommt ein Textfeld.
        // Auf der Apple Watch zeigt watchOS dafür Diktat, Kritzeln und
        // Tastatur, am iPhone die Tastatur, beides ohne die App zu öffnen.
        let frage = UNNotificationCategory(identifier: "frage", actions: [
            UNTextInputNotificationAction(identifier: "antworten", title: "Antworten", options: [],
                                          textInputButtonTitle: "Senden", textInputPlaceholder: "Deine Antwort"),
        ], intentIdentifiers: [], options: [])
        center.setNotificationCategories([luecke, kalender, frage])
    }

    // Auch bei offener App zeigen. Sonst geht die Erinnerung ans Runterfahren
    // genau dann verloren, wenn jemand gerade auf das Handy schaut.
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Das Ende der Satzpause meldet bei offener App die Seite selbst.
        // Beides zusammen wären zwei Meldungen für denselben Moment.
        if notification.request.identifier == MitteilungenPlugin.pauseKennung {
            completionHandler([])
            return
        }
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
            var eintrag: [String: Any] = [
                "aktion": response.actionIdentifier,
                "art": art,
                "frage": response.notification.request.content.title,
                "frageText": response.notification.request.content.body,
                "at": Date().timeIntervalSince1970 * 1000,
                // Beim Kalender: welches Training gemeint ist.
                "eid": info["eid"] as? String ?? "",
                "von": info["von"] as? Double ?? 0,
            ]
            if let text = (response as? UNTextInputNotificationResponse)?.userText.trimmingCharacters(in: .whitespacesAndNewlines) {
                eintrag["text"] = String(text.prefix(1000))
            }
            var liste = defaults.array(forKey: Self.antwortenSchluessel) as? [[String: Any]] ?? []
            liste.append(eintrag)
            defaults.set(liste, forKey: Self.antwortenSchluessel)
            // Eine getippte Antwort soll eine Antwort bekommen, nicht erst
            // beim nächsten Öffnen. Liegt daevo noch im Speicher, läuft sie
            // jetzt durch die App, und die Antwort kommt als Mitteilung
            // zurück, auf der Uhr wie am iPhone. War die App beendet, gibt
            // es keine Web Ansicht, dann wartet sie bis zum Öffnen.
            if eintrag["text"] != nil {
                DispatchQueue.main.async {
                    guard let plugin = self.plugin else { completionHandler(); return }
                    plugin.antwortenJetzt { completionHandler() }
                }
                return
            }
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
        CAPPluginMethod(name: "pauseStellen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseAbbrechen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sofort", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        MitteilungenZentrale.shared.plugin = self
    }

    /// Lässt die Web App die abgelegten Antworten jetzt verarbeiten,
    /// `daevoMitteilungAntworten` in `app.js`. Im Hintergrund gibt iOS dafür
    /// rund 30 Sekunden, deshalb läuft es in einer Hintergrundaufgabe und
    /// endet spätestens nach 25. Ungeprüft: ob WebKit das Skript im
    /// Hintergrund ausführt, zeigt erst das Gerät. Klappt es nicht, bleibt
    /// die Antwort liegen und kommt beim Öffnen dran.
    func antwortenJetzt(fertig: @escaping () -> Void) {
        guard let webView = bridge?.webView else { fertig(); return }
        var aufgabe: UIBackgroundTaskIdentifier = .invalid
        var beendet = false
        let ende = {
            guard !beendet else { return }
            beendet = true
            if aufgabe != .invalid { UIApplication.shared.endBackgroundTask(aufgabe) }
            fertig()
        }
        aufgabe = UIApplication.shared.beginBackgroundTask(withName: "daevo.antwort") { ende() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 25) { ende() }
        webView.callAsyncJavaScript(
            "if (typeof window.daevoMitteilungAntworten === 'function') { await window.daevoMitteilungAntworten(); } return 1;",
            arguments: [:], in: nil, in: .page
        ) { _ in DispatchQueue.main.async { ende() } }
    }

    /// Eine Mitteilung sofort, für die Antwort auf eine Antwort aus einer
    /// Mitteilung. Sie landet auch auf der Uhr, wenn das iPhone gesperrt ist.
    @objc func sofort(_ call: CAPPluginCall) {
        let inhalt = UNMutableNotificationContent()
        inhalt.title = call.getString("titel") ?? "daevo"
        inhalt.body = String((call.getString("text") ?? "").prefix(1500))
        inhalt.sound = .default
        inhalt.userInfo = ["art": "antwort"]
        // Wer auf die Antwort wieder etwas sagen will, kann das direkt tun.
        inhalt.categoryIdentifier = "frage"
        let anfrage = UNNotificationRequest(identifier: "antwort.\(UUID().uuidString)", content: inhalt, trigger: nil)
        UNUserNotificationCenter.current().add(anfrage) { _ in call.resolve() }
    }

    private static let praefix = "daevo-"
    /// Ohne das Präfix oben, sonst löschte jedes neue Planen die laufende Pause.
    static let pauseKennung = "pause.daevo"

    /// Eine Mitteilung zum Ende der Satzpause. Es gibt immer nur eine, eine
    /// neue Pause ersetzt die alte.
    @objc func pauseStellen(_ call: CAPPluginCall) {
        let sekunden = max(5, min(900, call.getDouble("sekunden") ?? 90))
        let uebung = call.getString("uebung") ?? ""
        let inhalt = UNMutableNotificationContent()
        inhalt.title = "Pause vorbei"
        inhalt.body = uebung.isEmpty ? "Nächster Satz." : "Nächster Satz: \(uebung)."
        inhalt.sound = .default
        inhalt.userInfo = ["art": "pause"]
        let ausloeser = UNTimeIntervalNotificationTrigger(timeInterval: sekunden, repeats: false)
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [Self.pauseKennung])
        center.add(UNNotificationRequest(identifier: Self.pauseKennung, content: inhalt, trigger: ausloeser))
        call.resolve()
    }

    @objc func pauseAbbrechen(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [Self.pauseKennung])
        call.resolve()
    }

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
