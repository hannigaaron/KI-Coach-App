import SwiftUI
import WatchKit

/// daevo auf der Apple Watch. Vier Seiten: das d zum Reden, Termine und
/// Aufgaben, Essen und Wasser, das Training. Gerechnet wird auf dem iPhone,
/// die Uhr hält den letzten Stand und liest ihren Kalender selbst.
@main
struct DaevoUhrApp: App {
    @StateObject private var verbindung = Verbindung.shared
    @Environment(\.scenePhase) private var phase

    init() {
        Verbindung.shared.starten()
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                TabView {
                    AssistentAnsicht()
                    TagAnsicht()
                    HeuteAnsicht()
                    TrainingAnsicht()
                }
                .tabViewStyle(.verticalPage)
            }
            .environmentObject(verbindung)
            // Bei jedem Hochnehmen des Handgelenks den neuesten Stand holen,
            // nicht nur beim ersten Start der App.
            .onChange(of: phase) { _, neu in
                if neu == .active { Task { await verbindung.auffrischen() } }
            }
        }
    }
}

/// Spürbare Rückmeldung, dieselben Bedeutungen wie in der iPhone App.
enum WKHaptik {
    static func erfolg() { WKInterfaceDevice.current().play(.success) }
    static func pauseVorbei() { WKInterfaceDevice.current().play(.notification) }
}
