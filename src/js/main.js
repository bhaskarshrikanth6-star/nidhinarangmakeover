(function () {
  var NN = window.NN || {};

  /* Line splitting measures text, so wait for web fonts (but never more than 1.3s). */
  function whenFonts(cb) {
    var done = false;
    function go() { if (!done) { done = true; cb(); } }
    setTimeout(go, 1300);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  function boot() {
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();

    NN.initSmoothScroll();
    NN.initNav();

    whenFonts(function () {
      var motionOk = false;
      try { motionOk = NN.initMotion(); } catch (err) { console.error('Motion init failed', err); }
      if (motionOk) {
        NN.playIntro();
      } else {
        // Motion could not start (reduced motion, library blocked, error): show everything immediately.
        document.documentElement.classList.remove('js-motion');
      }
      window.NN_READY = true;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
