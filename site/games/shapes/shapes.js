/* SHAPES: a Cool Matt Games original, from an idea by Matt Jones.
   You are a dot. Fight other dots, level up, grow, and recruit a party.
   Two dots make a line, three a triangle, four a square, five a pentagon.
   Plain canvas for the scenes, plain DOM for the menus. Saves live in this browser. */
(function () {
  'use strict';

  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const panel = document.getElementById('panel');
  const CMG = window.CMG || { store() { return null; }, countPlay() {} };

  const VW = 480, VH = 320, MW = 1100, MH = 720, TAU = Math.PI * 2;
  const FONT = '"Trebuchet MS", "Lucida Grande", "Segoe UI", sans-serif';
  const SAVE_KEY = 'cmg:shapes:save', ACCT_KEY = 'cmg:account', MUTE_KEY = 'cmg:muted';
  const NGP_LEVELS = 28;

  /* ---------- data ---------- */
  const SHAPE = ['', 'Dot', 'Line', 'Triangle', 'Square', 'Pentagon'];
  const AREAS = [
    { name: 'Dot Central', shape: 1, lv: [1, 4], bg: '#ffe9a8', deco: '#ffd36b', ink: '#5e3f00', boss: { name: 'The Big Dot', lv: 5 } },
    { name: 'Linetown', shape: 2, lv: [5, 9], bg: '#e6f2ff', deco: '#b3d0ee', ink: '#173f69', boss: { name: 'Mayor Segment', lv: 10 } },
    { name: 'Trianglewood', shape: 3, lv: [10, 15], bg: '#d2efba', deco: '#58b043', ink: '#1a4a11', boss: { name: 'Old Man Isosceles', lv: 16 } },
    { name: 'Squaresville', shape: 4, lv: [16, 22], bg: '#e7e3f4', deco: '#b9b0e2', ink: '#2f2566', boss: { name: 'The Cube', lv: 23 } },
    { name: 'Dodecahedown Town', shape: 5, lv: [23, 30], bg: '#2a1f4d', deco: '#4a3c80', ink: '#f1eaff', boss: { name: 'The Dodecahedron', lv: 32 } }
  ];
  const CLASSES = {
    dot:     { label: 'Dot',     hp: [30, 9],    mp: [8, 2],    atk: [7, 2.2], def: [4, 1.6], spd: [6, 1.0] },
    dash:    { label: 'Striker', hp: [24, 7],    mp: [8, 2.2],  atk: [8, 2.4], def: [3, 1.2], spd: [9, 1.5] },
    vertex:  { label: 'Mender',  hp: [26, 7.5],  mp: [14, 3.2], atk: [5, 1.6], def: [4, 1.5], spd: [6, 1.1] },
    radius:  { label: 'Guard',   hp: [40, 12],   mp: [6, 1.6],  atk: [6, 1.9], def: [7, 2.3], spd: [4, 0.8] },
    tangent: { label: 'Caster',  hp: [22, 6.5],  mp: [16, 3.5], atk: [9, 2.6], def: [3, 1.1], spd: [7, 1.2] }
  };
  const SKILLS = {
    bold:    { n: 'Bold', mp: 3, lv: 3, t: 'enemy', pow: 1.7, d: 'A heavier hit.' },
    ellipsis:{ n: 'Ellipsis', mp: 6, lv: 8, t: 'random', hits: 3, pow: 0.95, d: 'Three hits on random enemies.' },
    period:  { n: 'Period.', mp: 10, lv: 15, t: 'enemy', pow: 2.8, d: 'End of sentence.' },
    quick:   { n: 'Quick Stroke', mp: 2, lv: 1, t: 'enemy', pow: 1.3, d: 'A fast jab.' },
    hyphen:  { n: 'Hyphenate', mp: 5, lv: 7, t: 'random', hits: 2, pow: 1.25, d: 'Two hits on random enemies.' },
    emdash:  { n: 'Em Dash', mp: 9, lv: 14, t: 'enemy', pow: 2.0, pierce: true, d: 'Cuts straight through defense.' },
    mend:    { n: 'Mend', mp: 4, lv: 1, t: 'ally', heal: 0.45, d: 'Heal one ally.' },
    common:  { n: 'Common Ground', mp: 9, lv: 12, t: 'allies', heal: 0.3, d: 'Heal the whole party.' },
    redraft: { n: 'Second Draft', mp: 12, lv: 16, t: 'downed', revive: 0.5, d: 'Bring back a downed ally.' },
    obtuse:  { n: 'Obtuse', mp: 3, lv: 1, t: 'self', taunt: 3, defUp: 3, d: 'Enemies target you. Defense up.' },
    right:   { n: 'Right Angle', mp: 5, lv: 10, t: 'enemy', pow: 1.5, stun: 0.5, d: 'A hard hit that may stun.' },
    circum:  { n: 'Circumference', mp: 8, lv: 18, t: 'allies', defUp: 3, d: 'Defense up for the whole party.' },
    scatter: { n: 'Scatter Plot', mp: 6, lv: 1, t: 'all', pow: 0.95, d: 'Hits every enemy.' },
    bisect:  { n: 'Bisect', mp: 5, lv: 9, t: 'enemy', pow: 1.0, defDown: 3, d: 'A hit that cuts defense.' },
    asym:    { n: 'Asymptote', mp: 12, lv: 20, t: 'enemy', pow: 3.0, d: 'Approaches infinite damage.' }
  };
  const CLASS_SKILLS = {
    dot: ['bold', 'ellipsis', 'period'], dash: ['quick', 'hyphen', 'emdash'], vertex: ['mend', 'common', 'redraft'],
    radius: ['obtuse', 'right', 'circum'], tangent: ['scatter', 'bisect', 'asym']
  };
  const RECRUITS = [
    { id: 'dash', name: 'Dash', cls: 'dash', color: '#ffc928' },
    { id: 'vertex', name: 'Vertex', cls: 'vertex', color: '#5fd235' },
    { id: 'radius', name: 'Radius', cls: 'radius', color: '#39b8f2' },
    { id: 'tangent', name: 'Tangent', cls: 'tangent', color: '#b06cf0' }
  ];
  const SHAPE_MOVES = [null,
    { n: 'Full Stop', pow: 2.2, one: true, stun: 1, d: 'One huge hit that stuns.' },
    { n: 'Line Drive', pow: 2.0, d: 'Hits every enemy.' },
    { n: 'Triangulate', pow: 2.2, defDown: 3, d: 'Hits every enemy and cuts defense.' },
    { n: 'Square Deal', pow: 2.4, heal: 0.3, d: 'Hits every enemy and heals the party.' },
    { n: 'High Five', pow: 2.8, heal: 0.4, revive: 0.3, d: 'Hits every enemy, heals and revives the party.' }
  ];
  const KINDS = {
    red:    { n: 'Red', c: '#ff5a5f', hp: 1.0, atk: 1.25, def: 0.9, spd: 1.0 },
    blue:   { n: 'Blue', c: '#39b8f2', hp: 1.5, atk: 0.85, def: 1.4, spd: 0.7 },
    yellow: { n: 'Yellow', c: '#ffc928', hp: 0.75, atk: 1.0, def: 0.7, spd: 1.6 },
    green:  { n: 'Green', c: '#5fd235', hp: 0.9, atk: 0.7, def: 1.0, spd: 1.0, heals: true },
    purple: { n: 'Purple', c: '#b06cf0', hp: 0.85, atk: 1.05, def: 0.85, spd: 1.1, hexes: true }
  };
  const ITEMS = {
    potion: { n: 'Potion', d: 'Restores a good chunk of HP.', price: 20 },
    ether:  { n: 'Ether', d: 'Restores a good chunk of MP.', price: 35 },
    revive: { n: 'Revive', d: 'Gets a downed ally back up.', price: 80 }
  };
  const HERO_COLOR = '#ff5a5f';

  /* ---------- small helpers ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const irand = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  let fastMode = false, testMode = false;
  const sleep = (ms) => (testMode ? Promise.resolve() : new Promise((r) => setTimeout(r, fastMode ? ms * 0.45 : ms)));

  /* ---------- sound ---------- */
  let ac = null, muted = CMG.store(MUTE_KEY) === '1';
  function wake() {
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) { try { ac = new AC(); } catch (e) { ac = null; } } }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted || !ac || testMode) return;
    const at = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(vol || 0.08, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(at); o.stop(at + dur + 0.03);
  }
  const sfx = {
    hit() { tone(220, 0.09, 'square', 0.07, 110); },
    crit() { tone(330, 0.07, 'square', 0.08, 660); tone(180, 0.14, 'sawtooth', 0.07, 80, 0.06); },
    heal() { tone(523, 0.1, 'sine', 0.1, 784); tone(784, 0.14, 'sine', 0.09, 1047, 0.09); },
    buff() { tone(392, 0.1, 'triangle', 0.09, 523); },
    down() { tone(196, 0.3, 'sawtooth', 0.07, 60); },
    shape() { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.07, 0, i * 0.06)); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.07, 0, i * 0.11)); },
    level() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.14, 'triangle', 0.1, 0, i * 0.09)); },
    lose() { [330, 262, 220, 165].forEach((f, i) => tone(f, 0.24, 'triangle', 0.09, 0, i * 0.16)); },
    step() { tone(140, 0.03, 'triangle', 0.03); },
    click() { tone(660, 0.04, 'square', 0.04); },
    start() { tone(262, 0.08, 'square', 0.07, 523); tone(523, 0.16, 'square', 0.07, 1047, 0.08); }
  };

  /* ---------- save data ---------- */
  let account = null;   // { name, since }
  let S = null;         // the save

  function loadJSON(key) { try { return JSON.parse(CMG.store(key) || 'null'); } catch (e) { return null; } }
  function validSave(o) {
    return !!(o && o.v === 1 && Array.isArray(o.party) && o.party.length >= 1 && o.party.length <= 5 &&
      typeof o.area === 'number' && AREAS[o.area] && o.items && Array.isArray(o.boss) &&
      o.party.every((m) => m && CLASSES[m.cls] && typeof m.lv === 'number' && m.lv >= 1));
  }
  // Saves can arrive as pasted codes, so every field is forced back into a sane range before use.
  function normalize(o) {
    const int = (v, lo, hi) => clamp(Math.floor(+v) || 0, lo, hi);
    o.area = int(o.area, 0, 4); o.maxArea = int(o.maxArea, o.area, 4);
    o.gold = int(o.gold, 0, 99999999); o.ngp = int(o.ngp, 0, 999); o.wins = int(o.wins, 0, 99999999);
    o.meter = clamp(+o.meter || 0, 0, 100); o.time = Math.max(0, +o.time || 0); o.fast = !!o.fast;
    o.x = clamp(+o.x || 220, 16, MW - 16); o.y = clamp(+o.y || 380, 16, MH - 16);
    o.items = { potion: int(o.items.potion, 0, 999), ether: int(o.items.ether, 0, 999), revive: int(o.items.revive, 0, 999) };
    o.boss = [0, 1, 2, 3, 4].map((i) => !!o.boss[i]);
    o.party.forEach((m, i) => {
      m.id = i === 0 ? 'hero' : String(m.id || m.cls);
      m.name = String(m.name || 'Dot').replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12) || 'Dot';
      m.color = /^#[0-9a-fA-F]{6}$/.test(m.color) ? m.color : HERO_COLOR;
      m.lv = int(m.lv, 1, 99); m.xp = int(m.xp, 0, 99999999); m.w = int(m.w, 0, 9999); m.a = int(m.a, 0, 9999);
      m.hp = int(m.hp, 0, maxHp(m)); m.mp = int(m.mp, 0, maxMp(m));
    });
    return o;
  }
  function save() { if (S) { S.savedAt = Date.now(); CMG.store(SAVE_KEY, JSON.stringify(S)); } }
  function saveCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function readCode(code) {
    try { const o = JSON.parse(decodeURIComponent(escape(atob(String(code).trim())))); return validSave(o) ? normalize(o) : null; }
    catch (e) { return null; }
  }

  function mkMember(id, name, cls, color, lv) {
    const m = { id, name, cls, color, lv, xp: 0, hp: 1, mp: 0, w: 0, a: 0 };
    m.hp = maxHp(m); m.mp = maxMp(m);
    return m;
  }
  function newGame() {
    S = { v: 1, area: 0, maxArea: 0, x: 220, y: 380, gold: 30, items: { potion: 3, ether: 1, revive: 0 },
          party: [mkMember('hero', account.name, 'dot', HERO_COLOR, 1)], boss: [false, false, false, false, false],
          ngp: 0, meter: 0, time: 0, wins: 0, fast: false };
    save();
  }

  /* ---------- stats ---------- */
  function base(m, k) { const c = CLASSES[m.cls][k]; return Math.floor(c[0] + c[1] * (m.lv - 1)); }
  function maxHp(m) { return base(m, 'hp'); }
  function maxMp(m) { return base(m, 'mp'); }
  function xpNeed(lv) { return Math.floor(18 * Math.pow(lv, 1.55)); }
  function gearCap() { return (S.maxArea + 1) * 2 + S.ngp * 2; }
  function gearCost(tier) { return Math.round(30 * Math.pow(tier + 1, 1.8)); }
  function knows(m) { return CLASS_SKILLS[m.cls].filter((id) => m.lv >= SKILLS[id].lv); }
  function heroR(m) { return 6 + Math.min(11, m.lv * 0.32); }
  function shapeName() { return SHAPE[S.party.length]; }

  function gainXp(m, xp) {
    let ups = 0;
    m.xp += xp;
    while (m.lv < 99 && m.xp >= xpNeed(m.lv)) { m.xp -= xpNeed(m.lv); m.lv++; ups++; }
    if (ups) { m.hp = maxHp(m); m.mp = maxMp(m); }
    return ups;
  }

  /* ---------- panel plumbing ---------- */
  let handlers = {};
  function ui(html, h) {
    const had = panel.contains(document.activeElement);
    panel.innerHTML = html;
    handlers = h || {};
    if (had) { const f = panel.querySelector('button:not([disabled]), input, textarea'); if (f) f.focus({ preventScroll: true }); }
  }
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    wake(); sfx.click();
    const fn = handlers[b.dataset.a];
    if (fn) fn(b.dataset.v, b);
  });
  function btn(a, label, o) {
    o = o || {};
    return '<button type="button" class="shp-btn' + (o.cls ? ' ' + o.cls : '') + '" data-a="' + a + '"' +
      (o.v !== undefined ? ' data-v="' + esc(o.v) + '"' : '') + (o.off ? ' disabled' : '') + '>' + label + '</button>';
  }
  function bar(cur, max, cls) {
    const pct = max > 0 ? clamp(Math.round(cur / max * 100), 0, 100) : 0;
    return '<span class="shp-bar ' + (cls || '') + '"><i style="width:' + pct + '%"></i><b>' + Math.max(0, Math.round(cur)) + '/' + max + '</b></span>';
  }
  function partyRows() {
    return '<div class="shp-rows">' + S.party.map((m) =>
      '<div class="shp-row' + (m.hp <= 0 ? ' down' : '') + '"><span class="shp-name"><i style="background:' + m.color + '"></i>' + esc(m.name) +
      ' <small>Lv ' + m.lv + '</small></span>' + bar(m.hp, maxHp(m), 'hp') + bar(m.mp, maxMp(m), 'mp') + '</div>').join('') + '</div>';
  }
  const head = (title, sub) => '<div class="shp-head"><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>';
  const log = (text) => '<p class="shp-log" aria-live="polite">' + text + '</p>';
  const cmds = (list) => '<div class="shp-cmds">' + list.join('') + '</div>';

  /* ---------- title and account ---------- */
  let mode = 'title';   // title | world | menu | battle

  function titleScreen() {
    mode = 'title';
    const saved = loadJSON(SAVE_KEY), has = validSave(saved);
    if (!account) {
      ui(head('Create your Cool Matt account', 'Pick a name. Your account and your save live in this browser. There is no password and no email, and nothing is sent anywhere.') +
        '<form class="shp-form" id="acct-form"><label for="acct-name">Name</label><input class="shp-input" id="acct-name" maxlength="12" autocomplete="off" spellcheck="false" required>' +
        '<button type="submit" class="shp-btn">Create account</button></form><p class="shp-note" id="acct-err" role="alert"></p>', {});
      document.getElementById('acct-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('acct-name').value.replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 12);
        if (!name) { document.getElementById('acct-err').textContent = 'Use 1 to 12 letters or numbers.'; return; }
        account = { name, since: Date.now() };
        CMG.store(ACCT_KEY, JSON.stringify(account));
        wake(); sfx.start(); titleScreen();
      });
      return;
    }
    const line = has
      ? esc(saved.party[0].name) + ', level ' + saved.party[0].lv + ' ' + SHAPE[saved.party.length] + ' in ' + AREAS[saved.area].name + '.'
      : 'No saved game yet.';
    ui(head('Signed in as ' + esc(account.name), line) + cmds([
      has ? btn('cont', 'Continue') : '',
      btn('new', has ? 'New game' : 'Start game', has ? { cls: 'alt' } : {}),
      btn('code', 'Load a save code', { cls: 'alt' })
    ]) + '<p class="shp-note">Your progress saves by itself after every battle.</p>', {
      cont() { S = normalize(saved); enterWorld(true); },
      new() {
        if (!has) { newGame(); CMG.countPlay(); enterWorld(true); return; }
        ui(head('Start over?', 'This replaces your saved game: ' + line) + cmds([btn('yes', 'Yes, start over', { cls: 'danger' }), btn('no', 'Keep my save', { cls: 'alt' })]),
          { yes() { newGame(); CMG.countPlay(); enterWorld(true); }, no: titleScreen });
      },
      code() { codeScreen(titleScreen); }
    });
  }

  function codeScreen(back) {
    ui(head('Load a save code', 'Paste a code you copied from the Account screen on another device.') +
      '<textarea class="shp-input" id="code-in" rows="3" spellcheck="false" aria-label="Save code"></textarea>' +
      cmds([btn('load', 'Load this code'), btn('back', 'Back', { cls: 'alt' })]) + '<p class="shp-note" id="code-err" role="alert"></p>', {
      load() {
        const o = readCode(document.getElementById('code-in').value);
        if (!o) { document.getElementById('code-err').textContent = "That code didn't work. Copy the whole thing and try again."; return; }
        S = o; save(); enterWorld(true);
      },
      back
    });
  }

  /* ---------- world ---------- */
  let world = null, dest = null, rot = 0, grace = 0, saveClock = 0, stepClock = 0;
  const keys = {};

  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function buildWorld(i) {
    const A = AREAS[i], r = seeded(1000 + i * 77), deco = [];
    for (let n = 0; n < 110; n++) deco.push({ x: r() * MW, y: r() * MH, s: 5 + r() * 13, a: r() * TAU });
    const spots = [
      { id: 'inn', x: 150, y: 300, r: 30, label: 'Inn' },
      { id: 'shop', x: 290, y: 300, r: 30, label: 'Shop' }
    ];
    if (i > 0) spots.push({ id: 'back', x: 36, y: 380, r: 28, label: 'To ' + AREAS[i - 1].name });
    if (i < AREAS.length - 1) spots.push({ id: 'next', x: MW - 36, y: 380, r: 28, label: 'To ' + AREAS[i + 1].name });
    if (!S.boss[i]) spots.push({ id: 'boss', x: MW - 180, y: 380, r: 44, label: A.boss.name });
    spots.forEach((s) => { s.armed = dist(S, s) > s.r + 6; });
    const en = [];
    for (let n = 0; n < 8; n++) en.push(spawnEnemy(i, {}));
    world = { i, A, deco, spots, en };
  }
  function spawnEnemy(i, e) {
    const A = AREAS[i];
    do { e.x = rand(400, MW - 60); e.y = rand(50, MH - 50); } while (Math.hypot(e.x - (MW - 180), e.y - 380) < 110 || (S && dist(e, S) < 140));
    e.kind = pick(i === 0 ? ['red', 'red', 'blue', 'yellow'] : ['red', 'blue', 'yellow', 'green', 'purple']);
    // Enemies get tougher the further east you walk, so the edge of town is a safe place to start.
    const east = clamp((e.x - 400) / (MW - 520), 0, 1);
    e.lv = clamp(Math.round(A.lv[0] + (A.lv[1] - A.lv[0]) * east + rand(-0.7, 0.7)), A.lv[0], A.lv[1]) + S.ngp * NGP_LEVELS;
    e.t = 0; e.dx = 0; e.dy = 0; e.dead = 0; e.r = 13;
    return e;
  }

  function enterWorld(fresh) {
    S.maxArea = Math.max(S.maxArea || 0, S.area);
    fastMode = !!S.fast;
    buildWorld(S.area);
    dest = null; grace = 1.2;
    mode = 'world';
    worldPanel(fresh ? 'Welcome to ' + world.A.name + '. Walk into things to use them.' : null);
  }

  function worldPanel(msg) {
    const A = AREAS[S.area];
    const goal = S.boss[S.area]
      ? (S.area < 4 ? 'The gate to ' + AREAS[S.area + 1].name + ' is open, on the east side.' : 'The Dodecahedron is down. Keep training, or start New Game Plus from the Account screen.')
      : 'Beat ' + A.boss.name + ' on the east side. Level ' + (A.boss.lv + S.ngp * NGP_LEVELS) + ' is a fair fight.';
    ui(log(msg || goal) + partyRows() + cmds([
      btn('party', 'Party', { cls: 'alt' }), btn('items', 'Items', { cls: 'alt' }), btn('acct', 'Account', { cls: 'alt' }),
      btn('snd', muted ? 'Sound: off' : 'Sound: on', { cls: 'alt' })
    ]) + '<p class="shp-note">' + esc(A.name) + '. You are a ' + shapeName() + ' with ' + S.gold + ' gold. Tap where you want to go, or use the arrow keys.</p>', {
      party: partyScreen, items() { itemScreen(null); }, acct: accountScreen,
      snd() { muted = !muted; CMG.store(MUTE_KEY, muted ? '1' : '0'); worldPanel(msg); }
    });
  }
  function backToWorld(msg) { mode = 'world'; grace = 0.6; world.spots.forEach((s) => { if (dist(S, s) <= s.r + 6) s.armed = false; }); worldPanel(msg); }

  function updateWorld(dt) {
    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (dx || dy) dest = null;
    else if (dest) { dx = dest.x - S.x; dy = dest.y - S.y; if (Math.hypot(dx, dy) < 4) { dest = null; dx = dy = 0; } }
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      S.x = clamp(S.x + dx / d * 118 * dt, 16, MW - 16);
      S.y = clamp(S.y + dy / d * 118 * dt, 16, MH - 16);
      stepClock += dt; if (stepClock > 0.28) { stepClock = 0; sfx.step(); }
    }
    rot += dt * 0.9; grace -= dt; S.time += dt;
    saveClock += dt; if (saveClock > 30) { saveClock = 0; save(); }

    const pr = heroR(S.party[0]) + (S.party.length > 1 ? 8 + S.party.length * 2 : 0);
    for (const e of world.en) {
      if (e.dead > 0) { e.dead -= dt; if (e.dead <= 0) spawnEnemy(world.i, e); continue; }
      e.t -= dt;
      if (e.t <= 0) { const a = rand(0, TAU), sp = Math.random() < 0.3 ? 0 : rand(18, 40); e.dx = Math.cos(a) * sp; e.dy = Math.sin(a) * sp; e.t = rand(1, 3); }
      e.x = clamp(e.x + e.dx * dt, 380, MW - 30); e.y = clamp(e.y + e.dy * dt, 30, MH - 30);
      if (grace <= 0 && Math.hypot(e.x - S.x, e.y - S.y) < e.r + pr) { encounter(e); return; }
    }
    for (const s of world.spots) {
      const near = dist(S, s) <= s.r;
      if (near && s.armed && grace <= 0) { s.armed = false; dest = null; useSpot(s); return; }
      if (!near && dist(S, s) > s.r + 6) s.armed = true;
    }
  }

  function useSpot(s) {
    if (s.id === 'inn') innScreen();
    else if (s.id === 'shop') shopScreen();
    else if (s.id === 'boss') bossScreen();
    else if (s.id === 'back') { S.area--; S.x = MW - 110; S.y = 380; save(); enterWorld(true); }
    else if (s.id === 'next') {
      if (!S.boss[S.area]) { mode = 'menu'; ui(head('The gate is shut', 'Only a ' + SHAPE[S.area + 2] + ' may pass. Beat ' + AREAS[S.area].boss.name + ' first.') + cmds([btn('ok', 'Back')]), { ok() { backToWorld(); } }); return; }
      S.area++; S.x = 110; S.y = 380; save(); enterWorld(true);
    }
  }

  /* ---------- town screens ---------- */
  function innScreen() {
    mode = 'menu';
    const cost = 8 * (S.area + 1) * (1 + S.ngp);
    ui(head('Inn', 'A full rest for the whole party costs ' + cost + ' gold. You have ' + S.gold + '.') + partyRows() +
      cmds([btn('rest', 'Rest here', { off: S.gold < cost }), btn('leave', 'Leave', { cls: 'alt' })]), {
      rest() { S.gold -= cost; S.party.forEach((m) => { m.hp = maxHp(m); m.mp = maxMp(m); }); sfx.heal(); save(); backToWorld('Everyone is rested.'); },
      leave() { backToWorld(); }
    });
  }

  function priceOf(id) { return Math.round(ITEMS[id].price * (1 + S.area * 0.6) * (1 + S.ngp)); }
  function shopScreen(msg) {
    mode = 'menu';
    const cap = gearCap();
    const items = Object.keys(ITEMS).map((id) =>
      '<div class="shp-item"><span><strong>' + ITEMS[id].n + '</strong> x' + S.items[id] + '<small>' + ITEMS[id].d + '</small></span>' +
      btn('buy', priceOf(id) + ' g', { v: id, off: S.gold < priceOf(id) }) + '</div>').join('');
    const gear = S.party.map((m, i) => {
      const wc = gearCost(m.w), acost = gearCost(m.a);
      return '<div class="shp-item"><span><strong>' + esc(m.name) + '</strong><small>Point +' + m.w + ', Outline +' + m.a + '</small></span><span class="shp-pair">' +
        btn('w', m.w >= cap ? 'Point max' : 'Point ' + wc + ' g', { v: i, off: m.w >= cap || S.gold < wc }) +
        btn('a', m.a >= cap ? 'Outline max' : 'Outline ' + acost + ' g', { v: i, off: m.a >= cap || S.gold < acost }) + '</span></div>';
    }).join('');
    ui(head('Shop', (msg ? msg + ' ' : '') + 'You have ' + S.gold + ' gold. A sharper Point adds attack. A thicker Outline adds defense.') +
      '<div class="shp-list">' + items + gear + '</div>' + cmds([btn('leave', 'Leave', { cls: 'alt' })]), {
      buy(id) { S.gold -= priceOf(id); S.items[id]++; save(); shopScreen('Bought a ' + ITEMS[id].n + '.'); },
      w(i) { const m = S.party[i]; S.gold -= gearCost(m.w); m.w++; save(); shopScreen(esc(m.name) + "'s Point is sharper."); },
      a(i) { const m = S.party[i]; S.gold -= gearCost(m.a); m.a++; save(); shopScreen(esc(m.name) + "'s Outline is thicker."); },
      leave() { backToWorld(); }
    });
  }

  function bossScreen() {
    mode = 'menu';
    const A = AREAS[S.area], lv = A.boss.lv + S.ngp * NGP_LEVELS;
    ui(head(A.boss.name, 'Level ' + lv + '. Your ' + shapeName() + ' is led by a level ' + S.party[0].lv + ' dot. You cannot run from this fight.') +
      cmds([btn('fight', 'Fight'), btn('no', 'Not yet', { cls: 'alt' })]), {
      fight() {
        const group = [mkEnemy(S.area, lv, 'red', true)];
        for (let n = 0; n < Math.min(2, S.area); n++) group.push(mkEnemy(S.area, lv - 3, pick(['blue', 'green', 'purple']), false));
        runBattle(group, true, null);
      },
      no() { backToWorld(); }
    });
  }

  function partyScreen() {
    mode = 'menu';
    const cards = S.party.map((m) => {
      const sk = CLASS_SKILLS[m.cls].map((id) => (m.lv >= SKILLS[id].lv ? SKILLS[id].n : SKILLS[id].n + ' (Lv ' + SKILLS[id].lv + ')')).join(', ');
      return '<div class="shp-item col"><span><strong><i class="shp-chip" style="background:' + m.color + '"></i>' + esc(m.name) + '</strong> ' + CLASSES[m.cls].label + ', level ' + m.lv +
        '<small>HP ' + Math.max(0, m.hp) + '/' + maxHp(m) + ', MP ' + m.mp + '/' + maxMp(m) + ', Attack ' + (base(m, 'atk') + m.w * 3) + ', Defense ' + Math.round(base(m, 'def') + m.a * 2.5) + ', Speed ' + base(m, 'spd') +
        '. Next level in ' + (xpNeed(m.lv) - m.xp) + ' XP.</small><small>Skills: ' + sk + '</small></span></div>';
    }).join('');
    const move = SHAPE_MOVES[S.party.length];
    ui(head('Party: ' + shapeName(), 'Shape move: ' + move.n + '. ' + move.d + ' It charges as you give and take hits (' + Math.floor(S.meter) + '%).') +
      '<div class="shp-list">' + cards + '</div>' + cmds([btn('back', 'Back', { cls: 'alt' })]), { back() { backToWorld(); } });
  }

  function applyItem(id, m) {
    if (id === 'potion') { if (m.hp <= 0 || m.hp >= maxHp(m)) return false; m.hp = Math.min(maxHp(m), m.hp + Math.round(maxHp(m) * 0.4) + 20); }
    else if (id === 'ether') { if (m.hp <= 0 || m.mp >= maxMp(m)) return false; m.mp = Math.min(maxMp(m), m.mp + Math.round(maxMp(m) * 0.4) + 8); }
    else if (id === 'revive') { if (m.hp > 0) return false; m.hp = Math.round(maxHp(m) * 0.4); }
    S.items[id]--; return true;
  }
  function itemScreen(msg) {
    mode = 'menu';
    const rows = Object.keys(ITEMS).map((id) => '<div class="shp-item"><span><strong>' + ITEMS[id].n + '</strong> x' + S.items[id] + '<small>' + ITEMS[id].d + '</small></span><span class="shp-pair">' +
      S.party.map((m, i) => btn('use', esc(m.name), { v: id + ':' + i, off: S.items[id] < 1 })).join('') + '</span></div>').join('');
    ui(head('Items', msg || 'Pick who gets it.') + partyRows() + '<div class="shp-list">' + rows + '</div>' + cmds([btn('back', 'Back', { cls: 'alt' })]), {
      use(v) {
        const parts = v.split(':'), m = S.party[+parts[1]];
        if (applyItem(parts[0], m)) { sfx.heal(); save(); itemScreen(ITEMS[parts[0]].n + ' used on ' + esc(m.name) + '.'); }
        else itemScreen(esc(m.name) + " doesn't need that right now.");
      },
      back() { backToWorld(); }
    });
  }

  function accountScreen(msg) {
    mode = 'menu';
    const mins = Math.floor(S.time / 60), canNgp = S.boss[4];
    ui(head('Account: ' + esc(account.name), msg || ('Played ' + (mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min' : mins + ' min') + ', ' + S.wins + ' battles won' + (S.ngp ? ', New Game Plus ' + S.ngp : '') + '. Saved in this browser.')) +
      '<label class="shp-note" for="code-out">Save code. Copy it to move your game to another device.</label>' +
      '<textarea class="shp-input" id="code-out" rows="2" readonly>' + saveCode() + '</textarea>' +
      cmds([
        btn('copy', 'Copy save code'), btn('speed', S.fast ? 'Battle speed: fast' : 'Battle speed: normal', { cls: 'alt' }),
        canNgp ? btn('ngp', 'Start New Game Plus') : '',
        btn('title', 'Save and quit to title', { cls: 'alt' }), btn('back', 'Back', { cls: 'alt' })
      ]), {
      copy() {
        const t = document.getElementById('code-out'); t.focus(); t.select();
        const done = () => accountScreen('Save code copied.');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, () => accountScreen('Select the code and copy it by hand.'));
        else { try { document.execCommand('copy'); done(); } catch (e) { accountScreen('Select the code and copy it by hand.'); } }
      },
      speed() { S.fast = !S.fast; fastMode = S.fast; save(); accountScreen(); },
      ngp() {
        ui(head('New Game Plus', 'You keep your party, levels, gear and gold. The world starts over at Dot Central and every enemy is ' + NGP_LEVELS + ' levels tougher.') +
          cmds([btn('yes', 'Go around again'), btn('no', 'Not yet', { cls: 'alt' })]), {
          yes() { S.ngp++; S.boss = [false, false, false, false, false]; S.area = 0; S.x = 220; S.y = 380; save(); enterWorld(true); },
          no() { accountScreen(); }
        });
      },
      title() { save(); titleScreen(); },
      back() { backToWorld(); }
    });
  }

  /* ---------- battle ---------- */
  let B = null;

  function mkEnemy(area, lv, kind, boss) {
    const k = KINDS[kind], A = AREAS[area];
    let hp = (10 + 7 * lv) * k.hp, atk = (3 + 1.9 * lv) * k.atk, def = (1 + 1.3 * lv) * k.def;
    if (boss) { hp *= 2.3 + area * 1.05; atk *= area === 0 ? 1.0 : 1.12; def *= 1.1; }
    hp = Math.round(hp);
    return { side: 'e', name: boss ? A.boss.name : k.n + ' ' + SHAPE[A.shape], kind, color: k.c, lv, hp, max: hp, atk, def, spd: (5 + lv) * k.spd,
             boss: !!boss, n: A.shape, st: {}, off: 0, flash: 0, turns: 0 };
  }
  const alive = (c) => (c.side === 'p' ? c.m.hp > 0 : c.hp > 0);
  const cname = (c) => (c.side === 'p' ? esc(c.m.name) : c.name);
  const hpOf = (c) => (c.side === 'p' ? c.m.hp : c.hp);
  const maxOf = (c) => (c.side === 'p' ? maxHp(c.m) : c.max);
  function setHp(c, v) { v = clamp(Math.round(v), 0, maxOf(c)); if (c.side === 'p') c.m.hp = v; else c.hp = v; }
  function atkOf(c) { return c.side === 'p' ? base(c.m, 'atk') + c.m.w * 3 : c.atk; }
  function defOf(c) {
    const d = c.side === 'p' ? base(c.m, 'def') + c.m.a * 2.5 : c.def;
    return d * (c.st.defUp ? 1.5 : 1) * (c.st.defDown ? 0.6 : 1);
  }
  function spdOf(c) { return c.side === 'p' ? base(c.m, 'spd') : c.spd; }
  function fx(c, str, color) { if (B) B.fx.push({ x: c.x + rand(-8, 8), y: c.y - 24, str, color: color || '#fff', life: 0.9 }); }
  function charge(n) { S.meter = clamp(S.meter + n, 0, 100); }

  function hit(att, tgt, pow, o) {
    o = o || {};
    let dmg = atkOf(att) * pow * rand(0.88, 1.12) * 100 / (100 + (o.pierce ? 0 : defOf(tgt)) * 2.5);
    const crit = Math.random() < 0.08;
    if (crit) dmg *= 1.6;
    if (tgt.st.guard) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg));
    setHp(tgt, hpOf(tgt) - dmg);
    tgt.flash = 1;
    fx(tgt, (crit ? 'Crit ' : '') + dmg, crit ? '#ffd23f' : '#fff');
    if (crit) sfx.crit(); else sfx.hit();
    if (!o.noCharge) charge(att.side === 'p' ? 7 : 10);
    if (!alive(tgt)) { tgt.st = {}; sfx.down(); }
    return dmg;
  }
  function heal(tgt, frac) {
    const amt = Math.round(maxOf(tgt) * frac) + 4;
    setHp(tgt, hpOf(tgt) + amt); fx(tgt, '+' + amt, '#9dff7a');
    return amt;
  }

  function battleHead(text) { return log(text) + partyRows() + '<p class="shp-meter"><span class="shp-bar sh"><i style="width:' + Math.floor(S.meter) + '%"></i><b>Shape ' + Math.floor(S.meter) + '%</b></span></p>'; }
  function show(text) { ui(battleHead(text), {}); }

  function pickTarget(list, prompt, back) {
    return new Promise((resolve) => {
      if (list.length === 1) { resolve(list[0]); return; }
      B.pick = (c) => { if (list.indexOf(c) >= 0) { B.pick = null; resolve(c); } };
      ui(battleHead(prompt) + cmds(list.map((c, i) => btn('t', cname(c) + ' <small>' + hpOf(c) + ' HP</small>', { v: i })).concat([btn('back', 'Back', { cls: 'alt' })])), {
        t(i) { B.pick = null; resolve(list[+i]); },
        back() { B.pick = null; resolve(null); back(); }
      });
    });
  }

  function choose(c) {
    return new Promise((resolve) => {
      const m = c.m, foes = () => B.en.filter(alive), pals = () => B.pa.filter(alive);
      const move = SHAPE_MOVES[S.party.length];
      const root = () => {
        B.pick = null;
        ui(battleHead(esc(m.name) + "'s turn.") + cmds([
          btn('attack', 'Attack'), btn('skills', 'Skills', { off: !knows(m).length }),
          btn('guard', 'Guard', { cls: 'alt' }), btn('items', 'Items', { cls: 'alt' }),
          btn('shape', move.n, { cls: 'special', off: S.meter < 100 }), btn('flee', 'Run', { cls: 'alt', off: B.boss })
        ]), {
          async attack() { const t = await pickTarget(foes(), 'Attack which one?', root); if (t) resolve({ type: 'attack', target: t }); },
          skills() {
            ui(battleHead(esc(m.name) + ' has ' + m.mp + ' MP.') + cmds(knows(m).map((id) =>
              btn('sk', SKILLS[id].n + ' <small>' + SKILLS[id].mp + ' MP. ' + SKILLS[id].d + '</small>', { v: id, off: m.mp < SKILLS[id].mp })).concat([btn('back', 'Back', { cls: 'alt' })])), {
              async sk(id) {
                const sk = SKILLS[id]; let t = null;
                if (sk.t === 'enemy') { t = await pickTarget(foes(), sk.n + ' on which one?', root); if (!t) return; }
                else if (sk.t === 'ally') { t = await pickTarget(pals(), sk.n + ' on who?', root); if (!t) return; }
                else if (sk.t === 'downed') {
                  const downed = B.pa.filter((p) => !alive(p));
                  if (!downed.length) { show('Nobody is down.'); await sleep(700); root(); return; }
                  t = await pickTarget(downed, 'Bring back who?', root); if (!t) return;
                }
                resolve({ type: 'skill', id, target: t });
              },
              back: root
            });
          },
          guard() { resolve({ type: 'guard' }); },
          items() {
            ui(battleHead('Use which item?') + cmds(Object.keys(ITEMS).map((id) =>
              btn('it', ITEMS[id].n + ' x' + S.items[id], { v: id, off: S.items[id] < 1 })).concat([btn('back', 'Back', { cls: 'alt' })])), {
              async it(id) {
                const list = id === 'revive' ? B.pa.filter((p) => !alive(p)) : pals();
                if (!list.length) { show('Nobody needs that.'); await sleep(700); root(); return; }
                const t = await pickTarget(list, ITEMS[id].n + ' for who?', root);
                if (t) resolve({ type: 'item', id, target: t });
              },
              back: root
            });
          },
          shape() { resolve({ type: 'shape' }); },
          flee() { resolve({ type: 'flee' }); }
        });
      };
      root();
    });
  }

  async function perform(c, act) {
    const foes = () => B.en.filter(alive);
    c.off = 1;
    if (act.type === 'attack') {
      const t = alive(act.target) ? act.target : foes()[0];
      if (!t) return;
      const d = hit(c, t, 1);
      show(cname(c) + ' hits ' + cname(t) + ' for ' + d + '.');
    } else if (act.type === 'guard') {
      c.st.guard = 1; c.m.mp = Math.min(maxMp(c.m), c.m.mp + 2); sfx.buff();
      show(cname(c) + ' guards and catches a breath.');
    } else if (act.type === 'item') {
      if (applyItem(act.id, act.target.m)) { sfx.heal(); fx(act.target, ITEMS[act.id].n, '#9dff7a'); show(cname(c) + ' uses a ' + ITEMS[act.id].n + ' on ' + cname(act.target) + '.'); }
      else show('The ' + ITEMS[act.id].n + " wouldn't help " + cname(act.target) + ' right now.');
    } else if (act.type === 'skill') {
      const sk = SKILLS[act.id];
      c.m.mp -= sk.mp;
      if (sk.heal) {
        const list = sk.t === 'allies' ? B.pa.filter(alive) : [alive(act.target) ? act.target : c];
        list.forEach((p) => heal(p, sk.heal)); sfx.heal();
        show(cname(c) + ' uses ' + sk.n + '.');
      } else if (sk.revive) {
        if (!alive(act.target)) { setHp(act.target, maxOf(act.target) * sk.revive); fx(act.target, 'Back up', '#9dff7a'); sfx.heal(); }
        show(cname(c) + ' uses ' + sk.n + ' on ' + cname(act.target) + '.');
      } else if (sk.t === 'self' || (sk.t === 'allies' && sk.defUp)) {
        const list = sk.t === 'self' ? [c] : B.pa.filter(alive);
        list.forEach((p) => { p.st.defUp = sk.defUp; fx(p, 'Defense up', '#9be3ff'); });
        if (sk.taunt) c.st.taunt = sk.taunt;
        sfx.buff();
        show(cname(c) + ' uses ' + sk.n + '.');
      } else {
        let total = 0;
        const strike = (t) => {
          total += hit(c, t, sk.pow, { pierce: sk.pierce });
          if (alive(t) && sk.defDown) { t.st.defDown = sk.defDown; fx(t, 'Defense down', '#d7b3ff'); }
          if (alive(t) && sk.stun && Math.random() < sk.stun && !t.boss) { t.st.stun = 1; fx(t, 'Stunned', '#ffd23f'); }
        };
        if (sk.t === 'all') foes().forEach(strike);
        else if (sk.t === 'random') { for (let i = 0; i < sk.hits; i++) { const f = foes(); if (!f.length) break; strike(pick(f)); await sleep(160); } }
        else { const t = alive(act.target) ? act.target : foes()[0]; if (t) strike(t); }
        show(cname(c) + ' uses ' + sk.n + ' for ' + total + '.');
      }
    } else if (act.type === 'shape') {
      const move = SHAPE_MOVES[S.party.length];
      S.meter = 0; sfx.shape(); B.burst = 1;
      B.pa.forEach((p) => { if (alive(p)) p.off = 1; });
      show('The ' + shapeName() + ' lines up: ' + move.n + '!');
      await sleep(520);
      let total = 0;
      const targets = move.one ? foes().sort((a, b) => b.hp - a.hp).slice(0, 1) : foes();
      targets.forEach((t) => {
        total += hit(c, t, move.pow, { noCharge: true });
        if (alive(t) && move.defDown) t.st.defDown = move.defDown;
        if (alive(t) && move.stun) { t.st.stun = 1; fx(t, 'Stunned', '#ffd23f'); }
      });
      if (move.revive) B.pa.forEach((p) => { if (!alive(p)) { setHp(p, maxOf(p) * move.revive); fx(p, 'Back up', '#9dff7a'); } });
      if (move.heal) B.pa.filter(alive).forEach((p) => heal(p, move.heal));
      show(move.n + ' deals ' + total + '.');
    }
    await sleep(520);
  }

  async function enemyTurn(c) {
    const pals = B.pa.filter(alive);
    if (!pals.length) return;
    c.turns++; c.off = 1;
    const k = KINDS[c.kind];
    const hurt = B.en.filter((e) => alive(e) && e.hp < e.max * 0.55);
    if (k.heals && !c.boss && hurt.length && Math.random() < 0.55) {
      const t = hurt.sort((a, b) => a.hp / a.max - b.hp / b.max)[0];
      setHp(t, t.hp + t.max * 0.25); fx(t, '+' + Math.round(t.max * 0.25), '#9dff7a'); sfx.heal();
      show(c.name + ' patches up ' + t.name + '.');
    } else if (k.hexes && !c.boss && Math.random() < 0.35) {
      const t = pick(pals); t.st.defDown = 3; fx(t, 'Defense down', '#d7b3ff'); sfx.buff();
      show(c.name + ' hexes ' + cname(t) + '.');
    } else if (c.boss && c.turns % 3 === 0 && pals.length > 1) {
      let total = 0; pals.forEach((p) => { total += hit(c, p, 0.85); });
      show(c.name + ' sweeps the whole party for ' + total + '.');
    } else {
      const taunters = pals.filter((p) => p.st.taunt);
      const t = taunters.length ? taunters[0] : pick(pals);
      const d = hit(c, t, c.boss && S.area > 0 && c.turns % 3 === 0 ? 1.5 : 1);
      show(c.name + ' hits ' + cname(t) + ' for ' + d + (alive(t) ? '.' : '. ' + cname(t) + ' is down.'));
    }
    await sleep(560);
  }

  function tickStatus(c) {
    ['defUp', 'defDown', 'taunt'].forEach((k) => { if (c.st[k]) c.st[k]--; });
  }

  function encounter(e) {
    const i = S.area, group = [mkEnemy(i, e.lv, e.kind, false)];
    const size = i === 0
      ? (e.lv - S.ngp * NGP_LEVELS >= 3 && Math.random() < 0.4 ? 2 : 1)
      : clamp(1 + Math.floor(Math.random() * (i + 1.6)), i >= 3 ? 2 : 1, 4);
    for (let n = 1; n < size; n++) group.push(mkEnemy(i, clamp(e.lv + irand(-1, 1), 1, 999), pick(i === 0 ? ['red', 'blue', 'yellow'] : Object.keys(KINDS)), false));
    runBattle(group, false, e);
  }

  async function runBattle(group, isBoss, mapEnemy) {
    mode = 'battle'; dest = null;
    const letters = {};
    group.forEach((g) => { letters[g.name] = (letters[g.name] || 0) + 1; });
    const seen = {};
    group.forEach((g) => { if (letters[g.name] > 1) { seen[g.name] = (seen[g.name] || 0) + 1; g.name += ' ' + 'ABCD'[seen[g.name] - 1]; } });
    B = { en: group, pa: S.party.map((m) => ({ side: 'p', m, st: {}, off: 0, flash: 0 })), boss: isBoss, fx: [], pick: null, active: null, burst: 0 };
    layout();
    sfx.start();
    try {
      show(group.length === 1 ? group[0].name + ' blocks the way.' : group.length + ' ' + SHAPE[AREAS[S.area].shape].toLowerCase() + 's block the way.');
      await sleep(800);
      let result = null;
      while (!result) {
        const order = B.pa.concat(B.en).filter(alive).map((c) => ({ c, s: spdOf(c) * rand(0.85, 1.15) })).sort((a, b) => b.s - a.s).map((o) => o.c);
        for (const c of order) {
          if (!alive(c)) continue;
          if (!B.en.some(alive)) { result = 'win'; break; }
          if (!B.pa.some(alive)) { result = 'lose'; break; }
          B.active = c; c.st.guard = 0;
          if (c.st.stun) { c.st.stun = 0; show(cname(c) + ' is stunned and loses the turn.'); await sleep(600); tickStatus(c); continue; }
          if (c.side === 'p') {
            const act = await choose(c);
            if (act.type === 'flee') {
              if (Math.random() < 0.65) { result = 'fled'; break; }
              show("Couldn't get away."); await sleep(600);
            } else await perform(c, act);
          } else await enemyTurn(c);
          tickStatus(c);
        }
        if (!result) { if (!B.en.some(alive)) result = 'win'; else if (!B.pa.some(alive)) result = 'lose'; }
      }
      B.active = null;
      await endBattle(result, isBoss, mapEnemy);
    } catch (err) {
      if (window.console) console.error('SHAPES battle error', err);
      B = null; backToWorld('Something went wrong in that fight, so it was called off.');
    }
  }

  function layout() {
    const place = (list, x, dir) => list.forEach((c, i) => {
      c.y = 40 + (VH - 80) * (i + 1) / (list.length + 1) + 14;
      c.x = x + dir * (i % 2) * 34;
    });
    place(B.pa, 96, -1); place(B.en, 300, 1);
    if (B.boss) {
      B.en[0].x = 318; B.en[0].y = 112;
      B.en.slice(1).forEach((c, k) => { c.x = 330; c.y = 214 + k * 56; });
    }
  }

  function wait(html, label) { return new Promise((resolve) => ui(html + cmds([btn('ok', label || 'Continue')]), { ok: resolve })); }

  async function endBattle(result, isBoss, mapEnemy) {
    if (result === 'fled') {
      B = null; if (mapEnemy) mapEnemy.dead = 6;
      save(); backToWorld('Got away.'); grace = 1.5; return;
    }
    if (result === 'lose') {
      sfx.lose();
      const lost = Math.floor(S.gold * 0.2);
      S.gold -= lost; S.meter = 0;
      S.party.forEach((m) => { m.hp = maxHp(m); m.mp = maxMp(m); });
      S.x = 220; S.y = 380;
      await wait(head('Flattened', 'Your ' + shapeName() + ' wakes up at the inn in ' + AREAS[S.area].name + ', ' + (lost ? lost + ' gold lighter' : 'no poorer') + ' and fully rested.'), 'Get back up');
      B = null; save(); enterWorld(false); return;
    }
    sfx.win();
    let xp = 0, gold = 0;
    B.en.forEach((e) => { xp += Math.round((5 + 4 * e.lv) * (e.boss ? 6 : 1)); gold += Math.round((3 + 2 * e.lv) * (e.boss ? 8 : 1)); });
    S.gold += gold; S.wins++;
    const lines = ['The party earns ' + xp + ' XP and ' + gold + ' gold.'];
    let leveled = false;
    S.party.forEach((m) => {
      const down = m.hp <= 0, before = knows(m).length;
      const ups = gainXp(m, down ? Math.floor(xp / 2) : xp);
      if (m.hp <= 0) m.hp = 1;
      if (ups) {
        leveled = true;
        let s = esc(m.name) + ' grows to level ' + m.lv + '.';
        const now = knows(m);
        if (now.length > before) s += ' Learned ' + now.slice(before).map((id) => SKILLS[id].n).join(' and ') + '.';
        lines.push(s);
      }
    });
    if (!isBoss && Math.random() < 0.25) { S.items.potion++; lines.push('They dropped a Potion.'); }
    if (leveled) sfx.level();
    if (mapEnemy) mapEnemy.dead = 22;

    if (isBoss) {
      const i = S.area, A = AREAS[i];
      S.boss[i] = true;
      if (i < 4) {
        const r = RECRUITS[i];
        if (!S.party.some((m) => m.id === r.id)) {
          S.party.push(mkMember(r.id, r.name, r.cls, r.color, Math.max(1, S.party[0].lv - 1)));
          lines.push(r.name + ' the ' + CLASSES[r.cls].label + ' joins you. You are a ' + shapeName().toUpperCase() + ' now.');
        } else lines.push('The road east is open again.');
        lines.push('The gate to ' + AREAS[i + 1].name + ' swings open.');
      } else {
        lines.push('The Dodecahedron folds flat. Every area is safe, and you are the sharpest shape in town.');
        lines.push('New Game Plus is unlocked on the Account screen.');
      }
      await wait(head(A.boss.name + ' is beaten', '') + '<div class="shp-list">' + lines.map((l) => '<p class="shp-line">' + l + '</p>').join('') + '</div>');
      B = null; save(); enterWorld(false); return;
    }
    await wait(head('Victory', '') + '<div class="shp-list">' + lines.map((l) => '<p class="shp-line">' + l + '</p>').join('') + '</div>' + partyRows());
    B = null; save(); backToWorld(); grace = 1.2;
  }

  /* ---------- drawing ---------- */
  let scale = 1, clock = 0;

  function text(str, x, y, size, fill, stroke, align) {
    ctx.font = '800 ' + size + 'px ' + FONT; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    if (stroke) { ctx.lineWidth = Math.max(3, size / 5); ctx.lineJoin = 'round'; ctx.strokeStyle = stroke; ctx.strokeText(str, x, y); }
    ctx.fillStyle = fill; ctx.fillText(str, x, y);
  }
  function poly(x, y, r, n, a) {
    ctx.beginPath();
    if (n <= 1) { ctx.arc(x, y, r, 0, TAU); return; }
    for (let i = 0; i < n; i++) { const t = a + i * TAU / n; ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); }
    ctx.closePath();
  }
  // One enemy or map creature: a dot, a line, a triangle, a square or a pentagon.
  function drawShape(x, y, r, n, a, color, ink, big) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (n === 2) {
      const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
      ctx.strokeStyle = ink; ctx.lineWidth = r * 0.55 + 3; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      ctx.strokeStyle = color; ctx.lineWidth = r * 0.55; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    } else {
      if (big) { poly(x + r * 0.22, y - r * 0.22, r, n, a); ctx.fillStyle = ink; ctx.globalAlpha *= 0.45; ctx.fill(); ctx.globalAlpha /= 0.45; }
      poly(x, y, r, n, a); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = big ? 3.5 : 2.5; ctx.stroke();
    }
    // eyes make it a character
    const ex = r * 0.3, ey = n === 2 ? 0 : -r * 0.1, er = Math.max(1.6, r * 0.13);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - ex, y + ey, er * 1.6, 0, TAU); ctx.arc(x + ex, y + ey, er * 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x - ex, y + ey, er * 0.8, 0, TAU); ctx.arc(x + ex, y + ey, er * 0.8, 0, TAU); ctx.fill();
  }
  // The party: dots on the corners of the shape they make together.
  function drawParty(x, y, a, ink, members, spread) {
    const n = members.length, R = n > 1 ? spread : 0, pts = [];
    for (let i = 0; i < n; i++) { const t = a + i * TAU / n - Math.PI / 2; pts.push([x + Math.cos(t) * R, y + Math.sin(t) * R]); }
    if (n > 1) {
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); pts.forEach((p) => ctx.lineTo(p[0], p[1])); if (n > 2) ctx.closePath(); ctx.stroke();
      if (n > 2) { ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
    }
    members.forEach((m, i) => {
      const r = i === 0 ? heroR(m) : 4.5 + Math.min(7, m.lv * 0.2);
      ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], r, 0, TAU);
      ctx.fillStyle = m.hp > 0 ? m.color : '#8a8f98'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(pts[i][0] - r * 0.3, pts[i][1] - r * 0.35, r * 0.28, 0, TAU); ctx.fill();
    });
  }

  function drawGround(A, i, camX, camY) {
    ctx.fillStyle = A.bg; ctx.fillRect(0, 0, VW, VH);
    ctx.fillStyle = A.deco; ctx.strokeStyle = A.deco;
    if (i === 1) { ctx.lineWidth = 1.5; for (let y = -((camY) % 26); y < VH; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); } }
    if (i === 3) { ctx.lineWidth = 1; ctx.globalAlpha = 0.5; for (let x = -(camX % 40); x < VW; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, VH); ctx.stroke(); } for (let y = -(camY % 40); y < VH; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VW, y); ctx.stroke(); } ctx.globalAlpha = 1; }
  }
  function drawDeco(A, i, d, x, y) {
    ctx.fillStyle = A.deco; ctx.strokeStyle = A.deco;
    if (i === 0) { ctx.beginPath(); ctx.arc(x, y, d.s * 0.7, 0, TAU); ctx.fill(); }
    else if (i === 1) { ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - d.s, y); ctx.lineTo(x + d.s, y + Math.sin(d.a) * 5); ctx.stroke(); }
    else if (i === 2) { poly(x, y, d.s * 1.25, 3, -Math.PI / 2); ctx.fill(); ctx.fillStyle = '#7a4a1e'; ctx.fillRect(x - 2, y + d.s * 0.6, 4, d.s * 0.7); }
    else if (i === 3) { ctx.fillRect(x - d.s, y - d.s, d.s * 2, d.s * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - d.s * 0.5, y - d.s * 0.5, d.s * 0.4, d.s * 0.4); ctx.fillRect(x + d.s * 0.1, y - d.s * 0.5, d.s * 0.4, d.s * 0.4); }
    else { poly(x, y, d.s * 1.1, 5, d.a); ctx.fill(); ctx.strokeStyle = '#6a58b5'; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function drawWorld() {
    const A = world.A, i = world.i;
    const camX = clamp(S.x - VW / 2, 0, MW - VW), camY = clamp(S.y - VH / 2, 0, MH - VH);
    const dark = i === 4, ink = dark ? '#0d0826' : '#14203c';
    drawGround(A, i, camX, camY);
    for (const d of world.deco) { const x = d.x - camX, y = d.y - camY; if (x > -30 && x < VW + 30 && y > -30 && y < VH + 30) drawDeco(A, i, d, x, y); }

    // town plaza
    ctx.fillStyle = dark ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.ellipse(220 - camX, 330 - camY, 150, 95, 0, 0, TAU); ctx.fill();

    for (const s of world.spots) {
      const x = s.x - camX, y = s.y - camY;
      if (x < -80 || x > VW + 80 || y < -80 || y > VH + 80) continue;
      if (s.id === 'inn' || s.id === 'shop') {
        ctx.fillStyle = s.id === 'inn' ? '#ff8f9a' : '#ffd23f'; ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.rect(x - 24, y - 12, 48, 34); ctx.fill(); ctx.stroke();
        ctx.fillStyle = s.id === 'inn' ? '#c2181f' : '#d98a00';
        ctx.beginPath(); ctx.moveTo(x - 30, y - 12); ctx.lineTo(x, y - 34); ctx.lineTo(x + 30, y - 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        text(s.label.toUpperCase(), x, y + 6, 12, '#fff', ink);
      } else if (s.id === 'back' || s.id === 'next') {
        const open = s.id === 'back' || S.boss[i];
        ctx.fillStyle = open ? '#9dff7a' : '#9aa7b3'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 22, Math.PI, 0); ctx.lineTo(x + 22, y + 22); ctx.lineTo(x - 22, y + 22); ctx.closePath(); ctx.fill(); ctx.stroke();
        text(s.id === 'back' ? '<' : open ? '>' : 'X', x, y + 4, 18, '#fff', ink);
        text(open ? s.label : 'Locked', clamp(x, 70, VW - 70), y - 34, 11, '#fff', ink);
      } else if (s.id === 'boss') {
        const bob = Math.sin(clock * 2) * 3;
        drawShape(x, y + bob, 30, A.shape, clock * 0.4, '#ff5a5f', ink, true);
        text(s.label, x, y - 46, 12, '#ffd23f', ink);
      }
    }
    for (const e of world.en) {
      if (e.dead > 0) continue;
      const x = e.x - camX, y = e.y - camY;
      if (x < -30 || x > VW + 30 || y < -30 || y > VH + 30) continue;
      drawShape(x, y + Math.sin(clock * 3 + e.x) * 1.5, e.r, A.shape, A.shape === 2 ? Math.sin(clock + e.y) * 0.5 : clock * 0.6 + e.x, KINDS[e.kind].c, ink, false);
      text('Lv ' + e.lv, x, y - e.r - 10, 11, '#fff', ink);
    }
    if (dest) { ctx.strokeStyle = dark ? '#fff' : ink; ctx.globalAlpha = 0.6; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dest.x - camX, dest.y - camY, 6 + Math.sin(clock * 8) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (grace > 0 && Math.floor(clock * 10) % 2) ctx.globalAlpha = 0.55;
    drawParty(S.x - camX, S.y - camY, rot, ink, S.party, 9 + S.party.length * 2.5);
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(8,14,40,.72)'; ctx.fillRect(0, 0, VW, 24);
    text(A.name + (S.ngp ? ' +' + S.ngp : ''), 8, 12, 13, '#fff', null, 'left');
    text(S.gold + ' gold', VW - 8, 12, 13, '#ffd23f', null, 'right');
  }

  function drawBattle() {
    const A = AREAS[S.area], dark = S.area === 4, ink = dark ? '#0d0826' : '#14203c';
    drawGround(A, S.area, 0, 0);
    ctx.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(VW / 2, VH * 0.62, 230, 105, 0, 0, TAU); ctx.fill();
    if (B.burst > 0) { ctx.fillStyle = 'rgba(255,255,255,' + B.burst * 0.7 + ')'; ctx.fillRect(0, 0, VW, VH); }

    const hpBar = (c, x, y, w) => {
      const pct = clamp(hpOf(c) / maxOf(c), 0, 1);
      ctx.fillStyle = ink; ctx.fillRect(x - 2, y - 2, w + 4, 9);
      ctx.fillStyle = pct > 0.5 ? '#5fd235' : pct > 0.25 ? '#ffc928' : '#ff5a5f'; ctx.fillRect(x, y, w * pct, 5);
    };
    B.pa.forEach((c) => {
      const x = c.x + c.off * 26, m = c.m, r = (c === B.pa[0] ? heroR(m) : 5 + Math.min(7, m.lv * 0.2)) + 4;
      if (B.active === c) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, c.y, r + 6 + Math.sin(clock * 8), 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = alive(c) ? 1 : 0.4;
      ctx.beginPath(); ctx.arc(x, c.y, r, 0, TAU);
      ctx.fillStyle = c.flash > 0.5 ? '#fff' : alive(c) ? m.color : '#8a8f98'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x - r * 0.3, c.y - r * 0.35, r * 0.28, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      if (c.st.guard) { ctx.strokeStyle = '#9be3ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + r, c.y, r + 5, -1, 1); ctx.stroke(); }
      text(m.name, c.x + r + 9, c.y, 12, '#fff', ink, 'left');
    });
    B.en.forEach((c) => {
      if (!alive(c) && c.flash <= 0) return;
      const x = c.x - c.off * 26, r = c.boss ? 38 : 17;
      ctx.globalAlpha = alive(c) ? 1 : c.flash;
      if (B.active === c) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, c.y, r + 8 + Math.sin(clock * 8), 0, TAU); ctx.stroke(); }
      drawShape(x, c.y, r, c.n, c.n === 2 ? 0.25 : clock * (c.boss ? 0.25 : 0.5) + c.y, c.flash > 0.5 ? '#fff' : c.color, ink, c.boss);
      ctx.globalAlpha = 1;
      if (!alive(c)) return;
      if (c.boss) { hpBar(c, c.x - 45, c.y - 58, 90); text(c.name + ' Lv ' + c.lv, c.x, c.y - 70, 11, '#ffd23f', ink); }
      else {
        text(c.name, c.x + r + 8, c.y - 7, 11, '#fff', ink, 'left');
        hpBar(c, c.x + r + 9, c.y + 5, 46);
        text('Lv ' + c.lv, c.x + r + 62, c.y + 8, 9, '#fff', ink, 'left');
      }
    });
    if (S.party.length > 1) { ctx.globalAlpha = 0.9; drawParty(VW / 2, 34, clock * 0.8, ink, S.party, 15); ctx.globalAlpha = 1; }
    B.fx.forEach((f) => { ctx.globalAlpha = clamp(f.life * 1.6, 0, 1); text(f.str, clamp(f.x, 40, VW - 40), f.y, 15, f.color, ink); });
    ctx.globalAlpha = 1;
  }

  function drawTitle() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#1a2a78'); g.addColorStop(1, '#3fb3f2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    const cols = ['#ff5a5f', '#ffc928', '#5fd235', '#39b8f2', '#b06cf0'];
    for (let n = 1; n <= 5; n++) {
      const x = 60 + (n - 1) * 90, y = 232 + Math.sin(clock * 1.5 + n) * 6;
      const members = []; for (let k = 0; k < n; k++) members.push({ color: cols[k], hp: 1, lv: 8 });
      drawParty(x, y, clock * 0.6 + n, '#0b1330', members, 12 + n * 3);
      text(SHAPE[n], x, 288, 11, '#fff', '#0b1330');
    }
    text('SHAPES', VW / 2, 92, 76, '#ffd23f', '#0b1330');
    text('You start as a dot.', VW / 2, 150, 17, '#fff', '#0b1330');
  }

  function draw() {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (mode === 'title') drawTitle();
    else if (mode === 'battle' && B) drawBattle();
    else if (world) drawWorld();
  }

  /* ---------- loop ---------- */
  let last = 0;
  function tick(dt) {
    clock += dt;
    if (mode === 'world') updateWorld(dt);
    if (mode === 'battle' && B) {
      S.time += dt;
      B.burst = Math.max(0, B.burst - dt * 2.5);
      B.pa.concat(B.en).forEach((c) => { c.off = Math.max(0, c.off - dt * 4); c.flash = Math.max(0, c.flash - dt * 3); });
      for (let i = B.fx.length - 1; i >= 0; i--) { B.fx[i].life -= dt; B.fx[i].y -= 26 * dt; if (B.fx[i].life <= 0) B.fx.splice(i, 1); }
    }
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!document.hidden) { tick(dt); draw(); }
    window.requestAnimationFrame(frame);
  }

  function resize() {
    const rect = cv.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(rect.width * dpr); cv.height = Math.round(rect.width * dpr * VH / VW);
    scale = cv.width / VW;
    draw();
  }

  /* ---------- input ---------- */
  function point(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }; }
  let dragging = false;
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); wake();
    const p = point(e);
    if (mode === 'world') {
      dragging = true;
      dest = { x: clamp(S.x - VW / 2, 0, MW - VW) + p.x, y: clamp(S.y - VH / 2, 0, MH - VH) + p.y };
    } else if (mode === 'battle' && B && B.pick) {
      let best = null, bd = 46;
      B.en.concat(B.pa).forEach((c) => { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } });
      if (best) B.pick(best);
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (!dragging || mode !== 'world') return;
    const p = point(e);
    dest = { x: clamp(S.x - VW / 2, 0, MW - VW) + p.x, y: clamp(S.y - VH / 2, 0, MH - VH) + p.y };
  });
  window.addEventListener('pointerup', () => { dragging = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  const KEYMAP = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' };
  document.addEventListener('keydown', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const k = KEYMAP[e.key.toLowerCase()];
    if (k && mode === 'world') { keys[k] = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', (e) => { const k = KEYMAP[e.key.toLowerCase()]; if (k) keys[k] = false; });
  window.addEventListener('blur', () => { Object.keys(keys).forEach((k) => { keys[k] = false; }); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && S && mode !== 'title') save(); });
  window.addEventListener('pagehide', () => { if (S && mode !== 'title' && mode !== 'battle') save(); });

  if (window.ResizeObserver) new window.ResizeObserver(resize).observe(cv);
  window.addEventListener('resize', resize);

  /* ---------- boot ---------- */
  account = loadJSON(ACCT_KEY);
  if (!account || typeof account.name !== 'string' || !account.name) account = null;
  titleScreen();
  resize();
  window.requestAnimationFrame(frame);

  // For testing from the console: read state, step time by hand, skip battle pauses.
  window.Shapes = {
    state() { return { mode, account, save: S, battle: B ? { enemies: B.en.map((e) => ({ name: e.name, hp: e.hp, max: e.max, lv: e.lv })), active: B.active ? cname(B.active) : null } : null }; },
    step(dt) { tick(dt); draw(); },
    instant(on) { testMode = !!on; }
  };
})();
