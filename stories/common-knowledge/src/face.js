// Face rig: colored-pencil portraits of julian and henrik with keyframed expressions.
'use strict';
// expression parameters
const EX = {
  neutral: { brow: 0, furrow: 0, open: 1, gx: 0, gy: 0, smile: 0, asym: 0, mouth: 0, crinkle: 0, clench: 0 },
};
function mix(a, b, u) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k] == null ? a[k] : b[k], u); return o; }
function ex(o) { return Object.assign({}, EX.neutral, o); }
// keyframes: [[t, exprObject], ...] -> expression at time t (eased over `d` seconds)
function exAt(keys, t, d = 0.5) {
  let cur = ex(keys[0][1]);
  for (let i = 1; i < keys.length; i++) { const [tk, e] = keys[i]; if (t < tk) break; cur = mix(cur, ex(e), eIO(prog(t, tk, tk + d))); }
  return cur;
}
const HEAD = {
  julian: [[0, -275], [112, -256], [168, -186], [184, -88], [186, -10], [178, 62], [158, 142], [118, 208], [60, 254], [0, 266]],
  henrik: [[0, -262], [122, -246], [186, -172], [202, -72], [206, 12], [200, 84], [180, 162], [136, 226], [70, 262], [0, 272]],
};
function mirror(pts) { const r = pts.slice(1, -1).reverse().map(([x, y]) => [-x, y]); return pts.concat(r); }

