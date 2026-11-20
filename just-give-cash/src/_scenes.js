  // ---------- plates (Gemini paintings) ----------
  // cover-fit a plate, slow camera drift from cam a to cam b across [t0, t1]
  function plate(name, t0, t1, cam = {}, alpha = 1) {
    const im = IMG[name];
    if (!im || alpha <= 0.001) return;
    const u = eIO(clamp((T - t0) / Math.max(0.01, t1 - t0)));
    const z = lerp((cam.z || [1, 1.06])[0], (cam.z || [1, 1.06])[1], u);
    const fx = lerp((cam.x || [0, 0])[0], (cam.x || [0, 0])[1], u), fy = lerp((cam.y || [0, 0])[0], (cam.y || [0, 0])[1], u);
    const sc = Math.max(W / im.width, H / im.height) * z * 1.02;
    const dw = im.width * sc, dh = im.height * sc;
    const mx = (dw - W) / 2, my = (dh - H) / 2;
    ctx.save(); ctx.globalAlpha *= clamp(alpha);
    ctx.drawImage(im, -mx + clamp(fx, -1, 1) * mx, -my + clamp(fy, -1, 1) * my, dw, dh);
    ctx.restore();
  }
  // a sequence of plates inside one scene: [[name, tStart, cam], ...]; each fades in over the previous one
  function plates(list, tEnd) {
    list.forEach(([name, ts, cam], i) => {
      const te = i + 1 < list.length ? list[i + 1][1] + 0.6 : tEnd;
      if (T < ts - 0.01 || (i + 1 < list.length && T > list[i + 1][1] + 0.6)) return;
      plate(name, ts, te, cam, i === 0 ? 1 : fadeIn(ts, 0.6));
    });
  }
  // cream note card for overlays on top of paintings
  function card(x, y, w, h, alpha = 1, op = {}) {
    if (alpha <= 0.001) { KC += 2; return; }
    ctx.save(); ctx.globalAlpha *= clamp(alpha);
    ctx.fillStyle = 'rgba(30,20,10,0.16)'; ctx.fillRect(x + 8, y + 10, w, h);
    ctx.fillStyle = op.bg || 'rgba(255,250,240,0.95)'; ctx.fillRect(x, y, w, h);
    rect(x, y, w, h, 1, { strokeWidth: 3, stroke: op.stroke || P.ink });
    ctx.restore();
  }
  // card that pops in at t0 and holds; content fn drawn in card-local coords (origin = card centre)
  function note(x, y, w, h, t0, fn, op = {}) {
    if (T < t0) { KC += 60; return; }
    const s = popS(t0, 0.4), a = op.out != null ? fadeOut(op.out, 0.35) : 1;
    grp(x, y, lerp(0.85, 1, clamp(s)), op.rot || 0, () => { card(-w / 2, -h / 2, w, h, 1, op); if (fn) fn(); }, clamp(s * 1.5) * a);
  }
  const lab = (s, x, y, size, t0, op = {}) => txt(s, x, y, size, Object.assign({ halo: 12, alpha: fadeIn(t0, 0.3) * (op.out != null ? fadeOut(op.out, 0.3) : 1) }, op));
  const strike = (x1, y, x2, t0, col = P.red) => line(x1, y, x2, y - 6, eOut(prog(T, t0, t0 + 0.3)), { stroke: col, strokeWidth: 7 });

  // ---------- scenes ----------
  const S0 = () => c('H1') - 3.8; // 0

  // H1-H2: the rent-controlled apartment
  function sOpen() {
    plates([['bldg', 0, { z: [1.12, 1.0], x: [0.6, 0.2] }], ['tenant', c('H2') - 0.2, { z: [1.0, 1.08], x: [0.3, -0.2] }]], ce('H2') + 0.6);
    if (T < c('H2') + 0.4) {
      const out = c('H2') - 0.1;
      note(430, 240, 560, 250, w('H1', 'worth'), () => {
        txt('market rent', 0, -70, 44, { font: PRINT, color: P.grey });
        txt('$3,000/mo', 0, 10, 92, {});
        strike(-190, 18, 190, w('H1', 'two thousand'));
        if (T > w('H1', 'two thousand')) txt('$2,000', 60, 90, 70, { color: P.red, rot: -0.06, alpha: fadeIn(w('H1', 'two thousand'), 0.2) }); else KC++;
      }, { out });
      stamp('rent control', 430, 440, 54, w('H1', 'law'), { alpha: fadeOut(out, 0.3) });
    } else KC += 70;
    if (T > c('H2') - 0.2) {
      stamp('+$1,000 a month', 1300, 220, 74, w('H2', 'saves'), { color: P.green, rot: -0.05 });
      if (T > w('H2', 'where')) {
        const a = fadeIn(w('H2', 'where'), 0.3);
        lab('where did it come from?', 1300, 380, 72, w('H2', 'where'), { color: P.plum });
        txt('?', 1660 + Math.sin(T * 5) * 6, 360, 140, { alpha: a, color: P.red, halo: 12 });
      } else KC += 2;
    } else KC += 10;
  }

  // H3: Walt pays it
  function sLandlord() {
    plate('landlord', c('H3') - 0.6, ce('H3') + 0.6, { z: [1.0, 1.1], x: [-0.3, 0.4], y: [0, 0.2] });
    const items = [['the city', 'city'], ['taxpayers', 'taxpayers']];
    items.forEach(([s, wd], i) => {
      const t0 = w('H3', wd);
      if (T < t0) { KC += 8; return; }
      lab('not ' + s, 330, 160 + i * 110, 70, t0, { color: P.ink, align: 'center' });
      strike(160, 166 + i * 110, 500, t0 + 0.35);
    });
    if (T > w('H3', 'one person')) {
      stamp('−$1,000 a month', 1250, 900, 72, w('H3', 'one person'), { color: P.red, rot: 0.04 });
      arrow(1050, 860, 940, 720, prog(T, w('H3', 'pocket'), w('H3', 'pocket', 0.4)), { stroke: P.red, strokeWidth: 7 });
      lab('whoever owns this building', 1250, 1000, 52, w('H3', 'whoever'), { color: P.red });
    } else KC += 20;
  }

  // H4: voucher + random tax
  function sRandom() {
    plate('street', c('H4') - 0.6, ce('H4') + 0.6, { z: [1.0, 1.12], x: [0, 0], y: [0.2, -0.1] });
    note(400, 250, 600, 230, w('H4', 'voucher'), () => {
      txt('housing voucher', 0, -50, 56, { color: P.green });
      txt('+$1,000', 0, 40, 96, { color: P.green });
    });
    note(1520, 250, 640, 230, w('H4', 'tax on one'), () => {
      txt('tax on one landlord', 0, -50, 56, { color: P.red });
      txt('−$1,000', 0, 40, 96, { color: P.red });
    });
    if (T > w('H4', 'random')) lab('picked at random', 1120, 860, 76, w('H4', 'random'), { color: P.plum, rot: -0.04 }); else KC++;
    stamp('hard sell', 960, 560, 80, w('H4', 'hard sell'), { color: P.red });
  }

  // H5: the leaky pipe
  function sPipe() {
    plate('pipe', c('H5') - 0.6, ce('H5') + 0.6, { z: [1.04, 1.12], x: [-0.4, 0.4] });
    lab('money leaks out', 1060, 880, 76, w('H5', 'leaks'), { color: P.red });
    lab('and the bill lands in odd places', 1060, 970, 58, w('H5', 'bill lands'), { color: P.ink });
    note(1460, 190, 700, 190, w('H5', 'free-market'), () => {
      txt('a free-market idea', 0, -30, 60, { color: P.teal });
      txt('pushed for 60+ years', 0, 40, 46, { font: PRINT });
    });
  }

  // title card on paper
  function sTitle() {
    const t0 = ce('H5') + 0.2;
    stamp('economic physics', 960, 230, 52, t0, { color: P.teal, rot: -0.04 });
    wt('the free-market case for', 960, 380, 96, t0 + 0.2, t0 + 0.9, { color: P.plum });
    wt('just giving people cash', 960, 520, 150, t0 + 0.7, t0 + 1.7);
    line(520, 620, 1400, 620, eOut(prog(T, t0 + 1.6, t0 + 1.9)), { stroke: P.red, strokeWidth: 7 });
    wt(SCRIPT.subtitle, 960, 700, 60, t0 + 1.8, t0 + 2.6, { font: PRINT, color: P.teal });
    grp(360, 860, popS(t0 + 2.0), Math.sin(T * 1.3) * 0.04, () => cash(0, 0, 0.75, 1));
    grp(1560, 860, popS(t0 + 2.2), Math.sin(T * 1.1) * 0.04, () => giftCard(0, 0, 0.6, { r: 0.12 }));
    if (T > t0 + 2.2) xMark(1560, 860, 0.9, fadeIn(t0 + 2.6, 0.2)); else KC += 4;
  }

  // U1-U2: a dollar means more
  function sDollar() {
    plate('diptych', c('U1') - 0.6, ce('U2') + 0.6, { z: [1.0, 1.06] });
    lab('$100 =', 480, 120, 70, w('U2', 'hundred'), { color: P.ink });
    lab('a week of groceries', 480, 205, 66, w('U2', 'groceries'), { color: P.green });
    lab('$100 =', 1440, 120, 70, w('U2', 'billionaire'), { color: P.ink });
    lab('a rounding error', 1440, 205, 66, w('U2', 'rounding'), { color: P.red });
  }

  // U3: Bernoulli and doubling
  function sBernoulli() {
    plate('bernoulli', c('U3') - 0.6, ce('U3') + 0.6, { z: [1.0, 1.05], x: [-0.6, -0.6] });
    note(1380, 330, 860, 520, w('U3', 'Bernoulli'), () => {
      const ox = -360, oy = 200, ww = 700, h = 380;
      arrow(ox, oy, ox + ww, oy, 1, { strokeWidth: 3.5 });
      arrow(ox, oy, ox, oy - h, 1, { strokeWidth: 3.5 });
      txt('income', ox + ww - 70, oy + 34, 40);
      txt('well-being', ox + 10, oy - h - 22, 40, { align: 'left' });
      const fy = (u) => oy - (h - 30) * Math.log2(1 + u * 15) / 4.0;
      const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([ox + u * ww, fy(u)]); }
      curveP(pts, eIO(prog(T, w('U3', 'number'), w('U3', 'Every time'))), { stroke: P.blue, strokeWidth: 6 });
      txt('1738', ox + ww - 80, oy - h + 20, 54, { color: P.plum, alpha: fadeIn(w('U3', 'seventeen'), 0.3) });
    });
    const rows = [['$20k → $40k', 'twenty thousand'], ['$1M → $2M', 'one million']];
    rows.forEach(([s, wd], i) => {
      const t0 = w('U3', wd);
      if (T < t0) { KC += 10; return; }
      note(1250, 700 + i * 130, 560, 110, t0, () => txt(s, 0, 0, 64, {}));
      stamp('+1', 1620, 700 + i * 130, 60, i ? w('U3', 'two million', 0.3) : w('U3', 'forty', 0.3), { color: P.green });
    });
  }

  // U4-U5: Alice and Bob, then the log score (on paper)
  function sAlice() {
    const t = T;
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
      txt('total well-being', 160, -40, 40, { font: PRINT });
      txt(flip < 0.5 ? '$10k' : '$20k', -170, 22, 70, { color: flip < 0.5 ? P.ink : P.green });
      txt(flip < 0.5 ? '24.6' : '24.2', 160, 22, 70, { color: flip < 0.5 ? P.ink : P.red });
      if (flip >= 0.5) { arrow(-80, 30, -80, -10, 1, { stroke: P.green, strokeWidth: 5, head: 16 }); arrow(270, -10, 270, 30, 1, { stroke: P.red, strokeWidth: 5, head: 16 }); }
      else KC += 12;
    }, popS(w('U4', 'five thousand')));
    stamp('2x the money, less well-being', 960, 960, 58, w('U4', 'twice'), { alpha: fadeOut(c('U5') - 0.3, 0.4) });
    if (t > c('U5') - 0.2) {
      const x0 = 1340;
      grp(x0, 300, popS(c('U5')), 0, () => {
        rect(-400, -100, 800, 200, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3.5 });
        txt('a society\'s score', 0, -45, 56, { color: P.plum });
        txt('= average of log(income)', 0, 35, 54, { font: PRINT });
      });
      wt('grow the pie', x0 - 230, 540, 58, w('U5', 'pie grows'), w('U5', 'pie grows', 0.4), { color: P.teal });
      wt('share it evenly', x0 + 230, 540, 58, w('U5', 'shared'), w('U5', 'shared', 0.4), { color: P.red });
      arrow(x0 - 230, 580, x0 - 70, 710, prog(t, w('U5', 'pie grows'), w('U5', 'pie grows', 0.5)), { stroke: P.teal, strokeWidth: 5 });
      arrow(x0 + 230, 580, x0 + 70, 710, prog(t, w('U5', 'shared'), w('U5', 'shared', 0.5)), { stroke: P.red, strokeWidth: 5 });
      const lvl = eOut(prog(t, w('U5', 'goes up when the pie grows'), ce('U5', 0.4)));
      grp(x0, 850, popS(w('U5', 'score')), 0, () => {
        rect(-24, -110, 48, 170, 1, { strokeWidth: 3.5 });
        rect(-14, 60 - 40 - 110 * lvl, 28, 40 + 110 * lvl, 1, { fill: P.red, fillStyle: 'solid', stroke: 'none' });
        circ(0, 80, 70, 1, { fill: P.red, fillStyle: 'solid' });
      });
      stamp('both count', x0 + 240, 880, 56, w('U5', 'more evenly'), { color: P.green, rot: 0.06 });
    } else KC += 200;
  }

  // D1-D3: the sweater
  function sGift() {
    plate('gift', c('D1') - 0.6, ce('D3') + 0.6, { z: [1.0, 1.1], x: [0, 0.1], y: [-0.2, -0.4] });
    if (T > w('D2', 'ten dollars')) grp(560, 420, popS(w('D2', 'ten dollars')), 0, () => priceTag(0, 0, 1.2, 'paid $10')); else KC += 20;
    if (T > w('D2', 'worth seven')) grp(1380, 300, popS(w('D2', 'worth seven')), 0.1, () => priceTag(0, 0, 1.2, 'worth $7', 1, P.teal)); else KC += 20;
    note(960, 880, 900, 220, c('D3'), () => {
      txt('giver: −$10', -230, -50, 60, { color: P.red, alpha: fadeIn(w('D3', 'down ten'), 0.2) });
      txt('you: +$7', 230, -50, 60, { color: P.teal, alpha: fadeIn(w('D3', 'up seven'), 0.2) });
      txt('$3 vanished. nobody got it.', 0, 45, 64, { alpha: fadeIn(w('D3', 'vanished'), 0.2) });
    });
    if (T > w('D3', 'vanished')) smokeBurst(1180, 820, w('D3', 'vanished'), 8, 0.8); else KC += 16;
  }

  // D4: Waldfogel
  function sWaldfogel() {
    plate('gifts', c('D4') - 0.6, ce('D4') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    note(1350, 230, 900, 300, w('D4', 'Waldfogel'), () => {
      txt('Joel Waldfogel (1993)', 0, -85, 52, { color: P.plum });
      txt('value lost on holiday gifts:', 0, -15, 44, { font: PRINT });
      txt('1/10', -150, 75, 92, { color: P.red, alpha: fadeIn(w('D4', 'tenth'), 0.2) });
      txt('to', 0, 75, 50, { alpha: fadeIn(w('D4', 'and a'), 0.2) });
      txt('1/3', 150, 75, 92, { color: P.red, alpha: fadeIn(w('D4', 'third'), 0.2) });
    });
  }

  // D5: the ten-dollar bill
  function sBill() {
    plate('bill', c('D5') - 0.6, ce('D5') + 0.6, { z: [1.0, 1.08] });
    lab('$10 handed over = $10 received', 960, 160, 74, w('D5', 'ten-dollar bill'), { color: P.green });
    lab('nothing lost', 960, 260, 64, w('D5', 'nothing'), { color: P.green });
    stamp('deadweight loss', 960, 820, 96, w('D5', 'deadweight'), { color: P.red });
    lab('value that could have existed, and doesn\'t', 960, 950, 56, w('D5', 'could have'), {});
  }

  // T1: trading freely
  function sFence() {
    plate('fence', c('T1') - 0.6, ce('T1') + 0.6, { z: [1.0, 1.08], x: [0, 0], y: [0.3, 0] });
    lab('both come out ahead', 960, 140, 84, w('T1', 'both'), { color: P.green });
    if (T > w('T1', 'ahead')) { checkMark(760, 420, 1.2, fadeIn(w('T1', 'ahead'), 0.2)); checkMark(1260, 420, 1.2, fadeIn(w('T1', 'ahead', 0.2), 0.2)); } else KC += 8;
  }

  // price line used by T2-T3: Dana's floor vs your ceiling
  function priceLine(x, y, tax, op = {}) {
    const X = (v) => x - 330 + (v - 14) * 40;
    line(X(14), y, X(31), y, 1, { strokeWidth: 3 });
    [15, 20, 25, 30].forEach((v) => { line(X(v), y - 10, X(v), y + 10, 1, { strokeWidth: 2 }); txt('$' + v, X(v), y + 38, 34, { font: PRINT, color: P.grey }); });
    const dana = 20 + 8 * tax;
    dot(X(dana), y, 13, P.teal); txt('Dana needs $' + Math.round(dana), X(dana), y - 50, 42, { color: P.teal });
    dot(X(25), y, 13, P.gold); txt('you pay up to $25', X(25) + (tax > 0.3 ? -40 : 30), y + 86, 42, { color: '#b07a12' });
    if (tax < 0.5) { rect(X(dana), y - 18, X(25) - X(dana), 36, 1, { fill: P.green, fillStyle: 'solid', stroke: 'none', fillAlpha: 0.45 * (1 - tax * 2) }); }
    else KC += 2;
  }
  // T2-T3: the roof
  function sRoof() {
    plates([['roof', c('T2') - 0.6, { z: [1.0, 1.06], x: [-0.2, 0.2] }], ['leak', w('T3', 'never happens') - 0.1, { z: [1.0, 1.08] }]], ce('T4') + 0.6);
    const tax = eIO(prog(T, w('T3', 'eight-dollar'), w('T3', 'twenty-eight')));
    const out = w('T3', 'never happens');
    note(1390, 300, 840, 330, w('T2', 'twenty dollars'), () => {
      priceLine(0, 20, tax);
      if (T > w('T2', 'five dollars') && tax < 0.5) txt('+$5 of value', 0, -110, 56, { color: P.green, alpha: fadeIn(w('T2', 'five dollars'), 0.2) * (1 - tax * 2) }); else KC++;
      if (tax > 0.01) txt('+ $8 tax', -40, -110, 56, { color: P.red, alpha: fadeIn(w('T3', 'eight-dollar'), 0.2) }); else KC++;
    }, { out });
    if (T > out) {
      lab('the job never happens', 640, 140, 80, out, { color: P.red });
    } else KC++;
  }

  // T4: nobody wins
  function sNobody() {
    note(1480, 230, 700, 300, c('T4'), () => {
      txt('tax collected: $0', 0, -80, 60, { alpha: fadeIn(w('T4', 'collects nothing'), 0.2) });
      txt('roof: still leaking', 0, 0, 56, { color: P.blue, alpha: fadeIn(w('T4', 'roof still'), 0.2) });
      txt('value lost: $5', 0, 80, 60, { color: P.red, alpha: fadeIn(w('T4', 'five dollars'), 0.2) });
    }, { out: w('T4', 'A tax on trading') });
    stamp('a speeding ticket for favors', 960, 900, 76, w('T4', 'speeding ticket'), { color: P.red, rot: -0.03 });
  }

  // T5: the two leaks (paper)
  function sLeaks() {
    txt('two leaks to avoid', 960, 160, 90, { alpha: fadeIn(c('T5'), 0.3), color: P.plum });
    grp(560, 520, popS(w('T5', 'benefits')), 0, () => { sweater(0, 0, 1.4); priceTag(150, -120, 0.9, '$10'); priceTag(150, 30, 0.9, 'worth $7', 1, P.teal); });
    wt('benefits worth less than they cost', 560, 790, 54, w('T5', 'benefits'), w('T5', 'cost'));
    grp(1360, 520, popS(w('T5', 'taxes')), 0, () => { roofCap(-80, 0, 1.3); xMark(80, -10, 1.3); });
    wt('taxes that kill trades', 1360, 790, 54, w('T5', 'taxes'), w('T5', 'kill trades'));
  }

  // G1-G2: how we usually help
  function sVoucher() {
    plates([['voucher', c('G1') - 0.6, { z: [1.06, 1.0], x: [0.3, 0] }], ['parking', w('G2', 'Free street') - 0.1, { z: [1.0, 1.08] }]], ce('G2') + 0.6);
    const out = w('G2', 'Free street');
    if (T < out + 0.5) {
      note(560, 170, 820, 160, c('G1'), () => txt('how we usually help', 0, 0, 80, { color: P.plum }), { out: c('G2') + 0.6 });
      if (T > w('G2', 'housing voucher')) grp(470, 560, popS(w('G2', 'housing voucher')), -0.08, () => giftCard(0, 0, 0.75, {}), fadeOut(out, 0.3)); else KC += 40;
      lab('rent only', 470, 760, 64, w('G2', 'only be spent'), { color: P.red, out });
      lab('approved units only', 470, 840, 58, w('G2', 'approved'), { color: P.red, out });
    } else KC += 100;
    if (T > out) {
      note(1440, 170, 760, 170, w('G2', 'gift card for drivers'), () => txt('a gift card for drivers', 0, 0, 70, { color: P.red }));
      lab('paid for by everyone', 1440, 330, 66, w('G2', 'paid for'), {});
      lab('even people without a car', 1440, 410, 56, w('G2', "don't own"), { color: P.plum });
    } else KC += 70;
  }

  // G3: rent control lock-in
  function sStuck() {
    plate('stuck', c('G3') - 0.6, ce('G3') + 0.6, { z: [1.0, 1.1], x: [-0.3, 0.3] });
    stamp('the sweater, only worse', 560, 160, 70, w('G3', 'sweater'), { color: P.red });
    lab('discount works here only', 560, 280, 60, w('G3', 'this one'), {});
    if (T > w('G3', 'new job')) arrow(1100, 300, 1500, 220, prog(T, w('G3', 'new job'), w('G3', 'new job', 0.5)), { stroke: P.teal, strokeWidth: 7 }); else KC += 8;
    lab('new job?', 1560, 160, 64, w('G3', 'new job'), { color: P.teal });
    lab('smaller place?', 1560, 250, 58, w('G3', 'smaller'), { color: P.teal });
    lab('stays put', 560, 380, 64, w('G3', 'stay put'), { color: P.red });
  }

  // G4: San Francisco
  function sCondos() {
    plate('condos', c('G4') - 0.6, ce('G4') + 0.6, { z: [1.0, 1.08], x: [0.3, -0.3] });
    note(960, 860, 980, 260, w('G4', 'San Francisco'), () => {
      txt('rent control in San Francisco', 0, -70, 54, { color: P.plum });
      txt('rental supply: −15%', 0, 10, 80, { color: P.red, alpha: fadeIn(w('G4', 'fifteen'), 0.2) });
      txt('Diamond, McQuade & Qian (2019)', 0, 85, 36, { font: PRINT, color: P.grey });
    });
  }

  // G5: food stamps mostly work like cash
  function sGrocery() {
    plate('grocery', c('G5') - 0.6, ce('G5') + 0.6, { z: [1.0, 1.06], x: [0.4, 0.4] });
    note(500, 420, 760, 560, w('G5', 'food stamps'), () => {
      const g = eOut(prog(T, w('G5', 'spend more'), w('G5', 'groceries', 0.3)));
      const b = eOut(prog(T, w('G5', 'benefit'), w('G5', 'benefit', 0.4)));
      rect(-220, 180 - 300 * g, 150, 300 * g + 0.1, 1, { fill: P.green, hachureGap: 8 });
      rect(70, 180 - 170 * b, 150, 170 * b + 0.1, 1, { fill: P.gold, hachureGap: 8 });
      line(-280, 180, 280, 180, 1, { strokeWidth: 3 });
      txt('grocery spending', -145, 225, 36, { font: PRINT });
      txt('the benefit', 145, 225, 36, { font: PRINT });
      txt('≈ cash', 0, -210, 72, { color: P.green, alpha: fadeIn(w('G5', 'almost like money'), 0.2) });
    }, { out: w('G5', 'The waste') });
    lab('the waste: when a benefit steers you', 1300, 140, 58, w('G5', 'The waste'), { color: P.red });
    lab('toward what you\'d trade away', 1300, 220, 58, w('G5', 'trade away'), { color: P.red });
  }

  // G6: cash isn't wasted
  function sCash() {
    plate('cash', c('G6') - 0.6, ce('G6') + 0.6, { z: [1.0, 1.08], x: [-0.3, 0.3] });
    lab('"they\'ll waste it"', 960, 130, 84, w('G6', 'waste it'), { color: P.plum });
    note(1420, 820, 840, 300, w('G6', 'World Bank'), () => {
      txt('World Bank review, 19 studies', 0, -95, 50, { color: P.plum });
      txt('cash to poor families →', 0, -25, 46, { font: PRINT });
      txt('alcohol & tobacco spending', 0, 35, 52, {});
      txt('↓', 0, 105, 80, { color: P.green, alpha: fadeIn(w('G6', 'goes down'), 0.2) });
      txt('Evans & Popova (2017)', 260, 115, 30, { font: PRINT, color: P.grey });
    });
  }

  // G7: exceptions
  function sLighthouse() {
    plate('lighthouse', c('G7') - 0.6, ce('G7') + 0.6, { z: [1.0, 1.1], x: [0.3, -0.2] });
    note(560, 200, 860, 200, w('G7', 'fenced out'), () => {
      txt("things nobody can be fenced out of", 0, -30, 48, {});
      txt('pay for them directly', 0, 40, 56, { color: P.teal, alpha: fadeIn(w('G7', 'paid for directly'), 0.2) });
    });
    note(560, 440, 860, 170, w('G7', 'holding the cash'), () => {
      txt('when the cash goes to someone else', 0, -25, 46, {});
      txt('like a child', 0, 35, 52, { color: P.teal, alpha: fadeIn(w('G7', 'child'), 0.2) });
    });
    stamp('real, but narrow', 1420, 880, 84, w('G7', 'narrow'), { color: P.red });
  }

  // W1-W2: the second welfare theorem (paper)
  function sTheorem() {
    grp(960, 200, popS(w('W1', 'theorem')), 0, () => {
      rect(-520, -90, 1040, 180, 1, { fill: P.cream, fillStyle: 'solid', strokeWidth: 3.5 });
      txt('the second welfare theorem', 0, 0, 84, { color: P.plum });
    });
    bulb(1560, 190, 0.9, fadeIn(w('W1', 'theorem'), 0.3), popS(w('W1', 'theorem')));
    const share = prog(T, w('W2', 'any amount'), w('W2', 'like'));
    const sl = Math.round(lerp(2, 8, eIO(share)));
    grp(560, 620, popS(c('W2')), 0, () => pie(0, 0, 200, { slices: sl }));
    wt('any amount of sharing', 560, 900, 58, w('W2', 'any amount'), w('W2', 'like'));
    wt('without shrinking the pie', 1320, 520, 64, w('W2', 'without shrinking'), w('W2', 'at all'), { color: P.teal });
    wt('*if the money moves in ways', 1320, 660, 50, w('W2', 'as long as'), w('W2', 'moves'), { font: PRINT, color: P.red });
    wt("that don't depend on what anyone does", 1320, 730, 50, w('W2', "don't depend"), w('W2', 'anyone does'), { font: PRINT, color: P.red });
  }

  // W3: values vs engineering
  function sEngineering() {
    plate('blueprint', c('W3') - 0.6, ce('W3') + 0.6, { z: [1.0, 1.1], x: [-0.2, 0.2] });
    lab('real life: never perfect', 520, 130, 66, w('W3', 'never'), { color: P.red, out: w('W3', 'splits') });
    lab('but much closer than now', 520, 215, 60, w('W3', 'closer'), { color: P.green, out: w('W3', 'splits') });
    note(520, 220, 740, 160, w('W3', 'How much'), () => {
      txt('how much to share?', 0, -30, 56, {});
      txt('→ values', 0, 38, 56, { color: P.plum, alpha: fadeIn(w('W3', 'values'), 0.2) });
    });
    note(520, 430, 740, 160, w('W3', 'How to share'), () => {
      txt('how to share?', 0, -30, 56, {});
      txt('→ engineering', 0, 38, 56, { color: P.teal, alpha: fadeIn(w('W3', 'engineering'), 0.2) });
    });
    stamp('better and worse answers', 1300, 920, 70, w('W3', 'better and worse'), { color: P.red });
  }

  // tax ladder used in X1 and X5-X6
  const RUNGS = [['pollution', P.green], ['land', P.green], ['spending', P.gold], ['income', P.red]];
  function ladder(x, y, show, hi, op = {}) {
    line(x - 220, y - 360, x - 220, y + 340, 1, { strokeWidth: 5 });
    line(x + 220, y - 360, x + 220, y + 340, 1, { strokeWidth: 5 });
    RUNGS.forEach(([s, col], i) => {
      const yy = y + 260 - i * 170, a = clamp(show[i] || 0);
      line(x - 220, yy, x + 220, yy, a, { strokeWidth: 5 });
      txt(s, x, yy - 40, 60, { color: col, alpha: a * (hi == null || hi === i ? 1 : 0.45) });
    });
  }
  // X1: where the money comes from (paper)
  function sLadder() {
    wt('where does the money come from?', 960, 120, 76, c('X1'), w('X1', 'come from'), { color: P.plum });
    ladder(700, 600, [fadeIn(w('X1', 'Start'), 0.3), fadeIn(w('X1', 'Start', 0.3), 0.3), fadeIn(w('X1', 'block'), 0.3) * 0.35, fadeIn(w('X1', 'block'), 0.3) * 0.35]);
    wt("first: taxes that don't block trades", 1360, 560, 54, w('X1', 'Start'), w('X1', 'useful'), { color: P.green });
    if (T > w('X1', 'useful')) checkMark(1360, 680, 1.2, fadeIn(w('X1', 'useful'), 0.2)); else KC += 4;
  }

  // X2: pollution
  function sFactory() {
    plate('factory', c('X2') - 0.6, ce('X2') + 0.6, { z: [1.0, 1.1], x: [-0.3, 0.2] });
    lab('free to dump smoke', 1400, 140, 66, w('X2', 'dumps'), { color: P.ink, out: w('X2', 'pollution tax') });
    lab('so it makes too much', 1400, 230, 60, w('X2', 'too much'), { color: P.red, out: w('X2', 'pollution tax') });
    note(1400, 200, 720, 180, w('X2', 'pollution tax'), () => {
      txt('pollution tax', 0, -35, 70, { color: P.teal });
      txt('the bill goes back to the polluter', 0, 40, 40, { font: PRINT });
    });
    stamp('grows the pie', 1400, 420, 80, w('X2', 'grows the pie'), { color: P.green });
  }

  // X3-X4: land
  function sLand() {
    plates([
      ['lot0', c('X3') - 0.6, { z: [1.0, 1.04] }],
      ['lot1', w('X3', 'train station') - 0.1, { z: [1.04, 1.06] }],
      ['lot2', w('X3', 'Then shops') - 0.1, { z: [1.06, 1.1] }],
      ['lot3', w('X3', 'lift a finger') - 0.3, { z: [1.1, 1.18], x: [0, -0.2], y: [0, 0.4] }],
    ], ce('X4') + 0.6);
    // land value meter
    const v = [[c('X3'), 1], [w('X3', 'train station'), 2], [w('X3', 'shops'), 3], [w('X3', 'hospital'), 4], [w('X3', 'neighbors'), 5]].filter(([t0]) => T > t0).length;
    const out = c('X4');
    note(1640, 180, 420, 200, w('X3', 'empty lot'), () => {
      txt('land value', 0, -50, 48, { font: PRINT });
      txt('$'.repeat(Math.max(1, v)), 0, 30, 92, { color: P.green });
    }, { out });
    lab("the owner didn't lift a finger", 960, 980, 66, w('X3', 'lift a finger'), { color: P.plum, out });
    if (T > out) {
      note(560, 190, 900, 200, c('X4'), () => {
        txt('nobody can make more land', 0, -35, 56, {});
        txt("taxing it doesn't make less of it", 0, 40, 46, { font: PRINT, color: P.teal, alpha: fadeIn(w('X4', 'taxing it'), 0.2) });
      });
      const acts = [['builds', 'builds'], ['sells', 'sells'], ['works', 'works'], ['does nothing', 'nothing']];
      note(1480, 470, 640, 400, w('X4', 'bill is the same'), () => {
        txt('the bill is the same if the owner…', 0, -150, 40, { font: PRINT });
        acts.forEach(([s, wd], i) => { const a = fadeIn(w('X4', wd), 0.2); txt(s, -60, -80 + i * 62, 50, { alpha: a, align: 'left' }); if (a > 0) checkMark(-120, -80 + i * 62, 0.45, a); else KC += 3; });
      });
      stamp('no deadweight loss', 960, 960, 84, w('X4', 'no deadweight'), { color: P.green });
    } else KC += 200;
  }

  // X5-X6: the rest (paper)
  function sRest() {
    const t = T;
    // spending bar vs what pollution + land cover
    const bx = 160, by = 260, bw = 1600, bh = 120;
    const a = fadeIn(c('X5'), 0.4);
    txt('what a country spends', bx, by - 50, 52, { align: 'left', alpha: a, font: PRINT });
    rect(bx, by, bw, bh, a, { strokeWidth: 4 });
    const cov = eOut(prog(t, w('X5', 'raise a lot'), w('X5', 'raise a lot', 0.8)));
    if (cov > 0) rect(bx, by, bw * 0.55 * cov, bh, 1, { fill: P.green, hachureGap: 10, stroke: 'none' }); else KC += 2;
    txt('pollution + land', bx + bw * 0.27, by + bh / 2, 56, { alpha: fadeIn(w('X5', 'raise a lot'), 0.3), halo: 10 });
    const rest = fadeIn(w('X5', 'not everything'), 0.4);
    txt('?', bx + bw * 0.78, by + bh / 2, 80, { alpha: rest, color: P.red });
    wt('the rest: taxes on trades', bx + bw * 0.78, by + bh + 60, 50, w('X5', 'back to taxing'), w('X5', 'trades'), { color: P.red });
    wt('the pie shrinks a little', bx + bw * 0.78, by + bh + 120, 46, w('X5', 'shrink'), w('X5', 'little'), { font: PRINT, color: P.red });
    stamp('keep it small', 600, 520, 70, w('X5', 'small as possible'), { color: P.plum, alpha: fadeOut(c('X6') - 0.2, 0.3) });
    // X6 rules
    if (t > c('X6') - 0.3) {
      const rules = [['tax spending before income', 'spending before'], ['one rate, few loopholes', 'one rate']];
      rules.forEach(([s, wd], i) => { wt(s, 960, 620 + i * 110, 70, w('X6', wd), w('X6', wd, 0.6), { color: i ? P.teal : P.gold }); });
      wt('(economists still argue about the exact rates)', 960, 860, 44, w('X6', 'argue'), w('X6', 'rates'), { font: PRINT, color: P.grey });
      stamp('the bigger win: what you do with the money', 960, 980, 56, w('X6', 'bigger win'), { color: P.green });
    } else KC += 60;
  }

  // V1: everyone gets the same check
  function sChecks() {
    plate('checks', c('V1') - 0.6, ce('V1') + 0.8, { z: [1.0, 1.06] });
    stamp('the same check for everyone', 960, 150, 84, w('V1', 'same check'), { color: P.green });
  }

  // V2: the table (paper)
  function sTable() {
    const rows = [[12000, 'twelve'], [50000, null], [100000, null], [1000000, 'a million']];
    const fmt = (n) => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
    txt('40% flat tax + $10,000 dividend', 960, 110, 74, { color: P.plum, alpha: fadeIn(c('V2'), 0.3) });
    const cols = [['you earn', 330], ['tax (40%)', 720], ['+ dividend', 1080], ['take home', 1400], ['net rate', 1700]];
    cols.forEach(([s, x]) => txt(s, x, 240, 46, { font: PRINT, color: P.grey, alpha: fadeIn(c('V2') + 0.3, 0.3) }));
    line(150, 285, 1820, 285, fadeIn(c('V2') + 0.3, 0.4), { strokeWidth: 3 });
    rows.forEach(([e, wd], i) => {
      const t0 = wd ? w('V2', wd) - 0.2 : w('V2', 'Earn a million') - 1.2 + i * 0.3, y = 360 + i * 120;
      const a = fadeIn(t0, 0.3), tax = e * 0.4, home = e - tax + 10000, rate = (tax - 10000) / e;
      txt(fmt(e), 330, y, 62, { alpha: a });
      txt(fmt(tax), 720, y, 62, { alpha: a, color: P.red });
      txt('$10,000', 1080, y, 62, { alpha: a, color: P.green });
      txt(fmt(home), 1400, y, 62, { alpha: a });
      txt(Math.round(rate * 100) + '%', 1700, y, 62, { alpha: a, color: rate < 0 ? P.green : P.ink });
    });
    stamp('progressive, with no brackets', 960, 900, 70, w('V2', 'no brackets'), { color: P.teal });
  }

  // V3: Friedman
  function sFriedman() {
    plate('desk1962', c('V3') - 0.6, ce('V3') + 0.6, { z: [1.0, 1.08], x: [0.2, -0.2] });
    note(960, 820, 1000, 260, w('V3', 'Friedman'), () => {
      txt('Milton Friedman, 1962', 0, -65, 64, { color: P.plum });
      txt('"a negative income tax"', 0, 25, 74, { alpha: fadeIn(w('V3', 'negative'), 0.2) });
      txt('Capitalism and Freedom', 0, 95, 38, { font: PRINT, color: P.grey });
    });
  }

  // V4: no welfare cliff
  function sCliff() {
    plate('family', c('V4') - 0.6, ce('V4') + 0.6, { z: [1.0, 1.08], x: [-0.4, -0.4] });
    note(1420, 470, 800, 640, w('V4', 'welfare cliff'), () => {
      const ox = -330, oy = 220, ww = 660, h = 420;
      arrow(ox, oy, ox + ww, oy, 1, { strokeWidth: 3 }); arrow(ox, oy, ox, oy - h, 1, { strokeWidth: 3 });
      txt('what you earn', ox + ww - 140, oy + 36, 36, { font: PRINT });
      txt('what you keep', ox + 10, oy - h - 20, 36, { font: PRINT, align: 'left' });
      const today = [[0, 0.35], [0.3, 0.48], [0.42, 0.56], [0.43, 0.4], [0.6, 0.5], [0.7, 0.58], [0.71, 0.5], [1, 0.72]];
      curveP(today.map(([u, v]) => [ox + u * ww, oy - v * h]), eOut(prog(T, w('V4', 'Today'), w('V4', 'grows'))), { stroke: P.red, strokeWidth: 6 }, false);
      txt('today', ox + 0.86 * ww, oy - 0.62 * h, 40, { color: P.red, alpha: fadeIn(w('V4', 'Today'), 0.3) });
      curveP([[ox, oy - 0.3 * h], [ox + ww, oy - 0.9 * h]], eOut(prog(T, w('V4', 'Here'), w('V4', 'better off'))), { stroke: P.green, strokeWidth: 6 }, false);
      txt('cash dividend', ox + 0.55 * ww, oy - 0.78 * h, 40, { color: P.green, alpha: fadeIn(w('V4', 'Here'), 0.3) });
    });
    lab('no welfare cliff', 560, 140, 84, w('V4', 'welfare cliff'), { color: P.teal });
  }

  // C1: the two questions (paper)
  function sClose() {
    const t = T;
    wt('how much to share?', 540, 300, 74, c('C1'), w('C1', 'how to share'), {});
    wt('your call', 540, 400, 64, w('C1', 'how to share'), w('C1', 'same argument'), { color: P.plum });
    wt('how to share?', 1380, 300, 74, w('C1', 'how to share'), w('C1', 'same'), {});
    grp(1380, 520, popS(w('C1', 'cash')), Math.sin(t * 1.4) * 0.04, () => cash(0, 0, 0.9, 1));
    stamp('cash: cheaper', 1380, 760, 80, w('C1', 'cheaper'), { color: P.green });
    line(960, 220, 960, 860, fadeIn(c('C1'), 0.6), { strokeWidth: 3, stroke: P.grey });
  }

  // C2: the street again
  function sEnd() {
    plate('end', c('C2') - 0.6, ce('C2') + 0.6, { z: [1.1, 1.0], x: [0.3, 0.3] });
    const items = [['the poor: more', 'more'], ['taxpayers: less', 'pay less'], ['the landlord: off the hook', 'off the hook']];
    items.forEach(([s, wd], i) => {
      const t0 = w('C2', wd);
      lab(s, 520, 150 + i * 100, 66, t0, { color: i === 2 ? P.plum : P.green, align: 'center' });
      if (T > t0) checkMark(150, 150 + i * 100, 0.6, fadeIn(t0, 0.2)); else KC += 3;
    });
  }

  // C3: end card (paper)
  function sFinal() {
    const t0 = c('C3');
    wt('the free-market case for the welfare state', 960, 340, 72, t0, w('C3', 'Just'), { color: P.plum });
    wt('just give people money.', 960, 500, 140, w('C3', 'Just'), ce('C3'));
    line(560, 600, 1360, 600, eOut(prog(T, ce('C3'), ce('C3', 0.4))), { stroke: P.red, strokeWidth: 7 });
    grp(960, 780, popS(ce('C3', 0.2)), Math.sin(T * 1.2) * 0.04, () => cash(0, 0, 0.8, 1));
    stamp('economic physics', 960, 980, 46, ce('C3', 0.5), { color: P.teal, rot: -0.03 });
  }

  // ---------- assembly ----------
  function buildScenes() {
    const S = (id, draw, paper = false, lead = 0.6) => ({ start: Math.max(0, c(id) - lead), draw, paper });
    SCN = [
      { start: 0, draw: sOpen },
      S('H3', sLandlord), S('H4', sRandom), S('H5', sPipe),
      { start: ce('H5') + 0.1, draw: sTitle, paper: true },
      S('U1', sDollar), S('U3', sBernoulli), S('U4', sAlice, true),
      S('D1', sGift), S('D4', sWaldfogel), S('D5', sBill),
      S('T1', sFence), S('T2', sRoof), { start: c('T4') - 0.3, draw: () => { sRoof(); sNobody(); } }, S('T5', sLeaks, true),
      S('G1', sVoucher), S('G3', sStuck), S('G4', sCondos), S('G5', sGrocery), S('G6', sCash), S('G7', sLighthouse),
      S('W1', sTheorem, true), S('W3', sEngineering),
      S('X1', sLadder, true), S('X2', sFactory), S('X3', sLand), S('X5', sRest, true),
      S('V1', sChecks), S('V2', sTable, true), S('V3', sFriedman), S('V4', sCliff),
      S('C1', sClose, true), S('C2', sEnd), S('C3', sFinal, true),
    ];
    const E = [];
    const ev = (name, t, dur) => E.push({ name, t, dur });
    const at = (id, word, name = 'pop', extra = 0) => ev(name, w(id, word, extra));
    SCN.slice(1).forEach((s) => ev('whoosh', s.start + 0.05));
    // open
    at('H1', 'worth', 'pop'); at('H1', 'two thousand', 'stamp'); at('H1', 'law', 'stamp');
    at('H2', 'saves', 'chaching'); at('H2', 'where', 'boing');
    at('H3', 'city', 'tick'); at('H3', 'taxpayers', 'tick'); at('H3', 'one person', 'stamp'); at('H3', 'pocket', 'coin');
    at('H4', 'voucher', 'pop'); at('H4', 'tax on one', 'pop2'); at('H4', 'random', 'boing'); at('H4', 'hard sell', 'stamp');
    at('H5', 'leaks', 'poof'); at('H5', 'free-market', 'pop');
    const tt = ce('H5') + 0.2; ev('stamp', tt); ev('scribble', tt + 0.2, 0.8); ev('scribble', tt + 0.7, 1.0); ev('sparkle', tt + 1.7); ev('pop', tt + 2.0); ev('pop2', tt + 2.2); ev('stamp', tt + 2.6);
    // why help
    at('U2', 'groceries', 'pop'); at('U2', 'rounding', 'pop2');
    at('U3', 'Bernoulli', 'pop'); at('U3', 'number', 'scribble'); at('U3', 'twenty thousand', 'pop2'); at('U3', 'forty', 'ding', 0.3); at('U3', 'one million', 'pop2'); at('U3', 'two million', 'ding', 0.3);
    at('U4', 'Alice', 'pop2'); at('U4', 'Bob', 'pop2'); at('U4', 'five thousand'); at('U4', 'one thousand', 'slide'); at('U4', 'nineteen', 'sad'); at('U4', 'twice', 'stamp');
    ev('pop', c('U5')); at('U5', 'pie grows', 'scribble'); at('U5', 'shared', 'scribble'); at('U5', 'more evenly', 'stamp'); at('U5', 'more evenly', 'ding', 0.1);
    // deadweight
    at('D2', 'ten dollars', 'coin'); at('D2', 'worth seven', 'pop'); at('D3', 'down ten', 'tick'); at('D3', 'up seven', 'tick'); at('D3', 'vanished', 'poof');
    at('D4', 'Waldfogel', 'pop'); at('D4', 'tenth', 'tick'); at('D4', 'third', 'tick');
    at('D5', 'ten-dollar bill', 'chaching'); at('D5', 'deadweight', 'stamp');
    // trade
    at('T1', 'ahead', 'ding'); at('T2', 'twenty dollars', 'pop'); at('T2', 'twenty-five', 'pop2'); at('T2', 'five dollars', 'coin');
    at('T3', 'eight-dollar', 'slide'); at('T3', 'never happens', 'sad');
    at('T4', 'collects nothing', 'tick'); at('T4', 'roof still', 'tick'); at('T4', 'five dollars', 'poof'); at('T4', 'speeding ticket', 'stamp');
    at('T5', 'benefits', 'pop'); at('T5', 'taxes', 'pop2');
    // how we help
    ev('pop', c('G1')); at('G2', 'housing voucher', 'pop'); at('G2', 'only be spent', 'tick'); at('G2', 'approved', 'tick'); at('G2', 'gift card for drivers', 'pop'); at('G2', "don't own", 'tick');
    at('G3', 'sweater', 'stamp'); at('G3', 'new job', 'slide'); at('G3', 'stay put', 'sad');
    at('G4', 'San Francisco', 'pop'); at('G4', 'fifteen', 'stamp');
    at('G5', 'food stamps', 'pop'); at('G5', 'spend more', 'slide'); at('G5', 'almost like money', 'ding');
    at('G6', 'waste it', 'boing'); at('G6', 'World Bank', 'pop'); at('G6', 'goes down', 'ding');
    at('G7', 'fenced out', 'pop'); at('G7', 'holding the cash', 'pop2'); at('G7', 'narrow', 'stamp');
    // theorem
    at('W1', 'theorem', 'bulb'); at('W2', 'any amount', 'slide'); at('W2', 'without shrinking', 'sparkle'); at('W2', 'as long as', 'scribble');
    at('W3', 'How much', 'pop'); at('W3', 'How to share', 'pop2'); at('W3', 'better and worse', 'stamp');
    // taxes
    at('X1', 'Start', 'scribble'); at('X1', 'useful', 'ding');
    at('X2', 'dumps', 'poof'); at('X2', 'pollution tax', 'chaching'); at('X2', 'grows the pie', 'stamp');
    at('X3', 'empty lot', 'pop'); ['train station', 'shops', 'hospital', 'neighbors'].forEach((x) => at('X3', x, 'coin', 0.3));
    ev('pop', c('X4')); ['builds', 'sells', 'works', 'nothing'].forEach((x) => at('X4', x, 'tick', 0.1)); at('X4', 'no deadweight', 'stamp');
    at('X5', 'raise a lot', 'slide'); at('X5', 'not everything', 'boing'); at('X5', 'small as possible', 'stamp');
    at('X6', 'spending before', 'scribble'); at('X6', 'one rate', 'scribble'); at('X6', 'bigger win', 'stamp');
    // dividend
    at('V1', 'same check', 'chaching'); at('V1', 'same check', 'stamp', 0.1);
    at('V2', 'twelve', 'tick'); at('V2', 'seventeen', 'pop'); at('V2', 'a million', 'tick'); at('V2', 'thirty-nine', 'pop'); at('V2', 'no brackets', 'stamp');
    at('V3', 'Friedman', 'pop'); at('V3', 'negative', 'ding');
    at('V4', 'welfare cliff', 'sad'); at('V4', 'Here', 'slide'); at('V4', 'better off', 'ding');
    // close
    at('C1', 'cash', 'chaching'); at('C1', 'cheaper', 'stamp');
    at('C2', 'more', 'ding'); at('C2', 'pay less', 'ding'); at('C2', 'off the hook', 'sparkle');
    at('C3', 'Just', 'scribble'); ev('pop', ce('C3', 0.2)); ev('stamp', ce('C3', 0.5));
    EVENTS = E.sort((a, b) => a.t - b.t);
  }

