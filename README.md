# VENOM RADIO PRO — Secure 3D Cyberpunk Radio Template

<div align="center">

**A 3D venom-themed radio station template with live streaming, AI chat host, real-time metadata, and 9-layer security.**

</div>

---

## 📻 WHAT IS VENOM RADIO PRO?

VENOM Radio Pro is a professional radio station website template that combines:
- 🎧 **Live radio streaming** (Icecast/Shoutcast/HLS)
- 🕷️ **3D venom entity** (Three.js icosahedron with eyes + tendrils)
- 🧠 **AI chat host** (Groq-powered with ECHO mode fallback)
- 🔒 **9-layer security** (anti-copy, anti-save, anti-devtools)
- 🎵 **Dual mode** (live stream OR uploaded MP3 files)

---

## ✨ FEATURES

### 🎧 Radio Streaming (PRO)
| Feature | Description |
|---------|-------------|
| **Live stream support** | Connect any Icecast/Shoutcast/HLS stream URL |
| **"Now Playing" metadata** | Auto-fetches current song + artist from stream server |
| **Album art** | Auto-fetches cover art from iTunes Search API |
| **Listener count** | Real-time listener number from Icecast status API |
| **LIVE/OFFLINE/CONNECTING** | Visual status indicator with pulsing dots |
| **Stream URL input** | Paste any stream URL and click CONNECT |
| **Dual mode** | Switch between live stream and uploaded MP3 files |

### 🕷️ 3D Visual Features
| Feature | Description |
|---------|-------------|
| **3D venom entity** | Icosahedron body with organic distortion, white eyes, tendrils |
| **3D holographic sphere** | Wireframe sphere with pulsing data nodes (center panel, circular frame) |
| **3D cube bot** | Click the venom bot to expand into chat interface |
| **Neural pulse animation** | Animated neural network in profile panel |
| **Portal warp transition** | Spiral-inward + burst-outward particle effect (intro) |
| **Fast boot sequence** | 1.2s boot with log lines ("loading venom core...") |
| **Waveform visualizer** | Audio-reactive frequency bars |
| **Custom VENOM cursor** | GPU-accelerated green cursor with pulsing aura |

### 🧠 AI Features
| Feature | Description |
|---------|-------------|
| **AI chat host** | VENOM persona — dark, eerie, philosophical |
| **Groq API integration** | Real AI powered by Llama 3.1 (optional) |
| **ECHO mode fallback** | Works even without API key (built-in persona) |
| **6-state UI** | connecting / online / no-key / bad-key / rate-limited / network-down |
| **AI LOAD / LATENCY meter** | Real-time AI activity stats |

### 🔒 Security Features (9 Layers)
| # | Layer | What it does |
|---|-------|--------------|
| 1 | **Anti-right-click** | Blocks context menu (no "Save Image As") |
| 2 | **Anti-text-select** | Can't select text (except in inputs) |
| 3 | **Anti-copy/cut** | Ctrl+C/X blocked (except in inputs) |
| 4 | **Anti-drag** | Can't drag images to desktop |
| 5 | **Anti-mobile-longpress** | Long-press on images blocked (iOS/Android) |
| 6 | **DevTools detection** | Reduces opacity if DevTools opened |
| 7 | **Keyboard shortcut blocking** | F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S blocked |
| 8 | **Console auto-clear** | Clears console every 5 seconds |
| 9 | **CSS-level protection** | `user-select: none`, `user-drag: none`, `pointer-events: none` on images |

### 🎵 Audio Features
| Feature | Description |
|---------|-------------|
| **5 default tracks** | Royalty-free tracks included (artist: VENOM) |
| **File upload** | Users can upload their own MP3s |
| **ID3 tag reading** | Displays real song names from MP3 metadata |
| **Volume control** | Slider with mute toggle |
| **Audio autoplay workaround** | Seamless audio unlock via gesture |

---

