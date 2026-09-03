# daevo Markenrichtlinie

Verbindlich fuer alle Dateien in diesem Projekt und fuer alles, was nach aussen geht.

## Name

Der Name lautet **daevo**. Immer klein geschrieben, auch am Satzanfang und in
Ueberschriften. Nie Daevo, nie DAEVO, nie daeVo.

Der Claim lautet **Evolve your daily life**. Grosses E am Anfang, der Rest klein.
Er steht unter der Wortmarke, nie daneben und nie darueber.

## Wortmarke

Schrift ist Poppins. Die Wortmarke ist in zwei Gewichte geteilt:

- `dae` in Poppins SemiBold 600
- `vo` in Poppins Light 300

Der Gewichtssprung ist das Erkennungsmerkmal. Er darf nicht wegfallen und nicht
umgedreht werden. Laufweite minus 1.6 auf 100 Punkt Schriftgroesse, dazu ein
halber Punkt zusaetzlicher Abstand an der Bruchstelle zwischen e und v.

### Das d ist ein Aktivitaetsring

Das d stammt nicht aus der Schrift, es ist gebaut. Die Bowl ist ein offener
Ring wie die Ringe der Apple Watch, der Stamm bleibt ein gerader Balken.
Damit traegt der Name die Funktion der App: ein Tag, der sich fuellt.

Alle Masse stammen aus Poppins SemiBold, gemessen bei 1000 Einheiten je
Geviert, damit das d exakt auf denselben Linien sitzt wie a, e, v und o:

| Mass | Wert | Herkunft |
| --- | --- | --- |
| Strichstaerke | 140 | Breite des l |
| Aussendurchmesser der Bowl | 570 | Breite des o |
| Mittellinie des Rings | Radius 215 | 285 minus halbe Strichstaerke |
| Mittelpunkt | 318 / 277 | Mitte der Bowl |
| Oberkante des Stamms | 740 | Aufstrichhoehe |
| Vorschub | 678 | Vorschub des d |

Der Ring beginnt oben auf zwoelf Uhr und laeuft im Uhrzeigersinn ueber
300 Grad, also 83 Prozent. Die restlichen 60 Grad zeigen die Spur in derselben
Farbe mit 28 Prozent Deckkraft. Die Enden sind rund.

Die Spur ist Pflicht. Ohne sie hat der Buchstabe an der Luecke ein Loch und
liest sich nicht mehr sauber als d. Die Deckkraft statt einer festen Grauzahl
sorgt dafuer, dass das Logo auf jedem Untergrund funktioniert.

Die Variante `daevo-lockup-ring-offen.svg` zeigt den Ring bei 270 Grad. Sie
liest sich staerker als Diagramm und schwaecher als Buchstabe. Sie ist die
Ausnahme fuer grosse Flaechen, nicht die Hauptvariante.

Alle Logodateien liegen in `apps/pwa/brand/` und haben die Schrift als Pfade
eingebettet. Sie brauchen keine installierte Schrift. Erzeugt werden sie mit
`tools/brand/build-brand.py`, siehe die Anleitung daneben.

| Datei | Einsatz |
| --- | --- |
| `daevo-lockup-light.svg` | Wortmarke plus Claim auf hellem Grund |
| `daevo-lockup-dark.svg` | Wortmarke plus Claim auf dunklem Grund |
| `daevo-lockup-deep.svg` | Wie hell, aber dunkleres Blau fuer kleine Groessen und Druck |
| `daevo-lockup-mono-black.svg` | Einfarbig schwarz, etwa fuer Stempel oder Fax |
| `daevo-lockup-mono-white.svg` | Einfarbig weiss auf Foto oder Farbflaeche |
| `daevo-wordmark.svg` | Nur Wortmarke, Logoblau |
| `daevo-wordmark-deep.svg` | Nur Wortmarke, dunkles Blau fuer helle Flaechen |
| `daevo-wordmark-white.svg` | Nur Wortmarke, weiss |
| `daevo-mark.svg` | Nur das Ring d, fuer Favicon und kleine Flaechen |
| `daevo-mark-deep.svg` | Nur das Ring d im dunklen Blau |
| `daevo-lockup-ring-offen.svg` | Ring bei 270 Grad, staerkere Diagrammwirkung |
| `daevo-icon.svg` | App Icon, dunkle Kachel mit hellblauem d |
| `daevo-icon-maskable.svg` | App Icon mit groesserem Rand fuer Android Masken |

