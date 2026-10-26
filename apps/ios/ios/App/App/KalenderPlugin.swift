import Foundation
import EventKit
import Capacitor

/// Liest den Kalender des iPhones über EventKit.
///
/// Darin stehen alle Kalender, die iOS kennt: iCloud, und Google oder
/// Outlook, sobald sie unter Einstellungen, Kalender, Accounts hinzugefügt
/// sind. Damit braucht es für den Apple Kalender keine Abo Adresse und
/// keinen Server.
///
/// Nur lesen, nie schreiben. Zurück gehen Titel, Ort, Beginn und Ende in
/// Millisekunden, damit die App dieselbe Form wie beim iCal Import hat.
@objc(KalenderPlugin)
public class KalenderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KalenderPlugin"
    public let jsName = "Kalender"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "berechtigen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "termine", returnType: CAPPluginReturnPromise),
    ]

    private let speicher = EKEventStore()

    private func darfLesen() -> Bool {
        let stand = EKEventStore.authorizationStatus(for: .event)
        if #available(iOS 17.0, *) {
            return stand == .fullAccess
        }
        return stand == .authorized
    }

    @objc func berechtigen(_ call: CAPPluginCall) {
        if darfLesen() {
            call.resolve(["erlaubt": true])
            return
        }
        let fertig: (Bool, Error?) -> Void = { erlaubt, _ in
            call.resolve(["erlaubt": erlaubt])
        }
        if #available(iOS 17.0, *) {
            speicher.requestFullAccessToEvents(completion: fertig)
        } else {
            speicher.requestAccess(to: .event, completion: fertig)
        }
    }

    @objc func termine(_ call: CAPPluginCall) {
        guard darfLesen() else {
            call.reject("Kein Zugriff auf den Kalender.")
            return
        }
        let jetzt = Date().timeIntervalSince1970 * 1000
        let von = Date(timeIntervalSince1970: (call.getDouble("von") ?? jetzt - 14 * 86_400_000) / 1000)
        let bis = Date(timeIntervalSince1970: (call.getDouble("bis") ?? jetzt + 90 * 86_400_000) / 1000)
        // EventKit sucht höchstens vier Jahre am Stück, das Fenster der App
        // liegt mit 150 Tagen weit darunter.
        let suche = speicher.predicateForEvents(withStart: von, end: bis, calendars: nil)
        let liste: [[String: Any]] = speicher.events(matching: suche).map { e in
            [
                "uid": "\(e.calendarItemIdentifier)-\(Int(e.startDate.timeIntervalSince1970))",
                "titel": e.title ?? "Termin",
                "ort": e.location ?? "",
                "von": e.startDate.timeIntervalSince1970 * 1000,
                "bis": e.endDate.timeIntervalSince1970 * 1000,
                "ganztags": e.isAllDay,
                "kalender": e.calendar?.title ?? "",
            ]
        }
        call.resolve(["termine": liste])
    }
}
