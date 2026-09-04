"""Erzeugt alle daevo Markendateien.

Das d ist kein Schriftzeichen mehr, sondern gebaut: die Bowl ist ein
Aktivitätsring wie bei den Ringen der Apple Watch, der Stamm bleibt gerade.
Alle Masse stammen aus Poppins SemiBold, damit das d exakt auf denselben
Linien sitzt wie a, e, v und o. Die restlichen Buchstaben sind ausgeschriebene
Pfade, deshalb braucht keine Datei eine installierte Schrift.
"""
import os
from mixed import run
from ringd import ring_d

BRAND = "#96D8F0"
DEEP  = "#1E7FA8"
INK   = "#0B0D10"
BG    = "#0E1116"

P600 = "fonts/Poppins-600.ttf"
P300 = "fonts/Poppins-300.ttf"
P400 = "fonts/Poppins-400.ttf"

SIZE = 100.0
TRACKING = -1.6
CLAIM = "Evolve your daily life"
GAP = 28.0
PAD = 6.0
SWEEP = 300.0          # gefüllter Anteil des Rings, entspricht 83 Prozent
TRACK_OPACITY = 0.28
SHOW_TRACK = False     # Hauptvariante ist der offene Ring ohne Spur

REST = run([("ae", P600), ("vo", P300)], SIZE, tracking=TRACKING, kern=0.5)
CLAIM_RUN = run([(CLAIM, P400)], 15, tracking=2.6)
ASC_TOP = -74.0

def parts(color, sweep=SWEEP, show_track=SHOW_TRACK):
    body, adv = ring_d(SIZE, color, sweep=sweep, show_track=show_track, track_opacity=TRACK_OPACITY)
    return body, adv + TRACKING

def geometry(sweep=SWEEP):
    _, x_off = parts(BRAND, sweep)
    right = x_off + REST["x1"]
    claim_w = CLAIM_RUN["x1"] - CLAIM_RUN["x0"]
    total = max(right, claim_w)
    return {
        "x_off": x_off,
        "total": total,
        "cdx": -CLAIM_RUN["x0"] + (total - claim_w) / 2,
        "cdy": GAP - CLAIM_RUN["y0"],
        "bottom": max(0.9, REST["y1"]),
    }

G = geometry()

LOCKUP_VB = (f"{-PAD} {ASC_TOP - PAD:.1f} {G['total'] + 2 * PAD:.1f} "
             f"{(G['bottom'] - ASC_TOP) + GAP + (CLAIM_RUN['y1'] - CLAIM_RUN['y0']) + 2 * PAD:.1f}")
WORD_VB = f"{-PAD} {ASC_TOP - PAD:.1f} {G['x_off'] + REST['x1'] + 2 * PAD:.1f} {(G['bottom'] - ASC_TOP) + 2 * PAD:.1f}"

def svg(view, width, body, label):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}" width="{width}" '
            f'role="img" aria-label="{label}">\n  <title>{label}</title>\n  {body}\n</svg>\n')

def wordmark(color, sweep=SWEEP, show_track=SHOW_TRACK):
    body, x_off = parts(color, sweep, show_track)
    return (f'<g>{body}</g>\n'
            f'  <g transform="translate({x_off:.2f} 0)"><path fill="{color}" d="{REST["d"]}"/></g>')

def lockup(color, claim_color, sweep=SWEEP, show_track=SHOW_TRACK):
    return (wordmark(color, sweep, show_track) + "\n"
            f'  <g transform="translate({G["cdx"]:.2f} {G["cdy"]:.2f})">'
            f'<path fill="{claim_color}" d="{CLAIM_RUN["d"]}"/></g>')

LABEL = "daevo, Evolve your daily life"
files = {
    "daevo-lockup-light.svg":      svg(LOCKUP_VB, 320, lockup(BRAND, INK), LABEL),
    "daevo-lockup-dark.svg":       svg(LOCKUP_VB, 320, lockup(BRAND, "#FFFFFF"), LABEL),
    "daevo-lockup-deep.svg":       svg(LOCKUP_VB, 320, lockup(DEEP, INK), LABEL),
    "daevo-lockup-mono-black.svg": svg(LOCKUP_VB, 320, lockup(INK, INK), LABEL),
    "daevo-lockup-mono-white.svg": svg(LOCKUP_VB, 320, lockup("#FFFFFF", "#FFFFFF"), LABEL),
    "daevo-lockup-mit-spur.svg":   svg(LOCKUP_VB, 320, lockup(BRAND, INK, show_track=True), LABEL),
    "daevo-wordmark-mit-spur.svg": svg(WORD_VB, 260, wordmark(BRAND, show_track=True), "daevo"),
    "daevo-wordmark.svg":          svg(WORD_VB, 260, wordmark(BRAND), "daevo"),
    "daevo-wordmark-deep.svg":     svg(WORD_VB, 260, wordmark(DEEP), "daevo"),
    "daevo-wordmark-white.svg":    svg(WORD_VB, 260, wordmark("#FFFFFF"), "daevo"),
}

# Die Bildmarke allein, für Favicon, Wasserzeichen und kleine Flächen.
d_body, d_adv = parts(BRAND)
D_VB = f"{-PAD} {ASC_TOP - PAD:.1f} {61.0 + 2 * PAD:.1f} {(0.9 - ASC_TOP) + 2 * PAD:.1f}"
files["daevo-mark.svg"] = svg(D_VB, 120, f"<g>{d_body}</g>", "daevo")
files["daevo-mark-deep.svg"] = svg(D_VB, 120, f"<g>{parts(DEEP)[0]}</g>", "daevo")

# App Icon: dunkle Kachel, das Ring d mittig.
def icon(safe):
    size = 512
    ink_w, ink_h = 61.0 - 3.3, 0.9 - ASC_TOP
    scale = (size * safe) / max(ink_w, ink_h)
    tx = size / 2 - (3.3 + ink_w / 2) * scale
    ty = size / 2 - (ASC_TOP + ink_h / 2) * scale
    return svg(f"0 0 {size} {size}", size,
        f'<rect width="{size}" height="{size}" rx="{size * 0.22:.1f}" fill="{BG}"/>\n'
        f'  <g transform="translate({tx:.2f} {ty:.2f}) scale({scale:.4f})">{d_body}</g>', "daevo")

files["daevo-icon.svg"] = icon(0.60)
files["daevo-icon-maskable.svg"] = icon(0.46)

for name, content in files.items():
    open(os.path.join("brand", name), "w").write(content)
print("\n".join(sorted(files)))
