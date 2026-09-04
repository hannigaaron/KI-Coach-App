# Roadmap

Realistische Einschätzung: bis zur ersten zahlenden Nutzergruppe sind es bei
zehn bis fünfzehn Stunden Arbeit pro Woche etwa vier bis sechs Monate.
Der größte Zeitfresser ist nicht der Code, sondern der App Store Prozess,
die Datenschutzanforderungen und die Nährwertdatenbank.

## Milestone 1: Fundament (fertig)

- Rechenkern: Grundumsatz, Kalorienbedarf, Makros, Trinkmenge, Tagesscore, Streak
- Erinnerungslogik mit Obergrenze von sechs Nachrichten pro Tag
- Coach Layer mit Modellanbindung und Offline Fallback
- Prüfung von Modellantworten gegen die Makrorechnung
- API mit Konto, Profil, Mahlzeiten, Wasser, Check-ins, Kühlschrank, Health Import
- Scheduler mit Sperre gegen Doppelversand
- Testkonsole im Browser mit Spracheingabe
- 148 automatisierte Tests

## Milestone 2: Installierbare Web App (fertig)

- Web App unter apps/pwa, läuft ohne Server und ohne Konto
- Onboarding, Tagesansicht mit Ring und Makrobalken, Serie
- Mahlzeiten per Text oder Diktat, Wasser mit einem Tipp
- Erinnerungsplan, Kühlschrankvorschlag, Check-in, Trainingsplanung
- Eigener Anthropic Schlüssel aktiviert den daevo direkt im Browser
- Veröffentlichung über GitHub Pages, Ablauf in .github/workflows/pages.yml
- Anleitung in docs/PWA.md

## Milestone 3: Der Assistent (fertig)

Die App öffnet nicht mehr mit Zahlen, sondern mit dem Assistenten.

- Der Kreis aus dem Logo ist die Oberfläche. Er atmet im Ruhezustand, wächst
  und leuchtet beim Zuhören mit dem Mikrofonpegel, dreht sich beim Nachdenken
  und pulsiert beim Sprechen.
- Sprache in beide Richtungen: Diktat über die Spracherkennung des Browsers,
  Antworten werden vorgelesen. Freihand Modus hört nach jeder Antwort weiter zu.
- Der Assistent benutzt Werkzeuge und verändert die App wirklich: Mahlzeit
  erfassen, Wasser eintragen, Tagesstand abrufen, Mahlzeit vorschlagen,
  Check-in speichern, sich etwas merken, im Gedächtnis suchen.
- Gedächtnis: alles, was der Nutzer erzählt, bleibt in der App. Suche über
  Wortüberlappung mit inverser Dokumenthäufigkeit, Dubletten werden
  zusammengeführt. Einsehbar und löschbar unter Gedächtnis.
- Ohne API Schlüssel übernimmt ein regelbasierter Pfad. Er versteht Mengen,
  Zahlwörter und einfache Absichten und ruft dieselben Werkzeuge auf.
- Menue statt Tableiste. Bereiche: Assistent, Heute, Essen, Check-in,
  Gedächtnis, Empfehlungen, Profil.
- Empfehlungen entstehen aus den eigenen Zahlen. Jede nennt den Wert, auf dem
  sie beruht.

## Milestone 4: Anamnese und Aussehen (fertig)

- Anamnesebogen in neun Schritten beim ersten Start. Ein Schritt pro
  Bildschirm, Fortschrittsbalken, jede Antwort wird später wirklich benutzt.
- Gefragt wird nach: Name, bis zu drei Schwerpunkten, Körperdaten, Ziel,
  Schritten, Bewegung auf der Arbeit und in der Freizeit, Trainingserfahrung,
  Sporteinheiten pro Woche, Körperfettanteil über sechs Silhouetten,
  Unverträglichkeiten, Krankheiten, Aufsteh- und Schlafenszeit sowie den
  Zeiten am Handy morgens und abends.
- Aus den Antworten entstehen Profil, Kalorien- und Makroziele, ein
  Trainingsvorschlag und die ersten Einträge im Gedächtnis. Der Assistent
  kennt den Nutzer ab dem ersten Satz.
- Bewegung im Alltag geht in den Aktivitätsfaktor ein. Ein angegebener
  Körperfettanteil verschiebt die Proteinmenge auf die fettfreie Masse.
