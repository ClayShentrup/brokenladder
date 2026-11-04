---
name: explainer-video
description: Make a narrated, hand-drawn-style animated explainer video (YouTube-ready MP4 + SRT captions) from essays, articles, emails, or data, entirely in code. Use when the user asks for an explainer, animated video, whiteboard-style video, or wants to turn writing into a video. Covers research, script, ElevenLabs/Polly narration with word-level timing, rough.js animation, procedural music and sound effects, rendering, fact-checking, and YouTube metadata.
---

# Hand-drawn explainer videos

Pure JavaScript animation (rough.js on a canvas, "boiling" hand-drawn lines), procedural ukulele/glockenspiel score, synthesized sound effects, TTS narration, rendered frame-by-frame in headless Chromium and piped into ffmpeg. Every frame is a pure function of time, so the same code drives a live browser preview and the final render.

Worked examples in this repo: `economic-physics/` (gift card fallacy), `election-by-jury/`, `cardinal-voting/` (16+ scenes, the richest). The engine template lives in `template/` next to this file.

## Workflow

1. **Start a project.** Copy `template/` to a new folder (e.g. `cp -r .claude/skills/explainer-video/template my-video`). If the folder sits inside a Jekyll/static site, exclude it from the build.
2. **Research first, then script.** Read every source the user gives (see "Getting sources" below). Pull out the 3–5 ideas the audience must leave with, the best concrete examples, and every number you'll put on screen. Verify numbers yourself (recompute math, check primary documents, search for outcomes that happened after the article was written).
3. **Write `src/script.json`.** One entry per narration line: `id`, `text` (caption), optional `say` (what TTS speaks: phonetic spellings like "Beggitch", "Shurn-troop", "Con-dor-say"), optional `gap` (pause after, default 0.42 s; use ~1.0–1.2 between sections). Open with a concrete hook, not a definition. Explain non-obvious concepts with a tiny worked example before naming them (e.g. do the accounting for a $10 gift worth $7 before saying "deadweight loss"). Pace: ~2.4 words/sec, so 1,000 words ≈ 7 min.
4. **Record narration:** `python3 tools/tts.py` (or `--only L3,L4` for a few lines). ElevenLabs returns per-character timestamps, so cues land on exact words. Re-record neighbors of a changed line too (it passes previous/next text for natural prosody). Check `narration/manifest.json` totals.
5. **Build scenes in `src/main.js`.** One function per scene; register in `buildScenes()` with `{ start: c('ID') - 0.7, draw: fn }` (scenes slide in over 0.75 s). Anchor every animation to words with `w('ID', 'exact words')`; the console warns if a word isn't found. Add sound effects in the same function.
6. **Check stills, not just code.** `node tools/render.cjs --stills A3:e0,B2:0.5,C1:e-0.2` (seconds, fraction-of-line, or `e±s` relative to line end). Stitch them into contact sheets with ffmpeg `hstack/vstack` and LOOK at them. Fix overlaps, unreadable text, empty stretches (if a line opens with nothing on screen for 2+ s, add something), and anything that covers something else.
7. **Draft:** `node tools/render.cjs --draft` (540p, fast). **Final:** `node tools/render.cjs` → `out/gift-card-fallacy.mp4` (rename via `--out name.mp4`) and `out/captions.srt`. Rendering takes roughly 1.1× real time at 1080p30. Run long renders in the background.
8. **Deliver:** the MP4, the SRT (upload as YouTube subtitles "with timing"), a title, two A/B alternate titles, and a description with chapter timestamps (first chapter at 0:00, each ≥ 10 s; get line start times from `node tools/render.cjs --timeline --stills 0`).

## Engine reference (src/main.js)

