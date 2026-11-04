import SwiftUI

/// Das d aus dem Logo als leuchtender Partikelkreis, wie auf dem iPhone.
///
/// Dieselbe Geometrie und dieselbe Bewegung wie `apps/pwa/js/orb.js`: Bogen
/// über 280 Grad mit runden Enden, der Stamm läuft auf drei Uhr in den Ring
/// hinein, 30 Fäden um einen gedachten Schlauch, dieselbe Welle, dieselbe
/// Drehung, dieselbe Tiefe. Wer dort etwas ändert, ändert es hier mit, sonst
/// sehen Uhr und iPhone nach drei Monaten verschieden aus.
///
/// Weniger Punkte als auf dem iPhone, rund 2500 statt 4700, dafür grösser.
/// Die Dichte je Fläche bleibt im Verhältnis von Ring zu Stamm gleich, sonst
/// liest sich der Buchstabe als zerrissen. Gezeichnet mit 30 Bildern je
/// Sekunde: mehr sieht auf der Uhr niemand, und der Akku merkt es.
enum OrbZustand: Equatable {
    case bereit, hoert, denkt, spricht
}

struct Orb: View {
    var zustand: OrbZustand

    @Environment(\.isLuminanceReduced) private var gedimmt

    var body: some View {
        // Im gedimmten Modus der Uhr läuft nichts, ein Bild je Minute reicht.
        TimelineView(.animation(minimumInterval: gedimmt ? 60 : 1.0 / 30, paused: gedimmt)) { zeit in
            Canvas { ctx, groesse in
                OrbPunkte.shared.zeichnen(in: &ctx, groesse: groesse, zeit: zeit.date.timeIntervalSinceReferenceDate, zustand: zustand, gedimmt: gedimmt)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .background(
            // Der Schein hinter dem Buchstaben, aus derselben Farbe.
            RadialGradient(colors: [Farben.marke.opacity(gedimmt ? 0.08 : 0.22), .clear], center: .center, startRadius: 0, endRadius: 90)
        )
        .accessibilityLabel("daevo")
    }
}

/// Die Punkte werden einmal gebaut und danach nur bewegt. Jeder Punkt behält
/// seinen Platz, sonst flimmert das Bild.
final class OrbPunkte {
    static let shared = OrbPunkte()

    // Geometrie aus orb.js, Entwurfsraum 860.
    private let cx = 325.0, cy = 483.0, r = 215.0, tube = 70.0
    private let sweep = 280.0 * .pi / 180
    private let stemX = 470.0, stemW = 140.0, stemTop = -40.0
    private let design = 860.0, originX = -105.0, originY = -66.0
    private let faeden = 30
    private let proFaden = 56
    private let proStammFaden = 26
    private let stufen = 12
    private let groessenFaktor = 1.4

    // a, b, r, seed, size
    private var ring: [(a: Double, b: Double, r: Double, seed: Double, size: Double, los: Double)] = []
    // b, y, weite, seed, size
    private var stamm: [(b: Double, y: Double, weite: Double, seed: Double, size: Double)] = []
    private let start = Date.timeIntervalSinceReferenceDate

    private init() {
        // Fester Startwert: dasselbe d bei jedem Start.
        var zufall = Zufall(startwert: 42)
        let kappe = tube / r
        var fadenR: [Double] = []
        var fadenSeed: [Double] = []
        for _ in 0..<faeden {
            fadenR.append(0.55 + zufall.naechste() * 0.45)
            fadenSeed.append(zufall.naechste() * .pi * 2)
        }
        let mitKappe = Int((Double(proFaden) * (sweep + 2 * kappe) / sweep).rounded())
        for f in 0..<faeden {
            let b0 = Double(f) / Double(faeden) * .pi * 2
            for j in 0..<mitKappe {
                let t = (Double(j) + zufall.naechste() * 0.6) / Double(mitKappe)
                let a = -kappe + t * (sweep + 2 * kappe)
                let ueber = a < 0 ? -a : (a > sweep ? a - sweep : 0)
                let k = ueber > 0 ? (max(0, 1 - pow(ueber / kappe, 2))).squareRoot() : 1
                if k < 1 && zufall.naechste() > k { continue }
                ring.append((a, b0 + (zufall.naechste() - 0.5) * 0.18, fadenR[f] * k * (0.9 + zufall.naechste() * 0.2), fadenSeed[f], 2.1 + zufall.naechste() * 1.8, zufall.naechste()))
            }
        }
        let capR = stemW / 2
        let yTopCap = stemTop + capR
        for f in 0..<faeden {
            let b0 = Double(f) / Double(faeden) * .pi * 2
            for _ in 0..<proStammFaden {
                var y = stemTop + zufall.naechste() * (cy - stemTop)
                var weite = capR
                while y < yTopCap {
                    let dy = y - yTopCap
                    weite = max(0, capR * capR - dy * dy).squareRoot()
                    if zufall.naechste() <= weite / capR { break }
                    y = stemTop + zufall.naechste() * (cy - stemTop)
                    weite = capR
                }
                stamm.append((b0 + (zufall.naechste() - 0.5) * 0.18, y, weite * fadenR[f] * (0.9 + zufall.naechste() * 0.2), fadenSeed[f], 2.1 + zufall.naechste() * 1.8))
            }
        }
    }

    private struct Bewegung { var amp, speed, hell, spread: Double }

    private func bewegung(_ z: OrbZustand, phase: Double) -> Bewegung {
        switch z {
        case .hoert:
            let pegel = (sin(phase * 5) + 1) / 2 * 0.6
            return Bewegung(amp: 12 + pegel * 44, speed: 1.7, hell: 0.95 + pegel * 0.05, spread: 1 + pegel * 0.45)
        case .denkt:
            return Bewegung(amp: 22, speed: 4.2, hell: 0.96, spread: 1)
        case .spricht:
            let puls = abs(sin(phase * 4))
            return Bewegung(amp: 14 + puls * 20, speed: 2.4, hell: 0.9 + puls * 0.1, spread: 1 + puls * 0.18)
        case .bereit:
            let atem = (sin(phase * 0.8) + 1) / 2
            return Bewegung(amp: 8 + atem * 6, speed: 0.7, hell: 0.82 + atem * 0.1, spread: 1)
        }
    }

    private func welle(_ a: Double, _ t: Double, _ seed: Double) -> Double {
        sin(a * 3 + t * 1.1 + seed) * 0.6 + sin(a * 5 - t * 0.7 + seed * 1.7) * 0.3 + sin(a * 8 + t * 1.9) * 0.2
    }

    func zeichnen(in ctx: inout GraphicsContext, groesse: CGSize, zeit: Double, zustand: OrbZustand, gedimmt: Bool) {
        let kante = min(groesse.width, groesse.height)
        let massstab = kante / design
        let dx0 = (groesse.width - kante) / 2 - originX * massstab
        let dy0 = (groesse.height - kante) / 2 - originY * massstab
        // Gleiche Phase wie orb.js: 0,016 je Bild bei 60 Bildern, also 0,96 je Sekunde.
        let phase = (zeit - start) * 0.96
        let m = bewegung(gedimmt ? .bereit : zustand, phase: phase)
        let t = phase * m.speed
        let stemCx = stemX + stemW / 2
        let innen = tube * 0.7, aussen = tube * 1.15

        var pfade = Array(repeating: Path(), count: stufen)
        func punkt(_ x: Double, _ y: Double, _ s: Double, _ hell: Double) {
            let stufe = min(stufen - 1, max(0, Int((hell * Double(stufen)).rounded()) - 1))
            let g = s * groessenFaktor * massstab
            pfade[stufe].addRect(CGRect(x: dx0 + x * massstab - g / 2, y: dy0 + y * massstab - g / 2, width: g, height: g))
        }

        for p in ring {
            let b = p.b + t * 0.45
            let radial = r + cos(b) * tube * p.r * m.spread + welle(p.a, t, p.seed) * m.amp
            let winkel = p.a - .pi / 2
            let tiefe = 0.42 + 0.58 * (0.5 + 0.5 * sin(b))
            let px = cx + cos(winkel) * radial
            let py = cy + sin(winkel) * radial
            // Wo Stamm und Ring übereinanderliegen, zeichnet nur der Stamm,
            // mit weicher Grenze, wie in orb.js.
            if py < cy {
                let abstand = abs(px - stemCx)
                if abstand < aussen {
                    let u = max(0, (abstand - innen) / (aussen - innen))
                    if p.los >= u * u * (3 - 2 * u) { continue }
                }
            }
            punkt(px, py, p.size * (0.6 + tiefe * 0.7), tiefe * m.hell)
        }
        for p in stamm {
            let b = p.b + t * 0.45
            let a = .pi / 2 - (cy - p.y) / r
            let tiefe = 0.42 + 0.58 * (0.5 + 0.5 * sin(b))
            punkt(stemCx + cos(b) * p.weite + welle(a, t, p.seed) * m.amp, p.y, p.size * (0.6 + tiefe * 0.7), min(1, tiefe * m.hell * 1.1))
        }

        // Addiert gezeichnet, dann leuchtet der Buchstabe dort, wo Punkte
        // sich überlagern. Der Grund der Uhr ist immer schwarz.
        ctx.blendMode = .plusLighter
        let daempfung = gedimmt ? 0.45 : 1
        for i in 0..<stufen {
            ctx.fill(pfade[i], with: .color(Farben.marke.opacity(Double(i + 1) / Double(stufen) * daempfung)))
        }
    }
}

/// Ein kleiner Zufall mit Startwert, damit das d immer gleich gebaut wird.
struct Zufall {
    private var zustand: UInt64
    init(startwert: UInt64) { zustand = startwert &+ 0x9E3779B97F4A7C15 }
    mutating func naechste() -> Double {
        zustand = zustand &* 6364136223846793005 &+ 1442695040888963407
        return Double(zustand >> 11) / Double(1 << 53)
    }
}
