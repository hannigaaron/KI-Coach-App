import SwiftUI

/// Die erste Seite der Uhr, wie der Start auf dem iPhone: das leuchtende d,
/// darunter das Gespräch. Ein Tipp auf das d öffnet das Diktat von watchOS,
/// die Frage geht danach von selbst raus. Während daevo spricht, hält ein
/// Tipp die Stimme an.
struct AssistentAnsicht: View {
    @StateObject private var gespraech = Unterhaltung.shared

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                ZStack {
                    if gespraech.zustand == .spricht {
                        Button { gespraech.stumm() } label: { Orb(zustand: .spricht) }
                            .buttonStyle(.plain)
                            .accessibilityLabel("Vorlesen anhalten")
                    } else {
                        TextFieldLink(prompt: Text("Frag daevo")) {
                            Orb(zustand: gespraech.zustand)
                        } onSubmit: { text in
                            Task { await gespraech.fragen(text) }
                        }
                        .buttonStyle(.plain)
                        .disabled(gespraech.zustand == .denkt)
                        .accessibilityLabel("Mit daevo sprechen")
                    }
                }
                .frame(maxWidth: 150)

                Text(statusText)
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                if !gespraech.frage.isEmpty {
                    Text(gespraech.frage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .multilineTextAlignment(.trailing)
                }
                if !gespraech.antwort.isEmpty {
                    Text(gespraech.antwort)
                        .font(.body)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if !gespraech.fehler.isEmpty {
                    Text(gespraech.fehler)
                        .font(.footnote)
                        .foregroundStyle(.orange)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal, 4)
        }
        .background(Color.black)
        .navigationTitle("daevo")
    }

    private var statusText: String {
        switch gespraech.zustand {
        case .denkt: return "denkt nach"
        case .spricht: return "spricht, tippen zum Anhalten"
        case .hoert: return "hört zu"
        case .bereit: return gespraech.antwort.isEmpty ? "Tippen und sprechen" : "Tippen für die nächste Frage"
        }
    }
}
