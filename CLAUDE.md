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

Der Assistent hat sechsundzwanzig Werkzeuge und verändert die App wirklich. Zahlen
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
npm test           # 266 Tests
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

`packages/core/src/aufgaben.ts` sortiert die offenen Aufgaben. Wichtigkeit zählt
bis 30 Punkte, die Frist bis 60. Damit gewinnt eine Frist heute gegen jede
Wichtigkeit. Was in die freie Zeit passt, kommt auf heute, der Rest sichtbar auf
morgen. Die freie Zeit kommt aus dem Kalender, über `restDesTages`.

Zur Arbeitsgrenze von zehn Stunden: die App misst kein Cortisol und behauptet
nicht, eine Grenze würde es senken. Sie ist eine Regel, damit ein Tag ein Ende
hat. Was nicht belegt ist, wird auch nicht behauptet.

## Aktueller Stand

Fotos, Videos und PDFs gehen in den Chat. Die Aufbereitung steht in
`apps/pwa/js/media.js`, die Auswertung in `packages/coach/src/vision.ts`.
Mengen aus Bildern werden an Bezugsgrössen geschätzt, und die Nährwerte laufen
durch dieselbe Prüfung wie bei der Texteingabe.

Fertig: Rechenkern, Gedächtnis, Assistent mit Werkzeugen, Sprache und Bildern,
Anamnesebogen beim ersten Start, Einkaufsliste, Mindeststandards,
Gewichtsverlauf mit Zielkorrektur, Kalender und Tagesablauf, Morgenbriefing,
Mittags Check-in, Aufgaben mit Priorisierung, Tagesabschluss, Tag und Nacht
Modus, installierbare Web App, Marke, API.
Offen: Push Benachrichtigungen bei geschlossener App, Apple Health und
Wearables, Wortaktivierung, echte Nährwertdatenbank, Anmeldung über Apple.
Siehe `docs/ROADMAP.md`.
