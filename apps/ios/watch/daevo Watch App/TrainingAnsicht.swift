import SwiftUI

/// Die Trainings, die das iPhone vorbereitet hat, zum Starten.
struct TrainingAnsicht: View {
    @EnvironmentObject var verbindung: Verbindung

    var body: some View {
        List {
            if let paket = verbindung.paket {
                if paket.gestrichen && paket.tag == heuteText() {
                    Text("Heute ist dein Training gestrichen, der Tag gehört der Erholung.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                ForEach(paket.trainings) { t in
                    NavigationLink(value: t) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(t.titel).font(.headline).lineLimit(2)
                            Text(untertitel(t)).font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                }
                if paket.trainings.isEmpty {
                    Text("Noch kein Plan. Leg im iPhone unter Trainingspläne einen an.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            } else {
                Text("Öffne daevo auf dem iPhone, dann kommen deine Trainings hierher.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Training")
        .navigationDestination(for: TrainingVorlage.self) { t in TrainingLauf(vorlage: t) }
    }

    private func untertitel(_ t: TrainingVorlage) -> String {
        let n = t.entwurf.uebungen.count
        let art = t.quelle == "offen" ? "fortsetzen" : t.quelle == "heute" ? "aus dem Gespräch" : "aus deinem Plan"
        return "\(n) \(n == 1 ? "Übung" : "Übungen"), \(art)"
    }
}

/// Ein laufendes Training. Je Satz Kilo und Wiederholungen, verstellbar mit
/// der Krone, ein Haken, danach die Pause mit Vibration am Ende. Vorbelegt
/// ist alles mit dem letzten Mal, wie im Trainingsmodus der App.
struct TrainingLauf: View {
    let vorlage: TrainingVorlage
    @EnvironmentObject var verbindung: Verbindung
    @StateObject private var sitzung = Sitzung()
    @Environment(\.dismiss) private var schliessen

    @State private var uebungen: [Uebung] = []
    @State private var ui = 0
    @State private var si = 0
    @State private var start = Date()
    @State private var pauseBis: Date?
    @State private var feld: Feld = .wdh
    @State private var krone: Double = 0
    @State private var beendenFragen = false

    enum Feld { case kg, wdh }

    var body: some View {
        Group {
            if uebungen.isEmpty {
                ProgressView()
            } else if let bis = pauseBis {
                pauseAnsicht(bis)
            } else {
                satzAnsicht
            }
        }
        .navigationTitle(vorlage.titel)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { beendenFragen = true } label: { Image(systemName: "xmark") }
            }
        }
        .confirmationDialog("Training beenden?", isPresented: $beendenFragen) {
            Button("Speichern und beenden") { beenden(speichern: true) }
            Button("Verwerfen", role: .destructive) { beenden(speichern: false) }
            Button("Weiter trainieren", role: .cancel) {}
        }
        .task {
            if uebungen.isEmpty {
                uebungen = vorlage.entwurf.uebungen
                start = Date()
                springeZumOffenen()
                await sitzung.starten()
            }
        }
    }

    private var aktuell: Uebung { uebungen[ui] }

    private var satzAnsicht: some View {
        let satz = aktuell.saetze[si]
        return ScrollView {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Übung \(ui + 1) von \(uebungen.count)").font(.footnote).foregroundStyle(.secondary)
                    Spacer()
                    if let puls = sitzung.puls {
                        Label("\(puls)", systemImage: "heart.fill").font(.footnote).foregroundStyle(.pink)
                    }
                }
                Text(aktuell.name).font(.headline).lineLimit(2)
                Text("Satz \(si + 1) von \(aktuell.saetze.count), Ziel \(aktuell.wdhZiel)").font(.footnote).foregroundStyle(.secondary)
                HStack(spacing: 8) {
                    wertKachel("kg", kiloText(satz.kg), feld == .kg) { feldWaehlen(.kg) }
                    wertKachel("Wdh", satz.wdh.map(String.init) ?? "0", feld == .wdh) { feldWaehlen(.wdh) }
                }
                .focusable()
                .digitalCrownRotation($krone, from: -1000, through: 1000, by: 1, sensitivity: .medium, isContinuous: true, isHapticFeedbackEnabled: true)
                .onChange(of: krone) { alt, neu in kroneGedreht(Int(neu) - Int(alt)) }
                Button {
                    satzFertig()
                } label: {
                    Label("Satz fertig", systemImage: "checkmark")
                }
                .tint(Farben.marke)
                HStack {
                    Button("Zurück") { zurueck() }.disabled(ui == 0 && si == 0)
                    Button("Überspringen") { weiter() }
                }
                .font(.footnote)
            }
        }
    }

    private func wertKachel(_ titel: String, _ wert: String, _ aktiv: Bool, _ tippen: @escaping () -> Void) -> some View {
        Button(action: tippen) {
            VStack(spacing: 0) {
                Text(wert).font(.system(size: 26, weight: .semibold, design: .rounded))
                Text(titel).font(.caption2).foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 12).stroke(aktiv ? Farben.marke : Color.white.opacity(0.15), lineWidth: aktiv ? 2 : 1))
        }
        .buttonStyle(.plain)
    }

