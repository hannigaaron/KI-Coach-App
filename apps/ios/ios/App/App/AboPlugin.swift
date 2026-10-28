import Foundation
import StoreKit
import Capacitor

/// Abos über den App Store, StoreKit 2.
///
/// Die Testphase ist das Einführungsangebot des Abos, "1 Woche kostenlos",
/// eingerichtet in App Store Connect. Wer kauft, schliesst das Abo ab und
/// zahlt ab Tag 8, gekündigt wird in den Einstellungen der Apple ID.
///
/// Die App prüft nichts selbst. Jede Transaktion geht als signierte JWS an
/// den Server, und der prüft die Signatur gegen Apple, siehe
/// workers/push/src/apple-jws.ts. Eine Prüfung auf dem Gerät liesse sich
/// umgehen, eine auf dem Server nicht.
@objc(AboPlugin)
public class AboPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AboPlugin"
    public let jsName = "Abo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "produkte", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "kaufen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "aktuelle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verwalten", returnType: CAPPluginReturnPromise),
    ]

    private var beobachter: Task<Void, Never>?

    override public func load() {
        // Verlängerungen und Käufe ausserhalb der App, etwa über die
        // Einstellungen, kommen hier an. Die App holt sie mit `aktuelle` ab.
        beobachter = Task {
            for await ergebnis in Transaction.updates {
                if case .verified(let t) = ergebnis { await t.finish() }
            }
        }
    }

    @objc func produkte(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let liste = try await Product.products(for: ids)
                let aus: [[String: Any]] = liste.map { p in
                    let gratis = p.subscription?.introductoryOffer?.paymentMode == .freeTrial
                    return ["id": p.id, "preis": p.displayPrice, "testphase": gratis]
                }
                call.resolve(["produkte": aus])
            } catch {
                call.reject("Produkte nicht abrufbar: \(error.localizedDescription)")
            }
        }
    }

    @objc func kaufen(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Produkt fehlt.")
            return
        }
        Task {
            do {
                guard let produkt = try await Product.products(for: [id]).first else {
                    call.reject("Das Produkt gibt es im App Store nicht.")
                    return
                }
                switch try await produkt.purchase() {
                case .success(let ergebnis):
                    if case .verified(let t) = ergebnis { await t.finish() }
                    call.resolve(["jws": ergebnis.jwsRepresentation])
                case .userCancelled:
                    call.reject("abgebrochen")
                case .pending:
                    call.resolve(["wartet": true])
                @unknown default:
                    call.reject("Unbekanntes Ergebnis.")
                }
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }

    /// Alle Abos, die gerade gelten, als JWS. Für den Abgleich beim Start.
    @objc func aktuelle(_ call: CAPPluginCall) {
        Task {
            var liste: [String] = []
            for await ergebnis in Transaction.currentEntitlements {
                liste.append(ergebnis.jwsRepresentation)
            }
            call.resolve(["jws": liste])
        }
    }

    @objc func verwalten(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let szene = bridge?.viewController?.view.window?.windowScene else {
                call.reject("Kein Fenster.")
                return
            }
            do {
                try await AppStore.showManageSubscriptions(in: szene)
                call.resolve()
            } catch {
                call.reject(error.localizedDescription)
            }
        }
    }
}
