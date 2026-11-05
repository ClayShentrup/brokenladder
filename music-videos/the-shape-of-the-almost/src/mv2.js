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

  // ---------- the cutout figure rig ----------
  // o: s scale, face 1/-1, walk phase (radians, undefined = standing), run, armL/armR angles (0=down, PI/2 = forward), rim color, hair 'long'|'short',
  //    umbrella color, lean, sit, alpha, reach (0..1 extends front arm forward-up)
  function fig(x, y, o) {
    const s = o.s || 1, f = o.face || 1, rim = o.rim || null, a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0.01) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * f, s); ctx.globalAlpha *= a; ctx.rotate((o.lean || 0) * f);
    const ph = o.walk, walking = ph != null, run = o.run ? 1.6 : 1;
    const bob = walking ? Math.abs(Math.sin(ph)) * -6 * run : 0;
    ctx.translate(0, bob);
    const ink = '#04060a';
    const limb = (pts, w) => { ctx.strokeStyle = ink; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke(); };
    // legs
    const hip = [0, -92], legLen = 46;
    const off = (side) => (side > 0 ? 0 : Math.PI);
    const legAng = (side) => (walking ? Math.sin(ph + off(side)) * 0.55 * run : o.sit ? -1.4 : side * 0.06);
    const legPts = (side) => { const a1 = legAng(side), knee = [hip[0] + Math.sin(a1) * legLen, hip[1] + Math.cos(a1) * legLen]; const bend = walking ? Math.max(0, -Math.sin(ph + off(side))) * 0.9 * run : o.sit ? 1.5 : 0; const a2 = a1 - bend; return [hip, knee, [knee[0] + Math.sin(a2) * legLen, knee[1] + Math.cos(a2) * legLen]]; };
    limb(legPts(1), 15); limb(legPts(-1), 15);
    // torso + coat
    const torso = new Path2D(); torso.moveTo(-6, -172); torso.quadraticCurveTo(-24, -168, -22, -150); torso.quadraticCurveTo(-13, -122, -17, -86); torso.lineTo(17, -86); torso.quadraticCurveTo(13, -122, 22, -150); torso.quadraticCurveTo(24, -168, 6, -172); torso.closePath();
    limb([[0, -168], [1, -178]], 10);
    ctx.fillStyle = ink; ctx.fill(torso);
    if (o.hair === 'long') { const coat = new Path2D(); coat.moveTo(-20, -100); coat.quadraticCurveTo(-28, -70, -26 - (walking ? Math.sin(ph) * 4 : 0), -58); coat.lineTo(26, -58); coat.quadraticCurveTo(28, -70, 20, -100); coat.closePath(); ctx.fill(coat); }
    // head + hair
    ctx.beginPath(); ctx.ellipse(2, -190, 15, 17, 0, 0, Math.PI * 2); ctx.fill();
    if (o.hair === 'long') { const hp = new Path2D(); hp.moveTo(-14, -200); hp.quadraticCurveTo(-26, -170, -20 - (walking ? Math.sin(ph * 0.5) * 4 : 0), -150); hp.lineTo(-6, -158); hp.quadraticCurveTo(-8, -185, 4, -206); hp.closePath(); ctx.fill(hp); }
    else { ctx.beginPath(); ctx.ellipse(0, -199, 16, 10, -0.2, 0, Math.PI * 2); ctx.fill(); }
    // arms
    const sh = [0, -160], ua = 34, fa = 32;
    const armPts = (ang, bend) => { const e = [sh[0] + Math.sin(ang) * ua, sh[1] + Math.cos(ang) * ua]; const a2 = ang + bend; return [sh, e, [e[0] + Math.sin(a2) * fa, e[1] + Math.cos(a2) * fa]]; };
    const swing = walking ? Math.sin(ph) * 0.5 * run : 0;
    const aB = o.armB != null ? o.armB : -swing, aF = o.armF != null ? o.armF : (o.reach != null ? lerp(swing, 2.1, o.reach) : swing);
    limb(armPts(aB, walking ? 0.5 : 0.15), 11);
    limb(armPts(aF, o.reach ? lerp(0.4, 0.05, o.reach) : walking ? 0.6 : 0.15), 11);
    if (o.umbrella) {
      const hx = Math.sin(0.9) * ua, hy = -160 + Math.cos(0.9) * ua - 30;
      limb([[hx, hy + 30], [hx + 10, hy - 90]], 4);
      ctx.save(); ctx.translate(hx + 10, hy - 90);
      ctx.fillStyle = o.umbrella; ctx.beginPath(); ctx.moveTo(-90, 10); ctx.quadraticCurveTo(0, -70, 90, 10); for (let i = 3; i >= -3; i--) ctx.quadraticCurveTo(i * 30 + 15, 0, i * 30, 10); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
    // rim light (drawn as a soft colored edge glow behind the lit side)
    if (rim) glow(x + 10 * f * s, y - 130 * s, 70 * s, rim, 0.25 * a * (o.rimA || 1));
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

  // ---------- SCENES (lt = local time, u = 0..1 through shot, t = global time) ----------
  // intro: crane down over the night city to two facing windows
  function scIntro(lt, u, t) {
    skyGrad('#0d1626', '#04060a'); stars(5, 220, 0.6 * (1 - u * 0.5)); moon(1500, 210 + u * 120, 38, 1);
    const cam = sm(u);
    ctx.save(); ctx.translate(0, lerp(-200, 160, cam)); ctx.translate(W / 2, H / 2); ctx.scale(lerp(0.85, 1.35, cam), lerp(0.85, 1.35, cam)); ctx.translate(-W / 2, -H / 2);
    skyline(21, 980, [[300, 650, '#0b1018', 0.2, 0.12], [420, 820, '#080c12', 0.5, 0.18]], t, 20);
    // the two buildings, facing across an alley
    building(380, 300, 460, 800, 31, '#06080c', 0.06, { '2,3': C.lamp });
    building(1080, 260, 460, 840, 32, '#06080c', 0.06, { '1,3': '#a9c9e6' });
    ctx.restore();
  }
  // her room
  function scHerRoom(lt, u, t, o) {
    skyGrad('#6a4a2c', '#24170e');
    const push = sm(u) * 0.08; ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 + push, 1 + push); ctx.translate(-W / 2, -H / 2);
    windowFrame(1080, 160, 560, 560, () => { skyGrad('#2c4466', '#0e1626'); building(1150, 260, 420, 600, 32, '#05070b', 0.05, { '1,1': '#a9c9e6' }); });
    rect(0, 820, W, 260, '#120d09');
    lampShape(560, 820, 1.2, 1);
    const tip = plant(1180, 820, 1.25, 0.15 + 0.1 * u, [1400, 400], t);
    // her, watering the plant: arm tips the can rhythmically
    const pour = 0.5 + 0.5 * Math.sin(lt * 2.4);
    fig(900, 820, { s: 1.9, face: 1, rim: 'rgba(240,184,96,0.9)', hair: 'long', armF: 1.3 + pour * 0.4 });
    ctx.save(); ctx.translate(1010, 545 + pour * 10); ctx.rotate(0.3 + pour * 0.3); rect(-30, -22, 60, 44, '#1c140e'); rect(28, -12, 50, 8, '#1c140e'); ctx.restore();
    void tip; ctx.restore();
  }
  // his room (mirror geometry)
  function scHisRoom(lt, u, t) {
    skyGrad('#2d4462', '#0e1622');
    const push = sm(u) * 0.08; ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1 + push, 1 + push); ctx.translate(-W / 2, -H / 2);
    windowFrame(280, 160, 560, 560, () => { skyGrad('#3a2e40', '#120e14'); building(330, 260, 440, 600, 31, '#05070b', 0.05, { '2,1': C.lamp }); });
    rect(0, 820, W, 260, '#0a0d11');
    rect(1050, 640, 520, 22, '#1a120c'); rect(1080, 662, 16, 158, '#1a120c'); rect(1520, 662, 16, 158, '#1a120c');
    lampShape(1440, 640, 0.9, 0.85);
    // him, at the desk, writing; glances toward the window on the bar
    const glance = pulse(DOWN, t, 0.9);
    fig(1230, 820, { s: 1.9, face: -1, sit: true, rim: 'rgba(143,196,232,0.9)', armF: 1.5 + 0.1 * Math.sin(lt * 9), lean: -0.05 - glance * 0.12 });
    ctx.restore();
  }
  // diptych: both rooms side by side, mirrored gestures (both reach for the lamp switch on the same beat)
  function scDiptych(lt, u, t) {
    const reach = 0.5 + 0.5 * Math.sin(lt * Math.PI / (0.5108 * 4));
    [[0, '#6a4a2c', 'rgba(240,184,96,0.9)', 'long', 1], [W / 2, '#2d4462', 'rgba(143,196,232,0.9)', 'short', -1]].forEach(([x0, bg, rim, hair, face]) => {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, W / 2, H); ctx.clip();
      ctx.fillStyle = bg; ctx.fillRect(x0, 0, W / 2, H); rect(x0, 820, W / 2, 260, '#0d0a08');
      const lx = x0 + (face > 0 ? 700 : 260);
      lampShape(lx, 820, 1.1, 0.4 + 0.6 * reach);
      fig(x0 + (face > 0 ? 420 : 540), 820, { s: 1.8, face, rim, hair, reach });
      ctx.restore();
    });
    rect(W / 2 - 4, 0, 8, H, '#000');
  }
  // top-down: the alley between buildings; the two window lights stretch toward each other
  function scAlleyTop(lt, u, t) {
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(lerp(-0.08, 0.08, u)); ctx.scale(lerp(1, 1.15, u), lerp(1, 1.15, u)); ctx.translate(-W / 2, -H / 2);
    rect(-200, -200, W + 400, H + 400, '#1c2534');
    rect(-200, -200, 860, H + 400, '#05070a'); rect(1260, -200, 900, H + 400, '#05070a');
    // roof details
    const r = rng(9); for (let i = 0; i < 18; i++) { rect(r() * 600, r() * H, 40 + r() * 80, 30 + r() * 60, '#0a0d12'); rect(1300 + r() * 600, r() * H, 40 + r() * 80, 30 + r() * 60, '#0a0d12'); }
    const g = sm(u), gap = lerp(400, 22, g);
    const cy = 540;
    // light pools cast into the alley
    [[660, C.lamp, 1], [1260, '#a9c9e6', -1]].forEach(([x, col, dir]) => {
      const len = (600 - gap) / 2;
      const gr = ctx.createLinearGradient(x, 0, x + dir * len, 0); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, cy - 40); ctx.lineTo(x + dir * len, cy - 120); ctx.lineTo(x + dir * len, cy + 120); ctx.lineTo(x, cy + 40); ctx.closePath(); ctx.fill(); ctx.restore();
    });
    // a cat crosses, small
    const cx = lerp(800, 1150, prog(lt, 1, 6)); ctx.fillStyle = '#020305'; ctx.beginPath(); ctx.ellipse(cx, 820, 22, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx + 22, 814, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // time-lapse: stars wheel past the window while the plant grows
  function scTimelapse(lt, u, t) {
    skyGrad('#0a0f1a', '#040608');
    windowFrame(300, 120, 1320, 760, () => {
      skyGrad('#0d1626', '#060a12');
      ctx.save(); ctx.translate(960, 900); ctx.rotate(u * 1.2);
      const r = rng(4); for (let i = 0; i < 260; i++) { const a = r() * Math.PI * 2, d = 200 + r() * 1200; ctx.strokeStyle = `rgba(220,230,245,${0.15 + r() * 0.5})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, d, a, a + 0.12 + u * 0.4); ctx.stroke(); }
      ctx.restore();
      building(1080, 420, 420, 600, 32, '#04060a', 0.04, { '1,0': '#a9c9e6' });
    });
    rect(0, 880, W, 200, '#100b08');
    plant(720, 880, 1.6, lerp(0.25, 0.55, u), [1300, 450], t * 4);
  }
  // her wall: his window's light slides across; her hand enters it
  function scWallLight(lt, u, t) {
    rect(0, 0, W, H, '#4a3522');
    const sx = lerp(300, 1300, sm(u));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(sx, 0, sx + 500, 0); g.addColorStop(0, 'rgba(169,201,230,0)'); g.addColorStop(0.3, 'rgba(169,201,230,0.35)'); g.addColorStop(0.7, 'rgba(169,201,230,0.35)'); g.addColorStop(1, 'rgba(169,201,230,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, 180); ctx.lineTo(sx + 420, 220); ctx.lineTo(sx + 470, 800); ctx.lineTo(sx + 40, 760); ctx.closePath(); ctx.fill(); ctx.restore();
    // window-mullion shadow inside the light
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx + 220, 200, 14, 580); ctx.fillRect(sx + 20, 480, 450, 14);
    // her hand reaching into it, stopping at its edge
    const hx = lerp(-200, sx - 30, sm(prog(u, 0.2, 0.8)));
    ctx.fillStyle = '#04060a'; ctx.beginPath(); ctx.moveTo(-50, 560); ctx.quadraticCurveTo(hx - 200, 520, hx, 510); ctx.lineTo(hx + 60, 500); for (let i = 0; i < 4; i++) { ctx.lineTo(hx + 120 + i * 4, 492 + i * 16); ctx.lineTo(hx + 70, 502 + i * 16); } ctx.lineTo(hx, 580); ctx.quadraticCurveTo(hx - 200, 600, -50, 620); ctx.closePath(); ctx.fill();
  }
  // chorus forest run: tunnel of leaves; two runners flicker between trunks, never side by side
  function scForestRun(lt, u, t, o) {
    skyGrad('#3a5a34', '#0a140a');
    for (let i = 0; i < 5; i++) { const x0 = 200 + i * 380 + Math.sin(t * 0.3 + i) * 60; const g = ctx.createLinearGradient(x0, 0, x0 + 300, H); g.addColorStop(0, 'rgba(232,194,122,0.14)'); g.addColorStop(1, 'rgba(232,194,122,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 120, 0); ctx.lineTo(x0 + 520, H); ctx.lineTo(x0 + 300, H); ctx.closePath(); ctx.fill(); ctx.restore(); }
    forestLayers(t, 0.18 * (o.speed || 1), 55, 1, o.boost || 0);
    // trunks sweeping past
    const r = rng(66);
    for (let i = 0; i < 9; i++) { const ph = r(), x = ((ph * 2600 - t * 900 * (o.speed || 1)) % 2600 + 2600) % 2600 - 340; rect(x, 0, 60 + r() * 90, H, '#020403'); }
    const runY = 900, ph = t * 9;
    glow(lerp(380, 700, Math.sin(t * 0.7) * 0.5 + 0.5), runY - 150, 260, 'rgba(255,214,150,0.7)', 0.8); glow(lerp(1250, 1550, Math.cos(t * 0.6) * 0.5 + 0.5), runY - 130, 240, 'rgba(180,215,240,0.6)', 0.8);
    fig(lerp(380, 700, Math.sin(t * 0.7) * 0.5 + 0.5), runY, { s: 1.5, face: 1, walk: ph, run: true, rim: 'rgba(240,184,96,0.9)', hair: 'long' });
    fig(lerp(1250, 1550, Math.cos(t * 0.6) * 0.5 + 0.5), runY + 20, { s: 1.4, face: 1, walk: ph + 1.3, run: true, rim: 'rgba(143,196,232,0.9)' });
    for (let i = 0; i < 6; i++) { const r2 = rng(200 + i); glow(r2() * W, ((r2() * H + t * 120) % H), 30 + r2() * 50, 'rgba(232,194,122,0.6)', 0.4); }
  }
  // train: two ends of the same car; city lights streak past
  function scTrain(lt, u, t) {
    skyGrad('#3a4052', '#14161c');
    const sway = Math.sin(t * 3.1) * 6;
    ctx.save(); ctx.translate(0, sway);
    // windows with streaking lights
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 440; ctx.save(); ctx.beginPath(); ctx.rect(x, 230, 360, 300); ctx.clip(); rect(x, 230, 360, 300, '#1c2c46');
      const r = rng(70 + i); for (let k = 0; k < 30; k++) { const yy = 240 + r() * 280, xx = ((r() * 3000 - t * 2400) % 3000 + 3000) % 3000 - 500; const len = 80 + r() * 260; const g = ctx.createLinearGradient(x + xx, 0, x + xx + len, 0); const col = r() < 0.6 ? '232,194,122' : '169,201,230'; g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},0.8)`); ctx.fillStyle = g; ctx.fillRect(x + xx, yy, len, 3 + r() * 4); }
      ctx.restore();
      ctx.strokeStyle = '#020305'; ctx.lineWidth = 14; ctx.strokeRect(x, 230, 360, 300);
    }
    rect(0, 940, W, 140, '#0b0c10');
    for (let i = 0; i < 6; i++) rect(180 + i * 300, 120, 12, 820, '#0d1016');
    // strobe of tunnel lamps
    const strobe = Math.max(0, Math.sin(t * 7)) ** 8;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(232,194,122,${0.12 * strobe})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    // crowd between them, swaying
    const r = rng(81); for (let i = 0; i < 6; i++) fig(520 + i * 160 + r() * 40, 900, { s: 1.6 + r() * 0.2, face: r() < 0.5 ? 1 : -1, hair: r() < 0.5 ? 'long' : 'short', lean: Math.sin(t * 3.1 + i) * 0.04, alpha: 0.85 });
    fig(230, 900, { s: 1.75, face: -1, hair: 'long', rim: 'rgba(240,184,96,0.95)', armF: 2.6, lean: Math.sin(t * 3.1) * 0.04 });
    fig(1700, 900, { s: 1.75, face: 1, rim: 'rgba(143,196,232,0.95)', armF: 2.6, lean: Math.sin(t * 3.1 + 1) * 0.04 });
    ctx.restore();
  }
  // café: she leaves left as he arrives from the right and goes in
  function scCafe(lt, u, t) {
    skyGrad('#2e4466', '#121a28'); rect(0, 860, W, 220, '#08090c');
    rect(560, 250, 800, 610, '#0b0a08');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 300, 0, 860); g.addColorStop(0, 'rgba(242,200,121,0.75)'); g.addColorStop(1, 'rgba(242,200,121,0.4)'); ctx.fillStyle = g; ctx.fillRect(600, 320, 480, 420); ctx.restore();
    rect(1120, 380, 180, 480, '#3a2a1a');
    const door = Math.max(sm(prog(u, 0.05, 0.25)) * (1 - sm(prog(u, 0.3, 0.45))), sm(prog(u, 0.6, 0.72)) * (1 - sm(prog(u, 0.8, 0.95))));
    rect(1120, 380, 180 * (1 - door * 0.8), 480, '#1a120c');
    glow(1210, 600, 300, 'rgba(242,200,121,0.5)', door);
    const herX = u < 0.25 ? 1210 : lerp(1210, -200, prog(u, 0.25, 0.75));
    fig(herX, 880, { s: 1.6, face: -1, hair: 'long', walk: u > 0.25 ? t * 6 : undefined, rim: 'rgba(240,184,96,0.9)', alpha: u < 0.2 ? 0 : 1 });
    const hisX = lerp(2100, 1210, sm(prog(u, 0.45, 0.72)));
    fig(hisX, 880, { s: 1.65, face: -1, walk: u < 0.72 ? t * 6 + 2 : undefined, rim: 'rgba(143,196,232,0.9)', alpha: u > 0.85 ? 1 - prog(u, 0.85, 0.92) : 1 });
    rain(12, t, 160, 0.15, 900, 0.5);
  }
  // crossing escalators: she rises, he descends, they pass looking away
  function scEscalator(lt, u, t) {
    skyGrad('#4a5468', '#1a1e28');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 8; i++) { ctx.fillStyle = 'rgba(169,201,230,0.06)'; ctx.fillRect(0, i * 140, W, 4); } ctx.restore();
    const band = (x0, y0, x1, y1, col) => { ctx.strokeStyle = col; ctx.lineWidth = 120; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 6; for (let k = 0; k < 20; k++) { const v = ((k / 20 + t * 0.2) % 1); const px = lerp(x0, x1, v), py = lerp(y0, y1, v); ctx.beginPath(); ctx.moveTo(px - 40, py - 50); ctx.lineTo(px + 40, py + 50); ctx.stroke(); } };
    band(100, 1000, 1820, 120, '#7a8496'); band(100, 120, 1820, 1000, '#6a7486');
    const v1 = lerp(0.15, 0.85, u), v2 = lerp(0.15, 0.85, u);
    fig(lerp(100, 1820, v1), lerp(1000, 120, v1) - 40, { s: 1.1, face: 1, hair: 'long', rim: 'rgba(240,184,96,0.9)' });
    fig(lerp(1820, 100, v2), lerp(1000, 120, v2) - 40, { s: 1.1, face: -1, rim: 'rgba(143,196,232,0.9)', lean: 0.05 });
    glow(960, 560, 160, 'rgba(255,255,255,0.4)', Math.exp(-Math.abs(u - 0.5) * 18) * 0.8);
  }
  // elevator: doors close on her as he rounds the corner
  function scElevator(lt, u, t) {
    skyGrad('#3e4656', '#16181e'); rect(0, 900, W, 180, '#07080a');
    rect(660, 220, 600, 680, '#1d1a14');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(242,200,121,0.6)'; ctx.fillRect(680, 240, 560, 660); ctx.restore();
    fig(960, 900, { s: 2, face: 1, hair: 'long', rim: 'rgba(240,184,96,1)' });
    const close = sm(prog(u, 0.15, 0.85)), gap = lerp(560, 4, close);
    rect(660, 220, (600 - gap) / 2, 680, '#2a2f38'); rect(660 + (600 + gap) / 2, 220, (600 - gap) / 2, 680, '#2a2f38');
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(660 + (600 - gap) / 2 - 4, 220, 4, 680); ctx.fillRect(660 + (600 + gap) / 2, 220, 4, 680);
    fig(lerp(2100, 1560, sm(prog(u, 0.4, 0.9))), 960, { s: 2.2, face: -1, walk: u < 0.9 ? t * 7 : undefined, run: true, rim: 'rgba(143,196,232,1)', reach: prog(u, 0.75, 0.95) });
  }
  // top-down rain ballet: umbrellas flow across a crosswalk; gold and blue pass a hair apart
  function scUmbrellas(lt, u, t) {
    skyGrad('#2a3242', '#161a22');
    for (let i = 0; i < 9; i++) rect(i * 220 + 40, 360, 120, 360, 'rgba(200,205,215,0.12)');
    const r = rng(91);
    for (let i = 0; i < 40; i++) { const lane = r(), dir = r() < 0.5 ? 1 : -1, sp = 120 + r() * 120; const x = ((r() * 2400 + dir * t * sp) % 2400 + 2400) % 2400 - 240, y = 150 + lane * 780; ctx.fillStyle = r() < 0.5 ? '#14171d' : '#1b1f27'; ctx.beginPath(); ctx.arc(x, y, 55 + r() * 25, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 60, y + Math.sin(a) * 60); ctx.stroke(); } }
    const pass = sm(u);
    const umb = (x, y, col, glowCol) => { glow(x, y, 160, glowCol, 0.5); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 72, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 0.3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 72, y + Math.sin(a) * 72); ctx.stroke(); } };
    umb(lerp(-120, 2040, pass), 532, '#b58a3e', 'rgba(240,184,96,0.6)');
    umb(lerp(2040, -120, pass), 548 + 150 - 4, '#3f6f93', 'rgba(143,196,232,0.6)');
    // ripples
    for (let i = 0; i < 30; i++) { const r2 = rng(300 + i), cyc = (t * 1.3 + r2()) % 1; ctx.strokeStyle = `rgba(190,205,225,${0.35 * (1 - cyc)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(r2() * W, r2() * H, 6 + cyc * 40, 3 + cyc * 20, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  // slow-motion crosswalk: everyone else rushes; the two move slowly, passing
  function scCrowd(lt, u, t) {
    skyGrad('#5a6a88', '#1c2230'); rect(0, 880, W, 200, '#0b0c0f');
    skyline(44, 880, [[420, 760, '#2a3244', 0.1, 0.15]], t, 5);
    const r = rng(15);
    for (let i = 0; i < 26; i++) { const dir = r() < 0.5 ? 1 : -1, sp = 500 + r() * 400, x = ((r() * 2600 + dir * t * sp) % 2600 + 2600) % 2600 - 340; fig(x, 900 + r() * 40, { s: 1.4 + r() * 0.3, face: dir, walk: t * 14 + r() * 6, hair: r() < 0.5 ? 'long' : 'short', alpha: 0.55 }); }
    fig(lerp(300, 1300, u), 930, { s: 1.75, face: 1, walk: t * 1.6, hair: 'long', rim: 'rgba(240,184,96,1)' });
    fig(lerp(1620, 620, u), 940, { s: 1.8, face: -1, walk: t * 1.6 + 1, rim: 'rgba(143,196,232,1)' });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.03)'; for (let i = 0; i < 12; i++) ctx.fillRect(r() * W, 0, 3, H); ctx.restore();
  }
  // Gondry loop: three stacked bands of the same street, each delayed; she walks top band, he bottom band, bands slide together
  function scLoop(lt, u, t) {
    rect(0, 0, W, H, '#050608');
    const bands = 3, bh = H / bands, merge = sm(prog(u, 0.55, 1));
    for (let b = 0; b < bands; b++) {
      const y0 = b * bh + (b - 1) * -merge * bh * 0.3;
      ctx.save(); ctx.beginPath(); ctx.rect(0, b * bh, W, bh); ctx.clip(); ctx.translate(0, b * bh);
      const delay = b * 0.8, tt = t - delay;
      skyGrad(['#4a5a7a', '#5a4a6a', '#3a5a6a'][b], '#141822'); rect(0, bh - 70, W, 70, '#0b0c0f');
      ctx.save(); ctx.scale(1, bh / H); skyline(44 + b, H - 70 * H / bh, [[300, 700, '#0a0d12', 0.2, 0.15]], tt, 80); ctx.restore();
      if (b === 0) fig(((tt * 160) % (W + 400)) - 200, bh - 60, { s: 0.75, face: 1, walk: tt * 6, hair: 'long', rim: 'rgba(240,184,96,1)' });
      if (b === 2) fig(W + 200 - ((tt * 160) % (W + 400)), bh - 60, { s: 0.75, face: -1, walk: tt * 6, rim: 'rgba(143,196,232,1)' });
      if (b === 1) { fig(((tt * 160) % (W + 400)) - 200, bh - 60, { s: 0.75, face: 1, walk: tt * 6, hair: 'long', alpha: 0.35 }); fig(W + 200 - ((tt * 160) % (W + 400)), bh - 60, { s: 0.75, face: -1, walk: tt * 6, alpha: 0.35 }); }
      ctx.restore();
      void y0;
      rect(0, (b + 1) * bh - 3, W, 6, '#000');
    }
  }
  // kaleidoscope forest (chorus 2): drawn offscreen, mirrored in six wedges; a vine grows between two figures at the center
  function scKaleido(lt, u, t) {
    const o = OFFX; o.save(); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, OFF.width, OFF.height);
    const saved = ctx; ctx = o; ctx.translate(OFF.width / 2, OFF.height / 2); ctx.rotate(t * 0.15);
    const r = rng(17); for (let i = 0; i < 26; i++) { const d = 60 + r() * 520, a = r() * Math.PI * 2 + t * 0.1 * (r() - 0.5); leaf(Math.cos(a) * d, Math.sin(a) * d, 40 + r() * 120, a + t * 0.3, 1, 0.4 + 0.6 * pulse(DOWN, t, 0.4), Math.floor(r() * 1e6), [C.green, C.green2, C.moss][i % 3], 1); }
    for (let i = 0; i < 10; i++) glow(r() * 600 - 300, r() * 600 - 300, 40, 'rgba(232,194,122,0.8)', 0.6);
    ctx = saved; o.restore();
    rect(0, 0, W, H, '#040805');
    ctx.save(); ctx.translate(W / 2, H / 2); const zoom = 1.6 + 0.08 * pulse(DOWN, t, 0.3);
    for (let k = 0; k < 6; k++) { ctx.save(); ctx.rotate(k * Math.PI / 3); if (k % 2) ctx.scale(1, -1); ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1400, -Math.PI / 6, Math.PI / 6); ctx.closePath(); ctx.clip(); ctx.scale(zoom, zoom); ctx.drawImage(OFF, -OFF.width / 2, -OFF.height / 2); ctx.restore(); }
    ctx.restore();
    glow(W / 2, H / 2 + 60, 420, 'rgba(255,220,160,0.7)', 0.8);
    const g = sm(u), gap = lerp(240, 16, g);
    [[-1, 'rgba(240,184,96,1)', 'long'], [1, 'rgba(143,196,232,1)', 'short']].forEach(([side, rim, hair]) => fig(W / 2 + side * (gap / 2 + 130), 860, { s: 2.1, face: -side, hair, reach: g }));
    // vine between them
    const pts = []; for (let i = 0; i <= 30; i++) { const v = i / 30; pts.push([lerp(W / 2 - 360, W / 2 - gap / 2, v), 520 + Math.sin(v * 9 + t * 2) * 14 * (1 - v)]); }
    charcoal(pts, 4, C.moss, sm(prog(u, 0.1, 0.4)), 4040);
    const pts2 = pts.map(([x, y]) => [W - x, y]); charcoal(pts2, 4, C.moss, sm(prog(u, 0.1, 0.4)), 4041);
    glow(W / 2, 520, 70, 'rgba(255,230,180,0.9)', 0.7 * g);
  }
  // bridge: a string of lights across the alley; motes pluck in fives
  function scStringLights(lt, u, t, o) {
    skyGrad('#1c2a46', '#070a12'); stars(6, 160, 0.6); moon(380, 200, 26, 0.8);
    const cam = o.orbit ? sm(u) : 0;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(lerp(1, 1.25, cam), lerp(1, 1.25, cam)); ctx.rotate(lerp(0, -0.06, cam)); ctx.translate(-W / 2, -H / 2);
    rect(0, 0, 420, H, '#05070b'); rect(1500, 0, 420, H, '#05070b');
    rect(250, 360, 150, 190, C.lamp); glow(325, 455, 260, 'rgba(242,200,121,0.5)', 0.8);
    rect(1520, 340, 150, 190, '#a9c9e6'); glow(1595, 435, 260, 'rgba(169,201,230,0.45)', 0.8);
    fig(325, 545, { s: 0.6, face: 1, hair: 'long', reach: 0.6 }); fig(1595, 525, { s: 0.6, face: -1, reach: 0.6 });
    const bi = lastBefore(BEATS, t), b0 = BEATS.indexOf(BEATS.find((b) => b >= SEC.br - 0.01));
    for (let s = 0; s < 5; s++) {
      let last = -1; for (let i = bi; i >= Math.max(b0, bi - 10); i--) if (((i - b0) % 5 + 5) % 5 === s) { last = i; break; }
      const age = last >= 0 ? t - BEATS[last] : 99, amp = 20 * Math.exp(-age / 0.7);
      const y0 = 470 + s * 14, sag = 120 + s * 40, pts = [];
      for (let i = 0; i <= 50; i++) { const v = i / 50; pts.push([lerp(400, 1520, v), y0 + Math.sin(v * Math.PI) * sag + Math.sin(v * Math.PI) * amp * Math.sin(age * 34 + i * 0.1)]); }
      charcoal(pts, 1.6, '#2a2420', 0.9, 1300 + s, 2);
      for (let m = 1; m < 12; m++) { const p = pts[Math.round(m / 12 * 50)]; glow(p[0], p[1], 18 + 26 * Math.exp(-age / 0.5), s % 2 ? 'rgba(242,200,121,0.95)' : 'rgba(255,226,170,0.95)', 0.35 + 0.65 * Math.exp(-age / 0.6)); }
    }
    ctx.restore();
  }
  // bridge, second half: the lights lift off the wire and drift up into a constellation shaped like a leaf
  function scConstellation(lt, u, t) {
    skyGrad('#081020', '#020306');
    const r = rng(23), N = 120;
    for (let i = 0; i < N; i++) {
      const v = i / N, a = v * Math.PI * 2;
      const half = v < 0.5 ? 1 : -1, w2 = v < 0.5 ? v * 2 : (v - 0.5) * 2, pp = bez3([0, 0], [0.25, -0.55 * half], [0.75, -0.5 * half], [1, 0], half > 0 ? w2 : 1 - w2);
      const lx = 440 + pp[0] * 1040, ly = 470 + pp[1] * 620;
      const sx = lerp(400, 1520, r()), sy = 600 + r() * 160;
      const k = sm(prog(u, 0.05 + r() * 0.3, 0.55 + r() * 0.3));
      const x = lerp(sx, lx, k) + Math.sin(t + i) * 4, y = lerp(sy, ly, k) + Math.cos(t * 1.3 + i) * 4;
      const pl = pulse(BEATS, t, 0.5) * ((i % 5) === (lastBefore(BEATS, t) % 5) ? 1 : 0.2);
      glow(x, y, 16 + 24 * pl, 'rgba(242,200,121,0.95)', 0.5 + 0.5 * pl);
    }
    // midrib
    ctx.save(); ctx.globalAlpha = 0.25 * sm(prog(u, 0.6, 0.9)); charcoal([[440, 470], [1480, 470]], 2, C.gold2, 1, 7070, 2); ctx.restore();
    fig(960, 1040, { s: 0.55, face: 1, hair: 'long', reach: 0.9, rim: 'rgba(240,184,96,1)', alpha: sm(prog(u, 0.4, 0.7)) });
  }
  // final chorus: intercut journeys (A = her, B = him)
  function scRunHer(lt, u, t) {
    skyGrad('#f0b060', '#7a3a14'); glow(1500, 620, 500, 'rgba(255,220,150,0.8)', 0.8); skyline(61, 1080, [[120, 330, '#2a1408', 0.3, 0.1], [80, 220, '#120804', 1, 0.08]], t, 600);
    rect(0, 930, W, 30, '#060302'); for (let i = 0; i < 24; i++) rect(((i * 120 - t * 900) % 2880 + 2880) % 2880 - 240, 960, 10, 130, '#060302');
    fig(860, 945, { s: 2.4, face: 1, walk: t * 11, run: true, hair: 'long' });
    for (let i = 0; i < 20; i++) { const r = rng(500 + i); ctx.fillStyle = 'rgba(242,200,121,0.25)'; ctx.fillRect(((r() * W - t * 1800) % W + W) % W, r() * H, 120 + r() * 200, 2); }
  }
  function scRunHim(lt, u, t) {
    skyGrad('#7aaad6', '#1e3454'); moon(420, 260, 34, 0.9); skyline(62, 1080, [[120, 330, '#162238', 0.3, 0.1], [80, 220, '#0a1220', 1, 0.08]], -t, 600);
    rect(0, 930, W, 30, '#03050a'); for (let i = 0; i < 24; i++) rect(((i * 120 + t * 900) % 2880 + 2880) % 2880 - 240, 960, 10, 130, '#03050a');
    fig(1060, 945, { s: 2.4, face: -1, walk: t * 11 + 1, run: true });
    for (let i = 0; i < 20; i++) { const r = rng(600 + i); ctx.fillStyle = 'rgba(169,201,230,0.25)'; ctx.fillRect(W - ((r() * W - t * 1800) % W + W) % W, r() * H, 120 + r() * 200, 2); }
  }
  // arrival: split screen — she at his door, he at hers. Both knock. Nobody home.
  function scArrive(lt, u, t) {
    [[0, '#2d4462', 'rgba(240,184,96,1)', 'long', 1], [W / 2, '#6a4a2c', 'rgba(143,196,232,1)', 'short', -1]].forEach(([x0, bg, rim, hair, face]) => {
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, W / 2, H); ctx.clip(); rect(x0, 0, W / 2, H, bg); rect(x0, 900, W / 2, 180, '#07080a');
      const dx = x0 + (face > 0 ? 640 : 320); rect(dx - 110, 300, 220, 600, '#20170f'); ctx.fillStyle = '#c9a35a'; ctx.beginPath(); ctx.arc(dx + (face > 0 ? -80 : 80), 620, 9, 0, Math.PI * 2); ctx.fill();
      const knock = Math.max(0, Math.sin(lt * Math.PI * 2 / 0.5108)) * (u < 0.7 ? 1 : 0);
      fig(dx - face * 230, 900, { s: 1.9, face, hair, rim, armF: 1.9 + knock * 0.25 });
      ctx.restore();
    });
    rect(W / 2 - 4, 0, 8, H, '#000');
  }
  // the hands: two silhouette hands reach across the frame and stop a hair apart; light gathers in the gap
  function hand(x, y, s, side, spread) {
    ctx.save(); ctx.translate(x, y); ctx.scale(side * s, s); ctx.fillStyle = '#05070a';
    ctx.beginPath(); ctx.moveTo(-900, 40); ctx.quadraticCurveTo(-400, 10, -120, 0); ctx.lineTo(-40, -30);
    const fingers = [[-10, -46, 120], [0, -20, 140], [-5, 6, 130], [-20, 30, 105]];
    fingers.forEach(([fx, fy, len], i) => { const a = (i - 1.5) * 0.08 * spread; ctx.lineTo(fx, fy - 9); ctx.lineTo(fx + Math.cos(a) * len, fy - 9 + Math.sin(a) * len); ctx.lineTo(fx + Math.cos(a) * len, fy + 9 + Math.sin(a) * len); ctx.lineTo(fx, fy + 9); });
    ctx.lineTo(-60, 60); ctx.quadraticCurveTo(-30, 90, 20, 80); ctx.lineTo(-100, 70); ctx.quadraticCurveTo(-400, 90, -900, 110); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function scHands(lt, u, t) {
    skyGrad('#4a6a3a', '#10200e');
    forestLayers(t, 0.05, 91, 0.6, 0.6);
    glow(W / 2, 545, 900, 'rgba(255,214,150,0.55)', 0.9);
    const g = sm(u), gap = lerp(700, 10, g);
    const tipL = W / 2 - gap / 2, tipR = W / 2 + gap / 2;
    hand(tipL - 140, 560, 1.3, 1, 1);
    hand(tipR + 140, 545, 1.3, -1, 1);
    glow(W / 2, 545, 180 + 120 * g, 'rgba(255,226,170,0.9)', 0.4 + 0.6 * g + 0.3 * pulse(DOWN, t, 0.4));
    glow(tipL, 545, 40, 'rgba(240,184,96,0.9)', 0.6); glow(tipR, 545, 40, 'rgba(143,196,232,0.9)', 0.6);
  }
  // outro: her window again; the plant has grown along the sill toward his lit window; his light goes out just before the leaf reaches it
  function scOutro(lt, u, t) {
    skyGrad('#3a2c22', '#0e0a08');
    const lit = t < SEC.dark ? 1 : Math.exp(-(t - SEC.dark) / 0.12);
    windowFrame(560, 120, 1000, 760, () => {
      skyGrad('#24385a', '#0a1020'); moon(1380, 260, 24, 0.9);
      building(640, 330, 840, 640, 32, '#04060a', 0.03, {});
      const wx = 1120, wy = 430; rect(wx, wy, 160, 200, `rgba(169,201,230,${0.15 + 0.75 * lit})`); glow(wx + 80, wy + 100, 320, 'rgba(169,201,230,0.6)', 0.7 * lit);
    });
    rect(0, 880, W, 200, '#0b0908');
    const target = [1200, 530];
    const grow = lerp(0.82, 0.99, sm(prog(t, SEC.out, SEC.dark)));
    const tip = plant(520, 880, 1.6, grow, target, t, lit);
    if (t > SEC.dark) { glow(tip[0], tip[1], 220, 'rgba(127,149,184,0.5)', 0.35 * prog(t, SEC.dark + 0.8, SEC.coda) * (1 - prog(t, SEC.end - 6, SEC.end - 1))); ctx.fillStyle = `rgba(2,3,6,${0.55 * prog(t, SEC.dark, SEC.dark + 1.2)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---------- the cut ----------
  function buildShots() {
    seq(0, SEC.v1, [[99, scIntro]]);
    seq(SEC.v1, SEC.c1, [[4, scHerRoom], [4, scHisRoom], [4, scDiptych], [4, scAlleyTop], [4, scTimelapse], [99, scWallLight]]);
    seq(SEC.c1, SEC.v2, [[99, scForestRun, { speed: 1 }]]);
    seq(SEC.v2, SEC.c2, [[4, scTrain], [4, scCafe], [2, scEscalator], [2, scElevator], [4, scUmbrellas], [4, scCrowd], [99, scLoop]]);
    seq(SEC.c2, SEC.br, [[99, scKaleido]]);
    seq(SEC.br, SEC.c3, [[8, scStringLights, { orbit: true }], [99, scConstellation]]);
    seq(SEC.c3, SEC.out, [[1, scRunHer], [1, scRunHim], [1, scRunHer], [1, scRunHim], [2, scArrive], [99, scHands]]);
    seq(SEC.out, SEC.end, [[999, scOutro]]);
  }

  // ---------- frame ----------
  function render(t) {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    let k = SHOTS.findIndex((s) => t >= s.start && t < s.end); if (k < 0) k = SHOTS.length - 1;
    const sh = SHOTS[k], lt = t - sh.start, u = clamp(lt / Math.max(0.01, sh.end - sh.start));
    // chorus beat punch
    const inChorus = (t >= SEC.c1 && t < SEC.v2) || (t >= SEC.c2 && t < SEC.br) || (t >= SEC.c3 && t < SEC.out);
    const punch = inChorus ? 0.035 * pulse(DOWN, t, 0.25) : 0;
    const drift = 1 + 0.006 * Math.sin(t * 2 * Math.PI / (0.5108 * 8));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(drift + punch, drift + punch); ctx.translate(-W / 2, -H / 2);
    ctx.fillStyle = '#000'; ctx.fillRect(-W, -H, W * 3, H * 3);
    sh.fn(lt, u, t, sh.o);
    ctx.restore();
    // section-start flash, and a soft dip on every other cut
    const secStarts = [SEC.c1, SEC.c2, SEC.c3];
    secStarts.forEach((s0) => { const d = t - s0; if (d >= 0 && d < 0.6) { ctx.fillStyle = `rgba(255,236,200,${0.55 * (1 - d / 0.6)})`; ctx.fillRect(0, 0, W, H); } });
    if (lt < 0.25 && k > 0) { ctx.fillStyle = `rgba(0,0,0,${0.5 * (1 - lt / 0.25)})`; ctx.fillRect(0, 0, W, H); }
    // texture: paper, vignette, grain, flicker
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.4; ctx.drawImage(PAPER, 0, 0); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // light leak drifting through choruses
    if (inChorus) glow(W * (0.5 + 0.5 * Math.sin(t * 0.4)), H * 0.2, 700, 'rgba(255,140,60,0.25)', 0.6);
    const gi = Math.floor(t * 24) % GRAIN.length;
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.3; ctx.drawImage(GRAIN[gi], 0, 0, W, H); ctx.restore();
    const fl = 0.035 * noise1(t * 9, 9); if (fl > 0) { ctx.fillStyle = `rgba(0,0,0,${fl})`; ctx.fillRect(0, 0, W, H); }
    // letterbox in verse 2 (the city montage)
    if (t >= SEC.v2 && t < SEC.c2) { const lb = 110 * sm(prog(t, SEC.v2, SEC.v2 + 0.6)) * (1 - sm(prog(t, SEC.c2 - 0.4, SEC.c2))); rect(0, 0, W, lb, '#000'); rect(0, H - lb, W, lb, '#000'); }
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
