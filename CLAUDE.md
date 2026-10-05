# daevo

Diese Datei wird von Claude Code in jeder Sitzung in diesem Repository
automatisch gelesen. Was hier steht, gilt.

## Marke, gilt in jeder Sitzung

Der Name der App lautet **daevo**, immer klein geschrieben, auch am Satzanfang.
Der Claim lautet **Evolve your daily life** und steht unter der Wortmarke.

Die Wortmarke ist zweigeteilt: `dae` in Poppins SemiBold 600, `vo` in
Poppins Light 300. Der Gewichtssprung ist das Erkennungsmerkmal und darf nie
wegfallen.

Das d ist kein Schriftzeichen, sondern gebaut. Die Bowl ist ein Aktivitätsring
wie bei der Apple Watch: Start oben, 300 Grad im Uhrzeigersinn, runde Enden,
die restlichen 60 Grad bleiben offen. Auch der Stamm hat runde Enden, oben
wie unten ein Halbkreis. Für kleine Grössen gibt es die
Varianten mit gefüllter Spur, sonst fällt der Buchstabe auseinander. Der
Bauplan steht in `docs/BRAND.md`, der Generator in `tools/brand/`.

Farben:

- Logoblau `#96D8F0`, aus dem Logo von Personal Coach Aaron übernommen.
  Nur auf dunklem Grund für Text und Bedienelemente einsetzen, Kontrast dort
  12.05 zu 1. Auf Weiß liegt es bei 1.57 zu 1 und ist für Text unbrauchbar.
- Blau dunkel `#1E7FA8` für alles Lesbare auf hellem Grund, Kontrast 4.51 zu 1.
- Schwarz `#0B0D10`, Grundton dunkel `#0E1116`, Weiß `#FFFFFF`.

Die Logodateien liegen in `apps/pwa/brand/` und tragen die Schrift als Pfade.
Nie durch neu gesetzten Text ersetzen. Vollständige Richtlinie in
`docs/BRAND.md`.

## Was das Projekt ist

Ein digitaler Ernährungs- und Fitnesscoach. Er erfasst Mahlzeiten per Sprache
oder Text, rechnet sie gegen die Tagesziele, erinnert zur richtigen Zeit und
baut aus dem Kühlschrankinhalt eine passende Mahlzeit.

```
packages/core     Rechenkern und Gedächtnis, ohne Abhängigkeiten
packages/coach    Assistent mit Werkzeugen, Sprachmodell, Regelpfad
packages/push     Web Push, RFC 8188, 8291, 8292, ohne Abhängigkeiten
apps/pwa          Installierbare Web App, läuft ohne Server
apps/api          HTTP API, SQLite, Scheduler
workers/push      Cloudflare Worker, verschickt die Tagesimpulse
scripts           Build der Web App, lokaler Vorschauserver
tools/brand       Generator für die Logodateien
docs              Architektur, Marke, Roadmap, Geschäftsmodell
```

## Die App öffnet mit dem Assistenten

Nicht mit Zahlen. Der Kreis aus dem Logo ist die Oberfläche, darunter das
Gespräch, unten die Eingabe.

Der Kreis liegt in `apps/pwa/js/orb.js` und läuft auf Canvas. Er besteht aus
rund 5400 Partikeln auf 30 Fäden um einen gedachten Schlauch, im Bogen wie im
Stamm. Die Geometrie
ist dieselbe wie im Logo. Canvas statt SVG, weil ein paar tausend Punkte pro
Bild in SVG nicht flüssig laufen. Gemessen: 60 Bilder pro Sekunde bei
dreifacher Pixeldichte. Alles andere liegt im Menue. Wer das ändert,
ändert den Kern des Produkts.

Der Assistent hat vierundvierzig Werkzeuge und verändert die App wirklich. Zahlen
über den Nutzer kommen immer aus Werkzeugen, nie aus dem Modell. Allgemeines
Wissen darf und soll er benutzen, dafür braucht er kein Werkzeug. Jede
Fähigkeit hat einen Regelpfad in `packages/coach/src/agent.ts`, damit die App
ohne Schlüssel benutzbar bleibt.

Der Systemprompt kommt in zwei Blöcken aus `systemBloecke()`. Der erste ist
byteweise immer gleich und trägt die Marke fürs Zwischenspeichern, der zweite
wechselt bei jeder Nachricht. Zusammen mit den Werkzeugbeschreibungen, die
davor gerendert werden, spart das rund 5000 Token je Nachricht. Wer etwas am
vorderen Teil ändert, verwirft den Speicher, und das merkt niemand ausser an
der Rechnung. Die Quote steht im Profil unter Kosten.

Wer daevo ist, steht in `packages/coach/src/persona.ts`, nicht im Agenten.
Das ist der wertvollste Teil der App: Rechenkern und Werkzeuge lassen sich
nachbauen, die Haltung nicht. Aufbau: eine Grundhaltung und ein Schreibstil,
die immer gelten, dazu fünf Modi. Der Modus hängt an der Nachricht und wird in
`denktiefe()` erkannt: erfassen, coaching, psyche, planung, standard.

Eine Mahlzeit einzutragen und ein Gespräch über Schuldgefühle sind nicht
dieselbe Aufgabe. Alle Anweisungen in einen Prompt zu packen macht ihn nicht
besser: ein Modell, das gleichzeitig "halte es kurz" und "geh in die Tiefe"
liest, tut weder das eine noch das andere richtig. Deshalb kommt nur der Block
des erkannten Modus in den Prompt.

Der Modus wählt auch das Modell, siehe `packages/coach/src/modelle.ts`.
Erfassen läuft auf Haiku, Fachfragen auf Sonnet, persönliche Gespräche und
Planung auf Opus, Bilder immer auf Opus. Haiku 4.5 lehnt `output_config.effort`
mit einem Fehler ab, deshalb steht je Modell in der Tabelle, ob es die Angabe
verträgt.

Der Modus steuert ausserdem, wie viel Kontext mitgeht. Erfassen bekommt ein
kurzes Profil, die Zahlen des Tages, drei Notizen und sechs Nachrichten
Verlauf. Alles andere bekommt weiterhin alles. An der Antwortqualität wird
nicht gespart, nur an dem, was beim Eintragen einer Mahlzeit niemand liest.

Denktiefe: psyche und planung immer `high`. Fachfragen laufen auf `medium`,
kurzes hin und her auf `low`. Der Schalter "immer gründlich denken" im Profil
hebt alles auf `high`. `maxTokens` ist eine Notbremse gegen abgeschnittene
Antworten, kein Sparhebel: bezahlt wird nur, was geschrieben wird.

Die Antwort läuft als Datenstrom in die Blase, sobald das erste Wort da ist.
Der Parser für die Server Sent Events steht in `packages/coach/src/anthropic.ts`,
die Anzeige in `apps/pwa/js/app.js`. Kosten ändert das nicht, nur die gefühlte
Wartezeit.

Der Nutzer kann eigene Anweisungen hinterlegen. Sie stehen im Prompt ganz
unten und gehen allem vor, ausser den Grenzen und der Regel, keine Zahlen zu
erfinden. Gespeichert unter `settings.anweisungen`, Obergrenze 4000 Zeichen,
weil jede Nachricht sie mitschickt.

Der Kalorienbedarf kommt aus der Formel, solange nichts Besseres da ist. Ab
vier Wiegungen über 14 Tage und zehn Tagen mit Essenseintrag misst
`packages/core/src/trend.ts` den tatsächlichen Verbrauch aus dem
Gewichtsverlauf. Die Messung schlägt dann die Schätzung.

Das Gedächtnis liegt in `packages/core/src/memory.ts`. Suche über
Wortüberlappung mit inverser Dokumenthäufigkeit, keine Einbettungen. Es ist
für den Nutzer einsehbar und löschbar.

## Regeln für den Code

- Keine Laufzeitabhängigkeiten. Der Server nutzt `node:http` und `node:sqlite`,
  die Web App läuft ohne Bundler über eine Import Map. Neue Abhängigkeiten
  brauchen eine Begründung.
- Kalorien und Makros kommen aus `packages/core`, nie aus dem Sprachmodell.
  Jede Modellantwort wird in `packages/coach/src/validate.ts` gegen
  `kcal = Protein*4 + Fett*9 + Kohlenhydrate*4` geprueft.
- Jede Fähigkeit im Coach Layer braucht einen Offline Pfad. Die App muss ohne
  API Schlüssel bedienbar bleiben.
- Kommentare erklären das Warum, nicht das Was. Quellen für Formeln gehören
  in den Code.
- Deutsche Texte in der Oberfläche, in Kommentaren und in der Dokumentation.
  Echte Umlaute schreiben: ä, ö, ü, ß. Keine Umschreibungen wie ae oder ue.
- ASCII bleibt nur dort, wo Werte gespeichert oder verglichen werden:
  Bezeichner im Code, Enum Werte wie `praeferenz`, Werkzeugnamen, Dateinamen.
  Wo Text gegen Listen oder Muster geprüft wird, laufen beide Seiten durch
  `foldUmlauts`. Dadurch bricht eine spätere Textkorrektur die Erkennung nicht.
- Vor jedem Commit `npm test` und `npm run build:pwa`. Beides muss grün sein.
- `build:pwa` prüft ausserdem, dass jedes `$("...")` eine Kennung anspricht,
  die im HTML steht. Ein Knopf, der aus der Oberfläche verschwindet und dessen
  Listener stehen bleibt, macht die App schwarz, und der Syntaxtest sieht das
  nicht.
- `build:pwa` prüft jede Datei in `apps/pwa/js` mit `node --check`, bevor
  irgendetwas nach dist-pages geht. Ein Tippfehler kam sonst grün durch und
  machte die App beim Öffnen weiss: das Modul lädt nicht, `#app` bleibt
  versteckt, und der Nutzer sieht den Anamnesebogen statt seiner Daten. Genau
  das ist passiert.
- `apps/pwa/js/assistant.test.js` läuft bei `npm test` mit. Die Schicht, die
  Essen, Gewicht, Training und Zeit in die Daten schreibt, war vorher
  ungetestet, und jeder Fehler des ersten Betriebswochenendes lag genau dort.
  Getestet wird ohne Browser: `storage.js` und `assistant.js` fassen weder
  `document` noch `window` an, ein Ersatz für `localStorage` reicht. Wer dort
  etwas anfasst, das den Browser braucht, nimmt sich diese Tests weg.

## Befehle

```bash
npm install
npm test           # 883 Tests
npm run serve:pwa  # Web App auf http://localhost:8080
npm run dev        # API auf http://localhost:8787
npm run build:pwa  # statische Ausgabe nach dist-pages
npm run build:demo # Fassung für Nutzer nach dist-demo
```

## Veröffentlichung

Jeder Push auf `main` baut und veröffentlicht die Web App über GitHub Pages.
Der Ablauf steht in `.github/workflows/pages.yml`. Ist ein Test rot, wird nichts
veröffentlicht. Adresse: https://hannigaaron.github.io/KI-Coach-App/

## Kalender

Der Kalender kommt als iCalendar hinein, nach RFC 5545. Google Calendar gibt je
Kalender eine geheime Adresse im iCal Format aus, der Apple Kalender exportiert
eine .ics Datei oder veröffentlicht einen Feed. Ein Parser deckt beide ab,
`packages/core/src/ical.ts`, ohne Abhängigkeit.

Zeitzonen laufen über `Intl`. Steht in DTSTART ein TZID, wird die Wandzeit
dieser Zone in einen Zeitpunkt umgerechnet, nicht als Ortszeit des Geräts
angenommen. Serien werden nur innerhalb des Fensters aufgelöst, 14 Tage zurück
und 90 voraus. Was der Parser nicht lesen kann, wird gezählt und gemeldet.

Aus den Terminen macht `packages/core/src/tagesablauf.ts` das Coaching: belegte
Minuten, freie Blöcke, der längste Block für konzentrierte Arbeit, und die
Zeitpunkte der Mahlzeiten in den Lücken statt in den Terminen. Vor einem
erkannten Training rückt die Mahlzeit auf 90 Minuten davor. Jede Empfehlung
hängt an einer Zahl aus Kalender oder Profil, nichts davon kommt aus dem Modell.

Der Import läuft im Browser. Es geht keine Datei an einen Server. Gespeichert
werden die gelesenen Termine, nicht die Datei: ein Jahr Kalender als ICS ist
schnell ein Megabyte, und der localStorage ist bei rund fünf zu Ende.

Offen: die geheime Adresse direkt abrufen statt eine Datei zu wählen. Das
scheitert im Browser an CORS, dafür braucht es `apps/api` als Zwischenstelle.
OAuth für Google und EventKit für Apple gehören in die native App, siehe
`docs/ROADMAP.md`.

## Gespräche statt eines Verlaufs

`packages/core/src/gespraeche.ts`. Ein einziger Chat hat zwei Probleme. Das eine
ist praktisch: was vor drei Wochen besprochen wurde, findet niemand wieder, weil
Scrollen keine Suche ist. Das andere kostet Geld und Qualität: geht der gesamte
Verlauf bei jeder Nachricht mit, zahlt der Nutzer für Kontext, der nichts zur
Frage beiträgt, und das Modell muss zwischen einem Gespräch über Kalorien und
einem über Schuldgefühle selbst trennen.

Sechs Ordner: Ernährung, Training, Regeneration, Planung, Ängste, Sonstiges.
Einsortiert wird über Wortlisten, nicht über das Modell. Ein Ordner, für den
erst eine Anfrage rausgeht, wird bei jedem zweiten Gespräch falsch gesetzt, weil
die Anfrage scheitert oder Geld kostet. Das Modell darf über
`gespraech_einordnen` korrigieren, der Nutzer auch. Eine Zuordnung von Hand
setzt `ordnerFest` und wird danach nicht mehr überschrieben.

Gezählt wird, wie viele verschiedene Wörter je Ordner treffen, nicht wie oft.
Sonst gewinnt ein Gespräch, in dem zwanzig Mal "Essen" steht, gegen eines, das
inhaltlich breiter zum Thema gehört. Ängste schlägt bei Gleichstand alles
andere: wer über Scham redet und dabei sein Training erwähnt, führt kein
Trainingsgespräch. Gewertet werden nur die Nachrichten des Nutzers, denn was der
Coach antwortet, ist seine Antwort und nicht das Thema.

Titel und Ordner werden erst ab der zweiten Nachricht des Nutzers gesetzt. Eine
einzelne Zeile wie "hi" sagt über das Thema nichts. Der Titel ist der erste Satz
des Nutzers, gekürzt an der Wortgrenze, ohne Modellaufruf: für die Beschriftung
einer Listenzeile lohnt keine Anfrage.

Die Suche nutzt dasselbe Verfahren wie das Gedächtnis, Wortüberlappung mit
inverser Dokumenthäufigkeit. Ein seltenes Wort wiegt damit schwerer als "ich",
ohne dass eine Stoppwortliste gepflegt werden muss. Ein Treffer im Titel wiegt
1,6 fach, weil damit meist genau dieses Gespräch gemeint ist.

`store.getGespraeche()` übernimmt beim ersten Aufruf einen bestehenden einzelnen
Verlauf als "Bisheriger Verlauf". Ohne das verliert jeder, der die App schon
benutzt hat, seinen kompletten Chat.

Vierzig Gespräche mit je hundert Nachrichten sind die Obergrenze. Der
localStorage ist bei rund fünf Megabyte zu Ende.

Der Coach sieht nur das offene Gespräch. Über `gespraeche_durchsuchen` holt er
Ausschnitte aus früheren, nicht die kompletten Verläufe: fünf ganze Gespräche im
Kontext kosten mehr Token als die eigentliche Frage.

## Der Anamnesebogen

Dreizehn Schritte, die letzten vier sind der Unterschied zwischen einem Rechner
und einem Coach: Essverhalten, Vorgeschichte, Umfeld, Antrieb.

Alles davor sind Zahlen. Gewicht, Grösse, Schritte, Trainingstage. Damit lässt
sich ein Kalorienziel ausrechnen und sonst nichts. Was darüber entscheidet, ob
jemand sein Ziel erreicht, steht in den vier Schritten danach: wann er isst
obwohl er keinen Hunger hat, was ihn bisher jedes Mal gestoppt hat, und wer in
seinem Umfeld dagegen arbeitet.

Alle vier sind überspringbar. Ein Bogen, der zu Antworten über Scham zwingt,
bekommt erfundene Antworten, und eine erfundene Antwort ist schlechter als eine
fehlende: die App rechnet damit weiter.

Die Antworten kommen mit Wichtigkeit 5 ins Gedächtnis, also der höchsten Stufe.
Wer einmal aufschreibt, dass er sonntagabends die Kontrolle verliert, erwartet,
dass der Coach das in vier Monaten noch kennt. Eine Notiz mit Wichtigkeit 2
fällt bei der Suche durch, und dann fragt der Coach dieselbe Frage nochmal.

`MemoryKind` hat dafür die Kategorie `muster` bekommen: wiederkehrendes
Verhalten, vom Nutzer selbst berichtet. Weder ein Fakt noch eine Beobachtung des
Coaches. Ein Fakt gilt, ein Muster tritt ein, und die Unterscheidung zählt: über
einem Fakt lässt sich planen, über einem Muster muss man reden.

Der wichtigste Satz im ganzen Bogen ist der, woran es bisher gescheitert ist.
Was jemanden zehnmal gestoppt hat, stoppt ihn beim elften Mal wieder. Die
Persona verlangt deshalb, vor jedem Plan zu prüfen, ob er an genau dieser Stelle
wieder bricht.

Die Frage nach dem Tonfall ist eine Anweisung, keine Vorliebe. Wer sagt, dass er
sich selbst genug Druck macht, bekommt keine Ansage, auch wenn eine Ansage
wirksamer wäre.

## Die zwei Check-ins der Woche

`packages/core/src/checkin.ts`. Mittwoch 18:00 die Bilanz, Sonntag 19:30 der
Rückblick. Die Fragen stammen aus den Fragebögen, die der Nutzer vorher
ausserhalb der App geführt hat. Sie wurden übernommen und nicht verbessert: ein
Bogen, den jemand über Monate benutzt hat, ist erprobter als einer, den sich
eine App ausdenkt.

Mittwoch ist die Mitte, deshalb stehen dort Zahlen, die sich noch drehen lassen,
und alles ist Pflicht. Ein Check-in mit Lücken taugt nicht für einen Verlauf,
und der Verlauf ist der ganze Zweck. Sonntag ist Rückblick, dort ist nichts
Pflicht: ein Bogen, der zu einem Satz über Dankbarkeit zwingt, wird abgehakt und
nicht beantwortet.

Ein Schieberegler ohne Bewegung gilt als unbeantwortet. Der Griff steht in der
Mitte, die Anzeige bleibt aber leer und die Spur grau. Eine Zahl, die dasteht,
ohne dass jemand sie gewählt hat, sieht im Verlauf später aus wie eine Antwort.

`checkinText` gibt nur beantwortete Fragen aus. `checkinVergleich` stellt die
Zahlen gegen den letzten gleichen Bogen, mit einer Schwelle: ein Punkt auf einer
Skala bis 10 ist Rauschen, zehn Prozentpunkte auch. Ein einzelner Bogen ist eine
Momentaufnahme, erst "Stress von 40 auf 75" ist eine Aussage.

## Sprachausgabe

`apps/pwa/js/voice.js` nahm bisher die erste deutsche Stimme aus der Liste des
Geräts. Auf einem iPhone ist das die weibliche Standardstimme in Basisqualität.
Jetzt werden alle deutschen Stimmen bewertet: bessere Qualität zuerst, dann
männlich, dann lokal vor Netz. Der Unterschied zwischen Basis und Premium ist
grösser als der zwischen zwei verschiedenen Stimmen, deshalb wiegt die Qualität
am schwersten. Die Auswahl steht im Profil, weil nur das Gerät weiss, was
installiert ist.

Zur Wahl stehen die deutschen Stimmen, `waehlbareStimmen()`. Dazwischen lag
kurz eine Fassung, die jede Stimme des Geräts anbot, deutsche zuerst. Das war
die Überkorrektur auf den umgekehrten Fehler und im Betrieb schlimmer: dreissig
Einträge in fremden Sprachen, dazwischen die drei, die jemand wirklich will.
Eine Auswahl, die man durchsuchen muss, ist keine Auswahl.

