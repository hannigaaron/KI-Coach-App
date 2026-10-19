# Datenschutzerklärung für daevo, Entwurf

Stand: Oktober 2026. Entwurf auf Grundlage dessen, was der Code wirklich tut.
Vor der Veröffentlichung von einer Anwältin, einem Anwalt oder einem
geprüften Dienst gegenlesen lassen. Stellen in eckigen Klammern sind offen
oder müssen bei einem Anbieter geprüft werden.

Am Ende steht, was in der App noch gebaut werden muss, damit dieser Text
stimmt.

---

## 1. Wer verantwortlich ist

[Vorname Nachname]
[Straße Hausnummer]
[PLZ Ort]
E-Mail: [Adresse]

## 2. Der Grundsatz

daevo speichert deine Daten auf deinem Gerät. Gespräche, Notizen, Mahlzeiten,
Gewicht, Training, Kalender und Gesundheitswerte liegen in der App auf deinem
iPhone und nicht in einer Datenbank von daevo.

Auf unseren Server geht nur, was für drei Dinge nötig ist: eine Antwort der
KI erzeugen, dein Abo führen und Missbrauch begrenzen. Was das genau ist,
steht unten.

## 3. Was auf deinem Gerät bleibt

- Deine Angaben aus dem Fragebogen, etwa Alter, Größe, Gewicht, Ziel,
  Ernährungsform, Allergien und das, was du über dein Essverhalten und dein
  Umfeld schreibst.
- Mahlzeiten, Wasser, Gewicht, Trainings, Check-ins, Aufgaben.
- Deine Gespräche mit daevo und die Notizen, die daevo sich merkt. Du kannst
  sie im Profil unter Gedächtnis einsehen und löschen.
- Ein Abbild deiner Kalendertermine, wenn du einen Kalender verbindest.
- Werte aus Apple Health, wenn du es erlaubst.

Die App legt davon eine zweite Kopie in ihrem eigenen Ordner auf dem Gerät
ab, damit nichts verloren geht. Beide Kopien sind Teil der Gerätesicherung
deines iPhones, sofern du sie eingeschaltet hast. Löschst du die App, sind
beide weg.

## 4. Apple Health

Mit deiner Erlaubnis liest daevo aus Apple Health: Schritte, aktive
Kalorien, Ruhepuls, Herzfrequenzvariabilität, Gewicht, Schlaf und Trainings.
daevo schreibt nichts in Apple Health.

Die Werte nutzt daevo, um dein Training an deine Nacht anzupassen, dein
Kalorienziel aus deinen echten Schritten zu rechnen und dir Verläufe zu
zeigen. Sie werden nicht für Werbung genutzt, nicht verkauft und nicht an
Dritte weitergegeben, außer an das KI-Modell nach Abschnitt 6, und das nur
mit deiner Einwilligung.

Du kannst die Erlaubnis jederzeit in der Health App unter Teilen, Apps,
daevo zurücknehmen.

## 5. Gesundheitsdaten sind besondere Daten

Angaben zu Gewicht, Schlaf, Puls, Ernährung und zu deinem Befinden sind
Gesundheitsdaten nach Art. 9 DSGVO. daevo verarbeitet sie auf Grundlage
deiner ausdrücklichen Einwilligung, Art. 9 Abs. 2 lit. a DSGVO. Du gibst sie
beim ersten Start und kannst sie im Profil jederzeit widerrufen. Ohne
Einwilligung funktioniert alles, was auf dem Gerät gerechnet wird, die KI
nicht.

## 6. Die KI

Wenn du daevo eine Nachricht schickst, die die KI beantworten soll, geht
diese Nachricht zusammen mit dem Zusammenhang, den die Antwort braucht, über
unseren Server an Anthropic, PBC, 548 Market Street, San Francisco, USA.
Zum Zusammenhang gehören je nach Frage: ein Auszug aus deinem Profil, die
Zahlen des Tages, passende Notizen aus dem Gedächtnis, Gesundheitswerte und
der Verlauf des laufenden Gesprächs. Fotos, die du schickst, gehen ebenfalls
mit.

Unser Server reicht die Anfrage nur weiter und speichert ihren Inhalt nicht.
Er liest aus der Antwort nur die Zahl der verbrauchten Einheiten, um dein
Kontingent zu zählen.

Anthropic verarbeitet die Daten als Auftragsverarbeiter. [Bei Anthropic
prüfen: Vertrag zur Auftragsverarbeitung abschließen, Speicherdauer der
Eingaben bei der API, Ausschluss vom Training, Grundlage der Übermittlung in
die USA, etwa Standardvertragsklauseln.]

