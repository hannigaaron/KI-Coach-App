import Foundation

/// Das Paket vom iPhone, gerechnet in `apps/pwa/js/uhr.js`. Die Uhr rechnet
/// nichts selbst nach, sie zeigt an und zählt mit.
struct Paket: Codable, Equatable {
    var fassung: Int
    var tag: String
    var stand: Stand
    var gestrichen: Bool
    var trainings: [TrainingVorlage]
}

struct Stand: Codable, Equatable {
    var kcal: Int
    var kcalZiel: Int
    var protein: Int
    var proteinZiel: Int
    var wasserMl: Int
    var wasserZiel: Int
}

struct TrainingVorlage: Codable, Equatable, Identifiable, Hashable {
    var schluessel: String
    var quelle: String
    var titel: String
    var entwurf: Entwurf
    var id: String { schluessel }
}

struct Entwurf: Codable, Equatable, Hashable {
    var titel: String
    var datum: String
    var uebungen: [Uebung]
}

struct Uebung: Codable, Equatable, Hashable, Identifiable {
    var id: String
    var name: String
    var wdhZiel: String
    var pauseSek: Int
    var saetze: [Satz]
}

struct Satz: Codable, Equatable, Hashable {
    var kg: Double?
    var wdh: Int?
    var rir: Int?
    var fertig: Bool
}

extension Paket {
    /// Aus dem Application Context. Der kommt als Wörterbuch, der Umweg über
    /// JSON spart eine zweite Fassung jedes Felds von Hand.
    static func aus(_ roh: Any?) -> Paket? {
        guard let roh, JSONSerialization.isValidJSONObject(roh),
              let daten = try? JSONSerialization.data(withJSONObject: roh) else { return nil }
        return try? JSONDecoder().decode(Paket.self, from: daten)
    }
}

/// Heute als JJJJ-MM-TT in der Ortszeit, wie die App rechnet.
func heuteText(_ datum: Date = Date()) -> String {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: datum)
}

/// Kilo mit Komma und ohne ",0".
func kiloText(_ kg: Double?) -> String {
    guard let kg, kg > 0 else { return "ohne" }
    if kg == kg.rounded() { return String(Int(kg)) }
    return String(format: "%.1f", kg).replacingOccurrences(of: ".", with: ",")
}
