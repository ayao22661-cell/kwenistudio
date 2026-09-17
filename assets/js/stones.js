/* Kweni Studio — Les cinq pierres (Three.js r128)
   Formation, respiration, survol, clic (onde de choc) et dispersion au défilement.
   v11 : une main de pierre tient les cinq pierres par des fils de lumière
   (un doigt = une pierre), respire, tire ses fils à tour de rôle et relâche au défilement. */
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
    { name: 'Terre', color: 0xB5652B, note: 110 },
    { name: 'Eau', color: 0x2E7BD6, note: 147 },
    { name: 'Feu', color: 0xE8121A, note: 165 },
    { name: 'Équilibre', color: 0xD4A017, note: 196 },
    { name: 'Air', color: 0xCFE3F0, note: 220 }
  ];

  var world = new THREE.Group(); scene.add(world);
  var ring = new THREE.Group(); ring.rotation.x = -0.42; world.add(ring);

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(3, 4, 6); scene.add(key);
  var rim = new THREE.PointLight(0xE8121A, 2.2, 20); rim.position.set(-4, -2, 3); scene.add(rim);

  var haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 128;
  var hc = haloCanvas.getContext('2d');
  var grd = hc.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  hc.fillStyle = grd; hc.fillRect(0, 0, 128, 128);
  var haloTex = new THREE.CanvasTexture(haloCanvas);

  var R = 2.3, stones = [], anchors = [], meshes = [];
  ELEMENTS.forEach(function (el, i) {
    var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    var pos = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0);
    anchors.push(pos);
    var g = new THREE.Group(); g.position.copy(pos);
    var geo = i % 2 ? new THREE.OctahedronGeometry(0.46, 0) : new THREE.IcosahedronGeometry(0.46, 0);
    var mat = new THREE.MeshStandardMaterial({ color: el.color, emissive: el.color, emissiveIntensity: 0.28, roughness: 0.32, metalness: 0.25, flatShading: true });
    var mesh = new THREE.Mesh(geo, mat); mesh.userData.index = i; g.add(mesh); meshes.push(mesh);
    // Arêtes lumineuses
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    mesh.add(edges);
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: el.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
    halo.scale.set(2.2, 2.2, 1); g.add(halo);
    g.scale.setScalar(0.0001);
    ring.add(g);
    stones.push({ group: g, mesh: mesh, halo: halo, edges: edges, spin: 0.3 + Math.random() * 0.5, hover: 0, boost: 0 });
  });

  var circle = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 129 }, function (_, k) { var t = k / 128 * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * R, Math.sin(t) * R, 0); })
  );
  var ringLine = new THREE.Line(circle, new THREE.LineBasicMaterial({ color: 0xEFE8DC, transparent: true, opacity: 0 }));
  ring.add(ringLine);

  // Ondes de choc réutilisables
  var waves = [];
  for (var wv = 0; wv < 4; wv++) {
    var wm = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    wm.visible = false; ring.add(wm); waves.push({ mesh: wm, life: 1 });
  }

  // Particules
  var N = lowPower ? 1400 : 3000;
  var start = new Float32Array(N * 3), target = new Float32Array(N * 3), cols = new Float32Array(N * 3);
  var owner = new Int8Array(N), phase = new Float32Array(N), kick = new Float32Array(5);
  var tmp = new THREE.Color();
  for (var p = 0; p < N; p++) {
    var i3 = p * 3;
    var r0 = 6 + Math.random() * 8, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    start[i3] = r0 * Math.sin(ph) * Math.cos(th); start[i3 + 1] = r0 * Math.sin(ph) * Math.sin(th); start[i3 + 2] = r0 * Math.cos(ph) - 2;
    var k = p % 5, onRing = Math.random() < 0.35;
    phase[p] = Math.random() * Math.PI * 2;
    if (onRing) {
      owner[p] = -1;
      var tt = Math.random() * Math.PI * 2, jit = (Math.random() - 0.5) * 0.18;
      target[i3] = Math.cos(tt) * (R + jit); target[i3 + 1] = Math.sin(tt) * (R + jit); target[i3 + 2] = (Math.random() - 0.5) * 0.15;
      tmp.set(0xEFE8DC);
    } else {
      owner[p] = k;
      var rr = 0.6 + Math.pow(Math.random(), 2) * 0.9, t2 = Math.random() * Math.PI * 2, p2 = Math.acos(2 * Math.random() - 1);
      target[i3] = anchors[k].x + rr * Math.sin(p2) * Math.cos(t2);
      target[i3 + 1] = anchors[k].y + rr * Math.sin(p2) * Math.sin(t2);
      target[i3 + 2] = rr * Math.cos(p2);
      tmp.set(ELEMENTS[k].color);
    }
    cols[i3] = tmp.r; cols[i3 + 1] = tmp.g; cols[i3 + 2] = tmp.b;
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(start), 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  var dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: lowPower ? 0.05 : 0.035, map: haloTex, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.add(dust);

  // ---------- La main : un doigt par pierre ----------
  var handMat = new THREE.MeshStandardMaterial({ color: 0x2b1d17, emissive: 0x120806, emissiveIntensity: 1, roughness: 0.5, metalness: 0.35, flatShading: true });
  var hand = new THREE.Group(); world.add(hand);
  var HAND_Y = -3.75, HAND_S = 0.8;
  var palm = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), handMat);
  palm.scale.set(0.62, 0.72, 0.24); hand.add(palm);
  var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.5, 3.4, 7), handMat);
  arm.position.y = -2.2; hand.add(arm);
  var jointGeo = new THREE.IcosahedronGeometry(1, 0);
  // [x, y, inclinaison, longueurs des phalanges, rayon, courbure au repos] — pouce → Terre … auriculaire → Air
  var FINGERS = [
    [-0.5, -0.12, 0.72, [0.44, 0.34, 0.28], 0.16, 0.3],
    [-0.37, 0.55, 0.16, [0.5, 0.34, 0.26], 0.135, 0.18],
    [-0.12, 0.66, 0.03, [0.56, 0.37, 0.28], 0.14, 0.14],
    [0.14, 0.62, -0.1, [0.52, 0.34, 0.26], 0.13, 0.2],
    [0.38, 0.47, -0.26, [0.4, 0.27, 0.22], 0.11, 0.28]
  ];
  var fingers = FINGERS.map(function (d, i) {
    var base = new THREE.Group(); base.position.set(d[0], d[1], 0.04); base.rotation.z = d[2];
    if (i === 0) base.rotation.y = -0.3;
    hand.add(base);
    var parent = base, joints = [];
    d[3].forEach(function (len, k) {
      var r = d[4] * (1 - k * 0.12);
      var piv = new THREE.Group(); parent.add(piv); joints.push(piv);
      var seg = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.84, r, len, 6), handMat);
      seg.position.y = len / 2; piv.add(seg);
      var jn = new THREE.Mesh(jointGeo, handMat); jn.scale.setScalar(r); piv.add(jn);
      var next = new THREE.Group(); next.position.y = len; piv.add(next);
      parent = next;
    });
    var tip = new THREE.Group(); parent.add(tip);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: ELEMENTS[i].color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glow.scale.setScalar(0.45); tip.add(glow);
    // Fil de lumière
    var pts = new Float32Array(17 * 3);
    var lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    var line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: ELEMENTS[i].color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    line.frustumCulled = false; world.add(line);
    // Impulsion qui voyage du doigt vers la pierre
    var spark = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: ELEMENTS[i].color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    spark.scale.setScalar(0.5); world.add(spark);
    return { joints: joints, rest: d[5], tip: tip, glow: glow, line: line, spark: spark, pull: 0, pulse: 1, armed: true };
  });
  var tipW = new THREE.Vector3(), stoneW = new THREE.Vector3(), ctrl = new THREE.Vector3(), handTint = new THREE.Color(), noTint = new THREE.Color(0x120806);
  function pluck(i) { var f = fingers[i]; if (f.pulse >= 1) f.pulse = 0; }

  var basePos = new THREE.Vector3(), baseScale = 1;
  function layout() {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var narrow = w < 900;
    basePos.set(narrow ? 0 : Math.min(3.4, 1.6 * (w / h)), narrow ? 2.7 : 0.3, 0);
    baseScale = narrow ? 0.5 : 0.9;
  }
  window.addEventListener('resize', layout); layout();

  // Souris
  var mouse = { x: 0, y: 0 }, eased = { x: 0, y: 0 }, ndc = new THREE.Vector2(-9, -9);
  var ray = new THREE.Raycaster(), hovered = -1;
  window.addEventListener('pointermove', function (e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    var r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }, { passive: true });
  canvas.addEventListener('pointerleave', function () { ndc.set(-9, -9); });

  var world0 = new THREE.Vector3();
  function burst(i) {
    kick[i] = 1; stones[i].boost = 1;
    var w = waves.find(function (x) { return x.life >= 1; }) || waves[0];
    w.life = 0; w.mesh.visible = true;
    w.mesh.position.copy(stones[i].group.position);
    w.mesh.material.color.set(ELEMENTS[i].color);
    if (window.kweniAudio) window.kweniAudio.tone(ELEMENTS[i].note);
    pluck(i);
  }
  canvas.addEventListener('click', function () { if (hovered >= 0) burst(hovered); });
  // Clavier : touches 1 à 5
  window.addEventListener('keydown', function (e) {
    if (window.scrollY > window.innerHeight * 0.5 || /input|textarea|select/i.test(e.target.tagName)) return;
    var n = parseInt(e.key, 10); if (n >= 1 && n <= 5) burst(n - 1);
  });

  // Légende du hero : survol = le doigt se lève, clic = la pierre répond
  var legendHover = -1;
  Array.prototype.forEach.call(document.querySelectorAll('.hero .elements li'), function (li, i) {
    li.addEventListener('pointerenter', function () { legendHover = i; });
    li.addEventListener('pointerleave', function () { legendHover = -1; });
    li.addEventListener('click', function () { burst(i); });
  });

  var DURATION = 3.2, t0 = null, awake = false, visible = true, running = false, last = 0;
  function ease(x) { return 1 - Math.pow(1 - x, 4); }
  function begin() { if (t0 === null) { t0 = performance.now(); if (!running) { running = true; requestAnimationFrame(frame); } } }

  function frame(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var el = (now - t0) / 1000;
    var prog = reduce ? 1 : Math.min(1, el / DURATION);
    var e = ease(prog);
    var sc = Math.min(1, Math.max(0, window.scrollY / window.innerHeight)); // sortie du héros
    var scat = sc * sc;

    for (var q = 0; q < 5; q++) kick[q] *= 0.94;
    var arr = pGeo.attributes.position.array;
    for (var j = 0; j < N; j++) {
      var b = j * 3, o = owner[j];
      var mix = e * (1 - scat * 0.85);
      var x = start[b] + (target[b] - start[b]) * mix;
      var y = start[b + 1] + (target[b + 1] - start[b + 1]) * mix;
      var z = start[b + 2] + (target[b + 2] - start[b + 2]) * mix;
      if (!reduce) {
        var br = Math.sin(el * 1.3 + phase[j]) * 0.04 * e;
        x += br; y += Math.cos(el * 1.1 + phase[j]) * 0.04 * e;
        if (o >= 0 && kick[o] > 0.01) {
          var ax = x - anchors[o].x, ay = y - anchors[o].y;
          x += ax * kick[o] * 1.6; y += ay * kick[o] * 1.6; z += z * kick[o] * 1.6;
        }
      }
      arr[b] = x; arr[b + 1] = y; arr[b + 2] = z;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Survol
    hovered = -1;
    if (!reduce && prog > 0.8 && sc < 0.3) {
      ray.setFromCamera(ndc, camera);
      var hit = ray.intersectObjects(meshes, false)[0];
      if (hit) hovered = hit.object.userData.index;
    }
    if (!root.classList.contains('has-cursor')) canvas.style.cursor = hovered >= 0 ? 'pointer' : '';
    if (hovered !== frame.prevHover) {
      window.dispatchEvent(new CustomEvent('kweni:stone', { detail: hovered >= 0 ? ELEMENTS[hovered].name : '' }));
      frame.prevHover = hovered;
    }

    var sp = Math.max(0, (prog - 0.45) / 0.55);
    var active = hovered >= 0 ? hovered : legendHover;
    var release = Math.min(1, sc * 2.5);
    // Doigts : vague lente, un doigt après l'autre
    fingers.forEach(function (f, i) {
      var w = reduce ? 0 : Math.max(0, Math.sin(el * 1.2 - i * 1.25));
      w = w * w * w;
      if (w > 0.97 && f.armed && sp > 0.9 && release < 0.2) { pluck(i); f.armed = false; }
      if (w < 0.2) f.armed = true;
      var want = Math.max(w * 0.55, active === i ? 1 : 0, stones[i].boost);
      f.pull += (want - f.pull) * 0.12;
    });
    stones.forEach(function (s, idx) {
      s.hover += ((active === idx ? 1 : 0) - s.hover) * 0.12;
      s.boost *= 0.93;
      var grow = Math.max(0.0001, ease(Math.min(1, sp * 1.2 - idx * 0.05)));
      s.group.scale.setScalar(grow * (1 + s.hover * 0.35 + s.boost * 0.5));
      s.halo.material.opacity = 0.85 + s.hover * 0.15;
      s.halo.scale.setScalar(2.2 + s.hover * 1 + s.boost * 3);
      s.edges.material.opacity = s.hover * 0.8 + s.boost;
      s.mesh.material.emissiveIntensity = 0.28 + s.hover * 0.4 + s.boost;
      var out = (1 + scat * 2.2) * (1 - fingers[idx].pull * 0.06 * (1 - release));
      s.group.position.x = anchors[idx].x * out;
      s.group.position.y = anchors[idx].y * out;
      if (!reduce) {
        s.mesh.rotation.y += dt * s.spin * (1 + s.hover * 4 + s.boost * 10);
        s.mesh.rotation.x += dt * s.spin * 0.6;
        s.group.position.z = Math.sin(el * 0.8 + idx) * 0.12 + scat * (idx - 2) * 1.5;
      }
    });
    ringLine.material.opacity = 0.18 * sp * (1 - scat);

    waves.forEach(function (w) {
      if (w.life >= 1) { w.mesh.visible = false; return; }
      w.life = Math.min(1, w.life + dt * 1.2);
      w.mesh.scale.setScalar(0.4 + ease(w.life) * 3.5);
      w.mesh.material.opacity = (1 - w.life) * 0.8;
    });

    if (!reduce) {
      ring.rotation.z += dt * (0.06 + sc * 0.8);
      eased.x += (mouse.x - eased.x) * 0.04; eased.y += (mouse.y - eased.y) * 0.04;
      world.rotation.y = eased.x * 0.25 + sc * 0.6;
      world.rotation.x = eased.y * 0.15 - sc * 0.3;
    }
    world.position.set(basePos.x - sc * basePos.x * 0.6, basePos.y + sc * 1.2, sc * 3);
    world.scale.setScalar(baseScale);
    rim.intensity = 2.2 + Math.sin(el * 2) * 0.4;

    // Main : monte avec la formation, respire, se teinte de la pierre touchée, s'ouvre et descend au défilement
    var narrowNow = canvas.clientWidth < 900;
    hand.position.set(0, (narrowNow ? HAND_Y + 0.25 : HAND_Y) - (1 - e) * 3 - sc * 3, 0.6);
    hand.rotation.x = -0.28 + (reduce ? 0 : Math.sin(el * 0.7) * 0.03);
    hand.rotation.z = reduce ? 0 : Math.sin(el * 0.5) * 0.05;
    hand.scale.setScalar(HAND_S * (narrowNow ? 0.72 : 1));
    handTint.copy(active >= 0 ? tmp.set(ELEMENTS[active].color).multiplyScalar(0.35) : noTint);
    handMat.emissive.lerp(handTint, 0.08);
    fingers.forEach(function (f, i) {
      var c = f.rest + f.pull * 0.45 - release * 0.55;
      f.joints[0].rotation.x = c; f.joints[1].rotation.x = c * 1.35; f.joints[2].rotation.x = c * 1.15;
    });
    scene.updateMatrixWorld();
    var lineA = 0.4 * sp * (1 - release);
    fingers.forEach(function (f, i) {
      f.tip.getWorldPosition(tipW); world.worldToLocal(tipW);
      stones[i].group.getWorldPosition(stoneW); world.worldToLocal(stoneW);
      ctrl.addVectors(tipW, stoneW).multiplyScalar(0.5);
      ctrl.y -= 0.35 * (1 - f.pull); // le fil se tend quand le doigt tire
      var a = f.line.geometry.attributes.position.array;
      for (var k = 0; k <= 16; k++) {
        var t = k / 16, u = 1 - t;
        a[k * 3] = u * u * tipW.x + 2 * u * t * ctrl.x + t * t * stoneW.x;
        a[k * 3 + 1] = u * u * tipW.y + 2 * u * t * ctrl.y + t * t * stoneW.y;
        a[k * 3 + 2] = u * u * tipW.z + 2 * u * t * ctrl.z + t * t * stoneW.z;
      }
      f.line.geometry.attributes.position.needsUpdate = true;
      f.line.material.opacity = lineA * (0.6 + f.pull * 1.4);
      f.glow.material.opacity = sp * (1 - release) * (0.25 + f.pull * 0.75);
      if (f.pulse < 1) {
        f.pulse = Math.min(1, f.pulse + dt * 1.6);
        var t2 = ease(f.pulse), u2 = 1 - t2;
        f.spark.position.set(
          u2 * u2 * tipW.x + 2 * u2 * t2 * ctrl.x + t2 * t2 * stoneW.x,
          u2 * u2 * tipW.y + 2 * u2 * t2 * ctrl.y + t2 * t2 * stoneW.y,
          u2 * u2 * tipW.z + 2 * u2 * t2 * ctrl.z + t2 * t2 * stoneW.z);
        f.spark.material.opacity = Math.sin(f.pulse * Math.PI) * (1 - release);
      } else f.spark.material.opacity = 0;
    });

    renderer.render(scene, camera);
    if (!awake && prog > 0.3) { awake = true; wake(); }
    if (reduce) { running = false; return; }
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  frame.prevHover = -1;

  new IntersectionObserver(function (en) {
    visible = en[0].isIntersecting && !document.hidden;
    if (visible && !running && t0 !== null) { running = true; last = 0; requestAnimationFrame(frame); }
  }).observe(canvas);
  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    if (visible && !running && t0 !== null) { running = true; last = 0; requestAnimationFrame(frame); }
  });
  if (reduce) window.addEventListener('scroll', function () { if (!running) { running = true; requestAnimationFrame(frame); } }, { passive: true });

  // Démarre quand l'écran d'ouverture se retire
  begin();
  setTimeout(wake, 2500);
})();
