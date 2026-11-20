#!/usr/bin/env python3
"""Generate plates in plates.py into plates/<name>.jpg (skips existing). usage: build.py [names...]"""
import base64, json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
import plates
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'plates')
MODEL = 'gemini-3-pro-image-preview'
STYLE = ("Style: warm hand-drawn editorial illustration, confident ink linework with loose watercolor washes and a little colored pencil texture, "
         "friendly and grounded, realistic adult proportions, like a skilled illustrator's finished spread for a thoughtful magazine explainer. "
         "Palette: warm cream, ink navy, tomato red, teal, mustard gold, sage green. "
         "The image is a full-bleed 16:9 frame: the scene extends to all four edges, no paper border, no vignette, no margins. "
         "No text, no words, no letters, no numbers, no signs with writing, no captions, no logos, no watermarks.")
def call(parts):
    body = {'contents': [{'role': 'user', 'parts': parts}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '16:9', 'imageSize': '2K'}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=400))
    for p in d['candidates'][0]['content']['parts']:
        if 'inlineData' in p: return base64.b64decode(p['inlineData']['data'])
    raise RuntimeError('no image: ' + json.dumps(d)[:300])
def img(path): return {'inline_data': {'mime_type': 'image/jpeg', 'data': base64.b64encode(open(path, 'rb').read()).decode()}}
def f(n): return os.path.join(OUT, n + '.jpg')
def make(name):
    if os.path.exists(f(name)): return name, 'exists'
    sp = plates.P[name]; parts, notes = [], []
    if sp.get('edit'):
        parts.append(img(f(sp['edit'])))
        text = 'Edit this image. ' + sp['prompt'] + ' Keep the same viewpoint, framing, drawing style, colours and every other detail unless told otherwise. Output one full-bleed frame. No text or numbers anywhere.'
    else:
        for c in sp.get('who', []):
            parts.append(img(f(c))); notes.append(f'Image {len(parts)} is the character sheet for {plates.CHAR[c]}: keep the face, build, hair and clothes consistent with it.')
        for r in sp.get('ref', []):
            parts.append(img(f(r))); notes.append(f'Image {len(parts)} shows the same place earlier: keep its architecture, layout and style consistent (not a composition to copy).')
        text = ' '.join(notes) + ('\n\n' if notes else '') + sp['prompt'] + '\n\n' + (plates.SHEET_STYLE if name.startswith('sheet') else STYLE)
    parts.append({'text': text})
    for attempt in range(5):
        try:
            open(f(name), 'wb').write(call(parts)); return name, 'ok'
        except Exception as e:
            msg = e.read().decode()[:200] if isinstance(e, urllib.error.HTTPError) else str(e)[:200]
            print(f'{name} attempt {attempt}: {msg}', flush=True); time.sleep(15 * (attempt + 1))
    return name, 'FAILED'
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    want = sys.argv[1:] or list(plates.P)
    # dependencies first: sheets, then bases of edits/refs, then the rest
    deps = lambda n: plates.P[n].get('who', []) + plates.P[n].get('ref', []) + ([plates.P[n]['edit']] if plates.P[n].get('edit') else [])
    done = {n for n in plates.P if os.path.exists(f(n))}
    todo = list(want)
    while todo:
        ready = [n for n in todo if all(d in done or d not in todo and os.path.exists(f(d)) for d in deps(n))]
        if not ready: print('unresolvable', todo); break
        with ThreadPoolExecutor(4) as ex:
            for n, r in ex.map(make, ready): print(n, r, flush=True); done.add(n)
        todo = [n for n in todo if n not in ready]