Raus fliegen ausserdem die Spass- und Eloquence-Stimmen. Apple liefert unter
jeder Sprache Eddy, Flo, Grandpa, Rocko, Zarvox und ein Dutzend weitere mit,
alle mit deutschem Sprachkürzel. Ein Coach, der wie Zarvox klingt, wird nicht
ernst genommen. Geprüft wird auf Wortgrenzen, denn "flo" steckt in "Florian".

Meldet das Gerät keine einzige deutsche Stimme, kommt die ganze Liste. Gar
keine Wahl ist schlechter als eine unsortierte.

`stimmenBereit()` wartet, bis das Gerät seine Stimmen meldet. `getVoices()`
gibt beim ersten Aufruf oft eine leere Liste zurück und füllt sie erst danach.
Ohne das Warten war die Auswahl leer, obwohl Stimmen da waren.

Das Sprachkürzel der Ausgabe folgt der gewählten Stimme, nicht umgekehrt.
Steht dort fest `de-DE`, während die Stimme ein anderes trägt, sucht sich
manche Engine eine andere Stimme und ignoriert die Wahl.

Der grössere Teil des Roboterklangs kommt nicht von der Stimme, sondern vom
Text. `stripForSpeech` setzt Punkte an Zeilenenden, damit die Engine Luft holt,
löst Abkürzungen auf und schreibt Uhrzeiten aus. Ohne das wird "14:30" zu
"vierzehn Doppelpunkt dreissig". Tempo 0,96 und Tonhöhe 0,95 liegen knapp unter
dem Standard: die Voreinstellung klingt gehetzt, und gehetzt klingt maschinell.

Auf dem iPhone steht nur eine deutsche Stimme zur Wahl, und das ist Anna. Die
Stimmen, die man unter Bedienungshilfen, Gesprochene Inhalte, Stimmen
herunterlädt, liegen zwar auf dem Gerät, gehören aber zu VoiceOver und
Gesprochene Inhalte. Die Web Speech API sieht einen anderen Topf. Markus und
Yannick sind für eine Web App damit nicht erreichbar, egal was installiert
ist.

Das stand hier vorher anders, und die App hat dem Nutzer entsprechend
Hoffnung gemacht. Deshalb der Knopf "Alle Stimmen zeigen, die dein Gerät
meldet" im Profil: er gibt jede gemeldete Stimme aus, mit Sprachkürzel und
Vermerk lokal oder Netz. Eine Liste beendet eine Vermutung, ein Satz in einer
Dokumentation nicht.

Eine wirklich menschliche Stimme geht mit der Web Speech API nicht. Dafür
braucht es eine externe Sprachsynthese, einen weiteren Schlüssel und laufende
Kosten. Siehe `docs/ROADMAP.md`.

## Das Weckwort

`packages/core/src/weckwort.ts`. Der Knopf mit "Hey" neben dem Mikrofon schaltet
das Dauerhören ein. Danach reicht "Hey daevo, ich hab 200 Gramm Magerquark
gegessen", ohne dass jemand das Mikrofon antippt.

Erkannt wird ein Anredewort und danach der Name. Beides zusammen, nie der Name
allein. Der Chef dieses Nutzers heisst David, und "ich hab mit David gesprochen"
darf die App nicht aufwecken. Ein Anredewort davor kostet nichts und schliesst
genau diesen Fall aus.

Die Spracherkennung schreibt den Namen fast nie richtig. Deshalb steht eine
Liste echter Verschreiber im Code, dazu Levenshtein Abstand bis 2 für alles,
was noch kommt. Die Liste stammt aus dem, was das Gerät tatsächlich ausgegeben
hat, nicht aus Vermutungen.

Steht hinter dem Weckwort schon ein Satz, geht er sofort raus. Steht nichts
dahinter, antwortet die App "ja, ich höre" und nimmt die nächste Äusserung als
Frage. Zwei Wege, weil beides vorkommt.

Nach zehn Minuten ohne Weckruf schaltet das Dauerhören ab. Ein dauernd offenes
Mikrofon zieht Akku, und niemand merkt es, bis das Gerät leer ist. Jeder
erkannte Ruf setzt die Frist neu.

`weckwortWeiterhoeren()` startet das Mikrofon nach jedem verworfenen Satz neu.
Der Listener in `voice.js` startet von selbst nur neu, wenn gar kein Text kam.
Ohne den Neustart war das Mikrofon nach dem ersten Fremdsatz tot, und das sieht
aus wie ein kaputter Knopf.

Im Hintergrund oder bei gesperrtem Bildschirm läuft das nicht. Das Web gibt
einer Seite kein Mikrofon, wenn sie nicht sichtbar ist. Das ist keine
Einstellung, sondern die Plattformgrenze, und keine Bibliothek hebt sie auf.

Dafür gibt es den Siri Kurzbefehl. Die App nimmt eine fertige Frage über
`?sag=` entgegen, schickt sie ab und liest die Antwort vor. Ein Kurzbefehl mit
einer Diktatabfrage und dieser Adresse macht daraus "Hey Siri, daevo", und das
läuft bei gesperrtem Bildschirm. Die Adresse baut `siriAdresse()` aus der
laufenden Adresse, nicht aus einer festen Zeile: wer daevo auf einer eigenen
Domain betreibt, bekommt seine eigene.

Tut der Knopf nichts, sagt `weckwortHindernis()` warum. Geprüft wird einzeln:
keine Spracherkennung in diesem Browser, keine in der installierten App auf dem
iPhone, kein https, kein Mikrofonzugriff. Ein Knopf, der stumm nichts tut, wird
fünfmal gedrückt und die App danach für kaputt gehalten. Ein Fehler des
Mikrofons im Weckwortmodus schaltet den Knopf zurück: ein gedrückter Knopf über
einem toten Mikrofon ist eine Lüge.

Ein echtes Weckwort im Hintergrund braucht eine native App, siehe
`docs/ROADMAP.md`.

## Der Weg aus einem Siri Kurzbefehl

Zwei Versuche, beide gescheitert, bevor der dritte stand. Das gehört
aufgeschrieben, sonst baut sie jemand nochmal.

Der erste war `?sag=` in der Adresse. Im Betrieb wertlos: auf dem iPhone
öffnet eine Adresse immer Safari, nie die App vom Homebildschirm. Beide haben
getrennte Speicher, und die Daten des Nutzers liegen in der App. Der
Kurzbefehl landete also in einer leeren daevo.

Der zweite war die Zwischenablage plus die Aktion "App öffnen". Die führt
Webapps nicht auf, jedenfalls nicht auf dem Gerät dieses Nutzers. Damit fällt
der einzige Weg weg, eine installierte Webapp direkt zu starten.

Der dritte steht: das Postfach auf dem Push Worker, `workers/push/src/postfach.ts`.
Der Kurzbefehl schickt den Satz an `/postfach`, der Worker legt ihn ab und
schickt sofort eine Push Nachricht. Ein Tipp darauf öffnet die installierte
App, sie holt den Satz über `/postfach` und der Worker löscht ihn beim
Ausliefern. Push erreicht die installierte App, eine Adresse nicht: das ist
der ganze Trick.

Bewusst kein Datenabgleich. Auf dem Server liegt nur der eine Satz, höchstens
eine Stunde. Gewicht, Gespräche und Notizen über Therapie und Familie bleiben
auf dem Gerät. Ein Postfach hat ausserdem kein Konfliktproblem, es gibt nur
eine Richtung. Voller Abgleich bleibt danach möglich und wird durch das
Postfach nicht verbaut.

Das Anmeldewort ist Pflicht, auch wenn es beim Anmelden eines Abos optional
ist. Das Postfach ist der einzige Weg in diesem Worker, über den fremder Text
in die App gelangt, und die App verarbeitet ihn als Wort des Nutzers. Ohne
gesetztes Wort bleibt das Postfach ganz zu, statt offen zu stehen. Der
Kurzbefehl kommt nicht aus einem Browser und schickt keine Herkunft mit, CORS
greift dort also nicht.

Höchstens zehn offene Sätze. Ist es voll, wird abgewiesen statt der älteste
verworfen: ein stilles Verwerfen sieht aus wie ein verlorener Satz, und der
Nutzer sucht den Fehler bei sich. Ein zu langer Satz wird dagegen gekürzt,
denn da ist die Absicht klar.

Die Mitteilung trägt den Satz selbst und nicht nur "du hast etwas gesagt".
Damit sieht der Nutzer auf dem Sperrbildschirm, ob die Erkennung ihn
verstanden hat, bevor er die App öffnet.

Der Knopf "Aus Zwischenablage senden" bleibt aus dem zweiten Versuch, aber nur
für den Fall ohne Worker. Steht Adresse und Anmeldewort im Profil, kommt der
Satz über das Postfach, und dann bleibt der Knopf aus: ein zweiter Weg zum
selben Ziel, der bei jedem Öffnen über der Eingabe auftaucht, ist kein Angebot
mehr, sondern Störung.

`?sag=` bleibt ebenfalls, in Safari und auf dem Rechner funktioniert es.

## Das Mikrofon, das nur einmal ging

Auf iOS teilen sich Spracherkennung und `getUserMedia` dasselbe Mikrofon, und
die Erkennung verliert. Symptom: beim ersten Mal geht es, danach startet sie
stumm nicht mehr. Der Pegelmesser über die Web Audio API ist nur für die
Animation des Kreises da. Ein pulsierender Kreis ist keinen kaputten Knopf
wert, deshalb läuft auf iOS von vornherein die erzeugte Welle.

Dazu ein Wachhund. `recognition.start()` wirft nicht immer, wenn es nicht
klappt: der Aufruf geht durch und danach passiert schlicht nichts, kein
onstart, kein onerror, kein onend. Kommt nach 1800 Millisekunden kein onstart,
wird die Instanz weggeworfen und eine neue aufgesetzt. Nach dem vierten
stummen Versuch bekommt der Nutzer eine Meldung statt eines toten Knopfes. Ein
geglückter Start löscht die Bilanz, sonst summieren sich über eine lange
Freihandsitzung vier einzelne Ausrutscher zu einem Abbruch.

## Tagesränder

Eine feste Aufstehzeit im Profil setzt einen geregelten Alltag voraus. Dieser
Nutzer hat keinen. `packages/core/src/tagesrand.ts` kennt deshalb drei Ebenen,
fein schlägt grob: Standard, je Wochentag, einzelner Tag.

Die dritte Ebene ist der eigentliche Grund für das Modul. Bei echtem
Schichtdienst rotiert die Schicht, dann sagt der Wochentag nichts. Wer seine
Zeiten nur je Wochentag pflegen kann, pflegt sie nach zwei Wochen gar nicht mehr.

Im Onboarding wählt der Nutzer zwischen "Ähnlich jeden Tag", "Je nach
Wochentag" und "Wechselnd oder Schichtdienst". Die dritte Wahl legt keine
Tabelle an, sie setzt `wechselndeZeiten` und sagt dem Coach, dass die Zeiten im
Profil eine Schätzung sind und keine Zusage.

`tagesrandFuer(profile, tagIso)` ist die einzige Quelle für diese Zeiten. Wer
`profile.wakeTime` direkt liest, umgeht Wochentag und Ausnahmen und rechnet an
jedem abweichenden Tag falsch. Betroffen sind der Erinnerungsplan, die freie
Zeit im Tagesablauf und die Wachzeit als Nenner im Balance Board.

Die Wachzeit wird im Balance Board je Tag summiert, nicht einmal genommen und
mit der Anzahl Tage multipliziert. Bei wechselnden Zeiten unterscheiden sich die
Tage um Stunden.

Ausnahmen älter als 60 Tage werden beim Schreiben aufgeräumt. Ohne das wächst
die Liste unbegrenzt, und das Profil geht bei jeder Nachricht an das Modell.

Der Regelpfad erkennt "morgen um 5 aufstehen" ohne Modell. Erkannt wird nur, was
eindeutig ist: ein Tagesbezug und eine echte Uhrzeit. "Morgen früh" ist keine
Uhrzeit, und eine geratene Zeit verschiebt den ganzen Tagesplan.

## Der Rhythmus des Tages

Drei feste Punkte am Nachmittag, in `packages/core/src/reminders.ts`:

- 14:00 der Mittags Check-in. Energie, Konzentration, Sättigung, je 1 bis 10.
- 14:30 die Frage nach der grössten Herausforderung.
- 15:00 die Prioritäten für den Rest des Tages.

Getrennte Zeitpunkte, weil zwei Fragen in einer Nachricht keine von beiden
beantwortet bekommen. Obergrenze jetzt acht Erinnerungen am Tag statt sechs.

`packages/core/src/tagesrhythmus.ts` wertet den Mittags Check-in gegen die
zuletzt erfasste Mahlzeit aus. Die Reihenfolge der Prüfung ist Absicht: erst die
Menge, dann die Zusammensetzung. Eine Mahlzeit über 40 Prozent des Tagesziels
erklärt einen Einbruch besser als das Verhältnis der Makros. Die Antwort nennt
die Aenderung in Gramm, die konkreten Lebensmittel kommen aus
`mahlzeit_vorschlagen`, damit Nährwerte aus einer Quelle stammen.

Eingestuft wird nicht vom Nutzer, sondern vom Coach.
`packages/coach/src/einstufung.ts` schätzt Aufwand und Wichtigkeit und liest
eine Frist aus dem Text. Wer beim Eintragen eine Wichtigkeit auswählen muss,
wählt beim dritten Mal immer dieselbe, und eine Liste, in der alles wichtig
ist, ist keine Liste. Der Prompt deckelt deshalb: höchstens jede vierte
Aufgabe ist eine 3. Die Einstufung steht sichtbar an der Aufgabe, mit Grund,
und ein Tipp darauf schaltet sie weiter. Eine Einschätzung, die man nicht
korrigieren kann, ist eine Bevormundung.

`packages/core/src/aufgaben.ts` sortiert die offenen Aufgaben. Wichtigkeit zählt
bis 30 Punkte, die Frist bis 60. Damit gewinnt eine Frist heute gegen jede
Wichtigkeit. Was in die freie Zeit passt, kommt auf heute, der Rest sichtbar auf
morgen. Die freie Zeit kommt aus dem Kalender, über `restDesTages`.

Zur Arbeitsgrenze von zehn Stunden: die App misst kein Cortisol und behauptet
nicht, eine Grenze würde es senken. Sie ist eine Regel, damit ein Tag ein Ende
hat. Was nicht belegt ist, wird auch nicht behauptet.

## Der Tag mit Uhrzeiten, die Woche mit Fristen

`packages/core/src/zeitplan.ts` und `packages/core/src/wochenplan.ts`.

`priorisiere` sagt, was heute drankommt und was warten kann. Es sagt nicht,
wann. "Erst das Angebot, dann die Steuer" hilft wenig, wenn dazwischen drei
Kundentermine liegen und unklar ist, ob das Angebot vor zwölf überhaupt
reinpasst. `zeitplan` legt die Reihenfolge aus `priorisiere` in die freien
Blöcke des Kalenders: die wichtigste Aufgabe bekommt den frühesten Block, in
den sie ganz passt. Eine Aufgabe wird nicht zerteilt, neunzig Minuten
Konzentration in drei Stücken sind keine neunzig Minuten Konzentration. Was in
keinen Block passt, steht gesondert da und nicht hineingequetscht.

Zwischen zwei Aufgaben liegen zehn Minuten Luft. Regel, keine Messung: ohne
Luft hält ein Plan bis zur ersten Aufgabe, die länger dauert als geschätzt.

`lueckenOhne` nimmt aus den freien Blöcken, was der Kalender nicht kennt: das
Training aus dem Profil und eine halbe Stunde je empfohlener Mahlzeit. Sonst
legt der Plan das Angebot auf die Zeit des Krafttrainings, und ein solcher
Plan wird nicht befolgt, sondern ignoriert.

Der Wochenplan verteilt die offenen Aufgaben auf sieben Tage, mit derselben
Rangfolge, `aufgabenRang` ist dafür exportiert. Zwei Rechnungen würden
irgendwann verschieden sortieren. Verplant werden höchstens zwei Drittel der
freien Zeit je Tag, `PLANUNGSQUOTE`. Freie Zeit im Kalender ist nicht leer,
dort wird gegessen, gefahren und trainiert, und ein Wochenplan, der jede
Minute füllt, ist am Dienstag überholt.

Eine Aufgabe mit Frist landet nie hinter ihrer Frist. Passt sie davor nirgends
hinein, steht sie in der ersten Zeile der Antwort. Das ist die wichtigste
Aussage des ganzen Plans und gehört nicht an einen Tag, an dem es schon zu
spät ist.

Der Regelpfad für "was muss ich heute machen" und "Tagesplanung" steht vor dem
Kalender Zweig. Vorher landete "Tagesplanung" über das Wort "tagesplan" bei
der Kalenderübersicht, und die kennt nur Termine und keine Aufgaben.
"Wochenplan" ging aus demselben Grund an den Kalender.

Das Morgenbriefing benutzt jetzt den Plan mit Uhrzeiten.

## Todoist

`packages/coach/src/todoist.ts` ruft ab, `apps/pwa/js/assistant.js` führt
zusammen, das Feld steht auf der Kalenderseite.

Wer seine Aufgaben in Todoist führt, pflegt sie nicht zweimal. Eine zweite
Liste neben der echten ist nach einer Woche veraltet, und dann plant der Coach
mit dem falschen Stand. daevo liest deshalb dort, wo die Aufgaben stehen, und
hakt sie dort ab.

Todoist erlaubt Aufrufe direkt aus dem Browser. Gemessen am Vorabruf: die
Antwort trägt `access-control-allow-origin` mit der anfragenden Adresse. Damit
braucht es keinen Server, und der Token des Nutzers verlässt sein Gerät nicht.
Angemeldet wird mit dem persönlichen Token, Schnittstelle v1.

Gelesen wird vor jeder Planung, wenn der letzte Stand älter als fünf Minuten
ist. Scheitert das, rechnet der Plan mit dem letzten Stand und sagt, von wann
er ist. Ein abgelehnter Token wird beim Verbinden gar nicht erst gespeichert:
sonst steht "verbunden" im Profil, und jede Planung scheitert still an
derselben Stelle.

Priorität: Todoist zählt 4 für P1. P1 und P2 werden wichtig, P3 und ohne
Priorität normal. Ohne Priorität ist eine Aufgabe nicht nebensächlich, sondern
nicht bewertet. Frist: `deadline` schlägt `due`. Dauer: nur Minuten, eine Dauer
in Tagen sagt nichts über die Arbeitszeit. Fehlt sie, rechnet der Plan mit 30
Minuten, setzt `dauerAngenommen` und sagt das in jeder Antwort dazu. Für die
30 gibt es keine Quelle, deshalb wird sie nie stillschweigend benutzt.

Abhaken geht erst an Todoist und dann an den lokalen Stand. Andersherum stünde
eine Aufgabe bei einem Netzfehler hier als erledigt und dort offen, und beim
nächsten Lesen käme sie zurück, ohne dass jemand weiss, warum.

In der Liste auf "Dein Tag" tragen Todoist Aufgaben "aus Todoist", keinen
Löschknopf und keine umschaltbare Einstufung. Löschen auf einen Tipp wäre ein
Eingriff in eine fremde Liste. Eine umgestufte Priorität wäre beim nächsten
Lesen wieder weg, und ein Knopf, dessen Wirkung verschwindet, ist schlimmer
als keiner. Vorher hätte "Erledigt" bei einer Todoist Aufgabe still nichts
getan und trotzdem "Abgehakt" gemeldet. Gefunden beim Lesen der Liste, bevor
es live ging.

Offen sind Microsoft To Do und Google Tasks. Beide brauchen eine eigene
App Registrierung beim Anbieter und OAuth, das kann nur der Betreiber
anlegen. Apple Erinnerungen hat keine Schnittstelle für Web Apps.

## Training nach Tagesform

`packages/core/src/trainingsanpassung.ts`, Werkzeug `training_anpassen`.

Ein Plan wird geschrieben, wenn man ausgeschlafen ist. Trainiert wird an dem
Tag, den man dann hat. Drei Signale zählen: Schlaf unter sechs Stunden oder
Qualität bis 4 von 10, Stress ab 65 von 100, und die Bereitschaft auf
"runterfahren". Die Bereitschaft zählt nur, wenn keines der anderen beiden
schon zählt, sonst stünde derselbe schlechte Schlaf zweimal in der Rechnung.

Ein Signal heisst reduziert: Sätze auf 75 Prozent, eine Wiederholung mehr in
Reserve. Zwei heissen leicht: Sätze auf die Hälfte, zwei mehr in Reserve, und
der Satz, dass eine Pause ebenfalls vertretbar ist. Gesteuert wird über
Wiederholungen in Reserve, weil die App kein Gewicht vorschreiben kann, das sie
nicht kennt.