Rechtsgrundlage ist deine Einwilligung, Art. 6 Abs. 1 lit. a und Art. 9
Abs. 2 lit. a DSGVO.

## 7. Dein Konto und dein Abo

Beim ersten Start legt die App ein Konto an, ohne E-Mail und ohne Passwort.
Auf unserem Server liegen dazu:

- ein Prüfwert deines Kontoschlüssels, aus dem sich der Schlüssel nicht
  zurückrechnen lässt,
- eine zufällige Kontokennung,
- deine Abostufe und bis wann sie gilt,
- wie viele Nachrichten du in diesem Monat an die KI geschickt hast und was
  sie gekostet haben. Dieser Zähler löscht sich nach 40 Tagen von selbst.

Rechtsgrundlage ist die Erfüllung des Vertrags, Art. 6 Abs. 1 lit. b DSGVO.

Den Kauf eines Abos wickelt Apple über den App Store ab. daevo erfährt
dabei nicht deinen Namen und keine Zahlungsdaten, nur dass ein Abo besteht
und bis wann. [Prüfen, sobald der Kauf gebaut ist.]

## 8. Missbrauch begrenzen

Damit niemand massenhaft Konten anlegt, zählt der Server je IP-Adresse, wie
viele Konten an einem Tag neu entstehen. Gespeichert wird dabei nicht die
Adresse selbst, sondern ein Prüfwert daraus, höchstens 26 Stunden lang.
Rechtsgrundlage ist unser berechtigtes Interesse am Schutz des Dienstes,
Art. 6 Abs. 1 lit. f DSGVO.

## 9. Wo der Server läuft

Der Server ist ein Cloudflare Worker der Cloudflare, Inc., 101 Townsend
Street, San Francisco, USA. Cloudflare verarbeitet die Anfragen als
Auftragsverarbeiter. [Prüfen: Vertrag zur Auftragsverarbeitung, Teilnahme
am EU-US Data Privacy Framework.]

## 10. Mitteilungen

Erinnerungen plant die App auf deinem iPhone selbst ein. Dafür geht nichts
an unseren Server. Du kannst Mitteilungen in den Einstellungen des iPhones
abschalten.

## 11. Dienste, die du selbst verbindest

- **Open Food Facts:** Wenn du einen Barcode scannst oder nach einem Produkt
  suchst, fragt die App direkt bei Open Food Facts, Frankreich, an. Dabei
  geht der Barcode oder Suchbegriff mit und, wie bei jedem Abruf im Netz,
  deine IP-Adresse.
- **Todoist:** Wenn du Todoist verbindest, fragt die App direkt bei Doist
  Inc. an. Dein Todoist-Schlüssel bleibt auf deinem Gerät.
- **Kalender:** Ein verbundener Kalender wird auf dem Gerät gelesen. Termine
  gehen nur dann an die KI, wenn eine Frage sie braucht, etwa für deinen
  Tagesplan.

## 12. Deine Rechte

Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung,
Datenübertragbarkeit und Widerspruch, Art. 15 bis 21 DSGVO, und das Recht,
eine Einwilligung jederzeit zu widerrufen. Was auf deinem Gerät liegt,
siehst und löschst du selbst in der App, im Profil unter Gedächtnis und
unter Daten löschen. Eine vollständige Kopie bekommst du im Profil unter
Sicherung. Für dein Konto auf dem Server schreib an die Adresse in
Abschnitt 1.

Du kannst dich bei einer Aufsichtsbehörde beschweren, etwa bei der deines
Bundeslandes. [Zuständige Behörde am Sitz des Verantwortlichen eintragen.]

## 13. Alter

daevo ist für Menschen ab 16 Jahren.

## 14. Kein Ersatz für ärztlichen Rat

daevo ist kein Medizinprodukt und ersetzt keine ärztliche, therapeutische
oder ernährungsmedizinische Beratung.

---

## Was in der App noch gebaut werden muss, damit dieser Text stimmt

1. **Einwilligung beim ersten Start.** Ein eigener Bildschirm vor dem ersten
   Gespräch: was an die KI geht, an wen, und ein Knopf zum Zustimmen. Apple
   verlangt das ebenfalls, wenn persönliche Daten an eine fremde KI gehen.
   Widerruf im Profil. Ohne Zustimmung läuft der Regelweg.
2. **Konto löschen** in der App, mit einem Weg auf dem Server, der Konto und
   Verbrauch entfernt.
3. **Kauf über StoreKit**, Abschnitt 7.
4. **Ein Link auf diesen Text** im Profil und auf der Website, dazu ein
   Impressum.
