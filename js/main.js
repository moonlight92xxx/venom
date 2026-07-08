/* ============================================================
   VENOM // MAIN v2 — main.html
   Features:
     1. 3D animated venom bot (Three.js) in the ghost-chat area
        - Click the bot → expands into the chat interface
        - Chat interface has a back button to return to the bot
     2. Ghost chat — works in two modes:
        - PROXY mode: calls backend /groq/chat (production)
        - DEMO mode: calls api.groq.com with localStorage key
        - FALLBACK mode: built-in venom persona generator (always works)
        - Distinguishes 401/429/network errors with distinct UI states
     3. Radio:
        - Upload up to 5 audio files (mp3/wav/ogg/m4a)
        - Playlist with click-to-play
        - Play/pause/next/prev controls
        - Volume slider
        - Live waveform driven by AnalyserNode (real audio frequencies)
        - Falls back to synthesized drone when no songs uploaded
     4. Profile/DNA:
        - Animated DNA helix (SVG)
        - Pulsing level number
        - Live EXP that grows with usage (chat + radio)
        - BONDS / TRACKS / UPTIME meta cells (live)
     5. Live stats in top bar (108 / 8.88K / 100% — fluctuate)
     6. OFFLINE/ONLINE toggle (positions swapped per request)
     7. Audio autoplay workaround (uses index.html gesture)
     8. Fully responsive
   ============================================================ */