Die Quellen stützen die Richtung, nicht die genauen Zahlen, und das steht bei
jeder Anpassung im Text. Schlaf: Craven und andere, Sports Medicine 2022,
Meta-Analyse über 69 Arbeiten, Leistung sinkt nach höchstens sechs Stunden
Schlaf. Stress: Stults-Kolehmainen und Bartholomew, Medicine and Science in
Sports and Exercise 2012, langsamere Erholung nach Krafttraining. Reserve:
Zourdos und andere 2016, Helms und andere 2016.

Der volle Tag ist eine andere Achse. Er kürzt die Dauer, nicht die
Intensität, mit fünfzehn Minuten für Weg und Umziehen. Unter zwanzig Minuten
gibt es keine Einheit, sondern zehn Minuten Mobilität als Angebot.

Was der Nutzer im Gespräch sagt, kommt als Ja oder Nein hinein, nicht als
Zahl. "Schlecht geschlafen" ist keine 3 von 10, und eine erfundene Zahl stünde
später im Verlauf wie eine Angabe. Die geplante Einheit kommt aus dem Profil:
ein Kalendertermin sagt, wann trainiert wird, aber nicht was.

Der Regelpfad steht vor dem Eintragen von Training und Mahlzeit. "Ich hatte
eine kurze Nacht, soll ich heute trainieren" enthält "hatte" und landete sonst
beim Erfassen einer Mahlzeit.

## Kopf leeren

`packages/coach/src/kopf.ts` nimmt einen ungeordneten Schwall und sortiert ihn
in vier Schubladen: Aufgabe, Entscheidung, Sorge, nicht beeinflussbar. Die
Trennung ist der eigentliche Wert. Was im Kopf gleich schwer wiegt, ist es auf
Papier nicht. Eine Sorge auf einer Aufgabenliste erzeugt schlechtes Gewissen
und sonst nichts, also kommt sie ins Gedächtnis und nicht in die Liste.

Im Zweifel wird in Sorge einsortiert, nicht in Aufgabe. Höchstens zwölf
Aufgaben, weil eine längere Liste den Zustand verschlimmert, den sie lösen
soll. Genau eine Sache steht als erster Schritt da.

Die Aufgaben werden sofort angelegt und durch `priorisiere` geschickt. Eine
Ordnung, die nur auf dem Bildschirm steht, ist am nächsten Tag wieder weg.

Im Chat gibt es dafür einen eigenen Knopf neben dem Mikrofon. Er hört mit
sechs Sekunden Pausentoleranz statt gut zwei und bis zu fünf Minuten statt
zwei. Beim Rausreden ist eine Denkpause kein Satzende, und wer dort abschickt,
zerlegt einen Gedanken in fünf Nachrichten.

Eine Nachricht über sechzig Wörter geht in `denktiefe` auf `planung`, also Opus
und höchste Stufe. Psyche behält Vorrang: wer von Scham redet und eine
Aufgabenliste bekommt, macht die App nie wieder auf. Sortieren kann der Coach
auch von dort, das Werkzeug steht in jedem Modus zur Verfügung.

Der Regelpfad in `regelKopf` versteht nichts, er sortiert nur nach
Wortgruppen. Das steht auch in der Antwort. Die Trennung von Aufgabe und Sorge
ist der halbe Nutzen, und dafür braucht es kein Modell.

## Das Life Balance Board

`packages/core/src/balance.ts` misst fünf Bereiche: Karriere, Fitness,
Wellbeing, Me Time, Familie und Beziehung. Die Minuten kommen aus drei Quellen:
Kalendertitel, eingetragene Trainings und Zeit, die der Coach über
`zeit_eintragen` gebucht hat, weil der Nutzer sie erzählt hat. Dazu die Dauer
erledigter Aufgaben. Nichts wird geschätzt.

Der Kalender dieses Nutzers enthält fast nur Kundentermine. Ohne die dritte
Quelle behauptet das Board, er hätte ausser arbeiten nichts getan. Deshalb
hängt die Sperre am gemessenen Minutenstand und nicht mehr daran, ob ein
Kalender verbunden ist.

Die Wortlisten je Bereich sind kurz und eindeutig. Ein Wort, das in zwei
Bereichen vorkommen könnte, gehört in keinen: eine falsche Zuordnung ist
schlimmer als eine fehlende, weil sie eine Zahl erzeugt, der man glaubt.
"Athletiktraining" ist Arbeit, "Krafttraining" nicht.

Gesucht wird auf Wortgrenzen, nicht als Teilzeichenkette. Das Muster "pt " mit
Leerzeichen fand "Alina Pt" am Zeilenende nie, und damit fiel ein Drittel der
echten Kundentermine durch. `trainingsplanAusKalender` benutzt dieselbe
Zuordnung: was nicht in den Bereich Fitness fällt, ist kein eigenes Training.
Ohne das schlägt die App einem Personal Trainer seine Kundenstunden als
eigenen Trainingsplan vor. Zeit, die nirgends passt, wird als nicht zugeordnet
ausgewiesen und zählt nirgends mit.

Es gibt zwei Prozentzahlen, und sie beantworten verschiedene Fragen. Der Anteil
am Tag misst gegen die Wachzeit aus dem Profil: alle fünf Bereiche plus die
nicht verplante Zeit ergeben zusammen genau eins. Das ist die Zahl auf dem Ring.
Der Anteil am Ziel misst gegen das Wochenziel, wird nicht gedeckelt und steht
als Text unter der Kachel. 349 Prozent eines Fitnessziels sagen nichts darüber,
wie ein Tag aufgeteilt war, 16 Prozent des Tages schon.

`balanceEmpfehlung` sucht den Bereich, der gemessen am eigenen Ziel am
weitesten zurückliegt, und macht daraus einen Termin mit Uhrzeit aus dem
nächsten freien Block. Karriere bleibt dabei aussen vor: Arbeit fällt selten
aus, und überzogene Arbeitszeit wird stattdessen als Grund genannt, weil dort
die fehlende Zeit hingegangen ist.

`tagesnutzung` verdichtet vier Teile zu einer Zahl: Balance 40 Prozent,
Aufgaben 25, Mindeststandards 20, Ernährung 15. Die Gewichtung ist eine
Produktentscheidung und steht deshalb sichtbar im Code. Balance wiegt am
meisten, weil ein Tag aus reiner Arbeit auch dann kein guter Tag ist, wenn
jede Aufgabe erledigt wurde.

Ein Teil ohne Datenlage wird nicht mit null bewertet, sondern fällt raus, und
die übrigen Gewichte werden hochgerechnet. Sonst misst die Zahl Datenlage
statt Verhalten.

Der Verlauf im Hintergrund liegt auf `.view`, also auf allen Ansichten, damit
die App nicht in eine schöne Seite und mehrere graue zerfällt. Auf dem
Assistenten liegt er kräftiger, weil dort nichts anderes um Aufmerksamkeit
konkurriert.

Die Ringe liegen in `apps/pwa/js/rings.js` und sind SVG, nicht Canvas. Es sind
ein paar Dutzend Kreise, kein Partikelfeld wie beim Orb. `wertungsRing` ist der
grosse Ring mit Etikett, Zahl und Urteil, `metrikRing` die kleine Kennzahl mit
Richtungspfeil gegen gestern. Beides steht oben auf der Tagesansicht.

## Den Rest des Tages aufteilen

`packages/core/src/verteilung.ts`. Bisher schlug die App eine Mahlzeit für das
gesamte Restbudget vor. Wer um 15 Uhr fragt und noch 1400 Kalorien offen hat,
bekommt damit einen Vorschlag über 1400 Kalorien, obwohl er danach noch zweimal
isst. Der eigentliche Wert liegt in der Aufteilung, nicht im Rezept.

Erst rechnen, dann fragen. Die Aufteilung steht fest, bevor das Modell etwas
sieht. Das Modell füllt sie mit Lebensmitteln, es entscheidet nicht über die
Zahlen. Sonst kommen drei Vorschläge zurück, die einzeln plausibel sind und
zusammen 600 Kalorien über dem Ziel liegen.

Kalorien folgen der Gewichtung je Mahlzeit, Protein wird gleichmässiger
verteilt: genau die Hälfte des Weges zwischen Kaloriengewichtung und
Gleichverteilung. Der Grund ist praktisch, nicht medizinisch. Ein Snack mit 12
Prozent der Kalorien und 12 Prozent des Proteins wäre ein Keks, und der bringt
niemanden an sein Proteinziel. Ein Quark mit 30 Gramm Protein passt in dieselben
Kalorien.

Drei Hinweise, die die App von sich aus gibt: eine Mahlzeit unter 200 Kalorien
bei mehreren geplanten, eine über 1200 Kalorien, und über 60 Gramm Protein in
einer Portion. Alle drei heissen dasselbe: die Planung passt nicht zur Menge.
Das gehört gesagt und nicht in einem Vorschlag versteckt.

Der Vorrat steht direkt in diesem Bereich und wird beim Verlassen des Feldes
gespeichert, nicht auf Knopfdruck. Ein eigener Speichern-Knopf neben einem
Textfeld ist eine Falle: wer tippt und dann auf "Vorschläge holen" drückt, hat
nicht gespeichert, und die App rechnet mit dem Stand von gestern, ohne es zu
sagen. Ist der Vorrat leer, sagt die App das und fragt danach, statt allgemeine
Vorschläge als konkrete auszugeben.

Antworten mit Zeilenumbrüchen behalten sie, `.feedback` steht auf
`white-space: pre-line`. Ohne das wird aus einer Aufteilung auf drei Mahlzeiten
eine Textwand, und der Umbruch ist hier die Information.

Welche Mahlzeit schon gegessen wurde, erkennt `gegesseneArten` an der Uhrzeit
des Eintrags, nicht an seinem Text. Wer um 13 Uhr etwas einträgt, hat Mittag
gegessen, egal wie er es nennt. Ein zweiter Eintrag im selben Fenster gilt als
dieselbe Mahlzeit: wer nachlegt, isst nicht zweimal zu Mittag.

## Ein Weg ins Erfassen statt vier

Auf der Essen Seite standen Diktieren, Foto, Barcode und Erfassen als vier
gleich aussehende Knöpfe in einer Reihe. Vier gleichwertige Knöpfe sind keine
Wahl, sondern eine Aufgabe: man muss jedes Mal alle vier lesen, um einen zu
drücken.

Jetzt steht dort ein Knopf mit einem Plus und den vier Wegen darunter im
Blatt. Das Plus ist gebaut und kein Schriftzeichen: zwei Balken mit runden
Enden, dieselbe Rundung wie am d der Wortmarke. Ein Plus aus dem Zeichensatz
sitzt je nach Schrift anders in der Zeile und ist nie genau mittig.

Die Reihenfolge ist nach Aufwand sortiert, nicht nach Technik. Foto ist ein
Griff, Sprechen zwei, Barcode drei, Suchen am meisten. Wer die Liste von oben
liest, findet den schnellsten Weg zuerst.

Zeilen mit Trennlinien statt Kacheln mit Rahmen. Vier gerahmte Flächen
untereinander lesen sich als Liste von Behältern, nicht als Wahl. Die Zeichen
sind gezeichnet und keine Emoji: die sehen auf jedem Gerät anders aus und
tragen eine fremde Farbigkeit in die Palette. Nur der Kreis um das Plus trägt
die Markenfarbe, die Kachel selbst nicht, sonst zieht der Knopf mehr
Aufmerksamkeit als die Zahlen darüber.

Das Blatt liegt ausserhalb der Ansichten, wie der Mahlzeit Editor. Deshalb
steht derselbe Knopf auch auf Heute, direkt unter dem Kalorienring: wer sieht,
wie viel noch offen ist, will als Nächstes etwas eintragen und nicht erst ins
Menue. Ein Blatt, zwei Knöpfe, kein zweites Menü.

Welcher Knopf geöffnet hat, zählt trotzdem. Er trägt danach den Fortschritt,
während ein Bild ausgewertet wird, sonst blinkt die Anzeige auf einer Seite,
die man gerade nicht ansieht.

Tippen und Sprechen brauchen das Textfeld, und das steht auf der Essen Seite.
Wer von Heute aus kommt, wird erst dorthin gebracht. Ein Feld, das in einer
versteckten Ansicht den Fokus bekommt, tut sichtbar nichts, und der Nutzer
hält den Knopf für kaputt.

`zeigeFeedback` prüft ausserdem, ob sein Feld in einer versteckten Ansicht
liegt, und schickt den ersten Satz dann als kurze Meldung. Ein Ergebnis auf
einer Seite, die man nicht ansieht, ist kein Ergebnis.

Der zweite Barcode Scanner auf der Essen Seite ist ersatzlos weg. Der Editor
konnte dasselbe und landet dort, wo sich die Menge danach noch ändern lässt.
Zwei Scanner für eine Aufgabe sind zwei Stellen, an denen derselbe Fehler
auftreten kann.

`mahlzeitNeu` legt eine leere Mahlzeit an und öffnet den Editor darauf. Der
konnte Suche, Barcode und Handeingabe, kam aber nur an eine bestehende
Mahlzeit heran: der beste Weg war der einzige, den man nicht von vorn beginnen
konnte. Wird der Editor mit leerer Liste geschlossen, verschwindet die
Mahlzeit wieder. Wer abbricht, darf keine Zeile mit null Kalorien im Verlauf
zurücklassen.

## Kennungen, die es nicht mehr gibt

`build:pwa` prüft, dass jedes `$("...")` in `apps/pwa/js` eine Kennung
anspricht, die im HTML wirklich steht.

Der Anlass: beim Umbau der Essen Seite verschwand ein Knopf aus der
Oberfläche, sein Listener blieb stehen. `node --check` fand nichts, denn
`$("btnFotoEssen")` ist einwandfreies JavaScript. Im Browser warf
`addEventListener` auf `null`, das Modul brach ab, und die App blieb schwarz.
Gefunden hat das erst der Durchlauf im Browser.

Geprüft wird nur der Aufruf mit fester Zeichenkette. Was aus einer Variablen
kommt, lässt sich ohne Ausführen nicht auflösen, und eine Prüfung, die dort
rät, meldet Fehler, die keine sind.

## Eine Mahlzeit nachträglich ändern

`packages/core/src/portion.ts` rechnet, der Editor steht in `apps/pwa`.

Bisher war eine erfasste Mahlzeit endgültig. Wer sich vertippt hatte oder eine
Schätzung des Modells nachschärfen wollte, musste den ganzen Eintrag löschen
und alles neu sagen. Beim Tracken ist das Korrigieren der häufigste Handgriff
überhaupt, und eine App, in der er fehlt, wird nach zwei Wochen nicht mehr
benutzt.

Ein `FoodEntry` trägt absolute Nährwerte für seine Menge, keine Werte je 100
Gramm. Skaliert wird deshalb über das Verhältnis der Mengen, und das ist
exakt: 300 Gramm Reis haben genau das Anderthalbfache von 200 Gramm. Der
Vorteil ist, dass auch jeder alte Eintrag skalierbar ist, ohne dass eine Basis
nachgetragen werden müsste.

`mengeLesen` nimmt auch Angaben ohne Einheit. Das Modell schreibt "2 Eier"
oder "1 Portion", und auch die lassen sich verdoppeln, denn es geht nur um das
Verhältnis. Fehlt jede Zahl, steht die Menge als Text da statt als Feld: ein
Feld, das nichts bewirkt, ist schlimmer als keins.

Gerundet wird erst am Ende und je Wert einzeln. Wer zwischendrin rundet,
sammelt über fünf Posten ein paar Kalorien ein, und dann stimmt die Summe der
Zeilen nicht mit der Gesamtsumme überein. Das fällt beim Nachrechnen sofort
auf und kostet Vertrauen.

Der Editor ist ein Blatt von unten, keine eigene Ansicht. Wer eine Menge
korrigiert, will danach wieder da sein, wo er war. Gearbeitet wird auf einer
Kopie, erst Speichern schreibt in den Tag: wer herumprobiert und abbricht,
hätte sonst seinen Tag schon geändert.

Beim Ändern einer Menge wird nur die betroffene Zeile neu geschrieben, nicht
die ganze Liste. Ein Neuaufbau nimmt dem Nutzer mitten im Tippen den Fokus aus
dem Feld.

Drei Wege, etwas hinzuzufügen: Suche über Open Food Facts, Barcode über
`BarcodeDetector`, und von Hand mit Werten je 100 Gramm. Der dritte ist kein
Notnagel. Was die Datenbank nicht kennt, kennt sie auch beim zehnten Versuch
nicht, und ohne diesen Weg bleibt der Eintrag aus.

Eine gespeicherte Mahlzeit trägt danach `korrigiert`. Eine von Hand geänderte
Mahlzeit ist keine Schätzung des Modells mehr, und der Coach soll sie nicht
nochmal in Frage stellen.

Eine Mahlzeit ohne Posten wird beim Speichern gelöscht. Eine Zeile mit null
Kalorien im Verlauf zu führen wäre die schlechtere Antwort.

## Ein Vorhaben ist kein Eintrag

`istAbsicht` in `packages/coach/src/agent.ts`. Der Satz "ich möchte heute zwei
gute Mahlzeiten essen" hat im Regelpfad einen ganzen Tagesplan als Mahlzeit
erfasst. Das Wort "esse" steckt in "essen", und damit greift die Erfassung auf
einem Satz, in dem niemand etwas gegessen hat.

Geprüft wird auf Absichtswörter und gleichzeitig auf das Fehlen einer
Vergangenheitsform. Wer schreibt "ich möchte wissen, was ich gegessen habe",
meint die Vergangenheit, obwohl "möchte" darin steht. Ein Absichtswort allein
reicht deshalb nicht.

Der Text läuft durch `foldUmlauts`, wie überall sonst im Regelpfad. `pattern`
faltet seine Wörter, also muss die andere Seite mitgefaltet sein, sonst trifft
"möchte" nie.

## Was der Coach zurückfragt, wenn nichts aufging

`naechsteFrage` in `packages/coach/src/skills.ts` trennt zwei Lagen, die
vorher denselben Satz bekommen haben.

Teilweise erkannt heisst: nach den fehlenden Mengen fragen. Der Nutzer wollte
etwas eintragen, es fehlt nur eine Zahl.

Gar nichts erkannt heisst fast immer: das war keine Mahlzeit. Die Rückfrage
"Wie viel war das ungefähr" auf einen Tagesplan zurückzuwerfen sieht aus, als
hätte die App nicht zugehört, und genau das ist im Betrieb passiert.

Dasselbe gilt beim gescheiterten Modellaufruf. Der Regelweg kommt nur dann mit
in die Antwort, wenn er wirklich etwas getan hat, also `ausgeführt` nicht leer
ist. Hat er nur allgemeinen Text erzeugt, steht allein die Fehlermeldung da.
Eine Antwort, die wie eine Antwort aussieht und keine ist, über einer Meldung
"ich komme nicht ins Netz", ist schlimmer als die Meldung allein.

## Doppelt eingetragenes Essen

`packages/core/src/doppelt.ts`. Der Anlass ist ein echter Tag. Um 15:58 waren
Mousse und Whey eingetragen, um 15:59 eine Mahlzeit aus fünf Posten, und
direkt danach eine Mahlzeit, die alles davon nochmal enthielt. Am Ende standen
5172 statt rund 1700 Kalorien da. Der Nutzer hat das nicht zweimal gesagt.

Die Ursache liegt beim Modell. Es sieht die Zahlen des Tages im Kontext und
schickt beim nächsten Eintrag die ganze bisherige Liste erneut mit, weil es
"was ich heute gegessen habe" als eine Mahlzeit versteht.

Die Werkzeugbeschreibung sagt das jetzt ausdrücklich, aber darauf allein darf
sich nichts verlassen. Ein Prompt hilft, bis er einmal nicht greift, und dann
rechnet die App einen ganzen Tag falsch. Deshalb der Riegel im Code: was
innerhalb von zwei Stunden schon dasteht, kommt nicht nochmal rein.

Zwei Stunden, weil derselbe Artikel in derselben Menge innerhalb dieser Zeit
fast immer ein Wiederholungsfehler ist. Darüber wird es normal: Magerquark
morgens und abends ist bei diesem Nutzer der Regelfall, und ein Filter, der
das verschluckt, wäre schlimmer als das Problem.

