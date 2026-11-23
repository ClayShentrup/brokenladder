  // ---------- extra helpers ----------
  const BLUE = K.blue, GOLD = K.gold, ORANGE = K.orange;
  const quoteCard = (x, y, w, h, q, linesTxt, who, op = {}) => card(x, y, w, h, q, () => {
    const n = linesTxt.length, sz = op.size || 46, gap = sz * 1.3, y0 = -((n - 1) * gap) / 2 - (who ? 30 : 0);
    linesTxt.forEach((s, i) => Dm(s, 0, y0 + i * gap, sz, { color: K.black }));
    if (who) M(who, 0, y0 + n * gap + 20, 26, { color: K.grey });
  }, op);
  // a row of seats; spec: [[label, colour], ...]
  function seats(list, x, y, size, gap, a0, op = {}) {
    list.forEach(([lab, col, q], i) => {
      const a = q != null ? vis(at(q), op.out != null ? at(op.out) : null) : a0;
      if (a <= 0) { KC += 2; return; }
      const cx = x + i * gap;
      box(cx - size / 2 + 6, y - size / 2 + 6, size, size, K.black, a * 0.9);
      box(cx - size / 2, y - size / 2, size, size, col, a);
      frame(cx - size / 2, y - size / 2, size, size, K.black, 4, a);
      if (lab) M(lab, cx, y + size / 2 + 34, op.labSize || 22, { color: K.black, alpha: a });
    });
  }
  // horizontal bar, grows on cue
  function hbar(x, y, wFull, h, col, q, lab, val, op = {}) {
    const t0 = at(q), u = eOut(prog(T, t0, t0 + 0.6));
    if (u <= 0) { KC += 3; return; }
    box(x, y - h / 2, wFull * u, h, col);
    frame(x, y - h / 2, wFull * u, h, K.black, 3);
    if (lab) D(lab, x - 20, y + 2, op.labSize || 40, { align: 'right', alpha: u });
    if (val) D(val, x + wFull * u + 20, y + 2, op.valSize || 44, { align: 'left', alpha: clamp(u * 1.5 - 0.5), color: op.valCol || K.black });
  }
  const dim = (a) => box(0, 0, W, H, 'rgba(20,20,20,0.35)', a);

  // ---------- scenes ----------
  // 1. cold open
  function sOpen() {
    plates([['dais', 0, { z: [1.12, 1.0], x: [0.3, -0.2] }], ['memo', c('O2') - 0.3, { z: [1.0, 1.1] }], ['walkout', c('O3') - 0.3, { z: [1.0, 1.12], x: [-0.2, 0.2] }]], ce('O4') + 0.6);
    banner('Henry County, Georgia', 960, 190, 86, ['O1', 'Henry County'], { out: c('O2') });
    banner('late 2025 · ethics board hearing', 960, 300, 46, ['O1', 'Late'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('O2') });
    banner('9 county employees subpoenaed', 960, 880, 62, ['O1', 'subpoenaed'], { bg: BLUE, out: c('O2') });
    cite('Henry County Board of Ethics hearing video, 2025', ['O1', 'hearing'], c('O2'));
    quoteCard(1180, 520, 1240, 420, ['O2', 'reads a message'], ['"It was Chair Harrell\'s request...', 'the County Attorney advised them that', 'the Board of Ethics does not have', 'the authority to subpoena employees."'], 'ethics administrator, on the record · video at 46:48', { out: c('O3'), size: 42 });
    stampX('9 witnesses walk out', 960, 820, 100, ['O3', 'walk out'], { out: ce('O4', 0.3) });
    banner('usually: the investigation quietly dies', 960, 190, 58, ['O4', 'quietly dies'], { bg: K.black, out: ce('O4', 0.3) });
  }
  function sCounter() {
    plates([['dais', c('O5') - 0.6, { z: [1.0, 1.1] }], ['jurybox', w('O6', 'picked by a jury', -0.3), { z: [1.06, 1.0] }]], ce('O6') + 0.6);
    banner("this board didn't fold", 960, 200, 86, c('O5'), { out: c('O6') });
    stampX('investigate the chair herself', 960, 820, 80, ['O5', 'investigation']);
    banner('elected by voters? no.', 960, 200, 64, ['O6', 'elected by voters'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: ce('O6', 0.2) });
    banner('appointed by politicians? no.', 960, 310, 64, ['O6', 'appointed'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: ce('O6', 0.2) });
    banner('picked by a jury', 960, 880, 110, ['O6', 'picked by a jury'], { bg: BLUE, out: ce('O6', 0.2) });
  }
  function sTitle() {
    const t0 = ce('O6') + 0.1;
    plate('title', t0 - 0.5, t0 + 5, { z: [1.06, 1.0] });
    const a = fadeIn(t0 + 0.3, 0.3);
    box(0, 150, W, 360, 'rgba(20,20,20,0.88)', a * eOut(prog(T, t0 + 0.2, t0 + 0.6)));
    D('the case', 960, 250, 120, { color: K.cream, alpha: fadeIn(t0 + 0.5, 0.25) });
    D('against voting', 960, 395, 150, { color: GOLD, alpha: fadeIn(t0 + 0.9, 0.25) });
    M('election by jury', 960, 478, 30, { color: K.cream, alpha: fadeIn(t0 + 1.6, 0.3) });
  }

  // 2. two jobs
  function sJobs() {
    plate('scales', c('A1') - 0.6, ce('A6') + 0.6, { z: [1.0, 1.1] });
    card(960, 470, 1500, 560, c('A1'), () => {
      D('any system for choosing leaders has two jobs', 0, -210, 46, { color: K.grey });
      box(-4, -160, 8, 400, K.black);
      D('1. alignment', -370, -100, 70, { color: BLUE, alpha: fadeIn(w('A2', 'alignment'), 0.2) });
      Dm('deciders want what the public wants', -370, -20, 34, { alpha: fadeIn(w('A2', 'want what'), 0.2) });
      D('2. competence', 370, -100, 70, { color: GOLD, alpha: fadeIn(w('A3', 'competence'), 0.2) });
      Dm('deciders know what they\'re choosing', 370, -20, 34, { alpha: fadeIn(w('A3', 'know what'), 0.2) });
      const row = (lab, y, q, a1, a2) => { const a = fadeIn(at(q), 0.2); if (a <= 0) { KC += 3; return; } D(lab, 0, y, 40, { alpha: a, color: K.grey }); D(a1, -370, y, 54, { alpha: a, color: a1 === '✗' ? ORANGE : BLUE }); D(a2, 370, y, 54, { alpha: a, color: a2 === '✗' ? ORANGE : BLUE }); };
      row('a king', 80, ['A4', 'king'], '✗', '·');
      row('experts', 150, ['A4', 'experts'], '✗', '✓');
      row('mass elections', 220, ['A5', 'Mass elections'], '✓?', '✓?');
    });
    banner("let's check", 960, 900, 80, c('A6'), { bg: BLUE });
  }

  // 3. competence
  function sOdds() {
    plate('needle', c('R1') - 0.6, ce('R2') + 0.6, { z: [1.12, 1.0] });
    banner('your vote almost certainly won\'t change the result', 960, 180, 54, ['R1', 'almost certainly'], { out: c('R2') });
    card(960, 500, 1200, 380, ['R2', 'one in sixty million'], () => {
      Dm('chance one ballot decides a presidential election', 0, -110, 38, { color: K.grey });
      D('1 in 60,000,000', 0, 10, 130, { color: BLUE });
      Dm('local races: better odds, still almost never', 0, 120, 36, { alpha: fadeIn(w('R2', 'Local races'), 0.2) });
    });
    cite('Gelman, Silver & Edlin, Economic Inquiry, 2012 (2008 average)', ['R2', 'one in sixty']);
  }
  function sIgnorance() {
    plate('homework', c('R3') - 0.6, ce('R5') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    card(560, 480, 900, 520, c('R3'), () => {
      D('the homework', 0, -190, 56, { color: K.grey });
      rows([['cost: hours of reading', ['R3', 'takes hours']], ['payoff: ≈ 0', ['R3', 'close to zero']]], -380, -80, 60, 100);
      D('rational ignorance', 0, 140, 72, { color: BLUE, alpha: fadeIn(w('R4', 'Rational ignorance'), 0.2) });
    }, { out: c('R5') });
    cite('Anthony Downs, An Economic Theory of Democracy, 1957', ['R4', 'Rational'], c('R5'));
    banner('this is arithmetic', 960, 180, 72, ['R5', 'arithmetic'], { bg: BLUE });
    card(1300, 560, 900, 420, ['R5', 'Most people'], () => {
      Dm('what most voters know:', 0, -140, 40, { color: K.grey });
      rows([['· the party', ['R5', 'party']], ['· a slogan', ['R5', 'slogan']], ['· whatever an ad said', ['R5', 'an ad']]], -300, -50, 56, 80);
    });
  }
  function sMoney() {
    plate('billboard', c('R6') - 0.6, ce('R6') + 0.6, { z: [1.0, 1.12], y: [0.3, -0.3] });
    banner('step one: be heard of', 960, 200, 80, ['R6', 'heard their name']);
    stampX('name recognition', 960, 800, 100, ['R6', 'Name recognition']);
    banner('sold by the 30-second spot', 960, 940, 50, ['R6', 'thirty-second'], { bg: BLUE });
  }
  function sFeed() {
    plate('feed', c('R7') - 0.6, ce('R8') + 0.6, { z: [1.0, 1.1] });
    banner('echo chambers', 500, 220, 66, ['R7', 'Echo'], { out: c('R8') });
    banner('foreign influence campaigns', 1300, 340, 58, ['R7', 'Foreign'], { bg: BLUE, out: c('R8') });
    banner('Russia · China · Iran', 1300, 450, 50, ['R7', 'Russia'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('R8') });
    banner('AI fakes, cheaper every year', 800, 860, 62, ['R7', 'generative'], { bg: ORANGE, shadowCol: K.black, out: c('R8') });
    cite('ODNI / FBI / CISA election-threat statements, 2024 · U.S. Treasury sanctions, 2024', ['R7', 'intelligence'], c('R8'));
    card(960, 520, 1300, 420, c('R8'), () => {
      D('millions of voters', 0, -120, 66);
      Dm('× almost no reason to study', 0, -30, 46, { alpha: fadeIn(w('R8', 'no reason'), 0.2) });
      Dm('× an information war', 0, 40, 46, { alpha: fadeIn(w('R8', 'environment'), 0.2) });
      D('= add up the guesses', 0, 130, 70, { color: BLUE, alpha: fadeIn(w('R8', 'adds up'), 0.2) });
    });
  }

  // 4. alignment
  function sTurnout() {
    plate('turnout', c('T1') - 0.6, ce('T5') + 0.6, { z: [1.0, 1.1], x: [-0.2, 0.2] });
    banner('is the electorate a fair sample?', 960, 190, 66, c('T1'), { out: c('T3') });
    card(1300, 560, 860, 440, ['T2', "It isn't"], () => {
      Dm('voters vs. non-voters:', 0, -150, 40, { color: K.grey });
      rows([['older', ['T2', 'older']], ['whiter', ['T2', 'whiter']], ['wealthier', ['T2', 'wealthier']]], -120, -50, 72, 90);
    }, { out: c('T3') });
    cite('U.S. Census Bureau, CPS Voting and Registration Supplement', ['T2', 'Census'], c('T3'));
    banner('opt-in = skewed toward the motivated', 960, 190, 62, c('T3'), { out: c('T5') });
    banner('a pollster who did that: fired', 960, 520, 76, c('T4'), { bg: BLUE, out: c('T5') });
    stampX('we call it democracy', 960, 700, 92, ['T4', 'democracy'], { out: c('T5') });
    card(960, 540, 1200, 400, c('T5'), () => {
      D('mass elections', 0, -130, 50, { color: K.grey });
      D('informed?', -280, -20, 66, { alpha: fadeIn(w('T5', 'informed'), 0.2) }); D('✗', 280, -20, 80, { color: ORANGE, alpha: fadeIn(w('T5', 'informed'), 0.2) });
      D('a fair sample?', -280, 90, 66, { alpha: fadeIn(w('T5', 'fair sample'), 0.2) }); D('✗', 280, 90, 80, { color: ORANGE, alpha: fadeIn(w('T5', 'fair sample'), 0.2) });
    });
  }

  // 5. the machine
  function sMachine() {
    plates([['drum', c('J1') - 0.6, { z: [1.12, 1.0] }], ['jurybox', c('J3') - 0.3, { z: [1.0, 1.08] }], ['lectern', w('J3', 'watch the candidates', -0.3), { z: [1.0, 1.08], x: [0.2, -0.2] }], ['ballot', c('J4') - 0.3, { z: [1.0, 1.12] }]], ce('J4') + 0.6);
    banner('election by jury', 960, 200, 110, ['J1', 'election by jury'], { bg: BLUE, out: c('J3') });
    card(960, 600, 1100, 380, c('J2'), () => {
      rows([['a random sample of citizens', ['J2', 'random sample']], ['like a trial jury', ['J2', 'trial jury']], ['service required · and paid', ['J2', 'required']]], -460, -110, 58, 100);
    }, { out: c('J3') });
    card(560, 520, 860, 560, c('J3'), () => {
      D('a week or two', 0, -220, 56, { color: BLUE });
      rows([['hear every candidate', ['J3', 'hear every']], ['watch them question each other', ['J3', 'watch the candidates']], ['ask their own questions', ['J3', 'own questions']], ['talk it over', ['J3', 'talk it over']]], -360, -110, 50, 90);
    }, { out: c('J4') });
    banner('secret ballot', 960, 200, 80, ['J4', 'secret ballot'], { out: ce('J4', 0.3) });
    stampX('binding', 960, 820, 130, ['J4', 'binding'], { out: ce('J4', 0.3) });
  }
  function sBoth() {
    paperBg();
    D('look at what that does to both jobs', 960, 150, 66, { alpha: fadeIn(c('J5'), 0.3) });
    const col = (x, title, colr, items) => {
      D(title, x, 290, 76, { color: colr, alpha: fadeIn(at(items[0][1]) - 0.3, 0.3) });
      rows(items, x - 380, 400, 44, 80);
    };
    col(520, 'alignment', BLUE, [['no one opts in → no skew', ['J6', 'nobody opts in']], ['a true representative sample', ['J6', 'representative sample']], ['what every poll is chasing', ['J6', 'Every serious poll']]]);
    col(1400, 'competence', GOLD, [['1 in a million → 1 in a few dozen', ['J7', 'one in a few dozen']], ['homework worth doing', ['J7', 'worth doing']], ['protected time', ['J7', 'protected time']]]);
    card(960, 860, 1400, 180, c('J8'), () => {
      D('equal time for every candidate', 0, -30, 58, { color: BLUE });
      Dm('nothing left for money to buy', 0, 40, 40, { alpha: fadeIn(w('J8', "can't buy"), 0.2) });
    });
  }

  // 6. watching
  function sDebate() {
    plate('auditorium', c('W1') - 0.6, ce('W4') + 0.6, { z: [1.0, 1.1] });
    banner('the magic is in deliberation?', 960, 180, 64, c('W1'), { out: c('W2') });
    banner('watching a fair contest does most of the work', 960, 880, 52, ['W1', 'simply watching'], { bg: BLUE, out: c('W2') });
    banner('Intelligence Squared: vote before & after', 960, 180, 58, c('W2'), { out: ce('W4', 0.3) });
    banner('no discussion. just listening.', 960, 290, 46, ['W2', "doesn't discuss"], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('W3') });
    card(960, 590, 1500, 560, c('W3'), () => {
      Dm('one 2009 debate on religion', 0, -230, 40, { color: K.grey });
      D('before', -560, -120, 44, { align: 'left' }); D('after', -560, 120, 44, { align: 'left', alpha: fadeIn(w('W3', 'After ninety'), 0.2) });
      const sc = 0.5;
      hbar(-300, -150, 678 * sc, 50, BLUE, ['W3', 'six hundred'], 'for', '678', { labSize: 32, valSize: 36 });
      hbar(-300, -80, 1102 * sc, 50, GOLD, ['W3', 'eleven hundred'], 'against', '1,102', { labSize: 32, valSize: 36 });
      hbar(-300, 90, 268 * sc, 50, BLUE, ['W3', 'two hundred sixty'], 'for', '268', { labSize: 32, valSize: 36 });
      hbar(-300, 160, 1876 * sc, 50, GOLD, ['W3', 'eighteen hundred'], 'against', '1,876', { labSize: 32, valSize: 36 });
    }, { out: ce('W4', 0.3) });
    cite('Intelligence Squared, "The Catholic Church is a force for good," London, Oct 2009', ['W3', 'twenty-oh-nine'], ce('W4', 0.3));
    stampX('one debate · big swings are common', 960, 960, 52, c('W4'), { out: ce('W4', 0.3) });
  }
  function sOmni() {
    plate('courtroom', c('W5') - 0.6, ce('W6') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    banner('each side: as biased as it likes', 960, 190, 66, ['W5', 'as biased'], { out: c('W6') });
    banner('neutrality comes from the contest', 960, 300, 60, ['W5', 'Neutrality'], { bg: BLUE, out: c('W6') });
    banner('nobody expects the prosecutor to be fair', 960, 820, 52, ['W5', 'prosecutor'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('W6') });
    banner('we expect the trial to be', 960, 920, 60, ['W5', 'expect the trial'], { bg: GOLD, fg: K.black, shadowCol: K.black, out: c('W6') });
    stampX('omni-biased', 960, 520, 150, ['W6', 'omni-biased']);
  }

  // 7. random people?
  function sSurgeon() {
    plates([['jurybox', c('K1') - 0.6, { z: [1.1, 1.0] }], ['surgeons', c('K3') - 0.3, { z: [1.0, 1.1] }]], ce('K4') + 0.6);
    stampX('random people?!', 960, 520, 130, c('K1'), { out: c('K2') });
    card(960, 520, 1300, 360, c('K2'), () => {
      D('run the city', 0, -70, 70, { color: K.grey });
      if (T > w('K2', 'Nobody')) strikeBar(-230, -70, 230, w('K2', 'Nobody')); else KC++;
      D("judge who'd run it best", 0, 60, 76, { color: BLUE, alpha: fadeIn(w('K2', 'judging'), 0.2) });
    }, { out: c('K3') });
    banner("you can't operate. you can tell who explains straight.", 960, 180, 48, ['K3', 'surgeons'], { out: c('K4') });
    banner('laypeople read competence, honesty, good faith', 960, 880, 50, ['K3', 'Research'], { bg: BLUE, out: c('K4') });
    cite('Hendriks, Kienhues & Bromme, PLOS ONE, 2015 (METI)', ['K3', 'Research'], c('K4'));
    banner('pooled across dozens of different lives', 960, 880, 60, c('K4'), { bg: GOLD, fg: K.black, shadowCol: K.black });
  }
  function sLiteracy() {
    plate('literacy', c('K5') - 0.6, ce('K7') + 0.6, { z: [1.0, 1.12] });
    banner('only let qualified people choose?', 960, 190, 66, c('K5'), { out: c('K6') });
    stampX('every filter is a lever', 960, 760, 100, c('K6'), { out: c('K7') });
    banner('literacy tests: sold as "competence"', 960, 190, 56, ['K6', 'Literacy tests'], { raw: false, out: c('K7') });
    banner('used to decide who could vote', 960, 300, 52, ['K6', 'in practice'], { bg: ORANGE, shadowCol: K.black, out: c('K7') });
    card(960, 520, 1300, 300, c('K7'), () => {
      D('randomness', 0, -40, 100, { color: BLUE });
      Dm('the one selection method nobody can tilt', 0, 60, 44);
    });
  }

  // 8. how many jurors
  function sSample() {
    plates([['ladle', c('N1') - 0.6, { z: [1.0, 1.1] }]], ce('N4') + 0.6);
    banner('smaller than you\'d think', 960, 190, 76, ['N1', 'Smaller'], { out: c('N2') });
    card(960, 560, 1600, 620, c('N2'), () => {
      Dm('a town split between A and B · draw 23 jurors', 0, -250, 40, { color: K.grey });
      const t0 = w('N2', 'twenty-three'), t1 = w('N2', 'Sixteen');
      for (let i = 0; i < 23; i++) {
        const a = fadeIn(t0 + i * 0.04, 0.15); if (a <= 0) { KC++; continue; }
        const x = -660 + i * 60, isA = i < 16, colored = T > t1 + i * 0.03;
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = colored ? (isA ? BLUE : GOLD) : K.grey;
        ctx.beginPath(); ctx.arc(x, -130, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      D('16 prefer A', -400, -50, 50, { color: BLUE, alpha: fadeIn(t1, 0.2) }); D('7 prefer B', 400, -50, 50, { color: GOLD, alpha: fadeIn(t1 + 0.5, 0.2) });
      D('≈ 97% sure A wins the whole town', 0, 60, 70, { alpha: fadeIn(c('N3'), 0.2) });
      Dm('town of 1,000 · city of 1,000,000 · nation of 100,000,000', 0, 150, 38, { alpha: fadeIn(w('N3', 'barely moves'), 0.2) });
      D('97% · 97% · 97%', 0, 220, 52, { color: BLUE, alpha: fadeIn(w('N3', 'thousand people'), 0.2) });
    }, { out: c('N4') });
    banner('what matters: sample size + true randomness', 960, 520, 60, ['N4', 'What matters'], { bg: BLUE });
    banner('not the population size', 960, 640, 56, ['N4', 'population'], { bg: K.cream, fg: K.black, shadowCol: BLUE });
  }
  function sScore() {
    plate('scorecard', c('N5') - 0.6, ce('N5') + 0.6, { z: [1.0, 1.1] });
    banner('choose-one voting splits the vote', 960, 180, 60, ['N5', 'Choose-one'], { out: w('N5', 'score voting') });
    card(1250, 560, 1050, 560, ['N5', 'score voting'], () => {
      D('score voting', 0, -220, 60, { color: BLUE });
      const cand = [['Alice', 5], ['Bob', 2], ['Eve', 4]];
      for (let s = 0; s <= 5; s++) M(String(s), -150 + s * 80, -140, 30, { color: K.grey });
      cand.forEach(([nm, sc], i) => {
        const y = -60 + i * 90; D(nm, -260, y, 44, { align: 'right' });
        for (let s = 0; s <= 5; s++) { ctx.save(); ctx.strokeStyle = K.black; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-150 + s * 80, y - 4, 20, 0, Math.PI * 2); ctx.stroke();
          if (s === sc && T > w('N5', 'rate every') + i * 0.4) { ctx.fillStyle = BLUE; ctx.fill(); } ctx.restore(); }
      });
      Dm('highest average wins', 0, 230, 40, { alpha: fadeIn(w('N5', 'highest average'), 0.2) });
    });
    banner('a few dozen jurors: most of a perfect result', 700, 950, 46, ['N5', 'Simulations'], { bg: GOLD, fg: K.black, shadowCol: K.black });
  }
  function sBribe() {
    plate('bribe', c('N6') - 0.6, ce('N8') + 0.6, { z: [1.0, 1.1] });
    stampX('bribery', 960, 500, 140, ['N6', 'Bribery'], { out: c('N7') });
    card(960, 540, 1500, 540, c('N7'), () => {
      Dm('each attempt: a 1-in-20 chance of being reported', 0, -200, 40, { color: K.grey });
      D('odds you get caught', 0, -130, 44);
      hbar(-380, -30, 512 * 1.3, 60, BLUE, ['N7', 'fourteen'], '14 jurors', '51%');
      hbar(-380, 60, 642 * 1.3, 60, BLUE, ['N7', 'Thirty', -0.4], '20 jurors', '64%');
      hbar(-380, 150, 785 * 1.3, 60, BLUE, ['N7', 'Thirty'], '30 jurors', '79%');
    }, { out: c('N8') });
    stampX('secret ballot: no way to check', 960, 520, 80, c('N8'));
  }
  function sCube() {
    paperBg();
    D('a rule of thumb: the cube root', 960, 160, 70, { alpha: fadeIn(c('N9'), 0.3) });
    Dm('of the electorate', 960, 240, 44, { alpha: fadeIn(w('N9', 'electorate'), 0.3) });
    const R = [['town', '8,000', '20', ['N9', 'eight thousand']], ['city', '125,000', '50', ['N9', 'hundred twenty-five']], ['state', '8,000,000', '200', ['N9', 'eight million']], ['nation', '240,000,000', '≈ 620', ['N9', 'two hundred forty']]];
    R.forEach(([k, n, j, q], i) => { const a = fadeIn(at(q), 0.25), y = 380 + i * 140; if (a <= 0) { KC += 3; return; }
      D(k, 420, y, 60, { align: 'left', alpha: a, color: K.grey }); D(n, 1120, y, 66, { align: 'right', alpha: a }); D('→', 1240, y, 66, { alpha: a }); D(j + ' jurors', 1360, y, 66, { align: 'left', alpha: a, color: BLUE }); });
  }

  // 9. history
  function sAthens() {
    plate('athens', c('H1') - 0.6, ce('H3') + 0.6, { z: [1.12, 1.0] });
    banner('one of the oldest ideas in democracy', 960, 180, 64, ['H1', 'oldest'], { out: c('H2') });
    banner('classical Athens: most offices filled by lot', 960, 180, 58, ['H2', 'Athens'], { out: c('H3') });
    quoteCard(1200, 560, 1100, 360, ['H2', 'Aristotle'], ['"appointment by lot is democratic,', 'election, oligarchic."'], 'Aristotle, Politics IV.9 (1294b)', { size: 54, out: c('H3') });
    banner('the worry: a popularity contest', 960, 180, 64, c('H3'));
    card(1300, 580, 800, 420, ['H3', 'favors'], () => {
      Dm('it favors', 0, -140, 44, { color: K.grey });
      rows([['the rich', ['H3', 'the rich']], ['the famous', ['H3', 'the famous']], ['the well-connected', ['H3', 'well-connected']]], -260, -50, 62, 90);
    });
  }
  function sVenice() {
    plate('venice', c('H4') - 0.6, ce('H5') + 0.6, { z: [1.0, 1.1], x: [-0.2, 0.2] });
    banner('Venice: choosing the Doge, 1268–1797', 960, 170, 60, ['H4', 'Venice'], { out: c('H5') });
    card(960, 560, 1760, 380, ['H4', 'Thirty names'], () => {
      const st = [['30', 'lot'], ['9', 'lot'], ['40', 'elect'], ['12', 'lot'], ['25', 'elect'], ['9', 'lot'], ['45', 'elect'], ['11', 'lot'], ['41', 'elect'], ['Doge', 'elect']];
      const t0 = w('H4', 'Thirty names');
      st.forEach(([n, k], i) => { const a = fadeIn(t0 + i * 0.55, 0.2); if (a <= 0) { KC += 2; return; }
        const x = -780 + i * 173; D(n, x, -20, n === 'Doge' ? 50 : 70, { color: k === 'lot' ? GOLD : BLUE, alpha: a }); M(k, x, 60, 26, { color: K.grey, alpha: a }); if (i) D('→', x - 86, -20, 40, { alpha: a, color: K.grey }); });
      Dm('drawn by lot · elected', 0, 140, 34, { color: K.grey });
    }, { out: c('H5') });
    banner("can't bribe who you can't predict", 960, 300, 66, ['H5', 'bribe'], { bg: BLUE });
    banner("can't build a faction around them", 960, 860, 60, ['H5', 'faction'], { bg: K.cream, fg: K.black, shadowCol: BLUE });
  }
  function sWells() {
    plate('wells', c('H6') - 0.6, ce('H6') + 0.6, { z: [1.0, 1.1] });
    banner('H. G. Wells, 1903: the jury method', 960, 180, 60, ['H6', 'Wells'], { raw: true });
    quoteCard(1180, 620, 1200, 300, ['H6', 'described'], ['"government by hustings\' bawling,', 'newspaper clamour, and ward organization"'], 'H. G. Wells, Mankind in the Making, 1903', { size: 44 });
  }

  // 10. georgia
  function sGeorgia() {
    plates([['courthouse', c('G1') - 0.6, { z: [1.1, 1.0] }], ['taxappeal', c('G2b') - 0.3, { z: [1.0, 1.08] }], ['courthouse', c('G2c') - 0.3, { z: [1.0, 1.08] }], ['water', c('G3') - 0.3, { z: [1.0, 1.08] }], ['dam', c('G3b') - 0.3, { z: [1.08, 1.0] }]], ce('G3b') + 0.6);
    banner('in Georgia, it\'s routine', 960, 180, 76, ['G1', 'routine'], { out: c('G2b') });
    banner('every county: grand juries of 16 to 23, drawn at random', 960, 900, 46, ['G2', 'sixteen'], { bg: BLUE, out: c('G2b') });
    card(1390, 560, 900, 820, c('G2b'), () => {
      D('who Georgia grand juries pick', 0, -360, 40, { color: K.grey });
      rows([
        ['tax appeal boards: all 159 counties', ['G2b', 'board of equalization'], { size: 34 }],
        ['voter registrars: dozens of counties', ['G2c', 'registrars'], { size: 34 }],
        ['Lowndes elections board: since 1979', ['G2c', 'Lowndes'], { size: 34 }],
        ['Cherokee water authority: 6 of 7', ['G3', 'six of the seven'], { size: 34 }],
        ['Cherokee airport authority: 4 of 7', ['G3', 'airport'], { size: 34 }],
        ['Towns water authority: all of it', ['G3', 'Towns'], { size: 34 }],
        ['Crisp power commission: 4 of 7', ['G3b', 'power commission'], { size: 34, color: BLUE }],
        ['  with its own hydroelectric dam', ['G3b', 'hydroelectric'], { size: 34, color: BLUE }],
      ], -400, -270, 34, 80);
    });
    cite('electionbyjury.org/learn-more/ebj-in-georgia · O.C.G.A. §§ 15-12-61, 21-2-212, 48-5-311', c('G2b'));
  }
  function sSchools() {
    plate('schoolhouse', c('G3c') - 0.6, ce('G3c') + 0.6, { z: [1.0, 1.1] });
    banner('it used to go further', 960, 180, 76, ['G3c', 'further']);
    banner('grand-jury-appointed school boards', 960, 290, 60, ['G3c', 'school boards'], { bg: BLUE });
    card(1300, 680, 860, 360, ['G3c', 'twenty-eight'], () => {
      D('28 districts', 0, -90, 80, { color: BLUE });
      Dm('still did it in the late 1980s', 0, -10, 40);
      D('ended by a 1992 amendment', 0, 90, 52, { alpha: fadeIn(w('G3c', 'amendment'), 0.2) });
    });
    cite('Education Week, Feb 1988 · Ballotpedia, Georgia Amendment 2 (1992)', ['G3c', 'twenty-eight']);
  }
  function sTurner() {
    plates([['commission', c('G3d') - 0.6, { z: [1.0, 1.1] }], ['statewide', c('G3e') - 0.3, { z: [1.1, 1.0] }]], ce('G3e') + 0.6);
    banner('a caveat critics will raise', 960, 180, 70, ['G3d', 'caveat'], { out: c('G3e') });
    banner('jury lists hand-picked by commissioners', 960, 290, 54, ['G3d', 'hand-picked'], { bg: K.cream, fg: K.black, shadowCol: BLUE, out: c('G3e') });
    card(1290, 640, 980, 470, ['G3d', 'Supreme Court'], () => {
      D('Turner v. Fouche, 1970', 0, -170, 52, { color: BLUE, raw: true });
      rows([['Taliaferro County: majority Black', ['G3d', 'majority Black'], { raw: true }], ['school board: all white', ['G3d', 'all white']], ['picked by a mostly white grand jury', ['G3d', 'mostly white']], ['from a list made by white commissioners', ['G3d', 'list made']]], -430, -70, 40, 70);
    }, { out: c('G3e') });
    cite('Turner v. Fouche, 396 U.S. 346 (1970)', ['G3d', 'Supreme Court'], c('G3e'));
    stampX("not random", 960, 320, 120, c('G3e'), { out: ce('G3e', 0.3) });
    banner('since 2012: a statewide list of voters and drivers', 960, 860, 52, ['G3e', 'Since twenty twelve'], { bg: BLUE, out: ce('G3e', 0.3) });
    banner('the case for real randomness', 960, 960, 52, ['G3e', 'real randomness'], { bg: GOLD, fg: K.black, shadowCol: K.black, out: ce('G3e', 0.3) });
    cite('Jury Composition Reform Act of 2011 (HB 415)', ['G3e', 'Since'], ce('G3e', 0.3));
  }
  function sRoutine() {
    plate('courthouse', c('G4') - 0.6, ce('G6') + 0.6, { z: [1.0, 1.1], x: [0.2, -0.2] });
    banner('a random jury choosing officials, for generations', 960, 190, 54, c('G4'), { out: c('G6') });
    card(960, 600, 1200, 340, c('G5'), () => {
      D('grand jury service', 0, -100, 50, { color: K.grey });
      D('2–3 months', 0, 0, 90, { color: BLUE, alpha: fadeIn(w('G5', 'two or three'), 0.2) });
      Dm('once or twice a week', 0, 90, 44, { alpha: fadeIn(w('G5', 'once or twice'), 0.2) });
    }, { out: c('G6') });
    stampX('they already do', 960, 900, 90, ['G5', 'already do'], { out: c('G6') });
    banner('back to Henry County', 960, 540, 100, c('G6'), { bg: BLUE });
  }

  // 11. henry county
  function sBoard() {
    plate('dais', c('X1') - 0.6, ce('X2') + 0.6, { z: [1.0, 1.1] });
    banner('S.B. 22 (2021): the Henry County Board of Ethics', 960, 170, 52, ['X1', 'sponsored'], { raw: true });
    card(960, 560, 1500, 440, ['X1', 'Seven members'], () => {
      D('seven seats', 0, -160, 50, { color: K.grey });
      const t0 = w('X1', 'Five of them');
      seats([1, 2, 3, 4, 5, 6, 7].map((i) => [i <= 5 ? 'grand jury' : 'other', i <= 5 && T > t0 + i * 0.12 ? BLUE : K.paper]), -540, -20, 110, 180, 1);
      Dm('one per commission district', 0, 160, 40, { alpha: fadeIn(w('X1', 'one for each'), 0.2) });
    });
    banner('a grand jury appointee owes their seat to no one', 960, 920, 50, ['X2', 'owes'], { bg: BLUE });
  }
  function sWalk2() {
    plate('walkout', c('X3') - 0.6, ce('X4') + 0.6, { z: [1.1, 1.0] });
    banner('the walkout', 960, 180, 80, c('X3'), { out: c('X4') });
    banner('the board investigates the chair', 960, 180, 66, ['X4', 'investigate'], { bg: BLUE });
    quoteCard(1180, 600, 1240, 340, ['X4', 'They can investigate'], ['"They can investigate all they want to,', 'but I will not be answering', 'anything that they put out."'], 'Carlotta Harrell, chair, Henry County Board of Commissioners', { size: 44 });
  }
  function sStarve() {
    plate('cramped', c('X5') - 0.6, ce('X6') + 0.6, { z: [1.0, 1.1] });
    banner('next: the resources dry up', 960, 180, 70, c('X5'), { out: c('X6') });
    card(1250, 600, 1100, 520, ['X5', 'laid it out'], () => {
      Dm('January 2026 meeting, on the record', 0, -200, 38, { color: K.grey });
      rows([['no budget for a $310/week job ad', ['X5', 'No budget']], ['(they used a free trial)', ['X5', 'free trial'], { size: 36, color: K.grey }], ['barred from the broadcast room', ['X5', 'Barred']], ['denied cameras to stream meetings', ['X5', 'Denied']]], -490, -110, 44, 80);
    }, { out: c('X6') });
    quoteCard(960, 560, 1300, 280, c('X6'), ['"They want the Board of Ethics', 'to be a figurehead."'], 'Felicia Harrell (no relation), board chair', { size: 54 });
  }
  function sFair() {
    plate('scale2', c('X7') - 0.6, ce('X8') + 0.6, { z: [1.0, 1.12] });
    banner('the charge: a political hit squad', 960, 180, 66, ['X7', 'hit squad'], { out: c('X8') });
    card(1250, 600, 1060, 480, ['X7', 'nepotism'], () => {
      M('case 2026-EB-1: county manager, nepotism', 0, -180, 30, { color: K.grey });
      rows([['husband hired: 2004', ['X7', 'husband']], ['she became manager: 13 years later', ['X7', 'thirteen years']]], -460, -80, 46, 90);
      D('dismissed, unanimously', 0, 140, 70, { color: BLUE, alpha: fadeIn(w('X7', 'dismissed'), 0.2) });
    });
    banner('follow the evidence wherever it goes', 960, 180, 66, c('X8'), { bg: BLUE });
  }

  // 12. the rewrite
  function sBill() {
    plates([['capitol', c('V1') - 0.6, { z: [1.12, 1.0] }], ['eraser', c('V4') - 0.3, { z: [1.0, 1.12] }], ['capitol', c('V6') - 0.3, { z: [1.0, 1.08] }]], ce('V6') + 0.6);
    banner('then the legislature stepped in', 960, 180, 70, c('V1'), { out: c('V2') });
    card(960, 560, 1400, 360, c('V2'), () => {
      D('S.B. 359', 0, -90, 90, { color: BLUE, raw: true });
      rows([['2025: passes the Senate 49–0', ['V2', 'unanimously']], ['2026: the House swaps in a substitute', ['V2', 'substitute']]], -460, 10, 48, 80);
    }, { out: c('V3') });
    card(960, 560, 1700, 560, c('V3'), () => {
      D('the new board: five seats', 0, -220, 52, { color: K.grey });
      const lab = ['clerk of court', 'probate judge', 'sheriff', 'tax commissioner', 'solicitor-general'];
      const t0 = w('V3', 'clerk');
      seats(lab.map((l, i) => [l, ORANGE, t0 + i * 0.45]), -640, -40, 150, 320, 1, { labSize: 26 });
      D('grand jury seats: 0', 0, 190, 64, { color: ORANGE, alpha: fadeIn(w('V3', 'elected official'), 0.2) });
    }, { out: c('V4') });
    stampX('"grand jury": 0 mentions', 960, 280, 92, ['V4', 'grand jury'], { out: c('V5') });
    banner('not repealed by name. overwritten.', 960, 880, 60, ['V4', 'overwritten'], { bg: BLUE, out: c('V5') });
    quoteCard(960, 520, 1500, 360, ['V5', 'shall not'], ['"the board of ethics shall not accept or hear', 'complaints of violations of this code of ethics', 'against county employees"'], 'S.B. 359, lines 331–335', { size: 42, out: c('V6') });
    banner('the transportation director: a county employee', 960, 900, 52, ['V5', 'transportation director'], { bg: ORANGE, shadowCol: K.black, out: c('V6') });
    card(960, 540, 1100, 340, c('V6'), () => {
      D('House 161–3', 0, -60, 90, { alpha: fadeIn(w('V6', 'House'), 0.2) });
      D('Senate 44–6', 0, 70, 90, { alpha: fadeIn(w('V6', 'Senate'), 0.2) });
    });
    cite('S.B. 359 (2025–26), enrolled text · legiscan.com/GA/bill/SB359/2025', c('V2'), ce('V6'));
  }
  function sFire() {
    plates([['nameplate', c('V7') - 0.6, { z: [1.0, 1.1] }], ['pen', c('V8') - 0.3, { z: [1.1, 1.0] }]], ce('V8') + 0.6);
    banner('one more detail', 960, 170, 70, c('V7'), { out: c('V8') });
    card(960, 580, 1700, 520, ['V7', 'majority vote'], () => {
      Dm('new law: firing the county manager takes a majority vote', 0, -200, 40, { color: K.grey });
      box(-720, -10, 1440, 8, K.black);
      const ev = [[-560, 'Apr 3', 'bill passes', ['V7', 'majority vote', 0.5]], [0, 'Apr 22', 'chair fires the manager alone', ['V7', 'on her own']], [560, 'May 12', 'signed', ['V8', 'signed']]];
      ev.forEach(([x, d, lab, q], i) => { const a = fadeIn(at(q), 0.2); if (a <= 0) { KC += 3; return; }
        box(x - 16, -22, 32, 32, i === 1 ? ORANGE : BLUE, a); D(d, x, -80, 50, { alpha: a }); Dm(lab, x, 70, 34, { alpha: a, color: i === 1 ? ORANGE : K.black }); });
      Dm('"that decision would require a majority vote" (to the AJC)', 0, 180, 34, { alpha: fadeIn(w('V7', 'She told'), 0.2) });
    });
    banner('grand-jury board replaced: Jan 1, 2027', 960, 920, 56, ['V8', 'replaced'], { bg: BLUE });
    cite('Atlanta Journal-Constitution, Apr 2026 · Act 623, signed May 12, 2026', ['V7', 'She told']);
  }
  function sWorth() {
    plate('dais', c('V9') - 0.6, ce('V10') + 0.6, { z: [1.1, 1.0] });
    banner('a defeat?', 960, 190, 90, ['V9', 'defeat'], { out: w('V9', 'Five board') });
    banner('chosen by randomly selected citizens', 960, 190, 60, ['V9', 'randomly selected'], { out: c('V10') });
    banner('they held their ground', 960, 300, 70, ['V9', 'held their ground'], { bg: BLUE, out: c('V10') });
    banner('it took an act of the legislature to stop them', 960, 880, 54, ['V9', 'only way'], { bg: GOLD, fg: K.black, shadowCol: K.black, out: c('V10') });
    stampX('this one was worth a law', 960, 540, 110, ['V10', 'worth a law']);
  }

  // 13. the proposal
  function sProposal() {
    plate('proposal', c('Z1') - 0.6, ce('Z6') + 0.6, { z: [1.0, 1.12] });
    banner('take what Georgia already does. go further.', 960, 170, 60, c('Z1'), { out: c('Z2') });
    card(1250, 580, 1100, 640, c('Z2'), () => {
      D('the proposal', 0, -260, 50, { color: BLUE });
      rows([['1. draw a jury · pay them', ['Z2', 'Draw a jury']], ['2. a week or two', ['Z2', 'week or two']], ['3. equal time for every candidate', ['Z2', 'equal time']], ['4. candidates question each other', ['Z2', 'question their rivals']], ['5. jurors ask their own questions', ['Z2', 'answers the jury']], ['6. score every candidate, secret ballot', ['Z2', 'score every']], ['7. the winner takes office', ['Z2', 'winner takes']]], -470, -170, 40, 66);
    }, { out: c('Z3') });
    card(960, 540, 1500, 420, c('Z3'), () => {
      const L = [['fundraising for name recognition', ['Z3', 'No fundraising']], ['turnout skew', ['Z3', 'No turnout']], ['rational ignorance', ['Z3', 'No rational']]];
      L.forEach(([s, q], i) => { const a = fadeIn(at(q), 0.2); if (a <= 0) { KC += 2; return; } D(s, 0, -110 + i * 110, 60, { alpha: a }); strikeBar(-560, -110 + i * 110, 560, at(q) + 0.5); });
    }, { out: c('Z4') });
    banner('flood a feed with deepfakes? easy.', 960, 300, 62, c('Z4'), { out: c('Z5') });
    banner('flood a sequestered room of 50? hard.', 960, 420, 62, ['Z4', 'sequestered'], { bg: BLUE, out: c('Z5') });
    card(960, 560, 1400, 380, c('Z5'), () => {
      D('voters aren\'t stupid', 0, -110, 70, { color: K.grey });
      Dm("they're asked to do an expert's job, in their spare time,", 0, -20, 40, { alpha: fadeIn(w('Z5', "expert's job"), 0.2) });
      Dm('for no reward, in an information war', 0, 40, 40, { alpha: fadeIn(w('Z5', 'no reward'), 0.2) });
      D('a jury asks a fair sample to do it properly', 0, 130, 54, { color: BLUE, alpha: fadeIn(c('Z6'), 0.2) });
    });
  }

  // 14. close
  function sEnd() {
    const t0 = c('C1') - 0.6;
    plate('chairs', t0, ce('C4') + 6, { z: [1.16, 1.0] });
    const a0 = fadeIn(t0, 0.4) * fadeOut(c('C3') - 0.2, 0.4);
    if (a0 > 0) {
      box(0, 290, W, 460, 'rgba(20,20,20,0.88)', a0);
      D('12 random citizens: prison for life', 960, 390, 66, { color: K.cream, alpha: a0 * fadeIn(c('C1'), 0.3) });
      D('up to 23: whether an official is indicted', 960, 490, 60, { color: K.cream, alpha: a0 * fadeIn(w('C1', 'grand jury'), 0.3) });
      D('in Henry County: five of them held out', 960, 620, 64, { color: GOLD, alpha: a0 * fadeIn(c('C2'), 0.3) });
    } else KC += 3;
    const a1 = fadeIn(c('C3') - 0.2, 0.4);
    if (a1 > 0) {
      box(0, 300, W, 440, 'rgba(20,20,20,0.9)', a1);
      D('ordinary people can be trusted', 960, 410, 80, { color: K.cream, alpha: a1 });
      D('to choose their leaders.', 960, 510, 80, { color: K.cream, alpha: a1 });
      Dm('they just need the time, the information, and a reason to pay attention.', 960, 620, 40, { color: GOLD, alpha: fadeIn(c('C4'), 0.3) });
      M('electionbyjury.org', 960, 700, 34, { color: K.cream, alpha: fadeIn(ce('C4', 0.5), 0.4) });
    } else KC += 4;
  }

  // ---------- assembly ----------
  function buildScenes() {
    const S = (id, draw, paper = false, lead = 0.6) => ({ start: Math.max(0, c(id) - lead), draw, paper });
    SCN = [
      { start: 0, draw: sOpen }, S('O5', sCounter),
      { start: ce('O6') - 0.1, draw: sTitle },
      S('A1', sJobs), S('R1', sOdds), S('R3', sIgnorance), S('R6', sMoney), S('R7', sFeed), S('T1', sTurnout),
      S('J1', sMachine), S('J5', sBoth, true), S('W1', sDebate), S('W5', sOmni), S('K1', sSurgeon), S('K5', sLiteracy),
      S('N1', sSample), S('N5', sScore), S('N6', sBribe), S('N9', sCube, true),
      S('H1', sAthens), S('H4', sVenice), S('H6', sWells),
      S('G1', sGeorgia), S('G3c', sSchools), S('G3d', sTurner), S('G4', sRoutine),
      S('X1', sBoard), S('X3', sWalk2), S('X5', sStarve), S('X7', sFair),
      S('V1', sBill), S('V7', sFire), S('V9', sWorth),
      S('Z1', sProposal), S('C1', sEnd),
    ];
    const E = [];
    SCN.slice(1).forEach((s) => E.push({ name: 'cut', t: s.start + 0.05 }));
    E.push({ name: 'title', t: ce('O6') + 0.3 });
    EVENTS = E.sort((a, b) => a.t - b.t);
  }
