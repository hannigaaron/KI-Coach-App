"""
PDF als Markdown, damit Claude nur den Text liest und nicht die Seiten als Bild.

Ein PDF als Datei zu öffnen kostet ein Vielfaches an Token, weil jede Seite
mitgeschickt wird. Der Text allein reicht fast immer.

Aufruf, einmal je Sitzung:
  python3 -m venv /tmp/pdfwerk && /tmp/pdfwerk/bin/pip -q install pypdf
  /tmp/pdfwerk/bin/python -I scripts/pdf-zu-md.py <Ordner mit PDFs> <Zielordner>

pypdf ist keine Abhängigkeit der App und gehört in kein package.json.
Seiten, die nur aus Bildern bestehen, kommen leer heraus. Erst dann lohnt es,
genau diese Seiten einzeln anzusehen.
"""
import sys, pathlib, pypdf
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
for f in sorted(src.glob("*.pdf")):
    r = pypdf.PdfReader(str(f))
    teile = [f"# {f.stem}\n"]
    for i, s in enumerate(r.pages, 1):
        teile.append(f"\n## Seite {i}\n\n" + (s.extract_text() or "").strip())
    (out / (f.stem + ".md")).write_text("\n".join(teile))
    print(f.name, len(r.pages), "Seiten")
