# Understanding the Gift Card Fallacy

An "economic physics" explainer video, *how we can share the pie without shrinking it*. It's a hand-drawn-style animation written in plain JavaScript (rough.js on a canvas), with a procedurally generated ukulele/glockenspiel score, synthesized sound effects, and TTS narration.

Source material is in `sources/economics-posts.md` (48 Medium posts). The video mainly draws on these:
*wealth and welfare*, *the schöntrup index*, *tax brackets*, *don't tax the rich, pay the poor*,
*the gift card fallacy*, *the problem with price controls*, *against public libraries*, *abolishing public parking*,
and *more buildings is not more productive*.

## Layout

| path | what |
|---|---|
| `src/script.json` | narration, one entry per line (`text` is the caption; optional `say` overrides what TTS speaks) |
| `src/main.js` | every scene, timed against narration cues like `c('L11', 0.66)` = 66% through line L11 |
| `src/audio.js` | music, sound effects, ducking, narration mix (Web Audio) |
| `tools/tts.py` | generates `narration/*.mp3` + `narration/manifest.json` |
| `tools/render.cjs` | headless Chromium frame-stepping piped into ffmpeg to produce an MP4, plus `out/captions.srt` |

All animation timing is relative to the narration lines, so after you regenerate the narration everything re-syncs on its own. Without narration, line lengths are estimated from word counts.

## Run it

```bash
# 1. narration (pick one; Polly never reads the default AWS_* creds)
export ELEVENLABS_API_KEY=...                  # or:
export POLLY_AWS_ACCESS_KEY_ID=... POLLY_AWS_SECRET_ACCESS_KEY=...
python3 tools/tts.py

# 2. preview in a browser (any static server from this folder)
python3 -m http.server 8000   # then open http://localhost:8000/src/index.html

# 3. render
node tools/render.cjs --draft          # 540p check
node tools/render.cjs                  # 1080p30 -> out/gift-card-fallacy.mp4
node tools/render.cjs --stills L11:0.9,L21:e0.5   # spot-check frames
```

Upload `out/captions.srt` to YouTube as the subtitle track.
