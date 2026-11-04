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

  // ---------- election-by-jury illustrations ----------
  const PALETTE = [P.teal, P.red, P.gold, P.blue, P.plum, P.green];
  function mini(x, y, s, col, k = 0, op = {}) {
    person(x, y, Object.assign({ s, color: col, skin: P.skin[k % 5], hair: k % 3 === 0 ? HAIR_A : k % 3 === 1 ? HAIR_B : null, k, mood: 0.4 }, op));
  }
  // grid of small people; colFn(i) -> color, alphaFn(i) -> alpha
  function crowd(cx, cy, cols, rows, sp, s, colFn, alphaFn, opFn) {
    for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
      const i = r * cols + c2, a = alphaFn ? alphaFn(i) : 1;
      const x = cx + (c2 - (cols - 1) / 2) * sp, y = cy + (r - (rows - 1) / 2) * sp * 1.25;
      if (a > 0.01) mini(x, y, s, colFn(i), i, Object.assign({ alpha: a }, opFn ? opFn(i) : {})); else KC += 40;
    }
  }
  function courthouse(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      poly([[-170, -90], [0, -170], [170, -90]], 1, { fill: P.cream, fillStyle: 'solid' });
      rect(-160, -90, 320, 24, 1, { fill: P.cream, fillStyle: 'solid' });
      for (let i = 0; i < 5; i++) rect(-140 + i * 64, -66, 24, 150, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      rect(-180, 84, 360, 22, 1, { fill: P.grey, hachureGap: 8 });
      rect(-200, 106, 400, 22, 1, { fill: P.grey, hachureGap: 8 });
    }, alpha);
  }
  function seats(cx, cy, cols, op = {}) {
    cols.forEach((col, i) => {
      const x = cx + (i - (cols.length - 1) / 2) * (op.sp || 110);
      grp(x, cy, op.s || 1, 0, () => {
        rect(-40, -70, 80, 70, 1, { fill: col, fillStyle: col === P.grey ? 'hachure' : 'solid', hachureGap: 8 });
        rect(-45, 0, 90, 22, 1, { fill: col, fillStyle: 'solid' });
        line(-38, 22, -38, 60); line(38, 22, 38, 60);
      }, op.alpha);
      if (op.labels) txt(op.labels[i], x, cy + 100 * (op.s || 1), op.lsize || 30, { font: PRINT, alpha: op.alpha });
    });
  }
  function hat(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      path('M -90 -20 L 90 -20 L 70 90 L -70 90 Z', 1, { fill: P.ink, fillStyle: 'solid' });
      ell(0, -20, 220, 50, 1, { fill: '#3a3644', fillStyle: 'solid' });
      rect(-70, 50, 140, 22, 1, { fill: P.red, fillStyle: 'solid', stroke: P.red });
    }, alpha);
  }
  function slip(x, y, r, alpha = 1) { grp(x, y, 1, r, () => { rect(-34, -20, 68, 40, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2 }); line(-22, -4, 22, -4, 1, { strokeWidth: 2 }); line(-22, 8, 10, 8, 1, { strokeWidth: 2 }); }, alpha); }
  function magnifier(x, y, s, alpha = 1) {
    grp(x, y, s, -0.5, () => {
      circ(0, 0, 160, 1, { fill: '#d9ecf2', fillStyle: 'solid', fillAlpha: 0.5, strokeWidth: 7 });
      rect(-14, 80, 28, 120, 1, { fill: '#8a6a3a', fillStyle: 'solid' });
    }, alpha);
  }
  function phone(x, y, s, alpha = 1) {
    grp(x, y, s, 0.08, () => {
      rect(-80, -140, 160, 280, 1, { fill: P.ink, fillStyle: 'solid' });
      rect(-66, -112, 132, 220, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2 });
      for (let i = 0; i < 4; i++) rect(-54, -96 + i * 52, 108, 38, 1, { fill: [P.red, P.gold, P.red, P.plum][i], fillStyle: 'solid', strokeWidth: 2 });
      txt('!!', 0, -45, 34, { color: P.cream });
    }, alpha);
  }
  function robot(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-70, -60, 140, 120, 1, { fill: P.grey, fillStyle: 'solid' });
      circ(-28, -10, 34, 1, { fill: P.red, fillStyle: 'solid' }); circ(28, -10, 34, 1, { fill: P.red, fillStyle: 'solid' });
      line(-30, 35, 30, 35, 1, { strokeWidth: 4 });
      line(0, -60, 0, -100); circ(0, -108, 20, 1, { fill: P.gold, fillStyle: 'solid' });
      rect(-90, 70, 180, 120, 1, { fill: P.grey, hachureGap: 8 });
    }, alpha);
  }
  function podium(x, y, s, col, alpha = 1) {
    grp(x, y, s, 0, () => { poly([[-70, 0], [70, 0], [55, 150], [-55, 150]], 1, { fill: col, fillStyle: 'solid' }); rect(-80, -14, 160, 18, 1, { fill: '#c99a62', fillStyle: 'solid' }); }, alpha);
  }
  function chessClock(x, y, s, a, b, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-170, -70, 340, 140, 1, { fill: '#c99a62', fillStyle: 'solid' });
      [[-85, a], [85, b]].forEach(([cx, v]) => {
        circ(cx, 0, 110, 1, { fill: P.cream, fillStyle: 'solid' });
        const ang = -Math.PI / 2 + v * Math.PI * 2;
        line(cx, 0, cx + Math.cos(ang) * 42, Math.sin(ang) * 42, 1, { strokeWidth: 4, stroke: P.red });
        rect(cx - 16, -96, 32, 22, 1, { fill: P.ink, fillStyle: 'solid' });
      });
    }, alpha);
  }
  function scroll(x, y, s, title, alpha = 1) {
    grp(x, y, s, 0, () => {
      rect(-150, -100, 300, 200, 1, { fill: '#fdf3d8', fillStyle: 'solid' });
      ell(-150, 0, 30, 200, 1, { fill: '#f0dfb2', fillStyle: 'solid' }); ell(150, 0, 30, 200, 1, { fill: '#f0dfb2', fillStyle: 'solid' });
      txt(title, 0, -55, 40, { font: PRINT });
      for (let i = 0; i < 4; i++) line(-110, -10 + i * 26, 110 - (i % 2) * 40, -10 + i * 26, 1, { strokeWidth: 2 });
    }, alpha);
  }
  function calendar(x, y, s, top, big, alpha = 1, col = P.red) {
    grp(x, y, s, 0, () => {
      rect(-110, -100, 220, 200, 1, { fill: P.cream, fillStyle: 'solid' });
      rect(-110, -100, 220, 56, 1, { fill: col, fillStyle: 'solid' });
      txt(top, 0, -72, 36, { color: P.cream, font: PRINT });
      txt(big, 0, 28, 74);
    }, alpha);
  }
  function camera(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => { rect(-80, -50, 120, 100, 1, { fill: P.ink, fillStyle: 'solid' }); poly([[40, -30], [100, -60], [100, 60], [40, 30]], 1, { fill: P.grey, fillStyle: 'solid' }); circ(-20, 0, 50, 1, { fill: P.red, fillStyle: 'solid' }); }, alpha);
  }
  function temple(x, y, s, alpha = 1) { courthouse(x, y, s, alpha); }
  function dome(x, y, s, alpha = 1) {
    grp(x, y, s, 0, () => {
      path('M -110 0 Q -110 -130 0 -140 Q 110 -130 110 0 Z', 1, { fill: P.teal, hachureGap: 8 });
      rect(-130, 0, 260, 120, 1, { fill: P.cream, fillStyle: 'solid' });
      for (let i = 0; i < 4; i++) path(`M ${-100 + i * 60} 120 L ${-100 + i * 60} 50 Q ${-80 + i * 60} 25 ${-60 + i * 60} 50 L ${-60 + i * 60} 120`, 1, { strokeWidth: 2.4 });
    }, alpha);
  }
  function bar(x, y, wdt, h, frac, col, alpha = 1) {
    grp(0, 0, 1, 0, () => {
      rect(x, y - h, wdt, h, 1, { strokeWidth: 3 });
      if (frac > 0.002) rect(x, y - h * frac, wdt, h * frac, 1, { fill: col, fillStyle: 'solid', stroke: 'none' }); else KC++;
    }, alpha);
  }

  // ---------- scenes ----------
  function sTitle() {
    const t = T;
    stamp('an explainer', 960, 250, 54, 0.3, { color: P.teal, rot: -0.04 });
    wt('Election by Jury', 960, 470, 180, 0.6, 1.6);
    line(560, 570, 1360, 570, eOut(prog(t, 1.5, 1.9)), { stroke: P.red, strokeWidth: 7 });
    wt(SCRIPT.subtitle, 960, 670, 60, 1.8, 2.9, { font: PRINT, color: P.teal });
    crowd(960, 880, 9, 1, 120, 0.42 * popS(2.2), (i) => PALETTE[i % 6], (i) => (i === 4 ? 1 : 0.35 + 0.65 * (t > 2.6 ? 0 : 1)));
  }

  // H1-H3
  function sHook() {
    const t = T;
    stamp('Georgia, 2021', 360, 140, 56, c('H1'), { color: P.blue, rot: -0.05 });
    courthouse(360, 470, 1.1 * popS(w('H1', 'county')), 1);
    const pick = t > w('H1', 'randomly');
    const chosen = [2, 6, 9, 13, 17];
    crowd(1220, 300, 7, 3, 110, 0.38 * popS(w('H1', 'jury')), (i) => (pick && chosen.includes(i) ? P.green : P.grey), (i) => (t > w('H2', 'Four') ? 0.25 : 1));
    if (pick) txt('chosen at random', 1220, 520, 46, { color: P.green, alpha: fadeIn(w('H1', 'randomly')) }); else KC++;
    const sp = popS(w('H1', 'pick most'));
    seats(960, 820, [P.green, P.green, P.green, P.green, P.green, P.grey, P.grey], { s: 0.9 * sp, sp: 120, alpha: sp > 0 ? 1 : 0 });
    txt('the ethics board: 5 of 7 seats picked by the jury', 960, 960, 44, { alpha: fadeIn(w('H1', 'members')), font: PRINT });
    if (t > w('H2', 'Four') - 0.2) {
      stamp('2025', 1220, 140, 60, w('H2', 'Four'), { color: P.red });
      person(1500, 420, { s: 1.1 * popS(w('H2', 'most powerful')), color: P.ink, hat: 'top', mood: -0.3, k: 50 });
      txt('most powerful politician', 1500, 640, 44, { alpha: fadeIn(w('H2', 'politician')), color: P.red });
      magnifier(1350, 330, 0.9 * popS(w('H2', 'investigated')), 1);
    } else KC += 200;
    if (t > c('H3') - 0.2) {
      const a = popS(w('H3', 'election by jury'));
      ctx.save(); ctx.globalAlpha = 0.88 * fadeIn(w('H3', 'election by jury') - 0.2, 0.4); ctx.drawImage(PAPER, -W, 0, W * 3, H); ctx.restore();
      grp(960, 540, a, -0.02, () => {
        rect(-620, -120, 1240, 240, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 5, stroke: P.red });
        txt('election by jury', 0, 0, 130, { color: P.red });
      });
      wt("first, the idea...", 960, 760, 54, w('H3', 'First'), ce('H3'), { color: P.plum });
    } else KC += 30;
  }

  // P1-P4
  function sPillars() {
    const t = T;
    const shake = t > w('P4', 'struggle') ? Math.sin(t * 22) * 0.025 : 0;
    grp(960, 600, 1, shake, () => {
      poly([[-460, -300], [0, -420], [460, -300]], popS(w('P1', 'two things')) > 0 ? 1 : 0, { fill: P.cream, fillStyle: 'solid' });
      txt('good choices', 0, -335, 54, { alpha: fadeIn(w('P1', 'right')) });
      [[-260, 'alignment', 'P2', 'want what the public wants', P.teal], [260, 'competence', 'P3', 'enough information + time', P.blue]].forEach(([x, name, id, sub, col]) => {
        const s = popS(c(id));
        grp(x, 0, s, 0, () => {
          rect(-80, -290, 160, 440, 1, { fill: col, hachureGap: 10 });
          rect(-110, 150, 220, 40, 1, { fill: P.grey, fillStyle: 'solid' });
        });
        txt(name, x, 240, 64, { alpha: fadeIn(c(id)), color: col });
        txt(sub, x, 310, 42, { alpha: fadeIn(c(id) + 0.5), font: PRINT });
      });
    });
    if (t > w('P4', 'Mass')) {
      ballot(960, 520, popS(w('P4', 'Mass')), 1);
      txt('mass elections', 960, 410, 44, { color: P.red });
      xMark(700, 520, 0.6 * popS(w('P4', 'both')), 1); xMark(1220, 520, 0.6 * popS(w('P4', 'both', 0.15)), 1);
    } else KC += 30;
  }

  // A1-A5
  function sAlign() {
    const t = T;
    const ph1 = fadeOut(c('A3') - 0.2, 0.4);
    if (t < c('A3') + 0.4) {
      grp(0, 0, 1, 0, () => {
        const show = t > w('A1', 'show up');
        const voters = (i) => i % 10 >= 4 && (i % 3 !== 0 || i % 10 > 7);
        crowd(560, 400, 10, 4, 85, 0.3 * popS(c('A1')), (i) => PALETTE[i % 6], (i) => (show && !voters(i) ? 0.2 : 1));
        txt('the public', 560, 150, 52, { alpha: fadeIn(c('A1')) });
        if (show) { ballot(1050, 300, 0.8, 1); txt('who actually votes:', 1400, 260, 46, { align: 'center' }); }
        else KC += 10;
        ['older', 'wealthier', 'more partisan'].forEach((s, i) => txt(s, 1400, 330 + i * 60, 52, { color: P.red, alpha: fadeIn(w('A1', ['older', 'wealthier', 'partisan'][i])) }));
        // A2: money for name recognition
        if (t > c('A2') - 0.2) {
          person(700, 820, { s: 0.75 * popS(w('A2', 'Candidates')), color: P.blue, arms: 'out', mood: 0.6, k: 60 });
          [-1, 1].forEach((d, i) => bag(700 + d * 190, 860, 0.7 * popS(w('A2', 'donors') + i * 0.15), null, {}));
          txt('courting donors', 700, 980, 44, { alpha: fadeIn(w('A2', 'courting')), color: P.plum });
          for (let i = 0; i < 3; i++) mini(1300 + i * 140, 840, 0.55, P.grey, 70 + i, { alpha: 0.6 * fadeIn(w('A2', 'Plenty')), mood: -0.2 });
          txt('capable people who never run', 1440, 990, 44, { alpha: fadeIn(w('A2', 'never run')), color: P.grey });
        } else KC += 300;
      }, ph1);
    } else KC += 700;
    // A3-A4: draw at random, a mirror
    if (t > c('A3') - 0.3 && t < c('A5') + 0.4) {
      const ph2 = fadeOut(c('A5') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        const picks = [3, 8, 14, 17, 22, 27, 31, 36];
        crowd(480, 430, 10, 4, 80, 0.28, (i) => PALETTE[i % 6], (i) => (t > w('A3', 'random') && picks.includes(i) ? 0.35 : 1));
        txt('the population', 480, 190, 50);
        hat(960, 740, 0.9 * popS(w('A3', 'Draw')), fadeOut(c('A4') - 0.2, 0.4));
        picks.forEach((p, j) => {
          const u = eIO(prog(t, w('A3', 'random') + j * 0.12, w('A3', 'random') + j * 0.12 + 0.7));
          if (u > 0 && u < 1) slip(lerp(480, 960, u), lerp(430, 700, u) - Math.sin(u * Math.PI) * 150, u * 6, 1); else KC += 3;
        });
        txt('like trial juries', 960, 900, 46, { alpha: fadeIn(w('A3', 'trial juries')) * fadeOut(c('A4') - 0.2, 0.4), color: P.plum });
        // mirror
        if (t > c('A4') - 0.2) {
          const mp = popS(w('A4', 'mirror'));
          grp(1440, 430, mp, 0, () => { ell(0, 0, 640, 520, 1, { strokeWidth: 9, stroke: '#b58a3c' }); });
          crowd(1440, 430, 4, 2, 110, 0.32 * mp, (i) => PALETTE[(i * 2) % 6]);
          txt('the jury', 1440, 140, 50, { alpha: fadeIn(w('A4', 'mirror')) });
          wt('every age, income, and leaning, in roughly real proportions', 1440, 760, 40, w('A4', 'Every age'), w('A4', 'proportions'), { font: PRINT });
          stamp('nobody chose them, so nobody owns them', 1300, 960, 50, w('A4', 'Nobody chose'), { color: P.green });
        } else KC += 400;
      }, ph2);
    } else KC += 900;
    // A5: 23 jurors, 16 favor
    if (t > c('A5') - 0.2) {
      const jp = popS(w('A5', 'twenty-three'));
      const fav = t > w('A5', 'sixteen');
      crowd(640, 450, 8, 3, 115, 0.36 * jp, (i) => (fav ? (i < 16 ? P.teal : P.red) : P.grey), (i) => (i < 23 ? 1 : 0));
      txt('a jury of 23', 640, 170, 56, { alpha: fadeIn(w('A5', 'twenty-three')) });
      txt('16 favor candidate A', 640, 780, 52, { color: P.teal, alpha: fadeIn(w('A5', 'sixteen')) });
      grp(1450, 450, popS(w('A5', 'ninety percent')), 0, () => {
        bar(-60, 200, 120, 400, 0.9 * eOut(prog(t, w('A5', 'ninety percent'), w('A5', 'ninety percent', 1))), P.green, 1);
        txt('>90%', 0, -250, 80, { color: P.green });
        txt('confident', 0, 260, 46);
      });
      wt('town of 1,000 or 1,000,000: same answer', 960, 960, 52, w('A5', 'thousand people'), w('A5', 'million'), { color: P.blue });
    } else KC += 400;
  }


  // A5b: Marcus Ogren's VSE-by-jury-size simulations
  const VSE = [[6, 0.818], [12, 0.903], [24, 0.948], [48, 0.969], [96, 0.980], [192, 0.985], [384, 0.988], [768, 0.990], [1536, 0.990], [3072, 0.991], [6144, 0.991], [12288, 0.991], [24576, 0.991]];
  function sVSE() {
    const t = T;
    wt('how good are small juries?', 960, 100, 72, c('A5b'), w('A5b', 'back this up'), { color: P.blue });
    txt('simulations by Marcus Ogren: score voting, 10 candidates, 10,000 trials each', 960, 175, 34, { alpha: fadeIn(w('A5b', 'ten candidates')), font: PRINT, color: P.grey });
    const ox = 260, oy = 900, ww = 1400, h = 600;
    const xOf = (n) => ox + (Math.log2(n) - Math.log2(6)) / (Math.log2(24576) - Math.log2(6)) * ww;
    const yOf = (v) => oy - (v - 0.75) / 0.25 * h;
    const ap = eOut(prog(t, c('A5b'), w('A5b', 'Ogren')));
    arrow(ox, oy, ox + ww + 40, oy, ap, { strokeWidth: 4 });
    arrow(ox, oy, ox, yOf(1.0) - 30, ap, { strokeWidth: 4 });
    [0.8, 0.9, 1.0].forEach((v) => { txt(Math.round(v * 100) + '%', ox - 60, yOf(v), 36, { alpha: ap, font: PRINT }); line(ox - 10, yOf(v), ox, yOf(v), ap, { strokeWidth: 3 }); });
    [6, 24, 96, 384, 1536, 6144, 24576].forEach((n) => txt(n.toLocaleString('en-US'), xOf(n), oy + 40, 32, { alpha: ap, font: PRINT }));
    txt('jurors', ox + ww / 2, oy + 95, 44, { alpha: ap });
    txt('VSE', ox - 20, yOf(1.0) - 70, 44, { alpha: ap });
    // whole-population line
    const wp = prog(t, w('A5b', 'entire population'), w('A5b', 'ninety-nine'));
    for (let i = 0; i < 28; i++) { const x1 = ox + i * 50, u = clamp(wp * 28 - i); line(x1, yOf(0.991), x1 + 30 * u, yOf(0.991), u > 0 ? 1 : 0, { stroke: P.grey, strokeWidth: 3 }); }
    txt('everyone votes: 99%', ox + ww - 160, yOf(0.991) - 36, 40, { alpha: fadeIn(w('A5b', 'ninety-nine')), color: P.grey });
    curveP(VSE.map(([n, v]) => [xOf(n), yOf(v)]), eIO(prog(t, w('A5b', 'score voting'), w('A5b', 'twenty-four', 0.5))), { stroke: P.blue, strokeWidth: 6 });
    [[24, 0.948, '24 jurors: 95%', w('A5b', 'twenty-four'), P.teal], [96, 0.980, '96 jurors: 98%', w('A5b', 'ninety-six'), P.green]].forEach(([n, v, lab, t0, col]) => {
      const s = popS(t0);
      circ(xOf(n), yOf(v), 30 * s + 0.01, s > 0 ? 1 : 0, { fill: col, fillStyle: 'solid' });
      txt(lab, xOf(n) + 30, yOf(v) + 70, 48, { alpha: fadeIn(t0), color: col, align: 'left' });
    });
  }

  // S1-S3
  function sSecurity() {
    const t = T;
    const ph1 = fadeOut(c('S3') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      crowd(600, 330, 10, 1, 95, 0.36 * popS(c('S1')), (i) => PALETTE[i % 6]);
      txt('jurors', 600, 180, 50, { alpha: fadeIn(c('S1')) });
      person(1500, 330, { s: 0.9 * popS(w('S1', 'briber')), color: P.ink, hat: 'top', arms: 'give', mood: 0.6, k: 80 });
      bag(1360, 360, 0.6 * popS(w('S1', 'briber', 0.2)), null, {});
      txt('a briber has to reach every one', 1450, 560, 44, { alpha: fadeIn(w('S1', 'reach')), color: P.red });
      // odds of getting caught
      txt('each bribe attempt: 5% chance of being reported', 960, 660, 46, { alpha: fadeIn(w('S2', 'five percent')), font: PRINT });
      [[14, 0.512, w('S2', 'fourteen')], [20, 0.642, w('S2', 'more likely') + 0.6], [30, 0.785, w('S2', 'Thirty')]].forEach(([n, p, t0], i) => {
        const x = 620 + i * 340, s = fadeIn(t0);
        bar(x - 60, 1000, 120, 260, p * eOut(prog(t, t0, t0 + 0.8)), [P.gold, P.plum, P.red][i], s);
        txt(Math.round(p * 100) + '% caught', x, 710, 44, { alpha: s, color: [P.gold, P.plum, P.red][i] });
        txt(n + ' jurors', x, 1040, 40, { alpha: s, font: PRINT });
      });
      line(520, 1000 - 130, 1360, 1000 - 130, fadeIn(w('S2', 'more likely')), { stroke: P.grey, strokeWidth: 2 });
      txt('50%', 1410, 870, 34, { alpha: fadeIn(w('S2', 'more likely')), font: PRINT });
    }, ph1);
    if (t > c('S3') - 0.2) {
      ballot(480, 450, 1.4 * popS(w('S3', 'secret ballot')), 1);
      txt("nobody can verify a bought vote", 480, 680, 46, { alpha: fadeIn(w('S3', 'verify')) });
      grp(1340, 480, popS(w('S3', 'cube root')), 0, () => {
        rect(-380, -300, 760, 600, 1, { fill: P.cream, fillStyle: 'solid' });
        txt('jury size = cube root of voters', 0, -240, 48, { color: P.blue });
        [['8,000 voters', '20 jurors', w('S3', 'twenty jurors')], ['125,000', '50', w('S3', 'twenty jurors') + 0.5], ['8 million', '200', w('S3', 'twenty jurors') + 1.0], ['240 million', '~620', w('S3', 'six hundred')]].forEach(([a, b, t0], i) => {
          txt(a, -150, -130 + i * 100, 46, { alpha: fadeIn(t0) });
          txt(b, 200, -130 + i * 100, 46, { alpha: fadeIn(t0), color: P.green });
        });
      });
    } else KC += 300;
  }

  // C1-C3: the information environment
  function sInfo() {
    const t = T;
    phone(420, 470, 1.3 * popS(c('C1')), 1);
    wt('spreads  ≠  true', 420, 820, 64, w('C1', 'rewards'), w('C1', 'true', 0.4), { color: P.red });
    if (t > c('C2') - 0.2) {
      txt('opponents with "extreme" views', 1230, 180, 48, { alpha: fadeIn(c('C2')) });
      const ip = eOut(prog(t, w('C2', 'imagine'), w('C2', 'extreme')));
      bar(1030, 640, 160, 400, 0.6 * ip, P.red, fadeIn(c('C2')));
      bar(1300, 640, 160, 400, 0.3 * eOut(prog(t, w('C2', 'actually'), w('C2', 'actually', 0.8))), P.teal, fadeIn(c('C2')));
      txt('imagined', 1110, 690, 44, { alpha: fadeIn(c('C2')), color: P.red });
      txt('actual', 1380, 690, 44, { alpha: fadeIn(w('C2', 'actually')), color: P.teal });
      stamp('~2x', 1600, 380, 70, w('C2', 'actually', 0.6), { color: P.red });
      wt('heaviest news readers: most distorted', 1230, 790, 44, w('C2', 'follow the news'), w('C2', 'distorted'), { color: P.plum });
    } else KC += 200;
    if (t > c('C3') - 0.2) {
      robot(1020, 900, 0.75 * popS(w('C3', 'AI')), 1);
      [['FAKE', P.red], ['FAKE', P.plum], ['FAKE', P.gold]].forEach(([s, col], i) => {
        const u = prog(t, w('C3', 'cheap') + i * 0.2, w('C3', 'cheap') + i * 0.2 + 0.6);
        grp(1120 + u * (260 + i * 200), 900 + (i - 1) * 30 * u, 0.8, (i - 1) * 0.2, () => { rect(-70, -40, 140, 80, 1, { fill: P.cream, fillStyle: 'solid' }); txt(s, 0, 2, 40, { color: col, font: PRINT }); }, u > 0 ? 1 : 0);
      });
      txt('foreign influence operations', 1500, 1030, 44, { alpha: fadeIn(w('C3', 'foreign')), color: P.red });
    } else KC += 200;
  }

  // C4-C8: inside the jury room
  function sRoom() {
    const t = T;
    const phA = fadeOut(c('C7') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      calendar(260, 260, popS(c('C4')), 'jury service', '1-3 wks', 1, P.blue);
      txt('paid, protected time', 260, 420, 44, { alpha: fadeIn(w('C4', 'paid')), color: P.green });
      // C5 equal time
      if (t > c('C5') - 0.2) {
        [0, 1, 2].forEach((i) => chessClock(760 + i * 0, 0, 0, 0, 0, 0));
        txt('equal time for every candidate', 1150, 150, 50, { alpha: fadeIn(c('C5')) });
        grp(1640, 260, popS(w('C5', 'Money')), 0, () => { txt('$', 0, 0, 120, { color: P.green }); xMark(0, 0, 0.9, 1); });
      } else KC += 100;
      // C6 podiums + cross-exam
      const cand = [[760, P.teal], [1150, P.red], [1540, P.gold]];
      cand.forEach(([x, col], i) => {
        const s = popS(c('C5') + i * 0.15);
        podium(x, 560, s, col, 1);
        person(x, 450, { s: 0.7 * s, color: col, arms: t > w('C6', 'cross-examine') ? 'out' : 'down', mood: 0.5, k: 90 + i, hair: i === 1 ? HAIR_B : HAIR_A, skin: P.skin[(i * 2) % 5] });
        // hourglass-ish timer bar
        bar(x - 70, 760, 140, 26, 1 - 0.6 * prog(t, c('C5'), ce('C6')), col, fadeIn(c('C5')));
      });
      if (t > w('C6', 'cross-examine')) {
        const ap = prog(t, w('C6', 'cross-examine'), w('C6', 'cross-examine', 0.6));
        arrow(860, 400, 1050, 400, ap, { stroke: P.plum, strokeWidth: 4 }); arrow(1250, 400, 1440, 400, ap, { stroke: P.plum, strokeWidth: 4 });
        arrow(1440, 340, 860, 340, prog(t, w('C6', 'cross-examine', 0.4), w('C6', 'cross-examine', 1.0)), { stroke: P.plum, strokeWidth: 4 });
      } else KC += 30;
      crowd(1150, 900, 9, 1, 110, 0.3 * popS(w('C6', 'jury hears')), (i) => PALETTE[i % 6]);
      txt('the jury hears all of them', 1150, 1040, 42, { alpha: fadeIn(w('C6', 'jury hears')), font: PRINT });
      stamp('omni-biased', 300, 760, 66, w('C6', 'omni-biased'), { color: P.plum });
      wt('balance through opposition', 300, 860, 42, w('C6', 'balance'), w('C6', 'opposition'), { color: P.plum });
    }, phA);
    // C7 Intelligence Squared
    if (t > c('C7') - 0.2 && t < c('C8') + 0.4) {
      const out = fadeOut(c('C8') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        txt('Intelligence Squared debates', 960, 140, 62, { color: P.blue });
        const sw = eIO(prog(t, w('C7', 'third'), w('C7', 'switches sides')));
        [['before', 0.55], ['after', 0.55 - 0.33 * sw * 0.5]].forEach(([lab, f], i) => {
          const y = 380 + i * 200;
          txt(lab, 420, y, 50, { alpha: fadeIn(w('C7', i ? 'after' : 'before')), align: 'right' });
          rect(480, y - 50, 1000, 100, 1, { strokeWidth: 3 });
          rect(480, y - 50, 1000 * f, 100, 1, { fill: P.teal, fillStyle: 'solid', stroke: 'none', fillAlpha: fadeIn(w('C7', i ? 'after' : 'before')) });
          rect(480 + 1000 * f, y - 50, 1000 * (1 - f), 100, 1, { fill: P.red, fillStyle: 'solid', stroke: 'none', fillAlpha: fadeIn(w('C7', i ? 'after' : 'before')) });
        });
        stamp('about 1 in 3 switch sides', 960, 760, 62, w('C7', 'switches sides'), { color: P.green });
        wt('no discussion needed, just watching', 960, 880, 48, w('C7', 'without'), w('C7', 'themselves'), { color: P.plum });
      }, out);
    } else KC += 200;
    // C8 recognizing competence
    if (t > c('C8') - 0.2) {
      person(620, 520, { s: 1.1 * popS(w('C8', 'doctor')), color: P.cream, mood: 0.6, k: 95, hair: HAIR_B });
      if (t > w('C8', 'doctor')) path('M 560 470 Q 620 560 680 470', 1, { strokeWidth: 4, stroke: P.grey }); else KC++;
      checkMark(800, 380, popS(w('C8', 'good doctor')), 1);
      txt('a good doctor', 620, 760, 50, { alpha: fadeIn(w('C8', 'good doctor')) });
      wt('you can recognize competence', 1320, 450, 56, w('C8', 'recognizing'), w('C8', 'themselves'));
      wt("you don't have", 1320, 530, 56, w('C8', "don't have"), w('C8', 'themselves', 0.3));
      stamp('no medical school required', 1320, 720, 54, w('C8', 'medical school'), { color: P.blue });
    } else KC += 200;
  }

  // F1
  function sFilter() {
    const t = T;
    grp(520, 500, popS(w('F1', 'pass a test')), -0.06, () => {
      rect(-200, -260, 400, 520, 1, { fill: P.cream, fillStyle: 'solid' });
      txt('VOTER TEST', 0, -200, 50, { font: PRINT });
      for (let i = 0; i < 6; i++) { rect(-160, -130 + i * 60, 26, 26, 1, { strokeWidth: 2 }); line(-110, -117 + i * 60, 150 - (i % 3) * 30, -117 + i * 60, 1, { strokeWidth: 2 }); }
    });
    person(880, 380, { s: 0.7 * popS(w('F1', 'whoever writes')), color: P.ink, hat: 'top', arms: 'give', mood: 0.5, k: 99 });
    wt('whoever writes it controls it', 520, 860, 52, w('F1', 'whoever writes'), w('F1', 'outcome'), { color: P.red });
    stamp('literacy tests', 1400, 300, 70, w('F1', 'literacy tests'), { color: P.red, rot: 0.04 });
    wt('a tool for keeping people from voting', 1400, 420, 46, w('F1', 'tool'), w('F1', 'voting'), { font: PRINT });
    grp(1400, 700, popS(w('F1', 'Randomness')), Math.sin(t * 3) * 0.1, () => {
      rect(-90, -90, 180, 180, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4 });
      [[-45, -45], [45, 45], [0, 0], [45, -45], [-45, 45]].forEach(([x, y]) => dot(x, y, 14));
    });
    stamp("randomness can't be rigged", 1400, 920, 60, w('F1', 'nobody can rig'), { color: P.green });
  }

  // R1-R6: history
  function sHistory() {
    const t = T;
    const ty = 360;
    line(140, ty, 1780, ty, eOut(prog(t, c('R1') - 0.3, w('R1', 'Athens'))), { strokeWidth: 5 });
    const nodes = [
      [270, 'Athens', '5th c. BC', w('R1', 'Athens'), (s) => temple(0, -170, s * 0.55, 1)],
      [630, 'Venice', '1268-1797', w('R2', 'Venice'), (s) => dome(0, -150, s * 0.7, 1)],
      [990, 'H.G. Wells', '1903', w('R3', '1903'), (s) => book(0, -130, s * 0.9, 1)],
      [1350, 'assemblies', 'Ireland, B.C.', w('R4', 'Modern'), (s) => crowd(0, -140, 3, 1, 70, 0.25 * s, (i) => PALETTE[i])],
      [1700, 'Georgia', 'today', w('R6', 'Georgia'), (s) => courthouse(0, -160, s * 0.5, 1)],
    ];
    nodes.forEach(([x, name, when, t0, fn]) => {
      const s = popS(t0);
      circ(x, ty, 34, s > 0 ? 1 : 0, { fill: P.red, fillStyle: 'solid' });
      grp(x, ty, 1, 0, () => fn(s));
      txt(name, x, ty + 70, 50, { alpha: fadeIn(t0) });
      txt(when, x, ty + 120, 38, { alpha: fadeIn(t0), font: PRINT, color: P.grey });
    });
    // quotes and notes beneath
    const q1 = fadeOut(c('R2') - 0.2, 0.4);
    wt('"lot is democratic; election is oligarchic"', 960, 680, 52, w('R1', 'Aristotle'), w('R1', 'oligarchic'), { alpha: q1, color: P.plum });
    txt('- Aristotle', 1300, 740, 40, { alpha: q1 * fadeIn(w('R1', 'oligarchic')), font: PRINT });
    const q2 = fadeOut(c('R3') - 0.2, 0.4) * fadeIn(w('R2', 'alternated'));
    txt('lottery, vote, lottery, vote... for 500 years', 960, 680, 50, { alpha: q2, color: P.teal });
    const q3 = fadeOut(c('R4') - 0.2, 0.4) * fadeIn(w('R3', 'jury method'));
    txt('"the only practicable line of improvement"', 960, 680, 50, { alpha: q3, color: P.plum });
    const q4 = fadeOut(c('R5') - 0.2, 0.4) * fadeIn(w('R4', 'advisory'));
    txt('but mostly advisory: easy to ignore', 960, 680, 52, { alpha: q4, color: P.red });
    if (t > c('R5') - 0.2) {
      const out = fadeOut(c('R6') - 0.2, 0.4);
      grp(560, 760, popS(w('R5', 'binding')), -0.02, () => {
        rect(-340, -110, 680, 220, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: P.green });
        txt('1. the choice is binding', 0, -30, 54, { color: P.green });
        txt('not advisory', 0, 40, 42, { font: PRINT });
      }, out);
      grp(1360, 760, popS(w('R5', 'only chooses')), 0.02, () => {
        rect(-360, -110, 720, 220, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: P.blue });
        txt("2. it chooses, it doesn't govern", 0, -30, 50, { color: P.blue });
        txt('weeks, not years: can be mandatory', 0, 40, 42, { font: PRINT, alpha: fadeIn(w('R5', 'weeks')) });
      }, out);
    } else KC += 100;
    if (t > c('R6') - 0.2) {
      txt('Georgia grand juries already appoint:', 960, 700, 52, { alpha: fadeIn(w('R6', 'Grand juries')) });
      [['election boards', 'election boards'], ['water authorities', 'water'], ['ethics boards', 'ethics']].forEach(([s, word], i) => {
        const t0 = w('R6', word);
        grp(480 + i * 480, 860, popS(t0), 0, () => { rect(-210, -60, 420, 120, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 }); txt(s, 0, 2, 48, { color: [P.blue, P.teal, P.red][i] }); });
      });
    } else KC += 60;
  }

  // D1-D3: a design
  function sDesign() {
    const t = T;
    const run = t > w('D1', 'chess clock');
    const a = run ? ((t - w('D1', 'chess clock')) * 0.08) % 1 : 0, b = run ? ((t - w('D1', 'chess clock')) * 0.05 + 0.3) % 1 : 0;
    chessClock(420, 330, 1.1 * popS(w('D1', 'chess clock')), a, b, 1);
    txt('equal time, spent however they like', 420, 520, 44, { alpha: fadeIn(w('D1', 'however')) });
    ['present', 'rebut', 'question'].forEach((s, i) => txt(s, 220 + i * 200, 600, 46, { alpha: fadeIn(w('D1', ['presenting', 'rebutting', 'questioning'][i])), color: [P.teal, P.red, P.gold][i] }));
    // D2 anonymous questions to all
    if (t > c('D2') - 0.2) {
      const cx = 1400, d2out = fadeOut(w('D3', 'score') - 0.4, 0.4);
      ctx.save(); ctx.globalAlpha *= 1;
      [0, 1, 2].forEach((i) => podium(cx - 280 + i * 280, 360, 0.6 * popS(c('D2') + i * 0.1), [P.teal, P.red, P.gold][i], 1));
      grp(cx, 760, popS(w('D2', 'anonymously')) * (d2out > 0.01 ? 1 : 0), 0, () => { rect(-100, -70, 200, 140, 1, { fill: P.cream, fillStyle: 'solid' }); txt('?', 0, 0, 100, { color: P.plum }); txt('anonymous', 0, 100, 36, { font: PRINT }); });
      if (d2out > 0.01) [0, 1, 2].forEach((i) => arrow(cx, 680, cx - 280 + i * 280, 470, prog(t, w('D2', 'every candidate'), w('D2', 'every candidate', 0.6)), { stroke: P.plum, strokeWidth: 4 })); else KC += 18;
      txt('every question goes to every candidate', cx, 960, 42, { alpha: fadeIn(w('D2', 'every candidate')) * d2out, font: PRINT });
      ctx.restore();
    } else KC += 200;
    // D3 referee + score ballot
    if (t > c('D3') - 0.2) {
      const out = 1;
      person(420, 820, { s: 0.7 * popS(w('D3', 'referee')), color: P.cream, mood: 0.2, k: 120, hat: 'cap' });
      for (let i = 0; i < 4; i++) line(380, 780 + i * 18, 460, 780 + i * 18, popS(w('D3', 'referee')) > 0 ? 1 : 0, { strokeWidth: 5 });
      txt('referee: rules only', 420, 1000, 42, { alpha: fadeIn(w('D3', 'rules')), color: P.grey });
      void out;
    } else KC += 30;
  }
  function sScore() {
    // D3 second half: score ballot, kept separate so it can take the whole right side
    const t = T;
    if (t < w('D3', 'score') - 0.3) { KC += 200; return; }
    const cands = [['Ana', 5], ['Ben', 2], ['Cy', 4]];
    grp(1400, 760, popS(w('D3', 'score')), 0, () => {
      rect(-320, -200, 640, 400, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
      txt('secret ballot: score 0-5', 0, -150, 40, { font: PRINT });
      cands.forEach(([n, sc], i) => {
        const y = -70 + i * 90;
        txt(n, -240, y, 46, { align: 'left' });
        for (let k = 0; k <= 5; k++) { circ(-60 + k * 56, y, 36, 1, { strokeWidth: 2 }); if (k === sc && t > w('D3', 'zero to five') + i * 0.3) dot(-60 + k * 56, y, 12, P.blue); else KC++; txt(String(k), -60 + k * 56, y - 34, 22, { font: PRINT, color: P.grey }); }
      });
    });
    stamp('highest average wins', 1400, 1010, 50, w('D3', 'Highest'), { color: P.green });
  }

  // K1-K9: Henry County
  function sHenry() {
    const t = T;
    wt('Henry County, Georgia', 960, 90, 76, c('K1'), w('K1', 'Henry County', 0.6), { color: P.red });
    // K2: the 2021 law
    if (t < c('K3') + 0.4) {
      const out = fadeOut(c('K3') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        scroll(420, 400, popS(w('K2', 'law')), '2021 law', 1);
        seats(1250, 430, [P.green, P.green, P.green, P.green, P.green, P.grey, P.grey], { s: 0.85 * popS(w('K2', 'Five')), sp: 115 });
        txt('5 of 7 picked by the grand jury', 1250, 580, 48, { alpha: fadeIn(w('K2', 'grand jury')), color: P.green });
        bubble(960, 830, 760, 170, popS(w('K2', 'model')), '"a model for accountability"', 54, { tail: -200 });
      }, out);
    } else KC += 300;
    // K3: the walkout
    if (t > c('K3') - 0.2 && t < c('K4') + 0.4) {
      const out = fadeOut(c('K4') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        rect(160, 220, 560, 90, popS(w('K3', 'board')) > 0 ? 1 : 0, { fill: '#c99a62', fillStyle: 'solid' });
        txt('ethics board', 440, 265, 42, { alpha: fadeIn(w('K3', 'board')) });
        stamp('9 subpoenas', 440, 380, 50, w('K3', 'nine'), { color: P.blue });
        const walk = eIO(prog(t, w('K3', 'walked out'), ce('K3', 0.6)));
        crowd(700 + walk * 1100, 680, 3, 3, 110, 0.38 * popS(w('K3', 'employees')), (i) => P.grey, (i) => 1 - walk * 0.8, () => ({ lean: walk > 0 ? 0.1 : 0 }));
        txt('county employees', 700, 940, 44, { alpha: fadeIn(w('K3', 'employees')) * (1 - walk) });
        bubble(1340, 300, 760, 220, popS(w('K3', 'announced')), null, 40, { tail: -260, inner: () => { txt('"the chair of the commission', 0, -35, 40); txt('asked that they not testify"', 0, 25, 40); } });
        stamp('all nine walked out', 1350, 980, 60, w('K3', 'walked out'));
      }, out);
    } else KC += 400;
    // K4: investigation of the chair
    if (t > c('K4') - 0.2 && t < c('K5') + 0.4) {
      const out = fadeOut(c('K5') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        person(640, 560, { s: 1.2 * popS(w('K4', 'chair')), color: P.ink, hat: 'top', mood: -0.3, k: 130 });
        txt('commission chair', 640, 820, 46, { alpha: fadeIn(w('K4', 'chair')) });
        magnifier(470, 440, popS(w('K4', 'investigation')), 1);
        bubble(1340, 440, 820, 260, popS(w('K4', 'response')), null, 40, { tail: -330, inner: () => { txt('"they can investigate all they want,', 0, -40, 40); txt('but I will not be answering"', 0, 25, 40); } });
      }, out);
    } else KC += 300;
    // K5: denials
    if (t > c('K5') - 0.2 && t < c('K6') + 0.4) {
      const out = fadeOut(c('K6') - 0.2, 0.4);
      const items = [['money for an attorney', 'money', (s) => { txt('$', 0, 0, 150, { color: P.green }); }], ['meeting room', 'barred', (s) => house(0, 20, 0.9, {})], ['cameras', 'cameras', (s) => camera(0, 0, 1, 1)]];
      items.forEach(([lab, word, fn], i) => {
        const x = 420 + i * 540, t0 = w('K5', word), s = popS(t0);
        grp(x, 500, s, 0, () => { rect(-200, -170, 400, 340, 1, { fill: P.cream, fillStyle: 'solid' }); fn(s); }, out);
        if (t > t0 + 0.5) xMark(x, 500, 1.2 * popS(t0 + 0.5), out); else KC += 2;
        txt(lab, x, 720, 46, { alpha: out * fadeIn(t0) });
      });
      txt('denied', 960, 860, 70, { color: P.red, alpha: out * fadeIn(w('K5', 'cameras', 0.5)) });
    } else KC += 300;
    // K6: the dismissed complaint
    if (t > c('K6') - 0.2 && t < c('K7') + 0.4) {
      const out = fadeOut(c('K7') - 0.2, 0.4);
      grp(0, 0, 1, 0, () => {
        txt('"political hit squad"?', 960, 220, 64, { alpha: fadeIn(w('K6', 'hit squad')), color: P.grey });
        txt('nepotism complaint vs. county manager', 960, 330, 48, { alpha: fadeIn(w('K6', 'nepotism')) });
        line(360, 560, 1560, 560, fadeIn(w('K6', 'checked')), { strokeWidth: 5 });
        calendar(460, 560, 0.8 * popS(w('K6', 'husband')), 'husband hired', '2004', 1, P.blue);
        calendar(1460, 560, 0.8 * popS(w('K6', 'thirteen')), 'she became mgr', '2017', 1, P.plum);
        txt('13 years earlier', 960, 520, 50, { alpha: fadeIn(w('K6', 'thirteen')), color: P.blue });
        stamp('dismissed unanimously', 960, 820, 66, w('K6', 'dismissed'), { color: P.green });
        txt('followed the evidence', 960, 940, 46, { alpha: fadeIn(w('K6', 'unanimously')), color: P.green });
      }, out);
    } else KC += 300;
    // K7-K9: the bill
    if (t > c('K7') - 0.2) {
      const k8 = t > c('K8') - 0.2;
      scroll(330, 360, 0.95 * popS(w('K7', 'bill')), 'SB 359', 1);
      txt('same sponsor', 330, 520, 42, { alpha: fadeIn(w('K7', 'same senator')), font: PRINT });
      [['House 161-3', w('K7', 'both chambers')], ['Senate 44-6', w('K7', 'overwhelmingly')], ['signed May 2026', w('K7', 'signed')]].forEach(([s, t0], i) => stamp(s, 330, 620 + i * 110, 44, t0, { color: [P.blue, P.blue, P.red][i], rot: (i - 1) * 0.04 }));
      if (k8) {
        seats(1200, 380, [P.ink, P.ink, P.ink, P.ink, P.ink], { s: 0.85 * popS(w('K8', 'five seats')), sp: 150, labels: ['clerk', 'probate judge', 'sheriff', 'tax comm.', 'solicitor'], lsize: 28 });
        stamp('grand jury: 0 of 5', 1200, 210, 56, w('K8', 'simply gone'));
        wt('all appointed by elected officials', 1200, 560, 46, w('K8', 'elected county'), w('K8', 'officials'));
        grp(1200, 720, popS(w('K8', 'barred')), 0, () => {
          rect(-430, -70, 860, 140, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: P.red });
          txt('"shall not accept or hear complaints', 0, -22, 40); txt('against county employees"', 0, 28, 40);
        });
        txt('the kind of case that started all this', 1200, 840, 42, { alpha: fadeIn(w('K8', 'very kind')), color: P.plum });
      } else KC += 300;
      if (t > c('K9') - 0.2) calendar(1200, 960, 0.7 * popS(w('K9', 'January')), 'Jan 1, 2027', 'replaced', 1, P.red); else KC += 10;
    } else KC += 500;
  }

  // E1-E3
  function sEnd() {
    const t = T;
    const out = fadeOut(c('E3') - 0.2, 0.4);
    grp(0, 0, 1, 0, () => {
      crowd(960, 420, 5, 1, 200, 0.75 * popS(c('E1')), (i) => [P.green, P.green, P.green, P.green, P.green][i], null, () => ({ arms: t > w('E1', 'did their job') ? 'up' : 'down', mood: 0.7 }));
      wt('owed nothing to anyone', 960, 180, 70, w('E1', 'owed nothing'), w('E1', 'anyone', 0.3), { color: P.blue });
      wt('so they did their job', 960, 700, 60, w('E1', 'did their job'), w('E1', 'job,', 0.3));
      stamp("independence wasn't a flaw. it was the design.", 960, 860, 54, w('E2', 'It was the design'), { color: P.green });
      txt("and it's why it was taken away", 960, 980, 50, { alpha: fadeIn(w('E2', 'taken away')), color: P.red });
    }, out);
    if (t > c('E3') - 0.2) {
      wt('election by jury', 960, 200, 130, c('E3'), w('E3', 'alignment'), { color: P.red });
      [['alignment', 'through randomness', w('E3', 'alignment'), P.teal], ['competence', 'through deliberation', w('E3', 'competence'), P.blue], ['accountable', 'to the public', w('E3', 'answer to the public'), P.green]].forEach(([a, b, t0, col], i) => {
        grp(400 + i * 560, 520, popS(t0), 0, () => {
          rect(-240, -110, 480, 220, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 4, stroke: col });
          txt(a, 0, -35, 60, { color: col });
          txt(b, 0, 40, 44, { font: PRINT });
        });
      });
      const ep = fadeIn(ce('E3', 1.0), 0.8);
      txt('electionbyjury.org', 960, 850, 70, { alpha: ep, color: P.teal });
      txt('read the manifesto and the Henry County story', 960, 940, 42, { alpha: ep, font: PRINT });
    } else KC += 200;
  }

  // ---------- assembly ----------
  function buildScenes() {
    SCN = [
      { start: 0, draw: sTitle },
      { start: c('H1') - 0.7, draw: sHook },
      { start: c('P1') - 0.7, draw: sPillars },
      { start: c('A1') - 0.7, draw: sAlign },
      { start: c('A5b') - 0.7, draw: sVSE },
      { start: c('S1') - 0.7, draw: sSecurity },
      { start: c('C1') - 0.7, draw: sInfo },
      { start: c('C4') - 0.7, draw: sRoom },
      { start: c('F1') - 0.7, draw: sFilter },
      { start: c('R1') - 0.7, draw: sHistory },
      { start: c('D1') - 0.7, draw: () => { sDesign(); sScore(); } },
      { start: c('K1') - 0.7, draw: sHenry },
      { start: c('E1') - 0.7, draw: sEnd },
    ];
    const E = [];
    const ev = (name, t, dur) => E.push({ name, t, dur });
    const at = (id, word, name, extra = 0) => ev(name, w(id, word, extra));
    SCN.slice(1).forEach((s) => ev('whoosh', s.start - 0.05));
    ev('stamp', 0.3); ev('scribble', 0.6, 1.0); ev('sparkle', 1.6); ev('scribble', 1.8, 1.0); ev('pop', 2.2);
    // hook
    ev('stamp', c('H1')); at('H1', 'county', 'pop'); at('H1', 'jury', 'pop2'); at('H1', 'randomly', 'sparkle'); at('H1', 'pick most', 'pop');
    at('H2', 'Four', 'stamp'); at('H2', 'investigated', 'pop2'); at('H2', 'most powerful', 'pop'); at('H3', 'election by jury', 'stamp'); at('H3', 'election by jury', 'sparkle', 0.1);
    // pillars
    at('P1', 'two things', 'pop'); ev('pop2', c('P2')); ev('pop2', c('P3')); at('P4', 'Mass', 'pop'); at('P4', 'struggle', 'boing'); at('P4', 'both', 'stamp');
    // align
    ev('pop', c('A1')); at('A1', 'show up', 'pop2'); ['older', 'wealthier', 'partisan'].forEach((x) => at('A1', x, 'tick'));
    at('A2', 'Candidates', 'pop'); at('A2', 'donors', 'chaching'); at('A2', 'never run', 'sad');
    at('A3', 'Draw', 'pop'); at('A3', 'random', 'whoosh'); for (let j = 0; j < 8; j++) ev('tick', w('A3', 'random', j * 0.12 + 0.7));
    at('A4', 'mirror', 'sparkle'); at('A4', 'Nobody chose', 'stamp');
    at('A5', 'twenty-three', 'pop'); at('A5', 'sixteen', 'pop2'); at('A5', 'ninety percent', 'slide'); at('A5', 'ninety percent', 'ding', 1.0);
    ev('pop', c('A5b')); at('A5b', 'Ogren', 'scribble'); at('A5b', 'score voting', 'slide'); at('A5b', 'twenty-four', 'pop'); at('A5b', 'ninety-six', 'pop'); at('A5b', 'ninety-nine', 'ding');
    // security
    ev('pop', c('S1')); at('S1', 'briber', 'pop2'); at('S1', 'reach', 'coin');
    at('S2', 'five percent', 'tick'); at('S2', 'fourteen', 'slide'); at('S2', 'more likely', 'slide', 0.6); at('S2', 'Thirty', 'slide');
    at('S3', 'secret ballot', 'pop'); at('S3', 'cube root', 'pop2'); at('S3', 'twenty jurors', 'tick'); at('S3', 'six hundred', 'ding');
    // info
    ev('pop', c('C1')); at('C1', 'rewards', 'scribble'); ev('pop2', c('C2')); at('C2', 'imagine', 'slide'); at('C2', 'actually', 'slide'); at('C2', 'actually', 'stamp', 0.6);
    at('C3', 'AI', 'pop'); for (let i = 0; i < 3; i++) ev('pop2', w('C3', 'cheap', i * 0.2)); at('C3', 'foreign', 'sad');
    // room
    ev('pop', c('C4')); at('C4', 'paid', 'chaching'); ev('pop2', c('C5')); at('C5', 'Money', 'stamp');
    at('C6', 'cross-examine', 'whoosh'); at('C6', 'jury hears', 'pop'); at('C6', 'omni-biased', 'stamp'); at('C6', 'omni-biased', 'sparkle', 0.1);
    ev('pop', c('C7')); at('C7', 'switches sides', 'slide'); at('C7', 'switches sides', 'stamp', 0.3);
    at('C8', 'doctor', 'pop'); at('C8', 'good doctor', 'ding'); at('C8', 'medical school', 'stamp');
    // filter
    at('F1', 'pass a test', 'pop'); at('F1', 'whoever writes', 'pop2'); at('F1', 'literacy tests', 'stamp'); at('F1', 'Randomness', 'boing'); at('F1', 'nobody can rig', 'stamp');
    // history
    at('R1', 'Athens', 'pop'); at('R1', 'Aristotle', 'scribble'); at('R2', 'Venice', 'pop'); at('R3', '1903', 'pop'); at('R4', 'Modern', 'pop'); at('R4', 'advisory', 'sad');
    at('R5', 'binding', 'stamp'); at('R5', 'only chooses', 'pop2'); at('R6', 'Georgia', 'pop'); ['election boards', 'water', 'ethics'].forEach((x) => at('R6', x, 'pop2'));
    // design
    at('D1', 'chess clock', 'pop'); at('D1', 'chess clock', 'tick', 0.5); ['presenting', 'rebutting', 'questioning'].forEach((x) => at('D1', x, 'tick'));
    ev('pop2', c('D2')); at('D2', 'anonymously', 'pop'); at('D2', 'every candidate', 'whoosh');
    at('D3', 'referee', 'pop'); at('D3', 'score', 'pop2'); for (let i = 0; i < 3; i++) ev('tick', w('D3', 'zero to five', i * 0.3)); at('D3', 'Highest', 'stamp'); at('D3', 'Highest', 'ding', 0.2);
    // henry
    ev('scribble', c('K1'), 1.0); at('K2', 'law', 'pop'); at('K2', 'Five', 'pop2'); at('K2', 'model', 'pop');
    at('K3', 'board', 'pop'); at('K3', 'nine', 'stamp'); at('K3', 'announced', 'pop2'); at('K3', 'walked out', 'stamp'); at('K3', 'walked out', 'whoosh', 0.3);
    at('K4', 'chair', 'pop'); at('K4', 'investigation', 'pop2'); at('K4', 'response', 'pop');
    ['money', 'barred', 'cameras'].forEach((x) => { at('K5', x, 'pop'); at('K5', x, 'stamp', 0.5); });
    at('K6', 'hit squad', 'tick'); at('K6', 'husband', 'pop'); at('K6', 'thirteen', 'pop'); at('K6', 'dismissed', 'stamp'); at('K6', 'unanimously', 'ding');
    at('K7', 'bill', 'pop'); at('K7', 'both chambers', 'stamp'); at('K7', 'overwhelmingly', 'stamp'); at('K7', 'signed', 'stamp');
    at('K8', 'simply gone', 'stamp'); at('K8', 'five seats', 'pop'); at('K8', 'barred', 'pop2'); at('K8', 'barred', 'sad', 0.3); at('K9', 'January', 'stamp');
    // end
    ev('pop', c('E1')); at('E1', 'did their job', 'ding'); at('E2', 'It was the design', 'stamp'); at('E2', 'taken away', 'sad');
    ev('scribble', c('E3'), 1.0); ['alignment', 'competence', 'answer to the public'].forEach((x) => at('E3', x, 'pop2')); ev('sparkle', ce('E3', 1.0));
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
