# daevo als iPhone App

`apps/ios` ist eine native Hülle um die Web App, gebaut mit Capacitor 8. Die
App lädt dieselben Dateien wie die Web App, nur aus dem App Bundle statt aus
dem Netz. Fotos, Rezepte, Übungen und Schrift liegen damit auf dem Gerät und
laufen ohne Netz.

## Was du brauchst

- Einen Mac mit Xcode 26 oder neuer. Capacitor 8 verlangt mindestens Xcode 26.
- Node 22 oder neuer, wie für den Rest des Projekts.
- Eine Apple ID. Für dein eigenes iPhone reicht die kostenlose. Die App läuft
  dann 7 Tage und wird danach aus Xcode neu installiert. Für TestFlight und
  den App Store brauchst du das Apple Developer Program, 99 US Dollar im Jahr.

CocoaPods brauchst du nicht. Das Projekt nutzt den Swift Package Manager, den
Xcode selbst mitbringt.

## Erster Start

Im Ordner `KI-Coach-App` auf dem Mac:

```bash
git pull
npm run ios
```

Das installiert die Hülle, baut die Web App, kopiert sie ins Xcode Projekt und
öffnet Xcode. Danach in Xcode:

1. Links oben auf "App" klicken, dann den Reiter "Signing & Capabilities".
2. Bei "Team" deine Apple ID wählen. Fehlt sie, über "Add an Account" anmelden.
3. Steht dort ein Fehler zum Bundle Identifier, `de.daevo.app` auf etwas
   Eigenes ändern, zum Beispiel `de.deinname.daevo`. Eine Kennung kann nur
   ein Konto weltweit belegen.
4. iPhone per Kabel anschliessen, oben in der Leiste als Ziel wählen, dann
   auf das Dreieck zum Starten.
5. Beim ersten Mal blockt das iPhone die App. Auf dem iPhone unter
   Einstellungen, Allgemein, VPN und Geräteverwaltung deinem Entwicklerprofil
   vertrauen. Ab iOS 16 muss ausserdem der Entwicklermodus an sein:
   Einstellungen, Datenschutz und Sicherheit, Entwicklermodus.

## Nach jeder Änderung an der Web App

```bash
git pull
npm --prefix apps/ios run sync
```

Danach in Xcode erneut starten. `sync` baut die Web App und kopiert sie neu
hinein. Ohne diesen Schritt läuft im iPhone die alte Fassung.

## Deine Daten umziehen

Die iPhone App hat einen eigenen Speicher, getrennt von der Web App auf dem
Homebildschirm und von Safari. Sie startet leer.

1. In der bisherigen Web App: Profil, Sicherung, Exportieren. Den Text an dich
   selbst schicken, etwa per Notiz oder Nachricht.
2. In der iPhone App: auf der ersten Seite "Ich habe eine Sicherung", Text
   einfügen, "Einspielen und loslegen".

## Welche Fassung drin ist

Standard ist die Entwicklerfassung aus `dist-pages`: du trägst Schlüssel,
Worker Adresse und Anmeldewort selbst ein, wie in der Web App. Mit

```bash
npm --prefix apps/ios run web -- --nutzer && npx --prefix apps/ios cap sync ios
```

kommt die Fassung für Nutzer hinein. Die startet heute noch mit den Beispieldaten
der Demo und ist deshalb nicht für den Store gedacht.

## Was in der Hülle anders ist

- **Push:** Web Push gibt es in einer nativen App nicht. Die App sagt das im
  Profil. Mitteilungen kommen mit Apple Push, also mit einem Plugin und einem
  Umbau am Worker. Bis dahin laufen sie über die Web App vom Homebildschirm.
- **Spracherkennung:** Ob die Spracherkennung des Browsers in der Hülle
  verfügbar ist, ist am Gerät noch nicht geprüft. Fehlt sie, sagt die App das,
  und die Diktiertaste der Tastatur bleibt als Weg. Der nächste Schritt ist
  die Spracherkennung von iOS über ein Plugin.
- **Worker:** Die iPhone App meldet sich mit der Herkunft `capacitor://localhost`.
  Die steht in `workers/push/wrangler.toml` unter `HERKUNFT`. Damit sie gilt,
  einmal den Worker neu ausrollen: `cd workers/push && npx wrangler deploy`.

## Was als Nächstes kommt

Die Gründe für eine native App, in der Reihenfolge des Nutzens:

1. Spracherkennung von iOS, falls die des Browsers fehlt.
2. Apple Push für Tagesimpulse und Trainingslücke.
3. HealthKit live statt Export und Kurzbefehl.
4. EventKit für den Kalender statt Datei.
5. Weckwort im Hintergrund.

## Aufbau

```
apps/ios/package.json          Capacitor, eigene Abhängigkeiten
apps/ios/capacitor.config.json Name, Kennung, Hintergrund
apps/ios/vorbereiten.mjs       baut die Web App und kopiert sie nach www
apps/ios/ios/App               das Xcode Projekt
```

Capacitor steht bewusst nicht in der Wurzel. Die Web App bleibt ohne
Laufzeitabhängigkeit, die Hülle bringt ihre eigenen mit. `www` und die Kopie
im Xcode Projekt sind nicht im Repository, sie entstehen bei `sync`.

Die Begründungen im `Info.plist` für Mikrofon, Spracherkennung, Kamera und
Mediathek sind Pflicht. Fehlt eine, beendet iOS die App beim ersten Zugriff
ohne Meldung.
