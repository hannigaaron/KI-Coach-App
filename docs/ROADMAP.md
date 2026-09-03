# Roadmap

Realistische Einschaetzung: bis zur ersten zahlenden Nutzergruppe sind es bei
zehn bis fuenfzehn Stunden Arbeit pro Woche etwa vier bis sechs Monate.
Der groesste Zeitfresser ist nicht der Code, sondern der App Store Prozess,
die Datenschutzanforderungen und die Naehrwertdatenbank.

## Milestone 1: Fundament (fertig)

- Rechenkern: Grundumsatz, Kalorienbedarf, Makros, Trinkmenge, Tagesscore, Streak
- Erinnerungslogik mit Obergrenze von sechs Nachrichten pro Tag
- Coach Layer mit Modellanbindung und Offline Fallback
- Pruefung von Modellantworten gegen die Makrorechnung
- API mit Konto, Profil, Mahlzeiten, Wasser, Check-ins, Kuehlschrank, Health Import
- Scheduler mit Sperre gegen Doppelversand
- Testkonsole im Browser mit Spracheingabe
- 59 automatisierte Tests

## Milestone 2: Mobile App

- Expo Projekt mit React Native, Ziel iOS zuerst
- Onboarding: Ziel, Koerperdaten, Trainingszeiten
- Spracheingabe fuer Mahlzeiten
- Tagesansicht mit Kalorien, Protein, Wasser
- HealthKit Anbindung fuer Schritte, Schlaf, Gewicht
- Push Benachrichtigungen ueber APNs
- Aufwand: sechs bis acht Wochen nebenbei

## Milestone 3: Datenqualitaet

- Anbindung Open Food Facts inklusive Barcode Scanner
- kuratierte Liste der 300 haeufigsten Lebensmittel ohne Modellaufruf
- Foto Erkennung von Mahlzeiten pruefen, Genauigkeit vorher an 100 Bildern messen
- Nachjustierung des Kalorienbedarfs ueber den Vier Wochen Gewichtsverlauf

## Milestone 4: Marktreife

- Sign in with Apple
- Abo ueber StoreKit, Gratis Stufe und Premium
- Loeschfunktion und Datenexport nach DSGVO
- Datenschutzerklaerung und Nutzungsbedingungen von einem Anwalt pruefen lassen
- App Store Review, Puffer von vier Wochen einplanen

## Milestone 5: Hebel

- Trainerkonten: ein Coach betreut mehrere Kunden ueber die App
- Whitelabel fuer Studios
- Empfehlungsprogramm

## Was zuerst zu klaren ist

1. Wer ist der erste Nutzer. Deine eigenen Coachingkunden sind der schnellste Weg
   zu echtem Feedback und der billigste Test.
2. Was kostet ein aktiver Nutzer im Monat an Modellaufrufen. Ohne diese Zahl ist
   keine Preisgestaltung moeglich.
3. Welche Funktion haelt Nutzer laenger als vier Wochen. Erfassung allein tut es
   erfahrungsgemaess nicht, sonst waeren bestehende Tracker genug.
