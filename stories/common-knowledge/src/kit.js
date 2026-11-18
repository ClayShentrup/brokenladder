// "common knowledge" — colored-pencil noir kit. Every frame is a pure function of time.
'use strict';
const W = 1920, H = 1080;
const K = {
  paper: '#15131c', ink: '#07060b', amber: '#f2a83b', amber2: '#ffd27a', lamp: '#ffcf6b', teal: '#1fb5a8', teal2: '#5fe0d0',
  magenta: '#e0337f', crimson: '#c8202f', violet: '#6a3fc4', indigo: '#2a2a78', blue: '#3a6fe0', cream: '#f4e6c8',
  skin: '#e8a57c', skin2: '#c9785a', khaki: '#b8935a', wool: '#3b3f4f', slate: '#5a6478', stone: '#8a7d70', wet: '#2b3448',
};
let ctx, cv, SCALE = 1;
const SKETCH = true; // light paper, graphite lines, colored-pencil accents
const PAPERC = '#efe8da', GRAPH = '#34323a';
const lum = (c) => { if (typeof c !== 'string' || c[0] !== '#' || c.length < 7) return 1; const h = c.slice(1); return (0.3 * parseInt(h.slice(0, 2), 16) + 0.59 * parseInt(h.slice(2, 4), 16) + 0.11 * parseInt(h.slice(4, 6), 16)) / 255; };
function setCtx(c) { ctx = c; }
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const sm = (u) => u * u * (3 - 2 * u);
const prog = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a));
const eIO = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
function rng(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; const h = (n) => { const s = Math.sin((n + seed * 57.13) * 127.1) * 43758.5453; return s - Math.floor(s); }; return lerp(h(i), h(i + 1), sm(f)) * 2 - 1; }

// ---- boil: drawings update "on fours" (7.5 per second); seeds change per tick ----
let TICK = 0;
const SD = () => (TICK * 7919 + (SEQ++) * 104729) % 2147483647;
let SEQ = 0;

