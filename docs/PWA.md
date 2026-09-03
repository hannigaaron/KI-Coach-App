# App aufs Handy bringen

Die App laeuft als Web App auf GitHub Pages. Kein App Store, keine Installation,
kein Server. Du oeffnest eine Adresse im Browser und legst sie auf den
Startbildschirm. Danach sieht sie aus und verhaelt sich wie eine App.

## Einrichtung

Ein Schritt bleibt von Hand zu machen. Er geht nicht ueber den Workflow:

1. Im Repository auf `Settings`, dann `Pages`.
2. Unter `Build and deployment` bei `Source` den Punkt `GitHub Actions` waehlen.

Danach veroeffentlicht jeder Push auf `main` automatisch.

### Warum das nicht automatisch geht

Der Versuch, Pages ueber `actions/configure-pages` mit `enablement: true`
einzuschalten, scheitert mit `Create Pages site failed. Resource not accessible
by integration`. Der Token, den GitHub einem Workflow gibt, darf keine Pages
Seite anlegen. Das ist eine Grenze der Berechtigungen, kein Fehler im Ablauf.

### Wenn der Punkt Pages fehlt oder gesperrt ist

Dieses Repository ist privat. GitHub schreibt zur Veroeffentlichung aus
privaten Repositories: "GitHub Pages sites are publicly available on the
internet, even if the repository for the site is private (if your plan or
organization allows it)." Ob dein Tarif es erlaubt, steht in der Einstellung
selbst. Ist der Punkt gesperrt, gibt es zwei Wege:

- Das Repository oeffentlich stellen. Pages ist dann in jedem Tarif verfuegbar.
  Der Quelltext ist danach fuer jeden lesbar. Schluessel liegen keine im
  Repository, der Anthropic Schluessel wird nur im Browser des Nutzers
  gespeichert.
- Den Tarif erhoehen oder einen anderen Hoster nehmen. Netlify, Vercel und
  Cloudflare Pages veroeffentlichen auch aus privaten Repositories und sind
  fuer dieses Projekt kostenlos. Sie brauchen ein eigenes Konto und den Zugriff
  auf das Repository.

Ausgabeordner fuer alle Hoster ist `dist-pages`, der Befehl lautet
`npm run build:pwa`.

Der Ablauf steht in `.github/workflows/pages.yml`. Er laeuft die Tests, baut die
statischen Dateien und schiebt sie auf Pages. Ist ein Test rot, wird nichts
veroeffentlicht.

Die Adresse lautet danach:

```
https://hannigaaron.github.io/KI-Coach-App/
```

Den ersten Lauf siehst du im Reiter `Actions`. Er dauert etwa eine Minute.

## Auf dem iPhone installieren

1. Adresse in Safari oeffnen. Safari ist Pflicht, Chrome auf iOS kann das nicht.
2. Unten auf das Teilen Symbol tippen.
3. `Zum Home-Bildschirm` waehlen.
4. Die App startet ab jetzt im Vollbild ohne Browserleiste.

Auf Android geht das in Chrome ueber das Menue und `App installieren`.

## Was die App kann

- Onboarding mit Koerperdaten und Ziel, danach stehen deine Tageswerte fest
- Mahlzeiten per Text oder Diktat erfassen, die App rechnet Kalorien und Makros
- Wasser mit einem Tipp nachtragen
- Tagesansicht mit Ring, Makrobalken und Serie
- Erinnerungsplan fuer den Tag, abgestimmt auf deine Trainingszeiten
- Kuehlschrankvorschlag aus dem Restbudget
- Check-in mit Energie, Schlaf und Notiz
- Training eintragen, danach kommen Erinnerungen vor und nach der Einheit
- Datenexport als JSON

## Was die App noch nicht kann

**Push Benachrichtigungen, wenn die App geschlossen ist.** Eine Web App auf dem
iPhone kann keine Erinnerung zu einer festen Uhrzeit ausloesen, ohne dass ein
Server sie schickt. Der Erinnerungsplan wird deshalb in der App angezeigt, aber
nicht aufs Sperrbildschirm geschoben. Dafuer braucht es entweder Web Push mit
einem Server oder die native App aus Milestone 2.

**Apple Health.** Der Zugriff auf Schritte, Schlaf und Gewicht laeuft nur ueber
eine native App. In der Web App traegst du deine Schritte im Profil selbst ein.

**Synchronisation zwischen Geraeten.** Alle Daten liegen im Speicher deines
Browsers. Wechselst du das Geraet, faengst du bei null an. Nutze vorher den
Export im Profil.

## daevo aktivieren

Ohne Schluessel rechnet die App mit einer internen Tabelle von rund 40
Lebensmitteln. Das reicht fuer Standardessen und funktioniert sofort.

Mit einem eigenen Anthropic Schluessel versteht die App freien Text
(`gestern Abend war ich beim Italiener und hatte eine Pizza Salami`) und baut
echte Rezepte aus deinem Kuehlschrank.

So geht es:

1. Schluessel unter https://console.anthropic.com erstellen.
2. In der App auf `Profil`, Abschnitt `daevo aktivieren`, Schluessel einfuegen,
   speichern.

Der Schluessel wird nur im Speicher deines Browsers abgelegt und direkt an
Anthropic geschickt. Er steht nicht im Quelltext der Website und ist fuer andere
Besucher der Seite nicht sichtbar.

Trotzdem gilt: das ist eine Loesung fuer deine eigenen Tests. Anthropic
beschreibt den Browserzugriff ausdruecklich als riskant und nennt Entwicklung
und interne Werkzeuge als vertretbare Faelle. Sobald andere Menschen die App
nutzen, gehoert der Schluessel auf einen Server, sonst zahlst du deren
Nutzung mit deinem Konto. Quelle: die Anthropic Dokumentation zum TypeScript
SDK, Abschnitt Browser usage.

## Kosten im Blick behalten

Jede Erfassung per KI ist ein Modellaufruf. Bei Sonnet 5 kostet eine typische
Mahlzeitenerfassung Bruchteile eines Cents, aber es summiert sich. Setze dir in
der Anthropic Console ein Ausgabenlimit, bevor du den Schluessel eintraegst.

## Lokal testen

```bash
npm install
npm run serve:pwa
```

Danach `http://localhost:8080` oeffnen.
