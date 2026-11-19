#!/usr/bin/env python3
"""Find frames with a flat paper margin and crop it (keeps originals in orig/). usage: borders.py [--fix]"""
import glob, os, sys, shutil
import numpy as np
from PIL import Image
fix = '--fix' in sys.argv
for f in sorted(glob.glob('shots/*.jpg')):
    im = Image.open(f).convert('RGB'); a = np.asarray(im).astype(int); H, W, _ = a.shape
    strips = [a[:, :12], a[:, -12:], a[:12], a[-12:]]
    flat = [s.reshape(-1, 3).std(0).mean() < 9 and s.reshape(-1, 3).mean() > 170 for s in strips]
    if sum(flat) < 2: continue
    bg = np.median(np.concatenate([s.reshape(-1, 3) for s, fl in zip(strips, flat) if fl]), axis=0)
    d = (np.abs(a - bg).sum(2) > 60)
    cols = np.where(d.mean(0) > 0.6)[0]; rows = np.where(d.mean(1) > 0.6)[0]
    if not len(cols) or not len(rows): print(f, 'no content'); continue
    x0, x1, y0, y1 = cols[0] + 8, cols[-1] - 8, rows[0] + 8, rows[-1] - 8; bw, bh = x1 - x0, y1 - y0
    nw, nh = (int(bh * 16 / 9), bh) if bw / bh > 16 / 9 else (bw, int(bw * 9 / 16))
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; c = (cx - nw // 2, cy - nh // 2, cx - nw // 2 + nw, cy - nh // 2 + nh)
    print(f, 'margin', flat, 'keep', round(nw / W, 2))
    if fix and nw / W > 0.7:
        os.makedirs('orig', exist_ok=True); o = 'orig/' + os.path.basename(f)
        if not os.path.exists(o): shutil.copy(f, o)
        im.crop(c).resize((W, H), Image.LANCZOS).save(f, quality=93)
