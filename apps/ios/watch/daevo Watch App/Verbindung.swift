import Foundation
// ObservableObject und @Published kommen aus Combine. Neue Ziele in Xcode 26
// importieren Module nicht mehr über andere mit, ohne diese Zeile baut es nicht.
import Combine
import WatchConnectivity
import WidgetKit
import Security
#if canImport(EventKit)
import EventKit
#endif

/// Die Verbindung zum iPhone, auf der Seite der Uhr.
///
/// Rein kommt der Application Context mit dem neuesten Paket. Er wird
/// gespeichert, damit die Uhr auch ohne iPhone in der Nähe den letzten Stand
/// und die Trainings kennt: im Studio liegt das Handy oft im Spind.
///
/// Raus geht alles über `transferUserInfo`. Das ist eine Warteschlange, die
/// das System zustellt, sobald das iPhone erreichbar ist, auch Stunden später.
/// Jedes Ereignis trägt eine eigene Kennung, damit die App ein doppelt
/// zugestelltes nicht zweimal zählt.
@MainActor
final class Verbindung: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = Verbindung()

    @Published private(set) var paket: Paket?
    /// Wasser, das hier getippt, aber noch nicht im neuen Paket zurück ist,
    /// je Tag. Ohne den Tag zählte das Glas von gestern Abend heute mit.
    @Published private(set) var wasserOffen = 0
    private var wasserTag = ""
    /// Aufgaben, die hier abgehakt sind, bis das iPhone sie übernommen hat.
    @Published private(set) var erledigt: Set<String> = []
    /// Termine direkt aus dem Kalender der Uhr. `nil` heisst: kein Zugriff,
    /// dann gelten die Termine aus dem Paket.
    @Published private(set) var kalenderTermine: [UhrTermin]?
    /// Die offenen Aufgaben in Todoist, wie die Uhr sie selbst gelesen hat.
    /// `nil` heisst: nicht gelesen, dann gilt das Paket allein.
    @Published private(set) var todoistOffen: Set<String>?
    /// Wann die Uhr Todoist zuletzt selbst gelesen hat.
    @Published private(set) var todoistGelesen: Date?

    private let speicherSchluessel = "daevo.uhr.paket"
    private let wasserSchluessel = "daevo.uhr.wasser"
    private let erledigtSchluessel = "daevo.uhr.erledigt"

    override init() {
        super.init()
        let d = UserDefaults.standard
        if let daten = d.data(forKey: speicherSchluessel),
           let alt = try? JSONDecoder().decode(Paket.self, from: daten) {
            paket = alt
        }
        if let w = d.dictionary(forKey: wasserSchluessel), let tag = w["tag"] as? String, tag == heuteText() {
            wasserTag = tag
            wasserOffen = w["ml"] as? Int ?? 0
        }
        erledigt = Set(d.stringArray(forKey: erledigtSchluessel) ?? [])
    }

    func starten() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Der Stand von heute. Ist das Paket von gestern, weil das iPhone seit
    /// Mitternacht nicht offen war, gelten die Ziele weiter, gegessen ist
    /// aber nichts bekannt: dann trägt der Stand 0 und `standAlt` sagt das.
    /// Vorher stand an jedem Morgen nur "Öffne daevo auf dem iPhone" da.
    var standHeute: Stand? {
        guard let paket else { return nil }
        let wasser = wasserTag == heuteText() ? wasserOffen : 0
        if paket.tag == heuteText() {
            var s = paket.stand
            s.wasserMl += wasser
            return s
        }
        return Stand(kcal: 0, kcalZiel: paket.stand.kcalZiel, protein: 0, proteinZiel: paket.stand.proteinZiel,
                     wasserMl: wasser, wasserZiel: paket.stand.wasserZiel)
    }

    /// Das Essen von heute ist noch nicht vom iPhone gekommen.
    var standAlt: Bool { paket != nil && paket?.tag != heuteText() }

    /// Wann das iPhone zuletzt gerechnet hat.
    var abgleich: Date? { paket?.stamp.map { Date(timeIntervalSince1970: $0 / 1000) } }

    func wasser(_ ml: Int) {
        if wasserTag != heuteText() { wasserTag = heuteText(); wasserOffen = 0 }
        wasserOffen += ml
        UserDefaults.standard.set(["tag": wasserTag, "ml": wasserOffen], forKey: wasserSchluessel)
        senden(["art": "wasser", "ml": ml, "tag": heuteText()])
        if let s = standHeute { Komplikation.schreiben(tag: heuteText(), kcal: s.kcal, kcalZiel: s.kcalZiel, protein: s.protein, proteinZiel: s.proteinZiel) }
    }

    /// Die offenen Aufgaben, ohne die hier schon abgehakten und ohne die,
    /// die in Todoist nicht mehr offen sind. Im Betrieb standen auf der Uhr
    /// Aufgaben von vorgestern, die längst abgehakt waren: das Paket kommt
    /// nur, wenn daevo auf dem iPhone offen ist.
    var aufgaben: [UhrAufgabe] {
        (paket?.aufgaben ?? []).filter { a in
            if erledigt.contains(a.id) { return false }
            if let offen = todoistOffen, a.id.hasPrefix("todoist:") {
                return offen.contains(String(a.id.dropFirst("todoist:".count)))
            }
            return true
        }
    }

    /// Beim Öffnen der Uhr: das iPhone um den neuesten Stand bitten und
    /// Todoist selbst fragen. Ist daevo auf dem iPhone vorn, kommt ein
    /// neues Paket. Sonst bleibt das letzte, und Todoist sagt wenigstens,
    /// was dort schon erledigt ist.
    func auffrischen() async {
        if WCSession.isSupported(), WCSession.default.activationState == .activated, WCSession.default.isReachable {
            WCSession.default.sendMessage(["art": "aktualisieren"], replyHandler: { _ in }, errorHandler: { _ in })
        }
        await todoistLesen()
    }

    /// Liest die offenen Aufgaben aus Todoist, Schnittstelle v1, wie
    /// `packages/coach/src/todoist.ts`. Höchstens alle zwei Minuten.
    func todoistLesen() async {
        guard let token = Schluesselbund.lesen(), !token.isEmpty else { todoistOffen = nil; return }
        if let zuletzt = todoistGelesen, Date().timeIntervalSince(zuletzt) < 120 { return }
        var ids = Set<String>()
        var cursor: String?
        for _ in 0..<5 {
            var teile = URLComponents(string: "https://api.todoist.com/api/v1/tasks")!
            teile.queryItems = [URLQueryItem(name: "limit", value: "200")] + (cursor.map { [URLQueryItem(name: "cursor", value: $0)] } ?? [])
            var anfrage = URLRequest(url: teile.url!, timeoutInterval: 10)
            anfrage.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            guard let ergebnis = try? await URLSession.shared.data(for: anfrage),
                  (ergebnis.1 as? HTTPURLResponse)?.statusCode == 200,
                  let json = try? JSONSerialization.jsonObject(with: ergebnis.0) as? [String: Any] else { return }
            for roh in json["results"] as? [[String: Any]] ?? [] {
                if let id = roh["id"] as? String { ids.insert(id) } else if let id = roh["id"] as? Int { ids.insert(String(id)) }
            }
            cursor = json["next_cursor"] as? String
            if cursor?.isEmpty ?? true { break }
        }
        todoistOffen = ids
        todoistGelesen = Date()
    }

    /// Abhaken auf der Uhr. Das iPhone hakt beim nächsten Abgleich wirklich
    /// ab, bei Todoist auch dort. Bis dahin bleibt sie hier ausgeblendet.
    func aufgabeAbhaken(_ id: String) {
        erledigt.insert(id)
        UserDefaults.standard.set(Array(erledigt), forKey: erledigtSchluessel)
        senden(["art": "aufgabe", "aufgabeId": id])
        // Eine Todoist Aufgabe schliesst die Uhr gleich dort, sonst stünde sie
        // in Todoist offen, bis daevo auf dem iPhone wieder aufgeht. Das
        // iPhone hakt danach noch einmal ab, das schadet nicht.
        if id.hasPrefix("todoist:"), let token = Schluesselbund.lesen(), !token.isEmpty {
            let roh = String(id.dropFirst("todoist:".count))
            guard let url = URL(string: "https://api.todoist.com/api/v1/tasks/\(roh)/close") else { return }
            var anfrage = URLRequest(url: url, timeoutInterval: 10)
            anfrage.httpMethod = "POST"
            anfrage.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            let fertig = anfrage
            Task { _ = try? await URLSession.shared.data(for: fertig) }
        }
    }

    /// Die Termine ab jetzt: aus dem Kalender der Uhr, wenn sie darf, sonst
    /// aus dem Paket. Der Kalender der Uhr ist immer aktuell, auch wenn
    /// daevo auf dem iPhone seit Tagen nicht offen war.
    var termine: [UhrTermin] {
        let jetzt = Date().timeIntervalSince1970 * 1000
        return (kalenderTermine ?? paket?.termine ?? []).filter { $0.bis > jetzt }.sorted { $0.von < $1.von }
    }

    /// Liest den Kalender der Uhr, die nächsten sieben Tage. Fragt nur, wenn
    /// im Ziel der Uhr der Satz für den Kalender steht: ohne ihn beendet
    /// watchOS die App bei der Frage, und dann wäre die Uhr App kaputt statt
    /// nur ohne Kalender.
    func kalenderLesen() async {
        #if canImport(EventKit)
        guard Bundle.main.object(forInfoDictionaryKey: "NSCalendarsFullAccessUsageDescription") != nil else { return }
        let store = EKEventStore()
        switch EKEventStore.authorizationStatus(for: .event) {
        case .notDetermined:
            guard (try? await store.requestFullAccessToEvents()) == true else { return }
        case .fullAccess:
            break
        default:
            return
        }
        let jetzt = Date()
        guard let bis = Calendar.current.date(byAdding: .day, value: 7, to: jetzt) else { return }
        let ereignisse = store.events(matching: store.predicateForEvents(withStart: jetzt, end: bis, calendars: nil))
        var gesehen = Set<String>()
        var liste: [UhrTermin] = []
        for e in ereignisse.sorted(by: { $0.startDate < $1.startDate }) {
            let titel = (e.title ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            guard !titel.isEmpty, !istSchlafMarker(titel), e.endDate > jetzt else { continue }
            let von = e.startDate.timeIntervalSince1970 * 1000
            // Derselbe Termin aus zwei Kalendern zählt einmal, wie im Briefing.
            guard gesehen.insert("\(titel.lowercased())|\(von)").inserted else { continue }
            liste.append(UhrTermin(titel: titel, von: von, bis: e.endDate.timeIntervalSince1970 * 1000,
                                   ganztags: e.isAllDay, ort: e.location))
            if liste.count >= 30 { break }
        }
        kalenderTermine = liste
        #endif
    }

    /// Termine und Aufgaben als Text für die KI auf der Uhr. Ohne das
    /// beantwortete sie "was steht heute noch an" nur mit dem Stand vom
    /// letzten Abgleich, und der kennt keine Termine.
    func kontextFuerKi() -> String {
        var zeilen: [String] = []
        let kal = Calendar.current
        let t = termine.prefix(12)
        if !t.isEmpty {
            zeilen.append("Termine ab jetzt, aus dem Kalender:")
            for x in t {
                let tag = kal.isDateInToday(x.beginn) ? "heute" : kal.isDateInTomorrow(x.beginn) ? "morgen" : heuteText(x.beginn)
                zeilen.append("- \(tag) \(x.ganztags == true ? "ganztägig" : uhrzeitText(x.beginn) + " bis " + uhrzeitText(x.ende)) \(x.titel)")
            }
        }
        let a = aufgaben.prefix(10)
        if !a.isEmpty {
            zeilen.append("Offene Aufgaben in der Reihenfolge des Plans:")
            for x in a { zeilen.append("- \(x.wann == "heute" ? "heute" : "später")\(x.uhrzeit.map { " um " + $0 } ?? ""): \(x.text)") }
        }
        if standAlt { zeilen.append("Das Essen von heute ist noch nicht vom iPhone übernommen. Nenn keine Kalorien von heute.") }
        return zeilen.joined(separator: "\n")
    }

    func trainingFertig(titel: String, start: Date, ende: Date, uebungen: [Uebung]) {
        let liste: [[String: Any]] = uebungen.map { u in
            [
                "id": u.id,
                "name": u.name,
                "saetze": u.saetze.map { s -> [String: Any] in
                    var d: [String: Any] = ["fertig": s.fertig]
                    if let kg = s.kg { d["kg"] = kg }
                    if let wdh = s.wdh { d["wdh"] = wdh }
                    if let rir = s.rir { d["rir"] = rir }
                    return d
                },
            ]
        }
        let iso = ISO8601DateFormatter()
        senden([
            "art": "training", "titel": titel, "datum": heuteText(start),
            "start": iso.string(from: start), "ende": iso.string(from: ende), "uebungen": liste,
        ])
    }

    /// Ein Satz, den die Uhr ohne iPhone nicht eintragen kann. Das iPhone
    /// führt ihn beim nächsten Öffnen durch den ganzen Agenten.
    func vormerken(_ satz: String) {
        senden(["art": "satz", "text": satz])
    }

    /// Ein Gespräch, das die Uhr allein geführt hat, damit es danach auch
    /// auf dem iPhone im Verlauf steht.
    func gespraechMerken(frage: String, antwort: String) {
        senden(["art": "gespraech", "frage": frage, "antwort": antwort, "at": ISO8601DateFormatter().string(from: Date())])
    }

    /// Fragt das iPhone. Antwortet es nicht, ist es nicht vorn offen oder
    /// nicht in Reichweite, und es kommt `nil`: dann fragt die Uhr selbst.
    func frageAnsIphone(_ text: String) async -> String? {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated, WCSession.default.isReachable else { return nil }
        return await withCheckedContinuation { (fortsetzung: CheckedContinuation<String?, Never>) in
            let einmal = Einmal(fortsetzung)
            WCSession.default.sendMessage(["art": "frage", "text": text], replyHandler: { antwort in
                einmal.fertig(antwort["antwort"] as? String)
            }, errorHandler: { _ in
                einmal.fertig(nil)
            })
        }
    }

    private func senden(_ ereignis: [String: Any]) {
        var e = ereignis
        e["id"] = UUID().uuidString
        guard WCSession.isSupported() else { return }
        WCSession.default.transferUserInfo(e)
    }

    private func uebernehmen(_ daten: Data) {
        guard let neu = try? JSONDecoder().decode(Paket.self, from: daten) else { return }
        paket = neu
        // Das neue Paket enthält das Wasser schon, sobald die App es abgeholt
        // hat. Nur für denselben Tag: ein Paket von gestern kennt es nicht.
        if neu.tag == heuteText() {
            wasserOffen = 0
            UserDefaults.standard.removeObject(forKey: wasserSchluessel)
        }
        // Was im neuen Paket nicht mehr steht, hat das iPhone abgehakt.
        let ids = Set((neu.aufgaben ?? []).map(\.id))
        erledigt = erledigt.intersection(ids)
        UserDefaults.standard.set(Array(erledigt), forKey: erledigtSchluessel)
        UserDefaults.standard.set(daten, forKey: speicherSchluessel)
        Komplikation.schreiben(tag: neu.tag, kcal: neu.stand.kcal, kcalZiel: neu.stand.kcalZiel, protein: neu.stand.protein, proteinZiel: neu.stand.proteinZiel)
    }

    /// Der Application Context als JSON. Ein Wörterbuch mit `Any` darf unter
    /// Swift 6 nicht von der Warteschlange von WatchConnectivity auf den
    /// Hauptthread wandern, `Data` schon. Deshalb wird hier umgewandelt und
    /// erst auf dem Hauptthread gelesen.
    nonisolated private static func json(_ context: [String: Any]) -> Data? {
        guard var roh = context["paket"] as? [String: Any] else { return nil }
        // Der Todoist Schlüssel geht in den Schlüsselbund und nicht mit dem
        // Paket in die UserDefaults. Leer heisst: auf dem iPhone getrennt.
        if let token = roh.removeValue(forKey: "todoistToken") as? String {
            if token.isEmpty { Schluesselbund.loeschen() } else { Schluesselbund.schreiben(token) }
        }
        guard JSONSerialization.isValidJSONObject(roh) else { return nil }
        return try? JSONSerialization.data(withJSONObject: roh)
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        guard let daten = Self.json(session.receivedApplicationContext) else { return }
        Task { @MainActor in self.uebernehmen(daten) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let daten = Self.json(applicationContext) else { return }
        Task { @MainActor in self.uebernehmen(daten) }
    }
}

/// Setzt eine Fortsetzung genau einmal fort, auch wenn Antwort und Fehler
/// beide kommen. Zweimal fortsetzen bringt die App zum Absturz.
final class Einmal: @unchecked Sendable {
    private var fortsetzung: CheckedContinuation<String?, Never>?
    private let sperre = NSLock()
    init(_ f: CheckedContinuation<String?, Never>) { fortsetzung = f }
    func fertig(_ wert: String?) {
        sperre.lock()
        let f = fortsetzung
        fortsetzung = nil
        sperre.unlock()
        f?.resume(returning: wert)
    }
}

/// Der Todoist Schlüssel auf der Uhr. Im Schlüsselbund und nicht in den
/// UserDefaults: dort läge er im Klartext in einer Datei der App.
enum Schluesselbund {
    private static let konto = "daevo.todoist"

    private static var abfrage: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: konto]
    }

    static func lesen() -> String? {
        var q = abfrage
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var ergebnis: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &ergebnis) == errSecSuccess, let daten = ergebnis as? Data else { return nil }
        return String(data: daten, encoding: .utf8)
    }

    static func schreiben(_ token: String) {
        guard lesen() != token else { return }
        loeschen()
        var q = abfrage
        q[kSecValueData as String] = Data(token.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(q as CFDictionary, nil)
    }

    static func loeschen() {
        SecItemDelete(abfrage as CFDictionary)
    }
}
