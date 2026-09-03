"""Setzt eine Wortmarke aus mehreren Schriftschnitten und liefert Pfade plus Masse."""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.misc.transform import Transform

_cache = {}
def _font(path):
    if path not in _cache:
        f = TTFont(path)
        _cache[path] = (f, f["head"].unitsPerEm, f.getBestCmap(), f.getGlyphSet(), f["hmtx"])
    return _cache[path]

def run(segments, size, tracking=0.0, kern=0.0):
    """segments: Liste aus (text, schriftpfad). kern: Zusatzabstand an jeder Segmentgrenze."""
    parts, x = [], 0.0
    xmin = ymin = 1e9
    xmax = ymax = -1e9
    for index, (text, path) in enumerate(segments):
        if index:
            x += kern
        _, upem, cmap, gs, hmtx = _font(path)
        scale = size / upem
        for ch in text:
            name = cmap.get(ord(ch))
            if name is None:
                x += size * 0.32
                continue
            pen = SVGPathPen(gs)
            gs[name].draw(TransformPen(pen, Transform(scale, 0, 0, -scale, x, 0)))
            d = pen.getCommands()
            if d:
                parts.append(d)
                bp = BoundsPen(gs)
                gs[name].draw(bp)
                if bp.bounds:
                    x0, y0, x1, y1 = bp.bounds
                    xmin = min(xmin, x + x0 * scale)
                    xmax = max(xmax, x + x1 * scale)
                    ymin = min(ymin, -y1 * scale)
                    ymax = max(ymax, -y0 * scale)
            x += hmtx[name][0] * scale + tracking
    return {"d": " ".join(parts), "x0": xmin, "x1": xmax, "y0": ymin, "y1": ymax}