// who: 'julian' | 'henrik'; e: expression; L: { side: +1 light from the right / -1 from the left, key, rim, dark (0..1), glint (glasses) }
function face(x, y, s, who, e, L = {}) {
  const side = L.side || 1, key = L.key || K.amber, rim = L.rim || K.teal, dark = L.dark == null ? 0.6 : L.dark;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const J = who === 'julian';
  const head = mirror(HEAD[who]), hp = P2(head), hb = bbox(head);
  const lit = (px, py) => ss(-90, 110, px * side) * (1 - 0.45 * ss(140, 290, py));
  const band = (px) => Math.exp(-Math.pow((px * side - 5) / 50, 2));
  const rimF = (px) => ss(110, 190, -px * side);
  const DK = '#100c15';
  // ---- coat, collar, neck ----
  if (J) {
    const coat = smooth([[-470, 640], [-420, 420], [-230, 330], [0, 380], [230, 330], [420, 420], [470, 640]]);
    pencilShape(coat, '#16110d', [{ col: K.khaki, n: 900, f: (px) => ss(-100, 300, px * side) * 0.9, ang: -0.6, len: 46, w: 2.4 }, { col: K.indigo, n: 500, ang: 0.7, len: 50, w: 2 }, { col: rim, n: 160, f: (px) => ss(250, 420, -px * side), ang: -0.4 }]);
    const band2 = smooth([[-170, 400], [-160, 200], [-90, 160], [90, 160], [160, 200], [170, 400]], false);
    pencilShape(band2, '#1b140e', [{ col: K.khaki, n: 500, f: (px) => ss(-60, 160, px * side), ang: 0.2, len: 38, w: 2.2 }, { col: K.amber, n: 160, f: (px) => ss(60, 170, px * side), len: 24 }]);
  } else {
    const coat = smooth([[-490, 640], [-430, 420], [-240, 330], [0, 370], [240, 330], [430, 420], [490, 640]]);
    pencilShape(coat, '#0f1016', [{ col: K.slate, n: 900, f: (px) => ss(-100, 300, px * side) * 0.85, ang: -0.6, len: 46, w: 2.4 }, { col: K.violet, n: 400, ang: 0.7, len: 50, w: 2 }, { col: rim, n: 160, f: (px) => ss(250, 420, -px * side) }]);
  }
  const neck = smooth([[-84, 190], [84, 190], [100, 420], [-100, 420]]);
  pencilShape(neck, DK, [{ col: K.skin2, n: 450, f: (px, py) => ss(-20, 100, px * side) * ss(230, 300, py), len: 30 }, { col: K.magenta, n: 140, f: (px) => band(px), len: 24 }], { la: 0.6 });
  if (J) {
    pencilShape([[-30, 470], [-200, 330], [-150, 230], [-60, 330]], '#1b140e', [{ col: K.khaki, n: 260, f: (px) => ss(-200, 0, px * side), ang: 0.9, len: 40 }]);
    pencilShape([[30, 470], [200, 330], [150, 230], [60, 330]], '#1b140e', [{ col: K.khaki, n: 260, f: (px) => ss(-200, 0, px * side) + 0.2, ang: -0.9, len: 40 }, { col: K.amber2, n: 80, f: (px) => ss(80, 200, px * side), len: 20 }]);
  } else {
    pencilShape(smooth([[-130, 300], [130, 300], [150, 390], [40, 430], [-70, 440], [-150, 390]]), '#2a080c', [{ col: K.crimson, n: 700, f: (px) => 0.4 + 0.6 * ss(-120, 140, px * side), ang: 0.35, len: 40, w: 2.4 }, { col: K.magenta, n: 200, f: (px) => ss(40, 160, px * side), len: 26 }]);
    pline(qpts([-120, 345], [0, 378], [130, 340]), K.ink, 1.8, 0.7);
  }
  // ---- ears ----
  [-1, 1].forEach((k) => { const ep = smooth([[k * 178, -60], [k * 208, -52], [k * 214, 0], [k * 202, 40], [k * 180, 46]]); pencilShape(ep, DK, [{ col: K.skin2, n: 160, f: () => (k === side ? 0.9 : 0.15), len: 18 }, { col: rim, n: 60, f: () => (k === side ? 0 : 0.8), len: 14 }], { lw: 1.6 }); });
  // ---- head: noir base, colored-pencil key light with a soft falloff, lurid midtone, cool rim ----
  const hs = smooth(head);
  ctx.save(); ctx.clip(P2(hs)); ctx.fillStyle = DK; ctx.fillRect(-260, -320, 520, 640);
  const ug = ctx.createLinearGradient(-side * 120, 0, side * 140, 0); ug.addColorStop(0, rgba(K.skin2, 0)); ug.addColorStop(0.45, rgba(K.skin2, 0.45)); ug.addColorStop(1, rgba(key, 0.7));
  ctx.fillStyle = ug; ctx.fillRect(-260, -320, 520, 640);
  const ug2 = ctx.createRadialGradient(-side * 40, 40, 30, -side * 40, 40, 260); ug2.addColorStop(0, rgba(K.magenta, 0.25)); ug2.addColorStop(1, rgba(K.magenta, 0)); ctx.fillStyle = ug2; ctx.fillRect(-260, -320, 520, 640);
  ctx.restore();
  pencilShape(hs, null, [
    { col: K.skin2, n: 4200, f: (px, py) => lit(px, py), len: 26, w: 2.2 },
    { col: K.skin, n: 4200, f: (px, py) => Math.pow(lit(px, py), 1.3), len: 24, w: 2.1 },
    { col: key, n: 2000, f: (px, py) => Math.pow(lit(px, py), 2.2) * 0.9, len: 20, w: 1.9 },
    { col: K.cream, n: 260, f: (px, py) => Math.pow(lit(px, py), 3) * ss(-260, -120, -Math.abs(py - (-120))) * 0.8 + Math.pow(lit(px, py), 3) * 0.25, len: 20, w: 1.6 },
    { col: K.magenta, n: 1400, f: (px) => band(px) * 0.8, len: 22, w: 1.8, ang: -0.6 },
    { col: K.violet, n: 1600, f: (px, py) => (1 - lit(px, py)) * 0.5, ang: side * 0.8, len: 30, w: 1.7 },
    { col: rim, n: 1400, f: (px) => rimF(px), ang: 1.4, len: 22, w: 2 },
    { col: K.indigo, n: 1400, f: (px, py) => (Math.exp(-Math.pow((Math.abs(px) - 128) / 40, 2) - Math.pow((py - 70) / 55, 2)) * 0.7 + ss(200, 260, py) * 0.8 + Math.exp(-Math.pow((Math.abs(px) - 160) / 30, 2) - Math.pow((py + 140) / 70, 2)) * 0.5), ang: side * 0.9, len: 20, w: 1.8 },
  ], { lw: 2.4 });
  ctx.save(); ctx.clip(P2(hs));
  [-1, 1].forEach((k) => strokes([k * 80 - 70, -96, k * 80 + 70, -10], K.ink, 260, { f: (px, py) => Math.exp(-Math.pow((px - k * 80) / 62, 2) - Math.pow((py + 56) / 30, 2)) * 0.7, ang: -0.7, len: 22, w: 1.8 }));
  strokes([-50, 92, 40, 116], K.ink, 70, { f: (px, py) => Math.exp(-Math.pow((px + side * 16) / 26, 2) - Math.pow((py - 100) / 8, 2)) * 0.6, ang: -side * 1.2, len: 10, a: 0.5 });
  strokes([-50, 172, 50, 200], K.ink, 60, { f: (px, py) => Math.exp(-Math.pow(px / 34, 2) - Math.pow((py - 184) / 8, 2)) * 0.5, ang: side * 1.1, len: 10, a: 0.5 });
  if (J) strokes([-180, 80, 180, 270], K.violet, 500, { f: (px, py) => ss(90, 160, py) * ss(-150, -30, -Math.abs(px) + 120) * 0.6, ang: 0.3, len: 10, w: 1.4 });
  ctx.restore();
  glow(-side * 200, 0, 170, rgba(rim, 0.28), 0.8);
  // ---- hair ----
  if (J) {
    const hair = smooth([[-190, -70], [-196, -170], [-150, -250], [-60, -296], [40, -300], [130, -270], [190, -200], [196, -100], [186, -66], [168, -140], [120, -184], [40, -172], [-40, -186], [-120, -176], [-172, -126]]);
    pencilShape(hair, '#09070d', [{ col: K.violet, n: 700, ang: -2.4, len: 60, w: 2, a: 0.7 }, { col: K.indigo, n: 500, ang: -2.2, len: 50 }, { col: key, n: 260, f: (px) => ss(40, 190, px * side), ang: -2.3, len: 40 }, { col: rim, n: 160, f: (px) => ss(110, 190, -px * side), ang: -1.8, len: 40 }], { lw: 2 });
  } else {
    const hairL = smooth([[-206, -40], [-212, -150], [-178, -214], [-140, -198], [-172, -140], [-188, -60]]);
    [hairL, hairL.map(([a2, b2]) => [-a2, b2])].forEach((hp2) => pencilShape(hp2, '#2a2116', [{ col: K.khaki, n: 300, ang: -1.9, len: 34 }, { col: K.cream, n: 80, f: (px) => ss(100, 200, px * side), len: 20 }], { lw: 1.4 }));
    for (let i = 0; i < 8; i++) pline(qpts([-100 + i * 28, -238], [-70 + i * 28, -272], [-30 + i * 28, -258]), K.khaki, 1.4, 0.55);
  }
  // ---- features ----
  const lw = 3;
  [-1, 1].forEach((k) => {
    const cx = k * 78, cy = -38, op = clamp(e.open, 0, 1.4), ch = e.smile > 0 ? e.smile * 6 + e.crinkle * 6 : 0;
    const top = cy - 21 * op, bot = cy + 10 - ch;
    const upper = cpts([k * 40, cy + 3], [k * 58, top], [k * 102, top], [k * 120, cy - 2], 14), lower = cpts([k * 120, cy - 2], [k * 100, bot + 4], [k * 60, bot + 4], [k * 40, cy + 3], 14);
    const eyeP = P2(upper.concat(lower));
    if (op > 0.08) {
      ctx.save(); ctx.clip(eyeP); ctx.fillStyle = rgba(K.cream, 0.85); ctx.fillRect(k * 40 - 10, cy - 40, 100, 70);
      const ix = cx + e.gx * 16, iy = cy + e.gy * 6;
      ctx.fillStyle = J ? '#3a5f7a' : '#6a7a3a'; ctx.beginPath(); ctx.arc(ix, iy, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = K.ink; ctx.beginPath(); ctx.arc(ix, iy, 7 + (e.pupil || 0) * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = K.cream; ctx.beginPath(); ctx.arc(ix + side * 5, iy - 5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    pline(upper, K.ink, lw + 1, 0.95); pline(lower, K.ink, 1.6, 0.6);
    pline(qpts([k * 44, top - 10], [k * 80, top - 18 - 4 * op], [k * 116, top - 6]), K.ink, 1.3, 0.45); // lid crease
    // brows
    const raise = e.brow, fur = e.furrow;
    pline(qpts([k * 34, -84 + fur * 12 - raise * 10], [k * 82, -108 - raise * 20 + fur * 4], [k * 136, -92 - raise * 8]), J ? K.ink : '#5a4428', J ? 7 : 6, 0.95, 3, 2);
    if (fur > 0.1) pline(qpts([k * 18, -96], [k * 22, -76], [k * 16, -60]), K.ink, 1.4, fur * 0.6);
    if (e.crinkle > 0.02) for (let i = 0; i < 3; i++) pline(qpts([k * 126, cy - 8 + i * 9], [k * 140, cy - 10 + i * 12], [k * 152, cy - 16 + i * 16]), K.ink, 1.3, e.crinkle * 0.8);
    // under-eye bags (julian's fatigue)
    if (J) pline(qpts([k * 50, cy + 22], [k * 82, cy + 32], [k * 112, cy + 18]), K.violet, 1.3, 0.4 + (e.tired || 0) * 0.4);
  });
  // glasses (henrik)
  if (!J) {
    [-1, 1].forEach((k) => { const p = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2; p.push([k * 80 + Math.cos(a) * 58, -40 + Math.sin(a) * 42]); } pline(p, K.amber2, 2, 0.8, 2, 0.8); });
    pline(qpts([-24, -48], [0, -58], [24, -48]), K.amber2, 2, 0.8);
    const gl = L.glint == null ? 1 : L.glint; if (gl > 0) { glow(side * 100, -62, 40, 'rgba(255,230,170,0.9)', gl * 0.7); pline([[side * 70, -70], [side * 110, -52]], K.cream, 2.5, gl * 0.7); }
  }
  // nose
  pline(cpts([-side * 14, -40], [-side * 20, 0], [-side * 34, 40], [-side * 30, 66]), K.ink, 2, 0.75);
  pline(qpts([-36, 70], [-28, 86], [-10, 84]), K.ink, 2.2, 0.85); pline(qpts([10, 84], [28, 86], [36, 70]), K.ink, 2.2, 0.85);
  pline(qpts([-14, 82], [0, 92], [14, 82]), K.ink, 1.6, 0.5);
  // mouth
  const hw = 52 + e.smile * 12, my = 148;
  const lc = [-hw, my - e.smile * 17 + e.asym * 9], rc = [hw, my - e.smile * 17 - e.asym * 9];
  const mid = my + e.smile * 7, op2 = clamp(e.mouth, 0, 1);
  if (op2 > 0.03) {
    const up = cpts(lc, [-hw * 0.4, mid - 6], [hw * 0.4, mid - 6], rc, 14), lo = cpts(rc, [hw * 0.4, mid + op2 * 44], [-hw * 0.4, mid + op2 * 44], lc, 14);
    const mp = P2(up.concat(lo)); ctx.save(); ctx.fillStyle = '#1a0610'; ctx.fill(mp); ctx.clip(mp);
    if (e.smile > 0.2) { ctx.fillStyle = rgba(K.cream, 0.85); ctx.fillRect(-hw, mid - 10, hw * 2, 14); }
    ctx.restore(); pline(up, K.ink, 2.6, 0.9); pline(lo, K.ink, 2, 0.7);
  } else pline(cpts(lc, [-hw * 0.4, mid + 2], [hw * 0.4, mid + 2], rc, 14), K.ink, 2.8, 0.92);
  pline(qpts([-hw * 0.6, my - 12], [0, my - 22 + e.smile * 4], [hw * 0.6, my - 12]), K.crimson, 2, 0.35); // upper lip tone
  pline(qpts([-30, my + 24 + op2 * 40], [0, my + 30 + op2 * 40], [30, my + 24 + op2 * 40]), K.ink, 1.6, 0.45);
  // nasolabial folds, deeper with a smile
  [-1, 1].forEach((k) => pline(qpts([k * 42, 84], [k * (hw + 18), my - 20], [k * (hw + 10), my + 8 - e.smile * 10]), K.ink, 1.6, 0.25 + Math.max(0, e.smile) * 0.5));
  // jaw clench
  if (e.clench > 0.03) [-1, 1].forEach((k) => pline(qpts([k * 158, 100], [k * 150, 140], [k * 136, 176]), K.ink, 1.8, e.clench * 0.7));
  ctx.restore();
}
