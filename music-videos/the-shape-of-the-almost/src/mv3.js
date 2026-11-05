// "The Shape of the Almost" — Broken Ladder. Music video, take two.
// Paper-cutout silhouette story: two people who keep almost meeting, and a plant reaching for a light.
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

  // ---------------- SCENES ----------------
  function prairieSky(top, mid, bot, sunX, sunY, sunA) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
    if (sunA > 0) { glow(sunX, sunY, 900, 'rgba(255,190,110,0.5)', sunA); glow(sunX, sunY, 160, 'rgba(255,236,190,1)', sunA); }
  }
  function scDawn(lt, u, t) {
    // three miles east of Caney: a lone farmstead on an empty pasture, pre-dawn, one window lit
    ctx.save(); cam(lerp(1.0, 1.18, sm(u)), 0, lerp(30, -10, u));
    prairieSky('#1c2438', '#6a4e56', '#c88a62', 1380, 760, sm(prog(u, 0.1, 1)));
    starfield(4, 160, 0.6 * (1 - sm(prog(u, 0, 0.7))), t);
    rect(-W, 760, W * 3, H, '#1a140e');
    // a long barbed-wire fence running off to nowhere
    for (let i = 0; i < 16; i++) { const x = -100 + i * 150, h = 46 + (i % 3) * 4; rect(x, 770 - h, 6, h, '#120d08'); }
    rect(-200, 738, W + 400, 2, '#120d08'); rect(-200, 752, W + 400, 2, '#120d08');
    farmhouse(700, 768, 0.34, 0.5 * (1 - sm(prog(u, 0.4, 1))), '#0e0a07', t);
    grass(3, t, 740, 1100, 520, '#120d08', 1.2, 70);
    ctx.restore();
  }
  function scBike(lt, u, t) {
    ctx.save(); cam(lerp(1.06, 1.18, sm(u)), lerp(20, -30, u), 0);
    prairieSky('#5a7aa8', '#e8c890', '#e0a060', 1500, 520, 1);
    rect(-W, 720, W * 3, H, '#5a5a2a');
    grass(7, t, 700, 1100, 700, '#2a2e14', 1.4, 90);
    // bike lying in the grass, front wheel turning
    ctx.save(); ctx.translate(820, 880); ctx.rotate(-0.08); ctx.strokeStyle = '#0a0806'; ctx.lineWidth = 9;
    const wheel = (x, y, spin) => { ctx.beginPath(); ctx.ellipse(x, y, 110, 70, 0, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = spin + i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 108, y + Math.sin(a) * 68); ctx.stroke(); } ctx.lineWidth = 9; };
    wheel(-170, 0, 0.3); wheel(190, 10, t * 2.2 * Math.exp(-lt * 0.12));
    ctx.beginPath(); ctx.moveTo(-170, 0); ctx.lineTo(-30, -90); ctx.lineTo(120, -80); ctx.lineTo(190, 10); ctx.moveTo(-30, -90); ctx.lineTo(10, 0); ctx.lineTo(-170, 0); ctx.moveTo(10, 0); ctx.lineTo(120, -80); ctx.moveTo(120, -80); ctx.lineTo(110, -130); ctx.lineTo(70, -140); ctx.moveTo(-40, -95); ctx.lineTo(-60, -130); ctx.stroke();
    rect(-90, -140, 70, 14, '#0a0806');
    ctx.restore();
    grass(8, t, 860, 1100, 260, '#1e2210', 1.4, 110);
    ctx.restore();
  }
  function scTank(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.12, sm(u)));
    prairieSky('#6a8ab8', '#d8c098', '#a87848', 960, 330, 0.6);
    rect(-W, 600, W * 3, H, '#4a4422');
    // stock tank (top view-ish ellipse) reflecting the sky, no reflection of anyone
    ctx.save(); ctx.beginPath(); ctx.ellipse(960, 800, 620, 190, 0, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, 610, 0, 990); g.addColorStop(0, '#a87848'); g.addColorStop(0.5, '#d8c098'); g.addColorStop(1, '#6a8ab8'); ctx.fillStyle = g; ctx.fillRect(300, 600, 1320, 400);
    glow(960, 900, 160, 'rgba(255,236,190,0.9)', 0.7);
    for (let i = 0; i < 6; i++) { const ph = (lt * 0.35 + i / 6) % 1; ctx.strokeStyle = `rgba(255,255,255,${0.35 * (1 - ph)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(1060, 820, 40 + ph * 420, 14 + ph * 130, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#3a3e44'; ctx.lineWidth = 26; ctx.beginPath(); ctx.ellipse(960, 800, 630, 198, 0, 0, Math.PI * 2); ctx.stroke();
    grass(9, t, 940, 1100, 300, '#2a2610', 1, 80); grass(10, t, 560, 650, 260, '#3a361a', 0.8, 30);
    ctx.restore();
  }
  function scHorses(lt, u, t) {
    T0 = t;
    ctx.save(); cam(lerp(1.15, 1.0, sm(u)), lerp(-60, 60, u), 0);
    prairieSky('#3a2a4a', '#e07040', '#f0a050', 980, 700, 1);
    rect(-W, 760, W * 3, H, '#140a06');
    // fence posts
    for (let i = 0; i < 14; i++) rect(-200 + i * 180, 700, 12, 90, '#0a0503'); rect(-300, 715, W + 600, 6, '#0a0503'); rect(-300, 745, W + 600, 6, '#0a0503');
    farmhouse(260, 748, 0.22, 0, '#1a0c06', t);
    horse(620, 770, 0.95); horse(1200, 790, 1.1); ctx.save(); ctx.translate(1600, 780); ctx.scale(-1, 1); horse(0, 0, 0.8); ctx.restore();
    grass(11, t, 760, 1100, 420, '#0a0603', 1.1, 60);
    ctx.restore();
  }
  function scTrailerNight(lt, u, t, o) {
    ctx.save(); cam(lerp(1.0, o.zoom || 1.25, sm(u)), 0, 40);
    skyGrad('#0a1226', '#1a2240');
    ctx.save(); ctx.translate(W / 2, 1400); ctx.rotate(t * 0.02); const r = rng(55); for (let i = 0; i < 500; i++) { const d = 300 + r() * 1600, a = r() * Math.PI * 2; ctx.strokeStyle = `rgba(230,236,250,${0.2 + r() * 0.5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, d, a, a + 0.02 + u * 0.08); ctx.stroke(); } ctx.restore();
    moon(1560, 220, 30, 0.9);
    rect(-W, 780, W * 3, H, '#06070a');
    // string lights
    for (let i = 0; i < 14; i++) { const x = 680 + i * 44, y = 640 + Math.sin(i / 13 * Math.PI) * 26; glow(x, y, 16, i % 3 ? 'rgba(255,200,120,1)' : 'rgba(255,120,120,1)', 0.7 + 0.3 * Math.sin(t * 2 + i)); }
    trailer(960, 790, 0.9, o.lit == null ? 1 : o.lit);
    stickers(960 - 108, 790 - 135, 99, 54, t, o.lit == null ? 1 : o.lit);
    grass(13, t, 780, 1100, 300, '#030405', 0.7, 50);
    ctx.restore();
  }
  function scHallway(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.7, eIn(u) * 0.6 + sm(u) * 0.4));
    rect(-W, -H, W * 3, H * 3, '#100c0a');
    const vp = [960, 520];
    ctx.fillStyle = '#1e1813'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(820, 380); ctx.lineTo(820, 700); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#181410'; ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(1100, 380); ctx.lineTo(1100, 700); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0d0a08'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(820, 700); ctx.lineTo(1100, 700); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    // paneling lines
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; for (let i = 0; i < 10; i++) { const v = i / 10; ctx.beginPath(); ctx.moveTo(v * 820, v * 380); ctx.lineTo(v * 820, H - v * (H - 700)); ctx.stroke(); ctx.beginPath(); ctx.moveTo(W - v * 820, v * 380); ctx.lineTo(W - v * 820, H - v * (H - 700)); ctx.stroke(); }
    // closed door at the end, light leaking underneath
    rect(820, 380, 280, 320, '#2a2018'); rect(830, 692, 260, 8, 'rgba(242,200,121,0.9)'); glow(960, 700, 220, 'rgba(242,200,121,0.5)', 0.8);
    ctx.fillStyle = '#c9a35a'; ctx.beginPath(); ctx.arc(1060, 560, 7, 0, Math.PI * 2); ctx.fill();
    // TV flicker from a side room
    const fl = 0.5 + 0.5 * noise1(t * 6, 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(110,150,230,${0.18 * fl})`; ctx.beginPath(); ctx.moveTo(300, 140); ctx.lineTo(560, 260); ctx.lineTo(560, 820); ctx.lineTo(300, 980); ctx.closePath(); ctx.fill(); ctx.restore();
    void vp; ctx.restore();
  }
  function scKitchen(lt, u, t) {
    ctx.save(); cam(lerp(1.05, 1.2, sm(u)), lerp(-30, 30, u), 0);
    rect(-W, -H, W * 3, H * 3, '#3a2c1e');
    // the shadow: a huge still silhouette of a man on the wall, cast by an unseen lamp
    ctx.save(); ctx.fillStyle = 'rgba(8,6,4,0.85)'; ctx.filter = 'blur(6px)';
    ctx.beginPath(); ctx.ellipse(1240, 300, 120, 140, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(900, 1100); ctx.quadraticCurveTo(880, 520, 1120, 440); ctx.lineTo(1360, 440); ctx.quadraticCurveTo(1620, 520, 1640, 1100); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1560, 540); ctx.quadraticCurveTo(1780, 420, 1760, 300); ctx.lineTo(1700, 290); ctx.quadraticCurveTo(1690, 400, 1540, 470); ctx.closePath(); ctx.fill();
    ctx.restore();
    glow(400, 200, 600, 'rgba(255,200,120,0.4)', 0.8);
    // table and cans
    rect(-100, 760, W + 200, 360, '#1a120c'); rect(-100, 760, W + 200, 14, '#2a1c12');
    [[420, 0], [520, 1], [640, 0], [740, 2], [1500, 1], [1620, 0]].forEach(([x, k], i) => { const tipped = k === 2; ctx.save(); ctx.translate(x, 760); if (tipped) ctx.rotate(Math.PI / 2); rect(-26, -110, 52, 110, '#6a6e72'); rect(-26, -110, 52, 18, '#9a9ea4'); rect(-26, -70, 52, 30, i % 2 ? '#7a2a24' : '#24407a'); ctx.restore(); });
    ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.ellipse(1060, 770, 90, 22, 0, 0, Math.PI * 2); ctx.fill(); rect(1040, 752, 70, 8, '#f0e0c0'); glow(1110, 755, 10, 'rgba(255,120,60,1)', 0.9);
    smoke(1112, 750, t, 0.9);
    // the bruise blooms across the paper
    inkBloom(980, 420, 520, prog(u, 0.15, 0.9), 33);
    ctx.restore();
  }
  function scAlmost1(lt, u, t) {
    // trailer at night, the life that could have been sketched over it in gold
    scTrailerNight(lt, 0.6, t, { zoom: 1.08 });
    ctx.fillStyle = 'rgba(2,3,8,0.45)'; ctx.fillRect(0, 0, W, H);
    const p1 = prog(u, 0.0, 0.35), p2 = prog(u, 0.38, 0.62), p3 = prog(u, 0.62, 0.86);
    const beat = 0.6 + 0.4 * pulse(DOWN, t, 0.6);
    goldShape(SH.house, 960, 760, 1.25, p1, beat, 3);
    goldShape(SH.table, 520, 900, 0.8, p2, beat * 0.9, 2.5);
    goldShape(SH.swing, 1480, 900, 0.8, p3, beat * 0.9, 2.5);
    // the shapes are never filled: a faint breath of light inside, then gone
    glow(960, 560, 300, 'rgba(242,200,121,0.25)', 0.4 * p1 * beat);
  }
  function panel(x0, w, col) { rect(x0, -H, w, H * 3, col); ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; for (let x = x0; x < x0 + w; x += 110) { ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, H * 2); ctx.stroke(); } ctx.restore(); }
  function diplomaFrame(cx, cy, tilt, crack) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    rect(-300, -220, 600, 440, '#1a0f08'); rect(-270, -190, 540, 380, '#e8dcc0');
    scribbleLines(-200, -120, 400, 1, 0, 'rgba(40,30,20,0.9)', 1); scribbleLines(-150, -60, 300, 4, 36, 'rgba(60,50,40,0.6)', 2);
    ctx.fillStyle = '#9a2a24'; ctx.beginPath(); ctx.arc(170, 120, 34, 0, Math.PI * 2); ctx.fill();
    if (crack > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; const r = rng(4); ctx.beginPath(); let x = -260, y = -160; ctx.moveTo(x, y); for (let i = 0; i < 9 * crack; i++) { x += 50 + r() * 30; y += (r() - 0.35) * 70; ctx.lineTo(x, y); } ctx.stroke(); ctx.beginPath(); ctx.moveTo(-40, -40); ctx.lineTo(-120, 160 * crack); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(-270, -190, 270, 190); g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-270, -190, 540, 380); ctx.restore();
    ctx.restore();
  }
  function scDiploma(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.15, sm(u)));
    panel(-W, W * 3, '#3a2616');
    glow(700, 200, 700, 'rgba(255,210,140,0.45)', 0.9);
    diplomaFrame(960, 500, 0.035, 1);
    const r = rng(77); for (let i = 0; i < 40; i++) glow(r() * W, ((r() * H - lt * 20) % H + H) % H, 3 + r() * 4, 'rgba(255,230,190,1)', 0.5 + 0.5 * Math.sin(t + i));
    ctx.restore();
  }
  function scInsanity(lt, u, t) {
    const o = OFFX; o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.fillStyle = '#4a3020'; o.fillRect(0, 0, OFF.width, OFF.height);
    const saved = ctx; ctx = o;
    for (let y = 0; y < OFF.height; y += 90) for (let x = 0; x < OFF.width; x += 90) { const j = (x / 90 + y / 90) % 2; ctx.save(); ctx.translate(x + 45 + noise1(t * 0.5 + y, 2) * 8 * u, y + 45); ctx.rotate(t * 0.2 * u + j); leaf(0, 0, 40, 0, 1, 0, x * 7 + y, j ? '#6a4a2c' : '#5a3a20', 0.9); ctx.restore(); }
    ctx = saved; o.restore();
    rect(0, 0, W, H, '#2a1a10');
    ctx.save(); ctx.translate(W / 2, H / 2); const zoom = 1.4 + 0.3 * u;
    for (let k = 0; k < 8; k++) { ctx.save(); ctx.rotate(k * Math.PI / 4 + t * 0.08 * u); if (k % 2) ctx.scale(1, -1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1500, -Math.PI / 8, Math.PI / 8); ctx.closePath(); ctx.clip(); ctx.scale(zoom, zoom); ctx.globalAlpha = sm(prog(u, 0, 0.5)); ctx.drawImage(OFF, -OFF.width / 2, -OFF.height / 2); ctx.restore(); }
    ctx.restore();
    diplomaFrame(960, 520, 0.035 + u * 0.5 + Math.sin(t * 2) * 0.03 * u, 1);
    glow(960, 520, 900, 'rgba(120,60,140,0.3)', 0.6 * u);
  }
  function scSagan(lt, u, t) {
    const fly = sm(prog(u, 0.55, 1));
    ctx.save(); cam(lerp(1.0, 3.2, eIn(fly)), 0, 0);
    rect(-W, -H, W * 3, H * 3, '#16100c');
    // bed from above, open book
    rect(260, 120, 1400, 840, '#2a3a5a'); for (let i = 0; i < 14; i++) rect(260, 120 + i * 60, 1400, 4, 'rgba(0,0,0,0.25)');
    ctx.save(); ctx.translate(960, 560); ctx.rotate(-0.06);
    rect(-300, -200, 300, 400, '#e8e0cc'); rect(0, -200, 300, 400, '#f0e8d4'); rect(-4, -200, 8, 400, '#b8b0a0');
    scribbleLines(-270, -150, 230, 9, 34, 'rgba(40,30,20,0.5)', 5); scribbleLines(30, -150, 230, 9, 34, 'rgba(40,30,20,0.5)', 6);
    ctx.restore();
    glow(960, 560, 500, 'rgba(255,220,160,0.4)', 0.7);
    // planets rise off the pages
    const rise = prog(u, 0.15, 0.7);
    [[-180, '#c87a4a', true, 54], [140, '#6a9ac8', false, 40], [20, '#d8b878', false, 26], [260, '#a85a3a', false, 20]].forEach(([dx, col, ring, r], i) => { const k = clamp(rise * 1.4 - i * 0.12); planet(960 + dx, 560 - k * (260 + i * 60), r * (0.3 + 0.7 * k), col, ring, k); });
    ctx.restore();
    // the cosmos takes over
    if (fly > 0) { ctx.save(); ctx.globalAlpha = fly; rect(0, 0, W, H, '#03040a'); starfield(31, 700, 1, t, 0.02); galaxy(1100, 520, 520, t * 0.15, 1); planet(520, 760, 90, '#c87a4a', true, 1); ctx.restore(); }
  }
  function scCops(lt, u, t) {
    const red = Math.sin(t * 12) > 0;
    const collapse = sm(prog(u, 0.1, 0.55)), closed = prog(u, 0.55, 0.75);
    if (u < 0.55) { rect(0, 0, W, H, '#03040a'); starfield(31, 700, 1 - collapse, t, 0.02); ctx.save(); ctx.translate(1100, 520); ctx.scale(1 - collapse * 0.95, 1 - collapse * 0.95); ctx.translate(-1100, -520); galaxy(1100, 520, 520, t * 0.15 + collapse * 6, 1); ctx.restore(); }
    else {
      ctx.save(); cam(lerp(1.4, 1.0, closed)); rect(-W, -H, W * 3, H * 3, '#16100c'); rect(260, 120, 1400, 840, '#2a3a5a');
      ctx.save(); ctx.translate(960, 560); ctx.rotate(-0.06);
      rect(-290, -190, 600, 400, '#e8dcc0'); for (let i = 0; i < 6; i++) rect(-290, 196 - i * 3, 600, 1, '#b8ac90');
      rect(-300, -200, 600, 400, '#3a2a1a'); rect(-300, -200, 34, 400, '#2a1a10');
      ctx.strokeStyle = 'rgba(201,163,90,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(30, -10, 46, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(30, -10, 92, 20, -0.3, 0, Math.PI * 2); ctx.stroke();
      ctx.restore(); ctx.restore();
    }
    // red and blue through the blinds
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = red ? 'rgba(255,40,40,0.16)' : 'rgba(40,90,255,0.16)'; ctx.fillRect(0, 0, W, H);
    ctx.translate(W / 2, H / 2); ctx.rotate(-0.35); ctx.fillStyle = red ? 'rgba(255,50,50,0.16)' : 'rgba(50,100,255,0.16)';
    const off = ((t * 0.8) % 1) * 140; for (let i = -10; i < 10; i++) ctx.fillRect(-W, i * 140 + off, W * 2, 62);
    ctx.restore();
    const sweep = (t * 2.2) % 1; glow(sweep * W, 300, 700, red ? 'rgba(255,60,60,0.8)' : 'rgba(60,110,255,0.8)', 0.6);
  }
  function scConcrete(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.25, sm(u)));
    rect(-W, -H, W * 3, H * 3, '#2a2e2c');
    const vp = [960, 480];
    cinder(-W, -H, W * 3, H * 3, '#3a3f3c', 'rgba(0,0,0,0.25)');
    // corridor walls converge
    ctx.fillStyle = 'rgba(20,24,22,0.55)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(760, 360); ctx.lineTo(760, 620); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(1160, 360); ctx.lineTo(1160, 620); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    rect(760, 360, 400, 260, '#1e2220');
    ctx.fillStyle = '#4a4e48'; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(760, 620); ctx.lineTo(1160, 620); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a7a2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(960, H); ctx.lineTo(960, 620); ctx.stroke();
    // fluorescent tubes, one flickering
    for (let i = 0; i < 4; i++) { const v = i / 4, y = lerp(30, 340, v), w2 = lerp(500, 120, v); const fl = i === 2 ? (noise1(t * 14, 4) > 0.2 ? 1 : 0.15) : 1; rect(960 - w2 / 2, y, w2, 14 * (1 - v * 0.6), `rgba(220,240,230,${0.9 * fl})`); glow(960, y, w2 * 0.8, 'rgba(200,230,220,0.4)', fl * 0.6); }
    // posted rules
    ctx.save(); ctx.translate(380, 420); ctx.transform(1, 0.12, 0, 1, 0, 0); rect(-90, -130, 180, 250, '#e8e4d8'); scribbleLines(-70, -100, 140, 10, 22, 'rgba(30,30,30,0.7)', 13); ctx.restore();
    void vp; ctx.restore();
  }
  function scStaff(lt, u, t) {
    ctx.save(); cam(lerp(1.15, 1.0, sm(u)));
    cinder(-W, -H, W * 3, H * 3, '#3a3f3c', 'rgba(0,0,0,0.25)');
    rect(620, 140, 680, 940, '#5a6458'); rect(640, 160, 640, 920, '#6a7468');
    // wire-glass window onto a warm staff office
    ctx.save(); ctx.beginPath(); ctx.rect(760, 260, 400, 300); ctx.clip();
    skyGrad('#e0b070', '#a06a30'); glow(960, 380, 300, 'rgba(255,230,180,0.9)', 0.8);
    rect(820, 430, 280, 20, '#3a2414'); ctx.fillStyle = 'rgba(30,20,10,0.6)'; ctx.beginPath(); ctx.ellipse(1060, 400, 40, 50, 0, 0, Math.PI * 2); ctx.fill(); rect(1030, 430, 70, 90, 'rgba(30,20,10,0.6)');
    ctx.strokeStyle = 'rgba(40,40,40,0.55)'; ctx.lineWidth = 2; for (let k = -10; k < 20; k++) { ctx.beginPath(); ctx.moveTo(760 + k * 40, 260); ctx.lineTo(760 + k * 40 + 300, 560); ctx.stroke(); ctx.beginPath(); ctx.moveTo(760 + k * 40, 560); ctx.lineTo(760 + k * 40 + 300, 260); ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle = '#2a302a'; ctx.lineWidth = 14; ctx.strokeRect(760, 260, 400, 300);
    rect(1180, 620, 40, 120, '#2a2e2a');
    // key ring swinging on a hook beside the door
    const sw = Math.sin(lt * 3.2) * 0.4 * Math.exp(-lt * 0.25) + 0.05;
    ctx.save(); ctx.translate(1460, 520); rect(-6, -10, 12, 20, '#1a1a1a'); ctx.rotate(sw); ctx.strokeStyle = '#a8a8a0'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 60, 40, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 5; k++) { ctx.save(); ctx.translate(0, 60); ctx.rotate(-0.6 + k * 0.3); ctx.fillStyle = k % 2 ? '#c9a35a' : '#b8b8b0'; rect(-6, 36, 12, 70, ctx.fillStyle); rect(-14, 36, 28, 22, ctx.fillStyle); ctx.restore(); }
    ctx.restore(); glow(1460, 600, 120, 'rgba(255,240,200,0.6)', 0.3);
    ctx.restore();
  }
  function scLadder(lt, u, t) {
    const climb = sm(u);
    ctx.save(); ctx.translate(0, lerp(-600, 600, climb));
    cinder(-W, -H * 2, W * 3, H * 5, '#3a3f3c', 'rgba(0,0,0,0.25)');
    const lx0 = 820, lx1 = 1100;
    rect(lx0, -H * 1.5, 18, H * 4, '#d8c890'); rect(lx1, -H * 1.5, 18, H * 4, '#d8c890');
    for (let i = 0; i < 24; i++) { const y = 1600 - i * 120; if (i < 9) rect(lx0, y, lx1 - lx0 + 18, 16, '#d8c890'); else { ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#d8c890'; ctx.setLineDash([10, 14]); ctx.lineWidth = 3; ctx.strokeRect(lx0 + 18, y, lx1 - lx0 - 18, 16); ctx.restore(); } }
    ctx.restore();
    glow(960, 300, 700, 'rgba(200,230,220,0.25)', 0.6);
  }
  function scCage(lt, u, t) {
    const pull = sm(u);
    ctx.save(); cam(lerp(2.4, 1.0, pull));
    rect(-W, -H, W * 3, H * 3, '#2e3230');
    bed(560, 760, 800, '#1a1d1c', '#4a5a6a'); trashBag(920, 734, 0.85, 0.35);
    // window bar shadows fall across everything
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(20,24,30,0.75)';
    for (let i = -8; i < 16; i++) { ctx.beginPath(); ctx.moveTo(i * 150 + 300, -400); ctx.lineTo(i * 150 + 340, -400); ctx.lineTo(i * 150 - 260, H + 400); ctx.lineTo(i * 150 - 300, H + 400); ctx.closePath(); ctx.fill(); }
    for (let j = -4; j < 8; j++) { ctx.fillRect(-W, j * 260 + 60, W * 3, 26); }
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(200,220,240,0.10)'; ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore();
    ctx.restore();
  }
  function scAlmost2(lt, u, t) {
    ctx.save(); cam(1.05); cinder(-W, -H, W * 3, H * 3, '#262a28', 'rgba(0,0,0,0.3)'); ctx.restore();
    ctx.fillStyle = 'rgba(3,4,6,0.35)'; ctx.fillRect(0, 0, W, H);
    const beat = 0.6 + 0.4 * pulse(DOWN, t, 0.6);
    const items = [[SH.cap, 480, 420, 1.0], [SH.car, 1420, 420, 0.9], [SH.dog, 520, 900, 1.0], [SH.horse, 1380, 940, 1.15]];
    items.forEach(([shp, x, y, s], i) => { const p = prog(u, i * 0.2, i * 0.2 + 0.28); goldShape(shp, x, y, s, p, beat * (1 - 0.3 * prog(u, 0.9, 1)), 3); });
    glow(960, 540, 900, 'rgba(242,200,121,0.15)', beat * 0.6);
  }
  const ROOMS = [['#6a5a3a', '#4a6a8a', 0.2], ['#3a4a3a', '#8a4a4a', 0.75], ['#5a3a4a', '#6a6a4a', 0.4], ['#3a3a4a', '#4a5a3a', 0.85], ['#6a4a2a', '#3a4a6a', 0.15], ['#4a4a4a', '#6a3a3a', 0.6], ['#3a4a5a', '#7a6a3a', 0.3], ['#4a3a2a', '#4a6a5a', 0.7], ['#2e3230', '#4a5a6a', 0.5]];
  function scRooms(lt, u, t) {
    // one room per 5/4 bar; same trash bag on a different bed each time
    const i = Math.max(0, lastBefore(DOWN, t) - lastBefore(DOWN, SEC.br)) % ROOMS.length;
    const [wall, blanket, wx] = ROOMS[i];
    const lb = DOWN[lastBefore(DOWN, t)], nb = DOWN[lastBefore(DOWN, t) + 1] || lb + 2.55, k = prog(t, lb, nb);
    ctx.save(); cam(lerp(1.0, 1.08, k), lerp(-20, 20, k), 0);
    rect(-W, -H, W * 3, H * 3, wall);
    const r = rng(i * 31 + 5); if (i % 2) for (let x = -W; x < W * 2; x += 60) rect(x, -H, 3, H * 3, 'rgba(0,0,0,0.15)'); else for (let n = 0; n < 60; n++) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(r() * W, r() * 700, 10, 0, Math.PI * 2); ctx.fill(); }
    windowFrame(wx * 1400 + 100, 160, 320, 360, () => { skyGrad('#1a2a4a', '#0a1020'); moon(wx * 1400 + 260, 260, 18, 0.8); });
    rect(-W, 860, W * 3, 400, 'rgba(0,0,0,0.35)');
    const bx = 1000 - wx * 500; bed(bx, 820, 760, '#1a1614', blanket); trashBag(bx + 380, 794, 0.75, 0.35);
    ctx.restore();
    void lt; void u;
  }
  function scCosmos5(lt, u, t) {
    rect(0, 0, W, H, '#03040a'); starfield(41, 800, 1, t, 0.01); galaxy(960, 540, 640, t * 0.08, 0.7, 13, 1200);
    const bi = lastBefore(BEATS, t), b0 = BEATS.indexOf(BEATS.find((b) => b >= SEC.br - 0.01));
    for (let s = 0; s < 5; s++) {
      let last = -1; for (let i = bi; i >= Math.max(b0, bi - 10); i--) if (((i - b0) % 5 + 5) % 5 === s) { last = i; break; }
      const age = last >= 0 ? t - BEATS[last] : 99, rr = 160 + s * 80;
      for (let m = 0; m < 14; m++) { const a = m / 14 * Math.PI * 2 + t * 0.05 * (s % 2 ? 1 : -1); const wob = 14 * Math.exp(-age / 0.7) * Math.sin(age * 30 + m); glow(960 + Math.cos(a) * (rr + wob), 540 + Math.sin(a) * (rr + wob) * 0.55, 10 + 22 * Math.exp(-age / 0.5), 'rgba(242,200,121,0.95)', 0.3 + 0.7 * Math.exp(-age / 0.6)); }
    }
    goldShape(SH.horse, 960, 640, 1.1, prog(u, 0.45, 0.95), 0.6, 2);
  }
  function scRide(lt, u, t) {
    T0 = t;
    ctx.save(); cam(lerp(1.0, 1.35, sm(u)), lerp(0, -120, sm(u)), 0);
    prairieSky('#4a6aa0', '#f0c080', '#f09850', 1240, 640, 1);
    rect(-W, 740, W * 3, H, '#5a4a1e');
    grass(21, t, 720, 1100, 600, '#3a2e10', 1.3, 80);
    horse(1080, 830, 1.35, '#140a04', true);
    grass(22, t, 840, 1100, 300, '#2a200a', 1.3, 110);
    ctx.restore();
    // lens flare
    const fx = 1240, fy = 640; [[0.3, 60, 'rgba(255,200,140,0.25)'], [0.6, 30, 'rgba(160,200,255,0.2)'], [1.2, 90, 'rgba(255,180,120,0.12)']].forEach(([k, r, c]) => glow(lerp(fx, W / 2, k * 2) , lerp(fy, H / 2, k * 2), r, c, 0.8));
  }
  function scChance(lt, u, t) {
    ctx.save(); cam(lerp(1.0, 1.1, sm(u)));
    prairieSky('#2a3050', '#c07050', '#5a3a2a', 960, 820, 0.6);
    rect(-W, 780, W * 3, H, '#140e0a');
    trailer(960, 800, 0.9, 0.8, true);
    grass(31, t, 780, 1100, 300, '#0a0806', 1, 50);
    ctx.restore();
    // the almost, filling in with color for a moment, then falling back to lines
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
  }
  function scOutro(lt, u, t) {
    const night = sm(prog(t, SEC.out, SEC.out + 12));
    const lit = t < SEC.dark ? 1 : Math.exp(-(t - SEC.dark) / 0.12);
    ctx.save(); cam(lerp(1.0, 1.12, sm(u)), 0, lerp(0, 60, sm(u)));
    prairieSky(night > 0.5 ? '#060a18' : '#2a2a4a', night > 0.5 ? '#141a30' : '#a0604a', '#1a1010', 960, 860, 0.5 * (1 - night));
    ctx.fillStyle = `rgba(4,6,14,${night * 0.85})`; ctx.fillRect(-W, -H, W * 3, H * 3);
    starfield(61, 600, night, t, 0.004);
    // the almost-shapes rise into the sky as constellations
    const shapes = [[SH.house, 520, 380, 0.7], [SH.table, 980, 300, 0.55], [SH.swing, 1400, 360, 0.6], [SH.cap, 700, 560, 0.5], [SH.car, 1250, 560, 0.5], [SH.horse, 960, 720, 0.75]];
    shapes.forEach(([shp, x, y, s], i) => {
      const up = sm(prog(t, SEC.out + 2 + i * 1.5, SEC.out + 8 + i * 1.5)), yy = lerp(y + 500, y, up);
      const a = up * (1 - 0.5 * prog(t, SEC.dark, SEC.end - 2));
      shp.forEach((pl) => pl.forEach(([px, py]) => glow(x + px * s, yy + py * s, 9, 'rgba(255,240,210,1)', a)));
      ctx.save(); ctx.globalAlpha = 0.35; goldShape(shp, x, yy, s, up, a * 0.6, 1.2); ctx.restore();
    });
    rect(-W, 860, W * 3, H, '#040406');
    trailer(960, 870, 0.4, lit, true);
    grass(71, t, 860, 1100, 380, '#020203', 0.8, 50);
    ctx.restore();
    if (t > SEC.dark) { ctx.fillStyle = `rgba(1,2,5,${0.45 * prog(t, SEC.dark, SEC.dark + 1.5)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- the cut ----------
  function shot(a, b, fn, o) { SHOTS.push({ start: a, end: b, fn, o: o || {} }); }
  function buildShots() {
    shot(0, L.early, scDawn);
    shot(L.early, L.pastures, scBike);
    shot(L.pastures, L.horses, scTank);
    shot(L.horses, L.copan, scHorses);
    shot(L.copan, L.always, scTrailerNight, { zoom: 1.3 });
    shot(L.always, L.bruises, scHallway);
    shot(L.bruises, L.ch1, scKitchen);
    shot(L.ch1, SEC.v2 + 1.2, scAlmost1);
    shot(SEC.v2 + 1.2, L.insanity, scDiploma);
    shot(L.insanity, L.sagan, scInsanity);
    shot(L.sagan, L.cops, scSagan);
    shot(L.cops, L.concrete, scCops);
    shot(L.concrete, L.staff, scConcrete);
    shot(L.staff, L.privilege, scStaff);
    shot(L.privilege, L.hold, scLadder);
    shot(L.hold, L.ch2, scCage);
    shot(L.ch2, SEC.br, scAlmost2);
    shot(SEC.br, 165.5, scRooms);
    shot(165.5, L.ride, scCosmos5);
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
    OFF = document.createElement('canvas'); OFF.width = 900; OFF.height = 900; OFFX = OFF.getContext('2d');
    return { duration: DUR, sections: SEC, shots: SHOTS.map((s) => [s.fn.name, +s.start.toFixed(2), +s.end.toFixed(2)]) };
  }
  window.EP = {
    ready: null, render,
    setScale(s) { SCALE = s; cv.width = Math.round(W * s); cv.height = Math.round(H * s); },
    frame(t, q = 0.92) { render(t); return cv.toDataURL('image/jpeg', q); },
    get duration() { return DUR; },
  };
  window.EP.ready = init();
})();
