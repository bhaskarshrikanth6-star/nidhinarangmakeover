/* Scroll-linked and entrance motion.
   Only transform / opacity / clip-path (plus a brief one-off blur on headings, desktop only) are animated.
   Everything scroll-linked runs through ScrollTrigger, which is fed by the same ticker as Lenis. */
(function () {
  var NN = (window.NN = window.NN || {});
  var qs = function (s, c) { return (c || document).querySelector(s); };
  var qa = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  /* ---------- text splitting ---------- */
  function wrapPieces(el, pieces, cls, sep) {
    el.setAttribute('aria-label', el.getAttribute('aria-label') || el.textContent.trim());
    el.textContent = '';
    var inners = [];
    pieces.forEach(function (p, i) {
      var outer = document.createElement('span');
      outer.className = 'line';
      outer.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = cls;
      inner.textContent = p;
      outer.appendChild(inner);
      el.appendChild(outer);
      if (sep && i < pieces.length - 1) el.appendChild(document.createTextNode(' '));
      inners.push(inner);
    });
    return inners;
  }
  var splitWords = function (el) { return wrapPieces(el, el.textContent.trim().split(/\s+/), 'line__in', true); };

  /* Splits a plain-text paragraph into its rendered lines (each line masked, rises independently).
     Call only after fonts are ready so the line breaks match what the visitor sees. */
  var lineSplits = [];
  function splitLines(el) {
    var original = el.innerHTML;
    var text = el.textContent.trim();
    var words = text.split(/\s+/);
    el.textContent = '';
    var spans = words.map(function (w, i) {
      var s = document.createElement('span');
      s.style.display = 'inline-block';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    var lines = [], last = null, cur = null;
    spans.forEach(function (s) {
      var t = s.offsetTop;
      if (last === null || Math.abs(t - last) > 4) { cur = []; lines.push(cur); last = t; }
      cur.push(s.textContent);
    });
    el.textContent = '';
    el.setAttribute('aria-label', text);
    var inners = lines.map(function (ws) {
      var outer = document.createElement('span');
      outer.className = 'line line--block';
      outer.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = 'line__in';
      inner.textContent = ws.join(' ');
      outer.appendChild(inner);
      el.appendChild(outer);
      return inner;
    });
    lineSplits.push({ el: el, original: original });
    return inners;
  }

  function splitFillWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.textContent = '';
    return words.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
  }

  var CLIP = {
    up: ['inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'],
    down: ['inset(0% 0% 100% 0%)', 'inset(0% 0% 0% 0%)'],
    left: ['inset(0% 100% 0% 0%)', 'inset(0% 0% 0% 0%)'],
    right: ['inset(0% 0% 0% 100%)', 'inset(0% 0% 0% 0%)'],
    circle: ['circle(0% at 50% 50%)', 'circle(75% at 50% 50%)']
  };

  NN.initMotion = function () {
    if (NN.reduced || !window.gsap || !window.ScrollTrigger) return false;
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out' });

    var root = document.documentElement;
    var mm = gsap.matchMedia();
    var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

    /* ======================================================
       HERO — hidden states now; the sequence is played by NN.playIntro()
       ====================================================== */
    var hero = qs('[data-hero]');
    var heroLogo = qs('[data-hero-logo]');
    var heroFade = qa('[data-hero-fade]');
    var tagline = qs('[data-hero-tagline]');
    var taglineLines = splitLines(tagline);
    gsap.set(taglineLines, { yPercent: 112 });
    tagline.style.visibility = 'visible';
    gsap.set(heroFade, { y: 30 });
    gsap.set('.nav__bar', { yPercent: -100, opacity: 0 });

    /* ---- loader → hero hand-off: the loader's logo glides into the exact spot of the hero logo ---- */
    NN.playIntro = function () {
      var loader = qs('[data-loader]');
      var bg = qs('[data-loader-bg]');
      var logoEl = qs('[data-loader-logo]');
      var lenis = NN.lenis;
      var finished = false;

      window.scrollTo(0, 0);
      if (lenis) { lenis.scrollTo(0, { immediate: true }); lenis.stop(); }

      function finish() {
        if (finished) return; finished = true;
        clearTimeout(hardStop);
        gsap.set(heroLogo, { opacity: 1 });
        if (loader) loader.style.display = 'none';
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      }
      function force() { // failsafe: never leave the page hidden
        if (tl) tl.kill();
        gsap.set([heroFade, taglineLines, '.nav__bar', heroLogo], { opacity: 1, y: 0, yPercent: 0, clearProps: 'transform' });
        gsap.set(taglineLines, { yPercent: 0 });
        gsap.set('.nav__bar', { yPercent: 0 });
        finish();
      }
      var hardStop = setTimeout(force, 7000);

      if (!loader || !logoEl) {
        gsap.set(heroLogo, { opacity: 1 });
        var tl0 = gsap.timeline({ onComplete: finish });
        tl0.to(heroFade, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0)
           .to(taglineLines, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }, 0.1)
           .to('.nav__bar', { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out' }, 0.2);
        return;
      }

      var r = heroLogo.getBoundingClientRect();
      var dx = (r.left + r.width / 2) - window.innerWidth / 2;
      var dy = (r.top + r.height / 2) - window.innerHeight / 2;
      gsap.set(logoEl, { xPercent: -50, yPercent: -50, opacity: 0, scale: 0.92 });

      var tl = gsap.timeline({ onComplete: finish });
      tl.to(logoEl, { opacity: 1, scale: 1, duration: 1.3, ease: 'power3.out' }, 0.1)
        .to(logoEl, { x: dx, y: dy, duration: 1.15, ease: 'expo.inOut' }, 1.5)
        .to(bg, { opacity: 0, duration: 1.15, ease: 'power2.inOut' }, 1.5)
        .add(function () { gsap.set(heroLogo, { opacity: 1 }); logoEl.style.visibility = 'hidden'; }, 2.66)
        .to('.nav__bar', { yPercent: 0, opacity: 1, duration: 1.3, ease: 'expo.out' }, 2.2)
        .to(heroFade[0], { opacity: 1, y: 0, duration: 1.2 }, 2.3)
        .to(taglineLines, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12 }, 2.45)
        .to(heroFade.slice(1), { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, 2.75);
    };

    /* ---- hero scroll-linked exit: the page slides OVER the sticky hero ---- */
    mm.add('(min-width: 901px)', function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=100%', scrub: true }
      });
      tl.to('.hero__stack', { yPercent: -10, opacity: 0, ease: 'none' }, 0)
        .to('.hero__logo', { scale: 0.9, ease: 'none' }, 0);
    });
    mm.add('(max-width: 900px)', function () {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=100%', scrub: true }
      });
      tl.to('.hero__stack', { opacity: 0, yPercent: -6, ease: 'none' }, 0);
    });
    /* once the hero is fully covered, stop painting it */
    ScrollTrigger.create({
      trigger: '[data-about]', start: 'top top',
      onEnter: function () { hero.style.visibility = 'hidden'; },
      onLeaveBack: function () { hero.style.visibility = 'visible'; }
    });

    /* ---- subtle pointer depth on the hero logo (fine pointers only) ---- */
    if (fine) {
      var heroOn = true;
      new IntersectionObserver(function (e) { heroOn = e[0].isIntersecting; }).observe(hero);
      var lx = gsap.quickTo('.hero__logo', 'x', { duration: 1.4, ease: 'power3' });
      var ly = gsap.quickTo('.hero__logo', 'y', { duration: 1.4, ease: 'power3' });
      var tx = gsap.quickTo('.hero__tagline', 'x', { duration: 1.8, ease: 'power3' });
      window.addEventListener('pointermove', function (e) {
        if (!heroOn) return;
        var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
        lx(nx * -16); ly(ny * -12); tx(nx * 7);
      }, { passive: true });
    }

    /* ======================================================
       HEADINGS — mask rise (+ a one-off blur-to-sharp on desktop)
       ====================================================== */
    qa('[data-split]').forEach(function (el) {
      var words = splitWords(el);
      gsap.set(words, fine ? { yPercent: 112, filter: 'blur(8px)' } : { yPercent: 112 });
      el.style.visibility = 'visible';
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: function () {
          gsap.to(words, Object.assign({ yPercent: 0, duration: 1.45, ease: 'expo.out', stagger: 0.07,
            onComplete: function () { gsap.set(words, { clearProps: 'filter,transform' }); } },
            fine ? { filter: 'blur(0px)' } : {}));
        }
      });
    });

    /* ---- paragraphs: line-by-line rise ---- */
    qa('[data-lines]').forEach(function (el) {
      var lines = splitLines(el);
      gsap.set(lines, { yPercent: 112 });
      el.style.visibility = 'visible';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(lines, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12 }); }
      });
    });

    gsap.set('[data-split-fade]', { y: 14 });
    ScrollTrigger.batch('[data-split-fade]', {
      start: 'top 92%', once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }); }
    });

    gsap.set('[data-fade]', { y: 38 });
    ScrollTrigger.batch('[data-fade]', {
      start: 'top 90%', once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out', stagger: 0.1 }); }
    });

    /* ======================================================
       IMAGES / LOGO — masked reveal, settle zoom, depth parallax
       ====================================================== */
    qa('[data-reveal-image]').forEach(function (fig) {
      var frame = qs('.about__frame, .g__frame', fig);
      var img = qs('img', fig);
      if (!frame || !img) return;
      var clip = CLIP[fig.getAttribute('data-dir') || 'up'];
      gsap.set(img, { scale: 1.28 });
      var tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 86%', once: true } });
      tl.fromTo(frame, { clipPath: clip[0] }, {
          clipPath: clip[1], duration: 1.8, ease: 'power4.inOut',
          onComplete: function () { gsap.set(frame, { clipPath: 'none' }); } // 'none' (not clearProps) so the CSS hidden state cannot return
        })
        .to(img, { scale: 1, duration: 2.3, ease: 'power3.out' }, 0);
    });

    mm.add('(min-width: 901px)', function () {
      /* image travels inside its frame */
      qa('img[data-parallax]').forEach(function (img) {
        var a = parseFloat(img.getAttribute('data-parallax')) * 75;
        gsap.fromTo(img, { yPercent: -a }, {
          yPercent: a, ease: 'none',
          scrollTrigger: { trigger: img.closest('figure'), start: 'top bottom', end: 'bottom top', scrub: 0.5 }
        });
      });
      /* figures drift at different speeds (depth). yPercent, so it never fights a y fade-in. */
      qa('[data-layer]').forEach(function (el) {
        var l = parseFloat(el.getAttribute('data-layer'));
        gsap.fromTo(el, { yPercent: 7 * l }, {
          yPercent: -7 * l, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.7 }
        });
      });
    });
    mm.add('(max-width: 900px)', function () {
      qa('[data-layer]').forEach(function (el) {
        var l = parseFloat(el.getAttribute('data-layer'));
        gsap.fromTo(el, { yPercent: 3 * l }, {
          yPercent: -3 * l, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    });

    /* ======================================================
       MARQUEE — velocity-reactive, reverses with scroll direction
       ====================================================== */
    (function marquee() {
      var wrap = qs('[data-marquee]');
      var track = qs('[data-marquee-track]');
      if (!wrap || !track) return;
      var x = 0, dir = 1, boost = 0, skew = 0, on = false;
      new IntersectionObserver(function (e) { on = e[0].isIntersecting; }, { rootMargin: '100px' }).observe(wrap);
      gsap.ticker.add(function (t, dt) {
        if (!on) return;
        var s = dt / 1000;
        var v = NN.lenis ? NN.lenis.velocity : 0;
        var targetDir = v < -0.4 ? -1 : (v > 0.4 ? 1 : dir);
        dir += (targetDir - dir) * Math.min(1, s * 4);
        var targetBoost = Math.min(Math.abs(v) * 0.5, 14);
        boost += (targetBoost - boost) * Math.min(1, s * 5);
        var targetSkew = gsap.utils.clamp(-7, 7, v * -0.35);
        skew += (targetSkew - skew) * Math.min(1, s * 6);
        x -= (2.2 + boost) * dir * s;
        if (x <= -50) x += 50; else if (x > 0) x -= 50;
        gsap.set(track, { xPercent: x, skewX: skew });
      });
    })();

    /* ======================================================
       SERVICES — pinned horizontal track on large screens, staggered list on small
       ====================================================== */
    var pin = qs('[data-services-pin]');
    var track = qs('[data-services-track]');
    var bar = qs('[data-services-bar]');
    if (pin && track) {
      mm.add('(min-width: 901px)', function () {
        root.classList.add('js-hscroll');
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 1); };
        var tween = gsap.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: {
            trigger: pin, start: 'top top', end: function () { return '+=' + dist(); },
            pin: true, scrub: true, anticipatePin: 1, invalidateOnRefresh: true
          }
        });
        gsap.to(bar, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, scrub: true, invalidateOnRefresh: true }
        });
        qa('[data-service]').forEach(function (p) {
          var ghost = qs('.service__ghost', p);
          gsap.fromTo(ghost, { xPercent: -14 }, {
            xPercent: 14, ease: 'none',
            scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
          });
        });
        gsap.from('[data-service]', {
          opacity: 0, y: 60, duration: 1.3, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: pin, start: 'top 70%', once: true }
        });
        return function () { root.classList.remove('js-hscroll'); };
      });
      mm.add('(max-width: 900px)', function () {
        qa('[data-service]').forEach(function (p) {
          gsap.from(p, {
            opacity: 0, y: 36, duration: 1.1, ease: 'power3.out',
            scrollTrigger: { trigger: p, start: 'top 90%', once: true }
          });
        });
      });
    }

    /* ======================================================
       STATEMENT — words fill in as you scroll
       ====================================================== */
    var stmt = qs('[data-statement-text]');
    if (stmt) {
      var sw = splitFillWords(stmt);
      gsap.set(sw, { opacity: 0.14 });
      gsap.to(sw, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: stmt, start: 'top 82%', end: 'bottom 48%', scrub: true }
      });
    }

    /* ======================================================
       WHY — rules draw, copy rises
       ====================================================== */
    qa('[data-why-item]').forEach(function (li) {
      var rule = qs('.why__rule', li);
      var copy = qa('h3, p', li);
      gsap.set(copy, { y: 26 });
      var tl = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 88%', once: true } });
      tl.to(rule, { scaleX: 1, duration: 1.6, ease: 'power3.inOut' }, 0)
        .to(copy, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.25);
    });

    /* ======================================================
       TESTIMONIALS — layered cards settle into place (only exists when reviews are configured)
       ====================================================== */
    var quotes = qa('[data-quote]');
    if (quotes.length) {
      gsap.set(quotes, { y: 70, rotate: 1.6, transformOrigin: '0% 100%' });
      ScrollTrigger.batch(quotes, {
        start: 'top 90%', once: true,
        onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, rotate: 0, duration: 1.5, ease: 'expo.out', stagger: 0.16 }); }
      });
    }

    /* ======================================================
       CONTACT — links slide in
       ====================================================== */
    var citems = qa('[data-contact-item]');
    if (citems.length) {
      gsap.set(citems, { x: -34 });
      ScrollTrigger.batch(citems, {
        start: 'top 92%', once: true,
        onEnter: function (b) { gsap.to(b, { opacity: 1, x: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12 }); }
      });
    }

    /* ======================================================
       FOOTER — restrained
       ====================================================== */
    var fparts = qa('[data-footer-part]');
    gsap.set(fparts, { y: 30 });
    ScrollTrigger.batch(fparts, {
      start: 'top 96%', once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1.3, stagger: 0.1 }); }
    });

    /* ======================================================
       SCROLL PROGRESS
       ====================================================== */
    gsap.to('[data-progress]', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: true }
    });

    /* ======================================================
       POINTER FEEL — cursor follower + magnetic buttons (fine pointers only)
       ====================================================== */
    if (fine) {
      var cur = qs('[data-cursor]');
      var dot = qs('.cursor__dot'), ring = qs('.cursor__ring'), label = qs('.cursor__label');
      gsap.set([dot, ring, label], { x: -100, y: -100 });
      var dX = gsap.quickTo(dot, 'x', { duration: 0.15, ease: 'power3' });
      var dY = gsap.quickTo(dot, 'y', { duration: 0.15, ease: 'power3' });
      var rX = gsap.quickTo(ring, 'x', { duration: 0.65, ease: 'power3' });
      var rY = gsap.quickTo(ring, 'y', { duration: 0.65, ease: 'power3' });
      var lX = gsap.quickTo(label, 'x', { duration: 0.65, ease: 'power3' });
      var lY = gsap.quickTo(label, 'y', { duration: 0.65, ease: 'power3' });
      var shown = false;
      window.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (!shown) { shown = true; gsap.to(cur, { opacity: 1, duration: 0.4 }); }
        dX(e.clientX); dY(e.clientY); rX(e.clientX); rY(e.clientY); lX(e.clientX); lY(e.clientY);
      }, { passive: true });
      gsap.set(cur, { opacity: 0 });
      document.documentElement.addEventListener('pointerleave', function () { shown = false; gsap.to(cur, { opacity: 0, duration: 0.3 }); });

      var state = '';
      var setState = function (s) {
        if (s === state) return; state = s;
        cur.classList.toggle('is-view', s === 'view');
        gsap.to(ring, { scale: s === 'view' ? 2.3 : (s === 'link' ? 1.55 : 1), duration: 0.6, ease: 'power3.out' });
        gsap.to(label, { opacity: s === 'view' ? 1 : 0, duration: 0.35 });
      };
      document.addEventListener('pointerover', function (e) {
        var t = e.target.closest ? e.target : null;
        if (!t) return;
        if (t.closest('[data-cursor-view]')) setState('view');
        else if (t.closest('a, button, [data-magnetic]')) setState('link');
        else setState('');
      }, { passive: true });

      qa('[data-magnetic]').forEach(function (el) {
        var mx = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power4.out' });
        var my = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power4.out' });
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          mx((e.clientX - (r.left + r.width / 2)) * 0.28);
          my((e.clientY - (r.top + r.height / 2)) * 0.34);
        });
        el.addEventListener('pointerleave', function () { mx(0); my(0); });
      });
    }

    /* ---- paragraph line splits depend on width: when the window is resized, show plain text ---- */
    var lastW = window.innerWidth, rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (Math.abs(window.innerWidth - lastW) < 2) return;
        lastW = window.innerWidth;
        lineSplits.forEach(function (s) {
          s.el.innerHTML = s.original;
          s.el.removeAttribute('aria-label');
          s.el.style.visibility = 'visible';
        });
        lineSplits.length = 0;
      }, 250);
    });

    /* ---- layout settles when images arrive ---- */
    ScrollTrigger.sort();
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    return true;
  };
})();
