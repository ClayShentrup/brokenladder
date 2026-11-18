// Face rig v4: sketch portraits built on measured anatomy.
// The face is the standard 68-point landmark model (mean of real faces, in mm; see lm68.js): jawline 0-16,
// brows 17-26, nose bridge 27-30, nose base 31-35, eyes 36-47, lips 48-67. Characters are measured
// offsets from that average; expressions move the landmarks themselves. The cranium is an ellipsoid fitted
// to the landmarks with standard proportions (hairline-brow = brow-nose base = nose base-chin; head
// ~150 mm wide, ~195 mm front to back, crown ~227 mm above the chin). The head is turned three-quarters
// (about 35 degrees) and projected; everything is drawn in graphite with colored-pencil washes.
'use strict';
const EX = { neutral: { brow: 0, furrow: 0, open: 1, gx: 0, gy: 0, smile: 0, asym: 0, mouth: 0, crinkle: 0, clench: 0, tired: 0, pupil: 0 } };
function mix(a, b, u) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k] == null ? a[k] : b[k], u); return o; }
function ex(o) { return Object.assign({}, EX.neutral, o); }
function exAt(keys, t, d = 0.5) { let cur = ex(keys[0][1]); for (let i = 1; i < keys.length; i++) { const [tk, e] = keys[i]; if (t < tk) break; cur = mix(cur, ex(e), eIO(prog(t, tk, tk + d))); } return cur; }
const GR = '#34323a', GR2 = '#5a5862';
const MMPX = 540 / 227, YC = -36.5; // px per mm at scale 1; vertical centre of the head in mm

const PEOPLE = {
  // julian: lean, a touch narrower, longer lower face, deeper-set eyes, dark hair swept to the side
  julian: { sx: 0.95, jaw: 0.97, lower: 1.05, nose: 0.98, lip: 1.0, deep: 1.25, age: 0.2, lean: 1, iris: '#4a6a82', brow: '#1c1618', hairDark: '#1c1618', hairMid: '#3a2c26', hairHi: '#76583f', hairY: -118, hairC: 10, recede: 0, part: 0.35 },
  // henrik: broader, heavier jaw, wider nose, thinner lips, older, grey hair combed straight back
  henrik: { sx: 1.05, jaw: 1.09, lower: 1.03, nose: 1.14, lip: 0.8, deep: 1.0, age: 1, lean: 0, iris: '#6a6a4a', brow: '#4a4440', hairDark: '#5a5650', hairMid: '#8a8478', hairHi: '#b4ac9e', hairY: -114, hairC: 8, recede: 16, part: 0 },
};
function landmarks(C, e) {
  const P = LM68.map((p) => p.slice());
  P.forEach((p, i) => {
    p[0] *= C.sx;
    if (i <= 16) { const w = Math.sin((i / 16) * Math.PI); p[0] *= lerp(1, C.jaw, w); }
    if (p[1] > 6.6) p[1] = 6.6 + (p[1] - 6.6) * C.lower;
    if (i >= 31 && i <= 35) p[0] *= C.nose;
    if (i >= 36 && i <= 47) p[2] += 10 * (C.deep - 1);
  });
  const sm2 = Math.max(0, e.smile);
  for (let i = 17; i <= 26; i++) { const inner = i <= 21 ? (i - 17) / 4 : (26 - i) / 4; P[i][1] -= e.brow * (6 + 3 * inner) - e.furrow * 6 * inner * inner; P[i][0] *= 1 - 0.06 * e.furrow * inner; }
  [[36, 41], [42, 47]].forEach(([a]) => {
    const cy = (P[a][1] + P[a + 3][1]) / 2;
    [a + 1, a + 2].forEach((i) => { P[i][1] = cy + (P[i][1] - cy) * e.open; });
    [a + 4, a + 5].forEach((i) => { P[i][1] = cy + (P[i][1] - cy) * (1 - 0.35 * sm2 - 0.2 * e.crinkle); });
  });
  const lift = (i, dy, dx = 0) => { P[i][1] -= dy; P[i][0] += dx; };
  lift(48, sm2 * 7 + e.asym * 2.5, -sm2 * 4); lift(60, sm2 * 6 + e.asym * 2.5, -sm2 * 3); lift(54, sm2 * 7 - e.asym * 2.5, sm2 * 4); lift(64, sm2 * 6 - e.asym * 2.5, sm2 * 3);
  [49, 59, 61, 67, 53, 55, 63, 65].forEach((i) => lift(i, sm2 * 3));
  const op = e.mouth * 16;
  [[55, 0.6], [56, 0.9], [57, 1], [58, 0.9], [59, 0.6], [65, 0.6], [66, 1], [67, 0.6]].forEach(([i, kk]) => { P[i][1] += op * kk; });
  for (let i = 4; i <= 12; i++) P[i][1] += e.mouth * 9 * Math.exp(-Math.pow((i - 8) / 3, 2));
  [50, 51, 52].forEach((i) => { P[i][1] = P[62][1] + (P[i][1] - P[62][1]) * C.lip; });
  [56, 57, 58].forEach((i) => { P[i][1] = P[66][1] + (P[i][1] - P[66][1]) * C.lip; });
  return P;
}
function hull(pts) { const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } up.pop(); lo.pop(); return lo.concat(up); }

