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

  // ---------- scenes ----------
  function sTitle() {
    const t = T;
    stamp('economic physics', 960, 250, 54, 0.3, { color: P.teal, rot: -0.04 });
    wt('understanding', 960, 370, 80, 0.5, 0.9, { color: P.plum });
    wt('The Gift Card Fallacy', 960, 490, 170, 0.8, 1.8);
    line(560, 580, 1360, 580, eOut(prog(t, 1.7, 2.0)), { stroke: P.red, strokeWidth: 7 });
    wt(SCRIPT.subtitle, 960, 670, 66, 1.9, 2.9, { font: PRINT, color: P.teal });
    giftCard(330, 820, 0.62 * popS(2.2), { r: -0.2 + Math.sin(t * 1.3) * 0.04 });
    grp(1590, 820, popS(2.45), Math.sin(t * 1.1) * 0.04, () => cash(0, 0, 0.75, 1));
  }

  // O1-O4: grow vs share
  function sOpen() {
    const t = T;
    const t0 = w('O1', 'tug');
    const tug = t > t0 ? Math.sin((t - t0) * 3.1) * 26 : 0;
    curveP([[430 + tug, 660], [700 + tug, 672], [960 + tug, 660], [1220 + tug, 672], [1490 + tug, 660]], eOut(prog(t, w('O1', 'same'), t0 + 0.2)), { strokeWidth: 6, stroke: '#8a6a3a' });
    const grow = t > w('O2', 'grow') ? 1 + 0.12 * eOut(prog(t, w('O2', 'grow'), w('O2', 'big'))) : 1;
    grp(960 + tug, 520, popS(c('O1') + 0.05) * grow, 0, () => pie(0, 0, 150, { slices: t > w('O3', 'share') ? 6 : 0, sliceP: eOut(prog(t, w('O3', 'share'), w('O3', 'slices'))) }));
    if (t > w('O2', 'grow')) {
      const g = 1 + 0.06 * Math.sin(t * 6);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39; grp(960 + tug, 520, g * grow, 0, () => arrow(Math.cos(a) * 180, Math.sin(a) * 180, Math.cos(a) * 245, Math.sin(a) * 245, prog(t, w('O2', 'grow'), w('O2', 'grow', 0.6)), { stroke: P.teal, strokeWidth: 5, head: 18 })); }
    } else KC += 160;
    person(330 + tug, 700, { s: 1.15 * popS(w('O1', 'argument')), color: P.teal, arms: 'pull', lean: -0.12, mood: 0.2, k: 1, hair: HAIR_B });
    person(1590 + tug, 700, { s: 1.15 * popS(w('O1', 'economy')), color: P.red, arms: 'pull', lean: 0.12, mood: 0.2, k: 2, skin: P.skin[2], hair: HAIR_A });
    wt('GROW the pie', 360, 340, 84, w('O2', 'grow'), w('O2', 'pie', 0.3), { color: P.teal });
    wt('SHARE the pie', 1560, 340, 84, w('O3', 'share'), w('O3', 'pie', 0.3), { color: P.red });
    stamp("you don't have to choose", 960, 930, 66, w('O4', "why you don't"), { color: P.plum });
  }

  // U1-U5: diminishing marginal utility, Alice & Bob, Schöntrup index
  function sUtility() {
    const t = T;
    const a1 = fadeOut(c('U4') - 0.1, 0.5);
    grp(0, -260 * eIO(prog(t, c('U4') - 0.1, c('U4') + 0.5)), 1, 0, () => {
      const ox = 200, oy = 880, ww = 860, h = 560;
      const ap = eOut(prog(t, c('U1') - 0.3, w('U1', 'Because')));
      arrow(ox, oy, ox + ww + 30, oy, ap, { strokeWidth: 4 });
      arrow(ox, oy, ox, oy - h - 30, ap, { strokeWidth: 4 });
      wt('money', ox + ww - 60, oy + 50, 50, w('U1', 'dollar'), w('U1', 'dollar', 0.5));
      wt('happiness', ox + 10, oy - h - 70, 50, w('U1', 'means'), w('U1', 'means', 0.5), { align: 'left' });
      const fy = (u) => oy - h * Math.log2(1 + u * 15) / 4.0;
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([ox + u * ww, fy(u)]); }
      curveP(pts, eIO(prog(t, w('U1', 'Because'), ce('U1'))), { stroke: P.blue, strokeWidth: 6 });
      const pA = prog(t, w('U2', 'hundred'), w('U2', 'groceries')), pB = prog(t, w('U2', 'billionaire'), w('U2', 'rounding'));
      line(ox + 25, fy(0.03), ox + 25, fy(0.1), pA, { stroke: P.green, strokeWidth: 8 });
      txt('$100 = groceries', ox + 60, fy(0.07) + 10, 44, { p: prog(t, w('U2', 'groceries'), w('U2', 'family')), color: P.green, align: 'left' });
      line(ox + ww - 60, fy(0.88) + 4, ox + ww - 60, fy(0.96) - 2, pB, { stroke: P.red, strokeWidth: 8 });
      txt('$100 = rounding error', ox + ww - 40, fy(0.92) + 110, 44, { p: prog(t, w('U2', 'rounding'), ce('U2')), color: P.red, align: 'right' });
      const x0 = 1170;
      wt('$1,000', x0 + 70, 420, 64, w('U3', 'a thousand'), w('U3', 'a thousand', 0.3));
      arrow(x0 + 170, 420, x0 + 270, 420, prog(t, w('U3', 'to two'), w('U3', 'two thousand')), { strokeWidth: 4 });
      wt('$2,000', x0 + 370, 420, 64, w('U3', 'two thousand'), w('U3', 'two thousand', 0.3));
      stamp('+1', x0 + 540, 420, 58, w('U3', 'or from'), { color: P.green, rot: 0.05 });
      wt('$1M', x0 + 70, 580, 64, w('U3', 'a million'), w('U3', 'a million', 0.3));
      arrow(x0 + 170, 580, x0 + 270, 580, prog(t, w('U3', 'to two million'), w('U3', 'two million')), { strokeWidth: 4 });
      wt('$2M', x0 + 370, 580, 64, w('U3', 'two million'), w('U3', 'two million', 0.3));
      stamp('+1', x0 + 540, 580, 58, ce('U3', -0.2), { color: P.green, rot: -0.05 });
      wt('every doubling feels the same', x0 + 300, 740, 54, w('U3', 'double'), w('U3', 'happiness'), { color: P.blue });
    }, a1);

    if (t > c('U4') - 0.2) {
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
        txt('total happiness', 160, -40, 40, { font: PRINT });
        txt(flip < 0.5 ? '$10k' : '$20k', -170, 22, 70, { color: flip < 0.5 ? P.ink : P.green });
        txt(flip < 0.5 ? '24.6' : '24.2', 160, 22, 70, { color: flip < 0.5 ? P.ink : P.red });
        if (flip >= 0.5) { arrow(-80, 30, -80, -10, 1, { stroke: P.green, strokeWidth: 5, head: 16 }); arrow(270, -10, 270, 30, 1, { stroke: P.red, strokeWidth: 5, head: 16 }); }
        else KC += 12;
      }, popS(w('U4', 'five thousand')));
      stamp('2x the money, LESS happiness', 960, 960, 58, w('U4', 'Twice'), { alpha: fadeOut(c('U5') - 0.3, 0.4) });
    } else KC += 300;

    if (t > c('U5') - 0.2) {
      const x0 = 1300;
      grp(x0, 300, popS(c('U5')), 0, () => {
        rect(-430, -110, 860, 220, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3.5 });
        txt('the Schöntrup index', 0, -55, 64, { color: P.plum });
        ctx.font = `400 54px ${PRINT}`;
        const a = '= average of log', b = '(each income)', wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, ws = 26, xx = -(wa + ws + wb) / 2;
        txt(a, xx, 35, 54, { font: PRINT, align: 'left' });
        txt('2', xx + wa + 2, 58, 30, { font: PRINT, align: 'left' });
        txt(b, xx + wa + ws, 35, 54, { font: PRINT, align: 'left' });
      });
      wt('grow the pie', x0 - 250, 560, 56, w('U5', 'growing'), w('U5', 'growing', 0.4), { color: P.teal });
      wt('share the pie', x0 + 250, 560, 56, w('U5', 'sharing'), w('U5', 'sharing', 0.4), { color: P.red });
      arrow(x0 - 250, 600, x0 - 70, 720, prog(t, w('U5', 'growing'), w('U5', 'growing', 0.5)), { stroke: P.teal, strokeWidth: 5 });
      arrow(x0 + 250, 600, x0 + 70, 720, prog(t, w('U5', 'sharing'), w('U5', 'sharing', 0.5)), { stroke: P.red, strokeWidth: 5 });
      const lvl = eOut(prog(t, w('U5', 'at the same'), ce('U5', 0.4)));
      grp(x0, 860, popS(w('U5', 'rewards')), 0, () => {
        rect(-24, -110, 48, 170, 1, { strokeWidth: 3.5 });
        rect(-14, 60 - 40 - 110 * lvl, 28, 40 + 110 * lvl, 1, { fill: P.red, fillStyle: 'solid', stroke: 'none' });
        circ(0, 80, 70, 1, { fill: P.red, fillStyle: 'solid' });
      });
      stamp('both count!', x0 + 230, 880, 52, w('U5', 'same time'), { color: P.green, rot: 0.06 });
    } else KC += 200;
  }

  // D1-D6: what deadweight loss is, via the $10 sweater
  function sDeadweight() {
    const t = T;
    const dim = 1 - 0.85 * eIO(prog(t, w('D6', 'deadweight', -0.3), w('D6', 'deadweight', 0.3)));
    wt('deadweight loss', 960, 110, 96, w('D1', 'deadweight'), w('D1', 'loss', 0.3), { color: P.red });
    grp(0, 0, 1, 0, () => {
      person(300, 470, { s: popS(w('D2', 'I buy')), color: P.blue, arms: t > w('D2', 'sweater') ? 'give' : 'down', mood: lerp(0.5, -0.2, prog(t, w('D4', "I'm down"), w('D4', 'ten'))), k: 5, label: 'me', hair: HAIR_B });
      grp(960, 470, popS(w('D1', 'gift')), 0, () => stall(0, 0, 1.15, 1));
      txt('the store', 960, 640, 46, { alpha: fadeIn(w('D1', 'gift')) });
      const youMood = t < w('D2', 'only pay') ? 0.6 : 0.15;
      person(1620, 470, { s: popS(w('D2', 'you')), color: P.gold, arms: 'take', mood: t > w('D6', 'ten-dollar') ? 0.9 : youMood, k: 6, label: 'you', skin: P.skin[2], hair: HAIR_A });
      // sweater: store -> you
      const mv = eIO(prog(t, w('D2', 'ten dollars'), w('D2', 'But')));
      if (t > w('D2', 'sweater')) {
        const sx = lerp(960, 1450, mv), sy = 360 - Math.sin(mv * Math.PI) * 120;
        sweater(sx, sy, 0.7 * popS(w('D2', 'sweater')), 1);
        priceTag(sx + 90, sy - 70, 0.75, 'cost $10', popS(w('D2', 'ten dollars')));
      } else KC += 60;
      bubble(1640, 170, 420, 150, popS(w('D2', 'only pay')), 'worth $7 to me', 52, { tail: 30 });
      // ledgers
      const ly = 760;
      ledger(960, ly, 'store', [['+$10 cash', P.green, w('D3', 'got ten')], ['-$10 sweater', P.red, w('D3', 'gave up')], ['= $0', P.ink, w('D3', 'breaks even')]], fadeIn(w('D3', 'accounting')));
      ledger(300, ly, 'me', [['-$10', P.red, w('D4', "I'm down")]], fadeIn(w('D3', 'accounting')));
      ledger(1620, ly, 'you', [[t > w('D6', 'ten-dollar bill') ? '+$10' : '+$7', P.green, w('D4', "You're up")]], fadeIn(w('D3', 'accounting')));
      line(150, ly + 25, 1770, ly + 25, fadeIn(w('D3', 'accounting')), { strokeWidth: 2, stroke: P.grey });
      // total
      const after = t > w('D6', 'ten-dollar bill', 0.6);
      stamp(after ? 'total: $0' : 'total: -$3', 960, 1010, 64, w('D5', 'three dollars'), { color: after ? P.green : P.red });
      smokeBurst(1450, 300, w('D5', 'disappeared'), 8, 1.1);
      wt('nobody received it', 1450, 950, 48, w('D5', 'Nobody'), w('D5', 'store'), { color: P.plum, alpha: after ? 0 : 1 });
      if (t > w('D6', 'ten-dollar') && t < w('D6', 'deadweight')) {
        const u = eIO(prog(t, w('D6', 'ten-dollar'), w('D6', 'ten-dollar', 0.9)));
        grp(lerp(380, 1500, u), 330 - Math.sin(u * Math.PI) * 140, 0.6, 0, () => cash(0, 0, 1, 1, 1));
      } else KC += 30;
    }, dim);
    // definition card
    grp(960, 520, popS(w('D6', 'deadweight')), 0, () => {
      rect(-640, -170, 1280, 340, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4 });
      txt('deadweight loss', 0, -90, 84, { color: P.red });
      txt('value that could have existed,', 0, 10, 70);
      txt("and doesn't.", 0, 95, 70);
    });
  }

  // T1-T6: Pareto improvements and taxing a trade
  function sTrade() {
    const t = T;
    const ph1 = fadeOut(c('T3') - 0.3, 0.4);
    if (t < c('T3') + 0.3) {
      grp(0, 0, 1, 0, () => {
        const sw = eIO(prog(t, w('T1', 'trade'), w('T1', 'trade', 1.0)));
        person(620, 560, { s: popS(c('T1') + 0.1), color: P.teal, arms: 'give', mood: t > w('T1', 'both') ? 0.9 : 0.4, k: 7, hair: HAIR_B, skin: P.skin[3] });
        person(1300, 560, { s: popS(c('T1') + 0.2), color: P.plum, arms: 'take', mood: t > w('T1', 'both') ? 0.9 : 0.4, k: 8, hair: HAIR_A, skin: P.skin[1] });
        bread(lerp(780, 1140, sw), 520 - Math.sin(sw * Math.PI) * 80, 0.8, popS(c('T1') + 0.3));
        coin(lerp(1140, 780, sw), 600 + Math.sin(sw * Math.PI) * 60, 30, popS(c('T1') + 0.35));
        if (t > w('T1', 'both')) { txt('+', 620, 330, 110, { color: P.green }); txt('+', 1300, 330, 110, { color: P.green }); } else KC += 2;
        stamp('Pareto improvement', 960, 170, 76, w('T2', 'Pareto'), { color: P.blue, rot: -0.03 });
        wt('someone better off, nobody worse off', 960, 860, 56, w('T2', 'helps someone'), w('T2', 'hurts no one', 0.4));
        wt('the only change we KNOW makes things better', 960, 950, 56, w('T2', 'know for sure'), w('T2', 'better', 0.3), { color: P.green });
      }, ph1);
    } else KC += 400;
    if (t < c('T3') - 0.3) return;
    const ph2 = fadeOut(w('T6', 'first rule', -0.2), 0.4) * 0.85 + 0.15;
    const X = (v) => 360 + (v - 15) * 80;
    grp(0, 0, 1, 0, () => {
      person(190, 420, { s: 0.85 * popS(w('T3', 'Dana')), color: P.red, hat: 'cap', mood: t > w('T4', 'never happens') ? -0.6 : 0.5, k: 9, label: 'Dana', skin: P.skin[4], hair: HAIR_B });
      roofCap(330, 470, 0.9, popS(w('T3', 'Dana', 0.2)));
      house(1720, 440, 0.9 * popS(w('T3', 'your roof')), {});
      txt('you', 1720, 600, 46, { alpha: fadeIn(w('T3', 'your roof')) });
      // number line
      const lp = eOut(prog(t, w('T3', 'Dana'), w('T3', 'twenty dollars')));
      arrow(X(15) - 20, 700, X(30) + 40, 700, lp, { strokeWidth: 4 });
      for (let v = 15; v <= 30; v += 5) { line(X(v), 685, X(v), 715, lp, { strokeWidth: 3 }); txt('$' + v, X(v), 750, 40, { alpha: lp, font: PRINT }); }
      txt('price per hour', X(22.5), 810, 40, { alpha: lp, font: PRINT, color: P.grey });
      // Dana's minimum (moves with tax)
      const taxU = eIO(prog(t, w('T4', 'eight-dollar'), w('T4', 'twenty-eight')));
      const dv = 20 + 8 * taxU;
      const dp = popS(w('T3', 'twenty dollars'));
      grp(X(dv), 640, dp, 0, () => { poly([[-18, -30], [18, -30], [0, 0]], 1, { fill: P.red, fillStyle: 'solid', stroke: P.red }); });
      txt(taxU > 0.02 ? `Dana needs $${dv.toFixed(0)}` : 'Dana needs $20', X(dv), 570, 44, { alpha: dp, color: P.red });
      const yp = popS(w('T3', 'twenty-five'));
      grp(X(25), 640, yp, 0, () => { poly([[-18, -30], [18, -30], [0, 0]], 1, { fill: P.teal, fillStyle: 'solid', stroke: P.teal }); });
      txt("you'll pay $25", X(25), t > w('T4', 'eight-dollar') ? 480 : 510, 44, { alpha: yp, color: P.teal });
      // overlap = value created
      const ov = Math.max(0, 25 - dv);
      if (t > w('T3', 'five dollars', -0.2) && ov > 0.05) {
        rect(X(dv), 680, X(25) - X(dv), 40, 1, { fill: P.gold, fillStyle: 'solid', stroke: 'none', fillAlpha: 0.8 * fadeIn(w('T3', 'five dollars', -0.2)) });
        txt(`$${ov.toFixed(0)} of value`, (X(dv) + X(25)) / 2, 880, 50, { color: P.gold, alpha: fadeIn(w('T3', 'five dollars')) * clamp(ov / 2) });
      } else KC += 4;
      if (taxU > 0) {
        const gx0 = X(20), gx1 = X(dv);
        arrow(gx0, 610, gx1 - 6, 610, 1, { stroke: P.plum, strokeWidth: 5, head: 16 });
        txt('+$8 tax', (gx0 + gx1) / 2 + 30, 600 - 30, 40, { color: P.plum });
      } else KC += 8;
      if (t > w('T3', 'The job happens') && t < w('T4', 'Now')) checkMark(960, 380, popS(w('T3', 'The job happens')), 1);
      else KC += 2;
      if (t > w('T4', 'never happens')) { xMark(960, 380, popS(w('T4', 'never happens')), 1); txt('no job', 960, 470, 54, { color: P.red }); }
      else KC += 4;
      // tally
      grp(960, 200, popS(w('T5', 'collects nothing')), 0, () => {
        rect(-360, -90, 720, 180, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
        txt('tax collected:  $0', 0, -38, 56);
        txt('value lost:  $5', 0, 38, 56, { color: P.red, alpha: fadeIn(w('T5', 'five dollars')) });
      });
      smokeBurst(X(22.5), 680, w('T5', 'never comes'), 7, 0.9);
      stamp('deadweight loss', 1560, 960, 60, w('T5', 'deadweight'));
    }, ph2);
    grp(960, 540, popS(w('T6', 'first rule')), -0.03, () => {
      rect(-720, -150, 1440, 300, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 5, stroke: P.green });
      txt('rule #1', 0, -70, 70, { color: P.green });
      txt("don't block useful trades", 0, 40, 100);
    });
  }

  // B1-B5: the usual toolbox, rent control unbundled, the gamble
  function sToolbox() {
    const t = T;
    const outA = fadeOut(c('B4') - 0.2, 0.4);
    const nTools = [w('B2', 'Steep'), w('B3', 'Minimum'), w('B3', 'rent control')].filter((x) => t > x + 0.3).length;
    const pr = 110 * (1 - 0.07 * nTools);
    grp(960, 170, popS(w('B1', 'usually')), 0, () => {
      rect(-260, -50, 520, 100, 1, { fill: P.red, hachureGap: 10 });
      path('M -70 -50 L -70 -84 L 70 -84 L 70 -50', 1, { strokeWidth: 6 });
      rect(-220, -28, 440, 56, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      txt('the usual toolbox', 0, 0, 46);
    }, outA);
    grp(1650, 230, popS(w('B1', 'share the pie')), 0, () => { pie(0, 0, pr, {}); txt('the pie', 0, pr + 50, 46); }, outA);
    const tools = [
      ['steep brackets', 'taxes trading work for pay', w('B2', 'Steep'), (s, a) => stairs(0, 20, s, a)],
      ['minimum wage', 'blocks some trades', w('B3', 'Minimum'), (s, a) => floorSign(0, 20, s, a)],
      ['rent control', 'blocks trades + hides a tax', w('B3', 'rent control'), (s, a) => house(0, 30, s * 0.95, { lock: true, alpha: a })],
    ];
    tools.forEach(([name, sub, t0, fn], i) => {
      const x = 420 + i * 540, y = 580, s = popS(t0);
      grp(x, y, 1, 0, () => fn(s, outA));
      txt(name, x, y + 200, 56, { alpha: outA * (s > 0.5 ? 1 : 0) });
      txt(sub, x, y + 260, 40, { alpha: outA * fadeIn(t0 + 0.6), font: PRINT, color: P.plum });
    });
    // B4: rent control = voucher + tax on one landlord
    if (t > c('B4') - 0.3 && t < c('B5') + 0.5) {
      const out = fadeOut(c('B5') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        house(300, 520, 1.1 * popS(w('B4', 'apartment')), { lock: true });
        wt('worth $3,000', 300, 690, 48, w('B4', 'three thousand'), w('B4', 'three thousand', 0.4));
        wt('charged $2,000', 300, 750, 48, w('B4', 'two thousand'), w('B4', 'two thousand', 0.4), { color: P.red });
        txt('=', 620, 520, 160, { alpha: fadeIn(w('B4', 'same as')) });
        person(880, 600, { s: 0.9 * popS(w('B4', 'tenant')), color: P.teal, arms: 'up', mood: 0.9, k: 7, label: 'one tenant', skin: P.skin[4], hair: HAIR_B });
        giftCard(1060, 360, 0.6 * popS(w('B4', 'rent voucher')), { tag: 'RENT ONLY', amount: '$1,000', color: P.green, r: 0.1 });
        txt('+', 1250, 520, 140, { alpha: fadeIn(w('B4', 'paid for')) });
        person(1560, 600, { s: 0.9 * popS(w('B4', 'one landlord')), color: P.ink, hat: 'top', mood: -0.6, k: 8, label: 'one landlord', skin: P.skin[0] });
        stamp('-$1,000 tax', 1560, 300, 54, w('B4', 'thousand-dollar tax'));
        for (let i = 0; i < 4; i++) {
          const u = prog(t, w('B4', 'thousand-dollar tax') + i * 0.15, w('B4', 'thousand-dollar tax') + i * 0.15 + 0.6);
          if (u > 0 && u < 1) coin(lerp(1620, 1700 + i * 30, u), 560 - Math.sin(u * Math.PI) * 120 + u * 200, 20, 1 - u); else KC += 3;
        }
        stamp('why HIM?', 1560, 960, 60, w('B4', 'Why that'), { color: P.plum, rot: 0.05 });
      }, out);
    } else KC += 300;
    // B5: the gamble
    if (t > c('B5') - 0.3) {
      const ang = Math.sin((t - c('B5')) * 2.2) * 0.16;
      grp(960, 700, popS(c('B5')), 0, () => {
        poly([[-70, 150], [0, 30], [70, 150]], 1, { fill: P.grey, hachureGap: 8 });
        grp(0, 30, 1, ang, () => {
          rect(-520, -16, 1040, 32, 1, { fill: '#c99a62', fillStyle: 'solid' });
          pie(-380, -150, 125, {});
          pie(380, -120, 95, { slices: 8 });
          txt('bigger pie', -380, -310, 58, { color: P.teal });
          txt('fairer slices', 380, -250, 58, { color: P.red });
        });
      });
      wt('?', 960, 380, 120, w('B5', 'Will'), w('B5', 'Will', 0.2), { color: P.plum });
      stamp('maybe.', 520, 960, 64, w('B5', 'Maybe.'), { color: P.teal });
      stamp('maybe not.', 1400, 960, 64, w('B5', 'Maybe not'), { color: P.red, rot: 0.06 });
    } else KC += 200;
  }

  // G1-G5: the gift card fallacy, paternalism, exceptions
  function sGift() {
    const t = T;
    const hp = eIO(prog(t, c('G2') - 0.3, c('G2') + 0.4));
    grp(960, lerp(540, 110, hp), lerp(1, 0.55, hp), 0, () => {
      wt('the gift card fallacy', 0, 0, 150, w('G1', 'Call it'), w('G1', 'fallacy', 0.4), { color: P.red });
      line(-560, 90, 560, 90, eOut(prog(t, w('G1', 'fallacy', 0.2), w('G1', 'fallacy', 0.6))), { stroke: P.ink, strokeWidth: 6 });
    }, t < c('G4') - 0.2 ? 1 : fadeOut(c('G4') - 0.2, 0.4));
    if (t < c('G2')) giftCard(960, 260, 0.7 * popS(w('G1', 'mistake')) * (1 - hp), { r: Math.sin(t * 2) * 0.05 }); else KC += 120;

    // G2: the safety net of gift cards
    if (t > c('G2') - 0.2 && t < c('G3') + 0.5) {
      const out = fadeOut(c('G3') - 0.1, 0.4);
      grp(0, 0, 1, 0, () => {
        const np = eOut(prog(t, c('G2') - 0.1, w('G2', 'Food stamps')));
        const sag = (x) => 640 + 110 * Math.sin(((x - 100) / 1720) * Math.PI);
        const top = []; for (let x = 100; x <= 1820; x += 86) top.push([x, sag(x)]);
        curveP(top, np, { strokeWidth: 5, stroke: '#8a6a3a' });
        curveP(top.map(([x, y]) => [x, y + 70]), np, { strokeWidth: 3, stroke: '#8a6a3a' });
        top.forEach(([x, y], i) => { if (i % 2 === 0) line(x, y, x + 43, sag(x + 43) + 70, np, { strokeWidth: 2, stroke: '#8a6a3a' }); else line(x, y + 70, x + 43, sag(x + 43), np, { strokeWidth: 2, stroke: '#8a6a3a' }); });
        line(100, 640, 60, 560, np, { strokeWidth: 4 }); line(1820, 640, 1860, 560, np, { strokeWidth: 4 });
        txt('the safety net', 960, 870, 60, { alpha: fadeIn(c('G2'), 0.4) });
      }, out);
      const cards = [
        ['FOOD ONLY', 'food stamps', P.green, w('G2', 'Food stamps')],
        ['RENT ONLY', 'housing vouchers', P.blue, w('G2', 'Housing')],
        ['PARKING ONLY', 'free public parking', P.plum, w('G2', 'Free public')],
        ['BOOKS ONLY', 'public library', P.gold, w('G2', 'public library')],
      ];
      cards.forEach(([tag, sub, col, t0], i) => {
        const s = popS(t0, 0.5), x = 280 + i * 455, y = 470 + (i % 2 ? 40 : -10);
        giftCard(x, y, 0.95 * s, { tag, amount: '$100', color: col, sub: s > 0.5 ? sub : null, r: (i - 1.5) * 0.05 + Math.sin(t * 1.5 + i) * 0.03, alpha: out });
        if (t > t0 + 1.0) grp(x + 150, y - 120, 0.55, 0, () => flame(0, 0, 1), out); else KC += 6;
      });
      wt('paid for by everyone', 960, 960, 56, w('G2', 'paid for'), w('G2', 'everyone'), { color: P.plum, alpha: out });
    } else KC += 500;

    // G3: every one is the sweater
    if (t > c('G3') - 0.2 && t < c('G4') + 0.5) {
      const out = fadeOut(c('G4') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        person(420, 600, { s: popS(w('G3', 'family')), color: P.red, mood: -0.2, k: 11, hair: HAIR_A, skin: P.skin[2] });
        person(600, 680, { s: 0.6 * popS(w('G3', 'family', 0.15)), color: P.gold, mood: -0.4, k: 12, hair: HAIR_B, skin: P.skin[2] });
        sweater(1500, 300, 0.6 * popS(w('G3', 'sweater')), fadeOut(w('G3', 'family'), 0.4));
        bubble(560, 230, 420, 220, popS(w('G3', 'winter coat')), null, 48, { tail: -60, inner: () => { coat(-90, 0, 0.75, 1); txt('we need', 70, -30, 46); txt('a coat', 70, 30, 46); } });
        const burn = 0.3 * prog(t, w('G3', 'gap'), w('G3', 'vanishes'));
        giftCard(1250, 600, 0.95 * popS(w('G3', 'groceries')), { tag: 'FOOD ONLY', amount: '$100', color: P.green, burn, r: 0.05 });
        arrow(1050, 560, 820, 330, prog(t, w('G3', "can't make"), w('G3', 'trade')), { stroke: P.grey, strokeWidth: 5 });
        if (t > w('G3', 'trade')) xMark(935, 445, popS(w('G3', 'trade')) * 0.8, 1); else KC += 2;
        smokeBurst(1350, 520, w('G3', 'vanishes'), 7, 1);
        stamp('every one is the sweater', 960, 960, 62, w('G3', 'Every one'), { color: P.red });
      }, out);
    } else KC += 400;

    // G4: who knows best
    if (t > c('G4') - 0.2 && t < c('G5') + 0.5) {
      const out = fadeOut(c('G5') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        desk(1450, 640, popS(w('G4', 'officials')), 1);
        person(1450, 470, { s: 0.85 * popS(w('G4', 'officials')), color: P.grey, mood: 0.1, k: 13, hat: 'top' });
        bubble(1450, 170, 520, 150, popS(w('G4', 'know better')), 'I know what you need', 46, { tail: -20 });
        for (let i = 0; i < 3; i++) txt('?', 1250 + i * 60, 340 - (i % 2) * 30, 70, { color: P.plum, alpha: fadeIn(w('G4', "can't see") + i * 0.15) });
        ballot(1760, 860, popS(w('G4', 'politics')), 1);
        arrow(1560, 700, 1700, 820, prog(t, w('G4', 'answers to'), w('G4', 'politics')), { stroke: P.plum, strokeWidth: 4 });
        txt('answers to politics', 1500, 980, 44, { alpha: fadeIn(w('G4', 'politics')), color: P.plum });
        person(360, 600, { s: popS(w('G4', 'people who know')), color: P.red, mood: 0.7, k: 11, hair: HAIR_A, skin: P.skin[2] });
        person(540, 680, { s: 0.6 * popS(w('G4', 'people who know', 0.15)), color: P.gold, mood: 0.6, k: 12, hair: HAIR_B, skin: P.skin[2] });
        stamp('they know best', 450, 950, 64, w('G4', 'that family'), { color: P.green });
      }, out);
    } else KC += 400;

    // G5: exceptions
    if (t > c('G5') - 0.2) {
      grp(560, 540, popS(w('G5', 'Things nobody')), 0, () => {
        rect(-360, -160, 720, 320, 1, { strokeWidth: 3, stroke: P.blue });
        shield(-210, 0, 1, 1);
        txt('things nobody can', 100, -60, 50);
        txt('be fenced out of:', 100, 0, 50);
        txt('fund directly', 100, 80, 56, { color: P.blue });
      });
      grp(1400, 540, popS(w('G5', 'Nearly')), 0, () => {
        cash(-160, 10, 0.7, 1);
        txt('nearly everything', 130, -40, 54);
        txt('else: CASH', 130, 30, 72, { color: P.green });
      });
    } else KC += 200;
  }

  // W1-W3: second welfare theorem
  function sTheorem() {
    const t = T;
    const up = eIO(prog(t, c('W2') - 0.3, c('W2') + 0.3));
    grp(lerp(960, 380, up), lerp(330, 120, up), lerp(1, 0.4, up), 0, () => bulb(0, 0, 1.4 * popS(w('W1', 'good news')), prog(t, w('W1', 'theorem'), w('W1', 'theorem', 0.5))));
    grp(lerp(960, 1060, up), lerp(700, 120, up), lerp(1, 0.6, up), 0, () => wt('the second welfare theorem', 0, 0, 120, w('W1', 'the second'), ce('W1'), { color: P.blue }));
    if (t > c('W2') - 0.2 && t < c('W3') + 0.6) {
      const out = fadeOut(c('W3') - 0.15, 0.4);
      const t0 = w('W2', 'a little');
      const v = 0.5 + Math.sin((t - t0) * 1.8) * 0.45 * (t > t0 ? 1 : 0);
      grp(0, 0, 1, 0, () => { dial(520, 560, 220, v); txt('how much sharing?', 520, 770, 56); }, popS(w('W2', 'whatever amount')) * out);
      grp(1380, 500, popS(w('W2', 'without shrinking')), 0, () => {
        pie(0, 0, 160, { slices: 8 });
        arrow(-190, 215, 190, 215, 1, { strokeWidth: 3, head: 18 }); arrow(190, 215, -190, 215, 1, { strokeWidth: 3, head: 18 });
        txt('pie stays the same size', 0, 270, 52, { color: P.teal });
      }, out);
      wt("move money with transfers that don't depend on any trade", 960, 920, 50, w('W2', 'Move money'), w('W2', 'any trade', 0.3), { alpha: out, color: P.plum });
      wt('then let markets do the rest', 960, 990, 50, w('W2', 'let markets'), ce('W2'), { alpha: out, color: P.green });
    } else KC += 300;
    if (t > c('W3') - 0.2) {
      grp(520, 560, popS(w('W3', 'How much')), -0.02, () => {
        rect(-360, -170, 720, 340, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: P.red });
        txt('HOW MUCH to share?', 0, -80, 64, { color: P.red });
        txt('a question of values', 0, 40, 56, { alpha: fadeIn(w('W3', 'values')) });
      });
      grp(1400, 560, popS(w('W3', 'How to share')), 0.02, () => {
        rect(-360, -170, 720, 340, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: P.teal });
        txt('HOW to share?', 0, -80, 64, { color: P.teal });
        txt('a question of engineering', 0, 40, 56, { alpha: fadeIn(w('W3', 'engineering')) });
      });
      stamp('better and worse answers', 1400, 900, 56, w('W3', 'better and worse'), { color: P.green });
    } else KC += 200;
  }

  // X1-X6: taxes that don't block trades
  function sTaxes() {
    const t = T;
    const hdrOut = fadeOut(c('X3') - 0.3, 0.4);
    wt("taxes that don't block trades", 960, 110, 84, w('X1', 'Start with'), w('X1', 'trades', 0.4), { color: P.blue, alpha: hdrOut });
    // X2: pollution
    if (t < c('X3') + 0.4) {
      grp(0, 0, 1, 0, () => {
        const taxed = t > w('X2', 'pollution tax');
        factory(420, 520, 1.3 * popS(w('X2', 'Pollution')), 1);
        // smoke drifting onto the neighbors
        const n = taxed ? 2 : 6;
        for (let i = 0; i < n; i++) {
          const u = ((t * 0.18 + i / 6) % 1);
          if (t > w('X2', 'dumps')) grp(lerp(560, 1500, u), 260 + Math.sin(u * 6 + i) * 30, 1, 0, () => circ(0, 0, 70 + 40 * u, 1, { fill: '#cfc8bb', fillStyle: 'solid', stroke: P.grey, strokeWidth: 2.5 }), 0.85 * Math.sin(u * Math.PI));
          else KC += 3;
        }
        houses(1300, 600, popS(w('X2', 'neighbors')), 1);
        [1150, 1300, 1450].forEach((x, i) => person(x, 830, { s: 0.45 * popS(w('X2', 'neighbors', 0.1 + i * 0.1)), color: [P.plum, P.green, P.blue][i], mood: taxed ? 0.7 : -0.6, k: 30 + i }));
        wt('someone else pays part of the bill', 1300, 1000, 48, w('X2', 'someone else'), w('X2', 'bill'), { color: P.red });
        if (taxed) { priceTag(420, 300, 1, 'pollution tax', popS(w('X2', 'pollution tax'))); } else KC += 4;
        stamp('grows the pie!', 420, 960, 66, w('X2', 'grows the pie'), { color: P.green });
      }, hdrOut);
    } else KC += 300;
    if (t < c('X3') - 0.3) return;
    // X3-X5: land
    const ph = fadeOut(c('X6') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      const gl = clamp((t > w('X3', 'station') ? 0.25 : 0) + (t > w('X3', 'shops') ? 0.25 : 0) + (t > w('X3', 'hospital') ? 0.25 : 0) + (t > w('X3', 'neighbors') ? 0.25 : 0));
      lot(960, 560, popS(w('X3', 'empty lot')), 1, gl);
      txt('empty lot', 960, 720, 46, { alpha: fadeIn(w('X3', 'empty lot')) });
      const srcs = [
        [w('X3', 'station'), 330, 600, (s) => station(0, 0, s, 1)],
        [w('X3', 'shops'), 1600, 600, (s) => shops(0, 0, s * 0.9, 1)],
        [w('X3', 'hospital'), 420, 230, (s) => hospital(0, 0, s * 0.85, 1)],
        [w('X3', 'neighbors'), 1520, 230, (s) => houses(0, 0, s * 0.8, 1)],
      ];
      srcs.forEach(([t0, x, y, fn]) => {
        grp(x, y, 1, 0, () => fn(popS(t0)));
        const ap = prog(t, t0 + 0.2, t0 + 0.7);
        const dx = 960 - x, dy = 560 - y, L = Math.hypot(dx, dy);
        arrow(x + dx / L * 190, y + dy / L * 140, 960 - dx / L * 220, 560 - dy / L * 140, ap, { stroke: P.gold, strokeWidth: 7, head: 26 });
      });
      // value tag climbing
      const vp = prog(t, w('X3', 'station'), w('X3', 'far more'));
      const val = Math.round(lerp(50, 2000, Math.pow(vp, 1.6)));
      priceTag(1180, 430, 0.9, val >= 1000 ? `$${(val / 1000).toFixed(1)}M` : `$${val}k`, popS(w('X3', 'empty lot', 0.5)), P.gold);
      // X4: owner snoozing
      if (t > w('X4', 'owner') - 0.2) {
        person(900, 560, { s: 0.55 * popS(w('X4', 'owner')), color: P.blue, mood: 0.3, k: 40, hat: 'cap' });
        ['z', 'Z', 'z'].forEach((zz, i) => txt(zz, 960 + i * 30, 440 - i * 40 - ((t * 20) % 20), 40 + i * 10, { color: P.plum, alpha: fadeIn(w('X4', 'owner') + 0.3 + i * 0.2) }));
        wt("didn't do any of that", 960, 800, 54, w('X4', "didn't"), w('X4', 'that', 0.3), { color: P.plum, alpha: fadeOut(c('X5') - 0.2, 0.3) });
      } else KC += 60;
      // X5: tax falls on value the owner didn't create; no trade blocked
      if (t > c('X5') - 0.2) {
        stamp('land value tax', 960, 800, 58, w('X5', 'tax on land value'), { color: P.blue, rot: -0.03 });
        const acts = [['work', 'work'], ['build', 'build'], ['sell', 'sell'], ['trade', 'or trade']];
        grp(0, 0, 1, 0, () => {
          rect(260, 870, 1400, 150, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
          txt('the bill is the same whether you:', 960, 905, 40, { font: PRINT, alpha: fadeIn(w('X5', "doesn't change")) });
          acts.forEach(([a, word], i) => {
            const t0 = w('X5', word);
            txt(a, 450 + i * 340, 970, 54, { alpha: fadeIn(t0) });
            if (t > t0 + 0.2) checkMark(540 + i * 340, 965, 0.55 * popS(t0 + 0.2), 1); else KC += 2;
          });
        }, popS(w('X5', "doesn't change"), 0.4) > 0 ? 1 : 0);
        stamp("payer isn't the value maker", 440, 800, 52, w('X5', "isn't the person"), { color: P.plum });
        stamp('no deadweight loss', 1490, 800, 56, w('X5', 'no deadweight'), { color: P.green, rot: 0.04 });
      } else KC += 200;
    }, ph);
    // X6: flat income tax, last resort
    if (t > c('X6') - 0.2) {
      grp(700, 540, popS(w('X6', 'flat tax')), 0, () => {
        rect(-220, -140, 440, 280, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4 });
        txt('40%', 0, -20, 150, { color: P.blue });
        line(-150, 80, 150, 80, 1, { strokeWidth: 6, stroke: P.blue });
      });
      txt('flat income tax', 700, 770, 60, { alpha: fadeIn(w('X6', 'flat tax')) });
      wt('does tax trades: keep it low', 1350, 450, 54, w('X6', 'does tax trades'), w('X6', 'as low', 0.5), { color: P.red });
      wt('one rate: no brackets', 1350, 560, 54, w('X6', 'one rate'), w('X6', 'brackets'), { color: P.teal });
      wt('no penalty for a good year', 1350, 650, 54, w('X6', 'good year', -0.3), ce('X6', 0.3), { color: P.teal });
    } else KC += 100;
  }

  // V1: the common fund pays everyone the same check
  function sDividend() {
    const t = T;
    jar(960, 500, 0.95 * popS(c('V1') - 0.4), 1, 0.55 - 0.3 * prog(t, w('V1', 'split'), ce('V1')));
    grp(330, 230, popS(c('V1') - 0.3), 0, () => factory(0, 0, 0.7, 1));
    grp(960, 150, popS(c('V1') - 0.2), 0, () => lot(0, 0, 0.45, 1, 0.6));
    grp(1590, 230, popS(c('V1') - 0.1), 0, () => { rect(-100, -60, 200, 120, 1, { fill: P.cream, fillStyle: 'solid' }); txt('40%', 0, 2, 76, { color: P.blue }); });
    [[420, 260, 790, 400], [960, 230, 960, 330], [1500, 260, 1130, 400]].forEach(([a, b, cc, d]) => arrow(a, b, cc, d, fadeIn(c('V1') - 0.3), { stroke: P.gold, strokeWidth: 5 }));
    const people = [[200, P.red, 1, HAIR_A], [560, P.blue, 4, HAIR_B], [960, P.gold, 2, null], [1360, P.plum, 3, HAIR_B], [1720, P.teal, 0, HAIR_A]];
    const t0 = w('V1', 'split'), t1 = w('V1', 'same check');
    people.forEach(([x, col, sk, hair], i) => {
      const f = t0 + (t1 - t0) * (i / 5);
      const got = t > f + 0.6;
      person(x, 930, { s: 0.55 * popS(c('V1') + i * 0.08), color: col, skin: P.skin[sk], mood: got ? 0.9 : 0.2, arms: got ? 'up' : 'down', k: 10 + i, hair });
      const u = eIO(prog(t, f, f + 0.6));
      if (u > 0) check(lerp(960, x, u), lerp(650, 760, u) - Math.sin(u * Math.PI) * 120, 0.62, '$10,000', 1); else KC += 8;
    });
    stamp('same check for everyone', 960, 1030, 50, w('V1', 'same check'), { color: P.green, rot: -0.02 });
  }

  // V2-V3: flat rate + dividend is progressive; no welfare cliff
  function sTable() {
    const t = T;
    const out = fadeOut(c('V3') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      wt('flat 40% tax  +  $10,000 for everyone', 960, 110, 76, c('V2') - 0.1, w('V2', 'dividend', 0.4), { color: P.blue });
      const rows = [[12000, w('V2', 'Earn twelve')], [25000, w('V2', 'take home')], [80000, w('V2', 'two hundred')], [1000000, w('V2', 'Earn a million')]];
      const tx = 120, ty = 260;
      rect(tx, ty - 50, 880, 520, fadeIn(w('V2', 'forty'), 0.6), { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
      [['you earn', 140], ['take home', 470], ['you pay', 770]].forEach(([h, x]) => txt(h, tx + x, ty + 10, 48, { alpha: fadeIn(w('V2', 'forty')), font: PRINT }));
      line(tx + 20, ty + 50, tx + 860, ty + 50, fadeIn(w('V2', 'forty')), { strokeWidth: 2.5 });
      rows.forEach(([g, t0], i) => {
        const net = g * 0.6 + 10000, rate = 0.4 - 10000 / g;
        const y = ty + 120 + i * 100, a = fadeIn(t0);
        const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
        txt(fmt(g), tx + 140, y, 54, { alpha: a });
        txt(fmt(net), tx + 470, y, 54, { alpha: a, color: net > g ? P.green : P.ink });
        txt((rate < 0 ? '-' : '') + Math.abs(rate * 100).toFixed(rate === 0 ? 0 : 1) + '%', tx + 770, y, 54, { alpha: a, color: rate < 0 ? P.green : P.red });
      });
      ell(tx + 470, ty + 120, 300, 90, prog(t, w('V2', 'seventeen'), w('V2', 'two hundred')), { stroke: P.green, strokeWidth: 5 });
      ell(tx + 770, ty + 420, 230, 90, prog(t, w('V2', 'thirty-nine'), w('V2', 'percent. As')), { stroke: P.red, strokeWidth: 5 });
      const ox = 1110, oy = 700, ww = 700, h = 420;
      const ap = eOut(prog(t, w('V2', 'As progressive'), w('V2', 'bracket system')));
      const yOf = (r) => oy - h * 0.55 - r * h;
      const xOf = (g) => ox + (Math.log10(g) - 4) / 2 * ww;
      arrow(ox, yOf(0), ox + ww + 40, yOf(0), ap, { strokeWidth: 3.5 });
      arrow(ox, oy + 30, ox, yOf(0.47) - 20, ap, { strokeWidth: 3.5 });
      txt('income', ox + ww - 20, yOf(0) + 40, 40, { alpha: ap });
      txt('0%', ox - 40, yOf(0), 36, { alpha: ap, font: PRINT });
      txt('40%', ox - 50, yOf(0.4), 36, { alpha: ap, font: PRINT });
      const mp = prog(t, w('V2', 'As progressive'), w('V2', 'bracket system'));
      for (let i = 0; i < 14; i++) { const x1 = ox + i * 50, u = clamp(mp * 14 - i); line(x1, yOf(0.4), x1 + 30 * u, yOf(0.4), u > 0 ? 1 : 0, { stroke: P.blue, strokeWidth: 4 }); }
      txt('rate on each extra $: always 40%', ox + ww / 2, yOf(0.4) - 40, 40, { alpha: fadeIn(w('V2', 'bracket system')), color: P.blue });
      const pts = []; for (let i = 0; i <= 40; i++) { const g = Math.pow(10, 4.08 + (i / 40) * 1.92); pts.push([xOf(g), yOf(0.4 - 10000 / g)]); }
      curveP(pts, eIO(prog(t, w('V2', 'bracket system'), w('V2', 'no brackets'))), { stroke: P.red, strokeWidth: 6 });
      txt('share of income you pay', ox + ww / 2 - 10, yOf(-0.14), 40, { alpha: fadeIn(w('V2', 'no brackets')), color: P.red });
      stamp('progressive. no brackets.', 1460, 960, 62, w('V2', 'no brackets'), { color: P.green, rot: -0.04 });
    }, out);
    // V3: welfare cliff vs smooth
    if (t > c('V3') - 0.2) {
      const ox = 300, oy = 900, ww = 1300, h = 620;
      const ap = eOut(prog(t, c('V3'), w('V3', 'check')));
      arrow(ox, oy, ox + ww + 40, oy, ap, { strokeWidth: 4 });
      arrow(ox, oy, ox, oy - h - 30, ap, { strokeWidth: 4 });
      txt('what you earn', ox + ww - 100, oy + 50, 46, { alpha: ap });
      txt('what you keep', ox + 20, oy - h - 60, 46, { alpha: ap, align: 'left' });
      // old: benefits phase out abruptly -> cliff
      const old = [[0, 0.32], [0.3, 0.42], [0.3001, 0.24], [0.55, 0.36], [1, 0.62]].map(([u, v]) => [ox + u * ww, oy - v * h]);
      curveP(old, prog(t, w('V3', 'welfare cliff', -0.8), w('V3', 'welfare cliff', 0.4)), { stroke: P.red, strokeWidth: 6 }, false);
      txt('means-tested benefits', ox + 0.62 * ww, oy - 0.25 * h, 44, { color: P.red, alpha: fadeIn(w('V3', 'welfare cliff')) });
      stamp('cliff!', ox + 0.3 * ww, oy - 0.52 * h, 54, w('V3', 'cliff'));
      const nw = []; for (let i = 0; i <= 20; i++) { const u = i / 20; nw.push([ox + u * ww, oy - (0.35 + 0.6 * 0.6 * u) * h]); }
      curveP(nw, prog(t, w('V3', 'Every extra'), w('V3', 'better off')), { stroke: P.green, strokeWidth: 7 });
      txt('flat rate + dividend: work always pays', ox + 0.5 * ww, oy - 0.82 * h, 48, { color: P.green, alpha: fadeIn(w('V3', 'better off')) });
    } else KC += 200;
  }

  function sClose() {
    const t = T;
    const out1 = fadeOut(c('C2') - 0.2, 0.4);
    if (t < c('C2') + 0.4) {
      wt('how much?  ≠  how?', 960, 160, 76, c('C1'), w('C1', 'same argument'), { alpha: out1 });
      giftCard(520, 470, 0.95 * popS(w('C1', 'Whatever')), { alpha: out1, r: -0.06, burn: 0.3 * prog(t, w('C1', 'cash'), w('C1', 'cheaper')) });
      txt('costs $100', 520, 690, 56, { alpha: out1 * fadeIn(w('C1', 'Whatever')) });
      txt('worth $70', 520, 750, 56, { alpha: out1 * fadeIn(w('C1', 'amount')), color: P.red });
      grp(1400, 470, popS(w('C1', 'cash')), 0, () => cash(0, 0, 1, 1), out1);
      txt('costs $100', 1400, 690, 56, { alpha: out1 * fadeIn(w('C1', 'cash')) });
      txt('worth $100', 1400, 750, 56, { alpha: out1 * fadeIn(w('C1', 'delivers')), color: P.green });
      stamp('cash is cheaper', 960, 930, 70, w('C1', 'cheaper'), { color: P.green });
    } else KC += 300;
    if (t > c('C2') - 0.2 && t < c('C3') + 0.5) {
      const out2 = fadeOut(c('C3') - 0.15, 0.4);
      person(560, 520, { s: popS(c('C2')), color: P.gold, arms: 'up', mood: 1, k: 20, skin: P.skin[2], hair: HAIR_A, alpha: out2 });
      arrow(780, 640, 780, 330, prog(t, c('C2'), w('C2', 'more')), { stroke: P.green, strokeWidth: 9, head: 34 });
      txt('the poor: more', 560, 790, 64, { alpha: out2 * fadeIn(c('C2')), color: P.green });
      person(1360, 520, { s: popS(w('C2', 'Taxpayers')), color: P.blue, arms: 'up', mood: 0.9, k: 21, hat: 'top', alpha: out2 });
      arrow(1580, 330, 1580, 640, prog(t, w('C2', 'Taxpayers'), w('C2', 'less')), { stroke: P.teal, strokeWidth: 9, head: 34 });
      txt('taxpayers: pay less', 1360, 790, 64, { alpha: out2 * fadeIn(w('C2', 'Taxpayers')), color: P.teal });
      stamp('at the same time', 960, 950, 70, w('C2', 'At the same'), { color: P.red });
    } else KC += 300;
    if (t > c('C3') - 0.2) {
      const r = rand(99);
      for (let i = 0; i < 26; i++) {
        const x = r() * W, sp = 120 + r() * 160, ph = r() * 10, rot = r() * 6, rr = r();
        const age = t - w('C3', 'Just');
        if (age > 0) {
          const y = ((age * sp + ph * 100) % (H + 200)) - 100;
          grp(x + Math.sin(age * 2 + ph) * 40, y, 0.35, rot + age * (rr - 0.5) * 2, () => { rect(-120, -60, 240, 120, 1, { fill: P.cash, fillStyle: 'solid' }); txt('$', 0, 2, 64); }, 0.9 * fadeOut(ce('C3', 0.8), 1.2));
        } else KC += 60;
      }
      grp(960, 420, 1, 0, () => {
        wt('a free-market', 0, -90, 140, c('C3'), w('C3', 'welfare'), { color: P.blue });
        wt('welfare state', 0, 60, 160, w('C3', 'welfare'), w('C3', 'Just'), { color: P.red });
      });
      stamp('just give people money.', 960, 720, 84, w('C3', 'Just give'), { color: P.green, rot: -0.03 });
      const ep = fadeIn(ce('C3', 1.4), 0.8);
      txt('economic physics', 960, 900, 54, { alpha: ep, color: P.teal });
      txt('based on essays by clay shentrup  ·  clayshentrup.medium.com', 960, 970, 40, { alpha: ep, font: PRINT });
    } else KC += 400;
  }

  // ---------- assembly ----------
  function buildScenes() {
    SCN = [
      { start: 0, draw: sTitle },
      { start: c('O1') - 0.7, draw: sOpen },
      { start: c('U1') - 0.7, draw: sUtility },
      { start: c('D1') - 0.7, draw: sDeadweight },
      { start: c('T1') - 0.7, draw: sTrade },
      { start: c('B1') - 0.7, draw: sToolbox },
      { start: c('G1') - 0.7, draw: sGift },
      { start: c('W1') - 0.7, draw: sTheorem },
      { start: c('X1') - 0.7, draw: sTaxes },
      { start: c('V1') - 0.7, draw: sDividend },
      { start: c('V2') - 0.7, draw: sTable },
      { start: c('C1') - 0.7, draw: sClose },
    ];
    const E = [];
    const ev = (name, t, dur) => E.push({ name, t, dur });
    const pops = (list, name = 'pop') => list.forEach(([id, word]) => ev(name, w(id, word)));
    const stamps = (list) => list.forEach(([id, word]) => ev('stamp', w(id, word)));
    SCN.slice(1).forEach((s) => ev('whoosh', s.start - 0.05));
    ev('stamp', 0.3); ev('scribble', 0.6, 1.1); ev('sparkle', 1.7); ev('scribble', 1.9, 0.9); ev('pop', 2.2); ev('pop2', 2.45);
    // open
    ev('pop', c('O1') + 0.05); pops([['O1', 'argument'], ['O1', 'economy']], 'pop2'); ev('boing', w('O1', 'tug'));
    ev('scribble', w('O2', 'grow'), 0.6); ev('slide', w('O2', 'grow')); ev('scribble', w('O3', 'share'), 0.6); ev('tick', w('O3', 'slices'));
    stamps([['O4', "why you don't"]]); ev('sparkle', w('O4', "why you don't", 0.1));
    // utility
    ev('scribble', w('U1', 'Because'), 1.2); pops([['U2', 'groceries'], ['U2', 'rounding']]);
    stamps([['U3', 'or from']]); ev('stamp', ce('U3', -0.2)); ev('sparkle', w('U3', 'happiness'));
    pops([['U4', 'Alice'], ['U4', 'Bob']], 'pop2'); ev('pop', w('U4', 'five thousand')); ev('slide', w('U4', 'one thousand')); ev('sad', w('U4', 'nineteen')); stamps([['U4', 'Twice']]);
    ev('pop', c('U5')); ev('scribble', w('U5', 'growing'), 0.6); ev('slide', w('U5', 'at the same')); stamps([['U5', 'same time']]); ev('ding', w('U5', 'same time', 0.1));
    // deadweight
    ev('scribble', w('D1', 'deadweight'), 0.9); ev('pop', w('D1', 'gift'));
    pops([['D2', 'I buy'], ['D2', 'you']], 'pop2'); ev('pop', w('D2', 'sweater')); ev('whoosh', w('D2', 'ten dollars')); ev('coin', w('D2', 'ten dollars')); ev('pop', w('D2', 'only pay'));
    ['got ten', 'gave up', 'breaks even'].forEach((x) => ev('tick', w('D3', x)));
    ev('tick', w('D4', "I'm down")); ev('tick', w('D4', "You're up"));
    stamps([['D5', 'three dollars']]); ev('poof', w('D5', 'disappeared')); ev('scribble', w('D5', 'Nobody'), 0.6);
    ev('whoosh', w('D6', 'ten-dollar')); ev('chaching', w('D6', 'up ten')); ev('pop', w('D6', 'deadweight')); ev('sparkle', w('D6', 'deadweight', 0.1));
    // trade
    pops([['T1', 'two people'], ['T1', 'trade']], 'pop2'); ev('coin', w('T1', 'trade', 0.5)); ev('ding', w('T1', 'both'));
    stamps([['T2', 'Pareto']]); ev('scribble', w('T2', 'helps someone'), 0.8); ev('sparkle', w('T2', 'know for sure'));
    pops([['T3', 'Dana'], ['T3', 'twenty dollars'], ['T3', 'twenty-five']]); ev('ding', w('T3', 'The job happens')); ev('coin', w('T3', 'five dollars'));
    ev('slide', w('T4', 'eight-dollar')); ev('sad', w('T4', 'never happens')); ev('stamp', w('T4', 'never happens'));
    ev('pop', w('T5', 'collects nothing')); ev('poof', w('T5', 'never comes')); stamps([['T5', 'deadweight']]);
    ev('pop2', w('T6', 'first rule')); ev('sparkle', w('T6', 'first rule', 0.1));
    // toolbox
    pops([['B1', 'share the pie'], ['B1', 'usually']], 'pop2'); pops([['B2', 'Steep'], ['B3', 'Minimum'], ['B3', 'rent control']]); ev('sad', w('B3', 'hide'));
    ev('pop', w('B4', 'apartment')); ev('pop2', w('B4', 'tenant')); ev('chaching', w('B4', 'rent voucher')); ev('pop2', w('B4', 'one landlord')); stamps([['B4', 'thousand-dollar tax'], ['B4', 'Why that']]);
    [0, 1, 2, 3].forEach((i) => ev('coin', w('B4', 'thousand-dollar tax') + i * 0.15));
    ev('pop', c('B5')); ev('boing', w('B5', 'gamble')); stamps([['B5', 'Maybe.'], ['B5', 'Maybe not']]);
    // gift
    ev('pop', w('G1', 'mistake')); ev('scribble', w('G1', 'Call it'), 1.0); ev('sparkle', w('G1', 'fallacy'));
    pops([['G2', 'Food stamps'], ['G2', 'Housing'], ['G2', 'Free public'], ['G2', 'public library']], 'pop2'); ev('scribble', w('G2', 'paid for'), 0.6);
    stamps([['G3', 'Every one']]); ev('pop2', w('G3', 'family')); ev('pop', w('G3', 'winter coat')); ev('pop', w('G3', 'groceries')); ev('stamp', w('G3', 'trade')); ev('fire', w('G3', 'gap'), 1.6); ev('poof', w('G3', 'vanishes'));
    ev('pop', w('G4', 'officials')); ev('pop2', w('G4', 'know better')); ev('tick', w('G4', "can't see")); ev('pop', w('G4', 'politics')); ev('pop2', w('G4', 'people who know')); stamps([['G4', 'that family']]);
    ev('pop2', w('G5', 'Things nobody')); ev('chaching', w('G5', 'Nearly'));
    // theorem
    ev('bulb', w('W1', 'theorem')); ev('scribble', w('W1', 'the second'), 1.0);
    ev('pop', w('W2', 'whatever amount')); ev('slide', w('W2', 'a little')); ev('pop2', w('W2', 'without shrinking')); ev('scribble', w('W2', 'Move money'), 0.8);
    ev('pop2', w('W3', 'How much')); ev('pop2', w('W3', 'How to share')); stamps([['W3', 'better and worse']]);
    // taxes
    ev('scribble', w('X1', 'Start with'), 0.9); ev('pop', w('X2', 'Pollution')); ev('poof', w('X2', 'dumps')); ev('pop2', w('X2', 'neighbors')); ev('sad', w('X2', 'someone else'));
    ev('chaching', w('X2', 'pollution tax')); stamps([['X2', 'grows the pie']]); ev('sparkle', w('X2', 'grows the pie', 0.1));
    ev('pop', w('X3', 'empty lot')); pops([['X3', 'station'], ['X3', 'shops'], ['X3', 'hospital'], ['X3', 'neighbors']], 'pop2');
    ['station', 'shops', 'hospital', 'neighbors'].forEach((x) => ev('coin', w('X3', x, 0.5))); ev('slide', w('X3', 'far more'));
    ev('pop', w('X4', 'owner')); ev('scribble', w('X4', "didn't"), 0.6);
    stamps([['X5', 'tax on land value']]); ev('pop', w('X5', "doesn't change")); ['work', 'build', 'sell', 'or trade'].forEach((x) => ev('tick', w('X5', x, 0.2)));
    stamps([['X5', "isn't the person"], ['X5', 'no deadweight']]); ev('ding', w('X5', 'no deadweight', 0.1));
    ev('pop', w('X6', 'flat tax')); ev('scribble', w('X6', 'does tax trades'), 0.6); ev('scribble', w('X6', 'one rate'), 0.6);
    // dividend
    ev('pop', c('V1') - 0.4); [0, 1, 2, 3, 4].forEach((i) => { const t0 = w('V1', 'split'), t1 = w('V1', 'same check'); ev('chaching', t0 + (t1 - t0) * (i / 5) + 0.55); }); stamps([['V1', 'same check']]);
    ev('scribble', c('V2') - 0.1, 1.0); [['V2', 'Earn twelve'], ['V2', 'take home'], ['V2', 'two hundred'], ['V2', 'Earn a million']].forEach(([id, x]) => ev('tick', w(id, x)));
    ev('pop', w('V2', 'seventeen')); ev('pop', w('V2', 'thirty-nine')); ev('scribble', w('V2', 'bracket system'), 0.9); stamps([['V2', 'no brackets']]);
    ev('scribble', c('V3'), 0.8); ev('sad', w('V3', 'welfare cliff')); stamps([['V3', 'cliff']]); ev('slide', w('V3', 'Every extra')); ev('ding', w('V3', 'better off'));
    // close
    ev('pop', w('C1', 'Whatever')); ev('fire', w('C1', 'cash'), 1.0); ev('chaching', w('C1', 'cash')); stamps([['C1', 'cheaper']]);
    ev('pop2', c('C2')); ev('slide', c('C2')); ev('pop2', w('C2', 'Taxpayers')); stamps([['C2', 'At the same']]);
    ev('scribble', c('C3'), 1.2); stamps([['C3', 'Just give']]); ev('sparkle', w('C3', 'Just give', 0.05)); ev('chaching', w('C3', 'money'));
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