Verglichen wird über Name und Menge, nicht über die Kalorien. Dieselbe Speise
kommt je nach Quelle mit 148 oder 150 kcal zurück, und ein Vergleich auf die
Zahl würde genau dann durchfallen, wenn er gebraucht wird. In der Menge fallen
Leerzeichen ganz weg, denn "100 g" und "100g" wechseln zwischen zwei Antworten.

Verworfenes steht in der Antwort und ganz vorn. Ein stiller Filter, der Essen
verschluckt, ist derselbe Fehler nochmal, nur in die andere Richtung, und eine
Korrektur am Ende einer Antwort wird überlesen. Wer wirklich zweimal dasselbe
gegessen hat, sagt es und bekommt es nachgetragen.

"Gekochter Reis" und "Reis, gekocht" erkennt der Vergleich nicht als gleich.
Die Lücke bleibt bewusst offen: eine Ähnlichkeitssuche würde irgendwann zwei
wirklich verschiedene Speisen zusammenwerfen, und eine erfundene Gleichheit
ist schlimmer als eine übersehene.

## Der unmögliche Tag

`packages/core/src/plausibel.ts`. Der Riegel gegen doppelte Posten verhindert
den Fehler, den wir kennen. Er verhindert nicht den nächsten. Eine falsch
geschätzte Menge, eine falsch gelesene Etikettenspalte oder ein Rechenfehler
des Modells erzeugen denselben Schaden über einen anderen Weg. Deshalb prüft
diese Ebene nicht die Herkunft einer Zahl, sondern das Ergebnis.

Zwei Stufen, und die Trennung ist der ganze Punkt. Hart heisst, der Wert kann
so nicht stimmen. Über 9,4 Kalorien je Gramm geht kein Lebensmittel, denn
reines Fett liefert 9, Protein und Kohlenhydrate je 4, Faktoren nach
Verordnung (EU) Nr. 1169/2011, Anhang XIV. Die Schwelle liegt bei 9,4 und
nicht bei 9,0, weil Öl mit 900 Kalorien je 100 Gramm genau auf der Grenze
deklariert wird und eine Rundung keinen Fehlalarm auslösen darf. Ebenso hart:
Protein, Fett und Kohlenhydrate zusammen wiegen mehr als der Posten selbst.

Auffällig heisst, der Wert ist möglich und fast immer trotzdem ein Fehler:
mehr als das Doppelte des Tagesziels, über dem Ziel obwohl noch vier Stunden
Wachzeit übrig sind, über vier Gramm Protein je Kilo Körpergewicht, über sechs
Liter Wasser. Beides in einen Topf zu werfen würde die harte Aussage
entwerten: wer dreimal auffällig überliest, überliest beim vierten Mal auch
das, was wirklich falsch ist.

Eine Menge ohne Gewichtsangabe wird nicht geprüft. "2 Eier" sagt über die
Masse nichts, und ein geratener Umrechnungsfaktor würde einen Befund erfinden.

Korrigiert wird nichts. Die App kann nicht wissen, ob jemand sich vertippt hat
oder wirklich so gegessen hat. Fällt nichts auf, steht auch nichts da: eine
Bestätigung nach jeder Mahlzeit wäre Lärm, und Lärm überliest man mitsamt dem,
was darin steht.

`eintrag_zuruecknehmen` ist die Antwort auf denselben Tag von der anderen
Seite. Wer den Fehler im Gespräch bemerkt, musste bisher ins Menue, in die
Ernährungsansicht und den Eintrag dort suchen. Zurückgenommen wird immer genau
ein Eintrag und immer der jüngste, der passt: ein Werkzeug, das auf einen Satz
hin mehrere Einträge entfernt, macht denselben Schaden wie das doppelte
Erfassen, nur in die andere Richtung. Was weg ist, steht mit seinen Zahlen in
der Antwort, damit es sich in einem Satz wieder eintragen lässt.

Der Regelpfad dafür steht vor allem, was einträgt. "Das hab ich nicht
gegessen" enthält "gegessen" und landete sonst auf dem Erfassen, also genau
auf dem Gegenteil dessen, was gemeint war. Erkannt wird nur ein Verb der
Rücknahme zusammen mit einem Wort für den Gegenstand: "Das stimmt nicht" über
eine Aussage des Coaches darf keinen Eintrag löschen.

Wasser ist der Sonderfall. Gespeichert wird nur die Summe des Tages, nicht der
einzelne Schluck. Die Rücknahme setzt deshalb auf null und sagt das, statt so
zu tun, als hätte sie ein Glas entfernt.

## Erkennen ohne Beheben ist gar nichts

Ein Abend im Betrieb, und der wichtigste Fall bisher. Statt eines Rippchens
stand eine ganze Tafel Milka im Tag, das Fett lag bei 167 Gramm gegen ein Ziel
von 69. Der Coach hat den Fehler erkannt, richtig benannt, den echten Tag
korrekt hochgerechnet und dann geschrieben, er könne ihn nicht rückgängig
machen. Die falschen Zahlen blieben stehen.

Das ist die schlechteste mögliche Antwort. Sie kostet Vertrauen doppelt: die
App weiss, dass sie falsch liegt, und tut nichts. Wer das zweimal erlebt, hört
auf zu tracken.

Zwei Lücken steckten dahinter.

Die erste war das fehlende Werkzeug. `mahlzeit_korrigieren` ändert die Menge
eines eingetragenen Postens und rechnet über `mengeSetzen` mit. Löschen allein
hätte nicht gereicht: wer ein Rippchen gegessen hat, hat nicht nichts
gegessen. Löschen und neu eintragen sind zwei Schritte für eine Absicht, und
den zweiten hätte der Coach ohne Nachfrage sowieso nicht gekonnt.

Der Posten wird im Regelweg nicht geraten. Weitergegeben wird der ganze Satz,
und die App gleicht ihn gegen die Namen ab, die wirklich im Tag stehen. Ein
erster Entwurf nahm das erste grossgeschriebene Wort als Substantiv, und in
"das war nur ein Rippchen Milka" ist das Rippchen. Der Durchlauf im Browser
hat genau das gefunden, kein Test davor. `trifftPosten` gleicht deshalb in
beide Richtungen ab: das Modell schickt "Milka", der Regelweg den ganzen Satz.
Verglichen wird auf ganze Wörter ab drei Zeichen, denn "Ei" steckt in
"Eintrag".

Die zweite Lücke war die Haltung. Die Persona sagt jetzt ausdrücklich, dass
ein erkannter Fehler behoben und nicht beschrieben wird, und dass ein Satz wie
"das kann ich nicht rückgängig machen" falsch ist. Kennt der Coach die
richtige Menge nicht, fragt er danach und korrigiert mit der Antwort. Eine
Frage ist die Vorbereitung der Korrektur, nicht ihr Ersatz.

Die Plausibilitätsprüfung hätte diesen Tag nicht gemeldet, denn die Kalorien
lagen im Rahmen. Ein einzelner Makro sprengt sein Ziel leichter als der ganze
Tag: ein falsch eingetragenes fettes Lebensmittel verdreifacht das Fett,
während die Kalorien noch normal aussehen. Deshalb fällt jetzt auch auf, wenn
Fett oder Kohlenhydrate über dem Doppelten ihres Ziels stehen.

Jeder Befund nennt ausserdem den Ausweg: die richtige Menge sagen oder
bestätigen, dass es stimmt. Ein Befund ohne Ausweg ist eine Beschwerde, und
der Nutzer sitzt danach weiter mit falschen Zahlen da.

## Das Gewicht gehört ins Profil

`gewichtEintragen` schrieb die Wiegung nur in den Tag. Grundumsatz, Protein,
Fett und Wasserziel rechnen aber alle gegen `profile.weightKg`, siehe
`packages/core/src/energy.ts`. Wer sich ein halbes Jahr lang gewogen hat,
bekam weiterhin die Ziele aus dem Anamnesebogen. Jetzt geht die Wiegung in
beides. Ein Wert unter 30 oder über 300 Kilo lässt das Profil in Ruhe: ein
Tippfehler darf die Ziele nicht kippen.

## Der Regelweg ist die kostenlose Stufe

37 der 44 Werkzeuge haben einen Regelpfad in `packages/coach/src/agent.ts`.
Das ist keine Notlösung für den Ausfall, sondern das Produkt: ein Weg, der
kein Modell anfragt, kostet nichts je Nutzer und skaliert ohne Rechnung.

Die Lücken waren schlecht verteilt. Eine Aufgabe liess sich ohne Schlüssel
anlegen, aber nicht abhaken. Das Gewicht ging rein, das Training nicht,
obwohl dieser Nutzer fünf bis sechs Mal die Woche trainiert. Der Mittags
Check-in kam täglich um 14:00 als Erinnerung und brauchte für die Antwort ein
Modell.

Die Reihenfolge der Zweige trägt die Bedeutung. Training steht vor der
Mahlzeit, weil "nach dem Training hatte ich einen Shake" beides enthält und
sonst nur der Shake ankommt. Abhaken steht vor Anlegen, weil "Angebot
geschrieben, erledigt" sonst dieselbe Aufgabe ein zweites Mal erzeugt.
Rücknahme steht vor allem, was einträgt.

Ohne erkannte Dauer wird kein Training eingetragen. Die Dauer geht in das
Balance Board und in den Wasserbedarf, und eine geratene Stunde verschiebt
beides. Lieber kein Eintrag als ein erfundener.

"Athletiktraining" ist Arbeit und kein eigenes Training, dieselbe Trennung wie
in `packages/core/src/balance.ts`. Wer seine Kundenstunden als eigene
Einheiten gezählt bekommt, hat eine Statistik, die ihn anlügt.

Beim Mittags Check-in gilt: genau drei Zahlen, sonst nichts. Bei zwei oder
vier ist die Zuordnung geraten, und ein geratener Wert steht im Verlauf später
wie eine echte Antwort. Beschriftete Zahlen schlagen die Reihenfolge, denn wer
"Energie 7, Sättigung 4" schreibt, meint nicht Konzentration 4. Steht viel
Text um die Zahlen herum, greift der Zweig nicht: "ich hab 7 von 10 Stunden
geschlafen und 2 Kaffee getrunken" ist kein Bogen.

Offen bleiben sieben. Die beiden Fotowerkzeuge brauchen ein Modell, daran
ändert kein Regelpfad etwas. `standard_setzen`, `standard_bestaetigen` und
`gespraech_einordnen` brauchen eine Kennung aus dem Zusammenhang, die ein
Wortmuster nicht kennt. `profil_aendern` und `einkaufsliste_abhaken` sind
machbar und stehen aus.

## Nährwerte von Markenprodukten

`packages/core/src/produkt.ts` rechnet und prüft, `packages/coach/src/off.ts`
ruft ab. Quelle ist Open Food Facts. Der Dienst setzt
`access-control-allow-origin: *`, deshalb läuft der Abruf direkt im Browser,
ohne Server und ohne Abhängigkeit.

Zwei Wege mit sehr unterschiedlicher Güte. Der Barcode über `/api/v2/product`
trifft genau und ist stabil. Die Textsuche über `/cgi/search.pl` antwortet unter
Last mit 503 und einer HTML Seite, deshalb ein zweiter Versuch und eine Prüfung
auf den Inhaltstyp. Ohne die zweite Prüfung wirft das Auslesen, und der Nutzer
sieht einen Fehler statt eines leeren Ergebnisses.

Gelesen wird ausschliesslich `_100g`. Open Food Facts liefert je Nährwert bis zu
fünf Felder, und `proteins_serving` steht beim Grießpudding auf 34,2 gegen 57 je
100 Gramm. Wer das falsche Feld liest, rechnet jede Menge falsch.

Die Makrorechnung ist die Kontrolle, nicht die Wahrheit. Auf dem Etikett steht
der Wert des Herstellers, und der zählt Ballaststoffe mit 2 kcal je Gramm statt
mit 4. Beim Grießpudding sind das 346 deklariert gegen 336 nach der einfachen
Formel, und die Lücke sind genau die 4,1 Gramm Ballaststoffe. Deshalb wird der
deklarierte Wert nicht überschrieben, sondern nur ab einer Abweichung gemeldet,
die kein Nährstoff mehr erklärt. Faktoren nach Verordnung (EU) Nr. 1169/2011,
Anhang XIV.

Der Regelpfad erkennt einen Barcode an acht oder dreizehn Ziffern und eine Marke
über eine kurze Wortliste in `agent.ts`. Gesucht wird auf Wortgrenzen: "dm"
steckt in "Kardamom", und eine falsche Erkennung liefert am Ende ein fremdes
Produkt. Mit Schlüssel entscheidet das Modell über `produkt_nachschlagen` und
kennt weit mehr Marken als die Liste.

Der Barcode Scanner in `apps/pwa/js/app.js` nutzt `BarcodeDetector`, wo der
Browser ihn hat, sonst bleibt das Eingabefeld. Eine Kamerabibliothek wäre die
erste Laufzeitabhängigkeit der App und rund 300 Kilobyte je Aufruf. Dreizehn
Ziffern tippt man in zehn Sekunden.

Findet die Datenbank nichts, nennt der Coach zwei Wege: Barcode scannen oder das
Nährwertetikett fotografieren. Vom Etikett liest das Modell ab, da rät es nicht.

## Benachrichtigungen

Sechs Impulse am Tag, in `packages/core/src/tagesimpulse.ts`: Eiweiss um 9,
Trinken um 11, Energie um 14, Shake um 16, Stress um 18, Pause um 21. Sie
hängen an keiner Zahl des Nutzers, und das ist der Grund, warum sie ohne
Server laufen können.

Verschickt werden sie von einem Cloudflare Worker, `workers/push`. GitHub
Actions war die andere Möglichkeit und ist es nicht geworden: dort startet ein
Cron mit fünf bis dreissig Minuten Verzug, und die Abos müssten von Hand in
ein Secret geschrieben werden. Beim Worker stimmt die Uhrzeit, und die App
meldet sich selbst an.

Der Cron läuft alle fünfzehn Minuten und schickt nur, wenn die Minute genau
auf einem Impuls liegt. Öfter zu laufen als nötig ist Absicht: fällt ein Lauf
aus, verschiebt das nicht den ganzen Tag.

Cloudflare kennt nur UTC. Eine feste UTC Zeit ginge ein halbes Jahr lang eine
Stunde falsch, deshalb rechnet `packages/core/src/zeitzone.ts` die Berliner
Zeit selbst aus der Regel nach Richtlinie 2000/84/EG. Nicht über `Intl`, weil
benannte Zeitzonen für die Laufzeit eines Workers nicht zugesichert sind. Der
Test vergleicht jede Ausgabe über vier Jahre gegen `Intl`, also gegen die
echte Zeitzonendatenbank, und minutengenau über beide Umstellungen. Fällt die
Regel irgendwann, schlägt genau dieser Test an.

Je Zeitpunkt gibt es mehrere Formulierungen, gewählt über das Datum. Die
gleiche Nachricht jeden Tag wird nach einer Woche weggewischt, ohne gelesen zu
werden. Über das Datum und nicht zufällig, damit derselbe Tag dieselbe
Nachricht ergibt und der Versand nachrechenbar bleibt.

Die Verschlüsselung steht in `packages/push`, ohne Abhängigkeit: RFC 8291 für
den Schlüsselaustausch, RFC 8188 für das Format, RFC 8292 für die Signatur.
Gebaut auf WebCrypto und nicht auf `node:crypto`, damit dieselbe
Implementierung in Node, im Worker und im Browser läuft. Geprüft wird gegen
den Testvektor aus RFC 8291, Abschnitt 5. Ein Rundlauf mit selbst
geschriebener Gegenseite würde nur zeigen, dass beide Seiten denselben Fehler
machen.

Der Worker hält die Abos in einem Schlüsselspeicher, je Abo einen Eintrag.
Eine gemeinsame Liste müsste bei jeder Anmeldung gelesen, geändert und
zurückgeschrieben werden, und zwei gleichzeitige Anmeldungen überschrieben
sich gegenseitig. Angenommen werden nur Endpunkte bekannter Push Dienste:
sonst ist der Worker eine offene Weiterleitung, die auf Zuruf Anfragen an
fremde Adressen schickt. Ein Abo, auf das der Dienst mit 404 oder 410
antwortet, löscht der Worker selbst.

Die Erinnerungen aus `reminders.ts` bleiben davon unberührt. Sie hängen an den
Zahlen des Tages und laufen weiter über `apps/api/src/scheduler.ts`.
`WebPushNotifier` verschickt sie über denselben Weg, sobald der Server steht.

Antwortet der Nutzer auf die Energiefrage mit einer blossen Zahl von 1 bis 10,
wird sie in `energieCheck` gerechnet und geht nicht an das Modell. Unter 5 von
10 kommen Vorschläge, und jeder hängt an einer Zahl aus der App: Abstand zur
letzten Mahlzeit, Grösse der Mahlzeit, Verhältnis der Makros, Wasser, Schlaf.
Findet sich keine Ursache in den Zahlen, steht das da, statt eine zu erfinden.
Konzentration und Sättigung werden nicht mitgeraten: die App würde danach mit
Werten rechnen, die niemand angegeben hat.

Auf dem iPhone gibt es Web Push ab iOS 16.4 und nur aus der installierten App.
In Safari selbst nicht. Deshalb nennt `pushLage()` die drei Bedingungen
einzeln, statt am Ende nur zu melden, dass es nicht geht.

Einrichtung über `scripts/push-einrichten.sh` in einem Durchgang, die
Schritte einzeln in `docs/PUSH-EINRICHTEN.md`. Das Skript gibt es, weil die
Reihenfolge nicht offensichtlich ist: der Worker muss stehen, bevor er
Geheimnisse annimmt. Wer die Geheimnisse zuerst setzt, wird mitten im Ablauf
gefragt, ob ein Worker angelegt werden soll, und wer dort abbricht, hat
weder das eine noch das andere.

## Die Trainingslücke

`packages/core/src/trainingsluecke.ts`, `workers/push/src/auftrag.ts`,
`apps/pwa/js/luecke.js`.

Ab vier Tagen ohne eingetragenes Training fragt daevo, was dazwischen gekommen
ist. Vier, weil drei Tage Pause bei drei bis vier Einheiten die Woche noch
normal sind, etwa von Freitag auf Montag. Danach ist es keine Wochenendpause
mehr.

Gefragt wird nicht, warum jemand nicht trainiert hat. Das ist ein Vorwurf und
erzeugt eine Rechtfertigung. Gefragt wird nach dem, was dazwischen kam.

Drei Bedingungen, und jede einzelne verhindert die Frage. Ohne Trainingsplan im
Profil weiss die App nicht, was überhaupt geplant war. Ohne ein einziges
Training in den letzten 60 Tagen ist es keine Lücke, sondern keine Datenlage,
und eine Frage nach einer Lücke setzt voraus, dass es vorher keine war. Nach
einer gestellten Frage bleibt es drei Tage still: bei einer zweiwöchigen Pause
käme sonst jeden Tag dieselbe Frage, und eine tägliche Frage wird weggewischt,
mitsamt allen anderen Nachrichten der App.

Der Tag der Frage wird erst gesetzt, wenn der Worker sie angenommen hat. Wer
ihn vorher setzt, verliert die Frage bei jedem Netzfehler still und fragt drei
Tage lang nicht mehr.

### Warum der Umweg über den Worker

Alle anderen Impulse hängen an keiner Zahl des Nutzers und laufen deshalb blind
über den Cron, siehe `tagesimpulse.ts`. Diese hier hängt am Trainingslog, und
das liegt auf dem Gerät. Der Worker kann sie nicht selbst erkennen.

Also erkennt sie die App und legt einen Auftrag ab, der Cron stellt ihn um
18:00 zu. Abends, weil "was ist dazwischen gekommen" morgens nicht beantwortbar
ist: da liegt der Tag noch vor einem.

Der entscheidende Punkt ist, was der Auftrag nicht enthält: keinen Text. Er
trägt die Art und die Anzahl Tage, sonst nichts. Den Text baut der Worker beim
Versand selbst, über dieselbe Funktion, die auch die App benutzt. Käme er vom
Gerät, wäre dieser Weg eine offene Stelle, über die sich beliebiger Text auf
einen fremden Sperrbildschirm schieben liesse. So ist das Schlimmste, was
jemand mit einem fremden Endpunkt anrichten kann, eine Trainingsfrage an ein
Gerät, das ohnehin angemeldet ist.

Deshalb hängt an `/auftrag` auch kein Anmeldewort, anders als am Postfach. Die
Fassung für Nutzer kennt keines, und ein Weg, den nur der Betreiber benutzen
kann, wäre für die Nutzer kein Weg.

