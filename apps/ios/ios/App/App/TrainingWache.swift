import Foundation
import HealthKit
import UserNotifications

/// Meldet ein Training von der Apple Watch, auch wenn daevo zu ist.
///
/// iOS weckt die App über einen `HKObserverQuery` mit Hintergrundlieferung,
/// sobald ein neues Training in Apple Health steht. Dann kommt eine
/// Mitteilung, und beim nächsten Öffnen trägt die App das Training ein,
/// schreibt es in den Kalender und fragt nach einem noch geplanten Training,
/// siehe `training-erkannt.js`. Die Regeln stehen dort und nicht hier: eine
/// zweite Fassung in Swift liefe nach drei Monaten anders.
///
/// Trainings, die die daevo Uhr App selbst aufzeichnet, meldet sie nicht:
/// die kommen schon über die Uhr in den Tag.
///
/// Braucht das Recht `com.apple.developer.healthkit.background-delivery` in
/// App.entitlements. Ungeprüft: hier ist nichts kompiliert.
final class TrainingWache {
    static let shared = TrainingWache()
    private let store = HKHealthStore()
    private let gemeldetSchluessel = "daevo.training.gemeldet"
    private var laeuft = false

    func starten() {
        guard HKHealthStore.isHealthDataAvailable(), !laeuft else { return }
        laeuft = true
        let typ = HKObjectType.workoutType()
        let abfrage = HKObserverQuery(sampleType: typ, predicate: nil) { [weak self] _, fertig, fehler in
            guard fehler == nil, let self else { fertig(); return }
            self.pruefen(fertig)
        }
        store.execute(abfrage)
        store.enableBackgroundDelivery(for: typ, frequency: .immediate) { _, _ in }
    }

    private func pruefen(_ fertig: @escaping () -> Void) {
        // Nur die letzten drei Stunden. Ein Training von gestern, das beim
        // ersten Start auftaucht, ist keine Nachricht wert.
        let seit = Date().addingTimeInterval(-3 * 3600)
        let filter = HKQuery.predicateForSamples(withStart: seit, end: Date())
        let sortierung = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
        let abfrage = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: filter, limit: 10, sortDescriptors: sortierung) { [weak self] _, proben, _ in
            guard let self else { fertig(); return }
            let defaults = UserDefaults.standard
            var gemeldet = defaults.stringArray(forKey: self.gemeldetSchluessel) ?? []
            let eigene = Bundle.main.bundleIdentifier ?? "de.daevo"
            for w in (proben as? [HKWorkout]) ?? [] {
                let id = w.uuid.uuidString
                if gemeldet.contains(id) || w.duration < 300 { continue }
                if w.sourceRevision.source.bundleIdentifier.hasPrefix(eigene) { gemeldet.append(id); continue }
                gemeldet.append(id)
                let minuten = Int((w.duration / 60).rounded())
                let inhalt = UNMutableNotificationContent()
                inhalt.title = "Mega stark"
                inhalt.body = "Du hast heute schon trainiert: \(minuten) Minuten \(Self.name(GesundheitPlugin.art(w.workoutActivityType))). Tipp hier, dann trägt daevo es ein."
                inhalt.sound = .default
                inhalt.userInfo = ["art": "training"]
                let anfrage = UNNotificationRequest(identifier: "daevo.training.\(id)", content: inhalt, trigger: nil)
                UNUserNotificationCenter.current().add(anfrage)
            }
            defaults.set(Array(gemeldet.suffix(50)), forKey: self.gemeldetSchluessel)
            fertig()
        }
        store.execute(abfrage)
    }

    static func name(_ art: String) -> String {
        switch art {
        case "strength": return "Krafttraining"
        case "team_sport": return "Mannschaftstraining"
        case "mobility": return "Mobility"
        default: return "Ausdauertraining"
        }
    }
}
