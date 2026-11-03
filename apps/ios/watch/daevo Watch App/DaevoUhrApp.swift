import SwiftUI
import WatchKit

/// daevo auf der Apple Watch. Drei Seiten: das d zum Reden, der Tag und das
/// Training. Gerechnet wird auf dem iPhone.
@main
struct DaevoUhrApp: App {
    @StateObject private var verbindung = Verbindung.shared

    init() {
        Verbindung.shared.starten()
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                TabView {
                    AssistentAnsicht()
                    HeuteAnsicht()
                    TrainingAnsicht()
                }
                .tabViewStyle(.verticalPage)
            }
            .environmentObject(verbindung)
        }
    }
}

/// Spürbare Rückmeldung, dieselben Bedeutungen wie in der iPhone App.
enum WKHaptik {
    static func erfolg() { WKInterfaceDevice.current().play(.success) }
    static func pauseVorbei() { WKInterfaceDevice.current().play(.notification) }
}
