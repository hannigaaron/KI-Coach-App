import UIKit
import Capacitor

/// Die Web Ansicht von daevo mit den eigenen Plugins.
///
/// Capacitor findet Plugins aus npm Paketen von selbst. Eigene Plugins im
/// App Ziel muss man anmelden, und das geschieht hier. Wer ein Plugin
/// hinzufügt, trägt es hier ein, sonst lehnt `nativAufruf` in der App jeden
/// Aufruf ab.
class DaevoBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SpeicherPlugin())
        bridge?.registerPluginInstance(GesundheitPlugin())
        bridge?.registerPluginInstance(MitteilungenPlugin())
        bridge?.registerPluginInstance(SprachePlugin())
        bridge?.registerPluginInstance(DiktatPlugin())
        bridge?.registerPluginInstance(HaptikPlugin())
        bridge?.registerPluginInstance(KalenderPlugin())
    }
}
