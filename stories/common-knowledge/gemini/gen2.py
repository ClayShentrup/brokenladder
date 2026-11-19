#!/usr/bin/env python3
"""Generate a shot with the native Gemini API, attaching character sheets as references.
usage: gen2.py out.jpg "prompt" [ref.jpg ...]"""
import base64, json, sys, urllib.request
STYLE = ("Style: hand-drawn colored pencil and graphite on warm cream sketchbook paper, visible pencil hatching and paper tooth, "
         "noir mood with selective color accents (amber streetlight, wet reflections), realistic adult human proportions and anatomy, "
         "restrained and cinematic, like a skilled illustrator's finished storyboard frame. Full-bleed 16:9 frame, no page borders, no sketchbook edges. "
         "No text, no lettering, no captions, no signatures, no watermarks.")
def gen(out, prompt, refs=(), model='gemini-3-pro-image-preview', aspect='16:9'):
    parts = []
    for r in refs:
        parts.append({'inline_data': {'mime_type': 'image/jpeg', 'data': base64.b64encode(open(r, 'rb').read()).decode()}})
    lead = ('The attached images are character reference sheets. Keep each character\'s face, build, hair and clothing exactly consistent with their sheet. '
            if refs else '')
    parts.append({'text': lead + prompt + '\n\n' + STYLE})
    body = {'contents': [{'role': 'user', 'parts': parts}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': aspect}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=300))
    for p in d['candidates'][0]['content']['parts']:
        if 'inlineData' in p:
            open(out, 'wb').write(base64.b64decode(p['inlineData']['data'])); return
    raise SystemExit('no image: ' + json.dumps(d)[:500])
if __name__ == '__main__':
    gen(sys.argv[1], sys.argv[2], sys.argv[3:])
