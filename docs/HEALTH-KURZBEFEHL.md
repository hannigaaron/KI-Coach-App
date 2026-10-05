# Apple Health täglich über einen Kurzbefehl

Eine Web App kommt nicht an HealthKit heran. Die Kurzbefehle App schon. Ein
Kurzbefehl liest deine Tageswerte und schickt sie an deinen Push Worker.
daevo holt sie beim nächsten Öffnen ab, der Worker löscht sie dabei.

Das ist kein Livestrom. Die Werte kommen zu den Uhrzeiten, die du in der
Automation festlegst. Live geht erst mit der nativen App, siehe
`docs/ROADMAP.md`.

## Was du brauchst

- Adresse und Anmeldewort des Push Workers im Profil von daevo
- iOS 17 oder neuer, damit die Automation ohne Nachfrage läuft
- Die Adresse aus daevo: Menü, Planung und Struktur, Kalender, Abschnitt
  "Health täglich über Kurzbefehl", Adresse kopieren

## Den Kurzbefehl bauen

Kurzbefehle öffnen, oben rechts das Plus, Name: daevo Health.

### 1. Schritte

1. Aktion "Health-Messungen suchen".
2. Auf "Typ" tippen und "Schritte" wählen.
3. Filter "Startdatum" auf "ist heute".
4. Aktion "Statistik berechnen" darunter, auf "Summe" stellen.
5. Aktion "Variable festlegen", Name: Schritte.

### 2. Aktive Kalorien

Wie bei Schritten, Typ "Aktive Energie", Statistik "Summe", Variable:
Kalorien.

### 3. Ruhepuls

Wie oben, Typ "Ruheherzfrequenz", Statistik "Durchschnitt", Variable:
Ruhepuls.

### 4. Herzfrequenzvariabilität

Typ "Herzfrequenzvariabilität", Statistik "Durchschnitt", Variable: HRV.

### 5. Gewicht

Typ "Gewicht", Statistik "Durchschnitt", Variable: Gewicht. Hast du dich
heute nicht gewogen, bleibt das Feld leer, und daevo lässt das Gewicht in
Ruhe.

### 6. Abschicken

1. Aktion "Inhalte von URL abrufen", die kopierte Adresse einsetzen.
2. "Mehr anzeigen" antippen.
3. Methode: POST.
4. Header hinzufügen: Schlüssel `x-daevo-wort`, Wert dein Anmeldewort.
5. Anfragetext: JSON.
6. Fünf Felder hinzufügen, jeweils Typ "Zahl", als Wert die Variable:

| Schlüssel | Variable |
| --- | --- |
| schritte | Schritte |
| aktivKcal | Kalorien |
| ruhepuls | Ruhepuls |
| hrv | HRV |
| gewicht | Gewicht |

7. Zum Testen: Aktion "Ergebnis anzeigen" ans Ende. Der Worker antwortet mit
   dem, was er übernommen hat, und nennt verworfene oder unbekannte Felder.
   Steht dort `"ok": true`, stimmt alles. Danach kann die Aktion wieder raus.

Einmal mit dem Play Knopf ausführen. Beim ersten Mal fragt iOS, ob der
Kurzbefehl Health lesen darf. Erlauben.

## Automatisch laufen lassen

Kurzbefehle, Reiter Automation, Plus, "Tageszeit".

- 08:30, täglich, "Sofort ausführen", Kurzbefehl daevo Health
- dieselbe Automation nochmal für 14:00 und 21:30

Der Lauf um 21:30 bringt die Schritte des ganzen Tages. Ein späterer Lauf
überschreibt die Werte eines früheren am selben Tag.

## Was mit den Werten passiert

- Angenommen werden nur Zahlen unter den fünf Namen oben, kein Text.
- Jedes Feld hat einen gültigen Bereich. Ein Ruhepuls von 0 heisst, dass noch
  keiner gemessen wurde, und wird verworfen statt eingetragen.
- Die Werte liegen höchstens drei Tage auf dem Worker und werden beim Abholen
  gelöscht.
- In daevo gelten dieselben Regeln wie beim Export: Schritte überschreiben,
  ein selbst eingetragenes Gewicht bleibt stehen.

## Noch nicht dabei

Schlaf. Die Schlafanalyse kommt als Abschnitte mit Zuständen wie "Im Bett",
"Kern" oder "REM", und die Summe aller Abschnitte ist nicht die Schlafdauer.
Der Worker nimmt `schlafMinuten` bereits an. Wie der Kurzbefehl die Dauer
sauber ausrechnet, wird am echten Gerät geprüft, bevor es hier steht.

Die genauen Namen der Aktionen und Typen können je nach iOS Version leicht
abweichen.
