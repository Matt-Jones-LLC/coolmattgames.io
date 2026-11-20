/* Corner Shot: a Cool Matt Games original.
   A logo bounces around the screen like an old screensaver. Tap at the moment it hits a corner.
   Every run is aimed on purpose, at a corner or just beside one, so the bounces stay honest
   physics while the game still decides when a corner is coming. 360 x 540 playfield, scaled to fit. */
(function () {
  'use strict';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var CMG = window.CMG || { store: function () { return null; }, countPlay: function () {} };

  var W = 360, H = 540, TAU = Math.PI * 2;
  var SX = 10, SY = 54, SW = 340, SH = 476;          // the "screen" the logo lives in
  var LW = 88, LH = 46;                               // the logo
  var A = SW - LW, B = SH - LH;                       // room the logo's top-left corner can move in
  var BEST_KEY = 'cmg:corner-shot:best', MUTE_KEY = 'cmg:muted';
  var FONT = '"Trebuchet MS", "Lucida Grande", "Segoe UI", sans-serif';
  var COLORS = ['#39b8f2', '#ffc928', '#ff5a5f', '#5fd235', '#b06cf0', '#ff8a1f'];
  var MAX_LIVES = 3;

  var el = function (id) { return document.getElementById(id); };
  var ui = {
    start: el('screen-start'), pause: el('screen-pause'), end: el('screen-end'),
    btnStart: el('btn-start'), btnResume: el('btn-resume'), btnAgain: el('btn-again'),
    btnPause: el('btn-pause'), btnSound: el('btn-sound'),
    best: el('best'), endLine: el('end-line'),
    sScore: el('s-score'), sCorners: el('s-corners'), sStreak: el('s-streak'), sSpeed: el('s-speed')
  };

  var mode = 'menu';           // menu | play | pause | end
  var scale = 1, raf = 0, last = 0, clock = 0;
  var x, y, dx, dy, speed, nextSpeed, plan, prev, colorIdx;
  var score, lives, corners, streak, bestStreak, nearRun, freeze, shake, flash;
  var texts = [], parts = [], glow = [0, 0, 0, 0];
  var best = parseInt(CMG.store(BEST_KEY) || '0', 10) || 0;
  var muted = CMG.store(MUTE_KEY) === '1';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function fold(v, size) { var m = ((v % (2 * size)) + 2 * size) % (2 * size); return m <= size ? m : 2 * size - m; }

  // How close to the corner moment a tap has to land, in seconds. It tightens as you go.
  function win() { return 0.21 - 0.10 * Math.min(1, corners / 18); }
  function nearChance() { return corners < 3 ? 0 : Math.min(0.42, 0.26 + corners * 0.012); }
  function nearOffset() { return Math.max(15, 32 - corners * 0.8); }

  /* ---------- sound ---------- */
  var ac = null;
  function wake() {
    if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) { try { ac = new AC(); } catch (e) { ac = null; } } }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (muted || !ac) return;
    var at = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(vol || 0.1, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(at); o.stop(at + dur + 0.03);
  }
  var sfx = {
    bounce: function () { tone(190 + colorIdx * 22, 0.05, 'triangle', 0.06); },
    hit: function (pts) { [659, 880, 1175].slice(0, pts).forEach(function (f, i) { tone(f, 0.16, 'triangle', 0.13, 0, i * 0.07); }); },
    strike: function () { tone(180, 0.28, 'sawtooth', 0.09, 70); },
    over: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.24, 'triangle', 0.1, 0, i * 0.15); }); }
  };

  /* ---------- aiming ---------- */
  // Distance from point (px, py) to the segment (x1, y1) -> (x2, y2).
  function segDist(px, py, x1, y1, x2, y2) {
    var vx = x2 - x1, vy = y2 - y1, len = vx * vx + vy * vy;
    var t = len ? clamp(((px - x1) * vx + (py - y1) * vy) / len, 0, 1) : 0;
    return Math.hypot(px - (x1 + vx * t), py - (y1 + vy * t));
  }
  // True when the straight path passes close to some other corner on the way, which would look like a
  // corner hit the game is not counting. Corners repeat on a grid once the bounces are unfolded.
  function grazes(tx, ty, ci, cj) {
    var i0 = Math.floor(Math.min(x, tx) / A) - 1, i1 = Math.ceil(Math.max(x, tx) / A) + 1;
    var j0 = Math.floor(Math.min(y, ty) / B) - 1, j1 = Math.ceil(Math.max(y, ty) / B) + 1;
    for (var i = i0; i <= i1; i++) {
      for (var j = j0; j <= j1; j++) {
        if (i === ci && j === cj) continue;
        var cx = i * A, cy = j * B;
        if (Math.hypot(cx - x, cy - y) < 3) continue;          // the corner we are leaving
        if (segDist(cx, cy, x, y, tx, ty) < 40) return true;
      }
    }
    return false;
  }

  // Pick the next run. From a corner any direction is fair. From a wall, pick the run whose
  // direction is closest to the true bounce, so the change is too small to see.
  function aim(free, forceCorner) {
    var kind = (!forceCorner && nearRun < 2 && Math.random() < nearChance()) ? 'near' : 'corner';
    var atCorner = (x < 0.5 || x > A - 0.5) && (y < 0.5 || y > B - 0.5);
    var lmin = speed * 1.8, lmax = speed * 4.6, bestC = null, bestS = 1e9;
    for (var i = -7; i <= 7; i++) {
      for (var j = -7; j <= 7; j++) {
        var tx = i * A, ty = j * B;
        if (kind === 'near') {
          var d = nearOffset() * (Math.random() < 0.5 ? -1 : 1);
          if (Math.random() < 0.5) ty += d; else tx += d;
        }
        var vx = tx - x, vy = ty - y, len = Math.hypot(vx, vy);
        if (len < lmin || len > lmax) continue;
        var ux = vx / len, uy = vy / len;
        if (Math.abs(ux) < 0.28 || Math.abs(uy) < 0.28) continue;            // too flat to be fun
        if ((x < 0.5 && ux <= 0) || (x > A - 0.5 && ux >= 0) || (y < 0.5 && uy <= 0) || (y > B - 0.5 && uy >= 0)) continue;
        if (atCorner && kind === 'corner' && gcd(Math.round(Math.abs(vx / A)), Math.round(Math.abs(vy / B))) !== 1) continue;
        if (grazes(tx, ty, i, j)) continue;
        var s = free ? Math.random() : (1 - (ux * dx + uy * dy)) + Math.random() * 0.002;
        if (s < bestS) { bestS = s; bestC = { ux: ux, uy: uy, len: len, tx: tx, ty: ty }; }
      }
    }
    if (!bestC) {
      if (!forceCorner) { aim(free, true); return; }
      if (!free) { aim(true, true); return; }
      // Last resort: straight at the far corner.
      var fx = x < A / 2 ? A : 0, fy = y < B / 2 ? B : 0, fl = Math.hypot(fx - x, fy - y) || 1;
      bestC = { ux: (fx - x) / fl, uy: (fy - y) / fl, len: fl, tx: fx, ty: fy };
      kind = 'corner';
    }
    nearRun = kind === 'near' ? nearRun + 1 : 0;
    dx = bestC.ux; dy = bestC.uy;
    plan = { kind: kind, t: bestC.len / speed, tx: bestC.tx, ty: bestC.ty, claimed: false };
  }

  /* ---------- game ---------- */
  function reset() {
    x = A / 2; y = B / 3; dx = 0.7; dy = 0.7; speed = 150; nextSpeed = 150; colorIdx = 0;
    score = 0; lives = MAX_LIVES; corners = 0; streak = 0; bestStreak = 0; nearRun = 0;
    freeze = 0; shake = 0; flash = 0; prev = null;
    texts.length = 0; parts.length = 0; glow = [0, 0, 0, 0];
    aim(true, true);
  }

  function say(str, color, size) {
    texts.push({ x: clamp(SX + x + LW / 2, 60, W - 60), y: clamp(SY + y - 10, SY + 24, H - 40), str: str, color: color || '#fff', size: size || 18, life: 1, max: 1 });
  }
  function cornerIndex(px, py) { return (px > A / 2 ? 1 : 0) + (py > B / 2 ? 2 : 0); }

  function award(err, px, py) {
    var q = err / win(), pts = q <= 0.35 ? 3 : q <= 0.7 ? 2 : 1;
    score += pts; corners++; streak++;
    if (streak > bestStreak) bestStreak = streak;
    nextSpeed = Math.min(430, nextSpeed * 1.055);
    glow[cornerIndex(px, py)] = 1; flash = 0.5; freeze = 0.14;
    say((pts === 3 ? 'Perfect' : pts === 2 ? 'Nice' : 'Close') + ' +' + pts, pts === 3 ? '#ffd23f' : '#fff', pts === 3 ? 22 : 18);
    var cx = SX + (px > A / 2 ? SW : 0), cy = SY + (py > B / 2 ? SH : 0);
    for (var i = 0; i < 14; i++) {
      var a = rand(0, TAU), s = rand(70, 220);
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: rand(2, 4.5), life: 0.6, max: 0.6, color: COLORS[i % COLORS.length] });
    }
    sfx.hit(pts);
  }
  function strike(msg) {
    lives--; streak = 0; shake = 0.35;
    say(msg, '#ffb3b5', 17); sfx.strike();
    if (lives <= 0) finish();
  }

  function tap() {
    if (mode !== 'play') return;
    if (plan.kind === 'corner' && !plan.claimed && plan.t <= win()) {
      plan.claimed = true;
      award(plan.t, fold(plan.tx, A), fold(plan.ty, B));
      return;
    }
    if (prev && prev.kind === 'corner' && !prev.claimed && prev.age <= win()) {
      prev.claimed = true;
      award(prev.age, prev.x, prev.y);
      return;
    }
    strike(prev && prev.kind === 'near' && prev.age < 0.4 || plan.kind === 'near' && plan.t < 0.4 ? 'So close. Not a corner' : 'Not a corner');
  }

  function arrive() {
    var over = -plan.t;
    x = fold(plan.tx, A); y = fold(plan.ty, B);
    if (x < 0.5) dx = Math.abs(dx); else if (x > A - 0.5) dx = -Math.abs(dx);
    if (y < 0.5) dy = Math.abs(dy); else if (y > B - 0.5) dy = -Math.abs(dy);
    prev = { kind: plan.kind, age: over, claimed: plan.claimed, x: x, y: y };
    colorIdx = (colorIdx + 1) % COLORS.length; sfx.bounce();
    speed = nextSpeed;
    aim(prev.kind === 'corner', false);
  }

  function update(dt) {
    clock += dt;
    var i;
    for (i = 0; i < 4; i++) glow[i] = Math.max(0, glow[i] - dt * 1.6);
    flash = Math.max(0, flash - dt * 2.4);
    if (shake > 0) shake -= dt;
    for (i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; }
    for (i = texts.length - 1; i >= 0; i--) { texts[i].life -= dt; texts[i].y -= 24 * dt; if (texts[i].life <= 0) texts.splice(i, 1); }
    if (freeze > 0) { freeze -= dt; return; }

    var step = speed * dt;
    x += dx * step; y += dy * step;
    var bounced = false;
    if (x < 0) { x = -x; dx = -dx; bounced = true; } else if (x > A) { x = 2 * A - x; dx = -dx; bounced = true; }
    if (y < 0) { y = -y; dy = -dy; bounced = true; } else if (y > B) { y = 2 * B - y; dy = -dy; bounced = true; }
    plan.t -= dt;
    if (bounced && plan.t > 0.02) { colorIdx = (colorIdx + 1) % COLORS.length; sfx.bounce(); }

    if (prev) {
      prev.age += dt;
      if (prev.kind === 'corner' && !prev.claimed && prev.age > win()) { prev.claimed = true; strike('Missed it'); if (mode !== 'play') return; }
    }
    if (plan.t <= 0) arrive();
  }

  /* ---------- drawing ---------- */
  function rrect(px, py, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(px + r, py); ctx.arcTo(px + w, py, px + w, py + h, r); ctx.arcTo(px + w, py + h, px, py + h, r);
    ctx.arcTo(px, py + h, px, py, r); ctx.arcTo(px, py, px + w, py, r); ctx.closePath();
  }
  function heart(px, py, s, full) {
    ctx.beginPath();
    ctx.moveTo(px, py + s * 0.9);
    ctx.bezierCurveTo(px - s * 1.5, py - s * 0.2, px - s * 0.7, py - s * 1.2, px, py - s * 0.35);
    ctx.bezierCurveTo(px + s * 0.7, py - s * 1.2, px + s * 1.5, py - s * 0.2, px, py + s * 0.9);
    if (full) { ctx.fillStyle = '#ff6b78'; ctx.fill(); }
    ctx.lineWidth = 1.3; ctx.strokeStyle = full ? '#fff' : 'rgba(255,255,255,.45)'; ctx.stroke();
  }

  function draw() {
    var i;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#0a1230'; ctx.fillRect(0, 0, W, H);

    // HUD
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.font = '700 14px ' + FONT; ctx.textAlign = 'left';
    ctx.fillText(streak > 1 ? 'Streak ' + streak : 'Corners ' + corners, 12, 27);
    ctx.font = '800 20px ' + FONT; ctx.textAlign = 'center';
    ctx.fillText(String(score), W / 2, 27);
    for (i = 0; i < MAX_LIVES; i++) heart(W - 18 - i * 21, 26, 6.6, i < lives);

    ctx.save();
    if (shake > 0) ctx.translate(rand(-1, 1) * shake * 12, rand(-1, 1) * shake * 12);

    // the screen
    var g = ctx.createLinearGradient(0, SY, 0, SY + SH);
    g.addColorStop(0, '#02040c'); g.addColorStop(1, '#0a0f24');
    rrect(SX, SY, SW, SH, 10); ctx.fillStyle = g; ctx.fill();
    ctx.save(); rrect(SX, SY, SW, SH, 10); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.035)';
    for (var ly = SY; ly < SY + SH; ly += 4) ctx.fillRect(SX, ly, SW, 1);
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash * 0.5 + ')'; ctx.fillRect(SX, SY, SW, SH); }

    // corner brackets: the four targets
    for (i = 0; i < 4; i++) {
      var cx = SX + (i % 2 ? SW : 0), cy = SY + (i > 1 ? SH : 0), sx = i % 2 ? -1 : 1, sy = i > 1 ? -1 : 1;
      ctx.strokeStyle = glow[i] > 0 ? 'rgba(255,210,63,' + (0.5 + glow[i] * 0.5) + ')' : 'rgba(255,255,255,.28)';
      ctx.lineWidth = 3 + glow[i] * 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + sx * 26, cy + sy * 5); ctx.lineTo(cx + sx * 5, cy + sy * 5); ctx.lineTo(cx + sx * 5, cy + sy * 26); ctx.stroke();
    }

    // the logo
    var lx = SX + x, lyy = SY + y, col = COLORS[colorIdx];
    var lg = ctx.createLinearGradient(0, lyy, 0, lyy + LH);
    lg.addColorStop(0, '#ffffff'); lg.addColorStop(0.12, col); lg.addColorStop(0.5, col); lg.addColorStop(1, '#0a1230');
    rrect(lx, lyy, LW, LH, 12); ctx.fillStyle = lg; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; rrect(lx + 5, lyy + 4, LW - 10, LH * 0.36, 8); ctx.fill();
    ctx.font = 'italic 800 24px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(6,20,60,.75)'; ctx.strokeText('CMG', lx + LW / 2, lyy + LH / 2 + 2);
    ctx.fillStyle = '#fff'; ctx.fillText('CMG', lx + LW / 2, lyy + LH / 2 + 2);
    ctx.restore();

    for (i = 0; i < parts.length; i++) {
      var p = parts[i]; ctx.globalAlpha = p.life / p.max; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < texts.length; i++) {
      var t = texts[i]; ctx.globalAlpha = clamp(t.life / t.max * 1.8, 0, 1);
      ctx.font = '800 ' + t.size + 'px ' + FONT;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(4,10,34,.8)'; ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ---------- loop and screens ---------- */
  function frame(now) {
    if (mode !== 'play') return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt); draw();
    if (mode === 'play') raf = window.requestAnimationFrame(frame);
  }
  function run() { last = window.performance.now(); window.cancelAnimationFrame(raf); raf = window.requestAnimationFrame(frame); }
  function show(which) {
    ui.start.hidden = which !== 'start'; ui.pause.hidden = which !== 'pause'; ui.end.hidden = which !== 'end';
    ui.btnPause.disabled = mode !== 'play';
  }
  function start() { wake(); reset(); CMG.countPlay(); mode = 'play'; show(null); run(); canvas.focus({ preventScroll: true }); }
  function pause() { if (mode !== 'play') return; mode = 'pause'; show('pause'); draw(); ui.btnResume.focus({ preventScroll: true }); }
  function resume() { if (mode !== 'pause') return; wake(); mode = 'play'; show(null); run(); canvas.focus({ preventScroll: true }); }
  function finish() {
    mode = 'end'; sfx.over();
    var newBest = score > best;
    if (newBest) { best = score; CMG.store(BEST_KEY, best); }
    ui.endLine.textContent = (corners === 0 ? 'No corners this time. Watch where the bounces are heading.'
      : corners < 6 ? 'You caught ' + corners + (corners === 1 ? ' corner.' : ' corners.') + ' It speeds up from here.'
      : 'You caught ' + corners + ' corners. That is a lot of staring at a screensaver.') + (newBest ? ' New best score.' : '');
    ui.sScore.textContent = String(score);
    ui.sCorners.textContent = String(corners);
    ui.sStreak.textContent = String(bestStreak);
    ui.sSpeed.textContent = (nextSpeed / 150).toFixed(1) + 'x';
    ui.best.textContent = String(best);
    draw(); show('end'); ui.btnAgain.focus({ preventScroll: true });
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
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.width * dpr * H / W);
    scale = canvas.width / W;
    if (mode !== 'play') draw();
  }

  /* ---------- input ---------- */
  canvas.addEventListener('pointerdown', function (e) { if (mode !== 'play') return; e.preventDefault(); tap(); });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  ui.btnStart.addEventListener('click', start);
  ui.btnAgain.addEventListener('click', start);
  ui.btnResume.addEventListener('click', resume);
  ui.btnPause.addEventListener('click', pause);
  ui.btnSound.addEventListener('click', function () { wake(); setMuted(!muted); });
  document.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    var key = e.key.toLowerCase();
    if ((key === ' ' || key === 'enter') && mode === 'play' && (!e.target || e.target.tagName !== 'BUTTON')) { e.preventDefault(); if (!e.repeat) tap(); }
    else if (key === 'p' || key === 'escape') { if (mode === 'play') pause(); else if (mode === 'pause') resume(); }
    else if (key === 'm') setMuted(!muted);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  if (window.ResizeObserver) new window.ResizeObserver(resize).observe(canvas);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  /* ---------- boot ---------- */
  reset(); setMuted(muted);
  ui.best.textContent = String(best);
  show('start'); resize(); draw();

  // Read-only peek plus manual stepping, for testing from the console.
  window.CornerShot = {
    step: function (dt) { if (mode === 'play') { update(dt); draw(); } },
    tap: tap,
    state: function () {
      return { mode: mode, score: score, lives: lives, corners: corners, streak: streak, speed: Math.round(speed), window: win(),
               x: x, y: y, plan: { kind: plan.kind, t: plan.t, claimed: plan.claimed }, prev: prev ? { kind: prev.kind, age: prev.age, claimed: prev.claimed } : null,
               roomW: A, roomH: B };
    }
  };
})();
