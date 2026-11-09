// "The Shape of the Almost" — Broken Ladder. Music video, take four.
// Nature, light, water, sky and space; the life that could have been drawn in gold, never filled.
// Every frame is a pure function of time t. No text anywhere.
'use strict';
(function () {
  const W = 1920, H = 1080;
  const C = {
    night: '#0a0e15', night2: '#141c2a', ink: '#05070a', umber: '#4a3424', umber2: '#6b4a30',
    green: '#2f4a2c', green2: '#3f6038', green3: '#1d2f1d', moss: '#5d7a45',
    gold: '#c9a35a', gold2: '#e8c27a', lamp: '#f2c879', ember: '#ff9a4a', moon: '#7f95b8', blue: '#7fb2d8',
    her: '#f0b860', him: '#8fc4e8',
  };
  let cv, ctx, A, BEATS = [], DOWN = [], SEC, PAPER, GRAIN = [], SCALE = 1, DUR, SHOTS = [], OFF, OFFX;

  // ---------- utils ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const sm = (u) => u * u * (3 - 2 * u);
  const eOut = (u) => 1 - Math.pow(1 - u, 3);
  const eIn = (u) => u * u * u;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; const h = (n) => { const s = Math.sin((n + seed * 57.13) * 127.1) * 43758.5453; return s - Math.floor(s); }; return lerp(h(i), h(i + 1), sm(f)) * 2 - 1; }
  const rmsAt = (t) => { const r = A.rms_per_sec; const i = clamp(Math.floor(t), 0, r.length - 1); const j = Math.min(i + 1, r.length - 1); return lerp(r[i], r[j], t - Math.floor(t)) * 1000; };
  const lastBefore = (arr, t) => { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
  const pulse = (arr, t, decay = 0.35) => { const i = lastBefore(arr, t); if (i < 0) return 0; return Math.exp(-(t - arr[i]) / decay); };
  const bez2 = (p0, p1, p2, u) => { const v = 1 - u; return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]]; };
  const bez3 = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };

  // ---------- timing ----------
  function buildTiming() {
    const hb = A.beats, full = [];
    for (let i = 0; i < hb.length; i++) { full.push(hb[i]); if (i + 1 < hb.length) full.push((hb[i] + hb[i + 1]) / 2); }
    const per = 0.5108;
    while (full[0] - per > 0) full.unshift(full[0] - per);
    while (full[full.length - 1] + per < A.duration) full.push(full[full.length - 1] + per);
    BEATS = full;
    const near = (x) => BEATS.reduce((b, v) => (Math.abs(v - x) < Math.abs(b - x) ? v : b), BEATS[0]);
    SEC = { v1: near(16.5), c1: near(65.6), v2: near(80.6), c2: near(130.6), br: near(145.1), c3: near(184.6), out: near(201.6), dark: 219.4, coda: 226.0, end: A.duration };
    const idx = (x) => BEATS.indexOf(near(x));
    const a = idx(SEC.c1), b0 = idx(SEC.br), b1 = idx(SEC.c3);
    BEATS.forEach((bt, i) => {
      if (bt >= SEC.br - 0.01 && bt < SEC.c3 - 0.01) { if ((i - b0) % 5 === 0) DOWN.push(bt); }
      else if (bt >= SEC.c3 - 0.01) { if ((i - b1) % 4 === 0) DOWN.push(bt); }
      else if (((i - a) % 4 + 4) % 4 === 0) DOWN.push(bt);
    });
  }
  // lay shots end to end on downbeats between t0 and t1: shots = [[bars, fn, opts], ...]; last one stretches to t1
  function seq(t0, t1, shots) {
    let i = lastBefore(DOWN, t0 + 0.05); if (i < 0) i = 0;
    let start = t0;
    shots.forEach(([bars, fn, o], k) => {
      const end = k === shots.length - 1 ? t1 : (DOWN[i + bars] != null ? Math.min(DOWN[i + bars], t1) : t1);
      SHOTS.push({ start, end, fn, o: o || {} });
      start = end; i += bars;
    });
  }

  // ---------- textures ----------
  function makePaper() {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const r = rng(11);
    g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26000; i++) { const v = 128 + (r() - 0.5) * 70; g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2); }
    g.strokeStyle = 'rgba(60,60,60,0.12)'; g.lineWidth = 1;
    for (let i = 0; i < 1400; i++) { const x = r() * W, y = r() * H, a = r() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (10 + r() * 50), y + Math.sin(a) * (10 + r() * 50)); g.stroke(); }
    return c;
  }
  function makeGrain(seed) {
    const w = W / 2, h = H / 2, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const im = g.createImageData(w, h), d = im.data, r = rng(seed);
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 90; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(im, 0, 0); return c;
  }

  // ---------- primitives ----------
  function charcoal(pts, width, color, alpha, seed, passes = 4) {
    const r = rng(seed);
    ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let p = 0; p < passes; p++) {
      ctx.globalAlpha *= 1; const a0 = ctx.globalAlpha; ctx.globalAlpha = a0 * alpha * (0.35 + r() * 0.4); ctx.lineWidth = width * (0.5 + r() * 0.7);
      const ox = (r() - 0.5) * width * 0.6, oy = (r() - 0.5) * width * 0.6;
      ctx.beginPath(); pts.forEach(([x, y], i) => { const jx = x + ox + (r() - 0.5) * width * 0.3, jy = y + oy + (r() - 0.5) * width * 0.3; i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy); }); ctx.stroke();
      ctx.globalAlpha = a0;
    }
    ctx.restore();
  }
  function glow(x, y, r, color, a) {
    if (a <= 0.001 || r <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
  function leaf(x, y, size, ang, unfurl, rim, seed, fill = C.green, alpha = 1, rimCol = C.gold2) {
    if (size < 1 || alpha <= 0.01) return;
    const u = eOut(clamp(unfurl)), wdt = lerp(0.12, 1, u), s = size * lerp(0.45, 1, u);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= alpha;
    const path = new Path2D();
    path.moveTo(0, 0);
    path.bezierCurveTo(s * 0.25, -s * 0.55 * wdt, s * 0.75, -s * 0.5 * wdt, s, 0);
    path.bezierCurveTo(s * 0.75, s * 0.5 * wdt, s * 0.25, s * 0.55 * wdt, 0, 0);
    const g = ctx.createLinearGradient(0, -s * 0.4, s, s * 0.4); g.addColorStop(0, C.green3); g.addColorStop(0.5, fill); g.addColorStop(1, C.green3);
    ctx.fillStyle = g; ctx.fill(path);
    ctx.save(); ctx.clip(path); ctx.strokeStyle = 'rgba(10,16,10,0.35)'; ctx.lineWidth = 1.2; const r = rng(seed);
    for (let i = -s; i < s * 1.2; i += 8) { ctx.beginPath(); ctx.moveTo(i, -s); ctx.lineTo(i + s * 0.6 + r() * 4, s); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(8,14,8,0.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s * 0.04, 0); ctx.lineTo(s * 0.95, 0); ctx.stroke();
    if (rim > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rimCol; ctx.globalAlpha *= 0.55 * Math.min(1, rim); ctx.lineWidth = 2; ctx.stroke(path); ctx.restore(); }
    else { ctx.strokeStyle = 'rgba(6,8,6,0.55)'; ctx.lineWidth = 1.6; ctx.stroke(path); }
    ctx.restore();
  }

  // ---------- reusable set pieces ----------
  function skyGrad(top, bot) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3); }
  function moon(x, y, r, a = 1) { glow(x, y, r * 6, 'rgba(127,149,184,0.35)', a); ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#c9d4e6'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  function stars(seed, n, a) { const r = rng(seed); ctx.save(); for (let i = 0; i < n; i++) { ctx.globalAlpha = a * (0.3 + r() * 0.7); ctx.fillStyle = '#dfe6f3'; ctx.fillRect(r() * W, r() * H * 0.7, 2, 2); } ctx.restore(); }
  // building silhouette with windows; lit = fn(i) -> color|null
  function building(x, y, w, h, seed, fill, litFrac = 0.25, special) {
    const r = rng(seed); rect(x, y, w, h, fill);
    const cols = Math.max(2, Math.floor(w / 70)), rows = Math.max(2, Math.floor(h / 90));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const wx = x + 22 + i * (w - 44) / cols, wy = y + 30 + j * (h - 60) / rows, ww = (w - 44) / cols - 24, wh = (h - 60) / rows - 36;
      const key = i + ',' + j; const sp = special && special[key];
      if (sp) { rect(wx, wy, ww, wh, sp); glow(wx + ww / 2, wy + wh / 2, ww * 1.6, sp, 0.35); }
      else if (r() < litFrac) rect(wx, wy, ww, wh, r() < 0.5 ? 'rgba(232,194,122,0.55)' : 'rgba(150,170,200,0.35)');
      else rect(wx, wy, ww, wh, 'rgba(0,0,0,0.35)');
    }
  }
  function skyline(seed, baseY, layers, t, drift) {
    layers.forEach(([hMin, hMax, col, par, lit], li) => {
      const r = rng(seed + li); let x = -300 - ((t * drift * par) % 400);
      while (x < W + 300) { const w = 120 + r() * 220, h = hMin + r() * (hMax - hMin); building(x, baseY - h, w, h, Math.floor(r() * 1e6), col, lit); x += w + 6 + r() * 30; }
    });
  }
  function lampShape(x, y, s, on) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rect(-4, -150, 8, 150, '#120c08'); rect(-40, -4, 80, 10, '#120c08');
    ctx.fillStyle = on ? '#6b4a30' : '#2a1d14'; ctx.beginPath(); ctx.moveTo(-60, -150); ctx.lineTo(60, -150); ctx.lineTo(40, -230); ctx.lineTo(-40, -230); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (on) { glow(x, y - 160 * s, 420 * s, 'rgba(242,200,121,0.35)', on); glow(x, y - 150 * s, 90 * s, 'rgba(255,220,150,0.9)', on); }
  }
  // her plant: grows over the song, leans toward a target point
  function plant(x, y, s, grow, target, t, lit = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const pot = new Path2D(); pot.moveTo(-60, -60); pot.lineTo(60, -60); pot.lineTo(45, 30); pot.lineTo(-45, 30); pot.closePath();
    const pg = ctx.createLinearGradient(-60, 0, 60, 0); pg.addColorStop(0, '#140e09'); pg.addColorStop(1, '#4a3424'); ctx.fillStyle = pg; ctx.fill(pot);
    rect(-66, -66, 132, 12, '#3b281a');
    const tx = (target[0] - x) / s, ty = (target[1] - y) / s; const L = Math.hypot(tx, ty) || 1;
    const reach = lerp(120, Math.max(140, L - 40), grow);
    const tip = [tx / L * reach, -Math.abs(ty / L * reach) - 40 * (1 - grow)];
    const c1 = [-20 + noise1(t * 0.3, 3) * 10, -reach * 0.45], c2 = [tip[0] * 0.5, tip[1] + 40];
    const pts = []; for (let i = 0; i <= 24; i++) pts.push(bez3([0, -60], c1, c2, tip, i / 24));
    charcoal(pts, 8, C.green2, 1, 77);
    const n = Math.floor(4 + grow * 12);
    for (let j = 0; j < n; j++) { const u = 0.15 + j / (n + 1) * 0.85; const p = bez3([0, -60], c1, c2, tip, u), p2 = bez3([0, -60], c1, c2, tip, Math.min(1, u + 0.03)); const ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]) + (j % 2 ? -1 : 1) * 0.95; leaf(p[0], p[1], 62, ang + 0.05 * Math.sin(t + j), 1, lit * 0.6, 100 + j, j % 3 ? C.green : C.green2); }
    leaf(tip[0], tip[1], 48, Math.atan2(tip[1] - c2[1], tip[0] - c2[0]), 0.6 + 0.4 * grow, lit, 999, C.moss);
    ctx.restore();
    return [x + tip[0] * s, y + tip[1] * s];
  }
  function windowFrame(x, y, w, h, inner) {
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); inner(); ctx.restore();
    ctx.strokeStyle = '#0a0d12'; ctx.lineWidth = 16; ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.stroke();
  }
  function rain(seed, t, n, ang, speed, a, len = 40) {
    const r = rng(seed); ctx.save(); ctx.strokeStyle = 'rgba(170,190,220,0.5)'; ctx.lineWidth = 1.5; ctx.globalAlpha *= a;
    for (let i = 0; i < n; i++) { const x0 = r() * (W + 400) - 200, y0 = ((r() * H + t * speed) % (H + 100)) - 50; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.sin(ang) * len, y0 + Math.cos(ang) * len); ctx.stroke(); }
    ctx.restore();
  }
  function forestLayers(t, speed, seed, light, scaleBoost = 0) {
    // tunnel of leaves rushing toward camera
    const r = rng(seed), N = 70;
    const items = [];
    for (let i = 0; i < N; i++) items.push({ a: r() * Math.PI * 2, rad: 0.25 + r() * 0.9, ph: r(), s: 0.6 + r() * 0.8, rot: r() * 6, seed: Math.floor(r() * 1e6), col: [C.green3, C.green, C.green2, C.moss][Math.floor(r() * 4)] });
    items.forEach((it) => { it.z = (it.ph + t * speed) % 1; });
    items.sort((p, q) => p.z - q.z);
    items.forEach((it) => {
      const z = it.z, d = 1 / (1.05 - z), x = W / 2 + Math.cos(it.a) * it.rad * 420 * d, y = H / 2 + Math.sin(it.a) * it.rad * 300 * d;
      const size = it.s * 60 * d * (1 + scaleBoost), fade = clamp(z * 3) * (1 - clamp((z - 0.92) / 0.08));
      leaf(x, y, size, it.rot + it.a + t * 0.2, 1, light * z, it.seed, it.col, fade);
    });
  }

  // ---------- take three: places, objects, light. No moving people. ----------
  const L = { // lyric line starts (from speech-to-text on the master)
    early: 16.7, pastures: 24.8, horses: 32.9, copan: 41.2, always: 48.4, unsee: 52.3, bruises: 56.1, ch1: 64.6,
    mom: 82.3, insanity: 90.5, sagan: 98.7, cops: 106.7, concrete: 113.0, staff: 117.7, privilege: 121.8, hold: 125.7, ch2: 130.2,
    ride: 184.8, chance: 193.0,
  };
  const GOLD = 'rgba(242,200,121,1)';
  const cam = (s, x = 0, y = 0, r = 0) => { ctx.translate(W / 2 + x, H / 2 + y); ctx.rotate(r); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); };

  // gold "almost" line drawing: draws a polyline up to fraction p with a soft glow
  function goldLine(pts, p, w = 3, a = 1) {
    if (p <= 0 || a <= 0) return;
    let total = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
    let rem = total * clamp(p); const out = [pts[0]];
    for (let i = 1; i < pts.length && rem > 0; i++) { if (seg[i - 1] <= rem) { out.push(pts[i]); rem -= seg[i - 1]; } else { const u = rem / seg[i - 1]; out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); rem = 0; } }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    [[w * 7, 0.08], [w * 3, 0.22], [w, 0.95]].forEach(([lw, la]) => { ctx.globalAlpha = a * la; ctx.strokeStyle = GOLD; ctx.lineWidth = lw; ctx.beginPath(); out.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
    ctx.restore();
    const tip = out[out.length - 1]; if (p < 1) glow(tip[0], tip[1], 26, 'rgba(255,236,190,1)', a);
  }
  // shape = array of polylines (local coords); draws them in sequence across p
  function goldShape(shape, x, y, s, p, a = 1, w = 3) {
    const n = shape.length;
    shape.forEach((pl, i) => { const pp = clamp(p * n - i); goldLine(pl.map(([px, py]) => [x + px * s, y + py * s]), pp, w, a); });
  }
  const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  const SH = {
    book: [[[0, -40], [-120, -80], [-240, -60], [-240, 60], [-120, 40], [0, 80]], [[0, -40], [120, -80], [240, -60], [240, 60], [120, 40], [0, 80]], [[0, -40], [0, 80]], [[-200, -40], [-60, -55]], [[-200, -10], [-60, -25]], [[60, -55], [200, -40]], [[60, -25], [200, -10]]],
    key: [(() => { const c = []; for (let i = 0; i <= 30; i++) { const a = i / 30 * Math.PI * 2; c.push([-180 + Math.cos(a) * 60, Math.sin(a) * 60]); } return c; })(), [[-120, 0], [200, 0], [200, 50]], [[150, 0], [150, 40]], [[110, 0], [110, 30]]],
    house: [[[-200, 0], [-200, -220], [0, -360], [200, -220], [200, 0], [-200, 0]], box(-150, -190, 80, 70), box(70, -190, 80, 70), box(-150, -90, 80, 70), [[-20, 0], [-20, -110], [40, -110], [40, 0]], [[110, -290], [110, -340], [150, -340], [150, -262]], box(-30, -280, 60, 50)],
    table: [[[-220, -120], [220, -120]], [[-180, -120], [-180, 0]], [[180, -120], [180, 0]], [[-300, -220], [-300, 0]], [[-300, -100], [-240, -100], [-240, 0]], [[300, -220], [300, 0]], [[300, -100], [240, -100], [240, 0]], box(-70, -190, 140, 70)],
    swing: [[[-220, 0], [-160, -300], [-100, 0]], [[100, 0], [160, -300], [220, 0]], [[-160, -300], [160, -300]], [[-60, -300], [-60, -90]], [[20, -300], [20, -90]], [[-80, -90], [40, -90]]],
    cap: [[[-200, -120], [0, -200], [200, -120], [0, -40], [-200, -120]], [[-110, -85], [-110, 0], [110, 0], [110, -85]], [[0, -120], [150, -100], [150, 20]]],
    car: [[[-260, -40], [-260, -110], [-150, -120], [-90, -200], [100, -200], [170, -120], [260, -110], [260, -40], [-260, -40]], [[-150, -120], [170, -120]], [[10, -200], [10, -120]]].concat([[-160, -40], [160, -40]].map(([cx, cy]) => { const c = []; for (let i = 0; i <= 20; i++) c.push([cx + Math.cos(i / 20 * Math.PI * 2) * 45, cy + Math.sin(i / 20 * Math.PI * 2) * 45]); return c; })),
    dog: [[[-150, -60], [-150, -120], [100, -130], [130, -170], [160, -200], [200, -190], [210, -160], [180, -140], [160, -100], [150, -60]], [[-130, -70], [-140, 0]], [[-90, -70], [-80, 0]], [[90, -70], [80, 0]], [[130, -70], [140, 0]], [[-150, -110], [-210, -160]], [[175, -195], [170, -230], [190, -200]]],
    horse: [[[-168, -200], [-150, -252], [-80, -256], [82, -260], [150, -318], [182, -372], [194, -392], [204, -368], [290, -284], [276, -260], [214, -288], [152, -200], [108, -146], [-118, -150], [-168, -200]], [[112, -150], [116, -82], [122, 0]], [[82, -150], [80, -82], [76, 0]], [[-112, -160], [-146, -78], [-126, 0]], [[-140, -165], [-172, -82], [-158, 0]], [[-160, -230], [-210, -150], [-206, -48]]],
  };
  // a still horse silhouette (filled), facing right, hooves at y=0
  function limb(pts, ws) {
    const L = [], R = [];
    pts.forEach((p, i) => { const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)]; const dx = q[0] - o[0], dy = q[1] - o[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d; L.push([p[0] + nx * ws[i] / 2, p[1] + ny * ws[i] / 2]); R.push([p[0] - nx * ws[i] / 2, p[1] - ny * ws[i] / 2]); });
    ctx.beginPath(); L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); R.reverse().forEach(([x, y]) => ctx.lineTo(x, y)); ctx.closePath(); ctx.fill();
  }
  function horse(x, y, s, col = '#05070a', saddle = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; ctx.strokeStyle = col;
    const n = (k, f = 1) => noise1(T0 * f + k, k);
    // far-side legs first
    limb([[82, -160], [80, -82], [74, -18], [76, 0]], [36, 20, 15, 22]);
    limb([[-140, -170], [-172, -82], [-160, -18], [-158, 0]], [46, 20, 15, 22]);
    ctx.beginPath();
    ctx.moveTo(-168, -200);
    ctx.bezierCurveTo(-172, -246, -130, -264, -80, -256);
    ctx.bezierCurveTo(-20, -246, 40, -246, 82, -260);
    ctx.bezierCurveTo(120, -292, 158, -338, 182, -372);
    ctx.lineTo(194, -392); ctx.lineTo(204, -368);
    ctx.bezierCurveTo(232, -348, 270, -310, 290, -284);
    ctx.quadraticCurveTo(296, -266, 276, -260);
    ctx.bezierCurveTo(256, -260, 236, -276, 214, -288);
    ctx.bezierCurveTo(194, -276, 170, -238, 152, -200);
    ctx.bezierCurveTo(146, -172, 132, -152, 108, -146);
    ctx.bezierCurveTo(40, -136, -60, -138, -118, -150);
    ctx.bezierCurveTo(-156, -156, -170, -176, -168, -200);
    ctx.closePath(); ctx.fill();
    // near-side legs
    limb([[112, -160], [116, -82], [118, -18], [122, 0]], [38, 20, 15, 22]);
    limb([[-112, -170], [-146, -78], [-130, -18], [-126, 0]], [50, 21, 15, 22]);
    // tail, stirred by wind
    ctx.beginPath(); ctx.moveTo(-160, -232);
    ctx.bezierCurveTo(-205 + n(3, 0.8) * 10, -210, -215 + n(4, 0.7) * 14, -120, -206 + n(5, 0.9) * 18, -48);
    ctx.lineTo(-190 + n(5, 0.9) * 18, -52);
    ctx.bezierCurveTo(-192, -130, -186, -190, -150, -212); ctx.closePath(); ctx.fill();
    // mane along the crest
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { const v = i / 8, mx = lerp(88, 186, v), my = lerp(-262, -372, v) + Math.sin(v * Math.PI) * 10; ctx.lineWidth = 8 - v * 3; ctx.beginPath(); ctx.moveTo(mx, my); ctx.quadraticCurveTo(mx - 26 + n(i + 10, 1.5) * 10, my + 10, mx - 34 + n(i + 20, 1.2) * 14, my + 36); ctx.stroke(); }
    if (saddle) {
      ctx.fillStyle = '#4a2c16'; ctx.beginPath(); ctx.moveTo(-58, -252); ctx.quadraticCurveTo(-62, -282, -40, -280); ctx.quadraticCurveTo(-10, -258, 34, -262); ctx.quadraticCurveTo(52, -290, 64, -268); ctx.lineTo(60, -252); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2210'; ctx.beginPath(); ctx.moveTo(-50, -254); ctx.lineTo(56, -256); ctx.quadraticCurveTo(60, -222, 46, -206); ctx.lineTo(-38, -204); ctx.quadraticCurveTo(-54, -222, -50, -254); ctx.closePath(); ctx.fill();
      rect(4, -210, 5, 72, '#2a180a'); ctx.fillStyle = '#2a180a'; ctx.beginPath(); ctx.moveTo(-6, -138); ctx.lineTo(20, -138); ctx.lineTo(24, -126); ctx.lineTo(-10, -126); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  let T0 = 0;
  function grass(seed, t, y0, y1, n, col, wind = 1, tall = 60) {
    const r = rng(seed); ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = r() * (W + 200) - 100, yb = lerp(y0, y1, Math.pow(r(), 0.6)), depth = (yb - y0) / Math.max(1, y1 - y0), h = tall * (0.5 + depth * 1.4) * (0.6 + r() * 0.7);
      const sway = (noise1(t * 0.6 + x * 0.004, 5) * 0.8 + Math.sin(t * 1.3 + x * 0.01) * 0.25) * wind;
      ctx.lineWidth = 1 + depth * 2.5; ctx.globalAlpha = 0.5 + depth * 0.5;
      ctx.beginPath(); ctx.moveTo(x, yb); ctx.quadraticCurveTo(x + sway * h * 0.3, yb - h * 0.6, x + sway * h * 0.7, yb - h); ctx.stroke();
    }
    ctx.restore();
  }
  function trailer(x, y, s, litA = 1, night = true) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const body = night ? '#0c0f14' : '#2a2620';
    rect(-380, -170, 760, 150, body); ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(-380, -95, 18, 75, 0, Math.PI / 2, Math.PI * 1.5); ctx.ellipse(380, -95, 18, 75, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    rect(-380, -110, 760, 6, night ? '#1a1d24' : '#5a5246');
    rect(-360, -20, 720, 22, night ? '#07080b' : '#1a1712');
    for (let i = 0; i < 9; i++) rect(-350 + i * 80, -18, 3, 18, '#000');
    rect(120, -150, 70, 130, night ? '#05060a' : '#1a1712'); rect(110, -20, 90, 10, '#05060a'); rect(118, -10, 74, 10, '#05060a');
    [[-300, -150, 110, 60], [-120, -150, 110, 60], [260, -150, 80, 60]].forEach(([wx, wy, ww, wh], i) => {
      const lit = i === 1 ? litA : 0;
      rect(wx, wy, ww, wh, lit > 0.02 ? `rgba(242,200,121,${0.25 + 0.7 * lit})` : 'rgba(0,0,0,0.6)');
      if (lit > 0.02) glow(wx + ww / 2, wy + wh / 2, 220, 'rgba(242,200,121,0.6)', lit);
    });
    ctx.restore();
  }
  // a small, worn Kansas farmhouse with a tin-roof shed and a windmill (Caney years, before the trailer)
  function farmhouse(x, y, s, litA = 0, col = '#0b0907', t = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col;
    // house: narrow two-room box, sagging gable, lean-to porch
    ctx.beginPath(); ctx.moveTo(-170, 0); ctx.lineTo(-170, -150); ctx.lineTo(-40, -250); ctx.lineTo(90, -146); ctx.lineTo(90, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(90, -110); ctx.lineTo(210, -84); ctx.lineTo(210, -76); ctx.lineTo(90, -96); ctx.closePath(); ctx.fill();
    rect(200, -82, 6, 82, col); rect(120, -98, 6, 98, col);
    rect(30, -230, 18, 60, col); // chimney stub
    const wA = clamp(litA); rect(-120, -120, 46, 54, wA > 0.02 ? `rgba(242,200,121,${0.3 + 0.65 * wA})` : 'rgba(0,0,0,0.5)');
    if (wA > 0.02) glow(-97, -93, 140, 'rgba(242,200,121,0.55)', wA);
    // shed with a slumped tin roof
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(320, 0); ctx.lineTo(320, -120); ctx.lineTo(520, -100); ctx.lineTo(560, -60); ctx.lineTo(560, 0); ctx.closePath(); ctx.fill();
    // windmill: lattice tower and a slowly turning wheel
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-420, 0); ctx.lineTo(-380, -360); ctx.lineTo(-340, 0); ctx.moveTo(-410, -90); ctx.lineTo(-350, -90); ctx.moveTo(-400, -190); ctx.lineTo(-360, -190); ctx.moveTo(-392, -280); ctx.lineTo(-368, -280); ctx.stroke();
    ctx.lineWidth = 4; const sp = t * 0.6; for (let i = 0; i < 12; i++) { const a = sp + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(-380, -370); ctx.lineTo(-380 + Math.cos(a) * 58, -370 + Math.sin(a) * 58); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-380, -370); ctx.lineTo(-300, -378); ctx.lineTo(-290, -350); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // tiny glowing star stickers inside the lit window
  function stickers(x, y, w, h, t, a) { const r = rng(808); for (let i = 0; i < 9; i++) glow(x + r() * w, y + r() * h, 10 + r() * 8, 'rgba(200,255,190,0.9)', a * (0.5 + 0.5 * Math.sin(t * 1.4 + i))); }
  function inkBloom(cx, cy, r, p, seed) {
    if (p <= 0) return;
    const rr = rng(seed);
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 18; i++) {
      const a = rr() * Math.PI * 2, d = rr() * r * 0.6 * p, rad = r * (0.35 + rr() * 0.5) * eOut(clamp(p * (0.8 + rr() * 0.4)));
      const g = ctx.createRadialGradient(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0, cx + Math.cos(a) * d, cy + Math.sin(a) * d, rad);
      const col = i % 3 === 0 ? '170,150,60' : i % 3 === 1 ? '110,60,130' : '80,40,100';
      g.addColorStop(0, `rgba(${col},0.55)`); g.addColorStop(0.7, `rgba(${col},0.25)`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
    }
    ctx.restore();
  }
  function smoke(x, y, t, a = 1) {
    ctx.save(); ctx.strokeStyle = 'rgba(200,200,210,0.35)'; ctx.lineWidth = 3; ctx.globalAlpha *= a;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 30; i++) { const v = i / 30, yy = y - v * 420, xx = x + Math.sin(v * 6 + t * 1.2 + k) * 30 * v + noise1(v * 3 + t * 0.4 + k, 11) * 40 * v; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    ctx.restore();
  }
  function scribbleLines(x, y, w, n, gap, col, seed) { const r = rng(seed); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; for (let i = 0; i < n; i++) { ctx.beginPath(); let xx = x; ctx.moveTo(xx, y + i * gap); while (xx < x + w * (0.6 + r() * 0.4)) { xx += 8 + r() * 10; ctx.lineTo(xx, y + i * gap + (r() - 0.5) * 6); } ctx.stroke(); } ctx.restore(); }
  function cinder(x0, y0, w, h, col, line, bw = 160, bh = 80) { rect(x0, y0, w, h, col); ctx.save(); ctx.strokeStyle = line; ctx.lineWidth = 3; for (let j = 0; j * bh < h; j++) { const y = y0 + j * bh; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke(); for (let x = x0 + ((j % 2) * bw / 2); x < x0 + w; x += bw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); } } ctx.restore(); }
  function trashBag(x, y, s, sheen = 0.3) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = '#07080a';
    ctx.beginPath(); ctx.moveTo(-130, 0); ctx.quadraticCurveTo(-170, -120, -60, -170); ctx.quadraticCurveTo(-30, -190, -20, -210); ctx.lineTo(20, -210); ctx.quadraticCurveTo(30, -190, 60, -170); ctx.quadraticCurveTo(170, -120, 130, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-20, -210); ctx.quadraticCurveTo(-60, -250, -30, -240); ctx.moveTo(20, -210); ctx.quadraticCurveTo(60, -250, 30, -240); ctx.lineWidth = 8; ctx.strokeStyle = '#07080a'; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(160,180,210,${sheen})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-90, -120); ctx.quadraticCurveTo(-60, -150, -30, -140); ctx.stroke(); ctx.beginPath(); ctx.moveTo(60, -60); ctx.quadraticCurveTo(90, -100, 80, -130); ctx.stroke();
    ctx.restore();
  }
  function bed(x, y, w, frame, blanket) { rect(x, y, w, 40, frame); rect(x, y - 60, 30, 100, frame); rect(x + w - 20, y - 30, 20, 70, frame); rect(x + 20, y - 26, w - 40, 30, blanket); rect(x + 30, y - 46, 140, 26, '#d8d0c0'); }
  function galaxy(cx, cy, r, rot, a, seed = 9, n = 900) {
    const rr = rng(seed); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) { const arm = i % 2, d = Math.pow(rr(), 0.7) * r, ang = rot + arm * Math.PI + d / r * 4.2 + (rr() - 0.5) * 0.5; const x = cx + Math.cos(ang) * d, y = cy + Math.sin(ang) * d * 0.55; ctx.globalAlpha = a * (0.25 + rr() * 0.75) * (1 - d / r * 0.6); ctx.fillStyle = d < r * 0.2 ? '#ffe8c0' : rr() < 0.3 ? '#b8d0ff' : '#ffffff'; ctx.fillRect(x, y, 2, 2); }
    ctx.restore(); glow(cx, cy, r * 0.35, 'rgba(255,230,190,0.8)', a);
  }
  function planet(x, y, r, col, ring, a = 1) { ctx.save(); ctx.globalAlpha *= a; const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, col); g.addColorStop(1, '#05060a'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); if (ring) { ctx.strokeStyle = 'rgba(230,210,170,0.7)'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.ellipse(x, y, r * 1.9, r * 0.45, -0.3, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); }
  function starfield(seed, n, a, t = 0, spin = 0) { const r = rng(seed); ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(t * spin); for (let i = 0; i < n; i++) { ctx.globalAlpha = a * (0.3 + r() * 0.7) * (0.75 + 0.25 * Math.sin(t * (1 + r() * 3) + i)); ctx.fillStyle = '#e8eefa'; const s = r() < 0.06 ? 3 : 2; ctx.fillRect(r() * W * 1.6 - W * 0.8, r() * H * 1.6 - H * 0.8, s, s); } ctx.restore(); }


  // ================= take four: nature, light, water, sky, space. No creatures, no people. =================
  // ---------- 2D value noise + fbm, rendered into a small field canvas and upscaled (ink, clouds, nebulae) ----------
  function h2(x, y, s) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vn(x, y, s = 0) { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  function fbm(x, y, s = 0, oct = 4) { let f = 0, amp = 0.5; for (let i = 0; i < oct; i++) { f += amp * vn(x, y, s + i * 17); x = x * 2.03 + 11.3; y = y * 2.03 + 7.1; amp *= 0.5; } return f / (1 - Math.pow(0.5, oct)); }
  let FCV, FCX, FIMG; const FW = 320, FH = 180;
  // pal = [[stop, r, g, b, a], ...]; fn(nx, ny) -> value 0..1 (nx 0..1 across, ny 0..1 down)
  function palAt(pal, v) { v = clamp(v); for (let i = 1; i < pal.length; i++) if (v <= pal[i][0]) { const a = pal[i - 1], b = pal[i], u = (v - a[0]) / Math.max(1e-6, b[0] - a[0]); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u), lerp(a[4], b[4], u)]; } const l = pal[pal.length - 1]; return [l[1], l[2], l[3], l[4]]; }
  function field(fn, pal, op = 'source-over', alpha = 1, dx = 0, dy = 0, dw = W, dh = H) {
    const d = FIMG.data; let k = 0;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const c = palAt(pal, fn(x / FW, y / FH)); d[k++] = c[0]; d[k++] = c[1]; d[k++] = c[2]; d[k++] = c[3] * 255; }
    FCX.putImageData(FIMG, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(FCV, dx, dy, dw, dh); ctx.restore();
  }
  // domain-warped ink: slow, curling, organic
  const ink = (t, sc = 3, sp = 0.05, s = 0) => (x, y) => { const X = x * sc * 1.78, Y = y * sc; const qx = fbm(X + t * sp, Y, s, 3), qy = fbm(X + 5.2, Y - t * sp, s + 3, 3); return fbm(X + 3.2 * qx + t * sp * 0.5, Y + 3.2 * qy, s + 7, 4); };

  // ---------- organic set pieces ----------
  // dandelion seeds: a bright point with a fine radial crown, drifting on the wind
  function seed(x, y, s, rot, a, col = '255,244,220') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.globalAlpha *= a;
    ctx.strokeStyle = `rgba(${col},0.75)`; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.stroke();
    for (let i = 0; i < 11; i++) { const an = -Math.PI / 2 + (i - 5) * 0.27; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(an) * 8, Math.sin(an) * 8 - 2, Math.cos(an) * 16, Math.sin(an) * 16); ctx.stroke(); }
    ctx.restore(); glow(x, y, 9 * s, `rgba(${col},1)`, a * 0.6);
  }
  function seedDrift(sd, t, n, x0, x1, y0, y1, rise, a, sc = 1, col) {
    const r = rng(sd);
    for (let i = 0; i < n; i++) {
      const bx = r() * (x1 - x0) + x0, by = r() * (y1 - y0) + y0, ph = r() * 10, sp = 0.6 + r() * 0.8, z = 0.5 + r() * 1.1;
      const x = bx + noise1(t * 0.25 * sp + ph, 3) * 140 + t * 18 * sp * z, y = by - t * rise * sp * z + noise1(t * 0.3 + ph, 5) * 60;
      const xx = ((x % (W + 400)) + W + 400) % (W + 400) - 200, yy = ((y % (H + 400)) + H + 400) % (H + 400) - 200;
      seed(xx, yy, z * sc, noise1(t * 0.5 + ph, 8) * 0.6, a * (0.4 + 0.6 * z / 1.6), col);
    }
  }
  // tall grass stems against light, with soft bokeh
  function stems(sd, t, n, base, col, tall, wind = 1, thick = 2) {
    const r = rng(sd); ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const x = r() * (W + 300) - 150, h = tall * (0.45 + r() * 0.75), ph = r() * 9, lean = (r() - 0.5) * 0.25;
      const sw = (noise1(t * 0.45 + x * 0.003, 4) * 0.9 + 0.25 * Math.sin(t * 1.1 + ph)) * wind;
      ctx.lineWidth = thick * (0.6 + r() * 0.8);
      const tx = x + (lean + sw * 0.35) * h, ty = base - h;
      ctx.beginPath(); ctx.moveTo(x, base + 20); ctx.quadraticCurveTo(x + (lean + sw * 0.12) * h, base - h * 0.55, tx, ty); ctx.stroke();
      if (r() < 0.45) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(Math.atan2(ty - base, tx - x) + Math.PI / 2); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -14, 4, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    }
    ctx.restore();
  }
  function bokeh(sd, t, n, col, a, rmin = 20, rmax = 90) {
    const r = rng(sd);
    for (let i = 0; i < n; i++) { const x = r() * W + noise1(t * 0.1 + i, 2) * 40, y = r() * H * 0.9 + noise1(t * 0.12 + i, 6) * 30, rr = rmin + r() * (rmax - rmin); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.25 + r() * 0.5) * (0.7 + 0.3 * Math.sin(t * 0.7 + i)); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  function ripples(cx, cy, t0, t, n = 5, a = 1, sx = 1, sy = 0.32, col = '230,236,250') {
    const age = t - t0; if (age < 0) return;
    ctx.save(); ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) { const ag = age - i * 0.22; if (ag <= 0) continue; const R = ag * 210; const al = a * Math.exp(-ag / 1.6) * 0.8; ctx.strokeStyle = `rgba(${col},${al})`; ctx.beginPath(); ctx.ellipse(cx, cy, R * sx, R * sy, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }
  function aurora(t, a, base, pulseA = 0) {
    const bands = [[0, 'rgba(80,255,170,', 260, 0.9], [1.7, 'rgba(120,200,255,', 200, 0.6], [3.1, 'rgba(190,120,255,', 300, 0.45]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    bands.forEach(([ph, col, hgt, w0], bi) => {
      const g = ctx.createLinearGradient(0, -hgt * 1.6, 0, 0); g.addColorStop(0, col + '0)'); g.addColorStop(0.6, col + (0.18 * w0) + ')'); g.addColorStop(0.93, col + (0.55 * w0) + ')'); g.addColorStop(1, col + '0)');
      ctx.fillStyle = g;
      for (let x = -60; x < W + 60; x += 5) {
        const y = base - 120 * bi + Math.sin(x * 0.0024 + t * 0.21 + ph) * 90 + noise1(x * 0.006 + t * 0.15 + ph, 3 + bi) * 70;
        const k = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(x * 0.013 - t * 0.9 + ph * 2) * Math.sin(x * 0.0041 + t * 0.3), 2);
        const hh = hgt * (0.7 + 0.6 * (0.5 + 0.5 * noise1(x * 0.01 + t * 0.2, 9 + bi)));
        ctx.globalAlpha = a * k * (1 + pulseA); ctx.save(); ctx.translate(x, y); ctx.scale(1, hh / hgt); ctx.fillRect(0, -hgt * 1.6, 6, hgt * 1.6); ctx.restore();
      }
    });
    ctx.restore();
  }
  function horizonGlow(y, col, a) { const g = ctx.createLinearGradient(0, y - 260, 0, y); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col); ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = g; ctx.fillRect(-W, y - 260, W * 3, 262); ctx.restore(); }
  function ground(y, col) { rect(-W, y, W * 3, H * 2, col); }

  // ---------- scribbled ink figure: big round scribble head, thin wobbly stick body; mostly still ----------
  // o: { h: height px, head: head radius, col, boil (redraw rate), lean, armL/armR: [dx,dy] hand offsets from shoulder, bag }
  function scrib(x, y, o = {}) {
    const h = o.h || 300, hr = o.head || h * 0.2, col = o.col || '#0b0b0f', lw = o.lw || Math.max(1.4, h / 110);
    const boil = Math.floor((o.t || 0) * (o.boil || 8)), r = rng((o.seed || 1) * 977 + boil);
    const j = (k) => (r() - 0.5) * k;
    const neck = [x + (o.lean || 0) * h * 0.1, y - h + hr * 1.9], hip = [x, y - h * 0.38];
    ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha *= o.a == null ? 1 : o.a;
    const wob = (a, b, n = 6, amp = lw * 1.3) => { ctx.beginPath(); ctx.moveTo(a[0] + j(amp), a[1] + j(amp)); for (let i = 1; i <= n; i++) { const u = i / n; ctx.lineTo(lerp(a[0], b[0], u) + j(amp), lerp(a[1], b[1], u) + j(amp)); } ctx.stroke(); };
    ctx.lineWidth = lw; for (let p = 0; p < 2; p++) { wob(neck, hip); wob(hip, [x - h * 0.08, y]); wob(hip, [x + h * 0.08, y]); }
    const sh = [neck[0], neck[1] + h * 0.06];
    const aL = o.armL || [-h * 0.12, h * 0.28], aR = o.armR || [h * 0.12, h * 0.28];
    for (let p = 0; p < 2; p++) { wob(sh, [sh[0] + aL[0], sh[1] + aL[1]], 5); wob(sh, [sh[0] + aR[0], sh[1] + aR[1]], 5); }
    // the head: dense scribble filling a circle
    const hc = [neck[0] + j(2), neck[1] - hr * 0.95];
    ctx.lineWidth = lw * 0.9; ctx.beginPath();
    let px = hc[0], py = hc[1]; ctx.moveTo(px, py);
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * hr; px = hc[0] + Math.cos(a) * d; py = hc[1] + Math.sin(a) * d * 1.05; ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2 + j(0.05); ctx.lineTo(hc[0] + Math.cos(a) * hr * (1 + j(0.06)), hc[1] + Math.sin(a) * hr * 1.05 * (1 + j(0.06))); } ctx.stroke();
    ctx.restore();
  }
  // ---------- painterly wash kit (ochre, bone, charcoal) ----------
  function washSky(t, sd, dark = 1) {
    const g = ctx.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, '#3e3e40'); g.addColorStop(0.6, '#77746c'); g.addColorStop(1, '#c4bca8'); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
    field((x, y) => { const v = fbm(x * 3.2 + t * 0.012, y * 6.5, sd, 5); return clamp((v - 0.35) * 1.8) * clamp(1.15 - y * 1.25); }, [[0, 40, 40, 44, 0], [0.5, 50, 50, 54, 0.55 * dark], [1, 28, 28, 32, 0.85 * dark]], 'source-over', 1, 0, -40, W, 760);
    field((x, y) => { const v = fbm(x * 5 - t * 0.02, y * 9 + 3, sd + 9, 4); return clamp((v - 0.55) * 3) * clamp(1 - y * 1.4); }, [[0, 230, 224, 210, 0], [1, 236, 230, 214, 0.45]], 'source-over', 1, 0, -40, W, 760);
  }
  // horizontal dry-brush band: broken, streaky strokes
  function dryBand(sd, y0, y1, col, n, a = 1, wmin = 2, wmax = 7) {
    const r = rng(sd); ctx.save(); ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) { const y = lerp(y0, y1, r()), x = r() * (W + 600) - 300, len = 80 + r() * 520; ctx.globalAlpha = a * (0.15 + r() * 0.5); ctx.lineWidth = wmin + r() * (wmax - wmin); ctx.beginPath(); let xx = x; ctx.moveTo(xx, y); while (xx < x + len) { xx += 20 + r() * 40; ctx.lineTo(xx, y + (r() - 0.5) * 3); } ctx.stroke(); }
    ctx.restore();
  }
  // grazing horse, painted soft: small, head down, mostly still (a slow tail swish)
  function grazer(x, y, s, col, t, sd, flip = false) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -s : s, s); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.filter = 'blur(1.4px)';
    // far-side legs, slightly lighter
    ctx.save(); ctx.globalAlpha *= 0.75; limb([[52, -62], [56, -30], [52, -6], [54, 0]], [16, 8, 6, 9]); limb([[-70, -64], [-84, -34], [-78, -6], [-77, 0]], [22, 9, 6, 9]); ctx.restore();
    ctx.beginPath();
    ctx.moveTo(-96, -82);
    ctx.bezierCurveTo(-98, -104, -70, -114, -40, -108);          // rump
    ctx.bezierCurveTo(-10, -104, 20, -106, 46, -112);           // back to withers
    ctx.bezierCurveTo(70, -116, 96, -92, 112, -60);             // crest of the neck, falling
    ctx.bezierCurveTo(122, -40, 130, -22, 134, -8);             // down to the poll
    ctx.bezierCurveTo(138, 0, 146, 4, 150, 2);                  // muzzle in the grass
    ctx.bezierCurveTo(148, 8, 136, 10, 126, 4);
    ctx.bezierCurveTo(118, -12, 100, -34, 82, -50);             // throat
    ctx.bezierCurveTo(74, -56, 66, -60, 58, -60);               // chest
    ctx.bezierCurveTo(20, -54, -30, -56, -70, -62);             // belly
    ctx.bezierCurveTo(-90, -64, -98, -72, -96, -82);
    ctx.fill();
    limb([[64, -64], [66, -32], [64, -6], [67, 0]], [18, 9, 7, 10]);
    limb([[-58, -66], [-74, -36], [-66, -6], [-64, 0]], [26, 10, 7, 10]);
    const sw = Math.sin(t * 0.8 + sd) * 5 + noise1(t * 0.4 + sd, 4) * 5;
    ctx.beginPath(); ctx.moveTo(-94, -92); ctx.quadraticCurveTo(-116 + sw * 0.3, -70, -110 + sw, -30); ctx.lineTo(-102 + sw, -32); ctx.quadraticCurveTo(-104, -66, -88, -84); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // a cloaked figure standing still, painted soft
  function standing(x, y, h, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(h / 200, h / 200); ctx.fillStyle = col; ctx.filter = 'blur(1px)';
    ctx.beginPath(); ctx.ellipse(0, -182, 14, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12, -168); ctx.bezierCurveTo(-26, -150, -30, -90, -34, -30); ctx.lineTo(30, -30); ctx.bezierCurveTo(28, -90, 26, -150, 12, -168); ctx.closePath(); ctx.fill();
    ctx.fillRect(-12, -32, 6, 32); ctx.fillRect(5, -32, 6, 32);
    ctx.restore();
  }
  // translucent sweeps of light drifting across the frame
  function veils(t, sd, a = 1) {
    const r = rng(sd); ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.filter = 'blur(10px)'; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) { const x0 = r() * W, y0 = r() * H, ang = -0.5 - r() * 0.4, len = 900 + r() * 900, drift = t * (6 + r() * 10); ctx.lineWidth = 60 + r() * 220; ctx.strokeStyle = `rgba(244,240,230,${(0.09 + r() * 0.1) * a})`; ctx.beginPath(); const sx = x0 - Math.cos(ang) * len / 2 + drift, sy = y0 - Math.sin(ang) * len / 2; ctx.moveTo(sx, sy); ctx.bezierCurveTo(sx + len * 0.3, sy - 200 + r() * 400, sx + len * 0.6, sy + Math.sin(ang) * len - 200 + r() * 400, sx + Math.cos(ang) * len, sy + Math.sin(ang) * len); ctx.stroke(); }
    ctx.restore();
  }
  function scratches(t, a = 1) {
    const f = Math.floor(t * 12), r = rng(f * 31 + 7); ctx.save();
    for (let i = 0; i < 3; i++) if (r() < 0.6) { ctx.fillStyle = `rgba(30,28,24,${0.12 * a})`; ctx.fillRect(r() * W, 0, 1 + r(), H); }
    ctx.fillStyle = `rgba(250,246,236,${0.10 * a})`; for (let i = 0; i < 2; i++) ctx.fillRect(r() * W, 0, 1, H);
    for (let i = 0; i < 26; i++) { ctx.globalAlpha = 0.35 * a * r(); ctx.fillStyle = r() < 0.5 ? '#f4efe2' : '#1c1a16'; ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.8 + r() * 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function grade(sat = 0.62, tint = 'rgba(205,165,100,0.28)') {
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${1 - sat})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); ctx.restore();
  }
  // "horses never measured what we had": the overcast pasture, a child far off, horses grazing, the wind
  function scPasture(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.06, sm(u)), lerp(-30, 30, sm(u)), 0);
    washSky(t, 401);
    const hz = 440;
    const lg = ctx.createLinearGradient(0, hz, 0, H); lg.addColorStop(0, '#cfc2a2'); lg.addColorStop(0.25, '#c8ab72'); lg.addColorStop(0.7, '#9a7e4c'); lg.addColorStop(1, '#5a4a30'); ctx.fillStyle = lg; ctx.fillRect(-W, hz, W * 3, H);
    field((x, y) => clamp((fbm(x * 2.2, y * 9, 409, 4) - 0.4) * 2), [[0, 230, 210, 160, 0], [0.5, 220, 196, 140, 0.25], [1, 70, 58, 40, 0.45]], 'source-over', 1, -100, hz, W + 200, H - hz);
    dryBand(408, hz - 14, hz + 2, 'rgba(110,104,96,0.6)', 60, 0.8, 4, 10);
    dryBand(402, hz - 4, hz + 14, '#8a8478', 120, 0.9, 2, 5);        // far haze line
    { const fr = rng(411); let x = -60; while (x < W + 60) { const h = 16 + fr() * 10; ctx.save(); ctx.translate(x, hz + 46); ctx.rotate((fr() - 0.5) * 0.12); rect(-1.5, -h, 2.5 + fr() * 1.5, h, `rgba(50,46,40,${0.5 + fr() * 0.3})`); ctx.restore(); x += 50 + fr() * 50; } } rect(-100, hz + 30, W + 200, 1.5, 'rgba(50,46,40,0.6)'); rect(-100, hz + 38, W + 200, 1.2, 'rgba(50,46,40,0.5)');
    dryBand(403, hz + 50, hz + 200, '#e2cf9c', 160, 0.55, 3, 9);       // pale grass bands
    dryBand(404, hz + 60, hz + 260, '#7a6a48', 110, 0.4, 2, 6);
    dryBand(405, hz + 220, H, '#4a3c28', 160, 0.5, 3, 12);
    standing(410, 760, 150, 'rgba(40,38,36,0.9)');
    standing(780, 600, 66, 'rgba(48,46,44,0.85)');
    grazer(1250, 680, 0.85, 'rgba(78,68,56,0.95)', t, 1);
    grazer(1520, 640, 0.42, 'rgba(90,84,74,0.85)', t, 2);
    grazer(1720, 700, 0.8, 'rgba(84,74,62,0.95)', t, 3, true);
    grass(406, t, 740, 1100, 260, 'rgba(40,36,30,0.75)', 1.4, 120);
    ctx.restore();
    veils(t, 407, 1);
    grade();
    scratches(t);
  }
  // ---------------- SCENES ----------------
  function prairieSky(top, mid, bot, sunX, sunY, sunA) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
    if (sunA > 0) { glow(sunX, sunY, 900, 'rgba(255,190,110,0.5)', sunA); glow(sunX, sunY, 160, 'rgba(255,236,190,1)', sunA); }
  }
  // 0:00 Caney, before dawn: a lone farmstead, a long fence, one window lit (kept from take three)
  function scDawn(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.18, sm(u)), 0, lerp(30, -10, u));
    prairieSky('#1c2438', '#6a4e56', '#c88a62', 1380, 760, sm(prog(u, 0.1, 1)));
    starfield(4, 160, 0.6 * (1 - sm(prog(u, 0, 0.7))), t);
    ground(760, '#1a140e');
    for (let i = 0; i < 16; i++) { const x = -100 + i * 150, h = 46 + (i % 3) * 4; rect(x, 770 - h, 6, h, '#120d08'); }
    rect(-200, 738, W + 400, 2, '#120d08'); rect(-200, 752, W + 400, 2, '#120d08');
    farmhouse(700, 768, 0.34, 0.5 * (1 - sm(prog(u, 0.4, 1))), '#0e0a07', t);
    grass(3, t, 740, 1100, 520, '#120d08', 1.2, 70);
    ctx.restore();
  }
  // "early years i felt so strong and free": sunrise clears the horizon, seeds lift off and rise toward us
  function scMorning(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.1, sm(u)), 0, lerp(40, -60, sm(u)));
    const sunY = lerp(800, 610, sm(u));
    prairieSky('#3a5a8a', '#e8b880', '#f0a060', 1180, sunY, 1);
    field((x, y) => { const v = fbm(x * 4 + t * 0.02, y * 9, 41, 4); return clamp((v - 0.52) * 2.4) * clamp(1 - y * 1.6); }, [[0, 255, 230, 200, 0], [1, 255, 236, 210, 0.55]], 'screen', 0.8);
    ground(770, '#3a3018');
    horizonGlow(772, 'rgba(255,200,130,0.5)', 1);
    grass(17, t, 760, 1100, 640, '#2a2210', 1.4, 80);
    ctx.restore();
    seedDrift(5, t, 34, -200, W + 200, 300, H + 200, 46, sm(prog(u, 0.05, 0.4)), 1.4);
    glow(1180, sunY, 260, 'rgba(255,240,210,0.5)', 0.5);
  }
  // "pastures held no mirror up to me": a stock tank's surface fills the frame, only sky in it
  function scWater(lt, u, t) {
    ctx.save(); cam(lerp(1.12, 1.0, sm(u)), 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d8b888'); g.addColorStop(0.5, '#8aa0b8'); g.addColorStop(1, '#3a5068'); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
    // clouds reflected, drifting, gently wobbled by the water
    field((x, y) => { const wob = Math.sin(y * 40 + t * 1.2) * 0.004; const v = fbm((x + wob) * 3 - t * 0.03, y * 5, 23, 5); return clamp((v - 0.45) * 2.2); }, [[0, 255, 250, 240, 0], [1, 255, 248, 236, 0.85]], 'source-over', 1);
    glow(1240, 300, 300, 'rgba(255,240,210,0.7)', 0.7);
    // fine surface sheen lines
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const y = (i * 47 + t * 9) % (H + 60) - 30; ctx.strokeStyle = `rgba(255,255,255,${0.05 + 0.04 * Math.sin(i)})`; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = -20; x <= W + 20; x += 40) ctx.lineTo(x, y + Math.sin(x * 0.01 + t + i) * 4); ctx.stroke(); } ctx.restore();
    // a seed lands; rings spread and cross
    const land = [L.pastures + 2.0, L.pastures + 5.2];
    ripples(760, 560, land[0], t, 6, 1, 1, 0.42); ripples(1260, 700, land[1], t, 6, 1, 1, 0.42);
    if (t < land[0]) seed(lerp(560, 760, prog(t, L.pastures, land[0])), lerp(120, 548, sm(prog(t, L.pastures, land[0]))), 1.3, 0.2, 1);
    else seed(760 + (t - land[0]) * 14, 548, 1.3, 0.1, clamp(1 - (t - land[0]) * 0.1));
    // the tank's rim along the bottom edge
    ctx.restore();
    const rg = ctx.createLinearGradient(0, H - 120, 0, H); rg.addColorStop(0, 'rgba(30,34,40,0)'); rg.addColorStop(0.5, 'rgba(30,34,40,0.9)'); rg.addColorStop(1, 'rgba(18,20,24,1)'); ctx.fillStyle = rg; ctx.fillRect(0, H - 120, W, 120);
  }
  // "horses never measured what we had": low in the tall grass, into the sun; the field is empty
  function scField(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.08, sm(u)), lerp(-40, 40, u), 0);
    prairieSky('#4a3a5a', '#e08850', '#f8c070', 900, 640, 1);
    glow(900, 640, 600, 'rgba(255,220,150,0.6)', 1);
    bokeh(71, t, 26, 'rgba(255,210,150,1)', 0.22, 30, 120);
    ground(820, '#1a0e06');
    stems(72, t, 160, 850, 'rgba(26,14,6,0.55)', 300, 0.9, 2);
    scrib(1180, 830, { h: 230, head: 46, col: '#100804', t, seed: 3, armL: [-24, 70], armR: [22, 72] });
    stems(73, t, 70, 980, '#120804', 760, 1.1, 3.4);
    ctx.restore();
    seedDrift(75, t, 16, -200, W + 200, 200, H, 20, 0.6, 1.1);
  }
  // "copan oklahoma trailer dreams": the trailer under turning stars (kept, without the stickers)
  function scTrailerNight(lt, u, t, o) {
    ctx.save(); cam(lerp(1.0, o.zoom || 1.25, sm(u)), 0, 40);
    skyGrad('#0a1226', '#1a2240');
    ctx.save(); ctx.translate(W / 2, 1400); ctx.rotate(t * 0.02); const r = rng(55); for (let i = 0; i < 500; i++) { const d = 300 + r() * 1600, a = r() * Math.PI * 2; ctx.strokeStyle = `rgba(230,236,250,${0.2 + r() * 0.5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, d, a, a + 0.02 + u * 0.08); ctx.stroke(); } ctx.restore();
    moon(1560, 220, 30, 0.9);
    ground(780, '#06070a');
    trailer(960, 790, 0.9, o.lit == null ? 1 : o.lit);
    grass(13, t, 780, 1100, 300, '#030405', 0.7, 50);
    ctx.restore();
  }
  // "always will be with me / something that you can't unsee": the moon in a black puddle; a drop breaks it; it comes back
  function scMoonPool(lt, u, t) {
    ctx.save(); cam(lerp(1.05, 1.18, sm(u)));
    rect(-W, -H, W * 3, H * 3, '#04060a');
    field(ink(t, 2.2, 0.03, 61), [[0, 6, 10, 18, 1], [0.6, 14, 20, 34, 1], [1, 30, 40, 60, 1]], 'source-over', 1);
    const drops = [L.unsee + 0.15, L.unsee + 2.2];
    let shatter = 0; drops.forEach((d) => { const ag = t - d; if (ag > 0) shatter = Math.max(shatter, Math.exp(-ag / 1.4)); });
    const mx = 960, my = 470;
    // reflected moon, sliced into wobbling bands when disturbed
    for (let i = -14; i <= 14; i++) {
      const y = my + i * 9, off = Math.sin(i * 1.7 + t * 9) * 46 * shatter + Math.sin(t * 0.8 + i * 0.3) * 2;
      const halfW = Math.sqrt(Math.max(0, 130 * 130 - (i * 9) * (i * 9)));
      ctx.fillStyle = `rgba(220,228,244,${0.9 - 0.4 * shatter})`; ctx.fillRect(mx - halfW + off, y, halfW * 2, 7);
    }
    glow(mx, my, 520, 'rgba(150,170,210,0.35)', 0.8 - 0.3 * shatter);
    drops.forEach((d) => ripples(mx + 30, my + 40, d, t, 7, 0.8, 1, 0.38));
    ctx.restore();
  }
  // "like your bruises that your dad shows off to his friends to prove his resolve":
  // a distant storm over the night prairie, the cloud in bruise colors, lit from inside, silently
  function scStorm(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.12, sm(u)), 0, lerp(20, -20, u));
    skyGrad('#05060c', '#141022');
    // lightning: brief internal flashes on downbeats
    const fl = pulse(DOWN, t, 0.18) * (0.6 + 0.4 * noise1(t * 3, 4)), fl2 = Math.max(0, noise1(t * 2.3, 9) - 0.55) * 2;
    const glowK = 0.35 + 0.65 * Math.max(fl, fl2);
    const grow = sm(prog(u, 0, 0.8));
    field((x, y) => {
      const cx = x - 0.52, cy = (y - 0.62) * 1.25, r = Math.sqrt(cx * cx * 0.55 + cy * cy);
      const body = clamp(1.05 - r * (2.1 - grow * 0.6)) * clamp((0.78 - y) * 6);
      const v = ink(t, 3.2, 0.06, 77)(x, y);
      return clamp(body * (0.25 + v * 1.1));
    }, [[0, 0, 0, 0, 0], [0.25, 40, 22, 70, 0.6], [0.5, 96, 52, 120, 0.85], [0.72, 150, 120, 70, 0.92], [0.88, 186, 176, 96, 0.95], [1, 240, 230, 190, 1]], 'source-over', 0.6 + 0.4 * glowK);
    glow(1000, 520, 700, 'rgba(200,170,255,0.6)', fl * 0.8);
    glow(820, 600, 380, 'rgba(255,240,200,0.6)', fl2 * 0.6);
    ground(800, '#030306');
    [[640, 150, 7, 0], [700, 138, 8, 0.1], [770, 196, 9, -0.05], [840, 142, 10, 0], [1380, 70, 11, 0]].forEach(([fx, fh, sd, ln]) => scrib(fx, 806, { h: fh, head: fh * 0.2, col: '#020203', t, seed: sd, lean: ln, boil: 6 }));
    grass(29, t, 790, 1100, 260, '#010102', 0.9, 40);
    ctx.restore();
  }
  // choruses: the life that could have been, drawn in gold over the open night
  function nightPrairie(t, z = 1, aur = 0.4) {
    ctx.save(); cam(z, 0, 30);
    skyGrad('#03050c', '#0c1424');
    starfield(91, 700, 0.9, t, 0.003);
    aurora(t, aur, 640);
    ground(820, '#020305');
    farmhouse(1560, 824, 0.16, 0.9, '#020305', t);
    grass(93, t, 815, 1100, 260, '#010203', 0.8, 40);
    ctx.restore();
  }
  function scAlmost1(lt, u, t) {
    nightPrairie(t, lerp(1.0, 1.08, u), 0.35);
    const p1 = prog(u, 0.0, 0.35), p2 = prog(u, 0.38, 0.62), p3 = prog(u, 0.62, 0.86);
    const beat = 0.6 + 0.4 * pulse(DOWN, t, 0.6);
    goldShape(SH.house, 960, 700, 1.15, p1, beat, 3);
    goldShape(SH.table, 470, 780, 0.75, p2, beat * 0.9, 2.5);
    goldShape(SH.swing, 1450, 780, 0.75, p3, beat * 0.9, 2.5);
    glow(960, 520, 300, 'rgba(242,200,121,0.25)', 0.4 * p1 * beat);
  }
  // "mom's so smart with her master's degree": perfect geometry draws itself in gold on indigo
  const GEO = (() => {
    const circ = (cx, cy, r, a0 = 0) => { const c = []; for (let i = 0; i <= 72; i++) { const a = a0 + i / 72 * Math.PI * 2; c.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return c; };
    const out = [circ(0, 0, 300, -Math.PI / 2)];
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 2; out.push(circ(Math.cos(a) * 150, Math.sin(a) * 150, 150, a + Math.PI)); }
    const hex = []; for (let k = 0; k <= 6; k++) { const a = k * Math.PI / 3 - Math.PI / 2; hex.push([Math.cos(a) * 300, Math.sin(a) * 300]); } out.push(hex);
    const tri1 = [0, 2, 4, 0].map((k) => { const a = k * Math.PI / 3 - Math.PI / 2; return [Math.cos(a) * 300, Math.sin(a) * 300]; }); out.push(tri1);
    const tri2 = [1, 3, 5, 1].map((k) => { const a = k * Math.PI / 3 - Math.PI / 2; return [Math.cos(a) * 300, Math.sin(a) * 300]; }); out.push(tri2);
    const spiral = []; for (let i = 0; i <= 200; i++) { const a = i / 200 * Math.PI * 5, r = 6 * Math.pow(1.3, a); spiral.push([Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9]); } out.push(spiral);
    return out;
  })();
  function scGeometry(lt, u, t) {
    rect(0, 0, W, H, '#0a0c1e');
    field(ink(t, 1.6, 0.02, 101), [[0, 10, 12, 30, 1], [1, 28, 30, 70, 1]], 'source-over', 1);
    ctx.save(); cam(lerp(0.95, 1.08, sm(u)), 0, 0, t * 0.01);
    goldShape(GEO, 960, 540, 1.15, prog(u, 0.02, 0.92), 0.85, 2);
    ctx.restore();
    seedDrift(111, t * 0.4, 30, 0, W, 0, H, 4, 0.35, 0.5, '255,236,200');
  }
  // "doesn't fit with her insanity": the same geometry, mirrored eightfold, slipping out of register
  function scFracture(lt, u, t) {
    const o = OFFX; const saved = ctx; ctx = o;
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, OFF.width, OFF.height); o.fillStyle = '#0a0c1e'; o.fillRect(0, 0, OFF.width, OFF.height);
    for (let j = 0; j < 3; j++) { o.save(); o.translate(450 + noise1(t * 0.7 + j, 3) * 60 * u, 450 + noise1(t * 0.6 + j, 5) * 60 * u); o.rotate(t * 0.15 * (j - 1) * u + j * 0.3); goldShape(GEO, 0, 0, 0.9 + j * 0.25, 1, 0.5 + 0.2 * j, 2); o.restore(); }
    ctx = saved;
    rect(0, 0, W, H, '#05060f');
    field(ink(t, 2.4, 0.08, 121), [[0, 5, 6, 15, 1], [0.55, 40, 20, 60, 1], [0.8, 110, 50, 90, 1], [1, 190, 150, 90, 1]], 'source-over', 0.5 + 0.5 * u);
    ctx.save(); ctx.translate(W / 2, H / 2); const zoom = 1.25 + 0.35 * u;
    for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(k * Math.PI / 4 + t * 0.06 * u); if (k % 2) ctx.scale(1, -1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1500, -Math.PI / 8, Math.PI / 8); ctx.closePath(); ctx.clip(); ctx.scale(zoom, zoom); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = sm(prog(u, 0, 0.4)); ctx.drawImage(OFF, -OFF.width / 2, -OFF.height / 2); ctx.restore(); }
    ctx.restore();
  }
  // "sagan taught me worlds beyond our own": a beam of light in a dark room; the dust in it becomes stars
  function scSagan(lt, u, t) {
    const fly = sm(prog(u, 0.45, 1));
    rect(0, 0, W, H, '#05050a');
    // the beam
    ctx.save(); ctx.globalAlpha = 1 - fly; ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(400, 0, 1300, H); g.addColorStop(0, 'rgba(255,230,180,0.28)'); g.addColorStop(1, 'rgba(255,230,180,0.04)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(380, -20); ctx.lineTo(620, -20); ctx.lineTo(1500, H + 20); ctx.lineTo(1080, H + 20); ctx.closePath(); ctx.fill();
    ctx.restore();
    // motes: inside the beam they glitter; as we fly in they spread into a starfield
    const r = rng(131); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 420; i++) {
      const v = r(), w = r(), ph = r() * 9;
      const bx = lerp(lerp(380, 620, w), lerp(1080, 1500, w), v), by = v * H;
      const sx = r() * W, sy = r() * H;
      const x = lerp(bx + noise1(t * 0.2 + ph, 2) * 30, sx, fly), y = lerp(by + noise1(t * 0.18 + ph, 4) * 30 - t * 4, sy, fly);
      const tw = 0.5 + 0.5 * Math.sin(t * (1 + w * 2) + ph);
      ctx.globalAlpha = (0.25 + 0.75 * tw) * (0.5 + 0.5 * fly); ctx.fillStyle = w < 0.15 ? '#ffd8a0' : '#eef2ff'; ctx.fillRect(x, y, 2 + (w < 0.05 ? 1.5 : 0), 2 + (w < 0.05 ? 1.5 : 0));
    }
    ctx.restore();
    if (fly > 0) {
      field(ink(t, 2.0, 0.03, 141), [[0, 0, 0, 0, 0], [0.5, 30, 20, 70, 0.4], [0.75, 120, 60, 140, 0.6], [0.9, 240, 170, 120, 0.7], [1, 255, 230, 200, 0.8]], 'lighter', fly * 0.9);
      ctx.save(); ctx.globalAlpha = fly; galaxy(1200, 460, 420, t * 0.12, 1, 9, 1000); planet(560, 760, 80 * fly, '#c87a4a', true, fly); planet(1500, 820, 34 * fly, '#6a9ac8', false, fly); ctx.restore();
    }
  }
  // "but books were little use when the cops came": red and blue flood the cosmos; it collapses to black
  function scCops(lt, u, t) {
    const red = Math.sin(t * 12) > 0;
    const col = sm(prog(u, 0.08, 0.75));
    rect(0, 0, W, H, '#020206');
    ctx.save(); ctx.translate(W * 0.6, H * 0.45); ctx.scale(1 - col * 0.97, 1 - col * 0.97); ctx.translate(-W * 0.6, -H * 0.45);
    field(ink(t, 2.0, 0.03, 141), [[0, 0, 0, 0, 0], [0.5, 30, 20, 70, 0.4], [0.75, 120, 60, 140, 0.6], [0.9, 240, 170, 120, 0.7], [1, 255, 230, 200, 0.8]], 'lighter', 1 - col);
    galaxy(1200, 460, 420, t * 0.12 + col * 8, 1 - col * 0.5, 9, 1000);
    ctx.restore();
    // stars streak toward the vanishing point
    const r = rng(151); ctx.save(); ctx.strokeStyle = '#e8eefa'; ctx.lineWidth = 2;
    for (let i = 0; i < 300; i++) { const a = r() * Math.PI * 2, d0 = 200 + r() * 1200, d = d0 * (1 - col), d2 = d0 * (1 - col) * (1 - 0.25 * col) ; ctx.globalAlpha = (1 - col) * 0.8; ctx.beginPath(); ctx.moveTo(W * 0.6 + Math.cos(a) * d, H * 0.45 + Math.sin(a) * d); ctx.lineTo(W * 0.6 + Math.cos(a) * d2, H * 0.45 + Math.sin(a) * d2); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = red ? 'rgba(255,30,40,0.28)' : 'rgba(30,70,255,0.28)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    const sweep = (t * 1.6) % 1; glow(sweep * W, 300, 800, red ? 'rgba(255,60,60,0.8)' : 'rgba(60,110,255,0.8)', 0.5);
  }
  // "concrete walls, recited rules": a blank concrete wall; one shaft of light from a high slit crawls across it
  function scConcrete(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.06, u));
    rect(-W, -H, W * 3, H * 3, '#2a2c2c');
    field((x, y) => fbm(x * 18, y * 10, 161, 4), [[0, 30, 32, 32, 1], [1, 58, 60, 58, 1]], 'source-over', 1);
    // form-tie holes in a strict grid
    for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) { const x = 180 + i * 260, y = 180 + j * 240; ctx.fillStyle = 'rgba(10,10,12,0.6)'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(-W, j * 300 - 30); ctx.lineTo(W * 2, j * 300 - 30); ctx.stroke(); }
    // the light
    const x = lerp(-200, 1500, u);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(x, 0, x + 160, 0); g.addColorStop(0, 'rgba(255,240,210,0)'); g.addColorStop(0.5, 'rgba(255,240,210,0.38)'); g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, -50); ctx.lineTo(x + 160, -50); ctx.lineTo(x + 360, H + 50); ctx.lineTo(x + 200, H + 50); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  // "hottie staff that you will never have": warm light moving behind frosted glass, out of reach
  function scGlass(lt, u, t) {
    rect(0, 0, W, H, '#0e1014');
    const bx = lerp(500, 1400, sm(u)) + Math.sin(t * 0.6) * 80, by = 520 + Math.sin(t * 0.4) * 40;
    glow(bx, by, 700, 'rgba(255,170,110,0.6)', 0.9); glow(bx + 120, by - 60, 300, 'rgba(255,220,170,0.9)', 0.7);
    // frost
    field((x, y) => fbm(x * 30, y * 18, 171, 3), [[0, 200, 210, 220, 0.05], [1, 220, 230, 240, 0.28]], 'source-over', 1);
    // condensation running down the glass
    const r = rng(173); ctx.save();
    for (let i = 0; i < 40; i++) { const x = r() * W, sp = 20 + r() * 70, ph = r() * 40, y = ((t * sp + ph * 30) % (H + 200)) - 100, len = 60 + r() * 220; const g = ctx.createLinearGradient(0, y - len, 0, y); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,240,230,0.25)'); ctx.fillStyle = g; ctx.fillRect(x, y - len, 3, len); ctx.fillStyle = 'rgba(255,245,235,0.45)'; ctx.beginPath(); ctx.arc(x + 1.5, y, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // the wire grid in the glass
    ctx.strokeStyle = 'rgba(10,10,12,0.5)'; ctx.lineWidth = 2; for (let x = -40; x < W + 40; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 0, H); ctx.stroke(); } for (let y = 0; y < H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  // "privilege levels that you can't achieve": planes of light stacked upward into fog, receding
  function scLevels(lt, u, t) {
    rect(0, 0, W, H, '#0a0c12');
    ctx.save(); cam(1, 0, lerp(-200, 260, sm(u)));
    for (let i = 0; i < 9; i++) {
      const y = 980 - i * 210 - u * 120 * i * 0.3, w = 900 - i * 70, a = 0.9 * Math.pow(0.8, i);
      const g = ctx.createLinearGradient(0, y - 6, 0, y + 30); g.addColorStop(0, `rgba(255,236,200,${a})`); g.addColorStop(1, 'rgba(255,236,200,0)');
      ctx.fillStyle = g; ctx.fillRect(960 - w / 2, y, w, 30); glow(960, y, w * 0.45, 'rgba(255,220,170,0.35)', a);
    }
    ctx.restore();
    field((x, y) => fbm(x * 3 + t * 0.05, y * 2, 181, 4) * (1 - y * 0.6), [[0, 10, 12, 18, 0], [1, 60, 64, 80, 0.75]], 'source-over', 1);
  }
  // "it all seems built to hold you back": a seed drifts up and is caught against wire, trembling
  function scHeld(lt, u, t) {
    rect(0, 0, W, H, '#0c1220');
    field(ink(t, 1.5, 0.02, 191), [[0, 12, 18, 32, 1], [1, 40, 50, 80, 1]], 'source-over', 1);
    const meshY = 380;
    ctx.save(); ctx.strokeStyle = 'rgba(150,160,180,0.55)'; ctx.lineWidth = 2.5;
    for (let i = -10; i < 40; i++) { ctx.beginPath(); ctx.moveTo(i * 60, meshY - 600); ctx.lineTo(i * 60 + 600, meshY + 600); ctx.stroke(); ctx.beginPath(); ctx.moveTo(i * 60, meshY + 600); ctx.lineTo(i * 60 + 600, meshY - 600); ctx.stroke(); }
    ctx.restore();
    const catchU = 0.45, rise = sm(prog(u, 0, catchU));
    const x = 960 + noise1(t * 0.4, 3) * (1 - rise) * 80, y = lerp(H + 60, meshY + 16, rise);
    const shiver = u > catchU ? Math.sin(t * 23) * 2.5 * (0.6 + 0.4 * noise1(t * 2, 5)) : 0;
    seed(x + shiver, y, 2.6, shiver * 0.03, 1);
    seedDrift(193, t, 10, 0, W, 0, meshY, 0, 0.25, 0.7);
  }
  function scAlmost2(lt, u, t) {
    rect(0, 0, W, H, '#03040a');
    field(ink(t, 2.0, 0.03, 201), [[0, 0, 0, 0, 0], [0.55, 30, 24, 60, 0.5], [0.85, 100, 70, 120, 0.6], [1, 220, 180, 140, 0.7]], 'lighter', 0.8);
    starfield(203, 600, 0.9, t, 0.004);
    const beat = 0.6 + 0.4 * pulse(DOWN, t, 0.6);
    const items = [[SH.cap, 480, 420, 1.0], [SH.car, 1420, 420, 0.9], [SH.book, 520, 820, 1.0], [SH.key, 1400, 820, 1.1]];
    items.forEach(([shp, x, y, s], i) => { const p = prog(u, i * 0.2, i * 0.2 + 0.28); goldShape(shp, x, y, s, p, beat * (1 - 0.3 * prog(u, 0.9, 1)), 3); });
    glow(960, 540, 900, 'rgba(242,200,121,0.15)', beat * 0.6);
  }
  // ---- bridge (5/4): aurora, then underwater light, then rising through cloud into space ----
  function bar5(t) { const i = lastBefore(DOWN, t); return i < 0 ? 0 : Math.exp(-(t - DOWN[i]) / 0.9); }
  function scAurora(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.15, sm(u)), 0, lerp(80, -40, sm(u)));
    skyGrad('#020409', '#0a1420');
    starfield(211, 900, 0.9, t, 0.002);
    aurora(t, 0.75, 700, 0.6 * bar5(t));
    ground(860, '#010203');
    grass(213, t, 850, 1100, 220, '#000102', 0.6, 40);
    ctx.restore();
  }
  function scDeep(lt, u, t) {
    rect(0, 0, W, H, '#03141c');
    // caustic light: bright where two warped ridge fields cross
    const tm = t * 0.35 + 23;
    field((x, y) => {
      let px = x * 7.5 - 250, py = y * 4.2 - 250, ix = px, iy = py, c = 1;
      for (let n = 0; n < 4; n++) { const tt = tm * (1 - 3.5 / (n + 1)); const nx = px + Math.cos(tt - ix) + Math.sin(tt + iy), ny = py + Math.sin(tt - iy) + Math.cos(tt + ix); ix = nx; iy = ny; c += 1 / Math.hypot(px / (Math.sin(ix + tt) / 0.005), py / (Math.cos(iy + tt) / 0.005)); }
      c /= 4; c = 1.17 - Math.pow(c, 1.4); return clamp(Math.pow(Math.abs(c), 8)) * (1 - y * 0.6);
    }, [[0, 0, 0, 0, 0], [0.35, 50, 170, 180, 0.35], [1, 210, 255, 245, 0.95]], 'lighter', 0.75 + 0.25 * bar5(t));
    // god rays
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const x = 200 + i * 200 + Math.sin(t * 0.3 + i) * 60; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(160,240,230,0.14)'); g.addColorStop(1, 'rgba(160,240,230,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 30, -10); ctx.lineTo(x + 30, -10); ctx.lineTo(x + 160 + i * 10, H); ctx.lineTo(x + 40, H); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // suspended motes rising slowly
    const r = rng(231); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 220; i++) { const x = r() * W + noise1(t * 0.2 + i, 2) * 30, y = ((r() * H - t * (8 + r() * 20)) % H + H) % H, s = 1 + r() * 2.5; ctx.globalAlpha = 0.25 + r() * 0.5; ctx.fillStyle = '#d8fff6'; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    const sh = ctx.createLinearGradient(0, H * 0.5, 0, H); sh.addColorStop(0, 'rgba(0,6,10,0)'); sh.addColorStop(1, 'rgba(0,6,10,0.8)'); ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
  }
  function scAscend(lt, u, t) {
    const up = sm(u);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, `rgb(${lerp(120, 2, up)},${lerp(150, 4, up)},${lerp(190, 12, up)})`); g.addColorStop(1, `rgb(${lerp(230, 30, up)},${lerp(200, 50, up)},${lerp(180, 100, up)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    starfield(241, 900, sm(prog(u, 0.45, 0.9)), t, 0.002);
    // clouds rushing downward past us, thinning out
    field((x, y) => { const v = fbm(x * 3, y * 3 + t * 0.45, 243, 5); return clamp((v - 0.4 - up * 0.35) * 3); }, [[0, 255, 255, 255, 0], [0.5, 240, 236, 240, 0.7], [1, 255, 252, 250, 1]], 'source-over', 1 - sm(prog(u, 0.6, 0.85)));
    // the curve of the earth's glow appears below
    const e = sm(prog(u, 0.55, 1));
    if (e > 0) { ctx.save(); ctx.globalAlpha = e; const eg = ctx.createRadialGradient(960, H + 2600, 2600, 960, H + 2600, 2780); eg.addColorStop(0, 'rgba(120,180,255,0.9)'); eg.addColorStop(0.4, 'rgba(60,120,220,0.35)'); eg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#02040a'; ctx.beginPath(); ctx.arc(960, H + 2600, 2600, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    glow(1500, 260, 220, 'rgba(255,240,220,0.9)', e * (0.5 + 0.5 * bar5(t)));
  }
  // "please just one more ride": a fast, gliding run through the golden grass, from where the rider would be
  function scRide(lt, u, t) {
    const bob = Math.sin(t * Math.PI * 2 / 0.5108) * 6 + Math.sin(t * Math.PI / 0.5108) * 3;
    ctx.save(); cam(1.05, 0, bob, Math.sin(t * 0.9) * 0.012);
    prairieSky('#4a6aa0', '#f0c080', '#f09850', 1240, 600, 1);
    ground(680, '#6a5422');
    // rows of grass rushing toward us: each row scales up and slides down as it approaches
    const speed = 1.6, rows = 26;
    for (let k = rows; k >= 1; k--) {
      const ph = (k - (t * speed) % 1) / rows; // 0 near .. 1 far
      if (ph <= 0.02) continue;
      const y = 686 + 700 * Math.pow(1 - ph, 3), sc = lerp(9, 0.3, Math.pow(ph, 0.5)), sx = lerp(3.2, 0.5, ph);
      const col = `rgba(${Math.round(lerp(30, 90, ph))},${Math.round(lerp(22, 70, ph))},${Math.round(lerp(8, 30, ph))},1)`;
      ctx.save(); ctx.translate(960, y); ctx.scale(sx, sc); ctx.translate(-960, 0); stems(300 + Math.floor(k + Math.floor(t * speed)) % 997, t, 34, 0, col, 60, 1.2, 2.2 * sx / sc); ctx.restore();
    }
    ctx.restore();
    seedDrift(261, t * 2.2, 40, -200, W + 200, 0, H, 30, 0.7, 1.2);
    const fx = 1240, fy = 600; [[0.3, 60, 'rgba(255,200,140,0.25)'], [0.6, 30, 'rgba(160,200,255,0.2)'], [1.2, 90, 'rgba(255,180,120,0.12)']].forEach(([k, r, c]) => glow(lerp(fx, W / 2, k * 2), lerp(fy, H / 2, k * 2), r, c, 0.8));
  }
  // "please just one more chance": on the open prairie at dusk, the gold house fills with light for a moment
  function scChance(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.1, sm(u)));
    prairieSky('#2a3050', '#c07050', '#5a3a2a', 960, 820, 0.6);
    ground(780, '#140e0a');
    grass(31, t, 780, 1100, 300, '#0a0806', 1, 50);
    ctx.restore();
    const fill = sm(prog(u, 0.25, 0.5)) * (1 - sm(prog(u, 0.62, 0.95)));
    const s = 1.25, x = 960, y = 760;
    if (fill > 0.01) {
      ctx.save(); ctx.globalAlpha = fill * 0.85;
      ctx.fillStyle = '#c9925a'; ctx.beginPath(); SH.house[0].forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, y + py * s) : ctx.moveTo(x + px * s, y + py * s))); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a3a2a'; ctx.beginPath(); ctx.moveTo(x - 220 * s, y - 220 * s); ctx.lineTo(x, y - 370 * s); ctx.lineTo(x + 220 * s, y - 220 * s); ctx.closePath(); ctx.fill();
      SH.house.slice(1, 4).forEach((b2) => { ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x + b2[0][0] * s, y + b2[0][1] * s, (b2[1][0] - b2[0][0]) * s, (b2[2][1] - b2[1][1]) * s); });
      ctx.restore(); glow(x, y - 200, 700, 'rgba(255,214,150,0.6)', fill);
    }
    goldShape(SH.house, x, y, s, 1, 0.9, 3);
    const fa = sm(prog(u, 0.1, 0.35)) * (1 - 0.6 * sm(prog(u, 0.7, 1)));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    scrib(1420, 770, { h: 300, head: 50, col: 'rgba(242,200,121,0.9)', t, seed: 21, a: fa, armL: [-40, 80], armR: [62, 120] });
    scrib(1530, 770, { h: 180, head: 36, col: 'rgba(242,200,121,0.9)', t, seed: 22, a: fa, armL: [-52, 22], armR: [22, 50] });
    ctx.restore(); glow(1470, 640, 260, 'rgba(242,200,121,0.3)', fa * 0.6);
  }
  // outro: the almost-shapes rise into the sky as constellations; the farmhouse window goes out; stars; black
  function scOutro(lt, u, t) {
    const night = sm(prog(t, SEC.out, SEC.out + 12));
    const lit = t < SEC.dark ? 1 : Math.exp(-(t - SEC.dark) / 0.12);
    ctx.save(); cam(lerp(1.0, 1.12, sm(u)), 0, lerp(0, 60, sm(u)));
    prairieSky(night > 0.5 ? '#060a18' : '#2a2a4a', night > 0.5 ? '#141a30' : '#a0604a', '#1a1010', 960, 860, 0.5 * (1 - night));
    ctx.fillStyle = `rgba(4,6,14,${night * 0.85})`; ctx.fillRect(-W, -H, W * 3, H * 3);
    starfield(61, 600, night, t, 0.004);
    aurora(t, 0.25 * night * (1 - prog(t, SEC.dark, SEC.dark + 6)), 560);
    const shapes = [[SH.house, 520, 380, 0.7], [SH.table, 980, 300, 0.55], [SH.swing, 1400, 360, 0.6], [SH.cap, 700, 560, 0.5], [SH.car, 1250, 560, 0.5], [SH.book, 960, 700, 0.6], [SH.key, 1560, 640, 0.45]];
    shapes.forEach(([shp, x, y, s], i) => {
      const up = sm(prog(t, SEC.out + 2 + i * 1.5, SEC.out + 8 + i * 1.5)), yy = lerp(y + 500, y, up);
      const a = up * (1 - 0.5 * prog(t, SEC.dark, SEC.end - 2));
      shp.forEach((pl) => pl.forEach(([px, py]) => glow(x + px * s, yy + py * s, 9, 'rgba(255,240,210,1)', a)));
      ctx.save(); ctx.globalAlpha = 0.35; goldShape(shp, x, yy, s, up, a * 0.6, 1.2); ctx.restore();
    });
    ground(860, '#040406');
    farmhouse(960, 868, 0.3, lit, '#040406', t);
    scrib(1180, 872, { h: 64, head: 14, col: '#040406', t, seed: 31, boil: 4, armL: [-6, 20], armR: [6, 20] });
    grass(71, t, 860, 1100, 380, '#020203', 0.8, 50);
    ctx.restore();
    if (t > SEC.dark) { ctx.fillStyle = `rgba(1,2,5,${0.45 * prog(t, SEC.dark, SEC.dark + 1.5)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- the cut ----------
  function shot(a, b, fn, o) { SHOTS.push({ start: a, end: b, fn, o: o || {} }); }
  function buildShots() {
    shot(0, L.early, scDawn);
    shot(L.early, L.pastures, scMorning);
    shot(L.pastures, L.horses, scWater);
    shot(L.horses, L.copan, scPasture);
    shot(L.copan, L.always, scTrailerNight, { zoom: 1.3 });
    shot(L.always, L.bruises, scMoonPool);
    shot(L.bruises, L.ch1, scStorm);
    shot(L.ch1, SEC.v2 + 1.2, scAlmost1);
    shot(SEC.v2 + 1.2, L.insanity, scGeometry);
    shot(L.insanity, L.sagan, scFracture);
    shot(L.sagan, L.cops, scSagan);
    shot(L.cops, L.concrete, scCops);
    shot(L.concrete, L.staff, scConcrete);
    shot(L.staff, L.privilege, scGlass);
    shot(L.privilege, L.hold, scLevels);
    shot(L.hold, L.ch2, scHeld);
    shot(L.ch2, SEC.br, scAlmost2);
    seq(SEC.br, L.ride, [[5, scAurora], [5, scDeep], [6, scAscend]]);
    shot(L.ride, L.chance, scRide);
    shot(L.chance, SEC.out, scChance);
    shot(SEC.out, SEC.end + 1, scOutro);
  }

  // ---------- frame ----------
  function render(t) {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    let k = SHOTS.findIndex((s) => t >= s.start && t < s.end); if (k < 0) k = SHOTS.length - 1;
    const sh = SHOTS[k], lt = t - sh.start, u = clamp(lt / Math.max(0.01, sh.end - sh.start));
    const inChorus = (t >= L.ch1 && t < SEC.v2 + 1.2) || (t >= L.ch2 && t < SEC.br);
    const punch = inChorus ? 0.03 * pulse(DOWN, t, 0.25) : 0;
    const breath = 1 + 0.005 * Math.sin(t * 2 * Math.PI / (0.5108 * 8));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(breath + punch, breath + punch); ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = '#000'; ctx.fillRect(-W, -H, W * 3, H * 3);
    sh.fn(lt, u, t, sh.o);
    ctx.restore();
    // cross-dissolve from the previous shot over the first beat (except hard cuts into choruses)
    if (k > 0 && lt < 0.45 && ![L.ch1, L.ch2, L.cops].includes(sh.start)) {
      const prev = SHOTS[k - 1]; const plt = t - prev.start, pu = clamp(plt / Math.max(0.01, prev.end - prev.start));
      ctx.save(); ctx.globalAlpha = 1 - sm(lt / 0.45); ctx.translate(W / 2, H / 2); ctx.scale(breath, breath); ctx.translate(-W / 2, -H / 2); prev.fn(plt, pu, t, prev.o); ctx.restore();
    }
    [L.ch1, L.ch2].forEach((s0) => { const d = t - s0; if (d >= 0 && d < 0.6) { ctx.fillStyle = `rgba(255,236,200,${0.5 * (1 - d / 0.6)})`; ctx.fillRect(0, 0, W, H); } });
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.4; ctx.drawImage(PAPER, 0, 0); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (inChorus) glow(W * (0.5 + 0.5 * Math.sin(t * 0.4)), H * 0.2, 700, 'rgba(255,140,60,0.22)', 0.6);
    const gi = Math.floor(t * 24) % GRAIN.length;
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.3; ctx.drawImage(GRAIN[gi], 0, 0, W, H); ctx.restore();
    const fl = 0.035 * noise1(t * 9, 9); if (fl > 0) { ctx.fillStyle = `rgba(0,0,0,${fl})`; ctx.fillRect(0, 0, W, H); }
    const fi = 1 - prog(t, 0, 2.5), fo = prog(t, A.duration - 2.5, A.duration - 0.3);
    if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
  }

  async function init() {
    cv = document.getElementById('c'); ctx = cv.getContext('2d');
    A = await (await fetch('../sources/analysis.json', { cache: 'no-store' })).json();
    DUR = A.duration; buildTiming(); buildShots();
    PAPER = makePaper(); for (let i = 0; i < 6; i++) GRAIN.push(makeGrain(1000 + i));
    FCV = document.createElement('canvas'); FCV.width = FW; FCV.height = FH; FCX = FCV.getContext('2d', { willReadFrequently: true }); FIMG = FCX.createImageData(FW, FH);
    OFF = document.createElement('canvas'); OFF.width = 900; OFF.height = 900; OFFX = OFF.getContext('2d');
    return { duration: DUR, sections: SEC, shots: SHOTS.map((s) => [s.fn.name, +s.start.toFixed(2), +s.end.toFixed(2)]) };
  }
  window.EP = {
    ready: null, render,
    setScale(s) { SCALE = s; cv.width = Math.round(W * s); cv.height = Math.round(H * s); },
    frame(t, q = 0.92) { render(t); return cv.toDataURL('image/jpeg', q); },
    framePng(t) { render(t); return cv.toDataURL('image/png'); },
    get duration() { return DUR; },
  };
  window.EP.ready = init();
})();
