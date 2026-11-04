#!/usr/bin/env node
// Render the explainer to MP4: deterministic frame stepping in headless Chromium, piped to ffmpeg.
//
//   node tools/render.cjs                      full 1080p30 render -> out/gift-card-fallacy.mp4
//   node tools/render.cjs --draft              540p, faster, for checking timing
//   node tools/render.cjs --captions           burn captions into the picture
//   node tools/render.cjs --stills 12,40,95    just write PNG stills at those seconds
//   node tools/render.cjs --from 30 --to 60    render a slice
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/src/index.html?render=1${flag('captions') ? '&captions=1' : ''}`);
  const info = await page.evaluate(() => EP.ready);
  const dur = info.duration;
  console.log(`duration ${dur.toFixed(2)}s, narration: ${info.hasNarration ? 'yes' : 'NO (estimated timing)'}`);

  fs.writeFileSync(path.join(OUT, 'captions.srt'), await page.evaluate(() => EP.srt()));

  if (flag('timeline')) { const tl = await page.evaluate(() => EP.timeline()); tl.order.forEach((id) => console.log(id, tl.lines[id].start.toFixed(2), tl.lines[id].end.toFixed(2))); }
  if (opt('stills')) {
    const tl = await page.evaluate(() => EP.timeline());
    for (const spec of opt('stills').split(',')) {
      // "12.5" = seconds; "L5:0.8" = 80% through line L5; "L5:e+0.5" = 0.5s after L5 ends
      let s = Number(spec);
      if (spec.includes(':')) { const [id, f] = spec.split(':'); const L = tl.lines[id]; s = f.startsWith('e') ? L.end + Number(f.slice(1) || 0) : L.start + Number(f) * L.dur; }
      const url = await page.evaluate((t) => EP.frame(t, 0.9), s);
      const f = path.join(OUT, `still-${spec.replace(/[:+]/g, '_')}.jpg`);
      fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
      console.log('wrote', f);
    }
    await browser.close(); srv.close(); return;
  }

  const draft = flag('draft');
  const fps = Number(opt('fps', draft ? 24 : 30));
  const from = Number(opt('from', 0)), to = Math.min(dur, Number(opt('to', dur)));
  if (draft) await page.evaluate(() => EP.setScale(0.5));

  console.log('rendering audio…');
  const wavPath = path.join(OUT, 'mix.wav');
  let ta = Date.now();
  const nBytes = await page.evaluate(() => EP.renderAudio());
  const parts = [], SZ = 3 * 1024 * 1024;
  for (let i = 0; i < nBytes; i += SZ) parts.push(Buffer.from(await page.evaluate(([a, b]) => EP.audioChunk(a, b), [i, SZ]), 'base64'));
  fs.writeFileSync(wavPath, Buffer.concat(parts));
  console.log(`audio ${(nBytes / 1e6).toFixed(1)}MB in ${((Date.now() - ta) / 1000).toFixed(1)}s`);

  // Static gain to hit YouTube's -14 LUFS, then a fast peak limiter. (Single-pass loudnorm
  // rides the gain in real time and pumps audibly every time the narration stops.)
  const meas = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-i', wavPath, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const I = Number((meas.match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold[\s\S]*$/) || meas.match(/I:\s+(-?[\d.]+) LUFS(?![\s\S]*I:)/) || [])[1]);
  const gainDb = Number.isFinite(I) ? -14 - I : 0;
  console.log(`mix ${I} LUFS -> gain ${gainDb.toFixed(2)} dB`);
  const name = opt('out', draft ? 'draft.mp4' : 'gift-card-fallacy.mp4');
  const outFile = path.join(OUT, name);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-ss', String(from), '-t', String(to - from), '-i', wavPath,
    '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'slow', '-crf', draft ? '26' : '17', '-pix_fmt', 'yuv420p',
    '-tune', 'animation', '-af', `volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.79:attack=5:release=60:level=disabled`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  const n = Math.round((to - from) * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate((t) => EP.frame(t, 0.93), from + i / fps);
    if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 5) === 0) process.stdout.write(`\r${i}/${n} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s  `);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\nwrote ${outFile}`);
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
