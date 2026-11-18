// Set pieces and the shot list for "common knowledge". Scene coords are 1920x1080.
'use strict';
// ---------- backgrounds ----------
function nightWash(top, bot, glows = []) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(-W, -H, W * 3, H * 3);
  strokes([-200, -200, W + 200, H + 200], K.indigo, 900, { ang: -1.1, len: 70, w: 2.4, a: 0.35 });
  glows.forEach(([x, y, r, c, a]) => glow(x, y, r, c, a));
}
function lamp(x, y, s = 1, col = K.lamp, on = 1) {
  pline([[x, y + 30 * s], [x, y + 420 * s]], K.ink, 7 * s, 0.95, 2, 1);
  pencilShape([[x - 26 * s, y - 20 * s], [x + 26 * s, y - 20 * s], [x + 16 * s, y + 30 * s], [x - 16 * s, y + 30 * s]], '#0a0808', [{ col, n: 120, len: 10, f: () => on }], { lw: 2 });
  glow(x, y + 5 * s, 260 * s, rgba(col, 0.55), on); glow(x, y + 5 * s, 60 * s, 'rgba(255,240,200,0.95)', on);
}
// wet cobbles: rows of rounded stones, catching coloured light
function cobbles(y0, y1, lights = [], a = 1) {
  const r = rng(77);
  for (let row = 0; y0 + row * 6 < y1; row++) {
    const v = row / 40, y = y0 + Math.pow(v, 1.6) * (y1 - y0) * 1.2, h = 6 + 30 * Math.pow(v, 1.4), w = h * 1.8;
    if (y > y1 + 40) break;
    for (let x = -60 + (row % 2) * w / 2; x < W + 60; x += w * 1.05) {
      ctx.save(); ctx.globalAlpha = a * 0.8; ctx.strokeStyle = tooth(K.slate, 1); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      lights.forEach(([lx, col, k]) => { const d = Math.abs(x - lx) / 260; if (d < 1 && r() < (1 - d) * 0.8) { ctx.save(); ctx.globalAlpha = a * (1 - d) * (k || 1) * 0.8; ctx.strokeStyle = tooth(col, 1); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - w * 0.3, y - h * 0.15); ctx.lineTo(x + w * 0.25, y - h * 0.2); ctx.stroke(); ctx.restore(); } });
    }
  }
}
// smeared reflections in wet stone or water
function smear(x, y, len, col, a = 0.7, wid = 40) { ctx.save(); ctx.beginPath(); ctx.rect(x - wid, y, wid * 2, len); ctx.clip(); strokes([x - wid, y, x + wid, y + len], col, Math.round(len / 3), { ang: Math.PI / 2, len: 26, w: 2.2, a, f: (px, py) => (1 - Math.abs(px - x) / wid) * (1 - (py - y) / len) }); ctx.restore(); }
function buildingRow(y, h, seed, lit = K.amber, n = 9) {
  const r = rng(seed); let x = -80;
  while (x < W + 80) {
    const w = 140 + r() * 140, hh = h * (0.7 + r() * 0.5);
    const pts = [[x, y], [x, y - hh], [x + w * 0.5, y - hh - 40 - r() * 50], [x + w, y - hh], [x + w, y]];
    pencilShape(pts, '#0b0a10', [{ col: K.indigo, n: 140, len: 40, ang: -1.2, a: 0.5 }], { lw: 1.6, la: 0.6 });
    for (let j = 0; j < n; j++) if (r() < 0.45) { const wx = x + 14 + r() * (w - 40), wy = y - 30 - r() * (hh - 60); ctx.fillStyle = rgba(lit, 0.35 + r() * 0.4); ctx.fillRect(wx, wy, 14, 20); glow(wx + 7, wy + 10, 40, rgba(lit, 0.25), 0.8); }
    x += w + 4;
  }
}
function limmat(t) {
  nightWash('#0b0d1e', '#1c1530', [[1500, 300, 700, rgba(K.magenta, 0.25), 1]]);
  buildingRow(560, 300, 5);
  pencilShape([[-100, 560], [W + 100, 560], [W + 100, 780], [-100, 780]], '#0c1120', [{ col: K.blue, n: 600, ang: 0, len: 60, a: 0.35 }, { col: K.teal, n: 300, ang: 0.05, len: 40, a: 0.3 }], { line: false });
  [[300, K.amber], [760, K.lamp], [1220, K.amber], [1640, K.magenta]].forEach(([x, col]) => smear(x, 562, 210, col, 0.75, 34));
  [[300, 470], [760, 470], [1220, 470], [1640, 470]].forEach(([x, y], i) => lamp(x, y - 80, 0.45, i === 3 ? K.magenta : K.lamp));
  pencilShape([[-100, 780], [W + 100, 780], [W + 100, 1200], [-100, 1200]], '#100d14', [{ col: K.wet, n: 300, ang: 0, len: 50, a: 0.4 }], { line: false });
  cobbles(780, 1100, [[300, K.amber], [760, K.lamp], [1220, K.amber], [1640, K.magenta]]);
}
function arcade(t, lit = 1) {
  nightWash('#0d0b14', '#19121c');
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 420, s = 1;
    const col = [[x, 1100], [x, 360], [x + 40, 360], [x + 40, 1100]];
    pencilShape(col, '#13101a', [{ col: K.stone, n: 260, len: 30, ang: 1.5, a: 0.5 }, { col: K.amber, n: 80, f: (px) => ss(x + 10, x + 40, px) * lit, len: 20 }], { lw: 2 });
    pline(qpts([x + 40, 360], [x + 210, 140], [x + 380, 360]), K.stone, 10, 0.7, 3, 2);
    void s;
  }
  pencilShape([[-100, 0], [W + 100, 0], [W + 100, 200], [-100, 200]], '#0c0a10', [{ col: K.stone, n: 300, len: 40, ang: 0, a: 0.35 }], { line: false });
  lamp(1040, 300, 0.7, K.lamp, lit);
  cobbles(860, 1100, [[1040, K.amber, 1.2]]);
}
function square(t) {
  nightWash('#0b0c1a', '#1a1424', [[960, 500, 900, rgba(K.teal, 0.18), 1]]);
  buildingRow(620, 360, 21, K.amber, 12);
  cobbles(620, 1100, [[960, K.teal], [500, K.amber], [1500, K.magenta]]);
  // the dry fountain
  pencilShape(smooth([[700, 760], [960, 720], [1220, 760], [1240, 820], [960, 870], [680, 820]]), '#14141c', [{ col: K.stone, n: 500, len: 30, ang: 0.1, a: 0.6 }, { col: K.teal, n: 160, f: (px) => ss(900, 1220, px), len: 20 }], { lw: 2.4 });
  pencilShape([[930, 760], [990, 760], [980, 560], [940, 560]], '#14141c', [{ col: K.stone, n: 200, len: 24, ang: 1.5, a: 0.6 }], { lw: 2 });
  pencilShape(smooth([[880, 560], [960, 530], [1040, 560], [960, 586]]), '#14141c', [{ col: K.stone, n: 140, len: 20 }], { lw: 2 });
  lamp(420, 420, 0.6, K.lamp); lamp(1560, 420, 0.6, K.magenta);
}
// a standing figure, mostly silhouette with rim light. op: { umb: 'open'|'closed'|null, cup, face: 1|-1, rim, who }
function figure(x, y, s, op = {}) {
  const rim = op.rim || K.teal, who = op.who || 'julian';
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const coat = who === 'julian'
    ? smooth([[-70, -300], [-95, -200], [-110, 0], [-80, 0], [-60, 60], [60, 60], [80, 0], [110, 0], [95, -200], [70, -300], [0, -330]])
    : smooth([[-80, -296], [-110, -190], [-118, 10], [-70, 40], [70, 40], [118, 10], [110, -190], [80, -296], [0, -322]]);
  pencilShape(coat, '#0b0a10', [{ col: who === 'julian' ? K.khaki : K.slate, n: 500, f: (px) => ss(-60, 110, px * (op.face || 1)) * 0.8, ang: -1.3, len: 30 }, { col: rim, n: 240, f: (px) => ss(40, 110, -px * (op.face || 1)), len: 20, ang: 1.5 }], { lw: 2.2 });
  pline([[-30, 60], [-34, 180]], K.ink, 14, 0.95); pline([[30, 60], [34, 180]], K.ink, 14, 0.95);
  const hp = smooth([[-34, -330], [-36, -380], [0, -406], [36, -380], [34, -330], [0, -312]]);
  pencilShape(hp, '#0b0a10', [{ col: K.skin2, n: 220, f: (px) => ss(-20, 30, px * (op.face || 1)), len: 12 }, { col: rim, n: 80, f: (px) => ss(10, 34, -px * (op.face || 1)), len: 10 }], { lw: 1.8 });
  if (who === 'julian') pencilShape(smooth([[-36, -372], [-30, -404], [10, -414], [38, -394], [36, -372], [0, -392]]), '#060509', [{ col: K.violet, n: 60, len: 14 }], { lw: 1.4 });
  else { pline([[-24, -372], [24, -372]], K.amber2, 1.6, 0.8); }
  if (op.umb === 'open') {
    const ux = 40 * (op.face || 1);
    pline([[ux, -150], [ux, -470]], K.ink, 4, 0.95);
    const can = smooth([[ux - 230, -420], [ux - 120, -520], [ux, -548], [ux + 120, -520], [ux + 230, -420], [ux + 110, -440], [ux, -436], [ux - 110, -440]]);
    pencilShape(can, '#08070b', [{ col: K.indigo, n: 300, len: 30 }, { col: rim, n: 120, f: (px, py) => ss(-520, -470, -py) * 0.8, len: 20 }], { lw: 2.4 });
  } else if (op.umb === 'closed') {
    const ux = 70 * (op.face || 1); pline([[ux, -150], [ux + 6, 170]], K.ink, 7, 0.95); pline(qpts([ux, -150], [ux - 10, -176], [ux + 12, -184]), K.ink, 4, 0.9);
  }
  if (op.cup) { pencilShape([[-90 * (op.face || 1) - 14, -150], [-90 * (op.face || 1) + 14, -150], [-90 * (op.face || 1) + 10, -112], [-90 * (op.face || 1) - 10, -112]], '#d8cfbd', [{ col: K.cream, n: 40, len: 8 }], { lw: 1.4 }); }
  ctx.restore();
}
function alley(t, depth = 0) {
  nightWash('#0a0912', '#140f18', [[960, 380, 500, rgba(K.amber, 0.25), 1]]);
  // high windowless walls in perspective
  const vp = [960, 420];
  pencilShape([[-100, -100], [760, 250], [760, 720], [-100, 1200]], '#120f16', [{ col: K.stone, n: 1400, len: 40, ang: 0.35, a: 0.45 }, { col: K.violet, n: 500, len: 50, ang: -0.6, a: 0.4 }], { lw: 2 });
  pencilShape([[W + 100, -100], [1160, 250], [1160, 720], [W + 100, 1200]], '#120f16', [{ col: K.stone, n: 1400, len: 40, ang: -0.35, a: 0.45 }, { col: K.amber, n: 400, f: (px, py) => ss(1160, 1500, px) * ss(200, 600, py) * 0.6, len: 30 }], { lw: 2 });
  // masonry joints
  for (let i = 1; i < 9; i++) { const v = i / 9; pline([[lerp(-100, 760, 0), lerp(-100, 250, 0) + v * 1300], [760, 250 + v * 470]], K.ink, 1.4, 0.35); pline([[W + 100, -100 + v * 1300], [1160, 250 + v * 470]], K.ink, 1.4, 0.35); }
  // the steps at the far end
  for (let i = 0; i < 9; i++) { const y = 720 - i * 32, w = 400 - i * 12; pencilShape([[960 - w / 2, y], [960 + w / 2, y], [960 + w / 2, y - 16], [960 - w / 2, y - 16]], '#16131a', [{ col: K.stone, n: 60, len: 20, ang: 0 }, { col: K.amber, n: 30, len: 14, f: () => 0.6 }], { lw: 1.6 }); }
  lamp(1190, 300, 0.5, K.amber);
  pencilShape([[760, 720], [1160, 720], [W + 100, 1200], [-100, 1200]], '#100d14', [{ col: K.wet, n: 400, len: 40, ang: 0, a: 0.5 }], { line: false });
  cobbles(720, 1100, [[1000, K.amber, 1.2]]);
  void vp; void depth;
}
function stepsPOV(t, hl = -1, hlA = 0) {
  nightWash('#07070c', '#120f18', [[960, 100, 600, rgba(K.teal, 0.25), 1]]);
  for (let i = 0; i < 10; i++) {
    const v = i / 10, y0 = 1080 - Math.pow(v, 0.7) * 860, y1 = 1080 - Math.pow((i + 1) / 10, 0.7) * 860, w0 = 1700 - v * 1100, w1 = 1700 - (i + 1) / 10 * 1100;
    const riser = [[960 - w0 / 2, y0], [960 + w0 / 2, y0], [960 + w0 / 2, y0 - (y0 - y1) * 0.45], [960 - w0 / 2, y0 - (y0 - y1) * 0.45]];
    const tread = [[960 - w0 / 2, y0 - (y0 - y1) * 0.45], [960 + w0 / 2, y0 - (y0 - y1) * 0.45], [960 + w1 / 2, y1], [960 - w1 / 2, y1]];
    pencilShape(riser, '#0a080d', [{ col: i === hl ? K.crimson : K.indigo, n: 160, len: 30, ang: 0.15, a: i === hl ? 0.6 + 0.4 * hlA : 0.45 }], { lw: 2 });
    pencilShape(tread, '#2a2630', [{ col: K.stone, n: 320, len: 26, ang: 0.05, a: 0.7 }, { col: K.amber, n: 120, len: 16, f: () => 0.7 * (1 - v) }], { lw: 1.6 });
    pline([[960 - w0 / 2, y0 - (y0 - y1) * 0.45], [960 + w0 / 2, y0 - (y0 - y1) * 0.45]], K.amber2, 3, 0.8 * (1 - v * 0.6));
    if (i === hl && hlA > 0) glow(960, (y0 + y1) / 2, 400, rgba(K.crimson, 0.5), hlA);
  }
  pencilShape([[-100, -100], [400, 220], [400, 1200], [-100, 1200]], '#0c0a10', [{ col: K.stone, n: 500, len: 40, ang: 1.2, a: 0.35 }], { lw: 2 });
  pencilShape([[W + 100, -100], [1520, 220], [1520, 1200], [W + 100, 1200]], '#0c0a10', [{ col: K.stone, n: 500, len: 40, ang: -1.2, a: 0.35 }], { lw: 2 });
}
function trees(t, a = 1) {
  nightWash('#05070b', '#0b1014', [[960, 300, 700, rgba(K.teal, 0.15), 1]]);
  const r = rng(91);
  for (let i = 0; i < 7; i++) {
    const x = 120 + i * 290 + (r() - 0.5) * 80, top = 120 + r() * 200;
    pline([[x, 1100], [x + (r() - 0.5) * 40, top + 200]], K.ink, 26, 0.95, 2, 3);
    const cp = smooth([[x - 220, top + 280], [x - 160, top + 60], [x, top - 40], [x + 170, top + 50], [x + 240, top + 260], [x, top + 330]]);
    pencilShape(cp, '#05080a', [{ col: '#2a5a54', n: 900, len: 24, ang: -0.6, jitAng: 2, a: 0.7 }, { col: K.teal, n: 400, len: 16, jitAng: 2, f: (px) => ss(x - 40, x + 220, px) * 0.8 }], { line: false });
  }
  lamp(1500, 520, 0.6, K.amber); glow(960, 980, 900, rgba(K.amber, 0.15), 1);
  ctx.fillStyle = rgba('#000000', 0.25 * (1 - a)); ctx.fillRect(0, 0, W, H);
}
function station(t) {
  nightWash('#12060a', '#1e0a12', [[960, 200, 800, rgba(K.crimson, 0.35), 1]]);
  // arched roof of the hall
  for (let i = 0; i < 8; i++) pline(qpts([-200 + i * 40, 900], [960, -200 - i * 30], [2120 - i * 40, 900]), K.crimson, 3, 0.5 - i * 0.04, 2, 2);
  for (let i = 0; i < 12; i++) pline([[i * 180 - 100, 900], [960 + (i * 180 - 1060) * 0.2, 260]], K.ink, 2, 0.5);
  // the rented car from behind, trunk lid up, black inside
  pencilShape(smooth([[600, 880], [620, 720], [760, 650], [1160, 650], [1300, 720], [1320, 880]]), '#0c0a0e', [{ col: K.slate, n: 600, len: 30, ang: 0.1 }, { col: K.crimson, n: 300, len: 24, f: (px) => ss(1000, 1320, px) }], { lw: 2.6 });
  pencilShape([[700, 700], [1220, 700], [1180, 520], [740, 520]], '#08060a', [{ col: K.slate, n: 300, len: 26 }], { lw: 2.4 });
  pencilShape([[720, 720], [1200, 720], [1180, 820], [740, 820]], '#020103', [], { lw: 2 });
  [[690, 810], [1230, 810]].forEach(([x, y]) => { ctx.fillStyle = rgba(K.crimson, 0.9); ctx.fillRect(x - 40, y - 12, 80, 24); glow(x, y, 120, rgba(K.crimson, 0.7), 1); });
  cobbles(900, 1100, [[960, K.crimson, 1.2]]);
}
function folder(x, y, s, title, lines, stamp, stampA = 1, rot = -0.04) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  pencilShape([[-420, -300], [-120, -300], [-90, -340], [120, -340], [140, -300], [420, -300], [420, 300], [-420, 300]], '#2a1e10', [{ col: K.khaki, n: 1600, len: 40, ang: -0.2 }, { col: K.amber, n: 400, len: 24, f: (px, py) => ss(-300, 300, -py) * 0.6 }], { lw: 2.6 });
  pencilShape([[-380, -260], [380, -260], [380, 270], [-380, 270]], '#d9cfba', [{ col: K.cream, n: 900, len: 30, a: 0.5 }], { lw: 1.6 });
  hand(title, -340, -200, 52, K.ink, { align: 'left' });
  lines.forEach((l, i) => { if (typeof l === 'string') hand(l, -340, -110 + i * 62, 40, '#3a3040', { align: 'left' }); else pline([[-340, -110 + i * 62], [-340 + l * 660, -110 + i * 62]], '#3a3040', 4, 0.5); });
  if (stamp && stampA > 0) { ctx.save(); ctx.globalAlpha = stampA; ctx.rotate(-0.12); ctx.strokeStyle = tooth(K.crimson, 1); ctx.lineWidth = 7; ctx.strokeRect(-260, 90, 520, 120); hand(stamp, 0, 150, 84, K.crimson); ctx.restore(); }
  ctx.restore();
}
function chess(t, hl = null) {
  nightWash('#0a0910', '#151018', [[960, 300, 700, rgba(K.amber, 0.3), 1]]);
  const cx = 960, cy = 720, n = 8, sq = 120;
  for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) {
    const v0 = j / 4, v1 = (j + 1) / 4, y0 = cy + 300 * (v0 - 0.5) * 1.2, y1 = cy + 300 * (v1 - 0.5) * 1.2, w0 = lerp(0.6, 1.3, v0) * sq, w1 = lerp(0.6, 1.3, v1) * sq;
    const x0a = cx + (i - n / 2) * w0, x0b = cx + (i + 1 - n / 2) * w0, x1a = cx + (i - n / 2) * w1, x1b = cx + (i + 1 - n / 2) * w1;
    pencilShape([[x0a, y0], [x0b, y0], [x1b, y1], [x1a, y1]], (i + j) % 2 ? '#0d0b10' : '#2a2018', [{ col: (i + j) % 2 ? K.indigo : K.khaki, n: 80, len: 20, a: 0.5 }], { lw: 1.2, la: 0.5 });
  }
  const piece = (x, y, s, col, pawn) => { const pts = pawn ? smooth([[x - 30 * s, y], [x - 22 * s, y - 40 * s], [x - 12 * s, y - 70 * s], [x - 20 * s, y - 92 * s], [x, y - 110 * s], [x + 20 * s, y - 92 * s], [x + 12 * s, y - 70 * s], [x + 22 * s, y - 40 * s], [x + 30 * s, y]]) : smooth([[x - 36 * s, y], [x - 26 * s, y - 60 * s], [x - 18 * s, y - 120 * s], [x - 30 * s, y - 150 * s], [x, y - 180 * s], [x + 30 * s, y - 150 * s], [x + 18 * s, y - 120 * s], [x + 26 * s, y - 60 * s], [x + 36 * s, y]]); pencilShape(pts, col === 'w' ? '#3a3026' : '#08070a', [{ col: col === 'w' ? K.cream : K.violet, n: 200, len: 14 }, { col: K.amber, n: 80, len: 10, f: (px) => ss(x - 10 * s, x + 40 * s, px) }], { lw: 2 }); };
  piece(760, 760, 1.2, 'w', false); piece(1180, 700, 1.1, 'b', false); piece(960, 790, 1.2, 'b', true);
  if (hl) { glow(960, 700, 220, rgba(K.crimson, 0.6), hl); pline(smooth([[900, 640], [960, 600], [1020, 640], [1020, 800], [900, 800]]), K.crimson, 3, hl); }
}
function zurichMap(t, uTal, uDuf, uLie) {
  nightWash('#0f0d0a', '#17130e', [[960, 540, 900, rgba(K.amber, 0.25), 1]]);
  // paper
  ctx.save(); ctx.translate(960, 540); ctx.rotate(-0.02);
  pencilShape([[-820, -460], [820, -460], [820, 460], [-820, 460]], '#d8cbb0', [{ col: K.cream, n: 2600, len: 40, a: 0.5 }, { col: K.khaki, n: 600, len: 50, a: 0.3 }], { lw: 2 });
  // the lake (bottom) and the river leaving it northward
  pencilShape(smooth([[-300, 460], [-200, 260], [-60, 160], [120, 170], [320, 300], [460, 460]]), '#8fb8c0', [{ col: K.blue, n: 1400, len: 30, ang: 0, a: 0.6 }, { col: K.teal, n: 500, len: 30, ang: 0.1, a: 0.4 }], { lw: 2.6 });
  pline(smooth([[0, 170], [-20, 60], [10, -80], [-30, -220], [0, -460]], false, 8), K.blue, 26, 0.75, 3, 2);
  hand('lake zurich', 80, 360, 48, '#1e3a5a'); hand('limmat', 60, -300, 40, '#1e3a5a', { rot: -1.4 });
  // streets
  const tal = [[-420, 170], [-360, 60], [-300, -60]], duf = [[300, 230], [470, 160], [640, 90]];
  pline(tal, '#3a2a1a', 8, 0.8); pline(duf, '#3a2a1a', 8, 0.8);
  pline([[-220, -380], [-160, 160]], '#3a2a1a', 5, 0.5); pline([[260, -360], [180, 130]], '#3a2a1a', 5, 0.5);
  hand('talstrasse', -520, 40, 46, K.ink, { rot: -1.0, a: uTal });
  hand('dufourstrasse', 560, 230, 46, K.ink, { rot: -0.4, a: uDuf });
  // where henrik says the annex is (a question mark) vs where it is (a star)
  if (uLie > 0) { ctx.save(); ctx.globalAlpha = uLie; ctx.strokeStyle = tooth(K.crimson, 1); ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(-360, 60, 70, 0, Math.PI * 2); ctx.stroke(); hand('annex?', -360, -50, 52, K.crimson); ctx.restore(); }
  if (uDuf > 0) { ctx.save(); ctx.globalAlpha = uDuf; hand('★ annex', 470, 90, 56, '#1a5a40'); ctx.restore(); }
  if (uDuf > 0.5) { const p = clamp((uDuf - 0.5) * 2); pline(qpts([-360, 60], [40, -160], [470, 130]).slice(0, Math.max(2, Math.round(13 * p))), K.crimson, 4, 0.8, 2, 1); hand('two miles', 60, -180, 48, K.crimson, { a: p }); }
  ctx.restore();
}
function umbrellaUnder(t, a = 1) {
  nightWash('#0a0a12', '#120e16');
  const cx = 960, cy = 160;
  for (let i = 0; i < 8; i++) { const an = Math.PI * (0.05 + i / 7 * 0.9); pline([[cx, cy], [cx + Math.cos(an) * 1100, cy + Math.sin(an) * 520]], K.ink, 6, 0.9, 2, 2); }
  for (let i = 0; i < 7; i++) {
    const a0 = Math.PI * (0.05 + i / 7 * 0.9), a1 = Math.PI * (0.05 + (i + 1) / 7 * 0.9);
    const p = [[cx, cy], [cx + Math.cos(a0) * 1100, cy + Math.sin(a0) * 520], [cx + Math.cos((a0 + a1) / 2) * 1000, cy + Math.sin((a0 + a1) / 2) * 470], [cx + Math.cos(a1) * 1100, cy + Math.sin(a1) * 520]];
    pencilShape(p, '#0b0a12', [{ col: i % 2 ? K.indigo : K.violet, n: 300, len: 40, a: 0.6 }, { col: K.teal, n: 120, len: 20, f: (px, py) => ss(200, 520, py) * 0.6 }], { lw: 2 });
  }
  // drops beading on the canvas, rain beyond the rim
  const r = rng(SD()); for (let i = 0; i < 60; i++) { const x = r() * W, y = 200 + r() * 420; glow(x, y, 8, 'rgba(200,240,255,0.6)', a * 0.6); }
  pencilShape([[-100, 700], [W + 100, 700], [W + 100, 1200], [-100, 1200]], '#0d0b12', [{ col: K.wet, n: 300, len: 40, ang: 0, a: 0.4 }], { line: false });
  cobbles(700, 1100, [[960, K.amber]]);
}
// hands
function handShake(t) {
  nightWash('#0c0a12', '#160f18', [[960, 540, 600, rgba(K.amber, 0.35), 1]]);
  const sleeve = (x0, flip, col) => pencilShape(flip ? [[W + 100, 380], [1120, 470], [1100, 660], [W + 100, 760]] : [[-100, 420], [800, 470], [820, 660], [-100, 780]], '#120e0c', [{ col, n: 900, len: 40, ang: flip ? 0.3 : -0.3 }, { col: K.indigo, n: 300, len: 40, ang: 0.8 }], { lw: 2.4 });
  sleeve(0, false, K.khaki); sleeve(0, true, K.slate);
  const hnd = smooth([[800, 480], [900, 450], [1010, 470], [1120, 480], [1120, 650], [1010, 670], [900, 660], [800, 650]]);
  pencilShape(hnd, '#2a160e', [{ col: K.skin2, n: 1600, len: 22 }, { col: K.skin, n: 900, len: 18, f: (px, py) => ss(560, 470, py) }, { col: K.magenta, n: 300, len: 16, f: (px, py) => ss(560, 660, py) }], { lw: 2.4 });
  for (let i = 0; i < 4; i++) pline(qpts([860 + i * 60, 470], [880 + i * 60, 560], [870 + i * 60, 650]), K.ink, 2, 0.6);
  pline(qpts([800, 560], [960, 540], [1120, 560]), K.ink, 2.4, 0.7);
}
function pocketHand(t, taut = 0, blade = 0) {
  nightWash('#0b0a10', '#140e14', [[1200, 400, 800, rgba(K.magenta, 0.3), 1]]);
  pencilShape([[-100, -100], [W + 100, -100], [W + 100, 1200], [-100, 1200]], '#0e0f14', [{ col: K.slate, n: 2600, len: 44, ang: -1.25, a: 0.7 }, { col: K.violet, n: 700, len: 40, ang: 0.6 }, { col: K.magenta, n: 500, len: 30, f: (px) => ss(1000, 1700, px) }], { line: false });
  // the slit pocket: a welt, dark inside, pulled taut when he grips
  const sy = 640, bow = 18 - taut * 30;
  pencilShape(smooth([[620, sy], [960, sy + bow], [1320, sy], [1320, sy + 26], [960, sy + bow + 30], [620, sy + 26]]), '#020203', [], { lw: 3 });
  pline(qpts([600, sy - 14], [960, sy + bow - 16], [1340, sy - 14]), K.slate, 6, 0.9, 2, 1);
  // sleeve coming down from the upper left, a white cuff, the wrist vanishing into the slit
  pencilShape([[380, -120], [760, -120], [1020, 560], [820, 600]], '#101119', [{ col: K.slate, n: 900, len: 40, ang: -1.1 }, { col: K.magenta, n: 200, len: 26, f: (px) => ss(700, 1000, px) }], { lw: 2.6 });
  pencilShape([[820, 600], [1020, 560], [1030, 600], [826, 640]], '#cfc8bb', [{ col: K.cream, n: 160, len: 14 }], { lw: 2 });
  pencilShape([[836, 638], [1028, 600], [1010, sy + bow + 6], [880, sy + 8]], '#2a1610', [{ col: K.skin2, n: 260, len: 16 }, { col: K.skin, n: 120, len: 12, f: (px) => ss(900, 1020, px) }], { lw: 2 });
  if (taut > 0) for (let i = 0; i < 7; i++) pline(qpts([660 + i * 100, sy + 40], [700 + i * 100, sy + 140 + taut * 40], [680 + i * 100, sy + 300]), K.ink, 2, taut * 0.7);
  if (blade > 0) { pline([[960, sy + 30], [1180, 1000]], K.cream, 5, blade * 0.8, 2, 1); glow(1070, 820, 200, rgba(K.cream, 0.5), blade * 0.7); }
}
function cup(x, y, s, rot = 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); pencilShape([[-60, -90], [60, -90], [44, 90], [-44, 90]], '#cfc5b2', [{ col: K.cream, n: 500, len: 18 }, { col: K.amber, n: 120, len: 12, f: (px) => ss(0, 60, px) }, { col: K.indigo, n: 160, len: 14, f: (px) => ss(0, 60, -px) }], { lw: 2.4 }); pencilShape([[-66, -96], [66, -96], [66, -84], [-66, -84]], '#e8e0d0', [], { lw: 2 }); ctx.restore(); }
function wristwatch(t) {
  nightWash('#0b0a10', '#140f16', [[960, 540, 600, rgba(K.amber, 0.35), 1]]);
  pencilShape([[-100, 380], [W + 100, 300], [W + 100, 780], [-100, 860]], '#120e0c', [{ col: K.khaki, n: 1600, len: 40, ang: -0.2 }], { line: false });
  pencilShape(smooth([[700, 560], [960, 430], [1220, 520], [1200, 700], [940, 760], [700, 700]]), '#2a160e', [{ col: K.skin2, n: 1000, len: 20 }, { col: K.skin, n: 400, len: 16 }], { lw: 2 });
  ctx.save(); ctx.translate(960, 590); const fp = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; fp.push([Math.cos(a) * 150, Math.sin(a) * 150]); }
  pencilShape([[-90, -260], [90, -260], [80, -140], [-80, -140]], '#120c08', [{ col: K.ink, n: 200, len: 20 }, { col: K.amber, n: 60, len: 14 }], { lw: 2 }); pencilShape([[-90, 260], [90, 260], [80, 140], [-80, 140]], '#120c08', [{ col: K.ink, n: 200, len: 20 }], { lw: 2 });
  pencilShape(fp, '#d8ccb0', [{ col: K.cream, n: 900, len: 14, a: 0.7 }, { col: K.amber, n: 200, len: 12, f: (px) => ss(0, 150, px) * 0.5 }], { lw: 9, lineCol: '#8a8070' });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pline([[Math.cos(a) * 112, Math.sin(a) * 112], [Math.cos(a) * 128, Math.sin(a) * 128]], K.ink, 3, 0.9); }
  const mA = (50 / 60) * Math.PI * 2 - Math.PI / 2 + t * 0.002, hA = (7.8 / 12) * Math.PI * 2 - Math.PI / 2;
  pline([[0, 0], [Math.cos(hA) * 70, Math.sin(hA) * 70]], K.ink, 7, 0.95); pline([[0, 0], [Math.cos(mA) * 110, Math.sin(mA) * 110]], K.ink, 4.5, 0.95);
  const sA = t * Math.PI * 2 / 60 - Math.PI / 2; pline([[0, 0], [Math.cos(sA) * 118, Math.sin(sA) * 118]], K.crimson, 2, 0.95);
  ctx.restore(); glow(1000, 540, 120, 'rgba(255,240,200,0.3)', 1);
}
function hwToken(t) {
  nightWash('#0b0a10', '#120e16', [[960, 540, 700, rgba(K.teal, 0.3), 1]]);
  pencilShape(smooth([[700, 460], [1220, 440], [1240, 640], [720, 660]]), '#1a1a22', [{ col: K.slate, n: 1000, len: 24 }, { col: K.teal, n: 300, len: 18, f: (px) => ss(1000, 1240, px) }], { lw: 2.6 });
  pencilShape([[780, 500], [1080, 494], [1084, 604], [784, 610]], '#0a1a14', [{ col: K.teal, n: 300, len: 14, a: 0.5 }], { lw: 2 });
  const code = String(100000 + Math.floor((t / 3) % 1 * 899999)).slice(0, 6); hand(code.split('').join(' '), 932, 552, 64, K.teal2);
  const p = (t % 30) / 30; pline([[790, 630], [790 + 290 * (1 - p), 630]], K.crimson, 5, 0.9);
}
// recursion device: a face holding a frame that holds the other face, and so on
function mirrors(t, depth, who0 = 'julian', exs = {}) {
  nightWash('#07060c', '#120c18', [[960, 540, 900, rgba(K.violet, 0.3), 1]]);
  let s = 1, x = 960, y = 560, who = who0;
  for (let d = 0; d < Math.min(depth, 5); d++) {
    const e = exs[who] || ex({});
    if (d > 0) { ctx.save(); ctx.globalAlpha = 0.95; ctx.strokeStyle = tooth(d % 2 ? K.amber : K.teal, 1); ctx.lineWidth = 10 * s; ctx.strokeRect(x - 340 * s, y - 380 * s, 680 * s, 760 * s); ctx.restore(); ctx.save(); ctx.beginPath(); ctx.rect(x - 335 * s, y - 375 * s, 670 * s, 750 * s); ctx.clip(); ctx.fillStyle = '#0b0910'; ctx.fillRect(x - 340 * s, y - 380 * s, 680 * s, 760 * s); }
    face(x, y + 20 * s, 0.95 * s, who, e, { side: who === 'julian' ? 1 : -1, key: K.amber, rim: who === 'julian' ? K.teal : K.magenta, glint: 1 });
    if (d > 0) ctx.restore();
    // next frame sits in the "thought" space at the upper right
    x += 330 * s; y -= 260 * s; s *= 0.42; who = who === 'julian' ? 'henrik' : 'julian';
  }
}
function forkPaths(t, uA, uB, pick = 0) {
  nightWash('#08080d', '#120f16', [[960, 600, 800, rgba(K.amber, 0.2), 1]]);
  pline(qpts([960, 1100], [960, 860], [960, 760]), K.cream, 8, 0.9, 3, 2);
  const A = qpts([960, 760], [700, 600], [420, 420]), B = qpts([960, 760], [1220, 600], [1500, 420]);
  pline(A.slice(0, Math.max(2, Math.round(13 * uA))), K.teal, 8, 0.9, 3, 2); pline(B.slice(0, Math.max(2, Math.round(13 * uB))), K.crimson, 8, 0.9, 3, 2);
  hand('he panicked', 420, 340, 64, K.teal2, { a: uA }); hand('he wants me to catch it', 1500, 340, 64, K.crimson, { a: uB });
  if (pick > 0) glow(1500, 400, 300, rgba(K.crimson, 0.5), pick);
}
function title(t, a = 1, a2 = 1) {
  ctx.fillStyle = '#060509'; ctx.fillRect(-W, -H, W * 3, H * 3);
  strokes([0, 0, W, H], K.indigo, 900, { ang: -1.1, len: 70, w: 2.4, a: 0.25 });
  glow(960, 520, 700, rgba(K.amber, 0.22), a);
  hand('common knowledge', 960, 500, 180, K.amber2, { a });
  hand('clay shentrup', 960, 680, 64, K.cream, { a: a2 });
}
