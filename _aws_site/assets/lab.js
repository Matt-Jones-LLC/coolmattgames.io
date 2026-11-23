(() => {
  'use strict';
  const theme = document.getElementById('theme');
  const renderer = document.getElementById('renderer');
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  const method = document.getElementById('method');
  function drawStars() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = '#ffffff90';
    for (let i = 0; i < 110; i++) {
      ctx.beginPath();
      ctx.arc(((i * 7919) % 1000) / 1000 * window.innerWidth,
        ((i * 3571) % 1000) / 1000 * window.innerHeight, i % 3 === 0 ? 1.5 : 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function update() {
    document.body.dataset.theme = theme.value;
    document.body.dataset.renderer = renderer.value;
    method.textContent = {css:'A CSS gradient draws the grid. No animation loop.',
      canvas:'JavaScript draws a static starfield on Canvas. It redraws only when the window resizes.',
      plain:'Just the background gradient. No grid, canvas, or animation.'}[renderer.value];
    if (renderer.value === 'canvas') drawStars();
  }
  theme.addEventListener('change', update);
  renderer.addEventListener('change', update);
  window.addEventListener('resize', () => { if (renderer.value === 'canvas') drawStars(); });
  update();
})();
