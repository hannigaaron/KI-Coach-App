# Logogenerator

Erzeugt alle Dateien in `apps/pwa/brand/`. Das laeuft nicht im normalen Build.
Es ist nur noetig, wenn sich die Marke aendert, etwa die Farbe, der Ringstand
oder die Laufweite.

## Warum es das gibt

Das d ist kein Schriftzeichen. Es ist aus Kreisbogen und Balken gebaut, mit
Massen, die aus Poppins SemiBold stammen. Die uebrigen Buchstaben werden aus der
Schrift in Pfade umgewandelt. Ohne dieses Skript liesse sich das Logo nur von
Hand nachbauen.

## Voraussetzungen

```bash
pip install fonttools
```

Dazu die Schriftdateien Poppins 300, 400 und 600 in einem Ordner `fonts`.
Sie stammen aus Google Fonts und stehen unter der SIL Open Font License.
Sie liegen bewusst nicht im Repository, weil die fertigen Logos die Buchstaben
bereits als Pfade enthalten und die Schrift dort nicht mehr gebraucht wird.

Bezug:

```bash
curl -s -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600" > gf.css
# aus gf.css die ttf Adressen ziehen und nach fonts/Poppins-<gewicht>.ttf legen
```

## Ausfuehren

```bash
cd tools/brand
python3 build-brand.py     # schreibt nach ./brand
cp brand/*.svg ../../apps/pwa/brand/
```

Die PNG Symbole entstehen daraus mit einem Browser, siehe `docs/BRAND.md`.

## Stellschrauben

Alles steht oben in `build-brand.py`:

- `SWEEP` gefuellter Anteil des Rings in Grad, aktuell 300
- `TRACK_OPACITY` Deckkraft der Spur, aktuell 0.28
- `BRAND`, `DEEP`, `INK`, `BG` die Farben
- `TRACKING` Laufweite, `GAP` Abstand zum Claim

Die Masse des d stehen in `ringd.py` und sind aus der Schrift gemessen. Sie
aendern sich nur, wenn die Schrift gewechselt wird.