- Tag und Nacht: hell, dunkel oder wie das Gerät. Der Kreis wechselt mit,
  auf hellem Grund malt er in Blau dunkel statt zu leuchten.

## Milestone 5: Der Coach wird schlau (fertig)

Bis hierhin konnte der Assistent erfassen und rechnen. Jetzt beantwortet er
auch Fragen, für die man sonst einen Trainer fragt.

- Die Denktiefe hängt an der Nachricht. "Zwei Eier gegessen" läuft auf der
  niedrigsten Stufe, "warum bin ich seit Wochen müde" auf der höchsten mit
  viermal so viel Platz für die Antwort. Der Schalter steht in
  `denktiefe()` in `packages/coach/src/agent.ts`.
- Die Persona sagt nicht mehr "zwei bis vier Sätze", sondern "so lang wie die
  Frage es verdient". Eine Regel, die kurze Antworten erzwingt, macht einen
  Coach dumm.
- Bis zu zwölf Werkzeugrunden statt sechs. Eine ernsthafte Frage kostet leicht
  drei bis vier Aufrufe, bevor überhaupt geantwortet wird.
- Der Systemprompt trägt jetzt den ganzen Stand: Profil mit Trainingsplan,
  Tageszahlen, Mindeststandards, offene Einkäufe, die letzten sieben Tage in
  Zahlen und den Gewichtsverlauf.

### Gewichtsverlauf statt Formel

Die Formel schätzt den Bedarf, der Gewichtsverlauf misst ihn. Nach vier Wochen
schlägt die Messung die Schätzung.

- `packages/core/src/trend.ts` legt eine Gerade durch alle Wiegungen. Kleinste
  Quadrate, weil das Gewicht je nach Salz und Kohlenhydraten um ein bis zwei
  Kilo schwankt und ein Vergleich zweier Tage nichts sagt.
- Daraus und aus der durchschnittlichen Aufnahme kommt der tatsächliche
  Verbrauch: Aufnahme minus der Energie, die im Körper gelandet ist, gerechnet
  mit rund 7700 kcal je Kilogramm.
- Liegt die gemessene Rate ausserhalb der erwarteten Spanne, schlägt die App
  ein neues Ziel vor. Erst ab vier Wiegungen über 14 Tage und ab zehn Tagen mit
  Essenseintrag, davor sagt sie, was ihr fehlt.

### Haltung statt Vorschrift

Die Persona steht seit diesem Schritt in `packages/coach/src/persona.ts`, in
fünf Modi geteilt. Der Modus hängt an der Nachricht.

- `erfassen`: ein Satz, keine Belehrung. Wer beim Eintragen einen Vortrag
  bekommt, trägt bald nichts mehr ein.
- `coaching`: Antwort zuerst, dann Mechanismus, dann Grössenordnung, dann was
  konkret zu tun ist und woran man in vier Wochen merkt, ob es gewirkt hat.
- `psyche`: erst verstehen, dann vorschlagen. Die Schleife aus Auslöser,
  Reaktion im Körper, Bedeutung, Verhalten, Ergebnis und Scham benennen. Am
  Ende eine Sache, nicht fünf. Keine Diagnose, kein Ersatz für eine Therapie.
- `planung`: nach Zahlen fragen, bevor geraten wird. Schritte mit Reihenfolge,
  Zeitpunkt und Messwert. Bei Steuern und Recht an die Fachleute verweisen.
- `standard`: so antworten, wie die Nachricht es verlangt.

Dazu ein Feld im Profil für eigene Anweisungen. Sie stehen im Prompt zuletzt
und gehen allem vor, ausser den Grenzen und der Regel, keine Zahlen zu
erfinden. Es gibt eine Vorlage zum Einsetzen und Ändern.

Die Grenzen nennen die Telefonseelsorge mit beiden Nummern und sagen
ausdrücklich, dass keine weiteren Anlaufstellen erfunden werden dürfen. Ein
Test prüft, dass genau diese zwei Nummern dort stehen.

### Neue Werkzeuge

`verlauf_abrufen`, `gewicht_eintragen`, `training_eintragen`, `profil_aendern`,
dazu die sechs aus Einkauf und Standards. Insgesamt siebzehn.

## Milestone 6: Einkauf und Mindeststandards (fertig)

- Einkaufsliste aus den Tageszielen mal der Anzahl der Tage, umgerechnet in
  Ware. Ohne Sprachmodell, weil es eine Rechnung ist. Nährwerte kommen aus
  derselben Tabelle wie die Mahlzeitenerfassung.
