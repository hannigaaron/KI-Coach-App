import AVFoundation
import Capacitor
import UIKit

/// Liest einen Barcode mit der Kamera, über AVFoundation.
///
/// Die Web Ansicht kennt `BarcodeDetector` nicht, und beim Tippen auf den
/// Scanner passierte in der App im Betrieb nichts. Apple liest EAN und UPC
/// selbst, schnell und auch schräg gehalten, über `AVCaptureMetadataOutput`.
/// Das geht auf jedem iPhone, anders als `DataScannerViewController`, der
/// erst ab A12 und iOS 16 läuft.
///
/// `scannen` zeigt die Kamera als Vollbild mit einem Rahmen und
/// "Abbrechen". Zurück kommt `{ code }`, oder die Ablehnung mit
/// "abgebrochen" oder "keinZugriff". Die Web App liest dann weiter selbst,
/// über `ean.js`.
@objc(ScannerPlugin)
public class ScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScannerPlugin"
    public let jsName = "Scanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scannen", returnType: CAPPluginReturnPromise),
    ]

    @objc func scannen(_ call: CAPPluginCall) {
        let starten = {
            DispatchQueue.main.async {
                guard let vorn = self.bridge?.viewController else { call.reject("keineAnsicht"); return }
                let scanner = ScannerAnsicht()
                scanner.fertig = { code in
                    scanner.dismiss(animated: true) {
                        if let code { call.resolve(["code": code]) } else { call.reject("abgebrochen") }
                    }
                }
                scanner.modalPresentationStyle = .fullScreen
                vorn.present(scanner, animated: true)
            }
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: starten()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { ja in ja ? starten() : call.reject("keinZugriff") }
        default: call.reject("keinZugriff")
        }
    }
}

final class ScannerAnsicht: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var fertig: ((String?) -> Void)?
    private let sitzung = AVCaptureSession()
    private var vorschau: AVCaptureVideoPreviewLayer?
    private var gemeldet = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        guard let kamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let eingang = try? AVCaptureDeviceInput(device: kamera),
              sitzung.canAddInput(eingang) else {
            DispatchQueue.main.async { self.fertig?(nil) }
            return
        }
        sitzung.addInput(eingang)
        // Nah an der Packung: der Fokus soll sich auf kurze Entfernung legen.
        if (try? kamera.lockForConfiguration()) != nil {
            if kamera.isAutoFocusRangeRestrictionSupported { kamera.autoFocusRangeRestriction = .near }
            if kamera.isFocusModeSupported(.continuousAutoFocus) { kamera.focusMode = .continuousAutoFocus }
            kamera.unlockForConfiguration()
        }
        let ausgang = AVCaptureMetadataOutput()
        if sitzung.canAddOutput(ausgang) {
            sitzung.addOutput(ausgang)
            ausgang.setMetadataObjectsDelegate(self, queue: .main)
            let arten: [AVMetadataObject.ObjectType] = [.ean13, .ean8, .upce]
            ausgang.metadataObjectTypes = arten.filter { ausgang.availableMetadataObjectTypes.contains($0) }
        }

        let ebene = AVCaptureVideoPreviewLayer(session: sitzung)
        ebene.videoGravity = .resizeAspectFill
        view.layer.addSublayer(ebene)
        vorschau = ebene

        let rahmen = UIView()
        rahmen.translatesAutoresizingMaskIntoConstraints = false
        rahmen.layer.borderColor = UIColor(red: 0.588, green: 0.847, blue: 0.941, alpha: 1).cgColor
        rahmen.layer.borderWidth = 3
        rahmen.layer.cornerRadius = 18
        view.addSubview(rahmen)

        let hinweis = UILabel()
        hinweis.translatesAutoresizingMaskIntoConstraints = false
        hinweis.text = "Halte den Barcode in den Rahmen"
        hinweis.textColor = .white
        hinweis.font = .systemFont(ofSize: 17, weight: .medium)
        hinweis.textAlignment = .center
        view.addSubview(hinweis)

        let abbrechen = UIButton(type: .system)
        abbrechen.translatesAutoresizingMaskIntoConstraints = false
        abbrechen.setTitle("Abbrechen", for: .normal)
        abbrechen.setTitleColor(.white, for: .normal)
        abbrechen.titleLabel?.font = .systemFont(ofSize: 18, weight: .semibold)
        abbrechen.backgroundColor = UIColor(white: 1, alpha: 0.16)
        abbrechen.layer.cornerRadius = 26
        abbrechen.addTarget(self, action: #selector(abbruch), for: .touchUpInside)
        view.addSubview(abbrechen)

        NSLayoutConstraint.activate([
            rahmen.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            rahmen.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            rahmen.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.8),
            rahmen.heightAnchor.constraint(equalTo: rahmen.widthAnchor, multiplier: 0.5),
            hinweis.topAnchor.constraint(equalTo: rahmen.bottomAnchor, constant: 24),
            hinweis.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            abbrechen.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            abbrechen.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            abbrechen.widthAnchor.constraint(equalToConstant: 200),
            abbrechen.heightAnchor.constraint(equalToConstant: 52),
        ])
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        vorschau?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // startRunning blockiert, deshalb nicht auf dem Hauptthread.
        DispatchQueue.global(qos: .userInitiated).async { self.sitzung.startRunning() }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        DispatchQueue.global(qos: .userInitiated).async { self.sitzung.stopRunning() }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objekte: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard !gemeldet,
              let code = (objekte.first as? AVMetadataMachineReadableCodeObject)?.stringValue,
              !code.isEmpty else { return }
        gemeldet = true
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        fertig?(code)
    }

    @objc private func abbruch() {
        guard !gemeldet else { return }
        gemeldet = true
        fertig?(nil)
    }
}
