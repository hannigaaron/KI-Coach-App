# daevo Markenrichtlinie

Verbindlich für alle Dateien in diesem Projekt und für alles, was nach aussen geht.

## Name

Der Name lautet **daevo**. Immer klein geschrieben, auch am Satzanfang und in
Ueberschriften. Nie Daevo, nie DAEVO, nie daeVo.

Der Claim lautet **Evolve your daily life**. Grosses E am Anfang, der Rest klein.
Er steht unter der Wortmarke, nie daneben und nie darüber.

## Wortmarke

Schrift ist Poppins. Die Wortmarke ist in zwei Gewichte geteilt:

- `dae` in Poppins SemiBold 600
- `vo` in Poppins Light 300

Der Gewichtssprung ist das Erkennungsmerkmal. Er darf nicht wegfallen und nicht
umgedreht werden. Laufweite minus 1.6 auf 100 Punkt Schriftgrösse, dazu ein
halber Punkt zusätzlicher Abstand an der Bruchstelle zwischen e und v.

### Das d ist ein Aktivitätsring

Das d stammt nicht aus der Schrift, es ist gebaut. Die Bowl ist ein offener
Ring wie die Ringe der Apple Watch. Der Stamm ist ein gerader Balken mit
runden Enden, oben und unten je ein Halbkreis mit dem Radius der halben
Strichstärke, also 70 Einheiten. Runde Enden am Stamm und am Ring gehören
zusammen, ein eckiger Stamm bricht die Form.
Damit trägt der Name die Funktion der App: ein Tag, der sich füllt.

Alle Masse stammen aus Poppins SemiBold, gemessen bei 1000 Einheiten je
Geviert, damit das d exakt auf denselben Linien sitzt wie a, e, v und o:

| Maß | Wert | Herkunft |
| --- | --- | --- |
| Strichstärke | 140 | Breite des l |
| Aussendurchmesser der Bowl | 570 | Breite des o |
| Mittellinie des Rings | Radius 215 | 285 minus halbe Strichstärke |
| Mittelpunkt | 318 / 277 | Mitte der Bowl |
| Oberkante des Stamms | 740 | Aufstrichhöhe |
| Vorschub | 678 | Vorschub des d |

Der Ring beginnt oben auf zwölf Uhr und läuft im Uhrzeigersinn über
300 Grad, also 83 Prozent. Die restlichen 60 Grad bleiben offen. Die Enden
sind rund, am Ring wie am Stamm.

Der offene Ring ist die Hauptvariante. Er zeigt den Fortschrittsgedanken am
deutlichsten. Der Preis dafür: an der Lücke fehlt dem Buchstaben ein Stück.
Ab etwa 24 Pixel Höhe abwärts kippt das d dadurch Richtung c mit Balken.
Für diese Fälle gibt es zwei Auswege:

- `daevo-lockup-mit-spur.svg` und `daevo-wordmark-mit-spur.svg` füllen die
  Lücke mit einer Spur in derselben Farbe bei 28 Prozent Deckkraft. Der Ring
  bleibt sichtbar, der Buchstabe ist geschlossen.
- Bei sehr kleinen Grössen die Wortmarke ohne Bildwirkung setzen.

Alle Logodateien liegen in `apps/pwa/brand/` und haben die Schrift als Pfade
eingebettet. Sie brauchen keine installierte Schrift. Erzeugt werden sie mit
`tools/brand/build-brand.py`, siehe die Anleitung daneben.

| Datei | Einsatz |
| --- | --- |
| `daevo-lockup-light.svg` | Wortmarke plus Claim, Logoblau, für Flächen die nicht weiß sind |
| `daevo-lockup-dark.svg` | Wortmarke plus Claim auf dunklem Grund |
| `daevo-lockup-deep.svg` | Wortmarke plus Claim auf weißem Grund. Die erste Wahl im hellen Modus, weil Logoblau auf Weiß nur 1.57 zu 1 erreicht |
| `daevo-lockup-mono-black.svg` | Einfarbig schwarz, etwa für Stempel oder Fax |
| `daevo-lockup-mono-white.svg` | Einfarbig weiß auf Foto oder Farbfläche |
| `daevo-wordmark.svg` | Nur Wortmarke, Logoblau |
| `daevo-wordmark-deep.svg` | Nur Wortmarke, dunkles Blau für helle Flächen |
| `daevo-wordmark-white.svg` | Nur Wortmarke, weiß |
| `daevo-mark.svg` | Nur das Ring d, für Favicon und kleine Flächen |
| `daevo-mark-deep.svg` | Nur das Ring d im dunklen Blau |
| `daevo-lockup-mit-spur.svg` | Ring mit gefüllter Spur, für kleine Grössen |
| `daevo-wordmark-mit-spur.svg` | Wortmarke mit gefüllter Spur |
| `daevo-icon.svg` | App Icon, dunkle Kachel mit hellblauem d |
| `daevo-icon-maskable.svg` | App Icon mit grösserem Rand für Android Masken |

