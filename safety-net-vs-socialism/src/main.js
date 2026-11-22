// "the economic illiteracy of socialism": constructivist plates with canvas overlays.
// Everything is a pure function of time t, so the same code drives live preview and frame export.
'use strict';
(function () {
  const W = 1920, H = 1080;
  const P = {
    paper: '#e9dcc0', ink: '#2a2633', red: '#e4572e', teal: '#1b998b', gold: '#f2a541', blue: '#3f6fd8',
    plum: '#8d5a9e', green: '#4fa35b', grey: '#8f897d', cream: '#fffaf0', cash: '#7fb77e', crust: '#b9822f',
    skin: ['#f2d3b3', '#d9a679', '#a8754f', '#f0c8a0', '#7a4e33'],
  };
  const HAND = "'Caveat'", PRINT = "'Patrick Hand'";
  const Q = new URLSearchParams(location.search);

  let cv, ctx, rc, PAPER, TL, SCRIPT, SCN = [], EVENTS = [], NARR = {}, CAPTIONS = Q.has('captions'), SCALE = 1, IMG = {};
  let T = 0, KC = 0;

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const prog = (t, a, b) => { if (b < a + 0.12) b = a + 0.35; return clamp((t - a) / (b - a)); };
  const eIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
  const eOut = (u) => 1 - Math.pow(1 - u, 3);
  const eBack = (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
  const popS = (t0, d = 0.45) => (T < t0 ? 0 : eBack(prog(T, t0, t0 + d)));
  const fadeIn = (t0, d = 0.4) => prog(T, t0, t0 + d);
  const fadeOut = (t0, d = 0.4) => 1 - prog(T, t0, t0 + d);
  function rand(seed) { let a = seed; return () => { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }

  // ---------- timeline ----------
  function estimate(s) {
    const words = s.split(/\s+/).length, pauses = (s.match(/[.?!:;]/g) || []).length + (s.match(/,/g) || []).length * 0.5;
    return words / 2.75 + pauses * 0.2 + 0.15;
  }
  function buildTimeline(script, durs) {
    const lines = {}; let t = 3.8;
    script.lines.forEach((l) => {
      const info = durs && durs[l.id];
      const d = (info && info.duration) || estimate(l.say || l.text);
      lines[l.id] = Object.assign({}, l, { start: t, dur: d, end: t + d, chars: info && info.chars });
      t += d + (l.gap != null ? l.gap : 0.42);
    });
    return { lines, order: script.lines.map((l) => l.id), total: t + 4.2 };
  }
  // cue: fraction f through a line (mapped through real character timings when present)
  const c = (id, f = 0) => {
    const L = TL.lines[id];
    if (!L.chars || f <= 0) return L.start + f * L.dur;
    if (f >= 1) return L.end;
    return L.start + L.chars[Math.min(L.chars.length - 1, Math.floor(f * L.chars.length))];
  };
  // cue: the moment `word` is spoken in line `id` (plus `extra` seconds)
  const w = (id, word, extra = 0) => {
    const L = TL.lines[id], s = L.say || L.text, i = s.indexOf(word);
    if (i < 0) { console.warn('word cue not found', id, word); return L.start + extra; }
    return (L.chars ? L.start + L.chars[Math.min(i, L.chars.length - 1)] : L.start + (i / s.length) * L.dur) + extra;
  };
  const ce = (id, extra = 0) => TL.lines[id].end + extra;

  // ---------- drawing primitives ----------
  function sd() { const f = Math.floor(T * 7); return ((f * 9301 + (KC++) * 49297) % 233280) + 1; }
  function o(extra) { return Object.assign({ roughness: 1.25, bowing: 1.1, stroke: P.ink, strokeWidth: 3.2, seed: sd() }, extra || {}); }

  function draw(kind, args, p = 1, op = {}, len = 1000) {
    if (p <= 0) { KC += 2; return; }
    const { fill, fillAlpha = 1, ...rest } = op;
    if (fill) {
      const fa = p >= 1 ? 1 : clamp((p - 0.55) / 0.45);
      if (fa > 0) {
        ctx.save(); ctx.globalAlpha *= fa * fillAlpha;
        rc[kind](...args, o(Object.assign({ fillStyle: 'hachure', hachureGap: 9, fillWeight: 2.3 }, rest, { fill, stroke: 'none' })));
        ctx.restore();
      } else KC++;
    } else KC++;
    const dash = p < 1 ? { strokeLineDash: [len * p + 0.5, len * 3] } : {};
    rc[kind](...args, o(Object.assign({}, rest, dash, { fill: undefined })));
  }
  const line = (x1, y1, x2, y2, p = 1, op) => draw('line', [x1, y1, x2, y2], p, op, Math.hypot(x2 - x1, y2 - y1));
  const rect = (x, y, w, h, p = 1, op) => draw('rectangle', [x, y, w, h], p, op, 2 * (w + h));
  const circ = (x, y, d, p = 1, op) => draw('circle', [x, y, d], p, op, Math.PI * d);
  const ell = (x, y, w, h, p = 1, op) => draw('ellipse', [x, y, w, h], p, op, (Math.PI * (w + h)) / 2);
  const path = (d, p = 1, op, len = 900) => draw('path', [d], p, op, len);
  const poly = (pts, p = 1, op) => draw('polygon', [pts], p, op, pts.reduce((s, q, i) => s + Math.hypot(q[0] - pts[(i + 1) % pts.length][0], q[1] - pts[(i + 1) % pts.length][1]), 0));
  function curveP(pts, p = 1, op = {}, smooth = true) {
    if (p <= 0) { KC += 2; return; }
    let L = 0; const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let rem = L * clamp(p); const out = [pts[0]];
    for (let i = 1; i < pts.length && rem > 0; i++) {
      if (seg[i - 1] <= rem) { out.push(pts[i]); rem -= seg[i - 1]; }
      else { const u = rem / seg[i - 1]; out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); rem = 0; }
    }
    if (out.length < 2) { KC += 2; return; }
    KC++;
    rc[smooth && out.length > 2 ? 'curve' : 'linearPath'](out, o(op));
  }
  function arrow(x1, y1, x2, y2, p = 1, op = {}) {
    line(x1, y1, x2, y2, p, op);
    if (p > 0.85) {
      const a = Math.atan2(y2 - y1, x2 - x1), L = op.head || 28;
      line(x2, y2, x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45), 1, op);
      line(x2, y2, x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45), 1, op);
    } else KC += 4;
  }
  function dot(x, y, r, col = P.ink) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

  function txt(s, x, y, size, op = {}) {
    const { p = 1, color = P.ink, font = HAND, weight, align = 'center', rot = 0, alpha = 1, halo = 0 } = op;
    KC++;
    if (p <= 0 || alpha <= 0) return 0;
    const wgt = weight != null ? weight : font === HAND ? 700 : 400;
    ctx.save();
    ctx.translate(x, y);
    const j = (((Math.floor(T * 7) * 31 + KC * 17) % 100) / 100 - 0.5) * 0.008;
    ctx.rotate(rot + j);
    ctx.font = `${wgt} ${size}px ${font}, 'Patrick Hand', 'DejaVu Sans', sans-serif`;
    ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.textBaseline = 'middle';
    const full = ctx.measureText(s).width;
    const sx = align === 'center' ? -full / 2 : align === 'right' ? -full : 0;
    ctx.textAlign = 'left';
    const shown = p >= 1 ? s : s.slice(0, Math.ceil(s.length * p));
    if (halo) { ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,250,240,0.92)'; ctx.lineWidth = halo; ctx.strokeText(shown, sx, 0); }
    ctx.fillText(shown, sx, 0);
    ctx.restore();
    return full;
  }
  // write-on text between two times
  const wt = (s, x, y, size, t0, t1, op = {}) => txt(s, x, y, size, Object.assign({}, op, { p: prog(T, t0, t1) }));

  function grp(x, y, s, r, fn, alpha = 1) {
    if (s <= 0.001 || alpha <= 0.001) { KC += 40; return; }
    ctx.save(); ctx.translate(x, y); if (r) ctx.rotate(r); ctx.scale(s, s); ctx.globalAlpha *= clamp(alpha); fn(); ctx.restore();
  }
  function stamp(s, x, y, size, t0, op = {}) {
    if (T < t0) { KC += 4; return; }
    const u = prog(T, t0, t0 + 0.22), sc = lerp(1.8, 1, eOut(u));
    const col = op.color || P.red;
    grp(x, y, sc, op.rot != null ? op.rot : -0.08, () => {
      ctx.font = `700 ${size}px ${HAND}`;
      const w = ctx.measureText(s).width + size * 0.8;
      ctx.fillStyle = 'rgba(255,250,240,0.93)'; ctx.fillRect(-w / 2, -size * 0.62, w, size * 1.24);
      rect(-w / 2, -size * 0.62, w, size * 1.24, 1, { stroke: col, strokeWidth: 5, roughness: 1.6 });
      txt(s, 0, 2, size, { color: col });
    }, u * 1.2 * (op.alpha != null ? op.alpha : 1));
  }

  // ---------- background ----------
  function makePaper() {
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const g = c2.getContext('2d'), r = rand(42);
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.06})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(120,100,70,0.05)';
    for (let i = 0; i < 160; i++) { g.lineWidth = 0.6 + r(); g.beginPath(); const x = r() * W, y = r() * H; g.moveTo(x, y); g.quadraticCurveTo(x + r() * 40, y + r() * 10, x + 30 + r() * 60, y + r() * 20 - 10); g.stroke(); }
    
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(80,60,30,0.22)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c2;
  }


  // ---------- constructivist kit ----------
  const K = { red: '#c4161c', black: '#151311', cream: '#efe4cc', paper: '#e8dbbf', grey: '#6f675c', gold: '#d9a21b', green: '#2f7d4f' };
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
    if (op.shadow !== false) box(10, -bh / 2 + 10, bw, bh, op.shadowCol || (op.bg === K.red ? K.black : K.red));
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
      box(-w / 2 + 14, -h / 2 + 14, w, h, op.shadow || K.red);
      box(-w / 2, -h / 2, w, h, op.bg || K.cream);
      frame(-w / 2, -h / 2, w, h, K.black, 6);
      if (fn) fn();
    }, a);
  }
  function stampX(s, x, y, size, q, op = {}) {
    const t0 = at(q), out = op.out != null ? at(op.out) : null;
    if (T < t0 || (out != null && T > out + 0.3)) { KC += 4; return; }
    const u = prog(T, t0, t0 + 0.18), sc = lerp(1.7, 1, eOut(u)), col = op.color || K.red;
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
  const strikeBar = (x1, y, x2, q) => { const u = eOut(prog(T, at(q), at(q) + 0.25)); if (u > 0) box(x1, y - 5, (x2 - x1) * u, 11, K.red); };
  // a list of lines that reveal on cues; rows: [text, cue, op]
  function rows(list, x, y, size, gap, op = {}) {
    list.forEach(([s, q, o], i) => { const a = vis(at(q), op.out != null ? at(op.out) : null); if (a > 0) (o && o.mono ? M : D)(s, x, y + i * gap, (o && o.size) || size, Object.assign({ align: op.align || 'left', alpha: a, color: K.black }, op.style || {}, o || {})); else KC++; });
  }
  // the clean red/black paper background for chart scenes
  function paperBg() {
    ctx.drawImage(PAPER, 0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = K.red;
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W, 260); ctx.lineTo(W - 520, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = K.black; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H - 140); ctx.lineTo(380, H); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function sickle(x, y, s, col = K.red, a = 1) {
    if (a <= 0) return;
    grp(x, y, s, -0.35, () => {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 16; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.arc(0, -8, 70, Math.PI * 0.95, Math.PI * 2.55); ctx.stroke();
      ctx.save(); ctx.rotate(0.78); ctx.fillRect(-9, -60, 18, 150); ctx.fillRect(-36, -78, 72, 30); ctx.restore();
    }, a);
  }
  const span = (a, b, ext = 0.6) => [c(a) - 0.6, ce(b) + ext];

  // ---------- scenes ----------
  // 1. cold open
  function sDelivery() {
    plate('delivery', 0, ce('O1') + 0.6, { z: [1.12, 1.0], x: [0.4, -0.2] });
    banner('up to +$5 per order', 1400, 230, 82, ['O1', 'five dollars'], { bg: K.red });
    banner('Intro 518 · the Delivery Protection Act', 1400, 340, 40, ['O1', 'Delivery Protection'], { raw: true });
    cite('Amazon in-app alert to New York shoppers, Nov 2026', ['O1', 'warned']);
  }
  function sPost() {
    paperBg();
    const im = IMG.post, t0 = c('O2') - 0.4;
    if (im && T > t0) {
      const sc = 0.86, w0 = im.width * sc, h0 = im.height * sc, s = lerp(0.94, 1.0, eOut(prog(T, t0, t0 + 0.5))) * lerp(1, 1.04, prog(T, t0, ce('O2')));
      grp(800, 540, s, -0.015, () => { box(-w0 / 2 + 18, -h0 / 2 + 18, w0, h0, K.red); ctx.drawImage(im, -w0 / 2, -h0 / 2, w0, h0); frame(-w0 / 2, -h0 / 2, w0, h0, K.black, 6); }, fadeIn(t0, 0.3));
    } else KC += 10;
    stampX("it's greed", 1560, 760, 92, ['O2', "It's greed"]);
    cite('@NYCMayor on X, Nov 19, 2026', c('O2'));
  }
  function sRules() {
    plate('cityhall', c('O2b') - 0.6, ce('O2b') + 0.6, { z: [1.0, 1.1], y: [0.2, -0.2] });
    banner('new rules cost money to follow', 960, 200, 70, ['O2b', 'cost money']);
    banner('"the law can\'t be the reason"', 960, 330, 62, ['O2b', "can't be"], { bg: K.cream, fg: K.black, shadowCol: K.black, raw: true });
    stampX('= greed', 960, 820, 110, ['O2b', "that's greed"]);
  }
  function sCharity() {
    plate('charity', c('O3') - 0.6, ce('O5') + 0.6, { z: [1.0, 1.12], x: [-0.3, 0.3] });
    banner('passing on a cost = greed?', 520, 150, 60, ['O3', 'passing on'], { out: c('O3b') });
    banner('absorbing it = giving money away', 560, 260, 60, ['O3', 'Absorbing'], { bg: K.red, out: c('O3b') });
    stampX('charity, demanded by city hall', 900, 900, 70, ['O3', 'charity'], { out: c('O3b') });
    card(960, 470, 1400, 560, c('O3b'), () => {
      D('charge $5 less', -340, -200, 56); D('full price + mail a $5 check', 350, -200, 44);
      box(-4, -250, 8, 470, K.black);
      rows([['company  −$5', ['O3b', 'books']], ['customer  +$5', ['O3b', 'books', 0.4]]], -560, -60, 64, 110);
      rows([['company  −$5', ['O3b', 'books', 0.8]], ['customer  +$5', ['O3b', 'books', 1.2]]], 90, -60, 64, 110);
      if (T > w('O3b', 'exactly')) { stampX('identical', 0, 200, 80, ['O3b', 'exactly']); } else KC += 4;
    }, { out: c('O4') });
    banner('then tax it. openly.', 960, 260, 86, ['O4', 'tax it'], { bg: K.red, out: c('O5') });
    banner('a different policy', 960, 390, 56, ['O4', 'different policy'], { out: c('O5') });
    banner('who pays? whoever owns the shares', 960, 200, 70, ['O5', 'Whoever'], {});
    banner('why them, and not everyone?', 960, 320, 56, ['O5', 'Why them'], { bg: K.red });
  }
  function sMayor() {
    plate('cityhall', c('O6') - 0.6, ce('O6') + 0.6, { z: [1.1, 1.18], x: [0.2, -0.2] });
    banner('the largest city in America', 960, 860, 70, ['O6', 'largest'], { raw: false });
  }
  function sMenu() {
    plate('menu', c('O7') - 0.6, ce('O8') + 0.6, { z: [1.0, 1.1] });
    banner('the same mistake, over and over', 960, 220, 76, ['O7', 'same mistake']);
    stampX("you probably don't", 960, 820, 88, ['O8', 'probably']);
  }
  function sTitle() {
    const t0 = ce('O8') + 0.1;
    plate('title', t0 - 0.5, t0 + 5, { z: [1.06, 1.0] });
    const a = fadeIn(t0 + 0.3, 0.3);
    box(0, 170, W, 330, 'rgba(21,19,17,0.88)', a * eOut(prog(T, t0 + 0.2, t0 + 0.6)));
    D('the economic', 960, 250, 110, { color: K.cream, alpha: fadeIn(t0 + 0.5, 0.25) });
    D('illiteracy of socialism', 960, 390, 140, { color: K.red, alpha: fadeIn(t0 + 0.9, 0.25) });
    M('economic physics', 960, 470, 28, { color: K.cream, alpha: fadeIn(t0 + 1.6, 0.3) });
  }
  // 2. not the argument
  function sNot() {
    plates([['net', c('N1') - 0.6, { z: [1.0, 1.08] }], ['net', c('N3'), { z: [1.08, 1.0] }]], ce('N6') + 0.6);
    const out = c('N3');
    if (T < out + 0.4) {
      card(620, 470, 900, 470, c('N1'), () => {
        Dm('you know the script:', -390, -170, 40, { align: 'left', color: K.grey });
        rows([['taxes are theft', ['N1', 'theft']], ['handouts make people lazy', ['N1', 'lazy']], ['cut the safety net', ['N1', 'Cut']]], -390, -80, 60, 100);
        if (T > c('N2')) { [0, 1, 2].forEach((i) => strikeBar(-400, -80 + i * 100, 400, c('N2') + i * 0.15)); } else KC += 3;
      }, { out });
      stampX("that's not the argument we're making", 960, 900, 66, c('N2'), { out });
    } else KC += 100;
    banner('how much to help? your call.', 960, 180, 72, ['N3', 'no position'], { out: c('N4') });
    banner('more · less · none at all', 960, 300, 52, ['N3', 'More than'], { bg: K.red, out: c('N4') });
    card(960, 300, 1300, 260, c('N4'), () => {
      Dm('our question:', 0, -70, 44, { color: K.grey });
      D('what\'s the least wasteful way to deliver it?', 0, 20, 58);
    }, { out: c('N6') });
    stampX("that's not the argument we're making", 960, 880, 66, ['N6', "That's not"]);
  }
  // 3. what socialism means
  function sMeaning() {
    plates([['menu', c('M1') - 0.6, { z: [1.12, 1.0] }], ['rentlock', c('M5') - 0.2, { z: [1.0, 1.08] }]], ce('M5') + 0.6);
    banner('a word on terms', 960, 200, 72, c('M1'), { out: c('M2') });
    card(960, 420, 1320, 430, c('M2'), () => {
      D('who called it what', 0, -150, 50, { color: K.red });
      rows([['1840s–1890s   Marx & Engels: "socialism", "communism", used loosely', ['M2', 'Marx'], { mono: true }], ['1917   Lenin: socialism = the stage before communism', ['M2', 'Lenin'], { mono: true }]], -590, -40, 30, 90);
      M('Engels, preface to the Communist Manifesto (1888) · Lenin, The State and Revolution (1917)', 0, 150, 20, { color: K.grey, alpha: fadeIn(w('M2', 'Lenin'), 0.3) });
    }, { out: c('M3') });
    card(560, 520, 860, 600, c('M3'), () => {
      D('what self-described socialists run on', 0, -240, 40, { color: K.red });
      rows([['a rent freeze', ['M3', 'rent freeze']], ['city-run grocery stores', ['M3', 'grocery']], ['fare-free buses', ['M3', 'fare-free']], ['delivery mandates', ['M3', 'delivery law']]], -360, -140, 56, 86);
    }, { out: c('M5') });
    if (T > c('M4') && T < c('M5') + 0.4) box(1040, 230, 760, 400, 'rgba(21,19,17,0.82)', vis(c('M4'), c('M5'))); else KC++;
    if (T > c('M4')) { rows([['+ price controls', ['M4', 'Price controls']], ['      e.g. rent control, the minimum wage', ['M4', 'rent control'], { color: '#e3a3a0', weight: 500, size: 34 }], ['+ nationalized industries', ['M4', 'Nationalized']], ['+ benefits in kind', ['M4', 'in kind']]], 1080, 300, 50, 86, { out: c('M5'), style: { color: K.cream, halo: 0 } }); } else KC += 8;
    banner('a price set by politics', 960, 200, 76, ['M5', 'decision made'], {});
    banner('central planning, one building at a time', 960, 330, 56, ['M5', 'central planning'], { bg: K.red });
  }
  // 4. deadweight loss
  function sSweater() {
    plate('sweater', c('D1') - 0.6, ce('D6') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    banner('deadweight loss', 960, 160, 90, ['D1', 'deadweight'], { bg: K.red, out: c('D2') });
    card(1440, 470, 760, 560, c('D2'), () => {
      rows([['paid', ['D2', 'ten dollars']], ['worth to you', ['D2', 'worth about']], ['vanished', ['D3', 'disappeared']]], -320, -170, 54, 120);
      D('$10', 300, -170, 72, { align: 'right', alpha: fadeIn(w('D2', 'ten dollars'), 0.2) });
      D('~$7', 300, -50, 72, { align: 'right', alpha: fadeIn(w('D2', 'worth about'), 0.2) });
      D('$3', 300, 70, 72, { align: 'right', color: K.red, alpha: fadeIn(w('D3', 'disappeared'), 0.2) });
      M('you had $10 and never bought it', 0, 200, 26, { color: K.grey, alpha: fadeIn(w('D2', 'never chose'), 0.3) });
    }, { out: c('D4') });
    banner('revealed preference', 520, 860, 64, ['D2', 'revealed preference'], { out: c('D4') });
    banner('nobody got it', 520, 860, 64, ['D3', 'Nobody got'], { bg: K.red, out: c('D4') });
    card(1300, 420, 960, 400, c('D4'), () => {
      D('holiday gifts', 0, -130, 50, { color: K.grey });
      D('1/10 to 1/3', 0, -20, 120, { color: K.red });
      D('of what givers spent, gone', 0, 100, 44);
    }, { out: c('D6') });
    cite('Waldfogel, "The Deadweight Loss of Christmas," American Economic Review (1993)', c('D4'), c('D6'));
    stampX('hand over $10 cash: nothing lost', 960, 860, 64, ['D6', 'ten-dollar bill']);
  }
  // 5. the roof
  function priceLine(y, tax) {
    const X = (v) => -300 + (v - 14) * 36;
    box(X(14), y - 3, X(31) - X(14), 6, K.black);
    [15, 20, 25, 30].forEach((v) => { box(X(v) - 2, y - 14, 4, 28, K.black); M('$' + v, X(v), y + 40, 26, { color: K.grey }); });
    const dana = 20 + 8 * tax;
    if (tax < 0.5) box(X(dana), y - 18, X(25) - X(dana), 36, 'rgba(47,125,79,0.5)'); else KC++;
    ctx.fillStyle = K.red; ctx.beginPath(); ctx.arc(X(dana), y, 14, 0, 7); ctx.fill();
    ctx.fillStyle = K.black; ctx.beginPath(); ctx.arc(X(25), y, 14, 0, 7); ctx.fill();
    Dm('Dana needs $' + Math.round(dana), X(dana), y - 52, 34, { color: K.red });
    Dm('you pay up to $25', X(25) + (tax > 0.3 ? -30 : 20), y + 90, 34);
  }
  function sRoof() {
    plates([['roofer', c('T1') - 0.6, { z: [1.0, 1.08] }], ['leak', ['T4', 'never happens', -0.1], { z: [1.0, 1.08] }]], ce('T7') + 0.6);
    banner('both expect to come out ahead', 960, 170, 64, ['T1', 'both expect'], { out: c('T2') });
    card(960, 300, 1200, 240, c('T2'), () => {
      D('pareto improvement', 0, -50, 64, { color: K.red });
      Dm('someone better off, nobody worse off', 0, 40, 44);
    }, { out: c('T3') });
    const tax = eIO(prog(T, w('T4', 'eight-dollar'), w('T4', 'twenty-eight')));
    card(1380, 330, 820, 380, ['T3', 'twenty dollars'], () => {
      priceLine(30, tax);
      if (tax < 0.5) D('+$5 of value', 0, -120, 54, { color: K.green, alpha: fadeIn(w('T3', 'five dollars'), 0.2) * (1 - tax * 2) }); else KC++;
      if (tax > 0.01) D('+$8 tax', 0, -120, 54, { color: K.red }); else KC++;
    }, { out: ['T4', 'never happens'] });
    banner('the job never happens', 960, 180, 80, ['T4', 'never happens'], { bg: K.red, out: c('T5') });
    card(1400, 340, 720, 400, c('T5'), () => {
      rows([['tax collected: $0', ['T5', 'collects nothing']], ['Dana: no work', ['T5', 'Dana loses']], ['roof: still leaking', ['T5', 'roof still']], ['value lost: $5', ['T5', 'five dollars'], { color: K.red }]], -300, -130, 50, 86);
    }, { out: c('T7') });
    card(960, 420, 1300, 380, c('T7'), () => {
      D('two leaks', 0, -120, 60, { color: K.red });
      rows([['1. benefits worth less than they cost', ['T7', 'Benefits']], ['2. taxes that kill trades', ['T7', 'Taxes that kill']]], -540, -10, 56, 100);
    });
  }
  // 6. rent control
  function sRent() {
    plates([['rentlock', c('R1') - 0.6, { z: [1.0, 1.1] }], ['landlord', ['R4', 'one person', -0.2], { z: [1.0, 1.1] }], ['rentlock', c('R5'), { z: [1.1, 1.18] }],
      ['stuck', c('R7') - 0.2, { z: [1.0, 1.1] }], ['condos', c('R8') - 0.2, { z: [1.0, 1.1] }], ['economists', c('R9') - 0.2, { z: [1.0, 1.08] }], ['rentlock', c('R10') - 0.2, { z: [1.18, 1.0] }]], ce('R10') + 0.6);
    banner('the flagship', 1400, 200, 80, c('R1'), { bg: K.red, out: c('R2') });
    banner('rent freeze · ~1 million stabilized apartments', 1300, 320, 44, ['R1', 'freezing'], { out: c('R2') });
    card(1430, 420, 760, 480, c('R2'), () => {
      Dm('market rent', -300, -160, 44, { align: 'left', color: K.grey }); D('$3,000', 300, -160, 64, { align: 'right' });
      Dm('controlled rent', -300, -60, 44, { align: 'left', color: K.grey }); D('$2,000', 300, -60, 64, { align: 'right', color: K.red, alpha: fadeIn(w('R2', 'two thousand'), 0.2) });
      if (T > c('R3')) { box(-310, 10, 620, 6, K.black); D('tenant +$1,000/mo', 0, 90, 56, { color: K.green }); D('where from?', 0, 180, 48, { alpha: fadeIn(w('R3', 'Where'), 0.2) }); } else KC += 5;
    }, { out: ['R4', 'one person'] });
    banner('not the city', 1300, 180, 60, ['R4', 'Not from the city'], { out: c('R5') });
    banner('not taxpayers', 1300, 290, 60, ['R4', 'Not from taxpayers'], { out: c('R5') });
    stampX('landlord −$1,000/mo', 1300, 860, 80, ['R4', 'one person'], { out: c('R5') });
    card(960, 470, 1400, 420, c('R5'), () => {
      D('a $1,000 housing voucher', 0, -100, 72, { color: K.green });
      D('funded by a $1,000 tax on one landlord', 0, 10, 58, { color: K.red, alpha: fadeIn(w('R5', 'funded'), 0.2) });
      D('chosen more or less at random', 0, 110, 46, { alpha: fadeIn(w('R5', 'random'), 0.2) });
    }, { out: c('R5b') });
    card(1380, 420, 860, 520, c('R5b'), () => {
      D('rent control', 0, -190, 56, { color: K.grey });
      D('= eviction control', 0, -110, 70, { color: K.red, alpha: fadeIn(w('R5b', 'eviction control'), 0.2) });
      rows([['legal right to renew', ['R5b', 'right to renew']], ["can't end the lease over price", ['R5b', "can't end"]]], -360, 0, 46, 80);
      D('the tax never expires', 0, 190, 52, { alpha: fadeIn(w('R5b', 'never expires'), 0.2) });
    }, { out: c('R6') });
    cite('NY Rent Stabilization Code, 9 NYCRR § 2523.5 (renewal leases)', c('R5b'), c('R6'));
    banner('and people respond', 960, 200, 80, c('R6'), { bg: K.red, out: c('R7') });
    banner('the discount only works here', 640, 180, 62, ['R7', 'only works'], { out: c('R8') });
    if (T > w('R7', 'job across') && T < c('R8') + 0.4) box(90, 270, 680, 280, 'rgba(21,19,17,0.82)', vis(w('R7', 'job across'), c('R8'))); else KC++;
    rows([['new job across town?', ['R7', 'job across']], ['bigger place for a baby?', ['R7', 'bigger place']], ['smaller place later?', ['R7', 'smaller place']]], 120, 330, 52, 80, { out: c('R8'), style: { color: K.cream, halo: 0 } });
    card(1420, 320, 760, 380, c('R8'), () => {
      Dm('San Francisco, after rent control expanded', 0, -130, 34, { color: K.grey });
      D('rental supply −15%', 0, -30, 76, { color: K.red, alpha: fadeIn(w('R8', 'fifteen'), 0.2) });
      Dm('condo conversions and redevelopment', 0, 60, 36);
      D('rents up for everyone else', 0, 135, 42, { alpha: fadeIn(w('R8', 'pushed up'), 0.2) });
    }, { out: c('R9') });
    cite('Diamond, McQuade & Qian, American Economic Review (2019)', c('R8'), c('R9'));
    card(1400, 420, 760, 520, c('R9'), () => {
      Dm('leading economists: did rent control', 0, -200, 32, { color: K.grey });
      Dm('make housing more affordable?', 0, -160, 32, { color: K.grey });
      const g = eOut(prog(T, w('R9', 'almost none'), w('R9', 'almost none', 0.6)));
      box(-200, 180 - 4 * g, 140, 4 * g + 0.1, K.red); box(60, 180 - 300 * g, 140, 300 * g + 0.1, K.black);
      D('2%', -130, 140 - 4 * g, 56, { color: K.red }); D('agree', -130, 220, 34);
      Dm('everyone else', 130, 220, 30);
    }, { out: c('R10') });
    cite('IGM Forum survey of economists, Chicago Booth (2012)', c('R9'), c('R10'));
    stampX('double leak', 960, 820, 120, ['R10', 'double leak']);
  }
  // 7. gift card fallacy
  function sGift() {
    plates([['giftcard', c('G1') - 0.6, { z: [1.0, 1.1] }], ['sublet', c('G3b') - 0.2, { z: [1.0, 1.08] }], ['cashmarket', c('G5') - 0.2, { z: [1.0, 1.08] }]], ce('G5') + 0.6);
    banner('the gift card fallacy', 960, 200, 92, ['G1', 'gift card fallacy'], { bg: K.red, out: c('G3') });
    if (T > w('G2', 'food card') && T < c('G3') + 0.4) box(380, 320, 1160, 300, 'rgba(21,19,17,0.82)', vis(w('G2', 'food card'), c('G3'))); else KC++;
    rows([['food card instead of cash', ['G2', 'food card']], ['housing unit instead of cash', ['G2', 'housing unit']], ['a discount instead of cash', ['G2', 'A discount']]], 960, 380, 58, 90, { align: 'center', out: c('G3'), style: { color: K.cream, halo: 0 } });
    stampX('every gift card is the sweater', 960, 860, 76, c('G3'), { out: c('G3a') });
    card(960, 470, 1460, 560, c('G3a'), () => {
      D('ask the family: what would you do with the cash?', 0, -210, 46, { color: K.red });
      rows([['buy the same thing  →  gift card = cash', ['G3a', "they'd have bought"]], ['buy something else  →  cash is worth more, by their own choice', ['G3a', 'something else']]], -660, -80, 46, 110);
      D('cash ≥ gift card. never worse.', 0, 180, 70, { alpha: fadeIn(w('G3a', 'at least'), 0.2) });
    }, { out: c('G3b') });
    banner('sublet at market rate, keep the difference', 960, 180, 58, ['G3b', 'sublet'], { out: c('G3c') });
    card(1400, 420, 800, 420, c('G3c'), () => {
      D('new york rules', 0, -150, 48, { color: K.red });
      rows([['eviction', ['G3c', 'evicted']], ['up to 3× the overcharge', ['G3c', 'three times']], ['public housing: lose the unit', ['G3c', 'public housing']]], -330, -50, 50, 90);
    }, { out: c('G3d') });
    cite('NY Rent Stabilization Code, 9 NYCRR § 2525.6', c('G3c'), c('G3d'));
    stampX('a policy with an enforcement arm', 960, 860, 72, ['G3d', 'enforcement'], { out: c('G5') });
    card(1380, 380, 820, 420, c('G5'), () => {
      Dm('"they\'ll waste it"', 0, -140, 50, { color: K.grey });
      D('19 studies', 0, -50, 80, { color: K.red });
      Dm('cash to poor families → alcohol & tobacco spending', 0, 40, 32);
      D('doesn\'t rise', 0, 120, 70, { color: K.green, alpha: fadeIn(w('G5', "doesn't go up"), 0.2) });
    });
    cite('Evans & Popova, Economic Development and Cultural Change (2017)', c('G5'));
  }
  function sShort() {
    plate('dividend', c('Q1') - 0.6, ce('Q4') + 0.6, { z: [1.0, 1.1] });
    banner('the short answer', 960, 160, 84, c('Q1'), { bg: K.red });
    card(960, 560, 1400, 560, c('Q2'), () => {
      rows([['1.  give help as cash, the same check to every citizen', c('Q2')], ['2.  fund it with taxes on pollution and land', c('Q3')], ['3.  if that falls short: one flat tax on spending', ['Q3', "If that's"]]], -640, -170, 46, 120);
      D('same help. far less waste.', 0, 200, 72, { color: K.red, alpha: fadeIn(c('Q4'), 0.2) });
    });
  }
  // 8. the parade
  function parade(name, id, label, verdict, opts = {}) {
    return () => {
      plate(name, c(id) - 0.6, ce(id) + 0.6, opts.cam || { z: [1.0, 1.1], x: [0.2, -0.2] });
      banner(label, opts.x || 960, opts.y || 170, 72, c(id), { bg: K.black });
      if (verdict) stampX(verdict[0], opts.sx || 960, opts.sy || 860, 96, verdict[1], { color: verdict[2] || K.red });
      if (opts.extra) opts.extra();
    };
  }
  const sP0 = () => { plate('giftcard', c('P0') - 0.6, ce('P0') + 0.6, { z: [1.1, 1.18] }); banner('now watch how far it goes', 960, 540, 84, c('P0'), { bg: K.red }); };
  const sP1 = parade('lottery', 'P1', 'public housing lottery', ['gift card', ['P1', 'Gift card']]);
  const sP2 = parade('snap', 'P2', 'food stamps', ['partial credit', ['P2', 'Partial credit'], K.black], { extra: () => { banner('most families: works almost like cash', 960, 290, 46, ['P2', 'almost like cash'], { bg: K.red }); banner('the loss: rules like the hot-meal ban', 960, 390, 46, ['P2', 'ban on hot'], {}); } });
  const sP3 = parade('parking', 'P3', 'free street parking', ['gift card for drivers', ['P3', 'gift card']]);
  const sP4 = () => { plate('airport', c('P4') - 0.6, ce('P4') + 0.6, { z: [1.15, 1.2] }); banner('price gouging laws: hold that thought', 960, 540, 64, c('P4'), {}); };
  const sP5 = parade('grocery', 'P5', 'city-owned grocery stores', ['gift card, with a location', ['P5', 'Gift card']], { extra: () => banner('no rent, no property tax = a subsidy', 960, 290, 46, ['P5', 'waived'], { bg: K.red }) });
  const sP6 = parade('bus', 'P6', 'fare-free buses', ['half-decent excuse', ['P6', 'half-decent'], K.black], { extra: () => { banner('fewer cars: a real case', 960, 290, 46, ['P6', 'real case'], { bg: K.green }); banner('better: charge drivers for congestion', 960, 390, 46, ['P6', 'cleaner fix'], { bg: K.red }); } });
  const sP7 = parade('port', 'P7', 'tariffs', ['same mistake, different team', ['P7', 'different team']], { extra: () => { banner('cost landed on American buyers', 960, 290, 50, ['P7', 'landed'], { bg: K.red }); cite('Amiti, Redding & Weinstein, Journal of Economic Perspectives (2019)', ['P7', 'Studies']); } });
  const sP7b = () => { paperBg(); D('not unique to socialists.', 960, 400, 90, { alpha: fadeIn(c('P7b'), 0.3) }); D('but socialism is built from it.', 960, 560, 90, { color: K.red, alpha: fadeIn(w('P7b', 'But'), 0.3) }); txt('\u262D', 1660, 860, 260, { font: "'DejaVu Sans'", weight: 400, color: K.red, alpha: fadeIn(w('P7b', 'But'), 0.4), rot: 0 }); };
  const sP8 = parade('delivery', 'P8', 'the delivery protection act', ['a hidden sales tax', ['P8', 'hidden sales tax']], { cam: { z: [1.0, 1.12], x: [-0.3, 0.3] }, extra: () => { banner("doesn't hand workers money", 960, 290, 48, ['P8', "doesn't hand"], { bg: K.red }); banner('costs on every order, including poorer buyers', 960, 390, 44, ['P8', 'every online'], {}); } });
  const sP9 = () => { plate('giftcard', c('P9') - 0.6, ce('P9') + 0.6, { z: [1.18, 1.0] }); card(960, 520, 1300, 360, c('P9'), () => { D('help in kind instead of cash', 0, -80, 64); D('paid for by a tax on some trade', 0, 30, 56, { color: K.red, alpha: fadeIn(w('P9', 'Paid'), 0.2) }); D('gift cards all the way down', 0, 120, 46, { alpha: fadeIn(ce('P9', -1.2), 0.3) }); }); };
  // 8b. surge pricing
  function sSurge() {
    plates([['airport', c('H1') - 0.6, { z: [1.0, 1.1] }], ['happyhour', c('H7') - 0.2, { z: [1.0, 1.08] }], ['airport', c('H8') - 0.2, { z: [1.1, 1.0] }]], ce('H9') + 0.6);
    banner('surge: "gouging! greed!"', 960, 180, 72, ['H1', 'Uber triples'], { bg: K.red, out: c('H2') });
    banner('thousands of travelers, only so many cars', 960, 180, 54, ['H2', 'Thousands'], { out: c('H3') });
    card(1380, 360, 820, 360, c('H3'), () => {
      rows([['stranded, sick kid, midnight', c('H3')], ['an errand that can wait', ['H3', 'errand']]], -340, -80, 50, 120);
      D('the price tells them apart', 0, 130, 48, { color: K.red, alpha: fadeIn(w('H4', 'But the price'), 0.2) });
    }, { out: c('H5') });
    card(1380, 360, 820, 300, c('H5'), () => {
      D('a surge also summons drivers', 0, -40, 56);
      Dm('tonight is the night to work', 0, 50, 42, { color: K.grey });
    }, { out: c('H6') });
    card(1380, 360, 820, 340, c('H6'), () => {
      Dm('cap the price:', 0, -110, 44, { color: K.grey });
      rows([['cars go to whoever taps first', ['H6', 'whoever taps']], ['extra drivers stay home', ['H6', 'extra drivers']]], -340, -20, 46, 90);
    }, { out: c('H7') });
    banner('surge pricing = happy hour in reverse', 960, 200, 70, ['H7', 'happy hour'], { bg: K.red, out: c('H8') });
    banner('come now, there\'s room', 600, 860, 52, ['H7', 'come now'], { out: c('H8') });
    banner('only come if it matters · drivers, show up', 1240, 960, 44, ['H7', 'only come'], { bg: K.red, out: c('H8') });
    card(960, 470, 1400, 400, c('H8'), () => {
      Dm('worried the poor can\'t afford the surge?', 0, -110, 46, { color: K.grey });
      D('a case for more money, every day of the year', 0, 0, 60, { color: K.green, alpha: fadeIn(w('H8', 'Which is a case'), 0.2) });
      D('not for breaking the signal', 0, 100, 52, { color: K.red, alpha: fadeIn(w('H8', 'Breaking'), 0.2) });
    }, { out: c('H9') });
    stampX('gift card fallacy. again.', 960, 860, 96, ['H9', 'Gift card']);
  }
  // 9. the usual critics
  function sCritics() {
    plates([['sawnet', c('C1') - 0.6, { z: [1.0, 1.1] }], ['net', c('C4') - 0.2, { z: [1.0, 1.08] }]], ce('C6') + 0.6);
    banner('the victory lap', 960, 170, 80, c('C1'), { out: c('C2') });
    if (T > w('C1', 'Scrap it') && T < c('C2') + 0.4) box(500, 270, 920, 290, 'rgba(21,19,17,0.8)', vis(w('C1', 'Scrap it'), c('C2'))); else KC++;
    rows([['scrap rent control', ['C1', 'Scrap it']], ['scrap the minimum wage', ['C1', 'Scrap the minimum']], ['scrap the food stamps', ['C1', 'Scrap the food']]], 960, 330, 60, 86, { align: 'center', out: c('C2'), style: { color: K.cream } });
    stampX('and replace them with nothing', 960, 540, 86, c('C2'), { out: c('C3') });
    banner('"you think kids shouldn\'t eat?"', 960, 860, 58, ['C3', 'kids'], { bg: K.red, raw: true, out: c('C4') });
    card(1380, 380, 820, 420, c('C4'), () => {
      D('minimum wage evidence', 0, -140, 50, { color: K.grey });
      D('mixed', 0, -40, 110, { color: K.red });
      Dm('a modest one may help more than it costs', 0, 80, 36, { alpha: fadeIn(w('C4', 'plausible'), 0.2) });
    }, { out: c('C6') });
    stampX("those aren't your only choices", 960, 860, 80, c('C6'));
  }
  // 10. trickle-down and the knob
  function knob(x, y, r, v, label, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = K.black; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = K.cream; ctx.lineWidth = 3; for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + 1.5 * i / 10); ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)); ctx.lineTo(Math.cos(a) * (r + 22), Math.sin(a) * (r + 22)); ctx.stroke(); }
    const a = Math.PI * (0.75 + 1.5 * v); ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85); ctx.stroke();
    ctx.restore(); D(label, x, y + r + 70, 40);
  }
  function sTrickle() {
    plates([['champagne', c('K1') - 0.6, { z: [1.0, 1.1] }]], ce('K3') + 0.6);
    if (T > c('K4') - 0.6) { paperBg(); } else KC++;
    if (T < c('K4')) {
      banner('"trickle-down"', 960, 170, 90, c('K1'), { bg: K.red, raw: true });
      card(1300, 520, 1000, 420, c('K2'), () => {
        D('the actual claim:', 0, -150, 44, { color: K.grey });
        D('efficiency gain > lost equity', 0, -40, 66);
        Dm('remove a distortion, and the people it was helping still come out ahead', 0, 60, 30);
        D('sometimes true. rent control? maybe.', 0, 150, 46, { color: K.red, alpha: fadeIn(c('K3'), 0.2) });
      });
    } else KC += 100;
    if (T > c('K4') - 0.6) {
      const left = clamp(0.5 + 0.35 * Math.sin((T - c('K4')) * 1.3), 0, 1);
      knob(520, 470, 150, T < c('K5') ? left : 0.5, 'how much', K.red);
      D('the fight everyone has', 520, 180, 46, { color: K.grey, alpha: fadeIn(c('K4'), 0.3) });
      const right = T > c('K6') ? eIO(prog(T, c('K6'), ce('K6'))) : 0.1;
      if (T > c('K5')) { knob(1400, 470, 150, 0.1 + 0.85 * right, 'how', K.green); D('a different knob', 1400, 180, 54, { color: K.green, alpha: fadeIn(c('K5'), 0.3) }); } else KC += 30;
      banner('hold the redistribution fixed. cut the waste.', 960, 900, 56, c('K6'), { bg: K.black, out: c('K8') });
      stampX('same redistribution. less waste.', 960, 900, 80, c('K8'));
    } else KC += 60;
  }
  // 11. theorem
  function sTheorem() {
    plate('gears', c('W1') - 0.6, ce('W4') + 0.6, { z: [1.0, 1.1] });
    card(960, 300, 1300, 260, ['W1', 'second welfare'], () => {
      D('the second welfare theorem', 0, -50, 76, { color: K.red });
      Dm('any distribution, no shrinkage, if transfers don\'t depend on what anyone does', 0, 50, 32, { alpha: fadeIn(c('W2'), 0.3) });
    }, { out: c('W4') });
    banner('real life: never perfect. much closer than now.', 960, 820, 54, c('W3'), { out: c('W4') });
    card(960, 520, 1300, 380, c('W4'), () => {
      D('how much to share?', -300, -100, 54); D('values', 300, -100, 60, { color: K.grey });
      D('how to share?', -300, 30, 54, { alpha: fadeIn(w('W4', 'How to share'), 0.2) }); D('engineering', 300, 30, 60, { color: K.red, alpha: fadeIn(w('W4', 'engineering'), 0.2) });
      D('better and worse answers', 0, 140, 44, { alpha: fadeIn(w('W4', 'better and worse'), 0.2) });
    });
  }
  // 12. taxes that don't leak
  function sTaxes() {
    plates([['factory', c('X1') - 0.6, { z: [1.0, 1.1] }], ['lot0', c('X4') - 0.2, { z: [1.0, 1.03] }], ['lot1', ['X4', 'train station', -0.1], { z: [1.03, 1.05] }], ['lot2', ['X4', 'Then shops', -0.1], { z: [1.05, 1.12] }]], ce('X8') + 0.6);
    banner("taxes that don't block trades", 960, 170, 72, c('X1'), { out: c('X2') });
    banner('negative externality', 640, 170, 64, ['X2', 'negative externality'], { bg: K.red, out: c('X3') });
    card(1360, 340, 860, 400, c('X3'), () => {
      D('pollution tax', 0, -130, 64, { color: K.red });
      D('removes deadweight loss', 0, -30, 54, { alpha: fadeIn(w('X3', 'removes'), 0.2) });
      Dm('Pigou, The Economics of Welfare (1920)', 0, 60, 30, { color: K.grey, alpha: fadeIn(w('X3', 'Pigou'), 0.2) });
      D('grows the pie', 0, 140, 56, { color: K.green, alpha: fadeIn(w('X3', 'makes the pie'), 0.2) });
    }, { out: c('X4') });
    const v = [[c('X4'), 1], [w('X4', 'train station'), 2], [w('X4', 'shops'), 3], [w('X4', 'hospital'), 4], [w('X4', 'neighbors'), 5]].filter(([t0]) => T > t0).length;
    card(1640, 190, 420, 200, c('X4'), () => { Dm('land value', 0, -50, 40, { color: K.grey }); D('$'.repeat(Math.max(1, v)), 0, 30, 84, { color: K.green }); }, { out: c('X6') });
    banner("the owner didn't do any of that", 960, 960, 60, c('X5'), { out: c('X6') });
    banner('a positive externality, captured by the deed', 960, 860, 46, ['X5', 'positive externality'], { bg: K.red, out: c('X6') });
    card(560, 260, 900, 300, c('X6'), () => {
      D("the payer isn't the creator", 0, -70, 54);
      ['build', 'sell', 'work', 'do nothing'].forEach((wd, i) => { const q = [['X6', 'build,'], ['X6', 'sell,'], ['X6', 'work,'], ['X6', 'lawn chair']][i]; D(wd, -330 + i * 205, 25, 38, { alpha: fadeIn(at(q), 0.2), color: K.grey }); });
      D('same bill either way', 0, 100, 48, { color: K.red, alpha: fadeIn(w('X6', 'Nothing they do'), 0.2) });
    }, { out: c('X7') });
    stampX('no deadweight loss', 960, 900, 90, ['X6', 'No deadweight'], { out: c('X7') });
    card(1300, 330, 1000, 380, c('X7'), () => {
      D('Henry George, 1879', 0, -120, 54, { color: K.red });
      Dm('a land tax alone could fund the government', 0, -30, 40);
      Dm('drop other taxes → the rental value of land rises', 0, 50, 36, { alpha: fadeIn(w('X7', 'scrapping'), 0.2) });
      Dm('Progress and Poverty', 0, 130, 28, { color: K.grey });
    }, { out: c('X8') });
    banner('any shortfall: one flat tax on consumption', 960, 200, 58, c('X8'), { bg: K.red });
    banner('that part shrinks the pie a little. keep it small.', 960, 320, 46, ['X8', 'shrinks'], {});
  }
  // 13. marginal vs effective
  function sTable() {
    paperBg();
    D('which "progressive"?', 960, 120, 76, { alpha: fadeIn(c('E1'), 0.3), color: K.black });
    if (T < c('E5')) {
      card(960, 520, 1400, 460, c('E3'), () => {
        D('marginal rate', -320, -140, 60, { color: K.red }); Dm('tax on your next dollar', -320, -60, 40);
        D('effective rate', 320, -140, 60, { alpha: fadeIn(w('E3', 'effective'), 0.2) }); Dm('tax on everything, as a share', 320, -60, 40, { alpha: fadeIn(w('E3', 'effective'), 0.2) });
        D('progressive effective rates need progressive marginal rates?', 0, 90, 40, { alpha: fadeIn(c('E4'), 0.2) });
        stampX('no', 0, 170, 70, ['E4', "You don't"]);
      });
    } else {
      D('40% flat tax + $10,000 per citizen', 960, 220, 60, { color: K.red, alpha: fadeIn(c('E5'), 0.3) });
      M('(income or spending: same arithmetic if you spend what you earn)', 960, 280, 24, { color: K.grey, alpha: fadeIn(w('E5', 'On income'), 0.3) });
      const cols = [['earn', 330], ['tax', 720], ['dividend', 1060], ['take home', 1380], ['effective', 1680]];
      cols.forEach(([s, x]) => Dm(s, x, 370, 40, { color: K.grey, alpha: fadeIn(c('E6'), 0.3) }));
      box(160, 405, 1640, 5, K.black, fadeIn(c('E6'), 0.3));
      const fmt = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
      [[12000, c('E6')], [50000, ['E7', 'fifty']], [100000, ['E7', 'hundred']], [1000000, ['E7', 'million']]].forEach(([e, q], i) => {
        const a = fadeIn(at(q), 0.25), y = 470 + i * 105, tax = e * 0.4, r = (tax - 10000) / e;
        M(fmt(e), 330, y, 46, { alpha: a }); M(fmt(tax), 720, y, 46, { alpha: a, color: K.red }); M('$10,000', 1060, y, 46, { alpha: a, color: K.green });
        M(fmt(e - tax + 10000), 1380, y, 46, { alpha: a }); M(Math.round(r * 100) + '%', 1680, y, 50, { alpha: a, color: r < 0 ? K.green : K.black });
      });
      stampX('one marginal rate. progressive effective rates.', 960, 930, 56, c('E8'));
    }
  }
  function sCliff() {
    plates([['cliff', c('E9') - 0.6, { z: [1.0, 1.1] }], ['paycheck', c('E10c') - 0.2, { z: [1.0, 1.1] }]], ce('E10c') + 0.6);
    banner('the ugliest number in the welfare state', 960, 170, 60, ['E9', 'ugliest'], { bg: K.red, out: c('E10') });
    card(1380, 420, 820, 560, c('E10'), () => {
      Dm('single parent, California, two kids', 0, -230, 34, { color: K.grey });
      Dm('pays rent and childcare · double the pay', 0, -185, 30, { color: K.grey });
      D('keeps ~1/5', 0, -80, 96, { alpha: fadeIn(w('E10', 'fifth'), 0.2) });
      D('78%', -170, 90, 110, { color: K.red, alpha: fadeIn(w('E10', 'eighty'), 0.2) }); Dm('effective marginal rate', -170, 170, 30, { alpha: fadeIn(w('E10', 'eighty'), 0.2) });
      D('37%', 190, 90, 80, { color: K.grey, alpha: fadeIn(c('E10b'), 0.2) }); Dm('top federal rate', 190, 170, 30, { alpha: fadeIn(c('E10b'), 0.2) });
    }, { out: c('E10c') });
    cite('PolicyEngine (Ghenis, 2023), "Means testing and universalism"', c('E10'), c('E10c'));
    banner('higher than a billionaire\'s', 640, 880, 58, ['E10b', 'billionaire'], { bg: K.red, out: c('E10c') });
    card(1380, 380, 760, 400, c('E10c'), () => {
      Dm('minimum wage', -170, -120, 40, { color: K.grey }); Dm('after an 80% rate', 190, -120, 40, { color: K.grey });
      D('$15', -170, 0, 120); D('→', 10, 0, 90); D('$3', 190, 0, 120, { color: K.red, alpha: fadeIn(w('E10c', 'three-dollar'), 0.2) });
      Dm('nobody mentions the second number', 0, 130, 34, { alpha: fadeIn(w('E10c', 'second'), 0.2) });
    });
  }
  function sUniversal() {
    plates([['dividend', c('E11') - 0.6, { z: [1.0, 1.1] }]], ce('E11b2') + 0.6);
    stampX('no cliff', 960, 200, 110, c('E11'), { color: K.green });
    card(960, 560, 1400, 520, c('E11b'), () => {
      D('what the check doesn\'t need', 0, -190, 54, { color: K.red });
      rows([['no means test', ['E11b', 'No means']], ['no caseworkers', ['E11b', 'caseworkers']], ['no penalty for a good month', ['E11b', 'good month']]], -560, -90, 52, 86);
      D('replace the patchwork. don\'t stack on it.', 0, 190, 50, { alpha: fadeIn(w('E11b', 'replaces'), 0.2) });
    }, { out: c('E11b2') });
    card(960, 520, 1400, 460, c('E11b2'), () => {
      Dm('"handouts make people lazy"?', 0, -170, 46, { color: K.grey });
      D('substitution effect ≈ 5 × income effect', 0, -60, 62, { color: K.red, alpha: fadeIn(w('E11b2', 'five times'), 0.2) });
      Dm('how much of the next dollar you keep  ≫  having more money', 0, 30, 34, { alpha: fadeIn(w('E11b2', 'next dollar'), 0.2) });
      D('what kills work: means-tested marginal rates', 0, 140, 46, { alpha: fadeIn(w('E11b2', 'kills'), 0.2) });
    });
    cite('CBO, How the Supply of Labor Responds to Changes in Fiscal Policy (2012), central estimates', c('E11b2'));
  }
  function sTiming() {
    paperBg();
    D('brackets punish uneven income', 960, 130, 70, { alpha: fadeIn(c('E11c'), 0.3) });
    M('10% on the first $50,000 · 30% above', 960, 210, 34, { color: K.grey, alpha: fadeIn(w('E11c', 'ten percent'), 0.3) });
    const rowsT = [['steady', '$50k + $50k', '$10,000', ['E11d', 'Earn fifty']], ['lumpy', '$100k + $0', '$20,000', ['E11d', 'hundred thousand']]];
    rowsT.forEach(([n, e, t, q], i) => { const a = fadeIn(at(q), 0.3), y = 340 + i * 120; D(n, 300, y, 56, { alpha: a }); M(e, 800, y, 50, { alpha: a }); M(t, 1300, y, 56, { alpha: a, color: i ? K.red : K.black }); });
    stampX('2× the tax, same income', 1500, 640, 54, ['E11d', 'Twice']);
    rows([['freelancers', ['E11e', 'Freelancers']], ['farmers', ['E11e', 'Farmers']], ['construction workers', ['E11e', 'Construction']], ['artists', ['E11e', 'Artists']], ['a newborn year', ['E11e', 'newborn']]], 300, 640, 44, 60, { style: { color: K.black } });
    card(1300, 760, 860, 300, c('E11f'), () => {
      D('flat rate + dividend', 0, -70, 52, { color: K.green });
      M('steady: $20,000   lumpy: $20,000', 0, 20, 38);
      Dm('over two years, exactly the same', 0, 90, 36);
    });
  }
  function sMillionaire() {
    plates([['dividend', c('E12') - 0.6, { z: [1.1, 1.18] }], ['friedman', c('E16') - 0.2, { z: [1.0, 1.08] }]], ce('E16') + 0.6);
    banner('why should a millionaire get a check?', 960, 170, 64, c('E12'), { bg: K.red, out: c('E15') });
    card(1300, 520, 1000, 520, c('E13'), () => {
      D('look at the taxes too', 0, -200, 52, { color: K.grey });
      D('millionaire: +$10,000', 0, -100, 58, { color: K.green, alpha: fadeIn(w('E13', 'gets ten'), 0.2) });
      D('−$400,000', 0, -10, 76, { color: K.red, alpha: fadeIn(w('E13', 'four hundred'), 0.2) });
      Dm('counting only what funds the checks:', 0, 80, 32, { alpha: fadeIn(w('E13', 'count only'), 0.2) });
      Dm('above ~average income: pay in more than you get', 0, 125, 32, { alpha: fadeIn(w('E13', 'above roughly'), 0.2) });
      D('the check is bookkeeping', 0, 200, 50, { alpha: fadeIn(w('E13', 'bookkeeping'), 0.2) });
    }, { out: c('E15') });
    card(1300, 480, 1000, 420, c('E15'), () => {
      Dm('object to rich people getting a check?', 0, -130, 40, { color: K.grey });
      D('a price cap discounts every buyer', 0, -30, 54);
      D('with no tax clawing it back', 0, 50, 54, { color: K.red, alpha: fadeIn(w('E15', 'clawing'), 0.2) });
      stampX('much worse offender', 0, 140, 50, ['E15', 'worse offender']);
    }, { out: c('E16') });
    card(1340, 400, 900, 380, c('E16'), () => {
      D('Milton Friedman, 1962', 0, -120, 56, { color: K.red });
      D('the negative income tax', 0, -30, 56);
      Dm('phase-out rate = flat tax rate → identical to a dividend', 0, 60, 30, { alpha: fadeIn(w('E16', 'Set the rate'), 0.2) });
      D('faster phase-out = the cliff, rebuilt', 0, 130, 40, { color: K.red, alpha: fadeIn(w('E16', 'rebuilt'), 0.2) });
    });
    cite('Friedman, Capitalism and Freedom (1962)', c('E16'));
  }
  // 14. close
  function sClose() {
    plates([['night', c('Z1') - 0.6, { z: [1.0, 1.12] }], ['rentlock', c('Z5') - 0.2, { z: [1.0, 1.08] }], ['dividend', c('Z6') - 0.2, { z: [1.0, 1.08] }]], ce('Z6') + 0.6);
    banner('back to New York', 960, 200, 80, c('Z1'), { raw: false, out: c('Z2') });
    card(1340, 380, 900, 340, c('Z2'), () => {
      D('want workers to have more money?', 0, -80, 50);
      D('give them money', 0, 10, 80, { color: K.green, alpha: fadeIn(w('Z2', 'give them'), 0.2) });
      Dm('in the open · funded by taxes that don\'t block trades', 0, 100, 32, { alpha: fadeIn(w('Z2', 'Out in'), 0.2) });
    }, { out: c('Z3') });
    banner('instead: the bill hides in every order', 960, 200, 60, c('Z3'), { bg: K.red, out: c('Z4') });
    stampX('then it\'s called greed', 960, 860, 88, ['Z3', 'greed'], { out: c('Z4') });
    card(960, 520, 1400, 460, c('Z4'), () => {
      D('the socialist toolkit in one move', 0, -170, 48, { color: K.grey });
      rows([['good intentions', ['Z4', 'Good intentions']], ['delivered by gift card', ['Z4', 'delivered']], ['paid for by a tax nobody can see', ['Z4', 'paid for']], ['blamed on someone else', ['Z4', 'blamed']]], -560, -80, 56, 80);
    }, { out: c('Z5') });
    banner('people deserve a home? agreed.', 960, 180, 64, ['Z5', 'deserve a home'], { out: c('Z6') });
    banner('so why pin them to one apartment?', 960, 300, 64, ['Z5', 'pin them'], { bg: K.red, out: c('Z6') });
    card(960, 520, 1300, 360, c('Z6'), () => {
      D('zero · a little · a lot', 0, -90, 64, { color: K.grey });
      D('cash delivers it cheaper', 0, 20, 84, { color: K.red, alpha: fadeIn(w('Z6', 'cash delivers'), 0.2) });
    });
  }
  function sEnd() {
    const t0 = c('Z7') - 0.4;
    plate('liberty', t0, ce('Z8') + 6, { z: [1.16, 1.24] });
    box(0, 300, W, 420, 'rgba(21,19,17,0.9)', fadeIn(t0, 0.4));
    D('caring about the poor is the easy part.', 960, 400, 70, { color: K.cream, alpha: fadeIn(c('Z7'), 0.3) });
    D('doing the math is harder.', 960, 500, 70, { color: K.red, alpha: fadeIn(w('Z7', 'Doing'), 0.3) });
    D('whatever you think people deserve,', 960, 600, 46, { color: K.cream, alpha: fadeIn(c('Z8'), 0.3) });
    D('give it to them in cash.', 960, 660, 56, { color: K.cream, alpha: fadeIn(w('Z8', 'give it'), 0.3) });
    M('economic physics', 960, 760, 28, { color: K.cream, alpha: fadeIn(ce('Z8', 0.5), 0.4) });
  }

  // 14b. neoliberalism, reclaimed: a turn to full-color daylight
  function sNeo() {
    plates([['colloquium', c('L1') - 0.6, { z: [1.0, 1.08] }], ['liberty', c('L4') - 0.2, { z: [1.0, 1.1] }], ['pride', ['L4', 'freedom to love', -0.2], { z: [1.0, 1.08] }], ['energy', ['L4', 'Solar', -0.2], { z: [1.0, 1.08] }], ['liberty', ['L4', 'safety net', -0.2], { z: [1.1, 1.16] }]], ce('L4') + 0.6);
    const B = '#1f4e8c', G = '#d9a21b';
    banner('neoliberalism', 960, 200, 110, ['L1', 'Neoliberalism'], { bg: B, shadowCol: G, out: c('L2') });
    card(1340, 380, 900, 420, c('L2'), () => {
      Dm('coined at', 0, -140, 40, { color: K.grey });
      D('the Walter Lippmann Colloquium', 0, -60, 54, { color: B });
      D('Paris, 1938', 0, 20, 70);
      Dm('after laissez-faire collapsed, as communism and fascism rose', 0, 120, 30, { alpha: fadeIn(w('L2', 'collapse'), 0.2) });
    }, { out: c('L3') });
    card(1340, 420, 900, 520, c('L3'), () => {
      D('a third road', 0, -200, 64, { color: B });
      rows([['keep the market economy', ['L3', 'Keep the market']], ['write the rules', ['L3', 'write the rules']], ['correct market failures', ['L3', 'correct']], ['nobody falls through', ['L3', 'nobody falls']]], -360, -100, 50, 76);
      Dm('Hayek, The Road to Serfdom (1944) · Mont Pelerin Society (1947)', 0, 215, 26, { color: K.grey, alpha: fadeIn(w('L3', 'Hayek'), 0.2) });
    }, { out: c('L4') });
    banner('a market economy and an open society', 960, 180, 62, c('L4'), { bg: B, shadowCol: G, out: ['L4', 'freedom to love'] });
    banner('in cash, without the waste', 960, 880, 72, ['L4', 'in cash'], { bg: G, fg: K.black, shadowCol: B });
  }

  // ---------- assembly ----------
  function buildScenes() {
    const S = (id, draw, paper = false, lead = 0.6) => ({ start: Math.max(0, c(id) - lead), draw, paper });
    SCN = [
      { start: 0, draw: sDelivery }, S('O2', sPost, true, 0.5), S('O2b', sRules), S('O3', sCharity), S('O6', sMayor), S('O7', sMenu),
      { start: ce('O8') - 0.1, draw: sTitle },
      S('N1', sNot), S('M1', sMeaning), S('D1', sSweater), S('T1', sRoof), S('R1', sRent), S('G1', sGift), S('Q1', sShort),
      S('P0', sP0), S('P1', sP1), S('P2', sP2), S('P3', sP3), S('P4', sP4), S('P5', sP5), S('P6', sP6), S('P7', sP7), S('P7b', sP7b, true), S('P8', sP8), S('P9', sP9),
      S('H1', sSurge), S('C1', sCritics), S('K1', sTrickle), S('W1', sTheorem), S('X1', sTaxes),
      S('E1', sTable, true), S('E9', sCliff), S('E11', sUniversal), S('E11c', sTiming, true), S('E12', sMillionaire),
      S('Z1', sClose), S('L1', sNeo), S('Z7', sEnd),
    ];
    const E = [];
    SCN.slice(1).forEach((s) => E.push({ name: 'cut', t: s.start + 0.05 }));
    E.push({ name: 'title', t: ce('O8') + 0.3 });
    EVENTS = E.sort((a, b) => a.t - b.t);
  }


  function wrapLines(s, max) {
    const words = s.split(' '), out = []; let cur = '';
    words.forEach((w) => { if ((cur + ' ' + w).trim().length > max) { out.push(cur.trim()); cur = w; } else cur += ' ' + w; });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function drawCaption(t) {
    const id = TL.order.find((k) => t >= TL.lines[k].start - 0.1 && t <= TL.lines[k].end + 0.2);
    if (!id) return;
    const rows = wrapLines(TL.lines[id].text, 64);
    ctx.save();
    ctx.font = `500 38px 'Oswald'`;
    const w = Math.max(...rows.map((r) => ctx.measureText(r).width)) + 60, h = rows.length * 48 + 24;
    ctx.fillStyle = 'rgba(42,38,51,0.78)';
    ctx.fillRect(960 - w / 2, 1060 - h, w, h);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    rows.forEach((r, i) => ctx.fillText(r, 960, 1060 - h + 36 + i * 48));
    ctx.restore();
  }

  function render(t) {
    T = t; KC = 0;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(PAPER, 0, 0, W, H);
    let i = 0; for (let k = 0; k < SCN.length; k++) if (SCN[k].start <= t) i = k;
    const TR = 0.6, dt = t - SCN[i].start;
    const one = (k, a) => {
      ctx.save(); ctx.globalAlpha = a; KC = k * 5000;
      if (SCN[k].paper) ctx.drawImage(PAPER, 0, 0, W, H);
      SCN[k].draw(t); ctx.restore();
    };
    if (i > 0 && dt < TR) { one(i - 1, 1); one(i, eIO(dt / TR)); }
    else one(i, 1);
    if (CAPTIONS) drawCaption(t);
    const fi = 1 - prog(t, 0, 0.6), fo = prog(t, TL.total - 0.8, TL.total);
    if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(248,241,227,${Math.max(fi * 0.0, fo)})`; ctx.fillRect(0, 0, W, H); }
    if (fi > 0) { ctx.fillStyle = `rgba(0,0,0,${fi})`; ctx.fillRect(0, 0, W, H); }
  }

  function srt() {
    const f = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, se = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(se).padStart(2, '0')},${String(r).padStart(3, '0')}`; };
    let n = 1, out = '';
    TL.order.forEach((id) => {
      const L = TL.lines[id];
      // split long lines into sentence-ish chunks, time proportional to length
      const parts = L.text.match(/[^.?!:]+[.?!:]*\s*/g) || [L.text];
      const total = parts.reduce((s, p) => s + p.length, 0); let acc = 0;
      parts.forEach((p) => {
        const a = L.start + (acc / total) * L.dur; acc += p.length; const b = L.start + (acc / total) * L.dur;
        out += `${n++}\n${f(a)} --> ${f(b)}\n${wrapLines(p.trim(), 42).join('\n')}\n\n`;
      });
    });
    return out;
  }

  async function loadNarration(ac) {
    let man = null;
    try { const r = await fetch('../narration/manifest.json', { cache: 'no-store' }); if (r.ok) man = await r.json(); } catch (e) { /* no narration yet */ }
    if (!man) return { durs: null, bufs: {} };
    const durs = {}, bufs = {};
    await Promise.all(Object.keys(man.lines).map(async (id) => {
      const info = man.lines[id];
      durs[id] = { duration: info.duration, chars: info.chars };
      if (ac) {
        try { const r = await fetch('../narration/' + info.file); bufs[id] = await ac.decodeAudioData(await r.arrayBuffer()); } catch (e) { console.warn('narration', id, e); }
      }
    }));
    return { durs, bufs, voice: man.voice };
  }

  async function init() {
    cv = document.getElementById('c');
    ctx = cv.getContext('2d');
    rc = rough.canvas(cv);
    const fonts = [
      new FontFace('Oswald', 'url(fonts/oswald-latin-700-normal.woff2)', { weight: '700' }),
      new FontFace('Oswald', 'url(fonts/oswald-latin-500-normal.woff2)', { weight: '500' }),
      new FontFace('Oswald', 'url(fonts/oswald-latin-400-normal.woff2)', { weight: '400' }),
      new FontFace('IBM Plex Mono', 'url(fonts/ibm-plex-mono-latin-500-normal.woff2)', { weight: '500' }),
      new FontFace('IBM Plex Mono', 'url(fonts/ibm-plex-mono-latin-400-normal.woff2)', { weight: '400' }),
      new FontFace('Caveat', 'url(fonts/caveat-latin-700-normal.woff2)', { weight: '700' }),
      new FontFace('Patrick Hand', 'url(fonts/patrick-hand-latin-400-normal.woff2)', { weight: '400' }),
    ];
    await Promise.all(fonts.map((f) => f.load().then((ff) => document.fonts.add(ff))));
    SCRIPT = await (await fetch('script.json', { cache: 'no-store' })).json();
    const tmp = new (window.OfflineAudioContext)(2, 48000, 48000);
    const n = await loadNarration(tmp);
    NARR = n.bufs;
    TL = buildTimeline(SCRIPT, n.durs);
    const names = (await (await fetch('../gemini/plates.json', { cache: 'no-store' })).json());
    await Promise.all(names.map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[n] = im; res(); }; im.onerror = () => { console.warn('missing plate', n); res(); }; im.src = '../gemini/plates/' + n + '.jpg'; })));
    buildScenes();
    PAPER = makePaper();
    return { duration: TL.total, hasNarration: !!n.durs };
  }

  function setScale(s) { SCALE = s; cv.width = Math.round(W * s); cv.height = Math.round(H * s); }

  async function renderAudio() {
    const sr = 48000, ac = new OfflineAudioContext(2, Math.ceil(TL.total * sr), sr);
    // re-decode narration into this context's sample rate
    const n = await loadNarration(ac);
    EPAudio.build(ac, { TL, events: EVENTS, narr: n.bufs, from: 0, base: 0 });
    const buf = await ac.startRendering();
    window.__wav = EPAudio.wav(buf);
    return window.__wav.length;
  }
  // hand the WAV back in base64 slices; one giant string over CDP is pathologically slow
  function audioChunk(i, size) {
    const sub = window.__wav.subarray(i, i + size);
    let s = ''; const CH = 0x8000;
    for (let k = 0; k < sub.length; k += CH) s += String.fromCharCode.apply(null, sub.subarray(k, k + CH));
    return btoa(s);
  }

  window.EP = {
    ready: null,
    get duration() { return TL.total; },
    render,
    setScale,
    setCaptions(v) { CAPTIONS = !!v; },
    frame(t, q = 0.92) { render(t); return cv.toDataURL('image/jpeg', q); },
    renderAudio,
    audioChunk,
    srt,
    timeline: () => TL,
    events: () => EVENTS,
  };
  window.EP.ready = init();

  // ---------- live preview player ----------
  window.addEventListener('DOMContentLoaded', () => {
    if (Q.has('render')) return;
    const ui = document.getElementById('ui');
    let ac = null, t0 = 0, from = 0, playing = false, raf = 0, live = null;
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const tick = () => {
      const t = playing ? from + (ac.currentTime - t0) : from;
      render(Math.min(t, TL.total));
      document.getElementById('time').textContent = `${fmt(t)} / ${fmt(TL.total)}`;
      document.getElementById('bar').style.width = `${(100 * t) / TL.total}%`;
      if (playing && t >= TL.total) stop();
      raf = requestAnimationFrame(tick);
    };
    async function play(at) {
      if (ac) await ac.close();
      ac = new AudioContext({ sampleRate: 48000 });
      const n = await loadNarration(ac);
      from = at; t0 = ac.currentTime + 0.12;
      live = EPAudio.build(ac, { TL, events: EVENTS, narr: n.bufs, from, base: t0 });
      playing = true; ui.classList.add('playing');
    }
    function stop() { if (ac) { from = from + (ac.currentTime - t0); ac.close(); ac = null; } playing = false; ui.classList.remove('playing'); }
    EP.ready.then(() => {
      tick();
      document.getElementById('play').onclick = () => (playing ? stop() : play(from >= TL.total - 0.1 ? 0 : from));
      document.getElementById('seek').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); const at = ((e.clientX - r.left) / r.width) * TL.total; if (playing) play(at); else from = at; };
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); document.getElementById('play').click(); }
        if (e.key === 'c') CAPTIONS = !CAPTIONS;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const at = clamp((playing ? from + ac.currentTime - t0 : from) + (e.key === 'ArrowRight' ? 5 : -5), 0, TL.total); if (playing) play(at); else from = at; }
      });
    });
    void raf; void live;
  });
})();
