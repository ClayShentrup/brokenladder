// "common knowledge": timeline, shot list, and frame compositor.
'use strict';
let SCRIPT, TL, SHOTS = [], EVENTS = [], PAPERTEX, GRAINS = [];
const FPS_DRAW = 7.5; // drawings update "on fours"; the camera moves every frame
// ---------- timeline (same rules as the narration manifest) ----------
function buildTimeline(script, man) {
  const lines = {}; let t = 3.8;
  script.lines.forEach((l) => { const m = man.lines[l.id]; lines[l.id] = Object.assign({}, l, { start: t, dur: m.duration, end: t + m.duration, chars: m.chars }); t += m.duration + (l.gap != null ? l.gap : 0.42); });
  return { lines, order: script.lines.map((l) => l.id), total: t + 4.2 };
}
const c = (id, f = 0) => { const L = TL.lines[id]; if (!L.chars || f <= 0) return L.start + f * L.dur; if (f >= 1) return L.end; return L.start + L.chars[Math.min(L.chars.length - 1, Math.floor(f * L.chars.length))]; };
const w = (id, word, extra = 0) => { const L = TL.lines[id], s = L.say || L.text, i = s.toLowerCase().indexOf(word.toLowerCase()); if (i < 0) { console.warn('cue not found', id, word); return L.start + extra; } return (L.chars ? L.start + L.chars[Math.min(i, L.chars.length - 1)] : L.start + (i / s.length) * L.dur) + extra; };
const ce = (id, extra = 0) => TL.lines[id].end + extra;

// ---------- expressions ----------
const J = {
  open: ex({ open: 0.95 }), mask: ex({ open: 0.72, smile: 0.28, asym: 0.45, tired: 1 }), flash: ex({ open: 1.15, brow: 0.35 }),
  fixed: ex({ open: 0.8, gy: 0.8, tired: 0.6 }), cold: ex({ open: 0.68, brow: -0.25, furrow: 0.45, clench: 0.6 }), think: ex({ open: 0.78, furrow: 0.6, gx: -0.5, gy: 0.3 }),
  alarm: ex({ open: 1.05, furrow: 0.35, clench: 0.45, brow: 0.15 }), dry: ex({ open: 0.85, furrow: 0.5, mouth: 0.06, clench: 0.3 }), annoyed: ex({ open: 0.9, brow: 0.45, smile: 0.15, asym: -0.5, mouth: 0.08 }),
  flat: ex({ open: 0.74, smile: 0.12, asym: -0.3, brow: -0.1 }), watch: ex({ open: 0.85, gx: 0.6, furrow: 0.2 }), talk: ex({ open: 0.8, smile: 0.2, asym: 0.4, mouth: 0.12, tired: 1 }),
};
const HK = {
  casual: ex({ smile: 0.35, crinkle: 0.4, gx: -0.3 }), warm: ex({ smile: 0.85, crinkle: 1, mouth: 0.12 }), pleasant: ex({ smile: 0.5, crinkle: 0.6 }),
  watch: ex({ smile: 0.3, open: 1, gx: -0.5 }), laugh: ex({ smile: 0.95, mouth: 0.5, crinkle: 0, open: 1.08, brow: 0.2 }), blank: ex({ smile: 0.05, open: 0.9 }),
  widen: ex({ open: 1.4, brow: 0.85, mouth: 0.35, smile: -0.1 }), disappointed: ex({ smile: -0.18, open: 0.72, brow: 0.12, furrow: 0.2 }), cold: ex({ smile: -0.05, open: 0.66, brow: -0.3, furrow: 0.45, clench: 0.55 }),
};

// ---------- shot helpers ----------
// cam: { z: [from, to], x: [from, to], y: [from, to] } in scene coords, eased over the shot
function shot(start, fn, cam = {}, o = {}) { SHOTS.push({ start, fn, cam, o }); }
function bokehBG(t, col1, col2, seed = 3) {
  nightWash('#07060c', '#120c16', [[480, 300, 800, rgba(col1, 0.35), 1], [1500, 700, 800, rgba(col2, 0.3), 1]]);
  const r = rng(seed); for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H * 0.8, rr = 30 + r() * 70, col = r() < 0.5 ? col1 : col2; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.12 + r() * 0.15; ctx.fillStyle = tooth(col, 1); ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}
