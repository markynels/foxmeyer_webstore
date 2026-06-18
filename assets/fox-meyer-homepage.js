/* Fox Meyer Homepage — Three.js 3D can animation + GSAP scroll behaviour
   Expects window.foxMeyerCanA and window.foxMeyerCanB to be set (URLs)
   before this script runs. Injected by the Liquid section. */
(function () {
  'use strict';

  var reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas   = document.getElementById('fm-stage');
  var loader   = document.getElementById('fm-loader');
  var bgGreen  = document.getElementById('fm-bg-green');

  /* ---------- renderer / scene ---------- */
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding     = THREE.sRGBEncoding;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  var scene  = new THREE.Scene();
  var CAM_Z  = 10.5;
  var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  scene.add(new THREE.AmbientLight(0xfff2e2, 0.62));
  var key  = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(3.2, 4, 5);   scene.add(key);
  var fill = new THREE.DirectionalLight(0xe9dec8, 0.32); fill.position.set(-4, 1.2, 3); scene.add(fill);
  var rim  = new THREE.DirectionalLight(0xf2b27a, 0.55); rim.position.set(-2.5, 3, -5); scene.add(rim);
  var topL = new THREE.PointLight(0xffffff, 0.5, 30);    topL.position.set(0, 6, 2);    scene.add(topL);

  /* ---------- can factory ---------- */
  var R = 1, BODY_H = 4.41;
  var rig = new THREE.Group();
  scene.add(rig);

  function buildCan(bodyMat, trimColor) {
    var group   = new THREE.Group();
    var spinner = new THREE.Group();
    group.add(spinner);
    var trimMat = new THREE.MeshStandardMaterial({ color: trimColor, metalness: 0.30, roughness: 0.50 });
    var aluMat  = new THREE.MeshStandardMaterial({ color: 0xc9c9cc,  metalness: 0.85, roughness: 0.32 });
    var lidMat  = new THREE.MeshStandardMaterial({ color: 0xb9b9bd,  metalness: 0.80, roughness: 0.45 });

    var body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, BODY_H, 96, 1, true), bodyMat);
    spinner.add(body);
    var topTaper = new THREE.Mesh(new THREE.CylinderGeometry(0.82, R, 0.34, 96, 1, true), trimMat);
    topTaper.position.y = BODY_H / 2 + 0.17; spinner.add(topTaper);
    var topRim = new THREE.Mesh(new THREE.TorusGeometry(0.80, 0.045, 14, 80), aluMat);
    topRim.rotation.x = Math.PI / 2; topRim.position.y = BODY_H / 2 + 0.36; spinner.add(topRim);
    var lid = new THREE.Mesh(new THREE.CircleGeometry(0.79, 64), lidMat);
    lid.rotation.x = -Math.PI / 2; lid.position.y = BODY_H / 2 + 0.315; spinner.add(lid);
    var lidRing = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.02, 10, 60), aluMat);
    lidRing.rotation.x = Math.PI / 2; lidRing.position.y = BODY_H / 2 + 0.325; spinner.add(lidRing);
    var botTaper = new THREE.Mesh(new THREE.CylinderGeometry(R, 0.84, 0.26, 96, 1, true), trimMat);
    botTaper.position.y = -BODY_H / 2 - 0.13; spinner.add(botTaper);
    var botRim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 14, 80), aluMat);
    botRim.rotation.x = Math.PI / 2; botRim.position.y = -BODY_H / 2 - 0.24; spinner.add(botRim);
    var botCap = new THREE.Mesh(new THREE.CircleGeometry(0.81, 64), lidMat);
    botCap.rotation.x = Math.PI / 2; botCap.position.y = -BODY_H / 2 - 0.22; spinner.add(botCap);

    rig.add(group);
    return { group: group, spinner: spinner };
  }

  function setCanOpacity(can, o, forceSolid) {
    can.group.visible = o > 0.004;
    /* When a can is fully visible, render it as opaque so the depth buffer
       occludes the lid/walls correctly (otherwise the metal lid shows through
       the can wall). Transparency is only used mid-crossfade.
       forceSolid keeps depth-writing on while a can is being faded in but is
       NOT overlapping the other can (the Shop split) — without it the lid and
       bottom cap, drawn after the body, paint over the wall and read through it. */
    var opaque = o > 0.985;
    can.group.traverse(function (n) {
      if (n.material) {
        n.material.transparent = !opaque;
        n.material.opacity = o;
        n.material.depthWrite = opaque || o > 0.92 || forceSolid;
      }
    });
  }

  var WRAP_OFFSET = 0.66;
  function prepWrap(tex) {
    tex.encoding   = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    tex.wrapS      = THREE.RepeatWrapping;
    tex.offset.x   = WRAP_OFFSET;
    tex.needsUpdate = true;
    return tex;
  }

  var canA = null, canB = null;
  var loadedA = false, loadedB = false;

  function reveal() {
    if (loader) {
      loader.classList.add('done');
      setTimeout(function () { if (loader) loader.remove(); }, 800);
    }
  }
  function maybeReveal() { if (loadedA && loadedB) reveal(); }

  var texLoader = new THREE.TextureLoader();

  texLoader.load(
    window.foxMeyerCanA,
    function (tex) {
      canA = buildCan(new THREE.MeshStandardMaterial({ map: prepWrap(tex), metalness: 0.25, roughness: 0.48 }), 0x4a2040);
      canA.group.traverse(function (n) { n.renderOrder = 1; });
      loadedA = true; maybeReveal();
    },
    undefined,
    function () {
      canA = buildCan(new THREE.MeshStandardMaterial({ color: 0x4a2040, metalness: 0.3, roughness: 0.5 }), 0x4a2040);
      canA.group.traverse(function (n) { n.renderOrder = 1; });
      loadedA = true; maybeReveal();
    }
  );

  texLoader.load(
    window.foxMeyerCanB,
    function (tex) {
      canB = buildCan(new THREE.MeshStandardMaterial({ map: prepWrap(tex), metalness: 0.25, roughness: 0.48 }), 0x244a34);
      canB.group.scale.setScalar(1.004);
      canB.group.traverse(function (n) { n.renderOrder = 2; });
      setCanOpacity(canB, 0);
      loadedB = true; maybeReveal();
    },
    undefined,
    function () {
      canB = buildCan(new THREE.MeshStandardMaterial({ color: 0x244a34, metalness: 0.3, roughness: 0.5 }), 0x244a34);
      canB.group.scale.setScalar(1.004);
      canB.group.traverse(function (n) { n.renderOrder = 2; });
      setCanOpacity(canB, 0);
      loadedB = true; maybeReveal();
    }
  );

  /* ---------- responsive framing ---------- */
  var isMobile = false, sideX = 3.0, baseY = 0, heroDrop = -2.7;
  function frame() {
    var w = window.innerWidth, h = window.innerHeight;
    isMobile = w < 821;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var s = isMobile ? 0.62 : Math.min(1, w / 1280 * 1.05);
    rig.scale.setScalar(s);
    sideX    = isMobile ? 0 : Math.min(3.4, (w / h) * 1.55);
    baseY    = isMobile ? 0.9 : 0;
    heroDrop = isMobile ? -3.2 : -2.7;
    measure();
  }

  /* ---------- scene keyframes ---------- */
  var TAU   = Math.PI * 2;
  var FRONT = Math.PI;
  var IDS   = ['fm-hero', 'fm-fraicheur', 'fm-origine', 'fm-recette', 'fm-grenouille', 'fm-recette-pg', 'fm-acheter'];
  var STATES = [
    { xm: 0.00, y: null, zoom: 0.00, tilt:  0.00, turns: 0.00, swap: 0 },
    { xm: 0.34, y: 0,    zoom: 0.25, tilt: -0.05, turns: 0.50, swap: 0 },
    { xm:-0.34, y: 0,    zoom: 0.25, tilt:  0.05, turns: 1.00, swap: 0 },
    { xm: 0.30, y: 0,    zoom: 0.55, tilt: -0.04, turns: 1.50, swap: 0 },
    { xm:-0.40, y: 0,    zoom: 0.40, tilt:  0.05, turns: 2.00, swap: 1 },
    { xm: 0.30, y: 0,    zoom: 0.55, tilt: -0.04, turns: 2.50, swap: 1 },
    { xm:-0.62, y: 0,    zoom:-0.30, tilt:  0.00, turns: 3.00, swap: 1 }
  ];
  var anchors = [];

  function measure() {
    anchors = [];
    for (var i = 0; i < IDS.length; i++) {
      var el = document.getElementById(IDS[i]);
      if (el) {
        var r = el.getBoundingClientRect();
        anchors[i] = r.top + window.scrollY + el.offsetHeight * 0.5;
      } else {
        anchors[i] = i * window.innerHeight;
      }
    }
  }

  function smooth(t) { t = t < 0 ? 0 : (t > 1 ? 1 : t); return t * t * (3 - 2 * t); }

  function sampleTarget(out) {
    var vc = window.scrollY + window.innerHeight * 0.5;
    var i  = 0;
    while (i < anchors.length - 1 && vc > anchors[i + 1]) i++;
    var a    = STATES[i];
    var b    = STATES[Math.min(i + 1, STATES.length - 1)];
    var span = (anchors[Math.min(i + 1, anchors.length - 1)] - anchors[i]) || 1;
    var t    = smooth((vc - anchors[i]) / span);
    function lerp(k) { var av = a[k] == null ? heroDrop : a[k]; var bv = b[k] == null ? 0 : b[k]; return av + (bv - av) * t; }
    out.x    = isMobile ? 0 : lerp('xm') * sideX;
    out.y    = lerp('y');
    out.zoom = lerp('zoom');
    out.tilt = isMobile ? 0 : lerp('tilt');
    out.rot  = FRONT - lerp('turns') * TAU;
    var rA  = anchors[3], gA = anchors[4];
    var raw = (gA > rA) ? (vc - rA) / (gA - rA) : (vc >= gA ? 1 : 0);
    out.swap = Math.max(0, Math.min(1, raw * 1.4));
    /* split: both cans separate side-by-side as we arrive at the Shop section,
       ramping from the Petite Grenouille recipe (anchor 5) to Shop (anchor 6). */
    var pA = anchors[5], sA = anchors[6];
    var rawSplit = (sA > pA) ? (vc - pA) / (sA - pA) : (vc >= sA ? 1 : 0);
    out.split = Math.max(0, Math.min(1, rawSplit * 1.3));
  }

  /* ---------- animation state ---------- */
  var target = { x: 0, y: heroDrop, zoom: 0, tilt: 0, rot: FRONT, swap: 0, split: 0 };
  var cur    = { x: 0, y: heroDrop, zoom: 0, tilt: 0, rot: FRONT, swap: 0, split: 0 };
  var footerEl = document.querySelector('.fm-footer');
  frame();
  window.addEventListener('resize', frame, { passive: true });
  window.addEventListener('scroll', measure, { passive: true });

  /* GSAP panel reveals + hero parallax */
  if (!reduced && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to('#fm-hero .fm-logo-hero, #fm-hero .fm-h1, #fm-hero .fm-hero-sub', {
      opacity: 0, y: -40, ease: 'none',
      scrollTrigger: { trigger: '#fm-hero', start: 'top top', end: '70% top', scrub: true }
    });
    gsap.utils.toArray('.fm-reveal').forEach(function (p) {
      gsap.from(p, {
        opacity: 0, y: 46, duration: 0.9, ease: 'power2.out',
        scrollTrigger: { trigger: p, start: 'top 80%' }
      });
    });
  }

  /* ---------- render loop ---------- */
  var clock   = new THREE.Clock();
  var running = true;
  document.addEventListener('visibilitychange', function () { running = !document.hidden; });

  function tick() {
    requestAnimationFrame(tick);
    if (!running) { clock.getDelta(); return; }
    var dt = Math.min(clock.getDelta(), 0.05);
    var t  = clock.elapsedTime;

    sampleTarget(target);
    var k = 1 - Math.exp(-dt / 0.10);
    cur.x    += (target.x    - cur.x)    * k;
    cur.y    += (target.y    - cur.y)    * k;
    cur.zoom += (target.zoom - cur.zoom) * k;
    cur.tilt += (target.tilt - cur.tilt) * k;
    cur.rot  += (target.rot  - cur.rot)  * k;
    cur.swap += (target.swap - cur.swap) * k;
    cur.split += (target.split - cur.split) * k;

    /* The can's spin, position and the Petite Grenouille crossfade are all
       scroll-driven, so they run for everyone. Under reduced-motion we only
       drop the autonomous idle motion (the gentle bob + x-axis wobble) — this
       keeps the experience working on iOS where "Reduce Motion" is commonly
       enabled (previously this branch froze the can high over the text). */
    var bob = reduced ? 0 : Math.sin(t * 1.1) * 0.06;

    /* Footer guard: once the footer scrolls up into view, carry the cans up with
       it (1:1 with the scroll) so they stop above the footer instead of floating
       over it. The pixel→world conversion keeps the motion locked to the page. */
    var footerPush = 0;
    if (footerEl) {
      var fTop  = footerEl.getBoundingClientRect().top;       // px from viewport top
      var enter = window.innerHeight - fTop;                  // px the footer has risen into view
      if (enter > 0) {
        var dist       = CAM_Z - cur.zoom;                    // camera → can-plane distance
        var worldPerPx = (2 * dist * Math.tan((camera.fov * Math.PI / 180) / 2)) / window.innerHeight;
        footerPush     = enter * worldPerPx;
      }
    }

    rig.position.x = cur.x;
    rig.position.y = baseY + cur.y + bob + footerPush;
    rig.rotation.z = cur.tilt;
    rig.rotation.x = reduced ? 0.05 : 0.05 + Math.sin(t * 0.7) * 0.012;
    camera.position.z = CAM_Z - cur.zoom;

    var s  = cur.swap;
    var se = s * s * s * (s * (s * 6 - 15) + 10);
    var oB = Math.max(0, Math.min(1, se / 0.80));
    var oA = Math.max(0, Math.min(1, 1 - (se - 0.80) / 0.20));

    /* At the Shop section both cans appear side by side. Rather than fade can A
       back in (a semi-transparent can lets its interior cap/lid read through the
       wall), we bring it in fully opaque and slide it out from behind can B,
       which sits slightly larger and in front — so can A is hidden at the start
       of the split and simply emerges as the pair separates. */
    var sp  = Math.max(0, Math.min(1, cur.split));
    var spe = sp * sp * (3 - 2 * sp);
    var GAP = 1.35;
    if (spe > 0.001) { oA = 1; oB = 1; }
    var solid = spe > 0.001;
    if (canA) {
      canA.spinner.rotation.y = cur.rot; setCanOpacity(canA, oA, solid);
      canA.group.position.x = -GAP * spe;
      /* sit just behind can B while they're concentric so B cleanly hides A at
         the start of the split (no z-fighting); negligible once separated. */
      canA.group.position.z = solid ? -0.04 : 0;
    }
    if (canB) {
      canB.spinner.rotation.y = cur.rot; setCanOpacity(canB, oB, solid);
      canB.group.position.x =  GAP * spe;
    }
    if (bgGreen) bgGreen.style.opacity = se.toFixed(3);

    renderer.render(scene, camera);
  }
  tick();
})();
