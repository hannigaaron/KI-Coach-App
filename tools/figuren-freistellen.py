"""
Schneidet die acht Figuren aus einer Vergleichsreihe und stellt sie frei.

Aufruf aus dem Wurzelverzeichnis:
    python3 tools/figuren-freistellen.py pfad/zur/vorlage.webp

Die Spaltenbereiche in FIGUREN gelten fuer genau eine Vorlage. Bei einer neuen
Reihe muessen sie neu bestimmt werden, etwa indem man die Spalten ohne
Hintergrundfarbe zaehlt.

Der Hintergrund ist ein gleichmaessiges Hellgrau. Deshalb reicht eine
Flutfuellung von den Raendern aus: alles, was vom Rand aus in der
Hintergrundfarbe erreichbar ist, wird durchsichtig. Ein reiner Farbschwellwert
wuerde auch helle Hautstellen treffen, die Flutfuellung nicht.

Die Kanten bekommen danach eine weiche Deckkraft. Zusaetzlich wird die
Hintergrundfarbe aus den halbdurchsichtigen Randpixeln herausgerechnet. Diese
Pixel sind in der Vorlage eine Mischung aus Koerper und Hellgrau. Ohne diese
Umrechnung leuchtet dieser Rest auf dunklem Grund als heller Saum um die Figur.

Die Umkehrung lautet: beobachtet = alpha mal echt plus (1 minus alpha) mal
Hintergrund, also echt = (beobachtet minus (1 minus alpha) mal Hintergrund)
geteilt durch alpha.
"""
from PIL import Image
from collections import deque

import sys

# Pfad zur Vorlage. Beim Austausch der Reihe hier den neuen Pfad eintragen.
QUELLE = sys.argv[1] if len(sys.argv) > 1 else "vorlage.webp"
ZIEL = "apps/pwa/img/koerperfett"
BG = (239, 239, 239)
RAND = 6          # Rand um die Figur, damit nichts abgeschnitten wirkt
TOL_FLUT = 20     # Toleranz der Flutfuellung
TOL_HART = 10     # darunter gilt ein Pixel als reiner Hintergrund
TOL_WEICH = 46    # darueber gilt ein Pixel als voll deckend
HOEHE = 520       # Zielhoehe der ausgegebenen Bilder

im = Image.open(QUELLE).convert("RGB")
W, H = im.size
px = im.load()

def abstand(p):
    return max(abs(p[0] - BG[0]), abs(p[1] - BG[1]), abs(p[2] - BG[2]))

def yBereich(x0, x1, y0, y1):
    oben = unten = None
    for y in range(y0, y1):
        if any(abstand(px[x, y]) > 12 for x in range(x0, x1)):
            if oben is None:
                oben = y
            unten = y
    return oben, unten

# Spaltenbereiche der Figuren, von links nach rechts, mit dem Prozentwert daneben.
FIGUREN = [
    ("female", 45, 22, 130, 0, 332),
    ("female", 40, 314, 417, 0, 332),
    ("female", 35, 580, 691, 0, 332),
    ("female", 30, 848, 954, 0, 332),
    ("male", 35, 178, 279, 333, 649),
    ("male", 30, 449, 552, 333, 649),
    ("male", 25, 704, 810, 333, 649),
    ("male", 20, 964, 1073, 333, 649),
]

def freistellen(bild):
    """Hintergrund durchsichtig machen, Kanten weich."""
    b = bild.convert("RGBA")
    w, h = b.size
    daten = b.load()
    aussen = bytearray(w * h)
    warteschlange = deque()

    for x in range(w):
        for y in (0, h - 1):
            warteschlange.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            warteschlange.append((x, y))

    while warteschlange:
        x, y = warteschlange.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if aussen[i]:
            continue
        p = daten[x, y]
        if abstand(p) > TOL_FLUT:
            continue
        aussen[i] = 1
        warteschlange.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    for y in range(h):
        for x in range(w):
            r, g, bl, _ = daten[x, y]
            if aussen[y * w + x]:
                daten[x, y] = (r, g, bl, 0)
                continue
            # Innen, aber nahe am Hintergrund: weiche Kante statt hartem Saum.
            a = abstand((r, g, bl))
            if a >= TOL_WEICH:
                daten[x, y] = (r, g, bl, 255)
                continue
            if a <= TOL_HART:
                daten[x, y] = (r, g, bl, 0)
                continue
            alpha = int(255 * (a - TOL_HART) / (TOL_WEICH - TOL_HART))
            f = alpha / 255
            echt = tuple(
                max(0, min(255, round((kanal - (1 - f) * hg) / f)))
                for kanal, hg in ((r, BG[0]), (g, BG[1]), (bl, BG[2]))
            )
            daten[x, y] = (*echt, alpha)
    return b

for sex, prozent, x0, x1, ya, yb in FIGUREN:
    oben, unten = yBereich(x0, x1, ya, yb)
    kasten = (
        max(0, x0 - RAND),
        max(0, oben - RAND),
        min(W, x1 + RAND),
        min(H, unten + RAND + 1),
    )
    ausschnitt = im.crop(kasten)
    frei = freistellen(ausschnitt)
    faktor = HOEHE / frei.height
    gross = frei.resize((max(1, round(frei.width * faktor)), HOEHE), Image.LANCZOS)
    # WebP mit Alpha statt PNG. Acht Figuren als PNG waeren zusammen 700
    # Kilobyte, als WebP ein Viertel davon. Safari kann WebP seit Version 14.
    name = f"{ZIEL}/{sex}-{prozent}.webp"
    gross.save(name, format="WEBP", quality=88, method=6)
    print(f"{name}: {gross.width} mal {gross.height}")
