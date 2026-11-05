// render one still per shot (at fraction f of each shot) into out/shots/, plus a contact sheet
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'out', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const f = Number(process.argv[2] || 0.6);
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } fs.createReadStream(p).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/src/index.html`);
  const info = await page.evaluate(() => EP.ready);
  const files = [];
  for (const [i, [name, s, e]] of info.shots.entries()) {
    const t = s + (e - s) * f; const url = await page.evaluate((tt) => EP.frame(tt, 0.85), t);
    const fn = path.join(OUT, `${String(i).padStart(2, '0')}-${name}.jpg`); fs.writeFileSync(fn, Buffer.from(url.split(',')[1], 'base64')); files.push(fn);
    console.log(i, name, s, e);
  }
  await b.close(); srv.close();
  // contact sheets of 8
  for (let g = 0; g * 8 < files.length; g++) {
    const set = files.slice(g * 8, g * 8 + 8); while (set.length < 8) set.push(set[set.length - 1]);
    const inputs = set.flatMap((x) => ['-i', x]);
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', ...inputs, '-filter_complex', '[0][1][2][3]hstack=4[a];[4][5][6][7]hstack=4[b];[a][b]vstack,scale=1920:-1', path.join(OUT, `sheet${g}.jpg`)]);
  }
});