// a face close-up: who, expression keyframes [[t, ex]], lighting
function mood(t, who) {
  if (t < c('S10')) return { key: K.amber, rim: who === 'julian' ? K.teal : K.magenta, bg1: K.amber };
  if (t < c('S33')) return { key: who === 'julian' ? K.amber : '#ff7a5a', rim: K.crimson, bg1: K.crimson, bg2: K.amber };
  if (t < c('S50')) return { key: '#9ab4ff', rim: K.violet, bg1: K.blue, bg2: K.violet };
  return { key: '#ff6a5a', rim: K.crimson, bg1: K.crimson, bg2: K.indigo };
}
function faceShot(who, keys, L0 = {}) {
  return (lt, u, t) => {
    const L = Object.assign({}, mood(t, who), L0);
    bokehBG(t, L.bg1 || K.amber, L.bg2 || (who === 'julian' ? K.teal : K.magenta), who === 'julian' ? 3 : 8);
    face(960, 560, 1.0, who, exAt(keys, t), Object.assign({ side: who === 'julian' ? 1 : -1, key: L.key, rim: L.rim }, typeof L.light === 'function' ? L.light(t) : (L.light || {})));
    if (L.umbrella) { pline([[1500, 1300], [1260, -200]], K.ink, 26, 1, 2, 2); const g = prog(t, L.umbrella[0], L.umbrella[1]); pencilShape([[1340, 470], [1380, 430], [1410, 460], [1372, 500]], '#3a3a40', [{ col: K.cream, n: 80, len: 10 }], { lw: 2 }); glow(1375, 465, 90, 'rgba(255,240,210,0.9)', g); }
    if (L.tint) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = L.tint(t); ctx.fillRect(-W, -H, W * 3, H * 3); ctx.restore(); }
    if (L.over) L.over(t);
  };
}
const CF = { z: [1.0, 1.12] }, CLOSE = { z: [1.2, 1.45], y: [-40, -60] }, EYES = { z: [2.3, 2.6], y: [-150, -150] }, MOUTHZ = { z: [2.0, 2.2], y: [80, 80] };

