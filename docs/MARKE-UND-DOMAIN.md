# Marke und Domain

Stand: 19. Oktober 2026. Was besprochen und entschieden ist, damit nichts
davon nur im Chat steht.

## Entscheidungen

- SOLUTa läuft als Einzelunternehmen. Ein Einzelunternehmen ist rechtlich
  die Person selbst. Die Marke wird deshalb auf den eigenen Namen angemeldet
  und gehört damit zum Gewerbe. Wird später eine GmbH oder UG gegründet, wird
  die Marke übertragen.
- Die Marke wird jetzt angemeldet und nicht erst 2027. Der Rang hängt am Tag
  der Anmeldung, und der Name ist über GitHub Pages und die Demo schon
  öffentlich.
- Im App Store tritt ein Einzelunternehmer als Einzelperson auf. Als
  Organisation nimmt Apple nur eingetragene Gesellschaften mit D-U-N-S
  Nummer auf. Als Anbieter steht dann der eigene Name und nicht SOLUTa.

## Gewerbe und Marke sind zwei Dinge

Die Gewerbeanmeldung meldet die Tätigkeit bei der Stadt, für Steuern,
Rechnungen und Impressum. Sie schützt keinen Namen.

Die Marke gibt ab dem Anmeldetag ein Recht am Namen in ganz Deutschland, für
die eingetragenen Klassen. Schutzdauer 10 Jahre, verlängerbar. Apple und
Instagram akzeptieren eine eingetragene Marke als Nachweis gegen Nachahmer.

Ohne Anmeldung kann für eine App ein Werktitelschutz entstehen, aber erst mit
dem Start am Markt, schwächer und schwerer durchzusetzen. Eine früher
angemeldete Marke hat Vorrang.

## Gebühren beim DPMA

Nach Stand Oktober 2026, vor dem Zahlen auf dpma.de prüfen:

- Online Anmeldung 290 Euro, bis zu 3 Klassen enthalten.
- Jede weitere Klasse 100 Euro.
- Eine einzelne Klasse kostet dasselbe wie drei. Weniger Klassen sparen nichts.

EU Marke bei EUIPO: 850 Euro für eine Klasse, 50 Euro für die zweite, 150
Euro für jede weitere. Erst nötig bei Verkauf ausserhalb Deutschlands. Nach
der deutschen Anmeldung gibt es 6 Monate Priorität für eine EU Anmeldung.

Die Gebühr ist voraussichtlich als vorweggenommene Betriebsausgabe
absetzbar. Mit dem Steuerberater klären.

## Die Anmeldung

Über DPMAdirektWeb auf dpma.de.

- Markenform: Wortmarke. Sie schützt den Namen in jeder Schrift, das Logo
  ist dafür nicht nötig.
- Marke: daevo
- Anmelder: Vor- und Nachname mit Adresse

Waren und Dienstleistungen. Im Formular in der Klassifikationsdatenbank
suchen und den nächstliegenden Eintrag wählen. Einträge aus der Datenbank
nimmt das Amt ohne Rückfrage an, freier Text kann eine Nachfrage auslösen.
Ob jeder Begriff dort wortgleich steht, ist nicht geprüft.

Klasse 9
- Herunterladbare Computersoftware
- Herunterladbare Anwendungssoftware für Mobiltelefone
- Herunterladbare Software zur Erfassung und Auswertung von Ernährungsdaten,
  Fitnessdaten und Gesundheitsdaten

Klasse 41
- Coaching [Ausbildung]
- Personal Training [Fitnesstraining]
- Durchführung von Fitnesskursen
- Erteilung von Sportunterricht und Fitnessunterricht
- Bereitstellung von Informationen über Fitness und Training

Klasse 42, optional für 100 Euro. Die KI läuft über den eigenen Server und
ist damit ein Online Dienst.
- Bereitstellung von Software als Dienstleistung [SaaS]
- Bereitstellung von nicht herunterladbarer Software online

Klasse 44
- Ernährungsberatung
- Beratung in Bezug auf Diäten
- Bereitstellung von Informationen über Gesundheit und Wohlbefinden

Empfehlung: alle vier für 390 Euro. Sparvariante: 9, 41 und 44 für 290 Euro.

Ablauf danach: Anmeldetag steht sofort fest. Prüfung einige Monate, dann
Eintragung und Veröffentlichung, danach 3 Monate Widerspruchsfrist. Das DPMA
prüft nicht, ob es ältere ähnliche Marken gibt. Ähnlich klingende Namen
zählen auch.

Aktenzeichen: [nach dem Absenden eintragen]

## Domains

- daevo.de bei einem deutschen Anbieter, etwa INWX. Cloudflare bietet .de
  nicht an.
- daevo.app, auch bei Cloudflare möglich. Läuft nur mit HTTPS, das erfüllt
  Cloudflare Pages.
- Grob 5 bis 20 Euro im Jahr je Domain, genauer Preis beim Anbieter.

Dazu kostenlos sichern: @daevo oder @daevo.app auf Instagram und TikTok, eine
Adresse wie hallo@daevo.app über Cloudflare Email Routing.

Nach der Registrierung im Code umstellen:
- Website und Demo auf die Domain über Cloudflare Pages.
- Neue Adresse in `HERKUNFT` im Worker, sonst weist er die App ab.
- Domain und Adresse in `docs/DATENSCHUTZ-ENTWURF.md` und ins Impressum.

## Impressum

Das Impressum braucht eine Adresse, unter der Post zugestellt werden kann.
Ohne eigene Geschäftsadresse steht dort die Wohnadresse öffentlich. Ob ein
Dienst für Geschäftsadressen dafür reicht, ist nicht geprüft und gehört zur
rechtlichen Prüfung der Datenschutzerklärung.

## Änderungen an der iPhone App

1. Änderung im Chat beschreiben, Claude ändert den Code, testet und lädt ihn
   auf GitHub hoch.
2. Auf GitHub mergen, oder Claude darum bitten.
3. Am Mac im Projektordner: `git stash`, `git pull`, `git stash pop`. Stash
   und pop schützen die lokale `workers/push/wrangler.toml`.
4. `npm run ios`, iPhone anstecken, in Xcode auf Play.

Mit kostenloser Apple ID läuft die App 7 Tage und wird danach auf demselben
Weg neu aufgespielt. Die Daten bleiben, solange die App nicht gelöscht wird.
Worker, Website und Web App brauchen kein Xcode. Fehler aus Xcode als
Screenshot oder kopierten Text an Claude schicken.
