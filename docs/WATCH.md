# daevo auf der Apple Watch

Die Uhr hat zwei Seiten. **Heute**: offene Kalorien als Ring, Eiweiß und
Wasser, ein Knopf für 250 ml Wasser. **Training**: die Trainings, die das
iPhone vorbereitet hat, mit den Werten vom letzten Mal in jedem Satz. Je Satz
Kilo und Wiederholungen über die Krone, ein Haken, danach die Pause mit
Vibration am Ende. Beim Beenden gehen die Sätze ans iPhone und stehen dort im
Trainingsprotokoll wie jede Einheit aus dem Trainingsmodus.

Die Uhr rechnet nichts selbst. Das Paket rechnet `apps/pwa/js/uhr.js`, das
iPhone schickt es über `UhrPlugin.swift`. Das Training läuft auf der Uhr auch
ohne iPhone in der Nähe, die Sätze kommen an, sobald es wieder erreichbar ist.

## Einrichten in Xcode, einmal

Die Dateien liegen in `apps/ios/watch/daevo Watch App`. Das Ziel für die Uhr
legst du einmal in Xcode an, das dauert rund fünf Minuten.

1. `npm run ios` im Hauptordner. Xcode öffnet das Projekt.
2. Menü File, New, Target. Oben watchOS, dann **App**, Weiter.
3. Product Name: `daevo Watch App`. Bundle Identifier: `de.daevo.app.watchkitapp`.
   Wähle "Watch App for Existing iOS App" und als iOS App **App**.
   Interface SwiftUI, Häkchen bei Tests weg. Fertig. Fragt Xcode nach einem
   Schema, nimm Activate.
4. Im Terminal, im Hauptordner:
   ```bash
   cp "apps/ios/watch/daevo Watch App/"*.swift "apps/ios/ios/App/daevo Watch App/"
   ```
5. In Xcode im Ordner `daevo Watch App` die beiden Dateien löschen, die
   Xcode angelegt hat: `ContentView.swift` und `daevo_Watch_AppApp.swift`
   (Move to Trash). Die sechs kopierten Dateien müssen zum Ziel
   `daevo Watch App` gehören: Datei anklicken, rechts unter Target
   Membership das Häkchen prüfen.
6. Ziel `daevo Watch App`, Reiter Signing & Capabilities:
   - Team wie bei der iPhone App.
   - Plus Capability: **HealthKit**.
   - Plus Capability: **Background Modes**, Häkchen bei Workout Processing.
7. Reiter Info des Ziels `daevo Watch App`, zwei Zeilen dazu:
   - `Privacy - Health Share Usage Description`: daevo zeigt deinen Puls im Training.
   - `Privacy - Health Update Usage Description`: daevo speichert dein Krafttraining in Apple Health.
8. Reiter General: Minimum Deployments watchOS 10.0.
9. Oben das Schema `daevo Watch App` und deine Uhr wählen, Play.

Danach reicht wie bisher `npm run ios` und Play mit dem Schema **App**: die
Uhr App wird mit der iPhone App installiert.

## Was geprüft ist und was nicht

Geprüft ist die Seite der App: `uhr.test.js` prüft das Paket, das
Speichern eines Trainings von der Uhr, doppelt zugestellte Ereignisse und
ein Training ohne fertigen Satz. Die Swift Dateien sind hier nicht
kompiliert, es gibt kein Xcode. Die erste Runde auf der Uhr ist deshalb ein
Test. Meldet Xcode einen Fehler, schick ihn mir mit Datei und Zeile.

## Offen

- Eine Komplikation für das Zifferblatt mit den offenen Kalorien.
- Essen von der Uhr eintragen, etwa per Diktat.
