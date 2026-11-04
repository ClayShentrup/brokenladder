// "The Shape of the Almost" — Broken Ladder. Generative music video.
// Every frame is a pure function of time t. No text anywhere.
'use strict';
(function () {
  const W = 1920, H = 1080;
  const C = {
    night: '#0a0e15', night2: '#121a26', ink: '#07090d', umber: '#4a3424', umber2: '#6b4a30',
    green: '#2f4a2c', green2: '#3f6038', green3: '#1d2f1d', moss: '#5d7a45',
    gold: '#c9a35a', gold2: '#e8c27a', lamp: '#f2c879', ember: '#ff9a4a', moon: '#7f95b8',
  };
  let cv, ctx, A, BEATS = [], DOWN = [], SEC, PAPER, GRAIN = [], SCALE = 1, DUR;

  // ---------- utils ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const sm = (u) => u * u * (3 - 2 * u);
  const eOut = (u) => 1 - Math.pow(1 - u, 3);
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; const h = (n) => { const s = Math.sin((n + seed * 57.13) * 127.1) * 43758.5453; return s - Math.floor(s); }; return lerp(h(i), h(i + 1), sm(f)) * 2 - 1; }
  const rmsAt = (t) => { const r = A.rms_per_sec; const i = clamp(Math.floor(t), 0, r.length - 1); const j = Math.min(i + 1, r.length - 1); return lerp(r[i], r[j], t - Math.floor(t)) * 1000; };

  // ---------- timing ----------
  function buildTiming() {
    const hb = A.beats; // half-time beats from analysis
    const full = [];
    for (let i = 0; i < hb.length; i++) { full.push(hb[i]); if (i + 1 < hb.length) full.push((hb[i] + hb[i + 1]) / 2); }
    const per = 0.5108;
    // extend grid to the whole song
    while (full[0] - per > 0) full.unshift(full[0] - per);
    while (full[full.length - 1] + per < A.duration) full.push(full[full.length - 1] + per);
    BEATS = full;
    const near = (x) => BEATS.reduce((b, v) => (Math.abs(v - x) < Math.abs(b - x) ? v : b), BEATS[0]);
    SEC = {
      v1: near(16.5), c1: near(65.6), v2: near(80.6), c2: near(130.6), br: near(145.1),
      c3: near(184.6), out: near(201.6), dark: 219.4, coda: 226.0, end: A.duration,
    };
    // downbeats: 4/4 everywhere, anchored on chorus 1; 5/4 in the bridge, anchored on its start
    const idx = (x) => BEATS.indexOf(near(x));
    const a = idx(SEC.c1), b0 = idx(SEC.br), b1 = idx(SEC.c3);
    BEATS.forEach((bt, i) => {
      if (bt >= SEC.br - 0.01 && bt < SEC.c3 - 0.01) { if ((i - b0) % 5 === 0) DOWN.push(bt); }
      else if (bt >= SEC.c3 - 0.01) { if ((i - b1) % 4 === 0) DOWN.push(bt); }
      else if (((i - a) % 4 + 4) % 4 === 0) DOWN.push(bt);
    });
  }
  const lastBefore = (arr, t) => { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
  // 0..1 envelope that spikes on beat and decays
  const pulse = (arr, t, decay = 0.35) => { const i = lastBefore(arr, t); if (i < 0) return 0; return Math.exp(-(t - arr[i]) / decay); };
  // chorus mix (room -> understory), eased over 2 bars around boundaries
  function chorusMix(t) {
    const bar = 4 * 0.5108;
    const seg = (a, b) => sm(prog(t, a - bar * 0.5, a + bar * 0.5)) * (1 - sm(prog(t, b - bar * 0.5, b + bar * 0.5)));
    return Math.max(seg(SEC.c1, SEC.v2), seg(SEC.c2, SEC.br), seg(SEC.c3, SEC.out + 2));
  }
  const bridgeMix = (t) => sm(prog(t, SEC.br - 1, SEC.br + 1.5)) * (1 - sm(prog(t, SEC.c3 - 1.2, SEC.c3 + 0.4)));
  const finalScale = (t) => sm(prog(t, SEC.c3 - 1, SEC.c3 + 3)) * (1 - sm(prog(t, SEC.out, SEC.out + 4)));

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

  // ---------- drawing primitives (charcoal) ----------
  function charcoal(pts, width, color, alpha, seed, passes = 4) {
    const r = rng(seed);
    ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let p = 0; p < passes; p++) {
      ctx.globalAlpha = alpha * (0.35 + r() * 0.4); ctx.lineWidth = width * (0.5 + r() * 0.7);
      const ox = (r() - 0.5) * width * 0.6, oy = (r() - 0.5) * width * 0.6;
      ctx.beginPath(); pts.forEach(([x, y], i) => { const jx = x + ox + (r() - 0.5) * width * 0.3, jy = y + oy + (r() - 0.5) * width * 0.3; i ? ctx.lineTo(jx, jy) : ctx.moveTo(jx, jy); }); ctx.stroke();
    }
    ctx.restore();
  }
  function glow(x, y, r, color, a) {
    if (a <= 0.001) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  // heart-shaped (pothos) leaf; unfurl 0..1 curls it closed; rim = lit edge strength
  function leaf(x, y, size, ang, unfurl, rim, seed, fill = C.green, alpha = 1) {
    if (size < 1 || alpha <= 0.01) return;
    const u = eOut(clamp(unfurl)), wdt = lerp(0.12, 1, u), s = size * lerp(0.45, 1, u);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= alpha;
    const path = new Path2D();
    path.moveTo(0, 0);
    path.bezierCurveTo(s * 0.25, -s * 0.55 * wdt, s * 0.75, -s * 0.5 * wdt, s, 0);
    path.bezierCurveTo(s * 0.75, s * 0.5 * wdt, s * 0.25, s * 0.55 * wdt, 0, 0);
    const g = ctx.createLinearGradient(0, -s * 0.4, s, s * 0.4); g.addColorStop(0, C.green3); g.addColorStop(0.5, fill); g.addColorStop(1, C.green3);
    ctx.fillStyle = g; ctx.fill(path);
    // hatch texture
    ctx.save(); ctx.clip(path); ctx.strokeStyle = 'rgba(10,16,10,0.35)'; ctx.lineWidth = 1.2; const r = rng(seed);
    for (let i = -s; i < s * 1.2; i += 7) { ctx.beginPath(); ctx.moveTo(i, -s); ctx.lineTo(i + s * 0.6 + r() * 4, s); ctx.stroke(); }
    ctx.restore();
    // midrib + rim light
    charcoal([[s * 0.04, 0], [s * 0.5, -s * 0.03 * wdt], [s * 0.95, 0]], 1.6, '#0d140c', 0.7, seed + 3, 2);
    if (rim > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = C.gold2; ctx.globalAlpha = 0.55 * rim; ctx.lineWidth = 2; ctx.stroke(path); ctx.restore(); }
    const jr = rng(seed + Math.floor(performance.now() * 0) + 5);
    for (let k = 0; k < 2; k++) { ctx.save(); ctx.translate((jr() - 0.5) * 2.4, (jr() - 0.5) * 2.4); ctx.rotate((jr() - 0.5) * 0.03); ctx.strokeStyle = 'rgba(6,8,6,0.55)'; ctx.lineWidth = 1.2 + jr() * 1.4; ctx.stroke(path); ctx.restore(); }
    ctx.restore();
  }

  // ---------- the light ----------
  function lightPos(t) {
    // drifts slowly; always a little beyond the plant's reach
    const base = [1230, 420];
    const dx = noise1(t * 0.07, 1) * 160 + Math.sin(t * 0.11) * 60, dy = noise1(t * 0.06, 2) * 90 + Math.cos(t * 0.09) * 30;
    const f = finalScale(t);
    return [base[0] + dx - f * 120, base[1] + dy - f * 40];
  }
  function lightLevel(t) {
    const intro = sm(prog(t, 0.2, 6));
    const dimOut = 1 - 0.55 * prog(t, SEC.out, SEC.dark - 0.4);
    const off = t < SEC.dark ? 1 : Math.exp(-(t - SEC.dark) / 0.12);
    const rmsBoost = 0.85 + 0.25 * clamp((rmsAt(t) - 90) / 90);
    return intro * dimOut * off * rmsBoost;
  }
  function drawLight(t, lvl, echo = true) {
    if (lvl <= 0.002) return;
    const reps = echo ? 4 : 1;
    for (let k = reps - 1; k >= 0; k--) {
      const [x, y] = lightPos(t - k * 0.22); const a = k === 0 ? 1 : 0.32 / k;
      glow(x, y, 520, 'rgba(242,200,121,0.22)', lvl * a);
      glow(x, y, 150, 'rgba(255,214,140,0.9)', lvl * a * 0.9);
      glow(x, y, 40, 'rgba(255,240,210,1)', lvl * a);
    }
  }

  // ---------- the plant ----------
  const POT = [600, 935]; const PS = 1.45;
  function plantGeom(t) {
    const [lx, ly] = lightPos(t);
    const base = [POT[0], POT[1] - 95 * PS];
    // reach grows over the song; gap to the light shrinks but never closes
    const reach = lerp(0.42, 0.97, sm(prog(t, 4, SEC.dark)));
    const gapPx = t < SEC.dark ? lerp(150, 14, sm(prog(t, SEC.out, SEC.dark))) : 14;
    const dx = lx - base[0], dy = ly - base[1], L = Math.hypot(dx, dy);
    const tipFull = [lx - dx / L * gapPx, ly - dy / L * gapPx];
    const tip = [lerp(base[0] + 30, tipFull[0], reach), lerp(base[1] - 200, tipFull[1], reach)];
    const sway = noise1(t * 0.25, 5) * 18;
    const c1 = [base[0] - 40 + sway, lerp(base[1], tip[1], 0.55)];
    const c2 = [lerp(base[0], tip[0], 0.55) + sway * 0.5, tip[1] + 60];
    return { base, tip, c1, c2 };
  }
  const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };
  function drawPlant(t, seedBase, lvl, alpha = 1) {
    ctx.save(); ctx.globalAlpha = alpha;
    // pot
    const q = (x, y) => [POT[0] + x * PS, POT[1] + y * PS];
    const pot = new Path2D(); pot.moveTo(...q(-95, -95)); pot.lineTo(...q(95, -95)); pot.lineTo(...q(70, 40)); pot.lineTo(...q(-70, 40)); pot.closePath();
    const pg = ctx.createLinearGradient(POT[0] - 140, 0, POT[0] + 140, 0); pg.addColorStop(0, '#140e09'); pg.addColorStop(0.55, '#2e2016'); pg.addColorStop(1, '#4a3424');
    ctx.fillStyle = pg; ctx.fill(pot);
    ctx.save(); ctx.clip(pot); const pr = rng(seedBase + 7); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 60; i++) { const x = POT[0] - 140 + pr() * 280; ctx.beginPath(); ctx.moveTo(x, POT[1] - 150); ctx.lineTo(x + 30 + pr() * 20, POT[1] + 70); ctx.stroke(); } ctx.restore();
    charcoal([q(-95, -95), q(95, -95), q(70, 40), q(-70, 40), q(-95, -95)], 3, '#0a0705', 0.9, seedBase + 1);
    charcoal([q(-102, -95), q(102, -95)], 9, '#3b281a', 0.7, seedBase + 2);
    // stem with tape-echo trail
    for (let k = 3; k >= 0; k--) {
      const g = plantGeom(t - k * 0.18), a = k === 0 ? 1 : 0.18 / k;
      const pts = []; for (let i = 0; i <= 30; i++) pts.push(bez(g.base, g.c1, g.c2, g.tip, i / 30));
      charcoal(pts, 11, k ? '#3a5a34' : C.green2, a, seedBase + 10 + k);
      if (k === 0) {
        // leaves along the stem: one more unfurls on every downbeat (up to the count the stem can hold)
        const nd = lastBefore(DOWN, t) + 1, maxLeaves = 14;
        const [lx, ly] = lightPos(t);
        for (let j = 0; j < maxLeaves; j++) {
          const u = 0.12 + (j / maxLeaves) * 0.82; const p = bez(g.base, g.c1, g.c2, g.tip, u), p2 = bez(g.base, g.c1, g.c2, g.tip, Math.min(1, u + 0.02));
          const ang = Math.atan2(p2[1] - p[1], p2[0] - p[0]) + (j % 2 ? -1 : 1) * (0.9 + 0.2 * Math.sin(t * 0.6 + j));
          // leaf j appears at the j-th downbeat after the plant starts, earlier leaves already open
          const tOpen = DOWN[Math.max(0, Math.round((j / maxLeaves) * Math.max(1, nd)) )] || 0;
          const birth = DOWN[Math.min(DOWN.length - 1, 8 + j * 6)] || 9999;
          const un = t >= birth ? clamp((t - birth) / 1.2) : 0;
          const breathe = 1 + 0.03 * Math.sin(t * 1.3 + j);
          const dist = Math.hypot(lx - p[0], ly - p[1]); const rim = lvl * clamp(1 - dist / 900) * 1.4;
          leaf(p[0], p[1], 104 * breathe * (0.7 + 0.3 * u), ang, un, rim, seedBase + 100 + j, j % 3 === 0 ? C.green2 : C.green, un > 0 ? 1 : 0);
          void tOpen;
        }
        // the reaching tip leaf: unfurls a little on each downbeat
        const tipPulse = pulse(DOWN, t, 0.6);
        const tg = bez(g.base, g.c1, g.c2, g.tip, 0.98);
        leaf(g.tip[0], g.tip[1], 80, Math.atan2(g.tip[1] - tg[1], g.tip[0] - tg[0]) - 0.15, 0.55 + 0.25 * tipPulse + 0.2 * prog(t, SEC.out, SEC.dark), lvl * 1.6, seedBase + 999, C.moss);
      }
    }
    ctx.restore();
  }

  // ---------- the room (verses) ----------
  function drawRoom(t, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    // window frame in moonlight, wall edge, table
    const wx = 1450, wy = 150;
    ctx.fillStyle = 'rgba(90,115,165,0.22)'; ctx.fillRect(wx, wy, 330, 470); glow(wx + 165, wy + 235, 420, 'rgba(110,135,190,0.25)', 0.5);
    charcoal([[wx, wy], [wx + 330, wy], [wx + 330, wy + 470], [wx, wy + 470], [wx, wy]], 9, '#0c1018', 0.95, 501);
    charcoal([[wx + 165, wy], [wx + 165, wy + 470]], 7, '#0c1018', 0.9, 502);
    charcoal([[wx, wy + 235], [wx + 330, wy + 235]], 7, '#0c1018', 0.9, 503);
    charcoal([[0, 960], [W, 950]], 8, '#140f0b', 0.9, 504);
    ctx.fillStyle = 'rgba(20,14,10,0.85)'; ctx.fillRect(0, 955, W, 130);
    // the lamp: a small shade whose light has slipped loose and drifts
    const lx = 1560, ly = 940;
    charcoal([[lx, ly], [lx, ly - 160]], 5, '#1a120b', 0.9, 505);
    charcoal([[lx - 70, ly - 160], [lx + 70, ly - 160], [lx + 45, ly - 250], [lx - 45, ly - 250], [lx - 70, ly - 160]], 4, C.umber, 0.9, 506);
    glow(lx, ly - 200, 120, 'rgba(201,163,90,0.35)', 0.5 * lightLevel(t));
    ctx.restore();
  }

  // ---------- the understory (choruses) ----------
  const UNDER = (() => {
    const r = rng(77), L = [];
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 26 + layer * 8; i++) L.push({ layer, x: r() * 2400 - 240, y: r() * 1300 - 110, s: (180 - layer * 45) * (0.6 + r() * 0.8), a: r() * Math.PI * 2, ph: r() * 6, seed: Math.floor(r() * 1e6) });
    return L;
  })();
  function drawUnderstory(t, a, scale) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    const zoom = 1 + 0.08 * scale + 0.02 * Math.sin(t * 0.2);
    ctx.translate(W / 2, H / 2); ctx.scale(zoom, zoom); ctx.translate(-W / 2, -H / 2);
    // light shafts
    for (let i = 0; i < 4; i++) {
      const x0 = 300 + i * 420 + Math.sin(t * 0.1 + i) * 60;
      const g = ctx.createLinearGradient(x0, 0, x0 + 300, H); g.addColorStop(0, 'rgba(232,194,122,0.10)'); g.addColorStop(1, 'rgba(232,194,122,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 140, 0); ctx.lineTo(x0 + 520, H); ctx.lineTo(x0 + 300, H); ctx.closePath(); ctx.globalAlpha = a * (0.6 + 0.4 * scale); ctx.fill(); ctx.restore();
    }
    const beatP = pulse(BEATS, t, 0.25);
    [2, 1, 0].forEach((layer) => {
      const par = [0.35, 0.65, 1][layer];
      UNDER.filter((l) => l.layer === layer).forEach((l, i) => {
        const drift = Math.sin(t * 0.15 * par + l.ph) * 30 * par;
        const fill = [C.green3, C.green, C.green2][layer];
        const dim = [0.55, 0.8, 1][layer];
        const unf = 0.75 + 0.25 * Math.sin(t * 0.5 + l.ph) + (layer === 0 ? 0.08 * beatP : 0);
        leaf(l.x + drift, l.y + Math.cos(t * 0.12 + l.ph) * 20 * par, l.s * (1 + 0.15 * scale * par), l.a + 0.08 * Math.sin(t * 0.3 + l.ph), unf, layer === 0 ? 0.35 : 0, l.seed, fill, dim);
      });
    });
    // dappled light
    const r = rng(303);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H, ph = r() * 6;
      glow(x + Math.sin(t * 0.2 + ph) * 20, y, 40 + r() * 70, 'rgba(232,194,122,0.5)', a * (0.25 + 0.2 * Math.sin(t * 0.7 + ph)) * (0.7 + 0.5 * scale));
    }
    ctx.restore();
  }

  // ---------- reaching shapes: two vines that stop a hair apart ----------
  function drawReachers(t, a, scale) {
    if (a <= 0.01) return;
    const cx = 960 + Math.sin(t * 0.13) * 40, cy = 560 + Math.cos(t * 0.11) * 30;
    const close = sm(prog(t, (t > SEC.c3 - 1 ? SEC.c3 : t > SEC.c2 - 1 ? SEC.c2 : SEC.c1), (t > SEC.c3 - 1 ? SEC.out : t > SEC.c2 - 1 ? SEC.br : SEC.v2) - 1));
    const gap = lerp(260, 6, close);
    ctx.save(); ctx.globalAlpha = a;
    for (let k = 3; k >= 0; k--) {
      const tt = t - k * 0.2, ka = k === 0 ? 1 : 0.2 / k;
      [-1, 1].forEach((side) => {
        const tipX = cx + side * gap / 2, tipY = cy + Math.sin(tt * 0.4) * 8 * side;
        const sx = side < 0 ? -40 : W + 40, sy = side < 0 ? 760 : 380;
        const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; const x = lerp(sx, tipX, u), y = lerp(sy, tipY, u) + Math.sin(u * 7 + tt * 0.6 + side) * 60 * (1 - u) * (1 - u); pts.push([x, y]); }
        charcoal(pts, 5 + 3 * scale, '#486b3c', ka, 700 + (side + 1) * 10 + k);
        if (k === 0) {
          for (let j = 1; j < 9; j++) { const p = pts[j * 4]; leaf(p[0], p[1], 46 + 20 * scale, (side < 0 ? -0.6 : 3.6) + (j % 2 ? 0.9 : -0.9), 0.9, 0.3, 800 + j + side * 50, C.green2); }
          // curled tendril tip
          const tp = [];
          for (let i = 0; i <= 16; i++) { const ang = i * 0.5, rr = 18 * (1 - i / 18); tp.push([tipX - side * (rr * Math.cos(ang) - 18), tipY + rr * Math.sin(ang)]); }
          charcoal(tp, 3, '#6b8f52', 0.9, 900 + side);
        }
      });
    }
    glow(cx, cy, 70, 'rgba(232,194,122,0.6)', a * 0.35 * close);
    ctx.restore();
  }

  // ---------- final chorus: two small silhouettes drifting toward each other ----------
  function drawSilhouettes(t, a) {
    if (a <= 0.01) return;
    const u = sm(prog(t, SEC.c3, SEC.out - 0.5));
    const cx = 1330, gap = lerp(560, 120, u), floor = 1000;
    ctx.save(); ctx.globalAlpha = a;
    glow(cx, floor - 260, 380, 'rgba(232,194,122,0.35)', 0.5 * a);
    [-1, 1].forEach((side) => {
      const x = cx + side * gap / 2, bob = Math.sin(t * 2.3 + side) * 2, sc = 1.35;
      const P2 = (dx, dy) => [x + dx * sc * -side, floor + dy * sc + bob];
      ctx.fillStyle = '#04060a';
      ctx.beginPath(); ctx.ellipse(...P2(0, -150), 14 * sc, 16 * sc, 0, 0, Math.PI * 2); ctx.fill();
      const body = new Path2D(); body.moveTo(...P2(-19, -130)); body.quadraticCurveTo(...P2(-25, -60), ...P2(-15, 0)); body.lineTo(...P2(15, 0)); body.quadraticCurveTo(...P2(25, -60), ...P2(19, -130)); body.closePath(); ctx.fill(body);
      // arm arcs up toward the other figure; hands stop a hair apart above the gap
      const sh = P2(-10, -122), hand = [cx - side * 7, floor - 250 + bob];
      const mid = [lerp(sh[0], hand[0], 0.45), lerp(sh[1], hand[1], 0.6) - 20];
      const arm = []; for (let i = 0; i <= 12; i++) { const v = i / 12, w2 = 1 - v; arm.push([w2 * w2 * sh[0] + 2 * w2 * v * mid[0] + v * v * hand[0], w2 * w2 * sh[1] + 2 * w2 * v * mid[1] + v * v * hand[1]]); }
      charcoal(arm, 9, '#04060a', 1, 950 + side, 4);
      ctx.beginPath(); ctx.ellipse(hand[0], hand[1], 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  // ---------- bridge (5/4): motes on strings, plucked one per beat ----------
  function drawBridge(t, a) {
    if (a <= 0.01) return;
    const bi = lastBefore(BEATS, t), b0 = BEATS.indexOf(BEATS.find((b) => b >= SEC.br - 0.01));
    ctx.save(); ctx.globalAlpha = a;
    for (let s = 0; s < 5; s++) {
      const y = 330 + s * 95;
      // which beat last plucked this string
      let last = -1; for (let i = bi; i >= Math.max(b0, bi - 10); i--) if (((i - b0) % 5 + 5) % 5 === s) { last = i; break; }
      const age = last >= 0 ? t - BEATS[last] : 99, amp = 22 * Math.exp(-age / 0.7) * (s === 0 ? 1.3 : 1);
      const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([lerp(260, 1660, u), y + Math.sin(u * Math.PI) * amp * Math.sin(age * 38 + i * 0.05)]); }
      charcoal(pts, 1.6, C.gold, 0.35 + 0.5 * Math.exp(-age / 0.9), 1200 + s, 2);
      for (let m = 0; m < 12; m++) {
        const u = (m + 0.5) / 12, p = pts[Math.round(u * 60)];
        glow(p[0], p[1], 26 + 30 * Math.exp(-age / 0.5), 'rgba(242,200,121,0.9)', 0.25 + 0.75 * Math.exp(-age / 0.6) * (0.6 + 0.4 * Math.sin(m * 1.7)));
      }
    }
    ctx.restore();
  }

  // ---------- frame ----------
  function render(t) {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // night gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, C.night2); bg.addColorStop(1, C.night);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const lvl = lightLevel(t), ch = chorusMix(t), brg = bridgeMix(t), fin = finalScale(t);
    const breath = 1 + 0.006 * Math.sin(t * 2 * Math.PI / (0.5108 * 8));
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(breath, breath); ctx.translate(-W / 2, -H / 2);
    // warm wash from the light
    const [lx, ly] = lightPos(t);
    glow(lx, ly, 1400, 'rgba(120,80,40,0.35)', lvl * (0.8 + 0.4 * ch));
    drawRoom(t, (1 - ch) * (1 - brg * 0.7));
    drawUnderstory(t, ch, fin);
    drawBridge(t, brg);
    drawReachers(t, ch * (0.6 + 0.4 * fin), fin);
    const plantA = 1 - 0.55 * ch * (1 - fin) - 0.4 * brg;
    drawPlant(t, 1, lvl, plantA);
    drawLight(t, lvl * (1 - 0.5 * brg));
    // after the light goes out: cold moonlight on the leaf, then black
    if (t > SEC.dark) {
      const g = plantGeom(SEC.dark);
      glow(g.tip[0], g.tip[1], 260, 'rgba(127,149,184,0.5)', 0.35 * prog(t, SEC.dark + 0.8, SEC.coda) * (1 - prog(t, SEC.end - 6, SEC.end - 1)));
      // filament afterglow
      glow(lx, ly, 18, 'rgba(255,154,74,1)', 0.8 * Math.exp(-(t - SEC.dark) / 1.6));
    }
    ctx.restore();
    // after the light goes out, the room falls into darkness
    if (t > SEC.dark) { ctx.fillStyle = `rgba(2,3,6,${0.62 * prog(t, SEC.dark, SEC.dark + 1.2)})`; ctx.fillRect(0, 0, W, H);
      const g = plantGeom(SEC.dark); glow(g.tip[0], g.tip[1], 200, 'rgba(127,149,184,0.6)', 0.3 * prog(t, SEC.dark + 1, SEC.coda) * (1 - prog(t, SEC.end - 6, SEC.end - 1))); }
    // paper texture (multiply), vignette, grain
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.6; ctx.drawImage(PAPER, 0, 0); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const gi = Math.floor(t * 24) % GRAIN.length;
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.3; ctx.drawImage(GRAIN[gi], 0, 0, W, H); ctx.restore();
    // gate weave / flicker
    const fl = 0.03 * noise1(t * 9, 9);
    if (fl > 0) { ctx.fillStyle = `rgba(0,0,0,${fl})`; ctx.fillRect(0, 0, W, H); }
    // fades
    const fi = 1 - prog(t, 0, 2.5), fo = prog(t, A.duration - 2.5, A.duration - 0.3);
    if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
  }

  async function init() {
    cv = document.getElementById('c'); ctx = cv.getContext('2d');
    A = await (await fetch('../sources/analysis.json', { cache: 'no-store' })).json();
    DUR = A.duration;
    buildTiming();
    PAPER = makePaper();
    for (let i = 0; i < 6; i++) GRAIN.push(makeGrain(1000 + i));
    return { duration: DUR, sections: SEC };
  }
  window.EP = {
    ready: null,
    render,
    setScale(s) { SCALE = s; cv.width = Math.round(W * s); cv.height = Math.round(H * s); },
    frame(t, q = 0.92) { render(t); return cv.toDataURL('image/jpeg', q); },
    get duration() { return DUR; },
    sections: () => SEC,
  };
  window.EP.ready = init();
})();
