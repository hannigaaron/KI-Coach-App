# Benachrichtigungen einrichten

Vier Schritte. Danach meldet sich daevo sechsmal am Tag, auch wenn die App
geschlossen ist. Kosten: keine.

## 1. Schlüsselpaar erzeugen

```bash
npm install
npm run build
node scripts/push-schluessel.mjs
```

Heraus kommen zwei Zeichenketten. Die private gehört nirgendwo anders hin als
in ein Secret. Wird das Paar später getauscht, verlieren alle angemeldeten
Geräte ihre Gültigkeit und müssen neu angemeldet werden.

## 2. Secrets im Repository anlegen

GitHub, Settings, Secrets and variables, Actions, New repository secret.

| Name | Inhalt |
| --- | --- |
| `VAPID_PUBLIC` | der öffentliche Schlüssel aus Schritt 1 |
| `VAPID_PRIVATE` | der private Schlüssel aus Schritt 1 |
| `PUSH_KONTAKT` | `mailto:` und deine Adresse |
| `PUSH_ABOS` | kommt in Schritt 3 |

`PUSH_ABOS` lässt sich noch nicht füllen. Leg es trotzdem an, mit `[]`.

## 3. Gerät anmelden

Auf dem iPhone geht Web Push nur aus der installierten App. In Safari selbst
nicht. Also zuerst:

1. Die App in Safari öffnen.
2. Teilen, Zum Home Bildschirm.
3. Die App vom Home Bildschirm starten, nicht aus Safari.

Dann in der App: Menü, Profil, Benachrichtigungen.

1. Den öffentlichen Schlüssel aus Schritt 1 in das Feld eintragen.
2. Benachrichtigungen einschalten. Das iPhone fragt nach der Erlaubnis.
3. Der Text darunter erscheint. Kopieren.

Diesen Text in das Secret `PUSH_ABOS` eintragen, in eckigen Klammern:

```json
[{"endpoint":"https://web.push.apple.com/...","keys":{"p256dh":"...","auth":"..."}}]
```

Mehrere Geräte kommen als Liste hinein, durch Komma getrennt.

## 4. Prüfen

GitHub, Actions, Push Impulse, Run workflow. Bei `art` eine Nachricht wählen,
zum Beispiel `trinken`. Der Lauf dauert etwa eine Minute, danach steht im Log,
wie viele Abos erreicht wurden.

Kommt nichts an, sagt das Log warum:

| Zeile im Log | Bedeutung |
| --- | --- |
| `weg 410` | Das Abo gilt nicht mehr. Gerät neu anmelden, Secret ersetzen. |
| `fehl 403` | Die Schlüssel passen nicht zum Abo. Beide Secrets prüfen. |
| `fehl 400` | Das Abo ist unvollständig kopiert worden. |
| `0 von 0` | `PUSH_ABOS` ist leer. |

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

GitHub startet einen Cron mit fünf bis dreissig Minuten Verzug, gelegentlich
mit mehr. Eine Nachricht um 14:00 kann also um 14:20 ankommen. Genauer geht es
nur mit einem eigenen Server.

## Die Antwort auf die Energiefrage

Ein Tipp auf die Benachrichtigung öffnet den Assistenten mit der Frage. Eine
blosse Zahl von 1 bis 10 als Antwort wird ohne Modell gerechnet, kostet also
nichts und geht auch ohne Schlüssel.

Ab 5 von 10 kommt kein Vorschlag. Darunter prüft daevo in dieser Reihenfolge:
Abstand zur letzten Mahlzeit, Grösse der Mahlzeit, Verhältnis von
Kohlenhydraten zu Protein, getrunkene Menge, Schlafqualität vom Morgen. Jeder
Vorschlag hängt an einer dieser Zahlen. Findet sich keine Ursache, sagt daevo
das und fragt nach, statt eine zu erfinden.
