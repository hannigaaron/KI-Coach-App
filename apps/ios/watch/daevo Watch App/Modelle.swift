import Foundation

/// Das Paket vom iPhone, gerechnet in `apps/pwa/js/uhr.js`. Die Uhr rechnet
/// nichts selbst nach, sie zeigt an und zählt mit.
struct Paket: Codable, Equatable {
    var fassung: Int
    var tag: String
    var stand: Stand
    var gestrichen: Bool
    var trainings: [TrainingVorlage]
    /// Der Weg zur KI, wenn das iPhone nicht antworten kann. Fehlt ohne
    /// Einwilligung oder Konto, dann redet die Uhr nur über das iPhone.
    var ki: KiZugang?
    /// Ab Fassung 2. Optional, damit ein altes Paket weiter gelesen wird.
    var termine: [UhrTermin]?
    var aufgaben: [UhrAufgabe]?
    /// Wann das iPhone gerechnet hat, Millisekunden seit 1970.
    var stamp: Double?
}

/// Ein Termin, vom iPhone oder direkt aus dem Kalender der Uhr.
struct UhrTermin: Codable, Equatable, Hashable {
    var titel: String
    var von: Double
    var bis: Double
    var ganztags: Bool?
    var ort: String?

    var beginn: Date { Date(timeIntervalSince1970: von / 1000) }
    var ende: Date { Date(timeIntervalSince1970: bis / 1000) }
}

/// Eine offene Aufgabe in der Reihenfolge des Plans auf dem iPhone.
struct UhrAufgabe: Codable, Equatable, Hashable, Identifiable {
    var id: String
    var text: String
    /// "heute" oder "spaeter".
    var wann: String?
    var uhrzeit: String?
    var faellig: String?
    var wichtig: Bool?
    var todoist: Bool?
}

/// Dieselbe Regel wie `istSchlafMarker` in packages/core: SLEEP und
/// Schlafenszeit sind Marker im Kalender und keine Termine.
func istSchlafMarker(_ titel: String) -> Bool {
    let kern = String(titel.unicodeScalars.filter { CharacterSet.letters.contains($0) || CharacterSet.whitespaces.contains($0) })
        .trimmingCharacters(in: .whitespaces).lowercased()
    return ["sleep", "schlaf", "schlafen", "schlafenszeit", "bett", "bettzeit", "ins bett", "nachtruhe", "bedtime"].contains(kern)
}

/// Uhrzeit als HH:MM in der Zeit der Uhr.
func uhrzeitText(_ datum: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "de_DE")
    f.dateFormat = "HH:mm"
    return f.string(from: datum)
}

struct KiZugang: Codable, Equatable {
    var url: String
    var token: String?
    var schluessel: String?
    var modell: String
    var system: String
    var sprechen: Bool
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
