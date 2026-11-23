#!/usr/bin/env python3
"""Contact sheet: sheet.py out.jpg cols img..."""
import sys
from PIL import Image, ImageDraw
out, cols, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
w = 640; h = 360; rows = (len(files) + cols - 1) // cols
S = Image.new('RGB', (w * cols, (h + 20) * rows), 'white'); d = ImageDraw.Draw(S)
for n, f in enumerate(files):
    im = Image.open(f).convert('RGB'); im.thumbnail((w, h)); x, y = (n % cols) * w, (n // cols) * (h + 20)
    S.paste(im, (x, y + 20)); d.text((x + 4, y + 4), f.split('/')[-1], fill='black')
S.save(out, quality=85)
