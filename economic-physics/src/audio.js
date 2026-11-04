// Procedural score + sound effects + narration mix, all Web Audio.
// Works with a live AudioContext (preview) or an OfflineAudioContext (export).
'use strict';
window.EPAudio = (function () {
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function noise(ac) {
    if (ac._noise) return ac._noise;
    const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0), r = rng(7);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
    return (ac._noise = b);
  }

  // Karplus-Strong plucked string (ukulele-ish), cached per pitch.
  function pluck(ac, midi) {
    ac._pl = ac._pl || {};
    if (ac._pl[midi]) return ac._pl[midi];
    const sr = ac.sampleRate, N = Math.max(2, Math.round(sr / mtof(midi))), len = Math.floor(sr * 1.8);
    const b = ac.createBuffer(1, len, sr), d = b.getChannelData(0), r = rng(midi * 31 + 3);
    const ring = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) { lp = lp * 0.5 + (r() * 2 - 1) * 0.5; ring[i] = lp; }
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const a = ring[idx], nx = ring[(idx + 1) % N];
      ring[idx] = 0.4992 * (a + nx);
      d[i] = a;
      idx = (idx + 1) % N;
    }
    const fade = Math.floor(sr * 0.3);
    for (let i = 0; i < fade; i++) d[len - fade + i] *= 1 - i / fade;
    return (ac._pl[midi] = b);
  }

  function env(ac, g, t, peak, a, dcy) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
  }

  function panNode(ac, pan, dest) {
    if (!pan || !ac.createStereoPanner) return dest;
    const p = ac.createStereoPanner(); p.pan.value = pan; p.connect(dest); return p;
  }

  const I = {
    pluck(ac, dest, t, midi, gain, pan) {
      const s = ac.createBufferSource(); s.buffer = pluck(ac, midi);
      const g = ac.createGain(); g.gain.value = gain;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3800;
      s.connect(f).connect(g).connect(panNode(ac, pan, dest)); s.start(t);
    },
    glock(ac, dest, t, midi, gain, pan) {
      const f = mtof(midi), out = panNode(ac, pan, dest);
      [[1, 1, 1.4], [2.76, 0.28, 0.5], [5.4, 0.08, 0.2]].forEach(([m, a, d]) => {
        const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
        const g = ac.createGain(); env(ac, g, t, gain * a, 0.003, d);
        o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.05);
      });
    },
    bass(ac, dest, t, midi, dur, gain) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(midi);
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = mtof(midi);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
      g.gain.exponentialRampToValueAtTime(gain * 0.45, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f); o2.connect(f); f.connect(g).connect(dest);
      o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
    },
    kick(ac, dest, t, gain) {
      const o = ac.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      const g = ac.createGain(); env(ac, g, t, gain, 0.004, 0.24);
      o.connect(g).connect(dest); o.start(t); o.stop(t + 0.3);
    },
    shaker(ac, dest, t, gain, pan) {
      const s = ac.createBufferSource(); s.buffer = noise(ac);
      const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
      const g = ac.createGain(); env(ac, g, t, gain, 0.004, 0.06);
      s.connect(f).connect(g).connect(panNode(ac, pan, dest)); s.start(t, (t * 7.31) % 1.5, 0.1);
    },
    noiseSweep(ac, dest, t, dur, f0, f1, gain, type, q) {
      const s = ac.createBufferSource(); s.buffer = noise(ac);
      const f = ac.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = q || 1.2;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(dest); s.start(t, (t * 3.7) % 1, dur + 0.05);
    },
    tone(ac, dest, t, f0, f1, dur, gain, type) {
      const o = ac.createOscillator(); o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ac.createGain(); env(ac, g, t, gain, 0.004, dur);
      o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
    },
  };

  const SFX = {
    pop(ac, d, t) { I.tone(ac, d, t, 700, 190, 0.11, 0.5); },
    pop2(ac, d, t) { I.tone(ac, d, t, 900, 260, 0.09, 0.4); I.tone(ac, d, t + 0.06, 1200, 400, 0.08, 0.25); },
    whoosh(ac, d, t) { I.noiseSweep(ac, d, t, 0.55, 350, 2600, 0.32, 'bandpass', 0.9); },
    scribble(ac, d, t, dur) {
      dur = dur || 0.7; const r = rng(Math.floor(t * 1000));
      for (let x = 0; x < dur; x += 0.07 + r() * 0.05) I.noiseSweep(ac, d, t + x, 0.08, 2200 + r() * 1500, 1600 + r() * 900, 0.1, 'bandpass', 2.5);
    },
    sparkle(ac, d, t) { [84, 88, 91, 96].forEach((m, i) => I.glock(ac, d, t + i * 0.07, m, 0.18, 0.3)); },
    ding(ac, d, t) { I.glock(ac, d, t, 89, 0.3, 0); I.glock(ac, d, t + 0.09, 96, 0.22, 0); },
    fire(ac, d, t, dur) {
      dur = dur || 1.4; I.noiseSweep(ac, d, t, dur, 900, 500, 0.22, 'lowpass', 0.7);
      const r = rng(Math.floor(t * 999));
      for (let x = 0; x < dur; x += 0.03 + r() * 0.09) I.noiseSweep(ac, d, t + x, 0.03, 3000, 2000, 0.18 * r(), 'bandpass', 3);
    },
    poof(ac, d, t) { I.noiseSweep(ac, d, t, 0.5, 2500, 300, 0.35, 'lowpass', 0.8); },
    chaching(ac, d, t) {
      I.noiseSweep(ac, d, t, 0.08, 5000, 3000, 0.25, 'highpass', 1);
      I.glock(ac, d, t + 0.05, 93, 0.3, 0); I.glock(ac, d, t + 0.13, 100, 0.25, 0);
    },
    coin(ac, d, t) { I.glock(ac, d, t, 98, 0.16, 0.2); I.glock(ac, d, t + 0.05, 103, 0.1, 0.2); },
    boing(ac, d, t) {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(180, t);
      for (let i = 0; i < 6; i++) o.frequency.linearRampToValueAtTime(i % 2 ? 160 : 260, t + 0.06 * (i + 1));
      const g = ac.createGain(); env(ac, g, t, 0.35, 0.01, 0.45);
      o.connect(g).connect(d); o.start(t); o.stop(t + 0.5);
    },
    stamp(ac, d, t) { I.tone(ac, d, t, 150, 48, 0.25, 0.8); I.noiseSweep(ac, d, t, 0.12, 1500, 300, 0.35, 'lowpass', 0.7); },
    tick(ac, d, t) { I.tone(ac, d, t, 2400, 1800, 0.03, 0.15, 'square'); },
    slide(ac, d, t) { I.tone(ac, d, t, 300, 900, 0.35, 0.18, 'triangle'); },
    sad(ac, d, t) { I.tone(ac, d, t, 420, 300, 0.35, 0.2, 'triangle'); I.tone(ac, d, t + 0.3, 330, 220, 0.5, 0.2, 'triangle'); },
    bulb(ac, d, t) { I.tone(ac, d, t, 1200, 1250, 0.6, 0.12, 'sine'); SFX.sparkle(ac, d, t + 0.1); },
  };

  // F major, 100 bpm: F  Dm  Bb  C  /  F  Am  Bb  C
  const CH = [
    [41, [65, 69, 72, 77]], [38, [62, 65, 69, 74]], [46, [62, 65, 70, 74]], [48, [64, 67, 72, 76]],
    [41, [65, 69, 72, 77]], [45, [64, 69, 72, 76]], [46, [62, 65, 70, 74]], [48, [64, 67, 72, 79]],
  ];

  function scheduleMusic(ac, dest, total, at) {
    const beat = 0.6, bar = beat * 4, r = rng(2024);
    const endBar = Math.floor((total - 4.2) / bar);
    for (let b = 0; b <= endBar; b++) {
      const t0 = b * bar, [root, tones] = CH[b % 8];
      const intro = b < 1;
      // bass
      if (!intro) {
        I.bass(ac, dest, at(t0), root, beat * 1.6, 0.34);
        I.bass(ac, dest, at(t0 + 2 * beat), root + (b % 2 ? 7 : 0), beat * 1.4, 0.28);
        if (b % 4 === 3) I.bass(ac, dest, at(t0 + 3.5 * beat), root + 2, beat * 0.45, 0.22);
      }
      // ukulele strums
      [[0, 1, 0.11], [1.5, -1, 0.06], [2, 1, 0.09], [3, 1, 0.07], [3.5, -1, 0.06]].forEach(([bt, dir, g]) => {
        const notes = dir > 0 ? tones : tones.slice().reverse();
        notes.forEach((m, i) => I.pluck(ac, dest, at(t0 + bt * beat + i * 0.014), m - 12, g, (i - 1.5) * 0.15));
      });
      // shaker 8ths + soft kick
      if (!intro) {
        for (let e = 0; e < 8; e++) I.shaker(ac, dest, at(t0 + e * beat / 2), e % 2 ? 0.05 : 0.025, 0.25);
        I.kick(ac, dest, at(t0), 0.3); I.kick(ac, dest, at(t0 + 2 * beat), 0.22);
      }
      // glockenspiel noodles
      [0, 1.5, 2.5, 3].forEach((bt) => {
        if (r() < (b % 8 < 4 ? 0.45 : 0.6)) {
          const m = tones[Math.floor(r() * tones.length)] + 12;
          I.glock(ac, dest, at(t0 + bt * beat), m, 0.09, r() * 0.6 - 0.3);
        }
      });
    }
    // final cadence
    const tf = (endBar + 1) * bar;
    [65, 69, 72, 77].forEach((m, i) => I.pluck(ac, dest, at(tf + i * 0.03), m - 12, 0.14, 0));
    I.bass(ac, dest, at(tf), 41, 2.6, 0.36);
    [77, 81, 84, 89, 93].forEach((m, i) => I.glock(ac, dest, at(tf + 0.15 + i * 0.11), m, 0.14, (i - 2) * 0.2));
  }

  // Build the whole mix. `at(tt)` maps timeline seconds to context seconds.
  // from: skip everything before this timeline time (live seeking).
  function build(ac, opts) {
    const { TL, events, narr, from = 0, base = 0 } = opts;
    const at = (tt) => base + (tt - from);
    const master = ac.createGain(); master.gain.value = 0.9;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp).connect(ac.destination);

    const music = ac.createGain(); music.connect(master);
    const sfx = ac.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
    const voice = ac.createGain(); voice.gain.value = 1.0; voice.connect(master);

    // ducking automation, computed in timeline time
    const UP = 0.42, DOWN = 0.13;
    const pts = [[0, UP]];
    const ids = TL.order;
    ids.forEach((id, i) => {
      const L = TL.lines[id], nx = TL.lines[ids[i + 1]];
      pts.push([L.start - 0.3, null], [L.start - 0.05, DOWN]);
      if (!nx || nx.start - L.end > 0.75) pts.push([L.end + 0.15, DOWN], [L.end + 0.55, UP]);
    });
    pts.push([TL.total - 2.5, UP], [TL.total - 0.2, 0.0001]);
    let cur = UP; const g = music.gain;
    g.setValueAtTime(UP, Math.max(0, at(Math.max(from, 0))));
    pts.forEach(([tt, v]) => {
      if (v === null) { if (tt >= from) g.setValueAtTime(cur, at(tt)); return; }
      if (tt >= from) g.linearRampToValueAtTime(v, at(tt));
      cur = v;
    });

    // music (skip notes that start before `from`)
    const mAt = (tt) => (tt < from - 0.01 ? -1 : at(tt));
    // Nothing is scheduled up front: Chrome walks every scheduled node on every render
    // quantum, so ~15k future notes make rendering quadratic. Queue jobs and pump them
    // a few seconds ahead of the playhead instead.
    const jobs = [];
    const saveI = Object.assign({}, I), guard = {};
    Object.keys(saveI).forEach((k) => {
      guard[k] = (ac2, d, t, ...rest) => { if (t >= 0) jobs.push([t, () => saveI[k](ac2, d, t, ...rest)]); };
    });
    Object.assign(I, guard);
    try { scheduleMusic(ac, music, TL.total, mAt); } finally { Object.assign(I, saveI); }

    // sound effects
    events.forEach((e) => { if (e.t >= from && SFX[e.name]) jobs.push([at(e.t), () => SFX[e.name](ac, sfx, at(e.t), e.dur)]); });
    jobs.sort((x, y) => x[0] - y[0]);
    let ji = 0;
    const pump = (until) => { while (ji < jobs.length && jobs[ji][0] < until) jobs[ji++][1](); };
    const AHEAD = 3, STEP = 2;
    let timer = null;
    if (typeof OfflineAudioContext !== 'undefined' && ac instanceof OfflineAudioContext) {
      pump(AHEAD + STEP);
      const end = ac.length / ac.sampleRate;
      for (let w = STEP; w < end; w += STEP) {
        const ww = w;
        ac.suspend(ww).then(() => { pump(ww + AHEAD + STEP); ac.resume(); });
      }
    } else {
      pump(ac.currentTime + AHEAD);
      timer = setInterval(() => { if (ac.state === 'closed') return clearInterval(timer); pump(ac.currentTime + AHEAD); }, 400);
    }

    // narration
    ids.forEach((id) => {
      const L = TL.lines[id], buf = narr && narr[id];
      if (!buf || L.start + buf.duration < from) return;
      const s = ac.createBufferSource(); s.buffer = buf; s.connect(voice);
      if (L.start >= from) s.start(at(L.start)); else s.start(at(from), from - L.start);
    });
    return { master, stop: () => timer && clearInterval(timer) };
  }

  function wav(buf) {
    const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
    const data = new DataView(new ArrayBuffer(44 + n * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); data.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
    data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true);
    data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * ch * 2, true);
    const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2;
    }
    return new Uint8Array(data.buffer);
  }

  return { build, wav, SFX: Object.keys(SFX) };
})();