Je Gerät und Art genau ein Auftrag. Ein zweiter überschreibt den ersten: die
App legt bei jedem Start einen an, und ohne das stünden nach einer Woche sieben
Fragen im Speicher. Weiter als zwei Tage voraus wird nichts angenommen, denn
ein Auftrag ist eine Momentaufnahme des Trainingslogs, und wer morgen
trainiert, macht den Auftrag von heute falsch.

### Antworten, ohne die App zu öffnen

Die Nachricht trägt drei Knöpfe: keine Zeit, zu platt, krank oder verletzt. Ein
Tipp darauf legt die Antwort ab, und die App bleibt zu. Genau das war der
Zweck.

Der Service Worker kommt nicht an den localStorage der App heran. Die Antwort
geht deshalb in den Cache, und die App holt sie beim nächsten Öffnen ab,
gelesen und gelöscht in einem Durchgang. Eine Antwort, die liegen bleibt, steht
sonst zweimal im Gedächtnis. Ist ein Fenster offen, bekommt es die Antwort
zusätzlich sofort über `postMessage`: sonst sieht der Nutzer seine eigene
Antwort erst nach einem Neustart.

Gespeichert wird als `muster` mit Wichtigkeit 4, nicht als `fakt`. "Keine Zeit
gehabt" ist wiederkehrendes Verhalten und keine Tatsache, die gilt. Ein Grund,
der dreimal auftaucht, ist die eigentliche Information.

Drei Gründe und nicht fünf. Jeder führt zu einer anderen Reaktion: keine Zeit
heisst Planung, zu platt heisst Regeneration, krank heisst gar nichts machen.
Ein Knopf "Sonstiges" fehlt bewusst, denn wer etwas anderes sagen will, tippt
auf die Nachricht und schreibt es. Dieser Weg bleibt immer offen, und er muss
es: wie viele Knöpfe ein System anzeigt, steht in `Notification.maxActions`,
überzählige lässt es stillschweigend weg, und Safari auf dem iPhone zeigt
derzeit gar keine. Deshalb wird im Service Worker gekürzt statt gehofft, und
deshalb stehen die häufigsten Gründe vorn.

## Der Bericht

`packages/core/src/bericht.ts`, Ansicht unter Coaching.

Die zwei Check-ins fragen ab, wie eine Woche sich angefühlt hat. Was fehlte,
ist der Blick auf das, was wirklich passiert ist, über mehrere Wochen und auf
einer Seite.

Zwei Regeln stehen über allem. Genannt wird nur, was gemessen wurde. Und zu
jeder Zahl gehört, auf wie vielen Tagen sie beruht.

Ein Schnitt aus weniger als einem Drittel der Tage kommt gar nicht vor. Er
beschreibt dann nicht den Zeitraum, sondern die Auswahl der Tage, an denen
jemand Lust zum Eintragen hatte, und das sind fast immer die guten. Statt einer
Zahl steht dann, wie viele Tage fehlen, und dass das keine Kritik ist.

Null Kalorien an einem Tag ohne Eintrag ist keine Angabe, sondern eine Lücke.
Sie mitzumitteln zieht jeden Schnitt nach unten und macht aus vierzehn guten
Tagen und vierzehn leeren einen halbierten Schnitt.

Das Gewicht ist kein Schnitt, sondern eine Strecke: der Durchschnitt von 87 und
85 Kilo sagt über eine Abnahme nichts. Ausgegeben wird der letzte Wert und die
Differenz zum ersten.

Training und Einheiten werden summiert, alles andere gemittelt. Eine Summe von
Energiewerten wäre keine Zahl, die etwas bedeutet.

Der Trend vergleicht gegen den gleich langen Zeitraum davor, mit einer Schwelle
von fünf Prozent. Darunter ist es Rauschen, und ein Pfeil auf Rauschen erzeugt
Aktionismus. Dieselbe Überlegung wie bei `checkinVergleich`.

Der Trend urteilt nicht. "20 Prozent mehr als davor" steht da, nicht "besser":
ob mehr Kalorien besser sind, hängt am Ziel, und das weiss diese Funktion
nicht.

Das Fazit hat höchstens drei Sätze, und jeder hängt an einer Zahl von oben. Ein
Fazit, das mehr sagt als die Zahlen hergeben, ist der Punkt, an dem ein Bericht
anfängt zu lügen.

`berichtText` gibt reinen Text ohne Auszeichnung. Der Bericht ist zum
Weitergeben gebaut, nicht zum Ansehen: einer, den man nur in der App lesen
kann, wird nicht verschickt. Der Knopf nimmt `navigator.share`, wo es das gibt,
sonst die Zwischenablage. Ein Abbruch im Teilen Dialog wirft ebenfalls, und das
ist kein Fehler.

Sieben oder achtundzwanzig Tage, alles andere wird darauf gerundet. Eine freie
Zahl klänge genauer, als sie ist: ein Bericht über elf Tage vergleicht gegen
elf Tage davor, und die Grenze liegt dann mitten in einer Woche.

### Eine Karte je Wert

Der Bericht gab sieben Zeilen untereinander aus. Eine Liste wird überflogen,
und danach ist keine Zahl hängen geblieben. Eine Zahl, die allein auf einer
Karte steht, wird gelesen.

Jetzt ein Streifen zum seitlichen Wischen, eine Karte je Wert, mit Zeichen,
Zahl, Einheit, Trend und der Zahl der Tage. Das Wischen macht der Browser
selbst über `scroll-snap-type: x mandatory`. Eine Bibliothek dafür wäre die
erste Laufzeitabhängigkeit der App, und das Ergebnis wäre schlechter: ein
nachgebauter Wisch kennt weder den Schwung des Fingers noch die
Systemeinstellung für weniger Bewegung.

Dafür liefert `bericht.ts` Zahl, Einheit und Zusatz jetzt getrennt statt als
eine fertige Zeile. Aus "2800 kcal im Schnitt" liesse sich die Zahl nur mit
einer Regex zurückholen, und eine Regex auf den eigenen Text ist eine
Schnittstelle, die niemand gepflegt hat. `wert` bleibt als eine Zeile für den
Text zum Weitergeben.

Beim Umbau ist genau dieser Fehler einmal passiert, nur andersherum: das Fazit
las `wert` und gab "Eingetragen sind 6 zusammen Einheiten in 28 Tagen" aus.
Jetzt liest es `zahl`, und ein Test hält es fest.

Jeder Wert trägt ausserdem eine feste Kennung in ASCII, über die die
Oberfläche das Zeichen wählt. Über den Namen zu gehen wäre eine Kopplung an
einen Text, den irgendwann jemand umformuliert, und dann fehlt das Zeichen
ohne Fehlermeldung.

Die Punkte unter dem Streifen folgen dem Scrollstand und nicht einem Zähler,
den die App selbst führt. Sonst laufen beide auseinander, sobald jemand mit
Schwung über zwei Karten wischt. Ohne die Punkte wischt ausserdem niemand
weiter, weil nichts sagt, dass hinter der ersten Karte noch sechs liegen.
Pfeiltasten schieben den Streifen um eine Karte: wischen geht nur mit dem
Finger, und auf dem Rechner wäre der Streifen sonst eine Sackgasse.

Die Zeichen liegen alle auf einem Raster von 24 mit derselben Strichstärke,
damit sie als eine Familie lesbar sind, und sie tragen die Farben, die es
schon gibt: Makrofarben für Kalorien, Protein und Energie, Bereichsfarben für
Training, Schlaf und Gewicht. Eine achte Farbe nur für diese Karten wäre eine
Farbe ohne Bedeutung. Nur das Zeichen trägt Farbe, die Karte nicht: sieben
eingefärbte Flächen nebeneinander nehmen der Farbe jede Aussage.

Zwei Zeichen mussten neu gezeichnet werden, weil sie bei 20 Pixeln nicht
lasen. Die Flamme war ein runder Klumpen mit einem Strich darunter und sah aus
wie ein Tropfen. Protein war eine Aminosäurekette, inhaltlich richtig und
optisch ein Gekritzel. Jetzt eine Flamme mit Zunge und ein Knochen. "Liter"
steht ausgeschrieben: ein kleines l neben einer grossen Zahl ist kaum von
einem Strich zu unterscheiden.

### Zeiträume und wo der Teilen Knopf hingehört

Woche und vier Wochen sind gleitend, sie enden heute. Ein Monat ist fest: wer
den September ansieht, meint den Ersten bis den Letzten, und er vergleicht ihn
mit dem August und nicht mit den 30 Tagen davor. Beides steht in einer Liste,
weil beides dieselbe Frage beantwortet, nur mit anderem Ausschnitt.

Angeboten werden nur Monate, in denen wirklich etwas steht. Eine Liste mit
zwölf leeren Monaten sieht nach einer App aus, die seit einem Jahr nicht
benutzt wurde. Der laufende Monat heisst "September, bisher" und trägt keine
Jahreszahl: niemand sagt "September 2026", während der September läuft. Sein
Ende ist heute und nicht der Monatsletzte, denn die Tage danach gibt es noch
nicht, und sie als leer zu zählen verfälscht jeden Schnitt und jede Abdeckung.

Der Teilen Knopf stand neben der Zeitraumwahl, in derselben Zeile und gleich
breit. Zwei gleich breite Felder nebeneinander lesen sich als zwei
Auswahlfelder, und der Knopf beantwortete damit die Frage "welcher Zeitraum"
mit "Text kopieren". Er steht jetzt am Ende: was den ganzen Bericht betrifft,
gehört hinter den Bericht und nicht neben den Filter.

Daten werden gesagt, nicht gesetzt. "2026-09-03 bis 2026-09-30" ist eine
Datenbankzeile. Der Monat steht als Kürzel und nicht als Zahl, weil 3.9. und
9.3. sich nur in der Reihenfolge unterscheiden und jeder zweite Leser kurz
stockt. Das Jahr kommt nur mit, wenn ein Zeitraum zwei Jahre berührt.

### Die Linie auf der Karte

Jede Karte trägt den Verlauf ihres Werts über den Zeitraum. Keine Achse, keine
Zahl: ihre Aufgabe ist die Form, für alles Genaue steht die Zahl darüber.

Lücken unterbrechen die Linie, statt auf null zu fallen. Eine Linie, die an
jedem Tag ohne Eintrag den Boden berührt, behauptet einen Einbruch, den es
nicht gab, und das ist genau der Fehler, den diese App nirgends machen darf.
Deshalb trägt `BerichtWert.verlauf` `null` für einen Tag ohne Angabe und nicht
eine Null.

Unter drei Werten wird nichts gezeichnet. Zwei Punkte ergeben immer eine
gerade Linie, und eine gerade Linie sieht nach einer Aussage aus.

Bei einer flachen Reihe hat die Spanne keine Höhe. Ohne den Sonderfall teilte
die Rechnung durch null und jeder Punkt landete bei NaN.

### Schlaf kommt aus zwei Quellen

Die Dauer braucht eine Uhr und kommt aus dem Apple Health Import. Die Qualität
braucht nur den Nutzer und kommt aus dem Morgen Check-in. Beides sind
verschiedene Fragen, deshalb zwei Karten und nicht eine.

Wer keinen Health Import gemacht hat, hatte vorher gar keine Aussage über
seinen Schlaf im Bericht: die Karte hing allein an der Dauer. Die Demo bekommt
ausserdem Schlafminuten, sonst zeigt genau die Ansicht, die das Produkt
ausmacht, an dieser Stelle eine Lücke.

### Number(null) ist 0, dreimal

Derselbe Fehler in drei Modulen innerhalb einer Woche, deshalb steht er hier
und nicht nur im Code.

`Number(null)` ergibt 0, und `Number.isFinite(0)` ist true. Jede Prüfung der
Form `Number.isFinite(Number(wert))` hält damit ein fehlendes Feld für eine
gültige Null.

In `bereitschaft.ts` zählte ein fehlender Wochenbogen als "gar kein Stress" und
hob die Bereitschaft. In `bericht.ts` und in `berichtTage` zählte jeder Tag
ohne Wiegung als Wiegung von null Kilo, und im Bericht stand "+83.8 kg seit".
Zweimal hat es die gerenderte Ansicht gezeigt, einmal ein Test.

Wo ein Feld fehlen darf, wird auf null und undefined geprüft, bevor `Number`
überhaupt gerufen wird. Wo ein Wert positiv sein muss, steht zusätzlich `> 0`.

## Apple Health, über die Exportdatei

`packages/core/src/health.ts` liest, `apps/pwa/js/zip.js` packt aus,
`apps/pwa/js/gesundheit.js` schreibt. Oberfläche im Profil.

HealthKit gibt es nur nativ. Eine Web App kommt nicht heran, und daran ändert
auch kein MCP etwas: MCP verbindet ein Sprachmodell mit Werkzeugen, nicht eine
Web App mit einem Gerät. Der einzige Weg ohne App Store ist der Export, den die
Health App selbst anbietet. Heraus kommt ein ZIP mit
`apple_health_export/export.xml`.

Das ist ein Import und kein Abgleich, genau wie beim Kalender. Was nach dem
Export im Gerät passiert, kennt die App nicht, und das steht auch in der
Oberfläche: eine Kopie, die für ein Abo gehalten wird, ist schlimmer als gar
keine.

### Warum in Stücken

Ein `export.xml` von jemandem, der seit Jahren eine Uhr trägt, hat mehrere
hundert Megabyte und bis zu einer Million Einträge. Eine Zeichenkette dieser
Grösse bringt den Browser um, ein XML Baum erst recht. Der Sammler nimmt
deshalb Stück für Stück entgegen und hält nur die Tageswerte.

Ein Datensatz kann an einer Stückgrenze zerrissen werden. Deshalb bleibt der
Rest hinter dem letzten vollständigen Tag im Puffer und wird dem nächsten Stück
vorangestellt. Ohne das fehlt bei jedem Stückwechsel genau ein Eintrag, und bei
einer Million Einträgen fällt das niemandem auf. Der Test schneidet dieselbe
Datei an fünf verschiedenen Stellen durch und erwartet jedes Mal dieselbe
Summe.

### Das ZIP ohne Bibliothek

Eine ZIP Bibliothek wäre die erste Laufzeitabhängigkeit der App, je nach Paket
20 bis 100 Kilobyte. Gebraucht wird davon genau eines: eine einzelne Datei aus
dem Archiv holen. Das Format ist seit 1989 unverändert, und das Entpacken
bringt der Browser selbst mit, `DecompressionStream("deflate-raw")`.

Gelesen wird das zentrale Verzeichnis am Ende der Datei, nicht die Einträge von
vorn: sonst liest man das ganze Archiv. Die Daten kommen über `Blob.slice` und
laufen als Strom durch das Entpacken. Nichts davon liegt komplett im Speicher.

Der lokale Kopf wird trotzdem gelesen, obwohl das Verzeichnis dieselben Längen
trägt. Sie können abweichen, und wer die aus dem Verzeichnis nimmt, liest bei
manchen Archiven ein paar Byte daneben. Das Entpacken bricht dann mit einer
Meldung ab, die nichts erklärt.

ZIP64 wird erkannt und abgelehnt, mit dem Hinweis, das Archiv von Hand zu
entpacken. Eine halbe Unterstützung, die bei grossen Archiven still falsch
liest, wäre schlechter als eine klare Absage.

Gelesen wird der Strom über `getReader()`, nicht über `for await`. Safari kann
einen `ReadableStream` nicht per Schleife durchlaufen und meldet "undefined is
not a function". Chrome und Node können es, deshalb liefen alle Tests grün,
während der Import auf dem Mac in Safari scheiterte. Der Test entfernt den
Iterator vorher, sonst prüft er nur Node.

### Was übernommen wird

Die Datei wird ohne Rücksicht auf Gross und Klein gesucht. Ein Export von
einem deutschen iPhone heisst `Export.xml`, die erste Fassung suchte nur nach
`export.xml` und meldete im Betrieb "keine export.xml im Archiv", während die
Datei mit grossem E als erste in der Liste stand.

Schritte und aktive Kalorien werden summiert, denn die Uhr schreibt sie in
vielen kleinen Stücken über den Tag. Ruhepuls und HRV werden gemittelt: die
Summe von vierzig Pulswerten ist keine Zahl, die etwas bedeutet. Gewicht wird
zuletzt genommen.

Beim Schlaf zählt nur `Asleep`, nicht `InBed`. Liegezeit als Schlaf zu zählen
macht aus neun Stunden im Bett neun Stunden Schlaf. Eine Nacht wird dem
Aufwachtag zugeschlagen und nicht dem Einschlaftag: so fragt auch der Morgen
Check-in danach.

Höchstens zwei Jahre. Wer die Uhr seit 2015 trägt, hat über dreitausend Tage im
Export, und die bringen den localStorage an seine Grenze, ohne dass irgendeine
Auswertung so weit zurückschaut. Die längste ist der Belastungsverlauf mit 28
Tagen.

Schritte werden überschrieben, ein Gewicht nicht. Die Uhr zählt Schritte
genauer als jede Schätzung. Beim Gewicht ist es umgekehrt: wer sich selbst
einträgt und danach eine Waage synchronisiert, hätte sonst zwei Wahrheiten, und
die des Nutzers verliert.

Erst lesen, dann anzeigen, dann schreiben. Ein Import, der erst schreibt und
danach berichtet, lässt keine Wahl.

`profile` ist eine Kopie im Modul. Der Import setzt das Profilgewicht über den
Speicher, und ohne ein Nachladen zeigte das Feld weiter den alten Wert, den der
nächste Druck auf Speichern wieder zurückgeschrieben hätte. Auch das hat erst
der Durchlauf im Browser gezeigt.

## Apple Health, täglich über einen Kurzbefehl

`workers/push/src/gesundheit.ts` nimmt an, `apps/pwa/js/gesundheit.js`
schreibt, die Anleitung steht in `docs/HEALTH-KURZBEFEHL.md`.

Der Export ist eine Kopie, und eine Kopie veraltet am selben Abend. Eine Web
App kommt an HealthKit nicht heran, die Kurzbefehle App schon: die Aktion
"Health-Messungen suchen" liest Schritte, Kalorien, Puls, HRV und Gewicht,
und eine Automation zu festen Uhrzeiten läuft seit iOS 17 ohne Nachfrage.
Der Kurzbefehl schickt die Zahlen an `/gesundheit`, die App holt sie beim
Öffnen ab, wie beim Postfach. Live ist das nicht, sondern dreimal am Tag.
Live geht erst nativ.

Keine Mitteilung beim Eingang. Drei Mitteilungen am Tag über Schrittzahlen
sind Lärm, und Lärm wird mitsamt den wichtigen Mitteilungen weggewischt.

Angenommen werden nur Zahlen unter festen Namen, jeder mit gültigem Bereich.
Was hier liegt, schreibt die App ohne Rückfrage in die Tage, und freier Text
wäre ein Weg für fremde Inhalte. Ein Ruhepuls von 0 ist kein Messwert,
sondern eine leere Suche, und wird verworfen. Die Zahlen kommen aus der
Kurzbefehle App je nach Einstellung als Zahl, mit Komma, mit Tausenderpunkt
oder mit Einheit, `zahlLesen` nimmt alle vier.

Die Antwort nennt übernommene, verworfene und unbekannte Felder. Der
Kurzbefehl zeigt sie beim Testen an, und ein Tippfehler in einem Schlüssel
fällt beim ersten Lauf auf statt nach einer Woche ohne Schritte.

Drei Tage auf dem Worker statt einer Stunde wie beim Postfach. Ein Satz
gehört zu seinem Moment, eine Schrittzahl von gestern stimmt morgen noch.
Länger nicht, Gesundheitswerte gehören auf das Gerät.

Geschrieben wird über `healthSchreiben`, also nach denselben Regeln wie der
Export: Schritte überschreiben, ein selbst eingetragenes Gewicht bleibt. Der
Stempel ist getrennt, damit sichtbar bleibt, wie alt die grosse Kopie ist.
`heute` kommt als Ortsdatum vom Aufrufer. Der Standard in `healthSchreiben`
ist UTC, und kurz nach Mitternacht läge der Berliner Tag sonst in der Zukunft
und würde verworfen.

Schlaf fehlt noch. Die Schlafanalyse kommt als Abschnitte mit Zuständen, und
deren Summe ist nicht die Schlafdauer. Der Worker nimmt `schlafMinuten`
bereits an, der Kurzbefehl dafür wird am echten Gerät gebaut.

Der Abschnitt steht auf der Kalenderseite, und dort wurde der Stand bisher
nie gezeigt: `healthStandZeigen` lief nur beim Öffnen des Profils.

