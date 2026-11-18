// "Proportional Approval Voting" — hand-drawn explainer, rendered with rough.js on a canvas.
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

  let cv, ctx, rc, PAPER, TL, SCRIPT, SCN = [], EVENTS = [], NARR = {}, CAPTIONS = Q.has('captions'), SCALE = 1;
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
    const { p = 1, color = P.ink, font = HAND, weight, align = 'center', rot = 0, alpha = 1 } = op;
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
    ctx.fillText(p >= 1 ? s : s.slice(0, Math.ceil(s.length * p)), sx, 0);
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

  // ---------- cardinal voting illustrations ----------
  const PALETTE = [P.teal, P.red, P.gold, P.blue, P.plum, P.green];
  const CP = { peltola: P.blue, palin: P.red, begich: P.gold, L: P.blue, C: P.green, R: P.red, nader: P.green, gore: P.blue, bush: P.red };
  function mini(x, y, s, col, k = 0, op = {}) {
    person(x, y, Object.assign({ s, color: col, skin: P.skin[k % 5], hair: k % 3 === 0 ? HAIR_A : k % 3 === 1 ? HAIR_B : null, k, mood: 0.4 }, op));
  }
  function token(x, y, s, label, col, alpha = 1, op = {}) {
    grp(x, y, s, 0, () => {
      circ(0, 0, 150, 1, { fill: col, fillStyle: 'solid' });
      circ(0, 0, 120, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2 });
      txt(label.slice(0, 1).toUpperCase(), 0, 4, 80, { color: col });
    }, alpha);
    if (op.name) txt(op.name, x, y + 110 * s, op.size || 46, { alpha, color: op.ncol || P.ink });
  }
  function paper(w, h, f = P.cream) { rect(-w / 2, -h / 2, w, h, 1, { fill: f, fillStyle: 'solid', strokeWidth: 3 }); }
  // kind: 'one' | 'rank' | 'score' | 'approve'
  function ballotCard(x, y, s, kind, names, vals, op = {}) {
    const n = names.length, rh = 74, w = 460, h = 120 + n * rh;
    grp(x, y, s, op.rot || 0, () => {
      paper(w, h);
      txt(op.title || { one: 'vote for ONE', rank: 'rank them', score: 'score 0-5', approve: 'vote for ALL you like' }[kind], 0, -h / 2 + 46, 40, { font: PRINT, color: P.grey });
      names.forEach((nm, i) => {
        const yy = -h / 2 + 110 + i * rh, v = vals[i], dim = op.dim && op.dim[i];
        txt(nm, -w / 2 + 34, yy, 46, { align: 'left', alpha: dim ? 0.3 : 1, color: op.colors ? op.colors[i] : P.ink });
        if (kind === 'one' || kind === 'approve') {
          rect(w / 2 - 90, yy - 24, 48, 48, 1, { strokeWidth: 3 });
          if (v) { curveP([[w / 2 - 82, yy], [w / 2 - 68, yy + 16], [w / 2 - 40, yy - 22]], 1, { stroke: P.blue, strokeWidth: 6 }, false); } else KC += 1;
        } else if (kind === 'rank') {
          for (let k = 1; k <= n; k++) { const cx = w / 2 - 40 - (n - k) * 52; circ(cx, yy, 40, 1, { strokeWidth: 2, fill: v === k ? P.blue : undefined, fillStyle: 'solid' }); txt(String(k), cx, yy, 22, { font: PRINT, color: v === k ? P.cream : P.grey }); }
        } else {
          for (let k = 1; k <= 5; k++) { const cx = w / 2 - 230 + k * 40; star(cx, yy, 16, k <= v ? P.gold : null); }
        }
      });
    }, op.alpha);
  }
  function star(x, y, r, fill) {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    poly(pts, 1, fill ? { fill, fillStyle: 'solid', strokeWidth: 2 } : { strokeWidth: 2 });
  }
  function hbar(x, y, w, h, frac, col, label, val, op = {}) {
    rect(x, y - h / 2, w, h, 1, { strokeWidth: 2.5, stroke: P.grey });
    if (frac > 0.002) rect(x, y - h / 2, w * clamp(frac), h, 1, { fill: col, fillStyle: 'solid', stroke: 'none' }); else KC++;
    if (label) txt(label, x - 20, y, op.ls || 44, { align: 'right', color: op.lcol || P.ink });
    if (val) txt(val, x + w * clamp(frac) + 16, y, op.vs || 40, { align: 'left', font: PRINT });
  }
  function matchup(x, y, s, a, b, pa, ca, cb, t0, alpha = 1) {
    const u = eOut(prog(T, t0, t0 + 0.8));
    grp(x, y, s, 0, () => {
      paper(720, 220);
      txt(a, -330, -50, 50, { align: 'left', color: ca });
      txt('vs', 0, -50, 40, { font: PRINT, color: P.grey });
      txt(b, 330, -50, 50, { align: 'right', color: cb });
      rect(-320, 10, 640, 60, 1, { strokeWidth: 2.5 });
      rect(-320, 10, 640 * pa * u, 60, 1, { fill: ca, fillStyle: 'solid', stroke: 'none' });
      rect(-320 + 640 * pa * u, 10, 640 * (1 - pa) * u, 60, 1, { fill: cb, fillStyle: 'solid', stroke: 'none' });
      txt((pa * 100).toFixed(1) + '%', -300, 100, 38, { align: 'left', alpha: u, font: PRINT });
      txt(((1 - pa) * 100).toFixed(1) + '%', 300, 100, 38, { align: 'right', alpha: u, font: PRINT });
    }, alpha);
  }
  function card(x, y, w, h, title, lines, col, s = 1, alpha = 1, rot = 0) {
    grp(x, y, s, rot, () => {
      rect(-w / 2, -h / 2, w, h, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: col });
      txt(title, 0, -h / 2 + 52, 56, { color: col });
      lines.forEach(([t2, a2], i) => txt(t2, 0, -h / 2 + 130 + i * 58, 42, { font: PRINT, alpha: a2 == null ? 1 : a2 }));
    }, alpha);
  }
  function veil(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      line(-300, -220, 300, -220, 1, { strokeWidth: 8, stroke: '#8a6a3a' });
      for (let i = 0; i < 7; i++) { const x0 = -300 + i * 100; path(`M ${x0} -220 Q ${x0 + 30 + Math.sin(T * 2 + i) * 10} 0 ${x0 + 10} 220 L ${x0 + 100} 220 Q ${x0 + 120 + Math.sin(T * 2 + i) * 10} 0 ${x0 + 100} -220 Z`, 1, { fill: P.plum, hachureGap: 9, strokeWidth: 2 }); }
    }, alpha);
  }
  function scale2(x, y, s, tilt, alpha = 1) {
    grp(x, y, s, 0, () => {
      poly([[-60, 200], [0, 40], [60, 200]], 1, { fill: P.grey, fillStyle: 'solid' });
      grp(0, 40, 1, tilt, () => { line(-320, 0, 320, 0, 1, { strokeWidth: 8 }); line(-300, 0, -300, 80); line(300, 0, 300, 80); ell(-300, 90, 200, 40, 1, { fill: P.cream, fillStyle: 'solid' }); ell(300, 90, 200, 40, 1, { fill: P.cream, fillStyle: 'solid' }); });
    }, alpha);
  }

  // ---------- scenes: proportional approval voting for Westminster ----------
  const PC = { lab: P.red, con: P.blue, ref: P.teal, ld: P.gold, grn: P.green, rb: P.plum, ind: P.grey };
  const GC = { A: P.red, B: P.blue, C: P.gold, D: P.green };
  function crowd(cx, cy, cols, rows, sp, s, colFn) {
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) { const i = r * cols + c2; mini(cx + (c2 - (cols - 1) / 2) * sp, cy + (r - (rows - 1) / 2) * sp * 1.25, s, colFn(i), i); }
  }
  // a sub-section of a scene, cross-faded on cues
  function sub(t0, t1, fn) {
    const a = (t0 == null ? 1 : fadeIn(t0 - 0.15, 0.4)) * (t1 == null ? 1 : fadeOut(t1 - 0.3, 0.35));
    if (a > 0.001 && (t0 == null || T > t0 - 0.2) && (t1 == null || T < t1 + 0.1)) grp(0, 0, 1, 0, fn, a); else KC += 300;
  }
  // a hand-drawn X that writes itself on at t0
  function cross(x, y, s, t0, col = P.ink) {
    const u = prog(T, t0, t0 + 0.28), v = prog(T, t0 + 0.14, t0 + 0.42);
    line(x - s, y - s, x + s, y + s, u, { stroke: col, strokeWidth: 5, roughness: 1.4 });
    line(x + s, y - s, x - s, y + s, v, { stroke: col, strokeWidth: 5, roughness: 1.4 });
  }
  function box(x, y, s, sw = 3) { rect(x - s / 2, y - s / 2, s, s, 1, { strokeWidth: sw, fill: '#ffffff', fillStyle: 'solid' }); }
  function tick(x, y, s, a = 1, col = P.green) { grp(x, y, s, 0, () => curveP([[-20, 0], [-6, 16], [24, -22]], 1, { stroke: col, strokeWidth: 7 }, false), a); }
  function nope(x, y, s, a = 1) { grp(x, y, s, 0, () => { line(-18, -18, 18, 18, 1, { stroke: P.red, strokeWidth: 7 }); line(18, -18, -18, 18, 1, { stroke: P.red, strokeWidth: 7 }); }, a); }
  const val = (evs, t) => { let v = evs[0][1], from = v, t0 = -1; for (const [te, ve] of evs) { if (t >= te) { from = v; v = ve; t0 = te; } } return t0 < 0 ? v : lerp(from, v, eIO(prog(t, t0, t0 + 0.6))); };

  function sTitle() {
    const t = T;
    stamp('a votewell explainer', 960, 220, 50, 0.3, { color: P.teal, rot: -0.04 });
    wt('Proportional Approval Voting', 960, 430, 140, 0.6, 1.7);
    line(380, 530, 1540, 530, eOut(prog(t, 1.6, 2.0)), { stroke: P.red, strokeWidth: 7 });
    wt(SCRIPT.subtitle, 960, 630, 62, 1.9, 2.9, { font: PRINT, color: P.teal });
    grp(960, 850, popS(2.4), -0.03, () => {
      paper(620, 210);
      [['Ahmed', -40], ['Evans', 20], ['Quinn', 80]].forEach(([n, yy], i) => { txt(n, -240, yy - 30, 44, { align: 'left', font: PRINT }); box(220, yy - 30, 46); cross(220, yy - 30, 15, 2.7 + i * 0.25, P.blue); });
    });
  }

  // O1-O4: what first past the post did in 2024
  function sOpen() {
    const t = T;
    sub(null, c('O3'), () => {
      txt('2024 general election', 960, 110, 72, { color: P.ink });
      txt('share of votes', 760, 210, 38, { font: PRINT, color: P.grey, alpha: fadeIn(c('O1')) });
      txt('share of seats', 1340, 210, 38, { font: PRINT, color: P.grey, alpha: fadeIn(c('O1')) });
      [['Labour', 33.7, 63.2, '411 seats', PC.lab, c('O1')], ['Reform UK', 14.3, 0.8, '5 seats', PC.ref, w('O2', 'Reform')], ['Greens', 6.7, 0.6, '4 seats', PC.grn, w('O2', 'Greens')]].forEach(([n, v, s, sl, col, t0], i) => {
        const y = 340 + i * 230, u = eOut(prog(t, t0, t0 + 0.9)), a = fadeIn(t0);
        txt(n, 470, y, 58, { align: 'right', color: col, alpha: a });
        hbar(520, y - 34, 480, 56, (v / 70) * u, col, '', a > 0.5 ? v.toFixed(1) + '%' : '', { vs: 38 });
        hbar(1100, y - 34, 480, 56, (s / 70) * u, col, '', a > 0.5 ? s.toFixed(1) + '%' : '', { vs: 38 });
        txt(sl, 1100, y + 34, 34, { align: 'left', font: PRINT, color: P.grey, alpha: a });
      });
    });
    sub(c('O3'), c('O4'), () => {
      wt('first past the post', 960, 120, 84, c('O3'), w('O3', 'post', 0.3), { color: P.red });
      txt('one constituency', 960, 230, 44, { font: PRINT, color: P.grey });
      const r = rand(7);
      for (let i = 0; i < 30; i++) { const col = i < 11 ? PC.lab : [PC.con, PC.ref, PC.ld, PC.grn][i % 4]; const win = i < 11; mini(300 + (i % 10) * 145, 400 + Math.floor(i / 10) * 200, 0.42, col, i, { alpha: win || T < w('O3', 'every other') ? 1 : 0.28 }); void r; }
      stamp('elected one MP', 600, 960, 52, w('O3', 'tops'), { color: PC.lab });
      stamp('elected nobody', 1340, 960, 52, w('O3', 'nobody'), { color: P.grey });
    });
    sub(c('O4'), null, () => {
      [['keeps the simple cross', w('O4', 'simple cross')], ['keeps MPs tied to a place', w('O4', 'tied')], ['seats in proportion to votes', w('O4', 'proportion')]].forEach(([s, t0], i) => {
        grp(960, 220 + i * 150, popS(t0), 0, () => { tick(-560, 0, 1.6); txt(s, -480, 0, 64, { align: 'left' }); });
      });
      stamp('proportional approval voting', 960, 820, 86, w('O4', 'proportional approval'), { color: P.teal });
    });
  }

  // D1-D2: districts from existing constituencies
  const MAPC = (() => { const r = rand(11), cells = []; for (let col = 0; col < 12; col++) for (let row = 0; row < 5; row++) cells.push({ x: 300 + col * 110 + (row % 2) * 55 + (r() - 0.5) * 14, y: 300 + row * 96 + (r() - 0.5) * 14, d: Math.floor(col / 2) * 5 + (col % 2 ? 0 : 0), col, row }); cells.forEach((c2) => { c2.d = Math.floor((c2.col * 5 + c2.row) / 5); }); return cells; })();
  function sMap() {
    const t = T, grpT = w('D1', 'groups');
    wt('districts', 960, 110, 90, c('D1'), w('D1', 'map', 0.4), { color: P.blue });
    const DC = [P.red, P.teal, P.gold, P.blue, P.plum, P.green];
    MAPC.forEach((cl, i) => {
      const a = fadeIn(c('D1') + i * 0.01, 0.3), gu = eOut(prog(t, grpT + cl.d * 0.12, grpT + cl.d * 0.12 + 0.5));
      grp(cl.x, cl.y, a, 0, () => {
        const hx = []; for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * Math.PI / 3; hx.push([Math.cos(an) * 58, Math.sin(an) * 58]); }
        poly(hx, 1, { strokeWidth: 2, stroke: P.grey, fill: gu > 0.02 ? DC[cl.d % 6] : undefined, fillStyle: 'hachure', hachureGap: 12, fillWeight: 1.6 });
        if (gu > 0.5) dot(0, 0, 5, DC[cl.d % 6]); else KC++;
      });
    });
    txt('each hexagon: one of today\'s constituencies', 960, 830, 40, { font: PRINT, color: P.grey, alpha: fadeIn(c('D1') + 0.6) * fadeOut(c('D2')) });
    [['650 constituencies', w('D2', 'roughly'), P.ink], ['→ about 128 districts × 5 MPs', w('D2', 'each electing'), P.teal], ['still 650 seats · no new boundaries', w('D2', 'stays'), P.green]].forEach(([s, t0, col], i) => txt(s, 960, 820 + i * 70, 50, { alpha: fadeIn(t0), color: col }));
  }

  // B1-B3: the ballot
  const BAL = [
    ['Labour Party', PC.lab, ['AHMED Sara', 'BRENNAN Thomas', 'OKONKWO Grace']],
    ['Conservative and Unionist Party', PC.con, ['FAIRBAIRN Eleanor', 'HUGHES Robert']],
    ['Reform UK', PC.ref, ['CARTER Lee', 'DOBSON Mark']],
    ['Liberal Democrats', PC.ld, ['EVANS Megan', 'KHAN Imran']],
    ['Green Party', PC.grn, ['NWOSU Adaeze', 'THORNTON Jake']],
    ['Independent', PC.ind, ['QUINN Siobhan']],
  ];
  function ballotPaper(x, y, s, marks, partyMarks, hi) {
    // marks: { 'AHMED Sara': t0 }, partyMarks: { 'Green Party': t0 }, hi: party name -> highlight alpha
    grp(x, y, s, 0, () => {
      const wB = 980, rows = BAL.reduce((n, p) => n + 1 + p[2].length, 0), rh = 46, hB = 200 + rows * rh;
      rect(-wB / 2, -hB / 2, wB, hB, 1, { fill: '#ffffff', fillStyle: 'solid', strokeWidth: 3 });
      let yy = -hB / 2 + 50;
      txt('North Riverside District · five MPs', -wB / 2 + 30, yy, 40, { align: 'left', font: PRINT, weight: 400 });
      yy += 50; rect(-wB / 2 + 20, yy - 24, wB - 40, 52, 1, { fill: P.ink, fillStyle: 'solid', stroke: 'none' });
      txt('Vote for as many candidates as you like', -wB / 2 + 40, yy + 2, 34, { align: 'left', font: PRINT, color: '#ffffff' });
      yy += 72;
      BAL.forEach(([pn, col, cands]) => {
        const h = hi && hi[pn] ? hi[pn] : 0;
        if (pn !== 'Independent') {
          rect(-wB / 2 + 20, yy - rh / 2, wB - 40, rh, 1, { fill: '#ecebe6', fillStyle: 'solid', strokeWidth: 1.5, stroke: P.grey });
          txt(pn, -wB / 2 + 40, yy, 34, { align: 'left', color: col });
          txt('approve all', wB / 2 - 150, yy, 26, { align: 'right', font: PRINT, color: P.grey });
          box(wB / 2 - 80, yy, 40, 4);
          if (partyMarks[pn] != null && T > partyMarks[pn]) cross(wB / 2 - 80, yy, 13, partyMarks[pn], P.blue); else KC += 2;
        } else { txt('Independent', -wB / 2 + 40, yy, 34, { align: 'left', color: col }); KC += 6; }
        yy += rh;
        cands.forEach((cn) => {
          if (h > 0.01) { ctx.save(); ctx.globalAlpha *= h * 0.35; ctx.fillStyle = col; ctx.fillRect(-wB / 2 + 22, yy - rh / 2 + 3, wB - 44, rh - 6); ctx.restore(); }
          const [sur, fn] = cn.split(' ');
          txt(sur + ' ' + fn, -wB / 2 + 90, yy, 32, { align: 'left', font: PRINT });
          box(wB / 2 - 80, yy, 34, 2.5);
          if (marks[cn] != null && T > marks[cn]) cross(wB / 2 - 80, yy, 11, marks[cn], P.blue); else KC += 2;
          yy += rh;
        });
      });
    });
  }
  function sBallot() {
    const t = T;
    const marks = { 'AHMED Sara': w('B1', 'cross'), 'EVANS Megan': w('B1', 'every candidate'), 'QUINN Siobhan': w('B1', 'As many'), 'BRENNAN Thomas': w('B3', 'some of its') };
    const partyMarks = { 'Green Party': w('B2', 'cross there'), 'Labour Party': w('B3', "party's box") };
    const hi = { 'Green Party': fadeIn(w('B2', 'approves all'), 0.5), 'Labour Party': fadeIn(w('B3', "party's box", 0.4), 0.5) };
    ballotPaper(620, 560, 0.98 * popS(c('B1') - 0.3, 0.6), marks, partyMarks, hi);
    const rx = 1500;
    sub(c('B1'), c('B2'), () => {
      txt('cross every candidate', rx, 300, 56); txt('you approve of', rx, 370, 56);
      txt('across parties is fine', rx, 520, 44, { font: PRINT, color: P.teal, alpha: fadeIn(w('B1', 'As many')) });
    });
    sub(c('B2'), c('B3'), () => {
      txt('party box', rx, 300, 60, { color: PC.grn }); txt('= approve all of', rx, 380, 48, { font: PRINT }); txt("that party's candidates", rx, 440, 48, { font: PRINT });
      txt('a straight ticket is one mark', rx, 580, 44, { color: P.teal, alpha: fadeIn(w('B2', 'one mark')) });
    });
    sub(c('B3'), null, () => {
      txt('party box + candidate', rx, 300, 52, { color: PC.lab }); txt('= the extra cross', rx, 370, 46, { font: PRINT }); txt('changes nothing', rx, 430, 46, { font: PRINT });
      stamp('no spoilt ballots', rx, 600, 64, w('B3', "can't spoil"), { color: P.green });
      txt('every pattern of crosses is valid', rx, 740, 40, { font: PRINT, alpha: fadeIn(w('B3', 'Every pattern')) });
    });
  }

  // C1-C8: the count
  function sCount() {
    const t = T;
    sub(null, c('C3'), () => {
      wt('the count: one seat at a time', 960, 120, 76, c('C1'), w('C1', 'one at a time', 0.5), { color: P.blue });
      txt('each ballot\'s weight', 960, 300, 46, { font: PRINT, color: P.grey, alpha: fadeIn(c('C2')) });
      [['1', 'to start', c('C1')], ['1/3', 'after 1 winner', w('C2', 'a third')], ['1/5', 'after 2', w('C2', 'a fifth')], ['1/7', 'after 3', w('C2', 'seventh')]].forEach(([f, d, t0], i) => {
        const x = 420 + i * 360, s = 1 - i * 0.2;
        grp(x, 560, popS(t0), 0, () => { grp(0, 0, s, 0, () => { paper(200, 260); for (let k = 0; k < 3; k++) { line(-60, -60 + k * 60, 30, -60 + k * 60, 1, { strokeWidth: 2, stroke: P.grey }); box(65, -60 + k * 60, 30, 2); } cross(65, -60, 9, t0 + 0.2, P.blue); }); txt('× ' + f, 0, 220, 72, { color: P.teal }); txt(d, 0, 290, 38, { font: PRINT, color: P.grey }); });
      });
    });
    sub(c('C3'), c('C8'), () => {
      txt('5 seats · 100 voters', 960, 90, 56, { color: P.ink });
      // seat slots
      const wins = [['A', w('C4', 'wins')], ['B', w('C5', 'Round two')], ['C', w('C5', 'Round three')], ['A', w('C6', 'second seat')], ['B', w('C6', 'edges out')]];
      for (let i = 0; i < 5; i++) {
        const x = 660 + i * 150; circ(x, 200, 110, 1, { strokeWidth: 2.5, stroke: P.grey });
        const [g, t0] = wins[i]; if (t > t0) token(x, 200, 0.62 * popS(t0), g, GC[g]); else KC += 6;
        txt('seat ' + (i + 1), x, 280, 28, { font: PRINT, color: P.grey });
      }
      const ev = {
        A: [[0, 42], [w('C4', 'fourteen'), 14], [w('C6', 'second seat', 0.6), 8.4]],
        B: [[0, 31], [w('C5', 'just over ten'), 10.33], [w('C6', 'edges out', 0.6), 6.2]],
        C: [[0, 17], [w('C5', 'seventeen', 0.8), 5.67]],
        D: [[0, 10]],
      };
      const startT = { A: w('C3', 'Forty-two'), B: w('C3', 'thirty-one'), C: w('C3', 'seventeen'), D: w('C3', 'ten') };
      const div = { A: [[0, '÷1'], [w('C4', 'fourteen'), '÷3'], [w('C6', 'second seat', 0.6), '÷5']], B: [[0, '÷1'], [w('C5', 'just over ten'), '÷3'], [w('C6', 'edges out', 0.6), '÷5']], C: [[0, '÷1'], [w('C5', 'seventeen', 0.8), '÷3']], D: [[0, '÷1']] };
      ['A', 'B', 'C', 'D'].forEach((g, i) => {
        const y = 420 + i * 140, a = fadeIn(startT[g]), v = val(ev[g], t) * eOut(prog(t, startT[g], startT[g] + 0.7));
        const raw = { A: 42, B: 31, C: 17, D: 10 }[g];
        txt('party ' + g, 470, y, 54, { align: 'right', color: GC[g], alpha: a });
        hbar(520, y - 30, 900, 64, v / 45, GC[g], '', a > 0.5 ? (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1)) : '', { vs: 44 });
        txt(raw + ' voters', 1560, y, 34, { align: 'left', font: PRINT, color: P.grey, alpha: a });
        let d = '÷1'; div[g].forEach(([te, s]) => { if (t >= te) d = s; });
        txt(d, 1720, y, 44, { align: 'left', color: P.teal, alpha: a * fadeIn(w('C4', 'fourteen')) });
      });
      stamp('A 2 · B 2 · C 1 · D 0', 960, 990, 60, c('C7'), { color: P.green });
    });
    sub(c('C8'), null, () => {
      txt('divisors', 960, 160, 52, { font: PRINT, color: P.grey });
      ['1', '3', '5', '7'].forEach((d, i) => txt(d, 600 + i * 240, 300, 150, { alpha: fadeIn(w('C8', ['one', 'three', 'five', 'seven'][i])), color: P.teal }));
      stamp('Sainte-Laguë', 960, 500, 90, w('C8', 'Sahnt'), { color: P.blue });
      txt('used for party seats in New Zealand and Germany', 960, 640, 46, { font: PRINT, alpha: fadeIn(w('C8', 'New Zealand')) });
      txt('here, voters pick which candidates fill them', 960, 780, 60, { color: P.green, alpha: fadeIn(w('C8', 'voters, not parties')) });
    });
  }

  // R1-R4: what it would do (the user's simulation)
  function sResults() {
    const t = T;
    txt('simulation: 2024 results swung to YouGov, 8–9 November 2026', 960, 70, 38, { font: PRINT, color: P.grey, alpha: fadeIn(c('R1')) });
    sub(null, c('R3'), () => {
      wt('what would it do?', 960, 170, 84, c('R1'), w('R1', 'do?', 0.3), { color: P.blue });
      txt('Labour, 27% of the vote', 960, 330, 56, { color: PC.lab, alpha: fadeIn(c('R2')) });
      const x0 = 560, ww = 1000, sc = (v) => (v / 320) * ww;
      [['first past the post', 287, w('R2', 'first past')], ['proportional approval', 189, w('R2', 'Under proportional')]].forEach(([n, v, t0], i) => {
        const y = 480 + i * 170, u = eOut(prog(t, t0, t0 + 0.9));
        txt(n, x0 - 20, y, 46, { align: 'right', alpha: fadeIn(t0) });
        rect(x0, y - 40, sc(v) * u, 80, 1, { fill: PC.lab, fillStyle: 'solid', stroke: 'none' });
        txt(String(v) + ' seats', x0 + sc(v) * u + 20, y, 50, { align: 'left', font: PRINT, alpha: fadeIn(t0 + 0.6) });
      });
      const fair = 0.27 * 650; line(x0 + sc(fair), 400, x0 + sc(fair), 760, fadeIn(w('R2', '27')), { stroke: P.ink, strokeWidth: 3, strokeLineDash: [10, 10] });
      txt('27% of 650 = 176', x0 + sc(fair), 800, 34, { font: PRINT, alpha: fadeIn(w('R2', '27')) });
    });
    sub(c('R3'), c('R4'), () => {
      wt('Gallagher index', 960, 190, 84, c('R3'), w('R3', 'index', 0.4), { color: P.blue });
      txt('lower is more proportional', 960, 280, 40, { font: PRINT, color: P.grey });
      const x0 = 360, ww = 1200, sc = (v) => x0 + (v / 20) * ww, y = 560;
      line(x0, y, x0 + ww, y, 1, { strokeWidth: 5 });
      [0, 5, 10, 15, 20].forEach((v) => { line(sc(v), y - 14, sc(v), y + 14, 1, { strokeWidth: 3 }); txt(String(v), sc(v), y + 50, 36, { font: PRINT }); });
      const fp = fadeIn(w('R3', 'fifteen')), pv = fadeIn(w('R3', 'three point'));
      grp(sc(15.2), y - 90, popS(w('R3', 'fifteen')), 0, () => { circ(0, 0, 60, 1, { fill: PC.lab, fillStyle: 'solid' }); txt('15.2', 0, -70, 50); txt('FPTP', 0, -125, 40, { font: PRINT }); }, fp);
      grp(sc(3.8), y - 90, popS(w('R3', 'three point')), 0, () => { circ(0, 0, 60, 1, { fill: P.green, fillStyle: 'solid' }); txt('3.8', 0, -70, 50); txt('PAV', 0, -125, 40, { font: PRINT }); }, pv);
      arrow(sc(14.4), y - 90, sc(4.8), y - 90, eOut(prog(t, w('R3', 'three point'), w('R3', 'three point', 0.6))), { stroke: P.green, strokeWidth: 5 });
      stamp("about Ireland's level", 960, 800, 60, w('R3', 'Ireland'), { color: P.teal });
    });
    sub(c('R4'), null, () => {
      wt('the divisors matter', 960, 190, 84, c('R4'), w('R4', 'matters', 0.3), { color: P.blue });
      txt('Green seats', 960, 300, 50, { color: PC.grn });
      const x0 = 620, sc = (v) => (v / 70) * 1000;
      [["D'Hondt (÷1, 2, 3 ...)", 32, w('R4', 'duh-Hont')], ['Sainte-Laguë (÷1, 3, 5 ...)', 59, w('R4', 'Sahnt')]].forEach(([n, v, t0], i) => {
        const y = 470 + i * 190, u = eOut(prog(t, t0, t0 + 0.9));
        txt(n, x0 - 20, y, 44, { align: 'right', alpha: fadeIn(t0) });
        rect(x0, y - 45, sc(v) * u, 90, 1, { fill: PC.grn, fillStyle: 'solid', stroke: 'none' });
        txt(String(v), x0 + sc(v) * u + 20, y, 60, { align: 'left', alpha: fadeIn(t0 + 0.6) });
      });
      txt('D\'Hondt favours the biggest parties', 960, 880, 44, { font: PRINT, color: P.grey, alpha: fadeIn(w('R4', '32')) });
    });
  }

  // A1-A3: why not single-member approval?
  function sSingle() {
    const t = T;
    wt('why not single seats with approval?', 960, 120, 72, c('A1'), w('A1', 'each one', 0.3), { color: P.blue });
    grp(960, 380, popS(c('A1') + 0.3), 0, () => { paper(560, 230); txt('one MP per seat', 0, -60, 46, { font: PRINT }); ['Ahmed', 'Evans'].forEach((n, i) => { txt(n, -200, 10 + i * 60, 42, { align: 'left', font: PRINT }); box(180, 10 + i * 60, 40); cross(180, 10 + i * 60, 12, c('A1') + 0.8 + i * 0.3, P.blue); }); });
    grp(560, 720, popS(w('A2', 'better local')), 0, () => { tick(-180, 0, 1.6); txt('better local MPs', -110, 0, 54, { align: 'left' }); });
    grp(1380, 720, popS(w('A2', "isn't proportional")), 0, () => { nope(-200, 0, 1.4); txt('not proportional', -140, 0, 54, { align: 'left' }); });
    txt('reformers judge every system by whether seats match votes', 960, 840, 42, { font: PRINT, alpha: fadeIn(w('A2', 'judges')) });
    stamp('looks like a lock-out of Reform UK', 960, 980, 56, w('A3', 'lock them out'), { color: P.red });
  }

  // S1-S6: STV, with the count compared head to head
  function stvTable(rowsShown) {
    const cx = [1080, 1520];
    txt('STV', cx[0], 270, 64, { color: P.plum }); txt('PAV', cx[1], 270, 64, { color: P.teal });
    const rows = [
      ['ballot', ['rank 1, 2, 3 ...', 0], ['a cross', 1], c('S2')],
      ['more support never hurts', ['can fail', 0], ['always', 1], c('S3')],
      ['never betray your favourite', ['sometimes must', 0], ['never', 1], c('S4')],
      ['the count', ['quota, transfers, loops', 0], ['one weighted sum', 1], c('S5')],
      ['track record', ['Ireland, Scotland, NI', 1], ['none yet', 0], c('S6')],
    ];
    rows.slice(0, rowsShown).forEach(([n, a, b, t0], i) => {
      const y = 380 + i * 130, al = fadeIn(t0);
      if (al <= 0) { KC += 20; return; }
      line(200, y + 62, 1740, y + 62, al, { strokeWidth: 1.5, stroke: P.grey });
      txt(n, 220, y, 46, { align: 'left', alpha: al });
      [[a, cx[0]], [b, cx[1]]].forEach(([[s2, good], x]) => { (good ? tick : nope)(x - 170, y, 1, al); txt(s2, x - 120, y, 40, { align: 'left', font: PRINT, alpha: al }); });
    });
  }
  function sSTV() {
    const t = T;
    wt('vs the single transferable vote', 960, 100, 72, c('S1'), w('S1', 'transferable', 0.5), { color: P.blue });
    txt('both use multi-member districts', 960, 180, 40, { font: PRINT, color: P.grey, alpha: fadeIn(w('S1', 'multi-member')) });
    sub(null, c('S5'), () => stvTable(3));
    sub(c('S5'), c('S6'), () => {
      // STV: a looping flowchart that writes itself on as it's described
      txt('STV count', 520, 250, 60, { color: P.plum });
      const steps = [['quota = votes ÷ (seats + 1), + 1', w('S5', 'quota')], ['elect anyone over the quota', w('S5', 'passes')], ['pass on surpluses at fractional values', w('S5', 'fractional')], ['eliminate the last-placed candidate', w('S5', 'eliminates')], ['transfer their ballots', w('S5', 'transfers')], ['repeat until every seat is filled', w('S5', 'repeats')]];
      steps.forEach(([s2, t0], i) => {
        const y = 340 + i * 105;
        grp(520, y, popS(t0), 0, () => { rect(-370, -38, 740, 76, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.5, stroke: P.plum }); txt(s2, 0, 2, 34, { font: PRINT }); });
        if (i > 0) arrow(520, y - 67, 520, y - 40, fadeIn(t0), { strokeWidth: 2.5, head: 14 }); else KC += 6;
      });
      const lp = eOut(prog(t, w('S5', 'round after round'), w('S5', 'round after round', 0.9)));
      curveP([[890, 865], [960, 865], [980, 600], [960, 445], [890, 445]], lp, { stroke: P.red, strokeWidth: 4 });
      txt('round after round', 990, 920, 34, { font: PRINT, color: P.red, alpha: lp, align: 'left' });
      txt('Scotland: counted by computer', 520, 990, 38, { color: P.grey, font: PRINT, alpha: fadeIn(w('S5', 'Scotland')) });
      // PAV: one line
      txt('PAV count', 1560, 250, 60, { color: P.teal, alpha: fadeIn(c('S5b')) });
      grp(1560, 520, popS(w('S5b', 'one rule')), 0, () => {
        rect(-330, -150, 660, 300, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: P.teal });
        txt('score = sum of approvals', 0, -80, 44);
        txt('each ballot weighted', 0, -10, 38, { font: PRINT });
        txt('1 · 1/3 · 1/5 · 1/7 ...', 0, 55, 54, { color: P.teal, alpha: fadeIn(w('S5b', 'weighted')) });
        txt('by its winners so far', 0, 115, 34, { font: PRINT, color: P.grey, alpha: fadeIn(w('S5b', 'already won')) });
      });
      stamp('check it with a calculator', 1560, 780, 50, w('S5b', 'calculator'), { color: P.green });
    });
    sub(c('S6'), null, () => stvTable(5));
  }

  // L1-L2 + M1-M5: lists and the additional member system
  function sLists() {
    const t = T;
    sub(null, c('M1'), () => {
      wt('why not closed lists?', 960, 110, 80, c('L1'), w('L1', 'party lists', 0.6), { color: P.blue });
      grp(560, 520, popS(w('L1', 'party decides')), 0, () => {
        paper(560, 520); txt('closed list', 0, -200, 54, { color: P.plum });
        ['1. party pick', '2. party pick', '3. party pick', '4. party pick'].forEach((s, i) => txt(s, 0, -100 + i * 80, 44, { font: PRINT }));
        txt('the party orders it', 0, 220, 40, { color: P.red });
      });
      grp(1360, 520, popS(w('L1', 'the voters decide')), 0, () => {
        paper(560, 520); txt('proportional approval', 0, -200, 50, { color: P.teal });
        ['AHMED', 'EVANS', 'QUINN'].forEach((s, i) => { txt(s, -120, -100 + i * 80, 44, { font: PRINT, align: 'left' }); box(150, -100 + i * 80, 40); cross(150, -100 + i * 80, 12, w('L1', 'cross party', 0.2 * i), P.blue); });
        txt('voters choose, across parties', 0, 220, 40, { color: P.green });
      });
      stamp('a personal link to your MP', 960, 930, 60, w('L2', 'personal link'), { color: P.green });
    });
    sub(c('M1'), c('M4'), () => {
      wt('the additional member system', 960, 110, 76, c('M1'), w('M1', 'system', 0.3), { color: P.blue });
      txt('Scottish Parliament · Bundestag', 960, 190, 40, { font: PRINT, color: P.grey, alpha: fadeIn(w('M1', 'Scottish')) });
      grp(640, 400, popS(w('M1', 'constituency members')), 0, () => { mini(0, 0, 0.6, P.blue, 1); txt('constituency MP', 0, 140, 44); });
      grp(1280, 400, popS(w('M1', 'list members')), 0, () => { mini(0, 0, 0.6, P.plum, 2); txt('list MP', 0, 140, 44); txt('owes the seat to the party', 0, 196, 34, { font: PRINT, color: P.grey }); });
      txt('overhang', 960, 690, 60, { color: P.red, alpha: fadeIn(c('M2')) });
      const x0 = 520, sc = (v) => (v / 760) * 1000;
      [['normal size', 598, c('M2') + 0.5], ['2021', 736, w('M3', '736')]].forEach(([n, v, t0], i) => {
        const y = 790 + i * 100, u = eOut(prog(t, t0, t0 + 0.8));
        txt(n, x0 - 20, y, 40, { align: 'right', alpha: fadeIn(t0) });
        rect(x0, y - 32, sc(v) * u, 64, 1, { fill: i ? P.red : P.grey, fillStyle: 'solid', stroke: 'none' });
        txt(String(v), x0 + sc(v) * u + 16, y, 44, { align: 'left', alpha: fadeIn(t0 + 0.5) });
      });
      stamp('2025: 23 winners not seated', 1380, 1010, 48, w('M3', '23'), { color: P.red });
    });
    sub(c('M4'), null, () => {
      wt('approval + a list tier?', 960, 120, 76, c('M4'), w('M4', 'constituency seats', 0.3), { color: P.blue });
      const steps = [['consensus candidate wins locally', '+1', P.green, w('M4', 'win locally')], ['top-up seats for that party', '−1', P.red, w('M4', 'subtract')], ['net change', '0', P.grey, w('M4', 'total')]];
      steps.forEach(([s, n, col, t0], i) => grp(960, 300 + i * 150, popS(t0), 0, () => { txt(s, -100, 0, 52, { align: 'right' }); txt(n, 120, 0, 90, { color: col }); }));
      stamp('decoy lists: Albania · Lesotho · Venezuela', 960, 880, 56, w('M5', 'decoy'), { color: P.red });
    });
  }

  // U1-U5: voters decide how proportional it is
  function sUnique() {
    const t = T;
    wt('voters decide how proportional it is', 960, 110, 72, c('U1'), w('U1', 'proportional it is', 0.4), { color: P.teal });
    sub(c('U2'), c('U4'), () => {
      // two sides and a consensus candidate
      crowd(420, 460, 4, 3, 100, 0.34 * popS(c('U2')), (i) => P.red);
      crowd(1500, 460, 4, 3, 100, 0.34 * popS(c('U2')), (i) => P.blue);
      txt('approve only your own side', 420, 720, 40, { font: PRINT, alpha: fadeIn(c('U2')) });
      txt('= list-PR proportionality', 420, 770, 40, { color: P.teal, alpha: fadeIn(w('U2', 'proportionality')) });
      grp(960, 470, popS(w('U3', 'broadly acceptable')), 0, () => token(0, 0, 1.0, 'Q', P.gold, 1, { name: 'consensus', size: 44 }));
      const a1 = eOut(prog(t, w('U3', 'spend'), w('U3', 'spend', 0.7)));
      arrow(620, 470, 870, 470, a1, { stroke: P.red, strokeWidth: 6 }); arrow(1300, 470, 1050, 470, a1, { stroke: P.blue, strokeWidth: 6 });
      txt('some of each side\'s weight', 960, 690, 44, { font: PRINT, alpha: a1 });
      stamp('over the line', 960, 860, 60, w('U3', 'over the line'), { color: P.green });
    });
    sub(c('U4'), null, () => {
      txt('Reform UK seats, simulation', 960, 300, 52, { color: PC.ref });
      const x0 = 640, sc = (v) => (v / 160) * 900;
      [['party-only approval', 140, c('U4')], ['with cross-party approval', 120, w('U4', '120')]].forEach(([n, v, t0], i) => {
        const y = 450 + i * 170, u = eOut(prog(t, t0, t0 + 0.8));
        txt(n, x0 - 20, y, 44, { align: 'right', alpha: fadeIn(t0) });
        rect(x0, y - 45, sc(v) * u, 90, 1, { fill: PC.ref, fillStyle: 'solid', stroke: 'none' });
        txt(String(v), x0 + sc(v) * u + 20, y, 60, { align: 'left', alpha: fadeIn(t0 + 0.5) });
      });
      grp(960, 900, popS(c('U5')), 0, () => { paper(1300, 160); txt('STV: a lower ranking costs nothing...', -600, -30, 46, { align: 'left', font: PRINT }); txt('...and changes nothing', 600, 34, 50, { align: 'right', color: P.red, alpha: fadeIn(w('U5', 'changes nothing')) }); });
    });
  }

  // K1-K5: the costs
  function sCosts() {
    wt('the costs, up front', 960, 110, 80, c('K1'), w('K1', 'up front', 0.3), { color: P.red });
    const items = [
      ['threshold', 'about 10–15% within a district', 'Restore Britain (3%): no seats', c('K2')],
      ['free-riding', 'skipping a "safe" candidate', 'every PR system has a version', c('K3')],
      ['central counts', 'no polling-station totals', 'Scotland already does it', c('K4')],
      ['no national precedent', 'Sweden: within-party seats', 'since 1909', c('K5')],
    ];
    items.forEach(([h, a, b, t0], i) => {
      const x = 520 + (i % 2) * 880, y = 380 + Math.floor(i / 2) * 340;
      grp(x, y, popS(t0), 0, () => { rect(-400, -130, 800, 260, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3.5, stroke: P.red }); txt(h, 0, -70, 58, { color: P.red }); txt(a, 0, 10, 40, { font: PRINT }); txt(b, 0, 70, 40, { font: PRINT, color: P.grey }); });
    });
  }

  function sEnd() {
    const t = T;
    [['the ballot: a cross', w('E1', 'a cross')], ['the count: one rule', w('E1', 'one rule')], ['the Commons: like the country', w('E1', 'looking like')]].forEach(([s, t0], i) => wt(s, 960, 200 + i * 120, 76, t0, t0 + 0.6, { color: [P.blue, P.teal, P.green][i] }));
    stamp('proportional approval voting', 960, 640, 80, c('E2'), { color: P.teal });
    grp(960, 870, popS(w('E2', 'Approve')), -0.02, () => {
      paper(700, 200);
      [['Ahmed', -40], ['Evans', 20], ['Quinn', 80]].forEach(([n, yy], i) => { txt(n, -280, yy - 30, 44, { align: 'left', font: PRINT }); box(260, yy - 30, 46); cross(260, yy - 30, 15, w('E2', 'Approve', 0.3 + i * 0.25), P.blue); });
    });
  }

  // ---------- assembly ----------
  function buildScenes() {
    SCN = [
      { start: 0, draw: sTitle },
      { start: c('O1') - 0.7, draw: sOpen },
      { start: c('D1') - 0.7, draw: sMap },
      { start: c('B1') - 0.7, draw: sBallot },
      { start: c('C1') - 0.7, draw: sCount },
      { start: c('R1') - 0.7, draw: sResults },
      { start: c('A1') - 0.7, draw: sSingle },
      { start: c('S1') - 0.7, draw: sSTV },
      { start: c('L1') - 0.7, draw: sLists },
      { start: c('U1') - 0.7, draw: sUnique },
      { start: c('K1') - 0.7, draw: sCosts },
      { start: c('E1') - 0.7, draw: sEnd },
    ];
    const E = [];
    const ev = (name, t, dur) => E.push({ name, t, dur });
    const at = (id, word, name, extra = 0) => ev(name, w(id, word, extra));
    SCN.slice(1).forEach((s) => ev('whoosh', s.start - 0.05));
    ev('stamp', 0.3); ev('scribble', 0.6, 1.0); ev('scribble', 1.9, 0.8); ev('pop', 2.4); [0, 1, 2].forEach((i) => ev('tick', 2.7 + i * 0.25));
    ev('slide', c('O1')); at('O2', 'Reform', 'slide'); at('O2', 'Greens', 'slide'); at('O3', 'tops', 'stamp'); at('O3', 'nobody', 'sad');
    ['simple cross', 'tied', 'proportion'].forEach((x) => at('O4', x, 'pop2')); at('O4', 'proportional approval', 'stamp');
    at('D1', 'groups', 'sparkle'); at('D2', 'each electing', 'pop'); at('D2', 'stays', 'ding');
    ev('pop', c('B1') - 0.3); at('B1', 'cross', 'tick'); at('B1', 'every candidate', 'tick'); at('B1', 'As many', 'tick'); at('B2', 'cross there', 'tick'); at('B2', 'approves all', 'sparkle');
    at('B3', "party's box", 'tick'); at('B3', 'some of its', 'tick'); at('B3', "can't spoil", 'stamp');
    at('C2', 'a third', 'pop2'); at('C2', 'a fifth', 'pop2'); at('C2', 'seventh', 'pop2');
    ['Forty-two', 'thirty-one', 'seventeen', 'ten'].forEach((x) => at('C3', x, 'slide'));
    at('C4', 'wins', 'ding'); at('C4', 'fourteen', 'slide'); at('C5', 'Round two', 'ding'); at('C5', 'just over ten', 'slide'); at('C5', 'Round three', 'ding');
    at('C6', 'second seat', 'ding'); at('C6', 'edges out', 'ding'); ev('stamp', c('C7'));
    ['one', 'three', 'five', 'seven'].forEach((x) => at('C8', x, 'pop2')); at('C8', 'Sahnt', 'stamp');
    at('R2', 'first past', 'slide'); at('R2', 'Under proportional', 'slide'); at('R3', 'fifteen', 'pop'); at('R3', 'three point', 'whoosh'); at('R3', 'Ireland', 'stamp');
    at('R4', 'duh-Hont', 'slide'); at('R4', 'Sahnt', 'slide');
    at('A2', 'better local', 'ding'); at('A2', "isn't proportional", 'boing'); at('A3', 'lock them out', 'stamp');
    ['S2', 'S3', 'S4', 'S6'].forEach((id) => ev('pop2', c(id))); ['quota', 'passes', 'fractional', 'eliminates', 'transfers', 'repeats'].forEach((x) => at('S5', x, 'tick')); at('S5b', 'one rule', 'pop'); at('S5b', 'calculator', 'stamp');
    at('L1', 'party decides', 'pop'); at('L1', 'the voters decide', 'pop'); at('L2', 'personal link', 'stamp');
    at('M1', 'constituency members', 'pop'); at('M1', 'list members', 'pop'); at('M3', '736', 'slide'); at('M3', '23', 'stamp');
    at('M4', 'win locally', 'pop2'); at('M4', 'subtract', 'poof'); at('M5', 'decoy', 'stamp');
    at('U3', 'broadly acceptable', 'pop'); at('U3', 'spend', 'whoosh'); at('U3', 'over the line', 'stamp'); at('U4', '140', 'slide'); at('U4', '120', 'slide'); ev('pop', c('U5'));
    ['K2', 'K3', 'K4', 'K5'].forEach((id) => ev('pop', c(id)));
    at('E1', 'a cross', 'scribble', 0); at('E1', 'one rule', 'scribble'); at('E1', 'looking like', 'scribble'); ev('stamp', c('E2')); at('E2', 'Approve', 'pop'); ev('sparkle', ce('E2', 0.8));
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
    const TR = 0.75, dt = t - SCN[i].start;
    const one = (k, dx) => { ctx.save(); ctx.translate(dx, 0); KC = k * 5000; SCN[k].draw(t); ctx.restore(); };
    if (i > 0 && dt < TR) { const e = eIO(dt / TR); one(i - 1, -W * e); one(i, W * (1 - e)); }
    else one(i, 0);
    if (CAPTIONS) drawCaption(t);
    const fi = 1 - prog(t, 0, 0.4), fo = prog(t, TL.total - 0.8, TL.total);
    if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(248,241,227,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
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
