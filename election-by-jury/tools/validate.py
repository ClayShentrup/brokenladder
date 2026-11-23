#!/usr/bin/env python3
"""Check every word cue in src/_scenes.js exists in its line's say/text, and every c()/ce() id exists."""
import re, json, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = {l['id']: l.get('say', l['text']) for l in json.load(open(f'{R}/src/script.json'))['lines']}
s = open(f'{R}/src/_scenes.js').read()
bad = 0
for m in re.finditer(r"(?:w\(|\[)'([A-Z][0-9]+[a-z0-9]*)',\s*(['\"])(.*?)\2", s):
    i, word = m.group(1), m.group(3).replace("\\'", "'")
    if i not in L: print('missing id', i); bad += 1
    elif word not in L[i]: print('cue not found', i, repr(word)); bad += 1
for m in re.finditer(r"\b(?:c|ce)\('([A-Z][0-9]+[a-z0-9]*)'", s):
    if m.group(1) not in L: print('missing id', m.group(1)); bad += 1
print('problems:', bad)
