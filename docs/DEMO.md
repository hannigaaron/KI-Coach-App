# Die Fassung für Nutzer

Zwei Fassungen aus einer Quelle. `npm run build:pwa` baut die
Entwicklerfassung nach `dist-pages`, `npm run build:demo` die Fassung für
Nutzer nach `dist-demo`.

Der Unterschied ist nicht kosmetisch. In der Entwicklerfassung trägt der
Nutzer alles selbst ein: Anthropic Schlüssel, Adresse des Push Workers,
Anmeldewort, Coaching Angebot, Trainingsplan Vorlagen. Das ist richtig,
solange Nutzer und Betreiber dieselbe Person sind. Für jeden anderen ist es
eine Hürde vor dem Produkt: wer die App lädt, hat keinen Schlüssel, kennt
keinen Worker und will keinen Buchungslink eintragen, sondern den Coach
dahinter buchen.

## Der Schlüssel gehört nicht in die App

Eine statische Web App liefert ihren gesamten Code an jeden Besucher aus. Ein
eingebauter Schlüssel steht damit im Klartext im Netz. Anthropic durchsucht
öffentliche Quellen und sperrt gefundene Schlüssel, und bis dahin zahlt der
Betreiber fremde Aufrufe.

Deshalb läuft die Fassung für Nutzer über den Push Worker. Er hält den
Schlüssel als Geheimnis, die App fragt ihn statt Anthropic, im Browser liegt
nichts. Nachgewiesen: die App schickt ihre Anfrage an `/chat` des Workers,
ohne `x-api-key` und ohne den Kopf für den Direktzugriff.

Das ist dieselbe Bauweise, die eine native App später braucht. Kein Umweg für
die Demo, sondern der erste Schritt dorthin.

## Einrichten

Einmalig, auf dem Rechner mit dem Cloudflare Zugang:

```bash
cd workers/push
npx wrangler secret put ANTHROPIC_KEY
npx wrangler deploy
```

Danach `demo.config.json` im Wurzelverzeichnis ausfüllen und bauen:

```bash
npm run build:demo
```

In `demo.config.json` steht nichts Geheimes. Die Adresse des Workers ist
öffentlich, der Schlüssel liegt auf dem Worker. Das Anmeldewort gehört nicht
hinein: es steht in `.push-geheim.json` und geht nie in einen Build. Der Build
bricht ab, wenn er in der Konfiguration etwas findet, das nach einem Schlüssel
aussieht.

## Was den Schlüssel schützt

Drei Ebenen in `workers/push/src/chat.ts`, und keine davon reicht allein.

Die Herkunft. Ein Browser schickt sie mit und kann sie nicht fälschen. Das
hält jede fremde Webseite ab, aber kein Skript ausserhalb eines Browsers.

Eine Obergrenze je Tag, 400 Anfragen. Sie begrenzt den Schaden, wenn die
Adresse doch bekannt wird, statt ihn zu verhindern. Eine Grenze, die den
Schaden deckelt, ist mehr wert als ein Schutz, der im Ernstfall ganz versagt.

Eine Obergrenze je Gerät und Stunde, 40 Anfragen. Ein Besucher, der die Demo
in Ruhe ausprobiert, bleibt weit darunter. Wer sie automatisiert abgreift,
läuft dagegen.

Was das nicht ist: ein Ersatz für ein Konto. Sobald echte Kunden zahlen,
gehört hier eine Anmeldung hin und die Grenze ans Konto. Bis dahin gilt: setz
in der Anthropic Console ein Ausgabenlimit. Das ist die einzige Grenze, die
auch dann hält, wenn alles andere versagt.

## Was in der Fassung für Nutzer verschwindet

Markiert im HTML mit `data-betreiber`, ausgeblendet von `konfigAnwenden` in
`apps/pwa/js/app.js`. Gelöscht wird nichts: eine Quelle, zwei Fassungen.

- Freihändig ansprechen, also der Siri Kurzbefehl auf den eigenen Worker
- Adresse des Push Workers und Anmeldewort
- Dein Coaching Angebot samt Trainingsplan Vorlagen
- Anthropic Schlüssel, Modellwahl, Schlüssel prüfen
- Was daevo kostet

Dazu zwei Texte, die nur in der Entwicklerfassung stimmen. Der Menüeintrag
zum Profil nennt dort Schlüssel und Kosten, in der Fassung für Nutzer Stimme
und Erinnerungen: ein Menü, das auf etwas hinweist, das die Seite nicht
enthält, schickt den Leser suchen. Und der Hinweis unter der Denkstufe sagt
nur dem Betreiber, dass gründlicher auch teurer ist. Wer die App geladen hat,
zahlt nichts je Nachricht, er wartet nur länger, und ein Hinweis auf Kosten
wäre dort schlicht falsch.

Geprüft wird das nicht durch Lesen. Ein Skript öffnet jede Ansicht der
gebauten Fassung und sucht den sichtbaren Text nach Betreiberwörtern ab:
Kosten, Schlüssel, API, Anthropic, Worker, Anmeldewort, Kurzbefehl, wrangler,
Cloudflare, Modellnamen. Genau so sind die beiden Texte oben gefunden worden,
nachdem die Abschnitte schon ausgeblendet waren.

Was bleibt, gehört dem Nutzer: Körper und Ziel, Tagesablauf, Stimme,
Benachrichtigungen ein und aus, Training, wie gründlich daevo denkt, Tonfall,
Aussehen, Sprache, Sicherung, Daten löschen.

Die Werte werden bei jedem Start gesetzt, nicht nur beim ersten. Ändert der
Betreiber seine Worker Adresse und liefert eine neue Fassung aus, greift sie
auch bei denen, die die App schon benutzen. Was der Nutzer selbst gesetzt hat,
bleibt unangetastet.