## Belastung und Bereitschaft

`packages/core/src/belastung.ts` und `packages/core/src/bereitschaft.ts`,
Ansicht unter Coaching.

Die Trainingslücke beantwortet eine grobe Frage: steht da seit vier Tagen
nichts. Sie sieht den umgekehrten Fall nicht. Wer jeden Tag trainiert und dabei
gegen seinen eigenen Schnitt siebzig Prozent drauflegt, bekommt von ihr nie
etwas zu hören.

Die Belastung rechnet die letzten 7 Tage gegen die letzten 28, beide in Minuten
und beide auf dieselbe Fensterlänge gebracht. Ohne die Umrechnung vergliche man
vier Wochen mit einer und bekäme immer einen Wert um 0,25.

Gemessen wird in Minuten, nicht in Punkten. Eine Gewichtung je Trainingsart
wäre die naheliegende Verbesserung und wäre erfunden: welche Zahl ein
Volleyballabend gegen eine Krafteinheit trägt, müsste jemand festlegen. Die MET
Werte aus dem Compendium of Physical Activities wären eine Quelle, aber die
Zuordnung der vier Arten dieser App auf MET Werte bliebe eine Entscheidung.

Unter vier Einheiten in 28 Tagen kommt keine Zahl. Der Quotient teilt durch den
Schnitt, und steht im Nenner fast nichts, wird aus einer einzigen Einheit ein
Ausschlag von mehreren hundert Prozent. Das sieht aus wie eine Aussage, ohne
eine zu sein.

Zur Quelle gehört eine Warnung, und sie steht auch in der Oberfläche. Die
Schwellen 0,8 und 1,5 stammen aus Gabbett, British Journal of Sports Medicine
2016, und genau diese Arbeit ist seit 2020 stark kritisiert worden, unter
anderem von Impellizzeri und anderen, wegen der Art, wie die Quotienten
gebildet wurden. Der Quotient beschreibt zuverlässig, wie eine Woche zum
eigenen Schnitt steht. Dass ein hoher Wert zu Verletzungen führt, ist
umstritten, und die App behauptet es nicht.

### Die Bereitschaft misst nichts

Oura und Whoop rechnen so etwas aus Herzfrequenzvariabilität, Temperatur und
Schlafphasen. daevo hat keinen Sensor. Eine Zahl, die so aussieht wie deren
Zahl, wäre geraten, und geratene Zahlen sind in dieser App der eine Fehler, der
nicht passieren darf.

Diese Zahl fasst deshalb zusammen, was der Nutzer selbst angegeben hat, plus
den einen Wert, den die App wirklich rechnen kann: seine Trainingslast gegen
seinen eigenen Schnitt. Jeder Teil nennt seine Quelle, und der Text sagt in
jeder Ausgabe, dass es keine Messung ist. Nicht nur beim ersten Mal: wer die
Zahl vier Wochen lang sieht, hält sie sonst irgendwann für eine Messung, und
dann glaubt er ihr mehr als sich selbst.

Gewichtung: Schlaf 35, Energie 30, Belastung 20, Ruhe 15. Schlaf und Energie
wiegen zusammen fast zwei Drittel, weil das die beiden Angaben sind, die heute
Morgen wirklich gemacht wurden. Die Belastung ist Kontext und keine Aussage
über diesen Morgen. Die Ruhe wiegt am wenigsten, weil ihr Wert aus dem
Wochenbogen kommt und bis zu sieben Tage alt sein darf. Ein Teil ohne Datenlage
fällt raus und die übrigen Gewichte werden hochgerechnet, dieselbe Regel wie
bei `tagesnutzung`.

Ein Rückgang der Belastung senkt die Bereitschaft nicht, er hebt sie: wer eine
ruhige Woche hatte, ist ausgeruhter. Das ist eine Überlegung und keine Messung,
und deshalb steht sie in `bereitschaft.ts` und nicht in `belastung.ts`.

Der Teil heisst Ruhe und nicht Stress, weil sein Wert der umgekehrte ist.
"Stress 100 von 100" neben lauter Werten, bei denen hoch gut ist, liest sich als
maximaler Stress und bedeutet das Gegenteil. Der gemeldete Wert steht in der
Quelle, damit nichts verlorengeht.

`Number(null)` ist 0, und 0 ist ein gültiger Stresswert. Ohne eine eigene
Prüfung auf null zählte ein fehlender Wochenbogen als "gar kein Stress" und hob
die Bereitschaft. Gefunden hat das die Ansicht und kein Test: in der Demo stand
"Stress 0 von 100", obwohl es dort keinen Bogen gibt. Das ist inzwischen der
dritte Fehler dieser Art, den erst der Durchlauf im Browser gezeigt hat.

## Das Foto, bevor es rausgeht

`fotoBlatt` in `apps/pwa`. Vorher ging das Bild sofort weg: Datei gewählt, zehn
Sekunden nichts, dann ein Ergebnis. Zwei Dinge fehlten dabei. Der Nutzer sah
nicht, ob das Bild etwas taugt, und er konnte nichts dazu sagen.

Gerade das Dazusagen ist bei einem Teller die halbe Genauigkeit. Was unter der
Sauce liegt, sieht kein Modell, und vier Stangen Spargel neben dem Fleisch sind
im Bild eine Schätzung und im Text eine Zahl. Das Feld heisst deshalb Details
und ist optional: wer nichts zu ergänzen hat, drückt weiter.

Der Knopf zählt drei Schritte statt zu warten. Sie sind echt und nicht
erfunden: Bild vorbereiten, Mengen schätzen, Nährwerte prüfen. Wie lange jeder
dauert, weiss die Anzeige nicht, deshalb steht keine Zeit daneben.

Die Zeile, die über das Bild läuft, ist keine Dekoration. Eine Bildauswertung
dauert je nach Netz fünf bis fünfzehn Sekunden, und ein Standbild ohne jede
Bewegung sieht nach der Hälfte davon aus wie eine hängende App. Sie läuft nur,
solange wirklich gerechnet wird, gesteuert über `.laeuft` an der Bühne: eine
Animation, die immer läuft, sagt nichts mehr. Bewegt wird dabei `top` und nicht
`transform`, denn die Zeile ist zwei Pixel hoch, und `translateY(100%)` sind
damit zwei Pixel statt der ganzen Bühne.

Das Bild steht im Verhältnis 4 zu 3 mit `object-fit: cover`. Ein Foto vom Handy
kommt hoch oder quer, und ohne feste Höhe springt der Knopf darunter beim Laden
an eine andere Stelle. Abgeschnitten ist besser als verzerrt: ein verzerrter
Teller sieht aus wie ein Fehler der App.

Der laufende Knopf bleibt gesperrt, aber nicht blass. Die allgemeine Regel
setzt gesperrte Knöpfe auf 0.45, und das ist für einen Knopf gedacht, den man
gerade nicht benutzen darf. Hier steht der Fortschritt drin, und ein
Fortschritt, den man kaum lesen kann, ist keiner.

Beim Schliessen wird die Adresse des Bildes freigegeben. Ohne das hält der
Browser jedes Foto der Sitzung im Speicher, und bei zehn Tellern am Tag
summiert sich das auf einem Handy.

## Denkblöcke im Verlauf

Mit Denktiefe schickt die API Blöcke vom Typ `thinking` mit. Sie werden nicht
angezeigt, müssen aber unverändert zurück, wenn das Modell nach einem
Werkzeugaufruf weiterredet. Die Signatur belegt, dass der Text unverändert ist.

Beim Strömen kommt der Denktext in Stücken, genau wie der Antworttext, als
`thinking_delta` und am Ende `signature_delta`. Diese beiden Zweige fehlten.
Der Block lag danach leer im Verlauf, und die API antwortete beim nächsten
Werkzeugaufruf mit Status 400: "each thinking block must contain thinking".

Der Schaden war grösser als eine gescheiterte Nachricht. Ein leerer Denkblock
bleibt im Gespräch stehen, also scheiterte danach jede weitere Nachricht in
diesem Gespräch. Für den Nutzer sah es aus, als sei die App kaputt, und
technisch war sie das auch.

`ohneKaputteDenkbloecke` in `packages/coach/src/provider.ts` ist der Riegel an
drei Stellen: hinter dem Strömen, hinter dem Weg ohne Strom, und vor dem
Absenden über `params.verlauf`. Die dritte ist die wichtigste, denn ein
Gespräch aus einer älteren Fassung trägt die kaputten Blöcke weiterhin. Bleibt
nach dem Entfernen nichts übrig, steht ein leerer Textblock da: eine leere
Nachricht lehnt die API ebenfalls ab.

## Der Kalender antwortet, statt Zahlen auszugeben

`wochenText` in `packages/core/src/tagesablauf.ts` gab sieben Zeilen aus, je
Tag eine, mit Datum und Minutenzahl. Das ist keine Antwort, das ist eine
Tabelle in Prosa. Der Leser muss sich das Fazit selbst zusammenrechnen, und
genau dafür hat er gefragt.

Jetzt steht das Fazit zuerst: wie viele Termine in wie vielen Tagen, welcher
Tag der vollste ist, wo der längste freie Block liegt. Danach die Tage, aber
nur die mit Terminen. Eine Zeile "nichts im Kalender" trägt keine Information
und drängt die Tage weg, die eine tragen. Leere Tage stehen als Zahl am Ende.

Minuten werden als Dauer gesagt. "180 Minuten verplant" rechnet der Leser
jedes Mal selbst um.

Die Frage nach der Verbindung steht im Regelpfad vor der Frage nach den
Terminen. "Wieso ist mein Kalender nicht mit dir verbunden" landete sonst auf
der Wochenübersicht, und der Nutzer bekam sieben Zeilen Termine auf eine
Ja-Nein-Frage. Erkannt wird über zwei Wortlisten, die beide treffen müssen:
"aktuell" allein wäre zu breit, zusammen mit "Kalender" ist es eindeutig.

`kalenderStandText` nennt, was gemessen ist: Quelle, Anzahl, wann zuletzt
eingelesen. Dazu die Ursache, die fast immer dahintersteckt: der Import ist
eine Kopie und kein Abo. Was seit dem Einlesen im Kalender passiert ist, kennt
die App nicht.

## Wenn der Modellaufruf scheitert

`packages/coach/src/fehler.ts`. Vorher stand in der Antwort immer derselbe
Satz: "Der Coach ist gerade nicht erreichbar, ich habe es regelbasiert
erledigt." Das ist keine Diagnose, sondern eine Entschuldigung. Die Meldung
von Anthropic, die den Grund trägt, wurde dabei weggeworfen.

`fehlerErklaerung` macht daraus einen Satz, mit dem sich etwas anfangen lässt:
abgelehnter Schlüssel, fehlendes Guthaben, zu viele Anfragen, überlastete
Schnittstelle, kein Netz, unbekanntes Modell, zu lange Anfrage. Jede Deutung
sagt ausserdem, ob ein erneuter Versuch hilft. Bei einem falschen Schlüssel
hilft er nicht, und der Hinweis darauf bleibt dann weg.

Passt kein Muster, kommt die Meldung im Original mit, gekürzt. Eine erfundene
Ursache wäre schlimmer als eine technische Zeile: mit der lässt sich suchen.

`pruefe()` im Profil fragt jedes der drei Modelle einmal an, nicht nur das
Standardmodell. Der Chat benutzt Haiku fürs Erfassen, Sonnet für Fachfragen
und Opus für alles Persönliche. Eine Prüfung, die nur eines davon anfragt,
meldet "alles gut", während jede eingetragene Mahlzeit an einem anderen
scheitert. Mitgeschickt wird dabei `output_config.effort` genau dort, wo der
Chat es auch schickt: sonst prüft der Test nicht das, was später läuft.

`restText` in `packages/core/src/verteilung.ts` formuliert den Rest des Tages.
Über dem Ziel ist die Restmenge negativ, und "Offen sind noch -244 kcal" ist
kein Deutsch und keine Information. Protein steht getrennt, weil beides
auseinanderlaufen kann: wer über den Kalorien liegt, kann beim Protein
trotzdem fehlen, und das ist die wichtigere der beiden Zahlen.

## Sicherung

`store.exportAll()` und `store.importAll()`, Oberfläche im Profil unter
Sicherung und zusätzlich im Anamnesebogen.

Der zweite Ort ist der wichtigere. Auf dem iPhone liegt der Speicher einer
installierten App getrennt von Safari: wer das Symbol vom Home Bildschirm
nimmt, verliert alles. Danach steht er im Fragebogen, und ohne einen Einstieg
genau dort müsste er ihn erst durchklicken, um im Profil an die Sicherung zu
kommen. Genau das soll eine Sicherung ersparen.

Die Einstellungen fehlten im Export, bis es jemand gebraucht hat. Sie sind der
Teil, der die meiste Arbeit macht: Schlüssel, Adresse des Push Workers,
Anmeldewort, Stimme, eigene Anweisungen. Eine Sicherung ohne sie ist keine.

Ausgegeben wird Text und nicht nur eine Datei. Ein Download aus einer
installierten App landet auf dem iPhone je nach Fassung nirgends Sichtbarem,
ein Text, den man sich selbst schickt, kommt immer an. Der Text trägt den
Schlüssel im Klartext, deshalb steht der Hinweis daneben.

`importAll` schreibt nur, was in der Datei steht. Ein fehlendes Feld lässt den
bestehenden Wert in Ruhe: eine ältere Sicherung darf nicht löschen, was sie
noch nicht kannte. Zurück kommt, was angekommen ist, denn "wiederhergestellt"
ohne Zahl glaubt niemand, der gerade seine Daten verloren hat.

`getMemories()` zieht jede Notiz gerade, statt an jeder Lesestelle zu prüfen.
Eine Notiz ohne `tags` hat die App in `ensureStandards` zum Absturz gebracht,
also beim Start und bevor etwas zu sehen war. Genau der Fall tritt ein, wenn
eine Sicherung aus einer älteren Fassung eingespielt wird.

`allDays()` liest das Verzeichnis und zusätzlich die vorhandenen Schlüssel im
Speicher. Laufen beide auseinander, fehlten sonst Tage in der Sicherung, ohne
dass es jemand merkt.

## Das Menue

Fünf Einträge statt vierzehn: Assistent, Ernährung, Coaching, Planung und
Struktur, Profil. Die drei mittleren klappen ihre Unterpunkte auf, immer nur
eine Gruppe. Eine Liste aus vierzehn gleich aussehenden Zeilen zwingt dazu,
jedes Mal alle zu lesen.

Die Kennzahlen oben auf Heute sind antippbar und führen in die Ansicht dahinter.
Ernährung führt auf den Essen Reiter, dort steht der Fotoknopf direkt neben der
Texteingabe. Eine Zahl, auf die man tippen kann, spart den Umweg über das Menue.

## Zwei Fassungen aus einer Quelle

`npm run build:pwa` baut die Entwicklerfassung nach `dist-pages`,
`npm run build:demo` die Fassung für Nutzer nach `dist-demo`. Zwei
Verzeichnisse, weil beide gleichzeitig existieren müssen: ein Build, der den
anderen überschreibt, zwingt dazu, vor jedem Ansehen neu zu bauen.

Der Unterschied ist nicht kosmetisch. In der Entwicklerfassung trägt der
Nutzer Schlüssel, Worker Adresse, Anmeldewort, Coaching Angebot und
Trainingsplan Vorlagen selbst ein. Das ist richtig, solange Nutzer und
Betreiber dieselbe Person sind. Für jeden anderen sind diese Felder kein
Angebot, sondern eine Hürde vor dem Produkt.

Der Schlüssel gehört nicht in die App. Eine statische Web App liefert ihren
gesamten Code an jeden Besucher aus, ein eingebauter Schlüssel steht damit im
Klartext im Netz, und Anthropic sperrt ihn, sobald er in einer öffentlichen
Quelle auftaucht. Deshalb läuft die Fassung für Nutzer über `/chat` auf dem
Push Worker, `workers/push/src/chat.ts`. Er hält den Schlüssel als Geheimnis,
`AnthropicProvider` schickt über `baseUrl` dorthin und lässt `x-api-key` weg.
Im Browser liegt nichts. Dieselbe Bauweise braucht später die native App.

Der Schlüssel wird getrimmt, bevor er in den Kopf geht. Er wird von Hand in
eine Eingabeaufforderung eingefügt, und dabei hängt sich leicht ein
Zeilenumbruch an. Anthropic antwortet darauf mit `invalid x-api-key`, also
derselben Meldung wie bei einem wirklich falschen Schlüssel. Wer das sieht,
legt einen neuen an, fügt ihn genauso ein und scheitert wieder. Genau dieser
Fall ist im Betrieb aufgetreten.

Drei Ebenen schützen den Schlüssel, und keine reicht allein: die Herkunft
hält fremde Webseiten ab, aber kein Skript ausserhalb eines Browsers. Eine
Tagesgrenze von 400 Anfragen begrenzt den Schaden, statt ihn zu verhindern.
Eine Grenze je Gerät und Stunde bremst den, der automatisiert abgreift. Ein
Ersatz für ein Konto ist das nicht, und das Ausgabenlimit in der Anthropic
Console bleibt die einzige Grenze, die auch dann hält, wenn alles andere
versagt.

Was der Betreiber setzt, ist im HTML mit `data-betreiber` markiert und wird
von `konfigAnwenden` ausgeblendet. Gelöscht wird nichts: eine Quelle, zwei
Fassungen. Die Werte stehen in `demo.config.json` und werden beim Bauen in
`js/konfig.js` der Ausgabe geschrieben, nie in die Quelle. Ein Build, der die
Quelldatei ändert, hinterlässt nach jedem Durchlauf eine Änderung im Baum, und
irgendwann committet sie jemand versehentlich mit.

Der Build bricht ab, wenn in der Konfiguration etwas nach einem Schlüssel
aussieht. Diese Datei geht in die veröffentlichte App und ist damit
öffentlich, also darf der Fehler nicht erst im Betrieb auffallen.

Die Werte werden bei jedem Start gesetzt, nicht nur beim ersten. Sonst bleibt
eine geänderte Worker Adresse bei allen, die die App schon benutzen, für immer
die alte. Was der Nutzer selbst gesetzt hat, bleibt unangetastet.

Ausblenden allein reicht nicht. Nach den Abschnitten standen noch zwei Texte
da, die nur für den Betreiber stimmen: der Menüeintrag zum Profil nannte
Schlüssel und Kosten, und der Hinweis unter der Denkstufe sagte, gründlicher
koste mehr. Wer die App geladen hat, zahlt nichts je Nachricht. Gefunden hat
das kein Lesen, sondern ein Skript, das jede Ansicht der gebauten Fassung
öffnet und den sichtbaren Text nach Betreiberwörtern absucht.

Die Fassung für Nutzer liegt nicht als Unterordner der Entwicklerfassung auf
GitHub Pages, sondern auf Cloudflare Pages, `npm run deploy:demo`. Der
localStorage hängt an der Adresse und nicht am Pfad: zwei Fassungen unter
derselben Adresse teilen ihre Daten, und die Demo würde die echten Notizen
über Therapie und Familie anzeigen. Auf GitHub Pages ist das nicht lösbar,
denn alle Repositories eines Kontos liegen unter derselben Adresse. Die neue
Adresse gehört in `HERKUNFT` im Worker, sonst weist er die Demo ab.

Vollständig in `docs/DEMO.md`.

## Das Coaching Angebot

`packages/core/src/angebot.ts`. Die App ist ein Coach, aber sie ersetzt keinen
Menschen. An den Stellen, an denen ein Nutzer merkt, dass er allein nicht
weiterkommt, gehört ein Weg zu einer echten Person. Das ist der einzige Punkt,
an dem die App etwas verkauft, deshalb steht er als eigenes Modul und nicht
verstreut in der Oberfläche.

Alles konfigurierbar, nichts fest verdrahtet. Der Betreiber trägt seinen Link
im Profil ein, nicht der Code.

`saubereUrl` entfernt Trackingparameter. Ein aus der Werbung kopierter Link
trägt `fbclid`, `gclid` und `utm_*` mit sich. Der schlimmere Fall ist `month`:
Calendly öffnet den Kalender dann in genau diesem Monat, und ein Link mit einem
Monat aus der Vergangenheit zeigt einen leeren Kalender. Das sieht aus, als wäre
nichts frei. Nur https wird akzeptiert.

