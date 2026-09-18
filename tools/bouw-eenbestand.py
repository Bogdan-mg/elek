#!/usr/bin/env python3
"""Bouwt elek-eenbestand.html: de volledige app in één HTML-bestand.

Die versie heeft geen webserver nodig en kan dus rechtstreeks geopend
worden (dubbelklikken op Windows, of openen vanuit Bestanden op iPad).
De modules worden achter elkaar geplakt tot één gewoon script, omdat
browsers ES-modules blokkeren op file://.
"""
import re, pathlib, base64

WORTEL = pathlib.Path(__file__).resolve().parent.parent
VOLGORDE = ['geometry', 'model', 'symbols', 'store', 'circuits', 'indeling', 'canvas', 'blad', 'board', 'panels', 'exporters', 'app']

def strip_module(bron: str) -> str:
    bron = re.sub(r"^import\s+[^;]*?from\s+'[^']+';\s*$", '', bron, flags=re.M | re.S)
    bron = re.sub(r"^export\s+default\s+\w+;\s*$", '', bron, flags=re.M)
    bron = re.sub(r"^export\s+(?=(const|let|var|function|class|async))", '', bron, flags=re.M)
    return bron.strip()

def controleer_volgorde():
    """Elke module moet in VOLGORDE staan, anders ontbreekt ze in het bestand."""
    bestaand = sorted(p.stem for p in (WORTEL / 'js').glob('*.js'))
    ontbreekt = [naam for naam in bestaand if naam not in VOLGORDE]
    onbekend = [naam for naam in VOLGORDE if naam not in bestaand]
    if ontbreekt or onbekend:
        raise SystemExit(
            'VOLGORDE klopt niet met js/: ontbreekt ' + str(ontbreekt) + ', onbekend ' + str(onbekend))


def main():
    controleer_volgorde()
    html = (WORTEL / 'index.html').read_text()
    css = (WORTEL / 'css/app.css').read_text()
    js = '\n\n'.join(
        f'/* ---- {naam}.js ---- */\n' + strip_module((WORTEL / 'js' / f'{naam}.js').read_text())
        for naam in VOLGORDE
    )
    icoon = base64.b64encode((WORTEL / 'icons/icoon.svg').read_bytes()).decode()

    html = html.replace('<link rel="stylesheet" href="./css/app.css">', '<style>\n' + css + '\n</style>')
    html = html.replace('<link rel="manifest" href="./manifest.webmanifest">', '')
    html = html.replace('<link rel="icon" href="./icons/icoon.svg" type="image/svg+xml">',
                        f'<link rel="icon" href="data:image/svg+xml;base64,{icoon}">')
    html = html.replace('<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">', '')
    html = html.replace('<script type="module" src="./js/app.js"></script>', '<script>\n' + js + '\n</script>')

    doel = WORTEL / 'elek-eenbestand.html'
    doel.write_text(html)
    print(f'{doel} geschreven ({doel.stat().st_size // 1024} kB)')

if __name__ == '__main__':
    main()
