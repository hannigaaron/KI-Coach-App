# Benachrichtigungen einrichten

Danach meldet sich daevo sechsmal am Tag, auch wenn die App geschlossen ist,
und zwar auf die Minute genau. Kosten: keine.

Der Versand läuft über einen Cloudflare Worker, `workers/push`. Warum nicht
über GitHub Actions: dort startet ein Cron mit fünf bis dreissig Minuten
Verzug, und die Geräte müssten von Hand in ein Secret eingetragen werden.

## Der kurze Weg

Konto auf dash.cloudflare.com anlegen, dann im Projektordner:

```bash
bash scripts/push-einrichten.sh
```

Das Skript macht die sechs Schritte unten in einem Durchgang und nennt am Ende
die Adresse des Workers und das Anmeldewort. Beides trägst du in der App ein.
Ein zweiter Aufruf ist unschädlich: die Schlüssel entstehen nur einmal und
liegen danach in `.push-geheim.json`, das nicht ins Repository geht.

Bleibt das Skript stehen, nennt es den Grund und bricht ab. Zwei Fälle kommen
bei einem frischen Konto vor: die Mailadresse ist noch nicht bestätigt, dann
lehnt Cloudflare das Ausrollen ab, und der Name `daevo-push` ist im Konto
schon vergeben, dann gehört in `wrangler.toml` hinter `name` ein anderer.

Willst du wissen, was das Skript tut, steht darunter jeder Schritt einzeln.

## Der lange Weg

Dieselben Schritte von Hand. Wer das Skript benutzt hat, kann hier aufhören
und bei "Prüfen und Fehler suchen" weiterlesen.

### 1. Cloudflare Konto

Konto anlegen auf dash.cloudflare.com. Der Gratis Tarif reicht. Keine
Kreditkarte nötig.

Dann im Projektordner anmelden:

```bash
npx wrangler login
```

wrangler wird bei Bedarf geladen und nicht ins Projekt installiert. Das
Projekt hat weiterhin keine Laufzeitabhängigkeiten.

### 2. Speicher anlegen

```bash
npx wrangler kv namespace create ABOS
```

Die Ausgabe enthält eine Kennung. Sie kommt in `workers/push/wrangler.toml` an
die Stelle von `HIER_DIE_KENNUNG_EINTRAGEN`.

### 3. Schlüssel erzeugen

```bash
npm install
npm run build
node scripts/push-schluessel.mjs
```

Heraus kommen zwei Zeichenketten. Lass das Fenster offen, du brauchst sie in
Schritt 5.

Wird das Schlüsselpaar später getauscht, verlieren alle angemeldeten Geräte
ihre Gültigkeit und müssen neu angemeldet werden.

### 4. Worker anlegen

```bash
cd workers/push
npx wrangler deploy
```

Das legt den Worker an. Am Ende steht die Adresse, etwa
`https://daevo-push.deinname.workers.dev`. Die brauchst du in Schritt 6.

Erst ausrollen, dann die Geheimnisse. Andersherum fragt wrangler, ob es einen
Worker dieses Namens anlegen soll, und legt einen an, der noch keinen Code
trägt. Das funktioniert zwar auch, verwirrt aber, und der erste Lauf schlägt
dann fehl.

### 5. Schlüssel hinterlegen

Im selben Ordner, einer nach dem anderen:

```bash
npx wrangler secret put VAPID_PUBLIC
npx wrangler secret put VAPID_PRIVATE
npx wrangler secret put ANMELDE_WORT
```

Jedes Mal fragt wrangler nach einem Wert. Für die ersten beiden nimmst du die
Zeichenketten aus Schritt 3, in dieser Reihenfolge.

Das Anmeldewort denkst du dir selbst aus. Es schützt zwei Dinge: das Anmelden
neuer Geräte und das Auslösen einer Probe. Ohne es könnte jeder, der die
Adresse deines Workers kennt, dir den ganzen Tag Nachrichten schicken.

Danach noch einmal ausrollen, damit der Worker die Geheimnisse sieht:

```bash
npx wrangler deploy
```

### 6. Gerät anmelden

Auf dem iPhone geht Web Push nur aus der installierten App. In Safari selbst
nicht. Also zuerst:

