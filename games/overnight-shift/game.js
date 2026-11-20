/* Overnight Shift: a Cool Matt Games original.
   Pop support tickets before they float off the top. Survive from midnight to 8 AM.
   Plain canvas, no libraries. All sizes are in a 360 x 540 playfield that scales to fit. */
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var CMG = window.CMG || { store: function () { return null; }, countPlay: function () {} };

  var W = 360, H = 540, HUD = 46, TAU = Math.PI * 2;
  var HOUR = 18, HOURS = 8, SHIFT = HOUR * HOURS;   // seconds of play per in-game hour
  var MAX_HEARTS = 5;
  var BEST_KEY = 'cmg:overnight-shift:best';
  var MUTE_KEY = 'cmg:muted';
  var FONT = '"Trebuchet MS", "Lucida Grande", "Segoe UI", sans-serif';

  var TYPES = {
    ticket: { c: ['#9be3ff', '#39b8f2', '#0f78cf'], pts: 10, r: [24, 30], hp: 1, speed: 1 },
    vip:    { c: ['#fff0a6', '#ffc928', '#d98a00'], pts: 30, r: [18, 21], hp: 1, speed: 1.45 },
    esc:    { c: ['#ffb3b5', '#ff5a5f', '#c2181f'], pts: 50, r: [31, 35], hp: 3, speed: 0.72 },
    spam:   { c: ['#eef2f5', '#a9b6c1', '#6f7f8c'], pts: 0,  r: [23, 27], hp: 1, speed: 0.95 },
    coffee: { c: ['#f3d9b8', '#c98a4b', '#7f4a1c'], pts: 0,  r: [21, 21], hp: 1, speed: 1.15 },
    macro:  { c: ['#d5ff9f', '#5fd235', '#2f8f0a'], pts: 0,  r: [21, 21], hp: 1, speed: 1.15 }
  };

  var el = function (id) { return document.getElementById(id); };
  var ui = {
    start: el('screen-start'), pause: el('screen-pause'), end: el('screen-end'),
    btnStart: el('btn-start'), btnResume: el('btn-resume'), btnAgain: el('btn-again'),
    btnPause: el('btn-pause'), btnSound: el('btn-sound'),
    best: el('best'), endTitle: el('end-title'), endLine: el('end-line'),
    sScore: el('s-score'), sCsat: el('s-csat'), sCombo: el('s-combo'), sClock: el('s-clock')
  };

  var mode = 'menu';            // menu | play | pause | end
  var scale = 1, raf = 0, last = 0;
  var t, score, hearts, combo, bestCombo, resolved, escaped;
  var spawnIn, slowT, shake, lastX, sinceCoffee, sinceMacro;
  var bubbles = [], parts = [], texts = [];
  var best = parseInt(CMG.store(BEST_KEY) || '0', 10) || 0;
  var muted = CMG.store(MUTE_KEY) === '1';
  var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  /* ---------- helpers ---------- */
  function lerp(a, b, k) { return a + (b - a) * k; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(c1, c2, k) {
    var a = hex(c1), b = hex(c2);
    return 'rgb(' + Math.round(lerp(a[0], b[0], k)) + ',' + Math.round(lerp(a[1], b[1], k)) + ',' + Math.round(lerp(a[2], b[2], k)) + ')';
  }
  function clockText(sec) {
    var mins = Math.floor(clamp(sec, 0, SHIFT) / HOUR * 60);
    var h = Math.floor(mins / 60), m = mins % 60;
    return (h === 0 ? 12 : h) + ':' + (m < 10 ? '0' : '') + m + ' AM';
  }
  function csat() { var n = resolved + escaped; return n ? Math.round(resolved / n * 100) : 100; }
  function mult() { return Math.min(5, 1 + Math.floor(combo / 8)); }

  /* ---------- sound (starts on the first tap, as browsers require) ---------- */
  var ac = null;
  function wake() {
    if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) { try { ac = new AC(); } catch (e) { ac = null; } } }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted || !ac) return;
    var at = ac.currentTime + (delay || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(vol || 0.12, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(at); o.stop(at + dur + 0.03);
  }
  var sfx = {
    pop: function () { var f = 380 + Math.min(combo, 40) * 11; tone(f, 0.09, 'sine', 0.16, f * 2); },
    knock: function () { tone(240, 0.07, 'triangle', 0.14, 180); },
    miss: function () { tone(170, 0.05, 'triangle', 0.05); },
    escape: function () { tone(210, 0.32, 'sawtooth', 0.09, 70); },
    spam: function () { tone(150, 0.26, 'square', 0.07, 85); },
    coffee: function () { tone(520, 0.12, 'sine', 0.12, 390); tone(390, 0.2, 'sine', 0.12, 260, 0.1); },
    macro: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.1, 'triangle', 0.11, 0, i * 0.055); }); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.22, 'triangle', 0.12, 0, i * 0.13); }); },
    over: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.26, 'triangle', 0.11, 0, i * 0.16); }); }
  };

  /* ---------- skyline (same every time: a tiny seeded generator) ---------- */
  var seed = 24;
  function srand() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
  var buildings = [], windows = [], stars = [];
  (function () {
    var x = -6;
    while (x < W) {
      var w = 22 + Math.floor(srand() * 30), h = 22 + Math.floor(srand() * 46);
      buildings.push({ x: x, w: w, h: h });
      for (var wy = H - h + 6; wy < H - 8; wy += 9) {
        for (var wx = x + 4; wx < x + w - 5; wx += 7) {
          if (srand() < 0.2) windows.push({ x: wx, y: wy, on: srand() });
        }
      }
      x += w + 1;
    }
    for (var i = 0; i < 46; i++) stars.push({ x: srand() * W, y: HUD + srand() * (H * 0.62), r: 0.5 + srand() * 1.1, tw: srand() * TAU });
  })();
  var myWindow = { x: 171, y: H - 40 };   // the one office with its light on: yours

  /* ---------- game state ---------- */
  function reset() {
    t = 0; score = 0; hearts = MAX_HEARTS; combo = 0; bestCombo = 0; resolved = 0; escaped = 0;
    spawnIn = 0.6; slowT = 0; shake = 0; lastX = W / 2; sinceCoffee = 0; sinceMacro = 0;
    bubbles.length = 0; parts.length = 0; texts.length = 0;
  }

  function pickType() {
    var hour = Math.floor(t / HOUR);
    var table = [['ticket', 60]];
    if (hour >= 1) table.push(['vip', 12]);
    if (hour >= 2) table.push(['esc', 8 + hour]);
    if (hour >= 3) table.push(['spam', 10]);
    if (hour >= 1 && sinceCoffee > 16) table.push(['coffee', hearts <= 2 ? 9 : 5]);
    if (hour >= 2 && sinceMacro > 14) table.push(['macro', 5]);
    var total = 0, i;
    for (i = 0; i < table.length; i++) total += table[i][1];
    var roll = Math.random() * total;
    for (i = 0; i < table.length; i++) { roll -= table[i][1]; if (roll <= 0) return table[i][0]; }
    return 'ticket';
  }

  function spawn() {
    var type = pickType(), def = TYPES[type], p = t / SHIFT;
    var r = rand(def.r[0], def.r[1]);
    var x, tries = 0;
    do { x = rand(r + 8, W - r - 8); tries++; } while (Math.abs(x - lastX) < 56 && tries < 8);
    lastX = x;
    if (type === 'coffee') sinceCoffee = 0;
    if (type === 'macro') sinceMacro = 0;
    bubbles.push({
      type: type, x: x, y: H + r, r: r, hp: def.hp,
      vy: lerp(42, 84, p) * def.speed * rand(0.9, 1.12),
      phase: rand(0, TAU), sway: rand(6, 16), pulse: 0
    });
  }

  function burst(b, big) {
    var c = TYPES[b.type].c;
    parts.push({ ring: true, x: b.x, y: b.y, r: b.r, life: 0.32, max: 0.32, color: c[0] });
    var n = big ? 12 : 7;
    for (var i = 0; i < n; i++) {
      var a = rand(0, TAU), s = rand(60, 170);
      parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, r: rand(2, 4.5), life: 0.5, max: 0.5, color: i % 2 ? c[0] : c[1] });
    }
  }
  function say(x, y, str, color, size) {
    texts.push({ x: clamp(x, 34, W - 34), y: y, str: str, life: 0.9, max: 0.9, color: color || '#fff', size: size || 16 });
  }

  function resolve(b) {
    var def = TYPES[b.type], before = mult();
    combo++; resolved++;
    if (combo > bestCombo) bestCombo = combo;
    var gained = def.pts * before;
    score += gained;
    burst(b, b.type === 'esc');
    say(b.x, b.y - b.r, '+' + gained, '#fff');
    if (mult() > before) say(W / 2, HUD + 54, 'x' + mult() + ' combo', '#ffd23f', 22);
  }

  function loseHeart() {
    hearts--; combo = 0; shake = 0.35;
    if (hearts <= 0) finish(false);
  }

  function tap(x, y) {
    var pad = coarse ? 11 : 6, hit = -1, i, b;
    for (i = bubbles.length - 1; i >= 0; i--) {
      b = bubbles[i];
      var dx = x - b.x, dy = y - b.y, rr = b.r + pad;
      if (dx * dx + dy * dy <= rr * rr) { hit = i; break; }
    }
    if (hit < 0) { if (combo > 0) say(x, y, 'miss', 'rgba(255,255,255,.75)', 13); combo = 0; sfx.miss(); return; }
    b = bubbles[hit];

    if (b.type === 'spam') {
      bubbles.splice(hit, 1); burst(b); sfx.spam();
      say(b.x, b.y - b.r, 'Spam! -1', '#ffb3b5', 17);
      loseHeart();
      return;
    }
    if (b.type === 'coffee') {
      bubbles.splice(hit, 1); burst(b); sfx.coffee();
      slowT = 5.5; say(b.x, b.y - b.r, 'Coffee: slow-mo', '#f3d9b8', 17);
      return;
    }
    if (b.type === 'macro') {
      bubbles.splice(hit, 1); burst(b, true); sfx.macro();
      say(b.x, b.y - b.r, 'Macro!', '#d5ff9f', 19);
      for (i = bubbles.length - 1; i >= 0; i--) {
        if (bubbles[i].type === 'ticket' || bubbles[i].type === 'vip') { resolve(bubbles[i]); bubbles.splice(i, 1); }
      }
      return;
    }
    b.hp--;
    if (b.hp > 0) { b.pulse = 1; b.y = Math.min(b.y + 24, H - 40); sfx.knock(); return; }
    bubbles.splice(hit, 1);
    resolve(b); sfx.pop();
  }

  function update(dt) {
    var k = slowT > 0 ? 0.45 : 1, i, b;
    if (slowT > 0) slowT -= dt;
    t += dt; sinceCoffee += dt; sinceMacro += dt;
    if (shake > 0) shake -= dt;

    spawnIn -= dt * k;
    if (spawnIn <= 0) { spawn(); spawnIn = lerp(1.05, 0.46, t / SHIFT) * rand(0.8, 1.2); }

    for (i = bubbles.length - 1; i >= 0; i--) {
      b = bubbles[i];
      b.y -= b.vy * dt * k;
      b.phase += dt * 1.7;
      b.x = clamp(b.x + Math.sin(b.phase) * b.sway * dt, b.r + 4, W - b.r - 4);
      if (b.pulse > 0) b.pulse = Math.max(0, b.pulse - dt * 5);
      if (b.y < HUD - b.r * 0.35) {
        bubbles.splice(i, 1);
        if (b.type === 'ticket' || b.type === 'vip' || b.type === 'esc') {
          escaped++; sfx.escape();
          say(b.x, HUD + 22, 'Escaped', '#ffb3b5', 15);
          loseHeart();
          if (mode !== 'play') return;
        }
      }
    }
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
    }
    for (i = texts.length - 1; i >= 0; i--) {
      texts[i].life -= dt; texts[i].y -= 28 * dt;
      if (texts[i].life <= 0) texts.splice(i, 1);
    }
    if (t >= SHIFT) finish(true);
  }

  /* ---------- drawing ---------- */
  var SKY = [
    [0.00, '#050f2c', '#163a7d'],
    [0.60, '#0b1d4d', '#3b4fa3'],
    [0.85, '#27408f', '#f2906b'],
    [1.00, '#58b4f5', '#ffe7a6']
  ];
  function drawSky(p) {
    var i = 0;
    while (i < SKY.length - 2 && p > SKY[i + 1][0]) i++;
    var a = SKY[i], b = SKY[i + 1], k = clamp((p - a[0]) / (b[0] - a[0]), 0, 1);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, mix(a[1], b[1], k));
    g.addColorStop(1, mix(a[2], b[2], k));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    var starA = clamp(1 - p * 1.25, 0, 1);
    if (starA > 0) {
      ctx.fillStyle = '#fff';
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s];
        ctx.globalAlpha = starA * (0.55 + 0.45 * Math.sin(st.tw + t * 1.3));
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // moon sets as the shift goes on
    var mx = lerp(292, 60, p), my = lerp(104, 330, p * p);
    ctx.globalAlpha = clamp(1.15 - p * 1.2, 0, 1);
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath(); ctx.arc(mx, my, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = mix(a[1], b[1], k);
    ctx.beginPath(); ctx.arc(mx + 7, my - 5, 15, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    // sunrise in the last stretch
    if (p > 0.78) {
      var sk = (p - 0.78) / 0.22, sy = lerp(H + 30, H - 62, sk);
      var sg = ctx.createRadialGradient(250, sy, 4, 250, sy, 150);
      sg.addColorStop(0, 'rgba(255,244,190,' + (0.95 * sk) + ')');
      sg.addColorStop(0.25, 'rgba(255,210,63,' + (0.55 * sk) + ')');
      sg.addColorStop(1, 'rgba(255,210,63,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, H - 260, W, 260);
    }
  }

  function drawSkyline(p) {
    ctx.fillStyle = mix('#030817', '#1a2852', clamp((p - 0.7) / 0.3, 0, 1));
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      ctx.fillRect(b.x, H - b.h, b.w, b.h);
    }
    for (var j = 0; j < windows.length; j++) {
      var w = windows[j];
      // most windows are dark at night; they come on as morning arrives
      if (w.on < 0.25 || p > 0.55 + w.on * 0.45) {
        ctx.fillStyle = 'rgba(255,214,120,.55)';
        ctx.fillRect(w.x, w.y, 3, 4);
      }
    }
    ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffe58a';
    ctx.fillRect(myWindow.x, myWindow.y, 5, 6);
    ctx.shadowBlur = 0;
  }

  function icon(b, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1.6, r * 0.085); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,30,60,.35)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
    var i;
    if (b.type === 'ticket') {
      var w = r * 0.98, h = r * 0.64, top = -h / 2 + r * 0.1;
      ctx.strokeRect(-w / 2, top, w, h);
      ctx.beginPath(); ctx.moveTo(-w / 2, top); ctx.lineTo(0, top + h * 0.55); ctx.lineTo(w / 2, top); ctx.stroke();
    } else if (b.type === 'vip') {
      ctx.beginPath();
      for (i = 0; i < 10; i++) {
        var rad = i % 2 ? r * 0.24 : r * 0.56, an = -Math.PI / 2 + i * Math.PI / 5;
        ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad + r * 0.06);
      }
      ctx.closePath(); ctx.fill();
    } else if (b.type === 'esc') {
      ctx.font = '800 ' + Math.round(r * 0.95) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!!!'.slice(0, b.hp), 0, r * 0.1);
    } else if (b.type === 'spam') {
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(52,66,80,.92)';
      ctx.font = '800 ' + Math.round(r * 0.44) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SPAM', 0, r * 0.1);
    } else if (b.type === 'coffee') {
      var cw = r * 0.62, ch = r * 0.52;
      ctx.beginPath();
      ctx.moveTo(-cw / 2 - r * 0.08, -r * 0.02);
      ctx.lineTo(cw / 2 - r * 0.08, -r * 0.02);
      ctx.lineTo(cw / 2 - r * 0.16, ch);
      ctx.lineTo(-cw / 2, ch);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(cw / 2 - r * 0.06, r * 0.2, r * 0.16, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, r * 0.06);
      for (i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.14 - r * 0.08, -r * 0.16);
        ctx.quadraticCurveTo(i * r * 0.14 + r * 0.04, -r * 0.3, i * r * 0.14 - r * 0.08, -r * 0.46);
        ctx.stroke();
      }
    } else if (b.type === 'macro') {
      var pts = [[0.12, -0.62], [-0.36, 0.1], [-0.03, 0.1], [-0.14, 0.62], [0.38, -0.14], [0.05, -0.14]];
      ctx.beginPath();
      for (i = 0; i < pts.length; i++) ctx.lineTo(pts[i][0] * r, pts[i][1] * r + r * 0.04);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawBubble(b) {
    var c = TYPES[b.type].c, r = b.r * (1 + b.pulse * 0.14), x = b.x, y = b.y;
    var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.08, x, y, r);
    g.addColorStop(0, c[0]); g.addColorStop(0.7, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.62)';
    if (b.type === 'spam') ctx.setLineDash([4, 4]);
    ctx.stroke(); ctx.setLineDash([]);
    icon(b, x, y, r);
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.beginPath(); ctx.ellipse(x - r * 0.34, y - r * 0.5, r * 0.3, r * 0.15, -0.55, 0, TAU); ctx.fill();
  }

  function heart(x, y, s, full) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.7, y - s * 1.2, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.5, y - s * 0.2, x, y + s * 0.9);
    if (full) { ctx.fillStyle = '#ff6b78'; ctx.fill(); }
    ctx.lineWidth = 1.3; ctx.strokeStyle = full ? '#fff' : 'rgba(255,255,255,.45)'; ctx.stroke();
  }

  function drawHud() {
    ctx.fillStyle = 'rgba(8,24,60,.55)';
    ctx.fillRect(0, 0, W, HUD);
    var g = ctx.createLinearGradient(0, 0, 0, HUD);
    g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.5, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(255,255,255,.02)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, HUD);

    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.font = '700 15px ' + FONT; ctx.textAlign = 'left';
    ctx.fillText(clockText(t), 12, 21);
    ctx.font = '800 19px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText(String(score), W / 2, 21);
    for (var i = 0; i < MAX_HEARTS; i++) heart(W - 16 - i * 19, 20, 6.2, i < hearts);

    // shift progress
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, HUD - 4, W, 4);
    ctx.fillStyle = '#9be85a'; ctx.fillRect(0, HUD - 4, W * clamp(t / SHIFT, 0, 1), 4);

    if (mult() > 1) {
      ctx.font = '800 13px ' + FONT; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('x' + mult(), W / 2, HUD + 13);
    }
    if (slowT > 0) {
      ctx.font = '700 12px ' + FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#f3d9b8';
      ctx.fillText('slow-mo ' + Math.ceil(slowT), 12, HUD + 13);
    }
  }

  function draw() {
    var p = clamp(t / SHIFT, 0, 1), i;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 14, rand(-1, 1) * shake * 14);
    drawSky(p);
    drawSkyline(p);
    for (i = 0; i < bubbles.length; i++) drawBubble(bubbles[i]);
    for (i = 0; i < parts.length; i++) {
      var q = parts[i], a = q.life / q.max;
      ctx.globalAlpha = a;
      if (q.ring) {
        ctx.strokeStyle = q.color; ctx.lineWidth = 3 * a + 0.5;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r + (1 - a) * 22, 0, TAU); ctx.stroke();
      } else {
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r * a, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (slowT > 0) { ctx.fillStyle = 'rgba(201,138,75,.10)'; ctx.fillRect(0, 0, W, H); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < texts.length; i++) {
      var x = texts[i];
      ctx.globalAlpha = clamp(x.life / x.max * 1.6, 0, 1);
      ctx.font = '800 ' + x.size + 'px ' + FONT;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(4,16,44,.7)';
      ctx.strokeText(x.str, x.x, x.y);
      ctx.fillStyle = x.color; ctx.fillText(x.str, x.x, x.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    drawHud();
  }

  /* ---------- loop and screens ---------- */
  function frame(now) {
    if (mode !== 'play') return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    draw();
    if (mode === 'play') raf = window.requestAnimationFrame(frame);
  }
  function run() { last = window.performance.now(); window.cancelAnimationFrame(raf); raf = window.requestAnimationFrame(frame); }

  function show(which) {
    ui.start.hidden = which !== 'start';
    ui.pause.hidden = which !== 'pause';
    ui.end.hidden = which !== 'end';
    ui.btnPause.disabled = mode !== 'play';
  }

  function start() {
    wake(); reset(); CMG.countPlay();
    mode = 'play'; show(null); run();
    canvas.focus({ preventScroll: true });
  }
  function pause() { if (mode !== 'play') return; mode = 'pause'; show('pause'); draw(); ui.btnResume.focus({ preventScroll: true }); }
  function resume() { if (mode !== 'pause') return; wake(); mode = 'play'; show(null); run(); }

  function finish(won) {
    mode = 'end';
    var newBest = score > best;
    if (newBest) { best = score; CMG.store(BEST_KEY, best); }
    var c = csat(), line;
    if (won) {
      sfx.win();
      ui.endTitle.textContent = 'Shift complete';
      line = c >= 98 ? "98% or better. That's the number Matt held on the real overnight shift."
        : c >= 90 ? 'Solid shift. The day team owes you a coffee.'
        : 'You made it to sunrise. The queue has notes.';
    } else {
      sfx.over();
      ui.endTitle.textContent = 'The queue won';
      line = 'You clocked out at ' + clockText(t) + '. The day team starts at 8.';
    }
    ui.endLine.textContent = line + (newBest && score > 0 ? ' New best score.' : '');
    ui.sScore.textContent = String(score);
    ui.sCsat.textContent = c + '%';
    ui.sCombo.textContent = String(bestCombo);
    ui.sClock.textContent = clockText(t);
    ui.best.textContent = String(best);
    draw();
    show('end');
    ui.btnAgain.focus({ preventScroll: true });
  }

  function setMuted(m) {
    muted = m; CMG.store(MUTE_KEY, m ? '1' : '0');
    ui.btnSound.textContent = m ? 'Sound: off' : 'Sound: on';
    ui.btnSound.setAttribute('aria-pressed', m ? 'false' : 'true');
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.width * dpr * H / W);
    scale = canvas.width / W;
    if (mode !== 'play') draw();
  }

  /* ---------- input ---------- */
  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'play') return;
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    tap((e.clientX - rect.left) / rect.width * W, (e.clientY - rect.top) / rect.height * H);
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  ui.btnStart.addEventListener('click', start);
  ui.btnAgain.addEventListener('click', start);
  ui.btnResume.addEventListener('click', resume);
  ui.btnPause.addEventListener('click', pause);
  ui.btnSound.addEventListener('click', function () { wake(); setMuted(!muted); });

  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var key = e.key.toLowerCase();
    if (key === 'p' || key === 'escape') { if (mode === 'play') pause(); else if (mode === 'pause') resume(); }
    else if (key === 'm') setMuted(!muted);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);

  if (window.ResizeObserver) new window.ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  /* ---------- boot ---------- */
  reset();
  setMuted(muted);
  ui.best.textContent = String(best);
  show('start');
  resize();
  draw();

  // Read-only peek at the game, handy for testing from the console.
  window.OvernightShift = {
    step: function (dt) { if (mode === 'play') { update(dt); draw(); } },
    state: function () {
      return { mode: mode, t: t, clock: clockText(t), score: score, hearts: hearts, combo: combo, resolved: resolved, escaped: escaped,
               bubbles: bubbles.map(function (b) { return { type: b.type, x: Math.round(b.x), y: Math.round(b.y), r: Math.round(b.r), hp: b.hp }; }) };
    }
  };
})();
