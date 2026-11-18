// Face rig v3: graphite-and-colored-pencil sketch portraits in three-quarter view, on light paper.
// Built the way illustrators construct a head (Loomis): cranium, side plane, jaw, and features hung on
// proportion lines. Units are half the head height (crown y = -1, chin y = +1); x points the way the face
// looks. Proportion lines: brow y = -0.20, eye line y = -0.03, nose base y = 0.33, mouth y = 0.53,
// chin y = 1.0. The face's centre line runs at x ~ 0.22 (turned three-quarters); the ear sits behind the
// jaw between brow and nose base. Henrik faces left (mirrored) and is built heavier and older.
'use strict';
const EX = { neutral: { brow: 0, furrow: 0, open: 1, gx: 0, gy: 0, smile: 0, asym: 0, mouth: 0, crinkle: 0, clench: 0, tired: 0, pupil: 0 } };
function mix(a, b, u) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k] == null ? a[k] : b[k], u); return o; }
function ex(o) { return Object.assign({}, EX.neutral, o); }
function exAt(keys, t, d = 0.5) { let cur = ex(keys[0][1]); for (let i = 1; i < keys.length; i++) { const [tk, e] = keys[i]; if (t < tk) break; cur = mix(cur, ex(e), eIO(prog(t, tk, tk + d))); } return cur; }
const GR = '#34323a', GR2 = '#5a5862'; // graphite, dark and light

const HEADS = {
  julian: {
    far: [[0.30, -0.80], [0.38, -0.62], [0.43, -0.40], [0.44, -0.23], [0.39, -0.10], [0.44, 0.06], [0.42, 0.22], [0.37, 0.40], [0.39, 0.55], [0.37, 0.72], [0.38, 0.88], [0.30, 0.99]],
    back: [[0.30, -0.80], [0.10, -0.98], [-0.25, -0.98], [-0.58, -0.80], [-0.76, -0.45], [-0.80, -0.08], [-0.72, 0.24], [-0.58, 0.42]],
    jaw: [[-0.36, 0.32], [-0.33, 0.52], [-0.29, 0.67], [-0.12, 0.85], [0.08, 0.96], [0.30, 0.99]],
    neck: [[-0.56, 0.44], [-0.52, 0.80], [-0.50, 1.35], [0.14, 1.35], [0.14, 1.10], [0.16, 0.97]],
    hair: [[0.36, -0.60], [0.22, -0.58], [0.05, -0.56], [-0.12, -0.52], [-0.24, -0.38], [-0.27, -0.16], [-0.36, -0.20], [-0.48, -0.10], [-0.56, 0.12], [-0.62, 0.38], [-0.74, 0.22], [-0.84, -0.12], [-0.80, -0.52], [-0.62, -0.86], [-0.30, -1.06], [0.06, -1.05], [0.28, -0.99], [0.40, -0.86], [0.42, -0.70]],
    nose: { bridge: [[0.21, -0.10], [0.29, 0.05], [0.39, 0.18], [0.47, 0.25]], under: [[0.47, 0.25], [0.465, 0.31], [0.41, 0.335], [0.34, 0.33]], wing: [[0.20, 0.25], [0.17, 0.30], [0.22, 0.34], [0.30, 0.335]] },
    eyeN: [-0.02, -0.03, 0.125], eyeF: [0.325, -0.04, 0.075], mouth: [0.06, 0.53, 0.385, 0.52],
    ear: [-0.42, 0.06], hairDark: '#1c1618', hairMid: '#3a2c26', hairHi: '#7a5a44', lean: 1, age: 0.2, browCol: '#1a1416', iris: '#4a6a82',
  },
  henrik: {
    far: [[0.28, -0.76], [0.38, -0.58], [0.44, -0.38], [0.46, -0.22], [0.41, -0.09], [0.47, 0.06], [0.47, 0.24], [0.45, 0.42], [0.45, 0.58], [0.42, 0.74], [0.41, 0.88], [0.32, 1.0]],
    back: [[0.28, -0.76], [0.08, -0.94], [-0.28, -0.96], [-0.62, -0.78], [-0.80, -0.42], [-0.84, -0.06], [-0.76, 0.26], [-0.62, 0.46]],
    jaw: [[-0.40, 0.34], [-0.39, 0.56], [-0.34, 0.74], [-0.14, 0.92], [0.08, 0.99], [0.32, 1.0]],
    neck: [[-0.60, 0.48], [-0.58, 0.82], [-0.56, 1.35], [0.18, 1.35], [0.18, 1.12], [0.18, 1.0]],
    hair: [[0.26, -0.70], [0.10, -0.74], [-0.04, -0.70], [-0.14, -0.56], [-0.26, -0.40], [-0.30, -0.18], [-0.40, -0.22], [-0.52, -0.10], [-0.60, 0.12], [-0.66, 0.40], [-0.80, 0.22], [-0.88, -0.12], [-0.84, -0.50], [-0.66, -0.84], [-0.32, -1.02], [0.02, -1.0], [0.24, -0.90], [0.32, -0.80]],
    nose: { bridge: [[0.22, -0.10], [0.30, 0.06], [0.41, 0.19], [0.49, 0.26]], under: [[0.49, 0.26], [0.485, 0.33], [0.42, 0.355], [0.33, 0.35]], wing: [[0.19, 0.25], [0.15, 0.31], [0.21, 0.36], [0.30, 0.35]] },
    eyeN: [-0.02, -0.03, 0.12], eyeF: [0.33, -0.04, 0.072], mouth: [0.07, 0.55, 0.40, 0.54],
    ear: [-0.47, 0.07], hairDark: '#4a4642', hairMid: '#7a746c', hairHi: '#aaa296', lean: 0, age: 1, browCol: '#4a4440', iris: '#6a6a4a',
  },
};