### Regeln

- Schutzraum rundum mindestens die Höhe des kleinen d.
- Mindestbreite der Wortmarke 90 Pixel auf dem Bildschirm, 25 Millimeter im Druck.
- Nicht verzerren, nicht drehen, nicht mit Schlagschatten oder Verlauf versehen.
- Auf Fotos nur die einfarbige Variante verwenden.
- Den Ring nicht schließen und nicht als Vollkreis zeichnen. Die Lücke ist
  Teil der Marke.
- Unter 24 Pixel Höhe die Variante mit Spur nehmen, sonst fällt der
  Buchstabe auseinander.

## Farben

| Rolle | Wert | Einsatz |
| --- | --- | --- |
| Logoblau | `#96D8F0` | Wortmarke, Akzente auf dunklem Grund |
| Blau dunkel | `#1E7FA8` | Text und Knopfflächen auf hellem Grund |
| Schwarz | `#0B0D10` | Claim und Text auf hellem Grund |
| Grundton dunkel | `#0E1116` | Hintergrund der App und des App Icons |
| Weiß | `#FFFFFF` | Hintergrund hell, Text auf dunklem Blau |

Das Logoblau stammt aus dem bestehenden Logo von Personal Coach Aaron. Der Wert
wurde aus der Bilddatei abgelesen. Wenn die Originaldatei einen anderen Wert
enthält, ist dieser maßgeblich. Er steht dann an genau einer Stelle im Code,
nämlich `--brand` in `apps/pwa/styles.css`.

### Warum es zwei Blautöne gibt

Gemessene Kontrastverhältnisse nach WCAG 2.1:

| Kombination | Verhältnis | Bewertung |
| --- | --- | --- |
| Logoblau auf Weiß | 1.57 zu 1 | für Text unbrauchbar |
| Logoblau auf `#0E1116` | 12.05 zu 1 | sehr gut |
| Blau dunkel auf Weiß | 4.51 zu 1 | erfüllt AA für normalen Text |
| Weiß auf Blau dunkel | 4.51 zu 1 | erfüllt AA |
| Schwarz auf Logoblau | 12.39 zu 1 | sehr gut |

Daraus folgt die Regel: auf dunklem Grund trägt das Logoblau, auf hellem Grund
übernimmt das dunkle Blau alles, was gelesen werden muss. Das Logo selbst darf
auf Weiß im hellen Blau stehen, weil es eine Bildmarke ist und nicht gelesen
werden muss wie Fließtext.

## Schrift

Poppins. Wortmarke SemiBold 600 und Light 300, Claim Regular 400.
In der App läuft die Oberfläche in der Systemschrift, damit sie sich nativ
anfühlt und ohne Nachladen startet. Poppins steckt nur im Logo, und dort als
Pfad. Es wird keine Schrift von einem fremden Server geladen.

Der Kreis auf dem Startbildschirm der App ist dasselbe d, aufgelöst in
Partikel. Er behält Radius, Strichstärke und den offenen Bogen bei 300 Grad.
Die Marke bleibt erkennbar, auch wenn sie sich bewegt.

Der Kalorienring in der App nutzt dieselbe Form wie der Ring im Logo: gleiche
runde Enden, gleiche Markenfarbe. Er behält eine Spur, weil er den Abstand
zum Tagesziel zeigen muss. Das Logo braucht diese Aussage nicht.

## Tonfall

Kurze Sätze. Du statt Sie. Keine Ausrufezeichen. Keine leeren Versprechen.
Zahlen statt Adjektive. Wenn etwas nicht gut lief, wird es benannt.
