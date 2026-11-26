import SwiftUI

/// Der Tag auf einen Blick: Kalorien als Ring, Eiweiss und Wasser darunter,
/// ein Knopf für ein Glas Wasser. Mehr nicht: eine Uhr ist für einen Blick
/// gemacht, nicht für eine Tabelle.
struct HeuteAnsicht: View {
    @EnvironmentObject var verbindung: Verbindung

    var body: some View {
        ScrollView {
            if let s = verbindung.standHeute {
                let alt = verbindung.standAlt
                VStack(spacing: 10) {
                    ZStack {
                        Circle().stroke(Color.white.opacity(0.12), lineWidth: 10)
                        Circle()
                            .trim(from: 0, to: anteil(s.kcal, s.kcalZiel))
                            .stroke(Farben.marke, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                        VStack(spacing: 0) {
                            Text("\(max(0, s.kcalZiel - s.kcal))").font(.system(size: 30, weight: .semibold, design: .rounded))
                            Text(alt ? "kcal Ziel" : "kcal offen").font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .frame(width: 118, height: 118)
                    if alt {
                        // Gegessenes von heute kennt nur das iPhone. Eine 0
                        // als Stand wäre eine Zahl, die niemand gesagt hat.
                        Text("Essen von heute kommt, sobald daevo auf dem iPhone offen war. Sag es mir trotzdem, ich merke es vor.")
                            .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    } else {
                        zeile("Eiweiß", "\(s.protein) von \(s.proteinZiel) g", anteil(s.protein, s.proteinZiel))
                    }
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

/// Termine und Aufgaben, wie Dein Tag auf dem iPhone. Oben was als Nächstes
/// kommt, gross und in der Markenfarbe, darunter der Rest blass. Abgehakt
/// wird mit einem Tipp auf den Kreis, das iPhone übernimmt es beim nächsten
/// Abgleich, bei Todoist auch dort.
struct TagAnsicht: View {
    @EnvironmentObject var verbindung: Verbindung

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                termineTeil
                aufgabenTeil
                if let stand = verbindung.abgleich {
                    Text(standText(stand))
                        .font(.caption2).foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle("Dein Tag")
        .task {
            await verbindung.kalenderLesen()
            await verbindung.auffrischen()
        }
    }

    @ViewBuilder private var termineTeil: some View {
        let kal = Calendar.current
        let heute = verbindung.termine.filter { kal.isDateInToday($0.beginn) || $0.beginn < Date() }
        let morgen = verbindung.termine.filter { kal.isDateInTomorrow($0.beginn) }
        Text("Termine").font(.headline)
        if heute.isEmpty && morgen.isEmpty {
            Text(verbindung.paket == nil && verbindung.kalenderTermine == nil ? "Noch kein Abgleich mit dem iPhone." : "Heute und morgen steht nichts mehr an.")
                .font(.footnote).foregroundStyle(.secondary)
        }
        ForEach(Array(heute.prefix(6).enumerated()), id: \.element) { i, t in
            terminZeile(t, erster: i == 0)
        }
        if !morgen.isEmpty {
            Text("Morgen").font(.footnote).foregroundStyle(.secondary).padding(.top, 2)
            ForEach(Array(morgen.prefix(4)), id: \.self) { t in terminZeile(t, erster: false) }
        }
    }

    private func terminZeile(_ t: UhrTermin, erster: Bool) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(t.ganztags == true ? "ganztags" : uhrzeitText(t.beginn))
                .font(.system(.footnote, design: .rounded).monospacedDigit())
                .foregroundStyle(erster ? Farben.marke : .secondary)
                .frame(width: 44, alignment: .leading)
            VStack(alignment: .leading, spacing: 0) {
                Text(t.titel).font(erster ? .body.weight(.semibold) : .footnote).lineLimit(2)
                if erster, let ort = t.ort, !ort.isEmpty { Text(ort).font(.caption2).foregroundStyle(.secondary).lineLimit(1) }
            }
        }
        .opacity(erster ? 1 : 0.8)
    }

    @ViewBuilder private var aufgabenTeil: some View {
        let liste = verbindung.aufgaben
        Text("Aufgaben").font(.headline).padding(.top, 6)
        if liste.isEmpty {
            Text(verbindung.paket == nil ? "Noch kein Abgleich mit dem iPhone." : "Nichts offen.")
                .font(.footnote).foregroundStyle(.secondary)
        }
        ForEach(Array(liste.enumerated()), id: \.element.id) { i, a in
            HStack(alignment: .top, spacing: 8) {
                Button {
                    WKHaptik.erfolg()
                    withAnimation(.easeOut(duration: 0.25)) { verbindung.aufgabeAbhaken(a.id) }
                } label: {
                    Image(systemName: "circle").font(.title3).foregroundStyle(Farben.marke)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(a.text) abhaken")
                VStack(alignment: .leading, spacing: 1) {
                    Text(a.text).font(i == 0 ? .body.weight(.semibold) : .footnote).lineLimit(3)
                    if let zusatz = zusatz(a) { Text(zusatz).font(.caption2).foregroundStyle(.secondary) }
                }
            }
            .opacity(i == 0 ? 1 : 0.8)
        }
    }

    /// Wie alt der Stand ist. Von gestern oder früher steht es deutlich da,
    /// mit dem Weg zum neuen: ein alter Stand, der wie ein heutiger aussieht,
    /// ist der Fehler, den die Uhr nicht machen darf.
    private func standText(_ stand: Date) -> String {
        let todoist = verbindung.todoistOffen != nil ? " Todoist gerade gelesen." : ""
        if Calendar.current.isDateInToday(stand) { return "Vom iPhone, Stand \(uhrzeitText(stand)).\(todoist)" }
        return "Stand vom \(datumKurzText(stand)). Öffne daevo auf dem iPhone für den neuen Plan.\(todoist)"
    }

    private func zusatz(_ a: UhrAufgabe) -> String? {
        var teile: [String] = []
        // "heute" aus einem Paket von gestern wäre falsch.
        if a.wann != "heute" && !verbindung.standAlt { teile.append("später") }
        if let u = a.uhrzeit { teile.append("um \(u)") }
        if a.wichtig == true { teile.append("wichtig") }
        if a.todoist == true { teile.append("Todoist") }
        return teile.isEmpty ? nil : teile.joined(separator: ", ")
    }
}