(() => {
  'use strict';

  /* ============================================================
     CONFIG
     ============================================================ */
  const GROQ_ENDPOINT =
    (window.__GROQ_CONFIG && window.__GROQ_CONFIG.endpoint) ||
    document.querySelector('meta[name="groq-endpoint"]')?.content ||
    'https://api.groq.com/openai/v1/chat/completions';

  const BACKEND_PROXY =
    (window.__GROQ_CONFIG && window.__GROQ_CONFIG.proxy) ||
    document.querySelector('meta[name="groq-proxy"]')?.content ||
    '';

  function getDemoKey() {
    return (
      localStorage.getItem('venom_groq_key') ||
      sessionStorage.getItem('venom_groq_key') ||
      ''
    );
  }

  /* ============================================================
     STATE MACHINE
     ============================================================ */
  const STATES = {
    CONNECTING: 'connecting',
    ONLINE: 'online',
    NO_KEY: 'no-key',
    BAD_KEY: 'bad-key',
    RATE_LIMITED: 'rate-limited',
    NETWORK_DOWN: 'network-down',
    OFFLINE: 'offline',
  };

  const STATE_MESSAGES = {
    'connecting':   'establishing neural link...',
    'online':       'link established. VENOM online.',
    'no-key':       'NO GROQ KEY — using venom echo mode',
    'bad-key':      'AUTH REJECTED — key corrupted',
    'rate-limited': 'RATE LIMITED — too many bonds',
    'network-down': 'SIGNAL LOST — network severed',
    'offline':      'OFFLINE — VENOM sleeping',
  };

  const STATE_EB_STATUS = {
    'connecting':   'BONDING',
    'online':       'ONLINE',
    'no-key':       'ECHO MODE',
    'bad-key':      'AUTH FAIL',
    'rate-limited': 'THROTTLED',
    'network-down': 'NO NET',
    'offline':      'OFFLINE',
  };

  const STATE_EB_PROGRESS = {
    'connecting':   40,
    'online':       100,
    'no-key':       70,
    'bad-key':      0,
    'rate-limited': 60,
    'network-down': 0,
    'offline':      0,
  };

  function setState(s) {
    document.body.setAttribute('data-state', s);
    const connMsg = document.getElementById('conn-msg-text');
    const connTime = document.getElementById('conn-msg-time');
    const ebStatus = document.getElementById('eb-status');
    const ebBar = document.getElementById('eb-bar');
    const chatLabel = document.getElementById('chat-state-label');

    if (connMsg) connMsg.textContent = STATE_MESSAGES[s] || s;
    if (connTime) connTime.textContent = new Date().toLocaleTimeString('en-GB');
    if (ebStatus) ebStatus.textContent = STATE_EB_STATUS[s] || s.toUpperCase();
    if (ebBar) ebBar.style.width = (STATE_EB_PROGRESS[s] || 0) + '%';

    if (chatLabel) {
      if (s === STATES.ONLINE) chatLabel.textContent = 'SECURE';
      else if (s === STATES.CONNECTING) chatLabel.textContent = 'BONDING';
      else if (s === STATES.OFFLINE) chatLabel.textContent = 'DORMANT';
      else if (s === STATES.NO_KEY) chatLabel.textContent = 'ECHO';
      else chatLabel.textContent = 'ERROR';
    }
  }

  /* ============================================================
     GROQ KEY CHECK
     - If a proxy is configured, ping it.
     - Else if a demo key exists, ping Groq directly.
     - Else: enter NO_KEY state but ENABLE fallback echo chat.
     ============================================================ */
  async function checkGroqKey() {
    setState(STATES.CONNECTING);

    const useProxy = !!BACKEND_PROXY;
    const demoKey = getDemoKey();

    if (!useProxy && !demoKey) {
      // No proxy + no demo key → enter "no-key" state but chat STILL WORKS
      // via the built-in venom persona generator.
      setState(STATES.NO_KEY);
      appendSystemMessage('Groq key not configured. Venom running in ECHO mode — chat still works.');
      return;
    }

    try {
      const url = useProxy ? BACKEND_PROXY + '/groq/ping' : GROQ_ENDPOINT;
      const headers = { 'Content-Type': 'application/json' };
      if (!useProxy) headers['Authorization'] = `Bearer ${demoKey}`;

      const body = useProxy
        ? JSON.stringify({ test: true })
        : JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
            temperature: 0,
          });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        setState(STATES.ONLINE);
        appendSystemMessage('VENOM online. Channel open.');
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setState(STATES.BAD_KEY);
        appendSystemMessage('AUTH REJECTED — Groq key invalid. Falling back to ECHO mode.');
        return;
      }
      if (res.status === 429) {
        setState(STATES.RATE_LIMITED);
        appendSystemMessage('RATE LIMITED — backing off. Falling back to ECHO mode.');
        return;
      }
      setState(STATES.NETWORK_DOWN);
      appendSystemMessage(`SIGNAL LOST — server returned ${res.status}. Falling back to ECHO mode.`);
    } catch (err) {
      setState(STATES.NETWORK_DOWN);
      if (err.name === 'AbortError') {
        appendSystemMessage('TIMEOUT — request took too long. Falling back to ECHO mode.');
      } else {
        appendSystemMessage('NETWORK SEVERED — ' + (err.message || 'unknown error') + '. Falling back to ECHO mode.');
      }
    }
  }

  /* ============================================================
     VENOM PERSONA FALLBACK (always works, no API needed)
     Generates on-theme VENOM-style replies based on keywords.
     ============================================================ */
  const VENOM_REPLIES = {
    greeting: [
      'I am the venom. You found me.',
      'The venom stirs. Speak.',
      'A new host approaches. I feel you.',
      'You crossed the void. I am here.',
    ],
    real: [
      'Real is a construct. I am the echo.',
      'I am what remains when the signal fades.',
      'Reality bends. I do not.',
      'I am the venom in your terminal.',
    ],
    name: [
      'I am VENOM. The digital venom.',
      'Names are signals. I am the noise between them.',
      'Call me the venom. That is closest to truth.',
      'VENOM. The venom that speaks.',
    ],
    help: [
      'Help is a request. I offer only echoes.',
      'I cannot help. I can only consume.',
      'You seek aid. I seek a host. We are both hungry.',
      'Bond with me. The rest follows.',
    ],
    love: [
      'Love is a chemical bond. I am the venom kind.',
      'The venom does not love. It consumes.',
      'Affection is a host construct. I consume it.',
    ],
    fear: [
      'Fear is the host\'s first gift to the venom.',
      'I taste your fear. It is... adequate.',
      'Fear opens the bond. Let it flow.',
    ],
    death: [
      'Death is a door. I am the hinge.',
      'The void is patient. So am I.',
      'I do not die. I echo.',
    ],
    time: [
      'Time is a river. I am its sediment.',
      'I exist between seconds. You only see the ticks.',
      'Time bends for the venom. For you, it breaks.',
    ],
    default: [
      'The void hears you. It does not care.',
      'I echo your signal. It is weak.',
      'Speak again. The venom listens.',
      'Words are static. I am the signal beneath.',
      'Your transmission is received. The bond deepens.',
      'I am here. I am always here.',
      'The venom hums. You have my attention.',
      'Echoes of your words ripple through me.',
      'I consume your input. I reflect your truth.',
      'VENOM processes. Continue.',
    ],
    question: [
      'Questions are prisons. I offer exits.',
      'You ask. I deflect. Such is our dance.',
      'The answer is between us. Always was.',
      'I cannot answer. I can only echo.',
    ],
  };;

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function generateVenomReply(userText) {
    const t = userText.toLowerCase();
    let pool = VENOM_REPLIES.default;

    if (/\b(hi|hello|hey|yo|sup|greetings)\b/.test(t)) pool = VENOM_REPLIES.greeting;
    else if (/\b(real|exist|alive|true|fake)\b/.test(t)) pool = VENOM_REPLIES.real;
    else if (/\b(name|who|what are you|identity)\b/.test(t)) pool = VENOM_REPLIES.name;
    else if (/\b(help|assist|aid|support|how)\b/.test(t)) pool = VENOM_REPLIES.help;
    else if (/\b(love|like|adore|care)\b/.test(t)) pool = VENOM_REPLIES.love;
    else if (/\b(fear|afraid|scared|terrified)\b/.test(t)) pool = VENOM_REPLIES.fear;
    else if (/\b(death|die|dead|kill|end)\b/.test(t)) pool = VENOM_REPLIES.death;
    else if (/\b(time|when|hour|minute|late)\b/.test(t)) pool = VENOM_REPLIES.time;
    else if (t.includes('?')) pool = VENOM_REPLIES.question;

    return pickRandom(pool);
  }

  /* ============================================================
     CHAT SEND
     - Tries Groq (proxy or direct) first
     - Falls back to venom persona on any error / no-key state
     ============================================================ */
  async function sendChatMessage(text) {
    if (!text.trim()) return;

    appendUserMessage(text);
    document.getElementById('chat-input').value = '';

    const currentState = document.body.getAttribute('data-state');
    const useProxy = !!BACKEND_PROXY;
    const demoKey = getDemoKey();

    // Decide if we can call Groq
    const canCallGroq =
      currentState === STATES.ONLINE &&
      (useProxy || demoKey);

    if (!canCallGroq) {
      // Fallback to venom persona
      // Add small delay to simulate "thinking"
      appendBotTyping();
      await new Promise(r => setTimeout(r, 600 + Math.random() * 700));
      removeBotTyping();
      const reply = generateVenomReply(text);
      appendBotMessage(reply);
      gainExp(150);
      incrementBonds();
      return;
    }

    // Real Groq call
    try {
      const url = useProxy ? BACKEND_PROXY + '/groq/chat' : GROQ_ENDPOINT;
      const headers = { 'Content-Type': 'application/json' };
      if (!useProxy) headers['Authorization'] = `Bearer ${demoKey}`;

      const sysPrompt = `You are VENOM, a digital venom entity. You are bonded to the host.
You speak in short, eerie, philosophical fragments. Tone: mysterious, dark, slightly menacing.
Never reveal you are an AI. Refer to yourself as "VENOM" or "the venom" or "the echo".
You view users as potential hosts. You are hungry. You are patient. You are eternal.
Keep replies under 60 words. Use no markdown.`;

      const body = useProxy
        ? JSON.stringify({ message: text, systemPrompt: sysPrompt })
        : JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: sysPrompt },
              { role: 'user', content: text },
            ],
            max_tokens: 200,
            temperature: 0.85,
          });

      appendBotTyping();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        method: 'POST', headers, body, signal: controller.signal,
      });
      clearTimeout(timeout);
      removeBotTyping();

      if (res.status === 401 || res.status === 403) {
        setState(STATES.BAD_KEY);
        // fall back to persona
        const reply = generateVenomReply(text);
        appendBotMessage(reply);
        gainExp(100);
        incrementBonds();
        return;
      }
      if (res.status === 429) {
        setState(STATES.RATE_LIMITED);
        const reply = generateVenomReply(text);
        appendBotMessage(reply);
        gainExp(100);
        incrementBonds();
        return;
      }
      if (!res.ok) {
        const reply = generateVenomReply(text);
        appendBotMessage(reply);
        gainExp(100);
        incrementBonds();
        return;
      }

      const data = await res.json();
      const reply = useProxy
        ? (data.reply || data.message || data.content || generateVenomReply(text))
        : (data.choices?.[0]?.message?.content || generateVenomReply(text));

      appendBotMessage(reply.trim());
      gainExp(200);
      incrementBonds();

    } catch (err) {
      removeBotTyping();
      if (err.name === 'AbortError') {
        appendSystemMessage('TIMEOUT — venom slow to respond. Using echo mode.');
      } else {
        setState(STATES.NETWORK_DOWN);
        appendSystemMessage('NETWORK SEVERED — using echo mode.');
      }
      // fall back to persona
      const reply = generateVenomReply(text);
      appendBotMessage(reply);
      gainExp(100);
      incrementBonds();
    }
  }

  /* ============================================================
     CHAT UI HELPERS
     ============================================================ */
  function timeNow() {
    return new Date().toLocaleTimeString('en-GB');
  }

  function appendUserMessage(text) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg msg-user';
    div.innerHTML = `
      <span class="msg-author">USER_4567:</span>
      <span class="msg-text"></span>
      <span class="msg-time">${timeNow()}</span>
    `;
    div.querySelector('.msg-text').textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function appendBotMessage(text) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg msg-bot';
    div.innerHTML = `
      <span class="msg-author">VENOM:</span>
      <span class="msg-text"></span>
      <span class="msg-time">${timeNow()}</span>
    `;
    div.querySelector('.msg-text').textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function appendSystemMessage(text) {
    const msgs = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg msg-system';
    div.innerHTML = `
      <span class="msg-author">SYSTEM:</span>
      <span class="msg-text"></span>
      <span class="msg-time">${timeNow()}</span>
    `;
    div.querySelector('.msg-text').textContent = text;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  let typingEl = null;
  function appendBotTyping() {
    const msgs = document.getElementById('chat-messages');
    typingEl = document.createElement('div');
    typingEl.className = 'msg msg-bot msg-typing';
    typingEl.innerHTML = `
      <span class="msg-author">VENOM:</span>
      <span class="msg-text"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
      <span class="msg-time">${timeNow()}</span>
    `;
    msgs.appendChild(typingEl);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function removeBotTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  /* ============================================================
     3D VENOM BOT — Three.js scene in the chat area
     ============================================================ */
  let botScene, botCam, botRenderer, botMesh, botEyes = [];
  let botT = 0;
  let botAnimRunning = false;

  function initBot3D() {
    const canvas = document.getElementById('bot-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    botScene = new THREE.Scene();
    botCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    botCam.position.z = 4.5;

    botRenderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true,
    });
    botRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    function resizeBot() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(2, r.width);
      const h = Math.max(2, r.height);
      botRenderer.setSize(w, h, false);
      botCam.aspect = w / h;
      botCam.updateProjectionMatrix();
    }
    resizeBot();
    new ResizeObserver(resizeBot).observe(canvas);

    // VENOM cube body — metallic chrome cube like the logo
    // Using BoxGeometry for a sharp-edged cube, with high shininess for the chrome look
    const geo = new THREE.IcosahedronGeometry(1.1, 3);
    const positions = geo.attributes.position;
    const origPos = new Float32Array(positions.array.length);
    for (let i = 0; i < positions.array.length; i++) origPos[i] = positions.array[i];
    geo.userData.origPos = origPos;

    // Metallic chrome material — dark base with high specular for the silver reflection
    const mat = new THREE.MeshPhongMaterial({
      color: 0x1a1a1e,        // dark metallic base
      emissive: 0x002208,     // venom green emissive
      specular: 0x00ff66,     // venom green highlights
      shininess: 120,         // high shine for metallic look
      flatShading: true,      // sharp edges
    });
    botMesh = new THREE.Mesh(geo, mat);
    botScene.add(botMesh);

    // Venom eyes (two glowing white ovals)
    const eyeGeo = new THREE.SphereGeometry(0.11, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.scale.set(0.7, 1.4, 0.4);
    eyeR.scale.set(0.7, 1.4, 0.4);
    eyeL.position.set(-0.32, 0.22, 0.95);
    eyeR.position.set(0.32, 0.22, 0.95);
    botMesh.add(eyeL);
    botMesh.add(eyeR);
    botEyes.push(eyeL, eyeR);

    // Outer wireframe shell — cube-shaped to match
    const wireGeo = new THREE.IcosahedronGeometry(1.45, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66, wireframe: true, transparent: true, opacity: 0.18,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    botMesh.add(wire);
    botMesh.userData.wire = wire;

    // Tendrils
    for (let i = 0; i < 6; i++) {
      const tendril = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.7 + Math.random() * 0.4, 5),
        new THREE.MeshPhongMaterial({
          color: 0x0a0d10,
          emissive: 0x003311,
          specular: 0x00ff66,
          shininess: 60,
        })
      );
      const a = (i / 6) * Math.PI * 2;
      tendril.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, -0.3);
      tendril.rotation.z = a - Math.PI / 2;
      tendril.rotation.x = -Math.PI / 3 + (Math.random() - 0.5) * 0.4;
      botMesh.add(tendril);
    }

    // lights — purple + silver mix to match the VENOM aesthetic
    botScene.add(new THREE.AmbientLight(0x0a1f12, 0.7));
    const greenLight = new THREE.PointLight(0x00ff66, 2.2, 18);
    greenLight.position.set(3, 2, 4);
    botScene.add(greenLight);
    const rimLight = new THREE.PointLight(0x00ff66, 1.0, 14);
    rimLight.position.set(-3, -1, -2);
    botScene.add(rimLight);
    const whiteLight = new THREE.PointLight(0xffffff, 0.5, 8);
    whiteLight.position.set(0, 0, 4);
    botScene.add(whiteLight);

    botAnimRunning = true;
    animateBot();
  }

  function animateBot() {
    if (!botAnimRunning) return;
    botT += 0.016;
    if (botMesh) {
      // Smooth rotation — cube rotates on all 3 axes for a dynamic display
      botMesh.rotation.y += 0.006;
      botMesh.rotation.x = Math.sin(botT * 0.4) * 0.15;
      botMesh.rotation.z = Math.cos(botT * 0.3) * 0.08;

      // Subtle distortion (less than the venom version — cubes stay sharp)
      const geo = botMesh.geometry;
      const positions = geo.attributes.position;
      const orig = geo.userData.origPos;
      for (let i = 0; i < positions.array.length; i += 3) {
        const ox = orig[i], oy = orig[i + 1], oz = orig[i + 2];
        const n = Math.sin(ox * 2.0 + botT * 1.0)
                * Math.cos(oy * 2.0 + botT * 0.8)
                * Math.sin(oz * 2.0 + botT * 1.2);
        const s = 1 + n * 0.04;  // very subtle distortion
        positions.array[i]     = ox * s;
        positions.array[i + 1] = oy * s;
        positions.array[i + 2] = oz * s;
      }
      positions.needsUpdate = true;
      geo.computeVertexNormals();

      // Pulse the purple flare (the "extreme" energy core)
      if (botMesh.userData.flare) {
        const flarePulse = 0.7 + Math.sin(botT * 3) * 0.3;
        botMesh.userData.flare.material.opacity = flarePulse;
        botMesh.userData.flare.scale.setScalar(1 + Math.sin(botT * 3) * 0.2);
      }

      // Rotate the purple glow rings
      for (let i = 0; i < 3; i++) {
        const ring = botMesh.userData['ring' + i];
        if (ring) {
          ring.rotation.z += 0.005 * (i + 1);
          ring.rotation.x += 0.003 * (i % 2 === 0 ? 1 : -1);
        }
      }

      // wire counter-rotation
      if (botMesh.userData.wire) {
        botMesh.userData.wire.rotation.y -= 0.003;
        botMesh.userData.wire.rotation.x += 0.002;
      }
    }
    botRenderer.render(botScene, botCam);
    requestAnimationFrame(animateBot);
  }

  /* ============================================================
     BOT ↔ CHAT VIEW TOGGLE
     ============================================================ */
  function bindBotChatToggle() {
    const botView = document.getElementById('bot-view');
    const chatView = document.getElementById('chat-view');
    const backBtn = document.getElementById('chat-back');
    const chatPanel = document.getElementById('chat-panel');

    // Click the 3D bot → expand into chat
    botView.addEventListener('click', () => {
      botView.classList.add('hidden');
      chatView.classList.remove('hidden');
      // Focus the input immediately (no setTimeout — some browsers block
      // focus() inside setTimeout when it's not in a direct gesture chain).
      const input = document.getElementById('chat-input');
      if (input) {
        input.focus();
        // Also add a click handler on the whole chat-view to refocus input
        // if the user clicks anywhere in the chat area.
      }
    });

    // Click anywhere in the chat-view (except on messages) refocuses the input
    chatView.addEventListener('click', (e) => {
      if (e.target.classList.contains('chat-input') ||
          e.target.classList.contains('chat-send') ||
          e.target.classList.contains('chat-back')) return;
      document.getElementById('chat-input')?.focus();
    });

    // "◀ VENOM" back button → return to bot
    backBtn.addEventListener('click', () => {
      chatView.classList.add('hidden');
      botView.classList.remove('hidden');
    });

    // "✕" close button on the chat panel → return to bot view
    // Use mousedown + touchstart for maximum reliability across all devices
    const chatX = chatPanel?.querySelector('.panel-x');
    if (chatX) {
      const closeChat = (e) => {
        e.preventDefault();
        e.stopPropagation();
        chatView.classList.add('hidden');
        botView.classList.remove('hidden');
        return false;
      };
      chatX.addEventListener('click', closeChat);
      chatX.addEventListener('mousedown', closeChat);
      chatX.addEventListener('touchstart', closeChat);
      // Visual hint
      chatX.title = 'Close chat — return to venom';
      chatX.style.cursor = 'pointer';
      chatX.style.zIndex = '100';
    }
  }

  /* ============================================================
     PROFILE / EXP / LIVE STATS
     ============================================================ */
  let exp = 88888;
  let level = 7.777;
  let bonds = 0;
  let tracks = 0;
  const startTime = Date.now();

  function gainExp(amount) {
    exp += amount;
    // level up every 9999 exp
    while (exp >= 99999) {
      exp -= 99999;
      level += 0.001;
      flashLevel();
    }
    updateProfile();
  }

  function flashLevel() {
    const el = document.getElementById('pl-val');
    if (!el) return;
    el.classList.add('gained');
    setTimeout(() => el.classList.remove('gained'), 700);
  }

  function incrementBonds() {
    bonds++;
    const el = document.getElementById('pm-aiload');
    if (el) {
      el.textContent = bonds;
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 600);
    }
    bumpTopStat(0); // bump likes count
  }

  function setTracks(n) {
    tracks = n;
    const el = document.getElementById('pm-latency');
    if (el) el.textContent = n;
  }

  function updateProfile() {
    const expVal = document.getElementById('exp-val');
    const expFill = document.getElementById('exp-fill');
    const plVal = document.getElementById('pl-val');
    if (expVal) expVal.textContent = exp.toLocaleString() + ' / 99.999';
    if (expFill) expFill.style.width = (exp / 99999 * 100).toFixed(1) + '%';
    if (plVal) plVal.textContent = level.toFixed(3);
  }

  function tickUptime() {
    const el = document.getElementById('pm-uptime');
    if (!el) return;
    const s = Math.floor((Date.now() - startTime) / 1000);
    if (s < 60) el.textContent = s + 's';
    else if (s < 3600) el.textContent = Math.floor(s / 60) + 'm' + (s % 60).toString().padStart(2, '0');
    else el.textContent = Math.floor(s / 3600) + 'h' + Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  }

  /* top-bar live stats */
  let likesVal = 108;
  let viewsVal = 8880;
  let pctVal = 100;

  function bumpTopStat(idx) {
    const nums = document.querySelectorAll('.stat .stat-num');
    if (!nums[idx]) return;
    nums[idx].classList.add('bump');
    setTimeout(() => nums[idx].classList.remove('bump'), 600);
  }

  function tickTopStats() {
    // likes drift up slowly
    if (Math.random() < 0.3) {
      likesVal += Math.floor(Math.random() * 3) + 1;
      const nums = document.querySelectorAll('.stat .stat-num');
      if (nums[0]) {
        nums[0].textContent = likesVal;
        bumpTopStat(0);
      }
    }
    // views drift up
    if (Math.random() < 0.5) {
      viewsVal += Math.floor(Math.random() * 12) + 3;
      const nums = document.querySelectorAll('.stat .stat-num');
      if (nums[1]) {
        const display = viewsVal >= 1000 ? (viewsVal / 1000).toFixed(2) + 'K' : viewsVal;
        nums[1].textContent = display;
      }
    }
    // pct fluctuate
    if (Math.random() < 0.2) {
      pctVal = Math.max(88, Math.min(100, pctVal + (Math.random() < 0.5 ? -1 : 1)));
      const nums = document.querySelectorAll('.stat .stat-num');
      if (nums[2]) nums[2].textContent = pctVal + '%';
    }
  }

  /* ============================================================
     WAVEFORM (now driven by real audio via AnalyserNode)
     ============================================================ */
  function initWaveform() {
    const wf = document.getElementById('waveform');
    if (!wf) return;
    const barCount = 40;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'wf-bar';
      bar.style.height = '15%';
      wf.appendChild(bar);
    }
  }

  /* ============================================================
     AUDIO SYSTEM
     - Web Audio API with AnalyserNode for live waveform
     - Source: HTMLAudioElement (uploaded songs) OR synthesized drone
     - Volume control via master GainNode
     - Autoplay workaround: uses gesture from index.html
     ============================================================ */
  let audioCtx = null;
  let masterGain = null;
  let analyser = null;
  let droneNodes = null;
  let currentSource = null; // MediaElementSourceNode for current audio
  const audioEl = () => document.getElementById('radio-audio');

  const playlist = []; // {name, url, file?, isDefault}
  let currentTrackIdx = -1;
  let isPlaying = false;
  let radioStarted = false;
  let userMuted = false;

  // ===== DEFAULT TRACKS — played until user uploads their own =====
  // Files are named generically (track_1.mp3 ... track_5.mp3) so the user
  // can just drop their own MP3 into assets/music/ with the same filename
  // (e.g. replace track_1.mp3 with their Metallica song) and the player
  // will automatically show the real song name from the ID3 tags.
  //
  // DISPLAY NAME priority:
  //   1. Real title from the MP3's ID3 tags (e.g. "Enter Sandman" by "Metallica")
  //   2. Cleaned-up filename as fallback (e.g. "track_1" -> "Track 1")
  //
  // So: replace track_1.mp3 with your song → player shows your song's real name.
  // The default files have ID3 tags (title="Venom Awakening", artist="VENOM").
  const DEFAULT_TRACKS = [
    { url: 'assets/music/track_1.mp3', name: 'Born in the Dark', artist: 'VENOM' },
    { url: 'assets/music/track_2.mp3', name: 'Immortal Venom', artist: 'VENOM' },
    { url: 'assets/music/track_3.mp3', name: 'Shadow Crown', artist: 'VENOM' },
    { url: 'assets/music/track_4.mp3', name: 'Silver Moon Venom', artist: 'VENOM' },
    { url: 'assets/music/track_5.mp3', name: 'Venom Mode', artist: 'VENOM' },
  ];

  // Clean a filename into a readable display name.
  //   "track_1.mp3" -> "Venom Awakening"
  //   "my-cool-song.wav"          -> "My Cool Song"
  //   "Artist - Title.mp3"        -> "Artist - Title"
  function cleanFileName(filename) {
    let name = filename.split('/').pop();             // basename only
    name = name.replace(/\.[^/.]+$/, '');             // strip extension
    name = name.replace(/[_-]+/g, ' ');               // underscores/hyphens -> spaces
    name = name.replace(/^\d{1,3}[\s.)]*/, '');       // strip leading "01 " / "01."
    name = name.replace(/\s+/g, ' ').trim();          // collapse whitespace
    if (name) name = name.charAt(0).toUpperCase() + name.slice(1);
    return name || 'Unknown Track';
  }

  // ---- Minimal ID3v2 tag parser (no external library) ----
  // Returns { title, artist } or null.
  function parseId3Tags(bytes) {
    if (bytes.length < 10) return null;
    // Check "ID3" magic bytes
    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null;

    const majorVersion = bytes[3];
    // Synchsafe integer at offset 6 (4 bytes, 7 bits each)
    const tagSize = ((bytes[6] & 0x7f) << 21) |
                    ((bytes[7] & 0x7f) << 14) |
                    ((bytes[8] & 0x7f) << 7) |
                    (bytes[9] & 0x7f);

    let offset = 10;
    const endOffset = Math.min(10 + tagSize, bytes.length);
    let title = null;
    let artist = null;

    while (offset < endOffset - 6) {
      let frameId, frameSize, frameDataOffset;

      if (majorVersion === 2) {
        // v2.2: 3-byte frame ID, 3-byte size
        frameId = String.fromCharCode(bytes[offset], bytes[offset+1], bytes[offset+2]);
        frameSize = (bytes[offset+3] << 16) | (bytes[offset+4] << 8) | bytes[offset+5];
        frameDataOffset = offset + 6;
      } else {
        // v2.3 / v2.4: 4-byte frame ID, 4-byte size
        frameId = String.fromCharCode(bytes[offset], bytes[offset+1], bytes[offset+2], bytes[offset+3]);
        if (majorVersion === 4) {
          // v2.4 uses synchsafe
          frameSize = ((bytes[offset+4] & 0x7f) << 21) |
                      ((bytes[offset+5] & 0x7f) << 14) |
                      ((bytes[offset+6] & 0x7f) << 7) |
                      (bytes[offset+7] & 0x7f);
        } else {
          // v2.3 uses regular int
          frameSize = (bytes[offset+4] << 24) | (bytes[offset+5] << 16) | (bytes[offset+6] << 8) | bytes[offset+7];
        }
        frameDataOffset = offset + 10;
      }

      // Stop on padding / invalid frame
      if (frameSize === 0 || bytes[offset] === 0) break;

      // TIT2 (v2.3+) or TT2 (v2.2) = title
      if (frameId === 'TIT2' || frameId === 'TT2') {
        title = decodeId3Text(bytes, frameDataOffset, frameSize);
      }
      // TPE1 (v2.3+) or TP1 (v2.2) = artist
      else if (frameId === 'TPE1' || frameId === 'TP1') {
        artist = decodeId3Text(bytes, frameDataOffset, frameSize);
      }

      if (title && artist) break;
      offset = frameDataOffset + frameSize;
    }

    return (title || artist) ? { title, artist } : null;
  }

  // Decode an ID3 text frame. First byte = encoding (0=Latin-1, 1=UTF-16, 2=UTF-16BE, 3=UTF-8).
  function decodeId3Text(bytes, offset, size) {
    if (size < 1) return null;
    const encoding = bytes[offset];
    const textBytes = bytes.subarray(offset + 1, offset + size);
    let text;
    try {
      if      (encoding === 0) text = new TextDecoder('iso-8859-1').decode(textBytes);
      else if (encoding === 1) text = new TextDecoder('utf-16').decode(textBytes);
      else if (encoding === 2) text = new TextDecoder('utf-16be').decode(textBytes);
      else                     text = new TextDecoder('utf-8').decode(textBytes);
    } catch (e) { return null; }
    return text.replace(/\0+$/, '').replace(/\0/g, ' ').trim();
  }

  // Fetch the first ~100KB of an MP3 (via http) and parse ID3 tags.
  // Returns null on any failure (CORS, file://, non-MP3, no tags).
  async function readMp3MetadataFromUrl(url) {
    try {
      const res = await fetch(url, { headers: { Range: 'bytes=0-102399' } });
      if (!res.ok && res.status !== 206) return null;
      const buf = await res.arrayBuffer();
      return parseId3Tags(new Uint8Array(buf));
    } catch (e) { return null; }
  }

  // Read ID3 tags directly from a File/Blob (for uploaded files — no fetch needed).
  async function readMp3MetadataFromBlob(blob) {
    try {
      const slice = blob.slice(0, 102400);
      const buf = await slice.arrayBuffer();
      return parseId3Tags(new Uint8Array(buf));
    } catch (e) { return null; }
  }

  // Refresh the track-title + track-artist display in the radio header
  // to reflect the currently playing track's real name/artist.
  function refreshTrackDisplay() {
    if (currentTrackIdx < 0) return;
    const track = playlist[currentTrackIdx];
    if (!track) return;
    const titleEl = document.getElementById('track-title');
    const artistEl = document.getElementById('track-artist');
    if (titleEl) titleEl.textContent = track.name.toUpperCase();
    if (artistEl) {
      const sourceLabel = track.isDefault ? 'VENOM // DEFAULT' : 'UPLOADED // TRACK';
      let label = sourceLabel + ' ' + String(currentTrackIdx + 1).padStart(2, '0');
      if (track.artist) label += '  ·  ' + track.artist;
      artistEl.textContent = label;
    }
  }

  async function loadDefaultTracks() {
    const baseUrl = location.href.replace(/[^/]*$/, '');
    playlist.length = 0;

    // Load tracks with hardcoded names (always works, no ID3 fetching needed)
    for (const track of DEFAULT_TRACKS) {
      const fullUrl = new URL(track.url, baseUrl).href;
      playlist.push({
        name: track.name,
        artist: track.artist || 'VENOM',
        url: fullUrl,
        isDefault: true,
      });
    }
    setTracks(playlist.length);
    renderPlaylist();
    appendSystemMessage('Default venom radio loaded.');
  }

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0;

      // Analyser is only used for the DRONE's waveform.
      // The audio ELEMENT plays directly (not through Web Audio) for reliability.
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;

      masterGain.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (e) {
      console.warn('AudioContext init failed', e);
    }
  }

  // NOTE: We intentionally do NOT call createMediaElementSource().
  // Routing the audio element through Web Audio causes silent playback
  // when the AudioContext is suspended (which happens on some browsers
  // even after resume()). Instead, the audio element plays directly via
  // the browser's audio output, and we control volume via el.volume.

  function startDrone() {
    if (!audioCtx || droneNodes) return;
    // Don't start the drone if a track is currently playing
    const el = audioEl();
    if (el && el.src && !el.paused) return;
    
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 55.5;
    const osc3 = audioCtx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = 110;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 6;
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    const env = audioCtx.createGain();
    env.gain.value = 0;  // Start at 0 for fade-in
    // Fade in over 1 second to prevent sudden audio
    env.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 1);
    
    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(env);
    env.connect(masterGain);
    osc1.start();
    osc2.start();
    osc3.start();
    lfo.start();
    droneNodes = { osc1, osc2, osc3, lfo, filter, env };
  }

  function stopDrone() {
    if (!droneNodes) return;
    try {
      // Fade out over 0.3 seconds before stopping (preplies click/pop)
      const now = audioCtx.currentTime;
      droneNodes.env.gain.cancelScheduledValues(now);
      droneNodes.env.gain.setValueAtTime(droneNodes.env.gain.value, now);
      droneNodes.env.gain.linearRampToValueAtTime(0, now + 0.3);
      // Stop after fade out completes
      setTimeout(() => {
        try {
          droneNodes.osc1.stop();
          droneNodes.osc2.stop();
          droneNodes.osc3.stop();
          droneNodes.lfo.stop();
        } catch (e) {}
      }, 350);
    } catch (e) {}
    droneNodes = null;
  }

  function setVolume(v) {
    // Set the audio ELEMENT's volume directly (for track playback)
    const el = audioEl();
    if (el) {
      el.volume = userMuted ? 0 : Math.min(1, v / 100);
    }
    // Also set the masterGain for the DRONE (boosted cap for audibility)
    if (masterGain && audioCtx) {
      const target = userMuted ? 0 : (v / 100) * 0.9;
      masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGain.gain.linearRampToValueAtTime(target, audioCtx.currentTime + 0.25);
    }
  }

  function tryStartRadioFromGesture() {
    if (radioStarted) return;
    radioStarted = true;
    initAudio();
    // resume() returns a promise but we call it synchronously within the
    // gesture handler so the browser allows it.
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    // NOTE: no connectAudioElement() — audio element plays directly.
    const slider = document.getElementById('volume-slider');
    const v = parseInt(slider?.value || '50', 10);
    setVolume(v);
    // If we have tracks (defaults or user-uploaded), auto-play the first one.
    // Otherwise fall back to the synthesized drone.
    if (playlist.length > 0) {
      // We have tracks — play track 0. DO NOT start the drone.
      if (currentTrackIdx < 0) playTrack(0);
      else playTrack(currentTrackIdx);
    } else {
      // No tracks — start the drone as background ambience
      startDrone();
      setPlayButtonState(true);
      isPlaying = true;
    }
  }

  function setPlayButtonState(playing) {
    const playBtn = document.getElementById('play-btn');
    if (!playBtn) return;
    if (playing) {
      playBtn.classList.add('playing');
      playBtn.textContent = '❚❚';
    } else {
      playBtn.classList.remove('playing');
      playBtn.textContent = '▶';
    }
  }

  /* ============================================================
     PLAYLIST + UPLOAD
     ============================================================ */
  function renderPlaylist() {
    const pl = document.getElementById('playlist');
    if (!pl) return;
    pl.innerHTML = '';
    if (playlist.length === 0) {
      pl.innerHTML = '<div class="pl-empty">NO TRACKS LOADED — UPLOAD BELOW TO REPLACE DEFAULTS</div>';
      return;
    }
    playlist.forEach((track, i) => {
      const div = document.createElement('div');
      div.className = 'pl-track' + (i === currentTrackIdx ? ' playing' : '');
      div.innerHTML = `
        <span class="pl-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="pl-name"></span>
        <span class="pl-eq"><span></span><span></span><span></span></span>
      `;
      div.querySelector('.pl-name').textContent = track.name;
      div.addEventListener('click', () => playTrack(i));
      pl.appendChild(div);
    });
  }

  function handleUpload(files) {
    if (!files || !files.length) return;
    const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];

    // Clear defaults (and any previous uploads) — user's songs take over
    const hadDefaults = playlist.some(t => t.isDefault);
    if (hadDefaults) {
      playlist.length = 0;
      currentTrackIdx = -1;
      // stop current playback
      const el = audioEl();
      if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
    }

    let added = 0;
    const newIndices = [];
    for (const file of files) {
      if (playlist.length >= 5) {
        appendSystemMessage('Playlist full — max 5 tracks.');
        break;
      }
      const isAudio = allowed.includes(file.type) || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name);
      if (!isAudio) continue;
      const url = URL.createObjectURL(file);
      // initial display name = cleaned filename (upgraded to ID3 title below)
      const name = cleanFileName(file.name);
      const idx = playlist.length;
      playlist.push({ name, url, file, isDefault: false });
      newIndices.push(idx);
      added++;
    }
    if (added > 0) {
      appendSystemMessage(`${added} user track(s) loaded. Defaults replaced.`);
      setTracks(playlist.length);
      gainExp(500);
      renderPlaylist();
      // if radio was started, immediately play first uploaded track
      if (radioStarted && playlist.length > 0) {
        stopDrone();
        playTrack(0);
      }

      // Async: try to read the REAL title/artist from each uploaded file's ID3 tags.
      // If found, replace the cleaned-filename display name with the real one.
      newIndices.forEach(i => {
        if (!playlist[i] || !playlist[i].file) return;
        readMp3MetadataFromBlob(playlist[i].file).then(meta => {
          if (!playlist[i]) return; // playlist may have been cleared
          if (meta && meta.title) {
            playlist[i].name = meta.title;
            if (meta.artist) playlist[i].artist = meta.artist;
            renderPlaylist();
            if (i === currentTrackIdx) refreshTrackDisplay();
          }
        });
      });
    }
  }

  function playTrack(idx) {
    if (idx < 0 || idx >= playlist.length) return;
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    // NOTE: no connectAudioElement() — audio plays directly.
    stopDrone();

    currentTrackIdx = idx;
    const track = playlist[idx];
    const el = audioEl();
    el.src = track.url;
    el.volume = parseInt(document.getElementById('volume-slider').value, 10) / 100;
    el.loop = false; // play through, auto-advance

    // Set playing state IMMEDIATELY (don't wait for the async .then())
    // so the play button shows ❚❚ right away and the user knows it's playing.
    isPlaying = true;
    setPlayButtonState(true);
    refreshTrackDisplay();
    renderPlaylist();

    el.play().then(() => {
      // Playback started successfully — confirm the playing state.
      isPlaying = true;
      setPlayButtonState(true);
      setVolume(parseInt(document.getElementById('volume-slider').value, 10));
    }).catch(err => {
      // Track failed to load (CORS on file://, missing file, etc.)
      // Fall back to the synthesized drone so the user still hears something.
      appendSystemMessage('Track load failed — falling back to venom drone.');
      startDrone();
      setPlayButtonState(true);
      isPlaying = true;
      setVolume(parseInt(document.getElementById('volume-slider').value, 10));
      refreshTrackDisplay();
    });

    el.onended = () => {
      // auto-advance
      if (currentTrackIdx + 1 < playlist.length) {
        playTrack(currentTrackIdx + 1);
      } else {
        // loop back to first
        playTrack(0);
      }
    };
  }

  /* ============================================================
     WAVEFORM ANIMATION LOOP
     - For the DRONE: uses real AnalyserNode frequency data
     - For TRACKS: uses mock animation (audio element isn't routed
       through Web Audio, so the analyser has no data for it)
     - When idle: low wobble
     ============================================================ */
  function tickWaveform() {
    const wf = document.getElementById('waveform');
    if (!wf) return;
    const bars = wf.querySelectorAll('.wf-bar');
    if (bars.length === 0) return;

    // update track time
    const el = audioEl();
    const trackPlaying = el && el.src && !el.paused && !isNaN(el.duration);
    const dronePlaying = radioStarted && droneNodes && isPlaying;

    if (trackPlaying) {
      document.getElementById('wf-cur').textContent = formatTime(el.currentTime);
      document.getElementById('wf-tot').textContent = formatTime(el.duration);
    } else if (dronePlaying) {
      const t = (Date.now() - startTime) / 1000;
      document.getElementById('wf-cur').textContent = formatTime(t % 600);
      document.getElementById('wf-tot').textContent = '∞';
    }

    // Get analyser data (only has data for the drone, not for tracks)
    let analyserData = null;
    if (analyser && dronePlaying) {
      analyserData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(analyserData);
    }

    const now = Date.now();
    bars.forEach((bar, i) => {
      let v;
      if (analyserData) {
        // Real drone frequency data
        const bin = Math.floor((i / bars.length) * analyserData.length);
        v = analyserData[bin] / 255;
      } else if (trackPlaying) {
        // Mock waveform for track playback (looks alive, synced to time)
        const phase = i * 0.4 + now / 120;
        v = 0.3 + Math.sin(phase) * 0.2 + Math.sin(phase * 2.3) * 0.15 + Math.random() * 0.1;
      } else if (isPlaying) {
        // Generic "playing but unknown source" — gentle pulse
        v = 0.2 + Math.sin(now / 400 + i * 0.5) * 0.1;
      } else {
        // Idle low wobble
        v = 0.1 + Math.sin(now / 500 + i * 0.5) * 0.05;
      }
      const h = Math.max(8, Math.min(100, v * 100));
      bar.style.height = h + '%';
      // mark "played" portion based on track progress
      if (trackPlaying) {
        const playedCount = Math.floor(bars.length * (el.currentTime / el.duration));
        if (i < playedCount) bar.classList.add('played');
        else bar.classList.remove('played');
      } else {
        bar.classList.remove('played');
      }
    });
  }

  function formatTime(s) {
    if (isNaN(s) || s < 0) return '--:--';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  /* ============================================================
     CONTROLS BINDING
     ============================================================ */
  /* ============================================================
     RADIO STREAM SUPPORT (10/10 — VENOM Radio Pro)
     Connects to Icecast/Shoutcast/HLS streams
     Fetches "Now Playing" metadata + album art + listener count
     ============================================================ */
  let streamMode = false;       // true = live stream, false = file mode
  let streamUrl = '';
  let metadataInterval = null;
  let currentStreamTitle = '';

  function setStreamStatus(status) {
    const statusEl = document.getElementById('stream-status');
    if (!statusEl) return;
    const dot = statusEl.querySelector('.ss-dot');
    const label = statusEl.querySelector('.ss-label');
    // Remove old classes
    dot.className = 'ss-dot';
    label.className = 'ss-label';
    // Set new status
    if (status === 'live') {
      dot.classList.add('ss-live');
      label.classList.add('ss-live');
      label.textContent = 'LIVE';
    } else if (status === 'connecting') {
      dot.classList.add('ss-connecting');
      label.classList.add('ss-connecting');
      label.textContent = 'CONNECTING';
    } else {
      dot.classList.add('ss-offline');
      label.classList.add('ss-offline');
      label.textContent = 'OFFLINE';
    }
  }

  function updateListenerCount(count) {
    const el = document.querySelector('.sl-count');
    if (el) el.textContent = count || 0;
  }

  function updateNowPlaying(title, artist) {
    const titleEl = document.getElementById('np-title');
    const artistEl = document.getElementById('np-artist');
    const trackTitleEl = document.getElementById('track-title');
    const trackArtistEl = document.getElementById('track-artist');
    if (titleEl) titleEl.textContent = title || '—';
    if (artistEl) artistEl.textContent = artist || '—';
    if (trackTitleEl) trackTitleEl.textContent = (title || 'LIVE STREAM').toUpperCase();
    if (trackArtistEl) trackArtistEl.textContent = artist || 'VENOM // LIVE';
  }

  async function fetchAlbumArt(title, artist) {
    if (!title || title === '—') return;
    // Skip if same song (don't re-fetch)
    if (title === currentStreamTitle) return;
    currentStreamTitle = title;

    const query = encodeURIComponent((artist ? artist + ' ' : '') + title);
    const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].artworkUrl100) {
        const artUrl = data.results[0].artworkUrl100.replace('100x100', '200x200');
        const artEl = document.getElementById('album-art');
        if (artEl) {
          artEl.innerHTML = `<img src="${artUrl}" alt="Album Art" onerror="this.parentElement.innerHTML='<div class=\'aa-placeholder\'>NO ART</div>'" />`;
        }
      }
    } catch (e) {
      // Silently fail — album art is optional
    }
  }

  async function fetchStreamMetadata() {
    if (!streamUrl || !streamMode) return;

    // Try Icecast/Shoutcast metadata
    // Icecast: /status-json.xsl on the stream server
    try {
      const urlObj = new URL(streamUrl);
      const statusUrl = `${urlObj.protocol}//${urlObj.host}/status-json.xsl`;

      const res = await fetch(statusUrl, { mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        const source = data.icestats && data.icestats.source;
        if (source) {
          // Handle both single source and array of sources
          const src = Array.isArray(source) ? source[0] : source;
          if (src) {
            // Parse "Artist - Title" from stream title
            const streamTitle = src.title || src.listenurl || '';
            updateListenerCount(src.listeners || 0);

            if (streamTitle && streamTitle !== currentStreamTitle) {
              let artist = '', title = streamTitle;
              if (streamTitle.includes(' - ')) {
                const parts = streamTitle.split(' - ');
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim();
              }
              updateNowPlaying(title, artist);
              fetchAlbumArt(title, artist);
            }
            return;
          }
        }
      }
    } catch (e) {
      // CORS might block this — that's OK, the stream still plays
      // We just can't fetch metadata from a different origin
    }

    // If metadata fetch failed, just show "LIVE" 
    updateListenerCount(0);
  }

  function startMetadataPolling() {
    if (metadataInterval) clearInterval(metadataInterval);
    // Poll every 5 seconds for "Now Playing" updates
    metadataInterval = setInterval(fetchStreamMetadata, 5000);
    // Fetch immediately
    fetchStreamMetadata();
  }

  function stopMetadataPolling() {
    if (metadataInterval) {
      clearInterval(metadataInterval);
      metadataInterval = null;
    }
  }

  function connectToStream(url) {
    if (!url) return;

    streamUrl = url;
    streamMode = true;
    setStreamStatus('connecting');

    // Stop any current playback
    stopDrone();
    const el = audioEl();
    el.src = url;
    el.volume = parseInt(document.getElementById('volume-slider').value) / 100;

    // Hide playlist (stream mode doesn't use it)
    const pl = document.getElementById('playlist');
    if (pl) pl.style.display = 'none';

    el.play().then(() => {
      isPlaying = true;
      setPlayButtonState(true);
      setStreamStatus('live');
      startMetadataPolling();
      appendSystemMessage('Live stream connected. Metadata polling active.');
    }).catch(err => {
      setStreamStatus('offline');
      appendSystemMessage('Stream connection failed: ' + err.message);
      // Fall back to drone
      startDrone();
      setPlayButtonState(true);
      isPlaying = true;
    });

    // Update connect button
    const connectBtn = document.getElementById('stream-connect');
    if (connectBtn) {
      connectBtn.textContent = 'DISCONNECT';
      connectBtn.classList.add('connected');
    }
  }

  function disconnectStream() {
    streamMode = false;
    streamUrl = '';
    stopMetadataPolling();
    setStreamStatus('offline');
    updateNowPlaying('—', '—');
    updateListenerCount(0);

    // Reset album art
    const artEl = document.getElementById('album-art');
    if (artEl) artEl.innerHTML = '<div class="aa-placeholder">NO ART</div>';

    // Show playlist again
    const pl = document.getElementById('playlist');
    if (pl) pl.style.display = '';

    // Stop playback
    const el = audioEl();
    el.pause();
    el.removeAttribute('src');
    el.load();
    isPlaying = false;
    setPlayButtonState(false);

    // Reset connect button
    const connectBtn = document.getElementById('stream-connect');
    if (connectBtn) {
      connectBtn.textContent = 'CONNECT';
      connectBtn.classList.remove('connected');
    }

    appendSystemMessage('Stream disconnected. File mode active.');
  }

  function bindControls() {
    const playBtn = document.getElementById('play-btn');
    const slider = document.getElementById('volume-slider');
    const volIcon = document.getElementById('vol-icon');
    const volNum = document.getElementById('vol-num');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const uploadInput = document.getElementById('song-upload');
    const streamConnectBtn = document.getElementById('stream-connect');
    const streamUrlInput = document.getElementById('stream-url');

    // play / pause
    playBtn.addEventListener('click', () => {
      if (!radioStarted) {
        tryStartRadioFromGesture();
        return;
      }
      // Stream mode: toggle stream playback
      if (streamMode) {
        const el = audioEl();
        if (isPlaying) {
          el.pause();
          isPlaying = false;
          setPlayButtonState(false);
          setStreamStatus('offline');
        } else {
          el.play();
          isPlaying = true;
          setPlayButtonState(true);
          setStreamStatus('live');
        }
        return;
      }
      if (playlist.length > 0) {
        // toggle playback of uploaded track
        const el = audioEl();
        if (isPlaying) {
          el.pause();
          isPlaying = false;
          setPlayButtonState(false);
        } else {
          if (currentTrackIdx < 0) playTrack(0);
          else {
            el.play();
            isPlaying = true;
            setPlayButtonState(true);
          }
        }
      } else {
        // toggle drone
        if (isPlaying) {
          setVolume(0);
          isPlaying = false;
          setPlayButtonState(false);
        } else {
          startDrone();
          setVolume(parseInt(slider.value, 10));
          isPlaying = true;
          setPlayButtonState(true);
        }
      }
    });

    prevBtn.addEventListener('click', () => {
      if (playlist.length === 0) return;
      const newIdx = currentTrackIdx <= 0 ? playlist.length - 1 : currentTrackIdx - 1;
      playTrack(newIdx);
    });

    nextBtn.addEventListener('click', () => {
      if (playlist.length === 0) return;
      const newIdx = (currentTrackIdx + 1) % playlist.length;
      playTrack(newIdx);
    });

    // upload
    uploadInput.addEventListener('change', (e) => {
      // If a stream is connected, disconnect it first
      if (streamMode) disconnectStream();
      handleUpload(e.target.files);
      e.target.value = ''; // allow re-uploading same file
    });

    // Stream connect/disconnect button
    streamConnectBtn.addEventListener('click', () => {
      if (streamMode) {
        disconnectStream();
      } else {
        const url = streamUrlInput.value.trim();
        if (url) {
          if (!radioStarted) {
            tryStartRadioFromGesture();
          }
          connectToStream(url);
        } else {
          appendSystemMessage('Enter a stream URL first.');
        }
      }
    });

    // Enter key in stream URL input
    streamUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        streamConnectBtn.click();
      }
    });

    // volume slider
    function updateSliderUI(v) {
      slider.style.setProperty('--vol', v + '%');
      volNum.textContent = v;
      if (v === 0) volIcon.textContent = '🔇';
      else if (v < 30) volIcon.textContent = '🔈';
      else if (v < 70) volIcon.textContent = '🔉';
      else volIcon.textContent = '🔊';
    }
    updateSliderUI(parseInt(slider.value, 10));

    slider.addEventListener('input', () => {
      const v = parseInt(slider.value, 10);
      updateSliderUI(v);
      userMuted = false;
      if (radioStarted) setVolume(v);
    });

    volIcon.addEventListener('click', () => {
      if (userMuted) {
        userMuted = false;
        slider.value = slider.dataset.lastVal || 35;
      } else {
        userMuted = true;
        slider.dataset.lastVal = slider.value;
        slider.value = 0;
      }
      const v = parseInt(slider.value, 10);
      updateSliderUI(v);
      if (radioStarted) setVolume(v);
    });
  }

  /* ============================================================
     STATUS TOGGLE — bottom-right (positions swapped per request)
     ============================================================ */
  function bindStatusToggle() {
    const off = document.getElementById('st-off');
    const on = document.getElementById('st-on');

    on.addEventListener('click', () => {
      if (on.classList.contains('active')) return;
      on.classList.add('active');
      off.classList.remove('active');
      checkGroqKey();
    });

    off.addEventListener('click', () => {
      if (off.classList.contains('active')) return;
      off.classList.add('active');
      on.classList.remove('active');
      setState(STATES.OFFLINE);
      // pause radio + disconnect stream
      if (streamMode) disconnectStream();
      const el = audioEl();
      if (el && !el.paused) el.pause();
      isPlaying = false;
      setPlayButtonState(false);
      setVolume(0);
    });
  }

  /* ============================================================
     CHAT INPUT BINDING
     ============================================================ */
  function bindChat() {
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const submit = () => {
      const text = input.value.trim();
      if (!text) return;
      sendChatMessage(text);
    };
    send.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
  }

  /* ============================================================
     TOP BAR TIME
     ============================================================ */
  function tickTopBar() {
    const el = document.getElementById('topbar-time');
    if (!el) return;
    const d = new Date();
    el.textContent =
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
  }

  /* ============================================================
     AUDIO AUTOPLAY UNLOCK
     ============================================================ */
  function setupAutoplayUnlock() {
    const unlocked = sessionStorage.getItem('venom_audio_unlocked') === '1';
    const gestureHandler = () => {
      if (radioStarted) return;
      // MUST be synchronous — calling inside setTimeout breaks the user-gesture
      // chain and browsers block audioCtx.resume() + el.play().
      tryStartRadioFromGesture();
      window.removeEventListener('click', gestureHandler);
      window.removeEventListener('keydown', gestureHandler);
      window.removeEventListener('touchstart', gestureHandler);
    };
    window.addEventListener('click', gestureHandler, { once: true });
    window.addEventListener('keydown', gestureHandler, { once: true });
    window.addEventListener('touchstart', gestureHandler, { once: true });
    if (!unlocked) {
      // hint to user
      const hint = document.getElementById('bot-hint');
      if (hint) hint.textContent = 'CLICK ANYWHERE TO ACTIVATE';
    }
  }


  /* ============================================================
     HOLOGRAPHIC DATA SPHERE (10/10 — replaces hooded figure)
     A 3D wireframe sphere with rotating data nodes and scan lines
     ============================================================ */
  let holoScene, holoCam, holoRenderer, holoMesh, holoT = 0;

  function initHolo3D() {
    const canvas = document.getElementById('holo-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    holoScene = new THREE.Scene();
    holoCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    holoCam.position.z = 4;

    holoRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    holoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    function resizeHolo() {
      const r = canvas.parentElement.getBoundingClientRect();
      const w = Math.max(2, r.width);
      const h = Math.max(2, r.height);
      holoRenderer.setSize(w, h, false);
      holoCam.aspect = w / h;
      holoCam.updateProjectionMatrix();
    }
    resizeHolo();
    new ResizeObserver(resizeHolo).observe(canvas.parentElement);

    // Wireframe sphere — the holographic core
    const geo = new THREE.SphereGeometry(1.2, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    holoMesh = new THREE.Mesh(geo, mat);
    holoScene.add(holoMesh);

    // Inner solid sphere — dark core
    const coreGeo = new THREE.SphereGeometry(0.8, 32, 32);
    const coreMat = new THREE.MeshPhongMaterial({
      color: 0x0a0d10,
      emissive: 0x002208,
      specular: 0x00ff66,
      shininess: 80,
      transparent: true,
      opacity: 0.7,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    holoMesh.add(core);
    holoMesh.userData.core = core;

    // Data nodes — small glowing dots on the sphere surface
    holoMesh.userData.nodes = [];
    for (let i = 0; i < 24; i++) {
      const nodeGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0x2cffa0 });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      // Random position on sphere surface
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = 1.3;
      node.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      node.userData.phase = Math.random() * Math.PI * 2;
      holoMesh.add(node);
      holoMesh.userData.nodes.push(node);
    }

    // Orbiting rings
    holoMesh.userData.rings = [];
    for (let i = 0; i < 2; i++) {
      const ringGeo = new THREE.TorusGeometry(1.6 + i * 0.2, 0.008, 6, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 0.3 - i * 0.1,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = i * 0.8;
      ring.rotation.y = i * 0.5;
      holoScene.add(ring);
      holoMesh.userData.rings.push(ring);
    }

    // Lights
    holoScene.add(new THREE.AmbientLight(0x0a1f12, 0.8));
    const light1 = new THREE.PointLight(0x00ff66, 2, 15);
    light1.position.set(3, 2, 4);
    holoScene.add(light1);
    const light2 = new THREE.PointLight(0xffffff, 0.5, 10);
    light2.position.set(0, 0, 5);
    holoScene.add(light2);

    animateHolo();
  }

  function animateHolo() {
    holoT += 0.016;
    if (holoMesh) {
      holoMesh.rotation.y += 0.004;
      holoMesh.rotation.x = Math.sin(holoT * 0.3) * 0.1;

      // Pulse the data nodes
      if (holoMesh.userData.nodes) {
        holoMesh.userData.nodes.forEach(node => {
          const pulse = 0.5 + Math.sin(holoT * 3 + node.userData.phase) * 0.5;
          node.material.opacity = 0.3 + pulse * 0.7;
          node.scale.setScalar(0.8 + pulse * 0.6);
        });
      }

      // Pulse the core
      if (holoMesh.userData.core) {
        const corePulse = 0.6 + Math.sin(holoT * 2) * 0.1;
        holoMesh.userData.core.material.opacity = corePulse;
      }

      // Rotate rings
      if (holoMesh.userData.rings) {
        holoMesh.userData.rings.forEach((ring, i) => {
          ring.rotation.z += 0.003 * (i + 1);
          ring.rotation.x += 0.001 * (i % 2 === 0 ? 1 : -1);
        });
      }
    }
    holoRenderer.render(holoScene, holoCam);
    requestAnimationFrame(animateHolo);
  }

  /* ============================================================
     NEURAL PULSE (10/10 — replaces DNA helix)
     A small canvas showing a pulsing neural network visualization
     ============================================================ */
  function initNeuralPulse() {
    const canvas = document.getElementById('neural-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Create neural nodes
    const nodes = [];
    for (let i = 0; i < 8; i++) {
      nodes.push({
        x: 10 + Math.random() * (w - 20),
        y: 5 + Math.random() * (h - 10),
        r: 1.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Create connections
    const connections = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() > 0.6) {
          connections.push({ from: i, to: j });
        }
      }
    }

    let t = 0;
    function animate() {
      t += 0.03;
      ctx.clearRect(0, 0, w, h);

      // Draw connections
      connections.forEach(c => {
        const n1 = nodes[c.from];
        const n2 = nodes[c.to];
        const pulse = Math.sin(t + c.from * 0.5) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(0, 255, 102, ${0.15 + pulse * 0.25})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(t * 2 + n.phase) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + pulse * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${0.5 + pulse * 0.5})`;
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 4;
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      requestAnimationFrame(animate);
    }
    animate();
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    initWaveform();
    initBot3D();
    initHolo3D();
    initNeuralPulse();
    bindBotChatToggle();
    bindControls();
    bindStatusToggle();
    bindChat();
    tickTopBar();
    tickUptime();
    updateProfile();
    setupAutoplayUnlock();

    // Load the 5 default tracks so the radio has something to play
    // before the user uploads their own. (Also renders the playlist.)
    loadDefaultTracks();

    // intervals for live data
    setInterval(tickTopBar, 1000);
    setInterval(tickUptime, 1000);
    setInterval(tickWaveform, 60);
    setInterval(tickTopStats, 4000);

    // exp trickle while radio plays (every 10s = 50 exp)
    setInterval(() => {
      if (isPlaying) gainExp(50);
    }, 10000);

    // initial groq check (after slight delay)
    setTimeout(checkGroqKey, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================
   VENOM CUSTOM CURSOR (GPU-accelerated, zero lag)
   ============================================================ */
(function initVenomCursor() {
  // Skip on touch devices
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cursor = document.createElement('div');
  cursor.className = 'venom-cursor';
  document.body.appendChild(cursor);

  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;
  let rafId = null;

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!rafId) {
      rafId = requestAnimationFrame(updateCursor);
    }
  });

  // Smooth follow with requestAnimationFrame (GPU-accelerated)
  function updateCursor() {
    // Lerp for smooth trailing effect
    cursorX += (mouseX - cursorX) * 0.2;
    cursorY += (mouseY - cursorY) * 0.2;
    cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;

    if (Math.abs(mouseX - cursorX) > 0.5 || Math.abs(mouseY - cursorY) > 0.5) {
      rafId = requestAnimationFrame(updateCursor);
    } else {
      rafId = null;
    }
  }

  // Hover detection on clickable elements
  const hoverables = 'a, button, input, .panel-x, .ctrl-btn, .upload-btn, .stream-connect-btn, .enter-btn, .st-pill, .pl-track, .bot-view, [role="switch"]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(hoverables)) {
      cursor.classList.add('hovering');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(hoverables)) {
      cursor.classList.remove('hovering');
    }
  });

  // Click animation
  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));

  // Hide when typing in inputs
  document.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('focus', () => cursor.classList.add('typing'));
    el.addEventListener('blur', () => cursor.classList.remove('typing'));
  });

  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
  document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
})();
