/* Kweni Studio — interactions communes */
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // En-tête au défilement
  var header = document.querySelector('.site-header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 30); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Menu mobile
  var btn = document.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    });
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('nav-open'); btn.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { btn.click(); btn.focus(); }
    });
  }

  // Menu : pas de défilement de fond
  // Images manquantes : on garde le visuel SVG de secours
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    function drop() { img.remove(); }
    if (img.complete && img.naturalWidth === 0) drop();
    else img.addEventListener('error', drop);
  });

  // Formulaire de contact : ouvre la messagerie avec le message prêt
  var form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      var f = new FormData(form);
      var name = (f.get('nom') || '').trim(), mail = (f.get('email') || '').trim(), msg = (f.get('message') || '').trim();
      if (!name || !mail || !msg) { status.textContent = 'Remplis ton nom, ton email et ton message.'; return; }
      var subject = '[' + f.get('sujet') + '] ' + name;
      var body = msg + '\n\n— ' + name + '\n' + mail;
      window.location.href = 'mailto:kwenistudio@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      status.textContent = 'Ta messagerie s\'ouvre avec le message prêt. Il ne reste qu\'à l\'envoyer.';
    });
  }

  // Son d'ambiance (accueil) — tambour synthétisé, aucun fichier audio
  var soundBtn = document.querySelector('.sound');
  if (soundBtn) {
    var ctx, timer, step = 0;
    var pattern = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    function hit(t, low) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(low ? 110 : 190, t);
      o.frequency.exponentialRampToValueAtTime(low ? 45 : 90, t + 0.25);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(low ? 0.5 : 0.22, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.4);
    }
    window.kweniAudio = {
      tone: function (f) {
        if (!ctx || soundBtn.getAttribute('aria-pressed') !== 'true') return;
        var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(f * 2, t);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.5);
      }
    };
    function tick() {
      if (pattern[step % 16]) hit(ctx.currentTime + 0.02, step % 8 === 0);
      step++;
    }
    soundBtn.addEventListener('click', function () {
      var on = soundBtn.getAttribute('aria-pressed') !== 'true';
      soundBtn.setAttribute('aria-pressed', on);
      soundBtn.querySelector('.label').textContent = on ? 'Son activé' : 'Activer le son';
      if (on) {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume(); timer = setInterval(tick, 150);
      } else { clearInterval(timer); }
    });
  }

  var y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
