#!/usr/bin/env python3
"""Crop a cream paper margin off generated frames and restore 16:9. usage: autocrop.py file..."""
import sys
from PIL import Image, ImageChops
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB'); W, H = im.size
    bg = Image.new('RGB', im.size, im.getpixel((3, 3)))
    diff = ImageChops.difference(im, bg).convert('L').point(lambda v: 255 if v > 28 else 0)
    box = diff.getbbox()
    if not box: print(f, 'blank?'); continue
    x0, y0, x1, y1 = box; m = 6; x0 += m; y0 += m; x1 -= m; y1 -= m
    bw, bh = x1 - x0, y1 - y0
    if bw / bh > 16 / 9: nw, nh = int(bh * 16 / 9), bh
    else: nw, nh = bw, int(bw * 9 / 16)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    c = (cx - nw // 2, cy - nh // 2, cx - nw // 2 + nw, cy - nh // 2 + nh)
    if nw < W * 0.8: print(f, 'skip, crop too large', c); continue
    im.crop(c).resize((W, H), Image.LANCZOS).save(f, quality=93); print(f, 'cropped to', c)
