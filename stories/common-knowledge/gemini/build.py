#!/usr/bin/env python3
"""Generate every shot image in shots.py into shots/NN_k.jpg (skips existing). usage: build.py [indices...]"""
import base64, json, os, re, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
import shots
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'shots')
SHEETS = {'j': ('JULIAN', 'julian-sheet.jpg'), 'h': ('HENRIK', 'henrik-sheet3.jpg')}
STYLE = ("Style: hand-drawn colored pencil and graphite on warm cream paper, visible pencil hatching and paper tooth, noir mood with selective "
         "color accents, realistic adult human proportions and anatomy, restrained and cinematic, like a skilled illustrator's finished storyboard frame. "
         "The drawing is a full-bleed 16:9 film frame: the scene and its background extend all the way to all four edges of the image, with no cream paper showing around it, no vignette panel, no page borders, no sketchbook edges, no margins. No text, no lettering, no captions, no signatures, no watermarks.")
MODEL = 'gemini-3-pro-image-preview'
def palette(i): return [p for s, p in shots.PALETTE if s <= i][-1]
def fname(i, k): return os.path.join(OUT, f'{i:02d}_{k}.jpg')
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
def clean(t): return re.sub(r'; (first|second) reference sheet', '', t).replace(' (first reference sheet)', '').replace(' (second reference sheet)', '')
def make(i):
    sh = shots.S[i]; out = []
    for k, (cue, prompt) in enumerate(sh['keys']):
        f = fname(i, k)
        if os.path.exists(f): continue
        parts, notes = [], []
        if k == 0:
            for c in sh.get('who', ''):
                parts.append(img(os.path.join(HERE, SHEETS[c][1]))); notes.append(f'Image {len(parts)} is the character reference sheet for {SHEETS[c][0]}: keep his face, build, hair and clothes exactly consistent with it.')
            for r in sh.get('ref', []):
                if os.path.exists(fname(r, 0)) and r != i:
                    parts.append(img(fname(r, 0))); notes.append(f'Image {len(parts)} shows the same location in an earlier shot: keep the architecture, lighting and drawing style consistent with it (it is not a composition to copy).')
            text = ' '.join(notes) + ('\n\n' if notes else '') + clean(prompt) + '\n\n' + palette(i) + '\n' + STYLE
        else:
            parts.append(img(fname(i, 0)))
            text = ('Edit this image. ' + prompt + ' Keep everything else identical: the same man, framing, lighting, colours, clothing, background and drawing style. '
                    'Output a single full-bleed frame, the same composition as the input.')
        parts.append({'text': text})
        for attempt in range(4):
            try:
                data = call(parts); open(f, 'wb').write(data); out.append(os.path.basename(f)); break
            except Exception as e:
                msg = e.read().decode()[:200] if isinstance(e, urllib.error.HTTPError) else str(e)[:200]
                print(f'shot {i} key {k} attempt {attempt}: {msg}', flush=True); time.sleep(10 * (attempt + 1))
    return i, out
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    want = [int(a) for a in sys.argv[1:]] or sorted(shots.S)
    first = [i for i in (8, 27) if i in want]
    for i in first: print(make(i), flush=True)
    with ThreadPoolExecutor(4) as ex:
        for r in ex.map(make, [i for i in want if i not in first]): print(r, flush=True)