- Canvas is 1920×1080. Palette `P` (paper, ink, red, teal, gold, blue, plum, green, grey, cream). Fonts: `HAND` (Caveat), `PRINT` (Patrick Hand). The Latin subsets lack `→` and subscripts; draw arrows with `arrow()` and position subscripts manually.
- Time: `c(id, frac)`, `w(id, word, extra)`, `ce(id, extra)`; `prog`, `popS`, `fadeIn`, `fadeOut`, `eIO`, `eOut`.
- Drawing: `line`, `rect`, `circ`, `ell`, `path`, `poly`, `curveP` (draw-on polyline), `arrow`, `txt` (write-on via `p`), `wt` (write-on between two times), `stamp`, `grp` (transform + alpha), plus illustrations: `person`, `bag`, `pie`, `giftCard`, `house`, `stairs`, `factory`, `land`, `cash`, `shield`, `book`, `bulb`, `check`, `coin`, `stall`, `jar`, `bubble`, `sweater`, `priceTag`, `xMark`, `checkMark`, `desk`, `ballot`, `station`, `shops`, `hospital`, `lot`, `ledger`, `ballotCard`, `hbar`, `matchup`, `card`, `token`, `veil`, `scale2`, `star`.
- **Seed counter `KC`:** every rough shape consumes seeds in draw order; when a branch skips drawing, add `KC += n` so later shapes don't visibly jump.
- **Full-screen cover** for a "new slide" within a scene: `ctx.save(); ctx.globalAlpha = fadeIn(t0, 0.4); ctx.drawImage(PAPER, -W, 0, W * 3, H); ctx.restore();` Use full opacity; partial lets the old chart bleed through.
- Fade out a phase before the next phase draws in the same space (`fadeOut(c('NEXT') - 0.2, 0.4)` as the group alpha).

## Audio (src/audio.js) — hard-won lessons

- **Schedule audio just-in-time.** Chrome walks every scheduled node on every render quantum; queuing ~15k notes up front made a 30 s offline render take 192 s. The engine pumps jobs ~3 s ahead (offline: `ac.suspend()` windows; live: `setInterval`).
- **Return the WAV in chunks** from the page (`EP.audioChunk`), never one giant base64 string over CDP.
- **Fade every narration clip** (15 ms in, up to 250 ms out). TTS clips end on room tone and a hard stop reads as a click/glitch.
- **Loudness:** measure the mix's integrated LUFS, apply one static gain to hit −14 LUFS, then a fast `alimiter`. Never single-pass `loudnorm`: it rides gain in real time and pumps audibly every time narration stops.
- Music ducks under narration automatically from the timeline. SFX names: pop, pop2, whoosh, scribble, sparkle, ding, fire, poof, chaching, coin, boing, stamp, tick, slide, sad, bulb.
- You can't listen. Measure instead: `ffmpeg -af ebur128=peak=true` (target I ≈ −14, peak < −1 dB), spectrograms (`showspectrumpic`) around reported glitches, `silencedetect`. Tell the user what you couldn't verify by ear.

## Narration (tools/tts.py)

- Default provider ElevenLabs (`ELEVENLABS_API_KEY`); Polly fallback reads only `POLLY_AWS_ACCESS_KEY_ID/SECRET` so a work AWS account in the environment is never billed. Never use credentials the user didn't explicitly provide for this.
- Starter plan only allows `mp3_44100_128` (192 kbps needs Creator; YouTube re-encodes anyway). A restricted key may lack `voices_read`; ask the user for voice IDs instead of searching.
- Credits ≈ characters. Budget before recording: sum of `say`/`text` lengths + ~15% for re-takes, and tell the user if they need more.
- Trailing silence is trimmed; leading isn't (character timestamps must stay valid).

## Getting sources

- The cloud sandbox may block domains (403 at the proxy) until the user allows them; Medium and Electowiki sit behind Cloudflare bot checks even when allowed. Don't use paywall mirrors or bot-evasion. Try the author's RSS feed (`medium.com/feed/@user`, full text of the latest 10 posts), then ask the user to paste or upload (PDF works; read chart values visually from the pages).
- Long email threads: delegate to a subagent with Gmail tools and ask for a structured digest (claims, best examples verbatim, counterarguments, numbers), so the transcript stays out of your context.
- Check what happened after an article was written (bill signings, repeals, bans) with a web search before scripting it as current.

## Content standards

- Recompute any statistic you put on screen; if the source's figure differs from yours, use a phrasing true under both ("more than ninety percent").
- Real people: describe by title, stick to the documented record, and leave out inferences about motives. Say so to the user.
- Attribute simulation results to their author; prefer published results over a single private run; caveat unrepresentative polls in the narration itself.
- Mark values read off charts as approximate (`~52%`).
- Commit and push the project (script, narration, sources, code) as you go; the cloud container is ephemeral. Keep `out/` (renders) gitignored and deliver video files directly.
