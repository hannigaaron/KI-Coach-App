import Foundation
import EventKit
import Capacitor
import BackgroundTasks
import UserNotifications

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

/// Schaut im Hintergrund in den Kalender, auch wenn die App zu ist.
///
/// iOS lässt keine App dauerhaft laufen. Über BGAppRefreshTask weckt iOS
/// daevo selbst, wann und wie oft entscheidet das System nach der Nutzung,
/// meist einige Male am Tag, mit rund 30 Sekunden Zeit. Wird die App im
/// Umschalter weggewischt, weckt iOS sie nicht mehr, bis sie wieder geöffnet
/// wird. Eine Zusage über die Uhrzeit gibt es deshalb nicht.
///
/// Gesucht wird ein Training, das daevo eingetragen hat und das sich mit
/// einem anderen Termin überschneidet, in den nächsten drei Tagen. Dann
/// kommt eine Mitteilung mit "Umplanen" und "Lassen". Umplanen öffnet die
/// App, und dort rechnet `kalender-schreiben.js` den Platz. Der Platz wird
/// nicht hier gerechnet: eine zweite Fassung der Regeln in Swift läuft nach
/// drei Monaten anders als die im Kern, und dann legt der Hintergrund das
/// Training auf eine Zeit, die die App selbst nie wählen würde.
///
/// Fremde Termine fasst dieser Teil nie an, er liest nur.
final class KalenderWache {
    static let shared = KalenderWache()
    static let kennung = "de.daevo.app.kalenderwache"
    private static let gemeldetSchluessel = "daevo.kalender.gemeldet"
    private let speicher = EKEventStore()

    /// Im AppDelegate vor dem Ende von didFinishLaunching, sonst lehnt iOS ab.
    func registrieren() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.kennung, using: nil) { aufgabe in
            guard let aufgabe = aufgabe as? BGAppRefreshTask else { return }
            self.ausfuehren(aufgabe)
        }
    }

    /// Bittet iOS um den nächsten Lauf, frühestens in zwei Stunden.
    func planen() {
        let anfrage = BGAppRefreshTaskRequest(identifier: Self.kennung)
        anfrage.earliestBeginDate = Date(timeIntervalSinceNow: 2 * 3600)
        try? BGTaskScheduler.shared.submit(anfrage)
    }

    private func ausfuehren(_ aufgabe: BGAppRefreshTask) {
        planen()
        aufgabe.expirationHandler = { aufgabe.setTaskCompleted(success: false) }
        pruefen { aufgabe.setTaskCompleted(success: true) }
    }

    private func darfLesen() -> Bool {
        let stand = EKEventStore.authorizationStatus(for: .event)
        if #available(iOS 17.0, *) { return stand == .fullAccess }
        return stand == .authorized
    }

    /// Auch beim Wechsel in den Hintergrund aufgerufen: wer gerade einen
    /// Termin eingetragen hat und die App verlässt, erfährt es sofort.
    func pruefen(fertig: @escaping () -> Void = {}) {
        guard darfLesen() else { fertig(); return }
        speicher.refreshSourcesIfNecessary()
        let jetzt = Date()
        let praedikat = speicher.predicateForEvents(withStart: jetzt, end: jetzt.addingTimeInterval(3 * 86_400), calendars: nil)
        let termine = speicher.events(matching: praedikat).filter { !$0.isAllDay && $0.availability != .free }
        let eigene = termine.filter { $0.url?.scheme == "daevo" }
        let andere = termine.filter { $0.url?.scheme != "daevo" }

        let defaults = UserDefaults.standard
        var gemeldet = defaults.dictionary(forKey: Self.gemeldetSchluessel) as? [String: Double] ?? [:]
        // Alte Meldungen vergessen, sonst wächst die Liste unbegrenzt.
        gemeldet = gemeldet.filter { $0.value > jetzt.timeIntervalSince1970 - 7 * 86_400 }

        var meldungen = 0
        for e in eigene {
            guard meldungen < 2,
                  let stoerer = andere.first(where: { $0.startDate < e.endDate && $0.endDate > e.startDate }),
                  let eid = e.eventIdentifier else { continue }
            // Je Training, Beginn und Störer genau einmal. Wer "Lassen" sagt,
            // will dieselbe Meldung nicht alle zwei Stunden wieder sehen.
            let schluessel = "\(eid)|\(Int(e.startDate.timeIntervalSince1970))|\(stoerer.calendarItemIdentifier)"
            if gemeldet[schluessel] != nil { continue }
            gemeldet[schluessel] = jetzt.timeIntervalSince1970
            melden(training: e, stoerer: stoerer, eid: eid)
            meldungen += 1
        }
        defaults.set(gemeldet, forKey: Self.gemeldetSchluessel)
        fertig()
    }

    private func melden(training: EKEvent, stoerer: EKEvent, eid: String) {
        let zeit = DateFormatter()
        zeit.locale = Locale(identifier: "de_DE")
        zeit.dateFormat = "EEE HH:mm"
        let inhalt = UNMutableNotificationContent()
        inhalt.title = "\(training.title ?? "Training") überschneidet sich"
        inhalt.body = "\(zeit.string(from: training.startDate)) liegt jetzt auch \u{201E}\(stoerer.title ?? "ein Termin")\u{201C}. Soll ich dein Training umplanen?"
        inhalt.sound = .default
        inhalt.categoryIdentifier = "kalender"
        inhalt.userInfo = ["art": "kalender", "eid": eid, "von": training.startDate.timeIntervalSince1970 * 1000]
        let anfrage = UNNotificationRequest(identifier: "daevo.kalender.\(eid.hashValue)", content: inhalt, trigger: nil)
        UNUserNotificationCenter.current().add(anfrage)
    }
}
