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
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/yt-load.git
cd yt-load

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
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

The UI uses a **Hacktoberfest Neo-Brutalist** aesthetic defined in `src/app/globals.css`:
- Canvas: `#233531`
- Surface: `#2E433E`
- Borders: `#4A635D` (sharp, 1px solid, 2px-4px border radius)
- Coral Accent: `#F27D72`
- Amber Highlight: `#F5B041`
- Shadows: Hard offset `shadow-[3px_3px_0px_#1A2624]` (no blurred glassmorphism)

---

## 🧪 Testing and Verification

Before submitting your PR, ensure the build passes cleanly:

```bash
npm run build
```
