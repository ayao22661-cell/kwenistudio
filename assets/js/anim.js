/* Kweni Studio — couche d'animations v6
   Règles : rien n'est caché si ce script ne tourne pas ; aucune animation ne touche
   la grille des salles (transformations et clip-path uniquement) ; tout est coupé
   si l'utilisateur a demandé « réduire les animations ». */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  root.classList.add('anim-on');
  var $ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var vh = window.innerHeight;
  window.addEventListener('resize', function () { vh = window.innerHeight; });

  /* ---------- 1. Rideau d'ouverture ---------- */
  // Raccord « Kubrick » : si le navigateur sait enchaîner les pages, l'image cliquée
  // devient le visuel de la page suivante. Sinon, rideau découpé façon Saul Bass.
  var vt = 'PageRevealEvent' in window;
  if (!vt) {
    var curtain = document.createElement('div');
    curtain.className = 'k-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    curtain.innerHTML = '<i></i><i></i><i></i><i></i>';
    document.body.appendChild(curtain);
    requestAnimationFrame(function () { requestAnimationFrame(function () { curtain.classList.add('go'); }); });
    setTimeout(function () { curtain.remove(); }, 1300);
  }
  function clearNames() { $('[data-vt]').forEach(function (n) { n.style.viewTransitionName = ''; n.removeAttribute('data-vt'); }); }

  // Rideau aussi en quittant la page (liens internes)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var href = a.getAttribute('href') || '';
    if (!href || href[0] === '#' || /^(mailto|tel|https?:)/.test(href) || a.hasAttribute('download')) return;
    if (vt) {
      clearNames();
      var media = a.matches('.arch') ? a.querySelector('.arch-in') : a.querySelector('.game-media');
      if (media && /jeux\//.test(a.getAttribute('href'))) { media.style.viewTransitionName = 'k-hero'; media.setAttribute('data-vt', ''); }
      return;
    }
    e.preventDefault();
    var out = document.createElement('div');
    out.className = 'k-curtain out';
    out.setAttribute('aria-hidden', 'true');
    out.innerHTML = '<i></i><i></i><i></i><i></i>';
    document.body.appendChild(out);
    requestAnimationFrame(function () { out.classList.add('go'); });
    setTimeout(function () { window.location.href = a.href; }, 520);
  });
  window.addEventListener('pageshow', function (e) { clearNames(); if (e.persisted) $('.k-curtain.out').forEach(function (n) { n.remove(); }); });

  /* ---------- 2. Barre de progression ---------- */
  var bar = document.createElement('div');
  bar.className = 'k-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  /* ---------- 3. En-tête : liens en cascade + masquage au défilement ---------- */
  $('.nav-links a, .site-header .brand').forEach(function (a, i) {
    a.classList.add('k-drop');
    a.style.animationDelay = (0.55 + i * 0.07) + 's';
  });
  var header = document.querySelector('.site-header');

  /* ---------- 4. Titres découpés en mots ---------- */
  function splitWords(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span'); w.className = 'k-w';
            var inner = document.createElement('span'); inner.textContent = p;
            inner.style.transitionDelay = (n++ * 55) + 'ms';
            w.appendChild(inner); frag.appendChild(w);
          });
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && !c.classList.contains('badge') && !c.classList.contains('sr')) walk(c);
      });
    })(el);
  }
  var heads = $('.d2, .d3, .page-hero .d1, .gp-hero .d1').filter(function (h) { return !h.closest('.hero'); });
  heads.forEach(function (h) { h.classList.remove('rv', 'in'); h.style.transitionDelay = ''; splitWords(h); h.classList.add('k-split'); });

  /* ---------- 5. Observateur générique ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (x) {
      if (x.isIntersecting) { x.target.classList.add('k-in'); io.unobserve(x.target); }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
  heads.forEach(function (h) { io.observe(h); });

  // Médias des cartes : dévoilement en volet
  $('.game-media, .cover, .thumb, .plate, .still, .news-img').forEach(function (m) { m.classList.add('k-wipe'); io.observe(m); });
  // Frise : trait qui se dessine
  $('.timeline').forEach(function (t) { t.classList.add('k-line'); io.observe(t); });
  $('.timeline li').forEach(function (li) { li.classList.add('k-pop'); io.observe(li); });
  // Grande signature du pied de page : lettres en vague
  $('.footer-mark').forEach(function (f) {
    var txt = f.textContent; f.textContent = '';
    txt.split('').forEach(function (ch, i) {
      var s = document.createElement('span');
      s.textContent = ch === ' ' ? '\u00a0' : ch;
      s.style.transitionDelay = (i * 40) + 'ms';
      s.style.setProperty('--i', i);
      f.appendChild(s);
    });
    f.classList.add('k-wave'); io.observe(f);
  });
  // Pierres du hero : pulsation en cascade
  $('.hero .elements li').forEach(function (li, i) { li.style.setProperty('--d', (i * 0.35) + 's'); li.classList.add('k-stone'); });

  // Compteurs (nombres seuls)
  $('.facts span, .facts b, .facts strong, .gp-meta b, .gp-meta strong, .facts-table td').forEach(function (el) {
    if (el.children.length) return;
    var m = el.textContent.trim().match(/^(\d{1,5})(\D{0,12})$/);
    if (!m) return;
    var end = +m[1], suf = m[2];
    if (end < 3) return;
    var cio = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; cio.disconnect();
      var t0 = performance.now(), dur = 1400;
      (function step(t) {
        var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * e) + suf;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
    cio.observe(el);
  });

  /* ---------- 6. Le musée : salles ---------- */
  var halls = $('.hall');
  var tint = document.querySelector('.halls-tint');
  var countB = document.querySelector('.halls-count b');
  halls.forEach(function (h) {
    h.classList.add('k-hall');
    $('.hall-text > *', h).forEach(function (c, i) { c.style.transitionDelay = (0.15 + i * 0.09) + 's'; });
  });
  var hio = new IntersectionObserver(function (entries) {
    entries.forEach(function (x) {
      if (x.isIntersecting) x.target.classList.add('k-in');
    });
  }, { threshold: 0.3 });
  halls.forEach(function (h) { hio.observe(h); });

  // Salle active = celle au centre de l'écran : teinte + compteur
  var active = -1;
  var accents = halls.map(function (h) { return getComputedStyle(h).getPropertyValue('--accent').trim() || '#E8121A'; });
  function setActive(i) {
    if (i === active || i < 0) return;
    active = i;
    var acc = getComputedStyle(halls[i]).getPropertyValue('--accent').trim();
    if (countB) { countB.textContent = i + 1; countB.classList.remove('k-flip'); void countB.offsetWidth; countB.classList.add('k-flip'); }
    halls.forEach(function (h, j) { h.classList.toggle('k-active', j === i); });
  }

  // Particules (braises) dans le musée
  var hallsSec = document.querySelector('.halls');
  if (false) {
    var cv = document.createElement('canvas');
    cv.className = 'k-embers'; cv.setAttribute('aria-hidden', 'true');
    hallsSec.insertBefore(cv, hallsSec.firstChild);
    var cx = cv.getContext('2d'), parts = [], visible = false, W = 0, H = 0, color = '#E8121A';
    function size() { W = cv.width = hallsSec.clientWidth; H = cv.height = vh; }
    size(); window.addEventListener('resize', size);
    for (var k = 0; k < 55; k++) parts.push({ x: Math.random(), y: Math.random(), r: Math.random() * 2 + .4, s: Math.random() * .0012 + .0004, w: Math.random() * 6.28 });
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(hallsSec);
    function draw() {
      if (!visible) return;
      if (active >= 0) color = getComputedStyle(halls[active]).getPropertyValue('--accent').trim() || color;
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = color;
      parts.forEach(function (p) {
        p.y -= p.s; p.w += .02;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        cx.globalAlpha = .25 + Math.sin(p.w) * .2;
        cx.beginPath(); cx.arc(p.x * W + Math.sin(p.w) * 12, p.y * H, p.r, 0, 6.28); cx.fill();
      });
      requestAnimationFrame(draw);
    }
  }

  /* ---------- 7. Boucle de défilement (parallaxe, vitesse) ---------- */
  var marquees = $('.marquee-in');
  var lastY = window.scrollY, vel = 0, skew = 0;
  var heroInner = document.querySelector('.hero-inner');
  var heroLines = $('.hero h1 .line');
  var bgs = $('.gp-hero .bg, .page-hero');
  function frame() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    vel = y - lastY; lastY = y;
    skew += (clamp(vel * 0.15, -8, 8) - skew) * 0.12;

    if (header) header.classList.toggle('k-hide', y > 400 && vel > 2 && !document.body.classList.contains('nav-open'));
    if (header && vel < -2) header.classList.remove('k-hide');

    marquees.forEach(function (m) { m.parentNode.style.transform = 'skewX(' + (-skew) + 'deg)'; m.style.animationDuration = (40 / (1 + Math.abs(skew) * .6)) + 's'; });

    if (heroInner && y < vh * 1.2) {
      heroLines.forEach(function (l, i) { l.style.transform = 'translate3d(' + (-y * (0.06 + i * 0.05)) + 'px,' + (-y * (0.12 + i * 0.06)) + 'px,0)'; });
      heroInner.style.opacity = clamp(1 - y / (vh * 0.8), 0, 1);
    }
    bgs.forEach(function (b) {
      var r = b.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      b.style.setProperty('--py', (r.top * -0.25).toFixed(1) + 'px');
    });

    var best = -1, bestD = 1e9;
    halls.forEach(function (h, i) {
      var r = h.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var c = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      var d = Math.abs(c); if (d < bestD) { bestD = d; best = i; }
      h.style.setProperty('--p', c.toFixed(3));
    });
    setActive(best);
    if (tint && halls.length) {
      var centers = halls.map(function (h) { var r = h.getBoundingClientRect(); return r.top + r.height / 2 - vh / 2; });
      var k = 0; while (k < centers.length - 1 && centers[k + 1] < 0) k++;
      var a0 = centers[k], a1 = centers[Math.min(k + 1, centers.length - 1)];
      var t = a1 === a0 ? 0 : clamp(-a0 / (a1 - a0), 0, 1);
      t = t * t * (3 - 2 * t);
      tint.style.setProperty('--ca', accents[k]);
      tint.style.setProperty('--cb', accents[Math.min(k + 1, accents.length - 1)]);
      tint.style.setProperty('--t', t.toFixed(3));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 8. Interactions souris (ordinateur) ---------- */
  if (fine) {
    // Curseur anneau
    var ring = document.createElement('div'); ring.className = 'k-ring'; ring.setAttribute('aria-hidden', 'true');
    var dot = document.createElement('div'); dot.className = 'k-dot'; dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring); document.body.appendChild(dot);
    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)'; }, { passive: true });
    (function loop() { rx += (mx - rx) * .16; ry += (my - ry) * .16; ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; requestAnimationFrame(loop); })();
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest('a,button,.arch,.game,input,textarea,select');
      ring.classList.toggle('big', !!t);
      ring.classList.toggle('play', !!(t && t.matches('.arch,.game')));
    });
    document.addEventListener('mousedown', function () { ring.classList.add('press'); });
    document.addEventListener('mouseup', function () { ring.classList.remove('press'); });
    document.addEventListener('mouseleave', function () { ring.style.opacity = 0; dot.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { ring.style.opacity = ''; dot.style.opacity = ''; });

    // Boutons magnétiques
    $('.btn').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        b.style.transform = 'translate(' + x * .25 + 'px,' + y * .35 + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });

    // Arches et cartes : inclinaison 3D + reflet
    function tilt(el, strength) {
      var glare = document.createElement('span'); glare.className = 'k-glare'; glare.setAttribute('aria-hidden', 'true');
      (el.querySelector('.arch-in') || el).appendChild(glare);
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', ((0.5 - py) * strength).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((px - 0.5) * strength).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (px * 100) + '%');
        el.style.setProperty('--gy', (py * 100) + '%');
        el.classList.add('k-tilting');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
        el.classList.remove('k-tilting');
      });
    }
    $('.arch').forEach(function (a) { tilt(a, 14); });
    $('.game').forEach(function (g) { tilt(g, 7); });

    // Hero : parallaxe souris
    var hero = document.querySelector('.hero');
    if (hero) hero.addEventListener('mousemove', function (e) {
      var x = e.clientX / window.innerWidth - .5, y = e.clientY / vh - .5;
      hero.style.setProperty('--mx', x.toFixed(3));
      hero.style.setProperty('--my', y.toFixed(3));
    });
  }

  /* ---------- 9. Onde au clic sur les boutons ---------- */
  $('.btn').forEach(function (b) {
    b.addEventListener('pointerdown', function (e) {
      var r = b.getBoundingClientRect();
      var s = document.createElement('span'); s.className = 'k-ripple'; s.setAttribute('aria-hidden', 'true');
      s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
      b.appendChild(s); setTimeout(function () { s.remove(); }, 700);
    });
  });
})();
