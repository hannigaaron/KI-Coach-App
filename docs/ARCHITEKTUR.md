# Architektur und Entscheidungen

## Grundsatz

Der Rechenkern ist deterministisch und getestet. Das Sprachmodell macht nur das,
was Regeln nicht können: freien Text verstehen und Rezepte bauen. Kalorien,
Makros, Zeitpunkte und Bewertungen kommen aus Code, nicht aus dem Modell.

Der Grund ist praktisch. Sprachmodelle rechnen unzuverlässig. Wenn die App bei
einem Nutzer 500 kcal falsch rechnet, verliert sie ihren Zweck. Deshalb prüft
`packages/coach/src/validate.ts` jede Modellantwort gegen die Makrorechnung
`kcal = Protein mal 4 plus Fett mal 9 plus Kohlenhydrate mal 4` und korrigiert
Abweichungen über zehn Prozent.

## Schichten

1. `packages/core`: reine Funktionen. Keine Datenbank, kein Netzwerk. Alles testbar.
2. `packages/coach`: Modellanbindung. Jede Fähigkeit hat einen Offline Pfad.
3. `apps/api`: HTTP, Persistenz, Zeitsteuerung.

Diese Trennung erlaubt später einen Wechsel der Oberfläche oder des Modells,
ohne die Rechenlogik anzufassen.

## Datenbank

SQLite über `node:sqlite`. Kein externer Dienst, keine Installation, eine Datei.
Für die ersten tausend Nutzer reicht das. Der Wechsel auf PostgreSQL wird nötig,
wenn mehrere Serverinstanzen gleichzeitig schreiben. Das Schema in
`apps/api/src/db.ts` nutzt nur portables SQL, damit der Wechsel klein bleibt.

## Nährwertdaten

Die Tabelle in `packages/coach/src/foods.ts` hat rund 40 Einträge. Sie ist ein
Entwicklungsfallback, keine Datenbank. Für die Produktion gibt es zwei Kandidaten:

- Open Food Facts. Offene Datenbank mit Barcode Suche und freier Lizenz.
  Datenqualität schwankt, weil Nutzer die Einträge pflegen.
- Bundeslebensmittelschlüssel des Max Rubner-Instituts. Amtliche deutsche
  Referenz, hohe Qualität, Nutzung ist lizenzpflichtig und antragsgebunden.

Empfehlung für den Start: Open Food Facts für Barcodes, dazu eine eigene
kuratierte Liste der 300 häufigsten Lebensmittel. Diese Details sind vor dem
Einsatz zu prüfen, die Lizenzbedingungen ändern sich.

## Push und Apple Watch

Es gibt zwei Wege, und sie beantworten verschiedene Fragen.

**Web Push über einen Cloudflare Worker.** Das ist der Weg, der läuft.
`workers/push` hat zwei Seiten. Der Cron läuft alle fünfzehn Minuten, rechnet
die Berliner Zeit selbst aus und schickt den Impuls, dessen Minute gerade
erreicht ist. Die HTTP Seite nimmt Anmeldungen der App entgegen, gibt den
öffentlichen Schlüssel heraus und kann eine Probe auslösen. Kein Server, den
jemand betreiben müsste, und keine Kosten.

GitHub Actions war die Alternative und ist es nicht geworden. Ein Cron startet
dort mit fünf bis dreissig Minuten Verzug, gelegentlich mit mehr, und die Abos
müssten von Hand in ein Secret geschrieben werden.

Die Verschlüsselung steht in `packages/push`, ohne Abhängigkeit: RFC 8291 für
den Schlüsselaustausch, RFC 8188 für das Format, RFC 8292 für die Signatur.
Gebaut auf WebCrypto und nicht auf `node:crypto`, damit dieselbe
Implementierung in Node, im Worker und im Browser läuft. Geprüft wird gegen
den Testvektor aus RFC 8291, Abschnitt 5. Das ist die einzige Prüfung, die
etwas beweist: ein Rundlauf mit selbst geschriebener Gegenseite zeigt nur,
dass beide Seiten denselben Fehler machen.

