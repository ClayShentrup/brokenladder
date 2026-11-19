#!/usr/bin/env python3
"""Generate one image from a prompt through the Gemini API (OpenAI-compatible endpoint; the session proxy adds the key)."""
import base64, json, sys, urllib.request
STYLE = ("Style: hand-drawn colored pencil and graphite on warm cream sketchbook paper, visible pencil hatching and paper tooth, "
         "noir mood with selective color accents (amber streetlight, wet reflections), realistic adult human proportions and anatomy, "
         "subtle and restrained, like a skilled illustrator's finished sketchbook page. No text, no lettering, no captions, no signatures, no watermarks.")
def gen(prompt, out, model='gemini-3-pro-image-preview', size='1792x1024'):
    body = {'model': model, 'prompt': prompt + '\n\n' + STYLE, 'n': 1, 'size': size, 'response_format': 'b64_json'}
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/openai/images/generations', data=json.dumps(body).encode(),
                                 headers={'Authorization': 'Bearer proxy-injected', 'Content-Type': 'application/json'})
    d = json.load(urllib.request.urlopen(req, timeout=300))
    open(out, 'wb').write(base64.b64decode(d['data'][0]['b64_json']))
if __name__ == '__main__':
    gen(sys.argv[2], sys.argv[1])
