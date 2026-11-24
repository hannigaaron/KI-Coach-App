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
        CAPPluginMethod(name: "trainingSpeichern", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()

    private var leseTypen: Set<HKObjectType> {
        var typen = Set<HKObjectType>()
        let mengen: [HKQuantityTypeIdentifier] = [
            .stepCount, .activeEnergyBurned, .restingHeartRate, .heartRateVariabilitySDNN, .bodyMass,
            .bodyFatPercentage, .vo2Max, .appleExerciseTime,
            // Der Puls, für Schnitt und Höchstwert eines Trainings und des Tages.
            .heartRate,
            // Körpersignale: Gehpuls, Atemfrequenz und Sauerstoff. Apple
            // Watch, Oura, Garmin und Whoop schreiben sie, wenn das Teilen
            // mit Health in deren App an ist.
            .walkingHeartRateAverage, .respiratoryRate, .oxygenSaturation,
        ]
        for id in mengen {
            if let t = HKObjectType.quantityType(forIdentifier: id) { typen.insert(t) }
        }
        if #available(iOS 16.0, *), let t = HKObjectType.quantityType(forIdentifier: .appleSleepingWristTemperature) { typen.insert(t) }
        // Achtsamkeit: Atemübungen der Uhr und Meditations Apps.
        if let achtsam = HKObjectType.categoryType(forIdentifier: .mindfulSession) { typen.insert(achtsam) }
        if let schlaf = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) { typen.insert(schlaf) }
        // Die Periode, wenn die Nutzerin sie in Health oder einer Zyklus App
        // führt. Nur lesen, daevo schreibt nichts nach Health.
        if let periode = HKObjectType.categoryType(forIdentifier: .menstrualFlow) { typen.insert(periode) }
        typen.insert(HKObjectType.workoutType())
        // Ernährung, die andere Apps nach Health schreiben, etwa YAZIO oder
        // MyFitnessPal. Die Mahlzeit als Ganzes steht als Korrelation da,
        // nach der wird aber nicht gefragt: iOS wirft bei einem
        // Korrelationstyp in dieser Liste eine Ausnahme, und die App blieb
        // beim Start auf dem Startbild stehen. Lesen lässt sich die
        // Korrelation trotzdem, sobald die Werte darin erlaubt sind.
        for (id, _, _) in GesundheitPlugin.naehrwerte {
            if let t = HKObjectType.quantityType(forIdentifier: id) { typen.insert(t) }
        }
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
        // Schreiben nur Trainings: ein Training aus daevo soll in Apple
        // Fitness stehen wie eines von der Uhr. Sonst nichts.
        store.requestAuthorization(toShare: [HKObjectType.workoutType()], read: leseTypen) { ok, fehler in
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
        var naechte: [[String: Any]] = []
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
        let bpm = HKUnit.count().unitDivided(by: .minute())
        var statistiken: [(HKQuantityTypeIdentifier, String, HKStatisticsOptions, HKUnit, Int)] = [
            (.stepCount, "schritte", .cumulativeSum, .count(), 0),
            (.activeEnergyBurned, "aktivKcal", .cumulativeSum, .kilocalorie(), 0),
            (.restingHeartRate, "ruhepuls", .discreteAverage, HKUnit.count().unitDivided(by: .minute()), 0),
            (.heartRateVariabilitySDNN, "hrv", .discreteAverage, .secondUnit(with: .milli), 0),
            (.bodyMass, "gewichtKg", .mostRecent, .gramUnit(with: .kilo), 1),
            // Körperfett kommt als Anteil von 0 bis 1, die App rechnet in Prozent.
            (.bodyFatPercentage, "koerperfett", .mostRecent, .percent(), 3),
            (.vo2Max, "vo2max", .mostRecent, HKUnit(from: "ml/kg*min"), 1),
            (.appleExerciseTime, "trainingsMinuten", .cumulativeSum, .minute(), 0),
            // Puls über den ganzen Tag: Schnitt, tiefster und höchster Wert.
            (.heartRate, "pulsSchnitt", .discreteAverage, bpm, 0),
            (.heartRate, "pulsMin", .discreteMin, bpm, 0),
            (.heartRate, "pulsMax", .discreteMax, bpm, 0),
            (.walkingHeartRateAverage, "gehpuls", .discreteAverage, bpm, 0),
            (.respiratoryRate, "atemfrequenz", .discreteAverage, bpm, 1),
            // Sauerstoff kommt als Anteil von 0 bis 1.
            (.oxygenSaturation, "sauerstoff", .discreteAverage, .percent(), 3),
        ]
        if #available(iOS 16.0, *) {
            statistiken.append((.appleSleepingWristTemperature, "handgelenkTemp", .discreteAverage, .degreeCelsius(), 2))
        }

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
                    case .discreteMin: menge = stat.minimumQuantity()
                    case .discreteMax: menge = stat.maximumQuantity()
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

        // Achtsamkeit in Minuten je Tag. Überlappende Einträge aus zwei Apps
        // werden zusammengelegt, wie beim Schlaf.
        if let achtsamTyp = HKObjectType.categoryType(forIdentifier: .mindfulSession) {
            gruppe.enter()
            let abfrage = HKSampleQuery(
                sampleType: achtsamTyp,
                predicate: HKQuery.predicateForSamples(withStart: anfang, end: ende),
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, proben, _ in
                var zusammen: [(Date, Date)] = []
                for p in proben ?? [] {
                    if let letzter = zusammen.last, p.startDate <= letzter.1 {
                        zusammen[zusammen.count - 1].1 = max(letzter.1, p.endDate)
                    } else {
                        zusammen.append((p.startDate, p.endDate))
                    }
                }
                var jeTag: [String: Double] = [:]
                for (von, bis) in zusammen { jeTag[GesundheitPlugin.tagText(von), default: 0] += bis.timeIntervalSince(von) / 60 }
                for (tag, minuten) in jeTag { setzen(tag, "achtsamMinuten", minuten.rounded()) }
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
                // Phasen je Nacht, ab iOS 16. Apple Watch, Oura, Garmin und
                // Whoop schreiben sie alle in Health, jede App unter ihrer
                // eigenen Quelle. Zwei Quellen für dieselbe Nacht zu addieren
                // hiesse doppelten Tiefschlaf, also gilt je Nacht die Quelle
                // mit den meisten Minuten in Phasen. Die Nacht gehört zum Tag
                // des Aufwachens.
                if #available(iOS 16.0, *) {
                    let alle = proben as? [HKCategorySample] ?? []
                    let phasenWerte: [Int: String] = [
                        HKCategoryValueSleepAnalysis.asleepDeep.rawValue: "d",
                        HKCategoryValueSleepAnalysis.asleepREM.rawValue: "r",
                        HKCategoryValueSleepAnalysis.asleepCore.rawValue: "c",
                        HKCategoryValueSleepAnalysis.awake.rawValue: "w",
                    ]
                    var jeQuelle: [String: [String: Double]] = [:]
                    for p in alle where phasenWerte[p.value] != nil && phasenWerte[p.value] != "w" {
                        let tag = GesundheitPlugin.tagText(p.endDate)
                        jeQuelle[tag, default: [:]][p.sourceRevision.source.bundleIdentifier, default: 0] += p.endDate.timeIntervalSince(p.startDate) / 60
                    }
                    for (tag, quellen) in jeQuelle where tag >= GesundheitPlugin.tagText(anfang) {
                        guard let quelle = quellen.max(by: { $0.value < $1.value })?.key else { continue }
                        let teile = alle
                            .filter { GesundheitPlugin.tagText($0.endDate) == tag && $0.sourceRevision.source.bundleIdentifier == quelle && phasenWerte[$0.value] != nil }
                            .sorted { $0.startDate < $1.startDate }
                        guard let beginn = teile.first?.startDate, let ende = teile.map({ $0.endDate }).max() else { continue }
                        var summe: [String: Double] = ["d": 0, "r": 0, "c": 0, "w": 0]
                        var phasen: [[Any]] = []
                        var wachPhasen = 0
                        for (i, t) in teile.enumerated() {
                            let art = phasenWerte[t.value] ?? "c"
                            let dauer = t.endDate.timeIntervalSince(t.startDate) / 60
                            summe[art, default: 0] += dauer
                            // Wach am Anfang und am Ende ist kein Aufwachen in der Nacht.
                            if art == "w" && i > 0 && i < teile.count - 1 { wachPhasen += 1 }
                            phasen.append([Int((t.startDate.timeIntervalSince(beginn) / 60).rounded()), Int(dauer.rounded()), art])
                        }
                        let name = teile.first?.sourceRevision.source.name ?? ""
                        sperre.lock()
                        naechte.append([
                            "tag": tag, "beginn": beginn.timeIntervalSince1970 * 1000, "ende": ende.timeIntervalSince1970 * 1000,
                            "tiefMin": summe["d"]!.rounded(), "remMin": summe["r"]!.rounded(), "kernMin": summe["c"]!.rounded(),
                            "wachMin": summe["w"]!.rounded(), "wachPhasen": wachPhasen, "quelle": name,
                            "phasen": phasen.count <= 400 ? phasen : [],
                        ])
                        sperre.unlock()
                        setzen(tag, "tiefschlafMinuten", summe["d"]!.rounded())
                        setzen(tag, "remMinuten", summe["r"]!.rounded())
                    }
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
                var d: [String: Any] = [
                    "id": w.uuid.uuidString,
                    "start": ISO8601DateFormatter().string(from: w.startDate),
                    "tag": GesundheitPlugin.tagText(w.startDate),
                    "uhrzeit": GesundheitPlugin.uhrzeitText(w.startDate),
                    "minuten": (w.duration / 60).rounded(),
                    "art": GesundheitPlugin.art(w.workoutActivityType),
                    // Was in Apple Fitness gewählt wurde, etwa Volleyball oder
                    // Laufen. Mit diesem Namen steht es danach im Kalender.
                    "name": GesundheitPlugin.name(w.workoutActivityType),
                ]
                // Aktive Kalorien und Puls des Trainings. Ohne sie stand eine
                // Stunde Pull im Tag, aber nicht, was sie verbraucht hat.
                if #available(iOS 16.0, *) {
                    if let typ = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned),
                       let summe = w.statistics(for: typ)?.sumQuantity() {
                        d["kcal"] = summe.doubleValue(for: .kilocalorie()).rounded()
                    }
                    let proMinute = HKUnit.count().unitDivided(by: .minute())
                    if let typ = HKQuantityType.quantityType(forIdentifier: .heartRate), let stat = w.statistics(for: typ) {
                        if let schnitt = stat.averageQuantity() { d["puls"] = schnitt.doubleValue(for: proMinute).rounded() }
                        if let hoch = stat.maximumQuantity() { d["pulsMax"] = hoch.doubleValue(for: proMinute).rounded() }
                    }
                }
                if d["kcal"] == nil, let gesamt = w.totalEnergyBurned {
                    d["kcal"] = gesamt.doubleValue(for: .kilocalorie()).rounded()
                }
                return d
            }
            sperre.lock()
            workouts = liste
            sperre.unlock()
            gruppe.leave()
        }
        store.execute(workoutAbfrage)

        // Blutung je Tag. Die Werte von HKCategoryValueMenstrualFlow über die
        // Rohwerte, weil Apple die Namen in iOS 18 umbenannt hat:
        // 1 ohne Angabe, 2 leicht, 3 mittel, 4 stark, 5 keine.
        var periode: [[String: Any]] = []
        if let periodeTyp = HKObjectType.categoryType(forIdentifier: .menstrualFlow) {
            gruppe.enter()
            let abfrage = HKSampleQuery(
                sampleType: periodeTyp,
                predicate: HKQuery.predicateForSamples(withStart: anfang, end: ende),
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, proben, _ in
                let staerke = [1: "mittel", 2: "leicht", 3: "mittel", 4: "stark"]
                let liste = (proben as? [HKCategorySample] ?? []).compactMap { p -> [String: Any]? in
                    guard let s = staerke[p.value] else { return nil }
                    return ["tag": GesundheitPlugin.tagText(p.startDate), "staerke": s]
                }
                sperre.lock()
                periode = liste
                sperre.unlock()
                gruppe.leave()
            }
            store.execute(abfrage)
        }

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
            call.resolve(["tage": liste, "workouts": workouts, "nahrung": nahrung, "periode": periode, "naechte": naechte, "von": GesundheitPlugin.tagText(anfang)])
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
    /// Ein Training aus daevo als Krafttraining in Apple Health, mit Beginn
    /// und Ende. Ohne Erlaubnis zum Schreiben bleibt es still beim Eintrag in
    /// daevo. Der Abgleich legt es nicht doppelt an, siehe `healthkit.js`,
    /// und die `TrainingWache` meldet Trainings der eigenen App nicht.
    @objc func trainingSpeichern(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let startMs = call.getDouble("start"), let endeMs = call.getDouble("ende"), endeMs > startMs else {
            call.resolve(["gespeichert": false])
            return
        }
        guard store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized else {
            call.resolve(["gespeichert": false, "grund": "keine Erlaubnis"])
            return
        }
        let start = Date(timeIntervalSince1970: startMs / 1000)
        let ende = Date(timeIntervalSince1970: endeMs / 1000)
        let titel = call.getString("titel") ?? "Training"
        let einstellung = HKWorkoutConfiguration()
        einstellung.activityType = .traditionalStrengthTraining
        einstellung.locationType = .indoor
        let bauer = HKWorkoutBuilder(healthStore: store, configuration: einstellung, device: .local())
        bauer.beginCollection(withStart: start) { ok, _ in
            guard ok else { call.resolve(["gespeichert": false]); return }
            bauer.addMetadata([HKMetadataKeyWorkoutBrandName: "daevo", "daevoTitel": titel]) { _, _ in
                bauer.endCollection(withEnd: ende) { _, _ in
                    bauer.finishWorkout { training, _ in
                        call.resolve(["gespeichert": training != nil, "id": training?.uuid.uuidString ?? ""])
                    }
                }
            }
        }
    }

    /// Der Name der Trainingsart, wie Apple Fitness sie zeigt, auf Deutsch.
    static func name(_ typ: HKWorkoutActivityType) -> String {
        switch typ {
        case .traditionalStrengthTraining: return "Krafttraining"
        case .functionalStrengthTraining: return "Funktionelles Krafttraining"
        case .coreTraining: return "Core Training"
        case .crossTraining: return "Cross Training"
        case .highIntensityIntervalTraining: return "HIIT"
        case .volleyball: return "Volleyball"
        case .soccer: return "Fussball"
        case .basketball: return "Basketball"
        case .handball: return "Handball"
        case .tennis: return "Tennis"
        case .badminton: return "Badminton"
        case .tableTennis: return "Tischtennis"
        case .squash: return "Squash"
        case .running: return "Laufen"
        case .walking: return "Gehen"
        case .hiking: return "Wandern"
        case .cycling: return "Radfahren"
        case .swimming: return "Schwimmen"
        case .rowing: return "Rudern"
        case .elliptical: return "Crosstrainer"
        case .stairClimbing, .stairs: return "Treppensteigen"
        case .yoga: return "Yoga"
        case .pilates: return "Pilates"
        case .flexibility: return "Beweglichkeit"
        case .cooldown: return "Cool-down"
        case .mixedCardio: return "Cardio"
        case .boxing: return "Boxen"
        case .martialArts: return "Kampfsport"
        case .dance, .cardioDance, .socialDance: return "Tanzen"
        default: return ""
        }
    }

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
