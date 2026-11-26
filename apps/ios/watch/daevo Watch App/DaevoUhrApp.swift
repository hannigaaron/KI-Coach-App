import SwiftUI
import WatchKit
import HealthKit

/// Startet das iPhone ein Training, öffnet es über `startWatchApp` diese App
/// mit einer Krafttraining Einstellung. watchOS ruft dann `handle` auf.
final class UhrDelegate: NSObject, WKApplicationDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        Task { @MainActor in
            Verbindung.shared.startWunsch = true
            await Verbindung.shared.auffrischen()
        }
    }
}

/// daevo auf der Apple Watch. Vier Seiten: das d zum Reden, Termine und
/// Aufgaben, Essen und Wasser, das Training. Gerechnet wird auf dem iPhone,
/// die Uhr hält den letzten Stand und liest ihren Kalender selbst.
@main
struct DaevoUhrApp: App {
    @WKApplicationDelegateAdaptor(UhrDelegate.self) private var delegate
    @StateObject private var verbindung = Verbindung.shared
    @Environment(\.scenePhase) private var phase
    @State private var pfad: [TrainingVorlage] = []

    init() {
        Verbindung.shared.starten()
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack(path: $pfad) {
                TabView {
                    AssistentAnsicht()
                    TagAnsicht()
                    HeuteAnsicht()
                    TrainingAnsicht()
                }
                .tabViewStyle(.verticalPage)
                .navigationDestination(for: TrainingVorlage.self) { t in TrainingLauf(vorlage: t) }
            }
            .environmentObject(verbindung)
            // Bei jedem Hochnehmen des Handgelenks den neuesten Stand holen,
            // nicht nur beim ersten Start der App.
            .onChange(of: phase) { _, neu in
                if neu == .active { Task { await verbindung.auffrischen() } }
            }
            // Vom iPhone gestartet: das laufende Training öffnen, sobald es
            // im Paket steht. Das Paket kommt oft eine Sekunde nach dem Start.
            .onChange(of: verbindung.paket) { _, _ in laufendesOeffnen() }
            .onChange(of: verbindung.startWunsch) { _, _ in laufendesOeffnen() }
        }
    }
}

extension DaevoUhrApp {
    @MainActor private func laufendesOeffnen() {
        guard verbindung.startWunsch,
              let t = verbindung.paket?.trainings.first(where: { $0.quelle == "offen" }) else { return }
        verbindung.startWunsch = false
        if pfad.last?.titel != t.titel { pfad = [t] }
    }
}

/// Spürbare Rückmeldung, dieselben Bedeutungen wie in der iPhone App.
enum WKHaptik {
    static func erfolg() { WKInterfaceDevice.current().play(.success) }
    static func pauseVorbei() { WKInterfaceDevice.current().play(.notification) }
}
