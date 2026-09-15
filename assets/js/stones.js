/* Kweni Studio — Les cinq pierres (Three.js r128) */
(function () {
  var root = document.documentElement;
  var canvas = document.getElementById('stones');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function wake() { root.classList.add('is-awake'); }

  if (!canvas || !window.THREE) { root.classList.add('no-webgl'); wake(); return; }
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { root.classList.add('no-webgl'); wake(); return; }

  var small = window.matchMedia('(max-width: 900px)').matches;
  var lowPower = small || (navigator.hardwareConcurrency || 4) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  var ELEMENTS = [
    { name: 'Terre', color: 0xB5652B },
    { name: 'Eau', color: 0x2E7BD6 },
    { name: 'Feu', color: 0xE8121A },
    { name: 'Équilibre', color: 0xD4A017 },
    { name: 'Air', color: 0xCFE3F0 }
  ];

  var world = new THREE.Group();
  scene.add(world);
  var ring = new THREE.Group();
  ring.rotation.x = -0.42;
  world.add(ring);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(3, 4, 6); scene.add(key);
  var rim = new THREE.PointLight(0xE8121A, 2.2, 20); rim.position.set(-4, -2, 3); scene.add(rim);

  // Halo radial partagé
  var haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 128;
  var hc = haloCanvas.getContext('2d');
  var grd = hc.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  hc.fillStyle = grd; hc.fillRect(0, 0, 128, 128);
  var haloTex = new THREE.CanvasTexture(haloCanvas);

  var R = 2.3, stones = [], anchors = [];
  ELEMENTS.forEach(function (el, i) {
    var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    var pos = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    anchors.push(pos);
    var g = new THREE.Group(); g.position.copy(pos);
    var geo = i % 2 ? new THREE.OctahedronGeometry(0.46, 0) : new THREE.IcosahedronGeometry(0.46, 0);
    var mat = new THREE.MeshStandardMaterial({ color: el.color, emissive: el.color, emissiveIntensity: 0.28, roughness: 0.32, metalness: 0.25, flatShading: true });
    var mesh = new THREE.Mesh(geo, mat); g.add(mesh);
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: el.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
    halo.scale.set(2.2, 2.2, 1); g.add(halo);
    g.scale.setScalar(0.0001);
    ring.add(g);
    stones.push({ group: g, mesh: mesh, spin: 0.3 + Math.random() * 0.5 });
  });

  // Anneau tracé
  var circle = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 129 }, function (_, k) { var t = k / 128 * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * R, Math.sin(t) * R, 0); })
  );
  var ringLine = new THREE.Line(circle, new THREE.LineBasicMaterial({ color: 0xEFE8DC, transparent: true, opacity: 0 }));
  ring.add(ringLine);

  // Particules : poussière dispersée qui se rassemble autour des pierres
  var N = lowPower ? 1400 : 3000;
  var start = new Float32Array(N * 3), target = new Float32Array(N * 3), cur = new Float32Array(N * 3), cols = new Float32Array(N * 3);
  var tmp = new THREE.Color();
  for (var p = 0; p < N; p++) {
    var i3 = p * 3;
    var r0 = 6 + Math.random() * 8, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    start[i3] = r0 * Math.sin(ph) * Math.cos(th); start[i3 + 1] = r0 * Math.sin(ph) * Math.sin(th); start[i3 + 2] = r0 * Math.cos(ph) - 2;
    var k = p % 5, onRing = Math.random() < 0.35;
    if (onRing) {
      var tt = Math.random() * Math.PI * 2, jit = (Math.random() - 0.5) * 0.18;
      target[i3] = Math.cos(tt) * (R + jit); target[i3 + 1] = Math.sin(tt) * (R + jit); target[i3 + 2] = (Math.random() - 0.5) * 0.15;
      tmp.set(0xEFE8DC);
    } else {
      var rr = 0.6 + Math.pow(Math.random(), 2) * 0.9, t2 = Math.random() * Math.PI * 2, p2 = Math.acos(2 * Math.random() - 1);
      target[i3] = anchors[k].x + rr * Math.sin(p2) * Math.cos(t2);
      target[i3 + 1] = anchors[k].y + rr * Math.sin(p2) * Math.sin(t2);
      target[i3 + 2] = rr * Math.cos(p2);
      tmp.set(ELEMENTS[k].color);
    }
    cols[i3] = tmp.r; cols[i3 + 1] = tmp.g; cols[i3 + 2] = tmp.b;
  }
  cur.set(start);
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(cur, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  var dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: lowPower ? 0.05 : 0.035, map: haloTex, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.add(dust);

  function layout() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var narrow = w < 900;
    var aspect = w / h;
    world.position.set(narrow ? 0 : Math.min(3.4, 1.6 * aspect), narrow ? 2.7 : 0.3, 0);
    world.scale.setScalar(narrow ? 0.5 : 0.9);
  }
  window.addEventListener('resize', layout); layout();

  var mouse = { x: 0, y: 0 }, eased = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  var DURATION = 3.2, t0 = performance.now(), awake = false, visible = true, running = true;
  function ease(x) { return 1 - Math.pow(1 - x, 4); }

  function frame(now) {
    var el = (now - t0) / 1000;
    var prog = reduce ? 1 : Math.min(1, el / DURATION);
    var e = ease(prog);
    var arr = pGeo.attributes.position.array;
    for (var j = 0; j < N * 3; j++) arr[j] = start[j] + (target[j] - start[j]) * e;
    pGeo.attributes.position.needsUpdate = true;

    var sp = Math.max(0, (prog - 0.45) / 0.55);
    stones.forEach(function (s, idx) {
      var sc = Math.max(0.0001, ease(Math.min(1, sp * 1.2 - idx * 0.05)));
      s.group.scale.setScalar(sc);
      if (!reduce) { s.mesh.rotation.y = el * s.spin; s.mesh.rotation.x = el * s.spin * 0.6; s.group.position.z = Math.sin(el * 0.8 + idx) * 0.12; }
    });
    ringLine.material.opacity = 0.18 * sp;

    if (!reduce) {
      ring.rotation.z = el * 0.06;
      eased.x += (mouse.x - eased.x) * 0.04; eased.y += (mouse.y - eased.y) * 0.04;
      world.rotation.y = eased.x * 0.25; world.rotation.x = eased.y * 0.15;
    }
    renderer.render(scene, camera);
    if (!awake && prog > 0.55) { awake = true; wake(); }
    if (reduce) return;
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  new IntersectionObserver(function (en) {
    visible = en[0].isIntersecting && !document.hidden;
    if (visible && !running) { running = true; requestAnimationFrame(frame); }
  }).observe(canvas);
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible && !running) { running = true; requestAnimationFrame(frame); }
  });
  requestAnimationFrame(frame);
  setTimeout(wake, 2500); // filet de sécurité
})();