function face(px0, py0, s, who, e, L = {}) {
  const C = HEADS[who], flip = who === 'henrik' ? -1 : 1, U = 270 * s;
  const key = L.key || K.amber, rim = L.rim || (who === 'julian' ? K.teal : K.magenta), dark = L.dark == null ? 0.5 : L.dark;
  const T = ([x, y]) => [px0 + flip * x * U, py0 + y * U];
  const TP = (pts) => pts.map(T);
  const W2 = (w) => w * s;
  const towardEar = (x, a, b) => (flip > 0 ? ss(px0 + a * U, px0 + b * U, x) : ss(px0 - a * U, px0 - b * U, x));
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // ---------- neck ----------
  pencilShape(TP(C.neck), rgba(K.skin, 0.35), [{ col: GR2, n: 500, len: 18 * s, ang: -0.9, a: 0.5, f: (x, y) => ss(py0 + 1.12 * U, py0 + 0.92 * U, y) * 0.9 + towardEar(x, 0.0, -0.4) * 0.5 }], { lw: W2(1.8), lineCol: GR });
  // ---------- shirt collar in the V, then the coat and its lapels ----------
  pencilShape(TP([[-0.36, 1.02], [-0.06, 1.18], [0.24, 1.0], [0.30, 1.5], [-0.30, 1.5]]), 'rgba(250,246,238,0.95)', [{ col: GR2, n: 120, len: 14 * s, a: 0.3 }], { lw: W2(1.8), lineCol: GR });
  if (who === 'henrik') pencilShape(TP(smooth([[-0.10, 1.14], [0.0, 1.13], [0.02, 1.2], [0.06, 1.62], [-0.06, 1.70], [-0.12, 1.62], [-0.10, 1.2]], true, 3)), rgba(K.crimson, 0.6), [{ col: K.crimson, n: 260, ang: -1.0, len: 18 * s, w: 1.5 * s }], { lw: W2(1.6), lineCol: GR });
  const coatV = TP([[-1.9, 2.4], [-1.75, 1.6], [-1.0, 1.2], [-0.52, 1.02], [-0.06, 1.75], [0.32, 1.02], [0.95, 1.22], [1.6, 1.62], [1.8, 2.4]]);
  pencilShape(coatV, rgba(who === 'julian' ? '#c8b89a' : '#8a8c96', 0.4), [{ col: GR2, n: 900, ang: -1.15, len: 46 * s, w: 1.6 * s, a: 0.5, f: (x) => towardEar(x, 0.6, -1.4) * 0.9 + 0.15 }, { col: GR, n: 500, ang: 0.5, len: 40 * s, w: 1.4 * s, a: 0.45, f: (x) => towardEar(x, -0.2, -1.6) }], { lw: W2(2.4), lineCol: GR });
  pline(TP(smooth([[-0.52, 1.04], [-0.78, 1.42], [-0.40, 1.95]], false, 4)), GR, W2(2), 0.75);
  pline(TP(smooth([[0.32, 1.04], [0.62, 1.42], [0.30, 1.95]], false, 4)), GR, W2(2), 0.75);
  const cc = rgba(who === 'julian' ? '#c8b89a' : '#8a8c96', 0.55);
  pencilShape(TP([[-0.70, 1.30], [-0.74, 0.86], [-0.56, 0.70], [-0.30, 1.02], [-0.16, 1.24]]), cc, [{ col: GR, n: 260, ang: 1.0, len: 24 * s, a: 0.5 }], { lw: W2(2.2), lineCol: GR });
  pencilShape(TP([[0.36, 1.30], [0.40, 0.96], [0.26, 0.86], [0.10, 1.10], [0.02, 1.28]]), cc, [{ col: GR2, n: 160, ang: -1.0, len: 22 * s, a: 0.4 }], { lw: W2(2.2), lineCol: GR });
  // ---------- head: a light skin wash, warm where the key light falls ----------
  const headPts = smooth(C.back.concat(C.neck.slice(0, 1)).concat(C.jaw).concat(C.far.slice().reverse().slice(1)), true, 5);
  const nosePts = smooth(C.nose.bridge, false, 6).concat(smooth(C.nose.under, false, 6).slice(1)).concat([[0.30, 0.33], [0.26, 0.12], [0.22, -0.08]]);
  const area = (pts) => pts.reduce((a2, p, i) => { const q = pts[(i + 1) % pts.length]; return a2 + p[0] * q[1] - q[0] * p[1]; }, 0);
  const headP = TP(headPts); let noseP = TP(nosePts); if (Math.sign(area(headP)) !== Math.sign(area(noseP))) noseP = noseP.reverse();
  const hb = bbox(headP.concat(noseP));
  const clipFace = () => { const pp = P2(headP); pp.addPath(P2(noseP)); ctx.clip(pp); };
  ctx.save(); clipFace();
  ctx.fillStyle = PAPERC; ctx.fillRect(hb[0], hb[1], hb[2] - hb[0], hb[3] - hb[1]);
  ctx.fillStyle = rgba(K.skin, 0.32); ctx.fillRect(hb[0], hb[1], hb[2] - hb[0], hb[3] - hb[1]);
  strokes(hb, K.skin, Math.round(900 * s), { ang: -0.95, len: 24 * s, w: 1.5 * s, a: 0.35 });
  strokes(hb, key, Math.round(600 * s), { ang: -0.95, len: 18 * s, w: 1.4 * s, a: 0.4, f: (x) => towardEar(x, 0.05, 0.45) });
  ctx.restore();
  // ---------- graphite hatching on the planes turned from the light ----------
  const hatchIn = (pts, col, n, op = {}) => { const p = TP(smooth(pts, true, 4)); ctx.save(); clipFace(); ctx.clip(P2(p)); strokes(bbox(p), col, Math.round(n * s), Object.assign({ ang: flip > 0 ? -0.9 : -2.24, len: 22 * s, w: 1.3 * s, a: 0.55 * (0.6 + 0.8 * dark), jitAng: 0.12, curve: 0.05 }, op)); ctx.restore(); };
  const sideP = [[-0.24, -0.62], [-0.16, -0.30], [-0.15, 0.04], [-0.20, 0.20], [-0.13, 0.46], [-0.10, 0.66], [-0.08, 0.90], [-0.40, 0.80], [-0.72, 0.40], [-0.82, -0.20], [-0.60, -0.70]];
  hatchIn(sideP, GR, 1300); hatchIn(sideP.map(([x, y]) => [x - 0.08, y]), GR, 600, { ang: flip > 0 ? 0.7 : 2.44 });
  hatchIn(sideP, rim, 260, { len: 16 * s, a: 0.35 });
  hatchIn([[-0.16, -0.18], [0.12, -0.21], [0.16, -0.08], [0.06, 0.02], [-0.14, -0.02]], GR2, 260, { len: 12 * s, a: 0.4 });
  hatchIn([[0.22, -0.20], [0.40, -0.19], [0.40, -0.04], [0.26, -0.02]], GR, 200, { len: 11 * s, a: 0.45 });
  hatchIn([[-0.14, 0.18], [0.06, 0.24], [0.10, 0.40], [-0.04, 0.50], [-0.14, 0.42]], GR2, 260 * (0.5 + 0.7 * C.lean), { len: 14 * s, a: 0.4 });
  hatchIn([[0.24, 0.345], [0.36, 0.35], [0.38, 0.38], [0.30, 0.40], [0.24, 0.38]], GR2, 70, { len: 8 * s, a: 0.3 });
  hatchIn([[0.12, 0.64], [0.36, 0.63], [0.36, 0.71], [0.14, 0.72]], GR2, 140, { len: 10 * s, a: 0.4 });
  hatchIn([[-0.30, 0.66], [0.10, 0.92], [0.32, 0.98], [0.30, 1.06], [-0.10, 1.04], [-0.40, 0.84]], GR, 380, { len: 15 * s, a: 0.55 });
  hatchIn([[0.18, -0.06], [0.24, 0.04], [0.30, 0.18], [0.24, 0.24], [0.16, 0.10]], GR2, 110, { len: 9 * s, a: 0.35 });
  if (who === 'julian') { const st = TP(smooth([[-0.28, 0.40], [-0.10, 0.62], [0.10, 0.62], [0.42, 0.70], [0.38, 0.98], [0.10, 0.96], [-0.30, 0.68]], true, 4)); ctx.save(); ctx.clip(P2(headP)); ctx.clip(P2(st)); strokes(bbox(st), GR2, Math.round(900 * s), { len: 3.5 * s, w: 1.1 * s, a: 0.35, jitAng: 3 }); ctx.restore(); }
  // ---------- hair: locks drawn as long graphite strokes, swept back ----------
  const hairP = TP(smooth(C.hair, true, 5));
  ctx.save(); ctx.clip(P2(hairP));
  const hbb = bbox(hairP); ctx.fillStyle = PAPERC; ctx.fillRect(hbb[0], hbb[1], hbb[2] - hbb[0], hbb[3] - hbb[1]); ctx.fillStyle = rgba(C.hairMid, who === 'julian' ? 0.55 : 0.35); ctx.fillRect(hbb[0], hbb[1], hbb[2] - hbb[0], hbb[3] - hbb[1]);
  const hr = rng(who === 'julian' ? 31 : 47);
  for (let i = 0; i < 420; i++) {
    const t = hr(), u = hr(), sx = lerp(0.5, -0.8, t) + (hr() - 0.5) * 0.1, sy0 = -1.05 + u * 0.55 + Math.max(0, -sx - 0.2) * 0.9;
    const len = (0.18 + hr() * 0.22) * (who === 'julian' ? 1.1 : 0.8), dx = -len * (0.9 - Math.max(0, -sx) * 0.4), dy = len * (0.15 + Math.max(0, -sx) * 0.9);
    const lit = sx > -0.1, r2 = hr(), col = r2 < (lit ? 0.35 : 0.1) ? C.hairHi : r2 < 0.6 ? C.hairMid : C.hairDark;
    const a = T([sx, sy0]), b = T([sx + dx * 0.5, sy0 + dy * 0.5 - 0.04]), c = T([sx + dx, sy0 + dy]);
    ctx.globalAlpha = 0.45 + hr() * 0.45; ctx.strokeStyle = tooth(col, 1); ctx.lineWidth = (1.2 + hr() * 1.8) * s;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(b[0], b[1], c[0], c[1]); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.restore();
  pline(hairP.filter((_, i) => i % 2 === 0).concat([hairP[0]]), GR, W2(1.8), 0.6, 2, 1);
  // ---------- ear ----------
  const [ex0, ey0] = C.ear;
  const earPts = [[ex0 + 0.06, ey0 - 0.20], [ex0 - 0.04, ey0 - 0.22], [ex0 - 0.09, ey0 - 0.12], [ex0 - 0.08, ey0 + 0.04], [ex0 - 0.05, ey0 + 0.16], [ex0 + 0.02, ey0 + 0.25], [ex0 + 0.08, ey0 + 0.22], [ex0 + 0.07, ey0 + 0.08], [ex0 + 0.09, ey0 - 0.08]];
  pencilShape(TP(smooth(earPts, true, 4)), rgba(K.skin, 0.45), [{ col: GR2, n: 140, len: 8 * s, a: 0.45, f: (x) => towardEar(x, ex0 + 0.04, ex0 - 0.06) }, { col: K.magenta, n: 60, len: 7 * s, a: 0.35 }], { lw: W2(2), lineCol: GR });
  pline(TP(smooth([[ex0 + 0.03, ey0 - 0.14], [ex0 - 0.04, ey0 - 0.12], [ex0 - 0.05, ey0 + 0.02], [ex0 - 0.02, ey0 + 0.12], [ex0 + 0.03, ey0 + 0.1]], false, 4)), GR, W2(1.5), 0.65);
  // ---------- contours: confident lines on the shadow side, lighter on the lit side ----------
  pline(TP(smooth(C.far, false, 6)), GR, W2(2.4), 0.85, 2, 1);
  pline(TP(smooth(C.jaw, false, 6)), GR, W2(2.8), 0.9, 2, 1);
  pline(TP(smooth(C.back.slice(4), false, 6)), GR, W2(2.2), 0.7, 2, 1);
  pline(TP(smooth([[-0.56, 0.44], [-0.52, 0.80], [-0.50, 1.3]], false, 4)), GR, W2(2), 0.7);
  pline(TP(smooth([[0.16, 0.97], [0.14, 1.12], [0.14, 1.3]], false, 4)), GR, W2(2), 0.7);
  pline(TP(C.back.slice(2)), rim, W2(3), 0.5, 2, 1.5);
  if (C.lean) pline(TP(smooth([[-0.16, 0.12], [-0.10, 0.24], [-0.04, 0.42]], false, 4)), GR2, W2(1.3), 0.45);
  if (e.clench > 0.05) pline(TP(smooth([[-0.24, 0.42], [-0.22, 0.56], [-0.18, 0.66]], false, 4)), GR, W2(1.6), e.clench * 0.7);
  if (C.age > 0.5) { for (let i = 0; i < 3; i++) pline(TP(smooth([[-0.06, -0.48 - i * 0.07], [0.14, -0.50 - i * 0.07], [0.32, -0.47 - i * 0.07]], false, 4)), GR2, W2(1.2), 0.3 + 0.2 * e.brow); pline(TP(smooth([[0.16, 0.66], [0.10, 0.80], [0.06, 0.88]], false, 4)), GR2, W2(1.3), 0.45); }
  // ---------- nose ----------
  const N = C.nose;
  pline(TP(smooth(N.bridge, false, 6)), GR, W2(2.2), 0.85, 2, 0.8);
  pline(TP(smooth(N.under, false, 6)), GR, W2(2.5), 0.9, 2, 0.8);
  pline(TP(smooth(N.wing, false, 6)), GR, W2(2.1), 0.85, 2, 0.8);
  const nos = T([0.27, 0.315]); ctx.fillStyle = 'rgba(40,30,36,0.7)'; ctx.beginPath(); ctx.ellipse(nos[0], nos[1], 0.033 * U, 0.012 * U, flip * 0.15, 0, Math.PI * 2); ctx.fill();
  const sm2 = Math.max(0, e.smile), dNL = 0.35 + 0.5 * sm2 + 0.25 * C.age;
  pline(TP(smooth([[0.17, 0.31], [0.08, 0.42 - 0.03 * sm2], [0.04 - 0.03 * sm2, 0.56 - 0.04 * sm2]], false, 5)), GR, W2(1.7), dNL);
  pline(TP(smooth([[0.40, 0.33], [0.43, 0.44], [0.42, 0.54]], false, 4)), GR2, W2(1.3), dNL * 0.6);
  // ---------- eyes ----------
  const eye = ([cx, cy, w], near) => {
    const op = clamp(e.open, 0, 1.45), lift = sm2 * 0.018 + e.crinkle * 0.012, hgt = 0.05 * op;
    const inner = [cx + w * 0.92, cy + 0.006], outer = [cx - w, cy - 0.004];
    const lid = TP(smooth([outer, [cx - w * 0.45, cy - hgt * 0.95], [cx + w * 0.25, cy - hgt], inner], false, 6));
    const low = TP(smooth([inner, [cx + w * 0.25, cy + 0.032 - lift], [cx - w * 0.45, cy + 0.03 - lift], outer], false, 6));
    if (op > 0.08) {
      ctx.save(); ctx.clip(P2(lid.concat(low))); const bb2 = bbox(lid.concat(low));
      ctx.fillStyle = 'rgba(246,240,228,0.95)'; ctx.fillRect(bb2[0] - 2, bb2[1] - 2, bb2[2] - bb2[0] + 4, bb2[3] - bb2[1] + 4);
      const ic = T([cx + w * 0.12 + e.gx * w * 0.35, cy + e.gy * 0.015]), ir = 0.046 * U * (near ? 1 : 0.85), sq = near ? 0.92 : 0.7;
      ctx.fillStyle = C.iris; ctx.beginPath(); ctx.ellipse(ic[0], ic[1], ir * sq, ir, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0a0e'; ctx.beginPath(); ctx.ellipse(ic[0], ic[1], ir * 0.42 * (1 + 0.3 * e.pupil) * sq, ir * 0.42 * (1 + 0.3 * e.pupil), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.95 * (L.glint == null ? 1 : L.glint)); ctx.beginPath(); ctx.arc(ic[0] + flip * 0.012 * U, ic[1] - 0.016 * U, 0.009 * U, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(60,50,56,0.35)'; ctx.fillRect(bb2[0], bb2[1], bb2[2] - bb2[0], 0.02 * U);
      ctx.restore();
    }
    pline(lid, '#1a181e', W2(near ? 3.2 : 2.6), 0.95, 2, 0.6); pline(low.slice(3, -3), GR2, W2(1.3), 0.55);
    pline(TP(smooth([[cx - w * 0.85, cy - hgt - 0.03], [cx - w * 0.2, cy - hgt - 0.045], [cx + w * 0.7, cy - hgt * 0.4 - 0.03]], false, 5)), GR2, W2(1.3), 0.5);
    if (e.tired > 0 || C.age > 0.5) pline(TP(smooth([[cx - w * 0.7, cy + 0.07], [cx, cy + 0.085], [cx + w * 0.6, cy + 0.065]], false, 5)), GR2, W2(1.2), 0.25 + 0.35 * Math.max(e.tired, C.age));
    if (e.crinkle > 0.05) for (let i = 0; i < 3; i++) pline(TP([[cx - w * 1.05, cy - 0.01 + i * 0.03], [cx - w * 1.5, cy - 0.03 + i * 0.055]]), GR2, W2(1.2), e.crinkle * 0.7);
  };
  eye(C.eyeN, true); eye(C.eyeF, false);
  const brow = (x0, x1, yb, near) => {
    for (let i = 0; i < 26; i++) {
      const u = i / 25, x = lerp(x0, x1, u), inner = near ? u : 1 - u;
      const y = yb - 0.04 * e.brow - 0.03 * Math.sin(u * Math.PI) * (near ? 1 : 0.8) + e.furrow * 0.04 * Math.pow(inner, 2) - 0.015 * e.brow * Math.pow(inner, 2);
      pline([T([x, y]), T([x + 0.03, y - 0.022 * (1 - 0.5 * Math.abs(u - 0.4))])], C.browCol, W2((near ? 3.4 : 2.8) - Math.abs(u - 0.35) * 2), 0.85, 1, 0.5);
    }
  };
  brow(-0.17, 0.13, -0.17, true); brow(0.23, 0.42, -0.19, false);
  if (e.furrow > 0.1) { pline(TP([[0.17, -0.20], [0.18, -0.10]]), GR, W2(1.5), e.furrow * 0.6); pline(TP([[0.21, -0.21], [0.215, -0.12]]), GR2, W2(1.2), e.furrow * 0.45); }
  // ---------- mouth ----------
  const [nx, ny, fx, fy] = C.mouth, mid = [(nx + fx) / 2 + 0.03, (ny + fy) / 2 + 0.01];
  const nC = [nx - 0.02 * sm2, ny - 0.045 * sm2 - 0.02 * e.asym], fC = [fx + 0.01 * sm2, fy - 0.035 * sm2 + 0.015 * e.asym];
  const line = smooth([nC, [lerp(nC[0], mid[0], 0.5), mid[1] + 0.008 + 0.01 * sm2], mid, [lerp(mid[0], fC[0], 0.6), mid[1] + 0.005], fC], false, 6);
  const upLip = smooth([nC, [lerp(nC[0], mid[0], 0.5), mid[1] - 0.035], [mid[0] - 0.02, mid[1] - 0.05], [mid[0] + 0.02, mid[1] - 0.048], [lerp(mid[0], fC[0], 0.6), mid[1] - 0.03], fC], false, 5);
  const loLip = smooth([fC, [lerp(mid[0], fC[0], 0.5), mid[1] + 0.06 + e.mouth * 0.09], [mid[0] - 0.03, mid[1] + 0.07 + e.mouth * 0.09], nC], false, 5);
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = tooth(K.crimson, 1); ctx.fill(P2(TP(upLip.concat(line.slice().reverse())))); ctx.globalAlpha = 0.25; ctx.fill(P2(TP(line.concat(loLip)))); ctx.restore();
  if (e.mouth > 0.04) {
    const open = line.map(([x, y], i) => [x, y + e.mouth * 0.075 * Math.sin((i / (line.length - 1)) * Math.PI)]);
    ctx.fillStyle = '#2a161c'; ctx.fill(P2(TP(line.concat(open.slice().reverse()))));
    if (sm2 > 0.3) { ctx.fillStyle = 'rgba(246,240,228,0.9)'; ctx.fill(P2(TP(line.concat(line.map(([x, y], i) => [x, y + 0.022 * Math.sin((i / (line.length - 1)) * Math.PI)]).reverse())))); }
    pline(TP(open), GR, W2(1.5), 0.7);
  }
  pline(TP(line), '#1e1418', W2(2.6), 0.92, 2, 0.6);
  pline(TP(upLip.slice(3, -3)), GR2, W2(1.3), 0.4);
  pline(TP(smooth([[mid[0] - 0.06, mid[1] + 0.085 + e.mouth * 0.09], [mid[0], mid[1] + 0.095 + e.mouth * 0.09], [mid[0] + 0.07, mid[1] + 0.08 + e.mouth * 0.09]], false, 4)), GR2, W2(1.3), 0.45);
  pline(TP([[mid[0] - 0.015, 0.36], [mid[0] - 0.02, mid[1] - 0.05]]), GR2, W2(1.1), 0.35);
  ctx.restore();
}