`planFuer` wählt über Punkte statt über eine Kette von Bedingungen. Bei vier
Plänen und drei Kriterien gäbe es zwölf Fälle, von denen die Hälfte nie geprüft
wird. Geschlecht und Erfahrungsstand wiegen schwer: ein Plan für Anfängerinnen
ist für einen fortgeschrittenen Mann der falsche, egal wie gut die Anzahl der
Einheiten passt. Der Umfang zählt weiter, aber schwächer.

`braucheZeitsparend` entscheidet, ob die Lage für einen zeitsparenden Plan
spricht. Drei Signale, von denen zwei reichen: Stress ab 65 von 100, unter zwei
Stunden freie Zeit am Tag, und Arbeit plus Familie über 60 Prozent der
gemessenen Zeit. Ein einzelnes Signal reicht nicht, denn wer eine stressige
Woche hat, braucht deswegen keinen neuen Trainingsplan. Wer über Wochen alle
drei hat, schafft einen Fünfertag Plan nicht, und ein Plan, den man nicht
schafft, ist schlimmer als keiner.

Die Anteile werden gegen die gemessene Zeit gerechnet, nicht gegen die
verfügbare. Die Frage lautet "wo geht deine Zeit hin", nicht "wie viel deines
Tages ist erfasst". Über vierzehn Tage mit zwei erfassten Tagen wäre jeder
Anteil am Tag einstellig und die Schwelle nie erreichbar.

Planeigenschaften und Lagegründe bleiben getrennt. Die Passung steht als
Stichwort in der Zeile mit dem Umfang, die Lage als eigener Satz darunter.
Zusammen ergäben sie kein Deutsch. Die Lagegründe sind Nebensätze mit dem Verb
am Ende, weil sie an einem "Weil" hängen.

Der Block erscheint am Ende von Mindeststandards und Empfehlungen, nicht auf
jeder Seite. Ein Buchungslink überall ist Werbung, einer an der richtigen Stelle
ist ein Angebot. Er sieht bewusst anders aus als der Rest: ein Angebot, das wie
ein Bedienelement aussieht, wird versehentlich angetippt.

Der Schalter "Bei mir selbst ausblenden" ist für den Betreiber, der sein eigenes
Angebot nicht braucht.

## Das Design System

Die Grundlage steht als Tokens ganz oben in `apps/pwa/styles.css`. Wer eine
Grösse, einen Abstand oder eine Farbe direkt in eine Regel schreibt, statt einen
Token zu nehmen, bricht das System, und man sieht es der App an, ohne es
benennen zu können.

**Farbe.** Die Neutraltöne sind nicht neutral. Sie tragen einen leichten
Blaustich in Richtung des Logoblaus, rund vier Prozent Sättigung. Vorher stand
dort die GitHub Palette in reinem Grau, und eine kühle Markenfarbe neben reinem
Grau lässt die Palette in zwei Hälften zerfallen. Der Stich ist zu gering, um
als Farbe gelesen zu werden, und genau darum geht es. `--brand-text` ist ein
dritter Blauton für Text auf hellem Grund: `--brand-deep` erreicht auf `#f5f7fb`
nur 4.24 zu 1 und ist dort für Fliesstext zu schwach, der neue Ton liegt bei
4.98. Alle Werte nachgerechnet, nicht geschätzt.

**Typografie.** Eine modulare Skala mit dem Verhältnis 1.2, von `--t-2xs` bis
`--t-4xl`. Vorher standen elf Grössen zwischen 12 und 20 Pixeln im Stylesheet,
darunter 12.5, 13.5, 14.5, 15.5 und 16.5. Dazu vier Laufweiten: grosse Schrift
enger, kleine weiter. Ohne das wirkt eine 30 Pixel Zeile auseinandergezogen und
eine 12 Pixel Zeile gedrängt.

Zahlen laufen tabellarisch, über `font-variant-numeric` auf dem Body. Eine 1 ist
sonst schmaler als eine 8, und eine Liste mit 1900, 2884 und 138 zappelt.

**Abstände.** Alles auf einem Vierer Raster, `--s-1` bis `--s-12`. Ein Layout,
in dem 13, 18 und 26 Pixel nebeneinander stehen, hat keinen Rhythmus.

**Tiefe.** Drei Stufen. Im dunklen Modus kommt zu jedem Schatten ein Lichtsaum
an der Oberkante, weil ein Schatten auf einer dunklen Fläche unsichtbar ist:
dort entsteht Tiefe über Licht. Im hellen Modus tragen die Schatten allein.

**Weniger Kästen.** Vorher hatte fast jedes Element einen eigenen Rahmen mit
eigenem Hintergrund. Zwanzig gerahmte Flächen untereinander lesen sich als Liste
von Behältern, nicht als Inhalt. Die Ringkacheln stehen jetzt ohne Kasten: der
Ring ist die Form, er braucht keinen zweiten Rahmen um sich. Was eine Kachel
zusammenhält, ist der Abstand zu ihren Nachbarn.

**Zwei Ebenen von Überschriften.** `.abschnitt` ist die obere: gross, in
Textfarbe, mit Trennlinie darüber. `.section-title` bleibt die untere: klein,
versal, grau. Vorher war beides dieselbe Klasse, und in einer Ansicht mit sieben
davon sah jede aus wie die nächste.

**Bewegung.** Eine Kurve für alles, `--kurve`, plus zwei Dauern. Knöpfe gehen
beim Tippen auf 98 Prozent: zu wenig, um es bewusst zu sehen, genug, um es zu
spüren. Lineare Übergänge wirken maschinell.

**Prüfung.** Layout wird gerendert geprüft, nicht gelesen. Das Skript im
Scratchpad öffnet jede Ansicht in beiden Farbmodi und meldet zwei Dinge:
überlappende Textelemente und seitliches Scrollen. Genau diese Fehler sieht kein
Test, der Werte prüft, und genau die fallen dem Nutzer als Erstes auf.

## Das Netz aus Soll und Ist

`netzDiagramm` in `apps/pwa/js/rings.js`, Schieflage in
`packages/core/src/schieflage.ts`.

Das Board zeigte, wo die Zeit hingeht. Was fehlte: der Stand gegen das, was
sich der Nutzer vorgenommen hatte. Das Ziel stand schon da, als Wochenziele in
Stunden je Bereich, es wurde nur nirgends dagegengehalten.

Jetzt ein Netz mit fünf Achsen, eine je Bereich. Die gestrichelte Fläche ist
das Ziel und damit immer ein regelmässiges Fünfeck, die gefüllte der gemessene
Stand. Darunter die Balken mit den Stunden. Zusammenfassung vor Detail: die
Schieflage sieht man in einer Sekunde an der Form, die genaue Zahl liest man
eine Zeile tiefer.

Beides und nicht eines. Ein Netz kann genau eine Sache besser als alles
andere, nämlich zwei Formen auf denselben Achsen vergleichen, und genau das
ist hier die Frage. Seine Schwächen sind, dass man Zahlen nicht ablesen kann
und dass die Fläche im Quadrat wächst, eine Abweichung also dramatischer
aussieht als sie ist. Beides erledigen die Balken darunter.

Gerechnet wird in Prozent des Ziels und nicht in Stunden. Vierzig Stunden
Arbeit gegen sieben Stunden Me Time auf derselben Achse drücken alles ausser
Karriere an den Mittelpunkt.

Die Reihenfolge der Achsen ist fest und darf sich nie ändern. Ein Netz ist nur
mit sich selbst vergleichbar, und wenn Me Time eines Tages an einer anderen
Ecke sitzt, passt kein Bild von heute mehr dazu.

Der Rand für die Beschriftung ist 66 Pixel. Der erste Entwurf nahm 40, und
"Wellbeing" und "Familie" liefen an den Seiten aus der viewBox: im Betrieb
stand dort "Fitne" und "milie". Der Rand muss das längste Wort tragen, nicht
das durchschnittliche. Die Beschriftung sitzt ausserdem in festen Pixeln
ausserhalb des Netzes und nicht auf einem Anteil oberhalb des Maximums: ein
Bereich über 160 Prozent wird auf den Rand gedeckelt, und ein Etikett auf
einem Anteil landete dann genau auf seinem eigenen Punkt.

### Wann daevo sich meldet

`schieflageFinden` entscheidet das, und fast jede Zeile darin ist eine
Bedingung, die eine Meldung verhindert. Eine Erinnerung, die jede Woche kommt,
wird nach drei Wochen weggewischt, und mit ihr alle anderen Nachrichten der
App.

Ein Bereich unter 40 Prozent seines Ziels. Darunter ist es kein schwacher
Zeitraum mehr, sondern ein Muster: wer sich fünf Stunden vornimmt und zwei
schafft, hatte eine volle Woche, wer eineinhalb schafft, hat es nicht vor.

Gerechnet über vier Wochen, nicht über eine. Eine Woche ist eine
Momentaufnahme. Der Zeitraum steht in jedem Satz, sonst liest man die Zahl als
die von heute, besonders wenn darüber die Ansicht für heute steht.

Mindestens zehn Tage mit gemessener Zeit. Darunter meldet die App eine
Schieflage, die nur eine Lücke im Eintragen ist, und das ist der sicherste Weg,
jemandem das Board abzugewöhnen. Gezählt wird aus denselben drei Quellen, aus
denen das Board seine Minuten nimmt: Kalendertermine, eingetragene Trainings
und Zeit, die der Coach gebucht hat. Nur die eigenen Einträge zu zählen würde
jeden übergehen, dessen Zeit vollständig im Kalender steht.

Höchstens alle drei Tage, also zweimal die Woche als Obergrenze und nicht als
Ziel.

Ein Bereich über seinem Ziel allein ist keine Meldung wert. Wer viel trainiert
und sonst alles schafft, hat kein Problem, sondern eine gute Woche. Erst die
Kombination aus einem Bereich, der leer bleibt, und einem, der überzieht, ist
die Aussage, um die es geht.

Der Text sagt nicht, was der Nutzer falsch macht. Er sagt, was sich der Nutzer
vorgenommen hatte und wo er steht. Den Unterschied zieht er selbst, und genau
das ist der Punkt: die Zahl kommt von ihm, nicht von der App. Ein Test hält
fest, dass die Wörter "zu wenig", "schlecht", "versagt" und "solltest" nicht
darin vorkommen.

Verschickt wird über denselben Weg wie die Trainingslücke, `/auftrag` auf dem
Worker. Der Auftrag trägt die Kennung des Bereichs und Zahlen, nie einen
Namen: ein Name wäre freier Text vom Gerät, und genau den nimmt dieser Weg
nicht an. Den Namen schlägt der Worker in der festen Tabelle nach. Je Art ein
eigener Eintrag im Speicher, damit sich Trainingslücke und Schieflage nicht
gegenseitig überschreiben.

Diese Mitteilung trägt keine Knöpfe. Hier gibt es nichts mit drei Antworten zu
beantworten, sondern etwas anzusehen, und sie führt direkt auf die Balance
Seite. Ein Knopf ohne Wirkung ist schlimmer als keiner.

Dieselbe Aussage steht auch in der Ansicht und nicht nur in der Mitteilung.
Wer sie weggewischt hat und später selbst nachsieht, soll dasselbe lesen.

## Eine Schrift, die im Projekt liegt

Poppins in zwei Schnitten, 500 und 600, als Datei unter `apps/pwa/schrift`.
Zusammen 16 Kilobyte, nur die lateinische Teilmenge. Der Bereich U+0000 bis
U+00FF deckt ä, ö, ü und ß ab.

Nicht von Google geladen, und dafür gibt es zwei Gründe. Die App muss ohne
Netz starten, das ist der halbe Sinn einer installierten Web App, und eine
Schrift von einem fremden Server bricht dort weg. Ausserdem verrät jeder Abruf
an fonts.gstatic.com, wann jemand die App aufmacht, und bei einer App, in der
Notizen über Therapie und Familie liegen, liefert man so etwas nicht nebenbei
mit. Der Service Worker legt beide Dateien in den Cache.

300 fehlt bewusst. Das Light gibt es nur in der Wortmarke, und die liegt als
Pfad vor. Eine dritte Datei für zwei Buchstaben wäre Ladezeit ohne Gegenwert.

Zwei Rollen, nicht eine. Poppins trägt Überschriften und die Zahlen, die
Systemschrift den Fliesstext. Eine geometrische Schrift ist auf 13 Pixeln
Lauftext schlechter lesbar, weil ihre runden Formen eng laufen und die
Unterschiede zwischen a, o und e kleiner werden. In einer Zahl von 48 Pixeln
ist genau diese Geometrie der Grund, sie zu nehmen: die Null ist ein Kreis,
wie der Ring, in dem sie steht. Eine Schrift überall einzusetzen macht sie
ausserdem unsichtbar, sie fällt nur auf, wo daneben etwas anderes steht.

Der Rückfall ist nicht beliebig: fehlt Poppins, kommt etwas Geometrisches und
keine Voreinstellung mit Serifen. `font-display: swap`, damit ein fehlender
Download keine leere Seite ergibt.

Die Zahl im Wertungsring wird als SVG Text gesetzt und erbt die Schrift nicht
über die üblichen Regeln, dafür steht eine eigene Zeile im Stylesheet.

SIL Open Font License 1.1, der Text liegt neben den Dateien.

## Der Wechsel zwischen Ansichten

Vorher schnitt die App hart um. Ein Schnitt ohne Übergang nimmt dem Nutzer die
Auskunft, ob er tiefer hinein oder wieder heraus gegangen ist.

`ANSICHT_TIEFE` legt die Reihenfolge fest, und daraus kommt die Richtung: nach
vorn schiebt sich die neue Ansicht von rechts herein, zurück von links. Was
nicht in der Liste steht, gilt als weiter hinten, damit eine später
hinzugefügte Ansicht ohne Zutun einen vernünftigen Übergang bekommt.

Nur die neue Ansicht wird bewegt, die alte nicht. Zwei Ebenen gleichzeitig
bräuchten beide gleichzeitig im Baum, also ein Umbauen von `hidden` auf
Überlagerung, und das kostet an jeder Stelle, an der eine Ansicht ihre Höhe
misst. Der Gewinn wäre eine Nuance.

Der Assistent wird nur aufgeblendet und nicht geschoben. Dort läuft der Kreis
auf einem Canvas, und eine Transformation auf dem Vorfahren zwingt den Browser,
das Canvas in eine eigene Ebene zu legen und pro Bild neu zusammenzusetzen.

190 Millisekunden. Darunter sieht man nur ein Zucken, darüber wartet man. Die
Klasse wird vor dem Setzen entfernt und ein Bild später neu gesetzt, sonst
startet die Animation beim zweiten Mal auf dieselbe Ansicht nicht. Eine neue
Ansicht fängt oben an, sonst steht man auf einer frischen Seite mitten im Text.

## Der Erfassen Knopf war ein Chip

Er sah aus wie die Wasserchips darüber: gerahmtes Rechteck mit runden Ecken.
Zwei Dinge mit demselben Aussehen und sehr verschiedenem Gewicht, und der
wichtigere verliert, weil er weiter unten steht.

Der erste Versuch war eine erhobene Fläche im Panelton: ein Chip ist umrandet
und flach, dieser Knopf gefüllt und erhoben. Die Begründung dafür war, dass
eine Füllung in der Markenfarbe mehr Aufmerksamkeit zieht als die Zahlen
darüber, und die sind der Inhalt der Seite.

Im Betrieb war das zu wenig. Der Knopf hob sich vom Grund ab, aber nicht von
den Wasserchips, und die Haupthandlung der Seite sah aus wie ein Nebenweg.

Der zweite Versuch war Weiss im dunklen Modus und der Grundton im hellen. Das
war die Überkorrektur: der härteste Kontrast der Palette für einen Knopf, der
sich nur abheben soll. Weiss auf Schwarz nimmt der grossen Zahl darüber die
Aufmerksamkeit, und zwei Flächen mit maximalem Kontrast auf einer Seite lesen
sich als zwei Hauptsachen.

Jetzt trägt er Markenblau in beiden Modi, nur in zwei Stufen. Dunkel das
Logoblau `#96d8f0`, hell ein abgedunkeltes `#186688`. Die Farbe ist dieselbe,
die Helligkeit dreht sich, und der Knopf bleibt Teil der Palette statt
ausserhalb zu stehen.

Die Werte sind gerechnet, nicht geschätzt. Dunkel liegt der Titel bei 12.31 zu
1, hell bei 6.37. Das dokumentierte `#1e7fa8` reicht auf hellem Grund nicht:
die Unterzeile käme dort auf 3.58 und läge unter 4.5. Deshalb der dunklere Ton
und Deckkraft 0.82 statt 0.62, damit die Unterzeile bei 4.86 landet.

Der Kreis auf dem Knopf trägt die jeweils andere Stufe derselben Farbe: auf
dem hellen Blau das dunkle, auf dem dunklen Blau das Logoblau. Logoblau auf
Logoblau wäre kein Kreis mehr.

Die Untertitelzeile nimmt nicht `--muted`. Der Ton ist für Text auf dem
Grundton gerechnet und liegt auf der starken Fläche daneben. Die eigene Farbe
mit Deckkraft bleibt in beiden Modi im Verhältnis.

Darüber 24 Pixel Luft statt keiner. Vorher klebte der Knopf an den
Wasserchips, und zwei Bedienelemente ohne Abstand lesen sich als eine Gruppe,
obwohl das eine ein Nebenweg ist und das andere die Haupthandlung.

Beim Drücken sinkt er ein, kleiner und flacher zugleich. Nur kleiner werden
liest sich als Wackeln, erst der wegfallende Schatten macht daraus eine
Bewegung nach unten. Am rechten Rand ein Winkel, sonst sieht die Kachel aus,
als stünde dort etwas, statt als ginge dort etwas auf. Solange das Blatt offen
ist, zeigt der Winkel nach unten und das Plus steht auf der Diagonale, beides
über `aria-expanded` und damit aus demselben Zustand, den auch die
Hilfstechnik liest.

## Der Stamm des d ist jetzt derselbe Schlauch wie der Bogen

Zwei Fehler nacheinander, und der zweite fiel erst auf, als der erste weg war.

Der erste war die Dichte. Der Ring trägt 3240 Punkte auf rund 157500
Quadrateinheiten, also 0,0206 je Einheit. Der Stamm misst 140 mal 740 und
hatte 1500 Punkte, also zwei Drittel davon. Der Buchstabe las sich als
zerrissen. Jetzt 2130, gerechnet und nicht geschätzt.

Der zweite war die Textur. Der Ring läuft auf 30 Fäden um einen gedachten
Schlauch, der Stamm wurde im umschliessenden Rechteck gewürfelt und ausserhalb
der Kapsel verworfen. Das ergab eine gleichmässig gefüllte Fläche neben einem
Bündel aus Fäden: zwei Texturen in einem Buchstaben, und der Stamm wirkte wie
ein aufgeklebter Balken.

Der Stamm ist dieselbe Form wie der Bogen, nur gerade, also bekommt er
dieselbe Struktur. Statt zu verwerfen wird gerechnet: zu jeder Höhe steht
fest, wie weit der Schlauch dort reicht, in der Mitte der volle Radius, an den
Enden die halbe Sehne des Kreises. Der Punkt sitzt auf seinem Faden bei cos(b)
mal dieser Weite und liegt damit immer drin. Die runden Enden entstehen dabei
von selbst, weil die Fäden dort zusammenlaufen, und die Wurzel fällt einmal
beim Bauen an statt in jedem Bild.

Beide Teile drehen mit derselben Geschwindigkeit und benutzen dieselbe
Tiefenformel. Liefen sie verschieden, zerfiele der Buchstabe beim Zusehen in
zwei.

Der Puffer für die Bildpunkte wird jetzt aus `stemCount` dimensioniert und
nicht aus der Konstante. Die Zahl der Fäden rundet, und bei einem Wert, der
nicht durch 30 teilbar ist, entstünden mehr Punkte als die Konstante sagt.
`Float32Array` schreibt dann still nicht weiter, und dem Stamm fehlte ein
Stück ohne Fehlermeldung.

Gemessen nach beiden Änderungen: 61 Bilder je Sekunde bei dreifacher
Pixeldichte, mit rund 5400 Punkten.

## Eine Seite hat einen Helden oder keinen

Heute öffnete mit einer abgeleiteten Punktzahl über die halbe Bildschirmhöhe.
Die Kalorien, wegen derer jemand die Seite aufmacht, lagen klein darunter in
einer Kachel.

Eine grosse Zahl ist ein Versprechen. Sie sagt: das hier ist das Wichtigste.
Stimmt das nicht, glaubt der Nutzer der Seite beim nächsten Mal weniger, und
zwar auch dort, wo sie recht hat.