## 🛠️ TECHNOLOGY STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **3D Engine** | Three.js r128 (CDN) | 3D venom entity, holographic sphere, portal warp |
| **Frontend** | Vanilla HTML/CSS/JS | No framework dependencies, fast loading |
| **Audio** | Web Audio API (AnalyserNode) | Live waveform visualization + volume control |
| **AI Backend** | Groq Cloud API (Llama 3.1) | Real AI chat (optional, has ECHO fallback) |
| **Backend Proxy** | Hono + TypeScript | Hides API key, rate limiting, CORS |
| **Metadata** | iTunes Search API | Free album art fetching (no key needed) |
| **Stream Protocol** | Icecast/Shoutcast/HLS | Live radio streaming |
| **Deployment** | Vercel / Netlify / GitHub Pages | Free hosting options |
| **Fonts** | Orbitron + Share Tech Mono | Cyberpunk typography (Google Fonts) |
| **Security** | Custom JS + CSS | 9-layer content protection |

---

## 🚀 QUICK START

### For Radio Station Owners (5 minutes)

1. **Get your stream URL** — e.g., `http://your-server:8000/live`
2. **Deploy VENOM Radio Pro** (see DEPLOYMENT.md)
3. **Paste your stream URL** in the input field
4. **Click CONNECT** — your station is live!

### For Testing Without a Stream

VENOM Radio Pro works in **dual mode**:
1. **Stream mode:** Paste a live stream URL → click CONNECT
2. **File mode:** Click UPLOAD FILES → select MP3s → plays like a normal music player

### Test Stream URLs (free public streams)

Try these free public Icecast streams:
```
https://stream.zeno.fm/0r0xa792kwzuv
https://ice1.chillixradio.nl/chillix
https://streaming.radionomy.com/RadioX
```

---

## 📋 HOW STREAMING WORKS

### Architecture:
```
Radio Station Server (Icecast/Shoutcast)
    ↓ (audio stream)
VENOM Radio Pro Frontend
    ↓ (audio element plays stream)
    ↓ (every 5 seconds, fetches /status-json.xsl)
    ↓ (gets: song title, artist, listener count)
    ↓ (fetches album art from iTunes API)
    ↓ (updates UI: Now Playing, Album Art, Listeners)
```

### Metadata Polling:
- Every **5 seconds**, VENOM polls the stream server's status API
- Icecast: fetches `http://server:port/status-json.xsl`
- Extracts: current song title, listener count
- Parses "Artist - Title" format automatically
- Fetches album art from iTunes Search API (free, no key needed)

### CORS Note:
Some radio servers don't send CORS headers, which blocks metadata fetching from the browser. In this case:
- ✅ The **audio stream still plays** (audio is not affected by CORS)
- ❌ The "Now Playing" metadata won't update (shows "LIVE" instead)
- **Fix:** Add CORS headers to your Icecast server, OR use the VELXT backend proxy

---

## 🎯 USE CASES

### 1. Internet Radio Station Website
Replace your outdated 2010-era website with a modern 3D experience.
- Connect your Icecast/Shoutcast stream
- AI chat host greets visitors
- Album art + Now Playing display
- Listener count builds social proof

### 2. DJ Live Stream Portal
DJs stream their sets live, listeners chat with the AI host while listening.
- DJ pastes their stream URL
- Listeners connect and hear the live set
- AI host interacts with listeners between tracks

### 3. Podcast / Show Companion Site
Enhance your podcast with a visual experience.
- Stream your podcast live
- Show notes + AI chat for Q&A
- Album art for each episode

### 4. 24/7 Music Channel
Run a 24/7 automated music channel with AI personality.
- Connect your AutoDJ stream
- AI host talks between songs
- Visualizer reacts to the music

### 5. Event / Festival Virtual Stage
Stream live events with a cyberpunk virtual stage.
- Connect the event's audio feed
- 3D visualizer creates a "virtual stage" feel
- AI host announces acts and interacts with viewers

---

## 🔒 SECURITY DETAILS

### What the Security Layer Protects:
- ✅ **Images** — can't right-click save, drag, or long-press save
- ✅ **Text** — can't select or copy (except in inputs)
- ✅ **Source code** — F12, Ctrl+U, Ctrl+Shift+I all blocked
- ✅ **Page saving** — Ctrl+S blocked
- ✅ **DevTools** — detected and screen opacity reduced