Grenzen dieses Weges. Die Abos stehen in einem Secret und werden von Hand
gepflegt, das trägt einen Nutzer und nicht hundert. Der Cron kennt die Zahlen
des Nutzers nicht, deshalb hängen die Impulse an keiner. Und GitHub startet
einen Cron mit fünf bis dreissig Minuten Verzug, gelegentlich mehr. Deshalb
liegen alle Impulse auf der vollen Stunde und das Skript entscheidet über die
Stunde, nicht über die Minute.

**Der Scheduler im Server.** `apps/api/src/scheduler.ts` bestimmt, welche
Erinnerung aus `reminders.ts` fällig ist, und sperrt jede Nachricht über einen
UNIQUE Index gegen Doppelversand. Diese Erinnerungen hängen an den Zahlen des
Tages, deshalb brauchen sie den Zustand und laufen nicht im Cron. Der Versand
läuft über das Interface `Notifier`. Die Standardimplementierung schreibt ins
Log. Mit `WebPushNotifier` geht derselbe Weg wie oben, sobald der Server steht.

Für den Versand über APNs in einer nativen App braucht es zusätzlich:
- ein Apple Developer Programm Konto
- einen APNs Auth Key und einen je Anfrage signierten JWT
- Registrierung der Gerätetokens über `POST /api/me/devices`

Auf dem iPhone gibt es Web Push ab iOS 16.4 und nur aus der installierten App,
also nach Teilen, Zum Home Bildschirm. In Safari selbst gibt es kein Push.
Quelle: WebKit, Web Push for Web Apps on iOS and iPadOS, 16. Februar 2023.

Auf der Apple Watch erscheinen Benachrichtigungen der gekoppelten iPhone App
automatisch, solange das iPhone gesperrt ist oder die Uhr am Handgelenk sitzt.
Eine eigene watchOS App ist für reine Erinnerungen nicht nötig. Sie lohnt erst,
wenn der Nutzer direkt auf der Uhr antworten soll.

## Gesundheitsdaten

Apple Health Daten kommen über `POST /api/me/health` in Tagesbloecken. Die App
liest nur, was sie braucht: Schritte, Schlafdauer, Ruhepuls, Gewicht, aktive
Kalorien. HealthKit Daten dürfen laut Apple App Store Review Guidelines nicht
für Werbung genutzt oder an Dritte verkauft werden.

Gesundheitsdaten sind besondere Kategorien personenbezogener Daten nach
Artikel 9 DSGVO. Die Verarbeitung braucht eine ausdrückliche Einwilligung,
eine Löschfunktion und einen Export. Vor dem Start mit echten Nutzern ist
juristische Prüfung nötig. Das ist kein optionaler Punkt.

## Sicherheit

Aktuell: ein zufälliges Token je Konto, gespeichert als SHA-256 Hash, Vergleich
in konstanter Zeit. Das reicht für Entwicklung und Testnutzer.

Vor dem öffentlichen Start nötig:
- Sign in with Apple als Anmeldeverfahren
- kurzlebige Zugriffstokens plus Refresh Token
- Rate Limits auf allen Schreibrouten
- Verschlüsselung der Datenbank im Ruhezustand

## Modellkosten

Jede Mahlzeitenerfassung ist ein Modellaufruf. Die Kosten hängen von Modell und
Tokenzahl ab und ändern sich. Vor der Preisgestaltung sind sie an der aktuellen
Preisliste von Anthropic zu prüfen und über echte Aufrufe zu messen.
Vorgehen: Testphase mit 20 Nutzern, Kosten je aktivem Nutzer pro Monat messen,
danach den Preis festlegen. Schätzungen ohne Messung sind wertlos.

Kostenhebel, die unabhängig vom Preis wirken:
- häufige Mahlzeiten im Nutzerprofil zwischenspeichern statt neu berechnen
- Barcodes und die kuratierte Liste ohne Modellaufruf auflösen
- Prompt Caching für den festen Systemteil
