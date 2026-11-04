#!/usr/bin/env node
// node tools/render.cjs [--draft] [--from s --to s] [--stills 10,65.6,...] [--out name.mp4]
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'out');
const args = process.argv.slice(2), flag = (n) => args.includes('--' + n), opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`);
  const info = await page.evaluate(() => EP.ready); console.log('duration', info.duration.toFixed(2), JSON.stringify(info.sections));
  if (opt('stills')) {
    for (const s of opt('stills').split(',')) { const url = await page.evaluate((t) => EP.frame(t, 0.9), Number(s)); fs.writeFileSync(path.join(OUT, `still-${s}.jpg`), Buffer.from(url.split(',')[1], 'base64')); }
    console.log('stills done'); await b.close(); srv.close(); return;
  }
  const draft = flag('draft'), fps = Number(opt('fps', draft ? 24 : 30));
  const from = Number(opt('from', 0)), to = Math.min(info.duration, Number(opt('to', info.duration)));
  if (draft) await page.evaluate(() => EP.setScale(0.5));
  const outFile = path.join(OUT, opt('out', draft ? 'draft.mp4' : 'the-shape-of-the-almost.mp4'));
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-ss', String(from), '-t', String(to - from), '-i', path.join(ROOT, 'src', 'song.m4a'),
    '-c:v', 'libx264', '-preset', draft ? 'veryfast' : 'slow', '-crf', draft ? '24' : '16', '-pix_fmt', 'yuv420p', '-tune', 'film',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((to - from) * fps), t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate((t) => EP.frame(t, 0.93), from + i / fps);
    if (!ff.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (fps * 10) === 0) process.stdout.write(`\r${i}/${n} ${((Date.now() - t0) / 1000).toFixed(0)}s `);
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); console.log('\nwrote', outFile); await b.close(); srv.close();
});
