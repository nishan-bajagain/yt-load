# Contributing to YT-LOAD

Thank you for your interest in contributing to **YT-LOAD**! We celebrate open source and aim to provide a friendly, beginner-accessible environment for Hacktoberfest and all developer contributions.

---

## 🎯 Ground Rules

1. **Zero Ads, Zero Bloat:** We will never accept PRs introducing affiliate trackers, telemetry SDKs, or sponsored popups.
2. **100% Node.js / TypeScript:** Keep the codebase strictly within the unified TypeScript / Next.js ecosystem.
3. **No System Dependencies:** All FFmpeg capabilities must continue to work seamlessly via `ffmpeg-static` without requiring users to install FFmpeg at the OS level.

---

## 🛠️ Development Setup

```bash
# 1. Fork the repository on GitHub: https://github.com/nishan-bajagain/yt-load
# 2. Clone your fork locally
git clone https://github.com/<your-username>/yt-load.git
cd yt-load

# 3. Add upstream remote
git remote add upstream https://github.com/nishan-bajagain/yt-load.git

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000 in your browser
```

---

## 🚀 Easy First Contribution: Adding a Format Preset

Presets in `src/lib/presets.ts` are declarative. When you add a new entry, the frontend automatically renders the format card, badge, and download handler.

### Step 1: Open `src/lib/presets.ts`

Add your preset to `AUDIO_PRESETS` or `VIDEO_PRESETS`:

```typescript
{
  id: 'wav-lossless',
  name: 'WAV Lossless Audio',
  type: 'audio',
  format: 'wav',
  mimeType: 'audio/wav',
  bitrate: 1411,
  tag: '[ 1411 KBPS WAV ]',
  badge: 'UNCOMPRESSED',
  description: 'Uncompressed PCM waveform audio for digital audio workstations.',
  audioCodec: 'pcm_s16le',
}
```

### Step 2: Test Your Preset

Run `npm run dev`, paste a YouTube URL, and verify the format card appears and initiates download properly.

### Step 3: Submit a Pull Request

Commit your changes with a descriptive message and open a Pull Request!

```bash
git checkout -b feat/add-wav-preset
git add src/lib/presets.ts
git commit -m "feat: add 1411kbps uncompressed WAV audio preset"
git push origin feat/add-wav-preset
```

---

## 🎨 Modifying UI & Theme

The UI uses a **Modern Dark SaaS** aesthetic defined in `src/app/globals.css`:
- Canvas Background: Deep Dark Slate (`#090A0E`)
- Card Surface: Elevated Graphite (`#12141A`)
- Borders: Subtle translucent border (`border-white/10`)
- Accent Highlight: Electric Amber / Gold (`#FBBF24` / `#F59E0B`)
- Clean, accessible components with live progress indicators, interactive FAQ accordion, and Bitcoin donation modal.

---

## 🧪 Testing and Verification

Before submitting your PR, ensure the build passes cleanly:

```bash
npm run build
```
