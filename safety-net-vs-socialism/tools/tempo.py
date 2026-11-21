#!/usr/bin/env python3
"""Speed narration by a factor, keeping originals in narration/raw and rescaling the word timings."""
import json, os, subprocess, sys
F = float(sys.argv[1]) if len(sys.argv) > 1 else 1.1
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); N = f'{R}/narration'
os.makedirs(f'{N}/raw', exist_ok=True)
man = json.load(open(f'{N}/manifest.json')); raw_man = f'{N}/raw/manifest.json'
if not os.path.exists(raw_man): json.dump(man, open(raw_man, 'w'), indent=1)
src = json.load(open(raw_man))
for id_, info in src['lines'].items():
    rawf = f'{N}/raw/{info["file"]}'
    if not os.path.exists(rawf): os.replace(f'{N}/{info["file"]}', rawf)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', rawf, '-af', f'atempo={F}', '-b:a', '160k', f'{N}/{info["file"]}'], check=True)
    out = dict(info); out['duration'] = round(info['duration'] / F, 3)
    if info.get('chars'): out['chars'] = [round(c / F, 3) for c in info['chars']]
    man['lines'][id_] = out
man['tempo'] = F
json.dump(man, open(f'{N}/manifest.json', 'w'), indent=2)
print('total', round(sum(v['duration'] for v in man['lines'].values()), 1))
