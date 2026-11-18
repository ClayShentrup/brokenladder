#!/usr/bin/env node
// node tools/render.cjs [--draft] [--from s --to s] [--stills 12,S05:0.5,...] [--out name.mp4] [--cues]
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'out');
const args = process.argv.slice(2), flag = (n) => args.includes('--' + n), opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message)); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`);
  const info = await page.evaluate(() => EP.ready); console.log('duration', info.duration.toFixed(2));
  // cue sheet for the audio mix
  const cues = await page.evaluate(() => ({ tl: EP.timeline(), events: EP.events() }));
  fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify({ total: cues.tl.total, lines: cues.tl.order.map((id) => ({ id, start: cues.tl.lines[id].start, end: cues.tl.lines[id].end })), events: cues.events }));
  if (flag('cues')) { await b.close(); srv.close(); return; }
  if (opt('shotstills')) {
    const f = Number(opt('shotstills')); const sh = await page.evaluate(() => EP.shots()); fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
    for (let i = 0; i < sh.length; i++) { const a = sh[i][1], b = i + 1 < sh.length ? sh[i + 1][1] : info.duration; const url = await page.evaluate((t) => EP.frame(t, 0.85), a + f * (b - a)); fs.writeFileSync(path.join(OUT, 'shots', String(i).padStart(2, '0') + '.jpg'), Buffer.from(url.split(',')[1], 'base64')); }
    console.log('shots', sh.length); await b.close(); srv.close(); return;
  }
  if (opt('stills')) {
    const tl = cues.tl;
    for (const spec of opt('stills').split(',')) {
      let s = Number(spec); if (spec.includes(':')) { const [id, f] = spec.split(':'); const L = tl.lines[id]; s = L.start + Number(f) * (L.end - L.start); }
      const url = await page.evaluate((t) => EP.frame(t, 0.9), s); fs.writeFileSync(path.join(OUT, `still-${spec.replace(/[:]/g, '_')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    console.log('stills done'); await b.close(); srv.close(); return;
  }
  const draft = flag('draft'), fps = Number(opt('fps', draft ? 24 : 30));
  const from = Number(opt('from', 0)), to = Math.min(info.duration, Number(opt('to', info.duration)));
  if (draft) await page.evaluate(() => EP.setScale(0.5));
  const mix = path.join(OUT, 'mix.wav');
  if (!fs.existsSync(mix) || flag('remix')) { const r = spawnSync('python3', [path.join(ROOT, 'tools', 'mix.py')], { stdio: 'inherit' }); if (r.status) process.exit(1); }
  const outFile = path.join(OUT, opt('out', draft ? 'draft.mp4' : 'common-knowledge.mp4'));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-ss', String(from), '-t', String(to - from), '-i', mix,
    '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'slow', '-crf', draft ? '24' : '17', '-pix_fmt', 'yuv420p', '-tune', 'film', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((to - from) * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate((t) => EP.frame(t, 0.93), from + i / fps);
    if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 10) === 0) process.stdout.write(`\r${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s `);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('\nwrote', outFile); await b.close(); srv.close();
});
