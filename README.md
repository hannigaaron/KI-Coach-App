# KI Coach App

Digitaler Ernaehrungs- und Fitnesscoach. Die App erfasst Mahlzeiten per Sprache oder Text,
rechnet sie gegen die Tagesziele, erinnert zur richtigen Zeit und baut aus dem
Kuehlschrankinhalt eine passende Mahlzeit.

## Stand

Milestone 1 ist fertig: Rechenkern, Coach Layer und API laufen, inklusive Tests.
Die Mobile App und der echte Push Versand fehlen noch. Details in `docs/ROADMAP.md`.

## Aufbau

```
packages/core     Rechenkern ohne Abhaengigkeiten: Kalorien, Makros, Erinnerungslogik, Tagesscore
packages/coach    Anbindung an das Sprachmodell plus regelbasierter Offline Fallback
apps/api          HTTP API, SQLite Datenbank, Scheduler, Testkonsole im Browser
docs              Architektur, Roadmap, Geschaeftsmodell
```

Laufzeitabhaengigkeiten: keine. Der Server nutzt `node:http` und `node:sqlite`.
TypeScript ist die einzige Entwicklungsabhaengigkeit.

## Starten

```bash
npm install
npm test
npm run dev
```

Danach `http://localhost:8787` im Browser oeffnen. Dort liegt die Testkonsole:
Konto anlegen, Profil speichern, Mahlzeit diktieren, Tagesstand ansehen.

Ohne `ANTHROPIC_API_KEY` laeuft der Coach im Offline Modus. Er nutzt dann die interne
Referenztabelle in `packages/coach/src/foods.ts`. Alles bleibt bedienbar und testbar.
Mit Key uebernimmt das Sprachmodell die Texterkennung und die Rezeptvorschlaege.
Konfiguration siehe `.env.example`.

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

59 Tests. Sie decken die Energierechnung gegen Handrechnungen ab, den Textparser,
die Pruefung von Modellantworten, die Erinnerungslogik, die API Endpunkte und den Scheduler.

## Grenzen

Die Naehrwerte im Offline Modus stammen aus einer internen Tabelle mit rund
40 Eintraegen. Das ist keine Naehrwertdatenbank. Fuer die Produktion braucht es eine
echte Quelle. Begruendung und Kandidaten stehen in `docs/ARCHITEKTUR.md`.

Die App gibt keine medizinische Beratung. Der geschaetzte Kalorienbedarf ist eine
Formel, kein Messwert. Er muss ueber den Gewichtsverlauf nachjustiert werden.
