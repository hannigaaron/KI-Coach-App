# Vom Testmonat zum Start

Stand: 27. Oktober 2026. Was in der App fertig ist, was nur du tun kannst,
und in welcher Reihenfolge.

## Was in der App jetzt steht

- Datenschutzerklärung, Nutzungsbedingungen und Impressum unter
  `apps/pwa/rechtliches/`. In der App im Profil unter Datenschutz, öffentlich
  unter `<adresse der App>/rechtliches/datenschutz.html`. Diese Adresse
  verlangt Apple im App Store.
- Einwilligung vor der ersten Antwort mit KI, `apps/pwa/js/einwilligung.js`.
  Ohne Ja geht nichts an Anthropic, der Regelweg antwortet. Nach einem Nein
  fragt die App nicht wieder. Widerruf und Erlauben im Profil.
- Konto löschen: `DELETE /konto` im Worker, in der App "Konto und alle Daten
  löschen" im Profil. Apple verlangt das für jede App, die ein Konto anlegt.
- Der Build meldet bei jedem Lauf, wie viele Platzhalter in den
  Rechtstexten noch offen sind. Sie sind gelb markiert.
- Anmeldung mit Apple und Google, Kauf im App Store mit StoreKit 2, Stripe
  Webhook, Testphase als Teil des Abos, Kalender Abgleich. Was dafür in den
  Konten bei Apple, Google und Stripe anzulegen ist, steht in
  `docs/ABO-EINRICHTEN.md`.

## Teil 1: Der Testmonat, nur für dich

1. PR mergen, am Mac Xcode mit Cmd+Q beenden.
2. Im Terminal:
   `cd ~/KI-Coach-App && git stash && git pull && (git stash pop || true)`
3. Worker neu ausrollen, sonst fehlen Konto löschen, Kalender Abo,
   Anmeldung und Kauf:
   `cd workers/push && npx wrangler deploy && cd ../..`
4. `npm run ios`, iPhone anstecken, in Xcode auf Play.
5. Beim ersten Gespräch "Zustimmen" tippen.
6. Dein Konto auf Pro stellen, sonst endet die KI nach 7 Tagen Testphase.
   Die Kontokennung steht im Profil unter Konto. Im Terminal, mit deinem
   Anmeldewort und deiner Kennung:

   ```bash
   curl -X POST https://daevo-push.ittaste.workers.dev/konto/stufe \
     -H "x-daevo-wort: DEIN_ANMELDEWORT" \
     -H "content-type: application/json" \
     -d '{"konto":"DEINE_KENNUNG","stufe":"pro","bis":"2027-12-31"}'
   ```

7. In der Anthropic Console ein monatliches Ausgabenlimit setzen. Es ist die
   einzige Grenze, die hält, wenn alles andere versagt.
8. Apple Developer Program buchen, 99 US Dollar im Jahr. Mit kostenloser
   Apple ID läuft die App nur 7 Tage und muss dann neu aufgespielt werden.
   Für den App Store brauchst du es ohnehin.
9. Jeden Sonntag eine Sicherung: Profil, Sicherung erstellen, Text an dich
   selbst schicken. Wird die App gelöscht, ist sonst alles weg.
10. Fehler sofort festhalten: Screenshot, Uhrzeit, was du gesagt oder
    getippt hast. Gesammelt an Claude schicken, ein Fehler je Zeile.

## Teil 2: Was du vor dem Start erledigen musst

Das kann niemand ausser dir.

1. **Gewerbe anmelden**, falls noch nicht für daevo erfasst. Ohne Gewerbe
   keine Einnahmen aus Abos.
2. **Impressum:** eingetragen am 25. Oktober 2026, mit Anschrift in Asperg
   und Aufsichtsbehörde Baden-Württemberg. Eine Umsatzsteuer
   Identifikationsnummer steht nicht drin. Bekommst du eine, gehört sie
   ins Impressum.
3. **Anthropic:** in der Console prüfen, dass der Vertrag zur
   Auftragsverarbeitung (DPA) gilt, und den Vertragspartner für die EU
   notieren. Danach den gelben Satz in Abschnitt 6 der Datenschutzerklärung
   ersetzen.
4. **Cloudflare:** den DPA im Konto bestätigen.
5. **Rechtstexte prüfen lassen.** Die Texte sind ein Entwurf, der genau
   beschreibt, was der Code tut. Er ersetzt keine anwaltliche Prüfung. Für
   eine App mit Gesundheitsdaten ist eine Prüfung durch eine Kanzlei für IT
   und Datenschutzrecht oder einen geprüften Dienst die sichere Wahl.
6. **Marke** beim DPMA anmelden, siehe `docs/MARKE-UND-DOMAIN.md`.
7. **Domain** registrieren und die Rechtstexte darunter erreichbar machen.

## Vor der ersten Werbung

Werbung bringt fremde Menschen in die App, also gilt ab dann alles aus
Teil 2, nicht erst zum Start im App Store.

1. Anthropic DPA bestätigt und der gelbe Satz in Abschnitt 6 ersetzt.
2. Wohin die Werbung führt, festlegen. Die iPhone App ist bis zur Freigabe
   durch Apple nicht öffentlich. Möglich ist die Web App auf Cloudflare
   Pages, `npm run deploy:demo`.
3. Verkaufen: Wer über Werbung kommt und zahlen will, zahlt ohne App Store
   über einen Stripe Link. Dafür muss Teil 3, Punkt 2 vorher stehen. Ohne
   das nur die kostenlose Testphase bewerben und Abos von Hand vergeben.
4. Tagesgrenze im Worker anheben, `TAGESGRENZE`, sonst sind die 400
   Anfragen am Tag nach wenigen Dutzend neuen Nutzern weg.
5. Ausgabenlimit in der Anthropic Console prüfen.

## Teil 3: Vor dem ersten verkauften Abo

1. **Kauf im App Store:** eingebaut mit StoreKit 2. Offen ist nur die
   Einrichtung in App Store Connect, siehe `docs/ABO-EINRICHTEN.md`.
2. **Verkauf ausserhalb des App Stores**, etwa über Stripe: dafür fehlen
   Widerrufsbelehrung, Muster Widerrufsformular, Kündigungsknopf nach
   § 312k BGB und ein Abschnitt zu Stripe in der Datenschutzerklärung.
   Solange nur der App Store verkauft, entfällt das.
3. **App Store Angaben:** Datenschutz Label in App Store Connect ausfüllen
   (Gesundheit und Fitness, Nutzung zur App Funktion, nicht zum Tracking),
   Adresse der Datenschutzerklärung eintragen, Altersfreigabe, Kategorie
   Gesundheit und Fitness.
4. **Review Puffer:** zwei bis vier Wochen einplanen. Apple prüft bei
   Gesundheitsapps genauer.
