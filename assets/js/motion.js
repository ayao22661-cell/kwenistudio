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
})();
