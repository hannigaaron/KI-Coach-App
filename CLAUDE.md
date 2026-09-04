# daevo

Diese Datei wird von Claude Code in jeder Sitzung in diesem Repository
automatisch gelesen. Was hier steht, gilt.

## Marke, gilt in jeder Sitzung

Der Name der App lautet **daevo**, immer klein geschrieben, auch am Satzanfang.
Der Claim lautet **Evolve your daily life** und steht unter der Wortmarke.

Die Wortmarke ist zweigeteilt: `dae` in Poppins SemiBold 600, `vo` in
Poppins Light 300. Der Gewichtssprung ist das Erkennungsmerkmal und darf nie
wegfallen.

Das d ist kein Schriftzeichen, sondern gebaut. Die Bowl ist ein Aktivitaetsring
wie bei der Apple Watch: Start oben, 300 Grad im Uhrzeigersinn, runde Enden,
die restlichen 60 Grad bleiben offen. Fuer kleine Groessen gibt es die
Varianten mit gefuellter Spur, sonst faellt der Buchstabe auseinander. Der
Bauplan steht in `docs/BRAND.md`, der Generator in `tools/brand/`.

Farben:

- Logoblau `#96D8F0`, aus dem Logo von Personal Coach Aaron uebernommen.
  Nur auf dunklem Grund fuer Text und Bedienelemente einsetzen, Kontrast dort
  12.05 zu 1. Auf Weiss liegt es bei 1.57 zu 1 und ist fuer Text unbrauchbar.
- Blau dunkel `#1E7FA8` fuer alles Lesbare auf hellem Grund, Kontrast 4.51 zu 1.
- Schwarz `#0B0D10`, Grundton dunkel `#0E1116`, Weiss `#FFFFFF`.

Die Logodateien liegen in `apps/pwa/brand/` und tragen die Schrift als Pfade.
Nie durch neu gesetzten Text ersetzen. Vollstaendige Richtlinie in
`docs/BRAND.md`.

## Was das Projekt ist

Ein digitaler Ernaehrungs- und Fitnesscoach. Er erfasst Mahlzeiten per Sprache
oder Text, rechnet sie gegen die Tagesziele, erinnert zur richtigen Zeit und
baut aus dem Kuehlschrankinhalt eine passende Mahlzeit.

```
packages/core     Rechenkern und Gedaechtnis, ohne Abhaengigkeiten
packages/coach    Assistent mit Werkzeugen, Sprachmodell, Regelpfad
apps/pwa          Installierbare Web App, laeuft ohne Server
apps/api          HTTP API, SQLite, Scheduler
scripts           Build der Web App, lokaler Vorschauserver
tools/brand       Generator fuer die Logodateien
docs              Architektur, Marke, Roadmap, Geschaeftsmodell
```

## Die App oeffnet mit dem Assistenten

Nicht mit Zahlen. Der Kreis aus dem Logo ist die Oberflaeche, darunter das
Gespraech, unten die Eingabe.

Der Kreis liegt in `apps/pwa/js/orb.js` und laeuft auf Canvas. Er besteht aus
rund 4100 Partikeln auf 30 Faeden um einen gedachten Schlauch. Die Geometrie
ist dieselbe wie im Logo. Canvas statt SVG, weil ein paar tausend Punkte pro
Bild in SVG nicht fluessig laufen. Gemessen: 60 Bilder pro Sekunde bei
dreifacher Pixeldichte. Alles andere liegt im Menue. Wer das aendert,
aendert den Kern des Produkts.

Der Assistent hat Werkzeuge und veraendert die App wirklich. Zahlen kommen
immer aus `tagesstand_abrufen`, nie aus dem Modell. Jede Faehigkeit hat einen
Regelpfad in `packages/coach/src/agent.ts`, damit die App ohne Schluessel
benutzbar bleibt.

Das Gedaechtnis liegt in `packages/core/src/memory.ts`. Suche ueber
Wortueberlappung mit inverser Dokumenthaeufigkeit, keine Einbettungen. Es ist
fuer den Nutzer einsehbar und loeschbar.

## Regeln fuer den Code

- Keine Laufzeitabhaengigkeiten. Der Server nutzt `node:http` und `node:sqlite`,
  die Web App laeuft ohne Bundler ueber eine Import Map. Neue Abhaengigkeiten
  brauchen eine Begruendung.
- Kalorien und Makros kommen aus `packages/core`, nie aus dem Sprachmodell.
  Jede Modellantwort wird in `packages/coach/src/validate.ts` gegen
  `kcal = Protein*4 + Fett*9 + Kohlenhydrate*4` geprueft.
- Jede Faehigkeit im Coach Layer braucht einen Offline Pfad. Die App muss ohne
  API Schluessel bedienbar bleiben.
- Kommentare erklaeren das Warum, nicht das Was. Quellen fuer Formeln gehoeren
  in den Code.
- Deutsche Texte in der Oberflaeche und in Kommentaren. Keine Umlaute in
  Codekommentaren und Dokumentation, stattdessen ae, oe, ue, ss.
- Vor jedem Commit `npm test` und `npm run build:pwa`. Beides muss gruen sein.

## Befehle

```bash
npm install
npm test           # 84 Tests
npm run serve:pwa  # Web App auf http://localhost:8080
npm run dev        # API auf http://localhost:8787
npm run build:pwa  # statische Ausgabe nach dist-pages
```

## Veroeffentlichung

Jeder Push auf `main` baut und veroeffentlicht die Web App ueber GitHub Pages.
Der Ablauf steht in `.github/workflows/pages.yml`. Ist ein Test rot, wird nichts
veroeffentlicht. Adresse: https://hannigaaron.github.io/KI-Coach-App/

## Aktueller Stand

Fertig: Rechenkern, Gedaechtnis, Assistent mit Werkzeugen und Sprache,
installierbare Web App, Marke, API.
Offen: Push Benachrichtigungen bei geschlossener App, Apple Health und
Wearables, Wortaktivierung, echte Naehrwertdatenbank, Anmeldung ueber Apple.
Siehe `docs/ROADMAP.md`.
