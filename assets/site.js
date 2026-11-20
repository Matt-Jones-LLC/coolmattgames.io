/* Cool Matt Games: shared page script.
   Two jobs: float a few decorative bubbles across the sky, and show the play counter.
   The counter lives in this browser only. Nothing is sent anywhere. */
(function () {
  'use strict';

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, String(value));
    } catch (e) { /* private mode or blocked storage: the page still works */ }
    return null;
  }

  // Shared with the games: window.CMG.plays() reads, window.CMG.countPlay() adds one.
  window.CMG = {
    store: store,
    plays: function () { return parseInt(store('cmg:plays') || '0', 10) || 0; },
    countPlay: function () { store('cmg:plays', window.CMG.plays() + 1); }
  };

  var sky = document.querySelector('.sky-bubbles');
  if (sky) {
    var count = window.innerWidth < 600 ? 6 : 10;
    for (var i = 0; i < count; i++) {
      var b = document.createElement('span');
      var size = 26 + Math.round(Math.random() * 70);
      b.style.setProperty('--s', size + 'px');
      b.style.setProperty('--x', Math.round(Math.random() * 96) + '%');
      b.style.setProperty('--d', (22 + Math.random() * 26).toFixed(1) + 's');
      b.style.setProperty('--delay', (-Math.random() * 40).toFixed(1) + 's');
      b.style.setProperty('--sway', Math.round(Math.random() * 120 - 60) + 'px');
      b.style.setProperty('--rest', Math.round(10 + Math.random() * 75) + '%');
      sky.appendChild(b);
    }
  }

  var counter = document.querySelector('[data-plays]');
  if (counter) {
    var n = String(window.CMG.plays());
    while (n.length < 6) n = '0' + n;
    counter.textContent = n;
  }
})();