    private func pauseAnsicht(_ bis: Date) -> some View {
        TimelineView(.periodic(from: .now, by: 1)) { kontext in
            let rest = max(0, Int(bis.timeIntervalSince(kontext.date).rounded(.up)))
            VStack(spacing: 8) {
                Text("Pause").font(.footnote).foregroundStyle(.secondary)
                Text(String(format: "%d:%02d", rest / 60, rest % 60)).font(.system(size: 44, weight: .semibold, design: .rounded))
                Text("Danach: \(aktuell.name), Satz \(si + 1)").font(.footnote).foregroundStyle(.secondary).lineLimit(2).multilineTextAlignment(.center)
                Button("Pause beenden") { pauseBis = nil }.tint(Farben.marke)
            }
        }
        .task(id: bis) {
            let warten = bis.timeIntervalSinceNow
            if warten > 0 { try? await Task.sleep(nanoseconds: UInt64(warten * 1_000_000_000)) }
            guard !Task.isCancelled, pauseBis == bis else { return }
            WKHaptik.pauseVorbei()
            pauseBis = nil
        }
    }

    private func feldWaehlen(_ f: Feld) { feld = f }

    /// Die Krone verstellt das gewählte Feld: Wiederholungen um eins, Kilo
    /// um 2,5, unter 20 kg um 1. Dieselben Schritte wie die Steigerung in der App.
    private func kroneGedreht(_ schritte: Int) {
        guard schritte != 0 else { return }
        var satz = uebungen[ui].saetze[si]
        if feld == .wdh {
            satz.wdh = max(0, min(100, (satz.wdh ?? 0) + schritte))
        } else {
            let kg = satz.kg ?? 0
            let schritt = kg < 20 ? 1.0 : 2.5
            satz.kg = max(0, min(500, kg + Double(schritte) * schritt))
        }
        uebungen[ui].saetze[si] = satz
    }

    private func satzFertig() {
        uebungen[ui].saetze[si].fertig = true
        WKHaptik.erfolg()
        // Das Gewicht wandert in die leeren Sätze danach, wie in der App.
        let kg = uebungen[ui].saetze[si].kg
        for i in (si + 1)..<uebungen[ui].saetze.count where uebungen[ui].saetze[i].kg == nil {
            uebungen[ui].saetze[i].kg = kg
        }
        let pause = aktuell.pauseSek
        let letzterSatz = ui == uebungen.count - 1 && si == aktuell.saetze.count - 1
        weiter()
        if !letzterSatz { pauseBis = Date().addingTimeInterval(TimeInterval(pause)) }
    }

    private func weiter() {
        if si < aktuell.saetze.count - 1 { si += 1; return }
        if ui < uebungen.count - 1 { ui += 1; si = 0; feld = .wdh; return }
        beendenFragen = true
    }

    private func zurueck() {
        if si > 0 { si -= 1; return }
        if ui > 0 { ui -= 1; si = max(0, uebungen[ui].saetze.count - 1) }
    }

    private func springeZumOffenen() {
        for (u, uebung) in uebungen.enumerated() {
            if let s = uebung.saetze.firstIndex(where: { !$0.fertig }) { ui = u; si = s; return }
        }
    }

    private func beenden(speichern: Bool) {
        let ende = Date()
        if speichern && uebungen.contains(where: { $0.saetze.contains(where: \.fertig) }) {
            verbindung.trainingFertig(titel: vorlage.titel, start: start, ende: ende, uebungen: uebungen)
        }
        Task {
            await sitzung.beenden(speichern: speichern)
            schliessen()
        }
    }
}