function buildShots() {
  // title
  shot(0, (lt, u, t) => title(t, prog(t, 0.4, 1.6), prog(t, 1.4, 2.4)), { z: [1, 1.04] });
  // S01 the river, the arcade, the watch
  shot(c('S01') - 0.3, (lt, u, t) => limmat(t), { z: [1.0, 1.1], x: [-60, 40] }, { rain: 1 });
  shot(w('S01', 'Julian adjusted'), (lt, u, t) => { arcade(t); figure(760, 900, 1.15, { umb: 'closed', face: 1 }); }, { z: [1.0, 1.12], x: [-100, -40] }, { rain: 0.7 });
  shot(w('S01', 'ten minutes'), (lt, u, t) => wristwatch(t), { z: [1.1, 1.3] });
  // S02 henrik at the dry fountain
  shot(c('S02'), (lt, u, t) => { square(t); figure(1080, 900, 1.0, { who: 'henrik', cup: true, face: -1, rim: K.magenta }); }, { z: [1.0, 1.35], x: [0, 120], y: [0, 60] }, { rain: 0.8 });
  // S03 julian's face: a cold flash, then the tired mask
  shot(c('S03'), faceShot('julian', [[0, J.open], [w('S03', 'cold flash'), J.flash], [w('S03', 'never reached'), J.open], [w('S03', 'raised a hand'), J.mask]]), CF);
  // S04 the two of them in the square
  shot(c('S04'), (lt, u, t) => { square(t); figure(lerp(560, 760, sm(u)), 920, 1.0, { umb: 'closed', face: 1 }); figure(1120, 900, 1.0, { who: 'henrik', cup: true, face: -1, rim: K.magenta }); }, { z: [1.05, 1.15] }, { rain: 0.8 });
  // S05 henrik's warm smile, the handshake
  shot(c('S05'), faceShot('henrik', [[0, HK.blank], [w('S05', 'smiled'), HK.warm]]), CLOSE);
  shot(w('S05', 'extended'), (lt, u, t) => { square(t); figure(860, 900, 1.15, { umb: 'closed', face: 1 }); figure(1060, 900, 1.15, { who: 'henrik', cup: true, face: -1, rim: K.magenta }); glow(960, 640, 160, rgba(K.amber, 0.6), 1); }, { z: [1.25, 1.4], y: [-40, -60] }, { rain: 0.6 });
  // S06 pleasant baritone
  shot(c('S06'), faceShot('henrik', [[0, HK.pleasant], [w('S06', 'wine bar'), HK.casual]]), { z: [1.1, 1.25] });
  // S07 into the alley
  shot(c('S07'), (lt, u, t) => { alley(t); figure(860, 980, 0.8, { umb: 'closed', face: 1 }); figure(1060, 980, 0.8, { who: 'henrik', cup: true, face: -1, rim: K.magenta }); }, { z: [1.0, 1.25], y: [60, 0] }, { rain: 0.6 });
  // S08 the slip
  shot(c('S08'), faceShot('henrik', [[0, HK.casual], [w('S08', 'Munich'), HK.casual]], { over: (t) => glow(960, 540, 1100, rgba(K.crimson, 0.4), Math.exp(-Math.max(0, t - w('S08', 'Munich')) / 1.2) * (t > w('S08', 'Munich') ? 1 : 0)) }), { z: [1.15, 1.35] });
  // S09 julian's eyes stay on the cobbles
  shot(c('S09'), faceShot('julian', [[0, J.fixed]]), EYES);
  // S10 munich. S11 the station, the file
  shot(c('S10') - 0.15, (lt, u, t) => station(t), { z: [1.15, 1.05] }, { hard: true });
  shot(w('S11', 'forensic file'), (lt, u, t) => folder(960, 560, 1.0, 'kessler, a.', ['station chief, munich', 'found: central station, audi trunk', 'press: coronary at home', 0.6, t > w('S11', 'Bayernhof') ? 'cleanup staged: bayernhof hotel' : 0.4], 'RESTRICTED', prog(t, w('S11', 'restricted'), w('S11', 'restricted', 0.25))), { z: [1.0, 1.15], y: [0, 40] });
  // S12 henrik's clearance
  shot(c('S12'), (lt, u, t) => folder(960, 560, 1.0, 'henrik', ['logistics coordinator, vienna', 'mid-level', 0.5, 0.7], 'NOT CLEARED', prog(t, w('S12', "wasn't cleared"), w('S12', "wasn't cleared", 0.25)), 0.03), { z: [1.0, 1.1] });
  // S13 the mole
  shot(c('S13') - 0.1, faceShot('henrik', [[0, HK.pleasant]], { tint: () => rgba('#ff6a6a', 1), light: { rim: K.crimson, key: K.crimson } }), { z: [1.5, 1.8], y: [-60, -80] }, { hard: true });
  // S14 julian's mind locks on
  shot(c('S14'), faceShot('julian', [[0, J.fixed], [w('S14', 'mind locked'), J.cold], [w('S14', 'only question'), J.think]]), CLOSE);
  // S15 the board to himself
  shot(c('S15'), (lt, u, t) => chess(t), { z: [1.0, 1.15], y: [40, 0] });
  // S16 a funnel
  shot(c('S16'), (lt, u, t) => alley(t), { z: [1.0, 1.6], y: [0, -60] }, { rain: 0.5 });
  // S17 checking for tells: eyes, then mouth
  shot(c('S17'), faceShot('julian', [[0, J.fixed]]), EYES);
  shot(w('S17', 'voice tightened'), faceShot('julian', [[0, J.fixed]]), MOUTHZ);
  // S18 the bureaucrat's excuse, the hardware token
  shot(c('S18'), faceShot('julian', [[0, J.talk], [w('S18', 'listen'), J.annoyed]]), { z: [1.1, 1.25] });
  shot(w('S18', 'hardware token'), (lt, u, t) => hwToken(t), { z: [1.0, 1.15] });
  // S19 clean. boring.
  shot(c('S19'), faceShot('julian', [[0, J.mask]]), { z: [1.25, 1.35] });
  // S20 the base of the steps
  shot(c('S20'), (lt, u, t) => { alley(t); figure(820, 1000, 0.95, { umb: 'closed', face: 1 }); figure(1100, 1000, 0.95, { who: 'henrik', cup: true, face: -1, rim: K.magenta }); }, { z: [1.15, 1.3], y: [80, 60] }, { rain: 0.5 });
  // S21 talstrasse (the lie)
  shot(c('S21'), faceShot('julian', [[0, J.talk], [w('S21', 'turning'), Object.assign({}, J.mask, { gx: -0.7 })]]), { z: [1.15, 1.3] });
  // S22 henrik's hand into his pocket
  shot(c('S22'), faceShot('henrik', [[0, HK.pleasant]]), { z: [1.1, 1.2] });
  shot(w('S22', 'reaching'), (lt, u, t) => pocketHand(t), { z: [1.0, 1.1] });
  shot(w('S22', 'let me walk'), faceShot('henrik', [[0, HK.pleasant]]), { z: [1.2, 1.3] });
  // S23 a cold needle
  shot(c('S23') - 0.1, faceShot('julian', [[0, J.cold]], { over: (t) => { glow(960, 900, 500, rgba(K.crimson, 0.5), 1); pline([[960, 1200], [960, 700 + 200 * (1 - prog(t, c('S23'), c('S23') + 1))]], K.crimson, 4, 0.9); } }), { z: [1.5, 1.7], y: [-40, -40] }, { hard: true });
  // S24 the map: no annex on talstrasse
  shot(c('S24'), (lt, u, t) => zurichMap(t, prog(t, w('S24', 'annex on'), w('S24', 'annex on', 0.6)), prog(t, w('S24', 'Doo-foor'), w('S24', 'two miles', 0.8)), prog(t, w('S24', 'Tahl'), w('S24', 'Tahl', 0.6))), { z: [1.0, 1.08] });
  // S25 traces the logic
  shot(c('S25'), faceShot('julian', [[0, J.cold], [w('S25', 'stared'), J.think]]), CLOSE);
  // S26-S27 arm's reach
  shot(c('S26'), (lt, u, t) => { alley(t); figure(820, 1000, 0.95, { umb: 'closed', face: 1 }); figure(1100, 1000, 0.95, { who: 'henrik', cup: true, face: -1, rim: K.magenta }); const p = prog(t, w('S26', "arm's reach"), w('S26', "arm's reach", 1)); if (p > 0) { const pts = []; for (let i = 0; i <= Math.round(48 * p); i++) { const a = i / 48 * Math.PI * 2; pts.push([1100 + Math.cos(a) * 330, 860 + Math.sin(a) * 120]); } pline(pts, K.crimson, 4, 0.9); } }, { z: [1.15, 1.3], y: [80, 80] }, { rain: 0.5 });
  shot(c('S27'), faceShot('henrik', [[0, HK.watch]], { light: { rim: K.crimson } }), CLOSE);
  // S28 henrik knew who julian was
  shot(c('S28'), (lt, u, t) => folder(960, 560, 1.0, 'julian', ['cover: desk officer, antwerp', 'actual: langley investigation cell', 'lead investigator, kessler', 0.6], 'KNOWN', prog(t, w('S28', 'lead investigator'), w('S28', 'lead investigator', 0.3)), -0.03), { z: [1.0, 1.12] });
  // S29 take away the river
  shot(c('S29'), faceShot('julian', [[0, J.cold]]), { z: [1.15, 1.3] });
  shot(w('S29', 'in the river'), (lt, u, t) => limmat(t), { z: [1.2, 1.5], y: [100, 140] }, { rain: 0.8 });
  // S30 theatrical annoyance
  shot(c('S30'), faceShot('julian', [[0, J.annoyed], [w('S30', 'idiot'), J.talk]]), { z: [1.1, 1.25] });
  // S31 he watched henrik's eyes
  shot(c('S31'), faceShot('henrik', [[0, HK.pleasant]]), EYES);
  // S32 too-bright laugh
  shot(c('S32'), faceShot('henrik', [[0, HK.laugh], [w('S32', 'well, thank'), HK.pleasant]]), { z: [1.15, 1.3] });
  // S33 there it is.
  shot(c('S33') - 0.1, faceShot('julian', [[0, J.cold]]), { z: [1.8, 1.9], y: [-100, -100] }, { hard: true });
  // S34 the leash
  shot(c('S34'), (lt, u, t) => { alley(t); figure(820, 1000, 0.95, { umb: 'closed', face: 1 }); figure(1100, 1000, 0.95, { who: 'henrik', cup: true, face: -1, rim: K.magenta }); const a = prog(t, w('S34', 'leash'), w('S34', 'leash', 0.8)); if (a > 0) pline(qpts([1060, 820], [940, 900 + 40 * Math.sin(t * 3)], [840, 800]), K.crimson, 4, a * (t > w('S34', 'cut that') ? fadeOutT(t, w('S34', 'cut that'), 0.4) : 1)); const b = prog(t, w('S34', 'snapped'), w('S34', 'snapped', 0.8)); if (b > 0) pline(qpts([1060, 820], [1000, 700], [960, 560]).slice(0, Math.max(2, Math.round(13 * b))), K.crimson, 4, 0.9); }, { z: [1.1, 1.25], y: [60, 0] }, { rain: 0.5 });
  // S35 the throat goes dry; S36 the only question
  shot(c('S35'), faceShot('julian', [[0, J.dry], [w('S35', 'actively hunting'), J.cold]]), CLOSE);
  shot(c('S36'), (lt, u, t) => mirrors(t, 2, 'julian', { julian: J.think, henrik: HK.watch }), { z: [1.0, 1.08] });
  // S37 rain drums on the umbrella
  shot(c('S37'), (lt, u, t) => umbrellaUnder(t), { z: [1.0, 1.1] }, { rain: 1 });
  // S38 henrik's view of julian
  shot(c('S38'), (lt, u, t) => mirrors(t, 2, 'henrik', { julian: J.mask, henrik: HK.pleasant }), { z: [1.0, 1.08] });
  // S39 suppose henrik thinks i bought it: the trees at the top
  shot(c('S39'), (lt, u, t) => mirrors(t, 3, 'julian', { julian: J.think, henrik: HK.pleasant }), { z: [1.0, 1.15], x: [0, 120], y: [0, -60] });
  shot(w('S39', 'dark trees'), (lt, u, t) => trees(t), { z: [1.0, 1.2], y: [0, -40] }, { rain: 0.6 });
  // S40 a colder possibility
  shot(c('S40'), faceShot('julian', [[0, J.think], [w('S40', 'colder'), J.alarm]], { light: (t) => ({ dark: 0.6 + 0.4 * prog(t, w('S40', 'colder'), w('S40', 'colder', 2)), rim: K.blue }) }), { z: [1.15, 1.4] });
  // S41 the personnel addendum
  shot(c('S41'), (lt, u, t) => folder(960, 560, 1.0, 'personnel addendum', ['julian', 'zurich annex, dufourstrasse', 'temporary station, four months', 0.5], 'RESTRICTED', prog(t, w('S41', 'restricted'), w('S41', 'restricted', 0.25)), 0.02), { z: [1.0, 1.12] });
  // S42 he knew i would spot it
  shot(c('S42'), (lt, u, t) => mirrors(t, 3, 'henrik', { julian: J.alarm, henrik: HK.watch }), { z: [1.0, 1.2], x: [0, 140], y: [0, -80] });
  // S43 why tell a blatant lie
  shot(c('S43'), faceShot('julian', [[0, J.think]]), EYES);
  // S44 the steps rising into the dark
  shot(c('S44'), (lt, u, t) => stepsPOV(t), { z: [1.0, 1.15] });
  // S45 the clever play
  shot(c('S45'), (lt, u, t) => mirrors(t, 4, 'julian', { julian: J.think, henrik: HK.pleasant }), { z: [1.0, 1.3], x: [0, 220], y: [0, -140] });
  // S46 the trap
  shot(c('S46'), (lt, u, t) => mirrors(t, 5, 'henrik', { julian: J.alarm, henrik: HK.cold }), { z: [1.0, 1.45], x: [0, 280], y: [0, -180] });
  shot(w('S46', 'second I turn'), (lt, u, t) => stepsPOV(t, 0, prog(t, w('S46', 'first step'), w('S46', 'first step', 0.6))), { z: [1.0, 1.2], y: [0, 120] });
  // S47 henrik's coat
  shot(c('S47'), (lt, u, t) => pocketHand(t), { z: [1.0, 1.1] });
  shot(w('S47', 'left hand'), (lt, u, t) => { nightWash('#0b0a10', '#140e14', [[960, 400, 700, rgba(K.amber, 0.3), 1]]); cup(960, 560, 2.2, -0.08); }, { z: [1.0, 1.12] });
  // S48 two worlds
  shot(c('S48'), (lt, u, t) => forkPaths(t, prog(t, w('S48', 'sloppy'), w('S48', 'sloppy', 1)), prog(t, w('S48', 'baiting'), w('S48', 'baiting', 1)), 0), { z: [1.0, 1.08] });
  shot(w('S48', 'second riser'), (lt, u, t) => stepsPOV(t, 1, prog(t, w('S48', 'second riser'), w('S48', 'second riser', 0.4))), { z: [1.1, 1.25], y: [0, 80] });
  // S49 a losing move either way
  shot(c('S49') - 0.1, faceShot('julian', [[0, J.cold]]), { z: [1.3, 1.4] }, { hard: true });
  // S50 the flat, quiet smile
  shot(c('S50'), faceShot('julian', [[0, J.cold], [w('S50', 'smiled'), J.flat]]), { z: [1.15, 1.45], y: [0, 40] });
  // S51 the annex line; thumb to the release catch
  shot(c('S51'), faceShot('julian', [[0, J.flat]]), { z: [1.2, 1.3] });
  shot(w('S51', 'thumb'), faceShot('julian', [[0, J.flat]], { umbrella: [w('S51', 'release catch'), w('S51', 'release catch', 0.4)] }), { z: [1.0, 1.1], x: [80, 120] });
  shot(w('S51', 'espresso machine'), faceShot('julian', [[0, J.flat]]), { z: [1.3, 1.4] });
  // S52 neither moved: split screen
  shot(c('S52') - 0.1, (lt, u, t) => { split(t, J.flat, HK.pleasant); }, { z: [1, 1.03] }, { hard: true });
  // S53 which man
  shot(c('S53'), faceShot('henrik', [[0, HK.pleasant]]), CLOSE);
  // S54 the imagined version: eyes widen in shock
  shot(c('S54'), faceShot('henrik', [[0, HK.pleasant], [w('S54', 'widen'), HK.widen]], { tint: () => rgba('#9aa6ff', 1), light: { rim: K.blue, key: K.cream } }), { z: [1.2, 1.4] });
  // S55 henrik's eyes didn't widen
  shot(c('S55') - 0.1, faceShot('henrik', [[0, HK.pleasant]]), EYES, { hard: true });
  // S56 the smile switches off; the poisoned pawn
  shot(c('S56'), faceShot('henrik', [[0, HK.pleasant], [w('S56', 'vanished'), HK.disappointed]], { light: (t) => ({ glint: 1 - prog(t, w('S56', 'switched off'), w('S56', 'switched off', 0.2)), dark: 0.6 + 0.4 * prog(t, w('S56', 'switched off'), w('S56', 'switched off', 0.3)) }) }), CLOSE);
  shot(w('S56', 'chess player'), (lt, u, t) => chess(t, prog(t, w('S56', 'poisoned pawn'), w('S56', 'poisoned pawn', 0.5))), { z: [1.0, 1.2] });
  // S57 flat voice; the safety catch
  shot(c('S57'), faceShot('henrik', [[0, HK.cold]], { light: { glint: 0, dark: 1, rim: K.crimson } }), { z: [1.2, 1.4] });
  shot(w('S57', 'right hand'), (lt, u, t) => pocketHand(t, prog(t, w('S57', 'pulled taut'), w('S57', 'pulled taut', 0.6))), { z: [1.0, 1.15] });
  shot(w('S57', 'honestly'), faceShot('henrik', [[0, HK.cold]], { light: { glint: 0, dark: 1, rim: K.crimson } }), { z: [1.3, 1.45] });
  // S58 i almost did
  shot(c('S58'), faceShot('julian', [[0, J.flat], [w('S58', 'keeping his eyes'), Object.assign({}, J.flat, { gx: 0.5, gy: 0.3 })]]), { z: [1.25, 1.45] });
  // S59 fair enough
  shot(c('S59'), faceShot('henrik', [[0, HK.cold]], { light: { glint: 0, dark: 1, rim: K.crimson } }), { z: [1.4, 1.6] });
  // S60 no more pretending
  shot(c('S60'), faceShot('julian', [[0, J.cold]]), { z: [1.6, 1.8] }, { hard: true });
  // S61 the cup slips; the strike
  shot(c('S61'), (lt, u, t) => { nightWash('#0b0a10', '#140e14', [[960, 400, 700, rgba(K.amber, 0.3), 1]]); cobbles(820, 1100, [[960, K.amber]]); const t0 = w('S61', 'slip'), g = Math.max(0, t - t0); cup(960 + g * 30, 300 + 0.5 * 1200 * g * g * 0.08, 1.4, g * 0.6); }, { z: [1.0, 1.05] });
  shot(w('S61', 'drove'), (lt, u, t) => { nightWash('#0a0910', '#140e16', [[960, 540, 900, rgba(K.crimson, 0.4), 1]]); const p = prog(t, w('S61', 'drove'), w('S61', 'throat')); pline([[-200, 900], [lerp(200, 1500, eIO(p)), lerp(800, 420, eIO(p))]], K.ink, 18, 1, 2, 2); pline([[lerp(200, 1500, eIO(p)) - 40, lerp(800, 420, eIO(p)) + 12], [lerp(200, 1500, eIO(p)) + 40, lerp(800, 420, eIO(p)) - 12]], K.cream, 6, 0.9); }, { z: [1.0, 1.2] }, { hard: true });
  shot(w('S61', 'before it'), (lt, u, t) => { ctx.fillStyle = '#000'; ctx.fillRect(-W, -H, W * 3, H * 3); }, {}, { hard: true });
  shot(ce('S61', 1.0), (lt, u, t) => title(t, prog(t, ce('S61', 1.0), ce('S61', 2.5)), prog(t, ce('S61', 2.2), ce('S61', 3.2))), { z: [1, 1.04] });
  SHOTS.forEach((s, i) => { s.end = i + 1 < SHOTS.length ? SHOTS[i + 1].start : TL.total + 1; });
  // sound effect cues
  const E = (name, t, gain = 1) => EVENTS.push({ name, t, gain });
  E('umbrella', w('S01', 'shaking'), 0.8); E('steps', w('S07', 'falling into step'), 0.7); E('steps', w('S04', 'closing'), 0.6);
  E('sting', c('S10') - 0.1, 0.8); E('sting', c('S13') - 0.1, 0.6); E('sting', c('S23') - 0.1, 0.5); E('sting', c('S33') - 0.1, 0.45);
  E('drum', c('S37'), 0.8); E('drum', w('S37', 'drum'), 0.8);
  E('click', w('S57', 'clicked'), 1.0); E('cup', w('S61', 'slip', 0.9), 0.9); E('strike', w('S61', 'drove'), 1.0); E('sting', w('S61', 'before it'), 0.9);
}
function fadeOutT(t, t0, d) { return 1 - prog(t, t0, t0 + d); }
function umbrellaCatch(t, p) {
  nightWash('#0a0910', '#130e16', [[960, 500, 700, rgba(K.amber, 0.3), 1]]);
  pline([[400, 1200], [1500, -100]], K.ink, 22, 1, 2, 2);
  pencilShape([[1000, 520], [1040, 470], [1080, 500], [1040, 550]], '#2a2a30', [{ col: K.cream, n: 120, len: 10 }], { lw: 2 });
  glow(1040, 510, 80, 'rgba(255,240,210,0.6)', 0.8);
  const ty = lerp(260, 470, sm(p));
  pencilShape(smooth([[1000, ty - 70], [1120, ty - 90], [1150, ty + 10], [1030, ty + 40]]), '#22120c', [{ col: K.skin2, n: 500, len: 18 }, { col: K.skin, n: 260, len: 14 }], { lw: 2.2 });
  pencilShape(smooth([[840, ty + 40], [1010, ty - 20], [1060, ty + 140], [900, ty + 220]]), '#140e0c', [{ col: K.khaki, n: 600, len: 30 }], { lw: 2.4 });
}
function split(t, ej, eh) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W / 2 - 6, H); ctx.clip(); ctx.translate(-480, 0); faceShot('julian', [[0, ej]])(0, 0, t); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(W / 2 + 6, 0, W / 2, H); ctx.clip(); ctx.translate(480, 0); faceShot('henrik', [[0, eh]])(0, 0, t); ctx.restore();
  ctx.fillStyle = '#000'; ctx.fillRect(W / 2 - 6, 0, 12, H);
}

