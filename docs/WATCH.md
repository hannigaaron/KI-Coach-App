# daevo auf der Apple Watch

Die Uhr hat zwei Seiten und eine Komplikation.

- **Heute**: offene Kalorien als Ring, Eiweiß und Wasser, ein Knopf für 250 ml
  Wasser.
- **Training**: die Trainings, die das iPhone vorbereitet hat, mit den Werten
  vom letzten Mal in jedem Satz. Je Satz Kilo und Wiederholungen über die
  Krone, ein Haken, danach die Pause mit Vibration am Ende. Beim Beenden gehen
  die Sätze ans iPhone und stehen dort im Trainingsprotokoll wie jede Einheit
  aus dem Trainingsmodus.
- **Komplikation**: die offenen Kalorien auf dem Zifferblatt, als Ring, in
  der Ecke, als Zeile oder als Kachel mit Eiweiß.

Die Uhr rechnet nichts selbst. Das Paket rechnet `apps/pwa/js/uhr.js`, das
iPhone schickt es über `UhrPlugin.swift`. Das Training läuft auf der Uhr auch
ohne iPhone in der Nähe, die Sätze kommen an, sobald es wieder erreichbar ist.

## Einrichten in Xcode, einmal

Die Dateien liegen in `apps/ios/watch`. Die beiden Ziele für die Uhr legst du
einmal in Xcode an, das dauert rund zehn Minuten. Danach reicht `npm run ios`
und Play wie bisher.

### 1. Die Uhr App

1. `npm run ios` im Hauptordner. Xcode öffnet das Projekt.
2. Menü File, New, Target. Oben watchOS, dann **App**, Next.
3. Product Name: `daevo Watch App`. Wähle **Watch App for Existing iOS App**
   und als iOS App **App**. Interface SwiftUI, Häkchen bei Tests weg. Finish.
   Fragt Xcode nach dem Schema, nimm Activate.
4. Im Terminal, im Hauptordner:
   ```bash
   cp "apps/ios/watch/daevo Watch App/"*.swift "apps/ios/ios/App/daevo Watch App/"
   cp apps/ios/watch/Gemeinsam/Komplikation.swift "apps/ios/ios/App/daevo Watch App/"
   ```
5. In Xcode im Ordner `daevo Watch App` die zwei Dateien löschen, die Xcode
   angelegt hat: `ContentView.swift` und `daevo_Watch_AppApp.swift`, Move to
   Trash. Dann Rechtsklick auf den Ordner, Add Files to "App", die sieben
   kopierten Dateien wählen, unten Ziel **daevo Watch App** anhaken. Stehen
   sie schon im Ordner, prüfe rechts unter Target Membership das Häkchen.
6. Ziel `daevo Watch App`, Reiter Signing & Capabilities:
   - Team wie bei der iPhone App.
   - Plus Capability **HealthKit**.
   - Plus Capability **Background Modes**, Häkchen bei Workout Processing.
   - Plus Capability **App Groups**, Plus, `group.de.daevo.app`.
7. Reiter Info, zwei Zeilen dazu:
   - `Privacy - Health Share Usage Description`: daevo zeigt deinen Puls im Training.
   - `Privacy - Health Update Usage Description`: daevo speichert dein Krafttraining in Apple Health.
8. Reiter General: Minimum Deployments watchOS 10.0.
9. Reiter Build Settings, oben All, in die Suche:
   - `Swift Language Version`: **Swift 5**, wie die iPhone App.
   - `Default Actor Isolation`: **nonisolated**. Neue Ziele in Xcode 26
     stehen auf MainActor, und dann lehnt der Bau die Verbindung zum iPhone
     ab. Gibt es die Zeile nicht, ist dein Xcode älter und nichts zu tun.

### 2. Die Komplikation

1. File, New, Target. Oben watchOS, dann **Widget Extension**, Next.
2. Product Name: `daevo Komplikation`. Häkchen bei "Include Configuration App
   Intent" weg. Embed in: **daevo Watch App**. Finish, Schema Activate.
3. Im Terminal:
   ```bash
   cp "apps/ios/watch/daevo Komplikation/DaevoKomplikation.swift" "apps/ios/ios/App/daevo Komplikation/"
   ```
4. In Xcode im Ordner `daevo Komplikation` alle Swift Dateien löschen, die
   Xcode angelegt hat, und `DaevoKomplikation.swift` hinzufügen, Ziel
   **daevo Komplikation**.
5. `Komplikation.swift` im Ordner `daevo Watch App` anklicken, rechts unter
   Target Membership zusätzlich **daevo Komplikation** anhaken. Die Datei
   gehört zu beiden Zielen.
6. Ziel `daevo Komplikation`, Signing & Capabilities: Team, dann Plus
   Capability **App Groups** mit demselben `group.de.daevo.app`.
7. Build Settings wie oben: Swift 5, Default Actor Isolation nonisolated,
   Minimum Deployments watchOS 10.0.

### 3. Starten

Oben das Schema **App** und dein iPhone wählen, Play. Die Uhr App kommt mit.
Fürs erste Mal kannst du auch das Schema `daevo Watch App` und die Uhr
wählen, dann startet sie direkt auf der Uhr. Die Komplikation fügst du auf
dem Zifferblatt hinzu: lange drücken, Bearbeiten, eine Stelle antippen,
daevo wählen.

## Was geprüft ist und was nicht

Geprüft:

- Die Seite der App: `uhr.test.js` prüft das Paket, das Speichern eines
  Trainings von der Uhr, doppelt zugestellte Ereignisse, ein Training ohne
  fertigen Satz, und dass das Paket kein `null` enthält. Ein einziges `null`
  lässt iOS den ganzen Application Context ablehnen, und die Uhr bekäme nie
  einen Stand. Genau so stand es in der ersten Fassung. `UhrPlugin.swift`
  entfernt `NSNull` zusätzlich, bevor gesendet wird.
- Der Vertrag zwischen App und Uhr: das echte Paket aus `uhrPaket` wurde mit
  einem Swift 6.1 Compiler gegen `Modelle.swift` gelesen, alle Felder kamen
  an, auch die Sätze ohne Gewicht.
- Alle Swift Dateien von Uhr und iPhone auf Syntax.

Nicht geprüft: SwiftUI, WatchKit, HealthKit und WidgetKit gibt es nur auf
einem Mac. Ob die Ansichten bauen und auf der Uhr so aussehen wie gedacht,
zeigt die erste Runde in Xcode. Meldet Xcode einen Fehler, schick ihn mir mit
Datei und Zeile.

## Offen

- Essen von der Uhr eintragen, etwa per Diktat. Das braucht eine Antwort vom
  iPhone, während die App dort geschlossen ist, und die Web Ansicht rechnet
  im Hintergrund nicht. Möglich wäre eine Warteschlange, die beim nächsten
  Öffnen eingetragen wird.
