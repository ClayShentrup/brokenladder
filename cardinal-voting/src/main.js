// "The Gift Card Fallacy" — hand-drawn explainer, rendered with rough.js on a canvas.
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

  // ---------- scenes ----------
  function sTitle() {
    const t = T;
    stamp('a votewell explainer', 960, 230, 50, 0.3, { color: P.teal, rot: -0.04 });
    wt("Rate, Don't Rank", 960, 450, 190, 0.6, 1.6);
    line(520, 560, 1400, 560, eOut(prog(t, 1.5, 1.9)), { stroke: P.red, strokeWidth: 7 });
    wt(SCRIPT.subtitle, 960, 660, 62, 1.8, 2.9, { font: PRINT, color: P.teal });
    ballotCard(380, 860, 0.45 * popS(2.2), 'rank', ['A', 'B', 'C'], [2, 1, 3], { rot: -0.12 });
    ballotCard(1540, 860, 0.45 * popS(2.45), 'score', ['A', 'B', 'C'], [5, 3, 0], { rot: 0.1 });
    txt('?', 720, 860, 90, { alpha: fadeIn(2.6), color: P.plum });
    txt('!', 1200, 860, 90, { alpha: fadeIn(2.8), color: P.green });
  }

  // O1-O5: Alaska 2022 cold open
  function sAlaska() {
    const t = T;
    stamp('Alaska, August 2022', 960, 110, 58, c('O1'), { color: P.blue, rot: -0.03 });
    const elim = t > w('O3', 'eliminated');
    const xs = [[480, 'Peltola', CP.peltola, w('O1', 'Mary')], [960, 'Palin', CP.palin, w('O1', 'Sarah')], [1440, 'Begich', CP.begich, w('O1', 'Nick')]];
    const up = eIO(prog(t, c('O2') - 0.2, c('O2') + 0.5));
    xs.forEach(([x, n, col, t0]) => token(x, lerp(420, 300, up), lerp(1.4, 0.9, up) * popS(t0), n, col, n === 'Begich' && elim ? 0.35 : 1, { name: n }));
    if (t > c('O2') - 0.1) {
      const o2out = fadeOut(c('O4') - 0.2, 0.4);
      matchup(700, 640, 0.9 * popS(w('O2', 'Begich beat Peltola')), 'Begich', 'Peltola', 0.525, CP.begich, CP.peltola, w('O2', 'Begich beat Peltola'), o2out);
      matchup(1220, 860, 0.9 * popS(w('O2', 'Begich beat Palin')), 'Begich', 'Palin', 0.614, CP.begich, CP.palin, w('O2', 'Begich beat Palin'), o2out);
      txt('preferred over each rival', 960, 1020, 46, { alpha: fadeIn(w('O2', 'majority preferred')) * o2out, color: P.green });
    } else KC += 200;
    if (elim) { xMark(1440, 300, popS(w('O3', 'eliminated')), 1); stamp('eliminated first', 1440, 470, 54, w('O3', 'eliminated')); } else KC += 6;
    if (t > c('O4') - 0.2) {
      wt("not a glitch: it's how instant runoff works", 960, 640, 58, w('O4', "wasn't"), w('O4', 'works', 0.4), { color: P.red });
      wt('a spoiler problem, recreated inside the fix', 960, 740, 50, w('O4', 'quietly'), ce('O4'), { color: P.plum });
    } else KC += 4;
    if (t > c('O5') - 0.2) {
      ctx.save(); ctx.globalAlpha = 0.9 * fadeIn(c('O5') - 0.2, 0.4); ctx.drawImage(PAPER, -W, 0, W * 3, H); ctx.restore();
      ballotCard(520, 560, popS(w('O5', 'rank')), 'rank', ['Peltola', 'Palin', 'Begich'], [3, 1, 2], { rot: -0.05 });
      xMark(520, 560, 0.9 * popS(w('O5', 'rate them')), 1);
      ballotCard(1400, 560, popS(w('O5', 'rate them')), 'score', ['Peltola', 'Palin', 'Begich'], [0, 5, 4], { rot: 0.05 });
      stamp('cardinal voting', 1400, 920, 60, w('O5', 'cardinal'), { color: P.green });
    } else KC += 300;
  }

  // P1-P4: the problem with choose-one
  function sProblem() {
    const t = T;
    const p1 = fadeOut(c('P2') - 0.2, 0.4);
    ballotCard(960, 520, popS(c('P1')), 'one', ['Favorite', 'Compromise', 'Worst'], [0, 1, 0], { alpha: p1 });
    wt('punished for having a favorite', 960, 900, 56, w('P1', 'punishes'), w('P1', 'favorite', 0.4), { color: P.red, alpha: p1 });
    if (t > c('P2') - 0.2 && t < c('P3') + 0.4) {
      const out = fadeOut(c('P3') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        token(420, 300, 0.75 * popS(w('P2', 'Nader')), 'Nader', CP.nader, 1, { name: 'Nader' });
        token(960, 300, 0.75 * popS(w('P2', 'Nader', 0.3)), 'Gore', CP.gore, 1, { name: 'Gore' });
        token(1500, 300, 0.75 * popS(w('P2', 'Bush')), 'Bush', CP.bush, 1, { name: 'Bush' });
        const go = eIO(prog(t, w('P2', 'nine in ten'), w('P2', 'someone else')));
        for (let i = 0; i < 10; i++) {
          const tx = i === 0 ? 420 : i < 6 ? 960 + (i - 3) * 60 : 1500 + (i - 8) * 60;
          mini(lerp(220 + i * 50, tx, go), 720, 0.4 * popS(w('P2', 'rated Nader')), CP.nader, i, { mood: i === 0 ? 0.6 : -0.2 });
        }
        txt('Nader was their favorite', 460, 560, 42, { alpha: fadeIn(w('P2', 'rated Nader')), font: PRINT });
        stamp('9 in 10 voted for someone else', 960, 940, 58, w('P2', 'someone else'));
      }, out);
    } else KC += 400;
    if (t > c('P3') - 0.2) {
      stamp('St. Louis, 2017', 960, 120, 56, c('P3'), { color: P.blue });
      const bars = [['winner', 0.32, P.red], ['others (6 candidates)', 0.68, P.grey]];
      bars.forEach(([lab, f, col], i) => hbar(640, 330 + i * 120, 900, 70, f * eOut(prog(t, w('P3', 'thirty-two'), w('P3', 'thirty-two', 1))), col, lab, Math.round(f * 100) + '%', { ls: 44 }));
      wt('most voters wanted someone else, but they split', 960, 560, 50, w('P3', 'Most voters'), w('P3', 'split'), { color: P.plum });
      // P4: two-party funnel
      if (t > c('P4') - 0.2) {
        grp(960, 820, popS(w('P4', 'vote splitting')), 0, () => {
          path('M -380 -120 L 380 -120 L 90 80 L 90 160 L -90 160 L -90 80 Z', 1, { fill: P.cream, fillStyle: 'solid' });
          [P.green, P.plum, P.gold, P.teal].forEach((col, i) => circ(-270 + i * 180, -70, 50, 1, { fill: col, fillStyle: 'solid' }));
          circ(-40, 130, 50, 1, { fill: P.blue, fillStyle: 'solid' }); circ(40, 130, 50, 1, { fill: P.red, fillStyle: 'solid' });
        });
        txt('two parties', 1300, 950, 50, { alpha: fadeIn(w('P4', 'two big')), color: P.red });
        txt('"throwing your vote away"', 560, 950, 44, { alpha: fadeIn(w('P4', 'throwing')), font: PRINT });
      } else KC += 40;
    } else KC += 200;
  }

  // F1-F4: two fixes
  function sFixes() {
    const t = T;
    const f1 = fadeOut(c('F2') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      card(540, 480, 640, 360, 'RANK', [['1st, 2nd, 3rd...']], P.blue, popS(w('F1', 'rank')), 1, -0.03);
      card(1380, 480, 640, 360, 'RATE', [['like rating a restaurant']], P.green, popS(w('F1', 'rate')), 1, 0.03);
      if (t > w('F1', 'restaurant')) for (let k = 0; k < 5; k++) star(1230 + k * 75, 640, 28, k < 4 ? P.gold : null); else KC += 5;
    }, f1);
    // F2: instant runoff rounds
    if (t > c('F2') - 0.2 && t < c('F3') + 0.4) {
      const out = fadeOut(c('F3') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        txt('instant runoff', 960, 110, 72, { color: P.blue });
        const rounds = [[0.34, 0.28, 0.22, 0.16], [0.40, 0.35, 0.25, 0], [0.55, 0.45, 0, 0]];
        const r1 = w('F2', 'fewest'), r2 = w('F2', 'Repeat');
        const k = t < r1 + 0.6 ? 0 : t < r2 + 0.6 ? 1 : 2;
        const prev = rounds[Math.max(0, k - 1)], cur = rounds[k];
        const u = eIO(prog(t, k === 1 ? r1 + 0.6 : r2 + 0.6, (k === 1 ? r1 : r2) + 1.5));
        ['Ana', 'Ben', 'Cy', 'Dee'].forEach((n, i) => {
          const f = k === 0 ? cur[i] : lerp(prev[i], cur[i], u);
          const gone = (k >= 1 && i === 3) || (k >= 2 && i === 2);
          hbar(560, 300 + i * 130, 900, 80, f * 1.6, gone ? P.grey : PALETTE[i], n, f > 0 ? Math.round(f * 100) + '%' : '', { ls: 52 });
          if (gone) xMark(460, 300 + i * 130, 0.5, 1); else KC += 2;
        });
        line(560 + 900 * 0.5 * 1.6 / 1, 240, 560 + 900 * 0.5 * 1.6, 760, fadeIn(w('F2', 'majority')), { stroke: P.red, strokeWidth: 3 });
        txt('majority', 560 + 720, 220, 40, { alpha: fadeIn(w('F2', 'majority')), color: P.red, font: PRINT });
        txt(['round 1: first choices', 'round 2: fewest eliminated, ballots move', 'round 3: until someone has a majority'][k], 960, 900, 48, { font: PRINT });
      }, out);
    } else KC += 300;
    if (t > c('F3') - 0.2) {
      ballotCard(560, 540, popS(w('F3', 'Score voting')), 'score', ['Ana', 'Ben', 'Cy'], [5, 3, 0], { alpha: fadeIn(c('F3')) });
      txt('add them up', 560, 880, 52, { alpha: fadeIn(w('F3', 'Add them')), color: P.green });
      ballotCard(1360, 540, popS(w('F4', 'approval voting')), 'approve', ['Ana', 'Ben', 'Cy'], [1, 1, 0]);
      txt('score, with just 0 or 1', 1360, 300, 44, { alpha: fadeIn(w('F4', 'zero or one')), font: PRINT, color: P.teal });
      stamp('one rule removed', 1360, 880, 60, w('F4', 'one rule removed'), { color: P.green });
      wt('no more "vote for ONE"', 1360, 980, 46, w('F4', 'throws out'), ce('F4'), { color: P.plum });
    } else KC += 200;
  }

  // R1-R6: center squeeze
  function sSqueeze() {
    const t = T;
    const a = fadeOut(c('R3') - 0.2, 0.4);
    if (t < c('R3') + 0.4) {
      const dimRest = t > w('R2', 'invisible');
      ballotCard(700, 520, popS(c('R1')), 'rank', ['Favorite', 'Backup', 'Other'], [1, 2, 3], { alpha: a, dim: dimRest ? [false, true, true] : null });
      wt('"if they lose, my vote moves to my backup"', 1300, 360, 44, w('R1', 'if they lose'), w('R1', 'backup', 0.4), { alpha: a, font: PRINT });
      wt('your backup is invisible while your favorite is alive', 1300, 700, 44, w('R2', 'invisible'), w('R2', 'race'), { alpha: a, color: P.red });
      wt('one preference per ballot at a time', 1300, 800, 44, w('R2', 'one preference'), ce('R2'), { alpha: a, color: P.plum });
    } else KC += 200;
    if (t > c('R3') - 0.2 && t < c('R5') + 0.4) {
      const out = fadeOut(c('R5') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        line(260, 330, 1660, 330, popS(c('R3')) > 0 ? 1 : 0, { strokeWidth: 4 });
        txt('left', 260, 280, 40, { font: PRINT }); txt('right', 1660, 280, 40, { font: PRINT });
        const elim = t > w('R4', 'eliminated first');
        [[420, 'Left', CP.L, 35, w('R3', 'Thirty-five')], [960, 'Center', CP.C, 32, w('R3', 'thirty-two')], [1500, 'Right', CP.R, 33, w('R3', 'thirty-three')]].forEach(([x, n, col, pct, t0]) => {
          token(x, 330, 0.7 * popS(t0), n, col, n === 'Center' && elim ? 0.35 : 1);
          txt(pct + '% first choice', x, 470, 44, { alpha: fadeIn(t0), color: col });
        });
        arrow(560, 420, 860, 420, prog(t, w('R3', 'rank center second'), w('R3', 'second')), { stroke: P.green, strokeWidth: 4 });
        arrow(1360, 420, 1060, 420, prog(t, w('R3', 'rank center second'), w('R3', 'second')), { stroke: P.green, strokeWidth: 4 });
        txt('2nd choice', 710, 390, 32, { alpha: fadeIn(w('R3', 'second')), font: PRINT }); txt('2nd choice', 1210, 390, 32, { alpha: fadeIn(w('R3', 'second')), font: PRINT });
        matchup(600, 690, 0.75 * popS(w('R4', 'over left')), 'Center', 'Left', 0.65, CP.C, CP.L, w('R4', 'over left'), 1);
        matchup(1320, 690, 0.75 * popS(w('R4', 'over right')), 'Center', 'Right', 0.67, CP.C, CP.R, w('R4', 'over right'), 1);
        if (elim) { xMark(960, 330, 0.8 * popS(w('R4', 'eliminated first')), 1); stamp('the center squeeze', 960, 940, 66, w('R4', 'eliminated first', 0.4)); } else KC += 6;
      }, out);
    } else KC += 400;
    if (t > c('R5') - 0.2) {
      card(560, 500, 760, 330, 'Burlington, VT 2009', [['Montroll beat Kiss 54-46', fadeIn(w('R5', 'beaten each'))], ['Montroll beat Wright 56-44', fadeIn(w('R5', 'beaten each', 0.4))], ['...and finished third', fadeIn(w('R5', 'eliminated him'))]], P.blue, popS(w('R5', 'Burlington')), 1, -0.03);
      stamp('repealed 2010', 560, 860, 60, w('R5', 'repealed'));
      card(1360, 500, 760, 330, 'Alaska 2022', [['Begich beat Peltola 52-48', fadeIn(w('R6', 'Beggitch'))], ['Begich beat Palin 61-39', fadeIn(w('R6', 'Beggitch', 0.4))], ['...and was eliminated', fadeIn(w('R6', 'squeezed'))]], P.red, popS(w('R6', 'Alaska')), 1, 0.03);
    } else KC += 200;
  }

  // B1-B6: favorite betrayal & paradoxes
  function sBetray() {
    const t = T;
    const a = fadeOut(c('B4') - 0.2, 0.4);
    if (t < c('B4') + 0.4) {
      grp(0, 0, 1, 0, () => {
        wt('the incentive RCV was supposed to end', 960, 110, 60, w('B1', 'center squeeze'), w('B1', 'end'), { color: P.red });
        const flip = eIO(prog(t, w('B2', 'flipped'), w('B2', 'flipped', 1)));
        const palin = 58973 - 2600 * flip, beg = 53810 + 2600 * flip;
        hbar(560, 330, 1000, 80, palin / 70000, CP.palin, 'Palin', Math.round(palin).toLocaleString('en-US'));
        hbar(560, 460, 1000, 80, beg / 70000, CP.begich, 'Begich', Math.round(beg).toLocaleString('en-US'));
        txt('gap: ~5,000 votes', 1300, 230, 44, { alpha: fadeIn(w('B2', 'five thousand')), font: PRINT });
        if (t > w('B2', 'flipped', 1)) { stamp('Begich survives... and beats Peltola', 960, 600, 54, w('B2', 'survived'), { color: P.green }); } else KC += 4;
        ballotCard(560, 830, 0.7 * popS(w('B3', 'ranking their favorite second')), 'rank', ['Palin', 'Begich', 'Peltola'], [2, 1, 3], { colors: [CP.palin, CP.begich, CP.peltola], rot: -0.05 });
        stamp('favorite betrayal', 1260, 820, 70, w('B3', 'favorite betrayal'));
        txt('the same lesser-evil vote Nader fans cast', 1260, 940, 42, { alpha: fadeIn(w('B3', 'Nader')), font: PRINT });
      }, a);
    } else KC += 400;
    if (t > c('B4') - 0.2) {
      const b4 = fadeOut(c('B6') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        card(560, 440, 760, 440, 'monotonicity failure', [['6,000 more voters rank', fadeIn(w('B4', 'six thousand'))], ['Peltola first...', fadeIn(w('B4', 'six thousand'))], ['...and Peltola LOSES', fadeIn(w('B4', 'would have lost'))]], P.plum, popS(w('B4', 'stranger')), 1, -0.03);
        card(1360, 440, 760, 440, 'no-show paradox', [['some voters do better', fadeIn(w('B5', 'better result'))], ['by staying home', fadeIn(w('B5', 'staying home'))], ['Alaska had one too', fadeIn(w('B5', 'Alaska'))]], P.teal, popS(w('B5', 'no-show')), 1, 0.03);
        house(1360, 860, 0.6 * popS(w('B5', 'staying home')), {});
      }, b4);
      if (t > c('B6') - 0.2) stamp('strategy moved somewhere harder to see', 960, 400, 66, w('B6', 'moves it'), { color: P.red, alpha: fadeOut(c('B6a') - 0.2, 0.4) }); else KC += 4;
      if (t > c('B6a') - 0.2) {
        const o = fadeOut(c('B6b') - 0.3, 0.4);
        card(560, 380, 760, 300, 'betray your favorite', [['cost: almost nothing', fadeIn(w('B6a', 'costs you'))], ['(your favorite rarely wins)', fadeIn(w('B6a', 'costs you', 0.4))]], P.green, popS(w('B6a', 'almost never')), o, -0.02);
        card(1360, 380, 760, 300, 'stay honest', [['risk: your worst choice wins', fadeIn(w('B6a', 'risks'))]], P.red, popS(w('B6a', 'Ranking your favorite')), o, 0.02);
        stamp('so: betray every time, just in case', 960, 640, 58, w('B6a', 'every time'), { color: P.plum, alpha: o });
        wt('third parties stay small', 960, 760, 54, w('B6a', 'third parties stay'), ce('B6a'), { color: P.red, alpha: o });
      } else KC += 100;
      if (t > c('B6b') - 0.2) card(960, 760, 980, 300, 'Australia', [['instant runoff since 1918', fadeIn(w('B6b', 'over a century'))], ['still a two-party contest', fadeIn(w('B6b', 'two major'))]], P.blue, popS(c('B6b')), 1, -0.02); else KC += 40;
    } else KC += 300;
  }

  // C1-C5: the cardinal fix
  function sCardinal() {
    const t = T;
    const a = fadeOut(c('C5') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      const begScore = t > w('C2', 'five to be safe') ? 5 : t > w('C2', 'maybe a four') ? 4 : 0;
      const palScore = t > w('C2', 'Palin gets') ? 5 : 0;
      ballotCard(560, 520, 1.1 * popS(c('C1')), 'score', ['Palin', 'Begich', 'Peltola'], [palScore, begScore, 0], { colors: [CP.palin, CP.begich, CP.peltola] });
      wt('never score your compromise above your favorite', 1350, 380, 44, w('C2', 'never have to'), w('C2', 'Palin.'), { color: P.green });
      wt('raise the compromise without lowering the favorite', 1350, 470, 44, w('C2', 'Raising'), ce('C2'), { color: P.green });
      grp(1350, 760, popS(w('C3', 'favorite betrayal')), 0, () => {
        rect(-400, -150, 800, 300, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
        txt('favorite betrayal criterion', 0, -100, 44, { color: P.blue });
        [['score', true], ['approval', true], ['instant runoff', false]].forEach(([n, ok], i) => {
          txt(n, -120, -30 + i * 60, 44, { align: 'right' });
          if (ok) checkMark(40, -30 + i * 60, 0.45, fadeIn(w('C3', 'both pass'))); else { if (t > w('C3', 'both pass')) xMark(40, -30 + i * 60, 0.35, 1); else KC += 4; }
        });
      });
      wt('nothing eliminated: one round, every rating counts', 960, 1010, 50, w('C4', 'center squeeze'), w('C4', 'one round'), { color: P.plum });
    }, a);
    if (t > c('C5') - 0.2) {
      const nad = t > w('C5', 'add Nader');
      ballotCard(620, 540, 1.1 * popS(c('C5')), nad ? 'approve' : 'one', ['Nader', 'Gore', 'Bush'], [nad ? 1 : 0, 1, 0], { colors: [CP.nader, CP.gore, CP.bush], title: t > w('C5', 'new rule') ? 'vote for as many as you like' : 'vote for ONE' });
      person(1350, 560, { s: popS(w('C5', 'election official')), color: P.blue, hat: 'cap', arms: 'give', mood: 0.7, k: 140 });
      bubble(1400, 230, 640, 170, popS(w('C5', 'new rule')), '"new rule: vote for as many as you like"', 36, { tail: -40 });
      stamp('keep Gore. add Nader.', 960, 980, 62, w('C5', 'keep Gore'), { color: P.green });
    } else KC += 300;
  }

  // S1-S5: won't everyone bullet vote?
  function sStrategy() {
    const t = T;
    const a = fadeOut(c('S3') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      bubble(960, 230, 1300, 200, popS(c('S1')), null, 40, { tail: -100, inner: () => { txt('"approving my 2nd choice could help them beat my favorite,', 0, -30, 38); txt('so I\'ll approve only my favorite"', 0, 30, 38); } });
      scale2(960, 640, popS(w('S2', 'Half')), t > w('S2', 'forgets') ? -0.12 : t > w('S2', 'much worse') ? 0 : 0.15, 1);
      txt('cost: might beat your favorite', 640, 840, 42, { alpha: fadeIn(w('S2', 'beat your favorite')), color: P.red });
      txt('benefit: might beat someone worse', 1280, 840, 42, { alpha: fadeIn(w('S2', 'much worse')), color: P.green });
      stamp('the objection forgets the benefit', 960, 980, 58, w('S2', 'forgets'));
    }, a);
    if (t > c('S3') - 0.2 && t < c('S4') + 0.4) {
      const out = fadeOut(c('S4') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        const ox = 300, ww = 1300, y0 = 560;
        arrow(ox, y0, ox + ww, y0, popS(c('S3')) > 0 ? 1 : 0, { strokeWidth: 4 });
        txt('how much you like them', ox + ww / 2, y0 + 80, 40, { font: PRINT, alpha: fadeIn(c('S3')) });
        const cs = [['Long Shot', 0.95, P.green], ['Compromise', 0.7, P.blue], ['Meh', 0.4, P.gold], ['Worst', 0.05, P.red]];
        const thr = 0.52;
        cs.forEach(([n, v, col], i) => {
          const x = ox + v * ww; token(x, y0 - 120, 0.45 * popS(c('S3') + i * 0.15), n, col, 1);
          txt(n, x, y0 - 220, 34, { font: PRINT, alpha: fadeIn(c('S3') + i * 0.15) });
          if (v > thr && t > w('S3', 'better than')) checkMark(x, y0 + 160, 0.6 * popS(w('S3', 'better than') + i * 0.2), 1); else KC += 2;
        });
        const tp = fadeIn(w('S3', 'expect to win'));
        line(ox + thr * ww, y0 - 300, ox + thr * ww, y0 + 40, tp, { stroke: P.plum, strokeWidth: 5 });
        txt('who you expect to win', ox + thr * ww, y0 - 330, 40, { alpha: tp, color: P.plum });
        wt('approve everyone above the line', 960, 920, 56, w('S3', 'approve every'), w('S3', 'expect to win', 0.4), { color: P.green });
      }, out);
    } else KC += 300;
    if (t > c('S4') - 0.2) {
      const s5 = t > c('S5') - 0.2;
      grp(0, 0, 1, 0, () => {
        card(460, 360, 640, 320, 'Fargo 2022 mayor', [['~1.6 approvals per ballot', fadeIn(w('S4', 'one and a half'))]], P.blue, popS(w('S4', 'Fargo')), 1, -0.02);
        card(1360, 360, 840, 320, 'St. Louis 2025', [['1 in 3 approved more than one', fadeIn(w('S4', 'a third'))], ['84% of long-shot fans did', fadeIn(w('S4', 'eighty percent'))]], P.red, popS(w('S4', 'St. Louis')), 1, 0.02);
      }, s5 ? fadeOut(c('S5') - 0.2, 0.4) : 1);
      if (s5) {
        const ox = 360, oy = 900, ww = 1200, h = 500;
        const ap = fadeIn(c('S5'));
        arrow(ox, oy, ox + ww + 30, oy, ap, { strokeWidth: 4 }); arrow(ox, oy, ox, oy - h - 20, ap, { strokeWidth: 4 });
        txt('share of voters strategizing', ox + ww / 2, oy + 60, 40, { alpha: ap, font: PRINT });
        txt('0%', ox, oy + 30, 32, { alpha: ap, font: PRINT }); txt('100%', ox + ww, oy + 30, 32, { alpha: ap, font: PRINT });
        const yOf = (v) => oy - v * h;
        const data = [19.1, 19.6, 20.2, 20.8, 21.4, 22.0, 22.6, 23.2, 23.8, 24.4, 24.7];
        curveP(data.map((v, i) => [ox + i / 10 * ww, yOf(v / 100)]), prog(t, w('S5', 'barely moves'), w('S5', 'twenty-five')), { stroke: P.red, strokeWidth: 6 });
        curveP(data.map((v, i) => [ox + i / 10 * ww, yOf(1 - v / 100)]), prog(t, w('S5', 'Three quarters'), ce('S5')), { stroke: P.green, strokeWidth: 6 });
        txt('approve only one: 19% to 25%', ox + ww - 300, yOf(0.3) - 20, 42, { alpha: fadeIn(w('S5', 'twenty-five')), color: P.red });
        txt('approve more than one: ~75%+', ox + ww - 300, yOf(0.8) - 40, 42, { alpha: fadeIn(w('S5', 'Three quarters')), color: P.green });
        txt('100%', ox - 50, yOf(1), 30, { alpha: ap, font: PRINT }); txt('50%', ox - 50, yOf(0.5), 30, { alpha: ap, font: PRINT });
      } else KC += 100;
    } else KC += 300;
  }

  // M1-M7: majority rule contradicts itself
  function sMajority() {
    const t = T;
    if (t < c('M2') + 0.4) {
      const out = fadeOut(c('M2') - 0.2, 0.4);
      wt('"but a majority preferred someone else!"', 960, 420, 66, c('M1'), w('M1', 'someone else'), { alpha: out });
      wt('undemocratic?', 960, 560, 90, w('M1', 'undemocratic'), ce('M1'), { alpha: out, color: P.red });
    } else KC += 4;
    if (t > c('M2') - 0.2 && t < c('M6') + 0.4) {
      const out = fadeOut(c('M6') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        txt('two proposals: X and Y', 960, 110, 64, { alpha: fadeIn(w('M2', 'Two proposals')), color: P.blue });
        const ppl = [['Amy', 'X: a little good  Y: very bad', P.teal, w('M3', 'Amy')], ['Bob', 'Y: a little good  X: very bad', P.plum, w('M3', 'Bob')], ['Cal', 'likes both', P.gold, w('M3', 'Cal')]];
        ppl.forEach(([n, d, col, t0], i) => {
          person(220, 300 + i * 220, { s: 0.55 * popS(t0), color: col, k: 150 + i, mood: 0.4, label: null });
          txt(n, 330, 260 + i * 220, 50, { alpha: fadeIn(t0), align: 'left', color: col });
          txt(d, 330, 320 + i * 220, 36, { alpha: fadeIn(t0), align: 'left', font: PRINT });
        });
        const votes = [['X alone?', ['yes', 'no', 'yes'], 'PASSES', P.green, w('M4', 'Vote on X')], ['Y alone?', ['no', 'yes', 'yes'], 'PASSES', P.green, w('M4', 'Vote on Y')], ['both X and Y?', ['no', 'no', 'yes'], 'FAILS', P.red, w('M4', 'doing both')]];
        votes.forEach(([q, vs, res, col, t0], j) => {
          const x = 1020 + j * 300, a2 = fadeIn(t0);
          txt(q, x, 230, 42, { alpha: a2, color: P.blue });
          vs.forEach((v, i) => txt(v, x, 300 + i * 220, 46, { alpha: fadeIn(t0 + 0.3 + i * 0.2), color: v === 'yes' ? P.green : P.red }));
          stamp(res, x, 960, 50, t0 + 1.2, { color: col });
        });
        stamp('three majorities contradict each other', 960, 1040, 52, w('M5', 'contradict'), { color: P.plum, rot: 0 });
      }, out);
      if (t > w('M5', 'slogan') - 0.3) { ctx.save(); ctx.globalAlpha = 0.85 * fadeIn(w('M5', 'slogan') - 0.3, 0.3) * out; ctx.drawImage(PAPER, -W, 0, W * 3, H); ctx.restore(); stamp("majority rule isn't a principle. it's a slogan.", 960, 540, 60, w('M5', 'slogan'), { color: P.red, alpha: out }); } else KC += 4;
    } else KC += 600;
    if (t > c('M6') - 0.2) {
      const scandal = t > w('M7', 'scandal');
      const rows = scandal ? [['35%', 'X > Z > Y'], ['33%', 'Z > X > Y'], ['32%', 'Z > X > Y']] : [['35%', 'X > Y > Z'], ['33%', 'Z > X > Y'], ['32%', 'Y > Z > X']];
      const tr = [w('M6', 'Thirty-five'), w('M6', 'Thirty-three'), w('M6', 'thirty-two')];
      grp(560, 480, popS(c('M6')), 0, () => {
        rect(-380, -260, 760, 520, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
        txt(scandal ? 'after Y\'s scandal' : 'voters\' rankings', 0, -200, 48, { color: scandal ? P.red : P.blue });
        rows.forEach(([p, r], i) => { txt(p, -240, -80 + i * 110, 56, { alpha: fadeIn(tr[i]) }); txt(r, 80, -80 + i * 110, 60, { alpha: fadeIn(tr[i]) }); });
      });
      wt('say X is the group\'s best choice', 1360, 300, 50, w('M6', 'Suppose'), ce('M6'), { color: P.blue });
      wt('nobody\'s view of X vs Z changes', 1360, 420, 46, w('M7', "Nobody's opinion"), w('M7', 'at all'));
      wt('but now 65% have Z as their favorite', 1360, 520, 46, w('M7', 'sixty-five'), w('M7', 'favorite'), { color: P.red });
      stamp('X is still right', 1360, 680, 66, w('M7', "it's still right"), { color: P.green });
      wt('a group can rightly prefer', 1360, 860, 48, w('M7', 'So a group'), ce('M7'), { color: P.plum });
      wt("someone who isn't the majority's favorite", 1360, 930, 48, w('M7', 'So a group', 1), ce('M7', 0.4), { color: P.plum });
    } else KC += 200;
  }


  // M7b-M7c: two hats; merging rooms/towns
  function topHat(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      path('M -90 -20 L 90 -20 L 70 90 L -70 90 Z', 1, { fill: P.ink, fillStyle: 'solid' });
      ell(0, -20, 220, 50, 1, { fill: '#3a3644', fillStyle: 'solid' });
      rect(-70, 50, 140, 22, 1, { fill: P.red, fillStyle: 'solid', stroke: P.red });
    }, alpha);
  }
  function sCardinality() {
    const t = T;
    const a = fadeOut(c('M7c') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      txt('you prefer  A > B > C', 960, 120, 64, { alpha: fadeIn(w('M7b', 'prefer A')), color: P.blue });
      topHat(560, 560, 1.3 * popS(w('M7b', 'One hat')), 1);
      topHat(1360, 560, 1.3 * popS(w('M7b', 'The other')), 1);
      token(560, 380, 0.55 * popS(w('M7b', 'One hat', 0.3)), 'B', P.gold, 1);
      token(1290, 380, 0.55 * popS(w('M7b', 'A and C')), 'A', P.green, 1);
      token(1430, 380, 0.55 * popS(w('M7b', 'A and C', 0.2)), 'C', P.red, 1);
      txt('a sure thing', 560, 760, 44, { alpha: fadeIn(w('M7b', 'blindly')), font: PRINT });
      txt('a coin flip', 1360, 760, 44, { alpha: fadeIn(w('M7b', 'blindly')), font: PRINT });
      txt('?', 960, 560, 140, { alpha: fadeIn(w('M7b', 'Which hat')), color: P.plum });
      wt('depends on HOW MUCH', 960, 880, 62, w('M7b', 'depends'), w('M7b', 'worse C is'), { color: P.red });
      stamp('a ranking throws it away. a score keeps it.', 960, 990, 50, w('M7b', 'a score keeps'), { color: P.green });
    }, a);
    if (t > c('M7c') - 0.2) {
      const merged = t > w('M7c', 'both towns together');
      card(480, 360, 600, 280, 'town 1', [['Tom wins', fadeIn(w('M7c', 'wins in one town'))]], P.blue, popS(w('M7c', 'one room')), merged ? 0.5 : 1, -0.02);
      card(1440, 360, 600, 280, 'town 2', [['Tom wins', fadeIn(w('M7c', 'wins in the next'))]], P.teal, popS(w('M7c', 'second room')), merged ? 0.5 : 1, 0.02);
      if (merged) {
        card(960, 720, 900, 300, 'both towns counted together', [['scores: Tom wins (totals add)', fadeIn(w('M7c', 'automatic'))], ['ranked methods: Tom can LOSE', fadeIn(w('M7c', 'can fail'))]], P.plum, popS(w('M7c', 'both towns together')), 1, 0);
        arrow(560, 520, 780, 600, 1, { strokeWidth: 4 }); arrow(1360, 520, 1140, 600, 1, { strokeWidth: 4 });
      } else KC += 40;
    } else KC += 100;
  }

  // M8-M10: intensity, trade, veil of ignorance
  function sIntensity() {
    const t = T;
    const a = fadeOut(c('M10') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      card(520, 330, 680, 300, 'election 1', [['you: narrow majority', fadeIn(w('M8', 'narrow majority'))], ['you barely care', fadeIn(w('M8', 'barely care'))]], P.blue, popS(w('M8', 'first')), 1, -0.02);
      card(1400, 330, 680, 300, 'election 2', [['you: minority', fadeIn(w('M8', 'minority'))], ['you care enormously', fadeIn(w('M8', 'enormously'))]], P.red, popS(w('M8', 'second')), 1, 0.02);
      arrow(880, 330, 1040, 330, prog(t, w('M8', 'trade'), w('M8', 'trade', 0.6)), { stroke: P.green, strokeWidth: 6 });
      txt('trade', 960, 280, 44, { alpha: fadeIn(w('M8', 'trade')), color: P.green });
      wt('not how many. how much.', 960, 620, 76, w('M9', 'how many'), w('M9', 'how much', 0.4), { color: P.blue });
      ballotCard(560, 880, 0.55 * popS(w('M9', 'majority that wants')), 'score', ['Ours', 'Theirs', 'Other'], [5, 0, 0]);
      stamp('majority rule: a right, not an obligation', 1300, 880, 50, w('M9', 'a right'), { color: P.green });
    }, a);
    if (t > c('M10') - 0.2) {
      veil(560, 560, popS(c('M10') + 0.3), 1);
      txt('?', 560, 560, 160, { alpha: fadeIn(w('M10', "didn't know")), color: P.cream });
      ['rich or poor', 'majority or minority', 'intense or indifferent'].forEach((s, i) => txt(s, 560, 860 + i * 56, 44, { alpha: fadeIn(w('M10', ['rich', 'majority or', 'intense'][i])), font: PRINT }));
      wt('John Harsanyi:', 1350, 380, 56, w('M10', 'Harshahnyi'), w('M10', 'showed'), { color: P.blue });
      wt('choose to maximize', 1350, 480, 60, w('M10', 'maximize'), w('M10', 'average'));
      wt('average well-being', 1350, 560, 70, w('M10', 'average'), w('M10', 'well-being', 0.4), { color: P.green });
      stamp("that's what score voting aims at", 1350, 760, 56, w('M10', "That's exactly"), { color: P.green });
    } else KC += 200;
  }

  // V1-V6: measuring
  function sMeasure() {
    const t = T;
    wt('we can measure', 960, 110, 80, c('V1'), w('V1', 'measure', 0.4), { color: P.blue });
    if (t < c('V3') + 0.4) {
      const out = fadeOut(c('V3') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        crowd(560, 420, 8, 3, 90, 0.3 * popS(w('V2', 'simulate')), (i) => PALETTE[i % 6]);
        txt('voters with known preferences', 560, 640, 42, { alpha: fadeIn(w('V2', 'known')), font: PRINT });
        const ox = 1050, ww = 700, y0 = 460;
        line(ox, y0, ox + ww, y0, fadeIn(w('V2', 'hundred percent')), { strokeWidth: 6 });
        txt('random winner', ox, y0 + 60, 36, { alpha: fadeIn(w('V2', 'random')), font: PRINT }); txt('0%', ox, y0 - 50, 44, { alpha: fadeIn(w('V2', 'random')) });
        txt('best possible', ox + ww, y0 + 60, 36, { alpha: fadeIn(w('V2', 'hundred percent')), font: PRINT }); txt('100%', ox + ww, y0 - 50, 44, { alpha: fadeIn(w('V2', 'hundred percent')), color: P.green });
        stamp('voter satisfaction efficiency', 960, 760, 64, w('V2', 'voter satisfaction'), { color: P.blue });
        wt("strategy is built in: misjudging, exaggerating, gaming", 960, 920, 48, w('V2b', "don't assume"), w('V2b', 'strategically'), { color: P.red });
      }, out);
    } else KC += 300;
    if (t > c('V3') - 0.2 && t < c('V5') + 0.4) {
      const out = fadeOut(c('V5') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        card(960, 300, 1200, 260, "Warren Smith's 144 simulations", [['score voting: best practical method in every one', fadeIn(w('V3', 'every single'))]], P.blue, popS(w('V3', 'Warren Smith')), 1, 0);
        // schematic: regret ranges (lower is better), score's whole range below IRV's
        const ox = 460, ww = 1000, y0 = 620;
        txt('regret (lower is better)', 960, y0 - 70, 40, { alpha: fadeIn(c('V4')), font: PRINT });
        [['score', 0.08, 0.16, P.green], ['instant runoff', 0.24, 0.5, P.red]].forEach(([n, a2, b2, col], i) => {
          const y = y0 + 40 + i * 140, ap = fadeIn(c('V4') + i * 0.3);
          txt(n, ox - 30, y, 46, { alpha: ap, align: 'right', color: col });
          rect(ox + a2 * ww * 2, y - 35, (b2 - a2) * ww * 2, 70, 1, { fill: col, fillStyle: 'solid', fillAlpha: ap * 0.85, stroke: 'none' });
          txt('honest', ox + a2 * ww * 2, y - 60, 30, { alpha: ap, font: PRINT }); txt('strategic', ox + b2 * ww * 2, y - 60, 30, { alpha: ap, font: PRINT });
        });
        stamp('strategic score beat honest instant runoff', 960, 1000, 56, w('V4', 'still beat'), { color: P.green });
        txt('schematic of the shape of his most realistic chart', 960, 1060, 28, { alpha: fadeIn(w('V4', 'still beat')), font: PRINT, color: P.grey });
      }, out);
    } else KC += 300;
    if (t > c('V5') - 0.2 && t < c('V6') + 0.4) {
      const out = fadeOut(c('V6') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        txt('across many models', 960, 230, 50, { alpha: fadeIn(c('V5')), font: PRINT });
        [['STAR, approval top-two, ...', 'sometimes edge ahead', P.teal], ['score, approval', 'at or near the top', P.green], ['instant runoff', 'near the bottom', P.red], ['choose-one', 'bottom', P.grey]].forEach(([n, d, col], i) => {
          const y = 360 + i * 150, t0 = [w('V5', 'hybrid'), w('V5', 'score and approval'), w('V5', 'instant runoff'), w('V5', 'bottom')][i];
          grp(960, y, popS(t0), 0, () => { rect(-560, -55, 1120, 110, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3, stroke: col }); txt(n, -520, 0, 48, { align: 'left', color: col }); txt(d, 520, 0, 42, { align: 'right', font: PRINT }); });
        });
      }, out);
    } else KC += 300;
    if (t > c('V6') - 0.2) {
      txt('how often each method picked the sincere head-to-head winner', 960, 230, 44, { alpha: fadeIn(c('V6')), font: PRINT });
      txt('(29,999 simulated elections, half honest, half strategic)', 960, 285, 34, { alpha: fadeIn(c('V6')), font: PRINT, color: P.grey });
      [['approval', 10997, P.green, w('V6', 'approval voting picked')], ['Condorcet methods', 10342, P.blue, w('V6', 'designed')], ['instant runoff', 8387, P.red, w('V6', 'far more often')]].forEach(([n, v, col, t0], i) => {
        hbar(700, 450 + i * 160, 900, 100, (v / 12000) * eOut(prog(t, t0, t0 + 0.8)), col, n, fadeIn(t0) > 0.5 ? v.toLocaleString('en-US') : '', { ls: 48 });
      });
    } else KC += 30;
  }
  function crowd(cx, cy, cols, rows, sp, s, colFn) {
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) { const i = r * cols + c2; mini(cx + (c2 - (cols - 1) / 2) * sp, cy + (r - (rows - 1) / 2) * sp * 1.25, s, colFn(i), i); }
  }

  // W1-W5: real world
  function sReal() {
    const t = T;
    card(400, 330, 620, 340, 'Fargo, ND', [['2018: adopted with 64%', fadeIn(w('W1', 'sixty-four'))], ['first U.S. city', fadeIn(w('W1', 'first American'))]], P.blue, popS(w('W1', 'Fargo')), 1, -0.03);
    card(1060, 330, 620, 340, 'St. Louis, MO', [['2020: adopted with 68%', fadeIn(w('W2', 'sixty-eight'))], ['primary picks two finalists', fadeIn(w('W2', 'two finalists'))]], P.red, popS(w('W2', 'St. Louis')), 1, 0.02);
    card(1620, 330, 520, 340, 'Utah, 2025', [['Forward Party fills a', fadeIn(w('W3', 'replacement'))], ['state senate seat', fadeIn(w('W3', 'replacement'))], ['by approval voting', fadeIn(w('W3', 'approval voting'))]], P.teal, popS(w('W3', 'Utah')), 1, -0.02);
    if (t > c('W4') - 0.2) {
      stamp('the backlash', 960, 600, 66, w('W4', 'backlash'), { color: P.plum });
      card(560, 820, 760, 260, 'Missouri 2024', [['bans RCV & approval statewide', fadeIn(w('W4', 'ban both'))], ['...except St. Louis', fadeIn(w('W4', 'keep its system'))]], P.grey, popS(w('W4', 'Missouri')), 1, 0.02);
      card(1360, 820, 760, 260, 'North Dakota 2025', [['bans both statewide', fadeIn(w('W4', 'banned both'))], ['ends approval voting in Fargo', fadeIn(w('W4', 'ending'))]], P.grey, popS(w('W4', 'North Dakota')), 1, -0.02);
    } else KC += 200;
    if (t > c('W5') - 0.2) { ctx.save(); ctx.globalAlpha = 0.85 * fadeIn(c('W5') - 0.2, 0.3); ctx.drawImage(PAPER, -W, 0, W * 3, H); ctx.restore(); stamp("nobody bans reforms that don't threaten anyone", 960, 540, 58, w('W5', 'ban'), { color: P.red }); } else KC += 4;
  }

  // X1-X3: simplicity
  function sSimple() {
    const t = T;
    const a = fadeOut(c('X3') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      const sub = t > w('X1', 'subtraction');
      ballotCard(500, 470, popS(c('X1')), sub ? 'approve' : 'one', ['Ana', 'Ben', 'Cy', 'Dee'], [1, 0, 1, 0], { title: sub ? 'vote for ALL you like' : 'vote for ONE' });
      stamp('a subtraction, not an addition', 500, 860, 54, w('X1', 'subtraction'), { color: P.green });
      // precinct totals add
      [0, 1, 2].forEach((i) => { grp(1150 + i * 200, 300, popS(w('X2', 'precinct') + i * 0.15), 0, () => { rect(-80, -60, 160, 120, 1, { fill: P.cream, fillStyle: 'solid' }); txt(String([412, 389, 501][i]), 0, 0, 44); }); });
      txt('+', 1250, 300, 50, { alpha: fadeIn(w('X2', 'simply add')) }); txt('+', 1450, 300, 50, { alpha: fadeIn(w('X2', 'simply add')) });
      txt('= 1,302', 1550, 420, 56, { alpha: fadeIn(w('X2', 'simply add')), color: P.green });
      txt('approval: totals just add', 1350, 500, 42, { alpha: fadeIn(w('X2', 'simply add')), font: PRINT, color: P.green });
      grp(1350, 760, popS(w('X2', 'Instant runoff needs')), 0, () => { rect(-260, -90, 520, 180, 1, { fill: '#5d5866', fillStyle: 'solid' }); txt('instant runoff: every ballot,', 0, -30, 40, { color: P.cream }); txt('one central count', 0, 30, 40, { color: P.cream }); });
    }, a);
    if (t > c('X3') - 0.2) {
      txt('six-way instant runoff', 960, 200, 56, { alpha: fadeIn(c('X3')), color: P.red });
      hbar(560, 420, 1000, 90, 0.031 * 4 * eOut(prog(t, w('X3', 'three percent'), w('X3', 'three percent', 0.8))), P.red, 'winner\'s 1st choices', '~3%', { ls: 40 });
      txt('can still win', 960, 560, 60, { alpha: fadeIn(w('X3', 'win')), color: P.red });
      wt('approval: the winner is who the most voters said yes to', 960, 780, 50, w('X3', 'With approval'), ce('X3'), { color: P.green });
    } else KC += 30;
  }

  // E1-E3
  function sEnd() {
    const t = T;
    const a = fadeOut(c('E2') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      [['choose-one', 'punishes your favorite', P.grey, w('E1', 'Choose-one')], ['instant runoff', 'squeezes out the compromise', P.red, w('E1', 'Instant runoff')], ['score & approval', 'support both, never betray, happier winners', P.green, w('E1', 'Score and approval')]].forEach(([n, d, col, t0], i) => {
        grp(960, 300 + i * 220, popS(t0), 0, () => { rect(-760, -80, 1520, 160, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: col }); txt(n, -720, 0, 56, { align: 'left', color: col }); txt(d, 720, 0, 44, { align: 'right', font: PRINT }); });
      });
    }, a);
    if (t > c('E2') - 0.2) {
      wt("Don't rank.", 960, 380, 170, c('E2'), w('E2', 'Rate', -0.1), { color: P.red });
      wt('Rate.', 960, 580, 220, w('E2', 'Rate'), w('E2', 'Rate', 0.4), { color: P.green });
      ballotCard(960, 880, 0.55 * popS(c('E3')), 'approve', ['Ana', 'Ben', 'Cy'], [1, 1, 0]);
      txt('let people vote for every candidate they approve of', 960, 1040, 42, { alpha: fadeIn(w('E3', 'let people')), font: PRINT });
    } else KC += 200;
  }

  // ---------- assembly ----------
  function buildScenes() {
    SCN = [
      { start: 0, draw: sTitle },
      { start: c('O1') - 0.7, draw: sAlaska },
      { start: c('P1') - 0.7, draw: sProblem },
      { start: c('F1') - 0.7, draw: sFixes },
      { start: c('R1') - 0.7, draw: sSqueeze },
      { start: c('B1') - 0.7, draw: sBetray },
      { start: c('C1') - 0.7, draw: sCardinal },
      { start: c('S1') - 0.7, draw: sStrategy },
      { start: c('M1') - 0.7, draw: sMajority },
      { start: c('M7b') - 0.7, draw: sCardinality },
      { start: c('M8') - 0.7, draw: sIntensity },
      { start: c('V1') - 0.7, draw: sMeasure },
      { start: c('W1') - 0.7, draw: sReal },
      { start: c('X1') - 0.7, draw: sSimple },
      { start: c('E1') - 0.7, draw: sEnd },
    ];
    const E = [];
    const ev = (name, t, dur) => E.push({ name, t, dur });
    const at = (id, word, name, extra = 0) => ev(name, w(id, word, extra));
    SCN.slice(1).forEach((s) => ev('whoosh', s.start - 0.05));
    ev('stamp', 0.3); ev('scribble', 0.6, 1.0); ev('sparkle', 1.6); ev('scribble', 1.8, 1.0); ev('pop', 2.2); ev('pop2', 2.45);
    ev('stamp', c('O1')); ['Mary', 'Sarah', 'Nick'].forEach((x) => at('O1', x, 'pop2'));
    at('O2', 'Begich beat Peltola', 'slide'); at('O2', 'Begich beat Palin', 'slide'); at('O2', 'majority preferred', 'ding');
    at('O3', 'eliminated', 'stamp'); at('O3', 'eliminated', 'sad', 0.2); at('O4', "wasn't", 'scribble'); at('O5', 'rank', 'pop'); at('O5', 'rate them', 'stamp'); at('O5', 'cardinal', 'sparkle');
    ev('pop', c('P1')); at('P1', 'punishes', 'sad'); at('P2', 'Nader', 'pop2'); at('P2', 'Bush', 'pop2'); at('P2', 'nine in ten', 'whoosh'); at('P2', 'someone else', 'stamp');
    ev('stamp', c('P3')); at('P3', 'thirty-two', 'slide'); at('P4', 'vote splitting', 'pop'); at('P4', 'two big', 'boing');
    at('F1', 'rank', 'pop2'); at('F1', 'rate', 'pop2'); at('F1', 'restaurant', 'sparkle');
    at('F2', 'fewest', 'poof'); at('F2', 'Repeat', 'poof'); at('F2', 'majority', 'ding', 0.6);
    at('F3', 'Score voting', 'pop'); at('F3', 'Add them', 'chaching'); at('F4', 'approval voting', 'pop'); at('F4', 'one rule removed', 'stamp');
    ev('pop', c('R1')); at('R2', 'invisible', 'sad'); ['Thirty-five', 'thirty-three', 'thirty-two'].forEach((x) => at('R3', x, 'pop2')); at('R3', 'second', 'whoosh');
    at('R4', 'over left', 'slide'); at('R4', 'over right', 'slide'); at('R4', 'eliminated first', 'stamp'); at('R4', 'eliminated first', 'sad', 0.3);
    at('R5', 'Burlington', 'pop'); at('R5', 'repealed', 'stamp'); at('R6', 'Alaska', 'pop');
    at('B1', 'center squeeze', 'scribble'); at('B2', 'flipped', 'slide'); at('B2', 'survived', 'stamp'); at('B3', 'favorite betrayal', 'stamp'); at('B3', 'favorite betrayal', 'sad', 0.3);
    at('B4', 'stranger', 'pop'); at('B4', 'would have lost', 'boing'); at('B5', 'no-show', 'pop'); at('B5', 'staying home', 'pop2'); at('B6', 'moves it', 'stamp');
    at('B6a', 'almost never', 'pop'); at('B6a', 'Ranking your favorite', 'pop'); at('B6a', 'every time', 'stamp'); at('B6a', 'third parties stay', 'sad');
    ev('pop', c('B6b')); at('B6b', 'two major', 'stamp');
    at('M7b', 'One hat', 'pop'); at('M7b', 'The other', 'pop'); at('M7b', 'Which hat', 'boing'); at('M7b', 'a score keeps', 'stamp');
    at('M7c', 'one room', 'pop2'); at('M7c', 'second room', 'pop2'); at('M7c', 'both towns together', 'whoosh'); at('M7c', 'can fail', 'sad');
    at('V2b', "don't assume", 'scribble');
    ev('pop', c('C1')); at('C2', 'Palin gets', 'tick'); at('C2', 'maybe a four', 'tick'); at('C2', 'five to be safe', 'tick'); at('C2', 'Raising', 'sparkle');
    at('C3', 'favorite betrayal', 'pop'); at('C3', 'both pass', 'ding'); at('C4', 'one round', 'ding');
    ev('pop', c('C5')); at('C5', 'election official', 'pop2'); at('C5', 'new rule', 'pop'); at('C5', 'add Nader', 'tick'); at('C5', 'keep Gore', 'stamp');
    ev('pop', c('S1')); at('S2', 'Half', 'pop'); at('S2', 'much worse', 'boing'); at('S2', 'forgets', 'stamp');
    ev('pop', c('S3')); at('S3', 'expect to win', 'slide'); at('S3', 'better than', 'ding');
    at('S4', 'Fargo', 'pop'); at('S4', 'St. Louis', 'pop'); at('S4', 'eighty percent', 'ding'); ev('pop', c('S5')); at('S5', 'barely moves', 'slide');
    at('M1', 'undemocratic', 'stamp'); at('M2', 'Two proposals', 'pop'); ['Amy', 'Bob', 'Cal'].forEach((x) => at('M3', x, 'pop2'));
    [['Vote on X'], ['Vote on Y'], ['doing both']].forEach(([x]) => { at('M4', x, 'tick'); at('M4', x, 'stamp', 1.2); });
    at('M5', 'contradict', 'stamp'); at('M5', 'slogan', 'stamp'); ev('pop', c('M6')); at('M7', 'scandal', 'poof'); at('M7', 'sixty-five', 'sad'); at('M7', "it's still right", 'stamp');
    at('M8', 'first', 'pop'); at('M8', 'second', 'pop'); at('M8', 'trade', 'whoosh'); at('M9', 'how much', 'ding'); at('M9', 'a right', 'stamp');
    ev('pop', c('M10') + 0.3); at('M10', 'Harshahnyi', 'scribble'); at('M10', 'average', 'sparkle'); at('M10', "That's exactly", 'stamp');
    at('V1', 'measure', 'scribble'); at('V2', 'simulate', 'pop'); at('V2', 'voter satisfaction', 'stamp'); at('V3', 'Warren Smith', 'pop'); at('V3', 'every single', 'ding');
    ev('pop2', c('V4')); at('V4', 'still beat', 'stamp'); ['hybrid', 'score and approval', 'instant runoff', 'bottom'].forEach((x) => at('V5', x, 'pop2'));
    at('V6', 'approval voting picked', 'slide'); at('V6', 'designed', 'slide'); at('V6', 'far more often', 'slide');
    at('W1', 'Fargo', 'pop'); at('W1', 'sixty-four', 'chaching'); at('W2', 'St. Louis', 'pop'); at('W2', 'sixty-eight', 'chaching'); at('W3', 'Utah', 'pop'); at('W3', 'approval voting', 'ding');
    at('W4', 'backlash', 'stamp'); at('W4', 'Missouri', 'stamp'); at('W4', 'North Dakota', 'stamp'); at('W4', 'ending', 'sad'); at('W5', 'ban', 'stamp');
    ev('pop', c('X1')); at('X1', 'subtraction', 'stamp'); at('X2', 'precinct', 'pop2'); at('X2', 'simply add', 'chaching'); at('X2', 'Instant runoff needs', 'pop');
    at('X3', 'three percent', 'slide'); at('X3', 'With approval', 'ding');
    at('E1', 'Choose-one', 'pop2'); at('E1', 'Instant runoff', 'pop2'); at('E1', 'Score and approval', 'pop2');
    ev('scribble', c('E2'), 0.6); at('E2', 'Rate', 'stamp'); at('E2', 'Rate', 'sparkle', 0.1); ev('pop', c('E3')); ev('sparkle', ce('E3', 1));
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