Jetzt trägt der Kalorienring die Seite, 196 Pixel, ohne Kasten. Ein Rahmen um
das Wichtigste macht es zu einem Objekt neben anderen Objekten. Was ihn
zusammenhält, ist der Abstand zu seinen Nachbarn. Direkt darunter die Makros,
weil sie zur selben Frage gehören. Die Tagesnutzung steht hinter dem, woraus
sie abgeleitet ist, als Leiste und nicht als Ring.

Der Ring des Helden ist dünner als der kleine. Eine Spur, die mitwächst, wird
zum Reifen: dieselbe Stärke von fünf trägt auf 196 Pixeln optisch doppelt so
viel wie auf 132 und nimmt der Zahl in der Mitte das Gewicht.

Die Urteilswörter hiessen "Dünn" und "Schwach". Beide beschreiben den Nutzer
und nicht den Tag, und in einer App, die auch Körpergewicht führt, liest sich
"dünn" doppelt falsch. Jetzt "Mager" und "Leer".

## Ein Ring ist die falsche Form für einen kleinen Anteil

Die fünf Lebensbereiche standen als fünf Ringe, drei in einer Reihe und zwei
darunter. Drei Prozent auf einem Ring sind ein Stummel von zehn Grad, daneben
steht eine Zahl, die dasselbe noch einmal sagt, und fünf Kacheln in einem
Dreierraster ergeben eine Waise.

Jetzt Balken, dieselbe Form wie bei den Makros. Ein Balken trägt jeden Anteil
von null bis über hundert, liest sich in einer Spalte untereinander und lässt
Name, Wert und Ziel auf einer Zeile stehen. Eine App, ein System.

`messwert()` baut jede dieser Zeilen: Tagesnutzung, ihre vier Teile und die
fünf Bereiche. Drei Bauarten für dieselbe Form wären drei Stellen, an denen
sie später auseinanderlaufen. Die Farbe kommt je Zeile über `--ton`, nicht
über eine Klasse je Bereich: fünf Klassen für fünf Farben wären fünf Stellen,
an denen eine Farbe nicht mitgezogen wird.

Der Balken misst gegen das Ziel. Vorher füllte ihn der Anteil am Tag, während
die Zahl daneben das Ziel nannte: "8 h 12 von 5 h 43" über einem Balken bei
fünfzig Prozent. Zwei Fragen in einer Zeile, und keine davon war ablesbar. Den
Anteil am Tag beantwortet der Ring auf der Balance Seite, und damit hat jede
Form genau eine Aufgabe.

Über dem Ziel bekommt der Balken eine Schraffur statt einer Warnfarbe. Über
einem Fitnessziel zu liegen ist kein Fehler, und eine volle Spur allein sähe
aus wie genau erreicht.

`kurzDauer` gab "8:12 h" neben "43 min" in derselben Spalte aus. Zwei
Schreibweisen für dieselbe Grösse zwingen dazu, jede Zeile einzeln zu deuten,
und 8:12 sieht ausserdem aus wie zwölf nach acht. Jetzt "8 h 12".

## Zwei Handlungen, ein Bild

In der Kopfzeile des Assistenten waren das Menü und die Gespräche dasselbe
Symbol: drei gleich lange Striche. Zwei verschiedene Handlungen mit demselben
Bild nimmt niemand als zwei wahr. Der Nutzer drückt eines von beiden und lernt
nichts dazu. Die Gespräche tragen jetzt eine Liste mit Punkten davor.

Die Sprachausgabe war ein leerer Kreis, im Aus-Zustand mit gestricheltem Rand.
Ein Kreis ist kein Lautsprecher, und gestrichelt gegen durchgezogen ist als
einziger Unterschied zwischen an und aus zu leise. Jetzt ein Pfad mit Korpus
und Trichter, dazu eine Welle, die im Aus-Zustand zum Kreuz wird.

Als SVG und nicht aus Rahmen zusammengesetzt. Ein Trichter aus `border-left`
mit durchsichtigem Rand oben und unten ergibt ein Dreieck, das je nach
Zeilenhöhe zwei Pixel neben dem Korpus sitzt, und eine Welle als halber
Kreisrand wurde im Betrieb zur einzelnen Klammer. Für eine Form mit Schrägen
ist ein Pfad das richtige Mittel, nicht ein Kasten mit Rändern.

## Sechs Bedienelemente gehen nicht in eine Zeile

In der Eingabepille standen Mikrofon, Büroklammer, "Kopf", "Hey", das Textfeld
und Senden. Auf 390 Pixeln blieb vom Platzhalter "Schreib oder spr" übrig, und
ein abgeschnittener Platzhalter sieht aus wie ein Fehler, nicht wie Platzmangel.

Kopf leeren und das Weckwort sind Betriebsarten und keine Eingabehilfen. Sie
stehen jetzt beschriftet über der Pille, mit einem Punkt, der den Zustand
trägt. An heisst Farbe, voller Punkt und ein Schimmer darum: drei Signale,
weil ein offenes Mikrofon Akku zieht und niemand es übersehen darf.

## Der Stamm des d hatte zu wenig Punkte

Der Kreis auf dem Assistenten las sich als zerrissener Buchstabe. Der Grund
war Dichte, nicht Geometrie.

Der Ring trägt 3240 Punkte auf einem Band von rund 157500 Quadrateinheiten,
also 0,0206 je Einheit. Der Stamm misst 140 mal 740, also 103600 Einheiten,
und hatte 1500 Punkte, also zwei Drittel der Dichte. Der Ring wirkte dicht,
der Stamm ausgefranst, und beide zusammen wie zwei Teile, die nicht
zusammengehören. Jetzt 2130, gerechnet und nicht geschätzt.

Gemessen danach: 61 Bilder je Sekunde bei dreifacher Pixeldichte. Die Zusage
aus dem Abschnitt über den Kreis gilt weiter.

Offen bleibt der Unterschied in der Textur: der Ring liegt auf 30 Fäden und
zeigt Streifen, der Stamm ist zufällig gefüllt und wirkt massiv. Die Streifen
sind Absicht, die volle Fläche nicht.

## Die Makrobalken

Zwei Fehler, die zusammen auffielen, als die Farben zur Sprache kamen.

Der erste ist ein Namenskonflikt. Die Balken hiessen `.bar`, genau wie die
Kopfzeile jeder Ansicht. Die Regel für die Kopfzeile steht weiter unten im
Stylesheet und hat gewonnen: die Balken wurden 52 Pixel hoch statt acht,
bekamen seitlichen Innenabstand und `display: flex`. Dasselbe noch einmal bei
`.bars`, das sowohl die Gruppe als auch das Menuesymbol war. Beide heissen
jetzt `.balken` und `.balken-gruppe`. Ein Klassenname für zwei Bauteile ist
keine Frage der Ordnung, sondern ein Fehler, der irgendwann eintritt.

Der zweite sind die Farben. Die Balken trugen die Zustandsfarben: Fett lief auf
`--warn`, also auf der Warnfarbe. Ein Makro ist keine Warnung, und das sieht man
dem Balken an, bevor man es benennen kann. Das Gelb stach heraus, weil es dafür
gebaut ist herauszustechen.

Jetzt vier eigene Token auf einem Kreis um die Markenfarbe: Grün-Türkis, Rose,
Violett, Markenzyan. Die Helligkeit ist nicht geschätzt, sondern gerechnet.
Jeder Ton trifft auf der Spur genau 7.0 zu 1, im hellen Modus genau 4.0 zu 1,
bei überall derselben Sättigung von 0.62.

Gleicher Kontrast heisst gleiches Gewicht, gleiche Sättigung heisst gleiche
Farbkraft. Erst beides zusammen macht aus vier Farben eine Familie. Beim ersten
Versuch stimmte nur der Kontrast, und das Violett trug mehr Sättigung als die
übrigen. Es sprang heraus, obwohl die Helligkeit stimmte.

`--alt` und `--water` sind damit weggefallen. Sie hiessen "die dritte Farbe" und
"die vierte", und ein Token ohne Bedeutung wird beim nächsten Mal irgendwo
eingesetzt, wo er nicht hingehört. Die Spur hinter dem Balken stand als fester
Wert in der Regel und brauchte eine zweite Regel für den hellen Modus. Sie ist
jetzt ein Token.

Über dem Ziel bleibt der Balken rot. Dort ist es wirklich eine Warnung.

## Die Demo startet gefüllt

`apps/pwa/js/beispiel.js`. Eine leere App zeigt nichts: ein Ring auf null,
vier leere Balken, ein Verlauf ohne Zeilen. Genau die Ansichten, die das
Produkt ausmachen, brauchen Vergangenheit. Das Balance Board braucht gebuchte
Zeit, die Musteranalyse zehn gemeinsame Tage, der Gewichtstrend vier Wiegungen
über zwei Wochen.

Deshalb kommen in der Fassung für Nutzer beim ersten Start vierzehn Tage
herein, einmal und nur wenn wirklich nichts da ist. Über Daten löschen im
Profil kommt der leere Zustand zurück, und mit ihm der Fragebogen.

Die Person ist erfunden, und das ist keine Feinheit. Im Gedächtnis des
Betreibers stehen Notizen über Therapie, Familie und Diagnosen. Eine Demo ist
eine öffentliche Adresse: wer den Link hat, liest alles. Echte Daten haben
dort nichts zu suchen, auch nicht die eigenen.

Der Generator läuft über einen Zufall mit Startwert, damit die Demo bei jedem
Aufbau gleich aussieht. Echter Zufall hiesse: jeder Besucher sieht andere
Zahlen, und ein Screenshot von gestern passt nicht mehr zu dem von heute.

Geschrieben wird über `store.importAll`, also über den Weg, über den auch eine
echte Sicherung zurückkommt. Ein zweiter Schreibweg wäre eine zweite Stelle,
an der dieselbe Form auseinanderlaufen kann.

Ein Tag ohne Eintrag ist dabei. Niemand trackt vierzehn Tage am Stück, die App
kommt mit Lücken zurecht, und das zu zeigen ist mehr wert als eine glatte
Reihe. Heute dagegen ist bewusst ein guter Tag: eine Demo öffnet in einem
Zustand, der zeigt, was die App kann.

## Die fünf Bereiche haben eine Farbfamilie

Dieselbe Rechnung wie bei den Makrobalken, und das ist der Punkt: eine App,
ein System.

Vorher standen fünf feste Farben in `rings.js`: Kontrast von 3.53 bis 8.37,
Sättigung von 0.56 bis 0.88, Farbtöne über den ganzen Kreis verstreut. Das
Gewicht stand damit verkehrt herum. Karriere ist bei diesem Nutzer der grösste
Bereich und trug den schwächsten Ton, Beziehung der kleinste und den
lautesten. Wer auf die Kacheln schaut, liest zuerst die Farbe.

Jetzt fünf Töne im Abstand von 40 Grad, überall Sättigung 0.62, jeder auf der
Spur genau 7.0 zu 1 und im hellen Modus genau 4.0 zu 1. Kein Gelb und kein
Orange: beides trägt in dieser App die Bedeutung Warnung, und ein
Lebensbereich ist keine Warnung.

Sie stehen als Token im Stylesheet und werden über `bereichFarbe()` gelesen,
nicht mehr als Zeichenketten in JavaScript. Vorher waren sie in beiden
Farbmodi gleich, und ein Ton, der auf Schwarz stimmt, stimmt auf Weiss nicht.
Gelesen wird bei jedem Zeichnen: der Nutzer kann das Aussehen im Profil
umschalten, und ein einmal gelesener Wert bliebe danach der alte.

Die Kacheln haben jetzt eine gemeinsame Mindesthöhe. "Familie und Beziehung"
bricht auf zwei Zeilen um, und ohne sie stand die untere Reihe tiefer als die
obere. Die Kommentarzeile dafür stand schon im Stylesheet, die Höhe fehlte:
eine Absicht, die nur als Text existiert, ist keine. Dass fünf Kacheln keine
Dreierreihe füllen, bleibt in Kauf genommen. Fünf Zeilen über die volle Breite
kosten auf Heute eine halbe Bildschirmhöhe für eine Übersicht, die man im
Vorbeigehen liest.

## Der Startbildschirm

Die Marke kommt nicht fertig ins Bild, sie entsteht. Erst öffnet sich ein
Lichtschein aus der Mitte, dann wird die Wortmarke aus der Unschärfe heraus
scharf und bekommt zuletzt ihre Farbe: `filter: blur(5px) brightness(0.4)` auf
`blur(0) brightness(1)`.

Zwei Sekunden statt der vorherigen 1,3. Ruhig wirkt nur, wer Zeit lässt:
dieselbe Bewegung in 1,3 Sekunden wirkt gehetzt und damit billig. Ein Tipp
bricht jederzeit ab, wer es eilig hat, wartet nicht.

Zwei Ebenen, weil sie sich verschieden bewegen müssen. Der Schein wächst aus
einem Punkt auf volle Grösse, die Marke bleibt an ihrem Platz und schärft sich
nur. In einer Animation ginge das nicht.

Eine eigene Kurve, `--kurve-start`. Die Standardkurve ist für Knöpfe gemacht
und läuft am Anfang zu schnell los.

Auf hellem Grund kommt derselbe Schein aus dem dunklen Blau und bleibt
deutlich schwächer. Das Logoblau verschwindet auf Weiss, und ein zu starker
Schein wird dort zu einem grauen Fleck.

Eine dritte Variante mit einem Streiflicht über der Wortmarke wurde verworfen.
Sie sieht beim ersten Mal am besten aus und beim fünfzigsten am schlechtesten.

## Wie gründlich, und damit wie schnell

Drei Stufen im Profil statt eines Schalters: schnell, ausgewogen, immer
gründlich. `tiefeAnheben` in `packages/coach/src/agent.ts`.

Der Anlass kam aus dem Betrieb. Eine diktierte Frage nach der Tagesstruktur
landete über die Regel `woerter > 60` auf Opus mit höchster Denktiefe und
brauchte über eine Minute. Die Antwort war gut, aber der Nutzer wollte in dem
Moment keine Abhandlung, sondern eine Reihenfolge.

Gesprochene Nachrichten sind von Natur aus lang. Länge ist deshalb ein
schlechtes Mass für die nötige Tiefe, und wer viel diktiert, landet dauernd
auf der teuersten und langsamsten Stufe, ohne es gewollt zu haben.

`schnell` deckelt auf mittlere Denktiefe und schickt Planung von Opus auf
Sonnet. Was dabei wegfällt, ist echte Qualität, keine eingebildete: die
Antwort wird kürzer gedacht. Deshalb ist es nicht die Voreinstellung, sondern
eine Wahl.

Psyche bleibt von `schnell` unberührt. Wer über Scham redet, bekommt keine
schnelle Antwort, auch wenn er schnell eingestellt hat. Das ist der eine Ort,
an dem die App die Einstellung überstimmt, und der Grund steht im Code: eine
hingeworfene Antwort auf so etwas ist schlimmer als eine langsame.

Eine ausdrückliche Modellwahl gewinnt über das Tempo. Wer Opus fest einstellt,
will Opus, auch wenn es länger dauert.

Die alte Einstellung `immerGruendlich` gilt weiter, solange keine neue
dasteht. Aus einem gespeicherten `false` darf nicht plötzlich `schnell`
werden, sonst läuft die App nach einem Update auf Sparflamme. In der
Oberfläche trägt `ausgewogen` ein `selected`: ohne das zeigt das Feld die
erste Zeile, bis das Skript den gespeicherten Wert setzt, und eine kurz falsch
angezeigte Einstellung wird übernommen, weil niemand sie anfasst.

Dazu eine laufende Uhr in der Blase, sobald es länger als vier Sekunden
dauert. Sie sagt nichts Neues, sie beweist nur, dass etwas passiert. "denkt
nach" ohne jede Bewegung sieht nach sechzig Sekunden aus wie eine hängende
App, und der Nutzer schickt die Frage nochmal.

## Der Chat

Die Antwort steht ohne Sprechblase auf dem Grund, in 16,5 Pixeln mit 1,62
Zeilenhöhe. Eine Blase um zehn Zeilen Coaching macht daraus eine Chatnachricht,
und eine Chatnachricht liest man quer. Die eigene Nachricht behält eine Blase,
damit beim Scrollen sichtbar bleibt, wo man selbst gesprochen hat.

Der Assistent steht auf einem Verlauf: oben der dunkle Grundton, unten das
Logoblau, stark abgedunkelt. Der Verlauf endet in der eigenen Farbe, nicht in
einer fremden.

Neben jeder Antwort steht die Marke: das d aus dem Logo, dieselbe Geometrie
wie beim grossen Logo und beim Kreis, in der Markenfarbe mit demselben
Schimmer. Sie steht auch über der Antwort, während sie noch entsteht, und
pulsiert dann. Ein Absender ohne Marke sieht aus wie ein Systemhinweis, und ein
Systemhinweis hat keine Haltung.

Für die Ecken gibt es eine Skala mit vier Stufen, `--r-sm` bis `--r-pill`.
Vorher standen fünfzehn verschiedene Werte zwischen 9 und 20 Pixeln im
Stylesheet, jeder für sich plausibel und zusammen unruhig.

Die Eingabe ist eine Pille statt einer Zeile mit Knöpfen daneben. Alles sitzt in
einem Element, dadurch fällt die Trennlinie über die ganze Breite weg und der
Verlauf läuft bis nach unten durch.

`resize()` im Orb misst nur die Breite und leitet die Höhe daraus ab. Liest man
beide Seiten aus dem Element, hält sich eine einmal zu gross gesetzte Höhe für
immer, weil das Canvas sie selbst erzeugt.

## Muster und Widersprüche

`packages/core/src/muster.ts` rechnet Korrelationen nach Pearson über die
Tagesreihe. Zwei Regeln stehen fest: unter zehn gemeinsamen Tagen wird nichts
behauptet, und jeder Befund sagt dazu, dass ein Zusammenhang keine Ursache ist.
Geprüft wird nicht alles gegen alles, sondern eine feste Liste von Paaren mit
plausibler Richtung, sonst findet sich immer irgendwo ein Zufallstreffer. Neben
dem r steht immer der Vergleich der Drittel, weil den auch jemand lesen kann,
der mit einem Korrelationskoeffizienten nichts anfängt.

`packages/core/src/widerspruch.ts` hält Anspruch gegen Wirklichkeit: Ziele gegen
Durchschnitt, Trainingsplan gegen eingetragene Einheiten, wichtige Aufgaben
gegen ihr Alter, Kundenarbeit gegen Zeit für Aufbau. Genannt wird nur, was
gemessen wurde. Jeder Punkt endet mit einer Frage, nicht mit einem Urteil, und
eine der möglichen Antworten ist immer, das Ziel zu ändern.

`trainingsplanAusKalender` liest aus wiederkehrenden Terminen den echten Plan.
Erkannt wird über Wochentag und Startzeit auf eine Viertelstunde genau, ab drei
Vorkommen. Deshalb reicht der Kalender 60 Tage zurück und nicht 14: ein
wöchentlicher Termin kommt in zwei Wochen nur zweimal vor.

## Aktueller Stand

Fotos, Videos und PDFs gehen in den Chat. Die Aufbereitung steht in
`apps/pwa/js/media.js`, die Auswertung in `packages/coach/src/vision.ts`.
Mengen aus Bildern werden an Bezugsgrössen geschätzt, und die Nährwerte laufen
durch dieselbe Prüfung wie bei der Texteingabe.

Fertig: Rechenkern, Gedächtnis, Assistent mit Werkzeugen, Sprache und Bildern,
Anamnesebogen beim ersten Start, Einkaufsliste, Mindeststandards,
Gewichtsverlauf mit Zielkorrektur, Kalender und Tagesablauf, Morgenbriefing,
Mittags Check-in, Aufgaben mit Priorisierung, Kopf leeren, Balance Board,
Tagesabschluss, Muster über
Wochen, Widerspruchsprüfung, Tag und Nacht
Modus, installierbare Web App, Marke, API, Push Benachrichtigungen bei
geschlossener App, Weckwort bei geöffneter App.
Der Schlüssel lässt sich im Profil prüfen. Zwei Schritte, weil zwei Dinge
schiefgehen können: die Modellliste kostet nichts und zeigt, ob der Schlüssel
gilt, eine winzige Nachricht danach zeigt, ob Guthaben da ist. Ein gültiger
Schlüssel ohne Guthaben ist der häufigste Fall und sah vorher aus wie ein
falscher.

Offen: Apple Health live und Wearables, Weckwort im Hintergrund, Anmeldung über
Apple.
Siehe `docs/ROADMAP.md`.