function face(px0, py0, s, who, e, L = {}) {
  const C = PEOPLE[who], th = L.yaw != null ? L.yaw : (who === 'julian' ? 0.6 : -0.6), ct = Math.cos(th), st = Math.sin(th), fs = Math.sign(th) || 1;
  const key = L.key || K.amber, rim = L.rim || (who === 'julian' ? K.teal : K.magenta), dark = L.dark == null ? 0.5 : L.dark, k = MMPX * s;
  const PJ = ([x, y, z]) => { const d = -z; return [px0 + (x * ct + d * st) * k, py0 + (y - YC) * k]; };
  const LMs = landmarks(C, e), Q = LMs.map(PJ);
  const mid = (a, b, u = 0.5) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const W2 = (w) => w * s;
  // cranium ellipsoid (mm): centre (0, -62, z 85 behind the face), radii x 75, y 88, z 97
  const rx = 79 * C.sx, ry = 90, rz = 108, cz = 95, cyc = -58;
  const cr = []; for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, ax = Math.sqrt(Math.pow(rx * ct, 2) + Math.pow(rz * st, 2)); cr.push([px0 + (-cz * st + Math.cos(a) * ax) * k, py0 + (cyc + Math.sin(a) * ry - YC) * k]); }
  const onSkull = (x, y, lift2 = 4) => { const v = 1 - Math.pow(x / rx, 2) - Math.pow((y - cyc) / ry, 2); return [x, y, cz - rz * Math.sqrt(Math.max(0, v)) - lift2]; };
  const near = -fs; // x sign of the side of the face nearer the viewer
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // ---------- neck: a vertical cylinder behind the chin ----------
  const ncx = px0 + (-92 * st) * k, nr = 50 * C.sx * k;
  const neckP = [[ncx - nr, py0 + (-10 - YC) * k], [ncx + nr, py0 + (-10 - YC) * k], [ncx + nr * 1.04, py0 + (230 - YC) * k], [ncx - nr * 1.04, py0 + (230 - YC) * k]];
  pencilShape(neckP, rgba(K.skin, 0.4), [{ col: GR2, n: 400, len: 18 * s, ang: -1.0, a: 0.45, f: (x, y) => ss(py0 + (110 - YC) * k, py0 + (80 - YC) * k, y) * 0.9 + 0.15 }], { lw: W2(1.8), lineCol: GR });
  // shirt, tie, coat, raised collar
  const B = (x, y) => [px0 + x * k * fs, py0 + (y - YC) * k];
  pencilShape([B(-60, 110), B(-8, 150), B(40, 105), B(50, 210), B(-70, 210)], 'rgba(250,246,238,0.95)', [{ col: GR2, n: 100, len: 14 * s, a: 0.3 }], { lw: W2(1.8), lineCol: GR });
  if (who === 'henrik') pencilShape(smooth([B(-16, 122), B(-2, 120), B(2, 132), B(8, 230), B(-8, 240), B(-20, 230), B(-16, 132)], true, 3), rgba(K.crimson, 0.6), [{ col: K.crimson, n: 220, ang: -1.0, len: 16 * s, w: 1.5 * s }], { lw: W2(1.6), lineCol: GR });
  const coatTone = rgba(who === 'julian' ? '#c8b89a' : '#8a8c96', 0.45);
  pencilShape([B(-400, 400), B(-370, 200), B(-210, 128), B(-110, 112), B(-12, 245), B(70, 108), B(200, 126), B(340, 196), B(380, 400)], coatTone, [{ col: GR2, n: 900, ang: -1.15, len: 44 * s, w: 1.6 * s, a: 0.5, f: (x) => (fs * (x - px0) < 0 ? 0.9 : 0.25) }, { col: GR, n: 400, ang: 0.5, len: 40 * s, w: 1.4 * s, a: 0.4, f: (x) => (fs * (x - px0) < -60 * k ? 0.8 : 0) }], { lw: W2(2.4), lineCol: GR });
  pline(smooth([B(-110, 114), B(-170, 190), B(-80, 300)], false, 4), GR, W2(2), 0.75); pline(smooth([B(70, 110), B(130, 190), B(60, 300)], false, 4), GR, W2(2), 0.75);
  pencilShape([B(-150, 210), B(-160, 95), B(-112, 60), B(-62, 118), B(-36, 190)], coatTone, [{ col: GR, n: 260, ang: 1.0, len: 22 * s, a: 0.45 }], { lw: W2(2.2), lineCol: GR });
  pencilShape([B(90, 210), B(100, 120), B(70, 92), B(40, 128), B(20, 190)], coatTone, [{ col: GR2, n: 160, ang: -1.0, len: 20 * s, a: 0.4 }], { lw: W2(2.2), lineCol: GR });
  // ---------- head silhouette: the cranium and the jaw, filled with paper and a skin wash ----------
  const jawPts = []; for (let i = 0; i <= 16; i++) jawPts.push(Q[i]);
  const earFrontX = PJ([near * 76, -20, 68])[0];
  const headH = hull(cr.filter((p) => p[1] < py0 + (-40 - YC) * k && fs * (p[0] - PJ([near * 77, -20, 84])[0]) > 0).concat(jawPts).concat([Q[27], Q[30], Q[8], PJ([near * 74, 8, 66]), PJ([near * 74, -52, 64]), PJ([near * 77, 6, 84]), PJ([near * 77, -54, 84])]));
  const hb = bbox(headH);
  ctx.save(); ctx.clip(P2(headH));
  ctx.fillStyle = PAPERC; ctx.fillRect(hb[0], hb[1], hb[2] - hb[0], hb[3] - hb[1]);
  ctx.fillStyle = rgba(K.skin, 0.34); ctx.fillRect(hb[0], hb[1], hb[2] - hb[0], hb[3] - hb[1]);
  strokes(hb, K.skin, Math.round(900 * s), { ang: -0.95, len: 22 * s, w: 1.4 * s, a: 0.35 });
  const nose0 = Q[30][0];
  strokes(hb, key, Math.round(700 * s), { ang: -0.95, len: 18 * s, w: 1.4 * s, a: 0.4, f: (x) => ss(nose0 - fs * 30 * k, nose0 + fs * 20 * k, x) });
  ctx.restore();
  const clipHead = () => ctx.clip(P2(headH));
  const hatch2 = (poly, col, n, op = {}) => { const pp = smooth(poly, true, 4); ctx.save(); clipHead(); ctx.clip(P2(pp)); strokes(bbox(pp), col, Math.round(n * s), Object.assign({ ang: fs > 0 ? -0.9 : -2.24, len: 20 * s, w: 1.3 * s, a: 0.55 * (0.6 + 0.8 * dark), jitAng: 0.12, curve: 0.05 }, op)); ctx.restore(); };
  // ---------- planes in shadow (key light from where he is looking) ----------
  const nIdx = (a, b) => (near < 0 ? a : b);
  const eo = Q[nIdx(36, 45)], bo = Q[nIdx(17, 26)], j0 = Q[nIdx(0, 16)], j3 = Q[nIdx(3, 13)], j5 = Q[nIdx(5, 11)], mc = Q[nIdx(48, 54)], nw = Q[nIdx(31, 35)];
  const temple = PJ(onSkull(near * 62, -95)), earTop = PJ(onSkull(near * 74, -40));
  const sidePlane = [temple, bo, mid(bo, eo, 0.6), mid(eo, j3, 0.45), mid(j3, mc, 0.35), mid(j5, Q[8], 0.25), j5, j3, j0, earTop];
  hatch2(sidePlane, K.skin2, 700, { a: 0.4 }); hatch2(sidePlane, GR2, 450, { a: 0.3 }); hatch2(sidePlane, GR2, 160, { ang: fs > 0 ? 0.7 : 2.44, a: 0.2 }); 
  [[17, 18, 19, 20, 21, 39, 38, 37, 36], [22, 23, 24, 25, 26, 45, 44, 43, 42]].forEach((ix, n) => hatch2(ix.map((i) => Q[i]), (n === 0) === (near < 0) ? GR : GR2, 220, { len: 10 * s, a: 0.4 }));
  hatch2([Q[27], Q[28], Q[29], Q[30], Q[nIdx(32, 34)], nw, mid(nw, Q[nIdx(39, 42)], 0.5)], GR2, 180, { len: 9 * s, a: 0.4 });
  hatch2([Q[31], Q[32], Q[33], Q[34], Q[35], Q[52], Q[51], Q[50]], GR2, 70, { len: 7 * s, a: 0.28 });
  hatch2([Q[59], Q[58], Q[57], Q[56], Q[55], mid(Q[55], Q[10], 0.25), mid(Q[57], Q[8], 0.3), mid(Q[59], Q[6], 0.25)], GR2, 120, { len: 9 * s, a: 0.35 });
  hatch2([mid(eo, j3, 0.5), mid(j3, mc, 0.25), mid(j5, mc, 0.35), mid(j3, j5, 0.6)], GR2, 200 * (0.5 + 0.8 * C.lean), { len: 12 * s, a: 0.35 });
  const under = []; for (let i = 2; i <= 14; i++) under.push(Q[i]); for (let i = 14; i >= 2; i--) under.push([Q[i][0], Q[i][1] + 22 * k]);
  { const pp = smooth(under, true, 3); ctx.save(); ctx.clip(P2(neckP)); ctx.clip(P2(pp)); strokes(bbox(pp), GR, Math.round(300 * s), { ang: fs > 0 ? -0.9 : -2.24, len: 14 * s, w: 1.3 * s, a: 0.5 }); ctx.restore(); }
  hatch2([PJ(onSkull(-near * 50, C.hairY + 8)), PJ(onSkull(0, C.hairY + 4)), PJ(onSkull(near * 55, C.hairY + 14)), PJ(onSkull(near * 58, C.hairY + 30)), PJ(onSkull(0, C.hairY + 18)), PJ(onSkull(-near * 50, C.hairY + 22))], GR2, 160, { len: 10 * s, a: 0.25 });
  if (who === 'julian') { const stb = [Q[2], Q[4], Q[6], Q[8], Q[10], Q[12], Q[14], mid(Q[54], Q[14], 0.4), Q[55], Q[57], Q[59], mid(Q[48], Q[2], 0.4)]; ctx.save(); clipHead(); ctx.clip(P2(smooth(stb, true, 3))); strokes(bbox(stb), GR2, Math.round(300 * s), { len: 2.5 * s, w: 0.9 * s, a: 0.18, jitAng: 3 }); ctx.restore(); }
  // ---------- hair: an outline built from anchors on the skull, filled with locks ----------
  const MM = (p, dx, dy) => [p[0] + fs * dx * k, p[1] + dy * k]; // offset a projected point by mm (dx toward the face)
  const hy = C.hairY, rec = C.recede;
  const tFar = PJ(onSkull(-near * 58, hy + C.hairC + 6, 2)), front = PJ(onSkull(0, hy, 2)), tNear = PJ(onSkull(near * 52, hy + C.hairC + rec * 0.8, 2));
  const sideb = PJ(onSkull(near * 70, -70, 2)), earTopP = PJ([near * 78, -58, 74]), behindEar = PJ([near * 76, -20, 110]), nape = PJ([near * 40, 26, 170]);
  const crTop = cr.reduce((a2, p) => (p[1] < a2[1] ? p : a2)), crBack = cr.reduce((a2, p) => (fs * p[0] < fs * a2[0] ? p : a2));
  const J = who === 'julian';
  const fringe = J ? 20 : 9, crownUp = J ? 14 : 7;
  // the skull's whole upper arc, front to back, pushed out for the hair's thickness
  const ccx2 = px0 + (-cz * st) * k, ccy2 = py0 + (cyc - YC) * k;
  const arc = cr.filter((p) => p[1] < ccy2 + 0.35 * ry * k && (fs * (p[0] - front[0]) < -6 * k || p[1] < front[1] - 6 * k)).sort((a2, b2) => fs * (b2[0] - a2[0]))
    .map(([x, y]) => { const up = Math.max(0, (ccy2 - y) / (ry * k)); return [ccx2 + (x - ccx2) * 1.07, ccy2 + (y - ccy2) * 1.07 - crownUp * k * up]; });
  const napeP = PJ([near * 50, 2, 160]);
  const outline = [MM(tFar, 2, 2), MM(tFar, 6, -fringe * 0.7), MM(front, 6, -fringe), MM(front, -6, -fringe - 6)]
    .concat(arc)
    .concat([MM(napeP, 0, 0), MM(behindEar, 2, -10), MM(earTopP, 2, -2), MM(sideb, 4, 8), MM(tNear, 0, 6), MM(tNear, 6, -2)]);
  // hairline between the near temple and the far temple: dips and a widow's-peak-free curve with a little irregularity
  const hairline = []; const hn = rng(J ? 3 : 4);
  for (let i = 1; i < 10; i++) { const u = i / 10, x = lerp(near * 52, -near * 58, u), ax = Math.abs(x) / 58; hairline.push(MM(PJ(onSkull(x, hy + C.hairC * ax * ax + rec * Math.exp(-Math.pow((ax - 0.75) / 0.2, 2)), 2)), 0, (hn() - 0.5) * 4)); }
  const hairOut = smooth(outline.concat(hairline), true, 5);
  const hairP = P2(hairOut), hbb = bbox(hairOut);
  ctx.save(); ctx.clip(hairP);
  ctx.fillStyle = PAPERC; ctx.fillRect(hbb[0], hbb[1], hbb[2] - hbb[0], hbb[3] - hbb[1]);
  ctx.fillStyle = rgba(C.hairMid, J ? 0.7 : 0.5); ctx.fillRect(hbb[0], hbb[1], hbb[2] - hbb[0], hbb[3] - hbb[1]);
  // locks: long strokes flowing from the front hairline back over the crown and down behind the ear
  const hr = rng(J ? 31 : 47), partX = lerp(front[0], tNear[0], C.part);
  for (let i = 0; i < 1300; i++) {
    const u = hr(), v = hr(), x0 = lerp(hbb[0], hbb[2], u), y0 = lerp(hbb[1], hbb[3], v);
    const backward = fs * (partX - x0) / ((hbb[2] - hbb[0]) || 1); // >0 behind the part
    const ang = Math.atan2(0.25 + 0.9 * clamp(v * 1.4 - 0.2), -fs * (0.9 + 0.3 * backward)) + (hr() - 0.5) * 0.35;
    const len = (24 + hr() * 46) * k * (J ? 1.1 : 0.8), r2 = hr();
    const lit = fs * (x0 - px0) > -20 * k && v < 0.5, col = r2 < (lit ? 0.4 : 0.12) ? C.hairHi : r2 < 0.62 ? C.hairMid : C.hairDark;
    ctx.globalAlpha = 0.45 + hr() * 0.45; ctx.strokeStyle = tooth(col, 1); ctx.lineWidth = (1.1 + hr() * 1.8) * s;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + Math.cos(ang) * len * 0.5, y0 + Math.sin(ang) * len * 0.5 - 5 * k, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len); ctx.stroke();
  }
  // a few clumps of shadow give the mass some form
  strokes(hbb, C.hairDark, Math.round(500 * s), { ang: fs > 0 ? 2.7 : 0.44, len: 30 * s, w: 1.6 * s, a: 0.5, f: (x, y) => ss(hbb[1] + (hbb[3] - hbb[1]) * 0.4, hbb[3], y) * 0.8 + (fs * (x - px0) < -60 * k ? 0.4 : 0) });
  ctx.globalAlpha = 1; ctx.restore();
  pline(hairOut.filter((_, i) => i % 2 === 0).concat([hairOut[0]]), GR, W2(1.6), 0.55, 2, 1.2);
  // loose strands breaking the silhouette
  for (let i = 0; i < 14; i++) { const p = hairOut[Math.floor(hr() * hairOut.length * 0.55)]; pline([p, [p[0] - fs * (6 + hr() * 10) * k, p[1] + (hr() - 0.6) * 8 * k]], C.hairDark, W2(1.2), 0.6); }
  // ---------- ear (near side): in the side plane, behind the jaw, from brow line to nose base ----------
  const ear = []; for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; ear.push(PJ([near * 79, -28 + 31 * Math.sin(a) + (Math.sin(a) < 0 ? 3 * Math.sin(a) : 0), 82 + 15 * Math.cos(a) * (Math.cos(a) > 0 ? 1.1 : 0.85)])); }
  pencilShape(ear, rgba(K.skin, 0.55), [{ col: GR2, n: 120, len: 7 * s, a: 0.45 }, { col: K.magenta, n: 40, len: 6 * s, a: 0.3 }], { lw: W2(2), lineCol: GR });
  const ec = ear.reduce((a2, p) => [a2[0] + p[0] / ear.length, a2[1] + p[1] / ear.length], [0, 0]);
  pline(smooth(ear.slice(3, 18).map((p) => mid(p, ec, 0.38)), false, 4), GR, W2(1.4), 0.6);
  ctx.fillStyle = 'rgba(52,50,58,0.5)'; ctx.beginPath(); ctx.ellipse(ec[0] + fs * 2 * k, ec[1] + 4 * k, 2.5 * k, 4 * k, 0, 0, Math.PI * 2); ctx.fill();
  // ---------- contours ----------
  pline(smooth(jawPts.slice(near < 0 ? 2 : 8, near < 0 ? 9 : 15), false, 5), GR, W2(2.8), 0.9, 2, 1);
  const far = near < 0 ? [8, 9, 10, 11, 12, 13] : [8, 7, 6, 5, 4, 3]; pline(smooth(far.map((i) => Q[i]), false, 5), GR, W2(2.4), 0.85, 2, 1);
  const farTemple = PJ(onSkull(-near * 64, -88)), farBrow = Q[nIdx(26, 17)], farEye = Q[nIdx(45, 36)];
  pline(smooth([Q[far[far.length - 1]], mid(farEye, Q[far[far.length - 1]], 0.55), [farBrow[0] + fs * 4 * k, farBrow[1] + 2 * k], farTemple], false, 5), GR, W2(2), 0.75);
  const neckFront = [Q[8][0] - fs * 18 * k, py0 + (90 - YC) * k];
  pline([[ncx - fs * nr, py0 + (6 - YC) * k], [ncx - fs * nr * 1.04, py0 + (200 - YC) * k]], GR, W2(1.8), 0.7); pline([neckFront, [neckFront[0] - fs * 4 * k, py0 + (150 - YC) * k]], GR, W2(1.8), 0.7);
  if (C.age > 0.5) { for (let i = 0; i < 3; i++) { const y = -96 - i * 9; pline(smooth([PJ(onSkull(-30, y, 0)), PJ(onSkull(0, y - 2, 0)), PJ(onSkull(30, y, 0))], false, 4), GR2, W2(1.1), 0.25 + 0.2 * e.brow); } }
  if (e.clench > 0.05) pline(smooth([mid(j0, j3, 0.6), mid(j3, mc, 0.25), mid(j5, mc, 0.2)], false, 4), GR, W2(1.6), e.clench * 0.7);
  // ---------- brows: hairs along the landmark curve ----------
  [[17, 21], [22, 26]].forEach(([a, b]) => {
    const curve = smooth(Array.from({ length: b - a + 1 }, (_, i) => Q[a + i]), false, 6), isNear = (a === 17) === (near < 0), n = curve.length;
    const thick = (u) => (isNear ? 4.2 : 3.4) * k * (a === 17 ? 0.45 + 0.75 * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.62) : 0.45 + 0.75 * Math.sin(Math.min(1, (1 - u) * 1.15) * Math.PI * 0.62));
    const top = curve.map((p, i) => [p[0], p[1] - thick(i / (n - 1)) * 0.9]), bot = curve.map((p, i) => [p[0], p[1] + thick(i / (n - 1)) * 0.5]);
    const poly = top.concat(bot.slice().reverse());
    pencilShape(poly, rgba(C.brow, 0.55), [{ col: C.brow, n: 90, len: 5 * s, w: 1.3 * s, a: 0.8, ang: a === 17 ? -0.5 * fs - 0.2 : 0.5 * fs + 0.2 }], { line: false });
    pline(bot, C.brow, W2(1.4), 0.5);
  });
  if (e.furrow > 0.1) { const m0 = mid(Q[21], Q[22], 0.42); pline([m0, [m0[0], Q[27][1] - 4 * k]], GR, W2(1.4), e.furrow * 0.6); }
  // ---------- eyes ----------
  [[36, 37, 38, 39, 40, 41], [42, 43, 44, 45, 46, 47]].forEach((ix) => {
    const isNear = (ix[0] === 36) === (near < 0);
    const up = smooth([Q[ix[0]], Q[ix[1]], Q[ix[2]], Q[ix[3]]], false, 6), lo = smooth([Q[ix[3]], Q[ix[4]], Q[ix[5]], Q[ix[0]]], false, 6);
    const c0 = mid(mid(Q[ix[1]], Q[ix[2]]), mid(Q[ix[4]], Q[ix[5]])), wE = Math.hypot(Q[ix[3]][0] - Q[ix[0]][0], Q[ix[3]][1] - Q[ix[0]][1]);
    if (e.open > 0.08) {
      ctx.save(); ctx.clip(P2(up.concat(lo))); const bb2 = bbox(up.concat(lo));
      ctx.fillStyle = 'rgba(246,240,228,0.95)'; ctx.fillRect(bb2[0] - 2, bb2[1] - 2, bb2[2] - bb2[0] + 4, bb2[3] - bb2[1] + 4);
      const ic = [c0[0] + fs * wE * 0.08 + e.gx * wE * 0.22, c0[1] + e.gy * wE * 0.08], ir = 5.8 * k, sq = isNear ? 0.85 : 0.65;
      ctx.fillStyle = C.iris; ctx.beginPath(); ctx.ellipse(ic[0], ic[1], ir * sq, ir, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c0a0e'; ctx.beginPath(); ctx.ellipse(ic[0], ic[1], ir * 0.42 * sq * (1 + 0.3 * e.pupil), ir * 0.42 * (1 + 0.3 * e.pupil), 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.95 * (L.glint == null ? 1 : L.glint)); ctx.beginPath(); ctx.arc(ic[0] + fs * 1.6 * k, ic[1] - 2 * k, 1.2 * k, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(60,50,56,0.35)'; ctx.fillRect(bb2[0], bb2[1], bb2[2] - bb2[0], 2.5 * k);
      ctx.restore();
    }
    pline(up, '#1a181e', W2(isNear ? 3.2 : 2.6), 0.95, 2, 0.5); pline(lo.slice(2, -2), GR2, W2(1.3), 0.55);
    pline(up.map(([x, y]) => [x, y - (5 + 2 * e.open) * k]).slice(2, -1), GR2, W2(1.2), 0.45);
    if (e.tired > 0 || C.age > 0.5) pline(lo.slice(3, -3).map(([x, y]) => [x, y + 5 * k]), GR2, W2(1.1), 0.25 + 0.35 * Math.max(e.tired, C.age));
    if (e.crinkle > 0.05) { const oc = Q[ix[0] === 36 ? 36 : 45], sg = ix[0] === 36 ? 1 : -1; for (let i = 0; i < 3; i++) pline([[oc[0] - sg * 2 * k, oc[1] - 2 * k + i * 3 * k], [oc[0] - sg * 8 * k, oc[1] - 4 * k + i * 5 * k]], GR2, W2(1.1), e.crinkle * 0.7); }
  });
  // ---------- nose ----------
  pline(smooth([Q[27], Q[28], Q[29], Q[30]], false, 6).map(([x, y]) => [x + fs * 1.5 * k, y]), GR2, W2(1.6), 0.55);
  pline(smooth([Q[30], [Q[30][0] - fs * 1 * k, Q[30][1] + 6 * k], Q[33], Q[nIdx(34, 32)]], false, 5), GR, W2(2.4), 0.9, 2, 0.7);
  const wing = Q[nIdx(31, 35)]; pline(smooth([[wing[0] + fs * 3 * k, wing[1] - 9 * k], [wing[0] - fs * 2 * k, wing[1] - 3 * k], [wing[0], wing[1] + 2 * k], [Q[nIdx(32, 34)][0], Q[nIdx(32, 34)][1] + 1 * k]], false, 5), GR, W2(2.2), 0.85, 2, 0.6);
  const nos = mid(Q[nIdx(32, 34)], Q[33], 0.3); ctx.fillStyle = 'rgba(40,30,36,0.65)'; ctx.beginPath(); ctx.ellipse(nos[0], nos[1] - 0.5 * k, 3.4 * k, 1.5 * k, fs * 0.1, 0, Math.PI * 2); ctx.fill();
  const sm2 = Math.max(0, e.smile), dNL = 0.3 + 0.5 * sm2 + 0.25 * C.age, mcN = Q[nIdx(48, 54)];
  pline(smooth([[wing[0] - fs * 2 * k, wing[1] - 2 * k], [lerp(wing[0], mcN[0], 0.5) - fs * 4 * k, lerp(wing[1], mcN[1], 0.5)], [mcN[0] - fs * 4 * k, mcN[1] + 4 * k]], false, 5), GR, W2(1.6), dNL);
  // ---------- mouth ----------
  const upO = smooth([Q[48], Q[49], Q[50], Q[51], Q[52], Q[53], Q[54]], false, 5), loO = smooth([Q[54], Q[55], Q[56], Q[57], Q[58], Q[59], Q[48]], false, 5);
  const inU = smooth([Q[48], Q[60], Q[61], Q[62], Q[63], Q[64], Q[54]], false, 5), inL = smooth([Q[54], Q[64], Q[65], Q[66], Q[67], Q[60], Q[48]], false, 5);
  ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = tooth('#b05a5a', 1); ctx.fill(P2(upO.concat(inU.slice().reverse()))); ctx.globalAlpha = 0.16; ctx.fill(P2(inL.concat(loO.slice().reverse()))); ctx.restore();
  if (e.mouth > 0.04) { ctx.fillStyle = '#2a161c'; ctx.fill(P2(inU.concat(inL))); if (sm2 > 0.3) { ctx.save(); ctx.clip(P2(inU.concat(inL))); ctx.fillStyle = 'rgba(246,240,228,0.9)'; ctx.fill(P2(inU.concat(inU.map(([x, y]) => [x, y + 3 * k]).reverse()))); ctx.restore(); } }
  pline(inU, '#1e1418', W2(2.6), 0.92, 2, 0.5);
  if (e.mouth > 0.04) pline(inL, GR, W2(1.6), 0.7);
  pline(upO.slice(2, -2), GR2, W2(1.2), 0.4); pline(loO.slice(3, -3).map(([x, y]) => [x, y + 2 * k]), GR2, W2(1.3), 0.45);
  pline([mid(Q[33], Q[51], 0.15), mid(Q[33], Q[51], 0.85)].map(([x, y]) => [x - fs * 2 * k, y]), GR2, W2(1), 0.3);
  ctx.restore();
}
