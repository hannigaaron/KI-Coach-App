import SwiftUI
import WidgetKit

/// Die offenen Kalorien auf dem Zifferblatt.
///
/// Ein Stand gilt nur für seinen Tag. Nach Mitternacht steht ein Strich da
/// statt der Zahl von gestern, bis die Uhr das neue Paket vom iPhone hat:
/// eine falsche Zahl am Handgelenk wäre schlimmer als keine.
struct Eintrag: TimelineEntry {
    let date: Date
    let stand: Komplikation.Gespeichert?

    var offen: Int? { stand.map { max(0, $0.kcalZiel - $0.kcal) } }
    var anteil: Double {
        guard let s = stand, s.kcalZiel > 0 else { return 0 }
        return min(1, Double(s.kcal) / Double(s.kcalZiel))
    }
}

struct Lieferant: TimelineProvider {
    func placeholder(in context: Context) -> Eintrag {
        Eintrag(date: Date(), stand: .init(tag: tagText(Date()), kcal: 1460, kcalZiel: 2900, protein: 96, proteinZiel: 170))
    }

    func getSnapshot(in context: Context, completion: @escaping (Eintrag) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : eintrag(Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Eintrag>) -> Void) {
        let jetzt = Date()
        let mitternacht = Calendar.current.startOfDay(for: jetzt).addingTimeInterval(86_400)
        // Zwei Einträge: jetzt der Stand, ab Mitternacht leer. Neu geladen
        // wird, sobald die Uhr App einen neuen Stand schreibt.
        completion(Timeline(entries: [eintrag(jetzt), Eintrag(date: mitternacht, stand: nil)], policy: .after(mitternacht)))
    }

    private func eintrag(_ datum: Date) -> Eintrag {
        let s = Komplikation.lesen()
        return Eintrag(date: datum, stand: s?.tag == tagText(datum) ? s : nil)
    }
}

func tagText(_ datum: Date) -> String {
    let f = DateFormatter()
    f.calendar = Calendar(identifier: .gregorian)
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyy-MM-dd"
    return f.string(from: datum)
}

struct KomplikationAnsicht: View {
    @Environment(\.widgetFamily) private var familie
    let eintrag: Eintrag
    private let marke = Color(red: 0x96 / 255, green: 0xD8 / 255, blue: 0xF0 / 255)

    var body: some View {
        switch familie {
        case .accessoryCircular:
            Gauge(value: eintrag.anteil) {
                Text("kcal")
            } currentValueLabel: {
                Text(eintrag.offen.map(String.init) ?? "–").minimumScaleFactor(0.5)
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .tint(marke)
        case .accessoryCorner:
            Text(eintrag.offen.map(String.init) ?? "–")
                .widgetCurvesContent()
                .widgetLabel { Gauge(value: eintrag.anteil) { Text("kcal") }.tint(marke) }
        case .accessoryInline:
            Text(eintrag.offen.map { "\($0) kcal offen" } ?? "daevo")
        default:
            VStack(alignment: .leading, spacing: 2) {
                Text("daevo").font(.headline).foregroundStyle(marke)
                if let s = eintrag.stand, let offen = eintrag.offen {
                    Text("\(offen) kcal offen")
                    Text("Eiweiß \(s.protein) von \(s.proteinZiel) g").foregroundStyle(.secondary)
                } else {
                    Text("Öffne daevo auf dem iPhone.").foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

@main
struct DaevoKomplikation: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: Komplikation.art, provider: Lieferant()) { eintrag in
            KomplikationAnsicht(eintrag: eintrag)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("Kalorien offen")
        .description("Wie viele Kalorien heute noch offen sind.")
        .supportedFamilies([.accessoryCircular, .accessoryCorner, .accessoryInline, .accessoryRectangular])
    }
}