// ---- pencil "tooth": colours drawn through a grainy pattern so strokes break up like pencil on toothy paper ----
const PAT = {};
function tooth(col, a = 1) {
  const key = col + a; if (PAT[key]) return PAT[key];
  const c = document.createElement('canvas'); c.width = c.height = 192; const g = c.getContext('2d');
  const im = g.createImageData(192, 192), d = im.data, r = rng(col.length * 977 + Math.round(a * 100));
  const hex = col.replace('#', ''); const R = parseInt(hex.slice(0, 2), 16), G = parseInt(hex.slice(2, 4), 16), B = parseInt(hex.slice(4, 6), 16);
  for (let i = 0; i < 192 * 192; i++) { const v = r(); const keep = v > 0.22 ? 1 : v * 3; d[i * 4] = R; d[i * 4 + 1] = G; d[i * 4 + 2] = B; d[i * 4 + 3] = 255 * a * keep * (0.65 + 0.35 * r()); }
  g.putImageData(im, 0, 0); PAT[key] = ctx.createPattern(c, 'repeat'); return PAT[key];
}
// a pencil line through points: several slightly jittered passes
function pline(pts, col, w = 2.2, a = 1, passes = 2, jit = 1.6) {
  const r = rng(SD());
  if (SKETCH && lum(col) < 0.12) col = GRAPH;
  ctx.save(); ctx.strokeStyle = tooth(col, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let p = 0; p < passes; p++) {
    ctx.globalAlpha = a * (p ? 0.55 : 0.95); ctx.lineWidth = w * (p ? 0.7 : 1);
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const xx = x + (r() - 0.5) * jit, yy = y + (r() - 0.5) * jit; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); });
    ctx.stroke();
  }
  ctx.restore();
}
// quadratic/bezier helpers -> point lists
function qpts(a, c, b, n = 12) { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; o.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]); } return o; }
function cpts(a, c1, c2, b, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const u = i / n, v = 1 - u; o.push([v * v * v * a[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * b[0], v * v * v * a[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * b[1]]); } return o; }
// hatch-fill the current clip region: parallel strokes at an angle
function hatch(x0, y0, x1, y1, col, ang = -0.9, gap = 7, a = 0.8, w = 1.6, wob = 1.5) {
  const r = rng(SD()); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 10;
  ctx.save(); ctx.strokeStyle = tooth(col, 1); ctx.lineCap = 'round'; ctx.lineWidth = w;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let d = -R; d <= R; d += gap * (0.75 + r() * 0.5)) {
    ctx.globalAlpha = a * (0.55 + r() * 0.45);
    const ox = cx - sa * d, oy = cy + ca * d, l0 = -R * (0.8 + r() * 0.2), l1 = R * (0.8 + r() * 0.2);
    ctx.beginPath(); ctx.moveTo(ox + ca * l0 + (r() - 0.5) * wob, oy + sa * l0 + (r() - 0.5) * wob); ctx.lineTo(ox + ca * l1 + (r() - 0.5) * wob, oy + sa * l1 + (r() - 0.5) * wob); ctx.stroke();
  }
  ctx.restore();
}
// fill a path (Path2D) with layered pencil: a soft base wash + hatching
function pfill(path, bb, col, op = {}) {
  const { ang = -0.9, gap = 6, a = 0.85, w = 1.7, base = 0.35, cross = false, col2 } = op;
  ctx.save(); ctx.clip(path);
  if (base > 0) { ctx.globalAlpha = base; ctx.fillStyle = tooth(col, 1); ctx.fillRect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]); ctx.globalAlpha = 1; }
  hatch(bb[0], bb[1], bb[2], bb[3], col, ang, gap, a, w);
  if (cross) hatch(bb[0], bb[1], bb[2], bb[3], col2 || col, ang + 1.3, gap * 1.3, a * 0.7, w * 0.9);
  ctx.restore();
}
// a soft lurid glow (light pools, lamps)
function glow(x, y, r, col, a = 1) {
  if (a <= 0) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalCompositeOperation = SKETCH ? 'multiply' : 'lighter'; ctx.globalAlpha = SKETCH ? a * 0.55 : a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function rgba(hex, a) { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; }
function P2(pts, close = true) { const p = new Path2D(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); if (close) p.closePath(); return p; }
function bbox(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; pts.forEach(([x, y]) => { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }); return [a, b, c, d]; }
// pencil-shaded polygon: fill + outline
function pshape(pts, col, op = {}) {
  const p = P2(pts); pfill(p, bbox(pts), col, op);
  if (op.line !== false) pline(pts.concat([pts[0]]), op.lineCol || K.ink, op.lw || 2.4, op.la == null ? 0.9 : op.la);
}
// handwriting in pencil
function hand(s, x, y, size, col, op = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(op.rot || 0); ctx.font = `700 ${size}px Caveat, cursive`; ctx.textAlign = op.align || 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = op.a == null ? 1 : op.a; ctx.fillStyle = tooth(col, 1); ctx.fillText(s, 0, 0); ctx.globalAlpha *= 0.4; ctx.fillText(s, 1, 1); ctx.restore();
}

// smooth closed curve through points (Catmull-Rom -> Bezier), returned as a dense point list
function smooth(pts, closed = true, n = 6) {
  const out = [], N = pts.length, g = (i) => pts[closed ? (i + N) % N : clamp(i, 0, N - 1)];
  for (let i = 0; i < (closed ? N : N - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const seg = cpts(p1, c1, c2, p2, n); if (i) seg.shift(); out.push(...seg);
  }
  return out;
}
// colored-pencil strokes scattered inside the current clip; density follows f(x, y) in 0..1
function strokes(bb, col, n, op = {}) {
  const { ang = -0.95, len = 34, w = 1.8, a = 0.85, f = null, jitAng = 0.25, curve = 0.15 } = op;
  const r = rng(SD());
  ctx.save(); ctx.strokeStyle = tooth(col, 1); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
    const k = f ? f(x, y) : 1; if (k <= 0 || r() > k) { r(); r(); r(); continue; }
    const an = ang + (r() - 0.5) * jitAng, L = len * (0.5 + r() * 0.8), ca = Math.cos(an) * L / 2, sa = Math.sin(an) * L / 2, bend = (r() - 0.5) * curve * L;
    ctx.globalAlpha = a * (0.45 + r() * 0.55); ctx.lineWidth = w * (0.7 + r() * 0.6);
    ctx.beginPath(); ctx.moveTo(x - ca, y - sa); ctx.quadraticCurveTo(x - sa * bend / L * 2, y + ca * bend / L * 2, x + ca, y + sa); ctx.stroke();
  }
  ctx.restore();
}
// shade a closed shape with layered pencil: dark base, then stroke layers [{col, n, f, ang, len, w, a}]
function pencilShape(pts, base, layers, op = {}) {
  const p = P2(pts), bb = bbox(pts);
  ctx.save(); ctx.clip(p);
  if (base) {
    const lb = lum(base);
    if (SKETCH && lb < 0.45) {
      const dk = clamp((0.45 - lb) / 0.4), area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
      ctx.fillStyle = PAPERC; ctx.fillRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4);
      ctx.fillStyle = rgba(GRAPH, 0.04 + 0.1 * dk); ctx.fillRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4);
      strokes(bb, GRAPH, Math.min(2600, Math.round(area / 900 * dk)), { ang: -0.95, len: 30, w: 1.3, a: 0.45 });
      if (dk > 0.6) strokes(bb, GRAPH, Math.min(1600, Math.round(area / 1600 * dk)), { ang: 0.6, len: 30, w: 1.2, a: 0.35 });
    } else { if (SKETCH && typeof base === 'string' && base.startsWith('rgba')) { ctx.fillStyle = PAPERC; ctx.fillRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4); } ctx.fillStyle = base; ctx.fillRect(bb[0] - 2, bb[1] - 2, bb[2] - bb[0] + 4, bb[3] - bb[1] + 4); }
  }
  layers.forEach((L) => strokes(bb, SKETCH && lum(L.col) < 0.12 ? GRAPH : L.col, L.n, L));
  ctx.restore();
  if (op.line !== false) pline(pts.concat([pts[0]]), op.lineCol || K.ink, op.lw || 2.2, op.la == null ? 0.85 : op.la);
}
const ss = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
