/* Kweni Studio — animations (version simplifiée et robuste)
   Principe : le contenu est visible par défaut. Rien ne reste caché si un script échoue. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Apparitions douces au défilement ---------- */
  var sel = '.section .d2, .section .d3, .section .lede, .quote, .news li, .features li, .beliefs > div, .book, .games > .game, .dl, .contact-list li, .play-panel, .timeline li, .page-hero .d1, .page-hero .lede, .gp-hero .wrap > *';
  if (!reduce && 'IntersectionObserver' in window) {
    var els = Array.prototype.filter.call(document.querySelectorAll(sel), function (e) { return !e.closest('.halls'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (x) {
        if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) {
      var sibs = Array.prototype.indexOf.call(e.parentNode.children, e);
      e.style.transitionDelay = (Math.min(sibs, 4) * 70) + 'ms';
      e.classList.add('rv');
      io.observe(e);
    });
  }

  /* ---------- Galerie horizontale des salles (accueil, grand écran) ---------- */
  var halls = document.querySelector('.halls');
  if (!halls || reduce || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var track = halls.querySelector('.halls-track');
  var hallEls = halls.querySelectorAll('.hall');
  var tint = halls.querySelector('.halls-tint');
  var bar = halls.querySelector('.halls-progress b');
  var counter = halls.querySelector('.halls-count b');
  var current = 0;

  var mm = gsap.matchMedia();
  mm.add('(min-width: 1000px)', function () {
    try {
      halls.classList.add('js-hscroll');
      var dist = function () { return track.scrollWidth - window.innerWidth; };
      var tween = gsap.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: halls,
          start: 'top top',
          end: function () { return '+=' + dist(); },
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / (hallEls.length - 1), duration: { min: 0.2, max: 0.5 }, delay: 0.1 },
          onUpdate: function (s) {
            if (bar) bar.style.transform = 'scaleX(' + s.progress + ')';
            var i = Math.round(s.progress * (hallEls.length - 1));
            if (i !== current) {
              current = i;
              if (counter) counter.textContent = i + 1;
              if (tint) tint.style.backgroundColor = hallEls[i].style.getPropertyValue('--accent');
            }
          }
        }
      });

      // Clavier : amène la salle focalisée à l'écran
      track.addEventListener('focusin', function (e) {
        var hall = e.target.closest('.hall'); if (!hall) return;
        var st = tween.scrollTrigger;
        window.scrollTo(0, st.start + (st.end - st.start) * Math.min(1, hall.offsetLeft / dist()));
      });

      return function () { halls.classList.remove('js-hscroll'); gsap.set(track, { clearProps: 'all' }); };
    } catch (e) {
      halls.classList.remove('js-hscroll');
      gsap.set(track, { clearProps: 'all' });
    }
  });

  // Recalcule les positions quand la page est vraiment prête (polices, images)
  function refresh() { ScrollTrigger.refresh(); }
  window.addEventListener('load', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
})();
