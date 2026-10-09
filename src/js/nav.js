/* Navigation: hide-on-scroll-down / reveal-on-scroll-up, active link, mobile menu, anchor scrolling. */
(function () {
  var NN = (window.NN = window.NN || {});

  NN.initNav = function () {
    var nav = document.querySelector('[data-nav]');
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.querySelector('[data-menu]');
    if (!nav) return;

    var lastY = 0, ticking = false, menuOpen = false;

    function onScroll(y, dir) {
      nav.classList.toggle('is-solid', y > 40);
      if (menuOpen) return;
      if (y > 220 && dir === 1) nav.classList.add('is-hidden');
      else if (dir === -1 || y <= 220) nav.classList.remove('is-hidden');
    }

    if (NN.lenis) {
      NN.lenis.on('scroll', function (l) { onScroll(l.scroll, l.direction); });
    } else {
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY;
          onScroll(y, y > lastY ? 1 : -1);
          lastY = y; ticking = false;
        });
      }, { passive: true });
    }

    /* active link via IntersectionObserver (no scroll measuring) */
    var links = [].slice.call(document.querySelectorAll('.nav__links [data-link]'));
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['about', 'services', 'gallery', 'testimonials', 'contact'].forEach(function (id) {
        var s = document.getElementById(id); if (s) io.observe(s);
      });
    }

    /* mobile menu */
    function setMenu(open) {
      if (!menu || !toggle) return;
      menuOpen = open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (open) {
        menu.hidden = false;
        void menu.offsetWidth; // single deliberate reflow so the transition runs
        menu.classList.add('is-open');
        nav.classList.remove('is-hidden');
        if (NN.lenis) NN.lenis.stop(); else document.documentElement.style.overflow = 'hidden';
      } else {
        menu.classList.remove('is-open');
        if (NN.lenis) NN.lenis.start(); else document.documentElement.style.overflow = '';
        setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 850);
      }
    }
    if (toggle) toggle.addEventListener('click', function () { setMenu(!menuOpen); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); toggle.focus(); } });

    /* anchor links */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var wasOpen = menuOpen;
      if (wasOpen) setMenu(false);
      setTimeout(function () { NN.scrollTo(target, { offset: 0 }); history.replaceState(null, '', href); }, wasOpen ? 60 : 0);
    });
  };
})();
