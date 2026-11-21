// node tools/thumbs.cjs -> out/thumbnail{,-b,-c}.png (1280x720) from the Gemini plates
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const R = path.resolve(__dirname, '..'), F = 'file://' + R;
const T = [
  ['', 'street', 'center 40%', 'linear-gradient(to right, rgba(20,14,8,.88) 0%, rgba(20,14,8,.55) 42%, rgba(0,0,0,0) 62%)',
   `<div class="t" style="left:46px;top:70px;width:640px"><div class="s">rent control:</div><div class="big">a tax on one random landlord</div><div class="tag" style="margin-top:28px"><s>$3,000</s> → $2,000</div></div>`],
  ['-b', 'pipe', 'center 60%', 'linear-gradient(to bottom, rgba(20,14,8,.85) 0%, rgba(20,14,8,.45) 34%, rgba(0,0,0,0) 55%)',
   `<div class="t" style="left:0;right:0;top:24px;text-align:center"><div class="s" style="color:#f2c14e">if you're going to redistribute,</div><div class="big" style="font-size:118px">just give people cash</div></div>`],
  ['-c', 'gift', 'center 30%', 'linear-gradient(to top, rgba(20,14,8,.88) 0%, rgba(20,14,8,.5) 32%, rgba(0,0,0,0) 52%)',
   `<div class="t" style="left:0;right:0;bottom:30px;text-align:center"><div class="big" style="font-size:112px">paid $10. worth $7.</div><div class="s">where did the $3 go?</div></div>`],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [suf, img, pos, grad, body] of T) {
    fs.writeFileSync('/tmp/_t.html', `<!doctype html><html><head><style>
@font-face{font-family:Caveat;src:url(${F}/src/fonts/caveat-latin-700-normal.woff2);font-weight:700}
body{margin:0;width:1280px;height:720px;position:relative;overflow:hidden;background:#000 url(${F}/gemini/plates/${img}.jpg) ${pos}/cover no-repeat;font-family:Caveat}
.g{position:absolute;inset:0;background:${grad}}.t{position:absolute;color:#fffaf0;text-shadow:0 4px 18px rgba(0,0,0,.85)}
.big{font-size:104px;font-weight:700;line-height:.98}.s{font-size:62px;font-weight:700;color:#7fd3c4}.tag{font-size:84px;font-weight:700;color:#ff8a6a}
</style></head><body><div class="g"></div>${body}</body></html>`);
    await p.goto('file:///tmp/_t.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(R, 'out', `thumbnail${suf}.png`) });
  }
  await b.close();
})();
