import Foundation
import WatchConnectivity
import WidgetKit

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
    /// Wasser, das hier getippt, aber noch nicht im neuen Paket zurück ist.
    @Published private(set) var wasserOffen = 0

    private let speicherSchluessel = "daevo.uhr.paket"

    override init() {
        super.init()
        if let daten = UserDefaults.standard.data(forKey: speicherSchluessel),
           let alt = try? JSONDecoder().decode(Paket.self, from: daten) {
            paket = alt
        }
    }

    func starten() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Der Stand gilt nur für den Tag, für den er gerechnet wurde. Nach
    /// Mitternacht zeigt die Uhr sonst die Kalorien von gestern.
    var standHeute: Stand? {
        guard let paket, paket.tag == heuteText() else { return nil }
        var s = paket.stand
        s.wasserMl += wasserOffen
        return s
    }

    func wasser(_ ml: Int) {
        wasserOffen += ml
        senden(["art": "wasser", "ml": ml, "tag": heuteText()])
        if let s = standHeute { Komplikation.schreiben(tag: heuteText(), kcal: s.kcal, kcalZiel: s.kcalZiel, protein: s.protein, proteinZiel: s.proteinZiel) }
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

    private func senden(_ ereignis: [String: Any]) {
        var e = ereignis
        e["id"] = UUID().uuidString
        guard WCSession.isSupported() else { return }
        WCSession.default.transferUserInfo(e)
    }

    private func uebernehmen(_ daten: Data) {
        guard let neu = try? JSONDecoder().decode(Paket.self, from: daten) else { return }
        paket = neu
        // Das neue Paket enthält das Wasser schon, sobald die App es abgeholt hat.
        wasserOffen = 0
        UserDefaults.standard.set(daten, forKey: speicherSchluessel)
        Komplikation.schreiben(tag: neu.tag, kcal: neu.stand.kcal, kcalZiel: neu.stand.kcalZiel, protein: neu.stand.protein, proteinZiel: neu.stand.proteinZiel)
    }

    /// Der Application Context als JSON. Ein Wörterbuch mit `Any` darf unter
    /// Swift 6 nicht von der Warteschlange von WatchConnectivity auf den
    /// Hauptthread wandern, `Data` schon. Deshalb wird hier umgewandelt und
    /// erst auf dem Hauptthread gelesen.
    nonisolated private static func json(_ context: [String: Any]) -> Data? {
        guard let roh = context["paket"], JSONSerialization.isValidJSONObject(roh) else { return nil }
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
