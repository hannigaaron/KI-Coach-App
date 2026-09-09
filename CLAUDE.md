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
apps/pwa          Installierbare Web App, läuft ohne Server
apps/api          HTTP API, SQLite, Scheduler
scripts           Build der Web App, lokaler Vorschauserver
tools/brand       Generator für die Logodateien
docs              Architektur, Marke, Roadmap, Geschäftsmodell
```

## Die App öffnet mit dem Assistenten

Nicht mit Zahlen. Der Kreis aus dem Logo ist die Oberfläche, darunter das
Gespräch, unten die Eingabe.

Der Kreis liegt in `apps/pwa/js/orb.js` und läuft auf Canvas. Er besteht aus
rund 4100 Partikeln auf 30 Fäden um einen gedachten Schlauch. Die Geometrie
ist dieselbe wie im Logo. Canvas statt SVG, weil ein paar tausend Punkte pro
Bild in SVG nicht flüssig laufen. Gemessen: 60 Bilder pro Sekunde bei
dreifacher Pixeldichte. Alles andere liegt im Menue. Wer das ändert,
ändert den Kern des Produkts.

Der Assistent hat fuenfunddreissig Werkzeuge und verändert die App wirklich. Zahlen
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

## Befehle

```bash
npm install
npm test           # 450 Tests
npm run serve:pwa  # Web App auf http://localhost:8080
npm run dev        # API auf http://localhost:8787
npm run build:pwa  # statische Ausgabe nach dist-pages
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

Der grössere Teil des Roboterklangs kommt nicht von der Stimme, sondern vom
Text. `stripForSpeech` setzt Punkte an Zeilenenden, damit die Engine Luft holt,
löst Abkürzungen auf und schreibt Uhrzeiten aus. Ohne das wird "14:30" zu
"vierzehn Doppelpunkt dreissig". Tempo 0,96 und Tonhöhe 0,95 liegen knapp unter
dem Standard: die Voreinstellung klingt gehetzt, und gehetzt klingt maschinell.

Eine wirklich menschliche Stimme geht mit der Web Speech API nicht. Dafür
braucht es eine externe Sprachsynthese, einen weiteren Schlüssel und laufende
Kosten. Siehe `docs/ROADMAP.md`.

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

Welche Mahlzeit schon gegessen wurde, erkennt `gegesseneArten` an der Uhrzeit
des Eintrags, nicht an seinem Text. Wer um 13 Uhr etwas einträgt, hat Mittag
gegessen, egal wie er es nennt. Ein zweiter Eintrag im selben Fenster gilt als
dieselbe Mahlzeit: wer nachlegt, isst nicht zweimal zu Mittag.

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

## Das Menue

Fünf Einträge statt vierzehn: Assistent, Ernährung, Coaching, Planung und
Struktur, Profil. Die drei mittleren klappen ihre Unterpunkte auf, immer nur
eine Gruppe. Eine Liste aus vierzehn gleich aussehenden Zeilen zwingt dazu,
jedes Mal alle zu lesen.

Die Kennzahlen oben auf Heute sind antippbar und führen in die Ansicht dahinter.
Ernährung führt auf den Essen Reiter, dort steht der Fotoknopf direkt neben der
Texteingabe. Eine Zahl, auf die man tippen kann, spart den Umweg über das Menue.

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
Modus, installierbare Web App, Marke, API.
Der Schlüssel lässt sich im Profil prüfen. Zwei Schritte, weil zwei Dinge
schiefgehen können: die Modellliste kostet nichts und zeigt, ob der Schlüssel
gilt, eine winzige Nachricht danach zeigt, ob Guthaben da ist. Ein gültiger
Schlüssel ohne Guthaben ist der häufigste Fall und sah vorher aus wie ein
falscher.

Offen: Push Benachrichtigungen bei geschlossener App, Apple Health und
Wearables, Wortaktivierung, Anmeldung über Apple.
Siehe `docs/ROADMAP.md`.
