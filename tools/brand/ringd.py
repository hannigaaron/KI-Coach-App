"""Baut ein d, dessen Bogen ein Aktivitätsring ist, passend zu Poppins SemiBold.

Alle Masse stammen aus der Schrift selbst, gemessen bei 1000 Einheiten je Geviert:
Stammbreite 140, x-Höhe 572, Bowl Durchmesser 570, Aufstrich 740, Vorschub 678.
Der Stamm steht bewusst höher als der Aufstrich, siehe ASC.
Damit sitzt das eigene d exakt auf denselben Linien wie a, e, v und o.
"""
import math

UPEM = 1000.0
STEM = 140.0          # Stammbreite, aus dem l gemessen
BOWL_D = 570.0        # Aussendurchmesser der Bowl, aus dem o gemessen
BOWL_X0 = 33.0        # linke Kante der Bowl
BOWL_Y0 = -9.0        # Unterkante mit Ueberschwung
BOWL_Y1 = 563.0       # Oberkante mit Ueberschwung
# Oberkante des Stamms. Poppins setzt den Aufstrich auf 740. Der Stamm steht
# 60 Einheiten höher: neben einem Ring als Bowl wirkte er bei 740 gestaucht,
# und im d ist er der einzige Aufstrich, also trifft er keine andere Linie.
ASC = 800.0
STEM_X1 = 610.0       # rechte Kante des Stamms
ADV = 678.0           # Vorschub

CY = (BOWL_Y0 + BOWL_Y1) / 2
R = BOWL_D / 2 - STEM / 2          # Mittellinie des Rings
# Der Ring sitzt so, dass seine rechte Mittellinie genau auf der Mittellinie
# des Stamms liegt. Nur so geht der Stamm ohne Absatz in den Ring über. Das
# verschiebt die Bowl um 7 Einheiten nach rechts gegen die Messung am o, was
# bei keiner Grösse sichtbar ist.
CX = STEM_X1 - STEM / 2 - R

def _pt(deg, radius):
    """0 Grad ist oben, positive Werte laufen im Uhrzeigersinn."""
    rad = math.radians(deg - 90)
    return CX + radius * math.cos(rad), CY - radius * math.sin(rad)

def arc(start_deg, sweep_deg, radius=R):
    x0, y0 = _pt(start_deg, radius)
    x1, y1 = _pt(start_deg + sweep_deg, radius)
    large = 1 if abs(sweep_deg) > 180 else 0
    sweep_flag = 1 if sweep_deg > 0 else 0
    return f"M {x0:.2f} {y0:.2f} A {radius:.2f} {radius:.2f} 0 {large} {sweep_flag} {x1:.2f} {y1:.2f}"

def ring_d(size, color, track_opacity=0.28, sweep=290.0, start=0.0,
           show_track=True, inner_ring=None):
    """Liefert SVG Elemente für das d plus den Vorschub in Nutzereinheiten."""
    s = size / UPEM
    stroke = STEM * s
    parts = []
    if show_track:
        parts.append(
            f'<circle cx="{CX * s:.2f}" cy="{-CY * s:.2f}" r="{R * s:.2f}" fill="none" '
            f'stroke="{color}" stroke-opacity="{track_opacity}" stroke-width="{stroke:.2f}"/>'
        )
    def scaled(path):
        # y wird gespiegelt, weil SVG nach unten wächst, die Schrift nach oben.
        out, tokens = [], path.split()
        i = 0
        while i < len(tokens):
            t = tokens[i]
            if t == "M":
                out.append(f"M {float(tokens[i+1]) * s:.2f} {-float(tokens[i+2]) * s:.2f}")
                i += 3
            elif t == "A":
                # Das Sweep Flag bleibt unverändert. Die Schrift rechnet mit
                # y nach oben, SVG mit y nach unten. Die Spiegelung der
                # Koordinaten und der Achsenwechsel heben sich auf, die
                # sichtbare Drehrichtung bleibt also gleich.
                out.append(
                    f"A {float(tokens[i+1]) * s:.2f} {float(tokens[i+2]) * s:.2f} 0 "
                    f"{tokens[i+4]} {tokens[i+5]} "
                    f"{float(tokens[i+6]) * s:.2f} {-float(tokens[i+7]) * s:.2f}"
                )
                i += 8
            else:
                i += 1
        return " ".join(out)

    parts.append(
        f'<path d="{scaled(arc(start, sweep))}" fill="none" stroke="{color}" '
        f'stroke-width="{stroke:.2f}" stroke-linecap="round"/>'
    )
    if inner_ring:
        ir = R - STEM * 1.15
        parts.append(
            f'<circle cx="{CX * s:.2f}" cy="{-CY * s:.2f}" r="{ir * s:.2f}" fill="none" '
            f'stroke="{color}" stroke-opacity="{track_opacity}" stroke-width="{stroke * 0.62:.2f}"/>'
        )
        parts.append(
            f'<path d="{scaled(arc(start, inner_ring, ir))}" fill="none" stroke="{color}" '
            f'stroke-width="{stroke * 0.62:.2f}" stroke-linecap="round"/>'
        )
    # Der Stamm läuft von oben bis zur Mitte des Rings und geht dort in ihn
    # über. Vorher reichte er als eigener Balken bis zur Grundlinie, und unten
    # rechts stand ein Stück unter dem Ring heraus. Oben ein runder Abschluss,
    # unten liegt das Ende im Ring und ist nicht zu sehen.
    sx = (STEM_X1 - STEM / 2) * s
    parts.append(
        f'<path d="M {sx:.2f} {-(ASC - STEM / 2) * s:.2f} L {sx:.2f} {-CY * s:.2f}" fill="none" '
        f'stroke="{color}" stroke-width="{stroke:.2f}" stroke-linecap="round"/>'
    )
    return "\n    ".join(parts), ADV * s