- Unverträglichkeiten wirken auf die Liste. Wer keine Laktose verträgt, bekommt
  keinen Magerquark vorgeschlagen, auch wenn er nie "Magerquark" gesagt hat.
- Höchstmengen je Lebensmittel und Tag, damit bei hohen Zielen nicht 270 g
  Haferflocken am Tag auf der Liste stehen. Was durch den Deckel fällt, geht an
  die anderen Posten.
- Jeder Posten kennt drei Stände: offen, gekauft, hab ich noch. Der letzte
  wandert in den Vorrat und wirkt auf den nächsten Mahlzeitenvorschlag.
- Mindeststandards als Untergrenze, nicht als Ziel. Vier Stück, aus den
  Schwerpunkten des Anamnesebogens abgeleitet, mit Quote über 14 oder 28 Tage.
- Nachgehakt wird beim schlechtesten Standard, der noch zu retten ist. Einer pro
  Tag. Ein Standard, der seit Wochen bei null steht, gehört gesenkt, nicht
  erinnert.

## Milestone 7: Native App

Nötig für die zwei Dinge, die eine Web App auf dem iPhone nicht kann.

- Expo Projekt mit React Native, Ziel iOS zuerst
- Push Benachrichtigungen über APNs, auch wenn die App geschlossen ist
- HealthKit Anbindung für Schritte, Schlaf, Gewicht, Herzfreqünz
- Apple Fitness und Apple Watch, später Whoop und Oura über deren APIs
- Wortaktivierung, also Hey daevo ohne Tippen. Im Browser nicht zuverlässig
  möglich, nativ schon.
- Synchronisation mit dem Server statt Speicher im Browser
- Aufwand: sechs bis acht Wochen nebenbei

### Was auf den Sensoren aufbaut

Erst mit HealthKit sinnvoll, deshalb hier und nicht früher:

- Ruhepuls und Herzfreqünzvariabilität lesen. Liegt der Ruhepuls deutlich über
  dem eigenen Schnitt, fragt daevo nach und bietet zwei Minuten Atmung an,
  4-7-8 oder Box Breathing mit vier Zählzeiten je Phase.
- Schlaf aus HealthKit. Nach einer kurzen oder unruhigen Nacht schlägt daevo
  vor, das harte Training zu verschieben, und bietet eine Alternative an:
  Mobilität, lockeres Gehen oder eine Atemübung.
- Belege dazu: die Studienlage zu langsamer Atmung und Stressmarkern ist
  vorhanden, aber uneinheitlich. Der Nutzen wird als Angebot formuliert, nicht
  als Wirkversprechen. Das ist auch die Grenze, die der App Store zieht:
  Aussagen zu Diagnose oder Therapie machen die App zum Medizinprodukt.

## Milestone 8: Datenqualität

- Anbindung Open Food Facts inklusive Barcode Scanner
- kuratierte Liste der 300 häufigsten Lebensmittel ohne Modellaufruf
- Foto Erkennung von Mahlzeiten prüfen, Genauigkeit vorher an 100 Bildern messen
- Gedächtnis auf Einbettungen umstellen, wenn die Wortsuche an Grenzen stösst
- Nachjustierung des Kalorienbedarfs über den Vier Wochen Gewichtsverlauf

## Milestone 9: Marktreife

- Sign in with Apple
- Abo über StoreKit, Gratis Stufe und Premium
- Löschfunktion und Datenexport nach DSGVO
- Datenschutzerklärung und Nutzungsbedingungen von einem Anwalt prüfen lassen
- App Store Review, Puffer von vier Wochen einplanen

## Milestone 10: Hebel

- Trainerkonten: ein Coach betreut mehrere Kunden über die App
- Whitelabel für Studios
- Empfehlungsprogramm

## Was zuerst zu klaren ist

1. Wer ist der erste Nutzer. Deine eigenen Coachingkunden sind der schnellste Weg
   zu echtem Feedback und der billigste Test.
2. Was kostet ein aktiver Nutzer im Monat an Modellaufrufen. Trage deinen
   eigenen Schlüssel in der Web App ein, nutze sie zwei Wochen und lies die
   Kosten in der Anthropic Console ab. Das ist die Zahl.
3. Welche Funktion hält Nutzer länger als vier Wochen. Erfassung allein tut es
   erfahrungsgemäß nicht, sonst wären bestehende Tracker genug.
