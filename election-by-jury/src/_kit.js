  // ---------- constructivist kit ----------
  const K = { blue: '#1d3a8a', red: '#1d3a8a', black: '#141414', cream: '#efe6d2', paper: '#e9e0cc', grey: '#6a645b', gold: '#d9a21b', orange: '#e2572b' };
  const DISP = "'Oswald'", MONO = "'IBM Plex Mono'";
  const up = (s) => s.toUpperCase();
  const D = (s, x, y, size, op = {}) => txt(op.raw ? s : up(s), x, y, size, Object.assign({ font: DISP, weight: 700, color: K.black }, op));
  const Dm = (s, x, y, size, op = {}) => txt(s, x, y, size, Object.assign({ font: DISP, weight: 500, color: K.black }, op));
  const M = (s, x, y, size, op = {}) => txt(s, x, y, size, Object.assign({ font: MONO, weight: 500, color: K.black }, op));
  function textW(s, size, font = DISP, weight = 700) { ctx.save(); ctx.font = `${weight} ${size}px ${font}`; const w = ctx.measureText(s).width; ctx.restore(); return w; }
  function box(x, y, w, h, fill, alpha = 1) { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.restore(); }
  function frame(x, y, w, h, col, lw, alpha = 1) { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); ctx.restore(); }
  // a cue: [lineId, word] or [lineId, word, extra] or a number
  const at = (q) => (typeof q === 'number' ? q : q.length === 1 ? c(q[0]) : w(q[0], q[1], q[2] || 0));
  const vis = (t0, out) => (T < t0 ? 0 : fadeIn(t0, 0.2) * (out != null ? fadeOut(out, 0.3) : 1));

  // plate with camera drift
  function plate(name, t0, t1, cam = {}, alpha = 1) {
    const im = IMG[name];
    if (!im || alpha <= 0.001) return;
    const u = eIO(clamp((T - t0) / Math.max(0.01, t1 - t0)));
    const z = lerp((cam.z || [1, 1.07])[0], (cam.z || [1, 1.07])[1], u);
    const fx = lerp((cam.x || [0, 0])[0], (cam.x || [0, 0])[1], u), fy = lerp((cam.y || [0, 0])[0], (cam.y || [0, 0])[1], u);
    const sc = Math.max(W / im.width, H / im.height) * z * 1.02;
    const dw = im.width * sc, dh = im.height * sc, mx = (dw - W) / 2, my = (dh - H) / 2;
    ctx.save(); ctx.globalAlpha *= clamp(alpha);
    ctx.drawImage(im, -mx + clamp(fx, -1, 1) * mx, -my + clamp(fy, -1, 1) * my, dw, dh);
    ctx.restore();
  }
  // plates switching inside a scene: [[name, cue, cam], ...]
  function plates(list, tEnd) {
    const L = list.map(([n, q, cam]) => [n, at(q), cam]);
    L.forEach(([name, ts, cam], i) => {
      const nx = L[i + 1];
      if (T < ts - 0.01 || (nx && T > nx[1] + 0.5)) return;
      plate(name, ts, nx ? nx[1] + 0.5 : tEnd, cam, i === 0 ? 1 : fadeIn(ts, 0.5));
    });
  }
  // slanted banner bar, wipes in left to right
  function banner(s, x, y, size, q, op = {}) {
    const t0 = at(q), out = op.out != null ? at(op.out) : null;
    if (T < t0 || (out != null && T > out + 0.3)) { KC += 2; return; }
    const S = op.raw ? s : up(s), pad = size * 0.38, tw = textW(S, size), bw = tw + pad * 2, bh = size * 1.32;
    const u = eOut(prog(T, t0, t0 + 0.28)), a = out != null ? fadeOut(out, 0.3) : 1;
    const ax = op.align === 'left' ? x : op.align === 'right' ? x - bw : x - bw / 2;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(ax, y); ctx.rotate(op.rot != null ? op.rot : -0.035);
    ctx.beginPath(); ctx.rect(0, -bh / 2, bw * u, bh); ctx.clip();
    if (op.shadow !== false) box(10, -bh / 2 + 10, bw, bh, op.shadowCol || (op.bg === K.blue ? K.gold : K.blue));
    box(0, -bh / 2, bw, bh, op.bg || K.black);
    txt(S, pad, 2, size, { font: DISP, weight: 700, color: op.fg || K.cream, align: 'left' });
    ctx.restore();
  }
  // cream card with heavy border and red offset block; fn draws content in card-local coords (origin = centre)
  function card(x, y, w, h, q, fn, op = {}) {
    const t0 = at(q), out = op.out != null ? at(op.out) : null;
    if (T < t0 || (out != null && T > out + 0.35)) { KC += 80; return; }
    const s = lerp(0.92, 1, eOut(prog(T, t0, t0 + 0.3))), a = fadeIn(t0, 0.2) * (out != null ? fadeOut(out, 0.3) : 1);
    grp(x, y, s, op.rot || 0, () => {
      box(-w / 2 + 14, -h / 2 + 14, w, h, op.shadow || K.blue);
      box(-w / 2, -h / 2, w, h, op.bg || K.cream);
      frame(-w / 2, -h / 2, w, h, K.black, 6);
      if (fn) fn();
    }, a);
  }
  function stampX(s, x, y, size, q, op = {}) {
    const t0 = at(q), out = op.out != null ? at(op.out) : null;
    if (T < t0 || (out != null && T > out + 0.3)) { KC += 4; return; }
    const u = prog(T, t0, t0 + 0.18), sc = lerp(1.7, 1, eOut(u)), col = op.color || K.orange;
    const S = up(s), tw = textW(S, size), bw = tw + size * 0.7, bh = size * 1.25;
    grp(x, y, sc, op.rot != null ? op.rot : -0.09, () => {
      box(-bw / 2, -bh / 2, bw, bh, op.bg || 'rgba(239,228,204,0.94)');
      frame(-bw / 2, -bh / 2, bw, bh, col, size * 0.1);
      frame(-bw / 2 + size * 0.14, -bh / 2 + size * 0.14, bw - size * 0.28, bh - size * 0.28, col, size * 0.03);
      txt(S, 0, 3, size, { font: DISP, weight: 700, color: col });
    }, clamp(u * 1.3) * (out != null ? fadeOut(out, 0.3) : 1));
  }
  // source strip, bottom left
  function cite(s, q, out) {
    const t0 = at(q), a = vis(t0, out != null ? at(out) : null);
    if (a <= 0) { KC++; return; }
    const tw = textW(s, 24, MONO, 500);
    box(40, H - 78, tw + 36, 42, K.black, a * 0.88);
    M(s, 58, H - 56, 24, { color: K.cream, align: 'left', alpha: a });
  }
  const strikeBar = (x1, y, x2, q) => { const u = eOut(prog(T, at(q), at(q) + 0.25)); if (u > 0) box(x1, y - 5, (x2 - x1) * u, 11, K.orange); };
  // a list of lines that reveal on cues; rows: [text, cue, op]
  function rows(list, x, y, size, gap, op = {}) {
    list.forEach(([s, q, o], i) => { const a = vis(at(q), op.out != null ? at(op.out) : null); if (a > 0) (o && o.mono ? M : D)(s, x, y + i * gap, (o && o.size) || size, Object.assign({ align: op.align || 'left', alpha: a, color: K.black }, op.style || {}, o || {})); else KC++; });
  }
  // the clean red/black paper background for chart scenes
  function paperBg() {
    ctx.drawImage(PAPER, 0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = K.blue;
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W, 260); ctx.lineTo(W - 520, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.gold; ctx.beginPath(); ctx.moveTo(W, 260); ctx.lineTo(W, 300); ctx.lineTo(W - 560, 0); ctx.lineTo(W - 520, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.black; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 140); ctx.lineTo(380, H); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const span = (a, b, ext = 0.6) => [c(a) - 0.6, ce(b) + ext];