### Regeln

- Schutzraum rundum mindestens die Hoehe des kleinen d.
- Mindestbreite der Wortmarke 90 Pixel auf dem Bildschirm, 25 Millimeter im Druck.
- Nicht verzerren, nicht drehen, nicht mit Schlagschatten oder Verlauf versehen.
- Auf Fotos nur die einfarbige Variante verwenden.
- Den Ring nicht schliessen und nicht als Vollkreis zeichnen. Die Luecke ist
  Teil der Marke.
- Unter 24 Pixel Hoehe die einfarbige Variante nehmen. Die Spur mit 28 Prozent
  Deckkraft verschwindet dort ohnehin.

## Farben

| Rolle | Wert | Einsatz |
| --- | --- | --- |
| Logoblau | `#96D8F0` | Wortmarke, Akzente auf dunklem Grund |
| Blau dunkel | `#1E7FA8` | Text und Knopfflaechen auf hellem Grund |
| Schwarz | `#0B0D10` | Claim und Text auf hellem Grund |
| Grundton dunkel | `#0E1116` | Hintergrund der App und des App Icons |
| Weiss | `#FFFFFF` | Hintergrund hell, Text auf dunklem Blau |

Das Logoblau stammt aus dem bestehenden Logo von Personal Coach Aaron. Der Wert
wurde aus der Bilddatei abgelesen. Wenn die Originaldatei einen anderen Wert
enthaelt, ist dieser massgeblich. Er steht dann an genau einer Stelle im Code,
naemlich `--brand` in `apps/pwa/styles.css`.

### Warum es zwei Blautoene gibt

Gemessene Kontrastverhaeltnisse nach WCAG 2.1:

| Kombination | Verhaeltnis | Bewertung |
| --- | --- | --- |
| Logoblau auf Weiss | 1.57 zu 1 | fuer Text unbrauchbar |
| Logoblau auf `#0E1116` | 12.05 zu 1 | sehr gut |
| Blau dunkel auf Weiss | 4.51 zu 1 | erfuellt AA fuer normalen Text |
| Weiss auf Blau dunkel | 4.51 zu 1 | erfuellt AA |
| Schwarz auf Logoblau | 12.39 zu 1 | sehr gut |

Daraus folgt die Regel: auf dunklem Grund traegt das Logoblau, auf hellem Grund
uebernimmt das dunkle Blau alles, was gelesen werden muss. Das Logo selbst darf
auf Weiss im hellen Blau stehen, weil es eine Bildmarke ist und nicht gelesen
werden muss wie Fliesstext.

## Schrift

Poppins. Wortmarke SemiBold 600 und Light 300, Claim Regular 400.
In der App laeuft die Oberflaeche in der Systemschrift, damit sie sich nativ
anfuehlt und ohne Nachladen startet. Poppins steckt nur im Logo, und dort als
Pfad. Es wird keine Schrift von einem fremden Server geladen.

Der Kalorienring in der App nutzt bewusst dieselbe Anmutung wie der Ring im
Logo: gleiche Spur mit 28 Prozent Deckkraft, gleiche runde Enden. Marke und
Funktion zeigen dieselbe Form.

## Tonfall

Kurze Saetze. Du statt Sie. Keine Ausrufezeichen. Keine leeren Versprechen.
Zahlen statt Adjektive. Wenn etwas nicht gut lief, wird es benannt.
