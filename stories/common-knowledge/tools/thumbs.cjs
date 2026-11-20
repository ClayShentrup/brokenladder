// Thumbnails from the Gemini shots: node tools/thumbs.cjs -> out/common-knowledge-thumbnail{,-b,-c}.png (1280x720)
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '..'), F = 'file://' + R;
const T = [
  ['', 'gemini/shots/08_0.jpg', 'center 40%', 'bottom', 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.55) 30%, rgba(0,0,0,0) 55%)', `<div class="t" style="left:0;right:0;bottom:40px;text-align:center"><div class="big">common knowledge</div><div class="sub">a spy story</div></div>`],
  ['-b', 'gemini/shots/72_1.jpg', '70% center', 'left', 'linear-gradient(to right, rgba(0,0,0,.9) 0%, rgba(0,0,0,.6) 38%, rgba(0,0,0,0) 60%)', `<div class="t" style="left:50px;top:150px;width:620px"><div class="big" style="font-size:128px;line-height:.95">common<br>knowledge</div><div class="q">"i figured you'd<br>spot that."</div></div>`],
  ['-c', 'gemini/shots/57_0.jpg', 'center 55%', 'top', 'linear-gradient(to bottom, rgba(0,0,0,.88) 0%, rgba(0,0,0,.5) 30%, rgba(0,0,0,0) 50%)', `<div class="t" style="left:0;right:0;top:26px;text-align:center"><div class="big" style="font-size:112px">he knows i know he knows</div></div>`],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [suf, img, pos, , grad, body] of T) {
    const html = `<!doctype html><html><head><style>
@font-face{font-family:Caveat;src:url(${F}/src/fonts/caveat-latin-700-normal.woff2);font-weight:700}
body{margin:0;width:1280px;height:720px;position:relative;overflow:hidden;background:#000 url(${F}/${img}) ${pos}/cover no-repeat;font-family:Caveat}
.g{position:absolute;inset:0;background:${grad}}.t{position:absolute;color:#f3ead8;text-shadow:0 4px 18px rgba(0,0,0,.9)}
.big{font-size:150px;font-weight:700;line-height:1}.sub{font-size:60px;color:#e8b04a;margin-top:-6px}.q{font-size:66px;color:#ff7a66;margin-top:26px;line-height:1.05}
</style></head><body><div class="g"></div>${body}</body></html>`;
    fs.writeFileSync('/tmp/_thumb.html', html);
    await p.goto('file:///tmp/_thumb.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(R, 'out', `common-knowledge-thumbnail${suf}.png`) });
  }
  await b.close();
})();
