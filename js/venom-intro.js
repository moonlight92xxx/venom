/* ============================================================
   VENOM // INTRO — index.html
   Phase 1: typing "VENOM"  (0 - 2.2s)
   Phase 2: 3D VENOM cube object  (2.2s+)
   Phase 3: welcome + click to enter
   Phase 4: WOOOOW particle explosion -> main.html
   ============================================================ */

(() => {
  'use strict';

  /* ============================================================
     BACKGROUND PARTICLES (subtle floating embers)
     ============================================================ */  const bgCanvas = document.getElementById('bg-particles');
  const bgCtx = bgCanvas.getContext('2d');
  let bgW = 0, bgH = 0;
  let bgParticles = [];

  function resizeBg() {
    bgW = bgCanvas.width = window.innerWidth;
    bgH = bgCanvas.height = window.innerHeight;
  }
  resizeBg();
  window.addEventListener('resize', resizeBg);

  function initBgParticles() {
    bgParticles = [];
    const count = Math.min(80, Math.floor((bgW * bgH) / 18000));
    for (let i = 0; i < count; i++) {
      bgParticles.push({
        x: Math.random() * bgW,
        y: Math.random() * bgH,
        r: Math.random() * 1.6 + 0.3,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.4 - 0.1,
        a: Math.random() * 0.6 + 0.2,
      });
    }
  }
  initBgParticles();
  window.addEventListener('resize', initBgParticles);

  function drawBg() {
    bgCtx.clearRect(0, 0, bgW, bgH);
    for (const p of bgParticles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = bgH + 10; p.x = Math.random() * bgW; }
      if (p.x < -10) p.x = bgW + 10;
      if (p.x > bgW + 10) p.x = -10;
      bgCtx.beginPath();
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(0, 255, 102, ${p.a})`;
      bgCtx.shadowColor = 'rgba(0, 255, 102, 0.8)';
      bgCtx.shadowBlur = 8;
      bgCtx.fill();
    }
    bgCtx.shadowBlur = 0;
    requestAnimationFrame(drawBg);
  }
  drawBg();

  /* ============================================================
     PHASE 1: TYPING "VENOM"
     ============================================================ */
  const typingEl = document.getElementById('typing-text');
  const word = 'VENOM';
  let typeIdx = 0;

  function typeVenom() {
    if (typeIdx <= word.length) {
      typingEl.textContent = word.slice(0, typeIdx);
      typeIdx++;
      // glitch a random char sometimes
      setTimeout(typeVenom, 60 + Math.random() * 40);
    }
  }
  // small initial delay
  setTimeout(typeVenom, 200);

  // Boot log lines (fast boot sequence — 10/10)
  const bootLines = [
    '> loading neural core...',
    '> mounting /dev/venomic...',
    '> establishing sync...',
    '> AI module: ONLINE',
  ];
  const bootLog = document.getElementById('boot-log');
  if (bootLog) {
    bootLines.forEach((line, i) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'boot-line';
        div.textContent = line;
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.2s';
        bootLog.appendChild(div);
        requestAnimationFrame(() => { div.style.opacity = '0.6'; });
      }, 200 + i * 180);
    });
  }

  /* ============================================================
     PHASE 2: 3D VENOM OBJECT  (Three.js)
     ============================================================ */
  let venomScene, venomCam, venomRenderer, venomMesh, eyes = [];
  let venomT = 0;

  function initVenom3D() {
    const canvas = document.getElementById('venom-canvas');
    venomScene = new THREE.Scene();
    venomCam = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    venomCam.position.z = 6;

    venomRenderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true
    });
    venomRenderer.setSize(window.innerWidth, window.innerHeight);
    venomRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    /* ---- VENOM body: metallic cube (matches the VENOM logo) ---- */
    const geo = new THREE.IcosahedronGeometry(1.6, 4);

    // store original positions for distortion
    const positions = geo.attributes.position;
    const origPos = new Float32Array(positions.array.length);
    for (let i = 0; i < positions.array.length; i++) {
      origPos[i] = positions.array[i];
    }
    geo.userData.origPos = origPos;

    // metallic chrome material with purple rim light (matches VENOM logo)
    const mat = new THREE.MeshPhongMaterial({
      color: 0x080a0c,
      emissive: 0x002208,
      specular: 0xc0c0c0,  // chrome silver highlights
      shininess: 120,      // high shine for metallic look
      flatShading: true,
    });
    venomMesh = new THREE.Mesh(geo, mat);
    venomScene.add(venomMesh);

    /* ---- Purple flare core (the "extreme" energy inside the cube) ---- */
    const flareGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.95,
    });
    const flare = new THREE.Mesh(flareGeo, flareMat);
    flare.position.set(0, 0.4, 0);  // top of cube interior
    venomMesh.add(flare);
    venomMesh.userData.flare = flare;
    eyes.push(flare);  // reuse eyes array for pulse animation

    /* ---- Outer wireframe shell (cube-shaped to match) ---- */
    const wireGeo = new THREE.IcosahedronGeometry(2.1, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    venomMesh.add(wireMesh);
    venomMesh.userData.wire = wireMesh;

    /* ---- Purple glow rings orbiting the cube ---- */
    venomMesh.userData.rings = [];
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(1.4 + i * 0.2, 0.02, 8, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.5 - i * 0.12,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (i * 0.3);
      ring.rotation.y = i * 0.4;
      venomMesh.add(ring);
      venomMesh.userData.rings.push(ring);
    }

    /* ---- Lights (purple + silver for the chrome look) ---- */
    const ambient = new THREE.AmbientLight(0x223333, 0.7);
    venomScene.add(ambient);

    const purpleLight = new THREE.PointLight(0x00ff66, 2.8, 22);
    purpleLight.position.set(4, 3, 5);
    venomScene.add(purpleLight);

    const rimLight = new THREE.PointLight(0xc0c0c0, 1.4, 18);  // silver rim
    rimLight.position.set(-4, -2, -3);
    venomScene.add(rimLight);

    const topLight = new THREE.PointLight(0xffffff, 0.8, 10);
    topLight.position.set(0, 0, 5);
    venomScene.add(topLight);

    window.addEventListener('resize', () => {
      venomCam.aspect = window.innerWidth / window.innerHeight;
      venomCam.updateProjectionMatrix();
      venomRenderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function animateVenom() {
    venomT += 0.016;
    if (venomMesh) {
      // smooth rotation — cube rotates on all 3 axes for dynamic display
      venomMesh.rotation.y += 0.005;
      venomMesh.rotation.x = Math.sin(venomT * 0.4) * 0.15;
      venomMesh.rotation.z = Math.cos(venomT * 0.3) * 0.08;

      // subtle distortion (cubes stay sharp — less distortion than sphere)
      const geo = venomMesh.geometry;
      const positions = geo.attributes.position;
      const orig = geo.userData.origPos;
      for (let i = 0; i < positions.array.length; i += 3) {
        const ox = orig[i], oy = orig[i + 1], oz = orig[i + 2];
        const n = Math.sin(ox * 2.0 + venomT * 1.0)
                * Math.cos(oy * 2.0 + venomT * 0.8)
                * Math.sin(oz * 2.0 + venomT * 1.2);
        const scale = 1 + n * 0.04;
        positions.array[i]     = ox * scale;
        positions.array[i + 1] = oy * scale;
        positions.array[i + 2] = oz * scale;
      }
      positions.needsUpdate = true;
      geo.computeVertexNormals();

      // pulse the purple flare (the "extreme" energy core)
      const flarePulse = 0.7 + Math.sin(venomT * 3) * 0.3;
      eyes.forEach(e => {
        e.material.opacity = flarePulse;
        e.scale.setScalar(1 + Math.sin(venomT * 3) * 0.2);
      });

      // rotate the purple glow rings
      if (venomMesh.userData.rings) {
        venomMesh.userData.rings.forEach((ring, i) => {
          ring.rotation.z += 0.004 * (i + 1);
          ring.rotation.x += 0.003 * (i % 2 === 0 ? 1 : -1);
        });
      }

      // wire shell counter-rotation
      if (venomMesh.userData.wire) {
        venomMesh.userData.wire.rotation.y -= 0.003;
        venomMesh.userData.wire.rotation.x += 0.002;
      }
    }
    venomRenderer.render(venomScene, venomCam);
    requestAnimationFrame(animateVenom);
  }

  /* ============================================================
     PHASE TRANSITIONS
     ============================================================ */
  const phaseTyping = document.getElementById('phase-typing');
  const phase3D = document.getElementById('phase-3d');
  const phaseEnter = document.getElementById('phase-enter');
  const phaseBoom = document.getElementById('phase-boom');

  // start phase 2 after typing completes (~2.2s)
  setTimeout(() => {
    phaseTyping.classList.add('hidden');
    phase3D.classList.remove('hidden');
    initVenom3D();
    animateVenom();
  }, 1200);

  // phase 3: show welcome + click button after venom stabilizes (~4.8s)
  setTimeout(() => {
    phaseEnter.classList.remove('hidden');
  }, 3000);

  /* ============================================================
     PHASE 4: WOOOOW EXPLOSION (on click)
     ============================================================ */
  const enterBtn = document.getElementById('enter-btn');
  const boomCanvas = document.getElementById('boom-canvas');
  const boomCtx = boomCanvas.getContext('2d');
  let boomW = 0, boomH = 0;
  let boomParticles = [];
  let boomRunning = false;
  let boomCounterEl = document.getElementById('boom-counter');

  function resizeBoom() {
    boomW = boomCanvas.width = window.innerWidth;
    boomH = boomCanvas.height = window.innerHeight;
  }

  function explode(cx, cy) {
    resizeBoom();
    boomParticles = [];
    const count = 1200; // dense particle burst (feels like 10M)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 14 + 2;
      boomParticles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: Math.random() * 3 + 0.5,
        life: 1,
        decay: Math.random() * 0.012 + 0.006,
        color: Math.random() > 0.85 ? '#ffffff' : '#00ff66',
      });
    }
    // shockwave rings
    boomParticles.rings = [
      { r: 0, a: 1, w: 6 },
      { r: 0, a: 0.8, w: 3 },
      { r: 0, a: 0.5, w: 2 },
    ];
  }

  let counterTarget = 10000000;
  let counterVal = 0;

  function tickCounter() {
    const step = Math.ceil((counterTarget - counterVal) / 12);
    counterVal += step;
    if (counterVal >= counterTarget) {
      counterVal = counterTarget;
      boomCounterEl.textContent = '+' + counterVal.toLocaleString();
      return;
    }
    boomCounterEl.textContent = '+' + counterVal.toLocaleString();
    requestAnimationFrame(tickCounter);
  }

  function animateBoom() {
    if (!boomRunning) return;
    boomParticles.warpTime = (boomParticles.warpTime || 0) + 0.016;

    // Fade with purple tint (portal warp atmosphere)
    boomCtx.fillStyle = 'rgba(5, 0, 15, 0.25)';
    boomCtx.fillRect(0, 0, boomW, boomH);

    const cx = boomW / 2;
    const cy = boomH / 2;

    // Draw central portal glow
    const portalGlow = Math.min(1, boomParticles.warpTime * 2);
    const gradient = boomCtx.createRadialGradient(cx, cy, 0, cx, cy, 200);
    gradient.addColorStop(0, `rgba(167, 139, 250, ${portalGlow * 0.8})`);
    gradient.addColorStop(0.5, `rgba(0, 255, 102, ${portalGlow * 0.3})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    boomCtx.fillStyle = gradient;
    boomCtx.fillRect(0, 0, boomW, boomH);

    // particles — spiral inward then burst outward
    for (let i = boomParticles.length - 1; i >= 0; i--) {
      const p = boomParticles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Check if particle reached center — switch to outward burst
      const distToCenter = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
      if (p.phase === 'inward' && distToCenter < 30) {
        p.phase = 'outward';
        const burstAngle = Math.atan2(p.y - cy, p.x - cx);
        const burstSpeed = Math.random() * 16 + 6;
        p.vx = Math.cos(burstAngle) * burstSpeed;
        p.vy = Math.sin(burstAngle) * burstSpeed;
      }

      // Outward phase has drag
      if (p.phase === 'outward') {
        p.vx *= 0.97;
        p.vy *= 0.97;
      }

      p.life -= p.decay;
      if (p.life <= 0) {
        boomParticles.splice(i, 1);
        continue;
      }

      // Draw particle with trail effect
      boomCtx.beginPath();
      boomCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      boomCtx.fillStyle = p.color;
      boomCtx.globalAlpha = p.life;
      boomCtx.shadowColor = p.color;
      boomCtx.shadowBlur = 12;
      boomCtx.fill();
    }
    boomCtx.globalAlpha = 1;
    boomCtx.shadowBlur = 0;

    // Portal rings — expanding from center
    if (boomParticles.rings) {
      for (const ring of boomParticles.rings) {
        ring.r += 12;
        ring.a *= 0.96;
        if (ring.a > 0.02) {
          boomCtx.beginPath();
          boomCtx.arc(cx, cy, ring.r, 0, Math.PI * 2);
          boomCtx.strokeStyle = `rgba(0, 255, 102, ${ring.a})`;
          boomCtx.lineWidth = ring.w;
          boomCtx.shadowColor = 'rgba(0, 255, 102, 0.8)';
          boomCtx.shadowBlur = 25;
          boomCtx.stroke();
        }
      }
      boomCtx.shadowBlur = 0;
    }

    if (boomParticles.length > 0 || (boomParticles.rings && boomParticles.rings.some(r => r.a > 0.02))) {
      requestAnimationFrame(animateBoom);
    } else {
      setTimeout(() => {
        window.location.href = 'main.html';
      }, 250);
    }
  }

  /* ============================================================
     ENTER BUTTON CLICK -> trigger explosion
     ============================================================ */
  // Audio autoplay workaround: prime an AudioContext on user gesture
  let audioPrimed = false;
  function primeAudio() {
    if (audioPrimed) return;
    audioPrimed = true;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // silent oscillator to unlock the audio context
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      // store context for main.html to reuse via localStorage signal
      window.__venomAudioCtx = ctx;
      sessionStorage.setItem('venom_audio_unlocked', '1');
    } catch (e) {
      console.warn('Audio prime failed', e);
    }
  }

  enterBtn.addEventListener('click', (e) => {
    primeAudio();
    // hide other phases
    phase3D.classList.add('hidden');
    phaseEnter.classList.add('hidden');
    phaseBoom.classList.remove('hidden');

    // center explosion
    resizeBoom();
    const cx = boomW / 2;
    const cy = boomH / 2;
    explode(cx, cy);

    // reset and animate counter
    counterVal = 0;
    boomCounterEl.textContent = '+0';
    boomCounterEl.style.opacity = '1';
    boomCounterEl.style.transition = 'opacity 0.2s';
    document.querySelector('.boom-text').style.opacity = '0';
    setTimeout(() => {
      document.querySelector('.boom-text').style.transition = 'opacity 0.8s';
      document.querySelector('.boom-text').style.opacity = '1';
    }, 200);

    boomRunning = true;
    animateBoom();
    tickCounter();

    // also burst a flash
    document.body.style.transition = 'background 0.15s';
    document.body.style.background = '#ffffff';
    setTimeout(() => {
      document.body.style.background = 'var(--v-black)';
    }, 90);
  });

  // allow keyboard Enter as well
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !phaseEnter.classList.contains('hidden')) {
      enterBtn.click();
    }
  });

})();
