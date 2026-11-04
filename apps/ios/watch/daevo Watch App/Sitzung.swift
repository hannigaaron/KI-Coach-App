import Foundation
// ObservableObject und @Published kommen aus Combine. Neue Ziele in Xcode 26
// importieren Module nicht mehr über andere mit, ohne diese Zeile baut es nicht.
import Combine
import HealthKit

/// Eine Krafttraining Sitzung in HealthKit, solange auf der Uhr trainiert wird.
///
/// Zwei Gründe. Ohne laufende Sitzung schickt watchOS eine App nach kurzer
/// Zeit in den Hintergrund, und die Pause zwischen zwei Sätzen läuft dann
/// ohne Vibration ab. Und das Training steht danach mit Puls und Kalorien in
/// Apple Health. Der Abgleich in daevo legt es nicht doppelt an: ein
/// Krafttraining aus Health innerhalb von 90 Minuten um eines, das schon im
/// Tag steht, zählt nicht, siehe `apps/pwa/js/healthkit.js`.
@MainActor
final class Sitzung: NSObject, ObservableObject {
    private let store = HKHealthStore()
    private var sitzung: HKWorkoutSession?
    private var bauer: HKLiveWorkoutBuilder?
    @Published private(set) var puls: Int?
    @Published private(set) var laeuft = false

    func starten() async {
        guard HKHealthStore.isHealthDataAvailable(), sitzung == nil else { return }
        let lesen: Set<HKObjectType> = [HKQuantityType(.heartRate), HKQuantityType(.activeEnergyBurned)]
        try? await store.requestAuthorization(toShare: [HKObjectType.workoutType()], read: lesen)
        let einstellung = HKWorkoutConfiguration()
        einstellung.activityType = .traditionalStrengthTraining
        einstellung.locationType = .indoor
        do {
            let s = try HKWorkoutSession(healthStore: store, configuration: einstellung)
            let b = s.associatedWorkoutBuilder()
            b.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: einstellung)
            s.delegate = self
            b.delegate = self
            sitzung = s
            bauer = b
            let jetzt = Date()
            s.startActivity(with: jetzt)
            try await b.beginCollection(at: jetzt)
            laeuft = true
        } catch {
            // Ohne Erlaubnis für Health läuft das Training trotzdem, nur ohne
            // Puls und mit dem üblichen Verhalten von watchOS im Hintergrund.
            sitzung = nil
            bauer = nil
        }
    }

    func beenden(speichern: Bool) async {
        guard let s = sitzung, let b = bauer else { return }
        s.end()
        do {
            try await b.endCollection(at: Date())
            if speichern { _ = try await b.finishWorkout() } else { b.discardWorkout() }
        } catch {}
        sitzung = nil
        bauer = nil
        laeuft = false
        puls = nil
    }
}

extension Sitzung: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {}
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension Sitzung: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        let typ = HKQuantityType(.heartRate)
        guard collectedTypes.contains(typ),
              let wert = workoutBuilder.statistics(for: typ)?.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) else { return }
        Task { @MainActor in self.puls = Int(wert.rounded()) }
    }
}
