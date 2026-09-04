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

Der Assistent hat siebzehn Werkzeuge und verändert die App wirklich. Zahlen
über den Nutzer kommen immer aus Werkzeugen, nie aus dem Modell. Allgemeines
Wissen darf und soll er benutzen, dafür braucht er kein Werkzeug. Jede
Fähigkeit hat einen Regelpfad in `packages/coach/src/agent.ts`, damit die App
ohne Schlüssel benutzbar bleibt.

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
npm test           # 148 Tests
npm run serve:pwa  # Web App auf http://localhost:8080
npm run dev        # API auf http://localhost:8787
npm run build:pwa  # statische Ausgabe nach dist-pages
```

## Veröffentlichung

Jeder Push auf `main` baut und veröffentlicht die Web App über GitHub Pages.
Der Ablauf steht in `.github/workflows/pages.yml`. Ist ein Test rot, wird nichts
veröffentlicht. Adresse: https://hannigaaron.github.io/KI-Coach-App/

## Aktueller Stand

Fertig: Rechenkern, Gedächtnis, Assistent mit Werkzeugen und Sprache,
Anamnesebogen beim ersten Start, Einkaufsliste, Mindeststandards,
Gewichtsverlauf mit Zielkorrektur, Tag und Nacht Modus, installierbare Web App,
Marke, API.
Offen: Push Benachrichtigungen bei geschlossener App, Apple Health und
Wearables, Wortaktivierung, echte Nährwertdatenbank, Anmeldung über Apple.
Siehe `docs/ROADMAP.md`.
