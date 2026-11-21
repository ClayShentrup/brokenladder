import base64,json,sys,urllib.request
from concurrent.futures import ThreadPoolExecutor
SCENE="A New York City rent-stabilized apartment building at dusk; a tired elderly landlord stands on the sidewalk looking up at it, while in a lit window a tenant sits at a kitchen table. A giant padlock is clamped onto the building's front door, symbolizing a frozen rent."
STY={
 'a-constructivist':"Style: early Soviet constructivist propaganda poster, in the manner of Rodchenko and El Lissitzky photomontage: bold diagonal composition, flat blocks of red, black and cream, halftone photographic cut-outs of the people and building collaged over geometric shapes, a small hammer-and-sickle motif in a corner, worn paper texture. Striking and graphic, not cartoonish.",
 'b-editorial-realism':"Style: serious editorial illustration like a cover of The Economist or The Atlantic: painterly near-photorealism, dramatic cinematic lighting, muted palette with one strong red accent, grounded and adult, not cartoonish.",
 'c-noir-documentary':"Style: photorealistic documentary film still, shot on 35mm at dusk, shallow depth of field, desaturated cool tones with sodium-orange streetlight, grain, the padlock rendered as a stark real object. Grounded, unsettling, not cartoonish.",
}
TAIL=" Full-bleed 16:9 frame, edge to edge, no borders. No text, no letters, no numbers, no logos, no watermarks."
def go(k):
    body={'contents':[{'role':'user','parts':[{'text':SCENE+'\n\n'+STY[k]+TAIL}]}],'generationConfig':{'responseModalities':['IMAGE'],'imageConfig':{'aspectRatio':'16:9','imageSize':'2K'}}}
    req=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    d=json.load(urllib.request.urlopen(req,timeout=400))
    for p in d['candidates'][0]['content']['parts']:
        if 'inlineData' in p: open(k+'.jpg','wb').write(base64.b64decode(p['inlineData']['data'])); return k,'ok'
    return k,'noimg'
with ThreadPoolExecutor(3) as ex:
    for r in ex.map(go,STY): print(r)
