/* Kweni Studio — moteur d'animation
   GSAP + ScrollTrigger + Lenis. Tout est désactivé si l'utilisateur demande moins d'animations. */
(function () {
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var desktop = window.matchMedia('(min-width: 1000px)').matches;

  function ready() { html.classList.add('is-ready'); window.dispatchEvent(new Event('kweni:ready')); }
  function uncurtain() { html.classList.remove('arriving'); }

  if (reduce || !window.gsap) {
    var l = document.getElementById('loader'); if (l) l.remove();
    uncurtain(); ready(); return;
  }

  gsap.registerPlugin(ScrollTrigger);
  html.classList.add('motion');

  /* ---------- Défilement fluide ---------- */
  var lenis = null;
  if (window.Lenis && fine) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return;
        var t = document.querySelector(id); if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: 0, duration: 1.6 });
        if (id !== '#main') history.replaceState(null, '', id);
      });
    });
  }

  /* ---------- Barre de progression + en-tête qui se cache ---------- */
  var bar = document.querySelector('.scroll-progress');
  var header = document.querySelector('.site-header');
  var lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: function (s) {
      if (bar) bar.style.transform = 'scaleX(' + s.progress + ')';
      var y = s.scroll();
      if (header && !document.body.classList.contains('nav-open')) {
        header.classList.toggle('hidden', y > lastY && y > 400);
      }
      lastY = y;
    }
  });

  /* ---------- Découpage des titres en lettres ---------- */
  function split(el) {
    if (el.dataset.split === 'done') return [];
    el.dataset.split = 'done';
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    var chars = [];
    (function walk(node) {
      Array.from(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            Array.from(part).forEach(function (ch) {
              var c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
              w.appendChild(c); chars.push(c);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.matches('svg,img,br')) {
          if (n.matches('small,.sub')) n.setAttribute('aria-hidden', 'true');
          walk(n);
        }
      });
    })(el);
    return chars;
  }

  function revealTitle(el, opts) {
    var chars = split(el);
    if (!chars.length) return;
    gsap.set(chars, { yPercent: 115, rotate: 8, opacity: 0 });
    return gsap.to(chars, Object.assign({
      yPercent: 0, rotate: 0, opacity: 1, duration: 1, ease: 'expo.out',
      stagger: { each: 0.018, from: 'start' },
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    }, opts || {}));
  }

  /* ---------- Rideau entre les pages ---------- */
  var curtain = document.querySelector('.curtain');
  if (curtain) {
    if (html.classList.contains('arriving')) {
      gsap.fromTo(curtain, { y: 0, yPercent: 0 }, {
        yPercent: -100, duration: 1, ease: 'expo.inOut', delay: 0.1,
        onStart: uncurtain, onComplete: function () { gsap.set(curtain, { yPercent: 100 }); }
      });
    } else gsap.set(curtain, { y: 0, yPercent: 100 });

    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.protocol.indexOf('http') !== 0) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      try { sessionStorage.setItem('kweni-nav', '1'); } catch (err) {}
      gsap.to(curtain, { y: 0, yPercent: 0, duration: 0.75, ease: 'expo.inOut', onComplete: function () { location.href = url.href; } });
    });
    window.addEventListener('pageshow', function (e) { if (e.persisted) gsap.set(curtain, { yPercent: 100 }); });
  }

  /* ---------- Écran d'ouverture (accueil, une fois par session) ---------- */
  var loader = document.getElementById('loader');
  var seen = false;
  try { seen = sessionStorage.getItem('kweni-intro') === '1'; } catch (err) {}
  if (loader && !seen && !html.classList.contains('arriving')) {
    try { sessionStorage.setItem('kweni-intro', '1'); } catch (err) {}
    if (lenis) lenis.stop();
    var gems = loader.querySelectorAll('.lg');
    var count = loader.querySelector('.lcount');
    var n = { v: 0 };
    var tl = gsap.timeline({
      onComplete: function () { loader.remove(); if (lenis) lenis.start(); }
    });
    tl.from(gems, { scale: 0, rotate: -180, duration: 0.7, ease: 'back.out(2)', stagger: 0.08 })
      .to(n, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: function () { count.textContent = Math.round(n.v); } }, 0)
      .from(loader.querySelectorAll('.lword .c'), { yPercent: 110, duration: 0.8, ease: 'expo.out', stagger: 0.04 }, 0.2)
      .to(gems, { x: 0, y: 0, duration: 0.6, ease: 'expo.in', stagger: 0.03 }, 1.2)
      .to(gems, { scale: 2.4, opacity: 0, duration: 0.4, ease: 'power2.out' }, 1.8)
      .to(loader.querySelectorAll('.lword, .lcount'), { yPercent: -60, opacity: 0, duration: 0.5, ease: 'power3.in' }, 1.7)
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 2.0)
      .add(ready, 2.2);
  } else {
    if (loader) loader.remove();
    gsap.delayedCall(html.classList.contains('arriving') ? 0.5 : 0, ready);
  }

  /* ---------- Titres et contenus ---------- */
  document.querySelectorAll('.d1, .d2, .d3').forEach(function (el) {
    if (el.closest('.hero, .manifesto, .halls, .loader')) return;
    if (el.closest('.page-hero, .gp-hero')) {
      var chars = split(el);
      gsap.set(chars, { yPercent: 115, rotate: 8, opacity: 0 });
      window.addEventListener('kweni:ready', function () {
        gsap.to(chars, { yPercent: 0, rotate: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: 0.025, delay: 0.1 });
      }, { once: true });
    } else revealTitle(el);
  });

  var intro = gsap.utils.toArray('.page-hero .lede, .page-hero .crumb, .gp-hero .gp-meta, .gp-hero .actions, .gp-hero .crumb');
  if (intro.length) {
    gsap.set(intro, { y: 30, opacity: 0 });
    window.addEventListener('kweni:ready', function () {
      gsap.to(intro, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.5 });
    }, { once: true });
  }

  var items = '.section .lede, .section .actions, .quote, .news li, .features li, .beliefs > div, .book, .games > .game, .dl, .contact-list li, .facts-table tr, .play-panel, .form .field, .kicker, .textlink, .disclaimer';
  gsap.utils.toArray(items).forEach(function (el) {
    if (el.closest('.halls, .hero, .page-hero, .gp-hero')) return;
    gsap.set(el, { y: 50, opacity: 0 });
  });
  ScrollTrigger.batch(items, {
    start: 'top 90%', once: true,
    onEnter: function (batch) {
      batch = batch.filter(function (el) { return !el.closest('.halls, .hero, .page-hero, .gp-hero'); });
      gsap.to(batch, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true });
    }
  });

  /* ---------- Arches : ouverture + parallaxe ---------- */
  function archReveal(arch, st) {
    var inner = arch.querySelector('.arch-in');
    var media = arch.querySelectorAll('.arch-in img, .arch-in svg');
    var tl = gsap.timeline({ scrollTrigger: st });
    tl.fromTo(inner, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
      .fromTo(media, { scale: 1.45 }, { scale: 1.12, duration: 1.8, ease: 'expo.out' }, 0.1)
      .fromTo(arch, { '--k': 0 }, { '--k': 1, duration: 1.2, ease: 'expo.out' }, 0.5);
    return media;
  }

  gsap.utils.toArray('.arch').forEach(function (arch) {
    if (arch.closest('.halls')) return;
    var media = archReveal(arch, { trigger: arch, start: 'top 80%', once: true });
    gsap.to(media, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: arch, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- Héros des pages jeu ---------- */
  var gpBg = document.querySelector('.gp-hero .bg');
  if (gpBg) {
    gsap.fromTo(gpBg, { scale: 1.25, opacity: 0 }, { scale: 1.08, opacity: 1, duration: 2.4, ease: 'expo.out' });
    gsap.to(gpBg, { yPercent: 25, ease: 'none', scrollTrigger: { trigger: '.gp-hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.gp-hero .wrap', { yPercent: -30, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.gp-hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  var ph = document.querySelector('.page-hero .d1');
  if (ph) gsap.to(ph, { yPercent: 40, ease: 'none', scrollTrigger: { trigger: '.page-hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- Accueil : sortie du héros ---------- */
  var heroInner = document.querySelector('.hero-inner');
  if (heroInner) {
    gsap.to(heroInner, { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Accueil : le musée ---------- */
  var halls = document.querySelector('.halls');
  if (halls) {
    var track = halls.querySelector('.halls-track');
    var hallEls = gsap.utils.toArray('.hall');
    var tint = halls.querySelector('.halls-tint');
    var pbar = halls.querySelector('.halls-progress b');
    var counter = halls.querySelector('.halls-count b');

    var mm = gsap.matchMedia();
    mm.add('(min-width: 1000px)', function () {
      halls.classList.add('js-hscroll');
      var dist = function () { return track.scrollWidth - window.innerWidth; };
      var scroller = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: halls, start: 'top top', end: function () { return '+=' + dist() * 1.15; },
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          snap: { snapTo: 1 / (hallEls.length - 1), duration: { min: 0.3, max: 0.8 }, delay: 0.12, ease: 'power3.inOut' },
          onUpdate: function (s) {
            if (pbar) pbar.style.transform = 'scaleX(' + s.progress + ')';
            var i = Math.round(s.progress * (hallEls.length - 1));
            if (counter && counter.textContent !== String(i + 1)) {
              gsap.fromTo(counter, { yPercent: 100 }, { yPercent: 0, duration: 0.4, ease: 'expo.out' });
              counter.textContent = i + 1;
            }
          }
        }
      });

      // Clavier : amène la salle focalisée à l'écran
      track.addEventListener('focusin', function (e) {
        var hall = e.target.closest('.hall'); if (!hall) return;
        var st0 = scroller.scrollTrigger;
        var y = st0.start + (st0.end - st0.start) * Math.min(1, hall.offsetLeft / dist());
        if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y);
      });

      hallEls.forEach(function (hall, i) {
        var st = { trigger: hall, containerAnimation: scroller, start: 'left 75%', toggleActions: 'play none none reverse' };
        var title = hall.querySelector('.hall-title');
        var chars = split(title);
        var bits = hall.querySelectorAll('.hall-num, .hall-genre, .pitch, .actions');
        var media = archReveal(hall.querySelector('.arch'), st);
        gsap.fromTo(chars, { yPercent: 115, rotate: 10, opacity: 0 }, { yPercent: 0, rotate: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.02, scrollTrigger: st });
        gsap.fromTo(bits, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.25, scrollTrigger: st });
        // Parallaxe interne : l'image glisse dans l'arche
        gsap.fromTo(media, { xPercent: 10 }, { xPercent: -10, ease: 'none', scrollTrigger: { trigger: hall, containerAnimation: scroller, start: 'left right', end: 'right left', scrub: true } });
        // Le grand numéro traverse plus vite
        var ghost = hall.querySelector('.hall-ghost');
        gsap.fromTo(ghost, { xPercent: 60 }, { xPercent: -60, ease: 'none', scrollTrigger: { trigger: hall, containerAnimation: scroller, start: 'left right', end: 'right left', scrub: true } });
        // Couleur d'ambiance
        ScrollTrigger.create({
          trigger: hall, containerAnimation: scroller, start: 'left 50%', end: 'right 50%',
          onToggle: function (s) { if (s.isActive && tint) gsap.to(tint, { backgroundColor: hall.style.getPropertyValue('--accent'), duration: 0.9, ease: 'power2.out' }); }
        });
      });

      return function () { halls.classList.remove('js-hscroll'); gsap.set(track, { clearProps: 'all' }); };
    });

    mm.add('(max-width: 999px)', function () {
      hallEls.forEach(function (hall) {
        var st = { trigger: hall, start: 'top 70%', once: true };
        archReveal(hall.querySelector('.arch'), st);
        revealTitle(hall.querySelector('.hall-title'), { scrollTrigger: st });
        gsap.fromTo(hall.querySelectorAll('.hall-num, .hall-genre, .pitch, .actions'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.2, scrollTrigger: st });
      });
    });

    // Titre de section
    revealTitle(halls.querySelector('.halls-head .d2'));
  }

  /* ---------- Manifeste ---------- */
  var mani = document.querySelector('.manifesto');
  if (mani) {
    var lines = mani.querySelectorAll('.d1 > span');
    lines.forEach(function (line, i) {
      gsap.fromTo(line, { xPercent: i % 2 ? 40 : -40 }, {
        xPercent: 0, ease: 'none',
        scrollTrigger: { trigger: mani, start: 'top bottom', end: 'center 55%', scrub: 1 }
      });
    });
    gsap.fromTo(mani, { clipPath: 'polygon(0 12%, 100% 0, 100% 88%, 0 100%)' }, {
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', ease: 'none',
      scrollTrigger: { trigger: mani, start: 'top bottom', end: 'top 30%', scrub: true }
    });
  }

  /* ---------- Bandeau défilant, vitesse liée au scroll ---------- */
  gsap.utils.toArray('.marquee').forEach(function (m) {
    var inner = m.querySelector('.marquee-in');
    var loop = gsap.to(inner, { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
    var dir = 1;
    ScrollTrigger.create({
      trigger: m, start: 'top bottom', end: 'bottom top',
      onUpdate: function (s) {
        dir = s.direction;
        var v = Math.min(6, Math.abs(s.getVelocity()) / 300 + 1);
        gsap.to(loop, { timeScale: v * dir, duration: 0.3, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.3, ease: 'power2.out' });
      }
    });
    gsap.to(inner.querySelectorAll('i'), { rotate: 405, duration: 6, ease: 'none', repeat: -1 });
  });

  /* ---------- Frises chronologiques ---------- */
  gsap.utils.toArray('.timeline').forEach(function (tl) {
    gsap.fromTo(tl, { '--draw': 0 }, { '--draw': 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 75%', end: 'bottom 60%', scrub: true } });
    tl.querySelectorAll('li').forEach(function (li) {
      gsap.set(li, { '--pop': 0, opacity: 0.15 });
      ScrollTrigger.create({
        trigger: li, start: 'top 72%', once: true,
        onEnter: function () {
          gsap.to(li, { '--pop': 1, duration: 0.8, ease: 'back.out(3)' });
          gsap.to(li, { opacity: 1, duration: 0.8, ease: 'power2.out' });
          gsap.from(li.querySelectorAll('.when, h3, p, .state'), { x: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06 });
        }
      });
    });
  });

  /* ---------- Couvertures de livres ---------- */
  gsap.utils.toArray('.cover').forEach(function (c) {
    gsap.fromTo(c, { rotateY: -35, rotateZ: -4 }, { rotateY: 0, rotateZ: 0, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'center 50%', scrub: true } });
  });

  /* ---------- Pied de page : signature géante ---------- */
  var mark = document.querySelector('.footer-mark');
  if (mark) {
    var mc = split(mark);
    gsap.fromTo(mc, { yPercent: 100 }, { yPercent: 0, ease: 'expo.out', stagger: 0.05, duration: 1.2, scrollTrigger: { trigger: mark, start: 'top 95%', once: true } });
  }

  /* ---------- Interactions souris (ordinateur) ---------- */
  if (fine) {
    // Curseur
    var dot = document.querySelector('.cursor'), ring = document.querySelector('.cursor-ring');
    if (dot && ring) {
      html.classList.add('has-cursor');
      var label = ring.querySelector('span');
      var dx = gsap.quickTo(dot, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
      var rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
      window.addEventListener('pointermove', function (e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); html.classList.add('cursor-on'); }, { passive: true });
      document.addEventListener('pointerleave', function () { html.classList.remove('cursor-on'); });
      document.addEventListener('pointerover', function (e) {
        var t = e.target.closest('[data-cursor], a, button, input, select, textarea, label');
        ring.classList.toggle('is-link', !!t && !t.matches('input, select, textarea'));
        ring.classList.toggle('is-text', !!t && t.matches('input, textarea'));
        var txt = t && t.getAttribute('data-cursor');
        ring.classList.toggle('is-label', !!txt);
        label.textContent = txt || '';
      });
      window.addEventListener('pointerdown', function () { gsap.to(ring, { scale: 0.8, duration: 0.15 }); });
      window.addEventListener('pointerup', function () { gsap.to(ring, { scale: 1, duration: 0.4, ease: 'elastic.out(1,0.4)' }); });
      window.addEventListener('kweni:stone', function (e) {
        ring.classList.toggle('is-label', !!e.detail);
        label.textContent = e.detail || '';
      });
    }

    // Boutons magnétiques
    gsap.utils.toArray('.btn, .sound, .brand, .menu-btn').forEach(function (b) {
      var xTo = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
      var yTo = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });

    // Cartes inclinables avec reflet
    gsap.utils.toArray('.game, .dl, .play-panel').forEach(function (card) {
      var rX = gsap.quickTo(card, 'rotateX', { duration: 0.6, ease: 'power3' });
      var rY = gsap.quickTo(card, 'rotateY', { duration: 0.6, ease: 'power3' });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        rY((px - 0.5) * 8); rX((0.5 - py) * 8);
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
      });
      card.addEventListener('pointerleave', function () { rX(0); rY(0); });
    });

    // Arches : l'image suit légèrement la souris
    gsap.utils.toArray('.arch').forEach(function (arch) {
      var inner = arch.querySelector('.arch-in');
      var ix = gsap.quickTo(inner, 'x', { duration: 0.8, ease: 'power3' });
      var iy = gsap.quickTo(inner, 'y', { duration: 0.8, ease: 'power3' });
      arch.addEventListener('pointermove', function (e) {
        var r = arch.getBoundingClientRect();
        ix(((e.clientX - r.left) / r.width - 0.5) * 16);
        iy(((e.clientY - r.top) / r.height - 0.5) * 16);
      });
      arch.addEventListener('pointerleave', function () { ix(0); iy(0); });
    });
  }

  /* ---------- Menu mobile : entrée en cascade ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      if (document.body.classList.contains('nav-open')) {
        gsap.fromTo('.nav-links li', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05, delay: 0.05 });
      }
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
