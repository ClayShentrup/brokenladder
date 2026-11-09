# Broken Ladder music videos: house style

The painted texture is the signature look for every Broken Ladder video. Start each new video from it.

The reference point is the "horses never measured what we had" shot in *The Shape of the Almost* (`the-shape-of-the-almost/src/mv4.js`, `scPasture`).

## The look

- **Painted, not drawn.** Skies and land are washes built from layered noise fields (`washSkyC`, `washLand`), with broken dry-brush streaks (`dryBand`). Avoid hard vector gradients and crisp outlines.
- **Rich colour is allowed.** Saturated dawns, violet storms and green aurora are all fine. Muted ochre and charcoal is one option, used where a scene calls for it (`{ sat: 0.62 }` on the shot).
- **Texture over everything.** Each frame gets a global post pass in `render()`:
  - translucent sweeps of light (`veils`)
  - a gentle warm soft-light grade (`grade`)
  - paper overlay and film grain
  - flickering vertical scratches and dust (`scratches`)
- **Soft edges.** Silhouettes such as houses, trailers and figures are drawn with a slight blur (`ctx.filter = 'blur(~1px)'`).
- **The one clean element.** Gold line drawings (`goldShape`) are the only crisp, bright thing on screen. Use them for what could have been.

## People and animals

- **Small, still and soft.** Use painted standing figures (`standing`) or grazing horses (`grazer`), far off in the landscape. Only the wind moves, plus maybe a tail swish.
- **Scribbled ink figures** (`scrib`) are for abstract moments: dense scribble heads, thin wobbly bodies, mostly still. They can be gold for the almost.
- **Never** animate walking or running people, and never show close-up animals drawn as solid vector shapes.

## Direction

- **Ask what a director for Radiohead, Sigur Rós or Björk would do.** Aim for elegant and enigmatic over literal.
- **Fit the lyrics without illustrating them.** Use nature, light, water, sky and space, and organic motion like grass in wind, seeds, ink in water, aurora, star trails.
- **No text on screen.** No band members, no close-up faces, and no props that read as cheap symbols, like beer cans or cigarettes.
- **Cut on lyric lines and downbeats.** Hold long takes with slow camera drift.

## Tools

- **Shot stills:** `node tools/shotstills.cjs 0.6` writes one still per shot plus contact sheets. Review these before any full render.
- **Review render:** `node tools/render.cjs` (H.264 crf 16, AAC 320k).
- **Upload master:** `node tools/render.cjs --master --audio <wav>`. This writes lossless PNG frames to ProRes 422 HQ 10-bit, with 24-bit PCM audio. Run it locally, since the output is several GB.
