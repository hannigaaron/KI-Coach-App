import Foundation
import WidgetKit

/// Was die Komplikation auf dem Zifferblatt zeigt, und wo es liegt.
///
/// Uhr App und Komplikation sind zwei Programme. Sie teilen nur, was in der
/// gemeinsamen App Group liegt: der Stand des Tages als JSON. Die Uhr App
/// schreibt ihn bei jedem neuen Paket vom iPhone und bei jedem Glas Wasser,
/// die Komplikation liest ihn. Rechnen tut keine von beiden.
///
/// Diese Datei gehört zu beiden Zielen, `daevo Watch App` und
/// `daevo Komplikation`.
enum Komplikation {
    /// Muss in beiden Zielen unter App Groups stehen, siehe docs/WATCH.md.
    static let gruppe = "group.de.daevo.app"
    static let schluessel = "daevo.komplikation.stand"
    static let art = "DaevoKalorien"

    struct Gespeichert: Codable {
        var tag: String
        var kcal: Int
        var kcalZiel: Int
        var protein: Int
        var proteinZiel: Int
    }

    /// Einzelne Zahlen statt des Typs `Stand`: den kennt nur die Uhr App,
    /// diese Datei wird auch im Ziel der Komplikation gebaut.
    static func schreiben(tag: String, kcal: Int, kcalZiel: Int, protein: Int, proteinZiel: Int) {
        let g = Gespeichert(tag: tag, kcal: kcal, kcalZiel: kcalZiel, protein: protein, proteinZiel: proteinZiel)
        guard let speicher = UserDefaults(suiteName: gruppe), let daten = try? JSONEncoder().encode(g) else { return }
        speicher.set(daten, forKey: schluessel)
        WidgetCenter.shared.reloadTimelines(ofKind: art)
    }

    static func lesen() -> Gespeichert? {
        guard let daten = UserDefaults(suiteName: gruppe)?.data(forKey: schluessel) else { return nil }
        return try? JSONDecoder().decode(Gespeichert.self, from: daten)
    }
}
