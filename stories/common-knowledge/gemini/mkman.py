#!/usr/bin/env python3
"""Write manifest.json for src/main.js: {shot index: [[cue|null, file], ...]} for shots whose images all exist."""
import json, os, shots
HERE = os.path.dirname(os.path.abspath(__file__)); man = {}; missing = []
for i, sh in sorted(shots.S.items()):
    keys = [[list(c) if c else None, f'{i:02d}_{k}.jpg'] for k, (c, _) in enumerate(sh['keys'])]
    if all(os.path.exists(os.path.join(HERE, 'shots', f)) for _, f in keys): man[str(i)] = keys
    else: missing.append(i)
json.dump(man, open(os.path.join(HERE, 'manifest.json'), 'w'), indent=0)
print(len(man), 'shots in manifest; missing', missing)
