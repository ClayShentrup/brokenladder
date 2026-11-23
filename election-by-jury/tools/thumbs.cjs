// node tools/thumbs.cjs -> out/thumbnail{,-b,-c}.png (1280x720)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '..'), F = 'file://' + R;
const T = [
  ['', 'title', 'center', `<div class="bar" style="top:60px"><div class="a">the case</div><div class="b">against voting</div></div>`],
  ['-b', 'walkout', 'center', `<div class="bar" style="top:40px;left:40px;right:auto;padding:18px 34px"><div class="a" style="font-size:64px">nine witnesses</div><div class="b" style="font-size:110px">walked out</div></div>`],
  ['-c', 'jurybox', 'center', `<div class="bar" style="bottom:40px;top:auto"><div class="a" style="font-size:62px">what if a random jury</div><div class="b" style="font-size:104px">picked the mayor?</div></div>`],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [suf, img, pos, body] of T) {
    fs.writeFileSync('/tmp/_t.html', `<!doctype html><html><head><style>
@font-face{font-family:Oswald;src:url(${F}/src/fonts/oswald-latin-700-normal.woff2);font-weight:700}
body{margin:0;width:1280px;height:720px;position:relative;overflow:hidden;background:#000 url(${F}/gemini/plates/${img}.jpg) ${pos}/cover no-repeat;font-family:Oswald;text-transform:uppercase}
.bar{position:absolute;left:0;right:0;background:rgba(20,20,20,.9);padding:14px 40px 22px;text-align:center;box-shadow:14px 14px 0 #1d3a8a}
.a{color:#efe6d2;font-size:76px;font-weight:700;line-height:1.05}.b{color:#d9a21b;font-size:104px;font-weight:700;line-height:1.0}
</style></head><body>${body}</body></html>`);
    await p.goto('file:///tmp/_t.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(R, 'out', `thumbnail${suf}.png`) });
  }
  await b.close();
})();
