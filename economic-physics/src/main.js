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
  // Moments that should land on a specific spoken word (used once real narration timings exist).
  const WORD_CUES = {
    'L2:0': 'Grow', 'L2:0.02': 'Grow', 'L2:0.42': 'share', 'L2:0.5': 'share', 'L2:0.55': 'share',
    'L4:0.25': 'a thousand', 'L4:0.32': 'to two', 'L4:0.36': 'two thousand', 'L4:0.47': 'or from',
    'L4:0.7': 'a million', 'L4:0.74': 'to two million', 'L4:0.78': 'two million', 'L4:0.9': 'million.',
    'L5:0.02': 'Alice', 'L5:0.08': 'Bob', 'L5:0.4': 'Now give', 'L5:0.42': 'one thousand', 'L5:0.5': 'nineteen', 'L5:0.8': 'Twice',
    'L5b:0.6': 'growing', 'L5b:0.72': 'sharing', 'L5b:0.75': 'sharing', 'L5b:0.82': 'at the same', 'L5b:0.9': 'same time',
    'L7:0.02': 'Steep', 'L7:0.15': 'Rent', 'L7:0.29': 'Minimum', 'L7:0.43': 'Food', 'L7:0.62': 'Each one', 'L7:0.65': 'shrinks',
    'L8:0.0': 'Economists', 'L8:0.05': 'lost value', 'L8:0.18': 'deadweight', 'L8:0.38': 'simply', 'L8:0.6': 'simply',
    'L9:0.0': 'So the', 'L9:0.1': 'gamble', 'L9:0.25': 'Will', 'L9:0.72': 'Maybe.', 'L9:0.85': 'Maybe not',
    'L10:0.55': 'Call it', 'L10:0.85': 'fallacy',
    'L11:0.12': 'gift card', 'L11:0.13': 'gift card', 'L11:0.35': "you'd only", 'L11:0.36': "you'd only", 'L11:0.5': 'seventy',
    'L11:0.62': 'Thirty', 'L11:0.66': 'Thirty', 'L11:0.7': 'went up', 'L11:0.72': 'went up', 'L11:0.86': 'smoke',
    'L12:0.13': 'Food stamps', 'L12:0.3': 'Housing', 'L12:0.48': 'Free public', 'L12:0.6': 'paid for', 'L12:0.78': 'public library',
    'L13:0.15': 'gift card', 'L13:0.2': 'gift card', 'L13:0.5': 'funded', 'L13:0.62': 'tax on', 'L13:0.9': 'happened',
    'L14:0.25': 'theorem for', 'L14:0.55': 'the second', 'L14:0.6': 'the second',
    'L15:0.1': 'A little', 'L15:0.55': 'You can', 'L15:0.75': 'shrinking', 'L15:0.8': 'shrinking',
    'L16:0.05': 'Tax things', 'L16:0.45': 'hand people', 'L16:0.72': 'let markets',
    'L16b:0.68': 'Nearly', 'L16b:0.75': 'Cash.',
    'L17:0.5': 'Nobody', 'L18:0.4': 'Taxing', 'L18:0.5': 'grows', 'L19:0.4': 'Add one', 'L19:0.5': 'No brackets',
    'L20:0.3': 'split', 'L20:0.4': 'split', 'L20:0.75': 'same check', 'L20:0.9': 'check',
    'L21:0.2': 'Earn twelve', 'L21:0.3': 'seventeen', 'L21:0.33': 'take home', 'L21:0.38': 'two hundred', 'L21:0.43': 'Earn a million',
    'L21:0.52': 'pay thirty', 'L21:0.55': 'thirty-nine', 'L21:0.62': 'percent. As', 'L21:0.6': 'As progressive', 'L21:0.64': 'As progressive',
    'L21:0.72': 'bracket system', 'L21:0.9': 'no brackets',
    'L22:0.25': 'how much', 'L22:0.55': 'Whatever', 'L22:0.8': 'cash delivers',
    'L23:0.35': 'Taxpayers', 'L23:0.4': 'Taxpayers', 'L23:0.72': 'At the same',
    'L24:0.2': 'welfare', 'L24:0.5': 'Just', 'L24:0.55': 'Just', 'L24:0.6': 'Just give', 'L24:0.62': 'Just give', 'L24:0.7': 'money',
  };
  // cue: fraction f through a line. With word timings, f means "f of the way through the
  // text", mapped to when that character is actually spoken.
  const c = (id, f = 0) => {
    const L = TL.lines[id];
    const w = WORD_CUES[id + ':' + f];
    if (w && L.chars) {
      const txt = L.say || L.text, i = txt.indexOf(w);
      if (i >= 0) return L.start + L.chars[i];
      console.warn('word cue not found', id, w);
    }
    if (!L.chars || f <= 0) return L.start + f * L.dur;
    if (f >= 1) return L.end;
    return L.start + L.chars[Math.min(L.chars.length - 1, Math.floor(f * L.chars.length))];
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

  function sTug() {
    const t = T, s0 = c('L1');
    const tug = t > c('L1', 0.45) ? Math.sin((t - c('L1', 0.45)) * 3.1) * 26 : 0;
    const pS = popS(s0 + 0.05);
    // rope
    if (t > c('L1', 0.3)) {
      const pr = eOut(prog(t, c('L1', 0.3), c('L1', 0.5)));
      curveP([[430 + tug, 660], [700 + tug, 672], [960 + tug, 660], [1220 + tug, 672], [1490 + tug, 660]], pr, { strokeWidth: 6, stroke: '#8a6a3a' });
    } else KC += 2;
    grp(960 + tug, 520, pS, 0, () => pie(0, 0, 150, { slices: t > c('L2', 0.5) ? 6 : 0, sliceP: eOut(prog(t, c('L2', 0.5), c('L2', 0.85))) }));
    if (t > c('L2', 0.0)) {
      const g = 1 + 0.06 * Math.sin(t * 6);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39; grp(960 + tug, 520, g, 0, () => arrow(Math.cos(a) * 180, Math.sin(a) * 180, Math.cos(a) * 245, Math.sin(a) * 245, prog(t, c('L2', 0.02), c('L2', 0.25)), { stroke: P.teal, strokeWidth: 5, head: 18 })); }
    } else KC += 160;
    person(330 + tug, 700, { s: 1.15 * popS(c('L1', 0.12)), color: P.teal, arms: 'pull', lean: -0.12, mood: 0.2, k: 1, hair: HAIR_B });
    person(1590 + tug, 700, { s: 1.15 * popS(c('L1', 0.22)), color: P.red, arms: 'pull', lean: 0.12, mood: 0.2, k: 2, skin: P.skin[2], hair: HAIR_A });
    wt('GROW the pie', 360, 340, 84, c('L2', 0.0), c('L2', 0.35), { color: P.teal });
    wt('SHARE the pie', 1560, 340, 84, c('L2', 0.42), c('L2', 0.8), { color: P.red });
  }

  function sUtility() {
    const t = T;
    // ---- phase 1: the curve (L3-L4)
    const a1 = fadeOut(c('L5') - 0.1, 0.5);
    grp(0, -260 * eIO(prog(t, c('L5') - 0.1, c('L5') + 0.5)), 1, 0, () => {
      const ox = 200, oy = 880, w = 860, h = 560;
      arrow(ox, oy, ox + w + 30, oy, eOut(prog(t, c('L3') - 0.3, c('L3', 0.15))), { strokeWidth: 4 });
      arrow(ox, oy, ox, oy - h - 30, eOut(prog(t, c('L3') - 0.3, c('L3', 0.15))), { strokeWidth: 4 });
      wt('money', ox + w - 60, oy + 50, 50, c('L3', 0.1), c('L3', 0.25));
      wt('happiness', ox + 10, oy - h - 70, 50, c('L3', 0.12), c('L3', 0.3), { align: 'left' });
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([ox + u * w, oy - h * Math.log2(1 + u * 15) / 4.0]); }
      curveP(pts, eIO(prog(t, c('L3', 0.15), c('L3', 0.6))), { stroke: P.blue, strokeWidth: 6 });
      // first dollar vs last dollar
      const fy = (u) => oy - h * Math.log2(1 + u * 15) / 4.0;
      const pA = prog(t, c('L3', 0.62), c('L3', 0.8)), pB = prog(t, c('L3', 0.78), c('L3', 0.95));
      line(ox + 25, fy(0.03), ox + 25, fy(0.1), pA, { stroke: P.green, strokeWidth: 8 });
      txt('+ a lot', ox + 110, fy(0.07) + 10, 44, { p: pA, color: P.green });
      line(ox + w - 60, fy(0.88) + 4, ox + w - 60, fy(0.96) - 2, pB, { stroke: P.red, strokeWidth: 8 });
      txt('+ a little', ox + w - 70, fy(0.92) + 60, 44, { p: pB, color: P.red });
      // doubling ladder
      const x0 = 1170;
      wt('$1,000', x0 + 70, 420, 64, c('L4', 0.25), c('L4', 0.35));
      arrow(x0 + 170, 420, x0 + 270, 420, prog(t, c('L4', 0.32), c('L4', 0.4)), { strokeWidth: 4 });
      wt('$2,000', x0 + 370, 420, 64, c('L4', 0.36), c('L4', 0.45));
      stamp('+1', x0 + 540, 420, 58, c('L4', 0.47), { color: P.green, rot: 0.05 });
      wt('$1M', x0 + 70, 580, 64, c('L4', 0.7), c('L4', 0.76));
      arrow(x0 + 170, 580, x0 + 270, 580, prog(t, c('L4', 0.74), c('L4', 0.8)), { strokeWidth: 4 });
      wt('$2M', x0 + 370, 580, 64, c('L4', 0.78), c('L4', 0.84));
      stamp('+1', x0 + 540, 580, 58, c('L4', 0.9), { color: P.green, rot: -0.05 });
      wt('every doubling feels the same', x0 + 300, 740, 54, c('L4', 0.92), ce('L4', 0.6), { color: P.blue });
    }, a1);

    // ---- phase 2: Alice & Bob (L5)
    if (t > c('L5') - 0.2) {
      const out = fadeOut(c('L5b') - 0.2, 0.6);
      const sh = eIO(prog(t, c('L5b') - 0.2, c('L5b') + 0.5));
      const flip = prog(t, c('L5', 0.42), c('L5', 0.52));
      const ap = popS(c('L5', 0.02)), bp = popS(c('L5', 0.08));
      const bx = lerp(700, 330, sh), ax = lerp(1220, 760, sh), sc = lerp(1, 0.7, sh), yy = lerp(560, 600, sh);
      person(bx, yy, { s: sc * bp, color: P.plum, mood: lerp(0.5, -0.7, flip), k: 3, label: 'Bob', skin: P.skin[1], hair: HAIR_A });
      person(ax, yy, { s: sc * ap, color: P.teal, mood: lerp(0.5, 0.8, flip), k: 4, label: 'Alice', hat: 'bow', skin: P.skin[3], hair: HAIR_B });
      const bs = lerp(0.8, 0.45, eOut(flip)), as = lerp(0.8, 1.35, eOut(flip));
      bag(bx + 170 * sc, yy + 70 * sc, bs * sc * bp, null, {});
      bag(ax + 190 * sc, yy + 70 * sc, as * sc * ap, null, {});
      txt(flip < 0.5 ? '$5,000' : '$1,000', bx + 170 * sc, yy + (120 + 40) * sc, 50, { alpha: bp, color: flip < 0.5 ? P.ink : P.red });
      txt(flip < 0.5 ? '$5,000' : '$19,000', ax + 190 * sc, yy + (120 + 40 + 40 * flip) * sc, 50, { alpha: ap });
      // scoreboard
      grp(lerp(960, 545, sh), lerp(150, 175, sh), lerp(1, 0.75, sh), 0, () => {
        rect(-330, -80, 660, 160, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
        txt('total money', -170, -40, 40, { font: PRINT });
        txt('total happiness', 160, -40, 40, { font: PRINT });
        txt(flip < 0.5 ? '$10k' : '$20k', -170, 22, 70, { color: flip < 0.5 ? P.ink : P.green });
        txt(flip < 0.5 ? '24.6' : '24.2', 160, 22, 70, { color: flip < 0.5 ? P.ink : P.red });
        if (flip >= 0.5) { arrow(-80, 30, -80, -10, 1, { stroke: P.green, strokeWidth: 5, head: 16 }); arrow(270, -10, 270, 30, 1, { stroke: P.red, strokeWidth: 5, head: 16 }); }
        else KC += 12;
      }, popS(c('L5', 0.1)));
      stamp('2x the money, LESS happiness', 960, 960, 58, c('L5', 0.8), { alpha: fadeOut(c('L5b') - 0.3, 0.4) });
      // the poke: unsure smile flash when bag flips
      if (flip > 0 && flip < 1) smoke(bx + 170, yy + 40, c('L5', 0.42), 3, 0.5); else KC += 6;
      ctx.globalAlpha = 1;
      void out;
    } else KC += 300;

    // ---- phase 3: Schöntrup index (L5b)
    if (t > c('L5b') - 0.2) {
      const x0 = 1300;
      grp(x0, 300, popS(c('L5b', 0.0)), 0, () => {
        rect(-430, -110, 860, 220, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3.5 });
        txt('the Schöntrup index', 0, -55, 64, { color: P.plum });
        ctx.font = `400 54px ${PRINT}`;
        const a = '= average of log', b = '(each income)', wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, ws = 26, x0 = -(wa + ws + wb) / 2;
        txt(a, x0, 35, 54, { font: PRINT, align: 'left' });
        txt('2', x0 + wa + 2, 58, 30, { font: PRINT, align: 'left' });
        txt(b, x0 + wa + ws, 35, 54, { font: PRINT, align: 'left' });
      });
      // two arrows feeding one gauge
      const gp = prog(t, c('L5b', 0.6), c('L5b', 0.75));
      wt('grow the pie', x0 - 250, 560, 56, c('L5b', 0.6), c('L5b', 0.7), { color: P.teal });
      wt('share the pie', x0 + 250, 560, 56, c('L5b', 0.72), c('L5b', 0.82), { color: P.red });
      arrow(x0 - 250, 600, x0 - 70, 720, gp, { stroke: P.teal, strokeWidth: 5 });
      arrow(x0 + 250, 600, x0 + 70, 720, prog(t, c('L5b', 0.75), c('L5b', 0.85)), { stroke: P.red, strokeWidth: 5 });
      // thermometer
      const lvl = eOut(prog(t, c('L5b', 0.82), ce('L5b', 0.4)));
      grp(x0, 860, popS(c('L5b', 0.55)), 0, () => {
        rect(-24, -110, 48, 170, 1, { strokeWidth: 3.5 });
        rect(-14, 60 - 40 - 110 * lvl, 28, 40 + 110 * lvl, 1, { fill: P.red, fillStyle: 'solid', stroke: 'none' });
        circ(0, 80, 70, 1, { fill: P.red, fillStyle: 'solid' });
      });
      stamp('both count!', x0 + 230, 880, 52, c('L5b', 0.9), { color: P.green, rot: 0.06 });
    } else KC += 200;
  }

  function sTools() {
    const t = T;
    const pr = 110 * (1 - 0.06 * [0.04, 0.17, 0.3, 0.45].filter((f) => t > c('L7', f) + 0.25).length * (t > c('L7', 0.6) ? 1 : 0.5));
    const pieOut = fadeOut(c('L9') - 0.2, 0.5);
    // toolbox header
    grp(960, 170, popS(c('L6', 0.45)), 0, () => {
      rect(-260, -50, 520, 100, 1, { fill: P.red, hachureGap: 10 });
      path('M -70 -50 L -70 -84 L 70 -84 L 70 -50', 1, { strokeWidth: 6 });
      rect(-220, -28, 440, 56, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.4 });
      txt('the usual toolbox', 0, 0, 46);
    }, pieOut);
    // pie top right
    const miss = prog(t, c('L8', 0.0), c('L8', 0.25)) * 0.14;
    grp(1650, 230, popS(c('L6', 0.05)), 0, () => {
      pie(0, 0, pr, { slices: 0, missing: miss });
      txt('the pie', 0, pr + 50, 46);
    }, pieOut);
    // breaking-off wedge -> smoke
    if (t > c('L8', 0.0) && t < c('L9')) {
      const u = prog(t, c('L8', 0.05), c('L8', 0.45));
      const wx = 1650 + 70 * u - 60, wy = 230 - 200 * eOut(u) - 60;
      grp(wx, wy, 1 - u * 0.6, u * 1.5, () => draw('arc', [0, 0, 200, 200, -Math.PI / 2, -Math.PI / 2 + 0.14 * Math.PI * 2, true], 1, { fill: P.gold, hachureGap: 8 }, 300), 1 - prog(t, c('L8', 0.35), c('L8', 0.5)));
      if (t > c('L8', 0.38)) smoke(1610, 20, c('L8', 0.38), 6, 0.9); else KC += 12;
      wt('deadweight loss', 1180, 330, 66, c('L8', 0.18), c('L8', 0.4), { color: P.red });
      wt('value that just... vanishes', 1180, 395, 44, c('L8', 0.6), c('L8', 0.85), { font: PRINT });
    } else KC += 120;
    // four tools
    const toolsOut = fadeOut(c('L9') - 0.2, 0.5);
    const tools = [
      ['steep brackets', 0.02, (x, y, s, a) => stairs(x, y + 20, s, a)],
      ['rent control', 0.15, (x, y, s, a) => house(x, y + 30, s * 0.95, { lock: true, alpha: a })],
      ['minimum wage', 0.29, (x, y, s, a) => floorSign(x, y + 20, s, a)],
      ['food stamps', 0.43, (x, y, s, a) => stampCard(x, y + 20, s, a)],
    ];
    tools.forEach(([name, f, fn], i) => {
      const x = 300 + i * 440, y = 590, s = popS(c('L7', f));
      const shake = t > c('L7', 0.62) && t < c('L7', 0.95) ? Math.sin(t * 30 + i) * 0.04 : 0;
      grp(x, y, 1, shake, () => fn(0, 0, s, toolsOut));
      txt(name, x, y + 210, 54, { alpha: toolsOut * (s > 0.5 ? 1 : 0) });
    });
    // seesaw gamble (L9)
    if (t > c('L9') - 0.3) {
      const sp = popS(c('L9', 0.0));
      const ang = Math.sin((t - c('L9')) * 2.2) * 0.16;
      grp(960, 700, sp, 0, () => {
        poly([[-70, 150], [0, 30], [70, 150]], 1, { fill: P.grey, hachureGap: 8 });
        grp(0, 30, 1, ang, () => {
          rect(-520, -16, 1040, 32, 1, { fill: '#c99a62', fillStyle: 'solid' });
          pie(-380, -150, 125, {});
          pie(380, -120, 95, { slices: 8 });
          txt('bigger pie', -380, -310, 58, { color: P.teal });
          txt('more sharing', 380, -250, 58, { color: P.red });
        });
      });
      wt('?', 960, 380, 120, c('L9', 0.25), c('L9', 0.3), { color: P.plum });
      stamp('maybe.', 520, 960, 64, c('L9', 0.72), { color: P.teal });
      stamp('maybe not.', 1400, 960, 64, c('L9', 0.85), { color: P.red, rot: 0.06 });
    } else KC += 200;
  }

  function sGiftCard() {
    const t = T;
    // L10 title, then shrinks to header
    const hp = eIO(prog(t, c('L11') - 0.3, c('L11') + 0.4));
    const hide = fadeOut(c('L12') - 0.2, 0.4);
    grp(960, lerp(560, 110, hp), lerp(1, 0.55, hp), 0, () => {
      wt('the gift card fallacy', 0, 0, 150, c('L10', 0.55), c('L10', 0.85), { color: P.red });
      line(-560, 90, 560, 90, eOut(prog(t, c('L10', 0.85), c('L10', 1))), { stroke: P.ink, strokeWidth: 6 });
    }, t < c('L13') - 0.2 ? 1 : fadeOut(c('L13') - 0.2, 0.4));
    if (t < c('L11')) giftCard(960, 300, 0.7 * popS(c('L10', 0.1)) * (1 - hp), { r: Math.sin(t * 2) * 0.05 }); else KC += 120;

    // L11: give the card, it's worth $70, $30 burns
    if (t > c('L11') - 0.2 && t < c('L12') + 0.4) {
      const al = hide;
      person(360, 620, { s: popS(c('L11', 0.02)), color: P.blue, arms: 'give', mood: 0.6, k: 5, label: 'me', alpha: al, hair: HAIR_B });
      person(1560, 620, { s: popS(c('L11', 0.08)), color: P.gold, arms: 'take', mood: lerp(0.6, -0.1, prog(t, c('L11', 0.35), c('L11', 0.5))), k: 6, label: 'you', alpha: al, skin: P.skin[2], hair: HAIR_A });
      const mv = eIO(prog(t, c('L11', 0.12), c('L11', 0.32)));
      const burn = prog(t, c('L11', 0.66), c('L11', 0.92)) * 0.3;
      giftCard(lerp(560, 1210, mv), lerp(560, 560, mv) - Math.sin(mv * Math.PI) * 140, 0.95, { burn, alpha: al, r: lerp(-0.1, 0.08, mv) });
      // thought bubble
      grp(1500, 300, popS(c('L11', 0.36)), 0, () => {
        ell(0, 0, 420, 170, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
        circ(40, 120, 36, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.5 }); circ(60, 165, 20, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 2.5 });
        txt('worth $70 to me', 0, 0, 56);
      }, al);
      if (t > c('L11', 0.7)) smoke(1290, 470, c('L11', 0.72), 7, 1.1); else KC += 14;
      stamp('$30 up in smoke', 900, 900, 66, c('L11', 0.86));
    } else KC += 400;

    // L12: the safety net is a stack of gift cards
    if (t > c('L12') - 0.2 && t < c('L13') + 0.5) {
      const out = fadeOut(c('L13') - 0.1, 0.4);
      const cards = [
        ['FOOD ONLY', 'food stamps', P.green, 0.13],
        ['RENT ONLY', 'housing vouchers', P.blue, 0.3],
        ['PARKING ONLY', 'free public parking', P.plum, 0.48],
        ['BOOKS ONLY', 'public library', P.gold, 0.78],
      ];
      // the safety net the cards land in
      grp(0, 0, 1, 0, () => {
        const np = eOut(prog(t, c('L12') - 0.1, c('L12', 0.1)));
        const sag = (x) => 640 + 110 * Math.sin(((x - 100) / 1720) * Math.PI);
        const top = []; for (let x = 100; x <= 1820; x += 86) top.push([x, sag(x)]);
        curveP(top, np, { strokeWidth: 5, stroke: '#8a6a3a' });
        curveP(top.map(([x, y]) => [x, y + 70]), np, { strokeWidth: 3, stroke: '#8a6a3a' });
        top.forEach(([x, y], i) => { if (i % 2 === 0) line(x, y, x + 43, sag(x + 43) + 70, np, { strokeWidth: 2, stroke: '#8a6a3a' }); else line(x, y + 70, x + 43, sag(x + 43), np, { strokeWidth: 2, stroke: '#8a6a3a' }); });
        line(100, 640, 60, 560, np, { strokeWidth: 4 }); line(1820, 640, 1860, 560, np, { strokeWidth: 4 });
        txt('the safety net', 960, 870, 60, { alpha: fadeIn(c('L12') - 0.1, 0.4) });
      }, out);
      cards.forEach(([tag, sub, col, f], i) => {
        const s = popS(c('L12', f), 0.5), x = 280 + i * 455, y = 470 + (i % 2 ? 40 : -10);
        giftCard(x, y, 0.95 * s, { tag, amount: '$100', color: col, sub: s > 0.5 ? sub : null, r: (i - 1.5) * 0.05 + Math.sin(t * 1.5 + i) * 0.03, alpha: out });
        if (t > c('L12', f) + 1.0) grp(x + 150, y - 120, 0.55, 0, () => flame(0, 0, 1), out); else KC += 6;
      });
      wt('paid for by everyone', 960, 960, 56, c('L12', 0.6), c('L12', 0.7), { color: P.plum, alpha: out });
    } else KC += 400;

    // L13: rent control = gift card + tax on one landlord
    if (t > c('L13') - 0.3) {
      house(300, 520, 1.1 * popS(c('L13', 0.0)), { lock: true });
      wt('rent control', 300, 300, 58, c('L13', 0.02), c('L13', 0.12), { color: P.red });
      wt('worth $3,000', 300, 680, 48, c('L13', 0.05), c('L13', 0.12));
      wt('charged $2,000', 300, 740, 48, c('L13', 0.08), c('L13', 0.16), { color: P.red });
      txt('=', 620, 520, 160, { alpha: fadeIn(c('L13', 0.12)) });
      person(880, 600, { s: 0.9 * popS(c('L13', 0.15)), color: P.teal, arms: 'up', mood: 0.9, k: 7, label: 'one tenant', skin: P.skin[4], hair: HAIR_B });
      giftCard(1060, 360, 0.6 * popS(c('L13', 0.2)), { tag: 'RENT ONLY', amount: '$1,000', color: P.green, r: 0.1 });
      txt('+', 1250, 520, 140, { alpha: fadeIn(c('L13', 0.5)) });
      person(1560, 600, { s: 0.9 * popS(c('L13', 0.5)), color: P.ink, hat: 'top', mood: -0.6, k: 8, label: 'one landlord', skin: P.skin[0] });
      stamp('-$1,000 tax', 1560, 300, 54, c('L13', 0.62));
      for (let i = 0; i < 4; i++) {
        const u = prog(t, c('L13', 0.62) + i * 0.15, c('L13', 0.62) + i * 0.15 + 0.6);
        if (u > 0 && u < 1) coin(lerp(1620, 1700 + i * 30, u), 560 - Math.sin(u * Math.PI) * 120 + u * 200, 20, 1 - u); else KC += 3;
      }
      stamp('why HIM?', 1560, 960, 60, c('L13', 0.9), { color: P.plum, rot: 0.05 });
    } else KC += 300;
  }

  function sTheorem() {
    const t = T;
    const up = eIO(prog(t, c('L15') - 0.3, c('L15') + 0.3));
    grp(lerp(960, 380, up), lerp(330, 120, up), lerp(1, 0.4, up), 0, () => bulb(0, 0, 1.4 * popS(c('L14', 0.1)), prog(t, c('L14', 0.25), c('L14', 0.4))));
    grp(lerp(960, 1060, up), lerp(700, 120, up), lerp(1, 0.6, up), 0, () => {
      wt('the second welfare theorem', 0, 0, 120, c('L14', 0.55), c('L14', 0.9), { color: P.blue });
    });
    // L15: dial any amount, pie stays same size
    if (t > c('L15') - 0.2 && t < c('L16') + 0.6) {
      const out = fadeOut(c('L16') - 0.15, 0.4);
      const v = 0.5 + Math.sin((t - c('L15', 0.1)) * 1.8) * 0.45 * (t > c('L15', 0.1) ? 1 : 0);
      grp(0, 0, 1, 0, () => {
        dial(560, 620, 230, v);
        txt('how much sharing?', 560, 840, 60);
      }, popS(c('L15', 0.05)) * out);
      grp(1380, 560, popS(c('L15', 0.55)), 0, () => {
        pie(0, 0, 170, { slices: 8 });
        arrow(-200, 230, 200, 230, 1, { strokeWidth: 3, head: 18 }); arrow(200, 230, -200, 230, 1, { strokeWidth: 3, head: 18 });
        txt('pie stays the same size', 0, 290, 54, { color: P.teal });
      }, out);
    } else KC += 300;
    // L16: three steps
    if (t > c('L16') - 0.2) {
      const up2 = eIO(prog(t, c('L16b') - 0.2, c('L16b') + 0.4));
      const steps = [
        ['1. tax what', "can't shrink", 0.05, (s) => land(0, 0, s, 1)],
        ['2. hand people', 'cash', 0.45, (s) => cash(0, 0, s * 0.8, 1)],
        ['3. let markets', 'do the rest', 0.72, (s) => stall(0, 0, s, 1)],
      ];
      steps.forEach(([a, b, f, fn], i) => {
        const x = 380 + i * 580, y = lerp(560, 400, up2), sc = lerp(1, 0.75, up2);
        grp(x, y, sc, 0, () => {
          fn(popS(c('L16', f)));
          txt(a, 0, 160, 60, { alpha: fadeIn(c('L16', f)) });
          txt(b, 0, 225, 60, { alpha: fadeIn(c('L16', f) + 0.1), color: [P.green, P.green, P.blue][i] });
        });
      });
      if (t > c('L16b') - 0.2) {
        grp(560, 870, popS(c('L16b', 0.05)), 0, () => {
          rect(-330, -120, 660, 240, 1, { strokeWidth: 3, stroke: P.blue });
          shield(-200, 0, 0.9, 1);
          txt('things nobody can', 90, -40, 46);
          txt('be fenced out of:', 90, 10, 46);
          txt('fund directly', 90, 70, 50, { color: P.blue });
        });
        grp(1380, 870, popS(c('L16b', 0.68)), 0, () => {
          cash(-150, 10, 0.6, 1);
          txt('nearly everything', 120, -30, 50);
          txt('else: CASH', 120, 30, 64, { color: P.green });
        });
      } else KC += 200;
    } else KC += 300;
  }

  function sMachine() {
    const t = T;
    const fillLvl = 0.15 * prog(t, c('L17', 0.5), c('L17', 1)) + 0.25 * prog(t, c('L18', 0.4), c('L18', 1)) + 0.25 * prog(t, c('L19', 0.4), c('L19', 1)) - 0.5 * prog(t, c('L20', 0.4), c('L20', 0.9));
    jar(960, 560, 0.95 * popS(c('L17') - 0.4), 1, Math.max(0, fillLvl));
    const srcs = [
      ['L17', 260, 230, (s) => land(0, 0, s, 1), 'land value tax', 'zero deadweight loss', P.green],
      ['L18', 960, 150, (s) => factory(0, 0, s * 0.85, 1), 'pollution tax', 'grows the pie!', P.teal],
      ['L19', 1660, 230, null, 'flat income tax', 'one rate, no brackets', P.blue],
    ];
    srcs.forEach(([id, x, y, fn, a, b, col], i) => {
      const s = popS(c(id, 0.02));
      if (fn) grp(x, y, 1, 0, () => fn(s * 0.9)); else grp(x, y, s, 0, () => {
        rect(-110, -70, 220, 140, 1, { fill: P.cream, fillStyle: 'solid' });
        txt('40%', 0, -8, 90, { color: P.blue });
        line(-80, 40, 80, 40, 1, { strokeWidth: 5, stroke: P.blue });
      });
      const lx = i === 1 ? x + 330 : x, ly = i === 1 ? y - 20 : y + 160;
      txt(a, lx, ly, 54, { alpha: fadeIn(c(id, 0.08)) });
      txt(b, lx, ly + 52, 44, { alpha: fadeIn(c(id, 0.5)), color: col, font: PRINT });
      // pipe + coins into the jar
      const pp = prog(t, c(id, 0.25), c(id, 0.45));
      const pts = i === 1 ? [[960, 260], [960, 330], [960, 390]] : i === 0 ? [[420, 250], [680, 250], [880, 395]] : [[1500, 250], [1240, 250], [1040, 395]];
      curveP(pts, pp, { strokeWidth: 5, stroke: col });
      for (let j = 0; j < 3; j++) {
        const u = ((t - c(id, 0.45)) * 0.7 + j / 3) % 1;
        if (t > c(id, 0.45) && t < c('L20', 0.5)) {
          const q0 = pts[0], q1 = pts[1], q2 = pts[2];
          const bx = (1 - u) * (1 - u) * q0[0] + 2 * (1 - u) * u * q1[0] + u * u * q2[0];
          const by = (1 - u) * (1 - u) * q0[1] + 2 * (1 - u) * u * q1[1] + u * u * q2[1];
          coin(bx, by - 12, 18, Math.sin(u * Math.PI));
        } else KC += 3;
      }
    });
    // L20: equal checks to everyone
    if (t > c('L20') - 0.2) {
      const people = [[200, P.red, 1, HAIR_A], [560, P.blue, 4, HAIR_B], [960, P.gold, 2, null], [1360, P.plum, 3, HAIR_B], [1720, P.teal, 0, HAIR_A]];
      people.forEach(([x, col, sk, hair], i) => {
        const f = 0.3 + i * 0.07;
        const got = t > c('L20', f) + 0.6;
        person(x, 930, { s: 0.55 * popS(c('L20', 0.05 + i * 0.04)), color: col, skin: P.skin[sk], mood: got ? 0.9 : 0.2, arms: got ? 'up' : 'down', k: 10 + i, hair });
        const u = eIO(prog(t, c('L20', f), c('L20', f) + 0.6));
        if (u > 0) check(lerp(960, x, u), lerp(700, 760, u) - Math.sin(u * Math.PI) * 120, 0.62, '$10,000', 1); else KC += 8;
      });
      stamp('same check for everyone', 960, 1030, 50, c('L20', 0.75), { color: P.green, rot: -0.02 });
    } else KC += 200;
  }

  function sTable() {
    const t = T;
    wt('flat 40% tax  +  $10,000 for everyone', 960, 110, 76, c('L21') - 0.1, c('L21', 0.12), { color: P.blue });
    const rows = [[12000, 0.2], [25000, 0.33], [80000, 0.43], [1000000, 0.52]];
    const tx = 120, ty = 260;
    grp(0, 0, 1, 0, () => {
      rect(tx, ty - 50, 880, 520, fadeIn(c('L21', 0.05), 0.6) * 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3 });
      const cols = [['you earn', 140], ['take home', 470], ['you pay', 770]];
      cols.forEach(([h, x]) => txt(h, tx + x, ty + 10, 48, { alpha: fadeIn(c('L21', 0.08)), font: PRINT }));
      line(tx + 20, ty + 50, tx + 860, ty + 50, fadeIn(c('L21', 0.08)), { strokeWidth: 2.5 });
      rows.forEach(([g, f], i) => {
        const net = g * 0.6 + 10000, rate = 0.4 - 10000 / g;
        const y = ty + 120 + i * 100, a = fadeIn(c('L21', f));
        const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
        txt(fmt(g), tx + 140, y, 54, { alpha: a });
        txt(fmt(net), tx + 470, y, 54, { alpha: a, color: net > g ? P.green : P.ink });
        txt((rate < 0 ? '-' : '') + Math.abs(rate * 100).toFixed(rate === 0 ? 0 : 1) + '%', tx + 770, y, 54, { alpha: a, color: rate < 0 ? P.green : P.red });
      });
      // highlight circles
      ell(tx + 470, ty + 120, 300, 90, prog(t, c('L21', 0.3), c('L21', 0.38)), { stroke: P.green, strokeWidth: 5 });
      ell(tx + 770, ty + 420, 230, 90, prog(t, c('L21', 0.55), c('L21', 0.62)), { stroke: P.red, strokeWidth: 5 });
    });
    // chart: effective vs marginal rate (log income axis)
    const ox = 1110, oy = 700, w = 700, h = 420;
    const ap = eOut(prog(t, c('L21', 0.6), c('L21', 0.7)));
    const yOf = (r) => oy - h * 0.55 - r * h * 1.0;   // r in [-0.45, 0.45]
    const xOf = (g) => ox + (Math.log10(g) - 4) / 2 * w; // 10k..1M
    arrow(ox, yOf(0), ox + w + 40, yOf(0), ap, { strokeWidth: 3.5 });
    arrow(ox, oy + 30, ox, yOf(0.47) - 20, ap, { strokeWidth: 3.5 });
    txt('income', ox + w - 20, yOf(0) + 40, 40, { alpha: ap });
    txt('0%', ox - 40, yOf(0), 36, { alpha: ap, font: PRINT });
    txt('40%', ox - 50, yOf(0.4), 36, { alpha: ap, font: PRINT });
    // marginal rate: flat dashed line
    const mp = prog(t, c('L21', 0.64), c('L21', 0.74));
    for (let i = 0; i < 14; i++) { const x1 = ox + i * 50, u = clamp(mp * 14 - i); line(x1, yOf(0.4), x1 + 30 * u, yOf(0.4), u > 0 ? 1 : 0, { stroke: P.blue, strokeWidth: 4 }); }
    txt('rate on each extra $: always 40%', ox + w / 2, yOf(0.4) - 40, 40, { alpha: fadeIn(c('L21', 0.7)), color: P.blue });
    const pts = []; for (let i = 0; i <= 40; i++) { const g = Math.pow(10, 4.08 + (i / 40) * 1.92); pts.push([xOf(g), yOf(0.4 - 10000 / g)]); }
    curveP(pts, eIO(prog(t, c('L21', 0.72), c('L21', 0.86))), { stroke: P.red, strokeWidth: 6 });
    txt('share of income you pay', ox + w / 2 - 10, yOf(-0.14), 40, { alpha: fadeIn(c('L21', 0.84)), color: P.red });
    stamp('progressive. no brackets.', 1460, 960, 62, c('L21', 0.9), { color: P.green, rot: -0.04 });
  }

  function sClose() {
    const t = T;
    const out1 = fadeOut(c('L23') - 0.2, 0.4);
    // L22: gift cards (cost 100 / worth 70) vs cash (cost 100 / worth 100)
    if (t < c('L23') + 0.4) {
      giftCard(520, 470, 0.95 * popS(c('L22', 0.25)), { alpha: out1, r: -0.06, burn: 0.3 * prog(t, c('L22', 0.4), c('L22', 0.6)) });
      txt('costs $100', 520, 690, 56, { alpha: out1 * fadeIn(c('L22', 0.3)) });
      txt('worth $70', 520, 750, 56, { alpha: out1 * fadeIn(c('L22', 0.35)), color: P.red });
      grp(1400, 470, popS(c('L22', 0.55)), 0, () => cash(0, 0, 1, 1), out1);
      txt('costs $100', 1400, 690, 56, { alpha: out1 * fadeIn(c('L22', 0.6)) });
      txt('worth $100', 1400, 750, 56, { alpha: out1 * fadeIn(c('L22', 0.65)), color: P.green });
      wt('any amount of sharing:', 960, 170, 70, c('L22', 0.0), c('L22', 0.2), { alpha: out1 });
      stamp('cash is cheaper', 960, 930, 70, c('L22', 0.8), { color: P.green });
    } else KC += 300;
    // L23: both win
    if (t > c('L23') - 0.2 && t < c('L24') + 0.5) {
      const out2 = fadeOut(c('L24') - 0.15, 0.4);
      person(560, 520, { s: popS(c('L23', 0.02)), color: P.gold, arms: 'up', mood: 1, k: 20, skin: P.skin[2], hair: HAIR_A, alpha: out2 });
      arrow(780, 640, 780, 330, prog(t, c('L23', 0.1), c('L23', 0.25)), { stroke: P.green, strokeWidth: 9, head: 34 });
      txt('the poor: more', 560, 790, 64, { alpha: out2 * fadeIn(c('L23', 0.1)), color: P.green });
      person(1360, 520, { s: popS(c('L23', 0.35)), color: P.blue, arms: 'up', mood: 0.9, k: 21, hat: 'top', alpha: out2 });
      arrow(1580, 330, 1580, 640, prog(t, c('L23', 0.4), c('L23', 0.55)), { stroke: P.teal, strokeWidth: 9, head: 34 });
      txt('taxpayers: pay less', 1360, 790, 64, { alpha: out2 * fadeIn(c('L23', 0.4)), color: P.teal });
      stamp('at the same time', 960, 950, 70, c('L23', 0.72), { color: P.red });
    } else KC += 300;
    // L24: title + money rain
    if (t > c('L24') - 0.2) {
      const r = rand(99);
      for (let i = 0; i < 26; i++) {
        const x = r() * W, sp = 120 + r() * 160, ph = r() * 10, rot = r() * 6;
        const age = t - c('L24', 0.5);
        if (age > 0) {
          const y = ((age * sp + ph * 100) % (H + 200)) - 100;
          grp(x + Math.sin(age * 2 + ph) * 40, y, 0.35, rot + age * (r() - 0.5) * 2, () => {
            rect(-120, -60, 240, 120, 1, { fill: P.cash, fillStyle: 'solid' }); txt('$', 0, 2, 64);
          }, 0.9 * fadeOut(ce('L24', 0.8), 1.2));
        } else KC += 60;
      }
      grp(960, 420, 1, 0, () => {
        wt('a free-market', 0, -90, 140, c('L24', 0.0), c('L24', 0.22), { color: P.blue });
        wt('welfare state', 0, 60, 160, c('L24', 0.2), c('L24', 0.45), { color: P.red });
      });
      stamp('just give people money.', 960, 720, 84, c('L24', 0.6), { color: P.green, rot: -0.03 });
      const ep = fadeIn(ce('L24', 1.4), 0.8);
      txt('economic physics', 960, 900, 54, { alpha: ep, color: P.teal });
      txt('based on essays by clay shentrup  ·  clayshentrup.medium.com', 960, 970, 40, { alpha: ep, font: PRINT });
    } else KC += 400;
  }

  // ---------- assembly ----------
  function buildScenes() {
    SCN = [
      { start: 0, draw: sTitle },
      { start: c('L1') - 0.7, draw: sTug },
      { start: c('L3') - 0.7, draw: sUtility },
      { start: c('L6') - 0.7, draw: sTools },
      { start: c('L10') - 0.7, draw: sGiftCard },
      { start: c('L14') - 0.7, draw: sTheorem },
      { start: c('L17') - 0.7, draw: sMachine },
      { start: c('L21') - 0.7, draw: sTable },
      { start: c('L22') - 0.7, draw: sClose },
    ];
    const E = [];
    const ev = (name, t, dur) => E.push({ name, t, dur });
    SCN.slice(1).forEach((s) => ev('whoosh', s.start - 0.05));
    ev('stamp', 0.3); ev('scribble', 0.6, 1.1); ev('sparkle', 1.7); ev('scribble', 1.9, 0.9); ev('pop', 2.2); ev('pop2', 2.45);
    // tug
    ev('pop', c('L1') + 0.05); ev('pop2', c('L1', 0.12)); ev('pop2', c('L1', 0.22)); ev('boing', c('L1', 0.5));
    ev('scribble', c('L2'), 0.5); ev('scribble', c('L2', 0.42), 0.5); ev('tick', c('L2', 0.55)); ev('tick', c('L2', 0.65));
    // utility
    ev('scribble', c('L3', 0.15), 1.2); ev('pop', c('L3', 0.62)); ev('pop', c('L3', 0.78));
    ev('stamp', c('L4', 0.47)); ev('stamp', c('L4', 0.9)); ev('sparkle', c('L4', 0.92));
    ev('pop2', c('L5', 0.02)); ev('pop2', c('L5', 0.08)); ev('pop', c('L5', 0.1)); ev('slide', c('L5', 0.4)); ev('sad', c('L5', 0.5)); ev('stamp', c('L5', 0.8));
    ev('pop', c('L5b')); ev('scribble', c('L5b', 0.6), 0.6); ev('slide', c('L5b', 0.82)); ev('stamp', c('L5b', 0.9)); ev('ding', c('L5b', 0.92));
    // tools
    ev('pop', c('L6', 0.05)); ev('pop2', c('L6', 0.45));
    [0.02, 0.15, 0.29, 0.43].forEach((f) => ev('pop', c('L7', f)));
    ev('sad', c('L7', 0.65)); ev('poof', c('L8', 0.38)); ev('scribble', c('L8', 0.18), 0.6);
    ev('pop', c('L9')); ev('boing', c('L9', 0.1)); ev('stamp', c('L9', 0.72)); ev('stamp', c('L9', 0.85));
    // gift card
    ev('pop', c('L10', 0.1)); ev('scribble', c('L10', 0.55), 1.0); ev('sparkle', c('L10', 0.85));
    ev('pop2', c('L11', 0.02)); ev('pop2', c('L11', 0.08)); ev('whoosh', c('L11', 0.13)); ev('pop', c('L11', 0.36));
    ev('fire', c('L11', 0.66), 1.6); ev('poof', c('L11', 0.72)); ev('stamp', c('L11', 0.86));
    [0.13, 0.3, 0.48, 0.78].forEach((f) => ev('pop2', c('L12', f)));
    ev('pop', c('L13')); ev('pop2', c('L13', 0.15)); ev('chaching', c('L13', 0.2)); ev('pop2', c('L13', 0.5)); ev('stamp', c('L13', 0.62));
    [0, 1, 2, 3].forEach((i) => ev('coin', c('L13', 0.62) + i * 0.15)); ev('stamp', c('L13', 0.9));
    // theorem
    ev('bulb', c('L14', 0.25)); ev('scribble', c('L14', 0.55), 1.0);
    ev('pop', c('L15', 0.05)); ev('slide', c('L15', 0.3)); ev('pop2', c('L15', 0.55)); ev('ding', c('L15', 0.8));
    [0.05, 0.45, 0.72].forEach((f) => ev('pop', c('L16', f)));
    ev('pop2', c('L16b', 0.05)); ev('chaching', c('L16b', 0.68));
    // machine
    ev('pop', c('L17') - 0.4); ['L17', 'L18', 'L19'].forEach((id) => { ev('pop2', c(id, 0.02)); [0.5, 0.65, 0.8].forEach((f) => ev('coin', c(id, f))); });
    ev('sparkle', c('L18', 0.5));
    [0, 1, 2, 3, 4].forEach((i) => ev('chaching', c('L20', 0.3 + i * 0.07) + 0.55)); ev('stamp', c('L20', 0.75));
    // table
    ev('scribble', c('L21') - 0.1, 1.0); [0.2, 0.33, 0.43, 0.52].forEach((f) => ev('tick', c('L21', f)));
    ev('pop', c('L21', 0.3)); ev('pop', c('L21', 0.55)); ev('scribble', c('L21', 0.72), 0.9); ev('stamp', c('L21', 0.9));
    // close
    ev('pop', c('L22', 0.25)); ev('fire', c('L22', 0.4), 1.0); ev('chaching', c('L22', 0.55)); ev('stamp', c('L22', 0.8));
    ev('pop2', c('L23', 0.02)); ev('slide', c('L23', 0.1)); ev('pop2', c('L23', 0.35)); ev('stamp', c('L23', 0.72));
    ev('scribble', c('L24'), 1.2); ev('stamp', c('L24', 0.6)); ev('sparkle', c('L24', 0.62)); ev('chaching', c('L24', 0.7));
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
