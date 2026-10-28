# Abo, Testphase und Anmeldung einrichten

Stand: 27. Oktober 2026. Der Code ist fertig. Was hier steht, kann nur der
Betreiber in den Konten bei Apple, Google, Stripe und Cloudflare anlegen.

## 1. Testphase erst mit Abo

Der Worker kennt zwei Formen. Ohne Einstellung bekommt jedes neue Konto
sieben Tage KI ohne Abo, wie bisher. Mit `TESTPHASE=abo` startet ein neues
Konto ohne KI, und die sieben Tage beginnen mit dem abgeschlossenen Abo.
Der Nutzer zahlt ab Tag 8 und kann bis Tag 7 kostenlos kündigen.

Erst einschalten, wenn App Store oder Stripe wie unten eingerichtet sind.
Sonst kann niemand die Testphase starten.

In `workers/push/wrangler.toml` unter `[vars]`:

```toml
TESTPHASE = "abo"
```

Danach `cd workers/push && npx wrangler deploy`.

Bestehende Konten bleiben, wie sie sind. Dein eigenes Pro bleibt Pro.

## 2. App Store (iPhone App)

1. Apple Developer Program, 99 US Dollar im Jahr.
2. In App Store Connect die App mit der Bundle ID `de.daevo.app` anlegen.
3. Unter Abonnements eine Gruppe "daevo" mit vier Abos:
   `de.daevo.plus.monat`, `de.daevo.plus.jahr`, `de.daevo.pro.monat`,
   `de.daevo.pro.jahr`. Preise wie in der App: 9,99, 79,99, 19,99, 159,99 Euro.
4. Je Abo ein Einführungsangebot: Kostenlos, Dauer 1 Woche.
5. Unter App Informationen, App Store Server Notifications, Fassung 2, für
   Produktion und Sandbox dieselbe Adresse:
   `https://daevo-push.ittaste.workers.dev/appstore/meldung`
6. In Xcode unter Signing und Capabilities: "In-App Purchase" und "Sign in
   with Apple" hinzufügen. Beides geht nur mit dem bezahlten Programm.

Andere Kennungen als oben trägst du in `demo.config.json` unter
`abo.appstore` ein und im Worker als `APPSTORE_PRODUKTE`, etwa
`"de.daevo.plus.monat:plus,de.daevo.pro.monat:pro"`.

Testen: in Xcode unter Product, Scheme, Edit Scheme, Run, Options eine
StoreKit Configuration anlegen, oder mit einem Sandbox Konto aus App Store
Connect. Ein Sandbox Kauf prüft der Server genauso wie ein echter.

## 3. Stripe (Browser)

1. In Stripe zwei Produkte, Plus und Pro, mit je einem Preis monatlich und
   jährlich. Beim Preis den Lookup Key setzen, etwa `daevo_plus_monat`.
   Das Wort plus oder pro darin bestimmt die Stufe.
2. Je Preis einen Payment Link mit "Kostenlose Testphase 7 Tage". Die
   Zahlungsart wird dabei gleich erfasst, abgebucht wird ab Tag 8.
3. Die vier Links in `demo.config.json` unter `abo.plusUrl`,
   `abo.plusJahrUrl`, `abo.proUrl`, `abo.proJahrUrl`. Den Link zum
   Kundenportal unter `abo.portalUrl`, damit "Abo verwalten" funktioniert.
4. Unter Entwickler, Webhooks einen Endpunkt anlegen:
   `https://daevo-push.ittaste.workers.dev/stripe` mit den Ereignissen
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
5. Das Signaturgeheimnis des Endpunkts (beginnt mit `whsec_`) als
   Geheimnis in den Worker:
   `cd workers/push && npx wrangler secret put STRIPE_WEBHOOK_SECRET`

Vor dem ersten Verkauf über Stripe fehlen in den Nutzungsbedingungen
Widerrufsbelehrung, Muster Widerrufsformular und Kündigungsknopf nach
§ 312k BGB. Das ist der gelbe Satz in Abschnitt 7.

## 4. Anmeldung mit Google

1. In der Google Cloud Console ein Projekt, OAuth Zustimmungsbildschirm
   "Extern", nur der Bereich `openid`.
2. Zwei OAuth Client IDs: Typ "iOS" mit Bundle ID `de.daevo.app`, und Typ
   "Webanwendung" mit der Adresse der Web App als autorisierter Herkunft.
3. In `demo.config.json` unter `anmeldung`: `googleIosClientId` und
   `googleWebClientId`.
4. Im Worker unter `[vars]`:
   `GOOGLE_CLIENT_IDS = "<web id>,<ios id>"` und
   `GOOGLE_IOS_CLIENT_ID = "<ios id>"`.

Ohne diese Werte zeigt die App den Google Knopf nicht. Apple braucht nur
die Capability aus Abschnitt 2, Punkt 6.

## 5. Kalender

Nichts einzurichten. Neu im Worker ist nur der Weg `/kalender`, dafür einmal
`npx wrangler deploy`.
