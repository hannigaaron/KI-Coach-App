import SwiftUI

/// Der Tag auf einen Blick: Kalorien als Ring, Eiweiss und Wasser darunter,
/// ein Knopf für ein Glas Wasser. Mehr nicht: eine Uhr ist für einen Blick
/// gemacht, nicht für eine Tabelle.
struct HeuteAnsicht: View {
    @EnvironmentObject var verbindung: Verbindung

    var body: some View {
        ScrollView {
            if let s = verbindung.standHeute {
                VStack(spacing: 10) {
                    ZStack {
                        Circle().stroke(Color.white.opacity(0.12), lineWidth: 10)
                        Circle()
                            .trim(from: 0, to: anteil(s.kcal, s.kcalZiel))
                            .stroke(Farben.marke, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        VStack(spacing: 0) {
                            Text("\(max(0, s.kcalZiel - s.kcal))").font(.system(size: 30, weight: .semibold, design: .rounded))
                            Text("kcal offen").font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .frame(width: 118, height: 118)
                    zeile("Eiweiß", "\(s.protein) von \(s.proteinZiel) g", anteil(s.protein, s.proteinZiel))
                    zeile("Wasser", String(format: "%.1f von %.1f l", Double(s.wasserMl) / 1000, Double(s.wasserZiel) / 1000).replacingOccurrences(of: ".", with: ","), anteil(s.wasserMl, s.wasserZiel))
                    Button {
                        verbindung.wasser(250)
                        WKHaptik.erfolg()
                    } label: {
                        Label("250 ml Wasser", systemImage: "drop.fill")
                    }
                    .tint(Farben.marke)
                }
                .padding(.horizontal, 4)
            } else {
                VStack(spacing: 8) {
                    Text("Öffne daevo auf dem iPhone, dann kommt dein Tag hierher.")
                        .font(.footnote)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                .padding()
            }
        }
        .navigationTitle("Heute")
    }

    private func zeile(_ titel: String, _ wert: String, _ anteil: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(titel).font(.footnote)
                Spacer()
                Text(wert).font(.footnote).foregroundStyle(.secondary)
            }
            ProgressView(value: anteil).tint(Farben.marke)
        }
    }

    private func anteil(_ wert: Int, _ ziel: Int) -> Double {
        guard ziel > 0 else { return 0 }
        return min(1, Double(wert) / Double(ziel))
    }
}

enum Farben {
    /// Das Logoblau, auf dunklem Grund wie auf der Uhr gut lesbar.
    static let marke = Color(red: 0x96 / 255, green: 0xD8 / 255, blue: 0xF0 / 255)
}
