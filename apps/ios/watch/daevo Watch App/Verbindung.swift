import Foundation
import WatchConnectivity

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

    private func uebernehmen(_ context: [String: Any]) {
        guard let neu = Paket.aus(context["paket"]) else { return }
        paket = neu
        // Das neue Paket enthält das Wasser schon, sobald die App es abgeholt hat.
        wasserOffen = 0
        if let daten = try? JSONEncoder().encode(neu) { UserDefaults.standard.set(daten, forKey: speicherSchluessel) }
    }

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let context = session.receivedApplicationContext
        Task { @MainActor in self.uebernehmen(context) }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.uebernehmen(applicationContext) }
    }
}
