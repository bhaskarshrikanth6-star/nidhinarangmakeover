/* Smooth scrolling engine: Lenis driven by GSAP's ticker, so scroll position and every
   ScrollTrigger / scrub animation update from ONE requestAnimationFrame loop. */
(function () {
  var NN = (window.NN = window.NN || {});
  NN.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var expo = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };

  NN.initSmoothScroll = function () {
    if (NN.reduced || !window.Lenis || !window.gsap || !window.ScrollTrigger) return null;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    var lenis = new Lenis({
      lerp: 0.072,            // inertia. Lower = longer, silkier glide. 0.072 is weighty but never laggy
      wheelMultiplier: 0.85,  // a hard wheel flick travels a controlled distance
      smoothWheel: true,
      syncTouch: false,       // touch is never hijacked: native momentum scrolling stays on phones and tablets
      touchMultiplier: 1,
      anchors: false,         // anchors handled in nav.js with tuned easing
      autoRaf: false          // GSAP's ticker drives it (below)
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0); // never "catch up" with a jump after a dropped frame

    NN.lenis = lenis;
    return lenis;
  };

  NN.scrollTo = function (target, opts) {
    if (NN.lenis) {
      NN.lenis.scrollTo(target, Object.assign({ duration: 1.9, easing: expo }, opts || {}));
    } else {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: NN.reduced ? 'auto' : 'smooth' });
    }
  };
})();
