# daevo

Ein Assistent für Ernährung, Training und Alltag. Die App öffnet nicht mit
Zahlen, sondern mit einem Gespräch. Du redest oder tippst, daevo rechnet,
trägt ein, erinnert und merkt sich, was du erzählst.

## Stand

Die App läuft auf dem Handy. Sie wird als Web App über GitHub Pages
veröffentlicht und lässt sich auf den Startbildschirm legen. Einrichtung und
Grenzen stehen in `docs/PWA.md`.

Milestone 1 und 2 sind fertig: Rechenkern, Coach Layer, API und die
installierbare Web App. Der echte Push Versand und die Apple Health Anbindung
brauchen eine native App. Details in `docs/ROADMAP.md`.

Der Claim lautet Evolve your daily life.

## Marke

Name klein geschrieben, Wortmarke mit `dae` fett und `vo` dünn, Logoblau
`#96D8F0` aus dem bestehenden Coaching Logo. Alle Logodateien liegen in
`apps/pwa/brand/` mit der Schrift als Pfade. Die vollständige Richtlinie steht
in `docs/BRAND.md`, die Kurzfassung für Entwicklung in `CLAUDE.md`.

## Aufbau

```
packages/core     Rechenkern und Gedächtnis: Kalorien, Makros, Erinnerungen, Tagesscore, Notizsuche
packages/coach    Assistent mit Werkzeugen, Sprachmodell, regelbasierter Fallback
apps/pwa          Installierbare Web App für Handy und Desktop, läuft ohne Server
apps/pwa/brand    Logodateien, Schrift als Pfade eingebettet
apps/api          HTTP API, SQLite Datenbank, Scheduler, Testkonsole im Browser
scripts           Build der Web App und lokaler Vorschauserver
docs              Architektur, Marke, Roadmap, Geschäftsmodell, Anleitung für die Web App
CLAUDE.md         Kurzfassung der Regeln, wird von Claude Code automatisch gelesen
```

Laufzeitabhängigkeiten: keine. Der Server nutzt `node:http` und `node:sqlite`.
TypeScript ist die einzige Entwicklungsabhängigkeit.

## Starten

Die Web App lokal ansehen:

```bash
npm install
npm test
npm run serve:pwa
```

Danach `http://localhost:8080` im Browser öffnen.

Den API Server starten:

```bash
npm run dev
```

Danach `http://localhost:8787` im Browser öffnen. Dort liegt die Testkonsole:
Konto anlegen, Profil speichern, Mahlzeit diktieren, Tagesstand ansehen.

Ohne `ANTHROPIC_API_KEY` läuft der Coach im Offline Modus. Er nutzt dann die interne
Referenztabelle in `packages/coach/src/foods.ts`. Alles bleibt bedienbar und testbar.
Mit Key übernimmt das Sprachmodell die Texterkennung und die Rezeptvorschläge.
Konfiguration siehe `.env.example`.

## Was die App kann

Der Assistent führt das Gespräch und benutzt dabei Werkzeuge. Er trägt
Mahlzeiten ein, rechnet Wasser mit, ruft den Tagesstand ab, schlägt aus deinem
Vorrat eine Mahlzeit vor, speichert Check-ins und merkt sich alles, was
länger gilt.

Das Gedächtnis liegt in der App. Es ist durchsuchbar, einsehbar und löschbar.
Die Suche läuft über Wortüberlappung mit inverser Dokumenthäufigkeit, ohne
Modell und ohne Vektordatenbank.

Sprache geht in beide Richtungen. Diktat über die Spracherkennung des
Browsers, Antworten werden vorgelesen. Auf dem iPhone nur in Safari.

Ohne API Schlüssel übernimmt ein regelbasierter Pfad. Er versteht Mengen,
Zahlwörter und einfache Absichten und ruft dieselben Werkzeuge auf.

## API

| Methode | Pfad | Zweck |
| --- | --- | --- |
| POST | `/api/users` | Konto anlegen, gibt das Token zurück |
| PUT | `/api/me/profile` | Profil setzen, liefert Ziele zurück |
| GET | `/api/me/targets` | Tagesziele und Energieberechnung |
| POST | `/api/me/meals` | Mahlzeit als Text erfassen |
| GET | `/api/me/day` | Tagesstand mit Summen, Restbudget und Score |
| POST | `/api/me/water` | Trinkmenge nachtragen |
| POST | `/api/me/checkins` | Check-in mit Energie, Stimmung, Schlaf |
| GET | `/api/me/reminders` | Erinnerungsplan des Tages |
| GET und PUT | `/api/me/fridge` | Kühlschrankinhalt lesen und setzen |
| POST | `/api/me/suggest-meal` | Mahlzeit aus Vorrat und Restbudget |
| POST | `/api/me/health` | Daten aus Apple Health übernehmen |
| POST | `/api/me/devices` | Gerät für Push registrieren |

Alle Routen ausser `POST /api/users` und `GET /health` brauchen den Header
`Authorization: Bearer <token>`.

## Tests

```bash
npm test
```

84 Tests. Sie decken die Energierechnung gegen Handrechnungen ab, den Textparser,
die Prüfung von Modellantworten, das Gedächtnis, die Werkzeugschleife des
Assistenten, den Regelpfad, die Erinnerungslogik, die API Endpunkte und den Scheduler.

## Grenzen

Die Nährwerte im Offline Modus stammen aus einer internen Tabelle mit rund
40 Einträgen. Das ist keine Nährwertdatenbank. Für die Produktion braucht es eine
echte Quelle. Begründung und Kandidaten stehen in `docs/ARCHITEKTUR.md`.

Die App gibt keine medizinische Beratung. Der geschätzte Kalorienbedarf ist eine
Formel, kein Messwert. Er muss über den Gewichtsverlauf nachjustiert werden.
