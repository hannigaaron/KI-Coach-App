# daevo

Ein Assistent fuer Ernaehrung, Training und Alltag. Die App oeffnet nicht mit
Zahlen, sondern mit einem Gespraech. Du redest oder tippst, daevo rechnet,
traegt ein, erinnert und merkt sich, was du erzaehlst.

## Stand

Die App laeuft auf dem Handy. Sie wird als Web App ueber GitHub Pages
veroeffentlicht und laesst sich auf den Startbildschirm legen. Einrichtung und
Grenzen stehen in `docs/PWA.md`.

Milestone 1 und 2 sind fertig: Rechenkern, Coach Layer, API und die
installierbare Web App. Der echte Push Versand und die Apple Health Anbindung
brauchen eine native App. Details in `docs/ROADMAP.md`.

Der Claim lautet Evolve your daily life.

## Marke

Name klein geschrieben, Wortmarke mit `dae` fett und `vo` duenn, Logoblau
`#96D8F0` aus dem bestehenden Coaching Logo. Alle Logodateien liegen in
`apps/pwa/brand/` mit der Schrift als Pfade. Die vollstaendige Richtlinie steht
in `docs/BRAND.md`, die Kurzfassung fuer Entwicklung in `CLAUDE.md`.

## Aufbau

```
packages/core     Rechenkern und Gedaechtnis: Kalorien, Makros, Erinnerungen, Tagesscore, Notizsuche
packages/coach    Assistent mit Werkzeugen, Sprachmodell, regelbasierter Fallback
apps/pwa          Installierbare Web App fuer Handy und Desktop, laeuft ohne Server
apps/pwa/brand    Logodateien, Schrift als Pfade eingebettet
apps/api          HTTP API, SQLite Datenbank, Scheduler, Testkonsole im Browser
scripts           Build der Web App und lokaler Vorschauserver
docs              Architektur, Marke, Roadmap, Geschaeftsmodell, Anleitung fuer die Web App
CLAUDE.md         Kurzfassung der Regeln, wird von Claude Code automatisch gelesen
```

Laufzeitabhaengigkeiten: keine. Der Server nutzt `node:http` und `node:sqlite`.
TypeScript ist die einzige Entwicklungsabhaengigkeit.

## Starten

Die Web App lokal ansehen:

```bash
npm install
npm test
npm run serve:pwa
```

Danach `http://localhost:8080` im Browser oeffnen.

Den API Server starten:

```bash
npm run dev
```

Danach `http://localhost:8787` im Browser oeffnen. Dort liegt die Testkonsole:
Konto anlegen, Profil speichern, Mahlzeit diktieren, Tagesstand ansehen.

Ohne `ANTHROPIC_API_KEY` laeuft der Coach im Offline Modus. Er nutzt dann die interne
Referenztabelle in `packages/coach/src/foods.ts`. Alles bleibt bedienbar und testbar.
Mit Key uebernimmt das Sprachmodell die Texterkennung und die Rezeptvorschlaege.
Konfiguration siehe `.env.example`.

## Was die App kann

Der Assistent fuehrt das Gespraech und benutzt dabei Werkzeuge. Er traegt
Mahlzeiten ein, rechnet Wasser mit, ruft den Tagesstand ab, schlaegt aus deinem
Vorrat eine Mahlzeit vor, speichert Check-ins und merkt sich alles, was
laenger gilt.

Das Gedaechtnis liegt in der App. Es ist durchsuchbar, einsehbar und loeschbar.
Die Suche laeuft ueber Wortueberlappung mit inverser Dokumenthaeufigkeit, ohne
Modell und ohne Vektordatenbank.

Sprache geht in beide Richtungen. Diktat ueber die Spracherkennung des
Browsers, Antworten werden vorgelesen. Auf dem iPhone nur in Safari.

Ohne API Schluessel uebernimmt ein regelbasierter Pfad. Er versteht Mengen,
Zahlwoerter und einfache Absichten und ruft dieselben Werkzeuge auf.

## API

| Methode | Pfad | Zweck |
| --- | --- | --- |
| POST | `/api/users` | Konto anlegen, gibt das Token zurueck |
| PUT | `/api/me/profile` | Profil setzen, liefert Ziele zurueck |
| GET | `/api/me/targets` | Tagesziele und Energieberechnung |
| POST | `/api/me/meals` | Mahlzeit als Text erfassen |
| GET | `/api/me/day` | Tagesstand mit Summen, Restbudget und Score |
| POST | `/api/me/water` | Trinkmenge nachtragen |
| POST | `/api/me/checkins` | Check-in mit Energie, Stimmung, Schlaf |
| GET | `/api/me/reminders` | Erinnerungsplan des Tages |
| GET und PUT | `/api/me/fridge` | Kuehlschrankinhalt lesen und setzen |
| POST | `/api/me/suggest-meal` | Mahlzeit aus Vorrat und Restbudget |
| POST | `/api/me/health` | Daten aus Apple Health uebernehmen |
| POST | `/api/me/devices` | Geraet fuer Push registrieren |

Alle Routen ausser `POST /api/users` und `GET /health` brauchen den Header
`Authorization: Bearer <token>`.

## Tests

```bash
npm test
```

84 Tests. Sie decken die Energierechnung gegen Handrechnungen ab, den Textparser,
die Pruefung von Modellantworten, das Gedaechtnis, die Werkzeugschleife des
Assistenten, den Regelpfad, die Erinnerungslogik, die API Endpunkte und den Scheduler.

## Grenzen

Die Naehrwerte im Offline Modus stammen aus einer internen Tabelle mit rund
40 Eintraegen. Das ist keine Naehrwertdatenbank. Fuer die Produktion braucht es eine
echte Quelle. Begruendung und Kandidaten stehen in `docs/ARCHITEKTUR.md`.

Die App gibt keine medizinische Beratung. Der geschaetzte Kalorienbedarf ist eine
Formel, kein Messwert. Er muss ueber den Gewichtsverlauf nachjustiert werden.
