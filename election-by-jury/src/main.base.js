// "If you're going to redistribute, just give people cash": Gemini-painted plates with hand-drawn rough.js overlays.
// Everything is a pure function of time t, so the same code drives live preview and frame export.
'use strict';
(function () {
  const W = 1920, H = 1080;
  const P = {
    paper: '#f8f1e3', ink: '#2a2633', red: '#e4572e', teal: '#1b998b', gold: '#f2a541', blue: '#3f6fd8',
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

  // ---------- illustrations ----------
  function person(x, y, op = {}) {
    const { s = 1, color = P.blue, skin = P.skin[0], mood = 0.4, arms = 'down', hat = null, k = 0, lean = 0, label, alpha = 1, hair } = op;
    grp(x, y, s, lean, () => {
      const by = Math.sin(T * 2.6 + k * 1.7) * 4;
      line(-22, 62, -26, 128); line(22, 62, 26, 128);
      line(-26, 128, -44, 131); line(26, 128, 44, 131);
      ctx.translate(0, by);
      if (arms === 'down') { line(-46, -12, -78, 48); line(46, -12, 78, 48); }
      else if (arms === 'up') { line(-46, -12, -92, -78 + Math.sin(T * 8 + k) * 8); line(46, -12, 92, -78 - Math.sin(T * 8 + k) * 8); }
      else if (arms === 'out') { line(-46, -12, -112, -4); line(46, -12, 112, -4); }
      else if (arms === 'give') { line(-46, -12, -78, 48); line(46, -12, 118, -22); }
      else if (arms === 'take') { line(-46, -12, -118, -22); line(46, -12, 78, 48); }
      else if (arms === 'pull') { line(-46, -12, -100, 6); line(46, -12, 100, 6); }
      path('M -54 70 Q -62 -42 0 -46 Q 62 -42 54 70 Q 0 80 -54 70 Z', 1, { fill: color, hachureGap: 7.5, fillWeight: 2.6 });
      circ(0, -100, 100, 1, { fill: skin, fillStyle: 'solid' });
      if (hair) path(hair, 1, { fill: P.ink, fillStyle: 'solid', strokeWidth: 2 });
      const blink = ((T + k * 0.77) % 3.9) < 0.13;
      if (blink) { line(-24, -106, -10, -106, 1, { strokeWidth: 3 }); line(10, -106, 24, -106, 1, { strokeWidth: 3 }); }
      else { KC += 4; dot(-17, -106, 5.5); dot(17, -106, 5.5); }
      const m = clamp(mood, -1, 1) * 18;
      path(`M -19 ${-78 - m * 0.3} Q 0 ${-78 + m} 19 ${-78 - m * 0.3}`, 1, { strokeWidth: 3.4 });
      if (hat === 'top') { rect(-34, -200, 68, 56, 1, { fill: P.ink, fillStyle: 'solid' }); line(-56, -144, 56, -144, 1, { strokeWidth: 6 }); }
      else if (hat === 'cap') { path('M -48 -122 Q 0 -178 48 -122 Z', 1, { fill: P.red, fillStyle: 'solid' }); line(40, -124, 84, -118, 1, { strokeWidth: 6 }); }
      else if (hat === 'bow') { path('M 18 -150 L 44 -168 L 44 -136 Z M 18 -150 L -8 -168 L -8 -136 Z', 1, { fill: P.red, fillStyle: 'solid' }); }
      else KC += 4;
    }, alpha);
    if (label) txt(label, x, y + 170 * s, Math.max(34, 46 * s), { alpha });
  }
  const HAIR_A = 'M -50 -100 Q -56 -160 0 -156 Q 56 -160 50 -100 Q 40 -140 0 -138 Q -40 -140 -50 -100 Z';
  const HAIR_B = 'M -46 -118 Q -30 -162 10 -152 Q 52 -146 46 -116 Q 20 -136 -46 -118 Z';

  function bag(x, y, s, label, op = {}) {
    grp(x, y, s, 0, () => {
      path('M -62 62 Q -86 -6 -30 -44 L -22 -62 Q 0 -72 22 -62 L 30 -44 Q 86 -6 62 62 Q 0 84 -62 62 Z', 1, { fill: '#d9b77a', hachureGap: 7 });
      line(-26, -46, 26, -46, 1, { strokeWidth: 5 });
      txt('$', 0, 16, 74);
    }, op.alpha);
    if (label) txt(label, x, y + 100 * s, 52, { alpha: op.alpha, color: op.color || P.ink });
  }

  function pie(cx, cy, r, op = {}) {
    const { slices = 0, sliceP = 1, p = 1, missing = 0, color = P.gold } = op;
    if (missing > 0.001) {
      const a0 = -Math.PI / 2 + missing * Math.PI * 2, a1 = Math.PI * 1.5;
      draw('arc', [cx, cy, 2 * r, 2 * r, a0, a1, true], p, { fill: color, hachureGap: 9 }, Math.PI * 2 * r);
    } else circ(cx, cy, 2 * r, p, { fill: color, hachureGap: 9 });
    circ(cx, cy, 2 * r * 0.8, p, { stroke: P.crust, strokeWidth: 2.2 });
    for (let i = 0; i < slices; i++) {
      const a = -Math.PI / 2 + (i / slices) * Math.PI * 2;
      if (missing > 0.001 && a < -Math.PI / 2 + missing * Math.PI * 2 - 0.01) { KC += 2; continue; }
      line(cx, cy, cx + r * Math.cos(a), cy + r * Math.sin(a), sliceP, { strokeWidth: 2.6 });
    }
  }

  function flame(x, y, s) {
    grp(x, y, s, 0, () => {
      const f = 1 + Math.sin(T * 17 + x * 0.1) * 0.14, g = Math.sin(T * 23 + y * 0.1) * 7;
      path(`M -30 30 Q -44 -8 ${g} ${-74 * f} Q 44 -8 30 30 Q 0 46 -30 30 Z`, 1, { fill: P.red, fillStyle: 'solid', stroke: P.red, strokeWidth: 2, roughness: 1.5 });
      path(`M -16 28 Q -24 0 ${g * 0.6} ${-42 * f} Q 24 0 16 28 Q 0 36 -16 28 Z`, 1, { fill: P.gold, fillStyle: 'solid', stroke: P.gold, strokeWidth: 2 });
    });
  }
  function smoke(x, y, t0, n = 6, sz = 1) {
    for (let i = 0; i < n; i++) {
      const age = T - t0 - i * 0.16;
      if (age < 0 || age > 1.8) { KC += 2; continue; }
      const u = age / 1.8;
      grp(x + Math.sin(i * 2.1 + age * 2) * 30 * sz, y - age * 110 * sz, 1, 0, () => circ(0, 0, (26 + age * 40) * sz, 1, { stroke: P.grey, strokeWidth: 3, fill: '#d8d2c6', fillStyle: 'solid' }), (1 - u) * 0.9);
    }
  }

  function giftCard(x, y, s, op = {}) {
    const { amount = '$100', tag = 'GIFT CARD', color = P.red, burn = 0, r = 0, alpha = 1, sub } = op;
    grp(x, y, s, r, () => {
      const w = 380, h = 230;
      ctx.save();
      if (burn > 0) { ctx.beginPath(); ctx.rect(-w / 2 - 30, -h / 2 - 40, (w + 60) * (1 - burn), h + 80); ctx.clip(); }
      rect(-w / 2, -h / 2, w, h, 1, { fill: color, hachureGap: 11, fillWeight: 2.4, hachureAngle: -35 });
      rect(-w / 2 + 22, -h / 2 + 24, 210, 58, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      txt(tag, -w / 2 + 127, -h / 2 + 54, tag.length > 11 ? 30 : 36, { font: PRINT });
      line(w / 2 - 86, -h / 2, w / 2 - 86, h / 2, 1, { stroke: P.gold, strokeWidth: 9, roughness: 0.6 });
      ell(w / 2 - 110, -h / 2 - 8, 50, 30, 1, { stroke: P.gold, strokeWidth: 6 });
      ell(w / 2 - 62, -h / 2 - 8, 50, 30, 1, { stroke: P.gold, strokeWidth: 6 });
      rect(-w / 2 + 22, h / 2 - 92, 190, 72, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      txt(amount, -w / 2 + 117, h / 2 - 56, 66);
      ctx.restore();
      if (burn > 0) {
        const ex = -w / 2 - 30 + (w + 60) * (1 - burn);
        for (let i = 0; i < 4; i++) flame(ex, -h / 2 + 20 + i * (h / 3.2), 0.85);
      } else KC += 80;
    }, alpha);
    if (sub) txt(sub, x, y + 150 * s, 44, { alpha });
  }

  function house(x, y, s, op = {}) {
    grp(x, y, s, 0, () => {
      rect(-90, -60, 180, 140, 1, { fill: op.color || P.blue, hachureGap: 10 });
      poly([[-115, -55], [0, -150], [115, -55]], 1, { fill: P.red, hachureGap: 8 });
      rect(-25, 15, 50, 65, 1, { fill: P.cream, fillStyle: 'solid' });
      rect(-72, -35, 40, 36, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      rect(32, -35, 40, 36, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      if (op.lock) {
        path('M -20 -6 Q -20 -40 0 -40 Q 20 -40 20 -6', 1, { strokeWidth: 6, stroke: P.ink });
        rect(-30, -8, 60, 46, 1, { fill: P.gold, fillStyle: 'solid' });
      } else KC += 4;
    }, op.alpha);
  }
  function stairs(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      const pts = [[-110, 80]]; let px = -110, py = 80;
      [26, 34, 44, 58, 76].forEach((dy) => { py -= dy; pts.push([px, py]); px += 44; pts.push([px, py]); });
      curveP(pts, 1, { strokeWidth: 4.5 }, false);
      [0, 1, 2, 3, 4].forEach((i) => txt(['10%', '22%', '35%', '45%', '55%'][i], -88 + i * 44, 110 - [26, 60, 104, 162, 238][i] + 0, 24, { font: PRINT }));
      txt('!!', 120, -150, 50, { color: P.red });
    }, alpha);
  }
  function floorSign(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      line(-120, 40, 120, 40, 1, { strokeWidth: 6 });
      for (let i = -110; i < 120; i += 22) line(i, 44, i - 16, 66, 1, { strokeWidth: 2 });
      circ(0, -30, 110, 1, { fill: P.gold, fillStyle: 'solid' });
      txt('$15', 0, -28, 54);
      arrow(-80, 30, -80, -60, 1, { strokeWidth: 3 }); arrow(80, 30, 80, -60, 1, { strokeWidth: 3 });
    }, alpha);
  }
  function stampCard(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      rect(-110, -75, 220, 150, 1, { fill: P.green, hachureGap: 9 });
      rect(-90, -55, 180, 52, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      txt('FOOD ONLY', 0, -29, 32, { font: PRINT });
      circ(-40, 35, 50, 1, { fill: P.red, fillStyle: 'solid' }); line(-40, 10, -34, 0, 1, { strokeWidth: 3 });
      path('M 10 50 Q 30 10 60 20 Q 80 40 60 55 Z', 1, { fill: P.gold, fillStyle: 'solid', strokeWidth: 2.4 });
    }, alpha);
  }
  function factory(x, y, s, alpha, t0 = 0) {
    grp(x, y, s, 0, () => {
      poly([[-120, 70], [-120, -10], [-60, -50], [-60, -10], [0, -50], [0, -10], [60, -50], [60, 70]], 1, { fill: P.grey, hachureGap: 9 });
      rect(70, -130, 40, 200, 1, { fill: P.red, hachureGap: 7 });
      for (let i = 0; i < 3; i++) smoke(90, -150, (Math.floor((T - i * 0.6) / 1.8) * 1.8) + i * 0.6, 3, 0.8);
    }, alpha);
  }
  function land(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      circ(70, -70, 70, 1, { fill: P.gold, fillStyle: 'solid', stroke: P.gold });
      path('M -140 60 Q -80 -40 -10 20 Q 50 -50 140 40 L 140 70 L -140 70 Z', 1, { fill: P.green, hachureGap: 8 });
      for (let i = -110; i <= 110; i += 44) line(i, 70, i, 30, 1, { strokeWidth: 3 });
      line(-120, 42, 120, 42, 1, { strokeWidth: 2.5 });
    }, alpha);
  }
  function cash(x, y, s, alpha, n = 3) {
    grp(x, y, s, 0, () => {
      for (let i = n - 1; i >= 0; i--) {
        grp(i * 10, -i * 14, 1, -0.05 + i * 0.03, () => {
          rect(-120, -60, 240, 120, 1, { fill: P.cash, fillStyle: 'solid' });
          ell(0, 0, 80, 80, 1, { strokeWidth: 2.4 });
          txt('$', 0, 2, 64, { color: P.ink });
        });
      }
    }, alpha);
  }
  function shield(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      path('M 0 -90 L 80 -60 Q 80 40 0 90 Q -80 40 -80 -60 Z', 1, { fill: P.blue, hachureGap: 8 });
      poly([[0, -40], [12, -10], [44, -10], [18, 10], [28, 42], [0, 22], [-28, 42], [-18, 10], [-44, -10], [-12, -10]], 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
    }, alpha);
  }
  function book(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      path('M -90 -50 Q -45 -70 0 -50 L 0 60 Q -45 40 -90 60 Z', 1, { fill: P.cream, fillStyle: 'solid' });
      path('M 90 -50 Q 45 -70 0 -50 L 0 60 Q 45 40 90 60 Z', 1, { fill: P.cream, fillStyle: 'solid' });
      for (let i = 0; i < 3; i++) { line(-75, -30 + i * 22, -15, -38 + i * 22, 1, { strokeWidth: 2 }); line(15, -38 + i * 22, 75, -30 + i * 22, 1, { strokeWidth: 2 }); }
    }, alpha);
  }
  function bulb(x, y, s, glow, alpha) {
    grp(x, y, s, 0, () => {
      if (glow > 0) for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + 0.3, r1 = 110, r2 = 110 + 50 * glow + Math.sin(T * 9 + i) * 6;
        line(Math.cos(a) * r1, Math.sin(a) * r1 - 20, Math.cos(a) * r2, Math.sin(a) * r2 - 20, glow, { stroke: P.gold, strokeWidth: 5 });
      } else KC += 20;
      circ(0, -20, 160, 1, { fill: glow > 0 ? '#ffe28a' : P.cream, fillStyle: 'solid' });
      path('M -20 20 Q -10 -20 0 10 Q 10 -20 20 20', 1, { strokeWidth: 2.6 });
      rect(-38, 58, 76, 52, 1, { fill: P.grey, hachureGap: 6 });
    }, alpha);
  }
  function check(x, y, s, amount, alpha) {
    grp(x, y, s, 0, () => {
      rect(-110, -50, 220, 100, 1, { fill: '#cfe8c8', fillStyle: 'solid', strokeWidth: 2.6 });
      txt('pay to: everyone', -95, -26, 24, { font: PRINT, align: 'left' });
      txt(amount, 0, 14, 44);
    }, alpha);
  }
  function coin(x, y, r = 22, alpha = 1) {
    grp(x, y, 1, 0, () => { circ(0, 0, r * 2, 1, { fill: P.gold, fillStyle: 'solid', strokeWidth: 2.4 }); txt('$', 0, 1, r * 1.3); }, alpha);
  }
  function stall(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      for (let i = 0; i < 5; i++) poly([[-125 + i * 50, -80], [-75 + i * 50, -80], [-100 + i * 50, -40]], 1, { fill: i % 2 ? P.cream : P.red, fillStyle: 'solid', strokeWidth: 2.2 });
      line(-125, -80, 125, -80, 1, { strokeWidth: 4 });
      line(-110, -40, -110, 70); line(110, -40, 110, 70);
      rect(-130, 20, 260, 30, 1, { fill: '#c99a62', fillStyle: 'solid' });
      circ(-60, 4, 34, 1, { fill: P.red, fillStyle: 'solid' }); circ(-20, 4, 34, 1, { fill: P.green, fillStyle: 'solid' }); circ(30, 4, 34, 1, { fill: P.gold, fillStyle: 'solid' });
    }, alpha);
  }
  function parking(x, y, s, alpha) {
    grp(x, y, s, 0, () => {
      rect(-60, -60, 120, 120, 1, { fill: P.blue, fillStyle: 'solid' });
      txt('P', 0, 4, 100, { color: P.cream, font: PRINT });
      line(0, 60, 0, 150, 1, { strokeWidth: 6 });
    }, alpha);
  }
  function dial(cx, cy, r, v, op = {}) {
    const a0 = Math.PI * 1.1, a1 = Math.PI * 1.9;
    draw('arc', [cx, cy, 2 * r, 2 * r, a0, a1, false], 1, { strokeWidth: 5 }, r * 2.5);
    for (let i = 0; i <= 6; i++) { const a = lerp(a0, a1, i / 6); line(cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, { strokeWidth: 3 }); }
    const a = lerp(a0, a1, v);
    line(cx, cy, cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, 1, { strokeWidth: 7, stroke: P.red });
    circ(cx, cy, 30, 1, { fill: P.ink, fillStyle: 'solid' });
    txt(op.lo || 'a little', cx - r * 0.95, cy + 50, 40); txt(op.hi || 'a lot', cx + r * 0.95, cy + 50, 40);
  }
  function jar(x, y, s, alpha, fillLvl = 0) {
    grp(x, y, s, 0, () => {
      if (fillLvl > 0) {
        const top = 130 - 250 * fillLvl;
        path(`M -150 ${top} Q 0 ${top - 20} 150 ${top} L 150 120 Q 0 150 -150 120 Z`, 1, { fill: P.gold, hachureGap: 8, stroke: 'none' });
      } else KC += 2;
      path('M -110 -150 L -110 -120 Q -180 -100 -170 0 L -165 110 Q 0 160 165 110 L 170 0 Q 180 -100 110 -120 L 110 -150', 1, { strokeWidth: 4.5 });
      ell(0, -150, 220, 40, 1, { strokeWidth: 4 });
      rect(-110, -30, 220, 70, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.6 });
      txt('common fund', 0, 5, 46);
    }, alpha);
  }

  // ---------- background ----------
  function makePaper() {
    const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
    const g = c2.getContext('2d'), r = rand(42);
    g.fillStyle = P.paper; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.06})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
    g.strokeStyle = 'rgba(120,100,70,0.05)';
    for (let i = 0; i < 160; i++) { g.lineWidth = 0.6 + r(); g.beginPath(); const x = r() * W, y = r() * H; g.moveTo(x, y); g.quadraticCurveTo(x + r() * 40, y + r() * 10, x + 30 + r() * 60, y + r() * 20 - 10); g.stroke(); }
    g.fillStyle = 'rgba(63,111,216,0.05)';
    for (let y = 90; y < H; y += 54) g.fillRect(0, y, W, 2);
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(80,60,30,0.22)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    return c2;
  }

  // ---------- extra illustrations ----------
  function bubble(x, y, bw, bh, s, label, size = 52, op = {}) {
    grp(x, y, s, 0, () => {
      ell(0, 0, bw, bh, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
      const tx = op.tail != null ? op.tail : 40;
      circ(tx, bh / 2 + 20, 34, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.5 });
      circ(tx * 1.3, bh / 2 + 58, 18, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.5 });
      if (label) txt(label, 0, 0, size, { color: op.color || P.ink });
      if (op.inner) op.inner();
    }, op.alpha);
  }
  function sweater(x, y, s, alpha = 1, color = P.red) {
    grp(x, y, s, 0, () => {
      path('M -60 -70 L -22 -82 Q 0 -60 22 -82 L 60 -70 L 112 -8 L 82 18 L 60 -8 L 60 82 L -60 82 L -60 -8 L -82 18 L -112 -8 Z', 1, { fill: color, hachureGap: 8 });
      for (let i = 0; i < 3; i++) line(-56, 18 + i * 20, 56, 18 + i * 20, 1, { stroke: P.cream, strokeWidth: 5 });
    }, alpha);
  }
  function priceTag(x, y, s, label, alpha = 1, color = P.gold) {
    grp(x, y, s, -0.12, () => {
      poly([[-78, -38], [60, -38], [92, 0], [60, 38], [-78, 38]], 1, { fill: color, fillStyle: 'solid' });
      circ(56, 0, 16, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2 });
      txt(label, -10, 2, 46);
    }, alpha);
  }
  function xMark(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => { line(-50, -50, 50, 50, 1, { stroke: P.red, strokeWidth: 13 }); line(50, -50, -50, 50, 1, { stroke: P.red, strokeWidth: 13 }); }, alpha);
  }
  function checkMark(x, y, s, alpha = 1, col = P.green) {
    grp(x, y, s, 0, () => curveP([[-40, 0], [-10, 32], [46, -42]], 1, { stroke: col, strokeWidth: 12 }, false), alpha);
  }
  function bread(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      path('M -70 30 Q -80 -40 0 -44 Q 80 -40 70 30 Z', 1, { fill: '#d9a35b', hachureGap: 7 });
      for (let i = -1; i <= 1; i++) line(i * 30 - 10, -30, i * 30 + 10, -6, 1, { strokeWidth: 3 });
    }, alpha);
  }
  function coat(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      path('M -40 -80 L 40 -80 L 75 -40 L 60 90 L -60 90 L -75 -40 Z', 1, { fill: P.blue, hachureGap: 8 });
      line(0, -80, 0, 90, 1, { strokeWidth: 3 });
      for (let i = 0; i < 3; i++) circ(12, -40 + i * 40, 12, 1, { fill: P.gold, fillStyle: 'solid', strokeWidth: 2 });
      line(-40, -80, -10, -40); line(40, -80, 10, -40);
    }, alpha);
  }
  function desk(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-160, -10, 320, 120, 1, { fill: '#c99a62', hachureGap: 10 });
      for (let i = 0; i < 4; i++) rect(-120 + i * 6, -40 - i * 14, 110, 30, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2 });
      rect(40, -60, 70, 50, 1, { fill: P.grey, fillStyle: 'solid', strokeWidth: 2 });
    }, alpha);
  }
  function ballot(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-70, -50, 140, 110, 1, { fill: P.cream, fillStyle: 'solid' });
      line(-35, -50, 35, -50, 1, { strokeWidth: 8 });
      rect(-30, -95, 60, 50, 1, { fill: '#fff', fillStyle: 'solid', strokeWidth: 2 });
      txt('VOTE', 0, 10, 40, { font: PRINT, color: P.red });
    }, alpha);
  }
  function station(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-120, -60, 240, 120, 1, { fill: P.grey, hachureGap: 10 });
      rect(-80, -100, 160, 44, 1, { fill: P.blue, fillStyle: 'solid' });
      txt('TRAIN', 0, -77, 36, { color: P.cream, font: PRINT });
      rect(-100, 0, 200, 50, 1, { fill: P.red, fillStyle: 'solid' });
      for (let i = 0; i < 4; i++) rect(-88 + i * 48, 8, 34, 22, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2 });
      circ(-60, 56, 22, 1, { fill: P.ink, fillStyle: 'solid' }); circ(60, 56, 22, 1, { fill: P.ink, fillStyle: 'solid' });
    }, alpha);
  }
  function shops(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      [-90, 90].forEach((dx, j) => {
        rect(dx - 80, -60, 160, 140, 1, { fill: j ? P.gold : P.teal, hachureGap: 10 });
        for (let i = 0; i < 4; i++) poly([[dx - 80 + i * 40, -60], [dx - 40 + i * 40, -60], [dx - 60 + i * 40, -30]], 1, { fill: i % 2 ? P.cream : P.red, fillStyle: 'solid', strokeWidth: 2 });
        rect(dx - 25, 20, 50, 60, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2 });
      });
      txt('SHOPS', 0, -90, 40, { font: PRINT });
    }, alpha);
  }
  function hospital(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-110, -90, 220, 180, 1, { fill: P.cream, fillStyle: 'solid' });
      rect(-22, -70, 44, 110, 1, { fill: P.red, fillStyle: 'solid', stroke: P.red });
      rect(-55, -37, 110, 44, 1, { fill: P.red, fillStyle: 'solid', stroke: P.red });
      for (let i = 0; i < 3; i++) rect(-90 + i * 65, 52, 45, 30, 1, { fill: P.blue, fillStyle: 'solid', strokeWidth: 2 });
    }, alpha);
  }
  function houses(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      [-150, 0, 150].forEach((dx, i) => grp(dx, i === 1 ? -20 : 0, 0.55, 0, () => house(0, 0, 1, { color: [P.plum, P.green, P.blue][i] })));
    }, alpha);
  }
  function lot(x, y, s, alpha = 1, glow = 0) {
    grp(x, y, s, 0, () => {
      if (glow > 0) rect(-210, -130, 420, 260, 1, { fill: P.gold, fillStyle: 'solid', stroke: 'none', fillAlpha: 0.35 * glow });
      else KC += 2;
      rect(-190, -110, 380, 220, 1, { fill: P.green, hachureGap: 12, fillWeight: 1.6 });
      for (let i = -170; i <= 170; i += 34) { line(i, 110, i, 80, 1, { strokeWidth: 2.5 }); line(i, -110, i, -80, 1, { strokeWidth: 2.5 }); }
    }, alpha);
  }
  function roofCap(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-12, -60, 24, 120, 1, { fill: '#c99a62', fillStyle: 'solid', strokeWidth: 2 });
      rect(-50, -90, 100, 40, 1, { fill: P.grey, fillStyle: 'solid', strokeWidth: 2.5 });
    }, alpha);
  }
  // a simple ledger column: rows = [[label, color, t0]]
  function ledger(x, y, title, rows, alpha = 1) {
    grp(x, y, 1, 0, () => {
      txt(title, 0, -10, 44, { font: PRINT, color: P.grey });
      rows.forEach(([label, col, t0], i) => txt(label, 0, 50 + i * 60, 56, { color: col, alpha: fadeIn(t0, 0.3) }));
    }, alpha);
  }
  function smokeBurst(x, y, t0, n = 8, sz = 1) { if (T > t0) smoke(x, y, t0, n, sz); else KC += n * 2; }

  // ---------- plates (Gemini paintings) ----------
  // cover-fit a plate, slow camera drift from cam a to cam b across [t0, t1]
  function plate(name, t0, t1, cam = {}, alpha = 1) {
    const im = IMG[name];
    if (!im || alpha <= 0.001) return;
    const u = eIO(clamp((T - t0) / Math.max(0.01, t1 - t0)));
    const z = lerp((cam.z || [1, 1.06])[0], (cam.z || [1, 1.06])[1], u);
    const fx = lerp((cam.x || [0, 0])[0], (cam.x || [0, 0])[1], u), fy = lerp((cam.y || [0, 0])[0], (cam.y || [0, 0])[1], u);
    const sc = Math.max(W / im.width, H / im.height) * z * 1.02;
    const dw = im.width * sc, dh = im.height * sc;
    const mx = (dw - W) / 2, my = (dh - H) / 2;
    ctx.save(); ctx.globalAlpha *= clamp(alpha);
    ctx.drawImage(im, -mx + clamp(fx, -1, 1) * mx, -my + clamp(fy, -1, 1) * my, dw, dh);
    ctx.restore();
  }
  // a sequence of plates inside one scene: [[name, tStart, cam], ...]; each fades in over the previous one
  function plates(list, tEnd) {
    list.forEach(([name, ts, cam], i) => {
      const te = i + 1 < list.length ? list[i + 1][1] + 0.6 : tEnd;
      if (T < ts - 0.01 || (i + 1 < list.length && T > list[i + 1][1] + 0.6)) return;
      plate(name, ts, te, cam, i === 0 ? 1 : fadeIn(ts, 0.6));
    });
  }
  // cream note card for overlays on top of paintings
  function card(x, y, w, h, alpha = 1, op = {}) {
    if (alpha <= 0.001) { KC += 2; return; }
    ctx.save(); ctx.globalAlpha *= clamp(alpha);
    ctx.fillStyle = 'rgba(30,20,10,0.16)'; ctx.fillRect(x + 8, y + 10, w, h);
    ctx.fillStyle = op.bg || 'rgba(255,250,240,0.95)'; ctx.fillRect(x, y, w, h);
    rect(x, y, w, h, 1, { strokeWidth: 3, stroke: op.stroke || P.ink });
    ctx.restore();
  }
  // card that pops in at t0 and holds; content fn drawn in card-local coords (origin = card centre)
  function note(x, y, w, h, t0, fn, op = {}) {
    if (T < t0) { KC += 60; return; }
    const s = popS(t0, 0.4), a = op.out != null ? fadeOut(op.out, 0.35) : 1;
    grp(x, y, lerp(0.85, 1, clamp(s)), op.rot || 0, () => { card(-w / 2, -h / 2, w, h, 1, op); if (fn) fn(); }, clamp(s * 1.5) * a);
  }
  const lab = (s, x, y, size, t0, op = {}) => txt(s, x, y, size, Object.assign({ halo: 18, alpha: fadeIn(t0, 0.3) * (op.out != null ? fadeOut(op.out, 0.3) : 1) }, op));
  const strike = (x1, y, x2, t0, col = P.red) => line(x1, y, x2, y - 6, eOut(prog(T, t0, t0 + 0.3)), { stroke: col, strokeWidth: 7 });

  // ---------- scenes ----------
  const S0 = () => c('H1') - 3.8; // 0

  // H1-H2: the rent-controlled apartment
  function sOpen() {
    plates([['bldg', 0, { z: [1.12, 1.0], x: [0.6, 0.2] }], ['tenant', c('H2') - 0.2, { z: [1.0, 1.08], x: [0.3, -0.2] }]], ce('H2') + 0.6);
    if (T < c('H2') + 0.4) {
      const out = c('H2') - 0.1;
      note(430, 240, 560, 250, w('H1', 'worth'), () => {
        txt('market rent', 0, -70, 44, { font: PRINT, color: P.grey });
        txt('$3,000/mo', 0, 10, 92, {});
        strike(-190, 18, 190, w('H1', 'two thousand'));
        if (T > w('H1', 'two thousand')) txt('$2,000', 60, 90, 70, { color: P.red, rot: -0.06, alpha: fadeIn(w('H1', 'two thousand'), 0.2) }); else KC++;
      }, { out });
      stamp('rent control', 430, 440, 54, w('H1', 'law'), { alpha: fadeOut(out, 0.3) });
    } else KC += 70;
    if (T > c('H2') - 0.2) {
      stamp('+$1,000 a month', 1300, 220, 74, w('H2', 'saves'), { color: P.green, rot: -0.05 });
      if (T > w('H2', 'where')) {
        const a = fadeIn(w('H2', 'where'), 0.3);
        lab('where did it come from?', 1300, 380, 72, w('H2', 'where'), { color: P.plum });
        txt('?', 1660 + Math.sin(T * 5) * 6, 360, 140, { alpha: a, color: P.red, halo: 12 });
      } else KC += 2;
    } else KC += 10;
  }

  // H3: Walt pays it
  function sLandlord() {
    plate('landlord', c('H3') - 0.6, ce('H3') + 0.6, { z: [1.0, 1.1], x: [-0.3, 0.4], y: [0, 0.2] });
    const items = [['the city', 'city'], ['taxpayers', 'taxpayers']];
    items.forEach(([s, wd], i) => {
      const t0 = w('H3', wd);
      if (T < t0) { KC += 8; return; }
      lab('not ' + s, 330, 160 + i * 110, 70, t0, { color: P.ink, align: 'center' });
      strike(160, 166 + i * 110, 500, t0 + 0.35);
    });
    if (T > w('H3', 'one person')) {
      stamp('−$1,000 a month', 1250, 900, 72, w('H3', 'one person'), { color: P.red, rot: 0.04 });
      arrow(1050, 860, 940, 720, prog(T, w('H3', 'pocket'), w('H3', 'pocket', 0.4)), { stroke: P.red, strokeWidth: 7 });
      lab('whoever owns this building', 1250, 1000, 52, w('H3', 'whoever'), { color: P.red });
    } else KC += 20;
  }

  // H4: voucher + random tax
  function sRandom() {
    plate('street', c('H4') - 0.6, ce('H4') + 0.6, { z: [1.0, 1.12], x: [0, 0], y: [0.2, -0.1] });
    note(400, 250, 600, 230, w('H4', 'voucher'), () => {
      txt('housing voucher', 0, -50, 56, { color: P.green });
      txt('+$1,000', 0, 40, 96, { color: P.green });
    });
    note(1520, 250, 640, 230, w('H4', 'tax on one'), () => {
      txt('tax on one landlord', 0, -50, 56, { color: P.red });
      txt('−$1,000', 0, 40, 96, { color: P.red });
    });
    if (T > w('H4', 'random')) lab('picked at random', 1120, 860, 76, w('H4', 'random'), { color: P.plum, rot: -0.04 }); else KC++;
    stamp('hard sell', 960, 560, 80, w('H4', 'hard sell'), { color: P.red });
  }

  // H5: the leaky pipe
  function sPipe() {
    plate('pipe', c('H5') - 0.6, ce('H5') + 0.6, { z: [1.04, 1.12], x: [-0.4, 0.4] });
    lab('money leaks out', 1060, 880, 76, w('H5', 'leaks'), { color: P.red });
    lab('and the bill lands in odd places', 1060, 970, 58, w('H5', 'bill lands'), { color: P.ink });
    note(1460, 190, 700, 190, w('H5', 'free-market'), () => {
      txt('a free-market idea', 0, -30, 60, { color: P.teal });
      txt('pushed for 60+ years', 0, 40, 46, { font: PRINT });
    });
  }

  // title card on paper
  function sTitle() {
    const t0 = ce('H5') + 0.2;
    stamp('economic physics', 960, 230, 52, t0, { color: P.teal, rot: -0.04 });
    wt('how to redistribute without waste:', 960, 380, 96, t0 + 0.2, t0 + 0.9, { color: P.plum });
    wt('just give people cash', 960, 520, 150, t0 + 0.7, t0 + 1.7);
    line(520, 620, 1400, 620, eOut(prog(T, t0 + 1.6, t0 + 1.9)), { stroke: P.red, strokeWidth: 7 });
    wt(SCRIPT.subtitle, 960, 700, 60, t0 + 1.8, t0 + 2.6, { font: PRINT, color: P.teal });
    grp(360, 860, popS(t0 + 2.0), Math.sin(T * 1.3) * 0.04, () => cash(0, 0, 0.75, 1));
    grp(1560, 860, popS(t0 + 2.2), Math.sin(T * 1.1) * 0.04, () => giftCard(0, 0, 0.6, { r: 0.12 }));
    if (T > t0 + 2.2) xMark(1560, 860, 0.9, fadeIn(t0 + 2.6, 0.2)); else KC += 4;
  }

  // U1-U2: a dollar means more
  function sDollar() {
    plate('diptych', c('U1') - 0.6, ce('U2') + 0.6, { z: [1.0, 1.06] });
    lab('$100 =', 480, 120, 70, w('U2', 'hundred'), { color: P.ink });
    lab('a week of groceries', 480, 205, 66, w('U2', 'groceries'), { color: P.green });
    lab('$100 =', 1440, 120, 70, w('U2', 'billionaire'), { color: P.ink });
    lab('a rounding error', 1440, 205, 66, w('U2', 'rounding'), { color: P.red });
  }

  // U3: Bernoulli and doubling
  function sBernoulli() {
    plate('bernoulli', c('U3') - 0.6, ce('U3') + 0.6, { z: [1.0, 1.05], x: [-0.6, -0.6] });
    note(1380, 330, 860, 520, w('U3', 'Bernoulli'), () => {
      const ox = -360, oy = 200, ww = 700, h = 380;
      arrow(ox, oy, ox + ww, oy, 1, { strokeWidth: 3.5 });
      arrow(ox, oy, ox, oy - h, 1, { strokeWidth: 3.5 });
      txt('income', ox + ww - 70, oy + 34, 40);
      txt('well-being', ox + 10, oy - h - 22, 40, { align: 'left' });
      const fy = (u) => oy - (h - 30) * Math.log2(1 + u * 15) / 4.0;
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([ox + u * ww, fy(u)]); }
      curveP(pts, eIO(prog(T, w('U3', 'number'), w('U3', 'Every time'))), { stroke: P.blue, strokeWidth: 6 });
      txt('Bernoulli, 1738', ox + 200, oy - 60, 50, { color: P.plum, alpha: fadeIn(w('U3', 'seventeen'), 0.3) });
    });
    const rows = [['$20k → $40k', 'twenty thousand'], ['$1M → $2M', 'one million']];
    rows.forEach(([s, wd], i) => {
      const t0 = w('U3', wd);
      if (T < t0) { KC += 10; return; }
      note(1250, 700 + i * 130, 560, 110, t0, () => txt(s, 0, 0, 64, {}));
      stamp('+1', 1580, 700 + i * 130, 60, i ? w('U3', 'two million', 0.3) : w('U3', 'forty', 0.3), { color: P.green });
    });
  }

  // U4-U5: Alice and Bob, then the log score (on paper)
  function sAlice() {
    const t = T;
    const sh = eIO(prog(t, c('U5') - 0.2, c('U5') + 0.5));
    const flip = prog(t, w('U4', 'one thousand'), w('U4', 'nineteen'));
    const ap = popS(w('U4', 'Alice')), bp = popS(w('U4', 'Bob'));
    const bx = lerp(700, 330, sh), ax = lerp(1220, 760, sh), sc = lerp(1, 0.7, sh), yy = lerp(560, 600, sh);
    person(bx, yy, { s: sc * bp, color: P.plum, mood: lerp(0.5, -0.7, flip), k: 3, label: 'Bob', skin: P.skin[1], hair: HAIR_A });
    person(ax, yy, { s: sc * ap, color: P.teal, mood: lerp(0.5, 0.8, flip), k: 4, label: 'Alice', hat: 'bow', skin: P.skin[3], hair: HAIR_B });
    const bs = lerp(0.8, 0.45, eOut(flip)), as = lerp(0.8, 1.35, eOut(flip));
    bag(bx + 170 * sc, yy + 70 * sc, bs * sc * bp, null, {});
    bag(ax + 190 * sc, yy + 70 * sc, as * sc * ap, null, {});
    txt(flip < 0.5 ? '$5,000' : '$1,000', bx + 170 * sc, yy + 160 * sc, 50, { alpha: bp, color: flip < 0.5 ? P.ink : P.red });
    txt(flip < 0.5 ? '$5,000' : '$19,000', ax + 190 * sc, yy + (160 + 40 * flip) * sc, 50, { alpha: ap });
    grp(lerp(960, 545, sh), lerp(150, 175, sh), lerp(1, 0.75, sh), 0, () => {
      rect(-330, -80, 660, 160, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
      txt('total money', -170, -40, 40, { font: PRINT });
      txt('total well-being', 160, -40, 40, { font: PRINT });
      txt(flip < 0.5 ? '$10k' : '$20k', -170, 22, 70, { color: flip < 0.5 ? P.ink : P.green });
      txt(flip < 0.5 ? '24.6' : '24.2', 160, 22, 70, { color: flip < 0.5 ? P.ink : P.red });
      if (flip >= 0.5) { arrow(-80, 30, -80, -10, 1, { stroke: P.green, strokeWidth: 5, head: 16 }); arrow(270, -10, 270, 30, 1, { stroke: P.red, strokeWidth: 5, head: 16 }); }
      else KC += 12;
    }, popS(w('U4', 'five thousand')));
    stamp('2x the money, less well-being', 960, 960, 58, w('U4', 'twice'), { alpha: fadeOut(c('U5') - 0.3, 0.4) });
    if (t > c('U5') - 0.2) {
      const x0 = 1340;
      grp(x0, 300, popS(c('U5')), 0, () => {
        rect(-400, -100, 800, 200, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3.5 });
        txt('a society\'s score', 0, -45, 56, { color: P.plum });
        txt('= average of log(income)', 0, 35, 54, { font: PRINT });
      });
      wt('grow the pie', x0 - 230, 540, 58, w('U5', 'pie grows'), w('U5', 'pie grows', 0.4), { color: P.teal });
      wt('share it evenly', x0 + 230, 540, 58, w('U5', 'shared'), w('U5', 'shared', 0.4), { color: P.red });
      arrow(x0 - 230, 580, x0 - 70, 710, prog(t, w('U5', 'pie grows'), w('U5', 'pie grows', 0.5)), { stroke: P.teal, strokeWidth: 5 });
      arrow(x0 + 230, 580, x0 + 70, 710, prog(t, w('U5', 'shared'), w('U5', 'shared', 0.5)), { stroke: P.red, strokeWidth: 5 });
      const lvl = eOut(prog(t, w('U5', 'goes up when the pie grows'), ce('U5', 0.4)));
      grp(x0, 850, popS(w('U5', 'score')), 0, () => {
        rect(-24, -110, 48, 170, 1, { strokeWidth: 3.5 });
        rect(-14, 60 - 40 - 110 * lvl, 28, 40 + 110 * lvl, 1, { fill: P.red, fillStyle: 'solid', stroke: 'none' });
        circ(0, 80, 70, 1, { fill: P.red, fillStyle: 'solid' });
      });
      stamp('both count', x0 + 240, 880, 56, w('U5', 'more evenly'), { color: P.green, rot: 0.06 });
    } else KC += 200;
  }

  // D1-D3: the sweater
  function sGift() {
    plate('gift', c('D1') - 0.6, ce('D3') + 0.6, { z: [1.0, 1.1], x: [0, 0.1], y: [-0.2, -0.4] });
    if (T > w('D2', 'ten dollars')) grp(560, 420, popS(w('D2', 'ten dollars')), 0, () => priceTag(0, 0, 1.2, 'paid $10')); else KC += 20;
    if (T > w('D2', 'worth seven')) grp(1560, 520, popS(w('D2', 'worth seven')), 0.1, () => priceTag(0, 0, 1.2, 'worth $7', 1, P.teal)); else KC += 20;
    note(960, 880, 900, 220, c('D3'), () => {
      txt('giver: −$10', -230, -50, 60, { color: P.red, alpha: fadeIn(w('D3', 'down ten'), 0.2) });
      txt('you: +$7', 230, -50, 60, { color: P.teal, alpha: fadeIn(w('D3', 'up seven'), 0.2) });
      txt('$3 vanished. nobody got it.', 0, 45, 64, { alpha: fadeIn(w('D3', 'vanished'), 0.2) });
    });
    if (T > w('D3', 'vanished')) smokeBurst(1180, 820, w('D3', 'vanished'), 8, 0.8); else KC += 16;
  }

  // D4: Waldfogel
  function sWaldfogel() {
    plate('gifts', c('D4') - 0.6, ce('D4') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    note(1350, 230, 900, 300, w('D4', 'Waldfogel'), () => {
      txt('Joel Waldfogel (1993)', 0, -85, 52, { color: P.plum });
      txt('value lost on holiday gifts:', 0, -15, 44, { font: PRINT });
      txt('1/10', -150, 75, 92, { color: P.red, alpha: fadeIn(w('D4', 'tenth'), 0.2) });
      txt('to', 0, 75, 50, { alpha: fadeIn(w('D4', 'and a'), 0.2) });
      txt('1/3', 150, 75, 92, { color: P.red, alpha: fadeIn(w('D4', 'third'), 0.2) });
    });
  }

  // D5: the ten-dollar bill
  function sBill() {
    plate('bill', c('D5') - 0.6, ce('D5') + 0.6, { z: [1.0, 1.08] });
    lab('$10 handed over = $10 received', 960, 160, 74, w('D5', 'ten-dollar bill'), { color: P.green });
    lab('nothing lost', 960, 260, 64, w('D5', 'nothing'), { color: P.green });
    stamp('deadweight loss', 960, 820, 96, w('D5', 'deadweight'), { color: P.red });
    lab('value that could have existed, and doesn\'t', 960, 950, 56, w('D5', 'could have'), {});
  }

  // T1: trading freely
  function sFence() {
    plate('fence', c('T1') - 0.6, ce('T1') + 0.6, { z: [1.0, 1.08], x: [0, 0], y: [0.3, 0] });
    lab('both come out ahead', 960, 140, 84, w('T1', 'both'), { color: P.green });
    if (T > w('T1', 'ahead')) { checkMark(760, 420, 1.2, fadeIn(w('T1', 'ahead'), 0.2)); checkMark(1260, 420, 1.2, fadeIn(w('T1', 'ahead', 0.2), 0.2)); } else KC += 8;
  }

  // price line used by T2-T3: Dana's floor vs your ceiling
  function priceLine(x, y, tax, op = {}) {
    const X = (v) => x - 330 + (v - 14) * 40;
    line(X(14), y, X(31), y, 1, { strokeWidth: 3 });
    [15, 20, 25, 30].forEach((v) => { line(X(v), y - 10, X(v), y + 10, 1, { strokeWidth: 2 }); txt('$' + v, X(v), y + 38, 34, { font: PRINT, color: P.grey }); });
    const dana = 20 + 8 * tax;
    dot(X(dana), y, 13, P.teal); txt('Dana needs $' + Math.round(dana), X(dana), y - 50, 42, { color: P.teal });
    dot(X(25), y, 13, P.gold); txt('you pay up to $25', X(25) + (tax > 0.3 ? -40 : 30), y + 86, 42, { color: '#b07a12' });
    if (tax < 0.5) { rect(X(dana), y - 18, X(25) - X(dana), 36, 1, { fill: P.green, fillStyle: 'solid', stroke: 'none', fillAlpha: 0.45 * (1 - tax * 2) }); }
    else KC += 2;
  }
  // T2-T3: the roof
  function sRoof() {
    plates([['roof', c('T2') - 0.6, { z: [1.0, 1.06], x: [-0.2, 0.2] }], ['leak', w('T3', 'never happens') - 0.1, { z: [1.0, 1.08] }]], ce('T4') + 0.6);
    const tax = eIO(prog(T, w('T3', 'eight-dollar'), w('T3', 'twenty-eight')));
    const out = w('T3', 'never happens');
    note(1450, 470, 800, 330, w('T2', 'twenty dollars'), () => {
      priceLine(0, 20, tax);
      if (T > w('T2', 'five dollars') && tax < 0.5) txt('+$5 of value', 0, -110, 56, { color: P.green, alpha: fadeIn(w('T2', 'five dollars'), 0.2) * (1 - tax * 2) }); else KC++;
      if (tax > 0.01) txt('+ $8 tax', -40, -110, 56, { color: P.red, alpha: fadeIn(w('T3', 'eight-dollar'), 0.2) }); else KC++;
    }, { out });
    if (T > out) {
      lab('the job never happens', 640, 140, 80, out, { color: P.red });
    } else KC++;
  }

  // T4: nobody wins
  function sNobody() {
    note(1480, 230, 700, 300, c('T4'), () => {
      txt('tax collected: $0', 0, -80, 60, { alpha: fadeIn(w('T4', 'collects nothing'), 0.2) });
      txt('roof: still leaking', 0, 0, 56, { color: P.blue, alpha: fadeIn(w('T4', 'roof still'), 0.2) });
      txt('value lost: $5', 0, 80, 60, { color: P.red, alpha: fadeIn(w('T4', 'five dollars'), 0.2) });
    }, { out: w('T4', 'A tax on trading') });
    stamp('a speeding ticket for favors', 960, 900, 76, w('T4', 'speeding ticket'), { color: P.red, rot: -0.03 });
  }

  // T5: the two leaks (paper)
  function sLeaks() {
    txt('two leaks to avoid', 960, 160, 90, { alpha: fadeIn(c('T5'), 0.3), color: P.plum });
    grp(560, 520, popS(w('T5', 'benefits')), 0, () => { sweater(0, 0, 1.4); priceTag(150, -120, 0.9, '$10'); priceTag(150, 30, 0.9, 'worth $7', 1, P.teal); });
    wt('benefits worth less than they cost', 560, 790, 54, w('T5', 'benefits'), w('T5', 'cost'));
    grp(1360, 520, popS(w('T5', 'taxes')), 0, () => { roofCap(-80, 0, 1.3); xMark(80, -10, 1.3); });
    wt('taxes that kill trades', 1360, 790, 54, w('T5', 'taxes'), w('T5', 'kill trades'));
  }

  // G1-G2: how we usually help
  function sVoucher() {
    plates([['voucher', c('G1') - 0.6, { z: [1.06, 1.0], x: [0.3, 0] }], ['parking', w('G2', 'Free street') - 0.1, { z: [1.0, 1.08] }]], ce('G2') + 0.6);
    const out = w('G2', 'Free street');
    if (T < out + 0.5) {
      note(560, 170, 820, 160, c('G1'), () => txt('how we usually help', 0, 0, 80, { color: P.plum }), { out: c('G2') + 0.6 });
      if (T > w('G2', 'housing voucher')) grp(470, 560, popS(w('G2', 'housing voucher')), -0.08, () => giftCard(0, 0, 0.75, {}), fadeOut(out, 0.3)); else KC += 40;
      lab('rent only', 470, 760, 64, w('G2', 'only be spent'), { color: P.red, out });
      lab('approved units only', 470, 840, 58, w('G2', 'approved'), { color: P.red, out });
    lab('housing lottery: one unit, not your pick', 640, 940, 58, w('G2', 'lottery'), { color: P.plum, out });
    } else KC += 100;
    if (T > out) {
      note(1440, 170, 760, 170, w('G2', 'gift card for drivers'), () => txt('a gift card for drivers', 0, 0, 70, { color: P.red }));
      lab('paid for by everyone', 1440, 330, 66, w('G2', 'paid for'), {});
      lab('even people without a car', 1440, 410, 56, w('G2', "don't own"), { color: P.plum });
    } else KC += 70;
  }

  // G3: rent control lock-in
  function sStuck() {
    plate('stuck', c('G3') - 0.6, ce('G3') + 0.6, { z: [1.0, 1.1], x: [-0.3, 0.3] });
    stamp('the sweater, only worse', 560, 160, 70, w('G3', 'sweater'), { color: P.red });
    lab('discount works here only', 560, 280, 60, w('G3', 'this one'), {});
    if (T > w('G3', 'new job')) arrow(1100, 300, 1500, 220, prog(T, w('G3', 'new job'), w('G3', 'new job', 0.5)), { stroke: P.teal, strokeWidth: 7 }); else KC += 8;
    lab('new job?', 1560, 160, 64, w('G3', 'new job'), { color: P.teal });
    lab('smaller place?', 1560, 250, 58, w('G3', 'smaller'), { color: P.teal });
    lab('stays put', 560, 380, 64, w('G3', 'stay put'), { color: P.red });
  }

  // G4: San Francisco
  function sCondos() {
    plate('condos', c('G4') - 0.6, ce('G4') + 0.6, { z: [1.0, 1.08], x: [0.3, -0.3] });
    note(960, 860, 980, 260, w('G4', 'San Francisco'), () => {
      txt('rent control in San Francisco', 0, -70, 54, { color: P.plum });
      txt('rental supply: −15%', 0, 10, 80, { color: P.red, alpha: fadeIn(w('G4', 'fifteen'), 0.2) });
      txt('Diamond, McQuade & Qian (2019)', 0, 85, 36, { font: PRINT, color: P.grey });
    });
  }

  // G5: food stamps mostly work like cash
  function sGrocery() {
    plate('grocery', c('G5') - 0.6, ce('G5') + 0.6, { z: [1.0, 1.06], x: [0.4, 0.4] });
    note(1600, 260, 560, 440, w('G5', 'food stamps'), () => {
      ctx.scale(0.75, 0.75);
      const g = eOut(prog(T, w('G5', 'spend more'), w('G5', 'groceries', 0.3)));
      const b = eOut(prog(T, w('G5', 'benefit'), w('G5', 'benefit', 0.4)));
      rect(-220, 180 - 300 * g, 150, 300 * g + 0.1, 1, { fill: P.green, hachureGap: 8 });
      rect(70, 180 - 170 * b, 150, 170 * b + 0.1, 1, { fill: P.gold, hachureGap: 8 });
      line(-280, 180, 280, 180, 1, { strokeWidth: 3 });
      txt('grocery spending', -145, 225, 36, { font: PRINT });
      txt('the benefit', 145, 225, 36, { font: PRINT });
      txt('≈ cash', 0, -210, 72, { color: P.green, alpha: fadeIn(w('G5', 'almost like money'), 0.2) });
    }, { out: w('G5', 'The waste') });
    lab('the waste comes from the rules', 620, 120, 58, w('G5', 'The waste'), { color: P.red });
    lab('no hot meals, no prepared food', 620, 200, 58, w('G5', 'hot meals'), { color: P.red });
    lab('(only if it changes what you buy)', 620, 275, 48, w('G5', 'only when'), { color: P.plum });
  }

  // G6: cash isn't wasted
  function sCash() {
    plate('cash', c('G6') - 0.6, ce('G6') + 0.6, { z: [1.0, 1.08], x: [-0.3, 0.3] });
    lab('"they\'ll waste it"', 960, 130, 84, w('G6', 'waste it'), { color: P.plum });
    note(1420, 820, 840, 300, w('G6', 'World Bank'), () => {
      txt('World Bank review, 19 studies', 0, -95, 50, { color: P.plum });
      txt('cash to poor families →', 0, -25, 46, { font: PRINT });
      txt('alcohol & tobacco spending', 0, 35, 52, {});
      if (T > w('G6', "doesn't go up")) arrow(-300, 20, -300, 110, fadeIn(w('G6', 'goes down'), 0.3), { stroke: P.green, strokeWidth: 7, head: 22 }); else KC += 6;
      txt("doesn't rise", 0, 100, 44, { color: P.green, alpha: fadeIn(w('G6', "doesn't go up"), 0.2) });
      txt('Evans & Popova (2017)', 260, 115, 30, { font: PRINT, color: P.grey });
    });
  }

  // G7: exceptions
  function sLighthouse() {
    plate('lighthouse', c('G7') - 0.6, ce('G7') + 0.6, { z: [1.0, 1.1], x: [0.3, -0.2] });
    note(560, 200, 860, 200, w('G7', 'fenced out'), () => {
      txt("things nobody can be fenced out of", 0, -30, 48, {});
      txt('pay for them directly', 0, 40, 56, { color: P.teal, alpha: fadeIn(w('G7', 'paid for directly'), 0.2) });
    });
    note(560, 440, 860, 170, w('G7', 'holding the cash'), () => {
      txt('when the cash goes to someone else', 0, -25, 46, {});
      txt('like a child', 0, 35, 52, { color: P.teal, alpha: fadeIn(w('G7', 'child'), 0.2) });
    });
    stamp('real, but narrow', 1420, 880, 84, w('G7', 'narrow'), { color: P.red });
  }

  // W1-W2: the second welfare theorem (paper)
  function sTheorem() {
    grp(960, 200, popS(w('W1', 'theorem')), 0, () => {
      rect(-520, -90, 1040, 180, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3.5 });
      txt('the second welfare theorem', 0, 0, 84, { color: P.plum });
    });
    bulb(1560, 190, 0.9, fadeIn(w('W1', 'theorem'), 0.3), popS(w('W1', 'theorem')));
    const share = prog(T, w('W2', 'any amount'), w('W2', 'like'));
    const sl = Math.round(lerp(2, 8, eIO(share)));
    grp(560, 620, popS(c('W2')), 0, () => pie(0, 0, 200, { slices: sl }));
    wt('any amount of sharing', 560, 900, 58, w('W2', 'any amount'), w('W2', 'like'));
    wt('without shrinking the pie', 1320, 520, 64, w('W2', 'without shrinking'), w('W2', 'at all'), { color: P.teal });
    wt('*if the money moves in ways', 1320, 660, 50, w('W2', 'as long as'), w('W2', 'moves'), { font: PRINT, color: P.red });
    wt("that don't depend on what anyone does", 1320, 730, 50, w('W2', "don't depend"), w('W2', 'anyone does'), { font: PRINT, color: P.red });
  }

  // W3: values vs engineering
  function sEngineering() {
    plate('blueprint', c('W3') - 0.6, ce('W3') + 0.6, { z: [1.0, 1.1], x: [-0.2, 0.2] });
    lab('real life: never perfect', 520, 130, 66, w('W3', 'never'), { color: P.red, out: w('W3', 'splits') });
    lab('but much closer than now', 520, 215, 60, w('W3', 'closer'), { color: P.green, out: w('W3', 'splits') });
    note(520, 220, 740, 160, w('W3', 'How much'), () => {
      txt('how much to share?', 0, -30, 56, {});
      txt('→ values', 0, 38, 56, { color: P.plum, alpha: fadeIn(w('W3', 'values'), 0.2) });
    });
    note(520, 430, 740, 160, w('W3', 'How to share'), () => {
      txt('how to share?', 0, -30, 56, {});
      txt('→ engineering', 0, 38, 56, { color: P.teal, alpha: fadeIn(w('W3', 'engineering'), 0.2) });
    });
    stamp('better and worse answers', 1300, 920, 70, w('W3', 'better and worse'), { color: P.red });
  }

  // tax ladder used in X1 and X5-X6
  const RUNGS = [['pollution', P.green], ['land', P.green], ['spending', P.gold], ['income', P.red]];
  function ladder(x, y, show, hi, op = {}) {
    line(x - 220, y - 360, x - 220, y + 340, 1, { strokeWidth: 5 });
    line(x + 220, y - 360, x + 220, y + 340, 1, { strokeWidth: 5 });
    RUNGS.forEach(([s, col], i) => {
      const yy = y + 260 - i * 170, a = clamp(show[i] || 0);
      line(x - 220, yy, x + 220, yy, a, { strokeWidth: 5 });
      txt(s, x, yy - 40, 60, { color: col, alpha: a * (hi == null || hi === i ? 1 : 0.45) });
    });
  }
  // X1: where the money comes from (paper)
  function sLadder() {
    wt('where does the money come from?', 960, 120, 76, c('X1'), w('X1', 'come from'), { color: P.plum });
    ladder(700, 600, [fadeIn(w('X1', 'Start'), 0.3), fadeIn(w('X1', 'Start', 0.3), 0.3), fadeIn(w('X1', 'block'), 0.3) * 0.35, fadeIn(w('X1', 'block'), 0.3) * 0.35]);
    wt("first: taxes that don't block trades", 1360, 560, 54, w('X1', 'Start'), w('X1', 'useful'), { color: P.green });
    if (T > w('X1', 'useful')) checkMark(1360, 680, 1.2, fadeIn(w('X1', 'useful'), 0.2)); else KC += 4;
  }

  // X2: pollution
  function sFactory() {
    plate('factory', c('X2') - 0.6, ce('X2') + 0.6, { z: [1.0, 1.1], x: [-0.3, 0.2] });
    lab('free to dump smoke', 1400, 140, 66, w('X2', 'dumps'), { color: P.ink, out: w('X2', 'pollution tax') });
    lab('so it makes too much', 1400, 230, 60, w('X2', 'too much'), { color: P.red, out: w('X2', 'pollution tax') });
    note(1400, 200, 720, 180, w('X2', 'pollution tax'), () => {
      txt('pollution tax', 0, -35, 70, { color: P.teal });
      txt('the bill goes back to the polluter', 0, 40, 40, { font: PRINT });
    });
    stamp('grows the pie', 1400, 420, 80, w('X2', 'grows the pie'), { color: P.green });
  }

  // X3-X4: land
  function sLand() {
    plates([
      ['lot0', c('X3') - 0.6, { z: [1.0, 1.04] }],
      ['lot1', w('X3', 'train station') - 0.1, { z: [1.04, 1.06] }],
      ['lot2', w('X3', 'Then shops') - 0.1, { z: [1.06, 1.1] }],
      ['lot3', w('X3', 'lift a finger') - 0.3, { z: [1.1, 1.18], x: [0, -0.2], y: [0, 0.4] }],
    ], ce('X4') + 0.6);
    // land value meter
    const v = [[c('X3'), 1], [w('X3', 'train station'), 2], [w('X3', 'shops'), 3], [w('X3', 'hospital'), 4], [w('X3', 'neighbors'), 5]].filter(([t0]) => T > t0).length;
    const out = c('X4');
    note(1640, 180, 420, 200, w('X3', 'empty lot'), () => {
      txt('land value', 0, -50, 48, { font: PRINT });
      txt('$'.repeat(Math.max(1, v)), 0, 30, 92, { color: P.green });
    }, { out });
    lab("the owner didn't lift a finger", 960, 980, 66, w('X3', 'lift a finger'), { color: P.plum, out });
    if (T > out) {
      note(560, 190, 900, 200, c('X4'), () => {
        txt('nobody can make more land', 0, -35, 56, {});
        txt("taxing it doesn't make less of it", 0, 40, 46, { font: PRINT, color: P.teal, alpha: fadeIn(w('X4', 'taxing it'), 0.2) });
      });
      const acts = [['builds', 'builds'], ['sells', 'sells'], ['works', 'works'], ['does nothing', 'nothing']];
      note(1480, 470, 640, 400, w('X4', 'bill is the same'), () => {
        txt('the bill is the same if the owner…', 0, -150, 40, { font: PRINT });
        acts.forEach(([s, wd], i) => { const a = fadeIn(w('X4', wd), 0.2); txt(s, -60, -80 + i * 62, 50, { alpha: a, align: 'left' }); if (a > 0) checkMark(-120, -80 + i * 62, 0.45, a); else KC += 3; });
      });
      stamp('no deadweight loss', 960, 960, 84, w('X4', 'no deadweight'), { color: P.green });
    } else KC += 200;
  }

  // X5-X6: the rest (paper)
  function sRest() {
    const t = T;
    // spending bar vs what pollution + land cover
    const bx = 160, by = 260, bw = 1600, bh = 120;
    const a = fadeIn(c('X5'), 0.4);
    txt('what a country spends', bx, by - 50, 52, { align: 'left', alpha: a, font: PRINT });
    rect(bx, by, bw, bh, a, { strokeWidth: 4 });
    const cov = eOut(prog(t, w('X5', 'raise a lot'), w('X5', 'raise a lot', 0.8)));
    if (cov > 0) rect(bx, by, bw * 0.55 * cov, bh, 1, { fill: P.green, hachureGap: 10, stroke: 'none' }); else KC += 2;
    txt('pollution + land', bx + bw * 0.27, by + bh / 2, 56, { alpha: fadeIn(w('X5', 'raise a lot'), 0.3), halo: 10 });
    const rest = fadeIn(w('X5', 'not everything'), 0.4);
    txt('?', bx + bw * 0.78, by + bh / 2, 80, { alpha: rest, color: P.red });
    wt('the rest: taxes on trades', bx + bw * 0.78, by + bh + 60, 50, w('X5', 'back to taxing'), w('X5', 'trades'), { color: P.red });
    wt('the pie shrinks a little', bx + bw * 0.78, by + bh + 120, 46, w('X5', 'shrink'), w('X5', 'little'), { font: PRINT, color: P.red });
    stamp('keep it small', 600, 520, 70, w('X5', 'small as possible'), { color: P.plum, alpha: fadeOut(c('X6') - 0.2, 0.3) });
    // X6 rules
    if (t > c('X6') - 0.3) {
      const rules = [['tax spending before income', 'spending before'], ['one rate, few loopholes', 'one rate']];
      rules.forEach(([s, wd], i) => { wt(s, 960, 620 + i * 110, 70, w('X6', wd), w('X6', wd, 0.6), { color: i ? P.teal : P.gold }); });
      wt('(economists still argue about the exact rates)', 960, 860, 44, w('X6', 'argue'), w('X6', 'rates'), { font: PRINT, color: P.grey });
      stamp('the bigger win: what you do with the money', 960, 980, 56, w('X6', 'bigger win'), { color: P.green });
    } else KC += 60;
  }

  // V1: everyone gets the same check
  function sChecks() {
    plate('checks', c('V1') - 0.6, ce('V1') + 0.8, { z: [1.0, 1.06] });
    stamp('the same check for everyone', 960, 150, 84, w('V1', 'same check'), { color: P.green });
  }

  // V2: the table (paper)
  function sTable() {
    const rows = [[12000, 'twelve'], [50000, null], [100000, null], [1000000, 'a million']];
    const fmt = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
    txt('40% flat tax + $10,000 dividend', 960, 110, 74, { color: P.plum, alpha: fadeIn(c('V2'), 0.3) });
    const cols = [['you earn', 330], ['tax (40%)', 720], ['+ dividend', 1080], ['take home', 1400], ['net rate', 1700]];
    cols.forEach(([s, x]) => txt(s, x, 240, 46, { font: PRINT, color: P.grey, alpha: fadeIn(c('V2') + 0.3, 0.3) }));
    line(150, 285, 1820, 285, fadeIn(c('V2') + 0.3, 0.4), { strokeWidth: 3 });
    rows.forEach(([e, wd], i) => {
      const t0 = wd ? w('V2', wd) - 0.2 : w('V2', 'Earn a million') - 1.2 + i * 0.3, y = 360 + i * 120;
      const a = fadeIn(t0, 0.3), tax = e * 0.4, home = e - tax + 10000, rate = (tax - 10000) / e;
      txt(fmt(e), 330, y, 62, { alpha: a });
      txt(fmt(tax), 720, y, 62, { alpha: a, color: P.red });
      txt('$10,000', 1080, y, 62, { alpha: a, color: P.green });
      txt(fmt(home), 1400, y, 62, { alpha: a });
      txt(Math.round(rate * 100) + '%', 1700, y, 62, { alpha: a, color: rate < 0 ? P.green : P.ink });
    });
    stamp('progressive, with no brackets', 960, 900, 70, w('V2', 'no brackets'), { color: P.teal });
  }

  // V3: Friedman
  function sFriedman() {
    plate('desk1962', c('V3') - 0.6, ce('V3') + 0.6, { z: [1.0, 1.08], x: [0.2, -0.2] });
    note(960, 820, 1000, 260, w('V3', 'Friedman'), () => {
      txt('Milton Friedman, 1962', 0, -65, 64, { color: P.plum });
      txt('"a negative income tax"', 0, 25, 74, { alpha: fadeIn(w('V3', 'negative'), 0.2) });
      txt('Capitalism and Freedom', 0, 95, 38, { font: PRINT, color: P.grey });
    });
  }

  // V4: no welfare cliff
  function sCliff() {
    plate('family', c('V4') - 0.6, ce('V4') + 0.6, { z: [1.08, 1.14], x: [1, 1] });
    note(390, 600, 640, 520, w('V4', 'welfare cliff'), () => {
      ctx.scale(0.8, 0.8);
      const ox = -330, oy = 220, ww = 660, h = 420;
      arrow(ox, oy, ox + ww, oy, 1, { strokeWidth: 3 }); arrow(ox, oy, ox, oy - h, 1, { strokeWidth: 3 });
      txt('what you earn', ox + ww - 140, oy + 36, 36, { font: PRINT });
      txt('what you keep', ox + 10, oy - h - 20, 36, { font: PRINT, align: 'left' });
      const today = [[0, 0.35], [0.3, 0.48], [0.42, 0.56], [0.43, 0.4], [0.6, 0.5], [0.7, 0.58], [0.71, 0.5], [1, 0.72]];
      curveP(today.map(([u, v]) => [ox + u * ww, oy - v * h]), eOut(prog(T, w('V4', 'Today'), w('V4', 'grows'))), { stroke: P.red, strokeWidth: 6 }, false);
      txt('today', ox + 0.86 * ww, oy - 0.62 * h, 40, { color: P.red, alpha: fadeIn(w('V4', 'Today'), 0.3) });
      curveP([[ox, oy - 0.3 * h], [ox + ww, oy - 0.9 * h]], eOut(prog(T, w('V4', 'Here'), w('V4', 'better off'))), { stroke: P.green, strokeWidth: 6 }, false);
      txt('cash dividend', ox + 0.55 * ww, oy - 0.78 * h, 40, { color: P.green, alpha: fadeIn(w('V4', 'Here'), 0.3) });
    });
    lab('no welfare cliff', 390, 220, 84, w('V4', 'welfare cliff'), { color: P.teal });
  }

  // C1: the two questions (paper)
  function sClose() {
    const t = T;
    wt('how much to share?', 540, 300, 74, c('C1'), w('C1', 'how to share'), {});
    wt('your call', 540, 400, 64, w('C1', 'how to share'), w('C1', 'same argument'), { color: P.plum });
    wt('how to share?', 1380, 300, 74, w('C1', 'how to share'), w('C1', 'same'), {});
    grp(1380, 520, popS(w('C1', 'cash')), Math.sin(t * 1.4) * 0.04, () => cash(0, 0, 0.9, 1));
    stamp('cash: cheaper', 1380, 760, 80, w('C1', 'cheaper'), { color: P.green });
    line(960, 220, 960, 860, fadeIn(c('C1'), 0.6), { strokeWidth: 3, stroke: P.grey });
  }

  // C2: the street again
  function sEnd() {
    plate('end', c('C2') - 0.6, ce('C2') + 0.6, { z: [1.1, 1.0], x: [0.3, 0.3] });
    const items = [['the poor: more', 'more'], ['taxpayers: less', 'pay less'], ['the landlord: off the hook', 'off the hook']];
    items.forEach(([s, wd], i) => {
      const t0 = w('C2', wd);
      lab(s, 520, 150 + i * 100, 66, t0, { color: i === 2 ? P.plum : P.green, align: 'center' });
      if (T > t0) checkMark(150, 150 + i * 100, 0.6, fadeIn(t0, 0.2)); else KC += 3;
    });
  }

  // C3: end card (paper)
  function sFinal() {
    const t0 = c('C3');
    wt('whether to redistribute: your call', 960, 300, 66, t0, w('C3', 'If you do'), { color: P.plum });
    wt('if you do, do it efficiently', 960, 380, 66, w('C3', 'If you do'), w('C3', 'efficiently'), { color: P.teal });
    wt('just give people money.', 960, 500, 140, w('C3', 'Just'), ce('C3'));
    line(560, 600, 1360, 600, eOut(prog(T, ce('C3'), ce('C3', 0.4))), { stroke: P.red, strokeWidth: 7 });
    grp(960, 780, popS(ce('C3', 0.2)), Math.sin(T * 1.2) * 0.04, () => cash(0, 0, 0.8, 1));
    stamp('economic physics', 960, 980, 46, ce('C3', 0.5), { color: P.teal, rot: -0.03 });
  }

  // ---------- assembly ----------
  function buildScenes() {
    const S = (id, draw, paper = false, lead = 0.6) => ({ start: Math.max(0, c(id) - lead), draw, paper });
    SCN = [
      { start: 0, draw: sOpen },
      S('H3', sLandlord), S('H4', sRandom), S('H5', sPipe),
      { start: ce('H5') + 0.1, draw: sTitle, paper: true },
      S('U1', sDollar), S('U3', sBernoulli), S('U4', sAlice, true),
      S('D1', sGift), S('D4', sWaldfogel), S('D5', sBill),
      S('T1', sFence), S('T2', sRoof), { start: c('T4') - 0.3, draw: () => { sRoof(); sNobody(); } }, S('T5', sLeaks, true),
      S('G1', sVoucher), S('G3', sStuck), S('G4', sCondos), S('G5', sGrocery), S('G6', sCash), S('G7', sLighthouse),
      S('W1', sTheorem, true), S('W3', sEngineering),
      S('X1', sLadder, true), S('X2', sFactory), S('X3', sLand), S('X5', sRest, true),
      S('V1', sChecks), S('V2', sTable, true), S('V3', sFriedman), S('V4', sCliff),
      S('C1', sClose, true), S('C2', sEnd), S('C3', sFinal, true),
    ];
    const E = [];
    const ev = (name, t, dur) => E.push({ name, t, dur });
    const at = (id, word, name = 'pop', extra = 0) => ev(name, w(id, word, extra));
    SCN.slice(1).forEach((s) => ev('whoosh', s.start + 0.05));
    // open
    at('H1', 'worth', 'pop'); at('H1', 'two thousand', 'stamp'); at('H1', 'law', 'stamp');
    at('H2', 'saves', 'chaching'); at('H2', 'where', 'boing');
    at('H3', 'city', 'tick'); at('H3', 'taxpayers', 'tick'); at('H3', 'one person', 'stamp'); at('H3', 'pocket', 'coin');
    at('H4', 'voucher', 'pop'); at('H4', 'tax on one', 'pop2'); at('H4', 'random', 'boing'); at('H4', 'hard sell', 'stamp');
    at('H5', 'leaks', 'poof'); at('H5', 'free-market', 'pop');
    const tt = ce('H5') + 0.2; ev('stamp', tt); ev('scribble', tt + 0.2, 0.8); ev('scribble', tt + 0.7, 1.0); ev('sparkle', tt + 1.7); ev('pop', tt + 2.0); ev('pop2', tt + 2.2); ev('stamp', tt + 2.6);
    // why redistribute
    at('U2', 'groceries', 'pop'); at('U2', 'rounding', 'pop2');
    at('U3', 'Bernoulli', 'pop'); at('U3', 'number', 'scribble'); at('U3', 'twenty thousand', 'pop2'); at('U3', 'forty', 'ding', 0.3); at('U3', 'one million', 'pop2'); at('U3', 'two million', 'ding', 0.3);
    at('U4', 'Alice', 'pop2'); at('U4', 'Bob', 'pop2'); at('U4', 'five thousand'); at('U4', 'one thousand', 'slide'); at('U4', 'nineteen', 'sad'); at('U4', 'twice', 'stamp');
    ev('pop', c('U5')); at('U5', 'pie grows', 'scribble'); at('U5', 'shared', 'scribble'); at('U5', 'more evenly', 'stamp'); at('U5', 'more evenly', 'ding', 0.1);
    // deadweight
    at('D2', 'ten dollars', 'coin'); at('D2', 'worth seven', 'pop'); at('D3', 'down ten', 'tick'); at('D3', 'up seven', 'tick'); at('D3', 'vanished', 'poof');
    at('D4', 'Waldfogel', 'pop'); at('D4', 'tenth', 'tick'); at('D4', 'third', 'tick');
    at('D5', 'ten-dollar bill', 'chaching'); at('D5', 'deadweight', 'stamp');
    // trade
    at('T1', 'ahead', 'ding'); at('T2', 'twenty dollars', 'pop'); at('T2', 'twenty-five', 'pop2'); at('T2', 'five dollars', 'coin');
    at('T3', 'eight-dollar', 'slide'); at('T3', 'never happens', 'sad');
    at('T4', 'collects nothing', 'tick'); at('T4', 'roof still', 'tick'); at('T4', 'five dollars', 'poof'); at('T4', 'speeding ticket', 'stamp');
    at('T5', 'benefits', 'pop'); at('T5', 'taxes', 'pop2');
    // how we help
    ev('pop', c('G1')); at('G2', 'housing voucher', 'pop'); at('G2', 'only be spent', 'tick'); at('G2', 'approved', 'tick'); at('G2', 'gift card for drivers', 'pop'); at('G2', "don't own", 'tick');
    at('G3', 'sweater', 'stamp'); at('G3', 'new job', 'slide'); at('G3', 'stay put', 'sad');
    at('G4', 'San Francisco', 'pop'); at('G4', 'fifteen', 'stamp');
    at('G5', 'food stamps', 'pop'); at('G5', 'spend more', 'slide'); at('G5', 'almost like money', 'ding');
    at('G6', 'waste it', 'boing'); at('G6', 'World Bank', 'pop'); at('G6', 'goes down', 'ding');
    at('G7', 'fenced out', 'pop'); at('G7', 'holding the cash', 'pop2'); at('G7', 'narrow', 'stamp');
    // theorem
    at('W1', 'theorem', 'bulb'); at('W2', 'any amount', 'slide'); at('W2', 'without shrinking', 'sparkle'); at('W2', 'as long as', 'scribble');
    at('W3', 'How much', 'pop'); at('W3', 'How to share', 'pop2'); at('W3', 'better and worse', 'stamp');
    // taxes
    at('X1', 'Start', 'scribble'); at('X1', 'useful', 'ding');
    at('X2', 'dumps', 'poof'); at('X2', 'pollution tax', 'chaching'); at('X2', 'grows the pie', 'stamp');
    at('X3', 'empty lot', 'pop'); ['train station', 'shops', 'hospital', 'neighbors'].forEach((x) => at('X3', x, 'coin', 0.3));
    ev('pop', c('X4')); ['builds', 'sells', 'works', 'nothing'].forEach((x) => at('X4', x, 'tick', 0.1)); at('X4', 'no deadweight', 'stamp');
    at('X5', 'raise a lot', 'slide'); at('X5', 'not everything', 'boing'); at('X5', 'small as possible', 'stamp');
    at('X6', 'spending before', 'scribble'); at('X6', 'one rate', 'scribble'); at('X6', 'bigger win', 'stamp');
    // dividend
    at('V1', 'same check', 'chaching'); at('V1', 'same check', 'stamp', 0.1);
    at('V2', 'twelve', 'tick'); at('V2', 'seventeen', 'pop'); at('V2', 'a million', 'tick'); at('V2', 'thirty-nine', 'pop'); at('V2', 'no brackets', 'stamp');
    at('V3', 'Friedman', 'pop'); at('V3', 'negative', 'ding');
    at('V4', 'welfare cliff', 'sad'); at('V4', 'Here', 'slide'); at('V4', 'better off', 'ding');
    // close
    at('C1', 'cash', 'chaching'); at('C1', 'cheaper', 'stamp');
    at('C2', 'more', 'ding'); at('C2', 'pay less', 'ding'); at('C2', 'off the hook', 'sparkle');
    at('C3', 'Just', 'scribble'); ev('pop', ce('C3', 0.2)); ev('stamp', ce('C3', 0.5));
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
    ctx.font = `400 38px ${PRINT}`;
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
      new FontFace('Caveat', 'url(fonts/caveat-latin-700-normal.woff2)', { weight: '700' }),
      new FontFace('Caveat', 'url(fonts/caveat-latin-400-normal.woff2)', { weight: '400' }),
      new FontFace('Patrick Hand', 'url(fonts/patrick-hand-latin-400-normal.woff2)', { weight: '400' }),
    ];
    await Promise.all(fonts.map((f) => f.load().then((ff) => document.fonts.add(ff))));
    SCRIPT = await (await fetch('script.json', { cache: 'no-store' })).json();
    const tmp = new (window.OfflineAudioContext)(2, 48000, 48000);
    const n = await loadNarration(tmp);
    NARR = n.bufs;
    TL = buildTimeline(SCRIPT, n.durs);
    const names = ['bldg', 'tenant', 'landlord', 'street', 'pipe', 'diptych', 'bernoulli', 'gift', 'gifts', 'bill', 'fence', 'roof', 'leak', 'voucher', 'parking', 'stuck', 'condos', 'grocery', 'cash', 'lighthouse', 'blueprint', 'factory', 'lot0', 'lot1', 'lot2', 'lot3', 'checks', 'desk1962', 'family', 'end'];
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