1. Die App in Safari öffnen.
2. Teilen, Zum Home Bildschirm.
3. Die App vom Home Bildschirm starten, nicht aus Safari.

Dann in der App: Menü, Profil, Benachrichtigungen.

1. Adresse des Workers eintragen.
2. Anmeldewort eintragen.
3. Benachrichtigungen einschalten. Das iPhone fragt nach der Erlaubnis.
4. Probe schicken. Die Nachricht kommt sofort.

Den öffentlichen Schlüssel musst du nirgends abtippen. Die App holt ihn beim
Anmelden vom Worker.

## Prüfen und Fehler suchen

Der Worker sagt selbst, was er weiss:

```bash
curl https://daevo-push.deinname.workers.dev/stand
```

Antwort: Anzahl angemeldeter Geräte, seine Berliner Zeit, der Plan des Tages.

Live mitlesen, während eine Nachricht rausgeht:

```bash
cd workers/push && npx wrangler tail
```

| Meldung | Bedeutung |
| --- | --- |
| `geraete: 0` | Kein Gerät angemeldet. Schritt 5 wiederholen. |
| `status=401` | Die Schlüssel passen nicht zum Abo. Beide Geheimnisse prüfen. |
| `status=403` | Der Schlüssel im Abo ist ein anderer als der im Worker. Gerät neu anmelden. |
| `status=410` | Das Abo gilt nicht mehr. Der Worker löscht es selbst. |
| `Das Anmeldewort stimmt nicht` | Im Profil steht ein anderes Wort als im Worker. |

Läuft die App nicht auf GitHub Pages, sondern woanders, gehört die Adresse in
`wrangler.toml` unter `HERKUNFT`. Ohne Eintrag lehnt der Browser die Anfragen
ab, und in der App steht "Der Push Worker ist nicht erreichbar".

## Was wann kommt

| Zeit | Nachricht |
| --- | --- |
| 09:00 | Eiweissquelle in jede Mahlzeit |
| 11:00 | Trinken |
| 14:00 | Energie von 1 bis 10 seit der letzten Mahlzeit |
| 16:00 | Shake, falls das Mittagessen ausfiel oder Eiweiss fehlte |
| 18:00 | Stresslevel |
| 21:00 | Fünf Minuten für dich |

Die Zeiten stehen in `packages/core/src/tagesimpulse.ts`. Je Zeitpunkt gibt es
mehrere Formulierungen, die über das Datum wechseln.

Der Cron läuft alle fünfzehn Minuten und schickt nur, wenn die Minute genau
auf einem Impuls liegt. Cloudflare kennt nur UTC, deshalb rechnet der Worker
die Berliner Zeit selbst aus. Sommer und Winterzeit sind damit erledigt.

## Die Antwort auf die Energiefrage

Ein Tipp auf die Benachrichtigung öffnet den Assistenten mit der Frage. Eine
blosse Zahl von 1 bis 10 als Antwort wird ohne Modell gerechnet, kostet also
nichts und geht auch ohne Schlüssel.

Ab 5 von 10 kommt kein Vorschlag. Darunter prüft daevo in dieser Reihenfolge:
Abstand zur letzten Mahlzeit, Grösse der Mahlzeit, Verhältnis von
Kohlenhydraten zu Protein, getrunkene Menge, Schlafqualität vom Morgen. Jeder
Vorschlag hängt an einer dieser Zahlen. Findet sich keine Ursache, sagt daevo
das und fragt nach, statt eine zu erfinden.

## Grenzen des Gratis Tarifs

| Grenze | Wert | Was das hier bedeutet |
| --- | --- | --- |
| Rechenzeit je Lauf | 10 ms | Warten auf das Netz zählt nicht mit. Verschlüsseln und Signieren laufen nativ und liegen weit darunter. |
| Anfragen am Tag | 100.000 | Der Cron braucht 96. |
| Cron Auslöser je Konto | 5 | Einer ist belegt. |
| Schreibvorgänge im Speicher | 1.000 am Tag | Sechs für die Sperre, dazu eines je Anmeldung. |
| Geräte | 50 | Grenze im Code, `MAX_ABOS`. |

Quelle: developers.cloudflare.com, Workers Limits und KV Limits, abgerufen am
10. September 2026.
