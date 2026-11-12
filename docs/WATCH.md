# daevo auf der Apple Watch

Die Uhr hat vier Seiten und eine Komplikation.

- **daevo**: das leuchtende d wie auf dem iPhone, als Partikelkreis mit
  derselben Geometrie und Bewegung. Ein Tipp auf das d öffnet das Diktat,
  die Frage geht danach von selbst raus, die Antwort steht darunter und wird
  vorgelesen. Ein Tipp während daevo spricht hält die Stimme an.
- **Dein Tag**: die nächsten Termine heute und morgen, der nächste gross in
  der Markenfarbe, darunter die offenen Aufgaben in der Reihenfolge des
  Plans. Ein Tipp auf den Kreis hakt ab, das iPhone übernimmt es beim
  nächsten Abgleich, bei Todoist auch dort. Die Termine liest die Uhr aus
  ihrem eigenen Kalender, wenn sie darf, sonst kommen sie vom iPhone.
- **Heute**: offene Kalorien als Ring, Eiweiß und Wasser, ein Knopf für 250 ml
  Wasser. Ist das iPhone seit Mitternacht nicht offen gewesen, stehen die
  Ziele da und der Satz, dass das Essen von heute noch fehlt.
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
3. Product Name: nur `daevo`. Xcode hängt " Watch App" selbst an, Ziel und
   Ordner heissen danach `daevo Watch App`. Wer den ganzen Namen eintippt,
   bekommt "daevo Watch App Watch App", und die Befehle unten finden den
   Ordner nicht. Team wie bei der iPhone App, Organization Identifier
   `de.daevo.app`, ohne beides bleibt Finish grau. Wähle **Watch App for Existing iOS App**
   und als iOS App **App**. Interface SwiftUI, Häkchen bei Tests weg. Finish.
   Fragt Xcode nach dem Schema, nimm Activate.
4. Im Terminal, im Hauptordner:
   ```bash
   cp "apps/ios/watch/daevo Watch App/"*.swift "apps/ios/ios/App/daevo Watch App/"
   cp apps/ios/watch/Gemeinsam/Komplikation.swift "apps/ios/ios/App/daevo Watch App/"
   ```
5. In Xcode im Ordner `daevo Watch App` die zwei Dateien löschen, die Xcode
   angelegt hat: `ContentView.swift` und `daevo_Watch_AppApp.swift`, Move to
   Trash. Dann Rechtsklick auf den Ordner, Add Files to "App", die zehn
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

### Update November 2026: Dein Tag, Symbol, Leuchten, Antworten

Neue Dateien gibt es keine, nur geänderte. Im Terminal, im Hauptordner:

```bash
git pull origin claude/ai-coaching-nutrition-fitness-ur9o1d
cp "apps/ios/watch/daevo Watch App/"*.swift "apps/ios/ios/App/daevo Watch App/"
cp apps/ios/watch/AppIcon.appiconset/* "apps/ios/ios/App/daevo Watch App/Assets.xcassets/AppIcon.appiconset/"
npm run ios
```

Dann in Xcode, Ziel `daevo Watch App`, Reiter Info, eine Zeile dazu:
`Privacy - Calendars Full Access Usage Description`: daevo zeigt deine
nächsten Termine auf der Uhr. Ohne die Zeile fragt die Uhr nicht nach dem
Kalender und zeigt die Termine vom iPhone. Danach Play mit dem Schema
**App** wie immer, die Uhr App kommt mit.

### Hast du die Uhr schon eingerichtet

Dann nur die neuen Dateien nachholen: den `cp` Befehl aus Schritt 4 noch
einmal ausführen, er überschreibt die alten. In Xcode Rechtsklick auf den
Ordner `daevo Watch App`, Add Files, `Orb.swift`, `Gespraech.swift` und
`AssistentAnsicht.swift` wählen, Ziel **daevo Watch App**. Neue Rechte
braucht das nicht: das Diktat gehört zu watchOS, und ins Netz darf jede
Uhr App.

## Reden mit der Uhr

Zwei Wege, gewählt wird von selbst.

1. **Über das iPhone.** Ist daevo auf dem iPhone vorn offen, beantwortet das
   iPhone die Frage mit dem ganzen Coach, allen Werkzeugen und dem
   Gedächtnis. Was er einträgt, ist eingetragen. Die Frage steht danach auch
   im Gespräch auf dem iPhone.
2. **Allein.** Liegt das iPhone in der Tasche, hält iOS die App dort an und
   weckt sie für die Uhr nicht. Dann fragt die Uhr selbst, über denselben
   Server und dasselbe Konto, mit der Haltung von daevo und dem Stand des
   Tages vom letzten Abgleich. Eintragen kann sie dort nichts: sie merkt
   den Satz vor und sagt das. Beim nächsten Öffnen läuft er auf dem iPhone
   durch den Coach, als hättest du ihn dort gesagt.

Für den zweiten Weg braucht die Uhr Netz, über WLAN, Mobilfunk oder das
iPhone in Bluetooth Reichweite, und daevo muss einmal auf dem iPhone offen
gewesen sein, nachdem du der KI zugestimmt hast.

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
- Der Aufbau des d in `Orb.swift` lief unter Linux: 1847 Punkte im Ring, 780
  im Stamm, dasselbe Verhältnis wie auf dem iPhone.
- `uhr.test.js` prüft den Zugang zur KI im Paket, vorgemerkte Sätze und
  Gespräche von der Uhr.

Nicht geprüft: SwiftUI, WatchKit, HealthKit und WidgetKit gibt es nur auf
einem Mac. Ob die Ansichten bauen und auf der Uhr so aussehen wie gedacht,
zeigt die erste Runde in Xcode. Meldet Xcode einen Fehler, schick ihn mir mit
Datei und Zeile.

## Auf Mitteilungen antworten

Fragen wie "Wie ist dein Energielevel?" tragen einen Knopf **Antworten**.
Auf der Uhr öffnet er Diktat, Kritzeln und Tastatur, am gesperrten iPhone die
Tastatur. Die Antwort läuft durch die App wie eine Antwort im Chat, eine
blosse Zahl auf die Energiefrage rechnet daevo ohne KI. Liegt daevo noch im
Speicher des iPhones, kommt die Antwort von daevo gleich danach als
Mitteilung, auch auf der Uhr. War die App ganz beendet, wird die Antwort
beim nächsten Öffnen verarbeitet. Ob iOS das Skript im Hintergrund wirklich
ausführt, zeigt erst das Gerät.

## Was die Uhr nicht kann

- Die Krone belegen. Drücken gehört watchOS, Halten Siri, keine App kommt
  daran. Ab watchOS 11 auf Series 9, Ultra 2 und neuer öffnet Doppeltippen
  mit Daumen und Zeigefinger das Diktat, auf älteren Uhren der Tipp auf das d.
- Das Diktat beim Öffnen von selbst starten. watchOS öffnet es nur auf einen
  Tipp.
- Kalorien von heute ohne iPhone. Gerechnet wird im Rechenkern auf dem
  iPhone, und eine Uhr kann kein JavaScript ausführen. Was du der Uhr sagst,
  merkt sie vor und das iPhone trägt es beim nächsten Öffnen ein.

## Offen

- Ob das Diktat aus dem Tipp auf das d direkt startet oder erst die
  Tastatur mit Mikrofon zeigt, entscheidet watchOS. Das zeigt die erste
  Runde auf der Uhr.
- Ein Weckwort auf der Uhr gibt es nicht. watchOS gibt einer App kein
  Mikrofon im Hintergrund.
