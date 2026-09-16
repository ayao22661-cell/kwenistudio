/* Kweni Studio — effets avancés v7 (chargé après anim.js)
   Même règle : le contenu reste lisible sans ce script, et tout est coupé en « réduire les animations ». */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&◆▲';
  var PALETTE = ['#E8121A', '#D4A017', '#B5652B', '#2E7BD6', '#CFE3F0', '#EFE8DC'];

  /* ---------- Décodage de texte ---------- */
  function scramble(el, dur) {
    if (el._scr) return;
    var final = el.dataset.txt || (el.dataset.txt = el.textContent);
    var t0 = performance.now(); dur = dur || 700;
    el._scr = true;
    (function step(t) {
      var p = clamp((t - t0) / dur, 0, 1), out = '';
      for (var i = 0; i < final.length; i++) {
        var c = final[i];
        out += (c === ' ' || c === '\u00a0' || i < p * final.length) ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(step); else { el.textContent = final; el._scr = false; }
    })(t0);
  }
  if (fine) $('.nav-links a').forEach(function (a) {
    a.addEventListener('mouseenter', function () {
      if (a.children.length === 0) scramble(a, 450);
      if (window.kweniAudio) window.kweniAudio.tone(220 + Math.random() * 110);
    });
  });

  /* ---------- Titre du hero : lettres magnétiques ---------- */
  var letters = [];
  $('.hero h1 .line > span').forEach(function (s) {
    var txt = s.textContent; s.textContent = '';
    s.setAttribute('aria-hidden', 'true');
    txt.split('').forEach(function (ch, i) {
      var l = document.createElement('span');
      l.className = 'k-l'; l.textContent = ch === ' ' ? '\u00a0' : ch;
      l.style.setProperty('--i', i);
      s.appendChild(l); letters.push({ el: l, x: 0, y: 0, tx: 0, ty: 0 });
    });
  });
  var h1 = document.querySelector('.hero h1');
  if (h1 && letters.length) {
    var sr = document.createElement('span'); sr.className = 'sr';
    sr.textContent = letters.map(function (l) { return l.el.textContent; }).join('').replace(/\u00a0/g, ' ');
    h1.appendChild(sr);
  }
  var mouse = { x: -9999, y: -9999 };
  window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  if (fine && letters.length) {
    (function loop() {
      if (window.scrollY < window.innerHeight) {
        letters.forEach(function (L) {
          var r = L.el.getBoundingClientRect();
          var cx = r.left + r.width / 2 - L.x, cy = r.top + r.height / 2 - L.y;
          var dx = cx - mouse.x, dy = cy - mouse.y, d = Math.sqrt(dx * dx + dy * dy), R = 160;
          if (d < R) { var f = (1 - d / R) * 38; L.tx = dx / (d || 1) * f; L.ty = dy / (d || 1) * f; }
          else { L.tx = 0; L.ty = 0; }
          L.x += (L.tx - L.x) * .15; L.y += (L.ty - L.y) * .15;
          L.el.style.translate = L.x.toFixed(1) + 'px ' + L.y.toFixed(1) + 'px';
          L.el.style.rotate = (L.x * .4).toFixed(1) + 'deg';
          L.el.classList.toggle('hot', Math.abs(L.x) + Math.abs(L.y) > 6);
        });
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Musée : rail de navigation, balayage, décodage, projecteur ---------- */
  var halls = $('.hall');
  var hallsSec = document.querySelector('.halls');
  if (hallsSec && halls.length) {
    var rail = document.createElement('nav');
    rail.className = 'k-rail'; rail.setAttribute('aria-label', 'Salles du musée');
    halls.forEach(function (h, i) {
      var t = h.querySelector('.hall-title');
      var name = t ? (t.dataset.name || t.childNodes[0].textContent || t.textContent).trim() : 'Salle ' + (i + 1);
      if (t) name = t.textContent.replace(t.querySelector('small') ? t.querySelector('small').textContent : '', '').trim();
      var b = document.createElement('button');
      b.type = 'button';
      b.style.setProperty('--accent', getComputedStyle(h).getPropertyValue('--accent'));
      b.innerHTML = '<i></i><span>' + String(i + 1).padStart(2, '0') + ' ' + name + '</span>';
      b.setAttribute('aria-label', 'Aller à la salle ' + (i + 1) + ' : ' + name);
      b.addEventListener('click', function () { h.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      rail.appendChild(b);

      var sweep = document.createElement('span'); sweep.className = 'k-sweep'; sweep.setAttribute('aria-hidden', 'true');
      var spot = document.createElement('span'); spot.className = 'k-spot'; spot.setAttribute('aria-hidden', 'true');
      h.appendChild(sweep); h.appendChild(spot);
      if (fine) h.addEventListener('mousemove', function (e) {
        var r = h.getBoundingClientRect();
        h.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        h.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
    });
    var fill = document.createElement('b'); fill.className = 'k-rail-fill'; rail.appendChild(fill);
    document.body.appendChild(rail);

    new IntersectionObserver(function (e) { rail.classList.toggle('on', e[0].isIntersecting); }, { rootMargin: '-35% 0px -35% 0px' }).observe(hallsSec);

    var lastActive = null;
    new MutationObserver(function () {
      var cur = hallsSec.querySelector('.hall.k-active');
      if (!cur || cur === lastActive) return;
      lastActive = cur;
      var idx = halls.indexOf(cur);
      $('button', rail).forEach(function (b, j) { b.classList.toggle('cur', j === idx); });
      fill.style.transform = 'scaleY(' + ((idx + 1) / halls.length) + ')';
      fill.style.background = getComputedStyle(cur).getPropertyValue('--accent');
      var sw = cur.querySelector('.k-sweep');
      sw.classList.remove('go'); void sw.offsetWidth; sw.classList.add('go');
      var ttl = cur.querySelector('.hall-title');
      if (ttl) { ttl.classList.remove('k-ink'); void ttl.offsetWidth; ttl.classList.add('k-ink'); }
      $('.hall-title .k-w > span', cur).forEach(function (s, k) {
        if (s.closest('small')) return;
        setTimeout(function () { scramble(s, 650); }, k * 90);
      });
      if (window.kweniAudio) window.kweniAudio.tone(130 + idx * 30);
    }).observe(hallsSec, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }


  /* ---------- Cartels de musée (interface dans le décor, façon Dead Space) ---------- */
  $('.hall').forEach(function (h, i) {
    var arch = h.querySelector('.arch'), t = h.querySelector('.hall-title'), g = h.querySelector('.hall-genre');
    if (!arch || !t) return;
    var small = t.querySelector('small');
    var name = t.textContent.replace(small ? small.textContent : '', '').replace(/\s+/g, ' ').trim();
    var c = document.createElement('span');
    c.className = 'k-cartel'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<em>Salle ' + (i + 1) + '</em><b></b><span></span>';
    c.querySelector('b').textContent = name;
    c.querySelector('span').textContent = g ? g.textContent : '';
    arch.appendChild(c);
  });

  /* ---------- Plans multiples (caméra multiplane) dans les visuels dessinés ---------- */
  var planes = [];
  $('.arch-in svg, .hero-fallback svg, .gp-hero .bg svg').forEach(function (svg) {
    var gs = $(':scope > g, :scope > circle, :scope > path', svg);
    gs.forEach(function (g, i) { planes.push({ svg: svg, el: g, depth: (i + 1) / gs.length }); });
  });
  if (planes.length) (function loop() {
    var vh = window.innerHeight, cache = new Map();
    planes.forEach(function (pl) {
      var c = cache.get(pl.svg);
      if (c === undefined) {
        var r = pl.svg.getBoundingClientRect();
        c = (r.bottom < 0 || r.top > vh) ? null : clamp((r.top + r.height / 2 - vh / 2) / vh, -1, 1);
        cache.set(pl.svg, c);
      }
      if (c === null) return;
      pl.el.style.translate = '0 ' + (c * pl.depth * 28).toFixed(1) + 'px';
    });
    requestAnimationFrame(loop);
  })();

  /* ---------- Vitesse de défilement : étirement élastique ---------- */
  var lastY = window.scrollY, sv = 0;
  (function loop() {
    var v = window.scrollY - lastY; lastY = window.scrollY;
    sv += (clamp(v / 400, -0.12, 0.12) - sv) * .1;
    document.documentElement.style.setProperty('--sv', sv.toFixed(4));
    requestAnimationFrame(loop);
  })();

  /* ---------- Signature du pied de page qui se remplit ---------- */
  var mark = document.querySelector('.footer-mark');
  if (mark) {
    window.addEventListener('scroll', function () {
      var r = mark.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh - r.top) / (vh * 0.7), 0, 1);
      var spans = mark.children, n = spans.length;
      for (var i = 0; i < n; i++) spans[i].classList.toggle('lit', i < p * n);
      mark.classList.toggle('full', p >= 1);
    }, { passive: true });
  }

  /* ---------- Distorsion liquide des images au survol ---------- */
  if (fine) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var defs = document.createElementNS(svgNS, 'svg');
    defs.setAttribute('aria-hidden', 'true'); defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
    defs.style.position = 'absolute';
    defs.innerHTML = '<filter id="k-liquid"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>';
    document.body.appendChild(defs);
    var turb = defs.querySelector('feTurbulence'), disp = defs.querySelector('feDisplacementMap');
    var amt = 0, target = 0, tick = 0, running = false;
    function run() {
      running = true;
      amt += (target - amt) * .08; tick += .015;
      disp.setAttribute('scale', amt.toFixed(2));
      turb.setAttribute('baseFrequency', (0.012 + Math.sin(tick) * .004).toFixed(4) + ' ' + (0.02 + Math.cos(tick) * .006).toFixed(4));
      if (target === 0 && amt < .3) { disp.setAttribute('scale', 0); running = false; $('.k-liquid').forEach(function (i) { i.classList.remove('k-liquid'); }); return; }
      requestAnimationFrame(run);
    }
    $('.game, .arch').forEach(function (el) {
      var img = el.querySelector('img');
      if (!img) return;
      el.addEventListener('mouseenter', function () { $('.k-liquid').forEach(function (i) { i.classList.remove('k-liquid'); }); img.classList.add('k-liquid'); target = 22; if (!running) run(); });
      el.addEventListener('mouseleave', function () { target = 0; });
    });
  }

  /* ---------- Étincelles : traînée de souris et explosion au clic ---------- */
  var cv = document.createElement('canvas');
  cv.className = 'k-sparks'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  var cx = cv.getContext('2d'), P = [], W, H, dpr = Math.min(window.devicePixelRatio || 1, 2), animating = false;
  function size() { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); window.addEventListener('resize', size);
  function accentAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var h = el && el.closest('[style*="--accent"], .hall, .game');
    var a = h && getComputedStyle(h).getPropertyValue('--accent').trim();
    return a || '#E8121A';
  }
  function spawn(x, y, n, speed, color, gravity) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, s = speed * (.4 + Math.random() * .8);
      P.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * .3, life: 1, dec: .012 + Math.random() * .02, sz: 3 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .3, c: color || PALETTE[(Math.random() * PALETTE.length) | 0], g: gravity == null ? .18 : gravity });
    }
    if (!animating) { animating = true; requestAnimationFrame(draw); }
  }
  function draw() {
    cx.clearRect(0, 0, W, H);
    for (var i = P.length - 1; i >= 0; i--) {
      var p = P[i];
      p.vx *= .97; p.vy = p.vy * .97 + p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.dec;
      if (p.life <= 0 || p.y > H + 20) { P.splice(i, 1); continue; }
      cx.save(); cx.globalAlpha = p.life; cx.fillStyle = p.c;
      cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz); cx.restore();
    }
    if (P.length) requestAnimationFrame(draw); else { animating = false; cx.clearRect(0, 0, W, H); }
  }
  document.addEventListener('pointerdown', function (e) {
    var hot = e.target.closest('.btn-play');
    if (hot) spawn(e.clientX, e.clientY, 16, 6, accentAt(e.clientX, e.clientY));
  });

  /* ---------- Étiquette dans l'anneau du curseur ---------- */
  var ring = document.querySelector('.k-ring');
  if (ring) {
    var lab = document.createElement('span'); lab.className = 'k-ring-label'; ring.appendChild(lab);
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest('.arch, .game');
      lab.textContent = t ? (t.matches('.arch') ? 'Visiter' : 'Voir') : '';
    });
  }

  /* ---------- Réveil des cinq pierres : automatique, léger, une fois par visite ---------- */
  function awaken() {
    if (document.querySelector('.k-toast')) return;
    var toast = document.createElement('div'); toast.className = 'k-toast'; toast.setAttribute('role', 'status');
    toast.textContent = 'Les cinq pierres de Kankou Moussa sont réveillées.';
    document.body.appendChild(toast); setTimeout(function () { toast.remove(); }, 3200);
        var per = fine ? 3 : 2, n = 0, iv = setInterval(function () {
      for (var k = 0; k < per; k++) P.push({ x: Math.random() * W, y: -20, vx: (Math.random() - .5), vy: 2 + Math.random() * 2, life: 1, dec: .008, sz: 7 + Math.random() * 7, rot: .785, vr: (Math.random() - .5) * .06, c: PALETTE[(Math.random() * 5) | 0], g: .04 });
      if (!animating) { animating = true; requestAnimationFrame(draw); }
      if (++n > 14) clearInterval(iv);
    }, 90);
  }
  window.addEventListener('scroll', function () { if (window.scrollY > 80) P.forEach(function (p) { p.dec = Math.max(p.dec, .06); }); }, { passive: true });
  var stones = document.querySelector('.hero .elements');
  if (stones) {
    var seen = false;
    try { seen = sessionStorage.getItem('k-awake') === '1'; } catch (e) {}
    if (!seen) setTimeout(function () {
      if (window.scrollY > window.innerHeight * .5) return;
      awaken();
      try { sessionStorage.setItem('k-awake', '1'); } catch (e) {}
    }, 2800);
    stones.style.pointerEvents = 'auto';
    stones.addEventListener('click', awaken);
  }
})();