// ---------- compositor: each shot's drawing is cached per "on fours" tick, the camera is applied per frame ----------
const M = 1.12, PW = Math.round(W * M), PH = Math.round(H * M);
const CACHE = new Map();
function camAt(sh, t) { const u = eIO(prog(t, sh.start, sh.end)); const g = (k, d) => (sh.cam[k] ? lerp(sh.cam[k][0], sh.cam[k][1], u) : d); return { z: g('z', 1), x: g('x', 0), y: g('y', 0) }; }
function panel(k, t) {
  const sh = SHOTS[k], tick = Math.floor(t * FPS_DRAW), key = k + ':' + tick;
  if (CACHE.has(key)) return CACHE.get(key);
  const tk = Math.max(sh.start, tick / FPS_DRAW), cam = camAt(sh, tk);
  const pc = document.createElement('canvas'); pc.width = Math.round(PW * SCALE); pc.height = Math.round(PH * SCALE);
  const saved = ctx; setCtx(pc.getContext('2d'));
  TICK = tick; SEQ = k * 100000;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, PW, PH);
  ctx.translate(PW / 2, PH / 2); ctx.scale(cam.z, cam.z); ctx.translate(-(W / 2 + cam.x), -(H / 2 + cam.y));
  try { sh.fn(tk - sh.start, clamp((tk - sh.start) / Math.max(0.01, sh.end - sh.start)), tk); } catch (e) { console.error('shot', k, e.message); }
  setCtx(saved);
  const out = { pc, cam };
  CACHE.set(key, out); if (CACHE.size > 6) CACHE.delete(CACHE.keys().next().value);
  return out;
}
function drawShot(k, t, alpha) {
  const sh = SHOTS[k], { pc, cam: ck } = panel(k, t), ct = camAt(sh, t);
  ctx.save(); ctx.globalAlpha = alpha; ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.translate(W / 2, H / 2); ctx.scale(ct.z / ck.z, ct.z / ck.z); ctx.translate((W / 2 + ck.x - (W / 2 + ct.x)) * ck.z, (H / 2 + ck.y - (H / 2 + ct.y)) * ck.z); ctx.translate(-PW / 2, -PH / 2);
  ctx.drawImage(pc, 0, 0, PW, PH); ctx.restore();
}
function rainOverlay(t, a) {
  if (a <= 0) return; const r = rng(Math.floor(t * 30) * 13 + 7);
  ctx.save(); ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.strokeStyle = 'rgba(200,220,255,0.35)'; ctx.lineWidth = 1.3; ctx.globalAlpha = a;
  ctx.beginPath(); for (let i = 0; i < 220; i++) { const x = r() * (W + 200) - 100, y = r() * H, l = 30 + r() * 40; ctx.moveTo(x, y); ctx.lineTo(x - l * 0.18, y + l); } ctx.stroke(); ctx.restore();
}
function makePaperTex() {
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const g = c2.getContext('2d'), r = rng(42);
  g.fillStyle = 'rgba(128,128,128,1)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60000; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${r() * 0.18})` : `rgba(255,255,255,${r() * 0.14})`; g.fillRect(r() * W, r() * H, 1 + r() * 2.5, 1 + r() * 2.5); }
  return c2;
}
function render(t) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let k = 0; for (let i = 0; i < SHOTS.length; i++) if (SHOTS[i].start <= t) k = i;
  const sh = SHOTS[k], dt = t - sh.start, XF = 0.6;
  drawShot(k, t, 1);
  if (k > 0 && dt < XF && !sh.o.hard) drawShot(k - 1, t, 1 - sm(dt / XF));
  const rainA = (sh.o.rain || 0) * (k > 0 && dt < XF && !sh.o.hard ? sm(dt / XF) : 1) + (k > 0 && dt < XF && !sh.o.hard ? (SHOTS[k - 1].o.rain || 0) * (1 - sm(dt / XF)) : 0);
  rainOverlay(t, rainA);
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.5; ctx.drawImage(PAPERTEX, 0, 0, W, H); ctx.restore();
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // letterbox
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 104); ctx.fillRect(0, H - 104, W, 104);
  const fi = 1 - prog(t, 0, 1.0), fo = prog(t, TL.total - 1.5, TL.total); if (fi > 0 || fo > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.max(fi, fo)})`; ctx.fillRect(0, 0, W, H); }
}
async function init() {
  cv = document.getElementById('c'); setCtx(cv.getContext('2d'));
  await new FontFace('Caveat', 'url(fonts/caveat-latin-700-normal.woff2)', { weight: '700' }).load().then((f) => document.fonts.add(f));
  SCRIPT = await (await fetch('script.json', { cache: 'no-store' })).json();
  const man = await (await fetch('../narration/manifest.json', { cache: 'no-store' })).json();
  TL = buildTimeline(SCRIPT, man); buildShots(); PAPERTEX = makePaperTex();
  return { duration: TL.total };
}
window.EP = {
  ready: null, render,
  setScale(s) { SCALE = s; cv.width = Math.round(W * s); cv.height = Math.round(H * s); CACHE.clear(); },
  frame(t, q = 0.92) { render(t); return cv.toDataURL('image/jpeg', q); },
  timeline: () => TL, events: () => EVENTS, shots: () => SHOTS.map((s) => [s.fn.name || '', +s.start.toFixed(2)]),
};
window.EP.ready = init();
