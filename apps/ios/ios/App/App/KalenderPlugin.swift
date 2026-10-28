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
/// Zurück gehen Titel, Ort, Beginn und Ende in Millisekunden, damit die App
/// dieselbe Form wie beim iCal Import hat.
///
/// Schreiben kann das Plugin auch: anlegen, verschieben, löschen. Was daevo
/// anlegt, trägt die Adresse `daevo://termin`. Daran erkennt die App ihre
/// eigenen Termine, und nur die verschiebt sie ohne Rückfrage. Ein fremder
/// Termin wird nur geändert, wenn die App ausdrücklich `bestaetigt` schickt,
/// nachdem der Nutzer Ja gesagt hat. Ein verschobener Kundentermin ist ein
/// Fehler bei einem echten Menschen.
///
/// iOS gleicht Änderungen selbst mit Google oder Outlook ab, wenn der
/// Kalender dort liegt. Eine eigene Anbindung je Anbieter braucht es nicht.
@objc(KalenderPlugin)
public class KalenderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KalenderPlugin"
    public let jsName = "Kalender"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "berechtigen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "termine", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "anlegen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verschieben", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loeschen", returnType: CAPPluginReturnPromise),
    ]

    static let markierung = URL(string: "daevo://termin")!

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
                "eid": e.eventIdentifier ?? "",
                "daevo": e.url?.scheme == "daevo",
                "schreibbar": e.calendar?.allowsContentModifications ?? false,
            ]
        }
        call.resolve(["termine": liste])
    }

    /// Findet genau das Vorkommen, das gemeint ist. Bei einer Serie trägt
    /// jedes Vorkommen dieselbe Kennung, deshalb zählt auch der Beginn.
    private func vorkommen(_ eid: String, beginn: Double) -> EKEvent? {
        let start = Date(timeIntervalSince1970: beginn / 1000)
        let suche = speicher.predicateForEvents(
            withStart: start.addingTimeInterval(-60), end: start.addingTimeInterval(60), calendars: nil)
        return speicher.events(matching: suche).first { $0.eventIdentifier == eid }
            ?? speicher.event(withIdentifier: eid)
    }

    @objc func anlegen(_ call: CAPPluginCall) {
        guard darfLesen() else { call.reject("Kein Zugriff auf den Kalender."); return }
        guard let titel = call.getString("titel"), let von = call.getDouble("von"), let bis = call.getDouble("bis"), bis > von else {
            call.reject("Titel, Beginn und Ende fehlen."); return
        }
        guard let kalender = speicher.defaultCalendarForNewEvents, kalender.allowsContentModifications else {
            call.reject("Kein Kalender, in den daevo schreiben darf. In der Kalender App einen Standardkalender wählen."); return
        }
        let e = EKEvent(eventStore: speicher)
        e.calendar = kalender
        e.title = titel
        e.startDate = Date(timeIntervalSince1970: von / 1000)
        e.endDate = Date(timeIntervalSince1970: bis / 1000)
        e.notes = call.getString("notiz") ?? "Eingetragen von daevo."
        e.url = KalenderPlugin.markierung
        do {
            try speicher.save(e, span: .thisEvent, commit: true)
            call.resolve(["eid": e.eventIdentifier ?? "", "kalender": kalender.title])
        } catch {
            call.reject("Speichern ging nicht: \(error.localizedDescription)")
        }
    }

    @objc func verschieben(_ call: CAPPluginCall) {
        guard darfLesen() else { call.reject("Kein Zugriff auf den Kalender."); return }
        guard let eid = call.getString("eid"), let alt = call.getDouble("alt"),
              let von = call.getDouble("von"), let bis = call.getDouble("bis"), bis > von else {
            call.reject("Termin, Beginn und Ende fehlen."); return
        }
        guard let e = vorkommen(eid, beginn: alt) else { call.reject("Den Termin gibt es nicht mehr."); return }
        if e.url?.scheme != "daevo" && call.getBool("bestaetigt") != true {
            call.reject("Fremder Termin, nur mit Bestätigung."); return
        }
        guard e.calendar?.allowsContentModifications == true else { call.reject("Dieser Kalender ist nur lesbar."); return }
        e.startDate = Date(timeIntervalSince1970: von / 1000)
        e.endDate = Date(timeIntervalSince1970: bis / 1000)
        do {
            try speicher.save(e, span: .thisEvent, commit: true)
            call.resolve(["eid": e.eventIdentifier ?? eid])
        } catch {
            call.reject("Verschieben ging nicht: \(error.localizedDescription)")
        }
    }

    @objc func loeschen(_ call: CAPPluginCall) {
        guard darfLesen() else { call.reject("Kein Zugriff auf den Kalender."); return }
        guard let eid = call.getString("eid"), let alt = call.getDouble("alt"),
              let e = vorkommen(eid, beginn: alt) else { call.reject("Den Termin gibt es nicht mehr."); return }
        // Löschen nur bei eigenen Terminen. Einen fremden Termin zu löschen
        // bietet daevo gar nicht an, auch nicht mit Bestätigung.
        guard e.url?.scheme == "daevo" else { call.reject("daevo löscht nur Termine, die es selbst angelegt hat."); return }
        do {
            try speicher.remove(e, span: .thisEvent, commit: true)
            call.resolve(["ok": true])
        } catch {
            call.reject("Löschen ging nicht: \(error.localizedDescription)")
        }
    }
}
