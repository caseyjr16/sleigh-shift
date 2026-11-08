// SLEIGH SHIFT - a Christmas Eve night shift at the North Pole fulfillment center.
// GitHub Game Off 2026 (theme: SHIFT). Made by ClearDevDocs with AI assistance via Hark.
// Plain HTML5 canvas + vanilla JS. Everything is drawn in code; all sound is synthesized (audio.js).
(function () {
  'use strict';
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  const SFX = window.SFX;

  // ---------------- constants ----------------
  const COLS = 4, HOURS = 8, HOUR_LEN = 40, CAP = 5;
  const COLORS = [
    { name: 'Red', c: '#e63946', d: '#9d1c26', sym: 'heart' },
    { name: 'Green', c: '#2fae5a', d: '#17663a', sym: 'tree' },
    { name: 'Gold', c: '#f5b700', d: '#a87400', sym: 'star' },
    { name: 'Blue', c: '#3a86ff', d: '#1c4fae', sym: 'flake' },
    { name: 'Purple', c: '#a259e6', d: '#62239f', sym: 'diamond' },
  ];
  const FONT = "'Trebuchet MS','Segoe UI','DejaVu Sans',Arial,sans-serif";
  const HOUR_NAMES = ['10 PM', '11 PM', 'MIDNIGHT', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM'];
  const HOUR_NEWS = [
    'Doors open. Gifts start rolling down the belt.',
    'Second hour: the belt speeds up.',
    'Midnight! Watch for COAL from the naughty line.',
    'A fifth color joins the line: PURPLE.',
    'Double drops: two gifts at once.',
    'Belt shifts! Some gifts slide a lane mid-fall.',
    'Peak rush. Everything is faster.',
    'Last hour before dawn. Load that sleigh!',
  ];

  function P(h) {
    return {
      fall: Math.max(1.4, 3.5 - 0.3 * h),
      spawn: Math.max(0.55, 1.55 - 0.14 * h),
      coal: h < 2 ? 0 : Math.min(0.15, 0.07 + 0.02 * (h - 2)),
      star: 0.05,
      dbl: h < 4 ? 0 : Math.min(0.4, 0.18 + 0.07 * (h - 4)),
      lane: h < 5 ? 0 : Math.min(0.3, 0.16 + 0.06 * (h - 5)),
      colors: h < 3 ? 4 : 5,
    };
  }

  // ---------------- utilities ----------------
  function mulberry32(a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(h1, h2, t) { const a = hex2rgb(h1), b = hex2rgb(h2); return 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',') + ')'; }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function txt(s, x, y, size, color, align, weight, base) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT; ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.textBaseline = base || 'middle'; ctx.fillText(s, x, y);
  }
  function fitTxt(s, x, y, size, color, maxW, align, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    while (ctx.measureText(s).width > maxW && size > 8) { size -= 1; ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT; }
    txt(s, x, y, size, color, align, weight);
  }
  function wrap(s, maxW, size, weight) {
    ctx.font = (weight || 'normal') + ' ' + size + 'px ' + FONT; const words = s.split(' '); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }

  // ---------------- layout ----------------
  let W = 1280, H = 720, portrait = false, scale = 1, offX = 0, offY = 0, dpr = 1;
  const L = {};
  function layout() {
    if (!portrait) {
      const pw = 480; L.pf = { x: Math.round(W / 2 - pw / 2), w: pw, top: 150, mouth: 548 };
      L.lightsY = 96; L.beltY = 126; L.sackY = 610; L.arrowY = 610; L.arrowR = 40;
      L.panelL = { x: 22, y: 140, w: L.pf.x - 130, h: 560 };
      L.panelR = { x: L.pf.x + pw + 108, y: 140, w: W - (L.pf.x + pw + 108) - 22, h: 560 };
      L.pause = { x: W - 42, y: 40, r: 24 };
    } else {
      const pw = 640; L.pf = { x: 40, w: pw, top: 330, mouth: H - 330 };
      L.lightsY = 250; L.beltY = 306; L.sackY = H - 266; L.arrowY = H - 112; L.arrowR = 62;
      L.panelL = null; L.panelR = null;
      L.pause = { x: W - 44, y: 44, r: 28 };
    }
    L.cw = L.pf.w / COLS; L.sackS = L.cw * 0.86;
    L.arrowL = { x: portrait ? W / 2 - 170 : L.pf.x - 56, y: L.arrowY, r: L.arrowR };
    L.arrowRt = { x: portrait ? W / 2 + 170 : L.pf.x + L.pf.w + 56, y: L.arrowY, r: L.arrowR };
    L.sleigh = portrait ? { x: W - 150, y: 150 } : { x: L.panelR.x + L.panelR.w / 2, y: 330 };
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
    portrait = vw / vh < 0.9;
    if (portrait) { W = 720; H = Math.round(clamp(720 * vh / vw, 1180, 1560)); }
    else { H = 720; W = Math.round(clamp(720 * vw / vh, 1180, 1600)); }
    scale = Math.min(vw / W, vh / H); offX = (vw - W * scale) / 2; offY = (vh - H * scale) / 2;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr);
    layout(); initSnow();
  }

  // ---------------- state ----------------
  let S = null;
  let best = { score: 0, hour: 0 };
  try { const b = JSON.parse(localStorage.getItem('sleighshift_best') || 'null'); if (b && typeof b.score === 'number') best = b; } catch (e) {}
  function saveBest() { try { localStorage.setItem('sleighshift_best', JSON.stringify(best)); } catch (e) {} }

  let screen = 'title'; // title | howto | credits | play | paused | over
  let overlay = null; // previous screen for howto/credits
  let gid = 1;
  const UI = { mouse: { x: -1, y: -1 }, buttons: [], timeScale: 1, wall: 0 };

  function newState(opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : (Date.now() % 2147483647);
    const rng = mulberry32(seed);
    const s = {
      seed, rng, demo: !!opts.demo, tutorial: opts.tutorial !== false && !opts.demo,
      hour: opts.hour || 0, hourT: 0, cheer: 100, score: 0, combo: 0, mult: 1,
      gifts: [], pend: [], slots: [], parts: [], texts: [], flying: [],
      shake: 0, flash: 0, flashColor: '#ff3344', loaded: 0, spawnT: 1.2, zapCD: 0, coalCD: 0,
      banner: null, hint: null, hintsSeen: {}, ending: false, launchT: -1, overT: -1, won: false,
      bot: !!opts.demo, botT: 0, botDelay: opts.demo ? 0.16 : 0.1, giftsSpawned: 0,
      stats: { caught: 0, wrong: 0, sooted: 0, zapped: 0, stars: 0, maxCombo: 0, shifts: 0 },
      t: 0, final: 0, newBest: false,
    };
    // four sacks, a random order of the first four colors
    const order = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let i = 0; i < COLS; i++) s.slots.push(mkSack(order[i], i));
    if (s.hour >= 3) { s.slots[Math.floor(rng() * 4)].color = 4; }
    return s;
  }
  function mkSack(color, idx) { return { id: gid++, color, fill: 0, idx, from: idx, at: 1, hop: false, ghost: null, squash: 0, pop: 1, wob: 0 }; }

  function startGame(opts) {
    S = newState(opts); gid = gid + 1;
    screen = S.demo ? 'title' : 'play';
    if (!S.demo) {
      SFX.init(); SFX.startMusic(); SFX.bpm = 108; SFX.counter = false;
      S.banner = { title: HOUR_NAMES[S.hour], sub: HOUR_NEWS[S.hour], t: 2.6, big: 'SHIFT START' };
      S.spawnT = 2.8; SFX.sfxPlay('hour');
      if (S.tutorial) showHint('move', portrait ? 'Tap the arrows or swipe to SHIFT the sack belt. Match each gift to its sack!' : 'Press LEFT / RIGHT (or Shift keys) to SHIFT the sack belt. Match each gift to its sack!', 6);
    }
  }
  function play(name, arg) { if (S && S.demo) return; SFX.sfxPlay(name, arg); }
  function showHint(key, text, t) { if (!S || S.demo || !S.tutorial || S.hintsSeen[key]) return; S.hintsSeen[key] = true; S.hint = { text, t: t || 4.5, max: t || 4.5 }; }

  // ---------------- core mechanics ----------------
  function shift(dir) {
    if (!S || (screen !== 'play' && !S.demo) || S.overT >= 0 || S.launchT >= 0) return false;
    const old = S.slots.slice();
    for (let i = 0; i < COLS; i++) {
      const sk = old[i]; const ni = (i + (dir < 0 ? -1 : 1) + COLS) % COLS;
      const cur = sackPos(sk);
      S.slots[ni] = sk; sk.idx = ni; sk.hop = false; sk.at = 0;
      const wrapped = Math.abs(ni - i) > 1;
      if (wrapped) { sk.from = ni - dir; sk.ghost = { from: i, to: i + dir }; } else { sk.from = cur; sk.ghost = null; }
    }
    S.stats.shifts++; play('shift');
    return true;
  }
  function sackPos(sk) { if (sk.at >= 1) return sk.idx; return lerp(sk.from, sk.idx, easeOut(sk.at)); }
  function colX(c) { return L.pf.x + L.cw * (c + 0.5); }
  function giftY(g) { return L.pf.top + g.p * (L.pf.mouth - L.pf.top); }
  function finalCol(g) { return g.lane && !g.lane.done ? g.col + g.lane.dir : g.col; }
  function presentColors(except) { const s = new Set(); for (const sk of S.slots) if (sk !== except) s.add(sk.color); return s; }

  function pickGiftColor() { const arr = S.slots.map(s => s.color); return arr[Math.floor(S.rng() * arr.length)]; }
  function freeCols() {
    const busy = new Set();
    for (const p of S.pend) busy.add(p.col);
    for (const g of S.gifts) if (g.p < 0.24) { busy.add(g.col); if (g.lane) busy.add(g.col + g.lane.dir); }
    const out = []; for (let c = 0; c < COLS; c++) if (!busy.has(c)) out.push(c); return out;
  }
  function spawnTick(dt) {
    if (S.ending || S.hourT < 2.4) return;
    S.spawnT -= dt; if (S.spawnT > 0) return;
    const p = P(S.hour), rng = S.rng; const free = freeCols();
    if (!free.length) { S.spawnT = 0.12; return; }
    const col = free[Math.floor(rng() * free.length)];
    let kind = 'gift'; const r = rng();
    if (S.giftsSpawned > 3) { if (r < p.coal && S.coalCD <= 0) kind = 'coal'; else if (r < p.coal + p.star) kind = 'star'; }
    const first = { col, kind, color: kind === 'gift' ? pickGiftColor() : -1, t: 0.6, lane: null };
    const items = [first];
    if (kind === 'coal') S.coalCD = 2.2;
    const others = free.filter(c => c !== col);
    if (kind === 'gift' && others.length && rng() < p.dbl) {
      const c2 = others[Math.floor(rng() * others.length)];
      const j = S.slots.findIndex(s => s.color === first.color); const off = j - col;
      items.push({ col: c2, kind: 'gift', color: S.slots[((c2 + off) % COLS + COLS) % COLS].color, t: 0.6, lane: null });
    } else if (kind === 'gift' && rng() < p.lane) {
      const dir = col === 0 ? 1 : col === COLS - 1 ? -1 : (rng() < 0.5 ? -1 : 1);
      first.lane = { dir, at: 0.36 + 0.14 * rng(), done: false };
    }
    for (const it of items) S.pend.push(it);
    let gap = p.spawn * (0.8 + 0.4 * rng());
    if (S.hour === 0 && S.giftsSpawned < 6) gap += 0.9;
    if (items.length > 1) gap += 0.35;
    S.spawnT = gap;
  }
  function releasePending(dt) {
    for (let i = S.pend.length - 1; i >= 0; i--) {
      const pd = S.pend[i]; pd.t -= dt; if (pd.t > 0) continue;
      S.pend.splice(i, 1);
      const p = P(S.hour);
      let fall = p.fall * (0.94 + 0.12 * S.rng()); if (S.giftsSpawned < 3 && S.hour === 0) fall *= 1.35;
      const g = { id: gid++, kind: pd.kind, color: pd.color, col: pd.col, x: pd.col, p: 0, fall, rot: (S.rng() - 0.5) * 0.3, spin: (S.rng() - 0.5) * 1.2, lane: pd.lane };
      S.gifts.push(g); S.giftsSpawned++;
      play('drop');
      if (g.kind === 'coal') showHint('coal', 'COAL! Click or tap it (or press Space) to toss it before it soots a sack.', 5);
      else if (g.kind === 'star') showHint('star', 'Gold STAR gift: it fits any sack. Bonus cheer!', 4);
      else if (g.lane) showHint('lane', 'BELT SHIFT! The arrow shows the lane this gift will slide into.', 5);
    }
  }
  function updateGifts(dt) {
    for (let i = S.gifts.length - 1; i >= 0; i--) {
      const g = S.gifts[i];
      g.p += dt / g.fall; g.rot += g.spin * dt * 0.4;
      if (g.lane && !g.lane.done && g.p >= g.lane.at) { g.lane.done = true; g.col += g.lane.dir; play('shift'); burst(colX(g.col - g.lane.dir), giftY(g), '#ffffff', 6, 120); }
      g.x = lerp(g.x, g.col, 1 - Math.pow(0.0005, dt));
      if (g.kind === 'coal' && Math.random() < dt * 8) S.parts.push({ x: colX(g.x) + (Math.random() - 0.5) * 20, y: giftY(g) - 10, vx: 0, vy: -30, life: 0.8, max: 0.8, c: 'rgba(80,80,90,0.6)', s: 6, type: 'smoke' });
      if (g.p >= 1) { S.gifts.splice(i, 1); land(g); }
    }
  }
  function land(g) {
    const sk = S.slots[g.col]; const x = colX(g.col), y = L.pf.mouth;
    if (g.kind === 'coal') {
      const had = sk.fill; sk.fill = 0; sk.wob = 1; S.cheer -= 12; S.combo = 0; S.mult = 1; S.shake = 12; S.flash = 0.35; S.flashColor = '#331a00';
      S.stats.sooted++; play('coalHit'); burst(x, y, '#2a2a30', 26, 260); floatText(x, y - 40, had ? 'SOOTED! -' + had : 'SOOT!', '#9aa0aa', 30);
      return;
    }
    if (g.kind === 'star' || sk.color === g.color) {
      sk.fill++; S.combo++; S.stats.caught++; S.stats.maxCombo = Math.max(S.stats.maxCombo, S.combo);
      const m = Math.min(5, 1 + Math.floor(S.combo / 6));
      if (m > S.mult) { floatText(W / 2, L.pf.top + 70, 'x' + m + ' COMBO!', '#ffd166', 46); play('star'); }
      S.mult = m;
      const pts = (g.kind === 'star' ? 25 : 10) * m; S.score += pts; S.cheer = Math.min(100, S.cheer + (g.kind === 'star' ? 6 : 0.8));
      if (g.kind === 'star') { S.stats.stars++; play('star'); }
      play('catch', S.combo); sk.squash = 1;
      burst(x, y, COLORS[sk.color].c, 16, 220); burst(x, y, '#fff7d6', 6, 160);
      floatText(x, y - 50, '+' + pts, '#fff7d6', 28);
      if (sk.fill >= CAP) loadSack(sk);
    } else {
      S.cheer -= 17; S.combo = 0; S.mult = 1; S.shake = 14; S.flash = 0.3; S.flashColor = '#ff2233'; sk.wob = 1;
      S.stats.wrong++; play('wrong'); burst(x, y, COLORS[g.color].c, 18, 300);
      floatText(x, y - 50, 'WRONG SACK', '#ff6b6b', 26);
      showHint('wrong', 'Wrong sack costs Christmas Cheer. When the meter empties, the shift is over!', 5);
    }
  }
  function loadSack(sk) {
    const i = S.slots.indexOf(sk); const x = colX(i);
    S.score += 100; S.loaded++; S.cheer = Math.min(100, S.cheer + 4);
    S.flying.push({ x, y: L.sackY, color: sk.color, t: 0 });
    floatText(x, L.sackY - 90, 'SACK LOADED +100', '#7dffb0', 26);
    play('loaded'); S.shake = Math.max(S.shake, 5);
    for (let k = 0; k < 30; k++) S.parts.push({ x, y: L.sackY, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 420, life: 1.1, max: 1.1, c: COLORS[Math.floor(Math.random() * 4)].c, s: 7, type: 'confetti', rot: Math.random() * 6 });
    const ns = mkSack(newSackColor(sk), i); ns.pop = 0; S.slots[i] = ns;
  }
  function newSackColor(old) {
    const pal = P(S.hour).colors; const others = presentColors(old);
    const needed = []; for (const g of S.gifts) if (g.kind === 'gift' && !others.has(g.color)) needed.push(g.color);
    for (const p of S.pend) if (p.kind === 'gift' && !others.has(p.color)) needed.push(p.color);
    if (needed.length) return needed[0];
    const cand = []; for (let c = 0; c < pal; c++) if (!others.has(c)) cand.push(c);
    if (cand.length) return cand[Math.floor(S.rng() * cand.length)];
    return Math.floor(S.rng() * pal);
  }
  function zap(g) {
    const i = S.gifts.indexOf(g); if (i < 0) return;
    S.gifts.splice(i, 1); S.score += 15; S.stats.zapped++;
    const x = colX(g.x), y = giftY(g);
    play('zap'); floatText(x, y - 30, 'TOSSED +15', '#ffb36b', 24);
    for (let k = 0; k < 22; k++) S.parts.push({ x, y, vx: (Math.random() - 0.5) * 500, vy: (Math.random() - 0.8) * 500, life: 0.6, max: 0.6, c: k % 3 ? '#ff9f43' : '#ffe66d', s: 4, type: 'spark' });
  }
  function zapLowest() {
    if (!S || screen !== 'play' || S.zapCD > 0) return false;
    let g = null; for (const x of S.gifts) if (x.kind === 'coal' && (!g || x.p > g.p)) g = x;
    if (!g) return false; S.zapCD = 0.3; zap(g); return true;
  }
  function zapAt(x, y) {
    if (!S) return false; let hit = null, bd = 1e9;
    for (const g of S.gifts) { if (g.kind !== 'coal') continue; const d = Math.hypot(colX(g.x) - x, giftY(g) - y); if (d < L.cw * 0.55 && d < bd) { bd = d; hit = g; } }
    if (hit) { zap(hit); return true; } return false;
  }
  function burst(x, y, c, n, sp) { for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, v = sp * (0.3 + Math.random() * 0.7); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.4, life: 0.7, max: 0.7, c, s: 3 + Math.random() * 5, type: 'sq', rot: Math.random() * 6 }); } }
  function floatText(x, y, s, c, size) { S.texts.push({ x, y, s, c, size, t: 0 }); }

  function nextHour() {
    S.hour++; S.hourT = 0;
    if (S.hour >= HOURS) { S.ending = true; S.banner = { title: '6 AM', sub: 'Dawn! Finish the last gifts...', t: 2.2, big: 'SHIFT END' }; play('hour'); return; }
    S.banner = { title: HOUR_NAMES[S.hour], sub: HOUR_NEWS[S.hour], t: 2.6, big: 'SHIFT CHANGE' };
    play('hour'); SFX.bpm = 108 + S.hour * 5; if (S.hour >= 4) SFX.counter = true;
    // shift change: the night crew re-hangs the sacks in a new order
    const old = S.slots.slice(); let perm;
    do { perm = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(S.rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; } } while (perm.every((v, i) => v === i));
    for (let i = 0; i < COLS; i++) { const sk = old[i]; const ni = perm[i]; sk.from = sackPos(sk); S.slots[ni] = sk; sk.idx = ni; sk.at = 0; sk.hop = true; sk.ghost = null; }
    if (S.hour === 3) { const sk = S.slots[Math.floor(S.rng() * 4)]; if (!S.gifts.some(g => g.color === sk.color) && !S.pend.some(p => p.color === sk.color)) { sk.color = 4; sk.pop = 0; } }
    if (S.hour === 2 && !S.demo) showHint('mid', 'Every hour the crew SHIFTS the sack order. Re-read the belt!', 4);
  }

  function bot(dt) {
    S.botT -= dt; if (S.botT > 0) return; S.botT = S.botDelay;
    let coal = null; for (const g of S.gifts) if (g.kind === 'coal' && g.p > (S.demo ? 0.3 : 0.5) && !g.botSkip && (!coal || g.p > coal.p)) coal = g;
    if (coal) { if (!S.demo && S.botMiss && S.rng() < S.botMiss) coal.botSkip = true; else zap(coal); return; }
    const list = S.gifts.filter(g => g.kind === 'gift').sort((a, b) => b.p - a.p);
    const g = list[0]; if (!g) return;
    const col = finalCol(g);
    let j = S.slots.findIndex(s => s.color === g.color); if (j < 0) return;
    let d = ((col - j) % COLS + COLS) % COLS; if (d === 3) d = -1; if (d === 2) d = (S.rng() < 0.5 ? 2 : -2);
    if (d !== 0) shift(d > 0 ? 1 : -1);
  }

  function gameOver(win) {
    if (S.done) return; S.done = true;
    S.won = win; S.final = S.score + (win ? 500 + Math.round(Math.max(0, S.cheer)) * 5 : 0);
    if (!S.demo) {
      const reached = win ? HOURS : S.hour;
      if (S.final > best.score) { best.score = S.final; best.hour = Math.max(best.hour, reached); S.newBest = true; saveBest(); }
      else if (reached > best.hour) { best.hour = reached; saveBest(); }
      play(win ? 'win' : 'lose');
      screen = 'over'; UI.overAt = UI.wall;
    } else { startGame({ demo: true }); }
  }

  const DT = 1 / 120;
  function update(dt) {
    if (!S) return;
    S.t += dt;
    for (const sk of S.slots) { if (sk.at < 1) { sk.at = Math.min(1, sk.at + dt / (sk.hop ? 0.45 : 0.11)); if (sk.at >= 1) sk.ghost = null; } sk.squash = Math.max(0, sk.squash - dt * 4); sk.pop = Math.min(1, sk.pop + dt * 3); sk.wob = Math.max(0, sk.wob - dt * 2.5); }
    for (let i = S.parts.length - 1; i >= 0; i--) { const p = S.parts[i]; p.life -= dt; if (p.life <= 0) { S.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; if (p.type !== 'smoke') p.vy += 700 * dt; p.vx *= 0.99; if (p.rot != null) p.rot += dt * 8; }
    for (let i = S.texts.length - 1; i >= 0; i--) { const t = S.texts[i]; t.t += dt; t.y -= 40 * dt; if (t.t > 1.1) S.texts.splice(i, 1); }
    for (let i = S.flying.length - 1; i >= 0; i--) { const f = S.flying[i]; f.t += dt / 0.8; if (f.t >= 1) S.flying.splice(i, 1); }
    S.shake = Math.max(0, S.shake - dt * 40); S.flash = Math.max(0, S.flash - dt);
    if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }
    if (S.hint) { S.hint.t -= dt; if (S.hint.t <= 0) S.hint = null; }
    if (S.done) return;
    if (S.overT >= 0) { S.overT += dt; if (S.overT > 1.4) gameOver(false); return; }
    if (S.launchT >= 0) { S.launchT += dt; if (S.launchT > 3.0) gameOver(true); return; }
    S.zapCD = Math.max(0, S.zapCD - dt); S.coalCD = Math.max(0, S.coalCD - dt);
    if (!S.ending) { S.hourT += dt; if (S.hourT >= HOUR_LEN) nextHour(); }
    spawnTick(dt); releasePending(dt); updateGifts(dt);
    if (S.bot) bot(dt);
    if (S.cheer <= 0) { S.cheer = 0; S.overT = 0; S.gifts.length = 0; S.pend.length = 0; if (!S.demo) SFX.bpm = 80; return; }
    if (S.ending && !S.gifts.length && !S.pend.length && S.launchT < 0) { S.launchT = 0; play('loaded'); }
    if (S.demo && S.hour >= 6) startGame({ demo: true, hour: 2 });
  }

  // ---------------- snow ----------------
  let snow = [];
  function initSnow() { snow = []; for (let i = 0; i < 90; i++) snow.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.6, v: 20 + Math.random() * 40, w: Math.random() * 6 }); }

  // ---------------- drawing: shapes ----------------
  function drawSym(sym, x, y, r, col) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.beginPath();
    if (sym === 'heart') { ctx.moveTo(0, r * 0.9); ctx.bezierCurveTo(-r * 1.4, -r * 0.1, -r * 0.6, -r * 1.1, 0, -r * 0.35); ctx.bezierCurveTo(r * 0.6, -r * 1.1, r * 1.4, -r * 0.1, 0, r * 0.9); ctx.fill(); }
    else if (sym === 'tree') { ctx.moveTo(0, -r); ctx.lineTo(r * 0.75, r * 0.15); ctx.lineTo(r * 0.35, r * 0.15); ctx.lineTo(r * 0.95, r * 0.8); ctx.lineTo(-r * 0.95, r * 0.8); ctx.lineTo(-r * 0.35, r * 0.15); ctx.lineTo(-r * 0.75, r * 0.15); ctx.closePath(); ctx.fill(); ctx.fillRect(-r * 0.15, r * 0.8, r * 0.3, r * 0.25); }
    else if (sym === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }
    else if (sym === 'flake') { ctx.lineWidth = Math.max(2, r * 0.22); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); ctx.lineTo(-Math.cos(a) * r, -Math.sin(a) * r); } ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, 7); ctx.fill(); }
    else if (sym === 'diamond') { ctx.moveTo(0, -r); ctx.lineTo(r * 0.75, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.75, 0); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function drawGift(x, y, s, g, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(g.rot || 0);
    if (g.kind === 'coal') {
      const glow = 0.5 + 0.5 * Math.sin(t * 9 + (g.id || 0));
      ctx.shadowColor = 'rgba(255,120,30,' + (0.5 + glow * 0.4) + ')'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#1b1b20'; ctx.beginPath();
      const pts = [[-0.45, -0.1], [-0.3, -0.4], [0.05, -0.45], [0.4, -0.3], [0.48, 0.1], [0.3, 0.4], [-0.1, 0.45], [-0.42, 0.28]];
      pts.forEach(([a, b], i) => i ? ctx.lineTo(a * s, b * s) : ctx.moveTo(a * s, b * s)); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,' + Math.round(120 + 100 * glow) + ',40,0.95)'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(-0.25 * s, -0.15 * s); ctx.lineTo(0, 0.02 * s); ctx.lineTo(0.2 * s, -0.12 * s); ctx.moveTo(0, 0.02 * s); ctx.lineTo(-0.05 * s, 0.28 * s); ctx.stroke();
      ctx.restore(); return;
    }
    const star = g.kind === 'star'; const C = star ? { c: '#ffd34d', d: '#c98a00', sym: 'star' } : COLORS[g.color];
    if (star) { ctx.shadowColor = '#fff2a8'; ctx.shadowBlur = 22 + 8 * Math.sin(t * 8); }
    const bw = s * 0.9, bh = s * 0.72, by = -s * 0.28;
    const gr = ctx.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, C.c); gr.addColorStop(1, C.d);
    ctx.fillStyle = gr; rr(-bw / 2, by, bw, bh, 6); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = C.d; rr(-bw / 2 - 4, by - s * 0.14, bw + 8, s * 0.2, 5); ctx.fill(); // lid
    ctx.fillStyle = C.c; rr(-bw / 2 - 4, by - s * 0.14, bw + 8, s * 0.12, 5); ctx.fill();
    ctx.fillStyle = star ? '#fff' : '#fff1d0'; ctx.fillRect(-s * 0.07, by - s * 0.14, s * 0.14, bh + s * 0.14);
    ctx.beginPath(); ctx.ellipse(-s * 0.15, by - s * 0.2, s * 0.15, s * 0.09, -0.4, 0, 7); ctx.ellipse(s * 0.15, by - s * 0.2, s * 0.15, s * 0.09, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(0, by + bh * 0.52, s * 0.22, 0, 7); ctx.fill();
    drawSym(C.sym, 0, by + bh * 0.52, s * 0.17, '#ffffff');
    if (g.lane && !g.lane.done) { // belt-shift arrow
      const d = g.lane.dir; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.beginPath();
      const ax = d * s * 0.62; ctx.moveTo(ax + d * 16, 0); ctx.lineTo(ax - d * 2, -14); ctx.lineTo(ax - d * 2, 14); ctx.closePath(); ctx.stroke(); ctx.fill();
    }
    ctx.restore();
  }
  function drawSack(x, y, s, sk, t, hl) {
    const C = COLORS[sk.color]; const fillR = sk.fill / CAP;
    const sq = sk.squash, pop = easeOut(sk.pop), wob = Math.sin(t * 40) * sk.wob * 0.12;
    ctx.save(); ctx.translate(x, y + s * 0.42); ctx.rotate(wob); ctx.scale((1 + sq * 0.16) * pop, (1 - sq * 0.14) * pop); ctx.translate(0, -s * 0.42);
    const h = s * (0.84 + 0.18 * fillR);
    if (hl) { ctx.fillStyle = hl; ctx.beginPath(); ctx.ellipse(0, s * 0.45, s * 0.62, s * 0.16, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, s * 0.46, s * 0.48, s * 0.09, 0, 0, 7); ctx.fill();
    const top = s * 0.44 - h;
    const gr = ctx.createLinearGradient(-s * 0.5, 0, s * 0.5, 0); gr.addColorStop(0, C.d); gr.addColorStop(0.35, C.c); gr.addColorStop(1, C.d);
    ctx.fillStyle = gr; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-s * 0.16, top + h * 0.14);
    ctx.quadraticCurveTo(-s * 0.58, top + h * 0.38, -s * 0.48, top + h * 0.86);
    ctx.quadraticCurveTo(-s * 0.44, s * 0.46, 0, s * 0.46);
    ctx.quadraticCurveTo(s * 0.44, s * 0.46, s * 0.48, top + h * 0.86);
    ctx.quadraticCurveTo(s * 0.58, top + h * 0.38, s * 0.16, top + h * 0.14); ctx.closePath(); ctx.fill(); ctx.stroke();
    // open mouth (flaps)
    ctx.fillStyle = C.d; ctx.beginPath(); ctx.moveTo(-s * 0.16, top + h * 0.14); ctx.lineTo(-s * 0.3, top - s * 0.02); ctx.lineTo(s * 0.3, top - s * 0.02); ctx.lineTo(s * 0.16, top + h * 0.14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, top - s * 0.01, s * 0.29, s * 0.06, 0, 0, 7); ctx.fill();
    // gold rope
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-s * 0.18, top + h * 0.15); ctx.lineTo(s * 0.18, top + h * 0.15); ctx.stroke();
    // badge
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(0, top + h * 0.58, s * 0.2, 0, 7); ctx.fill();
    drawSym(C.sym, 0, top + h * 0.58, s * 0.15, '#ffffff');
    ctx.restore();
    // fill pips
    for (let k = 0; k < CAP; k++) { const px = x + (k - (CAP - 1) / 2) * s * 0.17, py = y + s * 0.6; ctx.fillStyle = k < sk.fill ? '#fff3c4' : 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(px, py, s * 0.05, 0, 7); ctx.fill(); }
  }
  function drawSleigh(x, y, s, n, t) {
    ctx.save(); ctx.translate(x, y);
    // sacks stacked in the sleigh (up to 12 shown)
    const shown = Math.min(12, n);
    for (let k = 0; k < shown; k++) {
      const row = Math.floor(k / 4), c = k % 4; const bx = (-0.42 + c * 0.24 + (row % 2) * 0.1) * s, by = (-0.18 - row * 0.15) * s;
      ctx.fillStyle = COLORS[(k * 3) % 5].c; ctx.beginPath(); ctx.ellipse(bx, by, s * 0.12, s * 0.1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(bx - s * 0.03, by - s * 0.11, s * 0.06, s * 0.03);
    }
    // body
    const gr = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.25); gr.addColorStop(0, '#e63946'); gr.addColorStop(1, '#8f1622');
    ctx.fillStyle = gr; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.12); ctx.lineTo(s * 0.3, -s * 0.12);
    ctx.quadraticCurveTo(s * 0.55, -s * 0.14, s * 0.56, -s * 0.38); ctx.quadraticCurveTo(s * 0.7, -s * 0.32, s * 0.6, -s * 0.05);
    ctx.quadraticCurveTo(s * 0.5, s * 0.2, s * 0.25, s * 0.2); ctx.lineTo(-s * 0.45, s * 0.2); ctx.quadraticCurveTo(-s * 0.62, s * 0.1, -s * 0.55, -s * 0.12); ctx.closePath(); ctx.fill(); ctx.stroke();
    // runners
    ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.36); ctx.lineTo(s * 0.48, s * 0.36); ctx.quadraticCurveTo(s * 0.72, s * 0.36, s * 0.7, s * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.2); ctx.lineTo(-s * 0.3, s * 0.36); ctx.moveTo(s * 0.2, s * 0.2); ctx.lineTo(s * 0.2, s * 0.36); ctx.stroke();
    ctx.restore();
  }

  // ---------------- drawing: scene ----------------
  function skyColors() {
    const q = S ? clamp((S.hour + S.hourT / HOUR_LEN) / HOURS, 0, 1) : 0.15;
    if (q < 0.6) return [mix('#070d26', '#0d1640', q / 0.6), mix('#13214f', '#1d2a5e', q / 0.6)];
    if (q < 0.85) { const k = (q - 0.6) / 0.25; return [mix('#0d1640', '#2b2257', k), mix('#1d2a5e', '#8a4a78', k)]; }
    const k = (q - 0.85) / 0.15; return [mix('#2b2257', '#5a4a8a', k), mix('#8a4a78', '#f6a76b', k)];
  }
  function drawBackground(t) {
    // wall
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16213f'); g.addColorStop(1, '#0b1124'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // windows with sky + snow
    const [s1, s2] = skyColors(); const wy = 12, wh = L.lightsY - 26;
    const nw = portrait ? 3 : 5, gap = 18, ww = (W - gap * (nw + 1)) / nw;
    for (let i = 0; i < nw; i++) {
      const x = gap + i * (ww + gap);
      const sg = ctx.createLinearGradient(0, wy, 0, wy + wh); sg.addColorStop(0, s1); sg.addColorStop(1, s2); ctx.fillStyle = sg; rr(x, wy, ww, wh, 8); ctx.fill();
      ctx.save(); rr(x, wy, ww, wh, 8); ctx.clip();
      ctx.fillStyle = '#e8f0ff'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(x + ((k * 97 + i * 53) % ww), wy + wh - 6 + Math.sin(k + i) * 4, 26 + k * 6, Math.PI, 0); ctx.fill(); }
      // distant star / snow inside windows
      ctx.fillStyle = '#ffffff';
      for (const f of snow) if (f.x > x && f.x < x + ww) { ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(f.x, wy + ((f.y * 0.3) % wh), f.r * 0.8, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.restore();
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 6; rr(x, wy, ww, wh, 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + ww / 2, wy); ctx.lineTo(x + ww / 2, wy + wh); ctx.stroke();
    }
    // floor
    const fy = L.sackY + L.sackS * 0.46; const fg = ctx.createLinearGradient(0, fy, 0, H); fg.addColorStop(0, '#3b2a20'); fg.addColorStop(1, '#22170f'); ctx.fillStyle = fg; ctx.fillRect(0, fy, W, H - fy);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2; for (let x = 0; x < W; x += 90) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x - 40, H); ctx.stroke(); }
    // string lights
    drawLights(t);
  }
  function drawLights(t) {
    const y0 = L.lightsY, n = Math.ceil(W / 220) + 1; const pal = ['#ff4d5e', '#3ddc84', '#ffd166', '#5aa9ff'];
    const chase = S && S.mult >= 3 ? 10 : 3;
    ctx.strokeStyle = '#1d3b24'; ctx.lineWidth = 3;
    let k = 0;
    for (let i = 0; i < n; i++) {
      const x0 = i * 220 - 20, x1 = x0 + 220; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 + 34, x1, y0); ctx.stroke();
      for (let j = 1; j < 6; j++) {
        const u = j / 6, x = lerp(x0, x1, u), y = y0 + 34 * 2 * u * (1 - u) + 4;
        const c = pal[k % 4]; const on = (Math.floor(t * chase) + k) % 4 !== 0;
        ctx.fillStyle = c; ctx.globalAlpha = on ? 1 : 0.35;
        if (on) { ctx.shadowColor = c; ctx.shadowBlur = 16; }
        ctx.beginPath(); ctx.ellipse(x, y + 7, 5, 8, 0, 0, 7); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1; k++;
      }
    }
  }
  function drawBelt(t) {
    const x = L.pf.x - 16, w = L.pf.w + 32, y = L.beltY;
    ctx.fillStyle = '#2b2f3a'; rr(x, y - 14, w, 28, 10); ctx.fill();
    ctx.strokeStyle = '#4a5162'; ctx.lineWidth = 2; const off = (t * 60) % 24;
    for (let bx = x + off; bx < x + w; bx += 24) { ctx.beginPath(); ctx.moveTo(bx, y - 12); ctx.lineTo(bx - 8, y + 12); ctx.stroke(); }
    ctx.fillStyle = '#ffd166'; ctx.fillRect(x, y + 12, w, 3);
    // hatches with a preview glow of the next drop
    for (let c = 0; c < COLS; c++) {
      const hx = colX(c); const pd = S ? S.pend.find(p => p.col === c) : null;
      ctx.fillStyle = '#121620'; rr(hx - L.cw * 0.32, y + 14, L.cw * 0.64, 14, 4); ctx.fill();
      if (pd) {
        const col = pd.kind === 'coal' ? '#ff7a2f' : pd.kind === 'star' ? '#fff2a8' : COLORS[pd.color].c;
        const blink = 0.5 + 0.5 * Math.sin(t * 30);
        ctx.fillStyle = col; ctx.globalAlpha = 0.5 + 0.5 * blink; ctx.shadowColor = col; ctx.shadowBlur = 18;
        rr(hx - L.cw * 0.3, y + 16, L.cw * 0.6, 10, 4); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
    }
  }
  function drawField(t) {
    const pf = L.pf;
    // lanes
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = c % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(pf.x + c * L.cw, pf.top - 10, L.cw, pf.mouth - pf.top + 10);
    }
    ctx.strokeStyle = 'rgba(255,209,102,0.25)'; ctx.setLineDash([6, 10]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pf.x, pf.mouth); ctx.lineTo(pf.x + pf.w, pf.mouth); ctx.stroke(); ctx.setLineDash([]);
    if (!S) return;
    // guide lines from gifts down to the mouth
    for (const g of S.gifts) {
      const x = colX(g.x), y = giftY(g), fc = finalCol(g);
      const col = g.kind === 'coal' ? 'rgba(255,122,47,0.35)' : g.kind === 'star' ? 'rgba(255,242,168,0.35)' : COLORS[g.color].c;
      ctx.strokeStyle = col; ctx.globalAlpha = g.kind === 'gift' ? 0.35 : 1; ctx.lineWidth = 3; ctx.setLineDash([4, 8]); ctx.beginPath(); ctx.moveTo(x, y + 30);
      if (g.lane && !g.lane.done) { const ly = L.pf.top + g.lane.at * (pf.mouth - pf.top); ctx.lineTo(x, ly); ctx.lineTo(colX(fc), ly + 20); ctx.lineTo(colX(fc), pf.mouth); }
      else ctx.lineTo(x, pf.mouth);
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    for (const g of S.gifts) drawGift(colX(g.x), giftY(g), L.cw * 0.62, g, t);
  }
  function drawSacks(t) {
    const pf = L.pf, y = L.sackY, s = L.sackS;
    // candy-cane rail
    const ry = y + s * 0.47; ctx.save(); rr(pf.x - 10, ry - 7, pf.w + 20, 14, 7); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(pf.x - 10, ry - 7, pf.w + 20, 14); ctx.fillStyle = '#d62839';
    const off = S ? (S.t * 0) : 0; for (let x = pf.x - 30 + off; x < pf.x + pf.w + 30; x += 22) { ctx.beginPath(); ctx.moveTo(x, ry + 7); ctx.lineTo(x + 10, ry + 7); ctx.lineTo(x + 24, ry - 7); ctx.lineTo(x + 14, ry - 7); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    if (!S) return;
    // landing preview: which sack each lane's lowest gift will hit
    const lowest = {}; for (const g of S.gifts) { const c = finalCol(g); if (!lowest[c] || g.p > lowest[c].p) lowest[c] = g; }
    ctx.save(); ctx.beginPath(); ctx.rect(pf.x - 6, y - s, pf.w + 12, s * 2.2); ctx.clip();
    for (let i = 0; i < COLS; i++) {
      const sk = S.slots[i]; const g = lowest[i]; let hl = null;
      if (g && g.p > 0.45) { const good = g.kind === 'star' || (g.kind === 'gift' && g.color === sk.color); hl = g.kind === 'coal' ? 'rgba(255,122,47,0.45)' : good ? 'rgba(80,255,150,0.45)' : 'rgba(255,60,60,0.5)'; }
      const ps = sackPos(sk); const lift = sk.hop && sk.at < 1 ? -Math.sin(Math.PI * easeOut(sk.at)) * 60 : 0;
      drawSack(pf.x + L.cw * (ps + 0.5), y + lift, s, sk, t, sk.at >= 1 ? hl : null);
      if (sk.ghost) { const gp = lerp(sk.ghost.from, sk.ghost.to, easeOut(sk.at)); drawSack(pf.x + L.cw * (gp + 0.5), y, s, sk, t, null); }
    }
    ctx.restore();
  }
  function drawArrowBtn(b, dir, t) {
    const hov = Math.hypot(UI.mouse.x - b.x, UI.mouse.y - b.y) < b.r;
    ctx.fillStyle = hov ? '#2fae5a' : '#1f7a40'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); const r = b.r * 0.45;
    ctx.moveTo(b.x + dir * r, b.y); ctx.lineTo(b.x - dir * r * 0.6, b.y - r); ctx.lineTo(b.x - dir * r * 0.6, b.y + r); ctx.closePath(); ctx.fill();
    if (!portrait) txt(dir < 0 ? '← / A' : '→ / D', b.x, b.y + b.r + 16, 13, 'rgba(255,255,255,0.6)', 'center', 'bold');
  }
  function clockStr() {
    const mins = 22 * 60 + Math.floor(S.hour * 60 + Math.min(S.hourT, HOUR_LEN) / HOUR_LEN * 60);
    const h = Math.floor(mins / 60) % 24, m = mins % 60; let h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(8,12,28,0.78)'; rr(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,209,102,0.55)'; ctx.lineWidth = 2; rr(x, y, w, h, 16); ctx.stroke();
  }
  function cheerBar(x, y, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(x, y, w, h, h / 2); ctx.fill();
    const f = clamp(S.cheer / 100, 0, 1); if (f > 0) {
      ctx.save(); rr(x, y, w * f, h, h / 2); ctx.clip();
      ctx.fillStyle = f < 0.3 ? '#ff4d5e' : '#fff'; ctx.fillRect(x, y, w, h);
      if (f >= 0.3) { ctx.fillStyle = '#d62839'; for (let sx = x - 20 + (S.t * 30) % 24; sx < x + w; sx += 24) { ctx.beginPath(); ctx.moveTo(sx, y + h); ctx.lineTo(sx + 10, y + h); ctx.lineTo(sx + 22, y); ctx.lineTo(sx + 12, y); ctx.closePath(); ctx.fill(); } }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,209,102,0.7)'; ctx.lineWidth = 2; rr(x, y, w, h, h / 2); ctx.stroke();
  }
  function drawHUD(t) {
    if (!portrait) {
      const p = L.panelL; panel(p.x, p.y, p.w, p.h); const cx = p.x + p.w / 2;
      txt('NIGHT SHIFT', cx, p.y + 30, 15, '#ffd166');
      fitTxt(clockStr(), cx, p.y + 72, 44, '#ffffff', p.w - 24);
      const q = clamp((S.hour + S.hourT / HOUR_LEN) / HOURS, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(p.x + 20, p.y + 104, p.w - 40, 10, 5); ctx.fill();
      ctx.fillStyle = '#ffd166'; rr(p.x + 20, p.y + 104, Math.max(10, (p.w - 40) * q), 10, 5); ctx.fill();
      txt('10 PM', p.x + 20, p.y + 128, 12, 'rgba(255,255,255,0.5)', 'left', 'normal'); txt('6 AM DAWN', p.x + p.w - 20, p.y + 128, 12, 'rgba(255,255,255,0.5)', 'right', 'normal');
      txt('SCORE', cx, p.y + 170, 15, '#ffd166'); fitTxt(String(S.score), cx, p.y + 208, 46, '#fff', p.w - 24);
      txt('COMBO', cx, p.y + 256, 15, '#ffd166'); txt(S.combo + (S.mult > 1 ? '   x' + S.mult : ''), cx, p.y + 290, 32, S.mult > 1 ? '#7dffb0' : '#fff');
      txt('CHRISTMAS CHEER', cx, p.y + 340, 15, '#ffd166'); cheerBar(p.x + 20, p.y + 356, p.w - 40, 22);
      txt('BEST  ' + best.score, cx, p.y + 410, 16, 'rgba(255,255,255,0.7)');
      const lines = wrap(portrait ? '' : 'Shift: ← → or Shift keys · Toss coal: click it or Space · P pause · M sound', p.w - 30, 13);
      lines.forEach((l, i) => txt(l, cx, p.y + 460 + i * 18, 13, 'rgba(255,255,255,0.55)', 'center', 'normal'));
      const r = L.panelR; panel(r.x, r.y, r.w, r.h); const rx = r.x + r.w / 2;
      txt('LOADING DOCK', rx, r.y + 30, 15, '#ffd166');
      drawSleigh(rx - r.w * 0.05, r.y + 175, Math.min(r.w * 0.66, 200), S.loaded, t);
      txt('SACKS LOADED', rx, r.y + 300, 15, '#ffd166'); txt(String(S.loaded), rx, r.y + 345, 54, '#fff');
      txt('GIFTS SORTED  ' + S.stats.caught, rx, r.y + 400, 16, 'rgba(255,255,255,0.75)');
      txt('COAL TOSSED  ' + S.stats.zapped, rx, r.y + 428, 16, 'rgba(255,255,255,0.75)');
      txt('HOUR ' + Math.min(HOURS, S.hour + 1) + ' / ' + HOURS, rx, r.y + 470, 18, '#fff');
    } else {
      panel(16, 16 + 0, W - 32 - 70, 200); const x0 = 36;
      txt('NIGHT SHIFT', x0, 44, 15, '#ffd166', 'left'); txt(clockStr(), x0, 84, 40, '#fff', 'left');
      txt('SCORE', 330, 44, 15, '#ffd166', 'left'); txt(String(S.score), 330, 84, 40, '#fff', 'left');
      txt('SACKS ' + S.loaded, 520, 44, 15, '#ffd166', 'left'); txt(S.mult > 1 ? 'x' + S.mult : 'COMBO ' + S.combo, 520, 84, 28, S.mult > 1 ? '#7dffb0' : '#fff', 'left');
      txt('CHEER', x0, 130, 15, '#ffd166', 'left'); cheerBar(110, 120, W - 32 - 70 - 120, 22);
      const q = clamp((S.hour + S.hourT / HOUR_LEN) / HOURS, 0, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(x0, 168, W - 32 - 70 - 40, 8, 4); ctx.fill(); ctx.fillStyle = '#ffd166'; rr(x0, 168, Math.max(8, (W - 32 - 70 - 40) * q), 8, 4); ctx.fill();
      txt('10 PM', x0, 192, 12, 'rgba(255,255,255,0.5)', 'left', 'normal'); txt('BEST ' + best.score, W / 2 - 35, 192, 12, 'rgba(255,255,255,0.6)', 'center', 'normal'); txt('6 AM', W - 32 - 70 - 4 + 16, 192, 12, 'rgba(255,255,255,0.5)', 'right', 'normal');
    }
    // pause button
    const b = L.pause; ctx.fillStyle = 'rgba(8,12,28,0.8)'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(b.x - b.r * 0.3, b.y - b.r * 0.38, b.r * 0.2, b.r * 0.76); ctx.fillRect(b.x + b.r * 0.1, b.y - b.r * 0.38, b.r * 0.2, b.r * 0.76);
  }
  function drawFX(t) {
    for (const p of S.parts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.c;
      if (p.type === 'smoke') { ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (2 - p.life / p.max), 0, 7); ctx.fill(); }
      else if (p.type === 'spark') { ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
      else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0); ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    for (const f of S.flying) {
      const e = easeOut(f.t), tx = L.sleigh.x, ty = L.sleigh.y + (portrait ? 0 : 0);
      const x = lerp(f.x, tx, e), y = lerp(f.y, ty, e) - Math.sin(Math.PI * e) * 160;
      ctx.globalAlpha = 1 - f.t * 0.3; drawSack(x, y, L.sackS * (1 - 0.5 * e), { color: f.color, fill: CAP, squash: 0, pop: 1, wob: 0 }, t, null); ctx.globalAlpha = 1;
    }
    for (const tx of S.texts) {
      ctx.globalAlpha = clamp(1.6 - tx.t * 1.5, 0, 1); const sc = 1 + Math.max(0, 0.25 - tx.t) * 2;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.font = 'bold ' + Math.round(tx.size * sc) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText(tx.s, tx.x, tx.y); txt(tx.s, tx.x, tx.y, Math.round(tx.size * sc), tx.c);
    }
    ctx.globalAlpha = 1;
  }
  function drawBanner() {
    if (S.banner) {
      const b = S.banner; const a = clamp(Math.min(b.t, 2.6 - b.t + 0.0001) * 4, 0, 1); const y = L.pf.top + (L.pf.mouth - L.pf.top) * 0.36;
      ctx.globalAlpha = a; ctx.fillStyle = 'rgba(8,12,28,0.86)'; rr(L.pf.x - 30, y - 70, L.pf.w + 60, 150, 18); ctx.fill();
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; rr(L.pf.x - 30, y - 70, L.pf.w + 60, 150, 18); ctx.stroke();
      txt(b.big, W / 2, y - 38, 20, '#7dffb0'); txt(b.title, W / 2, y + 2, 52, '#fff');
      fitTxt(b.sub, W / 2, y + 50, 20, '#ffd166', L.pf.w + 40, 'center', 'normal'); ctx.globalAlpha = 1;
    }
    if (S.hint && !S.banner) {
      const h = S.hint; const a = clamp(Math.min(h.t, h.max - h.t) * 4, 0, 1); const lines = wrap(h.text, L.pf.w - 20, 21, 'bold');
      const bh = 22 + lines.length * 27, y = L.pf.top + 10;
      ctx.globalAlpha = a; ctx.fillStyle = 'rgba(20,90,50,0.92)'; rr(L.pf.x - 12, y, L.pf.w + 24, bh, 14); ctx.fill(); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; rr(L.pf.x - 12, y, L.pf.w + 24, bh, 14); ctx.stroke();
      lines.forEach((l, i) => txt(l, W / 2, y + 24 + i * 27, 21, '#fff'));
      ctx.globalAlpha = 1;
    }
  }
  function drawSnowFront(dt) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const f of snow) { f.y += f.v * dt; f.x += Math.sin(UI.wall + f.w) * 10 * dt; if (f.y > H) { f.y = -5; f.x = Math.random() * W; } if (f.r > 2.2) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.8, 0, 7); ctx.fill(); } }
  }

  // ---------------- menus ----------------
  function button(id, label, x, y, w, h, primary, fn) {
    const hov = UI.mouse.x >= x && UI.mouse.x <= x + w && UI.mouse.y >= y && UI.mouse.y <= y + h;
    ctx.fillStyle = primary ? (hov ? '#ff5965' : '#e63946') : (hov ? '#2fae5a' : '#1f6f3d'); rr(x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5; rr(x, y, w, h, h / 2); ctx.stroke();
    fitTxt(label, x + w / 2, y + h / 2 + 1, Math.round(h * 0.42), '#fff', w - 20);
    UI.buttons.push({ id, x, y, w, h, fn, primary });
  }
  function bigTitle(y, size) {
    ctx.save(); ctx.shadowColor = '#ff4d5e'; ctx.shadowBlur = 24; ctx.lineWidth = 8; ctx.strokeStyle = '#7a0f1a';
    ctx.font = '900 ' + size + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('SLEIGH SHIFT', W / 2, y); ctx.restore();
    const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#ffd166');
    ctx.font = '900 ' + size + 'px ' + FONT; ctx.fillStyle = g; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SLEIGH SHIFT', W / 2, y);
    // snow cap on the title
    ctx.fillStyle = '#ffffff'; const tw = ctx.measureText('SLEIGH SHIFT').width;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(W / 2 - tw / 2 + 20 + i * (tw - 40) / 8, y - size * 0.42, 16, 7, 0, 0, 7); ctx.fill(); }
  }
  function drawTitle() {
    const pw = portrait ? 620 : 640, ph = portrait ? 760 : 560, px = W / 2 - pw / 2, py = portrait ? H / 2 - ph / 2 : 80;
    panel(px, py, pw, ph);
    bigTitle(py + 90, portrait ? 76 : 84);
    fitTxt('Christmas Eve. One night shift at the North Pole fulfillment center.', W / 2, py + 160, 20, '#fff', pw - 40, 'center', 'normal');
    fitTxt('SHIFT the sacks. Sort every gift. Load the sleigh before dawn.', W / 2, py + 192, 20, '#ffd166', pw - 40);
    const bw = 300, bh = 58; let by = py + 240;
    button('play', 'START SHIFT', W / 2 - bw / 2, by, bw, bh, true, () => startGame({ tutorial: true })); by += 72;
    button('howto', 'HOW TO PLAY', W / 2 - bw / 2, by, bw, 50, false, () => { overlay = 'title'; screen = 'howto'; }); by += 62;
    button('credits', 'CREDITS', W / 2 - bw / 2, by, bw, 50, false, () => { overlay = 'title'; screen = 'credits'; }); by += 62;
    button('sound', 'SOUND: ' + (SFX.on ? 'ON' : 'OFF'), W / 2 - bw / 2, by, bw, 50, false, () => { SFX.init(); SFX.toggle(); }); by += 74;
    txt('BEST SCORE  ' + best.score + (best.hour >= HOURS ? '   ★ survived to dawn' : ''), W / 2, by, 18, '#7dffb0');
    fitTxt('GitHub Game Off 2026 · theme SHIFT · by ClearDevDocs · made with AI assistance via Hark (see Credits)', W / 2, py + ph - 22, 13, 'rgba(255,255,255,0.6)', pw - 30, 'center', 'normal');
  }
  function drawHowto() {
    const pw = portrait ? 660 : 900, ph = portrait ? 1040 : 640, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    panel(px, py, pw, ph); txt('HOW TO PLAY', W / 2, py + 44, 34, '#ffd166');
    const rows = [
      ['gift', 'Gifts drop down four lanes. Each one belongs in the sack with the SAME color and symbol.'],
      ['shift', (portrait ? 'Tap the green arrows or swipe' : 'Press ← → (or A / D, or the left and right Shift keys) or click the green arrows') + ' to SHIFT the whole sack belt one step. The end sack wraps around.'],
      ['sack', 'Fill a sack with 5 gifts and it flies to the sleigh: +100. Keep sorting to build a combo (up to x5).'],
      ['coal', 'COAL from the naughty line soots a sack and empties it. Click or tap the coal (or press Space) to toss it.'],
      ['star', 'Gold STAR gifts fit any sack. Wrong sacks and coal drain Christmas Cheer: run out and the shift is over.'],
      ['clock', 'Survive 10 PM to 6 AM. Every hour the crew SHIFTS the sack order, and the belt gets faster and trickier.'],
    ];
    const rowH = portrait ? 140 : 80; let y = py + 100;
    const sw = portrait ? 120 : 110;
    for (const [icon, text] of rows) {
      const ix = px + 30 + sw / 2, iy = y + rowH / 2 - 6;
      if (icon === 'gift') drawGift(ix, iy, 56, { kind: 'gift', color: 0, rot: 0 }, UI.wall);
      else if (icon === 'shift') { drawArrowMini(ix - 26, iy, -1); drawArrowMini(ix + 26, iy, 1); }
      else if (icon === 'sack') drawSack(ix, iy - 4, 64, { color: 1, fill: 3, squash: 0, pop: 1, wob: 0 }, UI.wall, null);
      else if (icon === 'coal') drawGift(ix, iy, 50, { kind: 'coal', rot: 0, id: 1 }, UI.wall);
      else if (icon === 'star') drawGift(ix, iy, 54, { kind: 'star', rot: 0 }, UI.wall);
      else if (icon === 'clock') { txt('10→6', ix, iy, 26, '#ffd166'); }
      const lines = wrap(text, pw - sw - 70, portrait ? 21 : 19, 'normal');
      const ly = y + rowH / 2 - (lines.length - 1) * 13 - 6;
      lines.forEach((l, i) => txt(l, px + sw + 50, ly + i * 26, portrait ? 21 : 19, '#fff', 'left', 'normal'));
      y += rowH;
    }
    const keys = portrait ? 'Pause: the button at the top right.' : 'Keys: ← → / A D / Shift keys shift · Space tosses coal · P or Esc pauses · M sound';
    fitTxt(keys, W / 2, py + ph - 96, 17, 'rgba(255,255,255,0.75)', pw - 40, 'center', 'normal');
    button('back', overlay === 'paused' ? 'BACK' : 'GOT IT', W / 2 - 130, py + ph - 72, 260, 52, true, () => { screen = overlay || 'title'; });
  }
  function drawArrowMini(x, y, d) { ctx.fillStyle = '#1f7a40'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + d * 9, y); ctx.lineTo(x - d * 5, y - 9); ctx.lineTo(x - d * 5, y + 9); ctx.closePath(); ctx.fill(); }
  function drawCredits() {
    const pw = portrait ? 660 : 820, ph = portrait ? 980 : 600, px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    panel(px, py, pw, ph); txt('CREDITS', W / 2, py + 44, 34, '#ffd166');
    const paras = [
      'SLEIGH SHIFT, made by ClearDevDocs for GitHub Game Off 2026 (theme: SHIFT).',
      'Code, art and sound were all made fresh for this game. Every picture is drawn in code on an HTML5 canvas, and all sound and music is synthesized live with WebAudio. No third-party assets.',
      'AI disclosure: code, art (procedural canvas drawing), sound and music, and text were made with AI assistance via Hark.',
      'The music is an original melody, not a carol. No characters from any film, book or brand appear.',
      'Learn to build games like this in Python: ClearDevDocs cheat sheets at cleardevdocs-shop.fourthwall.com. TikTok @cleardevdocs.',
      'Code license: MIT.',
    ];
    let y = py + 100; const size = portrait ? 21 : 19;
    for (const p of paras) { const lines = wrap(p, pw - 70, size, 'normal'); lines.forEach((l) => { txt(l, px + 35, y, size, '#fff', 'left', 'normal'); y += size + 8; }); y += 12; }
    button('back', 'BACK', W / 2 - 130, py + ph - 72, 260, 52, true, () => { screen = overlay || 'title'; });
  }
  function drawPaused() {
    ctx.fillStyle = 'rgba(4,6,16,0.6)'; ctx.fillRect(0, 0, W, H);
    const pw = 420, ph = 420, px = W / 2 - pw / 2, py = H / 2 - ph / 2; panel(px, py, pw, ph);
    txt('PAUSED', W / 2, py + 50, 40, '#ffd166');
    const bw = 280; let by = py + 96;
    button('resume', 'RESUME', W / 2 - bw / 2, by, bw, 54, true, () => { screen = 'play'; }); by += 66;
    button('howto', 'HOW TO PLAY', W / 2 - bw / 2, by, bw, 48, false, () => { overlay = 'paused'; screen = 'howto'; }); by += 60;
    button('sound', 'SOUND: ' + (SFX.on ? 'ON' : 'OFF'), W / 2 - bw / 2, by, bw, 48, false, () => SFX.toggle()); by += 60;
    button('restart', 'RESTART SHIFT', W / 2 - bw / 2, by, bw, 48, false, () => startGame({ tutorial: false })); by += 60;
    button('quit', 'QUIT TO TITLE', W / 2 - bw / 2, by, bw, 48, false, () => toTitle());
  }
  function drawOver() {
    ctx.fillStyle = 'rgba(4,6,16,0.55)'; ctx.fillRect(0, 0, W, H);
    const pw = portrait ? 640 : 620, ph = portrait ? 860 : 620, px = W / 2 - pw / 2, py = H / 2 - ph / 2; panel(px, py, pw, ph);
    const win = S.won;
    txt(win ? "SLEIGH'S AWAY!" : "SHIFT'S OVER", W / 2, py + 56, 50, win ? '#7dffb0' : '#ff6b6b');
    fitTxt(win ? 'You worked the whole night shift. Every sack made the sleigh by dawn.' : 'Christmas Cheer ran out at ' + clockStr() + '. The night crew takes over.', W / 2, py + 104, 19, '#fff', pw - 40, 'center', 'normal');
    const stars = S.final >= 16000 ? 3 : S.final >= 10000 ? 2 : S.final >= 5000 ? 1 : 0;
    for (let i = 0; i < 3; i++) { const sx = W / 2 + (i - 1) * 70; ctx.save(); if (i < stars) { ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18; } drawSym('star', sx, py + 160, 28, i < stars ? '#ffd166' : 'rgba(255,255,255,0.18)'); ctx.restore(); }
    const rank = stars === 3 ? 'HEAD OF NIGHT SHIFT' : stars === 2 ? 'SENIOR SORTER' : stars === 1 ? 'SEASONAL ELF' : 'TRAINEE';
    txt(rank, W / 2, py + 210, 20, '#ffd166');
    txt(String(S.final), W / 2, py + 262, 60, '#fff');
    if (S.newBest) txt('NEW BEST!', W / 2, py + 305, 22, '#7dffb0'); else txt('BEST  ' + best.score, W / 2, py + 305, 18, 'rgba(255,255,255,0.7)');
    const rows = [['Sacks loaded', S.loaded], ['Gifts sorted', S.stats.caught], ['Best combo', S.stats.maxCombo], ['Coal tossed', S.stats.zapped], ['Wrong sacks', S.stats.wrong], [win ? 'Dawn bonus' : 'Reached', win ? (500 + Math.round(S.cheer) * 5) : clockStr()]];
    let y = py + 350; for (const [k, v] of rows) { txt(k, px + 120, y, 19, 'rgba(255,255,255,0.8)', 'left', 'normal'); txt(String(v), px + pw - 120, y, 19, '#fff', 'right'); y += 30; }
    const bw = 240; const byy = py + ph - 80;
    button('again', 'PLAY AGAIN', W / 2 - bw - 10, byy, bw, 56, true, () => startGame({ tutorial: false }));
    button('title', 'TITLE', W / 2 + 10, byy, bw, 56, false, () => toTitle());
  }
  function toTitle() { screen = 'title'; SFX.bpm = 100; startGame({ demo: true, hour: 2, seed: 7 }); }

  // ---------------- render loop ----------------
  let last = performance.now(), acc = 0, frames = 0, fpsT = 0;
  UI.fps = 60;
  function frame(now) {
    let dt = Math.min(0.1, (now - last) / 1000); last = now; UI.wall += dt;
    frames++; fpsT += dt; if (fpsT >= 1) { UI.fps = frames / fpsT; frames = 0; fpsT = 0; }
    const running = screen === 'play' || screen === 'title' || (screen === 'over');
    if (running && S) {
      let sim = dt * UI.timeScale; if (S.overT >= 0) sim *= 0.45;
      acc += sim; let n = 0; while (acc >= DT && n < 2400) { update(DT); acc -= DT; n++; }
    }
    render(dt);
    requestAnimationFrame(frame);
  }
  function render(dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#070b18'; ctx.fillRect(0, 0, cv.width, cv.height);
    const k = scale * dpr; let sx = 0, sy = 0;
    if (S && S.shake > 0 && screen === 'play') { sx = (Math.random() - 0.5) * S.shake; sy = (Math.random() - 0.5) * S.shake; }
    ctx.setTransform(k, 0, 0, k, offX * dpr + sx * k, offY * dpr + sy * k);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    UI.buttons = [];
    const t = UI.wall;
    drawBackground(t); drawBelt(t); drawField(t); drawSacks(t);
    if (S && (screen === 'play' || screen === 'paused' || screen === 'over' || (screen === 'howto' && overlay === 'paused'))) {
      drawArrowBtn(L.arrowL, -1, t); drawArrowBtn(L.arrowRt, 1, t);
      drawHUD(t);
    }
    if (S) drawFX(t);
    if (S && S.launchT >= 0 && screen !== 'over') { const e = clamp(S.launchT / 2.6, 0, 1); drawSleigh(lerp(-200, W + 250, e), lerp(L.pf.top + 260, L.pf.top + 40, e) + Math.sin(e * 12) * 10, 170, S.loaded, t); txt("SLEIGH'S AWAY!", W / 2, L.pf.mouth - 60, 60, '#ffd166'); }
    if (S && S.overT >= 0 && screen !== 'over') txt("SHIFT'S OVER", W / 2, H * 0.42, 64, '#ff6b6b');
    if (S && screen === 'play') drawBanner();
    if (S && S.flash > 0) { ctx.globalAlpha = Math.min(0.35, S.flash); ctx.fillStyle = S.flashColor; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    drawSnowFront(dt);
    if (screen === 'title') drawTitle();
    else if (screen === 'howto') drawHowto();
    else if (screen === 'credits') drawCredits();
    else if (screen === 'paused') drawPaused();
    else if (screen === 'over') drawOver();
    ctx.restore();
  }

  // ---------------- input ----------------
  function toLogical(cx, cy) { const r = cv.getBoundingClientRect(); return { x: (cx - r.left - offX) / scale, y: (cy - r.top - offY) / scale }; }
  const drag = { on: false, id: null, ax: 0, moved: false, x0: 0, y0: 0 };
  function hitButton(p) { for (let i = UI.buttons.length - 1; i >= 0; i--) { const b = UI.buttons[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b; } return null; }
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); cv.focus(); SFX.init(); SFX.startMusic();
    const p = toLogical(e.clientX, e.clientY); UI.mouse = p;
    if (screen !== 'play') { const b = hitButton(p); if (b) { SFX.sfxPlay('click'); b.fn(); } return; }
    if (Math.hypot(p.x - L.pause.x, p.y - L.pause.y) < L.pause.r + 8) { screen = 'paused'; return; }
    if (Math.hypot(p.x - L.arrowL.x, p.y - L.arrowL.y) < L.arrowL.r + 10) { shift(-1); return; }
    if (Math.hypot(p.x - L.arrowRt.x, p.y - L.arrowRt.y) < L.arrowRt.r + 10) { shift(1); return; }
    if (zapAt(p.x, p.y)) return;
    drag.on = true; drag.id = e.pointerId; drag.ax = p.x; drag.x0 = p.x; drag.y0 = p.y; drag.moved = false;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
  });
  cv.addEventListener('pointermove', (e) => {
    const p = toLogical(e.clientX, e.clientY); UI.mouse = p;
    if (!drag.on || e.pointerId !== drag.id || screen !== 'play') return;
    const step = 56; while (Math.abs(p.x - drag.ax) >= step) { const d = Math.sign(p.x - drag.ax); shift(d); drag.ax += d * step; drag.moved = true; }
  });
  function endDrag(e) {
    if (!drag.on || e.pointerId !== drag.id) return; drag.on = false;
    const p = toLogical(e.clientX, e.clientY);
    if (!drag.moved && screen === 'play' && p.y > L.pf.mouth - 30 && p.x > L.pf.x - 20 && p.x < L.pf.x + L.pf.w + 20) shift(p.x < L.pf.x + L.pf.w / 2 ? -1 : 1);
  }
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', (e) => { drag.on = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    SFX.init(); SFX.startMusic();
    const k = e.code;
    if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'ArrowDown'].includes(k)) e.preventDefault();
    if (k === 'KeyM') { SFX.toggle(); return; }
    if (screen === 'play') {
      if (e.repeat && (k === 'ShiftLeft' || k === 'ShiftRight')) return;
      if (k === 'ArrowLeft' || k === 'KeyA' || k === 'ShiftLeft') shift(-1);
      else if (k === 'ArrowRight' || k === 'KeyD' || k === 'ShiftRight') shift(1);
      else if (k === 'Space') zapLowest();
      else if (k === 'KeyP' || k === 'Escape') screen = 'paused';
    } else if (screen === 'paused') {
      if (k === 'KeyP' || k === 'Escape' || k === 'Enter') screen = 'play';
    } else if (k === 'Enter' || k === 'Space') {
      const b = UI.buttons.find(x => x.primary); if (b) { SFX.sfxPlay('click'); b.fn(); }
    } else if (k === 'Escape' && (screen === 'howto' || screen === 'credits')) screen = overlay || 'title';
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') screen = 'paused'; });
  window.addEventListener('blur', () => { if (screen === 'play') screen = 'paused'; });
  window.addEventListener('resize', resize);

  // ---------------- test hook ----------------
  window.GAME = {
    get screen() { return screen; }, get S() { return S; }, get L() { return L; }, get fps() { return UI.fps; }, get best() { return best; },
    set timeScale(v) { UI.timeScale = v; }, get timeScale() { return UI.timeScale; },
    start(opts) { startGame(Object.assign({ tutorial: false }, opts || {})); if (opts && opts.bot) { S.bot = true; S.botDelay = opts.botDelay || 0.1; S.botMiss = opts.botMiss || 0; } return S.seed; },
    shift, zapLowest, toTitle,
    setBot(on, delay) { S.bot = on; if (delay) S.botDelay = delay; },
    fast(sec) { const n = Math.round(sec / DT); for (let i = 0; i < n && (screen === 'play'); i++) update(DT); return screen; },
    press(id) { const b = UI.buttons.find(x => x.id === id); if (!b) return false; b.fn(); return true; },
    buttonPage(id) { const b = UI.buttons.find(x => x.id === id); if (!b) return null; return this.page(b.x + b.w / 2, b.y + b.h / 2); },
    page(x, y) { const r = cv.getBoundingClientRect(); return [r.left + offX + x * scale, r.top + offY + y * scale]; },
    giftPage(kind) { const g = S.gifts.find(x => x.kind === kind); if (!g) return null; return this.page(colX(g.x), giftY(g)); },
    spawn(kind, col, color) { S.gifts.push({ id: gid++, kind, color: color == null ? S.slots[col].color : color, col, x: col, p: 0.5, fall: 3, rot: 0, spin: 0, lane: null }); },
    colors() { return S.slots.map(s => s.color); },
    get portrait() { return portrait; },
  };

  resize();
  toTitle();
  requestAnimationFrame(frame);
})();
