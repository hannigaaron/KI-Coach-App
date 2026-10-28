import Foundation
import AuthenticationServices
import Capacitor

/// Anmeldung mit Apple und das Anmeldefenster für Google.
///
/// Apple: Sign in with Apple ohne Name und ohne E-Mail. daevo braucht nur
/// eine Kennung, die wiederkommt, und der Server prüft dafür das Token.
///
/// Google: Google lässt keine Anmeldung in einer eingebetteten Web Ansicht
/// zu. `ASWebAuthenticationSession` öffnet das System Fenster von Safari,
/// und die App bekommt danach nur die Rückkehradresse mit dem Code.
@objc(AnmeldungPlugin)
public class AnmeldungPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "AnmeldungPlugin"
    public let jsName = "Anmeldung"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "apple", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "web", returnType: CAPPluginReturnPromise),
    ]

    private var offen: CAPPluginCall?
    private var sitzung: ASWebAuthenticationSession?

    private var fenster: ASPresentationAnchor {
        bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor { fenster }
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor { fenster }

    @objc func apple(_ call: CAPPluginCall) {
        offen = call
        let anfrage = ASAuthorizationAppleIDProvider().createRequest()
        anfrage.requestedScopes = []
        DispatchQueue.main.async {
            let steuerung = ASAuthorizationController(authorizationRequests: [anfrage])
            steuerung.delegate = self
            steuerung.presentationContextProvider = self
            steuerung.performRequests()
        }
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let nachweis = authorization.credential as? ASAuthorizationAppleIDCredential,
              let daten = nachweis.identityToken,
              let token = String(data: daten, encoding: .utf8) else {
            offen?.reject("Apple hat kein Token geschickt.")
            offen = nil
            return
        }
        offen?.resolve(["idToken": token])
        offen = nil
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        let abgebrochen = (error as? ASAuthorizationError)?.code == .canceled
        offen?.reject(abgebrochen ? "abgebrochen" : error.localizedDescription)
        offen = nil
    }

    /// Öffnet `url` im System Fenster und gibt die Rückkehradresse zurück.
    @objc func web(_ call: CAPPluginCall) {
        guard let text = call.getString("url"), let url = URL(string: text),
              let schema = call.getString("schema") else {
            call.reject("Adresse oder Schema fehlt.")
            return
        }
        DispatchQueue.main.async {
            let s = ASWebAuthenticationSession(url: url, callbackURLScheme: schema) { rueck, fehler in
                if let rueck = rueck {
                    call.resolve(["url": rueck.absoluteString])
                } else {
                    let abgebrochen = (fehler as? ASWebAuthenticationSessionError)?.code == .canceledLogin
                    call.reject(abgebrochen ? "abgebrochen" : (fehler?.localizedDescription ?? "Anmeldung gescheitert."))
                }
                self.sitzung = nil
            }
            s.presentationContextProvider = self
            s.prefersEphemeralWebBrowserSession = false
            self.sitzung = s
            s.start()
        }
    }
}
