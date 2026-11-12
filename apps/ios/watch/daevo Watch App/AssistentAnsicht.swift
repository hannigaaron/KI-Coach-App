import SwiftUI

/// Die erste Seite der Uhr, wie der Start auf dem iPhone: das leuchtende d,
/// darunter das Gespräch. Ein Tipp auf das d öffnet das Diktat von watchOS,
/// die Frage geht danach von selbst raus. Während daevo spricht, hält ein
/// Tipp die Stimme an.
struct AssistentAnsicht: View {
    @StateObject private var gespraech = Unterhaltung.shared
    /// Der Auftritt beim Öffnen, wie der Startbildschirm auf dem iPhone: das d
    /// kommt aus der Unschärfe, wird hell und bekommt seinen Schein. Einmal
    /// je Start, nicht bei jedem Wischen zurück auf diese Seite.
    @State private var erschienen = false

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
                        .modifier(Doppeltipp())
                    }
                }
                .frame(maxWidth: 150)
                .scaleEffect(erschienen ? 1 : 0.86)
                .blur(radius: erschienen ? 0 : 6)
                .brightness(erschienen ? 0 : -0.55)
                .opacity(erschienen ? 1 : 0.2)
                .onAppear {
                    guard !erschienen else { return }
                    withAnimation(.timingCurve(0.16, 1, 0.3, 1, duration: 1.6)) { erschienen = true }
                }

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

/// Doppeltippen mit Daumen und Zeigefinger öffnet das Diktat, ohne den
/// Bildschirm zu berühren. Die Geste gibt es ab watchOS 11 auf Series 9,
/// Ultra 2 und neueren Uhren, auf älteren bleibt der Tipp auf das d. Die
/// Krone kann keine App belegen: Drücken gehört watchOS, Halten Siri.
struct Doppeltipp: ViewModifier {
    func body(content: Content) -> some View {
        if #available(watchOS 11.0, *) {
            content.handGestureShortcut(.primaryAction)
        } else {
            content
        }
    }
}
