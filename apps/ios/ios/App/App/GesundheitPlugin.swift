import Foundation
import Capacitor
import HealthKit

/// Liest aus Apple Health, was die Uhr und das iPhone messen.
///
/// Dasselbe Tagesformat wie der Export und der Kurzbefehl, siehe
/// `packages/core/src/health.ts`. Die App schreibt alle drei Quellen über
/// denselben Weg in die Tage, und deshalb gelten dieselben Regeln: Schritte
/// überschreiben, ein selbst eingetragenes Gewicht bleibt stehen.
///
/// Nur gelesen, nie geschrieben. daevo legt in Health nichts ab, und eine
/// Berechtigung, die nicht gebraucht wird, steht in der Abfrage als Frage,
/// die niemand verstehen muss.
@objc(GesundheitPlugin)
public class GesundheitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GesundheitPlugin"
    public let jsName = "Gesundheit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "verfuegbar", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "berechtigen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "lesen", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()

    private var leseTypen: Set<HKObjectType> {
        var typen = Set<HKObjectType>()
        let mengen: [HKQuantityTypeIdentifier] = [
            .stepCount, .activeEnergyBurned, .restingHeartRate, .heartRateVariabilitySDNN, .bodyMass,
            .bodyFatPercentage, .vo2Max, .appleExerciseTime,
        ]
        for id in mengen {
            if let t = HKObjectType.quantityType(forIdentifier: id) { typen.insert(t) }
        }
        if let schlaf = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { typen.insert(schlaf) }
        typen.insert(HKObjectType.workoutType())
        // Ernährung, die andere Apps nach Health schreiben, etwa YAZIO oder
        // MyFitnessPal. Die Mahlzeit als Ganzes steht als Korrelation da.
        for (id, _, _) in GesundheitPlugin.naehrwerte {
            if let t = HKObjectType.quantityType(forIdentifier: id) { typen.insert(t) }
        }
        if let essen = HKObjectType.correlationType(forIdentifier: .food) { typen.insert(essen) }
        return typen
    }

    @objc func verfuegbar(_ call: CAPPluginCall) {
        call.resolve(["verfuegbar": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func berechtigen(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Auf diesem Gerät gibt es Apple Health nicht.")
            return
        }
        // Apple verrät aus Datenschutzgründen nicht, ob Lesen erlaubt wurde.
        // Ein Erfolg hier heisst nur, dass die Frage gestellt wurde. Ob Daten
        // kommen, zeigt erst das Lesen.
        store.requestAuthorization(toShare: nil, read: leseTypen) { ok, fehler in
            if let fehler = fehler {
                call.reject("Health hat die Anfrage abgelehnt: \(fehler.localizedDescription)")
            } else {
                call.resolve(["gefragt": ok])
            }
        }
    }

    /// Die letzten `tage` Tage, heute eingeschlossen, je Tag ein Eintrag.
    @objc func lesen(_ call: CAPPluginCall) {
        let tage = max(1, min(call.getInt("tage") ?? 14, 730))
        let kalender = Calendar.current
        let heuteAnfang = kalender.startOfDay(for: Date())
        guard let anfang = kalender.date(byAdding: .day, value: -(tage - 1), to: heuteAnfang),
              let ende = kalender.date(byAdding: .day, value: 1, to: heuteAnfang) else {
            call.reject("Der Zeitraum liess sich nicht bilden.")
            return
        }

        var ergebnis: [String: [String: Any]] = [:]
        var workouts: [[String: Any]] = []
        let gruppe = DispatchGroup()
        let sperre = NSLock()

        func setzen(_ tag: String, _ feld: String, _ wert: Double) {
            sperre.lock()
            var eintrag = ergebnis[tag] ?? ["tag": tag]
            eintrag[feld] = wert
            ergebnis[tag] = eintrag
            sperre.unlock()
        }

        // Je Tag eine Statistik: Summe für Schritte und Kalorien, Schnitt für
        // Puls und HRV, der letzte Wert für das Gewicht. Gerundet wird hier,
        // weil niemand 8432,7 Schritte gemacht hat.
        let statistiken: [(HKQuantityTypeIdentifier, String, HKStatisticsOptions, HKUnit, Int)] = [
            (.stepCount, "schritte", .cumulativeSum, .count(), 0),
            (.activeEnergyBurned, "aktivKcal", .cumulativeSum, .kilocalorie(), 0),
            (.restingHeartRate, "ruhepuls", .discreteAverage, HKUnit.count().unitDivided(by: .minute()), 0),
            (.heartRateVariabilitySDNN, "hrv", .discreteAverage, .secondUnit(with: .milli), 0),
            (.bodyMass, "gewichtKg", .mostRecent, .gramUnit(with: .kilo), 1),
            // Körperfett kommt als Anteil von 0 bis 1, die App rechnet in Prozent.
            (.bodyFatPercentage, "koerperfett", .mostRecent, .percent(), 3),
            (.vo2Max, "vo2max", .mostRecent, HKUnit(from: "ml/kg*min"), 1),
            (.appleExerciseTime, "trainingsMinuten", .cumulativeSum, .minute(), 0),
        ]

        for (id, feld, option, einheit, stellen) in statistiken {
            guard let typ = HKQuantityType.quantityType(forIdentifier: id) else { continue }
            gruppe.enter()
            let abfrage = HKStatisticsCollectionQuery(
                quantityType: typ,
                quantitySamplePredicate: HKQuery.predicateForSamples(withStart: anfang, end: ende),
                options: option,
                anchorDate: heuteAnfang,
                intervalComponents: DateComponents(day: 1)
            )
            abfrage.initialResultsHandler = { _, sammlung, _ in
                sammlung?.enumerateStatistics(from: anfang, to: ende) { stat, _ in
                    let menge: HKQuantity?
                    switch option {
                    case .cumulativeSum: menge = stat.sumQuantity()
                    case .discreteAverage: menge = stat.averageQuantity()
                    default: menge = stat.mostRecentQuantity()
                    }
                    guard let m = menge else { return }
                    let faktor = pow(10.0, Double(stellen))
                    let wert = (m.doubleValue(for: einheit) * faktor).rounded() / faktor
                    setzen(GesundheitPlugin.tagText(stat.startDate), feld, wert)
                }
                gruppe.leave()
            }
            store.execute(abfrage)
        }

        // Schlaf. Uhr und iPhone schreiben dieselbe Nacht oft beide, also
        // werden die Abschnitte erst zusammengelegt und dann gezählt. Sonst
        // stünden vierzehn Stunden Schlaf da. Gezählt wird nur Schlaf, nicht
        // die Zeit im Bett, und die Nacht gehört zum Tag des Aufwachens.
        if let schlafTyp = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            gruppe.enter()
            // Einen Tag früher anfangen, sonst fehlt der Beginn der ersten Nacht.
            let schlafAnfang = kalender.date(byAdding: .day, value: -1, to: anfang) ?? anfang
            let abfrage = HKSampleQuery(
                sampleType: schlafTyp,
                predicate: HKQuery.predicateForSamples(withStart: schlafAnfang, end: ende),
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, proben, _ in
                let schlafWerte: Set<Int> = GesundheitPlugin.schlafWerte()
                let abschnitte = (proben as? [HKCategorySample] ?? [])
                    .filter { schlafWerte.contains($0.value) }
                    .map { ($0.startDate, $0.endDate) }
                var zusammen: [(Date, Date)] = []
                for (von, bis) in abschnitte {
                    if let letzter = zusammen.last, von <= letzter.1 {
                        zusammen[zusammen.count - 1].1 = max(letzter.1, bis)
                    } else {
                        zusammen.append((von, bis))
                    }
                }
                // Tief und REM getrennt, nur ab iOS 16, davor schreibt die Uhr
                // keine Phasen. Phasen überlappen sich nicht, Doppeltes aus
                // Uhr und iPhone gibt es hier nicht, denn nur die Uhr misst sie.
                if #available(iOS 16.0, *) {
                    var tief: [String: Double] = [:]
                    var rem: [String: Double] = [:]
                    for p in (proben as? [HKCategorySample] ?? []) where p.sourceRevision.source.bundleIdentifier.hasPrefix("com.apple.health") {
                        let tag = GesundheitPlugin.tagText(p.endDate)
                        let minuten = p.endDate.timeIntervalSince(p.startDate) / 60
                        if p.value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue { tief[tag, default: 0] += minuten }
                        if p.value == HKCategoryValueSleepAnalysis.asleepREM.rawValue { rem[tag, default: 0] += minuten }
                    }
                    for (tag, m) in tief where tag >= GesundheitPlugin.tagText(anfang) { setzen(tag, "tiefschlafMinuten", m.rounded()) }
                    for (tag, m) in rem where tag >= GesundheitPlugin.tagText(anfang) { setzen(tag, "remMinuten", m.rounded()) }
                }
                var jeTag: [String: Double] = [:]
                for (von, bis) in zusammen {
                    jeTag[GesundheitPlugin.tagText(bis), default: 0] += bis.timeIntervalSince(von) / 60
                }
                for (tag, minuten) in jeTag where tag >= GesundheitPlugin.tagText(anfang) {
                    setzen(tag, "schlafMinuten", minuten.rounded())
                }
                gruppe.leave()
            }
            store.execute(abfrage)
        }

        // Trainings, auch die aus Apple Fitness. Die App ordnet sie selbst
        // einer Art zu und legt sie nicht doppelt an, siehe healthkit.js.
        gruppe.enter()
        let workoutAbfrage = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: HKQuery.predicateForSamples(withStart: anfang, end: ende),
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
        ) { _, proben, _ in
            let liste = (proben as? [HKWorkout] ?? []).map { w -> [String: Any] in
                [
                    "id": w.uuid.uuidString,
                    "start": ISO8601DateFormatter().string(from: w.startDate),
                    "tag": GesundheitPlugin.tagText(w.startDate),
                    "uhrzeit": GesundheitPlugin.uhrzeitText(w.startDate),
                    "minuten": (w.duration / 60).rounded(),
                    "art": GesundheitPlugin.art(w.workoutActivityType),
                ]
            }
            sperre.lock()
            workouts = liste
            sperre.unlock()
            gruppe.leave()
        }
        store.execute(workoutAbfrage)

        var nahrung: [[String: Any]] = []
        gruppe.enter()
        nahrungLesen(anfang: anfang, ende: ende) { liste in
            sperre.lock()
            nahrung = liste
            sperre.unlock()
            gruppe.leave()
        }

        gruppe.notify(queue: .main) {
            let liste = ergebnis.values.sorted { ($0["tag"] as? String ?? "") < ($1["tag"] as? String ?? "") }
            call.resolve(["tage": liste, "workouts": workouts, "nahrung": nahrung, "von": GesundheitPlugin.tagText(anfang)])
        }
    }

    /// Kalorien und Makros, mit der Einheit, in der die App rechnet.
    static let naehrwerte: [(HKQuantityTypeIdentifier, String, HKUnit)] = [
        (.dietaryEnergyConsumed, "kcal", .kilocalorie()),
        (.dietaryProtein, "proteinG", .gram()),
        (.dietaryFatTotal, "fatG", .gram()),
        (.dietaryCarbohydrates, "carbsG", .gram()),
    ]

    /// Jeder Nährwert als einzelner Eintrag mit Zeit und Quell-App. Gehört er
    /// zu einer Mahlzeit, die als Korrelation in Health steht, trägt er deren
    /// Kennung und Namen. Zusammengelegt wird in der App, siehe healthkit.js.
    ///
    /// Erst die Korrelationen, dann die Werte: sonst wüsste ein Wert nicht,
    /// zu welcher Mahlzeit er gehört. Was die App selbst geschrieben hätte,
    /// fällt weg. daevo schreibt nichts nach Health, aber falls doch einmal,
    /// käme es sonst als fremde Mahlzeit zurück.
    private func nahrungLesen(anfang: Date, ende: Date, fertig: @escaping ([[String: Any]]) -> Void) {
        let zeitraum = HKQuery.predicateForSamples(withStart: anfang, end: ende)
        let eigene = Bundle.main.bundleIdentifier ?? ""
        guard let essenTyp = HKObjectType.correlationType(forIdentifier: .food) else { fertig([]); return }
        let korrelationen = HKCorrelationQuery(type: essenTyp, predicate: zeitraum, samplePredicates: nil) { [weak self] _, ergebnis, _ in
            var zuMahlzeit: [UUID: (String, String)] = [:]
            for k in ergebnis ?? [] {
                let name = k.metadata?[HKMetadataKeyFoodType] as? String ?? ""
                for objekt in k.objects { zuMahlzeit[objekt.uuid] = (k.uuid.uuidString, name) }
            }
            guard let self = self else { fertig([]); return }
            var liste: [[String: Any]] = []
            let gruppe = DispatchGroup()
            let sperre = NSLock()
            for (id, feld, einheit) in GesundheitPlugin.naehrwerte {
                guard let typ = HKQuantityType.quantityType(forIdentifier: id) else { continue }
                gruppe.enter()
                let abfrage = HKSampleQuery(sampleType: typ, predicate: zeitraum, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, proben, _ in
                    var teil: [[String: Any]] = []
                    for p in proben as? [HKQuantitySample] ?? [] {
                        let quelle = p.sourceRevision.source
                        if !eigene.isEmpty && quelle.bundleIdentifier == eigene { continue }
                        var eintrag: [String: Any] = [
                            "id": p.uuid.uuidString,
                            "feld": feld,
                            "wert": (p.quantity.doubleValue(for: einheit) * 10).rounded() / 10,
                            "tag": GesundheitPlugin.tagText(p.startDate),
                            "uhrzeit": GesundheitPlugin.uhrzeitText(p.startDate),
                            "quelle": quelle.name,
                        ]
                        if case let (mahlzeit, name)? = zuMahlzeit[p.uuid] {
                            eintrag["mahlzeit"] = mahlzeit
                            if !name.isEmpty { eintrag["name"] = name }
                        }
                        teil.append(eintrag)
                    }
                    sperre.lock()
                    liste.append(contentsOf: teil)
                    sperre.unlock()
                    gruppe.leave()
                }
                self.store.execute(abfrage)
            }
            gruppe.notify(queue: .global()) { fertig(liste) }
        }
        store.execute(korrelationen)
    }

    /// Alle Zustände, die Schlaf sind. Ab iOS 16 schreibt die Uhr Phasen,
    /// davor nur "schlafend". `asleepUnspecified` gibt es erst ab iOS 16, die
    /// App läuft ab iOS 15. Davor heisst derselbe Wert `asleep`, mit gleichem
    /// Rohwert, deshalb zwei Zweige statt einer gemeinsamen Grundmenge.
    static func schlafWerte() -> Set<Int> {
        if #available(iOS 16.0, *) {
            return [
                HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                HKCategoryValueSleepAnalysis.asleepREM.rawValue,
            ]
        }
        return [HKCategoryValueSleepAnalysis.asleep.rawValue]
    }

    static func tagText(_ datum: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: datum)
    }

    static func uhrzeitText(_ datum: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        f.dateFormat = "HH:mm"
        return f.string(from: datum)
    }

    /// Dieselben vier Arten wie in der App, `TrainingType` in packages/core.
    static func art(_ typ: HKWorkoutActivityType) -> String {
        switch typ {
        case .traditionalStrengthTraining, .functionalStrengthTraining, .coreTraining, .crossTraining:
            return "strength"
        case .volleyball, .soccer, .basketball, .handball, .tennis, .badminton, .tableTennis,
             .americanFootball, .rugby, .hockey, .squash:
            return "team_sport"
        case .yoga, .pilates, .flexibility, .mindAndBody, .cooldown, .preparationAndRecovery:
            return "mobility"
        default:
            return "cardio"
        }
    }
}