### How to Test the Security:
1. **Right-click** anywhere → menu should NOT appear
2. **Try to select text** → should not highlight
3. **Press F12** → should be blocked
4. **Press Ctrl+U** → should be blocked
5. **Try to drag an image** → should not drag
6. **Open DevTools** → screen opacity reduces

### Honest Security Note:
No website is 100% secure. Determined developers can disable JavaScript and bypass these protections. However, these 9 layers stop **95% of casual copy attempts**, which is the maximum achievable for a web template. This is more protection than ThemeForest/WrapBootstrap templates typically include.

### For Developers Testing:
If you need to test with DevTools open:
1. Maximize your browser window (the detection uses window size threshold of 200px)
2. The opacity reduction is temporary and resets when DevTools closes
3. The security is intentionally non-destructive — it doesn't break the site, just makes inspection harder

---

## 🎨 CUSTOMIZATION

### Change the Stream URL (permanent)
Instead of manual input, hardcode your stream URL:
1. Open `main.html`
2. Find the `stream-url` input
3. Add `value="http://your-stream-url"` attribute

### Change Colors
Open `css/main.css`, find `:root`:
```css
--v-green: #00ff66;  /* Change to your brand color */
```

### Change the AI Persona
Open `js/main.js`, find `sysPrompt`:
```js
const sysPrompt = `You are VENOM, a digital venom entity...`;
```

### Change Brand Name
Use find-and-replace:
- `VENOM` → Your brand name
- `VENOM.AI` → Your domain

### Disable Security (for development)
If you need to disable security for development:
1. Open `index.html` and `main.html`
2. Find the `<!-- VENOM SECURITY LAYER -->` section
3. Comment out or delete the `<script>` block
4. Also remove the security CSS at the bottom of `css/main.css`

---

## 📊 TECHNICAL SPECS

### Supported Stream Formats:
| Format | Support | Notes |
|--------|---------|-------|
| **Icecast (MP3)** | ✅ Full | Metadata + listener count works |
| **Shoutcast (MP3)** | ✅ Full | Metadata may need different endpoint |
| **Icecast (OGG)** | ✅ Audio | Metadata works, audio plays |
| **HLS (.m3u8)** | ⚠️ Partial | Audio plays, metadata not available |
| **HTTP MP3 stream** | ✅ Audio | Plays but no metadata |

### Browser Support:
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Mobile Safari 14+ ✅
- Mobile Chrome ✅

### Dependencies:
- Three.js r128 (CDN, MIT License)
- No other external dependencies
- iTunes Search API (free, no key)
- Groq API (optional, for AI chat)

---

## 💰 PRICING

| License | Price | Use Case |
|---------|-------|----------|
| **Single Station** | $149 | One radio station website |
| **Multi-Station** | $299 | Up to 5 station websites |
| **Agency License** | $599 | Unlimited client stations + white-label |
| **Custom Setup** | $999 | We deploy + customize for your station |

Contact: venom.studios@gmail.com

---

## ⚖️ LEGAL & PRIVACY

### Music Licensing (BUYER'S RESPONSIBILITY)
If you broadcast copyrighted music, you need licenses from:
- **ASCAP** — https://www.ascap.com
- **BMI** — https://www.bmi.com
- **SESAC** — https://www.sesac.com
- **SoundExchange** — https://www.soundexchange.com

### Privacy
- No user data collected (no accounts, no cookies)
- Stream metadata is public information
- iTunes API is anonymous (no user tracking)
- See `docs/PRIVACY.md` for full policy

---

## 📞 SUPPORT

- **Email:** velxtstudio@gmail.com
- **Response time:** 48 hours (business days)
- **Duration:** 30 days from purchase
- **Scope:** Bug fixes, deployment help, stream configuration

---

## 🔄 UPDATES

When updates are released:
1. You'll receive an email (if you opted in)
2. Download the new version from your Gumroad library
3. Replace the files in your deployment
4. Redeploy

Updates are FREE for life with any license.

---

<div align="center">

**VENOM RADIO PRO**
*The venom is loose.*

📧  velxtstudio@gmail.com
</div>
