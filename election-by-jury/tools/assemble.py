#!/usr/bin/env python3
"""Rebuild src/main.js from the reusable engine (main.base.js) and the scenes (_mid.js)."""
import re, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b = open(f'{R}/src/main.base.js').read().split('\n')
head = '\n'.join(b[:145]).replace("paper: '#f8f1e3'", "paper: '#e9dcc0'")
head = re.sub(r'^// .*$', '// "the case against voting": constructivist plates with canvas overlays.', head, count=1, flags=re.M)
paper = '\n'.join(b[377:393]).replace("g.fillStyle = 'rgba(63,111,216,0.05)';\n    for (let y = 90; y < H; y += 54) g.fillRect(0, y, W, 2);", '')
tail = '\n'.join(b[1156:])
fonts_old = tail[tail.index("    const fonts = ["):tail.index("    await Promise.all(fonts.map")]
fonts_new = """    const fonts = [
      new FontFace('Oswald', 'url(fonts/oswald-latin-700-normal.woff2)', { weight: '700' }),
      new FontFace('Oswald', 'url(fonts/oswald-latin-500-normal.woff2)', { weight: '500' }),
      new FontFace('Oswald', 'url(fonts/oswald-latin-400-normal.woff2)', { weight: '400' }),
      new FontFace('IBM Plex Mono', 'url(fonts/ibm-plex-mono-latin-500-normal.woff2)', { weight: '500' }),
      new FontFace('IBM Plex Mono', 'url(fonts/ibm-plex-mono-latin-400-normal.woff2)', { weight: '400' }),
      new FontFace('Caveat', 'url(fonts/caveat-latin-700-normal.woff2)', { weight: '700' }),
      new FontFace('Patrick Hand', 'url(fonts/patrick-hand-latin-400-normal.woff2)', { weight: '400' }),
    ];
"""
tail = tail.replace(fonts_old, fonts_new)
tail = re.sub(r"    const names = \[.*?\];", "    const names = (await (await fetch('../gemini/plates.json', { cache: 'no-store' })).json());", tail, flags=re.S)
tail = tail.replace("ctx.font = `400 38px ${PRINT}`;", "ctx.font = `500 38px 'Oswald'`;")
open(f'{R}/src/main.js', 'w').write(head + '\n' + paper + '\n\n' + open(f'{R}/src/_mid.js').read() + '\n' + tail)
import json
json.dump(sorted(f[:-4] for f in os.listdir(f'{R}/gemini/plates') if f.endswith('.jpg')), open(f'{R}/gemini/plates.json', 'w'))
print('assembled')
