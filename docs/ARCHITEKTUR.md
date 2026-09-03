# Architektur und Entscheidungen

## Grundsatz

Der Rechenkern ist deterministisch und getestet. Das Sprachmodell macht nur das,
was Regeln nicht koennen: freien Text verstehen und Rezepte bauen. Kalorien,
Makros, Zeitpunkte und Bewertungen kommen aus Code, nicht aus dem Modell.

Der Grund ist praktisch. Sprachmodelle rechnen unzuverlaessig. Wenn die App bei
einem Nutzer 500 kcal falsch rechnet, verliert sie ihren Zweck. Deshalb prueft
`packages/coach/src/validate.ts` jede Modellantwort gegen die Makrorechnung
`kcal = Protein mal 4 plus Fett mal 9 plus Kohlenhydrate mal 4` und korrigiert
Abweichungen ueber zehn Prozent.

## Schichten

1. `packages/core`: reine Funktionen. Keine Datenbank, kein Netzwerk. Alles testbar.
2. `packages/coach`: Modellanbindung. Jede Faehigkeit hat einen Offline Pfad.
3. `apps/api`: HTTP, Persistenz, Zeitsteuerung.

Diese Trennung erlaubt spaeter einen Wechsel der Oberflaeche oder des Modells,
ohne die Rechenlogik anzufassen.

## Datenbank

SQLite ueber `node:sqlite`. Kein externer Dienst, keine Installation, eine Datei.
Fuer die ersten tausend Nutzer reicht das. Der Wechsel auf PostgreSQL wird noetig,
wenn mehrere Serverinstanzen gleichzeitig schreiben. Das Schema in
`apps/api/src/db.ts` nutzt nur portables SQL, damit der Wechsel klein bleibt.

## Naehrwertdaten

Die Tabelle in `packages/coach/src/foods.ts` hat rund 40 Eintraege. Sie ist ein
Entwicklungsfallback, keine Datenbank. Fuer die Produktion gibt es zwei Kandidaten:

- Open Food Facts. Offene Datenbank mit Barcode Suche und freier Lizenz.
  Datenqualitaet schwankt, weil Nutzer die Eintraege pflegen.
- Bundeslebensmittelschluessel des Max Rubner-Instituts. Amtliche deutsche
  Referenz, hohe Qualitaet, Nutzung ist lizenzpflichtig und antragsgebunden.

Empfehlung fuer den Start: Open Food Facts fuer Barcodes, dazu eine eigene
kuratierte Liste der 300 haeufigsten Lebensmittel. Diese Details sind vor dem
Einsatz zu pruefen, die Lizenzbedingungen aendern sich.

## Push und Apple Watch

Der Scheduler in `apps/api/src/scheduler.ts` bestimmt, welche Erinnerung faellig
ist, und sperrt jede Nachricht ueber einen UNIQUE Index gegen Doppelversand.
Der Versand selbst laeuft ueber ein Interface (`Notifier`). Aktuell schreibt die
Standardimplementierung nur ins Log.

Fuer den echten Versand braucht es:
- ein Apple Developer Programm Konto
- einen APNs Auth Key und einen je Anfrage signierten JWT
- Registrierung der Geraetetokens ueber `POST /api/me/devices`

Auf der Apple Watch erscheinen Benachrichtigungen der gekoppelten iPhone App
automatisch, solange das iPhone gesperrt ist oder die Uhr am Handgelenk sitzt.
Eine eigene watchOS App ist fuer reine Erinnerungen nicht noetig. Sie lohnt erst,
wenn der Nutzer direkt auf der Uhr antworten soll.

## Gesundheitsdaten

Apple Health Daten kommen ueber `POST /api/me/health` in Tagesbloecken. Die App
liest nur, was sie braucht: Schritte, Schlafdauer, Ruhepuls, Gewicht, aktive
Kalorien. HealthKit Daten duerfen laut Apple App Store Review Guidelines nicht
fuer Werbung genutzt oder an Dritte verkauft werden.

Gesundheitsdaten sind besondere Kategorien personenbezogener Daten nach
Artikel 9 DSGVO. Die Verarbeitung braucht eine ausdrueckliche Einwilligung,
eine Loeschfunktion und einen Export. Vor dem Start mit echten Nutzern ist
juristische Pruefung noetig. Das ist kein optionaler Punkt.

## Sicherheit

Aktuell: ein zufaelliges Token je Konto, gespeichert als SHA-256 Hash, Vergleich
in konstanter Zeit. Das reicht fuer Entwicklung und Testnutzer.

Vor dem oeffentlichen Start noetig:
- Sign in with Apple als Anmeldeverfahren
- kurzlebige Zugriffstokens plus Refresh Token
- Rate Limits auf allen Schreibrouten
- Verschluesselung der Datenbank im Ruhezustand

## Modellkosten

Jede Mahlzeitenerfassung ist ein Modellaufruf. Die Kosten haengen von Modell und
Tokenzahl ab und aendern sich. Vor der Preisgestaltung sind sie an der aktuellen
Preisliste von Anthropic zu pruefen und ueber echte Aufrufe zu messen.
Vorgehen: Testphase mit 20 Nutzern, Kosten je aktivem Nutzer pro Monat messen,
danach den Preis festlegen. Schaetzungen ohne Messung sind wertlos.

Kostenhebel, die unabhaengig vom Preis wirken:
- haeufige Mahlzeiten im Nutzerprofil zwischenspeichern statt neu berechnen
- Barcodes und die kuratierte Liste ohne Modellaufruf aufloesen
- Prompt Caching fuer den festen Systemteil
