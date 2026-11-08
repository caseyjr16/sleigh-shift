// Sleigh Shift - audio. Every sound is synthesized live with WebAudio: no samples, no third-party assets.
// The music is an original melody written for this game (not a carol).
(function () {
  'use strict';
  const A = {
    ctx: null, master: null, sfx: null, music: null, on: true, musicOn: true,
    noiseBuf: null, timer: null, step: 0, nextT: 0, bpm: 108, playing: false,
  };
  let enabled = true;
  try { enabled = localStorage.getItem('sleighshift_sound') !== 'off'; } catch (e) {}
  A.on = enabled;

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { A.ctx = null; return; }
    const c = A.ctx;
    A.master = c.createGain(); A.master.gain.value = A.on ? 0.7 : 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    A.master.connect(comp); comp.connect(c.destination);
    A.sfx = c.createGain(); A.sfx.gain.value = 0.9; A.sfx.connect(A.master);
    A.music = c.createGain(); A.music.gain.value = 0.22; A.music.connect(A.master);
    // shared white-noise buffer
    const n = c.sampleRate * 1.0; A.noiseBuf = c.createBuffer(1, n, c.sampleRate);
    const d = A.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  };

  A.setOn = function (v) {
    A.on = v;
    try { localStorage.setItem('sleighshift_sound', v ? 'on' : 'off'); } catch (e) {}
    if (A.master) A.master.gain.setTargetAtTime(v ? 0.7 : 0, A.ctx.currentTime, 0.03);
  };
  A.toggle = function () { A.setOn(!A.on); return A.on; };

  function ok() { return A.ctx && A.on; }
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function osc(type, f, t, dur, vol, dest, f2) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, 0.005, vol, dur); o.connect(g); g.connect(dest || A.sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, type, freq, q, dest, f2) {
    const c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    env(g, t, 0.003, vol, dur); s.connect(f); f.connect(g); g.connect(dest || A.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  // a small struck bell: inharmonic partials with exponential decay
  function bell(f, t, vol, dest, dec) {
    const parts = [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]];
    for (const [m, v] of parts) osc('sine', f * m, t, (dec || 0.7) / m ** 0.4, vol * v, dest);
  }
  // sleigh-bell shake: bursts of bright band-passed noise
  function jingle(t, vol, n, dest) {
    for (let i = 0; i < (n || 4); i++) noise(t + i * 0.045 + Math.random() * 0.01, 0.07, vol * (1 - i * 0.12), 'bandpass', 7000 + Math.random() * 2500, 6, dest);
  }
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
  const hz = (semi) => 523.25 * Math.pow(2, semi / 12);

  A.sfxPlay = function (name, arg) {
    if (!ok()) return;
    const t = A.ctx.currentTime + 0.005;
    switch (name) {
      case 'shift': noise(t, 0.09, 0.25, 'bandpass', 900, 2, null, 2600); osc('triangle', 180, t, 0.05, 0.12); break;
      case 'catch': { const k = Math.min(PENTA.length - 1, arg | 0); bell(hz(PENTA[k]), t, 0.32); jingle(t, 0.10, 2); break; }
      case 'star': [0, 4, 7, 12, 16].forEach((s, i) => bell(hz(s + 12), t + i * 0.05, 0.18)); jingle(t, 0.18, 6); break;
      case 'wrong': osc('square', 150, t, 0.28, 0.16, null, 60); noise(t, 0.18, 0.35, 'lowpass', 400, 1); break;
      case 'coalHit': noise(t, 0.3, 0.5, 'lowpass', 300, 1); osc('sine', 90, t, 0.3, 0.3, null, 40); break;
      case 'zap': osc('sawtooth', 300, t, 0.16, 0.10, null, 1800); noise(t + 0.03, 0.2, 0.22, 'highpass', 3000, 1); break;
      case 'loaded': [0, 4, 7, 12].forEach((s, i) => bell(hz(s), t + i * 0.07, 0.24)); jingle(t + 0.05, 0.22, 7); osc('triangle', 130.8, t, 0.4, 0.2); break;
      case 'hour': bell(hz(7) / 2, t, 0.35, null, 1.4); bell(hz(0) / 2, t + 0.32, 0.35, null, 1.6); jingle(t + 0.6, 0.2, 6); break;
      case 'drop': osc('sine', 700, t, 0.06, 0.05, null, 500); break;
      case 'click': osc('triangle', 880, t, 0.05, 0.12); break;
      case 'win': [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => bell(hz(s), t + i * 0.11, 0.26, null, 1.0)); for (let i = 0; i < 6; i++) jingle(t + i * 0.18, 0.2, 4); break;
      case 'lose': [12, 7, 4, 0, -5].forEach((s, i) => osc('triangle', hz(s), t + i * 0.18, 0.35, 0.2)); break;
    }
  };

  // ---------- original music loop ----------
  // 32 eighth-note steps. Melody as semitones from C5 (null = rest); bass roots per bar.
  const MEL = [4, null, 7, 9, 7, null, 4, 2,   0, 2, 4, null, 7, null, 4, null,
               5, null, 9, 12, 9, 7, 4, null,  2, 4, 7, 4, 2, null, 0, null];
  const COUNTER = [12, null, null, null, 11, null, null, null, 9, null, null, null, 7, null, null, null];
  const BASS = [0, -5, -3, -7]; // C, G, A, F (one per bar)
  function schedStep(i, t) {
    const spb = 60 / A.bpm / 2; // eighth note
    const m = MEL[i % 32];
    if (m !== null) {
      osc('square', hz(m), t, spb * 1.6, 0.05, A.music);
      osc('triangle', hz(m), t, spb * 1.8, 0.09, A.music);
    }
    if (i % 4 === 0) { const cm = COUNTER[(i / 4) % 16]; if (cm !== null && A.counter) bell(hz(cm), t, 0.06, A.music, 1.2); }
    if (i % 8 === 0 || i % 8 === 4) osc('triangle', hz(BASS[Math.floor(i / 8) % 4] - 24), t, spb * 3.5, 0.22, A.music);
    if (i % 2 === 1) noise(t, 0.05, 0.05, 'bandpass', 8000, 5, A.music); // sleigh-bell offbeat
    if (i % 8 === 4) noise(t, 0.08, 0.1, 'bandpass', 2500, 1.2, A.music); // soft clap
  }
  A.counter = false;
  A.startMusic = function () {
    if (!A.ctx || A.playing) return;
    A.playing = true; A.nextT = A.ctx.currentTime + 0.08;
    A.timer = setInterval(function () {
      if (!A.ctx) return;
      while (A.nextT < A.ctx.currentTime + 0.15) {
        if (A.on && A.musicOn) schedStep(A.step, A.nextT);
        A.step++; A.nextT += 60 / A.bpm / 2;
      }
    }, 30);
  };
  A.stopMusic = function () { if (A.timer) clearInterval(A.timer); A.timer = null; A.playing = false; };
  window.SFX = A;
})();
