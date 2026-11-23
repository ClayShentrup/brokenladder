// "the case against voting": constructivist plates with canvas overlays.
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

  // ---------- extra helpers ----------
  const BLUE = K.blue, GOLD = K.gold, ORANGE = K.orange;
  const quoteCard = (x, y, w, h, q, linesTxt, who, op = {}) => card(x, y, w, h, q, () => {
    const n = linesTxt.length, sz = op.size || 46, gap = sz * 1.3, y0 = -((n - 1) * gap) / 2 - (who ? 30 : 0);
    linesTxt.forEach((s, i) => Dm(s, 0, y0 + i * gap, sz, { color: K.black }));
    if (who) M(who, 0, y0 + n * gap + 20, 26, { color: K.grey });
  }, op);
  // a row of seats; spec: [[label, colour], ...]
  function seats(list, x, y, size, gap, a0, op = {}) {
    list.forEach(([lab, col, q], i) => {
      const a = q != null ? vis(at(q), op.out != null ? at(op.out) : null) : a0;
      if (a <= 0) { KC += 2; return; }
      const cx = x + i * gap;
      box(cx - size / 2 + 6, y - size / 2 + 6, size, size, K.black, a * 0.9);
      box(cx - size / 2, y - size / 2, size, size, col, a);
      frame(cx - size / 2, y - size / 2, size, size, K.black, 4, a);
      if (lab) M(lab, cx, y + size / 2 + 34, op.labSize || 22, { color: K.black, alpha: a });
    });
  }
  // horizontal bar, grows on cue
  function hbar(x, y, wFull, h, col, q, lab, val, op = {}) {
    const t0 = at(q), u = eOut(prog(T, t0, t0 + 0.6));
    if (u <= 0) { KC += 3; return; }
    box(x, y - h / 2, wFull * u, h, col);
    frame(x, y - h / 2, wFull * u, h, K.black, 3);
    if (lab) D(lab, x - 20, y + 2, op.labSize || 40, { align: 'right', alpha: u });
    if (val) D(val, x + wFull * u + 20, y + 2, op.valSize || 44, { align: 'left', alpha: clamp(u * 1.5 - 0.5), color: op.valCol || K.black });
  }
  const dim = (a) => box(0, 0, W, H, 'rgba(20,20,20,0.35)', a);

  // ---------- scenes ----------
  // 1. cold open
  function sOpen() {
    plates([['dais', 0, { z: [1.12, 1.0], x: [0.3, -0.2] }], ['memo', c('O2') - 0.3, { z: [1.0, 1.1] }], ['walkout', c('O3') - 0.3, { z: [1.0, 1.12], x: [-0.2, 0.2] }]], ce('O4') + 0.6);
    banner('Henry County, Georgia', 960, 190, 86, ['O1', 'Henry County'], { out: c('O2') });
    banner('late 2025 · ethics board hearing', 960, 300, 46, ['O1', 'Late'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('O2') });
    banner('9 county employees subpoenaed', 960, 880, 62, ['O1', 'subpoenaed'], { bg: BLUE, out: c('O2') });
    cite('Henry County Board of Ethics hearing video, 2025', ['O1', 'hearing'], c('O2'));
    quoteCard(1180, 520, 1240, 420, ['O2', 'reads a message'], ['"It was Chair Harrell\'s request...', 'the County Attorney advised them that', 'the Board of Ethics does not have', 'the authority to subpoena employees."'], 'ethics administrator, on the record · video at 46:48', { out: c('O3'), size: 42 });
    stampX('9 witnesses walk out', 960, 820, 100, ['O3', 'walk out'], { out: ce('O4', 0.3) });
    banner('usually: the investigation quietly dies', 960, 190, 58, ['O4', 'quietly dies'], { bg: K.black, out: ce('O4', 0.3) });
  }
  function sCounter() {
    plates([['dais', c('O5') - 0.6, { z: [1.0, 1.1] }], ['jurybox', w('O6', 'picked by a jury', -0.3), { z: [1.06, 1.0] }]], ce('O6') + 0.6);
    banner("this board didn't fold", 960, 200, 86, c('O5'), { out: c('O6') });
    stampX('investigate the chair herself', 960, 820, 80, ['O5', 'investigation'], { out: c('O6') });
    banner('elected by voters? no.', 960, 200, 64, ['O6', 'elected by voters'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: ce('O6', 0.2) });
    banner('appointed by politicians? no.', 960, 310, 64, ['O6', 'appointed'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: ce('O6', 0.2) });
    banner('picked by a jury', 960, 880, 110, ['O6', 'picked by a jury'], { bg: BLUE, out: ce('O6', 0.2) });
  }
  function sTitle() {
    const t0 = ce('O6') + 0.1;
    plate('title', t0 - 0.5, t0 + 5, { z: [1.06, 1.0] });
    const a = fadeIn(t0 + 0.3, 0.3);
    box(0, 150, W, 360, 'rgba(20,20,20,0.88)', a * eOut(prog(T, t0 + 0.2, t0 + 0.6)));
    D('the case', 960, 250, 120, { color: K.cream, alpha: fadeIn(t0 + 0.5, 0.25) });
    D('against voting', 960, 395, 150, { color: GOLD, alpha: fadeIn(t0 + 0.9, 0.25) });
    M('election by jury', 960, 478, 30, { color: K.cream, alpha: fadeIn(t0 + 1.6, 0.3) });
  }

  // 2. two jobs
  function sJobs() {
    plate('scales', c('A1') - 0.6, ce('A6') + 0.6, { z: [1.0, 1.1] });
    card(960, 470, 1500, 560, c('A1'), () => {
      D('any system for choosing leaders has two jobs', 0, -210, 46, { color: K.grey });
      box(-4, -160, 8, 190, K.black);
      D('1. alignment', -370, -100, 70, { color: BLUE, alpha: fadeIn(w('A2', 'alignment'), 0.2) });
      Dm('deciders want what the public wants', -370, -20, 34, { alpha: fadeIn(w('A2', 'want what'), 0.2) });
      D('2. competence', 370, -100, 70, { color: GOLD, alpha: fadeIn(w('A3', 'competence'), 0.2) });
      Dm('deciders know what they\'re choosing', 370, -20, 34, { alpha: fadeIn(w('A3', 'know what'), 0.2) });
      const row = (lab, y, q, a1, a2) => { const a = fadeIn(at(q), 0.2); if (a <= 0) { KC += 3; return; } D(lab, 0, y, 40, { alpha: a, color: K.grey }); D(a1, -370, y, 54, { alpha: a, color: a1 === '✗' ? ORANGE : BLUE }); D(a2, 370, y, 54, { alpha: a, color: a2 === '✗' ? ORANGE : BLUE }); };
      row('a king', 80, ['A4', 'king'], '✗', '·');
      row('experts', 150, ['A4', 'experts'], '✗', '✓');
      row('mass elections', 220, ['A5', 'Mass elections'], '✓?', '✓?');
    });
    banner("let's check", 960, 900, 80, c('A6'), { bg: BLUE });
  }

  // 3. competence
  function sOdds() {
    plate('needle', c('R1') - 0.6, ce('R2') + 0.6, { z: [1.12, 1.0] });
    banner('your vote almost certainly won\'t change the result', 960, 180, 54, ['R1', 'almost certainly'], { out: c('R2') });
    card(960, 500, 1200, 380, ['R2', 'one in sixty million'], () => {
      Dm('chance one ballot decides a presidential election', 0, -110, 38, { color: K.grey });
      D('1 in 60,000,000', 0, 10, 130, { color: BLUE });
      Dm('local races: better odds, still almost never', 0, 120, 36, { alpha: fadeIn(w('R2', 'Local races'), 0.2) });
    });
    cite('Gelman, Silver & Edlin, Economic Inquiry, 2012 (2008 average)', ['R2', 'one in sixty']);
  }
  function sIgnorance() {
    plate('homework', c('R3') - 0.6, ce('R5') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    card(560, 480, 900, 520, c('R3'), () => {
      D('the homework', 0, -190, 56, { color: K.grey });
      rows([['cost: hours of reading', ['R3', 'takes hours']], ['payoff: ≈ 0', ['R3', 'close to zero']]], -380, -80, 60, 100);
      D('rational ignorance', 0, 140, 72, { color: BLUE, alpha: fadeIn(w('R4', 'Rational ignorance'), 0.2) });
    }, { out: c('R5') });
    cite('Anthony Downs, An Economic Theory of Democracy, 1957', ['R4', 'Rational'], c('R5'));
    banner('this is arithmetic', 960, 180, 72, ['R5', 'arithmetic'], { bg: BLUE });
    card(1300, 560, 900, 420, ['R5', 'Most people'], () => {
      Dm('what most voters know:', 0, -140, 40, { color: K.grey });
      rows([['· the party', ['R5', 'party']], ['· a slogan', ['R5', 'slogan']], ['· whatever an ad said', ['R5', 'an ad']]], -300, -50, 56, 80);
    });
  }
  function sMoney() {
    plate('billboard', c('R6') - 0.6, ce('R6') + 0.6, { z: [1.0, 1.12], y: [0.3, -0.3] });
    banner('step one: be heard of', 960, 200, 80, ['R6', 'heard their name']);
    stampX('name recognition', 960, 800, 100, ['R6', 'Name recognition']);
    banner('sold by the 30-second spot', 960, 940, 50, ['R6', 'thirty-second'], { bg: BLUE });
  }
  function sFeed() {
    plate('feed', c('R7') - 0.6, ce('R8') + 0.6, { z: [1.0, 1.1] });
    banner('echo chambers', 500, 220, 66, ['R7', 'Echo'], { out: c('R8') });
    banner('foreign influence campaigns', 1300, 340, 58, ['R7', 'Foreign'], { bg: BLUE, out: c('R8') });
    banner('Russia · China · Iran', 1300, 450, 50, ['R7', 'Russia'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('R8') });
    banner('AI fakes, cheaper every year', 800, 860, 62, ['R7', 'generative'], { bg: ORANGE, shadowCol: K.black, out: c('R8') });
    cite('ODNI / FBI / CISA election-threat statements, 2024 · U.S. Treasury sanctions, 2024', ['R7', 'intelligence'], c('R8'));
    card(960, 520, 1300, 420, c('R8'), () => {
      D('millions of voters', 0, -120, 66);
      Dm('× almost no reason to study', 0, -30, 46, { alpha: fadeIn(w('R8', 'no reason'), 0.2) });
      Dm('× an information war', 0, 40, 46, { alpha: fadeIn(w('R8', 'environment'), 0.2) });
      D('= add up the guesses', 0, 130, 70, { color: BLUE, alpha: fadeIn(w('R8', 'adds up'), 0.2) });
    });
  }

  // 4. alignment
  function sTurnout() {
    plate('turnout', c('T1') - 0.6, ce('T5') + 0.6, { z: [1.0, 1.1], x: [-0.2, 0.2] });
    banner('is the electorate a fair sample?', 960, 190, 66, c('T1'), { out: c('T3') });
    card(1300, 560, 860, 440, ['T2', "It isn't"], () => {
      Dm('voters vs. non-voters:', 0, -150, 40, { color: K.grey });
      rows([['older', ['T2', 'older']], ['whiter', ['T2', 'whiter']], ['wealthier', ['T2', 'wealthier']]], -120, -50, 72, 90);
    }, { out: c('T3') });
    cite('U.S. Census Bureau, CPS Voting and Registration Supplement', ['T2', 'Census'], c('T3'));
    banner('opt-in = skewed toward the motivated', 960, 190, 62, c('T3'), { out: c('T5') });
    banner('a pollster who did that: fired', 960, 520, 76, c('T4'), { bg: BLUE, out: c('T5') });
    stampX('we call it democracy', 960, 700, 92, ['T4', 'democracy'], { out: c('T5') });
    card(960, 540, 1200, 400, c('T5'), () => {
      D('mass elections', 0, -130, 50, { color: K.grey });
      D('informed?', -280, -20, 66, { alpha: fadeIn(w('T5', 'informed'), 0.2) }); D('✗', 280, -20, 80, { color: ORANGE, alpha: fadeIn(w('T5', 'informed'), 0.2) });
      D('a fair sample?', -280, 90, 66, { alpha: fadeIn(w('T5', 'fair sample'), 0.2) }); D('✗', 280, 90, 80, { color: ORANGE, alpha: fadeIn(w('T5', 'fair sample'), 0.2) });
    });
  }

  // 5. the machine
  function sMachine() {
    plates([['drum', c('J1') - 0.6, { z: [1.12, 1.0] }], ['jurybox', c('J3') - 0.3, { z: [1.0, 1.08] }], ['lectern', w('J3', 'watch the candidates', -0.3), { z: [1.0, 1.08], x: [0.2, -0.2] }], ['ballot', c('J4') - 0.3, { z: [1.0, 1.12] }]], ce('J4') + 0.6);
    banner('election by jury', 960, 200, 110, ['J1', 'election by jury'], { bg: BLUE, out: c('J3') });
    card(960, 600, 1100, 380, c('J2'), () => {
      rows([['a random sample of citizens', ['J2', 'random sample']], ['like a trial jury', ['J2', 'trial jury']], ['service required · and paid', ['J2', 'required']]], -460, -110, 58, 100);
    }, { out: c('J3') });
    card(560, 520, 860, 560, c('J3'), () => {
      D('a week or two', 0, -220, 56, { color: BLUE });
      rows([['hear every candidate', ['J3', 'hear every']], ['watch them question each other', ['J3', 'watch the candidates']], ['ask their own questions', ['J3', 'own questions']], ['talk it over', ['J3', 'talk it over']]], -360, -110, 50, 90);
    }, { out: c('J4') });
    banner('secret ballot', 960, 200, 80, ['J4', 'secret ballot'], { out: ce('J4', 0.3) });
    stampX('binding', 960, 820, 130, ['J4', 'binding'], { out: ce('J4', 0.3) });
  }
  function sBoth() {
    paperBg();
    D('look at what that does to both jobs', 960, 150, 66, { alpha: fadeIn(c('J5'), 0.3) });
    const col = (x, title, colr, items) => {
      D(title, x, 290, 76, { color: colr, alpha: fadeIn(at(items[0][1]) - 0.3, 0.3) });
      rows(items, x - 380, 400, 44, 80);
    };
    col(520, 'alignment', BLUE, [['no one opts in → no skew', ['J6', 'nobody opts in']], ['a true representative sample', ['J6', 'representative sample']], ['what every poll is chasing', ['J6', 'Every serious poll']]]);
    col(1400, 'competence', GOLD, [['1 in a million → 1 in a few dozen', ['J7', 'one in a few dozen']], ['homework worth doing', ['J7', 'worth doing']], ['protected time', ['J7', 'protected time']]]);
    card(960, 860, 1400, 180, c('J8'), () => {
      D('equal time for every candidate', 0, -30, 58, { color: BLUE });
      Dm('nothing left for money to buy', 0, 40, 40, { alpha: fadeIn(w('J8', "can't buy"), 0.2) });
    });
  }

  // 6. watching
  function sDebate() {
    plate('auditorium', c('W1') - 0.6, ce('W4') + 0.6, { z: [1.0, 1.1] });
    banner('the magic is in deliberation?', 960, 180, 64, c('W1'), { out: c('W2') });
    banner('watching a fair contest does most of the work', 960, 880, 52, ['W1', 'simply watching'], { bg: BLUE, out: c('W2') });
    banner('Intelligence Squared: vote before & after', 960, 180, 58, c('W2'), { out: ce('W4', 0.3) });
    banner('no discussion. just listening.', 960, 290, 46, ['W2', "doesn't discuss"], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('W3') });
    card(960, 590, 1500, 560, c('W3'), () => {
      Dm('one 2009 debate on religion', 0, -230, 40, { color: K.grey });
      D('before', -560, -120, 44, { align: 'left' }); D('after', -560, 120, 44, { align: 'left', alpha: fadeIn(w('W3', 'After ninety'), 0.2) });
      const sc = 0.5;
      hbar(-300, -150, 678 * sc, 50, BLUE, ['W3', 'six hundred'], 'for', '678', { labSize: 32, valSize: 36 });
      hbar(-300, -80, 1102 * sc, 50, GOLD, ['W3', 'eleven hundred'], 'against', '1,102', { labSize: 32, valSize: 36 });
      hbar(-300, 90, 268 * sc, 50, BLUE, ['W3', 'two hundred sixty'], 'for', '268', { labSize: 32, valSize: 36 });
      hbar(-300, 160, 1876 * sc, 50, GOLD, ['W3', 'eighteen hundred'], 'against', '1,876', { labSize: 32, valSize: 36 });
    }, { out: ce('W4', 0.3) });
    cite('Intelligence Squared, "The Catholic Church is a force for good," London, Oct 2009', ['W3', 'twenty-oh-nine'], c('W4'));
    stampX('one debate · big swings are common', 960, 960, 52, c('W4'), { out: ce('W4', 0.3) });
  }
  function sOmni() {
    plate('courtroom', c('W5') - 0.6, ce('W6') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    banner('each side: as biased as it likes', 960, 190, 66, ['W5', 'as biased'], { out: c('W6') });
    banner('neutrality comes from the contest', 960, 300, 60, ['W5', 'Neutrality'], { bg: BLUE, out: c('W6') });
    banner('nobody expects the prosecutor to be fair', 960, 820, 52, ['W5', 'prosecutor'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('W6') });
    banner('we expect the trial to be', 960, 920, 60, ['W5', 'expect the trial'], { bg: GOLD, fg: K.black, shadowCol: K.black, out: c('W6') });
    stampX('omni-biased', 960, 520, 150, ['W6', 'omni-biased']);
  }

  // 7. random people?
  function sSurgeon() {
    plates([['jurybox', c('K1') - 0.6, { z: [1.1, 1.0] }], ['surgeons', c('K3') - 0.3, { z: [1.0, 1.1] }]], ce('K4') + 0.6);
    stampX('random people?!', 960, 520, 130, c('K1'), { out: c('K2') });
    card(960, 520, 1300, 360, c('K2'), () => {
      D('run the city', 0, -70, 70, { color: K.grey });
      if (T > w('K2', 'Nobody')) strikeBar(-230, -70, 230, w('K2', 'Nobody')); else KC++;
      D("judge who'd run it best", 0, 60, 76, { color: BLUE, alpha: fadeIn(w('K2', 'judging'), 0.2) });
    }, { out: c('K3') });
    banner("you can't operate. you can tell who explains straight.", 960, 180, 48, ['K3', 'surgeons'], { out: c('K4') });
    banner('laypeople read competence, honesty, good faith', 960, 880, 50, ['K3', 'Research'], { bg: BLUE, out: c('K4') });
    cite('Hendriks, Kienhues & Bromme, PLOS ONE, 2015 (METI)', ['K3', 'Research'], c('K4'));
    banner('pooled across dozens of different lives', 960, 880, 60, c('K4'), { bg: GOLD, fg: K.black, shadowCol: K.black });
  }
  function sLiteracy() {
    plate('literacy', c('K5') - 0.6, ce('K7') + 0.6, { z: [1.0, 1.12] });
    banner('only let qualified people choose?', 960, 190, 66, c('K5'), { out: c('K6') });
    stampX('every filter is a lever', 960, 760, 100, c('K6'), { out: c('K7') });
    banner('literacy tests: sold as "competence"', 960, 190, 56, ['K6', 'Literacy tests'], { raw: false, out: c('K7') });
    banner('used to decide who could vote', 960, 300, 52, ['K6', 'in practice'], { bg: ORANGE, shadowCol: K.black, out: c('K7') });
    card(960, 520, 1300, 300, c('K7'), () => {
      D('randomness', 0, -40, 100, { color: BLUE });
      Dm('the one selection method nobody can tilt', 0, 60, 44);
    });
  }

  // 8. how many jurors
  function sSample() {
    plates([['ladle', c('N1') - 0.6, { z: [1.0, 1.1] }]], ce('N4') + 0.6);
    banner('smaller than you\'d think', 960, 190, 76, ['N1', 'Smaller'], { out: c('N2') });
    card(960, 560, 1600, 620, c('N2'), () => {
      Dm('a town split between A and B · draw 23 jurors', 0, -250, 40, { color: K.grey });
      const t0 = w('N2', 'twenty-three'), t1 = w('N2', 'Sixteen');
      for (let i = 0; i < 23; i++) {
        const a = fadeIn(t0 + i * 0.04, 0.15); if (a <= 0) { KC++; continue; }
        const x = -660 + i * 60, isA = i < 16, colored = T > t1 + i * 0.03;
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = colored ? (isA ? BLUE : GOLD) : K.grey;
        ctx.beginPath(); ctx.arc(x, -130, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      D('16 prefer A', -400, -50, 50, { color: BLUE, alpha: fadeIn(t1, 0.2) }); D('7 prefer B', 400, -50, 50, { color: GOLD, alpha: fadeIn(t1 + 0.5, 0.2) });
      D('≈ 97% sure A wins the whole town', 0, 60, 70, { alpha: fadeIn(c('N3'), 0.2) });
      Dm('town of 1,000 · city of 1,000,000 · nation of 100,000,000', 0, 150, 38, { alpha: fadeIn(w('N3', 'barely moves'), 0.2) });
      D('97% · 97% · 97%', 0, 220, 52, { color: BLUE, alpha: fadeIn(w('N3', 'thousand people'), 0.2) });
    }, { out: c('N4') });
    banner('what matters: sample size + true randomness', 960, 520, 60, ['N4', 'What matters'], { bg: BLUE });
    banner('not the population size', 960, 640, 56, ['N4', 'population'], { bg: K.cream, fg: K.black, shadowCol: BLUE });
  }
  function sScore() {
    plate('scorecard', c('N5') - 0.6, ce('N5') + 0.6, { z: [1.0, 1.1] });
    banner('choose-one voting splits the vote', 960, 180, 60, ['N5', 'Choose-one'], { out: w('N5', 'score voting') });
    card(1250, 560, 1050, 560, ['N5', 'score voting'], () => {
      D('score voting', 0, -220, 60, { color: BLUE });
      const cand = [['Alice', 5], ['Bob', 2], ['Eve', 4]];
      for (let s = 0; s <= 5; s++) M(String(s), -150 + s * 80, -140, 30, { color: K.grey });
      cand.forEach(([nm, sc], i) => {
        const y = -60 + i * 90; D(nm, -260, y, 44, { align: 'right' });
        for (let s = 0; s <= 5; s++) { ctx.save(); ctx.strokeStyle = K.black; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-150 + s * 80, y - 4, 20, 0, Math.PI * 2); ctx.stroke();
          if (s === sc && T > w('N5', 'rate every') + i * 0.4) { ctx.fillStyle = BLUE; ctx.fill(); } ctx.restore(); }
      });
      Dm('highest average wins', 0, 230, 40, { alpha: fadeIn(w('N5', 'highest average'), 0.2) });
    });
    banner('a few dozen jurors: most of a perfect result', 700, 950, 46, ['N5', 'Simulations'], { bg: GOLD, fg: K.black, shadowCol: K.black });
  }
  function sBribe() {
    plate('bribe', c('N6') - 0.6, ce('N8') + 0.6, { z: [1.0, 1.1] });
    stampX('bribery', 960, 500, 140, ['N6', 'Bribery'], { out: c('N7') });
    card(960, 540, 1500, 540, c('N7'), () => {
      Dm('each attempt: a 1-in-20 chance of being reported', 0, -200, 40, { color: K.grey });
      D('odds you get caught', 0, -130, 44);
      hbar(-380, -30, 512 * 1.05, 60, BLUE, ['N7', 'fourteen'], '14 jurors', '51%');
      hbar(-380, 60, 642 * 1.05, 60, BLUE, ['N7', 'Thirty', -0.4], '20 jurors', '64%');
      hbar(-380, 150, 785 * 1.05, 60, BLUE, ['N7', 'Thirty'], '30 jurors', '79%');
    }, { out: c('N8') });
    stampX('secret ballot: no way to check', 960, 520, 80, c('N8'));
  }
  function sCube() {
    paperBg();
    D('a rule of thumb: the cube root', 960, 160, 70, { alpha: fadeIn(c('N9'), 0.3) });
    Dm('of the electorate', 960, 240, 44, { alpha: fadeIn(w('N9', 'electorate'), 0.3) });
    const R = [['town', '8,000', '20', ['N9', 'eight thousand']], ['city', '125,000', '50', ['N9', 'hundred twenty-five']], ['state', '8,000,000', '200', ['N9', 'eight million']], ['nation', '240,000,000', '≈ 620', ['N9', 'two hundred forty']]];
    R.forEach(([k, n, j, q], i) => { const a = fadeIn(at(q), 0.25), y = 380 + i * 140; if (a <= 0) { KC += 3; return; }
      D(k, 420, y, 60, { align: 'left', alpha: a, color: K.grey }); D(n, 1120, y, 66, { align: 'right', alpha: a }); D('→', 1240, y, 66, { alpha: a }); D(j + ' jurors', 1360, y, 66, { align: 'left', alpha: a, color: BLUE }); });
  }

  // 9. history
  function sAthens() {
    plate('athens', c('H1') - 0.6, ce('H3') + 0.6, { z: [1.12, 1.0] });
    banner('one of the oldest ideas in democracy', 960, 180, 64, ['H1', 'oldest'], { out: c('H2') });
    banner('classical Athens: most offices filled by lot', 960, 180, 58, ['H2', 'Athens'], { out: c('H3') });
    quoteCard(1200, 560, 1100, 360, ['H2', 'Aristotle'], ['"appointment by lot is democratic,', 'election, oligarchic."'], 'Aristotle, Politics IV.9 (1294b)', { size: 54, out: c('H3') });
    banner('the worry: a popularity contest', 960, 180, 64, c('H3'));
    card(1300, 580, 800, 420, ['H3', 'favors'], () => {
      Dm('it favors', 0, -140, 44, { color: K.grey });
      rows([['the rich', ['H3', 'the rich']], ['the famous', ['H3', 'the famous']], ['the well-connected', ['H3', 'well-connected']]], -260, -50, 62, 90);
    });
  }
  function sVenice() {
    plate('venice', c('H4') - 0.6, ce('H5') + 0.6, { z: [1.0, 1.1], x: [-0.2, 0.2] });
    banner('Venice: choosing the Doge, 1268–1797', 960, 170, 60, ['H4', 'Venice'], { out: c('H5') });
    card(960, 560, 1760, 380, ['H4', 'Thirty names'], () => {
      const st = [['30', 'lot'], ['9', 'lot'], ['40', 'elect'], ['12', 'lot'], ['25', 'elect'], ['9', 'lot'], ['45', 'elect'], ['11', 'lot'], ['41', 'elect'], ['Doge', 'elect']];
      const t0 = w('H4', 'Thirty names');
      st.forEach(([n, k], i) => { const a = fadeIn(t0 + i * 0.55, 0.2); if (a <= 0) { KC += 2; return; }
        const x = -780 + i * 173; D(n, x, -20, n === 'Doge' ? 50 : 70, { color: k === 'lot' ? GOLD : BLUE, alpha: a }); M(k, x, 60, 26, { color: K.grey, alpha: a }); if (i) D('→', x - 86, -20, 40, { alpha: a, color: K.grey }); });
      Dm('drawn by lot · elected', 0, 140, 34, { color: K.grey });
    }, { out: c('H5') });
    banner("can't bribe who you can't predict", 960, 300, 66, ['H5', 'bribe'], { bg: BLUE });
    banner("can't build a faction around them", 960, 860, 60, ['H5', 'faction'], { bg: K.cream, fg: K.black, shadowCol: BLUE });
  }
  function sWells() {
    plate('wells', c('H6') - 0.6, ce('H6') + 0.6, { z: [1.0, 1.1] });
    banner('H. G. Wells, 1903: the jury method', 960, 180, 60, ['H6', 'Wells']);
    quoteCard(1180, 620, 1200, 300, ['H6', 'described'], ['"government by hustings\' bawling,', 'newspaper clamour, and ward organization"'], 'H. G. Wells, Mankind in the Making, 1903', { size: 44 });
  }

  // 10. georgia
  function sGeorgia() {
    plates([['courthouse', c('G1') - 0.6, { z: [1.1, 1.0] }], ['taxappeal', c('G2b') - 0.3, { z: [1.0, 1.08] }], ['courthouse', c('G2c') - 0.3, { z: [1.0, 1.08] }], ['water', c('G3') - 0.3, { z: [1.0, 1.08] }], ['dam', c('G3b') - 0.3, { z: [1.08, 1.0] }]], ce('G3b') + 0.6);
    banner('in Georgia, it\'s routine', 960, 180, 76, ['G1', 'routine'], { out: c('G2b') });
    banner('every county: grand juries of 16 to 23, drawn at random', 960, 900, 46, ['G2', 'sixteen'], { bg: BLUE, out: c('G2b') });
    card(1390, 560, 900, 820, c('G2b'), () => {
      D('who Georgia grand juries pick', 0, -360, 40, { color: K.grey });
      rows([
        ['tax appeal boards: all 159 counties', ['G2b', 'board of equalization'], { size: 34 }],
        ['voter registrars: dozens of counties', ['G2c', 'registrars'], { size: 34 }],
        ['Lowndes elections board: since 1979', ['G2c', 'Lowndes'], { size: 34 }],
        ['Cherokee water authority: 6 of 7', ['G3', 'six of the seven'], { size: 34 }],
        ['Cherokee airport authority: 4 of 7', ['G3', 'airport'], { size: 34 }],
        ['Towns water authority: all of it', ['G3', 'Towns'], { size: 34 }],
        ['Crisp power commission: 4 of 7', ['G3b', 'power commission'], { size: 34, color: BLUE }],
        ['  with its own hydroelectric dam', ['G3b', 'hydroelectric'], { size: 34, color: BLUE }],
      ], -400, -270, 34, 80);
    });
    cite('electionbyjury.org/learn-more/ebj-in-georgia · O.C.G.A. §§ 15-12-61, 21-2-212, 48-5-311', c('G2b'));
  }
  function sSchools() {
    plates([['schoolhouse', c('G3c') - 0.6, { z: [1.0, 1.1] }], ['capitol', c('G3c2') - 0.3, { z: [1.08, 1.0] }]], ce('G3c2') + 0.6);
    banner('it used to go further', 960, 180, 76, ['G3c', 'further'], { out: c('G3c2') });
    banner('grand-jury-appointed school boards', 960, 290, 60, ['G3c', 'school boards'], { bg: BLUE, out: c('G3c2') });
    card(1300, 680, 860, 360, ['G3c', 'twenty-eight'], () => {
      D('28 districts', 0, -90, 80, { color: BLUE });
      Dm('still did it in the late 1980s', 0, -10, 40);
      D('ended by a 1992 amendment', 0, 90, 52, { alpha: fadeIn(w('G3c', 'amendment'), 0.2) });
    }, { out: c('G3c2') });
    cite('Education Week, Feb 1988 · Ballotpedia, Georgia Amendment 2 (1992)', ['G3c', 'twenty-eight'], c('G3c2'));
    card(1250, 600, 1100, 560, c('G3c2'), () => {
      D('2017: S.R. 192', 0, -210, 64, { color: BLUE });
      Dm('bring back grand-jury-appointed school boards?', 0, -140, 38, { color: K.grey });
      D('Senate: 40–12', 0, -40, 72, { alpha: fadeIn(w('G3c2', 'forty to twelve'), 0.2) });
      D('House committee: 17–1 against', 0, 70, 64, { color: ORANGE, alpha: fadeIn(w('G3c2', 'killed it'), 0.2) });
      Dm('the objection: the grand jury', 0, 170, 44, { alpha: fadeIn(w('G3c2', 'objected'), 0.2) });
    });
    cite('AJC, Mar 13 & 16, 2017 · LegiScan, GA SR 192 (2017–18)', c('G3c2'));
  }
  function sTurner() {
    plates([['commission', c('G3d') - 0.6, { z: [1.0, 1.1] }], ['statewide', c('G3e') - 0.3, { z: [1.1, 1.0] }]], ce('G3e') + 0.6);
    banner('a caveat critics will raise', 960, 180, 70, ['G3d', 'caveat'], { out: c('G3e') });
    banner('jury lists hand-picked by commissioners', 960, 290, 54, ['G3d', 'hand-picked'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('G3e') });
    card(1290, 640, 980, 470, ['G3d', 'Supreme Court'], () => {
      D('Turner v. Fouche, 1970', 0, -170, 52, { color: BLUE });
      rows([['Taliaferro County: majority Black', ['G3d', 'majority Black']], ['school board: all white', ['G3d', 'all white']], ['picked by a mostly white grand jury', ['G3d', 'mostly white']], ['from a list made by white commissioners', ['G3d', 'list made']]], -430, -70, 40, 70);
    }, { out: c('G3e') });
    cite('Turner v. Fouche, 396 U.S. 346 (1970)', ['G3d', 'Supreme Court'], c('G3e'));
    stampX("not random", 960, 320, 120, c('G3e'), { out: ce('G3e', 0.3) });
    banner('since 2012: a statewide list of voters and drivers', 960, 860, 52, ['G3e', 'Since twenty twelve'], { bg: BLUE, out: ce('G3e', 0.3) });
    banner('the case for real randomness', 960, 960, 52, ['G3e', 'real randomness'], { bg: GOLD, fg: K.black, shadowCol: K.black, out: ce('G3e', 0.3) });
    cite('Jury Composition Reform Act of 2011 (HB 415)', ['G3e', 'Since'], ce('G3e', 0.3));
  }
  function sRoutine() {
    plate('courthouse', c('G4') - 0.6, ce('G6') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    banner('a random jury choosing officials, for generations', 960, 190, 54, c('G4'), { out: c('G6') });
    card(960, 600, 1200, 340, c('G5'), () => {
      D('grand jury service', 0, -100, 50, { color: K.grey });
      D('2–3 months', 0, 0, 90, { color: BLUE, alpha: fadeIn(w('G5', 'two or three'), 0.2) });
      Dm('once or twice a week', 0, 90, 44, { alpha: fadeIn(w('G5', 'once or twice'), 0.2) });
    }, { out: c('G6') });
    stampX('they already do', 960, 900, 90, ['G5', 'already do'], { out: c('G6') });
    banner('back to Henry County', 960, 540, 100, c('G6'), { bg: BLUE });
  }

  // 11. henry county
  function sBoard() {
    plate('dais', c('X1') - 0.6, ce('X2') + 0.6, { z: [1.0, 1.1] });
    banner('S.B. 22 (2021): the Henry County Board of Ethics', 960, 170, 52, ['X1', 'sponsored']);
    card(960, 560, 1500, 440, ['X1', 'Seven members'], () => {
      D('seven seats', 0, -160, 50, { color: K.grey });
      const t0 = w('X1', 'Five of them');
      seats([1, 2, 3, 4, 5, 6, 7].map((i) => [i <= 5 ? 'grand jury' : 'other', i <= 5 && T > t0 + i * 0.12 ? BLUE : K.paper]), -540, -20, 110, 180, 1);
      Dm('one per commission district', 0, 160, 40, { alpha: fadeIn(w('X1', 'one for each'), 0.2) });
    });
    banner('a grand jury appointee owes their seat to no one', 960, 920, 50, ['X2', 'owes'], { bg: BLUE });
  }
  function sWalk2() {
    plate('walkout', c('X3') - 0.6, ce('X4') + 0.6, { z: [1.1, 1.0] });
    banner('the walkout', 960, 180, 80, c('X3'), { out: c('X4') });
    banner('the board investigates the chair', 960, 180, 66, ['X4', 'investigate'], { bg: BLUE });
    quoteCard(1180, 600, 1240, 340, ['X4', 'They can investigate'], ['"They can investigate all they want to,', 'but I will not be answering', 'anything that they put out."'], 'Carlotta Harrell, chair, Henry County Board of Commissioners', { size: 44 });
  }
  function sStarve() {
    plate('cramped', c('X5') - 0.6, ce('X6') + 0.6, { z: [1.0, 1.1] });
    banner('next: the resources dry up', 960, 180, 70, c('X5'), { out: c('X6') });
    card(1250, 600, 1100, 520, ['X5', 'laid it out'], () => {
      Dm('January 2026 meeting, on the record', 0, -200, 38, { color: K.grey });
      rows([['no budget for a $310/week job ad', ['X5', 'No budget']], ['(they used a free trial)', ['X5', 'free trial'], { size: 36, color: K.grey }], ['barred from the broadcast room', ['X5', 'Barred']], ['denied cameras to stream meetings', ['X5', 'Denied']]], -490, -110, 44, 80);
    }, { out: c('X6') });
    quoteCard(960, 560, 1300, 280, c('X6'), ['"They want the Board of Ethics', 'to be a figurehead."'], 'Felicia Harrell (no relation), board chair', { size: 54 });
  }
  function sFair() {
    plate('scale2', c('X7') - 0.6, ce('X8') + 0.6, { z: [1.0, 1.12] });
    banner('the charge: a political hit squad', 960, 180, 66, ['X7', 'hit squad'], { out: c('X8') });
    card(1250, 600, 1060, 480, ['X7', 'nepotism'], () => {
      M('case 2026-EB-1: county manager, nepotism', 0, -180, 30, { color: K.grey });
      rows([['husband hired: 2004', ['X7', 'husband']], ['she became manager: 13 years later', ['X7', 'thirteen years']]], -460, -80, 46, 90);
      D('dismissed, unanimously', 0, 140, 70, { color: BLUE, alpha: fadeIn(w('X7', 'dismissed'), 0.2) });
    });
    banner('follow the evidence wherever it goes', 960, 180, 66, c('X8'), { bg: BLUE });
  }

  // 12. the rewrite
  function sBill() {
    plates([['capitol', c('V1') - 0.6, { z: [1.12, 1.0] }], ['eraser', c('V4') - 0.3, { z: [1.0, 1.12] }], ['capitol', c('V6') - 0.3, { z: [1.0, 1.08] }]], ce('V6') + 0.6);
    banner('then the legislature stepped in', 960, 180, 70, c('V1'), { out: c('V2') });
    card(960, 560, 1400, 360, c('V2'), () => {
      D('S.B. 359', 0, -90, 90, { color: BLUE, raw: true });
      rows([['2025: passes the Senate 49–0', ['V2', 'unanimously']], ['2026: the House swaps in a substitute', ['V2', 'substitute']]], -460, 10, 48, 80);
    }, { out: c('V3') });
    card(960, 560, 1700, 560, c('V3'), () => {
      D('the new board: five seats', 0, -220, 52, { color: K.grey });
      const lab = ['clerk of court', 'probate judge', 'sheriff', 'tax commissioner', 'solicitor-general'];
      const t0 = w('V3', 'clerk');
      seats(lab.map((l, i) => [l, ORANGE, t0 + i * 0.45]), -640, -40, 150, 320, 1, { labSize: 26 });
      D('grand jury seats: 0', 0, 190, 64, { color: ORANGE, alpha: fadeIn(w('V3', 'elected official'), 0.2) });
    }, { out: c('V4') });
    stampX('"grand jury": 0 mentions', 960, 280, 92, ['V4', 'grand jury'], { out: c('V5') });
    banner('not repealed by name. overwritten.', 960, 880, 60, ['V4', 'overwritten'], { bg: BLUE, out: c('V5') });
    quoteCard(960, 520, 1500, 360, ['V5', 'shall not'], ['"the board of ethics shall not accept or hear', 'complaints of violations of this code of ethics', 'against county employees"'], 'S.B. 359, lines 331–335', { size: 42, out: c('V6') });
    banner('the transportation director: a county employee', 960, 900, 52, ['V5', 'transportation director'], { bg: ORANGE, shadowCol: K.black, out: c('V6') });
    card(960, 540, 1100, 340, c('V6'), () => {
      D('House 161–3', 0, -60, 90, { alpha: fadeIn(w('V6', 'House'), 0.2) });
      D('Senate 44–6', 0, 70, 90, { alpha: fadeIn(w('V6', 'Senate'), 0.2) });
    });
    cite('S.B. 359 (2025–26), enrolled text · legiscan.com/GA/bill/SB359/2025', c('V2'), ce('V6'));
  }
  function sFire() {
    plates([['nameplate', c('V7') - 0.6, { z: [1.0, 1.1] }], ['pen', c('V8') - 0.3, { z: [1.1, 1.0] }]], ce('V8') + 0.6);
    banner('one more detail', 960, 170, 70, c('V7'), { out: c('V8') });
    card(960, 580, 1700, 520, ['V7', 'majority vote'], () => {
      Dm('new law: firing the county manager takes a majority vote', 0, -200, 40, { color: K.grey });
      box(-720, -10, 1440, 8, K.black);
      const ev = [[-560, 'Apr 3', 'bill passes', ['V7', 'majority vote', 0.5]], [0, 'Apr 22', 'chair fires the manager alone', ['V7', 'on her own']], [560, 'May 12', 'signed', ['V8', 'signed']]];
      ev.forEach(([x, d, lab, q], i) => { const a = fadeIn(at(q), 0.2); if (a <= 0) { KC += 3; return; }
        box(x - 16, -22, 32, 32, i === 1 ? ORANGE : BLUE, a); D(d, x, -80, 50, { alpha: a }); Dm(lab, x, 70, 34, { alpha: a, color: i === 1 ? ORANGE : K.black }); });
      Dm('"that decision would require a majority vote" (to the AJC)', 0, 180, 34, { alpha: fadeIn(w('V7', 'She told'), 0.2) });
    });
    banner('grand-jury board replaced: Jan 1, 2027', 960, 920, 56, ['V8', 'replaced'], { bg: BLUE });
    cite('Atlanta Journal-Constitution, Apr 2026 · Act 623, signed May 12, 2026', ['V7', 'She told']);
  }
  function sWorth() {
    plate('dais', c('V9') - 0.6, ce('V10') + 0.6, { z: [1.1, 1.0] });
    banner('a defeat?', 960, 190, 90, ['V9', 'defeat'], { out: w('V9', 'Five board') });
    banner('chosen by randomly selected citizens', 960, 190, 60, ['V9', 'randomly selected'], { out: c('V10') });
    banner('they held their ground', 960, 300, 70, ['V9', 'held their ground'], { bg: BLUE, out: c('V10') });
    banner('it took an act of the legislature to stop them', 960, 880, 54, ['V9', 'only way'], { bg: GOLD, fg: K.black, shadowCol: K.black, out: c('V10') });
    stampX('this one was worth a law', 960, 540, 110, ['V10', 'worth a law']);
  }

  // 13. the proposal
  function sProposal() {
    plate('proposal', c('Z1') - 0.6, ce('Z6') + 0.6, { z: [1.0, 1.12] });
    banner('take what Georgia already does. go further.', 960, 170, 60, c('Z1'), { out: c('Z2') });
    card(1250, 580, 1100, 640, c('Z2'), () => {
      D('the proposal', 0, -260, 50, { color: BLUE });
      rows([['1. draw a jury · pay them', ['Z2', 'Draw a jury']], ['2. a week or two', ['Z2', 'week or two']], ['3. equal time for every candidate', ['Z2', 'equal time']], ['4. candidates question each other', ['Z2', 'question their rivals']], ['5. jurors ask their own questions', ['Z2', 'answers the jury']], ['6. score every candidate, secret ballot', ['Z2', 'score every']], ['7. the winner takes office', ['Z2', 'winner takes']]], -470, -170, 40, 66);
    }, { out: c('Z3') });
    card(960, 540, 1500, 420, c('Z3'), () => {
      const L = [['fundraising for name recognition', ['Z3', 'No fundraising']], ['turnout skew', ['Z3', 'No turnout']], ['rational ignorance', ['Z3', 'No rational']]];
      L.forEach(([s, q], i) => { const a = fadeIn(at(q), 0.2); if (a <= 0) { KC += 2; return; } D(s, 0, -110 + i * 110, 60, { alpha: a }); strikeBar(-560, -110 + i * 110, 560, at(q) + 0.5); });
    }, { out: c('Z4') });
    banner('flood a feed with deepfakes? easy.', 960, 300, 62, c('Z4'), { out: c('Z5') });
    banner('flood a sequestered room of 50? hard.', 960, 420, 62, ['Z4', 'sequestered'], { bg: BLUE, out: c('Z5') });
    card(960, 560, 1400, 380, c('Z5'), () => {
      D('voters aren\'t stupid', 0, -110, 70, { color: K.grey });
      Dm("they're asked to do an expert's job, in their spare time,", 0, -20, 40, { alpha: fadeIn(w('Z5', "expert's job"), 0.2) });
      Dm('for no reward, in an information war', 0, 40, 40, { alpha: fadeIn(w('Z5', 'no reward'), 0.2) });
      D('a jury asks a fair sample to do it properly', 0, 130, 54, { color: BLUE, alpha: fadeIn(c('Z6'), 0.2) });
    });
  }

  // 14. close
  function sEnd() {
    const t0 = c('C1') - 0.6;
    plate('chairs', t0, ce('C4') + 6, { z: [1.16, 1.0] });
    const a0 = fadeIn(t0, 0.4) * fadeOut(c('C3') - 0.2, 0.4);
    if (a0 > 0) {
      box(0, 290, W, 460, 'rgba(20,20,20,0.88)', a0);
      D('12 random citizens: prison for life', 960, 390, 66, { color: K.cream, alpha: a0 * fadeIn(c('C1'), 0.3) });
      D('up to 23: whether an official is indicted', 960, 490, 60, { color: K.cream, alpha: a0 * fadeIn(w('C1', 'grand jury'), 0.3) });
      D('Henry County: five jury picks held out', 960, 620, 64, { color: GOLD, alpha: a0 * fadeIn(c('C2'), 0.3) });
    } else KC += 3;
    const a1 = fadeIn(c('C3') - 0.2, 0.4);
    if (a1 > 0) {
      box(0, 300, W, 440, 'rgba(20,20,20,0.9)', a1);
      D('ordinary people can be trusted', 960, 410, 80, { color: K.cream, alpha: a1 });
      D('to choose their leaders.', 960, 510, 80, { color: K.cream, alpha: a1 });
      Dm('they just need the time, the information, and a reason to pay attention.', 960, 620, 40, { color: GOLD, alpha: fadeIn(c('C4'), 0.3) });
      M('electionbyjury.org', 960, 700, 34, { color: K.cream, alpha: fadeIn(ce('C4', 0.5), 0.4) });
    } else KC += 4;
  }

  // ---------- assembly ----------
  function buildScenes() {
    const S = (id, draw, paper = false, lead = 0.6) => ({ start: Math.max(0, c(id) - lead), draw, paper });
    SCN = [
      { start: 0, draw: sOpen }, S('O5', sCounter),
      { start: ce('O6') - 0.1, draw: sTitle },
      S('A1', sJobs), S('R1', sOdds), S('R3', sIgnorance), S('R6', sMoney), S('R7', sFeed), S('T1', sTurnout),
      S('J1', sMachine), S('J5', sBoth, true), S('W1', sDebate), S('W5', sOmni), S('K1', sSurgeon), S('K5', sLiteracy),
      S('N1', sSample), S('N5', sScore), S('N6', sBribe), S('N9', sCube, true),
      S('H1', sAthens), S('H4', sVenice), S('H6', sWells),
      S('G1', sGeorgia), S('G3c', sSchools), S('G3d', sTurner), S('G4', sRoutine),
      S('X1', sBoard), S('X3', sWalk2), S('X5', sStarve), S('X7', sFair),
      S('V1', sBill), S('V7', sFire), S('V9', sWorth),
      S('Z1', sProposal), S('C1', sEnd),
    ];
    const E = [];
    SCN.slice(1).forEach((s) => E.push({ name: 'cut', t: s.start + 0.05 }));
    E.push({ name: 'title', t: ce('O6') + 0.3 });
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
